const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * XDS SubmissionSet Model
 * Gruppiert zusammengehörige Dokumente zu einem Submission (Submit Document Set)
 */
const xdsSubmissionSetSchema = new mongoose.Schema({
  // Unique ID (entryUUID)
  entryUUID: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  
  // Unique ID for Submission Set
  uniqueId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Location Reference
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true
  },
  
  // Patient ID
  patientId: {
    type: String,
    required: true,
    index: true
  },
  
  // Submission Time
  submissionTime: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Content Type Code (submissionType)
  contentTypeCode: {
    code: String,
    codingScheme: String,
    displayName: String
  },
  
  // Author
  author: [{
    authorPerson: String,
    authorInstitution: [String],
    authorRole: [String],
    authorSpecialty: [String]
  }],
  
  // Title
  title: {
    type: String,
    trim: true
  },
  
  // Comments
  comments: String,
  
  // Availability Status
  availabilityStatus: {
    type: String,
    enum: ['Approved', 'Deprecated'],
    default: 'Approved',
    index: true
  },
  
  // Intended Recipient
  intendedRecipient: [{
    id: String,
    person: String,
    organization: String,
    telecommunication: String
  }],
  
  // Source Patient Info
  sourcePatientInfo: {
    id: String,
    name: String,
    gender: String,
    birthTime: Date
  },
  
  // Submitted Documents
  documentEntries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'XdsDocumentEntry'
  }],
  
  // Submitted By
  submittedBy: {
    userId: mongoose.Schema.Types.ObjectId,
    userName: String,
    userRole: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['submitted', 'approved', 'failed', 'deprecated'],
    default: 'submitted',
    index: true
  },
  
  // Error Info (wenn Submission fehlgeschlagen)
  errorInfo: {
    code: String,
    message: String,
    detail: String
  }
  
}, {
  timestamps: true,
  collection: 'xds_submission_sets'
});

// Indizes
xdsSubmissionSetSchema.index({ patientId: 1, submissionTime: -1 });
xdsSubmissionSetSchema.index({ locationId: 1, status: 1 });
xdsSubmissionSetSchema.index({ entryUUID: 1 });

module.exports = mongoose.model('XdsSubmissionSet', xdsSubmissionSetSchema);



