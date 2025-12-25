const mongoose = require('mongoose');

/**
 * Model für angepasste Permissions von System-Rollen
 * Ermöglicht es, die Standard-Permissions von System-Rollen zu überschreiben
 */
const RolePermissionSchema = new mongoose.Schema({
  roleId: {
    type: String,
    required: true,
    unique: true,
    enum: ['super_admin', 'admin', 'arzt', 'assistent', 'rezeption', 'billing', 'patient'],
    index: true
  },
  // Angepasste Permissions (überschreibt Standard-Permissions)
  customPermissions: {
    type: Map,
    of: [String], // Array von Actions für jede Resource
    default: {}
  },
  // Metadaten
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  modifiedAt: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  },
  // Optional: Beschreibung der Änderungen
  changeReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index für schnelle Suche
RolePermissionSchema.index({ roleId: 1 });

// Statische Methode: Lade angepasste Permissions für eine Rolle
RolePermissionSchema.statics.getRolePermissions = async function(roleId) {
  const rolePermission = await this.findOne({ roleId });
  if (!rolePermission) {
    return null;
  }

  // Konvertiere Map zu Object
  const permissions = {};
  if (rolePermission.customPermissions) {
    rolePermission.customPermissions.forEach((actions, resource) => {
      permissions[resource] = Array.isArray(actions) ? actions : [];
    });
  }

  return {
    roleId: rolePermission.roleId,
    permissions,
    modifiedBy: rolePermission.modifiedBy,
    modifiedAt: rolePermission.modifiedAt,
    version: rolePermission.version
  };
};

// Statische Methode: Speichere angepasste Permissions für eine Rolle
RolePermissionSchema.statics.saveRolePermissions = async function(roleId, permissions, modifiedBy, changeReason = null) {
  // Konvertiere Object zu Map
  const customPermissions = new Map();
  if (permissions && typeof permissions === 'object') {
    Object.entries(permissions).forEach(([resource, actions]) => {
      if (Array.isArray(actions)) {
        customPermissions.set(resource, actions);
      }
    });
  }

  const rolePermission = await this.findOneAndUpdate(
    { roleId },
    {
      customPermissions,
      modifiedBy,
      modifiedAt: new Date(),
      $inc: { version: 1 },
      changeReason: changeReason || undefined
    },
    {
      upsert: true,
      new: true
    }
  );

  return rolePermission;
};

module.exports = mongoose.model('RolePermission', RolePermissionSchema);

