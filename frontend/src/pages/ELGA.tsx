import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  LocalHospital,
  Medication,
  Receipt,
  Description,
  Sync,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Refresh,
  Search,
  Download,
  Upload,
} from '@mui/icons-material';
import api from '../utils/api';
import { useAppSelector } from '../store/hooks';

interface ELGAStatus {
  configured: boolean;
  environment: string;
  hasCertificates: boolean;
  errors: string[];
}

interface ELGAPatient {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
  ecard?: {
    elgaId?: string;
    elgaStatus?: string;
  };
}

interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  prescriber: string;
}

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  quantity: number;
  date: string;
  prescriber: string;
  status: string;
}

interface ELGADocument {
  id: string;
  title: string;
  classCode: string;
  typeCode: string;
  date: string;
  author: string;
}

const ELGA: React.FC = () => {
  const { patients } = useAppSelector((state) => state.patients);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [elgaStatus, setElgaStatus] = useState<ELGAStatus | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<ELGAPatient | null>(null);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [documents, setDocuments] = useState<ELGADocument[]>([]);
  const [patientStatus, setPatientStatus] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  useEffect(() => {
    fetchELGAStatus();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      fetchPatientData();
    }
  }, [selectedPatient, activeTab]);

  const fetchELGAStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get<any>('/elga/status');
      if (response.success && response.data) {
        // Stelle sicher, dass errors immer ein Array ist
        const statusData = {
          ...response.data,
          errors: Array.isArray(response.data.errors) ? response.data.errors : []
        };
        setElgaStatus(statusData);
      }
    } catch (error: any) {
      console.error('Error fetching ELGA status:', error);
      showSnackbar('Fehler beim Laden des ELGA-Status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientData = async () => {
    if (!selectedPatient) return;

    try {
      setLoading(true);

      if (activeTab === 0) {
        // e-Medikation
        const response = await api.get<{ medications: MedicationItem[] }>(
          `/elga/patient/${selectedPatient._id || selectedPatient.id}/medication`
        );
        if (response.success && response.data) {
          setMedications(response.data.medications || []);
        }
      } else if (activeTab === 1) {
        // e-Rezepte
        const response = await api.get<{ prescriptions: Prescription[] }>(
          `/elga/patient/${selectedPatient._id || selectedPatient.id}/prescriptions`
        );
        if (response.success && response.data) {
          setPrescriptions(response.data.prescriptions || []);
        }
      } else if (activeTab === 2) {
        // e-Befunde/Dokumente
        const response = await api.get<{ documents: ELGADocument[] }>(
          `/elga/patient/${selectedPatient._id || selectedPatient.id}/documents`
        );
        if (response.success && response.data) {
          setDocuments(response.data.documents || []);
        }
      }

      // Patient-Status abrufen
      const statusResponse = await api.get<any>(
        `/elga/patient/${selectedPatient._id || selectedPatient.id}/status`
      );
      if (statusResponse.success && statusResponse.data) {
        setPatientStatus(statusResponse.data);
      }
    } catch (error: any) {
      console.error('Error fetching patient data:', error);
      // Wenn Patient nicht in ELGA registriert ist, ist das kein kritischer Fehler
      const errorMessage = error?.message || '';
      if (errorMessage.includes('nicht in ELGA registriert')) {
        setMedications([]);
        setPrescriptions([]);
        setDocuments([]);
        showSnackbar('Patient ist nicht in ELGA registriert', 'info');
      } else {
        showSnackbar('Fehler beim Laden der Patientendaten', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedPatient) return;

    try {
      setLoading(true);
      const response = await api.post<{ success: boolean; message: string }>(
        `/elga/patient/${selectedPatient._id || selectedPatient.id}/sync`
      );
      if (response.success) {
        showSnackbar('Patientendaten erfolgreich synchronisiert', 'success');
        await fetchPatientData();
        setSyncDialogOpen(false);
      }
    } catch (error: any) {
      console.error('Error syncing patient:', error);
      showSnackbar('Fehler bei der Synchronisierung', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            ELGA Integration
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Elektronische Gesundheitsakte und e-Medikation
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchELGAStatus}
          disabled={loading}
        >
          Status aktualisieren
        </Button>
      </Box>

      {/* ELGA Status */}
      {elgaStatus && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocalHospital sx={{ mr: 1, color: elgaStatus.configured ? 'success.main' : 'error.main' }} />
              <Typography variant="h6">ELGA-Systemstatus</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Konfiguriert
                </Typography>
                <Chip
                  label={elgaStatus.configured ? 'Ja' : 'Nein'}
                  color={elgaStatus.configured ? 'success' : 'error'}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Umgebung
                </Typography>
                <Typography variant="body1">{elgaStatus.environment}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Zertifikate
                </Typography>
                <Chip
                  label={elgaStatus.hasCertificates ? 'Vorhanden' : 'Fehlen'}
                  color={elgaStatus.hasCertificates ? 'success' : 'warning'}
                  size="small"
                />
              </Grid>
              {elgaStatus.errors && Array.isArray(elgaStatus.errors) && elgaStatus.errors.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="error">
                    <Typography variant="subtitle2" gutterBottom>
                      Konfigurationsfehler:
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {elgaStatus.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Patient-Auswahl */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Patient auswählen
          </Typography>
          <Autocomplete
            options={patients || []}
            getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
            isOptionEqualToValue={(option, value) => 
              (option._id || option.id) === (value._id || value.id)
            }
            value={selectedPatient as any}
            onChange={(_, newValue) => setSelectedPatient(newValue as ELGAPatient | null)}
            renderInput={(params) => (
              <TextField {...params} label="Patient" placeholder="Patient suchen..." />
            )}
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              const uniqueKey = option._id || option.id || `${option.firstName}-${option.lastName}-${option.dateOfBirth || Math.random()}`;
              return (
                <Box component="li" key={uniqueKey} {...otherProps}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography>{`${option.firstName} ${option.lastName}`}</Typography>
                      {option.ecard?.elgaId && (
                        <Chip
                          label={`ELGA-ID: ${option.ecard.elgaId}`}
                          size="small"
                          color="primary"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            }}
          />
          {selectedPatient && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<Sync />}
                onClick={() => setSyncDialogOpen(true)}
                disabled={loading}
              >
                Mit ELGA synchronisieren
              </Button>
              {patientStatus && (
                <Chip
                  label={`Status: ${patientStatus.status || 'Unbekannt'}`}
                  color={patientStatus.status === 'active' ? 'success' : 'default'}
                  size="small"
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Tabs für e-Medikation, e-Rezepte, e-Befunde */}
      {selectedPatient && (
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              <Tab icon={<Medication />} iconPosition="start" label="e-Medikation" />
              <Tab icon={<Receipt />} iconPosition="start" label="e-Rezepte" />
              <Tab icon={<Description />} iconPosition="start" label="e-Befunde" />
            </Tabs>
          </Box>

          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {activeTab === 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      e-Medikation
                    </Typography>
                    {medications.length === 0 ? (
                      <Alert severity="info">Keine Medikamente gefunden</Alert>
                    ) : (
                      <List>
                        {medications.map((med, index) => (
                          <React.Fragment key={med.id}>
                            <ListItem>
                              <ListItemIcon>
                                <Medication color="primary" />
                              </ListItemIcon>
                              <ListItemText
                                primary={med.name}
                                secondary={
                                  <>
                                    <Typography component="span" variant="body2">
                                      {med.dosage} • {med.frequency}
                                    </Typography>
                                    <br />
                                    <Typography component="span" variant="caption" color="text.secondary">
                                      {med.startDate} {med.endDate && `- ${med.endDate}`}
                                    </Typography>
                                    <br />
                                    <Typography component="span" variant="caption" color="text.secondary">
                                      Verschrieben von: {med.prescriber}
                                    </Typography>
                                  </>
                                }
                              />
                            </ListItem>
                            {index < medications.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    )}
                  </Box>
                )}

                {activeTab === 1 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      e-Rezepte
                    </Typography>
                    {prescriptions.length === 0 ? (
                      <Alert severity="info">Keine Rezepte gefunden</Alert>
                    ) : (
                      <List>
                        {prescriptions.map((prescription, index) => (
                          <React.Fragment key={prescription.id}>
                            <ListItem>
                              <ListItemIcon>
                                <Receipt color="primary" />
                              </ListItemIcon>
                              <ListItemText
                                primary={prescription.medication}
                                secondary={
                                  <>
                                    <Typography component="span" variant="body2">
                                      {prescription.dosage} • Menge: {prescription.quantity}
                                    </Typography>
                                    <br />
                                    <Typography component="span" variant="caption" color="text.secondary">
                                      {prescription.date} • {prescription.prescriber}
                                    </Typography>
                                    <br />
                                    <Chip
                                      label={prescription.status}
                                      size="small"
                                      color={prescription.status === 'active' ? 'success' : 'default'}
                                      sx={{ mt: 0.5 }}
                                    />
                                  </>
                                }
                              />
                            </ListItem>
                            {index < prescriptions.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    )}
                  </Box>
                )}

                {activeTab === 2 && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">e-Befunde</Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Refresh />}
                        onClick={fetchPatientData}
                        disabled={loading}
                      >
                        Aktualisieren
                      </Button>
                    </Box>
                    {documents.length === 0 ? (
                      <Alert severity="info">Keine Dokumente gefunden</Alert>
                    ) : (
                      <List>
                        {documents.map((doc, index) => (
                          <React.Fragment key={doc.id}>
                            <ListItem>
                              <ListItemIcon>
                                <Description color="primary" />
                              </ListItemIcon>
                              <ListItemText
                                primary={doc.title}
                                secondary={
                                  <>
                                    <Typography component="span" variant="body2">
                                      {doc.classCode} • {doc.typeCode}
                                    </Typography>
                                    <br />
                                    <Typography component="span" variant="caption" color="text.secondary">
                                      {doc.date} • {doc.author}
                                    </Typography>
                                  </>
                                }
                              />
                              <Tooltip title="Dokument anzeigen">
                                <IconButton
                                  onClick={() => {
                                    // TODO: Implement document viewer
                                    showSnackbar('Dokument-Viewer wird implementiert', 'info');
                                  }}
                                >
                                  <Download />
                                </IconButton>
                              </Tooltip>
                            </ListItem>
                            {index < documents.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    )}
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Synchronisierungs-Dialog */}
      <Dialog open={syncDialogOpen} onClose={() => setSyncDialogOpen(false)}>
        <DialogTitle>Mit ELGA synchronisieren</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie die Patientendaten von {selectedPatient?.firstName} {selectedPatient?.lastName} mit ELGA synchronisieren?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleSync} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Synchronisieren'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ELGA;
