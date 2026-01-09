const { authorize, requirePermission, loadResource, ROLES, ACTIONS, RESOURCES } = require('../utils/rbac');

/**
 * RBAC Middleware für feingranulare Autorisierung
 */

/**
 * Middleware für Rollen-basierte Autorisierung
 * @param {string|Array} allowedRoles - Erlaubte Rollen
 * @param {boolean} requireAll - Alle Rollen müssen vorhanden sein (default: false)
 */
function requireRole(allowedRoles, requireAll = false) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    const userRole = req.user.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    const hasRole = requireAll 
      ? roles.every(role => userRole === role || isRoleHigher(userRole, role))
      : roles.some(role => userRole === role || isRoleHigher(userRole, role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Unzureichende Berechtigung',
        required: roles,
        current: userRole
      });
    }

    next();
  };
}

/**
 * Middleware für Permission-basierte Autorisierung
 * @param {string|Array} permissions - Erforderliche Permissions
 * @param {boolean} requireAll - Alle Permissions müssen vorhanden sein
 */
function requirePermissions(permissions, requireAll = false) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    const perms = Array.isArray(permissions) ? permissions : [permissions];
    const hasPermission = requireAll 
      ? req.user.hasAllPermissions(perms)
      : req.user.hasAnyPermission(perms);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Unzureichende Berechtigung',
        required: perms,
        current: req.user.permissions || []
      });
    }

    next();
  };
}

/**
 * Middleware für Policy-basierte Autorisierung mit Object-level ACLs
 * @param {string} action - Erforderliche Aktion
 * @param {string} resource - Resource-Typ
 * @param {Object} options - Zusätzliche Optionen
 */
function requirePolicy(action, resource, options = {}) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Nicht authentifiziert'
        });
      }

      const context = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        locationId: req.headers['x-location-id'],
        ...req.query,
        ...options.context
      };

      // Lade Resource-Objekt falls ID vorhanden
      let resourceObject = null;
      if (req.params.id && options.loadResource !== false) {
        try {
          const ResourceModel = getResourceModel(resource);
          if (ResourceModel) {
            resourceObject = await ResourceModel.findById(req.params.id);
            if (!resourceObject) {
              return res.status(404).json({
                success: false,
                message: 'Resource nicht gefunden'
              });
            }
          }
        } catch (error) {
          console.error('Error loading resource:', error);
          // Weiter ohne Resource-Objekt
        }
      }

      const result = await authorize(req.user, action, resource, resourceObject, context);
      
      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          message: 'Zugriff verweigert',
          reason: result.reason,
          requiredPermission: `${resource}:${action}`,
          auditId: result.auditData?.id
        });
      }

      // Füge Autorisierungsdaten zum Request hinzu
      req.authorization = result;
      req.resource = resourceObject;
      next();

    } catch (error) {
      console.error('Policy authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Autorisierungsfehler'
      });
    }
  };
}

/**
 * Middleware für sensible Daten (z.B. medizinische Daten)
 * @param {string} sensitivityLevel - Erforderliche Sensibilitätsstufe
 */
function requireSensitivityLevel(sensitivityLevel) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    // Super Admin und Admin haben immer Zugriff
    if (['super_admin', 'admin'].includes(req.user.role)) {
      return next();
    }

    // Ärzte haben Zugriff auf alle Stufen
    if (req.user.role === 'arzt') {
      return next();
    }

    // Andere Rollen haben nur Zugriff auf normale Daten
    if (sensitivityLevel !== 'normal' && !['arzt', 'admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Zugriff auf sensible Daten verweigert',
        requiredRole: 'arzt',
        currentRole: req.user.role
      });
    }

    next();
  };
}

/**
 * Middleware für Zeit-beschränkte Operationen
 * @param {Object} timeRestrictions - Zeitbeschränkungen
 */
function requireTimeRestrictions(timeRestrictions = {}) {
  return (req, res, next) => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sonntag, 1 = Montag, etc.

    // Geschäftszeiten prüfen
    if (timeRestrictions.businessHours) {
      const { start = 8, end = 18, days = [1, 2, 3, 4, 5] } = timeRestrictions.businessHours;
      
      if (!days.includes(day) || hour < start || hour >= end) {
        return res.status(403).json({
          success: false,
          message: 'Operation nur während der Geschäftszeiten erlaubt',
          allowedHours: `${start}:00 - ${end}:00`,
          allowedDays: days.map(d => ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][d])
        });
      }
    }

    // Wochentage prüfen
    if (timeRestrictions.allowedDays && !timeRestrictions.allowedDays.includes(day)) {
      return res.status(403).json({
        success: false,
        message: 'Operation an diesem Wochentag nicht erlaubt'
      });
    }

    next();
  };
}

/**
 * Middleware für IP-beschränkte Operationen
 * @param {Array} allowedIPs - Erlaubte IP-Adressen
 */
function requireIPRestrictions(allowedIPs = []) {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // Keine IP-Beschränkungen
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Zugriff von dieser IP-Adresse nicht erlaubt',
        clientIP,
        allowedIPs
      });
    }

    next();
  };
}

/**
 * Middleware für DSGVO-Compliance
 */
function requireGDPRConsent() {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    // Prüfe ob Benutzer DSGVO-Einverständnis gegeben hat
    if (!req.user.dataProtectionConsent) {
      return res.status(403).json({
        success: false,
        message: 'DSGVO-Einverständnis erforderlich',
        action: 'consent_required'
      });
    }

    next();
  };
}

/**
 * Kombinierte Middleware für häufige Anwendungsfälle
 */
const rbacMiddleware = {
  // Patienten-Management
  canViewPatients: requirePolicy(ACTIONS.READ, RESOURCES.PATIENT),
  canCreatePatients: requirePolicy(ACTIONS.CREATE, RESOURCES.PATIENT),
  canUpdatePatients: requirePolicy(ACTIONS.UPDATE, RESOURCES.PATIENT),
  canDeletePatients: requirePolicy(ACTIONS.DELETE, RESOURCES.PATIENT),
  
  // Termin-Management
  canViewAppointments: requirePolicy(ACTIONS.READ, RESOURCES.APPOINTMENT),
  canCreateAppointments: requirePolicy(ACTIONS.CREATE, RESOURCES.APPOINTMENT),
  canBookAppointments: requirePolicy(ACTIONS.BOOK, RESOURCES.APPOINTMENT),
  canCancelAppointments: requirePolicy(ACTIONS.CANCEL, RESOURCES.APPOINTMENT),
  
  // Dokument-Management
  canViewDocuments: requirePolicy(ACTIONS.READ, RESOURCES.DOCUMENT),
  canCreateDocuments: requirePolicy(ACTIONS.CREATE, RESOURCES.DOCUMENT),
  canGenerateDocuments: requirePolicy(ACTIONS.GENERATE, RESOURCES.DOCUMENT),
  canPrintDocuments: requirePolicy(ACTIONS.PRINT, RESOURCES.DOCUMENT),
  
  // Billing-Management
  canViewBilling: requirePolicy(ACTIONS.READ, RESOURCES.BILLING),
  canCreateBilling: requirePolicy(ACTIONS.CREATE, RESOURCES.BILLING),
  canGenerateBilling: requirePolicy(ACTIONS.GENERATE, RESOURCES.BILLING),
  
  // Admin-Funktionen
  requireAdmin: requireRole(['admin', 'super_admin']),
  requireSuperAdmin: requireRole('super_admin'),
  requireDoctor: requireRole(['arzt', 'admin', 'super_admin']),
  requireStaff: requireRole(['assistent', 'rezeption', 'arzt', 'admin', 'super_admin']),
  
  // Sensible Daten
  requireNormalData: requireSensitivityLevel('normal'),
  requireSensitiveData: requireSensitivityLevel('sensitive'),
  requireHighlySensitiveData: requireSensitivityLevel('highly_sensitive'),
  
  // Compliance
  requireGDPR: requireGDPRConsent(),
  
  // Zeit-Beschränkungen
  businessHoursOnly: requireTimeRestrictions({ 
    businessHours: { start: 8, end: 18, days: [1, 2, 3, 4, 5] } 
  }),
  weekdaysOnly: requireTimeRestrictions({ 
    allowedDays: [1, 2, 3, 4, 5] 
  })
};

/**
 * Hilfsfunktionen
 */
function isRoleHigher(userRole, requiredRole) {
  const hierarchy = {
    'super_admin': 6,
    'admin': 5,
    'arzt': 4,
    'assistent': 3,
    'rezeption': 2,
    'billing': 2,
    'patient': 1
  };
  
  return (hierarchy[userRole] || 0) > (hierarchy[requiredRole] || 0);
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

module.exports = {
  requireRole,
  requirePermissions,
  requirePolicy,
  requireSensitivityLevel,
  requireTimeRestrictions,
  requireIPRestrictions,
  requireGDPRConsent,
  rbacMiddleware,
  isRoleHigher,
  getResourceModel
};
