const mongoose = require('mongoose');

const MedicationCatalogSchema = new mongoose.Schema({
  // Basis-Informationen
  name: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  designation: {
    type: String,
    trim: true
  },
  
  // Zulassung
  approvalNumber: {
    type: String,
    index: true,
    trim: true
  },
  approvalDate: {
    type: String,
    trim: true
  },
  
  // Wirkstoff
  activeIngredient: {
    type: String,
    index: true,
    trim: true
  },
  
  // ATC-Code
  atcCode: {
    type: String,
    index: true,
    trim: true
  },
  
  // Dosierung
  strength: {
    type: String,
    trim: true
  },
  strengthUnit: {
    type: String,
    trim: true
  },
  
  // Darreichungsform
  form: {
    type: String,
    trim: true
  },
  
  // Hersteller/Inhaber
  manufacturer: {
    type: String,
    trim: true
  },
  
  // Rezeptpflicht
  requiresPrescription: {
    type: Boolean,
    default: false
  },
  prescriptionStatus: {
    type: String,
    trim: true
  },
  
  // Zusatzinformationen
  isNarcotic: {
    type: Boolean,
    default: false
  },
  isPsychotropic: {
    type: Boolean,
    default: false
  },
  requiresAdditionalMonitoring: {
    type: Boolean,
    default: false
  },
  
  // Medikamentenkategorie
  category: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    trim: true
  },
  
  // Verwendung
  usage: {
    type: String,
    trim: true
  },
  
  // Suchtext für Volltext-Suche (alle Felder kombiniert)
  searchText: {
    type: String,
    index: true
  },
  
  // Timestamps
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

// Pre-save middleware: Erstelle searchText aus allen relevanten Feldern
MedicationCatalogSchema.pre('save', function(next) {
  const searchFields = [
    this.name,
    this.designation,
    this.activeIngredient,
    this.atcCode,
    this.approvalNumber,
    this.manufacturer,
    this.form,
    this.category,
    this.type
  ].filter(field => field && field.trim()).join(' ');
  
  this.searchText = searchFields;
  next();
});

// Volltext-Suchindex
MedicationCatalogSchema.index({ searchText: 'text' });

module.exports = mongoose.model('MedicationCatalog', MedicationCatalogSchema);






