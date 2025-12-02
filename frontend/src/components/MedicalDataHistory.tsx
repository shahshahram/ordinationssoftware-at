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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Stack,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  History,
  Close,
  ExpandMore,
  Visibility,
  CompareArrows
} from '@mui/icons-material';
import api from '../utils/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface MedicalDataHistoryEntry {
  _id: string;
  recordedAt: string;
  recordedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  appointmentId?: {
    date: string;
    startTime: string;
    endTime: string;
  };
  snapshot: {
    bloodType?: string;
    height?: number;
    weight?: number;
    bmi?: number;
    allergies?: any[];
    currentMedications?: any[];
    preExistingConditions?: string[];
    medicalHistory?: string[];
    vaccinations?: any[];
    isPregnant?: boolean;
    pregnancyWeek?: number;
    isBreastfeeding?: boolean;
    hasPacemaker?: boolean;
    hasDefibrillator?: boolean;
    implants?: any[];
    smokingStatus?: string;
    cigarettesPerDay?: number;
    yearsOfSmoking?: number;
    quitSmokingDate?: string;
    notes?: string;
  };
  changedFields?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  changeNotes?: string;
}

interface MedicalDataHistoryProps {
  patientId: string;
}

const MedicalDataHistory: React.FC<MedicalDataHistoryProps> = ({ patientId }) => {
  const [history, setHistory] = useState<MedicalDataHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<MedicalDataHistoryEntry | null>(null);
  const [showInline, setShowInline] = useState(false);

  useEffect(() => {
    if (patientId && showInline) {
      loadHistory();
    }
  }, [patientId, showInline]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<any>(`/medical-data-history/patient/${patientId}?limit=50`);
      if (response.success) {
        setHistory(response.data?.data || []);
      } else {
        setError('Fehler beim Laden der Historie');
      }
    } catch (err: any) {
      console.error('Error loading medical data history:', err);
      setError(err.message || 'Fehler beim Laden der Historie');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
    } catch {
      return dateString;
    }
  };

  const formatFieldName = (field: string) => {
    const fieldMap: { [key: string]: string } = {
      bloodType: 'Blutgruppe',
      height: 'Größe',
      weight: 'Gewicht',
      bmi: 'BMI',
      allergies: 'Allergien',
      currentMedications: 'Medikamente',
      preExistingConditions: 'Vorerkrankungen',
      medicalHistory: 'Medizinische Vorgeschichte',
      vaccinations: 'Impfungen',
      isPregnant: 'Schwangerschaft',
      pregnancyWeek: 'Schwangerschaftswoche',
      isBreastfeeding: 'Stillen',
      hasPacemaker: 'Herzschrittmacher',
      hasDefibrillator: 'Defibrillator',
      implants: 'Implantate',
      smokingStatus: 'Raucherstatus',
      cigarettesPerDay: 'Zigaretten pro Tag',
      yearsOfSmoking: 'Raucherjahre',
      quitSmokingDate: 'Aufhördatum',
      notes: 'Notizen'
    };
    return fieldMap[field] || field;
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'Nicht erfasst';
    if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
    if (Array.isArray(value)) return value.length > 0 ? `${value.length} Einträge` : 'Keine';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const renderDetailedValue = (value: any, fieldName: string) => {
    if (value === null || value === undefined) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Nicht erfasst
        </Typography>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <Chip
          label={value ? 'Ja' : 'Nein'}
          size="small"
          color={value ? 'success' : 'default'}
          variant="outlined"
        />
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Keine Einträge
          </Typography>
        );
      }

      // Spezielle Behandlung für verschiedene Array-Typen
      if (fieldName === 'allergies') {
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {value.map((allergy, idx) => {
              // Wenn es ein String ist, einfach anzeigen
              if (typeof allergy === 'string') {
                return (
                  <Box key={idx} sx={{ p: 1, bgcolor: 'warning.light', borderRadius: 0.5, border: '1px solid', borderColor: 'warning.main' }}>
                    <Typography variant="body2" fontWeight="medium">
                      {allergy}
                    </Typography>
                  </Box>
                );
              }
              
              // Wenn es ein Objekt ist, strukturiert anzeigen
              // Laut Schema: { type, description, severity, reaction? }
              const allergyDescription = allergy.description || allergy.name || allergy.allergen || allergy.substance;
              const allergyType = allergy.type;
              const reaction = allergy.reaction || allergy.symptom || allergy.response;
              const severity = allergy.severity || allergy.grade;
              
              // Übersetze Schweregrad
              const severityText = severity === 'mild' ? 'leicht' : 
                                  severity === 'moderate' ? 'moderat' : 
                                  severity === 'severe' ? 'schwer' : severity;
              
              // Übersetze Typ
              const typeText = allergyType === 'medication' ? 'Medikament' :
                              allergyType === 'food' ? 'Nahrungsmittel' :
                              allergyType === 'environmental' ? 'Umwelt' :
                              allergyType === 'other' ? 'Sonstiges' : allergyType;
              
              return (
                <Box key={idx} sx={{ p: 1.5, bgcolor: 'warning.light', borderRadius: 0.5, border: '1px solid', borderColor: 'warning.main' }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                    {allergyDescription || 'Unbekannte Allergie'}
                  </Typography>
                  {allergyType && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                      Typ: {typeText}
                    </Typography>
                  )}
                  {severity && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                      Schweregrad: {severityText}
                    </Typography>
                  )}
                  {reaction && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Reaktion: {reaction}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        );
      }

      if (fieldName === 'currentMedications') {
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {value.map((med, idx) => (
              <Box key={idx} sx={{ p: 0.5, bgcolor: 'grey.50', borderRadius: 0.5 }}>
                <Typography variant="body2">
                  {typeof med === 'string' ? med : (med.name || JSON.stringify(med))}
                </Typography>
                {typeof med === 'object' && med.dosage && (
                  <Typography variant="caption" color="text.secondary">
                    Dosierung: {med.dosage}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        );
      }

      if (fieldName === 'preExistingConditions' || fieldName === 'medicalHistory') {
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {value.map((item, idx) => (
              <Chip
                key={idx}
                label={item}
                size="small"
                color="error"
                variant="outlined"
              />
            ))}
          </Box>
        );
      }

      if (fieldName === 'vaccinations') {
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {value.map((vacc, idx) => (
              <Box key={idx} sx={{ p: 0.5, bgcolor: 'grey.50', borderRadius: 0.5 }}>
                <Typography variant="body2">
                  {typeof vacc === 'string' ? vacc : (vacc.name || JSON.stringify(vacc))}
                </Typography>
                {typeof vacc === 'object' && vacc.date && (
                  <Typography variant="caption" color="text.secondary">
                    Datum: {formatDate(vacc.date)}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        );
      }

      if (fieldName === 'implants') {
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {value.map((implant, idx) => (
              <Box key={idx} sx={{ p: 0.5, bgcolor: 'grey.50', borderRadius: 0.5 }}>
                <Typography variant="body2">
                  {typeof implant === 'string' ? implant : (implant.type || implant.name || JSON.stringify(implant))}
                </Typography>
                {typeof implant === 'object' && implant.date && (
                  <Typography variant="caption" color="text.secondary">
                    Datum: {formatDate(implant.date)}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        );
      }

      // Generische Array-Darstellung
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {value.map((item, idx) => (
            <Typography key={idx} variant="body2" sx={{ pl: 1 }}>
              • {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
            </Typography>
          ))}
        </Box>
      );
    }

    if (typeof value === 'object') {
      return (
        <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 0.5, fontFamily: 'monospace' }}>
          <Typography variant="body2" component="pre" sx={{ margin: 0, fontSize: '0.75rem' }}>
            {JSON.stringify(value, null, 2)}
          </Typography>
        </Box>
      );
    }

    // Spezielle Formatierung für bestimmte Felder
    if (fieldName === 'height') {
      return <Typography variant="body2">{value} cm</Typography>;
    }
    if (fieldName === 'weight') {
      return <Typography variant="body2">{value} kg</Typography>;
    }
    if (fieldName === 'bmi') {
      return <Typography variant="body2">{typeof value === 'number' ? value.toFixed(1) : value}</Typography>;
    }
    if (fieldName === 'pregnancyWeek') {
      return <Typography variant="body2">Woche {value}</Typography>;
    }
    if (fieldName === 'cigarettesPerDay') {
      return <Typography variant="body2">{value} Zigaretten/Tag</Typography>;
    }
    if (fieldName === 'yearsOfSmoking') {
      return <Typography variant="body2">{value} Jahre</Typography>;
    }
    if (fieldName === 'quitSmokingDate') {
      return <Typography variant="body2">{formatDate(value)}</Typography>;
    }

    return <Typography variant="body2">{String(value)}</Typography>;
  };

  const renderHistoryContent = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      );
    }

    if (history.length === 0) {
      return (
        <Alert severity="info" sx={{ m: 2 }}>
          Noch keine Historie vorhanden
        </Alert>
      );
    }

    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Datum & Zeit</TableCell>
              <TableCell>Erfasst von</TableCell>
              <TableCell>Geänderte Felder</TableCell>
              <TableCell>Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((entry) => (
              <TableRow key={entry._id} hover>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(entry.recordedAt)}
                  </Typography>
                  {entry.appointmentId && (
                    <Typography variant="caption" color="text.secondary">
                      Termin: {formatDate(entry.appointmentId.date)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {entry.recordedBy?.firstName} {entry.recordedBy?.lastName}
                  </Typography>
                </TableCell>
                <TableCell>
                  {entry.changedFields && entry.changedFields.length > 0 ? (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {entry.changedFields.slice(0, 3).map((field, idx) => (
                        <Chip
                          key={idx}
                          label={formatFieldName(field.field)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                      {entry.changedFields.length > 3 && (
                        <Chip
                          label={`+${entry.changedFields.length - 3}`}
                          size="small"
                          color="default"
                        />
                      )}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Vollständiger Snapshot
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => setSelectedEntry(entry)}
                    title="Details anzeigen"
                  >
                    <Visibility fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderSnapshotDetails = (snapshot: MedicalDataHistoryEntry['snapshot']) => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
            <Typography variant="caption" color="text.secondary">Blutgruppe</Typography>
            <Typography variant="body2">{snapshot.bloodType || 'Nicht erfasst'}</Typography>
          </Box>
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
            <Typography variant="caption" color="text.secondary">Größe</Typography>
            <Typography variant="body2">{snapshot.height ? `${snapshot.height} cm` : 'Nicht erfasst'}</Typography>
          </Box>
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
            <Typography variant="caption" color="text.secondary">Gewicht</Typography>
            <Typography variant="body2">{snapshot.weight ? `${snapshot.weight} kg` : 'Nicht erfasst'}</Typography>
          </Box>
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
            <Typography variant="caption" color="text.secondary">BMI</Typography>
            <Typography variant="body2">{snapshot.bmi ? snapshot.bmi.toFixed(1) : 'Nicht erfasst'}</Typography>
          </Box>
        </Box>
        {snapshot.allergies && snapshot.allergies.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary">Allergien</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {snapshot.allergies.map((allergy, idx) => (
                <Chip key={idx} label={typeof allergy === 'string' ? allergy : allergy.name} size="small" />
              ))}
            </Box>
          </Box>
        )}
        {snapshot.currentMedications && snapshot.currentMedications.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary">Medikamente</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {snapshot.currentMedications.map((med, idx) => (
                <Chip key={idx} label={typeof med === 'string' ? med : med.name} size="small" color="primary" />
              ))}
            </Box>
          </Box>
        )}
        {snapshot.preExistingConditions && snapshot.preExistingConditions.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary">Vorerkrankungen</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {snapshot.preExistingConditions.map((condition, idx) => (
                <Chip key={idx} label={condition} size="small" color="error" />
              ))}
            </Box>
          </Box>
        )}
        {snapshot.notes && (
          <Box>
            <Typography variant="caption" color="text.secondary">Notizen</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>{snapshot.notes}</Typography>
          </Box>
        )}
      </Box>
    );
  };

  // Inline-Variante mit Toggle
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Medizinische Daten - Verlauf</Typography>
        <Button
          variant={showInline ? "contained" : "outlined"}
          startIcon={<History />}
          onClick={() => setShowInline(!showInline)}
          size="small"
        >
          {showInline ? 'Verlauf ausblenden' : 'Verlauf einblenden'}
        </Button>
      </Box>
      
      {showInline && (
        <Paper sx={{ p: 2, mt: 2 }}>
          {renderHistoryContent()}
        </Paper>
      )}

      {/* Detail-Dialog für einzelne Einträge */}
      <Dialog
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Historie-Details</Typography>
            <IconButton onClick={() => setSelectedEntry(null)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Datum & Zeit</Typography>
                <Typography variant="body1">{formatDate(selectedEntry.recordedAt)}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Erfasst von</Typography>
                <Typography variant="body1">
                  {selectedEntry.recordedBy?.firstName} {selectedEntry.recordedBy?.lastName}
                </Typography>
              </Box>
              {selectedEntry.changedFields && selectedEntry.changedFields.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                    Genaue Änderungen
                  </Typography>
                  <Stack spacing={2}>
                    {selectedEntry.changedFields.map((field, idx) => (
                      <Paper key={idx} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, color: 'primary.main' }}>
                          {formatFieldName(field.field)}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                          <Box sx={{ 
                            flex: 1, 
                            p: 1.5, 
                            bgcolor: 'rgba(211, 47, 47, 0.08)', 
                            borderRadius: 1, 
                            border: '2px solid',
                            borderColor: 'error.main'
                          }}>
                            <Typography variant="caption" fontWeight="bold" color="error.dark" sx={{ mb: 0.5, display: 'block' }}>
                              Alter Wert:
                            </Typography>
                            <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.9)', p: 1.5, borderRadius: 0.5, border: '1px solid', borderColor: 'error.light' }}>
                              {renderDetailedValue(field.oldValue, field.field)}
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CompareArrows fontSize="medium" color="primary" />
                          </Box>
                          <Box sx={{ 
                            flex: 1, 
                            p: 1.5, 
                            bgcolor: 'rgba(46, 125, 50, 0.08)', 
                            borderRadius: 1, 
                            border: '2px solid',
                            borderColor: 'success.main'
                          }}>
                            <Typography variant="caption" fontWeight="bold" color="success.dark" sx={{ mb: 0.5, display: 'block' }}>
                              Neuer Wert:
                            </Typography>
                            <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.9)', p: 1.5, borderRadius: 0.5, border: '1px solid', borderColor: 'success.light' }}>
                              {renderDetailedValue(field.newValue, field.field)}
                            </Box>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Vollständiger Snapshot</Typography>
                {renderSnapshotDetails(selectedEntry.snapshot)}
              </Box>
              {selectedEntry.changeNotes && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Notizen zur Änderung</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>{selectedEntry.changeNotes}</Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedEntry(null)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MedicalDataHistory;

