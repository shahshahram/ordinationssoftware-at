const mongoose = require('mongoose');

const ClinicHoursSchema = new mongoose.Schema({
  // RRULE für Öffnungszeiten (z.B. FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8,9,10,11,13,14,15,16)
  rrule: {
    type: String,
    required: true,
    trim: true
  },
  
  // Zeitzone
  timezone: {
    type: String,
    default: 'Europe/Vienna',
    trim: true
  },
  
  // Bezeichnung der Öffnungszeit
  label: {
    type: String,
    trim: true,
    default: 'Reguläre Öffnungszeiten'
  },
  
  // Start- und Endzeit für diesen Block
  startTime: {
    type: String, // Format: "08:00"
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  
  endTime: {
    type: String, // Format: "17:00"
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  
  // Wochentage (Array von 0-6, 0=Sonntag)
  weekdays: [{
    type: Number,
    min: 0,
    max: 6
  }],
  
  // Pausen zwischen den Blöcken
  breaks: [{
    start: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    end: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    label: { type: String, trim: true }
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Gültigkeitszeitraum
  validFrom: {
    type: Date,
    default: Date.now
  },
  
  validUntil: {
    type: Date
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
ClinicHoursSchema.index({ isActive: 1 });
ClinicHoursSchema.index({ validFrom: 1, validUntil: 1 });

// Pre-save middleware
ClinicHoursSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Validierung: Endzeit muss nach Startzeit liegen
  const start = this.startTime.split(':').map(Number);
  const end = this.endTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  
  if (endMinutes <= startMinutes) {
    return next(new Error('Endzeit muss nach Startzeit liegen'));
  }
  
  next();
});

// Methoden
ClinicHoursSchema.methods.isOpenOnDate = function(date) {
  const dayOfWeek = date.getDay();
  return this.weekdays.includes(dayOfWeek);
};

ClinicHoursSchema.methods.isOpenAtTime = function(timeString) {
  const time = timeString.split(':').map(Number);
  const timeMinutes = time[0] * 60 + time[1];
  
  const start = this.startTime.split(':').map(Number);
  const end = this.endTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  
  // Prüfen ob Zeit in Pause liegt
  for (const breakTime of this.breaks) {
    const breakStart = breakTime.start.split(':').map(Number);
    const breakEnd = breakTime.end.split(':').map(Number);
    const breakStartMinutes = breakStart[0] * 60 + breakStart[1];
    const breakEndMinutes = breakEnd[0] * 60 + breakEnd[1];
    
    if (timeMinutes >= breakStartMinutes && timeMinutes <= breakEndMinutes) {
      return false;
    }
  }
  
  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
};

ClinicHoursSchema.methods.getOpeningHoursForDate = function(date) {
  if (!this.isOpenOnDate(date)) {
    return null;
  }
  
  return {
    start: this.startTime,
    end: this.endTime,
    breaks: this.breaks
  };
};

// Statische Methoden
ClinicHoursSchema.statics.getActiveHours = function() {
  const now = new Date();
  return this.find({
    isActive: true,
    validFrom: { $lte: now },
    $or: [
      { validUntil: { $exists: false } },
      { validUntil: { $gte: now } }
    ]
  }).sort({ validFrom: 1 });
};

ClinicHoursSchema.statics.isClinicOpenAt = function(date, timeString) {
  return this.getActiveHours().then(hours => {
    for (const hour of hours) {
      if (hour.isOpenOnDate(date) && hour.isOpenAtTime(timeString)) {
        return true;
      }
    }
    return false;
  });
};

module.exports = mongoose.model('ClinicHours', ClinicHoursSchema);
