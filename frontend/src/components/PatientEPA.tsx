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
import { fetchAppointments } from '../store/slices/appointmentSlice';
import { fetchPatientDiagnoses } from '../store/slices/diagnosisSlice';
import { fetchDocuments } from '../store/slices/documentSlice';
import { fetchDekursEntries } from '../store/slices/dekursSlice';
import { fetchVitalSigns } from '../store/slices/vitalSignsSlice';
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
        willChange: 'auto'
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

        <Collapse in={isExpanded} timeout={0} unmountOnExit={false} sx={{ overflow: 'hidden' }}>
          <Box 
            key={`epa-content-${dateKey}`}
            sx={{ 
              p: 2,
              display: 'block'
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
  // Custom comparison function für React.memo
  // Prüfe alle relevanten Props
  if (prevProps.dateKey !== nextProps.dateKey) return false;
  if (prevProps.isExpanded !== nextProps.isExpanded) return false;
  if (prevProps.patientId !== nextProps.patientId) return false;
  if (prevProps.entries.length !== nextProps.entries.length) return false;
  if (prevProps.groupedEntriesForDate.length !== nextProps.groupedEntriesForDate.length) return false;
  
  // Prüfe, ob sich die Entry-IDs geändert haben
  const prevEntryIds = prevProps.entries.map(e => e.id).sort().join(',');
  const nextEntryIds = nextProps.entries.map(e => e.id).sort().join(',');
  if (prevEntryIds !== nextEntryIds) return false;
  
  // Prüfe, ob sich die GroupedEntry-IDs geändert haben
  const prevGroupedIds = prevProps.groupedEntriesForDate.map(e => e.id).sort().join(',');
  const nextGroupedIds = nextProps.groupedEntriesForDate.map(e => e.id).sort().join(',');
  if (prevGroupedIds !== nextGroupedIds) return false;
  
  // Funktions-Referenzen werden ignoriert, da sie mit useCallback stabilisiert sind
  // Alle relevanten Props sind gleich, kein Re-Render nötig
  return true;
});

EPADateCard.displayName = 'EPADateCard';

const PatientEPA: React.FC<PatientEPAProps> = ({ patientId, onNavigate, onTabChange }) => {
  const dispatch = useAppDispatch();
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
  
  // Debug: Logge Änderungen von patientFromStore und prüfe auf Datenänderungen
  useEffect(() => {
    if (patientFromStore) {
      const hasDataChanged = lastPatientFromStoreRef.current && (
        JSON.stringify(patientFromStore.infections || []) !== JSON.stringify(lastPatientFromStoreRef.current.infections || []) ||
        JSON.stringify(patientFromStore.allergies || []) !== JSON.stringify(lastPatientFromStoreRef.current.allergies || []) ||
        JSON.stringify(patientFromStore.currentMedications || []) !== JSON.stringify(lastPatientFromStoreRef.current.currentMedications || []) ||
        JSON.stringify(patientFromStore.preExistingConditions || []) !== JSON.stringify(lastPatientFromStoreRef.current.preExistingConditions || []) ||
        JSON.stringify(patientFromStore.medicalHistory || []) !== JSON.stringify(lastPatientFromStoreRef.current.medicalHistory || []) ||
        JSON.stringify(patientFromStore.previousSurgeries || []) !== JSON.stringify(lastPatientFromStoreRef.current.previousSurgeries || []) ||
        JSON.stringify(patientFromStore.vaccinations || []) !== JSON.stringify(lastPatientFromStoreRef.current.vaccinations || []) ||
        patientFromStore.bloodType !== lastPatientFromStoreRef.current.bloodType ||
        patientFromStore.height !== lastPatientFromStoreRef.current.height ||
        patientFromStore.weight !== lastPatientFromStoreRef.current.weight ||
        patientFromStore.bmi !== lastPatientFromStoreRef.current.bmi ||
        patientFromStore.smokingStatus !== lastPatientFromStoreRef.current.smokingStatus ||
        patientFromStore.hasPacemaker !== lastPatientFromStoreRef.current.hasPacemaker ||
        patientFromStore.hasDefibrillator !== lastPatientFromStoreRef.current.hasDefibrillator ||
        JSON.stringify(patientFromStore.implants || []) !== JSON.stringify(lastPatientFromStoreRef.current.implants || []) ||
        patientFromStore.isPregnant !== lastPatientFromStoreRef.current.isPregnant
      );
      
      console.log('🔍 patientFromStore geändert:', {
        patientId: patientFromStore._id || patientFromStore.id,
        updatedAt: patientFromStore.updatedAt,
        infections: patientFromStore.infections?.length || 0,
        hasDataChanged: hasDataChanged || !lastPatientFromStoreRef.current,
        previousUpdatedAt: lastPatientFromStoreRef.current?.updatedAt
      });
      
      // Speichere die aktuelle Version für den nächsten Vergleich
      lastPatientFromStoreRef.current = { ...patientFromStore };
    }
  }, [patientFromStore?.updatedAt, patientFromStore?._id]);

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
      initializedRef.current = false;
      prevPatientIdRef.current = patientId;
      prevDataHashRef.current = '';
      lastPatientUpdateRef.current = 0;
      lastEpaLoadTimeRef.current = Date.now();
      lastMedicalFieldsRef.current = null; // Reset medizinische Felder beim Patientenwechsel
    }
  }, [patientId]);
  
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
            // Die API-Antwort hat die Struktur: { success: true, data: { ...patient... } }
            // response.data ist das gesamte result Objekt, also response.data.data ist der Patient
            const apiResult = response.data || response;
            const patientData = (apiResult.success && apiResult.data) ? apiResult.data : (apiResult.data || apiResult);
            if (patientData) {
              setPatient(patientData);
            }
          }).catch((error: any) => {
            console.warn('Fehler beim Laden der Patientendaten:', error);
            // Fallback: Verwende Patient aus Redux Store, falls vorhanden
            if (patientFromStore) {
              setPatient(patientFromStore);
            } else {
              setPatient(null);
            }
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
  useEffect(() => {
    if (!patientId) {
      startTransition(() => {
        setEpaEntries([]);
      });
      return;
    }

    try {
      const entries: EPAEntry[] = [];

      // Termine
      try {
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

      // Medikamente - nur anzeigen wenn das Feld sich geändert hat
      try {
        if (patient && patient.currentMedications && Array.isArray(patient.currentMedications)) {
          // Prüfe, ob sich das Medikamente-Feld geändert hat
          const shouldShowMedications = shouldShowMedicalField('currentMedications', patient.currentMedications, patient.updatedAt, patient);
          
          if (shouldShowMedications) {
            patient.currentMedications.forEach((med: any, index: number) => {
              // Medikament kann ein String oder ein Objekt sein
              const medName = typeof med === 'string' ? med : (med.name || 'Unbekanntes Medikament');
              const medDosage = typeof med === 'object' ? med.dosage : '';
              const medFrequency = typeof med === 'object' ? med.frequency : '';
              const medStartDate = typeof med === 'object' ? med.startDate : null;
              const medPrescribedBy = typeof med === 'object' ? med.prescribedBy : '';
              
              // Bestimme das Datum für diesen Eintrag
              const medDate = medStartDate ? new Date(medStartDate) : (patient.updatedAt ? new Date(patient.updatedAt) : null);
            
            // Erstelle Beschreibung aus Dosierung, Häufigkeit, etc.
            const medDescription = [
              medDosage && `Dosierung: ${medDosage}`,
              medFrequency && `Häufigkeit: ${medFrequency}`,
              medPrescribedBy && `Verschrieben von: ${medPrescribedBy}`
            ].filter(Boolean).join(', ') || 'Medikament erfasst';
            
            entries.push({
              id: `medication-${patientId}-${index}-${medDate ? medDate.getTime() : Date.now()}`,
              type: 'medication',
              date: medDate || new Date(),
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
          }
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Medikamenten:', error);
      }

      // Dokumente
      try {
        const docsArray = Array.isArray(documents) ? documents : ((documents as any)?.data || []);
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

      // Allergien - nur anzeigen wenn das Feld sich geändert hat
      try {
        if (patient && patient.allergies && Array.isArray(patient.allergies) && patient.allergies.length > 0) {
          // Prüfe, ob sich das Allergien-Feld geändert hat
          const shouldShowAllergies = shouldShowMedicalField('allergies', patient.allergies, patient.updatedAt, patient);
          
          if (shouldShowAllergies) {
            patient.allergies.forEach((allergy: any, index: number) => {
              // Unterstütze verschiedene Formate: String, Objekt mit name/description/substance
              const allergyName = typeof allergy === 'string' 
                ? allergy 
                : (allergy.name || allergy.description || allergy.substance || allergy.type || 'Unbekannte Allergie');
              const allergySeverity = typeof allergy === 'object' ? (allergy.severity || allergy.reaction) : '';
              const allergyNotes = typeof allergy === 'object' ? allergy.notes : '';
              
              // Überspringe leere Allergien
              if (!allergyName || allergyName.trim() === '' || allergyName === 'Unbekannte Allergie') {
                return;
              }
              
              // Verwende patient.updatedAt als Datum (Allergien haben kein individuelles Datum)
              const allergyDate = patient.updatedAt ? new Date(patient.updatedAt) : null;
            
            entries.push({
              id: `allergy-${patientId}-${index}-${allergyDate ? allergyDate.getTime() : Date.now()}`,
              type: 'allergy',
              date: allergyDate || new Date(),
              title: allergyName,
              description: [allergySeverity, allergyNotes].filter(Boolean).join(' - ') || 'Allergie erfasst',
              status: 'aktiv',
              metadata: {
                ...(typeof allergy === 'object' ? allergy : { name: allergy }),
                patientId: patientId
              },
              changeType: 'added'
            });
            });
          }
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Allergien:', error);
      }

      // Infektionen - nur anzeigen wenn das Feld sich geändert hat
      try {
        if (patient && patient.infections && Array.isArray(patient.infections) && patient.infections.length > 0) {
          // Prüfe, ob sich das Infektionen-Feld geändert hat
          const shouldShowInfections = shouldShowMedicalField('infections', patient.infections, patient.updatedAt, patient);
          
          if (shouldShowInfections) {
            patient.infections.forEach((infection: any, index: number) => {
              if (!infection.type || !infection.type.trim()) return;
              
              const infectionType = infection.type;
              const infectionLocation = infection.location || '';
              const infectionStatus = infection.status || 'active';
              // Verwende detectedDate wenn vorhanden, sonst patient.updatedAt
              const infectionDate = infection.detectedDate 
                ? new Date(infection.detectedDate) 
                : (patient.updatedAt ? new Date(patient.updatedAt) : null);
              const infectionNotes = infection.notes || '';
            
            // Bestimme Farbe basierend auf Infektionstyp
            const isMRSA = infectionType.toUpperCase().includes('MRSA');
            const isMRGN = infectionType.toUpperCase().includes('MRGN');
            const isCritical = isMRSA || isMRGN;
            
            const description = [
              infectionLocation && `Ort: ${infectionLocation}`,
              `Status: ${infectionStatus === 'active' ? 'Aktiv' : infectionStatus === 'resolved' ? 'Abgeklungen' : 'Kolonisiert'}`,
              infectionNotes
            ].filter(Boolean).join(' - ') || 'Infektion erfasst';
            
            entries.push({
              id: `infection-${patientId}-${index}-${infectionDate ? infectionDate.getTime() : Date.now()}`,
              type: 'infection',
              date: infectionDate || new Date(),
              title: infectionType,
              description: description,
              status: isCritical ? 'kritisch' : 'erfasst',
              metadata: {
                ...infection,
                isCritical,
                patientId: patientId
              },
              changeType: 'added'
            });
            });
          }
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Infektionen:', error);
      }

      // Schwangerschaft - nur anzeigen wenn das Feld sich geändert hat
      try {
        if (patient && (patient.isPregnant || patient.pregnancyWeek)) {
          const pregnancyDate = patient.pregnancyWeekDate || patient.updatedAt || null;
          const pregnancyDateObj = pregnancyDate ? new Date(pregnancyDate) : null;
          
          // Prüfe, ob sich das Schwangerschaft-Feld geändert hat
          if (!shouldShowMedicalField('isPregnant', patient.isPregnant, pregnancyDateObj, patient)) {
            return;
          }
          
          const pregnancyWeek = patient.pregnancyWeek || '';
          const isBreastfeeding = patient.isBreastfeeding || false;
          
          const description = [
            pregnancyWeek && `${pregnancyWeek}. Woche`,
            isBreastfeeding && 'Stillend'
          ].filter(Boolean).join(' - ') || 'Schwangerschaft erfasst';
          
          entries.push({
            id: `pregnancy-${patientId}-${pregnancyDateObj ? pregnancyDateObj.getTime() : Date.now()}`,
            type: 'pregnancy',
            date: pregnancyDateObj || new Date(),
            title: 'Schwangerschaft',
            description: description,
            status: patient.isPregnant ? 'aktiv' : 'beendet',
            metadata: {
              isPregnant: patient.isPregnant,
              pregnancyWeek: patient.pregnancyWeek,
              isBreastfeeding: patient.isBreastfeeding,
              patientId: patientId
            },
            changeType: 'added'
          });
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Schwangerschaft:', error);
      }

      // Schrittmacher - nur anzeigen wenn das Feld sich geändert hat
      try {
        if (patient && patient.hasPacemaker) {
          const pacemakerDate = patient.updatedAt ? new Date(patient.updatedAt) : null;
          
          // Prüfe, ob sich das Schrittmacher-Feld geändert hat
          if (!shouldShowMedicalField('hasPacemaker', patient.hasPacemaker, pacemakerDate, patient)) {
            return;
          }
          
          entries.push({
            id: `pacemaker-${patientId}-${pacemakerDate ? pacemakerDate.getTime() : Date.now()}`,
            type: 'pacemaker',
            date: pacemakerDate || new Date(),
            title: 'Schrittmacher',
            description: patient.pacemakerNotes || 'Schrittmacher erfasst',
            status: 'aktiv',
            metadata: {
              hasPacemaker: true,
              pacemakerNotes: patient.pacemakerNotes,
              patientId: patientId
            },
            changeType: 'added'
          });
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Schrittmacher:', error);
      }

      // Defibrillator - nur anzeigen wenn das Feld sich geändert hat
      try {
        if (patient && patient.hasDefibrillator) {
          const defibrillatorDate = patient.updatedAt ? new Date(patient.updatedAt) : null;
          
          // Prüfe, ob sich das Defibrillator-Feld geändert hat
          if (!shouldShowMedicalField('hasDefibrillator', patient.hasDefibrillator, defibrillatorDate, patient)) {
            return;
          }
          
          entries.push({
            id: `defibrillator-${patientId}-${defibrillatorDate ? defibrillatorDate.getTime() : Date.now()}`,
            type: 'defibrillator',
            date: defibrillatorDate || new Date(),
            title: 'Defibrillator (ICD)',
            description: patient.defibrillatorNotes || 'Defibrillator erfasst',
            status: 'aktiv',
            metadata: {
              hasDefibrillator: true,
              defibrillatorNotes: patient.defibrillatorNotes,
              patientId: patientId
            },
            changeType: 'added'
          });
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Defibrillator:', error);
      }

      // Implantate - nur anzeigen wenn das Feld sich geändert hat
      try {
        if (patient && patient.implants && Array.isArray(patient.implants) && patient.implants.length > 0) {
          // Prüfe, ob sich das Implantate-Feld geändert hat
          const shouldShowImplants = shouldShowMedicalField('implants', patient.implants, patient.updatedAt, patient);
          
          if (shouldShowImplants) {
            patient.implants.forEach((implant: any, index: number) => {
              if (!implant || (!implant.type && !implant.name)) return;
              
              const implantType = implant.type || implant.name || 'Implantat';
              // Verwende implant.date wenn vorhanden, sonst patient.updatedAt
              const implantDate = implant.date 
                ? new Date(implant.date) 
                : (patient.updatedAt ? new Date(patient.updatedAt) : null);
              const implantLocation = implant.location || '';
              const implantNotes = implant.notes || '';
            
            const description = [
              implantLocation && `Ort: ${implantLocation}`,
              implantNotes
            ].filter(Boolean).join(' - ') || 'Implantat erfasst';
            
            entries.push({
              id: `implant-${patientId}-${index}-${implantDate ? implantDate.getTime() : Date.now()}`,
              type: 'implant',
              date: implantDate || new Date(),
              title: implantType,
              description: description,
              status: 'aktiv',
              metadata: {
                ...implant,
                patientId: patientId
              },
              changeType: 'added'
            });
            });
          }
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Implantaten:', error);
      }

      // Vorerkrankungen - nur anzeigen wenn das Feld sich geändert hat
      try {
        if (patient && patient.preExistingConditions && Array.isArray(patient.preExistingConditions) && patient.preExistingConditions.length > 0) {
          // Prüfe, ob sich das Vorerkrankungen-Feld geändert hat
          const shouldShowConditions = shouldShowMedicalField('preExistingConditions', patient.preExistingConditions, patient.updatedAt, patient);
          
          if (shouldShowConditions) {
            patient.preExistingConditions.forEach((condition: any, index: number) => {
              if (!condition || (typeof condition === 'string' && condition.trim() === '')) return;
              
              const conditionName = typeof condition === 'string' ? condition : (condition.name || condition.description || 'Vorerkrankung');
              const conditionDate = patient.updatedAt ? new Date(patient.updatedAt) : null;
            
            entries.push({
              id: `preExistingCondition-${patientId}-${index}-${conditionDate ? conditionDate.getTime() : Date.now()}`,
              type: 'preExistingCondition',
              date: conditionDate || new Date(),
              title: conditionName,
              description: 'Vorerkrankung erfasst',
              status: 'aktiv',
              metadata: {
                condition: typeof condition === 'string' ? condition : condition,
                patientId: patientId
              },
              changeType: 'added'
            });
            });
          }
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Vorerkrankungen:', error);
      }

      // Medizinische Vorgeschichte - nur anzeigen wenn das Feld sich geändert hat
      try {
        if (patient && patient.medicalHistory && Array.isArray(patient.medicalHistory) && patient.medicalHistory.length > 0) {
          // Prüfe, ob sich das Medizinische Vorgeschichte-Feld geändert hat
          const shouldShowHistory = shouldShowMedicalField('medicalHistory', patient.medicalHistory, patient.updatedAt, patient);
          
          if (shouldShowHistory) {
            patient.medicalHistory.forEach((history: any, index: number) => {
              if (!history || (typeof history === 'string' && history.trim() === '')) return;
              
              const historyText = typeof history === 'string' ? history : (history.description || history.text || 'Medizinische Vorgeschichte');
              const historyDate = patient.updatedAt ? new Date(patient.updatedAt) : null;
            
            entries.push({
              id: `medicalHistory-${patientId}-${index}-${historyDate ? historyDate.getTime() : Date.now()}`,
              type: 'medicalHistory',
              date: historyDate || new Date(),
              title: 'Medizinische Vorgeschichte',
              description: historyText,
              status: 'erfasst',
              metadata: {
                history: typeof history === 'string' ? history : history,
                patientId: patientId
              },
              changeType: 'added'
            });
            });
          }
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten von medizinischer Vorgeschichte:', error);
      }

      // Vorherige Operationen - nur anzeigen wenn das Feld sich geändert hat
      try {
        if (patient && patient.previousSurgeries && Array.isArray(patient.previousSurgeries) && patient.previousSurgeries.length > 0) {
          // Prüfe, ob sich das Vorherige Operationen-Feld geändert hat
          const shouldShowSurgeries = shouldShowMedicalField('previousSurgeries', patient.previousSurgeries, patient.updatedAt, patient);
          
          if (shouldShowSurgeries) {
            patient.previousSurgeries.forEach((surgery: any, index: number) => {
              if (!surgery) return;
              
              const surgeryProcedure = typeof surgery === 'string' ? surgery : (surgery.procedure || surgery.name || 'Operation');
              const surgeryYear = typeof surgery === 'object' ? surgery.year : '';
              const surgeryHospital = typeof surgery === 'object' ? surgery.hospital : '';
              const surgerySurgeon = typeof surgery === 'object' ? surgery.surgeon : '';
              const surgeryDate = typeof surgery === 'object' && surgery.date ? new Date(surgery.date) : (patient.updatedAt ? new Date(patient.updatedAt) : null);
            
            const description = [
              surgeryYear && `Jahr: ${surgeryYear}`,
              surgeryHospital && `Krankenhaus: ${surgeryHospital}`,
              surgerySurgeon && `Chirurg: ${surgerySurgeon}`
            ].filter(Boolean).join(' - ') || 'Operation erfasst';
            
            entries.push({
              id: `surgery-${patientId}-${index}-${surgeryDate ? surgeryDate.getTime() : Date.now()}`,
              type: 'surgery',
              date: surgeryDate || new Date(),
              title: surgeryProcedure,
              description: description,
              status: 'abgeschlossen',
              metadata: {
                ...(typeof surgery === 'object' ? surgery : { procedure: surgery }),
                patientId: patientId
              },
              changeType: 'added'
            });
            });
          }
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten von vorherigen Operationen:', error);
      }

      // Impfungen - nur anzeigen wenn das Feld sich geändert hat
      try {
        if (patient && patient.vaccinations && Array.isArray(patient.vaccinations) && patient.vaccinations.length > 0) {
          // Prüfe, ob sich das Impfungen-Feld geändert hat
          const shouldShowVaccinations = shouldShowMedicalField('vaccinations', patient.vaccinations, patient.updatedAt, patient);
          
          if (shouldShowVaccinations) {
            patient.vaccinations.forEach((vaccination: any, index: number) => {
              if (!vaccination) return;
              
              const vaccinationName = typeof vaccination === 'string' ? vaccination : (vaccination.name || 'Impfung');
              const vaccinationDate = typeof vaccination === 'object' && vaccination.date ? new Date(vaccination.date) : (patient.updatedAt ? new Date(patient.updatedAt) : null);
              const vaccinationNextDue = typeof vaccination === 'object' ? vaccination.nextDue : '';
              const vaccinationNotes = typeof vaccination === 'object' ? vaccination.notes : '';
            
            const description = [
              vaccinationNextDue && `Nächste fällig: ${vaccinationNextDue}`,
              vaccinationNotes
            ].filter(Boolean).join(' - ') || 'Impfung erfasst';
            
            entries.push({
              id: `vaccination-${patientId}-${index}-${vaccinationDate ? vaccinationDate.getTime() : Date.now()}`,
              type: 'vaccination',
              date: vaccinationDate || new Date(),
              title: vaccinationName,
              description: description,
              status: 'erfasst',
              metadata: {
                ...(typeof vaccination === 'object' ? vaccination : { name: vaccination }),
                patientId: patientId
              },
              changeType: 'added'
            });
            });
          }
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Impfungen:', error);
      }

      // Blutgruppe - nur anzeigen wenn das Feld sich geändert hat
      try {
        if (patient && patient.bloodType && patient.bloodType !== 'Unbekannt') {
          const bloodTypeDate = patient.updatedAt ? new Date(patient.updatedAt) : null;
          
          // Prüfe, ob sich das Blutgruppe-Feld geändert hat
          if (shouldShowMedicalField('bloodType', patient.bloodType, bloodTypeDate, patient)) {
            entries.push({
              id: `bloodType-${patientId}-${bloodTypeDate ? bloodTypeDate.getTime() : Date.now()}`,
              type: 'bloodType',
              date: bloodTypeDate || new Date(),
              title: 'Blutgruppe',
              description: `Blutgruppe: ${patient.bloodType}`,
              status: 'erfasst',
              metadata: {
                bloodType: patient.bloodType,
                patientId: patientId
              },
              changeType: 'modified'
            });
          }
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Blutgruppe:', error);
      }

      // Größe/Gewicht/BMI - nur anzeigen wenn sich eines der Felder geändert hat
      try {
        if (patient && (patient.height || patient.weight || patient.bmi)) {
          const anthropometryDate = patient.updatedAt ? new Date(patient.updatedAt) : null;
          
          // Prüfe, ob sich eines der Körpermaße-Felder geändert hat
          const heightChanged = shouldShowMedicalField('height', patient.height, anthropometryDate, patient);
          const weightChanged = shouldShowMedicalField('weight', patient.weight, anthropometryDate, patient);
          const bmiChanged = shouldShowMedicalField('bmi', patient.bmi, anthropometryDate, patient);
          
          if (heightChanged || weightChanged || bmiChanged) {
            const anthropometryParts: string[] = [];
            if (patient.height) anthropometryParts.push(`Größe: ${patient.height} cm`);
            if (patient.weight) anthropometryParts.push(`Gewicht: ${patient.weight} kg`);
            if (patient.bmi) anthropometryParts.push(`BMI: ${patient.bmi}`);
            
            if (anthropometryParts.length > 0) {
              entries.push({
                id: `anthropometry-${patientId}-${anthropometryDate ? anthropometryDate.getTime() : Date.now()}`,
                type: 'anthropometry',
                date: anthropometryDate || new Date(),
                title: 'Körpermaße',
                description: anthropometryParts.join(', '),
                status: 'erfasst',
                metadata: {
                  height: patient.height,
                  weight: patient.weight,
                  bmi: patient.bmi,
                  patientId: patientId
                },
                changeType: 'modified'
              });
            }
          }
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Körpermaßen:', error);
      }

      // Raucherstatus - nur anzeigen wenn das Feld sich geändert hat
      try {
        if (patient && patient.smokingStatus && patient.smokingStatus !== 'non-smoker') {
          const smokingDate = patient.updatedAt ? new Date(patient.updatedAt) : null;
          
          // Prüfe, ob sich das Raucherstatus-Feld geändert hat
          if (shouldShowMedicalField('smokingStatus', patient.smokingStatus, smokingDate, patient)) {
            const smokingParts: string[] = [];
            const statusText = patient.smokingStatus === 'current-smoker' ? 'Raucher' : 
                              patient.smokingStatus === 'former-smoker' ? 'Ehemaliger Raucher' : 
                              'Nichtraucher';
            smokingParts.push(`Status: ${statusText}`);
            if (patient.cigarettesPerDay) smokingParts.push(`${patient.cigarettesPerDay} Zigaretten/Tag`);
            if (patient.yearsOfSmoking) smokingParts.push(`${patient.yearsOfSmoking} Jahre`);
            if (patient.quitSmokingDate) smokingParts.push(`Aufgehört: ${new Date(patient.quitSmokingDate).toLocaleDateString('de-DE')}`);
            
            entries.push({
              id: `smokingStatus-${patientId}-${smokingDate ? smokingDate.getTime() : Date.now()}`,
              type: 'smokingStatus',
              date: smokingDate || new Date(),
              title: 'Raucherstatus',
              description: smokingParts.join(', '),
              status: 'erfasst',
              metadata: {
                smokingStatus: patient.smokingStatus,
                cigarettesPerDay: patient.cigarettesPerDay,
                yearsOfSmoking: patient.yearsOfSmoking,
                quitSmokingDate: patient.quitSmokingDate,
                patientId: patientId
              },
              changeType: 'modified'
            });
          }
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten von Raucherstatus:', error);
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

      // Erstelle einen Hash aus den Entry-IDs, um zu prüfen, ob sich etwas geändert hat
      const newIds = entries.map(e => e.id).sort().join('|');
      const newDataHash = `${entries.length}|${newIds}`;
      
      // Prüfe, ob sich die Daten tatsächlich geändert haben
      if (prevDataHashRef.current === newDataHash) {
        return; // Keine Änderung, überspringe State-Update
      }
      
      prevDataHashRef.current = newDataHash;
      
      // Aktualisiere lastPatientUpdateRef nach dem Erstellen der EPA-Einträge
      // WICHTIG: Setze lastPatientUpdateRef auf den aktuellen patientUpdatedAt Wert,
      // damit beim nächsten Update erkannt wird, dass es ein neues Update ist
      // Dies stellt sicher, dass die gleichen Einträge beim nächsten Render nicht wieder angezeigt werden
      if (patient && patient.updatedAt) {
        const patientUpdatedAt = new Date(patient.updatedAt).getTime();
        // Aktualisiere lastPatientUpdateRef immer auf den aktuellen Wert, damit beim nächsten Update
        // die Differenz korrekt erkannt wird
        const previousValue = lastPatientUpdateRef.current;
        lastPatientUpdateRef.current = patientUpdatedAt;
        console.log('📝 Aktualisiere lastPatientUpdateRef nach EPA-Erstellung:', {
          previous: previousValue === 0 ? '0' : new Date(previousValue).toISOString(),
          new: new Date(lastPatientUpdateRef.current).toISOString(),
          isFirstLoad: previousValue === 0,
          isNewUpdate: previousValue > 0 && patientUpdatedAt > previousValue
        });
      }
      
      // Aktualisiere lastMedicalFieldsRef mit der aktuellen Version aller medizinischen Felder
      // Dies ermöglicht es, beim nächsten Mal genau zu erkennen, welche Felder sich geändert haben
      // WICHTIG: Initialisiere lastMedicalFieldsRef beim ersten Laden, damit wir beim nächsten Update
      // erkennen können, welche Felder sich geändert haben
      if (patient) {
        const wasFirstLoad = !lastMedicalFieldsRef.current;
        lastMedicalFieldsRef.current = {
          infections: patient.infections ? JSON.parse(JSON.stringify(patient.infections)) : undefined,
          allergies: patient.allergies ? JSON.parse(JSON.stringify(patient.allergies)) : undefined,
          currentMedications: patient.currentMedications ? JSON.parse(JSON.stringify(patient.currentMedications)) : undefined,
          preExistingConditions: patient.preExistingConditions ? JSON.parse(JSON.stringify(patient.preExistingConditions)) : undefined,
          medicalHistory: patient.medicalHistory ? JSON.parse(JSON.stringify(patient.medicalHistory)) : undefined,
          previousSurgeries: patient.previousSurgeries ? JSON.parse(JSON.stringify(patient.previousSurgeries)) : undefined,
          vaccinations: patient.vaccinations ? JSON.parse(JSON.stringify(patient.vaccinations)) : undefined,
          bloodType: patient.bloodType,
          height: patient.height,
          weight: patient.weight,
          bmi: patient.bmi,
          smokingStatus: patient.smokingStatus,
          hasPacemaker: patient.hasPacemaker,
          hasDefibrillator: patient.hasDefibrillator,
          implants: patient.implants ? JSON.parse(JSON.stringify(patient.implants)) : undefined,
          isPregnant: patient.isPregnant
        };
        console.log('📝 Aktualisiere lastMedicalFieldsRef nach EPA-Erstellung', {
          wasFirstLoad,
          willTrackChanges: !wasFirstLoad
        });
      }
      
      // Verwende startTransition für nicht-urgente State-Updates
      startTransition(() => {
        setEpaEntries(entries);
      });
    } catch (error) {
      console.error('Fehler beim Erstellen der EPA-Einträge:', error);
      startTransition(() => {
        setEpaEntries([]);
      });
    }
  }, [patientId, appointments, dekursEntries, patientDiagnoses, documents, laborResults, dicomStudies, photos, vitalSigns, patient, shouldShowMedicalField]);


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
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
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
            sx={{ flex: 1, minWidth: 200 }}
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
          <Chip label={`Allergien: ${(epaEntries || []).filter(e => e?.type === 'allergy').length}`} size="small" color="error" />
          <Chip label={`Infektionen: ${(epaEntries || []).filter(e => e?.type === 'infection').length}`} size="small" color="error" />
          <Chip label={`Schwangerschaft: ${(epaEntries || []).filter(e => e?.type === 'pregnancy').length}`} size="small" color="info" />
          <Chip label={`Schrittmacher: ${(epaEntries || []).filter(e => e?.type === 'pacemaker').length}`} size="small" color="secondary" />
          <Chip label={`Defibrillator: ${(epaEntries || []).filter(e => e?.type === 'defibrillator').length}`} size="small" color="secondary" />
          <Chip label={`Implantate: ${(epaEntries || []).filter(e => e?.type === 'implant').length}`} size="small" color="info" />
          <Chip label={`Vorerkrankungen: ${(epaEntries || []).filter(e => e?.type === 'preExistingCondition').length}`} size="small" color="error" />
          <Chip label={`Med. Vorgeschichte: ${(epaEntries || []).filter(e => e?.type === 'medicalHistory').length}`} size="small" color="info" />
          <Chip label={`Operationen: ${(epaEntries || []).filter(e => e?.type === 'surgery').length}`} size="small" color="error" />
          <Chip label={`Impfungen: ${(epaEntries || []).filter(e => e?.type === 'vaccination').length}`} size="small" color="success" />
          <Chip label={`Blutgruppe: ${(epaEntries || []).filter(e => e?.type === 'bloodType').length}`} size="small" color="warning" />
          <Chip label={`Körpermaße: ${(epaEntries || []).filter(e => e?.type === 'anthropometry').length}`} size="small" color="info" />
          <Chip label={`Raucherstatus: ${(epaEntries || []).filter(e => e?.type === 'smokingStatus').length}`} size="small" color="warning" />
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

