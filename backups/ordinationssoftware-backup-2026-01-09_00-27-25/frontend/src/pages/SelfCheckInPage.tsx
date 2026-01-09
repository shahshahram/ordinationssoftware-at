import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Container, Snackbar, Alert } from '@mui/material';
import SelfCheckInForm from '../components/SelfCheckInForm';
import { PatientAdmissionData } from '../types/PatientExtended';
import api from '../utils/api';

const SelfCheckInPage: React.FC = () => {
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const handleSave = async (data: PatientAdmissionData) => {
    try {
      console.log('Self check-in data:', data);
      
      // Daten für das Backend vorbereiten
      const patientData = {
        ...data,
        // Konvertiere das Datum für das Backend
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : undefined,
        // Füge Timestamps hinzu
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Setze Standard-Status für Self-Check-In
        status: 'self-checkin',
        // Markiere als Self-Check-In
        referralSource: 'self'
      };

      // API-Call an das Backend
      const response = await api.post('/patients-extended', patientData);
      
      console.log('Self check-in completed successfully:', response);
      
      setSnackbar({
        open: true,
        message: 'Check-In erfolgreich abgeschlossen! Sie können sich jetzt an der Rezeption melden.',
        severity: 'success'
      });
      
      // Nach 3 Sekunden zur Startseite navigieren
      setTimeout(() => {
        navigate('/');
      }, 3000);
      
    } catch (error: any) {
      console.error('Error during self check-in:', error);
      
      // Prüfe auf Duplikat-Fehler (HTTP 409)
      if (error?.response?.status === 409) {
        const duplicateData = error.response.data?.duplicate;
        const message = duplicateData 
          ? `Ein Patient mit diesem Namen und Geburtsdatum existiert bereits:\n${duplicateData.firstName} ${duplicateData.lastName} (${new Date(duplicateData.dateOfBirth).toLocaleDateString('de-DE')})\n\nBitte melden Sie sich an der Rezeption.`
          : 'Ein Patient mit diesen Daten existiert bereits. Bitte melden Sie sich an der Rezeption.';
        
        setSnackbar({
          open: true,
          message: message,
          severity: 'warning'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Fehler beim Check-In. Bitte versuchen Sie es erneut oder melden Sie sich an der Rezeption.',
          severity: 'error'
        });
      }
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Self-Check-In
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Digitales Check-In-Formular zur Vorbereitung auf Ihren Praxisbesuch. 
          Füllen Sie Ihre Daten vorab aus und sparen Sie Zeit an der Rezeption.
        </Typography>
      </Box>

      <SelfCheckInForm 
        onComplete={handleSave}
        onCancel={handleCancel}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SelfCheckInPage;
