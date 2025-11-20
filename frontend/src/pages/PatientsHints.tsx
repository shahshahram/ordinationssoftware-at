import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Chip,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Alert,
  Skeleton,
  Stack,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Warning,
  Search,
  Person,
  Phone,
  Email,
  CalendarToday,
  Edit,
  Close,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updatePatient, Patient } from '../store/slices/patientSlice';
import api from '../utils/api';

const PatientsHints: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { patients, loading } = useAppSelector((state: any) => state.patients);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [hintDialogOpen, setHintDialogOpen] = useState(false);
  const [hintText, setHintText] = useState('');

  const loadPatientsWithHints = useCallback(async () => {
    try {
      const response = await api.get('/patients-extended/hints');
      const data = response.data as { success: boolean; data: Patient[]; pagination: any };
      if (data.success) {
        // Update the patients in the store
        dispatch({ type: 'patients/fetchPatients/fulfilled', payload: { patients: data.data, pagination: data.pagination } });
      }
    } catch (error) {
      console.error('Error loading patients with hints:', error);
    }
  }, [dispatch]);

  // Filtere Patienten mit Hinweisen
  const patientsWithHints = patients.filter((patient: Patient) => patient.hasHint);

  // Filtere nach Suchbegriff
  const filteredPatients = patientsWithHints.filter((patient: Patient) =>
    `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.socialSecurityNumber?.includes(searchTerm) ||
    patient.phone?.includes(searchTerm) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadPatientsWithHints();
  }, [loadPatientsWithHints]);

  const handlePatientClick = (patient: Patient) => {
    navigate(`/patient-organizer/${patient._id || patient.id}`);
  };

  const handleEditHint = (patient: Patient) => {
    setSelectedPatient(patient);
    setHintText(patient.hintText || '');
    setHintDialogOpen(true);
  };

  const handleSaveHint = async () => {
    if (!selectedPatient) return;

    try {
      const updatedPatient = {
        ...selectedPatient,
        hintText: hintText.trim()
      };
      
      await dispatch(updatePatient({ 
        id: (selectedPatient._id || selectedPatient.id)!, 
        patientData: updatedPatient 
      }));
      setHintDialogOpen(false);
      setSelectedPatient(null);
      setHintText('');
    } catch (error) {
      console.error('Fehler beim Speichern des Hinweises:', error);
    }
  };

  const handleRemoveHint = async (patient: Patient) => {
    try {
      const updatedPatient = {
        ...patient,
        hasHint: false,
        hintText: ''
      };
      
      await dispatch(updatePatient({ 
        id: (patient._id || patient.id)!, 
        patientData: updatedPatient 
      }));
    } catch (error) {
      console.error('Fehler beim Entfernen des Hinweises:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'aktiv':
      case 'active':
        return 'success';
      case 'inaktiv':
      case 'inactive':
        return 'default';
      case 'wartend':
      case 'waiting':
        return 'warning';
      case 'entlassen':
      case 'discharged':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Hinweisliste</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={80} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            ⚠️ Hinweisliste
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Patienten mit besonderen Hinweisen ({filteredPatients.length})
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Person />}
          onClick={() => navigate('/patients')}
        >
          Zurück zur Patientenliste
        </Button>
      </Box>

      {/* Suchfeld */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Patienten suchen (Name, SV-Nr., Telefon, E-Mail)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Hinweisliste */}
      {filteredPatients.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Warning sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm ? 'Keine Patienten mit Hinweisen gefunden' : 'Keine Patienten mit Hinweisen'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm 
              ? 'Versuchen Sie einen anderen Suchbegriff' 
              : 'Aktuell sind keine Patienten mit besonderen Hinweisen markiert'
            }
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {filteredPatients.map((patient: Patient, index: number) => (
              <React.Fragment key={patient._id || patient.id}>
                <ListItem
                  sx={{
                    bgcolor: 'warning.light',
                    border: '2px solid',
                    borderColor: 'warning.main',
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': {
                      bgcolor: 'warning.main',
                      '& .MuiListItemText-primary': {
                        color: 'white',
                      },
                      '& .MuiListItemText-secondary': {
                        color: 'white',
                      },
                    },
                  }}
                >
                  <ListItemButton
                    onClick={() => handlePatientClick(patient)}
                    sx={{ py: 2 }}
                  >
                    <ListItemIcon>
                      <Warning color="warning" />
                    </ListItemIcon>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {/* Primary Content */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {patient.firstName} {patient.lastName}
                        </Typography>
                        <Chip
                          label={patient.status || 'Unbekannt'}
                          size="small"
                          color={getStatusColor(patient.status || '')}
                          variant="outlined"
                        />
                        {patient.gender && (
                          <Chip
                            label={patient.gender === 'm' ? 'Männlich' : patient.gender === 'w' ? 'Weiblich' : 'Divers'}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      {/* Secondary Content */}
                      <Box>
                        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                          {patient.socialSecurityNumber && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Person fontSize="small" />
                              <Typography variant="body2">
                                SV-Nr: {patient.socialSecurityNumber}
                              </Typography>
                            </Box>
                          )}
                          {patient.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Phone fontSize="small" />
                              <Typography variant="body2">{patient.phone}</Typography>
                            </Box>
                          )}
                          {patient.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Email fontSize="small" />
                              <Typography variant="body2">{patient.email}</Typography>
                            </Box>
                          )}
                        </Stack>
                        
                        {/* Hinweistext */}
                        {patient.hintText && (
                          <Alert 
                            severity="warning" 
                            sx={{ mt: 1, bgcolor: 'warning.light', color: 'warning.dark' }}
                          >
                            <Typography variant="body2" fontWeight="bold">
                              Hinweis: {patient.hintText}
                            </Typography>
                          </Alert>
                        )}
                        
                        {/* Geburtsdatum */}
                        {patient.dateOfBirth && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                            <CalendarToday fontSize="small" />
                            <Typography variant="body2">
                              Geboren: {new Date(patient.dateOfBirth).toLocaleDateString('de-DE')}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </ListItemButton>
                  
                  {/* Aktions-Buttons */}
                  <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                    <Tooltip title="Hinweis bearbeiten">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditHint(patient);
                        }}
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Hinweis entfernen">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveHint(patient);
                        }}
                        color="error"
                      >
                        <Close />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItem>
                {index < filteredPatients.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Dialog für Hinweis bearbeiten */}
      <Dialog open={hintDialogOpen} onClose={() => setHintDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="warning" />
            Hinweis bearbeiten
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Bearbeiten Sie den Hinweistext für {selectedPatient?.firstName} {selectedPatient?.lastName}:
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={hintText}
            onChange={(e) => setHintText(e.target.value)}
            placeholder="Hinweistext eingeben..."
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHintDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSaveHint} variant="contained" color="warning">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientsHints;
