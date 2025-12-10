const mongoose = require('mongoose');

// Erweiterte Patient-Schema für österreichische Praxisstandards
const PatientExtendedSchema = new mongoose.Schema({
  // Basis-Identifikation
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Stammdaten (Pflichtfelder nach österreichischem Standard)
  firstName: {
    type: String,
    required: [true, 'Vorname ist erforderlich'],
    trim: true,
    maxlength: [50, 'Vorname darf maximal 50 Zeichen haben']
  },
  lastName: {
    type: String,
    required: [true, 'Nachname ist erforderlich'],
    trim: true,
    maxlength: [50, 'Nachname darf maximal 50 Zeichen haben']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Geburtsdatum ist erforderlich'],
    validate: {
      validator: function(value) {
        return value < new Date();
      },
      message: 'Geburtsdatum muss in der Vergangenheit liegen'
    }
  },
  gender: {
    type: String,
    required: [true, 'Geschlecht ist erforderlich'],
    enum: {
      values: ['m', 'w', 'd'],
      message: 'Geschlecht muss m, w oder d sein'
    }
  },
  socialSecurityNumber: {
    type: String,
    required: [true, 'Sozialversicherungsnummer ist erforderlich'],
    validate: {
      validator: function(value) {
        return /^\d{10,12}$/.test(value);
      },
      message: 'Sozialversicherungsnummer muss 10-12 Ziffern haben'
    },
    index: true
  },
  insuranceProvider: {
    type: String,
    required: [true, 'Versicherungsanstalt ist erforderlich'],
    enum: {
      values: [
        'ÖGK (Österreichische Gesundheitskasse)',
        'BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)',
        'SVS (Sozialversicherung der Selbständigen)',
        'KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)',
        'VAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)',
        'BVA (Versicherungsanstalt öffentlich Bediensteter)',
        'PVA (Pensionsversicherungsanstalt)',
        'AUVA (Allgemeine Unfallversicherungsanstalt)',
        'GKK (Gebietskrankenkasse)',
        'VA (Versicherungsanstalt)',
        'Privatversicherung',
        'Selbstzahler',
        'Andere'
      ],
      message: 'Ungültige Versicherungsanstalt'
    }
  },

  // Adressdaten
  address: {
    street: {
      type: String,
      required: [true, 'Straße ist erforderlich'],
      trim: true,
      maxlength: [100, 'Straße darf maximal 100 Zeichen haben']
    },
    zipCode: {
      type: String,
      required: [true, 'PLZ ist erforderlich'],
      validate: {
        validator: function(value) {
          return /^\d{4,5}$/.test(value);
        },
        message: 'PLZ muss 4-5 Ziffern haben'
      }
    },
    city: {
      type: String,
      required: [true, 'Ort ist erforderlich'],
      trim: true,
      maxlength: [50, 'Ort darf maximal 50 Zeichen haben']
    },
    country: {
      type: String,
      required: [true, 'Land ist erforderlich'],
      default: 'Österreich',
      trim: true
    }
  },

  // Kontaktdaten
  phone: {
    type: String,
    required: [true, 'Telefonnummer ist erforderlich'],
    validate: {
      validator: function(value) {
        return /^[\+]?[\d\s\-\(\)]{7,}$/.test(value);
      },
      message: 'Ungültige Telefonnummer'
    }
  },
  email: {
    type: String,
    validate: {
      validator: function(value) {
        if (!value) return true; // Optional
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      },
      message: 'Ungültige E-Mail-Adresse'
    },
    trim: true,
    lowercase: true
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Notfallkontakt Name darf maximal 100 Zeichen haben']
    },
    phone: {
      type: String,
      validate: {
        validator: function(value) {
          if (!value) return true; // Optional
          return /^[\+]?[\d\s\-\(\)]{7,}$/.test(value);
        },
        message: 'Ungültige Notfallkontakt Telefonnummer'
      }
    },
    relationship: {
      type: String,
      trim: true,
      maxlength: [50, 'Verwandtschaftsverhältnis darf maximal 50 Zeichen haben']
    }
  },

  // Medizinische Basisdaten
  primaryCarePhysician: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Hausarzt Name darf maximal 100 Zeichen haben']
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Hausarzt Ort darf maximal 100 Zeichen haben']
    },
    phone: {
      type: String,
      validate: {
        validator: function(value) {
          if (!value) return true; // Optional
          return /^[\+]?[\d\s\-\(\)]{7,}$/.test(value);
        },
        message: 'Ungültige Hausarzt Telefonnummer'
      }
    }
  },

  // Medikation - Unterstützt sowohl Strings als auch Objekte
  currentMedications: [{
    type: mongoose.Schema.Types.Mixed,
    validate: {
      validator: function(v) {
        // Erlaubt Strings oder Objekte mit name
        return typeof v === 'string' || (typeof v === 'object' && v.name);
      },
      message: 'Medikament muss ein String oder Objekt mit name sein'
    }
  }],

  // Allergien - Unterstützt sowohl Strings als auch Objekte
  allergies: [{
    type: mongoose.Schema.Types.Mixed,
    validate: {
      validator: function(v) {
        // Erlaubt Strings oder Objekte mit description
        return typeof v === 'string' || (typeof v === 'object' && v.description);
      },
      message: 'Allergie muss ein String oder Objekt mit description sein'
    }
  }],

  // Vorerkrankungen
  preExistingConditions: [{
    type: String,
    trim: true,
    maxlength: [100, 'Vorerkrankung darf maximal 100 Zeichen haben']
  }],

  // Medizinische Vorgeschichte
  medicalHistory: [{
    type: String,
    trim: true,
    maxlength: [200, 'Medizinische Vorgeschichte darf maximal 200 Zeichen haben']
  }],

  // Operationen
  previousSurgeries: [{
    year: {
      type: String,
      required: true,
      validate: {
        validator: function(value) {
          const year = parseInt(value);
          const currentYear = new Date().getFullYear();
          return year >= 1900 && year <= currentYear;
        },
        message: 'Ungültiges Operationsjahr'
      }
    },
    procedure: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Eingriff darf maximal 200 Zeichen haben']
    },
    hospital: {
      type: String,
      trim: true,
      maxlength: [100, 'Krankenhaus darf maximal 100 Zeichen haben']
    },
    surgeon: {
      type: String,
      trim: true,
      maxlength: [100, 'Chirurg darf maximal 100 Zeichen haben']
    }
  }],


  // Weitere medizinische Daten
  bloodType: {
    type: String,
    default: 'Unbekannt',
    enum: {
      values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-', 'Unbekannt'],
      message: 'Ungültige Blutgruppe'
    }
  },
  height: {
    type: Number,
    min: [50, 'Größe muss mindestens 50 cm sein'],
    max: [250, 'Größe darf maximal 250 cm sein']
  },
  weight: {
    type: Number,
    min: [10, 'Gewicht muss mindestens 10 kg sein'],
    max: [500, 'Gewicht darf maximal 500 kg sein']
  },
  bmi: {
    type: Number,
    min: [10, 'BMI muss mindestens 10 sein'],
    max: [100, 'BMI darf maximal 100 sein']
  },
  isPregnant: {
    type: Boolean,
    default: false,
    validate: {
      validator: function(value) {
        // Nur bei Frauen (w) kann Schwangerschaft true sein
        return this.gender !== 'm' || !value;
      },
      message: 'Schwangerschaft kann nur bei Frauen angegeben werden'
    }
  },
  pregnancyWeek: {
    type: Number,
    min: [1, 'Schwangerschaftswoche muss mindestens 1 sein'],
    max: [42, 'Schwangerschaftswoche kann maximal 42 sein'],
    validate: {
      validator: function(value) {
        // Schwangerschaftswoche nur wenn schwanger
        return !this.isPregnant || (value >= 1 && value <= 42);
      },
      message: 'Schwangerschaftswoche ist erforderlich wenn schwanger'
    }
  },
  isBreastfeeding: {
    type: Boolean,
    default: false,
    validate: {
      validator: function(value) {
        // Nur bei Frauen (w) kann Stillen true sein
        return this.gender !== 'm' || !value;
      },
      message: 'Stillen kann nur bei Frauen angegeben werden'
    }
  },
  pregnancyDueDate: {
    type: Date,
    validate: {
      validator: function(value) {
        if (!this.isPregnant || !value) return true;
        return value > new Date();
      },
      message: 'Entbindungstermin muss in der Zukunft liegen'
    }
  },

  // Medizinische Implantate und Geräte
  hasPacemaker: {
    type: Boolean,
    default: false
  },
  hasDefibrillator: {
    type: Boolean,
    default: false
  },
  implants: [{
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Implantat-Typ darf maximal 100 Zeichen haben']
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Implantat-Ort darf maximal 100 Zeichen haben']
    },
    date: {
      type: Date,
      validate: {
        validator: function(value) {
          if (!value) return true;
          return value <= new Date();
        },
        message: 'Implantat-Datum darf nicht in der Zukunft liegen'
      }
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [200, 'Implantat-Notizen dürfen maximal 200 Zeichen haben']
    }
  }],

  // Raucherstatus
  smokingStatus: {
    type: String,
    enum: ['non-smoker', 'former-smoker', 'current-smoker'],
    default: 'non-smoker'
  },
  cigarettesPerDay: {
    type: Number,
    min: [0, 'Zigaretten pro Tag dürfen nicht negativ sein'],
    max: [100, 'Zigaretten pro Tag dürfen maximal 100 sein'],
    validate: {
      validator: function(value) {
        // Nur bei Rauchern ist Zigarettenanzahl relevant
        return this.smokingStatus !== 'current-smoker' || (value >= 0 && value <= 100);
      },
      message: 'Zigaretten pro Tag ist nur bei aktiven Rauchern relevant'
    }
  },
  yearsOfSmoking: {
    type: Number,
    min: [0, 'Rauchejahre dürfen nicht negativ sein'],
    max: [100, 'Rauchejahre dürfen maximal 100 sein'],
    validate: {
      validator: function(value) {
        // Nur bei ehemaligen oder aktuellen Rauchern relevant
        return this.smokingStatus === 'non-smoker' || (value >= 0 && value <= 100);
      },
      message: 'Rauchejahre sind nur bei Rauchern relevant'
    }
  },
  quitSmokingDate: {
    type: Date,
    validate: {
      validator: function(value) {
        // Nur bei ehemaligen Rauchern relevant
        if (this.smokingStatus !== 'former-smoker' || !value) return true;
        return value <= new Date();
      },
      message: 'Aufhördatum darf nicht in der Zukunft liegen'
    }
  },

  // Administrative Daten
  referralSource: {
    type: String,
    enum: {
      values: ['self', 'physician', 'hospital', 'specialist', 'other'],
      message: 'Ungültige Zuweisungsquelle'
    },
    default: 'self'
  },
  visitReason: {
    type: String,
    trim: true,
    maxlength: [1000, 'Besuchsgrund darf maximal 1000 Zeichen haben']
  },
  admissionDate: {
    type: Date,
    default: Date.now
  },

  // Einverständniserklärungen
  dataProtectionConsent: {
    type: Boolean,
    required: [true, 'Datenschutz-Einverständnis ist erforderlich'],
    default: false
  },
  dataProtectionConsentDate: {
    type: Date,
    default: Date.now
  },
  electronicCommunicationConsent: {
    type: Boolean,
    default: false
  },
  electronicCommunicationConsentDate: {
    type: Date
  },

  // Status und Metadaten
  status: {
    type: String,
    required: true,
    enum: {
      values: ['aktiv', 'wartend', 'inaktiv', 'entlassen', 'self-checkin'],
      message: 'Ungültiger Status'
    },
    default: 'aktiv',
    index: true
  },
  hasHint: {
    type: Boolean,
    default: false,
    index: true
  },
  hintText: {
    type: String,
    trim: true,
    maxlength: [500, 'Hinweistext darf maximal 500 Zeichen haben']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastVisit: {
    type: Date
  },

  // Medizinische Vorgeschichte
  medicalHistory: [{
    type: String,
    trim: true,
    maxlength: [500, 'Medizinische Vorgeschichte darf maximal 500 Zeichen haben']
  }],

  // Impfungen
  vaccinations: [{
    name: {
      type: String,
      required: false,
      trim: true,
      maxlength: [100, 'Impfung Name darf maximal 100 Zeichen haben']
    },
    date: {
      type: Date,
      required: false
    },
    nextDue: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [200, 'Impfung Notizen dürfen maximal 200 Zeichen haben']
    }
  }],

  // Infektionen
  infections: [{
    type: {
      type: String,
      trim: true,
      maxlength: [100, 'Infektionstyp darf maximal 100 Zeichen haben']
    },
    detectedDate: {
      type: Date,
      validate: {
        validator: function(value) {
          if (!value) return true;
          return value <= new Date();
        },
        message: 'Erkennungsdatum darf nicht in der Zukunft liegen'
      }
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Infektionsort darf maximal 100 Zeichen haben']
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'colonized'],
      default: 'active'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Infektions-Notizen dürfen maximal 500 Zeichen haben']
    }
  }],

  // Schwangerschaft (nur für Frauen)
  isPregnant: {
    type: Boolean,
    default: false,
    validate: {
      validator: function(value) {
        // Nur bei Frauen (w) kann Schwangerschaft true sein
        return this.gender !== 'm' || !value;
      },
      message: 'Schwangerschaft kann nur bei Frauen angegeben werden'
    }
  },
  pregnancyWeek: {
    type: Number,
    min: [1, 'Schwangerschaftswoche muss mindestens 1 sein'],
    max: [42, 'Schwangerschaftswoche kann maximal 42 sein'],
    validate: {
      validator: function(value) {
        // Schwangerschaftswoche nur wenn schwanger
        return !this.isPregnant || (value >= 1 && value <= 42);
      },
      message: 'Schwangerschaftswoche ist erforderlich wenn schwanger'
    }
  },

  // Zusätzliche Notizen
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notizen dürfen maximal 2000 Zeichen haben']
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Besondere Anweisungen dürfen maximal 1000 Zeichen haben']
  },

  // Standort-Zuordnung (optional - Patienten können zu mehreren Standorten gehören)
  // Primärer Standort (für Patienten, die hauptsächlich an einem Standort behandelt werden)
  primaryLocationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    index: true
  },
  // Alle Standorte, an denen der Patient behandelt wird (optional)
  locationIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    index: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuelle Felder
PatientExtendedSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

PatientExtendedSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

PatientExtendedSchema.virtual('addressString').get(function() {
  if (!this.address) return '';
  return `${this.address.street}, ${this.address.zipCode} ${this.address.city}`;
});

// Indizes
PatientExtendedSchema.index({ socialSecurityNumber: 1 });
PatientExtendedSchema.index({ lastName: 1, firstName: 1 });
PatientExtendedSchema.index({ 'address.zipCode': 1 });
PatientExtendedSchema.index({ status: 1 });
PatientExtendedSchema.index({ createdAt: -1 });

// Pre-save Middleware
PatientExtendedSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Set electronicCommunicationConsentDate if consent is given
  if (this.electronicCommunicationConsent && !this.electronicCommunicationConsentDate) {
    this.electronicCommunicationConsentDate = new Date();
  }
  
  next();
});

// Statische Methoden
PatientExtendedSchema.statics.findByInsuranceProvider = function(provider) {
  return this.find({ insuranceProvider: provider });
};

PatientExtendedSchema.statics.findByZipCode = function(zipCode) {
  return this.find({ 'address.zipCode': zipCode });
};

PatientExtendedSchema.statics.findByAgeRange = function(minAge, maxAge) {
  const today = new Date();
  const maxBirthDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
  const minBirthDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
  
  return this.find({
    dateOfBirth: {
      $gte: minBirthDate,
      $lte: maxBirthDate
    }
  });
};

module.exports = mongoose.model('PatientExtended', PatientExtendedSchema);


