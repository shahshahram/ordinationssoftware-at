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
  Stack,
  Grid,
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
  Settings as SettingsIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { useAppSelector } from '../store/hooks';
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

interface WAHonlineStatus {
  configured: boolean;
  environment: string;
  api: {
    enabled: boolean;
    baseUrl: string;
    hasApiKey: boolean;
    hasChamberNumber: boolean;
    hasDoctorNumber: boolean;
    hasCertificates: boolean;
  };
  errors: string[];
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  socialSecurityNumber?: string;
  dateOfBirth?: string;
}

interface Performance {
  _id: string;
  serviceCode: string;
  serviceDescription: string;
  totalPrice: number;
  tariffType: string;
  serviceDatetime: string;
}

const WAHonlineTestPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAppSelector((state) => state.auth);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [wahonlineStatus, setWahonlineStatus] = useState<WAHonlineStatus | null>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  const [testResults, setTestResults] = useState<{
    connection?: { success: boolean; message: string; details?: any };
    send?: { success: boolean; message: string; details?: any };
    format?: { success: boolean; message: string; details?: any };
  }>({});

  // Connection Test State
  const [connectionTest, setConnectionTest] = useState({
    environment: 'test',
  });

  // Send Test State
  const [sendTestData, setSendTestData] = useState({
    performanceId: '',
    payload: JSON.stringify({
      performance: {
        serviceCode: '111',
        serviceDescription: 'Ordinationskonsultation',
        serviceDatetime: new Date().toISOString(),
        totalPrice: 35.00,
        tariffType: 'wahl',
      },
      patient: {
        socialSecurityNumber: '1234567890',
        firstName: 'Max',
        lastName: 'Mustermann',
        dateOfBirth: '1980-01-01',
      },
      doctor: {
        profile: {
          chamberNumber: '12345',
          taxNumber: 'ATU12345678',
        },
      },
    }, null, 2),
  });

  // Format Generation State
  const [formatData, setFormatData] = useState({
    performanceId: '',
    data: '',
  });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);

  useEffect(() => {
    fetchWahonlineStatus();
    fetchPatients();
    fetchPerformances();
  }, []);

  const fetchWahonlineStatus = async () => {
    try {
      const response = await api.get<{ success: boolean; data: WAHonlineStatus }>('/wahonline/status');
      if (response.data.success) {
        setWahonlineStatus(response.data.data);
        setConnectionTest(prev => ({ ...prev, environment: response.data.data.environment }));
      } else {
        enqueueSnackbar('Fehler beim Laden des WAHonline-Status', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Fehler beim Laden des WAHonline-Status:', error);
      enqueueSnackbar(error.response?.data?.message || 'Fehler beim Laden des WAHonline-Status', { variant: 'error' });
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Patient[] }>('/patients-extended?limit=100');
      if (response.data.success) {
        setPatients(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchPerformances = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Performance[] }>('/billing/performances?limit=100');
      if (response.data.success) {
        setPerformances(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching performances:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleConnectionTest = async () => {
    setLoading(true);
    setTestResults(prev => ({ ...prev, connection: undefined }));
    try {
      const response = await api.post<{ success: boolean; data: any }>('/wahonline/test-connection', {
        environment: connectionTest.environment,
      });
      if (response.data.success) {
        setTestResults(prev => ({ ...prev, connection: { success: true, message: response.data.data.message, details: response.data.data } }));
        enqueueSnackbar('Verbindungstest erfolgreich', { variant: 'success' });
      } else {
        throw new Error(response.data.data?.error || 'Verbindungstest fehlgeschlagen');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Verbindungstest fehlgeschlagen';
      setTestResults(prev => ({ ...prev, connection: { success: false, message: errorMessage } }));
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendData = async () => {
    setLoading(true);
    setTestResults(prev => ({ ...prev, send: undefined }));
    try {
      let payload;
      if (sendTestData.performanceId) {
        // Verwende performanceId
        const response = await api.post<{ success: boolean; message?: string; data: any }>('/wahonline/send', {
          performanceId: sendTestData.performanceId,
          autoFormat: true,
        });
        if (response.data.success) {
          setTestResults(prev => ({
            ...prev,
            send: {
              success: true,
              message: (response.data as any).message || 'Meldung erfolgreich an WAHonline übermittelt',
              details: response.data.data,
            },
          }));
          enqueueSnackbar('Meldung erfolgreich an WAHonline übermittelt', { variant: 'success' });
        } else {
          throw new Error((response.data as any).message || 'Übertragung fehlgeschlagen');
        }
      } else {
        // Verwende manuelles Payload
        try {
          payload = JSON.parse(sendTestData.payload);
        } catch (parseError) {
          throw new Error('Ungültiges JSON-Format im Payload');
        }

        const response = await api.post<{ success: boolean; message?: string; data: any }>('/wahonline/send', {
          payload,
          autoFormat: true,
        });

        if (response.data.success) {
          setTestResults(prev => ({
            ...prev,
            send: {
              success: true,
              message: (response.data as any).message || 'Meldung erfolgreich an WAHonline übermittelt',
              details: response.data.data,
            },
          }));
          enqueueSnackbar('Meldung erfolgreich an WAHonline übermittelt', { variant: 'success' });
        } else {
          throw new Error((response.data as any).message || 'Übertragung fehlgeschlagen');
        }
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

  const handleGenerateFormat = async () => {
    setLoading(true);
    setTestResults(prev => ({ ...prev, format: undefined }));
    try {
      let dataToSend: any = {};
      if (formatData.performanceId) {
        const response = await api.post<{ success: boolean; message?: string; data: any }>('/wahonline/format', {
          performanceId: formatData.performanceId,
        });
        if (response.data.success) {
          setTestResults(prev => ({
            ...prev,
            format: {
              success: true,
              message: 'WAHonline-Format erfolgreich generiert',
              details: response.data.data,
            },
          }));
          enqueueSnackbar('WAHonline-Format erfolgreich generiert', { variant: 'success' });
        } else {
          throw new Error((response.data as any).message || 'Formatgenerierung fehlgeschlagen');
        }
      } else {
        try {
          dataToSend = JSON.parse(formatData.data);
        } catch (parseError) {
          throw new Error('Ungültiges JSON-Format für Rohdaten');
        }

        const response = await api.post<{ success: boolean; message?: string; data: any }>('/wahonline/format', {
          data: dataToSend,
        });

        if (response.data.success) {
          setTestResults(prev => ({
            ...prev,
            format: {
              success: true,
              message: 'WAHonline-Format erfolgreich generiert',
              details: response.data.data,
            },
          }));
          enqueueSnackbar('WAHonline-Format erfolgreich generiert', { variant: 'success' });
        } else {
          throw new Error((response.data as any).message || 'Formatgenerierung fehlgeschlagen');
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Formatgenerierung fehlgeschlagen';
      setTestResults(prev => ({
        ...prev,
        format: {
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
        <SettingsIcon sx={{ fontSize: 32 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">WAHonline Teststrecke</Typography>
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
      {wahonlineStatus && (
        <Card sx={{ mb: 3, p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            {wahonlineStatus.configured ? (
              <CheckCircleIcon color="success" />
            ) : (
              <ErrorIcon color="error" />
            )}
            <Typography variant="h6">WAHonline Systemstatus</Typography>
            <Chip
              label={`Umgebung: ${wahonlineStatus.environment}`}
              color="info"
              size="small"
            />
          </Stack>
          {wahonlineStatus.errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Konfigurationsfehler:</strong>
              </Typography>
              <ul>
                {wahonlineStatus.errors.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Chip
                label={`API konfiguriert: ${wahonlineStatus.api.enabled ? 'Ja' : 'Nein'}`}
                color={wahonlineStatus.api.enabled ? 'success' : 'error'}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Chip
                label={`API-Key: ${wahonlineStatus.api.hasApiKey ? 'Vorhanden' : 'Fehlt'}`}
                color={wahonlineStatus.api.hasApiKey ? 'success' : 'error'}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Chip
                label={`Zertifikate: ${wahonlineStatus.api.hasCertificates ? 'Vorhanden' : 'Fehlen'}`}
                color={wahonlineStatus.api.hasCertificates ? 'success' : 'error'}
                size="small"
              />
            </Grid>
          </Grid>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchWahonlineStatus}
            sx={{ mt: 2 }}
            disabled={loading}
          >
            Status aktualisieren
          </Button>
        </Card>
      )}

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="WAHonline Test Tabs">
          <Tab label="Verbindungstest" icon={<BuildIcon />} />
          <Tab label="Meldung senden" icon={<SendIcon />} />
          <Tab label="Format generieren" icon={<BuildIcon />} />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            WAHonline-Verbindung testen
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                label="Umgebung"
                value={connectionTest.environment}
                onChange={(e) => setConnectionTest(prev => ({ ...prev, environment: e.target.value }))}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="test">Testsystem</option>
                <option value="sit">Systemintegrationstest</option>
                <option value="production">Produktion</option>
              </TextField>
            </Grid>
          </Grid>

          <Button
            variant="contained"
            onClick={handleConnectionTest}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <BuildIcon />}
          >
            {loading ? 'Test läuft...' : 'Verbindung testen'}
          </Button>

          {testResults.connection && (
            <Box sx={{ mt: 3 }}>
              <Alert severity={testResults.connection.success ? 'success' : 'error'}>
                {testResults.connection.message}
              </Alert>
              {testResults.connection.details && (
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', marginTop: '10px' }}>
                  {JSON.stringify(testResults.connection.details, null, 2)}
                </pre>
              )}
            </Box>
          )}
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            WAHonline Meldung senden
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                options={performances}
                getOptionLabel={(option) => `${option.serviceDescription} (${option.totalPrice} €)`}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                onChange={(event, newValue) => {
                  setSendTestData(prev => ({ ...prev, performanceId: newValue?._id || '' }));
                }}
                renderOption={(props, option) => {
                  const { key, ...restProps } = props;
                  return (
                    <Box component="li" key={option._id || key} {...restProps}>
                      {`${option.serviceDescription} (${option.totalPrice} €)`}
                    </Box>
                  );
                }}
                renderInput={(params) => <TextField {...params} label="Leistung auswählen (optional)" margin="normal" />}
              />
            </Grid>
          </Grid>

          <TextField
            label="Payload (JSON) - wird ignoriert wenn Leistung ausgewählt"
            multiline
            rows={10}
            fullWidth
            value={sendTestData.payload}
            onChange={(e) => setSendTestData(prev => ({ ...prev, payload: e.target.value }))}
            margin="normal"
            placeholder={`Beispiel:\n{\n  "performance": { "serviceCode": "111", "serviceDescription": "Ordinationskonsultation", "totalPrice": 35.00 },\n  "patient": { "socialSecurityNumber": "1234567890", "firstName": "Max", "lastName": "Mustermann" },\n  "doctor": { "profile": { "chamberNumber": "12345", "taxNumber": "ATU12345678" } }\n}`}
          />
          <Button
            variant="contained"
            onClick={handleSendData}
            disabled={loading || (!sendTestData.performanceId && !sendTestData.payload)}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            sx={{ mt: 2 }}
          >
            {loading ? 'Senden...' : 'Meldung an WAHonline senden'}
          </Button>
          {testResults.send && (
            <Box sx={{ mt: 3 }}>
              <Alert severity={testResults.send.success ? 'success' : 'error'}>
                {testResults.send.message}
              </Alert>
              {testResults.send.details && (
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', marginTop: '10px' }}>
                  {JSON.stringify(testResults.send.details, null, 2)}
                </pre>
              )}
            </Box>
          )}
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            WAHonline Format generieren
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                options={performances}
                getOptionLabel={(option) => `${option.serviceDescription} (${option.totalPrice} €)`}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                onChange={(event, newValue) => {
                  setFormatData(prev => ({ ...prev, performanceId: newValue?._id || '' }));
                }}
                renderOption={(props, option) => {
                  const { key, ...restProps } = props;
                  return (
                    <Box component="li" key={option._id || key} {...restProps}>
                      {`${option.serviceDescription} (${option.totalPrice} €)`}
                    </Box>
                  );
                }}
                renderInput={(params) => <TextField {...params} label="Leistung auswählen (optional)" margin="normal" />}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Rohdaten (JSON) - wird ignoriert wenn Leistung ausgewählt"
                multiline
                rows={10}
                fullWidth
                value={formatData.data}
                onChange={(e) => setFormatData(prev => ({ ...prev, data: e.target.value }))}
                margin="normal"
                placeholder={`Beispiel:\n{\n  "performance": { "serviceCode": "111", "serviceDescription": "Ordinationskonsultation", "totalPrice": 35.00 },\n  "patient": { "socialSecurityNumber": "1234567890", "firstName": "Max", "lastName": "Mustermann" },\n  "doctor": { "profile": { "chamberNumber": "12345", "taxNumber": "ATU12345678" } }\n}`}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button
                variant="contained"
                onClick={handleGenerateFormat}
                disabled={loading || (!formatData.performanceId && !formatData.data)}
                startIcon={loading ? <CircularProgress size={20} /> : <BuildIcon />}
                sx={{ mt: 2 }}
              >
                {loading ? 'Generieren...' : 'Format generieren'}
              </Button>
            </Grid>
          </Grid>
          {testResults.format && (
            <Box sx={{ mt: 3 }}>
              <Alert severity={testResults.format.success ? 'success' : 'error'}>
                {testResults.format.message}
              </Alert>
              {testResults.format.details && (
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', marginTop: '10px' }}>
                  {JSON.stringify(testResults.format.details, null, 2)}
                </pre>
              )}
            </Box>
          )}
        </Card>
      </TabPanel>

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
          title="Hilfe & Leitfaden: WAHonline Test"
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
            <Tab label="Sendetest" />
            <Tab label="Ergebnisse" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  WAHonline Test
                </Typography>
                <Typography variant="body1" paragraph>
                  Diese Seite ermöglicht es, die WAHonline-Integration zu testen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📤 <strong>Sendetest:</strong> Meldungen an WAHonline senden</li>
                  <li>📋 <strong>Status:</strong> WAHonline-Status prüfen</li>
                  <li>🔄 <strong>Aktualisieren:</strong> Status aktualisieren</li>
                  <li>📊 <strong>Details:</strong> Detaillierte Informationen anzeigen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
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
                  <li>Patient auswählen</li>
                  <li>Leistung auswählen</li>
                  <li>Auf "Test senden" klicken</li>
                  <li>Ergebnisse prüfen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Ergebnisse
                </Typography>
                <Typography variant="body2" paragraph>
                  So interpretieren Sie die Ergebnisse:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Status-Indikatoren
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Erfolg:</strong> Test erfolgreich</li>
                  <li>❌ <strong>Fehler:</strong> Test fehlgeschlagen</li>
                  <li>⚠️ <strong>Warnung:</strong> Test mit Warnungen</li>
                  <li>ℹ️ <strong>Info:</strong> Zusätzliche Informationen</li>
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
                  WAHonline Test
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Testen Sie mit echten Daten</li>
                  <li>✅ Prüfen Sie alle Fehlermeldungen</li>
                  <li>✅ Dokumentieren Sie Ergebnisse</li>
                  <li>✅ Testen Sie verschiedene Szenarien</li>
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

export default WAHonlineTestPage;

