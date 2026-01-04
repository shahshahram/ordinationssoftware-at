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

// Hilfsfunktion zum Entfernen von HTML-Tags
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

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
      // Lade alle Mitarbeiter mit einem höheren Limit
      const response = await api.get<{data: Array<any>, pagination?: any}>('/staff-profiles', { limit: 500 });
      console.log('📥 Staff profiles response:', response);
      
      if (response.success && response.data) {
        // Die API-Antwort ist verschachtelt: response.data.data enthält das Array
        const apiData = response.data as any;
        const staffData = (apiData.data && Array.isArray(apiData.data)) ? apiData.data : (Array.isArray(apiData) ? apiData : []);
        
        console.log('✅ Loaded staff profiles:', staffData.length);
        if (staffData.length > 0) {
          console.log('📋 First staff profile:', staffData[0]);
        }
        
        // Filtere nur aktive Mitarbeiter im Frontend
        const activeStaff = staffData.filter((staff: any) => staff.isActive !== false);
        console.log('✅ Active staff profiles:', activeStaff.length);
        setStaffList(activeStaff);
      } else {
        console.warn('⚠️ No staff profiles in response');
        setStaffList([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading staff:', error);
      enqueueSnackbar('Fehler beim Laden der Mitarbeiter', { variant: 'error' });
    }
  };

  const loadServiceList = async () => {
    try {
      // Lade alle Services mit einem höheren Limit
      const response = await api.get<{data: Array<any>, pagination?: any}>('/service-catalog', { limit: 500 });
      console.log('📥 Service catalog response:', response);
      
      if (response.success && response.data) {
        // Die API-Antwort ist verschachtelt: response.data.data enthält das Array
        const apiData = response.data as any;
        const serviceData = (apiData.data && Array.isArray(apiData.data)) ? apiData.data : (Array.isArray(apiData) ? apiData : []);
        
        console.log('✅ Loaded services:', serviceData.length);
        if (serviceData.length > 0) {
          console.log('📋 First service:', serviceData[0]);
        }
        
        // Filtere nur aktive Services im Frontend
        const activeServices = serviceData.filter((service: any) => service.is_active !== false);
        console.log('✅ Active services:', activeServices.length);
        setServiceList(activeServices);
      } else {
        console.warn('⚠️ No services in response');
        setServiceList([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading services:', error);
      enqueueSnackbar('Fehler beim Laden der Services', { variant: 'error' });
    }
  };

  const handleSearchSlots = async () => {
    console.log('🔍 handleSearchSlots called with:', { staffId, serviceId, startDate, endDate });
    
    if (!staffId || !serviceId || !startDate || !endDate) {
      console.warn('⚠️ Missing required fields:', { staffId: !!staffId, serviceId: !!serviceId, startDate: !!startDate, endDate: !!endDate });
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
      console.log('🔍 Searching for available slots with params:', params);
      console.log('🔍 Making API call to /availability/slots');
      const response = await api.get('/availability/slots', params);
      console.log('🔍 API call completed, response received');
      console.log('📥 Available slots full response:', JSON.stringify(response, null, 2));
      console.log('📥 Available slots response.data:', response.data);
      console.log('📥 Available slots response.success:', response.success);
      
      if (response.success) {
        const apiData = response.data as any;
        console.log('📥 API data type:', typeof apiData, 'isArray:', Array.isArray(apiData));
        console.log('📥 API data keys:', apiData ? Object.keys(apiData) : 'null');
        
        // Die API gibt zurück: { success: true, data: [...] }
        // response.data ist bereits { success: true, data: [...] }
        // Also müssen wir response.data.data verwenden, wenn es existiert
        let slots: any[] = [];
        if (Array.isArray(apiData)) {
          slots = apiData;
        } else if (apiData?.data && Array.isArray(apiData.data)) {
          slots = apiData.data;
        } else if (apiData?.success && apiData?.data && Array.isArray(apiData.data)) {
          slots = apiData.data;
        }
        
        console.log('✅ Found slots:', slots.length);
        if (slots.length > 0) {
          console.log('📋 First slot:', slots[0]);
        }
        
        // Debug-Informationen anzeigen
        const debugInfo = (apiData as any)?.debug;
        if (debugInfo) {
          console.log('🔍 Debug info from backend:', debugInfo);
          if (debugInfo.weeklySchedulesCount === 0) {
            console.warn('⚠️ No WeeklySchedules found for staffId:', debugInfo.staffId);
          }
        }
        
        setAvailableSlots(slots);
        
        if (slots.length === 0) {
          enqueueSnackbar(
            'Keine verfügbaren Slots gefunden. Bitte prüfen Sie, ob Arbeitszeiten für den Mitarbeiter definiert sind.',
            { variant: 'info', autoHideDuration: 6000 }
          );
        } else {
          enqueueSnackbar(`${slots.length} verfügbare Slots gefunden`, { variant: 'success' });
        }
      } else {
        enqueueSnackbar(response.message || 'Fehler beim Laden der verfügbaren Slots', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('❌ Error loading slots:', error);
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
      console.log('🔍 Searching for next available slot:', params);
      const response = await api.get('/availability/next-available', params);
      console.log('📥 Next available slot response:', response);
      
      if (response.success && response.data && typeof response.data === 'object' && 'start' in response.data) {
        const slot = response.data as { start: string };
        enqueueSnackbar(
          `Nächster verfügbarer Termin: ${format(new Date(slot.start), 'dd.MM.yyyy HH:mm')}`,
          { variant: 'success' }
        );
      } else {
        enqueueSnackbar(
          'Kein verfügbarer Termin gefunden. Bitte prüfen Sie, ob Arbeitszeiten für den Mitarbeiter definiert sind.',
          { variant: 'info', autoHideDuration: 6000 }
        );
      }
    } catch (error: any) {
      console.error('❌ Error finding next available slot:', error);
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
                getOptionLabel={(option: any) => option.display_name || option.displayName || `${option.first_name || option.firstName || ''} ${option.last_name || option.lastName || ''}`.trim() || 'Unbekannt'}
                value={staffList.find((s: any) => s._id === staffId) || null}
                onChange={(_, newValue: any) => setStaffId(newValue?._id || '')}
                renderInput={(params) => <TextField {...params} label="Mitarbeiter" />}
                isOptionEqualToValue={(option: any, value: any) => {
                  if (!option || !value) return false;
                  return (option._id || option.id) === (value._id || value.id);
                }}
                renderOption={(props, option: any) => {
                  const { key, ...restProps } = props;
                  const uniqueKey = option._id || option.id || key;
                  return (
                    <Box component="li" key={uniqueKey} {...restProps}>
                      <Typography variant="body2">
                        {option.display_name || option.displayName || `${option.first_name || option.firstName || ''} ${option.last_name || option.lastName || ''}`.trim() || 'Unbekannt'}
                      </Typography>
                    </Box>
                  );
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Autocomplete
                options={serviceList}
                getOptionLabel={(option: any) => {
                  const cleanName = stripHtmlTags(option.name || '');
                  return cleanName || option.code || 'Unbekannt';
                }}
                value={serviceList.find((s: any) => s._id === serviceId) || null}
                onChange={(_, newValue: any) => setServiceId(newValue?._id || '')}
                renderInput={(params) => <TextField {...params} label="Service" />}
                isOptionEqualToValue={(option: any, value: any) => {
                  if (!option || !value) return false;
                  return (option._id || option.id) === (value._id || value.id);
                }}
                renderOption={(props, option: any) => {
                  const { key, ...restProps } = props;
                  const uniqueKey = option._id || option.id || key;
                  const cleanName = stripHtmlTags(option.name || '');
                  return (
                    <Box component="li" key={uniqueKey} {...restProps}>
                      <Typography variant="body2">
                        {cleanName || option.code || 'Unbekannt'}
                      </Typography>
                    </Box>
                  );
                }}
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
              Auslastung: {utilization.staffName || 'Unbekannt'}
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Gesamt Slots
                </Typography>
                <Typography variant="h5">{utilization.totalSlots ?? 0}</Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Gebuchte Slots
                </Typography>
                <Typography variant="h5">{utilization.bookedSlots ?? 0}</Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Auslastung
                </Typography>
                <Typography variant="h5">
                  {utilization.utilizationRate !== undefined && utilization.utilizationRate !== null 
                    ? utilization.utilizationRate.toFixed(1) 
                    : '0.0'}%
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

