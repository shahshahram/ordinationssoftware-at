const mongoose = require('mongoose');

const locationServiceSchema = new mongoose.Schema({
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  service_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCatalog',
    required: true
  },
  duration_min: {
    type: Number,
    min: 1
  },
  buffer_before_min: {
    type: Number,
    min: 0,
    default: 0
  },
  buffer_after_min: {
    type: Number,
    min: 0,
    default: 0
  },
  requires_room: {
    type: Boolean,
    default: true
  },
  required_device_type: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indizes
locationServiceSchema.index({ location_id: 1 });
locationServiceSchema.index({ service_id: 1 });
locationServiceSchema.index({ location_id: 1, service_id: 1 }, { unique: true });

module.exports = mongoose.model('LocationService', locationServiceSchema);
