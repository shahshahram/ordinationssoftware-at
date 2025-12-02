// Arbeitszeiten-Verwaltung

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  Tooltip,
  Alert,
  CircularProgress,
  Grid,
  TablePagination,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Refresh,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';

interface WorkShift {
  _id: string;
  staffId: {
    _id: string;
    displayName: string;
    roleHint: string;
  };
  startsAt: string;
  endsAt: string;
  shiftType: 'regular' | 'overtime' | 'on_call' | 'emergency';
  isActive: boolean;
  notes?: string;
}

const WorkShifts: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<WorkShift | null>(null);
  const [formData, setFormData] = useState({
    staffId: '',
    startsAt: new Date(),
    endsAt: new Date(),
    shiftType: 'regular' as WorkShift['shiftType'],
    isActive: true,
    notes: '',
  });
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadWorkShifts();
    loadStaffMembers();
  }, [page, rowsPerPage]);

  const loadWorkShifts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page + 1));
      params.append('limit', String(rowsPerPage));
      
      const response = await api.get<any>(`/work-shifts?${params.toString()}`);
      if (response.success && response.data) {
        setWorkShifts(response.data.data || []);
        setTotal(response.data.pagination?.total || 0);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Arbeitszeiten', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadStaffMembers = async () => {
    try {
      const response = await api.get<any>('/staff-profiles');
      if (response.success && response.data) {
        setStaffMembers(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading staff members:', error);
    }
  };

  const handleAdd = () => {
    setSelectedShift(null);
    setFormData({
      staffId: '',
      startsAt: new Date(),
      endsAt: new Date(),
      shiftType: 'regular',
      isActive: true,
      notes: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (shift: WorkShift) => {
    setSelectedShift(shift);
    setFormData({
      staffId: shift.staffId._id,
      startsAt: new Date(shift.startsAt),
      endsAt: new Date(shift.endsAt),
      shiftType: shift.shiftType,
      isActive: shift.isActive,
      notes: shift.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (selectedShift) {
        await api.put(`/work-shifts/${selectedShift._id}`, formData);
        enqueueSnackbar('Arbeitszeit erfolgreich aktualisiert', { variant: 'success' });
      } else {
        await api.post('/work-shifts', formData);
        enqueueSnackbar('Arbeitszeit erfolgreich erstellt', { variant: 'success' });
      }
      setDialogOpen(false);
      loadWorkShifts();
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Fehler beim Speichern', { variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Möchten Sie diese Arbeitszeit wirklich löschen?')) {
      return;
    }
    try {
      await api.delete(`/work-shifts/${id}`);
      enqueueSnackbar('Arbeitszeit erfolgreich gelöscht', { variant: 'success' });
      loadWorkShifts();
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Löschen', { variant: 'error' });
    }
  };

  const getShiftTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      regular: 'Regulär',
      overtime: 'Überstunden',
      on_call: 'Bereitschaft',
      emergency: 'Notfall',
    };
    return labels[type] || type;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Arbeitszeiten-Verwaltung</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
            Neue Arbeitszeit
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mitarbeiter</TableCell>
                <TableCell>Von</TableCell>
                <TableCell>Bis</TableCell>
                <TableCell>Typ</TableCell>
                <TableCell>Aktiv</TableCell>
                <TableCell>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : workShifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography>Keine Arbeitszeiten gefunden</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                workShifts.map((shift) => (
                  <TableRow key={shift._id} hover>
                    <TableCell>{shift.staffId?.displayName || 'Unbekannt'}</TableCell>
                    <TableCell>
                      {format(new Date(shift.startsAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(shift.endsAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </TableCell>
                    <TableCell>
                      <Chip label={getShiftTypeLabel(shift.shiftType)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={shift.isActive ? 'Aktiv' : 'Inaktiv'}
                        color={shift.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Bearbeiten">
                          <IconButton size="small" onClick={() => handleEdit(shift)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Löschen">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(shift._id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {selectedShift ? 'Arbeitszeit bearbeiten' : 'Neue Arbeitszeit'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Mitarbeiter</InputLabel>
                <Select
                  value={formData.staffId}
                  onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                  label="Mitarbeiter"
                >
                  {staffMembers.map((staff) => (
                    <MenuItem key={staff._id} value={staff._id}>
                      {staff.displayName || `${staff.firstName} ${staff.lastName}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <DateTimePicker
                label="Von"
                value={formData.startsAt}
                onChange={(newValue) => newValue && setFormData({ ...formData, startsAt: newValue })}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DateTimePicker
                label="Bis"
                value={formData.endsAt}
                onChange={(newValue) => newValue && setFormData({ ...formData, endsAt: newValue })}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <FormControl fullWidth>
                <InputLabel>Schichttyp</InputLabel>
                <Select
                  value={formData.shiftType}
                  onChange={(e) => setFormData({ ...formData, shiftType: e.target.value as WorkShift['shiftType'] })}
                  label="Schichttyp"
                >
                  <MenuItem value="regular">Regulär</MenuItem>
                  <MenuItem value="overtime">Überstunden</MenuItem>
                  <MenuItem value="on_call">Bereitschaft</MenuItem>
                  <MenuItem value="emergency">Notfall</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Aktiv"
              />
              <TextField
                fullWidth
                label="Notizen"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button variant="contained" onClick={handleSave}>
              Speichern
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default WorkShifts;

