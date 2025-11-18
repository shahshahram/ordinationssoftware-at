const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * XDS DocumentEntry Model
 * Entspricht IHE ITI TF-3: Metadata für Dokumente in der Registry
 */
const xdsDocumentEntrySchema = new mongoose.Schema({
  // Unique ID (entryUUID)
  entryUUID: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  
  // Document Unique ID (uniqueId)
  uniqueId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Submission Set Reference (wenn Teil eines Submission Sets)
  submissionSetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'XdsSubmissionSet',
    index: true
  },
  
  // Location Reference
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true
  },
  
  // Patient ID (patientId)
  patientId: {
    type: String,
    required: true,
    index: true
  },
  
  // Creation Time
  creationTime: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Service Start/Stop Time
  serviceStartTime: Date,
  serviceStopTime: Date,
  
  // Availability Status
  availabilityStatus: {
    type: String,
    enum: ['Approved', 'Deprecated', 'Submitted'],
    default: 'Approved',
    index: true
  },
  
  // Document Class (classCode)
  classCode: {
    code: String,
    codingScheme: String,
    displayName: String
  },
  
  // Type Code (typeCode) - Array für mehrere
  typeCode: [{
    code: String,
    codingScheme: String,
    displayName: String
  }],
  
  // Format Code (formatCode)
  formatCode: {
    code: String,
    codingScheme: String,
    displayName: String
  },
  
  // Healthcare Facility Type (healthcareFacilityTypeCode)
  healthcareFacilityTypeCode: {
    code: String,
    codingScheme: String,
    displayName: String
  },
  
  // Practice Setting (practiceSettingCode)
  practiceSettingCode: {
    code: String,
    codingScheme: String,
    displayName: String
  },
  
  // Document Title
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  // Comments (description)
  comments: String,
  
  // Author
  author: [{
    authorPerson: String,
    authorInstitution: [String],
    authorRole: [String],
    authorSpecialty: [String]
  }],
  
  // Repository Unique ID
  repositoryUniqueId: {
    type: String,
    required: true
  },
  
  // Repository URL/Location (wo das Dokument physisch gespeichert ist)
  repositoryLocation: {
    type: String,
    required: true
  },
  
  // File Reference (Pfad zum tatsächlichen Dokument)
  fileReference: {
    type: String,
    required: true
  },
  
  // File Size (in Bytes)
  size: {
    type: Number,
    default: 0
  },
  
  // MIME Type
  mimeType: {
    type: String,
    default: 'application/pdf'
  },
  
  // Hash (für Integritätsprüfung)
  hash: String,
  
  // Language Code
  languageCode: {
    type: String,
    default: 'de-AT'
  },
  
  // Legal Authenticator
  legalAuthenticator: {
    person: String,
    organization: String
  },
  
  // Event Code List (für CDA Dokumente)
  eventCodeList: [{
    code: String,
    codingScheme: String,
    displayName: String
  }],
  
  // Confidentiality Code
  confidentialityCode: [{
    code: String,
    codingScheme: String,
    displayName: String
  }],
  
  // Source Patient Info
  sourcePatientInfo: {
    id: String,
    name: String,
    gender: String,
    birthTime: Date
  },
  
  // Source Patient Identity (wenn anonymisiert)
  sourcePatientIdentity: {
    id: [String],
    identitySource: String
  },
  
  // Source Organization (External ID)
  externalIdentifier: [{
    id: String,
    registryObject: String,
    identificationScheme: String,
    value: String
  }],
  
  // Intended Recipient (wer soll das Dokument erhalten)
  intendedRecipient: [{
    id: String,
    person: String,
    organization: String,
    telecommunication: String
  }],
  
  // Document Source (woher kommt das Dokument)
  source: {
    type: String,
    enum: ['internal', 'retrieved', 'patient_upload', 'ambulanzbefund'],
    default: 'internal',
    index: true
  },
  
  // External Document Source Info
  externalDocumentSource: {
    organizationId: String,
    organizationName: String,
    uniqueId: String
  },
  
  // Folders (wenn Dokument in Foldern organisiert)
  folderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'XdsFolder'
  }],
  
  // Version Info
  version: {
    majorVersion: { type: Number, default: 1 },
    minorVersion: { type: Number, default: 0 }
  },
  
  // Relationships to other documents (via Associations)
  associations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'XdsAssociation'
  }],
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Audit Trail
  submittedBy: {
    userId: mongoose.Schema.Types.ObjectId,
    userName: String,
    userRole: String
  },
  
  submittedAt: {
    type: Date,
    default: Date.now
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  deprecatedAt: Date,
  deprecatedBy: {
    userId: mongoose.Schema.Types.ObjectId,
    userName: String
  },
  deprecatedReason: String
  
}, {
  timestamps: true,
  collection: 'xds_document_entries'
});

// Indizes für schnelle Abfragen
xdsDocumentEntrySchema.index({ patientId: 1, creationTime: -1 });
xdsDocumentEntrySchema.index({ locationId: 1, availabilityStatus: 1 });
xdsDocumentEntrySchema.index({ classCode: 1, availabilityStatus: 1 });
xdsDocumentEntrySchema.index({ source: 1, locationId: 1 });
xdsDocumentEntrySchema.index({ entryUUID: 1 });
xdsDocumentEntrySchema.index({ uniqueId: 1 });
xdsDocumentEntrySchema.index({ submissionSetId: 1 });

module.exports = mongoose.model('XdsDocumentEntry', xdsDocumentEntrySchema);

