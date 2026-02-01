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
  Badge,
  Tabs,
  Tab
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
  Error,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';
import api from '../utils/api';
import GradientDialogTitle from '../components/GradientDialogTitle';

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
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          🔍 RBAC Auto-Discovery
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
          title="Hilfe & Leitfaden: RBAC Discovery"
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
            <Tab label="Discovery-Prozess" />
            <Tab label="Module & Berechtigungen" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  RBAC Discovery
                </Typography>
                <Typography variant="body1" paragraph>
                  RBAC Discovery ermöglicht es, automatisch Module und Berechtigungen zu erkennen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>🔍 <strong>Discovery:</strong> Module automatisch erkennen</li>
                  <li>📋 <strong>Berechtigungen:</strong> Berechtigungen auflisten</li>
                  <li>🔄 <strong>Synchronisation:</strong> Mit Backend synchronisieren</li>
                  <li>📊 <strong>Status:</strong> Discovery-Status anzeigen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Discovery-Prozess
                </Typography>
                <Typography variant="body2" paragraph>
                  So funktioniert der Discovery-Prozess:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Discovery-Service starten</li>
                  <li>Module scannen</li>
                  <li>Berechtigungen extrahieren</li>
                  <li>Ergebnisse anzeigen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Module & Berechtigungen
                </Typography>
                <Typography variant="body2" paragraph>
                  So verwalten Sie Module und Berechtigungen:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Funktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📦 <strong>Module:</strong> Module anzeigen</li>
                  <li>🔐 <strong>Berechtigungen:</strong> Berechtigungen auflisten</li>
                  <li>🔄 <strong>Synchronisieren:</strong> Mit Backend synchronisieren</li>
                  <li>📊 <strong>Status:</strong> Module-Status prüfen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  RBAC Discovery
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Führen Sie Discovery regelmäßig durch</li>
                  <li>✅ Prüfen Sie erkannte Module</li>
                  <li>✅ Synchronisieren Sie mit Backend</li>
                  <li>✅ Dokumentieren Sie Änderungen</li>
                </Box>
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
    </Box>
  );
};

export default RBACDiscovery;
