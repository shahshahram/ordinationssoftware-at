const mongoose = require('mongoose');

const AppointmentDeviceSchema = new mongoose.Schema({
  // Termin-Referenz
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  
  // Gerät-Referenz
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  
  // Zeitfenster für dieses Gerät
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
AppointmentDeviceSchema.index({ appointmentId: 1, deviceId: 1 }, { unique: true });
AppointmentDeviceSchema.index({ appointmentId: 1 });
AppointmentDeviceSchema.index({ deviceId: 1 });
AppointmentDeviceSchema.index({ startsAt: 1, endsAt: 1 });
AppointmentDeviceSchema.index({ status: 1 });

// Pre-save middleware
AppointmentDeviceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Validierung: Endzeit muss nach Startzeit liegen
  if (this.endsAt <= this.startsAt) {
    return next(new Error('Endzeit muss nach Startzeit liegen'));
  }
  
  next();
});

// Methoden
AppointmentDeviceSchema.methods.isConfirmed = function() {
  return this.status === 'confirmed';
};

AppointmentDeviceSchema.methods.canBeCancelled = function() {
  return this.status === 'confirmed' || this.status === 'pending';
};

// Statische Methoden
AppointmentDeviceSchema.statics.getDevicesForAppointment = function(appointmentId) {
  return this.find({ appointmentId })
    .populate('deviceId', 'name type colorHex category')
    .sort({ startsAt: 1 });
};

AppointmentDeviceSchema.statics.getAppointmentsForDevice = function(deviceId, startDate, endDate) {
  return this.find({
    deviceId,
    startsAt: { $gte: startDate },
    endsAt: { $lte: endDate },
    status: { $in: ['confirmed', 'pending'] }
  })
    .populate('appointmentId', 'title startTime endTime patient')
    .populate('deviceId', 'name type colorHex')
    .sort({ startsAt: 1 });
};

AppointmentDeviceSchema.statics.checkDeviceAvailability = function(deviceId, startTime, endTime, excludeAppointmentId = null) {
  const query = {
    deviceId,
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

module.exports = mongoose.model('AppointmentDevice', AppointmentDeviceSchema);
