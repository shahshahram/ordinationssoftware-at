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
  Tabs,
  Tab,
  Autocomplete,
  Stack,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileUpload as FileUploadIcon,
  FileDownload as FileDownloadIcon,
  Description as DescriptionIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import GradientDialogTitle from '../components/GradientDialogTitle';
import { DekursVorlage, LinkedMedication } from '../hooks/useDekursVorlagen';
import MedicationAutocomplete from '../components/MedicationAutocomplete';
import { Medication } from '../types/Medication';

const DekursVorlagenAdmin: React.FC = () => {
  const [vorlagen, setVorlagen] = useState<DekursVorlage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVorlage, setEditingVorlage] = useState<DekursVorlage | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [dialogTab, setDialogTab] = useState(0);
  const [medicalSpecialties, setMedicalSpecialties] = useState<any[]>([]);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  
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
    linkedMedications: [] as LinkedMedication[],
    isActive: true,
    isDefault: false,
    sortOrder: 0,
    tags: [] as string[],
  });
  
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [medicationDialogOpen, setMedicationDialogOpen] = useState(false);
  const [editingMedicationIndex, setEditingMedicationIndex] = useState<number | null>(null);
  const [medicationFormData, setMedicationFormData] = useState<Partial<LinkedMedication>>({
    dosage: '',
    dosageUnit: '',
    frequency: '',
    duration: '',
    instructions: '',
    startDate: '',
    endDate: '',
    quantity: undefined,
    quantityUnit: '',
    route: 'oral',
    changeType: 'added',
    notes: ''
  });

  useEffect(() => {
    loadVorlagen();
    loadMedicalSpecialties();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Mount laden
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

  const handleDialogOpen = async (vorlage?: DekursVorlage) => {
    if (vorlage) {
      setEditingVorlage(vorlage);
      setDialogOpen(true);
      
      // Lade die Vorlage direkt von der API, um sicherzustellen, dass alle Daten (inkl. linkedMedications) aktuell sind
      try {
        const response: any = await api.get(`/dekurs-vorlagen/${vorlage._id}`);
        if (response.data?.success) {
          const fullVorlage = response.data.data;
          console.log('🔍 Frontend - handleDialogOpen - Vollständige Vorlage:', JSON.stringify(fullVorlage, null, 2));
          console.log('🔍 Frontend - handleDialogOpen - Geladene Vorlage mit linkedMedications:', JSON.stringify(fullVorlage.linkedMedications, null, 2));
          console.log('🔍 Frontend - handleDialogOpen - linkedMedications ist Array?', Array.isArray(fullVorlage.linkedMedications));
          console.log('🔍 Frontend - handleDialogOpen - linkedMedications length:', fullVorlage.linkedMedications?.length);
          
          setFormData({
            code: fullVorlage.code,
            title: fullVorlage.title,
            icd10: fullVorlage.icd10 || '',
            icd10Title: fullVorlage.icd10Title || '',
            specialty: fullVorlage.specialty || '',
            specialties: fullVorlage.specialties || [],
            locationIds: fullVorlage.locationIds?.map((id: any) => typeof id === 'string' ? id : id._id) || [],
            template: {
              visitReason: fullVorlage.template?.visitReason || '',
              clinicalObservations: fullVorlage.template?.clinicalObservations || '',
              findings: fullVorlage.template?.findings || '',
              progressChecks: fullVorlage.template?.progressChecks || '',
              treatmentDetails: fullVorlage.template?.treatmentDetails || '',
              notes: fullVorlage.template?.notes || '',
              psychosocialFactors: fullVorlage.template?.psychosocialFactors || '',
              medicationChanges: fullVorlage.template?.medicationChanges || ''
            },
            linkedMedications: fullVorlage.linkedMedications || [],
            isActive: fullVorlage.isActive,
            isDefault: fullVorlage.isDefault,
            sortOrder: fullVorlage.sortOrder || 0,
            tags: fullVorlage.tags || [],
          });
        } else {
          // Fallback: Verwende die Vorlage aus der Liste
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
            linkedMedications: vorlage.linkedMedications || [],
            isActive: vorlage.isActive,
            isDefault: vorlage.isDefault,
            sortOrder: vorlage.sortOrder || 0,
            tags: vorlage.tags || [],
          });
        }
      } catch (error) {
        console.error('Fehler beim Laden der Vorlage:', error);
        // Fallback: Verwende die Vorlage aus der Liste
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
          linkedMedications: vorlage.linkedMedications || [],
          isActive: vorlage.isActive,
          isDefault: vorlage.isDefault,
          sortOrder: vorlage.sortOrder || 0,
          tags: vorlage.tags || [],
        });
      }
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
        linkedMedications: [],
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
    setSelectedMedication(null);
    setMedicationDialogOpen(false);
    setEditingMedicationIndex(null);
  };

  const handleSaveMedication = () => {
    if (!selectedMedication) return;
    
    let medicationId: string | undefined = undefined;
    if (selectedMedication._id) {
      medicationId = typeof selectedMedication._id === 'string' ? selectedMedication._id : String(selectedMedication._id);
    }
    
    const newMedication: LinkedMedication = {
      medicationId: medicationId,
      name: selectedMedication.name || '',
      changeType: medicationFormData.changeType || 'added',
      dosage: medicationFormData.dosage || '',
      dosageUnit: medicationFormData.dosageUnit || '',
      frequency: medicationFormData.frequency || '',
      duration: medicationFormData.duration || '',
      instructions: medicationFormData.instructions || '',
      quantityUnit: medicationFormData.quantityUnit || '',
      route: medicationFormData.route || 'oral',
      notes: medicationFormData.notes || ''
    };
    
    if (medicationFormData.startDate && typeof medicationFormData.startDate === 'string' && medicationFormData.startDate.trim() !== '') {
      newMedication.startDate = new Date(medicationFormData.startDate);
    }
    if (medicationFormData.endDate && typeof medicationFormData.endDate === 'string' && medicationFormData.endDate.trim() !== '') {
      newMedication.endDate = new Date(medicationFormData.endDate);
    }
    if (medicationFormData.quantity !== undefined && medicationFormData.quantity !== null) {
      newMedication.quantity = medicationFormData.quantity;
    }
    
    if (editingMedicationIndex !== null) {
      setFormData((prev) => {
        const updated = [...(prev.linkedMedications || [])];
        updated[editingMedicationIndex] = newMedication;
        return {
          ...prev,
          linkedMedications: updated
        };
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        linkedMedications: [...(prev.linkedMedications || []), newMedication]
      }));
    }
    
    setMedicationDialogOpen(false);
    setSelectedMedication(null);
    setEditingMedicationIndex(null);
    setMedicationFormData({
      dosage: '',
      dosageUnit: '',
      frequency: '',
      duration: '',
      instructions: '',
      startDate: '',
      endDate: '',
      quantity: undefined,
      quantityUnit: '',
      route: 'oral',
      changeType: 'added',
      notes: ''
    });
  };

  const handleCloseMedicationDialog = () => {
    setMedicationDialogOpen(false);
    setSelectedMedication(null);
    setEditingMedicationIndex(null);
    setMedicationFormData({
      dosage: '',
      dosageUnit: '',
      frequency: '',
      duration: '',
      instructions: '',
      startDate: '',
      endDate: '',
      quantity: undefined,
      quantityUnit: '',
      route: 'oral',
      changeType: 'added',
      notes: ''
    });
  };

  const handleSubmit = async () => {
    try {
      console.log('🔍 Frontend - handleSubmit - formData.linkedMedications:', JSON.stringify(formData.linkedMedications, null, 2));
      
      // Bereinige linkedMedications vor dem Speichern
      const cleanedFormData = {
        ...formData,
        linkedMedications: (formData.linkedMedications || []).map((med: any) => {
          const cleaned: any = {
            name: med.name || '',
            dosage: med.dosage || '',
            dosageUnit: med.dosageUnit || '',
            frequency: med.frequency || '',
            duration: med.duration || '',
            instructions: med.instructions || '',
            quantity: med.quantity !== undefined && med.quantity !== null ? med.quantity : undefined,
            quantityUnit: med.quantityUnit || '',
            route: med.route || 'oral',
            changeType: med.changeType || 'added',
            notes: med.notes || ''
          };
          
          // medicationId korrekt setzen
          if (med.medicationId) {
            if (typeof med.medicationId === 'object' && med.medicationId._id) {
              cleaned.medicationId = typeof med.medicationId._id === 'string' ? med.medicationId._id : med.medicationId._id.toString();
            } else if (typeof med.medicationId === 'string') {
              cleaned.medicationId = med.medicationId;
            } else {
              cleaned.medicationId = med.medicationId.toString();
            }
          }
          
          // Datum-Felder
          if (med.startDate) {
            cleaned.startDate = typeof med.startDate === 'string' ? med.startDate : med.startDate.toISOString();
          }
          if (med.endDate) {
            cleaned.endDate = typeof med.endDate === 'string' ? med.endDate : med.endDate.toISOString();
          }
          
          return cleaned;
        })
      };
      
      console.log('🔍 Frontend - handleSubmit - cleanedFormData.linkedMedications:', JSON.stringify(cleanedFormData.linkedMedications, null, 2));
      
      if (editingVorlage) {
        const response: any = await api.put(`/dekurs-vorlagen/${editingVorlage._id}`, cleanedFormData);
        console.log('🔍 Frontend - handleSubmit - PUT Response:', response.data);
        console.log('🔍 Frontend - handleSubmit - PUT Response data.linkedMedications:', JSON.stringify(response.data?.data?.linkedMedications, null, 2));
        if (response.data?.success) {
          showSnackbar('Vorlage erfolgreich aktualisiert', 'success');
          loadVorlagen();
          handleDialogClose();
        }
      } else {
        const response: any = await api.post('/dekurs-vorlagen', cleanedFormData);
        console.log('🔍 Frontend - handleSubmit - POST Response:', response.data);
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" component="h1">
            Dekurs-Vorlagen Verwaltung
          </Typography>
          <Tooltip title="Hilfe & Leitfaden">
            <IconButton
              onClick={() => setHelpDialogOpen(true)}
              color="primary"
              sx={{ ml: 1 }}
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>
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
            <Tab label="Medikamente" />
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

          {dialogTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6">Medikamente für diese Vorlage</Typography>
              <Typography variant="body2" color="text.secondary">
                Diese Medikamente werden automatisch in den Dekurs-Eintrag eingefügt, wenn diese Vorlage verwendet wird.
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <MedicationAutocomplete
                  value={selectedMedication}
                  onChange={(medication) => {
                    setSelectedMedication(medication);
                    if (medication) {
                      setMedicationFormData({
                        dosage: '',
                        dosageUnit: '',
                        frequency: '',
                        duration: '',
                        instructions: '',
                        startDate: '',
                        endDate: '',
                        quantity: undefined,
                        quantityUnit: '',
                        route: 'oral',
                        changeType: 'added',
                        notes: ''
                      });
                      setEditingMedicationIndex(null);
                      setMedicationDialogOpen(true);
                    }
                  }}
                  label="Medikament hinzufügen"
                />
              </Box>

              {formData.linkedMedications.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {formData.linkedMedications.map((med, index) => (
                    <Paper key={index} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="bold">{med.name}</Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {med.dosage && med.dosageUnit ? `${med.dosage} ${med.dosageUnit}` : med.dosage ? med.dosage : ''}
                            {med.frequency && ` • ${med.frequency}`}
                            {med.duration && ` • Dauer: ${med.duration}`}
                            {med.route && med.route !== 'oral' && ` • ${med.route === 'topical' ? 'topisch' : med.route === 'injection' ? 'Injektion' : med.route === 'inhalation' ? 'Inhalation' : med.route === 'rectal' ? 'rektal' : med.route === 'vaginal' ? 'vaginal' : 'sonstig'}`}
                          </Typography>
                          {med.instructions && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                              Einnahmehinweise: {med.instructions}
                            </Typography>
                          )}
                          {med.notes && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                              Notizen: {med.notes}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const medToEdit = formData.linkedMedications[index];
                            setSelectedMedication({ _id: medToEdit.medicationId || '', name: medToEdit.name } as Medication);
                            setMedicationFormData({
                              dosage: medToEdit.dosage || '',
                              dosageUnit: medToEdit.dosageUnit || '',
                              frequency: medToEdit.frequency || '',
                              duration: medToEdit.duration || '',
                              instructions: medToEdit.instructions || '',
                              startDate: medToEdit.startDate ? (typeof medToEdit.startDate === 'string' ? medToEdit.startDate.split('T')[0] : new Date(medToEdit.startDate).toISOString().split('T')[0]) : '',
                              endDate: medToEdit.endDate ? (typeof medToEdit.endDate === 'string' ? medToEdit.endDate.split('T')[0] : new Date(medToEdit.endDate).toISOString().split('T')[0]) : '',
                              quantity: medToEdit.quantity,
                              quantityUnit: medToEdit.quantityUnit || '',
                              route: medToEdit.route || 'oral',
                              changeType: medToEdit.changeType || 'added',
                              notes: medToEdit.notes || ''
                            });
                            setEditingMedicationIndex(index);
                            setMedicationDialogOpen(true);
                          }}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              linkedMedications: formData.linkedMedications.filter((_, i) => i !== index)
                            });
                          }}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Paper>
                  ))}
                </Box>
              )}
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

      {/* Medikament-Dialog */}
      <Dialog
        open={medicationDialogOpen}
        onClose={handleCloseMedicationDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingMedicationIndex !== null ? 'Medikament bearbeiten' : 'Medikament hinzufügen'}
          {selectedMedication && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {selectedMedication.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Dosis"
                value={medicationFormData.dosage}
                onChange={(e) => setMedicationFormData(prev => ({ ...prev, dosage: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Dosis-Einheit"
                value={medicationFormData.dosageUnit}
                onChange={(e) => setMedicationFormData(prev => ({ ...prev, dosageUnit: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Häufigkeit"
                value={medicationFormData.frequency}
                onChange={(e) => setMedicationFormData(prev => ({ ...prev, frequency: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Applikationsweg</InputLabel>
                <Select
                  value={medicationFormData.route}
                  onChange={(e) => setMedicationFormData(prev => ({ ...prev, route: e.target.value as any }))}
                  label="Applikationsweg"
                >
                  <MenuItem value="oral">Oral</MenuItem>
                  <MenuItem value="topical">Topisch</MenuItem>
                  <MenuItem value="injection">Injektion</MenuItem>
                  <MenuItem value="inhalation">Inhalation</MenuItem>
                  <MenuItem value="rectal">Rektal</MenuItem>
                  <MenuItem value="vaginal">Vaginal</MenuItem>
                  <MenuItem value="sublingual">Sublingual</MenuItem>
                  <MenuItem value="intravenous">Intravenös</MenuItem>
                  <MenuItem value="intramuscular">Intramuskulär</MenuItem>
                  <MenuItem value="subcutaneous">Subkutan</MenuItem>
                  <MenuItem value="other">Andere</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Dauer"
                value={medicationFormData.duration}
                onChange={(e) => setMedicationFormData(prev => ({ ...prev, duration: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Menge"
                type="number"
                value={medicationFormData.quantity || ''}
                onChange={(e) => setMedicationFormData(prev => ({ ...prev, quantity: e.target.value ? parseFloat(e.target.value) : undefined }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Menge Einheit"
                value={medicationFormData.quantityUnit}
                onChange={(e) => setMedicationFormData(prev => ({ ...prev, quantityUnit: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Startdatum"
                type="date"
                value={medicationFormData.startDate}
                onChange={(e) => setMedicationFormData(prev => ({ ...prev, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Enddatum"
                type="date"
                value={medicationFormData.endDate}
                onChange={(e) => setMedicationFormData(prev => ({ ...prev, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Einnahmehinweise"
                multiline
                rows={2}
                value={medicationFormData.instructions}
                onChange={(e) => setMedicationFormData(prev => ({ ...prev, instructions: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Notizen"
                multiline
                rows={2}
                value={medicationFormData.notes}
                onChange={(e) => setMedicationFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Änderungstyp</InputLabel>
                <Select
                  value={medicationFormData.changeType}
                  onChange={(e) => setMedicationFormData(prev => ({ ...prev, changeType: e.target.value as any }))}
                  label="Änderungstyp"
                >
                  <MenuItem value="added">Hinzugefügt</MenuItem>
                  <MenuItem value="modified">Geändert</MenuItem>
                  <MenuItem value="discontinued">Abgesetzt</MenuItem>
                  <MenuItem value="unchanged">Unverändert</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMedicationDialog}>Abbrechen</Button>
          <Button
            onClick={handleSaveMedication}
            variant="contained"
            disabled={!selectedMedication}
          >
            {editingMedicationIndex !== null ? 'Speichern' : 'Hinzufügen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hilfe-Dialog mit Leitfaden */}
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
          title="Leitfaden: Dekurs-Vorlagen" 
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs value={helpTab} onChange={(_, v) => setHelpTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Übersicht" />
            <Tab label="Vorlage erstellen" />
            <Tab label="Import/Export" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Was sind Dekurs-Vorlagen?
                </Typography>
                <Typography variant="body1" paragraph>
                  Dekurs-Vorlagen sind wiederverwendbare Textvorlagen für Arztbriefe und Dekurs-Einträge. 
                  Sie beschleunigen die Dokumentation erheblich und sorgen für konsistente, standardisierte Formulierungen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptkomponenten
                </Typography>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  1. Grunddaten (Tab "Allgemein")
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Code:</strong> Eindeutiger Identifikator (z.B. "HYPER-001") - Pflichtfeld</li>
                  <li><strong>Titel:</strong> Name der Vorlage (z.B. "Hypertonie Erstkonsultation") - Pflichtfeld</li>
                  <li><strong>ICD-10 Code:</strong> Optional, verknüpft mit Diagnose</li>
                  <li><strong>ICD-10 Titel:</strong> Beschreibung der Diagnose</li>
                  <li><strong>Fachrichtungen:</strong> Mehrfachauswahl (z.B. Allgemeinmedizin, Kardiologie)</li>
                  <li><strong>Sortierreihenfolge:</strong> Nummer für die Anzeigereihenfolge</li>
                  <li><strong>Status:</strong> Aktiv/Inaktiv - nur aktive Vorlagen werden angezeigt</li>
                  <li><strong>Standard-Vorlage:</strong> Als Standard markieren</li>
                </Box>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  2. Vorlageninhalt (Tab "Vorlageninhalt")
                </Typography>
                <Typography variant="body2" paragraph>
                  Strukturierte Felder für den Dekurs-Eintrag:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Diagnose (visitReason):</strong> Grund für den Besuch</li>
                  <li><strong>Klinische Beobachtungen (clinicalObservations):</strong> Befunde, Symptome</li>
                  <li><strong>Verlaufskontrolle (progressChecks):</strong> Fortschritt seit letztem Besuch</li>
                  <li><strong>Befunde (findings):</strong> Untersuchungsergebnisse</li>
                  <li><strong>Medikamentenänderungen (medicationChanges):</strong> Änderungen an Medikation</li>
                  <li><strong>Behandlungsdetails (treatmentDetails):</strong> Therapie, Maßnahmen</li>
                  <li><strong>Psychosoziale Faktoren (psychosocialFactors):</strong> Relevante Faktoren</li>
                  <li><strong>Notizen (notes):</strong> Zusätzliche Informationen</li>
                </Box>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  3. Verknüpfte Medikamente (Tab "Medikamente")
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Medikamente aus dem Medikamentenkatalog auswählen</li>
                  <li>Dosierung, Häufigkeit, Dauer festlegen</li>
                  <li>Änderungstyp: Hinzugefügt, Geändert, Abgesetzt, Unverändert</li>
                  <li>Werden beim Auslösen der Vorlage automatisch eingefügt</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Vorteile
                </Typography>
                <Box component="ul" sx={{ pl: 3 }}>
                  <li>⏱️ <strong>Zeitersparnis:</strong> Standardtexte müssen nicht jedes Mal neu geschrieben werden</li>
                  <li>📋 <strong>Konsistenz:</strong> Einheitliche Formulierungen in der Dokumentation</li>
                  <li>✅ <strong>Vollständigkeit:</strong> Strukturierte Felder reduzieren Fehler</li>
                  <li>♻️ <strong>Wiederverwendbarkeit:</strong> Eine Vorlage kann mehrfach verwendet werden</li>
                  <li>✏️ <strong>Anpassbarkeit:</strong> Vorlagen können nach Verwendung noch angepasst werden</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Schritt-für-Schritt: Vorlage erstellen
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 1: Grunddaten ausfüllen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Neue Vorlage"</li>
                  <li>Wechseln Sie zum Tab "Allgemein"</li>
                  <li>Geben Sie einen <strong>eindeutigen Code</strong> ein (z.B. "HYPER-001")</li>
                  <li>Geben Sie einen <strong>aussagekräftigen Titel</strong> ein</li>
                  <li>Optional: ICD-10 Code und Titel zuordnen</li>
                  <li>Wählen Sie die passenden Fachrichtungen aus</li>
                  <li>Setzen Sie die Sortierreihenfolge (niedrigere Zahlen erscheinen zuerst)</li>
                  <li>Aktivieren Sie die Vorlage (Status: Aktiv)</li>
                </Box>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 2: Vorlageninhalt erstellen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wechseln Sie zum Tab "Vorlageninhalt"</li>
                  <li>Füllen Sie die relevanten Felder aus:
                    <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                      <li>Diagnose: Grund für den Besuch</li>
                      <li>Klinische Beobachtungen: Befunde, Symptome</li>
                      <li>Verlaufskontrolle: Fortschritt seit letztem Besuch</li>
                      <li>Befunde: Untersuchungsergebnisse</li>
                      <li>Behandlungsdetails: Therapie, Maßnahmen</li>
                      <li>Notizen: Zusätzliche Informationen</li>
                    </Box>
                  </li>
                  <li>Verwenden Sie Platzhalter für dynamische Inhalte:
                    <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                      <li><code>{'{patientName}'}</code> - Name des Patienten</li>
                      <li><code>{'{patientAge}'}</code> - Alter des Patienten</li>
                    </Box>
                  </li>
                </Box>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 3: Medikamente verknüpfen (Optional)
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wechseln Sie zum Tab "Medikamente"</li>
                  <li>Klicken Sie auf "Medikament hinzufügen"</li>
                  <li>Wählen Sie ein Medikament aus dem Katalog</li>
                  <li>Geben Sie Dosierung, Häufigkeit, Dauer ein</li>
                  <li>Wählen Sie den Änderungstyp (Hinzugefügt, Geändert, etc.)</li>
                  <li>Speichern Sie das Medikament</li>
                </Box>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 4: Speichern
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Überprüfen Sie alle Eingaben</li>
                  <li>Klicken Sie auf "Speichern"</li>
                  <li>Die Vorlage erscheint nun in der Liste</li>
                </Box>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Tipp:</strong> Beim Erstellen eines Dekurs-Eintrags können Sie die Vorlage auswählen. 
                    Das System füllt die Felder automatisch aus und Sie können sie noch anpassen, bevor Sie speichern.
                  </Typography>
                </Alert>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Import-Funktion
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Unterstütztes Format
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>JSON:</strong> Import von Vorlagen aus JSON-Dateien
                </Typography>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  So funktioniert der Import
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf den "Import" Button</li>
                  <li>Wählen Sie eine JSON-Datei aus</li>
                  <li>Das System prüft die Datei automatisch:
                    <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                      <li>Array von Vorlagen: <code>[{'{...}'}, {'{...}'}]</code></li>
                      <li>Objekt mit vorlagen-Array: <code>{'{vorlagen: [{...}, {...}]}'}</code></li>
                      <li>Einzelne Vorlage: <code>{'{...}'}</code></li>
                    </Box>
                  </li>
                  <li>Verarbeitung:
                    <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                      <li>Existiert eine Vorlage mit demselben Code? → <strong>Update</strong></li>
                      <li>Sonst → <strong>Neue Vorlage erstellen</strong></li>
                    </Box>
                  </li>
                  <li>Ergebnis: Sie erhalten eine Meldung mit der Anzahl erstellter/aktualisierter Vorlagen</li>
                </Box>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  JSON-Format für Import
                </Typography>
                <Box 
                  sx={{ 
                    bgcolor: 'background.paper',
                    border: 2,
                    borderColor: 'primary.main',
                    p: 3,
                    borderRadius: 2,
                    fontFamily: 'monospace',
                    fontSize: '0.95rem',
                    overflow: 'auto',
                    maxHeight: '400px',
                    boxShadow: 2,
                    position: 'relative'
                  }}
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      position: 'absolute',
                      top: 8,
                      right: 12,
                      bgcolor: 'primary.main',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.7rem',
                      fontWeight: 'bold'
                    }}
                  >
                    JSON
                  </Typography>
                  <pre style={{ 
                    margin: 0,
                    color: '#1976d2',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>{`[
  {
    "code": "HYPER-001",
    "title": "Hypertonie Erstkonsultation",
    "icd10": "I10",
    "icd10Title": "Essentielle Hypertonie",
    "specialty": "allgemeinmedizin",
    "specialties": ["allgemeinmedizin", "kardiologie"],
    "diagnose": "Hypertonie",
    "anamnese": "Patient berichtet über...",
    "status": "RR 150/95 mmHg",
    "beurteilung": "Hypertonie Grad 1",
    "therapie": "Lifestyle-Modifikation empfohlen",
    "empfehlung": "Kontrolle in 4 Wochen"
  }
]`}</pre>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  💡 Tipp: Sie können dieses Format kopieren und als Vorlage für Ihre eigenen JSON-Dateien verwenden.
                </Typography>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Feld-Mapping beim Import
                </Typography>
                <Typography variant="body2" paragraph>
                  Das System mappt verschiedene Feldnamen automatisch:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><code>diagnose</code> → <code>visitReason</code></li>
                  <li><code>anamnese</code> → <code>clinicalObservations</code></li>
                  <li><code>status</code> → <code>findings</code></li>
                  <li><code>beurteilung</code> → <code>progressChecks</code></li>
                  <li><code>therapie</code> → <code>treatmentDetails</code></li>
                  <li><code>empfehlung</code> → <code>notes</code></li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Export-Funktion
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Verfügbare Formate
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>JSON-Export:</strong> Einzelne Vorlage als JSON exportieren (für Backup oder Weitergabe)</li>
                  <li><strong>XML-Export:</strong> Einzelne Vorlage als XML exportieren (für ELGA-Kompatibilität)</li>
                </Box>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  So funktioniert der Export
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf das Export-Icon (JSON oder XML) bei der gewünschten Vorlage</li>
                  <li>Die Datei wird automatisch heruntergeladen</li>
                  <li>Kann für Backup oder Weitergabe verwendet werden</li>
                </Box>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Tipp:</strong> Exportieren Sie regelmäßig Ihre Vorlagen als Backup, 
                    besonders vor größeren Änderungen oder System-Updates.
                  </Typography>
                </Alert>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices & Tipps
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Code-Vergabe
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Verwenden Sie <strong>eindeutige, aussagekräftige Codes</strong> (z.B. "HYPER-001", "DIAB-002")</li>
                  <li>✅ Verwenden Sie ein konsistentes Format (z.B. "DIAGNOSE-NUMMER")</li>
                  <li>❌ Vermeiden Sie generische Codes wie "TEMP-001"</li>
                </Box>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Titel-Formulierung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Verwenden Sie <strong>beschreibende Titel</strong> (z.B. "Hypertonie Erstkonsultation")</li>
                  <li>✅ Fügen Sie den Kontext hinzu (z.B. "Erstkonsultation", "Kontrolle", "Notfall")</li>
                  <li>❌ Vermeiden Sie zu kurze oder unklare Titel</li>
                </Box>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  ICD-10 Zuordnung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Ordnen Sie <strong>ICD-10 Codes zu</strong>, wenn die Vorlage für eine spezifische Diagnose ist</li>
                  <li>✅ Verwenden Sie den vollständigen ICD-10 Titel</li>
                  <li>✅ Dies hilft bei der automatischen Vorlagensuche</li>
                </Box>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Fachrichtungen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Ordnen Sie die Vorlage den <strong>korrekten Fachrichtungen</strong> zu</li>
                  <li>✅ Wählen Sie mehrere Fachrichtungen, wenn die Vorlage für mehrere Bereiche relevant ist</li>
                  <li>✅ Dies verbessert die Auffindbarkeit der Vorlage</li>
                </Box>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Vorlageninhalt
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Füllen Sie die <strong>relevanten Felder vollständig aus</strong></li>
                  <li>✅ Verwenden Sie Platzhalter für dynamische Inhalte (<code>{'{patientName}'}</code>, <code>{'{patientAge}'}</code>)</li>
                  <li>✅ Strukturieren Sie den Text übersichtlich (Absätze, Listen)</li>
                  <li>❌ Vermeiden Sie zu lange, unstrukturierte Texte</li>
                </Box>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Medikamente
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Verknüpfen Sie Medikamente nur, wenn sie <strong>standardmäßig relevant</strong> sind</li>
                  <li>✅ Geben Sie vollständige Informationen an (Dosierung, Häufigkeit, Dauer)</li>
                  <li>❌ Vermeiden Sie zu viele Medikamente pro Vorlage (max. 3-5 empfohlen)</li>
                </Box>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Import/Export
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Prüfen Sie die JSON-Struktur</strong> vor dem Import</li>
                  <li>✅ <strong>Erstellen Sie regelmäßig Backups</strong> durch Export</li>
                  <li>✅ Testen Sie den Import mit einer kleinen Datei zuerst</li>
                  <li>✅ Überprüfen Sie importierte Vorlagen auf Korrektheit</li>
                </Box>

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Allgemeine Tipps
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📝 Erstellen Sie Vorlagen für <strong>häufig verwendete Diagnosen</strong></li>
                  <li>🔄 <strong>Aktualisieren Sie Vorlagen regelmäßig</strong> basierend auf Feedback</li>
                  <li>🗂️ Verwenden Sie <strong>konsistente Kategorien</strong> für bessere Organisation</li>
                  <li>👥 <strong>Teilen Sie bewährte Vorlagen</strong> mit dem Team</li>
                  <li>📊 <strong>Nutzen Sie die Sortierreihenfolge</strong> für häufig verwendete Vorlagen</li>
                </Box>

                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Erfolgs-Tipp:</strong> Beginnen Sie mit 5-10 häufig verwendeten Vorlagen 
                    und erweitern Sie die Sammlung schrittweise basierend auf Ihrem Bedarf.
                  </Typography>
                </Alert>
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

