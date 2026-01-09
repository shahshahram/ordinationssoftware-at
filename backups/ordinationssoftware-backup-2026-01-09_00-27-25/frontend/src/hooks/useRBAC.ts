import { useCallback } from 'react';

export const useRBAC = (user: any) => {
  const hasPermission = useCallback((resource: string, action: string) => {
    if (!user || !user.permissions) return false;
    
    // Konvertiere singular zu plural für die Suche
    const resourceMapping: Record<string, string> = {
      'patient': 'patients',
      'appointment': 'appointments',
      'document': 'documents',
      'user': 'users',
      'billing': 'billing',
      'location': 'locations',
      'service': 'services',
      'role': 'roles',
      'template': 'templates',
      'audit_log': 'audit_logs',
      'reports': 'reports',
      'staff': 'staff',
      'system': 'systems',
      'settings': 'settings',
      'security': 'security',
      'locations': 'locations',
      'services': 'services',
      'personal': 'staff',
      'leistungen': 'services',
      'standorte': 'locations'
    };
    
    const pluralResource = resourceMapping[resource] || resource;
    const permission = `${pluralResource}.${action}`;
    
    // Direkte Permission prüfen
    if (user.permissions.includes(permission)) {
      return true;
    }
    
    // Spezielle Behandlung für 'write' - Alias für 'create' und 'update'
    if (action === 'write') {
      return user.permissions.includes(`${pluralResource}.create`) || user.permissions.includes(`${pluralResource}.update`);
    }
    
    return false;
  }, [user]);

  const hasRole = useCallback((role: string) => {
    if (!user) return false;
    return user.role === role;
  }, [user]);

  const canAccess = useCallback((resource: string, action: string) => {
    return hasPermission(resource, action);
  }, [hasPermission]);

  const canRead = useCallback((resource: string) => {
    return hasPermission(resource, 'read');
  }, [hasPermission]);

  const canWrite = useCallback((resource: string) => {
    return hasPermission(resource, 'write');
  }, [hasPermission]);

  const canDelete = useCallback((resource: string) => {
    return hasPermission(resource, 'delete');
  }, [hasPermission]);

  const canCreate = useCallback((resource: string) => {
    return hasPermission(resource, 'create');
  }, [hasPermission]);

  return {
    hasPermission,
    hasRole,
    canAccess,
    canRead,
    canWrite,
    canDelete,
    canCreate,
    user,
    isAdmin: hasRole('admin') || hasRole('super_admin'),
    isSuperAdmin: hasRole('super_admin'),
    isAuthenticated: !!user
  };
};

export default useRBAC;
