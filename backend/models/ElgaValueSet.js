const mongoose = require('mongoose');

/**
 * ELGA ValueSet Model
 * 
 * Speichert Valuesets von https://termgit.elga.gv.at/valuesets.html
 * Daten werden unverändert übernommen - keine Modifikation!
 */
const ElgaValueSetSchema = new mongoose.Schema({
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
  
  // Codes in diesem ValueSet
  codes: [{
    code: { type: String, required: true },
    system: { type: String }, // Optional - kann aus OID/URL abgeleitet werden
    display: { type: String },
    version: { type: String },
    // Hierarchie-Attribute (für ELGA Dokumentenklassen)
    level: { type: Number }, // 0 = ClassCode (Hauptkategorie), 1 = TypeCode (Subtyp)
    orderNumber: { type: Number }, // Sortierreihenfolge
    parentCode: { type: String }, // Code des Parent-Elements (für level 1)
    type: { type: String }, // S = Standard ClassCode, L = Leaf/TypeCode, D = ...
    deutsch: { type: String }, // Deutsche Bezeichnung
    hinweise: { type: String }, // Hinweise/Beschreibung
    concept_beschreibung: { type: String } // Zusätzliche Beschreibung
  }],
  
  // Metadaten
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  sourceUrl: {
    type: String,
    required: true,
    default: 'https://termgit.elga.gv.at/valuesets.html'
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
  collection: 'elga_valuesets'
});

// Indizes für effiziente Suche
ElgaValueSetSchema.index({ title: 1, version: 1 });
// OID-Index wird bereits durch "index: true" erstellt - hier nicht duplizieren
ElgaValueSetSchema.index({ category: 1, status: 1 });
ElgaValueSetSchema.index({ 'codes.code': 1 });
ElgaValueSetSchema.index({ 'codes.system': 1 });

module.exports = mongoose.model('ElgaValueSet', ElgaValueSetSchema);

