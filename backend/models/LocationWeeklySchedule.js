const mongoose = require('mongoose');

const locationWeeklyScheduleSchema = new mongoose.Schema({
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  // Entfernt weekStart - wird als wiederkehrende Vorlage verwendet
  schedules: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true
    },
    isOpen: {
      type: Boolean,
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
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    breakEnd: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    label: {
      type: String,
      trim: true
    }
  }],
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

// Index für effiziente Abfragen - nur ein aktiver Zeitplan pro Standort
locationWeeklyScheduleSchema.index({ location_id: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
locationWeeklyScheduleSchema.index({ validFrom: 1, validTo: 1 });

// Virtual für aktuelle Gültigkeit
locationWeeklyScheduleSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  return this.isActive && 
         this.validFrom <= now && 
         (this.validTo === null || this.validTo >= now);
});

// Ensure virtual fields are serialized
locationWeeklyScheduleSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('LocationWeeklySchedule', locationWeeklyScheduleSchema);
