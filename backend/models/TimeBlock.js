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
  
  // Arzt (optional, kann später gesetzt werden)
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
TimeBlockSchema.index({ doctor: 1, startTime: 1, endTime: 1 });
TimeBlockSchema.index({ locationId: 1, startTime: 1, endTime: 1 });
TimeBlockSchema.index({ status: 1 });

// Virtual für Dauer in Minuten
TimeBlockSchema.virtual('durationMinutes').get(function() {
  return Math.round((this.endTime - this.startTime) / (1000 * 60));
});

module.exports = mongoose.model('TimeBlock', TimeBlockSchema);

