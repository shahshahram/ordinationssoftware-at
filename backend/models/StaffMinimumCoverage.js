const mongoose = require('mongoose');

/**
 * Mindestbesetzung pro Standort und Wochentag (1 = Montag, 7 = Sonntag, ISO-Wochentag).
 */
const staffMinimumCoverageSchema = new mongoose.Schema({
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  dayOfWeek: {
    type: Number,
    min: 1,
    max: 7,
    required: true
  },
  minimumCount: {
    type: Number,
    min: 0,
    required: true
  }
}, {
  timestamps: true
});

staffMinimumCoverageSchema.index({ location_id: 1, dayOfWeek: 1 }, { unique: true });

module.exports = mongoose.model('StaffMinimumCoverage', staffMinimumCoverageSchema);
