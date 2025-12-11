import React, { useState, useEffect, useMemo, memo, useRef, useCallback, startTransition } from 'react';
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
  DialogActions,
  useTheme,
  useMediaQuery
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
  Close,
  Warning,
  BugReport,
  PregnantWoman,
  Favorite,
  Healing,
  UnfoldMore,
  UnfoldLess
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAppointmentsByPatientId } from '../store/slices/appointmentSlice';
import { fetchPatientDiagnoses } from '../store/slices/diagnosisSlice';
import { fetchDocuments } from '../store/slices/documentSlice';
import { fetchDekursEntries, resetDekursState } from '../store/slices/dekursSlice';
import { fetchVitalSigns, clearVitalSigns } from '../store/slices/vitalSignsSlice';
import { fetchPatients } from '../store/slices/patientSlice';
import api from '../utils/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import VitalSignsChart from './VitalSignsChart';

interface EPAEntry {
  id: string;
  type: 'appointment' | 'dekurs' | 'diagnosis' | 'medication' | 'labor' | 'dicom' | 'document' | 'photo' | 'vital' | 'allergy' | 'infection' | 'pregnancy' | 'pacemaker' | 'defibrillator' | 'implant' | 'preExistingCondition' | 'medicalHistory' | 'surgery' | 'vaccination' | 'bloodType' | 'anthropometry' | 'smokingStatus';
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
  type: 'appointment' | 'dekurs' | 'diagnosis' | 'medication' | 'labor' | 'dicom' | 'document' | 'photo' | 'vital' | 'allergy' | 'infection' | 'pregnancy' | 'pacemaker' | 'defibrillator' | 'implant' | 'preExistingCondition' | 'medicalHistory' | 'surgery' | 'vaccination' | 'bloodType' | 'anthropometry' | 'smokingStatus';
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

// Separate memoized Komponente für einzelne Datum-Cards
interface EPADateCardProps {
  dateKey: string;
  entries: EPAEntry[];
  groupedEntriesForDate: GroupedEPAEntry[];
  isExpanded: boolean;
  onToggle: (dateKey: string) => void;
  patientId: string;
  onNavigate?: (path: string) => void;
  onTabChange?: (tabIndex: number) => void;
  getTypeIcon: (type: string) => React.ReactNode;
  getTypeLabel: (type: string) => string;
  getTypeColor: (type: string) => "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";
}

const EPADateCard = memo(({ 
  dateKey, 
  entries, 
  groupedEntriesForDate, 
  isExpanded, 
  onToggle,
  patientId,
  onNavigate,
  onTabChange,
  getTypeIcon,
  getTypeLabel,
  getTypeColor
}: EPADateCardProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle(`date-${dateKey}`);
  };

  return (
    <Card 
      key={`epa-date-${dateKey}`} 
      variant="outlined"
      sx={{
        transition: 'none',
        willChange: 'auto',
        contain: 'layout style paint',
        transform: 'translateZ(0)', // GPU-Beschleunigung
      }}
    >
      <CardContent sx={{ p: 0 }}>
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
          onClick={handleClick}
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
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={isExpanded} timeout={0} unmountOnExit={false} sx={{ 
          overflow: 'hidden',
          willChange: 'auto',
          contain: 'layout style paint'
        }}>
          <Box 
            key={`epa-content-${dateKey}`}
            sx={{ 
              p: 2,
              display: 'block',
              willChange: 'auto',
              contain: 'layout style paint'
            }}
          >
            <Stack spacing={1.5}>
              {groupedEntriesForDate.map((groupedEntry) => {
                if (!groupedEntry || !groupedEntry.type) {
                  return null;
                }
                
                const handleEntryClick = (e: React.MouseEvent) => {
                  try {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (!patientId || !groupedEntry) {
                      return;
                    }
                    
                    let tabIndex: number | null = null;
                    let documentId: string | null = null;
                    
                    switch (groupedEntry.type) {
                      case 'appointment':
                        tabIndex = 8;
                        break;
                      case 'dekurs':
                        tabIndex = 1;
                        break;
                      case 'diagnosis':
                        tabIndex = 3;
                        break;
                      case 'medication':
                      case 'allergy':
                      case 'infection':
                      case 'pregnancy':
                      case 'pacemaker':
                      case 'defibrillator':
                      case 'implant':
                      case 'preExistingCondition':
                      case 'medicalHistory':
                      case 'surgery':
                      case 'vaccination':
                      case 'bloodType':
                      case 'anthropometry':
                      case 'smokingStatus':
                        tabIndex = 2;
                        break;
                      case 'dicom':
                        tabIndex = 6;
                        break;
                      case 'labor':
                        tabIndex = 5;
                        break;
                      case 'document':
                        if (!groupedEntry.isGrouped && groupedEntry.entries?.[0]?.metadata?._id) {
                          documentId = groupedEntry.entries[0].metadata._id;
                        } else {
                          tabIndex = 7;
                        }
                        break;
                      case 'photo':
                        tabIndex = 9;
                        break;
                      case 'vital':
                        tabIndex = 4;
                        break;
                      default:
                        return;
                    }
                    
                    if (documentId) {
                      if (onNavigate) {
                        onNavigate(`/documents/${documentId}`);
                      } else {
                        window.location.href = `/documents/${documentId}`;
                      }
                      return;
                    }
                    
                    if (onTabChange && tabIndex !== null) {
                      setTimeout(() => {
                        onTabChange(tabIndex!);
                      }, 10);
                    } else if (onNavigate && tabIndex !== null) {
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
                      willChange: 'auto',
                      contain: 'layout style paint',
                      '&:hover': { 
                        bgcolor: 'action.hover',
                        transform: 'translateX(4px)',
                        transition: 'none' // Deaktiviere Transition für bessere Scroll-Performance
                      },
                      borderLeft: `4px solid`,
                      borderLeftColor: groupedEntry.type === 'appointment' ? 'primary.main' :
                                    groupedEntry.type === 'dekurs' ? 'info.main' :
                                    groupedEntry.type === 'diagnosis' ? 'error.main' :
                                    groupedEntry.type === 'medication' ? 'warning.main' :
                                    groupedEntry.type === 'labor' ? 'success.main' :
                                    groupedEntry.type === 'dicom' ? 'secondary.main' :
                                    groupedEntry.type === 'allergy' ? 'error.main' :
                                    groupedEntry.type === 'infection' ? 'error.main' :
                                    groupedEntry.type === 'pregnancy' ? 'info.main' :
                                    groupedEntry.type === 'pacemaker' ? 'secondary.main' :
                                    groupedEntry.type === 'defibrillator' ? 'secondary.main' :
                                    groupedEntry.type === 'implant' ? 'info.main' :
                                    groupedEntry.type === 'preExistingCondition' ? 'error.main' :
                                    groupedEntry.type === 'medicalHistory' ? 'info.main' :
                                    groupedEntry.type === 'surgery' ? 'error.main' :
                                    groupedEntry.type === 'vaccination' ? 'success.main' :
                                    groupedEntry.type === 'bloodType' ? 'warning.main' :
                                    groupedEntry.type === 'anthropometry' ? 'info.main' :
                                    groupedEntry.type === 'smokingStatus' ? 'warning.main' :
                                    'grey.400'
                    }}
                    onClick={handleEntryClick}
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
                                      bgcolor: part.isAbnormal ? '#fff3cd' : 'transparent',
                                      color: part.isAbnormal ? '#856404' : 'text.secondary',
                                      fontWeight: part.isAbnormal ? 600 : 400,
                                      border: part.isAbnormal ? '1px solid #ffc107' : 'none'
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
}, (prevProps, nextProps) => {
  // Optimierte comparison function für React.memo
  // Schnelle Prüfungen zuerst für bessere Performance
  
  // Prüfe einfache Props
  if (prevProps.dateKey !== nextProps.dateKey) return false;
  if (prevProps.isExpanded !== nextProps.isExpanded) return false;
  if (prevProps.patientId !== nextProps.patientId) return false;
  
  // Prüfe Längen (schnell)
  if (prevProps.entries.length !== nextProps.entries.length) return false;
  if (prevProps.groupedEntriesForDate.length !== nextProps.groupedEntriesForDate.length) return false;
  
  // Nur wenn Längen gleich sind, prüfe IDs (teurer)
  // Verwende Set für O(1) Lookup statt O(n) Array-Operationen
  if (prevProps.entries.length > 0) {
    const prevEntryIds = new Set(prevProps.entries.map(e => e.id));
    const nextEntryIds = new Set(nextProps.entries.map(e => e.id));
    if (prevEntryIds.size !== nextEntryIds.size) return false;
    // Prüfe ob alle IDs in beiden Sets vorhanden sind
    const allIdsMatch = Array.from(prevEntryIds).every(id => nextEntryIds.has(id));
    if (!allIdsMatch) return false;
  }
  
  if (prevProps.groupedEntriesForDate.length > 0) {
    const prevGroupedIds = new Set(prevProps.groupedEntriesForDate.map(e => e.id));
    const nextGroupedIds = new Set(nextProps.groupedEntriesForDate.map(e => e.id));
    if (prevGroupedIds.size !== nextGroupedIds.size) return false;
    // Prüfe ob alle IDs in beiden Sets vorhanden sind
    const allGroupedIdsMatch = Array.from(prevGroupedIds).every(id => nextGroupedIds.has(id));
    if (!allGroupedIdsMatch) return false;
  }
  
  // Alle relevanten Props sind gleich, kein Re-Render nötig
  return true;
});

EPADateCard.displayName = 'EPADateCard';

const PatientEPA: React.FC<PatientEPAProps> = ({ patientId, onNavigate, onTabChange }) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const { appointments, loading: appointmentsLoading } = useAppSelector((state) => state.appointments);
  const { patientDiagnoses, loading: diagnosesLoading } = useAppSelector((state) => state.diagnoses);
  const { documents, loading: documentsLoading } = useAppSelector((state) => state.documents);
  const { entries: dekursEntries, loading: dekursLoading } = useAppSelector((state) => state.dekurs);
  const { vitalSigns, loading: vitalSignsLoading } = useAppSelector((state) => state.vitalSigns);
  const { patients } = useAppSelector((state) => state.patients);
  
  // Finde den aktuellen Patienten im Redux Store
  // WICHTIG: Erstelle ein neues Objekt, damit React Änderungen erkennt
  const patientFromStore = React.useMemo(() => {
    if (!patientId || !patients || !Array.isArray(patients)) return null;
    const found = patients.find((p: any) => (p._id || p.id) === patientId);
    if (!found) return null;
    // Erstelle ein neues Objekt, damit React Änderungen erkennt, auch wenn die Referenz gleich bleibt
    return { ...found };
  }, [patientId, patients]);
  
  // Extrahiere updatedAt separat, damit der useEffect auf Änderungen reagiert
  const patientFromStoreUpdatedAt = patientFromStore?.updatedAt;
  
  // Ref um die letzte bekannte Version von patientFromStore zu speichern (für Vergleich)
  const lastPatientFromStoreRef = useRef<any>(null);
  
  // Memoize JSON-Stringified Werte für Performance
  const patientDataHash = useMemo(() => {
    if (!patientFromStore) return '';
    return JSON.stringify({
      infections: patientFromStore.infections || [],
      allergies: patientFromStore.allergies || [],
      currentMedications: patientFromStore.currentMedications || [],
      preExistingConditions: patientFromStore.preExistingConditions || [],
      medicalHistory: patientFromStore.medicalHistory || [],
      previousSurgeries: patientFromStore.previousSurgeries || [],
      vaccinations: patientFromStore.vaccinations || [],
      bloodType: patientFromStore.bloodType,
      height: patientFromStore.height,
      weight: patientFromStore.weight,
      bmi: patientFromStore.bmi,
      smokingStatus: patientFromStore.smokingStatus,
      hasPacemaker: patientFromStore.hasPacemaker,
      hasDefibrillator: patientFromStore.hasDefibrillator,
      implants: patientFromStore.implants || [],
      isPregnant: patientFromStore.isPregnant
    });
  }, [
    patientFromStore?.infections,
    patientFromStore?.allergies,
    patientFromStore?.currentMedications,
    patientFromStore?.preExistingConditions,
    patientFromStore?.medicalHistory,
    patientFromStore?.previousSurgeries,
    patientFromStore?.vaccinations,
    patientFromStore?.bloodType,
    patientFromStore?.height,
    patientFromStore?.weight,
    patientFromStore?.bmi,
    patientFromStore?.smokingStatus,
    patientFromStore?.hasPacemaker,
    patientFromStore?.hasDefibrillator,
    patientFromStore?.implants,
    patientFromStore?.isPregnant
  ]);
  
  // Debug: Logge Änderungen von patientFromStore und prüfe auf Datenänderungen
  useEffect(() => {
    if (patientFromStore) {
      const previousHash = lastPatientFromStoreRef.current?.dataHash || '';
      const hasDataChanged = previousHash !== '' && previousHash !== patientDataHash;
      
      console.log('🔍 patientFromStore geändert:', {
        patientId: patientFromStore._id || patientFromStore.id,
        updatedAt: patientFromStore.updatedAt,
        infections: patientFromStore.infections?.length || 0,
        hasDataChanged: hasDataChanged || !lastPatientFromStoreRef.current,
        previousUpdatedAt: lastPatientFromStoreRef.current?.updatedAt
      });
      
      // Speichere die aktuelle Version für den nächsten Vergleich
      lastPatientFromStoreRef.current = { ...patientFromStore, dataHash: patientDataHash };
    }
  }, [patientDataHash, patientFromStore?._id]);

  // Ref to track if initial expansion has been done
  const initializedRef = useRef(false);
  const prevDataHashRef = useRef<string>('');
  const prevPatientIdRef = useRef<string>('');
  const lastPatientUpdateRef = useRef<number>(0); // Timestamp des letzten Patient-Updates
  const lastEpaLoadTimeRef = useRef<number>(0); // Timestamp des letzten EPA-Ladens
  
  // Ref um die letzte bekannte Version jedes einzelnen medizinischen Datenfeldes zu speichern
  // Dies ermöglicht es, genau zu erkennen, welche Felder sich geändert haben
  const lastMedicalFieldsRef = useRef<{
    infections?: any[];
    allergies?: any[];
    currentMedications?: any[];
    preExistingConditions?: string[];
    medicalHistory?: string[];
    previousSurgeries?: any[];
    vaccinations?: any[];
    bloodType?: string;
    height?: number;
    weight?: number;
    bmi?: number;
    smokingStatus?: string;
    hasPacemaker?: boolean;
    hasDefibrillator?: boolean;
    implants?: any[];
    isPregnant?: boolean;
  } | null>(null);
  
  // Reset initialization when patientId changes
  useEffect(() => {
    if (prevPatientIdRef.current !== patientId) {
      console.log('🔄 Patient gewechselt:', { 
        from: prevPatientIdRef.current, 
        to: patientId 
      });
      
      initializedRef.current = false;
      prevPatientIdRef.current = patientId;
      prevDataHashRef.current = '';
      lastPatientUpdateRef.current = 0;
      lastEpaLoadTimeRef.current = Date.now();
      lastMedicalFieldsRef.current = null; // Reset medizinische Felder beim Patientenwechsel
      
      // WICHTIG: Setze alle State-Variablen zurück, damit keine alten Daten angezeigt werden
      setEpaEntries([]);
      setLaborResults([]);
      setDicomStudies([]);
      setPhotos([]);
      setPatient(null);
      setLoading(true);
      setSearchTerm('');
      setFilterType('all');
      setExpandedRows(new Set());
      setVisibleDatesCount(20); // Reset auf initiale Anzahl
      
      // WICHTIG: Setze Redux-Daten zurück, damit keine alten Daten im Store bleiben
      dispatch(clearVitalSigns());
      dispatch(resetDekursState());
    }
  }, [patientId, dispatch]);
  
  // Hilfsfunktion: Prüft, ob sich ein spezifisches medizinisches Feld geändert hat
  const hasFieldChanged = useCallback((fieldName: string, currentValue: any, previousValue: any): boolean => {
    if (!lastMedicalFieldsRef.current) {
      // Beim ersten Laden gibt es keine vorherige Version
      return false;
    }
    
    // Behandle undefined/null Werte
    const currentIsEmpty = currentValue === null || currentValue === undefined || 
                          (Array.isArray(currentValue) && currentValue.length === 0) ||
                          (typeof currentValue === 'string' && currentValue === '');
    const previousIsEmpty = previousValue === null || previousValue === undefined || 
                           (Array.isArray(previousValue) && previousValue.length === 0) ||
                           (typeof previousValue === 'string' && previousValue === '');
    
    // Wenn beide leer sind, hat sich nichts geändert
    if (currentIsEmpty && previousIsEmpty) {
      return false;
    }
    
    // Wenn einer leer ist und der andere nicht, hat sich etwas geändert
    if (currentIsEmpty !== previousIsEmpty) {
      return true;
    }
    
    // Für Arrays: Vergleiche die JSON-String-Repräsentation
    if (Array.isArray(currentValue) || Array.isArray(previousValue)) {
      const currentStr = JSON.stringify(currentValue || []);
      const previousStr = JSON.stringify(previousValue || []);
      return currentStr !== previousStr;
    }
    
    // Für primitive Werte: Direkter Vergleich
    return currentValue !== previousValue;
  }, []);
  
  // Hilfsfunktion: Prüft, ob ein spezifisches medizinisches Feld geändert wurde und angezeigt werden soll
  // Zeigt einen Eintrag an, wenn:
  // 1. Das spezifische Feld sich geändert hat (im Vergleich zur letzten bekannten Version)
  // 2. UND der Patient kürzlich aktualisiert wurde (innerhalb der letzten 24 Stunden)
  // 3. UND es ein neues Update ist (größer als der letzte bekannte Update-Zeitpunkt)
  const shouldShowMedicalField = useCallback((fieldName: string, fieldValue: any, entryDate: Date | string | null, patient: any): boolean => {
    if (!patient || !patient.updatedAt) {
      console.log(`🔍 shouldShowMedicalField [${fieldName}]: Kein Patient oder updatedAt`);
      return false;
    }
    
    const patientUpdatedAt = new Date(patient.updatedAt).getTime();
    const now = Date.now();
    const hoursSincePatientUpdate = (now - patientUpdatedAt) / (1000 * 60 * 60);
    
    // Prüfe, ob der Patient kürzlich aktualisiert wurde (innerhalb der letzten 4 Stunden)
    const isRecentPatientUpdate = hoursSincePatientUpdate < 4;
    
    // Prüfe, ob dies ein neues Update ist (größer als der letzte bekannte Update-Zeitpunkt)
    const isNewPatientUpdate = patientUpdatedAt > lastPatientUpdateRef.current;
    const isFirstLoad = !lastMedicalFieldsRef.current;
    
    // Beim ersten Laden: Zeige nur Felder an, die Daten enthalten UND innerhalb der letzten 1 Stunde erfasst wurden
    if (isFirstLoad) {
      // Prüfe, ob das Feld tatsächlich Daten enthält
      const hasData = fieldValue !== null && fieldValue !== undefined && 
                     (Array.isArray(fieldValue) ? fieldValue.length > 0 : 
                      typeof fieldValue === 'boolean' ? true : 
                      fieldValue !== '');
      
      if (!hasData) {
        console.log(`🔍 shouldShowMedicalField [${fieldName}]: Erster Laden, kein Dateninhalt`);
        return false;
      }
      
      // Beim ersten Laden: Zeige nur Felder an, die SEHR kürzlich erfasst wurden (innerhalb der letzten 1 Stunde)
      if (entryDate) {
        const entryDateObj = new Date(entryDate);
        const hoursSinceEntry = (now - entryDateObj.getTime()) / (1000 * 60 * 60);
        const shouldShow = hoursSinceEntry < 1; // Nur innerhalb der letzten 1 Stunde
        console.log(`🔍 shouldShowMedicalField [${fieldName}]: Erster Laden, prüfe Eintragsdatum:`, {
          entryDate: new Date(entryDate).toISOString(),
          hoursSinceEntry: hoursSinceEntry.toFixed(2),
          shouldShow
        });
        return shouldShow;
      }
      
      // Kein explizites Eintragsdatum vorhanden - verwende patient.updatedAt als Fallback
      // Zeige nur an, wenn patient.updatedAt innerhalb der letzten 1 Stunde ist
      const isVeryRecentPatientUpdate = hoursSincePatientUpdate < 1; // Nur innerhalb der letzten 1 Stunde
      if (!isVeryRecentPatientUpdate) {
        console.log(`🔍 shouldShowMedicalField [${fieldName}]: Erster Laden, kein Eintragsdatum, Patient nicht sehr kürzlich aktualisiert`, {
          hoursSinceUpdate: hoursSincePatientUpdate.toFixed(2)
        });
        return false;
      }
      
      console.log(`🔍 shouldShowMedicalField [${fieldName}]: Erster Laden, kein Eintragsdatum, verwende patient.updatedAt als Fallback`);
      return true;
    }
    
    // Nach dem ersten Laden: Prüfe ZUERST, ob sich das spezifische Feld geändert hat
    // WICHTIG: Diese Prüfung hat absoluten Vorrang - nur geänderte Felder werden angezeigt
    // Es ist egal, ob patient.updatedAt aktualisiert wurde - nur geänderte Felder zählen
    if (!lastMedicalFieldsRef.current) {
      // lastMedicalFieldsRef wurde noch nicht initialisiert - sollte nicht passieren nach dem ersten Laden
      console.log(`🔍 shouldShowMedicalField [${fieldName}]: lastMedicalFieldsRef nicht initialisiert`);
      return false;
    }
    
    const previousFieldValue = lastMedicalFieldsRef.current[fieldName as keyof typeof lastMedicalFieldsRef.current];
    const fieldChanged = hasFieldChanged(fieldName, fieldValue, previousFieldValue);
    
    if (!fieldChanged) {
      // Feld hat sich nicht geändert - zeige nichts an, unabhängig vom Update-Zeitpunkt
      console.log(`❌ shouldShowMedicalField [${fieldName}]: Feld hat sich nicht geändert - zeige nichts an`, {
        previousValue: previousFieldValue,
        currentValue: fieldValue
      });
      return false;
    }
    
    // Feld hat sich geändert - prüfe jetzt, ob es ein neues Update ist
    // (Dies ist nur für zusätzliche Sicherheit, die Prüfung auf fieldChanged hat Vorrang)
    if (!isNewPatientUpdate) {
      console.log(`⚠️ shouldShowMedicalField [${fieldName}]: Feld geändert, aber isNewPatientUpdate ist false - zeige trotzdem an`);
      // Trotzdem anzeigen, wenn sich das Feld geändert hat
    }
    
    // Feld hat sich geändert - prüfe das Eintragsdatum
    // WICHTIG: Wenn entryDate === patient.updatedAt, dann wurde dieses Feld möglicherweise nicht geändert,
    // sondern nur ein anderes Feld. In diesem Fall verwenden wir eine sehr kurze Zeitspanne.
    if (entryDate) {
      const entryDateObj = new Date(entryDate);
      const entryDateTime = entryDateObj.getTime();
      const patientUpdatedAtTime = patientUpdatedAt;
      
      // Prüfe, ob entryDate identisch mit patient.updatedAt ist
      // Wenn ja, verwende eine sehr kurze Zeitspanne (5 Minuten), da es möglicherweise
      // nur ein anderes Feld war, das aktualisiert wurde
      const isSameAsPatientUpdatedAt = Math.abs(entryDateTime - patientUpdatedAtTime) < 1000; // Weniger als 1 Sekunde Unterschied
      
      const hoursSinceEntry = (now - entryDateTime) / (1000 * 60 * 60);
      const minutesSinceEntry = (now - entryDateTime) / (1000 * 60);
      
      if (isSameAsPatientUpdatedAt) {
        // entryDate ist identisch mit patient.updatedAt - verwende sehr kurze Zeitspanne (5 Minuten)
        // Dies stellt sicher, dass nur wirklich frische Updates angezeigt werden
        const shouldShow = minutesSinceEntry < 5; // Nur innerhalb der letzten 5 Minuten
        console.log(`✅ shouldShowMedicalField [${fieldName}]: Feld geändert, entryDate = patient.updatedAt, prüfe sehr kurze Zeitspanne:`, {
          entryDate: new Date(entryDate).toISOString(),
          minutesSinceEntry: minutesSinceEntry.toFixed(2),
          shouldShow
        });
        return shouldShow;
      } else {
        // entryDate ist spezifisch für dieses Feld - verwende normale Zeitspanne (1 Stunde)
        const shouldShow = hoursSinceEntry < 1;
        console.log(`✅ shouldShowMedicalField [${fieldName}]: Feld geändert, spezifisches entryDate, prüfe Eintragsdatum:`, {
          entryDate: new Date(entryDate).toISOString(),
          hoursSinceEntry: hoursSinceEntry.toFixed(2),
          shouldShow
        });
        return shouldShow;
      }
    }
    
    // Kein explizites Eintragsdatum vorhanden - verwende patient.updatedAt als Fallback
    // WICHTIG: Verwende eine sehr kurze Zeitspanne (5 Minuten), da patient.updatedAt
    // aktualisiert wird, wenn irgendein Feld geändert wird
    const minutesSincePatientUpdate = hoursSincePatientUpdate * 60;
    const isVeryRecentPatientUpdate = minutesSincePatientUpdate < 5; // Nur innerhalb der letzten 5 Minuten
    if (!isVeryRecentPatientUpdate) {
      console.log(`🔍 shouldShowMedicalField [${fieldName}]: Feld geändert, aber Patient nicht sehr kürzlich aktualisiert`, {
        minutesSinceUpdate: minutesSincePatientUpdate.toFixed(2)
      });
      return false;
    }
    
    console.log(`✅ shouldShowMedicalField [${fieldName}]: Feld geändert, kein Eintragsdatum, verwende patient.updatedAt als Fallback (sehr kürzlich)`);
    return true;
  }, [hasFieldChanged]);

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
  const [visibleDatesCount, setVisibleDatesCount] = useState(20); // Zeige initial 20 Datum-Karten für bessere UX

  // Hilfsfunktion zum Extrahieren der Patient-ID aus einem Appointment
  const getAppointmentPatientId = React.useCallback((apt: any): string | null => {
    if (!apt) return null;
    if (apt.patientId) return String(apt.patientId);
    if (apt.patient && typeof apt.patient === 'string') return apt.patient;
    if (apt.patient && typeof apt.patient === 'object' && apt.patient._id) return String(apt.patient._id);
    if (apt.patient && typeof apt.patient === 'object' && apt.patient.id) return String(apt.patient.id);
    return null;
  }, []);

  // Lade alle Daten - OPTIMIERT: Prüfe Redux Store zuerst, lade nur wenn nötig
  useEffect(() => {
    const loadData = async () => {
      if (!patientId) return;

      setLoading(true);
      try {
        // OPTIMIERT: Prüfe zuerst, ob Daten bereits im Redux Store sind
        const hasAppointments = appointments && appointments.length > 0 && 
          appointments.some((apt: any) => getAppointmentPatientId(apt) === patientId);
        const hasDiagnoses = patientDiagnoses && patientDiagnoses.length > 0 && 
          patientDiagnoses.some((diag: any) => diag.patientId === patientId || (diag.patient && (typeof diag.patient === 'string' ? diag.patient === patientId : diag.patient._id === patientId)));
        const hasDocuments = documents && documents.length > 0 && 
          documents.some((doc: any) => doc.patientId === patientId);
        const hasDekurs = dekursEntries && dekursEntries.length > 0 && 
          dekursEntries.some((entry: any) => entry.patientId === patientId);
        const hasVitalSigns = vitalSigns && vitalSigns.length > 0 && 
          vitalSigns.some((vs: any) => vs.patientId === patientId);

        // PHASE 1: Kritische Daten sofort laden (nur wenn nicht bereits vorhanden)
        const criticalPromises: Promise<any>[] = [];
        
        if (!hasAppointments) {
          criticalPromises.push(dispatch(fetchAppointmentsByPatientId(patientId)).catch(() => {}));
        }
        if (!hasDiagnoses) {
          criticalPromises.push(dispatch(fetchPatientDiagnoses({ patientId })).catch(() => {}));
        }
        
        // Patientendaten immer laden (für medizinische Felder)
        criticalPromises.push(
          api.get<any>(`/patients-extended/${patientId}`).then((response: any) => {
            const apiResult = response.data || response;
            const patientData = (apiResult.success && apiResult.data) ? apiResult.data : (apiResult.data || apiResult);
            if (patientData) {
              setPatient(patientData);
            }
          }).catch((error: any) => {
            console.warn('Fehler beim Laden der Patientendaten:', error);
            if (patientFromStore) {
              setPatient(patientFromStore);
            } else {
              setPatient(null);
            }
          })
        );

        const criticalData = await Promise.allSettled(criticalPromises);

        // PHASE 2: Wichtige Daten (nur wenn nicht bereits vorhanden)
        const importantPromises: Promise<any>[] = [];
        
        if (!hasDocuments) {
          importantPromises.push(dispatch(fetchDocuments({ patientId })).catch(() => {}));
        }
        if (!hasDekurs) {
          importantPromises.push(dispatch(fetchDekursEntries({ patientId, limit: 50 })).catch(() => {}));
        }
        if (!hasVitalSigns) {
          importantPromises.push(dispatch(fetchVitalSigns(patientId)).catch(() => {}));
        }
        
        const importantData = Promise.allSettled(importantPromises);

        // PHASE 3: Optionale Daten (lazy load - können später geladen werden)
        const optionalData = Promise.allSettled([
          // Laborwerte - nur wenn noch nicht geladen
          laborResults.length === 0 ? api.get<any>(`/labor/patient/${patientId}`).then((response: any) => {
            if (response.success) {
              const data = response.data;
              const laborData = Array.isArray(data) ? data : ((data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) ? data.data : []);
              setLaborResults(laborData);
            }
          }).catch(() => setLaborResults([])) : Promise.resolve(),
          // DICOM-Studien - nur wenn noch nicht geladen
          dicomStudies.length === 0 ? api.get<any>(`/dicom/patient/${patientId}`).then((response: any) => {
            if (response.success) {
              const data = response.data;
              const dicomData = Array.isArray(data) ? data : ((data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) ? data.data : []);
              setDicomStudies(dicomData);
            }
          }).catch(() => setDicomStudies([])) : Promise.resolve(),
          // Fotos - lazy load (nur wenn benötigt und noch nicht geladen)
          photos.length === 0 ? api.get<any>(`/patients-extended/${patientId}/photos`).then((response: any) => {
            if (response.success) {
              const data = response.data;
              const photosData = Array.isArray(data) ? data : ((data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) ? data.data : []);
              setPhotos(photosData);
            }
          }).catch((error: any) => {
            if (error?.response?.status !== 404 && error?.message !== 'Endpoint nicht gefunden') {
              console.warn('Fehler beim Laden der Fotos:', error);
            }
            setPhotos([]);
          }) : Promise.resolve()
        ]);

        // Warte auf kritische Daten, dann lade wichtige Daten
        await criticalData;
        setLoading(false); // UI kann jetzt angezeigt werden
        
        // Lade wichtige und optionale Daten im Hintergrund
        await importantData;
        await optionalData;
      } catch (error) {
        console.error('Fehler beim Laden der ePA-Daten:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [patientId, dispatch, patientFromStore]);

  // Aktualisiere Patientendaten, wenn sich der Patient im Redux Store ändert
  useEffect(() => {
    if (patientFromStore && patientId) {
      // Prüfe, ob die Redux-Version neuer ist als die geladene Version
      const currentPatientUpdatedAt = patient?.updatedAt ? new Date(patient.updatedAt).getTime() : 0;
      const storePatientUpdatedAt = patientFromStore.updatedAt ? new Date(patientFromStore.updatedAt).getTime() : 0;
      
      // Aktualisiere, wenn Redux-Version neuer ist oder wenn noch kein Patient geladen wurde
      if (storePatientUpdatedAt > currentPatientUpdatedAt || !patient) {
        // Wenn der Patient aktualisiert wurde, aktualisiere lastPatientUpdateRef
        if (storePatientUpdatedAt > currentPatientUpdatedAt && currentPatientUpdatedAt > 0) {
          // Patient wurde aktualisiert - setze lastPatientUpdateRef auf den vorherigen Wert
          // Damit wird das neue Update erkannt und medizinische Daten werden angezeigt
          lastPatientUpdateRef.current = currentPatientUpdatedAt;
          console.log('🔄 Patient wurde aktualisiert:', {
            previousUpdate: new Date(currentPatientUpdatedAt).toISOString(),
            newUpdate: new Date(storePatientUpdatedAt).toISOString(),
            lastPatientUpdateRef: new Date(lastPatientUpdateRef.current).toISOString()
          });
          
          // Lade Patientendaten direkt vom Server, um sicherzustellen, dass alle Daten aktuell sind
          api.get<any>(`/patients-extended/${patientId}`).then((response: any) => {
            if (response.success) {
              const updatedPatient = response.data || response;
              console.log('✅ Patientendaten vom Server geladen:', {
                updatedAt: updatedPatient.updatedAt,
                infections: updatedPatient.infections?.length || 0
              });
              startTransition(() => {
                setPatient(updatedPatient);
              });
            }
          }).catch((error: any) => {
            console.warn('Fehler beim Neuladen der Patientendaten:', error);
            // Fallback: Verwende Patient aus Redux Store
            startTransition(() => {
              setPatient(patientFromStore);
            });
          });
        } else {
          // Beim ersten Laden (patient === null) bleibt lastPatientUpdateRef.current = 0
          // Damit werden alle kürzlichen Einträge angezeigt
          startTransition(() => {
            setPatient(patientFromStore);
          });
        }
      }
    }
  }, [patientFromStoreUpdatedAt, patientId, patient?.updatedAt]);

  // Zusätzlicher useEffect: Reagiere sofort auf Änderungen von patientFromStore
  // Dies stellt sicher, dass die EPA sofort aktualisiert wird, wenn medizinische Daten gespeichert werden
  // Reagiert auf Änderungen in patientFromStore selbst, nicht nur auf updatedAt
  useEffect(() => {
    if (!patientFromStore || !patientId) {
      return;
    }
    
    const storePatientUpdatedAt = patientFromStore.updatedAt ? new Date(patientFromStore.updatedAt).getTime() : 0;
    const currentPatientUpdatedAt = patient?.updatedAt ? new Date(patient.updatedAt).getTime() : 0;
    
    // Prüfe, ob sich medizinische Daten geändert haben (auch wenn updatedAt gleich ist)
    // Vergleiche patientFromStore mit dem aktuellen patient State
    const hasMedicalDataChanged = patient && (
      JSON.stringify(patientFromStore.infections || []) !== JSON.stringify(patient.infections || []) ||
      JSON.stringify(patientFromStore.allergies || []) !== JSON.stringify(patient.allergies || []) ||
      JSON.stringify(patientFromStore.currentMedications || []) !== JSON.stringify(patient.currentMedications || []) ||
      JSON.stringify(patientFromStore.preExistingConditions || []) !== JSON.stringify(patient.preExistingConditions || []) ||
      JSON.stringify(patientFromStore.medicalHistory || []) !== JSON.stringify(patient.medicalHistory || []) ||
      JSON.stringify(patientFromStore.previousSurgeries || []) !== JSON.stringify(patient.previousSurgeries || []) ||
      JSON.stringify(patientFromStore.vaccinations || []) !== JSON.stringify(patient.vaccinations || []) ||
      patientFromStore.bloodType !== patient.bloodType ||
      patientFromStore.height !== patient.height ||
      patientFromStore.weight !== patient.weight ||
      patientFromStore.bmi !== patient.bmi ||
      patientFromStore.smokingStatus !== patient.smokingStatus ||
      patientFromStore.hasPacemaker !== patient.hasPacemaker ||
      patientFromStore.hasDefibrillator !== patient.hasDefibrillator ||
      JSON.stringify(patientFromStore.implants || []) !== JSON.stringify(patient.implants || []) ||
      patientFromStore.isPregnant !== patient.isPregnant
    );
    
    // Wenn die Redux-Version neuer ist ODER sich medizinische Daten geändert haben, lade die Daten sofort
    if ((storePatientUpdatedAt > currentPatientUpdatedAt && currentPatientUpdatedAt > 0) || hasMedicalDataChanged) {
      console.log('⚡ Sofortige Aktualisierung der EPA:', {
        current: new Date(currentPatientUpdatedAt).toISOString(),
        store: new Date(storePatientUpdatedAt).toISOString(),
        diff: storePatientUpdatedAt > currentPatientUpdatedAt ? ((storePatientUpdatedAt - currentPatientUpdatedAt) / 1000).toFixed(2) + 's' : '0s (Datenänderung)',
        hasMedicalDataChanged,
        triggerReason: hasMedicalDataChanged ? 'medizinische Daten geändert' : 'updatedAt neuer',
        currentLastPatientUpdateRef: lastPatientUpdateRef.current ? new Date(lastPatientUpdateRef.current).toISOString() : '0'
      });
      
      // WICHTIG: Setze lastPatientUpdateRef auf den vorherigen Wert (currentPatientUpdatedAt),
      // damit das neue Update (storePatientUpdatedAt) als "neu" erkannt wird
      // Dies ist kritisch, damit shouldShowMedicalEntry korrekt funktioniert
      // ABER: Nur wenn currentPatientUpdatedAt > 0 (nicht beim ersten Laden)
      if (currentPatientUpdatedAt > 0) {
        lastPatientUpdateRef.current = currentPatientUpdatedAt;
      }
      
      // Lade Patientendaten direkt vom Server, um sicherzustellen, dass alle Daten aktuell sind
      api.get<any>(`/patients-extended/${patientId}`).then((response: any) => {
        // Die API-Antwort hat die Struktur: { success: true, data: { ...patient... } }
        // response.data ist das gesamte result Objekt, also response.data.data ist der Patient
        const apiResult = response.data || response;
        const updatedPatient = (apiResult.success && apiResult.data) ? apiResult.data : (apiResult.data || apiResult);
        const serverUpdatedAt = updatedPatient.updatedAt ? new Date(updatedPatient.updatedAt).getTime() : 0;
        console.log('✅ Patientendaten sofort neu geladen für EPA:', {
          updatedAt: updatedPatient.updatedAt,
          serverUpdatedAt: new Date(serverUpdatedAt).toISOString(),
          lastPatientUpdateRef: lastPatientUpdateRef.current ? new Date(lastPatientUpdateRef.current).toISOString() : '0',
          willBeRecognizedAsNew: serverUpdatedAt > lastPatientUpdateRef.current,
          infections: updatedPatient.infections?.length || 0,
          allergies: updatedPatient.allergies?.length || 0,
          medications: updatedPatient.currentMedications?.length || 0
        });
        startTransition(() => {
          setPatient(updatedPatient);
        });
      }).catch((error: any) => {
        console.warn('Fehler beim sofortigen Neuladen der Patientendaten:', error);
        // Fallback: Verwende Patient aus Redux Store
        startTransition(() => {
          setPatient(patientFromStore);
        });
      });
    }
  }, [
    patientId, 
    patientFromStore?.updatedAt,
    patientFromStore?.infections?.length,
    patientFromStore?.allergies?.length,
    patientFromStore?.currentMedications?.length,
    patientFromStore?.preExistingConditions?.length,
    patientFromStore?.medicalHistory?.length,
    patientFromStore?.previousSurgeries?.length,
    patientFromStore?.vaccinations?.length,
    patientFromStore?.bloodType,
    patientFromStore?.height,
    patientFromStore?.weight,
    patientFromStore?.bmi,
    patientFromStore?.smokingStatus,
    patientFromStore?.hasPacemaker,
    patientFromStore?.hasDefibrillator,
    patientFromStore?.implants?.length,
    patientFromStore?.isPregnant,
    patient?.updatedAt
  ]);

  // Erstelle EPA-Einträge aus allen Datenquellen
  // OPTIMIERT: Verwende requestIdleCallback für nicht-kritische Verarbeitung
  useEffect(() => {
    if (!patientId) {
      startTransition(() => {
        setEpaEntries([]);
      });
      return;
    }

    // OPTIMIERT: Verarbeite alle Daten auf einmal, aber nur einmal
    const processEntries = () => {
      try {
        let entries: EPAEntry[] = [];
      
      // OPTIMIERT: Reduziere Logging für bessere Performance
      // Nur loggen wenn viele Einträge vorhanden sind
      const totalEntries = (appointments?.length || 0) + (dekursEntries?.length || 0) + (patientDiagnoses?.length || 0) + (documents?.length || 0) + (vitalSigns?.length || 0);
      if (totalEntries > 50) {
        console.log('🔍 Starte EPA-Einträge-Erstellung:', {
          patientId,
          totalEntries,
          appointmentsCount: appointments?.length || 0,
          dekursEntriesCount: dekursEntries?.length || 0,
          patientDiagnosesCount: patientDiagnoses?.length || 0,
          documentsCount: documents?.length || 0,
          vitalSignsCount: vitalSigns?.length || 0
        });
      }

      // Termine
      try {
        // Filtere Termine nach patientId BEVOR wir sie verarbeiten (getAppointmentPatientId ist bereits oben definiert)
        // Der Redux Store kann Termine von mehreren Patienten enthalten
        const patientAppointments = (appointments || []).filter((apt: any) => {
          const aptPatientId = getAppointmentPatientId(apt);
          if (!aptPatientId) {
            // Wenn keine patientId vorhanden ist, akzeptiere den Termin nicht
            // (sollte eigentlich nicht vorkommen, aber sicherheitshalber)
            return false;
          }
          return aptPatientId === String(patientId);
        });

        // OPTIMIERT: Reduziere Logging
        if (patientAppointments.length > 20) {
          console.log('📅 Verarbeite Termine:', { 
            total: appointments?.length || 0,
            filtered: patientAppointments.length,
            patientId 
          });
        }

        // Verarbeite alle Termine
        patientAppointments.forEach((apt: any) => {
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
        });
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Terminen:', error);
      }

      // Dekurs-Einträge
      try {
        // Hilfsfunktion zum Extrahieren der patientId aus einem Dekurs-Eintrag
        const getDekursPatientId = (dekurs: any): string | null => {
          if (dekurs.patientId) return String(dekurs.patientId);
          if (dekurs.patient && typeof dekurs.patient === 'string') return dekurs.patient;
          if (dekurs.patient && typeof dekurs.patient === 'object' && dekurs.patient._id) return String(dekurs.patient._id);
          if (dekurs.patient && typeof dekurs.patient === 'object' && dekurs.patient.id) return String(dekurs.patient.id);
          return null;
        };

        // Filtere Dekurs-Einträge nach patientId BEVOR wir sie verarbeiten
        const patientDekursEntries = (dekursEntries || []).filter((dekurs: any) => {
          const dekursPatientId = getDekursPatientId(dekurs);
          if (!dekursPatientId) return false; // Keine patientId = nicht zu diesem Patienten
          return dekursPatientId === String(patientId);
        });

        // OPTIMIERT: Reduziere Logging
        if (patientDekursEntries.length > 20) {
          console.log('📝 Verarbeite Dekurs-Einträge:', { 
            total: dekursEntries?.length || 0,
            filtered: patientDekursEntries.length,
            patientId
          });
        }
        
        // Verarbeite alle Dekurs-Einträge
        patientDekursEntries.forEach((dekurs: any) => {
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
        
        // OPTIMIERT: Reduziere Logging
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Dekurs-Einträgen:', error);
      }

      // Diagnosen
      try {
        // Hilfsfunktion zum Extrahieren der patientId aus einer Diagnose
        const getDiagnosisPatientId = (diag: any): string | null => {
          if (diag.patientId) return String(diag.patientId);
          if (diag.patient && typeof diag.patient === 'string') return diag.patient;
          if (diag.patient && typeof diag.patient === 'object' && diag.patient._id) return String(diag.patient._id);
          if (diag.patient && typeof diag.patient === 'object' && diag.patient.id) return String(diag.patient.id);
          return null;
        };

        // Filtere Diagnosen nach patientId BEVOR wir sie verarbeiten
        const patientDiagnosesFiltered = (patientDiagnoses || []).filter((diag: any) => {
          const diagPatientId = getDiagnosisPatientId(diag);
          if (!diagPatientId) return false; // Keine patientId = nicht zu diesem Patienten
          return diagPatientId === String(patientId);
        });

        // OPTIMIERT: Reduziere Logging
        if (patientDiagnosesFiltered.length > 20) {
          console.log('🔬 Verarbeite Diagnosen:', { 
            total: patientDiagnoses?.length || 0,
            filtered: patientDiagnosesFiltered.length,
            patientId
          });
        }
        
        // Verarbeite alle Diagnosen
        patientDiagnosesFiltered.forEach((diag: any) => {
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

      // Medikamente - ENTFERNT: Medizinische Daten werden nicht mehr in ePA angezeigt

      // Dokumente
      try {
        // Hilfsfunktion zum Extrahieren der patientId aus einem Dokument
        const getDocumentPatientId = (doc: any): string | null => {
          if (doc.patientId) return String(doc.patientId);
          if (doc.patient && typeof doc.patient === 'string') return doc.patient;
          if (doc.patient && typeof doc.patient === 'object' && doc.patient.id) return String(doc.patient.id);
          if (doc.patient && typeof doc.patient === 'object' && doc.patient._id) return String(doc.patient._id);
          return null;
        };

        const docsArray = Array.isArray(documents) ? documents : ((documents as any)?.data || []);
        
        // Filtere Dokumente nach patientId BEVOR wir sie verarbeiten
        const patientDocuments = docsArray.filter((doc: any) => {
          const docPatientId = getDocumentPatientId(doc);
          if (!docPatientId) return false; // Keine patientId = nicht zu diesem Patienten
          return docPatientId === String(patientId);
        });

        // OPTIMIERT: Reduziere Logging
        if (patientDocuments.length > 20) {
          console.log('📄 Verarbeite Dokumente:', { 
            total: docsArray.length,
            filtered: patientDocuments.length,
            patientId
          });
        }

        // Verarbeite alle Dokumente
        patientDocuments.forEach((doc: any) => {
          entries.push({
            id: `document-${doc._id}`,
            type: 'document',
            date: new Date(doc.createdAt || doc.date || new Date()),
            title: doc.title || doc.name || 'Dokument',
            description: doc.description || doc.type,
            status: doc.status,
            metadata: doc
          });
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

      // Allergien - ENTFERNT: Medizinische Daten werden nicht mehr in ePA angezeigt

      // Infektionen - ENTFERNT: Medizinische Daten werden nicht mehr in ePA angezeigt

      // Schwangerschaft - ENTFERNT: Medizinische Daten werden nicht mehr in ePA angezeigt

      // Schrittmacher - ENTFERNT: Medizinische Daten werden nicht mehr in ePA angezeigt

      // Defibrillator - ENTFERNT: Medizinische Daten werden nicht mehr in ePA angezeigt

      // Implantate - ENTFERNT: Medizinische Daten werden nicht mehr in ePA angezeigt

      // Vorerkrankungen - ENTFERNT: Medizinische Daten werden nicht mehr in ePA angezeigt

      // Medizinische Vorgeschichte - ENTFERNT: Medizinische Daten werden nicht mehr in ePA angezeigt

      // Vorherige Operationen - ENTFERNT: Medizinische Daten werden nicht mehr in ePA angezeigt

      // Impfungen - ENTFERNT: Medizinische Daten werden nicht mehr in ePA angezeigt

      // Blutgruppe - ENTFERNT: Medizinische Daten werden nicht mehr in ePA angezeigt

      // Körpermaße (Größe/Gewicht/BMI) - ENTFERNT: Medizinische Daten werden nicht mehr in ePA angezeigt

      // Raucherstatus - ENTFERNT: Medizinische Daten werden nicht mehr in ePA angezeigt

      // Vitalwerte
      try {
        // Hilfsfunktion zum Extrahieren der patientId aus einem Vitalwert
        const getVitalSignPatientId = (vital: any): string | null => {
          if (vital.patientId) return String(vital.patientId);
          if (vital.patient && typeof vital.patient === 'string') return vital.patient;
          if (vital.patient && typeof vital.patient === 'object' && vital.patient._id) return String(vital.patient._id);
          if (vital.patient && typeof vital.patient === 'object' && vital.patient.id) return String(vital.patient.id);
          return null;
        };

        // Filtere Vitalwerte nach patientId BEVOR wir sie verarbeiten
        const patientVitalSigns = (vitalSigns || []).filter((vital: any) => {
          const vitalPatientId = getVitalSignPatientId(vital);
          if (!vitalPatientId) return false; // Keine patientId = nicht zu diesem Patienten
          return vitalPatientId === String(patientId);
        });

        // Verarbeite alle Vitalwerte
        patientVitalSigns.forEach((vital: any) => {
          
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
      if (entries.length > 0) {
        entries.sort((a, b) => b.date.getTime() - a.date.getTime());
      }

      // Erstelle einen einfacheren Hash für Change Detection
      const simpleHash = entries.length > 0 
        ? `${entries.length}|${entries[0].id}|${entries[entries.length - 1].id}`
        : '0';
      
      // Prüfe, ob sich die Daten geändert haben
      if (prevDataHashRef.current === simpleHash) {
        return; // Keine Änderung
      }
      
      prevDataHashRef.current = simpleHash;
    
      // Aktualisiere lastPatientUpdateRef
      if (patient && patient.updatedAt) {
        lastPatientUpdateRef.current = new Date(patient.updatedAt).getTime();
      }
      
      // Aktualisiere lastMedicalFieldsRef
      if (patient) {
        lastMedicalFieldsRef.current = {
          infections: patient.infections,
          allergies: patient.allergies,
          currentMedications: patient.currentMedications,
          preExistingConditions: patient.preExistingConditions,
          medicalHistory: patient.medicalHistory,
          previousSurgeries: patient.previousSurgeries,
          vaccinations: patient.vaccinations,
          bloodType: patient.bloodType,
          height: patient.height,
          weight: patient.weight,
          bmi: patient.bmi,
          smokingStatus: patient.smokingStatus,
          hasPacemaker: patient.hasPacemaker,
          hasDefibrillator: patient.hasDefibrillator,
          implants: patient.implants,
          isPregnant: patient.isPregnant
        };
      }
      
      // Setze alle Einträge auf einmal - kein startTransition, kein Batching
      setEpaEntries(entries);
    } catch (error) {
        console.error('Fehler beim Erstellen der EPA-Einträge:', error);
        startTransition(() => {
          setEpaEntries([]);
        });
      }
    };

    // Verarbeite sofort - keine Verzögerung
    processEntries();
  }, [patientId, appointments, dekursEntries, patientDiagnoses, documents, laborResults, dicomStudies, photos, vitalSigns, patient]);


  // OPTIMIERT: Berechne Typ-Zählungen nur einmal mit useMemo
  const typeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    (epaEntries || []).forEach(e => {
      if (e?.type) {
        counts[e.type] = (counts[e.type] || 0) + 1;
      }
    });
    return counts;
  }, [epaEntries]);

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

  const getTypeIcon = React.useCallback((type: string) => {
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
      case 'allergy': return <Warning />;
      case 'infection': return <BugReport />;
      case 'pregnancy': return <PregnantWoman />;
      case 'pacemaker': return <Favorite />;
      case 'defibrillator': return <Favorite />;
      case 'implant': return <Healing />;
      case 'preExistingCondition': return <LocalHospital />;
      case 'medicalHistory': return <Description />;
      case 'surgery': return <LocalHospital />;
      case 'vaccination': return <Healing />;
      case 'bloodType': return <MonitorHeart />;
      case 'anthropometry': return <ShowChart />;
      case 'smokingStatus': return <Warning />;
      default: return <Description />;
    }
  }, []);

  const getTypeLabel = React.useCallback((type: string) => {
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
      case 'allergy': return 'Allergie';
      case 'infection': return 'Infektion';
      case 'pregnancy': return 'Schwangerschaft';
      case 'pacemaker': return 'Schrittmacher';
      case 'defibrillator': return 'Defibrillator';
      case 'implant': return 'Implantat';
      case 'preExistingCondition': return 'Vorerkrankung';
      case 'medicalHistory': return 'Medizinische Vorgeschichte';
      case 'surgery': return 'Operation';
      case 'vaccination': return 'Impfung';
      case 'bloodType': return 'Blutgruppe';
      case 'anthropometry': return 'Körpermaße';
      case 'smokingStatus': return 'Raucherstatus';
      default: return type;
    }
  }, []);

  const getTypeColor = React.useCallback((type: string): 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
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
      case 'allergy': return 'error';
      case 'infection': return 'error';
      case 'pregnancy': return 'info';
      case 'pacemaker': return 'secondary';
      case 'defibrillator': return 'secondary';
      case 'implant': return 'info';
      case 'preExistingCondition': return 'error';
      case 'medicalHistory': return 'info';
      case 'surgery': return 'error';
      case 'vaccination': return 'success';
      case 'bloodType': return 'warning';
      case 'anthropometry': return 'info';
      case 'smokingStatus': return 'warning';
      default: return 'primary';
    }
  }, []);



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

  // Gruppiere Einträge nach Datum - OPTIMIERT: Verwende Map und for-Schleife
  const groupedEntries = React.useMemo(() => {
    try {
      if (!filteredEntries || !Array.isArray(filteredEntries) || filteredEntries.length === 0) {
        return {};
      }
      
      // Verarbeite alle Einträge
      const entriesToProcess = filteredEntries;
      
      // OPTIMIERT: Verwende Map für bessere Performance bei vielen Einträgen
      const groupsMap = new Map<string, EPAEntry[]>();
      
      // Verwende for-Schleife statt forEach für bessere Performance
      for (let i = 0; i < entriesToProcess.length; i++) {
        const entry = entriesToProcess[i];
        if (!entry || !entry.date) {
          continue;
        }
        
        try {
          const dateKey = format(entry.date, 'dd.MM.yyyy', { locale: de });
          if (!groupsMap.has(dateKey)) {
            groupsMap.set(dateKey, []);
          }
          groupsMap.get(dateKey)!.push(entry);
        } catch (error) {
          // Reduziere Error-Logging
          if (i < 10) {
            console.error('Fehler beim Gruppieren eines Eintrags:', error);
          }
        }
      }
      
      // Konvertiere Map zu Object
      const groups: Record<string, EPAEntry[]> = {};
      groupsMap.forEach((entries, dateKey) => {
        groups[dateKey] = entries;
      });
      
      // Debug: Logge Anzahl der gruppierten Einträge
      if (Object.keys(groups).length > 0) {
        const totalGrouped = Object.values(groups).reduce((sum, entries) => sum + entries.length, 0);
        console.log('📊 Gruppierung abgeschlossen:', {
          totalEntries: filteredEntries.length,
          totalGrouped: totalGrouped,
          dateKeys: Object.keys(groups).length,
          firstDate: Object.keys(groups)[0],
          lastDate: Object.keys(groups)[Object.keys(groups).length - 1]
        });
      }
      
      return groups;
    } catch (error) {
      console.error('Fehler beim Gruppieren der Einträge:', error);
      return {};
    }
  }, [filteredEntries]);

  // Gruppiere Einträge desselben Typs am selben Tag - OPTIMIERT: Bessere Performance
  const groupEntriesByType = React.useMemo(() => {
    try {
      const result: Record<string, GroupedEPAEntry[]> = {};
      const dateKeys = Object.keys(groupedEntries);
      
      // Verwende for-Schleife statt forEach für bessere Performance
      for (let i = 0; i < dateKeys.length; i++) {
        const dateKey = dateKeys[i];
        try {
          const entries = groupedEntries[dateKey];
          if (!entries || !Array.isArray(entries)) {
            continue;
          }
          
          // OPTIMIERT: Verwende Map für bessere Performance
          const typeGroupsMap = new Map<string, EPAEntry[]>();
          
          // Gruppiere nach Typ
          for (let j = 0; j < entries.length; j++) {
            const entry = entries[j];
            if (!entry || !entry.type) {
              continue;
            }
            const typeKey = entry.type;
            if (!typeGroupsMap.has(typeKey)) {
              typeGroupsMap.set(typeKey, []);
            }
            typeGroupsMap.get(typeKey)!.push(entry);
          }
          
          // Konvertiere Map zu Object
          const typeGroups: Record<string, EPAEntry[]> = {};
          typeGroupsMap.forEach((entries, typeKey) => {
            typeGroups[typeKey] = entries;
          });
          
          // Erstelle GroupedEPAEntry für jeden Typ - OPTIMIERT: for-Schleife statt forEach
          const groupedEntriesForDate: GroupedEPAEntry[] = [];
          const typeKeys = Object.keys(typeGroups);
          
          for (let k = 0; k < typeKeys.length; k++) {
            const typeKey = typeKeys[k];
            try {
              const typeEntries = typeGroups[typeKey];
              if (!typeEntries || typeEntries.length === 0) {
                continue;
              }
              
              const firstEntry = typeEntries[0];
              if (!firstEntry) {
                continue;
              }
              
              // Wenn mehr als 1 Eintrag, gruppiere sie
              if (typeEntries.length > 1) {
                // OPTIMIERT: Verwende slice für Titel, um nicht alle zu verarbeiten
                const titles = typeEntries.slice(0, 5).map(e => e?.title || '').filter(Boolean);
                const titleSuffix = typeEntries.length > 5 ? `, ... (+${typeEntries.length - 5} weitere)` : '';
                
                groupedEntriesForDate.push({
                  id: `grouped-${dateKey}-${typeKey}`,
                  type: firstEntry.type as any,
                  date: firstEntry.date,
                  title: `${typeEntries.length} ${getTypeLabel(typeKey)}`,
                  description: titles.join(', ') + titleSuffix,
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
          }
          result[dateKey] = groupedEntriesForDate;
        } catch (error) {
          console.error(`Fehler beim Verarbeiten von Einträgen für Datum ${dateKey}:`, error);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Fehler in groupEntriesByType:', error);
      return {};
    }
  }, [groupedEntries, getTypeLabel]);

  // Stabilisiere groupedEntries - verwende einen String-Key für die Dependency
  const groupedEntriesKey = React.useMemo(() => {
    if (!groupedEntries || typeof groupedEntries !== 'object') {
      return '';
    }
    // Erstelle einen stabilen Key aus allen Datum-Keys, sortiert
    const keys = Object.keys(groupedEntries).sort();
    return keys.join('|');
  }, [groupedEntries]);

  const sortedDates = React.useMemo(() => {
    try {
      if (!groupedEntries || typeof groupedEntries !== 'object') {
        return [];
      }
      const dateKeys = Object.keys(groupedEntries);
      if (dateKeys.length === 0) {
        return [];
      }
      // Erstelle eine Kopie des Arrays, um die ursprüngliche Reihenfolge nicht zu ändern
      const dateKeysCopy = [...dateKeys];
      // Sortiere Datum-Strings (Format: dd.MM.yyyy)
      dateKeysCopy.sort((a, b) => {
        try {
          // Konvertiere dd.MM.yyyy zu Date-Objekt
          const partsA = a.split('.');
          const partsB = b.split('.');
          if (partsA.length !== 3 || partsB.length !== 3) {
            return 0;
          }
          const dateA = new Date(`${partsA[2]}-${partsA[1]}-${partsA[0]}`);
          const dateB = new Date(`${partsB[2]}-${partsB[1]}-${partsB[0]}`);
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
            return 0;
          }
          // Neueste zuerst
          return dateB.getTime() - dateA.getTime();
        } catch (error) {
          return 0;
        }
      });
      return dateKeysCopy;
    } catch (error) {
      console.error('Fehler beim Sortieren der Daten:', error);
      return [];
    }
  }, [groupedEntriesKey]); // Verwende den stabilen Key statt groupedEntries direkt


  // Definiere expandAllRows und collapseAllRows nach sortedDates
  const expandAllRows = React.useCallback(() => {
    startTransition(() => {
      const allExpanded = new Set<string>();
      sortedDates.forEach(dateKey => {
        if (dateKey && typeof dateKey === 'string') {
          allExpanded.add(`date-${dateKey}`);
        }
      });
      setExpandedRows(allExpanded);
    });
  }, [sortedDates]);

  const collapseAllRows = React.useCallback(() => {
    startTransition(() => {
      setExpandedRows(new Set<string>());
    });
  }, []);

  const toggleRowExpansion = React.useCallback((rowKey: string) => {
    startTransition(() => {
      setExpandedRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(rowKey)) {
          newSet.delete(rowKey);
        } else {
          newSet.add(rowKey);
        }
        return newSet;
      });
    });
  }, []);

  // Automatisches Öffnen der ersten zwei Ordner beim initialen Laden
  useEffect(() => {
    if (!initializedRef.current && sortedDates.length > 0 && !loading && epaEntries.length > 0) {
      // Warte zwei Frames, um sicherzustellen, dass alles gerendert ist
      const timeoutId = setTimeout(() => {
        initializedRef.current = true;
        startTransition(() => {
          const newExpanded = new Set<string>();
          // Öffne die ersten zwei Ordner (neueste zuerst)
          sortedDates.slice(0, 2).forEach(dateKey => {
            if (dateKey && typeof dateKey === 'string') {
              newExpanded.add(`date-${dateKey}`);
            }
          });
          setExpandedRows(newExpanded);
        });
      }, 250); // Verzögerung, damit das DOM bereit ist
      
      return () => clearTimeout(timeoutId);
    }
  }, [sortedDates, loading, epaEntries.length]);
  
  // Aktualisiere lastEpaLoadTimeRef nach dem ersten Laden der Daten
  useEffect(() => {
    if (!loading && epaEntries.length > 0 && lastEpaLoadTimeRef.current === 0) {
      lastEpaLoadTimeRef.current = Date.now();
    }
  }, [loading, epaEntries.length]);

  // Ref um zu verhindern, dass zu oft geladen wird
  const isLoadingMoreRef = useRef(false);
  
  // Einfacher Scroll-Handler für Lazy Loading
  useEffect(() => {
    if (sortedDates.length <= visibleDatesCount) return;
    
    let timeoutId: NodeJS.Timeout;
    
    const handleScroll = () => {
      // Verhindere mehrfaches Auslösen
      if (isLoadingMoreRef.current) return;
      
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      
      // Prüfe ob nahe am Ende (aber nicht ganz oben oder ganz unten)
      const distanceFromBottom = documentHeight - (scrollY + windowHeight);
      const isNearBottom = distanceFromBottom < 500 && distanceFromBottom > 50;
      
      if (isNearBottom && visibleDatesCount < sortedDates.length) {
        isLoadingMoreRef.current = true;
        
        // Verwende startTransition für nicht-blockierende Updates
        startTransition(() => {
          const newCount = Math.min(visibleDatesCount + 10, sortedDates.length);
          setVisibleDatesCount(newCount);
          
          // Reset nach Verzögerung
          setTimeout(() => {
            isLoadingMoreRef.current = false;
          }, 500);
        });
      }
    };
    
    // Debounced scroll handler
    const debouncedHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 150);
    };
    
    window.addEventListener('scroll', debouncedHandleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', debouncedHandleScroll);
      clearTimeout(timeoutId);
      isLoadingMoreRef.current = false;
    };
  }, [sortedDates.length, visibleDatesCount]);
  
  // Funktion zum manuellen Laden weiterer Einträge
  const handleLoadMore = useCallback(() => {
    if (visibleDatesCount < sortedDates.length && !isLoadingMoreRef.current) {
      isLoadingMoreRef.current = true;
      startTransition(() => {
        setVisibleDatesCount(prev => Math.min(prev + 10, sortedDates.length));
        setTimeout(() => {
          isLoadingMoreRef.current = false;
        }, 500);
      });
    }
  }, [sortedDates.length, visibleDatesCount]);


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
      <Box
        sx={{
          willChange: 'auto',
          contain: 'layout style paint',
        }}
      >
      {/* Filter und Suche */}
      <Paper sx={{ p: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 2 } }}>
        <Stack direction={isMobile ? 'column' : 'row'} spacing={{ xs: 1, sm: 2 }} alignItems="center" flexWrap="wrap">
          <TextField
            placeholder="Suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            fullWidth={isMobile}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
            sx={{ flex: isMobile ? 'none' : 1, minWidth: { xs: '100%', sm: 200 } }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 }, width: { xs: '100%', sm: 'auto' } }}>
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
              <MenuItem value="allergy">Allergien</MenuItem>
              <MenuItem value="infection">Infektionen</MenuItem>
              <MenuItem value="pregnancy">Schwangerschaft</MenuItem>
              <MenuItem value="pacemaker">Schrittmacher</MenuItem>
              <MenuItem value="defibrillator">Defibrillator</MenuItem>
              <MenuItem value="implant">Implantate</MenuItem>
              <MenuItem value="preExistingCondition">Vorerkrankungen</MenuItem>
              <MenuItem value="medicalHistory">Medizinische Vorgeschichte</MenuItem>
              <MenuItem value="surgery">Operationen</MenuItem>
              <MenuItem value="vaccination">Impfungen</MenuItem>
              <MenuItem value="bloodType">Blutgruppe</MenuItem>
              <MenuItem value="anthropometry">Körpermaße</MenuItem>
              <MenuItem value="smokingStatus">Raucherstatus</MenuItem>
            </Select>
          </FormControl>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<UnfoldMore />}
              onClick={expandAllRows}
              disabled={sortedDates.length > 0 && sortedDates.every(dateKey => expandedRows.has(`date-${dateKey}`))}
            >
              Alle öffnen
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<UnfoldLess />}
              onClick={collapseAllRows}
              disabled={expandedRows.size === 0}
            >
              Alle schließen
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Gruppierte Darstellung nach Datum - OPTIMIERT: Lazy Rendering */}
      {sortedDates.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Alert severity="info">Keine Einträge gefunden</Alert>
        </Paper>
      ) : (
        <Stack 
          spacing={2}
          sx={{
            willChange: 'auto',
            contain: 'layout style paint',
            transform: 'translateZ(0)', // GPU-Beschleunigung
          }}
        >
          {sortedDates.slice(0, visibleDatesCount).map((dateKey) => {
            try {
              const entries = (groupedEntries && groupedEntries[dateKey]) || [];
              const groupedEntriesForDate = (groupEntriesByType && groupEntriesByType[dateKey]) || [];
              const isExpanded = expandedRows.has(`date-${dateKey}`);
              
              return (
                <EPADateCard
                  key={`epa-date-${dateKey}`}
                  dateKey={dateKey}
                  entries={entries}
                  groupedEntriesForDate={groupedEntriesForDate}
                  isExpanded={isExpanded}
                  onToggle={toggleRowExpansion}
                  patientId={patientId}
                  onNavigate={onNavigate}
                  onTabChange={onTabChange}
                  getTypeIcon={getTypeIcon}
                  getTypeLabel={getTypeLabel}
                  getTypeColor={getTypeColor}
                />
              );
            } catch (dateError) {
              console.error(`Fehler beim Rendern von Datum ${dateKey}:`, dateError);
              return null;
            }
          })}
          {sortedDates.length > visibleDatesCount && (
            <Box 
              id="epa-load-more-sentinel"
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                p: 2, 
                gap: 2,
                minHeight: '100px'
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {visibleDatesCount} von {sortedDates.length} Datum-Karten angezeigt
              </Typography>
              <Button
                variant="outlined"
                onClick={handleLoadMore}
                disabled={visibleDatesCount >= sortedDates.length}
              >
                Weitere {Math.min(10, sortedDates.length - visibleDatesCount)} Datum-Karten laden
              </Button>
            </Box>
          )}
        </Stack>
      )}

      {/* Zusammenfassung - OPTIMIERT: Verwende useMemo für Zählungen */}
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
          <Chip label={`Termine: ${typeCounts.appointment || 0}`} size="small" color="primary" />
          <Chip label={`Dekurs: ${typeCounts.dekurs || 0}`} size="small" color="info" />
          <Chip label={`Diagnosen: ${typeCounts.diagnosis || 0}`} size="small" color="error" />
          <Chip label={`Medikation: ${typeCounts.medication || 0}`} size="small" color="warning" />
          <Chip label={`Labor: ${typeCounts.labor || 0}`} size="small" color="success" />
          <Chip label={`DICOM: ${typeCounts.dicom || 0}`} size="small" color="secondary" />
          <Chip label={`Dokumente: ${typeCounts.document || 0}`} size="small" />
          <Chip label={`Fotos: ${typeCounts.photo || 0}`} size="small" />
          <Chip label={`Vitalwerte: ${typeCounts.vital || 0}`} size="small" color="warning" />
          <Chip label={`Allergien: ${typeCounts.allergy || 0}`} size="small" color="error" />
          <Chip label={`Infektionen: ${typeCounts.infection || 0}`} size="small" color="error" />
          <Chip label={`Schwangerschaft: ${typeCounts.pregnancy || 0}`} size="small" color="info" />
          <Chip label={`Schrittmacher: ${typeCounts.pacemaker || 0}`} size="small" color="secondary" />
          <Chip label={`Defibrillator: ${typeCounts.defibrillator || 0}`} size="small" color="secondary" />
          <Chip label={`Implantate: ${typeCounts.implant || 0}`} size="small" color="info" />
          <Chip label={`Vorerkrankungen: ${typeCounts.preExistingCondition || 0}`} size="small" color="error" />
          <Chip label={`Med. Vorgeschichte: ${typeCounts.medicalHistory || 0}`} size="small" color="info" />
          <Chip label={`Operationen: ${typeCounts.surgery || 0}`} size="small" color="error" />
          <Chip label={`Impfungen: ${typeCounts.vaccination || 0}`} size="small" color="success" />
          <Chip label={`Blutgruppe: ${typeCounts.bloodType || 0}`} size="small" color="warning" />
          <Chip label={`Körpermaße: ${typeCounts.anthropometry || 0}`} size="small" color="info" />
          <Chip label={`Raucherstatus: ${typeCounts.smokingStatus || 0}`} size="small" color="warning" />
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

