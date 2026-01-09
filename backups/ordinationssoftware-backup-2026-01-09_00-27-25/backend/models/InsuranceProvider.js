const mongoose = require('mongoose');

const InsuranceProviderSchema = new mongoose.Schema({
  // Name der Versicherung
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    index: true
  },
  
  // Kurzname/Code
  code: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    uppercase: true,
    index: true
  },
  
  // Alternative Namen (für Matching)
  aliases: [{
    type: String,
    trim: true
  }],
  
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
    website: String,
    // E-Mail-Endpunkt für Anträge (falls keine API)
    claimsEmail: String
  },
  
  // Integration-Konfiguration
  integration: {
    // Protokoll-Typ
    protocol: {
      type: String,
      enum: ['rest', 'fhir', 'soap', 'email', 'pdf', 'platform-mycare', 'platform-rehadirekt', 'platform-eabrechnung', 'manual'],
      required: true,
      default: 'email'
    },
    
    // REST API Konfiguration
    rest: {
      baseUrl: String,
      endpoints: {
        submitClaim: { type: String, default: '/api/v1/claims/submit' },
        getStatus: { type: String, default: '/api/v1/claims/status/:claimId' },
        validatePolicy: { type: String, default: '/api/v1/policies/validate' }
      },
      authType: {
        type: String,
        enum: ['none', 'api-key', 'bearer', 'basic', 'oauth2'],
        default: 'api-key'
      },
      apiKey: String,
      apiSecret: String,
      clientId: String,
      clientSecret: String,
      tokenUrl: String,
      headers: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
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
    
    // SOAP/XML Konfiguration
    soap: {
      wsdlUrl: String,
      endpoint: String,
      namespace: String,
      username: String,
      password: String
    },
    
    // E-Mail Konfiguration
    email: {
      to: String, // E-Mail-Adresse für Anträge
      subjectTemplate: { type: String, default: 'Versicherungsantrag - {invoiceNumber}' },
      cc: [String],
      bcc: [String],
      requiresPDF: { type: Boolean, default: true }
    },
    
    // PDF-Konfiguration (für manuelle Einreichung)
    pdf: {
      template: String, // PDF-Vorlage
      requiredFields: [String],
      outputFormat: {
        type: String,
        enum: ['standard', 'custom'],
        default: 'standard'
      }
    },
    
    // Plattform-Integration (myCare, RehaDirekt, eAbrechnung)
    platform: {
      type: {
        type: String,
        enum: ['myCare', 'rehaDirekt', 'eAbrechnung'],
        default: 'myCare'
      },
      // Plattform-spezifische Konfiguration wird über direBillingService gehandhabt
      config: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      }
    },
    
    // Format-Konfiguration
    format: {
      requestFormat: {
        type: String,
        enum: ['JSON', 'XML', 'PDF', 'FHIR', 'HL7-CDA'],
        default: 'JSON'
      },
      responseFormat: {
        type: String,
        enum: ['JSON', 'XML', 'PDF'],
        default: 'JSON'
      },
      dateFormat: { type: String, default: 'ISO8601' },
      currency: { type: String, default: 'EUR' }
    },
    
    // Timeout-Konfiguration
    timeout: {
      connect: { type: Number, default: 10000 }, // 10 Sekunden
      request: { type: Number, default: 30000 }   // 30 Sekunden
    },
    
    // Retry-Konfiguration
    retry: {
      enabled: { type: Boolean, default: true },
      maxAttempts: { type: Number, default: 3 },
      backoffStrategy: {
        type: String,
        enum: ['linear', 'exponential'],
        default: 'exponential'
      }
    }
  },
  
  // Fallback-Strategie
  fallback: {
    enabled: { type: Boolean, default: true },
    // Reihenfolge der Fallback-Methoden
    methods: [{
      type: String,
      enum: ['rest', 'fhir', 'soap', 'email', 'pdf', 'platform', 'manual']
    }],
    // Automatisch auf nächste Methode wechseln bei Fehler
    autoFallback: { type: Boolean, default: true }
  },
  
  // Validierung
  validation: {
    // Erforderliche Felder für Antrag
    requiredFields: [{
      field: String,
      type: { type: String, enum: ['string', 'number', 'date', 'boolean'] },
      description: String
    }],
    // Validierungsregeln
    rules: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Mapping-Konfiguration (für Daten-Transformation)
  mapping: {
    // Feld-Mappings
    fieldMappings: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Code-Transformationen
    codeMappings: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Test-Modus
  testMode: {
    type: Boolean,
    default: false
  },
  
  // Statistiken
  stats: {
    totalSubmissions: { type: Number, default: 0 },
    successfulSubmissions: { type: Number, default: 0 },
    failedSubmissions: { type: Number, default: 0 },
    lastSubmission: Date,
    lastError: String,
    averageResponseTime: { type: Number, default: 0 } // in Millisekunden
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

// code hat bereits unique: true und index: true, daher kein zusätzlicher Index nötig
// name hat bereits unique: true und index: true, daher kein zusätzlicher Index nötig
// isActive hat bereits index: true, daher kein zusätzlicher Index nötig
InsuranceProviderSchema.index({ 'integration.protocol': 1 });

// Virtual: Unterstützte Methoden
InsuranceProviderSchema.virtual('supportedMethods').get(function() {
  const methods = [];
  if (this.integration.rest?.baseUrl) methods.push('rest');
  if (this.integration.fhir?.baseUrl) methods.push('fhir');
  if (this.integration.soap?.wsdlUrl) methods.push('soap');
  if (this.integration.email?.to) methods.push('email');
  if (this.integration.pdf?.template) methods.push('pdf');
  if (this.integration.platform?.type) methods.push(`platform-${this.integration.platform.type}`);
  return methods;
});

// Method: Findet Versicherung anhand von Name oder Alias
InsuranceProviderSchema.statics.findByNameOrAlias = function(name) {
  const searchName = name.trim();
  return this.findOne({
    $or: [
      { name: { $regex: new RegExp(searchName, 'i') } },
      { code: { $regex: new RegExp(searchName, 'i') } },
      { aliases: { $regex: new RegExp(searchName, 'i') } }
    ],
    isActive: true
  });
};

// Method: Aktualisiert Statistiken
InsuranceProviderSchema.methods.updateStats = function(success, responseTime, error) {
  this.stats.totalSubmissions += 1;
  if (success) {
    this.stats.successfulSubmissions += 1;
    this.stats.lastSubmission = new Date();
  } else {
    this.stats.failedSubmissions += 1;
    this.stats.lastError = error || 'Unbekannter Fehler';
  }
  
  // Berechne durchschnittliche Antwortzeit
  if (responseTime) {
    const total = this.stats.totalSubmissions;
    const currentAvg = this.stats.averageResponseTime;
    this.stats.averageResponseTime = ((currentAvg * (total - 1)) + responseTime) / total;
  }
  
  return this.save();
};

module.exports = mongoose.model('InsuranceProvider', InsuranceProviderSchema);

