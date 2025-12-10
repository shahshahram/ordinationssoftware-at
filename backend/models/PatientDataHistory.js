const mongoose = require('mongoose');

const PatientDataHistorySchema = new mongoose.Schema({
  // Verknüpfung zum Patienten
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  
  // Verknüpfung zum Termin (optional)
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    index: true
  },
  
  // Datum und Uhrzeit der Erfassung
  recordedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Erfasst von (Benutzer)
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Vollständiger Snapshot der Stammdaten zum Zeitpunkt der Erfassung
  snapshot: {
    firstName: String,
    lastName: String,
    dateOfBirth: Date,
    gender: String,
    phone: String,
    email: String,
    address: {
      street: String,
      city: String,
      zipCode: String,
      postalCode: String,
      country: String
    },
    insuranceNumber: String,
    insuranceProvider: String,
    socialSecurityNumber: String,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    },
    primaryCarePhysician: {
      name: String,
      location: String,
      phone: String
    },
    status: String
  },
  
  // Geänderte Felder (für schnellen Vergleich)
  changedFields: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  
  // Notizen zur Änderung
  changeNotes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index für schnelle Suche nach Patient und Datum
PatientDataHistorySchema.index({ patientId: 1, recordedAt: -1 });
PatientDataHistorySchema.index({ appointmentId: 1 });

const PatientDataHistory = mongoose.model('PatientDataHistory', PatientDataHistorySchema);

module.exports = PatientDataHistory;















