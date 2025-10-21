const mongoose = require('mongoose');

const Icd10PersonalListSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['favorites', 'custom', 'workflow', 'specialty'],
    default: 'custom',
    required: true
  },
  specialty: {
    type: String,
    trim: true,
    maxlength: 50
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  codes: [{
    code: {
      type: String,
      required: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    longTitle: {
      type: String,
      trim: true
    },
    chapter: {
      type: String,
      trim: true
    },
    isBillable: {
      type: Boolean,
      default: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    sortOrder: {
      type: Number,
      default: 0
    }
  }],
  settings: {
    autoSort: {
      type: Boolean,
      default: true
    },
    sortBy: {
      type: String,
      enum: ['code', 'title', 'addedAt', 'custom'],
      default: 'code'
    },
    groupBy: {
      type: String,
      enum: ['none', 'chapter', 'billable', 'tags'],
      default: 'none'
    },
    showNotes: {
      type: Boolean,
      default: false
    },
    showTags: {
      type: Boolean,
      default: true
    }
  },
  statistics: {
    totalCodes: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date,
      default: Date.now
    },
    usageCount: {
      type: Number,
      default: 0
    },
    mostUsedCodes: [{
      code: String,
      count: Number
    }]
  },
  sharing: {
    isShared: {
      type: Boolean,
      default: false
    },
    sharedWith: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permission: {
        type: String,
        enum: ['read', 'write', 'admin'],
        default: 'read'
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    shareToken: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'icd10personallists'
});

// Indexes
Icd10PersonalListSchema.index({ userId: 1, type: 1 });
Icd10PersonalListSchema.index({ userId: 1, isActive: 1 });
Icd10PersonalListSchema.index({ 'codes.code': 1 });
Icd10PersonalListSchema.index({ 'sharing.shareToken': 1 });
Icd10PersonalListSchema.index({ name: 'text', description: 'text' });

// Virtual for code count
Icd10PersonalListSchema.virtual('codeCount').get(function() {
  return this.codes.length;
});

// Pre-save middleware to update statistics
Icd10PersonalListSchema.pre('save', function(next) {
  this.statistics.totalCodes = this.codes.length;
  this.statistics.lastUsed = new Date();
  next();
});

// Static methods
Icd10PersonalListSchema.statics.findByUser = function(userId, options = {}) {
  const {
    type = null,
    isActive = true,
    includeShared = false
  } = options;

  const query = { isActive };
  
  if (type) {
    query.type = type;
  }
  
  if (includeShared) {
    query.$or = [
      { userId: userId },
      { 'sharing.isShared': true, 'sharing.sharedWith.userId': userId }
    ];
  } else {
    query.userId = userId;
  }

  return this.find(query)
    .populate('userId', 'email firstName lastName')
    .populate('codes.addedBy', 'email firstName lastName')
    .sort({ 'statistics.lastUsed': -1, name: 1 });
};

Icd10PersonalListSchema.statics.findByCode = function(code, userId) {
  return this.find({
    userId: userId,
    'codes.code': code,
    isActive: true
  });
};

Icd10PersonalListSchema.statics.getFavorites = function(userId, limit = 50) {
  return this.findOne({
    userId: userId,
    type: 'favorites',
    isActive: true
  })
  .populate('codes.addedBy', 'email firstName lastName')
  .then(list => {
    if (!list) {
      // Create default favorites list if it doesn't exist
      return this.create({
        userId: userId,
        name: 'Favoriten',
        type: 'favorites',
        isDefault: true,
        codes: []
      });
    }
    return list;
  });
};

Icd10PersonalListSchema.statics.addToFavorites = function(userId, codeData) {
  return this.getFavorites(userId).then(list => {
    // Check if code already exists
    const existingCode = list.codes.find(c => c.code === codeData.code);
    if (existingCode) {
      return list;
    }

    list.codes.push({
      ...codeData,
      addedAt: new Date(),
      addedBy: userId
    });

    return list.save();
  });
};

Icd10PersonalListSchema.statics.removeFromFavorites = function(userId, code) {
  return this.getFavorites(userId).then(list => {
    list.codes = list.codes.filter(c => c.code !== code);
    return list.save();
  });
};

Icd10PersonalListSchema.statics.getMostUsed = function(userId, limit = 10) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), isActive: true } },
    { $unwind: '$codes' },
    { $group: { _id: '$codes.code', count: { $sum: 1 }, title: { $first: '$codes.title' } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

Icd10PersonalListSchema.statics.searchInLists = function(userId, query, options = {}) {
  const {
    listTypes = ['favorites', 'custom'],
    limit = 20
  } = options;

  return this.find({
    userId: userId,
    type: { $in: listTypes },
    isActive: true,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { 'codes.code': { $regex: query, $options: 'i' } },
      { 'codes.title': { $regex: query, $options: 'i' } }
    ]
  })
  .populate('codes.addedBy', 'email firstName lastName')
  .limit(limit);
};

// Instance methods
Icd10PersonalListSchema.methods.addCode = function(codeData, addedBy) {
  const existingCode = this.codes.find(c => c.code === codeData.code);
  if (existingCode) {
    return this;
  }

  this.codes.push({
    ...codeData,
    addedAt: new Date(),
    addedBy: addedBy
  });

  return this.save();
};

Icd10PersonalListSchema.methods.removeCode = function(code) {
  this.codes = this.codes.filter(c => c.code !== code);
  return this.save();
};

Icd10PersonalListSchema.methods.updateCode = function(code, updates) {
  const codeIndex = this.codes.findIndex(c => c.code === code);
  if (codeIndex !== -1) {
    this.codes[codeIndex] = { ...this.codes[codeIndex], ...updates };
  }
  return this.save();
};

Icd10PersonalListSchema.methods.reorderCodes = function(codeOrders) {
  codeOrders.forEach(({ code, sortOrder }) => {
    const codeIndex = this.codes.findIndex(c => c.code === code);
    if (codeIndex !== -1) {
      this.codes[codeIndex].sortOrder = sortOrder;
    }
  });
  return this.save();
};

Icd10PersonalListSchema.methods.incrementUsage = function() {
  this.statistics.usageCount += 1;
  this.statistics.lastUsed = new Date();
  return this.save();
};

Icd10PersonalListSchema.methods.shareWithUser = function(userId, permission = 'read') {
  const existingShare = this.sharing.sharedWith.find(s => s.userId.toString() === userId.toString());
  if (existingShare) {
    existingShare.permission = permission;
  } else {
    this.sharing.sharedWith.push({
      userId: userId,
      permission: permission,
      addedAt: new Date()
    });
  }
  return this.save();
};

Icd10PersonalListSchema.methods.unshareWithUser = function(userId) {
  this.sharing.sharedWith = this.sharing.sharedWith.filter(s => s.userId.toString() !== userId.toString());
  return this.save();
};

module.exports = mongoose.model('Icd10PersonalList', Icd10PersonalListSchema);
