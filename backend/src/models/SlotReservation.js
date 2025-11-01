const mongoose = require('mongoose');

const slotReservationSchema = new mongoose.Schema({
  start: {
    type: Date,
    required: true,
    index: true
  },
  end: {
    type: Date,
    required: true,
    index: true
  },
  resourceId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'expired'],
    default: 'pending',
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  },
  ttl: {
    type: Number,
    default: 30000, // 30 seconds in milliseconds
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
slotReservationSchema.index({ start: 1, end: 1, resourceId: 1 });
slotReservationSchema.index({ status: 1, createdAt: 1 });
slotReservationSchema.index({ userId: 1, status: 1 });

// Pre-save middleware to set TTL
slotReservationSchema.pre('save', function(next) {
  if (this.isNew && this.status === 'pending') {
    // Set TTL to current time + ttl value
    this.createdAt = new Date();
    this.ttl = this.ttl || 30000;
  }
  next();
});

// Static method to check for conflicts
slotReservationSchema.statics.checkConflicts = async function(start, end, resourceId, excludeId = null) {
  const query = {
    start: { $lt: end },
    end: { $gt: start },
    resourceId: resourceId,
    status: { $in: ['pending', 'confirmed'] }
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return await this.find(query);
};

// Static method to reserve slot
slotReservationSchema.statics.reserveSlot = async function(start, end, resourceId, userId, metadata = {}) {
  // Check for conflicts first
  const conflicts = await this.checkConflicts(start, end, resourceId);
  if (conflicts.length > 0) {
    throw new Error('Slot conflict detected');
  }
  
  // Create reservation
  const reservation = new this({
    start,
    end,
    resourceId,
    userId,
    status: 'pending',
    metadata
  });
  
  return await reservation.save();
};

// Instance method to confirm reservation
slotReservationSchema.methods.confirm = async function(appointmentId) {
  this.status = 'confirmed';
  this.appointmentId = appointmentId;
  return await this.save();
};

// Instance method to cancel reservation
slotReservationSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  return await this.save();
};

// Instance method to check if expired
slotReservationSchema.methods.isExpired = function() {
  const now = new Date();
  const createdAt = this.createdAt || new Date();
  const expirationTime = new Date(createdAt.getTime() + this.ttl);
  return now > expirationTime;
};

module.exports = mongoose.model('SlotReservation', slotReservationSchema);


