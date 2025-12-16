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
  Stack
} from '@mui/material';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../store/hooks';
import { loadUser } from '../store/slices/authSlice';
import api from '../utils/api';

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
  }, [user]);

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
      </Grid>
    </Box>
  );
};

export default Settings;
