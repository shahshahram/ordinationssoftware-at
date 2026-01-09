const mongoose = require('mongoose');

const DocumentTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'arztbrief',
      'attest', 
      'befund',
      'konsiliarbericht',
      'ueberweisung',
      'zuweisung',
      'rueckueberweisung',
      'operationsbericht',
      'rezept',
      'heilmittelverordnung',
      'krankenstandsbestaetigung',
      'bildgebende_zuweisung',
      'impfbestaetigung',
      'patientenaufklaerung',
      'therapieplan',
      'verlaufsdokumentation',
      'pflegebrief',
      'kostenuebernahmeantrag',
      'gutachten'
    ]
  },
  // NEU: Standalone-Dokument-Funktionalität
  isStandaloneDocument: {
    type: Boolean,
    default: false,
    index: true
  },
  documentType: {
    type: String,
    enum: ['rezept', 'ueberweisung', 'arztbrief', 'befund', 'formular', 'rechnung', 'sonstiges', 'attest', 'konsiliarbericht', 'zuweisung', 'rueckueberweisung', 'operationsbericht', 'heilmittelverordnung', 'krankenstandsbestaetigung', 'bildgebende_zuweisung', 'impfbestaetigung', 'patientenaufklaerung', 'therapieplan', 'verlaufsdokumentation', 'pflegebrief', 'kostenuebernahmeantrag', 'gutachten'],
    required: function() { return this.isStandaloneDocument; }
  },
  defaultRecipientType: {
    type: String,
    enum: ['patient', 'doctor', 'organization', 'contact', null],
    default: null
  },
  requiresRecipient: {
    type: Boolean,
    default: true
  },
  // NEU: Briefkopf-Vorlage für diese spezifische Vorlage (optional, überschreibt Standort-Einstellung)
  letterheadTemplate: {
    type: String,
    enum: {
      values: ['template1', 'template2', 'template3', 'custom'],
      message: 'Briefkopf-Vorlage muss einer der erlaubten Werte sein'
    },
    default: null,
    required: false
  },
  // NEU: Kategorisierung nach Fachrichtung
  medicalSpecialty: {
    type: String,
    enum: [
      'allgemeinmedizin',
      'innere_medizin',
      'chirurgie',
      'orthopaedie',
      'neurologie',
      'psychiatrie',
      'dermatologie',
      'augenheilkunde',
      'hno',
      'gynaekologie',
      'urologie',
      'kardiologie',
      'pneumologie',
      'gastroenterologie',
      'endokrinologie',
      'rheumatologie',
      'onkologie',
      'radiologie',
      'laboratoriumsmedizin',
      'pathologie',
      'anesthesiologie',
      'notfallmedizin',
      'sportmedizin',
      'arbeitsmedizin',
      'sonstiges'
    ],
    default: 'allgemeinmedizin',
    index: true
  },
  // NEU: Freigabe-Workflow
  approvalStatus: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected'],
    default: 'draft',
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  // NEU: Versionshistorie (erweitert)
  versionHistory: [{
    version: Number,
    content: String,
    placeholders: [{
      name: String,
      description: String,
      type: String,
      required: Boolean,
      defaultValue: String,
      options: [String]
    }],
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changeNotes: String,
    approvalStatus: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'rejected']
    }
  }],
  content: {
    type: String,
    required: true
  },
  placeholders: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'date', 'number', 'boolean', 'select'],
      default: 'text'
    },
    required: {
      type: Boolean,
      default: false
    },
    defaultValue: {
      type: String,
      default: ''
    },
    options: [String] // For select type
  }],
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [String],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  versionKey: false
});

// Index for efficient searching
DocumentTemplateSchema.index({ name: 'text', description: 'text', category: 1 });
DocumentTemplateSchema.index({ isActive: 1, category: 1 });
DocumentTemplateSchema.index({ createdBy: 1 });
DocumentTemplateSchema.index({ isStandaloneDocument: 1, approvalStatus: 1, medicalSpecialty: 1 });
DocumentTemplateSchema.index({ approvalStatus: 1, isActive: 1 });

// Virtual for template usage count
DocumentTemplateSchema.virtual('usageCount', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'templateId',
  count: true
});

// Method to get template with placeholders
DocumentTemplateSchema.methods.getTemplateWithPlaceholders = function() {
  return {
    _id: this._id,
    id: this._id, // Für Rückwärtskompatibilität
    name: this.name,
    description: this.description,
    category: this.category,
    content: this.content,
    placeholders: this.placeholders,
    version: this.version,
    tags: this.tags,
    metadata: this.metadata,
    isActive: this.isActive,
    createdBy: this.createdBy,
    lastModifiedBy: this.lastModifiedBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    // Standalone-Dokument-Felder
    isStandaloneDocument: this.isStandaloneDocument,
    documentType: this.documentType,
    defaultRecipientType: this.defaultRecipientType,
    requiresRecipient: this.requiresRecipient,
    letterheadTemplate: this.letterheadTemplate !== undefined ? this.letterheadTemplate : null,
    medicalSpecialty: this.medicalSpecialty,
    approvalStatus: this.approvalStatus,
    approvedBy: this.approvedBy,
    approvedAt: this.approvedAt,
    rejectionReason: this.rejectionReason,
    versionHistory: this.versionHistory
  };
};

// Static method to find templates by category
DocumentTemplateSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ name: 1 });
};

// Static method to search templates
DocumentTemplateSchema.statics.searchTemplates = function(query, category = null) {
  const searchQuery = {
    isActive: true,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  };

  if (category) {
    searchQuery.category = category;
  }

  return this.find(searchQuery).sort({ name: 1 });
};

// Static method to find standalone document templates
DocumentTemplateSchema.statics.findStandaloneTemplates = function(filters = {}) {
  const query = {
    isActive: true,
    isStandaloneDocument: true,
    approvalStatus: 'approved', // Nur freigegebene Vorlagen
    ...filters
  };

  return this.find(query)
    .populate('createdBy', 'firstName lastName')
    .populate('lastModifiedBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName')
    .sort({ name: 1 });
};

// Method to create new version
DocumentTemplateSchema.methods.createNewVersion = function(userId, changeNotes = '') {
  // Füge aktuelle Version zur Historie hinzu
  this.versionHistory.push({
    version: this.version,
    content: this.content,
    placeholders: this.placeholders,
    changedBy: this.lastModifiedBy,
    changedAt: this.updatedAt || new Date(),
    changeNotes: changeNotes || '',
    approvalStatus: this.approvalStatus
  });

  // Erhöhe Versionsnummer
  this.version += 1;
  this.lastModifiedBy = userId;
  this.approvalStatus = 'draft'; // Neue Version muss neu freigegeben werden
  this.approvedBy = null;
  this.approvedAt = null;

  return this;
};

// Method to approve template
DocumentTemplateSchema.methods.approve = function(userId, notes = '') {
  this.approvalStatus = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  if (notes) {
    this.metadata.approvalNotes = notes;
  }
  return this;
};

// Method to reject template
DocumentTemplateSchema.methods.reject = function(userId, reason) {
  this.approvalStatus = 'rejected';
  this.rejectionReason = reason;
  this.approvedBy = null;
  this.approvedAt = null;
  return this;
};

// Method to submit for approval
DocumentTemplateSchema.methods.submitForApproval = function(userId) {
  this.approvalStatus = 'pending_approval';
  this.lastModifiedBy = userId;
  return this;
};

module.exports = mongoose.model('DocumentTemplate', DocumentTemplateSchema);