const mongoose = require('mongoose');

const WorkShiftSchema = new mongoose.Schema({
  // Personalprofil
  staffId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'StaffProfile', 
    required: true 
  },
  
  // Standort
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  
  // Startzeit
  startsAt: { 
    type: Date, 
    required: true 
  },
  
  // Endzeit
  endsAt: { 
    type: Date, 
    required: true 
  },
  
  // Wiederholungsregel (RRULE)
  rrule: { 
    type: String, 
    trim: true 
  },
  
  // Zeitzone
  timezone: { 
    type: String, 
    default: 'Europe/Vienna' 
  },
  
  // Label/Beschreibung
  label: { 
    type: String, 
    trim: true 
  },
  
  // Schichttyp
  shiftType: { 
    type: String, 
    enum: ['regular', 'overtime', 'on_call', 'emergency'], 
    default: 'regular' 
  },
  
  // Verfügbare Terminarten
  availableServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCatalog'
  }],
  
  // Verfügbare Ressourcen
  availableResources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  }],
  
  // Max. Termine pro Stunde
  maxAppointmentsPerHour: { 
    type: Number, 
    default: 2 
  },
  
  // Pausen
  breaks: [{
    start: { type: String, required: true }, // HH:MM Format
    end: { type: String, required: true },   // HH:MM Format
    label: { type: String, trim: true }
  }],
  
  // Status
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  // Metadaten
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Indexes
WorkShiftSchema.index({ staffId: 1, startsAt: 1 });
WorkShiftSchema.index({ location_id: 1 });
WorkShiftSchema.index({ startsAt: 1, endsAt: 1 });
WorkShiftSchema.index({ isActive: 1 });
WorkShiftSchema.index({ staffId: 1, location_id: 1, startsAt: 1 });

// Pre-save middleware
WorkShiftSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Validierung: Endzeit muss nach Startzeit liegen
  if (this.endsAt <= this.startsAt) {
    return next(new Error('Endzeit muss nach Startzeit liegen'));
  }
  
  next();
});

// Methoden
WorkShiftSchema.methods.isWithinShift = function(dateTime) {
  return dateTime >= this.startsAt && dateTime <= this.endsAt;
};

WorkShiftSchema.methods.getDurationInMinutes = function() {
  return Math.round((this.endsAt - this.startsAt) / (1000 * 60));
};

WorkShiftSchema.methods.hasBreakAt = function(timeString) {
  return this.breaks.some(breakTime => 
    timeString >= breakTime.start && timeString <= breakTime.end
  );
};

// Statische Methoden
WorkShiftSchema.statics.getShiftsForDateRange = function(staffId, startDate, endDate) {
  return this.find({
    staffId,
    startsAt: { $gte: startDate },
    endsAt: { $lte: endDate },
    isActive: true
  }).populate('staffId', 'displayName roleHint');
};

WorkShiftSchema.statics.getAvailableSlots = function(staffId, date, serviceDuration = 30) {
  // Diese Methode würde die verfügbaren Slots basierend auf Schichten und Pausen berechnen
  // Vereinfachte Implementierung - in der Praxis würde hier komplexe Logik stehen
  return this.find({
    staffId,
    startsAt: { $lte: date },
    endsAt: { $gte: date },
    isActive: true
  });
};

module.exports = mongoose.model('WorkShift', WorkShiftSchema);
