import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPatients, loadMorePatients, createPatient, updatePatient, clearError, Patient } from '../store/slices/patientSlice';
import { fetchAppointments, Appointment } from '../store/slices/appointmentSlice';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import GradientDialogTitle from '../components/GradientDialogTitle';
import { Person as PersonIcon } from '@mui/icons-material';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  IconButton,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Divider,
  Stack,
  Badge,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Skeleton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  Add,
  Phone,
  Email,
  LocationOn,
  ViewModule,
  ViewList,
  Cake,
  Warning,
  Receipt,
  FilterList,
  Clear,
  HealthAndSafety,
  LocalHospital,
  Person,
  AccessTime,
  CalendarToday,
  Schedule,
} from '@mui/icons-material';
import AdditionalInsuranceForm from '../components/Billing/AdditionalInsuranceForm';
import ECardValidation from '../components/ECardValidation';


const Patients: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { patients, loading, error, pagination } = useAppSelector((state) => state.patients);
  const { appointments } = useAppSelector((state) => state.appointments);
  
  // Cache für letzte Besuche
  const [lastVisitCache, setLastVisitCache] = useState<{ [patientId: string]: Date }>({});
  
  // View and UI state
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'lastVisit' | 'birthday' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'view'>('add');
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'warning' | 'info' 
  });
  const [formData, setFormData] = useState<Partial<Patient>>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    address: {
      street: '',
      city: '',
      zipCode: '',
      country: 'Österreich'
    },
    gender: 'männlich',
    socialSecurityNumber: '',
    insuranceProvider: '',
    status: 'aktiv',
    medicalHistory: [],
    allergies: [],
    currentMedications: [],
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    notes: ''
  });

  // Load patients from API
  useEffect(() => {
    dispatch(fetchPatients(1));
    dispatch(fetchAppointments());
  }, [dispatch]);

  // Reset scroll position when component mounts or when switching from other pages
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    // Also reset scroll position of the container
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, []);

  // Reset scroll position when filters or search change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [searchTerm, activeFilters, sortBy, sortOrder]);

  // Load more patients function
  const handleLoadMore = useCallback(() => {
    if (pagination?.hasMore && pagination?.nextPage) {
      dispatch(loadMorePatients(pagination.nextPage));
    }
  }, [dispatch, pagination?.hasMore, pagination?.nextPage]);

  // Quick filter options
  const quickFilters = [
    { id: 'birthday', label: 'Heute Geburtstag', icon: <Cake />, color: 'primary' as const },
    { id: 'overdue', label: 'Überfällige Rückrufe', icon: <Warning />, color: 'warning' as const },
    { id: 'unbilled', label: 'Unverrechnete', icon: <Receipt />, color: 'error' as const },
    { id: 'new', label: 'Neue Patienten', icon: <Person />, color: 'success' as const },
    { id: 'active', label: 'Aktive', icon: <HealthAndSafety />, color: 'info' as const },
    { id: 'appointment_today', label: 'Termin-Heute', icon: <CalendarToday />, color: 'secondary' as const },
    { id: 'appointment_tomorrow', label: 'Termin-Morgen', icon: <Schedule />, color: 'secondary' as const },
  ];

  // Helper functions
  const getInitials = (firstName: string, lastName: string) => {
    if (!firstName || !lastName) return '??';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAvatarColor = (gender: string) => {
    switch (gender?.toLowerCase()) {
      case 'w':
      case 'weiblich':
      case 'female':
        return 'secondary.main'; // Rosa
      case 'm':
      case 'männlich':
      case 'male':
        return 'primary.main'; // Blau
      case 'd':
      case 'divers':
      case 'other':
        return 'info.main'; // Grau/Info
      default:
        return 'primary.main'; // Standard: Blau
    }
  };

  const getAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const isTodayBirthday = (dateOfBirth: string) => {
    if (!dateOfBirth) return false;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    return today.getMonth() === birthDate.getMonth() && today.getDate() === birthDate.getDate();
  };

  const getLastVisitDate = useCallback((patient: Patient): Date => {
    const patientId = patient._id || patient.id;
    if (!patientId) {
      // Fallback: Nutze createdAt oder ein altes Datum
      return patient.createdAt ? new Date(patient.createdAt) : new Date(0);
    }

    // Prüfe Cache zuerst
    if (lastVisitCache[patientId]) {
      return lastVisitCache[patientId];
    }

    const visitDates: Date[] = [];

    // 1. Letzter Termin (Appointment)
    if (appointments && appointments.length > 0) {
      const patientAppointments = appointments.filter((apt: Appointment) => {
        const aptPatientId = typeof apt.patient === 'string' ? apt.patient : apt.patient?._id || apt.patient?.id;
        return aptPatientId === patientId && apt.startTime;
      });
      
      if (patientAppointments.length > 0) {
        const lastAppointment = patientAppointments
          .map(apt => new Date(apt.startTime))
          .sort((a, b) => b.getTime() - a.getTime())[0];
        visitDates.push(lastAppointment);
      }
    }

    // 2. Lade Dekurs-Einträge, Dokumente und andere Daten asynchron
    // (wird im useEffect geladen und gecached)
    
    // Wenn bereits ein Datum gefunden wurde, nutze es
    if (visitDates.length > 0) {
      const lastVisit = visitDates.sort((a, b) => b.getTime() - a.getTime())[0];
      setLastVisitCache(prev => ({ ...prev, [patientId]: lastVisit }));
      return lastVisit;
    }

    // Fallback: Nutze createdAt oder ein altes Datum
    const fallbackDate = patient.createdAt ? new Date(patient.createdAt) : new Date(0);
    setLastVisitCache(prev => ({ ...prev, [patientId]: fallbackDate }));
    return fallbackDate;
  }, [appointments, lastVisitCache]);

  // Lade letzte Besuche für alle Patienten asynchron
  useEffect(() => {
    const loadLastVisits = async () => {
      if (!patients || patients.length === 0) return;

      const visitPromises = patients.map(async (patient) => {
        const patientId = patient._id || patient.id;
        if (!patientId) return;

        // Prüfe ob bereits im Cache
        if (lastVisitCache[patientId]) return;

        try {
          const visitDates: Date[] = [];

          // 1. Termine (bereits in Redux)
          if (appointments && appointments.length > 0) {
            const patientAppointments = appointments.filter((apt: Appointment) => {
              const aptPatientId = typeof apt.patient === 'string' ? apt.patient : apt.patient?._id || apt.patient?.id;
              return aptPatientId === patientId && apt.startTime;
            });
            
            if (patientAppointments.length > 0) {
              const lastAppointment = patientAppointments
                .map(apt => new Date(apt.startTime))
                .sort((a, b) => b.getTime() - a.getTime())[0];
              visitDates.push(lastAppointment);
            }
          }

          // 2. Letzter Dekurs-Eintrag
          try {
            const dekursResponse: any = await api.get(`/dekurs/patient/${patientId}?limit=1`);
            const dekursData = dekursResponse?.data || dekursResponse;
            const dekursEntries = dekursData?.success ? dekursData.data : (Array.isArray(dekursData) ? dekursData : []);
            if (dekursEntries && dekursEntries.length > 0 && dekursEntries[0].entryDate) {
              visitDates.push(new Date(dekursEntries[0].entryDate));
            }
          } catch (dekursError) {
            // Ignoriere Fehler
          }

          // 3. Letztes Dokument (Arztbrief oder Patientenbrief)
          try {
            const documentsResponse: any = await api.get(`/documents?patientId=${patientId}&limit=1`);
            const documentsData = documentsResponse?.data || documentsResponse;
            const documents = documentsData?.success ? documentsData.data : (Array.isArray(documentsData) ? documentsData : []);
            if (documents && documents.length > 0) {
              const lastDocument = documents
                .filter((doc: any) => doc.type === 'arztbrief' || doc.type === 'patientenbrief' || doc.createdAt)
                .map((doc: any) => new Date(doc.createdAt || doc.updatedAt))
                .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];
              if (lastDocument) {
                visitDates.push(lastDocument);
              }
            }
          } catch (docError) {
            // Ignoriere Fehler
          }

          // 4. Letzter Arztbesuch (aus PatientDataHistory oder MedicalDataHistory)
          // Dies könnte später hinzugefügt werden, wenn die API verfügbar ist

          // Bestimme das neueste Datum
          if (visitDates.length > 0) {
            const lastVisit = visitDates.sort((a, b) => b.getTime() - a.getTime())[0];
            setLastVisitCache(prev => ({ ...prev, [patientId]: lastVisit }));
          } else {
            // Fallback: Nutze createdAt
            const fallbackDate = patient.createdAt ? new Date(patient.createdAt) : new Date(0);
            setLastVisitCache(prev => ({ ...prev, [patientId]: fallbackDate }));
          }
        } catch (error) {
          // Bei Fehler: Nutze createdAt als Fallback
          const fallbackDate = patient.createdAt ? new Date(patient.createdAt) : new Date(0);
          setLastVisitCache(prev => ({ ...prev, [patientId]: fallbackDate }));
        }
      });

      await Promise.allSettled(visitPromises);
    };

    loadLastVisits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, appointments]);

  const isOverdueRecall = useCallback((patient: Patient) => {
    // Check if patient has a lastCheckIn date and it's more than 30 days ago
    if (patient.lastCheckIn && patient.lastCheckIn !== null) {
      const lastCheckIn = new Date(patient.lastCheckIn);
      const daysSinceCheckIn = Math.floor((Date.now() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceCheckIn > 30;
    }
    
    // Fallback: check if patient was created more than 30 days ago and has no recent activity
    if (patient.createdAt) {
      const createdDate = new Date(patient.createdAt);
      const daysSinceCreated = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceCreated > 30 && patient.status !== 'aktiv';
    }
    
    return false;
  }, []);

  // Helper functions for appointment filters
  const hasAppointmentToday = useCallback((patient: Patient) => {
    if (!appointments || appointments.length === 0) return false;
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return appointments.some(appointment => {
      const appointmentDate = new Date(appointment.startTime).toISOString().split('T')[0];
      return appointmentDate === todayStr && appointment.patient === (patient._id || patient.id);
    });
  }, [appointments]);

  const hasAppointmentTomorrow = useCallback((patient: Patient) => {
    if (!appointments || appointments.length === 0) return false;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return appointments.some(appointment => {
      const appointmentDate = new Date(appointment.startTime).toISOString().split('T')[0];
      return appointmentDate === tomorrowStr && appointment.patient === (patient._id || patient.id);
    });
  }, [appointments]);

  const getHealthStatus = (patient: Patient) => {
    if (!patient) return 'healthy';
    if (isOverdueRecall(patient)) return 'overdue';
    if (patient.dateOfBirth && isTodayBirthday(patient.dateOfBirth)) return 'birthday';
    if (patient.status === 'wartend') return 'waiting';
    return 'healthy';
  };

  const getHealthStatusColor = (status: string) => {
    if (!status) return 'success';
    switch (status) {
      case 'overdue': return 'error';
      case 'birthday': return 'primary';
      case 'waiting': return 'warning';
      default: return 'success';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    if (!status) return <HealthAndSafety />;
    switch (status) {
      case 'overdue': return <Warning />;
      case 'birthday': return <Cake />;
      case 'waiting': return <AccessTime />;
      default: return <HealthAndSafety />;
    }
  };

  // Show error messages
  useEffect(() => {
    if (error) {
      setSnackbar({ open: true, message: error, severity: 'error' });
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleAddNew = () => {
    // Navigiere zur Patientenaufnahme-Seite
    navigate('/patient-admission', { 
      state: { 
        returnTo: '/patients',
        showSuccessMessage: true 
      } 
    });
  };


  const handleSave = async () => {
    try {
      // Validierung der Pflichtfelder mit spezifischen Meldungen
      const missingFields = [];
      
      if (!formData.firstName) missingFields.push('Vorname');
      if (!formData.lastName) missingFields.push('Nachname');
      if (!formData.dateOfBirth) missingFields.push('Geburtsdatum');
      if (!formData.gender) missingFields.push('Geschlecht');
      if (!formData.phone) missingFields.push('Telefon');
      if (!formData.address?.street) missingFields.push('Straße');
      if (!formData.address?.city) missingFields.push('Stadt');
      if (!formData.address?.zipCode) missingFields.push('PLZ');
      
      if (missingFields.length > 0) {
        setSnackbar({ 
          open: true, 
          message: `Bitte füllen Sie folgende Pflichtfelder aus: ${missingFields.join(', ')}`, 
          severity: 'error' 
        });
        return;
      }

      if (dialogMode === 'add') {
        await dispatch(createPatient(formData)).unwrap();
        setSnackbar({ open: true, message: 'Patient erfolgreich erstellt', severity: 'success' });
      } else if (dialogMode === 'edit') {
        await dispatch(updatePatient({ 
          id: formData._id || formData.id || '', 
          patientData: formData 
        })).unwrap();
        setSnackbar({ open: true, message: 'Patient erfolgreich aktualisiert', severity: 'success' });
      }
      setOpenDialog(false);
    } catch (error: any) {
      console.error('Error saving patient:', error);
      
      // Detaillierte Fehlermeldung vom Backend anzeigen
      let errorMessage = 'Fehler beim Speichern des Patienten';
      
      if (error?.payload) {
        // Redux Toolkit rejected action
        errorMessage = error.payload;
      } else if (error?.response?.data?.error) {
        // Axios error mit detaillierter Fehlermeldung
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        // Standard error message
        errorMessage = error.message;
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address!,
        [field]: value
      }
    }));
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact!,
        [field]: value
      }
    }));
  };

  // Smart filtering and sorting logic
  const filteredAndSortedPatients = useMemo(() => {
    // Sicherstellen, dass patients ein Array ist
    const patientsArray = Array.isArray(patients) ? patients : [];
    
    console.log(`🔍 Filtering ${patientsArray.length} patients with activeFilters:`, activeFilters);
    
    let filtered = patientsArray.filter(patient => {
      // Search filter - verbesserte Suche mit Leerzeichen-Behandlung
      let matchesSearch = true; // Default: show all if no search term
      
      if (searchTerm) {
        // Suchbegriff normalisieren (Leerzeichen entfernen, zu lowercase)
        const normalizedSearchTerm = searchTerm.toLowerCase().trim().replace(/\s+/g, ' ');
        
        // Vollständiger Name für Suche erstellen
        const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase().trim();
        const reverseFullName = `${patient.lastName || ''} ${patient.firstName || ''}`.toLowerCase().trim();
        
        // Erweiterte Suchlogik
        matchesSearch = 
          // Einzelne Felder
          (patient.firstName?.toLowerCase().includes(normalizedSearchTerm) || false) ||
          (patient.lastName?.toLowerCase().includes(normalizedSearchTerm) || false) ||
          (patient.email?.toLowerCase().includes(normalizedSearchTerm) || false) ||
          (patient.phone?.includes(searchTerm) || false) ||
          // Versicherungsnummer (alte und neue Felder)
          (patient.socialSecurityNumber?.includes(searchTerm) || false) ||
          (patient.socialSecurityNumber?.includes(searchTerm) || false) ||
          // Vollständiger Name (beide Richtungen)
          fullName.includes(normalizedSearchTerm) ||
          reverseFullName.includes(normalizedSearchTerm) ||
          // Teilstring-Suche ohne Leerzeichen
          fullName.replace(/\s+/g, '').includes(normalizedSearchTerm.replace(/\s+/g, '')) ||
          // Adresse
          (patient.address?.street?.toLowerCase().includes(normalizedSearchTerm) || false) ||
          (patient.address?.city?.toLowerCase().includes(normalizedSearchTerm) || false) ||
          (patient.address?.zipCode?.includes(searchTerm) || false);

        // Debug-Logging für Entwicklung
        if (process.env.NODE_ENV === 'development' && searchTerm && matchesSearch) {
          console.log(`🔍 Patient gefunden: ${patient.firstName} ${patient.lastName} für Suchbegriff: "${searchTerm}"`);
        }
      }

      // Quick filters - Patient must match at least one active filter (OR logic)
      let matchesFilters = true; // Default: show all if no filters active
      
      if (activeFilters.length > 0) {
        matchesFilters = activeFilters.some(filter => {
          let matches = false;
          switch (filter) {
            case 'birthday':
              matches = isTodayBirthday(patient.dateOfBirth);
              break;
            case 'overdue':
              matches = isOverdueRecall(patient);
              break;
            case 'unbilled':
              // Check if patient has unbilled appointments (mock implementation)
              matches = patient.status === 'wartend' || patient.status === 'unverrechnet';
              break;
            case 'new':
              // Check if patient was created in last 5 days
              let createdDate;
              
              if (patient.createdAt) {
                // Use createdAt if available
                createdDate = new Date(patient.createdAt);
              } else if (patient._id) {
                // Fallback: Extract timestamp from MongoDB ObjectId
                const objectId = patient._id;
                const timestamp = parseInt(objectId.substring(0, 8), 16) * 1000;
                createdDate = new Date(timestamp);
              } else {
                matches = false;
                console.log(`🔍 Neu Patienten Filter für ${patient.firstName} ${patient.lastName}: Kein createdAt oder _id Feld`);
                break;
              }
              
              const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
              matches = createdDate > fiveDaysAgo;
              
              console.log(`🔍 Neu Patienten Filter für ${patient.firstName} ${patient.lastName}:`, {
                createdAt: patient.createdAt,
                _id: patient._id,
                createdDate: createdDate.toISOString(),
                fiveDaysAgo: fiveDaysAgo.toISOString(),
                matches
              });
              break;
            case 'active':
              matches = patient.status === 'aktiv' || patient.status === 'active';
              break;
            case 'appointment_today':
              matches = hasAppointmentToday(patient);
              break;
            case 'appointment_tomorrow':
              matches = hasAppointmentTomorrow(patient);
              break;
            default:
              matches = false; // Only show if explicitly matches a filter
          }
          
          // Debug logging
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 Filter "${filter}" für Patient ${patient.firstName} ${patient.lastName}: ${matches}`);
          }
          
          return matches;
        });
      }

      const shouldShow = matchesSearch && matchesFilters;
      
      // Debug logging
      if (process.env.NODE_ENV === 'development' && activeFilters.length > 0) {
        console.log(`🔍 Patient ${patient.firstName} ${patient.lastName}: search=${matchesSearch}, filters=${matchesFilters}, show=${shouldShow}`);
      }
      
      return shouldShow;
    });

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
          break;
        case 'lastVisit':
          comparison = getLastVisitDate(a).getTime() - getLastVisitDate(b).getTime();
          break;
        case 'birthday':
          comparison = new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [patients, searchTerm, activeFilters, sortBy, sortOrder, isOverdueRecall, hasAppointmentToday, hasAppointmentTomorrow]);

  // Filter handlers
  const handleFilterToggle = (filterId: string) => {
    console.log(`🔍 Toggling filter: ${filterId}`);
    setActiveFilters(prev => {
      const newFilters = prev.includes(filterId) 
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId];
      console.log(`🔍 New active filters:`, newFilters);
      return newFilters;
    });
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
    setSearchTerm('');
  };

  // Patient Card Component - Modern Design
  // Hilfsfunktion: Prüft ob Patient Zusatzversicherung hat ODER Privatversicherung als Hauptversicherung
  const hasAdditionalInsurance = useCallback((patient: Patient) => {
    // Prüfe zuerst auf Privatversicherung als Hauptversicherung
    if (patient.insuranceProvider === 'Privatversicherung') {
      return true;
    }
    
    // Dann prüfe auf Zusatzversicherungen
    const additionalInsurances = (patient as any).additionalInsurances;
    if (!additionalInsurances) return false;
    
    return !!(
      additionalInsurances.hospitalInsurance?.hasInsurance ||
      additionalInsurances.privateDoctorInsurance?.hasInsurance ||
      additionalInsurances.dentalInsurance?.hasInsurance ||
      additionalInsurances.opticalInsurance?.hasInsurance ||
      additionalInsurances.medicalAidsInsurance?.hasInsurance ||
      additionalInsurances.travelInsurance?.hasInsurance
    );
  }, []);
  
  // Hilfsfunktion: Prüft ob Patient Sonderklasse hat
  const hasSonderklasse = useCallback((patient: Patient) => {
    return !!(patient as any).additionalInsurances?.hospitalInsurance?.hasInsurance;
  }, []);
  
  // Hilfsfunktion: Prüft ob Patient Privatversicherung als Hauptversicherung hat
  const hasPrivateInsurance = useCallback((patient: Patient) => {
    return patient.insuranceProvider === 'Privatversicherung';
  }, []);

  const PatientCard: React.FC<{ patient: Patient }> = ({ patient }) => {
    const lastVisit = getLastVisitDate(patient);
    const isImportant = hasAdditionalInsurance(patient);
    const isSonderklasse = hasSonderklasse(patient);
    const isPrivateInsurance = hasPrivateInsurance(patient);
    const age = getAge(patient.dateOfBirth);

    // Action handlers
    const handleCall = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent card click
      if (patient.phone) {
        window.open(`tel:${patient.phone}`, '_self');
      } else {
        alert('Keine Telefonnummer verfügbar');
      }
    };

    const handleEmail = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent card click
      if (patient.email) {
        window.open(`mailto:${patient.email}`, '_self');
      } else {
        alert('Keine E-Mail-Adresse verfügbar');
      }
    };

    const handleAppointment = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent card click
      navigate('/calendar', { 
        state: { 
          selectedPatient: patient,
          openAppointmentDialog: true 
        } 
      });
    };
    
    return (
      <Card 
        onClick={() => navigate(`/patient-organizer/${patient._id || patient.id}`)}
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          transition: 'all 0.3s ease-in-out',
          borderRadius: 3,
          border: patient.hasHint || isImportant ? '3px solid' : '1px solid',
          borderColor: patient.hasHint 
            ? 'warning.main' 
            : isImportant 
            ? (isSonderklasse ? 'primary.main' : isPrivateInsurance ? 'success.main' : 'warning.main')
            : 'divider',
          bgcolor: patient.hasHint 
            ? 'warning.light' 
            : isImportant 
            ? (isSonderklasse ? 'rgba(25, 118, 210, 0.05)' : isPrivateInsurance ? 'rgba(46, 125, 50, 0.05)' : 'rgba(255, 152, 0, 0.05)')
            : 'background.paper',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: patient.hasHint 
              ? '0 8px 25px rgba(255, 152, 0, 0.3)' 
              : isImportant
              ? (isSonderklasse ? '0 8px 25px rgba(25, 118, 210, 0.3)' : isPrivateInsurance ? '0 8px 25px rgba(46, 125, 50, 0.3)' : '0 8px 25px rgba(255, 152, 0, 0.3)')
              : '0 8px 25px rgba(0,0,0,0.15)',
          }
        }}
      >
        <CardContent sx={{ flexGrow: 1, p: 3 }}>
          {/* Header with Avatar and Name */}
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Avatar 
              sx={{ 
                width: 48, 
                height: 48, 
                bgcolor: getAvatarColor(patient.gender),
                fontSize: '1.1rem',
                fontWeight: 'bold',
                border: '2px solid',
                borderColor: patient.gender?.toLowerCase().includes('w') ? 'pink.300' : 'blue.300'
              }}
            >
              {getInitials(patient.firstName, patient.lastName)}
            </Avatar>
            <Box flexGrow={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6" component="div" fontWeight={600} noWrap>
                  {patient.firstName} {patient.lastName}
                </Typography>
                {patient.hasHint && (
                  <Tooltip title="Patient hat einen Hinweis">
                    <Warning 
                      color="warning" 
                      sx={{ 
                        fontSize: 20,
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                          '0%': { opacity: 1 },
                          '50%': { opacity: 0.5 },
                          '100%': { opacity: 1 },
                        },
                      }} 
                    />
                  </Tooltip>
                )}
                {isImportant && (
                  <Tooltip title={
                    isSonderklasse 
                      ? "Sonderklasse-Patient" 
                      : isPrivateInsurance 
                      ? "Privatversicherung" 
                      : "Patient mit Zusatzversicherung"
                  }>
                    <LocalHospital 
                      color={isSonderklasse ? "primary" : isPrivateInsurance ? "success" : "warning"} 
                      sx={{ 
                        fontSize: 20,
                        ml: 0.5
                      }} 
                    />
                  </Tooltip>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {age} Jahre • {patient.gender === 'w' || patient.gender === 'weiblich' ? 'weiblich' : 'männlich'}
              </Typography>
            </Box>
          </Box>

          {/* Contact Information */}
          <Stack spacing={1.5} mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <LocationOn fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary" noWrap>
                {patient.address?.city || 'Keine Stadt'}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Email fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary" noWrap>
                {patient.email || 'Keine E-Mail'}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Phone fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary" noWrap>
                {patient.phone || 'Keine Telefonnummer'}
              </Typography>
            </Box>
            {/* Versicherungsdaten */}
            <Box display="flex" alignItems="center" gap={1}>
              <Receipt fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary" noWrap>
                {patient.socialSecurityNumber || 'Keine SV-Nr.'}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <HealthAndSafety fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary" noWrap>
                {patient.insuranceProvider || 'Keine Versicherung'}
              </Typography>
            </Box>
            {/* Zusatzversicherungen - Kompaktanzeige */}
            {(patient as any).additionalInsurances && (
              <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                {(patient as any).additionalInsurances.hospitalInsurance?.hasInsurance && (
                  <Chip 
                    label="🏥 Sonderklasse" 
                    size="small" 
                    sx={{ height: 20, fontSize: '0.65rem' }}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {(patient as any).additionalInsurances.privateDoctorInsurance?.hasInsurance && (
                  <Chip 
                    label="👨‍⚕️ Wahlarzt" 
                    size="small" 
                    sx={{ height: 20, fontSize: '0.65rem' }}
                    color="secondary"
                    variant="outlined"
                  />
                )}
                {(patient as any).additionalInsurances.dentalInsurance?.hasInsurance && (
                  <Chip 
                    label="🦷 Zahn" 
                    size="small" 
                    sx={{ height: 20, fontSize: '0.65rem' }}
                    color="info"
                    variant="outlined"
                  />
                )}
                {(patient as any).additionalInsurances.opticalInsurance?.hasInsurance && (
                  <Chip 
                    label="👓 Brille" 
                    size="small" 
                    sx={{ height: 20, fontSize: '0.65rem' }}
                    color="warning"
                    variant="outlined"
                  />
                )}
              </Box>
            )}
          </Stack>

          {/* Status and Last Visit */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Chip
              label={patient.status}
              color={patient.status === 'aktiv' ? 'success' : patient.status === 'wartend' ? 'warning' : 'default'}
              size="small"
              sx={{ fontWeight: 500 }}
            />
            <Typography variant="caption" color="text.secondary">
              Letzter Besuch: {lastVisit.toLocaleDateString('de-DE')}
            </Typography>
          </Box>

          {/* Hinweistext */}
          {patient.hasHint && patient.hintText && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: 'warning.main', 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'warning.dark'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Warning fontSize="small" color="warning" />
                <Typography variant="subtitle2" fontWeight="bold" color="warning.contrastText">
                  HINWEIS
                </Typography>
              </Box>
              <Typography variant="body2" color="warning.contrastText">
                {patient.hintText}
              </Typography>
            </Box>
          )}

            {/* Action Buttons */}
            <Box display="flex" gap={1} pt={1}>
              <IconButton 
                size="small" 
                onClick={handleCall}
                sx={{ 
                  bgcolor: 'primary.50', 
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'primary.100' }
                }}
                title="Anrufen"
              >
                <Phone fontSize="small" />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={handleEmail}
                sx={{ 
                  bgcolor: 'success.50', 
                  color: 'success.main',
                  '&:hover': { bgcolor: 'success.100' }
                }}
                title="E-Mail senden"
              >
                <Email fontSize="small" />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={handleAppointment}
                sx={{ 
                  bgcolor: 'info.50', 
                  color: 'info.main',
                  '&:hover': { bgcolor: 'info.100' }
                }}
                title="Termin buchen"
              >
                <AccessTime fontSize="small" />
              </IconButton>
            </Box>
        </CardContent>
      </Card>
    );
  };

  // Patient List Item Component
  const PatientListItem: React.FC<{ patient: Patient }> = ({ patient }) => {
    const isImportant = hasAdditionalInsurance(patient);
    const isSonderklasse = hasSonderklasse(patient);
    const isPrivateInsurance = hasPrivateInsurance(patient);
    const healthStatus = getHealthStatus(patient);
    const lastVisit = getLastVisitDate(patient);
    const age = getAge(patient.dateOfBirth);

    // Action handlers for list view
    const handleCall = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent list item click
      if (patient.phone) {
        window.open(`tel:${patient.phone}`, '_self');
      } else {
        alert('Keine Telefonnummer verfügbar');
      }
    };

    const handleEmail = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent list item click
      if (patient.email) {
        window.open(`mailto:${patient.email}`, '_self');
      } else {
        alert('Keine E-Mail-Adresse verfügbar');
      }
    };

    const handleAppointment = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent list item click
      navigate('/calendar', { 
        state: { 
          selectedPatient: patient,
          openAppointmentDialog: true 
        } 
      });
    };
    
    return (
      <ListItem
        onClick={() => navigate(`/patient-organizer/${patient._id || patient.id}`)}
        sx={{
          border: isImportant ? '2px solid' : '1px solid',
          borderColor: isImportant 
            ? (isSonderklasse ? 'primary.main' : isPrivateInsurance ? 'success.main' : 'warning.main') 
            : 'divider',
          borderRadius: 2,
          mb: 1,
          cursor: 'pointer',
          backgroundColor: isImportant 
            ? (isSonderklasse ? 'rgba(25, 118, 210, 0.05)' : isPrivateInsurance ? 'rgba(46, 125, 50, 0.05)' : 'rgba(255, 152, 0, 0.05)') 
            : 'transparent',
          '&:hover': {
            bgcolor: isImportant 
              ? (isSonderklasse ? 'rgba(25, 118, 210, 0.1)' : isPrivateInsurance ? 'rgba(46, 125, 50, 0.1)' : 'rgba(255, 152, 0, 0.1)') 
              : 'action.hover',
            borderColor: isImportant 
              ? (isSonderklasse ? 'primary.dark' : isPrivateInsurance ? 'success.dark' : 'warning.dark') 
              : 'primary.main',
          }
        }}
      >
        <ListItemAvatar>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <Tooltip title={`Status: ${healthStatus}`}>
                        <Avatar 
                          sx={{ 
                            width: 16, 
                            height: 16, 
                            bgcolor: `${getHealthStatusColor(healthStatus)}.main`,
                            border: '2px solid white'
                          }}
                        >
                          {getHealthStatusIcon(healthStatus || 'healthy')}
                        </Avatar>
                      </Tooltip>
                    }
          >
            <Avatar sx={{ bgcolor: getAvatarColor(patient.gender) }}>
              {getInitials(patient.firstName, patient.lastName)}
            </Avatar>
          </Badge>
        </ListItemAvatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, fontSize: '1rem' }}>
              {patient.firstName} {patient.lastName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Chip
                label={patient.status}
                color={patient.status === 'aktiv' ? 'success' : patient.status === 'wartend' ? 'warning' : 'default'}
                size="small"
              />
              {isImportant && (
                <Tooltip title={
                  isSonderklasse 
                    ? "Sonderklasse-Patient" 
                    : isPrivateInsurance 
                    ? "Privatversicherung" 
                    : "Patient mit Zusatzversicherung"
                }>
                  <LocalHospital 
                    color={isSonderklasse ? "primary" : isPrivateInsurance ? "success" : "warning"} 
                    sx={{ fontSize: 18 }} 
                  />
                </Tooltip>
              )}
            </Box>
          </Box>
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {age} Jahre • {patient.gender} • {patient.phone} • {patient.email}
            </Typography>
          </Box>
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              SV-Nr.: {patient.socialSecurityNumber || 'Nicht angegeben'} • 
              Versicherung: {patient.insuranceProvider || 'Nicht angegeben'}
              {(patient as any).insuranceNumber && ` • VN: ${(patient as any).insuranceNumber}`}
            </Typography>
            {/* Zusatzversicherungen in Listenansicht */}
            {(patient as any).additionalInsurances && (
              <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(patient as any).additionalInsurances.hospitalInsurance?.hasInsurance && (
                  <Chip label="🏥 Sonderklasse" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                )}
                {(patient as any).additionalInsurances.privateDoctorInsurance?.hasInsurance && (
                  <Chip label="👨‍⚕️ Wahlarzt" size="small" color="secondary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                )}
                {(patient as any).additionalInsurances.dentalInsurance?.hasInsurance && (
                  <Chip label="🦷 Zahn" size="small" color="info" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                )}
                {(patient as any).additionalInsurances.opticalInsurance?.hasInsurance && (
                  <Chip label="👓 Brille" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                )}
              </Box>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            Letzter Besuch: {lastVisit.toLocaleDateString('de-DE')} • {patient.address.city}
          </Typography>
        </Box>
        {/* Action Buttons for List View */}
        <Box display="flex" gap={1}>
          <IconButton 
            size="small" 
            onClick={handleCall}
            sx={{ 
              bgcolor: 'primary.50', 
              color: 'primary.main',
              '&:hover': { bgcolor: 'primary.100' }
            }}
            title="Anrufen"
          >
            <Phone fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={handleEmail}
            sx={{ 
              bgcolor: 'success.50', 
              color: 'success.main',
              '&:hover': { bgcolor: 'success.100' }
            }}
            title="E-Mail senden"
          >
            <Email fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={handleAppointment}
            sx={{ 
              bgcolor: 'info.50', 
              color: 'info.main',
              '&:hover': { bgcolor: 'info.100' }
            }}
            title="Termin buchen"
          >
            <AccessTime fontSize="small" />
          </IconButton>
        </Box>
      </ListItem>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Modern Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" component="h1" fontWeight={600} gutterBottom>
            Patientenverwaltung
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {filteredAndSortedPatients.length} von {patients?.length || 0} Patienten
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Search />}
            sx={{ borderRadius: 2 }}
          >
            Suche
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddNew}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontWeight: 600
            }}
          >
            Neuer Patient
          </Button>
        </Box>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <Box p={3}>
          <Stack spacing={3}>
            {/* Modern Search Bar */}
            <TextField
              fullWidth
              placeholder="Suche nach Name, Ort, Vers.-Nr.…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                }
              }}
              helperText="Tipp: Suche nach 'Eva', 'Eva ', '1234567890' (Vers.-Nr.) oder 'Eva Mustermann' - alle funktionieren!"
            />

            {/* Modern Quick Filters */}
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <FilterList fontSize="small" color="action" />
                <Typography variant="subtitle2" color="text.secondary" fontWeight={500}>
                  Quick-Filter:
                </Typography>
                {activeFilters.length > 0 && (
                  <Button
                    size="small"
                    startIcon={<Clear />}
                    onClick={handleClearFilters}
                    sx={{ ml: 'auto', textTransform: 'none' }}
                  >
                    Alle löschen
                  </Button>
                )}
              </Box>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                {quickFilters.map((filter) => {
                  const isActive = activeFilters.includes(filter.id);
                  return (
                    <Chip
                      key={filter.id}
                      icon={filter.icon}
                      label={filter.label}
                      color={isActive ? filter.color as any : 'default'}
                      variant={isActive ? 'filled' : 'outlined'}
                      onClick={() => handleFilterToggle(filter.id)}
                      clickable
                      sx={{
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: 2,
                        },
                        ...(isActive && {
                          fontWeight: 600,
                          boxShadow: 2,
                        })
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>

            {/* Filter Results Info */}
            {activeFilters.length > 0 && (
              <Box sx={{ mt: 2, mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {filteredAndSortedPatients.length} von {patients.length} Patienten gefunden
                  {activeFilters.length > 0 && ` (Filter: ${activeFilters.join(', ')})`}
                </Typography>
              </Box>
            )}

            {/* View Controls */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="body2" color="text.secondary">
                  Sortieren nach:
                </Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <MenuItem value="name">Name</MenuItem>
                    <MenuItem value="lastVisit">Letzter Besuch</MenuItem>
                    <MenuItem value="birthday">Geburtstag</MenuItem>
                    <MenuItem value="status">Status</MenuItem>
                  </Select>
                </FormControl>
                <IconButton
                  size="small"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </IconButton>
              </Box>
              
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, newMode) => newMode && setViewMode(newMode)}
                size="small"
              >
                <ToggleButton value="cards">
                  <ViewModule />
                </ToggleButton>
                <ToggleButton value="list">
                  <ViewList />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>
        </Box>
      </Card>

      {/* Patient List */}
      <Box 
        ref={scrollContainerRef}
        sx={{ 
          flex: 1, 
          px: 2, 
          pb: 2, 
          overflow: 'auto',
          maxHeight: 'calc(100vh - 350px)', // Optimierte Höhenbegrenzung
          minHeight: '400px', // Mindesthöhe
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0,0,0,0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(0,0,0,0.5)',
            },
          },
        }}
      >
        {loading ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 3,
          }}
        >
          {[...Array(6)].map((_, index) => (
            <Card key={index}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Skeleton variant="circular" width={56} height={56} />
                  <Box flexGrow={1}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </Box>
                </Box>
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="60%" />
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : filteredAndSortedPatients.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <LocalHospital sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Keine Patienten gefunden
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {searchTerm || activeFilters.length > 0 
              ? 'Versuchen Sie andere Suchbegriffe oder Filter.'
              : 'Fügen Sie Ihren ersten Patienten hinzu.'
            }
          </Typography>
          {!searchTerm && activeFilters.length === 0 && (
            <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>
              Ersten Patienten hinzufügen
            </Button>
          )}
        </Paper>
      ) : viewMode === 'cards' ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 3,
            p: 1, // Padding für bessere Optik
          }}
        >
          {filteredAndSortedPatients.map((patient) => (
            <PatientCard key={patient._id || patient.id} patient={patient} />
          ))}
        </Box>
      ) : (
        <Paper sx={{ p: 2 }}>
          <List>
            {filteredAndSortedPatients.map((patient) => (
              <PatientListItem key={patient._id || patient.id} patient={patient} />
            ))}
          </List>
        </Paper>
      )}

        {/* Load More Button */}
        {pagination?.hasMore && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
            <Button
              variant="outlined"
              onClick={handleLoadMore}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Add />}
              sx={{ minWidth: 200 }}
            >
              {loading ? 'Lade weitere Patienten...' : `Weitere Patienten laden (${pagination?.total - patients.length} verbleibend)`}
            </Button>
          </Box>
        )}
      </Box>

      {/* Pagination Info - außerhalb des scrollbaren Bereichs */}
      {pagination?.total > 0 && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mt: 2, 
          mb: 2,
          px: 2,
          py: 1,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography variant="body2" color="text.secondary">
            Zeige {patients.length} von {pagination?.total} Patienten
            {pagination?.hasMore && ` • Seite ${pagination?.current} von ${pagination?.pages}`}
          </Typography>
        </Box>
      )}

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
      >
        <GradientDialogTitle
          isEdit={dialogMode === 'edit'}
          title={
            dialogMode === 'add' ? 'Neuer Patient' :
            dialogMode === 'edit' ? 'Patient bearbeiten' :
            'Patient anzeigen'
          }
          icon={<PersonIcon />}
          gradientColors={{ from: '#6366f1', to: '#8b5cf6' }}
        />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="Grunddaten" />
              <Tab label="Kontakt & Adresse" />
              <Tab label="Versicherung" />
              <Tab label="Medizinische Daten" />
              <Tab label="Notizen" />
            </Tabs>
          </Box>

          <Box sx={{ mt: 2 }}>
            {activeTab === 0 && (
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" gap={2}>
                  <TextField
                    fullWidth
                    label="Vorname *"
                    value={formData.firstName || ''}
                    onChange={(e) => handleFormChange('firstName', e.target.value)}
                    disabled={dialogMode === 'view'}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Nachname *"
                    value={formData.lastName || ''}
                    onChange={(e) => handleFormChange('lastName', e.target.value)}
                    disabled={dialogMode === 'view'}
                    required
                  />
                </Box>
                <Box display="flex" gap={2}>
                  <TextField
                    fullWidth
                    label="Geburtsdatum *"
                    type="date"
                    value={(formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().slice(0,10) : '')}
                    onChange={(e) => handleFormChange('dateOfBirth', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={dialogMode === 'view'}
                    required
                  />
                  <FormControl fullWidth required>
                    <InputLabel>Geschlecht *</InputLabel>
                    <Select
                      value={formData.gender || ''}
                      onChange={(e) => handleFormChange('gender', e.target.value)}
                      disabled={dialogMode === 'view'}
                    >
                      <SelectMenuItem value="männlich">Männlich</SelectMenuItem>
                      <SelectMenuItem value="weiblich">Weiblich</SelectMenuItem>
                      <SelectMenuItem value="divers">Divers</SelectMenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            )}

            {activeTab === 1 && (
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" gap={2}>
                  <TextField
                    fullWidth
                    label="Telefon *"
                    value={formData.phone || ''}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    disabled={dialogMode === 'view'}
                    required
                  />
                  <TextField
                    fullWidth
                    label="E-Mail"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    disabled={dialogMode === 'view'}
                  />
                </Box>
                <Divider />
                <Typography variant="h6" gutterBottom>Adresse</Typography>
                <Box display="flex" gap={2}>
                  <TextField
                    fullWidth
                    label="Straße *"
                    value={formData.address?.street || ''}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    disabled={dialogMode === 'view'}
                    required
                  />
                  <TextField
                    label="PLZ *"
                    value={formData.address?.zipCode || ''}
                    onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                    disabled={dialogMode === 'view'}
                    sx={{ width: 120 }}
                    required
                  />
                </Box>
                <Box display="flex" gap={2}>
                  <TextField
                    fullWidth
                    label="Stadt *"
                    value={formData.address?.city || ''}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    disabled={dialogMode === 'view'}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Land"
                    value={formData.address?.country || ''}
                    onChange={(e) => handleAddressChange('country', e.target.value)}
                    disabled={dialogMode === 'view'}
                  />
                </Box>
              </Box>
            )}

            {activeTab === 2 && (
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  fullWidth
                  label="Sozialversicherungsnummer"
                  value={formData.socialSecurityNumber || ''}
                  onChange={(e) => handleFormChange('socialSecurityNumber', e.target.value)}
                  disabled={dialogMode === 'view'}
                />
                <FormControl fullWidth>
                  <InputLabel>Versicherungsanstalt</InputLabel>
                  <Select
                    value={formData.insuranceProvider || ''}
                    onChange={(e) => handleFormChange('insuranceProvider', e.target.value)}
                    disabled={dialogMode === 'view'}
                  >
                    <SelectMenuItem value="ÖGK (Österreichische Gesundheitskasse)">ÖGK (Österreichische Gesundheitskasse)</SelectMenuItem>
                    <SelectMenuItem value="BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)">BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)</SelectMenuItem>
                    <SelectMenuItem value="SVS (Sozialversicherung der Selbständigen)">SVS (Sozialversicherung der Selbständigen)</SelectMenuItem>
                    <SelectMenuItem value="KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)">KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)</SelectMenuItem>
                    <SelectMenuItem value="PVA (Pensionsversicherungsanstalt)">PVA (Pensionsversicherungsanstalt)</SelectMenuItem>
                    <SelectMenuItem value="Privatversicherung">Privatversicherung</SelectMenuItem>
                    <SelectMenuItem value="Selbstzahler">Selbstzahler</SelectMenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Versicherungsnummer"
                  value={formData.insuranceNumber || ''}
                  onChange={(e) => handleFormChange('insuranceNumber', e.target.value)}
                  disabled={dialogMode === 'view'}
                />
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status || ''}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                    disabled={dialogMode === 'view'}
                  >
                    <SelectMenuItem value="aktiv">Aktiv</SelectMenuItem>
                    <SelectMenuItem value="inaktiv">Inaktiv</SelectMenuItem>
                    <SelectMenuItem value="wartend">Wartend</SelectMenuItem>
                  </Select>
                </FormControl>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>Zusatzversicherungen</Typography>
                <AdditionalInsuranceForm
                  value={formData.additionalInsurances || {}}
                  onChange={(value: any) => handleFormChange('additionalInsurances', value)}
                  disabled={dialogMode === 'view'}
                />
                {(dialogMode === 'edit' || dialogMode === 'view') && (formData._id || formData.id) && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>e-card Validierung</Typography>
                    <ECardValidation
                      patientId={formData._id || formData.id || ''}
                      ecardNumber={(formData as any).ecard?.cardNumber}
                      onValidationComplete={(result: any) => {
                        // Aktualisiere formData mit e-card Informationen
                        if (result?.patient?.ecard) {
                          setFormData((prev) => ({
                            ...prev,
                            ecard: result.patient.ecard,
                          }));
                        }
                        setSnackbar({ open: true, message: 'e-card erfolgreich validiert', severity: 'success' });
                      }}
                    />
                  </>
                )}
                {dialogMode === 'add' && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>e-card Validierung</Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Die e-card Validierung ist nach dem Erstellen des Patienten verfügbar.
                    </Alert>
                  </>
                )}
              </Box>
            )}

            {activeTab === 3 && (
              <Box display="flex" flexDirection="column" gap={2}>
                <Typography variant="h6" gutterBottom>Notfallkontakt</Typography>
                <Box display="flex" gap={2}>
                  <TextField
                    fullWidth
                    label="Name"
                    value={formData.emergencyContact?.name || ''}
                    onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                    disabled={dialogMode === 'view'}
                  />
                  <TextField
                    fullWidth
                    label="Telefon"
                    value={formData.emergencyContact?.phone || ''}
                    onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                    disabled={dialogMode === 'view'}
                  />
                </Box>
                <TextField
                  fullWidth
                  label="Beziehung"
                  value={formData.emergencyContact?.relationship || ''}
                  onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                  disabled={dialogMode === 'view'}
                />
                <Divider />
                <Typography variant="h6" gutterBottom>Medizinische Daten</Typography>
                <TextField
                  fullWidth
                  label="Allergien"
                  multiline
                  rows={3}
                  value={formData.allergies?.join(', ') || ''}
                  onChange={(e) => handleFormChange('allergies', e.target.value.split(',').map(a => a.trim()))}
                  disabled={dialogMode === 'view'}
                />
                <TextField
                  fullWidth
                  label="Medikamente"
                  multiline
                  rows={3}
                  value={formData.currentMedications?.join(', ') || ''}
                  onChange={(e) => handleFormChange('currentMedications', e.target.value.split(',').map(m => m.trim()))}
                  disabled={dialogMode === 'view'}
                />
              </Box>
            )}

            {activeTab === 4 && (
              <TextField
                fullWidth
                label="Notizen"
                multiline
                rows={6}
                value={formData.notes || ''}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                disabled={dialogMode === 'view'}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            {dialogMode === 'view' ? 'Schließen' : 'Abbrechen'}
          </Button>
          {dialogMode !== 'view' && (
            <Button onClick={handleSave} variant="contained">
              {dialogMode === 'add' ? 'Erstellen' : 'Speichern'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={8000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ 
            width: '100%',
            maxWidth: '600px',
            '& .MuiAlert-message': {
              whiteSpace: 'pre-line'
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Patients;