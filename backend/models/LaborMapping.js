const mongoose = require('mongoose');

const LaborMappingSchema = new mongoose.Schema({
  // Verknüpfung zum Labor-Provider (optional, null = globales Mapping)
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LaborProvider',
    index: true
  },
  
  // Externer Code (vom Laborsystem)
  externalCode: {
    type: String,
    required: true,
    index: true
  },
  
  // Externer Test-Name (optional, für besseres Matching)
  externalName: {
    type: String,
    index: true
  },
  
  // LOINC-Code (standardisiert)
  loincCode: {
    type: String,
    required: true,
    index: true
  },
  
  // LOINC-Name
  loincName: {
    type: String
  },
  
  // Interne Test-ID (optional, für eigene Katalogisierung)
  internalCode: {
    type: String,
    index: true
  },
  
  // Test-Kategorie
  category: {
    type: String,
    enum: [
      'hematology',      // Hämatologie
      'chemistry',       // Klinische Chemie
      'immunology',      // Immunologie
      'microbiology',    // Mikrobiologie
      'serology',        // Serologie
      'hormones',        // Hormone
      'tumor-markers',   // Tumormarker
      'coagulation',     // Gerinnung
      'urine',           // Urin
      'stool',           // Stuhl
      'other'            // Sonstiges
    ],
    default: 'other',
    index: true
  },
  
  // Standard-Einheit
  standardUnit: {
    type: String
  },
  
  // Einheits-Transformationen
  unitConversions: [{
    fromUnit: String,
    toUnit: String,
    factor: Number,      // Multiplikationsfaktor
    offset: Number       // Additionsfaktor (optional)
  }],
  
  // Standard-Referenzbereich
  referenceRange: {
    low: mongoose.Schema.Types.Mixed,
    high: mongoose.Schema.Types.Mixed,
    text: String,
    // Alters-/geschlechtsspezifische Referenzwerte
    ageSpecific: [{
      ageMin: Number,    // Mindestalter in Jahren
      ageMax: Number,    // Maximalalter in Jahren
      gender: {
        type: String,
        enum: ['male', 'female', 'both']
      },
      low: mongoose.Schema.Types.Mixed,
      high: mongoose.Schema.Types.Mixed
    }]
  },
  
  // Kritische Werte-Schwellen
  criticalValues: {
    low: mongoose.Schema.Types.Mixed,
    high: mongoose.Schema.Types.Mixed
  },
  
  // Validierungsregeln
  validation: {
    minValue: mongoose.Schema.Types.Mixed,
    maxValue: mongoose.Schema.Types.Mixed,
    allowedValues: [String],  // Für qualitative Tests
    dataType: {
      type: String,
      enum: ['numeric', 'text', 'boolean', 'date', 'code'],
      default: 'numeric'
    }
  },
  
  // Priorität für Anzeige
  displayPriority: {
    type: Number,
    default: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Metadaten
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Version für Mapping-Updates
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound Index für schnelle Suche
LaborMappingSchema.index({ providerId: 1, externalCode: 1 });
LaborMappingSchema.index({ loincCode: 1 });
LaborMappingSchema.index({ category: 1, isActive: 1 });

// Unique Constraint für Provider + External Code
LaborMappingSchema.index({ providerId: 1, externalCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('LaborMapping', LaborMappingSchema);












