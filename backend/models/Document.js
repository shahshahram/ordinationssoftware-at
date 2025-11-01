const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  // Grunddaten
  title: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    enum: ['rezept', 'ueberweisung', 'arztbrief', 'befund', 'formular', 'rechnung', 'sonstiges', 'attest', 'konsiliarbericht', 'zuweisung', 'rueckueberweisung', 'operationsbericht', 'heilmittelverordnung', 'krankenstandsbestaetigung', 'bildgebende_zuweisung', 'impfbestaetigung', 'patientenaufklaerung', 'therapieplan', 'verlaufsdokumentation', 'pflegebrief', 'kostenuebernahmeantrag', 'gutachten'],
    required: true 
  },
  category: { type: String, trim: true },
  
  // Patient
  patient: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    dateOfBirth: { type: String, required: true },
    insuranceNumber: { type: String }
  },
  
  // Arzt/Ordination
  doctor: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    title: { type: String },
    specialization: { type: String }
  },
  
  // Dokumentinhalt
  content: {
    text: { type: String },
    html: { type: String },
    template: { type: String },
    variables: { type: Object }
  },
  
  // Medizinische Daten (für Rezepte)
  medicalData: {
    medications: [{
      name: { type: String, required: true },
      dosage: { type: String },
      frequency: { type: String },
      duration: { type: String },
      instructions: { type: String }
    }],
    diagnosis: { type: String },
    icd10Code: { type: String },
    notes: { type: String }
  },
  
  // Überweisungsdaten
  referralData: {
    specialist: { type: String },
    specialization: { type: String },
    reason: { type: String },
    urgency: { type: String, enum: ['normal', 'dringend', 'notfall'] },
    appointment: { type: Date }
  },
  
  // Befunddaten
  findingData: {
    examinationType: { type: String },
    results: { type: String },
    interpretation: { type: String },
    recommendations: { type: String },
    images: [{ type: String }] // URLs zu Bildern
  },
  
  // Status und Workflow
  status: { 
    type: String, 
    enum: ['draft', 'ready', 'sent', 'received', 'archived'],
    default: 'draft' 
  },
  priority: { 
    type: String, 
    enum: ['niedrig', 'normal', 'hoch', 'dringend'],
    default: 'normal' 
  },
  
  // ELGA-Integration
  elgaData: {
    isElgaCompatible: { type: Boolean, default: false },
    elgaId: { type: String },
    submissionDate: { type: Date },
    status: { type: String, enum: ['pending', 'submitted', 'approved', 'rejected'] }
  },
  
  // Dateien und Anhänge
  attachments: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Metadaten
  documentNumber: { type: String, unique: true },
  version: { type: Number, default: 1 },
  isTemplate: { type: Boolean, default: false },
  templateCategory: { type: String },
  
  // Datenschutz
  isConfidential: { type: Boolean, default: false },
  retentionPeriod: { type: Number, default: 30 }, // Jahre
  anonymizationDate: { type: Date },
  
  // Audit Trail
  auditTrail: [{
    action: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    changes: { type: Object },
    reason: { type: String }
  }],
  
  // Metadaten
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate: { type: Date },
  completedDate: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual für Dokumentnummer generieren
DocumentSchema.pre('save', async function(next) {
  if (this.isNew && !this.documentNumber) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    const typePrefix = this.type.toUpperCase().substring(0, 3);
    this.documentNumber = `${typePrefix}-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Virtual für vollständigen Dateinamen
DocumentSchema.virtual('fullTitle').get(function() {
  return `${this.documentNumber} - ${this.title}`;
});

// Indexes are defined in the schema above with index: true

// Methoden
DocumentSchema.methods.addAuditEntry = function(action, user, changes, reason) {
  this.auditTrail.push({
    action,
    user,
    changes,
    reason,
    timestamp: new Date()
  });
};

DocumentSchema.methods.getFileSize = function() {
  return this.attachments.reduce((total, file) => total + file.size, 0);
};

module.exports = mongoose.model('Document', DocumentSchema);
