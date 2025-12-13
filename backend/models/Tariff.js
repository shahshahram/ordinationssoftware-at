// Tarifverwaltung für GOÄ, KHO, ET

const mongoose = require('mongoose');

const TariffSchema = new mongoose.Schema({
  // Tarif-Identifikation
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Tariftyp
  tariffType: {
    type: String,
    enum: ['goae', 'kho', 'et', 'ebm', 'custom'],
    required: true,
    index: true
  },
  
  // GOÄ-spezifische Daten
  goae: {
    section: { type: String, trim: true }, // GOÄ-Abschnitt (z.B. "A", "B", "C")
    number: { type: String, trim: true }, // GOÄ-Nummer
    multiplier: { type: Number, default: 1.0, min: 0.1 }, // GOÄ-Faktor
    basePrice: { type: Number, min: 0 }, // Grundpreis in Cent
    minMultiplier: { type: Number, default: 0.5, min: 0.1 },
    maxMultiplier: { type: Number, default: 3.5, min: 0.1 }
  },
  
  // KHO/ET-spezifische Daten
  kho: {
    ebmCode: { type: String, trim: true }, // EBM-Code
    price: { type: Number, min: 0 }, // Preis in Cent
    category: { type: String, trim: true }, // Kategorie
    requiresApproval: { type: Boolean, default: false },
    billingFrequency: { 
      type: String, 
      enum: ['once', 'daily', 'weekly', 'monthly'], 
      default: 'once' 
    }
  },
  
  // Fachrichtung
  specialty: {
    type: String,
    enum: [
      'allgemeinmedizin',
      'chirurgie',
      'dermatologie',
      'gynaekologie',
      'orthopaedie',
      'neurologie',
      'kardiologie',
      'pneumologie',
      'gastroenterologie',
      'urologie',
      'ophthalmologie',
      'hno',
      'psychiatrie',
      'radiologie',
      'labor',
      'pathologie',
      'anästhesie',
      'notfallmedizin',
      'sportmedizin',
      'arbeitsmedizin',
      'allgemein'
    ],
    default: 'allgemein',
    index: true
  },
  
  // Gültigkeitszeitraum
  validFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  validUntil: {
    type: Date
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Zusatzinformationen
  notes: {
    type: String,
    trim: true
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indizes
TariffSchema.index({ tariffType: 1, isActive: 1 });
TariffSchema.index({ specialty: 1, isActive: 1 });
TariffSchema.index({ 'goae.section': 1, 'goae.number': 1 });
TariffSchema.index({ 'kho.ebmCode': 1 });

// Virtual für aktuellen Preis
TariffSchema.virtual('currentPrice').get(function() {
  if (this.tariffType === 'goae' && this.goae?.basePrice) {
    return Math.round(this.goae.basePrice * this.goae.multiplier);
  }
  if (this.tariffType === 'kho' && this.kho?.price) {
    return this.kho.price;
  }
  return 0;
});

// Statische Methoden
TariffSchema.statics.findByCode = function(code) {
  return this.findOne({ code, isActive: true });
};

TariffSchema.statics.findByType = function(tariffType, options = {}) {
  const query = { tariffType, isActive: true };
  if (options.specialty) {
    query.specialty = options.specialty;
  }
  const now = new Date();
  query.$or = [
    { validUntil: null },
    { validUntil: { $gte: now } }
  ];
  return this.find(query).sort({ code: 1 });
};

TariffSchema.statics.findGOAE = function(section = null) {
  const query = { tariffType: 'goae', isActive: true };
  if (section) {
    query['goae.section'] = section;
  }
  return this.find(query).sort({ 'goae.section': 1, 'goae.number': 1 });
};

TariffSchema.statics.findKHO = function() {
  return this.find({ tariffType: { $in: ['kho', 'et', 'ebm'] }, isActive: true })
    .sort({ 'kho.ebmCode': 1 });
};

module.exports = mongoose.model('Tariff', TariffSchema);















