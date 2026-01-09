const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * DocumentVersion Schema - Immutable Versionen von Dokumenten
 * 
 * Jede Version ist ein vollständiger Snapshot des Dokuments zu einem bestimmten Zeitpunkt.
 * Versionen sind IMMUTABLE (unveränderlich) nach Erstellung.
 */
const DocumentVersionSchema = new mongoose.Schema({
  // Referenz zum Hauptdokument
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  
  // Versions-Information
  versionNumber: {
    type: String,
    required: true,
    trim: true
  },
  majorVersion: {
    type: Number,
    required: true
  },
  minorVersion: {
    type: Number,
    required: true
  },
  patchVersion: {
    type: Number,
    required: true
  },
  
  // Vollständiger Dokument-Snapshot (IMMUTABLE)
  documentSnapshot: {
    // Alle Felder des Dokumentes zu diesem Zeitpunkt
    title: { type: String },
    type: { type: String },
    category: { type: String },
    content: { type: mongoose.Schema.Types.Mixed },
    medicalData: { type: mongoose.Schema.Types.Mixed },
    referralData: { type: mongoose.Schema.Types.Mixed },
    findingData: { type: mongoose.Schema.Types.Mixed },
    patient: { type: mongoose.Schema.Types.Mixed },
    doctor: { type: mongoose.Schema.Types.Mixed },
    status: { type: String },
    priority: { type: String },
    elgaData: { type: mongoose.Schema.Types.Mixed },
    attachments: [{ type: mongoose.Schema.Types.Mixed }],
    documentNumber: { type: String },
    isConfidential: { type: Boolean },
    retentionPeriod: { type: Number },
    // ... alle anderen relevanten Felder
  },
  
  // Status dieser Version
  versionStatus: {
    type: String,
    enum: ['draft', 'under_review', 'released', 'withdrawn'],
    required: true,
    default: 'draft'
  },
  
  // Freigabe-Information
  releasedAt: {
    type: Date
  },
  releasedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  releaseComment: {
    type: String
  },
  
  // Rückzug-Information
  withdrawnAt: {
    type: Date
  },
  withdrawnBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  withdrawalReason: {
    type: String
  },
  
  // Änderungs-Information
  changeReason: {
    type: String
  },
  changesFromPreviousVersion: {
    summary: { type: String },
    fieldsChanged: [{ type: String }],
    diffData: { type: mongoose.Schema.Types.Mixed }
  },
  
  // Audit Trail (IMMUTABLE)
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    immutable: true
  },
  
  // Technische Metadaten
  documentHash: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: false, // Wir verwenden createdAt statt timestamps
  versionKey: false
});

// Compound Index für schnelle Abfragen
DocumentVersionSchema.index({ documentId: 1, versionNumber: 1 }, { unique: true });
DocumentVersionSchema.index({ documentId: 1, createdAt: -1 });
DocumentVersionSchema.index({ versionStatus: 1, createdAt: -1 });

/**
 * Erstellt eine Version aus einem Dokument
 */
DocumentVersionSchema.statics.createFromDocument = async function(document, options = {}) {
  const { parseVersionNumber } = require('../utils/documentHelpers');
  const { calculateDocumentHash } = require('../utils/documentHelpers');
  
  const versionNumber = options.versionNumber || document.currentVersion?.versionNumber || '1.0.0';
  const versionParts = parseVersionNumber(versionNumber);
  
  // Vollständigen Snapshot erstellen
  const documentSnapshot = {
    title: document.title,
    type: document.type,
    category: document.category,
    content: document.content,
    medicalData: document.medicalData,
    referralData: document.referralData,
    findingData: document.findingData,
    patient: document.patient,
    doctor: document.doctor,
    status: document.status,
    priority: document.priority,
    elgaData: document.elgaData,
    attachments: document.attachments,
    documentNumber: document.documentNumber,
    isConfidential: document.isConfidential,
    retentionPeriod: document.retentionPeriod,
    documentClass: document.documentClass,
    isMedicalDocument: document.isMedicalDocument,
    isContinuousDocument: document.isContinuousDocument,
    continuousDocumentType: document.continuousDocumentType
  };
  
  // Hash für Integrität berechnen
  const documentHash = calculateDocumentHash(document);
  
  const version = new this({
    documentId: document._id,
    versionNumber,
    majorVersion: versionParts.major,
    minorVersion: versionParts.minor,
    patchVersion: versionParts.patch,
    documentSnapshot,
    versionStatus: options.versionStatus || document.status || 'draft',
    changeReason: options.changeReason,
    changesFromPreviousVersion: options.changes || {},
    createdBy: options.createdBy || document.createdBy,
    documentHash,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent
  });
  
  return version;
};

/**
 * Findet alle Versionen eines Dokuments
 */
DocumentVersionSchema.statics.findByDocumentId = function(documentId, options = {}) {
  const query = this.find({ documentId });
  
  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort({ createdAt: -1 }); // Neueste zuerst
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  return query.populate('createdBy', 'firstName lastName email')
              .populate('releasedBy', 'firstName lastName email')
              .populate('withdrawnBy', 'firstName lastName email');
};

/**
 * Findet eine spezifische Version
 */
DocumentVersionSchema.statics.findByVersionNumber = function(documentId, versionNumber) {
  return this.findOne({ documentId, versionNumber })
              .populate('createdBy', 'firstName lastName email')
              .populate('releasedBy', 'firstName lastName email')
              .populate('withdrawnBy', 'firstName lastName email');
};

module.exports = mongoose.model('DocumentVersion', DocumentVersionSchema);


