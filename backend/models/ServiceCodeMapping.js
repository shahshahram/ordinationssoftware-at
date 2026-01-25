const mongoose = require('mongoose');

const ServiceCodeMappingSchema = new mongoose.Schema({
  // Basis-Service (interner Code)
  baseCode: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  
  // Service-Name (für Anzeige)
  baseName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Mappings zu verschiedenen Versicherungsträgern
  mappings: [{
    insuranceProvider: {
      type: String,
      enum: ['oegk', 'bvaeb', 'svs', 'kfa', 'pva', 'vaeb', 'auva'],
      required: true
    },
    code: {
      type: String,
      required: true,
      trim: true  // Externer Code für diesen Versicherungsträger
    },
    name: {
      type: String,
      trim: true  // Optional: Name beim Versicherungsträger
    },
    price: {
      type: Number,
      min: 0  // Optional: Preis beim Versicherungsträger (in Euro)
    },
    validFrom: {
      type: Date  // Optional: Gültig ab
    },
    validUntil: {
      type: Date  // Optional: Gültig bis
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Metadaten
  specialty: {
    type: String,
    trim: true  // Fachrichtung (optional)
  },
  category: {
    type: String,
    trim: true  // Kategorie (optional)
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Timestamps
}, {
  timestamps: true
});

// Index für schnelle Suche
ServiceCodeMappingSchema.index({ baseCode: 1, 'mappings.insuranceProvider': 1 });
ServiceCodeMappingSchema.index({ 'mappings.code': 1, 'mappings.insuranceProvider': 1 });
ServiceCodeMappingSchema.index({ baseCode: 1, isActive: 1 });

// Compound Index für häufigste Abfragen
ServiceCodeMappingSchema.index({ 
  baseCode: 1, 
  'mappings.insuranceProvider': 1, 
  'mappings.isActive': 1,
  isActive: 1 
});

module.exports = mongoose.model('ServiceCodeMapping', ServiceCodeMappingSchema);
