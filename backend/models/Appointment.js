const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  // Grunddaten
  patient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PatientExtended', 
    required: true 
  },
  
  // Terminzeiten
  startTime: { 
    type: Date, 
    required: true 
  },
  endTime: { 
    type: Date, 
    required: true 
  },
  duration: { 
    type: Number, 
    required: false, // Wird automatisch berechnet
    min: 5 // Mindestdauer 5 Minuten
  },

  // Arzt und Ressourcen
  doctor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  room: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room' 
  },
  devices: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Device' 
  }],
  
  // Service und zugewiesene Benutzer
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCatalog'
  },
  assigned_users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  assigned_devices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device'
  }],
  assigned_rooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  }],
  
  // Buchungsart
  bookingType: {
    type: String,
    enum: ['online', 'internal', 'phone', 'walk_in'],
    default: 'internal'
  },
  
  // Online-Buchung Referenz
  onlineBookingRef: {
    type: String,
    trim: true
  },

  // Terminart und Status
  type: { 
    type: String, 
    required: true,
    trim: true
  },
  serviceCode: {
    type: String,
    ref: 'ServiceCatalog',
    trim: true
  },
  status: { 
    type: String, 
    enum: [
      'geplant', 
      'bestätigt', 
      'wartend', 
      'in_behandlung', 
      'abgeschlossen', 
      'abgesagt', 
      'verschoben'
    ], 
    default: 'geplant' 
  },

  // Termininhalt
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    trim: true 
  },
  notes: { 
    type: String, 
    trim: true 
  },
  diagnosis: { 
    type: String, 
    trim: true 
  },
  icd10Code: { 
    type: String, 
    trim: true 
  },

  // Wiederholungstermine
  isRecurring: { 
    type: Boolean, 
    default: false 
  },
  recurrencePattern: {
    frequency: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly', 'yearly'] 
    },
    interval: { 
      type: Number, 
      default: 1 
    },
    daysOfWeek: [{ 
      type: Number, 
      min: 0, 
      max: 6 
    }], // 0 = Sonntag, 1 = Montag, etc.
    endDate: { 
      type: Date 
    },
    occurrences: { 
      type: Number 
    }
  },
  parentAppointment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment' 
  },

  // Online-Terminbuchung
  isOnlineBooking: { 
    type: Boolean, 
    default: false 
  },
  bookingReference: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  bookingSource: { 
    type: String, 
    enum: ['website', 'app', 'phone', 'in_person'] 
  },

  // Erinnerungen
  reminders: [{
    type: { 
      type: String, 
      enum: ['email', 'sms', 'push'], 
      required: true 
    },
    scheduledTime: { 
      type: Date, 
      required: true 
    },
    sent: { 
      type: Boolean, 
      default: false 
    },
    sentAt: { 
      type: Date 
    }
  }],

  // Wartezimmer
  waitingRoom: {
    checkInTime: { 
      type: Date 
    },
    waitingTime: { 
      type: Number 
    }, // in Minuten
    priority: { 
      type: String, 
      enum: ['normal', 'high', 'urgent'], 
      default: 'normal' 
    }
  },

  // Abrechnung
  billing: {
    isBillable: { 
      type: Boolean, 
      default: true 
    },
    billingCode: { 
      type: String, 
      trim: true 
    },
    price: { 
      type: Number, 
      min: 0 
    },
    insuranceCovered: { 
      type: Boolean, 
      default: false 
    },
    copayment: { 
      type: Number, 
      min: 0 
    }
  },

  // Dokumentation
  documents: [{
    type: { 
      type: String, 
      enum: ['befund', 'rezept', 'überweisung', 'arztbrief', 'sonstiges'] 
    },
    title: { 
      type: String, 
      required: true 
    },
    content: { 
      type: String 
    },
    filePath: { 
      type: String 
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    }
  }],

  // Audit Trail
  auditTrail: [{
    action: { 
      type: String, 
      required: true 
    },
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    timestamp: { 
      type: Date, 
      default: Date.now 
    },
    changes: { 
      type: Object 
    },
    reason: { 
      type: String 
    }
  }],

  // Metadaten
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false // Wird automatisch gesetzt
  },
  lastModifiedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual für Terminlänge in Minuten
AppointmentSchema.virtual('durationMinutes').get(function() {
  return Math.round((this.endTime - this.startTime) / (1000 * 60));
});

// Virtual für Status in deutscher Sprache
AppointmentSchema.virtual('statusGerman').get(function() {
  const statusMap = {
    'geplant': 'Geplant',
    'bestätigt': 'Bestätigt',
    'wartend': 'Wartend',
    'in_behandlung': 'In Behandlung',
    'abgeschlossen': 'Abgeschlossen',
    'abgesagt': 'Abgesagt',
    'verschoben': 'Verschoben'
  };
  return statusMap[this.status] || this.status;
});

// Indexes are defined in the schema above with index: true

// Pre-save middleware für Validierung
AppointmentSchema.pre('save', function(next) {
  // Endzeit muss nach Startzeit liegen
  if (this.endTime <= this.startTime) {
    return next(new Error('Endzeit muss nach Startzeit liegen'));
  }
  
  // Dauer berechnen
  this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60));
  
  next();
});

// Methoden
AppointmentSchema.methods.addAuditEntry = function(action, user, changes, reason) {
  this.auditTrail.push({
    action,
    user,
    changes,
    reason,
    timestamp: new Date()
  });
};

AppointmentSchema.methods.isConflicting = async function() {
  const conflictingAppointments = await this.constructor.find({
    _id: { $ne: this._id },
    doctor: this.doctor,
    status: { $in: ['geplant', 'bestätigt', 'wartend', 'in_behandlung'] },
    $or: [
      {
        startTime: { $lt: this.endTime },
        endTime: { $gt: this.startTime }
      }
    ]
  });
  
  return conflictingAppointments.length > 0;
};

AppointmentSchema.methods.generateBookingReference = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

module.exports = mongoose.model('Appointment', AppointmentSchema);
