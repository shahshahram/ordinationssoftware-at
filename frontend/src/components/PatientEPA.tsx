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
  CardContent
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
  MonitorHeart
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

  const [epaEntries, setEpaEntries] = useState<EPAEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [laborResults, setLaborResults] = useState<any[]>([]);
  const [dicomStudies, setDicomStudies] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);

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
        (appointments || []).forEach((apt: any) => {
          if (apt.patient === patientId || apt.patientId === patientId) {
            entries.push({
              id: `appointment-${apt._id}`,
              type: 'appointment',
              date: new Date(apt.startTime || apt.date),
              title: apt.title || apt.service?.name || apt.type || 'Termin',
              description: apt.reason || apt.notes || apt.description,
              status: apt.status,
              doctor: apt.doctor ? (typeof apt.doctor === 'object' ? `${apt.doctor.firstName || ''} ${apt.doctor.lastName || ''}`.trim() : apt.doctor) : undefined,
              metadata: apt
            });
          }
        });
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

      // Dokumente
      try {
        const docsArray = Array.isArray(documents) ? documents : ((documents as any)?.data || []);
        docsArray.forEach((doc: any) => {
          if (doc.patientId === patientId || doc.patient === patientId) {
            entries.push({
              id: `document-${doc._id}`,
              type: 'document',
              date: new Date(doc.createdAt || doc.date || new Date()),
              title: doc.title || doc.name || 'Dokument',
              description: doc.description || doc.type,
              status: doc.status,
              metadata: doc
            });
          }
        });
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
          const vitalParts: string[] = [];
          
          if (vital.bloodPressure?.systolic && vital.bloodPressure?.diastolic) {
            vitalParts.push(`RR: ${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic} mmHg`);
          }
          if (vital.pulse) {
            vitalParts.push(`Puls: ${vital.pulse} bpm`);
          }
          if (vital.respiratoryRate) {
            vitalParts.push(`AF: ${vital.respiratoryRate} /min`);
          }
          if (vital.temperature?.value) {
            const unit = vital.temperature.unit === 'celsius' ? '°C' : '°F';
            vitalParts.push(`Temp: ${vital.temperature.value} ${unit}`);
          }
          if (vital.oxygenSaturation) {
            vitalParts.push(`SpO2: ${vital.oxygenSaturation}%`);
          }
          if (vital.bloodGlucose?.value) {
            vitalParts.push(`BZ: ${vital.bloodGlucose.value} ${vital.bloodGlucose.unit}`);
          }
          if (vital.weight?.value) {
            vitalParts.push(`Gewicht: ${vital.weight.value} ${vital.weight.unit}`);
          }
          if (vital.height?.value) {
            vitalParts.push(`Größe: ${vital.height.value} ${vital.height.unit}`);
          }
          if (vital.bmi) {
            vitalParts.push(`BMI: ${vital.bmi}`);
          }
          if (vital.painScale?.value !== undefined && vital.painScale?.value !== null && vital.painScale?.value !== '') {
            vitalParts.push(`Schmerz (${vital.painScale.type}): ${vital.painScale.value}`);
          }

          const description = vitalParts.length > 0 ? vitalParts.join(', ') : 'Vitalwerte erfasst';
          
          entries.push({
            id: `vital-${vital._id || vital.id}`,
            type: 'vital',
            date: new Date(vital.recordedAt || vital.createdAt || new Date()),
            title: 'Vitalwerte',
            description: description,
            doctor: vital.recordedBy ? (typeof vital.recordedBy === 'object' ? `${vital.recordedBy.firstName || ''} ${vital.recordedBy.lastName || ''}`.trim() : vital.recordedBy) : undefined,
            metadata: vital
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
  }, [patientId, appointments, dekursEntries, patientDiagnoses, documents, laborResults, dicomStudies, photos, vitalSigns]);

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
          const matchesSearch = !searchTerm || 
            (entry.title && entry.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (entry.description && entry.description.toLowerCase().includes(searchTerm.toLowerCase()));
          
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
                  isGrouped: true
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
                  isGrouped: false
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
                                  tabIndex = 6; // Termine
                                  break;
                                case 'dekurs':
                                  tabIndex = 1; // Dekurs
                                  break;
                                case 'diagnosis':
                                case 'medication':
                                  tabIndex = 5; // Medizinisch
                                  break;
                                case 'dicom':
                                  tabIndex = 3; // DICOM
                                  break;
                                case 'labor':
                                  tabIndex = 2; // Laborwerte
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
                                  tabIndex = 8; // Fotos
                                  break;
                                case 'vital':
                                  tabIndex = 9; // Vitalparameter
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
                                const tabNames = ['epa', 'dekurs', 'laborwerte', 'dicom', 'stammdaten', 'medizinisch', 'termine', 'dokumente', 'fotos'];
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
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                      {groupedEntry.isGrouped 
                                        ? `${(groupedEntry.entries || []).slice(0, 3).map(e => e?.title || '').filter(Boolean).join(', ')}${(groupedEntry.count || 0) > 3 ? '...' : ''}`
                                        : (groupedEntry.description || '').length > 150 
                                          ? `${(groupedEntry.description || '').substring(0, 150)}...` 
                                          : (groupedEntry.description || '')}
                                    </Typography>
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
        <Typography variant="subtitle2" gutterBottom>
          Zusammenfassung
        </Typography>
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

