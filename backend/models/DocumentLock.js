const mongoose = require('mongoose');

const DocumentLockSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  lockedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL Index für automatisches Löschen
  },
  sessionId: {
    type: String,
    index: true
  }
}, {
  timestamps: false
});

// Compound index für schnelle Abfragen
DocumentLockSchema.index({ documentId: 1, userId: 1 });

// Statische Methode: Lock erstellen
DocumentLockSchema.statics.acquireLock = async function(documentId, userId, userName, options = {}) {
  const lockDuration = options.duration || 30 * 60 * 1000; // 30 Minuten Standard
  const expiresAt = new Date(Date.now() + lockDuration);
  const sessionId = options.sessionId || null;

  // Prüfe ob bereits ein Lock existiert
  const existingLock = await this.findOne({
    documentId,
    expiresAt: { $gt: new Date() } // Nur aktive Locks
  });

  if (existingLock) {
    // Wenn derselbe Benutzer den Lock hat, verlängere ihn
    if (existingLock.userId.toString() === userId.toString()) {
      existingLock.expiresAt = expiresAt;
      await existingLock.save();
      return existingLock;
    }
    // Anderenfalls: Lock existiert bereits
    throw new Error(`Dokument wird bereits von ${existingLock.userName} bearbeitet`);
  }

  // Erstelle neuen Lock
  const lock = new this({
    documentId,
    userId,
    userName,
    expiresAt,
    sessionId
  });

  await lock.save();
  return lock;
};

// Statische Methode: Lock freigeben
DocumentLockSchema.statics.releaseLock = async function(documentId, userId) {
  return await this.deleteOne({
    documentId,
    userId
  });
};

// Statische Methode: Lock prüfen
DocumentLockSchema.statics.checkLock = async function(documentId) {
  const lock = await this.findOne({
    documentId,
    expiresAt: { $gt: new Date() }
  }).populate('userId', 'firstName lastName');

  return lock;
};

// Statische Methode: Alle abgelaufenen Locks bereinigen
DocumentLockSchema.statics.cleanupExpiredLocks = async function() {
  return await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Instance-Methode: Lock verlängern
DocumentLockSchema.methods.extend = async function(duration = 30 * 60 * 1000) {
  this.expiresAt = new Date(Date.now() + duration);
  await this.save();
  return this;
};

module.exports = mongoose.model('DocumentLock', DocumentLockSchema);










