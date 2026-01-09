const mongoose = require('mongoose');

/**
 * Ambulanzbefund Form Template Model
 * Definiert dynamische Formulare für Ambulanzbefunde basierend auf ELGA IL
 */
const AmbulanzbefundFormTemplateSchema = new mongoose.Schema({
  // Identifikation
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  version: {
    type: String,
    required: true,
    default: '1.0'
  },
  description: {
    type: String,
    trim: true
  },
  
  // ELGA IL Referenz
  elgaIlReference: {
    generalIlVersion: {
      type: String,
      required: true,
      default: '3.2.1+20211001'
      // Version des Allgemeinen IL
    },
    specificIlVersion: {
      type: String,
      required: true,
      default: '1.0'
      // Version des Ambulanzbefund IL (zu prüfen!)
    },
    templateId: {
      type: String,
      trim: true
      // CDA Template-ID (falls bekannt)
    },
    formatCode: {
      code: String,
      codingScheme: String,
      displayName: String
    },
    classCode: {
      code: String,
      codingScheme: String,
      displayName: String
    },
    typeCode: {
      code: String,
      codingScheme: String,
      displayName: String
    }
  },
  
  // Spezialisierung
  specialization: {
    type: String,
    enum: [
      'allgemein',
      'hno',
      'interne',
      'chirurgie',
      'dermatologie',
      'gyn',
      'pädiatrie',
      'neurologie',
      'orthopädie',
      'ophthalmologie',
      'urologie',
      'psychiatrie',
      'radiologie',
      'pathologie'
    ],
    required: true,
    index: true
  },
  
  // Formular-Definition (JSON Schema + UI Definition)
  formDefinition: {
    // JSON Schema für Validierung (JSON Schema Draft 7)
    schema: {
      type: mongoose.Schema.Types.Mixed,
      required: true
      // Struktur: { type: 'object', properties: {...}, required: [...] }
    },
    
    // UI Definition (basierend auf DocumentDesign-Konzept)
    layout: {
      type: mongoose.Schema.Types.Mixed,
      required: true
      // Struktur:
      // {
      //   sections: [{ id, label, position, fields: [...] }],
      //   fields: [{ id, type, label, dataSource, validation, formatting, ... }],
      //   autoSections: [...]
      // }
    },
    
    // Feld-Mapping zu CDA (für späteren CDA-Export)
    cdaMapping: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
      // Mapping von Formularfeld-IDs → CDA-Elemente
      // z.B. { "anamnesis.chiefComplaint": "/ClinicalDocument/component/structuredBody/component/section[...]" }
    }
  },
  
  // Verfügbare Sektionen für diese Spezialisierung
  availableSections: [{
      id: {
        type: String,
        required: true
      },
      label: {
        type: String,
        required: true
      },
      description: String,
      required: {
        type: Boolean,
        default: false
      },
      category: {
        type: String,
        enum: ['basic', 'specialized', 'optional'],
        default: 'optional'
      },
      // Spezialisierungen, für die diese Sektion relevant ist
      applicableSpecializations: [{
        type: String
      }]
    }],
  
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
    // Default-Template für diese Spezialisierung
  },
  
  // Standort-spezifisch (null = global verfügbar)
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    default: null,
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
  tags: [String],
  
  // Statistiken
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'ambulanzbefund_form_templates'
});

// Indizes
AmbulanzbefundFormTemplateSchema.index({ specialization: 1, isActive: 1 });
AmbulanzbefundFormTemplateSchema.index({ specialization: 1, isDefault: 1 });
AmbulanzbefundFormTemplateSchema.index({ code: 1, version: 1 });
AmbulanzbefundFormTemplateSchema.index({ locationId: 1, specialization: 1 });

// Static Method: Finde Default-Template für Spezialisierung
AmbulanzbefundFormTemplateSchema.statics.findDefaultForSpecialization = function(specialization, locationId = null) {
  const query = {
    specialization,
    isDefault: true,
    isActive: true
  };
  
  // Priorisiere standort-spezifische Templates
  if (locationId) {
    return this.findOne({ ...query, locationId })
      .then(template => {
        if (template) return template;
        // Fallback auf globales Template
        return this.findOne({ ...query, locationId: null });
      });
  }
  
  return this.findOne({ ...query, locationId: null });
};

// Static Method: Finde alle Templates für Spezialisierung
AmbulanzbefundFormTemplateSchema.statics.findForSpecialization = function(specialization, locationId = null) {
  const query = {
    specialization,
    isActive: true
  };
  
  if (locationId) {
    query.$or = [
      { locationId },
      { locationId: null } // Globale Templates
    ];
  } else {
    query.locationId = null;
  }
  
  return this.find(query).sort({ isDefault: -1, name: 1 });
};

// Method: Validiere FormData gegen Schema
AmbulanzbefundFormTemplateSchema.methods.validateFormData = function(formData) {
  // Basis-Validierung gegen JSON Schema
  // Erweiterte Validierung mit JSON Schema Validator Library
  // Diese wird im Service implementiert
  return {
    isValid: true,
    errors: []
  };
};

// Method: Get Template mit zusammengeführten Sections
AmbulanzbefundFormTemplateSchema.methods.getTemplateWithSections = function(selectedSectionIds = []) {
  // Filtere Layout basierend auf ausgewählten Sections
  const layout = this.formDefinition.layout;
  
  if (!selectedSectionIds || selectedSectionIds.length === 0) {
    // Verwende alle Sections (Standard)
    return {
      ...this.toObject(),
      effectiveLayout: layout
    };
  }
  
  // Filtere Sections
  const sections = layout.sections || [];
  const filteredSections = sections.filter(section => 
    selectedSectionIds.includes(section.id)
  );
  
  // Filtere Fields basierend auf Sections
  const sectionIds = filteredSections.map(s => s.id);
  const fields = (layout.fields || []).filter(field => 
    !field.sectionId || sectionIds.includes(field.sectionId)
  );
  
  return {
    ...this.toObject(),
    effectiveLayout: {
      ...layout,
      sections: filteredSections,
      fields: fields
    }
  };
};

module.exports = mongoose.model('AmbulanzbefundFormTemplate', AmbulanzbefundFormTemplateSchema);

