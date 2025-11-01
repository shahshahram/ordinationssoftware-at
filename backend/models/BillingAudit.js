const mongoose = require('mongoose');

const BillingAuditSchema = new mongoose.Schema({
  // Referenzen
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingJob',
    required: true,
    index: true
  },
  performanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Performance',
    required: true,
    index: true
  },
  
  // Event-Daten
  event: {
    type: String,
    required: true,
    enum: [
      'JOB_CREATED',
      'JOB_STARTED',
      'SENT_TO_KASSA',
      'SENT_TO_INSURANCE',
      'PAYMENT_INITIATED',
      'KASSA_RESPONSE',
      'INSURANCE_RESPONSE',
      'PAYMENT_RESPONSE',
      'JOB_COMPLETED',
      'JOB_FAILED',
      'RETRY_ATTEMPT',
      'MANUAL_INTERVENTION'
    ],
    index: true
  },
  
  // Response-Daten
  request: {
    type: mongoose.Schema.Types.Mixed
  },
  response: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Status-Informationen
  statusCode: Number,
  statusMessage: String,
  externalRef: String,
  
  // Fehlerdaten
  error: {
    code: String,
    message: String,
    stack: String,
    details: mongoose.Schema.Types.Mixed
  },
  
  // Metadaten
  processingTime: Number,      // Verarbeitungszeit in ms
  attemptNumber: {
    type: Number,
    default: 1
  },
  
  // Benutzer-Informationen
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userRole: String,
  
  // IP und User-Agent für Sicherheit
  ipAddress: String,
  userAgent: String,
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false  // Nur timestamp verwenden, nicht createdAt/updatedAt
});

// Indizes für Audit-Log
BillingAuditSchema.index({ jobId: 1, timestamp: -1 });
BillingAuditSchema.index({ performanceId: 1, timestamp: -1 });
BillingAuditSchema.index({ event: 1, timestamp: -1 });
BillingAuditSchema.index({ userId: 1, timestamp: -1 });
BillingAuditSchema.index({ timestamp: -1 });

// Compound Index für häufige Queries
BillingAuditSchema.index({ jobId: 1, event: 1, timestamp: -1 });

// Statische Methoden für Audit-Logging
BillingAuditSchema.statics.logEvent = function(jobId, performanceId, event, data) {
  return this.create({
    jobId,
    performanceId,
    event,
    request: data.request,
    response: data.response,
    statusCode: data.statusCode,
    statusMessage: data.statusMessage,
    externalRef: data.externalRef,
    error: data.error,
    processingTime: data.processingTime,
    attemptNumber: data.attemptNumber,
    userId: data.userId,
    userRole: data.userRole,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent
  });
};

BillingAuditSchema.statics.getJobHistory = function(jobId) {
  return this.find({ jobId })
    .sort({ timestamp: -1 })
    .populate('userId', 'firstName lastName email');
};

BillingAuditSchema.statics.getPerformanceHistory = function(performanceId) {
  return this.find({ performanceId })
    .sort({ timestamp: -1 })
    .populate('userId', 'firstName lastName email');
};

// Immutable Audit-Log (keine Updates erlaubt)
BillingAuditSchema.pre('save', function(next) {
  if (this.isNew) {
    next();
  } else {
    next(new Error('Audit-Log entries cannot be modified'));
  }
});

module.exports = mongoose.model('BillingAudit', BillingAuditSchema);


