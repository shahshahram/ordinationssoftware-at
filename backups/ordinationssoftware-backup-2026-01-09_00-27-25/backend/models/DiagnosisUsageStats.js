const mongoose = require('mongoose');

const DiagnosisUsageStatsSchema = new mongoose.Schema({
  // Scope-Definition
  scope: { 
    type: String, 
    enum: ['global', 'user', 'location', 'service'], 
    required: true 
  },
  scopeId: { 
    type: String 
  }, // user_id, location_id, service_id; NULL für global
  
  // ICD-10 Code-Referenz
  code: { 
    type: String, 
    required: true, 
    trim: true 
  },
  catalogYear: { 
    type: Number, 
    required: true 
  },
  
  // Nutzungsstatistiken
  count: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  lastUsed: { 
    type: Date, 
    default: Date.now 
  },
  
  // Zusätzliche Metriken
  firstUsed: { 
    type: Date, 
    default: Date.now 
  },
  averageUsagePerMonth: { 
    type: Number, 
    default: 0 
  },
  
  // Kontext-spezifische Daten
  contexts: [{
    context: { 
      type: String, 
      enum: ['billing', 'medical', 'reporting', 'clinical'] 
    },
    count: { 
      type: Number, 
      default: 0 
    },
    lastUsed: { 
      type: Date, 
      default: Date.now 
    }
  }],
  
  // Metadaten
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound Index für effiziente Abfragen
DiagnosisUsageStatsSchema.index({ 
  scope: 1, 
  scopeId: 1, 
  count: -1 
});

DiagnosisUsageStatsSchema.index({ 
  scope: 1, 
  scopeId: 1, 
  lastUsed: -1 
});

DiagnosisUsageStatsSchema.index({ 
  code: 1, 
  catalogYear: 1 
});

// Unique Index für Scope + Code + Jahr
DiagnosisUsageStatsSchema.index({ 
  scope: 1, 
  scopeId: 1, 
  code: 1, 
  catalogYear: 1 
}, { unique: true });

// Pre-save Middleware für Berechnungen
DiagnosisUsageStatsSchema.pre('save', function(next) {
  // Berechne durchschnittliche Nutzung pro Monat
  if (this.firstUsed && this.count > 0) {
    const monthsDiff = Math.max(1, (Date.now() - this.firstUsed.getTime()) / (1000 * 60 * 60 * 24 * 30));
    this.averageUsagePerMonth = Math.round(this.count / monthsDiff * 100) / 100;
  }
  next();
});

// Statische Methoden
DiagnosisUsageStatsSchema.statics.incrementUsage = function(scope, scopeId, code, catalogYear, context = null) {
  const query = { scope, scopeId, code, catalogYear };
  
  return this.findOneAndUpdate(
    query,
    {
      $inc: { count: 1 },
      $set: { lastUsed: new Date() },
      $setOnInsert: { firstUsed: new Date() }
    },
    { 
      upsert: true, 
      new: true 
    }
  ).then(stats => {
    // Aktualisiere Kontext-spezifische Statistiken
    if (context && stats.contexts) {
      const contextStats = stats.contexts.find(c => c.context === context);
      if (contextStats) {
        contextStats.count += 1;
        contextStats.lastUsed = new Date();
      } else {
        stats.contexts.push({
          context,
          count: 1,
          lastUsed: new Date()
        });
      }
      return stats.save();
    }
    return stats;
  });
};

DiagnosisUsageStatsSchema.statics.getTopCodes = function(scope, scopeId, options = {}) {
  const {
    catalogYear = new Date().getFullYear(),
    limit = 10,
    context = null,
    timeRange = null
  } = options;
  
  let query = { scope, scopeId, catalogYear, isActive: true };
  
  if (timeRange) {
    const daysAgo = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'year' ? 365 : null;
    if (daysAgo) {
      query.lastUsed = { $gte: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000) };
    }
  }
  
  let sortQuery = { count: -1, lastUsed: -1 };
  
  return this.find(query)
    .sort(sortQuery)
    .limit(limit)
    .exec();
};

DiagnosisUsageStatsSchema.statics.getRecentlyUsed = function(scope, scopeId, options = {}) {
  const {
    catalogYear = new Date().getFullYear(),
    limit = 10
  } = options;
  
  return this.find({
    scope,
    scopeId,
    catalogYear,
    isActive: true
  })
  .sort({ lastUsed: -1 })
  .limit(limit)
  .exec();
};

DiagnosisUsageStatsSchema.statics.getUsageAnalytics = function(scope, scopeId, options = {}) {
  const {
    catalogYear = new Date().getFullYear(),
    timeRange = 'month'
  } = options;
  
  const daysAgo = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'year' ? 365 : 30;
  const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        scope,
        scopeId,
        catalogYear,
        isActive: true,
        lastUsed: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalCodes: { $sum: 1 },
        totalUsage: { $sum: '$count' },
        averageUsage: { $avg: '$count' },
        mostUsedCode: { $first: '$code' },
        mostUsedCount: { $first: '$count' }
      }
    }
  ]);
};

DiagnosisUsageStatsSchema.statics.cleanupOldStats = function(olderThanDays = 365) {
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  
  return this.updateMany(
    { lastUsed: { $lt: cutoffDate } },
    { isActive: false }
  );
};

// Zusätzliche Methode für getUsageAnalytics mit korrekter Rückgabe
DiagnosisUsageStatsSchema.statics.getUsageAnalytics = function(scope, scopeId, options = {}) {
  const {
    catalogYear = new Date().getFullYear(),
    timeRange = 'month'
  } = options;
  
  const daysAgo = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'year' ? 365 : 30;
  const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        scope,
        scopeId,
        catalogYear,
        isActive: true,
        lastUsed: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalCodes: { $sum: 1 },
        totalUsage: { $sum: '$count' },
        averageUsage: { $avg: '$count' },
        mostUsedCode: { $first: '$code' },
        mostUsedCount: { $first: '$count' },
        chapterCounts: { $addToSet: '$code' }
      }
    }
  ]);
};

module.exports = mongoose.model('DiagnosisUsageStats', DiagnosisUsageStatsSchema);
