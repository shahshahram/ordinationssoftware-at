const mongoose = require('mongoose');

const InternalMessageSchema = new mongoose.Schema({
  // Absender
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Empfänger
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Betreff
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  // Nachrichtentext
  message: {
    type: String,
    required: true,
    trim: true
  },
  
  // Priorität
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'archived'],
    default: 'sent',
    index: true
  },
  
  // Gelesen am
  readAt: {
    type: Date
  },
  
  // Gelöscht von Absender
  deletedBySender: {
    type: Boolean,
    default: false
  },
  
  // Gelöscht von Empfänger
  deletedByRecipient: {
    type: Boolean,
    default: false
  },
  
  // Anhänge (URLs zu Dateien)
  attachments: [{
    filename: String,
    url: String,
    mimeType: String,
    size: Number
  }],
  
  // Antwort auf (für Threading)
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InternalMessage'
  },
  
  // Weitergeleitet von (für Weiterleitungen)
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InternalMessage'
  },
  
  // Optional: Referenz zu einem Patienten (z.B. für Laborwerte-Benachrichtigungen)
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientExtended',
    required: false,
    index: true
  },
  
  // Metadaten
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indizes für bessere Performance
InternalMessageSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
InternalMessageSchema.index({ senderId: 1, deletedBySender: 1, createdAt: -1 });
InternalMessageSchema.index({ recipientId: 1, deletedByRecipient: 1 });

// Virtual für ungelesene Nachrichten
InternalMessageSchema.virtual('isUnread').get(function() {
  return this.status === 'sent' || this.status === 'delivered';
});

// Pre-save Hook für updatedAt
InternalMessageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Statische Methode: Ungelesene Nachrichten zählen
InternalMessageSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    recipientId: userId,
    status: { $in: ['sent', 'delivered'] },
    deletedByRecipient: false
  });
};

// Statische Methode: Nachrichten für Benutzer abrufen
InternalMessageSchema.statics.getMessagesForUser = async function(userId, options = {}) {
  const {
    type = 'inbox', // 'inbox', 'sent', 'archived'
    limit = 50,
    skip = 0,
    status
  } = options;

  let query = { deletedByRecipient: false, deletedBySender: false };

  if (type === 'inbox') {
    query.recipientId = userId;
    if (status) {
      query.status = status;
    }
  } else if (type === 'sent') {
    query.senderId = userId;
    query.deletedBySender = false;
  } else if (type === 'archived') {
    query.$or = [
      { recipientId: userId, status: 'archived' },
      { senderId: userId, status: 'archived' }
    ];
  }

  return this.find(query)
    .populate('senderId', 'firstName lastName email')
    .populate('recipientId', 'firstName lastName email')
    .populate({
      path: 'replyTo',
      select: 'subject message senderId createdAt',
      populate: {
        path: 'senderId',
        select: 'firstName lastName email'
      }
    })
    .populate({
      path: 'forwardedFrom',
      select: 'subject message senderId recipientId createdAt',
      populate: [
        {
          path: 'senderId',
          select: 'firstName lastName email'
        },
        {
          path: 'recipientId',
          select: 'firstName lastName email'
        }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

const InternalMessage = mongoose.model('InternalMessage', InternalMessageSchema);

module.exports = InternalMessage;



