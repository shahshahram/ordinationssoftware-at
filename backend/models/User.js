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
    enum: ['super_admin', 'admin', 'arzt', 'assistent', 'rezeption', 'billing', 'patient'],
    default: 'assistent'
  },
  permissions: [{
    type: String,
    // Dynamische Permissions - keine Enum-Beschränkung für Auto-Discovery
    validate: {
      validator: function(v) {
        // Erlaube alle Permissions, die dem Format resource.action entsprechen
        return /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(v) || 
               /^[a-zA-Z0-9_-]+$/.test(v); // Oder einfache Permissions
      },
      message: 'Permission muss dem Format "resource.action" entsprechen'
    }
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
  profilePhoto: {
    filename: { type: String, trim: true },
    uploadedAt: { type: Date, default: null }
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
      timeFormat: { type: String, default: '24h' },
      navigationMode: { type: String, enum: ['dropdown', 'sidebar'], default: 'dropdown' }, // Navigation-Modus: Dropdown oder Sidebar
      autoBillingEnabled: { type: Boolean, default: false }, // Systemeinstellung: Automatische Abrechnung
      eldaEnabled: { type: Boolean, default: false },
      eldaMethod: { type: String, enum: ['ftps', 'webservice', 'auto'], default: 'auto' },
      eldaEnvironment: { type: String, enum: ['production', 'test', 'sit'], default: 'test' },
      wahonlineEnabled: { type: Boolean, default: false }, // WAHonline-Übermittlung aktivieren
      // Kalender-Einstellungen
      calendarSettings: {
        useStaffColumns: { type: Boolean, default: false },
        selectedStaffForColumns: [{ type: String }],
        selectedStaff: { type: String, default: 'all' },
        selectedLocation: { type: String, default: 'all' },
        showOpeningHours: { type: Boolean, default: true },
        showWorkingHours: { type: Boolean, default: true },
        showBreaks: { type: Boolean, default: true },
        viewMode: { type: String, enum: ['day', 'week', 'month'], default: 'week' },
        currentDate: { type: Date }
      },
      // Proaktive Benachrichtigungen - Einstellungen
      notificationSettings: {
        enabled: { type: Boolean, default: true }, // Master-Switch: Alle Benachrichtigungen ein/aus
        // Einzelne Benachrichtigungstypen
        upcomingAppointments: { type: Boolean, default: true }, // Anstehende Termine
        missingVitalSigns: { type: Boolean, default: true }, // Fehlende Vitalwerte
        criticalLabResults: { type: Boolean, default: true }, // Kritische Laborwerte
        overdueTasks: { type: Boolean, default: true }, // Überfällige Aufgaben
        medicationReminders: { type: Boolean, default: true }, // Medikamenten-Erinnerungen
        followUpAppointments: { type: Boolean, default: true }, // Nachsorgetermine
        incompletePatientData: { type: Boolean, default: false } // Unvollständige Patientendaten (default: false, da weniger wichtig)
      }
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
  },
  
  // RBAC & ACL Support
  rbac: {
    // Zusätzliche Rollen für spezifische Ressourcen
    resourceRoles: [{
      resource: { type: String, required: true },
      resourceId: { type: mongoose.Schema.Types.ObjectId },
      role: { type: String, required: true },
      grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      grantedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date }
    }],
    
    // Custom Permissions für spezifische Ressourcen
    customPermissions: [{
      resource: { type: String, required: true },
      resourceId: { type: mongoose.Schema.Types.ObjectId },
      actions: [{ type: String, required: true }],
      conditions: {
        timeRestricted: { type: Boolean, default: false },
        timeStart: { type: Date },
        timeEnd: { type: Date },
        locationRestricted: { type: Boolean, default: false },
        allowedLocations: [{ type: mongoose.Schema.Types.ObjectId }],
        ipRestricted: { type: Boolean, default: false },
        allowedIPs: [{ type: String }]
      },
      grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      grantedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date }
    }],
    
    // Delegation: Benutzer kann seine Permissions an andere delegieren
    delegations: [{
      delegateTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      permissions: [{ type: String, required: true }],
      resources: [{ type: String }],
      expiresAt: { type: Date },
      createdAt: { type: Date, default: Date.now }
    }],
    
    // Audit: Wer hat wann welche Permissions geändert
    permissionHistory: [{
      action: { type: String, enum: ['granted', 'revoked', 'modified', 'migrated', 'created', 'auto_granted'], required: true },
      permission: { type: String, required: true },
      resource: { type: String },
      resourceId: { type: mongoose.Schema.Types.ObjectId },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional für System-Aktionen
      changedAt: { type: Date, default: Date.now },
      reason: { type: String },
      previousValue: { type: mongoose.Schema.Types.Mixed }
    }]
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

// Method to check if user has permission (prüft sowohl altes als auch neues System)
UserSchema.methods.hasPermission = function(permission) {
  // Prüfe altes Permission-System
  if (this.permissions && this.permissions.includes(permission)) {
    return true;
  }

  // Prüfe neues RBAC-System (Custom Permissions)
  if (this.rbac && this.rbac.customPermissions) {
    const now = new Date();
    for (const cp of this.rbac.customPermissions) {
      // Prüfe Expiry
      if (cp.expiresAt && new Date(cp.expiresAt) < now) {
        continue; // Permission abgelaufen
      }

      // Prüfe ob Permission-String dem Format "resource.action" entspricht
      if (permission.includes('.')) {
        const [resource, action] = permission.split('.');
        if (cp.resource === resource && cp.actions && cp.actions.includes(action)) {
          return true;
        }
      } else {
        // Einfache Permission ohne Resource
        if (cp.actions && cp.actions.includes(permission)) {
          return true;
        }
      }
    }
  }

  return false;
};

// Method to check if user has any of the required permissions
UserSchema.methods.hasAnyPermission = function(permissions) {
  if (!Array.isArray(permissions)) return false;
  return permissions.some(permission => this.hasPermission(permission));
};

// Method to check if user has all required permissions
UserSchema.methods.hasAllPermissions = function(permissions) {
  if (!Array.isArray(permissions)) return false;
  return permissions.every(permission => this.hasPermission(permission));
};

// Method to check if user can perform action on resource (mit Custom Permissions)
UserSchema.methods.canPerformAction = async function(action, resource, resourceId = null) {
  const { checkRolePermission, checkCustomPermissions, checkLegacyPermissions } = require('../utils/rbac');
  
  // Lade angepasste Rollen-Permissions
  let customRolePermissions = null;
  try {
    const RolePermission = require('./RolePermission');
    const rolePermission = await RolePermission.getRolePermissions(this.role);
    if (rolePermission && rolePermission.permissions) {
      customRolePermissions = rolePermission.permissions;
    }
  } catch (error) {
    // Ignoriere Fehler
  }
  
  // Prüfe Rollen-Permission (inkl. angepasste)
  if (checkRolePermission(this.role, action, resource, customRolePermissions)) {
    return true;
  }

  // Prüfe Custom Permissions
  const resourceObject = resourceId ? { _id: resourceId } : null;
  if (checkCustomPermissions(this, action, resource, resourceObject, {})) {
    return true;
  }

  // Prüfe Legacy Permissions als Fallback
  return checkLegacyPermissions(this, action, resource);
};

// Method to get default permissions based on role
UserSchema.methods.getDefaultPermissions = function() {
  const rolePermissions = {
    super_admin: [
      'patients.read', 'patients.write', 'patients.delete',
      'appointments.read', 'appointments.write', 'appointments.delete',
      'billing.read', 'billing.write', 'billing.delete',
      'documents.read', 'documents.write', 'documents.delete',
      'users.read', 'users.write', 'users.delete',
      'settings.read', 'settings.write',
      'reports.read', 'reports.write',
      'system.read', 'system.write'
    ],
    admin: [
      'patients.read', 'patients.write', 'patients.delete',
      'appointments.read', 'appointments.write', 'appointments.delete',
      'absences.read', 'absences.approve',
      'billing.read', 'billing.write',
      'documents.read', 'documents.write', 'documents.delete',
      'users.read', 'users.write', 'users.delete',
      'settings.read', 'settings.write',
      'reports.read'
    ],
    arzt: [
      'patients.read', 'patients.write',
      'appointments.read', 'appointments.write',
      'absences.read', 'absences.approve',
      'billing.read', 'billing.write',
      'documents.read', 'documents.write',
      'reports.read'
    ],
    assistent: [
      'patients.read', 'patients.write',
      'appointments.read', 'appointments.write',
      'absences.read', 'absences.approve',
      'billing.read',
      'documents.read', 'documents.write'
    ],
    rezeption: [
      'patients.read', 'patients.write',
      'appointments.read', 'appointments.write',
      'absences.read', 'absences.approve',
      'billing.read',
      'documents.read', 'documents.write'
    ],
    billing: [
      'patients.read',
      'appointments.read',
      'absences.self',
      'billing.read', 'billing.write', 'billing.delete',
      'documents.read'
    ],
    patient: [
      'patients.read',
      'appointments.read', 'appointments.write',
      'documents.read',
      'billing.read'
    ]
  };
  
  return rolePermissions[this.role] || [];
};

module.exports = mongoose.model('User', UserSchema);
