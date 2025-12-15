const mongoose = require('mongoose');

const WaitingListSchema = new mongoose.Schema({
  // Verknüpfung zum Patienten (Pflichtfeld)
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientExtended', // Geändert zu PatientExtended für Produktivsystem
    required: true,
    index: true
  },
  
  // Verknüpfung zum Service (optional)
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCatalog'
  },
  
  // Verknüpfung zum Arzt (optional)
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StaffProfile'
  },
  
  // Verknüpfung zur Standort (optional)
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  
  // Grund für die Warteliste
  reason: {
    type: String,
    required: true,
    trim: true
  },
  
  // Priorität
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['waiting', 'in_progress', 'completed', 'cancelled'],
    default: 'waiting',
    index: true
  },
  
  // Position in der Warteliste (wird automatisch berechnet)
  position: {
    type: Number,
    default: 0
  },
  
  // Bevorzugtes Datum (optional)
  preferredDate: {
    type: Date
  },
  
  // Notizen
  notes: {
    type: String,
    trim: true
  },
  
  // Kontaktmethode
  contactMethod: {
    type: String,
    enum: ['all', 'phone', 'email', 'sms'],
    default: 'all'
  },
  
  // Erstellt von
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Zuletzt aktualisiert von
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index für schnelle Suche
WaitingListSchema.index({ patient: 1, status: 1 });
WaitingListSchema.index({ status: 1, priority: -1, position: 1 });
WaitingListSchema.index({ location: 1, status: 1 });
WaitingListSchema.index({ doctor: 1, status: 1 });

// Pre-save Hook: Berechne Position automatisch
WaitingListSchema.pre('save', async function(next) {
  // Nur wenn es ein neues Dokument ist oder der Status 'waiting' ist
  if (this.isNew || this.status === 'waiting') {
    // Zähle alle Wartelisten-Einträge mit gleichem Status, Service, Doctor, Location
    const query = {
      status: 'waiting',
      _id: { $ne: this._id }
    };
    
    if (this.service) {
      query.service = this.service;
    } else {
      query.service = { $exists: false };
    }
    
    if (this.doctor) {
      query.doctor = this.doctor;
    } else {
      query.doctor = { $exists: false };
    }
    
    if (this.location) {
      query.location = this.location;
    } else {
      query.location = { $exists: false };
    }
    
    const count = await mongoose.model('WaitingList').countDocuments(query);
    this.position = count + 1;
  }
  
  next();
});

const WaitingList = mongoose.model('WaitingList', WaitingListSchema);

module.exports = WaitingList;

