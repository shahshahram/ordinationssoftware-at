const mongoose = require('mongoose');

const ServiceBookingSchema = new mongoose.Schema({
  // Grunddaten
  service_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCatalog',
    required: true,
    index: true
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true
  },
  
  // Terminzeiten
  start_time: {
    type: Date,
    required: true,
    index: true
  },
  end_time: {
    type: Date,
    required: true,
    index: true
  },
  
  // Durchführende Person
  assigned_staff_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StaffProfile',
    required: true,
    index: true
  },
  
  // Ressourcen
  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  device_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device'
  },
  
  // Status
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled',
    index: true
  },
  
  // Buchungsart
  booking_type: {
    type: String,
    enum: ['online', 'internal', 'phone', 'walk_in'],
    required: true,
    index: true
  },
  
  // Notizen und Anmerkungen
  notes: {
    type: String,
    trim: true
  },
  internal_notes: {
    type: String,
    trim: true
  },
  
  // Einwilligung
  consent_given: {
    type: Boolean,
    default: false
  },
  consent_date: {
    type: Date
  },
  
  // Abrechnung
  billing_status: {
    type: String,
    enum: ['pending', 'billed', 'paid', 'cancelled'],
    default: 'pending',
    index: true
  },
  billing_amount_cents: {
    type: Number,
    min: 0
  },
  billing_code: {
    type: String,
    trim: true
  },
  
  // Stornierung
  cancelled_at: {
    type: Date
  },
  cancellation_reason: {
    type: String,
    trim: true
  },
  cancelled_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Wiederholung
  is_recurring: {
    type: Boolean,
    default: false
  },
  recurring_pattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly']
  },
  recurring_end_date: {
    type: Date
  },
  parent_booking_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceBooking'
  },
  
  // Audit-Felder
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indizes für Performance
ServiceBookingSchema.index({ start_time: 1, end_time: 1 });
ServiceBookingSchema.index({ location_id: 1, start_time: 1 });
ServiceBookingSchema.index({ assigned_staff_id: 1, start_time: 1 });
ServiceBookingSchema.index({ patient_id: 1, start_time: 1 });
ServiceBookingSchema.index({ status: 1, start_time: 1 });
ServiceBookingSchema.index({ booking_type: 1, start_time: 1 });

// Compound Index für Kollisionserkennung
ServiceBookingSchema.index({ 
  location_id: 1, 
  start_time: 1, 
  end_time: 1, 
  status: 1 
});

// Virtual für Dauer in Minuten
ServiceBookingSchema.virtual('duration_minutes').get(function() {
  return Math.round((this.end_time - this.start_time) / (1000 * 60));
});

// Virtual für Status-Text
ServiceBookingSchema.virtual('status_text').get(function() {
  const statusMap = {
    'scheduled': 'Geplant',
    'confirmed': 'Bestätigt',
    'in_progress': 'In Bearbeitung',
    'completed': 'Abgeschlossen',
    'cancelled': 'Storniert',
    'no_show': 'Nicht erschienen'
  };
  return statusMap[this.status] || this.status;
});

// Methoden
ServiceBookingSchema.methods.isOverlapping = function(startTime, endTime) {
  return this.start_time < endTime && this.end_time > startTime;
};

ServiceBookingSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const timeDiff = this.start_time - now;
  const hoursUntilStart = timeDiff / (1000 * 60 * 60);
  
  // Kann storniert werden wenn mehr als 2 Stunden vor Start
  return hoursUntilStart > 2;
};

ServiceBookingSchema.methods.isUpcoming = function() {
  return this.start_time > new Date() && this.status === 'scheduled';
};

ServiceBookingSchema.methods.isPast = function() {
  return this.end_time < new Date();
};

// Pre-Save Hook für Validierung
ServiceBookingSchema.pre('save', function(next) {
  // Endzeit muss nach Startzeit liegen
  if (this.end_time <= this.start_time) {
    return next(new Error('Endzeit muss nach Startzeit liegen'));
  }
  
  // Einwilligung erforderlich wenn Service es verlangt
  if (this.consent_given && !this.consent_date) {
    this.consent_date = new Date();
  }
  
  next();
});

module.exports = mongoose.model('ServiceBooking', ServiceBookingSchema);
