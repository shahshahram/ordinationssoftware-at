const mongoose = require('mongoose');

const TaskTemplateSchema = new mongoose.Schema({
  // Titel der Vorlage
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  // Beschreibung der Vorlage
  description: {
    type: String,
    trim: true
  },
  
  // Erstellt von
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Standard-Priorität
  defaultPriority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Standard-Fälligkeitsdauer (in Stunden)
  defaultDueDateHours: {
    type: Number,
    default: 24
  },
  
  // Kategorie für Gruppierung
  category: {
    type: String,
    trim: true,
    index: true
  },
  
  // Ist Favorit
  isFavorite: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Zähler für "Top 10" (wird bei Verwendung erhöht)
  usageCount: {
    type: Number,
    default: 0,
    index: true
  },
  
  // Zuletzt verwendet
  lastUsedAt: {
    type: Date,
    index: true
  },
  
  // Öffentlich für alle Mediziner oder nur für Ersteller
  isPublic: {
    type: Boolean,
    default: false
  },
  
  // Metadaten
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indizes
TaskTemplateSchema.index({ createdBy: 1, isFavorite: 1 });
TaskTemplateSchema.index({ usageCount: -1, lastUsedAt: -1 });
TaskTemplateSchema.index({ isPublic: 1, usageCount: -1 });

// Statische Methode: Top 10 Vorlagen abrufen
TaskTemplateSchema.statics.getTop10 = async function(userId) {
  return this.find({
    $or: [
      { createdBy: userId },
      { isPublic: true }
    ]
  })
    .sort({ usageCount: -1, lastUsedAt: -1 })
    .limit(10)
    .populate('createdBy', 'firstName lastName');
};

// Statische Methode: Favoriten abrufen
TaskTemplateSchema.statics.getFavorites = async function(userId) {
  return this.find({
    $or: [
      { createdBy: userId, isFavorite: true },
      { isPublic: true, isFavorite: true }
    ]
  })
    .sort({ title: 1 })
    .populate('createdBy', 'firstName lastName');
};

// Methode: Verwendung erhöhen
TaskTemplateSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  await this.save();
};

const TaskTemplate = mongoose.model('TaskTemplate', TaskTemplateSchema);

module.exports = TaskTemplate;












