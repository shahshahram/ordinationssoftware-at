const mongoose = require('mongoose');
const Icd10Catalog = require('./Icd10Catalog');

const PatientDiagnosisSchema = new mongoose.Schema({
  // Patient-Referenz
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: true,
    index: true
  },
  
  // Encounter/Termin-Referenz (optional)
  encounterId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment' 
  },
  
  // ICD-10 Code-Daten
  code: { 
    type: String, 
    required: true, 
    trim: true 
  },
  catalogYear: { 
    type: Number, 
    required: true 
  },
  display: { 
    type: String, 
    required: true, 
    trim: true 
  },
  
  // Diagnose-Status
  status: { 
    type: String, 
    enum: ['active', 'resolved', 'provisional', 'ruled-out'], 
    required: true,
    default: 'active'
  },
  
  // Zeitangaben
  onsetDate: { 
    type: Date 
  },
  resolvedDate: { 
    type: Date 
  },
  
  // Zusätzliche Informationen
  severity: { 
    type: String,
    enum: ['mild', 'moderate', 'severe', 'critical']
  },
  isPrimary: { 
    type: Boolean, 
    default: false 
  },
  
  // Quelle der Diagnose
  source: { 
    type: String, 
    enum: ['clinical', 'billing', 'elga', 'import'], 
    default: 'clinical' 
  },
  
  // Notizen
  notes: { 
    type: String, 
    trim: true 
  },
  
  // Verknüpfungen
  linkedServices: [{
    serviceId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'ServiceCatalog' 
    },
    context: { 
      type: String, 
      enum: ['billing', 'medical', 'reporting'] 
    },
    linkedAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
  
  // Export-Status für externe Systeme
  exports: [{
    target: { 
      type: String, 
      enum: ['ELGA', 'KASSE', 'OTHER'] 
    },
    status: { 
      type: String, 
      enum: ['pending', 'queued', 'sent', 'error', 'ack'], 
      default: 'pending' 
    },
    payload: { 
      type: Object 
    },
    errorMessage: { 
      type: String 
    },
    sentAt: { 
      type: Date 
    },
    acknowledgedAt: { 
      type: Date 
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

// Eindeutigkeit: Pro Encounter nur eine Primärdiagnose (nur wenn isPrimary=true und encounterId gesetzt)
PatientDiagnosisSchema.index(
  { encounterId: 1, isPrimary: 1 },
  { unique: true, partialFilterExpression: { isPrimary: true, encounterId: { $exists: true, $ne: null } } }
);

// Index für Patient + Status
PatientDiagnosisSchema.index({ 
  patientId: 1, 
  status: 1 
});

// Index für Code + Jahr
PatientDiagnosisSchema.index({ 
  code: 1, 
  catalogYear: 1 
});

// Pre-validate: Konsistenzprüfungen (Katalog, Datumslogik)
PatientDiagnosisSchema.pre('validate', async function(next) {
  try {
    // Datumsvalidierung
    if (this.onsetDate && this.resolvedDate && this.resolvedDate < this.onsetDate) {
      return next(new Error('resolvedDate darf nicht vor onsetDate liegen'));
    }

    // ICD-10 Code gegen aktives Katalogjahr prüfen
    if (this.code && this.catalogYear) {
      const entry = await Icd10Catalog.findOne({
        code: this.code,
        releaseYear: this.catalogYear,
        isActive: true
      }).lean();
      if (!entry) {
        return next(new Error('ICD-10 Code wurde im aktiven Katalogjahr nicht gefunden'));
      }
      // Optional: display abgleichen/überschreiben, falls leer
      if (!this.display) {
        this.display = entry.title || this.code;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
});

// Pre-save Middleware für Validierung (Primärdiagnose-Eindeutigkeit)
PatientDiagnosisSchema.pre('save', function(next) {
  // Nur eine Hauptdiagnose pro Encounter
  if (this.isPrimary && this.encounterId) {
    this.constructor.findOne({
      encounterId: this.encounterId,
      isPrimary: true,
      _id: { $ne: this._id }
    }).then(existing => {
      if (existing) {
        return next(new Error('Es kann nur eine Hauptdiagnose pro Termin geben'));
      }
      next();
    }).catch(next);
    return;
  }

  // Falls keine encounterId: pro Patient nur eine aktive Primärdiagnose ohne Termin
  if (this.isPrimary && !this.encounterId) {
    this.constructor.findOne({
      patientId: this.patientId,
      encounterId: { $in: [null, undefined] },
      isPrimary: true,
      _id: { $ne: this._id }
    }).then(existing => {
      if (existing) {
        return next(new Error('Es kann nur eine Hauptdiagnose ohne Termin pro Patient geben'));
      }
      next();
    }).catch(next);
    return;
  }

  next();
});

// Virtual für Status in deutscher Sprache
PatientDiagnosisSchema.virtual('statusGerman').get(function() {
  const statusMap = {
    'active': 'Aktiv',
    'resolved': 'Behoben',
    'provisional': 'Verdachtsdiagnose',
    'ruled-out': 'Ausgeschlossen'
  };
  return statusMap[this.status] || this.status;
});

// Virtual für Schweregrad in deutscher Sprache
PatientDiagnosisSchema.virtual('severityGerman').get(function() {
  const severityMap = {
    'mild': 'Leicht',
    'moderate': 'Mäßig',
    'severe': 'Schwer',
    'critical': 'Kritisch'
  };
  return severityMap[this.severity] || this.severity;
});

// Methoden
PatientDiagnosisSchema.methods.addAuditEntry = function(action, user, changes, reason) {
  this.auditTrail.push({
    action,
    user,
    changes,
    reason,
    timestamp: new Date()
  });
};

PatientDiagnosisSchema.methods.linkService = function(serviceId, context) {
  this.linkedServices.push({
    serviceId,
    context,
    linkedAt: new Date()
  });
};

PatientDiagnosisSchema.methods.addExport = function(target, payload) {
  this.exports.push({
    target,
    status: 'pending',
    payload
  });
};

PatientDiagnosisSchema.methods.updateExportStatus = function(exportId, status, errorMessage = null) {
  const exportItem = this.exports.id(exportId);
  if (exportItem) {
    exportItem.status = status;
    if (errorMessage) {
      exportItem.errorMessage = errorMessage;
    }
    if (status === 'sent') {
      exportItem.sentAt = new Date();
    }
    if (status === 'ack') {
      exportItem.acknowledgedAt = new Date();
    }
  }
};

// Statische Methoden
PatientDiagnosisSchema.statics.findByPatient = function(patientId, options = {}) {
  const { status, encounterId, isPrimary } = options;
  
  let query = { patientId };
  
  if (status) query.status = status;
  if (encounterId) query.encounterId = encounterId;
  if (isPrimary !== undefined) query.isPrimary = isPrimary;
  
  return this.find(query)
    .populate('encounterId', 'startTime endTime title')
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

PatientDiagnosisSchema.statics.findByEncounter = function(encounterId) {
  return this.find({ encounterId })
    .populate('createdBy', 'firstName lastName')
    .sort({ isPrimary: -1, createdAt: 1 });
};

PatientDiagnosisSchema.statics.getPrimaryDiagnosis = function(encounterId) {
  return this.findOne({ 
    encounterId, 
    isPrimary: true 
  });
};

module.exports = mongoose.model('PatientDiagnosis', PatientDiagnosisSchema);
