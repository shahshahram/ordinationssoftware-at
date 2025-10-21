const mongoose = require('mongoose');

const locationHoursSchema = new mongoose.Schema({
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  rrule: {
    type: String,
    required: true,
    trim: true
  },
  timezone: {
    type: String,
    default: 'Europe/Vienna',
    trim: true
  },
  label: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indizes
locationHoursSchema.index({ location_id: 1 });
locationHoursSchema.index({ location_id: 1, label: 1 });

// Eindeutigkeit pro Standort und Label
locationHoursSchema.index({ location_id: 1, label: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('LocationHours', locationHoursSchema);
