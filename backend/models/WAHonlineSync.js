const mongoose = require('mongoose');

/**
 * WAHonline-Sync-Status pro Leistung (Honorarnote)
 * Wird nach ELDA-Call gesetzt: SYNCED + protokollnummer oder ERROR + errorText
 */
const WAHonlineSyncSchema = new mongoose.Schema({
  performanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Performance',
    required: true,
    index: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['SYNCED', 'ERROR'],
    required: true,
    index: true
  },
  protokollnummer: {
    type: String,
    trim: true,
    default: null
  },
  errorText: {
    type: String,
    trim: true,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: false,
  collection: 'wahonlinesync'
});

// performanceId und status haben bereits index: true im Schema

module.exports = mongoose.model('WAHonlineSync', WAHonlineSyncSchema);
