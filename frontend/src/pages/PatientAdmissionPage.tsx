import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Container, Snackbar, Alert } from '@mui/material';
import PatientAdmissionForm from '../components/PatientAdmissionForm';
import { PatientAdmissionData } from '../types/PatientExtended';
import api from '../utils/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPatients } from '../store/slices/patientSlice';

const PatientAdmissionPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
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
      console.log('Patient admission data:', data);
      console.log('Current user from Redux:', user);
      
      // Hole die aktuelle Benutzer-ID - vereinfachte Lösung
      let userId = null;
      
      // 1. Versuche User-ID aus Redux Store
      if (user && user._id) {
        userId = user._id;
        console.log('Using user ID from Redux store:', userId);
      } else {
        // 2. Versuche User-ID aus Token zu extrahieren
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.userId;
            console.log('Extracted user ID from token:', userId);
          } catch (error) {
            console.error('Failed to extract user ID from token:', error);
          }
        }
        
        // 3. Falls immer noch keine User-ID, hole sie vom API
        if (!userId) {
          try {
            const userResponse = await api.get('/auth/me') as any;
            const userData = userResponse.user || userResponse.data?.user;
            if (userData && userData._id) {
              userId = userData._id;
              console.log('Fetched user ID from API:', userId);
            }
          } catch (error) {
            console.error('Failed to fetch user data from API:', error);
          }
        }
      }
      
      if (!userId) {
        console.error('Could not determine user ID from any source');
        throw new Error('Benutzer nicht authentifiziert. Bitte melden Sie sich erneut an.');
      }
      
      // Daten für das Backend vorbereiten
      const patientData = {
        ...data,
        // Füge userId hinzu (erforderlich für das Backend)
        userId: userId,
        // Konvertiere das Datum für das Backend
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : undefined,
        // Füge Timestamps hinzu
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Setze Standard-Status
        status: 'aktiv',
        // Stelle sicher, dass alle erforderlichen Felder vorhanden sind
        firstName: data.firstName?.trim() || '',
        lastName: data.lastName?.trim() || '',
        gender: data.gender || 'm',
        socialSecurityNumber: data.socialSecurityNumber?.trim().replace(/\D/g, '') || '',
        insuranceProvider: data.insuranceProvider?.trim() || '',
        phone: data.phone?.trim() || '',
        email: data.email?.trim() || '',
        address: {
          street: data.address?.street?.trim() || '',
          zipCode: data.address?.zipCode?.trim() || '',
          city: data.address?.city?.trim() || '',
          country: data.address?.country?.trim() || 'Österreich'
        },
        // Medizinische Daten
        bloodType: data.bloodType || 'Unbekannt',
        height: data.height ? Number(data.height) : undefined,
        weight: data.weight ? Number(data.weight) : undefined,
        bmi: data.height && data.weight ? 
          Number((Number(data.weight) / Math.pow(Number(data.height) / 100, 2)).toFixed(1)) : undefined,
        isPregnant: data.gender === 'w' ? Boolean(data.isPregnant) : false,
        pregnancyWeek: data.gender === 'w' && data.isPregnant ? 
          Number(data.pregnancyWeek) : undefined,
        isBreastfeeding: data.gender === 'w' ? Boolean(data.isBreastfeeding) : false,
        hasPacemaker: Boolean(data.hasPacemaker),
        hasDefibrillator: Boolean(data.hasDefibrillator),
        implants: data.implants || [],
        smokingStatus: data.smokingStatus || 'non-smoker',
        cigarettesPerDay: data.cigarettesPerDay ? Number(data.cigarettesPerDay) : undefined,
        yearsOfSmoking: data.yearsOfSmoking ? Number(data.yearsOfSmoking) : undefined,
        quitSmokingDate: data.quitSmokingDate ? new Date(data.quitSmokingDate).toISOString() : undefined,
        // Arrays für medizinische Daten
        allergies: Array.isArray(data.allergies) ? data.allergies : [],
        currentMedications: Array.isArray(data.currentMedications) ? data.currentMedications : [],
        medicalHistory: Array.isArray(data.preExistingConditions) ? data.preExistingConditions : [],
        // Notfallkontakt
        emergencyContact: data.emergencyContact ? {
          name: data.emergencyContact.name || '',
          phone: data.emergencyContact.phone || '',
          relationship: data.emergencyContact.relationship || ''
        } : { name: '', phone: '', relationship: '' },
        // Hausarzt
        primaryCarePhysician: data.primaryCarePhysician ? {
          name: data.primaryCarePhysician.name || '',
          location: data.primaryCarePhysician.location || ''
        } : { name: '', location: '' },
        // Administrative Daten
        referralSource: data.referralSource || 'self',
        referralDoctor: data.referralDoctor || '',
        visitReason: data.visitReason || '',
        // Einverständniserklärungen
        dataProtectionConsent: Boolean(data.dataProtectionConsent),
        dataProtectionConsentDate: new Date().toISOString(),
        electronicCommunicationConsent: Boolean(data.electronicCommunicationConsent),
        electronicCommunicationConsentDate: data.electronicCommunicationConsent ? 
          new Date().toISOString() : undefined
      };

      console.log('Prepared patient data for API:', patientData);
      console.log('User ID being used:', userId);
      console.log('Medical data being sent:');
      console.log('- Allergies:', patientData.allergies);
      console.log('- Current Medications:', patientData.currentMedications);
      console.log('- Medical History:', patientData.medicalHistory);
      console.log('- Implants:', patientData.implants);
      console.log('- Smoking Status:', patientData.smokingStatus);
      console.log('- Cigarettes Per Day:', patientData.cigarettesPerDay);
      console.log('- Years of Smoking:', patientData.yearsOfSmoking);
      console.log('- Quit Smoking Date:', patientData.quitSmokingDate);

      // API-Call an das Backend
      const response = await api.post('/patients-extended', patientData);
      
      console.log('API response:', response);
      
      // Prüfe, ob die API einen Fehler zurückgegeben hat
      if (!response.success) {
        console.error('Patient creation failed:', response);
        
        // Erstelle eine detaillierte Fehlermeldung
        let errorMessage = response.message || 'Unbekannter Fehler';
        
        if (response.errors && response.errors.length > 0) {
          errorMessage += '\n\nValidierungsfehler:\n' + response.errors.join('\n');
        }
        
        if (response.details) {
          const detailErrors = Object.values(response.details).map((err: any) => err.message);
          if (detailErrors.length > 0) {
            errorMessage += '\n\nDetails:\n' + detailErrors.join('\n');
          }
        }
        
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: 'error'
        });
        return;
      }
      
      console.log('Patient created successfully:', response);
      
      // Patientenliste aktualisieren
      dispatch(fetchPatients(1));
      
      setSnackbar({
        open: true,
        message: 'Patient erfolgreich aufgenommen! Sie werden zum Patientenorganizer weitergeleitet...',
        severity: 'success'
      });
      
      // Nach 2 Sekunden navigieren
      setTimeout(() => {
        const responseData = response as any;
        console.log('Full response data for navigation:', responseData);
        
        // Extrahiere die Patienten-ID aus verschiedenen möglichen Strukturen
        let patientId = null;
        
        if (responseData.data?.data?._id) {
          // Struktur: { data: { data: { _id: "..." } } }
          patientId = responseData.data.data._id;
        } else if (responseData.data?._id) {
          // Struktur: { data: { _id: "..." } }
          patientId = responseData.data._id;
        } else if (responseData._id) {
          // Struktur: { _id: "..." }
          patientId = responseData._id;
        } else if (responseData.data?.id) {
          // Struktur: { data: { id: "..." } }
          patientId = responseData.data.id;
        } else if (responseData.id) {
          // Struktur: { id: "..." }
          patientId = responseData.id;
        }
        
        console.log('Extracted patient ID:', patientId);
        
        if (patientId) {
          // Immer zum Patientenorganizer des neuen Patienten navigieren
          console.log('Navigating to patient organizer:', `/patient-organizer/${patientId}`);
          navigate(`/patient-organizer/${patientId}`);
        } else {
          console.error('No patient ID found in response, navigating to patients list');
          // Fallback zur Patientenliste, falls keine ID verfügbar
          navigate('/patients');
        }
      }, 2000);
      
    } catch (error: any) {
      console.error('Error creating patient:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      // Prüfe auf Validierungsfehler (HTTP 400)
      if (error?.response?.status === 400) {
        const errorData = error.response.data;
        const validationErrors = errorData?.errors || [];
        
        let errorMessage = 'Validierungsfehler:\n';
        validationErrors.forEach((err: any) => {
          errorMessage += `• ${err.msg}\n`;
        });
        
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: 'error'
        });
      }
      // Prüfe auf Duplikat-Fehler (HTTP 409)
      else if (error?.response?.status === 409) {
        const duplicateData = error.response.data?.duplicate;
        const message = duplicateData 
          ? `Ein Patient mit diesem Namen und Geburtsdatum existiert bereits:\n${duplicateData.firstName} ${duplicateData.lastName} (${new Date(duplicateData.dateOfBirth).toLocaleDateString('de-DE')})`
          : 'Ein Patient mit diesen Daten existiert bereits.';
        
        setSnackbar({
          open: true,
          message: message,
          severity: 'warning'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Fehler beim Speichern des Patienten: ${error.response?.data?.message || error.message}`,
          severity: 'error'
        });
      }
    }
  };

  const handleCancel = () => {
    navigate('/patients');
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Patientenaufnahme
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Vollständiges Aufnahmeformular für neue Patienten mit österreichischen Praxisstandards.
        </Typography>
      </Box>

      <PatientAdmissionForm 
        onSave={handleSave}
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

export default PatientAdmissionPage;
