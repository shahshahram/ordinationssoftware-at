// Cash Register Model für RKSVO
// Verwaltet Registrierkassen-Konfiguration und Signature-Counter

const mongoose = require('mongoose');

const CashRegisterSchema = new mongoose.Schema({
  // Kassennummer (CashBoxId)
  cashBoxId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // TSE-Konfiguration
  tse: {
    provider: {
      type: String,
      enum: ['fiskaly', 'fiskaltrust', 'a-trust', 'hardware', 'software'],
      default: 'software'
    },
    serialNumber: { type: String, trim: true },
    publicKey: { type: String },
    secret: { type: String }, // Verschlüsselt gespeichert
    apiKey: { type: String }, // Für Cloud-Provider
    apiSecret: { type: String }, // Verschlüsselt gespeichert
    endpoint: { type: String }, // API-Endpoint für Cloud-Provider
    initialized: { type: Boolean, default: false },
    initializedAt: { type: Date },
    // Test-/Sandbox-Modus
    testMode: { type: Boolean, default: false }, // Aktiviert Test-Modus für Sandbox
    sandboxEndpoint: { type: String }, // Optional: separater Sandbox-Endpoint
    testCredentials: { // Test-Credentials (separat von Production)
      apiKey: { type: String },
      apiSecret: { type: String }
    }
  },
  
  // Signature-Counter (inkrementell, unveränderbar)
  signatureCounter: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // TSE-Ausfall-Status
  tseFailure: {
    isFailed: { type: Boolean, default: false },
    failureStartTime: { type: Date },
    failureReason: { type: String },
    pendingResignatures: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ReceiptChain' }] // Belege die nachsigniert werden müssen
  },
  
  // Letzter Beleg-Hash (für Belegverkettung)
  lastReceiptHash: {
    type: String,
    trim: true
  },
  
  // FinanzOnline-Registrierung
  finanzOnline: {
    registered: { type: Boolean, default: false },
    registrationDate: { type: Date },
    cashRegisterId: { type: String }, // FinanzOnline-Kassennummer
    tseId: { type: String }, // FinanzOnline-TSE-ID
    webserviceUser: { type: String },
    webservicePassword: { type: String } // Verschlüsselt
  },
  
  // Standort/Ordination
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    index: true
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
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

// cashBoxId hat bereits unique: true, daher kein zusätzlicher Index nötig
// locationId hat bereits index: true, daher kein zusätzlicher Index nötig
CashRegisterSchema.index({ 'tse.initialized': 1 });

module.exports = mongoose.model('CashRegister', CashRegisterSchema);

