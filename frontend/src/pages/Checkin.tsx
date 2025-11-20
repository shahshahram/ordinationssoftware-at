import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Container
} from '@mui/material';
import {
  Person,
  Phone,
  Email,
  CalendarToday,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';

const Checkin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phone: '',
    email: ''
  });
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [patientInfo, setPatientInfo] = useState<any>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidationError('Kein Token in der URL gefunden');
        setIsValidating(false);
        return;
      }

      try {
        console.log('Validating token:', token);
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/checkin/validate/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Validation result:', result);
        
        if (result && result.success) {
          setIsValidating(false);
        } else {
          setValidationError(result?.message || 'Token ist ungültig');
          setIsValidating(false);
        }
      } catch (error: any) {
        console.error('Validation error:', error);
        setValidationError(error.message || 'Fehler beim Validieren des Tokens');
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/checkin/submit/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patientData: formData }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();

      if (result.success) {
        setSubmitSuccess(true);
        setPatientInfo(result.data);
      } else {
        setValidationError(result.message || 'Fehler beim Speichern der Daten');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      setValidationError(error.message || 'Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>Check-in Session wird validiert...</Typography>
      </Box>
    );
  }

  if (validationError) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', p: 3 }}>
        <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h4" color="error" textAlign="center">Fehler beim Validieren</Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mt: 1 }}>
          {validationError}
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
          Bitte wenden Sie sich an das Praxispersonal für Unterstützung.
        </Typography>
      </Box>
    );
  }

  if (submitSuccess) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', p: 3 }}>
        <CheckCircle color="success" sx={{ fontSize: 100, mb: 3 }} />
        <Typography variant="h3" color="success.main" fontWeight="bold" textAlign="center">Check-in erfolgreich!</Typography>
        <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
          Vielen Dank für Ihre Angaben. Sie können das Tablet nun an das Praxispersonal zurückgeben.
        </Typography>
        {patientInfo && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="body1">
              <strong>Patient:</strong> {patientInfo.firstName} {patientInfo.lastName}
            </Typography>
            <Typography variant="body1">
              <strong>Status:</strong> {patientInfo.isNewPatient ? 'Neuer Patient erstellt' : 'Patientendaten aktualisiert'}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom textAlign="center" color="primary.main">
          Willkommen zum Selbst-Check-in
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
          Bitte füllen Sie das folgende Formular aus, um Ihre Daten zu aktualisieren oder sich neu zu registrieren.
        </Typography>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <TextField
                fullWidth
                label="Vorname"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                InputProps={{
                  startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                }}
              />
              <TextField
                fullWidth
                label="Nachname"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                InputProps={{
                  startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <TextField
                fullWidth
                label="Geburtsdatum"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                required
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <CalendarToday sx={{ mr: 1, color: 'action.active' }} />
                }}
              />
              <TextField
                fullWidth
                label="Telefonnummer"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                InputProps={{
                  startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />
                }}
              />
            </Box>
            <TextField
              fullWidth
              label="E-Mail (optional)"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              InputProps={{
                startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Box>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              sx={{ px: 4, py: 1.5 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Daten absenden'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default Checkin;