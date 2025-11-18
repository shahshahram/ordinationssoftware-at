const mongoose = require('mongoose');

const PerformanceSchema = new mongoose.Schema({
  // Grunddaten
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    index: true
  },
  
  // Leistungsdaten
  serviceCode: {
    type: String,
    required: true,
    index: true
  },
  serviceDescription: {
    type: String,
    required: true
  },
  serviceDatetime: {
    type: Date,
    required: true,
    index: true
  },
  
  // Preisdaten
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Abrechnungstyp
  tariffType: {
    type: String,
    enum: ['kassa', 'wahl', 'privat'],
    required: true,
    index: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['recorded', 'billed', 'sent', 'accepted', 'rejected', 'refunded', 'failed'],
    default: 'recorded',
    index: true
  },
  
  // Abrechnungsdaten
  billingData: {
    kassaRef: String,        // Kassenreferenz
    insuranceRef: String,     // Versicherungsreferenz
    invoiceNumber: String,    // Rechnungsnummer
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    paymentDate: Date,
    refundAmount: Number,
    copayAmount: Number
  },
  
  // Metadaten
  notes: String,
  diagnosisCodes: [String],
  medicationCodes: [String],
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  billedAt: Date,
  sentAt: Date,
  acceptedAt: Date
}, {
  timestamps: true
});

// Indizes für Performance
PerformanceSchema.index({ patientId: 1, serviceDatetime: -1 });
PerformanceSchema.index({ doctorId: 1, status: 1 });
PerformanceSchema.index({ tariffType: 1, status: 1 });
PerformanceSchema.index({ serviceCode: 1, tariffType: 1 });

// Virtual für Gesamtpreis
PerformanceSchema.virtual('calculatedTotal').get(function() {
  return this.unitPrice * this.quantity;
});

// Pre-save Hook für Gesamtpreis
PerformanceSchema.pre('save', function(next) {
  if (this.isModified('unitPrice') || this.isModified('quantity')) {
    this.totalPrice = this.unitPrice * this.quantity;
  }
  next();
});

module.exports = mongoose.model('Performance', PerformanceSchema);






