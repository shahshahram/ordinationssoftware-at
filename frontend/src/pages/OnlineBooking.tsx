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
} from '@mui/icons-material';
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
  };
  doctor: {
    id: string;
  };
}

const OnlineBooking: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
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
  }, []);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const response = await api.get<any>('/online-booking/doctors');
      if (response.success) {
        setDoctors(response.data);
      }
    } catch (error) {
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
      const response = await api.get<any>(`/online-booking/availability?doctorId=${doctorId}&date=${date}`);
      if (response.success) {
        setAvailableSlots(response.data.availableSlots);
      }
    } catch (error) {
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
        loadAvailableSlots(selectedDoctor.id, date);
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
    setSelectedSlot(slot);
    setFormData(prev => ({
      ...prev,
      appointment: { 
        ...prev.appointment, 
        startTime: slot.start,
        type: 'Allgemeine Beratung' // Default
      }
    }));
    setActiveStep(2);
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

  const handleBooking = async () => {
    try {
      setLoading(true);
      const response = await api.post('/online-booking/book', formData);
      
      if (response.success) {
        setBookingResult(response.data);
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
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Buchen des Termins', 
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
        <Stepper activeStep={activeStep} orientation="vertical">
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
                <Grid container spacing={1}>
                  {availableSlots.map((slot, index) => (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                      <Chip
                        label={`${slot.start} - ${slot.end}`}
                        onClick={() => handleSlotSelect(slot)}
                        color={selectedSlot === slot ? 'primary' : 'default'}
                        variant={selectedSlot === slot ? 'filled' : 'outlined'}
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                  ))}
                </Grid>
              ) : selectedDate ? (
                <Alert severity="warning">
                  Keine verfügbaren Termine für dieses Datum
                </Alert>
              ) : null}
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
