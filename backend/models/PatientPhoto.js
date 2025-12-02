const mongoose = require('mongoose');

const PatientPhotoSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientExtended',
    required: true,
    index: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Beschreibung darf maximal 500 Zeichen haben']
  },
  source: {
    type: String,
    enum: ['dekurs', 'direct', 'document', 'other'],
    default: 'direct'
  },
  sourceId: {
    type: String,
    // Referenz zu Dekurs-Eintrag, Dokument, etc.
  },
  sourceName: {
    type: String,
    // Beschreibung der Quelle (z.B. "Dekurs vom 18.11.2025")
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  folderName: {
    type: String,
    // Ordner-Name für Gruppierung (z.B. "scan-2025-11-24_15-22-17_Befund")
  }
}, {
  timestamps: true
});

// Index für schnelle Suche
PatientPhotoSchema.index({ patientId: 1, uploadedAt: -1 });

module.exports = mongoose.model('PatientPhoto', PatientPhotoSchema);



