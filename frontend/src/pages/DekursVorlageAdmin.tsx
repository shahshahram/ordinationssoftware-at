import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
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
  Alert,
  Stack,
  Divider,
  Tooltip,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Assignment,
  CheckCircle,
  Cancel,
  Save,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchDekursVorlagen,
  createDekursVorlage,
  updateDekursVorlage,
  deleteDekursVorlage,
  DekursVorlage,
} from '../store/slices/dekursSlice';
import { useSnackbar } from 'notistack';
import ICD10Autocomplete from '../components/ICD10Autocomplete';
import MedicationAutocomplete from '../components/MedicationAutocomplete';
import { Icd10Code } from '../store/slices/icd10Slice';
import { Medication } from '../types/Medication';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  allgemein: 'Allgemein',
  kardiologie: 'Kardiologie',
  pneumologie: 'Pneumologie',
  gastroenterologie: 'Gastroenterologie',
  neurologie: 'Neurologie',
  orthopaedie: 'Orthopädie',
  dermatologie: 'Dermatologie',
  gynaekologie: 'Gynäkologie',
  paediatrie: 'Pädiatrie',
  notfall: 'Notfall',
  vorsorge: 'Vorsorge',
  sonstiges: 'Sonstiges',
};

const DekursVorlageAdmin: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { vorlagen, loading } = useAppSelector((state) => state.dekurs);
  const { enqueueSnackbar } = useSnackbar();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVorlage, setSelectedVorlage] = useState<DekursVorlage | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [vorlageForm, setVorlageForm] = useState<Partial<DekursVorlage>>({
    name: '',
    description: '',
    category: 'allgemein',
    template: {
      clinicalObservations: '',
      progressChecks: '',
      findings: '',
      medicationChanges: '',
      treatmentDetails: '',
      psychosocialFactors: '',
      notes: '',
      visitReason: '',
      visitType: 'appointment',
    },
    textBlocks: [],
    suggestedDiagnoses: [],
    suggestedMedications: [],
    isActive: true,
    isPublic: false,
  });

  const [newTextBlock, setNewTextBlock] = useState({
    label: '',
    text: '',
    category: 'notes',
  });

  // Prüfe Admin-Rechte
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchDekursVorlagen({}));
    }
  }, [isAdmin, dispatch]);

  const handleCreateVorlage = () => {
    setVorlageForm({
      name: '',
      description: '',
      category: 'allgemein',
      template: {
        clinicalObservations: '',
        progressChecks: '',
        findings: '',
        medicationChanges: '',
        treatmentDetails: '',
        psychosocialFactors: '',
        notes: '',
        visitReason: '',
        visitType: 'appointment',
      },
      textBlocks: [],
      suggestedDiagnoses: [],
      suggestedMedications: [],
      isActive: true,
      isPublic: false,
    });
    setSelectedVorlage(null);
    setTabValue(0);
    setEditDialogOpen(true);
  };

  const handleEditVorlage = (vorlage: DekursVorlage) => {
    setSelectedVorlage(vorlage);
    setVorlageForm({
      name: vorlage.name,
      description: vorlage.description || '',
      category: vorlage.category || 'allgemein',
      template: vorlage.template || {
        clinicalObservations: '',
        progressChecks: '',
        findings: '',
        medicationChanges: '',
        treatmentDetails: '',
        psychosocialFactors: '',
        notes: '',
        visitReason: '',
        visitType: 'appointment',
      },
      textBlocks: vorlage.textBlocks || [],
      suggestedDiagnoses: vorlage.suggestedDiagnoses || [],
      suggestedMedications: vorlage.suggestedMedications || [],
      isActive: vorlage.isActive !== false,
      isPublic: vorlage.isPublic || false,
    });
    setTabValue(0);
    setEditDialogOpen(true);
  };

  const handleSaveVorlage = async () => {
    try {
      // Stelle sicher, dass template-Objekt vollständig ist
      const templateData = {
        clinicalObservations: vorlageForm.template?.clinicalObservations || '',
        progressChecks: vorlageForm.template?.progressChecks || '',
        findings: vorlageForm.template?.findings || '',
        medicationChanges: vorlageForm.template?.medicationChanges || '',
        treatmentDetails: vorlageForm.template?.treatmentDetails || '',
        psychosocialFactors: vorlageForm.template?.psychosocialFactors || '',
        notes: vorlageForm.template?.notes || '',
        visitReason: vorlageForm.template?.visitReason || '',
        visitType: vorlageForm.template?.visitType || 'appointment',
      };

      const vorlageDataToSave = {
        name: vorlageForm.name || '',
        description: vorlageForm.description || '',
        category: vorlageForm.category || 'allgemein',
        template: templateData,
        textBlocks: vorlageForm.textBlocks || [],
        suggestedDiagnoses: vorlageForm.suggestedDiagnoses || [],
        suggestedMedications: vorlageForm.suggestedMedications || [],
        isActive: vorlageForm.isActive !== false,
        isPublic: vorlageForm.isPublic || false,
      };

      console.log('DekursVorlageAdmin: Speichere Vorlage', vorlageDataToSave);
      console.log('DekursVorlageAdmin: Template-Daten', templateData);

      if (selectedVorlage?._id) {
        await dispatch(
          updateDekursVorlage({
            vorlageId: selectedVorlage._id,
            vorlageData: vorlageDataToSave,
          })
        ).unwrap();
        enqueueSnackbar('Vorlage erfolgreich aktualisiert', { variant: 'success' });
      } else {
        await dispatch(createDekursVorlage(vorlageDataToSave)).unwrap();
        enqueueSnackbar('Vorlage erfolgreich erstellt', { variant: 'success' });
      }
      setEditDialogOpen(false);
      setSelectedVorlage(null);
      dispatch(fetchDekursVorlagen({}));
    } catch (error: any) {
      console.error('DekursVorlageAdmin: Fehler beim Speichern', error);
      enqueueSnackbar(`Fehler: ${error.message || 'Unbekannter Fehler'}`, {
        variant: 'error',
      });
    }
  };

  const handleDeleteVorlage = async () => {
    if (!selectedVorlage?._id) return;

    try {
      await dispatch(deleteDekursVorlage(selectedVorlage._id)).unwrap();
      enqueueSnackbar('Vorlage erfolgreich gelöscht', { variant: 'success' });
      setDeleteDialogOpen(false);
      setSelectedVorlage(null);
      dispatch(fetchDekursVorlagen({}));
    } catch (error: any) {
      enqueueSnackbar(`Fehler: ${error.message || 'Unbekannter Fehler'}`, {
        variant: 'error',
      });
    }
  };

  const handleAddTextBlock = () => {
    if (!newTextBlock.label || !newTextBlock.text) {
      enqueueSnackbar('Bitte füllen Sie alle Felder aus', { variant: 'warning' });
      return;
    }
    setVorlageForm((prev) => ({
      ...prev,
      textBlocks: [...(prev.textBlocks || []), { ...newTextBlock }],
    }));
    setNewTextBlock({ label: '', text: '', category: 'notes' });
  };

  const handleRemoveTextBlock = (index: number) => {
    setVorlageForm((prev) => ({
      ...prev,
      textBlocks: (prev.textBlocks || []).filter((_, i) => i !== index),
    }));
  };

  const handleAddDiagnosis = (code: string, display: string, fullCode: Icd10Code) => {
    // Prüfe ob Diagnose bereits vorhanden ist
    const existing = vorlageForm.suggestedDiagnoses?.find(
      (d) => d.icd10Code === code || d.icd10Code === fullCode.code
    );
    if (existing) {
      enqueueSnackbar('Diese Diagnose ist bereits vorhanden', { variant: 'warning' });
      return;
    }

    setVorlageForm((prev) => ({
      ...prev,
      suggestedDiagnoses: [
        ...(prev.suggestedDiagnoses || []),
        {
          icd10Code: fullCode.code || code,
          display: display || fullCode.title || '',
        },
      ],
    }));
    enqueueSnackbar('Diagnose hinzugefügt', { variant: 'success' });
  };

  const handleRemoveDiagnosis = (index: number) => {
    setVorlageForm((prev) => ({
      ...prev,
      suggestedDiagnoses: (prev.suggestedDiagnoses || []).filter((_, i) => i !== index),
    }));
  };

  const handleAddMedication = (medication: Medication | null) => {
    if (!medication) return;

    // Prüfe ob Medikament bereits vorhanden ist
    const medicationId = medication._id;
    const existing = vorlageForm.suggestedMedications?.find(
      (m) => m.medicationId === medicationId || m.name === medication.name
    );
    if (existing) {
      enqueueSnackbar('Dieses Medikament ist bereits vorhanden', { variant: 'warning' });
      return;
    }

    setVorlageForm((prev) => ({
      ...prev,
      suggestedMedications: [
        ...(prev.suggestedMedications || []),
        {
          medicationId: medicationId || '',
          name: medication.name || '',
        },
      ],
    }));
    enqueueSnackbar('Medikament hinzugefügt', { variant: 'success' });
  };

  const handleRemoveMedication = (index: number) => {
    setVorlageForm((prev) => ({
      ...prev,
      suggestedMedications: (prev.suggestedMedications || []).filter((_, i) => i !== index),
    }));
  };

  if (!isAdmin) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Keine Berechtigung. Admin-Rechte erforderlich.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" gutterBottom>
              Dekurs-Vorlagen Verwaltung
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Erstellen und verwalten Sie Vorlagen und Textbausteine für Dekurs-Einträge
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateVorlage}
            sx={{ bgcolor: '#FFF9C4', color: 'text.primary', '&:hover': { bgcolor: '#FFEB3B' } }}
          >
            Neue Vorlage
          </Button>
        </Stack>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Kategorie</TableCell>
                <TableCell>Beschreibung</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Sichtbarkeit</TableCell>
                <TableCell>Verwendung</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Lade Vorlagen...
                  </TableCell>
                </TableRow>
              ) : vorlagen.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Keine Vorlagen vorhanden
                  </TableCell>
                </TableRow>
              ) : (
                vorlagen.map((vorlage) => (
                  <TableRow key={vorlage._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {vorlage.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={CATEGORY_LABELS[vorlage.category || 'allgemein'] || vorlage.category}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                        {vorlage.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {vorlage.isActive !== false ? (
                        <Chip icon={<CheckCircle />} label="Aktiv" color="success" size="small" />
                      ) : (
                        <Chip icon={<Cancel />} label="Inaktiv" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {vorlage.isPublic ? (
                        <Chip label="Öffentlich" color="info" size="small" />
                      ) : (
                        <Chip label="Privat" color="default" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {vorlage.usageCount || 0}x verwendet
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Bearbeiten">
                        <IconButton
                          size="small"
                          onClick={() => handleEditVorlage(vorlage)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Löschen">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedVorlage(vorlage);
                            setDeleteDialogOpen(true);
                          }}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Bearbeitungs-Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#FFF9C4',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: 'yellow.50', borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedVorlage ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}
            </Typography>
            <IconButton onClick={() => setEditDialogOpen(false)} size="small">
              <Cancel />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ bgcolor: '#FFF9C4' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
            <Tab label="Grunddaten" />
            <Tab label="Vorlagen-Inhalte" />
            <Tab label="Textbausteine" />
            <Tab label="Vorschläge" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Name *"
                value={vorlageForm.name || ''}
                onChange={(e) => setVorlageForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
              <TextField
                fullWidth
                label="Beschreibung"
                value={vorlageForm.description || ''}
                onChange={(e) =>
                  setVorlageForm((prev) => ({ ...prev, description: e.target.value }))
                }
                multiline
                rows={3}
              />
              <FormControl fullWidth>
                <InputLabel>Kategorie</InputLabel>
                <Select
                  value={vorlageForm.category || 'allgemein'}
                  onChange={(e) =>
                    setVorlageForm((prev) => ({ ...prev, category: e.target.value as any }))
                  }
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <MenuItem key={key} value={key}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={vorlageForm.isActive !== false}
                    onChange={(e) =>
                      setVorlageForm((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                  />
                }
                label="Aktiv"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={vorlageForm.isPublic || false}
                    onChange={(e) =>
                      setVorlageForm((prev) => ({ ...prev, isPublic: e.target.checked }))
                    }
                  />
                }
                label="Öffentlich (für alle Ärzte sichtbar)"
              />
            </Stack>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Klinische Beobachtungen"
                value={vorlageForm.template?.clinicalObservations || ''}
                onChange={(e) =>
                  setVorlageForm((prev) => ({
                    ...prev,
                    template: {
                      ...(prev.template || {}),
                      clinicalObservations: e.target.value,
                      progressChecks: prev.template?.progressChecks || '',
                      findings: prev.template?.findings || '',
                      medicationChanges: prev.template?.medicationChanges || '',
                      treatmentDetails: prev.template?.treatmentDetails || '',
                      psychosocialFactors: prev.template?.psychosocialFactors || '',
                      notes: prev.template?.notes || '',
                      visitReason: prev.template?.visitReason || '',
                      visitType: prev.template?.visitType || 'appointment',
                    },
                  }))
                }
                multiline
                rows={4}
              />
              <TextField
                fullWidth
                label="Verlaufskontrollen"
                value={vorlageForm.template?.progressChecks || ''}
                onChange={(e) =>
                  setVorlageForm((prev) => ({
                    ...prev,
                    template: {
                      ...(prev.template || {}),
                      clinicalObservations: prev.template?.clinicalObservations || '',
                      progressChecks: e.target.value,
                      findings: prev.template?.findings || '',
                      medicationChanges: prev.template?.medicationChanges || '',
                      treatmentDetails: prev.template?.treatmentDetails || '',
                      psychosocialFactors: prev.template?.psychosocialFactors || '',
                      notes: prev.template?.notes || '',
                      visitReason: prev.template?.visitReason || '',
                      visitType: prev.template?.visitType || 'appointment',
                    },
                  }))
                }
                multiline
                rows={4}
              />
              <TextField
                fullWidth
                label="Befunde"
                value={vorlageForm.template?.findings || ''}
                onChange={(e) =>
                  setVorlageForm((prev) => ({
                    ...prev,
                    template: {
                      ...(prev.template || {}),
                      clinicalObservations: prev.template?.clinicalObservations || '',
                      progressChecks: prev.template?.progressChecks || '',
                      findings: e.target.value,
                      medicationChanges: prev.template?.medicationChanges || '',
                      treatmentDetails: prev.template?.treatmentDetails || '',
                      psychosocialFactors: prev.template?.psychosocialFactors || '',
                      notes: prev.template?.notes || '',
                      visitReason: prev.template?.visitReason || '',
                      visitType: prev.template?.visitType || 'appointment',
                    },
                  }))
                }
                multiline
                rows={4}
              />
              <TextField
                fullWidth
                label="Medikamentenänderungen"
                value={vorlageForm.template?.medicationChanges || ''}
                onChange={(e) =>
                  setVorlageForm((prev) => ({
                    ...prev,
                    template: {
                      ...(prev.template || {}),
                      clinicalObservations: prev.template?.clinicalObservations || '',
                      progressChecks: prev.template?.progressChecks || '',
                      findings: prev.template?.findings || '',
                      medicationChanges: e.target.value,
                      treatmentDetails: prev.template?.treatmentDetails || '',
                      psychosocialFactors: prev.template?.psychosocialFactors || '',
                      notes: prev.template?.notes || '',
                      visitReason: prev.template?.visitReason || '',
                      visitType: prev.template?.visitType || 'appointment',
                    },
                  }))
                }
                multiline
                rows={4}
              />
              <TextField
                fullWidth
                label="Behandlungsdetails"
                value={vorlageForm.template?.treatmentDetails || ''}
                onChange={(e) =>
                  setVorlageForm((prev) => ({
                    ...prev,
                    template: {
                      ...(prev.template || {}),
                      clinicalObservations: prev.template?.clinicalObservations || '',
                      progressChecks: prev.template?.progressChecks || '',
                      findings: prev.template?.findings || '',
                      medicationChanges: prev.template?.medicationChanges || '',
                      treatmentDetails: e.target.value,
                      psychosocialFactors: prev.template?.psychosocialFactors || '',
                      notes: prev.template?.notes || '',
                      visitReason: prev.template?.visitReason || '',
                      visitType: prev.template?.visitType || 'appointment',
                    },
                  }))
                }
                multiline
                rows={4}
              />
              <TextField
                fullWidth
                label="Psychosoziale Faktoren"
                value={vorlageForm.template?.psychosocialFactors || ''}
                onChange={(e) =>
                  setVorlageForm((prev) => ({
                    ...prev,
                    template: {
                      ...(prev.template || {}),
                      clinicalObservations: prev.template?.clinicalObservations || '',
                      progressChecks: prev.template?.progressChecks || '',
                      findings: prev.template?.findings || '',
                      medicationChanges: prev.template?.medicationChanges || '',
                      treatmentDetails: prev.template?.treatmentDetails || '',
                      psychosocialFactors: e.target.value,
                      notes: prev.template?.notes || '',
                      visitReason: prev.template?.visitReason || '',
                      visitType: prev.template?.visitType || 'appointment',
                    },
                  }))
                }
                multiline
                rows={4}
              />
              <TextField
                fullWidth
                label="Notizen"
                value={vorlageForm.template?.notes || ''}
                onChange={(e) =>
                  setVorlageForm((prev) => ({
                    ...prev,
                    template: {
                      ...(prev.template || {}),
                      clinicalObservations: prev.template?.clinicalObservations || '',
                      progressChecks: prev.template?.progressChecks || '',
                      findings: prev.template?.findings || '',
                      medicationChanges: prev.template?.medicationChanges || '',
                      treatmentDetails: prev.template?.treatmentDetails || '',
                      psychosocialFactors: prev.template?.psychosocialFactors || '',
                      notes: e.target.value,
                      visitReason: prev.template?.visitReason || '',
                      visitType: prev.template?.visitType || 'appointment',
                    },
                  }))
                }
                multiline
                rows={4}
              />
              <TextField
                fullWidth
                label="Besuchsgrund (Standard)"
                value={vorlageForm.template?.visitReason || ''}
                onChange={(e) =>
                  setVorlageForm((prev) => ({
                    ...prev,
                    template: {
                      ...(prev.template || {}),
                      clinicalObservations: prev.template?.clinicalObservations || '',
                      progressChecks: prev.template?.progressChecks || '',
                      findings: prev.template?.findings || '',
                      medicationChanges: prev.template?.medicationChanges || '',
                      treatmentDetails: prev.template?.treatmentDetails || '',
                      psychosocialFactors: prev.template?.psychosocialFactors || '',
                      notes: prev.template?.notes || '',
                      visitReason: e.target.value,
                      visitType: prev.template?.visitType || 'appointment',
                    },
                  }))
                }
              />
              <FormControl fullWidth>
                <InputLabel>Besuchstyp (Standard)</InputLabel>
                <Select
                  value={vorlageForm.template?.visitType || 'appointment'}
                  onChange={(e) =>
                    setVorlageForm((prev) => ({
                      ...prev,
                      template: {
                        ...(prev.template || {}),
                        clinicalObservations: prev.template?.clinicalObservations || '',
                        progressChecks: prev.template?.progressChecks || '',
                        findings: prev.template?.findings || '',
                        medicationChanges: prev.template?.medicationChanges || '',
                        treatmentDetails: prev.template?.treatmentDetails || '',
                        psychosocialFactors: prev.template?.psychosocialFactors || '',
                        notes: prev.template?.notes || '',
                        visitReason: prev.template?.visitReason || '',
                        visitType: e.target.value as any,
                      },
                    }))
                  }
                >
                  <MenuItem value="appointment">Termin</MenuItem>
                  <MenuItem value="phone">Telefonat</MenuItem>
                  <MenuItem value="emergency">Notfall</MenuItem>
                  <MenuItem value="follow-up">Nachkontrolle</MenuItem>
                  <MenuItem value="other">Sonstiges</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight="bold">
                Textbausteine hinzufügen
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Bezeichnung"
                    value={newTextBlock.label}
                    onChange={(e) =>
                      setNewTextBlock((prev) => ({ ...prev, label: e.target.value }))
                    }
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Kategorie</InputLabel>
                    <Select
                      value={newTextBlock.category}
                      onChange={(e) =>
                        setNewTextBlock((prev) => ({ ...prev, category: e.target.value }))
                      }
                    >
                      <MenuItem value="clinicalObservations">Klinische Beobachtungen</MenuItem>
                      <MenuItem value="progressChecks">Verlaufskontrollen</MenuItem>
                      <MenuItem value="findings">Befunde</MenuItem>
                      <MenuItem value="medicationChanges">Medikamentenänderungen</MenuItem>
                      <MenuItem value="treatmentDetails">Behandlungsdetails</MenuItem>
                      <MenuItem value="psychosocialFactors">Psychosoziale Faktoren</MenuItem>
                      <MenuItem value="notes">Notizen</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={handleAddTextBlock}
                    sx={{ height: '40px' }}
                  >
                    Hinzufügen
                  </Button>
                </Grid>
              </Grid>
              <TextField
                fullWidth
                label="Text"
                value={newTextBlock.text}
                onChange={(e) =>
                  setNewTextBlock((prev) => ({ ...prev, text: e.target.value }))
                }
                multiline
                rows={3}
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" fontWeight="bold">
                Vorhandene Textbausteine
              </Typography>
              {vorlageForm.textBlocks && vorlageForm.textBlocks.length > 0 ? (
                <Stack spacing={1}>
                  {vorlageForm.textBlocks.map((block, index) => (
                    <Card key={index}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="start">
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {block.label}
                            </Typography>
                            <Chip
                              label={block.category}
                              size="small"
                              sx={{ mt: 0.5, mr: 1 }}
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              {block.text}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveTextBlock(index)}
                          >
                            <Delete />
                          </IconButton>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Keine Textbausteine vorhanden
                </Typography>
              )}
            </Stack>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Stack spacing={3}>
              {/* Vorgeschlagene Diagnosen */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Vorgeschlagene Diagnosen
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Diese Diagnosen werden automatisch vorgeschlagen, wenn diese Vorlage im Dekurs-Dialog verwendet wird.
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <ICD10Autocomplete
                    onSelect={(code: string, display: string, fullCode: Icd10Code) =>
                      handleAddDiagnosis(code, display, fullCode)
                    }
                  />
                </Box>
                {vorlageForm.suggestedDiagnoses && vorlageForm.suggestedDiagnoses.length > 0 ? (
                  <Stack spacing={1}>
                    {vorlageForm.suggestedDiagnoses.map((diagnosis, index) => (
                      <Card key={index}>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {diagnosis.icd10Code}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {diagnosis.display}
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveDiagnosis(index)}
                            >
                              <Delete />
                            </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Keine Diagnosen hinzugefügt
                  </Typography>
                )}
              </Box>

              <Divider />

              {/* Vorgeschlagene Medikamente */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Vorgeschlagene Medikamente
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Diese Medikamente werden automatisch vorgeschlagen, wenn diese Vorlage im Dekurs-Dialog verwendet wird.
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <MedicationAutocomplete
                    value={null}
                    onChange={handleAddMedication}
                    label="Medikament suchen und hinzufügen"
                  />
                </Box>
                {vorlageForm.suggestedMedications && vorlageForm.suggestedMedications.length > 0 ? (
                  <Stack spacing={1}>
                    {vorlageForm.suggestedMedications.map((medication, index) => (
                      <Card key={index}>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {medication.name}
                              </Typography>
                              {medication.medicationId && (
                                <Typography variant="caption" color="text.secondary">
                                  ID: {medication.medicationId}
                                </Typography>
                              )}
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveMedication(index)}
                            >
                              <Delete />
                            </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Keine Medikamente hinzugefügt
                  </Typography>
                )}
              </Box>
            </Stack>
          </TabPanel>
        </DialogContent>

        <DialogActions sx={{ bgcolor: 'yellow.50', borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => setEditDialogOpen(false)} startIcon={<Cancel />}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSaveVorlage}
            variant="contained"
            startIcon={<Save />}
            disabled={!vorlageForm.name}
            sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lösch-Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Vorlage löschen?</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie die Vorlage &quot;{selectedVorlage?.name}&quot; wirklich löschen? Diese
            Aktion kann nicht rückgängig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleDeleteVorlage} color="error" variant="contained">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DekursVorlageAdmin;

