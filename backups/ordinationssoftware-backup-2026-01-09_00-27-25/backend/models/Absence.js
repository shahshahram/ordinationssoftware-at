const mongoose = require('mongoose');

const AbsenceSchema = new mongoose.Schema({
  // Personalprofil
  staffId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'StaffProfile', 
    required: true 
  },
  
  // Startdatum
  startsAt: { 
    type: Date, 
    required: true 
  },
  
  // Enddatum
  endsAt: { 
    type: Date, 
    required: true 
  },
  
  // Grund
  reason: { 
    type: String, 
    enum: ['vacation', 'sick', 'personal', 'training', 'conference', 'other'], 
    required: true 
  },
  
  // Beschreibung
  description: { 
    type: String, 
    trim: true 
  },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'cancelled'], 
    default: 'pending' 
  },
  
  // Genehmigt von
  approvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Genehmigungsdatum
  approvedAt: { 
    type: Date 
  },
  
  // Genehmigungskommentar
  approvalComment: { 
    type: String, 
    trim: true 
  },
  
  // Vollständiger Tag oder nur bestimmte Zeiten
  isFullDay: { 
    type: Boolean, 
    default: true 
  },
  
  // Spezifische Zeiten (wenn nicht ganztägig)
  timeSlots: [{
    start: { type: String }, // HH:MM Format
    end: { type: String }    // HH:MM Format
  }],
  
  // Wiederholung
  isRecurring: { 
    type: Boolean, 
    default: false 
  },
  
  // Wiederholungsregel
  recurrenceRule: { 
    type: String, 
    trim: true 
  },
  
  // Urlaubstyp (für Urlaub)
  vacationType: { 
    type: String, 
    enum: ['annual', 'sick_leave', 'personal_leave', 'maternity', 'paternity', 'unpaid'], 
    default: 'annual' 
  },
  
  // Dringlichkeit
  urgency: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  
  // Vertretung
  replacement: {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffProfile' },
    notes: { type: String, trim: true }
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
AbsenceSchema.index({ staffId: 1, startsAt: 1 });
AbsenceSchema.index({ startsAt: 1, endsAt: 1 });
AbsenceSchema.index({ status: 1 });
AbsenceSchema.index({ reason: 1 });

// Pre-save middleware
AbsenceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Validierung: Enddatum muss nach Startdatum liegen
  if (this.endsAt <= this.startsAt) {
    return next(new Error('Enddatum muss nach Startdatum liegen'));
  }
  
  // Genehmigungsdatum setzen
  if (this.status === 'approved' && !this.approvedAt) {
    this.approvedAt = new Date();
  }
  
  next();
});

// Methoden
AbsenceSchema.methods.getDurationInDays = function() {
  const diffTime = Math.abs(this.endsAt - this.startsAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

AbsenceSchema.methods.isActiveOnDate = function(date) {
  return date >= this.startsAt && date <= this.endsAt;
};

AbsenceSchema.methods.isApproved = function() {
  return this.status === 'approved';
};

AbsenceSchema.methods.canBeCancelled = function() {
  return this.status === 'pending' || this.status === 'approved';
};

// Statische Methoden
AbsenceSchema.statics.getAbsencesForDateRange = function(staffId, startDate, endDate) {
  return this.find({
    staffId,
    startsAt: { $lte: endDate },
    endsAt: { $gte: startDate },
    status: 'approved'
  }).populate('staffId', 'displayName roleHint');
};

AbsenceSchema.statics.getPendingApprovals = function() {
  return this.find({ status: 'pending' })
    .populate('staffId', 'displayName roleHint')
    .populate('approvedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

AbsenceSchema.statics.getAbsenceStatistics = function(staffId, year) {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);
  
  return this.aggregate([
    {
      $match: {
        staffId: mongoose.Types.ObjectId(staffId),
        startsAt: { $gte: startOfYear },
        endsAt: { $lte: endOfYear },
        status: 'approved'
      }
    },
    {
      $group: {
        _id: '$reason',
        totalDays: { $sum: { $divide: [{ $subtract: ['$endsAt', '$startsAt'] }, 1000 * 60 * 60 * 24] } },
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Absence', AbsenceSchema);
