const mongoose = require('mongoose');

const PatientNoteSchema = new mongoose.Schema({
  // Verknüpfung zum Patienten
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientExtended',
    required: true,
    index: true
  },
  
  // Typ der Notiz
  noteType: {
    type: String,
    enum: ['general', 'medical'],
    required: true,
    default: 'general',
    index: true
  },
  
  // Inhalt der Notiz
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [10000, 'Notiz darf maximal 10000 Zeichen haben']
  },
  
  // Erstellt von
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Zuletzt bearbeitet von
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Bearbeitungshistorie
  editHistory: [{
    editedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    previousContent: {
      type: String,
      required: true
    },
    newContent: {
      type: String,
      required: true
    },
    changeReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Grund für Änderung darf maximal 500 Zeichen haben']
    }
  }],
  
  // Status (aktiv, gelöscht)
  status: {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active',
    index: true
  },
  
  // Soft Delete - wird auf true gesetzt, wenn Notiz gelöscht wird
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Verknüpfung zu Termin (optional)
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indizes für schnelle Suche
PatientNoteSchema.index({ patientId: 1, noteType: 1, createdAt: -1 });
PatientNoteSchema.index({ patientId: 1, status: 1, createdAt: -1 });
PatientNoteSchema.index({ createdAt: -1 });

// Virtual: Prüft ob Notiz bearbeitet wurde
PatientNoteSchema.virtual('isEdited').get(function() {
  return this.editHistory && this.editHistory.length > 0;
});

// Virtual: Anzahl der Bearbeitungen
PatientNoteSchema.virtual('editCount').get(function() {
  return this.editHistory ? this.editHistory.length : 0;
});

// Pre-Save Hook: Erstelle Bearbeitungshistorie-Eintrag wenn Inhalt geändert wurde
PatientNoteSchema.pre('save', async function(next) {
  // Nur wenn Dokument existiert und Inhalt geändert wurde
  if (!this.isNew && this.isModified('content')) {
    try {
      // Hole vorherigen Inhalt
      const doc = await this.constructor.findById(this._id);
      if (doc && doc.content !== this.content) {
        // Füge Bearbeitungshistorie-Eintrag hinzu
        if (!this.editHistory) {
          this.editHistory = [];
        }
        this.editHistory.push({
          editedAt: new Date(),
          editedBy: this.lastModifiedBy || this.createdBy,
          previousContent: doc.content,
          newContent: this.content,
          changeReason: this.changeReason || undefined
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

// Statische Methoden
PatientNoteSchema.statics.findByPatient = function(patientId, options = {}) {
  const query = {
    patientId: patientId,
    isDeleted: false,
    status: 'active'
  };
  
  if (options.noteType) {
    query.noteType = options.noteType;
  }
  
  return this.find(query)
    .populate('createdBy', 'firstName lastName')
    .populate('lastModifiedBy', 'firstName lastName')
    .populate('editHistory.editedBy', 'firstName lastName')
    .sort({ createdAt: -1 }); // Neueste zuerst
};

PatientNoteSchema.statics.findByPatientChronological = function(patientId, options = {}) {
  const query = {
    patientId: patientId,
    isDeleted: false,
    status: 'active'
  };
  
  if (options.noteType) {
    query.noteType = options.noteType;
  }
  
  return this.find(query)
    .populate('createdBy', 'firstName lastName')
    .populate('lastModifiedBy', 'firstName lastName')
    .populate('editHistory.editedBy', 'firstName lastName')
    .sort({ createdAt: 1 }); // Älteste zuerst (chronologisch)
};

const PatientNote = mongoose.model('PatientNote', PatientNoteSchema);

module.exports = PatientNote;
