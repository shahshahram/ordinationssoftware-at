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
  insuranceType: { type: String, enum: ['gesetzlich', 'privat', 'selbstzahler'], default: 'gesetzlich' },
  
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
  totalVisits: { type: Number, default: 0 }
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