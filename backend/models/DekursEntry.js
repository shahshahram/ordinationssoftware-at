const mongoose = require('mongoose');

const DekursEntrySchema = new mongoose.Schema({
  // Patient-Referenz
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientExtended',
    required: true,
    index: true
  },
  
  // Termin-Referenz (optional, wird automatisch verknüpft wenn vorhanden)
  encounterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    index: true
  },
  
  // Datum und Zeit
  entryDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Erstellt von
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Strukturierte Inhalte
  clinicalObservations: {
    type: String,
    trim: true,
    maxlength: [5000, 'Klinische Beobachtungen dürfen maximal 5000 Zeichen haben']
  },
  progressChecks: {
    type: String,
    trim: true,
    maxlength: [5000, 'Verlaufskontrollen dürfen maximal 5000 Zeichen haben']
  },
  findings: {
    type: String,
    trim: true,
    maxlength: [5000, 'Befunde dürfen maximal 5000 Zeichen haben']
  },
  medicationChanges: {
    type: String,
    trim: true,
    maxlength: [5000, 'Medikamentenänderungen dürfen maximal 5000 Zeichen haben']
  },
  treatmentDetails: {
    type: String,
    trim: true,
    maxlength: [5000, 'Behandlungsdetails dürfen maximal 5000 Zeichen haben']
  },
  psychosocialFactors: {
    type: String,
    trim: true,
    maxlength: [5000, 'Psychosoziale Faktoren dürfen maximal 5000 Zeichen haben']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [10000, 'Notizen dürfen maximal 10000 Zeichen haben']
  },
  
  // Verknüpfungen zu Diagnosen
  linkedDiagnoses: [{
    diagnosisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatientDiagnosis'
    },
    icd10Code: {
      type: String,
      trim: true
    },
    display: {
      type: String,
      trim: true
    },
    side: {
      type: String,
      enum: ['left', 'right', 'bilateral', ''],
      default: ''
    },
    _id: false
  }],
  
  // Verknüpfungen zu Medikamenten
  linkedMedications: [{
    medicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicationCatalog'
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    dosage: {
      type: String,
      trim: true
    },
    frequency: {
      type: String,
      trim: true
    },
    changeType: {
      type: String,
      enum: ['added', 'modified', 'discontinued', 'unchanged'],
      default: 'unchanged'
    },
    _id: false
  }],
  
  // Verknüpfungen zu Dokumenten
  linkedDocuments: [{
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    },
    documentType: {
      type: String,
      trim: true
    },
    documentTitle: {
      type: String,
      trim: true
    },
    _id: false
  }],
  
  // Fotos/Anhänge
  attachments: [{
    filename: {
      type: String,
      trim: true,
      required: true
    },
    originalName: {
      type: String,
      trim: true,
      required: true
    },
    mimeType: {
      type: String,
      trim: true,
      required: true
    },
    size: {
      type: Number
    },
    path: {
      type: String,
      trim: true,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    _id: false
  }],
  
  // Besuchs-Metadaten
  visitReason: {
    type: String,
    trim: true,
    maxlength: [1000, 'Besuchsgrund darf maximal 1000 Zeichen haben']
  },
  visitType: {
    type: String,
    enum: ['appointment', 'phone', 'emergency', 'follow-up', 'other'],
    default: 'appointment'
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'finalized'],
    default: 'draft',
    index: true
  },
  
  // Verwendete Vorlage (optional)
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DekursVorlage'
  },
  templateName: {
    type: String,
    trim: true
  },
  
  // Metadaten
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  finalizedAt: {
    type: Date
  },
  finalizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index für schnelle Abfragen
DekursEntrySchema.index({ patientId: 1, entryDate: -1 });
DekursEntrySchema.index({ encounterId: 1 });
DekursEntrySchema.index({ createdBy: 1, entryDate: -1 });
DekursEntrySchema.index({ status: 1, entryDate: -1 });

// Pre-save Hook: updatedAt aktualisieren
DekursEntrySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.status === 'finalized' && !this.finalizedAt) {
    this.finalizedAt = new Date();
    this.finalizedBy = this.createdBy;
  }
  next();
});

// Virtual: Vollständiger Text für Export
DekursEntrySchema.virtual('fullText').get(function() {
  const parts = [];
  if (this.clinicalObservations) parts.push(`Klinische Beobachtungen: ${this.clinicalObservations}`);
  if (this.progressChecks) parts.push(`Verlaufskontrollen: ${this.progressChecks}`);
  if (this.findings) parts.push(`Befunde: ${this.findings}`);
  if (this.medicationChanges) parts.push(`Medikamentenänderungen: ${this.medicationChanges}`);
  if (this.treatmentDetails) parts.push(`Behandlungsdetails: ${this.treatmentDetails}`);
  if (this.psychosocialFactors) parts.push(`Psychosoziale Faktoren: ${this.psychosocialFactors}`);
  if (this.notes) parts.push(`Notizen: ${this.notes}`);
  return parts.join('\n\n');
});

// Method: Kann bearbeitet werden?
DekursEntrySchema.methods.canBeEdited = function() {
  return this.status === 'draft';
};

// Method: Finalisieren (revisionssicher)
DekursEntrySchema.methods.finalize = function(userId) {
  if (this.status === 'finalized') {
    throw new Error('Dekurs-Eintrag ist bereits finalisiert');
  }
  this.status = 'finalized';
  this.finalizedAt = new Date();
  this.finalizedBy = userId;
  return this.save();
};

module.exports = mongoose.model('DekursEntry', DekursEntrySchema);

