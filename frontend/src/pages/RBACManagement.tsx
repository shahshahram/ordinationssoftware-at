import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Grid,
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
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel
} from '@mui/material';
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
  VisibilityOff,
  CheckCircle,
  Cancel,
  Warning,
  Info,
  Print,
  Download,
  Upload
} from '@mui/icons-material';
import { ROLES, ACTIONS, RESOURCES } from '../utils/rbac';
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
  const [loading, setLoading] = useState(false);
  
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
  const [userDialog, setUserDialog] = useState(false);
  const [testDialog, setTestDialog] = useState(false);
  const [aclDialog, setAclDialog] = useState(false);
  const [newRoleDialog, setNewRoleDialog] = useState(false);
  
  // Form states
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [testUserId, setTestUserId] = useState('');
  const [testAction, setTestAction] = useState('');
  const [testResource, setTestResource] = useState('');
  
  // New role form
  const [newRole, setNewRole] = useState({
    name: '',
    label: '',
    description: '',
    level: 1,
    permissions: {} as Record<string, string[]>
  });
  
  // ACL management
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // System-integrierte Rollen und Permissions verwenden
      setRoles(systemRoles);
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
    } finally {
      setLoading(false);
    }
  };

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
      const response = await api.post('/rbac/test-authorization', {
        userId: testUserId,
        action: testAction,
        resource: testResource
      });
      
      const responseData = (response.data as any).data;
      setSnackbar({ 
        open: true, 
        message: `Autorisierung: ${responseData.allowed ? 'Erlaubt' : 'Verweigert'}`, 
        severity: responseData.allowed ? 'success' : 'error' 
      });
    } catch (error) {
      console.error('Error testing authorization:', error);
      setSnackbar({ open: true, message: 'Fehler beim Testen der Autorisierung', severity: 'error' });
    }
  };

  const handleCreateRole = async () => {
    try {
      // Prüfe ob es sich um eine system-integrierte Rolle handelt
      const isSystemRole = systemRoles.some(role => role.value === newRole.name);
      
      if (isSystemRole) {
        setSnackbar({ 
          open: true, 
          message: 'System-Rollen können nicht geändert werden', 
          severity: 'warning' 
        });
        return;
      }
      
      await api.post('/rbac/roles', newRole);
      setSnackbar({ open: true, message: 'Rolle erfolgreich erstellt', severity: 'success' });
      setNewRoleDialog(false);
      setNewRole({ name: '', label: '', description: '', level: 1, permissions: {} });
      loadData();
    } catch (error) {
      console.error('Error creating role:', error);
      setSnackbar({ open: true, message: 'Fehler beim Erstellen der Rolle', severity: 'error' });
    }
  };

  const handleUpdateRole = async (roleId: string, updates: any) => {
    try {
      await api.put(`/rbac/roles/${roleId}`, updates);
      setSnackbar({ open: true, message: 'Rolle erfolgreich aktualisiert', severity: 'success' });
      loadData();
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

  const handleUpdateACL = async (resourceId: string, aclData: any) => {
    try {
      await api.put(`/rbac/resources/${resourceId}/acl`, aclData);
      setSnackbar({ open: true, message: 'ACL erfolgreich aktualisiert', severity: 'success' });
      setAclDialog(false);
      loadData();
    } catch (error) {
      console.error('Error updating ACL:', error);
      setSnackbar({ open: true, message: 'Fehler beim Aktualisieren der ACL', severity: 'error' });
    }
  };

  const handleExportAuditLogs = async () => {
    try {
      const response = await api.get('/rbac/audit-logs/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSnackbar({ open: true, message: 'Audit-Logs erfolgreich exportiert', severity: 'success' });
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      setSnackbar({ open: true, message: 'Fehler beim Exportieren der Audit-Logs', severity: 'error' });
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
      <Typography variant="h4" gutterBottom>
        <Security sx={{ mr: 2, verticalAlign: 'middle' }} />
        RBAC Management
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
        Rollen, Berechtigungen und Zugriffskontrolle verwalten
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Rollen" icon={<Group />} />
            <Tab label="Berechtigungen" icon={<Key />} />
            <Tab label="Benutzer" icon={<Person />} />
            <Tab label="Audit Logs" icon={<Security />} />
            <Tab label="Test" icon={<Shield />} />
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
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
            {roles.map((role) => (
              <Box key={role.value}>
                <Card>
                  <CardContent>
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
                      </Box>
                      <Box>
                        {!systemRoles.some(sr => sr.value === role.value) && (
                          <>
                            <Tooltip title="Rolle bearbeiten">
                              <IconButton 
                                size="small" 
                                onClick={() => {
                                  setSelectedRole(role);
                                  setNewRole(role);
                                  setNewRoleDialog(true);
                                }}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
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
                          </>
                        )}
                        {systemRoles.some(sr => sr.value === role.value) && (
                          <Tooltip title="System-Rolle (nicht bearbeitbar)">
                            <span>
                              <IconButton size="small" disabled>
                                <Security />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {role.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Level: {role.level} | Permissions: {Object.keys(role.permissions).length}
                    </Typography>
                    
                    {/* Permissions für diese Rolle anzeigen */}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Berechtigungen:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {Object.entries(role.permissions || {}).map(([resource, actions]) => (
                          <Chip
                            key={resource}
                            label={`${resource}: ${(actions as string[]).join(', ')}`}
                            size="small"
                            variant="outlined"
                          />
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
                Actions
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Action</TableCell>
                      <TableCell>Label</TableCell>
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
                      <TableCell>Label</TableCell>
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
                        <Tooltip title="ACL verwalten">
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setSelectedUser(user);
                              setAclDialog(true);
                            }}
                          >
                            <Security />
                          </IconButton>
                        </Tooltip>
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
                      <InputLabel>Action</InputLabel>
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
                    Ihre aktuellen Berechtigungen basierend auf Ihrer Rolle: {user?.role}
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
        <DialogTitle>{selectedRole ? 'Rolle bearbeiten' : 'Neue Rolle erstellen'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Rollen-Name"
              value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Anzeige-Name"
              value={newRole.label}
              onChange={(e) => setNewRole({ ...newRole, label: e.target.value })}
              fullWidth
            />
            <TextField
              label="Beschreibung"
              value={newRole.description}
              onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Level</InputLabel>
              <Select
                value={newRole.level}
                onChange={(e) => setNewRole({ ...newRole, level: Number(e.target.value) })}
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
            
            <Typography variant="h6" gutterBottom>Custom Permissions</Typography>
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
        <DialogTitle>ACL verwalten</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ressource: {selectedResource?.name || 'Unbekannt'}
            </Typography>
            
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
              if (selectedResource) {
                handleUpdateACL(selectedResource._id, aclSettings);
              }
            }}
            variant="contained"
          >
            Speichern
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
