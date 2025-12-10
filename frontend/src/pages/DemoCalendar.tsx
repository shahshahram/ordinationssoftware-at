import React, { useState, useMemo, useEffect, useRef } from 'react';
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
} from '@mui/icons-material';
import { format, startOfWeek, addDays, addWeeks, subWeeks, startOfMonth, endOfMonth, endOfWeek, isSameDay, isSameMonth, eachDayOfInterval, parseISO, addMonths, subMonths, startOfDay, endOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAppointments, createAppointment, updateAppointment, deleteAppointment, Appointment } from '../store/slices/appointmentSlice';
import { fetchLocations, Location } from '../store/slices/locationSlice';
import { fetchPatients, Patient } from '../store/slices/patientSlice';
import { fetchStaffProfiles } from '../store/slices/staffSlice';
import { fetchRooms } from '../store/slices/roomSlice';
import { fetchPatientDiagnoses, PatientDiagnosis } from '../store/slices/diagnosisSlice';
import GradientDialogTitle from '../components/GradientDialogTitle';
import DiagnosisManager from '../components/DiagnosisManager';
import CreateTaskDialog from '../components/Tasks/CreateTaskDialog';
import api from '../utils/api';

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

const DemoCalendar: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  // Redux State
  const { appointments, loading: appointmentsLoading } = useAppSelector((state) => state.appointments);
  const { locations, loading: locationsLoading, currentLocation } = useAppSelector((state) => state.locations);
  const { patients, loading: patientsLoading } = useAppSelector((state) => state.patients);
  const { staffProfiles } = useAppSelector((state) => state.staff);
  const { rooms } = useAppSelector((state) => state.rooms);
  const { patientDiagnoses } = useAppSelector((state) => state.diagnoses);

  // Local State
  const [currentDate, setCurrentDate] = useState(() => startOfWeek(new Date(), { locale: de, weekStartsOn: 1 }));
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

  // Load data on mount
  useEffect(() => {
    dispatch(fetchAppointments());
    dispatch(fetchLocations());
    dispatch(fetchPatients(1));
    dispatch(fetchStaffProfiles());
    dispatch(fetchRooms());
    
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

  // Initialize selected locations with current location or all locations (only once on mount)
  const hasInitializedLocations = useRef(false);
  useEffect(() => {
    if (locations.length > 0 && !hasInitializedLocations.current) {
      // Wenn ein aktueller Standort gesetzt ist, nur diesen auswählen
      if (currentLocation) {
        setSelectedLocations([currentLocation._id]);
      } else {
        // Sonst alle Standorte auswählen
        setSelectedLocations(locations.map(loc => loc._id));
      }
      hasInitializedLocations.current = true;
    }
  }, [locations, currentLocation]);

  // Update selectedLocations when currentLocation changes
  useEffect(() => {
    if (currentLocation && !selectedLocations.includes(currentLocation._id)) {
      setSelectedLocations([currentLocation._id]);
    }
  }, [currentLocation]);

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
      // Appointments without locationId are always shown (they don't belong to a specific location)
      if (selectedLocations.length > 0) {
        // Convert locationId to string for comparison
        const aptLocationId = apt.locationId ? String(apt.locationId) : null;
        
        // If appointment has no locationId, always show it (it doesn't belong to a specific location)
        if (!aptLocationId) {
          // Appointments without locationId are always visible
          // They pass this filter and continue to other filters (search, etc.)
          return true;
        }
        
        // If appointment has a locationId, it must be in selectedLocations
        // Check if the locationId is in selectedLocations (convert to strings for comparison)
        const isLocationSelected = selectedLocations.some(selectedId => 
          String(selectedId) === aptLocationId
        );
        
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
          serviceName = aptService.name || serviceName;
          serviceColor = aptService.color_hex;
        } else if (typeof aptService === 'string') {
          // Service is just an ID, try to find it in services list
          const foundService = services.find(s => s._id === aptService);
          if (foundService) {
            serviceName = foundService.name;
            serviceColor = foundService.color_hex;
          }
        }
      }
      
      // Also check serviceId field
      if (!serviceColor && (apt as any).serviceId) {
        const foundService = services.find(s => s._id === (apt as any).serviceId);
        if (foundService) {
          serviceName = foundService.name;
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
  }, [appointments, selectedLocations, searchQuery, patientMap, locationMap, services, openSearchDialog]);

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
    for (let hour = 8; hour <= 18; hour++) {
      slots.push(`${hour}:00`);
      if (hour < 18) {
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
    
    // Basis: 8:00 = 0, jede halbe Stunde = 40px
    const top = ((startMinutes - 480) / 30) * 40; // 480 = 8:00 in Minuten
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
    
    const patientId = typeof apt.patient === 'string' ? apt.patient : (apt.patient as any)?._id || '';
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
    
    // Konvertiere doctor zu string
    const doctorId = typeof apt.doctor === 'string' 
      ? apt.doctor 
      : (apt.doctor as any)?._id || '';
    
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
        assignedUsers.push(selectedStaff);
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
        assigned_devices: assignedDevices,
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

  if (appointmentsLoading || locationsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Top Navigation Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 1.5,
          bgcolor: 'white',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Favorite sx={{ color: '#e91e63' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Kalender
          </Typography>
          <Chip label="Warteliste 0" size="small" sx={{ bgcolor: '#f5f5f5' }} />
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
            sx={{ bgcolor: '#1976d2' }}
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
              bgcolor: '#1976d2',
              color: 'white',
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
          bgcolor: 'white',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: de })}
          {viewMode === 'week' && `KW ${format(currentDate, 'w', { locale: de })} ${format(currentDate, 'yyyy', { locale: de })}`}
          {viewMode === 'day' && format(currentDate, 'dd. MMMM yyyy', { locale: de })}
        </Typography>

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
            sx={{ bgcolor: '#1976d2' }}
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
            bgcolor: '#1e3a5f',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
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
                sx={{ color: 'white', mb: 1, display: 'block' }}
              />
            ))}
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />

          {/* Mini-Kalender */}
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {format(currentDate, 'MMMM yy', { locale: de })}
              </Typography>
              <Button size="small" sx={{ color: 'white', textTransform: 'none' }} onClick={() => handleDateNavigation('today')}>
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
        </Box>

        {/* Main Calendar Grid */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', bgcolor: 'white' }}>
          {/* Day Headers */}
          <Box sx={{ display: 'flex', borderBottom: '2px solid #e0e0e0' }}>
            <Box sx={{ width: 80, p: 1 }} /> {/* Time column spacer */}
            {viewMode === 'month' ? (
              // Monatsansicht: Alle 7 Wochentage
              Array.from({ length: 7 }, (_, i) => {
                const day = addDays(startOfWeek(currentDate, { locale: de, weekStartsOn: 1 }), i);
                return (
                  <Box
                    key={i}
                    sx={{
                      flex: 1,
                      p: 1,
                      textAlign: 'center',
                      borderLeft: '1px solid #e0e0e0',
                      bgcolor: '#fafafa',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {format(day, 'EEE', { locale: de })}
                    </Typography>
                  </Box>
                );
              })
            ) : (
              // Tag- und Woche-Ansicht: Nur angezeigte Tage
              displayedDays.map((day) => (
                <Box
                  key={day.toISOString()}
                  sx={{
                    flex: 1,
                    p: 1,
                    textAlign: 'center',
                    borderLeft: '1px solid #e0e0e0',
                    bgcolor: '#fafafa',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {format(day, 'EEE', { locale: de })} {format(day, 'd.')}
                  </Typography>
                </Box>
              ))
            )}
          </Box>

          {/* Time Grid */}
          <Box sx={{ display: 'flex', flex: 1, position: 'relative' }}>
            {/* Time Scale */}
            <Box sx={{ width: 80, borderRight: '1px solid #e0e0e0' }}>
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
                  <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
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
                      sx={{
                        minHeight: 100,
                        borderLeft: '1px solid #e0e0e0',
                        borderBottom: '1px solid #e0e0e0',
                        p: 0.5,
                        bgcolor: isCurrentMonth ? 'white' : '#f5f5f5',
                        cursor: 'pointer',
                        position: 'relative',
                        '&:hover': { bgcolor: isCurrentMonth ? '#f0f0f0' : '#e8e8e8' },
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
                              '&:hover': { opacity: 0.9 },
                            }}
                          >
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
                    borderLeft: '1px solid #e0e0e0',
                    position: 'relative',
                  }}
                >
                  {timeSlots.map((time, index) => (
                    <Box
                      key={time}
                      onClick={() => {
                        const [hour, minute] = time.split(':').map(Number);
                        const slotDate = new Date(day);
                        slotDate.setHours(hour, minute, 0, 0);
                        handleOpenNewEventDialog(slotDate, hour);
                      }}
                      sx={{
                        height: 40,
                        borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#f5f5f5' },
                      }}
                    />
                  ))}

                  {/* Appointments */}
                  {getAppointmentsForDay(day).map((appointment) => {
                    const { top, height } = getAppointmentPosition(appointment);
                    return (
                      <Paper
                        key={appointment.id}
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
                    getOptionLabel={(option) => `${option.code || ''} - ${option.name}`}
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
                                  {option.name}
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
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formData.service.name}
                        </Typography>
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
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', ml: 2.5 }}>
                          {formData.service.description}
                        </Typography>
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
    </Box>
  );
};

export default DemoCalendar;
