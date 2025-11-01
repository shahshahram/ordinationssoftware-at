const mongoose = require('mongoose');

const DocumentTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'arztbrief',
      'attest', 
      'befund',
      'konsiliarbericht',
      'ueberweisung',
      'zuweisung',
      'rueckueberweisung',
      'operationsbericht',
      'rezept',
      'heilmittelverordnung',
      'krankenstandsbestaetigung',
      'bildgebende_zuweisung',
      'impfbestaetigung',
      'patientenaufklaerung',
      'therapieplan',
      'verlaufsdokumentation',
      'pflegebrief',
      'kostenuebernahmeantrag',
      'gutachten'
    ]
  },
  content: {
    type: String,
    required: true
  },
  placeholders: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'date', 'number', 'boolean', 'select'],
      default: 'text'
    },
    required: {
      type: Boolean,
      default: false
    },
    defaultValue: {
      type: String,
      default: ''
    },
    options: [String] // For select type
  }],
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [String],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  versionKey: false
});

// Index for efficient searching
DocumentTemplateSchema.index({ name: 'text', description: 'text', category: 1 });
DocumentTemplateSchema.index({ isActive: 1, category: 1 });
DocumentTemplateSchema.index({ createdBy: 1 });

// Virtual for template usage count
DocumentTemplateSchema.virtual('usageCount', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'templateId',
  count: true
});

// Method to get template with placeholders
DocumentTemplateSchema.methods.getTemplateWithPlaceholders = function() {
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    category: this.category,
    content: this.content,
    placeholders: this.placeholders,
    version: this.version,
    tags: this.tags,
    metadata: this.metadata
  };
};

// Static method to find templates by category
DocumentTemplateSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ name: 1 });
};

// Static method to search templates
DocumentTemplateSchema.statics.searchTemplates = function(query, category = null) {
  const searchQuery = {
    isActive: true,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  };

  if (category) {
    searchQuery.category = category;
  }

  return this.find(searchQuery).sort({ name: 1 });
};

module.exports = mongoose.model('DocumentTemplate', DocumentTemplateSchema);