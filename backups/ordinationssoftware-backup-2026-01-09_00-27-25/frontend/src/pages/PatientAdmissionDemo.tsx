import React from 'react';
import { Box, Typography, Paper, Container, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PersonAdd, Login, ArrowBack } from '@mui/icons-material';
import PatientAdmissionPage from './PatientAdmissionPage';
import SelfCheckInPage from './SelfCheckInPage';

const PatientAdmissionDemo: React.FC = () => {
  const navigate = useNavigate();
  const [activeForm, setActiveForm] = React.useState<'menu' | 'admission' | 'checkin'>('menu');

  const handleBackToMenu = () => {
    setActiveForm('menu');
  };

  if (activeForm === 'admission') {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBackToMenu}
            variant="outlined"
          >
            Zurück
          </Button>
          <Typography variant="h4" component="h1">
            Patientenaufnahme
          </Typography>
        </Box>
        <PatientAdmissionPage />
      </Container>
    );
  }

  if (activeForm === 'checkin') {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBackToMenu}
            variant="outlined"
          >
            Zurück
          </Button>
          <Typography variant="h4" component="h1">
            Self-Check-In
          </Typography>
        </Box>
        <SelfCheckInPage />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Patientenaufnahme-Formulare
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Wählen Sie das gewünschte Formular aus, um die neue Patientenaufnahme-Funktionalität zu testen.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Box>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 6,
              }
            }}
            onClick={() => setActiveForm('admission')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonAdd sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
              <Typography variant="h5" component="h2">
                Patientenaufnahme
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flexGrow: 1 }}>
              Vollständiges Aufnahmeformular für neue Patienten mit allen österreichischen Pflichtfeldern, 
              medizinischen Daten und administrativen Informationen.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="caption" color="primary" sx={{ 
                bgcolor: 'primary.light', 
                color: 'primary.contrastText', 
                px: 1, 
                py: 0.5, 
                borderRadius: 1 
              }}>
                Österreichische Standards
              </Typography>
              <Typography variant="caption" color="primary" sx={{ 
                bgcolor: 'primary.light', 
                color: 'primary.contrastText', 
                px: 1, 
                py: 0.5, 
                borderRadius: 1 
              }}>
                DSGVO-konform
              </Typography>
              <Typography variant="caption" color="primary" sx={{ 
                bgcolor: 'primary.light', 
                color: 'primary.contrastText', 
                px: 1, 
                py: 0.5, 
                borderRadius: 1 
              }}>
                Vollständige Validierung
              </Typography>
            </Box>
          </Paper>
        </Box>

        <Box>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 6,
              }
            }}
            onClick={() => setActiveForm('checkin')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Login sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
              <Typography variant="h5" component="h2">
                Self-Check-In
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flexGrow: 1 }}>
              Digitales Check-In-Formular für Patienten zur Vorbereitung auf den Praxisbesuch. 
              Patienten können ihre Daten vorab eingeben und Zeit sparen.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="caption" color="secondary" sx={{ 
                bgcolor: 'secondary.light', 
                color: 'secondary.contrastText', 
                px: 1, 
                py: 0.5, 
                borderRadius: 1 
              }}>
                Patientenselbstbedienung
              </Typography>
              <Typography variant="caption" color="secondary" sx={{ 
                bgcolor: 'secondary.light', 
                color: 'secondary.contrastText', 
                px: 1, 
                py: 0.5, 
                borderRadius: 1 
              }}>
                Zeitersparnis
              </Typography>
              <Typography variant="caption" color="secondary" sx={{ 
                bgcolor: 'secondary.light', 
                color: 'secondary.contrastText', 
                px: 1, 
                py: 0.5, 
                borderRadius: 1 
              }}>
                Mobile-optimiert
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>

      <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          🎯 Features der neuen Patientenaufnahme-Lösung:
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <Typography variant="body2" component="div">
              <strong>Österreichische Pflichtfelder:</strong>
              <ul>
                <li>Stammdaten (Name, Geburt, Geschlecht, SV-Nummer)</li>
                <li>Adressdaten mit PLZ-Validierung</li>
                <li>Versicherungsdaten</li>
                <li>Notfallkontakt</li>
              </ul>
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" component="div">
              <strong>Medizinische Daten:</strong>
              <ul>
                <li>Vorerkrankungen & Allergien</li>
                <li>Aktuelle Medikamente</li>
                <li>Impfstatus & Blutgruppe</li>
                <li>Schwangerschaft (falls relevant)</li>
              </ul>
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" component="div">
              <strong>Administrative Daten:</strong>
              <ul>
                <li>Zuweisung durch (Arzt, Selbst, etc.)</li>
                <li>Besuchsgrund</li>
                <li>DSGVO-Einverständnis</li>
                <li>Elektronische Kommunikation</li>
              </ul>
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" component="div">
              <strong>Technische Features:</strong>
              <ul>
                <li>Responsive CSS Grid Layout</li>
                <li>Vollständige TypeScript-Typisierung</li>
                <li>Client- & Server-seitige Validierung</li>
                <li>Backend-API mit MongoDB</li>
              </ul>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default PatientAdmissionDemo;
