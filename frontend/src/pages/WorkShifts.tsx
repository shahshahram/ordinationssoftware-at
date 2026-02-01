// Arbeitszeiten-Verwaltung

import React, { useState, useEffect } from 'react';
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
  TablePagination,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import GradientDialogTitle from '../components/GradientDialogTitle';

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
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);

  useEffect(() => {
    loadWorkShifts();
    loadStaffMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load*-Funktionen bewusst ausgelassen
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4">Arbeitszeiten-Verwaltung</Typography>
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
                format="dd.MM.yyyy HH:mm"
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DateTimePicker
                label="Bis"
                value={formData.endsAt}
                onChange={(newValue) => newValue && setFormData({ ...formData, endsAt: newValue })}
                format="dd.MM.yyyy HH:mm"
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

        {/* Hilfe & Leitfaden Dialog */}
        <Dialog
          open={helpDialogOpen}
          onClose={() => setHelpDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { minHeight: '600px' }
          }}
        >
          <GradientDialogTitle 
            title="Hilfe & Leitfaden: Arbeitszeiten-Verwaltung"
            onClose={() => setHelpDialogOpen(false)}
          />
          <DialogContent>
            <Tabs 
              value={helpTab} 
              onChange={(_, v) => setHelpTab(v)} 
              sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Übersicht" />
              <Tab label="Arbeitszeit erstellen" />
              <Tab label="Arbeitszeit bearbeiten" />
              <Tab label="Schichttypen" />
              <Tab label="Best Practices" />
            </Tabs>

            {helpTab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="h6" gutterBottom color="primary">
                    Arbeitszeiten-Verwaltung
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Die Arbeitszeiten-Verwaltung ermöglicht es, Arbeitszeiten von Mitarbeitern 
                    zu verwalten, zu erstellen und zu bearbeiten.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="h6" gutterBottom color="primary">
                    Hauptfunktionen
                  </Typography>
                  <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                    <li>➕ <strong>Arbeitszeit erstellen:</strong> Neue Arbeitszeiten anlegen</li>
                    <li>✏️ <strong>Arbeitszeit bearbeiten:</strong> Bestehende Arbeitszeiten ändern</li>
                    <li>🗑️ <strong>Arbeitszeit löschen:</strong> Arbeitszeiten entfernen</li>
                    <li>👁️ <strong>Arbeitszeiten anzeigen:</strong> Arbeitszeiten durchsuchen</li>
                    <li>📊 <strong>Schichttypen:</strong> Verschiedene Schichttypen verwalten</li>
                  </Box>
                </Box>
              </Box>
            )}

            {helpTab === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="h6" gutterBottom color="primary">
                    Neue Arbeitszeit erstellen
                  </Typography>
                  <Typography variant="body2" paragraph>
                    So erstellen Sie eine neue Arbeitszeit:
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                    Schritt-für-Schritt Anleitung
                  </Typography>
                  <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                    <li>Klicken Sie auf "Neue Arbeitszeit"</li>
                    <li>Geben Sie die Arbeitszeit-Daten ein:
                      <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                        <li><strong>Mitarbeiter:</strong> Mitarbeiter auswählen</li>
                        <li><strong>Von:</strong> Startzeit</li>
                        <li><strong>Bis:</strong> Endzeit</li>
                        <li><strong>Typ:</strong> Schichttyp auswählen</li>
                        <li><strong>Aktiv:</strong> Arbeitszeit aktivieren/deaktivieren</li>
                      </Box>
                    </li>
                    <li>Klicken Sie auf "Speichern"</li>
                  </Box>
                </Box>
              </Box>
            )}

            {helpTab === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="h6" gutterBottom color="primary">
                    Arbeitszeit bearbeiten
                  </Typography>
                  <Typography variant="body2" paragraph>
                    So bearbeiten Sie eine bestehende Arbeitszeit:
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                    Schritt-für-Schritt Anleitung
                  </Typography>
                  <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                    <li>Wählen Sie eine Arbeitszeit aus der Liste</li>
                    <li>Klicken Sie auf das Bearbeiten-Icon</li>
                    <li>Ändern Sie die gewünschten Daten</li>
                    <li>Klicken Sie auf "Speichern"</li>
                    <li>Die Änderungen werden gespeichert</li>
                  </Box>
                </Box>
              </Box>
            )}

            {helpTab === 3 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="h6" gutterBottom color="primary">
                    Schichttypen
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Arbeitszeiten können verschiedenen Schichttypen zugeordnet werden:
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                    Verfügbare Schichttypen
                  </Typography>
                  <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                    <li>🕐 <strong>Regulär:</strong> Reguläre Arbeitszeit</li>
                    <li>⏰ <strong>Überstunden:</strong> Überstunden</li>
                    <li>📞 <strong>Bereitschaft:</strong> Bereitschaftsdienst</li>
                    <li>🚨 <strong>Notfall:</strong> Notfallbereitschaft</li>
                  </Box>
                </Box>
              </Box>
            )}

            {helpTab === 4 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="h6" gutterBottom color="primary">
                    Best Practices
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                    Arbeitszeiten-Verwaltung
                  </Typography>
                  <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                    <li>✅ Halten Sie Arbeitszeiten aktuell</li>
                    <li>✅ Verwenden Sie die richtigen Schichttypen</li>
                    <li>✅ Planen Sie Arbeitszeiten im Voraus</li>
                    <li>✅ Dokumentieren Sie Änderungen</li>
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHelpDialogOpen(false)} variant="contained">
              Schließen
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default WorkShifts;



