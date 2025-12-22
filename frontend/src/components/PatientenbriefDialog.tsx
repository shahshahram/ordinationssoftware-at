import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Grid,
  List,
  ListItemButton,
  ListItemText
} from '@mui/material';
import {
  Close,
  Print,
  Save,
  Delete,
  Edit,
  Add,
  KeyboardArrowUp,
  KeyboardArrowDown
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createDocument } from '../store/slices/documentSlice';
import { fetchDocuments } from '../store/slices/documentSlice';
import { fetchDekursEntries, DekursEntry, LinkedDiagnosis, LinkedMedication } from '../store/slices/dekursSlice';
import { Location } from '../store/slices/locationSlice';
import { Patient } from '../store/slices/patientSlice';
import { fetchContacts, Contact } from '../store/slices/contactSlice';
import ICD10Autocomplete from './ICD10Autocomplete';
import MedicationAutocomplete from './MedicationAutocomplete';
import { apiRequest } from '../utils/api';
import Autocomplete from '@mui/material/Autocomplete';
import RichTextEditor from './RichTextEditor';
import DocumentSidebar from './DocumentSidebar';
import DocumentDetailDialog from './DocumentDetailDialog';
import { replacePlaceholders, PlaceholderContext } from '../utils/placeholders';

interface LetterSection {
  id: string;
  title: string;
  content: string;
  source?: 'dekurs' | 'manual' | 'template' | 'vital' | 'labor' | 'dicom' | 'appointment' | 'photo' | 'document';
  dekursField?: string;
  templateId?: string; // ID der verwendeten Vorlage
  templateName?: string; // Name der Vorlage (für Anzeige)
  dataId?: string; // ID des übernommenen Datensatzes (für Vital, Labor, DICOM, etc.)
}

interface PatientenbriefDialogProps {
  open: boolean;
  onClose: () => void;
  patient: Patient | null;
  location: Location | null;
  documentType?: 'patientenbrief' | 'arztbrief';
  source?: 'leer' | 'dekurs';
  selectedDekursEntry?: any;
  onSaveSuccess?: () => void; // Callback nach erfolgreichem Speichern
}

// Hilfsfunktion zum Entfernen von HTML-Tags
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const PatientenbriefDialog: React.FC<PatientenbriefDialogProps> = ({
  open,
  onClose,
  patient,
  location,
  documentType = 'patientenbrief',
  source = 'dekurs',
  selectedDekursEntry = null,
  onSaveSuccess
}) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const dekursEntries = useAppSelector(state => state.dekurs.entries);

  // State für Arztauswahl
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // State für Empfänger
  const [recipient, setRecipient] = useState<{
    type: 'patient' | 'doctor' | 'organization' | 'contact' | null;
    contactId?: string;
    name?: string;
    title?: string;
    salutation?: string; // Anrede (z.B. "Sehr geehrte/r", "Liebe/r")
    organization?: string;
    address?: {
      street?: string;
      postalCode?: string;
      city?: string;
      country?: string;
    };
    phone?: string;
    email?: string;
    fax?: string;
  } | null>(null);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // State für Dekurs-Übernahme
  const [latestDekursEntry, setLatestDekursEntry] = useState<DekursEntry | null>(null);

  // State für Diagnosen und Medikamente
  const [linkedDiagnoses, setLinkedDiagnoses] = useState<LinkedDiagnosis[]>([]);
  const [linkedMedications, setLinkedMedications] = useState<LinkedMedication[]>([]);

  // State für Briefinhalt
  const [letterSections, setLetterSections] = useState<LetterSection[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateSearchValue, setTemplateSearchValue] = useState<string>('');
  const [templateDialogKey, setTemplateDialogKey] = useState<number>(0);
  const [letterContent, setLetterContent] = useState<string>('');

  // State für Speichern
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State für Medikamenten-Dialog
  const [medicationDialogOpen, setMedicationDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any | null>(null);
  const [editingMedicationIndex, setEditingMedicationIndex] = useState<number | null>(null);
  const [medicationFormData, setMedicationFormData] = useState({
    dosage: '',
    dosageUnit: '',
    frequency: '',
    duration: '',
    instructions: '',
    startDate: '',
    endDate: '',
    quantity: '',
    quantityUnit: '',
    route: 'oral' as 'oral' | 'topical' | 'injection' | 'inhalation' | 'rectal' | 'vaginal' | 'other',
    changeType: 'added' as 'added' | 'modified' | 'discontinued' | 'unchanged',
    notes: ''
  });

  // State für Tabs (Editor/Vorschau)
  const [activeTab, setActiveTab] = useState(0);

  // State für zusätzliche Daten (Vitalwerte, Labor, DICOM, Termine, Fotos)
  const [vitalSigns, setVitalSigns] = useState<any[]>([]);
  const [laborResults, setLaborResults] = useState<any[]>([]);
  const [dicomStudies, setDicomStudies] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loadingAdditionalData, setLoadingAdditionalData] = useState(false);
  const [additionalDataDialogOpen, setAdditionalDataDialogOpen] = useState(false);
  const [additionalDataTab, setAdditionalDataTab] = useState(0);

  // State für Sidebar
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('documentSidebarWidth');
    return saved ? parseInt(saved, 10) : 350;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailDialogData, setDetailDialogData] = useState<{ type: 'labor' | 'vital' | 'dicom' | 'document' | 'dekurs', data: any } | null>(null);

  // Dekurs-Felder-Mapping
  const dekursFields = [
    { key: 'visitReason', label: 'Besuchsgrund' },
    { key: 'clinicalObservations', label: 'Klinische Beobachtungen' },
    { key: 'findings', label: 'Befunde' },
    { key: 'progressChecks', label: 'Verlaufskontrolle' },
    { key: 'treatmentDetails', label: 'Behandlungsdetails' },
    { key: 'medicationChanges', label: 'Medikamentenänderungen' },
    { key: 'imagingFindings', label: 'Bildgebende Befunde' },
    { key: 'laboratoryFindings', label: 'Laborbefunde' },
    { key: 'psychosocialFactors', label: 'Psychosoziale Faktoren' },
    { key: 'notes', label: 'Notizen' }
  ];

  // Lade Ärzte für Standort
  useEffect(() => {
    const loadDoctors = async () => {
      if (!location?._id) return;
      
      setLoadingDoctors(true);
      try {
        const response: any = await apiRequest.get(`/staff-location-assignments/location/${location._id}`);
        const assignments = response.data?.data || response.data || [];
        
        // Filtere nur Ärzte (role === 'doctor' oder ähnlich)
        // Wir müssen die User-Daten aus staff_id extrahieren
        const doctors: any[] = [];
        for (const assignment of assignments) {
          if (assignment.staff_id?.userId) {
            const userData = assignment.staff_id.userId;
            // Prüfe ob es ein Arzt ist (vereinfachte Prüfung)
            if (userData.role === 'doctor' || userData.role === 'arzt' || userData.title) {
              doctors.push({
                _id: userData._id || userData.id,
                firstName: userData.firstName,
                lastName: userData.lastName,
                title: userData.title,
                email: userData.email,
                phone: userData.phone,
                specialization: userData.specialization,
                website: userData.website
              });
            }
          }
        }
        
        setAvailableDoctors(doctors);
        if (doctors.length === 1) {
          setSelectedDoctor(doctors[0]);
        } else if (doctors.length > 0) {
          // Setze ersten Arzt als Standard
          setSelectedDoctor(doctors[0]);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Ärzte:', error);
      } finally {
        setLoadingDoctors(false);
      }
    };

    if (open && location) {
      loadDoctors();
    }
  }, [open, location]);

  // Lade neuesten Dekurs und übernehme automatisch alle Daten
  useEffect(() => {
    const loadDekurs = async () => {
      if (!open || !patient?._id) return;

      // Bei "Leer" keine Dekurs-Daten laden
      if (source === 'leer') {
        setLatestDekursEntry(null);
        setLetterSections([]);
        setLinkedDiagnoses([]);
        setLinkedMedications([]);
        return;
      }

      // Nur bei "aus Dekurs" laden
      if (source !== 'dekurs') return;

      try {
        let entry: DekursEntry | null = null;
        
        // Wenn ein spezifischer Dekurs-Eintrag ausgewählt wurde, verwende diesen
        if (selectedDekursEntry) {
          entry = selectedDekursEntry;
        } else {
          // Sonst lade den neuesten Eintrag
          // Versuche aus Redux Store
          if (dekursEntries && dekursEntries.length > 0) {
            const sorted = [...dekursEntries].sort((a, b) => 
              new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
            );
            entry = sorted[0];
          } else {
            // Lade von API
            const result = await dispatch(fetchDekursEntries({ 
              patientId: patient._id, 
              limit: 1 
            })).unwrap();
            
            if (result.data && result.data.length > 0) {
              entry = result.data[0];
            }
          }
        }

        if (entry) {
          console.log('📋 Dekurs-Eintrag geladen:', entry);
          setLatestDekursEntry(entry);
          
          // Automatische Übernahme aller Dekurs-Felder
          const newSections: LetterSection[] = [];
          dekursFields.forEach(field => {
            const content = entry?.[field.key as keyof DekursEntry];
            console.log(`🔍 Feld "${field.label}" (${field.key}):`, content, typeof content);
            
            // Prüfe verschiedene Datentypen
            let contentString = '';
            if (content !== null && content !== undefined) {
              if (typeof content === 'string') {
                contentString = content;
              } else if (typeof content === 'object' && Array.isArray(content)) {
                contentString = content.join(', ');
              } else {
                contentString = String(content);
              }
            }
            
            if (contentString && contentString.trim() !== '') {
              console.log(`✅ Übernehme "${field.label}":`, contentString.substring(0, 50) + '...');
              newSections.push({
                id: `section-${field.key}-${Date.now()}`,
                title: field.label,
                content: contentString,
                source: 'dekurs',
                dekursField: field.key
              });
            }
          });
          
          console.log('📝 Erstellte Sektionen:', newSections.length, newSections);
          setLetterSections(newSections);
          
          // Automatische Übernahme von Diagnosen
          if (entry.linkedDiagnoses && entry.linkedDiagnoses.length > 0) {
            console.log('✅ Übernehme Diagnosen:', entry.linkedDiagnoses.length);
            setLinkedDiagnoses([...entry.linkedDiagnoses]);
          }
          
          // Automatische Übernahme von Medikamenten
          if (entry.linkedMedications && entry.linkedMedications.length > 0) {
            console.log('✅ Übernehme Medikamente:', entry.linkedMedications.length);
            setLinkedMedications([...entry.linkedMedications]);
          }
        } else {
          console.log('⚠️ Kein Dekurs-Eintrag gefunden');
        }
      } catch (error) {
        console.error('Fehler beim Laden des Dekurs:', error);
      }
    };

    if (open && patient) {
      loadDekurs();
    }
  }, [open, patient, dispatch, dekursEntries, source, selectedDekursEntry]);

  // Lade zusätzliche Daten (Vitalwerte, Labor, DICOM, Termine, Fotos)
  useEffect(() => {
    const loadAdditionalData = async () => {
      if (!open || !patient?._id) {
        setVitalSigns([]);
        setLaborResults([]);
        setDicomStudies([]);
        setAppointments([]);
        setPhotos([]);
        return;
      }

      setLoadingAdditionalData(true);
      try {
        // Lade Vitalwerte
        try {
          const vitalResponse: any = await apiRequest.get(`/vital-signs/patient/${patient._id}?limit=10`);
          const vitalData = vitalResponse?.data?.data || vitalResponse?.data || [];
          setVitalSigns(Array.isArray(vitalData) ? vitalData : []);
        } catch (error) {
          console.error('Fehler beim Laden der Vitalwerte:', error);
          setVitalSigns([]);
        }

        // Lade Laborwerte
        try {
          const laborResponse: any = await apiRequest.get(`/labor/patient/${patient._id}`);
          const laborData = laborResponse?.data?.data || laborResponse?.data || [];
          setLaborResults(Array.isArray(laborData) ? laborData : []);
        } catch (error) {
          console.error('Fehler beim Laden der Laborwerte:', error);
          setLaborResults([]);
        }

        // Lade DICOM-Studien
        try {
          const dicomResponse: any = await apiRequest.get(`/dicom/patient/${patient._id}`);
          const dicomData = dicomResponse?.data?.data || dicomResponse?.data || [];
          setDicomStudies(Array.isArray(dicomData) ? dicomData : []);
        } catch (error) {
          console.error('Fehler beim Laden der DICOM-Studien:', error);
          setDicomStudies([]);
        }

        // Lade Termine
        try {
          const appointmentsResponse: any = await apiRequest.get(`/appointments?patientId=${patient._id}&limit=10`);
          const appointmentsData = appointmentsResponse?.data?.data || appointmentsResponse?.data || [];
          setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
        } catch (error) {
          console.error('Fehler beim Laden der Termine:', error);
          setAppointments([]);
        }

        // Lade Fotos
        try {
          const photosResponse: any = await apiRequest.get(`/patients-extended/${patient._id}/photos`);
          const photosData = photosResponse?.data?.data || photosResponse?.data || [];
          setPhotos(Array.isArray(photosData) ? photosData : []);
        } catch (error) {
          console.error('Fehler beim Laden der Fotos:', error);
          setPhotos([]);
        }
      } finally {
        setLoadingAdditionalData(false);
      }
    };

    if (open && patient) {
      loadAdditionalData();
    }
  }, [open, patient]);

  // Lade Briefvorlagen vom Standort
  useEffect(() => {
    const loadTemplates = async () => {
      if (!open || !location?._id) {
        console.log('⚠️ Kann Vorlagen nicht laden: open=', open, 'location._id=', location?._id);
        return;
      }
      
      try {
        console.log('📋 Lade Briefvorlagen für Standort:', location._id);
        console.log('📋 Location-Objekt:', location);
        
        // Versuche zuerst, Vorlagen aus dem Location-Objekt zu verwenden (falls bereits geladen)
        // Aber lade auch von API, um sicherzustellen, dass alle Vorlagen vorhanden sind
        let templates: any[] = [];
        
        if (location.letterTemplates && Array.isArray(location.letterTemplates) && location.letterTemplates.length > 0) {
          console.log('📋 Verwende Vorlagen aus Location-Objekt:', location.letterTemplates.length);
          templates = location.letterTemplates;
        }
        
        // Lade immer von API, um sicherzustellen, dass alle Vorlagen vorhanden sind
        // (auch wenn bereits Vorlagen im Location-Objekt sind, könnten neue hinzugefügt worden sein)
        console.log('📋 Lade Vorlagen von API...');
        const response: any = await apiRequest.get(`/locations/${location._id}/letter-templates`);
        console.log('📋 Briefvorlagen API Response:', response);
        
        if (response) {
          // Verschiedene mögliche Response-Strukturen
          let apiTemplates: any[] = [];
          
          if (Array.isArray(response)) {
            apiTemplates = response;
          } else if ((response as any).templates && Array.isArray((response as any).templates)) {
            apiTemplates = (response as any).templates;
          } else if ((response as any).data) {
            if (Array.isArray((response as any).data)) {
              apiTemplates = (response as any).data;
            } else if ((response as any).data.templates && Array.isArray((response as any).data.templates)) {
              apiTemplates = (response as any).data.templates;
            } else if ((response as any).data.data && Array.isArray((response as any).data.data)) {
              apiTemplates = (response as any).data.data;
            }
          } else if ((response as any).success && (response as any).templates && Array.isArray((response as any).templates)) {
            apiTemplates = (response as any).templates;
          }
          
          // Verwende API-Vorlagen, falls vorhanden, sonst die aus dem Location-Objekt
          if (apiTemplates.length > 0) {
            templates = apiTemplates;
            console.log('📋 Verwende Vorlagen von API:', apiTemplates.length);
          } else if (templates.length === 0) {
            console.warn('⚠️ Keine Vorlagen von API gefunden');
          }
        } else {
          console.warn('⚠️ Keine Response oder Response.success === false');
        }
        
        console.log('📋 Alle Vorlagen vor Filterung:', templates.length, templates);
        
        // Filtere nur aktive Vorlagen, die für diesen Dokumenttyp oder "all" sind
        const filteredTemplates = templates.filter((t: any) => {
          const isActive = t.isActive !== false;
          const matchesType = t.documentType === 'all' || t.documentType === documentType;
          console.log(`🔍 Vorlage "${t.name || 'Unbenannt'}": isActive=${isActive}, documentType=${t.documentType}, matchesType=${matchesType}, currentDocumentType=${documentType}`);
          return isActive && matchesType;
        });
        
        console.log('✅ Gefilterte Vorlagen:', filteredTemplates.length, filteredTemplates);
        setAvailableTemplates(filteredTemplates);
      } catch (error: any) {
        console.error('❌ Fehler beim Laden der Briefvorlagen:', error);
        console.error('Error details:', error.response?.data || error.message);
        setAvailableTemplates([]);
      }
    };

    if (open && location) {
      loadTemplates();
    }
  }, [open, location, documentType]);

  // Lade Vorlagen neu, wenn der Vorlagen-Dialog geöffnet wird
  useEffect(() => {
    const reloadTemplatesForDialog = async () => {
      if (!templateDialogOpen || !location?._id) {
        return;
      }
      
      console.log('🔄 Lade Vorlagen neu für Dialog...');
      try {
        const response: any = await apiRequest.get(`/locations/${location._id}/letter-templates`);
        console.log('📋 Vorlagen API Response (Dialog):', response);
        
        if (response) {
          let templates: any[] = [];
          
          if (Array.isArray(response)) {
            templates = response;
          } else if (response.templates && Array.isArray(response.templates)) {
            templates = response.templates;
          } else if (response.data) {
            if (Array.isArray(response.data)) {
              templates = response.data;
            } else if (response.data.templates && Array.isArray(response.data.templates)) {
              templates = response.data.templates;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              templates = response.data.data;
            }
          } else if (response.success && response.templates && Array.isArray(response.templates)) {
            templates = response.templates;
          }
          
          const filteredTemplates = templates.filter((t: any) => {
            const isActive = t.isActive !== false;
            const matchesType = t.documentType === 'all' || t.documentType === documentType;
            return isActive && matchesType;
          });
          
          console.log('✅ Vorlagen für Dialog geladen:', filteredTemplates.length);
          setAvailableTemplates(filteredTemplates);
          // Reset search value when dialog opens
          setTemplateSearchValue('');
        }
      } catch (error) {
        console.error('❌ Fehler beim Neuladen der Vorlagen:', error);
      }
    };

    if (templateDialogOpen) {
      reloadTemplatesForDialog();
    }
  }, [templateDialogOpen, location?._id, documentType]);

  // Lade Kontakte für Empfänger-Auswahl
  useEffect(() => {
    const loadContacts = async () => {
      if (!open) return;
      
      setLoadingContacts(true);
      try {
        // Direkter API-Aufruf mit höherem Limit für bessere Suche
        const response: any = await apiRequest.get('/contacts', { limit: '500', isActive: 'true' });
        console.log('📞 Kontakte API Response:', response);
        
        if (response) {
          // Verschiedene mögliche Response-Strukturen
          let contacts: Contact[] = [];
          
          if (Array.isArray(response)) {
            contacts = response;
          } else if (response.data) {
            if (Array.isArray(response.data)) {
              contacts = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              contacts = response.data.data;
            } else if (response.data.contacts && Array.isArray(response.data.contacts)) {
              contacts = response.data.contacts;
            }
          } else if (response.contacts && Array.isArray(response.contacts)) {
            contacts = response.contacts;
          } else if (response.success && response.data && Array.isArray(response.data)) {
            contacts = response.data;
          }
          
          if (contacts.length > 0) {
            setAvailableContacts(contacts);
            console.log('✅ Kontakte geladen:', contacts.length, contacts.slice(0, 3));
          } else {
            console.warn('⚠️ Keine Kontakte gefunden in Response:', response);
            // Versuche Redux-Thunk als Fallback
            try {
              const result = await dispatch(fetchContacts(1)).unwrap();
              if (result && result.contacts && Array.isArray(result.contacts)) {
                setAvailableContacts(result.contacts);
                console.log('✅ Kontakte geladen (Redux):', result.contacts.length);
              } else {
                setAvailableContacts([]);
              }
            } catch (reduxError) {
              console.error('❌ Redux-Fallback fehlgeschlagen:', reduxError);
              setAvailableContacts([]);
            }
          }
        } else {
          console.error('❌ API Response leer:', response);
          setAvailableContacts([]);
        }
      } catch (error: any) {
        console.error('❌ Fehler beim Laden der Kontakte:', error);
        console.error('Error details:', error.response || error.message);
        // Versuche Redux-Thunk als Fallback
        try {
          const result = await dispatch(fetchContacts(1)).unwrap();
          if (result && result.contacts && Array.isArray(result.contacts)) {
            setAvailableContacts(result.contacts);
            console.log('✅ Kontakte geladen (Redux-Fallback):', result.contacts.length);
          } else {
            setAvailableContacts([]);
          }
        } catch (reduxError) {
          console.error('❌ Redux-Fallback fehlgeschlagen:', reduxError);
          setAvailableContacts([]);
        }
      } finally {
        setLoadingContacts(false);
      }
    };

    if (open) {
      loadContacts();
    }
  }, [open]);


  // Handler für Diagnosen hinzufügen
  const handleAddDiagnosis = (fullCode: any) => {
    const newDiagnosis: LinkedDiagnosis = {
      icd10Code: fullCode.code,
      display: fullCode.display,
      status: 'active',
      isPrimary: linkedDiagnoses.length === 0,
      catalogYear: new Date().getFullYear(),
      source: 'clinical'
    };
    setLinkedDiagnoses([...linkedDiagnoses, newDiagnosis]);
  };

  // Handler für Medikamente hinzufügen (öffnet Dialog)
  const handleAddMedication = (medication: any) => {
    if (!medication) return;
    
    let medicationId: string | undefined = undefined;
    if (medication._id) {
      medicationId = typeof medication._id === 'string' ? medication._id : medication._id.toString();
    } else if (medication.id) {
      medicationId = typeof medication.id === 'string' ? medication.id : medication.id.toString();
    }
    
    setSelectedMedication(medication);
    setEditingMedicationIndex(null);
    setMedicationFormData({
      dosage: medication.dosage || medication.strength || '',
      dosageUnit: medication.strengthUnit || '',
      frequency: medication.frequency || '',
      duration: '',
      instructions: '',
      startDate: '',
      endDate: '',
      quantity: '',
      quantityUnit: '',
      route: 'oral',
      changeType: 'added',
      notes: ''
    });
    setMedicationDialogOpen(true);
  };

  // Handler für Medikament bearbeiten
  const handleEditMedication = (index: number) => {
    const med = linkedMedications[index];
    if (!med) return;
    
    setEditingMedicationIndex(index);
    setSelectedMedication(med);
    setMedicationFormData({
      dosage: med.dosage || '',
      dosageUnit: med.dosageUnit || '',
      frequency: med.frequency || '',
      duration: med.duration || '',
      instructions: med.instructions || '',
      startDate: med.startDate ? (typeof med.startDate === 'string' ? med.startDate.split('T')[0] : new Date(med.startDate).toISOString().split('T')[0]) : '',
      endDate: med.endDate ? (typeof med.endDate === 'string' ? med.endDate.split('T')[0] : new Date(med.endDate).toISOString().split('T')[0]) : '',
      quantity: med.quantity?.toString() || '',
      quantityUnit: med.quantityUnit || '',
      route: (med.route as any) || 'oral',
      changeType: med.changeType || 'added',
      notes: med.notes || ''
    });
    setMedicationDialogOpen(true);
  };

  // Handler für Medikament speichern
  // Formatierungsfunktionen für zusätzliche Daten
  const formatVitalSigns = (vital: any): string => {
    const parts: string[] = [];
    if (vital.bloodPressure?.systolic && vital.bloodPressure?.diastolic) {
      parts.push(`<strong>Blutdruck:</strong> ${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic} mmHg`);
    }
    if (vital.pulse) {
      parts.push(`<strong>Puls:</strong> ${vital.pulse} bpm`);
    }
    if (vital.temperature?.value) {
      const unit = vital.temperature.unit === 'fahrenheit' ? '°F' : '°C';
      parts.push(`<strong>Temperatur:</strong> ${vital.temperature.value} ${unit}`);
    }
    if (vital.oxygenSaturation) {
      parts.push(`<strong>Sauerstoffsättigung:</strong> ${vital.oxygenSaturation}%`);
    }
    if (vital.respiratoryRate) {
      parts.push(`<strong>Atemfrequenz:</strong> ${vital.respiratoryRate} /min`);
    }
    if (vital.bloodGlucose?.value) {
      parts.push(`<strong>Blutzucker:</strong> ${vital.bloodGlucose.value} ${vital.bloodGlucose.unit || 'mg/dL'}`);
    }
    if (vital.weight?.value) {
      parts.push(`<strong>Gewicht:</strong> ${vital.weight.value} ${vital.weight.unit || 'kg'}`);
    }
    if (vital.height?.value) {
      parts.push(`<strong>Größe:</strong> ${vital.height.value} ${vital.height.unit || 'cm'}`);
    }
    if (vital.bmi) {
      parts.push(`<strong>BMI:</strong> ${vital.bmi}`);
    }
    if (vital.painScale?.value) {
      parts.push(`<strong>Schmerzskala (${vital.painScale.type || 'NRS'}):</strong> ${vital.painScale.value}`);
    }
    if (vital.notes) {
      parts.push(`<strong>Notizen:</strong> ${vital.notes}`);
    }
    const date = vital.recordedAt ? new Date(vital.recordedAt).toLocaleDateString('de-DE') : '';
    return `<p><strong>Vitalwerte vom ${date}</strong></p><p>${parts.join('<br />')}</p>`;
  };

  const formatLaborResults = (labor: any): string => {
    const parts: string[] = [];
    if (labor.testName || labor.name) {
      parts.push(`<strong>Test:</strong> ${labor.testName || labor.name}`);
    }
    if (labor.results && Array.isArray(labor.results)) {
      parts.push('<strong>Ergebnisse:</strong>');
      const resultsTable = labor.results.map((r: any) => {
        const value = r.value !== undefined ? r.value : '';
        const unit = r.unit ? ` ${r.unit}` : '';
        const reference = r.referenceRange ? ` (Referenz: ${r.referenceRange})` : '';
        const status = r.status ? ` <strong>[${r.status}]</strong>` : '';
        return `<tr><td>${r.parameter || r.name || ''}</td><td>${value}${unit}${reference}${status}</td></tr>`;
      }).join('');
      parts.push(`<table style="border-collapse: collapse; width: 100%; margin: 10px 0;"><thead><tr><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Parameter</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Wert</th></tr></thead><tbody>${resultsTable}</tbody></table>`);
    } else if (labor.value !== undefined) {
      const unit = labor.unit ? ` ${labor.unit}` : '';
      const reference = labor.referenceRange ? ` (Referenz: ${labor.referenceRange})` : '';
      parts.push(`<strong>Wert:</strong> ${labor.value}${unit}${reference}`);
    }
    if (labor.interpretation) {
      parts.push(`<strong>Interpretation:</strong> ${labor.interpretation}`);
    }
    if (labor.notes) {
      parts.push(`<strong>Notizen:</strong> ${labor.notes}`);
    }
    const date = labor.date || labor.collectedAt || labor.createdAt;
    const dateStr = date ? new Date(date).toLocaleDateString('de-DE') : '';
    return `<p><strong>Laborwerte vom ${dateStr}</strong></p><p>${parts.join('<br />')}</p>`;
  };

  const formatDicomStudy = (study: any): string => {
    const parts: string[] = [];
    if (study.studyDescription || study.description) {
      parts.push(`<strong>Studie:</strong> ${study.studyDescription || study.description}`);
    }
    if (study.modality) {
      parts.push(`<strong>Modalität:</strong> ${study.modality}`);
    }
    if (study.studyDate) {
      const date = new Date(study.studyDate).toLocaleDateString('de-DE');
      parts.push(`<strong>Datum:</strong> ${date}`);
    }
    if (study.referringPhysician) {
      parts.push(`<strong>Überweisender Arzt:</strong> ${study.referringPhysician}`);
    }
    if (study.clinicalInformation) {
      parts.push(`<strong>Klinische Information:</strong> ${study.clinicalInformation}`);
    }
    if (study.findings) {
      parts.push(`<strong>Befunde:</strong> ${study.findings}`);
    }
    if (study.notes) {
      parts.push(`<strong>Notizen:</strong> ${study.notes}`);
    }
    return `<p><strong>DICOM-Studie</strong></p><p>${parts.join('<br />')}</p>`;
  };

  const formatAppointment = (appointment: any): string => {
    const parts: string[] = [];
    if (appointment.startTime) {
      const startDate = new Date(appointment.startTime);
      parts.push(`<strong>Datum/Zeit:</strong> ${startDate.toLocaleDateString('de-DE')} ${startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`);
    }
    if (appointment.service?.name || appointment.type) {
      parts.push(`<strong>Art:</strong> ${appointment.service?.name || appointment.type}`);
    }
    if (appointment.doctor) {
      const doctorName = typeof appointment.doctor === 'string' 
        ? appointment.doctor 
        : `${appointment.doctor.title || ''} ${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim();
      if (doctorName) {
        parts.push(`<strong>Arzt:</strong> ${doctorName}`);
      }
    }
    if (appointment.title) {
      parts.push(`<strong>Titel:</strong> ${appointment.title}`);
    }
    if (appointment.description) {
      parts.push(`<strong>Beschreibung:</strong> ${appointment.description}`);
    }
    if (appointment.notes) {
      parts.push(`<strong>Notizen:</strong> ${appointment.notes}`);
    }
    if (appointment.status) {
      parts.push(`<strong>Status:</strong> ${appointment.status}`);
    }
    return `<p><strong>Termin</strong></p><p>${parts.join('<br />')}</p>`;
  };

  const formatPhoto = (photo: any): string => {
    const parts: string[] = [];
    if (photo.filename || photo.path) {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      let photoUrl: string;
      if (photo.path) {
        // Verwende path, falls vorhanden
        if (photo.path.startsWith('uploads/')) {
          photoUrl = `${apiUrl}/${photo.path}`;
        } else if (photo.path.startsWith('/') || photo.path.startsWith('C:') || photo.path.startsWith('D:')) {
          // Absoluter Pfad - extrahiere relativen Teil
          const uploadsIndex = photo.path.indexOf('uploads');
          if (uploadsIndex !== -1) {
            const relativePath = photo.path.substring(uploadsIndex);
            photoUrl = `${apiUrl}/${relativePath.replace(/\\/g, '/')}`;
          } else {
            photoUrl = `${apiUrl}/uploads/patient-photos/${photo.filename || 'unknown.jpg'}`;
          }
        } else {
          // Relativer Pfad
          const normalizedPath = photo.path.replace(/\\/g, '/').replace(/\/+/g, '/');
          photoUrl = `${apiUrl}/uploads/${normalizedPath}`;
        }
      } else if (photo.filename) {
        photoUrl = `${apiUrl}/uploads/patient-photos/${photo.filename}`;
      } else {
        photoUrl = `${apiUrl}/uploads/patient-photos/unknown.jpg`;
      }
      parts.push(`<img src="${photoUrl}" alt="Foto" style="max-width: 300px; height: auto; margin: 10px 0;" />`);
    }
    if (photo.description) {
      parts.push(`<strong>Beschreibung:</strong> ${photo.description}`);
    }
    if (photo.takenAt || photo.uploadedAt || photo.createdAt) {
      const date = photo.takenAt || photo.uploadedAt || photo.createdAt;
      const dateStr = date ? new Date(date).toLocaleDateString('de-DE') : '';
      parts.push(`<strong>Aufgenommen am:</strong> ${dateStr}`);
    }
    return `<p><strong>Foto</strong></p><p>${parts.join('<br />')}</p>`;
  };

  const handleSaveMedication = () => {
    if (!selectedMedication) return;
    
    let medicationId: string | undefined = undefined;
    let medicationName: string = '';
    
    if (editingMedicationIndex !== null) {
      const originalMed = linkedMedications[editingMedicationIndex];
      if (originalMed) {
        medicationId = originalMed.medicationId;
        medicationName = originalMed.name;
      }
    } else {
      if (selectedMedication._id) {
        medicationId = typeof selectedMedication._id === 'string' ? selectedMedication._id : selectedMedication._id.toString();
      } else if (selectedMedication.id) {
        medicationId = typeof selectedMedication.id === 'string' ? selectedMedication.id : selectedMedication.id.toString();
      }
      medicationName = selectedMedication.name || selectedMedication.Name || selectedMedication.medicationName || '';
    }
    
    const newMedication: any = {
      medicationId: medicationId,
      name: medicationName || selectedMedication.name || '',
      changeType: medicationFormData.changeType || 'added',
      dosage: medicationFormData.dosage?.trim() || '',
      dosageUnit: medicationFormData.dosageUnit?.trim() || '',
      frequency: medicationFormData.frequency?.trim() || '',
      duration: medicationFormData.duration?.trim() || '',
      instructions: medicationFormData.instructions?.trim() || '',
      quantityUnit: medicationFormData.quantityUnit?.trim() || '',
      route: medicationFormData.route || 'oral',
      notes: medicationFormData.notes?.trim() || ''
    };
    
    if (medicationFormData.startDate && medicationFormData.startDate.trim() !== '') {
      newMedication.startDate = new Date(medicationFormData.startDate);
    }
    if (medicationFormData.endDate && medicationFormData.endDate.trim() !== '') {
      newMedication.endDate = new Date(medicationFormData.endDate);
    }
    
    if (medicationFormData.quantity && medicationFormData.quantity.trim() !== '') {
      const qty = parseFloat(medicationFormData.quantity);
      if (!isNaN(qty)) {
        newMedication.quantity = qty;
      }
    }
    
    if (editingMedicationIndex !== null) {
      const updated = [...linkedMedications];
      updated[editingMedicationIndex] = newMedication;
      setLinkedMedications(updated);
    } else {
      setLinkedMedications([...linkedMedications, newMedication]);
    }
    
    handleCloseMedicationDialog();
  };

  const handleCloseMedicationDialog = () => {
    // Entferne Fokus von allen fokussierbaren Elementen im Medikamenten-Dialog
    const dialogElement = document.querySelector('.MuiDialog-root');
    if (dialogElement) {
      const focusedElement = dialogElement.querySelector(':focus') as HTMLElement;
      if (focusedElement && focusedElement.blur) {
        focusedElement.blur();
      }
    }
    
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      const isInDialog = activeElement.closest('.MuiDialog-root');
      if (isInDialog && activeElement.blur) {
        activeElement.blur();
      }
    }
    
    // Setze Fokus auf Body
    if (document.body && typeof document.body.focus === 'function') {
      document.body.focus();
    } else if (activeElement && activeElement.blur) {
      activeElement.blur();
    }
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        setMedicationDialogOpen(false);
      }, 0);
    });
    setEditingMedicationIndex(null);
    setSelectedMedication(null);
    setMedicationFormData({
      dosage: '',
      dosageUnit: '',
      frequency: '',
      duration: '',
      instructions: '',
      startDate: '',
      endDate: '',
      quantity: '',
      quantityUnit: '',
      route: 'oral',
      changeType: 'added',
      notes: ''
    });
  };

  // Handler für Diagnosen entfernen
  const handleRemoveDiagnosis = (index: number) => {
    setLinkedDiagnoses(linkedDiagnoses.filter((_, i) => i !== index));
  };

  // Handler für Medikamente entfernen
  const handleRemoveMedication = (index: number) => {
    setLinkedMedications(linkedMedications.filter((_, i) => i !== index));
  };

  // Handler für Resize der Sidebar
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 250 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('documentSidebarWidth', sidebarWidth.toString());
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  // Handler für "In Brief übernehmen" aus Sidebar
  const handleAddFromSidebar = (type: 'labor' | 'vital' | 'dicom' | 'document' | 'dekurs', data: any) => {
    switch (type) {
      case 'labor':
        handleAddLaborResult(data);
        break;
      case 'vital':
        handleAddVitalSigns(data);
        break;
      case 'dicom':
        handleAddDicomStudy(data);
        break;
      case 'document':
        // Dokument als Referenz hinzufügen
        const docSection: LetterSection = {
          id: `document-${data._id || data.id || Date.now()}`,
          title: 'Dokument-Referenz',
          content: `<p><strong>${data.title || 'Dokument'}</strong></p><p>Erstellt am: ${data.createdAt ? new Date(data.createdAt).toLocaleDateString('de-DE') : 'Unbekannt'}</p>${data.content?.text ? `<p>${data.content.text}</p>` : ''}`,
          source: 'document',
          dataId: data._id || data.id
        };
        setLetterSections([...letterSections, docSection]);
        break;
      case 'dekurs':
        // Dekurs-Eintrag als Sektion hinzufügen
        const dekursSection: LetterSection = {
          id: `dekurs-${data._id || data.id || Date.now()}`,
          title: 'Dekurs-Eintrag',
          content: `<p><strong>Besuchsgrund:</strong> ${data.visitReason || 'Kein Besuchsgrund'}</p>${data.clinicalObservations ? `<p><strong>Klinische Beobachtungen:</strong> ${data.clinicalObservations}</p>` : ''}${data.findings ? `<p><strong>Befunde:</strong> ${data.findings}</p>` : ''}${data.treatmentDetails ? `<p><strong>Behandlungsdetails:</strong> ${data.treatmentDetails}</p>` : ''}${data.notes ? `<p><strong>Notizen:</strong> ${data.notes}</p>` : ''}`,
          source: 'dekurs',
          dataId: data._id || data.id
        };
        setLetterSections([...letterSections, dekursSection]);
        break;
    }
  };

  // Handler für Detailansicht öffnen
  const handleViewDetails = (type: 'labor' | 'vital' | 'dicom' | 'document' | 'dekurs', data: any) => {
    setDetailDialogData({ type, data });
    setDetailDialogOpen(true);
  };

  // Handler für Übernahme zusätzlicher Daten
  const handleAddVitalSigns = (vital: any) => {
    const formattedContent = formatVitalSigns(vital);
    const newSection: LetterSection = {
      id: `vital-${vital._id || vital.id || Date.now()}`,
      title: 'Vitalwerte',
      content: formattedContent,
      source: 'vital',
      dataId: vital._id || vital.id
    };
    setLetterSections([...letterSections, newSection]);
    setAdditionalDataDialogOpen(false);
  };

  const handleAddLaborResult = (labor: any) => {
    const formattedContent = formatLaborResults(labor);
    const newSection: LetterSection = {
      id: `labor-${labor._id || labor.id || Date.now()}`,
      title: 'Laborwerte',
      content: formattedContent,
      source: 'labor',
      dataId: labor._id || labor.id
    };
    setLetterSections([...letterSections, newSection]);
    setAdditionalDataDialogOpen(false);
  };

  const handleAddDicomStudy = (study: any) => {
    const formattedContent = formatDicomStudy(study);
    const newSection: LetterSection = {
      id: `dicom-${study._id || study.id || Date.now()}`,
      title: 'DICOM-Studie',
      content: formattedContent,
      source: 'dicom',
      dataId: study._id || study.id
    };
    setLetterSections([...letterSections, newSection]);
    setAdditionalDataDialogOpen(false);
  };

  const handleAddAppointment = (appointment: any) => {
    const formattedContent = formatAppointment(appointment);
    const newSection: LetterSection = {
      id: `appointment-${appointment._id || appointment.id || Date.now()}`,
      title: 'Termin',
      content: formattedContent,
      source: 'appointment',
      dataId: appointment._id || appointment.id
    };
    setLetterSections([...letterSections, newSection]);
    setAdditionalDataDialogOpen(false);
  };

  const handleAddPhoto = (photo: any) => {
    const formattedContent = formatPhoto(photo);
    const newSection: LetterSection = {
      id: `photo-${photo._id || photo.id || Date.now()}`,
      title: 'Foto',
      content: formattedContent,
      source: 'photo',
      dataId: photo._id || photo.id
    };
    setLetterSections([...letterSections, newSection]);
    setAdditionalDataDialogOpen(false);
  };

  // Handler für Vorlage hinzufügen
  const handleAddTemplate = async () => {
    console.log('🔍 handleAddTemplate aufgerufen');
    console.log('🔍 availableTemplates vor Öffnen:', availableTemplates.length, availableTemplates);
    console.log('🔍 documentType:', documentType);
    console.log('🔍 location.letterTemplates:', location?.letterTemplates?.length);
    
    // Stelle sicher, dass Vorlagen geladen sind, bevor der Dialog geöffnet wird
    if (!location?._id) {
      console.warn('⚠️ Keine Standort-ID verfügbar');
      return;
    }

    try {
      let templates: any[] = [];
      
      // Lade immer von API, um sicherzustellen, dass alle Vorlagen vorhanden sind
      console.log('📋 Lade Vorlagen von API beim Öffnen...');
      const response: any = await apiRequest.get(`/locations/${location._id}/letter-templates`);
      console.log('📋 Vorlagen API Response beim Öffnen:', response);
      
      if (response) {
        // Verschiedene mögliche Response-Strukturen
        if (Array.isArray(response)) {
          templates = response;
        } else if (response.templates && Array.isArray(response.templates)) {
          templates = response.templates;
        } else if (response.data) {
          if (Array.isArray(response.data)) {
            templates = response.data;
          } else if (response.data.templates && Array.isArray(response.data.templates)) {
            templates = response.data.templates;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            templates = response.data.data;
          }
        } else if (response.success && response.templates && Array.isArray(response.templates)) {
          templates = response.templates;
        }
      }
      
      // Falls keine Vorlagen von API, verwende die aus dem Location-Objekt als Fallback
      if (templates.length === 0 && location.letterTemplates && Array.isArray(location.letterTemplates) && location.letterTemplates.length > 0) {
        console.log('📋 Verwende Vorlagen aus Location-Objekt als Fallback:', location.letterTemplates.length);
        templates = location.letterTemplates;
      }
      
      console.log('📋 Alle Vorlagen vor Filterung:', templates.length, templates);
      
      // Filtere nur aktive Vorlagen, die für diesen Dokumenttyp oder "all" sind
      const filteredTemplates = templates.filter((t: any) => {
        const isActive = t.isActive !== false;
        const matchesType = t.documentType === 'all' || t.documentType === documentType;
        console.log(`🔍 Vorlage "${t.name || 'Unbenannt'}": isActive=${isActive}, documentType=${t.documentType}, matchesType=${matchesType}, currentDocumentType=${documentType}`);
        return isActive && matchesType;
      });
      
      console.log('✅ Gefilterte Vorlagen:', filteredTemplates.length, filteredTemplates);
      setAvailableTemplates(filteredTemplates);
      // Reset search value before opening dialog
      setTemplateSearchValue('');
      
      // Öffne den Dialog nach State-Update
      // Verwende requestAnimationFrame und setTimeout, um sicherzustellen, dass der State aktualisiert ist
      requestAnimationFrame(() => {
        setTimeout(() => {
          console.log('✅ Öffne Vorlagen-Dialog mit', filteredTemplates.length, 'Vorlagen');
          // Update key to force Autocomplete reset
          setTemplateDialogKey(prev => prev + 1);
          setTemplateDialogOpen(true);
        }, 50);
      });
    } catch (error) {
      console.error('❌ Fehler beim Laden der Vorlagen:', error);
      setAvailableTemplates([]);
      // Öffne den Dialog trotzdem, damit der Benutzer die Fehlermeldung sieht
      setTemplateDialogOpen(true);
    }
  };

  // Handler für Vorlage auswählen
  const handleSelectTemplate = (template: any) => {
    console.log('🔍 Template ausgewählt:', template);
    console.log('🔍 Template Content (vorher):', template.content);
    console.log('🔍 Patient:', patient);
    console.log('🔍 User:', user);
    console.log('🔍 Location:', location);
    
    // Platzhalter ersetzen mit neuer Utility-Funktion (unterstützt beide Formate)
    const context: PlaceholderContext = {
      patient: patient || undefined,
      doctor: selectedDoctor ? {
        firstName: selectedDoctor.firstName,
        lastName: selectedDoctor.lastName,
        title: selectedDoctor.title,
        specialization: selectedDoctor.specialization,
        email: selectedDoctor.email,
        phone: selectedDoctor.phone,
      } : user ? {
        firstName: user.firstName,
        lastName: user.lastName,
        title: (user as any)?.title,
        specialization: (user as any)?.specialization,
        email: user.email,
      } : undefined,
      location: location || undefined,
      date: new Date(),
    };
    
    console.log('🔍 Context:', context);
    
    const processedContent = replacePlaceholders(template.content, context);
    console.log('🔍 Processed Content (nachher):', processedContent);

    const newSection: LetterSection = {
      id: `template-${Date.now()}-${Math.random()}`,
      title: template.name,
      content: processedContent,
      source: 'template',
      templateId: template._id || template.id,
      templateName: template.name
    };
    // Füge die Vorlage am Anfang der Liste ein (direkt nach dem Button)
    setLetterSections([newSection, ...letterSections]);
    
    // Reset search value and close dialog
    setTemplateSearchValue('');
    setTemplateDialogOpen(false);
  };

  // Handler für Sektion-Content aktualisieren
  const updateSectionContent = (sectionId: string, content: string) => {
    setLetterSections(letterSections.map(s => 
      s.id === sectionId ? { ...s, content } : s
    ));
  };

  // Handler für neue Sektion hinzufügen
  const handleAddSection = () => {
    const newSection: LetterSection = {
      id: `section-${Date.now()}-${Math.random()}`,
      title: 'Neue Sektion',
      content: '',
      source: 'manual'
    };
    setLetterSections([...letterSections, newSection]);
  };

  // Handler für Sektion entfernen
  const handleRemoveSection = (sectionId: string) => {
    setLetterSections(letterSections.filter(s => s.id !== sectionId));
  };

  // Handler für Sektion-Titel aktualisieren
  const updateSectionTitle = (sectionId: string, newTitle: string) => {
    setLetterSections(letterSections.map(s => 
      s.id === sectionId ? { ...s, title: newTitle } : s
    ));
  };

  // Handler für Sektion nach oben verschieben (alle Sektionen zusammen)
  const handleMoveSectionUp = (sectionId: string) => {
    const index = letterSections.findIndex(s => s.id === sectionId);
    if (index > 0) {
      const newSections = [...letterSections];
      [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
      setLetterSections(newSections);
    }
  };

  // Handler für Sektion nach unten verschieben (alle Sektionen zusammen)
  const handleMoveSectionDown = (sectionId: string) => {
    const index = letterSections.findIndex(s => s.id === sectionId);
    if (index < letterSections.length - 1) {
      const newSections = [...letterSections];
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      setLetterSections(newSections);
    }
  };

  // HTML-Generierung für Speichern
  const generateHtmlContent = (): string => {
    let html = '<div style="font-family: Arial, sans-serif;">';
    
    // Briefkopf
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 30px;">';
    if (location?.logo?.filename) {
      html += `<img src="/api/uploads/location-logos/${location.logo.filename}" alt="${location.name}" style="max-height: 80px;" onerror="this.style.display='none';" />`;
    } else {
      html += `<h2>${location?.name || ''}</h2>`;
    }
    html += `<div style="text-align: right;">${new Date().toLocaleDateString('de-DE')}</div>`;
    html += '</div>';
    
    // Arztdaten
    html += '<div style="margin-bottom: 20px;">';
    html += `<p><strong>${selectedDoctor?.title || ''} ${selectedDoctor?.firstName || ''} ${selectedDoctor?.lastName || ''}</strong></p>`;
    html += `<p>${location?.address_line1 || ''}${location?.address_line2 ? ', ' + location.address_line2 : ''}</p>`;
    html += `<p>${location?.postal_code || ''} ${location?.city || ''}</p>`;
    if (selectedDoctor?.phone || location?.owner?.phone || location?.phone) {
      html += `<p>Tel: ${selectedDoctor?.phone || location?.owner?.phone || location?.phone}</p>`;
    }
    if (selectedDoctor?.email || location?.owner?.email || location?.email) {
      html += `<p>Email: ${selectedDoctor?.email || location?.owner?.email || location?.email}</p>`;
    }
    if (selectedDoctor?.website || location?.owner?.website) {
      html += `<p>Web: ${selectedDoctor?.website || location?.owner?.website}</p>`;
    }
    html += '</div>';
    
    // Diagnosen
    if (linkedDiagnoses.length > 0) {
      html += '<div style="margin-top: 30px; margin-bottom: 20px;">';
      html += '<h3>Diagnosen</h3>';
      html += '<ul>';
      linkedDiagnoses.forEach(diag => {
        html += `<li><strong>${diag.icd10Code}</strong> - ${diag.display}`;
        if (diag.isPrimary) html += ' <em>(Hauptdiagnose)</em>';
        if (diag.notes) html += `<br/><small>${diag.notes}</small>`;
        html += '</li>';
      });
      html += '</ul>';
      html += '</div>';
    }
    
    // Medikamente
    if (linkedMedications.length > 0) {
      html += '<div style="margin-top: 30px; margin-bottom: 20px;">';
      html += '<h3>Medikamente</h3>';
      html += '<ul>';
      linkedMedications.forEach(med => {
        html += `<li><strong>${med.name}</strong>`;
        if (med.dosage && med.dosageUnit) html += ` - ${med.dosage} ${med.dosageUnit}`;
        if (med.frequency) html += `, ${med.frequency}`;
        if (med.instructions) html += `<br/><small>${med.instructions}</small>`;
        html += '</li>';
      });
      html += '</ul>';
      html += '</div>';
    }
    
    // Briefinhalt
    html += '<div style="margin-top: 30px;">';
    letterSections.forEach(section => {
      // Titel nur anzeigen, wenn vorhanden und nicht leer
      // Bei Vorlagen: Wenn Titel leer ist, keinen Titel anzeigen
      if (section.title && section.title.trim() !== '') {
        html += `<h3>${section.title}</h3>`;
      }
      html += `<p style="white-space: pre-wrap;">${section.content}</p>`;
    });
    if (letterContent) {
      html += '<h3>Zusätzliche Notizen</h3>';
      html += `<p style="white-space: pre-wrap;">${letterContent}</p>`;
    }
    html += '</div>';
    
    html += '</div>';
    return html;
  };

  // Druck-Funktion
  const handlePrint = () => {
    const printContent = generatePrintHtml();
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Pop-up-Blocker verhindert das Öffnen des Druckfensters.');
      return;
    }
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
    
    setTimeout(() => {
      if (printWindow.document.readyState === 'complete') {
        printWindow.print();
      }
    }, 500);
  };

  // Template-Auswahl basierend auf Dokumenttyp und Standort-Einstellungen
  const getSelectedTemplate = (): 'template1' | 'template2' | 'template3' | 'custom' => {
    const docType = 'patientenbrief'; // Für Patientenbrief
    const templates = location?.letterheadTemplates;
    console.log('🔍 Template-Auswahl:', {
      location: location?._id,
      templates,
      docType,
      selectedTemplate: templates?.[docType]
    });
    const template = templates?.[docType] || 'template1';
    console.log('✅ Verwendete Vorlage:', template);
    return template as 'template1' | 'template2' | 'template3' | 'custom';
  };

  // Template-spezifische Briefkopf-Generierung
  const generateLetterhead = (logoUrl: string | null, template: 'template1' | 'template2' | 'template3' | 'custom'): string => {
    const doctorName = selectedDoctor 
      ? `${selectedDoctor.title || ''} ${selectedDoctor.firstName || ''} ${selectedDoctor.lastName || ''}`.trim()
      : user 
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : '';
    const phone = selectedDoctor?.phone || location?.owner?.phone || location?.phone;
    const email = selectedDoctor?.email || location?.owner?.email || location?.email;
    const website = selectedDoctor?.website || location?.owner?.website;
    const address = location ? `${location.address_line1}${location.address_line2 ? ', ' + location.address_line2 : ''}` : '';
    const postalCity = location ? `${location.postal_code || ''} ${location.city || ''}`.trim() : '';
    const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let html = '<div class="letterhead">';

    switch (template) {
      case 'template1':
        // Vorlage 1: Logo links, Arzt rechts
        html += '<div class="letterhead-top" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">';
        html += '<div class="logo-container" style="flex:0 0 auto;">';
        if (logoUrl) {
          html += `<img src="${logoUrl}" alt="${location?.name || ''}" onerror="this.style.display='none';" style="max-height:100px; max-width:250px;" />`;
        } else if (location?.name) {
          html += `<h2 style="margin:0; font-size:18pt; color:#2c3e50;">${location.name}</h2>`;
        }
        html += '</div>';
        html += '<div style="text-align:right; flex:0 0 auto;">';
        html += `<div class="letterhead-date" style="font-size:10pt; color:#555; margin-bottom:10px;">${date}</div>`;
        if (doctorName) {
          html += `<div class="doctor-name" style="font-weight:bold; color:#2c3e50; margin-bottom:5px;">${doctorName}</div>`;
        }
        if (address) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${address}</div>`;
        if (postalCity) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${postalCity}</div>`;
        if (phone) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Tel.: ${phone}</div>`;
        if (email) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">E-Mail: ${email}</div>`;
        if (website) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Web: ${website}</div>`;
        html += '</div>';
        html += '</div>';
        break;

      case 'template2':
        // Vorlage 2: Kontaktdaten links, Logo rechts
        html += '<div class="letterhead-top" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">';
        html += '<div style="flex:1; margin-right:20px;">';
        if (doctorName) {
          html += `<div class="doctor-name" style="font-weight:bold; color:#2c3e50; margin-bottom:5px;">${doctorName}</div>`;
        }
        if (address) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${address}</div>`;
        if (postalCity) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${postalCity}</div>`;
        if (phone) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Tel.: ${phone}</div>`;
        if (email) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">E-Mail: ${email}</div>`;
        if (website) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Web: ${website}</div>`;
        html += '</div>';
        html += '<div class="logo-container" style="flex:0 0 auto; text-align:right;">';
        if (logoUrl) {
          html += `<img src="${logoUrl}" alt="${location?.name || ''}" onerror="this.style.display='none';" style="max-height:100px; max-width:250px;" />`;
        } else if (location?.name) {
          html += `<h2 style="margin:0; font-size:18pt; color:#2c3e50; text-align:right;">${location.name}</h2>`;
        }
        html += `<div class="letterhead-date" style="font-size:10pt; color:#555; margin-top:10px;">${date}</div>`;
        html += '</div>';
        html += '</div>';
        break;

      case 'template3':
        // Vorlage 3: Drei-Spalten-Layout
        html += '<div class="letterhead-top" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">';
        html += '<div style="flex:1; margin-right:15px;">';
        if (logoUrl) {
          html += `<img src="${logoUrl}" alt="${location?.name || ''}" onerror="this.style.display='none';" style="max-height:80px; max-width:200px;" />`;
        } else if (location?.name) {
          html += `<h3 style="margin:0; font-size:16pt; color:#2c3e50;">${location.name}</h3>`;
        }
        html += '</div>';
        html += '<div style="flex:1; text-align:center; margin:0 15px;">';
        if (doctorName) {
          html += `<div class="doctor-name" style="font-weight:bold; color:#2c3e50; margin-bottom:5px;">${doctorName}</div>`;
        }
        if (address) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${address}</div>`;
        if (postalCity) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${postalCity}</div>`;
        html += '</div>';
        html += '<div style="flex:1; text-align:right; margin-left:15px;">';
        html += `<div class="letterhead-date" style="font-size:10pt; color:#555; margin-bottom:10px;">${date}</div>`;
        if (phone) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Tel.: ${phone}</div>`;
        if (email) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">E-Mail: ${email}</div>`;
        if (website) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Web: ${website}</div>`;
        html += '</div>';
        html += '</div>';
        break;

      default:
        // Custom/Standard: Wie template1
        html += '<div class="letterhead-top" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">';
        html += '<div class="logo-container" style="flex:0 0 auto;">';
        if (logoUrl) {
          html += `<img src="${logoUrl}" alt="${location?.name || ''}" onerror="this.style.display='none';" style="max-height:100px; max-width:250px;" />`;
        } else if (location?.name) {
          html += `<h2 style="margin:0; font-size:18pt; color:#2c3e50;">${location.name}</h2>`;
        }
        html += '</div>';
        html += '<div style="text-align:right; flex:0 0 auto;">';
        html += `<div class="letterhead-date" style="font-size:10pt; color:#555; margin-bottom:10px;">${date}</div>`;
        if (doctorName) {
          html += `<div class="doctor-name" style="font-weight:bold; color:#2c3e50; margin-bottom:5px;">${doctorName}</div>`;
        }
        if (address) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${address}</div>`;
        if (postalCity) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${postalCity}</div>`;
        if (phone) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Tel.: ${phone}</div>`;
        if (email) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">E-Mail: ${email}</div>`;
        if (website) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Web: ${website}</div>`;
        html += '</div>';
        html += '</div>';
    }

    html += '</div>'; // End letterhead
    return html;
  };

  // Print-HTML-Generierung
  const generatePrintHtml = (): string => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    // Logo-Pfad: Logos werden in ./uploads/location-logos gespeichert und unter /uploads serviert
    let logoUrl: string | null = null;
    if (location?.logo?.filename) {
      // Versuche verschiedene mögliche Pfade
      logoUrl = `${apiUrl}/uploads/location-logos/${location.logo.filename}`;
    } else if (location?.logo?.path) {
      // Falls path direkt gesetzt ist
      const path = location.logo.path.replace(/^\.\//, '').replace(/^uploads\//, '');
      logoUrl = `${apiUrl}/uploads/${path}`;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Patientenbrief - ${patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}</title>
          <style>
            @page { 
              margin: 2.5cm 2cm; 
              size: A4;
            }
            
            * {
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 11pt;
              line-height: 1.5;
              color: #1a1a1a;
              margin: 0;
              padding: 0;
              background: #fff;
            }
            
            .letter-container {
              max-width: 100%;
              margin: 0 auto;
            }
            
            /* Briefkopf */
            .letterhead {
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #2c3e50;
            }
            
            .letterhead-top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 25px;
            }
            
            .logo-container {
              flex: 0 0 auto;
            }
            
            .logo-container img {
              max-height: 100px;
              max-width: 250px;
              height: auto;
              width: auto;
              object-fit: contain;
            }
            
            .letterhead-date {
              text-align: right;
              font-size: 10pt;
              color: #555;
              margin-top: 5px;
            }
            
            /* Arzt- und Standortdaten */
            .sender-info {
              margin-top: 20px;
              padding: 15px 0;
              border-top: 1px solid #e0e0e0;
            }
            
            .sender-info .doctor-name {
              font-size: 12pt;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 8px;
            }
            
            .sender-info .address-line {
              font-size: 10pt;
              color: #444;
              margin: 3px 0;
              line-height: 1.4;
            }
            
            .sender-info .contact-info {
              font-size: 10pt;
              color: #555;
              margin: 3px 0;
            }
            
            /* Patientendaten */
            .patient-info {
              margin: 25px 0;
              padding: 15px;
              background: #f8f9fa;
              border-left: 4px solid #2c3e50;
            }
            
            .patient-info .patient-name {
              font-size: 11pt;
              font-weight: bold;
              margin-bottom: 8px;
            }
            
            .patient-info .patient-detail {
              font-size: 10pt;
              margin: 3px 0;
              color: #555;
            }
            
            /* Sektionen */
            .section {
              margin: 25px 0;
              page-break-inside: avoid;
            }
            
            .section-title {
              font-size: 12pt;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 12px;
              padding-bottom: 5px;
              border-bottom: 1px solid #ddd;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .section-content {
              font-size: 11pt;
              line-height: 1.6;
              color: #333;
              white-space: pre-wrap;
              text-align: justify;
              margin-top: 10px;
            }
            
            /* Diagnosen und Medikamente */
            .diagnoses-list, .medications-list {
              list-style: none;
              padding: 0;
              margin: 10px 0;
            }
            
            .diagnoses-list li, .medications-list li {
              padding: 10px 12px;
              margin-bottom: 8px;
              background: #ffffff;
              border: 1px solid #e0e0e0;
              border-left: 4px solid #2c3e50;
              border-radius: 2px;
              font-size: 10pt;
            }
            
            .diagnoses-list li strong, .medications-list li strong {
              color: #2c3e50;
              font-weight: 600;
            }
            
            .chip {
              display: inline-block;
              background: #e8eaf6;
              color: #3f51b5;
              padding: 2px 8px;
              border-radius: 3px;
              margin: 0 3px;
              font-size: 9pt;
              font-weight: 500;
            }
            
            /* Abschluss */
            .closing {
              margin-top: 40px;
              padding-top: 20px;
            }
            
            .signature-line {
              margin-top: 60px;
              border-top: 1px solid #ccc;
              padding-top: 10px;
              font-size: 10pt;
            }
            
            /* Druck-Optimierungen */
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              
              .section {
                page-break-inside: avoid;
              }
              
              .diagnoses-list li, .medications-list li {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${generatePrintBody(logoUrl)}
        </body>
      </html>
    `;
  };

  const generatePrintBody = (logoUrl: string | null): string => {
    const template = getSelectedTemplate();
    let html = '<div class="letter-container">';
    
    // Briefkopf mit Template
    html += generateLetterhead(logoUrl, template);
    
    // Empfänger-Adresse (falls vorhanden)
    if (recipient && recipient.type && recipient.type !== 'patient') {
      html += '<div class="recipient-info" style="margin:30px 0; padding:15px; background:#f8f9fa; border-left:4px solid #2c3e50;">';
      if (recipient.salutation) {
        html += `<div style="font-size:11pt; margin-bottom:8px; font-weight:500;">${recipient.salutation}</div>`;
      }
      if (recipient.name) {
        html += `<div style="font-weight:bold; margin-bottom:5px;">${recipient.title ? recipient.title + ' ' : ''}${recipient.name}</div>`;
      }
      if (recipient.organization) {
        html += `<div style="margin-bottom:5px; font-weight:500;">${recipient.organization}</div>`;
      }
      if (recipient.address) {
        if (recipient.address.street) {
          html += `<div style="font-size:10pt; margin:2px 0;">${recipient.address.street}</div>`;
        }
        if (recipient.address.postalCode || recipient.address.city) {
          html += `<div style="font-size:10pt; margin:2px 0;">${recipient.address.postalCode || ''} ${recipient.address.city || ''}</div>`;
        }
        if (recipient.address.country) {
          html += `<div style="font-size:10pt; margin:2px 0;">${recipient.address.country}</div>`;
        }
      }
      html += '</div>';
    }
    
    // Patientendaten
    if (patient) {
      // Bestimme die korrekte Bezeichnung basierend auf dem Geschlecht
      const patientLabel = (patient.gender === 'female' || patient.gender === 'weiblich' || patient.gender === 'f') 
        ? 'Patientin' 
        : 'Patient';
      
      html += '<div class="patient-info">';
      html += `<div class="patient-name"><strong>${patientLabel}:</strong> ${patient.firstName} ${patient.lastName}</div>`;
      if (patient.dateOfBirth) {
        html += `<div class="patient-detail">Geburtsdatum: ${new Date(patient.dateOfBirth).toLocaleDateString('de-DE')}</div>`;
      }
      if (patient.socialSecurityNumber) {
        html += `<div class="patient-detail">SVNR: ${patient.socialSecurityNumber}</div>`;
      }
      html += '</div>';
    }
    
    // Diagnosen
    if (linkedDiagnoses.length > 0) {
      html += '<div class="section">';
      html += '<div class="section-title">Diagnosen</div>';
      html += '<ul class="diagnoses-list">';
      linkedDiagnoses.forEach(diag => {
        html += '<li>';
        html += `<strong>${diag.icd10Code}</strong> - ${diag.display}`;
        if (diag.isPrimary) html += ' <span class="chip">Hauptdiagnose</span>';
        if (diag.status) {
          const statusLabel = diag.status === 'active' ? 'Aktiv' : 
                            diag.status === 'resolved' ? 'Behoben' :
                            diag.status === 'provisional' ? 'Verdachtsdiagnose' :
                            diag.status === 'ruled-out' ? 'Ausgeschlossen' : diag.status;
          html += ` <span class="chip">${statusLabel}</span>`;
        }
        if (diag.severity) {
          const severityLabel = diag.severity === 'mild' ? 'Leicht' :
                               diag.severity === 'moderate' ? 'Mäßig' :
                               diag.severity === 'severe' ? 'Schwer' :
                               diag.severity === 'critical' ? 'Kritisch' : '';
          if (severityLabel) html += ` <span class="chip">${severityLabel}</span>`;
        }
        if (diag.side) {
          const sideLabel = diag.side === 'left' ? 'Links' : 
                           diag.side === 'right' ? 'Rechts' : 
                           diag.side === 'bilateral' ? 'Beidseitig' : '';
          if (sideLabel) html += ` <span class="chip">${sideLabel}</span>`;
        }
        if (diag.notes) {
          html += `<div style="margin-top:5px; font-size:9pt; color:#666;">${diag.notes}</div>`;
        }
        html += '</li>';
      });
      html += '</ul>';
      html += '</div>';
    }
    
    // Medikamente
    if (linkedMedications.length > 0) {
      html += '<div class="section">';
      html += '<div class="section-title">Medikamente</div>';
      html += '<ul class="medications-list">';
      linkedMedications.forEach(med => {
        html += '<li>';
        html += `<strong>${med.name}</strong>`;
        const details = [];
        if (med.dosage && med.dosageUnit) details.push(`${med.dosage} ${med.dosageUnit}`);
        if (med.frequency) details.push(med.frequency);
        if (med.duration) details.push(`Dauer: ${med.duration}`);
        if (med.route && med.route !== 'oral') {
          const routeLabel = med.route === 'topical' ? 'topisch' :
                           med.route === 'injection' ? 'Injektion' :
                           med.route === 'inhalation' ? 'Inhalation' :
                           med.route === 'rectal' ? 'rektal' :
                           med.route === 'vaginal' ? 'vaginal' : 'sonstig';
          details.push(routeLabel);
        }
        if (details.length > 0) {
          html += ` - ${details.join(', ')}`;
        }
        if (med.instructions) {
          html += `<div style="margin-top:5px; font-size:9pt; color:#666;"><strong>Einnahmehinweise:</strong> ${med.instructions}</div>`;
        }
        if (med.notes) {
          html += `<div style="margin-top:5px; font-size:9pt; color:#666;"><strong>Notizen:</strong> ${med.notes}</div>`;
        }
        html += '</li>';
      });
      html += '</ul>';
      html += '</div>';
    }
    
    // Briefinhalt
    letterSections.forEach(section => {
      html += '<div class="section">';
      // Titel nur anzeigen, wenn vorhanden und nicht leer
      // Bei Vorlagen: Wenn Titel leer ist, keinen Titel anzeigen
      if (section.title && section.title.trim() !== '') {
        html += `<div class="section-title">${section.title}</div>`;
      }
      html += `<div class="section-content">${section.content}</div>`;
      html += '</div>';
    });
    
    if (letterContent) {
      html += '<div class="section">';
      html += '<div class="section-title">Zusätzliche Notizen</div>';
      html += `<div class="section-content">${letterContent}</div>`;
      html += '</div>';
    }
    
    // Abschluss
    html += '<div class="closing">';
    html += '<div class="signature-line">';
    html += '<div style="margin-bottom:40px;">Mit freundlichen Grüßen</div>';
    if (selectedDoctor || user) {
      const signerName = selectedDoctor 
        ? `${selectedDoctor.title || ''} ${selectedDoctor.firstName || ''} ${selectedDoctor.lastName || ''}`.trim()
        : user 
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
          : '';
      if (signerName) {
        html += `<div>${signerName}</div>`;
      }
    }
    html += '</div>';
    html += '</div>';
    
    html += '</div>'; // End letter-container
    return html;
  };

  // Speichern-Funktion
  const handleSave = async (finalize: boolean = false) => {
    if (!patient || !user) return;

    setSaving(true);
    setError(null);

    try {
      const documentData = {
        type: 'sonstiges' as const,
        title: `Patientenbrief für ${patient.firstName} ${patient.lastName}`,
        content: {
          text: generatePlainTextContent(),
          html: generateHtmlContent()
        },
        patient: {
          id: patient._id || patient.id || '',
          name: `${patient.firstName} ${patient.lastName}`,
          dateOfBirth: patient.dateOfBirth || '',
          socialSecurityNumber: patient.socialSecurityNumber
        },
        doctor: {
          id: selectedDoctor?._id || user?._id || user?.id || '',
          name: selectedDoctor ? `${selectedDoctor.title || ''} ${selectedDoctor.firstName || ''} ${selectedDoctor.lastName || ''}`.trim() : (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''),
          title: selectedDoctor?.title || undefined,
          specialization: selectedDoctor?.specialization || undefined,
        },
        recipient: recipient || undefined,
        status: (finalize ? 'ready' : 'draft') as 'ready' | 'draft'
      };

      await dispatch(createDocument(documentData));
      
      // Dokumente neu laden
      if (patient._id || patient.id) {
        dispatch(fetchDocuments({ patientId: patient._id || patient.id }));
      }

      // Callback aufrufen, um zum Dokumenten-Tab zu navigieren
      if (onSaveSuccess) {
        onSaveSuccess();
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern des Patientenbriefs');
    } finally {
      setSaving(false);
    }
  };

  const generatePlainTextContent = (): string => {
    let text = `Patientenbrief für ${patient?.firstName} ${patient?.lastName}\n\n`;
    text += `Datum: ${new Date().toLocaleDateString('de-DE')}\n\n`;
    
    if (linkedDiagnoses.length > 0) {
      text += 'Diagnosen:\n';
      linkedDiagnoses.forEach(diag => {
        text += `- ${diag.icd10Code} - ${diag.display}`;
        if (diag.isPrimary) text += ' (Hauptdiagnose)';
        text += '\n';
      });
      text += '\n';
    }
    
    if (linkedMedications.length > 0) {
      text += 'Medikamente:\n';
      linkedMedications.forEach(med => {
        text += `- ${med.name}`;
        if (med.dosage && med.dosageUnit) text += ` (${med.dosage} ${med.dosageUnit})`;
        text += '\n';
      });
      text += '\n';
    }
    
    letterSections.forEach(section => {
      text += `${section.title}:\n${section.content}\n\n`;
    });
    
    if (letterContent) {
      text += `Zusätzliche Notizen:\n${letterContent}\n`;
    }
    
    return text;
  };

  // Reset beim Schließen
  const handleClose = (event?: {}, reason?: string) => {
    // Verhindere Schließen bei Backdrop-Klick, wenn gespeichert wird
    if (saving) {
      return;
    }
    
    // Entferne Fokus von allen fokussierbaren Elementen im Dialog
    // Dies verhindert, dass ein fokussiertes Element im Dialog bleibt, wenn der Dialog geschlossen wird
    const dialogElement = document.querySelector('.MuiDialog-root');
    if (dialogElement) {
      const focusedElement = dialogElement.querySelector(':focus') as HTMLElement;
      if (focusedElement && focusedElement.blur) {
        focusedElement.blur();
      }
    }
    
    // Entferne auch Fokus vom aktiven Element, falls es im Dialog ist
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      const isInDialog = activeElement.closest('.MuiDialog-root');
      if (isInDialog && activeElement.blur) {
        activeElement.blur();
      }
    }
    
    // Setze Fokus auf Body, um sicherzustellen, dass kein Element fokussiert ist
    if (document.body && typeof document.body.focus === 'function') {
      document.body.focus();
    } else {
      // Fallback: Blur des aktiven Elements
      if (activeElement && activeElement.blur) {
        activeElement.blur();
      }
    }
    
    setLinkedDiagnoses([]);
    setLinkedMedications([]);
    setLetterSections([]);
    setLetterContent('');
    setRecipient(null);
    setError(null);
    setActiveTab(0); // Zurück zum Editor-Tab
    
    // Verwende requestAnimationFrame für besseres Timing mit React's Rendering
    requestAnimationFrame(() => {
      // Zusätzliche Verzögerung, um sicherzustellen, dass Fokus-Management abgeschlossen ist
      setTimeout(() => {
        onClose();
      }, 0);
    });
  };

  const getStatusLabel = (status?: string): string => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'resolved': return 'Behoben';
      case 'provisional': return 'Verdachtsdiagnose';
      case 'ruled-out': return 'Ausgeschlossen';
      default: return 'Aktiv';
    }
  };

  const getSeverityLabel = (severity?: string): string => {
    switch (severity) {
      case 'mild': return 'Leicht';
      case 'moderate': return 'Mäßig';
      case 'severe': return 'Schwer';
      case 'critical': return 'Kritisch';
      default: return '';
    }
  };

  return (
    <>
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      fullScreen
      disableRestoreFocus={true}
      TransitionProps={{
        onExited: () => {
          // Zusätzliche Bereinigung nach vollständigem Schließen
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && activeElement !== document.body && activeElement.blur) {
            activeElement.blur();
          }
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography component="span" variant="h6">
          {documentType === 'arztbrief' ? 'Arztbrief' : 'Patientenbrief'} erstellen
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
        {/* Hauptbereich (Editor) */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
          {/* Briefkopf */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              {location?.logo?.filename ? (
                <img 
                  src={`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/uploads/location-logos/${location.logo.filename}`} 
                  alt={location.name}
                  style={{ maxHeight: '80px', maxWidth: '200px' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Typography variant="h6">{location?.name || ''}</Typography>
              )}
            </Box>
            <Typography variant="body2">
              {new Date().toLocaleDateString('de-DE')}
            </Typography>
          </Box>

          {/* Arztauswahl */}
          {loadingDoctors ? (
            <CircularProgress size={24} />
          ) : availableDoctors.length > 1 ? (
            <FormControl fullWidth>
              <InputLabel>Arzt auswählen</InputLabel>
              <Select
                value={selectedDoctor?._id || ''}
                onChange={(e) => {
                  const doctor = availableDoctors.find(d => d._id === e.target.value);
                  setSelectedDoctor(doctor || null);
                }}
              >
                {availableDoctors.map(doctor => (
                  <MenuItem key={doctor._id} value={doctor._id}>
                    {doctor.title || ''} {doctor.firstName} {doctor.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : availableDoctors.length === 1 ? (
            <Typography variant="body1">
              {availableDoctors[0].title || ''} {availableDoctors[0].firstName} {availableDoctors[0].lastName}
            </Typography>
          ) : null}

          {/* Empfänger-Auswahl */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Empfänger (optional)
            </Typography>
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Empfänger-Typ</InputLabel>
                <Select
                  value={recipient?.type || 'patient'}
                  onChange={(e) => {
                    const type = e.target.value as 'patient' | 'doctor' | 'organization' | 'contact' | null;
                    if (type === 'patient') {
                      setRecipient({
                        type: 'patient',
                        name: patient ? `${patient.firstName} ${patient.lastName}` : undefined,
                        address: patient?.address ? {
                          street: patient.address.street || '',
                          postalCode: patient.address.postalCode || '',
                          city: patient.address.city || '',
                          country: patient.address.country || 'Österreich'
                        } : undefined
                      });
                    } else {
                      setRecipient({ type: type || null });
                    }
                  }}
                >
                  <MenuItem value="patient">Patient</MenuItem>
                  <MenuItem value="doctor">Arzt</MenuItem>
                  <MenuItem value="organization">Organisation</MenuItem>
                  <MenuItem value="contact">Kontakt aus Adressbuch</MenuItem>
                </Select>
              </FormControl>
              
              {recipient?.type === 'contact' && (
                <>
                  <Autocomplete
                    options={availableContacts}
                    loading={loadingContacts}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      return `${option.firstName || ''} ${option.lastName || ''}${option.organization ? ` - ${option.organization}` : ''}`.trim();
                    }}
                    filterOptions={(options, params) => {
                      if (!params.inputValue || params.inputValue.trim() === '') {
                        return options.slice(0, 50); // Zeige erste 50 wenn keine Suche
                      }
                      const searchTerm = params.inputValue.toLowerCase().trim();
                      const filtered = options.filter((option) => {
                        const fullName = `${option.firstName || ''} ${option.lastName || ''}`.toLowerCase();
                        const org = (option.organization || '').toLowerCase();
                        const email = (option.email || '').toLowerCase();
                        const phone = (option.phone || option.mobile || '').toLowerCase();
                        const title = (option.title || '').toLowerCase();
                        return fullName.includes(searchTerm) || 
                               org.includes(searchTerm) || 
                               email.includes(searchTerm) || 
                               phone.includes(searchTerm) ||
                               title.includes(searchTerm);
                      });
                      return filtered;
                    }}
                    isOptionEqualToValue={(option, value) => {
                      return (option._id || option.id) === (value._id || value.id);
                    }}
                    freeSolo={false}
                    clearOnBlur={false}
                    openOnFocus={true}
                    value={availableContacts.find(c => (c._id || c.id) === recipient.contactId) || null}
                    onChange={(_, newValue) => {
                      if (newValue) {
                        setRecipient({
                          type: 'contact',
                          contactId: newValue._id || newValue.id,
                          name: `${newValue.firstName || ''} ${newValue.lastName || ''}`.trim(),
                          title: newValue.title || '',
                          salutation: recipient?.salutation || '', // Behalte Anrede wenn vorhanden
                          organization: newValue.organization || '',
                          address: newValue.address ? {
                            street: newValue.address.street || '',
                            postalCode: newValue.address.postalCode || '',
                            city: newValue.address.city || '',
                            country: newValue.address.country || 'Österreich'
                          } : undefined,
                          phone: newValue.phone || newValue.mobile || '',
                          email: newValue.email || ''
                        });
                      } else {
                        setRecipient({ type: 'contact' });
                      }
                    }}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Kontakt aus Adressbuch suchen" 
                        placeholder="Name, Organisation, E-Mail oder Telefon eingeben..." 
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingContacts ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option._id || option.id}>
                        <Box sx={{ width: '100%', py: 0.5 }}>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {option.title ? `${option.title} ` : ''}{option.firstName || ''} {option.lastName || ''}
                          </Typography>
                          {option.organization && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {option.organization}
                            </Typography>
                          )}
                          {option.address && (option.address.street || option.address.city) && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {option.address.street || ''}{option.address.street && option.address.city ? ', ' : ''}
                              {option.address.postalCode || ''} {option.address.city || ''}
                            </Typography>
                          )}
                          {(option.email || option.phone || option.mobile) && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {option.email || ''}{option.email && (option.phone || option.mobile) ? ' • ' : ''}
                              {option.phone || option.mobile || ''}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                    noOptionsText={loadingContacts ? "Lade Kontakte..." : "Keine Kontakte gefunden. Versuchen Sie eine andere Suche."}
                    loadingText="Lade Kontakte..."
                  />
                  {recipient.contactId && (
                    <>
                      <TextField
                        fullWidth
                        label="Anrede (optional)"
                        value={recipient.salutation || ''}
                        onChange={(e) => setRecipient({ ...recipient, salutation: e.target.value })}
                        placeholder="z.B. Sehr geehrte/r, Liebe/r"
                        helperText="Anrede, die vor dem Namen im Brief verwendet wird"
                        sx={{ mt: 2 }}
                      />
                      {recipient.address && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Übernommene Adresse:
                          </Typography>
                          <Typography variant="body2">
                            {recipient.title ? `${recipient.title} ` : ''}{recipient.name}
                          </Typography>
                          {recipient.organization && (
                            <Typography variant="body2">{recipient.organization}</Typography>
                          )}
                          {recipient.address.street && (
                            <Typography variant="body2">{recipient.address.street}</Typography>
                          )}
                          {(recipient.address.postalCode || recipient.address.city) && (
                            <Typography variant="body2">
                              {recipient.address.postalCode || ''} {recipient.address.city || ''}
                            </Typography>
                          )}
                          {recipient.address.country && (
                            <Typography variant="body2">{recipient.address.country}</Typography>
                          )}
                        </Box>
                      )}
                    </>
                  )}
                </>
              )}
              
              {recipient?.type === 'doctor' && (
                <>
                  <TextField
                    fullWidth
                    label="Anrede (optional)"
                    value={recipient.salutation || ''}
                    onChange={(e) => setRecipient({ ...recipient, salutation: e.target.value })}
                    placeholder="z.B. Sehr geehrte/r, Liebe/r"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Arzt-Name"
                    value={recipient.name || ''}
                    onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
                  />
                  <TextField
                    fullWidth
                    label="Titel"
                    value={recipient.title || ''}
                    onChange={(e) => setRecipient({ ...recipient, title: e.target.value })}
                    placeholder="z.B. Dr., Prof. Dr."
                    sx={{ mt: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Straße"
                    value={recipient.address?.street || ''}
                    onChange={(e) => setRecipient({ 
                      ...recipient, 
                      address: { ...recipient.address, street: e.target.value } 
                    })}
                    sx={{ mt: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <TextField
                      fullWidth
                      label="PLZ"
                      value={recipient.address?.postalCode || ''}
                      onChange={(e) => setRecipient({ 
                        ...recipient, 
                        address: { ...recipient.address, postalCode: e.target.value } 
                      })}
                    />
                    <TextField
                      fullWidth
                      label="Stadt"
                      value={recipient.address?.city || ''}
                      onChange={(e) => setRecipient({ 
                        ...recipient, 
                        address: { ...recipient.address, city: e.target.value } 
                      })}
                    />
                  </Box>
                </>
              )}
              
              {recipient?.type === 'organization' && (
                <>
                  <TextField
                    fullWidth
                    label="Anrede (optional)"
                    value={recipient.salutation || ''}
                    onChange={(e) => setRecipient({ ...recipient, salutation: e.target.value })}
                    placeholder="z.B. Sehr geehrte Damen und Herren"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Organisation"
                    value={recipient.organization || ''}
                    onChange={(e) => setRecipient({ ...recipient, organization: e.target.value })}
                  />
                  <TextField
                    fullWidth
                    label="Ansprechpartner"
                    value={recipient.name || ''}
                    onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
                    sx={{ mt: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Titel"
                    value={recipient.title || ''}
                    onChange={(e) => setRecipient({ ...recipient, title: e.target.value })}
                    placeholder="z.B. Dr., Prof. Dr."
                    sx={{ mt: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Straße"
                    value={recipient.address?.street || ''}
                    onChange={(e) => setRecipient({ 
                      ...recipient, 
                      address: { ...recipient.address, street: e.target.value } 
                    })}
                    sx={{ mt: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <TextField
                      fullWidth
                      label="PLZ"
                      value={recipient.address?.postalCode || ''}
                      onChange={(e) => setRecipient({ 
                        ...recipient, 
                        address: { ...recipient.address, postalCode: e.target.value } 
                      })}
                    />
                    <TextField
                      fullWidth
                      label="Stadt"
                      value={recipient.address?.city || ''}
                      onChange={(e) => setRecipient({ 
                        ...recipient, 
                        address: { ...recipient.address, city: e.target.value } 
                      })}
                    />
                  </Box>
                </>
              )}
            </Stack>
          </Box>

          {/* Standortdaten */}
          {location && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                {location.name}
              </Typography>
              <Typography variant="body2">
                {location.address_line1}
                {location.address_line2 && `, ${location.address_line2}`}
              </Typography>
              <Typography variant="body2">
                {location.postal_code} {location.city}
              </Typography>
              {(selectedDoctor?.phone || location.owner?.phone || location.phone) && (
                <Typography variant="body2">
                  Tel: {selectedDoctor?.phone || location.owner?.phone || location.phone}
                </Typography>
              )}
              {(selectedDoctor?.email || location.owner?.email || location.email) && (
                <Typography variant="body2">
                  Email: {selectedDoctor?.email || location.owner?.email || location.email}
                </Typography>
              )}
              {(selectedDoctor?.website || location.owner?.website) && (
                <Typography variant="body2">
                  Web: {selectedDoctor?.website || location.owner?.website}
                </Typography>
              )}
            </Box>
          )}

          {/* Tabs für Editor und Vorschau */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="Editor" />
              <Tab label="Vorschau" />
            </Tabs>
          </Box>

          {activeTab === 0 && (
            <Stack spacing={3}>
              {/* Button "Vorlage hinzufügen" oben */}
              <Box>
                <Button 
                  startIcon={<Add />} 
                  onClick={handleAddTemplate}
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  Vorlage hinzufügen
                </Button>
              </Box>

              {/* Button "Zusätzliche Daten übernehmen" */}
              <Box>
                <Button 
                  startIcon={<Add />} 
                  onClick={() => setAdditionalDataDialogOpen(true)}
                  variant="outlined"
                  color="primary"
                  fullWidth
                  disabled={loadingAdditionalData}
                >
                  {loadingAdditionalData ? 'Lade Daten...' : 'Zusätzliche Daten übernehmen'}
                </Button>
              </Box>

              {/* Alle Sektionen in einer Liste (Dekurs, manuell, Vorlagen) */}
              {letterSections.length > 0 && (
                <Box>
                  {letterSections.map((section, index) => {
                    return (
                      <Box key={section.id} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: section.source === 'dekurs' ? '#fafafa' : 'white' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 1 }}>
                          <TextField
                            value={section.title}
                            onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                            variant="standard"
                            fullWidth
                            sx={{ 
                              mr: 1,
                              '& .MuiInputBase-input': {
                                fontSize: '1.1rem',
                                fontWeight: 'bold'
                              }
                            }}
                            placeholder="Überschrift eingeben..."
                          />
                          <Stack direction="row" spacing={0.5}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleMoveSectionUp(section.id)} 
                              disabled={index === 0}
                              color="primary"
                              title="Nach oben verschieben"
                            >
                              <KeyboardArrowUp />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => handleMoveSectionDown(section.id)} 
                              disabled={index === letterSections.length - 1}
                              color="primary"
                              title="Nach unten verschieben"
                            >
                              <KeyboardArrowDown />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => handleRemoveSection(section.id)} 
                              color="error"
                              title="Sektion löschen"
                            >
                              <Delete />
                            </IconButton>
                          </Stack>
                        </Box>
                        <RichTextEditor
                          value={section.content}
                          onChange={(html) => updateSectionContent(section.id, html)}
                          placeholder={`Inhalt für ${section.title || 'Sektion'} eingeben...`}
                          minHeight={150}
                        />
                      </Box>
                    );
                  })}
                </Box>
              )}

          {/* Diagnosen */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Diagnosen
            </Typography>
            <ICD10Autocomplete
              onSelect={(code: string, display: string, fullCode: any) => handleAddDiagnosis(fullCode)}
            />
            {linkedDiagnoses.length > 0 && (
              <Stack spacing={1} sx={{ mt: 2 }}>
                {linkedDiagnoses.map((diag, index) => {
                  // Eindeutiger Key: diagnosisId oder Kombination aus icd10Code und index
                  const uniqueKey = diag.diagnosisId || `${diag.icd10Code || 'diag'}-${index}`;
                  return (
                  <Paper key={uniqueKey} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight="bold">
                          {diag.icd10Code} - {diag.display}
                        </Typography>
                        {diag.isPrimary && (
                          <Chip label="Hauptdiagnose" size="small" color="primary" />
                        )}
                        {diag.status && (
                          <Chip 
                            label={getStatusLabel(diag.status)} 
                            size="small" 
                            variant="outlined" 
                          />
                        )}
                        {diag.severity && (
                          <Chip 
                            label={getSeverityLabel(diag.severity)} 
                            size="small" 
                            variant="outlined" 
                          />
                        )}
                        {diag.side && (
                          <Chip 
                            label={diag.side === 'left' ? 'Links' : diag.side === 'right' ? 'Rechts' : 'Beidseitig'} 
                            size="small" 
                            color="secondary" 
                            variant="outlined" 
                          />
                        )}
                      </Box>
                      {diag.notes && (
                        <Typography variant="caption" color="text.secondary">
                          Notizen: {diag.notes}
                        </Typography>
                      )}
                    </Box>
                    <IconButton size="small" onClick={() => handleRemoveDiagnosis(index)} color="error">
                      <Delete />
                    </IconButton>
                  </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>

          {/* Medikamente */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Medikamente
            </Typography>
            <MedicationAutocomplete
              value={null}
              onChange={(medication) => {
                if (medication) {
                  handleAddMedication(medication);
                }
              }}
            />
            {linkedMedications.length > 0 && (
              <Stack spacing={1} sx={{ mt: 2 }}>
                {linkedMedications.map((med, index) => (
                  <Paper key={index} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{med.name}</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {med.dosage && med.dosageUnit ? `${med.dosage} ${med.dosageUnit}` : med.dosage ? med.dosage : ''}
                          {med.frequency && ` • ${med.frequency}`}
                          {med.duration && ` • Dauer: ${med.duration}`}
                          {med.route && med.route !== 'oral' && ` • ${med.route === 'topical' ? 'topisch' : med.route === 'injection' ? 'Injektion' : med.route === 'inhalation' ? 'Inhalation' : med.route === 'rectal' ? 'rektal' : med.route === 'vaginal' ? 'vaginal' : 'sonstig'}`}
                        </Typography>
                        {med.instructions && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Einnahmehinweise: {med.instructions}
                          </Typography>
                        )}
                        {med.notes && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Notizen: {med.notes}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => handleEditMedication(index)} color="primary">
                        <Edit />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleRemoveMedication(index)} color="error">
                        <Delete />
                      </IconButton>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

              {/* Button "Neue Sektion hinzufügen" unten */}
              <Box>
                <Button 
                  startIcon={<Add />} 
                  onClick={handleAddSection}
                  variant="outlined"
                  fullWidth
                >
                  Neue Sektion hinzufügen
                </Button>
              </Box>
          
          {/* Zusätzliche Notizen */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Zusätzliche Notizen
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              value={letterContent}
              onChange={(e) => setLetterContent(e.target.value)}
              placeholder="Weitere Informationen..."
            />
          </Box>
            </Stack>
          )}

          {/* Vorschau Tab */}
          {activeTab === 1 && (
            <Box>
              <Paper sx={{ p: 3, bgcolor: 'white', minHeight: '500px' }}>
                <Box
                  dangerouslySetInnerHTML={{ __html: generatePrintHtml() }}
                  sx={{
                    '& img': { maxHeight: '80px' },
                    '& h2, & h3': { marginTop: 2, marginBottom: 1 },
                    '& p': { marginBottom: 1, whiteSpace: 'pre-wrap' },
                    '& ul': { paddingLeft: 3, marginBottom: 1 },
                    '& li': { marginBottom: 0.5 }
                  }}
                />
              </Paper>
            </Box>
          )}
          </Stack>
        </Box>

        {/* Resize-Handle */}
        <Box
          onMouseDown={handleMouseDown}
          sx={{
            width: '4px',
            bgcolor: isResizing ? 'primary.main' : 'divider',
            cursor: 'col-resize',
            '&:hover': {
              bgcolor: 'primary.main'
            },
            transition: 'background-color 0.2s'
          }}
        />

        {/* Sidebar */}
        <Box
          sx={{
            width: `${sidebarWidth}px`,
            borderLeft: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontSize="1rem">
              Dokumente & Befunde
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {patient?._id && (
              <DocumentSidebar
                patientId={patient._id}
                onAddToDocument={handleAddFromSidebar}
                onViewDetails={handleViewDetails}
              />
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handlePrint} startIcon={<Print />} disabled={saving}>
          Drucken
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={handleClose} disabled={saving}>
          Abbrechen
        </Button>
        <Button 
          onClick={() => handleSave(false)} 
          startIcon={<Save />}
          disabled={saving}
        >
          {saving ? <CircularProgress size={20} /> : 'Als Entwurf speichern'}
        </Button>
        <Button 
          onClick={() => handleSave(true)} 
          variant="contained"
          startIcon={<Save />}
          disabled={saving}
        >
          {saving ? <CircularProgress size={20} /> : 'Finalisieren'}
        </Button>
      </DialogActions>
    </Dialog>

      {/* Medikamenten-Dialog */}
      <Dialog
        open={medicationDialogOpen}
        onClose={handleCloseMedicationDialog}
        maxWidth="md"
        fullWidth
        disableRestoreFocus={true}
        TransitionProps={{
          onExited: () => {
            // Zusätzliche Bereinigung nach vollständigem Schließen
            const activeElement = document.activeElement as HTMLElement;
            if (activeElement && activeElement !== document.body && activeElement.blur) {
              activeElement.blur();
            }
          }
        }}
      >
        <DialogTitle>
          {editingMedicationIndex !== null ? 'Medikament bearbeiten' : 'Medikament hinzufügen'}
          {selectedMedication && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {selectedMedication.name || selectedMedication.Name || selectedMedication.medicationName}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Dosis"
                  value={medicationFormData.dosage}
                  onChange={(e) => setMedicationFormData(prev => ({ ...prev, dosage: e.target.value }))}
                  placeholder="z.B. 500"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Dosis-Einheit"
                  value={medicationFormData.dosageUnit}
                  onChange={(e) => setMedicationFormData(prev => ({ ...prev, dosageUnit: e.target.value }))}
                  placeholder="z.B. mg, ml, Stk."
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Häufigkeit"
                  value={medicationFormData.frequency}
                  onChange={(e) => setMedicationFormData(prev => ({ ...prev, frequency: e.target.value }))}
                  placeholder="z.B. 2x täglich, morgens und abends"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Applikationsweg</InputLabel>
                  <Select
                    value={medicationFormData.route}
                    onChange={(e) => setMedicationFormData(prev => ({ ...prev, route: e.target.value as any }))}
                    label="Applikationsweg"
                  >
                    <MenuItem value="oral">Oral</MenuItem>
                    <MenuItem value="topical">Topisch</MenuItem>
                    <MenuItem value="injection">Injektion</MenuItem>
                    <MenuItem value="inhalation">Inhalation</MenuItem>
                    <MenuItem value="rectal">Rektal</MenuItem>
                    <MenuItem value="vaginal">Vaginal</MenuItem>
                    <MenuItem value="other">Sonstig</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Dauer"
                  value={medicationFormData.duration}
                  onChange={(e) => setMedicationFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="z.B. 7 Tage, 2 Wochen"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Änderungstyp</InputLabel>
                  <Select
                    value={medicationFormData.changeType}
                    onChange={(e) => setMedicationFormData(prev => ({ ...prev, changeType: e.target.value as any }))}
                    label="Änderungstyp"
                  >
                    <MenuItem value="added">Hinzugefügt</MenuItem>
                    <MenuItem value="modified">Geändert</MenuItem>
                    <MenuItem value="discontinued">Abgesetzt</MenuItem>
                    <MenuItem value="unchanged">Unverändert</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Startdatum"
                  type="date"
                  value={medicationFormData.startDate}
                  onChange={(e) => setMedicationFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Enddatum"
                  type="date"
                  value={medicationFormData.endDate}
                  onChange={(e) => setMedicationFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Menge"
                  type="number"
                  value={medicationFormData.quantity}
                  onChange={(e) => setMedicationFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="z.B. 20"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Mengen-Einheit"
                  value={medicationFormData.quantityUnit}
                  onChange={(e) => setMedicationFormData(prev => ({ ...prev, quantityUnit: e.target.value }))}
                  placeholder="z.B. Stk., Packungen"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Einnahmehinweise"
                  multiline
                  rows={3}
                  value={medicationFormData.instructions}
                  onChange={(e) => setMedicationFormData(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="z.B. zu den Mahlzeiten, mit viel Wasser"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Notizen"
                  multiline
                  rows={3}
                  value={medicationFormData.notes}
                  onChange={(e) => setMedicationFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Zusätzliche Informationen..."
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMedicationDialog}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSaveMedication}
            variant="contained"
          >
            {editingMedicationIndex !== null ? 'Speichern' : 'Hinzufügen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Vorlagenauswahl-Dialog */}
      <Dialog 
        open={templateDialogOpen} 
        onClose={() => {
          const dialogElement = document.querySelector('.MuiDialog-root');
          if (dialogElement) {
            const focusedElement = dialogElement.querySelector(':focus') as HTMLElement;
            if (focusedElement && focusedElement.blur) {
              focusedElement.blur();
            }
          }
          
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && activeElement !== document.body) {
            const isInDialog = activeElement.closest('.MuiDialog-root');
            if (isInDialog && activeElement.blur) {
              activeElement.blur();
            }
          }
          
          if (document.body && typeof document.body.focus === 'function') {
            document.body.focus();
          } else if (activeElement && activeElement.blur) {
            activeElement.blur();
          }
          
          // Reset search value when closing
          setTemplateSearchValue('');
          
          requestAnimationFrame(() => {
            setTimeout(() => {
              setTemplateDialogOpen(false);
            }, 0);
          });
        }} 
        maxWidth="sm" 
        fullWidth
        disableEnforceFocus={false}
        disableAutoFocus={false}
      >
        <DialogTitle>Vorlage auswählen</DialogTitle>
        <DialogContent>
          <Autocomplete
            key={`template-autocomplete-${templateDialogKey}`}
            options={availableTemplates}
            getOptionLabel={(option) => option.name || ''}
            isOptionEqualToValue={(option, value) => {
              return option._id === value._id || option.id === value.id;
            }}
            filterOptions={(options, { inputValue }) => {
              if (!inputValue) return options;
              const searchLower = inputValue.toLowerCase();
              return options.filter(option => 
                option.name?.toLowerCase().includes(searchLower) ||
                option.description?.toLowerCase().includes(searchLower) ||
                option.content?.toLowerCase().includes(searchLower) ||
                (option.type === 'anrede' && 'anrede'.includes(searchLower)) ||
                (option.type === 'greeting' && 'begrüßung'.includes(searchLower)) ||
                (option.type === 'closing' && 'abschluss'.includes(searchLower))
              );
            }}
            value={null}
            onChange={(event, newValue) => {
              if (newValue) {
                handleSelectTemplate(newValue);
              }
            }}
            inputValue={templateSearchValue}
            onInputChange={(event, newInputValue) => {
              setTemplateSearchValue(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Vorlage suchen"
                placeholder="Name, Beschreibung oder Inhalt eingeben..."
                fullWidth
                sx={{ mb: 2 }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option._id || option.id}>
                <Box sx={{ width: '100%' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {option.name}
                  </Typography>
                  {option.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {option.description}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    {option.content.substring(0, 100)}...
                  </Typography>
                  <Chip
                    label={option.type === 'anrede' ? 'Anrede' :
                           option.type === 'greeting' ? 'Begrüßung' :
                           option.type === 'closing' ? 'Abschluss' : 'Benutzerdefiniert'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>
            )}
            noOptionsText="Keine Vorlagen gefunden"
            openOnFocus
            clearOnBlur={false}
          />
          {availableTemplates.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Keine Vorlagen verfügbar. Erstellen Sie Vorlagen in der Standortverwaltung.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTemplateSearchValue('');
            setTemplateDialogOpen(false);
          }}>Abbrechen</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog für zusätzliche Daten */}
      <Dialog 
        open={additionalDataDialogOpen} 
        onClose={() => setAdditionalDataDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Zusätzliche Daten übernehmen</DialogTitle>
        <DialogContent>
          <Tabs value={additionalDataTab} onChange={(e, newValue) => setAdditionalDataTab(newValue)} sx={{ mb: 2 }}>
            <Tab label="Vitalwerte" />
            <Tab label="Termine" />
            <Tab label="Fotos" />
          </Tabs>

          <Box sx={{ mt: 2 }}>
            {/* Vitalwerte Tab */}
            {additionalDataTab === 0 && (vitalSigns.length > 0 ? (
              <List>
                {vitalSigns.slice(0, 10).map((vital) => (
                  <ListItemButton 
                    key={vital._id || vital.id} 
                    onClick={() => handleAddVitalSigns(vital)}
                  >
                    <ListItemText
                      primary={`Vitalwerte vom ${vital.recordedAt ? new Date(vital.recordedAt).toLocaleDateString('de-DE') : 'Unbekannt'}`}
                      secondary={
                        <>
                          {vital.bloodPressure && `RR: ${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic} mmHg`}
                          {vital.pulse && ` | Puls: ${vital.pulse} bpm`}
                          {vital.temperature?.value && ` | Temp: ${vital.temperature.value} ${vital.temperature.unit === 'fahrenheit' ? '°F' : '°C'}`}
                        </>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Alert severity="info">Keine Vitalwerte verfügbar.</Alert>
            ))}

            {/* Termine Tab */}
            {additionalDataTab === 1 && (appointments.length > 0 ? (
              <List>
                {appointments.slice(0, 10).map((appointment) => (
                  <ListItemButton 
                    key={appointment._id || appointment.id} 
                    onClick={() => handleAddAppointment(appointment)}
                  >
                    <ListItemText
                      primary={appointment.title || (appointment.service?.name ? stripHtmlTags(appointment.service.name) : 'Termin')}
                      secondary={`${appointment.startTime ? new Date(appointment.startTime).toLocaleString('de-DE') : 'Unbekanntes Datum'} - ${appointment.doctor ? (typeof appointment.doctor === 'string' ? appointment.doctor : `${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim()) : ''}`}
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Alert severity="info">Keine Termine verfügbar.</Alert>
            ))}

            {/* Fotos Tab */}
            {additionalDataTab === 2 && (photos.length > 0 ? (
              <List>
                {photos.slice(0, 10).map((photo) => (
                  <ListItemButton 
                    key={photo._id || photo.id} 
                    onClick={() => handleAddPhoto(photo)}
                  >
                    <ListItemText
                      primary="Foto"
                      secondary={`${photo.takenAt || photo.uploadedAt || photo.createdAt ? new Date(photo.takenAt || photo.uploadedAt || photo.createdAt).toLocaleDateString('de-DE') : 'Unbekanntes Datum'}${photo.description ? ` - ${photo.description}` : ''}`}
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Alert severity="info">Keine Fotos verfügbar.</Alert>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdditionalDataDialogOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Detailansicht-Dialog */}
      {detailDialogData && (
        <DocumentDetailDialog
          open={detailDialogOpen}
          onClose={() => {
            setDetailDialogOpen(false);
            setDetailDialogData(null);
          }}
          type={detailDialogData.type}
          data={detailDialogData.data}
        />
      )}
    </>
  );
};

export default PatientenbriefDialog;

