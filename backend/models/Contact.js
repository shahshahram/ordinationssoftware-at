const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  // Typ des Kontakts: 'patient' (verknüpft mit Patient) oder 'external' (externer Kontakt)
  type: {
    type: String,
    enum: ['patient', 'external'],
    required: true,
    default: 'external'
  },
  
  // Verknüpfung zu einem Patienten (optional, nur wenn type === 'patient')
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    index: true,
    sparse: true // Index nur wenn Feld vorhanden ist
  },
  
  // Grunddaten
  firstName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  lastName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  
  // Titel/Beruf
  title: { 
    type: String, 
    trim: true 
  },
  profession: { 
    type: String, 
    trim: true 
  },
  organization: { 
    type: String, 
    trim: true 
  },
  
  // Kontaktdaten
  phone: { 
    type: String, 
    trim: true 
  },
  mobile: { 
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
  
  // Adressdaten
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, default: 'Österreich', trim: true }
  },
  
  // Kategorien/Tags für bessere Organisation
  categories: [{
    type: String,
    trim: true
  }],
  
  // Notizen
  notes: { 
    type: String, 
    trim: true 
  },
  
  // Metadaten
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  lastModifiedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Status
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  // Favoriten
  isFavorite: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index für Suche
ContactSchema.index({ firstName: 'text', lastName: 'text', email: 'text', phone: 'text', organization: 'text' });
ContactSchema.index({ type: 1, patientId: 1 });
ContactSchema.index({ isActive: 1, isFavorite: 1 });
ContactSchema.index({ categories: 1 });

// Virtual für vollständigen Namen
ContactSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save Hook: Validiere patientId nur wenn type === 'patient'
ContactSchema.pre('save', function(next) {
  if (this.type === 'patient' && !this.patientId) {
    return next(new Error('patientId ist erforderlich wenn type === "patient"'));
  }
  if (this.type === 'external' && this.patientId) {
    // Entferne patientId wenn type !== 'patient'
    this.patientId = undefined;
  }
  next();
});

module.exports = mongoose.model('Contact', ContactSchema);

