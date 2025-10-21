const mongoose = require('mongoose');

const DocumentTemplateSchema = new mongoose.Schema({
  // Grunddaten
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: { 
    type: String, 
    enum: ['rezept', 'ueberweisung', 'arztbrief', 'befund', 'formular', 'rechnung', 'sonstiges'],
    required: true 
  },
  category: { type: String, trim: true },
  
  // Template-Inhalt
  content: {
    html: { type: String, required: true },
    text: { type: String },
    variables: [{ 
      name: { type: String, required: true },
      type: { type: String, enum: ['text', 'date', 'number', 'select', 'textarea'], required: true },
      label: { type: String, required: true },
      required: { type: Boolean, default: false },
      options: [{ type: String }], // Für select-Typ
      defaultValue: { type: String },
      validation: { type: Object }
    }]
  },
  
  // Layout und Styling
  styling: {
    fontFamily: { type: String, default: 'Arial' },
    fontSize: { type: Number, default: 12 },
    margins: {
      top: { type: Number, default: 20 },
      right: { type: Number, default: 20 },
      bottom: { type: Number, default: 20 },
      left: { type: Number, default: 20 }
    },
    header: { type: String },
    footer: { type: String }
  },
  
  // ELGA-Integration
  elgaCompatible: { type: Boolean, default: false },
  elgaMapping: { type: Object },
  
  // Verfügbarkeit
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false },
  isSystem: { type: Boolean, default: false },
  
  // Berechtigungen
  permissions: {
    roles: [{ type: String }],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  
  // Metadaten
  version: { type: Number, default: 1 },
  tags: [{ type: String }],
  usageCount: { type: Number, default: 0 },
  
  // Metadaten
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index für bessere Performance
DocumentTemplateSchema.index({ name: 1 });
DocumentTemplateSchema.index({ type: 1 });
DocumentTemplateSchema.index({ category: 1 });
DocumentTemplateSchema.index({ isActive: 1 });
DocumentTemplateSchema.index({ isPublic: 1 });

// Methoden
DocumentTemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

DocumentTemplateSchema.methods.getVariableNames = function() {
  return this.content.variables.map(variable => variable.name);
};

module.exports = mongoose.model('DocumentTemplate', DocumentTemplateSchema);
