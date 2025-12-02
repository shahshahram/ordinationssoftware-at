const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
  },
  address_line1: {
    type: String,
    required: true,
    trim: true
  },
  address_line2: {
    type: String,
    trim: true
  },
  postal_code: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  timezone: {
    type: String,
    default: 'Europe/Vienna',
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  color_hex: {
    type: String,
    default: '#2563EB',
    match: /^#[0-9A-F]{6}$/i
  },
  is_active: {
    type: Boolean,
    default: true
  },
  
  // Praxistyp für Abrechnung
  practiceType: {
    type: String,
    enum: ['kassenpraxis', 'wahlarzt', 'privat', 'gemischt'],
    default: 'gemischt',
    required: true,
    index: true
  },
  
  // Abrechnungs-Konfiguration
  billing: {
    // Standard-Abrechnungstyp für diesen Standort
    defaultBillingType: {
      type: String,
      enum: ['kassenarzt', 'wahlarzt', 'privat', 'sonderklasse'],
      default: null // null = automatisch basierend auf Patient
    },
    // Kassenarzt-spezifische Einstellungen
    kassenarzt: {
      enabled: {
        type: Boolean,
        default: true
      },
      // ÖGK-Vertragsnummer (falls vorhanden)
      ogkContractNumber: {
        type: String,
        trim: true
      },
      // Automatische OGK-Übermittlung
      autoSubmitOGK: {
        type: Boolean,
        default: false
      },
      // ELGA-Integration aktiviert
      elgaEnabled: {
        type: Boolean,
        default: false
      },
      // KIM-Integration aktiviert
      kimEnabled: {
        type: Boolean,
        default: false
      }
    },
    // Wahlarzt-spezifische Einstellungen
    wahlarzt: {
      enabled: {
        type: Boolean,
        default: true
      },
      // Standard-Erstattungssatz (z.B. 80%)
      defaultReimbursementRate: {
        type: Number,
        default: 0.80,
        min: 0,
        max: 1
      },
      // Automatische Erstattungsberechnung
      autoCalculateReimbursement: {
        type: Boolean,
        default: true
      }
    },
    // Privat-spezifische Einstellungen
    privat: {
      enabled: {
        type: Boolean,
        default: true
      },
      // Standard-Tarif (GOÄ, etc.)
      defaultTariff: {
        type: String,
        enum: ['GOÄ', 'custom'],
        default: 'GOÄ'
      }
    }
  },
  
  // Medizinische Fachrichtungen/Spezialisierungen
  // Referenziert die MedicalSpecialty-Collection (code-Feld)
  specialties: [{
    type: String,
    trim: true,
    lowercase: true,
    index: true
    // Kein enum mehr - Fachrichtungen werden dynamisch aus MedicalSpecialty-Collection geladen
  }],
  
  // XDS Registry Konfiguration
  xdsRegistry: {
    enabled: {
      type: Boolean,
      default: false
    },
    registryUrl: {
      type: String,
      trim: true
    },
    repositoryLocation: {
      type: String,
      trim: true
    },
    repositoryUniqueId: {
      type: String,
      trim: true
    },
    homeCommunityId: {
      type: String,
      trim: true
    },
    // Berechtigungsregeln für XDS-Operationen
    permissions: {
      create: {
        roles: [String],
        default: ['admin', 'super_admin', 'doctor', 'arzt']
      },
      update: {
        roles: [String],
        default: ['admin', 'super_admin', 'doctor', 'arzt']
      },
      deprecate: {
        roles: [String],
        default: ['admin', 'super_admin']
      },
      delete: {
        roles: [String],
        default: ['admin', 'super_admin']
      },
      retrieve: {
        roles: [String],
        default: ['admin', 'super_admin', 'doctor', 'arzt', 'nurse', 'assistent']
      },
      query: {
        roles: [String],
        default: ['admin', 'super_admin', 'doctor', 'arzt', 'nurse', 'assistent']
      }
    },
    // Konfiguration für Patient-Upload
    allowPatientUpload: {
      type: Boolean,
      default: false
    },
    patientUploadMaxSize: {
      type: Number,
      default: 10485760 // 10 MB
    },
    patientUploadAllowedTypes: {
      type: [String],
      default: ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff']
    }
  }
}, {
  timestamps: true
});

// Indizes
locationSchema.index({ code: 1 });
locationSchema.index({ is_active: 1 });
locationSchema.index({ city: 1, state: 1 });

module.exports = mongoose.model('Location', locationSchema);
