import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel
} from '@mui/material';
import GradientDialogTitle from '../components/GradientDialogTitle';
import {
  Security,
  Person,
  Group,
  Key,
  Shield,
  AdminPanelSettings,
  ExpandMore,
  Edit,
  Delete,
  Add,
  Visibility,
  CheckCircle,
  Cancel,
  Info,
  Print,
  Download,
  Upload,
  Restore,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';
import { ACTIONS, RESOURCES } from '../utils/rbac';
import { useRBAC } from '../hooks/useRBAC';
import { useAppSelector } from '../store/hooks';
import api from '../utils/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`rbac-tabpanel-${index}`}
      aria-labelledby={`rbac-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const RBACManagement: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const rbac = useRBAC(user);
  
  const [tabValue, setTabValue] = useState(0);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  // System-integrierte Rollen basierend auf dem bestehenden User-Model
  const systemRoles = [
    {
      value: 'super_admin',
      label: 'Super Administrator',
      description: 'Vollzugriff auf alle Systemfunktionen und -einstellungen',
      level: 6,
      permissions: {
        [RESOURCES.PATIENT]: Object.values(ACTIONS),
        [RESOURCES.APPOINTMENT]: Object.values(ACTIONS),
        [RESOURCES.DOCUMENT]: Object.values(ACTIONS),
        [RESOURCES.USER]: Object.values(ACTIONS),
        [RESOURCES.ROLE]: Object.values(ACTIONS),
        [RESOURCES.AUDIT]: Object.values(ACTIONS),
        [RESOURCES.SYSTEM]: Object.values(ACTIONS),
        [RESOURCES.BILLING]: Object.values(ACTIONS),
        [RESOURCES.REPORTS]: Object.values(ACTIONS),
        [RESOURCES.LOCATION]: Object.values(ACTIONS),
        [RESOURCES.SERVICE]: Object.values(ACTIONS),
        [RESOURCES.STAFF]: Object.values(ACTIONS),
        [RESOURCES.SETTINGS]: Object.values(ACTIONS),
        [RESOURCES.SECURITY]: Object.values(ACTIONS),
        [RESOURCES.XDS_DOCUMENT]: Object.values(ACTIONS),
        [RESOURCES.XDS_SUBMISSION_SET]: Object.values(ACTIONS),
        [RESOURCES.XDS_FOLDER]: Object.values(ACTIONS),
        [RESOURCES.XDS_ASSOCIATION]: Object.values(ACTIONS)
      }
    },
    {
      value: 'admin',
      label: 'Administrator',
      description: 'Verwaltung der Ordination und Benutzer',
      level: 5,
      permissions: {
        [RESOURCES.PATIENT]: Object.values(ACTIONS),
        [RESOURCES.APPOINTMENT]: Object.values(ACTIONS),
        [RESOURCES.DOCUMENT]: Object.values(ACTIONS),
        [RESOURCES.USER]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.CREATE],
        [RESOURCES.ROLE]: [ACTIONS.READ, ACTIONS.UPDATE],
        [RESOURCES.AUDIT]: [ACTIONS.READ, ACTIONS.EXPORT],
        [RESOURCES.SYSTEM]: [ACTIONS.READ, ACTIONS.UPDATE],
        [RESOURCES.BILLING]: Object.values(ACTIONS),
        [RESOURCES.REPORTS]: Object.values(ACTIONS),
        [RESOURCES.LOCATION]: Object.values(ACTIONS),
        [RESOURCES.SERVICE]: Object.values(ACTIONS),
        [RESOURCES.STAFF]: Object.values(ACTIONS),
        [RESOURCES.SETTINGS]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.CONFIGURE],
        [RESOURCES.SECURITY]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.CONFIGURE],
        [RESOURCES.XDS_DOCUMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.QUERY, ACTIONS.RETRIEVE, ACTIONS.DEPRECATE, ACTIONS.SUBMIT],
        [RESOURCES.XDS_SUBMISSION_SET]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.XDS_FOLDER]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.XDS_ASSOCIATION]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE]
      }
    },
    {
      value: 'arzt',
      label: 'Arzt',
      description: 'Medizinische Behandlung und Patientenverwaltung',
      level: 4,
      permissions: {
        [RESOURCES.PATIENT]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.CREATE],
        [RESOURCES.APPOINTMENT]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.CREATE, ACTIONS.DELETE],
        [RESOURCES.DOCUMENT]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.GENERATE, ACTIONS.PRINT],
        [RESOURCES.USER]: [ACTIONS.READ],
        [RESOURCES.AUDIT]: [ACTIONS.READ],
        [RESOURCES.BILLING]: [ACTIONS.READ, ACTIONS.UPDATE],
        [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.GENERATE],
        [RESOURCES.LOCATION]: [ACTIONS.READ],
        [RESOURCES.SERVICE]: [ACTIONS.READ, ACTIONS.UPDATE],
        [RESOURCES.STAFF]: [ACTIONS.READ],
        [RESOURCES.SETTINGS]: [ACTIONS.READ],
        [RESOURCES.SECURITY]: [ACTIONS.READ],
        [RESOURCES.XDS_DOCUMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.QUERY, ACTIONS.RETRIEVE, ACTIONS.DEPRECATE],
        [RESOURCES.XDS_SUBMISSION_SET]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
        [RESOURCES.XDS_FOLDER]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE]
      }
    },
    {
      value: 'assistent',
      label: 'Medizinische Assistenz',
      description: 'Unterstützung bei der Patientenbetreuung',
      level: 3,
      permissions: {
        [RESOURCES.PATIENT]: [ACTIONS.READ, ACTIONS.UPDATE],
        [RESOURCES.APPOINTMENT]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.CREATE],
        [RESOURCES.DOCUMENT]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE],
        [RESOURCES.USER]: [ACTIONS.READ],
        [RESOURCES.AUDIT]: [ACTIONS.READ],
        [RESOURCES.BILLING]: [ACTIONS.READ],
        [RESOURCES.REPORTS]: [ACTIONS.READ],
        [RESOURCES.LOCATION]: [ACTIONS.READ],
        [RESOURCES.SERVICE]: [ACTIONS.READ],
        [RESOURCES.STAFF]: [ACTIONS.READ]
      }
    },
    {
      value: 'rezeption',
      label: 'Rezeption',
      description: 'Terminverwaltung und Patientenaufnahme',
      level: 2,
      permissions: {
        [RESOURCES.PATIENT]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE],
        [RESOURCES.APPOINTMENT]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.DOCUMENT]: [ACTIONS.READ, ACTIONS.CREATE],
        [RESOURCES.USER]: [ACTIONS.READ],
        [RESOURCES.AUDIT]: [ACTIONS.READ],
        [RESOURCES.BILLING]: [ACTIONS.READ, ACTIONS.CREATE],
        [RESOURCES.REPORTS]: [ACTIONS.READ],
        [RESOURCES.LOCATION]: [ACTIONS.READ],
        [RESOURCES.SERVICE]: [ACTIONS.READ, ACTIONS.UPDATE],
        [RESOURCES.STAFF]: [ACTIONS.READ],
        [RESOURCES.SETTINGS]: [ACTIONS.READ],
        [RESOURCES.SECURITY]: [ACTIONS.READ]
      }
    },
    {
      value: 'billing',
      label: 'Abrechnung',
      description: 'Abrechnung und Finanzverwaltung',
      level: 2,
      permissions: {
        [RESOURCES.PATIENT]: [ACTIONS.READ],
        [RESOURCES.APPOINTMENT]: [ACTIONS.READ],
        [RESOURCES.DOCUMENT]: [ACTIONS.READ],
        [RESOURCES.USER]: [ACTIONS.READ],
        [RESOURCES.AUDIT]: [ACTIONS.READ],
        [RESOURCES.BILLING]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.GENERATE],
        [RESOURCES.REPORTS]: [ACTIONS.READ, ACTIONS.GENERATE, ACTIONS.EXPORT],
        [RESOURCES.LOCATION]: [ACTIONS.READ],
        [RESOURCES.SERVICE]: [ACTIONS.READ],
        [RESOURCES.STAFF]: [ACTIONS.READ],
        [RESOURCES.SETTINGS]: [ACTIONS.READ],
        [RESOURCES.SECURITY]: [ACTIONS.READ]
      }
    },
    {
      value: 'patient',
      label: 'Patient',
      description: 'Eigene Daten einsehen und Termine buchen',
      level: 1,
      permissions: {
        [RESOURCES.PATIENT]: [ACTIONS.READ],
        [RESOURCES.APPOINTMENT]: [ACTIONS.READ, ACTIONS.CREATE],
        [RESOURCES.DOCUMENT]: [ACTIONS.READ],
        [RESOURCES.USER]: [ACTIONS.READ],
        [RESOURCES.SERVICE]: [ACTIONS.READ],
        [RESOURCES.REPORTS]: [ACTIONS.READ]
      }
    }
  ];

  const systemPermissions = {
    actions: Object.values(ACTIONS).map(action => ({
      action,
      label: action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, ' '),
      resources: Object.values(RESOURCES)
    })),
    resources: Object.values(RESOURCES).map(resource => ({
      value: resource,
      label: resource.charAt(0).toUpperCase() + resource.slice(1).replace(/_/g, ' '),
      description: `Zugriff auf ${resource} Ressourcen`
    }))
  };
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  
  // Dialog states
  const [roleDialog, setRoleDialog] = useState(false);
  const [permissionDialog, setPermissionDialog] = useState(false);
  const [aclDialog, setAclDialog] = useState(false);
  const [newRoleDialog, setNewRoleDialog] = useState(false);
  
  // Form states
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedResource] = useState<any>(null);
  const [testUserId, setTestUserId] = useState('');
  const [testAction, setTestAction] = useState('');
  const [testResource, setTestResource] = useState('');
  const [testResult, setTestResult] = useState<{
    allowed: boolean;
    reason?: string;
    userId?: string;
    action?: string;
    resource?: string;
  } | null>(null);
  const [currentPermissions, setCurrentPermissions] = useState<Record<string, string[]>>({});
  
  // New role form
  const [newRole, setNewRole] = useState<{
    name?: string;
    value?: string;
    label: string;
    description: string;
    level: number;
    permissions: Record<string, string[]>;
  }>({
    name: '',
    label: '',
    description: '',
    level: 1,
    permissions: {} as Record<string, string[]>
  });
  
  // Change reason for Custom Permissions
  const [changeReason, setChangeReason] = useState('');
  
  // ACL management
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);

  const [aclSettings, setAclSettings] = useState({
    allowedRoles: [] as string[],
    allowedUsers: [] as string[],
    deniedRoles: [] as string[],
    deniedUsers: [] as string[],
    conditions: {
      timeRestrictions: false,
      locationRestrictions: false,
      ipRestrictions: false
    }
  });

  // Lade angepasste Rollen-Permissions vom Backend
  const loadCustomRolePermissions = async (): Promise<Record<string, any>> => {
    try {
      const customPermissions: Record<string, any> = {};
      
      // Lade für jede System-Rolle die angepassten Permissions
      for (const role of systemRoles) {
        try {
          const response = await api.get<{
            success?: boolean;
            data?: {
              customPermissions?: any;
            };
          }>(`/rbac/roles/${role.value}/permissions`);
          if (response.data?.success && response.data?.data?.customPermissions) {
            customPermissions[role.value] = response.data.data.customPermissions;
          }
        } catch (error) {
          // Ignoriere Fehler (Rolle hat keine angepassten Permissions)
          console.debug(`No custom permissions for role ${role.value}`);
        }
      }
      
      return customPermissions;
    } catch (error) {
      console.error('Error loading custom role permissions:', error);
      return {};
    }
  };

  // Speichere geänderte Rollen-Permissions im Backend
  const saveCustomRolePermissions = async (roleValue: string, permissions: any, changeReason?: string) => {
    try {
      await api.put(`/rbac/roles/${roleValue}/permissions`, {
        permissions,
        changeReason: changeReason || `Permissions für Rolle ${roleValue} angepasst`
      });
    } catch (error) {
      console.error('Error saving custom role permissions:', error);
      throw error;
    }
  };

  const loadData = useCallback(async () => {
    try {
      // Lade Rollen vom Backend (inkl. hasCustomPermissions Flag)
      const rolesRes = await api.get<{
        success?: boolean;
        data?: Array<{
          value: string;
          label: string;
          description: string;
          level: number;
          permissions: Record<string, string[]>;
          hasCustomPermissions?: boolean;
        }>;
      }>('/rbac/roles');
      if (rolesRes.data?.success && rolesRes.data?.data) {
        // Backend liefert bereits merged Permissions und hasCustomPermissions Flag
        setRoles(rolesRes.data.data);
      } else {
        // Fallback: Lade Custom-Permissions manuell
        const customPermissions = await loadCustomRolePermissions();
        const mergedRoles = systemRoles.map(role => {
          if (customPermissions[role.value]) {
            return {
              ...role,
              permissions: customPermissions[role.value],
              hasCustomPermissions: true
            };
          }
          return {
            ...role,
            hasCustomPermissions: false
          };
        });
        setRoles(mergedRoles);
      }
      
      setPermissions(systemPermissions);
      
      // Nur Benutzer von der API laden
      const usersRes = await api.get('/users');
      setUsers((usersRes.data as any).data || []);
      
      // Mock Audit-Logs für Demo-Zwecke
      setAuditLogs([
        {
          _id: '1',
          userId: user?.id || 'current-user',
          userEmail: user?.email || 'admin@example.com',
          userRole: user?.role || 'admin',
          action: 'authorization',
          resource: 'patient',
          resourceId: 'patient-123',
          description: 'Zugriff auf Patientendaten gewährt',
          details: {
            userRole: user?.role || 'admin',
            requestedAction: 'read',
            allowed: true,
            reason: 'Rollen-basierte Berechtigung'
          },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0...',
          success: true,
          timestamp: new Date().toISOString()
        },
        {
          _id: '2',
          userId: user?.id || 'current-user',
          userEmail: user?.email || 'admin@example.com',
          userRole: user?.role || 'admin',
          action: 'authorization',
          resource: 'appointment',
          resourceId: 'appointment-456',
          description: 'Termin erstellt',
          details: {
            userRole: user?.role || 'admin',
            requestedAction: 'create',
            allowed: true,
            reason: 'Rollen-basierte Berechtigung'
          },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0...',
          success: true,
          timestamp: new Date(Date.now() - 3600000).toISOString()
        }
      ]);
    } catch (error) {
      console.error('Error loading RBAC data:', error);
      setSnackbar({ open: true, message: 'Fehler beim Laden der Daten', severity: 'error' });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lade aktuelle Berechtigungen wenn Test-Tab aktiv ist
  useEffect(() => {
    if (tabValue === 4) {
      loadCurrentPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabValue, user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.post(`/rbac/users/${userId}/roles`, { role: newRole });
      setSnackbar({ open: true, message: 'Rolle erfolgreich geändert', severity: 'success' });
      loadData();
    } catch (error) {
      console.error('Error changing role:', error);
      setSnackbar({ open: true, message: 'Fehler beim Ändern der Rolle', severity: 'error' });
    }
  };

  const handleTestAuthorization = async () => {
    try {
      setTestResult(null);
      const response: any = await api.post('/rbac/test-authorization', {
        userId: testUserId,
        action: testAction,
        resource: testResource
      });
      
      const responseData = response.data?.data || response.data;
      setTestResult({
        allowed: responseData.allowed,
        reason: responseData.reason,
        userId: responseData.userId,
        action: responseData.action,
        resource: responseData.resource
      });
      
      setSnackbar({ 
        open: true, 
        message: `Autorisierung: ${responseData.allowed ? 'Erlaubt ✓' : 'Verweigert ✗'}`, 
        severity: responseData.allowed ? 'success' : 'error' 
      });
    } catch (error: any) {
      console.error('Error testing authorization:', error);
      setTestResult({
        allowed: false,
        reason: error.response?.data?.message || error.message || 'Fehler beim Testen der Autorisierung'
      });
      setSnackbar({ open: true, message: 'Fehler beim Testen der Autorisierung', severity: 'error' });
    }
  };

  // Lade aktuelle Berechtigungen für den eingeloggten Benutzer
  const loadCurrentPermissions = async () => {
    try {
      if (!user?._id) {
        // Fallback: Verwende systemRoles wenn kein user._id vorhanden
        const rolePermissions = systemRoles.find(r => r.value === user?.role)?.permissions || {};
        setCurrentPermissions(rolePermissions);
        return;
      }
      
      // Versuche zuerst, ob es einen direkten Endpoint gibt
      try {
        const response: any = await api.get(`/rbac/users/${user._id}/permissions`);
        if (response.data?.success && response.data?.data) {
          setCurrentPermissions(response.data.data);
          return;
        }
      } catch (apiError) {
        // Endpoint existiert nicht, verwende Fallback
        console.log('Direct permissions endpoint not available, using role-based permissions');
      }
      
      // Fallback: Verwende systemRoles basierend auf user.role
      const rolePermissions = systemRoles.find(r => r.value === user?.role)?.permissions || {};
      setCurrentPermissions(rolePermissions);
    } catch (error) {
      console.error('Error loading current permissions:', error);
      // Fallback: Verwende systemRoles
      const rolePermissions = systemRoles.find(r => r.value === user?.role)?.permissions || {};
      setCurrentPermissions(rolePermissions);
    }
  };

  const handleCreateRole = async () => {
    try {
      // Prüfe ob es sich um eine system-integrierte Rolle handelt
      const roleValue = newRole.value || newRole.name;
      const isSystemRole = systemRoles.some(role => role.value === roleValue);
      
      // Wenn es eine bestehende Rolle ist (Update)
      if (selectedRole) {
        // System-Rollen können aktualisiert werden, aber nicht gelöscht werden
        const roleValue = newRole.value || newRole.name || selectedRole;
        await handleUpdateRole(roleValue, newRole);
        setNewRoleDialog(false);
        setSelectedRole('');
        setNewRole({ name: '', label: '', description: '', level: 1, permissions: {} as Record<string, string[]> });
        setChangeReason('');
        return;
      }
      
      // Beim Erstellen neuer Rollen: System-Rollen können nicht neu erstellt werden
      if (isSystemRole) {
        setSnackbar({ 
          open: true, 
          message: 'System-Rollen können nicht neu erstellt werden. Verwenden Sie "Bearbeiten" um bestehende System-Rollen zu ändern.', 
          severity: 'warning' 
        });
        return;
      }
      
      await api.post('/rbac/roles', newRole);
      setSnackbar({ open: true, message: 'Rolle erfolgreich erstellt', severity: 'success' });
      setNewRoleDialog(false);
      setNewRole({ name: '', label: '', description: '', level: 1, permissions: {} as Record<string, string[]> });
      setChangeReason('');
      loadData();
    } catch (error) {
      console.error('Error creating role:', error);
      setSnackbar({ open: true, message: 'Fehler beim Erstellen der Rolle', severity: 'error' });
    }
  };

  const handleUpdateRole = async (roleId: string, updates: any) => {
    try {
      // Für System-Rollen: Speichere die geänderten Permissions im Backend
      const isSystemRole = systemRoles.some(sr => sr.value === roleId || sr.value === updates.value || sr.value === updates.name);
      
      if (isSystemRole) {
        // Speichere Custom-Permissions für System-Rolle im Backend
        const roleValue = updates.value || updates.name || roleId;
        const reason = changeReason || `Rolle ${roleValue} bearbeitet`;
        await saveCustomRolePermissions(roleValue, updates.permissions, reason);
        setSnackbar({ open: true, message: 'Rolle erfolgreich aktualisiert', severity: 'success' });
        setChangeReason(''); // Reset change reason
        loadData();
      } else {
        // Für benutzerdefinierte Rollen: Versuche Backend-Update (falls Endpoint existiert)
        try {
          await api.put(`/rbac/roles/${roleId}`, updates);
          setSnackbar({ open: true, message: 'Rolle erfolgreich aktualisiert', severity: 'success' });
        } catch (apiError) {
          // Falls Backend-Endpoint nicht existiert, zeige Fehler
          console.error('Error updating custom role:', apiError);
          setSnackbar({ open: true, message: 'Fehler beim Aktualisieren der benutzerdefinierten Rolle', severity: 'error' });
        }
        loadData();
      }
    } catch (error) {
      console.error('Error updating role:', error);
      setSnackbar({ open: true, message: 'Fehler beim Aktualisieren der Rolle', severity: 'error' });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await api.delete(`/rbac/roles/${roleId}`);
      setSnackbar({ open: true, message: 'Rolle erfolgreich gelöscht', severity: 'success' });
      loadData();
    } catch (error) {
      console.error('Error deleting role:', error);
      setSnackbar({ open: true, message: 'Fehler beim Löschen der Rolle', severity: 'error' });
    }
  };

  const handleAssignPermission = async (userId: string, permission: string) => {
    try {
      await api.post(`/rbac/users/${userId}/permissions`, { permission });
      setSnackbar({ open: true, message: 'Berechtigung erfolgreich zugewiesen', severity: 'success' });
      loadData();
    } catch (error) {
      console.error('Error assigning permission:', error);
      setSnackbar({ open: true, message: 'Fehler beim Zuweisen der Berechtigung', severity: 'error' });
    }
  };

  const handleRevokePermission = async (userId: string, permission: string) => {
    try {
      await api.delete(`/rbac/users/${userId}/permissions/${permission}`);
      setSnackbar({ open: true, message: 'Berechtigung erfolgreich entzogen', severity: 'success' });
      loadData();
    } catch (error) {
      console.error('Error revoking permission:', error);
      setSnackbar({ open: true, message: 'Fehler beim Entziehen der Berechtigung', severity: 'error' });
    }
  };

  const handleResetRolePermissions = async (roleId: string) => {
    try {
      await api.delete(`/rbac/roles/${roleId}/permissions`);
      setSnackbar({ open: true, message: 'Rollen-Berechtigungen auf Standard zurückgesetzt', severity: 'success' });
      loadData();
    } catch (error) {
      console.error('Error resetting role permissions:', error);
      setSnackbar({ open: true, message: 'Fehler beim Zurücksetzen der Rollen-Berechtigungen', severity: 'error' });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadResourceACL = async (resource: any) => {
    try {
      if (!resource || !resource.resourceType) {
        setAclSettings({
          allowedRoles: [],
          allowedUsers: [],
          deniedRoles: [],
          deniedUsers: [],
          conditions: {
            timeRestrictions: false,
            locationRestrictions: false,
            ipRestrictions: false
          }
        });
        return;
      }

      const response: any = await api.get(`/rbac/resources/${resource.resourceType}/${resource._id}/acl`);
      if (response.data?.success && response.data?.data?.acl) {
        const acl = response.data.data.acl;
        setAclSettings({
          allowedRoles: acl.allowedRoles || [],
          allowedUsers: acl.allowedUsers || [],
          deniedRoles: acl.deniedRoles || [],
          deniedUsers: acl.deniedUsers || [],
          conditions: {
            timeRestrictions: acl.conditions?.timeRestrictions || false,
            locationRestrictions: acl.conditions?.locationRestrictions || false,
            ipRestrictions: acl.conditions?.ipRestrictions || false
          }
        });
      }
    } catch (error) {
      console.error('Error loading resource ACL:', error);
      // Setze Standard-Werte wenn keine ACL gefunden wird
      setAclSettings({
        allowedRoles: [],
        allowedUsers: [],
        deniedRoles: [],
        deniedUsers: [],
        conditions: {
          timeRestrictions: false,
          locationRestrictions: false,
          ipRestrictions: false
        }
      });
    }
  };

  const handleUpdateACL = async (resourceId: string, aclData: any) => {
    try {
      if (!selectedResource || !selectedResource.resourceType) {
        setSnackbar({ open: true, message: 'Bitte wählen Sie eine Ressource aus', severity: 'warning' });
        return;
      }

      await api.put(`/rbac/resources/${selectedResource.resourceType}/${resourceId}/acl`, {
        acl: aclData,
        reason: 'ACL über RBAC Management aktualisiert'
      });
      setSnackbar({ open: true, message: 'Zugriffsrechte erfolgreich aktualisiert', severity: 'success' });
      setAclDialog(false);
      loadData();
    } catch (error: any) {
      console.error('Error updating ACL:', error);
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.message || 'Fehler beim Aktualisieren der Zugriffsrechte', 
        severity: 'error' 
      });
    }
  };

  const handleExportAuditLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_BASE_URL}/rbac/audit-logs/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Exportieren der Audit-Logs');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'Audit-Protokolle erfolgreich exportiert', severity: 'success' });
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      setSnackbar({ open: true, message: 'Fehler beim Exportieren der Audit-Protokolle', severity: 'error' });
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'super_admin': 'error',
      'admin': 'warning',
      'arzt': 'primary',
      'assistent': 'secondary',
      'rezeption': 'info',
      'billing': 'success',
      'patient': 'default'
    };
    return colors[role] || 'default';
  };

  const getPermissionIcon = (action: string) => {
    const icons: Record<string, React.ReactNode> = {
      [ACTIONS.CREATE]: <Add />,
      [ACTIONS.READ]: <Visibility />,
      [ACTIONS.UPDATE]: <Edit />,
      [ACTIONS.DELETE]: <Delete />,
      [ACTIONS.GENERATE]: <Key />,
      [ACTIONS.PRINT]: <Print />,
      [ACTIONS.SHARE]: <Group />,
      [ACTIONS.EXPORT]: <Download />,
      [ACTIONS.IMPORT]: <Upload />,
      [ACTIONS.APPROVE]: <CheckCircle />,
      [ACTIONS.REJECT]: <Cancel />,
      [ACTIONS.AUDIT]: <Security />,
      [ACTIONS.CONFIGURE]: <AdminPanelSettings />
    };
    return icons[action] || <Key />;
  };

  if (!rbac.isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Zugriff verweigert</Typography>
          <Typography>Sie haben nicht die erforderlichen Berechtigungen für diese Seite.</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          <Security sx={{ mr: 2, verticalAlign: 'middle' }} />
          RBAC Management
        </Typography>
        <Tooltip title="Hilfe & Leitfaden">
          <IconButton
            onClick={() => setHelpDialogOpen(true)}
            color="primary"
            size="small"
          >
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
        Rollen, Berechtigungen und Zugriffskontrolle verwalten
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Rollen" icon={<Group />} />
            <Tab label="Berechtigungen" icon={<Key />} />
            <Tab label="Benutzer" icon={<Person />} />
            <Tab label="Audit-Protokolle" icon={<Security />} />
            <Tab label="Testen" icon={<Shield />} />
          </Tabs>
        </Box>

        {/* Rollen Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Rollen verwalten</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setNewRoleDialog(true)}
            >
              Neue Rolle erstellen
            </Button>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3 }}>
            {roles.map((role) => (
              <Box key={role.value}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip 
                          label={role.label} 
                          color={getRoleColor(role.value) as any}
                          size="small"
                          sx={{ mr: 2 }}
                        />
                        <Typography variant="h6">{role.label}</Typography>
                        {systemRoles.some(sr => sr.value === role.value) && (
                          <Chip 
                            label="System" 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            sx={{ ml: 1 }}
                          />
                        )}
                        {role.hasCustomPermissions && (
                          <Chip 
                            label="Angepasst" 
                            size="small" 
                            color="warning" 
                            variant="filled"
                            sx={{ ml: 1 }}
                            icon={<Edit />}
                            title="Diese Rolle hat angepasste Berechtigungen, die von den Standard-Berechtigungen abweichen"
                          />
                        )}
                      </Box>
                      <Box>
                        <Tooltip title="Rolle bearbeiten">
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                setSelectedRole(role.value || role.name);
                                setNewRole(role);
                                setChangeReason(''); // Reset change reason when opening dialog
                                setNewRoleDialog(true);
                              }}
                            >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        {!systemRoles.some(sr => sr.value === role.value) && (
                          <Tooltip title="Rolle löschen">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => {
                                if (window.confirm(`Rolle "${role.label}" wirklich löschen?`)) {
                                  handleDeleteRole(role.value);
                                }
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        )}
                        {systemRoles.some(sr => sr.value === role.value) && role.hasCustomPermissions && (
                          <Tooltip title="Angepasste Berechtigungen zurücksetzen">
                            <IconButton 
                              size="small" 
                              color="warning"
                              onClick={() => {
                                if (window.confirm(`Angepasste Permissions für "${role.label}" wirklich auf Standard zurücksetzen?`)) {
                                  handleResetRolePermissions(role.value);
                                }
                              }}
                            >
                              <Restore />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {role.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Level: {role.level} | Permissions: {Object.keys(role.permissions).length}
                      </Typography>
                      {role.hasCustomPermissions && (
                        <Chip 
                          label="Angepasste Berechtigungen aktiv" 
                          size="small" 
                          color="warning" 
                          variant="outlined"
                          sx={{ fontSize: '0.65rem', height: '20px' }}
                        />
                      )}
                    </Box>
                    
                    {/* Permissions für diese Rolle anzeigen */}
                    <Box sx={{ mt: 2, maxHeight: 400, overflowY: 'auto' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Berechtigungen:
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {Object.entries(role.permissions || {}).map(([resource, actions]) => (
                          <Box 
                            key={resource}
                            sx={{ 
                              p: 1.5, 
                              bgcolor: 'background.default', 
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontWeight: 600, 
                                display: 'block',
                                mb: 0.5,
                                color: 'primary.main'
                              }}
                            >
                              {resource}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {(actions as string[]).map((action) => (
                                <Chip
                                  key={action}
                                  label={action}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              ))}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </TabPanel>

        {/* Berechtigungen Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Aktionen
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Aktion</TableCell>
                      <TableCell>Bezeichnung</TableCell>
                      <TableCell>Ressourcen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {permissions.actions?.map((action: any) => (
                      <TableRow key={action.action}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getPermissionIcon(action.action)}
                            <Typography sx={{ ml: 1 }}>{action.action}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{action.label}</TableCell>
                        <TableCell>
                          <Chip 
                            label={action.resources?.length || 0} 
                            size="small" 
                            color="primary" 
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            
            <Box>
              <Typography variant="h6" gutterBottom>
                Ressourcen
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ressource</TableCell>
                      <TableCell>Bezeichnung</TableCell>
                      <TableCell>Beschreibung</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {permissions.resources?.map((resource: any) => (
                      <TableRow key={resource.value}>
                        <TableCell>{resource.value}</TableCell>
                        <TableCell>{resource.label}</TableCell>
                        <TableCell>{resource.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        </TabPanel>

        {/* Benutzer Tab */}
        <TabPanel value={tabValue} index={2}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Benutzer</TableCell>
                  <TableCell>Aktuelle Rolle</TableCell>
                  <TableCell>Berechtigungen</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {user.firstName} {user.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role} 
                        color={getRoleColor(user.role) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge badgeContent={user.permissions?.length || 0} color="primary">
                        <Key />
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.isActive ? 'Aktiv' : 'Inaktiv'} 
                        color={user.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Rolle ändern">
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setSelectedUser(user);
                              setSelectedRole(user.role);
                              setRoleDialog(true);
                            }}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Berechtigungen verwalten">
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setSelectedUser(user);
                              setPermissionDialog(true);
                            }}
                          >
                            <Key />
                          </IconButton>
                        </Tooltip>
                        {/* ACL wird ressourcen-basiert verwaltet, nicht benutzer-basiert */}
                        {/* ACL-Verwaltung ist im Ressourcen-Tab verfügbar */}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Audit Logs Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Audit Logs</Typography>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportAuditLogs}
            >
              Export CSV
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Zeitstempel</TableCell>
                  <TableCell>Benutzer</TableCell>
                  <TableCell>Aktion</TableCell>
                  <TableCell>Ressource</TableCell>
                  <TableCell>Ergebnis</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {new Date(log.timestamp).toLocaleString('de-DE')}
                    </TableCell>
                    <TableCell>
                      {log.userId?.firstName} {log.userId?.lastName}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={log.action} 
                        size="small"
                        color={log.success ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>{log.resource}</TableCell>
                    <TableCell>
                      {log.success ? (
                        <CheckCircle color="success" />
                      ) : (
                        <Cancel color="error" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={log.details?.reason || 'Keine Details'}>
                        <IconButton size="small">
                          <Info />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Test Tab */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3 }}>
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Autorisierung testen
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth>
                      <InputLabel>Benutzer</InputLabel>
                      <Select
                        value={testUserId}
                        onChange={(e) => setTestUserId(e.target.value)}
                      >
                        {users.map((user) => (
                          <MenuItem key={user._id} value={user._id}>
                            {user.firstName} {user.lastName} ({user.role})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth>
                      <InputLabel>Aktion</InputLabel>
                      <Select
                        value={testAction}
                        onChange={(e) => setTestAction(e.target.value)}
                      >
                        {Object.values(ACTIONS).map((action) => (
                          <MenuItem key={action} value={action}>
                            {action}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth>
                      <InputLabel>Ressource</InputLabel>
                      <Select
                        value={testResource}
                        onChange={(e) => setTestResource(e.target.value)}
                      >
                        {Object.values(RESOURCES).map((resource) => (
                          <MenuItem key={resource} value={resource}>
                            {resource}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <Button 
                      variant="contained" 
                      onClick={handleTestAuthorization}
                      disabled={!testUserId || !testAction || !testResource}
                    >
                      Test durchführen
                    </Button>

                    {/* Testergebnis anzeigen */}
                    {testResult && (
                      <Alert 
                        severity={testResult.allowed ? 'success' : 'error'}
                        sx={{ mt: 2 }}
                        icon={testResult.allowed ? <CheckCircle /> : <Cancel />}
                      >
                        <Typography variant="subtitle2" gutterBottom>
                          {testResult.allowed ? '✓ Autorisierung erlaubt' : '✗ Autorisierung verweigert'}
                        </Typography>
                        {testResult.reason && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Grund:</strong> {testResult.reason}
                          </Typography>
                        )}
                        <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.8 }}>
                          Benutzer: {users.find(u => u._id === testResult.userId)?.firstName} {users.find(u => u._id === testResult.userId)?.lastName} ({users.find(u => u._id === testResult.userId)?.role})
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
                          Aktion: {testResult.action} | Ressource: {testResult.resource}
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>
            
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Aktuelle Berechtigungen
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Ihre aktuellen Berechtigungen basierend auf Ihrer Rolle: <strong>{user?.role}</strong>
                  </Typography>
                  
                  {Object.keys(currentPermissions).length === 0 ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        Berechtigungen werden geladen... Oder verwenden Sie "Test durchführen" um spezifische Autorisierungen zu prüfen.
                      </Typography>
                    </Alert>
                  ) : (
                    Object.entries(currentPermissions).map(([resource, actions]) => (
                      <Accordion key={resource}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography variant="subtitle2">{resource}</Typography>
                          <Chip 
                            label={`${actions.length} Berechtigungen`} 
                            size="small" 
                            color="primary" 
                            sx={{ ml: 2 }}
                          />
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {actions.map((action: string) => (
                              <Chip 
                                key={action} 
                                label={action} 
                                size="small" 
                                color="primary" 
                              />
                            ))}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    ))
                  )}
                  
                  {/* Fallback: Zeige statische systemRoles wenn keine Backend-Berechtigungen geladen wurden */}
                  {Object.keys(currentPermissions).length === 0 && (
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                        Erwartete Berechtigungen (basierend auf Rollendefinition):
                      </Typography>
                      {Object.entries(systemRoles.find(r => r.value === user?.role)?.permissions || {}).map(([resource, actions]) => (
                        <Accordion key={resource}>
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant="subtitle2">{resource}</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {(actions as string[]).map((action: string) => (
                                <Chip 
                                  key={action} 
                                  label={action} 
                                  size="small" 
                                  color="primary" 
                                />
                              ))}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        </TabPanel>
      </Card>

      {/* Rolle ändern Dialog */}
      <Dialog open={roleDialog} onClose={() => setRoleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rolle ändern</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Benutzer: {selectedUser?.firstName} {selectedUser?.lastName}
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Neue Rolle</InputLabel>
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                {roles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialog(false)}>Abbrechen</Button>
          <Button 
            onClick={() => {
              if (selectedUser && selectedRole) {
                handleRoleChange(selectedUser._id, selectedRole);
                setRoleDialog(false);
              }
            }}
            variant="contained"
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Neue Rolle Dialog */}
      <Dialog open={newRoleDialog} onClose={() => setNewRoleDialog(false)} maxWidth="md" fullWidth>
        <GradientDialogTitle 
          title={selectedRole ? 'Rolle bearbeiten' : 'Neue Rolle erstellen'}
          onClose={() => setNewRoleDialog(false)}
          isEdit={!!selectedRole}
        />
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {selectedRole && systemRoles.some(sr => sr.value === selectedRole) && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>System-Rolle:</strong> Sie bearbeiten eine System-Rolle. 
                  Änderungen werden als <strong>Angepasste Berechtigungen</strong> gespeichert und überschreiben die Standard-Berechtigungen.
                  Sie können diese jederzeit mit dem "Wiederherstellen"-Button zurücksetzen.
                </Typography>
              </Alert>
            )}
            {selectedRole && systemRoles.some(sr => sr.value === selectedRole) && (
              <TextField
                label="Grund für die Änderung (optional)"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                fullWidth
                placeholder="z.B. 'Arzt soll keine Patienten löschen können'"
                helperText="Dieser Grund wird für Audit-Zwecke gespeichert"
              />
            )}
            <TextField
              label="Rollen-Name"
              value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              fullWidth
              disabled={!!selectedRole && systemRoles.some(sr => sr.value === selectedRole)}
            />
            <TextField
              label="Anzeige-Name"
              value={newRole.label}
              onChange={(e) => setNewRole({ ...newRole, label: e.target.value })}
              fullWidth
              disabled={!!selectedRole && systemRoles.some(sr => sr.value === selectedRole)}
            />
            <TextField
              label="Beschreibung"
              value={newRole.description}
              onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              disabled={!!selectedRole && systemRoles.some(sr => sr.value === selectedRole)}
            />
            <FormControl fullWidth>
              <InputLabel>Level</InputLabel>
              <Select
                value={newRole.level}
                onChange={(e) => setNewRole({ ...newRole, level: Number(e.target.value) })}
                disabled={!!selectedRole && systemRoles.some(sr => sr.value === selectedRole)}
              >
                <MenuItem value={1}>1 - Patient</MenuItem>
                <MenuItem value={2}>2 - Rezeption/Billing</MenuItem>
                <MenuItem value={3}>3 - Assistent</MenuItem>
                <MenuItem value={4}>4 - Arzt</MenuItem>
                <MenuItem value={5}>5 - Admin</MenuItem>
                <MenuItem value={6}>6 - Super Admin</MenuItem>
              </Select>
            </FormControl>
            
            {/* Permission Matrix */}
            <Typography variant="h6" sx={{ mt: 2 }}>Berechtigungen</Typography>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {Object.values(RESOURCES).map((resource) => (
                <Box key={resource} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {resource}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.values(ACTIONS).map((action) => (
                      <FormControlLabel
                        key={action}
                        control={
                          <Switch
                            checked={newRole.permissions[resource]?.includes(action) || false}
                            onChange={(e) => {
                              const currentPermissions = newRole.permissions[resource] || [];
                              const newPermissions = e.target.checked
                                ? [...currentPermissions, action]
                                : currentPermissions.filter(a => a !== action);
                              setNewRole({
                                ...newRole,
                                permissions: {
                                  ...newRole.permissions,
                                  [resource]: newPermissions
                                }
                              });
                            }}
                          />
                        }
                        label={action}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewRoleDialog(false)}>Abbrechen</Button>
          <Button 
            onClick={handleCreateRole}
            variant="contained"
            disabled={!newRole.name || !newRole.label}
          >
            {selectedRole ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permission Management Dialog */}
      <Dialog open={permissionDialog} onClose={() => setPermissionDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Berechtigungen verwalten</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Benutzer: {selectedUser?.firstName} {selectedUser?.lastName}
            </Typography>
            
            <Typography variant="h6" gutterBottom>Angepasste Berechtigungen</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {selectedUser?.customPermissions?.map((permission: string) => (
                <Chip
                  key={permission}
                  label={permission}
                  onDelete={() => handleRevokePermission(selectedUser._id, permission)}
                  color="primary"
                />
              ))}
            </Box>
            
            <Typography variant="h6" gutterBottom>Neue Berechtigung hinzufügen</Typography>
            <FormControl fullWidth>
              <InputLabel>Berechtigung</InputLabel>
              <Select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAssignPermission(selectedUser?._id, e.target.value);
                  }
                }}
              >
                {Object.values(ACTIONS).map((action) => (
                  <MenuItem key={action} value={action}>
                    {action}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionDialog(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* ACL Management Dialog */}
      <Dialog open={aclDialog} onClose={() => setAclDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Zugriffsrechte (ACL) verwalten</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Ressourcen-basierte ACL-Verwaltung:</strong> Diese Einstellungen gelten für die ausgewählte Ressource.
                Sie können festlegen, welche Rollen und Benutzer Zugriff haben, sowie zusätzliche Bedingungen setzen.
              </Typography>
            </Alert>
            
            {!selectedResource ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Hinweis:</strong> Bitte wählen Sie zuerst eine Ressource aus, für die Sie die Zugriffsrechte verwalten möchten.
                  Der Dialog sollte normalerweise von einer spezifischen Ressource (z.B. Patient, Dokument) aus geöffnet werden.
                </Typography>
              </Alert>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                <strong>Ressource:</strong> {selectedResource.name || selectedResource.title || selectedResource._id}
                {selectedResource.resourceType && (
                  <> ({selectedResource.resourceType})</>
                )}
              </Typography>
            )}
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="h6" gutterBottom>Erlaubte Rollen</Typography>
                <FormControl fullWidth>
                  <InputLabel>Rollen hinzufügen</InputLabel>
                  <Select
                    multiple
                    value={aclSettings.allowedRoles}
                    onChange={(e) => setAclSettings({
                      ...aclSettings,
                      allowedRoles: e.target.value as string[]
                    })}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              <Box>
                <Typography variant="h6" gutterBottom>Erlaubte Benutzer</Typography>
                <FormControl fullWidth>
                  <InputLabel>Benutzer hinzufügen</InputLabel>
                  <Select
                    multiple
                    value={aclSettings.allowedUsers}
                    onChange={(e) => setAclSettings({
                      ...aclSettings,
                      allowedUsers: e.target.value as string[]
                    })}
                  >
                    {users.map((user) => (
                      <MenuItem key={user._id} value={user._id}>
                        {user.firstName} {user.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Bedingungen</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={aclSettings.conditions.timeRestrictions}
                    onChange={(e) => setAclSettings({
                      ...aclSettings,
                      conditions: {
                        ...aclSettings.conditions,
                        timeRestrictions: e.target.checked
                      }
                    })}
                  />
                }
                label="Zeitbasierte Einschränkungen"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={aclSettings.conditions.locationRestrictions}
                    onChange={(e) => setAclSettings({
                      ...aclSettings,
                      conditions: {
                        ...aclSettings.conditions,
                        locationRestrictions: e.target.checked
                      }
                    })}
                  />
                }
                label="Standortbasierte Einschränkungen"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={aclSettings.conditions.ipRestrictions}
                    onChange={(e) => setAclSettings({
                      ...aclSettings,
                      conditions: {
                        ...aclSettings.conditions,
                        ipRestrictions: e.target.checked
                      }
                    })}
                  />
                }
                label="IP-basierte Einschränkungen"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAclDialog(false)}>Abbrechen</Button>
          <Button 
            onClick={() => {
              if (selectedResource && selectedResource._id) {
                handleUpdateACL(selectedResource._id, aclSettings);
              } else {
                setSnackbar({ 
                  open: true, 
                  message: 'Bitte wählen Sie eine Ressource aus', 
                  severity: 'warning' 
                });
              }
            }}
            variant="contained"
            disabled={!selectedResource || !selectedResource._id}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hilfe & Leitfaden Dialog */}
      <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '600px' }
        }}
      >
        <GradientDialogTitle 
          title="Hilfe & Leitfaden: RBAC-Verwaltung"
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs 
            value={helpTab} 
            onChange={(_, v) => setHelpTab(v)} 
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Übersicht" />
            <Tab label="Rollen verwalten" />
            <Tab label="Berechtigungen" />
            <Tab label="Angepasste Rollen-Berechtigungen" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  RBAC-Verwaltung
                </Typography>
                <Typography variant="body1" paragraph>
                  Die RBAC-Verwaltung ermöglicht es, Rollen, Berechtigungen und Zugriffe zu verwalten.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>👥 <strong>Rollen:</strong> Rollen erstellen und verwalten</li>
                  <li>🔐 <strong>Berechtigungen:</strong> Berechtigungen zuweisen</li>
                  <li>⚙️ <strong>Angepasste Rollen-Berechtigungen:</strong> Standard-Berechtigungen von System-Rollen anpassen</li>
                  <li>👤 <strong>Benutzer:</strong> Benutzer-Rollen zuweisen</li>
                  <li>📋 <strong>Audit:</strong> Zugriffe protokollieren</li>
                  <li>🧪 <strong>Testen:</strong> Autorisierungen testen</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Neue Features
                </Typography>
                <Alert severity="success" sx={{ mt: 1, mb: 2 }}>
                  <Typography variant="body2">
                    <strong>✨ Angepasste Rollen-Berechtigungen:</strong> System-Rollen können jetzt angepasste Berechtigungen haben, 
                    die von den Standard-Berechtigungen abweichen. Diese werden mit einem "Angepasst"-Badge markiert.
                  </Typography>
                </Alert>
                <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
                  <Typography variant="body2">
                    <strong>✅ Berechtigungs-Validierung:</strong> Alle Berechtigungen werden jetzt automatisch validiert, 
                    um sicherzustellen, dass nur gültige Ressourcen-Aktions-Kombinationen verwendet werden.
                  </Typography>
                </Alert>
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>📝 Berechtigungs-Format:</strong> Alle Berechtigungen verwenden jetzt das einheitliche Format 
                    <code>ressource.aktion</code> (Singular), z.B. <code>patient.read</code> statt <code>patients.read</code>.
                  </Typography>
                </Alert>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Rollen verwalten
                </Typography>
                <Typography variant="body2" paragraph>
                  So verwalten Sie Rollen:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Funktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>➕ <strong>Erstellen:</strong> Neue Rolle erstellen</li>
                  <li>✏️ <strong>Bearbeiten:</strong> Rolle bearbeiten</li>
                  <li>🗑️ <strong>Löschen:</strong> Rolle entfernen</li>
                  <li>📋 <strong>Zuweisen:</strong> Rolle zu Benutzern zuweisen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Berechtigungen
                </Typography>
                <Typography variant="body2" paragraph>
                  So verwalten Sie Berechtigungen:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Berechtigungstypen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>👁️ <strong>Lesen:</strong> Daten anzeigen</li>
                  <li>➕ <strong>Erstellen:</strong> Neue Daten erstellen</li>
                  <li>✏️ <strong>Bearbeiten:</strong> Daten bearbeiten</li>
                  <li>🗑️ <strong>Löschen:</strong> Daten entfernen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Angepasste Rollen-Berechtigungen
                </Typography>
                <Typography variant="body2" paragraph>
                  System-Rollen können angepasste Berechtigungen haben, die von den Standard-Berechtigungen abweichen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Was sind angepasste Rollen-Berechtigungen?
                </Typography>
                <Typography variant="body2" paragraph>
                  Angepasste Rollen-Berechtigungen ermöglichen es, die Standard-Berechtigungen von System-Rollen (z.B. "arzt", "assistent") 
                  zu überschreiben, ohne die Standard-Definition zu ändern. Dies ist nützlich, wenn Sie:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>🔧 Spezifische Berechtigungen für Ihre Ordination anpassen möchten</li>
                  <li>📋 Temporäre Änderungen testen möchten</li>
                  <li>🔄 Unterschiedliche Konfigurationen für verschiedene Standorte benötigen</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Wie erkenne ich angepasste Berechtigungen?
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>🏷️ <strong>Badge "Angepasst":</strong> Rollen mit angepassten Berechtigungen haben einen gelben "Angepasst"-Badge</li>
                  <li>🔄 <strong>Wiederherstellen-Button:</strong> Ein Wiederherstellen-Button erscheint, um angepasste Berechtigungen zurückzusetzen</li>
                  <li>📊 <strong>Vergleich:</strong> Die angezeigten Berechtigungen sind bereits die finalen (Standard + Angepasst zusammengeführt)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Angepasste Berechtigungen verwalten
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✏️ <strong>Bearbeiten:</strong> Klicken Sie auf "Bearbeiten" bei einer System-Rolle, um Berechtigungen anzupassen</li>
                  <li>💾 <strong>Speichern:</strong> Änderungen werden als angepasste Berechtigungen gespeichert</li>
                  <li>🔄 <strong>Zurücksetzen:</strong> Verwenden Sie den "Wiederherstellen"-Button, um auf Standard zurückzusetzen</li>
                  <li>📝 <strong>Grund angeben:</strong> Optional können Sie einen Grund für die Änderung angeben</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Wichtige Hinweise
                </Typography>
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>⚠️ Achtung:</strong> Angepasste Berechtigungen überschreiben Standard-Berechtigungen. 
                    Wenn Sie eine Berechtigung entfernen, wird sie auch für alle Benutzer mit dieser Rolle entfernt.
                  </Typography>
                </Alert>
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>💡 Tipp:</strong> Dokumentieren Sie Änderungen an angepassten Berechtigungen, 
                    um später nachvollziehen zu können, warum bestimmte Berechtigungen angepasst wurden.
                  </Typography>
                </Alert>
              </Box>
            </Box>
          )}

          {helpTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  RBAC-Verwaltung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Verwenden Sie das Prinzip der geringsten Berechtigung</li>
                  <li>✅ Prüfen Sie Berechtigungen regelmäßig</li>
                  <li>✅ Dokumentieren Sie Rollen-Änderungen</li>
                  <li>✅ Verwenden Sie Audit-Logs für Nachverfolgung</li>
                  <li>✅ Testen Sie angepasste Berechtigungen vor der Produktion</li>
                  <li>✅ Verwenden Sie Berechtigungs-Validierung (automatisch aktiv)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Permission-Format
                </Typography>
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>Format:</strong> Alle Permissions verwenden das Format <code>resource.action</code> (Singular).
                    <br />
                    <strong>Beispiele:</strong> <code>patient.read</code>, <code>appointment.create</code>, <code>document.update</code>
                    <br />
                    <strong>Hinweis:</strong> Plural-Formate (z.B. <code>patients.read</code>) werden automatisch konvertiert, 
                    aber Singular-Format wird empfohlen.
                  </Typography>
                </Alert>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)} variant="contained">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RBACManagement;
