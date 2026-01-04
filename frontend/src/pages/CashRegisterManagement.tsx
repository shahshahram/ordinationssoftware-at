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
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Chip,
  IconButton,
  CircularProgress,
  Grid,
  Divider
} from '@mui/material';
import {
  Add,
  QrCode,
  CalendarToday,
  Settings,
  CheckCircle,
  Error as ErrorIcon,
  Science,
  Verified,
  BugReport
} from '@mui/icons-material';
import api from '../utils/api';

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
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null);
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
  const [selectedReceiptForValidation, setSelectedReceiptForValidation] = useState<ReceiptChainEntry | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

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

  const handleValidateQRCode = async (qrCodeData: string) => {
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
      <Typography variant="h4" gutterBottom>
        Registrierkassen-Verwaltung
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Verwaltung von Registrierkassen, TSE-Konfiguration und automatischen Belegen
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Registrierkassen</Typography>
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
            <Box>
              <Typography variant="h6" gutterBottom>
                Belegverkettung (DEP)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Chronologische, unveränderbare Speicherung aller Belege
              </Typography>
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
        <DialogTitle>Neue Registrierkasse</DialogTitle>
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
    </Box>
  );
};

export default CashRegisterManagement;

