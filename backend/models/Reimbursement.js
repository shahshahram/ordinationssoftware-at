// Erstattungsverwaltung für Wahlarzt- und Zusatzversicherungs-Abrechnungen

const mongoose = require('mongoose');

const ReimbursementSchema = new mongoose.Schema({
  // Referenz zur Rechnung
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
    index: true
  },
  
  // Patient
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientExtended',
    required: true,
    index: true
  },
  
  // Versicherungsinformationen
  insuranceProvider: {
    type: String,
    required: true
  },
  insuranceType: {
    type: String,
    enum: ['hauptversicherung', 'zusatzversicherung_hospital', 'zusatzversicherung_wahlarzt', 'zusatzversicherung_zahn', 'zusatzversicherung_brille', 'zusatzversicherung_heilbehelfe'],
    required: true
  },
  insuranceCompany: {
    type: String,
    required: true
  },
  policyNumber: {
    type: String,
    trim: true
  },
  
  // Abrechnungsdaten
  serviceDate: {
    type: Date,
    required: true
  },
  serviceDescription: {
    type: String,
    required: true
  },
  serviceCode: {
    type: String,
    trim: true
  },
  goaeCode: {
    type: String,
    trim: true
  },
  ebmCode: {
    type: String,
    trim: true
  },
  
  // Beträge
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  requestedReimbursement: {
    type: Number,
    required: true,
    min: 0
  },
  approvedReimbursement: {
    type: Number,
    default: 0,
    min: 0
  },
  rejectedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'partially_approved', 'rejected', 'paid', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Einreichungsdaten
  submittedDate: {
    type: Date
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submissionMethod: {
    type: String,
    enum: ['online', 'email', 'post', 'api'],
    default: 'online'
  },
  submissionReference: {
    type: String,
    trim: true
  },
  
  // Bearbeitungsdaten
  approvalDate: {
    type: Date
  },
  rejectionDate: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  paymentDate: {
    type: Date
  },
  
  // Dokumente
  documents: [{
    filename: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, default: 'application/pdf' },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // Notizen
  notes: {
    type: String,
    trim: true
  },
  internalNotes: {
    type: String,
    trim: true
  },
  
  // Metadaten
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indizes
ReimbursementSchema.index({ patientId: 1, status: 1 });
ReimbursementSchema.index({ invoiceId: 1 });
ReimbursementSchema.index({ insuranceProvider: 1, status: 1 });
ReimbursementSchema.index({ submittedDate: -1 });
ReimbursementSchema.index({ status: 1, submittedDate: -1 });

// Virtual für Erstattungsrate
ReimbursementSchema.virtual('reimbursementRate').get(function() {
  if (!this.totalAmount || this.totalAmount === 0) return 0;
  return (this.approvedReimbursement / this.totalAmount) * 100;
});

// Pre-save Hook
ReimbursementSchema.pre('save', function(next) {
  // Setze submittedDate wenn Status auf 'submitted' geändert wird
  if (this.isModified('status') && this.status === 'submitted' && !this.submittedDate) {
    this.submittedDate = new Date();
  }
  
  // Setze approvalDate wenn Status auf 'approved' geändert wird
  if (this.isModified('status') && (this.status === 'approved' || this.status === 'partially_approved') && !this.approvalDate) {
    this.approvalDate = new Date();
  }
  
  // Setze rejectionDate wenn Status auf 'rejected' geändert wird
  if (this.isModified('status') && this.status === 'rejected' && !this.rejectionDate) {
    this.rejectionDate = new Date();
  }
  
  next();
});

// Statische Methoden
ReimbursementSchema.statics.findByPatient = function(patientId, options = {}) {
  const query = { patientId };
  if (options.status) {
    query.status = options.status;
  }
  return this.find(query)
    .populate('invoiceId')
    .populate('patientId', 'firstName lastName insuranceProvider')
    .sort({ submittedDate: -1 });
};

ReimbursementSchema.statics.findByStatus = function(status) {
  return this.find({ status })
    .populate('invoiceId')
    .populate('patientId', 'firstName lastName')
    .sort({ submittedDate: -1 });
};

ReimbursementSchema.statics.getPendingCount = function(patientId = null) {
  const query = { status: { $in: ['pending', 'submitted'] } };
  if (patientId) {
    query.patientId = patientId;
  }
  return this.countDocuments(query);
};

module.exports = mongoose.model('Reimbursement', ReimbursementSchema);














