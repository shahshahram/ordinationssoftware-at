import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  Paper,
  TableHead,
  TableRow,
  CircularProgress,
  Grid,
  Alert,
  Stack,
  Autocomplete,
} from '@mui/material';
import {
  Search,
  Refresh,
  CalendarToday,
  Person,
  AccessTime,
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';

interface AvailableSlot {
  start: string;
  end: string;
  duration: number;
  staffId: string;
  staffName?: string;
}

interface StaffUtilization {
  staffId: string;
  staffName: string;
  totalSlots: number;
  bookedSlots: number;
  utilizationRate: number;
}

const Availability: React.FC = () => {
  const [staffId, setStaffId] = useState<string>('');
  const [serviceId, setServiceId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [utilization, setUtilization] = useState<StaffUtilization | null>(null);
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [serviceList, setServiceList] = useState<any[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadStaffList();
    loadServiceList();
  }, []);

  const loadStaffList = async () => {
    try {
      const response = await api.get('/staff-profiles');
      if (response.success) {
        setStaffList(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error: any) {
      console.error('Error loading staff:', error);
    }
  };

  const loadServiceList = async () => {
    try {
      const response = await api.get('/service-catalog');
      if (response.success) {
        setServiceList(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error: any) {
      console.error('Error loading services:', error);
    }
  };

  const handleSearchSlots = async () => {
    if (!staffId || !serviceId || !startDate || !endDate) {
      enqueueSnackbar('Bitte alle Felder ausfüllen', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const params = {
        staffId,
        serviceId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      const response = await api.get('/availability/slots', params);
      if (response.success) {
        const slots = Array.isArray(response.data) ? response.data : [];
        setAvailableSlots(slots);
        enqueueSnackbar(`${slots.length} verfügbare Slots gefunden`, { variant: 'success' });
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der verfügbaren Slots', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadUtilization = async () => {
    if (!staffId || !startDate || !endDate) {
      enqueueSnackbar('Bitte Mitarbeiter und Datumsbereich auswählen', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const params = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      const response = await api.get(`/availability/utilization/${staffId}`, params);
      if (response.success) {
        setUtilization(response.data as StaffUtilization);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Auslastung', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFindNextAvailable = async () => {
    if (!staffId || !serviceId) {
      enqueueSnackbar('Bitte Mitarbeiter und Service auswählen', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const params = {
        staffId,
        serviceId,
        fromDate: new Date().toISOString(),
      };
      const response = await api.get('/availability/next-available', params);
      if (response.success && response.data && typeof response.data === 'object' && 'start' in response.data) {
        const slot = response.data as { start: string };
        enqueueSnackbar(
          `Nächster verfügbarer Termin: ${format(new Date(slot.start), 'dd.MM.yyyy HH:mm')}`,
          { variant: 'success' }
        );
      } else {
        enqueueSnackbar('Kein verfügbarer Termin gefunden', { variant: 'info' });
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Suchen des nächsten Termins', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Verfügbarkeiten
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Verfügbare Termine und Auslastung prüfen
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Autocomplete
                options={staffList}
                getOptionLabel={(option) => option.displayName || `${option.firstName} ${option.lastName}`}
                value={staffList.find(s => s._id === staffId) || null}
                onChange={(_, newValue) => setStaffId(newValue?._id || '')}
                renderInput={(params) => <TextField {...params} label="Mitarbeiter" />}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Autocomplete
                options={serviceList}
                getOptionLabel={(option) => option.name || option.code}
                value={serviceList.find(s => s._id === serviceId) || null}
                onChange={(_, newValue) => setServiceId(newValue?._id || '')}
                renderInput={(params) => <TextField {...params} label="Service" />}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Von"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Bis"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<Search />}
              onClick={handleSearchSlots}
              disabled={loading}
            >
              Verfügbare Slots suchen
            </Button>
            <Button
              variant="outlined"
              startIcon={<CalendarToday />}
              onClick={handleFindNextAvailable}
              disabled={loading}
            >
              Nächster Termin
            </Button>
            <Button
              variant="outlined"
              startIcon={<Person />}
              onClick={handleLoadUtilization}
              disabled={loading}
            >
              Auslastung prüfen
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {loading && <CircularProgress sx={{ mb: 2 }} />}

      {utilization && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Auslastung: {utilization.staffName}
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Gesamt Slots
                </Typography>
                <Typography variant="h5">{utilization.totalSlots}</Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Gebuchte Slots
                </Typography>
                <Typography variant="h5">{utilization.bookedSlots}</Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Auslastung
                </Typography>
                <Typography variant="h5">
                  {utilization.utilizationRate.toFixed(1)}%
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {availableSlots.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Verfügbare Slots ({availableSlots.length})
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Start</TableCell>
                    <TableCell>Ende</TableCell>
                    <TableCell>Dauer (Min)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availableSlots.slice(0, 50).map((slot, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {format(new Date(slot.start), 'dd.MM.yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(slot.end), 'dd.MM.yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{slot.duration}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {availableSlots.length > 50 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Es werden nur die ersten 50 Slots angezeigt. Insgesamt {availableSlots.length} Slots gefunden.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Availability;

