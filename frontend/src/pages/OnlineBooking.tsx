import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Grid,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CalendarToday,
  Person,
  LocalHospital,
  CheckCircle,
  Schedule,
  AccessTime,
  Check,
  QuestionAnswer,
} from '@mui/icons-material';
import {
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
} from '@mui/material';
import api from '../utils/api';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  workingHours: any;
}

interface TimeSlot {
  start: string;
  end: string;
  duration: number;
}

interface Room {
  id: string;
  name: string;
  type: string;
  capacity?: number;
  location?: {
    id: string;
    name: string;
    code?: string;
  };
}

interface Device {
  id: string;
  name: string;
  type: string;
  category?: string;
  location?: {
    id: string;
    name: string;
    code?: string;
  };
}

interface ServiceRequirements {
  requiresRoomSelection: boolean;
  roomQuantityRequired: number;
  requiresDeviceSelection: boolean;
  deviceQuantityRequired: number;
}

interface AnamnesisQuestion {
  _id?: string;
  questionText: string;
  questionType: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multiselect';
  options?: string[];
  isRequired: boolean;
  defaultValue?: any;
}

interface Service {
  _id: string;
  code: string;
  name: string;
  anamnesisQuestions?: AnamnesisQuestion[];
}

interface BookingData {
  patient: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    socialSecurityNumber?: string;
  };
  appointment: {
    date: string;
    startTime: string;
    type: string;
    reason: string;
    notes?: string;
    assigned_rooms?: string[];
    assigned_devices?: string[];
    serviceId?: string;
  };
  doctor: {
    id: string;
  };
}

const OnlineBooking: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  
  // Debug: Log activeStep changes
  useEffect(() => {
    console.log('[OnlineBooking] activeStep changed to:', activeStep);
  }, [activeStep]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'warning' | 'info' 
  });
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [requiresOptIn, setRequiresOptIn] = useState(false);
  const [optInCode, setOptInCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [optInError, setOptInError] = useState<string | null>(null);
  
  // Service und Anamnese
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [anamnesisQuestions, setAnamnesisQuestions] = useState<AnamnesisQuestion[]>([]);
  const [anamnesisAnswers, setAnamnesisAnswers] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState<BookingData>({
    patient: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      socialSecurityNumber: ''
    },
    appointment: {
      date: '',
      startTime: '',
      type: '',
      reason: '',
      notes: ''
    },
    doctor: {
      id: ''
    }
  });

  // Lade verfügbare Ärzte
  useEffect(() => {
    loadDoctors();
    loadServices();
  }, []);

  // Lade Services
  const loadServices = async () => {
    try {
      const response = await api.get<any>('/service-catalog?limit=1000&is_active=true');
      if (response.success && response.data) {
        const servicesData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.data || []);
        setServices(servicesData);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  // Lade Anamnese-Fragen, wenn Service ausgewählt wird
  useEffect(() => {
    if (selectedService?.anamnesisQuestions && selectedService.anamnesisQuestions.length > 0) {
      setAnamnesisQuestions(selectedService.anamnesisQuestions);
      // Initialisiere Antworten mit Default-Werten
      const initialAnswers: Record<string, any> = {};
      selectedService.anamnesisQuestions.forEach((q) => {
        if (q.defaultValue !== undefined) {
          initialAnswers[q._id || q.questionText] = q.defaultValue;
        }
      });
      setAnamnesisAnswers(initialAnswers);
    } else {
      setAnamnesisQuestions([]);
      setAnamnesisAnswers({});
    }
  }, [selectedService]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const response = await api.get<any>('/online-booking/doctors');
      console.log('OnlineBooking: API response:', response);
      
      if (response.success && response.data) {
        // API gibt { success: true, data: [...] } zurück
        // api.ts wrapper gibt { data: { success: true, data: [...] }, success: true } zurück
        const doctorsData = response.data.data || response.data;
        console.log('OnlineBooking: Doctors data:', doctorsData);
        
        if (Array.isArray(doctorsData)) {
          setDoctors(doctorsData);
          if (doctorsData.length === 0) {
            setSnackbar({ 
              open: true, 
              message: 'Keine Ärzte mit aktivierter Online-Buchung verfügbar. Bitte aktivieren Sie die Online-Buchung für einen Arzt in der Personalverwaltung.', 
              severity: 'info' 
            });
          }
        } else {
          console.warn('OnlineBooking: Doctors data is not an array:', doctorsData);
          setDoctors([]);
        }
      } else {
        console.warn('OnlineBooking: API response not successful:', response);
        setDoctors([]);
        setSnackbar({ 
          open: true, 
          message: 'Keine Ärzte verfügbar. Bitte aktivieren Sie die Online-Buchung für einen Arzt.', 
          severity: 'warning' 
        });
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
      setDoctors([]);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Laden der Ärzte', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async (doctorId: string, date: string) => {
    try {
      setLoading(true);
      console.log('[OnlineBooking] Loading slots for doctorId:', doctorId, 'date:', date);
      const response = await api.get<any>(`/online-booking/availability?doctorId=${doctorId}&date=${date}`);
      console.log('[OnlineBooking] Availability response:', response);
      
      if (response.success && response.data) {
        // API-Wrapper gibt zurück: { data: { success: true, data: { availableSlots: [...] } }, success: true }
        // Backend gibt zurück: { success: true, data: { availableSlots: [...] } }
        console.log('[OnlineBooking] Full response structure:', {
          responseSuccess: response.success,
          responseData: response.data,
          responseDataType: typeof response.data,
          responseDataKeys: response.data ? Object.keys(response.data) : [],
          responseDataData: response.data?.data,
          responseDataDataKeys: response.data?.data ? Object.keys(response.data.data) : []
        });
        
        // Versuche verschiedene Pfade
        let slots: TimeSlot[] = [];
        
        // Pfad 1: response.data.data.availableSlots (wenn Backend-Antwort in response.data.data ist)
        if (response.data?.data?.availableSlots && Array.isArray(response.data.data.availableSlots)) {
          slots = response.data.data.availableSlots;
          console.log('[OnlineBooking] Found slots via response.data.data.availableSlots:', slots.length);
        }
        // Pfad 2: response.data.availableSlots (wenn Backend-Antwort direkt in response.data ist)
        else if (response.data?.availableSlots && Array.isArray(response.data.availableSlots)) {
          slots = response.data.availableSlots;
          console.log('[OnlineBooking] Found slots via response.data.availableSlots:', slots.length);
        }
        // Pfad 3: response.data.data ist direkt das Array
        else if (Array.isArray(response.data?.data)) {
          slots = response.data.data;
          console.log('[OnlineBooking] Found slots via response.data.data (array):', slots.length);
        }
        // Pfad 4: response.data ist direkt das Array
        else if (Array.isArray(response.data)) {
          slots = response.data;
          console.log('[OnlineBooking] Found slots via response.data (array):', slots.length);
        }
        
        console.log('[OnlineBooking] Final extracted slots:', slots.length, slots.slice(0, 3));
        setAvailableSlots(slots);
        
        if (slots.length === 0) {
          // Versuche Message aus verschiedenen Pfaden zu extrahieren
          const message = response.data?.data?.message || response.data?.message || 'Keine verfügbaren Termine für dieses Datum';
          setSnackbar({ 
            open: true, 
            message: message, 
            severity: 'info' 
          });
        }
      } else {
        console.warn('[OnlineBooking] Response not successful:', response);
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error loading available slots:', error);
      setAvailableSlots([]);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Laden der verfügbaren Termine', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setFormData(prev => ({
      ...prev,
      doctor: { id: doctor.id }
    }));
    setActiveStep(1);
  };

  const handleDateSelect = (date: string) => {
    // Validiere das Datum bevor es gesetzt wird
    if (date && !isNaN(new Date(date).getTime())) {
      setSelectedDate(date);
      setFormData(prev => ({
        ...prev,
        appointment: { ...prev.appointment, date }
      }));
      if (selectedDoctor) {
        console.log('[OnlineBooking] handleDateSelect: Loading slots for', selectedDoctor.id, date);
        loadAvailableSlots(selectedDoctor.id, date);
        // Automatisch zu Schritt 3 wechseln, wenn Slots geladen werden
        setActiveStep(2);
      } else {
        console.warn('[OnlineBooking] handleDateSelect: No doctor selected');
      }
    } else {
      console.error('Invalid date selected:', date);
      setSnackbar({
        open: true,
        message: 'Ungültiges Datum ausgewählt',
        severity: 'error'
      });
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    console.log('[OnlineBooking] Slot selected:', slot);
    setSelectedSlot(slot);
    setFormData(prev => ({
      ...prev,
      appointment: { 
        ...prev.appointment, 
        startTime: slot.start,
        type: prev.appointment.type || 'Allgemeine Beratung' // Default, aber behalte vorhandenen Wert
      }
    }));
    console.log('[OnlineBooking] Switching to step 3 (data entry)');
    setActiveStep(3); // Schritt 4: Daten eingeben (Index 3)
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedFormChange = (parent: string, field: string, value: any) => {
    // Spezielle Validierung für Datumsfelder
    if (field === 'dateOfBirth' && value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        console.error('Invalid date of birth:', value);
        setSnackbar({
          open: true,
          message: 'Ungültiges Geburtsdatum',
          severity: 'error'
        });
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof BookingData],
        [field]: value
      }
    }));
  };

  const handleAnamnesisAnswer = (questionId: string, answer: any) => {
    setAnamnesisAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleVerifyOptIn = async () => {
    if (!bookingResult?.bookingNumber || !optInCode) {
      setOptInError('Bitte geben Sie den Bestätigungscode ein.');
      return;
    }
    setVerifyingCode(true);
    setOptInError(null);
    try {
      const response = await api.post('/online-booking/verify-opt-in', {
        bookingNumber: bookingResult.bookingNumber,
        code: optInCode
      });
      if (response.success) {
        setSnackbar({ 
          open: true, 
          message: 'E-Mail erfolgreich bestätigt! Ihr Termin ist nun bestätigt.', 
          severity: 'success' 
        });
        setRequiresOptIn(false);
        setShowConfirmation(true);
      } else {
        setOptInError(response.message || 'Ungültiger Code oder abgelaufen.');
      }
    } catch (err: any) {
      setOptInError(err.response?.data?.message || 'Fehler bei der Code-Verifizierung.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResendOptIn = async () => {
    if (!bookingResult?.bookingNumber || !formData.patient.email) {
      setOptInError('Buchungsdaten für erneuten Versand nicht verfügbar.');
      return;
    }
    setLoading(true);
    setOptInError(null);
    try {
      const response = await api.post('/online-booking/resend-opt-in', {
        bookingNumber: bookingResult.bookingNumber,
        email: formData.patient.email
      });
      if (response.success) {
        setSnackbar({ 
          open: true, 
          message: 'Neuer Code wurde an Ihre E-Mail gesendet.', 
          severity: 'info' 
        });
        setOptInCode('');
      } else {
        setOptInError(response.message || 'Fehler beim erneuten Senden des Codes.');
      }
    } catch (err: any) {
      setOptInError(err.response?.data?.message || 'Fehler beim erneuten Senden des Codes.');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    try {
      setLoading(true);
      
      // Konvertiere Anamnese-Antworten in das erwartete Format
      const anamnesisResponses = anamnesisQuestions.map((q) => {
        const questionId = q._id || q.questionText;
        return {
          questionId: questionId,
          questionText: q.questionText,
          answer: anamnesisAnswers[questionId] ?? q.defaultValue ?? '',
          answeredAt: new Date().toISOString()
        };
      }).filter((r) => {
        // Filtere nur beantwortete Fragen oder Fragen mit Default-Werten
        const question = anamnesisQuestions.find(q => (q._id || q.questionText) === r.questionId);
        return question && (!question.isRequired || (r.answer !== '' && r.answer !== null && r.answer !== undefined));
      });

      const bookingData = {
        ...formData,
        appointment: {
          ...formData.appointment,
          serviceId: selectedService?._id
        },
        anamnesisResponses: anamnesisResponses
      };
      
      const response = await api.post('/online-booking/book', bookingData);
      
      if (response.success && response.data) {
        // API gibt { success: true, data: {...} } zurück
        // api.ts wrapper gibt { data: { success: true, data: {...} }, success: true } zurück
        const responseData = response.data as any;
        const bookingData = (responseData.data || responseData) as any;
        setBookingResult(bookingData);
        setShowConfirmation(true);
        setSnackbar({ 
          open: true, 
          message: 'Termin erfolgreich gebucht!', 
          severity: 'success' 
        });
      } else {
        setSnackbar({ 
          open: true, 
          message: response.message || 'Fehler beim Buchen des Termins', 
          severity: 'error' 
        });
      }
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      setSnackbar({ 
        open: true, 
        message: error?.response?.data?.message || 'Fehler beim Buchen des Termins', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error getting min date:', error);
      return new Date().toISOString().split('T')[0];
    }
  };

  const getMaxDate = () => {
    try {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);
      return maxDate.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error getting max date:', error);
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + 30);
      return fallback.toISOString().split('T')[0];
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const steps = [
    'Arzt auswählen',
    'Datum wählen',
    'Zeit wählen',
    'Daten eingeben',
    'Bestätigung'
  ];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Online-Terminbuchung
      </Typography>
      
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Buchen Sie Ihren Termin bequem online - 24/7 verfügbar
      </Typography>

      <Card sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical" nonLinear={false}>
          {/* Schritt 1: Arzt auswählen */}
          <Step>
            <StepLabel>
              <Box display="flex" alignItems="center" gap={1}>
                <LocalHospital />
                Arzt auswählen
              </Box>
            </StepLabel>
            <StepContent>
              <Typography variant="h6" gutterBottom>
                Wählen Sie Ihren Arzt
              </Typography>
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : doctors.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Keine Ärzte verfügbar</strong>
                  </Typography>
                  <Typography variant="body2">
                    Es sind derzeit keine Ärzte für Online-Buchungen verfügbar. 
                    Bitte aktivieren Sie die Online-Buchung für einen Arzt:
                  </Typography>
                  <Box component="ol" sx={{ mt: 1, pl: 2 }}>
                    <li>Gehen Sie zu "Personalverwaltung" → "Mitarbeiter"</li>
                    <li>Bearbeiten Sie einen Arzt</li>
                    <li>Aktivieren Sie "Online-Buchung aktiviert"</li>
                    <li>Speichern Sie die Änderungen</li>
                  </Box>
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {doctors.map((doctor) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={doctor.id}>
                      <Card 
                        sx={{ 
                          p: 2, 
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                        onClick={() => handleDoctorSelect(doctor)}
                      >
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <LocalHospital />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {doctor.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {doctor.specialization}
                            </Typography>
                          </Box>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </StepContent>
          </Step>

          {/* Schritt 2: Datum wählen */}
          <Step>
            <StepLabel>
              <Box display="flex" alignItems="center" gap={1}>
                <CalendarToday />
                Datum wählen
              </Box>
            </StepLabel>
            <StepContent>
              <Typography variant="h6" gutterBottom>
                Wählen Sie ein Datum
              </Typography>
              <TextField
                fullWidth
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateSelect(e.target.value)}
                inputProps={{
                  min: getMinDate(),
                  max: getMaxDate()
                }}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
              {selectedDate && (
                <Alert severity="info">
                  Verfügbare Termine für {selectedDate ? new Date(selectedDate).toLocaleDateString('de-DE') : selectedDate} werden geladen...
                </Alert>
              )}
            </StepContent>
          </Step>

          {/* Schritt 3: Zeit wählen */}
          <Step>
            <StepLabel>
              <Box display="flex" alignItems="center" gap={1}>
                <AccessTime />
                Zeit wählen
              </Box>
            </StepLabel>
            <StepContent>
              <Typography variant="h6" gutterBottom>
                Wählen Sie eine Zeit
              </Typography>
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : availableSlots.length > 0 ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {availableSlots.length} verfügbare Termine gefunden
                  </Typography>
                  <Grid container spacing={1}>
                    {availableSlots.map((slot, index) => (
                      <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                        <Chip
                          label={`${slot.start} - ${slot.end}`}
                          onClick={() => handleSlotSelect(slot)}
                          color={selectedSlot?.start === slot.start && selectedSlot?.end === slot.end ? 'primary' : 'default'}
                          variant={selectedSlot?.start === slot.start && selectedSlot?.end === slot.end ? 'filled' : 'outlined'}
                          sx={{ width: '100%', cursor: 'pointer' }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </>
              ) : selectedDate ? (
                <Alert severity="warning">
                  Keine verfügbaren Termine für dieses Datum
                </Alert>
              ) : (
                <Alert severity="info">
                  Bitte wählen Sie zuerst ein Datum aus
                </Alert>
              )}
            </StepContent>
          </Step>

          {/* Schritt 4: Daten eingeben */}
          <Step>
            <StepLabel>
              <Box display="flex" alignItems="center" gap={1}>
                <Person />
                Daten eingeben
              </Box>
            </StepLabel>
            <StepContent>
              <Typography variant="h6" gutterBottom>
                Ihre Kontaktdaten
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Vorname"
                    value={formData.patient.firstName}
                    onChange={(e) => handleNestedFormChange('patient', 'firstName', e.target.value)}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Nachname"
                    value={formData.patient.lastName}
                    onChange={(e) => handleNestedFormChange('patient', 'lastName', e.target.value)}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="E-Mail"
                    type="email"
                    value={formData.patient.email}
                    onChange={(e) => handleNestedFormChange('patient', 'email', e.target.value)}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Telefon"
                    value={formData.patient.phone}
                    onChange={(e) => handleNestedFormChange('patient', 'phone', e.target.value)}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Geburtsdatum"
                    type="date"
                    value={formData.patient.dateOfBirth}
                    onChange={(e) => handleNestedFormChange('patient', 'dateOfBirth', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Versicherungsnummer (optional)"
                    value={formData.patient.socialSecurityNumber}
                    onChange={(e) => handleNestedFormChange('patient', 'socialSecurityNumber', e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Autocomplete
                    options={services}
                    getOptionLabel={(option) => `${option.code || ''} - ${option.name}`}
                    value={selectedService}
                    onChange={(event, newValue) => {
                      setSelectedService(newValue);
                      if (newValue) {
                        handleNestedFormChange('appointment', 'type', newValue.name);
                        handleFormChange('appointment', {
                          ...formData.appointment,
                          serviceId: newValue._id,
                          type: newValue.name
                        });
                      } else {
                        handleNestedFormChange('appointment', 'type', '');
                        handleFormChange('appointment', {
                          ...formData.appointment,
                          serviceId: undefined,
                          type: ''
                        });
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Leistung/Service (optional)"
                        placeholder="Wählen Sie eine Leistung aus"
                      />
                    )}
                    isOptionEqualToValue={(option, value) => option._id === value._id}
                  />
                </Grid>
                {!selectedService && (
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Art der Behandlung</InputLabel>
                      <Select
                        value={formData.appointment.type}
                        onChange={(e) => handleNestedFormChange('appointment', 'type', e.target.value)}
                        label="Art der Behandlung"
                      >
                        <SelectMenuItem value="Allgemeine Beratung">Allgemeine Beratung</SelectMenuItem>
                        <SelectMenuItem value="Kontrolle">Kontrolle</SelectMenuItem>
                        <SelectMenuItem value="Impfung">Impfung</SelectMenuItem>
                        <SelectMenuItem value="Untersuchung">Untersuchung</SelectMenuItem>
                        <SelectMenuItem value="Notfall">Notfall</SelectMenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Grund des Termins"
                    multiline
                    rows={3}
                    value={formData.appointment.reason}
                    onChange={(e) => handleNestedFormChange('appointment', 'reason', e.target.value)}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Zusätzliche Notizen (optional)"
                    multiline
                    rows={2}
                    value={formData.appointment.notes}
                    onChange={(e) => handleNestedFormChange('appointment', 'notes', e.target.value)}
                  />
                </Grid>
              </Grid>
              
              {/* Anamnese-Fragen */}
              {anamnesisQuestions.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <QuestionAnswer />
                    Anamnese-Vorabfrage
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Bitte beantworten Sie die folgenden Fragen vor Ihrem Termin:
                  </Typography>
                  <Grid container spacing={2}>
                    {anamnesisQuestions.map((question, index) => {
                      const questionId = question._id || question.questionText;
                      const currentAnswer = anamnesisAnswers[questionId] ?? question.defaultValue ?? '';
                      
                      return (
                        <Grid size={{ xs: 12 }} key={index}>
                          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Typography variant="subtitle1" gutterBottom>
                              {question.questionText}
                              {question.isRequired && <span style={{ color: 'red' }}> *</span>}
                            </Typography>
                            
                            {question.questionType === 'text' && (
                              <TextField
                                fullWidth
                                value={currentAnswer}
                                onChange={(e) => handleAnamnesisAnswer(questionId, e.target.value)}
                                required={question.isRequired}
                                error={question.isRequired && !currentAnswer}
                              />
                            )}
                            
                            {question.questionType === 'textarea' && (
                              <TextField
                                fullWidth
                                multiline
                                rows={3}
                                value={currentAnswer}
                                onChange={(e) => handleAnamnesisAnswer(questionId, e.target.value)}
                                required={question.isRequired}
                                error={question.isRequired && !currentAnswer}
                              />
                            )}
                            
                            {question.questionType === 'number' && (
                              <TextField
                                fullWidth
                                type="number"
                                value={currentAnswer}
                                onChange={(e) => handleAnamnesisAnswer(questionId, parseFloat(e.target.value) || 0)}
                                required={question.isRequired}
                                error={question.isRequired && !currentAnswer}
                              />
                            )}
                            
                            {question.questionType === 'boolean' && (
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={currentAnswer === true || currentAnswer === 'true'}
                                    onChange={(e) => handleAnamnesisAnswer(questionId, e.target.checked)}
                                  />
                                }
                                label={currentAnswer === true || currentAnswer === 'true' ? 'Ja' : 'Nein'}
                              />
                            )}
                            
                            {question.questionType === 'select' && question.options && (
                              <FormControl fullWidth required={question.isRequired}>
                                <InputLabel>{question.questionText}</InputLabel>
                                <Select
                                  value={currentAnswer}
                                  onChange={(e) => handleAnamnesisAnswer(questionId, e.target.value)}
                                  label={question.questionText}
                                  error={question.isRequired && !currentAnswer}
                                >
                                  {question.options.map((option) => (
                                    <SelectMenuItem key={option} value={option}>
                                      {option}
                                    </SelectMenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            )}
                            
                            {question.questionType === 'multiselect' && question.options && (
                              <FormControl fullWidth required={question.isRequired}>
                                <InputLabel>{question.questionText}</InputLabel>
                                <Select
                                  multiple
                                  value={Array.isArray(currentAnswer) ? currentAnswer : []}
                                  onChange={(e) => handleAnamnesisAnswer(questionId, e.target.value)}
                                  label={question.questionText}
                                  error={question.isRequired && (!currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0))}
                                  renderValue={(selected) => (selected as string[]).join(', ')}
                                >
                                  {question.options.map((option) => (
                                    <SelectMenuItem key={option} value={option}>
                                      <Checkbox checked={(Array.isArray(currentAnswer) ? currentAnswer : []).indexOf(option) > -1} />
                                      {option}
                                    </SelectMenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            )}
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              )}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleBooking}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <Check />}
                >
                  {loading ? 'Buche...' : 'Termin buchen'}
                </Button>
              </Box>
            </StepContent>
          </Step>
        </Stepper>
      </Card>

      {/* Double Opt-In Dialog */}
      <Dialog open={requiresOptIn && !showConfirmation} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogTitle>Bestätigungscode eingeben</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Wir haben Ihnen einen 6-stelligen Bestätigungscode per E-Mail gesendet. 
            Bitte geben Sie diesen Code ein, um Ihre Buchung zu bestätigen.
          </Alert>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>Buchungsnummer:</strong> {bookingResult?.bookingNumber}
          </Typography>
          
          <TextField
            fullWidth
            label="Bestätigungscode"
            value={optInCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setOptInCode(value);
              setOptInError(null);
            }}
            error={!!optInError}
            helperText={optInError || '6-stelliger Code aus der E-Mail'}
            inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: '24px', letterSpacing: '8px' } }}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={handleResendOptIn}
              disabled={loading}
            >
              Code erneut senden
            </Button>
            <Button
              variant="contained"
              onClick={handleVerifyOptIn}
              disabled={verifyingCode || optInCode.length !== 6}
            >
              {verifyingCode ? <CircularProgress size={20} /> : 'Bestätigen'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Bestätigungs-Dialog */}
      <Dialog open={showConfirmation} onClose={() => setShowConfirmation(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CheckCircle color="success" />
            Termin erfolgreich gebucht!
          </Box>
        </DialogTitle>
        <DialogContent>
          {bookingResult && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Buchungsdetails
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Schedule />
                  </ListItemIcon>
                  <ListItemText
                    primary="Buchungsnummer"
                    secondary={bookingResult.bookingNumber}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday />
                  </ListItemIcon>
                  <ListItemText
                    primary="Datum"
                    secondary={bookingResult.appointmentDate ? new Date(bookingResult.appointmentDate).toLocaleDateString('de-DE') : 'Nicht verfügbar'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AccessTime />
                  </ListItemIcon>
                  <ListItemText
                    primary="Uhrzeit"
                    secondary={bookingResult.appointmentTime}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <LocalHospital />
                  </ListItemIcon>
                  <ListItemText
                    primary="Arzt"
                    secondary={bookingResult.doctor}
                  />
                </ListItem>
              </List>
              <Alert severity="success" sx={{ mt: 2 }}>
                Sie erhalten eine Bestätigungs-E-Mail mit allen Details.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmation(false)} variant="contained">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OnlineBooking;
