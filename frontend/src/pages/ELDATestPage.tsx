import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Chip,
  Divider,
  Stack,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Build as BuildIcon,
  CloudUpload as CloudUploadIcon,
  Settings as SettingsIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import GradientDialogTitle from '../components/GradientDialogTitle';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

interface ELDAStatus {
  configured: boolean;
  environment: string;
  defaultMethod: string;
  availableMethods: string[];
  ftps: {
    enabled: boolean;
    host: string;
    port: number;
    hasCredentials: boolean;
    hasCertificates: boolean;
  };
  webservice: {
    enabled: boolean;
    baseUrl: string;
    hasApiKey: boolean;
    activationDate?: string;
  };
  errors: string[];
}

interface ELDAMethod {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  host?: string;
  port?: number;
  baseUrl?: string;
  activationDate?: string;
}

const ELDATestPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [eldaStatus, setEldaStatus] = useState<ELDAStatus | null>(null);
  const [availableMethods, setAvailableMethods] = useState<ELDAMethod[]>([]);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  const [testResults, setTestResults] = useState<{
    connection?: { success: boolean; message: string; method?: string; details?: any };
    send?: { success: boolean; message: string; details?: any };
  }>({});

  // Connection Test State
  const [connectionTest, setConnectionTest] = useState({
    method: '' as 'ftps' | 'webservice' | 'auto' | '',
  });

  // Send Test State
  const [sendTestData, setSendTestData] = useState({
    datasetType: 'KSB', // KSB = Krankenstandsbescheinigung
    method: '' as 'ftps' | 'webservice' | 'auto' | '',
    payload: JSON.stringify({
      patient: {
        socialSecurityNumber: '1234567890',
        firstName: 'Max',
        lastName: 'Mustermann',
        dateOfBirth: '1980-01-01',
      },
      doctor: {
        taxNumber: 'ATU12345678',
        chamberNumber: '12345',
        name: 'Dr. Test Arzt',
      },
      service: {
        code: '111',
        description: 'Test-Leistung',
        date: new Date().toISOString().split('T')[0],
        amount: 35.00,
      },
    }, null, 2),
  });

  useEffect(() => {
    loadELDAStatus();
    loadAvailableMethods();
  }, []);

  const loadELDAStatus = async () => {
    try {
      const response = await api.get<{ success: boolean; data: ELDAStatus }>('/elda/status');
      if (response.data.success) {
        setEldaStatus(response.data.data);
      }
    } catch (error: any) {
      console.error('Fehler beim Laden des ELDA-Status:', error);
      enqueueSnackbar('Fehler beim Laden des ELDA-Status', { variant: 'error' });
    }
  };

  const loadAvailableMethods = async () => {
    try {
      const response = await api.get<{ success: boolean; data: { methods: ELDAMethod[]; defaultMethod: string } }>('/elda/methods');
      if (response.data.success) {
        const methods = response.data.data.methods || [];
        setAvailableMethods(methods);
        // Nur method setzen, wenn verfügbare Methoden existieren
        if (methods.length > 0) {
          const defaultMethod = response.data.data.defaultMethod || methods[0].id;
          setConnectionTest(prev => ({
            ...prev,
            method: (defaultMethod as 'ftps' | 'webservice' | 'auto') || 'auto',
          }));
          setSendTestData(prev => ({
            ...prev,
            method: (defaultMethod as 'ftps' | 'webservice' | 'auto') || 'auto',
          }));
        } else {
          // Fallback: Setze auf leeren String wenn keine Methoden verfügbar
          setConnectionTest(prev => ({
            ...prev,
            method: '' as any,
          }));
          setSendTestData(prev => ({
            ...prev,
            method: '' as any,
          }));
        }
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der verfügbaren Methoden:', error);
      // Fallback: Setze leere Methoden-Liste
      setAvailableMethods([]);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setTestResults(prev => ({ ...prev, connection: undefined }));

    try {
      const response = await api.post<{ success: boolean; data: any }>('/elda/test-connection', {
        method: connectionTest.method,
      });

      if (response.data.success) {
        setTestResults(prev => ({
          ...prev,
          connection: {
            success: true,
            message: response.data.data.message || 'Verbindung erfolgreich',
            method: response.data.data.method,
            details: response.data.data,
          },
        }));
        enqueueSnackbar('Verbindungstest erfolgreich', { variant: 'success' });
      } else {
        throw new Error(response.data.data?.error || 'Verbindungstest fehlgeschlagen');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Verbindungstest fehlgeschlagen';
      setTestResults(prev => ({
        ...prev,
        connection: {
          success: false,
          message: errorMessage,
          method: connectionTest.method,
        },
      }));
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    setLoading(true);
    setTestResults(prev => ({ ...prev, send: undefined }));

    try {
      let payload;
      try {
        payload = JSON.parse(sendTestData.payload);
      } catch (parseError) {
        throw new Error('Ungültiges JSON-Format im Payload');
      }

      const response = await api.post<{ success: boolean; message: string; data: any }>('/elda/send', {
        payload,
        datasetType: sendTestData.datasetType,
        method: sendTestData.method === 'auto' ? undefined : sendTestData.method,
      });

      if (response.data.success) {
        setTestResults(prev => ({
          ...prev,
          send: {
            success: true,
            message: response.data.message || 'Daten erfolgreich übertragen',
            details: response.data.data,
          },
        }));
        enqueueSnackbar('Daten erfolgreich an ELDA übertragen', { variant: 'success' });
      } else {
        throw new Error(response.data.message || 'Übertragung fehlgeschlagen');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Übertragung fehlgeschlagen';
      setTestResults(prev => ({
        ...prev,
        send: {
          success: false,
          message: errorMessage,
        },
      }));
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <BuildIcon sx={{ fontSize: 32 }} />
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">ELDA Teststrecke</Typography>
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
      </Box>

      {/* Status-Card */}
      {eldaStatus && (
        <Card sx={{ mb: 3, p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">ELDA-Status</Typography>
            <Chip
              label={eldaStatus.configured ? 'Konfiguriert' : 'Nicht konfiguriert'}
              color={eldaStatus.configured ? 'success' : 'error'}
              size="small"
            />
            <Chip
              label={`Umgebung: ${eldaStatus.environment}`}
              color="default"
              size="small"
            />
            <Chip
              label={`Standard: ${eldaStatus.defaultMethod.toUpperCase()}`}
              color="primary"
              size="small"
            />
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={loadELDAStatus}
              disabled={loading}
            >
              Aktualisieren
            </Button>
          </Stack>

          {eldaStatus.errors.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Konfigurationsfehler:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {eldaStatus.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  FTPS
                </Typography>
                <Stack spacing={1}>
                  <Chip
                    label={eldaStatus.ftps.enabled ? 'Aktiviert' : 'Deaktiviert'}
                    color={eldaStatus.ftps.enabled ? 'success' : 'default'}
                    size="small"
                  />
                  <Typography variant="body2">
                    Host: {eldaStatus.ftps.host}:{eldaStatus.ftps.port}
                  </Typography>
                  <Typography variant="body2">
                    Credentials: {eldaStatus.ftps.hasCredentials ? '✓' : '✗'}
                  </Typography>
                  <Typography variant="body2">
                    Zertifikate: {eldaStatus.ftps.hasCertificates ? '✓' : '✗'}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Webservice
                </Typography>
                <Stack spacing={1}>
                  <Chip
                    label={eldaStatus.webservice.enabled ? 'Aktiviert' : 'Deaktiviert'}
                    color={eldaStatus.webservice.enabled ? 'success' : 'default'}
                    size="small"
                  />
                  <Typography variant="body2">
                    URL: {eldaStatus.webservice.baseUrl}
                  </Typography>
                  <Typography variant="body2">
                    API-Key: {eldaStatus.webservice.hasApiKey ? '✓' : '✗'}
                  </Typography>
                  {eldaStatus.webservice.activationDate && (
                    <Typography variant="body2">
                      Aktivierung: {new Date(eldaStatus.webservice.activationDate).toLocaleDateString('de-DE')}
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Tabs */}
      <Paper>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Verbindungstest" icon={<SettingsIcon />} iconPosition="start" />
          <Tab label="Daten senden" icon={<SendIcon />} iconPosition="start" />
        </Tabs>

        {/* Tab 1: Verbindungstest */}
        <TabPanel value={tabValue} index={0}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              ELDA-Verbindung testen
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Übertragungsmethode</InputLabel>
              <Select
                value={availableMethods.length > 0 ? connectionTest.method : ''}
                label="Übertragungsmethode"
                onChange={(e) => setConnectionTest(prev => ({ ...prev, method: e.target.value as 'ftps' | 'webservice' | 'auto' }))}
                disabled={availableMethods.length === 0}
              >
                {availableMethods.length === 0 ? (
                  <MenuItem value="" disabled>
                    Keine Methoden verfügbar
                  </MenuItem>
                ) : (
                  [
                    <MenuItem key="auto" value="auto">Automatisch</MenuItem>,
                    ...availableMethods.map((method) => (
                      <MenuItem key={method.id} value={method.id} disabled={!method.enabled}>
                        {method.name} {!method.enabled && '(nicht verfügbar)'}
                      </MenuItem>
                    ))
                  ]
                )}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              onClick={handleTestConnection}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              Verbindung testen
            </Button>

            {testResults.connection && (
              <Alert
                severity={testResults.connection.success ? 'success' : 'error'}
                sx={{ mt: 2 }}
              >
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {testResults.connection.success ? (
                    <CheckCircleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  ) : (
                    <ErrorIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  )}
                  {testResults.connection.message}
                </Typography>
                {testResults.connection.method && (
                  <Typography variant="body2">
                    Methode: {testResults.connection.method.toUpperCase()}
                  </Typography>
                )}
                {testResults.connection.details && (
                  <Box sx={{ mt: 1 }}>
                    <pre style={{ fontSize: '0.875rem', margin: 0 }}>
                      {JSON.stringify(testResults.connection.details, null, 2)}
                    </pre>
                  </Box>
                )}
              </Alert>
            )}
          </Card>
        </TabPanel>

        {/* Tab 2: Daten senden */}
        <TabPanel value={tabValue} index={1}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Daten an ELDA senden
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Datensatztyp</InputLabel>
                  <Select
                    value={sendTestData.datasetType}
                    label="Datensatztyp"
                    onChange={(e) => setSendTestData({ ...sendTestData, datasetType: e.target.value })}
                  >
                    <MenuItem value="KSB">KSB - Krankenstandsbescheinigung</MenuItem>
                    <MenuItem value="Lohnmeldung">Lohnmeldung</MenuItem>
                    <MenuItem value="Abrechnung">Abrechnung</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Übertragungsmethode</InputLabel>
                  <Select
                    value={availableMethods.length > 0 ? sendTestData.method : ''}
                    label="Übertragungsmethode"
                    onChange={(e) => setSendTestData({ ...sendTestData, method: e.target.value as 'ftps' | 'webservice' | 'auto' })}
                    disabled={availableMethods.length === 0}
                  >
                    {availableMethods.length === 0 ? (
                      <MenuItem value="" disabled>
                        Keine Methoden verfügbar
                      </MenuItem>
                    ) : (
                      [
                        <MenuItem key="auto" value="auto">Automatisch</MenuItem>,
                        ...availableMethods.map((method) => (
                          <MenuItem key={method.id} value={method.id} disabled={!method.enabled}>
                            {method.name} {!method.enabled && '(nicht verfügbar)'}
                          </MenuItem>
                        ))
                      ]
                    )}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              fullWidth
              multiline
              rows={15}
              label="Payload (JSON)"
              value={sendTestData.payload}
              onChange={(e) => setSendTestData({ ...sendTestData, payload: e.target.value })}
              sx={{ mb: 2 }}
              helperText="JSON-Format für ELDA-Datensatz"
            />

            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              onClick={handleSendTest}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              Daten senden
            </Button>

            {testResults.send && (
              <Alert
                severity={testResults.send.success ? 'success' : 'error'}
                sx={{ mt: 2 }}
              >
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {testResults.send.success ? (
                    <CheckCircleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  ) : (
                    <ErrorIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  )}
                  {testResults.send.message}
                </Typography>
                {testResults.send.details && (
                  <Box sx={{ mt: 1 }}>
                    <pre style={{ fontSize: '0.875rem', margin: 0 }}>
                      {JSON.stringify(testResults.send.details, null, 2)}
                    </pre>
                  </Box>
                )}
              </Alert>
            )}
          </Card>
        </TabPanel>
      </Paper>

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
          title="Hilfe & Leitfaden: ELDA Test"
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
            <Tab label="Verbindungstest" />
            <Tab label="Sendetest" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  ELDA Test
                </Typography>
                <Typography variant="body1" paragraph>
                  Diese Seite ermöglicht es, die ELDA-Integration zu testen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>🔌 <strong>Verbindungstest:</strong> ELDA-Verbindung testen</li>
                  <li>📤 <strong>Sendetest:</strong> Daten an ELDA senden</li>
                  <li>📋 <strong>Status:</strong> ELDA-Status prüfen</li>
                  <li>⚙️ <strong>Konfiguration:</strong> ELDA-Einstellungen prüfen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Verbindungstest
                </Typography>
                <Typography variant="body2" paragraph>
                  So führen Sie einen Verbindungstest durch:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Übertragungsmethode wählen (FTPS/Webservice/Auto)</li>
                  <li>Auf "Verbindung testen" klicken</li>
                  <li>Ergebnisse prüfen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Sendetest
                </Typography>
                <Typography variant="body2" paragraph>
                  So führen Sie einen Sendetest durch:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Datensatztyp wählen</li>
                  <li>Übertragungsmethode wählen</li>
                  <li>Payload anpassen (optional)</li>
                  <li>Auf "Test senden" klicken</li>
                  <li>Ergebnisse prüfen</li>
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
                  ELDA Test
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Testen Sie zuerst die Verbindung</li>
                  <li>✅ Prüfen Sie die Konfiguration</li>
                  <li>✅ Dokumentieren Sie Ergebnisse</li>
                  <li>✅ Testen Sie verschiedene Methoden</li>
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

export default ELDATestPage;

