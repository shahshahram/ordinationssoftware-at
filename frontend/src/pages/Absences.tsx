// Abwesenheitsverwaltung

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
  Tabs,
  Tab,
  TablePagination,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  Pending,
  Visibility,
  Refresh,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';

interface Absence {
  _id: string;
  staffId: {
    _id: string;
    displayName: string;
    roleHint: string;
  };
  startsAt: string;
  endsAt: string;
  reason: 'vacation' | 'sick' | 'personal' | 'training' | 'conference' | 'other';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  notes?: string;
}

const Absences: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  const [formData, setFormData] = useState({
    staffId: '',
    startsAt: new Date(),
    endsAt: new Date(),
    reason: 'vacation' as Absence['reason'],
    notes: '',
  });
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadAbsences();
    loadStaffMembers();
  }, [activeTab, page, rowsPerPage]);

  const loadAbsences = async () => {
    setLoading(true);
    try {
      const status = activeTab === 0 ? '' : 
                     activeTab === 1 ? 'pending' :
                     activeTab === 2 ? 'approved' : 'rejected';
      
      const params = new URLSearchParams();
      params.append('page', String(page + 1));
      params.append('limit', String(rowsPerPage));
      if (status) params.append('status', status);
      
      const response = await api.get<any>(`/absences?${params.toString()}`);
      if (response.success && response.data) {
        setAbsences(response.data.data || []);
        setTotal(response.data.pagination?.total || 0);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Abwesenheiten', { variant: 'error' });
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
    setSelectedAbsence(null);
    setFormData({
      staffId: '',
      startsAt: new Date(),
      endsAt: new Date(),
      reason: 'vacation',
      notes: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (absence: Absence) => {
    setSelectedAbsence(absence);
    setFormData({
      staffId: absence.staffId._id,
      startsAt: new Date(absence.startsAt),
      endsAt: new Date(absence.endsAt),
      reason: absence.reason,
      notes: absence.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (selectedAbsence) {
        await api.put(`/absences/${selectedAbsence._id}`, formData);
        enqueueSnackbar('Abwesenheit erfolgreich aktualisiert', { variant: 'success' });
      } else {
        await api.post('/absences', formData);
        enqueueSnackbar('Abwesenheit erfolgreich erstellt', { variant: 'success' });
      }
      setDialogOpen(false);
      loadAbsences();
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Fehler beim Speichern', { variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Möchten Sie diese Abwesenheit wirklich löschen?')) {
      return;
    }
    try {
      await api.delete(`/absences/${id}`);
      enqueueSnackbar('Abwesenheit erfolgreich gelöscht', { variant: 'success' });
      loadAbsences();
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Löschen', { variant: 'error' });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/absences/${id}/approve`, {});
      enqueueSnackbar('Abwesenheit erfolgreich genehmigt', { variant: 'success' });
      loadAbsences();
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Genehmigen', { variant: 'error' });
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      vacation: 'Urlaub',
      sick: 'Krank',
      personal: 'Persönlich',
      training: 'Fortbildung',
      conference: 'Konferenz',
      other: 'Sonstiges',
    };
    return labels[reason] || reason;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Ausstehend',
      approved: 'Genehmigt',
      rejected: 'Abgelehnt',
      cancelled: 'Storniert',
    };
    return labels[status] || status;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Abwesenheitsverwaltung</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
            Neue Abwesenheit
          </Button>
        </Box>

        <Paper sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Alle" />
            <Tab label="Ausstehend" />
            <Tab label="Genehmigt" />
            <Tab label="Abgelehnt" />
          </Tabs>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mitarbeiter</TableCell>
                <TableCell>Von</TableCell>
                <TableCell>Bis</TableCell>
                <TableCell>Grund</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Genehmigt von</TableCell>
                <TableCell>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : absences.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography>Keine Abwesenheiten gefunden</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                absences.map((absence) => (
                  <TableRow key={absence._id} hover>
                    <TableCell>{absence.staffId?.displayName || 'Unbekannt'}</TableCell>
                    <TableCell>{format(new Date(absence.startsAt), 'dd.MM.yyyy', { locale: de })}</TableCell>
                    <TableCell>{format(new Date(absence.endsAt), 'dd.MM.yyyy', { locale: de })}</TableCell>
                    <TableCell>{getReasonLabel(absence.reason)}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(absence.status)}
                        color={getStatusColor(absence.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {absence.approvedBy
                        ? `${absence.approvedBy.firstName} ${absence.approvedBy.lastName}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Bearbeiten">
                          <IconButton size="small" onClick={() => handleEdit(absence)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {absence.status === 'pending' && (
                          <Tooltip title="Genehmigen">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApprove(absence._id)}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Löschen">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(absence._id)}
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
            {selectedAbsence ? 'Abwesenheit bearbeiten' : 'Neue Abwesenheit'}
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
              <DatePicker
                label="Von"
                value={formData.startsAt}
                onChange={(newValue) => newValue && setFormData({ ...formData, startsAt: newValue })}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="Bis"
                value={formData.endsAt}
                onChange={(newValue) => newValue && setFormData({ ...formData, endsAt: newValue })}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <FormControl fullWidth>
                <InputLabel>Grund</InputLabel>
                <Select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value as Absence['reason'] })}
                  label="Grund"
                >
                  <MenuItem value="vacation">Urlaub</MenuItem>
                  <MenuItem value="sick">Krank</MenuItem>
                  <MenuItem value="personal">Persönlich</MenuItem>
                  <MenuItem value="training">Fortbildung</MenuItem>
                  <MenuItem value="conference">Konferenz</MenuItem>
                  <MenuItem value="other">Sonstiges</MenuItem>
                </Select>
              </FormControl>
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

export default Absences;

