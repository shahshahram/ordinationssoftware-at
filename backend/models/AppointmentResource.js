const mongoose = require('mongoose');

const AppointmentResourceSchema = new mongoose.Schema({
  // Termin
  appointmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment', 
    required: true 
  },
  
  // Ressource
  resourceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Resource', 
    required: true 
  },
  
  // Status der Ressourcennutzung
  status: { 
    type: String, 
    enum: ['reserved', 'in_use', 'available', 'cancelled'], 
    default: 'reserved' 
  },
  
  // Notizen zur Ressourcennutzung
  notes: { 
    type: String, 
    trim: true 
  },
  
  // Verantwortlich für die Ressource
  responsibleStaff: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'StaffProfile' 
  },
  
  // Reservierungsdatum
  reservedAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Freigabedatum
  releasedAt: { 
    type: Date 
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

// Compound Index für eindeutige Kombination
AppointmentResourceSchema.index({ appointmentId: 1, resourceId: 1 }, { unique: true });
AppointmentResourceSchema.index({ appointmentId: 1 });
AppointmentResourceSchema.index({ resourceId: 1 });
AppointmentResourceSchema.index({ status: 1 });

// Pre-save middleware
AppointmentResourceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Freigabedatum setzen
  if (this.status === 'available' && !this.releasedAt) {
    this.releasedAt = new Date();
  }
  
  next();
});

// Methoden
AppointmentResourceSchema.methods.isReserved = function() {
  return this.status === 'reserved' || this.status === 'in_use';
};

AppointmentResourceSchema.methods.isInUse = function() {
  return this.status === 'in_use';
};

AppointmentResourceSchema.methods.canBeReleased = function() {
  return this.status === 'reserved' || this.status === 'in_use';
};

// Statische Methoden
AppointmentResourceSchema.statics.getResourcesForAppointment = function(appointmentId) {
  return this.find({ appointmentId })
    .populate('resourceId', 'name type category description')
    .populate('responsibleStaff', 'displayName roleHint')
    .sort({ createdAt: 1 });
};

AppointmentResourceSchema.statics.getAppointmentsForResource = function(resourceId, startDate, endDate) {
  return this.find({ resourceId })
    .populate({
      path: 'appointmentId',
      match: {
        startsAt: { $gte: startDate },
        endsAt: { $lte: endDate }
      }
    })
    .populate('resourceId', 'name type category')
    .sort({ reservedAt: 1 });
};

AppointmentResourceSchema.statics.checkResourceAvailability = function(resourceId, startTime, endTime, excludeAppointmentId = null) {
  const query = {
    resourceId,
    status: { $in: ['reserved', 'in_use'] }
  };
  
  if (excludeAppointmentId) {
    query.appointmentId = { $ne: excludeAppointmentId };
  }
  
  return this.find(query)
    .populate({
      path: 'appointmentId',
      match: {
        $or: [
          {
            startsAt: { $lt: endTime },
            endsAt: { $gt: startTime }
          }
        ]
      }
    });
};

AppointmentResourceSchema.statics.getResourceUtilization = function(resourceId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        resourceId: mongoose.Types.ObjectId(resourceId),
        reservedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalHours: {
          $sum: {
            $divide: [
              { $subtract: ['$releasedAt', '$reservedAt'] },
              1000 * 60 * 60
            ]
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('AppointmentResource', AppointmentResourceSchema);
