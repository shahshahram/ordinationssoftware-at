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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MedicalServices as MedicalServicesIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import api from '../utils/api';
import GradientDialogTitle from '../components/GradientDialogTitle';

interface MedicalSpecialty {
  _id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  category?: 'chirurgie' | 'innere_medizin' | 'diagnostik' | 'therapie' | 'sonstiges';
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  lastModifiedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const MedicalSpecialties: React.FC = () => {
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<MedicalSpecialty | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    isActive: true,
    sortOrder: 0,
    category: 'sonstiges' as 'chirurgie' | 'innere_medizin' | 'diagnostik' | 'therapie' | 'sonstiges',
  });

  useEffect(() => {
    loadSpecialties();
  }, []);

  const loadSpecialties = async () => {
    try {
      setLoading(true);
      const response: any = await api.get('/medical-specialties?activeOnly=false');
      if (response.data?.success) {
        setSpecialties(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der Fachrichtungen:', error);
      showSnackbar('Fehler beim Laden der Fachrichtungen', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDialogOpen = (specialty?: MedicalSpecialty) => {
    if (specialty) {
      setEditingSpecialty(specialty);
      setFormData({
        code: specialty.code,
        name: specialty.name,
        description: specialty.description || '',
        isActive: specialty.isActive,
        sortOrder: specialty.sortOrder,
        category: specialty.category || 'sonstiges',
      });
    } else {
      setEditingSpecialty(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        isActive: true,
        sortOrder: 0,
        category: 'sonstiges',
      });
    }
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingSpecialty(null);
  };

  const handleSubmit = async () => {
    // Frontend-Validierung: Prüfe auf Duplikate
    const codeLower = formData.code.toLowerCase().trim();
    const nameTrimmed = formData.name.trim();
    
    const duplicateCode = specialties.find(s => 
      s.code.toLowerCase() === codeLower && 
      (!editingSpecialty || s._id !== editingSpecialty._id)
    );
    
    const duplicateName = specialties.find(s => 
      s.name.trim() === nameTrimmed && 
      (!editingSpecialty || s._id !== editingSpecialty._id)
    );
    
    if (duplicateCode) {
      showSnackbar('Code existiert bereits', 'error');
      return;
    }
    
    if (duplicateName) {
      showSnackbar('Name existiert bereits', 'error');
      return;
    }
    
    try {
      if (editingSpecialty) {
        const response: any = await api.put(`/medical-specialties/${editingSpecialty._id}`, formData);
        if (response.data?.success) {
          showSnackbar('Fachrichtung erfolgreich aktualisiert', 'success');
          loadSpecialties();
          handleDialogClose();
        }
      } else {
        const response: any = await api.post('/medical-specialties', formData);
        if (response.data?.success) {
          showSnackbar('Fachrichtung erfolgreich erstellt', 'success');
          loadSpecialties();
          handleDialogClose();
        }
      }
    } catch (error: any) {
      console.error('Fehler beim Speichern:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Fehler beim Speichern';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diese Fachrichtung löschen möchten?')) {
      return;
    }
    
    try {
      const response: any = await api.delete(`/medical-specialties/${id}`);
      if (response.data?.success) {
        showSnackbar('Fachrichtung erfolgreich gelöscht', 'success');
        loadSpecialties();
      }
    } catch (error: any) {
      console.error('Fehler beim Löschen:', error);
      showSnackbar('Fehler beim Löschen der Fachrichtung', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const categoryLabels: { [key: string]: string } = {
    'chirurgie': 'Chirurgie',
    'innere_medizin': 'Innere Medizin',
    'diagnostik': 'Diagnostik',
    'therapie': 'Therapie',
    'sonstiges': 'Sonstiges',
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1">
            Medizinische Fachrichtungen
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Verwalten Sie die medizinischen Fachrichtungen, die Standorten zugeordnet werden können.
            Diese Fachrichtungen werden für Vorlagen, Dekurs, Dokumente und Leistungen verwendet.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleDialogOpen()}
        >
          Neue Fachrichtung
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Beschreibung</TableCell>
              <TableCell>Kategorie</TableCell>
              <TableCell>Sortierung</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {specialties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Keine Fachrichtungen vorhanden. Erstellen Sie eine neue Fachrichtung.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              specialties.map((specialty) => (
                <TableRow key={specialty._id}>
                  <TableCell>
                    <Chip label={specialty.code} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {specialty.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {specialty.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={categoryLabels[specialty.category || 'sonstiges']}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{specialty.sortOrder}</TableCell>
                  <TableCell>
                    <Chip
                      label={specialty.isActive ? 'Aktiv' : 'Inaktiv'}
                      color={specialty.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Bearbeiten">
                      <IconButton
                        size="small"
                        onClick={() => handleDialogOpen(specialty)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Löschen">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(specialty._id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <GradientDialogTitle
          isEdit={!!editingSpecialty}
          title={editingSpecialty ? 'Fachrichtung bearbeiten' : 'Neue Fachrichtung'}
          icon={<MedicalServicesIcon />}
          gradientColors={{ from: '#3b82f6', to: '#2563eb' }}
        />
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().trim() })}
              required
              helperText="Eindeutiger Code (wird automatisch in Kleinbuchstaben konvertiert) - Duplikate nicht erlaubt"
              disabled={!!editingSpecialty}
              error={specialties.some(s => 
                s.code.toLowerCase() === formData.code.toLowerCase().trim() && 
                (!editingSpecialty || s._id !== editingSpecialty._id)
              )}
            />
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              helperText="Anzeigename der Fachrichtung - Duplikate nicht erlaubt"
              error={specialties.some(s => 
                s.name.trim() === formData.name.trim() && 
                (!editingSpecialty || s._id !== editingSpecialty._id)
              )}
            />
            <TextField
              fullWidth
              label="Beschreibung"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              helperText="Optionale Beschreibung der Fachrichtung"
            />
            <FormControl fullWidth>
              <InputLabel>Kategorie</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                label="Kategorie"
              >
                <MenuItem value="chirurgie">Chirurgie</MenuItem>
                <MenuItem value="innere_medizin">Innere Medizin</MenuItem>
                <MenuItem value="diagnostik">Diagnostik</MenuItem>
                <MenuItem value="therapie">Therapie</MenuItem>
                <MenuItem value="sonstiges">Sonstiges</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="Sortierung"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              helperText="Niedrigere Zahlen erscheinen zuerst in der Liste"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Aktiv"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Abbrechen</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.code || !formData.name}
          >
            {editingSpecialty ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MedicalSpecialties;

