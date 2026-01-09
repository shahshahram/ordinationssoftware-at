const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  // Standort-Zugehörigkeit
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  
  // Raumname
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Raumtyp
  type: {
    type: String,
    enum: ['consultation', 'treatment', 'surgery', 'waiting', 'office', 'storage', 'other'],
    default: 'consultation'
  },
  
  // Kategorie
  category: {
    type: String,
    enum: ['medical', 'administrative', 'common', 'specialized'],
    default: 'medical'
  },
  
  // Beschreibung
  description: {
    type: String,
    trim: true
  },
  
  // Farbe für Kalender
  colorHex: {
    type: String,
    default: '#9CA3AF',
    match: /^#[0-9A-F]{6}$/i
  },
  
  // Buchbar
  isBookable: {
    type: Boolean,
    default: true
  },
  
  // Online buchbar
  isOnlineBookable: {
    type: Boolean,
    default: false
  },
  
  // Online-Buchungseinstellungen
  onlineBookingSettings: {
    advanceBookingDays: { type: Number, default: 30 },
    maxAdvanceBookingDays: { type: Number, default: 90 },
    minAdvanceBookingHours: { type: Number, default: 2 },
    requiresApproval: { type: Boolean, default: false },
    price: { type: Number, default: 0 }
  },
  
  // Kapazität
  capacity: {
    type: Number,
    min: 1,
    default: 1
  },
  
  // Ausstattung
  equipment: [{
    name: { type: String, required: true },
    type: { type: String, required: true },
    isRequired: { type: Boolean, default: false }
  }],
  
  // Verfügbarkeitsregeln
  availabilityRules: {
    // Wochentage (0=Sonntag, 6=Samstag)
    weekdays: [{
      type: Number,
      min: 0,
      max: 6
    }],
    
    // Start- und Endzeit
    startTime: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      default: '08:00'
    },
    
    endTime: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      default: '17:00'
    },
    
    // Pausen
    breaks: [{
      start: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      end: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      label: { type: String, trim: true }
    }]
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
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
RoomSchema.index({ location_id: 1 });
RoomSchema.index({ name: 1 });
RoomSchema.index({ type: 1 });
RoomSchema.index({ isBookable: 1 });
RoomSchema.index({ isOnlineBookable: 1 });
RoomSchema.index({ isActive: 1 });
RoomSchema.index({ location_id: 1, isActive: 1 });

// Pre-save middleware
RoomSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Methoden
RoomSchema.methods.isAvailableOnDate = function(date) {
  const dayOfWeek = date.getDay();
  return this.availabilityRules.weekdays.includes(dayOfWeek);
};

RoomSchema.methods.isAvailableAtTime = function(timeString) {
  const time = timeString.split(':').map(Number);
  const timeMinutes = time[0] * 60 + time[1];
  
  const start = this.availabilityRules.startTime.split(':').map(Number);
  const end = this.availabilityRules.endTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  
  // Prüfen ob Zeit in Pause liegt
  for (const breakTime of this.availabilityRules.breaks) {
    const breakStart = breakTime.start.split(':').map(Number);
    const breakEnd = breakTime.end.split(':').map(Number);
    const breakStartMinutes = breakStart[0] * 60 + breakStart[1];
    const breakEndMinutes = breakEnd[0] * 60 + breakEnd[1];
    
    if (timeMinutes >= breakStartMinutes && timeMinutes <= breakEndMinutes) {
      return false;
    }
  }
  
  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
};

RoomSchema.methods.getRequiredEquipment = function() {
  return this.equipment.filter(eq => eq.isRequired);
};

// Statische Methoden
RoomSchema.statics.getBookableRooms = function() {
  return this.find({
    isActive: true,
    isBookable: true
  }).sort({ name: 1 });
};

RoomSchema.statics.getOnlineBookableRooms = function() {
  return this.find({
    isActive: true,
    isBookable: true,
    isOnlineBookable: true
  }).sort({ name: 1 });
};

RoomSchema.statics.getRoomsByType = function(type) {
  return this.find({
    isActive: true,
    type: type
  }).sort({ name: 1 });
};

module.exports = mongoose.model('Room', RoomSchema);
