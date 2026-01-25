const express = require('express');
const router = express.Router();
const User = require('../models/User');
const RolePermission = require('../models/RolePermission');
const { ROLES, ACTIONS, RESOURCES, authorize, clearPermissionCache } = require('../utils/rbac');
const { rbacMiddleware } = require('../middleware/rbac');
const auth = require('../middleware/auth');
const { 
  validateRolePermissions, 
  validateCustomPermissions,
  validatePermissionStrings,
  normalizePermissionStrings
} = require('../utils/permissionValidator');

/**
 * RBAC Management API
 * Verwaltung von Rollen, Permissions und ACLs
 */

// ===== ROLLEN MANAGEMENT =====

/**
 * @route   GET /api/rbac/roles
 * @desc    Alle verfügbaren Rollen abrufen
 * @access  Private (Admin)
 */
router.get('/roles', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const roles = await Promise.all(
      Object.values(ROLES).map(async (role) => {
        const finalPermissions = await getRolePermissions(role, true);
        const standardPermissions = await getRolePermissions(role, false);
        const hasCustomPermissions = JSON.stringify(finalPermissions) !== JSON.stringify(standardPermissions);
        
        return {
          value: role,
          label: getRoleLabel(role),
          description: getRoleDescription(role),
          level: getRoleLevel(role),
          permissions: finalPermissions,
          hasCustomPermissions
        };
      })
    );

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Rollen'
    });
  }
});

/**
 * @route   GET /api/rbac/roles/:role/permissions
 * @desc    Permissions einer bestimmten Rolle abrufen (inkl. angepasste Permissions)
 * @access  Private (Admin)
 */
router.get('/roles/:role/permissions', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Rolle'
      });
    }

    // Lade Permissions (inkl. angepasste)
    const finalPermissions = await getRolePermissions(role, true);
    const standardPermissions = await getRolePermissions(role, false);
    
    // Lade Metadaten für angepasste Permissions
    const rolePermission = await RolePermission.getRolePermissions(role);
    
    res.json({
      success: true,
      data: {
        role,
        permissions: finalPermissions,
        standardPermissions,
        customPermissions: rolePermission ? rolePermission.permissions : null,
        inheritedPermissions: getInheritedPermissions(role),
        modifiedBy: rolePermission?.modifiedBy,
        modifiedAt: rolePermission?.modifiedAt,
        version: rolePermission?.version || 1
      }
    });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Rollen-Permissions'
    });
  }
});

/**
 * @route   PUT /api/rbac/roles/:role/permissions
 * @desc    Angepasste Permissions für eine System-Rolle speichern
 * @access  Private (Admin)
 */
router.put('/roles/:role/permissions', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions, changeReason } = req.body;
    
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Rolle'
      });
    }

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Permissions müssen ein Objekt sein'
      });
    }

    // Validiere Permissions-Format mit Validator
    const validationResult = validateRolePermissions(permissions);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Permissions',
        errors: validationResult.errors
      });
    }

    // Speichere angepasste Permissions
    const rolePermission = await RolePermission.saveRolePermissions(
      role,
      validPermissions,
      req.user.id,
      changeReason
    );

    // Cache löschen für diese Rolle
    clearPermissionCache();

    res.json({
      success: true,
      message: 'Rollen-Permissions erfolgreich gespeichert',
      data: {
        role,
        permissions: validPermissions,
        modifiedBy: rolePermission.modifiedBy,
        modifiedAt: rolePermission.modifiedAt,
        version: rolePermission.version
      }
    });
  } catch (error) {
    console.error('Error saving role permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Speichern der Rollen-Permissions'
    });
  }
});

/**
 * @route   DELETE /api/rbac/roles/:role/permissions
 * @desc    Angepasste Permissions für eine System-Rolle zurücksetzen (auf Standard)
 * @access  Private (Admin)
 */
router.delete('/roles/:role/permissions', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Rolle'
      });
    }

    // Lösche angepasste Permissions
    await RolePermission.findOneAndDelete({ roleId: role });

    // Cache löschen
    clearPermissionCache();

    const standardPermissions = await getRolePermissions(role, false);

    res.json({
      success: true,
      message: 'Rollen-Permissions auf Standard zurückgesetzt',
      data: {
        role,
        permissions: standardPermissions
      }
    });
  } catch (error) {
    console.error('Error resetting role permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Zurücksetzen der Rollen-Permissions'
    });
  }
});

// ===== MIGRATION =====

/**
 * @route   POST /api/rbac/migrate-permissions
 * @desc    Migriert alte user.permissions zu rbac.customPermissions
 * @access  Private (Super Admin)
 */
router.post('/migrate-permissions', auth, rbacMiddleware.requireSuperAdmin, async (req, res) => {
  try {
    const { userId, dryRun = false } = req.body;
    const { migrateUserPermissions } = require('../scripts/migrate-permissions');
    
    let users;
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Benutzer nicht gefunden'
        });
      }
      users = [user];
    } else {
      users = await User.find({
        permissions: { $exists: true, $ne: [], $size: { $gt: 0 } }
      });
    }

    const results = [];
    let totalMigrated = 0;
    let totalSkipped = 0;

    for (const user of users) {
      const result = await migrateUserPermissions(user, dryRun);
      totalMigrated += result.migrated;
      totalSkipped += result.skipped;
      
      if (!dryRun && result.migrated > 0) {
        await user.save();
        // Cache löschen
        clearPermissionCache(user._id.toString());
      }

      results.push({
        userId: user._id,
        email: user.email,
        migrated: result.migrated,
        skipped: result.skipped
      });
    }

    res.json({
      success: true,
      message: dryRun ? 'Dry-Run abgeschlossen' : 'Migration abgeschlossen',
      data: {
        totalProcessed: users.length,
        totalMigrated,
        totalSkipped,
        results
      }
    });
  } catch (error) {
    console.error('Error migrating permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Migration',
      error: error.message
    });
  }
});

// ===== USER ROLE MANAGEMENT =====

/**
 * @route   GET /api/rbac/users/:userId/roles
 * @desc    Rollen eines Benutzers abrufen
 * @access  Private (Admin)
 */
router.get('/users/:userId/roles', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('role rbac.resourceRoles');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    const effectivePermissions = await getEffectivePermissions(user);

    res.json({
      success: true,
      data: {
        primaryRole: user.role,
        resourceRoles: user.rbac?.resourceRoles || [],
        effectivePermissions
      }
    });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Benutzer-Rollen'
    });
  }
});

/**
 * @route   POST /api/rbac/users/:userId/roles
 * @desc    Rolle eines Benutzers ändern
 * @access  Private (Super Admin)
 */
router.post('/users/:userId/roles', auth, rbacMiddleware.requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, reason } = req.body;
    
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Rolle'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    const oldRole = user.role;
    user.role = role;
    
    // Logge Rollenänderung
    user.rbac.permissionHistory.push({
      action: 'modified',
      permission: 'role',
      changedBy: req.user.id,
      reason: reason || 'Rolle geändert',
      previousValue: oldRole
    });

    await user.save();

    res.json({
      success: true,
      message: 'Rolle erfolgreich geändert',
      data: {
        userId,
        oldRole,
        newRole: role
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ändern der Rolle'
    });
  }
});

/**
 * @route   POST /api/rbac/users/:userId/resource-roles
 * @desc    Resource-spezifische Rolle zuweisen
 * @access  Private (Admin)
 */
router.post('/users/:userId/resource-roles', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { resource, resourceId, role, expiresAt, reason } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Prüfe ob Resource-Rolle bereits existiert
    const existingRole = user.rbac.resourceRoles.find(
      rr => rr.resource === resource && 
            rr.resourceId?.toString() === resourceId?.toString()
    );

    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Resource-Rolle bereits zugewiesen'
      });
    }

    // Füge Resource-Rolle hinzu
    user.rbac.resourceRoles.push({
      resource,
      resourceId,
      role,
      grantedBy: req.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    // Logge Änderung
    user.rbac.permissionHistory.push({
      action: 'granted',
      permission: `${resource}:${role}`,
      resource,
      resourceId,
      changedBy: req.user.id,
      reason: reason || 'Resource-Rolle zugewiesen'
    });

    await user.save();

    res.json({
      success: true,
      message: 'Resource-Rolle erfolgreich zugewiesen',
      data: {
        userId,
        resource,
        resourceId,
        role,
        expiresAt
      }
    });
  } catch (error) {
    console.error('Error assigning resource role:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Zuweisen der Resource-Rolle'
    });
  }
});

// ===== PERMISSION MANAGEMENT =====

/**
 * @route   GET /api/rbac/permissions
 * @desc    Alle verfügbaren Permissions abrufen
 * @access  Private (Admin)
 */
router.get('/permissions', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const permissions = Object.values(ACTIONS).map(action => ({
      action,
      label: getActionLabel(action),
      description: getActionDescription(action),
      resources: getResourcesForAction(action)
    }));

    res.json({
      success: true,
      data: {
        actions: permissions,
        resources: Object.values(RESOURCES).map(resource => ({
          value: resource,
          label: getResourceLabel(resource),
          description: getResourceDescription(resource)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Permissions'
    });
  }
});

/**
 * @route   POST /api/rbac/users/:userId/permissions
 * @desc    Einfache Permission für einen Benutzer zuweisen
 * @access  Private (Admin)
 */
router.post('/users/:userId/permissions', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { permission, resource, resourceId, reason } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Wenn permission ein String ist (z.B. "create"), parsen wir es
    let parsedResource = resource || 'system';
    let parsedActions = [];
    
    if (typeof permission === 'string') {
      // Einfaches Format: "create", "read", etc.
      if (Object.values(ACTIONS).includes(permission)) {
        parsedActions = [permission];
      } else if (permission.includes('.')) {
        // Format: "resource.action" oder "action"
        const parts = permission.split('.');
        if (parts.length === 2) {
          parsedResource = parts[0];
          parsedActions = [parts[1]];
        } else {
          parsedActions = [parts[0]];
        }
      } else {
        parsedActions = [permission];
      }
    } else if (Array.isArray(permission)) {
      parsedActions = permission;
    }

    // Validiere Resource und Actions
    const { validateResourceAction } = require('../utils/permissionValidator');
    const resourceValidation = validateResourceAction(parsedResource, parsedActions[0]);
    if (!resourceValidation.valid) {
      return res.status(400).json({
        success: false,
        message: resourceValidation.error
      });
    }

    // Validiere alle Actions
    const validActions = parsedActions.filter(action => 
      Object.values(ACTIONS).includes(action) || action === '*'
    );
    if (validActions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine gültigen Actions angegeben'
      });
    }

    // Füge Custom Permission hinzu
    if (!user.rbac) {
      user.rbac = {
        customPermissions: [],
        resourceRoles: [],
        permissionHistory: []
      };
    }

    user.rbac.customPermissions.push({
      resource: parsedResource,
      resourceId: resourceId || null,
      actions: validActions,
      conditions: {},
      grantedBy: req.user.id,
      expiresAt: null
    });

    // Logge Änderung
    user.rbac.permissionHistory.push({
      action: 'granted',
      permission: `${parsedResource}:${validActions.join(',')}`,
      resource: parsedResource,
      resourceId: resourceId || null,
      changedBy: req.user.id,
      reason: reason || 'Permission zugewiesen'
    });

    await user.save();

    // Cache löschen für diesen Benutzer
    clearPermissionCache(userId);

    res.json({
      success: true,
      message: 'Permission erfolgreich zugewiesen',
      data: {
        userId,
        resource: parsedResource,
        resourceId: resourceId || null,
        actions: validActions
      }
    });
  } catch (error) {
    console.error('Error assigning permission:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Zuweisen der Permission'
    });
  }
});

/**
 * @route   DELETE /api/rbac/users/:userId/permissions/:permission
 * @desc    Permission von einem Benutzer entfernen
 * @access  Private (Admin)
 */
router.delete('/users/:userId/permissions/:permission', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { userId, permission } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    if (!user.rbac || !user.rbac.customPermissions) {
      return res.status(404).json({
        success: false,
        message: 'Keine Custom Permissions gefunden'
      });
    }

    // Parse permission (kann "resource.action" oder nur "action" sein)
    let resourceToRemove = null;
    let actionToRemove = null;
    
    if (permission.includes('.')) {
      const parts = permission.split('.');
      resourceToRemove = parts[0];
      actionToRemove = parts[1];
    } else {
      actionToRemove = permission;
    }

    // Entferne Permission
    const initialLength = user.rbac.customPermissions.length;
    user.rbac.customPermissions = user.rbac.customPermissions.filter(cp => {
      if (resourceToRemove && cp.resource !== resourceToRemove) {
        return true;
      }
      if (actionToRemove && !cp.actions.includes(actionToRemove)) {
        return true;
      }
      // Wenn beide übereinstimmen, entfernen wir die Permission
      return false;
    });

    if (user.rbac.customPermissions.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Permission nicht gefunden'
      });
    }

    // Logge Änderung
    user.rbac.permissionHistory.push({
      action: 'revoked',
      permission: permission,
      changedBy: req.user.id,
      reason: 'Permission entfernt'
    });

    await user.save();

    // Cache löschen für diesen Benutzer
    clearPermissionCache(userId);

    res.json({
      success: true,
      message: 'Permission erfolgreich entfernt',
      data: {
        userId,
        permission
      }
    });
  } catch (error) {
    console.error('Error revoking permission:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Entfernen der Permission'
    });
  }
});

/**
 * @route   POST /api/rbac/users/:userId/custom-permissions
 * @desc    Custom Permissions für einen Benutzer erstellen
 * @access  Private (Admin)
 */
router.post('/users/:userId/custom-permissions', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { resource, resourceId, actions, conditions, expiresAt, reason } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Validiere Custom Permissions mit Validator
    const customPermission = {
      resource,
      resourceId,
      actions: Array.isArray(actions) ? actions : [actions],
      conditions: conditions || {},
      expiresAt: expiresAt ? new Date(expiresAt) : null
    };

    const validationResult = validateCustomPermissions([customPermission]);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Custom Permission',
        errors: validationResult.errors
      });
    }

    // Füge Custom Permission hinzu
    user.rbac.customPermissions.push({
      ...customPermission,
      grantedBy: req.user.id
    });

    // Logge Änderung
    user.rbac.permissionHistory.push({
      action: 'granted',
      permission: `${resource}:${validActions.join(',')}`,
      resource,
      resourceId,
      changedBy: req.user.id,
      reason: reason || 'Custom Permission erstellt'
    });

    await user.save();

    // Cache löschen für diesen Benutzer
    clearPermissionCache(userId);

    res.json({
      success: true,
      message: 'Custom Permission erfolgreich erstellt',
      data: {
        userId,
        resource,
        resourceId,
        actions: validActions,
        conditions,
        expiresAt
      }
    });
  } catch (error) {
    console.error('Error creating custom permission:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Custom Permission'
    });
  }
});

// ===== ACL MANAGEMENT =====

/**
 * @route   GET /api/rbac/resources/:resource/:resourceId/acl
 * @desc    ACL einer Resource abrufen
 * @access  Private (Admin)
 */
router.get('/resources/:resource/:resourceId/acl', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { resource, resourceId } = req.params;
    
    const ResourceModel = getResourceModel(resource);
    if (!ResourceModel) {
      return res.status(400).json({
        success: false,
        message: 'Unbekannte Resource'
      });
    }

    const resourceObject = await ResourceModel.findById(resourceId);
    if (!resourceObject) {
      return res.status(404).json({
        success: false,
        message: 'Resource nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: {
        resource,
        resourceId,
        acl: resourceObject.acl || null
      }
    });
  } catch (error) {
    console.error('Error fetching ACL:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der ACL'
    });
  }
});

/**
 * @route   PUT /api/rbac/resources/:resource/:resourceId/acl
 * @desc    ACL einer Resource aktualisieren
 * @access  Private (Admin)
 */
router.put('/resources/:resource/:resourceId/acl', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { resource, resourceId } = req.params;
    const { acl, reason } = req.body;
    
    const ResourceModel = getResourceModel(resource);
    if (!ResourceModel) {
      return res.status(400).json({
        success: false,
        message: 'Unbekannte Resource'
      });
    }

    const resourceObject = await ResourceModel.findById(resourceId);
    if (!resourceObject) {
      return res.status(404).json({
        success: false,
        message: 'Resource nicht gefunden'
      });
    }

    // Aktualisiere ACL
    resourceObject.acl = {
      ...acl,
      metadata: {
        ...acl.metadata,
        lastModified: new Date(),
        version: (resourceObject.acl?.metadata?.version || 0) + 1
      }
    };

    await resourceObject.save();

    res.json({
      success: true,
      message: 'ACL erfolgreich aktualisiert',
      data: {
        resource,
        resourceId,
        acl: resourceObject.acl
      }
    });
  } catch (error) {
    console.error('Error updating ACL:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der ACL'
    });
  }
});

// ===== AUTHORIZATION TEST =====

/**
 * @route   POST /api/rbac/test-authorization
 * @desc    Autorisierung testen
 * @access  Private (Admin)
 */
router.post('/test-authorization', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { userId, action, resource, resourceId, context } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    let resourceObject = null;
    if (resourceId) {
      const ResourceModel = getResourceModel(resource);
      if (ResourceModel) {
        resourceObject = await ResourceModel.findById(resourceId);
      }
    }

    const result = await authorize(user, action, resource, resourceObject, context || {});

    res.json({
      success: true,
      data: {
        userId,
        action,
        resource,
        resourceId,
        allowed: result.allowed,
        reason: result.reason,
        auditData: result.auditData
      }
    });
  } catch (error) {
    console.error('Error testing authorization:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Testen der Autorisierung'
    });
  }
});

// ===== AUDIT LOGS =====

/**
 * @route   GET /api/rbac/audit-logs
 * @desc    RBAC Audit Logs abrufen
 * @access  Private (Admin)
 */
router.get('/audit-logs', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action, resource } = req.query;
    
    const AuditLog = require('../models/AuditLog');
    
    const query = {
      action: { $in: ['authorization', 'permission_granted', 'permission_denied', 'role_assigned', 'role_revoked'] }
    };
    
    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resource) query.resource = resource;

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'firstName lastName email role')
      .select('-__v');

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Audit Logs'
    });
  }
});

/**
 * @route   GET /api/rbac/audit-logs/export
 * @desc    RBAC Audit Logs als CSV exportieren
 * @access  Private (Admin)
 */
router.get('/audit-logs/export', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { userId, action, resource } = req.query;
    
    const AuditLog = require('../models/AuditLog');
    
    const query = {
      action: { $in: ['authorization', 'permission_granted', 'permission_denied', 'role_assigned', 'role_revoked'] }
    };
    
    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resource) query.resource = resource;

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .populate('userId', 'firstName lastName email role')
      .select('-__v')
      .lean();

    // CSV-Header
    const csvHeader = 'Timestamp,User,Action,Resource,ResourceId,Result,Reason,IP Address\n';
    
    // CSV-Daten
    const csvRows = logs.map(log => {
      const user = log.userId ? `${log.userId.firstName || ''} ${log.userId.lastName || ''}`.trim() : 'Unknown';
      const timestamp = log.timestamp ? new Date(log.timestamp).toISOString() : '';
      const action = log.action || '';
      const resource = log.resource || '';
      const resourceId = log.resourceId || '';
      const result = log.result || '';
      const reason = (log.reason || '').replace(/"/g, '""'); // Escape quotes
      const ipAddress = log.ipAddress || '';
      
      return `"${timestamp}","${user}","${action}","${resource}","${resourceId}","${result}","${reason}","${ipAddress}"`;
    });
    
    const csvContent = csvHeader + csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Exportieren der Audit Logs'
    });
  }
});

// ===== HILFSFUNKTIONEN =====

function getRoleLabel(role) {
  const labels = {
    [ROLES.SUPER_ADMIN]: 'Super Administrator',
    [ROLES.ADMIN]: 'Administrator',
    [ROLES.ARZT]: 'Arzt',
    [ROLES.ASSISTENT]: 'Assistent',
    [ROLES.REZEPTION]: 'Rezeption',
    [ROLES.BILLING]: 'Billing',
    [ROLES.PATIENT]: 'Patient'
  };
  return labels[role] || role;
}

function getRoleDescription(role) {
  const descriptions = {
    [ROLES.SUPER_ADMIN]: 'Vollzugriff auf alle Systemfunktionen',
    [ROLES.ADMIN]: 'Administrative Funktionen und Benutzerverwaltung',
    [ROLES.ARZT]: 'Medizinische Funktionen und Patientenbehandlung',
    [ROLES.ASSISTENT]: 'Unterstützung bei medizinischen Aufgaben',
    [ROLES.REZEPTION]: 'Terminverwaltung und Patientenanmeldung',
    [ROLES.BILLING]: 'Abrechnung und Rechnungsstellung',
    [ROLES.PATIENT]: 'Eigene Daten einsehen und Termine buchen'
  };
  return descriptions[role] || 'Keine Beschreibung verfügbar';
}

function getRoleLevel(role) {
  const levels = {
    [ROLES.SUPER_ADMIN]: 6,
    [ROLES.ADMIN]: 5,
    [ROLES.ARZT]: 4,
    [ROLES.ASSISTENT]: 3,
    [ROLES.REZEPTION]: 2,
    [ROLES.BILLING]: 2,
    [ROLES.PATIENT]: 1
  };
  return levels[role] || 0;
}

/**
 * Gibt Permissions für eine Rolle zurück (inkl. angepasste Permissions)
 * @param {string} role - Rollen-ID
 * @param {boolean} includeCustom - Ob angepasste Permissions eingeschlossen werden sollen
 * @returns {Promise<Object>} Permissions-Objekt
 */
async function getRolePermissions(role, includeCustom = true) {
  const { ROLE_PERMISSIONS } = require('../utils/rbac');
  const standardPermissions = ROLE_PERMISSIONS[role] || {};
  
  if (!includeCustom) {
    return standardPermissions;
  }

  // Lade angepasste Permissions
  try {
    const rolePermission = await RolePermission.getRolePermissions(role);
    if (rolePermission && rolePermission.permissions) {
      // Merge: Angepasste Permissions überschreiben Standard-Permissions
      return { ...standardPermissions, ...rolePermission.permissions };
    }
  } catch (error) {
    // Ignoriere Fehler (Rolle hat keine angepassten Permissions)
  }

  return standardPermissions;
}

function getInheritedPermissions(role) {
  const { ROLE_HIERARCHY } = require('../utils/rbac');
  return ROLE_HIERARCHY[role] || [];
}

async function getEffectivePermissions(user) {
  // Kombiniere Rollen-Permissions mit Custom Permissions
  const rolePermissions = await getRolePermissions(user.role, true);
  const customPermissions = user.rbac?.customPermissions || [];
  
  // Vereinfachte Darstellung - in der Praxis würde man hier die Permissions zusammenführen
  return {
    rolePermissions,
    customPermissions: customPermissions.map(cp => ({
      resource: cp.resource,
      actions: cp.actions,
      conditions: cp.conditions
    }))
  };
}

function getActionLabel(action) {
  const labels = {
    [ACTIONS.CREATE]: 'Erstellen',
    [ACTIONS.READ]: 'Lesen',
    [ACTIONS.UPDATE]: 'Aktualisieren',
    [ACTIONS.DELETE]: 'Löschen',
    [ACTIONS.BOOK]: 'Buchen',
    [ACTIONS.CANCEL]: 'Stornieren',
    [ACTIONS.RESCHEDULE]: 'Verschieben',
    [ACTIONS.GENERATE]: 'Generieren',
    [ACTIONS.PRINT]: 'Drucken',
    [ACTIONS.SHARE]: 'Teilen',
    [ACTIONS.EXPORT]: 'Exportieren',
    [ACTIONS.IMPORT]: 'Importieren',
    [ACTIONS.APPROVE]: 'Genehmigen',
    [ACTIONS.REJECT]: 'Ablehnen',
    [ACTIONS.ASSIGN]: 'Zuweisen',
    [ACTIONS.UNASSIGN]: 'Zuweisung aufheben',
    [ACTIONS.AUDIT]: 'Auditieren',
    [ACTIONS.CONFIGURE]: 'Konfigurieren',
    [ACTIONS.MANAGE_USERS]: 'Benutzer verwalten',
    [ACTIONS.MANAGE_ROLES]: 'Rollen verwalten',
    [ACTIONS.MANAGE_PERMISSIONS]: 'Berechtigungen verwalten',
    [ACTIONS.DIAGNOSE]: 'Diagnostizieren',
    [ACTIONS.PRESCRIBE]: 'Verschreiben',
    [ACTIONS.TREAT]: 'Behandeln',
    [ACTIONS.REFER]: 'Überweisen',
    [ACTIONS.DISCHARGE]: 'Entlassen'
  };
  return labels[action] || action;
}

function getActionDescription(action) {
  const descriptions = {
    [ACTIONS.CREATE]: 'Neue Ressourcen erstellen',
    [ACTIONS.READ]: 'Ressourcen anzeigen und lesen',
    [ACTIONS.UPDATE]: 'Bestehende Ressourcen bearbeiten',
    [ACTIONS.DELETE]: 'Ressourcen löschen',
    [ACTIONS.BOOK]: 'Termine buchen',
    [ACTIONS.CANCEL]: 'Termine stornieren',
    [ACTIONS.RESCHEDULE]: 'Termine verschieben',
    [ACTIONS.GENERATE]: 'Dokumente generieren',
    [ACTIONS.PRINT]: 'Dokumente drucken',
    [ACTIONS.SHARE]: 'Ressourcen teilen',
    [ACTIONS.EXPORT]: 'Daten exportieren',
    [ACTIONS.IMPORT]: 'Daten importieren',
    [ACTIONS.APPROVE]: 'Anträge genehmigen',
    [ACTIONS.REJECT]: 'Anträge ablehnen',
    [ACTIONS.ASSIGN]: 'Ressourcen zuweisen',
    [ACTIONS.UNASSIGN]: 'Zuweisungen aufheben',
    [ACTIONS.AUDIT]: 'Audit-Logs einsehen',
    [ACTIONS.CONFIGURE]: 'System konfigurieren',
    [ACTIONS.MANAGE_USERS]: 'Benutzer verwalten',
    [ACTIONS.MANAGE_ROLES]: 'Rollen verwalten',
    [ACTIONS.MANAGE_PERMISSIONS]: 'Berechtigungen verwalten',
    [ACTIONS.DIAGNOSE]: 'Medizinische Diagnosen stellen',
    [ACTIONS.PRESCRIBE]: 'Medikamente verschreiben',
    [ACTIONS.TREAT]: 'Patienten behandeln',
    [ACTIONS.REFER]: 'Patienten überweisen',
    [ACTIONS.DISCHARGE]: 'Patienten entlassen'
  };
  return descriptions[action] || 'Keine Beschreibung verfügbar';
}

function getResourcesForAction(action) {
  const { ROLE_PERMISSIONS } = require('../utils/rbac');
  const resources = [];
  
  Object.entries(ROLE_PERMISSIONS).forEach(([role, permissions]) => {
    Object.entries(permissions).forEach(([resource, actions]) => {
      if (actions.includes(action) && !resources.includes(resource)) {
        resources.push(resource);
      }
    });
  });
  
  return resources;
}

function getResourceLabel(resource) {
  const labels = {
    [RESOURCES.PATIENT]: 'Patient',
    [RESOURCES.APPOINTMENT]: 'Termin',
    [RESOURCES.DOCUMENT]: 'Dokument',
    [RESOURCES.DIAGNOSIS]: 'Diagnose',
    [RESOURCES.PRESCRIPTION]: 'Rezept',
    [RESOURCES.BILLING]: 'Abrechnung',
    [RESOURCES.USER]: 'Benutzer',
    [RESOURCES.ROLE]: 'Rolle',
    [RESOURCES.LOCATION]: 'Standort',
    [RESOURCES.SERVICE]: 'Service',
    [RESOURCES.TEMPLATE]: 'Template',
    [RESOURCES.AUDIT_LOG]: 'Audit Log',
    [RESOURCES.SYSTEM]: 'System'
  };
  return labels[resource] || resource;
}

function getResourceDescription(resource) {
  const descriptions = {
    [RESOURCES.PATIENT]: 'Patientendaten und -informationen',
    [RESOURCES.APPOINTMENT]: 'Termine und Terminplanung',
    [RESOURCES.DOCUMENT]: 'Medizinische Dokumente',
    [RESOURCES.DIAGNOSIS]: 'Medizinische Diagnosen',
    [RESOURCES.PRESCRIPTION]: 'Medikamentenrezepte',
    [RESOURCES.BILLING]: 'Abrechnungsdaten',
    [RESOURCES.USER]: 'Benutzerkonten',
    [RESOURCES.ROLE]: 'Rollen und Berechtigungen',
    [RESOURCES.LOCATION]: 'Standorte und Filialen',
    [RESOURCES.SERVICE]: 'Medizinische Services',
    [RESOURCES.TEMPLATE]: 'Dokumentvorlagen',
    [RESOURCES.AUDIT_LOG]: 'Audit- und Logdaten',
    [RESOURCES.SYSTEM]: 'Systemkonfiguration'
  };
  return descriptions[resource] || 'Keine Beschreibung verfügbar';
}

function getResourceModel(resource) {
  const models = {
    [RESOURCES.PATIENT]: require('../models/Patient'),
    [RESOURCES.APPOINTMENT]: require('../models/Appointment'),
    [RESOURCES.DOCUMENT]: require('../models/Document'),
    [RESOURCES.BILLING]: require('../models/Invoice'),
    [RESOURCES.USER]: require('../models/User'),
    [RESOURCES.LOCATION]: require('../models/Location')
  };
  
  return models[resource];
}

// ===== TEST ENDPOINTS =====

/**
 * @route   POST /api/rbac/test/authorize
 * @desc    Testet die authorize() Funktion
 * @access  Private (Admin)
 */
router.post('/test/authorize', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { action, resource, resourceObject, context } = req.body;
    
    if (!action || !resource) {
      return res.status(400).json({
        success: false,
        message: 'action und resource sind erforderlich'
      });
    }

    // Validiere Action und Resource
    if (!Object.values(ACTIONS).includes(action) && action !== '*') {
      return res.status(400).json({
        success: false,
        message: `Ungültige Action: ${action}`,
        validActions: Object.values(ACTIONS)
      });
    }

    if (!Object.values(RESOURCES).includes(resource) && resource !== '*') {
      return res.status(400).json({
        success: false,
        message: `Ungültige Resource: ${resource}`,
        validResources: Object.values(RESOURCES)
      });
    }

    // Führe Autorisierung durch
    const result = await authorize(
      req.user,
      action,
      resource,
      resourceObject || null,
      context || {}
    );

    res.json({
      success: true,
      data: {
        allowed: result.allowed,
        reason: result.reason,
        auditData: {
          userId: result.auditData.userId,
          userRole: result.auditData.userRole,
          action: result.auditData.action,
          resource: result.auditData.resource,
          timestamp: result.auditData.timestamp
        }
      }
    });
  } catch (error) {
    console.error('Error testing authorization:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Testen der Autorisierung',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/rbac/test/permissions
 * @desc    Zeigt alle effektiven Permissions des aktuellen Benutzers
 * @access  Private
 */
router.get('/test/permissions', auth, async (req, res) => {
  try {
    const user = req.user;
    
    // Lade alle Permission-Quellen
    const { checkRolePermission, checkCustomPermissions, checkLegacyPermissions } = require('../utils/rbac');
    
    // Lade angepasste Rollen-Permissions
    let customRolePermissions = null;
    try {
      const rolePermission = await RolePermission.getRolePermissions(user.role);
      if (rolePermission && rolePermission.permissions) {
        customRolePermissions = rolePermission.permissions;
      }
    } catch (error) {
      // Ignoriere Fehler
    }

    // Teste Permissions für alle Resources und Actions
    const permissionMatrix = {};
    
    for (const resource of Object.values(RESOURCES)) {
      permissionMatrix[resource] = {};
      
      for (const action of Object.values(ACTIONS)) {
        const hasRolePerm = checkRolePermission(user.role, action, resource, customRolePermissions);
        const hasCustomPerm = checkCustomPermissions(user, action, resource, null, {});
        const hasLegacyPerm = checkLegacyPermissions(user, action, resource);
        
        permissionMatrix[resource][action] = {
          rolePermission: hasRolePerm,
          customPermission: hasCustomPerm,
          legacyPermission: hasLegacyPerm,
          effective: hasRolePerm || hasCustomPerm || hasLegacyPerm
        };
      }
    }

    res.json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        role: user.role,
        customRolePermissions,
        legacyPermissions: user.permissions || [],
        customPermissions: user.rbac?.customPermissions || [],
        permissionMatrix
      }
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Permissions',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/rbac/test/cache/clear
 * @desc    Löscht den Permission-Cache
 * @access  Private (Admin)
 */
router.post('/test/cache/clear', auth, rbacMiddleware.requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    
    clearPermissionCache(userId || null);

    res.json({
      success: true,
      message: userId ? `Cache für Benutzer ${userId} gelöscht` : 'Gesamter Cache gelöscht'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Caches',
      error: error.message
    });
  }
});

module.exports = router;
