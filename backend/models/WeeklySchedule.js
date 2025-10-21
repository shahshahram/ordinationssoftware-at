const mongoose = require('mongoose');

const DayScheduleSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  isWorking: {
    type: Boolean,
    required: true,
    default: false
  },
  startTime: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    default: '08:00'
  },
  endTime: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    default: '17:00'
  },
  breakStart: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    default: '12:00'
  },
  breakEnd: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    default: '13:00'
  },
  label: {
    type: String,
    maxlength: 100
  }
});

const WeeklyScheduleSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StaffProfile',
    required: true
  },
  // Entfernt weekStart - wird als wiederkehrende Vorlage verwendet
  schedules: [DayScheduleSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Neues Feld: Gültigkeitsdatum für die Vorlage
  validFrom: {
    type: Date,
    default: Date.now
  },
  validTo: {
    type: Date,
    default: null // null = unbegrenzt gültig
  }
}, {
  timestamps: true
});

// Index für effiziente Abfragen - nur ein aktiver Zeitplan pro Personal
WeeklyScheduleSchema.index({ staffId: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

// Index for efficient querying
WeeklyScheduleSchema.index({ validFrom: 1, validTo: 1 });

// Pre-save validation
WeeklyScheduleSchema.pre('save', function(next) {
  // Validate that working days have valid times
  this.schedules.forEach(schedule => {
    if (schedule.isWorking) {
      if (!schedule.startTime || !schedule.endTime) {
        return next(new Error('Arbeitstage müssen Start- und Endzeit haben'));
      }
      
      // Convert times to minutes for comparison
      const startMinutes = this.timeToMinutes(schedule.startTime);
      const endMinutes = this.timeToMinutes(schedule.endTime);
      
      if (startMinutes >= endMinutes) {
        return next(new Error('Endzeit muss nach Startzeit liegen'));
      }
      
      // Validate break times if provided
      if (schedule.breakStart && schedule.breakEnd) {
        const breakStartMinutes = this.timeToMinutes(schedule.breakStart);
        const breakEndMinutes = this.timeToMinutes(schedule.breakEnd);
        
        if (breakStartMinutes >= breakEndMinutes) {
          return next(new Error('Pausenende muss nach Pausenbeginn liegen'));
        }
        
        if (breakStartMinutes < startMinutes || breakEndMinutes > endMinutes) {
          return next(new Error('Pause muss innerhalb der Arbeitszeit liegen'));
        }
      }
    }
  });
  
  next();
});

// Helper method to convert time string to minutes
WeeklyScheduleSchema.methods.timeToMinutes = function(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Virtual für aktuelle Gültigkeit
WeeklyScheduleSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  return this.isActive && 
         this.validFrom <= now && 
         (this.validTo === null || this.validTo >= now);
});

// Virtual for total working hours per week
WeeklyScheduleSchema.virtual('totalWorkingHours').get(function() {
  let totalMinutes = 0;
  
  this.schedules.forEach(schedule => {
    if (schedule.isWorking) {
      const startMinutes = this.timeToMinutes(schedule.startTime);
      const endMinutes = this.timeToMinutes(schedule.endTime);
      let dayMinutes = endMinutes - startMinutes;
      
      // Subtract break time if provided
      if (schedule.breakStart && schedule.breakEnd) {
        const breakStartMinutes = this.timeToMinutes(schedule.breakStart);
        const breakEndMinutes = this.timeToMinutes(schedule.breakEnd);
        dayMinutes -= (breakEndMinutes - breakStartMinutes);
      }
      
      totalMinutes += dayMinutes;
    }
  });
  
  return Math.round(totalMinutes / 60 * 100) / 100; // Round to 2 decimal places
});

// Ensure virtual fields are serialized
WeeklyScheduleSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('WeeklySchedule', WeeklyScheduleSchema);
