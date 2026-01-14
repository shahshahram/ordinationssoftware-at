import React, { useState, useCallback, useMemo } from 'react';
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
  CircularProgress,
  Badge,
  useTheme,
  useMediaQuery,
  Switch,
  FormControlLabel,
  InputAdornment
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
  Warning,
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
  CreditCard,
  Email,
  Phone,
  BugReport,
  CloudDownload as CloudDownloadIcon,
  Search,
  FilterList,
  Block,
  History,
  ArrowBack,
  List as ListIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPatients, updatePatient, Patient } from '../store/slices/patientSlice';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';
import { differenceInWeeks, addWeeks, parseISO, format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { fetchAppointments, Appointment } from '../store/slices/appointmentSlice';
import { fetchPatientDiagnoses, PatientDiagnosis } from '../store/slices/diagnosisSlice';
import { fetchDocuments, Document as PatientDocument, createDocument } from '../store/slices/documentSlice';
// Removed imports for deleted files
import { fetchDocumentTemplates, fetchStandaloneTemplates, DocumentTemplate } from '../store/slices/documentTemplateSlice';
import { fetchLocations, Location } from '../store/slices/locationSlice';
import { apiRequest } from '../utils/api';
import { validatePhone, getPhoneErrorMessage, validateEmail, getEmailErrorMessage } from '../utils/validation';
import PatientSidebar from '../components/PatientSidebar';
import DiagnosisManager from '../components/DiagnosisManager';
import MedicationManager from '../components/MedicationManager';
import MedicationListInput, { convertMedicationsArrayToPatientFormat } from '../components/MedicationListInput';
import { createMedication, fetchPatientMedications, clearPatientMedications } from '../store/slices/medicationSlice';
import CDADocumentViewer from '../components/CDADocumentViewer';
import PatientVisitHistory from '../components/PatientVisitHistory';
import DekursHistory from '../components/DekursHistory';
import DekursDialog from '../components/DekursDialog';
import DekursQuickEntry from '../components/DekursQuickEntry';
import PatientenbriefDialog from '../components/PatientenbriefDialog';
import StandaloneDocumentDialog from '../components/StandaloneDocumentDialog';
import PatientPhotoGallery from '../components/PatientPhotoGallery';
import LaborResults from '../components/LaborResults';
import DicomUpload from '../components/DicomUpload';
import DicomStudiesList from '../components/DicomStudiesList';
import DicomRetrieveDialog from '../components/DicomRetrieveDialog';
import ECardValidation from '../components/ECardValidation';
import GinaBoxStatus from '../components/GinaBoxStatus';
import PatientEPA from '../components/PatientEPA';
import VitalSignsManager from '../components/VitalSignsManager';
import ErrorBoundary from '../components/ErrorBoundary';
import MedicalDataHistory from '../components/MedicalDataHistory';
import { fetchDekursEntries } from '../store/slices/dekursSlice';
import { fetchVitalSigns } from '../store/slices/vitalSignsSlice';
import { Assignment, Science, Image, AccountCircle, CalendarToday, PhotoCamera, MonitorHeart, Receipt, Article } from '@mui/icons-material';
import api from '../utils/api';
import { Specialization } from '../types/ambulanzbefund';
import PerformanceForm from '../components/PerformanceForm';
import { replacePlaceholders, PlaceholderContext } from '../utils/placeholders';

// TabPanel Komponente
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;
  
  // OPTIMIERT: Nur rendern wenn Tab aktiv ist - verhindert unnötige Re-Renders und verbessert Scroll-Performance
  if (value !== index) {
    return null;
  }
  
  return (
    <div
      role="tabpanel"
      id={`patient-tabpanel-${index}`}
      aria-labelledby={`patient-tab-${index}`}
      {...other}
    >
      <Box sx={{ py: 2 }}>{children}</Box>
    </div>
  );
};

const PatientOrganizer: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const { marginTopValue } = useGlobalNavigationOffset();
  const { patients, loading: patientsLoading } = useAppSelector((s: any) => s.patients);
  const { appointments, loading: appointmentsLoading } = useAppSelector((s: any) => s.appointments);
  const { patientDiagnoses, loading: diagnosesLoading } = useAppSelector((s: any) => s.diagnoses);
  const { documents, loading: documentsLoading } = useAppSelector((s: any) => s.documents);
  const { entries: dekursEntries } = useAppSelector((s: any) => s.dekurs);
  const { vitalSigns } = useAppSelector((s: any) => s.vitalSigns);
  const { locations, currentLocation } = useAppSelector((s: any) => s.locations);
  const { user } = useAppSelector((s: any) => s.auth);
  const { templates: documentTemplates } = useAppSelector((s: any) => s.documentTemplates);
  
  // State für neue Einträge (für Badges)
  const [laborResults, setLaborResults] = useState<any[]>([]);
  const [dicomStudies, setDicomStudies] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  
  // State für XDS-Dokumente
  const [xdsDocuments, setXdsDocuments] = useState<any[]>([]);
  const [loadingXdsDocuments, setLoadingXdsDocuments] = useState(false);
  const [cdaViewerOpen, setCdaViewerOpen] = useState(false);
  const [viewingXdsDocument, setViewingXdsDocument] = useState<any | null>(null);
  
  // State für Ambulanzbefunde
  const [ambulanzbefunde, setAmbulanzbefunde] = useState<any[]>([]);
  const [loadingAmbulanzbefunde, setLoadingAmbulanzbefunde] = useState(false);
  
  // State für MedicalDataHistory (um frühere Schwangerschaften zu prüfen)
  const [medicalDataHistory, setMedicalDataHistory] = useState<any[]>([]);

  // Helper-Funktion: Findet das letzte Erfassungsdatum und den Benutzer für ein medizinisches Datenfeld
  const getFieldRecordedInfo = useCallback((fieldName: string): { date: string | null; user: string | null } => {
    if (!medicalDataHistory || medicalDataHistory.length === 0) {
      return { date: null, user: null };
    }

    // Durch die Historie gehen (bereits nach recordedAt sortiert, neueste zuerst)
    for (const entry of medicalDataHistory) {
      // Prüfe ob das Feld in changedFields vorkommt
      if (entry.changedFields && Array.isArray(entry.changedFields)) {
        const fieldChange = entry.changedFields.find((cf: any) => cf.field === fieldName);
        if (fieldChange) {
          // Feld wurde in diesem Eintrag geändert
          const recordedBy = entry.recordedBy;
          const userName = recordedBy 
            ? `${recordedBy.firstName || ''} ${recordedBy.lastName || ''}`.trim() || recordedBy.email || 'Unbekannt'
            : 'Unbekannt';
          
          return {
            date: entry.recordedAt,
            user: userName
          };
        }
      }

      // Prüfe ob das Feld im Snapshot einen Wert hat (für Felder, die initial erfasst wurden)
      if (entry.snapshot && entry.snapshot[fieldName] !== undefined && entry.snapshot[fieldName] !== null) {
        // Für Array-Felder: Prüfe ob Array nicht leer ist
        if (Array.isArray(entry.snapshot[fieldName])) {
          if (entry.snapshot[fieldName].length > 0) {
            const recordedBy = entry.recordedBy;
            const userName = recordedBy 
              ? `${recordedBy.firstName || ''} ${recordedBy.lastName || ''}`.trim() || recordedBy.email || 'Unbekannt'
              : 'Unbekannt';
            
            return {
              date: entry.recordedAt,
              user: userName
            };
          }
        } else {
          // Für einfache Felder
          const recordedBy = entry.recordedBy;
          const userName = recordedBy 
            ? `${recordedBy.firstName || ''} ${recordedBy.lastName || ''}`.trim() || recordedBy.email || 'Unbekannt'
            : 'Unbekannt';
          
          return {
            date: entry.recordedAt,
            user: userName
          };
        }
      }
    }

    return { date: null, user: null };
  }, [medicalDataHistory]);

  // Theme-Hook für Dark Mode Erkennung
  const currentTheme = useTheme();
  const isDarkMode = currentTheme.palette.mode === 'dark';

  // Helper-Komponente: Zeigt Erfassungsdatum und Benutzer an
  const RecordedInfo: React.FC<{ fieldName: string }> = ({ fieldName }) => {
    const info = getFieldRecordedInfo(fieldName);
    
    if (!info.date) return null;

    const formattedDate = format(new Date(info.date), 'dd.MM.yyyy HH:mm', { locale: de });

    return (
      <Typography 
        variant="caption" 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5, 
          ml: 1, 
          fontStyle: 'italic',
          color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.6)'
        }}
      >
        <CalendarToday sx={{ fontSize: '0.75rem', opacity: 0.8 }} />
        erfasst am {formattedDate} von {info.user}
      </Typography>
    );
  };
  const [hasPreviousPregnancy, setHasPreviousPregnancy] = useState(false);
  const [pregnancyAlertInfo, setPregnancyAlertInfo] = useState<{
    shouldShow: boolean;
    alertType: 'overdue' | 'week40' | 'week42' | 'previous' | null;
    message: string;
    severity: 'warning' | 'info';
    expectedDueDate?: Date;
    currentWeek?: number;
    weeksSinceRecorded?: number;
  } | null>(null);
  
  // State für Tabs - Standard ist Dekurs (Tab 1)
  const [activeTab, setActiveTab] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false); // Flag um Race Conditions zu vermeiden
  
  // State für Dekurs
  const [dekursDialogOpen, setDekursDialogOpen] = useState(false);
  const [selectedDekursEntry, setSelectedDekursEntry] = useState<any>(null);
  
  // State für DICOM
  const [dicomUploadOpen, setDicomUploadOpen] = useState(false);
  const [dicomRetrieveOpen, setDicomRetrieveOpen] = useState(false);

  // State für Leistungsabrechnung
  const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);

  // State für Patienten-/Arztbrief Dialog
  const [letterDialogOpen, setLetterDialogOpen] = useState(false);
  const [patientenbriefDialogOpen, setPatientenbriefDialogOpen] = useState(false);
  const [documentTypeDialogOpen, setDocumentTypeDialogOpen] = useState(false);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [dekursSelectionDialogOpen, setDekursSelectionDialogOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<'patientenbrief' | 'arztbrief' | null>(null);
  const [selectedSource, setSelectedSource] = useState<'leer' | 'dekurs' | null>(null);
  const [selectedDekursForLetter, setSelectedDekursForLetter] = useState<any>(null);

  // Get patientId from URL params or query params
  const patientId = React.useMemo(() => {
    if (id) return id;
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('patientId');
  }, [id, location.search]);

  // Tab-Mapping für zentrale Navigation
  const tabMapping = React.useMemo(() => ({
    'epa': 0,
    'dekurs': 1,
    'medizinisch': 2,
    'diagnosen': 3,
    'vitalwerte': 4,
    'labor': 5,
    'dicom': 6,
    'dokumente': 7,
    'termine': 8,
    'fotos': 9,
    'stammdaten': 10, // Wird als Button angezeigt, nicht als Tab (TabPanel index 10)
    // Legacy-Mappings für Kompatibilität
    'laborwerte': 5, // Legacy - wird zu 'labor'
    'vitalparameter': 4 // Legacy - wird zu 'vitalwerte'
  }), []);

  // Funktion zum Zählen neuer Einträge (heute erstellt)
  const countNewEntries = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const isToday = (date: Date | string | undefined): boolean => {
      if (!date) return false;
      const entryDate = new Date(date);
      return entryDate >= today && entryDate <= todayEnd;
    };

    // Dekurs-Einträge
    const newDekurs = (dekursEntries || []).filter((entry: any) => 
      isToday(entry.createdAt || entry.entryDate)
    ).length;

    // Laborwerte
    const newLabor = (laborResults || []).filter((entry: any) => 
      isToday(entry.createdAt || entry.date)
    ).length;

    // DICOM-Studien
    const newDicom = (dicomStudies || []).filter((entry: any) => 
      isToday(entry.createdAt || entry.studyDate)
    ).length;

    // Dokumente
    const docsArray = Array.isArray(documents) ? documents : (documents?.data || []);
    const newDocuments = docsArray.filter((entry: any) => 
      entry.patientId === patientId && isToday(entry.createdAt || entry.date)
    ).length;

    // Fotos
    const newPhotos = (photos || []).filter((entry: any) => 
      isToday(entry.createdAt || entry.uploadedAt || entry.date)
    ).length;

    // Vitalwerte
    const newVital = (vitalSigns || []).filter((entry: any) => 
      isToday(entry.createdAt || entry.recordedAt)
    ).length;

    return {
      dekurs: newDekurs,
      labor: newLabor,
      dicom: newDicom,
      documents: newDocuments,
      photos: newPhotos,
      vital: newVital
    };
  }, [dekursEntries, laborResults, dicomStudies, documents, photos, vitalSigns, patientId]);

  const tabNames = React.useMemo(() => ['epa', 'dekurs', 'medizinisch', 'diagnosen', 'vitalwerte', 'labor', 'dicom', 'dokumente', 'termine', 'fotos'], []);

  // Zentrale Navigation-Funktion
  const handleTabNavigation = React.useCallback((tabIndex: number, updateUrl: boolean = true) => {
    try {
      // Verhindere mehrfache Navigation
      if (isNavigating) {
        return;
      }

      setIsNavigating(true);
      
      // Setze Tab direkt
      setActiveTab(tabIndex);
      
      // Aktualisiere URL nur wenn gewünscht (verhindert Loop)
      if (updateUrl && patientId) {
        const tabName = tabNames[tabIndex] || 'epa';
        const newPath = `/patients/${patientId}?tab=${tabName}`;
        
        // Verwende replaceState statt navigate, um keine History-Einträge zu erstellen
        // und um Race Conditions zu vermeiden
        window.history.replaceState({}, '', newPath);
      }
      
      // Reset Flag nach kurzer Verzögerung
      setTimeout(() => {
        setIsNavigating(false);
      }, 100);
    } catch (error) {
      console.error('Fehler bei Tab-Navigation:', error);
      setIsNavigating(false);
    }
  }, [isNavigating, patientId, tabNames]);

  // Tab aus URL-Parameter lesen (nur beim initialen Laden oder wenn URL sich ändert)
  React.useEffect(() => {
    // Überspringe, wenn wir gerade navigieren (verhindert Loop)
    if (isNavigating) {
      return;
    }

    try {
      const searchParams = new URLSearchParams(location.search);
      const tabParam = searchParams.get('tab');
      
      if (tabParam) {
        const tabIndex = tabMapping[tabParam as keyof typeof tabMapping];
        if (tabIndex !== undefined) {
          // Setze Tab nur wenn er sich geändert hat (verhindert unnötige Re-Renders)
          setActiveTab((currentTab) => {
            if (currentTab !== tabIndex) {
              return tabIndex;
            }
            return currentTab;
          });
        }
      } else {
        // Wenn kein Tab-Parameter vorhanden, setze auf Dekurs (Tab 1)
        setActiveTab((currentTab) => {
          if (currentTab !== 1) {
            return 1;
          }
          return currentTab;
        });
      }
    } catch (error) {
      console.error('Fehler beim Lesen des Tab-Parameters:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]); // Nur location.search als Dependency - tabMapping ist stabil, isNavigating würde Loop verursachen

  // State für Template-Dialog
  const [templateMenuAnchor, setTemplateMenuAnchor] = useState<null | HTMLElement>(null);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  
  // State für Standalone-Dokumente
  const [standaloneDocumentDialogOpen, setStandaloneDocumentDialogOpen] = useState(false);
  const [selectedStandaloneTemplateId, setSelectedStandaloneTemplateId] = useState<string | null>(null);
  const [documentPreviewDialogOpen, setDocumentPreviewDialogOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<any | null>(null);
  const [standaloneTemplates, setStandaloneTemplates] = useState<DocumentTemplate[]>([]);
  const [loadingStandaloneTemplates, setLoadingStandaloneTemplates] = useState(false);
  const [standaloneTemplateDialogOpen, setStandaloneTemplateDialogOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');
  const [templateFilterCategory, setTemplateFilterCategory] = useState<string>('all');
  const [templateFilterSpecialty, setTemplateFilterSpecialty] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set([
    'Bescheinigungen', 'Überweisungen', 'Rezepte', 'Labor', 'Berichte', 'Notfall', 'Impfungen', 'Anamnese'
  ]));
  
  // State für Patient Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // State für Hinweis-Dialog
  const [hintDetailsDialogOpen, setHintDetailsDialogOpen] = useState(false);
  const [hintEditMode, setHintEditMode] = useState(false);
  const [hintTextEdit, setHintTextEdit] = useState('');
  
  // State für Notizen-Dialog
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesEdit, setNotesEdit] = useState('');
  const [medicalNotesEdit, setMedicalNotesEdit] = useState('');
  const [patientNotes, setPatientNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [noteHistoryDialogOpen, setNoteHistoryDialogOpen] = useState(false);
  const [selectedNoteForHistory, setSelectedNoteForHistory] = useState<any | null>(null);
  const [newNoteType, setNewNoteType] = useState<'general' | 'medical'>('general');
  const [onlineBookingBlockedEdit, setOnlineBookingBlockedEdit] = useState(false);
  
  // State für Stammdaten-Bearbeitung
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<Patient>>({});
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emergencyPhoneError, setEmergencyPhoneError] = useState<string | null>(null);
  const [primaryCarePhoneError, setPrimaryCarePhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  
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
  
  // State für Medikamenten-Manager Dialog
  const [medicationManagerDialogOpen, setMedicationManagerDialogOpen] = useState(false);
  
  // Callback für Medikamenten-Änderungen (stabilisiert mit useCallback)
  const handleMedicationChange = useCallback((medications: any[]) => {
    console.log('Medikamente aktualisiert:', medications.length);
  }, []);
  
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

  // Memoized Notizen-Liste für Performance-Optimierung (nach patient Definition)
  const memoizedNotesList = useMemo(() => patientNotes.map((note: any) => (
    <Card key={note._id || note.id} sx={{ mb: 2, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              label={note.noteType === 'general' ? 'Allgemein' : 'Medizinisch'}
              size="small"
              color={note.noteType === 'medical' ? 'primary' : 'default'}
            />
            {note.isEdited && (
              <Chip
                label={`${note.editCount || note.editHistory?.length || 0}x bearbeitet`}
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
          </Box>
          {editingNote?._id === note._id ? (
            <Box>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={medicalNotesEdit}
                onChange={(e) => setMedicalNotesEdit(e.target.value)}
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Save />}
                  onClick={async () => {
                    try {
                      const response: any = await api.put(`/patient-notes/${note._id}`, {
                        content: medicalNotesEdit.trim()
                      });
                      if (response?.data?.success) {
                        // Lade Notizen neu
                        const notesResponse: any = await api.get(`/patient-notes/${patient?._id || patient?.id}?chronological=true`);
                        if (notesResponse?.data?.success) {
                          setPatientNotes(notesResponse.data.data || []);
                        }
                        // Lade Dekurs-Einträge neu, damit der aktualisierte EPA-Eintrag sofort sichtbar ist
                        const currentPatientId = patient?._id || patient?.id;
                        if (currentPatientId) {
                          dispatch(fetchDekursEntries({ patientId: String(currentPatientId), limit: 1000 }));
                        }
                        setEditingNote(null);
                        setMedicalNotesEdit('');
                        setSnackbar({
                          open: true,
                          message: 'Notiz wurde erfolgreich aktualisiert',
                          severity: 'success'
                        });
                      }
                    } catch (error) {
                      console.error('Fehler beim Aktualisieren der Notiz:', error);
                      setSnackbar({
                        open: true,
                        message: 'Fehler beim Aktualisieren der Notiz',
                        severity: 'error'
                      });
                    }
                  }}
                >
                  Speichern
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setEditingNote(null);
                    setMedicalNotesEdit('');
                  }}
                >
                  Abbrechen
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
              {note.content}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
            <Typography variant="caption">
              Erstellt: {format(new Date(note.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })} 
              {note.createdBy && typeof note.createdBy === 'object' && (
                ` von ${note.createdBy.firstName} ${note.createdBy.lastName}`
              )}
            </Typography>
            {note.lastModifiedBy && note.updatedAt && new Date(note.updatedAt).getTime() !== new Date(note.createdAt).getTime() && (
              <Typography variant="caption" sx={{ color: 'warning.main' }}>
                Bearbeitet: {format(new Date(note.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                {typeof note.lastModifiedBy === 'object' && (
                  ` von ${note.lastModifiedBy.firstName} ${note.lastModifiedBy.lastName}`
                )}
              </Typography>
            )}
          </Box>
          {note.editHistory && note.editHistory.length > 0 && (
            <Button
              size="small"
              startIcon={<History />}
              onClick={() => {
                setSelectedNoteForHistory(note);
                setNoteHistoryDialogOpen(true);
              }}
              sx={{ mt: 1 }}
            >
              Bearbeitungshistorie anzeigen ({note.editHistory.length})
            </Button>
          )}
        </Box>
        {!editingNote && (
          <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
            <IconButton
              size="small"
              onClick={() => {
                setEditingNote(note);
                setMedicalNotesEdit(note.content);
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={async () => {
                if (!window.confirm('Möchten Sie diese Notiz wirklich löschen?')) return;
                try {
                  const response: any = await api.delete(`/patient-notes/${note._id}`);
                  if (response?.data?.success) {
                    // Lade Notizen neu
                    const notesResponse: any = await api.get(`/patient-notes/${patient?._id || patient?.id}?chronological=true`);
                    if (notesResponse?.data?.success) {
                      setPatientNotes(notesResponse.data.data || []);
                    }
                    // Lade Dekurs-Einträge neu, damit der gelöschte EPA-Eintrag entfernt wird
                    const currentPatientId = patient?._id || patient?.id;
                    if (currentPatientId) {
                      dispatch(fetchDekursEntries({ patientId: String(currentPatientId), limit: 1000 }));
                    }
                    setSnackbar({
                      open: true,
                      message: 'Notiz wurde erfolgreich gelöscht',
                      severity: 'success'
                    });
                  }
                } catch (error) {
                  console.error('Fehler beim Löschen der Notiz:', error);
                  setSnackbar({
                    open: true,
                    message: 'Fehler beim Löschen der Notiz',
                    severity: 'error'
                  });
                }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>
    </Card>
  )), [patientNotes, editingNote, medicalNotesEdit, patient]);

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
    
    // WICHTIG: Leere zuerst die Redux Stores, um alte Daten zu entfernen
    // Dies verhindert, dass Daten von vorherigen Patienten angezeigt werden
    dispatch({ type: 'diagnosis/clearPatientDiagnoses' });
    dispatch(clearPatientMedications());
    
    // Daten für den Patienten laden
    dispatch(fetchAppointments());
    dispatch(fetchPatientDiagnoses({ patientId: patientId } as any));
    dispatch(fetchDocuments({ patientId: patientId }));
    dispatch(fetchDocumentTemplates({}));
    dispatch(fetchLocations());
    // Lade Dekurs-Einträge für Foto-Galerie
    dispatch(fetchDekursEntries({ patientId, limit: 1000 }));
    // Lade Vitalwerte für Badges
    dispatch(fetchVitalSigns(patientId));
    
    // Lade Laborwerte, DICOM-Studien und Fotos für Badges
    const loadDataForBadges = async () => {
      try {
        // Laborwerte
        const laborResponse: any = await api.get(`/labor/patient/${patientId}`);
        if (laborResponse?.data?.success && laborResponse?.data?.data) {
          const laborData = Array.isArray(laborResponse.data.data) ? laborResponse.data.data : [];
          setLaborResults(laborData);
        }
      } catch (error) {
          setLaborResults([]);
        }
      
      try {
        // DICOM-Studien
        const dicomResponse: any = await api.get(`/dicom/patient/${patientId}`);
        if (dicomResponse?.data?.success && dicomResponse?.data?.data) {
          const dicomData = Array.isArray(dicomResponse.data.data) ? dicomResponse.data.data : [];
          setDicomStudies(dicomData);
        }
      } catch (error) {
        setDicomStudies([]);
      }
      
      try {
        // Fotos
        const photosResponse: any = await api.get(`/patients-extended/${patientId}/photos`);
        if (photosResponse?.data?.success && photosResponse?.data?.data) {
          const photosData = Array.isArray(photosResponse.data.data) ? photosResponse.data.data : [];
          setPhotos(photosData);
        }
      } catch (error) {
        setPhotos([]);
      }
    };
    
    loadDataForBadges();
    
    // Lade MedicalDataHistory, um frühere Schwangerschaften zu prüfen
    const loadMedicalDataHistory = async () => {
      if (!patientId) return;
      try {
        const response: any = await api.get(`/medical-data-history/patient/${patientId}?limit=100`);
        
        const historyData = response?.data || response;
        const history = historyData?.success ? historyData.data : (Array.isArray(historyData) ? historyData : []);
        setMedicalDataHistory(history);
        
        // Prüfe, ob es frühere Schwangerschaften gibt
        const hadPregnancy = history.some((entry: any) => {
          const hasPregnantInSnapshot = entry.snapshot?.isPregnant === true;
          const hasPregnancyWeekInSnapshot = entry.snapshot?.pregnancyWeek && entry.snapshot.pregnancyWeek > 0;
          const hasPregnancyInChangedFields = entry.changedFields && entry.changedFields.some((field: any) => 
            (field.field === 'isPregnant' && field.oldValue === false && field.newValue === true) ||
            (field.field === 'pregnancyWeek' && field.newValue && field.newValue > 0)
          );
          
          return hasPregnantInSnapshot || hasPregnancyWeekInSnapshot || hasPregnancyInChangedFields;
        });
        
        setHasPreviousPregnancy(hadPregnancy);
      } catch (error) {
        console.error('❌ Fehler beim Laden der MedicalDataHistory:', error);
        setMedicalDataHistory([]);
        setHasPreviousPregnancy(false);
      }
    };
    
    loadMedicalDataHistory();
    
    // Lade Notizen
    const loadNotes = async () => {
      if (!patientId) return;
      setLoadingNotes(true);
      try {
        const response: any = await api.get(`/patient-notes/${patientId}?chronological=true`);
        if (response?.data?.success) {
          setPatientNotes(response.data.data || []);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Notizen:', error);
        setPatientNotes([]);
      } finally {
        setLoadingNotes(false);
      }
    };
    
    loadNotes();
  }, [dispatch, patientId]);

  // Funktion zur Berechnung des Schwangerschafts-Alerts
  const calculatePregnancyAlert = React.useCallback((
    patient: Patient | null,
    history: any[]
  ): {
    shouldShow: boolean;
    alertType: 'overdue' | 'week40' | 'week42' | 'previous' | null;
    message: string;
    severity: 'warning' | 'info';
    expectedDueDate?: Date;
    currentWeek?: number;
    weeksSinceRecorded?: number;
  } | null => {
    if (!patient) return null;

    // 1. Altersprüfung: Kein Alert für Patientinnen ab 50 Jahren
    const calculateAge = (dateOfBirth: string | Date | undefined): number => {
      if (!dateOfBirth) return 0;
      const birthDate = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    const patientAge = calculateAge(patient.dateOfBirth);
    if (patientAge >= 50) {
      return null; // Kein Alert für Patientinnen ab 50 Jahren
    }

    // 2. Prüfung ob Patientin weiblich
    const isFemale = patient.gender === 'w' || patient.gender === 'f';
    if (!isFemale) return null;

    const today = new Date();
    const isPregnant = patient.isPregnant === true;
    const pregnancyWeek = patient.pregnancyWeek;
    const pregnancyDueDate = patient.pregnancyDueDate ? 
      (typeof patient.pregnancyDueDate === 'string' ? parseISO(patient.pregnancyDueDate) : patient.pregnancyDueDate) : 
      null;

    // Szenario 1: Patientin ist aktuell schwanger
    if (isPregnant && pregnancyWeek && pregnancyWeek > 0) {
      // Berechne erwartetes Entbindungsdatum
      let expectedDueDate: Date | null = null;
      
      if (pregnancyDueDate) {
        expectedDueDate = pregnancyDueDate;
      } else if (history.length > 0) {
        // Finde ersten Eintrag mit pregnancyWeek
        const firstPregnancyEntry = history
          .filter((e: any) => e.snapshot?.pregnancyWeek && e.snapshot.pregnancyWeek > 0)
          .sort((a: any, b: any) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())[0];
        
        if (firstPregnancyEntry) {
          const recordedDate = typeof firstPregnancyEntry.recordedAt === 'string' ? 
            parseISO(firstPregnancyEntry.recordedAt) : 
            new Date(firstPregnancyEntry.recordedAt);
          const recordedWeek = firstPregnancyEntry.snapshot?.pregnancyWeek || pregnancyWeek;
          // Berechne erwartetes Entbindungsdatum: Erfassungsdatum + (40 - erfassteWoche) Wochen
          expectedDueDate = addWeeks(recordedDate, 40 - recordedWeek);
        }
      }

      // Prüfe zuerst, ob Entbindungsdatum überschritten ist (auch wenn Woche < 40)
      if (expectedDueDate && today > expectedDueDate) {
        const dueDateStr = format(expectedDueDate, 'dd.MM.yyyy', { locale: de });
        const weeksOverdue = differenceInWeeks(today, expectedDueDate);
        return {
          shouldShow: true,
          alertType: 'overdue',
          message: `Patientin ist in der ${pregnancyWeek}. Schwangerschaftswoche. Erwartetes Entbindungsdatum (${dueDateStr}) ist vor ${weeksOverdue} Woche${weeksOverdue > 1 ? 'n' : ''} überschritten. Bitte Status prüfen.`,
          severity: 'warning',
          currentWeek: pregnancyWeek,
          expectedDueDate: expectedDueDate
        };
      }

      // Alert Typ 1: Schwangerschaftswoche >= 40
      if (pregnancyWeek >= 40) {
        const dueDateStr = expectedDueDate ? format(expectedDueDate, 'dd.MM.yyyy', { locale: de }) : 'unbekannt';

        if (pregnancyWeek > 42) {
          return {
            shouldShow: true,
            alertType: 'week42',
            message: `Patientin ist in der ${pregnancyWeek}. Schwangerschaftswoche. Dies übersteigt die normale Schwangerschaftsdauer von 40-42 Wochen. Bitte Status prüfen.`,
            severity: 'warning',
            currentWeek: pregnancyWeek,
            expectedDueDate: expectedDueDate || undefined
          };
        } else {
          return {
            shouldShow: true,
            alertType: 'week40',
            message: `Patientin ist in der ${pregnancyWeek}. Schwangerschaftswoche. Erwartetes Entbindungsdatum: ${dueDateStr}. Bitte Status prüfen.`,
            severity: 'warning',
            currentWeek: pregnancyWeek,
            expectedDueDate: expectedDueDate || undefined
          };
        }
      }
    }

    // Szenario 2: Patientin war schwanger (isPregnant === false aber pregnancyWeek vorhanden)
    if (!isPregnant && pregnancyWeek && pregnancyWeek > 0) {
      // Finde letzten Eintrag mit pregnancyWeek in der Historie
      const lastPregnancyEntry = history
        .filter((e: any) => 
          (e.snapshot?.pregnancyWeek && e.snapshot.pregnancyWeek > 0) ||
          (e.changedFields && e.changedFields.some((field: any) => 
            field.field === 'pregnancyWeek' && field.newValue && field.newValue > 0
          ))
        )
        .sort((a: any, b: any) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];

      if (lastPregnancyEntry) {
        const recordedDate = typeof lastPregnancyEntry.recordedAt === 'string' ? 
          parseISO(lastPregnancyEntry.recordedAt) : 
          new Date(lastPregnancyEntry.recordedAt);
        const recordedWeek = lastPregnancyEntry.snapshot?.pregnancyWeek || 
          (lastPregnancyEntry.changedFields?.find((f: any) => f.field === 'pregnancyWeek')?.newValue) ||
          pregnancyWeek;
        
        const weeksSinceRecorded = differenceInWeeks(today, recordedDate);
        const expectedDueDate = addWeeks(recordedDate, 40 - recordedWeek);
        const isOverdue = today > expectedDueDate;

        if (isOverdue || weeksSinceRecorded >= 40) {
          return {
            shouldShow: true,
            alertType: 'previous',
            message: `Patientin war zuvor schwanger (Schwangerschaftswoche: ${recordedWeek}, erfasst am ${format(recordedDate, 'dd.MM.yyyy', { locale: de })}). Erwartetes Entbindungsdatum (${format(expectedDueDate, 'dd.MM.yyyy', { locale: de })}) ist ${isOverdue ? 'überschritten' : 'erreicht'}. Bitte aktuellen Status prüfen.`,
            severity: 'warning',
            weeksSinceRecorded,
            expectedDueDate
          };
        } else {
          return {
            shouldShow: true,
            alertType: 'previous',
            message: `Patientin war zuvor schwanger (Schwangerschaftswoche: ${recordedWeek}). Bitte aktuellen Status prüfen.`,
            severity: 'info',
            weeksSinceRecorded,
            expectedDueDate
          };
        }
      } else {
        // Keine Historie, aber pregnancyWeek vorhanden
        return {
          shouldShow: true,
          alertType: 'previous',
          message: `Patientin war zuvor schwanger (Schwangerschaftswoche: ${pregnancyWeek}). Bitte aktuellen Status prüfen.`,
          severity: 'info',
          currentWeek: pregnancyWeek
        };
      }
    }

    return null;
  }, []);

  // Berechne Schwangerschafts-Alert wenn Patient oder History sich ändert
  React.useEffect(() => {
    if (patient && medicalDataHistory) {
      const alertInfo = calculatePregnancyAlert(patient, medicalDataHistory);
      setPregnancyAlertInfo(alertInfo);
    }
  }, [patient, medicalDataHistory, calculatePregnancyAlert]);

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

  // Format date for HTML date input (YYYY-MM-DD)
  // Handles string, Date object, null, undefined - always returns string (empty or formatted)
  const formatDateForInput = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue) return '';
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
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
      insuranceNumber: patient.insuranceNumber,
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
    // Telefonnummer-Validierung
    if (field === 'phone') {
      if (value && !validatePhone(value)) {
        setPhoneError(getPhoneErrorMessage());
      } else {
        setPhoneError(null);
      }
    }
    
    // E-Mail-Validierung
    if (field === 'email') {
      if (value && !validateEmail(value)) {
        setEmailError(getEmailErrorMessage());
      } else {
        setEmailError(null);
      }
    }
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
    // Telefonnummer-Validierung für Notfallkontakt
    if (field === 'phone') {
      if (value && !validatePhone(value)) {
        setEmergencyPhoneError(getPhoneErrorMessage());
      } else {
        setEmergencyPhoneError(null);
      }
    }
    
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
    // Telefonnummer-Validierung für Hausarzt
    if (field === 'phone') {
      if (value && !validatePhone(value)) {
        setPrimaryCarePhoneError(getPhoneErrorMessage());
      } else {
        setPrimaryCarePhoneError(null);
      }
    }
    
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

      const updatedPatient = await dispatch(updatePatient({ id: patientId, patientData: editData })).unwrap();
      
      setSnackbar({
        open: true,
        message: 'Stammdaten erfolgreich aktualisiert!',
        severity: 'success'
      });
      
      setEditDialogOpen(false);
      // Patientenliste neu laden, um sicherzustellen, dass alle Daten aktualisiert sind
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

  const handleMarkAsComplete = async () => {
    if (!patient) return;
    
    try {
      const patientId = patient._id || patient.id;
      if (!patientId) {
        throw new Error('Patient ID nicht gefunden');
      }

      const updatedPatient = await dispatch(updatePatient({ id: patientId, patientData: { isTemporary: false } })).unwrap();
      
      setSnackbar({
        open: true,
        message: 'Patient wurde als vollständig markiert!',
        severity: 'success'
      });
      
      setEditDialogOpen(false);
      // Patientenliste neu laden, um sicherzustellen, dass alle Daten aktualisiert sind
      dispatch(fetchPatients(1));
    } catch (error: any) {
      console.error('Fehler beim Markieren als vollständig:', error);
      setSnackbar({
        open: true,
        message: `Fehler: ${error.message || 'Unbekannter Fehler'}`,
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
        insuranceNumber: patient.insuranceNumber,
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
      vaccinations: (patient.vaccinations || []).map(vacc => ({
        ...vacc,
        date: formatDateForInput(vacc.date),
        nextDue: formatDateForInput(vacc.nextDue)
      })),
      notes: patient.notes,
      // Schwangerschaft und Stillen (nur bei Frauen)
      isPregnant: patient.gender === 'f' || patient.gender === 'w' ? (patient.isPregnant || false) : false,
      pregnancyWeek: patient.gender === 'f' || patient.gender === 'w' ? (patient.pregnancyWeek || undefined) : undefined,
      pregnancyDueDate: patient.gender === 'f' || patient.gender === 'w' ? formatDateForInput(patient.pregnancyDueDate) : undefined,
      lastMenstrualPeriod: patient.gender === 'f' || patient.gender === 'w' ? formatDateForInput((patient as any).lastMenstrualPeriod) : undefined,
      isBreastfeeding: patient.gender === 'f' || patient.gender === 'w' ? (patient.isBreastfeeding || false) : false,
      // Medizinische Implantate und Geräte
      hasPacemaker: patient.hasPacemaker || false,
      hasDefibrillator: patient.hasDefibrillator || false,
      implants: (patient.implants || []).map(impl => ({
        ...impl,
        date: formatDateForInput(impl.date)
      })),
      // Raucherstatus
      smokingStatus: patient.smokingStatus || 'non-smoker',
      cigarettesPerDay: patient.cigarettesPerDay || undefined,
      yearsOfSmoking: patient.yearsOfSmoking || undefined,
      quitSmokingDate: formatDateForInput(patient.quitSmokingDate),
      // Infektionen - Datum formatieren für date input
      infections: (patient.infections || []).map(inf => ({
        ...inf,
        detectedDate: formatDateForInput(inf.detectedDate)
      }))
    });
    setMedicalDialogOpen(true);
  };

  // Funktion zur Berechnung der Schwangerschaftswoche
  const calculatePregnancyWeek = React.useCallback((
    lastMenstrualPeriod?: string,
    pregnancyDueDate?: string | Date
  ): number | undefined => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Option 1: Berechnung basierend auf letzter Menstruation
    if (lastMenstrualPeriod) {
      const lmpDate = new Date(lastMenstrualPeriod);
      lmpDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today.getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
      const weeks = Math.floor(daysDiff / 7);
      if (weeks >= 0 && weeks <= 42) {
        return weeks;
      }
    }

    // Option 2: Berechnung basierend auf Entbindungstermin
    if (pregnancyDueDate) {
      const dueDate = typeof pregnancyDueDate === 'string' 
        ? new Date(pregnancyDueDate) 
        : pregnancyDueDate;
      dueDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const weeks = 40 - Math.floor(daysDiff / 7);
      if (weeks >= 0 && weeks <= 42) {
        return weeks;
      }
    }

    return undefined;
  }, []);

  const handleMedicalDataChange = (field: string, value: any) => {
    setMedicalData(prev => {
      let processedValue = value;
      let updatedData: Partial<Patient> = { ...prev };
      
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
        
        // Wenn isPregnant auf true gesetzt wird, automatisch Schwangerschaftswoche berechnen
        if (field === 'isPregnant' && processedValue === true) {
          const calculatedWeek = calculatePregnancyWeek(
            (prev as any).lastMenstrualPeriod as string | undefined,
            prev.pregnancyDueDate
          );
          if (calculatedWeek && !prev.pregnancyWeek) {
            updatedData.pregnancyWeek = calculatedWeek;
          }
        }
        
        // Wenn isPregnant auf false gesetzt wird, Schwangerschaftswoche zurücksetzen
        if (field === 'isPregnant' && processedValue === false) {
          updatedData.pregnancyWeek = undefined;
          updatedData.pregnancyDueDate = undefined;
          updatedData.lastMenstrualPeriod = undefined;
        }
      }
      
      // Für Datums-Felder: String zu Date konvertieren
      if (field === 'quitSmokingDate' || field === 'lastMenstrualPeriod' || field === 'pregnancyDueDate') {
        processedValue = value ? new Date(value).toISOString().split('T')[0] : undefined;
        
        // Wenn lastMenstrualPeriod oder pregnancyDueDate geändert wird und isPregnant true ist, Woche neu berechnen
        if ((field === 'lastMenstrualPeriod' || field === 'pregnancyDueDate') && prev.isPregnant) {
          const calculatedWeek = calculatePregnancyWeek(
            field === 'lastMenstrualPeriod' ? processedValue : ((prev as any).lastMenstrualPeriod as string | undefined),
            field === 'pregnancyDueDate' ? processedValue : prev.pregnancyDueDate
          );
          if (calculatedWeek) {
            updatedData.pregnancyWeek = calculatedWeek;
          }
        }
      }
      
      return {
        ...updatedData,
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

      // Leere Infektionen herausfiltern und Datum formatieren (nur Infektionen mit Typ behalten)
      if (updatedMedicalData.infections) {
        updatedMedicalData.infections = updatedMedicalData.infections
          .filter(infection => 
            infection && 
            typeof infection === 'object' && 
            infection.type && 
            infection.type.trim() !== ''
          )
          .map(infection => ({
            type: infection.type.trim(),
            location: infection.location?.trim() || undefined,
            detectedDate: infection.detectedDate && infection.detectedDate.trim() !== '' 
              ? new Date(infection.detectedDate).toISOString() 
              : undefined,
            status: infection.status || 'active',
            notes: infection.notes?.trim() || undefined
          }));
      }

      console.log('🔍 Sending medical data update:', {
        patientId,
        infections: updatedMedicalData.infections,
        allData: updatedMedicalData
      });

      const result = await dispatch(updatePatient({ id: patientId, patientData: updatedMedicalData })).unwrap();
      
      console.log('✅ Update result:', result);
      console.log('✅ Update result infections:', result?.infections);
      
      setSnackbar({
        open: true,
        message: 'Medizinische Daten erfolgreich aktualisiert!',
        severity: 'success'
      });
      
      setMedicalDialogOpen(false);
      
      // Patientenliste neu laden, um aktualisierte Daten zu erhalten
      await dispatch(fetchPatients(1));
      
      // Zusätzlich: Lade den spezifischen Patient neu, falls er nicht auf Seite 1 ist
      try {
        const patientResponse: any = await apiRequest.get(`/patients-extended/${patientId}`);
        if (patientResponse.success && patientResponse.data) {
          const updatedPatient = patientResponse.data.data || patientResponse.data;
          console.log('✅ Reloaded patient infections:', updatedPatient?.infections);
          // Aktualisiere den Patient im Redux Store
          dispatch(updatePatient({ id: patientId, patientData: updatedPatient }));
          
          // Automatische Übernahme von Medikamenten aus medizinischen Daten in den Medikamenten-Manager
          if (updatedMedicalData.currentMedications && updatedMedicalData.currentMedications.length > 0) {
            try {
              // Lade bestehende Medikamente
              const existingMedicationsResult = await dispatch(fetchPatientMedications({ patientId })).unwrap();
              const existingMedications = existingMedicationsResult.data || [];
              
              for (const med of updatedMedicalData.currentMedications) {
                if (!med) continue;
                
                // Unterstütze sowohl String als auch Objekt-Format
                let medName: string;
                let medDosage: string;
                let medFrequency: string;
                let medDuration: string = '';
                let medStartDate: string = new Date().toISOString().split('T')[0];
                
                if (typeof med === 'string') {
                  // String-Format: nur Name vorhanden
                  medName = med.trim();
                  medDosage = 'Nicht angegeben';
                  medFrequency = 'Nicht angegeben';
                } else if (typeof med === 'object' && med.name) {
                  // Objekt-Format: vollständige Daten
                  const medAny = med as any;
                  medName = medAny.name.trim();
                  medDosage = medAny.dosage || 'Nicht angegeben';
                  medFrequency = medAny.frequency || 'Nicht angegeben';
                  medDuration = medAny.duration || '';
                  medStartDate = medAny.startDate ? new Date(medAny.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                } else {
                  continue; // Überspringe ungültige Einträge
                }
                
                if (!medName) continue; // Überspringe leere Namen
                
                // Prüfe ob Medikament bereits existiert (gleicher Name, Dosierung, Häufigkeit und Quelle anamnestic)
                const exists = existingMedications.some((m: any) => 
                  m.name === medName && 
                  m.dosage === medDosage && 
                  m.frequency === medFrequency &&
                  m.source === 'anamnestic'
                );
                
                if (!exists) {
                  await dispatch(createMedication({
                    patientId,
                    medicationId: (med as any).medicationId || undefined,
                    name: medName,
                    dosage: medDosage,
                    frequency: medFrequency,
                    duration: medDuration,
                    startDate: medStartDate,
                    source: 'anamnestic',
                    notes: 'Übernommen aus medizinischen Daten (Anamnese)'
                  })).unwrap();
                }
              }
            } catch (error) {
              console.error('Fehler bei automatischer Medikamenten-Übernahme aus medizinischen Daten:', error);
              // Nicht blockieren - medizinische Daten wurden bereits gespeichert
            }
          }
        }
      } catch (reloadError) {
        console.warn('⚠️ Could not reload patient:', reloadError);
      }
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
    const filtered = (docs as PatientDocument[]).filter(d => d.patient?.id === patientId);
    
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
    // WICHTIG: Filtere nach patientId, um nur Diagnosen des aktuellen Patienten anzuzeigen
    const filtered = (dx as PatientDiagnosis[]).filter((diag: PatientDiagnosis) => {
      const diagPatientId = diag.patientId || (diag as any).patient?._id || (diag as any).patient?.id || (diag as any).patient;
      return diagPatientId === patientId;
    });
    return filtered.slice().sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,8);
  }, [patientDiagnoses, patientId]);

  const isLoading = patientsLoading || appointmentsLoading || diagnosesLoading || documentsLoading;

  // Handler für Template-Menü
  const handleTemplateMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTemplateMenuAnchor(event.currentTarget);
  };

  const handleTemplateMenuClose = () => {
    setTemplateMenuAnchor(null);
  };

  // Lade Standalone-Vorlagen
  const loadStandaloneTemplates = async () => {
    setLoadingStandaloneTemplates(true);
    try {
      const result = await dispatch(fetchStandaloneTemplates({})).unwrap();
      // Normalisiere Templates: Stelle sicher, dass _id vorhanden ist
      const normalizedTemplates = result.map((template: any) => ({
        ...template,
        _id: template._id || template.id
      }));
      setStandaloneTemplates(normalizedTemplates);
    } catch (error) {
      console.error('Fehler beim Laden der Standalone-Vorlagen:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Vorlagen',
        severity: 'error'
      });
    } finally {
      setLoadingStandaloneTemplates(false);
    }
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

  // Handler für Patienten-/Arztbrief erstellen
  const handleCreateLetter = () => {
    if (!patient) return;
    setLetterDialogOpen(true);
  };

  // Handler für Patienten-/Arztbrief auswählen und erstellen
  const handleCreateLetterType = async (letterType: 'arztbrief' | 'patientenbrief') => {
    if (!patient || !user) return;
    
    setIsCreatingDocument(true);
    setLetterDialogOpen(false);

    try {
      const letterTypeName = letterType === 'arztbrief' ? 'Arztbrief' : 'Patientenbrief';
      const documentTitle = `${letterTypeName} für ${patient.firstName} ${patient.lastName}`;
      
      // Erstelle Dokumentdaten
      // Für Patientenbrief verwenden wir 'sonstiges', da 'patientenbrief' nicht im Backend enum ist
      const documentData = {
        type: letterType === 'arztbrief' ? 'arztbrief' as const : 'sonstiges' as const,
        title: documentTitle,
        content: {
          text: `${letterTypeName} für ${patient.firstName} ${patient.lastName}\n\nDatum: ${new Date().toLocaleDateString('de-DE')}\n\n`,
          html: `<h1>${letterTypeName}</h1><p><strong>Patient:</strong> ${patient.firstName} ${patient.lastName}</p><p><strong>Datum:</strong> ${new Date().toLocaleDateString('de-DE')}</p>`
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
      
      // Snackbar anzeigen
      setSnackbar({
        open: true,
        message: `${letterTypeName} erfolgreich erstellt.`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Briefs:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Erstellen des Briefs.',
        severity: 'error'
      });
    } finally {
      setIsCreatingDocument(false);
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
      
      // Platzhalter ersetzen mit neuer Utility-Funktion (unterstützt beide Formate)
      let content = template.content || template.text || '';
      console.log('Template content:', content);
      
      const selectedLocation = locations.find((loc: Location) => loc._id === (user as any)?.locationId) || locations[0] || currentLocation;
      
      const context: PlaceholderContext = {
        patient: patient,
        doctor: {
          firstName: user.firstName,
          lastName: user.lastName,
          title: (user as any)?.title,
          specialization: (user as any)?.specialization,
          email: user.email,
        },
        location: selectedLocation,
        date: new Date(),
      };
      
      content = replacePlaceholders(content, context);

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
    <Box sx={{ 
      position: 'relative', 
      minHeight: '100vh',
      contain: 'layout style paint',
      willChange: 'auto',
      transform: 'translateZ(0)',
      overflowX: 'hidden',
      mt: marginTopValue !== '0px' ? marginTopValue : 0,
      transition: marginTopValue !== '0px' ? 'margin-top 0.3s ease' : 'none',
    }}>
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

      <Box sx={{ p: { xs: 1, sm: 2 } }}>
        {/* Kompakter Header */}
        <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 1, sm: 2 }, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
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
                      width: { xs: 50, sm: 80 },
                      height: { xs: 50, sm: 80 },
                      border: '3px solid',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      flexShrink: 0
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
                          bgcolor: 'background.paper',
                          color: 'text.primary',
                          '&:hover': {
                            bgcolor: 'action.hover'
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
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                  variant={isMobile ? 'h6' : 'h5'} 
                  fontWeight="bold"
                  sx={{
                    fontSize: { xs: '1rem', sm: '1.5rem' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {patient ? `${patient.firstName} ${patient.lastName}` : 'Patienten-Organizer'}
                </Typography>
                {patient && (
                  <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant={isMobile ? 'caption' : 'body2'} sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                      {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('de-DE') : '—'} • 
                      {(() => {
                        if (!patient.dateOfBirth) return '';
                        const calculateAge = (dateOfBirth: string | Date | undefined): number => {
                          if (!dateOfBirth) return 0;
                          const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
                          const today = new Date();
                          let age = today.getFullYear() - birthDate.getFullYear();
                          const monthDiff = today.getMonth() - birthDate.getMonth();
                          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                            age--;
                          }
                          return age;
                        };
                        const age = calculateAge(patient.dateOfBirth);
                        return ` ${age} Jahre •`;
                      })()}
                      {patient.socialSecurityNumber ? ` SVNR: ${patient.socialSecurityNumber}` : ''} • 
                      {patient.gender || '—'}
                    </Typography>
                    {patient.status && (
                      <Chip 
                        label={patient.status} 
                        size="small" 
                        sx={{ bgcolor: 'rgba(255, 255, 255, 0.25)', color: 'inherit', fontWeight: 500 }}
                      />
                    )}
                    {patient.isTemporary && (
                      <Tooltip
                        title="Patient über Online-Buchung erstellt - Stammdaten müssen vervollständigt werden"
                        arrow
                        placement="top"
                      >
                        <Chip 
                          icon={<Warning />}
                          label="Temporär" 
                          size="small" 
                          color="warning"
                          sx={{ 
                            bgcolor: 'rgba(255, 193, 7, 0.9)', 
                            color: 'rgba(0, 0, 0, 0.87)',
                            fontWeight: 'bold'
                          }}
                        />
                      </Tooltip>
                    )}
                    {patient.hasHint && (
                      <Tooltip 
                        title={patient.hintText ? patient.hintText : 'Hinweis vorhanden (kein Text eingegeben)'}
                        arrow
                        placement="top"
                      >
                        <Chip 
                          icon={<Warning />}
                          label="Hinweis" 
                          size="small" 
                          color="warning"
                          onClick={() => {
                            setHintTextEdit(patient.hintText || '');
                            setOnlineBookingBlockedEdit(patient.onlineBookingBlocked || false);
                            setHintEditMode(false);
                            setHintDetailsDialogOpen(true);
                          }}
                          sx={{ 
                            bgcolor: 'rgba(255, 193, 7, 0.9)', 
                            color: 'rgba(0, 0, 0, 0.87)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            '&:hover': {
                              bgcolor: 'rgba(255, 193, 7, 1)'
                            }
                          }}
                        />
                      </Tooltip>
                    )}
                    {patient.onlineBookingBlocked && (
                      <Tooltip 
                        title="Dieser Patient kann keine Termine online buchen. Er muss sich telefonisch einen Termin vereinbaren."
                        arrow
                        placement="top"
                      >
                        <Chip 
                          icon={<Block />}
                          label="Online-Buchung blockiert" 
                          size="small" 
                          color="error"
                          onClick={() => {
                            setHintTextEdit(patient.hintText || '');
                            setOnlineBookingBlockedEdit(patient.onlineBookingBlocked || false);
                            setHintEditMode(false);
                            setHintDetailsDialogOpen(true);
                          }}
                          sx={{ 
                            bgcolor: 'error.main', 
                            color: 'error.contrastText',
                            cursor: 'pointer',
                            fontWeight: 500,
                            '&:hover': {
                              bgcolor: 'error.dark'
                            }
                          }}
                        />
                      </Tooltip>
                    )}
                    {patient.isPregnant && (patient.gender === 'w' || patient.gender === 'f') && (
                      <Tooltip
                        title={
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                              Schwangerschaft
                            </Typography>
                            {(() => {
                              let week = patient.pregnancyWeek;
                              if (!week) {
                                const calculatedWeek = calculatePregnancyWeek(
                                  (patient as any).lastMenstrualPeriod,
                                  patient.pregnancyDueDate
                                );
                                week = calculatedWeek;
                              }
                              return week ? (
                                <Typography variant="body2" sx={{ mb: 0.25 }}>
                                  Woche: {week}
                                </Typography>
                              ) : null;
                            })()}
                            {patient.pregnancyDueDate && (
                              <Typography variant="body2" sx={{ mb: 0.25 }}>
                                Entbindungstermin: {new Date(patient.pregnancyDueDate).toLocaleDateString('de-DE')}
                              </Typography>
                            )}
                            {patient.isBreastfeeding && (
                              <Typography variant="body2">
                                Stillend
                              </Typography>
                            )}
                          </Box>
                        }
                        arrow
                        placement="top"
                      >
                        <Chip 
                          icon={<PregnantWoman />}
                          label={(() => {
                            // Berechne Schwangerschaftswoche falls nicht vorhanden
                            let week = patient.pregnancyWeek;
                            if (!week) {
                              const calculatedWeek = calculatePregnancyWeek(
                                (patient as any).lastMenstrualPeriod,
                                patient.pregnancyDueDate
                              );
                              week = calculatedWeek;
                            }
                            return week ? `Schwanger (${week}. Woche)` : 'Schwanger';
                          })()}
                          size="small" 
                          color="secondary"
                          sx={{ 
                            bgcolor: 'secondary.main', 
                            color: 'secondary.contrastText',
                            fontWeight: 600
                          }}
                        />
                      </Tooltip>
                    )}
                    {patient.allergies && patient.allergies.length > 0 && (
                      <Tooltip
                        title={
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                              Allergien:
                            </Typography>
                            {patient.allergies.map((allergy, idx) => {
                              const allergyLabel = typeof allergy === 'string' 
                                ? allergy 
                                : `${allergy.type || 'Allergie'}${allergy.description ? `: ${allergy.description}` : ''}${allergy.severity ? ` (${allergy.severity})` : ''}`;
                              return (
                                <Typography key={idx} variant="body2" sx={{ mb: 0.25 }}>
                                  • {allergyLabel}
                                </Typography>
                              );
                            })}
                          </Box>
                        }
                        arrow
                        placement="top"
                      >
                        <Chip
                          icon={<Warning />}
                          label={`Allergie${patient.allergies.length > 1 ? 'n' : ''} (${patient.allergies.length})`}
                          size="small"
                          color="error"
                          sx={{ 
                            bgcolor: 'error.main',
                            color: 'error.contrastText',
                            fontWeight: 600
                          }}
                        />
                      </Tooltip>
                    )}
                    {patient.infections && patient.infections.length > 0 && patient.infections.some(inf => inf.status === 'active') && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {patient.infections.filter(inf => inf.status === 'active').map((infection, index) => {
                          const isMRSAOrMRGN = infection.type?.toUpperCase().includes('MRSA') || infection.type?.toUpperCase().includes('MRGN');
                          const tooltipContent = (
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                {infection.type || 'Infektion'}
                              </Typography>
                              {infection.location && (
                                <Typography variant="body2" sx={{ mb: 0.25 }}>
                                  Ort: {infection.location}
                                </Typography>
                              )}
                              {infection.detectedDate && (
                                <Typography variant="body2" sx={{ mb: 0.25 }}>
                                  Erkannt: {new Date(infection.detectedDate).toLocaleDateString('de-DE')}
                                </Typography>
                              )}
                              {infection.status && (
                                <Typography variant="body2">
                                  Status: {infection.status === 'active' ? 'Aktiv' : infection.status === 'resolved' ? 'Abgeklungen' : infection.status === 'colonized' ? 'Kolonisiert' : infection.status}
                                </Typography>
                              )}
                            </Box>
                          );
                          return (
                            <Tooltip
                              key={index}
                              title={tooltipContent}
                              arrow
                              placement="top"
                            >
                              <Chip
                                icon={<BugReport />}
                                label={infection.type || 'Infektion'}
                                size="small"
                                color={isMRSAOrMRGN ? 'error' : 'success'}
                                sx={{ 
                                  bgcolor: isMRSAOrMRGN ? 'error.main' : 'success.main',
                                  color: isMRSAOrMRGN ? 'error.contrastText' : 'success.contrastText',
                                  fontWeight: 600
                                }}
                              />
                            </Tooltip>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                )}
                {/* Diagnosen links */}
                {(() => {
                  // WICHTIG: Filtere nach patientId, um nur Diagnosen des aktuellen Patienten anzuzeigen
                  const filteredDiagnoses = (patientDiagnoses || []).filter((diag: PatientDiagnosis) => {
                    const diagPatientId = diag.patientId || (diag as any).patient?._id || (diag as any).patient?.id || (diag as any).patient;
                    return diagPatientId === patientId;
                  });
                  const primaryDiagnosis = filteredDiagnoses.find((diag: PatientDiagnosis) => diag.isPrimary && diag.status === 'active');
                  if (primaryDiagnosis) {
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
                        <LocalHospital sx={{ fontSize: 20 }} />
                        <Chip
                          label={`Hauptdiagnose: ${primaryDiagnosis.code} - ${primaryDiagnosis.display}`}
                          size="medium"
                          sx={{ 
                            bgcolor: 'rgba(255, 255, 255, 0.25)', 
                            color: 'inherit',
                            fontSize: { xs: '0.85rem', sm: '0.95rem' },
                            height: 'auto',
                            py: 0.75,
                            fontWeight: 500
                          }}
                        />
                      </Box>
                    );
                  }
                  return null;
                })()}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end', minWidth: 250 }}>
              {/* Adresse */}
              {patient && patient.address && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end', mb: 1 }}>
                  <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 500 }}>
                    {patient.address.street && `${patient.address.street}`}
                    {patient.address.zipCode && `, ${patient.address.zipCode}`}
                    {patient.address.postalCode && !patient.address.zipCode && `, ${patient.address.postalCode}`}
                  </Typography>
                  <Typography variant="body2" sx={{ textAlign: 'right' }}>
                    {patient.address.city && `${patient.address.city}`}
                    {patient.address.country && patient.address.country !== 'Österreich' && `, ${patient.address.country}`}
                  </Typography>
                </Box>
              )}
              {/* Kontaktdaten */}
              {patient && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                  {patient.email && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Email sx={{ fontSize: 16 }} />
                      <Typography 
                        component="a"
                        href={`mailto:${patient.email}`}
                        variant="body2"
                        sx={{ 
                          color: 'inherit',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        {patient.email}
                      </Typography>
                    </Box>
                  )}
                  {patient.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Phone sx={{ fontSize: 16 }} />
                      <Typography variant="body2">
                        {patient.phone}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
              <Tooltip title="Zur Patientenliste">
                <IconButton 
                  onClick={() => navigate('/patients')}
                  sx={{ color: 'inherit', mt: 1 }}
                  size="large"
                >
                  <ListIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Patienten-Workspace öffnen">
                <IconButton 
                  onClick={() => setSidebarOpen(true)}
                  sx={{ color: 'inherit', mt: 1 }}
                  size="large"
                >
                  <MenuIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        {/* Alert für temporäre Patienten */}
        {patient && patient.isTemporary && (
          <Alert 
            severity="warning"
            icon={<Warning />}
            sx={{ mb: 2 }}
            action={
              <Button 
                size="small" 
                variant="outlined"
                onClick={() => {
                  // Öffne den Stammdaten-Dialog
                  handleEditStammdaten();
                }}
              >
                Stammdaten vervollständigen
              </Button>
            }
          >
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              ⚠️ Temporärer Patient
            </Typography>
            <Typography variant="body2">
              Dieser Patient wurde über eine Online-Buchung erstellt. Bitte vervollständigen Sie die Stammdaten (Geschlecht, Versicherungsnummer, Adresse, etc.) bevor Sie mit der Behandlung fortfahren.
            </Typography>
            {patient.notes && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                Hinweis: {patient.notes}
              </Typography>
            )}
          </Alert>
        )}

        {/* Erweiterte Schwangerschafts-Alert-Meldung */}
        {pregnancyAlertInfo && pregnancyAlertInfo.shouldShow && (
          <Alert 
            severity={pregnancyAlertInfo.severity}
            icon={<PregnantWoman />}
            sx={{ mb: 2 }}
            action={
              <Button 
                size="small" 
                variant="outlined"
                onClick={() => {
                  // Navigiere zu den Medizinischen Daten, um den Schwangerschaftsstatus zu aktualisieren
                  setActiveTab(2); // Medizinisch Tab
                  setSnackbar({
                    open: true,
                    message: 'Bitte aktualisieren Sie den Schwangerschaftsstatus in den Medizinischen Daten.',
                    severity: 'info'
                  });
                }}
              >
                Status prüfen
              </Button>
            }
          >
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              {pregnancyAlertInfo.alertType === 'week42' && '⚠️ Schwangerschaftswoche übersteigt 42 Wochen'}
              {pregnancyAlertInfo.alertType === 'overdue' && '⚠️ Entbindungsdatum überschritten'}
              {pregnancyAlertInfo.alertType === 'week40' && '⚠️ Schwangerschaftswoche 40 erreicht'}
              {pregnancyAlertInfo.alertType === 'previous' && 'Schwangerschaftsstatus prüfen'}
            </Typography>
            <Typography variant="body2">
              {pregnancyAlertInfo.message}
            </Typography>
            {pregnancyAlertInfo.expectedDueDate && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                Erwartetes Entbindungsdatum: {format(pregnancyAlertInfo.expectedDueDate, 'dd.MM.yyyy', { locale: de })}
              </Typography>
            )}
            {pregnancyAlertInfo.currentWeek && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                Aktuelle Schwangerschaftswoche: {pregnancyAlertInfo.currentWeek}
              </Typography>
            )}
          </Alert>
        )}

        {/* Quick Actions */}
        <Paper sx={{ p: { xs: 1, sm: 1.5 }, mb: { xs: 1, sm: 2 } }}>
          <Stack 
            direction="row" 
            spacing={{ xs: 0.5, sm: 1 }} 
            sx={{ 
              flexWrap: 'wrap',
              gap: { xs: 0.5, sm: 1 }
            }}
          >
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
                bgcolor: theme.palette.mode === 'dark' ? 'warning.dark' : 'warning.light',
                color: theme.palette.mode === 'dark' ? 'warning.contrastText' : 'text.primary',
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                minHeight: { xs: '36px', sm: 'auto' },
                px: { xs: 1, sm: 2 },
                '& .MuiButton-startIcon': { marginRight: { xs: 0.5, sm: 1 } },
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark' ? 'warning.main' : 'warning.main',
                  color: theme.palette.mode === 'dark' ? 'warning.contrastText' : 'text.primary'
                }
              }}
            >
              Dekurs
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Description />}
              onClick={() => {
                if (!patient) return;
                setDocumentTypeDialogOpen(true);
              }}
              disabled={!patient || isCreatingDocument}
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? 'primary.dark' : '#E3F2FD',
                color: theme.palette.mode === 'dark' ? 'primary.contrastText' : 'text.primary',
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                minHeight: { xs: '36px', sm: 'auto' },
                px: { xs: 1, sm: 2 },
                '& .MuiButton-startIcon': { marginRight: { xs: 0.5, sm: 1 } },
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark' ? 'primary.main' : '#90CAF9'
                }
              }}
            >
              {isMobile ? 'Brief' : 'Patienten-/Arztbrief'}
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Medication />}
              onClick={() => {
                if (!patient) return;
                setMedicationManagerDialogOpen(true);
              }}
              disabled={!patient}
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? 'success.dark' : '#E8F5E9',
                color: theme.palette.mode === 'dark' ? 'success.contrastText' : 'text.primary',
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                minHeight: { xs: '36px', sm: 'auto' },
                px: { xs: 1, sm: 2 },
                '& .MuiButton-startIcon': { marginRight: { xs: 0.5, sm: 1 } },
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark' ? 'success.main' : '#A5D6A7'
                }
              }}
            >
              {isMobile ? 'Med.' : 'Medikamente'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Description />}
              onClick={() => {
                if (!patient) return;
                setStandaloneTemplateDialogOpen(true);
                loadStandaloneTemplates();
              }}
              disabled={!patient || isCreatingDocument}
              sx={{
                borderColor: 'success.main',
                color: 'success.main',
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                minHeight: { xs: '36px', sm: 'auto' },
                px: { xs: 1, sm: 2 },
                '& .MuiButton-startIcon': { marginRight: { xs: 0.5, sm: 1 } },
                '&:hover': {
                  borderColor: 'success.dark',
                  bgcolor: 'success.light'
                }
              }}
            >
              {isMobile ? 'Vorlage' : 'Aus Vorlage'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Schedule />}
              onClick={() => {
                if (!patient || !patientId) return;
                navigate(`/appointments?openDialog=true&patient=${patientId}`);
              }}
              disabled={!patient}
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                minHeight: { xs: '36px', sm: 'auto' },
                px: { xs: 1, sm: 2 },
                '& .MuiButton-startIcon': { marginRight: { xs: 0.5, sm: 1 } }
              }}
            >
              Termin
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AccountCircle />}
              onClick={() => {
                setActiveTab(10);
                handleTabNavigation(10, true);
              }}
              disabled={!patient}
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                minHeight: { xs: '36px', sm: 'auto' },
                px: { xs: 1, sm: 2 },
                '& .MuiButton-startIcon': { marginRight: { xs: 0.5, sm: 1 } }
              }}
            >
              {isMobile ? 'Daten' : 'Stammdaten'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<QrCode />}
              onClick={handleValidateStammdaten}
              disabled={!patient}
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                minHeight: { xs: '36px', sm: 'auto' },
                px: { xs: 1, sm: 2 },
                '& .MuiButton-startIcon': { marginRight: { xs: 0.5, sm: 1 } }
              }}
            >
              {isMobile ? 'Valid.' : 'Validieren'}
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Receipt />}
              onClick={() => {
                if (!patient) return;
                setPerformanceDialogOpen(true);
              }}
              disabled={!patient}
              sx={{
                bgcolor: 'success.main',
                color: 'success.contrastText',
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                minHeight: { xs: '36px', sm: 'auto' },
                px: { xs: 1, sm: 2 },
                '& .MuiButton-startIcon': { marginRight: { xs: 0.5, sm: 1 } },
                '&:hover': {
                  bgcolor: 'success.dark'
                }
              }}
            >
              {isMobile ? 'Leistung' : 'Leistungsabrechnung'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Article />}
              onClick={() => {
                if (!patient || !patientId) return;
                navigate(`/billing?patientId=${patientId}`);
              }}
              disabled={!patient}
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                minHeight: { xs: '36px', sm: 'auto' },
                px: { xs: 1, sm: 2 },
                '& .MuiButton-startIcon': { marginRight: { xs: 0.5, sm: 1 } }
              }}
            >
              {isMobile ? 'Rechnung' : 'Rechnung'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Warning />}
              onClick={() => {
                if (!patient) return;
                if (patient.hasHint) {
                  setHintTextEdit(patient.hintText || '');
                  setOnlineBookingBlockedEdit(patient.onlineBookingBlocked || false);
                  setHintEditMode(false);
                } else {
                  setHintTextEdit('');
                  setOnlineBookingBlockedEdit(patient.onlineBookingBlocked || false);
                  setHintEditMode(true);
                }
                setHintDetailsDialogOpen(true);
              }}
              disabled={!patient}
              sx={{
                borderColor: 'warning.main',
                color: 'warning.main',
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                minHeight: { xs: '36px', sm: 'auto' },
                px: { xs: 1, sm: 2 },
                '& .MuiButton-startIcon': { marginRight: { xs: 0.5, sm: 1 } },
                '&:hover': {
                  borderColor: 'warning.dark',
                  bgcolor: 'warning.light',
                  color: 'warning.dark'
                }
              }}
            >
              {isMobile ? 'Hinweis' : (patient?.hasHint ? 'Hinweis bearbeiten' : 'Hinweis hinzufügen')}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Description />}
              onClick={() => {
                if (!patient) return;
                setNotesDialogOpen(true);
              }}
              disabled={!patient}
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                minHeight: { xs: '36px', sm: 'auto' },
                px: { xs: 1, sm: 2 },
                '& .MuiButton-startIcon': { marginRight: { xs: 0.5, sm: 1 } }
              }}
            >
              Notizen
            </Button>
          </Stack>
        </Paper>

        {/* Tab Navigation */}
        <Paper sx={{ mb: { xs: 1, sm: 2 } }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => {
              // Verwende zentrale Navigation-Funktion
              handleTabNavigation(newValue, true);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': {
                minWidth: { xs: 60, sm: 120 },
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                padding: { xs: '6px 8px', sm: '12px 16px' },
                minHeight: { xs: '48px', sm: 'auto' },
                textTransform: 'none'
              },
              '& .MuiTabs-scrollButtons': {
                minWidth: { xs: '36px', sm: 'auto' },
                minHeight: { xs: '36px', sm: 'auto' }
              }
            }}
          >
            <Tab 
              label="ePA" 
              icon={<Info />} 
              iconPosition="start"
            />
            <Tab 
              label={
                countNewEntries.dekurs > 0 ? (
                  <Badge badgeContent={countNewEntries.dekurs} color="error" sx={{ '& .MuiBadge-badge': { right: -8, top: 8 } }}>
                    Dekurs
                </Badge>
                ) : (
                  'Dekurs'
                )
              } 
              icon={<Assignment />} 
              iconPosition="start"
            />
            <Tab label="Medizinisch" icon={<MedicalServices />} iconPosition="start" />
            <Tab label="Diagnosen" icon={<LocalHospital />} iconPosition="start" />
            <Tab 
              label={
                countNewEntries.vital > 0 ? (
                  <Badge badgeContent={countNewEntries.vital} color="error" sx={{ '& .MuiBadge-badge': { right: -8, top: 8 } }}>
                    Vitalwerte
                </Badge>
                ) : (
                  'Vitalwerte'
                )
              } 
              icon={<MonitorHeart />} 
              iconPosition="start"
            />
            <Tab 
              label={
                countNewEntries.labor > 0 ? (
                  <Badge badgeContent={countNewEntries.labor} color="error" sx={{ '& .MuiBadge-badge': { right: -8, top: 8 } }}>
                    Labor
                </Badge>
                ) : (
                  'Labor'
                )
              } 
              icon={<Science />} 
              iconPosition="start"
            />
            <Tab 
              label={
                countNewEntries.dicom > 0 ? (
                  <Badge badgeContent={countNewEntries.dicom} color="error" sx={{ '& .MuiBadge-badge': { right: -8, top: 8 } }}>
                    DICOM
                </Badge>
                ) : (
                  'DICOM'
                )
              } 
              icon={<Image />} 
              iconPosition="start"
            />
            <Tab 
              label={
                countNewEntries.documents > 0 ? (
                  <Badge badgeContent={countNewEntries.documents} color="error" sx={{ '& .MuiBadge-badge': { right: -8, top: 8 } }}>
                    Dokumente
                </Badge>
                ) : (
                  'Dokumente'
                )
              } 
              icon={<Description />} 
              iconPosition="start"
            />
            <Tab label="Termine" icon={<CalendarToday />} iconPosition="start" />
            <Tab 
              label={
                countNewEntries.photos > 0 ? (
                  <Badge badgeContent={countNewEntries.photos} color="error" sx={{ '& .MuiBadge-badge': { right: -8, top: 8 } }}>
                    Fotos
                </Badge>
                ) : (
                  'Fotos'
                )
              } 
              icon={<PhotoCamera />} 
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        <TabPanel value={activeTab} index={0}>
          {/* ePA Tab - Elektronische Patientenkartei - Nur rendern wenn Tab aktiv ist */}
          {activeTab === 0 ? (
            <ErrorBoundary>
              {patientId ? (
                <PatientEPA 
                  patientId={patientId} 
                  onTabChange={(tabIndex: number) => {
                    // Verwende zentrale Navigation-Funktion
                    handleTabNavigation(tabIndex, true);
                  }}
                  onOpenMedicationManager={() => {
                    setMedicationManagerDialogOpen(true);
                  }}
                  onDocumentPreview={(document) => {
                    try {
                      console.log('📄 onDocumentPreview aufgerufen:', {
                        document,
                        documentId: document?._id || document?.id,
                        hasDocument: !!document,
                        documentType: document?.type,
                        documentTitle: document?.title
                      });
                      
                      // Validierung: Stelle sicher, dass das Dokument gültig ist
                      if (!document) {
                        console.error('📄 Fehler: Kein Dokument übergeben');
                        return;
                      }
                      
                      const documentId = document._id || document.id;
                      if (!documentId) {
                        console.error('📄 Fehler: Dokument hat keine ID', document);
                        return;
                      }
                      
                      // Setze das Dokument und öffne den Dialog
                      setPreviewDocument(document);
                      setDocumentPreviewDialogOpen(true);
                      
                      console.log('📄 Dialog-Status gesetzt:', {
                        previewDocument: document,
                        documentId,
                        dialogOpen: true
                      });
                    } catch (error) {
                      console.error('📄 Fehler beim Öffnen der Dokumentenvorschau:', error);
                    }
                  }}
                  onNavigate={(path: string) => {
                    try {
                      // Parse den Tab-Parameter aus dem Pfad
                      let tabParam: string | null = null;
                      const match = path.match(/[?&]tab=([^&]+)/);
                      if (match) {
                        tabParam = match[1];
                      }
                      
                      // Bestimme Tab-Index aus Parameter
                      if (tabParam) {
                        const tabIndex = tabMapping[tabParam as keyof typeof tabMapping];
                        if (tabIndex !== undefined) {
                          // Verwende zentrale Navigation-Funktion für interne Tabs
                          handleTabNavigation(tabIndex, true);
                          return;
                        }
                      }
                      
                      // Für externe Navigation (z.B. zu Dokumenten)
                      if (path.startsWith('/documents/')) {
                        navigate(path, { replace: false });
                      } else if (path.includes(`/patients/${patientId}`)) {
                        // Navigation innerhalb von PatientOrganizer
                        navigate(path, { replace: true });
                      } else {
                        // Andere Navigation
                        navigate(path, { replace: false });
                      }
                    } catch (error) {
                      console.error('Fehler bei der Navigation:', error);
                    }
                  }}
                />
              ) : (
                <Paper sx={{ p: 2 }}>
                  <Alert severity="warning">
                    Keine Patient-ID gefunden. Bitte wählen Sie einen Patienten aus.
                  </Alert>
                </Paper>
              )}
            </ErrorBoundary>
          ) : null}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {/* Dekurs Tab */}
          <ErrorBoundary>
          {patientsLoading ? (
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            </Paper>
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
                  // Lade Dekurs-Einträge neu für EPA
                  if (patientId) {
                    dispatch(fetchDekursEntries({ patientId, limit: 1000 }));
                    // Lade auch Diagnosen neu, um sicherzustellen, dass neue Diagnosen aus linkedDiagnoses verfügbar sind
                    dispatch(fetchPatientDiagnoses({ patientId }));
                  }
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
          </ErrorBoundary>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {/* Medizinisch Tab */}
          <ErrorBoundary>
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
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Bloodtype sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined }} />
                      <Typography 
                        variant="body2"
                        sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined }}
                      >
                        <strong>Blutgruppe:</strong> {patient.bloodType || 'Nicht erfasst'}
                      </Typography>
                    </Box>
                    {patient.bloodType && <RecordedInfo fieldName="bloodType" />}
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Height sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined }} />
                      <Typography 
                        variant="body2"
                        sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined }}
                      >
                        <strong>Größe:</strong> {patient.height ? `${patient.height} cm` : 'Nicht erfasst'}
                      </Typography>
                    </Box>
                    {patient.height && <RecordedInfo fieldName="height" />}
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MonitorWeight sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined }} />
                      <Typography 
                        variant="body2"
                        sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined }}
                      >
                        <strong>Gewicht:</strong> {patient.weight ? `${patient.weight} kg` : 'Nicht erfasst'}
                      </Typography>
                    </Box>
                    {patient.weight && <RecordedInfo fieldName="weight" />}
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Favorite sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined }} />
                      <Typography 
                        variant="body2"
                        sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined }}
                      >
                        <strong>BMI:</strong> {patient.bmi ? patient.bmi.toFixed(1) : 'Nicht berechnet'}
                      </Typography>
                    </Box>
                    {patient.bmi && <RecordedInfo fieldName="bmi" />}
                  </Box>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  {/* Infektionen */}
                  {patient.infections && patient.infections.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Infektionen</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                        {patient.infections.map((infection, index) => {
                          const isMRSAOrMRGN = infection.type?.toUpperCase().includes('MRSA') || infection.type?.toUpperCase().includes('MRGN');
                          return (
                            <Chip
                              key={index}
                              icon={<BugReport />}
                              label={`${infection.type}${infection.location ? ` (${infection.location})` : ''}${infection.status === 'active' ? ' - Aktiv' : infection.status === 'resolved' ? ' - Abgeklungen' : infection.status === 'colonized' ? ' - Kolonisiert' : ''}`}
                              color={isMRSAOrMRGN ? 'error' : 'success'}
                              size="small"
                              sx={{ fontWeight: infection.status === 'active' ? 600 : 400 }}
                            />
                          );
                        })}
                      </Box>
                      <RecordedInfo fieldName="infections" />
                    </Box>
                  )}
                  
                  {patient.allergies && patient.allergies.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Allergien</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                        {patient.allergies.map((allergy, index) => (
                          <Chip
                            key={index}
                            label={typeof allergy === 'string' ? allergy : allergy.description}
                            color="warning"
                            size="small"
                          />
                        ))}
                      </Box>
                      <RecordedInfo fieldName="allergies" />
                    </Box>
                  )}
                  {patient.currentMedications && patient.currentMedications.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Aktuelle Medikamente</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 0.5 }}>
                        {patient.currentMedications.map((medication, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <LocalPharmacy color="primary" />
                            <Box sx={{ flex: 1 }}>
                              <Typography 
                                variant="body2"
                                sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined }}
                              >
                                {typeof medication === 'string' ? medication : medication.name}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                      <RecordedInfo fieldName="currentMedications" />
                    </Box>
                  )}
                  
                  {/* Vorerkrankungen */}
                  {patient.preExistingConditions && patient.preExistingConditions.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Vorerkrankungen</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 0.5 }}>
                        {patient.preExistingConditions.map((condition, index) => (
                          <Typography 
                            key={index} 
                            variant="body2"
                            sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined }}
                          >
                            • {condition}
                          </Typography>
                        ))}
                      </Box>
                      <RecordedInfo fieldName="preExistingConditions" />
                    </Box>
                  )}
                  
                  {/* Medizinische Vorgeschichte */}
                  {patient.medicalHistory && patient.medicalHistory.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Medizinische Vorgeschichte</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 0.5 }}>
                        {patient.medicalHistory.map((history, index) => (
                          <Typography 
                            key={index} 
                            variant="body2"
                            sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined }}
                          >
                            • {history}
                          </Typography>
                        ))}
                      </Box>
                      <RecordedInfo fieldName="medicalHistory" />
                    </Box>
                  )}
                  
                  {/* Impfungen */}
                  {patient.vaccinations && patient.vaccinations.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Impfungen</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 0.5 }}>
                        {patient.vaccinations.map((vaccination, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Vaccines color="primary" />
                            <Box sx={{ flex: 1 }}>
                              <Typography 
                                variant="body2"
                                sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined }}
                              >
                                <strong>{vaccination.name}</strong>
                              </Typography>
                              {vaccination.date && (
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined,
                                    display: 'inline-block'
                                  }}
                                >
                                  Datum: {new Date(vaccination.date).toLocaleDateString('de-DE')}
                                </Typography>
                              )}
                              {vaccination.nextDue && (
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    ml: 1,
                                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined,
                                    display: 'inline-block'
                                  }}
                                >
                                  Nächste fällig: {new Date(vaccination.nextDue).toLocaleDateString('de-DE')}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                      <RecordedInfo fieldName="vaccinations" />
                    </Box>
                  )}
                  
                  {/* Schwangerschaft & Stillen */}
                  {(patient.isPregnant || patient.isBreastfeeding) && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Schwangerschaft & Stillen</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 0.5 }}>
                        {patient.isPregnant && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PregnantWoman color="primary" />
                            <Typography 
                              variant="body2"
                              sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined }}
                            >
                              Schwanger{patient.pregnancyWeek ? ` - ${patient.pregnancyWeek}. Woche` : ''}
                            </Typography>
                          </Box>
                        )}
                        {patient.isBreastfeeding && (
                          <Typography 
                            variant="body2"
                            sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined }}
                          >
                            Stillend
                          </Typography>
                        )}
                      </Box>
                      {patient.isPregnant && <RecordedInfo fieldName="isPregnant" />}
                      {patient.isBreastfeeding && <RecordedInfo fieldName="isBreastfeeding" />}
                    </Box>
                  )}
                  
                  {/* Implantate & Geräte */}
                  {(patient.hasPacemaker || patient.hasDefibrillator || (patient.implants && patient.implants.length > 0)) && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Implantate & Geräte</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 0.5 }}>
                        {patient.hasPacemaker && (
                          <Typography 
                            variant="body2"
                            sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined }}
                          >
                            • Schrittmacher
                          </Typography>
                        )}
                        {patient.hasDefibrillator && (
                          <Typography 
                            variant="body2"
                            sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined }}
                          >
                            • Defibrillator
                          </Typography>
                        )}
                        {patient.implants && patient.implants.map((implant, index) => (
                          <Typography 
                            key={index} 
                            variant="body2"
                            sx={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined }}
                          >
                            • {implant.type}{implant.location ? ` (${implant.location})` : ''}{implant.date ? ` - ${new Date(implant.date).toLocaleDateString('de-DE')}` : ''}
                          </Typography>
                        ))}
                      </Box>
                      {patient.hasPacemaker && <RecordedInfo fieldName="hasPacemaker" />}
                      {patient.hasDefibrillator && <RecordedInfo fieldName="hasDefibrillator" />}
                      {patient.implants && patient.implants.length > 0 && <RecordedInfo fieldName="implants" />}
                    </Box>
                  )}
                  
                  {/* Raucherstatus */}
                  {patient.smokingStatus && patient.smokingStatus !== 'non-smoker' && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Raucherstatus</Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          mb: 0.5,
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
                        }}
                      >
                        {patient.smokingStatus === 'current-smoker' ? 'Raucher' : patient.smokingStatus === 'former-smoker' ? 'Ehemaliger Raucher' : 'Nichtraucher'}
                        {patient.cigarettesPerDay && ` - ${patient.cigarettesPerDay} Zigaretten/Tag`}
                        {patient.yearsOfSmoking && ` - ${patient.yearsOfSmoking} Jahre`}
                        {patient.quitSmokingDate && ` - Aufgehört: ${new Date(patient.quitSmokingDate).toLocaleDateString('de-DE')}`}
                      </Typography>
                      <RecordedInfo fieldName="smokingStatus" />
                    </Box>
                  )}
                  
                  {/* Medizinische Notizen */}
                  {patient.medicalNotes && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Medizinische Notizen</Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          whiteSpace: 'pre-wrap', 
                          mb: 0.5,
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
                        }}
                      >
                        {patient.medicalNotes}
                      </Typography>
                      <RecordedInfo fieldName="notes" />
                    </Box>
                  )}
                </Grid>
              </Grid>
              
              {/* Historie der medizinischen Daten */}
              {patientId && (
                <Box sx={{ mt: 3 }}>
                  <MedicalDataHistory patientId={patientId} />
                </Box>
              )}
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Kein Patient ausgewählt
              </Typography>
            </Paper>
          )}
          </ErrorBoundary>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {/* Diagnosen Tab */}
          <ErrorBoundary>
            {patientId ? (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Diagnosen</Typography>
                <Divider sx={{ mb: 2 }} />
                <DiagnosisManager
                  patientId={patientId}
                  allowEdit={true}
                  showPrimaryToggle={true}
                  context="medical"
                />
              </Paper>
            ) : (
              <Paper sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Kein Patient ausgewählt
                </Typography>
              </Paper>
            )}
          </ErrorBoundary>
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          {/* Vitalwerte Tab */}
          <ErrorBoundary>
          {patientId ? (
            <VitalSignsManager patientId={patientId} />
          ) : (
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Kein Patient ausgewählt
              </Typography>
            </Paper>
          )}
          </ErrorBoundary>
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          {/* Labor Tab */}
          <ErrorBoundary>
            {patientId ? (
              <LaborResults patientId={patientId} />
            ) : (
              <Paper sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Kein Patient ausgewählt
                </Typography>
              </Paper>
            )}
          </ErrorBoundary>
        </TabPanel>

        <TabPanel value={activeTab} index={6}>
          {/* DICOM Tab */}
          <ErrorBoundary>
            {patientId ? (
              <Paper sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">DICOM-Studien</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<CloudDownloadIcon />}
                      onClick={() => setDicomRetrieveOpen(true)}
                    >
                      Von PACS abrufen
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setDicomUploadOpen(true)}
                    >
                      DICOM hochladen
                    </Button>
                  </Box>
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
          </ErrorBoundary>
        </TabPanel>



        <TabPanel value={activeTab} index={10}>
          {/* Stammdaten Tab - wird über Button aufgerufen */}
          <ErrorBoundary>
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
          </ErrorBoundary>
        </TabPanel>

        <TabPanel value={activeTab} index={7}>
          {/* Dokumente Tab */}
          <ErrorBoundary>
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
          </ErrorBoundary>
        </TabPanel>

        <TabPanel value={activeTab} index={8}>
          {/* Termine Tab */}
          <ErrorBoundary>
            {patientId ? (
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Termine</Typography>
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
          </ErrorBoundary>
        </TabPanel>

        <TabPanel value={activeTab} index={9}>
          {/* Fotos Tab */}
          <ErrorBoundary>
          {patientId ? (
            <PatientPhotoGallery patientId={patientId} />
          ) : (
              <Paper sx={{ p: 2 }}>
            <Alert severity="warning">
              Keine Patient-ID gefunden. Bitte wählen Sie einen Patienten aus.
            </Alert>
              </Paper>
          )}
          </ErrorBoundary>
        </TabPanel>
      </Box>

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
                color: 'primary.contrastText',
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
                value={formatDateForInput(editData.dateOfBirth) || ''}
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
                sx={{ minWidth: 200, flex: 1 }}
              />
              <TextField
                label="E-Mail"
                type="email"
                value={editData.email || ''}
                onChange={(e) => handleEditDataChange('email', e.target.value)}
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
              <TextField
                label="Versicherungsnummer"
                value={editData.insuranceNumber || ''}
                onChange={(e) => handleEditDataChange('insuranceNumber', e.target.value)}
                placeholder="Versicherungsnummer"
                sx={{ minWidth: 200, flex: 1 }}
              />
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
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value && !validatePhone(value)) {
                    setEmergencyPhoneError(getPhoneErrorMessage());
                  } else {
                    setEmergencyPhoneError(null);
                  }
                }}
                error={!!emergencyPhoneError}
                helperText={emergencyPhoneError || getPhoneErrorMessage()}
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
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value && !validatePhone(value)) {
                    setPrimaryCarePhoneError(getPhoneErrorMessage());
                  } else {
                    setPrimaryCarePhoneError(null);
                  }
                }}
                error={!!primaryCarePhoneError}
                helperText={primaryCarePhoneError || getPhoneErrorMessage()}
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
          {patient?.isTemporary && (
            <Button 
              onClick={handleMarkAsComplete}
              variant="outlined"
              color="success"
              sx={{ mr: 'auto' }}
            >
              Als vollständig markieren
            </Button>
          )}
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
                    value={formatDateForInput(vaccination.date) || ''}
                    onChange={(e) => handleVaccinationChange(index, 'date', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 120 }}
                  />
                  <TextField
                    label="Nächste fällig"
                    type="date"
                    value={formatDateForInput(vaccination.nextDue) || ''}
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
                      <>
                        <TextField
                          label="Schwangerschaftswoche"
                          type="number"
                          value={medicalData.pregnancyWeek || ''}
                          onChange={(e) => handleMedicalDataChange('pregnancyWeek', e.target.value)}
                          sx={{ minWidth: 180, flex: 1 }}
                          inputProps={{ min: 1, max: 42 }}
                          helperText={medicalData.pregnancyWeek ? `${medicalData.pregnancyWeek}. Woche` : "1-42 Wochen (wird automatisch berechnet)"}
                        />
                        <TextField
                          label="Letzte Menstruation"
                          type="date"
                          value={(medicalData as any).lastMenstrualPeriod || ''}
                          onChange={(e) => handleMedicalDataChange('lastMenstrualPeriod', e.target.value)}
                          sx={{ minWidth: 180, flex: 1 }}
                          InputLabelProps={{ shrink: true }}
                          helperText="Wird zur automatischen Berechnung der Schwangerschaftswoche verwendet"
                        />
                        <TextField
                          label="Entbindungstermin"
                          type="date"
                          value={medicalData.pregnancyDueDate ? (typeof medicalData.pregnancyDueDate === 'string' ? medicalData.pregnancyDueDate : formatDateForInput(medicalData.pregnancyDueDate)) : ''}
                          onChange={(e) => handleMedicalDataChange('pregnancyDueDate', e.target.value)}
                          sx={{ minWidth: 180, flex: 1 }}
                          InputLabelProps={{ shrink: true }}
                          helperText="Alternativ zur Berechnung der Schwangerschaftswoche"
                        />
                      </>
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
                  {medicalData.isPregnant && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        {medicalData.pregnancyWeek 
                          ? `Aktuelle Schwangerschaftswoche: ${medicalData.pregnancyWeek}. Woche`
                          : 'Bitte geben Sie die letzte Menstruation oder den Entbindungstermin ein, um die Schwangerschaftswoche automatisch zu berechnen.'}
                      </Typography>
                    </Alert>
                  )}
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
                    value={formatDateForInput(implant.date) || ''}
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
                  value={formatDateForInput(medicalData.quitSmokingDate) || ''}
                  onChange={(e) => handleMedicalDataChange('quitSmokingDate', e.target.value)}
                  sx={{ minWidth: 150, flex: 1 }}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            </Box>

            {/* Infektionen */}
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Infektionen</Typography>
            <Box sx={{ mb: 2 }}>
              {medicalData.infections?.map((infection, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <TextField
                    label="Infektionstyp"
                    value={infection.type}
                    onChange={(e) => {
                      const newInfections = [...(medicalData.infections || [])];
                      newInfections[index] = { ...infection, type: e.target.value };
                      handleMedicalDataChange('infections', newInfections);
                    }}
                    size="small"
                    sx={{ minWidth: 150, flex: 1 }}
                    placeholder="z.B. MRSA, MRGN, VRE"
                  />
                  <TextField
                    label="Lokalisation"
                    value={infection.location || ''}
                    onChange={(e) => {
                      const newInfections = [...(medicalData.infections || [])];
                      newInfections[index] = { ...infection, location: e.target.value };
                      handleMedicalDataChange('infections', newInfections);
                    }}
                    size="small"
                    sx={{ minWidth: 120, flex: 1 }}
                    placeholder="z.B. Wunde, Urin"
                  />
                  <TextField
                    label="Nachweisdatum"
                    type="date"
                    value={formatDateForInput(infection.detectedDate) || ''}
                    onChange={(e) => {
                      const newInfections = [...(medicalData.infections || [])];
                      newInfections[index] = { ...infection, detectedDate: e.target.value };
                      handleMedicalDataChange('infections', newInfections);
                    }}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 150 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={infection.status || 'active'}
                      onChange={(e) => {
                        const newInfections = [...(medicalData.infections || [])];
                        newInfections[index] = { ...infection, status: e.target.value as 'active' | 'resolved' | 'colonized' };
                        handleMedicalDataChange('infections', newInfections);
                      }}
                      label="Status"
                    >
                      <MenuItem value="active">Aktiv</MenuItem>
                      <MenuItem value="resolved">Abgeklungen</MenuItem>
                      <MenuItem value="colonized">Kolonisiert</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Notizen"
                    value={infection.notes || ''}
                    onChange={(e) => {
                      const newInfections = [...(medicalData.infections || [])];
                      newInfections[index] = { ...infection, notes: e.target.value };
                      handleMedicalDataChange('infections', newInfections);
                    }}
                    size="small"
                    sx={{ minWidth: 120, flex: 1 }}
                  />
                  <Button 
                    size="small" 
                    color="error"
                    onClick={() => {
                      const newInfections = [...(medicalData.infections || [])];
                      newInfections.splice(index, 1);
                      handleMedicalDataChange('infections', newInfections);
                    }}
                  >
                    Entfernen
                  </Button>
                </Box>
              ))}
              <Button 
                size="small" 
                startIcon={<Add />}
                onClick={() => {
                  const newInfections = [...(medicalData.infections || []), { type: '', status: 'active' as const }];
                  handleMedicalDataChange('infections', newInfections);
                }}
                sx={{ mb: 2 }}
              >
                Infektion hinzufügen
              </Button>
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
            // Lade Dekurs-Einträge neu für EPA
            if (patientId) {
              dispatch(fetchDekursEntries({ patientId, limit: 1000 }));
              // WICHTIG: Lade auch Diagnosen neu, wenn der Dekurs finalisiert wurde
              // Dies stellt sicher, dass neue Diagnosen aus linkedDiagnoses im Diagnosen-Tab und in der EPA erscheinen
              if (entry.status === 'finalized') {
                dispatch(fetchPatientDiagnoses({ patientId }));
              }
            }
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
        <>
          <DicomUpload
            open={dicomUploadOpen}
            onClose={() => setDicomUploadOpen(false)}
            patientId={patientId}
            onUploadSuccess={() => {
              setDicomUploadOpen(false);
              // Reload DICOM studies
              if (patientId) {
                // Trigger reload of DicomStudiesList
                window.dispatchEvent(new Event('dicom-studies-reload'));
              }
            }}
          />
          <DicomRetrieveDialog
            open={dicomRetrieveOpen}
            onClose={() => setDicomRetrieveOpen(false)}
            patientId={patientId}
            onRetrieveSuccess={() => {
              setDicomRetrieveOpen(false);
              // Reload DICOM studies
              if (patientId) {
                window.dispatchEvent(new Event('dicom-studies-reload'));
              }
            }}
          />
        </>
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

      {/* Patienten-/Arztbrief Dialog */}
      <Dialog
        open={letterDialogOpen}
        onClose={() => setLetterDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">
            Brief erstellen
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Wählen Sie den Typ des Briefs, den Sie erstellen möchten:
          </Typography>
          <Stack spacing={2}>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<Description />}
              onClick={() => handleCreateLetterType('arztbrief')}
              disabled={isCreatingDocument}
              sx={{
                py: 2,
                justifyContent: 'flex-start'
              }}
            >
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body1" fontWeight="bold">
                  Arztbrief
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Medizinischer Bericht für andere Ärzte oder Einrichtungen
                </Typography>
              </Box>
            </Button>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<Description />}
              onClick={() => {
                setLetterDialogOpen(false);
                setDocumentTypeDialogOpen(true);
              }}
              disabled={isCreatingDocument}
              sx={{
                py: 2,
                justifyContent: 'flex-start'
              }}
            >
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body1" fontWeight="bold">
                  Patientenbrief
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Informationsschreiben für den Patienten
                </Typography>
              </Box>
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLetterDialogOpen(false)} disabled={isCreatingDocument}>
            Abbrechen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dokumenttyp-Auswahl Dialog (Patientenbrief oder Arztbrief) */}
      <Dialog open={documentTypeDialogOpen} onClose={() => setDocumentTypeDialogOpen(false)}>
        <DialogTitle>Brieftyp auswählen</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={() => {
                setSelectedDocumentType('patientenbrief');
                setDocumentTypeDialogOpen(false);
                setSourceDialogOpen(true);
              }}
            >
              Patientenbrief
            </Button>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={() => {
                setSelectedDocumentType('arztbrief');
                setDocumentTypeDialogOpen(false);
                setSourceDialogOpen(true);
              }}
            >
              Arztbrief
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentTypeDialogOpen(false)}>Abbrechen</Button>
        </DialogActions>
      </Dialog>

      {/* Quelle-Auswahl Dialog (Leer oder aus Dekurs) */}
      <Dialog open={sourceDialogOpen} onClose={() => {
        setSourceDialogOpen(false);
        setSelectedDocumentType(null);
        setSelectedSource(null);
      }}>
        <DialogTitle>Quelle auswählen</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={() => {
                setSelectedSource('leer');
                setSourceDialogOpen(false);
                setPatientenbriefDialogOpen(true);
              }}
            >
              Leer
            </Button>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={() => {
                setSelectedSource('dekurs');
                setSourceDialogOpen(false);
                setDekursSelectionDialogOpen(true);
              }}
            >
              Aus Dekurs
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSourceDialogOpen(false);
            setSelectedDocumentType(null);
            setSelectedSource(null);
          }}>Abbrechen</Button>
        </DialogActions>
      </Dialog>

      {/* Dekurs-Auswahl Dialog */}
      <Dialog 
        open={dekursSelectionDialogOpen} 
        onClose={() => {
          setDekursSelectionDialogOpen(false);
          setSelectedDekursForLetter(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Dekurs-Eintrag auswählen</DialogTitle>
        <DialogContent>
          {dekursEntries && dekursEntries.length > 0 ? (
            <Stack spacing={1} sx={{ mt: 2, maxHeight: 400, overflow: 'auto' }}>
              {dekursEntries.map((entry: any, index: number) => (
                <Paper
                  key={entry._id || index}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    border: selectedDekursForLetter?._id === entry._id ? '2px solid' : '1px solid #e0e0e0',
                    borderColor: selectedDekursForLetter?._id === entry._id ? 'primary.main' : '#e0e0e0'
                  }}
                  onClick={() => setSelectedDekursForLetter(entry)}
                >
                  <Typography variant="subtitle1" fontWeight="bold">
                    {entry.entryDate ? new Date(entry.entryDate).toLocaleDateString('de-DE') : 'Kein Datum'}
                  </Typography>
                  {entry.visitReason && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Grund: {entry.visitReason}
                    </Typography>
                  )}
                  {entry.clinicalObservations && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {entry.clinicalObservations.substring(0, 100)}...
                    </Typography>
                  )}
                </Paper>
              ))}
            </Stack>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              Keine Dekurs-Einträge verfügbar.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDekursSelectionDialogOpen(false);
            setSelectedDekursForLetter(null);
          }}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedDekursForLetter) {
                setDekursSelectionDialogOpen(false);
                setPatientenbriefDialogOpen(true);
              }
            }}
            disabled={!selectedDekursForLetter}
          >
            Weiter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Patientenbrief Dialog */}
      <PatientenbriefDialog
        open={patientenbriefDialogOpen}
        onClose={() => {
          setPatientenbriefDialogOpen(false);
          setSelectedDocumentType(null);
          setSelectedSource(null);
          setSelectedDekursForLetter(null);
        }}
        patient={patient || null}
        location={currentLocation || null}
        documentType={selectedDocumentType || 'patientenbrief'}
        source={selectedSource || 'leer'}
        selectedDekursEntry={selectedDekursForLetter}
        onSaveSuccess={async (documentId) => {
          // Lade Dokumente neu, um den aktualisierten Status zu sehen
          if (patient?._id || patient?.id) {
            await dispatch(fetchDocuments({ patientId: patient._id || patient.id }));
          }
          dispatch(fetchDocuments({}));
          
          // Entfernt: Automatische Öffnung der Dokumentenvorschau nach dem Speichern
          // Das Dokument wird nicht mehr automatisch geöffnet, nachdem es gespeichert wurde
          
          setSnackbar({
            open: true,
            message: `${selectedDocumentType === 'arztbrief' ? 'Arztbrief' : 'Patientenbrief'} erfolgreich erstellt.`,
            severity: 'success'
          });
          setSelectedDocumentType(null);
          setSelectedSource(null);
          setSelectedDekursForLetter(null);
        }}
      />

      {/* Standalone-Vorlagen-Auswahl Dialog */}
      <Dialog
        open={standaloneTemplateDialogOpen}
        onClose={() => {
          setStandaloneTemplateDialogOpen(false);
          setTemplateSearchQuery('');
          setTemplateFilterCategory('all');
          setTemplateFilterSpecialty('all');
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '80vh', display: 'flex', flexDirection: 'column' }
        }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Vorlage auswählen</Typography>
            <IconButton
              onClick={() => {
                setStandaloneTemplateDialogOpen(false);
                setTemplateSearchQuery('');
                setTemplateFilterCategory('all');
                setTemplateFilterSpecialty('all');
              }}
              size="small"
            >
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Such- und Filter-Bereich */}
          <Stack spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Vorlagen durchsuchen..."
              value={templateSearchQuery}
              onChange={(e) => setTemplateSearchQuery(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Kategorie</InputLabel>
                <Select
                  value={templateFilterCategory}
                  label="Kategorie"
                  onChange={(e) => setTemplateFilterCategory(e.target.value)}
                >
                  <MenuItem value="all">Alle Kategorien</MenuItem>
                  <MenuItem value="ueberweisung">Überweisung</MenuItem>
                  <MenuItem value="arztbrief">Arztbrief</MenuItem>
                  <MenuItem value="rezept">Rezept</MenuItem>
                  <MenuItem value="attest">Attest</MenuItem>
                  <MenuItem value="befund">Befund</MenuItem>
                  <MenuItem value="sonstiges">Sonstiges</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Fachrichtung</InputLabel>
                <Select
                  value={templateFilterSpecialty}
                  label="Fachrichtung"
                  onChange={(e) => setTemplateFilterSpecialty(e.target.value)}
                >
                  <MenuItem value="all">Alle Fachrichtungen</MenuItem>
                  <MenuItem value="allgemeinmedizin">Allgemeinmedizin</MenuItem>
                  <MenuItem value="innere_medizin">Innere Medizin</MenuItem>
                  <MenuItem value="chirurgie">Chirurgie</MenuItem>
                  <MenuItem value="paediatrie">Pädiatrie</MenuItem>
                  <MenuItem value="gynaekologie">Gynäkologie</MenuItem>
                  <MenuItem value="dermatologie">Dermatologie</MenuItem>
                  <MenuItem value="neurologie">Neurologie</MenuItem>
                  <MenuItem value="psychiatrie">Psychiatrie</MenuItem>
                  <MenuItem value="orthopaedie">Orthopädie</MenuItem>
                  <MenuItem value="andere">Andere</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>

          {/* Vorlagen-Liste */}
          <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
            {loadingStandaloneTemplates ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                <CircularProgress />
              </Box>
            ) : (() => {
              // Filtere Vorlagen
              let filteredTemplates = standaloneTemplates;
              
              // Suchfilter
              if (templateSearchQuery) {
                const query = templateSearchQuery.toLowerCase();
                filteredTemplates = filteredTemplates.filter(t => 
                  t.name.toLowerCase().includes(query) ||
                  (t.description && t.description.toLowerCase().includes(query)) ||
                  (t.documentType && t.documentType.toLowerCase().includes(query))
                );
              }
              
              // Kategorie-Filter
              if (templateFilterCategory !== 'all') {
                filteredTemplates = filteredTemplates.filter(t => 
                  t.category === templateFilterCategory || t.documentType === templateFilterCategory
                );
              }
              
              // Fachrichtungs-Filter
              if (templateFilterSpecialty !== 'all') {
                filteredTemplates = filteredTemplates.filter(t => 
                  t.medicalSpecialty === templateFilterSpecialty
                );
              }

              if (filteredTemplates.length === 0) {
                return (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {standaloneTemplates.length === 0 
                      ? 'Keine freigegebenen Vorlagen verfügbar'
                      : 'Keine Vorlagen gefunden, die den Filterkriterien entsprechen'}
                  </Alert>
                );
              }

              return (
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                  gap: 2
                }}>
                  {filteredTemplates.map((template) => {
                    const templateId = template._id || (template as any).id;
                    return (
                      <Card
                        key={templateId}
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 4
                          }
                        }}
                        onClick={() => {
                          if (!templateId) {
                            console.error('[PatientOrganizer] Template has no _id!', template);
                            alert('Fehler: Vorlage hat keine ID');
                            return;
                          }
                          setSelectedStandaloneTemplateId(templateId);
                          setStandaloneTemplateDialogOpen(false);
                          setStandaloneDocumentDialogOpen(true);
                          setTemplateSearchQuery('');
                          setTemplateFilterCategory('all');
                          setTemplateFilterSpecialty('all');
                        }}
                      >
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <Stack spacing={1} sx={{ flex: 1 }}>
                            <Typography variant="h6" component="div" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                              {template.name}
                            </Typography>
                            {template.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                flex: 1
                              }}>
                                {template.description}
                              </Typography>
                            )}
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 'auto', pt: 1 }}>
                              {template.documentType && (
                                <Chip 
                                  label={template.documentType} 
                                  size="small" 
                                  color="primary"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              )}
                              {template.medicalSpecialty && (
                                <Chip 
                                  label={template.medicalSpecialty} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              )}
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              );
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setStandaloneTemplateDialogOpen(false);
              setTemplateSearchQuery('');
              setTemplateFilterCategory('all');
              setTemplateFilterSpecialty('all');
            }}
          >
            Abbrechen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dokumentenvorschau-Dialog */}
      {documentPreviewDialogOpen && (
        <StandaloneDocumentDialog
          open={documentPreviewDialogOpen}
          onClose={() => {
            console.log('📄 Dialog wird geschlossen');
            setDocumentPreviewDialogOpen(false);
            setPreviewDocument(null);
          }}
          patient={patient || null}
          location={currentLocation || null}
          templateId={null}
          documentId={previewDocument?._id || previewDocument?.id || null}
          document={previewDocument || null}
        />
      )}

      {/* Standalone-Dokument Dialog */}
      <StandaloneDocumentDialog
        open={standaloneDocumentDialogOpen}
        onClose={() => {
          setStandaloneDocumentDialogOpen(false);
          setSelectedStandaloneTemplateId(null);
        }}
        patient={patient || null}
        location={currentLocation || null}
        templateId={selectedStandaloneTemplateId}
        onSaveSuccess={async (documentId) => {
          // Lade Dokumente neu, um den aktualisierten Status zu sehen
          // Lade sowohl patientenspezifische als auch alle Dokumente (für Dokumentenverwaltung)
          if (patient?._id || patient?.id) {
            await dispatch(fetchDocuments({ patientId: patient._id || patient.id }));
          }
          // Lade auch alle Dokumente, um sicherzustellen, dass die Dokumentenverwaltung aktualisiert wird
          dispatch(fetchDocuments({}));
          
          // Dialog wird automatisch geschlossen, keine automatische Vorschau mehr
          
          setSnackbar({
            open: true,
            message: 'Dokument erfolgreich erstellt. Sie finden es im Tab "Dokumente".',
            severity: 'success'
          });
          setSelectedStandaloneTemplateId(null);
        }}
      />

      {/* Hinweis-Details Dialog */}
      <Dialog
        open={hintDetailsDialogOpen}
        onClose={() => {
          setHintDetailsDialogOpen(false);
          setHintEditMode(false);
          setHintTextEdit('');
          setOnlineBookingBlockedEdit(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="warning" />
            <Typography variant="h6">
              {hintEditMode ? 'Hinweis bearbeiten' : 'Hinweis für'} {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => {
              setHintDetailsDialogOpen(false);
              setHintEditMode(false);
              setHintTextEdit('');
              setOnlineBookingBlockedEdit(false);
            }}
            sx={{ ml: 2 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {hintEditMode ? (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={6}
                value={hintTextEdit}
                onChange={(e) => setHintTextEdit(e.target.value)}
                placeholder="Hinweistext eingeben..."
                variant="outlined"
                label="Hinweistext"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={patient?.hasHint || false}
                    onChange={async (e) => {
                      if (!patient) return;
                      try {
                        const updatedPatient = {
                          hasHint: e.target.checked,
                          hintText: e.target.checked ? hintTextEdit : ''
                        };
                        await dispatch(updatePatient({ 
                          id: (patient._id || patient.id)!, 
                          patientData: updatedPatient 
                        }));
                        setSnackbar({
                          open: true,
                          message: e.target.checked ? 'Hinweis wurde aktiviert' : 'Hinweis wurde deaktiviert',
                          severity: 'success'
                        });
                      } catch (error) {
                        console.error('Fehler beim Aktualisieren des Hinweises:', error);
                      }
                    }}
                  />
                }
                label="Hinweis aktiviert"
                sx={{ mt: 2 }}
              />
              <Divider sx={{ my: 3 }} />
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Online-Buchung
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={onlineBookingBlockedEdit}
                      onChange={(e) => setOnlineBookingBlockedEdit(e.target.checked)}
                      color="warning"
                    />
                  }
                  label="Online-Buchung für diesen Patienten blockieren"
                />
                {onlineBookingBlockedEdit && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Dieser Patient kann keine Termine online buchen. Er muss sich telefonisch einen Termin vereinbaren.
                  </Alert>
                )}
              </Box>
            </Box>
          ) : (
            <>
              {patient?.hintText ? (
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                  {patient.hintText}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Dieser Patient hat einen Hinweis erhalten, aber es wurde noch kein Hinweistext eingegeben.
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          {hintEditMode ? (
            <>
              <Button 
                onClick={() => {
                  setHintEditMode(false);
                  setHintTextEdit('');
                }}
              >
                Abbrechen
              </Button>
              <Button 
                variant="contained" 
                color="warning"
                startIcon={<Save />}
                onClick={async () => {
                  if (!patient) return;
                  try {
                    const updatedPatient = {
                      hasHint: true,
                      hintText: hintTextEdit.trim(),
                      onlineBookingBlocked: Boolean(onlineBookingBlockedEdit)
                    };
                    await dispatch(updatePatient({ 
                      id: (patient._id || patient.id)!, 
                      patientData: updatedPatient 
                    }));
                    setSnackbar({
                      open: true,
                      message: 'Hinweis und Einstellungen wurden gespeichert',
                      severity: 'success'
                    });
                    setHintEditMode(false);
                    setHintTextEdit('');
                    setOnlineBookingBlockedEdit(false);
                    setHintDetailsDialogOpen(false);
                  } catch (error) {
                    console.error('Fehler beim Speichern des Hinweises:', error);
                    setSnackbar({
                      open: true,
                      message: 'Fehler beim Speichern des Hinweises',
                      severity: 'error'
                    });
                  }
                }}
              >
                Speichern
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => {
                setHintDetailsDialogOpen(false);
                setHintEditMode(false);
                setHintTextEdit('');
                setOnlineBookingBlockedEdit(false);
              }}>
                Schließen
              </Button>
              {patient && (
                <Button 
                  variant="outlined" 
                  startIcon={<Edit />}
                  onClick={() => {
                    setHintTextEdit(patient.hintText || '');
                    setOnlineBookingBlockedEdit(patient.onlineBookingBlocked || false);
                    setHintEditMode(true);
                  }}
                >
                  Bearbeiten
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Notizen Dialog - Chronologisch mit Bearbeitungshistorie */}
      <Dialog
        open={notesDialogOpen}
        onClose={() => {
          setNotesDialogOpen(false);
          setNotesEdit('');
          setMedicalNotesEdit('');
          setEditingNote(null);
          setNewNoteType('general');
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Description />
            <Typography variant="h6">
              Notizen für {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => {
              setNotesDialogOpen(false);
              setNotesEdit('');
              setMedicalNotesEdit('');
              setEditingNote(null);
              setNewNoteType('general');
            }}
            sx={{ ml: 2 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Neue Notiz erstellen */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Neue Notiz erstellen
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Notiz-Typ</InputLabel>
                <Select
                  value={newNoteType}
                  onChange={(e) => setNewNoteType(e.target.value as 'general' | 'medical')}
                  label="Notiz-Typ"
                >
                  <MenuItem value="general">Allgemeine Notiz</MenuItem>
                  <MenuItem value="medical">Medizinische Notiz</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={notesEdit}
                onChange={(e) => setNotesEdit(e.target.value)}
                placeholder={newNoteType === 'general' ? 'Allgemeine Notizen zum Patienten eingeben...' : 'Medizinische Notizen zum Patienten eingeben...'}
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={async () => {
                  if (!patient || !notesEdit.trim()) return;
                  try {
                    const response: any = await api.post('/patient-notes', {
                      patientId: patient._id || patient.id,
                      content: notesEdit.trim(),
                      noteType: newNoteType
                    });
                    if (response?.data?.success) {
                      // Lade Notizen neu
                      const notesResponse: any = await api.get(`/patient-notes/${patient._id || patient.id}?chronological=true`);
                      if (notesResponse?.data?.success) {
                        setPatientNotes(notesResponse.data.data || []);
                      }
                      // Lade Dekurs-Einträge neu, damit der neue EPA-Eintrag sofort sichtbar ist
                      const currentPatientId = patient._id || patient.id;
                      if (currentPatientId) {
                        dispatch(fetchDekursEntries({ patientId: String(currentPatientId), limit: 1000 }));
                      }
                      setNotesEdit('');
                      setSnackbar({
                        open: true,
                        message: 'Notiz wurde erfolgreich erstellt',
                        severity: 'success'
                      });
                    }
                  } catch (error) {
                    console.error('Fehler beim Erstellen der Notiz:', error);
                    setSnackbar({
                      open: true,
                      message: 'Fehler beim Erstellen der Notiz',
                      severity: 'error'
                    });
                  }
                }}
                disabled={!notesEdit.trim()}
              >
                Notiz hinzufügen
              </Button>
            </Box>

            {/* Notizen-Liste (chronologisch) */}
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Notizen (chronologisch - älteste zuerst)
            </Typography>
            {loadingNotes ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : patientNotes.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                <Typography>Noch keine Notizen vorhanden</Typography>
              </Box>
            ) : (
              <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {memoizedNotesList}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setNotesDialogOpen(false);
              setNotesEdit('');
              setMedicalNotesEdit('');
              setEditingNote(null);
              setNewNoteType('general');
            }}
          >
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bearbeitungshistorie Dialog */}
      <Dialog
        open={noteHistoryDialogOpen}
        onClose={() => {
          setNoteHistoryDialogOpen(false);
          setSelectedNoteForHistory(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Bearbeitungshistorie
        </DialogTitle>
        <DialogContent>
          {selectedNoteForHistory && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Originale Notiz (erstellt am {format(new Date(selectedNoteForHistory.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}):
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedNoteForHistory.content}
                </Typography>
              </Box>
              {selectedNoteForHistory.editHistory && selectedNoteForHistory.editHistory.length > 0 ? (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Bearbeitungen:
                  </Typography>
                  {selectedNoteForHistory.editHistory.map((edit: any, index: number) => (
                    <Card key={index} sx={{ mb: 2, p: 2 }}>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Bearbeitet am {format(new Date(edit.editedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                        {edit.editedBy && typeof edit.editedBy === 'object' && (
                          ` von ${edit.editedBy.firstName} ${edit.editedBy.lastName}`
                        )}
                      </Typography>
                      {edit.changeReason && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Grund: {edit.changeReason}
                        </Typography>
                      )}
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="error.main" sx={{ display: 'block', mb: 0.5 }}>
                          Vorheriger Inhalt:
                        </Typography>
                        <Box sx={{ p: 1, bgcolor: 'error.light', borderRadius: 0.5, mb: 1 }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                            {edit.previousContent}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="success.main" sx={{ display: 'block', mb: 0.5 }}>
                          Neuer Inhalt:
                        </Typography>
                        <Box sx={{ p: 1, bgcolor: 'success.light', borderRadius: 0.5 }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                            {edit.newContent}
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Keine Bearbeitungen vorhanden
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setNoteHistoryDialogOpen(false);
            setSelectedNoteForHistory(null);
          }}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Leistungsabrechnung Dialog */}
      <PerformanceForm
        open={performanceDialogOpen}
        onClose={() => setPerformanceDialogOpen(false)}
        onSave={async (performanceData: any) => {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(
              `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/billing/performances`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-auth-token': token || ''
                },
                body: JSON.stringify(performanceData)
              }
            );

            const result = await response.json();
            if (response.ok && result.success) {
              // Erfolgreich gespeichert
              setPerformanceDialogOpen(false);
              // Optional: Erfolgsmeldung anzeigen
            } else {
              throw new Error(result.message || 'Fehler beim Speichern der Leistung');
            }
          } catch (error: any) {
            console.error('Fehler beim Speichern der Leistung:', error);
            alert(error.message || 'Fehler beim Speichern der Leistung');
          }
        }}
        performance={patient ? {
          patientId: patient._id || patient.id,
          diagnosisCodes: (patientDiagnoses?.data || patientDiagnoses || [])
            .filter((diag: PatientDiagnosis) => diag.status === 'active')
            .map((diag: PatientDiagnosis) => diag.code)
            .filter((code: string) => code)
        } : undefined}
        patientDiagnoses={patientDiagnoses?.data || patientDiagnoses || []}
      />

      {/* Medikamenten-Manager Dialog */}
      <Dialog
        open={medicationManagerDialogOpen}
        onClose={() => setMedicationManagerDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Medikamente verwalten - {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
        </DialogTitle>
        <DialogContent>
          {patient && (
            <MedicationManager
              patientId={patient._id || patient.id}
              allowEdit={true}
              onMedicationChange={handleMedicationChange}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMedicationManagerDialogOpen(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientOrganizer;
