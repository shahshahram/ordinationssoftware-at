import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  Paper,
  TableHead,
  TableRow,
  TablePagination,
  Snackbar,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface ServiceBooking {
  _id: string;
  service_id: {
    _id: string;
    name: string;
    code: string;
    base_duration_min: number;
  };
  patient_id: {
    _id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  };
  location_id: {
    _id: string;
    name: string;
    code: string;
  };
  assigned_staff_id: {
    _id: string;
    display_name: string;
    role_hint: string;
  };
  start_time: string;
  end_time: string;
  status: string;
  booking_type: string;
  notes?: string;
  internal_notes?: string;
  consent_given: boolean;
  consent_date?: string;
  billing_status: string;
  billing_amount_cents?: number;
  billing_code?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ServiceCatalog {
  _id: string;
  name: string;
  code: string;
  base_duration_min: number;
  buffer_before_min: number;
  buffer_after_min: number;
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

interface Location {
  _id: string;
  name: string;
  code: string;
}

interface StaffProfile {
  _id: string;
  display_name: string;
  role_hint: string;
}

const ServiceBookings: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<ServiceBooking | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const [formData, setFormData] = useState({
    service_id: '',
    patient_id: '',
    location_id: '',
    assigned_staff_id: '',
    start_time: new Date(),
    end_time: new Date(),
    booking_type: 'internal',
    notes: '',
    internal_notes: '',
    consent_given: false,
    status: 'scheduled'
  });

  // Buchungen laden
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString()
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (filterLocation) params.append('location_id', filterLocation);
      if (filterStatus) params.append('status', filterStatus);
      if (filterType) params.append('booking_type', filterType);
      if (filterDate) {
        const date = new Date(filterDate);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        params.append('start_date', startOfDay.toISOString());
        params.append('end_date', endOfDay.toISOString());
      }

      const response = await fetch(`http://localhost:5001/api/service-bookings?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data.data);
        setTotalCount(data.pagination.total);
      } else {
        throw new Error('Fehler beim Laden der Buchungen');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setSnackbar({ open: true, message: 'Fehler beim Laden der Buchungen', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Hilfsdaten laden
  const fetchHelperData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Services laden
      const servicesResponse = await fetch('http://localhost:5001/api/service-catalog?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (servicesResponse.ok) {
        const data = await servicesResponse.json();
        setServices(data.data);
      }

      // Patienten laden
      const patientsResponse = await fetch('http://localhost:5001/api/patients?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (patientsResponse.ok) {
        const data = await patientsResponse.json();
        setPatients(data.data);
      }

      // Standorte laden
      const locationsResponse = await fetch('http://localhost:5001/api/locations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (locationsResponse.ok) {
        const data = await locationsResponse.json();
        setLocations(data.data);
      }

      // Personal laden
      const staffResponse = await fetch('http://localhost:5001/api/staff-profiles?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (staffResponse.ok) {
        const data = await staffResponse.json();
        setStaff(data.data);
      }
    } catch (error) {
      console.error('Error fetching helper data:', error);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchHelperData();
  }, [page, rowsPerPage, searchTerm, filterLocation, filterStatus, filterType, filterDate]);

  const handleAddNew = () => {
    setEditingBooking(null);
    setFormData({
      service_id: '',
      patient_id: '',
      location_id: '',
      assigned_staff_id: '',
      start_time: new Date(),
      end_time: new Date(),
      booking_type: 'internal',
      notes: '',
      internal_notes: '',
      consent_given: false,
      status: 'scheduled'
    });
    setDialogOpen(true);
  };

  const handleEdit = (booking: ServiceBooking) => {
    setEditingBooking(booking);
    setFormData({
      service_id: booking.service_id._id,
      patient_id: booking.patient_id._id,
      location_id: booking.location_id._id,
      assigned_staff_id: booking.assigned_staff_id._id,
      start_time: new Date(booking.start_time),
      end_time: new Date(booking.end_time),
      booking_type: booking.booking_type,
      notes: booking.notes || '',
      internal_notes: booking.internal_notes || '',
      consent_given: booking.consent_given,
      status: booking.status
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = editingBooking 
        ? `http://localhost:5001/api/service-bookings/${editingBooking._id}`
        : 'http://localhost:5001/api/service-bookings';
      
      const method = editingBooking ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        start_time: formData.start_time.toISOString(),
        end_time: formData.end_time.toISOString()
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSnackbar({ 
          open: true, 
          message: editingBooking ? 'Buchung erfolgreich aktualisiert' : 'Buchung erfolgreich erstellt', 
          severity: 'success' 
        });
        setDialogOpen(false);
        fetchBookings();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Speichern');
      }
    } catch (error: any) {
      console.error('Error saving booking:', error);
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diese Buchung löschen möchten?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/service-bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setSnackbar({ open: true, message: 'Buchung erfolgreich gelöscht', severity: 'success' });
        fetchBookings();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen');
      }
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/service-bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setSnackbar({ open: true, message: 'Status erfolgreich aktualisiert', severity: 'success' });
        fetchBookings();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Aktualisieren');
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' } = {
      'scheduled': 'info',
      'confirmed': 'primary',
      'in_progress': 'warning',
      'completed': 'success',
      'cancelled': 'error',
      'no_show': 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: { [key: string]: string } = {
      'scheduled': 'Geplant',
      'confirmed': 'Bestätigt',
      'in_progress': 'In Bearbeitung',
      'completed': 'Abgeschlossen',
      'cancelled': 'Storniert',
      'no_show': 'Nicht erschienen'
    };
    return texts[status] || status;
  };

  const getTypeText = (type: string) => {
    const texts: { [key: string]: string } = {
      'online': 'Online',
      'internal': 'Intern',
      'phone': 'Telefon',
      'walk_in': 'Walk-in'
    };
    return texts[type] || type;
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const handleCreateAppointment = () => {
    // Navigiere zur Appointments-Seite mit geöffnetem Dialog
    navigate('/appointments?openDialog=true');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Dienst-Kalender
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CalendarIcon />}
            onClick={handleCreateAppointment}
          >
            Termin anlegen
          </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          Neue Buchung
        </Button>
        </Box>
      </Box>

      {/* Tabs für Service-Buchungen und Termine */}
      <Tabs 
        value={tabValue} 
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Service-Buchungen" />
        <Tab label="Termine" />
      </Tabs>

      {/* Tab-spezifischer Inhalt */}
      {tabValue === 0 ? (
        <>
          {/* Filter für Service-Buchungen */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, alignItems: 'center' }}>
            <Box>
              <TextField
                fullWidth
                label="Suche"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Box>
            <Box>
              <FormControl fullWidth>
                <InputLabel>Standort</InputLabel>
                <Select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  label="Standort"
                >
                  <MenuItem value="">Alle Standorte</MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location._id} value={location._id}>
                      {location.name} ({location.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">Alle Status</MenuItem>
                  <MenuItem value="scheduled">Geplant</MenuItem>
                  <MenuItem value="confirmed">Bestätigt</MenuItem>
                  <MenuItem value="in_progress">In Bearbeitung</MenuItem>
                  <MenuItem value="completed">Abgeschlossen</MenuItem>
                  <MenuItem value="cancelled">Storniert</MenuItem>
                  <MenuItem value="no_show">Nicht erschienen</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <FormControl fullWidth>
                <InputLabel>Typ</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="Typ"
                >
                  <MenuItem value="">Alle Typen</MenuItem>
                  <MenuItem value="online">Online</MenuItem>
                  <MenuItem value="internal">Intern</MenuItem>
                  <MenuItem value="phone">Telefon</MenuItem>
                  <MenuItem value="walk_in">Walk-in</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabelle */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Service</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Standort</TableCell>
                <TableCell>Mitarbeiter</TableCell>
                <TableCell>Zeit</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Typ</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking._id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {booking.service_id.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {booking.service_id.code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {booking.patient_id.firstName} {booking.patient_id.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {calculateAge(booking.patient_id.dateOfBirth)} Jahre
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {booking.location_id.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {booking.location_id.code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {booking.assigned_staff_id.display_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {booking.assigned_staff_id.role_hint}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDateTime(booking.start_time)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      bis {formatDateTime(booking.end_time)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getStatusText(booking.status)} 
                      size="small" 
                      color={getStatusColor(booking.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getTypeText(booking.booking_type)} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(booking)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(booking._id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>
        </>
      ) : (
        <>
          {/* Termine-Ansicht */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                <CalendarIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Termine verwalten
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                  Verwenden Sie den Kalender oder die Terminliste, um Termine zu erstellen und zu verwalten.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    startIcon={<CalendarIcon />}
                    onClick={handleCreateAppointment}
                  >
                    Neuen Termin anlegen
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/appointments')}
                  >
                    Zur Terminliste
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/calendar')}
                  >
                    Zum Kalender
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingBooking ? 'Buchung bearbeiten' : 'Neue Buchung erstellen'}
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mt: 1 }}>
              <Box>
                <FormControl fullWidth required>
                  <InputLabel>Service *</InputLabel>
                  <Select
                    value={formData.service_id}
                    onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                    label="Service *"
                  >
                    {services.map((service) => (
                      <MenuItem key={service._id} value={service._id}>
                        {service.name} ({service.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <FormControl fullWidth required>
                  <InputLabel>Patient *</InputLabel>
                  <Select
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    label="Patient *"
                  >
                    {patients.map((patient) => (
                      <MenuItem key={patient._id} value={patient._id}>
                        {patient.firstName} {patient.lastName} ({calculateAge(patient.dateOfBirth)} Jahre)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <FormControl fullWidth required>
                  <InputLabel>Standort *</InputLabel>
                  <Select
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    label="Standort *"
                  >
                    {locations.map((location) => (
                      <MenuItem key={location._id} value={location._id}>
                        {location.name} ({location.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <FormControl fullWidth required>
                  <InputLabel>Mitarbeiter *</InputLabel>
                  <Select
                    value={formData.assigned_staff_id}
                    onChange={(e) => setFormData({ ...formData, assigned_staff_id: e.target.value })}
                    label="Mitarbeiter *"
                  >
                    {staff.map((member) => (
                      <MenuItem key={member._id} value={member._id}>
                        {member.display_name} ({member.role_hint})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <DateTimePicker
                  label="Startzeit *"
                  value={formData.start_time}
                  onChange={(newValue) => newValue && setFormData({ ...formData, start_time: newValue })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
              <Box>
                <DateTimePicker
                  label="Endzeit *"
                  value={formData.end_time}
                  onChange={(newValue) => newValue && setFormData({ ...formData, end_time: newValue })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Buchungstyp</InputLabel>
                  <Select
                    value={formData.booking_type}
                    onChange={(e) => setFormData({ ...formData, booking_type: e.target.value })}
                    label="Buchungstyp"
                  >
                    <MenuItem value="online">Online</MenuItem>
                    <MenuItem value="internal">Intern</MenuItem>
                    <MenuItem value="phone">Telefon</MenuItem>
                    <MenuItem value="walk_in">Walk-in</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="scheduled">Geplant</MenuItem>
                    <MenuItem value="confirmed">Bestätigt</MenuItem>
                    <MenuItem value="in_progress">In Bearbeitung</MenuItem>
                    <MenuItem value="completed">Abgeschlossen</MenuItem>
                    <MenuItem value="cancelled">Storniert</MenuItem>
                    <MenuItem value="no_show">Nicht erschienen</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <TextField
                  fullWidth
                  label="Notizen"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  multiline
                  rows={2}
                />
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <TextField
                  fullWidth
                  label="Interne Notizen"
                  value={formData.internal_notes}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  multiline
                  rows={2}
                />
              </Box>
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} variant="contained">
            {editingBooking ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
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

export default ServiceBookings;
