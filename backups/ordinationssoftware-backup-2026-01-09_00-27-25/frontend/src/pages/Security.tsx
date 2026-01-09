import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Security as SecurityIcon,
  Lock,
  LockOpen,
  QrCode,
  Download,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Warning,
  Error,
  Info,
  Refresh,
  History,
  Shield
} from '@mui/icons-material';
import axios from 'axios';
import { useAppSelector } from '../store/hooks';

interface SecurityStatus {
  twoFactorEnabled: boolean;
  passwordChangeRequired: boolean;
  accountLocked: boolean;
  remainingLockoutTime: number;
  lastLogin: string;
  lastLoginIP: string;
  failedAttempts: number;
  sessionTimeout: number;
}

interface TwoFAStatus {
  enabled: boolean;
  configured: boolean;
  remainingBackupCodes: number;
}

interface AuditLog {
  _id: string;
  action: string;
  description: string;
  timestamp: string;
  severity: string;
  success: boolean;
  ipAddress: string;
  userEmail: string;
}

const Security: React.FC = () => {
  const { token } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState(0);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [twoFAStatus, setTwoFAStatus] = useState<TwoFAStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });

  // 2FA Setup Dialog
  const [twoFADialog, setTwoFADialog] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationToken, setVerificationToken] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Password Change Dialog
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchSecurityData();
  }, [token]);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const [statusRes, twoFARes, auditRes] = await Promise.all([
        axios.get('http://localhost:5001/api/auth/security-status', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5001/api/auth/2fa/status', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5001/api/audit-logs?limit=20', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setSecurityStatus(statusRes.data.securityStatus);
      setTwoFAStatus(twoFARes.data);
      setAuditLogs(auditRes.data.data || []);
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Fehler beim Laden der Sicherheitsdaten', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5001/api/auth/2fa/setup', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setQrCode(response.data.qrCode);
      setBackupCodes(response.data.backupCodes);
      setTwoFADialog(true);
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Fehler beim 2FA-Setup', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationToken || verificationToken.length !== 6) {
      setSnackbar({ open: true, message: 'Bitte geben Sie einen gültigen 6-stelligen Token ein', severity: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5001/api/auth/2fa/verify', { token: verificationToken }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSnackbar({ open: true, message: '2FA erfolgreich aktiviert!', severity: 'success' });
      setTwoFADialog(false);
      setVerificationToken('');
      fetchSecurityData();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Fehler bei der 2FA-Verifikation', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Sind Sie sicher, dass Sie 2FA deaktivieren möchten? Dies reduziert die Sicherheit Ihres Accounts.')) {
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5001/api/auth/2fa/disable', { password: passwordData.currentPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSnackbar({ open: true, message: '2FA erfolgreich deaktiviert', severity: 'success' });
      fetchSecurityData();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Fehler beim Deaktivieren von 2FA', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSnackbar({ open: true, message: 'Passwörter stimmen nicht überein', severity: 'warning' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setSnackbar({ open: true, message: 'Neues Passwort muss mindestens 6 Zeichen lang sein', severity: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await axios.put('http://localhost:5001/api/auth/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSnackbar({ open: true, message: 'Passwort erfolgreich geändert', severity: 'success' });
      setPasswordDialog(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      fetchSecurityData();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Fehler beim Ändern des Passworts', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <Error />;
      case 'HIGH': return <Warning />;
      case 'MEDIUM': return <Info />;
      case 'LOW': return <CheckCircle />;
      default: return <Info />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE');
  };

  const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <SecurityIcon color="primary" />
        Sicherheitscenter
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Übersicht" icon={<Shield />} />
          <Tab label="2FA-Verwaltung" icon={<Lock />} />
          <Tab label="Passwort" icon={<Lock />} />
          <Tab label="Audit-Logs" icon={<History />} />
        </Tabs>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <CircularProgress />
        </Box>
      )}

      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon color="primary" />
                  Sicherheitsstatus
                </Typography>
                {securityStatus && (
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        {securityStatus.twoFactorEnabled ? <CheckCircle color="success" /> : <Warning color="warning" />}
                      </ListItemIcon>
                      <ListItemText
                        primary="Zwei-Faktor-Authentifizierung"
                        secondary={securityStatus.twoFactorEnabled ? 'Aktiviert' : 'Nicht aktiviert'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        {securityStatus.passwordChangeRequired ? <Warning color="warning" /> : <CheckCircle color="success" />}
                      </ListItemIcon>
                      <ListItemText
                        primary="Passwort-Status"
                        secondary={securityStatus.passwordChangeRequired ? 'Änderung erforderlich' : 'Aktuell'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        {securityStatus.accountLocked ? <Error color="error" /> : <CheckCircle color="success" />}
                      </ListItemIcon>
                      <ListItemText
                        primary="Account-Status"
                        secondary={securityStatus.accountLocked ? `Gesperrt (${securityStatus.remainingLockoutTime} Min.)` : 'Aktiv'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Letzter Login"
                        secondary={securityStatus.lastLogin ? formatDate(securityStatus.lastLogin) : 'Nie'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Letzte IP-Adresse"
                        secondary={securityStatus.lastLoginIP || 'Unbekannt'}
                      />
                    </ListItem>
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Schnellaktionen
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Lock />}
                    onClick={handleSetup2FA}
                    disabled={loading || twoFAStatus?.enabled}
                  >
                    {twoFAStatus?.enabled ? '2FA bereits aktiviert' : '2FA einrichten'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Lock />}
                    onClick={() => setPasswordDialog(true)}
                    disabled={loading}
                  >
                    Passwort ändern
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchSecurityData}
                    disabled={loading}
                  >
                    Aktualisieren
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lock color="primary" />
              Zwei-Faktor-Authentifizierung
            </Typography>
            
            {twoFAStatus && (
              <Box sx={{ mb: 3 }}>
                <Alert severity={twoFAStatus.enabled ? 'success' : 'warning'} sx={{ mb: 2 }}>
                  {twoFAStatus.enabled 
                    ? '2FA ist aktiviert und schützt Ihren Account'
                    : '2FA ist nicht aktiviert. Aktivieren Sie es für zusätzliche Sicherheit.'
                  }
                </Alert>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {!twoFAStatus.enabled ? (
                    <Button
                      variant="contained"
                      startIcon={<QrCode />}
                      onClick={handleSetup2FA}
                      disabled={loading}
                    >
                      2FA einrichten
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<LockOpen />}
                      onClick={handleDisable2FA}
                      disabled={loading}
                    >
                      2FA deaktivieren
                    </Button>
                  )}
                </Box>

                {twoFAStatus.enabled && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Verbleibende Backup-Codes: {twoFAStatus.remainingBackupCodes}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lock color="primary" />
              Passwort-Verwaltung
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Ändern Sie Ihr Passwort regelmäßig für maximale Sicherheit. Ein starkes Passwort sollte mindestens 8 Zeichen lang sein und eine Mischung aus Buchstaben, Zahlen und Sonderzeichen enthalten.
            </Alert>

            <Button
              variant="contained"
              startIcon={<Lock />}
              onClick={() => setPasswordDialog(true)}
              disabled={loading}
            >
              Passwort ändern
            </Button>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <History color="primary" />
              Audit-Logs
            </Typography>
            
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Zeitstempel</TableCell>
                    <TableCell>Aktion</TableCell>
                    <TableCell>Beschreibung</TableCell>
                    <TableCell>Schweregrad</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>IP-Adresse</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell>{formatDate(log.timestamp)}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.description}</TableCell>
                      <TableCell>
                        <Chip
                          icon={getSeverityIcon(log.severity)}
                          label={log.severity}
                          color={getSeverityColor(log.severity) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.success ? 'Erfolg' : 'Fehler'}
                          color={log.success ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{log.ipAddress}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* 2FA Setup Dialog */}
      <Dialog open={twoFADialog} onClose={() => setTwoFADialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>2FA einrichten</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Scannen Sie den QR-Code mit Ihrer Authenticator-App (z.B. Google Authenticator, Authy):
          </Typography>
          
          {qrCode && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <img src={qrCode} alt="2FA QR Code" style={{ maxWidth: '200px' }} />
            </Box>
          )}

          <TextField
            label="6-stelliger Code"
            value={verificationToken}
            onChange={(e) => setVerificationToken(e.target.value)}
            fullWidth
            margin="normal"
            inputProps={{ maxLength: 6 }}
          />

          {showBackupCodes ? (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Backup-Codes (sicher aufbewahren!)
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Diese Codes können verwendet werden, wenn Sie Ihr Telefon verlieren:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {backupCodes.map((code, index) => (
                  <Chip key={index} label={code} variant="outlined" />
                ))}
              </Box>
            </Box>
          ) : (
            <Button
              variant="outlined"
              onClick={() => setShowBackupCodes(true)}
              sx={{ mt: 2 }}
            >
              Backup-Codes anzeigen
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTwoFADialog(false)}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={handleVerify2FA}
            disabled={loading || verificationToken.length !== 6}
          >
            {loading ? <CircularProgress size={24} /> : 'Verifizieren & Aktivieren'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Passwort ändern</DialogTitle>
        <DialogContent>
          <TextField
            label="Aktuelles Passwort"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Neues Passwort"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Neues Passwort bestätigen"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog(false)}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
          >
            {loading ? <CircularProgress size={24} /> : 'Passwort ändern'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Security;
