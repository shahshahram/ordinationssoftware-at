import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  Paper,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Chip,
  Alert,
  Grid,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import {
  CreditCard,
  Refresh,
  CheckCircle,
  Cancel,
  Sync,
  Search,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';

interface ECardValidation {
  _id?: string;
  patientId: string;
  patient?: { firstName: string; lastName: string };
  ecardNumber: string;
  validationDate: string;
  validationStatus: 'valid' | 'invalid' | 'expired' | 'pending';
  validFrom: string;
  validUntil: string;
  insuranceData?: {
    insuranceProvider: string;
    insuranceNumber: string;
    socialSecurityNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender?: string;
  };
  elgaData?: {
    elgaId?: string;
    elgaStatus?: string;
    lastSync?: string;
  };
  validatedBy?: { firstName: string; lastName: string };
  validationMethod: 'elga' | 'fallback' | 'card_reader';
  errorMessage?: string;
}

const ECardValidation: React.FC = () => {
  const [validations, setValidations] = useState<ECardValidation[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [ecardNumber, setEcardNumber] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadPatients();
    loadValidCards();
  }, []);

  const loadPatients = async () => {
    try {
      const response = await api.get('/patients-extended');
      if (response.success) {
        setPatients(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error: any) {
      console.error('Error loading patients:', error);
    }
  };

  const loadValidCards = async () => {
    setLoading(true);
    try {
      const response = await api.get('/ecard-validation/valid');
      if (response.success) {
        setValidations(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Validierungen', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedPatient || !ecardNumber) {
      enqueueSnackbar('Bitte Patient und e-card Nummer auswählen', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/ecard-validation/validate', {
        patientId: selectedPatient._id || selectedPatient.id,
        ecardNumber,
        validationMethod: 'card_reader',
      });
      if (response.success) {
        enqueueSnackbar('e-card erfolgreich validiert', { variant: 'success' });
        setDialogOpen(false);
        setEcardNumber('');
        setSelectedPatient(null);
        loadValidCards();
      }
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Fehler bei der Validierung', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (patientId: string) => {
    setLoading(true);
    try {
      const response = await api.post(`/ecard-validation/sync/${patientId}`);
      if (response.success) {
        enqueueSnackbar('Patientendaten erfolgreich synchronisiert', { variant: 'success' });
        loadValidCards();
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler bei der Synchronisierung', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'success';
      case 'invalid':
        return 'error';
      case 'expired':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">E-Card Validierung</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadValidCards}
            disabled={loading}
          >
            Aktualisieren
          </Button>
          <Button
            variant="contained"
            startIcon={<CreditCard />}
            onClick={() => setDialogOpen(true)}
          >
            E-Card validieren
          </Button>
        </Box>
      </Box>

      {loading && <CircularProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Patient</TableCell>
              <TableCell>E-Card Nummer</TableCell>
              <TableCell>Validierungsdatum</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Gültig von</TableCell>
              <TableCell>Gültig bis</TableCell>
              <TableCell>Methode</TableCell>
              <TableCell align="right">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {validations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item) => (
              <TableRow key={item._id}>
                <TableCell>
                  {item.patient
                    ? `${item.patient.firstName} ${item.patient.lastName}`
                    : '—'}
                </TableCell>
                <TableCell>{item.ecardNumber}</TableCell>
                <TableCell>
                  {item.validationDate
                    ? format(new Date(item.validationDate), 'dd.MM.yyyy HH:mm')
                    : '—'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.validationStatus}
                    color={getStatusColor(item.validationStatus) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {item.validFrom
                    ? format(new Date(item.validFrom), 'dd.MM.yyyy')
                    : '—'}
                </TableCell>
                <TableCell>
                  {item.validUntil
                    ? format(new Date(item.validUntil), 'dd.MM.yyyy')
                    : '—'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.validationMethod}
                    size="small"
                    color={item.validationMethod === 'elga' ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  {item.patientId && (
                    <Button
                      size="small"
                      startIcon={<Sync />}
                      onClick={() => handleSync(item.patientId)}
                      disabled={loading}
                    >
                      Sync
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={validations.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>E-Card validieren</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Autocomplete
              options={patients}
              getOptionLabel={(option) =>
                `${option.firstName} ${option.lastName} (${option.dateOfBirth ? format(new Date(option.dateOfBirth), 'dd.MM.yyyy') : ''})`
              }
              value={selectedPatient}
              onChange={(_, newValue) => setSelectedPatient(newValue)}
              renderInput={(params) => <TextField {...params} label="Patient" />}
            />
            <TextField
              label="E-Card Nummer"
              fullWidth
              value={ecardNumber}
              onChange={(e) => setEcardNumber(e.target.value)}
              placeholder="z.B. 1234567890123456"
            />
            {selectedPatient && (
              <Alert severity="info">
                Patient: {selectedPatient.firstName} {selectedPatient.lastName}
                {selectedPatient.insuranceProvider && (
                  <> - Versicherung: {selectedPatient.insuranceProvider}</>
                )}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleValidate} variant="contained" disabled={loading}>
            Validieren
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ECardValidation;

