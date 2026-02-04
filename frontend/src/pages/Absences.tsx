// Abwesenheitsverwaltung / Mein Urlaubsantrag (Self-Service)

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import {
  Box,
  Typography,
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
  CircularProgress,
  Tabs,
  Tab,
  TablePagination,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  Cancel as CancelIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { format, isSameDay, endOfDay } from 'date-fns';

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
  const user = useAppSelector((state) => state.auth.user);
  const permissions = user?.permissions ?? [];
  const isSelfService = permissions.includes('absences.self') && !permissions.includes('appointments.write');

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
  const [myStaffId, setMyStaffId] = useState<string | null>(null);
  const [myStaffName, setMyStaffName] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [_helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [_helpTab, _setHelpTab] = useState(0);

  useEffect(() => {
    loadAbsences();
    loadStaffMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAbsences/loadStaffMembers intentionally not in deps
  }, [activeTab, page, rowsPerPage]);

  useEffect(() => {
    if (isSelfService) {
      api.get<{ success: boolean; data?: { _id: string; displayName?: string } }>('/staff-profiles/me').then((res) => {
        if (res.data?.success && res.data?.data) {
          const d = res.data.data as { _id: string; displayName?: string };
          setMyStaffId(d._id);
          setMyStaffName(d.displayName || '');
        }
      }).catch(() => {});
    }
  }, [isSelfService]);

  useEffect(() => {
    if (dialogOpen && isSelfService && myStaffId && !formData.staffId) {
      setFormData((prev) => ({ ...prev, staffId: myStaffId }));
    }
  }, [dialogOpen, isSelfService, myStaffId, formData.staffId]);

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
      if (isSelfService) {
        const response = await api.get<any>('/staff-profiles/me');
        if (response.data?.success && response.data?.data) {
          const d = response.data.data as { _id: string; displayName?: string };
          setStaffMembers([{ _id: d._id, displayName: d.displayName }]);
          setMyStaffId(d._id);
          setMyStaffName(d.displayName || '');
        }
      } else {
        const response = await api.get<any>('/staff-profiles');
        const raw = response?.data?.data ?? response?.data;
        const list = Array.isArray(raw) ? raw : [];
        setStaffMembers(list.map((s: any) => ({ ...s, _id: String(s._id ?? '') })));
      }
    } catch (error) {
      console.error('Error loading staff members:', error);
    }
  };

  const handleAdd = () => {
    setSelectedAbsence(null);
    setFormData({
      staffId: isSelfService && myStaffId ? myStaffId : '',
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
    const staffIdRaw = isSelfService && myStaffId ? myStaffId : formData.staffId;
    const staffId = typeof staffIdRaw === 'string' ? staffIdRaw.trim() : String(staffIdRaw ?? '').trim();
    if (!staffId) {
      enqueueSnackbar(
        isSelfService
          ? 'Mitarbeiter ist nicht zugeordnet. Bitte warten Sie kurz oder wenden Sie sich an die Verwaltung.'
          : 'Bitte wählen Sie einen Mitarbeiter aus.',
        { variant: 'error' }
      );
      return;
    }
    const startDate = formData.startsAt instanceof Date ? formData.startsAt : new Date(formData.startsAt);
    let endDate = formData.endsAt instanceof Date ? formData.endsAt : new Date(formData.endsAt);
    // Ein Tag Abwesenheit: gleicher Kalendertag → Ende auf Tagesende setzen
    if (isSameDay(startDate, endDate)) {
      endDate = endOfDay(endDate);
    }
    const startsAt = startDate.toISOString();
    const endsAt = endDate.toISOString();
    const payload = {
      staffId,
      startsAt,
      endsAt,
      reason: formData.reason,
      notes: formData.notes?.trim() || undefined,
    };
    try {
      if (selectedAbsence) {
        await api.put(`/absences/${selectedAbsence._id}`, payload);
        enqueueSnackbar('Abwesenheit erfolgreich aktualisiert', { variant: 'success' });
      } else {
        await api.post('/absences', payload);
        enqueueSnackbar('Abwesenheit erfolgreich erstellt', { variant: 'success' });
      }
      setDialogOpen(false);
      loadAbsences();
    } catch (error: any) {
      const data = error?.response?.data;
      const message =
        (typeof data?.message === 'string' ? data.message : null) ||
        (typeof error?.message === 'string' ? error.message : null) ||
        'Fehler beim Speichern';
      const errors = Array.isArray(data?.errors) ? data.errors : [];
      const details = errors
        .map((e: { msg?: string; message?: string }) => e?.msg ?? e?.message)
        .filter(Boolean)
        .join(' ');
      const text = details ? `${message}: ${details}` : message;
      if (process.env.NODE_ENV === 'development') {
        console.error('Absences handleSave error:', { error, response: error?.response, data, message, details });
      }
      enqueueSnackbar(text, { variant: 'error' });
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

  const handleApproveOrReject = async (id: string, status: 'approved' | 'rejected', comment?: string) => {
    try {
      await api.patch(`/absences/${id}/approve`, { status, ...(comment ? { comment } : {}) });
      enqueueSnackbar(
        status === 'approved' ? 'Abwesenheit erfolgreich genehmigt' : 'Abwesenheit abgelehnt',
        { variant: 'success' }
      );
      loadAbsences();
    } catch (error: any) {
      enqueueSnackbar(status === 'approved' ? 'Fehler beim Genehmigen' : 'Fehler beim Ablehnen', { variant: 'error' });
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4">{isSelfService ? 'Mein Urlaubsantrag' : 'Abwesenheitsverwaltung'}</Typography>
            <Tooltip title="Hilfe & Leitfaden">
              <IconButton
                onClick={() => setHelpDialogOpen(true)}
                color="primary"
                size="small"
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
            disabled={isSelfService && !myStaffId}
            aria-label={isSelfService ? 'Neue Abwesenheit anlegen' : 'Neue Abwesenheit'}
          >
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
                {!isSelfService && <TableCell>Mitarbeiter</TableCell>}
                <TableCell>Von</TableCell>
                <TableCell>Bis</TableCell>
                <TableCell>Grund</TableCell>
                <TableCell>Status</TableCell>
                {!isSelfService && <TableCell>Genehmigt von</TableCell>}
                <TableCell>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isSelfService ? 5 : 7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : absences.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSelfService ? 5 : 7} align="center">
                    <Typography>Keine Abwesenheiten gefunden</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                absences.map((absence) => (
                  <TableRow key={absence._id} hover>
                    {!isSelfService && <TableCell>{absence.staffId?.displayName || 'Unbekannt'}</TableCell>}
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
                    {!isSelfService && (
                      <TableCell>
                        {absence.approvedBy
                          ? `${absence.approvedBy.firstName} ${absence.approvedBy.lastName}`
                          : '-'}
                      </TableCell>
                    )}
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Bearbeiten">
                          <IconButton size="small" onClick={() => handleEdit(absence)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {!isSelfService && absence.status === 'pending' && (
                          <>
                            <Tooltip title="Genehmigen">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleApproveOrReject(absence._id, 'approved')}
                                aria-label="Abwesenheit genehmigen"
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Ablehnen">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleApproveOrReject(absence._id, 'rejected')}
                                aria-label="Abwesenheit ablehnen"
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
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
            {selectedAbsence ? 'Abwesenheit bearbeiten' : isSelfService ? 'Neue Abwesenheit anlegen' : 'Neue Abwesenheit'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              {!isSelfService ? (
                <FormControl fullWidth>
                  <InputLabel>Mitarbeiter</InputLabel>
                  <Select
                    value={formData.staffId}
                    onChange={(e) => setFormData({ ...formData, staffId: String(e.target.value) })}
                    label="Mitarbeiter"
                  >
                    {staffMembers.map((staff: any) => (
                      <MenuItem key={String(staff._id)} value={String(staff._id)}>
                        {staff.displayName || staff.display_name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || String(staff._id)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                myStaffName && (
                  <Typography variant="body2" color="text.secondary">
                    Ihre Abwesenheit ({(staffMembers[0] as any)?.displayName || myStaffName})
                  </Typography>
                )
              )}
              <DatePicker
                label="Von"
                value={formData.startsAt}
                onChange={(newValue) => newValue && setFormData({ ...formData, startsAt: newValue })}
                format="dd.MM.yyyy"
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="Bis"
                value={formData.endsAt}
                onChange={(newValue) => newValue && setFormData({ ...formData, endsAt: newValue })}
                format="dd.MM.yyyy"
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
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={isSelfService ? !myStaffId : !formData.staffId}
            >
              Speichern
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default Absences;

