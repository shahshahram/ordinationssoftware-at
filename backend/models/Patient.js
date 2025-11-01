const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  // Grunddaten
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['männlich', 'weiblich', 'divers'], required: true },
  
  // Kontaktdaten
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  
  // Adressdaten
  address: {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, default: 'Österreich' }
  },
  
  // Versicherungsdaten
  insuranceNumber: { type: String, trim: true },
      insuranceProvider: { 
        type: String, 
        enum: [
          'ÖGK (Österreichische Gesundheitskasse)',
          'BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)',
          'SVS (Sozialversicherung der Selbständigen)',
          'KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)',
          'PVA (Pensionsversicherungsanstalt)',
          'Privatversicherung',
          'Selbstzahler'
        ],
        default: 'ÖGK (Österreichische Gesundheitskasse)'
      },
  
  // Status
  status: { type: String, enum: ['aktiv', 'inaktiv', 'wartend'], default: 'aktiv' },
  
  // Medizinische Daten
  medicalHistory: [{ type: String }],
  allergies: [{ type: String }],
  medications: [{ type: String }],
  
  // Notfallkontakt
  emergencyContact: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relationship: { type: String, trim: true }
  },
  
  // Notizen
  notes: { type: String },
  
  // Metadaten
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastVisit: { type: Date },
  totalVisits: { type: Number, default: 0 },
  
  // ACL (Access Control List) für Object-level Sicherheit
  acl: {
    // Rollen die Zugriff auf diesen Patienten haben
    allowedRoles: [{ type: String }],
    
    // Spezifische Benutzer die Zugriff haben
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Explizit verweigerte Rollen
    deniedRoles: [{ type: String }],
    
    // Explizit verweigerte Benutzer
    deniedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Bedingungen für den Zugriff
    conditions: {
      // Zeitbeschränkungen
      timeRestricted: { type: Boolean, default: false },
      timeStart: { type: Date },
      timeEnd: { type: Date },
      
      // Ortsbeschränkungen
      locationRestricted: { type: Boolean, default: false },
      allowedLocations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }],
      
      // IP-Beschränkungen
      ipRestricted: { type: Boolean, default: false },
      allowedIPs: [{ type: String }],
      
      // Zusätzliche Bedingungen
      requiresConsent: { type: Boolean, default: false },
      consentDate: { type: Date },
      consentExpiry: { type: Date }
    },
    
    // Metadaten der ACL
    metadata: {
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
      lastModified: { type: Date },
      reason: { type: String }, // Grund für spezielle ACL-Regeln
      version: { type: Number, default: 1 }
    }
  },
  
  // Sensibilitätsstufe für medizinische Daten
  sensitivityLevel: {
    type: String,
    enum: ['normal', 'sensitive', 'highly_sensitive', 'restricted'],
    default: 'normal'
  },
  
  // Datenschutz-Einstellungen
  dataProtection: {
    // DSGVO Einverständnis
    gdprConsent: { type: Boolean, default: false },
    gdprConsentDate: { type: Date },
    
    // Datenweitergabe-Einverständnis
    dataSharingConsent: { type: Boolean, default: false },
    dataSharingConsentDate: { type: Date },
    
    // Forschungsdaten-Einverständnis
    researchConsent: { type: Boolean, default: false },
    researchConsentDate: { type: Date },
    
    // Automatische Löschung nach X Jahren
    autoDeleteAfterYears: { type: Number, default: 10 },
    autoDeleteDate: { type: Date }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual für vollständigen Namen
PatientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual für vollständige Adresse
PatientSchema.virtual('fullAddress').get(function() {
  return `${this.address.street}, ${this.address.postalCode} ${this.address.city}`;
});

// Indexes are defined in the schema above with index: true

// Methoden
PatientSchema.methods.getAge = function() {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

module.exports = mongoose.model('Patient', PatientSchema);