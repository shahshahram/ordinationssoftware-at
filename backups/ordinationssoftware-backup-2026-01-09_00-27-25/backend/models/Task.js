const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  // Titel der Aufgabe
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  // Beschreibung der Aufgabe
  description: {
    type: String,
    trim: true
  },
  
  // Ersteller (Mediziner)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Zugewiesene Personen (kann mehrere sein)
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  // Status der Aufgabe
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Priorität
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  // Fälligkeitsdatum
  dueDate: {
    type: Date,
    index: true
  },
  
  // Erledigt am
  completedAt: {
    type: Date
  },
  
  // Kommentare/Notizen
  comments: [{
    text: {
      type: String,
      required: true,
      trim: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Optional: Referenz zu einem Patienten
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientExtended',
    index: true
  },
  
  // Optional: Referenz zu einem Termin
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    index: true
  },
  
  // Erstellt aus einem Muster/Vorlage
  createdFromTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskTemplate'
  },
  
  // Metadaten
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indizes für bessere Performance
TaskSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
TaskSchema.index({ createdBy: 1, createdAt: -1 });
TaskSchema.index({ dueDate: 1, status: 1 });
TaskSchema.index({ status: 1, priority: 1, dueDate: 1 });
TaskSchema.index({ 'assignedTo': 1 }); // Index für Array-Feld

// Virtual für Fälligkeit
TaskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.dueDate;
});

// Statische Methode: Aufgaben für Benutzer abrufen
TaskSchema.statics.getTasksForUser = async function(userId, options = {}) {
  const {
    status,
    priority,
    overdue,
    limit = 50,
    skip = 0
  } = options;

  let query = { assignedTo: { $in: [userId] } };

  if (status) {
    query.status = status;
  }

  if (priority) {
    query.priority = priority;
  }

  if (overdue === true) {
    query.dueDate = { $lt: new Date() };
    query.status = { $in: ['pending', 'in_progress'] };
  }

  return this.find(query)
    .populate('createdBy', 'firstName lastName role')
    .populate('assignedTo', 'firstName lastName role email')
    .populate('patientId', 'firstName lastName')
    .sort({ priority: -1, dueDate: 1, createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Statische Methode: Ungelöste Aufgaben zählen
TaskSchema.statics.getUncompletedCount = async function(userId) {
  return this.countDocuments({
    assignedTo: { $in: [userId] },
    status: { $in: ['pending', 'in_progress'] }
  });
};

const Task = mongoose.model('Task', TaskSchema);

module.exports = Task;

