const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  // Grunddaten
  invoiceNumber: { type: String, required: true, unique: true },
  invoiceDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  
  // Arzt/Ordination
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
  
  // Patient
  patient: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    name: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: 'Österreich' }
    },
    insuranceNumber: { type: String },
      insuranceProvider: { 
        type: String, 
        enum: [
          'ÖGK (Österreichische Gesundheitskasse)',
          'BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)',
          'SVS (Sozialversicherung der Selbständigen)',
          'KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)',
          'PVA (Pensionsversicherungsanstalt)',
          'Privatversicherung',
          'Selbstzahler'
        ]
      }
  },
  
  // Abrechnungstyp
  billingType: { 
    type: String, 
    enum: ['kassenarzt', 'wahlarzt', 'privat'], 
    required: true 
  },
  
  // Diagnosen (für Abrechnungen)
  diagnoses: [{
    diagnosisId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientDiagnosis' },
    code: { type: String, required: true },
    display: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
    date: { type: Date, required: true }
  }],
  
  // Leistungen
  services: [{
    date: { type: Date, required: true },
    serviceCode: { type: String, required: true },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    category: { type: String } // Erlaubt alle Kategorien aus ServiceCatalog
  }],
  
  // Beträge
  subtotal: { type: Number, required: true },
  taxRate: { type: Number, default: 0 }, // 0% für medizinische Leistungen in Österreich
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  
  // Zahlungsstatus
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], 
    default: 'draft' 
  },
  paymentDate: { type: Date },
  paymentMethod: { type: String, enum: ['cash', 'transfer', 'card', 'insurance'] },
  
  // Kassenabrechnung (für Kassenärzte)
  insuranceBilling: {
    insuranceCompany: { type: String },
    billingPeriod: { type: String },
    submissionDate: { type: Date },
    status: { type: String, enum: ['pending', 'submitted', 'approved', 'rejected'] },
    referenceNumber: { type: String }
  },
  
  // Wahlarzt-Abrechnung
  privateBilling: {
    honorNote: { type: Boolean, default: false },
    wahlarztCode: { type: String },
    reimbursementAmount: { type: Number, default: 0 },
    patientAmount: { type: Number, default: 0 }
  },
  
  // Notizen
  notes: { type: String },
  
  // RKSVO-Daten (Registerkasse)
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
  
  // E-Mail-Versand
  emailSent: { type: Boolean, default: false },
  emailSentAt: { type: Date },
  emailMessageId: { type: String },
  
  // Metadaten
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual für Rechnungsnummer generieren
InvoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    this.invoiceNumber = `R-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Virtual für Gesamtbetrag berechnen
InvoiceSchema.pre('save', function(next) {
  this.subtotal = this.services.reduce((sum, service) => sum + service.totalPrice, 0);
  this.taxAmount = this.subtotal * (this.taxRate / 100);
  this.totalAmount = this.subtotal + this.taxAmount;
  next();
});

// Indexes are defined in the schema above with index: true

module.exports = mongoose.model('Invoice', InvoiceSchema);
