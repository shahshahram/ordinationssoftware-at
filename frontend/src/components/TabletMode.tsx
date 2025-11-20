import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  AppBar, 
  Toolbar, 
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  ExitToApp, 
  CheckCircle 
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { validateCheckInSession, submitCheckInData, clearError } from '../store/slices/checkinSlice';
import { fetchPatients } from '../store/slices/patientSlice';
import QRCodeScanner from './QRCodeScanner';
import SelfCheckInForm from './SelfCheckInForm';

interface TabletModeProps {
  onExit: () => void;
}

const TabletMode: React.FC<TabletModeProps> = ({ onExit }) => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.checkin);
  const [mode, setMode] = useState<'scanner' | 'form' | 'success'>('scanner');
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const handleScan = async (result: string) => {
    try {
      console.log('TabletMode: QR Code received:', result);
      setScannedData(result);
      setScannerError(null);
      
      // Einfache Validierung - nur prüfen ob Code existiert
      console.log('TabletMode: Validating check-in session...');
      const validationResult = await dispatch(validateCheckInSession(result)).unwrap();
      console.log('TabletMode: Validation result:', validationResult);
      
      // Wenn Code gültig ist, direkt zum Formular
      if (validationResult && validationResult.success) {
        console.log('TabletMode: Check-in session validated successfully');
        console.log('TabletMode: Switching to form mode');
        setMode('form');
      } else {
        console.error('TabletMode: Validation failed:', validationResult);
        setScannerError(`Validierung fehlgeschlagen: ${validationResult?.message || 'Unbekannter Fehler'}`);
      }
      
    } catch (error: any) {
      console.error('Error validating check-in session:', error);
      setScannerError(`Fehler beim Validieren des QR-Codes: ${error.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (scannedData) {
        console.log('TabletMode: Submitting form data:', data);
        const result = await dispatch(submitCheckInData({ checkInId: scannedData, patientData: data })).unwrap();
        console.log('TabletMode: Form submission result:', result);
        
        if (result.success) {
          console.log('TabletMode: Form submitted successfully, switching to success mode');
          // Patientenliste aktualisieren nach erfolgreichem Check-in
          dispatch(fetchPatients(1));
          setMode('success');
        } else {
          console.error('TabletMode: Form submission failed:', result);
          setScannerError(`Formular konnte nicht gespeichert werden: ${result.message || 'Unbekannter Fehler'}`);
        }
      }
    } catch (error: any) {
      console.error('Error submitting form data:', error);
      setScannerError(`Fehler beim Speichern des Formulars: ${error.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleBackToScanner = () => {
    setMode('scanner');
    setScannedData(null);
    setPatientData(null);
    dispatch(clearError());
  };

  const handleReturnToAssistant = () => {
    setMode('scanner');
    setScannedData(null);
    setPatientData(null);
    dispatch(clearError());
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Tablet-Modus - Selbst-Check-in
          </Typography>
          <IconButton color="inherit" onClick={onExit}>
            <ExitToApp />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
        {(error || scannerError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || scannerError}
          </Alert>
        )}
        
        {mode === 'scanner' && (
          <Box>
            <Typography variant="h4" gutterBottom textAlign="center" color="primary">
              QR-Code scannen
            </Typography>
            <Typography variant="h6" textAlign="center" sx={{ mb: 4 }}>
              Scannen Sie den QR-Code für den Selbst-Check-in
            </Typography>
            <QRCodeScanner 
              onScan={handleScan}
              onError={(error) => {
                console.error('Scanner error:', error);
                setScannerError(`Scanner-Fehler: ${error}`);
              }}
            />
          </Box>
        )}

        {mode === 'form' && (
          <Box>
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'success.light', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircle color="success" sx={{ mr: 2, fontSize: 32 }} />
                <Typography variant="h5" color="success.dark" fontWeight="bold">
                  Willkommen zum Selbst-Check-in!
                </Typography>
              </Box>
              <Typography variant="h6" color="success.dark">
                Bitte füllen Sie das Formular aus, um sich anzumelden.
              </Typography>
            </Paper>

            <SelfCheckInForm 
              onComplete={handleFormSubmit}
              onCancel={handleBackToScanner}
            />
          </Box>
        )}

        {mode === 'success' && (
          <Box textAlign="center">
            <CheckCircle sx={{ fontSize: 100, color: 'success.main', mb: 3 }} />
            <Typography variant="h3" gutterBottom color="success.main" fontWeight="bold">
              Check-in erfolgreich!
            </Typography>
            <Typography variant="h6" sx={{ mb: 4 }}>
              Sie wurden erfolgreich angemeldet.
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
              Das Tablet kann nun an die Assistentin zurückgegeben werden.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleReturnToAssistant}
              sx={{ mr: 2, px: 4, py: 2 }}
            >
              Neuer Check-in
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={onExit}
              sx={{ px: 4, py: 2 }}
            >
              Tablet zurückgeben
            </Button>
          </Box>
        )}

        {isLoading && (
          <Box textAlign="center" sx={{ mt: 4 }}>
            <CircularProgress size={60} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Patientendaten werden geladen...
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
        <Typography variant="body2" textAlign="center" color="text.secondary">
          Tablet-Modus aktiv • {new Date().toLocaleString('de-DE')}
        </Typography>
      </Paper>
    </Box>
  );
};

export default TabletMode;
