// Invoice Journal Model für unveränderbare Rechnungs-Protokollierung
// Speichert alle Rechnungen chronologisch für interne Überprüfung und Compliance

const mongoose = require('mongoose');
const crypto = require('crypto');

const InvoiceJournalSchema = new mongoose.Schema({
  // Referenz zur Original-Rechnung
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
    index: true
  },
  
  // Rechnungsnummer (Snapshot zum Zeitpunkt der Erstellung)
  invoiceNumber: {
    type: String,
    required: true,
    index: true
  },
  
  // Rechnungsdatum
  invoiceDate: {
    type: Date,
    required: true,
    index: true
  },
  
  // Fälligkeitsdatum
  dueDate: {
    type: Date,
    required: false // Optional, da nicht alle Rechnungen ein Fälligkeitsdatum haben müssen
  },
  
  // Arzt/Ordination (Snapshot)
  doctor: {
    name: { type: String, required: true },
    title: { type: String },
    specialization: { type: String },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: 'Österreich' }
    },
    taxNumber: { type: String },
    chamberNumber: { type: String }
  },
  
  // Patient (Snapshot)
  patient: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientExtended' },
    name: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: 'Österreich' }
    },
    insuranceNumber: { type: String },
    insuranceProvider: { type: String }
  },
  
  // Abrechnungstyp
  billingType: {
    type: String,
    enum: ['kassenarzt', 'wahlarzt', 'privat'],
    required: true
  },
  
  // Leistungen (Snapshot)
  services: [{
    date: { type: Date, required: true },
    serviceCode: { type: String, required: true },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    category: { type: String }
  }],
  
  // Beträge (Snapshot)
  subtotal: { type: Number, required: true },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  
  // Zahlungsstatus (Snapshot)
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    required: true
  },
  
  // Zahlungsinformationen (Snapshot)
  paymentDate: { type: Date },
  paymentMethod: {
    type: String,
    enum: ['cash', 'transfer', 'card', 'bankomat', 'creditcard', 'mobile', 'insurance'],
    default: null
  },
  
  // RKSVO-Daten (wenn vorhanden)
  rksvoData: {
    tseSignature: {
      tseSerial: { type: String },
      signatureCounter: { type: Number },
      signature: { type: String },
      timestamp: { type: Date },
      signatureAlgorithm: { type: String }
    },
    qrCode: { type: String },
    generatedAt: { type: Date }
  },
  
  // Referenz zu ReceiptChain (wenn vorhanden)
  receiptChainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReceiptChain',
    index: true
  },
  
  // Hash für Integritätsprüfung
  journalHash: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Standort (für Filterung)
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    index: true
  },
  
  // Erstellt von
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Unveränderbar-Flag
  immutable: {
    type: Boolean,
    default: true
  },
  
  // Journal-Eintrag-Typ (für verschiedene Ereignisse)
  journalType: {
    type: String,
    enum: ['created', 'updated', 'paid', 'cancelled', 'exported'],
    default: 'created'
  },
  
  // Zusätzliche Metadaten
  metadata: {
    originalStatus: { type: String }, // Status vor Änderung (bei Updates)
    changeReason: { type: String }, // Grund für Änderung
    exportedAt: { type: Date }, // Wann wurde exportiert
    exportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }
}, {
  timestamps: true,
  // Compound Index für Datumsabfragen
  indexes: [
    { invoiceDate: 1, locationId: 1 },
    { 'timestamps.createdAt': 1 },
    { billingType: 1, invoiceDate: 1 },
    { status: 1, invoiceDate: 1 }
  ]
});

// Pre-save Hook: Berechne Hash vor dem Speichern
InvoiceJournalSchema.pre('save', function(next) {
  if (!this.journalHash || this.isNew || this.isModified('invoiceNumber') || 
      this.isModified('totalAmount') || this.isModified('services') || 
      this.isModified('invoiceDate')) {
    const dataToHash = JSON.stringify({
      invoiceNumber: this.invoiceNumber,
      invoiceDate: this.invoiceDate,
      totalAmount: this.totalAmount,
      patient: this.patient.name,
      services: this.services,
      status: this.status,
      timestamp: this.createdAt || new Date()
    });
    this.journalHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
  }
  next();
});

// Verhindere Änderungen nach dem ersten Speichern
InvoiceJournalSchema.pre('save', function(next) {
  if (!this.isNew && this.immutable) {
    const error = new Error('Journal-Eintrag ist unveränderbar');
    return next(error);
  }
  next();
});

// Statische Methode: Erstelle Journal-Eintrag aus Invoice
InvoiceJournalSchema.statics.createFromInvoice = async function(invoice, journalType = 'created', userId, metadata = {}) {
  console.log(`[InvoiceJournal] createFromInvoice aufgerufen für Rechnung: ${invoice.invoiceNumber || invoice._id}`);
  
  // Validiere, dass alle erforderlichen Felder vorhanden sind
  if (!invoice.invoiceNumber) {
    console.error('[InvoiceJournal] Validierungsfehler: Rechnungsnummer fehlt');
    throw new Error('Rechnungsnummer fehlt');
  }
  if (!invoice.invoiceDate) {
    console.error('[InvoiceJournal] Validierungsfehler: Rechnungsdatum fehlt');
    throw new Error('Rechnungsdatum fehlt');
  }
  if (invoice.totalAmount === undefined && invoice.totalAmount !== 0) {
    console.error('[InvoiceJournal] Validierungsfehler: Gesamtbetrag fehlt');
    throw new Error('Gesamtbetrag fehlt');
  }
  if (!invoice.patient || !invoice.patient.name) {
    console.error('[InvoiceJournal] Validierungsfehler: Patienteninformationen fehlen', { patient: invoice.patient });
    throw new Error('Patienteninformationen fehlen');
  }
  if (!invoice.billingType) {
    console.error('[InvoiceJournal] Validierungsfehler: Abrechnungstyp fehlt');
    throw new Error('Abrechnungstyp fehlt');
  }
  if (!invoice.status) {
    console.error('[InvoiceJournal] Validierungsfehler: Status fehlt');
    throw new Error('Status fehlt');
  }

  const journalData = {
    invoiceId: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate || null, // Optional
    doctor: invoice.doctor || {},
    patient: invoice.patient || {},
    billingType: invoice.billingType,
    services: invoice.services || [],
    subtotal: invoice.subtotal || invoice.totalAmount || 0,
    taxRate: invoice.taxRate || 0,
    taxAmount: invoice.taxAmount || 0,
    totalAmount: invoice.totalAmount,
    status: invoice.status,
    paymentDate: invoice.paymentDate || null,
    paymentMethod: invoice.paymentMethod || null,
    rksvoData: invoice.rksvoData || {},
    locationId: invoice.locationId || null,
    createdBy: userId || invoice.createdBy,
    journalType,
    metadata: {
      ...metadata,
      originalStatus: invoice.status
    }
  };
  
  // Finde ReceiptChain-Eintrag falls vorhanden
  if (invoice.rksvoData && invoice.rksvoData.tseSignature) {
    try {
      // Prüfe ob ReceiptChain-Modell existiert
      if (mongoose.models.ReceiptChain) {
        const ReceiptChain = mongoose.model('ReceiptChain');
        const receiptChain = await ReceiptChain.findOne({ invoiceId: invoice._id });
        if (receiptChain) {
          journalData.receiptChainId = receiptChain._id;
        }
      }
    } catch (receiptChainError) {
      // Ignoriere Fehler wenn ReceiptChain-Modell nicht existiert
      console.log(`[InvoiceJournal] ReceiptChain-Modell nicht verfügbar, überspringe ReceiptChain-Referenz`);
    }
  }
  
  // Berechne journalHash vor dem Speichern
  // Verwende bereits importiertes crypto-Modul (oben im File)
  const dataToHash = JSON.stringify({
    invoiceNumber: journalData.invoiceNumber,
    invoiceDate: journalData.invoiceDate,
    totalAmount: journalData.totalAmount,
    patient: journalData.patient.name,
    services: journalData.services,
    status: journalData.status,
    timestamp: new Date().toISOString(),
    userId: userId ? userId.toString() : 'unknown'
  });
  
  // Erstelle eindeutigen Hash (inkl. Timestamp für Eindeutigkeit)
  let hashAttempt = 0;
  let journalHash;
  let journalEntry;
  
  do {
    const hashData = hashAttempt > 0 
      ? `${dataToHash}_${hashAttempt}_${Date.now()}`
      : dataToHash;
    journalHash = crypto.createHash('sha256').update(hashData).digest('hex');
    
    // Prüfe, ob Hash bereits existiert (unique constraint)
    const existing = await this.findOne({ journalHash });
    if (!existing) {
      journalData.journalHash = journalHash;
      try {
        journalEntry = await this.create(journalData);
        break;
      } catch (createError) {
        // Wenn unique constraint verletzt, versuche mit neuem Hash
        if (createError.code === 11000 && createError.keyPattern?.journalHash) {
          hashAttempt++;
          if (hashAttempt > 10) {
            throw new Error('Konnte keinen eindeutigen journalHash erstellen nach 10 Versuchen');
          }
          continue;
        }
        throw createError;
      }
    } else {
      hashAttempt++;
      if (hashAttempt > 10) {
        throw new Error('Konnte keinen eindeutigen journalHash erstellen nach 10 Versuchen');
      }
    }
    } while (hashAttempt <= 10);
  
  console.log(`[InvoiceJournal] ✅ Journal-Eintrag erfolgreich erstellt für Rechnung: ${journalData.invoiceNumber}`);
  return journalEntry;
};

module.exports = mongoose.model('InvoiceJournal', InvoiceJournalSchema);

