import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  Divider,
  MenuItem,
  TextField,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import {
  Save,
  Send,
  CheckCircle,
  Cancel,
  Article,
  LocalHospital,
  Person,
  CalendarToday,
  Wc,
  Fingerprint,
  Badge as BadgeIcon,
  VerifiedUser,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { useSnackbar } from 'notistack';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchPatients, Patient } from '../store/slices/patientSlice';
import AmbulanzbefundFormRenderer from '../components/AmbulanzbefundFormRenderer';
import ICD10Autocomplete from '../components/ICD10Autocomplete';
import { Specialization, AmbulanzbefundFormTemplate, Ambulanzbefund } from '../types/ambulanzbefund';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Icd10Code } from '../store/slices/icd10Slice';

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

const STEPS = ['Spezialisierung wählen', 'Template laden', 'Formular ausfüllen', 'Validierung & Abschluss'];

// Hilfsfunktion zur Altersberechnung
const calculateAge = (dateOfBirth: string): number => {
  if (!dateOfBirth) return 0;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Formatierung des Geschlechts
const formatGender = (gender: string): string => {
  if (!gender) return '—';
  const genderMap: Record<string, string> = {
    'm': 'männlich',
    'w': 'weiblich',
    'd': 'divers',
    'male': 'männlich',
    'female': 'weiblich',
    'other': 'divers',
    'männlich': 'männlich',
    'weiblich': 'weiblich',
    'divers': 'divers'
  };
  return genderMap[gender.toLowerCase()] || gender;
};

const AmbulanzbefundEditor: React.FC = () => {
  const { patientId, ambefundId } = useParams<{ patientId?: string; ambefundId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAppSelector((state) => state.auth);
  const { locations } = useAppSelector((state) => state.locations);
  const { patients } = useAppSelector((state) => state.patients);
  const dispatch = useAppDispatch();
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [specialization, setSpecialization] = useState<Specialization | ''>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [template, setTemplate] = useState<AmbulanzbefundFormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Array<{ field: string; message: string; severity: 'error' | 'warning' | 'info' }>>([]);
  const [currentAmbefund, setCurrentAmbefund] = useState<Ambulanzbefund | null>(null);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  
  // State für Diagnosen
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState<{ code: string; display: string } | null>(null);
  const [secondaryDiagnoses, setSecondaryDiagnoses] = useState<Array<{ code: string; display: string }>>([]);

  // Finde aktuellen Patienten
  const currentPatient = React.useMemo<Patient | null>(() => {
    if (!patientId) {
      // Falls kein patientId in URL, versuche es aus currentAmbefund zu holen
      if (currentAmbefund?.patientId) {
        const id = typeof currentAmbefund.patientId === 'string' 
          ? currentAmbefund.patientId 
          : (currentAmbefund.patientId as any)?._id || (currentAmbefund.patientId as any)?.id;
        const allPatients = (patients || []) as Patient[];
        return allPatients.find(p => (p._id || p.id) === id) || null;
      }
      return null;
    }
    const allPatients = (patients || []) as Patient[];
    return allPatients.find(p => (p._id || p.id) === patientId) || null;
  }, [patientId, patients, currentAmbefund]);

  // Lade patientId aus Query-Parametern falls nicht in URL
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const queryPatientId = queryParams.get('patientId');
    if (!patientId && queryPatientId) {
      console.log('Patient-ID aus Query-Parametern gefunden:', queryPatientId);
      // Setze patientId aus Query-Parametern - wird durch resolvedPatientId verwendet
    }
  }, [location.search, patientId]);

  // Lade bestehenden Ambulanzbefund wenn ambefundId vorhanden
  useEffect(() => {
    if (ambefundId && locations && locations.length > 0) {
      // Warte bis locations geladen sind, damit Location-ID korrekt gesetzt wird
      loadAmbulanzbefund(ambefundId);
    } else if (ambefundId) {
      loadAmbulanzbefund(ambefundId);
    }
  }, [ambefundId, locations]);

  // Lade Default-Location
  useEffect(() => {
    if (locations && locations.length > 0) {
      // Wenn selectedLocationId bereits gesetzt ist, prüfe ob sie in locations existiert
      if (selectedLocationId) {
        const locationExists = locations.some((loc: any) => 
          (loc._id || loc.id) === selectedLocationId
        );
        if (!locationExists) {
          // Location existiert nicht, setze Default
          const defaultLocation = locations.find((loc: any) => loc.is_active) || locations[0];
          if (defaultLocation) {
            setSelectedLocationId(defaultLocation._id || (defaultLocation as any).id);
          }
        }
      } else {
        // Keine Location ausgewählt, setze Default
        const defaultLocation = locations.find((loc: any) => loc.is_active) || locations[0];
        if (defaultLocation) {
          setSelectedLocationId(defaultLocation._id || (defaultLocation as any).id);
        }
      }
    }
  }, [locations, selectedLocationId]);

  // Lade Patienten wenn patientId vorhanden
  useEffect(() => {
    if (patientId && (!patients || patients.length === 0)) {
      dispatch(fetchPatients(1));
    }
  }, [patientId, patients, dispatch]);

  // Berechne die tatsächliche patientId (aus URL oder aus geladenem Ambulanzbefund)
  const resolvedPatientId = React.useMemo(() => {
    // PRIORITÄT 1: patientId aus URL (wenn Route /ambulanzbefund/new/:patientId verwendet wird)
    if (patientId) {
      console.log('resolvedPatientId: Verwende patientId aus URL:', patientId);
      return patientId;
    }
    
    // PRIORITÄT 2: patientId aus geladenem Ambulanzbefund
    if (currentAmbefund?.patientId) {
      const id = typeof currentAmbefund.patientId === 'string' 
        ? currentAmbefund.patientId 
        : (currentAmbefund.patientId as any)?._id || (currentAmbefund.patientId as any)?.id;
      console.log('resolvedPatientId: Verwende patientId aus currentAmbefund:', id);
      return id;
    }
    
    console.log('resolvedPatientId: Keine patientId gefunden');
    return null;
  }, [patientId, currentAmbefund]);
  
  // Erweitere resolvedPatientId um Query-Parameter
  const resolvedPatientIdWithQuery = React.useMemo(() => {
    if (resolvedPatientId) return resolvedPatientId;
    const queryParams = new URLSearchParams(location.search);
    return queryParams.get('patientId') || null;
  }, [resolvedPatientId, location.search]);

  const loadAmbulanzbefund = async (id: string) => {
    try {
      setLoading(true);
      const response = await apiRequest.get<{ success: boolean; data: Ambulanzbefund }>(
        `/ambulanzbefunde/${id}`
      );
      
      if (response.success && response.data) {
        const ambefund: Ambulanzbefund = (response.data as any).data || response.data;
        setCurrentAmbefund(ambefund);
        setSpecialization(ambefund.specialization);
        setFormData(ambefund.formData || {});
        setSelectedSections(ambefund.selectedSections || []);
        
        // Lade Diagnosen aus dem Ambulanzbefund
        if (ambefund.assessment?.primaryDiagnosis) {
          setPrimaryDiagnosis({
            code: ambefund.assessment.primaryDiagnosis.code,
            display: ambefund.assessment.primaryDiagnosis.display
          });
        }
        if (ambefund.assessment?.secondaryDiagnoses && ambefund.assessment.secondaryDiagnoses.length > 0) {
          setSecondaryDiagnoses(
            ambefund.assessment.secondaryDiagnoses.map(d => ({
              code: d.code,
              display: d.display
            }))
          );
        }
        
        // Setze Location-ID und prüfe ob sie in verfügbaren Locations ist
        const ambLocationId = typeof ambefund.locationId === 'string' 
          ? ambefund.locationId 
          : (ambefund.locationId as any)?._id || (ambefund.locationId as any)?.id;
        
        // Warte bis locations geladen sind, bevor wir die Location-ID setzen
        if (locations && locations.length > 0) {
          const locationExists = locations.some((loc: any) => 
            (loc._id || loc.id) === ambLocationId
          );
          if (locationExists && ambLocationId) {
            setSelectedLocationId(ambLocationId);
          } else if (locations.length > 0) {
            // Fallback auf erste verfügbare Location
            const defaultLocation = locations.find((loc: any) => loc.is_active) || locations[0];
            if (defaultLocation) {
              setSelectedLocationId(defaultLocation._id || (defaultLocation as any).id);
            }
          }
        } else {
          // Setze trotzdem, wird später korrigiert wenn Locations geladen sind
          if (ambLocationId) {
            setSelectedLocationId(ambLocationId);
          }
        }
        
        // Lade Template
        const templateId = typeof ambefund.formTemplateId === 'string'
          ? ambefund.formTemplateId
          : (ambefund.formTemplateId as any)._id;
        
        await loadTemplate(templateId, ambefund.specialization);
        setActiveStep(2); // Gehe direkt zu Formular
      }
    } catch (error: any) {
      enqueueSnackbar(`Fehler beim Laden: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (templateId?: string, spec?: Specialization) => {
    try {
      setLoading(true);
      
      if (templateId) {
        // Lade spezifisches Template
        const response = await apiRequest.get<{ success: boolean; data: AmbulanzbefundFormTemplate }>(
          `/ambulanzbefunde/templates/${templateId}`
        );
        
        if (response.success && response.data) {
          const template: AmbulanzbefundFormTemplate = (response.data as any).data || response.data;
          setTemplate(template);
          setActiveStep(2);
        }
      } else if (specialization || spec) {
        // Lade Default-Template für Spezialisierung
        const specToUse = spec || specialization;
        const params: Record<string, string> = {};
        if (selectedLocationId) {
          params.locationId = selectedLocationId;
        }
        
        const response = await apiRequest.get<{ success: boolean; data: AmbulanzbefundFormTemplate }>(
          `/ambulanzbefunde/templates/specialization/${specToUse}`,
          params
        );
        
        if (response.success && response.data) {
          const template: AmbulanzbefundFormTemplate = (response.data as any).data || response.data;
          setTemplate(template);
          setActiveStep(2);
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unbekannter Fehler';
      if (errorMessage.includes('404') || errorMessage.includes('nicht gefunden')) {
        enqueueSnackbar(
          'Kein Template vorhanden. Bitte erstellen Sie zuerst ein Template im Admin-Bereich.',
          { 
            variant: 'warning',
            action: (
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => navigate('/document-templates')}
              >
                Template erstellen
              </Button>
            )
          }
        );
      } else {
        enqueueSnackbar(`Fehler beim Laden des Templates: ${errorMessage}`, { variant: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSpecializationSelect = async () => {
    if (!specialization || !selectedLocationId) {
      enqueueSnackbar('Bitte Spezialisierung und Standort auswählen', { variant: 'warning' });
      return;
    }
    
    await loadTemplate(undefined, specialization);
  };

  const handleFormDataChange = (newFormData: Record<string, any>) => {
    setFormData(newFormData);
    setValidationErrors([]); // Reset errors when data changes
    
    // Synchronisiere Diagnosen mit formData
    const updatedFormData = { ...newFormData };
    if (primaryDiagnosis) {
      if (!updatedFormData.assessment) {
        updatedFormData.assessment = {};
      }
      updatedFormData.assessment.primaryDiagnosis = {
        code: primaryDiagnosis.code,
        display: primaryDiagnosis.display,
        codingScheme: 'ICD-10'
      };
    }
    if (secondaryDiagnoses.length > 0) {
      if (!updatedFormData.assessment) {
        updatedFormData.assessment = {};
      }
      updatedFormData.assessment.secondaryDiagnoses = secondaryDiagnoses.map(d => ({
        code: d.code,
        display: d.display,
        codingScheme: 'ICD-10'
      }));
    }
    setFormData(updatedFormData);
  };
  
  const handlePrimaryDiagnosisSelect = (code: string, display: string, fullCode: Icd10Code) => {
    setPrimaryDiagnosis({ code, display });
    // Aktualisiere formData
    const updatedFormData = { ...formData };
    if (!updatedFormData.assessment) {
      updatedFormData.assessment = {};
    }
    updatedFormData.assessment = {
      ...updatedFormData.assessment,
      primaryDiagnosis: {
        code,
        display,
        codingScheme: 'ICD-10'
      }
    };
    setFormData(updatedFormData);
  };
  
  const handleSecondaryDiagnosisSelect = (code: string, display: string, fullCode: Icd10Code) => {
    const newDiagnosis = { code, display };
    setSecondaryDiagnoses([...secondaryDiagnoses, newDiagnosis]);
    // Aktualisiere formData
    const updatedFormData = { ...formData };
    if (!updatedFormData.assessment) {
      updatedFormData.assessment = {};
    }
    updatedFormData.assessment = {
      ...updatedFormData.assessment,
      secondaryDiagnoses: [
        ...(updatedFormData.assessment.secondaryDiagnoses || []),
        {
          code,
          display,
          codingScheme: 'ICD-10'
        }
      ]
    };
    setFormData(updatedFormData);
  };
  
  const handleRemoveSecondaryDiagnosis = (index: number) => {
    const updated = secondaryDiagnoses.filter((_, i) => i !== index);
    setSecondaryDiagnoses(updated);
    // Aktualisiere formData
    const updatedFormData = { ...formData };
    if (updatedFormData.assessment) {
      updatedFormData.assessment.secondaryDiagnoses = updated.map(d => ({
        code: d.code,
        display: d.display,
        codingScheme: 'ICD-10'
      }));
      setFormData(updatedFormData);
    }
  };

  const handleValidate = async () => {
    // Prüfe ob alle notwendigen Daten vorhanden sind
    let ambefundIdToValidate: string | null = null;
    
    if (currentAmbefund?._id) {
      ambefundIdToValidate = currentAmbefund._id;
    } else {
      // Wenn kein Ambulanzbefund existiert, muss zuerst gespeichert werden
      if (!specialization || !selectedLocationId || !template) {
        enqueueSnackbar('Bitte alle Felder ausfüllen und zuerst speichern', { variant: 'warning' });
        return;
      }
      // Speichere zuerst als Entwurf
      enqueueSnackbar('Speichere Entwurf für Validierung...', { variant: 'info' });
      
      try {
        // Erstelle neuen Ambulanzbefund direkt
        const patientIdToUse = resolvedPatientId || patientId;
        if (!patientIdToUse || !template) {
          enqueueSnackbar('Patient-ID oder Template fehlt', { variant: 'error' });
          return;
        }

        const response = await apiRequest.post<{ success: boolean; data: Ambulanzbefund }>(
          '/ambulanzbefunde',
          {
            patientId: patientIdToUse,
            locationId: selectedLocationId,
            specialization,
            formTemplateId: template._id,
            formData,
            selectedSections: selectedSections.length > 0 ? selectedSections : undefined,
            status: 'draft',
          }
        );

        if (response.success) {
          const ambefundData = (response.data as any)?.data || (response as any)?.data || response.data;
          const ambefund: Ambulanzbefund = typeof ambefundData === 'object' && '_id' in ambefundData 
            ? ambefundData 
            : ambefundData;
          
          if (ambefund?._id) {
            ambefundIdToValidate = ambefund._id;
            setCurrentAmbefund(ambefund);
            enqueueSnackbar('Entwurf erfolgreich gespeichert', { variant: 'success' });
          }
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Fehler beim Speichern';
        enqueueSnackbar(`Fehler beim Speichern: ${errorMessage}`, { variant: 'error' });
        return;
      }
    }
    
    if (!ambefundIdToValidate) {
      enqueueSnackbar('Bitte speichern Sie zuerst den Entwurf', { variant: 'warning' });
      return;
    }
    
    try {
      setLoading(true);
      
      // Validiere bestehenden Befund
      const response = await apiRequest.post<{ success: boolean; data: Ambulanzbefund; validation?: any }>(
        `/ambulanzbefunde/${ambefundIdToValidate}/validate`
      );
      
      if (response.success && response.data) {
        // Extrahiere den Ambulanzbefund aus der Response-Struktur
        const ambefundData = (response.data as any)?.data || response.data;
        const ambefund: Ambulanzbefund = typeof ambefundData === 'object' && '_id' in ambefundData 
          ? ambefundData 
          : (response.data as any);
        
        const result = (response as any).validation || (ambefundData as any).validation;
        setValidationResult(result);
        setValidationErrors(result?.validationErrors || []);
        setValidationDialogOpen(true);
        
        // Aktualisiere currentAmbefund wenn Validierung erfolgreich war
        if (result.isValid && ambefund) {
          setCurrentAmbefund(ambefund);
        }
        
        enqueueSnackbar(
          result.isValid 
            ? 'Validierung erfolgreich!' 
            : 'Validierung fehlgeschlagen. Bitte Fehler korrigieren.',
          { variant: result.isValid ? 'success' : 'warning' }
        );
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unbekannter Fehler';
      enqueueSnackbar(`Validierungsfehler: ${errorMessage}`, { variant: 'error' });
      console.error('Validierungsfehler:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (finalize = false) => {
    const patientIdToUse = resolvedPatientId || patientId;
    
    // Für Update benötigen wir nur currentAmbefund
    if (currentAmbefund) {
      // Update - keine weiteren Validierungen nötig
    } else {
      // Create - benötigt alle Felder
      if (!patientIdToUse || !selectedLocationId || !specialization || !template) {
        enqueueSnackbar('Bitte alle Felder ausfüllen', { variant: 'warning' });
        return;
      }
    }
    
    try {
      setLoading(true);
      console.log('Speichere Ambulanzbefund:', {
        currentAmbefund: currentAmbefund?._id,
        finalize,
        formDataKeys: Object.keys(formData)
      });
      
      if (currentAmbefund) {
        // Update
        console.log('Update-Ambulanzbefund:', currentAmbefund._id, { formData, status: finalize ? undefined : 'draft' });
        
        const response = await apiRequest.put<{ success: boolean; data: Ambulanzbefund }>(
          `/ambulanzbefunde/${currentAmbefund._id}`,
          {
            formData,
            selectedSections: selectedSections.length > 0 ? selectedSections : undefined,
            status: finalize ? undefined : 'draft', // Explizit als Entwurf speichern wenn nicht finalisiert
          }
        );
        
        console.log('Update-Response:', response);
        
        if (response.success) {
          const ambefundData = (response.data as any)?.data || (response as any)?.data || response.data;
          const ambefund: Ambulanzbefund = typeof ambefundData === 'object' && '_id' in ambefundData 
            ? ambefundData 
            : ambefundData;
          
          console.log('Ambulanzbefund aktualisiert:', ambefund);
          
          // Zeige explizite Erfolgsmeldung
          enqueueSnackbar(
            finalize ? 'Ambulanzbefund erfolgreich aktualisiert' : 'Entwurf erfolgreich gespeichert',
            { 
              variant: 'success',
              autoHideDuration: 3000,
              anchorOrigin: { vertical: 'top', horizontal: 'center' },
              preventDuplicate: true
            }
          );
          
          console.log('Snackbar sollte angezeigt werden');
          
          if (finalize && ambefund?._id) {
            await handleFinalize(ambefund._id);
          } else {
            // Bei Entwurf: Bleibe im Editor (keine Navigation)
            // Der Benutzer kann weiter bearbeiten
            // Aktualisiere den currentAmbefund mit den neuesten Daten
            if (ambefund && ambefund._id) {
              setCurrentAmbefund(ambefund);
              console.log('CurrentAmbulanzbefund aktualisiert');
            }
          }
        } else {
          const errorMessage = (response as any)?.message || 'Fehler beim Aktualisieren des Ambulanzbefunds';
          console.error('Update-Fehler:', response);
          enqueueSnackbar(errorMessage, { variant: 'error' });
        }
      } else {
        // Create
        const patientIdToUse = resolvedPatientId || patientId;
        if (!patientIdToUse) {
          enqueueSnackbar('Patient-ID fehlt', { variant: 'error' });
          return;
        }
        
        if (!template) {
          enqueueSnackbar('Template fehlt', { variant: 'error' });
          return;
        }

        const response = await apiRequest.post<{ success: boolean; data: Ambulanzbefund }>(
          '/ambulanzbefunde',
          {
            patientId: patientIdToUse,
            locationId: selectedLocationId,
            specialization,
            formTemplateId: template._id,
            formData,
            selectedSections: selectedSections.length > 0 ? selectedSections : undefined,
            status: finalize ? undefined : 'draft', // Explizit als Entwurf speichern wenn nicht finalisiert
          }
        );
        
        if (response.success) {
          const ambefundData = (response.data as any)?.data || (response as any)?.data || response.data;
          const ambefund: Ambulanzbefund = typeof ambefundData === 'object' && '_id' in ambefundData 
            ? ambefundData 
            : ambefundData;
          
          enqueueSnackbar(
            finalize ? 'Ambulanzbefund erfolgreich erstellt' : 'Entwurf erfolgreich gespeichert',
            { variant: 'success' }
          );
          
          if (finalize && ambefund?._id) {
            await handleFinalize(ambefund._id);
          } else {
            // Bei neuem Entwurf: Setze currentAmbefund und bleibe im Editor
            if (ambefund && ambefund._id) {
              setCurrentAmbefund(ambefund);
              // Optional: Navigiere zur Edit-Route, damit URL konsistent ist
              navigate(`/ambulanzbefund/${ambefund._id}`, { replace: true });
            } else {
              // Fallback: Navigiere zurück zum Patientenorganizer
              const targetPatientId = resolvedPatientId || patientId || 
                (typeof ambefund?.patientId === 'string' ? ambefund.patientId : (ambefund?.patientId as any)?._id);
              if (targetPatientId) {
                navigate(`/patient-organizer/${targetPatientId}`);
              }
            }
          }
        } else {
          enqueueSnackbar('Fehler beim Speichern des Ambulanzbefunds', { variant: 'error' });
        }
      }
    } catch (error: any) {
      console.error('Speicher-Fehler:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unbekannter Fehler beim Speichern';
      enqueueSnackbar(`Fehler: ${errorMessage}`, { variant: 'error' });
    } finally {
      setLoading(false);
      console.log('Speichern abgeschlossen');
    }
  };

  const handleFinalize = async (ambefundId: string) => {
    // Prüfe ob das Dokument bereits validiert ist
    let ambefundToFinalize: Ambulanzbefund | null = currentAmbefund;
    
    if (!ambefundToFinalize) {
      // Lade den Ambulanzbefund falls er nicht im State ist
      try {
        const response = await apiRequest.get<{ success: boolean; data: Ambulanzbefund }>(
          `/ambulanzbefunde/${ambefundId}`
        );
        if (response.success && response.data) {
          // Extrahiere den Ambulanzbefund aus der Response-Struktur
          const ambefundData = (response.data as any)?.data || response.data;
          ambefundToFinalize = typeof ambefundData === 'object' && '_id' in ambefundData 
            ? ambefundData 
            : null;
        }
      } catch (error) {
        console.error('Fehler beim Laden des Ambulanzbefunds:', error);
      }
    }
    
    if (!ambefundToFinalize || ambefundToFinalize.status !== 'validated') {
      enqueueSnackbar('Bitte validieren Sie den Ambulanzbefund zuerst', { variant: 'warning' });
      return;
    }
    
    try {
      setLoading(true);
      const response = await apiRequest.post<{ success: boolean; data: Ambulanzbefund }>(
        `/ambulanzbefunde/${ambefundId}/finalize`
      );
      
      if (response.success) {
        enqueueSnackbar('Ambulanzbefund finalisiert', { variant: 'success' });
        const patientIdToNavigate = resolvedPatientIdWithQuery || resolvedPatientId || patientId;
        if (patientIdToNavigate) {
          navigate(`/patient-organizer/${patientIdToNavigate}`);
        } else {
          navigate('/patients');
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unbekannter Fehler';
      enqueueSnackbar(`Fehler beim Finalisieren: ${errorMessage}`, { variant: 'error' });
      console.error('Finalisierungsfehler:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      handleSpecializationSelect();
    } else if (activeStep === 1) {
      setActiveStep(2);
    } else if (activeStep === 2) {
      handleValidate();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    } else {
      // Wenn wir bereits auf Schritt 0 sind, zurück zum Patientenorganizer
      handleNavigateToPatient();
    }
  };

  const handleNavigateToPatient = () => {
    // PRIORITÄTSREIHENFOLGE für Patient-ID:
    // 1. Query-Parameter (?patientId=...)
    // 2. resolvedPatientIdWithQuery (Query-Parameter aus useMemo)
    // 3. resolvedPatientId (aus URL oder currentAmbefund)
    // 4. patientId aus URL (wenn Route /ambulanzbefund/new/:patientId)
    // 5. currentAmbefund.patientId (direkt aus dem geladenen Ambulanzbefund)
    // 6. currentPatient._id (aus dem Patienten-Objekt im Redux Store)
    
    const queryParams = new URLSearchParams(location.search);
    let patientIdToNavigate = 
      queryParams.get('patientId') || 
      resolvedPatientIdWithQuery || 
      resolvedPatientId || 
      patientId;
    
    console.log('🔍 handleNavigateToPatient - Schritt 1 (Quellen prüfen):', {
      queryPatientId: queryParams.get('patientId'),
      resolvedPatientIdWithQuery,
      resolvedPatientId,
      patientId,
      patientIdToNavigate_Schritt1: patientIdToNavigate
    });
    
    // Falls noch keine Patient-ID gefunden, versuche sie DIREKT aus currentAmbefund zu holen
    if (!patientIdToNavigate && currentAmbefund?.patientId) {
      patientIdToNavigate = typeof currentAmbefund.patientId === 'string' 
        ? currentAmbefund.patientId 
        : (currentAmbefund.patientId as any)?._id || (currentAmbefund.patientId as any)?.id;
      console.log('✅ Schritt 2: Patient-ID aus currentAmbefund gefunden:', patientIdToNavigate);
      console.log('   currentAmbefund.patientId:', currentAmbefund.patientId);
      console.log('   currentAmbefund.patientId type:', typeof currentAmbefund.patientId);
    }
    
    // Falls noch keine Patient-ID gefunden, versuche sie aus currentPatient zu holen
    if (!patientIdToNavigate && currentPatient) {
      patientIdToNavigate = currentPatient._id || currentPatient.id;
      console.log('✅ Schritt 3: Patient-ID aus currentPatient gefunden:', patientIdToNavigate);
      console.log('   currentPatient:', { _id: currentPatient._id, id: currentPatient.id });
    }
    
    // FINALE VALIDIERUNG UND NAVIGATION
    if (patientIdToNavigate && typeof patientIdToNavigate === 'string' && patientIdToNavigate.trim().length > 0) {
      const targetPath = `/patient-organizer/${patientIdToNavigate.trim()}`;
      console.log('✅✅✅ FINALE NAVIGATION zum Patientenorganizer:', targetPath);
      console.log('   Vollständige URL:', window.location.origin + targetPath);
      console.log('   Navigate wird aufgerufen mit:', targetPath);
      
      // Verwende navigate mit replace: false, damit Browser-History erhalten bleibt
      navigate(targetPath);
      
      // Zusätzliche Validierung nach Navigation
      setTimeout(() => {
        if (window.location.pathname !== targetPath) {
          console.error('⚠️ Navigation fehlgeschlagen! Aktuelle URL:', window.location.pathname);
          console.error('   Erwartet wurde:', targetPath);
        } else {
          console.log('✅ Navigation erfolgreich! Aktuelle URL:', window.location.pathname);
        }
      }, 100);
    } else {
      console.error('❌❌❌ FEHLER: Keine gültige Patient-ID gefunden!');
      console.error('   Fallback zur Patientenliste wird verwendet');
      console.error('   Alle verfügbaren Daten:', {
        queryPatientId: queryParams.get('patientId'),
        resolvedPatientIdWithQuery,
        resolvedPatientId,
        patientId,
        locationSearch: location.search,
        locationPathname: location.pathname,
        currentAmbefund: currentAmbefund ? { 
          _id: currentAmbefund._id,
          patientId: currentAmbefund.patientId,
          patientIdType: typeof currentAmbefund.patientId,
          patientIdString: String(currentAmbefund.patientId)
        } : null,
        currentPatient: currentPatient ? { 
          _id: currentPatient._id, 
          id: currentPatient.id 
        } : null,
        patientIdToNavigate_FINAL: patientIdToNavigate,
        patientIdToNavigateType: typeof patientIdToNavigate,
        patientIdToNavigateValue: String(patientIdToNavigate)
      });
      
      // Fallback zur Patientenliste
      console.log('   Navigiere zu /patients');
      navigate('/patients');
    }
  };

  const handleCancel = () => {
    // Direkt zurück zum Patientenorganizer ohne zu speichern
    handleNavigateToPatient();
  };

  // Warte auf das Laden des Ambulanzbefunds, wenn nur ambefundId vorhanden ist
  if (!resolvedPatientId && !ambefundId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Keine Patient-ID angegeben</Alert>
      </Container>
    );
  }

  // Wenn ambefundId vorhanden ist, warte auf das Laden
  if (ambefundId && !currentAmbefund && loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Wenn ambefundId vorhanden ist, aber kein Ambulanzbefund geladen werden konnte
  if (ambefundId && !currentAmbefund && !loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Ambulanzbefund nicht gefunden</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {currentAmbefund ? 'Ambulanzbefund bearbeiten' : 'Neuer Ambulanzbefund'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentAmbefund?.documentNumber || 'Erstellen Sie einen neuen Arbeitsbefund'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            {currentAmbefund && (
              <Chip
                label={currentAmbefund.status}
                color={
                  currentAmbefund.status === 'finalized' ? 'success' :
                  currentAmbefund.status === 'validated' ? 'info' :
                  currentAmbefund.status === 'exported' ? 'primary' : 'default'
                }
              />
            )}
            <Button 
              variant="outlined" 
              startIcon={<Cancel />}
              onClick={handleCancel}
              color="inherit"
              size="small"
            >
              Zurück zum Patienten
            </Button>
          </Stack>
        </Stack>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Patientenidentität - Immer angezeigt wenn Patient ausgewählt */}
      {currentPatient && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 200 }}>
                <Person color="inherit" />
                <Box>
                  <Typography variant="h6" component="div">
                    {currentPatient.firstName} {currentPatient.lastName}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {currentPatient.dateOfBirth && (
                      <>
                        <CalendarToday sx={{ fontSize: 12 }} />
                        {new Date(currentPatient.dateOfBirth).toLocaleDateString('de-DE')}
                        {' • '}
                        {calculateAge(currentPatient.dateOfBirth)} Jahre
                        {' • '}
                      </>
                    )}
                    <Wc sx={{ fontSize: 12 }} />
                    {formatGender(currentPatient.gender)}
                  </Typography>
                </Box>
              </Box>
              
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)' }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
                <Fingerprint sx={{ fontSize: 20 }} />
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                    SVNR
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {currentPatient.socialSecurityNumber || '—'}
                  </Typography>
                </Box>
              </Box>

              <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)' }} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
                <BadgeIcon sx={{ fontSize: 20 }} />
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                    Interne Patientennummer
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {currentPatient._id || currentPatient.id || '—'}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Step 0: Spezialisierung wählen */}
      {activeStep === 0 && (
        <Paper sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Spezialisierung und Standort wählen
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<Cancel />}
              onClick={handleCancel}
              color="inherit"
            >
              Abbrechen
            </Button>
          </Box>
          <Stack spacing={3} sx={{ mt: 3 }}>
            <FormControl fullWidth required>
              <InputLabel>Standort</InputLabel>
              <Select
                value={selectedLocationId || ''}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                label="Standort"
              >
                {locations && locations.length > 0 ? (
                  locations.map((loc: any) => {
                    const locId = loc._id || loc.id;
                    return (
                      <MenuItem key={locId} value={locId}>
                        {loc.name}
                      </MenuItem>
                    );
                  })
                ) : (
                  <MenuItem disabled>Keine Standorte verfügbar</MenuItem>
                )}
              </Select>
            </FormControl>
            
            <FormControl fullWidth required>
              <InputLabel>Spezialisierung</InputLabel>
              <Select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value as Specialization)}
                label="Spezialisierung"
                disabled={!!currentAmbefund}
              >
                {Object.entries(SPECIALIZATION_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Hinweis: Für diese Spezialisierung muss ein Template existieren. 
                Falls kein Template vorhanden ist, erstellen Sie bitte zuerst eines im{' '}
                <Button 
                  size="small" 
                  variant="text" 
                  onClick={() => navigate('/document-templates')}
                  sx={{ textTransform: 'none', p: 0, minWidth: 'auto', textDecoration: 'underline' }}
                >
                  Admin-Bereich
                </Button>.
              </Typography>
            </Alert>

            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!specialization || !selectedLocationId}
              startIcon={<Article />}
            >
              Template laden
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Step 1: Template laden (automatisch) */}
      {activeStep === 1 && template && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom>
            Template geladen: {template.name}
          </Typography>
          <Alert severity="success" sx={{ mt: 2 }}>
            Template erfolgreich geladen. Sie können nun das Formular ausfüllen.
          </Alert>
          <Button variant="contained" onClick={handleNext} sx={{ mt: 2 }}>
            Weiter zum Formular
          </Button>
        </Paper>
      )}

      {/* Step 2: Formular ausfüllen */}
      {activeStep === 2 && template && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Formular ausfüllen
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<Cancel />}
              onClick={handleCancel}
              color="inherit"
            >
              Abbrechen & zurück
            </Button>
          </Box>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Template: <strong>{template.name}</strong> (Version {template.version})<br />
              Spezialisierung: <strong>{SPECIALIZATION_LABELS[specialization as Specialization]}</strong>
            </Typography>
          </Alert>

          {/* ICD-10 Diagnosen-Auswahl */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h6" gutterBottom>
              Diagnosen (ICD-10)
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Primärdiagnose *
              </Typography>
              <ICD10Autocomplete
                onSelect={handlePrimaryDiagnosisSelect}
                context="medical"
                requireBillable={false}
                label="Primärdiagnose (ICD-10)"
                placeholder="ICD-10 Code oder Beschreibung eingeben..."
                value={primaryDiagnosis ? `${primaryDiagnosis.code} - ${primaryDiagnosis.display}` : ''}
                onChange={(value) => {
                  // Extrahiere Code und Display aus dem formatierten String
                  const match = value.match(/^([A-Z0-9.]+)\s*-\s*(.+)$/);
                  if (match) {
                    handlePrimaryDiagnosisSelect(match[1], match[2], {} as Icd10Code);
                  }
                }}
                size="medium"
              />
            </Box>
            
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2">
                  Sekundärdiagnosen
                </Typography>
              </Box>
              
              {secondaryDiagnoses.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  {secondaryDiagnoses.map((diagnosis, index) => (
                    <Chip
                      key={index}
                      label={`${diagnosis.code} - ${diagnosis.display}`}
                      onDelete={() => handleRemoveSecondaryDiagnosis(index)}
                      deleteIcon={<DeleteIcon />}
                      sx={{ mr: 1, mb: 1 }}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
              
              <ICD10Autocomplete
                onSelect={handleSecondaryDiagnosisSelect}
                context="medical"
                requireBillable={false}
                label="Sekundärdiagnose hinzufügen (ICD-10)"
                placeholder="ICD-10 Code oder Beschreibung eingeben..."
                value=""
                onChange={() => {}}
                size="medium"
              />
            </Box>
          </Paper>

          <AmbulanzbefundFormRenderer
            template={template}
            formData={formData}
            onChange={handleFormDataChange}
            selectedSections={selectedSections}
            onSectionsChange={setSelectedSections}
            validationErrors={validationErrors}
          />

          <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ mt: 4 }}>
            <Button 
              variant="outlined" 
              startIcon={<Cancel />}
              onClick={handleCancel}
              color="inherit"
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Stack direction="row" spacing={2}>
              <Button onClick={handleBack} disabled={loading}>Zurück</Button>
              <Button 
                variant="outlined" 
                onClick={() => handleSave(false)} 
                startIcon={<Save />}
                disabled={loading}
              >
                {loading ? 'Speichere...' : 'Als Entwurf speichern'}
              </Button>
              {currentAmbefund && (
                <Button 
                  variant={currentAmbefund.status === 'validated' ? 'contained' : 'outlined'}
                  onClick={handleValidate}
                  startIcon={<VerifiedUser />}
                  disabled={loading}
                  color={currentAmbefund.status === 'validated' ? 'success' : 'primary'}
                >
                  {loading ? 'Validiere...' : currentAmbefund.status === 'validated' ? 'Bereits validiert' : 'Validieren'}
                </Button>
              )}
              <Button 
                variant="contained" 
                onClick={() => handleSave(true)} 
                startIcon={<CheckCircle />}
                disabled={loading || (currentAmbefund?.status !== 'validated')}
                color={currentAmbefund?.status === 'validated' ? 'success' : 'primary'}
                title={currentAmbefund?.status !== 'validated' ? 'Arbeitsbefund muss zuerst validiert sein' : 'Finalisieren'}
              >
                {loading ? 'Finalisiere...' : 'Finalisieren'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Validation Dialog */}
      <Dialog open={validationDialogOpen} onClose={() => setValidationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Validierungsergebnis</DialogTitle>
        <DialogContent>
          {validationResult && (
            <Box>
              {validationResult.isValid ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Validierung erfolgreich! Der Ambulanzbefund ist gültig.
                </Alert>
              ) : (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Validierung fehlgeschlagen. Bitte korrigieren Sie die Fehler.
                </Alert>
              )}
              
              {validationResult.validationErrors && validationResult.validationErrors.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Fehler:
                  </Typography>
                  <ul>
                    {validationResult.validationErrors.map((error: any, index: number) => (
                      <li key={index}>
                        <strong>{error.field}:</strong> {error.message}
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValidationDialogOpen(false)}>Schließen</Button>
          {validationResult?.isValid && (
            <Button variant="contained" onClick={() => {
              setValidationDialogOpen(false);
              if (currentAmbefund) {
                handleFinalize(currentAmbefund._id);
              }
            }}>
              Finalisieren
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AmbulanzbefundEditor;

