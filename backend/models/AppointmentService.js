const mongoose = require('mongoose');

const AppointmentServiceSchema = new mongoose.Schema({
  // Termin
  appointmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment', 
    required: true 
  },
  
  // Leistung
  serviceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ServiceCatalog', 
    required: true 
  },
  
  // Anzahl
  quantity: { 
    type: Number, 
    default: 1, 
    min: 1 
  },
  
  // Status der Leistung
  status: { 
    type: String, 
    enum: ['planned', 'in_progress', 'completed', 'cancelled'], 
    default: 'planned' 
  },
  
  // Notizen zur Leistung
  notes: { 
    type: String, 
    trim: true 
  },
  
  // Durchgeführt von
  performedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'StaffProfile' 
  },
  
  // Durchführungsdatum
  performedAt: { 
    type: Date 
  },
  
  // Dauer (kann von Standard abweichen)
  actualDuration: { 
    type: Number 
  },
  
  // Ergebnisse/Befunde
  results: { 
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

// Compound Index für eindeutige Kombination
AppointmentServiceSchema.index({ appointmentId: 1, serviceId: 1 }, { unique: true });
AppointmentServiceSchema.index({ appointmentId: 1 });
AppointmentServiceSchema.index({ serviceId: 1 });
AppointmentServiceSchema.index({ status: 1 });

// Pre-save middleware
AppointmentServiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Durchführungsdatum setzen
  if (this.status === 'completed' && !this.performedAt) {
    this.performedAt = new Date();
  }
  
  next();
});

// Methoden
AppointmentServiceSchema.methods.isCompleted = function() {
  return this.status === 'completed';
};

AppointmentServiceSchema.methods.isInProgress = function() {
  return this.status === 'in_progress';
};

AppointmentServiceSchema.methods.canBeCancelled = function() {
  return this.status === 'planned' || this.status === 'in_progress';
};

// Statische Methoden
AppointmentServiceSchema.statics.getServicesForAppointment = function(appointmentId) {
  return this.find({ appointmentId })
    .populate('serviceId', 'name code duration prices category')
    .populate('performedBy', 'displayName roleHint')
    .sort({ createdAt: 1 });
};

AppointmentServiceSchema.statics.getAppointmentsForService = function(serviceId, startDate, endDate) {
  return this.find({ serviceId })
    .populate({
      path: 'appointmentId',
      match: {
        startsAt: { $gte: startDate },
        endsAt: { $lte: endDate }
      }
    })
    .populate('serviceId', 'name code duration');
};

AppointmentServiceSchema.statics.getServiceStatistics = function(serviceId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        serviceId: mongoose.Types.ObjectId(serviceId),
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' }
      }
    }
  ]);
};

AppointmentServiceSchema.statics.getCompletedServices = function(staffId, startDate, endDate) {
  return this.find({
    performedBy: staffId,
    status: 'completed',
    performedAt: { $gte: startDate, $lte: endDate }
  })
    .populate('serviceId', 'name code duration prices')
    .populate('appointmentId', 'patientId startsAt endsAt')
    .sort({ performedAt: -1 });
};

module.exports = mongoose.model('AppointmentService', AppointmentServiceSchema);
