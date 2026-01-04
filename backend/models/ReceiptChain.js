// Receipt Chain Model für Belegverkettung (DEP - Datenerfassungsprotokoll)
// Speichert alle Belege chronologisch und unveränderbar

const mongoose = require('mongoose');
const crypto = require('crypto');

const ReceiptChainSchema = new mongoose.Schema({
  // Beleg-Typ
  receiptType: {
    type: String,
    enum: ['start', 'normal', 'monthly', 'yearly', 'storno', 'hausbesuch'],
    required: true
  },
  
  // Referenz zur Rechnung (bei normalen Belegen)
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    index: true
  },
  
  // Kassennummer
  cashBoxId: {
    type: String,
    required: true,
    index: true
  },
  
  // Belegnummer (fortlaufend)
  receiptNumber: {
    type: Number,
    required: true,
    unique: true
  },
  
  // TSE-Signatur
  tseSignature: {
    tseSerial: { type: String, required: true },
    signatureCounter: { type: Number, required: true },
    signature: { type: String, required: true },
    timestamp: { type: Date, required: true },
    signatureAlgorithm: { type: String, default: 'SHA256' },
    publicKey: { type: String }
  },
  
  // Belegdaten (für Hash-Berechnung)
  receiptData: {
    amount: { type: Number, default: 0 }, // 0 für Nullbelege
    timestamp: { type: Date, required: true },
    receiptType: { type: String, required: true }
  },
  
  // Belegverkettung
  previousReceiptHash: {
    type: String,
    trim: true
  },
  receiptHash: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // QR-Code-Daten
  qrCodeData: {
    type: String,
    required: true
  },
  
  // Zahlungsart (nur bei normalen Belegen)
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bankomat', 'creditcard', 'mobile', 'transfer'],
    default: null
  },
  
  // Barumsatz-Flag (für RKSVO-Prüfung)
  isCashTransaction: {
    type: Boolean,
    default: false
  },
  
  // Monat/Jahr (für Monats-/Jahresbelege)
  period: {
    month: { type: Number, min: 1, max: 12 },
    year: { type: Number }
  },
  
  // Hausbesuch-Daten (bei hausbesuch-Beleg)
  houseCall: {
    isHouseCall: { type: Boolean, default: false },
    manualReceiptNumber: { type: String }, // Paragon-Nummer
    enteredAt: { type: Date } // Nacherfassungs-Zeitpunkt
  },
  
  // Unveränderbar-Flag (DEP-Anforderung)
  immutable: {
    type: Boolean,
    default: true
  },
  
  // Ausfallmodus (Sicherheitseinrichtung ausgefallen)
  tseFailure: {
    isFailed: { type: Boolean, default: false },
    failureReason: { type: String }, // z.B. 'timeout', 'offline', 'api_error'
    failureTimestamp: { type: Date },
    resignedAt: { type: Date }, // Nachsigniert am
    resignedSignature: { type: String } // Nachsignatur
  },
  
  // Metadaten
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
ReceiptChainSchema.index({ cashBoxId: 1, receiptNumber: 1 });
ReceiptChainSchema.index({ receiptHash: 1 });
ReceiptChainSchema.index({ receiptType: 1 });
ReceiptChainSchema.index({ 'period.year': 1, 'period.month': 1 });
ReceiptChainSchema.index({ isCashTransaction: 1, receiptData: { timestamp: 1 } });

// Pre-save Hook: Berechne Hash vor dem Speichern
ReceiptChainSchema.pre('save', function(next) {
  // Berechne Hash immer, wenn er nicht bereits gesetzt ist oder wenn sich relevante Daten geändert haben
  if (!this.receiptHash || this.isNew || this.isModified('receiptData') || this.isModified('previousReceiptHash') || this.isModified('tseSignature')) {
    const dataToHash = JSON.stringify({
      receiptNumber: this.receiptNumber,
      receiptType: this.receiptType,
      amount: this.receiptData?.amount || 0,
      timestamp: this.receiptData?.timestamp || new Date(),
      previousHash: this.previousReceiptHash || null,
      tseSignature: this.tseSignature?.signature || ''
    });
    this.receiptHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
  }
  next();
});

// Verhindere Änderungen nach dem ersten Speichern (DEP-Anforderung)
ReceiptChainSchema.pre('save', function(next) {
  if (!this.isNew && this.immutable) {
    const error = new Error('Beleg ist unveränderbar (DEP-Anforderung)');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('ReceiptChain', ReceiptChainSchema);

