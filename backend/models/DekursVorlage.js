const mongoose = require('mongoose');

const DekursVorlageSchema = new mongoose.Schema({
  // Identifikation
  code: {
    type: String,
    required: [true, 'Code ist erforderlich'],
    unique: true,
    trim: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Titel ist erforderlich'],
    trim: true,
    maxlength: [200, 'Titel darf maximal 200 Zeichen haben'],
    index: true
  },
  icd10: {
    type: String,
    trim: true,
    index: true
  },
  icd10Title: {
    type: String,
    trim: true
  },
  
  // Zuordnung
  specialty: {
    type: String,
    trim: true,
    index: true
  },
  specialties: [{
    type: String,
    trim: true
  }],
  locationIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  }],
  
  // Alte Felder (für Kompatibilität)
  name: {
    type: String,
    trim: true,
    maxlength: [200, 'Vorlagenname darf maximal 200 Zeichen haben']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Beschreibung darf maximal 1000 Zeichen haben']
  },
  
  // Kategorie für Gruppierung (Legacy)
  category: {
    type: String,
    trim: true,
    enum: ['allgemein', 'kardiologie', 'pneumologie', 'gastroenterologie', 'neurologie', 'orthopaedie', 'dermatologie', 'gynaekologie', 'paediatrie', 'notfall', 'vorsorge', 'sonstiges'],
    default: 'allgemein',
    index: true
  },
  
  // Vorlagen-Inhalte (strukturiert)
  template: {
    clinicalObservations: {
      type: String,
      trim: true,
      default: ''
    },
    progressChecks: {
      type: String,
      trim: true,
      default: ''
    },
    findings: {
      type: String,
      trim: true,
      default: ''
    },
    medicationChanges: {
      type: String,
      trim: true,
      default: ''
    },
    treatmentDetails: {
      type: String,
      trim: true,
      default: ''
    },
    psychosocialFactors: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    visitReason: {
      type: String,
      trim: true,
      default: ''
    },
    visitType: {
      type: String,
      enum: ['appointment', 'phone', 'emergency', 'follow-up', 'other'],
      default: 'appointment'
    },
    imagingFindings: {
      type: String,
      trim: true,
      default: ''
    },
    laboratoryFindings: {
      type: String,
      trim: true,
      default: ''
    }
  },
  
  // Textbausteine (für Schnelleingabe)
  textBlocks: [{
    label: {
      type: String,
      required: true,
      trim: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['clinicalObservations', 'progressChecks', 'findings', 'medicationChanges', 'treatmentDetails', 'psychosocialFactors', 'notes'],
      default: 'notes'
    },
    _id: false
  }],
  
  // Verknüpfungen (Vorschläge)
  suggestedDiagnoses: [{
    icd10Code: {
      type: String,
      trim: true
    },
    display: {
      type: String,
      trim: true
    },
    _id: false
  }],
  suggestedMedications: [{
    medicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicationCatalog'
    },
    name: {
      type: String,
      trim: true
    },
    _id: false
  }],
  // Verknüpfte Medikamente für Vorlage (werden beim Auslösen automatisch eingefügt)
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
    dosageUnit: {
      type: String,
      trim: true
    },
    frequency: {
      type: String,
      trim: true
    },
    duration: {
      type: String,
      trim: true
    },
    instructions: {
      type: String,
      trim: true
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    quantity: {
      type: Number
    },
    quantityUnit: {
      type: String,
      trim: true
    },
    route: {
      type: String,
      enum: ['oral', 'topical', 'injection', 'inhalation', 'rectal', 'vaginal', 'sublingual', 'intravenous', 'intramuscular', 'subcutaneous', 'other'],
      default: 'oral'
    },
    changeType: {
      type: String,
      enum: ['added', 'modified', 'discontinued', 'unchanged'],
      default: 'added'
    },
    notes: {
      type: String,
      trim: true
    },
    _id: false
  }],
  
  // ELGA-konforme Struktur (für Export)
  elga_structured: {
    chief_complaint: {
      type: String,
      trim: true,
      default: ''
    },
    history_of_present_illness: {
      type: String,
      trim: true,
      default: ''
    },
    relevant_history: {
      type: String,
      trim: true,
      default: ''
    },
    medications: [{
      type: String,
      trim: true
    }],
    allergies: [{
      type: String,
      trim: true
    }],
    physical_exam: {
      type: String,
      trim: true,
      default: ''
    },
    diagnosis: [{
      type: String,
      trim: true
    }],
    treatment: {
      type: String,
      trim: true,
      default: ''
    },
    followup: {
      type: String,
      trim: true,
      default: ''
    },
    imaging: {
      type: String,
      trim: true,
      default: ''
    },
    laboratory: {
      type: String,
      trim: true,
      default: ''
    }
  },
  
  // Verfügbarkeit
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true
  },
  isPublic: {
    type: Boolean,
    default: true // Öffentlich für alle Benutzer
  },
  sortOrder: {
    type: Number,
    default: 0,
    index: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Versionierung
  version: {
    type: Number,
    default: 1
  },
  
  // Erstellt von
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Metadaten
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indizes
DekursVorlageSchema.index({ code: 1 }, { unique: true });
DekursVorlageSchema.index({ icd10: 1, specialty: 1 });
DekursVorlageSchema.index({ specialty: 1, isActive: 1 });
DekursVorlageSchema.index({ locationIds: 1 });
DekursVorlageSchema.index({ category: 1, isActive: 1 });
DekursVorlageSchema.index({ createdBy: 1, isActive: 1 });
DekursVorlageSchema.index({ isPublic: 1, isActive: 1 });
DekursVorlageSchema.index({ isDefault: 1, icd10: 1 });

// Pre-save Hook
DekursVorlageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method: Verwendung erhöhen
DekursVorlageSchema.methods.incrementUsage = function() {
  this.usageCount = (this.usageCount || 0) + 1;
  this.lastUsedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('DekursVorlage', DekursVorlageSchema);

