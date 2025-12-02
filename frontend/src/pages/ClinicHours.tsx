import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Checkbox,
  FormControlLabel,
  Stack,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  AccessTime,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';

interface ClinicHours {
  _id?: string;
  rrule: string;
  startTime: string;
  endTime: string;
  weekdays: number[];
  validFrom: string;
  validUntil?: string;
  isActive: boolean;
  description?: string;
}

const weekdays = [
  { value: 0, label: 'Sonntag' },
  { value: 1, label: 'Montag' },
  { value: 2, label: 'Dienstag' },
  { value: 3, label: 'Mittwoch' },
  { value: 4, label: 'Donnerstag' },
  { value: 5, label: 'Freitag' },
  { value: 6, label: 'Samstag' },
];

const ClinicHours: React.FC = () => {
  const [clinicHours, setClinicHours] = useState<ClinicHours[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClinicHours>({
    rrule: '',
    startTime: '08:00',
    endTime: '17:00',
    weekdays: [],
    validFrom: new Date().toISOString().split('T')[0],
    isActive: true,
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadClinicHours();
  }, []);

  const loadClinicHours = async () => {
    setLoading(true);
    try {
      const response = await api.get('/clinic-hours');
      if (response.success) {
        setClinicHours(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Ordinationszeiten', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: ClinicHours) => {
    if (item) {
      setEditingId(item._id || null);
      setFormData({
        ...item,
        validFrom: item.validFrom ? item.validFrom.split('T')[0] : new Date().toISOString().split('T')[0],
        validUntil: item.validUntil ? item.validUntil.split('T')[0] : undefined,
      });
    } else {
      setEditingId(null);
      setFormData({
        rrule: '',
        startTime: '08:00',
        endTime: '17:00',
        weekdays: [],
        validFrom: new Date().toISOString().split('T')[0],
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    try {
      const data = {
        ...formData,
        validFrom: new Date(formData.validFrom),
        validUntil: formData.validUntil ? new Date(formData.validUntil) : undefined,
      };

      if (editingId) {
        await api.put(`/clinic-hours/${editingId}`, data);
        enqueueSnackbar('Ordinationszeiten erfolgreich aktualisiert', { variant: 'success' });
      } else {
        await api.post('/clinic-hours', data);
        enqueueSnackbar('Ordinationszeiten erfolgreich erstellt', { variant: 'success' });
      }
      handleCloseDialog();
      loadClinicHours();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Fehler beim Speichern', { variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Möchten Sie diese Ordinationszeiten wirklich löschen?')) return;

    try {
      await api.delete(`/clinic-hours/${id}`);
      enqueueSnackbar('Ordinationszeiten erfolgreich gelöscht', { variant: 'success' });
      loadClinicHours();
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Löschen', { variant: 'error' });
    }
  };

  const handleWeekdayToggle = (value: number) => {
    setFormData(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(value)
        ? prev.weekdays.filter(d => d !== value)
        : [...prev.weekdays, value].sort(),
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Ordinationszeiten</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadClinicHours}
            disabled={loading}
          >
            Aktualisieren
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Neue Ordinationszeiten
          </Button>
        </Box>
      </Box>

      {loading && <CircularProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Beschreibung</TableCell>
              <TableCell>Wochentage</TableCell>
              <TableCell>Von</TableCell>
              <TableCell>Bis</TableCell>
              <TableCell>Gültig ab</TableCell>
              <TableCell>Gültig bis</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clinicHours.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item) => (
              <TableRow key={item._id}>
                <TableCell>{item.description || '—'}</TableCell>
                <TableCell>
                  {item.weekdays.map(d => weekdays.find(w => w.value === d)?.label).join(', ') || '—'}
                </TableCell>
                <TableCell>{item.startTime}</TableCell>
                <TableCell>{item.endTime}</TableCell>
                <TableCell>{item.validFrom ? format(new Date(item.validFrom), 'dd.MM.yyyy') : '—'}</TableCell>
                <TableCell>{item.validUntil ? format(new Date(item.validUntil), 'dd.MM.yyyy') : 'Unbegrenzt'}</TableCell>
                <TableCell>
                  <Chip
                    label={item.isActive ? 'Aktiv' : 'Inaktiv'}
                    color={item.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenDialog(item)}>
                    <Edit />
                  </IconButton>
                  <IconButton size="small" onClick={() => item._id && handleDelete(item._id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={clinicHours.length}
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

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingId ? 'Ordinationszeiten bearbeiten' : 'Neue Ordinationszeiten'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Beschreibung"
              fullWidth
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
              label="RRULE"
              fullWidth
              value={formData.rrule}
              onChange={(e) => setFormData({ ...formData, rrule: e.target.value })}
              helperText="iCalendar RRULE Format (z.B. FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR)"
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Startzeit"
                  type="time"
                  fullWidth
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Endzeit"
                  type="time"
                  fullWidth
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Wochentage
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {weekdays.map((day) => (
                  <FormControlLabel
                    key={day.value}
                    control={
                      <Checkbox
                        checked={formData.weekdays.includes(day.value)}
                        onChange={() => handleWeekdayToggle(day.value)}
                      />
                    }
                    label={day.label}
                  />
                ))}
              </Stack>
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Gültig ab"
                  type="date"
                  fullWidth
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Gültig bis (optional)"
                  type="date"
                  fullWidth
                  value={formData.validUntil || ''}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value || undefined })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Aktiv"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSave} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClinicHours;

