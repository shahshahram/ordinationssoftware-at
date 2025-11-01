const mongoose = require('mongoose');

const BillingJobSchema = new mongoose.Schema({
  // Referenzen
  performanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Performance',
    required: true,
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  
  // Job-Konfiguration
  target: {
    type: String,
    enum: ['KASSE', 'PATIENT', 'INSURANCE', 'PATIENT+KASSE_REFUND', 'PATIENT+INSURANCE'],
    required: true,
    index: true
  },
  
  // Payload (Raw-Daten für Connector)
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Idempotency
  idempotencyKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'SENT', 'ACCEPTED', 'REJECTED', 'FAILED', 'RETRY'],
    default: 'PENDING',
    index: true
  },
  
  // Retry-Mechanismus
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  nextRetryAt: Date,
  lastError: String,
  
  // Queue-Daten
  queueName: {
    type: String,
    default: 'billing'
  },
  priority: {
    type: Number,
    default: 0,
    min: -10,
    max: 10
  },
  
  // Ergebnisse
  response: {
    type: mongoose.Schema.Types.Mixed
  },
  externalRef: String,        // Externe Referenz (Kassen-ID, etc.)
  processingTime: Number,      // Verarbeitungszeit in ms
  
  // Metadaten
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Indizes
BillingJobSchema.index({ status: 1, nextRetryAt: 1 });
BillingJobSchema.index({ doctorId: 1, createdAt: -1 });
BillingJobSchema.index({ performanceId: 1 });
BillingJobSchema.index({ target: 1, status: 1 });

// Pre-save Hook für updatedAt
BillingJobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methoden
BillingJobSchema.methods.canRetry = function() {
  return this.attempts < this.maxAttempts && this.status === 'FAILED';
};

BillingJobSchema.methods.markAsProcessing = function() {
  this.status = 'PROCESSING';
  this.attempts += 1;
  return this.save();
};

BillingJobSchema.methods.markAsCompleted = function(response, externalRef) {
  this.status = 'ACCEPTED';
  this.response = response;
  this.externalRef = externalRef;
  this.completedAt = new Date();
  this.processingTime = Date.now() - this.createdAt.getTime();
  return this.save();
};

BillingJobSchema.methods.markAsFailed = function(error) {
  this.status = 'FAILED';
  this.lastError = error;
  this.nextRetryAt = this.canRetry() ? 
    new Date(Date.now() + Math.pow(2, this.attempts) * 60000) : // Exponential backoff
    null;
  return this.save();
};

module.exports = mongoose.model('BillingJob', BillingJobSchema);


