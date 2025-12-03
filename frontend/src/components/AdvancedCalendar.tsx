import React, { useState, useRef, useCallback, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourcePlugin from '@fullcalendar/resource';
import resourceTimeGridPlugin from '@fullcalendar/resource-timeline';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Stack,
  IconButton,
  Tooltip,
  Divider,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Grid
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  ViewWeek,
  ViewDay,
  CalendarMonth,
  Schedule,
  Person,
  Room,
  Warning,
  CheckCircle,
  AccessTime
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAppointments, createAppointment, updateAppointment, deleteAppointment } from '../store/slices/appointmentSlice';
import { fetchPatients } from '../store/slices/patientSlice';
import { fetchPatientDiagnoses, PatientDiagnosis } from '../store/slices/diagnosisSlice';
import { 
  reserveSlot, 
  confirmReservation, 
  cancelReservation, 
  checkConflicts,
  getAvailableSlots,
  clearConflicts,
  setCurrentReservation
} from '../store/slices/slotReservationSlice';
import { Appointment } from '../store/slices/appointmentSlice';
import { Patient } from '../store/slices/patientSlice';

interface SlotReservation {
  id: string;
  start: Date;
  end: Date;
  resourceId: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  ttl: number;
  userId: string;
}

interface BookingSettings {
  workingHours: {
    start: string;
    end: string;
    days: number[];
  };
  bufferTime: number; // in minutes
  minBookingWindow: number; // in hours
  maxBookingWindow: number; // in days
  slotDuration: number; // in minutes
}

interface CreateAppointmentPayload {
  title: string;
  startTime: string;
  endTime: string;
  patient: string;
  type?: string;
  notes?: string;
  resourceId?: string;
  status?: string;
}

interface AdvancedCalendarProps {
  onAppointmentSelect?: (appointment: Appointment) => void;
  onAppointmentCreate?: (appointment: CreateAppointmentPayload) => void;
  onAppointmentUpdate?: (id: string, appointment: Partial<Appointment>) => void;
  onAppointmentDelete?: (id: string) => void;
}

const AdvancedCalendar: React.FC<AdvancedCalendarProps> = ({
  onAppointmentSelect,
  onAppointmentCreate,
  onAppointmentUpdate,
  onAppointmentDelete
}) => {
  const dispatch = useAppDispatch();
  const { appointments, loading } = useAppSelector((state) => state.appointments);
  const { patients } = useAppSelector((state) => state.patients);
  const { user } = useAppSelector((state) => state.auth);
  const { patientDiagnoses } = useAppSelector((state) => state.diagnoses);
  const { 
    reservations, 
    availableSlots, 
    conflicts, 
    loading: slotLoading,
    currentReservation 
  } = useAppSelector((state) => state.slotReservations);

  const calendarRef = useRef<FullCalendar>(null);
  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [localConflicts, setLocalConflicts] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Booking Settings (would normally come from user settings)
  const [bookingSettings] = useState<BookingSettings>({
    workingHours: {
      start: '08:00',
      end: '18:00',
      days: [1, 2, 3, 4, 5] // Monday to Friday
    },
    bufferTime: 15, // 15 minutes buffer
    minBookingWindow: 2, // 2 hours minimum
    maxBookingWindow: 30, // 30 days maximum
    slotDuration: 30 // 30 minutes slots
  });

  // Appointment form state
  const [appointmentForm, setAppointmentForm] = useState<Partial<CreateAppointmentPayload>>({
    title: '',
    type: 'consultation',
    startTime: '',
    endTime: '',
    patient: '',
    notes: '',
    status: 'scheduled'
  });

  // Load data on component mount
  useEffect(() => {
    dispatch(fetchAppointments());
    dispatch(fetchPatients(1));
  }, [dispatch]);

  // Lade Diagnosen für alle Patienten in den Terminen
  useEffect(() => {
    if (appointments && appointments.length > 0) {
      const patientIds = new Set<string>();
      appointments.forEach((apt: any) => {
        if (apt.patient && typeof apt.patient === 'object' && apt.patient._id) {
          patientIds.add(apt.patient._id);
        } else if (apt.patient && typeof apt.patient === 'string') {
          patientIds.add(apt.patient);
        }
      });
      
      console.log('AdvancedCalendar: Loading diagnoses for patients:', Array.from(patientIds));
      
      // Lade Diagnosen für alle eindeutigen Patienten
      patientIds.forEach(patientId => {
        dispatch(fetchPatientDiagnoses({ 
          patientId, 
          status: 'active'
        }));
      });
    }
  }, [appointments, dispatch]);

  // Check for slot conflicts using Redux
  const checkSlotConflicts = useCallback(async (start: Date, end: Date, resourceId?: string) => {
    const conflicts: string[] = [];
    
    // Check working hours
    const startHour = parseInt(bookingSettings.workingHours.start.split(':')[0]);
    const endHour = parseInt(bookingSettings.workingHours.end.split(':')[0]);
    const appointmentStartHour = start.getHours();
    const appointmentEndHour = end.getHours();
    
    if (appointmentStartHour < startHour || appointmentEndHour > endHour) {
      conflicts.push('Außerhalb der Arbeitszeiten');
    }
    
    // Check working days
    const dayOfWeek = start.getDay();
    if (!bookingSettings.workingHours.days.includes(dayOfWeek)) {
      conflicts.push('Außerhalb der Arbeitszeiten');
    }
    
    // Check booking window
    const now = new Date();
    const timeDiff = start.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    const daysDiff = hoursDiff / 24;
    
    if (hoursDiff < bookingSettings.minBookingWindow) {
      conflicts.push(`Mindestbuchungszeit: ${bookingSettings.minBookingWindow} Stunden`);
    }
    
    if (daysDiff > bookingSettings.maxBookingWindow) {
      conflicts.push(`Maximalbuchungszeit: ${bookingSettings.maxBookingWindow} Tage`);
    }
    
    // Check for existing appointments
    const existingAppointments = appointments.filter(apt => {
      const aptStart = new Date(apt.startTime);
      const aptEnd = new Date(apt.endTime);
      return (start < aptEnd && end > aptStart) && 
             (!resourceId || (apt as any).resourceId === resourceId);
    });
    
    if (existingAppointments.length > 0) {
      conflicts.push('Terminüberschneidung vorhanden');
    }
    
    // Check server-side conflicts
    try {
      const result = await dispatch(checkConflicts({
        start: start.toISOString(),
        end: end.toISOString(),
        resourceId: resourceId || 'default'
      })).unwrap();
      
      if (result.hasConflicts) {
        conflicts.push('Slot ist bereits reserviert');
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
    
    return conflicts;
  }, [appointments, bookingSettings, dispatch]);

  // Reserve slot with optimistic locking using Redux
  const reserveSlotAction = useCallback(async (start: Date, end: Date, resourceId: string): Promise<string | null> => {
    const conflicts = await checkSlotConflicts(start, end, resourceId);
    if (conflicts.length > 0) {
      setLocalConflicts(conflicts);
      return null;
    }
    
    try {
      const result = await dispatch(reserveSlot({
        start: start.toISOString(),
        end: end.toISOString(),
        resourceId,
        ttl: 30000, // 30 seconds TTL
        metadata: { source: 'calendar' }
      })).unwrap();
      
      return result.id;
    } catch (error) {
      console.error('Error reserving slot:', error);
      setLocalConflicts(['Fehler beim Reservieren des Slots']);
      return null;
    }
  }, [checkSlotConflicts, dispatch]);

  // Handle date/time selection
  const handleDateSelect = useCallback(async (selectInfo: any) => {
    const { start, end, resource } = selectInfo;
    
    // Reserve slot first
    const reservationId = await reserveSlotAction(start, end, resource?.id || 'default');
    if (!reservationId) {
      return;
    }
    
    setAppointmentForm({
      title: '',
      type: 'consultation',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      patient: '',
      notes: '',
      status: 'scheduled',
      resourceId: resource?.id || 'default'
    });
    setIsCreating(true);
    setShowAppointmentDialog(true);
  }, [reserveSlotAction]);

  // Handle appointment click
  const handleEventClick = useCallback((clickInfo: any) => {
    const appointment = appointments.find(apt => apt._id === clickInfo.event.id);
    if (appointment) {
      setSelectedAppointment(appointment);
      setAppointmentForm({
        title: appointment.title,
        type: appointment.type,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        patient: appointment.patient,
        notes: (appointment as any).notes,
        status: appointment.status,
        resourceId: (appointment as any).resourceId
      });
      setIsCreating(false);
      setShowAppointmentDialog(true);
    }
  }, [appointments]);

  // Handle appointment creation/update
  const handleSaveAppointment = useCallback(async () => {
    if (!appointmentForm.title || !appointmentForm.startTime || !appointmentForm.endTime) {
      setSnackbar({
        open: true,
        message: 'Bitte füllen Sie alle Pflichtfelder aus',
        severity: 'error'
      });
      return;
    }
    
    try {
      if (isCreating) {
        const result = await dispatch(createAppointment(appointmentForm as CreateAppointmentPayload)).unwrap();
        
        // Confirm the slot reservation
        if (currentReservation) {
          await dispatch(confirmReservation({
            id: currentReservation.id,
            appointmentId: result._id || (result as any).id
          }));
        }
        
        setSnackbar({
          open: true,
          message: 'Termin erfolgreich erstellt',
          severity: 'success'
        });
      } else if (selectedAppointment) {
        await dispatch(updateAppointment({
          id: selectedAppointment._id,
          ...appointmentForm
        }));
        setSnackbar({
          open: true,
          message: 'Termin erfolgreich aktualisiert',
          severity: 'success'
        });
      }
      
      setShowAppointmentDialog(false);
      setAppointmentForm({
        title: '',
        type: 'consultation',
        startTime: '',
        endTime: '',
        patient: '',
        notes: '',
        status: 'scheduled'
      });
      dispatch(setCurrentReservation(null));
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Fehler beim Speichern des Termins',
        severity: 'error'
      });
      
      // Cancel reservation on error
      if (currentReservation) {
        dispatch(cancelReservation(currentReservation.id));
      }
    }
  }, [appointmentForm, isCreating, selectedAppointment, currentReservation, dispatch]);

  // Handle appointment deletion
  const handleDeleteAppointment = useCallback(async () => {
    if (selectedAppointment) {
      try {
        await dispatch(deleteAppointment(selectedAppointment._id));
        setSnackbar({
          open: true,
          message: 'Termin erfolgreich gelöscht',
          severity: 'success'
        });
        setShowAppointmentDialog(false);
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Fehler beim Löschen des Termins',
          severity: 'error'
        });
      }
    }
  }, [selectedAppointment, dispatch]);

  // Convert appointments to FullCalendar events
  const calendarEvents = appointments.map(apt => {
    // Stelle sicher, dass Patientendaten vollständig sind
    const patient = apt.patient;
    let patientId = null;
    let patientObj = null;
    
    if (patient) {
      if (typeof patient === 'string') {
        patientId = patient;
      } else if (typeof patient === 'object' && patient !== null) {
        patientId = (patient as any)._id || (patient as any).id || null;
        patientObj = patient;
      }
    }
    
    return {
      id: apt._id,
      title: apt.title,
      start: apt.startTime,
      end: apt.endTime,
      resourceId: (apt as any).resourceId,
      backgroundColor: getEventColor(apt.type, apt.status),
      borderColor: getEventColor(apt.type, apt.status),
      extendedProps: {
        type: apt.type,
        status: apt.status,
        patient: apt.patient,
        patientId: patientId,
        patientObj: patientObj,
        notes: (apt as any).notes
      }
    };
  });

  // Get event color based on type and status
  const getEventColor = (type: string, status: string) => {
    if (status === 'cancelled') return '#f44336';
    if (status === 'completed') return '#4caf50';
    if (type === 'consultation') return '#2196f3';
    if (type === 'follow-up') return '#ff9800';
    if (type === 'emergency') return '#f44336';
    return '#9e9e9e';
  };

  // Event Content Renderer - zeigt Allergien und Hauptdiagnose
  const renderEventContent = (eventInfo: any) => {
    // Verwende extendedProps, die bereits beim Erstellen der Events gesetzt wurden
    const patientId = eventInfo.event.extendedProps?.patientId;
    const patientObj = eventInfo.event.extendedProps?.patientObj;
    
    // Finde Hauptdiagnose - auch wenn status nicht 'active' ist, solange isPrimary true ist
    const diagnoses = patientId ? patientDiagnoses.filter((d: PatientDiagnosis) => {
      // Normalisiere patientId für Vergleich - handle sowohl String als auch ObjectId
      const dPatientId = typeof d.patientId === 'string' ? d.patientId : String(d.patientId);
      const normalizedPatientId = typeof patientId === 'string' ? patientId : String(patientId);
      // Vergleiche sowohl direkt als auch nach Normalisierung
      return dPatientId === normalizedPatientId || dPatientId === patientId || String(dPatientId) === String(patientId);
    }) : [];
    
    // Suche zuerst nach aktiver Hauptdiagnose, dann nach jeder Hauptdiagnose
    let primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary && d.status === 'active');
    if (!primaryDiagnosis) {
      primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary);
    }
    
    // Debug-Logging
    if (patientId) {
      console.log('AdvancedCalendar renderEventContent:', {
        eventId: eventInfo.event.id,
        patientId,
        patientIdType: typeof patientId,
        hasPatientObj: !!patientObj,
        allergies: patientObj?.allergies,
        totalPatientDiagnosesInStore: patientDiagnoses.length,
        allPatientIdsInStore: Array.from(new Set(patientDiagnoses.map(d => d.patientId))),
        diagnosesForPatient: diagnoses.length,
        allDiagnoses: diagnoses.map(d => ({ 
          id: d._id, 
          patientId: d.patientId, 
          patientIdType: typeof d.patientId,
          code: d.code, 
          isPrimary: d.isPrimary, 
          status: d.status 
        })),
        primaryDiagnoses: diagnoses.filter(d => d.isPrimary).map(d => ({ id: d._id, code: d.code, status: d.status })),
        activePrimary: diagnoses.filter(d => d.isPrimary && d.status === 'active').length,
        foundPrimary: !!primaryDiagnosis,
        primaryCode: primaryDiagnosis?.code,
        primaryStatus: primaryDiagnosis?.status
      });
    }
    
    // Prüfe Allergien
    const hasAllergies = patientObj && patientObj.allergies && Array.isArray(patientObj.allergies) && patientObj.allergies.length > 0;
    
    // Erstelle HTML-String für FullCalendar - verwende innerHTML für bessere Kompatibilität
    const title = eventInfo.event.title || 'Termin';
    let content = `<div style="padding: 2px; font-size: 0.75rem; line-height: 1.2; overflow: hidden;">
      <div style="font-weight: bold; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</div>`;
    
    if (hasAllergies) {
      content += `<div style="display: inline-flex; align-items: center; gap: 2px; margin-right: 4px; font-size: 0.6rem; color: #f44336;">
        <span>⚠️</span>
        <span>Allergien</span>
      </div>`;
    }
    
    if (primaryDiagnosis) {
      content += `<div style="display: inline-flex; align-items: center; gap: 2px; font-size: 0.6rem; color: #4caf50;">
        <span>✓</span>
        <span>${primaryDiagnosis.display || primaryDiagnosis.code}</span>
      </div>`;
    }
    
    content += `</div>`;
    
    // Erstelle DOM-Element
    const el = document.createElement('div');
    el.innerHTML = content;
    el.style.padding = '2px';
    el.style.fontSize = '0.75rem';
    el.style.lineHeight = '1.2';
    el.style.overflow = 'hidden';
    
    return { domNodes: [el] };
  };

  // Calendar options
  const calendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, resourcePlugin, resourceTimeGridPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    initialView: view,
    height: 'auto',
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    weekends: true,
    select: handleDateSelect,
    eventClick: handleEventClick,
    events: calendarEvents,
    eventContent: renderEventContent,
    slotMinTime: bookingSettings.workingHours.start,
    slotMaxTime: bookingSettings.workingHours.end,
    slotDuration: `${bookingSettings.slotDuration}:00:00`,
    businessHours: {
      daysOfWeek: bookingSettings.workingHours.days,
      startTime: bookingSettings.workingHours.start,
      endTime: bookingSettings.workingHours.end
    },
    selectConstraint: {
      daysOfWeek: bookingSettings.workingHours.days,
      startTime: bookingSettings.workingHours.start,
      endTime: bookingSettings.workingHours.end
    },
    eventConstraint: {
      daysOfWeek: bookingSettings.workingHours.days,
      startTime: bookingSettings.workingHours.start,
      endTime: bookingSettings.workingHours.end
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Terminplanung</Typography>
          
          <Stack direction="row" spacing={1}>
            <Button
              variant={view === 'dayGridMonth' ? 'contained' : 'outlined'}
              startIcon={<CalendarMonth />}
              onClick={() => setView('dayGridMonth')}
              size="small"
            >
              Monat
            </Button>
            <Button
              variant={view === 'timeGridWeek' ? 'contained' : 'outlined'}
              startIcon={<ViewWeek />}
              onClick={() => setView('timeGridWeek')}
              size="small"
            >
              Woche
            </Button>
            <Button
              variant={view === 'timeGridDay' ? 'contained' : 'outlined'}
              startIcon={<ViewDay />}
              onClick={() => setView('timeGridDay')}
              size="small"
            >
              Tag
            </Button>
          </Stack>
          
          <Stack direction="row" spacing={1}>
            <Tooltip title="Aktualisieren">
              <IconButton onClick={() => dispatch(fetchAppointments())}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setIsCreating(true);
                setShowAppointmentDialog(true);
              }}
            >
              Neuer Termin
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Conflict Alerts */}
      {(localConflicts.length > 0 || (conflicts && conflicts.hasConflicts)) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Terminkonflikte:</Typography>
          <ul>
            {localConflicts.map((conflict, index) => (
              <li key={index}>{conflict}</li>
            ))}
            {conflicts?.conflicts.map((conflict, index) => (
              <li key={`server-${index}`}>
                Slot bereits reserviert: {new Date(conflict.start).toLocaleString()} - {new Date(conflict.end).toLocaleString()}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Calendar */}
      <Paper sx={{ flexGrow: 1, p: 2 }}>
        <FullCalendar
          ref={calendarRef}
          {...calendarOptions}
        />
      </Paper>

      {/* Appointment Dialog */}
      <Dialog
        open={showAppointmentDialog}
        onClose={() => setShowAppointmentDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isCreating ? 'Neuer Termin' : 'Termin bearbeiten'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                fullWidth
                sx={{ flex: '1 1 300px' }}
                label="Titel"
                value={appointmentForm.title}
                onChange={(e) => setAppointmentForm((prev: any) => ({ ...prev, title: e.target.value }))}
                required
              />
              <FormControl fullWidth sx={{ flex: '1 1 200px' }}>
                <InputLabel>Typ</InputLabel>
                <Select
                  value={appointmentForm.type}
                  onChange={(e) => setAppointmentForm((prev: any) => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="consultation">Beratung</MenuItem>
                  <MenuItem value="follow-up">Nachsorge</MenuItem>
                  <MenuItem value="emergency">Notfall</MenuItem>
                  <MenuItem value="procedure">Eingriff</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                fullWidth
                sx={{ flex: '1 1 200px' }}
                label="Startzeit"
                type="datetime-local"
                value={appointmentForm.startTime ? new Date(appointmentForm.startTime).toISOString().slice(0, 16) : ''}
                onChange={(e) => setAppointmentForm((prev: any) => ({ 
                  ...prev, 
                  startTime: new Date(e.target.value).toISOString() 
                }))}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                sx={{ flex: '1 1 200px' }}
                label="Endzeit"
                type="datetime-local"
                value={appointmentForm.endTime ? new Date(appointmentForm.endTime).toISOString().slice(0, 16) : ''}
                onChange={(e) => setAppointmentForm((prev: any) => ({ 
                  ...prev, 
                  endTime: new Date(e.target.value).toISOString() 
                }))}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl fullWidth sx={{ flex: '1 1 200px' }}>
                <InputLabel>Patient</InputLabel>
                <Select
                  value={appointmentForm.patient}
                  onChange={(e) => setAppointmentForm((prev: any) => ({ ...prev, patient: e.target.value }))}
                >
                  {patients.map((patient) => (
                    <MenuItem key={patient._id || patient.id} value={patient._id || patient.id}>
                      {patient.firstName} {patient.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ flex: '1 1 200px' }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={appointmentForm.status}
                  onChange={(e) => setAppointmentForm((prev: any) => ({ ...prev, status: e.target.value }))}
                >
                  <MenuItem value="scheduled">Geplant</MenuItem>
                  <MenuItem value="confirmed">Bestätigt</MenuItem>
                  <MenuItem value="completed">Abgeschlossen</MenuItem>
                  <MenuItem value="cancelled">Storniert</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <TextField
              fullWidth
              label="Notizen"
              multiline
              rows={3}
              value={appointmentForm.notes}
              onChange={(e) => setAppointmentForm((prev: any) => ({ ...prev, notes: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          {!isCreating && (
            <Button
              color="error"
              startIcon={<Delete />}
              onClick={handleDeleteAppointment}
            >
              Löschen
            </Button>
          )}
          <Button onClick={() => setShowAppointmentDialog(false)}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            startIcon={<Schedule />}
            onClick={handleSaveAppointment}
          >
            {isCreating ? 'Erstellen' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdvancedCalendar;
