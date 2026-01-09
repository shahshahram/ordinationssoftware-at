const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  // Standort-Zugehörigkeit
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  
  // Gerätename
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Gerätetyp
  type: {
    type: String,
    required: true,
    enum: ['EKG', 'Ultraschall', 'Röntgen', 'Blutdruckmessgerät', 'Stethoskop', 'Computer', 'Printer', 'Scanner', 'other'],
    trim: true
  },
  
  // Kategorie
  category: {
    type: String,
    enum: ['medical', 'diagnostic', 'therapeutic', 'administrative', 'other'],
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
    default: '#6B7280',
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
  
  // Verfügbarkeit
  availability: {
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
  
  // Wartung
  maintenance: {
    lastMaintenance: { type: Date },
    nextMaintenance: { type: Date },
    maintenanceInterval: { type: Number, default: 30 }, // Tage
    notes: { type: String, trim: true }
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
DeviceSchema.index({ location_id: 1 });
DeviceSchema.index({ name: 1 });
DeviceSchema.index({ type: 1 });
DeviceSchema.index({ isBookable: 1 });
DeviceSchema.index({ isOnlineBookable: 1 });
DeviceSchema.index({ isActive: 1 });
DeviceSchema.index({ location_id: 1, isActive: 1 });

// Pre-save middleware
DeviceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Methoden
DeviceSchema.methods.isAvailableOnDate = function(date) {
  const dayOfWeek = date.getDay();
  return this.availability.weekdays.includes(dayOfWeek);
};

DeviceSchema.methods.isAvailableAtTime = function(timeString) {
  const time = timeString.split(':').map(Number);
  const timeMinutes = time[0] * 60 + time[1];
  
  const start = this.availability.startTime.split(':').map(Number);
  const end = this.availability.endTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  
  // Prüfen ob Zeit in Pause liegt
  for (const breakTime of this.availability.breaks) {
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

DeviceSchema.methods.needsMaintenance = function() {
  if (!this.maintenance.nextMaintenance) {
    return false;
  }
  return new Date() >= this.maintenance.nextMaintenance;
};

// Statische Methoden
DeviceSchema.statics.getBookableDevices = function() {
  return this.find({
    isActive: true,
    isBookable: true
  }).sort({ name: 1 });
};

DeviceSchema.statics.getOnlineBookableDevices = function() {
  return this.find({
    isActive: true,
    isBookable: true,
    isOnlineBookable: true
  }).sort({ name: 1 });
};

DeviceSchema.statics.getDevicesByType = function(type) {
  return this.find({
    isActive: true,
    type: type
  }).sort({ name: 1 });
};

DeviceSchema.statics.getDevicesNeedingMaintenance = function() {
  return this.find({
    isActive: true,
    'maintenance.nextMaintenance': { $lte: new Date() }
  }).sort({ 'maintenance.nextMaintenance': 1 });
};

module.exports = mongoose.model('Device', DeviceSchema);
