import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';
import { loadUser } from '../store/slices/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useRBAC } from '../hooks/useRBAC';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermissions?: string[];
  requiredAction?: string;
  requiredResource?: string;
  resourceId?: string;
  sensitivityLevel?: 'normal' | 'sensitive' | 'highly_sensitive' | 'restricted';
  showAccessDenied?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  requiredPermissions = [],
  requiredAction,
  requiredResource,
  resourceId,
  sensitivityLevel,
  showAccessDenied = true
}) => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { user, isAuthenticated, loading, token } = useAppSelector((state) => state.auth);
  const rbac = useRBAC(user);

  // Prevent multiple loadUser calls
  const [hasLoadedUser, setHasLoadedUser] = useState(false);
  
  useEffect(() => {
    // If we have a token but no user, try to load user (only once)
    if (token && !user && !loading && !hasLoadedUser) {
      console.log('ProtectedRoute: Loading user with token');
      setHasLoadedUser(true);
      dispatch(loadUser());
    }
  }, [dispatch, token, user, loading, hasLoadedUser]);

  // Show loading spinner while checking authentication
  if (loading || (token && !user)) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login', {
      isAuthenticated,
      hasUser: !!user,
      token: !!token,
      location: location.pathname
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole) {
    console.log('ProtectedRoute: Checking role access', { 
      requiredRole, 
      userRole: user.role, 
      user: user,
      isAuthenticated,
      token: !!token
    });
    
    if (Array.isArray(requiredRole) ? !requiredRole.some(role => rbac.hasRole(role)) : !rbac.hasRole(requiredRole)) {
      console.log('ProtectedRoute: Access denied - insufficient role');
      if (showAccessDenied) {
        return (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">
              <Typography variant="h6">Zugriff verweigert</Typography>
              <Typography>
                Sie haben nicht die erforderliche Rolle für diesen Bereich.
                Erforderlich: {Array.isArray(requiredRole) ? requiredRole.join(', ') : requiredRole}
                <br />
                Ihre Rolle: {user.role}
              </Typography>
            </Alert>
          </Box>
        );
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check permission-based access (using new RBAC system)
  if (requiredPermissions.length > 0) {
    // Convert old permission format to new RBAC format
    const rbacPermissions = requiredPermissions.map(perm => {
      // Convert old format like "patients.read" to new format
      if (perm.includes('.')) {
        const [resource, action] = perm.split('.');
        // Convert plural resources to singular for consistency with backend
        const resourceMapping: Record<string, string> = {
          'patients': 'patient',
          'users': 'user',
          'appointments': 'appointment',
          'documents': 'document',
          'diagnoses': 'diagnosis',
          'prescriptions': 'prescription',
          'billings': 'billing',
          'roles': 'role',
          'locations': 'location',
          'services': 'service',
          'templates': 'template',
          'audit_logs': 'audit_log',
          'reports': 'reports',
          'staff': 'staff',
          'systems': 'system',
          'settings': 'settings',
          'security': 'security'
        };
        const normalizedResource = resourceMapping[resource] || resource;
        return { action, resource: normalizedResource };
      }
      return { action: perm, resource: 'system' };
    });
    
    // Use the new RBAC hook for permission checking
    const hasRequiredPermission = rbacPermissions.some(({ action, resource }) => {
      // Use the hasPermission function from useRBAC hook
      return rbac.hasPermission(resource, action);
    });
    
    if (!hasRequiredPermission) {
      console.log('ProtectedRoute: Permission check failed', {
        requiredPermissions,
        rbacPermissions,
        userRole: user.role,
        userPermissions: user.permissions
      });
      if (showAccessDenied) {
        // Get available permissions for the first required resource
        const firstResource = rbacPermissions[0]?.resource || 'user';
        const availablePermissions = user.permissions?.filter(p => p.startsWith(`${firstResource}.`)) || [];
        
        return (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">
              <Typography variant="h6">Zugriff verweigert</Typography>
              <Typography>
                Sie haben nicht die erforderlichen Berechtigungen für diesen Bereich.
                <br />
                Erforderlich: {requiredPermissions.join(', ')}
                <br />
                Ihre Rolle: {user.role}
                <br />
                Verfügbare Berechtigungen für {firstResource}: {availablePermissions.length > 0 ? availablePermissions.join(', ') : 'Keine'}
                <br />
                <br />
                Debug Info:
                <br />
                Konvertierte Permissions: {JSON.stringify(rbacPermissions)}
                <br />
                RBAC Status: Aktiv
              </Typography>
            </Alert>
          </Box>
        );
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check action-resource based access
  if (requiredAction && requiredResource) {
    if (!rbac.hasPermission(requiredResource, requiredAction)) {
      console.log('ProtectedRoute: Action-Resource check failed', {
        requiredAction,
        requiredResource,
        resourceId,
        userRole: user.role
      });
      if (showAccessDenied) {
        return (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">
              <Typography variant="h6">Zugriff verweigert</Typography>
              <Typography>
                Sie haben nicht die Berechtigung, diese Aktion auszuführen.
                <br />
                Erforderlich: {requiredAction} auf {requiredResource}
                {resourceId && ` (ID: ${resourceId})`}
              </Typography>
            </Alert>
          </Box>
        );
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check sensitivity level access
  if (sensitivityLevel) {
    // For now, only super_admin can access highly sensitive data
    if (sensitivityLevel === 'highly_sensitive' && user.role !== 'super_admin') {
      console.log('ProtectedRoute: Sensitivity level check failed', {
        sensitivityLevel,
        userRole: user.role
      });
      if (showAccessDenied) {
        return (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">
              <Typography variant="h6">Zugriff verweigert</Typography>
              <Typography>
                Sie haben nicht die Berechtigung, auf diese sensiblen Daten zuzugreifen.
                <br />
                Erforderliche Berechtigung: {sensitivityLevel} Daten
                <br />
                Ihre Rolle: {user.role}
              </Typography>
            </Alert>
          </Box>
        );
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Debug log for successful authentication
  console.log('ProtectedRoute: Access granted', { 
    userRole: user.role, 
    requiredRole, 
    requiredPermissions,
    requiredAction,
    requiredResource,
    sensitivityLevel,
    user: user,
    location: location.pathname
  });

  return <>{children}</>;
};

export default ProtectedRoute;