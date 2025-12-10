const mongoose = require('mongoose');

const DicomProviderSchema = new mongoose.Schema({
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
  
  // Typ des Instituts
  type: {
    type: String,
    enum: ['radiology', 'imaging', 'hospital', 'clinic', 'other'],
    default: 'radiology'
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
      enum: ['rest', 'dicomweb', 'dicom-cstore', 'ftp', 'sftp', 'email', 'manual'],
      required: true,
      default: 'rest'
    },
    
    // REST API Konfiguration
    rest: {
      webhookUrl: String, // URL für Webhook-Benachrichtigungen
      apiKey: String, // API-Key für Authentifizierung
      apiSecret: String, // API-Secret (optional)
      authType: {
        type: String,
        enum: ['none', 'api-key', 'bearer', 'basic', 'oauth2'],
        default: 'api-key'
      }
    },
    
    // DICOMweb Konfiguration
    dicomweb: {
      baseUrl: String,
      qidoEndpoint: String,
      wadoEndpoint: String,
      stowEndpoint: String,
      authType: {
        type: String,
        enum: ['none', 'basic', 'bearer', 'oauth2']
      },
      apiKey: String,
      clientId: String,
      clientSecret: String
    },
    
    // DICOM C-STORE Konfiguration
    dicomCStore: {
      aeTitle: String, // Application Entity Title
      host: String,
      port: Number,
      timeout: { type: Number, default: 30000 }
    },
    
    // FTP/SFTP Konfiguration
    ftp: {
      host: String,
      port: Number,
      username: String,
      password: String,
      path: String,
      filePattern: String, // z.B. "DICOM_*.dcm"
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
  
  // Patienten-Matching-Konfiguration
  mapping: {
    // Patienten-Matching-Strategie
    patientMatching: {
      type: String,
      enum: ['name-dob', 'patient-id', 'insurance-number', 'ssn', 'external-id', 'multiple'],
      default: 'name-dob'
    },
    
    // Automatische Patienten-Erstellung erlauben
    allowAutoCreatePatient: {
      type: Boolean,
      default: false
    },
    
    // Standard-Modality-Filter
    allowedModalities: [{
      type: String // CT, MR, CR, DX, US, etc.
    }]
  },
  
  // Sicherheits-Konfiguration
  security: {
    // IP-Whitelist (optional)
    ipWhitelist: [{
      type: String // IP-Adressen oder CIDR-Notation
    }],
    
    // Rate Limiting
    rateLimit: {
      requestsPerMinute: { type: Number, default: 60 },
      requestsPerHour: { type: Number, default: 1000 }
    },
    
    // Max. Dateigröße (in MB)
    maxFileSize: {
      type: Number,
      default: 500 // 500 MB
    }
  },
  
  // Benachrichtigungs-Konfiguration
  notifications: {
    // Benachrichtigung bei neuem Upload
    notifyOnUpload: {
      type: Boolean,
      default: true
    },
    
    // Benachrichtigung bei Fehlern
    notifyOnError: {
      type: Boolean,
      default: true
    },
    
    // E-Mail-Benachrichtigungen
    emailNotifications: {
      enabled: { type: Boolean, default: false },
      recipients: [{
        type: String // E-Mail-Adressen
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
    totalUploads: { type: Number, default: 0 },
    successfulUploads: { type: Number, default: 0 },
    failedUploads: { type: Number, default: 0 },
    lastUpload: Date,
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
DicomProviderSchema.index({ code: 1 });
DicomProviderSchema.index({ isActive: 1 });
DicomProviderSchema.index({ 'integration.protocol': 1 });

// Virtual für Webhook-URL
DicomProviderSchema.virtual('webhookUrl').get(function() {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:5001';
  return `${baseUrl}/api/dicom/receive`;
});

// Method: Validiere API-Key
DicomProviderSchema.methods.validateApiKey = function(apiKey) {
  if (!this.integration.rest.apiKey) {
    return false;
  }
  return this.integration.rest.apiKey === apiKey;
};

// Method: Prüfe IP-Whitelist
DicomProviderSchema.methods.isIpAllowed = function(ip) {
  if (!this.security.ipWhitelist || this.security.ipWhitelist.length === 0) {
    return true; // Keine Whitelist = alle IPs erlaubt
  }
  
  // Einfache IP-Vergleich (für CIDR müsste man eine Bibliothek verwenden)
  return this.security.ipWhitelist.some(allowedIp => {
    if (allowedIp === ip) return true;
    // CIDR-Notation unterstützen (vereinfacht)
    if (allowedIp.includes('/')) {
      // Hier könnte man eine CIDR-Bibliothek verwenden
      const baseIp = allowedIp.split('/')[0];
      return ip.startsWith(baseIp.split('.').slice(0, -1).join('.'));
    }
    return false;
  });
};

// Method: Update Statistiken
DicomProviderSchema.methods.updateStats = function(success = true, error = null) {
  this.stats.totalUploads += 1;
  if (success) {
    this.stats.successfulUploads += 1;
  } else {
    this.stats.failedUploads += 1;
    if (error) {
      this.stats.lastError = error;
    }
  }
  this.stats.lastUpload = new Date();
  return this.save();
};

module.exports = mongoose.model('DicomProvider', DicomProviderSchema);












