const mongoose = require('mongoose');

const ServiceCatalogSchema = new mongoose.Schema({
  // Grunddaten
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true
    // unique: true erstellt automatisch einen Index, daher kein index: true nötig
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
  category: { 
    type: String, 
    trim: true,
    index: true
  },
  
  // Fachrichtung/Spezialisierung
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
      'arbeitsmedizin'
    ],
    index: true
  },
  
  // Medizinische Unterscheidung
  isMedical: {
    type: Boolean,
    default: true
  },
  
  // Rollen- und Berechtigungen
  required_role: { 
    type: String, 
    enum: ['arzt', 'therapeut', 'assistenz', 'schwester', 'rezeption', null],
    default: null
  },
  visible_to_roles: [{
    type: String,
    enum: ['arzt', 'therapeut', 'assistenz', 'schwester', 'rezeption', 'admin']
  }],
  
  // Benutzer-Zuordnung für Terminvergabe
  assigned_users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  requires_user_selection: {
    type: Boolean,
    default: false
  },
  
  // Zeit- und Dauer
  base_duration_min: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  buffer_before_min: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  buffer_after_min: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  
  // Parallelisierung
  can_overlap: { 
    type: Boolean, 
    default: false 
  },
  parallel_group: { 
    type: String, 
    trim: true 
  },
  
  // Ressourcen
  requires_room: { 
    type: Boolean, 
    default: false 
  },
  required_device_type: { 
    type: String, 
    trim: true 
  },
  required_room_type: {
    type: String,
    trim: true
  },
  
  // Geräte-Auswahl
  assigned_devices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    index: true
  }],
  requires_device_selection: {
    type: Boolean,
    default: false
  },
  device_quantity_required: {
    type: Number,
    default: 1,
    min: 1
  },
  device_selection_mode: {
    type: String,
    enum: ['specific', 'type'],
    default: 'specific'
  },
  max_available_devices: {
    type: Number,
    min: 1
  },
  
  // Raum-Auswahl
  assigned_rooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    index: true
  }],
  requires_room_selection: {
    type: Boolean,
    default: false
  },
  room_quantity_required: {
    type: Number,
    default: 1,
    min: 1
  },
  room_selection_mode: {
    type: String,
    enum: ['specific', 'type'],
    default: 'specific'
  },
  max_available_rooms: {
    type: Number,
    min: 1
  },
  
  // Patienteneignung
  min_age_years: { 
    type: Number, 
    min: 0 
  },
  max_age_years: { 
    type: Number, 
    min: 0 
  },
  requires_consent: { 
    type: Boolean, 
    default: false 
  },
  
  // Buchbarkeit
  online_bookable: { 
    type: Boolean, 
    default: true 
  },
  
  // Anamnese-Vorabfragen für Online-Buchungen
  anamnesisQuestions: [{
    // Frage-ID (eindeutig innerhalb des Services)
    questionId: {
      type: String,
      required: true,
      trim: true
    },
    // Fragetext
    question: {
      type: String,
      required: true,
      trim: true
    },
    // Fragetyp
    type: {
      type: String,
      enum: ['text', 'textarea', 'number', 'date', 'yes_no', 'multiple_choice', 'scale'],
      default: 'text'
    },
    // Für multiple_choice: Optionen
    options: [{
      value: { type: String, required: true },
      label: { type: String, required: true }
    }],
    // Für scale: Min/Max Werte
    scaleMin: { type: Number, default: 0 },
    scaleMax: { type: Number, default: 10 },
    scaleLabelMin: { type: String },
    scaleLabelMax: { type: String },
    // Pflichtfeld?
    required: {
      type: Boolean,
      default: false
    },
    // Reihenfolge
    order: {
      type: Number,
      default: 0
    },
    // Aktiv/Inaktiv
    isActive: {
      type: Boolean,
      default: true
    },
    // Platzhalter/Hilfetext
    placeholder: { type: String },
    helperText: { type: String }
  }],
  
  // Online-Kontingente (Termin-Cluster für bestimmte Service-Typen)
  online_contingents: [{
    // Zeitfenster (z.B. "08:00-12:00" für Blutabnahmen)
    timeWindow: {
      start: { type: String, required: true }, // HH:MM Format
      end: { type: String, required: true }    // HH:MM Format
    },
    // Wochentage (0=Sonntag, 1=Montag, ..., 6=Samstag)
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }],
    // Maximale Anzahl von Online-Buchungen in diesem Zeitfenster
    maxOnlineBookings: {
      type: Number,
      default: 0, // 0 = unbegrenzt
      min: 0
    },
    // Priorität (höhere Priorität = wird zuerst belegt)
    priority: {
      type: Number,
      default: 0
    },
    // Beschreibung des Kontingents
    description: {
      type: String,
      trim: true
    },
    // Aktiv/Inaktiv
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Abrechnung - Preis in Euro
  price: { 
    type: Number, 
    min: 0 
  },
  // Legacy: Altes Feld für Backward Compatibility (wird automatisch migriert)
  price_cents: { 
    type: Number, 
    min: 0 
  },
  billing_code: { 
    type: String, 
    trim: true 
  },
  
  // Abrechnungstyp und Preise
  billingType: { 
    type: String, 
    enum: ['kassenarzt', 'wahlarzt', 'privat', 'both'], 
    default: 'both' 
  },
  
  // ÖGK-Kassenarzt-Abrechnung - alle Preise in Euro
  ogk: {
    // Neue korrekte Felder (KHO statt EBM)
    khoCode: { type: String, trim: true, index: true }, // KHO-Code (korrekte österreichische Bezeichnung)
    khoPrice: { type: Number, min: 0 }, // KHO-Preis in Euro
    khoGroup: { type: String, trim: true }, // z.B. "Konsultation", "Untersuchung", "Behandlung"
    khoSubGroup: { type: String, trim: true }, // z.B. "Erstkonsultation", "Folgekonsultation"
    points: { type: Number, min: 0 }, // Verrechnungseinheiten (Punkte)
    pointValue: { type: Number, min: 0 }, // Punktwert in Euro (z.B. 0.53 für OÖ, 0.49 für Wien)
    calculatedFromPoints: { type: Boolean, default: false }, // true = Preis wurde aus Punkten berechnet
    billingGroup: { 
      type: String, 
      trim: true,
      enum: ['Ordination', 'Untersuchung', 'Behandlung', 'Sonderleistung', 'Grundleistung', 'Therapie', null],
      default: null
    }, // Abrechnungsgruppe (für RefundRate-Logik: Grundleistung = 1.0, sonst = 0.8)
    
    // Legacy-Felder für Backward Compatibility (werden automatisch migriert)
    ebmCode: { type: String, trim: true }, // ⚠️ DEPRECATED: Verwende khoCode
    ebmPrice: { type: Number, min: 0 }, // ⚠️ DEPRECATED: Verwende khoPrice
    ebmGroup: { type: String, trim: true }, // ⚠️ DEPRECATED: Verwende khoGroup
    ebmSubGroup: { type: String, trim: true }, // ⚠️ DEPRECATED: Verwende khoSubGroup
    
    requiresApproval: { type: Boolean, default: false },
    billingFrequency: { type: String, enum: ['once', 'periodic', 'quarterly'], default: 'once' },
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
    
    // Bundesland-spezifische Tarife (optional, falls Honorarordnung nach Bundesland getrennt)
    federalState: {
      type: String,
      enum: ['burgenland', 'kaernten', 'niederoesterreich', 'oberoesterreich', 'salzburg', 'steiermark', 'tirol', 'vorarlberg', 'wien', null],
      default: null,
      index: true
    },
    
    // Versicherungsträger-spezifische Tarife
    insuranceProvider: {
      type: String,
      enum: ['oegk', 'bvaeb', 'svs', 'kfa', 'pva', 'vaeb', 'auva', 'all', null],
      default: 'all', // 'all' = für alle Versicherungsträger gültig
      index: true
    },
    
    // Zusatzleistungen
    additionalServices: [{
      code: { type: String, trim: true },
      description: { type: String, trim: true },
      price: { type: Number, min: 0 }
    }],
    
    // NEU: Ausschluss-Regeln (Conflict-Detection)
    conflictRules: {
      // Array von Service-Codes, die nicht gleichzeitig erlaubt sind
      conflictsWith: [{ type: String, trim: true }],
      // true = Konflikt nur am selben Tag
      conflictsOnSameDay: { type: Boolean, default: true },
      // Konflikt in Zeitraum (optional)
      conflictsInSamePeriod: {
        period: { 
          type: String, 
          enum: ['day', 'week', 'month', 'quarter'], 
          default: 'day' 
        },
        conflictsWith: [{ type: String, trim: true }]
      },
      // true = Muss von anderem Arzt sein (optional)
      requiresDifferentDoctor: { type: Boolean, default: false },
      // true = Arzt kann Konflikt überschreiben (mit Begründung)
      allowOverride: { type: Boolean, default: false },
      // true = Überschreibung erfordert Begründung
      overrideRequiresJustification: { type: Boolean, default: true }
    },
    
    // NEU: Begründungspflicht-Regeln
    justificationRules: {
      // true = Begründung ist Pflicht
      requiresJustification: { type: Boolean, default: false },
      // Art der Begründung
      justificationType: { 
        type: String, 
        enum: ['text', 'time', 'diagnosis', 'combination'], 
        default: 'text' 
      },
      // Welche Felder sind Pflicht
      justificationFields: {
        text: { type: Boolean, default: false },        // Textfeld erforderlich
        time: { type: Boolean, default: false },        // Uhrzeit erforderlich
        diagnosis: { type: Boolean, default: false },    // Diagnose erforderlich
        urgency: { type: Boolean, default: false },     // Dringlichkeit erforderlich
        reason: { type: Boolean, default: false }       // Grund erforderlich
      },
      // Mindestlänge für Text (optional)
      minLength: { type: Number, min: 0 },
      // Maximallänge für Text (optional)
      maxLength: { type: Number, min: 0 },
      // Regex-Pattern für Validierung (optional)
      validationPattern: { type: String, trim: true }
    }
  },
  
  // Wahlarzt-Abrechnung - alle Preise in Euro
  wahlarzt: {
    price: { type: Number, min: 0 }, // Preis in Euro (Netto oder Brutto, je nach priceType)
    priceType: { 
      type: String, 
      enum: ['netto', 'brutto'], 
      default: 'netto' // Standard: Netto-Preis
    },
    reimbursementRate: { type: Number, default: 0.80, min: 0, max: 1 },
    maxReimbursement: { type: Number, min: 0 }, // Erstattung in Euro
    requiresPreApproval: { type: Boolean, default: false }
  },
  
  // Privatärztliche Abrechnung - Preis in Euro
  private: {
    price: { type: Number, min: 0 }, // Preis in Euro (Netto oder Brutto, je nach priceType)
    priceType: { 
      type: String, 
      enum: ['netto', 'brutto'], 
      default: 'netto' // Standard: Netto-Preis
    },
    noInsurance: { type: Boolean, default: true }
  },
  
  // Selbstbehalt - alle Beträge in Euro
  copay: {
    applicable: { type: Boolean, default: false },
    amount: { type: Number, default: 0, min: 0 }, // Betrag in Euro
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    maxAmount: { type: Number, min: 0 }, // Maximalbetrag in Euro
    exempt: { type: Boolean, default: false }
  },
  
  // Kostenstruktur (für BI-Dashboard) - alle Werte in Euro
  costs: {
    materialCosts: {
      type: Number,
      default: 0,
      min: 0
    },
    equipmentCosts: {
      type: Number,
      default: 0,
      min: 0
    },
    variableCosts: {
      type: Number,
      default: 0,
      min: 0
    },
    fixedCosts: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Umsatzsteuer (USt) - optional, falls nicht gesetzt wird automatische Logik verwendet
  taxRate: {
    type: Number,
    min: 0,
    max: 100,
    default: null // null = automatische Logik verwenden (Kassenarzt: 0%, Wahlarzt/Privat: 20%)
  },
  
  // Zusätzliche Informationen
  notes: { 
    type: String, 
    trim: true 
  },
  
  // UI-Farben für Kalender
  color_hex: {
    type: String,
    default: '#2563EB',
    match: /^#[0-9A-F]{6}$/i,
    trim: true
  },
  
  // Schnellauswahl für Favoriten
  quick_select: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Status und Versionierung
  is_active: { 
    type: Boolean, 
    default: true,
    index: true
  },
  version: { 
    type: Number, 
    default: 1 
  },
  
  // Standort-Zuordnung
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    index: true
  },
  
  // Audit-Felder
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

// Indizes für Performance
ServiceCatalogSchema.index({ code: 1, location_id: 1 });
ServiceCatalogSchema.index({ category: 1, is_active: 1 });
ServiceCatalogSchema.index({ required_role: 1, is_active: 1 });
ServiceCatalogSchema.index({ online_bookable: 1, is_active: 1 });
ServiceCatalogSchema.index({ quick_select: 1, is_active: 1 });
ServiceCatalogSchema.index({ 'ogk.khoCode': 1, 'ogk.insuranceProvider': 1, 'ogk.federalState': 1 });
ServiceCatalogSchema.index({ 'ogk.ebmCode': 1 }); // Legacy-Index für Backward Compatibility

// Virtual für Gesamtdauer
ServiceCatalogSchema.virtual('total_duration_min').get(function() {
  return this.base_duration_min + this.buffer_before_min + this.buffer_after_min;
});

// Virtual für Preis (bereits in Euro, für Backward Compatibility)
ServiceCatalogSchema.virtual('price_euro').get(function() {
  // Wenn price vorhanden, verwende es direkt (bereits in Euro)
  if (this.price !== undefined && this.price !== null) {
    return this.price.toFixed(2);
  }
  // Fallback: Altes price_cents Feld (in Cent) umrechnen
  return this.price_cents ? (this.price_cents / 100).toFixed(2) : null;
});

// Pre-Hook: Migriere price_cents zu price und ebmCode/ebmPrice zu khoCode/khoPrice
ServiceCatalogSchema.pre('save', function(next) {
  // Migriere price_cents zu price
  if (this.price_cents && (this.price === undefined || this.price === null)) {
    this.price = this.price_cents / 100;
  }
  if (this.price !== undefined && this.price !== null && (!this.price_cents || this.price_cents === 0)) {
    this.price_cents = Math.round(this.price * 100);
  }
  
  // Migriere ebmCode/ebmPrice zu khoCode/khoPrice (Backward Compatibility)
  if (this.ogk) {
    if (this.ogk.ebmCode && !this.ogk.khoCode) {
      this.ogk.khoCode = this.ogk.ebmCode;
    }
    if (this.ogk.ebmPrice !== undefined && this.ogk.ebmPrice !== null && (this.ogk.khoPrice === undefined || this.ogk.khoPrice === null)) {
      this.ogk.khoPrice = this.ogk.ebmPrice;
    }
    if (this.ogk.ebmGroup && !this.ogk.khoGroup) {
      this.ogk.khoGroup = this.ogk.ebmGroup;
    }
    if (this.ogk.ebmSubGroup && !this.ogk.khoSubGroup) {
      this.ogk.khoSubGroup = this.ogk.ebmSubGroup;
    }
    // Setze billingFrequency auf 'quarterly' wenn limitation.maxPerQuarter vorhanden ist
    if (this.ogk.limitation?.maxPerQuarter && this.ogk.billingFrequency === 'once') {
      this.ogk.billingFrequency = 'quarterly';
    }
  }
  
  next();
});

// Methoden
ServiceCatalogSchema.methods.isEligibleForPatient = function(patientAge) {
  if (this.min_age_years && patientAge < this.min_age_years) return false;
  if (this.max_age_years && patientAge > this.max_age_years) return false;
  return true;
};

ServiceCatalogSchema.methods.canBePerformedBy = function(userRole) {
  if (!this.required_role) return true;
  return this.required_role === userRole;
};

ServiceCatalogSchema.methods.isVisibleToRole = function(userRole) {
  if (!this.visible_to_roles || this.visible_to_roles.length === 0) return true;
  return this.visible_to_roles.includes(userRole);
};

ServiceCatalogSchema.methods.isAssignedToUser = function(userId) {
  if (!this.assigned_users || this.assigned_users.length === 0) return true;
  return this.assigned_users.some(user => user.toString() === userId.toString());
};

ServiceCatalogSchema.methods.getAvailableUsers = function() {
  return this.assigned_users || [];
};

ServiceCatalogSchema.methods.getAvailableDevices = function() {
  return this.assigned_devices || [];
};

ServiceCatalogSchema.methods.getAvailableRooms = function() {
  return this.assigned_rooms || [];
};

ServiceCatalogSchema.methods.requiresDeviceSelection = function() {
  return this.requires_device_selection && this.assigned_devices && this.assigned_devices.length > 0;
};

ServiceCatalogSchema.methods.requiresRoomSelection = function() {
  return this.requires_room_selection && this.assigned_rooms && this.assigned_rooms.length > 0;
};

ServiceCatalogSchema.methods.isDeviceAssigned = function(deviceId) {
  if (!this.assigned_devices || this.assigned_devices.length === 0) return true;
  return this.assigned_devices.some(device => device.toString() === deviceId.toString());
};

ServiceCatalogSchema.methods.isRoomAssigned = function(roomId) {
  if (!this.assigned_rooms || this.assigned_rooms.length === 0) return true;
  return this.assigned_rooms.some(room => room.toString() === roomId.toString());
};

module.exports = mongoose.model('ServiceCatalog', ServiceCatalogSchema);