const mongoose = require('mongoose');

const TimeBlockSchema = new mongoose.Schema({
  // Zeitraum
  startTime: { 
    type: Date, 
    required: true, 
    index: true 
  },
  endTime: { 
    type: Date, 
    required: true, 
    index: true 
  },
  
  // Personal/Mitarbeiter (optional, kann später gesetzt werden)
  // Wenn nicht gesetzt (null), gilt die Sperre für alle
  // Wenn gesetzt, gilt die Sperre nur für diese Person (alle Berufsgruppen: Arzt, Assistent, Therapeut, etc.)
  staffId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true
  },
  // Altes Feld für Rückwärtskompatibilität (deprecated)
  doctor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true
  },
  
  // Standort (optional)
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    index: true
  },
  
  // Ressourcen (optional)
  resourceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Resource' 
  },
  assigned_rooms: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room' 
  }],
  assigned_devices: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Device' 
  }],
  
  // Grund und Status
  reason: { 
    type: String, 
    trim: true 
  },
  status: { 
    type: String, 
    enum: ['blocked', 'reserved', 'merged'], 
    default: 'blocked',
    index: true
  },
  
  // Zusammenführung
  mergedAppointmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment' 
  },
  
  // Metadaten
  metadata: { 
    type: Object 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index für effiziente Abfragen
TimeBlockSchema.index({ startTime: 1, endTime: 1 });
TimeBlockSchema.index({ staffId: 1, startTime: 1, endTime: 1 });
TimeBlockSchema.index({ doctor: 1, startTime: 1, endTime: 1 }); // Altes Feld für Rückwärtskompatibilität
// locationId hat bereits index: true, daher kein zusätzlicher Index nötig (Compound-Index bleibt)
TimeBlockSchema.index({ locationId: 1, startTime: 1, endTime: 1 });
// status hat bereits index: true, daher kein zusätzlicher Index nötig

// Pre-save Hook: Synchronisiere doctor zu staffId für Rückwärtskompatibilität
TimeBlockSchema.pre('save', function(next) {
  // Wenn staffId gesetzt ist, aber doctor nicht, kopiere staffId zu doctor
  if (this.staffId && !this.doctor) {
    this.doctor = this.staffId;
  }
  // Wenn doctor gesetzt ist, aber staffId nicht, kopiere doctor zu staffId
  if (this.doctor && !this.staffId) {
    this.staffId = this.doctor;
  }
  next();
});

// Virtual für Dauer in Minuten
TimeBlockSchema.virtual('durationMinutes').get(function() {
  return Math.round((this.endTime - this.startTime) / (1000 * 60));
});

module.exports = mongoose.model('TimeBlock', TimeBlockSchema);

