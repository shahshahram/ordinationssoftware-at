const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  refreshToken: {
    type: String,
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  deviceInfo: {
    type: String
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL Index für automatisches Löschen
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound index für schnelle Abfragen
SessionSchema.index({ userId: 1, isActive: 1 });
SessionSchema.index({ userId: 1, lastActivity: -1 });

// Statische Methode: Aktive Sessions eines Benutzers zählen
SessionSchema.statics.countActiveSessions = async function(userId) {
  return await this.countDocuments({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  });
};

// Statische Methode: Max. Sessions prüfen
SessionSchema.statics.checkMaxSessions = async function(userId, maxSessions = 5) {
  const activeCount = await this.countActiveSessions(userId);
  if (activeCount >= maxSessions) {
    // Lösche die älteste inaktive Session
    const oldestSession = await this.findOne({
      userId,
      isActive: true
    }).sort({ lastActivity: 1 });
    
    if (oldestSession) {
      oldestSession.isActive = false;
      await oldestSession.save();
    }
  }
  return activeCount < maxSessions;
};

// Statische Methode: Session erstellen
SessionSchema.statics.createSession = async function(userId, token, refreshToken, ipAddress, userAgent, options = {}) {
  const maxSessions = options.maxSessions || 5;
  const sessionDuration = options.duration || 8 * 60 * 60 * 1000; // 8 Stunden Standard
  
  // Prüfe max. Sessions
  await this.checkMaxSessions(userId, maxSessions);
  
  const expiresAt = new Date(Date.now() + sessionDuration);
  
  const session = new this({
    userId,
    token,
    refreshToken,
    ipAddress,
    userAgent,
    deviceInfo: options.deviceInfo || userAgent,
    expiresAt
  });
  
  await session.save();
  return session;
};

// Statische Methode: Session aktualisieren (lastActivity)
SessionSchema.statics.updateActivity = async function(token) {
  return await this.findOneAndUpdate(
    { token, isActive: true, expiresAt: { $gt: new Date() } },
    { lastActivity: new Date() },
    { new: true }
  );
};

// Statische Methode: Session beenden
SessionSchema.statics.endSession = async function(token) {
  return await this.findOneAndUpdate(
    { token },
    { isActive: false },
    { new: true }
  );
};

// Statische Methode: Alle Sessions eines Benutzers beenden
SessionSchema.statics.endAllUserSessions = async function(userId, excludeToken = null) {
  const query = { userId, isActive: true };
  if (excludeToken) {
    query.token = { $ne: excludeToken };
  }
  return await this.updateMany(query, { isActive: false });
};

// Statische Methode: Abgelaufene Sessions bereinigen
SessionSchema.statics.cleanupExpiredSessions = async function() {
  const result = await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isActive: false, lastActivity: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Inaktive Sessions älter als 24h
    ]
  });
  return result.deletedCount;
};

// Statische Methode: Session validieren
SessionSchema.statics.validateSession = async function(token) {
  const session = await this.findOne({
    token,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('userId', 'firstName lastName email isActive');
  
  if (session) {
    // Aktualisiere lastActivity
    session.lastActivity = new Date();
    await session.save();
  }
  
  return session;
};

module.exports = mongoose.model('Session', SessionSchema);





