const mongoose = require('mongoose');

const OnlineBookingSchema = new mongoose.Schema({
  // Grunddaten
  bookingNumber: { type: String, required: true, unique: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
    default: 'pending' 
  },
  
  // Patient (kann anonym sein)
  patient: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' }, // Optional, falls Patient bereits existiert
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    insuranceNumber: { type: String },
    isNewPatient: { type: Boolean, default: true }
  },
  
  // Termin-Details
  appointment: {
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // HH:MM Format
    endTime: { type: String, required: true },   // HH:MM Format
    duration: { type: Number, required: true },  // Minuten
    type: { type: String, required: true },     // Art der Behandlung
    reason: { type: String, required: true },   // Grund des Termins
    notes: { type: String }
  },
  
  // Arzt/Ordination
  doctor: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    specialization: { type: String }
  },
  
  // Ressourcen
  resources: {
    room: { type: String },
    equipment: [{ type: String }]
  },
  
  // Verfügbarkeitsregeln
  availabilityRules: {
    advanceBookingDays: { type: Number, default: 30 },
    maxAdvanceBookingDays: { type: Number, default: 90 },
    minAdvanceBookingHours: { type: Number, default: 24 },
    workingHours: {
      monday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      tuesday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      wednesday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      thursday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      friday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      saturday: { start: String, end: String, isWorking: { type: Boolean, default: false } },
      sunday: { start: String, end: String, isWorking: { type: Boolean, default: false } }
    },
    breakTimes: [{
      start: String,
      end: String,
      days: [{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }]
    }],
    blockedDates: [{ type: Date }]
  },
  
  // Bestätigung und Erinnerungen
  confirmation: {
    emailSent: { type: Boolean, default: false },
    smsSent: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    confirmationCode: { type: String },
    confirmationDate: { type: Date }
  },
  
  // Warteliste
  waitingList: {
    isOnWaitingList: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    preferredDates: [{ type: Date }],
    notificationSent: { type: Boolean, default: false }
  },
  
  // Metadaten
  source: { type: String, default: 'online' }, // online, phone, walk-in
  ipAddress: { type: String },
  userAgent: { type: String },
  
  // Audit Trail
  auditTrail: [{
    action: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    details: { type: String },
    ipAddress: { type: String }
  }],
  
  // Metadaten
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual für Buchungsnummer generieren
OnlineBookingSchema.pre('save', async function(next) {
  if (this.isNew && !this.bookingNumber) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    this.bookingNumber = `B-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Virtual für vollständigen Namen
OnlineBookingSchema.virtual('patientFullName').get(function() {
  return `${this.patient.firstName} ${this.patient.lastName}`;
});

// Virtual für Termin-Datum und Zeit
OnlineBookingSchema.virtual('appointmentDateTime').get(function() {
  const date = new Date(this.appointment.date);
  return {
    date: date.toISOString().split('T')[0],
    time: this.appointment.startTime,
    datetime: new Date(`${date.toISOString().split('T')[0]}T${this.appointment.startTime}`)
  };
});

// Indexes are defined in the schema above with index: true
OnlineBookingSchema.index({ createdAt: -1 });

// Methoden
OnlineBookingSchema.methods.addAuditEntry = function(action, details, ipAddress) {
  this.auditTrail.push({
    action,
    details,
    ipAddress,
    timestamp: new Date()
  });
};

OnlineBookingSchema.methods.isWithinWorkingHours = function(date, time) {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const workingDay = this.availabilityRules.workingHours[dayOfWeek];
  
  if (!workingDay.isWorking) return false;
  
  const appointmentTime = new Date(`${date.toISOString().split('T')[0]}T${time}`);
  const startTime = new Date(`${date.toISOString().split('T')[0]}T${workingDay.start}`);
  const endTime = new Date(`${date.toISOString().split('T')[0]}T${workingDay.end}`);
  
  return appointmentTime >= startTime && appointmentTime <= endTime;
};

OnlineBookingSchema.methods.isAvailable = function(date, time) {
  // Prüfe Arbeitszeiten
  if (!this.isWithinWorkingHours(date, time)) return false;
  
  // Prüfe blockierte Daten
  const dateStr = date.toISOString().split('T')[0];
  if (this.availabilityRules.blockedDates.some(blockedDate => 
    blockedDate.toISOString().split('T')[0] === dateStr)) {
    return false;
  }
  
  // Prüfe Pausenzeiten
  const appointmentTime = new Date(`${date.toISOString().split('T')[0]}T${time}`);
  for (const breakTime of this.availabilityRules.breakTimes) {
    const breakStart = new Date(`${date.toISOString().split('T')[0]}T${breakTime.start}`);
    const breakEnd = new Date(`${date.toISOString().split('T')[0]}T${breakTime.end}`);
    
    if (appointmentTime >= breakStart && appointmentTime <= breakEnd) {
      return false;
    }
  }
  
  return true;
};

module.exports = mongoose.model('OnlineBooking', OnlineBookingSchema);
