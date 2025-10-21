const mongoose = require('mongoose');

const StaffProfileSchema = new mongoose.Schema({
  // Verknüpfung zum Benutzer
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  
  // Anzeigename
  displayName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  
  // Rollenhinweis
  roleHint: { 
    type: String, 
    enum: ['arzt', 'assistenz', 'therapeut', 'admin', 'staff', 'nurse', 'receptionist', 'assistant', 'doctor'], 
    required: true 
  },
  
  // Farbe für Kalender/UI
  colorHex: { 
    type: String, 
    default: '#6B7280',
    match: /^#[0-9A-F]{6}$/i
  },
  
  // Online-Buchungen akzeptieren
  acceptsOnline: { 
    type: Boolean, 
    default: true 
  },
  
  // Spezialisierungen
  specializations: [{
    type: String,
    trim: true
  }],
  
  // Titel/Grade
  title: { 
    type: String, 
    trim: true 
  },
  
  // Kontaktdaten
  contact: {
    phone: { type: String, trim: true },
    mobile: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true }
  },
  
  // Arbeitszeiten-Einstellungen
  workSettings: {
    defaultDuration: { type: Number, default: 30 }, // Standard-Termindauer in Minuten
    bufferBefore: { type: Number, default: 5 }, // Puffer vor Termin
    bufferAfter: { type: Number, default: 5 }, // Puffer nach Termin
    maxConcurrentAppointments: { type: Number, default: 1 }, // Max. gleichzeitige Termine
    workingDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    workingHours: {
      start: { type: String, default: '08:00' }, // HH:MM Format
      end: { type: String, default: '17:00' }    // HH:MM Format
    }
  },
  
  // Berechtigungen für diese Rolle
  permissions: [{
    type: String,
    enum: [
      'patients.read', 'patients.write', 'patients.delete',
      'appointments.read', 'appointments.write', 'appointments.delete',
      'billing.read', 'billing.write', 'billing.delete',
      'reports.read', 'reports.write',
      'users.read', 'users.write', 'users.delete',
      'resources.read', 'resources.write', 'resources.delete',
      'security.read', 'security.write',
      'audit.read'
    ]
  }],
  
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
StaffProfileSchema.index({ userId: 1 });
StaffProfileSchema.index({ roleHint: 1 });
StaffProfileSchema.index({ isActive: 1 });

// Pre-save middleware
StaffProfileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual für vollständigen Namen
StaffProfileSchema.virtual('fullName').get(function() {
  return this.title ? `${this.title} ${this.displayName}` : this.displayName;
});

// Methoden
StaffProfileSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

StaffProfileSchema.methods.canAccessPatientData = function() {
  return this.roleHint === 'arzt' || this.hasPermission('patients.read');
};

StaffProfileSchema.methods.canWriteData = function() {
  return this.roleHint === 'arzt' || this.roleHint === 'admin' || 
         this.permissions.some(p => p.includes('.write'));
};

module.exports = mongoose.model('StaffProfile', StaffProfileSchema);
