import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Divider,
  Grid,
  Switch,
  FormControlLabel,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  MedicalServices as MedicalIcon,
  Receipt as ReceiptIcon,
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchPatientDiagnoses,
  fetchEncounterDiagnoses,
  createDiagnosis,
  updateDiagnosis,
  deleteDiagnosis,
  setSelectedDiagnosis,
  clearError
} from '../store/slices/diagnosisSlice';
import { PatientDiagnosis, CreateDiagnosisData, UpdateDiagnosisData } from '../store/slices/diagnosisSlice';
import ICD10Autocomplete from './ICD10Autocomplete';

interface DiagnosisManagerProps {
  patientId?: string;
  encounterId?: string;
  onDiagnosisChange?: (diagnoses: PatientDiagnosis[]) => void;
  allowEdit?: boolean;
  showPrimaryToggle?: boolean;
  context?: 'medical' | 'billing' | 'reporting';
}

const DiagnosisManager: React.FC<DiagnosisManagerProps> = ({
  patientId,
  encounterId,
  onDiagnosisChange,
  allowEdit = true,
  showPrimaryToggle = true,
  context = 'medical'
}) => {
  const dispatch = useAppDispatch();
  const {
    patientDiagnoses,
    encounterDiagnoses,
    selectedDiagnosis,
    loading,
    error
  } = useAppSelector(state => state.diagnoses);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingDiagnosis, setEditingDiagnosis] = useState<PatientDiagnosis | null>(null);
  const [formData, setFormData] = useState<CreateDiagnosisData>({
    patientId: patientId || '',
    encounterId: encounterId,
    code: '',
    catalogYear: new Date().getFullYear(),
    display: '',
    status: 'active',
    side: '',
    isPrimary: false,
    source: 'clinical'
  });

  // Load diagnoses
  useEffect(() => {
    if (patientId) {
      dispatch(fetchPatientDiagnoses({ patientId }));
    }
    if (encounterId) {
      dispatch(fetchEncounterDiagnoses(encounterId));
    }
  }, [dispatch, patientId, encounterId]);

  // Notify parent of changes
  useEffect(() => {
    const diagnoses = encounterId ? encounterDiagnoses : patientDiagnoses;
    onDiagnosisChange?.(diagnoses);
  }, [patientDiagnoses, encounterDiagnoses, encounterId, onDiagnosisChange]);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Validierung vor dem Speichern
      if (!formData.code || !formData.display) {
        console.error('DiagnosisManager: Missing required fields:', { code: formData.code, display: formData.display });
        alert('Bitte wählen Sie einen gültigen ICD-10 Code aus.');
        return;
      }

      if (editingDiagnosis) {
        // Update existing diagnosis
        const updateData: UpdateDiagnosisData = {
          status: formData.status,
          onsetDate: formData.onsetDate,
          resolvedDate: formData.resolvedDate,
          severity: formData.severity,
          side: formData.side,
          isPrimary: formData.isPrimary,
          notes: formData.notes
        };
        await dispatch(updateDiagnosis({ id: editingDiagnosis._id, data: updateData }));
      } else {
        // Create new diagnosis
        console.log('DiagnosisManager: Creating diagnosis with data:', formData);
        await dispatch(createDiagnosis(formData));
      }
      
      setOpenDialog(false);
      setEditingDiagnosis(null);
      resetForm();
    } catch (error) {
      console.error('Error saving diagnosis:', error);
    }
  };

  // Handle code selection from autocomplete
  const handleCodeSelect = (code: string, display: string, fullCode: any) => {
    console.log('DiagnosisManager: handleCodeSelect called with:', { code, display, fullCode });
    const finalDisplay = display || fullCode?.title || fullCode?.longTitle || 'Unbekannt';
    console.log('DiagnosisManager: finalDisplay:', finalDisplay);
    setFormData(prev => ({
      ...prev,
      code,
      display: finalDisplay,
      catalogYear: fullCode?.releaseYear || new Date().getFullYear()
    }));
  };

  // Handle edit
  const handleEdit = (diagnosis: PatientDiagnosis) => {
    setEditingDiagnosis(diagnosis);
    setFormData({
      patientId: diagnosis.patientId,
      encounterId: diagnosis.encounterId,
      code: diagnosis.code,
      catalogYear: diagnosis.catalogYear,
      display: diagnosis.display,
      status: diagnosis.status,
      onsetDate: diagnosis.onsetDate,
      resolvedDate: diagnosis.resolvedDate,
      severity: diagnosis.severity,
      side: diagnosis.side || '',
      isPrimary: diagnosis.isPrimary,
      source: diagnosis.source,
      notes: diagnosis.notes
    });
    setOpenDialog(true);
  };

  // Handle delete
  const handleDelete = async (diagnosis: PatientDiagnosis) => {
    if (window.confirm('Diagnose wirklich löschen?')) {
      await dispatch(deleteDiagnosis(diagnosis._id));
    }
  };

  // Handle primary toggle
  const handlePrimaryToggle = async (diagnosis: PatientDiagnosis) => {
    const updateData: UpdateDiagnosisData = {
      isPrimary: !diagnosis.isPrimary
    };
    await dispatch(updateDiagnosis({ id: diagnosis._id, data: updateData }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      patientId: patientId || '',
      encounterId: encounterId,
      code: '',
      catalogYear: new Date().getFullYear(),
      display: '',
      status: 'active',
      side: '',
      isPrimary: false,
      source: 'clinical'
    });
  };

  // Open dialog for new diagnosis
  const handleAddNew = () => {
    setEditingDiagnosis(null);
    resetForm();
    setOpenDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDiagnosis(null);
    resetForm();
  };

  // Get current diagnoses list
  const currentDiagnoses = encounterId ? encounterDiagnoses : patientDiagnoses;
  const primaryDiagnosis = currentDiagnoses.find(d => d.isPrimary);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'resolved': return 'default';
      case 'provisional': return 'warning';
      case 'ruled-out': return 'error';
      default: return 'default';
    }
  };

  // Get severity color
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'mild': return 'success';
      case 'moderate': return 'warning';
      case 'severe': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Diagnosen
          {currentDiagnoses.length > 0 && (
            <Badge badgeContent={currentDiagnoses.length} color="primary" sx={{ ml: 1 }} />
          )}
        </Typography>
        {allowEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddNew}
            size="small"
          >
            Diagnose hinzufügen
          </Button>
        )}
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      {/* Primary Diagnosis */}
      {primaryDiagnosis && (
        <Card sx={{ mb: 2, border: 2, borderColor: 'primary.main' }}>
          <CardContent sx={{ py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StarIcon color="primary" />
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold' }}>
                Hauptdiagnose
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {primaryDiagnosis.code}
              </Typography>
              <Typography variant="body2">
                {primaryDiagnosis.display}
              </Typography>
              <Chip
                label={primaryDiagnosis.statusGerman}
                size="small"
                color={getStatusColor(primaryDiagnosis.status)}
                variant="outlined"
              />
              {primaryDiagnosis.side && (
                <Chip
                  label={primaryDiagnosis.side === 'left' ? 'Links' : primaryDiagnosis.side === 'right' ? 'Rechts' : 'Beidseitig'}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Diagnoses List */}
      {currentDiagnoses.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <MedicalIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Keine Diagnosen vorhanden
            </Typography>
            {allowEdit && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddNew}
                sx={{ mt: 2 }}
              >
                Erste Diagnose hinzufügen
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <List>
          {[...currentDiagnoses]
            .sort((a, b) => {
              // Primary diagnosis first, then by creation date
              if (a.isPrimary && !b.isPrimary) return -1;
              if (!a.isPrimary && b.isPrimary) return 1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            })
            .map((diagnosis, index) => (
              <React.Fragment key={diagnosis._id}>
                <ListItem
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: diagnosis.isPrimary ? 'primary.50' : 'background.paper'
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 'bold',
                            color: diagnosis.isPrimary ? 'primary.main' : 'text.primary'
                          }}
                        >
                          {diagnosis.code}
                        </Typography>
                        <Typography variant="body1" sx={{ flex: 1 }}>
                          {diagnosis.display}
                        </Typography>
                        {diagnosis.isPrimary && (
                          <Chip
                            icon={<StarIcon />}
                            label="Hauptdiagnose"
                            size="small"
                            color="primary"
                            variant="filled"
                          />
                        )}
                        <Chip
                          label={diagnosis.statusGerman}
                          size="small"
                          color={getStatusColor(diagnosis.status)}
                          variant="outlined"
                        />
                        {diagnosis.severity && (
                          <Chip
                            label={diagnosis.severityGerman}
                            size="small"
                            color={getSeverityColor(diagnosis.severity)}
                            variant="outlined"
                          />
                        )}
                        {diagnosis.side && (
                          <Chip
                            label={diagnosis.side === 'left' ? 'Links' : diagnosis.side === 'right' ? 'Rechts' : 'Beidseitig'}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {diagnosis.notes && (
                          <Typography variant="caption" color="text.secondary" component="div">
                            {diagnosis.notes}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary" component="div">
                            Erstellt: {new Date(diagnosis.createdAt).toLocaleDateString('de-DE')}
                          </Typography>
                          {diagnosis.onsetDate && (
                            <Typography variant="caption" color="text.secondary" component="div">
                              Beginn: {new Date(diagnosis.onsetDate).toLocaleDateString('de-DE')}
                            </Typography>
                          )}
                          {diagnosis.resolvedDate && (
                            <Typography variant="caption" color="text.secondary" component="div">
                              Ende: {new Date(diagnosis.resolvedDate).toLocaleDateString('de-DE')}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                  {allowEdit && (
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {showPrimaryToggle && (
                          <Tooltip title={diagnosis.isPrimary ? "Hauptdiagnose entfernen" : "Als Hauptdiagnose setzen"}>
                            <IconButton
                              size="small"
                              onClick={() => handlePrimaryToggle(diagnosis)}
                              color={diagnosis.isPrimary ? "primary" : "default"}
                            >
                              {diagnosis.isPrimary ? <StarIcon /> : <StarBorderIcon />}
                            </IconButton>
                          </Tooltip>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(diagnosis)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(diagnosis)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              </React.Fragment>
            ))}
        </List>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingDiagnosis ? 'Diagnose bearbeiten' : 'Neue Diagnose hinzufügen'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* ICD-10 Code Selection */}
            <Box>
              <ICD10Autocomplete
                onSelect={handleCodeSelect}
                context={context}
                requireBillable={context === 'billing'}
                label="ICD-10 Code"
                placeholder="Code oder Beschreibung eingeben..."
                value={formData.code ? `${formData.code} - ${formData.display}` : ''}
                onChange={(value) => {
                  // Extract code and display from the formatted string
                  const match = value.match(/^([A-Z0-9.]+)\s*-\s*(.+)$/);
                  if (match) {
                    setFormData(prev => ({
                      ...prev,
                      code: match[1],
                      display: match[2]
                    }));
                  }
                }}
              />
            </Box>

            {/* Status and Severity */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    label="Status"
                  >
                    <MenuItem value="active">Aktiv</MenuItem>
                    <MenuItem value="resolved">Behoben</MenuItem>
                    <MenuItem value="provisional">Verdachtsdiagnose</MenuItem>
                    <MenuItem value="ruled-out">Ausgeschlossen</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Schweregrad</InputLabel>
                  <Select
                    value={formData.severity || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value as any }))}
                    label="Schweregrad"
                  >
                    <MenuItem value="">Nicht angegeben</MenuItem>
                    <MenuItem value="mild">Leicht</MenuItem>
                    <MenuItem value="moderate">Mäßig</MenuItem>
                    <MenuItem value="severe">Schwer</MenuItem>
                    <MenuItem value="critical">Kritisch</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Seite */}
            <Box>
              <FormControl fullWidth>
                <InputLabel>Seite</InputLabel>
                <Select
                  value={formData.side || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, side: e.target.value as any }))}
                  label="Seite"
                >
                  <MenuItem value="">Keine Angabe</MenuItem>
                  <MenuItem value="left">Links</MenuItem>
                  <MenuItem value="right">Rechts</MenuItem>
                  <MenuItem value="bilateral">Beidseitig</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Onset and Resolved Date */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="Beginn"
                  type="date"
                  value={formData.onsetDate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, onsetDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="Ende"
                  type="date"
                  value={formData.resolvedDate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, resolvedDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Box>

            {/* Primary Diagnosis */}
            {showPrimaryToggle && (
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isPrimary}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPrimary: e.target.checked }))}
                    />
                  }
                  label="Hauptdiagnose"
                />
              </Box>
            )}

            {/* Notes */}
            <Box>
              <TextField
                fullWidth
                label="Notizen"
                multiline
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Zusätzliche Informationen zur Diagnose..."
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.code || loading}
          >
            {editingDiagnosis ? 'Aktualisieren' : 'Hinzufügen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiagnosisManager;
