const mongoose = require('mongoose');

/**
 * ELGA CodeSystem Model
 * 
 * Speichert CodeSystems von https://termgit.elga.gv.at/codesystems.html
 * Daten werden unverändert übernommen - keine Modifikation!
 */
const ElgaCodeSystemSchema = new mongoose.Schema({
  // Identifikation
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  version: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  oid: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  // Beschreibung
  description: {
    type: String,
    trim: true
  },
  descriptionDe: {
    type: String,
    trim: true
  },
  
  // Rohdaten (unverändert)
  rawData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Codes in diesem CodeSystem
  concepts: [{
    code: { type: String, required: true },
    display: { type: String },
    definition: { type: String },
    designation: [{
      language: { type: String },
      value: { type: String },
      use: { type: String }
    }]
  }],
  
  // Hierarchie (falls vorhanden)
  hierarchy: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Metadaten
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  sourceUrl: {
    type: String,
    required: true,
    default: 'https://termgit.elga.gv.at/codesystems.html'
  },
  importedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Kategorisierung (dynamisch - keine enum-Beschränkung für Flexibilität)
  category: {
    type: String,
    default: 'other',
    index: true,
    // Bekannte Kategorien werden dynamisch erkannt:
    // classcode, typecode, formatcode, hl7-v3, dgc, eimpf, elga, elga-medikation,
    // elga-audit, elga-problem, elga-sections, elga-fachaerzte, appc, diaetologie,
    // rare-diseases, units-time, loinc, snomed-ct, icd-10, labor, medication, befund,
    // prozedur, diagnose, organisation, rolle, 1450-service, und weitere dynamisch erstellte
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'deprecated', 'unknown'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true,
  collection: 'elga_codesystems'
});

// Indizes für effiziente Suche
ElgaCodeSystemSchema.index({ title: 1, version: 1 });
// OID-Index wird bereits durch "index: true" erstellt - hier nicht duplizieren
ElgaCodeSystemSchema.index({ category: 1, status: 1 });
ElgaCodeSystemSchema.index({ 'concepts.code': 1 });

module.exports = mongoose.model('ElgaCodeSystem', ElgaCodeSystemSchema);

