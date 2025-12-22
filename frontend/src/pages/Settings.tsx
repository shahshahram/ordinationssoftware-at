import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControlLabel,
  Checkbox,
  Button,
  Alert,
  Divider,
  Switch,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  IconButton,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Send,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../store/hooks';
import { loadUser } from '../store/slices/authSlice';
import api from '../utils/api';
import UpdateMonitoring from '../components/UpdateMonitoring';

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useSelector((state: any) => state.auth);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State für Einstellungen
  const [autoBillingEnabled, setAutoBillingEnabled] = useState(false);
  const [eldaEnabled, setEldaEnabled] = useState(false);
  const [eldaMethod, setEldaMethod] = useState('ftps');
  const [eldaEnvironment, setEldaEnvironment] = useState('test');
  const [eldaStatus, setEldaStatus] = useState<any>(null);
  const [wahonlineEnabled, setWahonlineEnabled] = useState(false);
  const [wahonlineStatus, setWahonlineStatus] = useState<any>(null);

  // E-Mail-Konfiguration State
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailProvider, setEmailProvider] = useState<string>('custom');
  const [smtpHost, setSmtpHost] = useState<string>('');
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpSecure, setSmtpSecure] = useState<boolean>(false);
  const [smtpUser, setSmtpUser] = useState<string>('');
  const [smtpPassword, setSmtpPassword] = useState<string>('');
  const [smtpFrom, setSmtpFrom] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [testEmailAddress, setTestEmailAddress] = useState<string>('');
  const [testEmailLoading, setTestEmailLoading] = useState<boolean>(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // SMS-Konfiguration State
  const [smsProvider, setSmsProvider] = useState<string>('seven');
  const [sevenApiKey, setSevenApiKey] = useState<string>('');
  const [sevenFrom, setSevenFrom] = useState<string>('Ordination');
  const [twilioAccountSid, setTwilioAccountSid] = useState<string>('');
  const [twilioAuthToken, setTwilioAuthToken] = useState<string>('');
  const [twilioFromNumber, setTwilioFromNumber] = useState<string>('');
  const [websmsUsername, setWebsmsUsername] = useState<string>('');
  const [websmsPassword, setWebsmsPassword] = useState<string>('');
  const [showSmsPassword, setShowSmsPassword] = useState<boolean>(false);
  const [smsLoading, setSmsLoading] = useState<boolean>(false);
  const [smsSuccess, setSmsSuccess] = useState<boolean>(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [testSmsNumber, setTestSmsNumber] = useState<string>('');
  const [testSmsLoading, setTestSmsLoading] = useState<boolean>(false);
  const [testSmsResult, setTestSmsResult] = useState<{ success: boolean; message: string } | null>(null);

  // Lade aktuelle Einstellungen
  useEffect(() => {
    if (user?.profile?.preferences?.autoBillingEnabled !== undefined) {
      setAutoBillingEnabled(user.profile.preferences.autoBillingEnabled);
    }
    if (user?.profile?.preferences?.eldaEnabled !== undefined) {
      setEldaEnabled(user.profile.preferences.eldaEnabled);
    }
    if (user?.profile?.preferences?.eldaMethod !== undefined) {
      setEldaMethod(user.profile.preferences.eldaMethod);
    }
    if (user?.profile?.preferences?.eldaEnvironment !== undefined) {
      setEldaEnvironment(user.profile.preferences.eldaEnvironment);
    }
    if (user?.profile?.preferences?.wahonlineEnabled !== undefined) {
      setWahonlineEnabled(user.profile.preferences.wahonlineEnabled);
    }
    loadELDAStatus();
    loadWAHonlineStatus();
    loadEmailSettings();
    loadSmsSettings();
  }, [user]);

  const loadEmailSettings = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any }>('/settings/email');
      if (response.data.success && response.data.data) {
        const config = response.data.data;
        setEmailProvider(config.provider || 'custom');
        setSmtpHost(config.smtp?.host || '');
        setSmtpPort(config.smtp?.port || 587);
        setSmtpSecure(config.smtp?.secure || false);
        setSmtpUser(config.smtp?.user || '');
        setSmtpPassword(config.smtp?.password === '***ENCRYPTED***' ? '' : (config.smtp?.password || ''));
        setSmtpFrom(config.smtp?.from || '');
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der E-Mail-Konfiguration:', error);
    }
  };

  const loadSmsSettings = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any }>('/settings/sms');
      if (response.data.success && response.data.data) {
        const config = response.data.data;
        setSmsProvider(config.provider || 'seven');
        setSevenApiKey(config.seven?.apiKey === '***ENCRYPTED***' ? '' : (config.seven?.apiKey || ''));
        setSevenFrom(config.seven?.from || 'Ordination');
        setTwilioAccountSid(config.twilio?.accountSid === '***ENCRYPTED***' ? '' : (config.twilio?.accountSid || ''));
        setTwilioAuthToken(config.twilio?.authToken === '***ENCRYPTED***' ? '' : (config.twilio?.authToken || ''));
        setTwilioFromNumber(config.twilio?.fromNumber || '');
        setWebsmsUsername(config.websms?.username === '***ENCRYPTED***' ? '' : (config.websms?.username || ''));
        setWebsmsPassword(config.websms?.password === '***ENCRYPTED***' ? '' : (config.websms?.password || ''));
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der SMS-Konfiguration:', error);
    }
  };

  const handleSaveSmsSettings = async () => {
    setSmsLoading(true);
    setSmsError(null);
    setSmsSuccess(false);
    try {
      const smsConfig: any = {
        provider: smsProvider,
      };

      if (smsProvider === 'seven') {
        smsConfig.seven = {
          apiKey: sevenApiKey,
          from: sevenFrom,
        };
      } else if (smsProvider === 'twilio') {
        smsConfig.twilio = {
          accountSid: twilioAccountSid,
          authToken: twilioAuthToken,
          fromNumber: twilioFromNumber,
        };
      } else if (smsProvider === 'websms') {
        smsConfig.websms = {
          username: websmsUsername,
          password: websmsPassword,
        };
      }

      const response = await api.put<{ success: boolean; message: string }>('/settings/sms', smsConfig);

      if (response.data.success) {
        setSmsSuccess(true);
        setTwilioAuthToken('');
        setWebsmsPassword('');
        setTimeout(() => setSmsSuccess(false), 3000);
      }
    } catch (error: any) {
      console.error('Fehler beim Speichern der SMS-Konfiguration:', error);
      setSmsError(error.response?.data?.message || 'Fehler beim Speichern der SMS-Konfiguration.');
    } finally {
      setSmsLoading(false);
    }
  };

  const handleSendTestSms = async () => {
    if (!testSmsNumber || !testSmsNumber.includes('+')) {
      setTestSmsResult({ success: false, message: 'Bitte geben Sie eine gültige Telefonnummer im internationalen Format ein (z.B. +436641234567)' });
      return;
    }

    setTestSmsLoading(true);
    setTestSmsResult(null);

    try {
      const response = await api.post<{ success: boolean; message: string }>('/settings/sms/test', { to: testSmsNumber });
      if (response.data.success) {
        setTestSmsResult({
          success: true,
          message: `Test-SMS erfolgreich an ${testSmsNumber} gesendet!`
        });
        setTestSmsNumber('');
      } else {
        setTestSmsResult({
          success: false,
          message: response.data.message || 'Fehler beim Senden der Test-SMS.'
        });
      }
    } catch (error: any) {
      console.error('Fehler beim Senden der Test-SMS:', error);
      setTestSmsResult({
        success: false,
        message: error.response?.data?.message || 'Fehler beim Senden der Test-SMS.'
      });
    } finally {
      setTestSmsLoading(false);
    }
  };

  const handleProviderChange = (provider: string) => {
    setEmailProvider(provider);
    
    // Setze Standardwerte basierend auf Anbieter
    const providerConfigs: { [key: string]: { host: string; port: number; secure: boolean } } = {
      gmail: { host: 'smtp.gmail.com', port: 587, secure: false },
      apple: { host: 'smtp.mail.me.com', port: 587, secure: false },
      outlook: { host: 'smtp-mail.outlook.com', port: 587, secure: false },
      yahoo: { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
      custom: { host: '', port: 587, secure: false }
    };

    const config = providerConfigs[provider] || providerConfigs.custom;
    setSmtpHost(config.host);
    setSmtpPort(config.port);
    setSmtpSecure(config.secure);
  };

  const handleSaveEmailSettings = async () => {
    setEmailLoading(true);
    setEmailError(null);
    setEmailSuccess(false);

    try {
      const response = await api.put<{ success: boolean; message?: string; data?: any }>('/settings/email', {
        provider: emailProvider,
        smtp: {
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          user: smtpUser,
          password: smtpPassword || '***ENCRYPTED***', // Wenn leer, behalte verschlüsseltes Passwort
          from: smtpFrom
        }
      });

      if (response.data.success) {
        setEmailSuccess(true);
        setSmtpPassword(''); // Leere Passwort-Feld nach erfolgreichem Speichern
        setTimeout(() => setEmailSuccess(false), 3000);
      }
    } catch (error: any) {
      console.error('Fehler beim Speichern der E-Mail-Konfiguration:', error);
      setEmailError(error.response?.data?.message || 'Fehler beim Speichern der E-Mail-Konfiguration');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      setTestEmailResult({ success: false, message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein' });
      return;
    }

    setTestEmailLoading(true);
    setTestEmailResult(null);

    try {
      const response = await api.post<{ success: boolean; message?: string; data?: any }>('/settings/email/test', {
        to: testEmailAddress
      });

      if (response.data.success) {
        setTestEmailResult({ 
          success: true, 
          message: `Test-E-Mail erfolgreich an ${testEmailAddress} gesendet!` 
        });
        setTestEmailAddress('');
      }
    } catch (error: any) {
      console.error('Fehler beim Senden der Test-E-Mail:', error);
      
      // Prüfe auf Gmail-spezifische Authentifizierungsfehler
      const errorMessage = error.response?.data?.message || error.message || 'Fehler beim Senden der Test-E-Mail';
      const isGmailError = 
        errorMessage.includes('BadCredentials') ||
        errorMessage.includes('Username and Password not accepted') ||
        errorMessage.includes('Invalid login') ||
        (emailProvider === 'gmail' && errorMessage.toLowerCase().includes('password'));
      
      let userFriendlyMessage = errorMessage;
      
      if (isGmailError) {
        userFriendlyMessage = `Gmail-Authentifizierung fehlgeschlagen. Für Gmail benötigen Sie ein App-Passwort (nicht Ihr normales Passwort).\n\n` +
          `So erstellen Sie ein App-Passwort:\n` +
          `1. Gehen Sie zu https://myaccount.google.com/apppasswords\n` +
          `2. Wählen Sie "Mail" und "Andere (benutzerdefiniert)"\n` +
          `3. Geben Sie "Ordinationssoftware" ein\n` +
          `4. Kopieren Sie das 16-stellige Passwort\n` +
          `5. Verwenden Sie dieses Passwort in der E-Mail-Konfiguration`;
      }
      
      setTestEmailResult({ 
        success: false, 
        message: userFriendlyMessage
      });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const loadELDAStatus = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any }>('/elda/status');
      if (response.data.success) {
        setEldaStatus(response.data.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden des ELDA-Status:', error);
    }
  };

  const loadWAHonlineStatus = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any }>('/wahonline/status');
      if (response.data.success) {
        setWahonlineStatus(response.data.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden des WAHonline-Status:', error);
    }
  };

  // Einstellungen speichern
  const handleSaveSettings = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await api.put('/auth/profile', {
        profile: {
          preferences: {
            ...user?.profile?.preferences,
            autoBillingEnabled: autoBillingEnabled,
            eldaEnabled: eldaEnabled,
            eldaMethod: eldaMethod,
            eldaEnvironment: eldaEnvironment,
            wahonlineEnabled: wahonlineEnabled
          }
        }
      });

      if (response.success) {
        setSuccess(true);
        // User-Daten neu laden
        dispatch(loadUser());
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('Fehler beim Speichern der Einstellungen');
      }
    } catch (err: any) {
      console.error('Fehler beim Speichern:', err);
      setError(err.message || 'Fehler beim Speichern der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Einstellungen
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        System- und Benutzereinstellungen
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(false)}>
          Einstellungen erfolgreich gespeichert
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Update-Monitoring */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <UpdateMonitoring refreshInterval={30000} />
            </CardContent>
          </Card>
        </Grid>

        {/* Abrechnungseinstellungen */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Abrechnungseinstellungen
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoBillingEnabled}
                      onChange={(e) => setAutoBillingEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        Automatische Abrechnung aktivieren
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Wenn aktiviert, werden alle erfassten Leistungen automatisch abgerechnet. 
                        Diese Einstellung hat Priorität über die Checkbox im Leistungsdialog.
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Hinweis:</strong> Wenn diese Systemeinstellung aktiviert ist, wird die 
                  Checkbox "Automatisch abrechnen" im Leistungsdialog ausgeblendet und alle 
                  Leistungen werden automatisch abgerechnet.
                </Typography>
              </Alert>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={handleSaveSettings}
                  disabled={loading}
                >
                  {loading ? 'Speichern...' : 'Einstellungen speichern'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ELDA-Konfiguration */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ELDA-Konfiguration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Elektronischer Datenaustausch mit österreichischen Sozialversicherungsträgern
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              {eldaStatus && (
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
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
                </Stack>
              )}

              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={eldaEnabled}
                      onChange={(e) => setEldaEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        ELDA-Übermittlung aktivieren
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Wenn aktiviert, werden Abrechnungen automatisch an ELDA übermittelt.
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              {eldaEnabled && (
                <>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Übertragungsmethode</InputLabel>
                    <Select
                      value={eldaMethod}
                      label="Übertragungsmethode"
                      onChange={(e) => setEldaMethod(e.target.value)}
                    >
                      <MenuItem value="ftps">FTPS (aktuell verfügbar)</MenuItem>
                      <MenuItem value="webservice">Webservice (ab 02.02.2026)</MenuItem>
                      <MenuItem value="auto">Automatisch</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Umgebung</InputLabel>
                    <Select
                      value={eldaEnvironment}
                      label="Umgebung"
                      onChange={(e) => setEldaEnvironment(e.target.value)}
                    >
                      <MenuItem value="test">Test</MenuItem>
                      <MenuItem value="sit">Systemintegrationstest (SIT)</MenuItem>
                      <MenuItem value="production">Produktion</MenuItem>
                    </Select>
                  </FormControl>

                  {eldaStatus && eldaStatus.errors && eldaStatus.errors.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Konfigurationsfehler:
                      </Typography>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {eldaStatus.errors.map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}

                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Hinweis:</strong> FTPS ist aktuell verfügbar. Webservice wird ab 02.02.2026 
                      in der Produktionsumgebung aktiviert. In Test- und SIT-Umgebungen ist Webservice bereits verfügbar.
                    </Typography>
                  </Alert>
                </>
              )}

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={handleSaveSettings}
                  disabled={loading}
                >
                  {loading ? 'Speichern...' : 'Einstellungen speichern'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* WAHonline Einstellungen */}
        <Grid size={{ xs: 12, md: 8 }} sx={{ mt: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                WAHonline-Integration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Elektronische Meldung von Wahlarzt-Leistungen an die Österreichische Ärztekammer
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              {wahonlineStatus && (
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    label={wahonlineStatus.configured ? 'Konfiguriert' : 'Nicht konfiguriert'}
                    color={wahonlineStatus.configured ? 'success' : 'error'}
                    size="small"
                  />
                  <Chip
                    label={`Umgebung: ${wahonlineStatus.environment}`}
                    color="default"
                    size="small"
                  />
                </Stack>
              )}

              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={wahonlineEnabled}
                      onChange={(e) => setWahonlineEnabled(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        WAHonline-Übermittlung aktivieren
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Wenn aktiviert, werden Wahlarzt-Abrechnungen automatisch an WAHonline übermittelt.
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              {wahonlineStatus && wahonlineStatus.errors && wahonlineStatus.errors.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Konfigurationsfehler:
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {wahonlineStatus.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Hinweis:</strong> WAHonline ist für die elektronische Meldung von Wahlarzt-Leistungen 
                  an die Österreichische Ärztekammer zuständig. Die Übermittlung erfolgt automatisch nach 
                  erfolgreicher Wahlarzt-Abrechnung.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* E-Mail-Konfiguration */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Email sx={{ mr: 1, verticalAlign: 'middle' }} />
                E-Mail-Konfiguration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Konfigurieren Sie die E-Mail-Einstellungen für Benachrichtigungen über gebuchte Termine
              </Typography>
              <Divider sx={{ my: 2 }} />

              {emailSuccess && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setEmailSuccess(false)}>
                  E-Mail-Konfiguration erfolgreich gespeichert
                </Alert>
              )}

              {emailError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setEmailError(null)}>
                  {emailError}
                </Alert>
              )}

              <Grid container spacing={3}>
                {/* Anbieter-Auswahl */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="email-provider-label">E-Mail-Anbieter</InputLabel>
                    <Select
                      labelId="email-provider-label"
                      id="email-provider"
                      value={emailProvider}
                      label="E-Mail-Anbieter"
                      onChange={(e) => handleProviderChange(e.target.value)}
                    >
                      <MenuItem value="gmail">Gmail</MenuItem>
                      <MenuItem value="apple">Apple iCloud</MenuItem>
                      <MenuItem value="outlook">Outlook / Hotmail</MenuItem>
                      <MenuItem value="yahoo">Yahoo</MenuItem>
                      <MenuItem value="custom">Eigener SMTP-Server</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* SMTP Host */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="SMTP Host"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    required
                    helperText="z.B. smtp.gmail.com"
                  />
                </Grid>

                {/* SMTP Port */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="SMTP Port"
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                    required
                    helperText="Standard: 587 (TLS) oder 465 (SSL)"
                  />
                </Grid>

                {/* SSL/TLS */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={smtpSecure}
                        onChange={(e) => setSmtpSecure(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="SSL/TLS aktivieren"
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Für Port 465 aktivieren
                  </Typography>
                </Grid>

                {/* From-Adresse */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Absender-E-Mail"
                    type="email"
                    value={smtpFrom}
                    onChange={(e) => setSmtpFrom(e.target.value)}
                    helperText="E-Mail-Adresse für Absender"
                  />
                </Grid>

                {/* Benutzername */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Benutzername / E-Mail"
                    type="email"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    required
                    helperText="Ihre E-Mail-Adresse für die Anmeldung"
                  />
                </Grid>

                {/* Passwort */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Passwort / App-Passwort"
                    type={showPassword ? 'text' : 'password'}
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    helperText={emailProvider === 'gmail' ? 'Für Gmail: App-Passwort verwenden' : 'Ihr E-Mail-Passwort'}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>

                {/* Speichern Button */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleSaveEmailSettings}
                      disabled={emailLoading || !smtpHost || !smtpUser}
                      startIcon={emailLoading ? <CircularProgress size={20} /> : <CheckCircle />}
                    >
                      {emailLoading ? 'Speichern...' : 'E-Mail-Konfiguration speichern'}
                    </Button>
                  </Box>
                </Grid>

                {/* Test-E-Mail */}
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Test-E-Mail senden
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mt: 2 }}>
                    <TextField
                      label="Test-E-Mail-Adresse"
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="test@example.com"
                      sx={{ flexGrow: 1 }}
                    />
                    <Button
                      variant="outlined"
                      onClick={handleSendTestEmail}
                      disabled={testEmailLoading || !testEmailAddress}
                      startIcon={testEmailLoading ? <CircularProgress size={20} /> : <Send />}
                      sx={{ minWidth: 150 }}
                    >
                      {testEmailLoading ? 'Senden...' : 'Test senden'}
                    </Button>
                  </Box>
                  
                  {testEmailResult && (
                    <Alert
                      severity={testEmailResult.success ? 'success' : 'error'}
                      sx={{ mt: 2, whiteSpace: 'pre-line' }}
                      icon={testEmailResult.success ? <CheckCircle /> : <ErrorIcon />}
                      onClose={() => setTestEmailResult(null)}
                    >
                      <Typography component="div" variant="body2">
                        {testEmailResult.message}
                      </Typography>
                    </Alert>
                  )}
                </Grid>

                {/* Hinweise */}
                <Grid size={{ xs: 12 }}>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2" component="div">
                      <strong>Hinweise:</strong>
                      <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                        <li>Für Gmail: Verwenden Sie ein App-Passwort (nicht Ihr normales Passwort)</li>
                        <li>Für Outlook: Möglicherweise müssen Sie 2FA aktivieren und ein App-Passwort erstellen</li>
                        <li>Für Yahoo: App-Passwort erforderlich</li>
                        <li>Die Konfiguration wird verschlüsselt gespeichert</li>
                        <li>Nach dem Speichern wird die E-Mail-Verbindung automatisch getestet</li>
                      </ul>
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* SMS Konfiguration */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                SMS Konfiguration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Konfigurieren Sie SMS-Benachrichtigungen für Online-Buchungen
              </Typography>
              <Divider sx={{ my: 2 }} />

              {smsSuccess && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSmsSuccess(false)}>
                  SMS-Einstellungen erfolgreich gespeichert!
                </Alert>
              )}
              {smsError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSmsError(null)}>
                  {smsError}
                </Alert>
              )}

              <Grid container spacing={3}>
                {/* Provider-Auswahl */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="sms-provider-label">SMS-Provider</InputLabel>
                    <Select
                      labelId="sms-provider-label"
                      id="sms-provider"
                      value={smsProvider}
                      label="SMS-Provider"
                      onChange={(e) => setSmsProvider(e.target.value as string)}
                    >
                      <MenuItem value="seven">Seven.io</MenuItem>
                      <MenuItem value="twilio">Twilio</MenuItem>
                      <MenuItem value="websms">websms.at</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Seven.io Konfiguration */}
                {smsProvider === 'seven' && (
                  <>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Seven.io API Key"
                        type="password"
                        value={sevenApiKey}
                        onChange={(e) => setSevenApiKey(e.target.value)}
                        required
                        helperText="Ihr Seven.io API-Schlüssel"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowSmsPassword(!showSmsPassword)}
                                edge="end"
                              >
                                {showSmsPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Absender-Name"
                        value={sevenFrom}
                        onChange={(e) => setSevenFrom(e.target.value)}
                        helperText="Name der in der SMS angezeigt wird"
                      />
                    </Grid>
                  </>
                )}

                {/* Twilio Konfiguration */}
                {smsProvider === 'twilio' && (
                  <>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Account SID"
                        value={twilioAccountSid}
                        onChange={(e) => setTwilioAccountSid(e.target.value)}
                        required
                        helperText="Ihre Twilio Account SID"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Auth Token"
                        type="password"
                        value={twilioAuthToken}
                        onChange={(e) => setTwilioAuthToken(e.target.value)}
                        required
                        helperText="Ihr Twilio Auth Token"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowSmsPassword(!showSmsPassword)}
                                edge="end"
                              >
                                {showSmsPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Absender-Nummer"
                        value={twilioFromNumber}
                        onChange={(e) => setTwilioFromNumber(e.target.value)}
                        required
                        helperText="Ihre Twilio Telefonnummer (z.B. +1234567890)"
                      />
                    </Grid>
                  </>
                )}

                {/* websms.at Konfiguration */}
                {smsProvider === 'websms' && (
                  <>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Benutzername"
                        value={websmsUsername}
                        onChange={(e) => setWebsmsUsername(e.target.value)}
                        required
                        helperText="Ihr websms.at Benutzername"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Passwort"
                        type="password"
                        value={websmsPassword}
                        onChange={(e) => setWebsmsPassword(e.target.value)}
                        required
                        helperText="Ihr websms.at Passwort"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowSmsPassword(!showSmsPassword)}
                                edge="end"
                              >
                                {showSmsPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                  </>
                )}

                {/* Speichern Button */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleSaveSmsSettings}
                      disabled={smsLoading || (smsProvider === 'seven' && !sevenApiKey) || (smsProvider === 'twilio' && (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber)) || (smsProvider === 'websms' && (!websmsUsername || !websmsPassword))}
                      startIcon={smsLoading ? <CircularProgress size={20} /> : <CheckCircle />}
                    >
                      {smsLoading ? 'Speichern...' : 'SMS-Konfiguration speichern'}
                    </Button>
                  </Box>
                </Grid>

                {/* Test-SMS */}
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Test-SMS senden
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mt: 2 }}>
                    <TextField
                      label="Test-Telefonnummer"
                      value={testSmsNumber}
                      onChange={(e) => setTestSmsNumber(e.target.value)}
                      placeholder="+436641234567"
                      helperText="Internationales Format erforderlich (z.B. +436641234567)"
                      sx={{ flexGrow: 1 }}
                    />
                    <Button
                      variant="outlined"
                      onClick={handleSendTestSms}
                      disabled={testSmsLoading || !testSmsNumber}
                      startIcon={testSmsLoading ? <CircularProgress size={20} /> : <Send />}
                      sx={{ minWidth: 150 }}
                    >
                      {testSmsLoading ? 'Senden...' : 'Test senden'}
                    </Button>
                  </Box>

                  {testSmsResult && (
                    <Alert
                      severity={testSmsResult.success ? 'success' : 'error'}
                      sx={{ mt: 2 }}
                      icon={testSmsResult.success ? <CheckCircle /> : <ErrorIcon />}
                      onClose={() => setTestSmsResult(null)}
                    >
                      <Typography component="div" variant="body2">
                        {testSmsResult.message}
                      </Typography>
                    </Alert>
                  )}
                </Grid>

                {/* Hinweise */}
                <Grid size={{ xs: 12 }}>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2" component="div">
                      <strong>Hinweise:</strong>
                      <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                        <li>SMS-Benachrichtigungen werden automatisch bei Online-Buchungen gesendet</li>
                        <li>Für Seven.io: Registrieren Sie sich unter https://www.seven.io</li>
                        <li>Für Twilio: Registrieren Sie sich unter https://www.twilio.com</li>
                        <li>Für websms.at: Registrieren Sie sich unter https://www.websms.at</li>
                        <li>Die Konfiguration wird verschlüsselt gespeichert</li>
                        <li>Telefonnummern müssen im internationalen Format angegeben werden (z.B. +436641234567)</li>
                      </ul>
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
