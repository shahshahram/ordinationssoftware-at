import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Link,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSnackbar } from 'notistack';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  timestamp: Date;
}

interface DicomProvider {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
  integration: {
    rest?: {
      apiKey?: string;
    };
  };
}

const DicomTestTool: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<DicomProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [providerCode, setProviderCode] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientMatching, setPatientMatching] = useState<'name-dob' | 'patient-id' | 'multiple'>('name-dob');
  const [dicomFile, setDicomFile] = useState<File | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportFormat, setReportFormat] = useState<'pdf' | 'fhir' | 'hl7-cda' | 'dicom-sr' | 'text' | 'json'>('pdf');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [activeTab, setActiveTab] = useState<'dicom' | 'report'>('dicom');

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoadingProviders(true);
    try {
      const response = await api.get<{ success: boolean; data: DicomProvider[] }>('/dicom-providers');
      if (response.data?.success) {
        const activeProviders = response.data.data.filter(p => p.isActive);
        setProviders(activeProviders);
        if (activeProviders.length === 0) {
          enqueueSnackbar('Keine aktiven DICOM-Provider gefunden. Bitte erstellen Sie zuerst einen Provider.', { variant: 'warning' });
        }
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Provider', { variant: 'error' });
      console.error('Error fetching providers:', error);
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleProviderChange = (providerId: string) => {
    setSelectedProviderId(providerId);
    const provider = providers.find(p => p._id === providerId);
    if (provider) {
      setProviderCode(provider.code);
      // API-Key wird nicht automatisch geladen, da er aus Sicherheitsgründen nicht im GET-Response enthalten ist
      // Der Benutzer muss ihn manuell eingeben oder aus dem Provider-Management kopieren
      setApiKey('');
    }
  };

  const handleDicomFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setDicomFile(event.target.files[0]);
    }
  };

  const handleReportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setReportFile(event.target.files[0]);
    }
  };

  const handleDicomUpload = async () => {
    if (!dicomFile) {
      enqueueSnackbar('Bitte wählen Sie eine DICOM-Datei aus', { variant: 'warning' });
      return;
    }

    if (!providerCode || !apiKey) {
      enqueueSnackbar('Provider-Code und API-Key sind erforderlich', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('dicomFile', dicomFile);
      formData.append('providerCode', providerCode);
      formData.append('apiKey', apiKey);
      if (patientId) {
        formData.append('patientId', patientId);
      }
      formData.append('patientMatching', patientMatching);

      // FormData setzt Content-Type automatisch, daher keine headers nötig
      const response = await api.post<{
        success: boolean;
        message?: string;
        data?: any;
        error?: string;
      }>('/dicom/receive', formData);

      const result: TestResult = {
        success: response.data?.success || false,
        message: response.data?.message || 'Upload erfolgreich',
        data: response.data?.data,
        timestamp: new Date(),
      };

      setTestResults([result, ...testResults]);
      enqueueSnackbar('DICOM-Datei erfolgreich hochgeladen', { variant: 'success' });
    } catch (error: any) {
      const result: TestResult = {
        success: false,
        message: error.response?.data?.message || error.message || 'Fehler beim Upload',
        error: error.response?.data?.error || error.message,
        timestamp: new Date(),
      };

      setTestResults([result, ...testResults]);
      enqueueSnackbar('Fehler beim Upload der DICOM-Datei', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReportUpload = async () => {
    if (!reportFile) {
      enqueueSnackbar('Bitte wählen Sie eine Befund-Datei aus', { variant: 'warning' });
      return;
    }

    if (!providerCode || !apiKey) {
      enqueueSnackbar('Provider-Code und API-Key sind erforderlich', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', reportFile);
      formData.append('providerCode', providerCode);
      formData.append('apiKey', apiKey);
      formData.append('format', reportFormat);
      if (patientId) {
        formData.append('patientId', patientId);
      }
      formData.append('patientMatching', patientMatching);

      const response = await api.post<{
        success: boolean;
        message?: string;
        data?: any;
        error?: string;
      }>('/radiology-reports/receive', formData);

      const result: TestResult = {
        success: response.data?.success || false,
        message: response.data?.message || 'Upload erfolgreich',
        data: response.data?.data,
        timestamp: new Date(),
      };

      setTestResults([result, ...testResults]);
      enqueueSnackbar('Befund erfolgreich hochgeladen', { variant: 'success' });
    } catch (error: any) {
      const result: TestResult = {
        success: false,
        message: error.response?.data?.message || error.message || 'Fehler beim Upload',
        error: error.response?.data?.error || error.message,
        timestamp: new Date(),
      };

      setTestResults([result, ...testResults]);
      enqueueSnackbar('Fehler beim Upload des Befunds', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        DICOM & Radiologie-Befund Test-Tool
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Simulieren Sie externe DICOM-Uploads und Befund-Empfänge von radiologischen Instituten
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant={activeTab === 'dicom' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('dicom')}
        >
          DICOM-Bild
        </Button>
        <Button
          variant={activeTab === 'report' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('report')}
        >
          Radiologie-Befund
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Konfiguration */}
        <Card sx={{ flex: '1 1 400px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Konfiguration
            </Typography>

            <FormControl fullWidth margin="normal" required>
              <InputLabel>DICOM-Provider</InputLabel>
              <Select
                value={selectedProviderId}
                onChange={(e) => handleProviderChange(e.target.value)}
                label="DICOM-Provider"
                disabled={loadingProviders}
              >
                {providers.map((provider) => (
                  <MenuItem key={provider._id} value={provider._id}>
                    {provider.name} ({provider.code})
                  </MenuItem>
                ))}
              </Select>
              {providers.length === 0 && !loadingProviders && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  Keine aktiven Provider gefunden.{' '}
                  <Link href="/dicom-providers" target="_blank">
                    Provider erstellen
                  </Link>
                </Typography>
              )}
            </FormControl>

            <TextField
              fullWidth
              label="Provider-Code"
              value={providerCode}
              onChange={(e) => setProviderCode(e.target.value.toUpperCase())}
              margin="normal"
              required
              helperText="Code des DICOM-Providers (wird automatisch ausgefüllt)"
              disabled={!!selectedProviderId}
            />

            <TextField
              fullWidth
              label="API-Key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              margin="normal"
              required
              helperText="API-Key des Providers (aus Provider-Management kopieren)"
            />

            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={fetchProviders}
              disabled={loadingProviders}
              sx={{ mt: 1 }}
            >
              Provider aktualisieren
            </Button>

            <TextField
              fullWidth
              label="Patient-ID (optional)"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              margin="normal"
              helperText="Direkte Patient-ID oder leer für Auto-Matching"
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Patient-Matching</InputLabel>
              <Select
                value={patientMatching}
                onChange={(e) => setPatientMatching(e.target.value as any)}
              >
                <MenuItem value="name-dob">Name + Geburtsdatum</MenuItem>
                <MenuItem value="patient-id">Patient-ID</MenuItem>
                <MenuItem value="multiple">Mehrere Strategien</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            {activeTab === 'dicom' ? (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  DICOM-Datei auswählen
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  startIcon={<CloudUploadIcon />}
                  sx={{ mt: 1 }}
                >
                  {dicomFile ? dicomFile.name : 'DICOM-Datei wählen'}
                  <input
                    type="file"
                    hidden
                    accept=".dcm,.dicom,application/dicom"
                    onChange={handleDicomFileChange}
                  />
                </Button>
                {dicomFile && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Größe: {(dicomFile.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                  onClick={handleDicomUpload}
                  disabled={loading || !dicomFile || !providerCode || !apiKey}
                  sx={{ mt: 3 }}
                >
                  DICOM-Upload testen
                </Button>
              </>
            ) : (
              <>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Befund-Format</InputLabel>
                  <Select
                    value={reportFormat}
                    onChange={(e) => setReportFormat(e.target.value as any)}
                  >
                    <MenuItem value="pdf">PDF</MenuItem>
                    <MenuItem value="fhir">FHIR</MenuItem>
                    <MenuItem value="hl7-cda">HL7 CDA</MenuItem>
                    <MenuItem value="dicom-sr">DICOM SR</MenuItem>
                    <MenuItem value="text">Text</MenuItem>
                    <MenuItem value="json">JSON</MenuItem>
                  </Select>
                </FormControl>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Befund-Datei auswählen
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  startIcon={<CloudUploadIcon />}
                  sx={{ mt: 1 }}
                >
                  {reportFile ? reportFile.name : 'Befund-Datei wählen'}
                  <input
                    type="file"
                    hidden
                    accept={
                      reportFormat === 'pdf'
                        ? '.pdf'
                        : reportFormat === 'json'
                        ? '.json'
                        : reportFormat === 'text'
                        ? '.txt'
                        : '*'
                    }
                    onChange={handleReportFileChange}
                  />
                </Button>
                {reportFile && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Größe: {(reportFile.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                  onClick={handleReportUpload}
                  disabled={loading || !reportFile || !providerCode || !apiKey}
                  sx={{ mt: 3 }}
                >
                  Befund-Upload testen
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Ergebnisse */}
        <Card sx={{ flex: '1 1 400px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test-Ergebnisse
            </Typography>

            {testResults.length === 0 ? (
              <Alert severity="info">
                Noch keine Tests durchgeführt. Laden Sie eine DICOM-Datei oder einen Befund hoch.
              </Alert>
            ) : (
              <List>
                {testResults.map((result, index) => (
                  <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, width: '100%' }}>
                      {result.success ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                      <Chip
                        label={result.success ? 'Erfolg' : 'Fehler'}
                        color={result.success ? 'success' : 'error'}
                        size="small"
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                        {result.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {result.message}
                    </Typography>
                    {result.error && (
                      <Alert severity="error" sx={{ mt: 1, width: '100%' }}>
                        {result.error}
                      </Alert>
                    )}
                    {result.data && (
                      <Paper variant="outlined" sx={{ p: 1, mt: 1, width: '100%', bgcolor: 'grey.50' }}>
                        <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem' }}>
                          {JSON.stringify(result.data, null, 2)}
                        </Typography>
                      </Paper>
                    )}
                    {index < testResults.length - 1 && <Divider sx={{ mt: 2, width: '100%' }} />}
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Box>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Hinweise:
        </Typography>
        <Typography variant="body2" component="div">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>
              Erstellen Sie zuerst einen DICOM-Provider im{' '}
              <Link href="/dicom-providers" target="_blank">
                Provider-Management
              </Link>
            </li>
            <li>Kopieren Sie den API-Key aus dem Provider-Management (Button "API-Key anzeigen")</li>
            <li>Für Tests können Sie die IP-Whitelist leer lassen</li>
            <li>
              Test-DICOM-Dateien finden Sie unter:{' '}
              <Link href="https://www.dicomlibrary.com/dicom/" target="_blank" rel="noopener">
                dicomlibrary.com
              </Link>
            </li>
          </ul>
        </Typography>
      </Alert>
    </Box>
  );
};

export default DicomTestTool;

