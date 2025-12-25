const mongoose = require('mongoose');

const PatientMedicationSchema = new mongoose.Schema({
  // Patient-Referenz
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PatientExtended',
    required: true,
    index: true
  },
  
  // Encounter/Termin-Referenz (optional)
  encounterId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment' 
  },
  
  // Medikamenten-Referenz zum Katalog (optional)
  medicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicationCatalog'
  },
  
  // Medikamenten-Informationen
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  atcCode: { 
    type: String, 
    trim: true 
  },
  strength: { 
    type: String, 
    trim: true 
  },
  strengthUnit: { 
    type: String, 
    trim: true 
  },
  form: { 
    type: String, 
    trim: true 
  },
  
  // Verschreibung
  dosage: { 
    type: String, 
    required: true, 
    trim: true 
  },
  frequency: { 
    type: String, 
    required: true, 
    trim: true 
  },
  duration: { 
    type: String, 
    trim: true 
  },
  startDate: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  endDate: { 
    type: Date 
  },
  
  // Quelle
  source: { 
    type: String, 
    enum: ['clinical', 'elga', 'import', 'prescription'], 
    default: 'clinical' 
  },
  prescribedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  prescribedAt: { 
    type: Date 
  },
  
  // Status
  status: { 
    type: String, 
    enum: ['active', 'completed', 'discontinued', 'suspended'], 
    required: true,
    default: 'active'
  },
  discontinuedReason: { 
    type: String, 
    trim: true 
  },
  discontinuedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  discontinuedAt: { 
    type: Date 
  },
  
  // e-Rezept Integration
  prescriptionId: { 
    type: String 
  },
  prescriptionStatus: { 
    type: String, 
    enum: ['draft', 'sent', 'dispensed', 'expired'] 
  },
  prescriptionQRCode: { 
    type: String 
  },
  
  // ELGA Integration
  elgaId: { 
    type: String 
  },
  elgaSynced: { 
    type: Boolean, 
    default: false 
  },
  elgaSyncedAt: { 
    type: Date 
  },
  
  // Zusätzliche Informationen
  instructions: { 
    type: String, 
    trim: true 
  },
  notes: { 
    type: String, 
    trim: true 
  },
  indication: { 
    type: String, 
    trim: true 
  },
  
  // Audit-Trail
  auditTrail: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'discontinued', 'reactivated', 'prescribed', 'elga_synced']
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
      type: mongoose.Schema.Types.Mixed
    },
    reason: {
      type: String,
      trim: true
    }
  }],
  
  // Erstellt von
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Indizes
PatientMedicationSchema.index({ patientId: 1, status: 1 });
PatientMedicationSchema.index({ patientId: 1, startDate: -1 });
PatientMedicationSchema.index({ encounterId: 1 });
PatientMedicationSchema.index({ medicationId: 1 });
PatientMedicationSchema.index({ elgaId: 1 });
PatientMedicationSchema.index({ prescriptionId: 1 });

// Virtual für Status in deutscher Sprache
PatientMedicationSchema.virtual('statusGerman').get(function() {
  const statusMap = {
    'active': 'Aktiv',
    'completed': 'Abgeschlossen',
    'discontinued': 'Abgesetzt',
    'suspended': 'Ausgesetzt'
  };
  return statusMap[this.status] || this.status;
});

// Pre-save Middleware für Audit-Trail
PatientMedicationSchema.pre('save', function(next) {
  if (this.isNew) {
    // Neues Medikament
    this.auditTrail.push({
      action: 'created',
      user: this.createdBy,
      timestamp: new Date()
    });
  } else if (this.isModified()) {
    // Änderungen
    const changes = {};
    const modifiedPaths = this.modifiedPaths();
    modifiedPaths.forEach(path => {
      if (path !== 'auditTrail' && path !== 'updatedAt') {
        changes[path] = {
          from: this.get(path),
          to: this.get(path)
        };
      }
    });
    
    if (Object.keys(changes).length > 0) {
      this.auditTrail.push({
        action: 'updated',
        user: this.lastModifiedBy || this.createdBy,
        timestamp: new Date(),
        changes
      });
    }
  }
  next();
});

// Methoden
PatientMedicationSchema.methods.addAuditEntry = function(action, user, changes, reason) {
  this.auditTrail.push({
    action,
    user,
    changes,
    reason,
    timestamp: new Date()
  });
};

PatientMedicationSchema.methods.discontinue = function(user, reason) {
  this.status = 'discontinued';
  this.discontinuedBy = user;
  this.discontinuedAt = new Date();
  this.discontinuedReason = reason;
  this.addAuditEntry('discontinued', user, { status: 'discontinued', reason }, reason);
};

PatientMedicationSchema.methods.reactivate = function(user, reason) {
  this.status = 'active';
  this.discontinuedBy = undefined;
  this.discontinuedAt = undefined;
  this.discontinuedReason = undefined;
  this.addAuditEntry('reactivated', user, { status: 'active' }, reason);
};

// Statische Methoden
PatientMedicationSchema.statics.findByPatient = function(patientId, options = {}) {
  const { status, encounterId } = options;
  
  let query = { patientId };
  
  if (status) query.status = status;
  if (encounterId) query.encounterId = encounterId;
  
  return this.find(query)
    .populate('encounterId', 'startTime endTime title')
    .populate('medicationId', 'name atcCode strength strengthUnit form')
    .populate('createdBy', 'firstName lastName')
    .populate('prescribedBy', 'firstName lastName')
    .sort({ startDate: -1 });
};

PatientMedicationSchema.statics.findByEncounter = function(encounterId) {
  return this.find({ encounterId })
    .populate('medicationId', 'name atcCode strength strengthUnit form')
    .populate('createdBy', 'firstName lastName')
    .populate('prescribedBy', 'firstName lastName')
    .sort({ startDate: -1 });
};

PatientMedicationSchema.statics.findActive = function(patientId) {
  return this.find({ 
    patientId, 
    status: 'active',
    $or: [
      { endDate: { $exists: false } },
      { endDate: { $gte: new Date() } }
    ]
  })
    .populate('medicationId', 'name atcCode strength strengthUnit form')
    .populate('prescribedBy', 'firstName lastName')
    .sort({ startDate: -1 });
};

module.exports = mongoose.model('PatientMedication', PatientMedicationSchema);

