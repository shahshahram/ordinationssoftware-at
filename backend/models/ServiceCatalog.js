const mongoose = require('mongoose');

const ServiceCatalogSchema = new mongoose.Schema({
  // Grunddaten
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    index: true
  },
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    trim: true 
  },
  category: { 
    type: String, 
    trim: true,
    index: true
  },
  
  // Fachrichtung/Spezialisierung
  specialty: {
    type: String,
    enum: [
      'allgemeinmedizin',
      'chirurgie', 
      'dermatologie',
      'gynaekologie',
      'orthopaedie',
      'neurologie',
      'kardiologie',
      'pneumologie',
      'gastroenterologie',
      'urologie',
      'ophthalmologie',
      'hno',
      'psychiatrie',
      'radiologie',
      'labor',
      'pathologie',
      'anästhesie',
      'notfallmedizin',
      'sportmedizin',
      'arbeitsmedizin'
    ],
    index: true
  },
  
  // Medizinische Unterscheidung
  isMedical: {
    type: Boolean,
    default: true
  },
  
  // Rollen- und Berechtigungen
  required_role: { 
    type: String, 
    enum: ['arzt', 'therapeut', 'assistenz', 'schwester', 'rezeption', null],
    default: null
  },
  visible_to_roles: [{
    type: String,
    enum: ['arzt', 'therapeut', 'assistenz', 'schwester', 'rezeption', 'admin']
  }],
  
  // Benutzer-Zuordnung für Terminvergabe
  assigned_users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  requires_user_selection: {
    type: Boolean,
    default: false
  },
  
  // Zeit- und Dauer
  base_duration_min: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  buffer_before_min: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  buffer_after_min: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  
  // Parallelisierung
  can_overlap: { 
    type: Boolean, 
    default: false 
  },
  parallel_group: { 
    type: String, 
    trim: true 
  },
  
  // Ressourcen
  requires_room: { 
    type: Boolean, 
    default: false 
  },
  required_device_type: { 
    type: String, 
    trim: true 
  },
  
  // Geräte-Auswahl
  assigned_devices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    index: true
  }],
  requires_device_selection: {
    type: Boolean,
    default: false
  },
  device_quantity_required: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Raum-Auswahl
  assigned_rooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    index: true
  }],
  requires_room_selection: {
    type: Boolean,
    default: false
  },
  room_quantity_required: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Patienteneignung
  min_age_years: { 
    type: Number, 
    min: 0 
  },
  max_age_years: { 
    type: Number, 
    min: 0 
  },
  requires_consent: { 
    type: Boolean, 
    default: false 
  },
  
  // Buchbarkeit
  online_bookable: { 
    type: Boolean, 
    default: true 
  },
  
  // Abrechnung
  price_cents: { 
    type: Number, 
    min: 0 
  },
  billing_code: { 
    type: String, 
    trim: true 
  },
  
  // Abrechnungstyp und Preise
  billingType: { 
    type: String, 
    enum: ['kassenarzt', 'wahlarzt', 'privat', 'both'], 
    default: 'both' 
  },
  
  // ÖGK-Kassenarzt-Abrechnung
  ogk: {
    ebmCode: { type: String, trim: true },
    ebmPrice: { type: Number, min: 0 },
    requiresApproval: { type: Boolean, default: false },
    billingFrequency: { type: String, enum: ['once', 'periodic'], default: 'once' },
    // Fachspezifische EBM-Gruppen
    ebmGroup: { type: String, trim: true }, // z.B. "Konsultation", "Untersuchung", "Behandlung"
    ebmSubGroup: { type: String, trim: true }, // z.B. "Erstkonsultation", "Folgekonsultation"
    // Zusatzleistungen
    additionalServices: [{
      code: { type: String, trim: true },
      description: { type: String, trim: true },
      price: { type: Number, min: 0 }
    }]
  },
  
  // Wahlarzt-Abrechnung
  wahlarzt: {
    price: { type: Number, min: 0 },
    reimbursementRate: { type: Number, default: 0.80, min: 0, max: 1 },
    maxReimbursement: { type: Number, min: 0 },
    requiresPreApproval: { type: Boolean, default: false }
  },
  
  // Privatärztliche Abrechnung
  private: {
    price: { type: Number, min: 0 },
    noInsurance: { type: Boolean, default: true }
  },
  
  // Selbstbehalt
  copay: {
    applicable: { type: Boolean, default: false },
    amount: { type: Number, default: 0, min: 0 },
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    maxAmount: { type: Number, min: 0 },
    exempt: { type: Boolean, default: false }
  },
  
  // Zusätzliche Informationen
  notes: { 
    type: String, 
    trim: true 
  },
  
  // UI-Farben für Kalender
  color_hex: {
    type: String,
    default: '#2563EB',
    match: /^#[0-9A-F]{6}$/i,
    trim: true
  },
  
  // Schnellauswahl für Favoriten
  quick_select: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Status und Versionierung
  is_active: { 
    type: Boolean, 
    default: true,
    index: true
  },
  version: { 
    type: Number, 
    default: 1 
  },
  
  // Standort-Zuordnung
  location_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    index: true
  },
  
  // Audit-Felder
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
  timestamps: true
});

// Indizes für Performance
ServiceCatalogSchema.index({ code: 1, location_id: 1 });
ServiceCatalogSchema.index({ category: 1, is_active: 1 });
ServiceCatalogSchema.index({ required_role: 1, is_active: 1 });
ServiceCatalogSchema.index({ online_bookable: 1, is_active: 1 });
ServiceCatalogSchema.index({ quick_select: 1, is_active: 1 });

// Virtual für Gesamtdauer
ServiceCatalogSchema.virtual('total_duration_min').get(function() {
  return this.base_duration_min + this.buffer_before_min + this.buffer_after_min;
});

// Virtual für Preis in Euro
ServiceCatalogSchema.virtual('price_euro').get(function() {
  return this.price_cents ? (this.price_cents / 100).toFixed(2) : null;
});

// Methoden
ServiceCatalogSchema.methods.isEligibleForPatient = function(patientAge) {
  if (this.min_age_years && patientAge < this.min_age_years) return false;
  if (this.max_age_years && patientAge > this.max_age_years) return false;
  return true;
};

ServiceCatalogSchema.methods.canBePerformedBy = function(userRole) {
  if (!this.required_role) return true;
  return this.required_role === userRole;
};

ServiceCatalogSchema.methods.isVisibleToRole = function(userRole) {
  if (!this.visible_to_roles || this.visible_to_roles.length === 0) return true;
  return this.visible_to_roles.includes(userRole);
};

ServiceCatalogSchema.methods.isAssignedToUser = function(userId) {
  if (!this.assigned_users || this.assigned_users.length === 0) return true;
  return this.assigned_users.some(user => user.toString() === userId.toString());
};

ServiceCatalogSchema.methods.getAvailableUsers = function() {
  return this.assigned_users || [];
};

ServiceCatalogSchema.methods.getAvailableDevices = function() {
  return this.assigned_devices || [];
};

ServiceCatalogSchema.methods.getAvailableRooms = function() {
  return this.assigned_rooms || [];
};

ServiceCatalogSchema.methods.requiresDeviceSelection = function() {
  return this.requires_device_selection && this.assigned_devices && this.assigned_devices.length > 0;
};

ServiceCatalogSchema.methods.requiresRoomSelection = function() {
  return this.requires_room_selection && this.assigned_rooms && this.assigned_rooms.length > 0;
};

ServiceCatalogSchema.methods.isDeviceAssigned = function(deviceId) {
  if (!this.assigned_devices || this.assigned_devices.length === 0) return true;
  return this.assigned_devices.some(device => device.toString() === deviceId.toString());
};

ServiceCatalogSchema.methods.isRoomAssigned = function(roomId) {
  if (!this.assigned_rooms || this.assigned_rooms.length === 0) return true;
  return this.assigned_rooms.some(room => room.toString() === roomId.toString());
};

module.exports = mongoose.model('ServiceCatalog', ServiceCatalogSchema);