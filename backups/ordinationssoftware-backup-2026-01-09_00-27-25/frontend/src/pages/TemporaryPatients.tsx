import React, { useState, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPatients, Patient } from '../store/slices/patientSlice';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Button,
  Stack,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Phone,
  Email,
  Warning,
  Person,
  AccessTime,
  Edit,
} from '@mui/icons-material';

const TemporaryPatients: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { patients, loading, error } = useAppSelector((state) => state.patients);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'warning' | 'info' 
  });

  // Lade alle Patienten beim Mount
  useEffect(() => {
    dispatch(fetchPatients(1));
  }, [dispatch]);

  // Filtere nur temporäre Patienten
  const temporaryPatients = useMemo(() => {
    if (!Array.isArray(patients)) return [];
    
    return patients.filter(patient => patient.isTemporary === true);
  }, [patients]);

  // Filtere nach Suchbegriff
  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return temporaryPatients;
    
    const searchLower = searchTerm.toLowerCase();
    return temporaryPatients.filter(patient => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const email = (patient.email || '').toLowerCase();
      const phone = (patient.phone || '').toLowerCase();
      const svnr = (patient.socialSecurityNumber || '').toLowerCase();
      
      return fullName.includes(searchLower) || 
             email.includes(searchLower) || 
             phone.includes(searchLower) ||
             svnr.includes(searchLower);
    });
  }, [temporaryPatients, searchTerm]);

  // Hilfsfunktionen
  const getInitials = (firstName: string, lastName: string): string => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return `${first}${last}` || '?';
  };

  const getAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getAvatarColor = (gender: string): string => {
    if (gender === 'w' || gender === 'weiblich' || gender === 'f') return '#f48fb1';
    if (gender === 'm' || gender === 'männlich') return '#90caf9';
    return '#bdbdbd';
  };

  const handleEdit = (patient: Patient) => {
    navigate(`/patient-organizer/${patient._id || patient.id}`);
  };

  const handleCall = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    }
  };

  const handleEmail = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    if (email) {
      window.open(`mailto:${email}`, '_self');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Temporäre Patienten
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Patienten, die über Online-Buchungen erstellt wurden und deren Stammdaten noch vervollständigt werden müssen
          </Typography>
        </Box>
        <Chip
          label={`${filteredPatients.length} ${filteredPatients.length === 1 ? 'Patient' : 'Patienten'}`}
          color="warning"
          size="medium"
          sx={{ fontWeight: 'bold', fontSize: '1rem', height: '36px' }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {temporaryPatients.length === 0 && !loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Keine temporären Patienten vorhanden. Alle Patienten wurden bereits vervollständigt.
        </Alert>
      )}

      {/* Suchfeld */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Patienten suchen (Name, E-Mail, Telefon, SV-Nr.)..."
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
        </CardContent>
      </Card>

      {/* Patientenliste */}
      {filteredPatients.length === 0 && searchTerm ? (
        <Alert severity="info">
          Keine Patienten gefunden, die "{searchTerm}" entsprechen.
        </Alert>
      ) : (
        <List>
          {filteredPatients.map((patient) => {
            const age = getAge(patient.dateOfBirth);
            
            return (
              <Card key={patient._id || patient.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: getAvatarColor(patient.gender),
                        width: 56,
                        height: 56
                      }}
                    >
                      {getInitials(patient.firstName, patient.lastName)}
                    </Avatar>
                    
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {patient.firstName} {patient.lastName}
                        </Typography>
                        <Chip
                          label="Temporär"
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ fontWeight: 'bold' }}
                        />
                        {patient.status && (
                          <Chip
                            label={patient.status}
                            size="small"
                            color={patient.status === 'aktiv' ? 'success' : 'default'}
                          />
                        )}
                      </Box>
                      
                      <Stack spacing={0.5} sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          {age} Jahre • {patient.gender || 'Nicht angegeben'} • Geboren: {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('de-DE') : 'Nicht angegeben'}
                        </Typography>
                        {patient.email && (
                          <Typography variant="body2" color="text.secondary">
                            📧 {patient.email}
                          </Typography>
                        )}
                        {patient.phone && (
                          <Typography variant="body2" color="text.secondary">
                            📞 {patient.phone}
                          </Typography>
                        )}
                        {patient.socialSecurityNumber && (
                          <Typography variant="body2" color="text.secondary">
                            🆔 SV-Nr.: {patient.socialSecurityNumber}
                          </Typography>
                        )}
                        {patient.address && (
                          <Typography variant="body2" color="text.secondary">
                            📍 {patient.address.street || 'Nicht angegeben'}, {patient.address.zipCode || ''} {patient.address.city || 'Nicht angegeben'}
                          </Typography>
                        )}
                        {patient.insuranceProvider && (
                          <Typography variant="body2" color="text.secondary">
                            🏥 Versicherung: {patient.insuranceProvider}
                          </Typography>
                        )}
                      </Stack>

                      {patient.notes && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            <strong>Hinweis:</strong> {patient.notes}
                          </Typography>
                        </Alert>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<Edit />}
                          onClick={() => handleEdit(patient)}
                          size="small"
                        >
                          Stammdaten vervollständigen
                        </Button>
                        {patient.phone && (
                          <IconButton
                            size="small"
                            onClick={(e) => handleCall(e, patient.phone)}
                            sx={{ 
                              bgcolor: 'primary.50', 
                              color: 'primary.main',
                              '&:hover': { bgcolor: 'primary.100' }
                            }}
                            title="Anrufen"
                          >
                            <Phone fontSize="small" />
                          </IconButton>
                        )}
                        {patient.email && (
                          <IconButton
                            size="small"
                            onClick={(e) => handleEmail(e, patient.email || '')}
                            sx={{ 
                              bgcolor: 'success.50', 
                              color: 'success.main',
                              '&:hover': { bgcolor: 'success.100' }
                            }}
                            title="E-Mail senden"
                          >
                            <Email fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </List>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TemporaryPatients;

