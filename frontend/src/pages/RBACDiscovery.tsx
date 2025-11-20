import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Switch,
  FormControlLabel,
  Badge
} from '@mui/material';
import {
  Refresh,
  PlayArrow,
  Stop,
  Visibility,
  Sync,
  Security,
  Extension,
  CheckCircle,
  Warning,
  Error,
  Info
} from '@mui/icons-material';
import api from '../utils/api';

interface Module {
  _id: string;
  moduleName: string;
  displayName: string;
  description: string;
  version: string;
  resources: Array<{
    name: string;
    displayName: string;
    description: string;
    actions: Array<{
      name: string;
      displayName: string;
      description: string;
      isDefault: boolean;
    }>;
    isActive: boolean;
  }>;
  permissions: Array<{
    name: string;
    displayName: string;
    description: string;
    resource: string;
    action: string;
    isSystemPermission: boolean;
  }>;
  isActive: boolean;
  lastUpdated: string;
}

interface DiscoveryStatus {
  isRunning: boolean;
  lastDiscovery: string | null;
  discoveryInterval: number;
}

const RBACDiscovery: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [status, setStatus] = useState<DiscoveryStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statusRes, modulesRes] = await Promise.all([
        api.get('/rbac/discovery/status'),
        api.get('/rbac/discovery/modules')
      ]);
      
      setStatus((statusRes.data as any).service);
      setModules((modulesRes.data as any) as Module[]);
    } catch (error: any) {
      console.error('Fehler beim Laden der Discovery-Daten:', error);
      setError('Fehler beim Laden der Discovery-Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerDiscovery = async () => {
    try {
      setLoading(true);
      await api.post('/rbac/discovery/trigger');
      await loadData();
    } catch (error: any) {
      console.error('Fehler beim Auslösen des Discovery:', error);
      setError('Fehler beim Auslösen des Discovery');
    } finally {
      setLoading(false);
    }
  };

  const handleStartService = async () => {
    try {
      setLoading(true);
      await api.post('/rbac/discovery/start');
      await loadData();
    } catch (error: any) {
      console.error('Fehler beim Starten des Services:', error);
      setError('Fehler beim Starten des Services');
    } finally {
      setLoading(false);
    }
  };

  const handleStopService = async () => {
    try {
      setLoading(true);
      await api.post('/rbac/discovery/stop');
      await loadData();
    } catch (error: any) {
      console.error('Fehler beim Stoppen des Services:', error);
      setError('Fehler beim Stoppen des Services');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncModule = async (moduleName: string) => {
    try {
      setLoading(true);
      await api.post(`/rbac/discovery/modules/${moduleName}/sync`);
      await loadData();
    } catch (error: any) {
      console.error('Fehler beim Synchronisieren des Moduls:', error);
      setError('Fehler beim Synchronisieren des Moduls');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (module: Module) => {
    setSelectedModule(module);
    setDetailsOpen(true);
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <CheckCircle color="success" /> : <Error color="error" />;
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'error';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE');
  };

  if (loading && modules.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🔍 RBAC Auto-Discovery
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Automatische Erkennung und Integration neuer Module in das RBAC-System
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Service Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Service Status</Typography>
            <Box>
              <Chip
                icon={status?.isRunning ? <PlayArrow /> : <Stop />}
                label={status?.isRunning ? 'Läuft' : 'Gestoppt'}
                color={status?.isRunning ? 'success' : 'error'}
                sx={{ mr: 1 }}
              />
              <IconButton onClick={loadData} disabled={loading}>
                <Refresh />
              </IconButton>
            </Box>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Letzter Discovery: {status?.lastDiscovery ? formatDate(status.lastDiscovery) : 'Nie'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Intervall: {status?.discoveryInterval ? `${status.discoveryInterval / 1000 / 60} Minuten` : 'Unbekannt'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
        <CardActions>
          <Button
            startIcon={<PlayArrow />}
            onClick={handleStartService}
            disabled={loading || status?.isRunning}
            color="success"
          >
            Starten
          </Button>
          <Button
            startIcon={<Stop />}
            onClick={handleStopService}
            disabled={loading || !status?.isRunning}
            color="error"
          >
            Stoppen
          </Button>
          <Button
            startIcon={<Refresh />}
            onClick={handleTriggerDiscovery}
            disabled={loading}
            color="primary"
          >
            Jetzt scannen
          </Button>
        </CardActions>
      </Card>

      {/* Module Overview */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Entdeckte Module ({modules.length})
            </Typography>
            <Button
              startIcon={<Refresh />}
              onClick={loadData}
              disabled={loading}
            >
              Aktualisieren
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Modul</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Ressourcen</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell>Letzte Aktualisierung</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(modules) ? modules.map((module) => (
                  <TableRow key={module._id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {module.displayName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {module.moduleName} v{module.version}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(module.isActive)}
                        label={module.isActive ? 'Aktiv' : 'Inaktiv'}
                        color={getStatusColor(module.isActive)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge badgeContent={module.resources.length} color="primary">
                        <Extension />
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge badgeContent={module.permissions.length} color="secondary">
                        <Security />
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(module.lastUpdated)}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Details anzeigen">
                        <IconButton
                          onClick={() => handleViewDetails(module)}
                          size="small"
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Synchronisieren">
                        <IconButton
                          onClick={() => handleSyncModule(module.moduleName)}
                          size="small"
                          disabled={loading}
                        >
                          <Sync />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Module Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Modul Details: {selectedModule?.displayName}
        </DialogTitle>
        <DialogContent>
          {selectedModule && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedModule.description}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Ressourcen ({selectedModule.resources.length})
              </Typography>
              <List dense>
                {selectedModule.resources.map((resource, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Extension />
                    </ListItemIcon>
                    <ListItemText
                      primary={resource.displayName}
                      secondary={`${resource.actions.length} Aktionen: ${resource.actions.map(a => a.displayName).join(', ')}`}
                    />
                  </ListItem>
                ))}
              </List>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Permissions ({selectedModule.permissions.length})
              </Typography>
              <List dense>
                {selectedModule.permissions.map((permission, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Security />
                    </ListItemIcon>
                    <ListItemText
                      primary={permission.displayName}
                      secondary={`${permission.resource}.${permission.action}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RBACDiscovery;
