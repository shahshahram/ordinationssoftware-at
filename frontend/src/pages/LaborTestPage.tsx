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
  Autocomplete,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Science as ScienceIcon,
  Edit as EditIcon,
  Search as SearchIcon,
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

interface LaborProvider {
  _id: string;
  name: string;
  code: string;
  integration: {
    protocol: string;
    rest?: {
      webhookUrl?: string;
      apiKey?: string;
    };
    fhir?: {
      baseUrl?: string;
      endpoint?: string;
    };
  };
  isActive: boolean;
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
}

const LaborTestPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [providers, setProviders] = useState<LaborProvider[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  const [testResults, setTestResults] = useState<{
    receive?: { success: boolean; message: string; details?: any };
    manual?: { success: boolean; message: string; details?: any };
    query?: { success: boolean; message: string; details?: any; results?: any[] };
  }>({});

  // Receive Test State
  const [receiveTestData, setReceiveTestData] = useState({
    providerId: '',
    providerCode: '',
    format: 'fhir',
    data: '',
  });

  // Manual Entry Test State
  const [manualTestData, setManualTestData] = useState({
    patientId: '',
    providerId: '',
    resultDate: new Date().toISOString().split('T')[0],
    collectionDate: new Date().toISOString().split('T')[0],
    results: [
      {
        testName: '',
        value: '',
        unit: '',
        loincCode: '',
        referenceRange: { low: '', high: '', text: '' },
      },
    ],
    interpretation: '',
    laboratoryComment: '',
  });

  // Query Test State
  const [queryTestData, setQueryTestData] = useState({
    patientId: '',
  });

  useEffect(() => {
    fetchProviders();
    fetchPatients();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: LaborProvider[] }>('/labor/providers');
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

  const fetchPatients = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Patient[] }>('/patients');
      if (response.data?.success) {
        setPatients(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleReceiveTest = async () => {
    if (!receiveTestData.providerCode || !receiveTestData.format || !receiveTestData.data) {
      enqueueSnackbar('Bitte füllen Sie alle Felder aus', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(receiveTestData.data);
      } catch (e) {
        enqueueSnackbar('Ungültiges JSON-Format', { variant: 'error' });
        return;
      }

      const response = await api.post<{ success: boolean; message?: string; data?: any }>(
        '/labor/receive',
        {
          providerCode: receiveTestData.providerCode,
          format: receiveTestData.format,
          data: parsedData,
        }
      );

      if (response.data?.success) {
        setTestResults({
          ...testResults,
          receive: {
            success: true,
            message: 'Laborergebnis erfolgreich empfangen',
            details: response.data,
          },
        });
        enqueueSnackbar('Empfang-Test erfolgreich', { variant: 'success' });
      }
    } catch (error: any) {
      setTestResults({
        ...testResults,
        receive: {
          success: false,
          message: error.response?.data?.message || 'Fehler beim Empfangen',
          details: error.response?.data,
        },
      });
      enqueueSnackbar('Empfang-Test fehlgeschlagen', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleManualTest = async () => {
    if (!manualTestData.patientId || !manualTestData.providerId || manualTestData.results.length === 0) {
      enqueueSnackbar('Bitte füllen Sie alle erforderlichen Felder aus', { variant: 'warning' });
      return;
    }

    // Frontend-Validierung
    const validationErrors: string[] = [];
    const filteredResults = manualTestData.results.filter(r => r.testName && r.value);
    
    if (filteredResults.length === 0) {
      enqueueSnackbar('Bitte geben Sie mindestens einen Laborwert ein', { variant: 'warning' });
      return;
    }

    // Validiere jeden Wert
    filteredResults.forEach((result, index) => {
      // Test-Name Validierung
      if (!result.testName || result.testName.trim() === '') {
        validationErrors.push(`Laborwert ${index + 1}: Test-Name ist erforderlich`);
      }

      // Wert Validierung
      if (result.value === undefined || result.value === null || result.value === '') {
        validationErrors.push(`Laborwert ${index + 1}: Wert ist erforderlich`);
      }

      // Numerische Validierung (wenn Referenzbereich vorhanden)
      if (result.referenceRange && (result.referenceRange.low || result.referenceRange.high)) {
        const numValue = typeof result.value === 'number' ? result.value : parseFloat(result.value as string);
        if (isNaN(numValue)) {
          validationErrors.push(`Laborwert ${index + 1}: Wert muss numerisch sein, wenn Referenzbereich angegeben ist`);
        }
      }

      // Referenzbereich Validierung
      if (result.referenceRange) {
        const low = result.referenceRange.low ? parseFloat(result.referenceRange.low) : undefined;
        const high = result.referenceRange.high ? parseFloat(result.referenceRange.high) : undefined;
        if (low !== undefined && high !== undefined && !isNaN(low) && !isNaN(high)) {
          if (low >= high) {
            validationErrors.push(`Laborwert ${index + 1}: Untergrenze muss kleiner als Obergrenze sein`);
          }
        }
      }

      // LOINC-Code Format-Validierung
      if (result.loincCode && result.loincCode.trim() !== '') {
        const loincPattern = /^[0-9]{5,7}(-[0-9]{1,2})?$/;
        if (!loincPattern.test(result.loincCode.trim())) {
          validationErrors.push(`Laborwert ${index + 1}: LOINC-Code hat ungültiges Format`);
        }
      }

      // Datum-Validierung
      if (manualTestData.collectionDate) {
        const collectionDate = new Date(manualTestData.collectionDate);
        if (collectionDate > new Date()) {
          validationErrors.push('Entnahme-Datum darf nicht in der Zukunft liegen');
        }
      }

      if (manualTestData.resultDate) {
        const resultDate = new Date(manualTestData.resultDate);
        if (resultDate > new Date()) {
          validationErrors.push('Ergebnis-Datum darf nicht in der Zukunft liegen');
        }
      }

      // Prüfe, ob collectionDate vor resultDate liegt
      if (manualTestData.collectionDate && manualTestData.resultDate) {
        const collectionDate = new Date(manualTestData.collectionDate);
        const resultDate = new Date(manualTestData.resultDate);
        if (collectionDate > resultDate) {
          validationErrors.push('Entnahme-Datum darf nicht nach Ergebnis-Datum liegen');
        }
      }
    });

    if (validationErrors.length > 0) {
      enqueueSnackbar(`Validierungsfehler: ${validationErrors[0]}`, { variant: 'error' });
      setTestResults({
        ...testResults,
        manual: {
          success: false,
          message: 'Validierungsfehler',
          details: { errors: validationErrors },
        },
      });
      return;
    }

    setLoading(true);
    try {
      const results = filteredResults.map(r => ({
          testName: r.testName,
          value: r.value,
          unit: r.unit || '',
          loincCode: r.loincCode || '',
          referenceRange: r.referenceRange.low || r.referenceRange.high || r.referenceRange.text
            ? {
                low: r.referenceRange.low ? parseFloat(r.referenceRange.low) : undefined,
                high: r.referenceRange.high ? parseFloat(r.referenceRange.high) : undefined,
                text: r.referenceRange.text || undefined,
              }
            : undefined,
        }));

      if (results.length === 0) {
        enqueueSnackbar('Bitte geben Sie mindestens einen Laborwert ein', { variant: 'warning' });
        setLoading(false);
        return;
      }

      const response = await api.post<{ success: boolean; message?: string; data?: any }>(
        '/labor/manual',
        {
          patientId: manualTestData.patientId,
          providerId: manualTestData.providerId,
          resultDate: manualTestData.resultDate,
          collectionDate: manualTestData.collectionDate,
          results,
          interpretation: manualTestData.interpretation || undefined,
          laboratoryComment: manualTestData.laboratoryComment || undefined,
        }
      );

      if (response.data?.success) {
        setTestResults({
          ...testResults,
          manual: {
            success: true,
            message: 'Laborwerte erfolgreich manuell eingegeben',
            details: response.data,
          },
        });
        enqueueSnackbar('Manuelle Eingabe erfolgreich', { variant: 'success' });
        // Reset form
        setManualTestData({
          ...manualTestData,
          results: [
            {
              testName: '',
              value: '',
              unit: '',
              loincCode: '',
              referenceRange: { low: '', high: '', text: '' },
            },
          ],
          interpretation: '',
          laboratoryComment: '',
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Fehler bei der manuellen Eingabe';
      const errorDetails = error.response?.data;
      
      // Zeige detaillierte Fehlermeldungen
      if (errorDetails?.errors && Array.isArray(errorDetails.errors)) {
        errorDetails.errors.forEach((err: string) => {
          enqueueSnackbar(err, { variant: 'error' });
        });
      }
      
      setTestResults({
        ...testResults,
        manual: {
          success: false,
          message: errorMessage,
          details: errorDetails,
        },
      });
      
      if (!errorDetails?.errors || errorDetails.errors.length === 0) {
        enqueueSnackbar('Manuelle Eingabe fehlgeschlagen', { variant: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQueryTest = async () => {
    if (!queryTestData.patientId) {
      enqueueSnackbar('Bitte wählen Sie einen Patienten aus', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.get<{ success: boolean; data?: any[] }>(
        `/labor/patient/${queryTestData.patientId}`
      );

      if (response.data?.success) {
        setTestResults({
          ...testResults,
          query: {
            success: true,
            message: `Laborergebnisse gefunden: ${response.data.data?.length || 0}`,
            details: response.data,
            results: response.data.data || [],
          },
        });
        enqueueSnackbar('Abfrage erfolgreich', { variant: 'success' });
      }
    } catch (error: any) {
      setTestResults({
        ...testResults,
        query: {
          success: false,
          message: error.response?.data?.message || 'Fehler bei der Abfrage',
          details: error.response?.data,
        },
      });
      enqueueSnackbar('Abfrage fehlgeschlagen', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (providerId: string) => {
    const provider = providers.find(p => p._id === providerId);
    if (provider) {
      setReceiveTestData({
        ...receiveTestData,
        providerId,
        providerCode: provider.code,
      });
    }
  };

  const addResultRow = () => {
    setManualTestData({
      ...manualTestData,
      results: [
        ...manualTestData.results,
        {
          testName: '',
          value: '',
          unit: '',
          loincCode: '',
          referenceRange: { low: '', high: '', text: '' },
        },
      ],
    });
  };

  const removeResultRow = (index: number) => {
    setManualTestData({
      ...manualTestData,
      results: manualTestData.results.filter((_, i) => i !== index),
    });
  };

  const updateResultRow = (index: number, field: string, value: any) => {
    const newResults = [...manualTestData.results];
    if (field.startsWith('referenceRange.')) {
      const refField = field.split('.')[1];
      newResults[index] = {
        ...newResults[index],
        referenceRange: {
          ...newResults[index].referenceRange,
          [refField]: value,
        },
      };
    } else {
      newResults[index] = {
        ...newResults[index],
        [field]: value,
      };
    }
    setManualTestData({
      ...manualTestData,
      results: newResults,
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">Labor Teststrecke</Typography>
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
          <Tab label="Manuelle Eingabe" icon={<EditIcon />} iconPosition="start" />
          <Tab label="Abfrage" icon={<SearchIcon />} iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Test: Laborergebnisse empfangen (Webhook)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Simuliert den Empfang von Laborergebnissen von einem externen Provider über den Webhook-Endpunkt.
            Unterstützt FHIR und HL7v2 Formate.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 800 }}>
            <FormControl fullWidth>
              <InputLabel>Provider</InputLabel>
              <Select
                value={receiveTestData.providerId}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                {providers
                  .filter(p => p.isActive)
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
              value={receiveTestData.providerCode}
              onChange={(e) => setReceiveTestData({ ...receiveTestData, providerCode: e.target.value })}
              disabled={!!receiveTestData.providerId}
              helperText="Wird automatisch ausgefüllt, wenn Provider ausgewählt"
            />

            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select
                value={receiveTestData.format}
                onChange={(e) => setReceiveTestData({ ...receiveTestData, format: e.target.value })}
              >
                <MenuItem value="fhir">FHIR</MenuItem>
                <MenuItem value="hl7v2">HL7 v2.x</MenuItem>
                <MenuItem value="hl7">HL7 (Alias für HL7v2)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Daten (JSON)"
              multiline
              rows={10}
              value={receiveTestData.data}
              onChange={(e) => setReceiveTestData({ ...receiveTestData, data: e.target.value })}
              helperText="Geben Sie die Laborergebnisse im JSON-Format ein (FHIR oder HL7v2)"
              sx={{ fontFamily: 'monospace' }}
            />

            <Button
              variant="contained"
              onClick={handleReceiveTest}
              disabled={loading || !receiveTestData.providerCode || !receiveTestData.format || !receiveTestData.data}
              startIcon={loading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
            >
              Empfang testen
            </Button>

            {testResults.receive && (
              <Alert
                severity={testResults.receive.success ? 'success' : 'error'}
                icon={testResults.receive.success ? <CheckCircleIcon /> : <ErrorIcon />}
              >
                <Typography variant="body2" fontWeight="bold">
                  {testResults.receive.message}
                </Typography>
                {testResults.receive.details && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                      {JSON.stringify(testResults.receive.details, null, 2)}
                    </Typography>
                  </Box>
                )}
              </Alert>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Test: Manuelle Eingabe von Laborwerten
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Erstellen Sie manuell Laborwerte für einen Patienten. Diese werden direkt in der Datenbank gespeichert.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 1000 }}>
            <Autocomplete
              options={patients}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName}${option.dateOfBirth ? ` (${new Date(option.dateOfBirth).toLocaleDateString('de-DE')})` : ''}`}
              value={patients.find(p => p._id === manualTestData.patientId) || null}
              onChange={(_, newValue) => {
                setManualTestData({ ...manualTestData, patientId: newValue?._id || '' });
              }}
              renderInput={(params) => <TextField {...params} label="Patient" required />}
            />

            <FormControl fullWidth>
              <InputLabel>Provider</InputLabel>
              <Select
                value={manualTestData.providerId}
                onChange={(e) => setManualTestData({ ...manualTestData, providerId: e.target.value })}
              >
                {providers
                  .filter(p => p.isActive)
                  .map((provider) => (
                    <MenuItem key={provider._id} value={provider._id}>
                      {provider.name} ({provider.code})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Ergebnis-Datum"
                  type="date"
                  value={manualTestData.resultDate}
                  onChange={(e) => setManualTestData({ ...manualTestData, resultDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Entnahme-Datum"
                  type="date"
                  value={manualTestData.collectionDate}
                  onChange={(e) => setManualTestData({ ...manualTestData, collectionDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }}>Laborwerte</Divider>

            {manualTestData.results.map((result, index) => (
              <Card key={index} sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2">Wert {index + 1}</Typography>
                  {manualTestData.results.length > 1 && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => removeResultRow(index)}
                    >
                      Entfernen
                    </Button>
                  )}
                </Box>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Test-Name"
                      value={result.testName}
                      onChange={(e) => updateResultRow(index, 'testName', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      fullWidth
                      label="Wert"
                      value={result.value}
                      onChange={(e) => updateResultRow(index, 'value', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      fullWidth
                      label="Einheit"
                      value={result.unit}
                      onChange={(e) => updateResultRow(index, 'unit', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="LOINC-Code"
                      value={result.loincCode}
                      onChange={(e) => updateResultRow(index, 'loincCode', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField
                      fullWidth
                      label="Ref. Low"
                      type="number"
                      value={result.referenceRange.low}
                      onChange={(e) => updateResultRow(index, 'referenceRange.low', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField
                      fullWidth
                      label="Ref. High"
                      type="number"
                      value={result.referenceRange.high}
                      onChange={(e) => updateResultRow(index, 'referenceRange.high', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <TextField
                      fullWidth
                      label="Ref. Text"
                      value={result.referenceRange.text}
                      onChange={(e) => updateResultRow(index, 'referenceRange.text', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Card>
            ))}

            <Button
              variant="outlined"
              onClick={addResultRow}
              startIcon={<ScienceIcon />}
            >
              Weitere Laborwerte hinzufügen
            </Button>

            <TextField
              fullWidth
              label="Interpretation (optional)"
              multiline
              rows={2}
              value={manualTestData.interpretation}
              onChange={(e) => setManualTestData({ ...manualTestData, interpretation: e.target.value })}
            />

            <TextField
              fullWidth
              label="Labor-Kommentar (optional)"
              multiline
              rows={2}
              value={manualTestData.laboratoryComment}
              onChange={(e) => setManualTestData({ ...manualTestData, laboratoryComment: e.target.value })}
            />

            <Button
              variant="contained"
              onClick={handleManualTest}
              disabled={loading || !manualTestData.patientId || !manualTestData.providerId}
              startIcon={loading ? <CircularProgress size={20} /> : <EditIcon />}
            >
              Laborwerte speichern
            </Button>

            {testResults.manual && (
              <Alert
                severity={testResults.manual.success ? 'success' : 'error'}
                icon={testResults.manual.success ? <CheckCircleIcon /> : <ErrorIcon />}
              >
                <Typography variant="body2" fontWeight="bold">
                  {testResults.manual.message}
                </Typography>
                {testResults.manual.details && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                      {JSON.stringify(testResults.manual.details, null, 2)}
                    </Typography>
                  </Box>
                )}
              </Alert>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Test: Laborergebnisse abfragen
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Abfrage aller Laborergebnisse für einen ausgewählten Patienten.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 800 }}>
            <Autocomplete
              options={patients}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName}${option.dateOfBirth ? ` (${new Date(option.dateOfBirth).toLocaleDateString('de-DE')})` : ''}`}
              value={patients.find(p => p._id === queryTestData.patientId) || null}
              onChange={(_, newValue) => {
                setQueryTestData({ ...queryTestData, patientId: newValue?._id || '' });
              }}
              renderInput={(params) => <TextField {...params} label="Patient" required />}
            />

            <Button
              variant="contained"
              onClick={handleQueryTest}
              disabled={loading || !queryTestData.patientId}
              startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
            >
              Laborergebnisse abfragen
            </Button>

            {testResults.query && (
              <>
                <Alert
                  severity={testResults.query.success ? 'success' : 'error'}
                  icon={testResults.query.success ? <CheckCircleIcon /> : <ErrorIcon />}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {testResults.query.message}
                  </Typography>
                </Alert>

                {testResults.query.results && testResults.query.results.length > 0 && (
                  <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Datum</TableCell>
                          <TableCell>Provider</TableCell>
                          <TableCell>Anzahl Werte</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {testResults.query.results.map((result: any) => (
                          <TableRow key={result._id}>
                            <TableCell>
                              {result.resultDate
                                ? new Date(result.resultDate).toLocaleDateString('de-DE')
                                : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {result.providerId?.name || 'N/A'}
                            </TableCell>
                            <TableCell>{result.resultCount || 0}</TableCell>
                            <TableCell>
                              <Chip
                                label={result.processingStatus || 'N/A'}
                                size="small"
                                color={result.processingStatus === 'validated' ? 'success' : 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </Box>
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
              </TableRow>
            </TableHead>
            <TableBody>
              {providers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Keine Provider gefunden
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                providers.map((provider) => (
                  <TableRow key={provider._id}>
                    <TableCell>{provider.name}</TableCell>
                    <TableCell>
                      <Chip label={provider.code} size="small" />
                    </TableCell>
                    <TableCell>{provider.integration?.protocol?.toUpperCase() || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        label={provider.isActive ? 'Aktiv' : 'Inaktiv'}
                        size="small"
                        color={provider.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

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
          title="Hilfe & Leitfaden: Labor Test"
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
            <Tab label="Empfangstest" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Labor Test
                </Typography>
                <Typography variant="body1" paragraph>
                  Diese Seite ermöglicht es, die Labor-Integration zu testen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📤 <strong>Sendetest:</strong> Laboranfragen senden</li>
                  <li>📥 <strong>Empfangstest:</strong> Laborergebnisse empfangen</li>
                  <li>✏️ <strong>Manuelle Eingabe:</strong> Ergebnisse manuell eingeben</li>
                  <li>📋 <strong>Provider:</strong> Labor-Provider verwalten</li>
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
                  <li>Provider auswählen</li>
                  <li>Patient auswählen</li>
                  <li>Anfrage-Daten eingeben</li>
                  <li>Auf "Anfrage senden" klicken</li>
                  <li>Ergebnisse prüfen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Empfangstest
                </Typography>
                <Typography variant="body2" paragraph>
                  So führen Sie einen Empfangstest durch:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Provider auswählen</li>
                  <li>Format wählen (FHIR/HL7)</li>
                  <li>Test-Daten eingeben</li>
                  <li>Auf "Ergebnis simulieren" klicken</li>
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
                  Labor Test
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Testen Sie mit echten Patientendaten</li>
                  <li>✅ Prüfen Sie Provider-Konfiguration</li>
                  <li>✅ Dokumentieren Sie Ergebnisse</li>
                  <li>✅ Testen Sie verschiedene Formate</li>
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

export default LaborTestPage;

