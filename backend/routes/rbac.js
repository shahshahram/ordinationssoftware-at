const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { ROLES, ACTIONS, RESOURCES, authorize } = require('../utils/rbac');
const { rbacMiddleware } = require('../middleware/rbac');
const auth = require('../middleware/auth');

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
    const roles = Object.values(ROLES).map(role => ({
      value: role,
      label: getRoleLabel(role),
      description: getRoleDescription(role),
      level: getRoleLevel(role),
      permissions: getRolePermissions(role)
    }));

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
 * @desc    Permissions einer bestimmten Rolle abrufen
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

    const permissions = getRolePermissions(role);
    
    res.json({
      success: true,
      data: {
        role,
        permissions,
        inheritedPermissions: getInheritedPermissions(role)
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

    res.json({
      success: true,
      data: {
        primaryRole: user.role,
        resourceRoles: user.rbac?.resourceRoles || [],
        effectivePermissions: getEffectivePermissions(user)
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

    // Validiere Actions
    const validActions = actions.filter(action => Object.values(ACTIONS).includes(action));
    if (validActions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine gültigen Actions angegeben'
      });
    }

    // Füge Custom Permission hinzu
    user.rbac.customPermissions.push({
      resource,
      resourceId,
      actions: validActions,
      conditions: conditions || {},
      grantedBy: req.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null
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

function getRolePermissions(role) {
  const { ROLE_PERMISSIONS } = require('../utils/rbac');
  return ROLE_PERMISSIONS[role] || {};
}

function getInheritedPermissions(role) {
  const { ROLE_HIERARCHY } = require('../utils/rbac');
  return ROLE_HIERARCHY[role] || [];
}

function getEffectivePermissions(user) {
  // Kombiniere Rollen-Permissions mit Custom Permissions
  const rolePermissions = getRolePermissions(user.role);
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

module.exports = router;
