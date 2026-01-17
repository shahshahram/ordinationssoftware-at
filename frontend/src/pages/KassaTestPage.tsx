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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  List as ListIcon,
  Build as BuildIcon,
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

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  socialSecurityNumber?: string;
  dateOfBirth?: string;
  insuranceProvider?: string;
}

interface Performance {
  _id: string;
  serviceCode: string;
  serviceDescription: string;
  totalPrice: number;
  tariffType: string;
}

const KassaTestPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  const [testResults, setTestResults] = useState<{
    connection?: { success: boolean; message: string; details?: any };
    send?: { success: boolean; message: string; details?: any };
    refund?: { success: boolean; message: string; details?: any };
    list?: { success: boolean; message: string; details?: any; results?: any[] };
  }>({});

  // Connection Test State
  const [connectionTest, setConnectionTest] = useState({
    baseUrl: process.env.REACT_APP_KASSA_API_URL || 'https://api.kassa.at',
    apiKey: '',
  });

  // Send Test State
  const [sendTestData, setSendTestData] = useState({
    performanceId: '',
    patientId: '',
    serviceCode: '',
    serviceDescription: '',
    totalPrice: '',
    tariffType: 'kassa',
  });

  // Refund Test State
  const [refundTestData, setRefundTestData] = useState({
    performanceId: '',
    patientId: '',
    refundAmount: '',
    reason: 'Wahlarztleistung',
  });

  // List Test State
  const [listTestData, setListTestData] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadPatients();
    loadPerformances();
  }, []);

  const loadPatients = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Patient[] }>('/patients-extended');
      if (response.data?.success && response.data.data) {
        setPatients(response.data.data);
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der Patienten:', error);
    }
  };

  const loadPerformances = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Performance[] }>('/billing/performances');
      if (response.data?.success && response.data.data) {
        setPerformances(response.data.data);
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der Leistungen:', error);
    }
  };

  const handleConnectionTest = async () => {
    setLoading(true);
    try {
      const response = await api.post<{ success: boolean; message?: string; data?: any }>('/billing/kassa/test-connection', {
        baseUrl: connectionTest.baseUrl,
        apiKey: connectionTest.apiKey,
      });

      const responseData = response.data as { success: boolean; message?: string; data?: any };
      setTestResults({
        ...testResults,
        connection: {
          success: responseData.success,
          message: responseData.message || 'Verbindungstest abgeschlossen',
          details: responseData.data,
        },
      });

      enqueueSnackbar(
        responseData.success
          ? '✅ Verbindungstest erfolgreich'
          : '❌ Verbindungstest fehlgeschlagen',
        { variant: responseData.success ? 'success' : 'error' }
      );
    } catch (error: any) {
      setTestResults({
        ...testResults,
        connection: {
          success: false,
          message: error.response?.data?.message || error.message || 'Verbindungstest fehlgeschlagen',
          details: error.response?.data,
        },
      });
      enqueueSnackbar('❌ Verbindungstest fehlgeschlagen', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!sendTestData.performanceId && !sendTestData.serviceCode) {
      enqueueSnackbar('Bitte wählen Sie eine Leistung oder geben Sie Leistungsdaten ein', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const performance = performances.find((p) => p._id === sendTestData.performanceId);
      const patient = patients.find((p) => p._id === sendTestData.patientId);

      const payload = {
        performanceId: sendTestData.performanceId || null,
        patientId: sendTestData.patientId,
        serviceCode: performance?.serviceCode || sendTestData.serviceCode,
        serviceDescription: performance?.serviceDescription || sendTestData.serviceDescription,
        totalPrice: performance?.totalPrice || parseFloat(sendTestData.totalPrice),
        tariffType: sendTestData.tariffType,
      };

      const response = await api.post<{ success: boolean; message?: string; data?: any }>('/billing/kassa/send', payload);
      const responseData = response.data as { success: boolean; message?: string; data?: any };

      setTestResults({
        ...testResults,
        send: {
          success: responseData.success,
          message: responseData.message || 'Kassenabrechnung gesendet',
          details: responseData.data,
        },
      });

      enqueueSnackbar(
        responseData.success
          ? '✅ Kassenabrechnung erfolgreich gesendet'
          : '❌ Kassenabrechnung fehlgeschlagen',
        { variant: responseData.success ? 'success' : 'error' }
      );
    } catch (error: any) {
      setTestResults({
        ...testResults,
        send: {
          success: false,
          message: error.response?.data?.message || error.message || 'Kassenabrechnung fehlgeschlagen',
          details: error.response?.data,
        },
      });
      enqueueSnackbar('❌ Kassenabrechnung fehlgeschlagen', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefundTest = async () => {
    if (!refundTestData.performanceId || !refundTestData.patientId) {
      enqueueSnackbar('Bitte wählen Sie eine Leistung und einen Patienten', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        performanceId: refundTestData.performanceId,
        patientId: refundTestData.patientId,
        refundAmount: parseFloat(refundTestData.refundAmount),
        reason: refundTestData.reason,
      };

      const response = await api.post<{ success: boolean; message?: string; data?: any }>('/billing/kassa/refund', payload);
      const responseData = response.data as { success: boolean; message?: string; data?: any };

      setTestResults({
        ...testResults,
        refund: {
          success: responseData.success,
          message: responseData.message || 'Rückerstattungsantrag gestellt',
          details: responseData.data,
        },
      });

      enqueueSnackbar(
        responseData.success
          ? '✅ Rückerstattungsantrag erfolgreich gestellt'
          : '❌ Rückerstattungsantrag fehlgeschlagen',
        { variant: responseData.success ? 'success' : 'error' }
      );
    } catch (error: any) {
      setTestResults({
        ...testResults,
        refund: {
          success: false,
          message: error.response?.data?.message || error.message || 'Rückerstattungsantrag fehlgeschlagen',
          details: error.response?.data,
        },
      });
      enqueueSnackbar('❌ Rückerstattungsantrag fehlgeschlagen', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleListTest = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        startDate: listTestData.startDate,
        endDate: listTestData.endDate,
      });
      const response = await api.get<{ success: boolean; message?: string; data?: { invoices?: any[] } }>(`/billing/kassa/list?${queryParams.toString()}`);
      const responseData = response.data as { success: boolean; message?: string; data?: { invoices?: any[] } };

      setTestResults({
        ...testResults,
        list: {
          success: responseData.success,
          message: responseData.message || 'Abrechnungsliste abgerufen',
          details: responseData.data,
          results: responseData.data?.invoices || [],
        },
      });

      enqueueSnackbar(
        responseData.success
          ? `✅ Abrechnungsliste abgerufen (${responseData.data?.invoices?.length || 0} Einträge)`
          : '❌ Abrechnungsliste konnte nicht abgerufen werden',
        { variant: responseData.success ? 'success' : 'error' }
      );
    } catch (error: any) {
      setTestResults({
        ...testResults,
        list: {
          success: false,
          message: error.response?.data?.message || error.message || 'Abrechnungsliste konnte nicht abgerufen werden',
          details: error.response?.data,
          results: [],
        },
      });
      enqueueSnackbar('❌ Abrechnungsliste konnte nicht abgerufen werden', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <BuildIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" fontWeight="bold">
              Kassa-Schnittstelle Teststrecke
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
          <Typography variant="body2" color="textSecondary">
            Testen Sie die Integration mit der Kassenabrechnungs-API
          </Typography>
        </Box>
      </Box>

      <Card>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Verbindungstest" icon={<CheckCircleIcon />} />
          <Tab label="Kassenabrechnung senden" icon={<SendIcon />} />
          <Tab label="Rückerstattungsantrag" icon={<ReceiptIcon />} />
          <Tab label="Abrechnungsliste" icon={<ListIcon />} />
        </Tabs>

        {/* Verbindungstest Tab */}
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={3}>
            <Alert severity="info">
              Testen Sie die Verbindung zur Kassen-API. Geben Sie die API-URL und den API-Key ein.
            </Alert>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="API Base URL"
                  value={connectionTest.baseUrl}
                  onChange={(e) => setConnectionTest({ ...connectionTest, baseUrl: e.target.value })}
                  placeholder="https://api.kassa.at"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="API Key"
                  type="password"
                  value={connectionTest.apiKey}
                  onChange={(e) => setConnectionTest({ ...connectionTest, apiKey: e.target.value })}
                  placeholder="Ihr API-Key"
                />
              </Grid>
            </Grid>

            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              onClick={handleConnectionTest}
              disabled={loading || !connectionTest.baseUrl || !connectionTest.apiKey}
            >
              Verbindung testen
            </Button>

            {testResults.connection && (
              <Alert
                severity={testResults.connection.success ? 'success' : 'error'}
                icon={testResults.connection.success ? <CheckCircleIcon /> : <ErrorIcon />}
              >
                <Typography variant="body2" fontWeight="medium">
                  {testResults.connection.message}
                </Typography>
                {testResults.connection.details && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(testResults.connection.details, null, 2)}
                    </Typography>
                  </Box>
                )}
              </Alert>
            )}
          </Stack>
        </TabPanel>

        {/* Kassenabrechnung senden Tab */}
        <TabPanel value={tabValue} index={1}>
          <Stack spacing={3}>
            <Alert severity="info">
              Senden Sie eine Test-Kassenabrechnung. Wählen Sie eine Leistung oder geben Sie die Daten manuell ein.
            </Alert>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={performances}
                  getOptionLabel={(option) =>
                    `${option.serviceCode} - ${option.serviceDescription} (${option.totalPrice} €)`
                  }
                  getOptionKey={(option) => option._id}
                  isOptionEqualToValue={(option, value) => option._id === value._id}
                  value={performances.find((p) => p._id === sendTestData.performanceId) || null}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      setSendTestData({
                        ...sendTestData,
                        performanceId: newValue._id,
                        serviceCode: newValue.serviceCode,
                        serviceDescription: newValue.serviceDescription,
                        totalPrice: newValue.totalPrice.toString(),
                      });
                    }
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Leistung (optional)" placeholder="Leistung auswählen..." />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={patients}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                  getOptionKey={(option) => option._id}
                  isOptionEqualToValue={(option, value) => option._id === value._id}
                  value={patients.find((p) => p._id === sendTestData.patientId) || null}
                  onChange={(_, newValue) => {
                    setSendTestData({ ...sendTestData, patientId: newValue?._id || '' });
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Patient *" required placeholder="Patient auswählen..." />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Leistungscode"
                  value={sendTestData.serviceCode}
                  onChange={(e) => setSendTestData({ ...sendTestData, serviceCode: e.target.value })}
                  placeholder="z.B. 100"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Beschreibung"
                  value={sendTestData.serviceDescription}
                  onChange={(e) => setSendTestData({ ...sendTestData, serviceDescription: e.target.value })}
                  placeholder="z.B. Allgemeine Untersuchung"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Gesamtpreis (€)"
                  type="number"
                  value={sendTestData.totalPrice}
                  onChange={(e) => setSendTestData({ ...sendTestData, totalPrice: e.target.value })}
                  placeholder="0.00"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Tariftyp</InputLabel>
                  <Select
                    value={sendTestData.tariffType}
                    label="Tariftyp"
                    onChange={(e) => setSendTestData({ ...sendTestData, tariffType: e.target.value })}
                  >
                    <MenuItem value="kassa">Kassenarzt</MenuItem>
                    <MenuItem value="wahl">Wahlarzt</MenuItem>
                    <MenuItem value="privat">Privat</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              onClick={handleSendTest}
              disabled={loading || !sendTestData.patientId || (!sendTestData.performanceId && !sendTestData.serviceCode)}
            >
              Kassenabrechnung senden
            </Button>

            {testResults.send && (
              <Alert
                severity={testResults.send.success ? 'success' : 'error'}
                icon={testResults.send.success ? <CheckCircleIcon /> : <ErrorIcon />}
              >
                <Typography variant="body2" fontWeight="medium">
                  {testResults.send.message}
                </Typography>
                {testResults.send.details && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(testResults.send.details, null, 2)}
                    </Typography>
                  </Box>
                )}
              </Alert>
            )}
          </Stack>
        </TabPanel>

        {/* Rückerstattungsantrag Tab */}
        <TabPanel value={tabValue} index={2}>
          <Stack spacing={3}>
            <Alert severity="info">
              Stellen Sie einen Rückerstattungsantrag für eine Wahlarzt-Leistung.
            </Alert>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={performances}
                  getOptionLabel={(option) =>
                    `${option.serviceCode} - ${option.serviceDescription} (${option.totalPrice} €)`
                  }
                  getOptionKey={(option) => option._id}
                  isOptionEqualToValue={(option, value) => option._id === value._id}
                  value={performances.find((p) => p._id === refundTestData.performanceId) || null}
                  onChange={(_, newValue) => {
                    setRefundTestData({ ...refundTestData, performanceId: newValue?._id || '' });
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Leistung *" required placeholder="Leistung auswählen..." />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={patients}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                  getOptionKey={(option) => option._id}
                  isOptionEqualToValue={(option, value) => option._id === value._id}
                  value={patients.find((p) => p._id === refundTestData.patientId) || null}
                  onChange={(_, newValue) => {
                    setRefundTestData({ ...refundTestData, patientId: newValue?._id || '' });
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Patient *" required placeholder="Patient auswählen..." />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Rückerstattungsbetrag (€)"
                  type="number"
                  value={refundTestData.refundAmount}
                  onChange={(e) => setRefundTestData({ ...refundTestData, refundAmount: e.target.value })}
                  placeholder="0.00"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Grund"
                  value={refundTestData.reason}
                  onChange={(e) => setRefundTestData({ ...refundTestData, reason: e.target.value })}
                  placeholder="z.B. Wahlarztleistung"
                />
              </Grid>
            </Grid>

            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <ReceiptIcon />}
              onClick={handleRefundTest}
              disabled={loading || !refundTestData.performanceId || !refundTestData.patientId}
            >
              Rückerstattungsantrag stellen
            </Button>

            {testResults.refund && (
              <Alert
                severity={testResults.refund.success ? 'success' : 'error'}
                icon={testResults.refund.success ? <CheckCircleIcon /> : <ErrorIcon />}
              >
                <Typography variant="body2" fontWeight="medium">
                  {testResults.refund.message}
                </Typography>
                {testResults.refund.details && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(testResults.refund.details, null, 2)}
                    </Typography>
                  </Box>
                )}
              </Alert>
            )}
          </Stack>
        </TabPanel>

        {/* Abrechnungsliste Tab */}
        <TabPanel value={tabValue} index={3}>
          <Stack spacing={3}>
            <Alert severity="info">
              Rufen Sie die Abrechnungsliste für einen bestimmten Zeitraum ab.
            </Alert>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Startdatum"
                  type="date"
                  value={listTestData.startDate}
                  onChange={(e) => setListTestData({ ...listTestData, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Enddatum"
                  type="date"
                  value={listTestData.endDate}
                  onChange={(e) => setListTestData({ ...listTestData, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <ListIcon />}
              onClick={handleListTest}
              disabled={loading || !listTestData.startDate || !listTestData.endDate}
            >
              Abrechnungsliste abrufen
            </Button>

            {testResults.list && (
              <>
                <Alert
                  severity={testResults.list.success ? 'success' : 'error'}
                  icon={testResults.list.success ? <CheckCircleIcon /> : <ErrorIcon />}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {testResults.list.message}
                  </Typography>
                </Alert>

                {testResults.list.results && testResults.list.results.length > 0 && (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Rechnungsnummer</TableCell>
                          <TableCell>Datum</TableCell>
                          <TableCell>Patient</TableCell>
                          <TableCell>Betrag</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {testResults.list.results.map((invoice: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{invoice.invoiceNumber || 'N/A'}</TableCell>
                            <TableCell>
                              {invoice.invoiceDate
                                ? new Date(invoice.invoiceDate).toLocaleDateString('de-AT')
                                : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {invoice.patient?.name || invoice.patient?.id?.name || 'N/A'}
                            </TableCell>
                            <TableCell>{invoice.totalAmount?.toFixed(2) || '0.00'} €</TableCell>
                            <TableCell>
                              <Chip
                                label={invoice.status || 'N/A'}
                                color={
                                  invoice.status === 'paid' || invoice.status === 'sent'
                                    ? 'success'
                                    : invoice.status === 'rejected'
                                    ? 'error'
                                    : 'default'
                                }
                                size="small"
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
          </Stack>
        </TabPanel>
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
          title="Hilfe & Leitfaden: Kassa-Schnittstelle Test"
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
            <Tab label="Test durchführen" />
            <Tab label="Ergebnisse" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Kassa-Schnittstelle Test
                </Typography>
                <Typography variant="body1" paragraph>
                  Diese Seite ermöglicht es, die Integration mit der Kassenabrechnungs-API zu testen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>🧪 <strong>Testen:</strong> Kassenabrechnungen testen</li>
                  <li>📋 <strong>Ergebnisse:</strong> Test-Ergebnisse anzeigen</li>
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
                  Test durchführen
                </Typography>
                <Typography variant="body2" paragraph>
                  So führen Sie einen Test durch:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Patient auswählen</li>
                  <li>Leistungen auswählen</li>
                  <li>Tariftyp wählen</li>
                  <li>Test senden</li>
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
                  Testen
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

export default KassaTestPage;

