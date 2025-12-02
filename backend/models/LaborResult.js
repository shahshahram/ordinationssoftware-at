const mongoose = require('mongoose');

const LaborResultSchema = new mongoose.Schema({
  // Verknüpfung zum Patienten
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  
  // Verknüpfung zum externen Laborsystem
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LaborProvider',
    required: true,
    index: true
  },
  
  // Externe Referenz (ID vom Laborsystem)
  externalId: {
    type: String,
    index: true
  },
  
  // Auftragsnummer/Order-ID
  orderNumber: {
    type: String,
    index: true
  },
  
  // Datum der Probenentnahme
  collectionDate: {
    type: Date,
    required: true,
    index: true
  },
  
  // Datum der Analyse
  analysisDate: {
    type: Date,
    required: true
  },
  
  // Datum des Ergebnisses
  resultDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Empfangsdatum im System
  receivedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Status des Laborergebnisses
  status: {
    type: String,
    enum: ['pending', 'preliminary', 'final', 'corrected', 'cancelled'],
    default: 'final',
    index: true
  },
  
  // Laborwerte
  results: [{
    // LOINC-Code (standardisiert)
    loincCode: {
      type: String,
      index: true
    },
    
    // Externer Code vom Laborsystem
    externalCode: {
      type: String,
      index: true
    },
    
    // Test-Name
    testName: {
      type: String,
      required: true
    },
    
    // Wert
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    
    // Einheit
    unit: {
      type: String
    },
    
    // Referenzbereich (normal)
    referenceRange: {
      low: mongoose.Schema.Types.Mixed,
      high: mongoose.Schema.Types.Mixed,
      text: String // z.B. "< 5.0" oder "Negativ"
    },
    
    // Abweichung vom Normalwert
    interpretation: {
      type: String,
      enum: ['normal', 'low', 'high', 'critical', 'abnormal'],
      index: true
    },
    
    // Flag für kritische Werte
    isCritical: {
      type: Boolean,
      default: false,
      index: true
    },
    
    // Kommentar/Bemerkung
    comment: {
      type: String
    }
  }],
  
  // Gesamtinterpretation/Befund
  interpretation: {
    type: String
  },
  
  // Kommentar des Labors
  laboratoryComment: {
    type: String
  },
  
  // Verknüpfung zum Termin (optional)
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    index: true
  },
  
  // Verknüpfung zum Arzt (der den Auftrag erstellt hat)
  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Metadaten
  metadata: {
    // Original-Datenformat (FHIR, HL7, etc.)
    sourceFormat: {
      type: String,
      enum: ['fhir', 'hl7v2', 'hl7v3', 'rest', 'csv', 'xml', 'json', 'manual', 'scan'],
      default: 'fhir'
    },
    
    // Original-Rohdaten (für Debugging/Audit)
    rawData: {
      type: mongoose.Schema.Types.Mixed
    },
    
    // Mapping-Version
    mappingVersion: {
      type: String
    },
    
    // Flag, ob der Eintrag per Scan erfasst wurde
    isScanned: {
      type: Boolean,
      default: false
    },
    
    // Historie der Bearbeitungen für manuelle/gescannte Einträge
    editHistory: [{
      editedAt: { type: Date, default: Date.now },
      editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      oldValues: { type: mongoose.Schema.Types.Mixed },
      newValues: { type: mongoose.Schema.Types.Mixed },
      changes: { type: mongoose.Schema.Types.Mixed } // Detaillierte Änderungen
    }]
  },
  
  // Verarbeitungsstatus
  processingStatus: {
    type: String,
    enum: ['pending', 'mapped', 'validated', 'error'],
    default: 'pending',
    index: true
  },
  
  // Fehler bei der Verarbeitung
  processingError: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index für schnelle Suche
LaborResultSchema.index({ patientId: 1, resultDate: -1 });
LaborResultSchema.index({ providerId: 1, resultDate: -1 });
LaborResultSchema.index({ orderNumber: 1 });
LaborResultSchema.index({ externalId: 1 });
LaborResultSchema.index({ 'results.isCritical': 1 });
LaborResultSchema.index({ status: 1, resultDate: -1 });

// Virtual für kritische Werte
LaborResultSchema.virtual('hasCriticalValues').get(function() {
  return this.results.some(r => r.isCritical === true);
});

// Virtual für Anzahl der Werte
LaborResultSchema.virtual('resultCount').get(function() {
  return this.results.length;
});

module.exports = mongoose.model('LaborResult', LaborResultSchema);

