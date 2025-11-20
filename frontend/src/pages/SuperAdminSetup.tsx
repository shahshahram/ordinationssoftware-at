import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Chip,
  Paper
} from '@mui/material';
import { Security, PersonAdd, CheckCircle, Warning } from '@mui/icons-material';
import api from '../utils/api';

interface SetupStatus {
  superAdminExists: boolean;
  userCount: number;
  adminExists: boolean;
  needsSetup: boolean;
  setupComplete: boolean;
  recommendations: {
    needsSuperAdmin: boolean;
    hasUsers: boolean;
    hasAdmin: boolean;
  };
}

const SuperAdminSetup: React.FC = () => {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    'System-Status prüfen',
    'Super Admin erstellen',
    'Setup abschließen'
  ];

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/setup/status');
      console.log('Setup Status Response:', response);
      
      // Die API gibt die Antwort direkt zurück: {success: true, data: {...}}
      if (response && response.success && response.data) {
        const data = response.data as SetupStatus;
        setSetupStatus(data);
        
        if (data.setupComplete) {
          setActiveStep(2);
        } else if (data.needsSetup) {
          setActiveStep(1);
        }
      } else {
        console.error('Invalid response structure:', response);
        setError('Ungültige Antwort vom Server');
      }
    } catch (error) {
      console.error('Setup Status Fehler:', error);
      setError('Fehler beim Prüfen des Setup-Status');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('Vorname ist erforderlich');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Nachname ist erforderlich');
      return false;
    }
    if (!formData.email.trim()) {
      setError('E-Mail ist erforderlich');
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwort-Bestätigung stimmt nicht überein');
      return false;
    }
    return true;
  };

  const createSuperAdmin = async () => {
    if (!validateForm()) return;

    try {
      setCreating(true);
      setError(null);
      
      const response = await api.post('/setup/super-admin', formData);
      
      setSuccess('Super Administrator erfolgreich erstellt!');
      setActiveStep(2);
      
      // Aktualisiere Setup-Status
      await checkSetupStatus();
      
    } catch (error: any) {
      console.error('Super Admin Erstellung Fehler:', error);
      setError(error.response?.data?.message || 'Fehler beim Erstellen des Super Administrators');
    } finally {
      setCreating(false);
    }
  };

  const getStatusIcon = () => {
    if (!setupStatus) return <CircularProgress size={24} />;
    
    if (setupStatus.setupComplete) {
      return <CheckCircle color="success" />;
    } else if (setupStatus.needsSetup) {
      return <Warning color="warning" />;
    } else {
      return <Security color="info" />;
    }
  };

  const getStatusMessage = () => {
    if (!setupStatus) return 'Prüfe System-Status...';
    
    if (setupStatus.setupComplete) {
      return 'Super Administrator ist bereits konfiguriert';
    } else if (setupStatus.needsSetup) {
      return 'System benötigt Super Administrator Setup';
    } else {
      return 'System-Status unklar';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Prüfe System-Status...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Security sx={{ mr: 2, fontSize: 32 }} color="primary" />
            <Typography variant="h4" component="h1">
              Super Administrator Setup
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Status-Anzeige */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {getStatusIcon()}
              <Typography variant="h6" sx={{ ml: 1 }}>
                {getStatusMessage()}
              </Typography>
            </Box>
            
            {setupStatus && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Benutzer gesamt: {setupStatus.userCount}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Admin vorhanden: {setupStatus.adminExists ? 'Ja' : 'Nein'}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: '1 / -1', mt: 1 }}>
                  <Box sx={{ mt: 1 }}>
                    {setupStatus.recommendations.needsSuperAdmin && (
                      <Chip label="Super Admin erforderlich" color="warning" size="small" sx={{ mr: 1 }} />
                    )}
                    {setupStatus.recommendations.hasUsers && (
                      <Chip label="Benutzer vorhanden" color="info" size="small" sx={{ mr: 1 }} />
                    )}
                    {setupStatus.recommendations.hasAdmin && (
                      <Chip label="Admin vorhanden" color="success" size="small" />
                    )}
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>

          {/* Fehler/Success Anzeige */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {/* Super Admin Erstellung */}
          {activeStep === 1 && setupStatus?.needsSetup && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Super Administrator erstellen
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <TextField
                    fullWidth
                    label="Vorname"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label="Nachname"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <TextField
                    fullWidth
                    label="E-Mail"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label="Passwort"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    helperText="Mindestens 8 Zeichen"
                  />
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label="Passwort bestätigen"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                  />
                </Box>
              </Box>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={createSuperAdmin}
                  disabled={creating}
                  startIcon={creating ? <CircularProgress size={20} /> : <PersonAdd />}
                >
                  {creating ? 'Erstelle...' : 'Super Admin erstellen'}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={checkSetupStatus}
                  disabled={creating}
                >
                  Status aktualisieren
                </Button>
              </Box>
            </Box>
          )}

          {/* Setup abgeschlossen */}
          {activeStep === 2 && setupStatus?.setupComplete && (
            <Box sx={{ textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" sx={{ mb: 2 }}>
                Setup erfolgreich abgeschlossen!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Der Super Administrator wurde erfolgreich erstellt und das System ist bereit zur Nutzung.
              </Typography>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" sx={{ mb: 2 }}>
                Nächste Schritte:
              </Typography>
              <Box sx={{ textAlign: 'left', maxWidth: 400, mx: 'auto' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  1. Melden Sie sich mit den Super Admin-Daten an
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  2. Ändern Sie das Passwort
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  3. Erstellen Sie weitere Administratoren
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  4. Konfigurieren Sie die Systemeinstellungen
                </Typography>
              </Box>
            </Box>
          )}

          {/* Sicherheitshinweise */}
          <Divider sx={{ my: 3 }} />
          <Box sx={{ bgcolor: 'warning.light', p: 2, borderRadius: 1 }}>
            <Typography variant="h6" color="warning.dark" sx={{ mb: 1 }}>
              🔐 Sicherheitshinweise
            </Typography>
            <Typography variant="body2" color="warning.dark">
              • Ändern Sie das Super Admin-Passwort nach dem ersten Login<br/>
              • Verwenden Sie ein starkes, einzigartiges Passwort<br/>
              • Teilen Sie Super Admin-Zugangsdaten nur mit autorisierten Personen<br/>
              • Aktivieren Sie 2FA wenn verfügbar<br/>
              • Überwachen Sie Super Admin-Aktivitäten regelmäßig
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SuperAdminSetup;
