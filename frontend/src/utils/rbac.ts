import React from 'react';

/**
 * Frontend RBAC (Role-Based Access Control) Utilities
 * Feingranulare Berechtigungsprüfung für MyMediCloud MMC
 * 
 * NOTE: ROLES, ACTIONS, RESOURCES werden jetzt aus der generierten Datei importiert
 * für Konsistenz mit dem Backend. Die generierten Dateien werden aus permissions.schema.yaml erstellt.
 */

// Importiere generierte Constants (Single Source of Truth)
import {
  ROLES,
  ACTIONS,
  RESOURCES,
  ROLE_PERMISSIONS as GENERATED_ROLE_PERMISSIONS,
  ROLE_HIERARCHY as GENERATED_ROLE_HIERARCHY,
  type Role,
  type Action,
  type Resource
} from './permissions.generated';

// Re-export für Rückwärtskompatibilität
export { ROLES, ACTIONS, RESOURCES, type Role, type Action, type Resource };

// Rollen-Hierarchie (aus generierter Datei)
const ROLE_HIERARCHY = GENERATED_ROLE_HIERARCHY as Record<string, string[]>;

// Standard-Permissions für jede Rolle (aus generierter Datei)
// Konvertiere die generierte Struktur in das erwartete Format
const ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {};
Object.keys(GENERATED_ROLE_PERMISSIONS).forEach(role => {
  const rolePerms = GENERATED_ROLE_PERMISSIONS[role as Role];
  ROLE_PERMISSIONS[role] = {};
  
  Object.keys(rolePerms).forEach(key => {
    if (key === '*') {
      ROLE_PERMISSIONS[role]['*'] = ['*'];
    } else {
      const resource = key as Resource;
      const actions = rolePerms[resource];
      if (actions) {
        ROLE_PERMISSIONS[role][resource] = [...actions] as string[];
      }
    }
  });
});

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
    
    // Spezielle Behandlung für 'write' - Alias für 'create' und 'update'
    if (action === 'write') {
      const hasWritePermission = resourcePermissions.includes('create') || resourcePermissions.includes('update');
      if (hasWritePermission) return true;
    }
    
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
