const mongoose = require('mongoose');

const AppointmentParticipantSchema = new mongoose.Schema({
  // Termin
  appointmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment', 
    required: true 
  },
  
  // Personalprofil
  staffId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'StaffProfile', 
    required: true 
  },
  
  // Rolle bei diesem Termin
  roleAtAppointment: { 
    type: String, 
    enum: ['primary', 'assistant', 'observer', 'substitute', 'supervisor'], 
    required: true 
  },
  
  // Status der Teilnahme
  status: { 
    type: String, 
    enum: ['confirmed', 'tentative', 'declined', 'cancelled'], 
    default: 'confirmed' 
  },
  
  // Bestätigungsdatum
  confirmedAt: { 
    type: Date 
  },
  
  // Notizen zur Teilnahme
  notes: { 
    type: String, 
    trim: true 
  },
  
  // Erforderlich für den Termin
  isRequired: { 
    type: Boolean, 
    default: true 
  },
  
  // Vertretung für
  substituteFor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'StaffProfile' 
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
AppointmentParticipantSchema.index({ appointmentId: 1, staffId: 1 }, { unique: true });
AppointmentParticipantSchema.index({ appointmentId: 1 });
AppointmentParticipantSchema.index({ staffId: 1 });
AppointmentParticipantSchema.index({ status: 1 });

// Pre-save middleware
AppointmentParticipantSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Bestätigungsdatum setzen
  if (this.status === 'confirmed' && !this.confirmedAt) {
    this.confirmedAt = new Date();
  }
  
  next();
});

// Methoden
AppointmentParticipantSchema.methods.isConfirmed = function() {
  return this.status === 'confirmed';
};

AppointmentParticipantSchema.methods.getIsRequired = function() {
  return this.isRequired;
};

AppointmentParticipantSchema.methods.canBeRemoved = function() {
  return !this.isRequired || this.status === 'cancelled';
};

// Statische Methoden
AppointmentParticipantSchema.statics.getParticipantsForAppointment = function(appointmentId) {
  return this.find({ appointmentId })
    .populate('staffId', 'displayName roleHint colorHex')
    .populate('substituteFor', 'displayName roleHint')
    .sort({ roleAtAppointment: 1, createdAt: 1 });
};

AppointmentParticipantSchema.statics.getAppointmentsForStaff = function(staffId, startDate, endDate) {
  return this.find({ 
    staffId,
    status: { $in: ['confirmed', 'tentative'] }
  })
    .populate({
      path: 'appointmentId',
      match: {
        startsAt: { $gte: startDate },
        endsAt: { $lte: endDate }
      }
    })
    .populate('staffId', 'displayName roleHint');
};

AppointmentParticipantSchema.statics.getRequiredParticipants = function(appointmentId) {
  return this.find({ 
    appointmentId, 
    isRequired: true,
    status: { $in: ['confirmed', 'tentative'] }
  }).populate('staffId', 'displayName roleHint');
};

AppointmentParticipantSchema.statics.checkAvailability = function(staffId, startTime, endTime) {
  return this.find({
    staffId,
    status: { $in: ['confirmed', 'tentative'] }
  })
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

module.exports = mongoose.model('AppointmentParticipant', AppointmentParticipantSchema);
