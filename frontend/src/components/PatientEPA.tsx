import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Collapse,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CalendarToday,
  Description,
  LocalHospital,
  Medication,
  Science,
  Assignment,
  Image,
  PhotoCamera,
  ExpandMore,
  ExpandLess,
  Search,
  FilterList,
  Visibility,
  Edit,
  MonitorHeart,
  ShowChart,
  Close
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAppointments } from '../store/slices/appointmentSlice';
import { fetchPatientDiagnoses } from '../store/slices/diagnosisSlice';
import { fetchDocuments } from '../store/slices/documentSlice';
import { fetchDekursEntries } from '../store/slices/dekursSlice';
import { fetchVitalSigns } from '../store/slices/vitalSignsSlice';
import api from '../utils/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import VitalSignsChart from './VitalSignsChart';

interface EPAEntry {
  id: string;
  type: 'appointment' | 'dekurs' | 'diagnosis' | 'medication' | 'labor' | 'dicom' | 'document' | 'photo' | 'vital';
  date: Date;
  title: string;
  description?: string;
  status?: string;
  doctor?: string;
  metadata?: any;
  changeType?: 'added' | 'removed' | 'modified' | 'prescribed';
}

interface GroupedEPAEntry {
  id: string;
  type: 'appointment' | 'dekurs' | 'diagnosis' | 'medication' | 'labor' | 'dicom' | 'document' | 'photo' | 'vital';
  date: Date;
  title: string;
  description?: string;
  status?: string;
  doctor?: string;
  count: number;
  entries: EPAEntry[];
  isGrouped: boolean;
  metadata?: any;
}

interface PatientEPAProps {
  patientId: string;
  onNavigate?: (path: string) => void;
  onTabChange?: (tabIndex: number) => void;
}

const PatientEPA: React.FC<PatientEPAProps> = ({ patientId, onNavigate, onTabChange }) => {
  const dispatch = useAppDispatch();
  const { appointments, loading: appointmentsLoading } = useAppSelector((state) => state.appointments);
  const { patientDiagnoses, loading: diagnosesLoading } = useAppSelector((state) => state.diagnoses);
  const { documents, loading: documentsLoading } = useAppSelector((state) => state.documents);
  const { entries: dekursEntries, loading: dekursLoading } = useAppSelector((state) => state.dekurs);
  const { vitalSigns, loading: vitalSignsLoading } = useAppSelector((state) => state.vitalSigns);

  // Debug: Log documents and appointments when they change
  useEffect(() => {
    console.log('PatientEPA: Documents from Redux store:', {
      documents,
      documentsType: typeof documents,
      isArray: Array.isArray(documents),
      length: Array.isArray(documents) ? documents.length : 'N/A',
      patientId
    });
    console.log('PatientEPA: Appointments from Redux store:', {
      appointments,
      appointmentsType: typeof appointments,
      isArray: Array.isArray(appointments),
      length: Array.isArray(appointments) ? appointments.length : 'N/A',
      patientId
    });
  }, [documents, appointments, patientId]);

  const [epaEntries, setEpaEntries] = useState<EPAEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [laborResults, setLaborResults] = useState<any[]>([]);
  const [dicomStudies, setDicomStudies] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [patient, setPatient] = useState<any>(null);
  const [vitalSignsChartOpen, setVitalSignsChartOpen] = useState(false);

  // Lade alle Daten
  useEffect(() => {
    const loadData = async () => {
      if (!patientId) return;

      setLoading(true);
      try {
        // Verwende Promise.allSettled statt Promise.all, damit einzelne Fehler nicht die gesamte Komponente zum Absturz bringen
        await Promise.allSettled([
          dispatch(fetchAppointments()).catch(() => {}),
          dispatch(fetchPatientDiagnoses({ patientId })).catch(() => {}),
          dispatch(fetchDocuments({ patientId })).catch(() => {}),
          dispatch(fetchDekursEntries({ patientId, limit: 100 })).catch(() => {}),
          dispatch(fetchVitalSigns(patientId)).catch(() => {}),
          // Lade Patientendaten für Medikamente
          api.get<any>(`/patients-extended/${patientId}`).then((response: any) => {
            if (response.success) {
              setPatient(response.data || response);
            }
          }).catch((error: any) => {
            console.warn('Fehler beim Laden der Patientendaten:', error);
            setPatient(null);
          }),
          // Laborwerte
          api.get<any>(`/labor/patient/${patientId}`).then((response: any) => {
            if (response.success) {
              const data = response.data;
              const laborData = Array.isArray(data) ? data : ((data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) ? data.data : []);
              setLaborResults(laborData);
            }
          }).catch(() => setLaborResults([])),
          // DICOM-Studien
          api.get<any>(`/dicom/patient/${patientId}`).then((response: any) => {
            if (response.success) {
              const data = response.data;
              const dicomData = Array.isArray(data) ? data : ((data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) ? data.data : []);
              setDicomStudies(dicomData);
            }
          }).catch(() => setDicomStudies([])),
          // Fotos - verwende den korrekten Endpoint
          api.get<any>(`/patients-extended/${patientId}/photos`).then((response: any) => {
            if (response.success) {
              const data = response.data;
              const photosData = Array.isArray(data) ? data : ((data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) ? data.data : []);
              setPhotos(photosData);
            }
          }).catch((error: any) => {
            // Endpoint existiert möglicherweise nicht - das ist OK, setze einfach leeres Array
            // Logge den Fehler nur, wenn es nicht ein 404 ist
            if (error?.response?.status !== 404 && error?.message !== 'Endpoint nicht gefunden') {
              console.warn('Fehler beim Laden der Fotos:', error);
            }
            setPhotos([]);
          })
        ]);
      } catch (error) {
        console.error('Fehler beim Laden der ePA-Daten:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [patientId, dispatch]);

  // Erstelle EPA-Einträge aus allen Datenquellen
  useEffect(() => {
    if (!patientId) {
      setEpaEntries([]);
      return;
    }

    try {
      const entries: EPAEntry[] = [];

      // Termine
      try {
        console.log('PatientEPA: Processing appointments:', { 
          totalAppointments: (appointments || []).length, 
          patientId, 
          sampleAppointment: (appointments || [])[0] 
        });
        (appointments || []).forEach((apt: any) => {
          // Prüfe verschiedene mögliche Strukturen für patientId
          const aptPatientId = apt.patientId 
            || (apt.patient && typeof apt.patient === 'string' ? apt.patient : null)
            || (apt.patient && typeof apt.patient === 'object' ? apt.patient._id : null)
            || (apt.patient && typeof apt.patient === 'object' ? apt.patient.id : null);
          
          const matches = aptPatientId && (
            aptPatientId === patientId || 
            String(aptPatientId) === String(patientId)
          );
          
          if (matches) {
            console.log('PatientEPA: Adding appointment to entries:', { 
              aptId: apt._id, 
              title: apt.title, 
              patientId: aptPatientId 
            });
            entries.push({
              id: `appointment-${apt._id}`,
              type: 'appointment',
              date: new Date(apt.startTime || apt.date),
              title: apt.title || apt.service?.name || apt.type || 'Termin',
              description: apt.reason || apt.notes || apt.description,
              status: apt.status,
              doctor: apt.doctor ? (typeof apt.doctor === 'object' ? `${apt.doctor.firstName || ''} ${apt.doctor.lastName || ''}`.trim() : apt.doctor) : undefined,
              metadata: {
                ...apt,
                // Stelle sicher, dass wichtige Felder verfügbar sind
                startTime: apt.startTime,
                endTime: apt.endTime,
                duration: apt.duration || (apt.startTime && apt.endTime ? Math.round((new Date(apt.endTime).getTime() - new Date(apt.startTime).getTime()) / (1000 * 60)) : null),
                reason: apt.reason,
                notes: apt.notes,
                type: apt.type,
                bookingType: apt.bookingType,
                priority: apt.priority,
                roomName: apt.roomName || (apt.room && typeof apt.room === 'object' ? apt.room.name : null),
                service: apt.service,
                locationName: apt.locationName || (apt.locationId && typeof apt.locationId === 'object' ? apt.locationId.name : null)
              }
            });
          } else {
            console.log('PatientEPA: Appointment does not match patient:', { 
              aptId: apt._id, 
              aptPatientId, 
              patientId,
              patient: apt.patient
            });
          }
        });
        console.log('PatientEPA: Total appointment entries added:', entries.filter(e => e.type === 'appointment').length);
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Terminen:', error);
      }

      // Dekurs-Einträge
      try {
        (dekursEntries || []).forEach((dekurs: any) => {
          entries.push({
            id: `dekurs-${dekurs._id}`,
            type: 'dekurs',
            date: new Date(dekurs.entryDate || dekurs.createdAt),
            title: 'Dekurs-Eintrag',
            description: dekurs.visitReason || dekurs.clinicalObservations || dekurs.findings || dekurs.notes,
            status: dekurs.status,
            doctor: dekurs.createdBy ? (typeof dekurs.createdBy === 'object' ? `${dekurs.createdBy.firstName || ''} ${dekurs.createdBy.lastName || ''}`.trim() : dekurs.createdBy) : undefined,
            metadata: dekurs
          });
          
          // Medikamente aus Dekurs-Einträgen
          if (dekurs.linkedMedications && Array.isArray(dekurs.linkedMedications)) {
            dekurs.linkedMedications.forEach((linkedMed: any, medIndex: number) => {
              const med = linkedMed.medicationId || linkedMed;
              const medName = typeof med === 'object' ? (med.name || med.activeIngredient || 'Unbekanntes Medikament') : med;
              const medDosage = linkedMed.dosage || '';
              const medDosageUnit = linkedMed.dosageUnit || '';
              const medFrequency = linkedMed.frequency || '';
              const medRoute = linkedMed.route || '';
              const medNotes = linkedMed.notes || '';
              
              const medDescription = [
                medDosage && medDosageUnit && `Dosierung: ${medDosage} ${medDosageUnit}`,
                medFrequency && `Häufigkeit: ${medFrequency}`,
                medRoute && `Applikation: ${medRoute}`,
                medNotes && `Notizen: ${medNotes}`
              ].filter(Boolean).join(', ') || 'Medikament erfasst';
              
              entries.push({
                id: `medication-dekurs-${dekurs._id}-${medIndex}`,
                type: 'medication',
                date: new Date(dekurs.entryDate || dekurs.createdAt),
                title: medName,
                description: medDescription,
                status: 'aktiv',
                doctor: dekurs.createdBy ? (typeof dekurs.createdBy === 'object' ? `${dekurs.createdBy.firstName || ''} ${dekurs.createdBy.lastName || ''}`.trim() : dekurs.createdBy) : undefined,
                metadata: {
                  ...linkedMed,
                  medicationId: med,
                  dekursId: dekurs._id,
                  source: 'dekurs'
                },
                changeType: 'prescribed'
              });
            });
          }
        });
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Dekurs-Einträgen:', error);
      }

      // Diagnosen
      try {
        (patientDiagnoses || []).forEach((diag: any) => {
          entries.push({
            id: `diagnosis-${diag._id}`,
            type: 'diagnosis',
            date: new Date(diag.createdAt || diag.onsetDate || new Date()),
            title: `${diag.code || ''} - ${diag.display || 'Diagnose'}`,
            description: diag.notes || diag.description,
            status: diag.statusGerman || diag.status,
            metadata: diag
          });
        });
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Diagnosen:', error);
      }

      // Medikamente
      try {
        if (patient && patient.currentMedications && Array.isArray(patient.currentMedications)) {
          patient.currentMedications.forEach((med: any, index: number) => {
            // Medikament kann ein String oder ein Objekt sein
            const medName = typeof med === 'string' ? med : (med.name || 'Unbekanntes Medikament');
            const medDosage = typeof med === 'object' ? med.dosage : '';
            const medFrequency = typeof med === 'object' ? med.frequency : '';
            const medStartDate = typeof med === 'object' ? med.startDate : null;
            const medPrescribedBy = typeof med === 'object' ? med.prescribedBy : '';
            
            // Erstelle Beschreibung aus Dosierung, Häufigkeit, etc.
            const medDescription = [
              medDosage && `Dosierung: ${medDosage}`,
              medFrequency && `Häufigkeit: ${medFrequency}`,
              medPrescribedBy && `Verschrieben von: ${medPrescribedBy}`
            ].filter(Boolean).join(', ') || 'Medikament erfasst';
            
            entries.push({
              id: `medication-${patientId}-${index}-${Date.now()}`,
              type: 'medication',
              date: medStartDate ? new Date(medStartDate) : new Date(patient.updatedAt || patient.createdAt || new Date()),
              title: medName,
              description: medDescription,
              status: 'aktiv',
              metadata: {
                ...(typeof med === 'object' ? med : { name: med }),
                patientId: patientId
              },
              changeType: 'prescribed'
            });
          });
          console.log('PatientEPA: Total medication entries added:', entries.filter(e => e.type === 'medication').length);
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Medikamenten:', error);
      }

      // Dokumente
      try {
        const docsArray = Array.isArray(documents) ? documents : ((documents as any)?.data || []);
        console.log('PatientEPA: Processing documents:', { 
          totalDocs: docsArray.length, 
          patientId, 
          sampleDoc: docsArray[0] 
        });
        docsArray.forEach((doc: any) => {
          // Prüfe verschiedene mögliche Strukturen für patientId
          const docPatientId = doc.patientId 
            || (doc.patient && typeof doc.patient === 'string' ? doc.patient : null)
            || (doc.patient && typeof doc.patient === 'object' ? doc.patient.id : null)
            || (doc.patient && typeof doc.patient === 'object' ? doc.patient._id : null);
          
          const matches = docPatientId && (
            docPatientId === patientId || 
            String(docPatientId) === String(patientId)
          );
          
          if (matches) {
            console.log('PatientEPA: Adding document to entries:', { 
              docId: doc._id, 
              title: doc.title, 
              patientId: docPatientId 
            });
            entries.push({
              id: `document-${doc._id}`,
              type: 'document',
              date: new Date(doc.createdAt || doc.date || new Date()),
              title: doc.title || doc.name || 'Dokument',
              description: doc.description || doc.type,
              status: doc.status,
              metadata: doc
            });
          } else {
            console.log('PatientEPA: Document does not match patient:', { 
              docId: doc._id, 
              docPatientId, 
              patientId,
              patient: doc.patient
            });
          }
        });
        console.log('PatientEPA: Total document entries added:', entries.filter(e => e.type === 'document').length);
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Dokumenten:', error);
      }

      // Laborwerte
      try {
        laborResults.forEach((lab: any) => {
          entries.push({
            id: `labor-${lab._id}`,
            type: 'labor',
            date: new Date(lab.date || lab.createdAt || new Date()),
            title: lab.testName || lab.name || 'Laborwert',
            description: lab.result || lab.value || lab.description,
            status: lab.status,
            metadata: lab
          });
        });
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Laborwerten:', error);
      }

      // DICOM-Studien
      try {
        dicomStudies.forEach((dicom: any) => {
          entries.push({
            id: `dicom-${dicom._id}`,
            type: 'dicom',
            date: new Date(dicom.studyDate || dicom.createdAt || new Date()),
            title: dicom.studyDescription || dicom.modality || 'DICOM-Studie',
            description: dicom.seriesDescription || dicom.patientName,
            status: dicom.status,
            metadata: dicom
          });
        });
      } catch (error) {
        console.error('Fehler beim Verarbeiten von DICOM-Studien:', error);
      }

      // Fotos
      try {
        photos.forEach((photo: any) => {
          entries.push({
            id: `photo-${photo._id}`,
            type: 'photo',
            date: new Date(photo.createdAt || photo.date || new Date()),
            title: photo.title || photo.filename || 'Foto',
            description: photo.description || photo.caption,
            metadata: photo
          });
        });
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Fotos:', error);
      }

      // Vitalwerte
      try {
        (vitalSigns || []).forEach((vital: any) => {
          const vitalParts: Array<{ text: string; isAbnormal: boolean }> = [];
          let hasAbnormalValues = false;
          
          if (vital.bloodPressure?.systolic && vital.bloodPressure?.diastolic) {
            const sysAbnormal = isVitalValueAbnormal('bloodPressure_systolic', vital.bloodPressure.systolic);
            const diaAbnormal = isVitalValueAbnormal('bloodPressure_diastolic', vital.bloodPressure.diastolic);
            vitalParts.push({ 
              text: `RR: ${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic} mmHg`, 
              isAbnormal: sysAbnormal || diaAbnormal 
            });
            if (sysAbnormal || diaAbnormal) hasAbnormalValues = true;
          }
          if (vital.pulse) {
            const pulseAbnormal = isVitalValueAbnormal('pulse', vital.pulse);
            vitalParts.push({ text: `Puls: ${vital.pulse} bpm`, isAbnormal: pulseAbnormal });
            if (pulseAbnormal) hasAbnormalValues = true;
          }
          if (vital.respiratoryRate) {
            const respAbnormal = isVitalValueAbnormal('respiratoryRate', vital.respiratoryRate);
            vitalParts.push({ text: `AF: ${vital.respiratoryRate} /min`, isAbnormal: respAbnormal });
            if (respAbnormal) hasAbnormalValues = true;
          }
          if (vital.temperature?.value) {
            const unit = vital.temperature.unit === 'celsius' ? '°C' : '°F';
            const tempAbnormal = isVitalValueAbnormal('temperature', vital.temperature.value, vital.temperature.unit);
            vitalParts.push({ text: `Temp: ${vital.temperature.value} ${unit}`, isAbnormal: tempAbnormal });
            if (tempAbnormal) hasAbnormalValues = true;
          }
          if (vital.oxygenSaturation) {
            const spo2Abnormal = isVitalValueAbnormal('oxygenSaturation', vital.oxygenSaturation);
            vitalParts.push({ text: `SpO2: ${vital.oxygenSaturation}%`, isAbnormal: spo2Abnormal });
            if (spo2Abnormal) hasAbnormalValues = true;
          }
          if (vital.bloodGlucose?.value) {
            const unit = vital.bloodGlucose.unit || 'mg/dL';
            const bgAbnormal = isVitalValueAbnormal('bloodGlucose', vital.bloodGlucose.value);
            vitalParts.push({ text: `BZ: ${vital.bloodGlucose.value} ${unit}`, isAbnormal: bgAbnormal });
            if (bgAbnormal) hasAbnormalValues = true;
          }
          if (vital.weight?.value) {
            vitalParts.push({ text: `Gewicht: ${vital.weight.value} ${vital.weight.unit}`, isAbnormal: false });
          }
          if (vital.height?.value) {
            vitalParts.push({ text: `Größe: ${vital.height.value} ${vital.height.unit}`, isAbnormal: false });
          }
          if (vital.bmi) {
            const bmiAbnormal = isVitalValueAbnormal('bmi', vital.bmi);
            vitalParts.push({ text: `BMI: ${vital.bmi}`, isAbnormal: bmiAbnormal });
            if (bmiAbnormal) hasAbnormalValues = true;
          }
          if (vital.painScale?.value !== undefined && vital.painScale?.value !== null && vital.painScale?.value !== '') {
            vitalParts.push({ text: `Schmerz (${vital.painScale.type}): ${vital.painScale.value}`, isAbnormal: false });
          }

          const description = vitalParts.length > 0 ? vitalParts.map(p => p.text).join(', ') : 'Vitalwerte erfasst';
          
          entries.push({
            id: `vital-${vital._id || vital.id}`,
            type: 'vital',
            date: new Date(vital.recordedAt || vital.createdAt || new Date()),
            title: 'Vitalwerte',
            description: description,
            status: hasAbnormalValues ? 'abnormal' : 'normal',
            doctor: vital.recordedBy ? (typeof vital.recordedBy === 'object' ? `${vital.recordedBy.firstName || ''} ${vital.recordedBy.lastName || ''}`.trim() : vital.recordedBy) : undefined,
            metadata: {
              ...vital,
              vitalParts: vitalParts // Speichere die formatierten Teile mit Abnormal-Flags
            }
          });
        });
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Vitalwerten:', error);
      }

      // Sortiere chronologisch (neueste zuerst)
      entries.sort((a, b) => b.date.getTime() - a.date.getTime());

      setEpaEntries(entries);
    } catch (error) {
      console.error('Fehler beim Erstellen der EPA-Einträge:', error);
      setEpaEntries([]);
    }
  }, [patientId, appointments, dekursEntries, patientDiagnoses, documents, laborResults, dicomStudies, photos, vitalSigns, patient]);

  // Funktion zum rekursiven Durchsuchen aller Felder eines Objekts
  const searchInObject = (obj: any, searchTerm: string): boolean => {
    if (!obj || !searchTerm) {
      return false;
    }
    
    const searchLower = searchTerm.toLowerCase();
    
    // Durchsuche alle Eigenschaften des Objekts
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        // Überspringe bestimmte Felder, die nicht durchsucht werden sollen
        if (key === '_id' || key === '__v' || key === 'id') {
          continue;
        }
        
        // Wenn der Wert ein String ist, suche darin
        if (typeof value === 'string' && value.toLowerCase().includes(searchLower)) {
          return true;
        }
        
        // Wenn der Wert ein Array ist, durchsuche jedes Element
        if (Array.isArray(value)) {
          for (const item of value) {
            if (searchInObject(item, searchTerm)) {
              return true;
            }
          }
        }
        
        // Wenn der Wert ein Objekt ist, durchsuche es rekursiv
        if (typeof value === 'object' && value !== null) {
          if (searchInObject(value, searchTerm)) {
            return true;
          }
        }
        
        // Wenn der Wert eine Zahl ist, konvertiere zu String und suche
        if (typeof value === 'number') {
          if (value.toString().includes(searchTerm)) {
            return true;
          }
        }
      }
    }
    
    return false;
  };

  // Filtere Einträge
  const filteredEntries = React.useMemo(() => {
    try {
      if (!epaEntries || !Array.isArray(epaEntries)) {
        return [];
      }
      return epaEntries.filter(entry => {
        if (!entry) {
          return false;
        }
        try {
          // Erweiterte Suche: Durchsuche alle Felder des Eintrags
          let matchesSearch = true;
          if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            
            // Suche in den Standardfeldern
            const titleMatch = entry.title && entry.title.toLowerCase().includes(searchLower);
            const descriptionMatch = entry.description && entry.description.toLowerCase().includes(searchLower);
            const statusMatch = entry.status && entry.status.toLowerCase().includes(searchLower);
            const doctorMatch = entry.doctor && entry.doctor.toLowerCase().includes(searchLower);
            
            // Suche in den Metadaten (alle Felder des ursprünglichen Objekts)
            const metadataMatch = entry.metadata && searchInObject(entry.metadata, searchTerm);
            
            matchesSearch = titleMatch || descriptionMatch || statusMatch || doctorMatch || metadataMatch;
          }
          
          const matchesType = filterType === 'all' || entry.type === filterType;

          return matchesSearch && matchesType;
        } catch (error) {
          console.error('Fehler beim Filtern eines Eintrags:', error);
          return false;
        }
      });
    } catch (error) {
      console.error('Fehler beim Filtern der Einträge:', error);
      return [];
    }
  }, [epaEntries, searchTerm, filterType]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <CalendarToday />;
      case 'dekurs': return <Assignment />;
      case 'diagnosis': return <LocalHospital />;
      case 'medication': return <Medication />;
      case 'labor': return <Science />;
      case 'dicom': return <Image />;
      case 'document': return <Description />;
      case 'photo': return <PhotoCamera />;
      case 'vital': return <MonitorHeart />;
      default: return <Description />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'appointment': return 'Termin';
      case 'dekurs': return 'Dekurs';
      case 'diagnosis': return 'Diagnose';
      case 'medication': return 'Medikation';
      case 'labor': return 'Labor';
      case 'dicom': return 'DICOM';
      case 'document': return 'Dokument';
      case 'photo': return 'Foto';
      case 'vital': return 'Vitalwerte';
      default: return type;
    }
  };

  const getTypeColor = (type: string): 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
    switch (type) {
      case 'appointment': return 'primary';
      case 'dekurs': return 'info';
      case 'diagnosis': return 'error';
      case 'medication': return 'warning';
      case 'labor': return 'success';
      case 'dicom': return 'secondary';
      case 'document': return 'primary';
      case 'photo': return 'secondary';
      case 'vital': return 'warning';
      default: return 'primary';
    }
  };

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (date: Date) => {
    return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
  };

  // Funktion zum Prüfen, ob ein Vitalwert außerhalb der Norm ist
  const isVitalValueAbnormal = (type: string, value: number, unit?: string): boolean => {
    switch (type) {
      case 'bloodPressure_systolic':
        return value >= 130; // Hypertonie
      case 'bloodPressure_diastolic':
        return value >= 90; // Hypertonie
      case 'pulse':
        return value < 60 || value > 100; // Bradykardie oder Tachykardie
      case 'respiratoryRate':
        return value < 12 || value > 20; // Zu niedrig oder zu hoch
      case 'temperature':
        const tempCelsius = unit === 'fahrenheit' ? (value - 32) * 5/9 : value;
        return tempCelsius < 35 || tempCelsius >= 38; // Hypothermie oder Fieber
      case 'oxygenSaturation':
        return value < 95; // Hypoxie
      case 'bloodGlucose':
        // Normal nüchtern: 70-100 mg/dL, postprandial <140 mg/dL
        // Wir prüfen auf nüchtern-Werte (konservativer Ansatz)
        return value < 70 || value > 100;
      case 'bmi':
        return value < 18.5 || value >= 25; // Untergewicht oder Übergewicht
      default:
        return false;
    }
  };

  // Funktion zum Erstellen einer formatierten Vitalwert-Anzeige mit Markierung
  const formatVitalValue = (label: string, value: number | string, type: string, unit?: string): { text: string; isAbnormal: boolean } => {
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(numValue)) {
      return { text: `${label}: ${value}`, isAbnormal: false };
    }
    const isAbnormal = isVitalValueAbnormal(type, numValue, unit);
    return { text: `${label}: ${value}${unit ? ` ${unit}` : ''}`, isAbnormal };
  };

  // Gruppiere Einträge nach Datum und Typ (muss vor bedingtem Return sein)
  const groupedEntries = React.useMemo(() => {
    try {
      const groups: Record<string, EPAEntry[]> = {};
      if (!filteredEntries || !Array.isArray(filteredEntries)) {
        return groups;
      }
      filteredEntries.forEach(entry => {
        try {
          if (!entry || !entry.date) {
            return;
          }
          const dateKey = format(entry.date, 'dd.MM.yyyy', { locale: de });
          if (!groups[dateKey]) {
            groups[dateKey] = [];
          }
          groups[dateKey].push(entry);
        } catch (error) {
          console.error('Fehler beim Gruppieren eines Eintrags:', error);
        }
      });
      return groups;
    } catch (error) {
      console.error('Fehler beim Gruppieren der Einträge:', error);
      return {};
    }
  }, [filteredEntries]);

  // Gruppiere Einträge desselben Typs am selben Tag
  const groupEntriesByType = React.useMemo(() => {
    try {
      const result: Record<string, GroupedEPAEntry[]> = {};
      
      Object.keys(groupedEntries).forEach(dateKey => {
        try {
          const entries = groupedEntries[dateKey];
          if (!entries || !Array.isArray(entries)) {
            return;
          }
          
          const typeGroups: Record<string, EPAEntry[]> = {};
          
          // Gruppiere nach Typ
          entries.forEach(entry => {
            if (!entry || !entry.type) {
              return;
            }
            const typeKey = entry.type;
            if (!typeGroups[typeKey]) {
              typeGroups[typeKey] = [];
            }
            typeGroups[typeKey].push(entry);
          });
          
          // Erstelle GroupedEPAEntry für jeden Typ
          const groupedEntriesForDate: GroupedEPAEntry[] = [];
          Object.keys(typeGroups).forEach(typeKey => {
            try {
              const typeEntries = typeGroups[typeKey];
              if (!typeEntries || typeEntries.length === 0) {
                return;
              }
              
              const firstEntry = typeEntries[0];
              if (!firstEntry) {
                return;
              }
              
              // Wenn mehr als 1 Eintrag, gruppiere sie
              if (typeEntries.length > 1) {
                groupedEntriesForDate.push({
                  id: `grouped-${dateKey}-${typeKey}`,
                  type: firstEntry.type as any,
                  date: firstEntry.date,
                  title: `${typeEntries.length} ${getTypeLabel(typeKey)}`,
                  description: typeEntries.map(e => e?.title || '').filter(Boolean).join(', '),
                  status: firstEntry.status,
                  doctor: firstEntry.doctor,
                  count: typeEntries.length,
                  entries: typeEntries,
                  isGrouped: true,
                  metadata: firstEntry.metadata
                });
              } else {
                // Einzelner Eintrag
                groupedEntriesForDate.push({
                  id: firstEntry.id,
                  type: firstEntry.type as any,
                  date: firstEntry.date,
                  title: firstEntry.title,
                  description: firstEntry.description,
                  status: firstEntry.status,
                  doctor: firstEntry.doctor,
                  count: 1,
                  entries: [firstEntry],
                  isGrouped: false,
                  metadata: firstEntry.metadata
                });
              }
            } catch (error) {
              console.error('Fehler beim Erstellen eines GroupedEPAEntry:', error);
            }
          });
          result[dateKey] = groupedEntriesForDate;
        } catch (error) {
          console.error(`Fehler beim Verarbeiten von Einträgen für Datum ${dateKey}:`, error);
        }
      });
      
      return result;
    } catch (error) {
      console.error('Fehler in groupEntriesByType:', error);
      return {};
    }
  }, [groupedEntries]);

  const sortedDates = React.useMemo(() => {
    try {
      if (!groupedEntries || typeof groupedEntries !== 'object') {
        return [];
      }
      return Object.keys(groupedEntries).sort((a, b) => {
        try {
          const dateA = new Date(a.split('.').reverse().join('-'));
          const dateB = new Date(b.split('.').reverse().join('-'));
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
            return 0;
          }
          return dateB.getTime() - dateA.getTime();
        } catch (error) {
          console.error('Fehler beim Sortieren von Datum:', error);
          return 0;
        }
      });
    } catch (error) {
      console.error('Fehler beim Sortieren der Daten:', error);
      return [];
    }
  }, [groupedEntries]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Wrapper für den gesamten Render-Teil mit Fehlerbehandlung
  try {
    return (
      <Box>
      {/* Filter und Suche */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="Suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Typ</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Typ"
            >
              <MenuItem value="all">Alle</MenuItem>
              <MenuItem value="appointment">Termine</MenuItem>
              <MenuItem value="dekurs">Dekurs</MenuItem>
              <MenuItem value="diagnosis">Diagnosen</MenuItem>
              <MenuItem value="medication">Medikation</MenuItem>
              <MenuItem value="labor">Laborwerte</MenuItem>
              <MenuItem value="dicom">DICOM</MenuItem>
              <MenuItem value="document">Dokumente</MenuItem>
              <MenuItem value="photo">Fotos</MenuItem>
              <MenuItem value="vital">Vitalwerte</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Gruppierte Darstellung nach Datum */}
      {sortedDates.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Alert severity="info">Keine Einträge gefunden</Alert>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {sortedDates.map((dateKey) => {
            try {
              const entries = (groupedEntries && groupedEntries[dateKey]) || [];
              const groupedEntriesForDate = (groupEntriesByType && groupEntriesByType[dateKey]) || [];
              const isExpanded = expandedRows.has(`date-${dateKey}`);
              const shouldBeExpanded = isExpanded || sortedDates.indexOf(dateKey) < 5;
              
              return (
              <Card key={dateKey} variant="outlined">
                <CardContent sx={{ p: 0 }}>
                  {/* Datum-Header */}
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleRowExpansion(`date-${dateKey}`)}
                  >
                    <Typography variant="h6" fontWeight="bold">
                      {dateKey}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={`${entries.length} Einträge`}
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                      />
                      <IconButton size="small" sx={{ color: 'white' }}>
                        {shouldBeExpanded ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Einträge für dieses Datum */}
                  <Collapse in={shouldBeExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ p: 2 }}>
                      <Stack spacing={1.5}>
                        {groupedEntriesForDate.map((groupedEntry) => {
                          if (!groupedEntry || !groupedEntry.type) {
                            return null;
                          }
                          
                          const handleClick = (e: React.MouseEvent) => {
                            try {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              if (!patientId || !groupedEntry) {
                                return;
                              }
                              
                              // Bestimme Tab-Index basierend auf dem Typ
                              let tabIndex: number | null = null;
                              let documentId: string | null = null;
                              
                              switch (groupedEntry.type) {
                                case 'appointment':
                                  tabIndex = 8; // Termine
                                  break;
                                case 'dekurs':
                                  tabIndex = 1; // Dekurs
                                  break;
                                case 'diagnosis':
                                  tabIndex = 3; // Diagnosen
                                  break;
                                case 'medication':
                                  tabIndex = 2; // Medizinisch
                                  break;
                                case 'dicom':
                                  tabIndex = 6; // DICOM
                                  break;
                                case 'labor':
                                  tabIndex = 5; // Laborwerte
                                  break;
                                case 'document':
                                  // Wenn es ein einzelnes Dokument ist, versuche zur Dokumenten-ID zu navigieren
                                  if (!groupedEntry.isGrouped && groupedEntry.entries?.[0]?.metadata?._id) {
                                    documentId = groupedEntry.entries[0].metadata._id;
                                  } else {
                                    tabIndex = 7; // Dokumente
                                  }
                                  break;
                                case 'photo':
                                  tabIndex = 9; // Fotos
                                  break;
                                case 'vital':
                                  tabIndex = 4; // Vitalwerte
                                  break;
                                default:
                                  return;
                              }
                              
                              // Wenn es ein Dokument ist, navigiere direkt dorthin
                              if (documentId) {
                                if (onNavigate) {
                                  onNavigate(`/documents/${documentId}`);
                                } else {
                                  window.location.href = `/documents/${documentId}`;
                                }
                                return;
                              }
                              
                              // Verwende onTabChange wenn verfügbar (schneller und sicherer)
                              if (onTabChange && tabIndex !== null) {
                                // Kleine Verzögerung, um sicherzustellen, dass der Click-Event vollständig verarbeitet wurde
                                setTimeout(() => {
                                  onTabChange(tabIndex!);
                                }, 10);
                              } else if (onNavigate && tabIndex !== null) {
                                // Fallback: Verwende onNavigate
                                // Tab-Namen müssen mit dem Tab-Mapping in PatientOrganizer.tsx übereinstimmen
                                const tabNames = ['epa', 'dekurs', 'medizinisch', 'diagnosen', 'vitalwerte', 'labor', 'dicom', 'dokumente', 'termine', 'fotos', 'stammdaten'];
                                const tabName = tabNames[tabIndex];
                                if (tabName) {
                                  setTimeout(() => {
                                    onNavigate(`/patients/${patientId}?tab=${tabName}`);
                                  }, 10);
                                }
                              }
                            } catch (error) {
                              console.error('Fehler beim Navigieren:', error);
                            }
                          };

                          return (
                            <Paper
                              key={groupedEntry.id}
                              variant="outlined"
                              sx={{
                                p: 1.5,
                                cursor: 'pointer',
                                '&:hover': { 
                                  bgcolor: 'action.hover',
                                  transform: 'translateX(4px)',
                                  transition: 'all 0.2s'
                                },
                                borderLeft: `4px solid`,
                                borderLeftColor: groupedEntry.type === 'appointment' ? 'primary.main' :
                                              groupedEntry.type === 'dekurs' ? 'info.main' :
                                              groupedEntry.type === 'diagnosis' ? 'error.main' :
                                              groupedEntry.type === 'medication' ? 'warning.main' :
                                              groupedEntry.type === 'labor' ? 'success.main' :
                                              groupedEntry.type === 'dicom' ? 'secondary.main' :
                                              'grey.400'
                              }}
                              onClick={handleClick}
                            >
                              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                <Box sx={{ pt: 0.5 }}>
                                  {getTypeIcon(groupedEntry.type)}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                    <Chip
                                      label={getTypeLabel(groupedEntry.type)}
                                      size="small"
                                      color={getTypeColor(groupedEntry.type)}
                                      variant="outlined"
                                      sx={{ height: 24 }}
                                    />
                                    {groupedEntry.date && (
                                      <Typography variant="caption" color="text.secondary">
                                        {format(new Date(groupedEntry.date), 'HH:mm', { locale: de })}
                                      </Typography>
                                    )}
                                    {groupedEntry.isGrouped && (
                                      <Chip
                                        icon={<ExpandMore />}
                                        label={`${groupedEntry.count} Einträge`}
                                        size="small"
                                        color="info"
                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                      />
                                    )}
                                    {groupedEntry.status && (
                                      <Chip
                                        label={groupedEntry.status}
                                        size="small"
                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                        color={groupedEntry.status === 'abgeschlossen' || groupedEntry.status === 'finalized' ? 'success' : 'default'}
                                      />
                                    )}
                                  </Stack>
                                  <Typography variant="body2" fontWeight="medium" sx={{ mt: 0.5 }}>
                                    {groupedEntry.title}
                                  </Typography>
                                  {groupedEntry.description && (
                                    <Box sx={{ mt: 0.5 }}>
                                      {groupedEntry.isGrouped ? (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                          {(groupedEntry.entries || []).slice(0, 3).map(e => e?.title || '').filter(Boolean).join(', ')}{(groupedEntry.count || 0) > 3 ? '...' : ''}
                                        </Typography>
                                      ) : groupedEntry.type === 'vital' && groupedEntry.metadata?.vitalParts ? (
                                        // Spezielle Anzeige für Vitalwerte mit Markierung
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                          {groupedEntry.metadata.vitalParts.map((part: { text: string; isAbnormal: boolean }, index: number) => (
                                            <Typography
                                              key={index}
                                              variant="caption"
                                              sx={{
                                                display: 'inline-block',
                                                px: 0.75,
                                                py: 0.25,
                                                borderRadius: 1,
                                                bgcolor: part.isAbnormal ? '#fff3cd' : 'transparent', // Gelber/Amber Hintergrund für besseren Kontrast
                                                color: part.isAbnormal ? '#856404' : 'text.secondary', // Dunkler Text auf gelbem Hintergrund
                                                fontWeight: part.isAbnormal ? 600 : 400,
                                                border: part.isAbnormal ? '1px solid #ffc107' : 'none' // Optional: Roter Rahmen für zusätzliche Betonung
                                              }}
                                            >
                                              {part.text}
                                            </Typography>
                                          ))}
                                        </Box>
                                      ) : (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                          {(groupedEntry.description || '').length > 150 
                                            ? `${(groupedEntry.description || '').substring(0, 150)}...` 
                                            : (groupedEntry.description || '')}
                                        </Typography>
                                      )}
                                    </Box>
                                  )}
                                  {/* Termin-Details */}
                                  {!groupedEntry.isGrouped && groupedEntry.type === 'appointment' && groupedEntry.metadata && (
                                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                      {groupedEntry.metadata.reason && (
                                        <Typography variant="caption" color="text.secondary">
                                          <strong>Grund:</strong> {groupedEntry.metadata.reason}
                                        </Typography>
                                      )}
                                      {groupedEntry.metadata.startTime && groupedEntry.metadata.endTime && (
                                        <Typography variant="caption" color="text.secondary">
                                          <strong>Zeit:</strong> {format(new Date(groupedEntry.metadata.startTime), 'HH:mm', { locale: de })} - {format(new Date(groupedEntry.metadata.endTime), 'HH:mm', { locale: de })}
                                        </Typography>
                                      )}
                                      {groupedEntry.metadata.duration && (
                                        <Typography variant="caption" color="text.secondary">
                                          <strong>Dauer:</strong> {groupedEntry.metadata.duration} Min.
                                        </Typography>
                                      )}
                                      {groupedEntry.metadata.roomName && (
                                        <Typography variant="caption" color="text.secondary">
                                          <strong>Raum:</strong> {groupedEntry.metadata.roomName}
                                        </Typography>
                                      )}
                                      {groupedEntry.metadata.service?.name && (
                                        <Typography variant="caption" color="text.secondary">
                                          <strong>Leistung:</strong> {groupedEntry.metadata.service.name}
                                        </Typography>
                                      )}
                                      {groupedEntry.metadata.type && (
                                        <Typography variant="caption" color="text.secondary">
                                          <strong>Art:</strong> {groupedEntry.metadata.type}
                                        </Typography>
                                      )}
                                      {groupedEntry.metadata.bookingType && (
                                        <Typography variant="caption" color="text.secondary">
                                          <strong>Buchungsart:</strong> {
                                            groupedEntry.metadata.bookingType === 'online' ? 'Online' :
                                            groupedEntry.metadata.bookingType === 'internal' ? 'Intern' :
                                            groupedEntry.metadata.bookingType === 'phone' ? 'Telefon' :
                                            groupedEntry.metadata.bookingType === 'walk_in' ? 'Walk-in' :
                                            groupedEntry.metadata.bookingType
                                          }
                                        </Typography>
                                      )}
                                      {groupedEntry.metadata.priority && (
                                        <Typography variant="caption" color="text.secondary">
                                          <strong>Priorität:</strong> {
                                            groupedEntry.metadata.priority === 'urgent' ? 'Dringend' :
                                            groupedEntry.metadata.priority === 'high' ? 'Hoch' :
                                            groupedEntry.metadata.priority === 'normal' ? 'Normal' :
                                            groupedEntry.metadata.priority
                                          }
                                        </Typography>
                                      )}
                                      {groupedEntry.metadata.notes && (
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                          <strong>Notizen:</strong> {groupedEntry.metadata.notes.length > 200 
                                            ? `${groupedEntry.metadata.notes.substring(0, 200)}...` 
                                            : groupedEntry.metadata.notes}
                                        </Typography>
                                      )}
                                    </Box>
                                  )}
                                  {groupedEntry.doctor && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                      Arzt: {groupedEntry.doctor}
                                    </Typography>
                                  )}
                                  {groupedEntry.isGrouped && (
                                    <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                                      Klicken Sie hier, um alle {groupedEntry.count} Einträge anzuzeigen
                                    </Typography>
                                  )}
                                  {!groupedEntry.isGrouped && (
                                    <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', opacity: 0.7 }}>
                                      Klicken Sie hier, um Details anzuzeigen
                                    </Typography>
                                  )}
                                </Box>
                              </Stack>
                            </Paper>
                          );
                        })}
                      </Stack>
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
              );
            } catch (dateError) {
              console.error(`Fehler beim Rendern von Datum ${dateKey}:`, dateError);
              return null;
            }
          })}
        </Stack>
      )}

      {/* Zusammenfassung */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2">
            Zusammenfassung
          </Typography>
          {(vitalSigns || []).length > 0 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ShowChart />}
              onClick={() => setVitalSignsChartOpen(true)}
            >
              Vitalwerte-Verlauf anzeigen
            </Button>
          )}
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label={`Gesamt: ${(epaEntries || []).length}`} size="small" />
          <Chip label={`Termine: ${(epaEntries || []).filter(e => e?.type === 'appointment').length}`} size="small" color="primary" />
          <Chip label={`Dekurs: ${(epaEntries || []).filter(e => e?.type === 'dekurs').length}`} size="small" color="info" />
          <Chip label={`Diagnosen: ${(epaEntries || []).filter(e => e?.type === 'diagnosis').length}`} size="small" color="error" />
          <Chip label={`Medikation: ${(epaEntries || []).filter(e => e?.type === 'medication').length}`} size="small" color="warning" />
          <Chip label={`Labor: ${(epaEntries || []).filter(e => e?.type === 'labor').length}`} size="small" color="success" />
          <Chip label={`DICOM: ${(epaEntries || []).filter(e => e?.type === 'dicom').length}`} size="small" color="secondary" />
          <Chip label={`Dokumente: ${(epaEntries || []).filter(e => e?.type === 'document').length}`} size="small" />
          <Chip label={`Fotos: ${(epaEntries || []).filter(e => e?.type === 'photo').length}`} size="small" />
          <Chip label={`Vitalwerte: ${(epaEntries || []).filter(e => e?.type === 'vital').length}`} size="small" color="warning" />
        </Stack>
      </Paper>

      {/* Vitalwerte-Chart Dialog */}
      <Dialog
        open={vitalSignsChartOpen}
        onClose={() => setVitalSignsChartOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Vitalwerte-Verlauf</Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={() => setVitalSignsChartOpen(false)}
              aria-label="close"
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <VitalSignsChart vitalSigns={vitalSigns || []} patientId={patientId} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVitalSignsChartOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Box>
    );
  } catch (renderError) {
    console.error('Fehler beim Rendern der PatientEPA:', renderError);
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">
          Ein Fehler ist beim Anzeigen der ePA aufgetreten. Bitte versuchen Sie, die Seite neu zu laden.
        </Alert>
      </Paper>
    );
  }
};

export default PatientEPA;

