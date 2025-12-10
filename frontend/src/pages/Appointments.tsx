import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
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
  FormControlLabel,
  Switch,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Avatar,
  Badge,
  Autocomplete,
  CircularProgress,
  Menu,
} from '@mui/material';
import {
  Add,
  CalendarToday,
  ViewWeek,
  ViewModule,
  Edit,
  Delete,
  CheckCircle,
  Schedule,
  Person,
  AccessTime,
  Visibility,
  Cancel,
  Done,
  Warning,
  Info,
  Event,
  LocalHospital,
  MedicalServices,
  Note,
  Search,
  Refresh,
  Star,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAppointments, createAppointment, updateAppointment, deleteAppointment } from '../store/slices/appointmentSlice';
import { fetchPatientDiagnoses, PatientDiagnosis } from '../store/slices/diagnosisSlice';
import api from '../utils/api';
import GradientDialogTitle from '../components/GradientDialogTitle';
import DiagnosisManager from '../components/DiagnosisManager';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
  insuranceNumber?: string;
  socialSecurityNumber?: string;
  gender: 'male' | 'female' | 'other';
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  // Medizinische Daten
  allergies?: Array<string | {
    type?: string;
    description: string;
    severity?: string;
    reaction?: string;
  }>;
  preExistingConditions?: string[];
  medicalHistory?: string[];
  isPregnant?: boolean;
  pregnancyWeek?: number;
  isBreastfeeding?: boolean;
  hasPacemaker?: boolean;
  hasDefibrillator?: boolean;
  currentMedications?: Array<string | {
    name: string;
    dosage: string;
    frequency: string;
    startDate?: string;
    prescribedBy?: string;
  }>;
}

interface Appointment {
  _id: string;
  patient: Patient; // Echte Patient-Referenz statt nur Strings
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  type: string; // Legacy field - wird durch serviceId ersetzt
  serviceId?: string; // Verknüpfung zum Service Catalog
  service?: {
    _id: string;
    code: string;
    name: string;
    description?: string;
    base_duration_min: number;
    color_hex?: string;
    price_cents?: number;
    requires_room: boolean;
    required_device_type?: string;
    online_bookable: boolean;
  };
  doctor: {
    _id: string;
    firstName: string;
    lastName: string;
    title?: string;
    specialization?: string;
  };
  room?: {
    _id: string;
    name: string;
    number: string;
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
    type: string;
    status: string;
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
  location?: {
    _id: string;
    name: string;
    code: string;
  };
  status: 'geplant' | 'bestätigt' | 'wartend' | 'in_behandlung' | 'abgeschlossen' | 'abgesagt' | 'verschoben';
  title: string;
  description?: string;
  notes?: string;
  diagnosis?: string; // Einzelne Diagnose als String
  icd10Code?: string;
  bookingType: 'online' | 'internal' | 'phone' | 'walk_in';
  createdAt: string;
  updatedAt: string;
  
  // Legacy fields für Rückwärtskompatibilität
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  patientEmail?: string;
  doctorId?: string;
  doctorName?: string;
  date?: string;
  time?: string;
  symptoms?: string[];
  treatment?: string[];
  currentMedications?: string[];
  followUpRequired?: boolean;
  followUpDate?: string;
}

interface WaitingList {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  reason: string;
  priority: 'niedrig' | 'normal' | 'hoch' | 'dringend';
  addedAt: string;
  estimatedWaitTime: number; // in minutes
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

// Legacy interface für Rückwärtskompatibilität
interface AppointmentType {
  value: string;
  label: string;
  description?: string;
  duration: number;
  color: string;
  category?: string;
  location?: {
    _id: string;
    name: string;
    code: string;
  };
}

const Appointments: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [selectedServiceForAvailability, setSelectedServiceForAvailability] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Array<{startTime: string, endTime: string, staff: any, location?: string}>>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingList[]>([]);
  const [inTreatmentList, setInTreatmentList] = useState<WaitingList[]>([]);
  const [completedList, setCompletedList] = useState<WaitingList[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearchValue, setPatientSearchValue] = useState<Patient | null>(null);
  const [patientSearchInput, setPatientSearchInput] = useState('');
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [serviceSearchInput, setServiceSearchInput] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [locations, setLocations] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [staff, setStaff] = useState<Array<{ _id: string; display_name: string; first_name: string; last_name: string }>>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const { currentLocation } = useAppSelector((state) => state.locations);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<{ el: HTMLElement | null, appointmentId: string | null }>({ el: null, appointmentId: null });
  const { patientDiagnoses } = useAppSelector((state) => state.diagnoses);
  const [patientDiagnosesMap, setPatientDiagnosesMap] = useState<Map<string, PatientDiagnosis[]>>(new Map());
  const [formData, setFormData] = useState<Partial<Appointment>>({
    patientId: '',
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    doctorId: '1',
    doctorName: 'Dr. Mustermann',
    date: '',
    time: '',
    duration: 30,
    type: '',
    status: 'geplant',
    room: {
      _id: '',
      name: 'Behandlungszimmer 1',
      number: '101'
    },
    notes: '',
    symptoms: [] as string[],
    diagnosis: '', // Als String statt Array
    treatment: [] as string[],
    currentMedications: [] as string[],
    followUpRequired: false
  });

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: 'day' | 'week' | 'month' | null,
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  // Filter and search
  const filteredAppointments = (Array.isArray(appointments) ? appointments : []).filter(appointment => {
    const patientName = appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : appointment.patientName || '';
    const notes = appointment.notes || '';
    const matchesSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus;
    // Filter by service ID if available, otherwise by type
    const appointmentTypeValue = appointment.service?._id || appointment.serviceId || appointment.type;
    const matchesType = filterType === 'all' || appointmentTypeValue === filterType;
    
    // Filter by patient if patientSearchValue is set
    let matchesPatient = true;
    if (patientSearchValue) {
      const appointmentPatientId = typeof appointment.patient === 'object' && appointment.patient?._id 
        ? appointment.patient._id 
        : typeof appointment.patient === 'string' 
        ? appointment.patient 
        : appointment.patientId;
      matchesPatient = appointmentPatientId === patientSearchValue._id;
    }
    
    // Filter by view mode (day/week/month)
    let matchesViewMode = true;
    if (viewMode === 'day' || viewMode === 'week' || viewMode === 'month') {
      const appointmentDate = new Date(appointment.startTime);
      const today = new Date();
      
      if (viewMode === 'day') {
        matchesViewMode = appointmentDate.toDateString() === today.toDateString();
      } else if (viewMode === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        matchesViewMode = appointmentDate >= weekStart && appointmentDate <= weekEnd;
      } else if (viewMode === 'month') {
        matchesViewMode = appointmentDate.getMonth() === today.getMonth() && 
                         appointmentDate.getFullYear() === today.getFullYear();
      }
    }
    
    return matchesSearch && matchesStatus && matchesType && matchesPatient && matchesViewMode;
  });

  // CRUD Operations
  const handleAddAppointment = () => {
    setFormData({
      patientId: '',
      patientName: '',
      patientPhone: '',
      patientEmail: '',
      doctorId: '1',
      doctorName: 'Dr. Mustermann',
      date: new Date().toISOString().split('T')[0],
      time: '',
      duration: 30,
      type: '',
      status: 'geplant',
      room: {
        _id: '',
        name: 'Behandlungszimmer 1',
        number: '101'
      },
      notes: '',
      symptoms: [] as string[],
      diagnosis: '',
      treatment: [],
      currentMedications: [],
      followUpRequired: false
    });
    setPatientSearchValue(null);
    setPatientSearchInput('');
    // Standort reset - wird automatisch vorbelegt wenn nur einer existiert
    // Verwende currentLocation wenn verfügbar, sonst ersten Standort
    if (currentLocation) {
      setSelectedLocation(currentLocation._id);
    } else {
      setSelectedLocation(locations.length === 1 ? locations[0]._id : '');
    }
    setSelectedStaff('');
    setDialogMode('add');
    setActiveTab(0);
    setOpenDialog(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    // Extrahiere Datum und Zeit aus startTime
    let date = '';
    let time = '';
    
    if (appointment.startTime) {
      try {
        const startDate = new Date(appointment.startTime);
        if (!isNaN(startDate.getTime())) {
          date = startDate.toISOString().split('T')[0];
          time = startDate.toTimeString().split(' ')[0].substring(0, 5);
        }
      } catch (error) {
        console.warn('Error parsing startTime:', error);
      }
    }
    
    // Fallback zu Legacy-Feldern
    if (!date && appointment.date) {
      date = appointment.date;
    }
    if (!time && appointment.time) {
      time = appointment.time;
    }

    setFormData({
      ...appointment,
      date,
      time
    });
    setSelectedAppointment(appointment);
    setPatientSearchValue(appointment.patient || null);
    setPatientSearchInput(appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : '');
    setDialogMode('edit');
    setOpenDialog(true);
  };

  const handleViewAppointment = (appointment: Appointment) => {
    // Extrahiere Datum und Zeit aus startTime
    let date = '';
    let time = '';
    
    if (appointment.startTime) {
      try {
        const startDate = new Date(appointment.startTime);
        if (!isNaN(startDate.getTime())) {
          date = startDate.toISOString().split('T')[0];
          time = startDate.toTimeString().split(' ')[0].substring(0, 5);
        }
      } catch (error) {
        console.warn('Error parsing startTime:', error);
      }
    }
    
    // Fallback zu Legacy-Feldern
    if (!date && appointment.date) {
      date = appointment.date;
    }
    if (!time && appointment.time) {
      time = appointment.time;
    }

    setFormData({
      ...appointment,
      date,
      time
    });
    setSelectedAppointment(appointment);
    setPatientSearchValue(appointment.patient || null);
    setPatientSearchInput(appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : '');
    setDialogMode('view');
    setOpenDialog(true);
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    // Lokalen State aktualisieren
    setAppointments(prev => prev.filter(a => a._id !== appointmentId));
    
    // Redux Store aktualisieren
    try {
      await dispatch(deleteAppointment(appointmentId)).unwrap();
    } catch (error) {
      console.error('Error deleting appointment from Redux store:', error);
    }
    
    setSnackbar({ open: true, message: 'Termin erfolgreich gelöscht', severity: 'success' });
  };

  const handleOpenStatusMenu = (event: React.MouseEvent<HTMLElement>, appointmentId: string) => {
    setStatusMenuAnchor({ el: event.currentTarget, appointmentId });
  };

  const handleCloseStatusMenu = () => {
    setStatusMenuAnchor({ el: null, appointmentId: null });
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!statusMenuAnchor.appointmentId) return;
    
    const appointment = appointments.find(a => a._id === statusMenuAnchor.appointmentId);
    if (!appointment) return;

    try {
      await dispatch(updateAppointment({
        id: appointment._id,
        status: newStatus as Appointment['status']
      })).unwrap();
      
      // Lokalen State aktualisieren
      setAppointments(prev => prev.map(a => 
        a._id === statusMenuAnchor.appointmentId ? { ...a, status: newStatus as Appointment['status'] } : a
      ));
      
      // Wartezeit und Wartezimmer verwalten
      if (newStatus === 'wartend' && appointment.patient) {
        const now = new Date();
        const waitTime = 0; // Berechnet später basierend auf Warteliste
        
        const waitingPatient: WaitingList = {
          id: appointment._id,
          patientId: appointment.patient._id,
          patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          patientPhone: appointment.patient.phone || '',
          reason: appointment.type || 'Termin',
          priority: 'normal',
          addedAt: now.toISOString(),
          estimatedWaitTime: waitTime
        };
        
        // Zum Wartezimmer hinzufügen
        console.log('Adding to waiting list:', waitingPatient);
        setWaitingList(prev => {
          const exists = prev.find(w => w.id === appointment._id);
          if (exists) {
            return prev.map(w => w.id === appointment._id ? waitingPatient : w);
          }
          console.log('Previous waiting list:', prev);
          const newList = [...prev, waitingPatient];
          console.log('New waiting list:', newList);
          return newList;
        });
        
        setSnackbar({ open: true, message: 'Status erfolgreich aktualisiert. Patient wurde zum Wartezimmer hinzugefügt.', severity: 'success' });
      } else if (newStatus === 'in_behandlung' && appointment.patient) {
        // Patient zur Behandlungsliste hinzufügen
        const now = new Date();
        const treatmentPatient: WaitingList = {
          id: appointment._id,
          patientId: appointment.patient._id,
          patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          patientPhone: appointment.patient.phone || '',
          reason: appointment.type || 'Behandlung',
          priority: 'normal',
          addedAt: now.toISOString(),
          estimatedWaitTime: 0
        };
        
        console.log('Adding to treatment list:', treatmentPatient);
        setInTreatmentList(prev => {
          const exists = prev.find(w => w.id === appointment._id);
          if (exists) {
            return prev.map(w => w.id === appointment._id ? treatmentPatient : w);
          }
          return [...prev, treatmentPatient];
        });
        
        // Aus Wartezimmer entfernen falls vorhanden
        setWaitingList(prev => prev.filter(w => w.id !== appointment._id));
        
        setSnackbar({ open: true, message: 'Status erfolgreich aktualisiert. Patient wird behandelt.', severity: 'success' });
      } else if (newStatus === 'abgeschlossen' && appointment.patient) {
        // Patient zur Abgeschlossen-Liste hinzufügen
        const now = new Date();
        const completedPatient: WaitingList = {
          id: appointment._id,
          patientId: appointment.patient._id,
          patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          patientPhone: appointment.patient.phone || '',
          reason: appointment.type || 'Abgeschlossen',
          priority: 'normal',
          addedAt: now.toISOString(),
          estimatedWaitTime: 0
        };
        
        console.log('Adding to completed list:', completedPatient);
        setCompletedList(prev => {
          const exists = prev.find(w => w.id === appointment._id);
          if (exists) {
            return prev.map(w => w.id === appointment._id ? completedPatient : w);
          }
          return [...prev, completedPatient];
        });
        
        // Aus Wartezimmer und Behandlungsliste entfernen falls vorhanden
        setWaitingList(prev => prev.filter(w => w.id !== appointment._id));
        setInTreatmentList(prev => prev.filter(w => w.id !== appointment._id));
        
        setSnackbar({ open: true, message: 'Status erfolgreich aktualisiert. Behandlung abgeschlossen.', severity: 'success' });
      } else if (newStatus !== 'wartend' && newStatus !== 'in_behandlung' && newStatus !== 'abgeschlossen') {
        // Wenn Status weder "wartend", "in_behandlung" noch "abgeschlossen" ist, aus allen Listen entfernen
        setWaitingList(prev => prev.filter(w => w.id !== appointment._id));
        setInTreatmentList(prev => prev.filter(w => w.id !== appointment._id));
        setCompletedList(prev => prev.filter(w => w.id !== appointment._id));
        setSnackbar({ open: true, message: 'Status erfolgreich aktualisiert', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Status erfolgreich aktualisiert', severity: 'success' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Fehler beim Aktualisieren des Status', severity: 'error' });
    }
    
    handleCloseStatusMenu();
  };

  const handleSaveAppointment = async () => {
    if (dialogMode === 'add') {
      // Validiere Pflichtfelder
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

      // Erstelle korrekte Datumsfelder
      const date = formData.date || new Date().toISOString().split('T')[0];
      const time = formData.time || '09:00';
      // Erstelle ISO-String ohne Zeitzone für lokale Zeit
      const startTime = `${date}T${time}:00`;
      const duration = formData.duration || 30;
      // Berechne endTime korrekt
      const [hours, minutes] = time.split(':').map(Number);
      const endDate = new Date(`${date}T${time}:00`);
      endDate.setMinutes(endDate.getMinutes() + duration);
      const endHours = endDate.getHours();
      const endMinutes = endDate.getMinutes();
      const endTime = `${date}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`;

      // Hole zugewiesene Räume, Geräte und Personal aus der Leistung
      const selectedService = services.find(s => s._id === formData.serviceId);
      const assignedRooms = selectedService?.assigned_rooms?.map((r: { _id: string }) => r._id || r) || [];
      const assignedDevices = selectedService?.assigned_devices?.map((d: { _id: string }) => d._id || d) || [];
      const assignedUsers = selectedService?.assigned_users?.map((u: { _id: string }) => u._id || u) || [];
      
      // Füge ausgewähltes Personal hinzu
      if (selectedStaff) {
        assignedUsers.push(selectedStaff);
      }

      const newAppointment = {
        title: formData.patientName || 'Termin',
        startTime,
        endTime,
        patient: formData.patientId,
        type: 'consultation', // Verwende nur gültige Backend-Werte: 'consultation', 'follow-up', 'emergency', 'procedure'
        notes: formData.notes || '',
        location_id: selectedLocation,
        // Service-spezifische Zuordnungen
        service: selectedService?._id,
        assigned_rooms: assignedRooms,
        assigned_devices: assignedDevices,
        assigned_users: assignedUsers
      };
      
      console.log('Creating appointment with service data:', {
        service: selectedService?.name,
        assignedRooms,
        assignedDevices,
        assignedUsers
      });
      
      console.log('Creating appointment with data:', newAppointment);
      console.log('Form data:', formData);
      
      // Redux Store aktualisieren (wird automatisch den lokalen State über useEffect aktualisieren)
      try {
        await dispatch(createAppointment(newAppointment)).unwrap();
        console.log('Termin erfolgreich in der Datenbank gespeichert');
      } catch (error: any) {
        console.error('Error saving appointment to Redux store:', error);
        console.error('Error type:', typeof error);
        console.error('Error payload:', error?.payload);
        console.error('Error message:', error?.message);
        console.error('Full error:', JSON.stringify(error, null, 2));
        
        // Extrahieren der Fehlermeldung - verbesserte Logik
        let errorMessage = 'Fehler beim Erstellen des Termins';
        
        // Wenn der error bereits ein String ist (von .unwrap()), verwende ihn direkt
        if (typeof error === 'string') {
          // Aber nur wenn es nicht die Default-Message ist
          if (error !== 'Fehler beim Erstellen des Termins') {
            errorMessage = error;
          } else {
            // Wenn es die Default-Message ist, versuche die tatsächliche Fehlermeldung aus der Konsole zu extrahieren
            // Wir loggen die eigentliche Fehlermeldung im appointmentSlice
          }
        } else if (error && typeof error === 'object') {
          // Check for payload (from Redux async thunk)
          if (error.payload) {
            errorMessage = typeof error.payload === 'string' ? error.payload : errorMessage;
          }
          // Check for message (from Error object)
          if (error.message && typeof error.message === 'string') {
            errorMessage = error.message;
          }
        }
        
        console.log('Final extracted error message:', errorMessage);
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
        return; // Stoppe hier, wenn Speichern fehlschlägt
      }
      
      setSnackbar({ open: true, message: 'Termin erfolgreich hinzugefügt', severity: 'success' });
    } else if (dialogMode === 'edit' && selectedAppointment) {
      // Aktualisiere Datumsfelder für Bearbeitung
      const date = formData.date || new Date().toISOString().split('T')[0];
      const time = formData.time || '09:00';
      const startTime = new Date(`${date}T${time}:00Z`).toISOString();
      const duration = formData.duration || 30;
      const endTime = new Date(new Date(startTime).getTime() + duration * 60000).toISOString();

      const updatedAppointment = {
        title: formData.patientName || 'Termin',
        startTime,
        endTime,
        patient: formData.patientId,
        type: formData.type || 'consultation',
        notes: formData.notes || ''
      };

      // Redux Store aktualisieren (wird automatisch den lokalen State über useEffect aktualisieren)
      try {
        const reduxUpdateData = {
          id: selectedAppointment._id,
          ...updatedAppointment
        };
        await dispatch(updateAppointment(reduxUpdateData)).unwrap();
        console.log('Termin erfolgreich in der Datenbank aktualisiert');
      } catch (error) {
        console.error('Error updating appointment in Redux store:', error);
        setSnackbar({ open: true, message: 'Fehler beim Aktualisieren des Termins', severity: 'error' });
        return; // Stoppe hier, wenn Update fehlschlägt
      }
      
      setSnackbar({ open: true, message: 'Termin erfolgreich aktualisiert', severity: 'success' });
    }
    setOpenDialog(false);
  };


  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Synchronisiere patientSearchValue mit formData.patientId, falls patientSearchValue gesetzt ist
  useEffect(() => {
    if (patientSearchValue?._id) {
      console.log('🔄 Syncing patientSearchValue to formData:', patientSearchValue._id);
      setFormData(prev => ({
        ...prev,
        patientId: patientSearchValue._id,
        patient: patientSearchValue
      }));
      
      // Lade Diagnosen des Patienten
      dispatch(fetchPatientDiagnoses({ 
        patientId: patientSearchValue._id, 
        status: 'active' 
      }));
    }
  }, [patientSearchValue, dispatch]);

  // Lade Diagnosen auch wenn formData.patient direkt gesetzt wird (z.B. beim Öffnen eines bestehenden Termins)
  useEffect(() => {
    const patientId = formData.patient?._id || (typeof formData.patient === 'object' && formData.patient?._id) 
      ? formData.patient._id 
      : null;
    
    if (patientId && patientId !== patientSearchValue?._id) {
      console.log('🔄 Loading diagnoses for patient from formData:', patientId);
      dispatch(fetchPatientDiagnoses({ 
        patientId: patientId, 
        status: 'active' 
      }));
    }
  }, [formData.patient, dispatch, patientSearchValue]);

  // Debug: Log activeTab whenever it changes
  useEffect(() => {
    console.log('📊 activeTab changed to:', activeTab);
  }, [activeTab]);

  const handleCheckAvailability = async (serviceId: string) => {
    setSelectedServiceForAvailability(serviceId);
    setLoadingAvailability(true);
    setShowAvailabilityDialog(true);

    try {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 Tage

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/appointments/available-slots?serviceId=${serviceId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const data = await response.json();

      if (data.success && data.data.availableSlots) {
        setAvailableSlots(data.data.availableSlots);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'geplant': return 'info';
      case 'bestätigt': return 'success';
      case 'wartend': return 'warning';
      case 'in_behandlung': return 'error';
      case 'abgeschlossen': return 'success';
      case 'abgesagt': return 'default';
      case 'verschoben': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: Appointment['status']) => {
    switch (status) {
      case 'geplant': return <Schedule />;
      case 'bestätigt': return <CheckCircle />;
      case 'wartend': return <AccessTime />;
      case 'in_behandlung': return <Person />;
      case 'abgeschlossen': return <Done />;
      case 'abgesagt': return <Cancel />;
      case 'verschoben': return <Warning />;
      default: return <Info />;
    }
  };

  // Funktionen für die letzten 10 verwendeten Leistungen
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
      // Entferne die ID, falls sie bereits existiert
      const filtered = recent.filter((id: string) => id !== serviceId);
      // Füge sie am Anfang hinzu
      const updated = [serviceId, ...filtered].slice(0, 10);
      localStorage.setItem('recentServices', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving recent service:', error);
    }
  };

  // Filtere und sortiere Leistungen: Favoriten zuerst, dann letzte 10, dann alle anderen
  const getFilteredAndSortedServices = (): Service[] => {
    // Filtere aktive Leistungen - prüfe sowohl Boolean als auch String/Number (für Backend-Kompatibilität)
    const activeServices = services.filter(service => {
      const isActive = service.is_active === true || 
                      (service as any).is_active === 'true' || 
                      (service as any).is_active === 1;
      return isActive;
    });
    const recentIds = getRecentServices();
    
    // Debug: Prüfe ob "tribella" in den Leistungen ist
    if (process.env.NODE_ENV === 'development') {
      // Prüfe auch in allen Leistungen (nicht nur aktive)
      // Suche nach "tribella" im Namen oder Code "K001"
      const allTribellaServices = services.filter(s => 
        s.name.toLowerCase().includes('tribella') || 
        s.code?.toLowerCase().includes('tribella') ||
        s.code === 'K001' ||
        s.code?.toLowerCase() === 'k001'
      );
      const activeTribellaService = activeServices.find(s => 
        s.name.toLowerCase().includes('tribella') || 
        s.code?.toLowerCase().includes('tribella') ||
        s.code === 'K001' ||
        s.code?.toLowerCase() === 'k001'
      );
      
      if (allTribellaServices.length > 0) {
        console.log('🔍 Tribella gefunden (alle):', allTribellaServices);
        if (!activeTribellaService) {
          console.log('⚠️ Tribella ist inaktiv!', allTribellaServices.map(s => ({ name: s.name, is_active: s.is_active })));
        } else {
          console.log('✅ Tribella gefunden (aktiv):', activeTribellaService);
        }
      } else {
        console.log('🔍 Tribella nicht gefunden. Aktive Leistungen:', activeServices.length);
        console.log('🔍 Alle Leistungen (auch inaktive):', services.length);
        // Suche nach ähnlichen Namen - erweiterte Suche
        const similarNames = services.filter(s => 
          s.name.toLowerCase().includes('trib') || 
          s.name.toLowerCase().includes('behandlung')
        );
        if (similarNames.length > 0) {
          console.log('🔍 Ähnliche Namen gefunden (Anzahl:', similarNames.length, '):');
          // Zeige auch die vollständigen Objekte
          similarNames.forEach((s, index) => {
            console.log(`📋 Leistung ${index + 1}:`, s.name, '| Code:', s.code, '| Aktiv:', s.is_active, '| Favorit:', s.quick_select, '| ID:', s._id);
          });
        }
        
        // Erweiterte Suche: Prüfe auch Codes
        const similarCodes = services.filter(s => 
          s.code?.toLowerCase().includes('trib') || 
          s.code?.toLowerCase().includes('tribe')
        );
        if (similarCodes.length > 0) {
          console.log('🔍 Ähnliche Codes gefunden:', JSON.stringify(similarCodes.map(s => ({ name: s.name, code: s.code, is_active: s.is_active })), null, 2));
        }
        
        // Zeige alle Leistungen mit "trib" im Namen oder Code (für Debugging)
        const allTribServices = services.filter(s => 
          s.name.toLowerCase().includes('trib') || 
          s.code?.toLowerCase().includes('trib')
        );
        if (allTribServices.length > 0) {
          console.log('🔍 ALLE Leistungen mit "trib" (Anzahl:', allTribServices.length, '):');
          allTribServices.forEach(s => {
            console.log('  -', s.name, '(Code:', s.code, ', Aktiv:', s.is_active, ', Favorit:', s.quick_select, ')');
          });
        } else {
          console.log('🔍 KEINE Leistungen mit "trib" gefunden');
        }
        
        // Suche speziell nach Code "K001"
        const k001Service = services.find(s => s.code === 'K001' || s.code?.toLowerCase() === 'k001');
        if (k001Service) {
          console.log('✅ K001 gefunden:', {
            name: k001Service.name,
            code: k001Service.code,
            is_active: k001Service.is_active,
            quick_select: k001Service.quick_select,
            _id: k001Service._id
          });
        } else {
          console.log('❌ K001 nicht gefunden in', services.length, 'Leistungen');
          // Zeige alle Codes zur Debugging
          console.log('🔍 Alle Codes:', services.map(s => s.code).filter(Boolean).slice(0, 20));
        }
      }
    }
    
    // Trenne in Kategorien
    // Prüfe quick_select sowohl als Boolean als auch als String/Number (für Backend-Kompatibilität)
    const favorites = activeServices.filter(s => {
      return s.quick_select === true || 
             (s as any).quick_select === 'true' || 
             (s as any).quick_select === 1;
    });
    const recent = activeServices.filter(s => {
      const isFavorite = s.quick_select === true || 
                        (s as any).quick_select === 'true' || 
                        (s as any).quick_select === 1;
      return recentIds.includes(s._id) && !isFavorite;
    });
    const others = activeServices.filter(s => {
      const isFavorite = s.quick_select === true || 
                        (s as any).quick_select === 'true' || 
                        (s as any).quick_select === 1;
      return !isFavorite && !recentIds.includes(s._id);
    });
    
    // Wenn Suche aktiv ist, filtere alle
    if (serviceSearchInput.trim()) {
      const searchLower = serviceSearchInput.toLowerCase();
      const searchFilter = (s: Service) => 
        s.name.toLowerCase().includes(searchLower) ||
        s.code?.toLowerCase().includes(searchLower) ||
        s.description?.toLowerCase().includes(searchLower) ||
        s.category?.toLowerCase().includes(searchLower);
      
      const filtered = [
        ...favorites.filter(searchFilter),
        ...recent.filter(searchFilter),
        ...others.filter(searchFilter)
      ];
      
      // Debug für Suche
      if (process.env.NODE_ENV === 'development' && searchLower.includes('tribella')) {
        console.log('🔍 Suche nach "tribella":', filtered.length, 'Ergebnisse');
      }
      
      return filtered;
    }
    
    // Ohne Suche: Favoriten + letzte 10 + alle anderen
    const allServices = [...favorites, ...recent, ...others];
    
    // Debug: Prüfe ob alle Leistungen enthalten sind
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Service-Statistik:', {
        total: activeServices.length,
        favorites: favorites.length,
        recent: recent.length,
        others: others.length,
        returned: allServices.length
      });
    }
    
    return allServices;
  };

  // Load services from service catalog
  const loadServices = async () => {
    try {
      console.log('Loading services...');
      // Lade alle Leistungen ohne Limit, damit auch K001 und KONS006 geladen werden
      const response = await api.get<any>('/service-catalog?limit=1000&is_active=true');
      
      console.log('Services API Response:', response);
      
      if (response.success) {
        // Handle different response structures
        let servicesData: Service[] = [];
        
        if (Array.isArray(response.data)) {
          servicesData = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          servicesData = response.data.data;
        } else if (response.data && Array.isArray(response.data.services)) {
          servicesData = response.data.services;
        }
        
        console.log('Services data:', servicesData);
        
        // Debug: Prüfe ob K001 in den geladenen Leistungen ist
        const k001InLoaded = servicesData.find(s => s.code === 'K001' || s.code?.toLowerCase() === 'k001');
        const tribellaInLoaded = servicesData.find(s => 
          s.name.toLowerCase().includes('tribella') || 
          s.code === 'K001' || 
          s.code === 'KONS006'
        );
        
        if (k001InLoaded) {
          console.log('✅ K001 in geladenen Leistungen gefunden:', {
            name: k001InLoaded.name,
            code: k001InLoaded.code,
            is_active: k001InLoaded.is_active,
            quick_select: k001InLoaded.quick_select,
            _id: k001InLoaded._id
          });
        } else {
          console.log('❌ K001 nicht in geladenen Leistungen gefunden');
        }
        
        if (tribellaInLoaded) {
          console.log('✅ Tribella in geladenen Leistungen gefunden:', {
            name: tribellaInLoaded.name,
            code: tribellaInLoaded.code,
            is_active: tribellaInLoaded.is_active,
            quick_select: tribellaInLoaded.quick_select,
            _id: tribellaInLoaded._id
          });
        }
        
        // Zeige alle Favoriten
        const favoritesInLoaded = servicesData.filter(s => s.quick_select === true);
        console.log('🔍 Favoriten in geladenen Leistungen:', favoritesInLoaded.length, 'Leistungen');
        favoritesInLoaded.forEach(f => {
          console.log('  -', f.name, '(Code:', f.code, ', Aktiv:', f.is_active, ')');
        });
        
        // Zeige alle aktiven Leistungen
        const activeInLoaded = servicesData.filter(s => s.is_active === true);
        console.log('🔍 Aktive Leistungen:', activeInLoaded.length, 'von', servicesData.length);
        
        if (servicesData.length > 0) {
          setServices(servicesData);
          // Legacy appointment types für Rückwärtskompatibilität
          const appointmentTypes = servicesData.map((service: Service) => ({
            value: service._id,
            label: service.name,
            description: service.description,
            duration: service.base_duration_min,
            color: service.color_hex || '#2563EB',
            category: service.category
          }));
          setAppointmentTypes(appointmentTypes);
        } else {
          console.warn('No services found in response');
        }
      } else {
        console.error('API response not successful:', response);
      }
    } catch (error) {
      console.error('Error loading services:', error);
      // Fallback zu Mock-Services wenn API fehlschlägt
      const mockServices: Service[] = [
        {
          _id: 'service-1',
          code: 'KONS',
          name: 'Konsultation',
          description: 'Allgemeine ärztliche Beratung',
          category: 'Beratung',
          base_duration_min: 30,
          buffer_before_min: 5,
          buffer_after_min: 5,
          can_overlap: false,
          requires_room: true,
          required_device_type: undefined,
          min_age_years: undefined,
          max_age_years: undefined,
          requires_consent: true,
          online_bookable: true,
          price_cents: 5000,
          billing_code: 'KONS',
          notes: undefined,
          is_active: true,
          color_hex: '#2563EB'
        },
        {
          _id: 'service-2',
          code: 'UNTER',
          name: 'Untersuchung',
          description: 'Körperliche Untersuchung',
          category: 'Untersuchung',
          base_duration_min: 45,
          buffer_before_min: 10,
          buffer_after_min: 10,
          can_overlap: false,
          requires_room: true,
          required_device_type: undefined,
          min_age_years: undefined,
          max_age_years: undefined,
          requires_consent: true,
          online_bookable: true,
          price_cents: 7500,
          billing_code: 'UNTER',
          notes: undefined,
          is_active: true,
          color_hex: '#059669'
        }
      ];
      setServices(mockServices);
      const appointmentTypes = mockServices.map((service: Service) => ({
        value: service._id,
        label: service.name,
        description: service.description,
        duration: service.base_duration_min,
        color: service.color_hex || '#2563EB',
        category: service.category
      }));
      setAppointmentTypes(appointmentTypes);
    }
  };

  const loadPatients = async () => {
    try {
      setPatientSearchLoading(true);
      console.log('Loading patients...');
      const response = await api.get<any>('/patients-extended?page=1&limit=100');
      
      console.log('Patients API Response:', response);
      
      if (response.success) {
        let patientsData: Patient[] = [];
        
        if (Array.isArray(response.data)) {
          patientsData = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          patientsData = response.data.data;
        } else if (response.data && Array.isArray(response.data.patients)) {
          patientsData = response.data.patients;
        }
        
        console.log('Patients data:', patientsData);
        if (patientsData.length > 0) {
          setPatients(patientsData);
        } else {
          console.warn('No patients found in response');
        }
      } else {
        console.error('API response not successful:', response);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      // Fallback zu Mock-Daten wenn API fehlschlägt
      const mockPatients: Patient[] = [
        {
          _id: 'patient-1',
          firstName: 'Max',
          lastName: 'Mustermann',
          dateOfBirth: '1980-05-15',
          phone: '+43 123 456 789',
          email: 'max.mustermann@email.at',
          address: {
            street: 'Hauptstraße 1',
            city: 'Wien',
            zipCode: '1010',
            country: 'Österreich'
          },
          insuranceNumber: '1234567890',
          socialSecurityNumber: '8005151234',
          gender: 'male',
          emergencyContact: {
            name: 'Maria Mustermann',
            phone: '+43 123 456 790',
            relationship: 'Ehefrau'
          }
        },
        {
          _id: 'patient-2',
          firstName: 'Anna',
          lastName: 'Müller',
          dateOfBirth: '1990-03-22',
          phone: '+43 987 654 321',
          email: 'anna.mueller@email.at',
          address: {
            street: 'Nebenstraße 5',
            city: 'Salzburg',
            zipCode: '5020',
            country: 'Österreich'
          },
          insuranceNumber: '0987654321',
          socialSecurityNumber: '9003225678',
          gender: 'female',
          emergencyContact: {
            name: 'Peter Müller',
            phone: '+43 987 654 322',
            relationship: 'Vater'
          }
        },
        {
          _id: 'patient-3',
          firstName: 'Peter',
          lastName: 'Schmidt',
          dateOfBirth: '1978-07-22',
          phone: '+43 555 123 456',
          email: 'peter.schmidt@email.at',
          address: {
            street: 'Musterstraße 8',
            city: 'Graz',
            zipCode: '8010',
            country: 'Österreich'
          },
          insuranceNumber: '0987654321',
          gender: 'male',
          emergencyContact: {
            name: 'Anna Schmidt',
            phone: '+43 555 123 457',
            relationship: 'Ehefrau'
          }
        },
        {
          _id: 'patient-4',
          firstName: 'Hesam',
          lastName: 'Akbari',
          dateOfBirth: '1985-08-10',
          phone: '+43 555 999 888',
          email: 'hesam.akbari@email.at',
          address: {
            street: 'Musterstraße 12',
            city: 'Wien',
            zipCode: '1020',
            country: 'Österreich'
          },
          insuranceNumber: '1234567890',
          gender: 'male',
          emergencyContact: {
            name: 'Sarah Akbari',
            phone: '+43 555 999 889',
            relationship: 'Ehefrau'
          }
        }
      ];
      setPatients(mockPatients);
    } finally {
      setPatientSearchLoading(false);
    }
  };

  // Legacy function - wird durch loadServices ersetzt
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadAppointmentTypes = loadServices;

  // Standorte laden
  const loadLocations = async () => {
    try {
      const response = await api.get<{data: Array<{ _id: string; name: string; code: string }>}>('/locations');
      if (response.success) {
        setLocations(response.data.data || []);
        
        // Automatische Vorbelegung wenn nur ein Standort vorhanden
        if (response.data.data && response.data.data.length === 1) {
          setSelectedLocation(response.data.data[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  // Personal laden
  const loadStaff = async () => {
    try {
      const response = await api.get<{data: Array<{ _id: string; display_name: string; first_name: string; last_name: string }>}>('/staff-profiles');
      if (response.success) {
        setStaff(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  // URL parameter reading for patient filter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const patientId = searchParams.get('patient');
    if (patientId) {
      console.log('Patient filter from URL:', patientId);
      // Find patient by ID
      const patient = patients.find(p => p._id === patientId);
      if (patient) {
        setPatientSearchValue(patient);
        setSearchTerm(`${patient.firstName} ${patient.lastName}`);
      }
    }
  }, [location.search, patients]);

  // Handle URL parameters for opening dialog with prefilled date and time
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const openDialogParam = searchParams.get('openDialog');
    const dateParam = searchParams.get('date');
    const timeParam = searchParams.get('time');
    
    if (openDialogParam === 'true') {
      // Open dialog and prefill date and time
      setOpenDialog(true);
      setDialogMode('add');
      
      if (dateParam && timeParam) {
        // Prefill form with date and time from URL
        const dateStr = dateParam;
        const timeStr = timeParam;
        
        setFormData(prev => ({
          ...prev,
          date: dateStr,
          time: timeStr,
        }));
        
        // Remove URL parameters after reading them
        const newSearchParams = new URLSearchParams(location.search);
        newSearchParams.delete('openDialog');
        newSearchParams.delete('date');
        newSearchParams.delete('time');
        const newSearch = newSearchParams.toString();
        navigate(location.pathname + (newSearch ? `?${newSearch}` : ''), { replace: true });
      }
    }
  }, [location.search, navigate, location.pathname]);

  // Initialize with real data from API - only once
  useEffect(() => {
    console.log('Appointments component mounted, loading data...');
    loadServices();
    loadPatients();
    loadLocations();
    loadStaff();
    
    // Load real appointments from API
    if (!isInitialized) {
      dispatch(fetchAppointments());
      setIsInitialized(true);
    }
  }, [isInitialized, dispatch]); // Only depend on isInitialized and dispatch

  // Use appointments from Redux store instead of local state
  const { appointments: reduxAppointments } = useAppSelector((state) => state.appointments);
  
  // Lade Diagnosen für alle Patienten in den Terminen
  useEffect(() => {
    if (reduxAppointments && reduxAppointments.length > 0) {
      const patientIds = new Set<string>();
      reduxAppointments.forEach((apt: any) => {
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
  }, [reduxAppointments, dispatch]);
  
  // Erstelle eine Map von Patient-ID zu Diagnosen
  useEffect(() => {
    if (patientDiagnoses && patientDiagnoses.length > 0) {
      const newMap = new Map<string, PatientDiagnosis[]>();
      patientDiagnoses.forEach((diag: PatientDiagnosis) => {
        if (!newMap.has(diag.patientId)) {
          newMap.set(diag.patientId, []);
        }
        newMap.get(diag.patientId)!.push(diag);
      });
      setPatientDiagnosesMap(newMap);
    }
  }, [patientDiagnoses]);
  
  // Convert Redux appointments to local format for compatibility - only when Redux data changes
  useEffect(() => {
    if (reduxAppointments && reduxAppointments.length > 0) {
      // Convert Redux appointments to local format
      const convertedAppointments = reduxAppointments.map(appointment => {
        console.log('Processing appointment:', appointment._id, 'patient:', appointment.patient);
        return {
          ...appointment,
          status: appointment.status as Appointment['status'] || 'geplant',
          bookingType: appointment.bookingType as Appointment['bookingType'] || 'internal',
          // Ensure patient is an object, not just an ID
          patient: typeof appointment.patient === 'string' 
            ? { 
                _id: appointment.patient, 
                firstName: 'Unknown', 
                lastName: 'Patient',
                dateOfBirth: '',
                gender: 'other' as const,
                phone: '',
                email: '',
                address: { street: '', city: '', zipCode: '', country: '' },
                insuranceNumber: '',
                emergencyContact: { name: '', phone: '', relationship: '' }
              }
            : appointment.patient || { 
                _id: 'unknown', 
                firstName: 'Unknown', 
                lastName: 'Patient',
                dateOfBirth: '',
                gender: 'other' as const,
                phone: '',
                email: '',
                address: { street: '', city: '', zipCode: '', country: '' },
                insuranceNumber: '',
                emergencyContact: { name: '', phone: '', relationship: '' }
              },
        // Ensure doctor is an object, not just an ID
        doctor: typeof appointment.doctor === 'string'
          ? { _id: appointment.doctor, firstName: 'Dr.', lastName: 'Unknown', title: 'Dr.', specialization: 'Allgemeinmedizin' }
          : appointment.doctor || { _id: 'unknown', firstName: 'Dr.', lastName: 'Unknown', title: 'Dr.', specialization: 'Allgemeinmedizin' },
        // Ensure room is an object, not just an ID
        room: typeof appointment.room === 'string'
          ? { _id: appointment.room, name: 'Behandlungszimmer', number: '101' }
          : appointment.room || { _id: 'unknown', name: 'Behandlungszimmer', number: '101' },
        };
      });
      setAppointments(convertedAppointments as any);
      
      // Füge wartende Termine automatisch zur Warteliste hinzu
      const waitingAppointments = convertedAppointments.filter(apt => apt.status === 'wartend');
      const waitingPatients = waitingAppointments.map(apt => {
        const now = new Date();
        return {
          id: apt._id,
          patientId: apt.patient?._id || 'unknown',
          patientName: apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'Unbekannt',
          patientPhone: apt.patient?.phone || '',
          reason: apt.type || 'Termin',
          priority: 'normal' as const,
          addedAt: apt.createdAt || now.toISOString(),
          estimatedWaitTime: 0
        };
      });
      
      if (waitingPatients.length > 0) {
        setWaitingList(prev => {
          const existingIds = new Set(prev.map(w => w.id));
          const newPatients = waitingPatients.filter(w => !existingIds.has(w.id));
          if (newPatients.length > 0) {
            console.log('Adding waiting patients from appointments:', newPatients);
            return [...prev, ...newPatients];
          }
          return prev;
        });
      }
      
      // Füge Patienten in Behandlung automatisch zur Behandlungsliste hinzu
      const treatmentAppointments = convertedAppointments.filter(apt => apt.status === 'in_behandlung');
      const treatmentPatients = treatmentAppointments.map(apt => {
        const now = new Date();
        return {
          id: apt._id,
          patientId: apt.patient?._id || 'unknown',
          patientName: apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'Unbekannt',
          patientPhone: apt.patient?.phone || '',
          reason: apt.type || 'Behandlung',
          priority: 'normal' as const,
          addedAt: apt.createdAt || now.toISOString(),
          estimatedWaitTime: 0
        };
      });
      
      if (treatmentPatients.length > 0) {
        setInTreatmentList(prev => {
          const existingIds = new Set(prev.map(w => w.id));
          const newPatients = treatmentPatients.filter(w => !existingIds.has(w.id));
          if (newPatients.length > 0) {
            console.log('Adding treatment patients from appointments:', newPatients);
            return [...prev, ...newPatients];
          }
          return prev;
        });
      }
      
      // Füge abgeschlossene Termine automatisch zur Abgeschlossen-Liste hinzu
      const completedAppointments = convertedAppointments.filter(apt => apt.status === 'abgeschlossen');
      const completedPatients = completedAppointments.map(apt => {
        const now = new Date();
        return {
          id: apt._id,
          patientId: apt.patient?._id || 'unknown',
          patientName: apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'Unbekannt',
          patientPhone: apt.patient?.phone || '',
          reason: apt.type || 'Abgeschlossen',
          priority: 'normal' as const,
          addedAt: apt.createdAt || now.toISOString(),
          estimatedWaitTime: 0
        };
      });
      
      if (completedPatients.length > 0) {
        setCompletedList(prev => {
          const existingIds = new Set(prev.map(w => w.id));
          const newPatients = completedPatients.filter(w => !existingIds.has(w.id));
          if (newPatients.length > 0) {
            console.log('Adding completed patients from appointments:', newPatients);
            return [...prev, ...newPatients];
          }
          return prev;
        });
      }
    }
  }, [reduxAppointments]); // Only depend on Redux appointments

  // Mock waiting list data (can be replaced with real API later)
    const mockWaitingList: WaitingList[] = [
      {
        id: '1',
        patientId: '4',
        patientName: 'Anna Huber',
        patientPhone: '+43 111 222 333',
        reason: 'Akute Schmerzen',
        priority: 'hoch',
        addedAt: '2024-01-15T14:30:00',
        estimatedWaitTime: 30
      },
      {
        id: '2',
        patientId: '5',
        patientName: 'Franz Bauer',
        patientPhone: '+43 444 555 666',
        reason: 'Rezeptabholung',
        priority: 'niedrig',
        addedAt: '2024-01-15T15:00:00',
        estimatedWaitTime: 15
      }
    ];

  // Initialize waiting list only once with mock data if empty
  useEffect(() => {
    if (waitingList.length === 0 && mockWaitingList.length > 0) {
      console.log('Initializing waiting list with mock data');
      setWaitingList(mockWaitingList);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Force re-render when patient is selected
  useEffect(() => {
    // This will trigger a re-render when patientSearchValue changes
  }, [patientSearchValue]);

  // Reset patient filter when search term is cleared
  useEffect(() => {
    if (!searchTerm || searchTerm.trim() === '') {
      setPatientSearchValue(null);
    }
  }, [searchTerm]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} sx={{ flexShrink: 0 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Terminverwaltung
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Verwalten Sie Ihre Termine und das Wartezimmer
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddAppointment}
        >
          Neuer Termin
        </Button>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Termine suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ flexGrow: 1 }}
          />
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as string)}
            >
              <MenuItem value="all">Alle</MenuItem>
              <MenuItem value="geplant">Geplant</MenuItem>
              <MenuItem value="bestätigt">Bestätigt</MenuItem>
              <MenuItem value="wartend">Wartend</MenuItem>
              <MenuItem value="in_behandlung">In Behandlung</MenuItem>
              <MenuItem value="abgeschlossen">Abgeschlossen</MenuItem>
              <MenuItem value="abgesagt">Abgesagt</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Typ</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as string)}
            >
              <MenuItem value="all">Alle</MenuItem>
              {appointmentTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: type.color,
                        flexShrink: 0
                      }}
                    />
                    {type.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <IconButton>
            <Refresh />
          </IconButton>
        </Box>
        
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label="Ansichtsmodus"
        >
          <ToggleButton value="day" aria-label="Tag">
            <CalendarToday sx={{ mr: 1 }} />
            Tag
          </ToggleButton>
          <ToggleButton value="week" aria-label="Woche">
            <ViewWeek sx={{ mr: 1 }} />
            Woche
          </ToggleButton>
          <ToggleButton value="month" aria-label="Monat">
            <ViewModule sx={{ mr: 1 }} />
            Monat
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {/* Appointments List */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, flex: 1, overflow: 'auto' }}>
        <Box sx={{ flex: '1 1 600px', minWidth: '600px' }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Termine ({filteredAppointments.length})
                </Typography>
                <Box display="flex" gap={1}>
                  <Chip
                    label={`Geplant: ${filteredAppointments.filter(a => a.status === 'geplant').length}`}
                    size="small"
                    color="info"
                  />
                  <Chip
                    label={`Wartend: ${filteredAppointments.filter(a => a.status === 'wartend').length}`}
                    size="small"
                    color="warning"
                  />
                  <Chip
                    label={`In Behandlung: ${filteredAppointments.filter(a => a.status === 'in_behandlung').length}`}
                    size="small"
                    color="error"
                  />
                </Box>
              </Box>
              
              {filteredAppointments.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="text.secondary">
                    Keine Termine gefunden
                  </Typography>
                </Box>
              ) : (
                filteredAppointments.map((appointment) => (
                  <Paper
                    key={appointment._id}
                    sx={{
                      p: 3,
                      mb: 2.5,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      borderLeft: 5,
                      borderLeftColor: `${getStatusColor(appointment.status)}.main`,
                      borderRadius: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    <Box display="flex" alignItems="flex-start" sx={{ flexGrow: 1, gap: 2 }}>
                      <Avatar 
                        sx={{ 
                          width: 56, 
                          height: 56,
                          mr: 1, 
                          bgcolor: `${getStatusColor(appointment.status)}.main`,
                          fontSize: '1.5rem'
                        }}
                      >
                        {getStatusIcon(appointment.status)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        {/* Zeit und Patient - Hauptzeile */}
                        <Box display="flex" alignItems="center" gap={2} mb={1.5} flexWrap="wrap">
                          <Typography 
                            variant="h6" 
                            fontWeight="bold"
                            sx={{ 
                              color: 'primary.main',
                              fontSize: '1.25rem',
                              minWidth: 'fit-content'
                            }}
                          >
                            {(() => {
                              try {
                                const date = new Date(appointment.startTime);
                                if (isNaN(date.getTime())) {
                                  return appointment.time || 'Zeit unbekannt';
                                }
                                return date.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
                              } catch (error) {
                                return appointment.time || 'Zeit unbekannt';
                              }
                            })()}
                          </Typography>
                          <Typography 
                            variant="h6"
                            fontWeight="600"
                            onClick={() => {
                              if (appointment.patient?._id) {
                                navigate(`/patient-organizer/${appointment.patient._id}`);
                              }
                            }}
                            sx={{
                              cursor: appointment.patient?._id ? 'pointer' : 'default',
                              fontSize: '1.1rem',
                              '&:hover': {
                                textDecoration: appointment.patient?._id ? 'underline' : 'none',
                                color: appointment.patient?._id ? 'primary.main' : 'inherit'
                              }
                            }}
                          >
                            {appointment.title || 'Unbekannt'}
                          </Typography>
                          <Chip
                            label={appointment.service?.name || appointmentTypes.find(t => t.value === appointment.type)?.label || appointment.type}
                            size="medium"
                            sx={{
                              backgroundColor: appointment.service?.color_hex || 'primary.main',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.875rem',
                              height: '28px'
                            }}
                          />
                        </Box>
                        
                        {/* Details - Zweite Zeile */}
                        <Box display="flex" alignItems="center" gap={2} mb={1.5} flexWrap="wrap">
                          {appointment.startTime && (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <CalendarToday sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                              <Typography variant="body1" color="text.secondary" fontWeight="500">
                                {new Date(appointment.startTime).toLocaleDateString('de-DE', { 
                                  weekday: 'short', 
                                  day: '2-digit', 
                                  month: '2-digit', 
                                  year: 'numeric' 
                                })}
                              </Typography>
                            </Box>
                          )}
                          {appointment.room && (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <LocalHospital sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                              <Typography variant="body1" color="text.secondary" fontWeight="500">
                                {appointment.room.name}
                              </Typography>
                            </Box>
                          )}
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <AccessTime sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                            <Typography variant="body1" color="text.secondary" fontWeight="500">
                              {appointment.duration} Min
                            </Typography>
                          </Box>
                          {(() => {
                            // Prioritize assigned_users over doctor
                            const doctorName = (() => {
                              if (appointment.assigned_users && appointment.assigned_users.length > 0) {
                                return appointment.assigned_users.map((u: any) => 
                                  u.display_name || `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim()
                                ).filter(Boolean).join(', ');
                              }
                              return appointment.doctor ? `${appointment.doctor.title || ''} ${appointment.doctor.lastName || ''}`.trim() : (appointment.doctorName || 'Unbekannt');
                            })();
                            return (
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Person sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                                <Typography variant="body1" color="text.secondary" fontWeight="500">
                                  {doctorName}
                                </Typography>
                              </Box>
                            );
                          })()}
                          {appointment.service?.price_cents && (
                            <Typography variant="body1" color="text.secondary" fontWeight="600">
                              €{(appointment.service.price_cents / 100).toFixed(2)}
                            </Typography>
                          )}
                        </Box>
                        {/* Zugewiesene Ressourcen anzeigen */}
                        {((appointment.assigned_rooms && appointment.assigned_rooms.length > 0) || (appointment.assigned_devices && appointment.assigned_devices.length > 0) || (appointment.assigned_users && appointment.assigned_users.length > 0)) && (
                          <Box display="flex" gap={1.5} mt={2} flexWrap="wrap">
                            {appointment.assigned_rooms?.map((room, index) => (
                              <Chip
                                key={room._id || `room-${index}`}
                                label={`🏥 Raum: ${room.name}`}
                                size="medium"
                                variant="outlined"
                                color="primary"
                                sx={{ fontSize: '0.875rem', fontWeight: '500' }}
                              />
                            ))}
                            {appointment.assigned_devices?.map((device, index) => (
                              <Chip
                                key={device._id || `device-${index}`}
                                label={`🔧 Gerät: ${device.name}`}
                                size="medium"
                                variant="outlined"
                                color="secondary"
                                sx={{ fontSize: '0.875rem', fontWeight: '500' }}
                              />
                            ))}
                            {appointment.assigned_users?.map((user, index) => (
                              <Chip
                                key={user._id || `user-${index}`}
                                label={`👤 ${user.display_name || user.firstName || user.first_name} ${user.lastName || user.last_name}`}
                                size="medium"
                                variant="outlined"
                                color="success"
                                sx={{ fontSize: '0.875rem', fontWeight: '500' }}
                              />
                            ))}
                          </Box>
                        )}
                        {/* Medizinische Warnungen anzeigen */}
                        {(() => {
                          const medicalChips = [];
                          const patient = appointment.patient;
                          
                          if (patient) {
                            // Allergien prüfen
                            if (patient.allergies && patient.allergies.length > 0) {
                              patient.allergies.forEach((allergy: any, index: number) => {
                                const allergyDescription = typeof allergy === 'string' ? allergy : allergy.description || allergy;
                                if (allergyDescription) {
                                  medicalChips.push(
                                    <Chip
                                      key={`allergy-${index}`}
                                      label={`⚠️ Allergie: ${allergyDescription}`}
                                      size="small"
                                      variant="filled"
                                      color="error"
                                      sx={{ fontWeight: 'bold' }}
                                    />
                                  );
                                }
                              });
                            }
                            
                            // Vorerkrankungen prüfen
                            if (patient.preExistingConditions && patient.preExistingConditions.length > 0) {
                              patient.preExistingConditions.forEach((condition: string, index: number) => {
                                if (condition) {
                                  medicalChips.push(
                                    <Chip
                                      key={`condition-${index}`}
                                      label={`🏥 Erkrankung: ${condition}`}
                                      size="small"
                                      variant="filled"
                                      color="warning"
                                    />
                                  );
                                }
                              });
                            }
                            
                            // Schwangerschaft prüfen
                            if (patient.isPregnant) {
                              medicalChips.push(
                                <Chip
                                  key="pregnancy"
                                  label={`🤰 Schwanger (${patient.pregnancyWeek || '?'} Woche)`}
                                  size="small"
                                  variant="filled"
                                  color="info"
                                  sx={{ fontWeight: 'bold' }}
                                />
                              );
                            }
                            
                            // Stillen prüfen
                            if (patient.isBreastfeeding) {
                              medicalChips.push(
                                <Chip
                                  key="breastfeeding"
                                  label="🍼 Stillend"
                                  size="small"
                                  variant="filled"
                                  color="info"
                                />
                              );
                            }
                            
                            // Hauptdiagnose anzeigen
                            if (patient._id) {
                              const diagnoses = patientDiagnosesMap.get(patient._id) || [];
                              const primaryDiagnosis = diagnoses.find((d: PatientDiagnosis) => d.isPrimary && d.status === 'active');
                              if (primaryDiagnosis) {
                                medicalChips.push(
                                  <Chip
                                    key="primary-diagnosis"
                                    label={`🏥 Hauptdiagnose: ${primaryDiagnosis.code} - ${primaryDiagnosis.display}`}
                                    size="small"
                                    variant="filled"
                                    color="primary"
                                    sx={{ fontWeight: 'bold' }}
                                  />
                                );
                              }
                            }
                            
                            // Impfstatus prüfen
                            if (patient.hasPacemaker) {
                              medicalChips.push(
                                <Chip
                                  key="pacemaker"
                                  label="🫀 Herzschrittmacher"
                                  size="small"
                                  variant="filled"
                                  color="secondary"
                                />
                              );
                            }
                            
                            if (patient.hasDefibrillator) {
                              medicalChips.push(
                                <Chip
                                  key="defibrillator"
                                  label="⚡ Defibrillator"
                                  size="small"
                                  variant="filled"
                                  color="secondary"
                                />
                              );
                            }
                          }
                          
                          return medicalChips.length > 0 ? (
                            <Box display="flex" gap={1.5} mt={2} flexWrap="wrap">
                              {medicalChips.map((chip, index) => 
                                React.cloneElement(chip, { 
                                  key: chip.key || `medical-${index}`,
                                  size: 'medium',
                                  sx: { 
                                    ...chip.props.sx,
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    height: '28px'
                                  }
                                })
                              )}
                            </Box>
                          ) : null;
                        })()}
                        {appointment.service?.description && (
                          <Typography variant="body2" color="text.secondary" display="block" mt={1.5} sx={{ fontStyle: 'italic' }}>
                            {appointment.service.description}
                          </Typography>
                        )}
                        {appointment.notes && (
                          <Typography variant="body2" color="text.secondary" mt={1} sx={{ fontStyle: 'italic' }}>
                            📝 {appointment.notes}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1.5} sx={{ minWidth: 'fit-content' }}>
                      <Chip
                        label={appointment.status}
                        size="medium"
                        color={getStatusColor(appointment.status)}
                        icon={getStatusIcon(appointment.status)}
                        onClick={(e) => handleOpenStatusMenu(e, appointment._id)}
                        sx={{ 
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          height: '32px'
                        }}
                      />
                      <Menu
                        anchorEl={statusMenuAnchor.el}
                        open={Boolean(statusMenuAnchor.el)}
                        onClose={handleCloseStatusMenu}
                      >
                        <MenuItem onClick={() => handleUpdateStatus('geplant')}>Geplant</MenuItem>
                        <MenuItem onClick={() => handleUpdateStatus('bestätigt')}>Bestätigt</MenuItem>
                        <MenuItem onClick={() => handleUpdateStatus('wartend')}>Wartend</MenuItem>
                        <MenuItem onClick={() => handleUpdateStatus('in_behandlung')}>In Behandlung</MenuItem>
                        <MenuItem onClick={() => handleUpdateStatus('abgeschlossen')}>Abgeschlossen</MenuItem>
                        <MenuItem onClick={() => handleUpdateStatus('abgesagt')}>Abgesagt</MenuItem>
                        <MenuItem onClick={() => handleUpdateStatus('verschoben')}>Verschoben</MenuItem>
                      </Menu>
                      <Box display="flex" gap={1}>
                        <IconButton
                          size="medium"
                          onClick={() => handleViewAppointment(appointment)}
                          title="Anzeigen"
                          sx={{ 
                            bgcolor: 'action.hover',
                            '&:hover': { bgcolor: 'primary.main', color: 'white' }
                          }}
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          size="medium"
                          onClick={() => handleEditAppointment(appointment)}
                          title="Bearbeiten"
                          sx={{ 
                            bgcolor: 'action.hover',
                            '&:hover': { bgcolor: 'primary.main', color: 'white' }
                          }}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="medium"
                          onClick={() => handleDeleteAppointment(appointment._id)}
                          title="Löschen"
                          sx={{ 
                            bgcolor: 'action.hover',
                            '&:hover': { bgcolor: 'error.main', color: 'white' }
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </Box>
                  </Paper>
                ))
              )}
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Wartezimmer
                </Typography>
                <Badge badgeContent={waitingList.length} color="primary">
                  <AccessTime />
                </Badge>
              </Box>
              
              {waitingList.length === 0 ? (
                <Box textAlign="center" py={2}>
                  <Typography variant="body2" color="text.secondary">
                    Keine Patienten im Wartezimmer
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box display="flex" alignItems="center" mb={2}>
                    <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="body2">
                      {waitingList.length} Patienten warten
                    </Typography>
                  </Box>
                  
                  {waitingList.map((patient) => (
                    <Paper
                      key={patient.id}
                      sx={{
                        p: 2,
                        mb: 1,
                        borderLeft: 4,
                        borderLeftColor: 
                          patient.priority === 'dringend' ? 'error.main' :
                          patient.priority === 'hoch' ? 'warning.main' :
                          patient.priority === 'normal' ? 'info.main' : 'default.main',
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: 2
                        }
                      }}
                      onClick={() => navigate(`/patient-organizer/${patient.patientId}`)}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography 
                            variant="subtitle2" 
                            fontWeight="bold"
                            sx={{ 
                              color: 'primary.main',
                              '&:hover': {
                                textDecoration: 'underline'
                              }
                            }}
                          >
                            {patient.patientName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {patient.reason}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Wartezeit: ~{patient.estimatedWaitTime} Min
                          </Typography>
                        </Box>
                        <Chip
                          label={patient.priority}
                          size="small"
                          color={
                            patient.priority === 'dringend' ? 'error' :
                            patient.priority === 'hoch' ? 'warning' :
                            patient.priority === 'normal' ? 'info' : 'default'
                          }
                        />
                      </Box>
                    </Paper>
                  ))}
                  
                  <Typography variant="body2" color="text.secondary" mt={2}>
                    Durchschnittliche Wartezeit: {Math.round(waitingList.reduce((acc, p) => acc + p.estimatedWaitTime, 0) / waitingList.length)} Min
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  In Behandlung
                </Typography>
                <Badge badgeContent={inTreatmentList.length} color="error">
                  <Person />
                </Badge>
              </Box>
              
              {inTreatmentList.length === 0 ? (
                <Box textAlign="center" py={2}>
                  <Typography variant="body2" color="text.secondary">
                    Keine Patienten in Behandlung
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Person sx={{ mr: 1, color: 'error.main' }} />
                    <Typography variant="body2">
                      {inTreatmentList.length} Patienten in Behandlung
                    </Typography>
                  </Box>
                  
                  {inTreatmentList.map((patient) => (
                    <Paper
                      key={patient.id}
                      sx={{
                        p: 2,
                        mb: 1,
                        borderLeft: 4,
                        borderLeftColor: 'error.main',
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: 2
                        }
                      }}
                      onClick={() => navigate(`/patient-organizer/${patient.patientId}`)}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography 
                            variant="subtitle2" 
                            fontWeight="bold"
                            sx={{ 
                              color: 'primary.main',
                              '&:hover': {
                                textDecoration: 'underline'
                              }
                            }}
                          >
                            {patient.patientName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {patient.reason}
                          </Typography>
                        </Box>
                        <Chip
                          label="In Behandlung"
                          size="small"
                          color="error"
                        />
                      </Box>
                    </Paper>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
          
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Abgeschlossen
                </Typography>
                <Badge badgeContent={completedList.length} color="success">
                  <CheckCircle />
                </Badge>
              </Box>
              
              {completedList.length === 0 ? (
                <Box textAlign="center" py={2}>
                  <Typography variant="body2" color="text.secondary">
                    Keine abgeschlossenen Behandlungen
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box display="flex" alignItems="center" mb={2}>
                    <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="body2">
                      {completedList.length} abgeschlossene Behandlungen
                    </Typography>
                  </Box>
                  
                  {completedList.map((patient) => (
                    <Paper
                      key={patient.id}
                      sx={{
                        p: 2,
                        mb: 1,
                        borderLeft: 4,
                        borderLeftColor: 'success.main',
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: 2
                        }
                      }}
                      onClick={() => navigate(`/patient-organizer/${patient.patientId}`)}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography 
                            variant="subtitle2" 
                            fontWeight="bold"
                            sx={{ 
                              color: 'primary.main',
                              '&:hover': {
                                textDecoration: 'underline'
                              }
                            }}
                          >
                            {patient.patientName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {patient.reason}
                          </Typography>
                        </Box>
                        <Chip
                          label="Abgeschlossen"
                          size="small"
                          color="success"
                        />
                      </Box>
                    </Paper>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Appointment Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
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
                setOpenDialog(false);
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
          icon={<Event />}
          gradientColors={{ from: '#06b6d4', to: '#0891b2' }}
        />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box>
            <Tabs 
              value={activeTab} 
              onChange={(_, newValue) => {
                console.log('🔄 Tab changed from', activeTab, 'to', newValue);
                console.log('🔄 Tab change - patientSearchValue:', patientSearchValue);
                console.log('🔄 Tab change - formData.patientId:', formData.patientId);
                console.log('🔄 Tab change - formData.patient:', formData.patient);
                setActiveTab(newValue);
                // Force re-render after tab change
                setTimeout(() => {
                  console.log('🔄 After tab change - activeTab should be:', newValue);
                }, 100);
              }}
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
              <Tab label="Grunddaten" icon={<Event />} iconPosition="start" />
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
                      handleFormChange('type', newValue.code); // Legacy field
                      
                      // Speichere in den letzten 10 Leistungen
                      addToRecentServices(newValue._id);
                      
                      // Automatisch den Raum aus der Leistung übernehmen, falls vorhanden
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
                  filterOptions={(options, state) => {
                    // Die Filterung wird bereits in getFilteredAndSortedServices durchgeführt
                    // Hier geben wir einfach alle Optionen zurück, die bereits gefiltert wurden
                    return options;
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
                            {option.category && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                Kategorie: {option.category}
                              </Typography>
                            )}
                            {option.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {option.description}
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
                {formData.serviceId && (
                  <Button
                    variant="outlined"
                    startIcon={<Schedule />}
                    onClick={() => handleCheckAvailability(formData.serviceId!)}
                    sx={{ minHeight: '40px' }}
                  >
                    Verfügbarkeit prüfen
                  </Button>
                )}
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
                    {staff.map((person) => (
                      <MenuItem key={person._id} value={person._id}>
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
                value={formData.room ? (typeof formData.room === 'string' ? formData.room : formData.room.name || formData.room._id || '') : ''}
                onChange={(e) => handleFormChange('room', e.target.value)}
                disabled={dialogMode === 'view'}
                fullWidth
                sx={{ mb: 2 }}
              />
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
                    console.log('Patient selected:', newValue);
                    setPatientSearchValue(newValue);
                    if (newValue) {
                      console.log('🔄 Setting patient data immediately:', newValue._id);
                      handleFormChange('patient', newValue);
                      handleFormChange('patientId', newValue._id);
                      handleFormChange('patientName', `${newValue.firstName} ${newValue.lastName}`);
                      handleFormChange('patientPhone', newValue.phone);
                      handleFormChange('patientEmail', newValue.email);
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
                      option.email.toLowerCase().includes(inputValue.toLowerCase()) ||
                      option.phone.includes(inputValue) ||
                      (option.dateOfBirth && option.dateOfBirth.includes(inputValue))
                    );
                  }}
                />
              </Box>

              {/* Anzeige der Patientendaten */}
              {formData.patient ? (
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
                      value={formData.patient.email}
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
                  
                  {/* Allergien anzeigen */}
                  {formData.patient.allergies && formData.patient.allergies.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'error.main' }}>
                        <Warning sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                        Allergien
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {formData.patient.allergies.map((allergy, index) => {
                          const allergyText = typeof allergy === 'string' 
                            ? allergy 
                            : allergy.description || allergy.type || 'Unbekannte Allergie';
                          const severity = typeof allergy === 'object' ? allergy.severity : undefined;
                          const getSeverityColor = (sev?: string) => {
                            switch (sev) {
                              case 'severe': case 'critical': return 'error';
                              case 'moderate': return 'warning';
                              default: return 'default';
                            }
                          };
                          return (
                            <Chip
                              key={index}
                              label={allergyText}
                              color={getSeverityColor(severity) as any}
                              size="small"
                              icon={<Warning />}
                              sx={{ fontWeight: 'bold' }}
                            />
                          );
                        })}
                      </Box>
                    </Box>
                  )}
                  
                  {/* Aktive Diagnosen anzeigen */}
                  {patientDiagnoses && patientDiagnoses.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
                        <LocalHospital sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                        Aktive Diagnosen
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {patientDiagnoses
                          .filter((diag: PatientDiagnosis) => diag.status === 'active')
                          .slice(0, 5) // Zeige maximal 5 Diagnosen
                          .map((diag: PatientDiagnosis) => (
                            <Paper 
                              key={diag._id} 
                              elevation={1} 
                              sx={{ 
                                p: 1.5, 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                bgcolor: diag.isPrimary ? 'primary.50' : 'background.paper',
                                borderLeft: diag.isPrimary ? '3px solid' : '1px solid',
                                borderColor: diag.isPrimary ? 'primary.main' : 'divider'
                              }}
                            >
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {diag.code} - {diag.display}
                                </Typography>
                                {diag.notes && (
                                  <Typography variant="caption" color="text.secondary">
                                    {diag.notes}
                                  </Typography>
                                )}
                              </Box>
                              {diag.isPrimary && (
                                <Chip
                                  label="Hauptdiagnose"
                                  size="small"
                                  color="primary"
                                  icon={<CheckCircle />}
                                />
                              )}
                            </Paper>
                          ))}
                        {patientDiagnoses.filter((diag: PatientDiagnosis) => diag.status === 'active').length > 5 && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            ... und {patientDiagnoses.filter((diag: PatientDiagnosis) => diag.status === 'active').length - 5} weitere
                          </Typography>
                        )}
                      </Box>
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

            {/* Tab 3: Diagnosen */}
            {activeTab === 3 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                Diagnosen
              </Typography>
              {(() => {
                // Debug-Logging - IMMER ausführen
                console.log('🔍🔍🔍 DIAGNOSE TAB GERENDERT 🔍🔍🔍');
                console.log('🔍 Diagnose Tab - activeTab:', activeTab);
                console.log('🔍 Diagnose Tab - openDialog:', openDialog);
                console.log('🔍 Diagnose Tab - patientSearchValue:', patientSearchValue);
                console.log('🔍 Diagnose Tab - patientSearchValue?._id:', patientSearchValue?._id);
                console.log('🔍 Diagnose Tab - formData.patientId:', formData.patientId);
                console.log('🔍 Diagnose Tab - formData.patient:', formData.patient);
                console.log('🔍 Diagnose Tab - formData.patient type:', typeof formData.patient);
                console.log('🔍 Diagnose Tab - formData.patient?._id:', formData.patient?._id);
                console.log('🔍 Diagnose Tab - dialogMode:', dialogMode);
                
                // Verwende patientSearchValue als primäre Quelle, da es sofort gesetzt wird
                // formData.patientId könnte verzögert aktualisiert werden
                // Prüfe auch formData.patient als Objekt
                const patientIdValue = 
                  patientSearchValue?._id || 
                  formData.patientId || 
                  (typeof formData.patient === 'object' && formData.patient?._id) ||
                  (typeof formData.patient === 'string' && formData.patient);
                
                console.log('🔍 Diagnose Tab - final patientIdValue:', patientIdValue);
                
                if (!patientIdValue) {
                  console.log('❌ KEINE PATIENT-ID GEFUNDEN - Zeige Alert');
                  return (
                    <Alert severity="info">
                      Bitte wählen Sie zuerst einen Patienten aus, um Diagnosen zu erfassen.
                      <Box sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
                        Debug-Info:
                        <br />- activeTab: {activeTab}
                        <br />- openDialog: {openDialog ? 'true' : 'false'}
                        <br />- patientSearchValue: {patientSearchValue ? 'vorhanden' : 'nicht vorhanden'}
                        <br />- patientSearchValue._id: {patientSearchValue?._id || 'nicht vorhanden'}
                        <br />- formData.patientId: {formData.patientId || 'nicht vorhanden'}
                        <br />- formData.patient: {formData.patient ? (typeof formData.patient === 'object' ? 'Objekt vorhanden' : formData.patient) : 'nicht vorhanden'}
                      </Box>
                    </Alert>
                  );
                }
                
                console.log('✅ PATIENT-ID GEFUNDEN - Zeige DiagnosisManager mit ID:', patientIdValue);
                return (
                  <DiagnosisManager
                    patientId={patientIdValue}
                    encounterId={selectedAppointment?._id || undefined}
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

            {/* Tab 4: Notizen */}
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
          <Button 
            onClick={() => setOpenDialog(false)}
            size="large"
            sx={{ minWidth: 120, textTransform: 'none' }}
          >
            Abbrechen
          </Button>
          {dialogMode !== 'view' && (
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
          )}
        </DialogActions>
      </Dialog>

      {/* Availability Dialog */}
      <Dialog 
        open={showAvailabilityDialog} 
        onClose={() => setShowAvailabilityDialog(false)} 
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
          title="Verfügbare Termine"
          icon={<Schedule />}
          gradientColors={{ from: '#10b981', to: '#059669' }}
        />
        {selectedServiceForAvailability && (
          <Box sx={{ pt: 1, px: 3, pb: 0 }}>
            <Typography variant="body2" color="text.secondary">
              {services.find(s => s._id === selectedServiceForAvailability)?.name || 'Leistung'}
            </Typography>
          </Box>
        )}
        <DialogContent sx={{ pt: 3, maxHeight: '70vh', overflow: 'auto' }}>
          {loadingAvailability ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : availableSlots.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Keine verfügbaren Termine für die nächsten 14 Tage
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {availableSlots.slice(0, 20).map((slot, index) => (
                <Paper
                  key={index}
                  elevation={2}
                  sx={{ 
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      elevation: 4,
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => {
                    // Pre-fill the form with selected time
                    const slotDate = new Date(slot.startTime);
                    handleFormChange('date', slotDate.toISOString().split('T')[0]);
                    handleFormChange('time', slotDate.toTimeString().slice(0, 5));
                    handleFormChange('room', slot.location || '');
                    setShowAvailabilityDialog(false);
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {new Date(slot.startTime).toLocaleDateString('de-DE', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </Typography>
                      <Typography variant="body2" color="primary">
                        {new Date(slot.startTime).toLocaleTimeString('de-DE', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} - {new Date(slot.endTime).toLocaleTimeString('de-DE', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Personal: {slot.staff.firstName} {slot.staff.lastName}
                      </Typography>
                    </Box>
                    <Button variant="contained" color="primary" size="small">
                      Buchen
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setShowAvailabilityDialog(false)} variant="outlined">
            Schließen
          </Button>
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
    </Box>
  );
};

export default Appointments;

