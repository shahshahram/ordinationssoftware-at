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
  
  // Leitung der Ordination
  owner: {
    title: {
      type: String,
      trim: true,
      enum: ['Dr.', 'Dr. med.', 'Dr. med. univ.', 'Prim. Dr.', 'Univ.-Prof. Dr.', 'OA Dr.', 'Ass. Dr.', 'Mag.', 'Dipl.', '']
    },
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'diverse', ''],
      trim: true
    },
    specialty: {
      type: String,
      trim: true
    },
    academicTitle: {
      type: String,
      trim: true
    },
    licenseNumber: {
      type: String,
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
    website: {
      type: String,
      trim: true
    },
    taxNumber: {
      type: String,
      trim: true
    },
    uidNumber: {
      type: String,
      trim: true
    },
    bankAccounts: [{
      iban: {
        type: String,
        trim: true
      },
      bic: {
        type: String,
        trim: true
      },
      bankName: {
        type: String,
        trim: true
      },
      accountHolder: {
        type: String,
        trim: true
      },
      isDefault: {
        type: Boolean,
        default: false
      }
    }]
  },
  
  // Logo für Briefkopf
  logo: {
    filename: {
      type: String,
      trim: true
    },
    originalName: {
      type: String,
      trim: true
    },
    mimeType: {
      type: String,
      trim: true
    },
    size: {
      type: Number
    },
    path: {
      type: String,
      trim: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    width: {
      type: Number
    },
    height: {
      type: Number
    }
  },
  
  // Briefkopf-Vorlagen pro Dokumenttyp
  letterheadTemplates: {
    type: Map,
    of: {
      type: String,
      enum: ['template1', 'template2', 'template3', 'custom'],
      default: 'template1'
    },
    default: new Map()
  },
  
  // Briefvorlagen (Text-Vorlagen für Briefe)
  letterTemplates: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['greeting', 'closing', 'custom', 'anrede'],
      default: 'custom'
    },
    documentType: {
      type: String,
      enum: ['arztbrief', 'patientenbrief', 'rezept', 'ueberweisung', 'attest', 'befund', 'all'],
      default: 'all'
    },
    content: {
      type: String,
      required: true
    },
    placeholders: [{
      type: String,
      trim: true
    }],
    description: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
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
  
  // Online-Buchungs-Konfiguration
  onlineBooking: {
    // Double Opt-In für Neupatienten erforderlich
    doubleOptInRequired: {
      type: Boolean,
      default: true
    },
    // Automatische Bestätigung für bekannte Patienten
    autoConfirmKnownPatients: {
      type: Boolean,
      default: true
    }
  },
  
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

// code hat bereits unique: true, daher kein zusätzlicher Index nötig
locationSchema.index({ is_active: 1 });
locationSchema.index({ city: 1, state: 1 });

module.exports = mongoose.model('Location', locationSchema);
