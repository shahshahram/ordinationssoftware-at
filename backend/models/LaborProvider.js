const mongoose = require('mongoose');

const LaborProviderSchema = new mongoose.Schema({
  // Name des Labors
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  
  // Kurzname/Code
  code: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    uppercase: true
  },
  
  // Beschreibung
  description: {
    type: String,
    trim: true
  },
  
  // Kontaktdaten
  contact: {
    address: {
      street: String,
      city: String,
      postalCode: String,
      country: { type: String, default: 'Österreich' }
    },
    phone: String,
    email: String,
    website: String
  },
  
  // Integration-Konfiguration
  integration: {
    // Protokoll-Typ
    protocol: {
      type: String,
      enum: ['fhir', 'hl7v2', 'hl7v3', 'rest', 'ftp', 'sftp', 'email', 'manual'],
      required: true,
      default: 'fhir'
    },
    
    // FHIR-Konfiguration
    fhir: {
      baseUrl: String,
      endpoint: String,
      authType: {
        type: String,
        enum: ['none', 'basic', 'bearer', 'oauth2', 'certificate']
      },
      apiKey: String,
      clientId: String,
      clientSecret: String,
      tokenUrl: String
    },
    
    // HL7 v2.x Konfiguration
    hl7v2: {
      mllpHost: String,
      mllpPort: Number,
      encoding: {
        type: String,
        enum: ['UTF-8', 'ISO-8859-1'],
        default: 'UTF-8'
      }
    },
    
    // REST API Konfiguration
    rest: {
      baseUrl: String,
      apiKey: String,
      authHeader: String,
      webhookUrl: String
    },
    
    // FTP/SFTP Konfiguration
    ftp: {
      host: String,
      port: Number,
      username: String,
      password: String,
      path: String,
      filePattern: String, // z.B. "LAB_*.hl7"
      secure: { type: Boolean, default: false } // SFTP
    },
    
    // E-Mail Konfiguration
    email: {
      imapHost: String,
      imapPort: Number,
      username: String,
      password: String,
      folder: { type: String, default: 'INBOX' },
      subjectPattern: String
    }
  },
  
  // Mapping-Konfiguration
  mapping: {
    // Standard-Mapping-Profil
    profile: {
      type: String,
      default: 'default'
    },
    
    // Patienten-Matching-Strategie
    patientMatching: {
      type: String,
      enum: ['name-dob', 'insurance-number', 'ssn', 'external-id', 'multiple'],
      default: 'name-dob'
    },
    
    // Automatische Code-Transformation
    autoMapCodes: {
      type: Boolean,
      default: true
    },
    
    // Standard-Einheiten
    defaultUnits: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Letzte Synchronisation
  lastSync: {
    type: Date
  },
  
  // Synchronisations-Status
  syncStatus: {
    type: String,
    enum: ['success', 'error', 'pending'],
    default: 'pending'
  },
  
  // Letzte Fehlermeldung
  lastError: {
    type: String
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

// Index
LaborProviderSchema.index({ code: 1 });
LaborProviderSchema.index({ isActive: 1 });

module.exports = mongoose.model('LaborProvider', LaborProviderSchema);


















