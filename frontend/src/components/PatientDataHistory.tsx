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
  CircularProgress
} from '@mui/material';
import {
  History,
  Close,
  Visibility,
  CompareArrows
} from '@mui/icons-material';
import api from '../utils/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface PatientDataHistoryEntry {
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
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    phone?: string;
    email?: string;
    address?: {
      street?: string;
      city?: string;
      zipCode?: string;
      postalCode?: string;
      country?: string;
    };
    insuranceNumber?: string;
    insuranceProvider?: string;
    socialSecurityNumber?: string;
    emergencyContact?: {
      name?: string;
      phone?: string;
      relationship?: string;
    };
    primaryCarePhysician?: {
      name?: string;
      location?: string;
      phone?: string;
    };
    status?: string;
  };
  changedFields?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  changeNotes?: string;
}

interface PatientDataHistoryProps {
  patientId: string;
}

const PatientDataHistory: React.FC<PatientDataHistoryProps> = ({ patientId }) => {
  const [history, setHistory] = useState<PatientDataHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<PatientDataHistoryEntry | null>(null);
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
      const response = await api.get<any>(`/patient-data-history/patient/${patientId}?limit=50`);
      if (response.success) {
        setHistory(response.data?.data || []);
      } else {
        setError('Fehler beim Laden der Historie');
      }
    } catch (err: any) {
      console.error('Error loading patient data history:', err);
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
      firstName: 'Vorname',
      lastName: 'Nachname',
      dateOfBirth: 'Geburtsdatum',
      gender: 'Geschlecht',
      phone: 'Telefon',
      email: 'E-Mail',
      socialSecurityNumber: 'Sozialversicherungsnummer',
      insuranceProvider: 'Versicherungsträger',
      insuranceNumber: 'Versicherungsnummer',
      status: 'Status',
      'address.street': 'Straße',
      'address.city': 'Stadt',
      'address.zipCode': 'PLZ',
      'address.postalCode': 'PLZ',
      'address.country': 'Land',
      'emergencyContact.name': 'Notfallkontakt Name',
      'emergencyContact.phone': 'Notfallkontakt Telefon',
      'emergencyContact.relationship': 'Notfallkontakt Beziehung',
      'primaryCarePhysician.name': 'Hausarzt Name',
      'primaryCarePhysician.location': 'Hausarzt Ort',
      'primaryCarePhysician.phone': 'Hausarzt Telefon',
      referralSource: 'Überweisungsquelle',
      referralDoctor: 'Überweisender Arzt',
      visitReason: 'Besuchsgrund'
    };
    return fieldMap[field] || field;
  };

  const formatValue = (value: any, fieldName?: string): string => {
    if (value === null || value === undefined) return 'Nicht erfasst';
    if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
    if (Array.isArray(value)) return value.length > 0 ? `${value.length} Einträge` : 'Keine';
    if (typeof value === 'object') {
      if (fieldName?.startsWith('address.')) {
        return JSON.stringify(value);
      }
      return JSON.stringify(value);
    }
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
    if (fieldName === 'dateOfBirth' || fieldName.includes('date')) {
      try {
        return <Typography variant="body2">{formatDate(value)}</Typography>;
      } catch {
        return <Typography variant="body2">{String(value)}</Typography>;
      }
    }

    if (fieldName === 'gender') {
      const genderMap: { [key: string]: string } = {
        'm': 'Männlich',
        'w': 'Weiblich',
        'f': 'Weiblich',
        'd': 'Divers',
        'männlich': 'Männlich',
        'weiblich': 'Weiblich',
        'divers': 'Divers'
      };
      return <Typography variant="body2">{genderMap[String(value).toLowerCase()] || value}</Typography>;
    }

    if (fieldName === 'status') {
      const statusMap: { [key: string]: string } = {
        'aktiv': 'Aktiv',
        'inaktiv': 'Inaktiv',
        'wartend': 'Wartend'
      };
      return <Typography variant="body2">{statusMap[String(value)] || value}</Typography>;
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

  const renderSnapshotDetails = (snapshot: PatientDataHistoryEntry['snapshot']) => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
            <Typography variant="caption" color="text.secondary">Vorname</Typography>
            <Typography variant="body2">{snapshot.firstName || 'Nicht erfasst'}</Typography>
          </Box>
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
            <Typography variant="caption" color="text.secondary">Nachname</Typography>
            <Typography variant="body2">{snapshot.lastName || 'Nicht erfasst'}</Typography>
          </Box>
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
            <Typography variant="caption" color="text.secondary">Geburtsdatum</Typography>
            <Typography variant="body2">
              {snapshot.dateOfBirth ? formatDate(snapshot.dateOfBirth) : 'Nicht erfasst'}
            </Typography>
          </Box>
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
            <Typography variant="caption" color="text.secondary">Geschlecht</Typography>
            <Typography variant="body2">{snapshot.gender || 'Nicht erfasst'}</Typography>
          </Box>
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
            <Typography variant="caption" color="text.secondary">Telefon</Typography>
            <Typography variant="body2">{snapshot.phone || 'Nicht erfasst'}</Typography>
          </Box>
          <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
            <Typography variant="caption" color="text.secondary">E-Mail</Typography>
            <Typography variant="body2">{snapshot.email || 'Nicht erfasst'}</Typography>
          </Box>
        </Box>
        {snapshot.address && (
          <Box>
            <Typography variant="caption" color="text.secondary">Adresse</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {snapshot.address.street || ''} {snapshot.address.zipCode || snapshot.address.postalCode || ''} {snapshot.address.city || ''}
              {snapshot.address.country && `, ${snapshot.address.country}`}
            </Typography>
          </Box>
        )}
        {snapshot.emergencyContact && (snapshot.emergencyContact.name || snapshot.emergencyContact.phone) && (
          <Box>
            <Typography variant="caption" color="text.secondary">Notfallkontakt</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {snapshot.emergencyContact.name || ''}
              {snapshot.emergencyContact.phone && ` - ${snapshot.emergencyContact.phone}`}
              {snapshot.emergencyContact.relationship && ` (${snapshot.emergencyContact.relationship})`}
            </Typography>
          </Box>
        )}
        {snapshot.primaryCarePhysician && snapshot.primaryCarePhysician.name && (
          <Box>
            <Typography variant="caption" color="text.secondary">Hausarzt</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {snapshot.primaryCarePhysician.name}
              {snapshot.primaryCarePhysician.location && ` - ${snapshot.primaryCarePhysician.location}`}
              {snapshot.primaryCarePhysician.phone && ` - ${snapshot.primaryCarePhysician.phone}`}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Stammdaten - Verlauf</Typography>
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

export default PatientDataHistory;










