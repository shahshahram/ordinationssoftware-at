import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  ArrowBackIos as ArrowBackIosIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  Today as TodayIcon,
  ViewWeek as ViewWeekIcon,
  ViewDay as ViewDayIcon,
  CalendarViewMonth as ViewMonthIcon,
  ViewAgenda as ViewAgendaIcon,
  Cached as RefreshIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAppointments, createAppointment, updateAppointment, deleteAppointment } from '../store/slices/appointmentSlice';
import { fetchStaffProfiles } from '../store/slices/staffSlice';
import { fetchRooms } from '../store/slices/roomSlice';
import { fetchLocations } from '../store/slices/locationSlice';
import { fetchLocationWeeklySchedules } from '../store/slices/locationWeeklyScheduleSlice';
import { fetchWeeklySchedules, deleteWeeklySchedulesByStaffId } from '../store/slices/weeklyScheduleSlice';
import { eventBus, EVENTS } from '../utils/eventBus';
import GradientDialogTitle from '../components/GradientDialogTitle';

// Hilfsfunktionen für localStorage
const CALENDAR_SETTINGS_KEY = 'calendar-settings';

interface CalendarSettings {
  viewMode: 'day' | '3day' | 'week' | 'month';
  selectedLocation: string;
  medicalFilter: 'all' | 'medical' | 'non-medical';
  showLocationHours: boolean;
  showStaffHours: boolean;
  showBreaks: boolean;
  showOnlyOpeningHours: boolean;
  hideWeekends: boolean;
  currentDate: string; // ISO string
}

const saveCalendarSettings = (settings: CalendarSettings) => {
  try {
    localStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Fehler beim Speichern der Kalender-Einstellungen:', error);
  }
};

const loadCalendarSettings = (): Partial<CalendarSettings> | null => {
  try {
    const saved = localStorage.getItem(CALENDAR_SETTINGS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Fehler beim Laden der Kalender-Einstellungen:', error);
    return null;
  }
};

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  staffId: string;
  staffName: string;
  staffColor: string;
  roomId?: string;
  roomName?: string;
  type: string;
  status: string;
  bookingType: 'online' | 'internal';
  locationId?: string;
  locationName?: string;
  locationColor?: string;
  patientId?: string;
}

interface BackgroundEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'location_hours' | 'staff_hours';
  color: string;
  opacity: number;
  locationId?: string;
  locationName?: string;
  staffId?: string;
  staffName?: string;
}

interface NewEventState {
  title: string;
  start: string;
  end: string;
  staffId: string;
  roomId: string;
  type: string;
  status: string;
  patientId: string;
  locationId: string;
  bookingType: 'online' | 'internal';
}

const EnhancedCalendar: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { appointments, loading: appointmentsLoading, error: appointmentsError } = useAppSelector((state) => state.appointments);
  const { staffProfiles, loading: staffLoading } = useAppSelector((state) => state.staff);
  const { rooms, loading: roomsLoading } = useAppSelector((state) => state.rooms);
  const { locations, loading: locationsLoading } = useAppSelector((state) => state.locations);
  const { schedules: locationSchedules, loading: locationSchedulesLoading } = useAppSelector((state) => state.locationWeeklySchedules);
  const { schedules: weeklySchedules, loading: weeklySchedulesLoading } = useAppSelector((state) => state.weeklySchedules);

  // State mit localStorage-Unterstützung
  // Initialisiere mit Start der aktuellen Woche für Wochenansicht
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { locale: de, weekStartsOn: 1 });
  });
  const [viewMode, setViewMode] = useState<'day' | '3day' | 'week' | 'month'>('week');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [medicalFilter, setMedicalFilter] = useState<'all' | 'medical' | 'non-medical'>('all');
  const [showLocationHours, setShowLocationHours] = useState(true);
  const [showStaffHours, setShowStaffHours] = useState(true);
  const [showBreaks, setShowBreaks] = useState(true);
  const [hideWeekends, setHideWeekends] = useState(false);
  const [showOnlyOpeningHours, setShowOnlyOpeningHours] = useState(false);
  const [openEventDialog, setOpenEventDialog] = useState(false);
  const [newEvent, setNewEvent] = useState<NewEventState>({
    title: '',
    start: '',
    end: '',
    staffId: '',
    roomId: '',
    type: 'konsultation',
    status: 'confirmed',
    patientId: '',
    locationId: '',
    bookingType: 'internal',
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Einstellungen beim ersten Laden wiederherstellen
  useEffect(() => {
    const savedSettings = loadCalendarSettings();
    if (savedSettings) {
      console.log('Lade gespeicherte Kalender-Einstellungen:', savedSettings);
      
      if (savedSettings.viewMode) {
        setViewMode(savedSettings.viewMode);
      }
      if (savedSettings.selectedLocation) {
        setSelectedLocation(savedSettings.selectedLocation);
      }
      if (savedSettings.medicalFilter) {
        setMedicalFilter(savedSettings.medicalFilter);
      }
      if (typeof savedSettings.showLocationHours === 'boolean') {
        setShowLocationHours(savedSettings.showLocationHours);
      }
      if (typeof savedSettings.showStaffHours === 'boolean') {
        setShowStaffHours(savedSettings.showStaffHours);
      }
      if (typeof savedSettings.showBreaks === 'boolean') {
        setShowBreaks(savedSettings.showBreaks);
      }
      if (typeof savedSettings.hideWeekends === 'boolean') {
        setHideWeekends(savedSettings.hideWeekends);
      }
      if (typeof savedSettings.showOnlyOpeningHours === 'boolean') {
        setShowOnlyOpeningHours(savedSettings.showOnlyOpeningHours);
      }
      
      // Für Wochenansicht: IMMER aktuelle Woche beim ersten Laden anzeigen
      // (nur beim Navigieren innerhalb der Woche das gespeicherte Datum verwenden)
      const savedViewMode = savedSettings.viewMode || 'week';
      
      if (savedViewMode === 'week') {
        // In Wochenansicht: immer aktuelle Woche anzeigen beim Start
        const today = new Date();
        const startOfCurrentWeek = startOfWeek(today, { locale: de, weekStartsOn: 1 });
        console.log('Wochenansicht: Zeige aktuelle Woche', startOfCurrentWeek.toISOString());
        setCurrentDate(startOfCurrentWeek);
        
        // Aktualisiere gespeichertes Datum
        const updatedSettings: CalendarSettings = {
          viewMode: 'week' as 'day' | '3day' | 'week' | 'month',
          selectedLocation: savedSettings.selectedLocation || 'all',
          medicalFilter: (savedSettings.medicalFilter || 'all') as 'all' | 'medical' | 'non-medical',
          showLocationHours: savedSettings.showLocationHours ?? true,
          showStaffHours: savedSettings.showStaffHours ?? true,
          showBreaks: savedSettings.showBreaks ?? true,
          showOnlyOpeningHours: savedSettings.showOnlyOpeningHours ?? false,
          hideWeekends: savedSettings.hideWeekends ?? false,
          currentDate: startOfCurrentWeek.toISOString()
        };
        saveCalendarSettings(updatedSettings);
      } else {
        // Für andere Ansichten: gespeichertes Datum verwenden, falls vorhanden
        if (savedSettings.currentDate) {
          setCurrentDate(new Date(savedSettings.currentDate));
        } else {
          setCurrentDate(new Date());
        }
      }
    } else {
      // Keine gespeicherten Einstellungen -> aktuelle Woche
      const today = new Date();
      const startOfCurrentWeek = startOfWeek(today, { locale: de, weekStartsOn: 1 });
      setCurrentDate(startOfCurrentWeek);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    console.log('Dispatching data fetch actions...');
    dispatch(fetchAppointments());
    dispatch(fetchStaffProfiles());
    dispatch(fetchRooms());
    dispatch(fetchLocations());
    dispatch(fetchLocationWeeklySchedules());
    dispatch(fetchWeeklySchedules());
  }, [dispatch]);

  // Force refresh data when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, refreshing data...');
        dispatch(fetchStaffProfiles());
        dispatch(fetchWeeklySchedules());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [dispatch]);

  // Listen for user deletion events to refresh calendar data
  useEffect(() => {
    const handleUserDeleted = (data: any) => {
      console.log('User deleted event received:', data);
      console.log('Refreshing calendar data after user deletion...');
      
      // Remove schedules from Redux store immediately
      dispatch(deleteWeeklySchedulesByStaffId(data.userId));
      
      // Force refresh all calendar-related data
      dispatch(fetchStaffProfiles());
      dispatch(fetchWeeklySchedules());
      dispatch(fetchLocationWeeklySchedules());
      dispatch(fetchAppointments());
    };

    eventBus.on(EVENTS.USER_DELETED, handleUserDeleted);
    
    return () => {
      eventBus.off(EVENTS.USER_DELETED, handleUserDeleted);
    };
  }, [dispatch]);

  // Automatisches Speichern der Einstellungen bei Änderungen
  useEffect(() => {
    if (!isInitialized) return; // Nicht speichern während der Initialisierung
    
    const settings: CalendarSettings = {
      viewMode,
      selectedLocation,
      medicalFilter,
      showLocationHours,
      showStaffHours,
      showBreaks,
      showOnlyOpeningHours,
      hideWeekends,
      currentDate: currentDate.toISOString(),
    };
    saveCalendarSettings(settings);
  }, [viewMode, selectedLocation, medicalFilter, showLocationHours, showStaffHours, showBreaks, showOnlyOpeningHours, hideWeekends, currentDate, isInitialized]);

  // Helper function for time parsing
  const parseTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  };

  // Helper function to get filtered hours based on location opening hours
  const getFilteredHours = (day: Date) => {
    if (!showOnlyOpeningHours || selectedLocation === 'all') {
      return Array.from({ length: 24 }, (_, i) => i);
    }

    // Find location schedule for the selected location and day
    const dayOfWeek = day.getDay();
    const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
    
    const locationSchedule = locationSchedules?.find(schedule => 
      schedule.location_id._id === selectedLocation
    );
    
    if (!locationSchedule) {
      return Array.from({ length: 24 }, (_, i) => i);
    }

    const daySchedule = locationSchedule.schedules.find(s => s.day === dayKey);
    if (!daySchedule || !daySchedule.isOpen) {
      return Array.from({ length: 24 }, (_, i) => i);
    }

    const startTime = parseTime(daySchedule.startTime);
    const endTime = parseTime(daySchedule.endTime);
    
    // Create array of hours within opening hours
    const hours = [];
    for (let hour = startTime.hours; hour < endTime.hours; hour++) {
      hours.push(hour);
    }
    
    // If no hours found, return all hours
    if (hours.length === 0) {
      return Array.from({ length: 24 }, (_, i) => i);
    }
    
    return hours;
  };

  // Helper function to get filtered hours for multiple days (for week/3day views)
  const getFilteredHoursForDays = (days: Date[]) => {
    if (!showOnlyOpeningHours || selectedLocation === 'all') {
      return Array.from({ length: 24 }, (_, i) => i);
    }

    // Get all unique hours from all days
    const allHours = new Set<number>();
    
    days.forEach(day => {
      const dayHours = getFilteredHours(day);
      dayHours.forEach(hour => allHours.add(hour));
    });
    
    // Convert to sorted array
    const hours = Array.from(allHours).sort((a, b) => a - b);
    
    // If no hours found, return all hours
    if (hours.length === 0) {
      return Array.from({ length: 24 }, (_, i) => i);
    }
    
    return hours;
  };

  // Filter staff by medical/non-medical and location
  const filteredStaff = useMemo(() => {
    console.log('filteredStaff: medicalFilter=' + medicalFilter + ', selectedLocation=' + selectedLocation + ', staffProfiles.length=' + staffProfiles.length);
    staffProfiles.forEach(staff => {
      console.log('Staff:' + staff.first_name + ' ' + staff.last_name + ', role:' + staff.role + ', locations:' + JSON.stringify(staff.locations));
    });
    
    let filtered = staffProfiles;
    
    // Filter by medical/non-medical
    if (medicalFilter !== 'all') {
      filtered = filtered.filter(staff => {
        const medicalRoles = ['doctor', 'arzt', 'mediziner', 'Arzt', 'Mediziner', 'dr', 'Dr', 'doktor', 'physician', 'Physician'];
        const isMedical = medicalRoles.includes(staff.role);
        return medicalFilter === 'medical' ? isMedical : !isMedical;
      });
    }
    
    // Filter by location
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(staff => {
        const staffLocationIds = staff.locations?.map((loc: any) => loc._id || loc) || [];
        const isAssignedToLocation = staffLocationIds.includes(selectedLocation);
        
        console.log('Location filter check:', {
          staffName: `${staff.first_name} ${staff.last_name}`,
          staffLocations: staffLocationIds,
          selectedLocation: selectedLocation,
          isAssignedToLocation
        });
        
        return isAssignedToLocation;
      });
    }
    
    return filtered;
  }, [staffProfiles, medicalFilter, selectedLocation]);

  // Generate background events (location hours and staff hours)
  const backgroundEvents = useMemo(() => {
    const events: BackgroundEvent[] = [];
    
    // Debug: Log data
    console.log('EnhancedCalendar Debug:', {
      locationSchedules: locationSchedules?.length || 0,
      weeklySchedules: weeklySchedules?.length || 0,
      staffProfiles: staffProfiles?.length || 0,
      showLocationHours,
      showStaffHours,
      selectedLocation,
      medicalFilter,
      locationSchedulesData: locationSchedules,
      weeklySchedulesData: weeklySchedules,
      locationSchedulesLoading,
      weeklySchedulesLoading
    });
    
    // Debug: Log Redux state
    console.log('Redux state debug:', {
      weeklySchedulesState: weeklySchedules,
      locationSchedulesState: locationSchedules,
      staffProfilesState: staffProfiles
    });
    
    // Calculate start and end dates based on view mode
    let startDate: Date;
    let endDate: Date;
    
    switch (viewMode) {
      case 'day':
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
        break;
      case '3day':
        startDate = startOfDay(addDays(currentDate, -1));
        endDate = endOfDay(addDays(currentDate, 1));
        break;
      case 'week':
        startDate = startOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
        endDate = endOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfWeek(startOfMonth(currentDate), { locale: de, weekStartsOn: 1 });
        endDate = endOfWeek(endOfMonth(currentDate), { locale: de, weekStartsOn: 1 });
        break;
      default:
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
    }

    // Location opening hours
    if (showLocationHours && locationSchedules) {
      locationSchedules.forEach(schedule => {
        if (selectedLocation !== 'all' && schedule.location_id._id !== selectedLocation) return;
        
        schedule.schedules.forEach(daySchedule => {
          if (!daySchedule.isOpen) return;
          
          // Generate events for each day in the view
          let currentDate = startDate;
          while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
            
            if (daySchedule.day === dayKey) {
              const startTime = parseTime(daySchedule.startTime);
              const endTime = parseTime(daySchedule.endTime);
              
              const eventStart = new Date(currentDate);
              eventStart.setHours(startTime.hours, startTime.minutes, 0, 0);
              
              const eventEnd = new Date(currentDate);
              eventEnd.setHours(endTime.hours, endTime.minutes, 0, 0);
              
              events.push({
                id: `location-${schedule._id}-${daySchedule.day}-${currentDate.getTime()}`,
                title: `${schedule.location_id.name} - Öffnungszeiten`,
                start: eventStart,
                end: eventEnd,
                type: 'location_hours',
                color: schedule.location_id.color_hex || '#2563EB',
                opacity: 0.1,
                locationId: schedule.location_id._id,
                locationName: schedule.location_id.name,
              });
            }
            
            currentDate = addDays(currentDate, 1);
          }
        });
      });
    }

    // Staff working hours
    if (showStaffHours && weeklySchedules) {
      console.log("Processing weeklySchedules:", weeklySchedules.length);
      weeklySchedules.forEach(schedule => {
        console.log("Processing schedule:", schedule);
        
        // Check if schedule has valid staffId reference
        if (!schedule.staffId || !schedule.staffId._id) {
          console.log("Skipping schedule with invalid staffId:", schedule);
          return;
        }
        
        // Filter by medical/non-medical if needed
        const staff = filteredStaff.find(s => s._id === schedule.staffId._id);
        console.log("Found staff for schedule:", staff);
        
        // Only process if staff exists and is valid
        if (!staff || !staff.first_name || !staff.last_name) {
          console.log("Skipping schedule with invalid or missing staff:", {
            scheduleId: schedule._id,
            staffId: schedule.staffId._id,
            staff: staff
          });
          return;
        }
        
        schedule.schedules.forEach(daySchedule => {
          if (!daySchedule.isWorking) return;
          
          // Generate events for each day in the view
          let currentDate = startDate;
          while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
            
            if (daySchedule.day === dayKey) {
              const startTime = parseTime(daySchedule.startTime);
              const endTime = parseTime(daySchedule.endTime);
              
              const eventStart = new Date(currentDate);
              eventStart.setHours(startTime.hours, startTime.minutes, 0, 0);
              
              const eventEnd = new Date(currentDate);
              eventEnd.setHours(endTime.hours, endTime.minutes, 0, 0);
              
              // Arbeitszeit-Event
              const staffName = staff ? `${staff.first_name} ${staff.last_name}` : 'Unbekannt';
              const staffColor = staff?.color_hex || '#4CAF50';
              
                          // Debug log for Dr. Thomas Schmidt
              if (staffName.includes('Thomas Schmidt')) {
                console.log('Dr. Thomas Schmidt color debug:', {
                  staffName,
                  staff: staff,
                  color_hex: staff?.color_hex,
                  finalColor: staffColor,
                  scheduleStaffId: schedule.staffId._id,
                  allStaffProfiles: staffProfiles.map(s => ({ 
                    id: s._id, 
                    first_name: s.first_name, 
                    last_name: s.last_name, 
                    display_name: s.display_name,
                    color_hex: s.color_hex 
                  })),
                  staffProfilesLength: staffProfiles.length,
                  currentDate: currentDate.toISOString()
                });
              }
              
              events.push({
                id: `staff-${schedule._id}-${daySchedule.day}-${currentDate.getTime()}`,
                title: `${staffName} - Arbeitszeit`,
                start: eventStart,
                end: eventEnd,
                type: 'staff_hours',
                color: staffColor,
                opacity: 0.2,
                staffId: schedule.staffId._id,
                staffName: staffName,
              });

              // Pausenzeiten-Event (falls definiert und showBreaks aktiviert)
              if (showBreaks && daySchedule.breakStart && daySchedule.breakEnd) {
                const breakStartTime = parseTime(daySchedule.breakStart);
                const breakEndTime = parseTime(daySchedule.breakEnd);
                
                const breakStart = new Date(currentDate);
                breakStart.setHours(breakStartTime.hours, breakStartTime.minutes, 0, 0);
                
                const breakEnd = new Date(currentDate);
                breakEnd.setHours(breakEndTime.hours, breakEndTime.minutes, 0, 0);
                
                events.push({
                  id: `staff-break-${schedule._id}-${daySchedule.day}-${currentDate.getTime()}`,
                  title: `${staffName} - Pause`,
                  start: breakStart,
                  end: breakEnd,
                  type: 'staff_hours',
                  color: '#FF9800', // Orange für Pausen
                  opacity: 0.3,
                  staffId: schedule.staffId._id,
                  staffName: staffName,
                });
              }
            }
            
            currentDate = addDays(currentDate, 1);
          }
        });
      });
    }

    console.log('Generated background events:', events);
    return events;
  }, [locationSchedules, weeklySchedules, selectedLocation, showLocationHours, showStaffHours, showBreaks, filteredStaff, currentDate, viewMode]);

  // Generate calendar events from appointments
  const calendarEvents = useMemo(() => {
    return (Array.isArray(appointments) ? appointments : [])
      .filter(appointment => {
        // Filter by location if selected
        if (selectedLocation !== 'all') {
          // Try to find the room for this appointment
          const room = (Array.isArray(rooms) ? rooms : []).find(r => r._id === appointment.room);
          
          if (room) {
            // Room might have location as object or ID
            const roomLocationId = typeof room.location === 'object' ? (room.location as any)._id : room.location;
            if (roomLocationId !== selectedLocation) {
              return false;
            }
          } else {
            // If no room found, try direct locationId on appointment (fallback)
            if (appointment.locationId && appointment.locationId !== selectedLocation) {
              return false;
            }
          }
        }
        
        // Filter by medical/non-medical staff
        const staff = filteredStaff.find(s => s.user_id === appointment.doctor);
        if (staff) {
          // Staff is already filtered by medicalFilter in filteredStaff
        }
        
        // Additional filter: if medicalFilter is set, also check the service
        if (medicalFilter !== 'all' && (appointment as any).service) {
          const service = (appointment as any).service;
          
          // Only filter if the service has an isMedical field
          if (service.isMedical !== undefined) {
            if (medicalFilter === 'medical' && !service.isMedical) {
              return false;
            }
            if (medicalFilter === 'non-medical' && service.isMedical) {
              return false;
            }
          }
        }
        
        return true;
      })
      .map(appointment => {
        // Get assigned users first
        const assignedUsers = (appointment as any).assigned_users || [];
        let staffName = 'Unbekannt';
        
        if (assignedUsers.length > 0) {
          // Extract staff names from assigned_users
          staffName = assignedUsers.map((u: any) => {
            if (u.firstName && u.lastName) {
              return `${u.firstName} ${u.lastName}`;
            } else if (u.first_name && u.last_name) {
              return `${u.first_name} ${u.last_name}`;
            } else if (u.display_name) {
              return u.display_name;
            } else {
              return 'Unbekannt';
            }
          }).join(', ');
        } else {
          // Fallback to doctor if no assigned_users
          // Try to find staff by different possible fields
          // appointment.doctor is a User ID, StaffProfile.userId references User._id
          const doctorId = typeof appointment.doctor === 'string' ? appointment.doctor : (appointment.doctor as any)?._id;
          const staff = filteredStaff.find((s: any) => 
            s.user_id?.toString() === doctorId || 
            s.userId?.toString() === doctorId ||
            s._id?.toString() === doctorId ||
            s.userId?._id?.toString() === doctorId
          );
          
          if (appointment.doctor && typeof appointment.doctor === 'object') {
            staffName = `${(appointment.doctor as any).firstName || ''} ${(appointment.doctor as any).lastName || ''}`.trim() || 'Unbekannt';
          } else {
            staffName = staff?.display_name || (staff?.first_name && staff?.last_name ? `${staff.first_name} ${staff.last_name}` : 'Unbekannt');
          }
        }
        
        const room = (Array.isArray(rooms) ? rooms : []).find(r => r._id === appointment.room);
        const roomLocationId = room && (typeof room.location === 'object' ? (room.location as any)._id : room.location);
        const location = (Array.isArray(locations) ? locations : []).find(l => l._id === (appointment.locationId || roomLocationId));
        
        // Verwende Service-Farbe falls vorhanden, sonst Staff-Farbe
        const serviceColor = (appointment as any).service?.color_hex;
        const doctorId = typeof appointment.doctor === 'string' ? appointment.doctor : (appointment.doctor as any)?._id;
        const staff = filteredStaff.find((s: any) => 
          s.user_id?.toString() === doctorId || 
          s.userId?.toString() === doctorId ||
          s._id?.toString() === doctorId ||
          s.userId?._id?.toString() === doctorId
        );
        const staffColor_hex = staff?.color_hex;
        const eventColor = serviceColor || staffColor_hex || '#9CA3AF';
        
        return {
          id: appointment._id,
          title: appointment.title || 'Termin',
          start: new Date(appointment.startTime),
          end: new Date(appointment.endTime),
          staffId: doctorId,
          staffName: staffName,
          staffColor: eventColor,
          roomId: appointment.room,
          roomName: room?.name,
          type: appointment.type,
          status: appointment.status,
          bookingType: appointment.bookingType as 'online' | 'internal',
          locationId: roomLocationId || appointment.locationId,
          locationName: location?.name,
          locationColor: location?.color_hex,
        };
      });
  }, [appointments, filteredStaff, rooms, locations, selectedLocation, medicalFilter, currentDate, viewMode]);

  const handleDateChange = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'prev') {
      if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
      else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
      else if (viewMode === '3day') setCurrentDate(addDays(currentDate, -3));
      else setCurrentDate(addDays(currentDate, -1));
    } else if (direction === 'next') {
      if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
      else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
      else if (viewMode === '3day') setCurrentDate(addDays(currentDate, 3));
      else setCurrentDate(addDays(currentDate, 1));
    } else {
      // "Heute" - stelle sicher, dass der heutige Tag in allen Ansichten sichtbar ist
      const today = new Date();
      
      if (viewMode === 'month') {
        // Für Monatsansicht: gehe zum Monat des heutigen Tages
        setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
      } else if (viewMode === 'week') {
        // Für Wochenansicht: gehe zur Woche des heutigen Tages
        setCurrentDate(startOfWeek(today, { locale: de, weekStartsOn: 1 }));
      } else if (viewMode === '3day') {
        // Für 3-Tage-Ansicht: gehe zum heutigen Tag
        setCurrentDate(today);
      } else {
        // Für Tagesansicht: gehe zum heutigen Tag
        setCurrentDate(today);
      }
    }
  };

  const handleViewModeChange = (mode: 'day' | '3day' | 'week' | 'month') => {
    setViewMode(mode);
    
    // Stelle sicher, dass der heutige Tag in der neuen Ansicht sichtbar ist
    const today = new Date();
    
    if (mode === 'month') {
      // Für Monatsansicht: gehe zum Monat des heutigen Tages
      setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    } else if (mode === 'week') {
      // Für Wochenansicht: gehe zur Woche des heutigen Tages
      setCurrentDate(startOfWeek(today, { locale: de, weekStartsOn: 1 }));
    } else if (mode === '3day') {
      // Für 3-Tage-Ansicht: gehe zum heutigen Tag
      setCurrentDate(today);
    } else {
      // Für Tagesansicht: gehe zum heutigen Tag
      setCurrentDate(today);
    }
  };

  const handleOpenNewEventDialog = (date?: Date, hour?: number) => {
    const start = date ? new Date(new Date(date).setHours(hour || 8, 0, 0, 0)) : new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour default
    
    // Check if any staff is on break during this time slot
    const slotStart = start;
    const slotEnd = end;
    const staffOnBreak = backgroundEvents.some(event => 
      event.type === 'staff_hours' && 
      event.title.includes('Pause') &&
      (isWithinInterval(slotStart, { start: event.start, end: event.end }) ||
       isWithinInterval(slotEnd, { start: event.start, end: event.end }) ||
       (event.start <= slotStart && event.end >= slotEnd))
    );
    
    if (staffOnBreak) {
      alert('Während der Pausenzeiten können keine Termine gebucht werden.');
      return;
    }
    
    // Navigate to appointments page with prefilled date and time
    const dateStr = format(start, 'yyyy-MM-dd');
    const timeStr = format(start, 'HH:mm');
    navigate(`/appointments?openDialog=true&date=${dateStr}&time=${timeStr}`);
  };

  const handleOpenEditEventDialog = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setNewEvent({
      title: event.title,
      start: event.start.toISOString().substring(0, 16),
      end: event.end.toISOString().substring(0, 16),
      staffId: event.staffId,
      roomId: event.roomId || '',
      type: event.type,
      status: event.status,
      patientId: event.patientId || '', // Fetch patient ID for existing event
      locationId: event.locationId || '',
      bookingType: event.bookingType,
    });
    setOpenEventDialog(true);
  };

  const handleCloseEventDialog = () => {
    setOpenEventDialog(false);
    setSelectedEvent(null);
  };

  const handleSaveEvent = () => {
    if (!newEvent.title || !newEvent.start || !newEvent.end || !newEvent.staffId) {
      alert('Bitte füllen Sie alle erforderlichen Felder aus.');
      return;
    }

    const startTime = new Date(newEvent.start);
    const endTime = new Date(newEvent.end);
    
    // Check if the selected staff is on break during this time
    const staffOnBreak = backgroundEvents.some(event => 
      event.type === 'staff_hours' && 
      event.title.includes('Pause') &&
      event.staffId === newEvent.staffId &&
      (isWithinInterval(startTime, { start: event.start, end: event.end }) ||
       isWithinInterval(endTime, { start: event.start, end: event.end }) ||
       (event.start <= startTime && event.end >= endTime))
    );
    
    if (staffOnBreak) {
      alert('Der ausgewählte Mitarbeiter ist während dieser Zeit in der Pause und nicht verfügbar.');
      return;
    }

    const eventData = {
      title: newEvent.title,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      doctor: newEvent.staffId,
      room: newEvent.roomId || undefined,
      patient: newEvent.patientId || undefined,
      type: newEvent.type,
      status: newEvent.status,
      locationId: newEvent.locationId || undefined,
      bookingType: newEvent.bookingType,
    };

    if (selectedEvent) {
      dispatch(updateAppointment({ id: selectedEvent.id, ...eventData }));
    } else {
      dispatch(createAppointment(eventData));
    }
    handleCloseEventDialog();
  };

  const handleDeleteEvent = () => {
    if (selectedEvent) {
      dispatch(deleteAppointment(selectedEvent.id));
      handleCloseEventDialog();
    }
  };

  const handleRefreshData = () => {
    console.log('Manually refreshing data...');
    
    // Debug token
    const token = localStorage.getItem('token');
    console.log('Token from localStorage:', token ? 'Present' : 'Missing');
    if (token) {
      console.log('Token length:', token.length);
      console.log('Token starts with:', token.substring(0, 20) + '...');
    }
    
    dispatch(fetchStaffProfiles()).then((result) => {
      console.log('Staff profiles refresh result:', result);
      console.log('Staff profiles after refresh:', staffProfiles);
      
      // Debug Dr. Thomas Schmidt specifically
      const thomasSchmidt = (Array.isArray(staffProfiles) ? staffProfiles : []).find(s => 
        s.first_name?.includes('Thomas') && s.last_name?.includes('Schmidt')
      );
      if (thomasSchmidt) {
        console.log('Dr. Thomas Schmidt after refresh:', {
          first_name: thomasSchmidt.first_name,
          last_name: thomasSchmidt.last_name,
          color_hex: thomasSchmidt.color_hex,
          display_name: thomasSchmidt.display_name
        });
      } else {
        console.log('Dr. Thomas Schmidt not found in staffProfiles');
        console.log('Available staff:', staffProfiles.map(s => ({
          first_name: s.first_name,
          last_name: s.last_name,
          display_name: s.display_name
        })));
      }
    });
    dispatch(fetchWeeklySchedules());
    dispatch(fetchLocationWeeklySchedules());
    alert('Daten werden aktualisiert...');
  };


  // Function to render continuous bars for events
  const renderContinuousBars = (day: Date) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    
    // Get background events for this day
    const dayBackgroundEvents = backgroundEvents.filter(event => {
      const eventStart = event.start;
      const eventEnd = event.end;
      return eventStart < dayEnd && eventEnd > dayStart;
    });

    // Get calendar events for this day
    const dayCalendarEvents = calendarEvents.filter(event => {
      const eventStart = event.start;
      const eventEnd = event.end;
      return eventStart < dayEnd && eventEnd > dayStart;
    });
    
    // Group background events by type
    const locationHours = dayBackgroundEvents.filter(event => event.type === 'location_hours');
    const staffHours = dayBackgroundEvents.filter(event => event.type === 'staff_hours');

    // Calculate total bars needed (staff + appointments)
    const totalBars = Math.max(1, staffHours.length + dayCalendarEvents.length);
    const barWidth = `${100 / totalBars}%`;

    // Get min hour for this day to calculate relative positions
    const hours = getFilteredHours(day);
    const minHour = hours.length > 0 ? hours[0] : 0;

    return (
      <>
        {/* Background for location hours */}
        {locationHours.map((event, index) => {
          const startMinutes = event.start.getHours() * 60 + event.start.getMinutes();
          const endMinutes = event.end.getHours() * 60 + event.end.getMinutes();
          const topPosition = startMinutes - (minHour * 60); // Offset relative to first hour shown
          const height = endMinutes - startMinutes; // in pixels
          
          return (
            <Tooltip
              key={`location-bg-${event.id}-${index}`}
              title={`${event.title} (${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')})`}
              arrow
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: `${topPosition}px`,
                  left: 0,
                  right: 0,
                  height: `${height}px`,
                  backgroundColor: event.color,
                  opacity: 0.1,
                  zIndex: 0,
                }}
              />
            </Tooltip>
          );
        })}

        {/* Staff hours bars */}
        {staffHours.map((event, index) => {
          const isBreak = event.title.includes('Pause');
          const startMinutes = event.start.getHours() * 60 + event.start.getMinutes();
          const endMinutes = event.end.getHours() * 60 + event.end.getMinutes();
          const topPosition = startMinutes - (minHour * 60); // Offset relative to first hour shown
          const height = endMinutes - startMinutes;
          const leftPosition = `${(index * 100) / totalBars}%`;
          
          return (
            <Tooltip
              key={`staff-bar-${event.id}-${index}`}
              title={`${event.title} - ${event.staffName || 'Unbekannt'} (${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')})`}
              arrow
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: `${topPosition}px`,
                  left: leftPosition,
                  width: barWidth,
                  height: `${height}px`,
                  backgroundColor: isBreak ? '#FF9800' : event.color,
                  opacity: isBreak ? 0.8 : 0.9,
                  borderRight: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  '&:hover': {
                    opacity: 1,
                    transform: 'scale(1.02)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    lineHeight: 1.1,
                  }}
                >
                  {isBreak ? 'PAUSE' : (event.staffName || 'Unbekannt')}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'white',
                    fontSize: '8px',
                    textAlign: 'center',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    lineHeight: 1.1,
                  }}
                >
                  {format(event.start, 'HH:mm')}-{format(event.end, 'HH:mm')}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}

        {/* Calendar events bars */}
        {dayCalendarEvents.map((event, index) => {
          const startMinutes = event.start.getHours() * 60 + event.start.getMinutes();
          const endMinutes = event.end.getHours() * 60 + event.end.getMinutes();
          const topPosition = startMinutes - (minHour * 60); // Offset relative to first hour shown
          const height = endMinutes - startMinutes;
          const leftPosition = `${((staffHours.length + index) * 100) / totalBars}%`;
          const tooltipText = `${event.title}\n${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}\nPersonal: ${event.staffName || 'Unbekannt'}${event.roomName ? `\nRaum: ${event.roomName}` : ''}\nStatus: ${event.status}`;
          
          return (
            <Box
              key={`appointment-bar-${event.id}-${index}`}
              sx={{
                position: 'absolute',
                top: `${topPosition}px`,
                left: leftPosition,
                width: barWidth,
                height: `${height}px`,
                backgroundColor: event.staffColor,
                color: 'white',
                borderRight: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                },
                zIndex: 10,
              }}
              onMouseEnter={(e) => {
                setTooltip({ text: tooltipText, x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => {
                setTooltip(null);
              }}
              onMouseMove={(e) => {
                setTooltip({ text: tooltipText, x: e.clientX + 10, y: e.clientY - 10 });
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditEventDialog(event);
              }}
            >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 'bold',
                    fontSize: '11px',
                    textAlign: 'center',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    lineHeight: 1.1,
                  }}
                >
                  {event.title}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '9px',
                    textAlign: 'center',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    lineHeight: 1.1,
                  }}
                >
                  {format(event.start, 'HH:mm')}-{format(event.end, 'HH:mm')}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '8px',
                    textAlign: 'center',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    lineHeight: 1.1,
                  }}
                >
                  {event.staffName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                  <Chip
                    label={event.bookingType === 'online' ? 'O' : 'I'}
                    size="small"
                    sx={{ height: 14, fontSize: '8px', minWidth: 16 }}
                    color={event.bookingType === 'online' ? 'primary' : 'secondary'}
                  />
                </Box>
              </Box>
          );
        })}
      </>
    );
  };

  const renderTimeSlot = (hour: number, day?: Date) => {
    const slotDate = day || currentDate;
    const slotStart = new Date(slotDate);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(slotDate);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    // Check if any staff is on break during this time slot
    const staffOnBreak = backgroundEvents.some(event => 
      event.type === 'staff_hours' && 
      event.title.includes('Pause') &&
      (isWithinInterval(slotStart, { start: event.start, end: event.end }) ||
       isWithinInterval(slotEnd, { start: event.start, end: event.end }) ||
       (event.start <= slotStart && event.end >= slotEnd))
    );

    // Check if this hour is within any location opening hours
    const isWithinOpeningHours = backgroundEvents.some(event => 
      event.type === 'location_hours' &&
      (isWithinInterval(slotStart, { start: event.start, end: event.end }) ||
       isWithinInterval(slotEnd, { start: event.start, end: event.end }) ||
       (event.start <= slotStart && event.end >= slotEnd))
    );

    return (
      <Box
        key={hour}
        sx={{
          height: '60px',
          borderBottom: isWithinOpeningHours ? 'none' : '1px dashed #e0e0e0',
          position: 'relative',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        }}
        onClick={() => !staffOnBreak && handleOpenNewEventDialog(slotDate, hour)}
      />
    );
  };

  const renderDayView = () => {
    const hours = getFilteredHours(currentDate);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ width: '60px', flexShrink: 0, borderRight: '1px solid #e0e0e0' }} />
          <Box sx={{ flexGrow: 1, textAlign: 'center', py: 1, fontWeight: 'bold' }}>
            {format(currentDate, 'EEEE, dd. MMMM yyyy', { locale: de })}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          <Box sx={{ width: '60px', flexShrink: 0, borderRight: '1px solid #e0e0e0' }}>
            {hours.map(hour => {
              // Check if this hour is within any location opening hours
              const slotStart = new Date(currentDate);
              slotStart.setHours(hour, 0, 0, 0);
              const slotEnd = new Date(currentDate);
              slotEnd.setHours(hour + 1, 0, 0, 0);
              
              const isWithinOpeningHours = backgroundEvents.some(event => 
                event.type === 'location_hours' &&
                (isWithinInterval(slotStart, { start: event.start, end: event.end }) ||
                 isWithinInterval(slotEnd, { start: event.start, end: event.end }) ||
                 (event.start <= slotStart && event.end >= slotEnd))
              );

              return (
                <Box 
                  key={hour} 
                  sx={{ 
                    height: '60px', 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    justifyContent: 'flex-end', 
                    pr: 1, 
                    pt: 0.5, 
                    borderBottom: isWithinOpeningHours ? 'none' : '1px dashed #e0e0e0' 
                  }}
                >
                  <Typography variant="caption">{`${hour}:00`}</Typography>
                </Box>
              );
            })}
          </Box>
          <Box sx={{ flexGrow: 1, position: 'relative' }}>
            {/* Continuous bars overlay */}
            {renderContinuousBars(currentDate)}
            {/* Time slots */}
            {hours.map(hour => renderTimeSlot(hour))}
          </Box>
        </Box>
      </Box>
    );
  };

  const render3DayView = () => {
    const startDate = addDays(currentDate, -1);
    let days = Array.from({ length: 3 }, (_, i) => addDays(startDate, i));
    
    // Filter out weekends if hideWeekends is enabled
    if (hideWeekends) {
      days = days.filter(day => {
        const dayOfWeek = day.getDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6; // 0 = Sunday, 6 = Saturday
      });
    }
    
    // Get hours for all days (combining opening hours from all days)
    const hours = getFilteredHoursForDays(days);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ width: '60px', flexShrink: 0, borderRight: '1px solid #e0e0e0' }} />
          {days.map(day => (
            <Box key={day.toISOString()} sx={{ flexGrow: 1, textAlign: 'center', py: 1, fontWeight: 'bold', borderRight: '1px solid #e0e0e0' }}>
              <Typography variant="caption" display="block">{format(day, 'EEE', { locale: de })}</Typography>
              <Typography variant="body2">{format(day, 'dd.MM.', { locale: de })}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          <Box sx={{ width: '60px', flexShrink: 0, borderRight: '1px solid #e0e0e0' }}>
            {hours.map(hour => {
              // Check if this hour is within any location opening hours
              const slotStart = new Date(currentDate);
              slotStart.setHours(hour, 0, 0, 0);
              const slotEnd = new Date(currentDate);
              slotEnd.setHours(hour + 1, 0, 0, 0);
              
              const isWithinOpeningHours = backgroundEvents.some(event => 
                event.type === 'location_hours' &&
                (isWithinInterval(slotStart, { start: event.start, end: event.end }) ||
                 isWithinInterval(slotEnd, { start: event.start, end: event.end }) ||
                 (event.start <= slotStart && event.end >= slotEnd))
              );

              return (
                <Box 
                  key={hour} 
                  sx={{ 
                    height: '60px', 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    justifyContent: 'flex-end', 
                    pr: 1, 
                    pt: 0.5, 
                    borderBottom: isWithinOpeningHours ? 'none' : '1px dashed #e0e0e0' 
                  }}
                >
                  <Typography variant="caption">{`${hour}:00`}</Typography>
                </Box>
              );
            })}
          </Box>
          {days.map(day => (
            <Box key={day.toISOString()} sx={{ flexGrow: 1, position: 'relative', borderRight: '1px solid #e0e0e0' }}>
              {/* Continuous bars overlay */}
              {renderContinuousBars(day)}
              {/* Time slots */}
              {hours.map(hour => renderTimeSlot(hour, day))}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderWeekView = () => {
    const startWeek = startOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
    let days = Array.from({ length: 7 }, (_, i) => addDays(startWeek, i));
    
    // Filter out weekends if hideWeekends is enabled
    if (hideWeekends) {
      days = days.filter(day => {
        const dayOfWeek = day.getDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6; // 0 = Sunday, 6 = Saturday
      });
    }
    
    // Get hours for all days (combining opening hours from all days)
    const hours = getFilteredHoursForDays(days);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ width: '60px', flexShrink: 0, borderRight: '1px solid #e0e0e0' }} />
          {days.map(day => (
            <Box key={day.toISOString()} sx={{ flexGrow: 1, textAlign: 'center', py: 1, fontWeight: 'bold', borderRight: '1px solid #e0e0e0' }}>
              <Typography variant="caption" display="block">{format(day, 'EEE', { locale: de })}</Typography>
              <Typography variant="body2">{format(day, 'dd.MM.', { locale: de })}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          <Box sx={{ width: '60px', flexShrink: 0, borderRight: '1px solid #e0e0e0' }}>
            {hours.map(hour => {
              // Check if this hour is within any location opening hours
              const slotStart = new Date(currentDate);
              slotStart.setHours(hour, 0, 0, 0);
              const slotEnd = new Date(currentDate);
              slotEnd.setHours(hour + 1, 0, 0, 0);
              
              const isWithinOpeningHours = backgroundEvents.some(event => 
                event.type === 'location_hours' &&
                (isWithinInterval(slotStart, { start: event.start, end: event.end }) ||
                 isWithinInterval(slotEnd, { start: event.start, end: event.end }) ||
                 (event.start <= slotStart && event.end >= slotEnd))
              );

              return (
                <Box 
                  key={hour} 
                  sx={{ 
                    height: '60px', 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    justifyContent: 'flex-end', 
                    pr: 1, 
                    pt: 0.5, 
                    borderBottom: isWithinOpeningHours ? 'none' : '1px dashed #e0e0e0' 
                  }}
                >
                  <Typography variant="caption">{`${hour}:00`}</Typography>
                </Box>
              );
            })}
          </Box>
          {days.map(day => (
            <Box key={day.toISOString()} sx={{ flexGrow: 1, position: 'relative', borderRight: '1px solid #e0e0e0' }}>
              {/* Continuous bars overlay */}
              {renderContinuousBars(day)}
              {/* Time slots */}
              {hours.map(hour => renderTimeSlot(hour, day))}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderMonthView = () => {
    const startMonth = startOfMonth(currentDate);
    const endMonth = endOfMonth(currentDate);
    const startDate = startOfWeek(startMonth, { locale: de, weekStartsOn: 1 });
    const endDate = endOfWeek(endMonth, { locale: de, weekStartsOn: 1 });

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid #e0e0e0', height: '100%', overflowY: 'auto' }}>
        {Array.from({ length: 7 }, (_, i) => (
          <Box key={i} sx={{ textAlign: 'center', p: 1, fontWeight: 'bold', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #e0e0e0', '&:last-child': { borderRight: 'none' } }}>
            {format(addDays(startOfWeek(new Date(), { locale: de, weekStartsOn: 1 }), i), 'EEE', { locale: de })}
          </Box>
        ))}
        {days.map((dayItem, index) => {
          const dayEvents = calendarEvents.filter(event => isSameDay(event.start, dayItem));
          return (
            <Box
              key={index}
              sx={{
                borderRight: '1px solid #e0e0e0',
                borderBottom: '1px solid #e0e0e0',
                minHeight: '100px',
                p: 0.5,
                backgroundColor: isSameMonth(dayItem, currentDate) ? 'white' : '#f5f5f5',
                opacity: isSameMonth(dayItem, currentDate) ? 1 : 0.7,
                cursor: 'pointer',
                '&:nth-of-type(7n)': { borderRight: 'none' },
              }}
              onClick={() => handleOpenNewEventDialog(dayItem)}
            >
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: isSameDay(dayItem, new Date()) ? 'primary.main' : 'text.primary' }}>
                {format(dayItem, 'd', { locale: de })}
              </Typography>
              {dayEvents.map(event => {
                const tooltipText = `${event.title}\n${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}\nPersonal: ${event.staffName || 'Unbekannt'}${event.roomName ? `\nRaum: ${event.roomName}` : ''}\nStatus: ${event.status}`;
                return (
                  <span
                    key={event.id}
                    onMouseEnter={(e) => {
                      setTooltip({ text: tooltipText, x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => {
                      setTooltip(null);
                    }}
                    onMouseMove={(e) => {
                      setTooltip({ text: tooltipText, x: e.clientX + 10, y: e.clientY - 10 });
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditEventDialog(event);
                    }}
                    style={{
                      backgroundColor: event.staffColor,
                      color: 'white',
                      borderRadius: '2px',
                      fontSize: '0.7rem',
                      padding: '2px 4px',
                      marginBottom: '2px',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      cursor: 'pointer',
                      display: 'block',
                      width: '100%',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {`${format(event.start, 'HH:mm')} ${event.title}`}
                  </span>
                );
              })}
            </Box>
          );
        })}
      </Box>
    );
  };

  if (appointmentsLoading || staffLoading || roomsLoading || locationsLoading || locationSchedulesLoading || weeklySchedulesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (appointmentsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Fehler beim Laden der Termine: {appointmentsError}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 64px - 48px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Typography variant="h4" gutterBottom>Dienst-Kalender</Typography>


      {/* Header Controls */}
      <Card sx={{ mb: 2, flexShrink: 0 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '60px' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <IconButton onClick={() => handleDateChange('prev')} size="medium">
                <ArrowBackIosIcon />
              </IconButton>
              <IconButton onClick={() => handleDateChange('next')} size="medium">
                <ArrowForwardIosIcon />
              </IconButton>
              <Button onClick={() => handleDateChange('today')} variant="outlined" size="medium" sx={{ ml: 1 }}>
                <TodayIcon sx={{ mr: 1 }} /> Heute
              </Button>
            </Box>
            <Typography variant="h4" sx={{ mx: 2, fontWeight: 'bold', fontSize: '1.5rem', textAlign: 'center', flex: 1 }}>
              {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: de })}
              {viewMode === 'week' && `KW ${format(currentDate, 'w', { locale: de })} ${format(currentDate, 'yyyy', { locale: de })}`}
              {viewMode === '3day' && `3-Tage-Ansicht ${format(addDays(currentDate, -1), 'dd.MM.')} - ${format(addDays(currentDate, 1), 'dd.MM.yyyy')}`}
              {viewMode === 'day' && format(currentDate, 'dd. MMMM yyyy', { locale: de })}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                onClick={handleRefreshData}
                variant="outlined"
                size="medium"
                startIcon={<RefreshIcon />}
              >
                Aktualisieren
              </Button>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, newMode) => newMode && handleViewModeChange(newMode)}
                size="medium"
              >
                <ToggleButton value="day">
                  <ViewDayIcon sx={{ mr: 0.5 }} /> Tag
                </ToggleButton>
                <ToggleButton value="3day">
                  <ViewAgendaIcon sx={{ mr: 0.5 }} /> 3 Tage
                </ToggleButton>
                <ToggleButton value="week">
                  <ViewWeekIcon sx={{ mr: 0.5 }} /> Woche
                </ToggleButton>
                <ToggleButton value="month">
                  <ViewMonthIcon sx={{ mr: 0.5 }} /> Monat
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={{ mb: 2, flexShrink: 0 }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: '1.1rem' }}>Filter</Typography>
          
          {/* Dropdown Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel>Standort</InputLabel>
              <Select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                label="Standort"
              >
                <MenuItem value="all">Alle Standorte</MenuItem>
                {(Array.isArray(locations) ? locations : []).map((location) => (
                  <MenuItem key={location._id} value={location._id}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: location.color_hex || '#2563EB',
                          mr: 1
                        }}
                      />
                      {location.name}{location.code ? ` (${location.code})` : ''}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 140 }}>
              <InputLabel>Personal</InputLabel>
              <Select
                value={medicalFilter}
                onChange={(e) => setMedicalFilter(e.target.value as 'all' | 'medical' | 'non-medical')}
                label="Personal"
              >
                <MenuItem value="all">Alle</MenuItem>
                <MenuItem value="medical">Mediziner</MenuItem>
                <MenuItem value="non-medical">Nicht-Mediziner</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          {/* Toggle Switches */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showLocationHours}
                  onChange={(e) => setShowLocationHours(e.target.checked)}
                />
              }
              label="Standort-Öffnungszeiten"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={showStaffHours}
                  onChange={(e) => setShowStaffHours(e.target.checked)}
                />
              }
              label="Personal-Arbeitszeiten"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={showBreaks}
                  onChange={(e) => setShowBreaks(e.target.checked)}
                />
              }
              label="Pausenzeiten"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={showOnlyOpeningHours}
                  onChange={(e) => setShowOnlyOpeningHours(e.target.checked)}
                />
              }
              label="Nur Öffnungszeiten anzeigen"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={hideWeekends}
                  onChange={(e) => setHideWeekends(e.target.checked)}
                />
              }
              label="Wochenenden ausblenden"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Box sx={{ flexGrow: 1, border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden', minHeight: 0 }}>
        {viewMode === 'day' && renderDayView()}
        {viewMode === '3day' && render3DayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </Box>

      {/* Event Dialog */}
      <Dialog 
        open={openEventDialog} 
        onClose={handleCloseEventDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <GradientDialogTitle
          isEdit={!!selectedEvent}
          title={selectedEvent ? 'Termin bearbeiten' : 'Neuen Termin erstellen'}
          icon={<EventIcon />}
          gradientColors={{ from: '#06b6d4', to: '#0891b2' }}
        />
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 400 }}>
            <TextField
              label="Titel"
              fullWidth
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Startzeit"
                type="datetime-local"
                fullWidth
                value={newEvent.start}
                onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Endzeit"
                type="datetime-local"
                fullWidth
                value={newEvent.end}
                onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <TextField
              label="Mitarbeiter"
              select
              fullWidth
              value={newEvent.staffId}
              onChange={(e) => setNewEvent({ ...newEvent, staffId: e.target.value })}
            >
              {filteredStaff.map((staff) => (
                <MenuItem key={staff._id} value={staff.user_id}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: staff.color_hex || '#9CA3AF',
                        mr: 1
                      }}
                    />
                    {staff.display_name}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Raum"
              select
              fullWidth
              value={newEvent.roomId}
              onChange={(e) => setNewEvent({ ...newEvent, roomId: e.target.value })}
            >
              <MenuItem value="">Kein Raum</MenuItem>
              {(Array.isArray(rooms) ? rooms : []).map((room) => (
                <MenuItem key={room._id} value={room._id}>
                  {room.name}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Termin-Typ"
                select
                fullWidth
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
              >
                {['konsultation', 'untersuchung', 'operation', 'nachsorge', 'beratung', 'gruppentermin', 'impfung', 'vorsorge', 'labor', 'sonstiges'].map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Status"
                select
                fullWidth
                value={newEvent.status}
                onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value })}
              >
                {['confirmed', 'pending', 'cancelled', 'completed', 'no-show'].map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Buchungstyp"
                select
                fullWidth
                value={newEvent.bookingType}
                onChange={(e) => setNewEvent({ ...newEvent, bookingType: e.target.value as 'online' | 'internal' })}
              >
                <MenuItem value="internal">Intern</MenuItem>
                <MenuItem value="online">Online</MenuItem>
              </TextField>
              <TextField
                label="Standort"
                select
                fullWidth
                value={newEvent.locationId}
                onChange={(e) => setNewEvent({ ...newEvent, locationId: e.target.value })}
              >
                <MenuItem value="">Kein Standort</MenuItem>
                {(Array.isArray(locations) ? locations : []).map((location) => (
                  <MenuItem key={location._id} value={location._id}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: location.color_hex || '#2563EB',
                          mr: 1
                        }}
                      />
                      {location.name}{location.code ? ` (${location.code})` : ''}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              label="Patienten-ID (optional)"
              fullWidth
              value={newEvent.patientId}
              onChange={(e) => setNewEvent({ ...newEvent, patientId: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          {selectedEvent && (
            <Button onClick={handleDeleteEvent} color="error">
              Löschen
            </Button>
          )}
          <Button onClick={handleCloseEventDialog}>Abbrechen</Button>
          <Button onClick={handleSaveEvent} variant="contained" color="primary">
            {selectedEvent ? 'Speichern' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Custom Tooltip */}
      {tooltip && (
        <Box
          sx={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            whiteSpace: 'pre-line',
            zIndex: 10000,
            pointerEvents: 'none',
            maxWidth: '250px',
          }}
        >
          {tooltip.text}
        </Box>
      )}
    </Box>
  );
};

export default EnhancedCalendar;
