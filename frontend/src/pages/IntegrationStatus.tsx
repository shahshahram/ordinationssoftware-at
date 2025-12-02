// Integrations-Status-Übersicht
// Zeigt den Status aller Schnittstellen auf einen Blick

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  LinearProgress,
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
  Switch,
  FormControlLabel,
  Tabs,
  Tab
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Refresh,
  LocalHospital,
  CreditCard,
  AccountBalance,
  CloudUpload,
  Receipt,
  Settings,
  Edit,
  Save,
  Cancel
} from '@mui/icons-material';
import api from '../utils/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface IntegrationStatus {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'inactive' | 'error' | 'warning' | 'unknown';
  lastCheck?: Date;
  details?: any;
  endpoint: string;
  configEndpoint?: string;
}

interface IntegrationConfig {
  [key: string]: any;
}

const IntegrationStatus: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationStatus | null>(null);
  const [config, setConfig] = useState<IntegrationConfig>({});
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configTab, setConfigTab] = useState(0);

  useEffect(() => {
    loadAllStatuses();
  }, []);

  const loadAllStatuses = async () => {
    setLoading(true);
    try {
      const statusPromises = [
        loadOGKStatus(),
        loadELGAStatus(),
        loadGINAStatus(),
        loadGinaBoxStatus(),
        loadKDokStatus(),
        loadECardStatus(),
        loadAutoReimbursementStatus()
      ];

      const results = await Promise.allSettled(statusPromises);
      
      const integrationList: IntegrationStatus[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          integrationList.push(result.value);
        } else {
          // Fallback für fehlgeschlagene Status-Checks
          const fallbackNames = [
            'ÖGK-Abrechnung',
            'ELGA',
            'GINA',
            'GINA-Box',
            'KDok',
            'e-card System',
            'Automatische Erstattung'
          ];
          integrationList.push({
            id: `integration-${index}`,
            name: fallbackNames[index] || 'Unbekannt',
            description: 'Status konnte nicht geladen werden',
            icon: <Settings />,
            status: 'unknown',
            endpoint: ''
          });
        }
      });

      setIntegrations(integrationList);
    } catch (error) {
      console.error('Fehler beim Laden der Integrations-Status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOGKStatus = async (): Promise<IntegrationStatus | null> => {
    try {
      const response: any = await api.get('/ogk-billing/auto-submit/status');
      if (response.data?.success) {
        const data = response.data.data;
        return {
          id: 'ogk',
          name: 'ÖGK-Abrechnung',
          description: 'Österreichische Gesundheitskasse - Automatische Abrechnung',
          icon: <AccountBalance />,
          status: data.isRunning ? 'active' : 'inactive',
          lastCheck: new Date(),
          details: {
            isRunning: data.isRunning,
            lastRun: data.lastRun,
            nextRun: data.nextRun,
            totalSubmissions: data.totalSubmissions
          },
          endpoint: '/api/ogk-billing/auto-submit/status',
          configEndpoint: '/api/ogk-billing/config'
        };
      }
    } catch (error) {
      console.error('ÖGK Status-Fehler:', error);
    }
    return {
      id: 'ogk',
      name: 'ÖGK-Abrechnung',
      description: 'Österreichische Gesundheitskasse - Automatische Abrechnung',
      icon: <AccountBalance />,
      status: 'error',
      endpoint: '/api/ogk-billing/auto-submit/status',
      configEndpoint: '/api/ogk-billing/config'
    };
  };

  const loadELGAStatus = async (): Promise<IntegrationStatus | null> => {
    try {
      const response: any = await api.get('/elga/status');
      if (response.data?.success) {
        const data = response.data.data;
        return {
          id: 'elga',
          name: 'ELGA',
          description: 'Elektronische Gesundheitsakte',
          icon: <LocalHospital />,
          status: data.configured && data.hasCertificates ? 'active' : 'warning',
          lastCheck: new Date(),
          details: {
            configured: data.configured,
            environment: data.environment,
            hasCertificates: data.hasCertificates,
            errors: data.errors
          },
          endpoint: '/api/elga/status',
          configEndpoint: '/api/elga/config'
        };
      }
    } catch (error) {
      console.error('ELGA Status-Fehler:', error);
    }
    return {
      id: 'elga',
      name: 'ELGA',
      description: 'Elektronische Gesundheitsakte',
      icon: <LocalHospital />,
      status: 'error',
      endpoint: '/api/elga/status',
      configEndpoint: '/api/elga/config'
    };
  };

  const loadGINAStatus = async (): Promise<IntegrationStatus | null> => {
    try {
      const response: any = await api.get('/gina/status');
      if (response.data?.success) {
        const data = response.data.data;
        return {
          id: 'gina',
          name: 'GINA',
          description: 'Gesundheits-Informations-Netz-Adapter',
          icon: <CloudUpload />,
          status: data.configured && data.hasCertificates ? 'active' : 'warning',
          lastCheck: new Date(),
          details: {
            configured: data.configured,
            environment: data.environment,
            hasCertificates: data.hasCertificates,
            ginaStatus: data.ginaStatus
          },
          endpoint: '/api/gina/status',
          configEndpoint: '/api/gina/config'
        };
      }
    } catch (error) {
      console.error('GINA Status-Fehler:', error);
    }
    return {
      id: 'gina',
      name: 'GINA',
      description: 'Gesundheits-Informations-Netz-Adapter',
      icon: <CloudUpload />,
      status: 'error',
      endpoint: '/api/gina/status',
      configEndpoint: '/api/gina/config'
    };
  };

  const loadGinaBoxStatus = async (): Promise<IntegrationStatus | null> => {
    try {
      const response: any = await api.get('/gina-box/status');
      if (response.data?.success) {
        const data = response.data.data;
        return {
          id: 'gina-box',
          name: 'GINA-Box',
          description: 'Hardware-Integration für e-card-Leser',
          icon: <CreditCard />,
          status: data.connected ? 'active' : 'inactive',
          lastCheck: new Date(),
          details: {
            connected: data.connected,
            type: data.type,
            version: data.version
          },
          endpoint: '/api/gina-box/status',
          configEndpoint: '/api/gina-box/config'
        };
      }
    } catch (error) {
      console.error('GINA-Box Status-Fehler:', error);
    }
    return {
      id: 'gina-box',
      name: 'GINA-Box',
      description: 'Hardware-Integration für e-card-Leser',
      icon: <CreditCard />,
      status: 'inactive',
      endpoint: '/api/gina-box/status',
      configEndpoint: '/api/gina-box/config'
    };
  };

  const loadKDokStatus = async (): Promise<IntegrationStatus | null> => {
    try {
      const response: any = await api.get('/kdok/status');
      if (response.data?.success) {
        const data = response.data.data;
        return {
          id: 'kdok',
          name: 'KDok',
          description: 'Kassen-Dokumentationssystem',
          icon: <Receipt />,
          status: data.success ? 'active' : 'error',
          lastCheck: new Date(),
          details: {
            connected: data.success,
            message: data.message,
            version: data.version
          },
          endpoint: '/api/kdok/status',
          configEndpoint: '/api/kdok/config'
        };
      }
    } catch (error) {
      console.error('KDok Status-Fehler:', error);
    }
    return {
      id: 'kdok',
      name: 'KDok',
      description: 'Kassen-Dokumentationssystem',
      icon: <Receipt />,
      status: 'error',
      endpoint: '/api/kdok/status',
      configEndpoint: '/api/kdok/config'
    };
  };

  const loadECardStatus = async (): Promise<IntegrationStatus | null> => {
    try {
      const response: any = await api.get('/ecard/status');
      if (response.data?.success) {
        const data = response.data.data;
        return {
          id: 'ecard',
          name: 'e-card System',
          description: 'Elektronische Gesundheitskarte',
          icon: <CreditCard />,
          status: data.elgaAvailable ? 'active' : 'warning',
          lastCheck: new Date(),
          details: {
            elgaAvailable: data.elgaAvailable,
            fallbackEnabled: data.fallbackEnabled,
            timeout: data.timeout
          },
          endpoint: '/api/ecard/status',
          configEndpoint: '/api/ecard/config'
        };
      }
    } catch (error) {
      console.error('e-card Status-Fehler:', error);
    }
    return {
      id: 'ecard',
      name: 'e-card System',
      description: 'Elektronische Gesundheitskarte',
      icon: <CreditCard />,
      status: 'error',
      endpoint: '/api/ecard/status',
      configEndpoint: '/api/ecard/config'
    };
  };

  const loadAutoReimbursementStatus = async (): Promise<IntegrationStatus | null> => {
    try {
      const response: any = await api.get('/auto-reimbursement/status');
      if (response.data?.success) {
        const data = response.data.data;
        return {
          id: 'auto-reimbursement',
          name: 'Automatische Erstattung',
          description: 'Automatische Verarbeitung von Erstattungsanträgen',
          icon: <Receipt />,
          status: data.isRunning ? 'active' : 'inactive',
          lastCheck: new Date(),
          details: {
            isRunning: data.isRunning,
            lastRun: data.lastRun,
            nextRun: data.nextRun,
            processedCount: data.processedCount
          },
          endpoint: '/api/auto-reimbursement/status',
          configEndpoint: '/api/auto-reimbursement/config'
        };
      }
    } catch (error) {
      console.error('Auto-Reimbursement Status-Fehler:', error);
    }
    return {
      id: 'auto-reimbursement',
      name: 'Automatische Erstattung',
      description: 'Automatische Verarbeitung von Erstattungsanträgen',
      icon: <Receipt />,
      status: 'inactive',
      endpoint: '/api/auto-reimbursement/status',
      configEndpoint: '/api/auto-reimbursement/config'
    };
  };

  const handleRefresh = async (integrationId: string) => {
    setRefreshing(integrationId);
    try {
      await loadAllStatuses();
    } finally {
      setRefreshing(null);
    }
  };

  const handleOpenConfig = async (integration: IntegrationStatus) => {
    setSelectedIntegration(integration);
    setConfigDialogOpen(true);
    setConfigLoading(true);
    setConfigTab(0);
    
    try {
      // Lade Konfiguration (falls Endpunkt vorhanden)
      if (integration.configEndpoint) {
        const response: any = await api.get(integration.configEndpoint);
        if (response.data?.success) {
          // Transformiere die Daten je nach Integration
          const configData = response.data.data || {};
          
          // Spezielle Transformationen für verschiedene Integrationen
          if (integration.id === 'elga') {
            setConfig({
              environment: configData.environment,
              testApiUrl: configData.testApiUrl,
              prodApiUrl: configData.prodApiUrl,
              ecard: configData.ecard || {},
              billing: configData.billing || {},
              logging: configData.logging || {}
            });
          } else {
            setConfig(configData);
          }
        } else {
          setConfig({});
        }
      } else {
        // Fallback: Leere Konfiguration
        setConfig({});
      }
    } catch (error) {
      console.error('Fehler beim Laden der Konfiguration:', error);
      setConfig({});
    } finally {
      setConfigLoading(false);
    }
  };

  const handleCloseConfig = () => {
    setConfigDialogOpen(false);
    setSelectedIntegration(null);
    setConfig({});
    setConfigTab(0);
  };

  const handleSaveConfig = async () => {
    if (!selectedIntegration || !selectedIntegration.configEndpoint) return;
    
    setConfigSaving(true);
    try {
      const response: any = await api.put(selectedIntegration.configEndpoint, config);
      if (response.data?.success) {
        // Erfolgreich gespeichert
        handleCloseConfig();
        // Status neu laden
        await loadAllStatuses();
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Konfiguration:', error);
      alert('Fehler beim Speichern der Konfiguration');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleConfigChange = (key: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle />;
      case 'error':
        return <Error />;
      case 'warning':
        return <Warning />;
      default:
        return <Settings />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktiv';
      case 'inactive':
        return 'Inaktiv';
      case 'error':
        return 'Fehler';
      case 'warning':
        return 'Warnung';
      default:
        return 'Unbekannt';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  const activeCount = integrations.filter(i => i.status === 'active').length;
  const totalCount = integrations.length;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Integrations-Status
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Übersicht aller Schnittstellen und deren Status
          </Typography>
        </Box>
        <Tooltip title="Alle Status aktualisieren">
          <IconButton onClick={loadAllStatuses} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Zusammenfassung */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Gesamt
              </Typography>
              <Typography variant="h4">
                {totalCount}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Aktiv
              </Typography>
              <Typography variant="h4" color="success.main">
                {activeCount}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Status
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(activeCount / totalCount) * 100}
                color="success"
                sx={{ height: 8, borderRadius: 1, mt: 1 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Letzte Aktualisierung
              </Typography>
              <Typography variant="body2">
                {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Integrations-Liste */}
      <Grid container spacing={3}>
        {integrations.map((integration) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={integration.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: `${getStatusColor(integration.status)}.main` }}>
                      {integration.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6">
                        {integration.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {integration.description}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Konfigurieren">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenConfig(integration)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Status aktualisieren">
                      <IconButton
                        size="small"
                        onClick={() => handleRefresh(integration.id)}
                        disabled={refreshing === integration.id}
                      >
                        {refreshing === integration.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Refresh fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      icon={getStatusIcon(integration.status)}
                      label={getStatusText(integration.status)}
                      color={getStatusColor(integration.status) as any}
                      size="small"
                    />
                  </Box>

                  {integration.lastCheck && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Letzte Prüfung
                      </Typography>
                      <Typography variant="caption">
                        {format(integration.lastCheck, 'dd.MM.yyyy HH:mm', { locale: de })}
                      </Typography>
                    </Box>
                  )}

                  {integration.details && (
                    <Box sx={{ mt: 1 }}>
                      {integration.details.errors && integration.details.errors.length > 0 && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {integration.details.errors.map((error: string, index: number) => (
                            <Typography key={index} variant="caption" component="div">
                              {error}
                            </Typography>
                          ))}
                        </Alert>
                      )}
                      {integration.details.lastRun && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                          Letzte Ausführung: {format(new Date(integration.details.lastRun), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </Typography>
                      )}
                      {integration.details.nextRun && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Nächste Ausführung: {format(new Date(integration.details.nextRun), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Konfigurations-Dialog */}
      <Dialog
        open={configDialogOpen}
        onClose={handleCloseConfig}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedIntegration?.name} - Konfiguration
        </DialogTitle>
        <DialogContent>
          {configLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Tabs value={configTab} onChange={(_, newValue) => setConfigTab(newValue)} sx={{ mb: 2 }}>
                <Tab label="Allgemein" />
                <Tab label="API-Einstellungen" />
                <Tab label="Zertifikate" />
                <Tab label="Erweitert" />
              </Tabs>

              {configTab === 0 && (
                <Stack spacing={2}>
                  <Alert severity="info">
                    Konfigurationen werden über Umgebungsvariablen gesteuert. 
                    Bitte bearbeiten Sie die .env-Datei im Backend-Verzeichnis.
                  </Alert>
                  <Typography variant="body2" color="text.secondary">
                    Für detaillierte Konfigurationsanweisungen siehe die Dokumentation.
                  </Typography>
                </Stack>
              )}

              {configTab === 1 && selectedIntegration && (
                <Stack spacing={2}>
                  {selectedIntegration.id === 'elga' && (
                    <>
                      <TextField
                        label="Umgebung"
                        value={config.environment || 'development'}
                        onChange={(e) => handleConfigChange('environment', e.target.value)}
                        select
                        fullWidth
                      >
                        <MenuItem value="development">Development</MenuItem>
                        <MenuItem value="test">Test</MenuItem>
                        <MenuItem value="production">Production</MenuItem>
                      </TextField>
                      <TextField
                        label="API URL (Test)"
                        value={config.testApiUrl || ''}
                        onChange={(e) => handleConfigChange('testApiUrl', e.target.value)}
                        fullWidth
                      />
                      <TextField
                        label="API URL (Production)"
                        value={config.prodApiUrl || ''}
                        onChange={(e) => handleConfigChange('prodApiUrl', e.target.value)}
                        fullWidth
                      />
                      <Divider />
                      <Typography variant="subtitle2" gutterBottom>
                        e-card Validierung
                      </Typography>
                      <TextField
                        label="Timeout (ms)"
                        value={config.ecard?.timeout || 30000}
                        onChange={(e) => handleConfigChange('ecard', { ...config.ecard, timeout: parseInt(e.target.value) })}
                        fullWidth
                        type="number"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.ecard?.enableFallback || false}
                            onChange={(e) => handleConfigChange('ecard', { ...config.ecard, enableFallback: e.target.checked })}
                          />
                        }
                        label="Fallback aktivieren"
                      />
                      <Divider />
                      <Typography variant="subtitle2" gutterBottom>
                        Abrechnungsübermittlung
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.billing?.autoSubmit || false}
                            onChange={(e) => handleConfigChange('billing', { ...config.billing, autoSubmit: e.target.checked })}
                          />
                        }
                        label="Automatische Übermittlung"
                      />
                      <TextField
                        label="Übermittlungszeitpunkt (Cron)"
                        value={config.billing?.submitSchedule || '0 23 * * *'}
                        onChange={(e) => handleConfigChange('billing', { ...config.billing, submitSchedule: e.target.value })}
                        fullWidth
                        helperText="Format: Minute Stunde Tag Monat Wochentag"
                      />
                    </>
                  )}
                  {selectedIntegration.id === 'gina' && (
                    <>
                      <TextField
                        label="Base URL"
                        value={config.baseUrl || ''}
                        onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                        fullWidth
                      />
                      <TextField
                        label="Timeout (ms)"
                        value={config.timeout || 30000}
                        onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                        fullWidth
                        type="number"
                      />
                      <TextField
                        label="Umgebung"
                        value={config.environment || 'development'}
                        onChange={(e) => handleConfigChange('environment', e.target.value)}
                        select
                        fullWidth
                      >
                        <MenuItem value="development">Development</MenuItem>
                        <MenuItem value="test">Test</MenuItem>
                        <MenuItem value="production">Production</MenuItem>
                      </TextField>
                    </>
                  )}
                  {selectedIntegration.id === 'kdok' && (
                    <>
                      <TextField
                        label="Base URL"
                        value={config.baseUrl || ''}
                        onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                        fullWidth
                      />
                      <TextField
                        label="Umgebung"
                        value={config.environment || 'production'}
                        onChange={(e) => handleConfigChange('environment', e.target.value)}
                        select
                        fullWidth
                      >
                        <MenuItem value="development">Development</MenuItem>
                        <MenuItem value="test">Test</MenuItem>
                        <MenuItem value="production">Production</MenuItem>
                      </TextField>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.autoSubmit || false}
                            onChange={(e) => handleConfigChange('autoSubmit', e.target.checked)}
                          />
                        }
                        label="Automatische Übermittlung"
                      />
                      <TextField
                        label="Batch-Größe"
                        value={config.batchSize || 100}
                        onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value))}
                        fullWidth
                        type="number"
                      />
                      <TextField
                        label="Timeout (ms)"
                        value={config.timeout || 30000}
                        onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                        fullWidth
                        type="number"
                      />
                    </>
                  )}
                  {selectedIntegration.id === 'ogk' && (
                    <>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.autoSubmit || false}
                            onChange={(e) => handleConfigChange('autoSubmit', e.target.checked)}
                          />
                        }
                        label="Automatische Übermittlung aktivieren"
                      />
                      <TextField
                        label="Übermittlungszeitpunkt (Cron)"
                        value={config.schedule || '0 23 * * *'}
                        onChange={(e) => handleConfigChange('schedule', e.target.value)}
                        fullWidth
                        helperText="Format: Minute Stunde Tag Monat Wochentag"
                      />
                    </>
                  )}
                  {selectedIntegration.id === 'gina-box' && (
                    <>
                      <TextField
                        label="Base URL"
                        value={config.baseUrl || ''}
                        onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                        fullWidth
                      />
                      <TextField
                        label="Timeout (ms)"
                        value={config.timeout || 30000}
                        onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                        fullWidth
                        type="number"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.autoConnect || false}
                            onChange={(e) => handleConfigChange('autoConnect', e.target.checked)}
                          />
                        }
                        label="Automatische Verbindung"
                      />
                    </>
                  )}
                  {selectedIntegration.id === 'ecard' && (
                    <>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.fallbackEnabled || false}
                            onChange={(e) => handleConfigChange('fallbackEnabled', e.target.checked)}
                          />
                        }
                        label="Fallback aktivieren"
                      />
                      <TextField
                        label="Timeout (ms)"
                        value={config.timeout || 30000}
                        onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                        fullWidth
                        type="number"
                      />
                      <TextField
                        label="Cache-Dauer (ms)"
                        value={config.cacheDuration || 3600000}
                        onChange={(e) => handleConfigChange('cacheDuration', parseInt(e.target.value))}
                        fullWidth
                        type="number"
                        helperText="Standard: 1 Stunde (3600000 ms)"
                      />
                    </>
                  )}
                  {selectedIntegration.id === 'auto-reimbursement' && (
                    <>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={config.enabled || false}
                            onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                          />
                        }
                        label="Automatische Erstattung aktivieren"
                      />
                      <TextField
                        label="Übermittlungszeitpunkt (Cron)"
                        value={config.schedule || '0 2 * * *'}
                        onChange={(e) => handleConfigChange('schedule', e.target.value)}
                        fullWidth
                        helperText="Format: Minute Stunde Tag Monat Wochentag"
                      />
                      <TextField
                        label="Batch-Größe"
                        value={config.batchSize || 50}
                        onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value))}
                        fullWidth
                        type="number"
                      />
                      <TextField
                        label="Wiederholungsversuche"
                        value={config.retryAttempts || 3}
                        onChange={(e) => handleConfigChange('retryAttempts', parseInt(e.target.value))}
                        fullWidth
                        type="number"
                      />
                    </>
                  )}
                </Stack>
              )}

              {configTab === 2 && (
                <Stack spacing={2}>
                  <Alert severity="warning">
                    Zertifikate müssen manuell im Backend-Verzeichnis hinterlegt werden.
                    Pfad: backend/certs/
                  </Alert>
                  <TextField
                    label="Client-Zertifikat Pfad"
                    value={config.certPath || './certs/'}
                    onChange={(e) => handleConfigChange('certPath', e.target.value)}
                    fullWidth
                    disabled
                  />
                </Stack>
              )}

              {configTab === 3 && (
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Erweiterte Einstellungen werden über Umgebungsvariablen konfiguriert.
                  </Typography>
                  <Alert severity="info">
                    Bitte konsultieren Sie die Dokumentation für detaillierte Konfigurationsanweisungen.
                  </Alert>
                </Stack>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfig} startIcon={<Cancel />}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSaveConfig}
            variant="contained"
            startIcon={configSaving ? <CircularProgress size={16} /> : <Save />}
            disabled={configSaving || !selectedIntegration?.configEndpoint}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IntegrationStatus;

