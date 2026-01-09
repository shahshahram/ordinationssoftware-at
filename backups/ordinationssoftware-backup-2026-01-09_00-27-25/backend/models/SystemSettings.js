const mongoose = require('mongoose');

/**
 * SystemSettings Model
 * Speichert System-weite Einstellungen
 */
const SystemSettingsSchema = new mongoose.Schema({
  // Kategorie der Einstellung
  category: {
    type: String,
    required: true,
    enum: ['general', 'onlineBooking', 'billing', 'notifications', 'security', 'integration'],
    index: true
  },
  
  // Einstellungsschlüssel
  key: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  // Einstellungswert (kann verschiedene Typen haben)
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Datentyp des Wertes
  valueType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    default: 'string'
  },
  
  // Beschreibung der Einstellung
  description: {
    type: String,
    trim: true
  },
  
  // Standardwert
  defaultValue: {
    type: mongoose.Schema.Types.Mixed
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
  }
}, {
  timestamps: true
});

// Compound Index für eindeutige Kombination
SystemSettingsSchema.index({ category: 1, key: 1 }, { unique: true });

// Statische Methoden
SystemSettingsSchema.statics.getSetting = async function(category, key, defaultValue = null) {
  const setting = await this.findOne({ category, key });
  if (setting) {
    return setting.value;
  }
  return defaultValue;
};

SystemSettingsSchema.statics.setSetting = async function(category, key, value, valueType = 'string', userId = null) {
  const setting = await this.findOneAndUpdate(
    { category, key },
    {
      value,
      valueType,
      updatedBy: userId
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
  return setting;
};

SystemSettingsSchema.statics.getCategorySettings = async function(category) {
  const settings = await this.find({ category });
  const result = {};
  settings.forEach(setting => {
    result[setting.key] = setting.value;
  });
  return result;
};

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);

