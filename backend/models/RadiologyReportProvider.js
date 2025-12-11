const mongoose = require('mongoose');

const RadiologyReportProviderSchema = new mongoose.Schema({
  // Name des Instituts
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
      enum: ['rest', 'fhir', 'hl7-cda', 'dicom-sr', 'email', 'ftp', 'sftp'],
      required: true,
      default: 'rest'
    },
    
    // REST API Konfiguration
    rest: {
      webhookUrl: String,
      apiKey: String,
      apiSecret: String,
      authType: {
        type: String,
        enum: ['none', 'api-key', 'bearer', 'basic', 'oauth2'],
        default: 'api-key'
      }
    },
    
    // FHIR Konfiguration
    fhir: {
      baseUrl: String,
      endpoint: String,
      authType: {
        type: String,
        enum: ['none', 'basic', 'bearer', 'oauth2']
      },
      apiKey: String,
      clientId: String,
      clientSecret: String
    },
    
    // HL7 CDA Konfiguration
    hl7Cda: {
      endpoint: String,
      encoding: {
        type: String,
        enum: ['UTF-8', 'ISO-8859-1'],
        default: 'UTF-8'
      }
    },
    
    // DICOM SR Konfiguration
    dicomSr: {
      aeTitle: String,
      host: String,
      port: Number
    },
    
    // E-Mail Konfiguration
    email: {
      imapHost: String,
      imapPort: Number,
      username: String,
      password: String,
      folder: { type: String, default: 'INBOX' },
      subjectPattern: String
    },
    
    // FTP/SFTP Konfiguration
    ftp: {
      host: String,
      port: Number,
      username: String,
      password: String,
      path: String,
      filePattern: String,
      secure: { type: Boolean, default: false }
    }
  },
  
  // Patienten-Matching-Konfiguration
  mapping: {
    patientMatching: {
      type: String,
      enum: ['name-dob', 'patient-id', 'insurance-number', 'ssn', 'external-id', 'multiple'],
      default: 'name-dob'
    },
    
    // Automatische Verknüpfung mit DICOM-Studien
    autoLinkDicomStudies: {
      type: Boolean,
      default: true
    },
    
    // Automatische Document-Erstellung
    autoCreateDocument: {
      type: Boolean,
      default: true
    },
    
    // Document-Typ für erstellte Dokumente
    documentType: {
      type: String,
      enum: ['befund', 'arztbrief', 'konsiliarbericht'],
      default: 'befund'
    }
  },
  
  // Sicherheits-Konfiguration
  security: {
    ipWhitelist: [{
      type: String
    }],
    rateLimit: {
      requestsPerMinute: { type: Number, default: 60 },
      requestsPerHour: { type: Number, default: 1000 }
    },
    maxFileSize: {
      type: Number,
      default: 10 // 10 MB für Befunde
    }
  },
  
  // Benachrichtigungs-Konfiguration
  notifications: {
    notifyOnReport: {
      type: Boolean,
      default: true
    },
    notifyOnError: {
      type: Boolean,
      default: true
    },
    emailNotifications: {
      enabled: { type: Boolean, default: false },
      recipients: [{
        type: String
      }]
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Statistiken
  stats: {
    totalReports: { type: Number, default: 0 },
    successfulReports: { type: Number, default: 0 },
    failedReports: { type: Number, default: 0 },
    lastReport: Date,
    lastError: String
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
RadiologyReportProviderSchema.index({ code: 1 });
RadiologyReportProviderSchema.index({ isActive: 1 });

// Method: Validiere API-Key
RadiologyReportProviderSchema.methods.validateApiKey = function(apiKey) {
  if (!this.integration.rest.apiKey) {
    return false;
  }
  return this.integration.rest.apiKey === apiKey;
};

// Method: Update Statistiken
RadiologyReportProviderSchema.methods.updateStats = function(success = true, error = null) {
  this.stats.totalReports += 1;
  if (success) {
    this.stats.successfulReports += 1;
  } else {
    this.stats.failedReports += 1;
    if (error) {
      this.stats.lastError = error;
    }
  }
  this.stats.lastReport = new Date();
  return this.save();
};

module.exports = mongoose.model('RadiologyReportProvider', RadiologyReportProviderSchema);














