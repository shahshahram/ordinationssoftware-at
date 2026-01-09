const mongoose = require('mongoose');

const locationExceptionSchema = new mongoose.Schema({
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true
  },
  // Spezifisches Datum für diese Ausnahme
  date: {
    type: Date,
    required: true,
    index: true
  },
  // Startzeit (Format: "HH:MM")
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  // Endzeit (Format: "HH:MM")
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  // Pause (optional)
  breakStart: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  breakEnd: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  // Beschreibung/Label
  label: {
    type: String,
    trim: true,
    default: 'Sonderöffnung'
  },
  // Zugewiesenes Personal (optional - wenn leer, gilt für alle)
  assignedStaff: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  // Status (für zukünftige Erweiterungen)
  isActive: {
    type: Boolean,
    default: true
  },
  // Erstellt von
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index für effiziente Abfragen
locationExceptionSchema.index({ location_id: 1, date: 1 });
locationExceptionSchema.index({ date: 1, isActive: 1 });

// Validierung: Endzeit muss nach Startzeit liegen
locationExceptionSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const [startHours, startMinutes] = this.startTime.split(':').map(Number);
    const [endHours, endMinutes] = this.endTime.split(':').map(Number);
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    
    if (endTotal <= startTotal) {
      return next(new Error('Endzeit muss nach Startzeit liegen'));
    }
  }
  
  // Validierung für Pause
  if (this.breakStart && this.breakEnd) {
    const [breakStartHours, breakStartMinutes] = this.breakStart.split(':').map(Number);
    const [breakEndHours, breakEndMinutes] = this.breakEnd.split(':').map(Number);
    const breakStartTotal = breakStartHours * 60 + breakStartMinutes;
    const breakEndTotal = breakEndHours * 60 + breakEndMinutes;
    
    if (breakEndTotal <= breakStartTotal) {
      return next(new Error('Pausen-Endzeit muss nach Pausen-Startzeit liegen'));
    }
    
    // Pause muss innerhalb der Öffnungszeiten liegen
    const [startHours, startMinutes] = this.startTime.split(':').map(Number);
    const [endHours, endMinutes] = this.endTime.split(':').map(Number);
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    
    if (breakStartTotal < startTotal || breakEndTotal > endTotal) {
      return next(new Error('Pause muss innerhalb der Öffnungszeiten liegen'));
    }
  }
  
  next();
});

module.exports = mongoose.model('LocationException', locationExceptionSchema);


