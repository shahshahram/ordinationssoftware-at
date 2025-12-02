const mongoose = require('mongoose');

const DekursVorlageSchema = new mongoose.Schema({
  // Grunddaten
  name: {
    type: String,
    required: [true, 'Vorlagenname ist erforderlich'],
    trim: true,
    maxlength: [200, 'Vorlagenname darf maximal 200 Zeichen haben'],
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Beschreibung darf maximal 1000 Zeichen haben']
  },
  
  // Kategorie für Gruppierung
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
  
  // Verfügbarkeit
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isPublic: {
    type: Boolean,
    default: true // Öffentlich für alle Benutzer
  },
  
  // Erstellt von
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Index
DekursVorlageSchema.index({ category: 1, isActive: 1 });
DekursVorlageSchema.index({ createdBy: 1, isActive: 1 });
DekursVorlageSchema.index({ isPublic: 1, isActive: 1 });

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

