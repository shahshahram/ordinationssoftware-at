const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'doctor', 'nurse', 'receptionist', 'assistant', 'staff'],
    default: 'staff'
  },
  permissions: [{
    type: String,
    enum: [
      'patients.read', 'patients.write', 'patients.delete',
      'appointments.read', 'appointments.write', 'appointments.delete',
      'billing.read', 'billing.write', 'billing.delete',
      'documents.read', 'documents.write', 'documents.delete',
      'users.read', 'users.write', 'users.delete',
      'settings.read', 'settings.write',
      'reports.read', 'reports.write',
      'security.read', 'security.write',
      'resources.read', 'resources.write', 'resources.delete',
      'service-catalog.read', 'service-catalog.write', 'service-catalog.delete',
      'services.read', 'services.write', 'services.delete',
      'bookings.read', 'bookings.write', 'bookings.delete',
      'service-categories.read', 'service-categories.write', 'service-categories.delete',
      'appointment-participants.read', 'appointment-participants.write', 'appointment-participants.delete',
      'appointment-services.read', 'appointment-services.write', 'appointment-services.delete',
      'appointment-resources.read', 'appointment-resources.write', 'appointment-resources.delete',
      'staff.read', 'staff.write', 'staff.delete', 'staff.toggle_status',
      'shifts.read', 'shifts.write', 'shifts.delete', 'shifts.toggle_status',
      'absences.read', 'absences.create', 'absences.update', 'absences.delete', 'absences.approve',
      'availability.read', 'availability.check', 'availability.utilization', 'availability.staff',
      'clinic-hours.read', 'clinic-hours.write', 'clinic-hours.delete',
      'rooms.read', 'rooms.write', 'rooms.delete',
      'devices.read', 'devices.write', 'devices.delete',
      'locations.read', 'locations.write', 'locations.delete',
      'staff-location-assignments.read', 'staff-location-assignments.write', 'staff-location-assignments.delete'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  // UI-Farben für Kalender
  color_hex: {
    type: String,
    default: '#10B981',
    match: /^#[0-9A-F]{6}$/i,
    trim: true
  },
  lastLogin: {
    type: Date
  },
  profile: {
    title: { type: String, trim: true },
    specialization: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true, default: 'Austria' }
    },
    preferences: {
      language: { type: String, default: 'de' },
      timezone: { type: String, default: 'Europe/Vienna' },
      dateFormat: { type: String, default: 'DD.MM.YYYY' },
      timeFormat: { type: String, default: '24h' }
    },
    onlineBookingEnabled: { type: Boolean, default: false },
    onlineBookingSettings: {
      advanceBookingDays: { type: Number, default: 30 },
      maxAdvanceBookingDays: { type: Number, default: 90 },
      minAdvanceBookingHours: { type: Number, default: 2 },
      maxConcurrentBookings: { type: Number, default: 1 },
      duration: { type: Number, default: 30 },
      price: { type: Number, default: 0 },
      requiresApproval: { type: Boolean, default: false },
      workingHours: [{
        day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
        startTime: { type: String },
        endTime: { type: String },
        isWorking: { type: Boolean, default: true }
      }],
      blockedDates: [{ type: Date }],
      breakTimes: [{
        startTime: { type: String },
        endTime: { type: String }
      }]
    }
  },
  // 2FA Security
  twoFactorAuth: {
    enabled: { type: Boolean, default: false },
    secret: { type: String, trim: true },
    backupCodes: [{ type: String, trim: true }],
    lastUsed: { type: Date }
  },
  // Login Security
  loginSecurity: {
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    lastLogin: { type: Date },
    lastLoginIP: { type: String },
    sessionTimeout: { type: Number, default: 8 * 60 * 60 * 1000 }, // 8 hours
    allowedIPs: [{ type: String }],
    requirePasswordChange: { type: Boolean, default: false },
    passwordChangedAt: { type: Date }
  }
}, {
  timestamps: true
});

// Indexes are defined in the schema above with index: true

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
UserSchema.methods.isLocked = function() {
  return !!(this.loginSecurity.lockedUntil && this.loginSecurity.lockedUntil > Date.now());
};

// Method to get user's full name
UserSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Method to check if user has permission
UserSchema.methods.hasPermission = function(permission) {
  return this.permissions && this.permissions.includes(permission);
};

// Method to check if user has any of the required permissions
UserSchema.methods.hasAnyPermission = function(permissions) {
  if (!this.permissions || !Array.isArray(permissions)) return false;
  return permissions.some(permission => this.permissions.includes(permission));
};

// Method to check if user has all required permissions
UserSchema.methods.hasAllPermissions = function(permissions) {
  if (!this.permissions || !Array.isArray(permissions)) return false;
  return permissions.every(permission => this.permissions.includes(permission));
};

module.exports = mongoose.model('User', UserSchema);
