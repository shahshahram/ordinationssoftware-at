// e-card Validierung und ELGA-Integration

const mongoose = require('mongoose');

const ECardValidationSchema = new mongoose.Schema({
  // Patient
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientExtended',
    required: true,
    index: true
  },
  
  // e-card Daten
  ecardNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  cardType: {
    type: String,
    enum: ['e-card', 'versichertenkarte', 'ersatzkarte'],
    default: 'e-card'
  },
  
  // Validierungsdaten
  validationDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  validationStatus: {
    type: String,
    enum: ['valid', 'invalid', 'expired', 'not_found', 'error'],
    required: true,
    index: true
  },
  validFrom: {
    type: Date
  },
  validUntil: {
    type: Date
  },
  
  // Versicherungsdaten von e-card
  insuranceData: {
    insuranceProvider: { type: String },
    insuranceNumber: { type: String },
    socialSecurityNumber: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      postalCode: { type: String },
      country: { type: String }
    }
  },
  
  // ELGA-Daten
  elgaData: {
    elgaId: { type: String },
    elgaStatus: { 
      type: String, 
      enum: ['active', 'inactive', 'not_registered'],
      default: 'not_registered'
    },
    lastSync: { type: Date }
  },
  
  // Validierungsquelle
  validatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  validationMethod: {
    type: String,
    enum: ['card_reader', 'manual', 'api', 'elga'],
    default: 'card_reader'
  },
  
  // Fehlerinformationen
  errorMessage: {
    type: String,
    trim: true
  },
  errorCode: {
    type: String,
    trim: true
  },
  
  // Metadaten
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indizes
ECardValidationSchema.index({ patientId: 1, validationDate: -1 });
ECardValidationSchema.index({ ecardNumber: 1, validationDate: -1 });
ECardValidationSchema.index({ validationStatus: 1, validationDate: -1 });

// Virtual für Ablaufstatus
ECardValidationSchema.virtual('isExpired').get(function() {
  if (!this.validUntil) return false;
  return new Date() > new Date(this.validUntil);
});

// Statische Methoden
ECardValidationSchema.statics.findLatestByPatient = function(patientId) {
  return this.findOne({ patientId })
    .sort({ validationDate: -1 })
    .populate('validatedBy', 'firstName lastName');
};

ECardValidationSchema.statics.findValidCards = function() {
  return this.find({
    validationStatus: 'valid',
    validUntil: { $gte: new Date() }
  }).populate('patientId', 'firstName lastName');
};

module.exports = mongoose.model('ECardValidation', ECardValidationSchema);





