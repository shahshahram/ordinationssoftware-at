import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Stack,
  Grid,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import DicomRetrieveDialog from '../components/DicomRetrieveDialog';
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

interface DicomProvider {
  _id: string;
  name: string;
  code: string;
  integration: {
    protocol: string;
    rest?: {
      webhookUrl?: string;
      apiKey?: string;
    };
    dicomweb?: {
      baseUrl?: string;
    };
  };
  stats?: {
    totalUploads: number;
    successfulUploads: number;
    failedUploads: number;
    lastUpload?: Date;
  };
}

const DicomTestPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [providers, setProviders] = useState<DicomProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrieveDialogOpen, setRetrieveDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  const [testResults, setTestResults] = useState<{
    upload?: { success: boolean; message: string; details?: any };
    retrieve?: { success: boolean; message: string; details?: any };
  }>({});

  // Upload Test State
  const [uploadTestData, setUploadTestData] = useState({
    providerId: '',
    providerCode: '',
    apiKey: '',
    patientId: '',
    file: null as File | null,
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: DicomProvider[] }>('/dicom-providers');
      if (response.data?.success) {
        setProviders(response.data.data);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Provider', { variant: 'error' });
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadTest = async () => {
    if (!uploadTestData.providerCode || !uploadTestData.apiKey || !uploadTestData.file) {
      enqueueSnackbar('Bitte füllen Sie alle Felder aus und wählen Sie eine Datei', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('dicomFile', uploadTestData.file);
      formData.append('providerCode', uploadTestData.providerCode);
      formData.append('apiKey', uploadTestData.apiKey);
      if (uploadTestData.patientId) {
        formData.append('patientId', uploadTestData.patientId);
      }

      // Für FormData wird Content-Type automatisch vom Browser gesetzt
      const response = await api.post<{ success: boolean; message?: string; data?: any }>('/dicom/receive', formData);

      if (response.data?.success) {
        setTestResults({
          ...testResults,
          upload: {
            success: true,
            message: 'DICOM-Datei erfolgreich empfangen',
            details: response.data,
          },
        });
        enqueueSnackbar('Upload-Test erfolgreich', { variant: 'success' });
      }
    } catch (error: any) {
      setTestResults({
        ...testResults,
        upload: {
          success: false,
          message: error.response?.data?.message || 'Fehler beim Upload',
          details: error.response?.data,
        },
      });
      enqueueSnackbar('Upload-Test fehlgeschlagen', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (providerId: string) => {
    const provider = providers.find(p => p._id === providerId);
    if (provider) {
      setUploadTestData({
        ...uploadTestData,
        providerId,
        providerCode: provider.code,
        apiKey: provider.integration.rest?.apiKey || '',
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">DICOM Teststrecke</Typography>
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
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchProviders}
          disabled={loading}
        >
          Aktualisieren
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Empfang (Webhook)" icon={<CloudUploadIcon />} iconPosition="start" />
          <Tab label="Abholung (PACS)" icon={<CloudDownloadIcon />} iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Test: DICOM-Dateien empfangen (Webhook)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Simuliert den Empfang einer DICOM-Datei von einem externen Provider über den Webhook-Endpunkt.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
            <FormControl fullWidth>
              <InputLabel>Provider</InputLabel>
              <Select
                value={uploadTestData.providerId}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                {providers
                  .filter(p => p.integration?.protocol === 'rest')
                  .map((provider) => (
                    <MenuItem key={provider._id} value={provider._id}>
                      {provider.name} ({provider.code})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Provider Code"
              value={uploadTestData.providerCode}
              onChange={(e) => setUploadTestData({ ...uploadTestData, providerCode: e.target.value })}
              disabled={!!uploadTestData.providerId}
              helperText="Wird automatisch ausgefüllt, wenn Provider ausgewählt"
            />

            <TextField
              fullWidth
              label="API-Key"
              type="password"
              value={uploadTestData.apiKey}
              onChange={(e) => setUploadTestData({ ...uploadTestData, apiKey: e.target.value })}
              helperText="Wird automatisch ausgefüllt, wenn Provider ausgewählt"
            />

            <TextField
              fullWidth
              label="Patient-ID (optional)"
              value={uploadTestData.patientId}
              onChange={(e) => setUploadTestData({ ...uploadTestData, patientId: e.target.value })}
              helperText="Falls leer, wird versucht, den Patienten automatisch zu finden"
            />

            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
            >
              DICOM-Datei auswählen
              <input
                type="file"
                hidden
                accept=".dcm,.dicom,application/dicom"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadTestData({ ...uploadTestData, file });
                  }
                }}
              />
            </Button>
            {uploadTestData.file && (
              <Typography variant="body2" color="text.secondary">
                Ausgewählt: {uploadTestData.file.name} ({(uploadTestData.file.size / 1024 / 1024).toFixed(2)} MB)
              </Typography>
            )}

            <Button
              variant="contained"
              onClick={handleUploadTest}
              disabled={loading || !uploadTestData.providerCode || !uploadTestData.apiKey || !uploadTestData.file}
              startIcon={loading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
            >
              Upload testen
            </Button>

            {testResults.upload && (
              <Alert
                severity={testResults.upload.success ? 'success' : 'error'}
                icon={testResults.upload.success ? <CheckCircleIcon /> : <ErrorIcon />}
              >
                <Typography variant="body2" fontWeight="bold">
                  {testResults.upload.message}
                </Typography>
                {testResults.upload.details && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(testResults.upload.details, null, 2)}
                    </Typography>
                  </Box>
                )}
              </Alert>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Test: DICOM-Studien von externem PACS abrufen
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Abfrage und Abruf von DICOM-Studien von einem externen PACS/RIS-System über DICOMweb (QIDO-RS/WADO-RS).
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Wählen Sie einen DICOMweb-Provider aus und suchen Sie nach Studien. Anschließend können Sie
              die gefundenen Studien abrufen und lokal speichern.
            </Alert>

            <Button
              variant="contained"
              startIcon={<CloudDownloadIcon />}
              onClick={() => setRetrieveDialogOpen(true)}
            >
              Studien abrufen
            </Button>
          </Box>

          {testResults.retrieve && (
            <Alert
              severity={testResults.retrieve.success ? 'success' : 'error'}
              icon={testResults.retrieve.success ? <CheckCircleIcon /> : <ErrorIcon />}
            >
              <Typography variant="body2" fontWeight="bold">
                {testResults.retrieve.message}
              </Typography>
              {testResults.retrieve.details && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(testResults.retrieve.details, null, 2)}
                  </Typography>
                </Box>
              )}
            </Alert>
          )}
        </TabPanel>
      </Paper>

      {/* Provider-Übersicht */}
      <Card sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Verfügbare Provider
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Protokoll</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Statistiken</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {providers.map((provider) => (
                <TableRow key={provider._id}>
                  <TableCell>{provider.name}</TableCell>
                  <TableCell>
                    <Chip label={provider.code} size="small" />
                  </TableCell>
                  <TableCell>{provider.integration?.protocol || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={provider.stats ? 'Aktiv' : 'Inaktiv'}
                      size="small"
                      color={provider.stats ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {provider.stats && (
                      <Typography variant="body2">
                        {provider.stats.successfulUploads} / {provider.stats.totalUploads} erfolgreich
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <DicomRetrieveDialog
        open={retrieveDialogOpen}
        onClose={() => setRetrieveDialogOpen(false)}
        patientId=""
        onRetrieveSuccess={() => {
          setTestResults({
            ...testResults,
            retrieve: {
              success: true,
              message: 'Studien erfolgreich abgerufen',
            },
          });
        }}
      />

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
          title="Hilfe & Leitfaden: DICOM Test"
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
            <Tab label="Upload-Test" />
            <Tab label="Retrieve-Test" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  DICOM Test
                </Typography>
                <Typography variant="body1" paragraph>
                  Diese Seite ermöglicht es, die DICOM-Integration zu testen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>☁️ <strong>Upload:</strong> DICOM-Dateien hochladen</li>
                  <li>⬇️ <strong>Retrieve:</strong> DICOM-Dateien abrufen</li>
                  <li>📋 <strong>Provider:</strong> DICOM-Provider verwalten</li>
                  <li>🔄 <strong>Testen:</strong> Integration testen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Upload-Test
                </Typography>
                <Typography variant="body2" paragraph>
                  So führen Sie einen Upload-Test durch:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Provider auswählen</li>
                  <li>Provider Code eingeben</li>
                  <li>DICOM-Datei auswählen</li>
                  <li>Auf "Upload testen" klicken</li>
                  <li>Ergebnisse prüfen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Retrieve-Test
                </Typography>
                <Typography variant="body2" paragraph>
                  So führen Sie einen Retrieve-Test durch:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Provider auswählen</li>
                  <li>Auf "Retrieve öffnen" klicken</li>
                  <li>Suchparameter eingeben</li>
                  <li>DICOM-Dateien abrufen</li>
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
                  DICOM Test
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Testen Sie mit echten DICOM-Dateien</li>
                  <li>✅ Prüfen Sie Provider-Konfiguration</li>
                  <li>✅ Dokumentieren Sie Ergebnisse</li>
                  <li>✅ Testen Sie verschiedene Provider</li>
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

export default DicomTestPage;

