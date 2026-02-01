// Cash Register Management Page
// Verwaltung von Registrierkassen, Startbelege, Monats-/Jahresbelege

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Chip,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip
} from '@mui/material';
import {
  Add,
  CalendarToday,
  CheckCircle,
  Error as ErrorIcon,
  Science,
  Verified,
  HelpOutline
} from '@mui/icons-material';
import api from '../utils/api';
import GradientDialogTitle from '../components/GradientDialogTitle';

interface CashRegister {
  _id: string;
  cashBoxId: string;
  tse: {
    provider: string;
    serialNumber?: string;
    initialized: boolean;
    initializedAt?: Date;
    testMode?: boolean;
    sandboxEndpoint?: string;
  };
  signatureCounter: number;
  finanzOnline: {
    registered: boolean;
    registrationDate?: Date;
  };
  isActive: boolean;
  locationId?: {
    _id: string;
    name: string;
  };
}

interface ReceiptChainEntry {
  _id: string;
  receiptType: string;
  receiptNumber: number;
  receiptData: {
    amount: number;
    timestamp: Date;
  };
  tseSignature: {
    signatureCounter: number;
    timestamp: Date;
  };
  isCashTransaction: boolean;
  period?: {
    year: number;
    month: number;
  };
}

const CashRegisterManagement: React.FC = () => {
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [receiptChain, setReceiptChain] = useState<ReceiptChainEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [_selectedRegister, _setSelectedRegister] = useState<CashRegister | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  
  const [newRegister, setNewRegister] = useState({
    cashBoxId: '',
    locationId: '',
    tseProvider: 'software',
    tseSerialNumber: '',
    tsePublicKey: '',
    tseSecret: '',
    tseApiKey: '',
    tseApiSecret: '',
    tseEndpoint: '',
    testMode: false,
    sandboxEndpoint: ''
  });
  
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [_selectedReceiptForValidation, _setSelectedReceiptForValidation] = useState<ReceiptChainEntry | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  const [helpDialogRegistersOpen, setHelpDialogRegistersOpen] = useState(false);
  const [helpDialogReceiptChainOpen, setHelpDialogReceiptChainOpen] = useState(false);
  const [_helpDialogConfigOpen, setHelpDialogConfigOpen] = useState(false);

  useEffect(() => {
    loadCashRegisters();
    loadReceiptChain();
  }, []);

  const loadCashRegisters = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ success: boolean; data: CashRegister[] }>('/billing/cash-registers');
      // api.get gibt ApiResponse zurück, wobei response.data das Backend-Response ist
      const backendResponse = response.data as { success: boolean; data: CashRegister[] };
      if (backendResponse.success && backendResponse.data) {
        setCashRegisters(backendResponse.data);
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: 'Fehler beim Laden der Registrierkassen', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadReceiptChain = async () => {
    try {
      const response = await api.get<{ success: boolean; data: ReceiptChainEntry[] }>('/billing/receipt-chain', { limit: 100 });
      // api.get gibt ApiResponse zurück, wobei response.data das Backend-Response ist
      const backendResponse = response.data as { success: boolean; data: ReceiptChainEntry[] };
      if (backendResponse.success && backendResponse.data) {
        setReceiptChain(backendResponse.data);
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der Belegverkettung:', error);
    }
  };

  const handleCreateStartReceipt = async (cashRegisterId: string) => {
    try {
      setLoading(true);
      const response = await api.post(`/billing/cash-registers/${cashRegisterId}/start-receipt`, {});
      if (response.success) {
        setSnackbar({ open: true, message: 'Startbeleg erfolgreich erstellt', severity: 'success' });
        loadCashRegisters();
        loadReceiptChain();
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Fehler beim Erstellen des Startbelegs', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMonthlyReceipt = async (cashRegisterId: string) => {
    try {
      setLoading(true);
      const now = new Date();
      const response = await api.post(`/billing/cash-registers/${cashRegisterId}/monthly-receipt`, {
        year: now.getFullYear(),
        month: now.getMonth() + 1
      });
      if (response.success) {
        setSnackbar({ open: true, message: 'Monatsbeleg erfolgreich erstellt', severity: 'success' });
        loadReceiptChain();
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Fehler beim Erstellen des Monatsbelegs', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateYearlyReceipt = async (cashRegisterId: string) => {
    try {
      setLoading(true);
      const response = await api.post(`/billing/cash-registers/${cashRegisterId}/yearly-receipt`, {
        year: new Date().getFullYear()
      });
      if (response.success) {
        setSnackbar({ open: true, message: 'Jahresbeleg erfolgreich erstellt', severity: 'success' });
        loadReceiptChain();
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Fehler beim Erstellen des Jahresbelegs', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterFinanzOnline = async (cashRegisterId: string) => {
    try {
      setLoading(true);
      const response = await api.post(`/billing/cash-registers/${cashRegisterId}/register-finanzonline`, {
        taxNumber: '', // TODO: Aus User/Ordination laden
        location: ''
      });
      if (response.success) {
        setSnackbar({ open: true, message: 'Registrierkasse erfolgreich bei FinanzOnline registriert', severity: 'success' });
        loadCashRegisters();
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Fehler bei FinanzOnline-Registrierung', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCashRegister = async () => {
    try {
      setLoading(true);
      const response = await api.post('/billing/cash-registers', {
        cashBoxId: newRegister.cashBoxId,
        locationId: newRegister.locationId || undefined,
        tse: {
          provider: newRegister.tseProvider,
          serialNumber: newRegister.tseSerialNumber || undefined,
          publicKey: newRegister.tsePublicKey || undefined,
          secret: newRegister.tseSecret || undefined,
          apiKey: newRegister.tseApiKey || undefined,
          apiSecret: newRegister.tseApiSecret || undefined,
          endpoint: newRegister.tseEndpoint || undefined,
          testMode: newRegister.testMode,
          sandboxEndpoint: newRegister.sandboxEndpoint || undefined
        }
      });
      if (response.success) {
        setSnackbar({ open: true, message: 'Registrierkasse erfolgreich erstellt', severity: 'success' });
        setOpenDialog(false);
        setNewRegister({
          cashBoxId: '',
          locationId: '',
          tseProvider: 'software',
          tseSerialNumber: '',
          tsePublicKey: '',
          tseSecret: '',
          tseApiKey: '',
          tseApiSecret: '',
          tseEndpoint: '',
          testMode: false,
          sandboxEndpoint: ''
        });
        loadCashRegisters();
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Fehler beim Erstellen der Registrierkasse', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getReceiptTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      start: 'Startbeleg',
      normal: 'Normal',
      monthly: 'Monatsbeleg',
      yearly: 'Jahresbeleg',
      storno: 'Storno',
      hausbesuch: 'Hausbesuch'
    };
    return labels[type] || type;
  };

  const handleCreateTestReceipt = async () => {
    try {
      setLoading(true);
      const response = await api.post<{ success: boolean; data: { receipt: any; qrCode: string; validation: any } }>('/billing/test-receipt', {
        amount: 10000, // 100.00 EUR in Cent
        cashBoxId: 'TEST-CASHBOX-1'
      });
      // api.post gibt ApiResponse zurück, wobei response.data das Backend-Response ist
      const backendResponse = response.data as { success: boolean; data: { receipt: any; qrCode: string; validation: any } };
      if (backendResponse.success) {
        setSnackbar({ open: true, message: 'Test-Beleg erfolgreich erstellt', severity: 'success' });
        setTestDialogOpen(false);
        loadReceiptChain();
        // Zeige Validierungsergebnis
        if (backendResponse.data?.validation) {
          setValidationResult(backendResponse.data.validation);
          setValidationDialogOpen(true);
        }
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Fehler bei Test-Beleg-Erstellung', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleValidateReceipt = async (receipt: ReceiptChainEntry) => {
    try {
      setLoading(true);
      const response = await api.post<{ success: boolean; data: any }>('/billing/validate-receipt', {
        receiptChainId: receipt._id
      });
      // api.post gibt ApiResponse zurück, wobei response.data das Backend-Response ist
      const backendResponse = response.data as { success: boolean; data: any };
      if (backendResponse.success) {
        setValidationResult(backendResponse.data);
        setValidationDialogOpen(true);
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Fehler bei Validierung', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const _handleValidateQRCode = async (qrCodeData: string) => {
    try {
      setLoading(true);
      const response = await api.post<{ success: boolean; data: any }>('/billing/validate-qr-code', {
        qrCodeData
      });
      // api.post gibt ApiResponse zurück, wobei response.data das Backend-Response ist
      const backendResponse = response.data as { success: boolean; data: any };
      if (backendResponse.success) {
        setValidationResult(backendResponse.data);
        setValidationDialogOpen(true);
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Fehler bei QR-Code-Validierung', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Registrierkassen-Verwaltung
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Verwaltung von Registrierkassen, TSE-Konfiguration und automatischen Belegen
          </Typography>
        </Box>
        <Tooltip title="Hilfe & Leitfaden">
          <IconButton
            onClick={() => setHelpDialogOpen(true)}
            color="primary"
          >
            <HelpOutline />
          </IconButton>
        </Tooltip>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">Registrierkassen</Typography>
              <Tooltip title="Hilfe & Leitfaden">
                <IconButton
                  onClick={() => setHelpDialogRegistersOpen(true)}
                  color="primary"
                  size="small"
                >
                  <HelpOutline />
                </IconButton>
              </Tooltip>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
            >
              Neue Registrierkasse
            </Button>
          </Box>

          {loading && <CircularProgress sx={{ mb: 2 }} />}

          {cashRegisters.length === 0 ? (
            <Alert severity="info">
              Keine Registrierkassen vorhanden. Bitte erstellen Sie eine neue Registrierkasse.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Kassennummer</TableCell>
                    <TableCell>TSE-Provider</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Signature Counter</TableCell>
                    <TableCell>FinanzOnline</TableCell>
                    <TableCell>Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cashRegisters.map((register) => (
                    <TableRow key={register._id}>
                      <TableCell>{register.cashBoxId}</TableCell>
                      <TableCell>
                        <Chip label={register.tse.provider} size="small" />
                      </TableCell>
                      <TableCell>
                        {register.tse.initialized ? (
                          <Chip icon={<CheckCircle />} label="Initialisiert" color="success" size="small" />
                        ) : (
                          <Chip icon={<ErrorIcon />} label="Nicht initialisiert" color="warning" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{register.signatureCounter}</TableCell>
                      <TableCell>
                        {register.finanzOnline.registered ? (
                          <Chip label="Registriert" color="success" size="small" />
                        ) : (
                          <Chip label="Nicht registriert" color="default" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {!register.tse.initialized && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleCreateStartReceipt(register._id)}
                              disabled={loading}
                            >
                              Startbeleg
                            </Button>
                          )}
                          {register.tse.initialized && (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<CalendarToday />}
                                onClick={() => handleCreateMonthlyReceipt(register._id)}
                                disabled={loading}
                              >
                                Monatsbeleg
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<CalendarToday />}
                                onClick={() => handleCreateYearlyReceipt(register._id)}
                                disabled={loading}
                              >
                                Jahresbeleg
                              </Button>
                            </>
                          )}
                          {register.tse.initialized && !register.finanzOnline.registered && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleRegisterFinanzOnline(register._id)}
                              disabled={loading}
                            >
                              FinanzOnline
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Belegverkettung (DEP)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Chronologische, unveränderbare Speicherung aller Belege
                </Typography>
              </Box>
              <Tooltip title="Hilfe & Leitfaden">
                <IconButton
                  onClick={() => setHelpDialogReceiptChainOpen(true)}
                  color="primary"
                  size="small"
                >
                  <HelpOutline />
                </IconButton>
              </Tooltip>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Science />}
              onClick={() => setTestDialogOpen(true)}
              color="secondary"
            >
              Test-Beleg erstellen
            </Button>
          </Box>

          {receiptChain.length === 0 ? (
            <Alert severity="info">Keine Belege vorhanden</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Beleg-Nr.</TableCell>
                    <TableCell>Typ</TableCell>
                    <TableCell>Betrag</TableCell>
                    <TableCell>Datum</TableCell>
                    <TableCell>Signature Counter</TableCell>
                    <TableCell>Barumsatz</TableCell>
                    <TableCell>Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receiptChain.map((receipt) => (
                    <TableRow key={receipt._id}>
                      <TableCell>{receipt.receiptNumber}</TableCell>
                      <TableCell>
                        <Chip label={getReceiptTypeLabel(receipt.receiptType)} size="small" />
                      </TableCell>
                      <TableCell>
                        {(receipt.receiptData.amount / 100).toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        {new Date(receipt.receiptData.timestamp).toLocaleDateString('de-AT')}
                      </TableCell>
                      <TableCell>{receipt.tseSignature.signatureCounter}</TableCell>
                      <TableCell>
                        {receipt.isCashTransaction ? (
                          <Chip label="Ja" color="success" size="small" />
                        ) : (
                          <Chip label="Nein" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Verified />}
                          onClick={() => handleValidateReceipt(receipt)}
                          disabled={loading}
                        >
                          Validieren
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog für neue Registrierkasse */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Neue Registrierkasse</Typography>
            <Tooltip title="Konfigurationshilfe">
              <IconButton
                onClick={() => setHelpDialogConfigOpen(true)}
                color="primary"
                size="small"
              >
                <HelpOutline />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Kassennummer (CashBoxId)"
              value={newRegister.cashBoxId}
              onChange={(e) => setNewRegister({ ...newRegister, cashBoxId: e.target.value })}
              required
            />
            <FormControl fullWidth>
              <InputLabel>TSE-Provider</InputLabel>
              <Select
                value={newRegister.tseProvider}
                onChange={(e) => setNewRegister({ ...newRegister, tseProvider: e.target.value })}
                label="TSE-Provider"
              >
                <MenuItem value="software">Software (Entwicklung)</MenuItem>
                <MenuItem value="fiskaly">Fiskaly Cloud</MenuItem>
                <MenuItem value="fiskaltrust">Fiskaltrust Cloud</MenuItem>
                <MenuItem value="a-trust">A-Trust Cloud</MenuItem>
                <MenuItem value="hardware">Hardware TSE</MenuItem>
              </Select>
            </FormControl>
            {(newRegister.tseProvider === 'fiskaly' || newRegister.tseProvider === 'fiskaltrust' || newRegister.tseProvider === 'a-trust') && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Test-Modus</InputLabel>
                  <Select
                    value={newRegister.testMode ? 'yes' : 'no'}
                    onChange={(e) => setNewRegister({ ...newRegister, testMode: e.target.value === 'yes' })}
                    label="Test-Modus"
                  >
                    <MenuItem value="yes">Ja (Sandbox)</MenuItem>
                    <MenuItem value="no">Nein (Production)</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="API Key"
                  value={newRegister.tseApiKey}
                  onChange={(e) => setNewRegister({ ...newRegister, tseApiKey: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="API Secret"
                  type="password"
                  value={newRegister.tseApiSecret}
                  onChange={(e) => setNewRegister({ ...newRegister, tseApiSecret: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="API Endpoint (Production)"
                  value={newRegister.tseEndpoint}
                  onChange={(e) => setNewRegister({ ...newRegister, tseEndpoint: e.target.value })}
                  placeholder="https://api.example.com"
                />
                {newRegister.testMode && (
                  <TextField
                    fullWidth
                    label="Sandbox Endpoint (optional)"
                    value={newRegister.sandboxEndpoint}
                    onChange={(e) => setNewRegister({ ...newRegister, sandboxEndpoint: e.target.value })}
                    placeholder="https://sandbox.example.com"
                    helperText="Falls leer, wird automatisch Test-Endpoint verwendet"
                  />
                )}
              </>
            )}
            <TextField
              fullWidth
              label="TSE Serial Number"
              value={newRegister.tseSerialNumber}
              onChange={(e) => setNewRegister({ ...newRegister, tseSerialNumber: e.target.value })}
            />
            <TextField
              fullWidth
              label="TSE Public Key"
              value={newRegister.tsePublicKey}
              onChange={(e) => setNewRegister({ ...newRegister, tsePublicKey: e.target.value })}
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="TSE Secret"
              type="password"
              value={newRegister.tseSecret}
              onChange={(e) => setNewRegister({ ...newRegister, tseSecret: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Abbrechen</Button>
          <Button onClick={handleCreateCashRegister} variant="contained" disabled={!newRegister.cashBoxId || loading}>
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog für Test-Beleg */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Science />
            Test-Beleg erstellen
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Erstellt einen Test-Beleg für Validierung mit BMF Belegcheck-App und A-SIT Plus Tools.
            Dieser Beleg verwendet Software-Signatur und ist nur für Tests gedacht.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Der Test-Beleg wird mit einem Betrag von 100,00 EUR erstellt und kann sofort validiert werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleCreateTestReceipt} variant="contained" disabled={loading}>
            Test-Beleg erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog für Validierungsergebnis */}
      <Dialog open={validationDialogOpen} onClose={() => setValidationDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Verified />
            Validierungsergebnis
          </Box>
        </DialogTitle>
        <DialogContent>
          {validationResult && (
            <Box sx={{ mt: 2 }}>
              <Alert 
                severity={validationResult.overall?.valid ? 'success' : 'error'} 
                sx={{ mb: 2 }}
              >
                {validationResult.overall?.valid 
                  ? 'Beleg ist gültig (BMF Belegcheck-App & A-SIT Plus konform)'
                  : 'Beleg ist ungültig'}
              </Alert>

              {validationResult.overall?.errors && validationResult.overall.errors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Fehler:</Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validationResult.overall.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              {validationResult.qrCode && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>QR-Code-Validierung (BMF Belegcheck-App)</Typography>
                    <Chip 
                      label={validationResult.qrCode.valid ? 'Gültig' : 'Ungültig'} 
                      color={validationResult.qrCode.valid ? 'success' : 'error'} 
                      sx={{ mb: 1 }}
                    />
                    {validationResult.qrCode.message && (
                      <Typography variant="body2" color="text.secondary">
                        {validationResult.qrCode.message}
                      </Typography>
                    )}
                    {validationResult.qrCode.errors && validationResult.qrCode.errors.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {validationResult.qrCode.errors.map((error: string, index: number) => (
                          <Typography key={index} variant="body2" color="error">
                            • {error}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}

              {validationResult.tseSignature && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>TSE-Signatur-Validierung (A-SIT Plus)</Typography>
                    <Chip 
                      label={validationResult.tseSignature.valid ? 'Gültig' : 'Ungültig'} 
                      color={validationResult.tseSignature.valid ? 'success' : 'error'} 
                      sx={{ mb: 1 }}
                    />
                    {validationResult.tseSignature.message && (
                      <Typography variant="body2" color="text.secondary">
                        {validationResult.tseSignature.message}
                      </Typography>
                    )}
                    {validationResult.tseSignature.details && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          <strong>Algorithmus:</strong> {validationResult.tseSignature.details.algorithm}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Counter:</strong> {validationResult.tseSignature.details.counter}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Serial:</strong> {validationResult.tseSignature.details.serial}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Timestamp:</strong> {new Date(validationResult.tseSignature.details.timestamp).toLocaleString('de-AT')}
                        </Typography>
                      </Box>
                    )}
                    {validationResult.tseSignature.errors && validationResult.tseSignature.errors.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {validationResult.tseSignature.errors.map((error: string, index: number) => (
                          <Typography key={index} variant="body2" color="error">
                            • {error}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}

              {validationResult.receiptChain && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Belegverkettung-Validierung</Typography>
                    <Chip 
                      label={validationResult.receiptChain.valid ? 'Gültig' : 'Ungültig'} 
                      color={validationResult.receiptChain.valid ? 'success' : 'error'} 
                      sx={{ mb: 1 }}
                    />
                    {validationResult.receiptChain.message && (
                      <Typography variant="body2" color="text.secondary">
                        {validationResult.receiptChain.message}
                      </Typography>
                    )}
                    {validationResult.receiptChain.errors && validationResult.receiptChain.errors.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {validationResult.receiptChain.errors.map((error: string, index: number) => (
                          <Typography key={index} variant="body2" color="error">
                            • {error}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValidationDialogOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />

      {/* Hilfe-Dialog für Registrierkassen */}
      <Dialog 
        open={helpDialogRegistersOpen} 
        onClose={() => setHelpDialogRegistersOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { minHeight: '600px' }
        }}
      >
        <GradientDialogTitle 
          title="Leitfaden: Registrierkassen" 
          onClose={() => setHelpDialogRegistersOpen(false)}
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
            <Tab label="Registrierkasse erstellen" />
            <Tab label="TSE konfigurieren" />
            <Tab label="Status & Aktionen" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Registrierkassen
                </Typography>
                <Typography variant="body1" paragraph>
                  Registrierkassen sind elektronische Kassensysteme, die gemäß RKSVO 
                  (Registrierkassensicherheitsverordnung) betrieben werden müssen. 
                  Jede Registrierkasse benötigt eine TSE (Technische Sicherheitseinrichtung).
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>🏪 <strong>Registrierkassen verwalten:</strong> Erstellen, bearbeiten, aktivieren</li>
                  <li>🔐 <strong>TSE konfigurieren:</strong> Technische Sicherheitseinrichtung einrichten</li>
                  <li>✅ <strong>Status überwachen:</strong> TSE-Status, FinanzOnline-Registrierung</li>
                  <li>🧾 <strong>Belege erstellen:</strong> Start-, Monats-, Jahresbelege</li>
                  <li>🌐 <strong>FinanzOnline:</strong> Registrierung bei FinanzOnline</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Angezeigte Informationen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Kassennummer:</strong> Eindeutige Identifikation (CashBox-ID)</li>
                  <li><strong>TSE-Provider:</strong> Art der TSE (Software, Fiskaly, etc.)</li>
                  <li><strong>Status:</strong> Initialisiert oder nicht initialisiert</li>
                  <li><strong>Signature Counter:</strong> Anzahl der erstellten Signaturen</li>
                  <li><strong>FinanzOnline:</strong> Registrierungsstatus</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Neue Registrierkasse erstellen
                </Typography>
                <Typography variant="body2" paragraph>
                  So erstellen Sie eine neue Registrierkasse:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt Anleitung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Neue Registrierkasse"</li>
                  <li>Geben Sie die Kassennummer (CashBox-ID) ein</li>
                  <li>Wählen Sie einen Standort aus (optional)</li>
                  <li>Wählen Sie den TSE-Provider aus</li>
                  <li>Konfigurieren Sie die TSE-Daten (siehe TSE-Konfiguration)</li>
                  <li>Klicken Sie auf "Erstellen"</li>
                  <li>Initialisieren Sie die TSE (Startbeleg erstellen)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Erforderliche Felder
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Kassennummer (CashBox-ID):</strong> Eindeutige Identifikation, z.B. "KASSE-001"</li>
                  <li><strong>TSE-Provider:</strong> Muss ausgewählt werden</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Optionale Felder
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Standort:</strong> Standort, an dem die Kasse verwendet wird</li>
                  <li><strong>TSE Serial Number:</strong> Seriennummer der TSE (falls vorhanden)</li>
                  <li><strong>TSE Public Key:</strong> Öffentlicher Schlüssel der TSE</li>
                  <li><strong>TSE Secret:</strong> Geheimer Schlüssel der TSE</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  TSE konfigurieren
                </Typography>
                <Typography variant="body2" paragraph>
                  Die TSE (Technische Sicherheitseinrichtung) muss für jeden TSE-Provider 
                  unterschiedlich konfiguriert werden. Für detaillierte Anleitungen siehe 
                  den Konfigurations-Dialog beim Erstellen einer neuen Registrierkasse.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Verfügbare TSE-Provider
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Software:</strong> Für Entwicklung und Tests</li>
                  <li><strong>Fiskaly Cloud:</strong> Cloud-basierte TSE</li>
                  <li><strong>Fiskaltrust Cloud:</strong> Cloud-basierte TSE</li>
                  <li><strong>A-Trust Cloud:</strong> Cloud-basierte TSE</li>
                  <li><strong>Hardware:</strong> Hardware-basierte TSE</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Status & Aktionen
                </Typography>
                <Typography variant="body2" paragraph>
                  Der Status einer Registrierkasse bestimmt, welche Aktionen verfügbar sind.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Status-Arten
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>
                    <Chip label="Nicht initialisiert" color="warning" size="small" sx={{ mr: 1 }} />
                    <strong>Nicht initialisiert:</strong> TSE muss noch initialisiert werden
                    <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                      <li>Verfügbare Aktion: "Startbeleg" erstellen</li>
                      <li>Startbeleg initialisiert die TSE</li>
                    </Box>
                  </li>
                  <li>
                    <Chip label="Initialisiert" color="success" size="small" sx={{ mr: 1 }} />
                    <strong>Initialisiert:</strong> TSE ist bereit für Belege
                    <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                      <li>Verfügbare Aktionen: "Monatsbeleg", "Jahresbeleg"</li>
                      <li>Normale Belege können erstellt werden</li>
                    </Box>
                  </li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Verfügbare Aktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Startbeleg:</strong> Nur wenn TSE nicht initialisiert</li>
                  <li><strong>Monatsbeleg:</strong> Nur wenn TSE initialisiert</li>
                  <li><strong>Jahresbeleg:</strong> Nur wenn TSE initialisiert</li>
                  <li><strong>FinanzOnline:</strong> Nur wenn TSE initialisiert und nicht registriert</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Registrierkasse einrichten
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Eindeutige Kassennummer:</strong> Verwenden Sie eindeutige IDs</li>
                  <li>✅ <strong>Korrekter TSE-Provider:</strong> Wählen Sie den richtigen Provider</li>
                  <li>✅ <strong>Test-Modus:</strong> Nur für Entwicklung verwenden</li>
                  <li>✅ <strong>TSE initialisieren:</strong> Erstellen Sie Startbeleg nach Erstellung</li>
                  <li>✅ <strong>FinanzOnline:</strong> Registrieren Sie bei FinanzOnline</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Sicherheit
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>🔐 <strong>API-Secrets:</strong> Geheim halten, nicht weitergeben</li>
                  <li>🔐 <strong>Produktion:</strong> Test-Modus in Produktion deaktivieren</li>
                  <li>🔐 <strong>Backup:</strong> Regelmäßige Backups erstellen</li>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogRegistersOpen(false)} variant="contained">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hilfe-Dialog für Belegverkettung */}
      <Dialog 
        open={helpDialogReceiptChainOpen} 
        onClose={() => setHelpDialogReceiptChainOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { minHeight: '600px' }
        }}
      >
        <GradientDialogTitle 
          title="Leitfaden: Belegverkettung (DEP)" 
          onClose={() => setHelpDialogReceiptChainOpen(false)}
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
            <Tab label="Belegarten" />
            <Tab label="Belegverkettung" />
            <Tab label="Validierung" />
            <Tab label="Test-Belege" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Was ist Belegverkettung (DEP)?
                </Typography>
                <Typography variant="body1" paragraph>
                  Die Belegverkettung (DEP - Digitale Erfassungsprotokollierung) ist eine 
                  chronologische, unveränderbare Speicherung aller Belege gemäß RKSVO.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>🧾 <strong>Belege speichern:</strong> Alle Belege werden unveränderlich gespeichert</li>
                  <li>🔗 <strong>Verkettung:</strong> Belege sind in einer Kette verknüpft</li>
                  <li>✅ <strong>Validierung:</strong> Belege können validiert werden</li>
                  <li>🔍 <strong>Übersicht:</strong> Chronologische Liste aller Belege</li>
                  <li>🧪 <strong>Test-Belege:</strong> Test-Belege für Validierung</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Belegarten
                </Typography>
                <Typography variant="body2" paragraph>
                  Das System unterstützt verschiedene Belegarten gemäß RKSVO.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Startbeleg
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Wann:</strong> Beim ersten Start der Kasse (TSE-Initialisierung)</li>
                  <li><strong>Zweck:</strong> Initialisiert die TSE und startet die Belegverkettung</li>
                  <li><strong>Erstellung:</strong> Automatisch oder manuell über "Startbeleg"-Button</li>
                  <li><strong>Gesetzlich:</strong> Vorgeschrieben</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Normalbeleg
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Wann:</strong> Bei jedem Verkauf/Vorgang</li>
                  <li><strong>Zweck:</strong> Dokumentation von Verkäufen</li>
                  <li><strong>Erstellung:</strong> Automatisch bei Rechnungszahlung</li>
                  <li><strong>Inhalt:</strong> Betrag, Datum, TSE-Signatur</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Monatsbeleg / Jahresbeleg
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Wann:</strong> Am Monats-/Jahresende</li>
                  <li><strong>Zweck:</strong> Zusammenfassung</li>
                  <li><strong>Erstellung:</strong> Über entsprechende Buttons</li>
                  <li><strong>Gesetzlich:</strong> Vorgeschrieben</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Belegverkettung
                </Typography>
                <Typography variant="body2" paragraph>
                  Die Belegverkettung ist eine unveränderliche Kette aller Belege, die 
                  Manipulationen verhindert und die Integrität sicherstellt.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Funktionsweise
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Jeder Beleg hat einen eindeutigen Hash-Wert</li>
                  <li>Jeder Beleg verweist auf den Hash des vorherigen Belegs</li>
                  <li>Eine Änderung würde die gesamte Kette ungültig machen</li>
                  <li>Die Kette ist unveränderlich und manipulationssicher</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Beleg-Validierung
                </Typography>
                <Typography variant="body2" paragraph>
                  Belege können auf verschiedene Weise validiert werden.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Validierungsmethoden
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>QR-Code-Validierung:</strong> Mit BMF Belegcheck-App</li>
                  <li><strong>TSE-Signatur-Validierung:</strong> Mit A-SIT Plus Tool</li>
                  <li><strong>Belegverkettung-Validierung:</strong> Prüft Hash-Verkettung</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Test-Belege
                </Typography>
                <Typography variant="body2" paragraph>
                  Test-Belege können erstellt werden, um die Funktionalität zu testen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Test-Beleg erstellen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Test-Beleg erstellen"</li>
                  <li>Ein Test-Beleg mit 100,00 EUR wird erstellt</li>
                  <li>Der Beleg kann sofort validiert werden</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 5 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Belege
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Erstellen Sie Startbeleg nach TSE-Initialisierung</li>
                  <li>✅ Erstellen Sie monatliche Belege regelmäßig</li>
                  <li>✅ Erstellen Sie jährliche Belege am Jahresende</li>
                  <li>✅ Validieren Sie Belege regelmäßig</li>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogReceiptChainOpen(false)} variant="contained">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hilfe-Dialog mit Leitfaden */}
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
          title="Leitfaden: Registrierkassen-Verwaltung" 
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
            <Tab label="Registrierkasse erstellen" />
            <Tab label="TSE" />
            <Tab label="Belegarten" />
            <Tab label="Belegverkettung" />
            <Tab label="FinanzOnline" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Was ist Registrierkassen-Verwaltung?
                </Typography>
                <Typography variant="body1" paragraph>
                  Die Registrierkassen-Verwaltung ermöglicht die Verwaltung von Registrierkassen, 
                  TSE (Technische Sicherheitseinrichtung), Belegen und der Belegverkettung gemäß 
                  der RKSVO (Registrierkassensicherheitsverordnung).
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>🏪 <strong>Registrierkassen verwalten:</strong> Erstellen, bearbeiten, aktivieren</li>
                  <li>🔐 <strong>TSE konfigurieren:</strong> Technische Sicherheitseinrichtung einrichten</li>
                  <li>🧾 <strong>Belege verwalten:</strong> Start-, Normal-, Monats-, Jahresbelege</li>
                  <li>🔗 <strong>Belegverkettung:</strong> Unveränderliche Kette aller Belege</li>
                  <li>🌐 <strong>FinanzOnline:</strong> Registrierung bei FinanzOnline</li>
                  <li>✅ <strong>Validierung:</strong> Beleg-Validierung und Prüfung</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Gesetzliche Grundlage
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>RKSVO:</strong> Registrierkassensicherheitsverordnung</li>
                  <li><strong>BAO:</strong> Bundesabgabenordnung</li>
                  <li><strong>DSGVO:</strong> Datenschutz-Grundverordnung</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Neue Registrierkasse erstellen
                </Typography>
                <Typography variant="body2" paragraph>
                  So erstellen Sie eine neue Registrierkasse:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt Anleitung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Neue Registrierkasse"</li>
                  <li>Geben Sie die Kassen-ID (CashBox-ID) ein</li>
                  <li>Wählen Sie einen Standort aus (optional)</li>
                  <li>Konfigurieren Sie die TSE (Provider, Daten)</li>
                  <li>Speichern Sie die Registrierkasse</li>
                  <li>Initialisieren Sie die TSE (falls erforderlich)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Erforderliche Informationen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Kassen-ID:</strong> Eindeutige Identifikation der Kasse</li>
                  <li><strong>Standort:</strong> Standort, an dem die Kasse verwendet wird</li>
                  <li><strong>TSE-Provider:</strong> Art der TSE (Software, Hardware, Cloud)</li>
                  <li><strong>TSE-Daten:</strong> Abhängig vom Provider</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  TSE (Technische Sicherheitseinrichtung)
                </Typography>
                <Typography variant="body2" paragraph>
                  Die TSE ist eine gesetzlich vorgeschriebene Einrichtung, die alle Belege 
                  elektronisch signiert und damit manipulationssicher macht.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Was ist eine TSE?
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Zertifizierte Hardware- oder Software-Lösung</li>
                  <li>Signiert alle Belege elektronisch</li>
                  <li>Führt einen Signatur-Zähler</li>
                  <li>Macht Belege manipulationssicher</li>
                  <li>Erfüllt gesetzliche Anforderungen</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  TSE-Initialisierung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Registrierkasse erstellen</li>
                  <li>TSE-Daten konfigurieren</li>
                  <li>TSE initialisieren</li>
                  <li>Initialisierungsstatus überprüfen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Belegarten
                </Typography>
                <Typography variant="body2" paragraph>
                  Das System unterstützt verschiedene Belegarten gemäß RKSVO.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Verfügbare Belegarten
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Startbeleg:</strong> Erster Beleg bei Kassenstart</li>
                  <li><strong>Normal:</strong> Reguläre Verkaufsbelege</li>
                  <li><strong>Monatsbeleg:</strong> Monatliche Zusammenfassung</li>
                  <li><strong>Jahresbeleg:</strong> Jährliche Zusammenfassung</li>
                  <li><strong>Storno:</strong> Stornierte Belege</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Belegverkettung
                </Typography>
                <Typography variant="body2" paragraph>
                  Die Belegverkettung ist eine unveränderliche Kette aller Belege, die 
                  Manipulationen verhindert und die Integrität sicherstellt.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Funktionsweise
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Jeder Beleg hat einen eindeutigen Hash</li>
                  <li>Jeder Beleg verweist auf den Hash des vorherigen Belegs</li>
                  <li>Eine Änderung würde die gesamte Kette ungültig machen</li>
                  <li>Die Kette ist unveränderlich und manipulationssicher</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 5 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  FinanzOnline-Registrierung
                </Typography>
                <Typography variant="body2" paragraph>
                  Registrierkassen können bei FinanzOnline registriert werden, um die 
                  gesetzlichen Anforderungen zu erfüllen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Registrierung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wählen Sie eine Registrierkasse aus</li>
                  <li>Klicken Sie auf "Bei FinanzOnline registrieren"</li>
                  <li>Geben Sie die Steuernummer ein</li>
                  <li>Die Registrierung wird durchgeführt</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 6 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Allgemeine Tipps
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Initialisieren Sie die TSE nach Erstellung</li>
                  <li>✅ Registrieren Sie die Kasse bei FinanzOnline</li>
                  <li>✅ Überprüfen Sie regelmäßig den TSE-Status</li>
                  <li>✅ Validieren Sie die Belegverkettung regelmäßig</li>
                  <li>✅ Erstellen Sie regelmäßig Backups</li>
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

export default CashRegisterManagement;

