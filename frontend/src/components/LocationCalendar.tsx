import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  fetchLocations, 
  fetchLocationHours, 
  fetchLocationClosures,
  createLocationHours,
  createLocationClosure,
  updateLocationHours,
  updateLocationClosure,
  deleteLocationHours,
  deleteLocationClosure
} from '../store/slices/locationSlice';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'hours' | 'closure';
  color: string;
  location: string;
}

const LocationCalendar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { locations, locationHours, locationClosures, loading } = useAppSelector(state => state.locations);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [closureDialogOpen, setClosureDialogOpen] = useState(false);
  const [editingHours, setEditingHours] = useState<any>(null);
  const [editingClosure, setEditingClosure] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);

  const [hoursForm, setHoursForm] = useState({
    location_id: '',
    rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8,9,10,11,13,14,15,16',
    timezone: 'Europe/Vienna',
    label: ''
  });

  const [closureForm, setClosureForm] = useState({
    location_id: '',
    starts_at: new Date(),
    ends_at: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // Morgen
    reason: ''
  });

  useEffect(() => {
    dispatch(fetchLocations());
    dispatch(fetchLocationHours());
    dispatch(fetchLocationClosures());
  }, [dispatch]);

  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0]._id);
    }
  }, [locations, selectedLocation]);

  const generateEvents = useCallback(() => {
    const newEvents: CalendarEvent[] = [];

    console.log('=== EVENT GENERATION DEBUG ===');
    console.log('Selected location:', selectedLocation);
    console.log('Selected date:', selectedDate);
    console.log('Locations count:', locations.length);
    console.log('Location hours count:', locationHours.length);
    console.log('Location closures count:', locationClosures.length);

    // Öffnungszeiten-Events generieren
    const filteredHours = locationHours.filter(hours => {
      const locationId = typeof hours.location_id === 'object' ? (hours.location_id as any)._id : hours.location_id;
      return !selectedLocation || locationId === selectedLocation;
    });
    
    console.log('Filtered hours:', filteredHours.length);
    
    // Wenn kein Standort ausgewählt ist, zeige alle Events
    const hoursToProcess = selectedLocation ? filteredHours : locationHours;
    console.log('Hours to process:', hoursToProcess.length);
    
    hoursToProcess.forEach(hours => {
        // Prüfe beide möglichen Datenstrukturen
        const locationId = typeof hours.location_id === 'object' ? (hours.location_id as any)._id : hours.location_id;
        const location = locations.find(l => l._id === locationId);
        console.log('Processing hours:', hours._id, 'location_id:', hours.location_id, 'found location:', location?.name);
        if (location) {
          // Vereinfachte RRULE-Interpretation für Demo
          const rrule = hours.rrule;
          console.log('RRULE:', rrule);
          
          // Generiere Events für die aktuelle Woche
          const startOfWeek = new Date(selectedDate);
          startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
          
          for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            
            // Prüfe, ob dieser Tag in der RRULE enthalten ist
            let shouldCreateEvent = false;
            
            if (rrule.includes('BYDAY=MO,TU,WE,TH,FR')) {
              // Montag bis Freitag
              if (i >= 1 && i <= 5) shouldCreateEvent = true;
            } else if (rrule.includes('BYDAY=MO,TU,WE,TH,FR,SA,SU')) {
              // Alle Tage
              shouldCreateEvent = true;
            } else if (rrule.includes('BYDAY=MO,TU,WE,TH,FR,SA')) {
              // Montag bis Samstag
              if (i >= 1 && i <= 6) shouldCreateEvent = true;
            }
            
            if (shouldCreateEvent) {
              const eventStart = new Date(date);
              eventStart.setHours(8, 0, 0, 0);
              const eventEnd = new Date(date);
              eventEnd.setHours(17, 0, 0, 0);
              
              const hoursEvent: CalendarEvent = {
                id: `hours-${hours._id}-${i}`,
                title: `${location.name} - ${hours.label || 'Öffnungszeiten'}`,
                start: eventStart,
                end: eventEnd,
                type: 'hours' as const,
                color: location.color_hex || '#2563EB',
                location: location.name
              };
              newEvents.push(hoursEvent);
              console.log('Created event for', date.toDateString(), ':', hoursEvent.title);
            }
          }
        }
      });

    // Schließtage-Events generieren
    const filteredClosures = locationClosures.filter(closure => {
      const locationId = typeof closure.location_id === 'object' ? (closure.location_id as any)._id : closure.location_id;
      return !selectedLocation || locationId === selectedLocation;
    });
    
    const closuresToProcess = selectedLocation ? filteredClosures : locationClosures;
    
    closuresToProcess.forEach(closure => {
        // Prüfe beide möglichen Datenstrukturen
        const locationId = typeof closure.location_id === 'object' ? (closure.location_id as any)._id : closure.location_id;
        const location = locations.find(l => l._id === locationId);
        if (location) {
          const closureEvent: CalendarEvent = {
            id: `closure-${closure._id}`,
            title: `${location.name} - ${closure.reason}`,
            start: new Date(closure.starts_at),
            end: new Date(closure.ends_at),
            type: 'closure' as const,
            color: '#f44336',
            location: location.name
          };
          newEvents.push(closureEvent);
        }
      });

    // Test-Event entfernt - echte Events werden generiert
    console.log('Final events generated:', newEvents.length);
    console.log('Events:', newEvents);
    setEvents(newEvents);
  }, [locationHours, locationClosures, selectedLocation, selectedDate, locations]);

  useEffect(() => {
    generateEvents();
  }, [generateEvents]);

  const handleHoursDialogOpen = (hours?: any) => {
    if (hours) {
      setEditingHours(hours);
      setHoursForm({
        location_id: hours.location_id,
        rrule: hours.rrule,
        timezone: hours.timezone,
        label: hours.label
      });
    } else {
      setEditingHours(null);
      setHoursForm({
        location_id: selectedLocation || (locations.length > 0 ? locations[0]._id : ''),
        rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8,9,10,11,13,14,15,16',
        timezone: 'Europe/Vienna',
        label: ''
      });
    }
    setHoursDialogOpen(true);
  };

  const handleClosureDialogOpen = (closure?: any) => {
    if (closure) {
      setEditingClosure(closure);
      setClosureForm({
        location_id: closure.location_id,
        starts_at: new Date(closure.starts_at),
        ends_at: new Date(closure.ends_at),
        reason: closure.reason
      });
    } else {
      setEditingClosure(null);
      setClosureForm({
        location_id: selectedLocation || (locations.length > 0 ? locations[0]._id : ''),
        starts_at: new Date(),
        ends_at: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // Morgen
        reason: ''
      });
    }
    setClosureDialogOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    console.log('Event clicked:', event);
    console.log('Event type:', event.type);
    console.log('Event ID:', event.id);
    
    // Zeige Lösch-Dialog anstatt Bearbeitungs-Dialog
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;

    try {
      if (eventToDelete.type === 'hours') {
        // Finde die entsprechende Öffnungszeit
        const hoursId = eventToDelete.id.split('-')[1];
        const hours = locationHours.find(h => h._id === hoursId);
        if (hours) {
          await dispatch(deleteLocationHours(hoursId));
          // Events neu laden
          dispatch(fetchLocationHours());
        }
      } else if (eventToDelete.type === 'closure') {
        // Finde den entsprechenden Schließtag
        const closureId = eventToDelete.id.replace('closure-', '');
        const closure = locationClosures.find(c => c._id === closureId);
        if (closure) {
          await dispatch(deleteLocationClosure(closureId));
          // Events neu laden
          dispatch(fetchLocationClosures());
        }
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    } finally {
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setEventToDelete(null);
  };

  const handleHoursSubmit = async () => {
    try {
      console.log('Submitting hours form:', hoursForm);
      console.log('Selected location:', selectedLocation);
      
      if (editingHours) {
        await dispatch(updateLocationHours({
          locationId: hoursForm.location_id,
          hoursId: editingHours._id,
          hoursData: {
            location_id: hoursForm.location_id,
            rrule: hoursForm.rrule,
            timezone: hoursForm.timezone,
            label: hoursForm.label
          }
        }));
      } else {
        await dispatch(createLocationHours({
          locationId: hoursForm.location_id,
          hoursData: {
            location_id: hoursForm.location_id,
            rrule: hoursForm.rrule,
            timezone: hoursForm.timezone,
            label: hoursForm.label
          }
        }));
      }
      setHoursDialogOpen(false);
      setEditingHours(null);
      setHoursForm({
        location_id: selectedLocation || (locations.length > 0 ? locations[0]._id : ''),
        rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8,9,10,11,13,14,15,16',
        timezone: 'Europe/Vienna',
        label: ''
      });
      dispatch(fetchLocationHours());
    } catch (error) {
      console.error('Error saving hours:', error);
    }
  };

  const handleClosureSubmit = async () => {
    try {
      console.log('Submitting closure form:', closureForm);
      console.log('Selected location:', selectedLocation);
      
      // Validierung: Endzeit muss nach Startzeit liegen
      if (closureForm.ends_at <= closureForm.starts_at) {
        alert('Endzeit muss nach Startzeit liegen!');
        return;
      }
      
      if (editingClosure) {
        await dispatch(updateLocationClosure({
          locationId: closureForm.location_id,
          closureId: editingClosure._id,
          closureData: {
            location_id: closureForm.location_id,
            starts_at: closureForm.starts_at.toISOString(),
            ends_at: closureForm.ends_at.toISOString(),
            reason: closureForm.reason
          }
        }));
      } else {
        await dispatch(createLocationClosure({
          locationId: closureForm.location_id,
          closureData: {
            location_id: closureForm.location_id,
            starts_at: closureForm.starts_at.toISOString(),
            ends_at: closureForm.ends_at.toISOString(),
            reason: closureForm.reason
          }
        }));
      }
      setClosureDialogOpen(false);
      setEditingClosure(null);
      setClosureForm({
        location_id: selectedLocation || (locations.length > 0 ? locations[0]._id : ''),
        starts_at: new Date(),
        ends_at: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // Morgen
        reason: ''
      });
      dispatch(fetchLocationClosures());
    } catch (error) {
      console.error('Error saving closure:', error);
    }
  };


  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Standort-Kalender
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleHoursDialogOpen()}
            >
              Öffnungszeiten
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleClosureDialogOpen()}
            >
              Schließtag
            </Button>
          </Box>
        </Box>

        {/* Filter */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Standort</InputLabel>
                <Select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  {locations.map((location) => (
                    <MenuItem key={location._id} value={location._id}>
                      {location.name} ({location.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <DatePicker
                label="Woche"
                value={selectedDate}
                onChange={(newValue) => newValue && setSelectedDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    sx: { minWidth: 200 }
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Kalender */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
              {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].map((day) => (
                <Box key={day}>
                  <Typography variant="subtitle2" textAlign="center" fontWeight="bold">
                    {day}
                  </Typography>
                </Box>
              ))}
              
              {getWeekDays().map((date, index) => {
                const dayEvents = getEventsForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <Box key={index}>
                    <Box
                      sx={{
                        minHeight: 120,
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: isToday ? 'action.selected' : 'background.paper',
                        position: 'relative'
                      }}
                    >
                      <Typography variant="body2" fontWeight={isToday ? 'bold' : 'normal'}>
                        {date.getDate()}
                      </Typography>
                      
                      {dayEvents.length > 0 ? (
                        dayEvents.map((event) => (
                          <Chip
                            key={event.id}
                            label={event.title}
                            size="small"
                            clickable
                            onClick={() => handleEventClick(event)}
                            sx={{
                              fontSize: '0.7rem',
                              height: 20,
                              bgcolor: event.color,
                              color: 'white',
                              mb: 0.5,
                              display: 'block',
                              cursor: 'pointer',
                              '&:hover': {
                                opacity: 0.8
                              },
                              '& .MuiChip-label': {
                                px: 1
                              }
                            }}
                          />
                        ))
                      ) : (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                          Keine Events
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>

        {/* Öffnungszeiten Dialog */}
        <Dialog open={hoursDialogOpen} onClose={() => setHoursDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingHours ? 'Öffnungszeiten bearbeiten' : 'Neue Öffnungszeiten'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Standort</InputLabel>
                <Select
                  value={hoursForm.location_id}
                  onChange={(e) => setHoursForm({ ...hoursForm, location_id: e.target.value })}
                >
                  {locations.map((location) => (
                    <MenuItem key={location._id} value={location._id}>
                      {location.name} ({location.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="RRULE (iCal Format)"
                value={hoursForm.rrule}
                onChange={(e) => setHoursForm({ ...hoursForm, rrule: e.target.value })}
                helperText="z.B. FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8,9,10,11,13,14,15,16"
              />
              <FormControl fullWidth>
                <InputLabel>Zeitzone</InputLabel>
                <Select
                  value={hoursForm.timezone}
                  onChange={(e) => setHoursForm({ ...hoursForm, timezone: e.target.value })}
                >
                  <MenuItem value="Europe/Vienna">Europa/Wien</MenuItem>
                  <MenuItem value="Europe/Berlin">Europa/Berlin</MenuItem>
                  <MenuItem value="Europe/Zurich">Europa/Zürich</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Bezeichnung"
                value={hoursForm.label}
                onChange={(e) => setHoursForm({ ...hoursForm, label: e.target.value })}
                placeholder="z.B. Standard, Notdienst, etc."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHoursDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleHoursSubmit} variant="contained">
              {editingHours ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Schließtag Dialog */}
        <Dialog open={closureDialogOpen} onClose={() => setClosureDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingClosure ? 'Schließtag bearbeiten' : 'Neuer Schließtag'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Standort</InputLabel>
                <Select
                  value={closureForm.location_id}
                  onChange={(e) => setClosureForm({ ...closureForm, location_id: e.target.value })}
                >
                  {locations.map((location) => (
                    <MenuItem key={location._id} value={location._id}>
                      {location.name} ({location.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <DatePicker
                label="Startdatum"
                value={closureForm.starts_at}
                onChange={(newValue) => newValue && setClosureForm({ ...closureForm, starts_at: newValue })}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
              <DatePicker
                label="Enddatum"
                value={closureForm.ends_at}
                onChange={(newValue) => newValue && setClosureForm({ ...closureForm, ends_at: newValue })}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
              <TextField
                fullWidth
                label="Grund"
                value={closureForm.reason}
                onChange={(e) => setClosureForm({ ...closureForm, reason: e.target.value })}
                placeholder="z.B. Feiertag, Wartung, Teamklausur"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClosureDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleClosureSubmit} variant="contained">
              {editingClosure ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Lösch-Bestätigungs-Dialog */}
        <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
          <DialogTitle>Event löschen</DialogTitle>
          <DialogContent>
            <Typography>
              Möchten Sie dieses Event wirklich löschen?
            </Typography>
            {eventToDelete && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>Event:</strong> {eventToDelete.title}
                </Typography>
                <Typography variant="body2">
                  <strong>Typ:</strong> {eventToDelete.type === 'hours' ? 'Öffnungszeiten' : 'Schließtag'}
                </Typography>
                <Typography variant="body2">
                  <strong>Datum:</strong> {eventToDelete.start.toLocaleDateString('de-DE')}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>Abbrechen</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Löschen
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default LocationCalendar;
