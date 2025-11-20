import React from 'react';

/**
 * Frontend RBAC (Role-Based Access Control) Utilities
 * Feingranulare Berechtigungsprüfung für österreichische Ordinationssoftware
 */

// Rollen-Definitionen
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  ARZT: 'arzt',
  ASSISTENT: 'assistent',
  REZEPTION: 'rezeption',
  BILLING: 'billing',
  PATIENT: 'patient'
} as const;

// Actions (Operationen)
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
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
  AUDIT: 'audit',
  CONFIGURE: 'configure',
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_PERMISSIONS: 'manage_permissions',
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
} as const;

// Ressourcen-Typen
export const RESOURCES = {
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
  AUDIT_LOG: 'audit_log',
  AUDIT: 'audit',
  REPORTS: 'reports',
  STAFF: 'staff',
  SYSTEM: 'system',
  INVENTORY: 'inventory',
  SETTINGS: 'settings',
  SECURITY: 'security',
  
  // XDS/IHE Resources
  XDS_DOCUMENT: 'xds_document',
  XDS_SUBMISSION_SET: 'xds_submission_set',
  XDS_FOLDER: 'xds_folder',
  XDS_ASSOCIATION: 'xds_association'
} as const;

// Rollen-Hierarchie
const ROLE_HIERARCHY: Record<string, string[]> = {
  [ROLES.SUPER_ADMIN]: [ROLES.ADMIN, ROLES.ARZT, ROLES.ASSISTENT, ROLES.REZEPTION, ROLES.BILLING, ROLES.PATIENT],
  [ROLES.ADMIN]: [ROLES.ARZT, ROLES.ASSISTENT, ROLES.REZEPTION, ROLES.BILLING, ROLES.PATIENT],
  [ROLES.ARZT]: [ROLES.ASSISTENT, ROLES.PATIENT],
  [ROLES.ASSISTENT]: [ROLES.PATIENT],
  [ROLES.REZEPTION]: [ROLES.PATIENT],
  [ROLES.BILLING]: [ROLES.PATIENT],
  [ROLES.PATIENT]: []
};

// Standard-Permissions für jede Rolle
const ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  [ROLES.SUPER_ADMIN]: {
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
    [RESOURCES.AUDIT_LOG]: [ACTIONS.READ, ACTIONS.AUDIT],
    [RESOURCES.SYSTEM]: [ACTIONS.CONFIGURE],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.GENERATE, ACTIONS.EXPORT],
    [RESOURCES.SETTINGS]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.CONFIGURE],
    [RESOURCES.SECURITY]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.CONFIGURE],
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
    [RESOURCES.TEMPLATE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.GENERATE],
    [RESOURCES.SETTINGS]: [ACTIONS.READ],
    [RESOURCES.SECURITY]: [ACTIONS.READ],
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
    [RESOURCES.TEMPLATE]: [ACTIONS.READ],
    [RESOURCES.REPORTS]: [ACTIONS.READ],
    [RESOURCES.SETTINGS]: [ACTIONS.READ],
    [RESOURCES.SECURITY]: [ACTIONS.READ],
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
    [RESOURCES.SERVICE]: [ACTIONS.READ],
    [RESOURCES.REPORTS]: [ACTIONS.READ],
    [RESOURCES.SETTINGS]: [ACTIONS.READ],
    [RESOURCES.SECURITY]: [ACTIONS.READ]
  },
  [ROLES.BILLING]: {
    [RESOURCES.PATIENT]: [ACTIONS.READ],
    [RESOURCES.APPOINTMENT]: [ACTIONS.READ],
    [RESOURCES.DOCUMENT]: [ACTIONS.READ, ACTIONS.PRINT],
    [RESOURCES.BILLING]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.GENERATE, ACTIONS.PRINT, ACTIONS.EXPORT],
    [RESOURCES.LOCATION]: [ACTIONS.READ],
    [RESOURCES.SERVICE]: [ACTIONS.READ],
    [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.GENERATE, ACTIONS.EXPORT],
    [RESOURCES.SETTINGS]: [ACTIONS.READ],
    [RESOURCES.SECURITY]: [ACTIONS.READ]
  },
  [ROLES.PATIENT]: {
    [RESOURCES.PATIENT]: [ACTIONS.READ], // Nur eigene Daten
    [RESOURCES.APPOINTMENT]: [ACTIONS.READ, ACTIONS.BOOK, ACTIONS.CANCEL], // Nur eigene Termine
    [RESOURCES.DOCUMENT]: [ACTIONS.READ], // Nur eigene Dokumente
    [RESOURCES.BILLING]: [ACTIONS.READ], // Nur eigene Rechnungen
    [RESOURCES.REPORTS]: [ACTIONS.READ] // Nur eigene Reports
  }
};

// User Interface für RBAC
export interface User {
  _id?: string;
  id?: string;
  role: string;
  permissions?: string[];
  rbac?: {
    resourceRoles?: Array<{
      resource: string;
      resourceId?: string;
      role: string;
      expiresAt?: string;
    }>;
    customPermissions?: Array<{
      resource: string;
      resourceId?: string;
      actions: string[];
      conditions?: any;
      expiresAt?: string;
    }>;
  };
}

// RBAC Hook für React Components
export const useRBAC = (user: User | null) => {
  /**
   * Prüft ob der Benutzer eine bestimmte Rolle hat
   */
  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false;
    
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role) || isRoleHigher(user.role, roles);
  };

  /**
   * Prüft ob der Benutzer eine bestimmte Permission hat
   */
  const hasPermission = (permission: string | string[]): boolean => {
    if (!user) return false;
    
    const permissions = Array.isArray(permission) ? permission : [permission];
    
    // Prüfe Standard-Permissions
    if (user.permissions) {
      const hasStandardPermission = permissions.some(perm => user.permissions!.includes(perm));
      if (hasStandardPermission) return true;
    }
    
    // Prüfe Custom Permissions
    if (user.rbac?.customPermissions) {
      const hasCustomPermission = user.rbac.customPermissions.some(cp => 
        permissions.some(perm => cp.actions.includes(perm))
      );
      if (hasCustomPermission) return true;
    }
    
    return false;
  };

  /**
   * Prüft ob der Benutzer eine Aktion auf einer Resource ausführen kann
   */
  const can = (action: string, resource: string, resourceId?: string): boolean => {
    if (!user) return false;
    
    // Super Admin hat immer Zugriff
    if (user.role === ROLES.SUPER_ADMIN) return true;
    
    // Prüfe Rollen-basierte Permissions
    const rolePermissions = ROLE_PERMISSIONS[user.role];
    if (!rolePermissions) return false;
    
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
    const hasRolePermission = resourcePermissions.includes(action);
    
    // Prüfe Custom Permissions für spezifische Resource
    if (user.rbac?.customPermissions) {
      const hasCustomPermission = user.rbac.customPermissions.some(cp => 
        cp.resource === resource && 
        (cp.resourceId === resourceId || !cp.resourceId) &&
        cp.actions.includes(action)
      );
      
      if (hasCustomPermission) return true;
    }
    
    return hasRolePermission;
  };

  /**
   * Prüft ob der Benutzer eine Resource lesen kann
   */
  const canRead = (resource: string, resourceId?: string): boolean => {
    return can(ACTIONS.READ, resource, resourceId);
  };

  /**
   * Prüft ob der Benutzer eine Resource erstellen kann
   */
  const canCreate = (resource: string): boolean => {
    return can(ACTIONS.CREATE, resource);
  };

  /**
   * Prüft ob der Benutzer eine Resource aktualisieren kann
   */
  const canUpdate = (resource: string, resourceId?: string): boolean => {
    return can(ACTIONS.UPDATE, resource, resourceId);
  };

  /**
   * Prüft ob der Benutzer eine Resource löschen kann
   */
  const canDelete = (resource: string, resourceId?: string): boolean => {
    return can(ACTIONS.DELETE, resource, resourceId);
  };

  /**
   * Prüft ob der Benutzer sensible Daten einsehen kann
   */
  const canViewSensitiveData = (sensitivityLevel: 'normal' | 'sensitive' | 'highly_sensitive' | 'restricted'): boolean => {
    if (!user) return false;
    
    // Super Admin und Admin haben immer Zugriff
    if (['super_admin', 'admin'].includes(user.role)) return true;
    
    // Ärzte haben Zugriff auf alle Stufen
    if (user.role === 'arzt') return true;
    
    // Andere Rollen haben nur Zugriff auf normale Daten
    return sensitivityLevel === 'normal';
  };

  /**
   * Gibt alle erlaubten Actions für eine Resource zurück
   */
  const getAllowedActions = (resource: string, resourceId?: string): string[] => {
    if (!user) return [];
    
    const actions: string[] = [];
    const rolePermissions = ROLE_PERMISSIONS[user.role];
    
    if (rolePermissions) {
      const resourcePermissions = rolePermissions[resource];
      if (resourcePermissions) {
        actions.push(...resourcePermissions);
      }
    }
    
    // Füge Custom Permissions hinzu
    if (user.rbac?.customPermissions) {
      user.rbac.customPermissions.forEach(cp => {
        if (cp.resource === resource && (cp.resourceId === resourceId || !cp.resourceId)) {
          actions.push(...cp.actions);
        }
      });
    }
    
    return Array.from(new Set(actions)); // Entferne Duplikate
  };

  /**
   * Gibt die Benutzerrolle mit Label zurück
   */
  const getRoleInfo = () => {
    if (!user) return null;
    
    return {
      role: user.role,
      label: getRoleLabel(user.role),
      description: getRoleDescription(user.role),
      level: getRoleLevel(user.role)
    };
  };

  return {
    hasRole,
    hasPermission,
    can,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canViewSensitiveData,
    getAllowedActions,
    getRoleInfo,
    isAuthenticated: !!user,
    user
  };
};

// Hilfsfunktionen
function isRoleHigher(userRole: string, requiredRoles: string[]): boolean {
  const hierarchy = {
    [ROLES.SUPER_ADMIN]: 6,
    [ROLES.ADMIN]: 5,
    [ROLES.ARZT]: 4,
    [ROLES.ASSISTENT]: 3,
    [ROLES.REZEPTION]: 2,
    [ROLES.BILLING]: 2,
    [ROLES.PATIENT]: 1
  };
  
  const userLevel = hierarchy[userRole as keyof typeof hierarchy] || 0;
  return requiredRoles.some(role => userLevel > (hierarchy[role as keyof typeof hierarchy] || 0));
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
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

function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
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

function getRoleLevel(role: string): number {
  const levels: Record<string, number> = {
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

// HOC für RBAC-geschützte Komponenten
export const withRBAC = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions?: string | string[],
  requiredRole?: string | string[]
) => {
  return (props: P & { user?: User }) => {
    const { user, ...restProps } = props;
    const rbac = useRBAC(user || null);
    
    // Prüfe Rollen
    if (requiredRole && !rbac.hasRole(requiredRole)) {
      return null; // Oder eine "Zugriff verweigert" Komponente
    }
    
    // Prüfe Permissions
    if (requiredPermissions && !rbac.hasPermission(requiredPermissions)) {
      return null; // Oder eine "Zugriff verweigert" Komponente
    }
    
    return React.createElement(Component, { ...restProps, user, rbac } as any);
  };
};

// Utility für bedingte Rendering
export const IfCan = ({ 
  action, 
  resource, 
  resourceId, 
  user, 
  children, 
  fallback = null 
}: {
  action: string;
  resource: string;
  resourceId?: string;
  user: User | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  const rbac = useRBAC(user);
  
  if (rbac.can(action, resource, resourceId)) {
    return React.createElement(React.Fragment, {}, children);
  }
  
  return React.createElement(React.Fragment, {}, fallback);
};

export default useRBAC;
