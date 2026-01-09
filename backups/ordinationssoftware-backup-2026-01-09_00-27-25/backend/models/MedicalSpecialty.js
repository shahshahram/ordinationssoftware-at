const mongoose = require('mongoose');

const MedicalSpecialtySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  sortOrder: {
    type: Number,
    default: 0,
    index: true
  },
  // Kategorisierung (optional)
  category: {
    type: String,
    enum: ['chirurgie', 'innere_medizin', 'diagnostik', 'therapie', 'sonstiges'],
    default: 'sonstiges'
  },
  // Erstellt von
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Zuletzt geändert von
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indizes (code und name sind bereits durch unique: true indiziert)
MedicalSpecialtySchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('MedicalSpecialty', MedicalSpecialtySchema);

