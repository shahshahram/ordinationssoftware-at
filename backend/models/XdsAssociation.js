const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * XDS Association Model
 * Verknüpft Dokumente, Folders und Submission Sets miteinander
 */
const xdsAssociationSchema = new mongoose.Schema({
  // Unique ID (entryUUID)
  entryUUID: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  
  // Association Type (z.B. RPLC, APND, XFRM, etc.)
  associationType: {
    type: String,
    required: true,
    enum: [
      'RPLC',  // Replaces
      'APND',  // Appends
      'XFRM',  // Transforms
      'XFRM_RPLC',  // Transforms and replaces
      'signs', // Signs
      'IsSnapshotOf', // Snapshot
      'IsMemberOf' // Member of Folder
    ],
    index: true
  },
  
  // Source Object (was verknüpft)
  sourceObject: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'sourceObjectType',
    index: true
  },
  
  // Source Object Type (DocumentEntry, Folder, SubmissionSet)
  sourceObjectType: {
    type: String,
    required: true,
    enum: ['XdsDocumentEntry', 'XdsFolder', 'XdsSubmissionSet'],
    index: true
  },
  
  // Target Object (womit verknüpft)
  targetObject: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetObjectType',
    index: true
  },
  
  // Target Object Type
  targetObjectType: {
    type: String,
    required: true,
    enum: ['XdsDocumentEntry', 'XdsFolder', 'XdsSubmissionSet'],
    index: true
  },
  
  // Location Reference
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true
  },
  
  // Submission Set (wenn Teil eines Submission Sets)
  submissionSetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'XdsSubmissionSet',
    index: true
  },
  
  // Previous Version (für RPLC)
  previousVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'XdsDocumentEntry'
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Created By
  createdBy: {
    userId: mongoose.Schema.Types.ObjectId,
    userName: String
  }
  
}, {
  timestamps: true,
  collection: 'xds_associations'
});

// Indizes
xdsAssociationSchema.index({ sourceObject: 1, associationType: 1 });
xdsAssociationSchema.index({ targetObject: 1, associationType: 1 });
xdsAssociationSchema.index({ locationId: 1 });

module.exports = mongoose.model('XdsAssociation', xdsAssociationSchema);



