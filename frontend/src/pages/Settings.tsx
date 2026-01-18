import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControlLabel,
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
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Send,
  CheckCircle,
  Error as ErrorIcon,
  HelpOutline
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../store/hooks';
import { loadUser } from '../store/slices/authSlice';
import api from '../utils/api';
import UpdateMonitoring from '../components/UpdateMonitoring';
import GradientDialogTitle from '../components/GradientDialogTitle';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useSelector((state: any) => state.auth);
  const { marginTopValue } = useGlobalNavigationOffset();
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
  const [personnelCostsPercentage, setPersonnelCostsPercentage] = useState<number>(25);
  const [targetHourlyRate, setTargetHourlyRate] = useState<number>(150);
  const [customerAcquisitionCost, setCustomerAcquisitionCost] = useState<number>(50);
  const [workingHoursPerDay, setWorkingHoursPerDay] = useState<number>(8);

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
  
  // Proaktive Benachrichtigungen State
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    upcomingAppointments: true,
    missingVitalSigns: true,
    criticalLabResults: true,
    overdueTasks: true,
    medicationReminders: true,
    followUpAppointments: true,
    incompletePatientData: false
  });

  // Hilfe-Dialog States
  const [helpDialogBillingOpen, setHelpDialogBillingOpen] = useState(false);
  const [helpDialogELDAOpen, setHelpDialogELDAOpen] = useState(false);
  const [helpDialogWAHonlineOpen, setHelpDialogWAHonlineOpen] = useState(false);
  const [helpDialogEmailOpen, setHelpDialogEmailOpen] = useState(false);
  const [helpDialogSmsOpen, setHelpDialogSmsOpen] = useState(false);
  const [helpDialogNotificationsOpen, setHelpDialogNotificationsOpen] = useState(false);
  const [helpTabBilling, setHelpTabBilling] = useState(0);
  const [helpTabELDA, setHelpTabELDA] = useState(0);
  const [helpTabWAHonline, setHelpTabWAHonline] = useState(0);
  const [helpTabEmail, setHelpTabEmail] = useState(0);
  const [helpTabSms, setHelpTabSms] = useState(0);
  const [helpTabNotifications, setHelpTabNotifications] = useState(0);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);

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
    // Lade Benachrichtigungseinstellungen
    if (user?.profile?.preferences?.notificationSettings) {
      setNotificationSettings({
        enabled: user.profile.preferences.notificationSettings.enabled !== false,
        upcomingAppointments: user.profile.preferences.notificationSettings.upcomingAppointments !== false,
        missingVitalSigns: user.profile.preferences.notificationSettings.missingVitalSigns !== false,
        criticalLabResults: user.profile.preferences.notificationSettings.criticalLabResults !== false,
        overdueTasks: user.profile.preferences.notificationSettings.overdueTasks !== false,
        medicationReminders: user.profile.preferences.notificationSettings.medicationReminders !== false,
        followUpAppointments: user.profile.preferences.notificationSettings.followUpAppointments !== false,
        incompletePatientData: user.profile.preferences.notificationSettings.incompletePatientData === true
      });
    }
    loadELDAStatus();
    loadWAHonlineStatus();
    loadEmailSettings();
    loadSmsSettings();
    loadBillingSettings();
  }, [user]);

  const loadBillingSettings = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any }>('/settings');
      if (response.data.success && response.data.data?.billing) {
        const billing = response.data.data.billing;
        if (billing.personnelCostsPercentage !== undefined) {
          setPersonnelCostsPercentage(billing.personnelCostsPercentage);
        }
        if (billing.targetHourlyRate !== undefined) {
          setTargetHourlyRate(billing.targetHourlyRate);
        }
        if (billing.customerAcquisitionCost !== undefined) {
          setCustomerAcquisitionCost(billing.customerAcquisitionCost);
        }
        if (billing.workingHoursPerDay !== undefined) {
          setWorkingHoursPerDay(billing.workingHoursPerDay);
        }
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der Abrechnungseinstellungen:', error);
    }
  };

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
          `3. Geben Sie "MyMediCloud MMC" ein\n` +
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
      // Speichere User-Profil-Einstellungen
      const profileResponse = await api.put('/auth/profile', {
        profile: {
          preferences: {
            ...user?.profile?.preferences,
            autoBillingEnabled: autoBillingEnabled,
            eldaEnabled: eldaEnabled,
            eldaMethod: eldaMethod,
            eldaEnvironment: eldaEnvironment,
            wahonlineEnabled: wahonlineEnabled,
            notificationSettings: notificationSettings
          }
        }
      });

      // Speichere Abrechnungseinstellungen in Systemeinstellungen
      const settingsResponse = await api.put('/settings', {
        billing: {
          personnelCostsPercentage: personnelCostsPercentage,
          targetHourlyRate: targetHourlyRate,
          customerAcquisitionCost: customerAcquisitionCost,
          workingHoursPerDay: workingHoursPerDay
        }
      });

      if (profileResponse.success && settingsResponse.success) {
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
    <Box sx={{ 
      p: { xs: 2, sm: 3 },
      mt: marginTopValue !== '0px' ? marginTopValue : 0,
      transition: marginTopValue !== '0px' ? 'margin-top 0.3s ease' : 'none',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography 
          variant="h4" 
          gutterBottom
          sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, mb: 0 }}
        >
          Einstellungen
        </Typography>
        <Tooltip title="Hilfe & Leitfaden">
          <IconButton
            onClick={() => setHelpDialogOpen(true)}
            color="primary"
            size="small"
          >
            <HelpOutline />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography 
        variant="subtitle1" 
        color="text.secondary" 
        gutterBottom 
        sx={{ 
          mb: { xs: 2, sm: 3 },
          fontSize: { xs: '0.875rem', sm: '1rem' }
        }}
      >
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

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Update-Monitoring */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <UpdateMonitoring refreshInterval={30000} />
            </CardContent>
          </Card>
        </Grid>

        {/* Abrechnungseinstellungen */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
                >
                  Abrechnungseinstellungen
                </Typography>
                <Tooltip title="Hilfe & Leitfaden">
                  <IconButton
                    onClick={() => setHelpDialogBillingOpen(true)}
                    color="primary"
                    size="small"
                    sx={{ minWidth: { xs: '44px', sm: 'auto' }, minHeight: { xs: '44px', sm: 'auto' } }}
                  >
                    <HelpOutline />
                  </IconButton>
                </Tooltip>
              </Box>
              <Divider sx={{ my: { xs: 1.5, sm: 2 } }} />
              
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

              <Divider sx={{ my: 3 }} />

              {/* BI-Dashboard Einstellungen */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  BI-Dashboard Einstellungen
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Diese Werte werden für die Berechnungen im Business Intelligence Dashboard verwendet.
                </Typography>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Personalkostenquote (%)"
                    type="number"
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    value={personnelCostsPercentage}
                    onChange={(e) => setPersonnelCostsPercentage(parseFloat(e.target.value) || 25)}
                    helperText="Prozentsatz des Gesamtumsatzes für Personalkosten"
                  />
                  
                  <TextField
                    fullWidth
                    label="Ziel-Stundensatz (€)"
                    type="number"
                    inputProps={{ min: 0, step: 10 }}
                    value={targetHourlyRate && targetHourlyRate !== 0 ? targetHourlyRate : ''}
                    onChange={(e) => setTargetHourlyRate(parseFloat(e.target.value) || 0)}
                    helperText="Zielwert für Umsatz pro Stunde (für Geld-Uhr)"
                  />
                  
                  <TextField
                    fullWidth
                    label="Customer Acquisition Cost (CAC) (€)"
                    type="number"
                    inputProps={{ min: 0, step: 1 }}
                    value={customerAcquisitionCost && customerAcquisitionCost !== 0 ? customerAcquisitionCost : ''}
                    onChange={(e) => setCustomerAcquisitionCost(parseFloat(e.target.value) || 0)}
                    helperText="Durchschnittliche Kosten für Neupatienten-Akquise"
                  />
                  
                  <TextField
                    fullWidth
                    label="Arbeitsstunden pro Tag"
                    type="number"
                    inputProps={{ min: 1, max: 24, step: 0.5 }}
                    value={workingHoursPerDay}
                    onChange={(e) => setWorkingHoursPerDay(parseFloat(e.target.value) || 8)}
                    helperText="Durchschnittliche Arbeitsstunden pro Tag (für Kapazitätsberechnung)"
                  />
                </Box>
              </Box>

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
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 1.5, sm: 2 } }}>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
                >
                  ELDA-Konfiguration
                </Typography>
                <Tooltip title="Hilfe & Leitfaden">
                  <IconButton
                    onClick={() => setHelpDialogELDAOpen(true)}
                    color="primary"
                    size="small"
                    sx={{ minWidth: { xs: '44px', sm: 'auto' }, minHeight: { xs: '44px', sm: 'auto' } }}
                  >
                    <HelpOutline />
                  </IconButton>
                </Tooltip>
              </Box>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  WAHonline-Integration
                </Typography>
                <Tooltip title="Hilfe & Leitfaden">
                  <IconButton
                    onClick={() => setHelpDialogWAHonlineOpen(true)}
                    color="primary"
                    size="small"
                  >
                    <HelpOutline />
                  </IconButton>
                </Tooltip>
              </Box>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  <Email sx={{ mr: 1, verticalAlign: 'middle' }} />
                  E-Mail-Konfiguration
                </Typography>
                <Tooltip title="Hilfe & Leitfaden">
                  <IconButton
                    onClick={() => setHelpDialogEmailOpen(true)}
                    color="primary"
                    size="small"
                  >
                    <HelpOutline />
                  </IconButton>
                </Tooltip>
              </Box>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  SMS Konfiguration
                </Typography>
                <Tooltip title="Hilfe & Leitfaden">
                  <IconButton
                    onClick={() => setHelpDialogSmsOpen(true)}
                    color="primary"
                    size="small"
                  >
                    <HelpOutline />
                  </IconButton>
                </Tooltip>
              </Box>
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

        {/* Proaktive Benachrichtigungen */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Proaktive Benachrichtigungen
                </Typography>
                <Tooltip title="Hilfe & Leitfaden">
                  <IconButton
                    onClick={() => setHelpDialogNotificationsOpen(true)}
                    color="primary"
                    size="small"
                  >
                    <HelpOutline />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Konfigurieren Sie, welche proaktiven Benachrichtigungen Sie erhalten möchten.
              </Typography>
              <Divider sx={{ my: 2 }} />

              {/* Master-Switch */}
              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.enabled}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        Proaktive Benachrichtigungen aktivieren
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Wenn deaktiviert, erhalten Sie keine proaktiven Benachrichtigungen.
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              {notificationSettings.enabled && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
                    Einzelne Benachrichtigungstypen
                  </Typography>

                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.upcomingAppointments}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, upcomingAppointments: e.target.checked }))}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            Anstehende Termine
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Benachrichtigungen für Termine in den nächsten 24 Stunden
                          </Typography>
                        </Box>
                      }
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.missingVitalSigns}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, missingVitalSigns: e.target.checked }))}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            Fehlende Vitalwerte
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Erinnerungen für Patienten ohne aktuelle Vitalwerte (seit &gt; 1 Jahr)
                          </Typography>
                        </Box>
                      }
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.criticalLabResults}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, criticalLabResults: e.target.checked }))}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            Kritische Laborwerte
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Sofortige Benachrichtigungen bei kritischen Laborwerten
                          </Typography>
                        </Box>
                      }
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.overdueTasks}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, overdueTasks: e.target.checked }))}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            Überfällige Aufgaben
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Benachrichtigungen für überfällige Aufgaben
                          </Typography>
                        </Box>
                      }
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.medicationReminders}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, medicationReminders: e.target.checked }))}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            Medikamenten-Erinnerungen
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Erinnerungen zur Überprüfung langfristiger Medikationen
                          </Typography>
                        </Box>
                      }
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.followUpAppointments}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, followUpAppointments: e.target.checked }))}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            Nachsorgetermine
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Empfehlungen für Nachsorgetermine bei aktiven Diagnosen
                          </Typography>
                        </Box>
                      }
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.incompletePatientData}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, incompletePatientData: e.target.checked }))}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            Unvollständige Patientendaten
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Hinweise auf fehlende wichtige Patientendaten
                          </Typography>
                        </Box>
                      }
                    />
                  </Stack>

                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      onClick={handleSaveSettings}
                      disabled={loading}
                    >
                      {loading ? 'Speichern...' : 'Benachrichtigungseinstellungen speichern'}
                    </Button>
                  </Box>
                </>
              )}

              {!notificationSettings.enabled && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Proaktive Benachrichtigungen sind derzeit deaktiviert. Aktivieren Sie die Funktion, um individuelle Benachrichtigungstypen zu konfigurieren.
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Hilfe-Dialog für Abrechnungseinstellungen */}
      <Dialog 
        open={helpDialogBillingOpen} 
        onClose={() => setHelpDialogBillingOpen(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: { 
            minHeight: { xs: '100%', sm: '600px' },
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: { xs: 'none', sm: '0 8px 32px rgba(0,0,0,0.12)' },
            m: { xs: 0, sm: 2 },
            height: { xs: '100%', sm: 'auto' },
            maxHeight: { xs: '100%', sm: '90vh' }
          }
        }}
      >
        <GradientDialogTitle 
          title="Leitfaden: Abrechnungseinstellungen" 
          onClose={() => setHelpDialogBillingOpen(false)}
        />
        <DialogContent sx={{ 
          pt: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          overflow: 'auto',
          maxHeight: { xs: 'calc(100vh - 120px)', sm: 'calc(90vh - 120px)' }
        }}>
          <Tabs 
            value={helpTabBilling} 
            onChange={(_, v) => setHelpTabBilling(v)} 
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Übersicht" />
            <Tab label="Automatische Abrechnung" />
            <Tab label="BI-Dashboard" />
            <Tab label="Konfiguration" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTabBilling === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Abrechnungseinstellungen
                </Typography>
                <Typography variant="body1" paragraph>
                  Die Abrechnungseinstellungen steuern, wie Leistungen automatisch abgerechnet werden 
                  und welche Werte für Business Intelligence Berechnungen verwendet werden.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>⚙️ <strong>Automatische Abrechnung:</strong> Aktivierung der automatischen Abrechnung</li>
                  <li>📊 <strong>BI-Dashboard:</strong> Konfiguration von Kennzahlen für Business Intelligence</li>
                  <li>💰 <strong>Personalkosten:</strong> Einstellung der Personalkostenquote</li>
                  <li>⏰ <strong>Stundensatz:</strong> Ziel-Stundensatz für Geld-Uhr</li>
                  <li>📈 <strong>Akquisekosten:</strong> Customer Acquisition Cost (CAC)</li>
                  <li>🕐 <strong>Arbeitszeit:</strong> Arbeitsstunden pro Tag</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabBilling === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Automatische Abrechnung
                </Typography>
                <Typography variant="body2" paragraph>
                  Die automatische Abrechnung ermöglicht es, dass alle erfassten Leistungen 
                  automatisch abgerechnet werden, ohne manuelle Bestätigung.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Aktivierung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Aktivieren Sie den Schalter "Automatische Abrechnung aktivieren"</li>
                  <li>Klicken Sie auf "Einstellungen speichern"</li>
                  <li>Die Checkbox "Automatisch abrechnen" im Leistungsdialog wird ausgeblendet</li>
                  <li>Alle neuen Leistungen werden automatisch abgerechnet</li>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Hinweis:</strong> Wenn diese Systemeinstellung aktiviert ist, wird die 
                  Checkbox "Automatisch abrechnen" im Leistungsdialog ausgeblendet und alle 
                  Leistungen werden automatisch abgerechnet.
                </Typography>
              </Alert>
            </Box>
          )}

          {helpTabBilling === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  BI-Dashboard Einstellungen
                </Typography>
                <Typography variant="body2" paragraph>
                  Diese Werte werden für die Berechnungen im Business Intelligence Dashboard verwendet.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  1. Personalkostenquote (%)
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Standard:</strong> 25%</li>
                  <li><strong>Bereich:</strong> 0-100%</li>
                  <li><strong>Verwendung:</strong> Berechnung der Personalkosten im BI-Dashboard</li>
                  <li><strong>Beispiel:</strong> Bei 25% und 10.000€ Umsatz = 2.500€ Personalkosten</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  2. Ziel-Stundensatz (€)
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Standard:</strong> 150€</li>
                  <li><strong>Bereich:</strong> 0-∞ (in 10€ Schritten)</li>
                  <li><strong>Verwendung:</strong> Vergleich mit tatsächlichem Stundensatz</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  3. Customer Acquisition Cost (CAC) (€)
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Standard:</strong> 50€</li>
                  <li><strong>Verwendung:</strong> Berechnung der Akquisekosten pro Patient</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  4. Arbeitsstunden pro Tag
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Standard:</strong> 8 Stunden</li>
                  <li><strong>Bereich:</strong> 1-24 Stunden (in 0,5 Stunden Schritten)</li>
                  <li><strong>Verwendung:</strong> Berechnung der täglichen Kapazität</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabBilling === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Konfiguration
                </Typography>
                <Typography variant="body2" paragraph>
                  So konfigurieren Sie die Abrechnungseinstellungen:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt Anleitung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Aktivieren/Deaktivieren Sie "Automatische Abrechnung"</li>
                  <li>Geben Sie die BI-Dashboard Werte ein</li>
                  <li>Klicken Sie auf "Einstellungen speichern"</li>
                  <li>Erfolgsmeldung wird angezeigt</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabBilling === 4 && (
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
                  <li>✅ Aktivieren Sie automatische Abrechnung für Effizienz</li>
                  <li>✅ Überprüfen Sie die BI-Dashboard Werte regelmäßig</li>
                  <li>✅ Passen Sie Werte an tatsächliche Gegebenheiten an</li>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogBillingOpen(false)} variant="contained">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hilfe-Dialog für ELDA-Konfiguration */}
      <Dialog 
        open={helpDialogELDAOpen} 
        onClose={() => setHelpDialogELDAOpen(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: { 
            minHeight: { xs: '100%', sm: '600px' },
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: { xs: 'none', sm: '0 8px 32px rgba(0,0,0,0.12)' },
            m: { xs: 0, sm: 2 },
            height: { xs: '100%', sm: 'auto' },
            maxHeight: { xs: '100%', sm: '90vh' }
          }
        }}
      >
        <GradientDialogTitle 
          title="Leitfaden: ELDA-Konfiguration" 
          onClose={() => setHelpDialogELDAOpen(false)}
        />
        <DialogContent sx={{ 
          pt: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          overflow: 'auto',
          maxHeight: { xs: 'calc(100vh - 120px)', sm: 'calc(90vh - 120px)' }
        }}>
          <Tabs 
            value={helpTabELDA} 
            onChange={(_, v) => setHelpTabELDA(v)} 
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Übersicht" />
            <Tab label="Was ist ELDA?" />
            <Tab label="Konfiguration" />
            <Tab label="Übertragungsmethoden" />
            <Tab label="Umgebungen" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTabELDA === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  ELDA-Konfiguration
                </Typography>
                <Typography variant="body1" paragraph>
                  ELDA (Elektronischer Datenaustausch) ermöglicht die automatische Übermittlung 
                  von Abrechnungen an österreichische Sozialversicherungsträger.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📤 <strong>Automatische Übermittlung:</strong> Abrechnungen werden automatisch übermittelt</li>
                  <li>🔐 <strong>Sichere Übertragung:</strong> FTPS oder Webservice</li>
                  <li>🧪 <strong>Test-Umgebung:</strong> Testen vor Produktion</li>
                  <li>✅ <strong>Status-Überwachung:</strong> Konfigurationsstatus wird angezeigt</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabELDA === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Was ist ELDA?
                </Typography>
                <Typography variant="body2" paragraph>
                  ELDA (Elektronischer Datenaustausch) ist ein System für den elektronischen 
                  Datenaustausch zwischen Ärzten und österreichischen Sozialversicherungsträgern.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Vorteile
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Schnellere Abrechnung</li>
                  <li>✅ Weniger Fehler</li>
                  <li>✅ Automatische Verarbeitung</li>
                  <li>✅ Bessere Nachverfolgbarkeit</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabELDA === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  ELDA konfigurieren
                </Typography>
                <Typography variant="body2" paragraph>
                  So konfigurieren Sie ELDA:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt Anleitung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Aktivieren Sie "ELDA-Übermittlung aktivieren"</li>
                  <li>Wählen Sie die Übertragungsmethode (FTPS, Webservice, Auto)</li>
                  <li>Wählen Sie die Umgebung (Test, SIT, Produktion)</li>
                  <li>Klicken Sie auf "Einstellungen speichern"</li>
                  <li>Überprüfen Sie den Konfigurationsstatus</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabELDA === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Übertragungsmethoden
                </Typography>
                <Typography variant="body2" paragraph>
                  ELDA unterstützt verschiedene Übertragungsmethoden.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  1. FTPS (aktuell verfügbar)
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Verfügbarkeit:</strong> Sofort verfügbar</li>
                  <li><strong>Verwendung:</strong> Sichere Dateiübertragung über FTPS</li>
                  <li><strong>Vorteil:</strong> Bewährt und stabil</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  2. Webservice (ab 02.02.2026)
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Verfügbarkeit:</strong> Ab 02.02.2026 in Produktion</li>
                  <li><strong>Verwendung:</strong> Automatische API-Übertragung</li>
                  <li><strong>Vorteil:</strong> Vollautomatisch, Echtzeit</li>
                  <li><strong>Hinweis:</strong> In Test- und SIT-Umgebungen bereits verfügbar</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  3. Automatisch
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Verfügbarkeit:</strong> Immer verfügbar</li>
                  <li><strong>Verwendung:</strong> System wählt automatisch die beste Methode</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabELDA === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Umgebungen
                </Typography>
                <Typography variant="body2" paragraph>
                  ELDA unterstützt verschiedene Umgebungen für Tests und Produktion.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  1. Test
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Zweck:</strong> Entwicklung und Tests</li>
                  <li><strong>Empfehlung:</strong> Für erste Tests verwenden</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  2. Systemintegrationstest (SIT)
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Zweck:</strong> Integrationstests vor Produktion</li>
                  <li><strong>Empfehlung:</strong> Vor Produktion verwenden</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  3. Produktion
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Zweck:</strong> Live-Betrieb</li>
                  <li><strong>Empfehlung:</strong> Nur nach erfolgreichen Tests verwenden</li>
                </Box>
              </Box>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Wichtig:</strong> Testen Sie ELDA immer zuerst in der Test-Umgebung, 
                  bevor Sie zur Produktion wechseln.
                </Typography>
              </Alert>
            </Box>
          )}

          {helpTabELDA === 5 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Konfiguration
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Testen Sie zuerst in Test-Umgebung</li>
                  <li>✅ Überprüfen Sie den Konfigurationsstatus</li>
                  <li>✅ Beheben Sie Konfigurationsfehler sofort</li>
                  <li>✅ Wechseln Sie erst zur Produktion nach erfolgreichen Tests</li>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogELDAOpen(false)} variant="contained">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hilfe-Dialog für WAHonline-Integration */}
      <Dialog 
        open={helpDialogWAHonlineOpen} 
        onClose={() => setHelpDialogWAHonlineOpen(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: { 
            minHeight: { xs: '100%', sm: '600px' },
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: { xs: 'none', sm: '0 8px 32px rgba(0,0,0,0.12)' },
            m: { xs: 0, sm: 2 },
            height: { xs: '100%', sm: 'auto' },
            maxHeight: { xs: '100%', sm: '90vh' }
          }
        }}
      >
        <GradientDialogTitle 
          title="Leitfaden: WAHonline-Integration" 
          onClose={() => setHelpDialogWAHonlineOpen(false)}
        />
        <DialogContent sx={{ 
          pt: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          overflow: 'auto',
          maxHeight: { xs: 'calc(100vh - 120px)', sm: 'calc(90vh - 120px)' }
        }}>
          <Tabs 
            value={helpTabWAHonline} 
            onChange={(_, v) => setHelpTabWAHonline(v)} 
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Übersicht" />
            <Tab label="Was ist WAHonline?" />
            <Tab label="Konfiguration" />
            <Tab label="Funktionsweise" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTabWAHonline === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  WAHonline-Integration
                </Typography>
                <Typography variant="body1" paragraph>
                  WAHonline ermöglicht die elektronische Meldung von Wahlarzt-Leistungen 
                  an die Österreichische Ärztekammer.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📤 <strong>Automatische Meldung:</strong> Wahlarzt-Leistungen werden automatisch gemeldet</li>
                  <li>🏥 <strong>Ärztekammer:</strong> Meldung an Österreichische Ärztekammer</li>
                  <li>✅ <strong>Status-Überwachung:</strong> Konfigurationsstatus wird angezeigt</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabWAHonline === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Was ist WAHonline?
                </Typography>
                <Typography variant="body2" paragraph>
                  WAHonline ist ein System der Österreichischen Ärztekammer für die elektronische 
                  Meldung von Wahlarzt-Leistungen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Zweck
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📋 <strong>Meldepflicht:</strong> Wahlarzt-Leistungen müssen gemeldet werden</li>
                  <li>🏥 <strong>Ärztekammer:</strong> Meldung an Österreichische Ärztekammer</li>
                  <li>✅ <strong>Compliance:</strong> Erfüllt gesetzliche Anforderungen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabWAHonline === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  WAHonline konfigurieren
                </Typography>
                <Typography variant="body2" paragraph>
                  So konfigurieren Sie WAHonline:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt Anleitung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Aktivieren Sie "WAHonline-Übermittlung aktivieren"</li>
                  <li>Klicken Sie auf "Einstellungen speichern"</li>
                  <li>Die Konfiguration wird gespeichert</li>
                  <li>Status wird aktualisiert</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabWAHonline === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Funktionsweise
                </Typography>
                <Typography variant="body2" paragraph>
                  So funktioniert die WAHonline-Integration:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Automatische Meldung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wahlarzt-Abrechnung wird erstellt</li>
                  <li>Abrechnung wird erfolgreich abgeschlossen</li>
                  <li>WAHonline-Integration wird automatisch ausgelöst</li>
                  <li>Leistung wird an WAHonline übermittelt</li>
                  <li>Bestätigung wird gespeichert</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabWAHonline === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Konfiguration
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Aktivieren Sie WAHonline für Wahlarzt-Leistungen</li>
                  <li>✅ Überprüfen Sie den Konfigurationsstatus</li>
                  <li>✅ Beheben Sie Konfigurationsfehler sofort</li>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogWAHonlineOpen(false)} variant="contained">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hilfe-Dialog für E-Mail-Konfiguration */}
      <Dialog 
        open={helpDialogEmailOpen} 
        onClose={() => setHelpDialogEmailOpen(false)} 
        maxWidth="lg" 
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: { 
            minHeight: { xs: '100%', sm: '700px' },
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: { xs: 'none', sm: '0 8px 32px rgba(0,0,0,0.12)' },
            m: { xs: 0, sm: 2 },
            height: { xs: '100%', sm: 'auto' },
            maxHeight: { xs: '100%', sm: '90vh' }
          }
        }}
      >
        <GradientDialogTitle 
          title="Detaillierte Konfigurationsanleitung: E-Mail" 
          onClose={() => setHelpDialogEmailOpen(false)}
        />
        <DialogContent sx={{ 
          pt: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          overflow: 'auto',
          maxHeight: { xs: 'calc(100vh - 120px)', sm: 'calc(90vh - 120px)' }
        }}>
          <Tabs 
            value={helpTabEmail} 
            onChange={(_, v) => setHelpTabEmail(v)} 
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Übersicht" />
            <Tab label="Gmail" />
            <Tab label="Apple iCloud" />
            <Tab label="Outlook" />
            <Tab label="Yahoo" />
            <Tab label="Eigener SMTP" />
            <Tab label="Test-E-Mail" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTabEmail === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  E-Mail-Konfiguration
                </Typography>
                <Typography variant="body1" paragraph>
                  Die E-Mail-Konfiguration ermöglicht es, Benachrichtigungen über gebuchte Termine 
                  per E-Mail zu versenden.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Unterstützte Anbieter
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📧 <strong>Gmail:</strong> Google Mail</li>
                  <li>🍎 <strong>Apple iCloud:</strong> iCloud Mail</li>
                  <li>📮 <strong>Outlook / Hotmail:</strong> Microsoft Mail</li>
                  <li>📬 <strong>Yahoo:</strong> Yahoo Mail</li>
                  <li>⚙️ <strong>Eigener SMTP-Server:</strong> Benutzerdefinierter Server</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Erforderliche Informationen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>🔐 <strong>SMTP Host:</strong> Server-Adresse (z.B. smtp.gmail.com)</li>
                  <li>🔌 <strong>SMTP Port:</strong> Port-Nummer (z.B. 587 oder 465)</li>
                  <li>🔒 <strong>SSL/TLS:</strong> Verschlüsselung aktivieren</li>
                  <li>📧 <strong>E-Mail-Adresse:</strong> Ihre E-Mail-Adresse</li>
                  <li>🔑 <strong>Passwort:</strong> Passwort oder App-Passwort</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabEmail === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Gmail konfigurieren
                </Typography>
                <Typography variant="body2" paragraph>
                  So konfigurieren Sie Gmail für E-Mail-Benachrichtigungen:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 1: App-Passwort erstellen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Gehen Sie zu <strong>https://myaccount.google.com</strong></li>
                  <li>Klicken Sie auf "Sicherheit"</li>
                  <li>Aktivieren Sie "2-Schritt-Verifizierung" (falls noch nicht aktiviert)</li>
                  <li>Klicken Sie auf "App-Passwörter"</li>
                  <li>Wählen Sie "Mail" und "Andere (benutzerdefiniert)"</li>
                  <li>Geben Sie einen Namen ein (z.B. "MyMediCloud MMC")</li>
                  <li>Klicken Sie auf "Generieren"</li>
                  <li><strong>Wichtig:</strong> Kopieren Sie das App-Passwort (wird nur einmal angezeigt!)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 2: Konfiguration im System
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>E-Mail-Anbieter:</strong> Wählen Sie "Gmail"</li>
                  <li><strong>SMTP Host:</strong> Wird automatisch auf "smtp.gmail.com" gesetzt</li>
                  <li><strong>SMTP Port:</strong> Wird automatisch auf "587" gesetzt</li>
                  <li><strong>SSL/TLS:</strong> Wird automatisch aktiviert</li>
                  <li><strong>Absender-E-Mail:</strong> Ihre Gmail-Adresse (z.B. name@gmail.com)</li>
                  <li><strong>Benutzername:</strong> Ihre Gmail-Adresse (z.B. name@gmail.com)</li>
                  <li><strong>Passwort:</strong> Das erstellte App-Passwort (nicht Ihr normales Passwort!)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Gmail SMTP-Einstellungen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>SMTP Host:</strong> smtp.gmail.com</li>
                  <li><strong>SMTP Port:</strong> 587 (TLS) oder 465 (SSL)</li>
                  <li><strong>SSL/TLS:</strong> Aktiviert</li>
                  <li><strong>Authentifizierung:</strong> Erforderlich</li>
                  <li><strong>Passwort:</strong> App-Passwort (nicht normales Passwort!)</li>
                </Box>
              </Box>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Wichtig:</strong> Verwenden Sie für Gmail immer ein App-Passwort, 
                  nicht Ihr normales Gmail-Passwort. Normale Passwörter funktionieren nicht!
                </Typography>
              </Alert>
            </Box>
          )}

          {helpTabEmail === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Apple iCloud konfigurieren
                </Typography>
                <Typography variant="body2" paragraph>
                  So konfigurieren Sie Apple iCloud Mail:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 1: App-spezifisches Passwort erstellen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Gehen Sie zu <strong>https://appleid.apple.com</strong></li>
                  <li>Melden Sie sich mit Ihrer Apple-ID an</li>
                  <li>Klicken Sie auf "App-spezifische Passwörter"</li>
                  <li>Klicken Sie auf "Passwort generieren"</li>
                  <li>Geben Sie einen Namen ein (z.B. "MyMediCloud MMC")</li>
                  <li>Klicken Sie auf "Erstellen"</li>
                  <li><strong>Wichtig:</strong> Kopieren Sie das Passwort (wird nur einmal angezeigt!)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 2: Konfiguration im System
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>E-Mail-Anbieter:</strong> Wählen Sie "Apple iCloud"</li>
                  <li><strong>SMTP Host:</strong> Wird automatisch auf "smtp.mail.me.com" gesetzt</li>
                  <li><strong>SMTP Port:</strong> Wird automatisch auf "587" gesetzt</li>
                  <li><strong>SSL/TLS:</strong> Wird automatisch aktiviert</li>
                  <li><strong>Absender-E-Mail:</strong> Ihre iCloud-Adresse (z.B. name@icloud.com)</li>
                  <li><strong>Benutzername:</strong> Ihre iCloud-Adresse (z.B. name@icloud.com)</li>
                  <li><strong>Passwort:</strong> Das erstellte app-spezifische Passwort</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  iCloud SMTP-Einstellungen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>SMTP Host:</strong> smtp.mail.me.com</li>
                  <li><strong>SMTP Port:</strong> 587 (TLS)</li>
                  <li><strong>SSL/TLS:</strong> Aktiviert</li>
                  <li><strong>Authentifizierung:</strong> Erforderlich</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabEmail === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Outlook / Hotmail konfigurieren
                </Typography>
                <Typography variant="body2" paragraph>
                  So konfigurieren Sie Outlook oder Hotmail:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 1: App-Passwort erstellen (falls 2FA aktiviert)
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Gehen Sie zu <strong>https://account.microsoft.com</strong></li>
                  <li>Klicken Sie auf "Sicherheit"</li>
                  <li>Aktivieren Sie "Zweistufige Überprüfung" (falls noch nicht aktiviert)</li>
                  <li>Klicken Sie auf "App-Passwörter"</li>
                  <li>Wählen Sie "Mail" und "Andere"</li>
                  <li>Geben Sie einen Namen ein (z.B. "MyMediCloud MMC")</li>
                  <li>Klicken Sie auf "Generieren"</li>
                  <li><strong>Wichtig:</strong> Kopieren Sie das App-Passwort</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 2: Konfiguration im System
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>E-Mail-Anbieter:</strong> Wählen Sie "Outlook / Hotmail"</li>
                  <li><strong>SMTP Host:</strong> Wird automatisch auf "smtp-mail.outlook.com" gesetzt</li>
                  <li><strong>SMTP Port:</strong> Wird automatisch auf "587" gesetzt</li>
                  <li><strong>SSL/TLS:</strong> Wird automatisch aktiviert</li>
                  <li><strong>Absender-E-Mail:</strong> Ihre Outlook/Hotmail-Adresse</li>
                  <li><strong>Benutzername:</strong> Ihre Outlook/Hotmail-Adresse</li>
                  <li><strong>Passwort:</strong> App-Passwort (falls 2FA aktiviert) oder normales Passwort</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Outlook SMTP-Einstellungen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>SMTP Host:</strong> smtp-mail.outlook.com</li>
                  <li><strong>SMTP Port:</strong> 587 (TLS)</li>
                  <li><strong>SSL/TLS:</strong> Aktiviert</li>
                  <li><strong>Authentifizierung:</strong> Erforderlich</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabEmail === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Yahoo konfigurieren
                </Typography>
                <Typography variant="body2" paragraph>
                  So konfigurieren Sie Yahoo Mail:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 1: App-Passwort erstellen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Gehen Sie zu <strong>https://login.yahoo.com</strong></li>
                  <li>Klicken Sie auf "Account-Sicherheit"</li>
                  <li>Aktivieren Sie "Zweistufige Überprüfung" (falls noch nicht aktiviert)</li>
                  <li>Klicken Sie auf "App-Passwörter generieren"</li>
                  <li>Geben Sie einen Namen ein (z.B. "MyMediCloud MMC")</li>
                  <li>Klicken Sie auf "Generieren"</li>
                  <li><strong>Wichtig:</strong> Kopieren Sie das App-Passwort</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 2: Konfiguration im System
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>E-Mail-Anbieter:</strong> Wählen Sie "Yahoo"</li>
                  <li><strong>SMTP Host:</strong> Wird automatisch auf "smtp.mail.yahoo.com" gesetzt</li>
                  <li><strong>SMTP Port:</strong> Wird automatisch auf "587" gesetzt</li>
                  <li><strong>SSL/TLS:</strong> Wird automatisch aktiviert</li>
                  <li><strong>Absender-E-Mail:</strong> Ihre Yahoo-Adresse</li>
                  <li><strong>Benutzername:</strong> Ihre Yahoo-Adresse</li>
                  <li><strong>Passwort:</strong> Das erstellte App-Passwort</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Yahoo SMTP-Einstellungen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>SMTP Host:</strong> smtp.mail.yahoo.com</li>
                  <li><strong>SMTP Port:</strong> 587 (TLS) oder 465 (SSL)</li>
                  <li><strong>SSL/TLS:</strong> Aktiviert</li>
                  <li><strong>Authentifizierung:</strong> Erforderlich</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabEmail === 5 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Eigener SMTP-Server konfigurieren
                </Typography>
                <Typography variant="body2" paragraph>
                  So konfigurieren Sie einen eigenen SMTP-Server:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 1: SMTP-Daten erhalten
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Kontaktieren Sie Ihren E-Mail-Provider oder IT-Administrator</li>
                  <li>Erfragen Sie die SMTP-Einstellungen:
                    <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                      <li>SMTP Host (z.B. mail.example.com)</li>
                      <li>SMTP Port (z.B. 587, 465, 25)</li>
                      <li>SSL/TLS Anforderung</li>
                      <li>Benutzername und Passwort</li>
                    </Box>
                  </li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 2: Konfiguration im System
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>E-Mail-Anbieter:</strong> Wählen Sie "Eigener SMTP-Server"</li>
                  <li><strong>SMTP Host:</strong> Geben Sie die Server-Adresse ein (z.B. mail.example.com)</li>
                  <li><strong>SMTP Port:</strong> Geben Sie den Port ein (z.B. 587, 465, 25)</li>
                  <li><strong>SSL/TLS:</strong> Aktivieren Sie, wenn erforderlich (normalerweise für Port 465)</li>
                  <li><strong>Absender-E-Mail:</strong> Ihre E-Mail-Adresse</li>
                  <li><strong>Benutzername:</strong> Ihr SMTP-Benutzername</li>
                  <li><strong>Passwort:</strong> Ihr SMTP-Passwort</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Häufige SMTP-Ports
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>587:</strong> TLS (empfohlen, SSL/TLS aktivieren)</li>
                  <li><strong>465:</strong> SSL (SSL/TLS aktivieren)</li>
                  <li><strong>25:</strong> Unverschlüsselt (nicht empfohlen)</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabEmail === 6 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Test-E-Mail senden
                </Typography>
                <Typography variant="body2" paragraph>
                  Nach der Konfiguration können Sie eine Test-E-Mail senden, um die Einstellungen zu überprüfen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Test-E-Mail senden
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Geben Sie eine Test-E-Mail-Adresse ein (z.B. test@example.com)</li>
                  <li>Klicken Sie auf "Test senden"</li>
                  <li>Warten Sie auf die Bestätigung</li>
                  <li>Überprüfen Sie Ihr E-Mail-Postfach</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Fehlerbehebung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>❌ <strong>Fehler beim Senden:</strong> Überprüfen Sie SMTP-Host und Port</li>
                  <li>❌ <strong>Authentifizierungsfehler:</strong> Überprüfen Sie Benutzername und Passwort</li>
                  <li>❌ <strong>SSL/TLS-Fehler:</strong> Aktivieren/Deaktivieren Sie SSL/TLS</li>
                  <li>❌ <strong>Port-Fehler:</strong> Versuchen Sie einen anderen Port (587, 465)</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabEmail === 7 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Sicherheit
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>🔐 <strong>App-Passwörter:</strong> Verwenden Sie immer App-Passwörter für Gmail, iCloud, Yahoo</li>
                  <li>🔐 <strong>Verschlüsselung:</strong> Aktivieren Sie SSL/TLS immer</li>
                  <li>🔐 <strong>Passwort:</strong> Speichern Sie Passwörter sicher</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Konfiguration
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Testen:</strong> Senden Sie immer eine Test-E-Mail</li>
                  <li>✅ <strong>Überprüfen:</strong> Überprüfen Sie die Einstellungen regelmäßig</li>
                  <li>✅ <strong>Backup:</strong> Dokumentieren Sie die Einstellungen</li>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogEmailOpen(false)} variant="contained">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hilfe-Dialog für SMS Konfiguration */}
      <Dialog 
        open={helpDialogSmsOpen} 
        onClose={() => setHelpDialogSmsOpen(false)} 
        maxWidth="lg" 
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: { 
            minHeight: { xs: '100%', sm: '700px' },
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: { xs: 'none', sm: '0 8px 32px rgba(0,0,0,0.12)' },
            m: { xs: 0, sm: 2 },
            height: { xs: '100%', sm: 'auto' },
            maxHeight: { xs: '100%', sm: '90vh' }
          }
        }}
      >
        <GradientDialogTitle 
          title="Detaillierte Konfigurationsanleitung: SMS" 
          onClose={() => setHelpDialogSmsOpen(false)}
        />
        <DialogContent sx={{ 
          pt: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          overflow: 'auto',
          maxHeight: { xs: 'calc(100vh - 120px)', sm: 'calc(90vh - 120px)' }
        }}>
          <Tabs 
            value={helpTabSms} 
            onChange={(_, v) => setHelpTabSms(v)} 
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Übersicht" />
            <Tab label="Seven.io" />
            <Tab label="Twilio" />
            <Tab label="websms.at" />
            <Tab label="Test-SMS" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTabSms === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  SMS Konfiguration
                </Typography>
                <Typography variant="body1" paragraph>
                  Die SMS-Konfiguration ermöglicht es, SMS-Benachrichtigungen für Online-Buchungen 
                  zu versenden.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Unterstützte Provider
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📱 <strong>Seven.io:</strong> Internationaler SMS-Provider</li>
                  <li>📞 <strong>Twilio:</strong> Cloud-Kommunikationsplattform</li>
                  <li>🇦🇹 <strong>websms.at:</strong> Österreichischer SMS-Provider</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabSms === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Seven.io konfigurieren
                </Typography>
                <Typography variant="body2" paragraph>
                  So konfigurieren Sie Seven.io:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 1: Seven.io Account erstellen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Gehen Sie zu <strong>https://www.seven.io</strong></li>
                  <li>Erstellen Sie ein Konto</li>
                  <li>Melden Sie sich an</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 2: API Key erhalten
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Im Dashboard: "API" → "API Keys"</li>
                  <li>Klicken Sie auf "Neuen API Key erstellen"</li>
                  <li>Geben Sie einen Namen ein (z.B. "MyMediCloud MMC")</li>
                  <li>Kopieren Sie den API Key</li>
                  <li><strong>Wichtig:</strong> API Key sicher speichern!</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 3: Konfiguration im System
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>SMS-Provider:</strong> Wählen Sie "Seven.io"</li>
                  <li><strong>Seven.io API Key:</strong> Einfügen des kopierten API Keys</li>
                  <li><strong>Absender-Name:</strong> Name, der in der SMS angezeigt wird (optional)</li>
                  <li>Klicken Sie auf "SMS-Konfiguration speichern"</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabSms === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Twilio konfigurieren
                </Typography>
                <Typography variant="body2" paragraph>
                  So konfigurieren Sie Twilio:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 1: Twilio Account erstellen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Gehen Sie zu <strong>https://www.twilio.com</strong></li>
                  <li>Erstellen Sie ein Konto</li>
                  <li>Melden Sie sich an</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 2: Credentials erhalten
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Im Dashboard: "Account" → "Credentials"</li>
                  <li>Kopieren Sie "Account SID"</li>
                  <li>Kopieren Sie "Auth Token"</li>
                  <li>Kaufen Sie eine Telefonnummer (falls noch nicht vorhanden)</li>
                  <li>Kopieren Sie die Telefonnummer</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 3: Konfiguration im System
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>SMS-Provider:</strong> Wählen Sie "Twilio"</li>
                  <li><strong>Account SID:</strong> Einfügen der Account SID</li>
                  <li><strong>Auth Token:</strong> Einfügen des Auth Tokens</li>
                  <li><strong>Absender-Nummer:</strong> Ihre Twilio Telefonnummer (z.B. +1234567890)</li>
                  <li>Klicken Sie auf "SMS-Konfiguration speichern"</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabSms === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  websms.at konfigurieren
                </Typography>
                <Typography variant="body2" paragraph>
                  So konfigurieren Sie websms.at:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 1: websms.at Account erstellen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Gehen Sie zu <strong>https://www.websms.at</strong></li>
                  <li>Erstellen Sie ein Konto</li>
                  <li>Melden Sie sich an</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 2: Credentials erhalten
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Benutzername: Ihre websms.at Benutzername</li>
                  <li>Passwort: Ihr websms.at Passwort</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 3: Konfiguration im System
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>SMS-Provider:</strong> Wählen Sie "websms.at"</li>
                  <li><strong>Benutzername:</strong> Ihr websms.at Benutzername</li>
                  <li><strong>Passwort:</strong> Ihr websms.at Passwort</li>
                  <li>Klicken Sie auf "SMS-Konfiguration speichern"</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabSms === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Test-SMS senden
                </Typography>
                <Typography variant="body2" paragraph>
                  Nach der Konfiguration können Sie eine Test-SMS senden.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Test-SMS senden
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Geben Sie eine Test-Telefonnummer ein (z.B. +436641234567)</li>
                  <li><strong>Wichtig:</strong> Internationales Format erforderlich (+43...)</li>
                  <li>Klicken Sie auf "Test senden"</li>
                  <li>Warten Sie auf die Bestätigung</li>
                  <li>Überprüfen Sie Ihr Telefon</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Telefonnummer-Format
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Korrekt:</strong> +436641234567 (mit Ländercode)</li>
                  <li>❌ <strong>Falsch:</strong> 06641234567 (ohne Ländercode)</li>
                  <li>❌ <strong>Falsch:</strong> 00436641234567 (mit 00 statt +)</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabSms === 5 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Sicherheit
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>🔐 <strong>API Keys:</strong> Geheim halten, nicht weitergeben</li>
                  <li>🔐 <strong>Passwörter:</strong> Sicher speichern</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Konfiguration
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Testen:</strong> Senden Sie immer eine Test-SMS</li>
                  <li>✅ <strong>Format:</strong> Verwenden Sie internationales Format (+43...)</li>
                  <li>✅ <strong>Überprüfen:</strong> Überprüfen Sie die Einstellungen regelmäßig</li>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogSmsOpen(false)} variant="contained">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Allgemeiner Hilfe & Leitfaden Dialog */}
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
          title="Hilfe & Leitfaden: Einstellungen"
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
            <Tab label="Abrechnung" />
            <Tab label="Integrationen" />
            <Tab label="Kommunikation" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Einstellungen
                </Typography>
                <Typography variant="body1" paragraph>
                  Die Einstellungsseite ermöglicht es, System- und Benutzereinstellungen zu konfigurieren.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptbereiche
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>💰 <strong>Abrechnung:</strong> Abrechnungseinstellungen konfigurieren</li>
                  <li>🔗 <strong>Integrationen:</strong> ELDA, WAHonline und andere Integrationen einrichten</li>
                  <li>📧 <strong>E-Mail:</strong> E-Mail-Einstellungen konfigurieren</li>
                  <li>📱 <strong>SMS:</strong> SMS-Einstellungen konfigurieren</li>
                  <li>🔄 <strong>Updates:</strong> Update-Monitoring verwalten</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Abrechnungseinstellungen
                </Typography>
                <Typography variant="body2" paragraph>
                  So konfigurieren Sie die Abrechnung:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Funktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Automatische Abrechnung:</strong> Aktivieren/Deaktivieren</li>
                  <li>⏰ <strong>Arbeitsstunden:</strong> Arbeitsstunden pro Tag konfigurieren</li>
                  <li>📋 <strong>Einstellungen speichern:</strong> Änderungen speichern</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Integrationen
                </Typography>
                <Typography variant="body2" paragraph>
                  Verfügbare Integrationen:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Integrationen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📋 <strong>ELDA:</strong> Elektronische Abrechnung</li>
                  <li>🌐 <strong>WAHonline:</strong> WAHonline Integration</li>
                  <li>📧 <strong>E-Mail:</strong> E-Mail-Versand konfigurieren</li>
                  <li>📱 <strong>SMS:</strong> SMS-Versand konfigurieren</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Kommunikation
                </Typography>
                <Typography variant="body2" paragraph>
                  So konfigurieren Sie E-Mail und SMS:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  E-Mail & SMS
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📧 <strong>E-Mail:</strong> SMTP-Einstellungen konfigurieren</li>
                  <li>📱 <strong>SMS:</strong> SMS-Provider konfigurieren</li>
                  <li>✅ <strong>Testen:</strong> E-Mail und SMS testen</li>
                  <li>💾 <strong>Speichern:</strong> Einstellungen speichern</li>
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
                  Einstellungen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Prüfen Sie Einstellungen regelmäßig</li>
                  <li>✅ Testen Sie Integrationen nach Konfiguration</li>
                  <li>✅ Dokumentieren Sie Änderungen</li>
                  <li>✅ Sichern Sie wichtige Einstellungen</li>
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

      {/* Hilfe-Dialog für Proaktive Benachrichtigungen */}
      <Dialog 
        open={helpDialogNotificationsOpen} 
        onClose={() => setHelpDialogNotificationsOpen(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: { 
            minHeight: { xs: '100%', sm: '600px' },
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: { xs: 'none', sm: '0 8px 32px rgba(0,0,0,0.12)' },
            m: { xs: 0, sm: 2 },
            height: { xs: '100%', sm: 'auto' },
            maxHeight: { xs: '100%', sm: '90vh' }
          }
        }}
      >
        <GradientDialogTitle 
          title="Hilfe & Leitfaden: Proaktive Benachrichtigungen" 
          onClose={() => setHelpDialogNotificationsOpen(false)}
        />
        <DialogContent sx={{ 
          p: { xs: 2, sm: 3 },
          overflowY: 'auto',
          maxHeight: { xs: 'calc(100vh - 120px)', sm: 'calc(90vh - 120px)' }
        }}>
          <Tabs 
            value={helpTabNotifications} 
            onChange={(_, v) => setHelpTabNotifications(v)} 
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Übersicht" />
            <Tab label="Benachrichtigungstypen" />
            <Tab label="Konfiguration" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTabNotifications === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Proaktive Benachrichtigungen
                </Typography>
                <Typography variant="body1" paragraph>
                  Das System sendet Ihnen automatisch intelligente, proaktive Benachrichtigungen basierend auf 
                  Patientendaten, Terminen und Aufgaben. Sie können individuell festlegen, welche 
                  Benachrichtigungen Sie erhalten möchten.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Vorteile
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Proaktiv:</strong> Erhalten Sie wichtige Informationen automatisch</li>
                  <li>✅ <strong>Intelligent:</strong> Benachrichtigungen basieren auf Kontext und Relevanz</li>
                  <li>✅ <strong>Anpassbar:</strong> Jeder Benutzer kann seine Einstellungen individuell konfigurieren</li>
                  <li>✅ <strong>Priorisiert:</strong> Wichtige Benachrichtigungen werden hervorgehoben</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabNotifications === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Verfügbare Benachrichtigungstypen
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  📅 Anstehende Termine
                </Typography>
                <Typography variant="body2" paragraph>
                  Sie erhalten Benachrichtigungen für Termine in den nächsten 24 Stunden. Die Priorität 
                  hängt von der verbleibenden Zeit ab (urgent: &lt; 2h, high: &lt; 6h).
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  📊 Fehlende Vitalwerte
                </Typography>
                <Typography variant="body2" paragraph>
                  Erinnerungen für Patienten, die seit über einem Jahr keine Vitalwerte mehr haben. 
                  Hilft dabei, regelmäßige Kontrollen nicht zu vergessen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  🚨 Kritische Laborwerte
                </Typography>
                <Typography variant="body2" paragraph>
                  Sofortige Benachrichtigungen (Priorität: urgent) bei kritischen Laborwerten, die 
                  noch nicht behandelt wurden. Wichtig für die Patientensicherheit.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  ⚠️ Überfällige Aufgaben
                </Typography>
                <Typography variant="body2" paragraph>
                  Benachrichtigungen für Aufgaben, die ihr Fälligkeitsdatum überschritten haben. 
                  Priorität steigt mit der Anzahl der überfälligen Tage.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  💊 Medikamenten-Erinnerungen
                </Typography>
                <Typography variant="body2" paragraph>
                  Erinnerungen zur Überprüfung langfristiger Medikationen (seit &gt; 1 Jahr verschrieben). 
                  Hilft bei der regelmäßigen Medikamenten-Review.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  📅 Nachsorgetermine
                </Typography>
                <Typography variant="body2" paragraph>
                  Empfehlungen für Nachsorgetermine bei Patienten mit aktiven Diagnosen, die seit 
                  über 3 Monaten keinen Termin mehr hatten.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  📋 Unvollständige Patientendaten
                </Typography>
                <Typography variant="body2" paragraph>
                  Hinweise auf fehlende wichtige Patientendaten (E-Mail, Telefon, Geburtsdatum, 
                  Allergien, Vorerkrankungen). Standardmäßig deaktiviert.
                </Typography>
              </Box>
            </Box>
          )}

          {helpTabNotifications === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Konfiguration
                </Typography>
                <Typography variant="body2" paragraph>
                  So konfigurieren Sie Ihre Benachrichtigungseinstellungen:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 1: Master-Switch
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Aktivieren oder deaktivieren Sie den Master-Switch "Proaktive Benachrichtigungen aktivieren"</li>
                  <li>Wenn deaktiviert, erhalten Sie keine proaktiven Benachrichtigungen</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 2: Einzelne Typen konfigurieren
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wenn der Master-Switch aktiviert ist, können Sie einzelne Benachrichtigungstypen aktivieren/deaktivieren</li>
                  <li>Jeder Typ kann unabhängig gesteuert werden</li>
                  <li>Änderungen werden sofort gespeichert</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 3: Speichern
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Benachrichtigungseinstellungen speichern"</li>
                  <li>Die Einstellungen werden sofort wirksam</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabNotifications === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Empfohlene Einstellungen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Anstehende Termine:</strong> Immer aktiviert (wichtig für Terminplanung)</li>
                  <li>✅ <strong>Kritische Laborwerte:</strong> Immer aktiviert (Patientensicherheit)</li>
                  <li>✅ <strong>Überfällige Aufgaben:</strong> Immer aktiviert (Aufgabenmanagement)</li>
                  <li>⚙️ <strong>Fehlende Vitalwerte:</strong> Nach Bedarf aktivieren</li>
                  <li>⚙️ <strong>Medikamenten-Erinnerungen:</strong> Nach Bedarf aktivieren</li>
                  <li>⚙️ <strong>Nachsorgetermine:</strong> Nach Bedarf aktivieren</li>
                  <li>❌ <strong>Unvollständige Patientendaten:</strong> Standardmäßig deaktiviert (weniger wichtig)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Tipps
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>💡 Passen Sie die Einstellungen an Ihre Arbeitsweise an</li>
                  <li>💡 Sie können jederzeit Einstellungen ändern</li>
                  <li>💡 Wichtige Benachrichtigungen (urgent/high) sollten aktiviert bleiben</li>
                  <li>💡 Weniger wichtige Benachrichtigungen können deaktiviert werden, um Benachrichtigungs-Overload zu vermeiden</li>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogNotificationsOpen(false)} variant="contained">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
