const mongoose = require('mongoose');

const SlotReservationSchema = new mongoose.Schema({
  resourceId: {
    type: String,
    required: true,
    index: true
  },
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
    index: true
  },
  reservedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expireAfterSeconds: 30 } // TTL for pending reservations
  }
});

// Index for efficient conflict checking
SlotReservationSchema.index({ resourceId: 1, startTime: 1, endTime: 1, status: 1 });

// Static method to reserve a slot
SlotReservationSchema.statics.reserveSlot = async function(reservationData) {
  try {
    // Check for conflicts first
    const conflicts = await this.findConflicts(
      reservationData.resourceId,
      reservationData.startTime,
      reservationData.endTime
    );

    if (conflicts.length > 0) {
      throw new Error('Time slot conflict detected');
    }

    // Create reservation
    const reservation = new this(reservationData);
    await reservation.save();
    return reservation;
  } catch (error) {
    throw error;
  }
};

// Static method to find conflicts
SlotReservationSchema.statics.findConflicts = async function(resourceId, startTime, endTime) {
  return await this.find({
    resourceId,
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  });
};

// Static method to confirm reservation
SlotReservationSchema.statics.confirm = async function(reservationId, appointmentId) {
  return await this.findByIdAndUpdate(
    reservationId,
    { 
      status: 'confirmed',
      appointmentId: appointmentId
    },
    { new: true }
  );
};

// Static method to cancel reservation
SlotReservationSchema.statics.cancel = async function(reservationId) {
  return await this.findByIdAndUpdate(
    reservationId,
    { status: 'cancelled' },
    { new: true }
  );
};

module.exports = mongoose.model('SlotReservation', SlotReservationSchema);


