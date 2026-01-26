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
    enum: ['goae', 'kho', 'et', 'ebm', 'custom'], // 'ebm' ist Legacy, wird als 'kho' behandelt
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
    // Neue korrekte Felder
    khoCode: { type: String, trim: true, index: true }, // KHO-Code (korrekte österreichische Bezeichnung)
    khoPrice: { type: Number, min: 0 }, // Preis in Euro (neues Feld)
    price: { type: Number, min: 0 }, // Preis in Cent (Legacy-Feld)
    points: { type: Number, min: 0 }, // Verrechnungseinheiten (Punkte)
    pointValue: { type: Number, min: 0 }, // Punktwert in Euro (z.B. 0.53 für OÖ, 0.49 für Wien)
    calculatedFromPoints: { type: Boolean, default: false }, // true = Preis wurde aus Punkten berechnet
    category: { type: String, trim: true }, // Kategorie
    billingGroup: { 
      type: String, 
      trim: true,
      enum: ['Ordination', 'Untersuchung', 'Behandlung', 'Sonderleistung', 'Grundleistung', 'Therapie', 'Besuch', 'labor', null],
      default: null
    }, // Abrechnungsgruppe (für RefundRate-Logik)
    requiresApproval: { type: Boolean, default: false },
    billingFrequency: { 
      type: String, 
      enum: ['once', 'daily', 'weekly', 'monthly', 'quarterly'], 
      default: 'once' 
    },
    // Limitierung pro Quartal/Patient
    limitation: {
      maxPerQuarter: { type: Number, min: 0 }, // Maximale Anzahl pro Quartal (z.B. 1)
      maxPerPatient: { type: Number, min: 0 }, // Maximale Anzahl pro Patient (z.B. 1)
      maxPercentage: { type: Number, min: 0, max: 100 }, // NEU: Maximale Prozentzahl (z.B. 15 für 15% der Fälle)
      period: { 
        type: String, 
        enum: ['day', 'week', 'month', 'quarter', 'year'], 
        default: 'quarter' 
      }, // Zeitraum für Limitierung
      description: { type: String, trim: true } // Beschreibung der Limitierung (z.B. "1 / Q" oder "max. 15%")
    },
    
    // Legacy-Feld für Backward Compatibility
    ebmCode: { type: String, trim: true }, // ⚠️ DEPRECATED: Verwende khoCode
    
    // Bundesland-spezifische Tarife (optional)
    federalState: {
      type: String,
      enum: ['burgenland', 'kaernten', 'niederoesterreich', 'oberoesterreich', 'salzburg', 'steiermark', 'tirol', 'vorarlberg', 'wien', null],
      default: null,
      index: true
    },
    
    // Versicherungsträger-spezifische Tarife
    insuranceProvider: {
      type: String,
      enum: ['oegk', 'bvaeb', 'svs', 'kfa', 'pva', 'vaeb', 'auva', 'all'],
      default: 'all', // 'all' = für alle Versicherungsträger gültig
      index: true
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
TariffSchema.index({ 'kho.khoCode': 1, 'kho.insuranceProvider': 1, 'kho.federalState': 1 });
TariffSchema.index({ 'kho.ebmCode': 1 }); // Legacy-Index für Backward Compatibility

// Pre-Hook: Migriere alte Felder und berechne Punktwert-Preise
TariffSchema.pre('save', function(next) {
  if (this.kho) {
    // Migriere ebmCode zu khoCode (Backward Compatibility)
    if (this.kho.ebmCode && !this.kho.khoCode) {
      this.kho.khoCode = this.kho.ebmCode;
    }
    // Migriere price zu khoPrice (wenn price vorhanden und khoPrice nicht)
    if (this.kho.price !== undefined && this.kho.price !== null && (this.kho.khoPrice === undefined || this.kho.khoPrice === null)) {
      // Wenn price > 1000, ist es wahrscheinlich in Cent, sonst in Euro
      this.kho.khoPrice = this.kho.price > 1000 ? this.kho.price / 100 : this.kho.price;
    }
    
    // Berechne khoPrice aus Punkten und Punktwert (wenn beide vorhanden)
    if (this.kho.points && this.kho.pointValue && (!this.kho.khoPrice || this.kho.calculatedFromPoints)) {
      this.kho.khoPrice = this.kho.points * this.kho.pointValue;
      this.kho.calculatedFromPoints = true;
    }
  }
  next();
});

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

// Virtual für KHO-Code (mit Fallback auf ebmCode)
TariffSchema.virtual('khoCode').get(function() {
  if (this.kho?.khoCode) return this.kho.khoCode;
  if (this.kho?.ebmCode) return this.kho.ebmCode; // Backward Compatibility
  return null;
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

TariffSchema.statics.findKHO = function(options = {}) {
  const query = { 
    tariffType: { $in: ['kho', 'et', 'ebm'] }, 
    isActive: true 
  };
  
  // Filter nach Versicherungsträger
  if (options.insuranceProvider) {
    query.$or = [
      { 'kho.insuranceProvider': options.insuranceProvider },
      { 'kho.insuranceProvider': 'all' }
    ];
  }
  
  // Filter nach Bundesland
  if (options.federalState) {
    query.$or = [
      ...(query.$or || []),
      { 'kho.federalState': options.federalState },
      { 'kho.federalState': null }
    ];
  }
  
  return this.find(query).sort({ 'kho.khoCode': 1, 'kho.ebmCode': 1 });
};

module.exports = mongoose.model('Tariff', TariffSchema);



























