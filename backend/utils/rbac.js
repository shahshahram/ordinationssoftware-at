const mongoose = require('mongoose');

/**
 * Feingranulares RBAC (Role-Based Access Control) System
 * mit Object-level ACLs für österreichische Ordinationssoftware
 */

// Permission-Cache für bessere Performance
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 Minuten

/**
 * Cache-Management für Permissions
 */
function getCachedPermissions(cacheKey) {
  const cached = permissionCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  permissionCache.delete(cacheKey);
  return null;
}

function setCachedPermissions(cacheKey, data) {
  permissionCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
}

function clearPermissionCache(userId = null) {
  if (userId) {
    // Lösche nur Cache-Einträge für diesen Benutzer
    for (const [key] of permissionCache) {
      if (key.includes(userId)) {
        permissionCache.delete(key);
      }
    }
  } else {
    // Lösche gesamten Cache
    permissionCache.clear();
  }
}

// Rollen-Definitionen mit Hierarchie
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  ARZT: 'arzt',
  ASSISTENT: 'assistent',
  REZEPTION: 'rezeption',
  BILLING: 'billing',
  PATIENT: 'patient'
};

// Rollen-Hierarchie (höhere Rollen erben alle Permissions der niedrigeren)
const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: [ROLES.ADMIN, ROLES.ARZT, ROLES.ASSISTENT, ROLES.REZEPTION, ROLES.BILLING, ROLES.PATIENT],
  [ROLES.ADMIN]: [ROLES.ARZT, ROLES.ASSISTENT, ROLES.REZEPTION, ROLES.BILLING, ROLES.PATIENT],
  [ROLES.ARZT]: [ROLES.ASSISTENT, ROLES.PATIENT],
  [ROLES.ASSISTENT]: [ROLES.PATIENT],
  [ROLES.REZEPTION]: [ROLES.PATIENT],
  [ROLES.BILLING]: [ROLES.PATIENT],
  [ROLES.PATIENT]: []
};

// Actions (Operationen) die auf Ressourcen ausgeführt werden können
const ACTIONS = {
  // CRUD Operations
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  WRITE: 'write', // Alias für CREATE + UPDATE
  
  // Spezifische Actions
  BOOK: 'book',
  CANCEL: 'cancel',
  RESCHEDULE: 'reschedule',
  GENERATE: 'generate',
  PRINT: 'print',
  SHARE: 'share',
  EXPORT: 'export',
  IMPORT: 'import',
  APPROVE: 'approve',
  REJECT: 'reject',
  ASSIGN: 'assign',
  UNASSIGN: 'unassign',
  
  // Administrative Actions
  AUDIT: 'audit',
  CONFIGURE: 'configure',
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_PERMISSIONS: 'manage_permissions',
  
  // Medizinische Actions
  DIAGNOSE: 'diagnose',
  PRESCRIBE: 'prescribe',
  TREAT: 'treat',
  REFER: 'refer',
  DISCHARGE: 'discharge',
  
  // XDS/IHE Actions
  QUERY: 'query',
  RETRIEVE: 'retrieve',
  DEPRECATE: 'deprecate',
  SUBMIT: 'submit'
};

// Ressourcen-Typen
const RESOURCES = {
  PATIENT: 'patient',
  APPOINTMENT: 'appointment',
  DOCUMENT: 'document',
  DIAGNOSIS: 'diagnosis',
  PRESCRIPTION: 'prescription',
  BILLING: 'billing',
  USER: 'user',
  ROLE: 'role',
  LOCATION: 'location',
  SERVICE: 'service',
  TEMPLATE: 'template',
  STAFF: 'staff',
  AUDIT_LOG: 'audit_log',
  SYSTEM: 'system',
  INVENTORY: 'inventory',
  SETTINGS: 'settings',
  SECURITY: 'security',
  REPORTS: 'reports',
  AUDIT: 'audit',
  
  // XDS/IHE Resources
  XDS_DOCUMENT: 'xds_document',
  XDS_SUBMISSION_SET: 'xds_submission_set',
  XDS_FOLDER: 'xds_folder',
  XDS_ASSOCIATION: 'xds_association'
};

// Standard-Permissions für jede Rolle
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    // Alle Permissions
    '*': ['*']
  },
  
  [ROLES.ADMIN]: {
    [RESOURCES.PATIENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.APPOINTMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.BOOK, ACTIONS.CANCEL, ACTIONS.RESCHEDULE],
    [RESOURCES.DOCUMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.GENERATE, ACTIONS.PRINT, ACTIONS.SHARE, ACTIONS.EXPORT],
    [RESOURCES.DIAGNOSIS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.DIAGNOSE],
    [RESOURCES.PRESCRIPTION]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.PRESCRIBE],
    [RESOURCES.BILLING]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.GENERATE, ACTIONS.PRINT],
    [RESOURCES.USER]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE_USERS],
    [RESOURCES.ROLE]: [ACTIONS.READ, ACTIONS.MANAGE_ROLES],
    [RESOURCES.LOCATION]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.SERVICE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.TEMPLATE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.STAFF]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE_STAFF],
    [RESOURCES.AUDIT_LOG]: [ACTIONS.READ, ACTIONS.AUDIT],
    [RESOURCES.SYSTEM]: [ACTIONS.CONFIGURE],
    [RESOURCES.SETTINGS]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.CONFIGURE],
    [RESOURCES.SECURITY]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.CONFIGURE],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.GENERATE, ACTIONS.EXPORT],
    [RESOURCES.AUDIT]: [ACTIONS.READ, ACTIONS.AUDIT],
    [RESOURCES.XDS_DOCUMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.QUERY, ACTIONS.RETRIEVE, ACTIONS.DEPRECATE, ACTIONS.SUBMIT],
    [RESOURCES.XDS_SUBMISSION_SET]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.XDS_FOLDER]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
    [RESOURCES.XDS_ASSOCIATION]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE]
  },
  
  [ROLES.ARZT]: {
    [RESOURCES.PATIENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.APPOINTMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.BOOK, ACTIONS.CANCEL, ACTIONS.RESCHEDULE],
    [RESOURCES.DOCUMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.GENERATE, ACTIONS.PRINT, ACTIONS.SHARE],
    [RESOURCES.DIAGNOSIS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.DIAGNOSE],
    [RESOURCES.PRESCRIPTION]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.PRESCRIBE],
    [RESOURCES.BILLING]: [ACTIONS.READ, ACTIONS.GENERATE],
    [RESOURCES.LOCATION]: [ACTIONS.READ],
    [RESOURCES.SERVICE]: [ACTIONS.READ],
    [RESOURCES.STAFF]: [ACTIONS.READ],
    [RESOURCES.TEMPLATE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.XDS_DOCUMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.QUERY, ACTIONS.RETRIEVE, ACTIONS.DEPRECATE],
    [RESOURCES.XDS_SUBMISSION_SET]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.XDS_FOLDER]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE]
  },
  
  [ROLES.ASSISTENT]: {
    [RESOURCES.PATIENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.APPOINTMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.BOOK, ACTIONS.CANCEL, ACTIONS.RESCHEDULE],
    [RESOURCES.DOCUMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.GENERATE, ACTIONS.PRINT],
    [RESOURCES.DIAGNOSIS]: [ACTIONS.READ],
    [RESOURCES.PRESCRIPTION]: [ACTIONS.READ],
    [RESOURCES.BILLING]: [ACTIONS.READ],
    [RESOURCES.LOCATION]: [ACTIONS.READ],
    [RESOURCES.SERVICE]: [ACTIONS.READ],
    [RESOURCES.STAFF]: [ACTIONS.READ],
    [RESOURCES.TEMPLATE]: [ACTIONS.READ],
    [RESOURCES.XDS_DOCUMENT]: [ACTIONS.READ, ACTIONS.QUERY, ACTIONS.RETRIEVE],
    [RESOURCES.XDS_SUBMISSION_SET]: [ACTIONS.READ],
    [RESOURCES.XDS_FOLDER]: [ACTIONS.READ]
  },
  
  [ROLES.REZEPTION]: {
    [RESOURCES.PATIENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.APPOINTMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.BOOK, ACTIONS.CANCEL, ACTIONS.RESCHEDULE],
    [RESOURCES.DOCUMENT]: [ACTIONS.READ, ACTIONS.PRINT],
    [RESOURCES.BILLING]: [ACTIONS.READ, ACTIONS.GENERATE, ACTIONS.PRINT],
    [RESOURCES.LOCATION]: [ACTIONS.READ],
    [RESOURCES.SERVICE]: [ACTIONS.READ]
  },
  
  [ROLES.BILLING]: {
    [RESOURCES.PATIENT]: [ACTIONS.READ],
    [RESOURCES.APPOINTMENT]: [ACTIONS.READ],
    [RESOURCES.DOCUMENT]: [ACTIONS.READ, ACTIONS.PRINT],
    [RESOURCES.BILLING]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.GENERATE, ACTIONS.PRINT, ACTIONS.EXPORT],
    [RESOURCES.LOCATION]: [ACTIONS.READ],
    [RESOURCES.SERVICE]: [ACTIONS.READ]
  },
  
  [ROLES.PATIENT]: {
    [RESOURCES.PATIENT]: [ACTIONS.READ], // Nur eigene Daten
    [RESOURCES.APPOINTMENT]: [ACTIONS.READ, ACTIONS.BOOK, ACTIONS.CANCEL], // Nur eigene Termine
    [RESOURCES.DOCUMENT]: [ACTIONS.READ], // Nur eigene Dokumente
    [RESOURCES.BILLING]: [ACTIONS.READ] // Nur eigene Rechnungen
  }
};

// Object-level ACL Struktur
const ACL_SCHEMA = {
  allowedRoles: [String], // Rollen die Zugriff haben
  allowedUsers: [mongoose.Schema.Types.ObjectId], // Spezifische Benutzer
  deniedRoles: [String], // Explizit verweigerte Rollen
  deniedUsers: [mongoose.Schema.Types.ObjectId], // Explizit verweigerte Benutzer
  conditions: {
    timeRestricted: Boolean,
    timeStart: Date,
    timeEnd: Date,
    locationRestricted: Boolean,
    allowedLocations: [mongoose.Schema.Types.ObjectId],
    ipRestricted: Boolean,
    allowedIPs: [String]
  },
  metadata: {
    createdBy: mongoose.Schema.Types.ObjectId,
    createdAt: { type: Date, default: Date.now },
    lastModified: Date,
    reason: String // Grund für spezielle ACL-Regeln
  }
};

/**
 * Zentrale Autorisierungsfunktion
 * @param {Object} user - Benutzer-Objekt mit Rolle und Permissions
 * @param {string} action - Aktion die ausgeführt werden soll
 * @param {string} resource - Ressource auf die zugegriffen wird
 * @param {Object} resourceObject - Optional: Das spezifische Objekt für Object-level ACLs
 * @param {Object} context - Zusätzlicher Kontext (IP, Location, etc.)
 * @returns {Object} { allowed: boolean, reason: string, auditData: Object }
 */
async function authorize(user, action, resource, resourceObject = null, context = {}) {
  const auditData = {
    userId: user._id || user.id,
    userRole: user.role,
    action,
    resource,
    resourceId: resourceObject?._id || resourceObject?.id,
    timestamp: new Date(),
    context
  };

  try {
    // 1. Super Admin hat immer Zugriff
    if (user.role === ROLES.SUPER_ADMIN) {
      await logAuthorization(auditData, true, 'Super Admin access');
      return { allowed: true, reason: 'Super Admin access', auditData };
    }

    // Prüfe ob Delegationen übersprungen werden sollen (verhindert Endlosschleifen)
    const skipDelegations = context.skipDelegations === true;

    // 2. Lade angepasste System-Rollen-Permissions (mit Cache)
    let customRolePermissions = null;
    const roleCacheKey = `role_permissions_${user.role}`;
    customRolePermissions = getCachedPermissions(roleCacheKey);
    
    if (customRolePermissions === null) {
      try {
        const RolePermission = require('../models/RolePermission');
        const rolePermission = await RolePermission.getRolePermissions(user.role);
        if (rolePermission && rolePermission.permissions) {
          customRolePermissions = rolePermission.permissions;
          setCachedPermissions(roleCacheKey, customRolePermissions);
        } else {
          setCachedPermissions(roleCacheKey, {}); // Cache auch leere Ergebnisse
        }
      } catch (error) {
        // Ignoriere Fehler beim Laden (Rolle hat keine angepassten Permissions)
        console.debug(`No custom role permissions for ${user.role}`);
        setCachedPermissions(roleCacheKey, {}); // Cache leeres Ergebnis
      }
    }

    // 3. Prüfe Rollen-basierte Permissions (inkl. angepasste) ODER Custom Permissions ODER altes Permission-System
    const hasRolePermission = checkRolePermission(user.role, action, resource, customRolePermissions);
    const hasCustomPermission = checkCustomPermissions(user, action, resource, resourceObject, context);
    const hasLegacyPermission = checkLegacyPermissions(user, action, resource);
    
    // Prüfe Delegationen nur wenn nicht übersprungen
    let hasDelegatedPermission = false;
    if (!skipDelegations) {
      hasDelegatedPermission = await checkDelegations(user, action, resource, resourceObject, context);
    }
    
    if (!hasRolePermission && !hasCustomPermission && !hasLegacyPermission && !hasDelegatedPermission) {
      await logAuthorization(auditData, false, `Role ${user.role} lacks permission for ${action} on ${resource}`);
      return { allowed: false, reason: `Insufficient role permissions`, auditData };
    }

    // 3. Prüfe Object-level ACLs falls vorhanden
    if (resourceObject && resourceObject.acl) {
      const aclResult = checkObjectACL(user, resourceObject.acl, context);
      if (!aclResult.allowed) {
        await logAuthorization(auditData, false, aclResult.reason);
        return { allowed: false, reason: aclResult.reason, auditData };
      }
    }

    // 4. Prüfe spezielle Geschäftsregeln
    const businessRuleResult = await checkBusinessRules(user, action, resource, resourceObject, context);
    if (!businessRuleResult.allowed) {
      await logAuthorization(auditData, false, businessRuleResult.reason);
      return { allowed: false, reason: businessRuleResult.reason, auditData };
    }

    // 5. Prüfe Zeit- und Ortsbeschränkungen
    const timeLocationResult = checkTimeLocationRestrictions(user, action, resource, context);
    if (!timeLocationResult.allowed) {
      await logAuthorization(auditData, false, timeLocationResult.reason);
      return { allowed: false, reason: timeLocationResult.reason, auditData };
    }

    await logAuthorization(auditData, true, 'Access granted');
    return { allowed: true, reason: 'Access granted', auditData };

  } catch (error) {
    console.error('Authorization error:', error);
    await logAuthorization(auditData, false, `Authorization error: ${error.message}`);
    return { allowed: false, reason: 'Authorization error', auditData };
  }
}

/**
 * Prüft Rollen-basierte Permissions (inkl. angepasste System-Rollen-Permissions)
 * @param {string} userRole - Rolle des Benutzers
 * @param {string} action - Aktion
 * @param {string} resource - Ressource
 * @param {Object} customRolePermissions - Optional: Angepasste Permissions für diese Rolle
 * @returns {boolean} true wenn Permission vorhanden
 */
function checkRolePermission(userRole, action, resource, customRolePermissions = null) {
  // Lade angepasste Permissions falls nicht übergeben
  let rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) return false;

  // Merge angepasste Permissions mit Standard-Permissions
  if (customRolePermissions && typeof customRolePermissions === 'object') {
    rolePermissions = { ...rolePermissions, ...customRolePermissions };
  }

  // Wildcard für alle Permissions
  if (rolePermissions['*'] && rolePermissions['*'].includes('*')) {
    return true;
  }

  // Prüfe spezifische Resource-Permissions
  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;

  // Wildcard für alle Actions auf dieser Resource
  if (resourcePermissions.includes('*')) {
    return true;
  }

  // Prüfe spezifische Action
  if (resourcePermissions.includes(action)) {
    return true;
  }

  // Spezielle Behandlung für 'write' - Alias für 'create' und 'update'
  if (action === 'write') {
    return resourcePermissions.includes('create') || resourcePermissions.includes('update');
  }

  return false;
}

/**
 * Prüft Custom Permissions eines Benutzers
 * @param {Object} user - Benutzer-Objekt
 * @param {string} action - Aktion die ausgeführt werden soll
 * @param {string} resource - Ressource auf die zugegriffen wird
 * @param {Object} resourceObject - Optional: Das spezifische Objekt
 * @param {Object} context - Zusätzlicher Kontext (IP, Location, etc.)
 * @returns {boolean} true wenn Custom Permission vorhanden und gültig
 */
function checkCustomPermissions(user, action, resource, resourceObject = null, context = {}) {
  // Prüfe ob Custom Permissions existieren
  if (!user.rbac || !user.rbac.customPermissions || !Array.isArray(user.rbac.customPermissions)) {
    return false;
  }

  const now = new Date();
  const resourceId = resourceObject?._id || resourceObject?.id;

  // Durchsuche alle Custom Permissions
  for (const cp of user.rbac.customPermissions) {
    // Prüfe Resource-Match
    if (cp.resource !== resource) {
      continue;
    }

    // Prüfe ResourceId-Match (falls vorhanden)
    if (cp.resourceId) {
      const cpResourceId = cp.resourceId.toString ? cp.resourceId.toString() : cp.resourceId;
      const reqResourceId = resourceId ? (resourceId.toString ? resourceId.toString() : resourceId) : null;
      
      if (reqResourceId && cpResourceId !== reqResourceId) {
        continue; // ResourceId stimmt nicht überein
      }
    }

    // Prüfe Action-Match
    if (!cp.actions || !Array.isArray(cp.actions) || !cp.actions.includes(action)) {
      continue;
    }

    // Prüfe Expiry
    if (cp.expiresAt) {
      const expiresAt = cp.expiresAt instanceof Date ? cp.expiresAt : new Date(cp.expiresAt);
      if (now > expiresAt) {
        continue; // Permission ist abgelaufen
      }
    }

    // Prüfe Conditions
    if (cp.conditions) {
      // Zeitbeschränkungen
      if (cp.conditions.timeRestricted) {
        if (cp.conditions.timeStart) {
          const timeStart = cp.conditions.timeStart instanceof Date ? cp.conditions.timeStart : new Date(cp.conditions.timeStart);
          if (now < timeStart) {
            continue; // Zugriff noch nicht erlaubt
          }
        }
        if (cp.conditions.timeEnd) {
          const timeEnd = cp.conditions.timeEnd instanceof Date ? cp.conditions.timeEnd : new Date(cp.conditions.timeEnd);
          if (now > timeEnd) {
            continue; // Zugriff abgelaufen
          }
        }
      }

      // Ortsbeschränkungen
      if (cp.conditions.locationRestricted && cp.conditions.allowedLocations) {
        if (!context.locationId || !cp.conditions.allowedLocations.includes(context.locationId)) {
          continue; // Standort nicht erlaubt
        }
      }

      // IP-Beschränkungen
      if (cp.conditions.ipRestricted && cp.conditions.allowedIPs) {
        if (!context.ip || !cp.conditions.allowedIPs.includes(context.ip)) {
          continue; // IP nicht erlaubt
        }
      }
    }

    // Alle Prüfungen bestanden - Custom Permission ist gültig
    return true;
  }

  return false;
}

/**
 * Prüft altes Permission-System (user.permissions) als Fallback
 * @param {Object} user - Benutzer-Objekt
 * @param {string} action - Aktion
 * @param {string} resource - Ressource
 * @returns {boolean} true wenn Permission vorhanden
 */
function checkLegacyPermissions(user, action, resource) {
  if (!user.permissions || !Array.isArray(user.permissions)) {
    return false;
  }

  // Prüfe verschiedene Permission-Formate
  const permissionFormats = [
    `${resource}.${action}`,           // patient.read
    `${resource}s.${action}`,          // patients.read (plural)
    action,                             // read (einfach)
    `${resource}.*`,                    // patient.*
    `*.${action}`                       // *.read
  ];

  return user.permissions.some(perm => permissionFormats.includes(perm));
}

/**
 * Prüft Delegationen (Benutzer hat Permissions von anderen Benutzern delegiert bekommen)
 * @param {Object} user - Benutzer-Objekt
 * @param {string} action - Aktion
 * @param {string} resource - Ressource
 * @param {Object} resourceObject - Optional: Resource-Objekt
 * @param {Object} context - Kontext
 * @returns {Promise<boolean>} true wenn delegierte Permission vorhanden
 */
async function checkDelegations(user, action, resource, resourceObject = null, context = {}) {
  if (!user.rbac || !user.rbac.delegations || !Array.isArray(user.rbac.delegations)) {
    return false;
  }

  const now = new Date();
  const resourceId = resourceObject?._id || resourceObject?.id;

  for (const delegation of user.rbac.delegations) {
    // Prüfe Expiry
    if (delegation.expiresAt) {
      const expiresAt = delegation.expiresAt instanceof Date ? delegation.expiresAt : new Date(delegation.expiresAt);
      if (now > expiresAt) {
        continue; // Delegation abgelaufen
      }
    }

    // Prüfe Resources (falls spezifiziert)
    if (delegation.resources && delegation.resources.length > 0) {
      if (!delegation.resources.includes(resource)) {
        continue; // Resource nicht in Delegation
      }
    }

    // Prüfe Permissions
    if (delegation.permissions && Array.isArray(delegation.permissions)) {
      // Prüfe verschiedene Permission-Formate
      const permissionFormats = [
        `${resource}.${action}`,
        `${resource}s.${action}`,
        action,
        `${resource}.*`,
        `*.${action}`
      ];

      const hasDelegatedPermission = delegation.permissions.some(perm => 
        permissionFormats.includes(perm)
      );

      if (hasDelegatedPermission) {
        // Prüfe ob delegierender Benutzer die Permission hat (ohne rekursive Delegationen)
        try {
          const User = require('../models/User');
          const delegator = await User.findById(delegation.delegateTo).select('role rbac permissions');
          if (delegator) {
            // Lade angepasste Rollen-Permissions
            let customRolePermissions = null;
            try {
              const RolePermission = require('../models/RolePermission');
              const rolePermission = await RolePermission.getRolePermissions(delegator.role);
              if (rolePermission && rolePermission.permissions) {
                customRolePermissions = rolePermission.permissions;
              }
            } catch (error) {
              // Ignoriere Fehler
            }
            
            // Prüfe Rollen-Permission
            const hasRolePerm = checkRolePermission(delegator.role, action, resource, customRolePermissions);
            // Prüfe Custom Permissions
            const hasCustomPerm = checkCustomPermissions(delegator, action, resource, resourceObject, context);
            // Prüfe Legacy Permissions
            const hasLegacyPerm = checkLegacyPermissions(delegator, action, resource);
            
            if (hasRolePerm || hasCustomPerm || hasLegacyPerm) {
              return true;
            }
          }
        } catch (error) {
          console.error('Error checking delegator permissions:', error);
          // Bei Fehler: Delegation nicht gültig
        }
      }
    }
  }

  return false;
}

/**
 * Prüft Object-level ACLs
 */
function checkObjectACL(user, acl, context) {
  // Prüfe explizit verweigerte Rollen/Benutzer
  if (acl.deniedRoles && acl.deniedRoles.includes(user.role)) {
    return { allowed: false, reason: 'Role explicitly denied' };
  }

  if (acl.deniedUsers && acl.deniedUsers.includes(user._id || user.id)) {
    return { allowed: false, reason: 'User explicitly denied' };
  }

  // Prüfe erlaubte Rollen
  if (acl.allowedRoles && acl.allowedRoles.length > 0) {
    if (!acl.allowedRoles.includes(user.role)) {
      return { allowed: false, reason: 'Role not in allowed roles' };
    }
  }

  // Prüfe erlaubte Benutzer
  if (acl.allowedUsers && acl.allowedUsers.length > 0) {
    if (!acl.allowedUsers.includes(user._id || user.id)) {
      return { allowed: false, reason: 'User not in allowed users' };
    }
  }

  // Prüfe Zeitbeschränkungen
  if (acl.conditions && acl.conditions.timeRestricted) {
    const now = new Date();
    if (acl.conditions.timeStart && now < acl.conditions.timeStart) {
      return { allowed: false, reason: 'Access not yet allowed' };
    }
    if (acl.conditions.timeEnd && now > acl.conditions.timeEnd) {
      return { allowed: false, reason: 'Access expired' };
    }
  }

  // Prüfe Ortsbeschränkungen
  if (acl.conditions && acl.conditions.locationRestricted) {
    if (!context.locationId || !acl.conditions.allowedLocations.includes(context.locationId)) {
      return { allowed: false, reason: 'Access not allowed from this location' };
    }
  }

  // Prüfe IP-Beschränkungen
  if (acl.conditions && acl.conditions.ipRestricted) {
    if (!context.ip || !acl.conditions.allowedIPs.includes(context.ip)) {
      return { allowed: false, reason: 'Access not allowed from this IP' };
    }
  }

  return { allowed: true, reason: 'ACL check passed' };
}

/**
 * Prüft spezielle Geschäftsregeln
 */
async function checkBusinessRules(user, action, resource, resourceObject, context) {
  // Beispiel: Patienten können nur ihre eigenen Daten lesen
  if (user.role === ROLES.PATIENT && resource === RESOURCES.PATIENT) {
    if (resourceObject && resourceObject._id && resourceObject._id.toString() !== (user._id || user.id).toString()) {
      return { allowed: false, reason: 'Patients can only access their own data' };
    }
  }

  // Beispiel: Termine können nur von zugewiesenen Ärzten bearbeitet werden
  if (resource === RESOURCES.APPOINTMENT && (action === ACTIONS.UPDATE || action === ACTIONS.DELETE)) {
    if (resourceObject && resourceObject.assignedDoctor && resourceObject.assignedDoctor.toString() !== (user._id || user.id).toString()) {
      return { allowed: false, reason: 'Only assigned doctor can modify appointment' };
    }
  }

  // Beispiel: Sensible Dokumente nur für Ärzte
  if (resource === RESOURCES.DOCUMENT && resourceObject && resourceObject.sensitive) {
    if (!['arzt', 'admin', 'super_admin'].includes(user.role)) {
      return { allowed: false, reason: 'Sensitive documents require doctor role' };
    }
  }

  return { allowed: true, reason: 'Business rules check passed' };
}

/**
 * Prüft Zeit- und Ortsbeschränkungen
 */
function checkTimeLocationRestrictions(user, action, resource, context) {
  // Beispiel: Billing nur während Geschäftszeiten
  if (resource === RESOURCES.BILLING && action === ACTIONS.CREATE) {
    const hour = new Date().getHours();
    if (hour < 8 || hour > 18) {
      return { allowed: false, reason: 'Billing operations only allowed during business hours' };
    }
  }

  // Beispiel: Terminbuchung nur für registrierte Benutzer
  if (resource === RESOURCES.APPOINTMENT && action === ACTIONS.BOOK) {
    if (!user.email || !user.phone) {
      return { allowed: false, reason: 'Complete profile required for booking appointments' };
    }
  }

  return { allowed: true, reason: 'Time/location restrictions check passed' };
}

/**
 * Loggt Autorisierungsentscheidungen für Audit
 */
async function logAuthorization(auditData, allowed, reason) {
  try {
    const AuditLog = require('../models/AuditLog');
    const mongoose = require('mongoose');
    
    // Validiere und konvertiere userId zu ObjectId
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(auditData.userId);
    } catch (error) {
      // Falls userId nicht gültig ist, verwende einen Dummy-ObjectId
      userId = new mongoose.Types.ObjectId();
    }
    
    await AuditLog.create({
      userId: userId,
      userEmail: auditData.userEmail || 'system@example.com',
      userRole: auditData.userRole || 'unknown',
      action: 'authorization',
      resource: auditData.resource,
      resourceId: auditData.resourceId,
      description: `Authorization check: ${auditData.action} on ${auditData.resource} - ${allowed ? 'ALLOWED' : 'DENIED'}`,
      details: {
        userRole: auditData.userRole,
        requestedAction: auditData.action,
        allowed,
        reason,
        context: auditData.context
      },
      ipAddress: auditData.context.ip,
      userAgent: auditData.context.userAgent,
      success: allowed,
      timestamp: auditData.timestamp
    });
  } catch (error) {
    console.error('Failed to log authorization:', error);
  }
}

/**
 * Middleware für automatische Autorisierung
 */
function requirePermission(action, resource) {
  return async (req, res, next) => {
    try {
      const context = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        locationId: req.headers['x-location-id'],
        ...req.query
      };

      const result = await authorize(req.user, action, resource, req.resource, context);
      
      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          message: 'Zugriff verweigert',
          reason: result.reason,
          requiredPermission: `${resource}:${action}`
        });
      }

      // Füge Autorisierungsdaten zum Request hinzu
      req.authorization = result;
      next();
    } catch (error) {
      console.error('Authorization middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Autorisierungsfehler'
      });
    }
  };
}

/**
 * Hilfsfunktion um Resource-Objekt zu laden und zu prüfen
 */
function loadResource(resourceType, resourceId) {
  return async (req, res, next) => {
    try {
      let ResourceModel;
      switch (resourceType) {
        case RESOURCES.PATIENT:
          ResourceModel = require('../models/Patient');
          break;
        case RESOURCES.APPOINTMENT:
          ResourceModel = require('../models/Appointment');
          break;
        case RESOURCES.DOCUMENT:
          ResourceModel = require('../models/Document');
          break;
        default:
          return res.status(400).json({ success: false, message: 'Unbekannte Resource' });
      }

      const resource = await ResourceModel.findById(resourceId);
      if (!resource) {
        return res.status(404).json({ success: false, message: 'Resource nicht gefunden' });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Load resource error:', error);
      res.status(500).json({ success: false, message: 'Fehler beim Laden der Resource' });
    }
  };
}

module.exports = {
  ROLES,
  ACTIONS,
  RESOURCES,
  ROLE_PERMISSIONS,
  ACL_SCHEMA,
  authorize,
  requirePermission,
  loadResource,
  checkRolePermission,
  checkCustomPermissions,
  checkLegacyPermissions,
  checkDelegations,
  checkObjectACL,
  checkBusinessRules,
  checkTimeLocationRestrictions,
  clearPermissionCache
};
