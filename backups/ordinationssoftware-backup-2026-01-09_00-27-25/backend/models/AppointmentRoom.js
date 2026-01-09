const mongoose = require('mongoose');

const AppointmentRoomSchema = new mongoose.Schema({
  // Termin-Referenz
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  
  // Raum-Referenz
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  
  // Zeitfenster für diesen Raum
  startsAt: {
    type: Date,
    required: true
  },
  
  endsAt: {
    type: Date,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['confirmed', 'pending', 'cancelled'],
    default: 'confirmed'
  },
  
  // Notizen
  notes: {
    type: String,
    trim: true
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
AppointmentRoomSchema.index({ appointmentId: 1, roomId: 1 }, { unique: true });
AppointmentRoomSchema.index({ appointmentId: 1 });
AppointmentRoomSchema.index({ roomId: 1 });
AppointmentRoomSchema.index({ startsAt: 1, endsAt: 1 });
AppointmentRoomSchema.index({ status: 1 });

// Pre-save middleware
AppointmentRoomSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Validierung: Endzeit muss nach Startzeit liegen
  if (this.endsAt <= this.startsAt) {
    return next(new Error('Endzeit muss nach Startzeit liegen'));
  }
  
  next();
});

// Methoden
AppointmentRoomSchema.methods.isConfirmed = function() {
  return this.status === 'confirmed';
};

AppointmentRoomSchema.methods.canBeCancelled = function() {
  return this.status === 'confirmed' || this.status === 'pending';
};

// Statische Methoden
AppointmentRoomSchema.statics.getRoomsForAppointment = function(appointmentId) {
  return this.find({ appointmentId })
    .populate('roomId', 'name type colorHex capacity')
    .sort({ startsAt: 1 });
};

AppointmentRoomSchema.statics.getAppointmentsForRoom = function(roomId, startDate, endDate) {
  return this.find({
    roomId,
    startsAt: { $gte: startDate },
    endsAt: { $lte: endDate },
    status: { $in: ['confirmed', 'pending'] }
  })
    .populate('appointmentId', 'title startTime endTime patient')
    .populate('roomId', 'name type colorHex')
    .sort({ startsAt: 1 });
};

AppointmentRoomSchema.statics.checkRoomAvailability = function(roomId, startTime, endTime, excludeAppointmentId = null) {
  const query = {
    roomId,
    status: { $in: ['confirmed', 'pending'] },
    $or: [
      {
        startsAt: { $lt: endTime },
        endsAt: { $gt: startTime }
      }
    ]
  };
  
  if (excludeAppointmentId) {
    query.appointmentId = { $ne: excludeAppointmentId };
  }
  
  return this.find(query);
};

module.exports = mongoose.model('AppointmentRoom', AppointmentRoomSchema);
