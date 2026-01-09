const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * XDS Folder Model
 * Organisiert Dokumente in logischen Ordnern
 */
const xdsFolderSchema = new mongoose.Schema({
  // Unique ID (entryUUID)
  entryUUID: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  
  // Unique ID for Folder
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
  
  // Last Update Time
  lastUpdateTime: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Code List (was repräsentiert dieser Folder)
  codeList: [{
    code: String,
    codingScheme: String,
    displayName: String
  }],
  
  // Title
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
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
  
  // Documents in this Folder (via Association)
  documentEntryIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'XdsDocumentEntry'
  }],
  
  // Parent Folder (für verschachtelte Strukturen)
  parentFolderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'XdsFolder'
  },
  
  // Created By
  createdBy: {
    userId: mongoose.Schema.Types.ObjectId,
    userName: String,
    userRole: String
  }
  
}, {
  timestamps: true,
  collection: 'xds_folders'
});

// Indizes
xdsFolderSchema.index({ patientId: 1, lastUpdateTime: -1 });
xdsFolderSchema.index({ locationId: 1, availabilityStatus: 1 });
xdsFolderSchema.index({ parentFolderId: 1 });

module.exports = mongoose.model('XdsFolder', xdsFolderSchema);



