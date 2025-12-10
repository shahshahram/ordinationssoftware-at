const mongoose = require('mongoose');

const MedicalDataHistorySchema = new mongoose.Schema({
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
    ref: 'Appointment'
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
  
  // Vollständiger Snapshot der medizinischen Daten zum Zeitpunkt der Erfassung
  snapshot: {
    bloodType: String,
    height: Number,
    weight: Number,
    bmi: Number,
    allergies: [mongoose.Schema.Types.Mixed],
    currentMedications: [mongoose.Schema.Types.Mixed],
    preExistingConditions: [String],
    medicalHistory: [String],
    vaccinations: [mongoose.Schema.Types.Mixed],
    isPregnant: Boolean,
    pregnancyWeek: Number,
    isBreastfeeding: Boolean,
    hasPacemaker: Boolean,
    hasDefibrillator: Boolean,
    implants: [mongoose.Schema.Types.Mixed],
    smokingStatus: String,
    cigarettesPerDay: Number,
    yearsOfSmoking: Number,
    quitSmokingDate: Date,
    infections: [mongoose.Schema.Types.Mixed],
    notes: String
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
MedicalDataHistorySchema.index({ patientId: 1, recordedAt: -1 });

const MedicalDataHistory = mongoose.model('MedicalDataHistory', MedicalDataHistorySchema);

module.exports = MedicalDataHistory;
