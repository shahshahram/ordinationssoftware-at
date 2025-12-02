const mongoose = require('mongoose');

const VitalSignsSchema = new mongoose.Schema({
  // Verknüpfung zum Patienten
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  
  // Verknüpfung zum Termin (optional)
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    index: true
  },
  
  // Datum und Uhrzeit der Erfassung
  recordedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Erfasst von (Benutzer)
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Vitalwerte
  // Blutdruck
  bloodPressure: {
    systolic: { type: Number, min: 0, max: 300 },
    diastolic: { type: Number, min: 0, max: 200 }
  },
  
  // Puls
  pulse: {
    type: Number,
    min: 0,
    max: 300
  },
  
  // Atemfrequenz
  respiratoryRate: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Körpertemperatur
  temperature: {
    value: { type: Number, min: 30, max: 45 },
    unit: { type: String, enum: ['celsius', 'fahrenheit'], default: 'celsius' }
  },
  
  // Sauerstoffsättigung (SpO2)
  oxygenSaturation: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Blutzucker (Glukose)
  bloodGlucose: {
    value: { type: Number, min: 0, max: 1000 },
    unit: { type: String, enum: ['mg/dL', 'mmol/L'], default: 'mg/dL' }
  },
  
  // Gewicht
  weight: {
    value: { type: Number, min: 0, max: 500 },
    unit: { type: String, enum: ['kg', 'lbs'], default: 'kg' }
  },
  
  // Größe (normalerweise statisch, aber kann sich ändern)
  height: {
    value: { type: Number, min: 0, max: 300 },
    unit: { type: String, enum: ['cm', 'inches'], default: 'cm' }
  },
  
  // BMI (kann automatisch berechnet werden)
  bmi: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Schmerzskala (verschiedene Typen)
  painScale: {
    type: {
      type: String,
      enum: ['NRS', 'VAS', 'VRS', 'KUSS'],
      default: 'NRS'
    },
    value: { type: mongoose.Schema.Types.Mixed } // Kann Number (NRS/VAS/KUSS) oder String (VRS) sein
  },
  
  // Zusätzliche Notizen
  notes: {
    type: String,
    maxlength: 2000
  },
  
  // Zusätzliche benutzerdefinierte Werte
  customValues: [{
    name: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed },
    unit: { type: String }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index für schnelle Suche nach Patient und Datum
VitalSignsSchema.index({ patientId: 1, recordedAt: -1 });
VitalSignsSchema.index({ appointmentId: 1 });

// Virtual für formatierten Blutdruck
VitalSignsSchema.virtual('bloodPressureFormatted').get(function() {
  if (this.bloodPressure && this.bloodPressure.systolic && this.bloodPressure.diastolic) {
    return `${this.bloodPressure.systolic}/${this.bloodPressure.diastolic} mmHg`;
  }
  return null;
});

// Virtual für formatiertes Gewicht
VitalSignsSchema.virtual('weightFormatted').get(function() {
  if (this.weight && this.weight.value) {
    return `${this.weight.value} ${this.weight.unit}`;
  }
  return null;
});

// Virtual für formatierte Temperatur
VitalSignsSchema.virtual('temperatureFormatted').get(function() {
  if (this.temperature && this.temperature.value) {
    const unit = this.temperature.unit === 'celsius' ? '°C' : '°F';
    return `${this.temperature.value} ${unit}`;
  }
  return null;
});

// Pre-save Hook: BMI automatisch berechnen
VitalSignsSchema.pre('save', function(next) {
  if (this.weight && this.weight.value && this.height && this.height.value) {
    // Konvertiere zu kg und m
    let weightInKg = this.weight.value;
    if (this.weight.unit === 'lbs') {
      weightInKg = this.weight.value * 0.453592;
    }
    
    let heightInM = this.height.value;
    if (this.height.unit === 'inches') {
      heightInM = this.height.value * 0.0254;
    } else if (this.height.unit === 'cm') {
      heightInM = this.height.value / 100;
    }
    
    if (heightInM > 0 && weightInKg > 0) {
      this.bmi = Number((weightInKg / (heightInM * heightInM)).toFixed(1));
    }
  }
  next();
});

const VitalSigns = mongoose.model('VitalSigns', VitalSignsSchema);

module.exports = VitalSigns;

