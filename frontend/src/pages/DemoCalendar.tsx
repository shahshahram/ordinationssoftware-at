import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Paper,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  CircularProgress,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  Switch,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  List,
  Menu,
  useTheme,
  useMediaQuery,
  Tooltip,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Drawer,
  Fab,
} from '@mui/material';
import {
  Favorite,
  Search,
  Add,
  ArrowBackIos,
  ArrowForwardIos,
  Today,
  MoreVert,
  CheckBox,
  Mail,
  Euro,
  Help,
  Build,
  Fullscreen,
  Folder,
  Event as EventIcon,
  Person,
  LocalHospital,
  MedicalServices,
  Note,
  Schedule,
  Star,
  AccessTime,
  Done,
  Warning,
  CheckCircle,
  Block,
  LockOpen,
  Merge,
  Close,
  FilterList,
} from '@mui/icons-material';
import { format, startOfWeek, addDays, addWeeks, subWeeks, startOfMonth, endOfMonth, endOfWeek, isSameDay, isSameMonth, eachDayOfInterval, parseISO, addMonths, subMonths, startOfDay, endOfDay, getISOWeek, getISOWeekYear, differenceInYears } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAppointments, createAppointment, updateAppointment, deleteAppointment, Appointment } from '../store/slices/appointmentSlice';
import { fetchLocations, Location } from '../store/slices/locationSlice';
import { fetchPatients, Patient } from '../store/slices/patientSlice';
import { fetchStaffProfiles } from '../store/slices/staffSlice';
import { fetchRooms } from '../store/slices/roomSlice';
import { fetchPatientDiagnoses, PatientDiagnosis } from '../store/slices/diagnosisSlice';
import { fetchWaitingListCount } from '../store/slices/waitingListSlice';
import GradientDialogTitle from '../components/GradientDialogTitle';
import DiagnosisManager from '../components/DiagnosisManager';
import CreateTaskDialog from '../components/Tasks/CreateTaskDialog';
import api from '../utils/api';
import { useTimeSlotSelection } from '../hooks/useTimeSlotSelection';
import { eventBus, EVENTS } from '../utils/eventBus';

// Hilfsfunktion zum Entfernen von HTML-Tags
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

// Hilfsfunktion zum Berechnen des Alters
const calculateAge = (dateOfBirth: string | Date | null | undefined): number | null => {
  if (!dateOfBirth) return null;
  try {
    const birthDate = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
    if (isNaN(birthDate.getTime())) return null;
    return differenceInYears(new Date(), birthDate);
  } catch (error) {
    return null;
  }
};

interface CalendarAppointment {
  id: string;
  patientName: string;
  type: string;
  start: Date;
  end: Date;
  locationId: string;
  locationName: string;
  color: string;
  patientId?: string;
  appointment: Appointment;
}

interface Service {
  _id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  base_duration_min: number;
  buffer_before_min: number;
  buffer_after_min: number;
  can_overlap: boolean;
  requires_room: boolean;
  required_device_type?: string;
  min_age_years?: number;
  max_age_years?: number;
  requires_consent: boolean;
  online_bookable: boolean;
  price_cents?: number;
  billing_code?: string;
  notes?: string;
  is_active: boolean;
  color_hex?: string;
  quick_select?: boolean;
  location_id?: {
    _id: string;
    name: string;
    code: string;
  };
  assigned_rooms?: Array<{
    _id: string;
    name: string;
    location?: {
      _id: string;
      name: string;
      code: string;
    };
  }>;
  assigned_devices?: Array<{
    _id: string;
    name: string;
    location?: {
      _id: string;
      name: string;
      code: string;
    };
  }>;
  assigned_users?: Array<{
    _id: string;
    firstName?: string;
    lastName?: string;
    display_name?: string;
    first_name?: string;
    last_name?: string;
  }>;
  requires_device_selection?: boolean;
  device_quantity_required?: number;
}

interface AppointmentFormData {
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  patientEmail?: string;
  patient?: Patient | string;
  doctor?: string;
  date?: string;
  time?: string;
  duration?: number;
  type?: string;
  status?: string;
  room?: string | { _id: string; name: string; number?: string };
  notes?: string;
  symptoms?: string[];
  diagnosis?: string;
  treatment?: string[];
  currentMedications?: string[];
  followUpRequired?: boolean;
  followUpDate?: string;
  serviceId?: string;
  service?: Service;
}

const DemoCalendar: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // Redux State
  const { appointments, loading: appointmentsLoading } = useAppSelector((state) => state.appointments);
  const { locations, loading: locationsLoading, currentLocation } = useAppSelector((state) => state.locations);
  const { patients, loading: patientsLoading } = useAppSelector((state) => state.patients);
  const { staffProfiles } = useAppSelector((state) => state.staff);
  const { rooms } = useAppSelector((state) => state.rooms);
  const { patientDiagnoses } = useAppSelector((state) => state.diagnoses);
  const { count: waitingListCount } = useAppSelector((state) => state.waitingList);
  const { user } = useAppSelector((state) => state.auth);

  // Local State
  const dateInitializedRef = useRef(false);
  
  // Hilfsfunktion: Stelle sicher, dass wir IMMER die richtige Woche verwenden (KW 2 2026, nicht KW 1 2025)
  const getCorrectWeekStart = useCallback((date: Date) => {
    const weekStart = startOfWeek(date, { locale: de, weekStartsOn: 1 });
    const weekNumber = parseInt(format(weekStart, 'w', { locale: de }));
    const weekYear = parseInt(format(weekStart, 'yyyy', { locale: de }));
    
    // Wenn das Datum KW 1 2025 ist (29. Dezember 2025), verwende die nächste Woche (KW 2 2026)
    // Dies entspricht dem Verhalten des Dienstkalenders
    if (weekYear === 2025 && weekNumber === 1) {
      return addWeeks(weekStart, 1);
    }
    return weekStart;
  }, []);
  
  const [currentDate, setCurrentDate] = useState(() => getCorrectWeekStart(new Date()));
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openEventDialog, setOpenEventDialog] = useState(false);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [openSearchDialog, setOpenSearchDialog] = useState(false);
  const [searchDialogQuery, setSearchDialogQuery] = useState('');
  const [searchDialogCategory, setSearchDialogCategory] = useState<'all' | 'patients' | 'appointments' | 'services' | 'staff' | 'rooms' | 'devices'>('all');
  const [devices, setDevices] = useState<any[]>([]);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [services, setServices] = useState<Service[]>([]);
  const [patientSearchValue, setPatientSearchValue] = useState<Patient | null>(null);
  const [patientSearchInput, setPatientSearchInput] = useState('');
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [serviceSearchInput, setServiceSearchInput] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // TimeBlock State
  const [timeBlocks, setTimeBlocks] = useState<any[]>([]);
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<any | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [selectedBlockStaff, setSelectedBlockStaff] = useState<string>('');
  const [pendingBlockTime, setPendingBlockTime] = useState<{ start: Date; end: Date; staffId?: string } | null>(null);
  const [contextMenuAnchor, setContextMenuAnchor] = useState<{
    x: number;
    y: number;
    timeBlock?: any;
    start?: Date;
    end?: Date;
    staffId?: string;
    day?: Date;
  } | null>(null);
  
  // LocationException State
  const [locationExceptions, setLocationExceptions] = useState<any[]>([]);
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
  const [selectedException, setSelectedException] = useState<any | null>(null);
  const [exceptionLocationId, setExceptionLocationId] = useState<string>('');
  const [exceptionFormData, setExceptionFormData] = useState({
    date: '',
    startTime: '08:00',
    endTime: '17:00',
    breakStart: '',
    breakEnd: '',
    label: 'Sonderöffnung',
    assignedStaff: [] as string[]
  });
  
  // Drag-Selection Hook
  const {
    isSelecting,
    selectionStart,
    selectionEnd,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    isSlotInSelection,
    getSelectionRange
  } = useTimeSlotSelection();
  
  // ESC-Taste zum Entfernen der Markierung
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (selectionStart || selectionEnd)) {
        clearSelection();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectionStart, selectionEnd, clearSelection]);
  
  const [formData, setFormData] = useState<AppointmentFormData>({
    patientId: '',
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    doctor: '',
    date: '',
    time: '',
    duration: 30,
    type: '',
    status: 'geplant',
    room: undefined,
    notes: '',
    symptoms: [],
    diagnosis: '',
    treatment: [],
    currentMedications: [],
    followUpRequired: false,
    serviceId: '',
    service: undefined,
  });

  // Ensure currentDate is always current week on mount - FORCE update
  useEffect(() => {
    if (dateInitializedRef.current) return;
    
    const correctWeekStart = getCorrectWeekStart(new Date());
    setCurrentDate(correctWeekStart);
    
    dateInitializedRef.current = true;
  }, [getCorrectWeekStart]); // Nur beim Mount

  // Load data on mount
  useEffect(() => {
    dispatch(fetchAppointments());
    dispatch(fetchLocations());
    dispatch(fetchPatients(1));
    dispatch(fetchStaffProfiles());
    dispatch(fetchRooms());
    dispatch(fetchWaitingListCount({ status: 'waiting' }));
    
    // Load services
    const loadServices = async () => {
      try {
        const response = await api.get<any>('/service-catalog?limit=1000');
        if (response.success && response.data) {
          setServices(Array.isArray(response.data) ? response.data : response.data.data || []);
        }
      } catch (error) {
        console.error('Error loading services:', error);
      }
    };
    loadServices();

    // Load devices
    const loadDevices = async () => {
      try {
        const response = await api.get<any>('/devices');
        if (response.success && response.data) {
          setDevices(Array.isArray(response.data) ? response.data : response.data.data || []);
        }
      } catch (error) {
        console.error('Error loading devices:', error);
      }
    };
    loadDevices();
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
      
      // Lade Diagnosen für alle eindeutigen Patienten
      patientIds.forEach(patientId => {
        dispatch(fetchPatientDiagnoses({ 
          patientId, 
          status: 'active'
        }));
      });
    }
  }, [appointments, dispatch]);
  
  // Initialize selected location
  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations.length === 1 ? locations[0]._id : locations[0]._id);
    }
  }, [locations, selectedLocation]);

  // Initialize selected locations - load from localStorage if available
  const hasInitializedLocations = useRef(false);
  const lastUserId = useRef<string | null>(null);
  
  useEffect(() => {
    // Reset initialization flag if user changed
    if (user?._id && lastUserId.current !== user._id) {
      hasInitializedLocations.current = false;
      lastUserId.current = user._id;
    } else if (!user?._id && lastUserId.current !== null) {
      hasInitializedLocations.current = false;
      lastUserId.current = null;
    }
    
    if (locations.length > 0 && !hasInitializedLocations.current && user?._id) {
      // Lade gespeicherte Standort-Auswahl aus localStorage
      try {
        const storageKey = `demoCalendar_selectedLocations_${user._id}`;
        const saved = localStorage.getItem(storageKey);
        console.log('🔍 Loading location selections from localStorage:', { storageKey, saved, locationsCount: locations.length });
        if (saved) {
          const savedLocations = JSON.parse(saved);
          console.log('📥 Parsed saved locations:', savedLocations);
          // Prüfe, ob alle gespeicherten Standorte noch existieren
          const validLocations = savedLocations.filter((id: string) => 
            locations.some(loc => loc._id === id)
          );
          console.log('✅ Valid locations after filtering:', validLocations);
          if (validLocations.length > 0) {
            setSelectedLocations(validLocations);
            console.log('📥 Loaded saved location selections:', validLocations);
          } else {
            console.log('⚠️ No valid locations found, starting with empty selection');
            setSelectedLocations([]);
          }
        } else {
          // Keine gespeicherten Einstellungen - starte mit leerer Auswahl
          console.log('ℹ️ No saved location selections found, starting with empty selection');
          setSelectedLocations([]);
        }
      } catch (error) {
        console.error('❌ Error loading saved location selections:', error);
        setSelectedLocations([]);
      }
      hasInitializedLocations.current = true;
    } else if (locations.length > 0 && !hasInitializedLocations.current && !user?._id) {
      // Kein User vorhanden - starte mit leerer Auswahl
      setSelectedLocations([]);
      hasInitializedLocations.current = true;
    }
  }, [locations, user]);

  // Note: Removed auto-selection of currentLocation to allow user control
  // User must explicitly select locations via checkboxes

  // Update waiting list count when selected locations change
  useEffect(() => {
    if (selectedLocations.length > 0) {
      dispatch(fetchWaitingListCount({ 
        status: 'waiting',
        locationId: selectedLocations.length === 1 ? selectedLocations[0] : undefined
      }));
    } else {
      dispatch(fetchWaitingListCount({ status: 'waiting' }));
    }
  }, [selectedLocations, dispatch]);

  // Patient lookup map
  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach(patient => {
      const id = patient._id || patient.id;
      if (id) {
        map.set(id, patient);
      }
    });
    return map;
  }, [patients]);

  // Location lookup map
  const locationMap = useMemo(() => {
    const map = new Map<string, Location>();
    locations.forEach(location => {
      map.set(location._id, location);
    });
    return map;
  }, [locations]);

  // Convert appointments to calendar format
  const calendarAppointments = useMemo(() => {
    const filtered = appointments.filter(apt => {
      // Filter by selected locations
      // If locations are selected, only show appointments from those locations
      // If no locations are selected, show all appointments
      if (selectedLocations.length > 0) {
        // Extract locationId - can be direct property, nested in location object, or via room
        let aptLocationId: string | null = null;
        
        // 1. Try direct locationId property
        if (apt.locationId) {
          aptLocationId = typeof apt.locationId === 'string' ? apt.locationId : String(apt.locationId);
        } 
        // 2. Try nested location object
        else if ((apt as any).location) {
          const location = (apt as any).location;
          aptLocationId = typeof location === 'string' 
            ? location 
            : (location?._id ? String(location._id) : null);
        }
        // 3. Try to get location from room
        else if (apt.room) {
          const roomId = typeof apt.room === 'string' ? apt.room : (apt.room as any)?._id;
          if (roomId) {
            const room = rooms.find(r => (r._id === roomId || r._id === String(roomId)));
            if (room && room.location) {
              const roomLocation = typeof room.location === 'string' 
                ? room.location 
                : (room.location as any)?._id;
              if (roomLocation) {
                aptLocationId = String(roomLocation);
              }
            }
          }
        }
        
        // Debug logging entfernt - zu viele Logs in der Konsole
        
        // If appointment has no locationId, hide it when locations are selected
        if (!aptLocationId) {
          return false; // Hide appointments without locationId when locations are selected
        }
        
        // Check if the locationId matches any selected location
        const isLocationSelected = selectedLocations.some(selectedId => {
          const selectedIdStr = String(selectedId);
          const aptLocationIdStr = String(aptLocationId);
          return selectedIdStr === aptLocationIdStr;
        });
        
        if (!isLocationSelected) {
          return false; // Hide appointment if location is not selected
        }
      }
      // If selectedLocations.length === 0, all appointments pass this filter
      
      // Filter by search query
      if (searchQuery) {
        const patientId = typeof apt.patient === 'string' 
          ? apt.patient 
          : (apt.patient as any)?._id || (apt.patient as any)?.id || '';
        const patient = patientId ? patientMap.get(patientId) : null;
        const patientName = patient ? `${patient.firstName} ${patient.lastName}` : '';
        const searchLower = searchQuery.toLowerCase();
        return (
          apt.title?.toLowerCase().includes(searchLower) ||
          patientName.toLowerCase().includes(searchLower) ||
          apt.type?.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
    
    const mapped = filtered.map(apt => {
      // Extract patientId - can be string or object
      const patientId = typeof apt.patient === 'string' 
        ? apt.patient 
        : (apt.patient as any)?._id || (apt.patient as any)?.id || apt.patient || '';
      
      const patient = patientId ? patientMap.get(patientId) : null;
      const patientName = patient 
        ? `${patient.firstName} ${patient.lastName}` 
        : (typeof apt.patient === 'object' && apt.patient !== null)
          ? `${(apt.patient as any).firstName || ''} ${(apt.patient as any).lastName || ''}`.trim() || apt.title || 'Unbekannt'
          : apt.title || 'Unbekannt';
      
      // Extract service information
      let serviceName = apt.type || 'Termin';
      let serviceColor: string | undefined = undefined;
      
      const aptService = (apt as any).service;
      if (aptService) {
        if (typeof aptService === 'object' && aptService !== null) {
          // Entferne HTML-Tags aus Service-Namen
          const rawServiceName = aptService.name || serviceName;
          serviceName = rawServiceName.replace(/<[^>]*>/g, '');
          serviceColor = aptService.color_hex;
        } else if (typeof aptService === 'string') {
          // Service is just an ID, try to find it in services list
          const foundService = services.find(s => s._id === aptService);
          if (foundService) {
            // Entferne HTML-Tags aus Service-Namen
            const rawServiceName = foundService.name;
            serviceName = rawServiceName.replace(/<[^>]*>/g, '');
            serviceColor = foundService.color_hex;
          }
        }
      }
      
      // Also check serviceId field
      if (!serviceColor && (apt as any).serviceId) {
        const foundService = services.find(s => s._id === (apt as any).serviceId);
        if (foundService) {
          // Entferne HTML-Tags aus Service-Namen
          const rawServiceName = foundService.name;
          serviceName = rawServiceName.replace(/<[^>]*>/g, '');
          serviceColor = foundService.color_hex;
        }
      }
      
      const location = apt.locationId ? locationMap.get(apt.locationId) : null;
      const locationName = location?.name || 'Unbekannt';
      const locationColor = location?.color_hex || '#1976d2';
      
      // Use service color if available, otherwise location color
      const appointmentColor = serviceColor || locationColor;
      
      try {
        const startDate = parseISO(apt.startTime);
        const endDate = parseISO(apt.endTime);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.warn('Invalid date for appointment:', apt._id, apt.startTime, apt.endTime);
          return null;
        }
        
        return {
          id: apt._id,
          patientName,
          type: serviceName,
          start: startDate,
          end: endDate,
          locationId: apt.locationId || '',
          locationName,
          color: appointmentColor,
          patientId: patientId || undefined,
          appointment: apt,
        } as CalendarAppointment;
      } catch (error) {
        console.error('Error parsing appointment dates:', apt._id, error);
        return null;
      }
    });
    
    return mapped.filter((apt): apt is CalendarAppointment => apt !== null);
  }, [appointments, selectedLocations, searchQuery, patientMap, locationMap, services, rooms, openSearchDialog]);

  // Berechne angezeigte Tage basierend auf viewMode
  const displayedDays = useMemo(() => {
    if (viewMode === 'day') {
      return [startOfDay(currentDate)];
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
      return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)); // Mo-Fr
    } else if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { locale: de, weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { locale: de, weekStartsOn: 1 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }
    return [];
  }, [currentDate, viewMode]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour <= 21; hour++) {
      slots.push(`${hour}:00`);
      if (hour < 21) {
        slots.push(`${hour}:30`);
      }
    }
    return slots;
  }, []);

  const handleLocationToggle = (locationId: string) => {
    setSelectedLocations(prev => {
      const newLocations = prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId];
      
      // Speichere die Auswahl in localStorage (user-spezifisch)
      if (user?._id) {
        try {
          const storageKey = `demoCalendar_selectedLocations_${user._id}`;
          localStorage.setItem(storageKey, JSON.stringify(newLocations));
          console.log('💾 Saved location selections:', newLocations);
        } catch (error) {
          console.error('Error saving location selections:', error);
        }
      }
      
      return newLocations;
    });
  };

  const handleDateNavigation = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'prev') {
      if (viewMode === 'month') {
        setCurrentDate(prev => subMonths(prev, 1));
      } else if (viewMode === 'week') {
        setCurrentDate(prev => subWeeks(prev, 1));
      } else {
        setCurrentDate(prev => addDays(prev, -1));
      }
    } else if (direction === 'next') {
      if (viewMode === 'month') {
        setCurrentDate(prev => addMonths(prev, 1));
      } else if (viewMode === 'week') {
        setCurrentDate(prev => addWeeks(prev, 1));
      } else {
        setCurrentDate(prev => addDays(prev, 1));
      }
    } else {
      // "Heute" Button
      if (viewMode === 'month') {
        setCurrentDate(new Date());
      } else if (viewMode === 'week') {
        setCurrentDate(getCorrectWeekStart(new Date()));
      } else {
        setCurrentDate(new Date());
      }
    }
  };

  const getAppointmentsForDay = (day: Date) => {
    return calendarAppointments.filter(apt => isSameDay(apt.start, day));
  };

  const getAppointmentPosition = (appointment: CalendarAppointment) => {
    const start = appointment.start;
    const end = appointment.end;
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const duration = endMinutes - startMinutes;
    
    // Basis: 6:00 = 0, jede halbe Stunde = 40px
    const top = ((startMinutes - 360) / 30) * 40; // 360 = 6:00 in Minuten
    const height = Math.max((duration / 30) * 40, 40); // Minimum 40px
    
    return { top, height };
  };

  const handleOpenNewEventDialog = (date?: Date, hour?: number) => {
    const startDate = date || currentDate;
    const startHour = hour !== undefined ? hour : 9;
    const startTime = new Date(startDate);
    startTime.setHours(startHour, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(startHour + 1, 0, 0, 0);

    const dateStr = format(startDate, 'yyyy-MM-dd');
    const timeStr = format(startTime, 'HH:mm');

    setFormData({
      patientId: '',
      patientName: '',
      patientPhone: '',
      patientEmail: '',
      doctor: '',
      date: dateStr,
      time: timeStr,
      duration: 30,
      type: '',
      status: 'geplant',
      room: undefined,
      notes: '',
      symptoms: [],
      diagnosis: '',
      treatment: [],
      currentMedications: [],
      followUpRequired: false,
      serviceId: '',
      service: undefined,
    });
    setPatientSearchValue(null);
    setPatientSearchInput('');
    // Wenn genau ein Standort über die Checkboxen ausgewählt ist, verwende diesen
    // Sonst verwende den aktuell ausgewählten Standort oder den ersten verfügbaren
    const defaultLocation = selectedLocations.length === 1 
      ? selectedLocations[0] 
      : (locations.length === 1 ? locations[0]._id : (selectedLocation || locations[0]?._id || ''));
    setSelectedLocation(defaultLocation);
    setSelectedStaff('');
    setDialogMode('add');
    setActiveTab(0);
    setSelectedAppointment(null);
    setOpenEventDialog(true);
  };

  const handleOpenEditEventDialog = (appointment: CalendarAppointment) => {
    const apt = appointment.appointment;
    
    // Extract date and time from startTime
    let date = '';
    let time = '';
    if (apt.startTime) {
      try {
        const startDate = new Date(apt.startTime);
        if (!isNaN(startDate.getTime())) {
          date = startDate.toISOString().split('T')[0];
          time = startDate.toTimeString().split(' ')[0].substring(0, 5);
        }
      } catch (error) {
        console.warn('Error parsing startTime:', error);
      }
    }
    
    // Safely extract patientId - handle null/undefined cases
    let patientId = '';
    if (apt.patient) {
      if (typeof apt.patient === 'string') {
        patientId = apt.patient;
      } else if (typeof apt.patient === 'object' && apt.patient !== null) {
        patientId = (apt.patient as any)?._id || '';
      }
    }
    const patient = patientId ? patientMap.get(patientId) : null;
    
    // Extract service information
    let serviceId = '';
    let service: Service | undefined = undefined;
    
    // Check if service is in the appointment object (can be string ID or object)
    const aptService = (apt as any).service;
    if (aptService) {
      if (typeof aptService === 'string') {
        serviceId = aptService;
        service = services.find(s => s._id === serviceId);
      } else if (typeof aptService === 'object' && aptService !== null) {
        serviceId = aptService._id || '';
        service = services.find(s => s._id === serviceId) || aptService;
      }
    }
    
    // Also check if serviceId is in the appointment object directly
    if (!serviceId && (apt as any).serviceId) {
      serviceId = (apt as any).serviceId;
      service = services.find(s => s._id === serviceId);
    }
    
    // Konvertiere doctor zu string - handle null/undefined cases
    let doctorId = '';
    if (apt.doctor) {
      if (typeof apt.doctor === 'string') {
        doctorId = apt.doctor;
      } else if (typeof apt.doctor === 'object' && apt.doctor !== null) {
        doctorId = (apt.doctor as any)?._id || '';
      }
    }
    
    setFormData({
      patientId: patientId || '',
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : apt.title || '',
      patientPhone: patient?.phone || '',
      patientEmail: patient?.email || '',
      patient: patient || patientId || undefined,
      doctor: doctorId,
      date,
      time,
      duration: apt.duration || 30,
      type: apt.type || '',
      status: apt.status || 'geplant',
      room: apt.room || undefined,
      notes: apt.description || (apt as any).notes || '',
      symptoms: [],
      diagnosis: '',
      treatment: [],
      currentMedications: [],
      followUpRequired: false,
      serviceId: serviceId,
      service: service,
    });
    setSelectedAppointment(appointment);
    setPatientSearchValue(patient || null);
    setPatientSearchInput(patient ? `${patient.firstName} ${patient.lastName}` : '');
    setSelectedLocation(apt.locationId || '');
    setDialogMode('edit');
    setActiveTab(0);
    setOpenEventDialog(true);
  };

  const handleCloseEventDialog = () => {
    setOpenEventDialog(false);
    setSelectedAppointment(null);
    setFormData({
      patientId: '',
      patientName: '',
      patientPhone: '',
      patientEmail: '',
      doctor: '',
      date: '',
      time: '',
      duration: 30,
      type: '',
      status: 'geplant',
      room: undefined,
      notes: '',
      symptoms: [],
      diagnosis: '',
      treatment: [],
      currentMedications: [],
      followUpRequired: false,
      serviceId: '',
      service: undefined,
    });
    setPatientSearchValue(null);
    setPatientSearchInput('');
    setActiveTab(0);
  };
  
  const handleFormChange = (field: keyof AppointmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Load TimeBlocks
  const loadTimeBlocks = useCallback(async () => {
    try {
      const startDate = startOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
      const endDate = endOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
      
      const response = await api.get('/time-blocks', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      if (response.success && response.data) {
        // Backend gibt {success: true, data: Array, pagination: {...}} zurück
        // Frontend API-Client wrappt das in response.data, also ist das Array unter response.data.data
        const backendResponse = response.data as any;
        const blocks = Array.isArray(backendResponse?.data) 
          ? backendResponse.data 
          : Array.isArray(backendResponse) 
            ? backendResponse 
            : [];
        setTimeBlocks(blocks);
      }
    } catch (error) {
      console.error('Fehler beim Laden der TimeBlocks:', error);
    }
  }, [currentDate]);

  const loadLocationExceptions = useCallback(async () => {
    try {
      if (!selectedLocation || selectedLocation === 'all') {
        setLocationExceptions([]);
        return;
      }
      
      const startDate = startOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
      const endDate = endOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
      
      const response = await api.get('/locations/exceptions', {
        location_id: selectedLocation,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      
      if (response.success && response.data) {
        const exceptions = Array.isArray(response.data) ? response.data : [];
        setLocationExceptions(exceptions);
      } else {
        setLocationExceptions([]);
      }
    } catch (error) {
      console.error('Error loading location exceptions:', error);
    }
  }, [currentDate, selectedLocation]);
  
  // Load TimeBlocks and LocationExceptions when currentDate changes
  useEffect(() => {
    loadTimeBlocks();
    loadLocationExceptions();
  }, [loadTimeBlocks, loadLocationExceptions]);
  
  // Load LocationExceptions when selectedLocation changes
  useEffect(() => {
    loadLocationExceptions();
  }, [selectedLocation, loadLocationExceptions]);
  
  // Listen for location exception events to reload data
  useEffect(() => {
    const handleExceptionCreated = (exceptionData: any) => {
      console.log('📢 Received LOCATION_EXCEPTION_CREATED event:', exceptionData);
      console.log('📢 Current selectedLocation:', selectedLocation);
      // Always reload, regardless of location - the filtering will happen in the rendering
      console.log('📢 Reloading location exceptions after creation...');
      loadLocationExceptions();
    };
    const handleExceptionUpdated = (exceptionData: any) => {
      console.log('📢 Received LOCATION_EXCEPTION_UPDATED event:', exceptionData);
      console.log('📢 Current selectedLocation:', selectedLocation);
      // Always reload, regardless of location - the filtering will happen in the rendering
      console.log('📢 Reloading location exceptions after update...');
      loadLocationExceptions();
    };
    const handleExceptionDeleted = (exceptionId: any) => {
      console.log('📢 Received LOCATION_EXCEPTION_DELETED event:', exceptionId);
      // Always reload on delete, as we don't know which location it was for
      console.log('📢 Reloading location exceptions after deletion...');
      loadLocationExceptions();
    };
    
    eventBus.on(EVENTS.LOCATION_EXCEPTION_CREATED, handleExceptionCreated);
    eventBus.on(EVENTS.LOCATION_EXCEPTION_UPDATED, handleExceptionUpdated);
    eventBus.on(EVENTS.LOCATION_EXCEPTION_DELETED, handleExceptionDeleted);
    
    return () => {
      eventBus.off(EVENTS.LOCATION_EXCEPTION_CREATED, handleExceptionCreated);
      eventBus.off(EVENTS.LOCATION_EXCEPTION_UPDATED, handleExceptionUpdated);
      eventBus.off(EVENTS.LOCATION_EXCEPTION_DELETED, handleExceptionDeleted);
    };
  }, [loadLocationExceptions, selectedLocation]);
  
  // Handle Block Time
  const handleBlockTime = (start: Date, end: Date, staffId?: string) => {
    // Öffne Dialog für Namenseingabe
    const initialStaff = staffId || (selectedStaff || '');
    setPendingBlockTime({ start, end, staffId });
    setBlockName('');
    setSelectedBlockStaff(initialStaff);
    setBlockDialogOpen(true);
  };

  const handleConfirmBlockTime = async () => {
    if (!pendingBlockTime) return;
    
    try {
      const timeBlock = {
        startTime: pendingBlockTime.start.toISOString(),
        endTime: pendingBlockTime.end.toISOString(),
        staffId: selectedBlockStaff && selectedBlockStaff !== '' ? selectedBlockStaff : null, // Neues Feld für alle Berufsgruppen
        doctor: selectedBlockStaff && selectedBlockStaff !== '' ? selectedBlockStaff : null, // Rückwärtskompatibilität
        locationId: selectedLocation || undefined,
        reason: blockName.trim() || 'Manuelle Sperre',
        status: 'blocked'
      };
      
      const response = await api.post('/time-blocks', timeBlock);
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Zeitslot erfolgreich gesperrt',
          severity: 'success'
        });
        
        await loadTimeBlocks();
        dispatch(fetchAppointments());
        clearSelection();
        setBlockDialogOpen(false);
        setBlockName('');
        setSelectedBlockStaff('');
        setPendingBlockTime(null);
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Fehler beim Sperren des Zeitslots',
        severity: 'error'
      });
    }
  };

  // Handle Unblock Time
  const handleUnblockTime = async (timeBlockId: string) => {
    try {
      const confirmed = window.confirm('Möchten Sie diese Sperre wirklich aufheben?');
      
      if (!confirmed) {
        return;
      }
      
      const response = await api.delete(`/time-blocks/${timeBlockId}`);
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Sperre erfolgreich aufgehoben',
          severity: 'success'
        });
        
        await loadTimeBlocks();
        dispatch(fetchAppointments());
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Fehler beim Aufheben der Sperre',
        severity: 'error'
      });
    }
  };

  // Handle Merge TimeBlock
  const handleMergeTimeBlock = async (timeBlockId: string, mergeData: {
    patientId: string;
    serviceId?: string;
    title?: string;
    notes?: string;
  }) => {
    try {
      const response = await api.post(`/time-blocks/${timeBlockId}/merge`, mergeData);
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'TimeBlock erfolgreich mit Termin zusammengeführt',
          severity: 'success'
        });
        
        await loadTimeBlocks();
        dispatch(fetchAppointments());
        setMergeDialogOpen(false);
        setSelectedTimeBlock(null);
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Fehler beim Zusammenführen',
        severity: 'error'
      });
    }
  };
  
  // Handle LocationException
  const handleSaveException = async () => {
    try {
      // Verwende exceptionLocationId aus dem Dialog, falls gesetzt, sonst selectedLocation
      const locationIdToUse = exceptionLocationId || selectedLocation;
      
      if (!locationIdToUse || locationIdToUse === 'all') {
        setSnackbar({
          open: true,
          message: 'Bitte wählen Sie einen Standort aus',
          severity: 'warning'
        });
        return;
      }
      
      if (!exceptionFormData.date || !exceptionFormData.startTime || !exceptionFormData.endTime) {
        setSnackbar({
          open: true,
          message: 'Bitte füllen Sie alle erforderlichen Felder aus',
          severity: 'warning'
        });
        return;
      }
      
      const exceptionData = {
        date: exceptionFormData.date,
        startTime: exceptionFormData.startTime,
        endTime: exceptionFormData.endTime,
        breakStart: exceptionFormData.breakStart || undefined,
        breakEnd: exceptionFormData.breakEnd || undefined,
        label: exceptionFormData.label || 'Sonderöffnung',
        assignedStaff: exceptionFormData.assignedStaff && exceptionFormData.assignedStaff.length > 0 
          ? exceptionFormData.assignedStaff 
          : undefined
      };
      
      let response;
      if (selectedException) {
        // Update - verwende die Location-ID aus der Exception, falls vorhanden
        const updateLocationId = (selectedException.location_id && typeof selectedException.location_id === 'object' && selectedException.location_id !== null)
          ? selectedException.location_id._id || selectedException.location_id
          : selectedException.location_id || locationIdToUse;
        response = await api.put(`/locations/${updateLocationId}/exceptions/${selectedException._id}`, exceptionData);
      } else {
        // Create
        response = await api.post(`/locations/${locationIdToUse}/exceptions`, exceptionData);
      }
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: selectedException ? 'Ausnahme erfolgreich aktualisiert' : 'Sonderöffnung erfolgreich erstellt',
          severity: 'success'
        });
        
        await loadLocationExceptions();
        // Emit event to notify other components
        const eventData = (response.data as any)?.data || response.data;
        console.log('📢 Emitting location exception event:', selectedException ? EVENTS.LOCATION_EXCEPTION_UPDATED : EVENTS.LOCATION_EXCEPTION_CREATED, eventData);
        eventBus.emit(selectedException ? EVENTS.LOCATION_EXCEPTION_UPDATED : EVENTS.LOCATION_EXCEPTION_CREATED, eventData);
        setExceptionDialogOpen(false);
        setSelectedException(null);
        setExceptionLocationId('');
        setExceptionFormData({
          date: '',
          startTime: '08:00',
          endTime: '17:00',
          breakStart: '',
          breakEnd: '',
          label: 'Sonderöffnung',
          assignedStaff: []
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Speichern der Ausnahme';
      
      // Wenn die Exception bereits existiert, versuche sie zu laden und im Edit-Modus zu öffnen
      if (errorMessage.includes('existiert bereits')) {
        try {
          // Lade alle Exceptions für diese Location und dieses Datum
          const startDate = new Date(exceptionFormData.date);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(exceptionFormData.date);
          endDate.setHours(23, 59, 59, 999);
          
          const exceptionsResponse = await api.get('/locations/exceptions', {
            location_id: selectedLocation,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          });
          
          if (exceptionsResponse.success && exceptionsResponse.data) {
            // Die API gibt {success: true, data: [...]} zurück, aber api.js wrappt es in {data: {success: true, data: [...]}}
            // Daher müssen wir response.data.data verwenden, wenn response.data.data existiert, sonst response.data
            const responseData = exceptionsResponse.data as any;
            const data = (responseData && responseData.data) ? responseData.data : responseData;
            const exceptions = Array.isArray(data) ? data : [];
            
            console.log('🔍 Loading existing exception for edit mode:', {
              selectedLocation,
              date: exceptionFormData.date,
              foundExceptions: exceptions.length,
              exceptions: exceptions.map((exc: any) => ({
                _id: exc._id,
                date: exc.date ? format(new Date(exc.date), 'yyyy-MM-dd') : 'no date',
                location_id: typeof exc.location_id === 'object' && exc.location_id !== null
                  ? exc.location_id._id || exc.location_id
                  : exc.location_id
              }))
            });
            
            const existingException = exceptions.find((exc: any) => {
              const excDate = new Date(exc.date);
              return excDate.toDateString() === startDate.toDateString();
            });
            
            if (existingException) {
              console.log('✅ Found existing exception, opening in edit mode:', existingException);
              // Öffne Dialog im Edit-Modus
              const exceptionLocationId = typeof existingException.location_id === 'object' && existingException.location_id !== null
                ? existingException.location_id._id || existingException.location_id
                : existingException.location_id || selectedLocation;
              setSelectedException(existingException);
              setExceptionLocationId(exceptionLocationId || '');
              setExceptionFormData({
                date: format(new Date(existingException.date), 'yyyy-MM-dd'),
                startTime: existingException.startTime,
                endTime: existingException.endTime,
                breakStart: existingException.breakStart || '',
                breakEnd: existingException.breakEnd || '',
                label: existingException.label || 'Sonderöffnung',
                assignedStaff: existingException.assignedStaff ? 
                  existingException.assignedStaff.map((staff: any) => {
                    if (typeof staff === 'object' && staff !== null) {
                      return staff._id || staff;
                    }
                    return staff;
                  }) : []
              });
              setExceptionDialogOpen(true);
              setSnackbar({
                open: true,
                message: 'Eine Ausnahme für dieses Datum existiert bereits. Sie können sie jetzt bearbeiten.',
                severity: 'info'
              });
              return;
            } else {
              console.log('⚠️ No matching exception found in loaded exceptions');
            }
          }
        } catch (loadError) {
          console.error('Error loading existing exception:', loadError);
        }
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };
  
  const handleDeleteException = async (exceptionId: string, exception?: any) => {
    try {
      // Verwende die Location-ID aus der Exception, falls vorhanden, sonst die ausgewählte Location
      let locationId = selectedLocation;
      
      if (exception) {
        const exceptionLocationId = typeof exception.location_id === 'object' && exception.location_id !== null
          ? exception.location_id._id || exception.location_id
          : exception.location_id;
        if (exceptionLocationId) {
          locationId = exceptionLocationId;
        }
      }
      
      if (!locationId || locationId === 'all') {
        setSnackbar({
          open: true,
          message: 'Bitte wählen Sie einen Standort aus',
          severity: 'warning'
        });
        return;
      }
      
      const confirmed = window.confirm('Möchten Sie diese Sonderöffnung wirklich löschen?');
      if (!confirmed) {
        return;
      }
      
      const response = await api.delete(`/locations/${locationId}/exceptions/${exceptionId}`);
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Sonderöffnung erfolgreich gelöscht',
          severity: 'success'
        });
        
        await loadLocationExceptions();
        // Emit event to notify other components
        eventBus.emit(EVENTS.LOCATION_EXCEPTION_DELETED, exceptionId);
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Fehler beim Löschen der Ausnahme',
        severity: 'error'
      });
    }
  };
  
  // Get recent services
  const getRecentServices = (): string[] => {
    try {
      const recent = localStorage.getItem('recentServices');
      return recent ? JSON.parse(recent) : [];
    } catch {
      return [];
    }
  };

  const addToRecentServices = (serviceId: string) => {
    try {
      const recent = getRecentServices();
      const filtered = recent.filter((id: string) => id !== serviceId);
      const updated = [serviceId, ...filtered].slice(0, 10);
      localStorage.setItem('recentServices', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving recent service:', error);
    }
  };

  // Filter and sort services
  const getFilteredAndSortedServices = (): Service[] => {
    const activeServices = services.filter(service => {
      const isActive = service.is_active === true || 
                      (service as any).is_active === 'true' || 
                      (service as any).is_active === 1;
      return isActive;
    });
    const recentIds = getRecentServices();
    
    const favorites = activeServices.filter(s => {
      return s.quick_select === true || 
             (s as any).quick_select === 'true' || 
             (s as any).quick_select === 1;
    });
    const recent = activeServices.filter(s => {
      const isFavorite = s.quick_select === true || 
                        (s as any).quick_select === 'true' || 
                        (s as any).quick_select === 1;
      return !isFavorite && recentIds.includes(s._id);
    });
    const others = activeServices.filter(s => {
      const isFavorite = s.quick_select === true || 
                        (s as any).quick_select === 'true' || 
                        (s as any).quick_select === 1;
      return !isFavorite && !recentIds.includes(s._id);
    });
    
    // Filter by search input
    const searchLower = serviceSearchInput.toLowerCase();
    const filterServices = (serviceList: Service[]) => {
      if (!searchLower) return serviceList;
      return serviceList.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        s.code?.toLowerCase().includes(searchLower) ||
        s.description?.toLowerCase().includes(searchLower) ||
        s.category?.toLowerCase().includes(searchLower)
      );
    };
    
    return [
      ...filterServices(favorites),
      ...filterServices(recent),
      ...filterServices(others)
    ];
  };

  const handleSaveAppointment = async () => {
    if (dialogMode === 'add') {
      // Validate required fields
      if (!patientSearchValue || !formData.patientId) {
        setSnackbar({ open: true, message: 'Bitte wählen Sie einen Patienten aus', severity: 'warning' });
        return;
      }
      if (!formData.time) {
        setSnackbar({ open: true, message: 'Bitte geben Sie eine Uhrzeit an', severity: 'warning' });
        return;
      }
      if (!formData.serviceId) {
        setSnackbar({ open: true, message: 'Bitte wählen Sie eine Leistung aus', severity: 'warning' });
        return;
      }
      if (!selectedLocation) {
        setSnackbar({ open: true, message: 'Bitte wählen Sie einen Standort aus', severity: 'warning' });
        return;
      }

      // Create date/time fields
      const date = formData.date || new Date().toISOString().split('T')[0];
      const time = formData.time || '09:00';
      const startTime = `${date}T${time}:00`;
      const duration = formData.duration || 30;
      const [hours, minutes] = time.split(':').map(Number);
      const endDate = new Date(`${date}T${time}:00`);
      endDate.setMinutes(endDate.getMinutes() + duration);
      const endHours = endDate.getHours();
      const endMinutes = endDate.getMinutes();
      const endTime = `${date}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`;

      // Get assigned rooms, devices and staff from service
      const selectedService = services.find(s => s._id === formData.serviceId);
      const assignedRooms = selectedService?.assigned_rooms?.map((r: { _id: string }) => r._id || r) || [];
      
      // Geräte nur senden, wenn der Service eine Geräteauswahl erfordert
      // Ansonsten leeres Array senden, um Fehler zu vermeiden
      let assignedDevices: string[] = [];
      if (selectedService?.requires_device_selection && selectedService?.assigned_devices) {
        assignedDevices = selectedService.assigned_devices.map((d: { _id: string } | string) => {
          if (typeof d === 'string') return d;
          return d._id || String(d);
        });
        console.log('✅ Service requires device selection, sending devices:', assignedDevices);
      } else {
        console.log('⚠️ Service does not require device selection, sending empty array');
      }
      
      // Wenn ein Mitarbeiter ausgewählt wurde, verwende nur diesen
      // Ansonsten verwende alle zugewiesenen Benutzer aus dem Service
      let assignedUsers: string[] = [];
      if (selectedStaff) {
        // Nur den ausgewählten Mitarbeiter verwenden
        assignedUsers = [selectedStaff];
      } else {
        // Alle Service-Benutzer verwenden (falls kein Mitarbeiter ausgewählt wurde)
        assignedUsers = selectedService?.assigned_users?.map((u: { _id: string } | string) => {
          if (typeof u === 'string') return u;
          return u._id || String(u);
        }) || [];
      }

      const newAppointment = {
        title: formData.patientName || 'Termin',
        startTime,
        endTime,
        patient: formData.patientId,
        doctor: selectedStaff || undefined,
        type: 'consultation',
        notes: formData.notes || '',
        locationId: selectedLocation,
        service: selectedService?._id,
        assigned_rooms: assignedRooms,
        assigned_devices: assignedDevices.length > 0 ? assignedDevices : undefined,
        assigned_users: assignedUsers,
        room: formData.room ? (typeof formData.room === 'string' ? formData.room : (formData.room as any)?._id || formData.room) : undefined,
        status: formData.status || 'geplant',
        bookingType: 'internal' as 'online' | 'internal',
      };
      
      try {
        const result = await dispatch(createAppointment(newAppointment)).unwrap();
        setSnackbar({ open: true, message: 'Termin erfolgreich hinzugefügt', severity: 'success' });
        
        // Navigate to the week of the created appointment
        if (date) {
          const appointmentDate = new Date(date);
          if (!isNaN(appointmentDate.getTime())) {
            setCurrentDate(getCorrectWeekStart(appointmentDate));
          }
        }
        
        // Ensure the location is selected
        if (selectedLocation && !selectedLocations.includes(selectedLocation)) {
          setSelectedLocations(prev => [...prev, selectedLocation]);
        }
        
        // Refresh appointments
        await dispatch(fetchAppointments());
        handleCloseEventDialog();
      } catch (error: any) {
        console.error('Error saving appointment:', error);
        const errorMessage = typeof error === 'string' ? error : error?.message || 'Fehler beim Erstellen des Termins';
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      }
    } else if (dialogMode === 'edit' && selectedAppointment) {
      const date = formData.date || new Date().toISOString().split('T')[0];
      const time = formData.time || '09:00';
      const startTime = `${date}T${time}:00`;
      const duration = formData.duration || 30;
      const endDate = new Date(`${date}T${time}:00`);
      endDate.setMinutes(endDate.getMinutes() + duration);
      const endHours = endDate.getHours();
      const endMinutes = endDate.getMinutes();
      const endTime = `${date}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`;

      const updatedAppointment = {
        title: formData.patientName || 'Termin',
        startTime,
        endTime,
        patient: formData.patientId,
        type: formData.type || 'consultation',
        notes: formData.notes || '',
        locationId: selectedLocation || undefined,
      };

      try {
        await dispatch(updateAppointment({ id: selectedAppointment.id, ...updatedAppointment })).unwrap();
        setSnackbar({ open: true, message: 'Termin erfolgreich aktualisiert', severity: 'success' });
        dispatch(fetchAppointments());
        handleCloseEventDialog();
      } catch (error: any) {
        console.error('Error updating appointment:', error);
        setSnackbar({ open: true, message: 'Fehler beim Aktualisieren des Termins', severity: 'error' });
      }
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedAppointment) return;
    
    if (window.confirm('Möchten Sie diesen Termin wirklich löschen?')) {
      try {
        await dispatch(deleteAppointment(selectedAppointment.id)).unwrap();
        setSnackbar({ open: true, message: 'Termin erfolgreich gelöscht', severity: 'success' });
        dispatch(fetchAppointments());
        handleCloseEventDialog();
      } catch (error: any) {
        console.error('Error deleting appointment:', error);
        setSnackbar({ open: true, message: 'Fehler beim Löschen des Termins', severity: 'error' });
      }
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    
    if (window.confirm('Möchten Sie diesen Termin wirklich stornieren?')) {
      try {
        const updatedAppointment = {
          status: 'abgesagt',
        };
        await dispatch(updateAppointment({ id: selectedAppointment.id, ...updatedAppointment })).unwrap();
        setSnackbar({ open: true, message: 'Termin erfolgreich storniert', severity: 'success' });
        dispatch(fetchAppointments());
        handleCloseEventDialog();
      } catch (error: any) {
        console.error('Error canceling appointment:', error);
        setSnackbar({ open: true, message: 'Fehler beim Stornieren des Termins', severity: 'error' });
      }
    }
  };
  
  // Sync patientSearchValue with formData.patientId
  useEffect(() => {
    if (patientSearchValue?._id) {
      setFormData(prev => ({
        ...prev,
        patient: patientSearchValue as Patient,
        patientId: patientSearchValue._id || '',
        patientName: `${patientSearchValue.firstName} ${patientSearchValue.lastName}`,
        patientPhone: patientSearchValue.phone,
        patientEmail: patientSearchValue.email || '',
      }));
    }
  }, [patientSearchValue]);

  const handleAppointmentClick = (appointment: CalendarAppointment) => {
    // Open preview dialog in view mode
    handleOpenEditEventDialog(appointment);
    setDialogMode('view');
  };

  const handleNewPatient = () => {
    navigate('/patient-admission');
  };

  // Mini-Kalender Tage
  const monthStart = startOfMonth(currentDate);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  if (appointmentsLoading || locationsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      {/* Top Navigation Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1, sm: 2, md: 3 },
          py: { xs: 1, sm: 1.5 },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          gap: { xs: 1, sm: 0 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flex: { xs: '1 1 100%', sm: 'none' } }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600,
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}
          >
            Kalender
          </Typography>
          {!isMobile && (
            <Chip 
              label={`Warteliste ${waitingListCount || 0}`} 
              size="small" 
              sx={{ 
                bgcolor: 'error.main',
                color: 'error.contrastText',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'error.dark',
                }
              }}
              onClick={() => navigate('/waiting-list')}
            />
          )}
        </Box>

        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center', maxWidth: 400 }}>
            <TextField
              placeholder="Patienten suchen"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flexWrap: 'wrap' }}>
          {isMobile ? (
            <>
              <IconButton 
                size="small"
                onClick={() => setOpenSearchDialog(true)}
                sx={{ minWidth: '44px', minHeight: '44px' }}
                title="Suche"
              >
                <Search />
              </IconButton>
              <Button
                variant="contained"
                startIcon={<Add />}
                size="small"
                onClick={handleNewPatient}
                sx={{ 
                  bgcolor: 'primary.main',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  minHeight: { xs: '44px', sm: 'auto' },
                  px: { xs: 1, sm: 2 }
                }}
              >
                {isMobile ? 'Neu' : 'Neuer Patient'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<Schedule />}
                size="small"
                onClick={() => navigate('/service-demo-calendar')}
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.dark',
                    bgcolor: 'primary.light',
                    color: 'primary.dark'
                  }
                }}
              >
                Dienstkalender
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                size="small"
                onClick={handleNewPatient}
                sx={{ bgcolor: 'primary.main' }}
              >
                Neuer Patient
              </Button>
              <IconButton 
                size="small"
                onClick={() => setOpenTaskDialog(true)}
                title="Aufgabe erstellen"
              >
                <CheckBox />
              </IconButton>
              <IconButton 
                size="small"
                onClick={() => navigate('/internal-messages')}
                title="Interne Nachrichten"
              >
                <Mail />
              </IconButton>
              <IconButton 
                size="small"
                onClick={() => navigate('/billing')}
                title="Rechnungen"
              >
                <Euro />
              </IconButton>
            </>
          )}
        </Box>
      </Box>

      {/* Calendar Controls */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1, sm: 2, md: 3 },
          py: { xs: 1, sm: 1.5 },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          gap: { xs: 1, sm: 0 }
        }}
      >
        {viewMode === 'month' ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: { xs: '1 1 100%', sm: 'none' } }}>
            <FormControl size="small" sx={{ minWidth: { xs: 120, sm: 150 }, flex: { xs: 1, sm: 'none' } }}>
              <Select
                value={currentDate.getMonth()}
                onChange={(e) => {
                  const newMonth = e.target.value as number;
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newMonth);
                  setCurrentDate(newDate);
                }}
                sx={{ fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((month) => (
                  <MenuItem key={month} value={month} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    {format(new Date(2000, month, 1), 'MMMM', { locale: de })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: 80, sm: 100 }, flex: { xs: 1, sm: 'none' } }}>
              <Select
                value={currentDate.getFullYear()}
                onChange={(e) => {
                  const newYear = e.target.value as number;
                  const newDate = new Date(currentDate);
                  newDate.setFullYear(newYear);
                  setCurrentDate(newDate);
                }}
                sx={{ fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - 5 + i;
                  return (
                    <MenuItem key={year} value={year} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      {year}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Box>
        ) : (
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 500,
              fontSize: { xs: '1rem', sm: '1.25rem' },
              flex: { xs: '1 1 100%', sm: 'none' }
            }}
          >
            {viewMode === 'week' && `KW ${format(currentDate, 'w', { locale: de })} ${format(currentDate, 'yyyy', { locale: de })}`}
            {viewMode === 'day' && format(currentDate, 'dd. MMMM yyyy', { locale: de })}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flexWrap: 'wrap' }}>
          <Button
            variant={viewMode === 'day' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setViewMode('day')}
            sx={{ 
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minHeight: { xs: '36px', sm: 'auto' },
              px: { xs: 1, sm: 2 }
            }}
          >
            Tag
          </Button>
          <Button
            variant={viewMode === 'week' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setViewMode('week')}
            sx={{ 
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minHeight: { xs: '36px', sm: 'auto' },
              px: { xs: 1, sm: 2 }
            }}
          >
            Woche
          </Button>
          <Button
            variant={viewMode === 'month' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setViewMode('month')}
            sx={{ 
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minHeight: { xs: '36px', sm: 'auto' },
              px: { xs: 1, sm: 2 }
            }}
          >
            Monat
          </Button>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-end' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
            <IconButton 
              size="small" 
              onClick={() => handleDateNavigation('prev')}
              sx={{ minWidth: { xs: '44px', sm: 'auto' }, minHeight: { xs: '44px', sm: 'auto' } }}
            >
              <ArrowBackIos fontSize={isMobile ? 'medium' : 'small'} />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleDateNavigation('next')}
              sx={{ minWidth: { xs: '44px', sm: 'auto' }, minHeight: { xs: '44px', sm: 'auto' } }}
            >
              <ArrowForwardIos fontSize={isMobile ? 'medium' : 'small'} />
            </IconButton>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Today />}
              onClick={() => handleDateNavigation('today')}
              sx={{ 
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                minHeight: { xs: '44px', sm: 'auto' },
                px: { xs: 1, sm: 2 }
              }}
            >
              {isMobile ? 'Heute' : 'Heute'}
            </Button>
          </Box>
          {!isMobile && (
            <>
              <IconButton 
                size="small"
                onClick={() => setOpenSearchDialog(true)}
                title="Erweiterte Suche"
              >
                <Search />
              </IconButton>
              <Button
                variant="contained"
                size="small"
                startIcon={<Add />}
                onClick={() => handleOpenNewEventDialog()}
                sx={{ bgcolor: 'primary.main' }}
              >
                Neuer Termin
              </Button>
              <IconButton size="small">
                <MoreVert />
              </IconButton>
            </>
          )}
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <Box
          sx={{
            width: { xs: 0, sm: 280 },
            bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#1e3a5f',
            color: theme.palette.mode === 'dark' ? 'text.primary' : 'white',
            display: { xs: 'none', sm: 'flex' },
            flexDirection: 'column',
            overflow: 'auto',
            borderRight: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Kalender Section */}
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Kalender
            </Typography>
            {locations.map((location) => (
              <FormControlLabel
                key={location._id}
                control={
                  <Checkbox
                    checked={selectedLocations.includes(location._id)}
                    onChange={() => handleLocationToggle(location._id)}
                    sx={{
                      color: location.color_hex || '#ffc107',
                      '&.Mui-checked': { color: location.color_hex || '#ffc107' },
                    }}
                  />
                }
                label={location.name}
                sx={{ color: theme.palette.mode === 'dark' ? 'text.primary' : 'white', mb: 1, display: 'block' }}
              />
            ))}
          </Box>

          <Divider sx={{ borderColor: theme.palette.mode === 'dark' ? 'divider' : 'rgba(255,255,255,0.2)' }} />

          {/* Mini-Kalender */}
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {format(currentDate, 'MMMM yy', { locale: de })}
              </Typography>
              <Button size="small" sx={{ color: theme.palette.mode === 'dark' ? 'text.primary' : 'white', textTransform: 'none' }} onClick={() => handleDateNavigation('today')}>
                Heute
              </Button>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 1 }}>
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                <Typography
                  key={day}
                  variant="caption"
                  sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}
                >
                  {day}.
                </Typography>
              ))}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
              {calendarDays.map((day) => {
                const isCurrentDay = isSameDay(day, new Date());
                const isSelected = displayedDays.some(displayedDay => isSameDay(day, displayedDay));
                return (
                  <Box
                    key={day.toISOString()}
                    onClick={() => {
                      if (viewMode === 'month') {
                        setCurrentDate(day);
                      } else if (viewMode === 'week') {
                        setCurrentDate(getCorrectWeekStart(day));
                      } else {
                        setCurrentDate(day);
                      }
                    }}
                    sx={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                      bgcolor: isCurrentDay
                        ? '#ff9800'
                        : isSelected
                        ? 'rgba(255,255,255,0.2)'
                        : 'transparent',
                      color: isCurrentDay ? 'white' : (theme.palette.mode === 'dark' ? 'text.primary' : 'white'),
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    {format(day, 'd')}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>

        {/* Mobile Sidebar Drawer */}
        <Drawer
          anchor="left"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          PaperProps={{
            sx: {
              width: 280,
              bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#1e3a5f',
              color: theme.palette.mode === 'dark' ? 'text.primary' : 'white',
            }
          }}
        >
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Filter & Einstellungen
              </Typography>
              <IconButton 
                onClick={() => setSidebarOpen(false)}
                sx={{ color: 'inherit' }}
                size="small"
              >
                <Close />
              </IconButton>
            </Box>
            
            {/* Kalender Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Kalender
              </Typography>
              {locations.map((location) => (
                <FormControlLabel
                  key={location._id}
                  control={
                    <Checkbox
                      checked={selectedLocations.includes(location._id)}
                      onChange={() => handleLocationToggle(location._id)}
                      sx={{
                        color: location.color_hex || '#ffc107',
                        '&.Mui-checked': { color: location.color_hex || '#ffc107' },
                      }}
                    />
                  }
                  label={location.name}
                  sx={{ color: theme.palette.mode === 'dark' ? 'text.primary' : 'white', mb: 1, display: 'block' }}
                />
              ))}
            </Box>

            <Divider sx={{ borderColor: theme.palette.mode === 'dark' ? 'divider' : 'rgba(255,255,255,0.2)', mb: 3 }} />

            {/* Mini-Kalender */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {format(currentDate, 'MMMM yy', { locale: de })}
                </Typography>
                <Button size="small" sx={{ color: theme.palette.mode === 'dark' ? 'text.primary' : 'white', textTransform: 'none' }} onClick={() => handleDateNavigation('today')}>
                  Heute
                </Button>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 1 }}>
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                  <Typography
                    key={day}
                    variant="caption"
                    sx={{ textAlign: 'center', color: theme.palette.mode === 'dark' ? 'text.secondary' : 'rgba(255,255,255,0.7)' }}
                  >
                    {day}.
                  </Typography>
                ))}
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                {calendarDays.map((day) => {
                  const isCurrentDay = isSameDay(day, new Date());
                  const isSelected = displayedDays.some(displayedDay => isSameDay(day, displayedDay));
                  return (
                    <Box
                      key={day.toISOString()}
                      onClick={() => {
                        if (viewMode === 'month') {
                          setCurrentDate(day);
                        } else if (viewMode === 'week') {
                          setCurrentDate(getCorrectWeekStart(day));
                        } else {
                          setCurrentDate(day);
                        }
                        setSidebarOpen(false);
                      }}
                      sx={{
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 1,
                        bgcolor: isCurrentDay
                          ? '#ff9800'
                          : isSelected
                          ? 'rgba(255,255,255,0.2)'
                          : 'transparent',
                        color: isCurrentDay ? 'white' : (theme.palette.mode === 'dark' ? 'text.primary' : 'white'),
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                      }}
                    >
                      {format(day, 'd')}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        </Drawer>

        {/* Main Calendar Grid */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'auto', 
          bgcolor: 'background.default',
          width: '100%',
          minWidth: 0
        }}>
          {/* Day Headers */}
          <Box sx={{ 
            display: 'flex', 
            borderBottom: '2px solid', 
            borderColor: 'divider',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            bgcolor: 'background.paper'
          }}>
            {!isMobile && <Box sx={{ width: 80, p: 1, flexShrink: 0 }} />} {/* Time column spacer - nur auf Desktop */}
            {viewMode === 'month' ? (
              // Monatsansicht: Alle 7 Wochentage
              Array.from({ length: 7 }, (_, i) => {
                const day = addDays(startOfWeek(currentDate, { locale: de, weekStartsOn: 1 }), i);
                return (
                  <Box
                    key={i}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      p: { xs: 0.5, sm: 1 },
                      textAlign: 'center',
                      borderLeft: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      flexShrink: 0
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 600, 
                        color: 'text.primary',
                        fontSize: { xs: '0.7rem', sm: '0.875rem' },
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {format(day, 'EEE', { locale: de })}
                    </Typography>
                  </Box>
                );
              })
            ) : (
              // Tag- und Woche-Ansicht: Nur angezeigte Tage
              <>
                {displayedDays.map((day) => (
                  <Box
                    key={day.toISOString()}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      p: { xs: 0.5, sm: 1 },
                      textAlign: 'center',
                      borderLeft: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      flexShrink: 0
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 600, 
                        color: 'text.primary',
                        fontSize: { xs: '0.7rem', sm: '0.875rem' },
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {format(day, 'EEE', { locale: de })} {format(day, 'd.')}
                    </Typography>
                  </Box>
                ))}
              </>
            )}
          </Box>

          {/* Time Grid */}
          <Box sx={{ display: 'flex', flex: 1, position: 'relative' }}>
            {/* Time Scale - nur auf Desktop */}
            {!isMobile && (
              <Box sx={{ width: 80, borderRight: '1px solid', borderColor: 'divider' }}>
                {timeSlots.map((time) => (
                  <Box
                    key={time}
                    sx={{
                      height: 40,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-end',
                      pr: 1,
                      pt: 0.5,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                      {time}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {/* Calendar Columns */}
            {viewMode === 'month' ? (
              // Monatsansicht: Grid-Layout ohne Zeitslots
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: 'repeat(7, 1fr)', sm: 'repeat(7, 1fr)' }, 
                flex: 1, 
                overflow: 'auto',
                gap: { xs: 0.5, sm: 0 }
              }}>
                {displayedDays.map((day) => {
                  const dayAppointments = getAppointmentsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  return (
                    <Box
                      key={day.toISOString()}
                      onClick={() => {
                        setCurrentDate(day);
                        setViewMode('day');
                      }}
                      sx={{
                        minHeight: { xs: 80, sm: 100 },
                        borderLeft: '1px solid',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        p: { xs: 0.25, sm: 0.5 },
                        bgcolor: isCurrentMonth ? 'background.paper' : 'action.hover',
                        cursor: 'pointer',
                        position: 'relative',
                        '&:hover': { bgcolor: 'action.selected' },
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontWeight: isSameDay(day, new Date()) ? 700 : 500,
                          color: isSameDay(day, new Date()) ? 'primary.main' : isCurrentMonth ? 'text.primary' : 'text.secondary',
                        }}
                      >
                        {format(day, 'd')}
                      </Typography>
                      <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {dayAppointments.slice(0, 3).map((appointment) => (
                          <Paper
                            key={appointment.id}
                            elevation={1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAppointmentClick(appointment);
                            }}
                            sx={{
                              bgcolor: appointment.color,
                              color: 'white',
                              p: 0.5,
                              fontSize: '0.65rem',
                              cursor: 'pointer',
                              position: 'relative',
                              '&:hover': { opacity: 0.9 },
                            }}
                          >
                            {/* Online-Badge oben rechts */}
                            {(() => {
                              const apt = appointment.appointment;
                              const isOnline = apt?.bookingType === 'online' || apt?.onlineBookingRef;
                              if (!isOnline) return null;
                              return (
                                <Chip
                                  label="Online"
                                  size="small"
                                  sx={{
                                    position: 'absolute',
                                    top: 2,
                                    right: 2,
                                    height: 16,
                                    fontSize: '0.6rem',
                                    fontWeight: 600,
                                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                                    color: 'primary.main',
                                    zIndex: 1,
                                    '& .MuiChip-label': {
                                      px: 0.5,
                                    },
                                  }}
                                />
                              );
                            })()}
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, display: 'block', mb: 0.25 }}>
                              {format(appointment.start, 'HH:mm')} {appointment.patientName}
                            </Typography>
                            {(() => {
                              const apt = appointment.appointment;
                              const patient = apt?.patient;
                              let patientId: string | null = null;
                              let patientObj: any = null;
                              
                              if (patient) {
                                if (typeof patient === 'string') {
                                  patientId = patient;
                                } else if (typeof patient === 'object' && patient !== null) {
                                  patientId = (patient as any)._id || (patient as any).id || null;
                                  patientObj = patient;
                                }
                              }
                              
                              // Finde Hauptdiagnose - auch wenn status nicht 'active' ist, solange isPrimary true ist
                              const diagnoses = patientId ? patientDiagnoses.filter((d: PatientDiagnosis) => d.patientId === patientId) : [];
                              // Suche zuerst nach aktiver Hauptdiagnose, dann nach jeder Hauptdiagnose
                              let primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary && d.status === 'active');
                              if (!primaryDiagnosis) {
                                primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary);
                              }
                              
                              // Debug-Logging
                              if (patientId && diagnoses.length > 0) {
                                console.log('DemoCalendar - Patient Diagnosen:', {
                                  patientId,
                                  totalDiagnoses: diagnoses.length,
                                  primaryDiagnoses: diagnoses.filter(d => d.isPrimary).length,
                                  activePrimary: diagnoses.filter(d => d.isPrimary && d.status === 'active').length,
                                  foundPrimary: !!primaryDiagnosis,
                                  primaryCode: primaryDiagnosis?.code
                                });
                              }
                              
                              // Prüfe Allergien
                              const hasAllergies = patientObj && patientObj.allergies && Array.isArray(patientObj.allergies) && patientObj.allergies.length > 0;
                              
                              if (!hasAllergies && !primaryDiagnosis) return null;
                              
                              return (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.25 }}>
                                  {hasAllergies && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.55rem' }}>
                                      <Warning sx={{ fontSize: '0.6rem' }} />
                                      <Typography variant="caption" sx={{ fontSize: '0.55rem' }}>Allergien</Typography>
                                    </Box>
                                  )}
                                  {primaryDiagnosis && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.55rem' }}>
                                      <CheckCircle sx={{ fontSize: '0.6rem' }} />
                                      <Typography variant="caption" sx={{ fontSize: '0.55rem' }}>{primaryDiagnosis.display || primaryDiagnosis.code}</Typography>
                                    </Box>
                                  )}
                                </Box>
                              );
                            })()}
                          </Paper>
                        ))}
                        {dayAppointments.length > 3 && (
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', mt: 0.5 }}>
                            +{dayAppointments.length - 3} weitere
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              // Tag- und Woche-Ansicht: Zeitslots mit Terminen
              displayedDays.map((day) => (
                <Box
                  key={day.toISOString()}
                  sx={{
                    flex: 1,
                    borderLeft: '1px solid',
                    borderColor: 'divider',
                    position: 'relative',
                  }}
                  onContextMenu={(e) => {
                    // Context-Menü für Tag-Header (Sonderöffnung setzen)
                    e.preventDefault();
                    e.stopPropagation();
                    if (selectedLocation && selectedLocation !== 'all') {
                      setContextMenuAnchor({
                        x: e.clientX,
                        y: e.clientY,
                        day: day
                      });
                    }
                  }}
                >
                  {timeSlots.map((time, index) => {
                    const isInSelection = isSlotInSelection(day, time);
                    
                    return (
                      <Box
                        key={time}
                        onClick={(e) => {
                          if (!isSelecting) {
                            // Wenn eine Markierung existiert und man auf einen nicht-markierten Slot klickt, entferne die Markierung
                            if ((selectionStart || selectionEnd) && !isInSelection) {
                              e.preventDefault();
                              e.stopPropagation();
                              clearSelection();
                              return;
                            }
                            // Ansonsten öffne den Dialog für neue Termine
                            const [hour, minute] = time.split(':').map(Number);
                            const slotDate = new Date(day);
                            slotDate.setHours(hour, minute, 0, 0);
                            handleOpenNewEventDialog(slotDate, hour);
                          }
                        }}
                        onMouseDown={(e) => {
                          if (e.button === 0) { // Nur linke Maustaste
                            e.preventDefault();
                            startSelection(day, time);
                          }
                        }}
                        onMouseMove={(e) => {
                          if (isSelecting) {
                            updateSelection(day, time);
                          }
                        }}
                        onMouseUp={(e) => {
                          if (e.button === 0 && isSelecting) {
                            endSelection();
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation(); // Verhindere Event-Bubbling zum Tag-Header
                          if (selectionStart && selectionEnd) {
                            const range = getSelectionRange();
                            if (range) {
                              // Übergebe selectedStaff als staffId, wenn eine Person ausgewählt ist
                              const staffIdForBlock = selectedStaff && selectedStaff !== 'all' ? selectedStaff : undefined;
                              setContextMenuAnchor({
                                x: e.clientX,
                                y: e.clientY,
                                start: range.start,
                                end: range.end,
                                staffId: staffIdForBlock
                              });
                            }
                          } else {
                            // Wenn keine Auswahl vorhanden ist, zeige kein Context-Menü
                            setContextMenuAnchor(null);
                          }
                        }}
                        sx={{
                          height: 40,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          cursor: isSelecting ? 'crosshair' : 'pointer',
                          bgcolor: isInSelection ? 'rgba(25, 118, 210, 0.2)' : 'transparent',
                          borderLeft: isInSelection ? '3px solid #1976d2' : 'none',
                          '&:hover': { 
                            bgcolor: isSelecting 
                              ? 'rgba(25, 118, 210, 0.3)' 
                              : isInSelection 
                                ? 'rgba(25, 118, 210, 0.25)' 
                                : 'action.hover' 
                          },
                        }}
                      />
                    );
                  })}

                  {/* TimeBlocks */}
                  {/* WICHTIG: Zusammengeführte TimeBlocks (status='merged') werden NICHT mehr als TimeBlocks angezeigt, 
                      da sie bereits als normale Appointments erscheinen */}
                  {(() => {
                    const filteredBlocks = timeBlocks.filter((block: any) => {
                      const blockDate = new Date(block.startTime);
                      const isSameDayResult = isSameDay(blockDate, day);
                      
                      if (!isSameDayResult) return false;
                      
                      // Nur blocked TimeBlocks anzeigen (zusammengeführte werden nicht mehr angezeigt)
                      if (block.status !== 'blocked') {
                        return false;
                      }
                      
                      // Filter nach Personal: Wenn eine Person ausgewählt ist, zeige nur TimeBlocks für diese Person oder TimeBlocks ohne Personal (für alle)
                      // WICHTIG: Wenn ein TimeBlock ein staffId-Feld hat (nicht null/undefined), soll es NUR bei dieser Person angezeigt werden
                      // TimeBlocks ohne staffId (null/undefined) werden bei allen angezeigt
                      // Unterstütze sowohl staffId als auch doctor (für Rückwärtskompatibilität)
                      const blockStaffId = block.staffId?._id || block.staffId || block.doctor?._id || block.doctor || null;
                      if (blockStaffId) {
                        // TimeBlock hat ein Personal zugewiesen - zeige nur bei dieser Person
                        // Wenn selectedStaff gesetzt ist, zeige nur wenn es übereinstimmt
                        if (selectedStaff && selectedStaff !== 'all') {
                          if (String(blockStaffId) !== String(selectedStaff)) {
                            return false;
                          }
                        }
                        // Wenn keine Person ausgewählt ist (selectedStaff === 'all' oder leer), 
                        // zeige TimeBlocks mit Personal trotzdem (für Übersicht)
                      }
                      // Wenn blockStaffId null/undefined ist, wird der Block bei allen angezeigt (korrekt)
                      
                      // Filter nach Location wenn vorhanden
                      if (selectedLocation && block.locationId) {
                        // block.locationId kann ein Objekt ({_id, name, code}) oder ein String sein
                        const blockLocationId = typeof block.locationId === 'object' && block.locationId !== null
                          ? block.locationId._id || block.locationId
                          : block.locationId;
                        const locationMatch = String(blockLocationId) === String(selectedLocation);
                        if (!locationMatch) {
                        }
                        return locationMatch;
                      }
                      // Wenn eine Location ausgewählt ist, verstecke TimeBlocks ohne Location
                      if (selectedLocation && !block.locationId) {
                        return false;
                      }
                      
                      return true;
                    });
                    
                    if (filteredBlocks.length > 0) {
                    }
                    
                    return filteredBlocks.map((block: any) => {
                      const blockStart = new Date(block.startTime);
                      const blockEnd = new Date(block.endTime);
                      const startMinutes = blockStart.getHours() * 60 + blockStart.getMinutes();
                      const endMinutes = blockEnd.getHours() * 60 + blockEnd.getMinutes();
                      const duration = endMinutes - startMinutes;
                      
                      // Basis: 6:00 = 0, jede halbe Stunde = 40px (gleiche Logik wie getAppointmentPosition)
                      // Stelle sicher, dass die Zeit im lokalen Format verwendet wird
                      const localStartMinutes = blockStart.getHours() * 60 + blockStart.getMinutes();
                      const localEndMinutes = blockEnd.getHours() * 60 + blockEnd.getMinutes();
                      const localDuration = localEndMinutes - localStartMinutes;
                      
                      const top = Math.max(0, ((localStartMinutes - 360) / 30) * 40); // 360 = 6:00 in Minuten, min 0
                      const height = Math.max((localDuration / 30) * 40, 40); // Minimum 40px
                      
                      return (
                        <Box
                          key={block._id}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (block.status === 'blocked') {
                              setContextMenuAnchor({
                                x: e.clientX,
                                y: e.clientY,
                                timeBlock: block
                              });
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (block.status === 'blocked') {
                              setSelectedTimeBlock(block);
                              setMergeDialogOpen(true);
                            } else if (block.mergedAppointmentId) {
                              navigate(`/appointments/${block.mergedAppointmentId}`);
                            }
                          }}
                          sx={{
                            position: 'absolute',
                            left: 4,
                            right: 4,
                            top: `${Math.max(0, top)}px`, // Stelle sicher, dass top nicht negativ ist
                            height: `${height}px`,
                            minHeight: '40px',
                            bgcolor: block.status === 'merged' 
                              ? 'rgba(76, 175, 80, 0.7)'
                              : 'rgba(244, 67, 54, 0.7)',
                            border: `3px solid ${block.status === 'merged' ? '#4caf50' : '#f44336'}`,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 10, // Höherer z-index, damit TimeBlocks über Zeitslots angezeigt werden
                            pointerEvents: 'auto', // Stelle sicher, dass Klicks funktionieren
                            '&:hover': {
                              bgcolor: block.status === 'merged' 
                                ? 'rgba(76, 175, 80, 0.5)'
                                : 'rgba(244, 67, 54, 0.5)',
                              boxShadow: 2
                            }
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                            {block.status === 'merged' ? 'Zusammengeführt' : 'Gesperrt'}
                          </Typography>
                          {block.reason && (
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                              {block.reason}
                            </Typography>
                          )}
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                            {format(blockStart, 'HH:mm')} - {format(blockEnd, 'HH:mm')}
                          </Typography>
                        </Box>
                      );
                    });
                  })()}

                  {/* LocationExceptions (Sonderöffnungen) */}
                  {locationExceptions
                    .filter((exception: any) => {
                      if (!selectedLocation || selectedLocation === 'all') {
                        return false;
                      }
                      
                      const exceptionDate = new Date(exception.date);
                      const isSameDayResult = isSameDay(exceptionDate, day);
                      
                      if (!isSameDayResult) return false;
                      
                      // Prüfe ob Exception für den ausgewählten Standort ist
                      const exceptionLocationId = typeof exception.location_id === 'object' && exception.location_id !== null
                        ? exception.location_id._id || exception.location_id
                        : exception.location_id;
                      
                      if (String(exceptionLocationId) !== String(selectedLocation)) {
                        return false;
                      }
                      
                      const isActive = exception.isActive !== false;
                      if (!isActive) {
                        return false;
                      }
                      
                      // Prüfe ob Exception für die ausgewählte Person gilt (assignedStaff)
                      const hasAssignedStaff = exception.assignedStaff && Array.isArray(exception.assignedStaff) && exception.assignedStaff.length > 0;
                      if (hasAssignedStaff) {
                        // Exception gilt nur für bestimmte Personen
                        const assignedStaffIds = exception.assignedStaff.map((staff: any) => {
                          // assignedStaff kann User-IDs als Strings oder als Objekte sein
                          if (typeof staff === 'string') {
                            return staff;
                          }
                          if (typeof staff === 'object' && staff !== null) {
                            return staff._id || staff;
                          }
                          return null;
                        }).filter((id: string | null) => id !== null);
                        
                        // Wenn eine Person ausgewählt ist, prüfe ob sie in assignedStaffIds ist
                        if (selectedStaff && selectedStaff !== 'all') {
                          if (!assignedStaffIds.includes(selectedStaff.toString())) {
                            return false; // Exception gilt nicht für die ausgewählte Person
                          }
                        }
                        // Wenn keine Person ausgewählt ist (selectedStaff === 'all' oder leer),
                        // zeige Exception nur wenn sie für alle gilt (aber assignedStaff ist nicht leer, also nicht anzeigen)
                        // Eigentlich sollten wir sie nicht anzeigen, wenn assignedStaff vorhanden ist und keine Person ausgewählt ist
                        // Aber für Übersicht zeigen wir sie trotzdem, wenn selectedStaff === 'all'
                        // Wenn selectedStaff leer ist, zeigen wir sie nicht
                        if (!selectedStaff || selectedStaff === '') {
                          return false; // Keine Person ausgewählt, aber Exception ist personenspezifisch
                        }
                      }
                      // Wenn assignedStaff leer ist, gilt die Exception für alle Personen
                      
                      return true;
                    })
                    .map((exception: any) => {
                      const exceptionDate = new Date(exception.date);
                      const [startHours, startMinutes] = exception.startTime.split(':').map(Number);
                      const [endHours, endMinutes] = exception.endTime.split(':').map(Number);
                      
                      const startTime = new Date(exceptionDate);
                      startTime.setHours(startHours, startMinutes, 0, 0);
                      
                      const endTime = new Date(exceptionDate);
                      endTime.setHours(endHours, endMinutes, 0, 0);
                      
                      const startTotalMinutes = startHours * 60 + startMinutes;
                      const endTotalMinutes = endHours * 60 + endMinutes;
                      const duration = endTotalMinutes - startTotalMinutes;
                      
                      // Positionierung: 6:00 = 0px, jede 30min = 40px
                      const top = Math.max(0, ((startTotalMinutes - 360) / 30) * 40);
                      const height = Math.max(40, (duration / 30) * 40);
                      
                      // Nur rendern wenn im sichtbaren Bereich
                      if (top >= timeSlots.length * 40 || top + height <= 0) {
                        return null;
                      }
                      
                      return (
                        <Tooltip
                          key={exception._id}
                          title={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                {exception.label || 'Sonderöffnung'}
                              </Typography>
                              <Typography variant="caption" display="block">
                                {exception.startTime} - {exception.endTime}
                              </Typography>
                              {exception.breakStart && exception.breakEnd && (
                                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                  Pause: {exception.breakStart} - {exception.breakEnd}
                                </Typography>
                              )}
                            </Box>
                          }
                          arrow
                        >
                          <Box
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const exceptionLocationId = typeof exception.location_id === 'object' && exception.location_id !== null
                                ? exception.location_id._id || exception.location_id
                                : exception.location_id || selectedLocation;
                              setSelectedException(exception);
                              setExceptionLocationId(exceptionLocationId || '');
                              setExceptionFormData({
                                date: format(exceptionDate, 'yyyy-MM-dd'),
                                startTime: exception.startTime,
                                endTime: exception.endTime,
                                breakStart: exception.breakStart || '',
                                breakEnd: exception.breakEnd || '',
                                label: exception.label || 'Sonderöffnung',
                                assignedStaff: exception.assignedStaff ? 
                                  exception.assignedStaff.map((staff: any) => {
                                    if (typeof staff === 'object' && staff !== null) {
                                      return staff._id || staff;
                                    }
                                    return staff;
                                  }) : []
                              });
                              setExceptionDialogOpen(true);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const exceptionLocationId = typeof exception.location_id === 'object' && exception.location_id !== null
                                ? exception.location_id._id || exception.location_id
                                : exception.location_id || selectedLocation;
                              setSelectedException(exception);
                              setExceptionLocationId(exceptionLocationId || '');
                              setExceptionFormData({
                                date: format(exceptionDate, 'yyyy-MM-dd'),
                                startTime: exception.startTime,
                                endTime: exception.endTime,
                                breakStart: exception.breakStart || '',
                                breakEnd: exception.breakEnd || '',
                                label: exception.label || 'Sonderöffnung',
                                assignedStaff: exception.assignedStaff ? 
                                  exception.assignedStaff.map((staff: any) => {
                                    if (typeof staff === 'object' && staff !== null) {
                                      return staff._id || staff;
                                    }
                                    return staff;
                                  }) : []
                              });
                              setExceptionDialogOpen(true);
                            }}
                            sx={{
                              position: 'absolute',
                              left: 4,
                              right: 4,
                              top: `${Math.max(0, top)}px`,
                              height: `${height}px`,
                              minHeight: '40px',
                              bgcolor: 'rgba(33, 150, 243, 0.7)', // Blau für Sonderöffnungen
                              border: '3px solid #2196f3',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              zIndex: 9, // Unter TimeBlocks, aber über Zeitslots
                              pointerEvents: 'auto',
                              '&:hover': {
                                bgcolor: 'rgba(33, 150, 243, 0.5)',
                                boxShadow: 2
                              }
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                              {exception.label || 'Sonderöffnung'}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                              {exception.startTime} - {exception.endTime}
                            </Typography>
                          </Box>
                        </Tooltip>
                      );
                    })}

                  {/* Appointments */}
                  {getAppointmentsForDay(day).map((appointment) => {
                    const { top, height } = getAppointmentPosition(appointment);
                    
                    // Sammle Informationen für Tooltip
                    const apt = appointment.appointment;
                    const patient = apt?.patient;
                    let patientId: string | null = null;
                    let patientObj: any = null;
                    
                    if (patient) {
                      if (typeof patient === 'string') {
                        patientId = patient;
                      } else if (typeof patient === 'object' && patient !== null) {
                        patientId = (patient as any)._id || (patient as any).id || null;
                        patientObj = patient;
                      }
                    }
                    
                    // Finde Hauptdiagnose
                    const diagnoses = patientId ? patientDiagnoses.filter((d: PatientDiagnosis) => d.patientId === patientId) : [];
                    let primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary && d.status === 'active');
                    if (!primaryDiagnosis) {
                      primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary);
                    }
                    
                    // Prüfe Allergien
                    const hasAllergies = patientObj && patientObj.allergies && Array.isArray(patientObj.allergies) && patientObj.allergies.length > 0;
                    
                    // Erstelle Tooltip-Text
                    let tooltipText = `${appointment.patientName}\n${format(appointment.start, 'HH:mm')} - ${format(appointment.end, 'HH:mm')}\nLeistung: ${appointment.type || 'Unbekannt'}`;
                    
                    // Finde Staff-Name aus appointment
                    const staffName = (apt as any)?.assigned_users?.[0] 
                      ? `${(apt as any).assigned_users[0].firstName || (apt as any).assigned_users[0].first_name || ''} ${(apt as any).assigned_users[0].lastName || (apt as any).assigned_users[0].last_name || ''}`.trim()
                      : (apt as any)?.doctor 
                        ? (typeof (apt as any).doctor === 'object' 
                          ? `${(apt as any).doctor.firstName || ''} ${(apt as any).doctor.lastName || ''}`.trim()
                          : 'Unbekannt')
                        : 'Unbekannt';
                    
                    if (staffName && staffName !== 'Unbekannt') {
                      tooltipText += `\nPersonal: ${staffName}`;
                    }
                    
                    // Finde Raum
                    const room = rooms.find(r => r._id === apt?.room);
                    if (room) {
                      tooltipText += `\nRaum: ${room.name || 'Unbekannt'}`;
                    }
                    
                    // Status
                    if (apt?.status) {
                      tooltipText += `\nStatus: ${apt.status}`;
                    }
                    
                    // Allergien
                    if (hasAllergies) {
                      tooltipText += '\n⚠️ Allergien vorhanden';
                    }
                    
                    // Hauptdiagnose
                    if (primaryDiagnosis) {
                      tooltipText += `\n✓ Hauptdiagnose: ${primaryDiagnosis.display || primaryDiagnosis.code}`;
                    }
                    
                    // Notizen
                    const notes = apt?.description || (apt as any)?.notes;
                    if (notes && typeof notes === 'string' && notes.length > 0) {
                      tooltipText += `\nNotizen: ${notes.substring(0, 50)}${notes.length > 50 ? '...' : ''}`;
                    }
                    
                    return (
                      <Tooltip
                        key={appointment.id}
                        title={tooltipText}
                        arrow
                      >
                        <Box>
                          <Paper
                            elevation={2}
                            onClick={() => handleAppointmentClick(appointment)}
                            sx={{
                              position: 'absolute',
                              left: 4,
                              right: 4,
                              top: `${top}px`,
                              height: `${height}px`,
                              bgcolor: appointment.color,
                              color: 'white',
                              p: 0.5,
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              minHeight: 40,
                              '&:hover': {
                                boxShadow: 4,
                                zIndex: 10,
                              },
                            }}
                          >
                        {/* Online-Badge oben rechts */}
                        {(() => {
                          const apt = appointment.appointment;
                          const isOnline = apt?.bookingType === 'online' || apt?.onlineBookingRef;
                          if (!isOnline) return null;
                          return (
                            <Chip
                              label="Online"
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 2,
                                right: 2,
                                height: 16,
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                bgcolor: 'rgba(255, 255, 255, 0.9)',
                                color: 'primary.main',
                                zIndex: 1,
                                '& .MuiChip-label': {
                                  px: 0.5,
                                },
                              }}
                            />
                          );
                        })()}
                        <Box>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontWeight: 600, 
                              fontSize: '0.7rem',
                              textDecoration: appointment.patientId ? 'underline' : 'none',
                              cursor: appointment.patientId ? 'pointer' : 'default',
                              display: 'block',
                              mb: 0.5,
                              '&:hover': {
                                opacity: appointment.patientId ? 0.8 : 1,
                              }
                            }}
                            onClick={(e) => {
                              if (appointment.patientId) {
                                e.stopPropagation();
                                const patientIdStr = typeof appointment.patientId === 'string' 
                                  ? appointment.patientId 
                                  : String(appointment.patientId);
                              navigate(`/patient-organizer/${patientIdStr}`);
                            }
                          }}
                        >
                          {appointment.patientName}
                          {(() => {
                            const apt = appointment.appointment;
                            const patient = apt?.patient;
                            let patientObj: any = null;
                            
                            if (patient) {
                              if (typeof patient === 'object' && patient !== null) {
                                patientObj = patient;
                              } else if (typeof patient === 'string') {
                                // Wenn patient nur eine ID ist, suche im patientMap
                                const patientId = patient;
                                patientObj = patientId ? patientMap.get(patientId) : null;
                              }
                            }
                            
                            // Wenn patientObj nicht gefunden wurde, versuche es über appointment.patientId
                            if (!patientObj && appointment.patientId) {
                              patientObj = patientMap.get(appointment.patientId);
                            }
                            
                            const age = patientObj?.dateOfBirth ? calculateAge(patientObj.dateOfBirth) : null;
                            return age !== null ? ` (${age} J.)` : '';
                          })()}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.9, mb: 0.5 }}>
                          {appointment.type}
                        </Typography>
                        {(() => {
                          const apt = appointment.appointment;
                          const patient = apt?.patient;
                          let patientId: string | null = null;
                          let patientObj: any = null;
                          
                          if (patient) {
                            if (typeof patient === 'string') {
                              patientId = patient;
                            } else if (typeof patient === 'object' && patient !== null) {
                              patientId = (patient as any)._id || (patient as any).id || null;
                              patientObj = patient;
                            }
                          }
                          
                          // Finde Hauptdiagnose - auch wenn status nicht 'active' ist, solange isPrimary true ist
                          const diagnoses = patientId ? patientDiagnoses.filter((d: PatientDiagnosis) => d.patientId === patientId) : [];
                          // Suche zuerst nach aktiver Hauptdiagnose, dann nach jeder Hauptdiagnose
                          let primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary && d.status === 'active');
                          if (!primaryDiagnosis) {
                            primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary);
                          }
                          
                          // Prüfe Allergien
                          const hasAllergies = patientObj && patientObj.allergies && Array.isArray(patientObj.allergies) && patientObj.allergies.length > 0;
                          
                          if (!hasAllergies && !primaryDiagnosis) return null;
                          
                          return (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
                              {hasAllergies && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.6rem' }}>
                                  <Warning sx={{ fontSize: '0.65rem' }} />
                                  <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>Allergien</Typography>
                                </Box>
                              )}
                              {primaryDiagnosis && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.6rem' }}>
                                  <CheckCircle sx={{ fontSize: '0.65rem' }} />
                                  <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>{primaryDiagnosis.display || primaryDiagnosis.code}</Typography>
                                </Box>
                              )}
                            </Box>
                          );
                        })()}
                        </Box>
                      </Paper>
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Box>

      {/* Appointment Dialog */}
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
        slotProps={{
          backdrop: {
            onClick: (e: React.MouseEvent<HTMLDivElement>) => {
              if (dialogMode === 'view') {
                handleCloseEventDialog();
              }
            }
          }
        }}
      >
        <GradientDialogTitle
          isEdit={dialogMode === 'edit'}
          title={
            dialogMode === 'add' ? 'Neuer Termin' :
            dialogMode === 'edit' ? 'Termin bearbeiten' :
            'Termin anzeigen'
          }
          icon={<EventIcon />}
          gradientColors={{ from: '#06b6d4', to: '#0891b2' }}
        />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box>
            <Tabs 
              value={activeTab} 
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{ 
                mb: 3,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                }
              }}
            >
              <Tab label="Grunddaten" icon={<EventIcon />} iconPosition="start" />
              <Tab label="Patient" icon={<Person />} iconPosition="start" />
              <Tab label="Behandlung" icon={<LocalHospital />} iconPosition="start" />
              <Tab label="Diagnosen" icon={<MedicalServices />} iconPosition="start" />
              <Tab label="Notizen" icon={<Note />} iconPosition="start" />
            </Tabs>

            {/* Tab 1: Grunddaten */}
            {activeTab === 0 && (
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    label="Datum"
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => handleFormChange('date', e.target.value)}
                    disabled={dialogMode === 'view'}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <TextField
                    label="Uhrzeit *"
                    type="time"
                    value={formData.time || ''}
                    onChange={(e) => handleFormChange('time', e.target.value)}
                    disabled={dialogMode === 'view'}
                    InputLabelProps={{ shrink: true }}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Dauer (Min)"
                    type="number"
                    value={formData.duration || 30}
                    onChange={(e) => handleFormChange('duration', parseInt(e.target.value))}
                    disabled={dialogMode === 'view'}
                    fullWidth
                  />
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: 'column' }}>
                  <Autocomplete
                    value={services.find(s => s._id === formData.serviceId) || null}
                    onChange={(event: any, newValue: Service | null) => {
                      if (newValue) {
                        handleFormChange('serviceId', newValue._id);
                        handleFormChange('service', newValue);
                        handleFormChange('duration', newValue.base_duration_min);
                        handleFormChange('type', newValue.code);
                        addToRecentServices(newValue._id);
                        if (newValue.assigned_rooms && newValue.assigned_rooms.length > 0) {
                          const firstRoom = newValue.assigned_rooms[0];
                          handleFormChange('room', firstRoom);
                        }
                      } else {
                        handleFormChange('serviceId', '');
                        handleFormChange('service', undefined);
                      }
                    }}
                    inputValue={serviceSearchInput}
                    onInputChange={(event, newInputValue) => {
                      setServiceSearchInput(newInputValue);
                    }}
                    options={getFilteredAndSortedServices()}
                    getOptionLabel={(option) => {
                      const cleanName = stripHtmlTags(option.name || '');
                      return `${option.code || ''} - ${cleanName}`;
                    }}
                    isOptionEqualToValue={(option, value) => option._id === value._id}
                    ListboxProps={{
                      style: { maxHeight: '400px' }
                    }}
                    renderOption={(props, option) => {
                      const isFavorite = option.quick_select === true;
                      const recentIds = getRecentServices();
                      const isRecent = recentIds.includes(option._id) && !isFavorite;
                      
                      return (
                        <Box component="li" {...props} key={option._id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: option.color_hex || '#2563EB',
                                flexShrink: 0
                              }}
                            />
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontWeight="bold" noWrap>
                                  {stripHtmlTags(option.name || '')}
                                </Typography>
                                {isFavorite && (
                                  <Chip
                                    icon={<Star sx={{ fontSize: '0.75rem !important' }} />}
                                    label="Favorit"
                                    size="small"
                                    color="warning"
                                    sx={{ fontSize: '0.65rem', height: '18px' }}
                                  />
                                )}
                                {isRecent && (
                                  <Chip
                                    icon={<AccessTime sx={{ fontSize: '0.75rem !important' }} />}
                                    label="Zuletzt"
                                    size="small"
                                    color="info"
                                    sx={{ fontSize: '0.65rem', height: '18px' }}
                                  />
                                )}
                              </Box>
                              {option.code && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Code: {option.code}
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                              <Chip
                                label={`${option.base_duration_min}min`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.75rem' }}
                              />
                              {option.price_cents && (
                                <Chip
                                  label={`€${(option.price_cents / 100).toFixed(2)}`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ fontSize: '0.75rem' }}
                                />
                              )}
                            </Box>
                          </Box>
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Leistung/Service *"
                        required
                        placeholder="Suche nach Leistung, Code oder Kategorie..."
                        disabled={dialogMode === 'view'}
                      />
                    )}
                    disabled={dialogMode === 'view'}
                    noOptionsText="Keine Leistungen gefunden"
                    loading={services.length === 0}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <FormControl fullWidth required={dialogMode === 'add'}>
                    <InputLabel>Standort</InputLabel>
                    <Select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      disabled={dialogMode === 'view' || locations.length === 1}
                      label="Standort"
                    >
                      {locations.map((location) => (
                        <MenuItem key={location._id} value={location._id}>
                          {location.name} ({location.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Personal</InputLabel>
                    <Select
                      value={selectedStaff}
                      onChange={(e) => setSelectedStaff(e.target.value)}
                      disabled={dialogMode === 'view'}
                      label="Personal"
                    >
                      {staffProfiles.map((person) => (
                        <MenuItem key={person._id} value={person.user_id}>
                          {person.display_name || `${person.first_name} ${person.last_name}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                  
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status || 'geplant'}
                      onChange={(e) => handleFormChange('status', e.target.value)}
                      disabled={dialogMode === 'view'}
                    >
                      <MenuItem value="geplant">Geplant</MenuItem>
                      <MenuItem value="bestätigt">Bestätigt</MenuItem>
                      <MenuItem value="wartend">Wartend</MenuItem>
                      <MenuItem value="in_behandlung">In Behandlung</MenuItem>
                      <MenuItem value="abgeschlossen">Abgeschlossen</MenuItem>
                      <MenuItem value="abgesagt">Abgesagt</MenuItem>
                      <MenuItem value="verschoben">Verschoben</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <TextField
                  label="Raum"
                  value={formData.room ? (typeof formData.room === 'string' ? formData.room : (formData.room as any)?.name || (formData.room as any)?._id || '') : ''}
                  onChange={(e) => handleFormChange('room', e.target.value)}
                  disabled={dialogMode === 'view'}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                
                {/* Service Details Anzeige */}
                {formData.service && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'primary.main' }}>
                      Leistungsdetails
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            backgroundColor: formData.service.color_hex || '#2563EB',
                            flexShrink: 0
                          }}
                        />
                        <Typography 
                          variant="body2" 
                          sx={{ fontWeight: 600 }}
                          dangerouslySetInnerHTML={{ __html: formData.service.name }}
                        />
                        {formData.service.code && (
                          <Chip
                            label={formData.service.code}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: '20px' }}
                          />
                        )}
                      </Box>
                      {formData.service.description && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ fontStyle: 'italic', ml: 2.5 }}
                          dangerouslySetInnerHTML={{ __html: formData.service.description }}
                        />
                      )}
                      <Box sx={{ display: 'flex', gap: 2, ml: 2.5, flexWrap: 'wrap' }}>
                        <Chip
                          label={`Dauer: ${formData.service.base_duration_min} Min`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem' }}
                        />
                        {formData.service.price_cents && (
                          <Chip
                            label={`Preis: €${(formData.service.price_cents / 100).toFixed(2)}`}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        )}
                        {formData.service.category && (
                          <Chip
                            label={`Kategorie: ${formData.service.category}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        )}
                      </Box>
                      {formData.service.assigned_rooms && formData.service.assigned_rooms.length > 0 && (
                        <Box sx={{ ml: 2.5, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Zugewiesene Räume: {formData.service.assigned_rooms.map((r: any) => r.name || r._id).join(', ')}
                          </Typography>
                        </Box>
                      )}
                      {formData.service.assigned_users && formData.service.assigned_users.length > 0 && (
                        <Box sx={{ ml: 2.5, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Zugewiesenes Personal: {formData.service.assigned_users.map((u: any) => 
                              u.display_name || u.firstName || u.first_name || `${u.firstName || u.first_name} ${u.lastName || u.last_name}` || u._id
                            ).join(', ')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {/* Tab 2: Patient */}
            {activeTab === 1 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>Patientendaten</Typography>
                
                {/* Patientensuche */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Verfügbare Patienten: {patients.length}
                  </Typography>
                  <Autocomplete
                    options={patients}
                    getOptionLabel={(option: Patient) => {
                      if (!option || !option.firstName || !option.lastName) {
                        return '';
                      }
                      let dateStr = 'Nicht verfügbar';
                      if (option.dateOfBirth) {
                        try {
                          const date = new Date(option.dateOfBirth);
                          if (!isNaN(date.getTime())) {
                            dateStr = date.toLocaleDateString('de-AT');
                          }
                        } catch (error) {
                          dateStr = 'Ungültiges Datum';
                        }
                      }
                      return `${option.firstName} ${option.lastName} (${dateStr})`;
                    }}
                    isOptionEqualToValue={(option: Patient, value: Patient) => {
                      return option && value && option._id === value._id;
                    }}
                    value={patientSearchValue}
                    onChange={(event: any, newValue: Patient | null) => {
                      setPatientSearchValue(newValue);
                      if (newValue) {
                        handleFormChange('patient', newValue);
                        handleFormChange('patientId', newValue._id);
                        handleFormChange('patientName', `${newValue.firstName} ${newValue.lastName}`);
                        handleFormChange('patientPhone', newValue.phone);
                        handleFormChange('patientEmail', newValue.email || '');
                      } else {
                        handleFormChange('patient', undefined);
                        handleFormChange('patientId', '');
                        handleFormChange('patientName', '');
                        handleFormChange('patientPhone', '');
                        handleFormChange('patientEmail', '');
                      }
                    }}
                    inputValue={patientSearchInput}
                    onInputChange={(event: any, newInputValue: string) => {
                      setPatientSearchInput(newInputValue);
                    }}
                    loading={patientSearchLoading}
                    disabled={dialogMode === 'view'}
                    renderInput={(params: any) => (
                      <TextField
                        {...params}
                        label="Patient suchen"
                        placeholder="Name oder Geburtsdatum eingeben..."
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <React.Fragment>
                              {patientSearchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </React.Fragment>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props: any, option: Patient) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box component="li" key={option._id} {...otherProps}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <Typography variant="body1" fontWeight="bold">
                              {option.firstName} {option.lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {(() => {
                                if (!option.dateOfBirth) return 'Nicht verfügbar';
                                try {
                                  const date = new Date(option.dateOfBirth);
                                  if (isNaN(date.getTime())) return 'Ungültiges Datum';
                                  return date.toLocaleDateString('de-AT');
                                } catch (error) {
                                  return 'Ungültiges Datum';
                                }
                              })()} • {option.phone} • {option.email}
                            </Typography>
                            {option.address && (
                              <Typography variant="caption" color="text.secondary">
                                {option.address.street}, {option.address.zipCode} {option.address.city}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      );
                    }}
                    noOptionsText="Keine Patienten gefunden"
                    clearOnEscape
                    selectOnFocus
                    handleHomeEndKeys
                    filterOptions={(options, { inputValue }) => {
                      if (!inputValue) return options;
                      return options.filter(option => 
                        option.firstName.toLowerCase().includes(inputValue.toLowerCase()) ||
                        option.lastName.toLowerCase().includes(inputValue.toLowerCase()) ||
                        option.email?.toLowerCase().includes(inputValue.toLowerCase()) ||
                        option.phone.includes(inputValue) ||
                        (option.dateOfBirth && option.dateOfBirth.includes(inputValue))
                      );
                    }}
                  />
                </Box>

                {/* Anzeige der Patientendaten */}
                {formData.patient && typeof formData.patient === 'object' && !Array.isArray(formData.patient) ? (
                  <Box>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <TextField
                        label="Vorname"
                        value={formData.patient.firstName}
                        disabled={true}
                        fullWidth
                      />
                      <TextField
                        label="Nachname"
                        value={formData.patient.lastName}
                        disabled={true}
                        fullWidth
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <TextField
                        label="Geburtsdatum"
                        value={(() => {
                          if (!formData.patient.dateOfBirth) return 'Nicht verfügbar';
                          try {
                            const date = new Date(formData.patient.dateOfBirth);
                            if (isNaN(date.getTime())) return 'Ungültiges Datum';
                            return date.toLocaleDateString('de-AT');
                          } catch (error) {
                            return 'Ungültiges Datum';
                          }
                        })()}
                        disabled={true}
                        fullWidth
                      />
                      <TextField
                        label="Geschlecht"
                        value={formData.patient.gender === 'male' ? 'Männlich' : formData.patient.gender === 'female' ? 'Weiblich' : 'Andere'}
                        disabled={true}
                        fullWidth
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <TextField
                        label="Telefon"
                        value={formData.patient.phone}
                        disabled={true}
                        fullWidth
                      />
                      <TextField
                        label="E-Mail"
                        value={formData.patient.email || ''}
                        disabled={true}
                        fullWidth
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <TextField
                        label="Adresse"
                        value={formData.patient.address ? `${formData.patient.address.street || ''}, ${formData.patient.address.zipCode || ''} ${formData.patient.address.city || ''}`.trim() : 'Nicht angegeben'}
                        disabled={true}
                        fullWidth
                      />
                      <TextField
                        label="Versicherungsnummer"
                        value={formData.patient.insuranceNumber || 'Nicht angegeben'}
                        disabled={true}
                        fullWidth
                      />
                    </Box>
                    
                    {formData.patient.emergencyContact && (
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <TextField
                          label="Notfallkontakt"
                          value={formData.patient.emergencyContact.name}
                          disabled={true}
                          fullWidth
                        />
                        <TextField
                          label="Notfalltelefon"
                          value={formData.patient.emergencyContact.phone}
                          disabled={true}
                          fullWidth
                        />
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                      label="Patientenname"
                      value={formData.patientName || ''}
                      onChange={(e) => handleFormChange('patientName', e.target.value)}
                      disabled={dialogMode === 'view'}
                      fullWidth
                    />
                    <TextField
                      label="Patienten-ID"
                      value={formData.patientId || ''}
                      onChange={(e) => handleFormChange('patientId', e.target.value)}
                      disabled={dialogMode === 'view'}
                      fullWidth
                    />
                  </Box>
                )}
              </Box>
            )}

            {/* Tab 3: Behandlung */}
            {activeTab === 2 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>Behandlungsdaten</Typography>
                <TextField
                  label="Symptome"
                  multiline
                  rows={2}
                  value={formData.symptoms?.join(', ') || ''}
                  onChange={(e) => handleFormChange('symptoms', e.target.value.split(',').map(item => item.trim()))}
                  disabled={dialogMode === 'view'}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  label="Diagnose"
                  multiline
                  rows={2}
                  value={formData.diagnosis || ''}
                  onChange={(e) => handleFormChange('diagnosis', e.target.value)}
                  disabled={dialogMode === 'view'}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  label="Behandlung"
                  multiline
                  rows={2}
                  value={formData.treatment?.join(', ') || ''}
                  onChange={(e) => handleFormChange('treatment', e.target.value.split(',').map(item => item.trim()))}
                  disabled={dialogMode === 'view'}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  label="Medikamente"
                  multiline
                  rows={2}
                  value={formData.currentMedications?.join(', ') || ''}
                  onChange={(e) => handleFormChange('currentMedications', e.target.value.split(',').map(item => item.trim()))}
                  disabled={dialogMode === 'view'}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.followUpRequired || false}
                        onChange={(e) => handleFormChange('followUpRequired', e.target.checked)}
                        disabled={dialogMode === 'view'}
                      />
                    }
                    label="Nachsorge erforderlich"
                  />
                  {formData.followUpRequired && (
                    <TextField
                      label="Nachsorgetermin"
                      type="date"
                      value={formData.followUpDate || ''}
                      onChange={(e) => handleFormChange('followUpDate', e.target.value)}
                      disabled={dialogMode === 'view'}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  )}
                </Box>
              </Box>
            )}

            {/* Tab 4: Diagnosen */}
            {activeTab === 3 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                  Diagnosen
                </Typography>
                {(() => {
                  const patientIdValue = 
                    patientSearchValue?._id || 
                    formData.patientId || 
                    (typeof formData.patient === 'object' && formData.patient && !Array.isArray(formData.patient) && '_id' in formData.patient ? (formData.patient as Patient)._id : null) ||
                    (typeof formData.patient === 'string' ? formData.patient : null);
                  
                  if (!patientIdValue) {
                    return (
                      <Alert severity="info">
                        Bitte wählen Sie zuerst einen Patienten aus, um Diagnosen zu erfassen.
                      </Alert>
                    );
                  }
                  
                  return (
                    <DiagnosisManager
                      patientId={patientIdValue}
                      encounterId={selectedAppointment?.id || undefined}
                      allowEdit={dialogMode !== 'view'}
                      showPrimaryToggle={true}
                      context="medical"
                      onDiagnosisChange={(diagnoses) => {
                        console.log('Appointment Diagnosen aktualisiert:', diagnoses.length);
                      }}
                    />
                  );
                })()}
              </Box>
            )}

            {/* Tab 5: Notizen */}
            {activeTab === 4 && (
              <Box sx={{ mt: 3 }}>
                <TextField
                  label="Notizen"
                  multiline
                  rows={4}
                  value={formData.notes || ''}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  disabled={dialogMode === 'view'}
                  fullWidth
                  placeholder="Zusätzliche Notizen zum Termin..."
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider' }}>
          {dialogMode === 'view' ? (
            <>
              <Button 
                onClick={handleCloseEventDialog}
                size="large"
                sx={{ minWidth: 120, textTransform: 'none' }}
              >
                Schließen
              </Button>
              <Button 
                variant="outlined"
                onClick={() => setDialogMode('edit')}
                size="large"
                startIcon={<Done />}
                sx={{ 
                  minWidth: 140, 
                  textTransform: 'none',
                }}
              >
                Bearbeiten
              </Button>
              {selectedAppointment && (
                <Button 
                  onClick={handleCancelAppointment} 
                  color="warning"
                  variant="outlined"
                  size="large"
                  sx={{ minWidth: 120, textTransform: 'none' }}
                >
                  Stornieren
                </Button>
              )}
            </>
          ) : (
            <>
              <Button 
                onClick={handleCloseEventDialog}
                size="large"
                sx={{ minWidth: 120, textTransform: 'none' }}
              >
                Abbrechen
              </Button>
              <Button 
                variant="contained" 
                onClick={handleSaveAppointment}
                size="large"
                startIcon={dialogMode === 'add' ? <Add /> : <Done />}
                sx={{ 
                  minWidth: 140, 
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  }
                }}
              >
                {dialogMode === 'add' ? 'Hinzufügen' : 'Speichern'}
              </Button>
              {selectedAppointment && (
                <Button 
                  onClick={handleDeleteEvent} 
                  color="error"
                  size="large"
                  sx={{ minWidth: 120, textTransform: 'none' }}
                >
                  Löschen
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={8000}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ minWidth: '300px' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={openTaskDialog}
        onClose={() => setOpenTaskDialog(false)}
      />

      {/* Advanced Search Dialog */}
      <Dialog 
        open={openSearchDialog} 
        onClose={() => {
          setOpenSearchDialog(false);
          setSearchDialogQuery('');
        }}
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
          isEdit={false}
          title="Erweiterte Suche"
          icon={<Search />}
          gradientColors={{ from: '#667eea', to: '#764ba2' }}
        />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box>
            <TextField
              fullWidth
              placeholder="Suchen nach Patienten, Terminen, Leistungen, Personal, Räumen oder Geräten..."
              value={searchDialogQuery}
              onChange={(e) => setSearchDialogQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
              autoFocus
            />

            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
              <Chip
                label="Alle"
                onClick={() => setSearchDialogCategory('all')}
                color={searchDialogCategory === 'all' ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                icon={<Person />}
                label="Patienten"
                onClick={() => setSearchDialogCategory('patients')}
                color={searchDialogCategory === 'patients' ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                icon={<EventIcon />}
                label="Termine"
                onClick={() => setSearchDialogCategory('appointments')}
                color={searchDialogCategory === 'appointments' ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                icon={<LocalHospital />}
                label="Leistungen"
                onClick={() => setSearchDialogCategory('services')}
                color={searchDialogCategory === 'services' ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                icon={<Person />}
                label="Personal"
                onClick={() => setSearchDialogCategory('staff')}
                color={searchDialogCategory === 'staff' ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                icon={<Folder />}
                label="Räume"
                onClick={() => setSearchDialogCategory('rooms')}
                color={searchDialogCategory === 'rooms' ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                icon={<Build />}
                label="Geräte"
                onClick={() => setSearchDialogCategory('devices')}
                color={searchDialogCategory === 'devices' ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
            </Box>

            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {(() => {
                const query = searchDialogQuery.toLowerCase().trim();
                if (!query) {
                  return (
                    <Alert severity="info">
                      Geben Sie einen Suchbegriff ein, um zu suchen.
                    </Alert>
                  );
                }

                const results: Array<{
                  type: 'patient' | 'appointment' | 'service' | 'staff' | 'room' | 'device';
                  id: string;
                  title: string;
                  subtitle?: string;
                  onClick: () => void;
                }> = [];

                // Search Patients
                if (searchDialogCategory === 'all' || searchDialogCategory === 'patients') {
                  patients.forEach(patient => {
                    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
                    if (fullName.includes(query) || 
                        patient.email?.toLowerCase().includes(query) ||
                        patient.phone?.includes(query)) {
                      const patientId = patient._id || patient.id || '';
                      results.push({
                        type: 'patient',
                        id: patientId,
                        title: `${patient.firstName} ${patient.lastName}`,
                        subtitle: `${patient.email || ''} • ${patient.phone || ''}`,
                        onClick: () => {
                          setOpenSearchDialog(false);
                          setTimeout(() => {
                            navigate(`/patient-organizer/${patientId}`);
                          }, 100);
                        }
                      });
                    }
                  });
                }

                // Search Appointments
                if (searchDialogCategory === 'all' || searchDialogCategory === 'appointments') {
                  appointments.forEach(apt => {
                    const patientId = typeof apt.patient === 'string' 
                      ? apt.patient 
                      : (apt.patient as any)?._id || (apt.patient as any)?.id || '';
                    const patient = patientId ? patientMap.get(patientId) : null;
                    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : '';
                    const aptTitle = apt.title || '';
                    const aptType = apt.type || '';
                    
                    if (aptTitle.toLowerCase().includes(query) ||
                        patientName.toLowerCase().includes(query) ||
                        aptType.toLowerCase().includes(query)) {
                      const startDate = apt.startTime ? new Date(apt.startTime) : null;
                      const aptId = apt._id;
                      results.push({
                        type: 'appointment',
                        id: aptId,
                        title: aptTitle || patientName || 'Termin',
                        subtitle: startDate ? `${format(startDate, 'dd.MM.yyyy HH:mm', { locale: de })} • ${aptType}` : aptType,
                        onClick: () => {
                          setOpenSearchDialog(false);
                          // Use setTimeout to ensure dialog is closed before opening appointment dialog
                          setTimeout(() => {
                            if (startDate) {
                              setCurrentDate(startDate);
                              setViewMode('day');
                            }
                            // Find the appointment in calendarAppointments
                            const calendarApt = calendarAppointments.find(ca => ca.id === aptId);
                            if (calendarApt) {
                              handleAppointmentClick(calendarApt);
                            } else {
                              // If not found in calendarAppointments, create a temporary CalendarAppointment
                              const tempApt: CalendarAppointment = {
                                id: aptId,
                                patientName: patientName || aptTitle || 'Unbekannt',
                                type: aptType,
                                start: startDate || new Date(),
                                end: apt.endTime ? new Date(apt.endTime) : new Date(),
                                locationId: apt.locationId || '',
                                locationName: apt.locationId ? (locationMap.get(apt.locationId)?.name || '') : '',
                                color: '#1976d2',
                                patientId: patientId || undefined,
                                appointment: apt,
                              };
                              handleAppointmentClick(tempApt);
                            }
                          }, 100);
                        }
                      });
                    }
                  });
                }

                // Search Services
                if (searchDialogCategory === 'all' || searchDialogCategory === 'services') {
                  services.forEach(service => {
                    if (service.name.toLowerCase().includes(query) ||
                        service.code?.toLowerCase().includes(query) ||
                        service.description?.toLowerCase().includes(query) ||
                        service.category?.toLowerCase().includes(query)) {
                      results.push({
                        type: 'service',
                        id: service._id,
                        title: service.name,
                        subtitle: `${service.code || ''} • ${service.category || ''}`,
                        onClick: () => {
                          setOpenSearchDialog(false);
                          setTimeout(() => {
                            navigate('/service-catalog');
                          }, 100);
                        }
                      });
                    }
                  });
                }

                // Search Staff
                if (searchDialogCategory === 'all' || searchDialogCategory === 'staff') {
                  staffProfiles.forEach(staff => {
                    const displayName = staff.display_name || `${staff.first_name} ${staff.last_name}`;
                    if (displayName.toLowerCase().includes(query) ||
                        staff.first_name?.toLowerCase().includes(query) ||
                        staff.last_name?.toLowerCase().includes(query)) {
                      results.push({
                        type: 'staff',
                        id: staff._id,
                        title: displayName,
                        subtitle: staff.department || staff.role || '',
                        onClick: () => {
                          setOpenSearchDialog(false);
                          setTimeout(() => {
                            setSearchQuery(displayName);
                          }, 100);
                        }
                      });
                    }
                  });
                }

                // Search Rooms
                if (searchDialogCategory === 'all' || searchDialogCategory === 'rooms') {
                  rooms.forEach(room => {
                    const roomName = typeof room === 'string' ? room : (room as any).name || '';
                    if (roomName.toLowerCase().includes(query)) {
                      results.push({
                        type: 'room',
                        id: typeof room === 'string' ? room : (room as any)._id || '',
                        title: roomName,
                        subtitle: typeof room === 'object' ? (room as any).location?.name || '' : '',
                        onClick: () => {
                          setOpenSearchDialog(false);
                          setTimeout(() => {
                            setSearchQuery(roomName);
                          }, 100);
                        }
                      });
                    }
                  });
                }

                // Search Devices
                if (searchDialogCategory === 'all' || searchDialogCategory === 'devices') {
                  devices.forEach(device => {
                    const deviceName = device.name || '';
                    if (deviceName.toLowerCase().includes(query) ||
                        device.description?.toLowerCase().includes(query) ||
                        device.type?.toLowerCase().includes(query)) {
                      results.push({
                        type: 'device',
                        id: device._id || '',
                        title: deviceName,
                        subtitle: `${device.type || ''} • ${device.location?.name || ''}`,
                        onClick: () => {
                          setOpenSearchDialog(false);
                          setTimeout(() => {
                            setSearchQuery(deviceName);
                          }, 100);
                        }
                      });
                    }
                  });
                }

                if (results.length === 0) {
                  return (
                    <Alert severity="info">
                      Keine Ergebnisse gefunden für "{searchDialogQuery}".
                    </Alert>
                  );
                }

                return (
                  <List>
                    {results.map((result, index) => (
                      <ListItemButton
                        key={`${result.type}-${result.id}-${index}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (result.onClick) {
                            result.onClick();
                          }
                        }}
                        sx={{
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          }
                        }}
                      >
                        <ListItemIcon>
                          {result.type === 'patient' && <Person color="primary" />}
                          {result.type === 'appointment' && <EventIcon color="primary" />}
                          {result.type === 'service' && <LocalHospital color="primary" />}
                          {result.type === 'staff' && <Person color="primary" />}
                          {result.type === 'room' && <Folder color="primary" />}
                          {result.type === 'device' && <Build color="primary" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={result.title}
                          secondary={result.subtitle}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                );
              })()}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => {
              setOpenSearchDialog(false);
              setSearchDialogQuery('');
            }}
            sx={{ textTransform: 'none' }}
          >
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog für Sperre-Namenseingabe */}
      <Dialog 
        open={blockDialogOpen} 
        onClose={() => {
          setBlockDialogOpen(false);
          setBlockName('');
          setSelectedBlockStaff('');
          setPendingBlockTime(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <GradientDialogTitle 
          title="Zeitslot sperren"
          onClose={() => {
            setBlockDialogOpen(false);
            setBlockName('');
            setSelectedBlockStaff('');
            setPendingBlockTime(null);
          }}
        />
        <DialogContent sx={{ pt: 3 }}>
          {pendingBlockTime && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Zeitraum: {format(pendingBlockTime.start, 'dd.MM.yyyy HH:mm')} - {format(pendingBlockTime.end, 'HH:mm')}
            </Alert>
          )}
          
          <TextField
            label="Name der Sperre"
            value={blockName}
            onChange={(e) => setBlockName(e.target.value)}
            fullWidth
            placeholder="z.B. Wartung, Urlaub, Fortbildung..."
            autoFocus
            sx={{ mb: 3 }}
          />
          
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary', mt: 2 }}>
            Personal auswählen:
          </Typography>
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel id="block-staff-label">Personal</InputLabel>
            <Select
              labelId="block-staff-label"
              value={selectedBlockStaff || ''}
              onChange={(e) => setSelectedBlockStaff(e.target.value)}
              label="Personal"
              displayEmpty
              renderValue={(value) => {
                if (!value || value === '') {
                  return <em>Keine Auswahl (für alle)</em>;
                }
                // Suche nach user_id statt _id, da value die User ID ist
                const selectedStaff = staffProfiles?.find((staff: any) => {
                  const staffUserId = typeof staff.user_id === 'string' 
                    ? staff.user_id 
                    : (typeof staff.user_id === 'object' && staff.user_id !== null ? (staff.user_id as any)?._id : null);
                  return staffUserId === value;
                });
                if (selectedStaff) {
                  return `${selectedStaff.first_name || (selectedStaff as any).firstName || ''} ${selectedStaff.last_name || (selectedStaff as any).lastName || ''}`;
                }
                return '';
              }}
            >
              <MenuItem value="">
                <em>Keine Auswahl (für alle)</em>
              </MenuItem>
              {staffProfiles && Array.isArray(staffProfiles) && staffProfiles.length > 0 ? (
                staffProfiles.map((staff: any) => {
                  // Verwende user_id statt _id, da das Backend die User ID erwartet (nicht StaffProfile ID)
                  const staffUserId = typeof staff.user_id === 'string' 
                    ? staff.user_id 
                    : (typeof staff.user_id === 'object' && staff.user_id !== null ? (staff.user_id as any)?._id : null);
                  
                  // Nur anzeigen wenn user_id vorhanden ist
                  if (!staffUserId) return null;
                  
                  return (
                    <MenuItem key={staff._id || staff.id} value={staffUserId}>
                      {staff.firstName || staff.first_name} {staff.lastName || staff.last_name}
                    </MenuItem>
                  );
                })
              ) : (
                <MenuItem value="" disabled>
                  Kein Personal verfügbar
                </MenuItem>
              )}
            </Select>
          </FormControl>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Geben Sie einen Namen für diese Sperre ein. Wenn Personal ausgewählt wird, ist dieses Personal für den Zeitraum blockiert.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setBlockDialogOpen(false);
              setBlockName('');
              setSelectedBlockStaff('');
              setPendingBlockTime(null);
            }}
          >
            Abbrechen
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmBlockTime}
          >
            Sperren
          </Button>
        </DialogActions>
      </Dialog>

      {/* Kontextmenü für Selection und TimeBlocks */}
      <Menu
        anchorReference="anchorPosition"
        anchorPosition={contextMenuAnchor ? 
          { top: contextMenuAnchor.y, left: contextMenuAnchor.x } : 
          undefined
        }
        open={!!contextMenuAnchor}
        onClose={() => setContextMenuAnchor(null)}
      >
        {/* Option 1: Wenn auf TimeBlock geklickt → "Sperre aufheben" */}
        {contextMenuAnchor?.timeBlock && (
          <MenuItem 
            onClick={() => {
              if (contextMenuAnchor?.timeBlock) {
                handleUnblockTime(contextMenuAnchor.timeBlock._id);
                setContextMenuAnchor(null);
              }
            }}
          >
            <ListItemIcon>
              <LockOpen fontSize="small" />
            </ListItemIcon>
            <ListItemText>Sperre aufheben</ListItemText>
          </MenuItem>
        )}
        
        {/* Option: Wenn auf Tag geklickt → "Sonderöffnung setzen" */}
        {contextMenuAnchor?.day && !contextMenuAnchor?.timeBlock && !contextMenuAnchor?.start && (
          <MenuItem 
            onClick={() => {
              if (contextMenuAnchor?.day && selectedLocation && selectedLocation !== 'all') {
                const dayDate = contextMenuAnchor.day;
                const dayDateString = format(dayDate, 'yyyy-MM-dd');
                
                // Prüfe ob bereits eine Ausnahme für dieses Datum existiert
                const existingException = locationExceptions.find((exception: any) => {
                  const exceptionDate = new Date(exception.date);
                  const exceptionDateString = format(exceptionDate, 'yyyy-MM-dd');
                  return exceptionDateString === dayDateString && exception.isActive !== false;
                });
                
                if (existingException) {
                  // Bearbeitungsmodus: Öffne Dialog mit bestehender Ausnahme
                  const exceptionDate = new Date(existingException.date);
                  setSelectedException(existingException);
                  setExceptionFormData({
                    date: format(exceptionDate, 'yyyy-MM-dd'),
                    startTime: existingException.startTime,
                    endTime: existingException.endTime,
                    breakStart: existingException.breakStart || '',
                    breakEnd: existingException.breakEnd || '',
                    label: existingException.label || 'Sonderöffnung',
                    assignedStaff: existingException.assignedStaff ? 
                      existingException.assignedStaff.map((staff: any) => {
                        if (typeof staff === 'object' && staff !== null) {
                          return staff._id || staff;
                        }
                        return staff;
                      }) : []
                  });
                } else {
                  // Erstellungsmodus: Öffne Dialog mit Standardwerten
                  setSelectedException(null);
                  // Wenn nur ein Standort vorhanden ist, wähle diesen automatisch
                  const defaultLocationId = locations.length === 1 
                    ? locations[0]._id 
                    : (selectedLocation && selectedLocation !== 'all' ? selectedLocation : '');
                  setExceptionLocationId(defaultLocationId);
                  setExceptionFormData({
                    date: dayDateString,
                    startTime: '08:00',
                    endTime: '17:00',
                    breakStart: '',
                    breakEnd: '',
                    label: 'Sonderöffnung',
                    assignedStaff: []
                  });
                }
                setExceptionDialogOpen(true);
                setContextMenuAnchor(null);
              }
            }}
          >
            <ListItemIcon>
              <Schedule fontSize="small" />
            </ListItemIcon>
            <ListItemText>Sonderöffnung für diesen Tag setzen</ListItemText>
          </MenuItem>
        )}
        
        {/* Option 2: Wenn auf TimeBlock geklickt → "Zusammenführen" */}
        {contextMenuAnchor?.timeBlock && contextMenuAnchor.timeBlock.status === 'blocked' && (
          <MenuItem 
            onClick={() => {
              if (contextMenuAnchor?.timeBlock) {
                setSelectedTimeBlock(contextMenuAnchor.timeBlock);
                setMergeDialogOpen(true);
                setContextMenuAnchor(null);
              }
            }}
          >
            <ListItemIcon>
              <Merge fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mit Patient/Leistung zusammenführen</ListItemText>
          </MenuItem>
        )}
        
        {/* Option 3: Wenn auf Selection geklickt → "Termin sperren" */}
        {contextMenuAnchor?.start && contextMenuAnchor?.end && (
          <MenuItem 
            onClick={() => {
              if (contextMenuAnchor?.start && contextMenuAnchor?.end) {
                handleBlockTime(contextMenuAnchor.start, contextMenuAnchor.end, contextMenuAnchor.staffId);
                setContextMenuAnchor(null);
              }
            }}
          >
            <ListItemIcon>
              <Block fontSize="small" />
            </ListItemIcon>
            <ListItemText>Termin sperren</ListItemText>
          </MenuItem>
        )}
        
        {/* Option 4: Wenn auf Selection geklickt → "Termin erstellen" */}
        {contextMenuAnchor?.start && contextMenuAnchor?.end && (
          <MenuItem 
            onClick={() => {
              if (contextMenuAnchor?.start) {
                handleOpenNewEventDialog(contextMenuAnchor.start);
                setContextMenuAnchor(null);
              }
            }}
          >
            <ListItemIcon>
              <EventIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Termin erstellen</ListItemText>
          </MenuItem>
        )}
        
        {/* Option 5: Wenn auf Selection geklickt → "Sonderöffnung setzen" */}
        {contextMenuAnchor?.start && contextMenuAnchor?.end && selectedLocation && selectedLocation !== 'all' && (
          <MenuItem 
            onClick={() => {
              if (contextMenuAnchor?.start && selectedLocation && selectedLocation !== 'all') {
                const dayDate = new Date(contextMenuAnchor.start);
                const dayDateString = format(dayDate, 'yyyy-MM-dd');
                
                // Prüfe ob bereits eine Ausnahme für dieses Datum existiert
                const existingException = locationExceptions.find((exception: any) => {
                  const exceptionDate = new Date(exception.date);
                  const exceptionDateString = format(exceptionDate, 'yyyy-MM-dd');
                  return exceptionDateString === dayDateString && exception.isActive !== false;
                });
                
                if (existingException) {
                  // Bearbeitungsmodus: Öffne Dialog mit bestehender Ausnahme
                  const exceptionDate = new Date(existingException.date);
                  const exceptionLocationId = typeof existingException.location_id === 'object' && existingException.location_id !== null
                    ? existingException.location_id._id || existingException.location_id
                    : existingException.location_id || selectedLocation;
                  setSelectedException(existingException);
                  setExceptionLocationId(exceptionLocationId || '');
                  setExceptionFormData({
                    date: format(exceptionDate, 'yyyy-MM-dd'),
                    startTime: existingException.startTime,
                    endTime: existingException.endTime,
                    breakStart: existingException.breakStart || '',
                    breakEnd: existingException.breakEnd || '',
                    label: existingException.label || 'Sonderöffnung',
                    assignedStaff: existingException.assignedStaff ? 
                      existingException.assignedStaff.map((staff: any) => {
                        if (typeof staff === 'object' && staff !== null) {
                          return staff._id || staff;
                        }
                        return staff;
                      }) : []
                  });
                } else {
                  // Erstellungsmodus: Öffne Dialog mit Standardwerten basierend auf der Auswahl
                  const startTime = contextMenuAnchor.start ? format(contextMenuAnchor.start, 'HH:mm') : '08:00';
                  const endTime = contextMenuAnchor.end ? format(contextMenuAnchor.end, 'HH:mm') : '17:00';
                  setSelectedException(null);
                  // Wenn nur ein Standort vorhanden ist, wähle diesen automatisch
                  const defaultLocationId = locations.length === 1 
                    ? locations[0]._id 
                    : (selectedLocation && selectedLocation !== 'all' ? selectedLocation : '');
                  setExceptionLocationId(defaultLocationId);
                  setExceptionFormData({
                    date: dayDateString,
                    startTime: startTime,
                    endTime: endTime,
                    breakStart: '',
                    breakEnd: '',
                    label: 'Sonderöffnung',
                    assignedStaff: []
                  });
                }
                setExceptionDialogOpen(true);
                setContextMenuAnchor(null);
              }
            }}
          >
            <ListItemIcon>
              <Schedule fontSize="small" />
            </ListItemIcon>
            <ListItemText>Sonderöffnung für diesen Tag setzen</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Dialog für LocationException (Sonderöffnung) */}
      <Dialog 
        open={exceptionDialogOpen} 
        onClose={() => {
          setExceptionDialogOpen(false);
          setSelectedException(null);
          setExceptionLocationId('');
          setExceptionFormData({
            date: '',
            startTime: '08:00',
            endTime: '17:00',
            breakStart: '',
            breakEnd: '',
            label: 'Sonderöffnung',
            assignedStaff: []
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedException ? 'Sonderöffnung bearbeiten' : 'Sonderöffnung für Tag setzen'}
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="exception-location-label">Standort</InputLabel>
            <Select
              labelId="exception-location-label"
              id="exception-location-select"
              value={exceptionLocationId}
              onChange={(e) => setExceptionLocationId(e.target.value)}
              label="Standort"
            >
              {locations.map((location) => (
                <MenuItem key={location._id} value={location._id}>
                  {location.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            label="Datum"
            type="date"
            fullWidth
            margin="normal"
            value={exceptionFormData.date}
            onChange={(e) => setExceptionFormData({ ...exceptionFormData, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            required
          />
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              label="Startzeit"
              type="time"
              fullWidth
              value={exceptionFormData.startTime}
              onChange={(e) => setExceptionFormData({ ...exceptionFormData, startTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
            
            <TextField
              label="Endzeit"
              type="time"
              fullWidth
              value={exceptionFormData.endTime}
              onChange={(e) => setExceptionFormData({ ...exceptionFormData, endTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              label="Pause von (optional)"
              type="time"
              fullWidth
              value={exceptionFormData.breakStart}
              onChange={(e) => setExceptionFormData({ ...exceptionFormData, breakStart: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              label="Pause bis (optional)"
              type="time"
              fullWidth
              value={exceptionFormData.breakEnd}
              onChange={(e) => setExceptionFormData({ ...exceptionFormData, breakEnd: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          
          <TextField
            label="Beschreibung"
            fullWidth
            margin="normal"
            value={exceptionFormData.label}
            onChange={(e) => setExceptionFormData({ ...exceptionFormData, label: e.target.value })}
            placeholder="z.B. Sonderöffnung"
          />
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ mt: 2, mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.primary', fontWeight: 600 }}>
              Personal zuweisen (optional)
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Wenn Personal ausgewählt wird, gilt diese Sonderöffnung nur für die ausgewählten Personen. Wenn leer, gilt sie für alle.
            </Typography>
            {staffProfiles && staffProfiles.length > 0 ? (
              <Autocomplete
                multiple
                options={staffProfiles}
                getOptionLabel={(option: any) => option.display_name || `${option.first_name || ''} ${option.last_name || ''}`.trim() || option._id}
                isOptionEqualToValue={(option: any, value: any) => {
                  const optionUserId = typeof option.user_id === 'string' 
                    ? option.user_id 
                    : (typeof option.user_id === 'object' && option.user_id !== null ? (option.user_id as any)?._id : null);
                  const valueUserId = typeof value.user_id === 'string' 
                    ? value.user_id 
                    : (typeof value.user_id === 'object' && value.user_id !== null ? (value.user_id as any)?._id : null);
                  return optionUserId === valueUserId || option._id === value._id;
                }}
                value={staffProfiles.filter((staff: any) => {
                  const staffUserId = typeof staff.user_id === 'string' 
                    ? staff.user_id 
                    : (typeof staff.user_id === 'object' && staff.user_id !== null ? (staff.user_id as any)?._id : null);
                  return staffUserId && exceptionFormData.assignedStaff.includes(staffUserId);
                })}
                onChange={(event, newValue) => {
                  const staffUserIds = newValue.map((staff: any) => {
                    const staffUserId = typeof staff.user_id === 'string' 
                      ? staff.user_id 
                      : (typeof staff.user_id === 'object' && staff.user_id !== null ? (staff.user_id as any)?._id : null);
                    return staffUserId;
                  }).filter((id: string | null) => id !== null);
                  setExceptionFormData({ ...exceptionFormData, assignedStaff: staffUserIds });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Personal auswählen"
                    placeholder="Personal auswählen (optional)"
                    fullWidth
                    margin="normal"
                  />
                )}
                renderOption={(props, option: any) => {
                  const { key, ...restProps } = props;
                  const uniqueKey = option._id || key;
                  return (
                    <Box component="li" key={uniqueKey} {...restProps}>
                      <Typography variant="body2">
                        {option.display_name || `${option.first_name || ''} ${option.last_name || ''}`.trim() || option._id}
                      </Typography>
                    </Box>
                  );
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option: any, index: number) => {
                    const staffUserId = typeof option.user_id === 'string' 
                      ? option.user_id 
                      : (typeof option.user_id === 'object' && option.user_id !== null ? (option.user_id as any)?._id : null);
                    return (
                      <Chip
                        {...getTagProps({ index })}
                        key={staffUserId || option._id || `staff-${index}`}
                        label={option.display_name || `${option.first_name || ''} ${option.last_name || ''}`.trim() || option._id}
                        size="small"
                      />
                    );
                  })
                }
              />
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                Kein Personal verfügbar
              </Typography>
            )}
            {exceptionFormData.assignedStaff.length > 0 && (
              <Typography variant="caption" sx={{ mt: 2, color: 'info.main', fontStyle: 'italic', display: 'block' }}>
                ⓘ Diese Sonderöffnung gilt nur für das ausgewählte Personal. Online-Buchungen sind nur für diese Personen möglich.
              </Typography>
            )}
          </Box>
          
          {selectedException && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={() => {
                  if (selectedException) {
                    handleDeleteException(selectedException._id, selectedException);
                    setExceptionDialogOpen(false);
                    setSelectedException(null);
                  }
                }}
              >
                Sonderöffnung löschen
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setExceptionDialogOpen(false);
              setSelectedException(null);
              setExceptionLocationId('');
              setExceptionFormData({
                date: '',
                startTime: '08:00',
                endTime: '17:00',
                breakStart: '',
                breakEnd: '',
                label: 'Sonderöffnung',
                assignedStaff: []
              });
            }}
          >
            Abbrechen
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveException}
          >
            {selectedException ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Merge-Dialog für TimeBlock */}
      <Dialog 
        open={mergeDialogOpen} 
        onClose={() => {
          setMergeDialogOpen(false);
          setSelectedTimeBlock(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <GradientDialogTitle 
          title="TimeBlock zusammenführen"
          onClose={() => {
            setMergeDialogOpen(false);
            setSelectedTimeBlock(null);
          }}
        />
        <DialogContent>
          {selectedTimeBlock && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Zeitraum: {format(new Date(selectedTimeBlock.startTime), 'dd.MM.yyyy HH:mm')} - {format(new Date(selectedTimeBlock.endTime), 'HH:mm')}
              </Alert>
              
              <Autocomplete
                options={patients}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                value={patientSearchValue}
                onChange={(event, newValue) => {
                  setPatientSearchValue(newValue);
                  if (newValue) {
                    handleFormChange('patientId', newValue._id);
                    handleFormChange('patient', newValue);
                    handleFormChange('patientName', `${newValue.firstName} ${newValue.lastName}`);
                  }
                }}
                inputValue={patientSearchInput}
                onInputChange={(event, newInputValue) => {
                  setPatientSearchInput(newInputValue);
                }}
                loading={patientSearchLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Patient"
                    variant="outlined"
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                )}
              />
              
              <Autocomplete
                options={services}
                getOptionLabel={(option) => stripHtmlTags(option.name || option.code || '')}
                value={formData.service || null}
                onChange={(event, newValue) => {
                  handleFormChange('service', newValue || undefined);
                  handleFormChange('serviceId', newValue?._id || '');
                }}
                inputValue={serviceSearchInput}
                onInputChange={(event, newInputValue) => {
                  setServiceSearchInput(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Leistung (optional)"
                    variant="outlined"
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                )}
              />
              
              <TextField
                label="Titel"
                value={formData.type || ''}
                onChange={(e) => handleFormChange('type', e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
              />
              
              <TextField
                label="Notizen"
                value={formData.notes || ''}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setMergeDialogOpen(false);
            setSelectedTimeBlock(null);
          }}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedTimeBlock && formData.patientId) {
                handleMergeTimeBlock(selectedTimeBlock._id, {
                  patientId: formData.patientId,
                  serviceId: formData.serviceId,
                  title: formData.type || 'Termin',
                  notes: formData.notes
                });
              }
            }}
            disabled={!formData.patientId}
          >
            Zusammenführen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DemoCalendar;
