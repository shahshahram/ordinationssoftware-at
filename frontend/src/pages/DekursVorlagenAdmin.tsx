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
  Tabs,
  Tab,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileUpload as FileUploadIcon,
  FileDownload as FileDownloadIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import GradientDialogTitle from '../components/GradientDialogTitle';
import { DekursVorlage } from '../hooks/useDekursVorlagen';

const DekursVorlagenAdmin: React.FC = () => {
  const [vorlagen, setVorlagen] = useState<DekursVorlage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVorlage, setEditingVorlage] = useState<DekursVorlage | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [dialogTab, setDialogTab] = useState(0);
  const [medicalSpecialties, setMedicalSpecialties] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    icd10: '',
    icd10Title: '',
    specialty: '',
    specialties: [] as string[],
    locationIds: [] as string[],
    template: {
      visitReason: '',
      clinicalObservations: '',
      findings: '',
      progressChecks: '',
      treatmentDetails: '',
      notes: '',
      psychosocialFactors: '',
      medicationChanges: ''
    },
    isActive: true,
    isDefault: false,
    sortOrder: 0,
    tags: [] as string[],
  });

  useEffect(() => {
    loadVorlagen();
    loadMedicalSpecialties();
  }, []);

  const loadVorlagen = async () => {
    try {
      setLoading(true);
      const response: any = await api.get('/dekurs-vorlagen?activeOnly=false');
      if (response.data?.success) {
        setVorlagen(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der Vorlagen:', error);
      showSnackbar('Fehler beim Laden der Vorlagen', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMedicalSpecialties = async () => {
    try {
      const response: any = await api.get('/medical-specialties?activeOnly=true');
      if (response.data?.success) {
        setMedicalSpecialties(response.data.data || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Fachrichtungen:', error);
    }
  };

  const handleDialogOpen = (vorlage?: DekursVorlage) => {
    if (vorlage) {
      setEditingVorlage(vorlage);
      setFormData({
        code: vorlage.code,
        title: vorlage.title,
        icd10: vorlage.icd10 || '',
        icd10Title: vorlage.icd10Title || '',
        specialty: vorlage.specialty || '',
        specialties: vorlage.specialties || [],
        locationIds: vorlage.locationIds?.map((id: any) => typeof id === 'string' ? id : id._id) || [],
        template: {
          visitReason: vorlage.template?.visitReason || '',
          clinicalObservations: vorlage.template?.clinicalObservations || '',
          findings: vorlage.template?.findings || '',
          progressChecks: vorlage.template?.progressChecks || '',
          treatmentDetails: vorlage.template?.treatmentDetails || '',
          notes: vorlage.template?.notes || '',
          psychosocialFactors: vorlage.template?.psychosocialFactors || '',
          medicationChanges: vorlage.template?.medicationChanges || ''
        },
        isActive: vorlage.isActive,
        isDefault: vorlage.isDefault,
        sortOrder: vorlage.sortOrder || 0,
        tags: vorlage.tags || [],
      });
    } else {
      setEditingVorlage(null);
      setFormData({
        code: '',
        title: '',
        icd10: '',
        icd10Title: '',
        specialty: '',
        specialties: [],
        locationIds: [],
        template: {
          visitReason: '',
          clinicalObservations: '',
          findings: '',
          progressChecks: '',
          treatmentDetails: '',
          notes: '',
          psychosocialFactors: '',
          medicationChanges: ''
        },
        isActive: true,
        isDefault: false,
        sortOrder: 0,
        tags: [],
      });
    }
    setDialogTab(0);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingVorlage(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingVorlage) {
        const response: any = await api.put(`/dekurs-vorlagen/${editingVorlage._id}`, formData);
        if (response.data?.success) {
          showSnackbar('Vorlage erfolgreich aktualisiert', 'success');
          loadVorlagen();
          handleDialogClose();
        }
      } else {
        const response: any = await api.post('/dekurs-vorlagen', formData);
        if (response.data?.success) {
          showSnackbar('Vorlage erfolgreich erstellt', 'success');
          loadVorlagen();
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
    if (!window.confirm('Sind Sie sicher, dass Sie diese Vorlage löschen möchten?')) {
      return;
    }
    
    try {
      const response: any = await api.delete(`/dekurs-vorlagen/${id}`);
      if (response.data?.success) {
        showSnackbar('Vorlage erfolgreich gelöscht', 'success');
        loadVorlagen();
      }
    } catch (error: any) {
      console.error('Fehler beim Löschen:', error);
      showSnackbar('Fehler beim Löschen der Vorlage', 'error');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const vorlagenArray = Array.isArray(json) ? json : json.vorlagen || [json];
        
        const response: any = await api.post('/dekurs-vorlagen/import/json', { vorlagen: vorlagenArray });
        if (response.data?.success) {
          showSnackbar(`Import erfolgreich: ${response.data.data.created} erstellt, ${response.data.data.updated} aktualisiert`, 'success');
          loadVorlagen();
        }
      } catch (error: any) {
        console.error('Fehler beim Import:', error);
        showSnackbar('Fehler beim Import', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = async (id: string, format: 'json' | 'xml') => {
    try {
      if (format === 'xml') {
        const response: any = await api.get(`/dekurs-vorlagen/export/${id}/${format}`, {
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `vorlage_${id}.xml`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const response: any = await api.get(`/dekurs-vorlagen/export/${id}/${format}`);
        
        const dataStr = JSON.stringify(response.data?.data || response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `vorlage_${id}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      
      showSnackbar('Export erfolgreich', 'success');
    } catch (error: any) {
      console.error('Fehler beim Export:', error);
      showSnackbar('Fehler beim Export', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Dekurs-Vorlagen Verwaltung
        </Typography>
        <Box>
          <input
            accept="application/json"
            style={{ display: 'none' }}
            id="import-button-file"
            type="file"
            onChange={handleImport}
          />
          <label htmlFor="import-button-file">
            <Button
              component="span"
              variant="outlined"
              startIcon={<FileUploadIcon />}
              sx={{ mr: 1 }}
            >
              Import
            </Button>
          </label>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleDialogOpen()}
          >
            Neue Vorlage
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Titel</TableCell>
                <TableCell>ICD-10</TableCell>
                <TableCell>Fachrichtung</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vorlagen.map((vorlage) => (
                <TableRow key={vorlage._id}>
                  <TableCell>{vorlage.code}</TableCell>
                  <TableCell>{vorlage.title}</TableCell>
                  <TableCell>{vorlage.icd10 || '-'}</TableCell>
                  <TableCell>
                    {vorlage.specialty || (vorlage.specialties && vorlage.specialties.length > 0 ? vorlage.specialties.join(', ') : '-')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={vorlage.isActive ? 'Aktiv' : 'Inaktiv'}
                      color={vorlage.isActive ? 'success' : 'default'}
                      size="small"
                    />
                    {vorlage.isDefault && (
                      <Chip label="Standard" color="primary" size="small" sx={{ ml: 1 }} />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Bearbeiten">
                      <IconButton size="small" onClick={() => handleDialogOpen(vorlage)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="JSON Export">
                      <IconButton size="small" onClick={() => handleExport(vorlage._id, 'json')}>
                        <FileDownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="XML Export">
                      <IconButton size="small" onClick={() => handleExport(vorlage._id, 'xml')}>
                        <DescriptionIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Löschen">
                      <IconButton size="small" color="error" onClick={() => handleDelete(vorlage._id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <GradientDialogTitle 
          title={editingVorlage ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}
          onClose={handleDialogClose}
          isEdit={!!editingVorlage}
        />
        <DialogContent>
          <Tabs value={dialogTab} onChange={(_, v) => setDialogTab(v)} sx={{ mb: 2 }}>
            <Tab label="Allgemein" />
            <Tab label="Vorlageninhalt" />
          </Tabs>

          {dialogTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Titel"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="ICD-10 Code"
                value={formData.icd10}
                onChange={(e) => setFormData({ ...formData, icd10: e.target.value })}
                fullWidth
              />
              <TextField
                label="ICD-10 Titel"
                value={formData.icd10Title}
                onChange={(e) => setFormData({ ...formData, icd10Title: e.target.value })}
                fullWidth
              />
              <Autocomplete
                multiple
                options={medicalSpecialties}
                getOptionLabel={(option) => option.name}
                value={medicalSpecialties.filter(s => formData.specialties.includes(s.code))}
                onChange={(_, newValue) => {
                  setFormData({
                    ...formData,
                    specialties: newValue.map(v => v.code),
                    specialty: newValue.length > 0 ? newValue[0].code : ''
                  });
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Fachrichtungen" />
                )}
              />
              <TextField
                label="Sortierreihenfolge"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                fullWidth
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
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  />
                }
                label="Standard-Vorlage"
              />
            </Box>
          )}

          {dialogTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Diagnose"
                value={formData.template.visitReason}
                onChange={(e) => setFormData({
                  ...formData,
                  template: { ...formData.template, visitReason: e.target.value }
                })}
                multiline
                rows={3}
                fullWidth
              />
              <TextField
                label="Anamnese"
                value={formData.template.clinicalObservations}
                onChange={(e) => setFormData({
                  ...formData,
                  template: { ...formData.template, clinicalObservations: e.target.value }
                })}
                multiline
                rows={4}
                fullWidth
              />
              <TextField
                label="Status/Befund"
                value={formData.template.findings}
                onChange={(e) => setFormData({
                  ...formData,
                  template: { ...formData.template, findings: e.target.value }
                })}
                multiline
                rows={4}
                fullWidth
              />
              <TextField
                label="Beurteilung"
                value={formData.template.progressChecks}
                onChange={(e) => setFormData({
                  ...formData,
                  template: { ...formData.template, progressChecks: e.target.value }
                })}
                multiline
                rows={4}
                fullWidth
              />
              <TextField
                label="Therapie"
                value={formData.template.treatmentDetails}
                onChange={(e) => setFormData({
                  ...formData,
                  template: { ...formData.template, treatmentDetails: e.target.value }
                })}
                multiline
                rows={4}
                fullWidth
              />
              <TextField
                label="Empfehlung"
                value={formData.template.notes}
                onChange={(e) => setFormData({
                  ...formData,
                  template: { ...formData.template, notes: e.target.value }
                })}
                multiline
                rows={3}
                fullWidth
              />
              <TextField
                label="Psychosoziale Faktoren"
                value={formData.template.psychosocialFactors}
                onChange={(e) => setFormData({
                  ...formData,
                  template: { ...formData.template, psychosocialFactors: e.target.value }
                })}
                multiline
                rows={2}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Abbrechen</Button>
          <Button onClick={handleSubmit} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DekursVorlagenAdmin;

