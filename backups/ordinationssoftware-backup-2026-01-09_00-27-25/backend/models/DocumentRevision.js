const mongoose = require('mongoose');

const DocumentRevisionSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentTemplate',
    required: true
  },
  version: {
    type: Number,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  placeholders: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  action: {
    type: String,
    enum: ['created', 'edited', 'generated', 'printed', 'sent', 'archived'],
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedAt: {
    type: Date,
    default: Date.now
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Immutable audit trail
  auditTrail: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    previousVersion: Number
  }
}, {
  timestamps: false, // We use performedAt instead
  versionKey: false
});

// Compound index for efficient querying
DocumentRevisionSchema.index({ documentId: 1, version: 1 });
DocumentRevisionSchema.index({ performedBy: 1, performedAt: -1 });
DocumentRevisionSchema.index({ action: 1, performedAt: -1 });

// Static method to create revision
DocumentRevisionSchema.statics.createRevision = async function(revisionData) {
  const revision = new this(revisionData);
  await revision.save();
  return revision;
};

// Static method to get document history
DocumentRevisionSchema.statics.getDocumentHistory = function(documentId, limit = 50) {
  return this.find({ documentId })
    .populate('performedBy', 'firstName lastName email')
    .populate('templateId', 'name category')
    .sort({ version: -1 })
    .limit(limit);
};

// Static method to get revision by version
DocumentRevisionSchema.statics.getRevisionByVersion = function(documentId, version) {
  return this.findOne({ documentId, version })
    .populate('performedBy', 'firstName lastName email')
    .populate('templateId', 'name category');
};

// Static method to get audit trail
DocumentRevisionSchema.statics.getAuditTrail = function(documentId, action = null) {
  const query = { documentId };
  if (action) {
    query.action = action;
  }
  
  return this.find(query)
    .populate('performedBy', 'firstName lastName email')
    .sort({ performedAt: -1 });
};

module.exports = mongoose.model('DocumentRevision', DocumentRevisionSchema);


