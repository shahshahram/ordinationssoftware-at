import React, { useState } from 'react';
import { Box, Typography, Container, Button, Alert, Snackbar } from '@mui/material';
import { PatientAdmissionData } from '../types/PatientExtended';
import api from '../utils/api';

const PatientAdmissionTest: React.FC = () => {
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const testPatientData: PatientAdmissionData = {
    firstName: 'Test',
    lastName: 'Patient',
    dateOfBirth: '1990-01-01',
    gender: 'm',
    socialSecurityNumber: '1234567890',
    insuranceProvider: 'ÖGK (Österreichische Gesundheitskasse)',
    address: {
      street: 'Teststraße 1',
      zipCode: '1010',
      city: 'Wien',
      country: 'Österreich',
    },
    phone: '+43123456789',
    email: 'test@example.com',
    emergencyContact: {
      name: 'Notfallkontakt',
      phone: '+43987654321',
    },
    primaryCarePhysician: {
      name: 'Dr. Hausarzt',
      location: 'Wien',
    },
    currentMedications: [],
    allergies: [],
    preExistingConditions: ['Diabetes'],
    previousSurgeries: [],
    bloodType: 'A+',
    isPregnant: false,
    referralSource: 'self',
    visitReason: 'Routineuntersuchung',
    dataProtectionConsent: true,
    electronicCommunicationConsent: true,
  };

  const handleTestSave = async () => {
    try {
      console.log('Testing patient admission with data:', testPatientData);
      
      // Daten für das Backend vorbereiten
      const patientData = {
        ...testPatientData,
        // Konvertiere das Datum für das Backend
        dateOfBirth: testPatientData.dateOfBirth ? new Date(testPatientData.dateOfBirth).toISOString() : undefined,
        // Füge Timestamps hinzu
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Setze Standard-Status
        status: 'aktiv'
      };

      console.log('Prepared patient data for API:', patientData);

      // API-Call an das Backend
      const response = await api.post('/patients-extended', patientData);
      
      console.log('Patient created successfully:', response);
      
      setSnackbar({
        open: true,
        message: 'Test-Patient erfolgreich erstellt!',
        severity: 'success'
      });
      
    } catch (error: any) {
      console.error('Error creating test patient:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      setSnackbar({
        open: true,
        message: `Fehler beim Erstellen des Test-Patienten: ${error.response?.data?.message || error.message}`,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Patientenaufnahme Test
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Test der Patientenaufnahme-Funktionalität mit vordefinierten Daten.
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Diese Seite testet die Patientenaufnahme mit vordefinierten Testdaten.
        Klicken Sie auf den Button unten, um einen Test-Patienten zu erstellen.
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          onClick={handleTestSave}
          size="large"
        >
          Test-Patient erstellen
        </Button>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test-Daten:
        </Typography>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '16px', 
          borderRadius: '4px',
          overflow: 'auto',
          fontSize: '12px'
        }}>
          {JSON.stringify(testPatientData, null, 2)}
        </pre>
      </Box>

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

export default PatientAdmissionTest;
