const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  // Grunddaten
  name: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    enum: ['room', 'equipment', 'service', 'personnel'],
    required: true 
  },
  category: { type: String, trim: true },
  description: { type: String, trim: true },
  
  // Online-Buchbarkeit
  onlineBooking: {
    enabled: { type: Boolean, default: false },
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
    blockedDates: [{ type: Date }],
    maxConcurrentBookings: { type: Number, default: 1 },
    duration: { type: Number, default: 30 }, // Standard-Dauer in Minuten
    price: { type: Number, default: 0 },
    requiresApproval: { type: Boolean, default: false }
  },
  
  // Spezifische Eigenschaften je nach Typ
  properties: {
    // Für Räume
    capacity: { type: Number },
    location: { type: String },
    floor: { type: String },
    accessibility: { type: Boolean, default: false },
    
    // Für Equipment
    brand: { type: String },
    model: { type: String },
    serialNumber: { type: String },
    maintenanceDate: { type: Date },
    status: { type: String, enum: ['available', 'maintenance', 'out_of_order'], default: 'available' },
    
    // Für Personal
    specialization: { type: String },
    title: { type: String },
    qualifications: [{ type: String }],
    languages: [{ type: String }],
    experience: { type: String },
    
    // Für Services
    serviceCode: { type: String },
    duration: { type: Number },
    price: { type: Number },
    requirements: [{ type: String }]
  },
  
  // Verfügbarkeit
  isActive: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  
  // Berechtigungen
  permissions: {
    roles: [{ type: String }],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  
  // Metadaten
  tags: [{ type: String }],
  notes: { type: String },
  
  // Metadaten
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual für Online-Buchbarkeit-Status
ResourceSchema.virtual('isOnlineBookable').get(function() {
  return this.onlineBooking.enabled && this.isActive && this.isAvailable;
});

// Virtual für vollständigen Namen
ResourceSchema.virtual('fullName').get(function() {
  return `${this.name}${this.properties.title ? ` - ${this.properties.title}` : ''}`;
});

// Index für bessere Performance
ResourceSchema.index({ name: 1 });
ResourceSchema.index({ type: 1 });
ResourceSchema.index({ category: 1 });
ResourceSchema.index({ 'onlineBooking.enabled': 1 });
ResourceSchema.index({ isActive: 1 });
ResourceSchema.index({ isAvailable: 1 });

// Methoden
ResourceSchema.methods.isAvailableForBooking = function(date, time) {
  if (!this.isOnlineBookable) return false;
  
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const workingDay = this.onlineBooking.workingHours[dayOfWeek];
  
  if (!workingDay || !workingDay.isWorking) return false;
  
  const appointmentTime = new Date(`${date.toISOString().split('T')[0]}T${time}`);
  const startTime = new Date(`${date.toISOString().split('T')[0]}T${workingDay.start}`);
  const endTime = new Date(`${date.toISOString().split('T')[0]}T${workingDay.end}`);
  
  return appointmentTime >= startTime && appointmentTime <= endTime;
};

ResourceSchema.methods.getAvailableTimeSlots = function(date, duration = 30) {
  if (!this.isOnlineBookable) return [];
  
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const workingDay = this.onlineBooking.workingHours[dayOfWeek];
  
  if (!workingDay || !workingDay.isWorking) return [];
  
  const slots = [];
  const startTime = new Date(`${date.toISOString().split('T')[0]}T${workingDay.start}`);
  const endTime = new Date(`${date.toISOString().split('T')[0]}T${workingDay.end}`);
  
  let currentTime = new Date(startTime);
  while (currentTime < endTime) {
    const slotStart = currentTime.toTimeString().slice(0, 5);
    const slotEnd = new Date(currentTime.getTime() + duration * 60000).toTimeString().slice(0, 5);
    
    slots.push({
      start: slotStart,
      end: slotEnd,
      duration: duration
    });
    
    currentTime = new Date(currentTime.getTime() + duration * 60000);
  }
  
  return slots;
};

module.exports = mongoose.model('Resource', ResourceSchema);
