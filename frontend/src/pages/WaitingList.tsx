import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchWaitingList,
  createWaitingListEntry,
  updateWaitingListEntry,
  deleteWaitingListEntry,
  WaitingListEntry,
} from '../store/slices/waitingListSlice';
import { fetchPatients, Patient } from '../store/slices/patientSlice';
import { fetchLocations, Location } from '../store/slices/locationSlice';
import { fetchStaffProfiles } from '../store/slices/staffSlice';
import {
  Box,
  Typography,
  Card,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Autocomplete,
  Menu,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  MoreVert,
  Person,
  LocalHospital,
  MedicalServices,
  Schedule,
  AccessTime,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import GradientDialogTitle from '../components/GradientDialogTitle';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';

const WaitingList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { marginTopValue } = useGlobalNavigationOffset();
  const { entries, loading, error, count } = useAppSelector((state) => state.waitingList);
  const { patients } = useAppSelector((state) => state.patients);
  const { locations } = useAppSelector((state) => state.locations);
  const { staffProfiles } = useAppSelector((state) => state.staff);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('waiting');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [selectedEntry, setSelectedEntry] = useState<WaitingListEntry | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const [formData, setFormData] = useState({
    patient: '',
    service: '',
    doctor: '',
    location: '',
    reason: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    status: 'waiting' as 'waiting' | 'in_progress' | 'completed' | 'cancelled',
    preferredDate: '',
    notes: '',
    contactMethod: 'all' as 'all' | 'phone' | 'email' | 'sms',
  });

  useEffect(() => {
    dispatch(fetchWaitingList({ status: statusFilter }));
    dispatch(fetchPatients(1));
    dispatch(fetchLocations());
    dispatch(fetchStaffProfiles());
  }, [dispatch, statusFilter]);

  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const patient = typeof entry.patient === 'object' ? entry.patient : null;
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : '';
    return (
      patientName.toLowerCase().includes(query) ||
      entry.reason.toLowerCase().includes(query)
    );
  });

  const handleOpenDialog = (mode: 'add' | 'edit', entry?: WaitingListEntry) => {
    if (mode === 'edit' && entry) {
      setSelectedEntry(entry);
      // Safely extract patientId - handle null/undefined cases
      let patientId = '';
      if (entry.patient) {
        if (typeof entry.patient === 'string') {
          patientId = entry.patient;
        } else if (typeof entry.patient === 'object' && entry.patient !== null) {
          patientId = entry.patient._id || '';
        }
      }
      
      // Safely extract serviceId
      let serviceId = '';
      if (entry.service) {
        if (typeof entry.service === 'string') {
          serviceId = entry.service;
        } else if (typeof entry.service === 'object' && entry.service !== null) {
          serviceId = entry.service._id || '';
        }
      }
      
      // Safely extract doctorId
      let doctorId = '';
      if (entry.doctor) {
        if (typeof entry.doctor === 'string') {
          doctorId = entry.doctor;
        } else if (typeof entry.doctor === 'object' && entry.doctor !== null) {
          doctorId = entry.doctor._id || '';
        }
      }
      
      // Safely extract locationId
      let locationId = '';
      if (entry.location) {
        if (typeof entry.location === 'string') {
          locationId = entry.location;
        } else if (typeof entry.location === 'object' && entry.location !== null) {
          locationId = entry.location._id || '';
        }
      }
      
      setFormData({
        patient: patientId || '',
        service: serviceId || '',
        doctor: doctorId || '',
        location: locationId || '',
        reason: entry.reason || '',
        priority: entry.priority || 'normal',
        status: entry.status || 'waiting',
        preferredDate: entry.preferredDate ? format(new Date(entry.preferredDate), 'yyyy-MM-dd') : '',
        notes: entry.notes || '',
        contactMethod: entry.contactMethod || 'all',
      });
    } else {
      setSelectedEntry(null);
      setFormData({
        patient: '',
        service: '',
        doctor: '',
        location: '',
        reason: '',
        priority: 'normal',
        status: 'waiting',
        preferredDate: '',
        notes: '',
        contactMethod: 'all',
      });
    }
    setDialogMode(mode);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEntry(null);
  };

  const handleSubmit = async () => {
    try {
      if (dialogMode === 'add') {
        await dispatch(createWaitingListEntry(formData)).unwrap();
        setSnackbar({ open: true, message: 'Wartelisten-Eintrag erfolgreich erstellt', severity: 'success' });
      } else if (selectedEntry) {
        await dispatch(updateWaitingListEntry({ id: selectedEntry._id, ...formData })).unwrap();
        setSnackbar({ open: true, message: 'Wartelisten-Eintrag erfolgreich aktualisiert', severity: 'success' });
      }
      handleCloseDialog();
      dispatch(fetchWaitingList({ status: statusFilter }));
    } catch (error: any) {
      setSnackbar({ open: true, message: error || 'Fehler beim Speichern', severity: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
      try {
        await dispatch(deleteWaitingListEntry(id)).unwrap();
        setSnackbar({ open: true, message: 'Eintrag erfolgreich gelöscht', severity: 'success' });
        dispatch(fetchWaitingList({ status: statusFilter }));
      } catch (error: any) {
        setSnackbar({ open: true, message: error || 'Fehler beim Löschen', severity: 'error' });
      }
    }
    setAnchorEl(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'cancelled': return 'default';
      case 'waiting': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting': return 'Wartend';
      case 'in_progress': return 'In Bearbeitung';
      case 'completed': return 'Abgeschlossen';
      case 'cancelled': return 'Abgebrochen';
      default: return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Dringend';
      case 'high': return 'Hoch';
      case 'normal': return 'Normal';
      case 'low': return 'Niedrig';
      default: return priority;
    }
  };

  return (
    <Box sx={{ 
      p: 3,
      mt: marginTopValue !== '0px' ? marginTopValue : 0,
      transition: marginTopValue !== '0px' ? 'margin-top 0.3s ease' : 'none',
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Warteliste
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog('add')}
        >
          Neuer Eintrag
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Suchen..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="waiting">Wartend</MenuItem>
              <MenuItem value="in_progress">In Bearbeitung</MenuItem>
              <MenuItem value="completed">Abgeschlossen</MenuItem>
              <MenuItem value="cancelled">Abgebrochen</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Position</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Grund</TableCell>
                <TableCell>Priorität</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Standort</TableCell>
                <TableCell>Arzt</TableCell>
                <TableCell>Erstellt</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Keine Einträge gefunden
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => {
                  const patient = typeof entry.patient === 'object' ? entry.patient : null;
                  const location = entry.location && typeof entry.location === 'object' ? entry.location : null;
                  const doctor = entry.doctor && typeof entry.doctor === 'object' ? entry.doctor : null;
                  
                  return (
                    <TableRow key={entry._id} hover>
                      <TableCell>{entry.position}</TableCell>
                      <TableCell>
                        {patient ? `${patient.firstName} ${patient.lastName}` : '-'}
                      </TableCell>
                      <TableCell>{entry.reason}</TableCell>
                      <TableCell>
                        <Chip
                          label={getPriorityLabel(entry.priority)}
                          color={getPriorityColor(entry.priority) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(entry.status)}
                          color={getStatusColor(entry.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{location ? location.name : '-'}</TableCell>
                      <TableCell>
                        {doctor ? (
                          typeof doctor === 'object' && 'displayName' in doctor 
                            ? doctor.displayName 
                            : typeof doctor === 'object' && 'firstName' in doctor
                            ? `${doctor.firstName} ${doctor.lastName}`
                            : typeof doctor === 'object' && 'first_name' in doctor
                            ? `${doctor.first_name} ${doctor.last_name}`
                            : '-'
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(entry.createdAt), 'dd.MM.yyyy', { locale: de })}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setAnchorEl(e.currentTarget);
                            setSelectedEntry(entry);
                          }}
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          if (selectedEntry) handleOpenDialog('edit', selectedEntry);
          setAnchorEl(null);
        }}>
          <Edit sx={{ mr: 1 }} /> Bearbeiten
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedEntry) handleDelete(selectedEntry._id);
        }}>
          <Delete sx={{ mr: 1 }} /> Löschen
        </MenuItem>
      </Menu>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <GradientDialogTitle 
          title={dialogMode === 'add' ? 'Neuer Wartelisten-Eintrag' : 'Wartelisten-Eintrag bearbeiten'}
          isEdit={dialogMode === 'edit'}
          onClose={handleCloseDialog}
        />
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Autocomplete
              options={patients}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
              value={patients.find((p) => p._id === formData.patient) || null}
              onChange={(_, newValue) => {
                setFormData({ ...formData, patient: newValue?._id || '' });
              }}
              renderInput={(params) => (
                <TextField {...params} label="Patient" required />
              )}
            />
            
            <TextField
              label="Grund"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
              multiline
              rows={2}
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Priorität</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priorität"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                >
                  <MenuItem value="low">Niedrig</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">Hoch</MenuItem>
                  <MenuItem value="urgent">Dringend</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <MenuItem value="waiting">Wartend</MenuItem>
                  <MenuItem value="in_progress">In Bearbeitung</MenuItem>
                  <MenuItem value="completed">Abgeschlossen</MenuItem>
                  <MenuItem value="cancelled">Abgebrochen</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Autocomplete
              options={locations}
              getOptionLabel={(option) => option.name}
              value={locations.find((l) => l._id === formData.location) || null}
              onChange={(_, newValue) => {
                setFormData({ ...formData, location: newValue?._id || '' });
              }}
              renderInput={(params) => (
                <TextField {...params} label="Standort" />
              )}
            />
            
            <Autocomplete
              options={staffProfiles}
              getOptionLabel={(option) => option.display_name || `${option.first_name} ${option.last_name}`}
              value={staffProfiles.find((s) => s._id === formData.doctor) || null}
              onChange={(_, newValue) => {
                setFormData({ ...formData, doctor: newValue?._id || '' });
              }}
              renderInput={(params) => (
                <TextField {...params} label="Arzt" />
              )}
            />
            
            <TextField
              label="Bevorzugtes Datum"
              type="date"
              value={formData.preferredDate}
              onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              label="Notizen"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSubmit} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WaitingList;

