import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Category,
  MedicalServices,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import CalendarMonthView from '../components/CalendarMonthView';
import CalendarWeekView from '../components/CalendarWeekView';
import { startOfMonth, format, startOfWeek, endOfWeek } from 'date-fns';
import {
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
} from '@mui/material';
import api from '../utils/api';
import { useAppDispatch } from '../store/hooks';
import { fetchAppointments } from '../store/slices/appointmentSlice';
import { validatePhone, getPhoneErrorMessage, validateEmail, getEmailErrorMessage } from '../utils/validation';
import GradientDialogTitle from '../components/GradientDialogTitle';

interface Category {
  _id?: string | null;
  name: string;
  code: string;
  color_hex?: string;
  description?: string | null;
  serviceCount: number;
}

interface Service {
  _id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  duration?: number;
  base_duration_min?: number;
  buffer_before_min?: number;
  buffer_after_min?: number;
  price?: number; // Preis in Euro
  price_cents?: number; // Legacy: Für Backward Compatibility
  assignedUsers?: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    specialization?: string;
  }>;
  requiresUserSelection?: boolean;
  anamnesisQuestions?: AnamnesisQuestion[];
  requires_room_selection?: boolean;
  room_quantity_required?: number;
  requires_device_selection?: boolean;
  device_quantity_required?: number;
}

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

interface BookingData {
  patient: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    socialSecurityNumber?: string;
    address?: {
      street: string;
      zipCode: string;
      city: string;
      country: string;
    };
  };
  appointment: {
    date: string;
    startTime: string;
    type: string;
    notes?: string;
    assigned_rooms?: string[];
    assigned_devices?: string[];
    serviceId?: string;
  };
  doctor: {
    id: string;
  };
}

// Helper-Funktion: Konvertiert Wert zu Euro (automatische Erkennung)
// Wenn Wert > 100000, wird angenommen, dass es in Cent ist (alte Daten)
// Normale Preise in Euro sind meist < 100000
const toEuro = (value: number | undefined | null): number => {
  if (!value && value !== 0) return 0;
  // Wenn Wert sehr groß ist (> 100000), ist es wahrscheinlich in Cent (alte Daten)
  return value > 100000 ? value / 100 : value;
};

const OnlineBooking: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activeStep, setActiveStep] = useState(0);
  
  // Debug: Log activeStep changes
  useEffect(() => {
    console.log('[OnlineBooking] activeStep changed to:', activeStep);
  }, [activeStep]);

  // Neue States für erweiterten Workflow
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('week');
  const [calendarSlots, setCalendarSlots] = useState<{ [date: string]: string[] }>({});
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
  const [gdprConsent, setGdprConsent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  // Service und Anamnese
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [anamnesisQuestions, setAnamnesisQuestions] = useState<AnamnesisQuestion[]>([]);
  const [anamnesisAnswers, setAnamnesisAnswers] = useState<Record<string, any>>({});
  const [openServiceDetailDialog, setOpenServiceDetailDialog] = useState(false);
  const [pendingService, setPendingService] = useState<Service | null>(null);

  const [formData, setFormData] = useState<BookingData>({
    patient: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      socialSecurityNumber: '',
      address: {
        street: '',
        zipCode: '',
        city: '',
        country: 'Österreich'
      }
    },
    appointment: {
      date: '',
      startTime: '',
      type: '',
      notes: ''
    },
    doctor: {
      id: ''
    }
  });

  // Lade Kategorien beim Start
  useEffect(() => {
    loadCategories();
  }, []);

  // Lade Services wenn Kategorie ausgewählt wird
  useEffect(() => {
    if (selectedCategory) {
      loadServicesByCategory(selectedCategory.name);
    }
  }, [selectedCategory]);

  // Lade Ärzte wenn Service ausgewählt wird
  useEffect(() => {
    if (selectedService) {
      loadDoctorsByService(selectedService._id);
    }
  }, [selectedService]);

  // Lade Kalender-Daten wenn Arzt und Service ausgewählt sind
  useEffect(() => {
    if (selectedDoctor && selectedService) {
      if (calendarView === 'month') {
        loadCalendarAvailability();
      } else {
        loadWeekAvailability();
      }
    }
  }, [selectedDoctor, selectedService, currentMonth, currentWeek, calendarView]);

  // Öffne Bestätigungsdialog automatisch, wenn bookingResult gesetzt wird (nur einmal)
  useEffect(() => {
    if (bookingResult && !requiresOptIn && !showConfirmation) {
      console.log('[OnlineBooking] Opening confirmation dialog for new booking result');
      setShowConfirmation(true);
    }
  }, [bookingResult?.bookingNumber]); // Nur wenn bookingNumber sich ändert (neue Buchung)

  // Lade Wochen-Verfügbarkeit
  const loadWeekAvailability = async () => {
    if (!selectedDoctor || !selectedService) return;

    try {
      setLoading(true);
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
      
      const startDateStr = format(weekStart, 'yyyy-MM-dd');
      const endDateStr = format(weekEnd, 'yyyy-MM-dd');

      const response = await api.get<any>(
        `/online-booking/availability-calendar?doctorId=${selectedDoctor.id}&serviceId=${selectedService._id}&startDate=${startDateStr}&endDate=${endDateStr}`
      );

      if (response.success && response.data) {
        const calendarData = response.data.data?.calendar || response.data.calendar || {};
        
        // Konvertiere zu { "2025-12-22": ["10:00", "11:15", ...] } Format
        const slotsMap: { [date: string]: string[] } = {};
        Object.keys(calendarData).forEach(dateStr => {
          slotsMap[dateStr] = calendarData[dateStr].availableSlots || [];
        });
        
        setCalendarSlots(slotsMap);
      }
    } catch (error) {
      console.error('Error loading week availability:', error);
      setSnackbar({ open: true, message: 'Fehler beim Laden der Wochen-Verfügbarkeit', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Lade Kategorien
  const loadCategories = async () => {
    try {
      const response = await api.get<any>('/online-booking/categories');
      if (response.success && response.data) {
        const categoriesData = response.data.data || response.data;
        if (Array.isArray(categoriesData)) {
          setCategories(categoriesData);
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setSnackbar({ open: true, message: 'Fehler beim Laden der Kategorien', severity: 'error' });
    }
  };

  // Lade Services nach Kategorie
  const loadServicesByCategory = async (categoryName: string) => {
    try {
      setLoading(true);
      const response = await api.get<any>(`/online-booking/services?categoryName=${encodeURIComponent(categoryName)}`);
      if (response.success && response.data) {
        const servicesData = response.data.data || response.data;
        if (Array.isArray(servicesData)) {
          // Zusätzliche Frontend-Prüfung: Filtere Services heraus, die Geräte- oder Raumauswahl erfordern
          // (Backend sollte bereits filtern, aber als Sicherheitsschicht)
          const filteredServices = servicesData.filter((service: Service) => {
            const requiresDevice = service.requires_device_selection === true;
            const requiresRoom = service.requires_room_selection === true;
            if (requiresDevice || requiresRoom) {
              console.warn(`[OnlineBooking] Service ${service.name} erfordert ${requiresDevice ? 'Geräte' : ''}${requiresDevice && requiresRoom ? ' und ' : ''}${requiresRoom ? 'Räume' : ''} - wird aus Frontend-Liste entfernt`);
              return false;
            }
            return true;
          });
          setServices(filteredServices);
        }
      }
    } catch (error) {
      console.error('Error loading services:', error);
      setSnackbar({ open: true, message: 'Fehler beim Laden der Leistungen', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Lade Services (alte Funktion für Kompatibilität)
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

  // Lade Ärzte nach Service
  const loadDoctorsByService = async (serviceId: string) => {
    try {
      setLoading(true);
      const response = await api.get<any>(`/online-booking/doctors?serviceId=${serviceId}`);
      console.log('OnlineBooking: API response:', response);
      
      if (response.success && response.data) {
        const doctorsData = response.data.data || response.data;
        console.log('OnlineBooking: Doctors data:', doctorsData);
        
        if (Array.isArray(doctorsData)) {
          setDoctors(doctorsData);
          if (doctorsData.length === 0) {
            setSnackbar({ 
              open: true, 
              message: 'Keine Ärzte für diese Leistung verfügbar.', 
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
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Laden der Ärzte', 
        severity: 'error' 
      });
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  // Lade Ärzte (alte Funktion für Kompatibilität)
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

  // Lade Kalender-Verfügbarkeit für einen Monat
  const loadCalendarAvailability = async () => {
    if (!selectedDoctor || !selectedService) return;

    try {
      setLoading(true);
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      const startDateStr = format(monthStart, 'yyyy-MM-dd');
      const endDateStr = format(monthEnd, 'yyyy-MM-dd');

      const response = await api.get<any>(
        `/online-booking/availability-calendar?doctorId=${selectedDoctor.id}&serviceId=${selectedService._id}&startDate=${startDateStr}&endDate=${endDateStr}`
      );

      if (response.success && response.data) {
        const calendarData = response.data.data?.calendar || response.data.calendar || {};
        
        // Konvertiere zu { "2025-01-15": ["09:00", "10:30", ...] } Format
        const slotsMap: { [date: string]: string[] } = {};
        Object.keys(calendarData).forEach(dateStr => {
          slotsMap[dateStr] = calendarData[dateStr].availableSlots || [];
        });
        
        setCalendarSlots(slotsMap);
      }
    } catch (error) {
      console.error('Error loading calendar availability:', error);
      setSnackbar({ open: true, message: 'Fehler beim Laden der Kalender-Verfügbarkeit', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Lade verfügbare Slots für einen bestimmten Tag
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

  // Handler für neue Schritte
  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedService(null);
    setSelectedDoctor(null);
    setSelectedDate('');
    setSelectedDateObj(null);
    setActiveStep(1);
  };

  const handleServiceSelect = (service: Service) => {
    setPendingService(service);
    setOpenServiceDetailDialog(true);
  };

  const handleConfirmServiceSelection = () => {
    if (pendingService) {
      setSelectedService(pendingService);
      setSelectedDoctor(null);
      setSelectedDate('');
      setSelectedDateObj(null);
      
      // Entferne HTML-Tags aus dem Service-Namen
      const stripHtmlTags = (html: string): string => {
        if (!html) return '';
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
      };
      
      const cleanServiceName = stripHtmlTags(pendingService.name || 'Allgemeine Beratung');
      
      setFormData(prev => ({
        ...prev,
        appointment: {
          ...prev.appointment,
          serviceId: pendingService._id,
          type: cleanServiceName
        }
      }));
      setOpenServiceDetailDialog(false);
      setPendingService(null);
      setActiveStep(2);
    }
  };

  const handleCancelServiceSelection = () => {
    setOpenServiceDetailDialog(false);
    setPendingService(null);
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setFormData(prev => ({
      ...prev,
      doctor: { id: doctor.id }
    }));
    setActiveStep(3);
  };

  const handleCalendarDateSelect = (date: Date, time?: string) => {
    setSelectedDateObj(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    
    // Wenn eine Zeit mit übergeben wurde, setze sie direkt
    if (time) {
      setSelectedTime(time);
      // Berechne Dauer mit Pufferzeiten (base_duration_min + buffer_before_min + buffer_after_min)
      const baseDuration = selectedService?.base_duration_min || selectedService?.duration || 30;
      const bufferBefore = selectedService?.buffer_before_min || 0;
      const bufferAfter = selectedService?.buffer_after_min || 0;
      const totalDuration = baseDuration + bufferBefore + bufferAfter;
      
      // Erstelle ein TimeSlot-Objekt für selectedSlot
      const [hours, minutes] = time.split(':').map(Number);
      const endTime = new Date(date);
      endTime.setHours(hours, minutes + totalDuration, 0, 0);
      const endTimeStr = format(endTime, 'HH:mm');
      
      setSelectedSlot({
        start: time,
        end: endTimeStr,
        duration: totalDuration
      });
      
      setFormData(prev => ({
        ...prev,
        appointment: {
          ...prev.appointment,
          startTime: time,
          date: dateStr
        }
      }));
      // Gehe direkt zum nächsten Schritt (Daten eingeben)
      setActiveStep(5);
    } else {
      // Nur Datum ausgewählt, lade Slots für diesen Tag
      if (selectedDoctor && selectedService) {
        loadAvailableSlots(selectedDoctor.id, dateStr);
      }
      setActiveStep(4);
    }
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
    
    // E-Mail-Validierung
    if (parent === 'patient' && field === 'email') {
      if (value && !validateEmail(value)) {
        setEmailError(getEmailErrorMessage());
      } else {
        setEmailError(null);
      }
    }
    
    // Telefonnummer-Validierung
    if (parent === 'patient' && field === 'phone') {
      if (value && !validatePhone(value)) {
        setPhoneError(getPhoneErrorMessage());
      } else {
        setPhoneError(null);
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
      // Validierung
      if (!formData.appointment.startTime) {
        setSnackbar({
          open: true,
          message: 'Bitte wählen Sie eine Zeit aus',
          severity: 'warning'
        });
        // Gehe zurück zum Zeit-Auswahl-Schritt
        setActiveStep(4);
        return;
      }
      
      // E-Mail-Validierung vor dem Absenden
      if (!formData.patient.email || !validateEmail(formData.patient.email)) {
        setEmailError(getEmailErrorMessage());
        setSnackbar({
          open: true,
          message: getEmailErrorMessage(),
          severity: 'error'
        });
        // Gehe zurück zum Daten-Eingabe-Schritt
        setActiveStep(5);
        return;
      }

      // Telefonnummer-Validierung vor dem Absenden
      if (!formData.patient.phone || !validatePhone(formData.patient.phone)) {
        setPhoneError(getPhoneErrorMessage());
        setSnackbar({
          open: true,
          message: `Bitte geben Sie eine gültige Telefonnummer im internationalen Format ein (${getPhoneErrorMessage()})`,
          severity: 'error'
        });
        // Gehe zurück zum Daten-Eingabe-Schritt
        setActiveStep(5);
        return;
      }
      
      // Geschlecht-Validierung vor dem Absenden
      if (!formData.patient.gender || formData.patient.gender === '') {
        setSnackbar({
          open: true,
          message: 'Bitte wählen Sie ein Geschlecht aus',
          severity: 'error'
        });
        // Gehe zurück zum Daten-Eingabe-Schritt
        setActiveStep(5);
        return;
      }
      
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

      // Berechne Dauer mit Pufferzeiten
      const baseDuration = selectedService?.base_duration_min || selectedService?.duration || 30;
      const bufferBefore = selectedService?.buffer_before_min || 0;
      const bufferAfter = selectedService?.buffer_after_min || 0;
      const totalDuration = baseDuration + bufferBefore + bufferAfter;
      
      // Entferne HTML-Tags aus appointment.type und reason
      const stripHtmlTags = (html: string): string => {
        if (!html) return '';
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
      };
      
      const cleanAppointmentType = stripHtmlTags(formData.appointment.type || '');
      const cleanReason = formData.appointment.notes 
        ? stripHtmlTags(formData.appointment.notes) 
        : (formData.appointment.type ? stripHtmlTags(formData.appointment.type) : 'Online-Buchung');
      
      const bookingData = {
        ...formData,
        patient: {
          ...formData.patient,
          address: formData.patient.address || {
            street: '',
            zipCode: '',
            city: '',
            country: 'Österreich'
          }
        },
        appointment: {
          ...formData.appointment,
          type: cleanAppointmentType || 'Allgemeine Beratung', // Bereinigter Service-Name ohne HTML
          serviceId: selectedService?._id,
          duration: totalDuration, // Sende die korrekte Dauer mit Pufferzeiten
          reason: cleanReason, // Bereinigter Grund ohne HTML
          notes: formData.appointment.notes ? stripHtmlTags(formData.appointment.notes) : ''
        },
        anamnesisResponses: anamnesisResponses,
        gdprConsent: gdprConsent
      };
      
      const response = await api.post('/online-booking/book', bookingData);
      
      console.log('[OnlineBooking] Booking response:', response);
      
      // Die API gibt direkt { success: true, message: '...', data: {...} } zurück
      // api.ts wrapper gibt { data: { success: true, message: '...', data: {...} }, success: true } zurück
      if (response.success || (response.data as any)?.success) {
        const responseData = response.data as any;
        const bookingResultData = responseData?.data || responseData;
        
        console.log('[OnlineBooking] Booking result data:', bookingResultData);
        console.log('[OnlineBooking] requiresDoubleOptIn:', bookingResultData?.requiresDoubleOptIn);
        
        // Prüfe ob Double Opt-In erforderlich ist
        if (bookingResultData?.requiresDoubleOptIn) {
          console.log('[OnlineBooking] Setting requiresOptIn to true');
          setRequiresOptIn(true);
          setBookingResult(bookingResultData);
        } else {
          console.log('[OnlineBooking] Setting showConfirmation to true and activeStep to 6');
          setBookingResult(bookingResultData);
          setShowConfirmation(true);
          setActiveStep(6); // Gehe zum Bestätigungsschritt
          console.log('[OnlineBooking] showConfirmation should now be true');
        }
        
        // Aktualisiere die Verfügbarkeit nach erfolgreicher Buchung
        console.log('[OnlineBooking] Refreshing calendar availability after booking...');
        if (selectedDoctor && selectedService) {
          // Warte kurz, damit der Backend die Buchung verarbeitet hat
          setTimeout(async () => {
            // Aktualisiere Online-Booking Verfügbarkeit
            if (calendarView === 'month') {
              loadCalendarAvailability();
            } else {
              loadWeekAvailability();
            }
            
            // Aktualisiere Appointments im Redux Store (für Hauptkalender)
            try {
              console.log('[OnlineBooking] Refreshing appointments in Redux store...');
              await dispatch(fetchAppointments());
              console.log('[OnlineBooking] Appointments refreshed successfully');
            } catch (error) {
              console.error('[OnlineBooking] Error refreshing appointments:', error);
            }
          }, 1000);
        }
        
        setSnackbar({ 
          open: true, 
          message: responseData?.message || bookingResultData?.message || 'Termin erfolgreich gebucht!', 
          severity: 'success' 
        });
      } else {
        const errorMessage = (response.data as any)?.message || response.message || 'Fehler beim Buchen des Termins';
        setSnackbar({ 
          open: true, 
          message: errorMessage, 
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
          {/* Schritt 0: Kategorie auswählen */}
          <Step>
            <StepLabel>
              <Box display="flex" alignItems="center" gap={1}>
                <Category />
                Kategorie auswählen
              </Box>
            </StepLabel>
            <StepContent>
              <Typography variant="h6" gutterBottom>
                Wählen Sie eine Kategorie
              </Typography>
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : categories.length === 0 ? (
                <Alert severity="info">
                  Keine Kategorien verfügbar
                </Alert>
              ) : (
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  {categories.map((category) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={category.name}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          border: selectedCategory?.name === category.name ? 2 : 1,
                          borderColor: selectedCategory?.name === category.name ? 'primary.main' : 'divider',
                          '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: 2
                          }
                        }}
                        onClick={() => handleCategorySelect(category)}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {category.color_hex && (
                              <Box
                                sx={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: '50%',
                                  bgcolor: category.color_hex
                                }}
                              />
                            )}
                            <Typography variant="h6">{category.name}</Typography>
                          </Box>
                          {category.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {category.description}
                            </Typography>
                          )}
                          <Chip
                            label={`${category.serviceCount} Leistung${category.serviceCount !== 1 ? 'en' : ''}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </StepContent>
          </Step>

          {/* Schritt 1: Leistung auswählen */}
          {selectedCategory && (
            <Step>
              <StepLabel>
                <Box display="flex" alignItems="center" gap={1}>
                  <MedicalServices />
                  Leistung auswählen
                </Box>
              </StepLabel>
              <StepContent>
                <Typography variant="h6" gutterBottom>
                  Wählen Sie eine Leistung aus der Kategorie "{selectedCategory.name}"
                </Typography>
                {loading ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : services.length === 0 ? (
                  <Alert severity="info">
                    Keine Leistungen in dieser Kategorie verfügbar
                  </Alert>
                ) : (
                  <>
                    <Grid container spacing={2} sx={{ mt: 2 }}>
                      {services.map((service) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={service._id}>
                          <Card
                            sx={{
                              cursor: 'pointer',
                              border: selectedService?._id === service._id ? 2 : 1,
                              borderColor: selectedService?._id === service._id ? 'primary.main' : 'divider',
                              '&:hover': {
                                borderColor: 'primary.main',
                                boxShadow: 3
                              },
                              height: '100%'
                            }}
                            onClick={() => handleServiceSelect(service)}
                          >
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <MedicalServices color="primary" />
                                <Typography 
                                  variant="h6" 
                                  fontWeight="bold"
                                  dangerouslySetInnerHTML={{ __html: service.name }}
                                />
                              </Box>
                              {service.code && (
                                <Chip
                                  label={service.code}
                                  size="small"
                                  variant="outlined"
                                  sx={{ mb: 1 }}
                                />
                              )}
                              {service.description && (
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary" 
                                  sx={{ mb: 1 }}
                                  dangerouslySetInnerHTML={{ __html: service.description }}
                                />
                              )}
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                <Chip
                                  label={`${(service.base_duration_min || service.duration || 30) + (service.buffer_before_min || 0) + (service.buffer_after_min || 0)} Min.`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  title={`Grunddauer: ${service.base_duration_min || service.duration || 30} Min.${(service.buffer_before_min || 0) + (service.buffer_after_min || 0) > 0 ? ` + Puffer: ${(service.buffer_before_min || 0) + (service.buffer_after_min || 0)} Min.` : ''}`}
                                />
                                {(service.price_cents || service.price) && (
                                  <Chip
                                    label={`€${toEuro(service.price || service.price_cents || 0).toFixed(2)}`}
                                    size="small"
                                    color="secondary"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                    {selectedService && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography 
                          variant="body1" 
                          fontWeight="bold"
                          dangerouslySetInnerHTML={{ __html: `Ausgewählte Leistung: ${selectedService.name}` }}
                        />
                        {selectedService.description && (
                          <Typography 
                            variant="body2" 
                            sx={{ mt: 0.5 }}
                            dangerouslySetInnerHTML={{ __html: selectedService.description }}
                          />
                        )}
                        <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2">
                            <strong>Dauer:</strong> {
                              (selectedService.base_duration_min || selectedService.duration || 30) + 
                              (selectedService.buffer_before_min || 0) + 
                              (selectedService.buffer_after_min || 0)
                            } Min.
                            {(selectedService.buffer_before_min || 0) + (selectedService.buffer_after_min || 0) > 0 && (
                              <span style={{ fontSize: '0.85em', color: '#666' }}>
                                {' '}(Grund: {selectedService.base_duration_min || selectedService.duration || 30} Min. + Puffer: {(selectedService.buffer_before_min || 0) + (selectedService.buffer_after_min || 0)} Min.)
                              </span>
                            )}
                          </Typography>
                          {selectedService.price_cents && (
                            <Typography variant="body2">
                              <strong>Preis:</strong> €{toEuro(selectedService.price_cents || selectedService.price || 0).toFixed(2)}
                            </Typography>
                          )}
                        </Box>
                      </Alert>
                    )}
                  </>
                )}
                <Box sx={{ mt: 2 }}>
                  <Button onClick={() => setActiveStep(0)}>Zurück</Button>
                </Box>
              </StepContent>
            </Step>
          )}

          {/* Schritt 2: Personal auswählen */}
          {selectedService && (
            <Step>
              <StepLabel>
                <Box display="flex" alignItems="center" gap={1}>
                  <Person />
                  Personal auswählen
                </Box>
              </StepLabel>
              <StepContent>
              <Typography variant="h6" gutterBottom>
                Wählen Sie Ihr Personal
              </Typography>
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : doctors.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Kein Personal verfügbar</strong>
                  </Typography>
                  <Typography variant="body2">
                    Es ist derzeit kein Personal für Online-Buchungen verfügbar. 
                    Bitte aktivieren Sie die Online-Buchung für einen Mitarbeiter:
                  </Typography>
                  <Box component="ol" sx={{ mt: 1, pl: 2 }}>
                    <li>Gehen Sie zu "Personalverwaltung" → "Mitarbeiter"</li>
                    <li>Bearbeiten Sie einen Mitarbeiter</li>
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
              <Box sx={{ mt: 2 }}>
                <Button onClick={() => setActiveStep(1)}>Zurück</Button>
              </Box>
            </StepContent>
          </Step>
          )}

          {/* Schritt 3: Kalender (Woche/Monat) */}
          {selectedDoctor && selectedService && (
            <Step>
              <StepLabel>
                <Box display="flex" alignItems="center" gap={1}>
                  <CalendarToday />
                  Datum & Zeit wählen
                </Box>
              </StepLabel>
              <StepContent>
                <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                  <Button
                    variant={calendarView === 'week' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setCalendarView('week')}
                  >
                    Woche
                  </Button>
                  <Button
                    variant={calendarView === 'month' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setCalendarView('month')}
                  >
                    Monat
                  </Button>
                </Box>
                <Typography variant="h6" gutterBottom>
                  Wählen Sie ein Datum und eine Zeit
                </Typography>
                {loading ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : calendarView === 'week' ? (
                  <CalendarWeekView
                    selectedDate={selectedDateObj}
                    onDateSelect={handleCalendarDateSelect}
                    availableSlots={calendarSlots}
                    currentWeek={currentWeek}
                    onWeekChange={setCurrentWeek}
                    doctorName={selectedDoctor.name}
                  />
                ) : (
                  <CalendarMonthView
                    selectedDate={selectedDateObj}
                    onDateSelect={(date) => handleCalendarDateSelect(date)}
                    availableSlots={calendarSlots}
                    currentMonth={currentMonth}
                    onMonthChange={setCurrentMonth}
                  />
                )}
                <Box sx={{ mt: 2 }}>
                  <Button onClick={() => setActiveStep(2)}>Zurück</Button>
                </Box>
              </StepContent>
            </Step>
          )}

          {/* Schritt 4: Zeit wählen */}
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
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value && !validateEmail(value)) {
                        setEmailError(getEmailErrorMessage());
                      } else {
                        setEmailError(null);
                      }
                    }}
                    error={!!emailError}
                    helperText={emailError || ''}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Telefon"
                    value={formData.patient.phone}
                    onChange={(e) => handleNestedFormChange('patient', 'phone', e.target.value)}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value && !validatePhone(value)) {
                        setPhoneError(getPhoneErrorMessage());
                      } else {
                        setPhoneError(null);
                      }
                    }}
                    error={!!phoneError}
                    helperText={phoneError || getPhoneErrorMessage()}
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
                  <FormControl fullWidth required>
                    <InputLabel>Geschlecht</InputLabel>
                    <Select
                      value={formData.patient.gender}
                      onChange={(e) => handleNestedFormChange('patient', 'gender', e.target.value)}
                      label="Geschlecht"
                    >
                      <SelectMenuItem value="m">Männlich</SelectMenuItem>
                      <SelectMenuItem value="w">Weiblich</SelectMenuItem>
                      <SelectMenuItem value="d">Divers</SelectMenuItem>
                    </Select>
                  </FormControl>
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
                  <Typography variant="subtitle2" sx={{ mb: 1, mt: 1 }}>
                    Adresse
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Straße und Hausnummer"
                    value={formData.patient.address?.street || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        patient: {
                          ...formData.patient,
                          address: {
                            ...formData.patient.address!,
                            street: e.target.value
                          }
                        }
                      });
                    }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Postleitzahl"
                    value={formData.patient.address?.zipCode || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        patient: {
                          ...formData.patient,
                          address: {
                            ...formData.patient.address!,
                            zipCode: e.target.value
                          }
                        }
                      });
                    }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Stadt"
                    value={formData.patient.address?.city || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        patient: {
                          ...formData.patient,
                          address: {
                            ...formData.patient.address!,
                            city: e.target.value
                          }
                        }
                      });
                    }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Land"
                    value={formData.patient.address?.country || 'Österreich'}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        patient: {
                          ...formData.patient,
                          address: {
                            ...formData.patient.address!,
                            country: e.target.value
                          }
                        }
                      });
                    }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Autocomplete
                    options={services}
                    getOptionLabel={(option) => {
                      const stripHtmlTags = (html: string): string => {
                        if (!html) return '';
                        const tmp = document.createElement('DIV');
                        tmp.innerHTML = html;
                        return tmp.textContent || tmp.innerText || '';
                      };
                      const cleanName = stripHtmlTags(option.name || '');
                      return `${option.code || ''} - ${cleanName}`;
                    }}
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
                    label="Zusätzliche Notizen (optional)"
                    multiline
                    rows={3}
                    value={formData.appointment.notes}
                    onChange={(e) => handleNestedFormChange('appointment', 'notes', e.target.value)}
                    placeholder="Hier können Sie zusätzliche Informationen oder Anmerkungen eingeben..."
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={gdprConsent}
                        onChange={(e) => setGdprConsent(e.target.checked)}
                        required
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Ich stimme der <strong>Datenschutzerklärung (DSGVO)</strong> zu und erlaube die Speicherung und Verarbeitung meiner Daten für die Terminbuchung und Kommunikation.
                      </Typography>
                    }
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
      <Dialog 
        open={showConfirmation} 
        onClose={() => {
          console.log('[OnlineBooking] Closing confirmation dialog');
          setShowConfirmation(false);
          // bookingResult nicht löschen, damit es später noch angezeigt werden kann
        }} 
        maxWidth="sm" 
        fullWidth
        disableEscapeKeyDown={false}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CheckCircle color="success" />
            Termin erfolgreich gebucht!
          </Box>
        </DialogTitle>
        <DialogContent>
          {bookingResult ? (
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
          ) : (
            <Box>
              <Typography variant="body1" color="text.secondary">
                Lade Buchungsdetails...
              </Typography>
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

      {/* Service-Detail-Dialog */}
      <Dialog
        open={openServiceDetailDialog}
        onClose={handleCancelServiceSelection}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'primary.main', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pb: 2
        }}>
          <MedicalServices />
          <Typography variant="h6" component="span" fontWeight="bold">
            Leistungsdetails
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {pendingService && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 56,
                    height: 56
                  }}
                >
                  <MedicalServices fontSize="large" />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="h5" 
                    fontWeight="bold"
                    gutterBottom
                    dangerouslySetInnerHTML={{ __html: pendingService.name }}
                  />
                  {pendingService.code && (
                    <Chip
                      label={pendingService.code}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </Box>
              </Box>

              {pendingService.description && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="text.secondary">
                    Beschreibung
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography 
                      variant="body1"
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.8
                      }}
                      dangerouslySetInnerHTML={{ __html: pendingService.description }}
                    />
                  </Card>
                </Box>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom>
                      Dauer
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTime color="primary" />
                      <Typography variant="h6" fontWeight="bold">
                        {
                          (pendingService.base_duration_min || pendingService.duration || 30) + 
                          (pendingService.buffer_before_min || 0) + 
                          (pendingService.buffer_after_min || 0)
                        } Min.
                      </Typography>
                    </Box>
                    {(pendingService.buffer_before_min || 0) + (pendingService.buffer_after_min || 0) > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Grund: {pendingService.base_duration_min || pendingService.duration || 30} Min. + Puffer: {(pendingService.buffer_before_min || 0) + (pendingService.buffer_after_min || 0)} Min.
                      </Typography>
                    )}
                  </Box>

                  {pendingService.price_cents && (
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom>
                        Preis
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocalHospital color="secondary" />
                        <Typography variant="h6" fontWeight="bold" color="secondary.main">
                          €{toEuro(pendingService.price_cents || pendingService.price || 0).toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {pendingService.category && (
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom>
                        Kategorie
                      </Typography>
                      <Chip
                        label={pendingService.category}
                        size="medium"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, gap: 2 }}>
          <Button
            onClick={handleCancelServiceSelection}
            variant="outlined"
            color="inherit"
            size="large"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirmServiceSelection}
            variant="contained"
            color="primary"
            size="large"
            startIcon={<CheckCircle />}
            sx={{ minWidth: 150 }}
          >
            Diese Leistung wählen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OnlineBooking;
