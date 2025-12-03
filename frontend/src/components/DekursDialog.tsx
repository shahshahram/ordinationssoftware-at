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
  Tabs,
  Tab,
  Stack,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  Tooltip,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Close,
  Save,
  Assignment,
  PhotoCamera,
  Delete,
  Add,
  Description,
  LocalHospital,
  Medication,
  Psychology,
  CheckCircle,
  Cancel,
  ZoomIn,
  Print,
  Edit,
  Star,
  StarBorder,
  MonitorHeart
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createDekursEntry,
  updateDekursEntry,
  finalizeDekursEntry,
  uploadDekursPhoto,
  deleteDekursPhoto,
  fetchDekursVorlagen,
  fetchDekursEntry,
  DekursEntry,
  DekursVorlage
} from '../store/slices/dekursSlice';
import { fetchPatientDiagnoses } from '../store/slices/diagnosisSlice';
import ICD10Autocomplete from './ICD10Autocomplete';
import MedicationAutocomplete from './MedicationAutocomplete';
import DekursVorlagenAutocomplete from './DekursVorlagenAutocomplete';
import DicomRadiologieSelector from './DicomRadiologieSelector';
import LaborWerteSelector from './LaborWerteSelector';
import VitalSignsSelector from './VitalSignsSelector';
import { useDekursVorlagen } from '../hooks/useDekursVorlagen';
import { VitalSigns } from '../store/slices/vitalSignsSlice';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dekurs-tabpanel-${index}`}
      aria-labelledby={`dekurs-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

interface DekursDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  encounterId?: string;
  initialEntry?: DekursEntry | null;
  onSave?: (entry: DekursEntry) => void;
}

const DekursDialog: React.FC<DekursDialogProps> = ({
  open,
  onClose,
  patientId,
  encounterId,
  initialEntry,
  onSave
}) => {
  const dispatch = useAppDispatch();
  const { vorlagen, loading } = useAppSelector((state) => state.dekurs);
  const { diagnoses } = useAppSelector((state) => state.diagnoses);
  const { patients } = useAppSelector((state) => state.patients);

  const [activeTab, setActiveTab] = useState(0);
  const [selectedVorlage, setSelectedVorlage] = useState<DekursVorlage | null>(null);
  const [formData, setFormData] = useState<Partial<DekursEntry>>({
    patientId,
    encounterId,
    visitReason: '',
    visitType: 'appointment',
    clinicalObservations: '',
    progressChecks: '',
    findings: '',
    medicationChanges: '',
    treatmentDetails: '',
    psychosocialFactors: '',
    notes: '',
    imagingFindings: '',
    laboratoryFindings: '',
    linkedDiagnoses: [],
    linkedMedications: [],
    linkedDocuments: [],
    linkedDicomStudies: [],
    linkedRadiologyReports: [],
    linkedLaborResults: []
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoInputRef, setPhotoInputRef] = useState<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Lokaler State für den aktuellen Eintrag (wird nach dem Speichern aktualisiert)
  const [currentEntry, setCurrentEntry] = useState<DekursEntry | null | undefined>(initialEntry);
  // Temporäre Fotos (werden lokal gespeichert, bis der Eintrag gespeichert wird)
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [pendingPhotoPreviews, setPendingPhotoPreviews] = useState<string[]>([]);
  // Bild-Vorschau in Originalgröße
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>('');
  const [vorlagenDialogOpen, setVorlagenDialogOpen] = useState(false);
  const [medicationDialogOpen, setMedicationDialogOpen] = useState(false);
  const [editingMedicationIndex, setEditingMedicationIndex] = useState<number | null>(null);
  const [selectedMedication, setSelectedMedication] = useState<any>(null);
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
  const [dicomSelectorOpen, setDicomSelectorOpen] = useState(false);
  const [laborSelectorOpen, setLaborSelectorOpen] = useState(false);
  const [diagnosisEditDialogOpen, setDiagnosisEditDialogOpen] = useState(false);
  const [editingDiagnosisIndex, setEditingDiagnosisIndex] = useState<number | null>(null);
  const [diagnosisFormData, setDiagnosisFormData] = useState<{
    side: 'left' | 'right' | 'bilateral' | '';
    isPrimary: boolean;
    notes: string;
    status: 'active' | 'resolved' | 'provisional' | 'ruled-out';
    severity: 'mild' | 'moderate' | 'severe' | 'critical' | '';
    onsetDate: string;
    resolvedDate: string;
  }>({
    side: '',
    isPrimary: false,
    notes: '',
    status: 'active',
    severity: '',
    onsetDate: '',
    resolvedDate: ''
  });
  const { insertTemplate, getTemplate } = useDekursVorlagen();
  const { locations } = useAppSelector((state) => state.locations);
  const currentLocation = locations.find((loc: any) => loc.isActive);

  // Lade Vorlagen beim Öffnen
  useEffect(() => {
    if (open) {
      dispatch(fetchDekursVorlagen({}));
      if (patientId) {
        dispatch(fetchPatientDiagnoses({ patientId }));
      }
    }
  }, [open, patientId, dispatch]);

  // Aktualisiere currentEntry wenn initialEntry sich ändert (auch wenn Dialog bereits geöffnet ist)
  useEffect(() => {
    setCurrentEntry(initialEntry || null);
  }, [initialEntry]);

  // Initialisiere Formular nur beim Öffnen des Dialogs
  useEffect(() => {
    if (open) {
      if (!currentEntry) {
        // Setze Formular zurück, wenn Dialog geöffnet wird und kein currentEntry vorhanden ist
        setFormData({
          patientId,
          encounterId,
          visitReason: '',
          visitType: 'appointment',
          clinicalObservations: '',
          progressChecks: '',
          findings: '',
          medicationChanges: '',
          treatmentDetails: '',
          psychosocialFactors: '',
          notes: '',
          imagingFindings: '',
          laboratoryFindings: '',
          linkedDiagnoses: [],
          linkedMedications: [],
          linkedDocuments: [],
          linkedDicomStudies: [],
          linkedRadiologyReports: [],
          linkedLaborResults: []
        });
        setSelectedVorlage(null);
        // Lösche temporäre Fotos beim Öffnen eines neuen Dialogs
        setPendingPhotos([]);
        setPendingPhotoPreviews([]);
      } else {
        // Wenn currentEntry vorhanden ist, lade die Daten
        // Bereinige linkedMedications: Stelle sicher, dass medicationId eine String-ID ist und alle Felder erhalten bleiben
        const cleanedLinkedMedications = (currentEntry.linkedMedications || []).map((med: any) => {
          let medicationId: string | undefined = undefined;
          if (med.medicationId) {
            // Wenn medicationId ein Objekt ist, extrahiere die _id
            if (typeof med.medicationId === 'object' && med.medicationId._id) {
              medicationId = typeof med.medicationId._id === 'string' 
                ? med.medicationId._id 
                : med.medicationId._id.toString();
            } else if (typeof med.medicationId === 'string') {
              medicationId = med.medicationId;
            } else {
              medicationId = med.medicationId.toString();
            }
          }
          // Stelle sicher, dass alle Felder explizit übernommen werden
          return {
            medicationId: medicationId,
            name: med.name || '',
            dosage: med.dosage,
            dosageUnit: med.dosageUnit,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions,
            startDate: med.startDate,
            endDate: med.endDate,
            quantity: med.quantity,
            quantityUnit: med.quantityUnit,
            route: med.route,
            changeType: med.changeType || 'added',
            notes: med.notes
          };
        });
        
        setFormData({
          ...currentEntry,
          patientId,
          encounterId: currentEntry.encounterId || encounterId,
          linkedMedications: cleanedLinkedMedications
        });
      }
    }
  }, [open, currentEntry, patientId, encounterId]);

  const handleFieldChange = (field: keyof DekursEntry, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVitalSignsSelect = (vitalSigns: VitalSigns) => {
    // Formatiere Vitalwerte als Text
    const vitalTextParts: string[] = [];
    
    if (vitalSigns.bloodPressure?.systolic && vitalSigns.bloodPressure?.diastolic) {
      vitalTextParts.push(`Blutdruck: ${vitalSigns.bloodPressure.systolic}/${vitalSigns.bloodPressure.diastolic} mmHg`);
    }
    if (vitalSigns.pulse) {
      vitalTextParts.push(`Puls: ${vitalSigns.pulse} bpm`);
    }
    if (vitalSigns.respiratoryRate) {
      vitalTextParts.push(`Atemfrequenz: ${vitalSigns.respiratoryRate} /min`);
    }
    if (vitalSigns.temperature?.value) {
      const unit = vitalSigns.temperature.unit === 'celsius' ? '°C' : '°F';
      vitalTextParts.push(`Temperatur: ${vitalSigns.temperature.value} ${unit}`);
    }
    if (vitalSigns.oxygenSaturation) {
      vitalTextParts.push(`SpO2: ${vitalSigns.oxygenSaturation}%`);
    }
    if (vitalSigns.bloodGlucose?.value) {
      vitalTextParts.push(`Blutzucker: ${vitalSigns.bloodGlucose.value} ${vitalSigns.bloodGlucose.unit}`);
    }
    if (vitalSigns.weight?.value) {
      vitalTextParts.push(`Gewicht: ${vitalSigns.weight.value} ${vitalSigns.weight.unit}`);
    }
    if (vitalSigns.height?.value) {
      vitalTextParts.push(`Größe: ${vitalSigns.height.value} ${vitalSigns.height.unit}`);
    }
    if (vitalSigns.bmi) {
      vitalTextParts.push(`BMI: ${vitalSigns.bmi}`);
    }
    if (vitalSigns.painScale?.value !== undefined && vitalSigns.painScale?.value !== null && vitalSigns.painScale?.value !== '') {
      vitalTextParts.push(`Schmerz (${vitalSigns.painScale.type}): ${vitalSigns.painScale.value}`);
    }

    const vitalText = vitalTextParts.length > 0 
      ? `Vitalwerte (${vitalSigns.recordedAt ? format(new Date(vitalSigns.recordedAt), 'dd.MM.yyyy HH:mm', { locale: de }) : 'unbekannt'}):\n${vitalTextParts.join(', ')}`
      : '';

    // Füge Vitalwerte zu den klinischen Beobachtungen hinzu
    const currentObservations = formData.clinicalObservations || '';
    const newObservations = currentObservations 
      ? `${currentObservations}\n\n${vitalText}`
      : vitalText;
    
    handleFieldChange('clinicalObservations', newObservations);
  };

  const handleVorlageSelect = async (vorlage: any) => {
    console.log('🔍 DekursDialog: Vorlage ausgewählt:', vorlage);
    
    // Lade vollständige Vorlage per ID, da die Search-Route nur minimale Daten zurückgibt
    let fullVorlage = vorlage;
    
    // Wenn template fehlt, lade vollständige Vorlage
    if (!vorlage.template) {
      console.log('🔍 DekursDialog: Template fehlt, lade vollständige Vorlage...');
      const loadedVorlage = await getTemplate(vorlage._id);
      if (loadedVorlage) {
        fullVorlage = loadedVorlage;
        console.log('🔍 DekursDialog: Vollständige Vorlage geladen:', fullVorlage);
              } else {
        console.error('🔍 DekursDialog: Fehler beim Laden der vollständigen Vorlage');
        setError('Fehler beim Laden der Vorlage');
        return;
      }
    }
    
    const patient = patients.find(p => p._id === patientId);
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : '';
    const patientAge = patient?.dateOfBirth ? 
      Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined;
    
    console.log('🔍 DekursDialog: Patient-Info:', { patientName, patientAge });
    console.log('🔍 DekursDialog: Vorlage template:', fullVorlage.template);
    console.log('🔍 DekursDialog: Vorlage linkedMedications:', fullVorlage.linkedMedications);
    
    const templateData = insertTemplate(fullVorlage, patientName, patientAge);
    
    console.log('🔍 DekursDialog: Template-Daten nach insertTemplate:', templateData);
    console.log('🔍 DekursDialog: Template-Daten linkedMedications:', templateData.linkedMedications);
    
    setFormData((prev) => {
      // Prüfe, ob bereits eine Diagnose mit diesem ICD-10 Code existiert
      const existingDiagnosisCodes = new Set((prev.linkedDiagnoses || []).map((d: any) => d.icd10Code));
      
      // Füge ICD-10 Diagnose automatisch hinzu, wenn vorhanden und noch nicht in der Liste
      let newLinkedDiagnoses = [...(prev.linkedDiagnoses || [])];
      if (fullVorlage.icd10 && !existingDiagnosisCodes.has(fullVorlage.icd10)) {
        const newDiagnosis = {
          diagnosisId: fullVorlage.icd10, // Verwende ICD-10 Code als ID
          icd10Code: fullVorlage.icd10,
          display: fullVorlage.icd10Title || fullVorlage.title || fullVorlage.icd10,
          side: '' as 'left' | 'right' | 'bilateral' | '',
          isPrimary: false,
          notes: '',
          status: 'active' as const,
          severity: undefined,
          onsetDate: undefined,
          resolvedDate: undefined,
          catalogYear: new Date().getFullYear(),
          source: 'clinical' as const
        };
        newLinkedDiagnoses.push(newDiagnosis);
        console.log('🔍 DekursDialog: ICD-10 Diagnose automatisch hinzugefügt:', newDiagnosis);
      }
      
      // Medikamente aus Vorlage übernehmen (falls vorhanden)
      const existingMedicationNames = new Set((prev.linkedMedications || []).map((m: any) => m.name));
      let newLinkedMedications = [...(prev.linkedMedications || [])];
      
      console.log('🔍 DekursDialog: Vorhandene Medikamente:', Array.from(existingMedicationNames));
      console.log('🔍 DekursDialog: Medikamente aus templateData:', templateData.linkedMedications);
      
      if (templateData.linkedMedications && Array.isArray(templateData.linkedMedications) && templateData.linkedMedications.length > 0) {
        templateData.linkedMedications.forEach((med: any) => {
          // Nur hinzufügen, wenn nicht bereits vorhanden
          if (med.name && !existingMedicationNames.has(med.name)) {
            console.log('🔍 DekursDialog: Füge Medikament hinzu:', med.name);
            newLinkedMedications.push(med);
          } else {
            console.log('🔍 DekursDialog: Medikament bereits vorhanden oder ohne Name:', med.name);
          }
        });
      } else {
        console.log('🔍 DekursDialog: Keine Medikamente in templateData gefunden');
      }
      
      console.log('🔍 DekursDialog: Finale linkedMedications:', newLinkedMedications);
      
      // Entferne linkedMedications aus templateData, da wir sie separat verarbeiten
      const { linkedMedications: _, ...templateDataWithoutMedications } = templateData;
      
      const newFormData = {
        ...prev,
        ...templateDataWithoutMedications,
        templateId: fullVorlage._id,
        templateName: fullVorlage.title,
        linkedDiagnoses: newLinkedDiagnoses,
        linkedMedications: newLinkedMedications
      };
      console.log('🔍 DekursDialog: Neues FormData:', newFormData);
      console.log('🔍 DekursDialog: Medikamente aus Vorlage:', templateData.linkedMedications);
      console.log('🔍 DekursDialog: Neue linkedMedications:', newLinkedMedications);
      return newFormData;
    });
    setSelectedVorlage(fullVorlage);
  };

  const handleDicomSelect = (selectedStudies: any[]) => {
    const formattedText = selectedStudies.map(study => {
      const date = study.studyDate || study.uploadedAt;
      const dateStr = date ? new Date(date).toLocaleDateString('de-DE') : '';
      return `[${dateStr}] ${study.modality || study.studyDescription || 'DICOM-Studie'}: ${study.findings || ''}`;
    }).join('\n\n');
    
    setFormData((prev) => ({
      ...prev,
      imagingFindings: prev.imagingFindings ? `${prev.imagingFindings}\n\n${formattedText}` : formattedText,
      linkedDicomStudies: [...(prev.linkedDicomStudies || []), ...selectedStudies.map(s => s._id)]
    }));
  };

  const handleLaborSelect = (selectedResults: any[]) => {
    const formattedText = selectedResults.map(result => {
      const date = result.resultDate;
      const dateStr = date ? new Date(date).toLocaleDateString('de-DE') : '';
      const resultsText = result.results?.map((res: any) => 
        `- ${res.parameter}: ${res.value} ${res.unit || ''} (${res.reference || ''}) ${res.isCritical ? '[Auffällig]' : '[Normal]'}`
      ).join('\n') || '';
      return `[${dateStr}] - Laborwerte:\n${resultsText}`;
    }).join('\n\n');
    
    setFormData((prev) => ({
      ...prev,
      laboratoryFindings: prev.laboratoryFindings ? `${prev.laboratoryFindings}\n\n${formattedText}` : formattedText,
      linkedLaborResults: [...(prev.linkedLaborResults || []), ...selectedResults.map(r => r._id)]
    }));
  };

  const handleAddDiagnosis = (diagnosis: any) => {
    const newDiagnosis = {
      diagnosisId: diagnosis._id || diagnosis.id || diagnosis.code,
      icd10Code: diagnosis.code || diagnosis.icd10Code,
      display: diagnosis.display || diagnosis.name || diagnosis.text || '',
      side: '' as 'left' | 'right' | 'bilateral' | ''
    };
    setFormData((prev) => ({
      ...prev,
      linkedDiagnoses: [...(prev.linkedDiagnoses || []), newDiagnosis]
    }));
  };

  const handleUpdateDiagnosisSide = (index: number, side: 'left' | 'right' | 'bilateral' | '') => {
    setFormData((prev) => {
      const updatedDiagnoses = [...(prev.linkedDiagnoses || [])];
      if (updatedDiagnoses[index]) {
        updatedDiagnoses[index] = {
          ...updatedDiagnoses[index],
          side
        };
      }
      return {
        ...prev,
        linkedDiagnoses: updatedDiagnoses
      };
    });
  };

  const handleEditDiagnosis = (index: number) => {
    const diagnosis = formData.linkedDiagnoses?.[index];
    if (diagnosis) {
      setEditingDiagnosisIndex(index);
      setDiagnosisFormData({
        side: diagnosis.side || '',
        isPrimary: diagnosis.isPrimary || false,
        notes: diagnosis.notes || '',
        status: diagnosis.status || 'active',
        severity: diagnosis.severity || '',
        onsetDate: diagnosis.onsetDate ? new Date(diagnosis.onsetDate).toISOString().split('T')[0] : '',
        resolvedDate: diagnosis.resolvedDate ? new Date(diagnosis.resolvedDate).toISOString().split('T')[0] : ''
      });
      setDiagnosisEditDialogOpen(true);
    }
  };

  const handleSaveDiagnosisEdit = () => {
    if (editingDiagnosisIndex === null) return;

    setFormData((prev) => {
      const updatedDiagnoses = [...(prev.linkedDiagnoses || [])];
      if (updatedDiagnoses[editingDiagnosisIndex]) {
        // Wenn eine Diagnose als Hauptdiagnose gesetzt wird, entferne die Hauptdiagnose von allen anderen
        if (diagnosisFormData.isPrimary) {
          updatedDiagnoses.forEach((diag, idx) => {
            if (idx !== editingDiagnosisIndex) {
              diag.isPrimary = false;
            }
          });
        }
        
        updatedDiagnoses[editingDiagnosisIndex] = {
          ...updatedDiagnoses[editingDiagnosisIndex],
          side: diagnosisFormData.side,
          isPrimary: diagnosisFormData.isPrimary,
          notes: diagnosisFormData.notes,
          status: diagnosisFormData.status,
          severity: diagnosisFormData.severity || undefined,
          onsetDate: diagnosisFormData.onsetDate || undefined,
          resolvedDate: diagnosisFormData.resolvedDate || undefined
        };
      }
      return {
        ...prev,
        linkedDiagnoses: updatedDiagnoses
      };
    });

    setDiagnosisEditDialogOpen(false);
    setEditingDiagnosisIndex(null);
    setDiagnosisFormData({
      side: '',
      isPrimary: false,
      notes: '',
      status: 'active',
      severity: '',
      onsetDate: '',
      resolvedDate: ''
    });
  };

  const handleRemoveDiagnosis = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      linkedDiagnoses: prev.linkedDiagnoses?.filter((_, i) => i !== index) || []
    }));
  };

  const handleAddMedication = (medication: any) => {
    if (!medication) return;
    
    // Stelle sicher, dass medicationId eine String-ID ist, nicht ein Objekt
    let medicationId: string | undefined = undefined;
    if (medication._id) {
      medicationId = typeof medication._id === 'string' ? medication._id : medication._id.toString();
    } else if (medication.id) {
      medicationId = typeof medication.id === 'string' ? medication.id : medication.id.toString();
    } else if (medication.medicationId) {
      // Wenn medicationId ein Objekt ist, extrahiere die _id
      if (typeof medication.medicationId === 'object' && medication.medicationId._id) {
        medicationId = typeof medication.medicationId._id === 'string' 
          ? medication.medicationId._id 
          : medication.medicationId._id.toString();
      } else if (typeof medication.medicationId === 'string') {
        medicationId = medication.medicationId;
      } else {
        medicationId = medication.medicationId.toString();
      }
    }
    
    // Öffne den erweiterten Dialog für Medikamentenverordnung
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

  const handleEditMedication = (index: number) => {
    const med = formData.linkedMedications?.[index];
    if (!med) return;
    
    setEditingMedicationIndex(index);
    // Behalte das ursprüngliche Medikament-Objekt für medicationId
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

  const handleSaveMedication = () => {
    if (!selectedMedication) return;
    
    let medicationId: string | undefined = undefined;
    let medicationName: string = '';
    
    if (editingMedicationIndex !== null) {
      // Beim Bearbeiten: Verwende die Daten aus dem ursprünglichen Medikament
      const originalMed = formData.linkedMedications?.[editingMedicationIndex];
      if (originalMed) {
        medicationId = originalMed.medicationId;
        medicationName = originalMed.name;
      }
    } else {
      // Beim Hinzufügen: Extrahiere medicationId aus dem neuen Medikament
      if (selectedMedication._id) {
        medicationId = typeof selectedMedication._id === 'string' ? selectedMedication._id : selectedMedication._id.toString();
      } else if (selectedMedication.id) {
        medicationId = typeof selectedMedication.id === 'string' ? selectedMedication.id : selectedMedication.id.toString();
      } else if (selectedMedication.medicationId) {
        if (typeof selectedMedication.medicationId === 'object' && selectedMedication.medicationId._id) {
          medicationId = typeof selectedMedication.medicationId._id === 'string' 
            ? selectedMedication.medicationId._id 
            : selectedMedication.medicationId._id.toString();
        } else if (typeof selectedMedication.medicationId === 'string') {
          medicationId = selectedMedication.medicationId;
        } else {
          medicationId = selectedMedication.medicationId.toString();
        }
      }
      medicationName = selectedMedication.name || selectedMedication.Name || selectedMedication.medicationName || '';
    }
    
    // Erstelle Medikament-Objekt mit allen Feldern - alle Felder werden explizit gesetzt
    // Verwende leere Strings statt undefined, damit die Felder beim Speichern erhalten bleiben
    const newMedication: any = {
      medicationId: medicationId,
      name: medicationName || selectedMedication.name || selectedMedication.Name || selectedMedication.medicationName || '',
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
    
    // Datum-Felder (nur wenn gesetzt)
    if (medicationFormData.startDate && medicationFormData.startDate.trim() !== '') {
      newMedication.startDate = new Date(medicationFormData.startDate);
    }
    if (medicationFormData.endDate && medicationFormData.endDate.trim() !== '') {
      newMedication.endDate = new Date(medicationFormData.endDate);
    }
    
    // Quantity als Zahl (nur wenn gesetzt)
    if (medicationFormData.quantity && medicationFormData.quantity.trim() !== '') {
      const qty = parseFloat(medicationFormData.quantity);
      if (!isNaN(qty)) {
        newMedication.quantity = qty;
      }
    }
    
    if (editingMedicationIndex !== null) {
      // Bearbeiten
      setFormData((prev) => {
        const updated = [...(prev.linkedMedications || [])];
        updated[editingMedicationIndex] = newMedication;
        return {
          ...prev,
          linkedMedications: updated
        };
      });
    } else {
      // Neu hinzufügen
    setFormData((prev) => ({
      ...prev,
      linkedMedications: [...(prev.linkedMedications || []), newMedication]
    }));
    }
    
    handleCloseMedicationDialog();
  };

  const handleCloseMedicationDialog = () => {
    setMedicationDialogOpen(false);
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

  const handleRemoveMedication = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      linkedMedications: prev.linkedMedications?.filter((_, i) => i !== index) || []
    }));
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      setError('Nur Bilddateien sind erlaubt');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Datei ist zu groß (max. 10MB)');
      return;
    }

    setError(null);
    
    // Wenn Eintrag bereits existiert, lade sofort hoch
    const entryId = currentEntry?._id;
    if (entryId) {
      setUploadingPhoto(true);
      try {
        const result = await dispatch(uploadDekursPhoto({ entryId, photoFile: file })).unwrap();
        // Lade Eintrag neu um Fotos zu aktualisieren
        const refreshedEntry = await dispatch(fetchDekursEntry(entryId)).unwrap();
        setCurrentEntry(refreshedEntry);
      } catch (err: any) {
        setError(err.message || 'Fehler beim Hochladen des Fotos');
      } finally {
        setUploadingPhoto(false);
        if (photoInputRef) {
          photoInputRef.value = '';
        }
      }
    } else {
      // Wenn Eintrag noch nicht existiert, speichere Foto lokal
      setPendingPhotos(prev => [...prev, file]);
      // Erstelle Preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPendingPhotoPreviews(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
      
      if (photoInputRef) {
        photoInputRef.value = '';
      }
    }
  };

  const handleDeletePhoto = async (index: number, isPending: boolean = false) => {
    if (isPending) {
      // Lösche temporäres Foto
      setPendingPhotos(prev => prev.filter((_, i) => i !== index));
      setPendingPhotoPreviews(prev => prev.filter((_, i) => i !== index));
      return;
    }

    const entryId = currentEntry?._id;
    if (!entryId) return;

    try {
      await dispatch(deleteDekursPhoto({ entryId, attachmentIndex: index })).unwrap();
      // Lade Eintrag neu um Fotos zu aktualisieren
      if (entryId) {
        const refreshedEntry = await dispatch(fetchDekursEntry(entryId)).unwrap();
        setCurrentEntry(refreshedEntry);
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Löschen des Fotos');
    }
  };

  const handleSave = async (finalize = false) => {
    setSaving(true);
    setError(null);

    try {
      // Bereinige linkedMedications vor dem Speichern: Stelle sicher, dass medicationId eine String-ID ist und alle Felder erhalten bleiben
      console.log('🔍 Frontend - formData.linkedMedications vor Bereinigung:', JSON.stringify(formData.linkedMedications, null, 2));
      const cleanedFormData = {
        ...formData,
        linkedMedications: (formData.linkedMedications || []).map((med: any) => {
          let medicationId: string | undefined = undefined;
          if (med.medicationId) {
            // Wenn medicationId ein Objekt ist, extrahiere die _id
            if (typeof med.medicationId === 'object' && med.medicationId._id) {
              medicationId = typeof med.medicationId._id === 'string' 
                ? med.medicationId._id 
                : med.medicationId._id.toString();
            } else if (typeof med.medicationId === 'string') {
              medicationId = med.medicationId;
            } else {
              medicationId = med.medicationId.toString();
            }
          }
          
          // Stelle sicher, dass alle Felder explizit gesetzt werden und erhalten bleiben
          // Verwende leere Strings statt undefined, damit die Felder beim Speichern erhalten bleiben
          const cleanedMed: any = {
            medicationId: medicationId,
            name: med.name || '',
            changeType: med.changeType || 'added',
            dosage: med.dosage || '',
            dosageUnit: med.dosageUnit || '',
            frequency: med.frequency || '',
            duration: med.duration || '',
            instructions: med.instructions || '',
            quantityUnit: med.quantityUnit || '',
            route: med.route || 'oral',
            notes: med.notes || ''
          };
          
          // Datum-Felder (nur wenn gesetzt)
          if (med.startDate !== undefined && med.startDate !== null) {
            cleanedMed.startDate = typeof med.startDate === 'string' ? med.startDate : med.startDate.toISOString();
          }
          if (med.endDate !== undefined && med.endDate !== null) {
            cleanedMed.endDate = typeof med.endDate === 'string' ? med.endDate : med.endDate.toISOString();
          }
          
          // Quantity als Zahl (nur wenn gesetzt)
          if (med.quantity !== undefined && med.quantity !== null) {
            cleanedMed.quantity = med.quantity;
          }
          
          return cleanedMed;
        })
      };
      console.log('🔍 Frontend - cleanedFormData.linkedMedications nach Bereinigung:', JSON.stringify(cleanedFormData.linkedMedications, null, 2));
      
      let savedEntry: DekursEntry;

      if (currentEntry?._id) {
        // Update
        savedEntry = await dispatch(
          updateDekursEntry({ entryId: currentEntry._id, entryData: cleanedFormData })
        ).unwrap();
      } else {
        // Create
        savedEntry = await dispatch(createDekursEntry(cleanedFormData)).unwrap();
      }

      if (finalize && savedEntry._id) {
        await dispatch(finalizeDekursEntry(savedEntry._id)).unwrap();
      }

      // Lade Eintrag neu um alle Daten zu aktualisieren
      if (savedEntry._id) {
        const refreshedEntry = await dispatch(fetchDekursEntry(savedEntry._id)).unwrap();
        savedEntry = refreshedEntry;
        // Aktualisiere currentEntry damit Fotos hinzugefügt werden können
        setCurrentEntry(refreshedEntry);
        
        // Lade temporäre Fotos hoch
        if (pendingPhotos.length > 0 && savedEntry._id) {
          for (const photo of pendingPhotos) {
            try {
              await dispatch(uploadDekursPhoto({ entryId: savedEntry._id, photoFile: photo })).unwrap();
            } catch (err: any) {
              console.error('Fehler beim Hochladen des Fotos:', err);
              setError(`Fehler beim Hochladen eines Fotos: ${err.message || 'Unbekannter Fehler'}`);
            }
          }
          // Lade Eintrag erneut um alle Fotos zu aktualisieren
          const finalEntry = await dispatch(fetchDekursEntry(savedEntry._id)).unwrap();
          savedEntry = finalEntry;
          setCurrentEntry(finalEntry);
          // Lösche temporäre Fotos
          setPendingPhotos([]);
          setPendingPhotoPreviews([]);
        }
      }

      if (onSave) {
        onSave(savedEntry);
      }

      // Schließe Dialog nach erfolgreichem Speichern (sowohl Entwurf als auch finalisiert)
        onClose();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const entry = currentEntry || formData;
    const patient = patients.find(p => p._id === patientId);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dekurs - ${patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}</title>
          <style>
            @media print {
              @page { margin: 2cm; }
              body { margin: 0; padding: 0; }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              line-height: 1.6;
              color: #333;
            }
            .header {
              border-bottom: 3px solid #FFC107;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              color: #FFC107;
              margin: 0 0 10px 0;
            }
            .info-section {
              margin-bottom: 20px;
            }
            .info-section h2 {
              color: #1976d2;
              border-bottom: 2px solid #1976d2;
              padding-bottom: 5px;
              margin-top: 25px;
              margin-bottom: 10px;
            }
            .info-row {
              margin-bottom: 10px;
            }
            .info-label {
              font-weight: bold;
              color: #666;
              display: inline-block;
              width: 150px;
            }
            .content {
              white-space: pre-wrap;
              background: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              margin-top: 10px;
            }
            .chip {
              display: inline-block;
              background: #e3f2fd;
              padding: 5px 10px;
              border-radius: 15px;
              margin: 5px 5px 5px 0;
              font-size: 0.9em;
            }
            .photo-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 15px;
              margin-top: 10px;
            }
            .photo-item {
              border: 1px solid #ddd;
              border-radius: 5px;
              overflow: hidden;
            }
            .photo-item img {
              width: 100%;
              height: auto;
              display: block;
            }
            .photo-item .caption {
              padding: 8px;
              background: #f5f5f5;
              font-size: 0.85em;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Dekurs</h1>
            <div class="info-row">
              <span class="info-label">Patient:</span>
              ${patient ? `${patient.firstName} ${patient.lastName}` : '—'}
            </div>
            ${entry.entryDate ? `
            <div class="info-row">
              <span class="info-label">Datum:</span>
              ${new Date(entry.entryDate).toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            ` : ''}
            ${entry.visitReason ? `
            <div class="info-row">
              <span class="info-label">Besuchsgrund:</span>
              ${entry.visitReason}
            </div>
            ` : ''}
            ${entry.visitType ? `
            <div class="info-row">
              <span class="info-label">Besuchstyp:</span>
              ${entry.visitType === 'appointment' ? 'Termin' : entry.visitType === 'phone' ? 'Telefon' : entry.visitType === 'emergency' ? 'Notfall' : entry.visitType === 'follow-up' ? 'Nachsorge' : entry.visitType === 'other' ? 'Sonstiges' : entry.visitType}
            </div>
            ` : ''}
            ${entry.status ? `
            <div class="info-row">
              <span class="info-label">Status:</span>
              ${entry.status === 'finalized' ? 'Finalisiert' : 'Entwurf'}
            </div>
            ` : ''}
          </div>

          ${entry.clinicalObservations ? `
          <div class="info-section">
            <h2>Klinische Beobachtungen</h2>
            <div class="content">${entry.clinicalObservations}</div>
          </div>
          ` : ''}

          ${entry.progressChecks ? `
          <div class="info-section">
            <h2>Verlaufskontrollen</h2>
            <div class="content">${entry.progressChecks}</div>
          </div>
          ` : ''}

          ${entry.findings ? `
          <div class="info-section">
            <h2>Befunde</h2>
            <div class="content">${entry.findings}</div>
          </div>
          ` : ''}

          ${entry.medicationChanges ? `
          <div class="info-section">
            <h2>Medikamentenänderungen</h2>
            <div class="content">${entry.medicationChanges}</div>
          </div>
          ` : ''}

          ${entry.treatmentDetails ? `
          <div class="info-section">
            <h2>Behandlungsdetails</h2>
            <div class="content">${entry.treatmentDetails}</div>
          </div>
          ` : ''}

          ${entry.psychosocialFactors ? `
          <div class="info-section">
            <h2>Psychosoziale Faktoren</h2>
            <div class="content">${entry.psychosocialFactors}</div>
          </div>
          ` : ''}

          ${entry.notes ? `
          <div class="info-section">
            <h2>Notizen</h2>
            <div class="content">${entry.notes}</div>
          </div>
          ` : ''}

          ${entry.linkedDiagnoses && entry.linkedDiagnoses.length > 0 ? `
          <div class="info-section">
            <h2>Verknüpfte Diagnosen</h2>
            ${entry.linkedDiagnoses.map((diag: any) => `
              <span class="chip">${diag.icd10Code} - ${diag.display}${diag.side ? ` (${diag.side === 'left' ? 'Links' : diag.side === 'right' ? 'Rechts' : 'Beidseitig'})` : ''}</span>
            `).join('')}
          </div>
          ` : ''}

          ${entry.linkedMedications && entry.linkedMedications.length > 0 ? `
          <div class="info-section">
            <h2>Verknüpfte Medikamente</h2>
            ${entry.linkedMedications.map((med: any) => {
              const parts: string[] = [];
              if (med.dosage) {
                parts.push(`${med.dosage}${med.dosageUnit ? ` ${med.dosageUnit}` : ''}`);
              }
              if (med.frequency) {
                parts.push(med.frequency);
              }
              if (med.duration) {
                parts.push(`Dauer: ${med.duration}`);
              }
              if (med.route && med.route !== 'oral') {
                const routeText = med.route === 'topical' ? 'topisch' : 
                                  med.route === 'injection' ? 'Injektion' : 
                                  med.route === 'inhalation' ? 'Inhalation' : 
                                  med.route === 'rectal' ? 'rektal' : 
                                  med.route === 'vaginal' ? 'vaginal' : 'sonstig';
                parts.push(`Applikationsweg: ${routeText}`);
              }
              if (med.quantity && med.quantityUnit) {
                parts.push(`Menge: ${med.quantity} ${med.quantityUnit}`);
              }
              if (med.startDate) {
                const startDate = typeof med.startDate === 'string' ? new Date(med.startDate) : med.startDate;
                parts.push(`Startdatum: ${startDate.toLocaleDateString('de-DE')}`);
              }
              if (med.endDate) {
                const endDate = typeof med.endDate === 'string' ? new Date(med.endDate) : med.endDate;
                parts.push(`Enddatum: ${endDate.toLocaleDateString('de-DE')}`);
              }
              if (med.instructions) {
                parts.push(`Einnahmehinweise: ${med.instructions}`);
              }
              if (med.notes) {
                parts.push(`Notizen: ${med.notes}`);
              }
              if (med.changeType && med.changeType !== 'added') {
                const changeTypeText = med.changeType === 'modified' ? 'Geändert' : 
                                      med.changeType === 'discontinued' ? 'Abgesetzt' : 
                                      med.changeType === 'unchanged' ? 'Unverändert' : med.changeType;
                parts.push(`Status: ${changeTypeText}`);
              }
              
              return `
              <div style="margin-bottom: 15px; padding: 8px; border-left: 3px solid #1976d2;">
                <strong>${med.name}</strong>
                ${parts.length > 0 ? `<div style="margin-top: 5px; font-size: 0.9em; color: #666;">${parts.join(' • ')}</div>` : ''}
              </div>
            `;
            }).join('')}
          </div>
          ` : ''}

          ${(currentEntry?.attachments && currentEntry.attachments.length > 0) || pendingPhotoPreviews.length > 0 ? `
          <div class="info-section">
            <h2>Fotos</h2>
            <div class="photo-grid">
              ${currentEntry?.attachments ? currentEntry.attachments.map((attachment: any) => `
                <div class="photo-item">
                  <img src="http://localhost:5001/${attachment.path}" alt="${attachment.originalName}" />
                  <div class="caption">${attachment.originalName}</div>
                </div>
              `).join('') : ''}
            </div>
          </div>
          ` : ''}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setFormData({
        patientId,
        encounterId,
        visitReason: '',
        visitType: 'appointment',
        clinicalObservations: '',
        progressChecks: '',
        findings: '',
        medicationChanges: '',
        treatmentDetails: '',
        psychosocialFactors: '',
        notes: '',
        linkedDiagnoses: [],
        linkedMedications: [],
        linkedDocuments: []
      });
      setSelectedVorlage(null);
      setError(null);
      // Lösche temporäre Fotos beim Schließen
      setPendingPhotos([]);
      setPendingPhotoPreviews([]);
      // Setze currentEntry zurück, damit beim nächsten Öffnen ein leerer Dialog erscheint
      setCurrentEntry(null);
      onClose();
    }
  };

  const isFinalized = currentEntry?.status === 'finalized';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#FFF9C4', // Hellgelber Hintergrund
          borderRadius: 3
        }
      }}
    >
      <DialogTitle sx={{ bgcolor: 'yellow.50', borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <Assignment sx={{ color: 'warning.main' }} />
            <Typography variant="h6">
              {initialEntry ? 'Dekurs bearbeiten' : 'Neuer Dekurs'}
            </Typography>
            {isFinalized && (
              <Chip
                icon={<CheckCircle />}
                label="Finalisiert"
                color="success"
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          <IconButton onClick={handleClose} disabled={saving}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: '#FFF9C4' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Vorlagen-Auswahl */}
        {!initialEntry && (
        <Box sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              onClick={() => setVorlagenDialogOpen(true)}
              disabled={loading}
              fullWidth
              sx={{ mb: 1 }}
            >
              Vorlage einfügen
            </Button>
        </Box>
        )}

        {/* Basis-Informationen */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Diagnose"
              value={formData.visitReason || ''}
              onChange={(e) => handleFieldChange('visitReason', e.target.value)}
              multiline
              rows={2}
              disabled={isFinalized}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Besuchstyp</InputLabel>
              <Select
                value={formData.visitType || 'appointment'}
                onChange={(e) => handleFieldChange('visitType', e.target.value)}
                disabled={isFinalized}
              >
                <MenuItem value="appointment">Termin</MenuItem>
                <MenuItem value="phone">Telefonat</MenuItem>
                <MenuItem value="emergency">Notfall</MenuItem>
                <MenuItem value="follow-up">Nachkontrolle</MenuItem>
                <MenuItem value="other">Sonstiges</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Tabs für strukturierte Eingabe */}
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="Allgemein" icon={<LocalHospital />} iconPosition="start" />
          <Tab label="Medikamente" icon={<Medication />} iconPosition="start" />
          <Tab label="Diagnosen" icon={<CheckCircle />} iconPosition="start" />
          <Tab label="Vitalwerte" icon={<MonitorHeart />} iconPosition="start" />
          <Tab label="Fotos" icon={<PhotoCamera />} iconPosition="start" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Stack spacing={2}>
          <TextField
            fullWidth
              label="Anamnese"
            value={formData.clinicalObservations || ''}
            onChange={(e) => handleFieldChange('clinicalObservations', e.target.value)}
            multiline
              rows={4}
            disabled={isFinalized}
              placeholder="Beschreiben Sie die Anamnese..."
          />
          <TextField
            fullWidth
              label="Status/Befund"
              value={formData.findings || ''}
              onChange={(e) => handleFieldChange('findings', e.target.value)}
              multiline
              rows={4}
              disabled={isFinalized}
              placeholder="Beschreiben Sie den Status/Befund..."
            />
            <TextField
              fullWidth
              label="Beurteilung"
            value={formData.progressChecks || ''}
            onChange={(e) => handleFieldChange('progressChecks', e.target.value)}
            multiline
              rows={4}
            disabled={isFinalized}
              placeholder="Beschreiben Sie die Beurteilung..."
          />
            <TextField
              fullWidth
              label="Therapie"
              value={formData.treatmentDetails || ''}
              onChange={(e) => handleFieldChange('treatmentDetails', e.target.value)}
              multiline
              rows={4}
              disabled={isFinalized}
              placeholder="Beschreiben Sie die Therapie..."
            />
            <TextField
              fullWidth
              label="Empfehlung"
              value={formData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              multiline
              rows={3}
              disabled={isFinalized}
              placeholder="Empfehlungen..."
            />
            <TextField
              fullWidth
              label="Psychosoziale Faktoren"
              value={formData.psychosocialFactors || ''}
              onChange={(e) => handleFieldChange('psychosocialFactors', e.target.value)}
              multiline
              rows={2}
              disabled={isFinalized}
              placeholder="Psychosoziale Faktoren..."
            />
            <Divider />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Bildgebende Befunde (DICOM/Radiologie)</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button
                  variant="outlined"
                          size="small"
                  onClick={() => setDicomSelectorOpen(true)}
                  disabled={isFinalized}
                >
                  DICOM-Studien übernehmen
                </Button>
              </Box>
              <TextField
                fullWidth
                label="Bildgebende Befunde"
                value={formData.imagingFindings || ''}
                onChange={(e) => handleFieldChange('imagingFindings', e.target.value)}
                multiline
                rows={4}
                disabled={isFinalized}
                placeholder="Bildgebende Befunde (wird automatisch befüllt wenn DICOM-Studien ausgewählt werden)..."
              />
                    </Box>
            <Divider />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Laborbefunde</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button
                  variant="outlined"
                        size="small"
                  onClick={() => setLaborSelectorOpen(true)}
                  disabled={isFinalized}
                >
                  Aktuelle Laborwerte übernehmen
                </Button>
              </Box>
              <TextField
                fullWidth
                label="Laborbefunde"
                value={formData.laboratoryFindings || ''}
                onChange={(e) => handleFieldChange('laboratoryFindings', e.target.value)}
                multiline
                rows={4}
                disabled={isFinalized}
                placeholder="Laborbefunde (wird automatisch befüllt wenn Laborwerte ausgewählt werden)..."
              />
            </Box>
          </Stack>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Medikamentenänderungen"
              value={formData.medicationChanges || ''}
              onChange={(e) => handleFieldChange('medicationChanges', e.target.value)}
              multiline
              rows={4}
              disabled={isFinalized}
              placeholder="Beschreiben Sie Änderungen an der Medikation..."
            />
            <Divider />
            <Typography variant="subtitle2">Verknüpfte Medikamente</Typography>
            <MedicationAutocomplete
              value={null}
              onChange={(medication) => {
                if (medication) {
                  handleAddMedication(medication);
                }
              }}
            />
            {formData.linkedMedications && formData.linkedMedications.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {formData.linkedMedications.map((med, index) => (
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
                        {med.quantity && med.quantityUnit && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Menge: {med.quantity} {med.quantityUnit}
                          </Typography>
                        )}
                        {med.startDate && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Startdatum: {typeof med.startDate === 'string' ? new Date(med.startDate).toLocaleDateString('de-DE') : new Date(med.startDate).toLocaleDateString('de-DE')}
                          </Typography>
                        )}
                        {med.endDate && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Enddatum: {typeof med.endDate === 'string' ? new Date(med.endDate).toLocaleDateString('de-DE') : new Date(med.endDate).toLocaleDateString('de-DE')}
                          </Typography>
                        )}
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
                        {med.changeType && med.changeType !== 'added' && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Status: {med.changeType === 'modified' ? 'Geändert' : med.changeType === 'discontinued' ? 'Abgesetzt' : med.changeType === 'unchanged' ? 'Unverändert' : med.changeType}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {!isFinalized && (
                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditMedication(index)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveMedication(index)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                      </Stack>
                    )}
                  </Paper>
                ))}
              </Box>
            )}
          </Stack>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Stack spacing={2}>
            <Typography variant="subtitle2">Verknüpfte Diagnosen</Typography>
            <ICD10Autocomplete
              onSelect={(code: string, display: string, fullCode: any) => handleAddDiagnosis(fullCode)}
            />
            {formData.linkedDiagnoses && formData.linkedDiagnoses.length > 0 && (
              <Stack spacing={1}>
                {formData.linkedDiagnoses.map((diag, index) => {
                  const getStatusColor = (status?: string) => {
                    switch (status) {
                      case 'active': return 'success';
                      case 'resolved': return 'default';
                      case 'provisional': return 'warning';
                      case 'ruled-out': return 'error';
                      default: return 'default';
                    }
                  };
                  const getStatusLabel = (status?: string) => {
                    switch (status) {
                      case 'active': return 'Aktiv';
                      case 'resolved': return 'Behoben';
                      case 'provisional': return 'Verdachtsdiagnose';
                      case 'ruled-out': return 'Ausgeschlossen';
                      default: return 'Aktiv';
                    }
                  };
                  const getSeverityColor = (severity?: string) => {
                    switch (severity) {
                      case 'mild': return 'success';
                      case 'moderate': return 'warning';
                      case 'severe': return 'error';
                      case 'critical': return 'error';
                      default: return 'default';
                    }
                  };
                  const getSeverityLabel = (severity?: string) => {
                    switch (severity) {
                      case 'mild': return 'Leicht';
                      case 'moderate': return 'Mäßig';
                      case 'severe': return 'Schwer';
                      case 'critical': return 'Kritisch';
                      default: return '';
                    }
                  };
                  
                  return (
                    <Paper key={index} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" fontWeight="bold">
                            {diag.icd10Code} - {diag.display}
                          </Typography>
                          {diag.isPrimary && (
                            <Chip
                              label="Hauptdiagnose"
                              size="small"
                              color="primary"
                              icon={<CheckCircle />}
                            />
                          )}
                          {diag.status && (
                            <Chip
                              label={getStatusLabel(diag.status)}
                              size="small"
                              color={getStatusColor(diag.status) as any}
                              variant="outlined"
                            />
                          )}
                          {diag.severity && (
                            <Chip
                              label={getSeverityLabel(diag.severity)}
                              size="small"
                              color={getSeverityColor(diag.severity) as any}
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
                        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                          {diag.onsetDate && (
                            <Typography variant="caption" color="text.secondary">
                              Beginn: {new Date(diag.onsetDate).toLocaleDateString('de-DE')}
                            </Typography>
                          )}
                          {diag.resolvedDate && (
                            <Typography variant="caption" color="text.secondary">
                              Ende: {new Date(diag.resolvedDate).toLocaleDateString('de-DE')}
                            </Typography>
                          )}
                        </Stack>
                        {diag.notes && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {diag.notes}
                          </Typography>
                        )}
                      </Box>
                      {!isFinalized && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditDiagnosis(index)}
                            color="primary"
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveDiagnosis(index)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Stack spacing={2}>
            <VitalSignsSelector
              patientId={patientId}
              appointmentId={encounterId}
              onSelect={handleVitalSignsSelect}
              allowCreate={!isFinalized}
            />
            <Alert severity="info">
              Wählen Sie "Übernehmen", um die Vitalwerte in die Anamnese zu übernehmen.
            </Alert>
          </Stack>
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <Stack spacing={2}>
            {!isFinalized && (
              <Box>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                  ref={(input) => setPhotoInputRef(input)}
                  id="dekurs-photo-upload"
                />
                <label htmlFor="dekurs-photo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<PhotoCamera />}
                    disabled={uploadingPhoto}
                    fullWidth
                  >
                    {uploadingPhoto ? <CircularProgress size={20} /> : 'Foto hinzufügen'}
                  </Button>
                </label>
              </Box>
            )}
            {/* Temporäre Fotos (vor dem Speichern) */}
            {pendingPhotoPreviews.length > 0 && (
              <Grid container spacing={2}>
                {pendingPhotoPreviews.map((preview, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`pending-${index}`}>
                    <Paper sx={{ p: 1, position: 'relative', border: '2px dashed', borderColor: 'warning.main' }}>
                      <Box
                        component="img"
                        src={preview}
                        alt={`Temporäres Foto ${index + 1}`}
                        onClick={() => {
                          setSelectedImage(preview);
                          setSelectedImageName(pendingPhotos[index]?.name || 'Temporäres Foto');
                          setImagePreviewOpen(true);
                        }}
                        sx={{
                          width: '100%',
                          height: 200,
                          objectFit: 'cover',
                          borderRadius: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 0.8,
                            transition: 'opacity 0.2s'
                          }
                        }}
                      />
                      {!isFinalized && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto(index, true);
                          }}
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' }
                          }}
                        >
                          <Delete />
                        </IconButton>
                      )}
                      <Chip
                        label="Wird beim Speichern hochgeladen"
                        size="small"
                        color="warning"
                        sx={{ mt: 1, width: '100%' }}
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        {pendingPhotos[index]?.name || 'Temporäres Foto'}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
            {/* Gespeicherte Fotos */}
            {currentEntry?.attachments && currentEntry.attachments.length > 0 && (
              <Grid container spacing={2}>
                {currentEntry.attachments.map((attachment, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`saved-${index}`}>
                    <Paper sx={{ p: 1, position: 'relative' }}>
                      <Box
                        component="img"
                        src={`http://localhost:5001/${attachment.path}`}
                        alt={attachment.originalName}
                        onClick={() => {
                          setSelectedImage(`http://localhost:5001/${attachment.path}`);
                          setSelectedImageName(attachment.originalName);
                          setImagePreviewOpen(true);
                        }}
                        sx={{
                          width: '100%',
                          height: 200,
                          objectFit: 'cover',
                          borderRadius: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 0.8,
                            transition: 'opacity 0.2s'
                          }
                        }}
                      />
                      {!isFinalized && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto(index, false);
                          }}
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' }
                          }}
                        >
                          <Delete />
                        </IconButton>
                      )}
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        {attachment.originalName}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
            {(!currentEntry?.attachments || currentEntry.attachments.length === 0) && pendingPhotoPreviews.length === 0 && (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                Keine Fotos vorhanden
              </Typography>
            )}
          </Stack>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ bgcolor: 'yellow.50', borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={handleClose} disabled={saving} startIcon={<Cancel />}>
          Abbrechen
        </Button>
        {!isFinalized && (
          <>
            <Button
              onClick={() => handleSave(false)}
              variant="outlined"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <Save />}
            >
              {saving ? 'Speichern...' : 'Als Entwurf speichern'}
            </Button>
            <Button
              onClick={() => handleSave(true)}
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <CheckCircle />}
              sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
            >
              {saving ? 'Finalisieren...' : 'Finalisieren'}
            </Button>
          </>
        )}
      </DialogActions>

      {/* Bild-Vorschau Dialog */}
      <Dialog
        open={imagePreviewOpen}
        onClose={() => {
          setImagePreviewOpen(false);
          setSelectedImage(null);
          setSelectedImageName('');
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.9)',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'transparent', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ color: 'white' }}>
            {selectedImageName}
          </Typography>
          <IconButton
            onClick={() => {
              setImagePreviewOpen(false);
              setSelectedImage(null);
              setSelectedImageName('');
            }}
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'transparent', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
          {selectedImage && (
            <Box
              component="img"
              src={selectedImage}
              alt={selectedImageName}
              sx={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: 1
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Vorlagen-Auswahl Dialog */}
      <DekursVorlagenAutocomplete
        open={vorlagenDialogOpen}
        onClose={() => setVorlagenDialogOpen(false)}
        onSelect={handleVorlageSelect}
        locationId={currentLocation?._id}
      />

      {/* DICOM/Radiologie Selector */}
      <DicomRadiologieSelector
        open={dicomSelectorOpen}
        onClose={() => setDicomSelectorOpen(false)}
        onSelect={handleDicomSelect}
        patientId={patientId}
      />

      {/* Laborwerte Selector */}
      <LaborWerteSelector
        open={laborSelectorOpen}
        onClose={() => setLaborSelectorOpen(false)}
        onSelect={handleLaborSelect}
        patientId={patientId}
      />

      {/* Diagnose-Edit Dialog */}
      <Dialog
        open={diagnosisEditDialogOpen}
        onClose={() => {
          setDiagnosisEditDialogOpen(false);
          setEditingDiagnosisIndex(null);
          setDiagnosisFormData({
            side: '',
            isPrimary: false,
            notes: '',
            status: 'active',
            severity: '',
            onsetDate: '',
            resolvedDate: ''
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Diagnose bearbeiten
          {editingDiagnosisIndex !== null && formData.linkedDiagnoses?.[editingDiagnosisIndex] && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {formData.linkedDiagnoses[editingDiagnosisIndex].icd10Code} - {formData.linkedDiagnoses[editingDiagnosisIndex].display}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Status and Severity */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={diagnosisFormData.status}
                    onChange={(e) => setDiagnosisFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'resolved' | 'provisional' | 'ruled-out' }))}
                    label="Status"
                  >
                    <MenuItem value="active">Aktiv</MenuItem>
                    <MenuItem value="resolved">Behoben</MenuItem>
                    <MenuItem value="provisional">Verdachtsdiagnose</MenuItem>
                    <MenuItem value="ruled-out">Ausgeschlossen</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Schweregrad</InputLabel>
                  <Select
                    value={diagnosisFormData.severity}
                    onChange={(e) => setDiagnosisFormData(prev => ({ ...prev, severity: e.target.value as 'mild' | 'moderate' | 'severe' | 'critical' | '' }))}
                    label="Schweregrad"
                  >
                    <MenuItem value="">Nicht angegeben</MenuItem>
                    <MenuItem value="mild">Leicht</MenuItem>
                    <MenuItem value="moderate">Mäßig</MenuItem>
                    <MenuItem value="severe">Schwer</MenuItem>
                    <MenuItem value="critical">Kritisch</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <FormControl fullWidth>
              <InputLabel>Seite</InputLabel>
              <Select
                value={diagnosisFormData.side}
                onChange={(e) => setDiagnosisFormData(prev => ({ ...prev, side: e.target.value as 'left' | 'right' | 'bilateral' | '' }))}
                label="Seite"
              >
                <MenuItem value="">Keine Angabe</MenuItem>
                <MenuItem value="left">Links</MenuItem>
                <MenuItem value="right">Rechts</MenuItem>
                <MenuItem value="bilateral">Beidseitig</MenuItem>
              </Select>
            </FormControl>

            {/* Onset and Resolved Date */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="Beginn"
                  type="date"
                  value={diagnosisFormData.onsetDate}
                  onChange={(e) => setDiagnosisFormData(prev => ({ ...prev, onsetDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="Ende"
                  type="date"
                  value={diagnosisFormData.resolvedDate}
                  onChange={(e) => setDiagnosisFormData(prev => ({ ...prev, resolvedDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={diagnosisFormData.isPrimary}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDiagnosisFormData(prev => ({ ...prev, isPrimary: e.target.checked }))}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {diagnosisFormData.isPrimary ? <Star color="primary" /> : <StarBorder />}
                  <Typography>Hauptdiagnose</Typography>
                </Box>
              }
            />

            <TextField
              fullWidth
              label="Notizen"
              multiline
              rows={4}
              value={diagnosisFormData.notes}
              onChange={(e) => setDiagnosisFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Zusätzliche Informationen zur Diagnose..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDiagnosisEditDialogOpen(false);
              setEditingDiagnosisIndex(null);
              setDiagnosisFormData({
                side: '',
                isPrimary: false,
                notes: '',
                status: 'active',
                severity: '',
                onsetDate: '',
                resolvedDate: ''
              });
            }}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSaveDiagnosisEdit}
            variant="contained"
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog für Medikamentenverordnung */}
      <Dialog
        open={medicationDialogOpen}
        onClose={handleCloseMedicationDialog}
        maxWidth="md"
        fullWidth
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
    </Dialog>
  );
};

export default DekursDialog;

