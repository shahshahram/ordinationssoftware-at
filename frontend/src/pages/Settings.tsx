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
  Switch
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

  // Lade aktuelle Einstellungen
  useEffect(() => {
    if (user?.profile?.preferences?.autoBillingEnabled !== undefined) {
      setAutoBillingEnabled(user.profile.preferences.autoBillingEnabled);
    }
  }, [user]);

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
            autoBillingEnabled: autoBillingEnabled
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

        {/* Weitere Einstellungen können hier hinzugefügt werden */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weitere Einstellungen
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Weitere Einstellungen werden hier angezeigt.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
