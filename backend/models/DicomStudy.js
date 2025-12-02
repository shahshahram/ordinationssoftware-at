const mongoose = require('mongoose');

const DicomStudySchema = new mongoose.Schema({
  // Patienten-Referenz
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientExtended',
    required: true,
    index: true
  },
  
  // DICOM-Identifikatoren
  studyInstanceUID: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  seriesInstanceUID: {
    type: String,
    index: true
  },
  sopInstanceUID: {
    type: String,
    index: true
  },
  
  // Patienten-Informationen (aus DICOM)
  patientName: {
    type: String,
    required: true
  },
  dicomPatientId: {
    type: String, // DICOM Patient ID (kann anders sein als MongoDB _id)
    index: true
  },
  patientBirthDate: {
    type: String // Format: YYYYMMDD
  },
  patientSex: {
    type: String,
    enum: ['M', 'F', 'O', null]
  },
  
  // Studien-Informationen
  studyDate: {
    type: String, // Format: YYYYMMDD
    index: true
  },
  studyTime: {
    type: String // Format: HHMMSS.FFFFFF
  },
  studyDescription: {
    type: String
  },
  studyID: {
    type: String
  },
  accessionNumber: {
    type: String,
    index: true
  },
  
  // Serien-Informationen
  seriesNumber: {
    type: Number
  },
  seriesDescription: {
    type: String
  },
  modality: {
    type: String, // CT, MR, CR, DX, US, etc.
    index: true
  },
  seriesDate: {
    type: String
  },
  seriesTime: {
    type: String
  },
  
  // Instanz-Informationen
  instanceNumber: {
    type: Number
  },
  sopClassUID: {
    type: String
  },
  
  // Datei-Informationen
  filename: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    default: 'application/dicom'
  },
  
  // Metadaten
  numberOfFrames: {
    type: Number,
    default: 1
  },
  rows: {
    type: Number
  },
  columns: {
    type: Number
  },
  bitsAllocated: {
    type: Number
  },
  bitsStored: {
    type: Number
  },
  samplesPerPixel: {
    type: Number
  },
  photometricInterpretation: {
    type: String
  },
  windowCenter: {
    type: Number
  },
  windowWidth: {
    type: Number
  },
  
  // Referenz-Informationen
  referringPhysicianName: {
    type: String
  },
  performingPhysicianName: {
    type: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'ready', 'error'],
    default: 'uploaded'
  },
  
  // Upload-Informationen
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional für externe Uploads
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  
  // Externe Upload-Informationen
  source: {
    type: String,
    enum: ['internal', 'external'],
    default: 'internal'
  },
  externalProvider: {
    type: String, // Code des externen Providers (z.B. 'RADIOLOGIE_WIEN')
    index: true
  },
  
  // Zusätzliche Metadaten (für alle DICOM-Tags)
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indizes für schnelle Suche
DicomStudySchema.index({ patientId: 1, studyDate: -1 });
DicomStudySchema.index({ studyInstanceUID: 1 });
DicomStudySchema.index({ modality: 1, studyDate: -1 });
DicomStudySchema.index({ uploadedAt: -1 });

// Virtual für Studien-URL
DicomStudySchema.virtual('studyUrl').get(function() {
  return `/api/dicom/studies/${this._id}/file`;
});

// Virtual für WADO-URL (für Cornerstone.js)
DicomStudySchema.virtual('wadoUrl').get(function() {
  return `/api/dicom/wado?studyInstanceUID=${this.studyInstanceUID}&seriesInstanceUID=${this.seriesInstanceUID}&objectUID=${this.sopInstanceUID}`;
});

module.exports = mongoose.model('DicomStudy', DicomStudySchema);

