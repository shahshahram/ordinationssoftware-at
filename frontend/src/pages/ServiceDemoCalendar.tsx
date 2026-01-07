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
  Tooltip,
  Menu,
  useTheme,
} from '@mui/material';
import {
  Favorite,
  Search,
  Add,
  ArrowBackIos,
  ArrowForwardIos,
  Today,
  MoreVert,
  Wifi,
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
} from '@mui/icons-material';
import { format, startOfWeek, addDays, addWeeks, subWeeks, startOfMonth, endOfMonth, endOfWeek, isSameDay, isSameMonth, eachDayOfInterval, parseISO, addMonths, subMonths, startOfDay, endOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadUser, updateCalendarSettings } from '../store/slices/authSlice';
import { fetchAppointments, createAppointment, updateAppointment, deleteAppointment, Appointment } from '../store/slices/appointmentSlice';
import { fetchLocations, Location } from '../store/slices/locationSlice';
import { fetchPatients, Patient } from '../store/slices/patientSlice';
import { fetchStaffProfiles } from '../store/slices/staffSlice';
import { fetchRooms } from '../store/slices/roomSlice';
import { fetchPatientDiagnoses, PatientDiagnosis } from '../store/slices/diagnosisSlice';
import { fetchWaitingListCount } from '../store/slices/waitingListSlice';
import { fetchLocationWeeklySchedules } from '../store/slices/locationWeeklyScheduleSlice';
import { fetchWeeklySchedules, deleteWeeklySchedulesByStaffId } from '../store/slices/weeklyScheduleSlice';
import { eventBus, EVENTS } from '../utils/eventBus';
import { isWithinInterval } from 'date-fns';
import GradientDialogTitle from '../components/GradientDialogTitle';
import DiagnosisManager from '../components/DiagnosisManager';
import CreateTaskDialog from '../components/Tasks/CreateTaskDialog';
import api from '../utils/api';
import { useTimeSlotSelection } from '../hooks/useTimeSlotSelection';

// Hilfsfunktion zum Entfernen von HTML-Tags
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
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

const ServiceDemoCalendar: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  
  // Redux State
  const { appointments, loading: appointmentsLoading } = useAppSelector((state) => state.appointments);
  const { locations, loading: locationsLoading, currentLocation } = useAppSelector((state) => state.locations);
  const { patients, loading: patientsLoading } = useAppSelector((state) => state.patients);
  const { staffProfiles } = useAppSelector((state) => state.staff);
  const { rooms } = useAppSelector((state) => state.rooms);
  const { patientDiagnoses } = useAppSelector((state) => state.diagnoses);
  const { count: waitingListCount } = useAppSelector((state) => state.waitingList);
  const { schedules: locationSchedules, loading: locationSchedulesLoading } = useAppSelector((state) => state.locationWeeklySchedules);
  const { schedules: weeklySchedules, loading: weeklySchedulesLoading } = useAppSelector((state) => state.weeklySchedules);
  const { user } = useAppSelector((state) => state.auth);

  // Default settings - immer mit diesen Werten initialisieren
  // WICHTIG: currentDate wird immer dynamisch berechnet, nicht als statischer Wert
  const defaultSettings = {
    useStaffColumns: false,
    selectedStaffForColumns: [] as string[],
    selectedStaff: 'all',
    selectedLocation: 'all',
    showOpeningHours: true,
    showWorkingHours: true,
    showBreaks: true,
    viewMode: 'week' as 'day' | 'week' | 'month',
  };

  // Local State - IMMER mit aktuellen Datum initialisieren
  const [currentDate, setCurrentDate] = useState(() => startOfWeek(new Date(), { locale: de, weekStartsOn: 1 }));
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>(defaultSettings.viewMode);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // EnhancedCalendar Logik: Filter und Einstellungen
  const [medicalFilter, setMedicalFilter] = useState<'all' | 'medical' | 'non-medical'>('all');
  const [showLocationHours, setShowLocationHours] = useState(defaultSettings.showOpeningHours);
  const [showStaffHours, setShowStaffHours] = useState(defaultSettings.showWorkingHours);
  const [showBreaks, setShowBreaks] = useState(defaultSettings.showBreaks);
  const [showOnlyOpeningHours, setShowOnlyOpeningHours] = useState(false);
  const [hideWeekends, setHideWeekends] = useState(false);
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
  const [selectedLocation, setSelectedLocation] = useState<string>(defaultSettings.selectedLocation);
  const [selectedStaff, setSelectedStaff] = useState<string>(defaultSettings.selectedStaff);
  const [selectedStaffForColumns, setSelectedStaffForColumns] = useState<string[]>(defaultSettings.selectedStaffForColumns); // Für Personenspalten-Auswahl
  const [useStaffColumns, setUseStaffColumns] = useState(defaultSettings.useStaffColumns); // Toggle zwischen alter und neuer Ansicht
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  
  // TimeBlock State
  const [timeBlocks, setTimeBlocks] = useState<any[]>([]);
  const [showTimeBlocks, setShowTimeBlocks] = useState(true); // Toggle für TimeBlocks
  const isLoadingTimeBlocksRef = useRef(false); // Flag um doppelte API-Aufrufe zu verhindern
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
    locationException?: any;
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
  
  const settingsLoadedRef = useRef(false);
  const isSavingRef = useRef(false); // Flag um Endlosschleife zu verhindern
  const isLoadingSettingsRef = useRef(false); // Flag um zu verhindern, dass saveCalendarSettings während des Ladens aufgerufen wird
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

  // Save calendar settings to user preferences
  const saveCalendarSettings = useCallback(async () => {
    if (!user || !settingsLoadedRef.current || isSavingRef.current || isLoadingSettingsRef.current) {
      // Nur speichern, wenn:
      // - User vorhanden ist
      // - Einstellungen bereits geladen wurden
      // - Nicht gerade gespeichert wird (verhindert Endlosschleife)
      // - Nicht gerade Einstellungen geladen werden
      if (isLoadingSettingsRef.current) {
        console.log('⏸️ Skipping save - settings are being loaded');
      }
      return;
    }
    
    // Prüfe, ob sich die Einstellungen tatsächlich geändert haben
    const savedSettings = (user as any)?.profile?.preferences?.calendarSettings;
    if (savedSettings) {
      const hasChanged = 
        savedSettings.useStaffColumns !== useStaffColumns ||
        JSON.stringify(savedSettings.selectedStaffForColumns || []) !== JSON.stringify(selectedStaffForColumns) ||
        savedSettings.selectedStaff !== selectedStaff ||
        savedSettings.selectedLocation !== selectedLocation ||
        savedSettings.showOpeningHours !== showLocationHours ||
        savedSettings.showWorkingHours !== showStaffHours ||
        savedSettings.showBreaks !== showBreaks ||
        savedSettings.viewMode !== viewMode;
      
      if (!hasChanged) {
        // Keine Änderungen - nicht speichern
        console.log('⏸️ Skipping save - no changes detected');
        return;
      }
      console.log('🔄 Changes detected - saving settings');
    }
    
    isSavingRef.current = true;
    
    try {
      const calendarSettings = {
        useStaffColumns,
        selectedStaffForColumns,
        selectedStaff,
        selectedLocation,
        showOpeningHours: showLocationHours,
        showWorkingHours: showStaffHours,
        showBreaks,
        viewMode,
        currentDate: currentDate.toISOString()
      };

      console.log('💾 Saving calendar settings:', calendarSettings);
      const response = await api.put('/auth/profile', {
        profile: {
          preferences: {
            ...(user as any)?.profile?.preferences,
            calendarSettings
          }
        }
      });
      
      if (response.success) {
        console.log('✅ Calendar settings saved successfully');
        // Aktualisiere den Redux Store direkt, ohne loadUser() aufzurufen
        // Das verhindert eine Endlosschleife, aktualisiert aber den Store
        dispatch(updateCalendarSettings(calendarSettings));
      }
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Kalender-Einstellungen:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [user, useStaffColumns, selectedStaffForColumns, selectedStaff, selectedLocation, showLocationHours, showStaffHours, showBreaks, viewMode, currentDate, dispatch]);

  // Helper function to load calendar settings from user
  const loadCalendarSettingsFromUser = useCallback(() => {
    if (!user || settingsLoadedRef.current) {
      return;
    }
    
    isLoadingSettingsRef.current = true; // Markiere, dass Einstellungen geladen werden
    const calendarSettings = (user as any)?.profile?.preferences?.calendarSettings;
    console.log('📥 Loading calendar settings from user preferences:', calendarSettings);
    if (calendarSettings) {
      // Setze alle Einstellungen synchron, um Race Conditions zu vermeiden
      // Verwende requestAnimationFrame, um sicherzustellen, dass alle State-Updates in einem Batch verarbeitet werden
      requestAnimationFrame(() => {
        // Batch alle State-Updates zusammen
        if (calendarSettings.useStaffColumns !== undefined) {
          setUseStaffColumns(calendarSettings.useStaffColumns);
        }
        if (calendarSettings.selectedStaffForColumns && Array.isArray(calendarSettings.selectedStaffForColumns)) {
          setSelectedStaffForColumns(calendarSettings.selectedStaffForColumns);
        }
        if (calendarSettings.selectedStaff) {
          setSelectedStaff(calendarSettings.selectedStaff);
        }
        if (calendarSettings.selectedLocation) {
          setSelectedLocation(calendarSettings.selectedLocation);
        }
        if (calendarSettings.showOpeningHours !== undefined) {
          setShowLocationHours(calendarSettings.showOpeningHours);
        }
        if (calendarSettings.showWorkingHours !== undefined) {
          setShowStaffHours(calendarSettings.showWorkingHours);
        }
        if (calendarSettings.showBreaks !== undefined) {
          setShowBreaks(calendarSettings.showBreaks);
        }
        if (calendarSettings.viewMode) {
          setViewMode(calendarSettings.viewMode);
        }
        if (calendarSettings.currentDate) {
          try {
            const savedDate = new Date(calendarSettings.currentDate);
            if (!isNaN(savedDate.getTime())) {
              // Prüfe, ob das gespeicherte Datum nicht zu alt ist (max. 1 Woche in der Vergangenheit)
              const now = new Date();
              const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              // Wenn das gespeicherte Datum zu alt ist, verwende das aktuelle Datum
              if (savedDate < oneWeekAgo) {
                console.log('📅 Saved date is too old, using current date instead');
                setCurrentDate(startOfWeek(new Date(), { locale: de, weekStartsOn: 1 }));
              } else {
                setCurrentDate(savedDate);
              }
            }
          } catch (e) {
            console.warn('Invalid date in calendar settings:', calendarSettings.currentDate);
            // Bei Fehler verwende das aktuelle Datum
            setCurrentDate(startOfWeek(new Date(), { locale: de, weekStartsOn: 1 }));
          }
        } else {
          // Kein gespeichertes Datum vorhanden - verwende aktuelles Datum
          setCurrentDate(startOfWeek(new Date(), { locale: de, weekStartsOn: 1 }));
        }
        settingsLoadedRef.current = true;
        console.log('✅ Calendar settings loaded successfully');
        // Warte länger, damit alle State-Updates verarbeitet werden, bevor wir das Flag zurücksetzen
        // Verwende requestAnimationFrame zweimal, um sicherzustellen, dass alle Updates verarbeitet wurden
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isLoadingSettingsRef.current = false;
            console.log('🔄 Loading flag reset - settings can now be saved');
          });
        });
      });
    } else {
      // Keine gespeicherten Einstellungen vorhanden - markiere als geladen, damit andere Hooks funktionieren
      settingsLoadedRef.current = true;
      console.log('ℹ️ No saved calendar settings found, using defaults');
      // Auch hier das Flag zurücksetzen
      requestAnimationFrame(() => {
        isLoadingSettingsRef.current = false;
      });
    }
  }, [user]);

  // Load settings when user is available (höchste Priorität - läuft zuerst)
  useEffect(() => {
    loadCalendarSettingsFromUser();
  }, [user, loadCalendarSettingsFromUser]);

  // Load settings on mount if user is already available
  useEffect(() => {
    loadCalendarSettingsFromUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Nur beim Mount

  // Save settings when they change (with debounce)
  useEffect(() => {
    if (!user || !settingsLoadedRef.current || isSavingRef.current || isLoadingSettingsRef.current) {
      // Nur speichern, wenn:
      // - User vorhanden ist
      // - Einstellungen bereits geladen wurden
      // - Nicht gerade gespeichert wird
      // - Nicht gerade Einstellungen geladen werden
      return;
    }
    
    const timeoutId = setTimeout(() => {
      saveCalendarSettings();
    }, 1000); // Debounce: Speichere 1 Sekunde nach der letzten Änderung

    return () => clearTimeout(timeoutId);
  }, [useStaffColumns, selectedStaffForColumns, selectedStaff, selectedLocation, showLocationHours, showStaffHours, showBreaks, viewMode, currentDate, saveCalendarSettings]);

  // Debug: Log appointments when they change
  useEffect(() => {
    if (appointments.length > 0) {
      console.log('📋 Loaded appointments:', appointments.length);
      // Log first appointment with assigned_users
      const firstWithStaff = appointments.find(apt => (apt as any).assigned_users && (apt as any).assigned_users.length > 0);
      if (firstWithStaff) {
        const assignedUsers = (firstWithStaff as any).assigned_users;
        const firstUser = assignedUsers[0];
        console.log('📋 Sample appointment with assigned_users:', {
          _id: firstWithStaff._id,
          title: firstWithStaff.title,
          assigned_users: assignedUsers,
          assigned_users_length: assignedUsers.length,
          assigned_users_first: firstUser,
          assigned_users_first_type: typeof firstUser,
          assigned_users_first_id: firstUser?._id || firstUser?.id || firstUser,
          assigned_users_first_full: JSON.stringify(firstUser, null, 2),
          doctor: firstWithStaff.doctor,
          doctor_type: typeof firstWithStaff.doctor,
          doctor_id: typeof firstWithStaff.doctor === 'string' ? firstWithStaff.doctor : (firstWithStaff.doctor as any)?._id,
          doctor_full: typeof firstWithStaff.doctor === 'object' ? JSON.stringify(firstWithStaff.doctor, null, 2) : firstWithStaff.doctor,
          assigned_users_type: typeof (firstWithStaff as any).assigned_users,
          assigned_users_isArray: Array.isArray((firstWithStaff as any).assigned_users)
        });
      }
      
      // Log all staff profiles to see user_ids
      console.log('👥 All staff profiles:', staffProfiles.map(s => ({
        _id: s._id,
        display_name: s.display_name,
        user_id: s.user_id,
        first_name: s.first_name,
        last_name: s.last_name
      })));
      
      // Log specific staff profile for Maria Brandt
      const mariaBrandt = staffProfiles.find(s => 
        s.display_name?.toLowerCase().includes('maria') && 
        s.display_name?.toLowerCase().includes('brandt')
      );
      if (mariaBrandt) {
        console.log('👤 Maria Brandt StaffProfile:', {
          _id: mariaBrandt._id,
          display_name: mariaBrandt.display_name,
          user_id: mariaBrandt.user_id,
          user_id_type: typeof mariaBrandt.user_id,
          user_id_isObject: typeof mariaBrandt.user_id === 'object' && mariaBrandt.user_id !== null,
          user_id_id: typeof mariaBrandt.user_id === 'object' && mariaBrandt.user_id !== null ? (mariaBrandt.user_id as any)?._id : mariaBrandt.user_id,
          user_id_stringified: JSON.stringify(mariaBrandt.user_id, null, 2),
          first_name: mariaBrandt.first_name,
          last_name: mariaBrandt.last_name
        });
      }
      
      // Log the first assigned_user details separately
      if (firstWithStaff) {
        const firstUser = (firstWithStaff as any).assigned_users[0];
        console.log('🔍 First assigned_user DETAILS:', firstUser);
        console.log('🔍 First assigned_user._id:', firstUser?._id);
        console.log('🔍 First assigned_user.id:', firstUser?.id);
        console.log('🔍 First assigned_user (stringified):', JSON.stringify(firstUser, null, 2));
      }
    }
  }, [appointments]);

  // Load data on mount
  useEffect(() => {
    dispatch(fetchAppointments());
    dispatch(fetchLocations());
    dispatch(fetchPatients(1));
    dispatch(fetchStaffProfiles());
    dispatch(fetchRooms());
    dispatch(fetchWaitingListCount({ status: 'waiting' }));
    // EnhancedCalendar: Lade Schedule-Daten
    dispatch(fetchLocationWeeklySchedules());
    dispatch(fetchWeeklySchedules());
    
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
  
  // Initialize selected location (nur wenn keine Einstellungen geladen wurden)
  useEffect(() => {
    // Warte, bis Einstellungen geladen wurden
    if (!settingsLoadedRef.current) return;
    
    // Nur setzen, wenn selectedLocation leer ist (nicht 'all' und nicht eine gültige Location-ID)
    if (locations.length > 0 && (!selectedLocation || selectedLocation === '')) {
      // Keine gespeicherte Einstellung vorhanden - setze Standard
      setSelectedLocation(locations.length === 1 ? locations[0]._id : locations[0]._id);
    }
  }, [locations, selectedLocation]);

  // Initialize selected locations - start with no locations selected
  // User must explicitly select locations to filter appointments
  const hasInitializedLocations = useRef(false);
  useEffect(() => {
    if (locations.length > 0 && !hasInitializedLocations.current) {
      // Start with no locations selected - show all appointments by default
      // User can then select specific locations to filter
      setSelectedLocations([]);
      hasInitializedLocations.current = true;
    }
  }, [locations]);

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

  // Helper function for time parsing (from EnhancedCalendar)
  const parseTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  };

  // Filter staff by medical/non-medical and location (from EnhancedCalendar)
  const filteredStaff = useMemo(() => {
    let filtered = staffProfiles;
    
    // Filter by medical/non-medical
    if (medicalFilter !== 'all') {
      filtered = filtered.filter(staff => {
        const medicalRoles = ['doctor', 'arzt', 'mediziner', 'Arzt', 'Mediziner', 'dr', 'Dr', 'doktor', 'physician', 'Physician'];
        const isMedical = medicalRoles.includes(staff.role);
        return medicalFilter === 'medical' ? isMedical : !isMedical;
      });
    }
    
    // Filter by location (if a single location is selected)
    if (selectedLocations.length === 1) {
      const selectedLocationId = selectedLocations[0];
      filtered = filtered.filter(staff => {
        const staffLocationIds = staff.locations?.map((loc: any) => loc._id || loc) || [];
        return staffLocationIds.includes(selectedLocationId);
      });
    }
    
    return filtered;
  }, [staffProfiles, medicalFilter, selectedLocations]);

  // Generate background events (location hours and staff hours) - from EnhancedCalendar
  const backgroundEvents = useMemo(() => {
    const events: BackgroundEvent[] = [];
    
    // Calculate start and end dates based on view mode
    let startDate: Date;
    let endDate: Date;
    
    switch (viewMode) {
      case 'day':
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
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
        // Filter by selected locations
        if (selectedLocations.length > 0 && !selectedLocations.includes(schedule.location_id._id)) return;
        
        schedule.schedules.forEach(daySchedule => {
          if (!daySchedule.isOpen) return;
          
          // Generate events for each day in the view
          let currentDateLoop = startDate;
          while (currentDateLoop <= endDate) {
            const dayOfWeek = currentDateLoop.getDay();
            const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
            
            if (daySchedule.day === dayKey) {
              const startTime = parseTime(daySchedule.startTime);
              const endTime = parseTime(daySchedule.endTime);
              
              const eventStart = new Date(currentDateLoop);
              eventStart.setHours(startTime.hours, startTime.minutes, 0, 0);
              
              const eventEnd = new Date(currentDateLoop);
              eventEnd.setHours(endTime.hours, endTime.minutes, 0, 0);
              
              events.push({
                id: `location-${schedule._id}-${daySchedule.day}-${currentDateLoop.getTime()}`,
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
            
            currentDateLoop = addDays(currentDateLoop, 1);
          }
        });
      });
    }

    // Staff working hours
    if (showStaffHours && weeklySchedules) {
      weeklySchedules.forEach(schedule => {
        if (!schedule.staffId || !schedule.staffId._id) return;
        
        const staff = filteredStaff.find(s => s._id === schedule.staffId._id);
        if (!staff || !staff.first_name || !staff.last_name) return;
        
        schedule.schedules.forEach(daySchedule => {
          if (!daySchedule.isWorking) return;
          
          // Generate events for each day in the view
          let currentDateLoop = startDate;
          while (currentDateLoop <= endDate) {
            const dayOfWeek = currentDateLoop.getDay();
            const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
            
            if (daySchedule.day === dayKey) {
              const startTime = parseTime(daySchedule.startTime);
              const endTime = parseTime(daySchedule.endTime);
              
              const eventStart = new Date(currentDateLoop);
              eventStart.setHours(startTime.hours, startTime.minutes, 0, 0);
              
              const eventEnd = new Date(currentDateLoop);
              eventEnd.setHours(endTime.hours, endTime.minutes, 0, 0);
              
              const staffName = `${staff.first_name} ${staff.last_name}`;
              const staffColor = staff?.color_hex || '#4CAF50';
              
              events.push({
                id: `staff-${schedule._id}-${daySchedule.day}-${currentDateLoop.getTime()}`,
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
                
                const breakStart = new Date(currentDateLoop);
                breakStart.setHours(breakStartTime.hours, breakStartTime.minutes, 0, 0);
                
                const breakEnd = new Date(currentDateLoop);
                breakEnd.setHours(breakEndTime.hours, breakEndTime.minutes, 0, 0);
                
                events.push({
                  id: `staff-break-${schedule._id}-${daySchedule.day}-${currentDateLoop.getTime()}`,
                  title: `${staffName} - Pause`,
                  start: breakStart,
                  end: breakEnd,
                  type: 'staff_hours',
                  color: '#FF9800',
                  opacity: 0.3,
                  staffId: schedule.staffId._id,
                  staffName: staffName,
                });
              }
            }
            
            currentDateLoop = addDays(currentDateLoop, 1);
          }
        });
      });
    }

    return events;
  }, [locationSchedules, weeklySchedules, selectedLocations, showLocationHours, showStaffHours, showBreaks, filteredStaff, currentDate, viewMode]);

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
    setSelectedLocations(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
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
        setCurrentDate(startOfWeek(new Date(), { locale: de, weekStartsOn: 1 }));
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
    setSelectedLocation(locations.length === 1 ? locations[0]._id : (selectedLocation || locations[0]?._id || ''));
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
    
    // Extrahiere assigned_users - finde die erste User-ID
    let assignedUserId = '';
    console.log('🔍 handleOpenEditEventDialog - Appointment data:', {
      apt,
      assigned_users: (apt as any).assigned_users,
      doctor: apt.doctor,
      assigned_users_type: typeof (apt as any).assigned_users,
      assigned_users_isArray: Array.isArray((apt as any).assigned_users),
      assigned_users_length: Array.isArray((apt as any).assigned_users) ? (apt as any).assigned_users.length : 0
    });
    
    if ((apt as any).assigned_users && Array.isArray((apt as any).assigned_users) && (apt as any).assigned_users.length > 0) {
      const firstUser = (apt as any).assigned_users[0];
      console.log('🔍 First assigned_user (full):', JSON.stringify(firstUser, null, 2));
      console.log('🔍 First assigned_user (parsed):', {
        type: typeof firstUser,
        _id: firstUser?._id,
        id: firstUser?.id,
        firstName: firstUser?.firstName,
        lastName: firstUser?.lastName,
        email: firstUser?.email,
        role: firstUser?.role,
        display_name: firstUser?.display_name,
        first_name: firstUser?.first_name,
        last_name: firstUser?.last_name
      });
      if (typeof firstUser === 'string') {
        assignedUserId = firstUser;
        console.log('✅ assignedUserId from string:', assignedUserId);
      } else if (typeof firstUser === 'object' && firstUser !== null) {
        assignedUserId = firstUser._id || firstUser.id || '';
        console.log('✅ assignedUserId from object:', assignedUserId);
      }
    }
    
    console.log('🔍 Extracted IDs:', { assignedUserId, doctorId });
    
    // Setze selectedStaff basierend auf assigned_users (prioritär) oder doctor
    // selectedStaff muss die user_id sein, nicht die StaffProfile-ID
    const staffUserId = assignedUserId || doctorId;
    console.log('🔍 Looking for staff with user_id:', staffUserId);
    console.log('🔍 Available staffProfiles:', staffProfiles.map(s => ({ _id: s._id, user_id: s.user_id, display_name: s.display_name })));
    
    if (staffUserId) {
      // Finde das StaffProfile mit dieser user_id
      // user_id kann ein String oder ein Objekt sein (wenn populated)
      const matchingStaff = staffProfiles.find(s => {
        const staffUserIdValue = typeof s.user_id === 'string' 
          ? s.user_id 
          : (typeof s.user_id === 'object' && s.user_id !== null ? (s.user_id as any)?._id : null);
        return staffUserIdValue === staffUserId;
      });
      console.log('🔍 Matching staff found:', matchingStaff);
      if (matchingStaff) {
        // selectedStaff sollte die user_id sein (wie im Select verwendet)
        console.log('✅ Setting selectedStaff to:', staffUserId);
        setSelectedStaff(staffUserId);
      } else {
        console.warn('⚠️ No matching staff found for user_id:', staffUserId);
        console.warn('⚠️ Available user_ids:', staffProfiles.map(s => ({
          display_name: s.display_name,
          user_id: s.user_id,
          user_id_type: typeof s.user_id,
          user_id_id: typeof s.user_id === 'object' && s.user_id !== null ? (s.user_id as any)?._id : s.user_id
        })));
        setSelectedStaff('');
      }
    } else {
      console.warn('⚠️ No staffUserId found (assignedUserId or doctorId)');
      setSelectedStaff('');
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
    // Verhindere doppelte API-Aufrufe
    if (isLoadingTimeBlocksRef.current) {
      return;
    }
    
    isLoadingTimeBlocksRef.current = true;
    
    try {
      const startDate = startOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
      const endDate = endOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
      
      // Lade TimeBlocks für den aktuellen Zeitraum
      
      const response = await api.get('/time-blocks', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
        // Kein Status-Filter beim Laden - wir filtern in der Filterlogik nach 'blocked' und 'merged'
      });
      
      // Verarbeite API Response
      
      if (response.success && response.data) {
        // Backend gibt {success: true, data: Array, pagination: {...}} zurück
        // Frontend API-Client wrappt das in response.data, also ist das Array unter response.data.data
        const backendResponse = response.data as any;
        const blocks = Array.isArray(backendResponse?.data) 
          ? backendResponse.data 
          : Array.isArray(backendResponse) 
            ? backendResponse 
            : [];
        // TimeBlocks erfolgreich geladen
        setTimeBlocks(blocks);
      } else {
        // Keine TimeBlocks in Response
        setTimeBlocks([]);
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der TimeBlocks:', error);
      setTimeBlocks([]);
    } finally {
      isLoadingTimeBlocksRef.current = false;
    }
  }, [currentDate]);

  const loadLocationExceptions = useCallback(async () => {
    try {
      if (!selectedLocation || selectedLocation === 'all') {
        console.log('📅 loadLocationExceptions: No location selected, clearing exceptions');
        setLocationExceptions([]);
        return;
      }
      
      const startDate = startOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
      const endDate = endOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
      
      console.log('📅 Loading location exceptions:', {
        selectedLocation,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        currentDate: format(currentDate, 'yyyy-MM-dd')
      });
      
      const response = await api.get('/locations/exceptions', {
        location_id: selectedLocation,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      
      console.log('📅 API response for location exceptions:', response);
      
      if (response.success && response.data) {
        // Die API gibt {success: true, data: [...]} zurück, aber api.js wrappt es in {data: {success: true, data: [...]}}
        // Daher müssen wir response.data.data verwenden, wenn response.data.data existiert, sonst response.data
        const responseData = response.data as any;
        const data = (responseData && responseData.data) ? responseData.data : responseData;
        const exceptions = Array.isArray(data) ? data : [];
        console.log('📅 Loaded location exceptions:', exceptions.length, exceptions);
        console.log('📅 Exception details:', exceptions.map((exc: any) => ({
          _id: exc._id,
          date: exc.date ? format(new Date(exc.date), 'yyyy-MM-dd') : 'no date',
          location_id: typeof exc.location_id === 'object' && exc.location_id !== null
            ? exc.location_id._id || exc.location_id
            : exc.location_id,
          isActive: exc.isActive,
          startTime: exc.startTime,
          endTime: exc.endTime
        })));
        setLocationExceptions(exceptions);
      } else {
        console.log('⚠️ No location exceptions in response:', response);
        setLocationExceptions([]);
      }
    } catch (error) {
      console.error('❌ Error loading location exceptions:', error);
      setLocationExceptions([]);
    }
  }, [currentDate, selectedLocation]);

  // Load TimeBlocks and LocationExceptions when currentDate changes
  useEffect(() => {
    // Warte kurz, damit Settings geladen werden können, bevor TimeBlocks geladen werden
    const timer = setTimeout(() => {
      loadTimeBlocks();
      loadLocationExceptions();
    }, 100);
    return () => clearTimeout(timer);
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
      
      // Extract location ID from exception data
      const exceptionLocationId = typeof exceptionData?.location_id === 'object' && exceptionData?.location_id !== null
        ? exceptionData.location_id._id || exceptionData.location_id
        : exceptionData?.location_id;
      
      // Always reload location exceptions to ensure synchronization
      // This ensures that when the user switches locations or navigates to the week,
      // the exception will be loaded if it matches the selected location
      console.log('📢 Reloading location exceptions after creation to ensure synchronization...');
      loadLocationExceptions();
    };
    
    const handleExceptionUpdated = (exceptionData: any) => {
      console.log('📢 Received LOCATION_EXCEPTION_UPDATED event:', exceptionData);
      console.log('📢 Current selectedLocation:', selectedLocation);
      
      // Extract location ID from exception data
      const exceptionLocationId = typeof exceptionData?.location_id === 'object' && exceptionData?.location_id !== null
        ? exceptionData.location_id._id || exceptionData.location_id
        : exceptionData?.location_id;
      
      // Check if exception is for current location and within current week
      // If yes, update it directly in the list for immediate feedback
      if (selectedLocation && selectedLocation !== 'all' && String(exceptionLocationId) === String(selectedLocation)) {
        const exceptionDate = new Date(exceptionData.date);
        const startDate = startOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
        const endDate = endOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
        
        if (exceptionDate >= startDate && exceptionDate <= endDate) {
          console.log('📢 Exception is for current location and week, updating in list...');
          setLocationExceptions((prev: any[]) => {
            const exists = prev.some((exc: any) => String(exc._id) === String(exceptionData._id));
            if (exists) {
              return prev.map((exc: any) => 
                String(exc._id) === String(exceptionData._id) ? exceptionData : exc
              );
            }
            return [...prev, exceptionData];
          });
          return;
        }
      }
      
      // Otherwise, reload all exceptions
      console.log('📢 Reloading location exceptions after update...');
      loadLocationExceptions();
    };
    
    const handleExceptionDeleted = (exceptionIdOrData: any) => {
      console.log('📢 Received LOCATION_EXCEPTION_DELETED event:', exceptionIdOrData);
      
      // If we received the full exception data, check location
      if (exceptionIdOrData && typeof exceptionIdOrData === 'object' && exceptionIdOrData.location_id) {
        const exceptionLocationId = typeof exceptionIdOrData.location_id === 'object' && exceptionIdOrData.location_id !== null
          ? exceptionIdOrData.location_id._id || exceptionIdOrData.location_id
          : exceptionIdOrData.location_id;
        
        if (selectedLocation && selectedLocation !== 'all' && String(exceptionLocationId) === String(selectedLocation)) {
          console.log('📢 Exception is for current location, removing from list...');
          setLocationExceptions((prev: any[]) => 
            prev.filter((exc: any) => String(exc._id) !== String(exceptionIdOrData._id || exceptionIdOrData))
          );
          return;
        }
      }
      
      // Otherwise, reload all exceptions
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
  }, [loadLocationExceptions, selectedLocation, currentDate]);

  // Handle Block Time
  const handleBlockTime = (start: Date, end: Date, staffId?: string) => {
    // Öffne Dialog für Namenseingabe
    const initialStaff = staffId || (selectedStaff !== 'all' ? selectedStaff : '');
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
        locationId: selectedLocation !== 'all' ? selectedLocation : undefined,
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
            const responseData = exceptionsResponse.data as any;
            const data = (responseData && responseData.data) ? responseData.data : responseData;
            const exceptions = Array.isArray(data) ? data : [];
            const existingException = exceptions.find((exc: any) => {
              const excDate = new Date(exc.date);
              return excDate.toDateString() === startDate.toDateString();
            });
            
            if (existingException) {
              // Öffne Dialog im Edit-Modus
              setSelectedException(existingException);
              setExceptionFormData({
                date: format(new Date(existingException.date), 'yyyy-MM-dd'),
                startTime: existingException.startTime,
                endTime: existingException.endTime,
                breakStart: existingException.breakStart || '',
                breakEnd: existingException.breakEnd || '',
                label: existingException.label || 'Sonderöffnung',
                assignedStaff: existingException.assignedStaff ? 
                  existingException.assignedStaff.map((staff: any) => 
                    typeof staff === 'object' && staff !== null ? (staff._id || staff) : staff
                  ) : []
              });
              setExceptionDialogOpen(true);
              setSnackbar({
                open: true,
                message: 'Eine Ausnahme für dieses Datum existiert bereits. Sie können sie jetzt bearbeiten.',
                severity: 'info'
              });
              return;
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
  
  const handleDeleteException = async (exceptionId: string) => {
    try {
      if (!selectedLocation || selectedLocation === 'all') {
        return;
      }
      
      const confirmed = window.confirm('Möchten Sie diese Sonderöffnung wirklich löschen?');
      if (!confirmed) {
        return;
      }
      
      const response = await api.delete(`/locations/${selectedLocation}/exceptions/${exceptionId}`);
      
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
      const assignedDevices = selectedService?.assigned_devices?.map((d: { _id: string }) => d._id || d) || [];
      const assignedUsers = selectedService?.assigned_users?.map((u: { _id: string }) => u._id || u) || [];
      
      // Add selected staff
      if (selectedStaff) {
        // Stelle sicher, dass selectedStaff nicht bereits in assignedUsers ist
        if (!assignedUsers.includes(selectedStaff)) {
        assignedUsers.push(selectedStaff);
        }
      }

      console.log('💾 Creating appointment with staff data:', {
        selectedStaff,
        assignedUsers,
        selectedService: selectedService?.name,
        serviceAssignedUsers: selectedService?.assigned_users
      });

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
        assigned_devices: assignedDevices,
        assigned_users: assignedUsers,
        room: formData.room ? (typeof formData.room === 'string' ? formData.room : (formData.room as any)?._id || formData.room) : undefined,
        status: formData.status || 'geplant',
        bookingType: 'internal' as 'online' | 'internal',
      };
      
      console.log('💾 Full appointment data being sent:', newAppointment);
      
      try {
        const result = await dispatch(createAppointment(newAppointment)).unwrap();
        console.log('✅ Appointment created successfully:', result);
        setSnackbar({ open: true, message: 'Termin erfolgreich hinzugefügt', severity: 'success' });
        
        // Navigate to the week of the created appointment
        if (date) {
          const appointmentDate = new Date(date);
          if (!isNaN(appointmentDate.getTime())) {
            const weekStart = startOfWeek(appointmentDate, { locale: de, weekStartsOn: 1 });
            setCurrentDate(weekStart);
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

  if (appointmentsLoading || locationsLoading || locationSchedulesLoading || weeklySchedulesLoading) {
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
          px: 3,
          py: 1.5,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Dienstkalender
          </Typography>
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
        </Box>

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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            size="small"
            onClick={handleNewPatient}
            sx={{ bgcolor: 'primary.main' }}
          >
            Neuer Patient
          </Button>
          <IconButton size="small">
            <Wifi />
          </IconButton>
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
          <IconButton size="small">
            <Euro />
          </IconButton>
          <IconButton size="small">
            <Help />
          </IconButton>
          <IconButton size="small">
            <Build />
          </IconButton>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            MM
          </Box>
          <IconButton size="small">
            <Fullscreen />
          </IconButton>
        </Box>
      </Box>

      {/* Calendar Controls */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 1.5,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {viewMode === 'month' ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={currentDate.getMonth()}
                onChange={(e) => {
                  const newMonth = e.target.value as number;
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newMonth);
                  setCurrentDate(newDate);
                }}
                sx={{ fontWeight: 500 }}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((month) => (
                  <MenuItem key={month} value={month}>
                    {format(new Date(2000, month, 1), 'MMMM', { locale: de })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={currentDate.getFullYear()}
                onChange={(e) => {
                  const newYear = e.target.value as number;
                  const newDate = new Date(currentDate);
                  newDate.setFullYear(newYear);
                  setCurrentDate(newDate);
                }}
                sx={{ fontWeight: 500 }}
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - 5 + i;
                  return (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Box>
        ) : (
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            {viewMode === 'week' && `KW ${format(currentDate, 'w', { locale: de })} ${format(currentDate, 'yyyy', { locale: de })}`}
            {viewMode === 'day' && format(currentDate, 'dd. MMMM yyyy', { locale: de })}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant={viewMode === 'day' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setViewMode('day')}
          >
            Tag
          </Button>
          <Button
            variant={viewMode === 'week' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setViewMode('week')}
          >
            Woche
          </Button>
          <Button
            variant={viewMode === 'month' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setViewMode('month')}
          >
            Monat
          </Button>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => handleDateNavigation('prev')}>
            <ArrowBackIos fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleDateNavigation('next')}>
            <ArrowForwardIos fontSize="small" />
          </IconButton>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Today />}
            onClick={() => handleDateNavigation('today')}
          >
            Heute
          </Button>
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
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <Box
          sx={{
            width: 280,
            bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#1e3a5f',
            color: theme.palette.mode === 'dark' ? 'text.primary' : 'white',
            display: 'flex',
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

          {/* EnhancedCalendar Filter */}
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Filter
            </Typography>
            
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : 'rgba(255,255,255,0.7)' }}>Personal</InputLabel>
              <Select
                value={medicalFilter}
                onChange={(e) => setMedicalFilter(e.target.value as 'all' | 'medical' | 'non-medical')}
                sx={{ 
                  color: theme.palette.mode === 'dark' ? 'text.primary' : 'white',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? 'divider' : 'rgba(255,255,255,0.3)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.mode === 'dark' ? 'primary.main' : 'rgba(255,255,255,0.5)' },
                  '& .MuiSvgIcon-root': { color: theme.palette.mode === 'dark' ? 'text.secondary' : 'rgba(255,255,255,0.7)' }
                }}
              >
                <MenuItem value="all">Alle</MenuItem>
                <MenuItem value="medical">Medizinisch</MenuItem>
                <MenuItem value="non-medical">Nicht-medizinisch</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : 'rgba(255,255,255,0.7)', mb: 1, display: 'block' }}>
                Anzeigeoptionen
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={showLocationHours}
                    onChange={(e) => setShowLocationHours(e.target.checked)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#ffc107' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#ffc107' }
                    }}
                  />
                }
                label={<Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'text.primary' : 'white', fontSize: '0.75rem' }}>Öffnungszeiten</Typography>}
                sx={{ mb: 0.5 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showStaffHours}
                    onChange={(e) => setShowStaffHours(e.target.checked)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#ffc107' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#ffc107' }
                    }}
                  />
                }
                label={<Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'text.primary' : 'white', fontSize: '0.75rem' }}>Arbeitszeiten</Typography>}
                sx={{ mb: 0.5 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showBreaks}
                    onChange={(e) => setShowBreaks(e.target.checked)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#ffc107' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#ffc107' }
                    }}
                  />
                }
                label={<Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'text.primary' : 'white', fontSize: '0.75rem' }}>Pausen</Typography>}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showTimeBlocks}
                    onChange={(e) => setShowTimeBlocks(e.target.checked)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#f44336' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#f44336' }
                    }}
                  />
                }
                label={<Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'text.primary' : 'white', fontSize: '0.75rem' }}>Geblockte Termine</Typography>}
              />
            </Box>
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
                        setCurrentDate(startOfWeek(day, { locale: de, weekStartsOn: 1 }));
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
                      color: isCurrentDay ? 'white' : 'white',
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

          {/* Person-Auswahl für Spalten (unterhalb des Monatskalenders) */}
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 1 }} />
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Personen-Auswahl
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={useStaffColumns}
                    onChange={(e) => {
                      setUseStaffColumns(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedStaffForColumns([]);
                      }
                    }}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#ffc107' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#ffc107' }
                    }}
                  />
                }
                label={<Typography variant="caption" sx={{ color: 'white', fontSize: '0.75rem' }}>Personenspalten aktivieren</Typography>}
              />
            </Box>
            {useStaffColumns && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 200, overflowY: 'auto' }}>
                {filteredStaff.map((staff) => {
                  const isSelected = selectedStaffForColumns.includes(staff._id);
                  const staffName = staff.display_name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Unbekannt';
                  const initials = staffName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);
                  
                  return (
                    <FormControlLabel
                      key={staff._id}
                      control={
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStaffForColumns([...selectedStaffForColumns, staff._id]);
                            } else {
                              setSelectedStaffForColumns(selectedStaffForColumns.filter(id => id !== staff._id));
                            }
                          }}
                          size="small"
                          sx={{
                            color: theme.palette.mode === 'dark' ? 'text.secondary' : 'rgba(255,255,255,0.7)',
                            '&.Mui-checked': { color: '#ffc107' }
                          }}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: staff.color_hex || '#6B7280',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '0.65rem',
                              fontWeight: 600
                            }}
                          >
                            {initials}
                          </Box>
                          <Typography variant="caption" sx={{ color: 'white', fontSize: '0.75rem' }}>
                            {staffName}
                          </Typography>
                        </Box>
                      }
                      sx={{ mb: 0 }}
                    />
                  );
                })}
                {filteredStaff.length === 0 && (
                  <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                    Keine Personen verfügbar
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>

        {/* Main Calendar Grid */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', bgcolor: 'background.default' }}>
          {/* Day Headers */}
          {viewMode === 'month' ? (
            // Monatsansicht: Einfache Header
          <Box sx={{ display: 'flex', borderBottom: '2px solid', borderColor: 'divider' }}>
            <Box sx={{ width: 80, p: 1 }} /> {/* Time column spacer */}
              {Array.from({ length: 7 }, (_, i) => {
                const day = addDays(startOfWeek(currentDate, { locale: de, weekStartsOn: 1 }), i);
                return (
                  <Box
                    key={i}
                    sx={{
                      flex: 1,
                      p: 1,
                      textAlign: 'center',
                      borderLeft: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {format(day, 'EEE', { locale: de })}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          ) : useStaffColumns && selectedStaffForColumns.length > 0 ? (
            // Neue Ansicht: Wochentage oben, dann Personenspalten
            <>
              {/* Wochentage Header (Ebene 1) */}
              <Box sx={{ display: 'flex', borderBottom: '2px solid', borderColor: 'divider', bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#424242' }}>
                <Box sx={{ width: 80, p: 1 }} /> {/* Time column spacer */}
                {displayedDays.map((day) => {
                  const staffCount = selectedStaffForColumns.length;
                  return (
                    <Box
                      key={day.toISOString()}
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
                      sx={{
                        flex: staffCount,
                        p: 1,
                        textAlign: 'center',
                        borderLeft: '1px solid',
                        borderColor: theme.palette.mode === 'dark' ? 'divider' : 'rgba(255,255,255,0.2)',
                        color: theme.palette.mode === 'dark' ? 'text.primary' : 'white',
                        cursor: 'context-menu',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {format(day, 'EEE', { locale: de })} ({format(day, 'd.M.')})
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
              {/* Personenspalten Header (Ebene 2) */}
              <Box sx={{ display: 'flex', borderBottom: '2px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                <Box sx={{ width: 80, p: 1 }} /> {/* Time column spacer */}
                {displayedDays.map((day) => (
                  <Box key={day.toISOString()} sx={{ display: 'flex', flex: 1 }}>
                    {selectedStaffForColumns.map((staffId) => {
                      const staff = filteredStaff.find(s => s._id === staffId);
                      if (!staff) return null;
                      const staffName = staff.display_name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Unbekannt';
                      const initials = staffName
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .substring(0, 2);
                      
                      return (
                        <Box
                          key={`${day.toISOString()}-${staffId}`}
                          sx={{
                            flex: 1,
                            p: 0.75,
                            textAlign: 'center',
                            borderLeft: '1px solid',
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              bgcolor: staff.color_hex || '#6B7280',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '0.7rem',
                              fontWeight: 600
                            }}
                          >
                            {initials}
                          </Box>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 500, color: 'text.primary' }}>
                            {staffName}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            </>
          ) : (
            // Alte Ansicht: Einfache Header
            <Box sx={{ display: 'flex', borderBottom: '2px solid', borderColor: 'divider' }}>
              <Box sx={{ width: 80, p: 1 }} /> {/* Time column spacer */}
              {displayedDays.map((day) => (
                <Box
                  key={day.toISOString()}
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
                  sx={{
                    flex: 1,
                    p: 1,
                    textAlign: 'center',
                    borderLeft: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                    cursor: 'context-menu',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {format(day, 'EEE', { locale: de })} {format(day, 'd.')}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Time Grid */}
          <Box sx={{ display: 'flex', flex: 1, position: 'relative' }}>
            {/* Time Scale */}
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

            {/* Calendar Columns */}
            {viewMode === 'month' ? (
              // Monatsansicht: Grid-Layout ohne Zeitslots
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, overflow: 'auto' }}>
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
                      sx={{
                        minHeight: 100,
                        borderLeft: '1px solid',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        p: 0.5,
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
                        {dayAppointments.slice(0, 3).map((appointment) => {
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
                          
                          // Finde Staff-Name
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
                          
                          return (
                            <Tooltip
                            key={appointment.id}
                              title={tooltipText}
                              arrow
                            >
                              <Paper
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
                                  transition: 'all 0.2s ease',
                                  '&:hover': { 
                                    opacity: 0.9,
                                    transform: 'scale(1.02)',
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
                            {(() => {
                              const apt = appointment.appointment;
                              const patient = apt?.patient;
                              let patientObj: any = null;
                              
                              if (patient) {
                                if (typeof patient === 'object' && patient !== null) {
                                  patientObj = patient;
                                }
                              }
                              
                              // Prüfe Allergien frühzeitig
                              const hasAllergies = patientObj && patientObj.allergies && Array.isArray(patientObj.allergies) && patientObj.allergies.length > 0;
                              
                              return (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                                  <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                              {format(appointment.start, 'HH:mm')} {appointment.patientName}
                            </Typography>
                                  {hasAllergies && (
                                    <Warning sx={{ fontSize: '0.65rem', color: '#ff9800' }} />
                                  )}
                                </Box>
                              );
                            })()}
                            {(() => {
                              const apt = appointment.appointment;
                              
                              // Finde Staff-Name
                              const staffName = (apt as any)?.assigned_users?.[0] 
                                ? `${(apt as any).assigned_users[0].firstName || (apt as any).assigned_users[0].first_name || ''} ${(apt as any).assigned_users[0].lastName || (apt as any).assigned_users[0].last_name || ''}`.trim()
                                : (apt as any)?.doctor 
                                  ? (typeof (apt as any).doctor === 'object' 
                                    ? `${(apt as any).doctor.firstName || ''} ${(apt as any).doctor.lastName || ''}`.trim()
                                    : '')
                                  : '';
                              
                              const patient = apt?.patient;
                              let patientId: string | null = null;
                              
                              if (patient) {
                                if (typeof patient === 'string') {
                                  patientId = patient;
                                } else if (typeof patient === 'object' && patient !== null) {
                                  patientId = (patient as any)._id || (patient as any).id || null;
                                }
                              }
                              
                              // Finde Hauptdiagnose - auch wenn status nicht 'active' ist, solange isPrimary true ist
                              const diagnoses = patientId ? patientDiagnoses.filter((d: PatientDiagnosis) => d.patientId === patientId) : [];
                              // Suche zuerst nach aktiver Hauptdiagnose, dann nach jeder Hauptdiagnose
                              let primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary && d.status === 'active');
                              if (!primaryDiagnosis) {
                                primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary);
                              }
                              
                              if (!primaryDiagnosis && !staffName) return null;
                              
                              return (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.25 }}>
                                  {staffName && (
                                    <Typography variant="caption" sx={{ fontSize: '0.55rem', opacity: 0.9, fontWeight: 500 }}>
                                      👤 {staffName}
                                    </Typography>
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
                          </Tooltip>
                        );
                        })}
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
            ) : useStaffColumns && selectedStaffForColumns.length > 0 ? (
              // Neue Ansicht: Personenspalten
              <Box sx={{ display: 'flex', flex: 1 }}>
                {displayedDays.map((day) => (
                  <Box 
                    key={day.toISOString()} 
                    sx={{ display: 'flex', flex: 1, borderLeft: '1px solid', borderColor: 'divider' }}
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
                    {selectedStaffForColumns.map((staffId, staffIndex) => {
                      const staff = filteredStaff.find(s => s._id === staffId);
                      if (!staff) return null;
                      
                      // Filtere Termine für diesen Tag und diese Person
                      // staffId ist eine StaffProfile-ID, aber assigned_users enthält User-IDs
                      // Wir müssen die User-ID aus dem StaffProfile holen
                      // user_id kann ein String oder ein Objekt sein (wenn populated)
                      const staffUserId = typeof staff.user_id === 'string' 
                        ? staff.user_id 
                        : (typeof staff.user_id === 'object' && staff.user_id !== null ? (staff.user_id as any)?._id : null);
                      
                      const dayAppointments = getAppointmentsForDay(day).filter(apt => {
                        const aptObj = apt.appointment;
                        
                        // Prüfe assigned_users (enthält User-IDs als Objekte oder Strings)
                        const assignedUserIds: string[] = [];
                        if ((aptObj as any)?.assigned_users) {
                          if (Array.isArray((aptObj as any).assigned_users)) {
                            (aptObj as any).assigned_users.forEach((user: any) => {
                              if (typeof user === 'string') {
                                assignedUserIds.push(user);
                              } else if (user && (user._id || user.id)) {
                                assignedUserIds.push(user._id || user.id);
                              }
                            });
                          }
                        }
                        
                        // Prüfe doctor (kann User-ID als String oder Objekt sein)
                        let doctorUserId: string | null = null;
                        if ((aptObj as any)?.doctor) {
                          if (typeof (aptObj as any).doctor === 'string') {
                            doctorUserId = (aptObj as any).doctor;
                          } else if (typeof (aptObj as any).doctor === 'object' && (aptObj as any).doctor !== null) {
                            doctorUserId = (aptObj as any).doctor._id || (aptObj as any).doctor.id || null;
                          }
                        }
                        
                        const matches = assignedUserIds.includes(staffUserId) || doctorUserId === staffUserId;
                        
                        // Debug-Log für alle Termine (nur für den ersten Termin pro Tag, um Log-Spam zu vermeiden)
                        if (apt.id === getAppointmentsForDay(day)[0]?.id) {
                          console.log('🔍 Filtering appointment - DEBUG:', {
                            appointmentId: apt.id,
                            patientName: apt.patientName,
                            assigned_users_raw: (aptObj as any)?.assigned_users,
                            assignedUserIds,
                            doctor_raw: (aptObj as any)?.doctor,
                            doctorUserId,
                            staffUserId,
                            staffDisplayName: staff.display_name,
                            matches,
                            assignedUserIds_includes: assignedUserIds.includes(staffUserId),
                            doctorUserId_equals: doctorUserId === staffUserId
                          });
                        }
                        
                        // Vergleiche mit der User-ID des StaffProfiles
                        return matches;
                      });
                      
                      // Debug-Log nach Filterung
                      if (dayAppointments.length > 0) {
                        console.log(`🔍 Filtered appointments for ${staff.display_name} on ${format(day, 'dd.MM.yyyy')}:`, dayAppointments.length, dayAppointments.map(a => a.patientName));
                      }
                      
                      // Filtere Background Events für diese Person
                      const dayBackgroundEvents = backgroundEvents.filter(event => {
                        if (!isSameDay(event.start, day)) return false;
                        if (event.type === 'staff_hours' && event.staffId === staffId) return true;
                        if (event.type === 'location_hours') return true; // Location hours für alle
                        return false;
                      });
                      
                      const locationHours = dayBackgroundEvents.filter(event => event.type === 'location_hours');
                      const staffHours = dayBackgroundEvents.filter(event => event.type === 'staff_hours');
                      
                      return (
                        <Box
                          key={`${day.toISOString()}-${staffId}`}
                          sx={{
                            flex: 1,
                            borderRight: '1px solid #e0e0e0',
                            position: 'relative',
                            minHeight: `${timeSlots.length * 40}px`, // Ensure container has minimum height
                            height: `${timeSlots.length * 40}px`, // Explicit height for proper positioning
                            overflow: 'visible', // Ensure TimeBlocks are not clipped
                          }}
                        >
                          {/* Location Hours - Hintergrund (volle Breite) */}
                          {locationHours.map((bgEvent) => {
                            const startMinutes = bgEvent.start.getHours() * 60 + bgEvent.start.getMinutes();
                            const endMinutes = bgEvent.end.getHours() * 60 + bgEvent.end.getMinutes();
                            const duration = endMinutes - startMinutes;
                            const top = ((startMinutes - 360) / 30) * 40;
                            const height = Math.max((duration / 30) * 40, 40);
                            
                            return (
                              <Tooltip key={bgEvent.id} title={`${bgEvent.locationName || 'Standort'} - Öffnungszeiten\n${format(bgEvent.start, 'HH:mm')} - ${format(bgEvent.end, 'HH:mm')}`} arrow>
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    bgcolor: bgEvent.color,
                                    opacity: bgEvent.opacity,
                                    zIndex: 0,
                                    pointerEvents: 'auto',
                                    cursor: 'help',
                                  }}
                                />
                              </Tooltip>
                            );
                          })}
                          
                          {/* Staff Hours für diese Person */}
                          {staffHours.map((bgEvent) => {
                            const startMinutes = bgEvent.start.getHours() * 60 + bgEvent.start.getMinutes();
                            const endMinutes = bgEvent.end.getHours() * 60 + bgEvent.end.getMinutes();
                            const duration = endMinutes - startMinutes;
                            const top = ((startMinutes - 360) / 30) * 40;
                            const height = Math.max((duration / 30) * 40, 40);
                            const isBreak = bgEvent.title.includes('Pause');
                            
                            return (
                              <Tooltip key={bgEvent.id} title={isBreak ? `Pause\n${bgEvent.staffName}\n${format(bgEvent.start, 'HH:mm')} - ${format(bgEvent.end, 'HH:mm')}` : `${bgEvent.staffName} - Arbeitszeit\n${format(bgEvent.start, 'HH:mm')} - ${format(bgEvent.end, 'HH:mm')}`} arrow>
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    bgcolor: isBreak ? '#FF9800' : bgEvent.color,
                                    opacity: isBreak ? 0.8 : 0.7,
                                    zIndex: 1,
                                    pointerEvents: 'auto',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    padding: '2px 4px',
                                    cursor: 'help',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      opacity: isBreak ? 0.9 : 0.85,
                                      transform: 'scale(1.02)',
                                      zIndex: 2,
                                    },
                                  }}
                                >
                                  <Typography variant="caption" sx={{ color: 'white', fontSize: '10px', fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0,0,0,0.8)', textAlign: 'center' }}>
                                    {isBreak ? 'PAUSE' : (bgEvent.staffName || 'Unbekannt')}
                                  </Typography>
                                  {height > 50 && (
                                    <Typography variant="caption" sx={{ color: 'white', fontSize: '8px', textShadow: '1px 1px 2px rgba(0,0,0,0.8)', opacity: 0.9, mt: 0.25, textAlign: 'center' }}>
                                      {format(bgEvent.start, 'HH:mm')} - {format(bgEvent.end, 'HH:mm')}
                                    </Typography>
                                  )}
                                </Box>
                              </Tooltip>
                            );
                          })}
                          
                          {/* Time Slots */}
                          {timeSlots.map((time) => {
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
                                      // WICHTIG: staffId aus selectedStaffForColumns ist eine StaffProfile ID
                                      // Wir müssen die StaffProfile ID in User ID umwandeln
                                      const staff = filteredStaff.find(s => s._id === staffId);
                                      const staffUserId = staff ? (
                                        typeof staff.user_id === 'string' 
                                          ? staff.user_id 
                                          : (typeof staff.user_id === 'object' && staff.user_id !== null ? (staff.user_id as any)?._id : null)
                                      ) : null;
                                      
                                      setContextMenuAnchor({
                                        x: e.clientX,
                                        y: e.clientY,
                                        start: range.start,
                                        end: range.end,
                                        staffId: staffUserId || undefined
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
                          
                          {/* TimeBlocks für diese Person - Nur anzeigen, wenn sie für dieses Personal sind */}
                          {/* WICHTIG: Zusammengeführte TimeBlocks (status='merged') werden NICHT mehr als TimeBlocks angezeigt, 
                              da sie bereits als normale Appointments erscheinen */}
                          {showTimeBlocks && useStaffColumns && timeBlocks
                            .filter((block: any) => {
                              // Einfache Filterung: Nur blocked (zusammengeführte werden nicht mehr angezeigt)
                              if (block.status !== 'blocked') {
                                return false;
                              }
                              
                              const blockDate = startOfDay(new Date(block.startTime));
                              const dayDate = startOfDay(day);
                              if (!isSameDay(blockDate, dayDate)) {
                                return false;
                              }
                              
                              // Staff-Filter: TimeBlocks mit Personal nur für das entsprechende Personal anzeigen
                              // TimeBlocks ohne Personal werden für alle angezeigt
                              // Unterstütze sowohl staffId als auch doctor (für Rückwärtskompatibilität)
                              const blockStaffId = block.staffId?._id || block.staffId || block.doctor?._id || block.doctor || null;
                              
                              // WICHTIG: staffId aus selectedStaffForColumns ist eine StaffProfile ID
                              // blockStaffId ist eine User ID
                              // Wir müssen die StaffProfile ID in User ID umwandeln
                              const staff = filteredStaff.find(s => s._id === staffId);
                              const staffUserId = staff ? (
                                typeof staff.user_id === 'string' 
                                  ? staff.user_id 
                                  : (typeof staff.user_id === 'object' && staff.user_id !== null ? (staff.user_id as any)?._id : null)
                              ) : null;
                              
                              
                              if (blockStaffId) {
                                // TimeBlock hat ein Personal zugewiesen - zeige NUR bei dieser Person
                                // Vergleiche blockStaffId (User ID) mit staffUserId (User ID)
                                if (!staffUserId || String(blockStaffId) !== String(staffUserId)) {
                                  return false; // Nicht für diese Person - nicht anzeigen
                                }
                                // Wenn blockStaffId === staffUserId, dann anzeigen (return true weiter unten)
                              } else {
                                // Wenn kein Personal zugewiesen ist (blockStaffId === null), wird der Block für alle angezeigt
                                // Das ist korrekt - TimeBlocks ohne Personal blockieren alle
                              }
                              
                              return true;
                            })
                            .map((block: any) => {
                              const blockStart = new Date(block.startTime);
                              const blockEnd = new Date(block.endTime);
                              const startMinutes = blockStart.getHours() * 60 + blockStart.getMinutes();
                              const endMinutes = blockEnd.getHours() * 60 + blockEnd.getMinutes();
                              const duration = endMinutes - startMinutes;
                              
                              // Einfache Positionierung: 6:00 = 0px, jede 30min = 40px
                              const top = Math.max(0, ((startMinutes - 360) / 30) * 40);
                              const height = Math.max(40, (duration / 30) * 40);
                              
                              // Nur rendern wenn im sichtbaren Bereich
                              if (top >= timeSlots.length * 40 || top + height <= 0) {
                                return null;
                              }
                              
                              return (
                                <Box
                                  key={block._id}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (block.status === 'blocked') {
                                      setContextMenuAnchor({ x: e.clientX, y: e.clientY, timeBlock: block });
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
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    minHeight: '40px',
                                    bgcolor: block.status === 'merged' ? '#4caf50' : '#f44336',
                                    border: `3px solid ${block.status === 'merged' ? '#2e7d32' : '#c62828'}`,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    zIndex: 20,
                                    pointerEvents: 'auto',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                  }}
                                >
                                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'white', fontSize: '0.75rem' }}>
                                    {block.status === 'merged' ? 'Zusammengeführt' : 'Gesperrt'}
                                  </Typography>
                                  {block.reason && (
                                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'white', mt: 0.5 }}>
                                      {block.reason}
                                    </Typography>
                                  )}
                                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'white', mt: 0.5 }}>
                                    {format(blockStart, 'HH:mm')} - {format(blockEnd, 'HH:mm')}
                                  </Typography>
                                </Box>
                              );
                            })}
                          
                          {/* LocationExceptions (Sonderöffnungen) für diesen Tag */}
                          {(() => {
                            const dayDateString = format(day, 'yyyy-MM-dd');
                            const filteredExceptions = locationExceptions.filter((exception: any) => {
                              if (!selectedLocation || selectedLocation === 'all') {
                                console.log('🔍 LocationException filtered out - no location selected:', {
                                  exceptionDate: exception.date,
                                  dayDate: dayDateString
                                });
                                return false;
                              }
                              
                              const exceptionDate = new Date(exception.date);
                              const exceptionDateString = format(exceptionDate, 'yyyy-MM-dd');
                              const isSameDayResult = isSameDay(exceptionDate, day);
                              
                              if (!isSameDayResult) {
                                return false;
                              }
                              
                              const exceptionLocationId = typeof exception.location_id === 'object' && exception.location_id !== null
                                ? exception.location_id._id || exception.location_id
                                : exception.location_id;
                              
                              const locationMatch = String(exceptionLocationId) === String(selectedLocation);
                              
                              if (!locationMatch) {
                                console.log('🔍 LocationException filtered out - location mismatch:', {
                                  exceptionLocationId,
                                  selectedLocation,
                                  exceptionDate: exceptionDateString,
                                  dayDate: dayDateString,
                                  exception: exception
                                });
                                return false;
                              }
                              
                              const isActive = exception.isActive !== false;
                              if (!isActive) {
                                console.log('🔍 LocationException filtered out - not active:', {
                                  exceptionDate: exceptionDateString,
                                  dayDate: dayDateString,
                                  isActive: exception.isActive
                                });
                                return false;
                              }
                              
                              // Prüfe ob Exception für diese Person gilt (assignedStaff)
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
                                
                                // Prüfe ob staffUserId in assignedStaffIds ist
                                if (!staffUserId || !assignedStaffIds.includes(staffUserId.toString())) {
                                  console.log('🔍 LocationException filtered out - staff not in assignedStaff:', {
                                    staffUserId,
                                    assignedStaffIds,
                                    exceptionDate: exceptionDateString,
                                    dayDate: dayDateString
                                  });
                                  return false;
                                }
                              }
                              // Wenn assignedStaff leer ist, gilt die Exception für alle Personen
                              
                              console.log('✅ LocationException passed filter:', {
                                exceptionDate: exceptionDateString,
                                dayDate: dayDateString,
                                locationMatch,
                                isActive,
                                hasAssignedStaff,
                                staffUserId
                              });
                              return true;
                            });
                            
                            if (locationExceptions.length > 0) {
                              console.log('📅 LocationExceptions for day', dayDateString, ':', {
                                total: locationExceptions.length,
                                filtered: filteredExceptions.length,
                                allExceptions: locationExceptions.map((exc: any) => ({
                                  date: format(new Date(exc.date), 'yyyy-MM-dd'),
                                  location_id: typeof exc.location_id === 'object' && exc.location_id !== null
                                    ? exc.location_id._id || exc.location_id
                                    : exc.location_id,
                                  isActive: exc.isActive
                                }))
                              });
                            }
                            
                            return filteredExceptions;
                          })()
                            .map((exception: any) => {
                              const exceptionDate = new Date(exception.date);
                              const [startHours, startMinutes] = exception.startTime.split(':').map(Number);
                              const [endHours, endMinutes] = exception.endTime.split(':').map(Number);
                              
                              const startTotalMinutes = startHours * 60 + startMinutes;
                              const endTotalMinutes = endHours * 60 + endMinutes;
                              const duration = endTotalMinutes - startTotalMinutes;
                              
                              const top = Math.max(0, ((startTotalMinutes - 360) / 30) * 40);
                              const height = Math.max(40, (duration / 30) * 40);
                              
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
                                      setSelectedException(exception);
                                      setExceptionFormData({
                                        date: format(exceptionDate, 'yyyy-MM-dd'),
                                        startTime: exception.startTime,
                                        endTime: exception.endTime,
                                        breakStart: exception.breakStart || '',
                                        breakEnd: exception.breakEnd || '',
                                        label: exception.label || 'Sonderöffnung',
                                        assignedStaff: exception.assignedStaff ? 
                                          exception.assignedStaff.map((staff: any) => 
                                            typeof staff === 'object' && staff !== null ? (staff._id || staff) : staff
                                          ) : []
                                      });
                                      setExceptionDialogOpen(true);
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedException(exception);
                                      setExceptionFormData({
                                        date: format(exceptionDate, 'yyyy-MM-dd'),
                                        startTime: exception.startTime,
                                        endTime: exception.endTime,
                                        breakStart: exception.breakStart || '',
                                        breakEnd: exception.breakEnd || '',
                                        label: exception.label || 'Sonderöffnung',
                                        assignedStaff: exception.assignedStaff ? 
                                          exception.assignedStaff.map((staff: any) => 
                                            typeof staff === 'object' && staff !== null ? (staff._id || staff) : staff
                                          ) : []
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
                                      bgcolor: 'rgba(33, 150, 243, 0.7)',
                                      border: '3px solid #2196f3',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      zIndex: 15, // Über Hintergrund-Elementen, aber unter TimeBlocks (20) und Appointments (10)
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
                          
                          {/* Appointments für diese Person */}
                          {dayAppointments.map((appointment) => {
                            const { top, height } = getAppointmentPosition(appointment);
                            
                            // Tooltip-Informationen (wie vorher)
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
                            
                            const diagnoses = patientId ? patientDiagnoses.filter((d: PatientDiagnosis) => d.patientId === patientId) : [];
                            let primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary && d.status === 'active');
                            if (!primaryDiagnosis) {
                              primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary);
                            }
                            
                            const hasAllergies = patientObj && patientObj.allergies && Array.isArray(patientObj.allergies) && patientObj.allergies.length > 0;
                            
                            let tooltipText = `${appointment.patientName}\n${format(appointment.start, 'HH:mm')} - ${format(appointment.end, 'HH:mm')}\nLeistung: ${appointment.type || 'Unbekannt'}`;
                            
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
                            
                            const room = rooms.find(r => r._id === apt?.room);
                            if (room) {
                              tooltipText += `\nRaum: ${room.name || 'Unbekannt'}`;
                            }
                            
                            if (apt?.status) {
                              tooltipText += `\nStatus: ${apt.status}`;
                            }
                            
                            if (hasAllergies) {
                              tooltipText += '\n⚠️ Allergien vorhanden';
                            }
                            
                            if (primaryDiagnosis) {
                              tooltipText += `\n✓ Hauptdiagnose: ${primaryDiagnosis.display || primaryDiagnosis.code}`;
                            }
                            
                            const notes = apt?.description || (apt as any)?.notes;
                            if (notes && typeof notes === 'string' && notes.length > 0) {
                              tooltipText += `\nNotizen: ${notes.substring(0, 50)}${notes.length > 50 ? '...' : ''}`;
                            }
                            
                            return (
                              <Tooltip key={appointment.id} title={tooltipText} arrow>
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
                                    zIndex: 5,
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                      boxShadow: 4,
                                      zIndex: 10,
                                      transform: 'scale(1.02)',
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
                                    {(() => {
                                      const apt = appointment.appointment;
                                      const patient = apt?.patient;
                                      let patientObj: any = null;
                                      
                                      if (patient) {
                                        if (typeof patient === 'object' && patient !== null) {
                                          patientObj = patient;
                                        }
                                      }
                                      
                                      const hasAllergies = patientObj && patientObj.allergies && Array.isArray(patientObj.allergies) && patientObj.allergies.length > 0;
                                      
                                      return (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                          <Typography 
                                            variant="caption" 
                                            sx={{ 
                                              fontWeight: 600, 
                                              fontSize: '0.7rem',
                                              textDecoration: appointment.patientId ? 'underline' : 'none',
                                              cursor: appointment.patientId ? 'pointer' : 'default',
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
                                          </Typography>
                                          {hasAllergies && (
                                            <Warning sx={{ fontSize: '0.7rem', color: '#ff9800' }} />
                                          )}
                                        </Box>
                                      );
                                    })()}
                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.9, mb: 0.5 }}>
                                      {appointment.type}
                                    </Typography>
                                    {(() => {
                                      const apt = appointment.appointment;
                                      const patient = apt?.patient;
                                      let patientId: string | null = null;
                                      
                                      if (patient) {
                                        if (typeof patient === 'string') {
                                          patientId = patient;
                                        } else if (typeof patient === 'object' && patient !== null) {
                                          patientId = (patient as any)._id || (patient as any).id || null;
                                        }
                                      }
                                      
                                      const diagnoses = patientId ? patientDiagnoses.filter((d: PatientDiagnosis) => d.patientId === patientId) : [];
                                      let primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary && d.status === 'active');
                                      if (!primaryDiagnosis) {
                                        primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary);
                                      }
                                      
                                      if (!primaryDiagnosis) return null;
                                      
                                      return (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.6rem', mt: 0.5 }}>
                                          <CheckCircle sx={{ fontSize: '0.65rem' }} />
                                          <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>{primaryDiagnosis.display || primaryDiagnosis.code}</Typography>
                                        </Box>
                                      );
                                    })()}
                                  </Box>
                                </Paper>
                              </Tooltip>
                            );
                          })}
                        </Box>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            ) : (
              // Alte Ansicht: Tag- und Woche-Ansicht: Zeitslots mit Terminen
              displayedDays.map((day) => {
                // Get background events for this day
                const dayBackgroundEvents = backgroundEvents.filter(event => isSameDay(event.start, day));
                
                // Trenne Location Hours und Staff Hours
                const locationHours = dayBackgroundEvents.filter(event => event.type === 'location_hours');
                const staffHours = dayBackgroundEvents.filter(event => event.type === 'staff_hours');
                
                // Berechne die Anzahl der Staff Hours für die Breitenberechnung
                const totalStaffBars = Math.max(1, staffHours.length);
                const barWidth = `${100 / totalStaffBars}%`;
                
                return (
                <Box
                  key={day.toISOString()}
                  sx={{
                    flex: 1,
                    borderLeft: '1px solid',
                    borderColor: 'divider',
                    position: 'relative',
                    minHeight: `${timeSlots.length * 40}px`, // Ensure container has minimum height
                    height: `${timeSlots.length * 40}px`, // Explicit height for proper positioning
                    overflow: 'visible', // Ensure TimeBlocks are not clipped
                  }}
                >
                    {/* Location Hours - Hintergrund (volle Breite) */}
                    {locationHours.map((bgEvent) => {
                      const startMinutes = bgEvent.start.getHours() * 60 + bgEvent.start.getMinutes();
                      const endMinutes = bgEvent.end.getHours() * 60 + bgEvent.end.getMinutes();
                      const duration = endMinutes - startMinutes;
                      const top = ((startMinutes - 360) / 30) * 40; // 360 = 6:00 in Minuten
                      const height = Math.max((duration / 30) * 40, 40);
                      
                      const tooltipText = `${bgEvent.locationName || 'Standort'} - Öffnungszeiten\n${format(bgEvent.start, 'HH:mm')} - ${format(bgEvent.end, 'HH:mm')}`;
                      
                      return (
                        <Tooltip
                          key={bgEvent.id}
                          title={tooltipText}
                          arrow
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              top: `${top}px`,
                              height: `${height}px`,
                              bgcolor: bgEvent.color,
                              opacity: bgEvent.opacity,
                              zIndex: 0,
                              pointerEvents: 'auto',
                              cursor: 'help',
                            }}
                          />
                        </Tooltip>
                      );
                    })}
                    
                    {/* Staff Hours - Nebeneinander */}
                    {staffHours.map((bgEvent, index) => {
                      const startMinutes = bgEvent.start.getHours() * 60 + bgEvent.start.getMinutes();
                      const endMinutes = bgEvent.end.getHours() * 60 + bgEvent.end.getMinutes();
                      const duration = endMinutes - startMinutes;
                      const top = ((startMinutes - 360) / 30) * 40; // 360 = 6:00 in Minuten
                      const height = Math.max((duration / 30) * 40, 40);
                      const isBreak = bgEvent.title.includes('Pause');
                      const leftPosition = `${(index * 100) / totalStaffBars}%`;
                      
                      // Erstelle detaillierten Tooltip-Text
                      const tooltipText = isBreak 
                        ? `Pause\n${bgEvent.staffName || 'Unbekannt'}\n${format(bgEvent.start, 'HH:mm')} - ${format(bgEvent.end, 'HH:mm')}`
                        : `${bgEvent.staffName || 'Unbekannt'} - Arbeitszeit\n${format(bgEvent.start, 'HH:mm')} - ${format(bgEvent.end, 'HH:mm')}\nDauer: ${Math.round(duration)} Minuten`;
                      
                      return (
                        <Tooltip
                          key={bgEvent.id}
                          title={tooltipText}
                          arrow
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              left: leftPosition,
                              width: barWidth,
                              top: `${top}px`,
                              height: `${height}px`,
                              bgcolor: isBreak ? '#FF9800' : bgEvent.color,
                              opacity: isBreak ? 0.8 : 0.7,
                              zIndex: 1,
                              pointerEvents: 'auto',
                              borderRight: '1px solid rgba(255,255,255,0.3)',
                              borderRadius: '4px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              padding: '2px 4px',
                              overflow: 'hidden',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              cursor: 'help',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                opacity: isBreak ? 0.9 : 0.85,
                                transform: 'scale(1.02)',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                                zIndex: 2,
                              },
                            }}
                          >
                            {/* Staff name and time info */}
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                width: '100%',
                                lineHeight: 1.2,
                                textAlign: 'center',
                              }}
                            >
                              {isBreak ? 'PAUSE' : (bgEvent.staffName || 'Unbekannt')}
                            </Typography>
                            {height > 50 && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'white',
                                  fontSize: '8px',
                                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                  opacity: 0.9,
                                  lineHeight: 1.1,
                                  mt: 0.25,
                                  textAlign: 'center',
                                }}
                              >
                                {format(bgEvent.start, 'HH:mm')} - {format(bgEvent.end, 'HH:mm')}
                              </Typography>
                            )}
                          </Box>
                        </Tooltip>
                      );
                    })}
                    
                    {/* TimeBlocks für diesen Tag - Vereinfachte Version */}
                    {/* WICHTIG: Zusammengeführte TimeBlocks (status='merged') werden NICHT mehr als TimeBlocks angezeigt, 
                        da sie bereits als normale Appointments erscheinen */}
                    {showTimeBlocks && timeBlocks
                      .filter((block: any) => {
                        // Einfache Filterung: Nur blocked (zusammengeführte werden nicht mehr angezeigt)
                        if (block.status !== 'blocked') {
                          return false;
                        }
                        
                        const blockDate = startOfDay(new Date(block.startTime));
                        const dayDate = startOfDay(day);
                        if (!isSameDay(blockDate, dayDate)) {
                          return false;
                        }
                        
                        // Filter nach Personal: Wenn eine Person ausgewählt ist, zeige nur TimeBlocks für diese Person oder TimeBlocks ohne Personal (für alle)
                        // WICHTIG: Wenn ein TimeBlock ein staffId-Feld hat (nicht null/undefined/leer), soll es NUR bei dieser Person angezeigt werden
                        // Unterstütze sowohl staffId als auch doctor (für Rückwärtskompatibilität)
                        const blockStaffId = block.staffId?._id || block.staffId || block.doctor?._id || block.doctor || null;
                        if (blockStaffId && blockStaffId !== null && blockStaffId !== '') {
                          // TimeBlock hat ein Personal zugewiesen - zeige nur bei dieser Person
                          if (selectedStaff && selectedStaff !== 'all') {
                            if (String(blockStaffId) !== String(selectedStaff)) {
                              return false;
                            }
                          }
                        }
                        // Wenn blockStaffId null/undefined/leer ist, wird der Block bei allen angezeigt (korrekt)
                        
                        // Location-Filter: TimeBlocks werden immer angezeigt, unabhängig von der Location
                        // (TimeBlocks sind standortübergreifend und sollten für alle Locations sichtbar sein)
                        // Keine Location-Filterung mehr - TimeBlocks werden für alle Locations angezeigt
                        
                        return true;
                      })
                      .map((block: any) => {
                        const blockStart = new Date(block.startTime);
                        const blockEnd = new Date(block.endTime);
                        const startMinutes = blockStart.getHours() * 60 + blockStart.getMinutes();
                        const endMinutes = blockEnd.getHours() * 60 + blockEnd.getMinutes();
                        const duration = endMinutes - startMinutes;
                        
                        // Einfache Positionierung: 6:00 = 0px, jede 30min = 40px
                        const top = Math.max(0, ((startMinutes - 360) / 30) * 40);
                        const height = Math.max(40, (duration / 30) * 40);
                        
                        // Nur rendern wenn im sichtbaren Bereich
                        if (top >= timeSlots.length * 40 || top + height <= 0) {
                          return null;
                        }
                        
                        return (
                          <Box
                            key={block._id}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (block.status === 'blocked') {
                                setContextMenuAnchor({ x: e.clientX, y: e.clientY, timeBlock: block });
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
                              top: `${top}px`,
                              height: `${height}px`,
                              minHeight: '40px',
                              bgcolor: block.status === 'merged' ? '#4caf50' : '#f44336',
                              border: `3px solid ${block.status === 'merged' ? '#2e7d32' : '#c62828'}`,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              zIndex: 20,
                              pointerEvents: 'auto',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'white', fontSize: '0.75rem' }}>
                              {block.status === 'merged' ? 'Zusammengeführt' : 'Gesperrt'}
                            </Typography>
                            {block.reason && (
                              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'white', mt: 0.5 }}>
                                {block.reason}
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'white', mt: 0.5 }}>
                              {format(blockStart, 'HH:mm')} - {format(blockEnd, 'HH:mm')}
                            </Typography>
                          </Box>
                        );
                      })}
                    
                    {/* LocationExceptions (Sonderöffnungen) für diesen Tag - Vereinfachte Ansicht */}
                    {(() => {
                      const dayDateString = format(day, 'yyyy-MM-dd');
                      const filteredExceptions = locationExceptions.filter((exception: any) => {
                        if (!selectedLocation || selectedLocation === 'all') {
                          return false;
                        }
                        
                        const exceptionDate = new Date(exception.date);
                        const exceptionDateString = format(exceptionDate, 'yyyy-MM-dd');
                        const isSameDayResult = isSameDay(exceptionDate, day);
                        
                        if (!isSameDayResult) return false;
                        
                        const exceptionLocationId = typeof exception.location_id === 'object' && exception.location_id !== null
                          ? exception.location_id._id || exception.location_id
                          : exception.location_id;
                        
                        const locationMatch = String(exceptionLocationId) === String(selectedLocation);
                        
                        if (!locationMatch) {
                          console.log('🔍 [Simplified View] LocationException filtered out - location mismatch:', {
                            exceptionLocationId,
                            selectedLocation,
                            exceptionDate: exceptionDateString,
                            dayDate: dayDateString
                          });
                          return false;
                        }
                        
                        const isActive = exception.isActive !== false;
                        if (!isActive) {
                          console.log('🔍 [Simplified View] LocationException filtered out - not active:', {
                            exceptionDate: exceptionDateString,
                            dayDate: dayDateString
                          });
                          return false;
                        }
                        
                        console.log('✅ [Simplified View] LocationException passed filter:', {
                          exceptionDate: exceptionDateString,
                          dayDate: dayDateString,
                          locationMatch,
                          isActive
                        });
                        return true;
                      });
                      
                      if (locationExceptions.length > 0) {
                        console.log('📅 [Simplified View] LocationExceptions for day', dayDateString, ':', {
                          total: locationExceptions.length,
                          filtered: filteredExceptions.length,
                          allExceptions: locationExceptions.map((exc: any) => ({
                            date: format(new Date(exc.date), 'yyyy-MM-dd'),
                            location_id: typeof exc.location_id === 'object' && exc.location_id !== null
                              ? exc.location_id._id || exc.location_id
                              : exc.location_id,
                            isActive: exc.isActive
                          }))
                        });
                      }
                      
                      return filteredExceptions;
                    })()
                      .map((exception: any) => {
                        const exceptionDate = new Date(exception.date);
                        const [startHours, startMinutes] = exception.startTime.split(':').map(Number);
                        const [endHours, endMinutes] = exception.endTime.split(':').map(Number);
                        
                        const startTotalMinutes = startHours * 60 + startMinutes;
                        const endTotalMinutes = endHours * 60 + endMinutes;
                        const duration = endTotalMinutes - startTotalMinutes;
                        
                        const top = Math.max(0, ((startTotalMinutes - 360) / 30) * 40); // 360 = 6:00 in Minuten
                        const height = Math.max(40, (duration / 30) * 40);
                        
                        // Nur rendern wenn im sichtbaren Bereich
                        if (top >= timeSlots.length * 40 || top + height <= 0) {
                          return null;
                        }
                        
                        const tooltipText = (
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Sonderöffnung</Typography>
                            <Typography variant="caption" display="block">
                              {exception.startTime} - {exception.endTime}
                            </Typography>
                            {exception.label && <Typography variant="caption" display="block">Grund: {exception.label}</Typography>}
                            {exception.breakStart && exception.breakEnd && (
                              <Typography variant="caption" display="block">Pause: {exception.breakStart} - {exception.breakEnd}</Typography>
                            )}
                          </Box>
                        );
                        
                        return (
                          <Tooltip key={exception._id} title={tooltipText} arrow>
                            <Box
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setContextMenuAnchor({ x: e.clientX, y: e.clientY, locationException: exception });
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedException(exception);
                                setExceptionFormData({
                                  date: format(exceptionDate, 'yyyy-MM-dd'),
                                  startTime: exception.startTime,
                                  endTime: exception.endTime,
                                  breakStart: exception.breakStart || '',
                                  breakEnd: exception.breakEnd || '',
                                  label: exception.label || 'Sonderöffnung',
                                  assignedStaff: exception.assignedStaff ? 
                                    exception.assignedStaff.map((staff: any) => 
                                      typeof staff === 'object' && staff !== null ? (staff._id || staff) : staff
                                    ) : []
                                });
                                setExceptionDialogOpen(true);
                              }}
                              sx={{
                                position: 'absolute',
                                left: 4,
                                right: 4,
                                top: `${top}px`,
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
                                zIndex: 10, // Unter TimeBlocks, aber über Zeitslots
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
                            // (oder zeige ein Menü zum Starten einer Auswahl)
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
                            zIndex: 5, // Über Background Events
                            transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: 4,
                            zIndex: 10,
                              transform: 'scale(1.02)',
                          },
                        }}
                      >
                        <Box>
                          {(() => {
                            const apt = appointment.appointment;
                            const patient = apt?.patient;
                            let patientObj: any = null;
                            
                            if (patient) {
                              if (typeof patient === 'object' && patient !== null) {
                                patientObj = patient;
                              }
                            }
                            
                            // Prüfe Allergien frühzeitig
                            const hasAllergies = patientObj && patientObj.allergies && Array.isArray(patientObj.allergies) && patientObj.allergies.length > 0;
                            
                            return (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontWeight: 600, 
                              fontSize: '0.7rem',
                              textDecoration: appointment.patientId ? 'underline' : 'none',
                              cursor: appointment.patientId ? 'pointer' : 'default',
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
                        </Typography>
                                {hasAllergies && (
                                  <Warning sx={{ fontSize: '0.7rem', color: '#ff9800' }} />
                                )}
                              </Box>
                            );
                          })()}
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.9, mb: 0.5 }}>
                          {appointment.type}
                        </Typography>
                        {(() => {
                          const apt = appointment.appointment;
                            
                            // Finde Staff-Name
                            const staffName = (apt as any)?.assigned_users?.[0] 
                              ? `${(apt as any).assigned_users[0].firstName || (apt as any).assigned_users[0].first_name || ''} ${(apt as any).assigned_users[0].lastName || (apt as any).assigned_users[0].last_name || ''}`.trim()
                              : (apt as any)?.doctor 
                                ? (typeof (apt as any).doctor === 'object' 
                                  ? `${(apt as any).doctor.firstName || ''} ${(apt as any).doctor.lastName || ''}`.trim()
                                  : '')
                                : '';
                            
                          const patient = apt?.patient;
                          let patientId: string | null = null;
                          
                          if (patient) {
                            if (typeof patient === 'string') {
                              patientId = patient;
                            } else if (typeof patient === 'object' && patient !== null) {
                              patientId = (patient as any)._id || (patient as any).id || null;
                            }
                          }
                          
                          // Finde Hauptdiagnose - auch wenn status nicht 'active' ist, solange isPrimary true ist
                          const diagnoses = patientId ? patientDiagnoses.filter((d: PatientDiagnosis) => d.patientId === patientId) : [];
                          // Suche zuerst nach aktiver Hauptdiagnose, dann nach jeder Hauptdiagnose
                          let primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary && d.status === 'active');
                          if (!primaryDiagnosis) {
                            primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary);
                          }
                          
                            if (!primaryDiagnosis && !staffName) return null;
                          
                          return (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
                                {staffName && (
                                  <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.9, fontWeight: 500 }}>
                                    👤 {staffName}
                                  </Typography>
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
                      </Tooltip>
                    );
                  })}
                </Box>
                );
              })
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
                      existingException.assignedStaff.map((staff: any) => 
                        typeof staff === 'object' && staff !== null ? (staff._id || staff) : staff
                      ) : []
                  });
                } else {
                  // Erstellungsmodus: Öffne Dialog mit Standardwerten
                  setSelectedException(null);
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
                  setSelectedException(existingException);
                  setExceptionFormData({
                    date: format(exceptionDate, 'yyyy-MM-dd'),
                    startTime: existingException.startTime,
                    endTime: existingException.endTime,
                    breakStart: existingException.breakStart || '',
                    breakEnd: existingException.breakEnd || '',
                    label: existingException.label || 'Sonderöffnung',
                    assignedStaff: existingException.assignedStaff ? 
                      existingException.assignedStaff.map((staff: any) => 
                        typeof staff === 'object' && staff !== null ? (staff._id || staff) : staff
                      ) : []
                  });
                } else {
                  // Erstellungsmodus: Öffne Dialog mit Standardwerten basierend auf der Auswahl
                  const startTime = contextMenuAnchor.start ? format(contextMenuAnchor.start, 'HH:mm') : '08:00';
                  const endTime = contextMenuAnchor.end ? format(contextMenuAnchor.end, 'HH:mm') : '17:00';
                  setSelectedException(null);
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
              value={exceptionLocationId || selectedLocation || ''}
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
                    handleDeleteException(selectedException._id);
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

export default ServiceDemoCalendar;
