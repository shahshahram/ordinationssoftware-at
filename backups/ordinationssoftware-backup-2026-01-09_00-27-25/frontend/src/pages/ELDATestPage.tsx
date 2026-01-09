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
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Build as BuildIcon,
  CloudUpload as CloudUploadIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSnackbar } from 'notistack';

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
        <Typography variant="h4">ELDA Teststrecke</Typography>
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
    </Box>
  );
};

export default ELDATestPage;

