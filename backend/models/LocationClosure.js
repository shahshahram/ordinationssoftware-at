const mongoose = require('mongoose');

const locationClosureSchema = new mongoose.Schema({
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  starts_at: {
    type: Date,
    required: true
  },
  ends_at: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indizes
locationClosureSchema.index({ location_id: 1 });
locationClosureSchema.index({ starts_at: 1, ends_at: 1 });
locationClosureSchema.index({ location_id: 1, starts_at: 1, ends_at: 1 });

// Validierung: ends_at muss nach starts_at liegen
locationClosureSchema.pre('save', function(next) {
  if (this.ends_at <= this.starts_at) {
    return next(new Error('Endzeit muss nach Startzeit liegen'));
  }
  next();
});

module.exports = mongoose.model('LocationClosure', locationClosureSchema);
