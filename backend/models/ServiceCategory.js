const mongoose = require('mongoose');

const ServiceCategorySchema = new mongoose.Schema({
  // Grunddaten
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Hierarchie
  parent_category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCategory',
    default: null
  },
  level: {
    type: Number,
    default: 0,
    min: 0
  },
  sort_order: {
    type: Number,
    default: 0
  },
  
  // Einstellungen
  color_hex: {
    type: String,
    default: '#2563EB',
    match: /^#[0-9A-F]{6}$/i
  },
  icon: {
    type: String,
    trim: true
  },
  
  // Berechtigungen
  visible_to_roles: [{
    type: String,
    enum: ['arzt', 'therapeut', 'assistenz', 'schwester', 'rezeption', 'admin']
  }],
  
  // Status
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Audit-Felder
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indizes
ServiceCategorySchema.index({ parent_category_id: 1, sort_order: 1 });
ServiceCategorySchema.index({ level: 1, is_active: 1 });
ServiceCategorySchema.index({ name: 1, is_active: 1 });

// Virtual für Hierarchie-Pfad
ServiceCategorySchema.virtual('hierarchy_path').get(function() {
  // Wird durch populate oder separate Query gefüllt
  return this._hierarchy_path || this.name;
});

// Virtual für Unterkategorien
ServiceCategorySchema.virtual('subcategories', {
  ref: 'ServiceCategory',
  localField: '_id',
  foreignField: 'parent_category_id'
});

// Methoden
ServiceCategorySchema.methods.getAncestors = async function() {
  const ancestors = [];
  let current = this;
  
  while (current.parent_category_id) {
    current = await this.constructor.findById(current.parent_category_id);
    if (current) {
      ancestors.unshift(current);
    } else {
      break;
    }
  }
  
  return ancestors;
};

ServiceCategorySchema.methods.getDescendants = async function() {
  const descendants = [];
  
  const findChildren = async (categoryId) => {
    const children = await this.constructor.find({ 
      parent_category_id: categoryId,
      is_active: true 
    }).sort({ sort_order: 1, name: 1 });
    
    for (const child of children) {
      descendants.push(child);
      await findChildren(child._id);
    }
  };
  
  await findChildren(this._id);
  return descendants;
};

ServiceCategorySchema.methods.isVisibleToRole = function(userRole) {
  if (!this.visible_to_roles || this.visible_to_roles.length === 0) return true;
  return this.visible_to_roles.includes(userRole);
};

// Pre-Save Hook für Level-Berechnung
ServiceCategorySchema.pre('save', async function(next) {
  if (this.parent_category_id) {
    const parent = await this.constructor.findById(this.parent_category_id);
    if (parent) {
      this.level = parent.level + 1;
    }
  } else {
    this.level = 0;
  }
  next();
});

// Statische Methoden
ServiceCategorySchema.statics.getTree = async function() {
  const categories = await this.find({ is_active: true })
    .sort({ level: 1, sort_order: 1, name: 1 })
    .lean();
  
  const buildTree = (parentId = null) => {
    return categories
      .filter(cat => cat.parent_category_id?.toString() === parentId?.toString())
      .map(cat => ({
        ...cat,
        children: buildTree(cat._id)
      }));
  };
  
  return buildTree();
};

module.exports = mongoose.model('ServiceCategory', ServiceCategorySchema);
