import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Divider, 
  Chip, 
  Stack, 
  Button, 
  List, 
  ListItemButton, 
  ListItemText, 
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  IconButton,
  Fab,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Alert,
  Avatar,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  CircularProgress
} from '@mui/material';
import { 
  Add, 
  Description, 
  LocalHospital, 
  MedicalServices,
  Medication,
  Person,
  AdminPanelSettings,
  ExpandMore,
  ExpandLess,
  Timeline,
  Menu as MenuIcon,
  Edit,
  Save,
  Favorite,
  Bloodtype,
  Height,
  MonitorWeight,
  Warning as Allergy,
  Warning,
  CloudUpload,
  Psychology,
  Vaccines,
  LocalPharmacy,
  QrCode,
  PregnantWoman,
  Schedule,
  AccessTime,
  CheckCircle,
  Info,
  Cancel,
  CameraAlt,
  Delete as DeleteIcon,
  Close,
  CreditCard
} from '@mui/icons-material';
import { useParams, Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPatients, updatePatient, Patient } from '../store/slices/patientSlice';
import { fetchAppointments, Appointment } from '../store/slices/appointmentSlice';
import { fetchPatientDiagnoses, PatientDiagnosis } from '../store/slices/diagnosisSlice';
import { fetchDocuments, Document as PatientDocument, createDocument } from '../store/slices/documentSlice';
// Removed imports for deleted files
import { fetchDocumentTemplates } from '../store/slices/documentTemplateSlice';
import { fetchLocations, Location } from '../store/slices/locationSlice';
import { apiRequest } from '../utils/api';
import PatientSidebar from '../components/PatientSidebar';
import PatientTimeline from '../components/PatientTimeline';
import DiagnosisManager from '../components/DiagnosisManager';
import MedicationListInput, { convertMedicationsArrayToPatientFormat } from '../components/MedicationListInput';
import CDADocumentViewer from '../components/CDADocumentViewer';
import PatientVisitHistory from '../components/PatientVisitHistory';
import DekursHistory from '../components/DekursHistory';
import DekursDialog from '../components/DekursDialog';
import DekursQuickEntry from '../components/DekursQuickEntry';
import PatientPhotoGallery from '../components/PatientPhotoGallery';
import LaborResults from '../components/LaborResults';
import DicomViewer from '../components/DicomViewer';
import DicomUpload from '../components/DicomUpload';
import DicomStudiesList from '../components/DicomStudiesList';
import ECardValidation from '../components/ECardValidation';
import GinaBoxStatus from '../components/GinaBoxStatus';
import { fetchDekursEntries } from '../store/slices/dekursSlice';
import { Article, Storage, Assignment, Science, Image, AccountCircle, CalendarToday, PhotoCamera } from '@mui/icons-material';
import { Specialization } from '../types/ambulanzbefund';

// Spezialisierungs-Labels
const SPECIALIZATION_LABELS: Record<Specialization, string> = {
  allgemein: 'Allgemeinmedizin',
  hno: 'HNO',
  interne: 'Innere Medizin',
  chirurgie: 'Chirurgie',
  dermatologie: 'Dermatologie',
  gyn: 'Gynäkologie',
  pädiatrie: 'Pädiatrie',
  neurologie: 'Neurologie',
  orthopädie: 'Orthopädie',
  ophthalmologie: 'Ophthalmologie',
  urologie: 'Urologie',
  psychiatrie: 'Psychiatrie',
  radiologie: 'Radiologie',
  pathologie: 'Pathologie',
};

// Helper functions für Status-Anzeige
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'geplant': return <Schedule />;
    case 'bestätigt': return <CheckCircle />;
    case 'wartend': return <AccessTime />;
    case 'in_behandlung': return <Info />;
    case 'abgeschlossen': return <CheckCircle />;
    case 'abgesagt': return <Cancel />;
    case 'verschoben': return <Schedule />;
    default: return <Schedule />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'geplant': return 'info';
    case 'bestätigt': return 'success';
    case 'wartend': return 'warning';
    case 'in_behandlung': return 'primary';
    case 'abgeschlossen': return 'success';
    case 'abgesagt': return 'error';
    case 'verschoben': return 'info';
    default: return 'default';
  }
};

// TabPanel Komponente
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`patient-tabpanel-${index}`}
      aria-labelledby={`patient-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
};

const PatientOrganizer: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { patients, loading: patientsLoading } = useAppSelector((s: any) => s.patients);
  const { appointments, loading: appointmentsLoading } = useAppSelector((s: any) => s.appointments);
  const { patientDiagnoses, loading: diagnosesLoading } = useAppSelector((s: any) => s.diagnoses);
  const { documents, loading: documentsLoading } = useAppSelector((s: any) => s.documents);
  const { locations } = useAppSelector((s: any) => s.locations);
  const { user } = useAppSelector((s: any) => s.auth);
  const { templates: documentTemplates } = useAppSelector((s: any) => s.documentTemplates);
  
  // State für XDS-Dokumente
  const [xdsDocuments, setXdsDocuments] = useState<any[]>([]);
  const [loadingXdsDocuments, setLoadingXdsDocuments] = useState(false);
  const [cdaViewerOpen, setCdaViewerOpen] = useState(false);
  const [viewingXdsDocument, setViewingXdsDocument] = useState<any | null>(null);
  
  // State für Ambulanzbefunde
  const [ambulanzbefunde, setAmbulanzbefunde] = useState<any[]>([]);
  const [loadingAmbulanzbefunde, setLoadingAmbulanzbefunde] = useState(false);

  // State für Tabs
  const [activeTab, setActiveTab] = useState(0);
  
  // State für Dekurs
  const [dekursDialogOpen, setDekursDialogOpen] = useState(false);
  const [selectedDekursEntry, setSelectedDekursEntry] = useState<any>(null);
  
  // State für DICOM
  const [dicomUploadOpen, setDicomUploadOpen] = useState(false);

  // Get patientId from URL params or query params
  const patientId = React.useMemo(() => {
    if (id) return id;
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('patientId');
  }, [id, location.search]);

  // Tab aus URL-Parameter lesen
  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam === 'dekurs') {
      setActiveTab(1);
    } else if (tabParam === 'laborwerte') {
      setActiveTab(2);
    } else if (tabParam === 'dicom') {
      setActiveTab(3);
    } else if (tabParam === 'stammdaten') {
      setActiveTab(4);
    } else if (tabParam === 'medizinisch') {
      setActiveTab(5);
    } else if (tabParam === 'termine') {
      setActiveTab(6);
    } else if (tabParam === 'dokumente') {
      setActiveTab(7);
    } else if (tabParam === 'fotos') {
      setActiveTab(8);
    } else {
      setActiveTab(0);
    }
  }, [location.search]);

  // State für Template-Dialog
  const [templateMenuAnchor, setTemplateMenuAnchor] = useState<null | HTMLElement>(null);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set([
    'Bescheinigungen', 'Überweisungen', 'Rezepte', 'Labor', 'Berichte', 'Notfall', 'Impfungen', 'Anamnese'
  ]));
  
  // State für Patient Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // State für Hinweis-Dialog
  const [hintDetailsDialogOpen, setHintDetailsDialogOpen] = useState(false);
  
  // State für Stammdaten-Bearbeitung
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<Patient>>({});
  
  // State für Stammdaten-Validierung
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationQrCode, setValidationQrCode] = useState<string>('');
  
  // State für medizinische Daten-Bearbeitung
  const [medicalDialogOpen, setMedicalDialogOpen] = useState(false);
  const [medicalData, setMedicalData] = useState<Partial<Patient>>({});
  
  // State für Foto-Upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoInputRef, setPhotoInputRef] = useState<HTMLInputElement | null>(null);
  
  // State für e-card-Validierung
  const [ecardValidationOpen, setEcardValidationOpen] = useState(false);
  const [autoValidatedEcard, setAutoValidatedEcard] = useState(false);
  
  // State für GINA-Box
  const [ginaBoxPatientFound, setGinaBoxPatientFound] = useState<any>(null);
  const [ginaBoxDialogOpen, setGinaBoxDialogOpen] = useState(false);
  
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const patient: Patient | undefined = React.useMemo(() => {
    const all = patients as Patient[];
    if (!all || !Array.isArray(all)) {
      return undefined;
    }
    return all.find(p => (p._id || p.id) === patientId);
  }, [patients, patientId]);

  React.useEffect(() => {
    if (!patients || (patients as Patient[]).length === 0) {
      dispatch(fetchPatients(1));
    } else if (patientId) {
      // Prüfe, ob der spezifische Patient im Store ist
      const all = patients as Patient[];
      const foundPatient = all.find(p => (p._id || p.id) === patientId);
      if (!foundPatient) {
        // Patient nicht gefunden, lade Patienten neu (möglicherweise ist er auf einer anderen Seite)
        dispatch(fetchPatients(1));
      }
    }
  }, [dispatch, patients, patientId]);

  React.useEffect(() => {
    if (!patientId) return;
    // Daten für den Patienten laden
    dispatch(fetchAppointments());
    dispatch(fetchPatientDiagnoses({ patientId: patientId } as any));
    dispatch(fetchDocuments({ patientId: patientId }));
    dispatch(fetchDocumentTemplates({}));
    dispatch(fetchLocations());
    // Lade Dekurs-Einträge für Foto-Galerie
    dispatch(fetchDekursEntries({ patientId, limit: 1000 }));
  }, [dispatch, patientId]);

  // Lade Ambulanzbefunde für den Patienten
  React.useEffect(() => {
    if (!patientId) return;
    
    const loadAmbulanzbefunde = async () => {
      setLoadingAmbulanzbefunde(true);
      try {
        const response = await apiRequest.get(`/ambulanzbefunde?patientId=${patientId}&limit=100`);
        if (response.success && response.data) {
          const responseData = response.data as any;
          let ambefunde: any[] = [];
          
          if (Array.isArray(responseData)) {
            ambefunde = responseData;
          } else if (responseData.data && Array.isArray(responseData.data)) {
            ambefunde = responseData.data;
          }
          
          setAmbulanzbefunde(ambefunde);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Ambulanzbefunde:', error);
        setAmbulanzbefunde([]);
      } finally {
        setLoadingAmbulanzbefunde(false);
      }
    };
    
    loadAmbulanzbefunde();
  }, [patientId]);

  // Lade XDS-Dokumente für den Patienten von allen berechtigten Standorten
  React.useEffect(() => {
    if (!patientId || !locations || locations.length === 0) return;
    
    const loadXdsDocuments = async () => {
      setLoadingXdsDocuments(true);
      try {
        // Finde alle Standorte mit aktivierter XDS Registry
        const xdsEnabledLocations = locations.filter((loc: Location) => loc.xdsRegistry?.enabled === true);
        
        if (xdsEnabledLocations.length === 0) {
          setXdsDocuments([]);
          setLoadingXdsDocuments(false);
          return;
        }

        // Lade XDS-Dokumente von allen berechtigten Standorten parallel
        const documentPromises = xdsEnabledLocations.map(async (location: Location) => {
          try {
            // Baue Query-String direkt in die URL ein
            const params = new URLSearchParams({
              patientId: patientId,
              limit: '50',
              page: '1'
            });
            const response = await apiRequest.get(`/xds/${location._id}/query?${params}`);
            
            if (response.success && response.data) {
              const responseData = response.data as any;
              let docs: any[] = [];
              
              if (Array.isArray(responseData)) {
                docs = responseData;
              } else if (responseData.data && Array.isArray(responseData.data)) {
                docs = responseData.data;
              }
              
              // Füge Location-Info zu jedem Dokument hinzu
              return docs.map((doc: any) => ({
                ...doc,
                locationId: location._id,
                locationName: location.name,
                isXdsDocument: true
              }));
            }
            return [];
          } catch (error) {
            console.error(`Fehler beim Laden der XDS-Dokumente für Standort ${location.name}:`, error);
            return [];
          }
        });

        const allXdsDocs = await Promise.all(documentPromises);
        const flattened = allXdsDocs.flat();
        
        // Sortiere nach Erstellungsdatum (neueste zuerst)
        flattened.sort((a, b) => {
          const dateA = new Date(a.creationTime || a.createdAt || 0).getTime();
          const dateB = new Date(b.creationTime || b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        setXdsDocuments(flattened);
      } catch (error) {
        console.error('Fehler beim Laden der XDS-Dokumente:', error);
        setXdsDocuments([]);
      } finally {
        setLoadingXdsDocuments(false);
      }
    };

    loadXdsDocuments();
  }, [patientId, locations]);

  // Format dateOfBirth for HTML date input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Handler für Stammdaten-Bearbeitung
  const handleEditStammdaten = () => {
    if (!patient) return;
    
    setEditData({
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: formatDateForInput(patient.dateOfBirth),
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      socialSecurityNumber: patient.socialSecurityNumber,
      insuranceProvider: patient.insuranceProvider,
      address: patient.address,
      status: patient.status,
      emergencyContact: patient.emergencyContact,
      primaryCarePhysician: patient.primaryCarePhysician,
      referralSource: patient.referralSource,
      referralDoctor: patient.referralDoctor,
      visitReason: patient.visitReason
    });
    setEditDialogOpen(true);
  };

  const handleEditDataChange = (field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      address: {
        street: '',
        city: '',
        zipCode: '',
        country: 'Österreich',
        ...(prev.address || {}),
        [field]: value
      }
    }));
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      emergencyContact: {
        name: '',
        phone: '',
        relationship: '',
        ...(prev.emergencyContact || {}),
        [field]: value
      }
    }));
  };

  const handlePrimaryCarePhysicianChange = (field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      primaryCarePhysician: {
        name: '',
        location: '',
        phone: '',
        ...(prev.primaryCarePhysician || {}),
        [field]: value
      }
    }));
  };

  const handleSaveStammdaten = async () => {
    if (!patient || !editData) return;
    
    try {
      const patientId = patient._id || patient.id;
      if (!patientId) {
        throw new Error('Patient ID nicht gefunden');
      }

      await dispatch(updatePatient({ id: patientId, patientData: editData })).unwrap();
      
      setSnackbar({
        open: true,
        message: 'Stammdaten erfolgreich aktualisiert!',
        severity: 'success'
      });
      
      setEditDialogOpen(false);
      // Patientenliste neu laden
      dispatch(fetchPatients(1));
    } catch (error: any) {
      console.error('Fehler beim Aktualisieren der Stammdaten:', error);
      setSnackbar({
        open: true,
        message: `Fehler beim Aktualisieren: ${error.message || 'Unbekannter Fehler'}`,
        severity: 'error'
      });
    }
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditData({});
  };

  // Handler für Stammdaten-Validierung (QR-Code)
  const handleValidateStammdaten = async () => {
    if (!patient) return;
    
    try {
      // QR-Code für Validierung generieren
      const validationData = {
        patientId: patient._id || patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        // Stammdaten
        email: patient.email,
        phone: patient.phone,
        address: patient.address,
        insuranceProvider: patient.insuranceProvider,
        socialSecurityNumber: patient.socialSecurityNumber,
        // Medizinische Daten
        bloodType: patient.bloodType,
        height: patient.height,
        weight: patient.weight,
        bmi: patient.bmi,
        allergies: patient.allergies || [],
        currentMedications: patient.currentMedications || [],
        medicalHistory: patient.medicalHistory || [],
        vaccinations: patient.vaccinations || [],
        medicalNotes: patient.medicalNotes,
        // Schwangerschaft (nur bei Frauen)
        isPregnant: patient.gender === 'f' ? (patient.isPregnant || false) : false,
        pregnancyWeek: patient.gender === 'f' ? (patient.pregnancyWeek || null) : null
      };
      
      // QR-Code URL generieren - vereinfachte Daten für bessere Lesbarkeit
      const simplifiedData = {
        patientId: patient._id || patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender
      };
      
      const qrCodeUrl = `http://192.168.178.163:3000/validate.html?data=${encodeURIComponent(JSON.stringify(simplifiedData))}`;
      setValidationQrCode(qrCodeUrl);
      setValidationDialogOpen(true);
      
    } catch (error) {
      console.error('Fehler beim Generieren des Validierungs-QR-Codes:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Generieren des QR-Codes',
        severity: 'error'
      });
    }
  };

  // Handler für e-card-Validierung
  const handleECardValidation = () => {
    setEcardValidationOpen(true);
  };

  // Automatische e-card-Abfrage beim Öffnen der Stammdaten
  React.useEffect(() => {
    if (activeTab === 4 && patient && patientId) {
      // Prüfe ob e-card validiert werden sollte
      const shouldValidate = 
        patient.insuranceProvider && 
        patient.insuranceProvider !== 'Privatversicherung' && 
        patient.insuranceProvider !== 'Selbstzahler' &&
        patient.socialSecurityNumber &&
        (!patient.ecard?.cardNumber || 
         !patient.ecard?.validationStatus || 
         patient.ecard.validationStatus !== 'valid' ||
         (patient.ecard.validUntil && new Date(patient.ecard.validUntil) < new Date()));

      if (shouldValidate && !autoValidatedEcard) {
        // Zeige Hinweis, dass automatische Validierung durchgeführt wurde
        // (Die Validierung wird bereits im Backend beim Speichern durchgeführt)
        setAutoValidatedEcard(true);
      }
    }
  }, [activeTab, patient, patientId, autoValidatedEcard]);

  const handleCloseValidation = () => {
    setValidationDialogOpen(false);
    setValidationQrCode('');
  };

  // Handler für Hinweis-Toggle
  const handleToggleHint = async () => {
    if (!patient) return;
    
    try {
      const updatedPatient = {
        ...patient,
        hasHint: !patient.hasHint,
        hintText: patient.hasHint ? '' : patient.hintText || ''
      };
      
      await dispatch(updatePatient({ 
        id: (patient._id || patient.id)!, 
        patientData: updatedPatient 
      }));
      
      setSnackbar({
        open: true,
        message: updatedPatient.hasHint ? 'Hinweis wurde aktiviert' : 'Hinweis wurde deaktiviert',
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Hinweises:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Aktualisieren des Hinweises',
        severity: 'error'
      });
    }
  };

  // Handler für medizinische Daten-Bearbeitung
  const handleEditMedicalData = () => {
    if (!patient) return;
    
    setMedicalData({
      bloodType: patient.bloodType,
      height: patient.height,
      weight: patient.weight,
      bmi: patient.bmi,
      allergies: patient.allergies || [],
      currentMedications: patient.currentMedications || [],
      preExistingConditions: patient.preExistingConditions || [],
      medicalHistory: patient.medicalHistory || [],
      vaccinations: patient.vaccinations || [],
      notes: patient.notes,
      // Schwangerschaft und Stillen (nur bei Frauen)
      isPregnant: patient.gender === 'f' || patient.gender === 'w' ? (patient.isPregnant || false) : false,
      pregnancyWeek: patient.gender === 'f' || patient.gender === 'w' ? (patient.pregnancyWeek || undefined) : undefined,
      isBreastfeeding: patient.gender === 'f' || patient.gender === 'w' ? (patient.isBreastfeeding || false) : false,
      // Medizinische Implantate und Geräte
      hasPacemaker: patient.hasPacemaker || false,
      hasDefibrillator: patient.hasDefibrillator || false,
      implants: patient.implants || [],
      // Raucherstatus
      smokingStatus: patient.smokingStatus || 'non-smoker',
      cigarettesPerDay: patient.cigarettesPerDay || undefined,
      yearsOfSmoking: patient.yearsOfSmoking || undefined,
      quitSmokingDate: patient.quitSmokingDate || undefined
    });
    setMedicalDialogOpen(true);
  };

  const handleMedicalDataChange = (field: string, value: any) => {
    setMedicalData(prev => {
      let processedValue = value;
      
      // Für numerische Felder: String zu Number konvertieren
      if (field === 'height' || field === 'weight' || field === 'bmi' || field === 'pregnancyWeek') {
        if (value === '' || value === null || value === undefined) {
          processedValue = field === 'pregnancyWeek' ? undefined : '';
        } else {
          const numValue = Number(value);
          processedValue = isNaN(numValue) ? value : numValue;
        }
      }
      
      // Für Boolean-Felder: String zu Boolean konvertieren
      if (field === 'isPregnant' || field === 'isBreastfeeding' || field === 'hasPacemaker' || field === 'hasDefibrillator') {
        processedValue = value === 'true' || value === true;
      }
      
      // Für Datums-Felder: String zu Date konvertieren
      if (field === 'quitSmokingDate') {
        processedValue = value ? new Date(value).toISOString().split('T')[0] : undefined;
      }
      
      return {
        ...prev,
        [field]: processedValue
      };
    });
  };

  const handleAddArrayItem = (field: string, value: string) => {
    if (!value.trim()) return;
    
    if (field === 'allergies') {
      // Für Allergien: Objekt mit required fields erstellen
      setMedicalData(prev => ({
        ...prev,
        [field]: [...(prev[field as keyof Patient] as any[] || []), {
          type: 'other',
          description: value.trim(),
          severity: 'moderate',
          reaction: ''
        }]
      }));
    } else if (field === 'currentMedications') {
      // Für Medikamente: Objekt mit Standardwerten erstellen
      setMedicalData(prev => ({
        ...prev,
        [field]: [...(prev[field as keyof Patient] as any[] || []), {
          name: value.trim(),
          dosage: 'Nicht angegeben',
          frequency: 'Nicht angegeben',
          startDate: '',
          prescribedBy: ''
        }]
      }));
    } else {
      // Für andere Felder: einfache Strings
      setMedicalData(prev => ({
        ...prev,
        [field]: [...(prev[field as keyof Patient] as string[] || []), value.trim()]
      }));
    }
  };

  const handleRemoveArrayItem = (field: string, index: number) => {
    setMedicalData(prev => ({
      ...prev,
      [field]: (prev[field as keyof Patient] as any[] || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddVaccination = () => {
    setMedicalData(prev => ({
      ...prev,
      vaccinations: [...(prev.vaccinations || []), { 
        name: '', 
        date: new Date().toISOString().split('T')[0], // Heutiges Datum als Standard
        nextDue: '',
        notes: ''
      }]
    }));
  };

  const handleVaccinationChange = (index: number, field: string, value: string) => {
    setMedicalData(prev => ({
      ...prev,
      vaccinations: (prev.vaccinations || []).map((v, i) => 
        i === index ? { ...v, [field]: value } : v
      )
    }));
  };

  const handleRemoveVaccination = (index: number) => {
    setMedicalData(prev => ({
      ...prev,
      vaccinations: (prev.vaccinations || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddImplant = () => {
    setMedicalData(prev => ({
      ...prev,
      implants: [...(prev.implants || []), { 
        type: '', 
        location: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      }]
    }));
  };

  const handleImplantChange = (index: number, field: string, value: string) => {
    setMedicalData(prev => ({
      ...prev,
      implants: (prev.implants || []).map((implant, i) => 
        i === index ? { ...implant, [field]: value } : implant
      )
    }));
  };

  const handleRemoveImplant = (index: number) => {
    setMedicalData(prev => ({
      ...prev,
      implants: (prev.implants || []).filter((_, i) => i !== index)
    }));
  };

  const handleSaveMedicalData = async () => {
    if (!patient) return;
    
    try {
      const patientId = patient._id || patient.id;
      if (!patientId) {
        throw new Error('Patient ID nicht gefunden');
      }

      // BMI berechnen falls Gewicht und Größe vorhanden
      let updatedMedicalData = { ...medicalData };
      if (medicalData.height && medicalData.weight && 
          medicalData.height.toString().trim() !== '' && 
          medicalData.weight.toString().trim() !== '') {
        const heightInM = Number(medicalData.height) / 100;
        const weightInKg = Number(medicalData.weight);
        if (heightInM > 0 && weightInKg > 0) {
          updatedMedicalData.bmi = Number((weightInKg / (heightInM * heightInM)).toFixed(1));
        }
      }

      // Leere Impfungen herausfiltern (nur Impfungen mit Name und Datum behalten)
      if (updatedMedicalData.vaccinations) {
        updatedMedicalData.vaccinations = updatedMedicalData.vaccinations.filter(vaccination => 
          vaccination && 
          typeof vaccination === 'object' && 
          vaccination.name && 
          vaccination.name.trim() !== '' && 
          vaccination.date
        );
      }

      // Leere Allergien herausfiltern
      if (updatedMedicalData.allergies) {
        updatedMedicalData.allergies = updatedMedicalData.allergies.filter(allergy => 
          allergy && 
          (typeof allergy === 'string' ? allergy.trim() !== '' : allergy.description && allergy.description.trim() !== '')
        );
      }

      // Leere Medikamente herausfiltern
      if (updatedMedicalData.currentMedications) {
        updatedMedicalData.currentMedications = updatedMedicalData.currentMedications.filter(medication => 
          medication && 
          (typeof medication === 'string' ? medication.trim() !== '' : medication.name && medication.name.trim() !== '')
        );
      }

      // Leere Vorerkrankungen herausfiltern
      if (updatedMedicalData.preExistingConditions) {
        updatedMedicalData.preExistingConditions = updatedMedicalData.preExistingConditions.filter(condition => 
          condition && condition.trim() !== ''
        );
      }

      // Leere medizinische Vorgeschichte herausfiltern
      if (updatedMedicalData.medicalHistory) {
        updatedMedicalData.medicalHistory = updatedMedicalData.medicalHistory.filter(history => 
          history && history.trim() !== ''
        );
      }

      await dispatch(updatePatient({ id: patientId, patientData: updatedMedicalData })).unwrap();
      
      setSnackbar({
        open: true,
        message: 'Medizinische Daten erfolgreich aktualisiert!',
        severity: 'success'
      });
      
      setMedicalDialogOpen(false);
      // Patientenliste neu laden
      dispatch(fetchPatients(1));
    } catch (error: any) {
      console.error('Fehler beim Aktualisieren der medizinischen Daten:', error);
      setSnackbar({
        open: true,
        message: `Fehler beim Aktualisieren: ${error.message || 'Unbekannter Fehler'}`,
        severity: 'error'
      });
    }
  };

  const handleCancelMedicalEdit = () => {
    setMedicalDialogOpen(false);
    setMedicalData({});
  };

  // Handler für Foto-Upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!patient || !patientId || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    if (!file) return;

    // Validierung: Nur Bilder
    if (!file.type.startsWith('image/')) {
      setSnackbar({
        open: true,
        message: 'Nur Bilddateien sind erlaubt',
        severity: 'error'
      });
      return;
    }

    // Validierung: Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: 'Datei ist zu groß (max. 5MB)',
        severity: 'error'
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_BASE_URL}/patients-extended/${patientId}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setSnackbar({
          open: true,
          message: 'Foto erfolgreich hochgeladen',
          severity: 'success'
        });
        // Patientenliste neu laden, um das Foto zu aktualisieren
        await dispatch(fetchPatients(1));
        // Lade auch die Patientendaten direkt neu, falls der Patient nicht in der ersten Seite ist
        if (patientId) {
          try {
            const patientResponse: any = await apiRequest.get(`/patients-extended/${patientId}`);
            if (patientResponse.success && patientResponse.data) {
              // API gibt zurück: { success: true, data: patient }
              const updatedPatient = patientResponse.data.data || patientResponse.data;
              console.log('Aktualisierter Patient nach Foto-Upload:', updatedPatient);
              // Aktualisiere den Patienten in der Liste
              dispatch(updatePatient({ id: patientId, patientData: updatedPatient }));
            }
          } catch (err) {
            console.error('Fehler beim Neuladen der Patientendaten:', err);
          }
        }
      } else {
        setSnackbar({
          open: true,
          message: result.message || 'Fehler beim Hochladen des Fotos',
          severity: 'error'
        });
      }
    } catch (error: any) {
      console.error('Fehler beim Hochladen des Fotos:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Fehler beim Hochladen des Fotos',
        severity: 'error'
      });
    } finally {
      setUploadingPhoto(false);
      // Input zurücksetzen
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Handler für Foto-Löschen
  const handleDeletePhoto = async () => {
    if (!patient || !patientId) return;

    if (!window.confirm('Möchten Sie das Foto wirklich löschen?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_BASE_URL}/patients-extended/${patientId}/photo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setSnackbar({
          open: true,
          message: 'Foto erfolgreich gelöscht',
          severity: 'success'
        });
        // Patientenliste neu laden, um das Foto zu entfernen
        await dispatch(fetchPatients(1));
        // Lade auch die Patientendaten direkt neu, falls der Patient nicht in der ersten Seite ist
        if (patientId) {
          try {
            const patientResponse: any = await apiRequest.get(`/patients-extended/${patientId}`);
            if (patientResponse.success && patientResponse.data) {
              // API gibt zurück: { success: true, data: patient }
              const updatedPatient = patientResponse.data.data || patientResponse.data;
              console.log('Aktualisierter Patient nach Foto-Löschen:', updatedPatient);
              // Aktualisiere den Patienten in der Liste
              dispatch(updatePatient({ id: patientId, patientData: updatedPatient }));
            }
          } catch (err) {
            console.error('Fehler beim Neuladen der Patientendaten:', err);
          }
        }
      } else {
        setSnackbar({
          open: true,
          message: result.message || 'Fehler beim Löschen des Fotos',
          severity: 'error'
        });
      }
    } catch (error: any) {
      console.error('Fehler beim Löschen des Fotos:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Fehler beim Löschen des Fotos',
        severity: 'error'
      });
    }
  };

  // BMI automatisch berechnen wenn sich Größe oder Gewicht ändern
  React.useEffect(() => {
    if (medicalData.height && medicalData.weight && 
        medicalData.height.toString().trim() !== '' && 
        medicalData.weight.toString().trim() !== '') {
      const heightInM = Number(medicalData.height) / 100;
      const weightInKg = Number(medicalData.weight);
      if (heightInM > 0 && weightInKg > 0) {
        const calculatedBMI = Number((weightInKg / (heightInM * heightInM)).toFixed(1));
        setMedicalData(prev => ({
          ...prev,
          bmi: calculatedBMI
        }));
      }
    }
  }, [medicalData.height, medicalData.weight]);

  const patientAppointments = React.useMemo(() => {
    const apps = appointments?.data || appointments || [];
    return (apps as Appointment[]).filter(a => {
      // Handle both cases: patient as object with _id or patient as string ID
      let appointmentPatientId: string | undefined;
      if (typeof a.patient === 'string') {
        appointmentPatientId = a.patient;
      } else if (a.patient && typeof a.patient === 'object') {
        appointmentPatientId = (a.patient as any)._id;
      }
      return appointmentPatientId === patientId;
    }).slice().sort((a,b)=>new Date(b.startTime).getTime()-new Date(a.startTime).getTime()).slice(0,8);
  }, [appointments, patientId]);

  // Trenne Ambulanzbefunde nach Status
  const inArbeitAmbulanzbefunde = React.useMemo(() => {
    return ambulanzbefunde.filter((amb: any) => 
      amb.status === 'draft' || amb.status === 'validated'
    ).sort((a: any, b: any) => 
      new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
  }, [ambulanzbefunde]);

  // Prüfe ob ein XDS-Dokument von der eigenen Organisation ist
  const isOwnOrganizationDocument = React.useCallback((doc: any, locations: Location[]) => {
    if (!doc.locationId || !locations || locations.length === 0) return false;
    
    // Finde den Standort des Dokuments
    const docLocation = locations.find((loc: Location) => 
      loc._id === doc.locationId || (loc as any).id === doc.locationId
    );
    
    if (!docLocation || !docLocation.xdsRegistry?.enabled) return false;
    
    // Prüfe ob das Dokument von diesem Standort erstellt wurde (source = 'internal')
    // oder ob die HomeCommunityID übereinstimmt
    const isInternal = doc.source === 'internal';
    const homeCommunityId = docLocation.xdsRegistry?.homeCommunityId;
    const matchesHomeCommunityId = homeCommunityId && doc.homeCommunityId === homeCommunityId;
    
    return isInternal || matchesHomeCommunityId;
  }, []);

  // Freigegebene Ambulanzbefunde (finalized/exported) von eigener Organisation
  const freigegebeneAmbulanzbefunde = React.useMemo(() => {
    if (!ambulanzbefunde || ambulanzbefunde.length === 0) return [];
    if (!locations || locations.length === 0) return [];
    
    return ambulanzbefunde.filter((amb: any) => {
      // Status prüfen
      if (amb.status !== 'finalized' && amb.status !== 'exported') return false;
      
      // Prüfe ob von eigener Organisation - locationId kann String oder Object sein
      if (!amb.locationId) return false;
      
      const ambLocationId = typeof amb.locationId === 'string' 
        ? amb.locationId 
        : (amb.locationId as any)?._id || (amb.locationId as any)?.id || amb.locationId?.toString();
      
      if (!ambLocationId) return false;
      
      const ambLocation = locations.find((loc: Location) => {
        const locId = loc._id?.toString() || (loc as any).id?.toString();
        return locId === ambLocationId.toString();
      });
      
      return !!ambLocation; // Von eigenem Standort
    }).sort((a: any, b: any) => 
      new Date(b.finalizedAt || b.updatedAt || b.createdAt).getTime() - 
      new Date(a.finalizedAt || a.updatedAt || a.createdAt).getTime()
    );
  }, [ambulanzbefunde, locations]);

  const patientDocuments = React.useMemo(() => {
    const docs = Array.isArray(documents) ? documents : (documents?.data || []);
    console.log('PatientOrganizer: Processing documents for patient', patientId, ':', docs);
    const filtered = (docs as PatientDocument[]).filter(d => d.patient?.id === patientId);
    console.log('PatientOrganizer: Filtered documents for patient', patientId, ':', filtered);
    
    // Nur freigegebene XDS-Dokumente von eigener Organisation
    const finalizedXdsDocs = xdsDocuments.filter((doc: any) => {
      if (doc.availabilityStatus !== 'Approved') return false;
      return isOwnOrganizationDocument(doc, locations || []);
    });
    
    // Kombiniere freigegebene Ambulanzbefunde mit anderen freigegebenen Dokumenten
    const combinedDocs: any[] = [
      ...filtered.map((doc: PatientDocument) => ({
        ...doc,
        isXdsDocument: false,
        isAmbulanzbefund: false,
        sortDate: new Date((doc.createdAt || doc.updatedAt) as string).getTime()
      })),
      ...finalizedXdsDocs.map((doc: any) => ({
        ...doc,
        isXdsDocument: true,
        isAmbulanzbefund: false,
        sortDate: new Date(doc.creationTime || doc.createdAt || 0).getTime()
      })),
      ...freigegebeneAmbulanzbefunde.map((amb: any) => ({
        ...amb,
        title: `Ambulanzbefund - ${amb.documentNumber}`,
        type: 'ambulanzbefund',
        isXdsDocument: false,
        isAmbulanzbefund: true,
        sortDate: new Date(amb.finalizedAt || amb.updatedAt || amb.createdAt).getTime(),
        createdAt: amb.finalizedAt || amb.updatedAt || amb.createdAt
      }))
    ];
    
    // Sortiere alle Dokumente nach Datum (neueste zuerst) und nimm die ersten 8
    return combinedDocs
      .sort((a, b) => b.sortDate - a.sortDate)
      .slice(0, 8);
  }, [documents, patientId, xdsDocuments, freigegebeneAmbulanzbefunde, locations, isOwnOrganizationDocument]);

  const patientDx = React.useMemo(() => {
    const dx = patientDiagnoses?.data || patientDiagnoses || [];
    return (dx as PatientDiagnosis[]).slice().sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,8);
  }, [patientDiagnoses]);

  const isLoading = patientsLoading || appointmentsLoading || diagnosesLoading || documentsLoading;

  // Handler für Template-Menü
  const handleTemplateMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTemplateMenuAnchor(event.currentTarget);
  };

  const handleTemplateMenuClose = () => {
    setTemplateMenuAnchor(null);
  };

  // Handler für manuellen Export eines Ambulanzbefunds
  const handleExportAmbulanzbefund = async (ambefundId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Verhindere dass der ListItemButton auch ausgelöst wird
    }

    try {
      setLoadingAmbulanzbefunde(true);
      const response = await apiRequest.post<{ 
        success: boolean; 
        message: string;
        data: any;
        xdsDocumentEntryId?: string;
        alreadyExported?: boolean;
      }>(`/ambulanzbefunde/${ambefundId}/export`);

      const responseData = (response.data as any)?.data || response.data;
      if (response.success) {
        if (responseData?.alreadyExported || (response.data as any)?.alreadyExported) {
          setSnackbar({
            open: true,
            message: 'Ambulanzbefund wurde bereits exportiert',
            severity: 'info'
          });
        } else {
          setSnackbar({
            open: true,
            message: responseData?.message || (response.data as any)?.message || 'Ambulanzbefund erfolgreich ins XDS Repository exportiert',
            severity: 'success'
          });
          // Aktualisiere die Ambulanzbefunde-Liste
          const ambResponse = await apiRequest.get(`/ambulanzbefunde?patientId=${patientId}&limit=100`);
          if (ambResponse.success && ambResponse.data) {
            const ambData = (ambResponse.data as any)?.data || ambResponse.data;
            if (Array.isArray(ambData)) {
              setAmbulanzbefunde(ambData);
            }
          }
          // Aktualisiere auch XDS Dokumente
          if (locations && locations.length > 0) {
            const location = locations.find((loc: Location) => {
              const locId = loc._id?.toString() || (loc as any).id?.toString();
              // Finde die Location des exportierten Dokuments
              return true; // Lade für alle Locations
            });
            if (location) {
              const params = new URLSearchParams({
                patientId: patientId || '',
                limit: '50',
                page: '1'
              });
              try {
                const xdsResponse = await apiRequest.get(`/xds/${location._id}/query?${params}`);
                if (xdsResponse.success && xdsResponse.data) {
                  const xdsData = (xdsResponse.data as any)?.data || xdsResponse.data;
                  if (Array.isArray(xdsData)) {
                    setXdsDocuments(xdsData);
                  }
                }
              } catch (xdsError) {
                console.error('Fehler beim Aktualisieren der XDS Dokumente:', xdsError);
              }
            }
          }
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Fehler beim Exportieren';
      setSnackbar({
        open: true,
        message: `Fehler beim Exportieren: ${errorMessage}`,
        severity: 'error'
      });
      console.error('Export-Fehler:', error);
    } finally {
      setLoadingAmbulanzbefunde(false);
    }
  };

  // Handler für Kategorie-Expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Statische Dokumenttypen (ersetzt die gelöschte medicalLetterMapper)
  const AVAILABLE_LETTER_TYPES = [
    { type: 'attest', name: 'Arbeitsunfähigkeitsbescheinigung', category: 'Bescheinigungen', importance: 5 },
    { type: 'referral', name: 'Überweisung', category: 'Überweisungen', importance: 4 },
    { type: 'prescription', name: 'Rezept', category: 'Rezepte', importance: 3 },
    { type: 'lab_request', name: 'Laboranforderung', category: 'Labor', importance: 4 },
    { type: 'discharge', name: 'Entlassungsbericht', category: 'Berichte', importance: 5 },
    { type: 'consultation', name: 'Konsultationsbericht', category: 'Berichte', importance: 4 },
    { type: 'follow_up', name: 'Nachsorgebericht', category: 'Berichte', importance: 3 },
    { type: 'emergency', name: 'Notfallbericht', category: 'Notfall', importance: 5 },
    { type: 'vaccination', name: 'Impfpass', category: 'Impfungen', importance: 3 },
    { type: 'medical_history', name: 'Anamnese', category: 'Anamnese', importance: 4 }
  ];

  // Gruppiere Dokumenttypen nach Kategorien
  const groupedLetterTypes = AVAILABLE_LETTER_TYPES.reduce((acc: any, letterType: any) => {
    if (!acc[letterType.category]) {
      acc[letterType.category] = [];
    }
    acc[letterType.category].push(letterType);
    return acc;
  }, {} as Record<string, any[]>);

  // Debug-Log für die Gruppierung (entfernt für Produktion)
  // console.log('AVAILABLE_LETTER_TYPES:', AVAILABLE_LETTER_TYPES);
  // console.log('groupedLetterTypes:', groupedLetterTypes);

  // Gruppiere echte Templates aus der Datenbank nach Kategorien
  const groupedTemplates = React.useMemo(() => {
    const grouped: Record<string, any[]> = {};
    const templates = documentTemplates?.templates || documentTemplates || [];
    templates.forEach((template: any) => {
      if (!grouped[template.category]) {
        grouped[template.category] = [];
      }
      grouped[template.category].push(template);
    });
    return grouped;
  }, [documentTemplates]);

  // Kategorie-Icons
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'core': return <MedicalServices />;
      case 'prescription': return <Medication />;
      case 'patient': return <Person />;
      case 'admin': return <AdminPanelSettings />;
      case 'elga': return <LocalHospital />;
      default: return <Description />;
    }
  };

  // Kategorie-Labels
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'core': return 'Kern-Dokumente';
      case 'prescription': return 'Verordnungen & Formulare';
      case 'patient': return 'Patientenbezogene Berichte';
      case 'admin': return 'Administrative Schreiben';
      case 'elga': return 'ELGA-Dokumente';
      default: return category;
    }
  };

  // Handler für Dokument aus Vorlage erstellen
  const handleCreateFromTemplate = async (letterType: string) => {
    if (!patient || !user) return;
    
    setIsCreatingDocument(true);
    handleTemplateMenuClose();

    try {
      // Finde den korrekten Namen für den letterType
      const letterTypeData = AVAILABLE_LETTER_TYPES.find(lt => lt.type === letterType);
      const documentTitle = letterTypeData ? letterTypeData.name : `Neues ${letterType}`;
      
      // Erstelle Dokumentdaten direkt (ersetzt createMedicalLetterFromTemplate)
      const documentData = {
        type: 'sonstiges' as const, // Verwende gültigen Document-Typ
        title: documentTitle,
        content: {
          text: `${documentTitle} für ${patient.firstName} ${patient.lastName}`,
          html: `<h1>${documentTitle}</h1><p>Patient: ${patient.firstName} ${patient.lastName}</p><p>Datum: ${new Date().toLocaleDateString('de-DE')}</p>`
        },
        patient: {
          id: patient._id || patient.id || '',
          name: `${patient.firstName} ${patient.lastName}`,
          dateOfBirth: patient.dateOfBirth || '',
          socialSecurityNumber: patient.socialSecurityNumber
        },
        doctor: {
          id: user._id || user.id || '',
          name: user.name || `${user.firstName} ${user.lastName}`,
          title: user.title,
          specialization: user.specialization
        },
        status: 'draft' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dispatch(createDocument(documentData));
      
      // Dokumente neu laden
      dispatch(fetchDocuments({ patientId: patientId }));
      
      // Zur Dokumentenliste navigieren
      navigate('/documents');
    } catch (error) {
      console.error('Fehler beim Erstellen des Dokuments:', error);
    } finally {
      setIsCreatingDocument(false);
    }
  };

  // Handler für Dokument aus echten Template erstellen
  const handleCreateFromRealTemplate = async (template: any) => {
    console.log('handleCreateFromRealTemplate called with template:', template);
    console.log('Patient:', patient);
    console.log('User:', user);
    
    if (!patient || !user) {
      console.log('Missing patient or user, returning early');
      return;
    }
    
    setIsCreatingDocument(true);
    handleTemplateMenuClose();

    try {
      console.log('Starting document creation...');
      
      // Platzhalter ersetzen
      let content = template.content || template.text || '';
      console.log('Template content:', content);
      
      const placeholders = {
        '{{patient.name}}': patient.firstName,
        '{{patient.lastName}}': patient.lastName,
        '{{patient.birthDate}}': patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('de-DE') : '',
        '{{patient.address}}': patient.address || '',
        '{{doctor.name}}': user.firstName ? `${user.firstName} ${user.lastName}` : 'Dr. med.',
        '{{clinic.name}}': 'Ordinationssoftware Praxis',
        '{{date}}': new Date().toLocaleDateString('de-DE'),
        '{{time}}': new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      };

      console.log('Placeholders:', placeholders);

      Object.entries(placeholders).forEach(([placeholder, value]) => {
        content = content.replace(new RegExp(placeholder, 'g'), value);
      });

      const documentData = {
        title: template.name,
        type: template.category as any,
        patient: {
          id: patient._id || patient.id || '',
          name: `${patient.firstName} ${patient.lastName}`,
          dateOfBirth: patient.dateOfBirth || '',
          socialSecurityNumber: patient.socialSecurityNumber
        },
        doctor: {
          id: user._id || user.id || '',
          name: user.firstName ? `${user.firstName} ${user.lastName}` : 'Dr. med.',
          title: user.title || 'Dr.',
          specialization: user.specialization
        },
        content: {
          text: content,
          html: content,
          template: template._id || template.id,
          variables: {}
        },
        status: 'draft' as const,
        templateId: template._id || template.id
      };

      console.log('Document data to create:', documentData);

      const result = await dispatch(createDocument(documentData));
      console.log('Document creation result:', result);

      // Dokumente neu laden
      console.log('Refreshing documents...');
      dispatch(fetchDocuments({ patientId: patient._id || patient.id }));
      
      console.log('Document creation completed successfully');
      
    } catch (error) {
      console.error('Fehler beim Erstellen des Dokuments:', error);
      console.error('Error details:', error);
    } finally {
      setIsCreatingDocument(false);
    }
  };

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      {/* Floating Action Button für Sidebar */}
      <Fab
        color="primary"
        aria-label="Patienten-Workspace"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
        onClick={() => setSidebarOpen(true)}
      >
        <Timeline />
      </Fab>

      {/* Patient Sidebar */}
      <PatientSidebar
        patient={patient || null}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={(path) => {
          navigate(path);
          setSidebarOpen(false);
        }}
      />

      <Box sx={{ p: 2 }}>
        {/* Kompakter Header */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1, minWidth: 200 }}>
              {/* Patientenfoto */}
              {patient && (
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={(() => {
                      if (!patient.photo?.filename) return undefined;
                      const photoUrl = `http://localhost:5001/uploads/patient-photos/${patient.photo.filename}?t=${patient.photo.uploadedAt ? new Date(patient.photo.uploadedAt).getTime() : Date.now()}`;
                      console.log('Patientenfoto URL:', photoUrl, 'Patient photo data:', patient.photo);
                      return photoUrl;
                    })()}
                    sx={{
                      width: 80,
                      height: 80,
                      border: '3px solid',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      bgcolor: 'rgba(255, 255, 255, 0.2)'
                    }}
                    onError={(e) => {
                      console.error('Fehler beim Laden des Patientenfotos:', e);
                      // Setze src auf undefined, um den Fallback zu zeigen
                      (e.target as HTMLImageElement).src = '';
                    }}
                  >
                    {!patient.photo?.filename && <Person sx={{ fontSize: 40 }} />}
                  </Avatar>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    ref={(input) => setPhotoInputRef(input)}
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                  <Box sx={{ position: 'absolute', bottom: -8, right: -8 }}>
                    <Tooltip title={patient.photo?.filename ? "Foto ändern" : "Foto hinzufügen"}>
                      <IconButton
                        size="small"
                        onClick={() => photoInputRef?.click()}
                        disabled={uploadingPhoto}
                        sx={{
                          bgcolor: 'rgba(255, 255, 255, 0.9)',
                          color: 'primary.main',
                          '&:hover': {
                            bgcolor: 'white'
                          }
                        }}
                      >
                        {uploadingPhoto ? <CircularProgress size={20} /> : <CameraAlt fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {patient.photo?.filename && (
                    <Tooltip title="Foto löschen">
                      <IconButton
                        size="small"
                        onClick={handleDeletePhoto}
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          bgcolor: 'error.main',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'error.dark'
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              )}
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="h5" fontWeight="bold">
                  {patient ? `${patient.firstName} ${patient.lastName}` : 'Patienten-Organizer'}
                </Typography>
                {patient && (
                  <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2">
                      {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('de-DE') : '—'} • 
                      {patient.socialSecurityNumber ? ` SVNR: ${patient.socialSecurityNumber}` : ''} • 
                      {patient.gender || '—'}
                    </Typography>
                    {patient.status && (
                      <Chip 
                        label={patient.status} 
                        size="small" 
                        sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'inherit' }}
                      />
                    )}
                    {patient.hasHint && (
                      <Chip 
                        icon={<Warning />}
                        label="Hinweis" 
                        size="small" 
                        color="warning"
                        onClick={() => setHintDetailsDialogOpen(true)}
                        sx={{ 
                          bgcolor: 'rgba(255, 193, 7, 0.3)', 
                          color: 'inherit',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'rgba(255, 193, 7, 0.5)'
                          }
                        }}
                      />
                    )}
                  </Box>
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Tooltip title="Patienten-Workspace öffnen">
                <IconButton 
                  onClick={() => setSidebarOpen(true)}
                  sx={{ color: 'inherit' }}
                  size="large"
                >
                  <MenuIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        {/* Quick Actions */}
        <Paper sx={{ p: 1.5, mb: 2 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<Assignment />}
              onClick={() => {
                setSelectedDekursEntry(null);
                setDekursDialogOpen(true);
              }}
              disabled={!patient}
              sx={{
                bgcolor: '#FFF9C4',
                color: 'text.primary',
                '&:hover': {
                  bgcolor: '#FFEB3B'
                }
              }}
            >
              Dekurs
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Description />}
              onClick={handleTemplateMenuOpen}
              disabled={!patient || isCreatingDocument}
            >
              Dokument
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Schedule />}
              onClick={() => navigate('/appointments')}
              disabled={!patient}
            >
              Termin
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Edit />}
              onClick={handleEditStammdaten}
              disabled={!patient}
            >
              Bearbeiten
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<QrCode />}
              onClick={handleValidateStammdaten}
              disabled={!patient}
            >
              Validieren
            </Button>
          </Stack>
        </Paper>

        {/* Tab Navigation */}
        <Paper sx={{ mb: 2 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Übersicht" icon={<Info />} iconPosition="start" />
            <Tab label="Dekurs" icon={<Assignment />} iconPosition="start" />
            <Tab label="Laborwerte" icon={<Science />} iconPosition="start" />
            <Tab label="DICOM" icon={<Image />} iconPosition="start" />
            <Tab label="Stammdaten" icon={<AccountCircle />} iconPosition="start" />
            <Tab label="Medizinisch" icon={<MedicalServices />} iconPosition="start" />
            <Tab label="Termine & Besuche" icon={<CalendarToday />} iconPosition="start" />
            <Tab label="Dokumente" icon={<Description />} iconPosition="start" />
            <Tab label="Fotos" icon={<PhotoCamera />} iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <TabPanel value={activeTab} index={0}>
          {/* Übersicht Tab */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Zusammenfassung</Typography>
                  {patient ? (
                    <Box>
                      <Typography variant="body2"><strong>Name:</strong> {patient.firstName} {patient.lastName}</Typography>
                      <Typography variant="body2"><strong>Geburtsdatum:</strong> {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('de-DE') : '—'}</Typography>
                      <Typography variant="body2"><strong>SVNR:</strong> {patient.socialSecurityNumber || '—'}</Typography>
                      <Typography variant="body2"><strong>Status:</strong> {patient.status || '—'}</Typography>
                      {patient.hasHint && (
                        <Chip 
                          icon={<Warning />}
                          label="Hinweis vorhanden" 
                          size="small" 
                          color="warning"
                          onClick={() => setHintDetailsDialogOpen(true)}
                          sx={{ 
                            mt: 1,
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'warning.dark',
                              color: 'warning.contrastText'
                            }
                          }}
                        />
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Patient nicht gefunden</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Kontakt</Typography>
                  {patient ? (
                    <Box>
                      <Typography variant="body2"><strong>Telefon:</strong> {patient.phone || '—'}</Typography>
                      <Typography variant="body2"><strong>E-Mail:</strong> {patient.email || '—'}</Typography>
                      <Typography variant="body2"><strong>Adresse:</strong> {patient.address ? `${patient.address.street}, ${patient.address.zipCode} ${patient.address.city}` : '—'}</Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Patient nicht gefunden</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12 }}>
              {patientId && (
                <PatientVisitHistory patientId={patientId} limit={5} />
              )}
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {/* Dekurs Tab */}
          {patientsLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : !patientId ? (
            <Alert severity="warning">
              Keine Patient-ID gefunden. Bitte wählen Sie einen Patienten aus.
            </Alert>
          ) : !patient ? (
            <Alert severity="error">
              Patient nicht gefunden. Bitte versuchen Sie es erneut.
            </Alert>
          ) : (
            <Stack spacing={2}>
              {/* Schnelleingabe */}
              <DekursQuickEntry
                patientId={patientId}
                compact={false}
                onSave={() => {
                  // Lade Dekurs-Historie neu
                  setSnackbar({
                    open: true,
                    message: 'Dekurs erfolgreich erstellt',
                    severity: 'success'
                  });
                }}
              />
              {/* Historie */}
              <DekursHistory
                patientId={patientId}
                onEntrySelect={(entry) => {
                  setSelectedDekursEntry(entry);
                  setDekursDialogOpen(true);
                }}
              />
            </Stack>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {/* Laborwerte Tab */}
          {patientId ? (
            <Paper sx={{ p: 2 }}>
              <LaborResults patientId={patientId} />
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Kein Patient ausgewählt
              </Typography>
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {/* DICOM Tab */}
          {patientId ? (
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">DICOM-Studien</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setDicomUploadOpen(true)}
                >
                  DICOM hochladen
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <DicomStudiesList patientId={patientId} />
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Kein Patient ausgewählt
              </Typography>
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          {/* Stammdaten Tab */}
          {patient ? (
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Stammdaten</Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Edit />}
                    onClick={handleEditStammdaten}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<QrCode />}
                    onClick={handleValidateStammdaten}
                  >
                    QR-Validierung
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CreditCard />}
                    onClick={handleECardValidation}
                  >
                    e-card validieren
                  </Button>
                </Stack>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {/* GINA-Box Status */}
              <Box sx={{ mb: 2 }}>
                <GinaBoxStatus
                  onPatientFound={(patient) => {
                    setGinaBoxPatientFound(patient);
                    setGinaBoxDialogOpen(true);
                    // Navigiere zum Patienten, wenn gefunden
                    if (patient._id) {
                      navigate(`/patients/${patient._id}?tab=stammdaten`);
                    }
                  }}
                  onPatientNotFound={() => {
                    setSnackbar({
                      open: true,
                      message: 'Kein Patient mit dieser e-card gefunden. Möchten Sie einen neuen Patienten anlegen?',
                      severity: 'info'
                    });
                  }}
                />
              </Box>
              
              {/* Hinweis für automatische e-card-Validierung */}
              {autoValidatedEcard && patient?.ecard?.validationStatus === 'valid' && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAutoValidatedEcard(false)}>
                  e-card wurde automatisch validiert beim {patient.ecard.lastValidated ? new Date(patient.ecard.lastValidated).toLocaleDateString('de-DE') : 'Speichern'}
                  {patient.ecard.validUntil && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                      Gültig bis: {new Date(patient.ecard.validUntil).toLocaleDateString('de-DE')}
                    </Typography>
                  )}
                </Alert>
              )}

              {/* e-card Status anzeigen */}
              {patient.ecard && (
                <Box sx={{ mb: 2 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <CreditCard />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            e-card Status
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                            <Chip
                              label={patient.ecard.validationStatus === 'valid' ? 'Gültig' : 
                                     patient.ecard.validationStatus === 'invalid' ? 'Ungültig' :
                                     patient.ecard.validationStatus === 'expired' ? 'Abgelaufen' : 'Nicht geprüft'}
                              color={patient.ecard.validationStatus === 'valid' ? 'success' : 
                                     patient.ecard.validationStatus === 'invalid' ? 'error' :
                                     patient.ecard.validationStatus === 'expired' ? 'warning' : 'default'}
                              size="small"
                            />
                            {patient.ecard.cardNumber && (
                              <Typography variant="caption" color="text.secondary">
                                {patient.ecard.cardNumber.slice(0, 4)}...{patient.ecard.cardNumber.slice(-4)}
                              </Typography>
                            )}
                          </Stack>
                          {patient.ecard.lastValidated && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                              Letzte Validierung: {new Date(patient.ecard.lastValidated).toLocaleDateString('de-DE')}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              )}

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Persönliche Daten</Typography>
                  <Typography variant="body2"><strong>Name:</strong> {patient.firstName} {patient.lastName}</Typography>
                  <Typography variant="body2"><strong>Geburtsdatum:</strong> {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('de-DE') : '—'}</Typography>
                  <Typography variant="body2"><strong>Geschlecht:</strong> {patient.gender === 'm' ? 'Männlich' : patient.gender === 'f' || patient.gender === 'w' ? 'Weiblich' : '—'}</Typography>
                  <Typography variant="body2"><strong>SVNR:</strong> {patient.socialSecurityNumber || '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Kontaktdaten</Typography>
                  <Typography variant="body2"><strong>Telefon:</strong> {patient.phone || '—'}</Typography>
                  <Typography variant="body2"><strong>E-Mail:</strong> {patient.email || '—'}</Typography>
                  <Typography variant="body2"><strong>Adresse:</strong> {patient.address ? `${patient.address.street || ''}, ${patient.address.zipCode || ''} ${patient.address.city || ''}`.trim() : '—'}</Typography>
                </Grid>
                {patient.emergencyContact && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Notfallkontakt</Typography>
                    <Typography variant="body2"><strong>Name:</strong> {patient.emergencyContact.name || '—'}</Typography>
                    <Typography variant="body2"><strong>Telefon:</strong> {patient.emergencyContact.phone || '—'}</Typography>
                  </Grid>
                )}
                {patient.primaryCarePhysician && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Hausarzt</Typography>
                    <Typography variant="body2"><strong>Name:</strong> {patient.primaryCarePhysician.name || '—'}</Typography>
                    <Typography variant="body2"><strong>Telefon:</strong> {patient.primaryCarePhysician.phone || '—'}</Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Kein Patient ausgewählt
              </Typography>
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          {/* Medizinisch Tab */}
          {patient ? (
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Medizinische Daten</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Edit />}
                  onClick={handleEditMedicalData}
                >
                  Bearbeiten
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Grunddaten</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Bloodtype color="action" />
                    <Typography variant="body2"><strong>Blutgruppe:</strong> {patient.bloodType || 'Nicht erfasst'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Height color="action" />
                    <Typography variant="body2"><strong>Größe:</strong> {patient.height ? `${patient.height} cm` : 'Nicht erfasst'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <MonitorWeight color="action" />
                    <Typography variant="body2"><strong>Gewicht:</strong> {patient.weight ? `${patient.weight} kg` : 'Nicht erfasst'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Favorite color="action" />
                    <Typography variant="body2"><strong>BMI:</strong> {patient.bmi ? patient.bmi.toFixed(1) : 'Nicht berechnet'}</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  {patient.allergies && patient.allergies.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Allergien</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {patient.allergies.map((allergy, index) => (
                          <Chip
                            key={index}
                            label={typeof allergy === 'string' ? allergy : allergy.description}
                            color="warning"
                            size="small"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {patient.currentMedications && patient.currentMedications.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Aktuelle Medikamente</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {patient.currentMedications.map((medication, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <LocalPharmacy color="primary" />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2">
                                {typeof medication === 'string' ? medication : medication.name}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Grid>
                {patientId && (
                  <Grid size={{ xs: 12 }}>
                    <DiagnosisManager
                      patientId={patientId}
                      allowEdit={true}
                      showPrimaryToggle={true}
                      context="medical"
                    />
                  </Grid>
                )}
              </Grid>
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Kein Patient ausgewählt
              </Typography>
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={6}>
          {/* Termine & Besuche Tab */}
          {patientId ? (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Termine & Besuche</Typography>
              <Divider sx={{ mb: 2 }} />
              <PatientVisitHistory patientId={patientId} limit={20} />
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Kein Patient ausgewählt
              </Typography>
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={7}>
          {/* Dokumente Tab */}
          {patientId ? (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Dokumente</Typography>
              <Divider sx={{ mb: 2 }} />
              {patientDocuments && patientDocuments.length > 0 ? (
                <List>
                  {patientDocuments.slice(0, 20).map((doc, index) => (
                    <ListItemButton
                      key={doc._id || index}
                      onClick={() => {
                        if (doc.type === 'cda' || doc.content?.format === 'cda') {
                          setViewingXdsDocument(doc);
                          setCdaViewerOpen(true);
                        } else {
                          navigate(`/documents/${doc._id || doc.id}`);
                        }
                      }}
                    >
                      <ListItemText
                        primary={doc.title || doc.name || 'Unbenanntes Dokument'}
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('de-DE') : '—'}
                            </Typography>
                            {doc.type && (
                              <Chip label={doc.type} size="small" sx={{ ml: 1 }} />
                            )}
                          </Box>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Keine Dokumente gefunden
                </Typography>
              )}
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Kein Patient ausgewählt
              </Typography>
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={8}>
          {/* Fotos Tab */}
          {patientId ? (
            <PatientPhotoGallery patientId={patientId} />
          ) : (
            <Paper sx={{ p: 2 }}>
              <Alert severity="warning">
                Keine Patient-ID gefunden. Bitte wählen Sie einen Patienten aus.
              </Alert>
            </Paper>
          )}
        </TabPanel>

      {/* Template-Menü mit Kategorien */}
      <Menu
        anchorEl={templateMenuAnchor}
        open={Boolean(templateMenuAnchor)}
        onClose={handleTemplateMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: { maxHeight: '70vh', width: '400px' }
        }}
      >
        {[
          // Echte Templates aus der Datenbank
          ...(Object.keys(groupedTemplates).length > 0 ? [
            <MenuItem 
              key="templates-header"
              sx={{ 
                backgroundColor: 'primary.main',
                color: 'white',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                <Description />
                <Typography variant="subtitle2" fontWeight="bold" sx={{ flexGrow: 1 }}>
                  Eigene Templates
                </Typography>
              </Stack>
            </MenuItem>,
            ...Object.entries(groupedTemplates).flatMap(([category, templates]) => [
              <MenuItem 
                key={`template-${category}-header`}
                onClick={() => toggleCategory(`template-${category}`)}
                sx={{ 
                  backgroundColor: 'grey.100',
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                  {getCategoryIcon(category)}
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ flexGrow: 1 }}>
                    {getCategoryLabel(category)} ({templates.length})
                  </Typography>
                  {expandedCategories.has(`template-${category}`) ? <ExpandLess /> : <ExpandMore />}
                </Stack>
              </MenuItem>,
              ...(expandedCategories.has(`template-${category}`) ? templates.map((template) => (
                <MenuItem 
                  key={template._id || template.id}
                  onClick={() => handleCreateFromRealTemplate(template)}
                  disabled={isCreatingDocument}
                  sx={{ pl: 4 }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                    <Box sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      backgroundColor: 'primary.main'
                    }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {template.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {template.description || 'Keine Beschreibung'}
                      </Typography>
                    </Box>
                  </Stack>
                </MenuItem>
              )) : [])
            ]),
            <Divider key="templates-divider" sx={{ my: 1 }} />
          ] : []),

          // Statische Templates
          <MenuItem 
            key="standard-templates-header"
            sx={{ 
              backgroundColor: 'grey.50',
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
              <Description />
              <Typography variant="subtitle2" fontWeight="bold" sx={{ flexGrow: 1 }}>
                Standard-Templates
              </Typography>
            </Stack>
          </MenuItem>,
          ...Object.entries(groupedLetterTypes).flatMap(([category, letterTypes]) => {
            const typedLetterTypes = letterTypes as any[];
            return [
            <MenuItem 
              key={`standard-${category}-header`}
              onClick={() => toggleCategory(category)}
              sx={{ 
                backgroundColor: 'grey.50',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                {getCategoryIcon(category)}
                <Typography variant="subtitle2" fontWeight="bold" sx={{ flexGrow: 1 }}>
                  {getCategoryLabel(category)}
                </Typography>
                {expandedCategories.has(category) ? <ExpandLess /> : <ExpandMore />}
              </Stack>
            </MenuItem>,
            ...(expandedCategories.has(category) ? typedLetterTypes
              .sort((a, b) => b.importance - a.importance)
              .map((letterType) => (
              <MenuItem 
                key={letterType.type}
                onClick={() => handleCreateFromTemplate(letterType.type)}
                disabled={isCreatingDocument}
                sx={{ pl: 4 }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                  <Box sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    backgroundColor: letterType.importance >= 4 ? 'error.main' : 
                                   letterType.importance >= 3 ? 'warning.main' : 'success.main' 
                  }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {letterType.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {letterType.type} - Wichtigkeit: {letterType.importance}
                    </Typography>
                  </Box>
                </Stack>
              </MenuItem>
            )) : [])
            ];
          })
        ]}
      </Menu>

      {/* Stammdaten-Bearbeitungsdialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleCancelEdit}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Stammdaten bearbeiten
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {/* Grunddaten */}
            <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>Grunddaten</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Vorname *"
                value={editData.firstName || ''}
                onChange={(e) => handleEditDataChange('firstName', e.target.value)}
                required
                sx={{ minWidth: 200, flex: 1 }}
              />
              <TextField
                label="Nachname *"
                value={editData.lastName || ''}
                onChange={(e) => handleEditDataChange('lastName', e.target.value)}
                required
                sx={{ minWidth: 200, flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Geburtsdatum *"
                type="date"
                value={editData.dateOfBirth || ''}
                onChange={(e) => handleEditDataChange('dateOfBirth', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                sx={{ minWidth: 200, flex: 1 }}
              />
              <FormControl required sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel>Geschlecht</InputLabel>
                <Select
                  value={editData.gender || ''}
                  onChange={(e) => handleEditDataChange('gender', e.target.value)}
                >
                  <MenuItem value="m">Männlich</MenuItem>
                  <MenuItem value="w">Weiblich</MenuItem>
                  <MenuItem value="d">Divers</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Kontaktdaten */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Kontaktdaten</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Telefonnummer"
                value={editData.phone || ''}
                onChange={(e) => handleEditDataChange('phone', e.target.value)}
                sx={{ minWidth: 200, flex: 1 }}
              />
              <TextField
                label="E-Mail"
                type="email"
                value={editData.email || ''}
                onChange={(e) => handleEditDataChange('email', e.target.value)}
                sx={{ minWidth: 200, flex: 1 }}
              />
            </Box>

            {/* Versicherungsdaten */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Versicherungsdaten</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Sozialversicherungsnummer"
                value={editData.socialSecurityNumber || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  handleEditDataChange('socialSecurityNumber', value);
                }}
                placeholder="1234567890"
                sx={{ minWidth: 200, flex: 1 }}
              />
              <FormControl sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel>Versicherungsanstalt</InputLabel>
                <Select
                  value={editData.insuranceProvider || ''}
                  onChange={(e) => handleEditDataChange('insuranceProvider', e.target.value)}
                >
                  <MenuItem value="ÖGK (Österreichische Gesundheitskasse)">ÖGK (Österreichische Gesundheitskasse)</MenuItem>
                  <MenuItem value="BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)">BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)</MenuItem>
                  <MenuItem value="SVS (Sozialversicherung der Selbständigen)">SVS (Sozialversicherung der Selbständigen)</MenuItem>
                  <MenuItem value="KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)">KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)</MenuItem>
                  <MenuItem value="PVA (Pensionsversicherungsanstalt)">PVA (Pensionsversicherungsanstalt)</MenuItem>
                  <MenuItem value="Privatversicherung">Privatversicherung</MenuItem>
                  <MenuItem value="Selbstzahler">Selbstzahler</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Adressdaten */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Adresse</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Straße und Hausnummer"
                value={editData.address?.street || ''}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                sx={{ minWidth: 300, flex: 2 }}
              />
              <TextField
                label="PLZ"
                value={editData.address?.zipCode || ''}
                onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                sx={{ minWidth: 100, flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Stadt"
                value={editData.address?.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                sx={{ minWidth: 200, flex: 1 }}
              />
              <TextField
                label="Land"
                value={editData.address?.country || 'Österreich'}
                onChange={(e) => handleAddressChange('country', e.target.value)}
                sx={{ minWidth: 200, flex: 1 }}
              />
            </Box>

            {/* Notfallkontakt */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Notfallkontakt</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Name"
                value={editData.emergencyContact?.name || ''}
                onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                sx={{ minWidth: 200, flex: 1 }}
              />
              <TextField
                label="Telefon"
                value={editData.emergencyContact?.phone || ''}
                onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                sx={{ minWidth: 200, flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Verwandtschaft"
                value={editData.emergencyContact?.relationship || ''}
                onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                sx={{ minWidth: 200, flex: 1 }}
              />
            </Box>

            {/* Hausarzt */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Hausarzt</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Name des Hausarztes"
                value={editData.primaryCarePhysician?.name || ''}
                onChange={(e) => handlePrimaryCarePhysicianChange('name', e.target.value)}
                sx={{ minWidth: 200, flex: 1 }}
              />
              <TextField
                label="Ort der Praxis"
                value={editData.primaryCarePhysician?.location || ''}
                onChange={(e) => handlePrimaryCarePhysicianChange('location', e.target.value)}
                sx={{ minWidth: 200, flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Telefon"
                value={editData.primaryCarePhysician?.phone || ''}
                onChange={(e) => handlePrimaryCarePhysicianChange('phone', e.target.value)}
                sx={{ minWidth: 200, flex: 1 }}
              />
            </Box>

            {/* Administrative Daten */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Administrative Daten</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel>Zuweisung durch</InputLabel>
                <Select
                  value={editData.referralSource || ''}
                  onChange={(e) => handleEditDataChange('referralSource', e.target.value)}
                >
                  <MenuItem value="self">Selbstzuweiser</MenuItem>
                  <MenuItem value="physician">Hausarzt</MenuItem>
                  <MenuItem value="hospital">Krankenhaus</MenuItem>
                  <MenuItem value="specialist">Facharzt</MenuItem>
                  <MenuItem value="other">Andere</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Zuweisender Arzt"
                value={editData.referralDoctor || ''}
                onChange={(e) => handleEditDataChange('referralDoctor', e.target.value)}
                sx={{ minWidth: 200, flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Besuchsgrund"
                value={editData.visitReason || ''}
                onChange={(e) => handleEditDataChange('visitReason', e.target.value)}
                multiline
                rows={2}
                sx={{ minWidth: 400, flex: 2 }}
              />
            </Box>

            {/* Status */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Status</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editData.status || ''}
                  onChange={(e) => handleEditDataChange('status', e.target.value)}
                >
                  <MenuItem value="aktiv">Aktiv</MenuItem>
                  <MenuItem value="wartend">Wartend</MenuItem>
                  <MenuItem value="inaktiv">Inaktiv</MenuItem>
                  <MenuItem value="entlassen">Entlassen</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelEdit}
            startIcon={<Cancel />}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleSaveStammdaten}
            variant="contained"
            startIcon={<Save />}
            disabled={!editData.firstName || !editData.lastName || !editData.dateOfBirth}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Medizinische Daten-Bearbeitungsdialog */}
      <Dialog 
        open={medicalDialogOpen} 
        onClose={handleCancelMedicalEdit}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Medizinische Daten bearbeiten
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {/* Grundlegende medizinische Daten */}
            <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>Grundlegende medizinische Daten</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 150, flex: 1 }}>
                <InputLabel>Blutgruppe</InputLabel>
                <Select
                  value={medicalData.bloodType || ''}
                  onChange={(e) => handleMedicalDataChange('bloodType', e.target.value)}
                >
                  <MenuItem value="Unbekannt">Unbekannt</MenuItem>
                  <MenuItem value="A+">A+</MenuItem>
                  <MenuItem value="A-">A-</MenuItem>
                  <MenuItem value="B+">B+</MenuItem>
                  <MenuItem value="B-">B-</MenuItem>
                  <MenuItem value="AB+">AB+</MenuItem>
                  <MenuItem value="AB-">AB-</MenuItem>
                  <MenuItem value="0+">0+</MenuItem>
                  <MenuItem value="0-">0-</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Größe (cm)"
                type="number"
                value={medicalData.height || ''}
                onChange={(e) => handleMedicalDataChange('height', e.target.value)}
                sx={{ minWidth: 120, flex: 1 }}
              />
              <TextField
                label="Gewicht (kg)"
                type="number"
                value={medicalData.weight || ''}
                onChange={(e) => handleMedicalDataChange('weight', e.target.value)}
                sx={{ minWidth: 120, flex: 1 }}
              />
              <TextField
                label="BMI"
                value={medicalData.bmi || ''}
                disabled
                sx={{ minWidth: 100, flex: 1 }}
                helperText="Wird automatisch berechnet"
              />
            </Box>

            {/* Allergien */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Allergien</Typography>
            <Box sx={{ mb: 2 }}>
              {medicalData.allergies?.map((allergy, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                  <Chip
                    label={typeof allergy === 'string' ? allergy : allergy.description}
                    color="warning"
                    size="small"
                    onDelete={() => handleRemoveArrayItem('allergies', index)}
                  />
                </Box>
              ))}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  label="Neue Allergie hinzufügen"
                  size="small"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      handleAddArrayItem('allergies', target.value);
                      target.value = '';
                    }
                  }}
                />
                <Button 
                  size="small" 
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling?.querySelector('input') as HTMLInputElement;
                    if (input) {
                      handleAddArrayItem('allergies', input.value);
                      input.value = '';
                    }
                  }}
                >
                  Hinzufügen
                </Button>
              </Box>
            </Box>

            {/* Medikamente */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Aktuelle Medikamente</Typography>
            <MedicationListInput
              value={Array.isArray(medicalData.currentMedications) ? medicalData.currentMedications : []}
              onChange={(medications) => {
                const converted = convertMedicationsArrayToPatientFormat(medications);
                setMedicalData(prev => ({ ...prev, currentMedications: converted }));
              }}
              label="Medikament hinzufügen"
              helperText="Suchen Sie nach Medikamenten aus dem Katalog"
            />

            {/* Vorerkrankungen */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Vorerkrankungen</Typography>
            <Box sx={{ mb: 2 }}>
              {medicalData.preExistingConditions?.map((condition, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    • {condition}
                  </Typography>
                  <Button 
                    size="small" 
                    color="error"
                    onClick={() => handleRemoveArrayItem('preExistingConditions', index)}
                  >
                    Entfernen
                  </Button>
                </Box>
              ))}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  label="Neue Vorerkrankung hinzufügen"
                  size="small"
                  fullWidth
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      handleAddArrayItem('preExistingConditions', target.value);
                      target.value = '';
                    }
                  }}
                />
                <Button 
                  size="small" 
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling?.querySelector('input') as HTMLInputElement;
                    if (input) {
                      handleAddArrayItem('preExistingConditions', input.value);
                      input.value = '';
                    }
                  }}
                >
                  Hinzufügen
                </Button>
              </Box>
            </Box>

            {/* Medizinische Vorgeschichte */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Medizinische Vorgeschichte</Typography>
            <Box sx={{ mb: 2 }}>
              {medicalData.medicalHistory?.map((history, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    • {history}
                  </Typography>
                  <Button 
                    size="small" 
                    color="error"
                    onClick={() => handleRemoveArrayItem('medicalHistory', index)}
                  >
                    Entfernen
                  </Button>
                </Box>
              ))}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  label="Neue Vorgeschichte hinzufügen"
                  size="small"
                  fullWidth
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      handleAddArrayItem('medicalHistory', target.value);
                      target.value = '';
                    }
                  }}
                />
                <Button 
                  size="small" 
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling?.querySelector('input') as HTMLInputElement;
                    if (input) {
                      handleAddArrayItem('medicalHistory', input.value);
                      input.value = '';
                    }
                  }}
                >
                  Hinzufügen
                </Button>
              </Box>
            </Box>

            {/* Impfungen */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Impfungen</Typography>
            <Box sx={{ mb: 2 }}>
              {medicalData.vaccinations?.map((vaccination, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField
                    label="Impfung"
                    value={vaccination.name}
                    onChange={(e) => handleVaccinationChange(index, 'name', e.target.value)}
                    size="small"
                    sx={{ minWidth: 150, flex: 1 }}
                  />
                  <TextField
                    label="Datum"
                    type="date"
                    value={vaccination.date}
                    onChange={(e) => handleVaccinationChange(index, 'date', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 120 }}
                  />
                  <TextField
                    label="Nächste fällig"
                    type="date"
                    value={vaccination.nextDue}
                    onChange={(e) => handleVaccinationChange(index, 'nextDue', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 120 }}
                  />
                  <Button 
                    size="small" 
                    color="error"
                    onClick={() => handleRemoveVaccination(index)}
                  >
                    Entfernen
                  </Button>
                </Box>
              ))}
              <Button 
                size="small" 
                startIcon={<Add />}
                onClick={handleAddVaccination}
                sx={{ mb: 2 }}
              >
                Impfung hinzufügen
              </Button>
            </Box>

            {/* Schwangerschaft und Stillen (nur bei Frauen) */}
            {patient && (patient.gender === 'f' || patient.gender === 'w') && (
              <>
                <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Schwangerschaft & Stillen</Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                  <FormControl sx={{ minWidth: 150, flex: 1 }}>
                    <InputLabel>Schwanger</InputLabel>
                    <Select
                      value={medicalData.isPregnant ? 'true' : 'false'}
                      onChange={(e) => handleMedicalDataChange('isPregnant', e.target.value)}
                    >
                      <MenuItem value="false">Nein</MenuItem>
                      <MenuItem value="true">Ja</MenuItem>
                    </Select>
                  </FormControl>
                  {medicalData.isPregnant && (
                    <TextField
                      label="Schwangerschaftswoche"
                      type="number"
                      value={medicalData.pregnancyWeek || ''}
                      onChange={(e) => handleMedicalDataChange('pregnancyWeek', e.target.value)}
                      sx={{ minWidth: 180, flex: 1 }}
                      inputProps={{ min: 1, max: 42 }}
                      helperText="1-42 Wochen"
                    />
                  )}
                  <FormControl sx={{ minWidth: 150, flex: 1 }}>
                    <InputLabel>Stillen</InputLabel>
                    <Select
                      value={medicalData.isBreastfeeding ? 'true' : 'false'}
                      onChange={(e) => handleMedicalDataChange('isBreastfeeding', e.target.value)}
                    >
                      <MenuItem value="false">Nein</MenuItem>
                      <MenuItem value="true">Ja</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </>
            )}

            {/* Medizinische Implantate und Geräte */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Implantate & Geräte</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 150, flex: 1 }}>
                <InputLabel>Schrittmacher</InputLabel>
                <Select
                  value={medicalData.hasPacemaker ? 'true' : 'false'}
                  onChange={(e) => handleMedicalDataChange('hasPacemaker', e.target.value)}
                >
                  <MenuItem value="false">Nein</MenuItem>
                  <MenuItem value="true">Ja</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 150, flex: 1 }}>
                <InputLabel>Defibrillator</InputLabel>
                <Select
                  value={medicalData.hasDefibrillator ? 'true' : 'false'}
                  onChange={(e) => handleMedicalDataChange('hasDefibrillator', e.target.value)}
                >
                  <MenuItem value="false">Nein</MenuItem>
                  <MenuItem value="true">Ja</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Implantate */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Implantate</Typography>
            <Box sx={{ mb: 2 }}>
              {medicalData.implants?.map((implant, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <TextField
                    label="Implantat-Typ"
                    value={implant.type}
                    onChange={(e) => handleImplantChange(index, 'type', e.target.value)}
                    size="small"
                    sx={{ minWidth: 150, flex: 1 }}
                  />
                  <TextField
                    label="Ort"
                    value={implant.location || ''}
                    onChange={(e) => handleImplantChange(index, 'location', e.target.value)}
                    size="small"
                    sx={{ minWidth: 120, flex: 1 }}
                  />
                  <TextField
                    label="Datum"
                    type="date"
                    value={implant.date || ''}
                    onChange={(e) => handleImplantChange(index, 'date', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 120 }}
                  />
                  <TextField
                    label="Notizen"
                    value={implant.notes || ''}
                    onChange={(e) => handleImplantChange(index, 'notes', e.target.value)}
                    size="small"
                    sx={{ minWidth: 120, flex: 1 }}
                  />
                  <Button 
                    size="small" 
                    color="error"
                    onClick={() => handleRemoveImplant(index)}
                  >
                    Entfernen
                  </Button>
                </Box>
              ))}
              <Button 
                size="small" 
                startIcon={<Add />}
                onClick={handleAddImplant}
                sx={{ mb: 2 }}
              >
                Implantat hinzufügen
              </Button>
            </Box>

            {/* Raucherstatus */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Raucherstatus</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 200, flex: 1 }}>
                <InputLabel>Raucherstatus</InputLabel>
                <Select
                  value={medicalData.smokingStatus || 'non-smoker'}
                  onChange={(e) => handleMedicalDataChange('smokingStatus', e.target.value)}
                >
                  <MenuItem value="non-smoker">Nichtraucher</MenuItem>
                  <MenuItem value="former-smoker">Ehemaliger Raucher</MenuItem>
                  <MenuItem value="current-smoker">Raucher</MenuItem>
                </Select>
              </FormControl>
              {medicalData.smokingStatus === 'current-smoker' && (
                <TextField
                  label="Zigaretten pro Tag"
                  type="number"
                  value={medicalData.cigarettesPerDay || ''}
                  onChange={(e) => handleMedicalDataChange('cigarettesPerDay', e.target.value)}
                  sx={{ minWidth: 150, flex: 1 }}
                  inputProps={{ min: 0, max: 100 }}
                />
              )}
              {medicalData.smokingStatus !== 'non-smoker' && (
                <TextField
                  label="Rauchejahre"
                  type="number"
                  value={medicalData.yearsOfSmoking || ''}
                  onChange={(e) => handleMedicalDataChange('yearsOfSmoking', e.target.value)}
                  sx={{ minWidth: 120, flex: 1 }}
                  inputProps={{ min: 0, max: 100 }}
                />
              )}
              {medicalData.smokingStatus === 'former-smoker' && (
                <TextField
                  label="Aufgehört am"
                  type="date"
                  value={medicalData.quitSmokingDate || ''}
                  onChange={(e) => handleMedicalDataChange('quitSmokingDate', e.target.value)}
                  sx={{ minWidth: 150, flex: 1 }}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            </Box>

            {/* Medizinische Notizen */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Medizinische Notizen</Typography>
            <TextField
              label="Notizen"
              multiline
              rows={4}
              value={medicalData.notes || ''}
              onChange={(e) => handleMedicalDataChange('notes', e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelMedicalEdit}
            startIcon={<Cancel />}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleSaveMedicalData}
            variant="contained"
            startIcon={<Save />}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Validierungs-Dialog */}
      <Dialog 
        open={validationDialogOpen} 
        onClose={handleCloseValidation}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <QrCode color="secondary" />
            Stammdaten validieren
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h6" gutterBottom>
              QR-Code für Stammdaten-Validierung
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Scannen Sie diesen QR-Code mit einem Tablet oder Smartphone, um die Patientenstammdaten zu validieren.
            </Typography>
            
            {validationQrCode && (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                mb: 3,
                p: 2,
                border: '2px dashed #ccc',
                borderRadius: 2,
                backgroundColor: '#f9f9f9'
              }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(validationQrCode)}&ecc=M&margin=10&format=png`}
                  alt="Validierungs QR-Code"
                  style={{ maxWidth: '300px', height: 'auto' }}
                />
              </Box>
            )}
            
            <Typography variant="body2" color="text.secondary">
              <strong>Patient:</strong> {patient?.firstName} {patient?.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Geburtsdatum:</strong> {patient?.dateOfBirth}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseValidation}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dekurs-Dialog */}
      {patientId && (
        <DekursDialog
          open={dekursDialogOpen}
          onClose={() => {
            setDekursDialogOpen(false);
            setSelectedDekursEntry(null);
          }}
          patientId={patientId}
          initialEntry={selectedDekursEntry}
          onSave={(entry) => {
            // Aktualisiere selectedDekursEntry damit Fotos hinzugefügt werden können
            setSelectedDekursEntry(entry);
            // Aktualisiere die Dekurs-Historie
            setSnackbar({
              open: true,
              message: entry.status === 'finalized' 
                ? 'Dekurs erfolgreich finalisiert' 
                : 'Dekurs erfolgreich gespeichert',
              severity: 'success'
            });
          }}
        />
      )}

      {/* DICOM Upload Dialog */}
      {patientId && (
        <DicomUpload
          open={dicomUploadOpen}
          onClose={() => setDicomUploadOpen(false)}
          patientId={patientId}
          onUploadSuccess={() => {
            setDicomUploadOpen(false);
            setSnackbar({
              open: true,
              message: 'DICOM-Dateien erfolgreich hochgeladen',
              severity: 'success'
            });
          }}
        />
      )}

      {/* Snackbar für Benachrichtigungen */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* CDA Document Viewer für XDS-Dokumente */}
      {viewingXdsDocument && viewingXdsDocument.locationId && (
        <CDADocumentViewer
          open={cdaViewerOpen}
          onClose={() => {
            setCdaViewerOpen(false);
            setViewingXdsDocument(null);
          }}
          locationId={viewingXdsDocument.locationId}
          documentId={viewingXdsDocument._id || viewingXdsDocument.entryUUID}
          documentTitle={viewingXdsDocument.title || 'CDA Dokument'}
        />
      )}

      {/* e-card Validierungs-Dialog */}
      {patientId && (
        <Dialog
          open={ecardValidationOpen}
          onClose={() => setEcardValidationOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <CreditCard />
              <Typography variant="h6">e-card Validierung</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <ECardValidation
                patientId={patientId}
                ecardNumber={patient?.ecard?.cardNumber}
                onValidationComplete={(result) => {
                  if (result?.success) {
                    setSnackbar({
                      open: true,
                      message: 'e-card erfolgreich validiert',
                      severity: 'success'
                    });
                    // Lade Patientendaten neu
                    dispatch(fetchPatients(1));
                    setEcardValidationOpen(false);
                  }
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEcardValidationOpen(false)}>
              Schließen
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* GINA-Box Patient gefunden Dialog */}
      <Dialog
        open={ginaBoxDialogOpen}
        onClose={() => {
          setGinaBoxDialogOpen(false);
          setGinaBoxPatientFound(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CreditCard color="success" />
            <Typography variant="h6">Patient gefunden</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {ginaBoxPatientFound && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Name:</strong> {ginaBoxPatientFound.firstName} {ginaBoxPatientFound.lastName}
              </Typography>
              {ginaBoxPatientFound.dateOfBirth && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Geburtsdatum:</strong> {new Date(ginaBoxPatientFound.dateOfBirth).toLocaleDateString('de-DE')}
                </Typography>
              )}
              {ginaBoxPatientFound.socialSecurityNumber && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>SVNR:</strong> {ginaBoxPatientFound.socialSecurityNumber}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setGinaBoxDialogOpen(false);
            setGinaBoxPatientFound(null);
          }}>
            Schließen
          </Button>
          {ginaBoxPatientFound?._id && (
            <Button
              variant="contained"
              onClick={() => {
                navigate(`/patients/${ginaBoxPatientFound._id}?tab=stammdaten`);
                setGinaBoxDialogOpen(false);
                setGinaBoxPatientFound(null);
              }}
            >
              Zum Patienten
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Hinweis-Details Dialog */}
      <Dialog
        open={hintDetailsDialogOpen}
        onClose={() => setHintDetailsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="warning" />
            <Typography variant="h6">
              Hinweis für {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setHintDetailsDialogOpen(false)}
            sx={{ ml: 2 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {patient?.hintText ? (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
              {patient.hintText}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Dieser Patient hat einen Hinweis erhalten, aber es wurde noch kein Hinweistext eingegeben.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHintDetailsDialogOpen(false)}>Schließen</Button>
          {patient && (
            <Button 
              variant="outlined" 
              startIcon={<Edit />}
              onClick={() => {
                setHintDetailsDialogOpen(false);
                // Navigate to hint edit or open edit dialog
                // You can add edit functionality here if needed
              }}
            >
              Bearbeiten
            </Button>
          )}
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
};

export default PatientOrganizer;
