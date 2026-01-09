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
  Tooltip,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Medication as MedicationIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Sync as SyncIcon,
  Warning as WarningIcon,
  Receipt as ReceiptIcon,
  Send as SendIcon,
  QrCode as QrCodeIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  CancelOutlined as CancelOutlinedIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchPatientMedications,
  fetchActiveMedications,
  fetchEncounterMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  discontinueMedication,
  reactivateMedication,
  setSelectedMedication,
  clearError,
  syncMedicationsWithELGA,
  fetchELGAMedications,
  resolveMedicationConflict,
  clearSyncResult,
  createPrescription,
  sendPrescription,
  fetchPrescriptions,
  checkPrescriptionStatus,
  cancelPrescription,
  checkMedicationInteractions,
  checkNewMedicationInteraction,
  validateMedicationDosage
} from '../store/slices/medicationSlice';
import { PatientMedication, CreateMedicationData, UpdateMedicationData, MedicationInteraction } from '../store/slices/medicationSlice';
import MedicationAutocomplete from './MedicationAutocomplete';
import MedicationDialog from './MedicationDialog';
import { Medication } from '../types/Medication';

interface MedicationManagerProps {
  patientId?: string;
  encounterId?: string;
  onMedicationChange?: (medications: PatientMedication[]) => void;
  allowEdit?: boolean;
  showActiveOnly?: boolean;
}

const MedicationManager: React.FC<MedicationManagerProps> = ({
  patientId,
  encounterId,
  onMedicationChange,
  allowEdit = true,
  showActiveOnly = false
}) => {
  const dispatch = useAppDispatch();
  const {
    patientMedications,
    encounterMedications,
    activeMedications,
    selectedMedication,
    loading,
    error,
    elgaMedications,
    syncResult,
    interactions,
    interactionCheckLoading,
    dosageValidation,
    dosageValidationLoading
  } = useAppSelector(state => state.medications);

  const [openDialog, setOpenDialog] = useState(false);
  const [openConflictDialog, setOpenConflictDialog] = useState(false);
  const [openPrescriptionDialog, setOpenPrescriptionDialog] = useState(false);
  const [openQRDialog, setOpenQRDialog] = useState(false);
  const [openInteractionsDialog, setOpenInteractionsDialog] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<any>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<PatientMedication | null>(null);
  const [editingMedication, setEditingMedication] = useState<PatientMedication | null>(null);
  const [elgaStatus, setElgaStatus] = useState<{ available: boolean; elgaId?: string } | null>(null);
  const [formData, setFormData] = useState<CreateMedicationData>({
    patientId: patientId || '',
    encounterId: encounterId,
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    startDate: new Date().toISOString().split('T')[0],
    source: 'clinical'
  });

  // Check ELGA status
  useEffect(() => {
    const checkELGAStatus = async () => {
      if (!patientId) return;
      try {
        const token = localStorage.getItem('token');
        const API_BASE_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5001/api`;
        const response = await fetch(`${API_BASE_URL}/elga/patient/${patientId}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setElgaStatus({
            available: data.data?.elgaId ? true : false,
            elgaId: data.data?.elgaId
          });
        }
      } catch (error) {
        console.error('ELGA status check failed:', error);
        setElgaStatus({ available: false });
      }
    };
    checkELGAStatus();
  }, [patientId]);

  // Load medications
  useEffect(() => {
    if (patientId) {
      if (showActiveOnly) {
        dispatch(fetchActiveMedications(patientId));
      } else {
        dispatch(fetchPatientMedications({ patientId }));
      }
    }
    if (encounterId) {
      dispatch(fetchEncounterMedications(encounterId));
    }
  }, [dispatch, patientId, encounterId, showActiveOnly]);
  
  // Get current medications list
  const currentMedications = encounterId 
    ? encounterMedications 
    : (showActiveOnly ? activeMedications : patientMedications);
  
  // Prüfe Wechselwirkungen automatisch, wenn sich die Medikamentenliste ändert
  useEffect(() => {
    if (patientId && currentMedications.length >= 2) {
      dispatch(checkMedicationInteractions(patientId));
    }
  }, [currentMedications.length, patientId, dispatch]);

  // Notify parent of changes
  useEffect(() => {
    const medications = encounterId ? encounterMedications : (showActiveOnly ? activeMedications : patientMedications);
    onMedicationChange?.(medications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientMedications, encounterMedications, activeMedications, encounterId, showActiveOnly]);

  // Handle medication save from dialog
  const handleMedicationSave = async () => {
    // Reload medications after save
    if (patientId) {
      if (showActiveOnly) {
        dispatch(fetchActiveMedications(patientId));
      } else {
        dispatch(fetchPatientMedications({ patientId }));
      }
    }
    if (encounterId) {
      dispatch(fetchEncounterMedications(encounterId));
    }
    // Automatische ELGA-Synchronisation
    await autoSyncWithELGA();
  };

  // Handle edit
  const handleEdit = (medication: PatientMedication) => {
    setEditingMedication(medication);
    setOpenDialog(true);
  };

  // Automatische ELGA-Synchronisation
  const autoSyncWithELGA = async () => {
    if (elgaStatus?.available && patientId) {
      try {
        await dispatch(syncMedicationsWithELGA({ patientId, strategy: 'merge' })).unwrap();
        // Prüfe Konflikte nach Sync
        if (syncResult && syncResult.conflicts.length > 0) {
          setSelectedConflict(syncResult.conflicts[0]);
          setOpenConflictDialog(true);
        }
      } catch (error) {
        console.error('Automatische ELGA-Synchronisation fehlgeschlagen:', error);
        // Nicht blockieren - Operation wurde bereits durchgeführt
      }
    }
  };

  // Handle delete
  const handleDelete = async (medication: PatientMedication) => {
    if (window.confirm(`Medikament "${medication.name}" wirklich löschen?`)) {
      await dispatch(deleteMedication(medication._id));
      await autoSyncWithELGA();
    }
  };

  // Handle discontinue
  const handleDiscontinue = async (medication: PatientMedication) => {
    const reason = window.prompt('Grund für das Absetzen:');
    if (reason !== null) {
      await dispatch(discontinueMedication({ id: medication._id, reason }));
      await autoSyncWithELGA();
    }
  };

  // Handle reactivate
  const handleReactivate = async (medication: PatientMedication) => {
    const reason = window.prompt('Grund für die Reaktivierung:');
    if (reason !== null) {
      await dispatch(reactivateMedication({ id: medication._id, reason }));
      await autoSyncWithELGA();
    }
  };


  // Open dialog for new medication
  const handleAddNew = () => {
    setEditingMedication(null);
    setOpenDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMedication(null);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'default';
      case 'discontinued': return 'error';
      case 'suspended': return 'warning';
      default: return 'default';
    }
  };

  // Get status German
  const getStatusGerman = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'completed': return 'Abgeschlossen';
      case 'discontinued': return 'Abgesetzt';
      case 'suspended': return 'Ausgesetzt';
      default: return status;
    }
  };

  // ELGA Sync Handler
  const handleELGASync = async (strategy: 'merge' | 'elga_only' | 'local_only' = 'merge') => {
    if (!patientId) return;
    try {
      await dispatch(syncMedicationsWithELGA({ patientId, strategy })).unwrap();
      // Reload medications after sync
      if (showActiveOnly) {
        dispatch(fetchActiveMedications(patientId));
      } else {
        dispatch(fetchPatientMedications({ patientId }));
      }
      // Show conflicts if any
      if (syncResult && syncResult.conflicts.length > 0) {
        setSelectedConflict(syncResult.conflicts[0]);
        setOpenConflictDialog(true);
      }
    } catch (error: any) {
      alert(`ELGA-Synchronisation fehlgeschlagen: ${error}`);
    }
  };

  // Resolve conflict
  const handleResolveConflict = async (resolution: 'local' | 'elga' | 'merge') => {
    if (!patientId || !selectedConflict) return;
    try {
      await dispatch(resolveMedicationConflict({
        patientId,
        medicationId: selectedConflict.local._id,
        resolution,
        elgaData: selectedConflict.elga
      })).unwrap();
      
      // Remove resolved conflict
      const remainingConflicts = syncResult?.conflicts.filter(
        c => c.local._id !== selectedConflict.local._id
      ) || [];
      
      if (remainingConflicts.length > 0) {
        setSelectedConflict(remainingConflicts[0]);
      } else {
        setOpenConflictDialog(false);
        setSelectedConflict(null);
        dispatch(clearSyncResult());
      }
      
      // Reload medications
      if (showActiveOnly) {
        dispatch(fetchActiveMedications(patientId));
      } else {
        dispatch(fetchPatientMedications({ patientId }));
      }
    } catch (error: any) {
      alert(`Fehler beim Lösen des Konflikts: ${error}`);
    }
  };

  // e-Rezept Handler
  const handleCreatePrescription = async (medication: PatientMedication) => {
    if (!patientId) return;
    try {
      const result = await dispatch(createPrescription({ medicationId: medication._id, patientId })).unwrap();
      // Verwende das aktualisierte Medikament aus der API-Antwort
      const updatedMedication = result.data?.medication || medication;
      setSelectedPrescription(updatedMedication);
      setOpenPrescriptionDialog(true);
      // Kein Reload nötig - createPrescription.fulfilled aktualisiert bereits den State
      // Nur wenn showActiveOnly, dann activeMedications neu laden
      if (showActiveOnly) {
        dispatch(fetchActiveMedications(patientId));
      }
    } catch (error: any) {
      console.error('Fehler bei der e-Rezept-Erstellung:', error);
      alert(`Fehler bei der e-Rezept-Erstellung: ${error}`);
    }
  };

  const handleSendPrescription = async (prescriptionId: string) => {
    try {
      await dispatch(sendPrescription(prescriptionId)).unwrap();
      alert('e-Rezept erfolgreich gesendet');
      // Kein Reload nötig - sendPrescription.fulfilled aktualisiert bereits den State
      // Nur wenn showActiveOnly, dann activeMedications neu laden
      if (showActiveOnly && patientId) {
        dispatch(fetchActiveMedications(patientId));
      }
    } catch (error: any) {
      alert(`Fehler beim Senden: ${error}`);
    }
  };

  const handleShowQRCode = async (medication: PatientMedication) => {
    let medicationWithQR = { ...medication };
    
    if (!medication.prescriptionQRCode && medication.prescriptionId) {
      // QR-Code abrufen
      try {
        const token = localStorage.getItem('token');
        const API_BASE_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5001/api`;
        const response = await fetch(`${API_BASE_URL}/prescriptions/${medication.prescriptionId}/qrcode`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && data.data.qrCode) {
          medicationWithQR = {
            ...medication,
            prescriptionQRCode: data.data.qrCode
          };
        }
      } catch (error) {
        console.error('Error fetching QR code:', error);
      }
    }
    setSelectedPrescription(medicationWithQR);
    setOpenQRDialog(true);
  };

  const handleCheckStatus = async (prescriptionId: string) => {
    try {
      await dispatch(checkPrescriptionStatus(prescriptionId)).unwrap();
      // Kein Reload nötig - checkPrescriptionStatus.fulfilled aktualisiert bereits den State
      // Nur wenn showActiveOnly, dann activeMedications neu laden
      if (showActiveOnly && patientId) {
        dispatch(fetchActiveMedications(patientId));
      }
    } catch (error: any) {
      alert(`Fehler bei der Statusprüfung: ${error}`);
    }
  };

  const handleCancelPrescription = async (prescriptionId: string) => {
    if (!window.confirm('Rezept wirklich stornieren?')) return;
    try {
      await dispatch(cancelPrescription({ prescriptionId })).unwrap();
      alert('Rezept erfolgreich storniert');
      if (patientId) {
        if (showActiveOnly) {
          dispatch(fetchActiveMedications(patientId));
        } else {
          dispatch(fetchPatientMedications({ patientId }));
        }
      }
    } catch (error: any) {
      alert(`Fehler bei der Stornierung: ${error}`);
    }
  };

  // Wechselwirkungsprüfung
  const handleCheckInteractions = async () => {
    if (!patientId) return;
    try {
      await dispatch(checkMedicationInteractions(patientId)).unwrap();
      setOpenInteractionsDialog(true);
    } catch (error: any) {
      alert(`Fehler bei der Wechselwirkungsprüfung: ${error}`);
    }
  };

  const getInteractionSeverityColor = (severity: string) => {
    switch (severity) {
      case 'major': return 'error';
      case 'moderate': return 'warning';
      case 'minor': return 'info';
      default: return 'default';
    }
  };

  const getInteractionSeverityGerman = (severity: string) => {
    switch (severity) {
      case 'major': return 'Schwerwiegend';
      case 'moderate': return 'Mäßig';
      case 'minor': return 'Gering';
      default: return 'Unbekannt';
    }
  };

  // Prüft, ob ein Medikament Wechselwirkungen hat
  const hasInteractions = (medicationId: string) => {
    return interactions.some(
      (interaction: MedicationInteraction) =>
        interaction.medication1Id === medicationId || interaction.medication2Id === medicationId
    );
  };

  // Gibt die Wechselwirkungen für ein Medikament zurück
  const getMedicationInteractions = (medicationId: string) => {
    return interactions.filter(
      (interaction: MedicationInteraction) =>
        interaction.medication1Id === medicationId || interaction.medication2Id === medicationId
    );
  };

  const getPrescriptionStatusColor = (status?: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'sent': return 'info';
      case 'dispensed': return 'success';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  const getPrescriptionStatusGerman = (status?: string) => {
    switch (status) {
      case 'draft': return 'Entwurf';
      case 'sent': return 'Gesendet';
      case 'dispensed': return 'Eingelöst';
      case 'expired': return 'Abgelaufen';
      default: return 'Unbekannt';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Medikamente
          {currentMedications.length > 0 && (
            <Badge badgeContent={currentMedications.length} color="primary" sx={{ ml: 1 }} />
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {patientId && (
            <Tooltip title="Wechselwirkungen prüfen">
              <Button
                variant="outlined"
                startIcon={<WarningIcon />}
                onClick={handleCheckInteractions}
                size="small"
                disabled={interactionCheckLoading || currentMedications.length < 2}
                color={interactions.length > 0 ? 'warning' : undefined}
              >
                Wechselwirkungen
                {interactions.length > 0 && (
                  <Badge badgeContent={interactions.length} color="error" sx={{ ml: 1 }} />
                )}
              </Button>
            </Tooltip>
          )}
          {elgaStatus?.available && allowEdit && (
            <Tooltip title="Mit ELGA synchronisieren">
              <Button
                variant="outlined"
                startIcon={<SyncIcon />}
                onClick={() => handleELGASync('merge')}
                size="small"
                disabled={loading}
              >
                ELGA Sync
              </Button>
            </Tooltip>
          )}
          {syncResult && syncResult.conflicts.length > 0 && (
            <Tooltip title={`${syncResult.conflicts.length} Konflikte gefunden`}>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<WarningIcon />}
                onClick={() => {
                  setSelectedConflict(syncResult.conflicts[0]);
                  setOpenConflictDialog(true);
                }}
                size="small"
              >
                Konflikte ({syncResult.conflicts.length})
              </Button>
            </Tooltip>
          )}
          {allowEdit && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddNew}
              size="small"
              sx={{
                bgcolor: '#4CAF50',
                '&:hover': {
                  bgcolor: '#45a049'
                }
              }}
            >
              Medikament hinzufügen
            </Button>
          )}
        </Box>
      </Box>

      {/* ELGA Sync Result */}
      {syncResult && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Synchronisation abgeschlossen: {syncResult.created.length} erstellt, {syncResult.updated.length} aktualisiert
          {syncResult.conflicts.length > 0 && `, ${syncResult.conflicts.length} Konflikte`}
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      {/* Wechselwirkungen Alert */}
      {interactions.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <strong>{interactions.length} Wechselwirkung{interactions.length > 1 ? 'en' : ''} gefunden</strong>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Klicken Sie auf "Wechselwirkungen" für Details
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setOpenInteractionsDialog(true)}
            >
              Details anzeigen
            </Button>
          </Box>
        </Alert>
      )}

      {/* Medications List */}
      {currentMedications.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <MedicationIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Keine Medikamente vorhanden
            </Typography>
            {allowEdit && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddNew}
                sx={{ mt: 2 }}
              >
                Erstes Medikament hinzufügen
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <List>
          {[...currentMedications]
            .filter((medication, index, self) => 
              // Entferne Duplikate basierend auf _id und prescriptionId
              index === self.findIndex((m) => 
                m._id === medication._id && 
                (m.prescriptionId || 'none') === (medication.prescriptionId || 'none')
              )
            )
            .sort((a, b) => {
              // Active first, then by start date
              if (a.status === 'active' && b.status !== 'active') return -1;
              if (a.status !== 'active' && b.status === 'active') return 1;
              return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
            })
            .map((medication, index) => (
              <React.Fragment key={`med-${medication._id}-${medication.prescriptionId || 'no-prescription'}-${index}`}>
                <ListItem
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: medication.status === 'active' ? 'success.50' : 'background.paper'
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {medication.name}
                        </Typography>
                        {hasInteractions(medication._id) && (
                          <Tooltip
                            title={
                              <Box>
                                <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', mb: 0.5 }}>
                                  Wechselwirkungen gefunden:
                                </Typography>
                                {getMedicationInteractions(medication._id).map((interaction: MedicationInteraction, idx: number) => (
                                  <Typography key={idx} variant="caption" sx={{ display: 'block' }}>
                                    • {interaction.medication1Id === medication._id ? interaction.medication2.name : interaction.medication1.name}
                                    {' '}({getInteractionSeverityGerman(interaction.severity)})
                                  </Typography>
                                ))}
                              </Box>
                            }
                          >
                            <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                          </Tooltip>
                        )}
                        {medication.strength && (
                          <Typography variant="body2" color="text.secondary">
                            {medication.strength} {medication.strengthUnit || ''}
                          </Typography>
                        )}
                        {medication.form && (
                          <Chip label={medication.form} size="small" variant="outlined" />
                        )}
                        <Chip
                          label={getStatusGerman(medication.status)}
                          size="small"
                          color={getStatusColor(medication.status)}
                          variant="outlined"
                        />
                        {medication.atcCode && (
                          <Tooltip title="ATC-Code">
                            <Chip label={medication.atcCode} size="small" variant="outlined" />
                          </Tooltip>
                        )}
                        {medication.source === 'dekurs' && (
                          <Chip 
                            label="Dekurs" 
                            size="small" 
                            color="info" 
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                        {medication.source === 'anamnestic' && (
                          <Chip 
                            label="Anamnestisch" 
                            size="small" 
                            color="secondary" 
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" component="div">
                          <strong>Dosierung:</strong> {medication.dosage} | <strong>Häufigkeit:</strong> {medication.frequency}
                        </Typography>
                        {medication.duration && (
                          <Typography variant="caption" color="text.secondary" component="div">
                            Dauer: {medication.duration}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" component="div">
                          Seit: {new Date(medication.startDate).toLocaleDateString('de-DE')}
                          {medication.endDate && ` bis ${new Date(medication.endDate).toLocaleDateString('de-DE')}`}
                        </Typography>
                        {medication.instructions && (
                          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                            <strong>Hinweise:</strong> {medication.instructions}
                          </Typography>
                        )}
                        {medication.notes && (
                          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                            {medication.notes}
                          </Typography>
                        )}
                        {medication.discontinuedReason && (
                          <Typography variant="caption" color="error" component="div" sx={{ mt: 0.5 }}>
                            <strong>Abgesetzt:</strong> {medication.discontinuedReason}
                          </Typography>
                        )}
                      </Box>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                  {allowEdit && (
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {medication.status === 'active' ? (
                          <Tooltip title="Medikament absetzen">
                            <IconButton
                              size="small"
                              onClick={() => handleDiscontinue(medication)}
                              color="warning"
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Medikament reaktivieren">
                            <IconButton
                              size="small"
                              onClick={() => handleReactivate(medication)}
                              color="success"
                            >
                              <RefreshIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!medication.prescriptionId && medication.status === 'active' && (
                          <Tooltip title="e-Rezept erstellen">
                            <IconButton
                              size="small"
                              onClick={() => handleCreatePrescription(medication)}
                              color="primary"
                            >
                              <ReceiptIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {medication.prescriptionId && (
                          <>
                            {medication.prescriptionStatus === 'draft' && (
                              <Tooltip title="e-Rezept senden">
                                <IconButton
                                  size="small"
                                  onClick={() => handleSendPrescription(medication.prescriptionId!)}
                                  color="info"
                                >
                                  <SendIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="QR-Code anzeigen">
                              <IconButton
                                size="small"
                                onClick={() => handleShowQRCode(medication)}
                                color="primary"
                              >
                                <QrCodeIcon />
                              </IconButton>
                            </Tooltip>
                            {medication.prescriptionStatus !== 'dispensed' && medication.prescriptionStatus !== 'expired' && (
                              <>
                                <Tooltip title="Status prüfen">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCheckStatus(medication.prescriptionId!)}
                                  >
                                    <CheckCircleOutlineIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Rezept stornieren">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCancelPrescription(medication.prescriptionId!)}
                                    color="warning"
                                  >
                                    <CancelOutlinedIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(medication)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(medication)}
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

      {/* Medication Dialog */}
      <MedicationDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onSave={handleMedicationSave}
        patientId={patientId || ''}
        encounterId={encounterId}
        initialMedication={editingMedication}
        source="clinical"
        mode="manager"
      />

      {/* Conflict Resolution Dialog */}
      <Dialog
        open={openConflictDialog}
        onClose={() => setOpenConflictDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            Medikamenten-Konflikt lösen
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedConflict && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Es gibt Unterschiede zwischen dem lokalen Medikament und der ELGA-Version.
              </Alert>
              
              <Typography variant="subtitle2" gutterBottom>
                Lokales Medikament:
              </Typography>
              <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
                <Typography><strong>Name:</strong> {selectedConflict.local.name}</Typography>
                <Typography><strong>Dosierung:</strong> {selectedConflict.local.dosage}</Typography>
                <Typography><strong>Häufigkeit:</strong> {selectedConflict.local.frequency}</Typography>
                <Typography><strong>Status:</strong> {getStatusGerman(selectedConflict.local.status)}</Typography>
              </Card>

              <Typography variant="subtitle2" gutterBottom>
                ELGA-Version:
              </Typography>
              <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
                <Typography><strong>Name:</strong> {selectedConflict.elga.name}</Typography>
                <Typography><strong>Dosierung:</strong> {selectedConflict.elga.dosage}</Typography>
                <Typography><strong>Häufigkeit:</strong> {selectedConflict.elga.frequency}</Typography>
                <Typography><strong>Status:</strong> {selectedConflict.elga.status}</Typography>
              </Card>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Unterschiede: {Object.entries(selectedConflict.differences)
                  .filter(([, diff]) => diff)
                  .map(([key]) => key)
                  .join(', ')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConflictDialog(false)}>
            Später lösen
          </Button>
          <Button
            onClick={() => handleResolveConflict('local')}
            variant="outlined"
            color="primary"
          >
            Lokale Version behalten
          </Button>
          <Button
            onClick={() => handleResolveConflict('elga')}
            variant="outlined"
            color="secondary"
          >
            ELGA-Version verwenden
          </Button>
          <Button
            onClick={() => handleResolveConflict('merge')}
            variant="contained"
            color="primary"
          >
            Zusammenführen
          </Button>
        </DialogActions>
      </Dialog>

      {/* e-Rezept Success Dialog */}
      <Dialog
        open={openPrescriptionDialog}
        onClose={() => setOpenPrescriptionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon color="success" />
            e-Rezept erfolgreich erstellt
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPrescription && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Das e-Rezept wurde erfolgreich erstellt und kann jetzt an PharmNet gesendet werden.
              </Alert>
              <Typography variant="body2" gutterBottom>
                <strong>Rezept-ID:</strong> {selectedPrescription.prescriptionId}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Medikament:</strong> {selectedPrescription.name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Status:</strong> {getPrescriptionStatusGerman(selectedPrescription.prescriptionStatus)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenPrescriptionDialog(false);
            if (selectedPrescription?.prescriptionId) {
              handleShowQRCode(selectedPrescription);
            }
          }}>
            QR-Code anzeigen
          </Button>
          <Button
            onClick={() => {
              if (selectedPrescription?.prescriptionId) {
                handleSendPrescription(selectedPrescription.prescriptionId);
                setOpenPrescriptionDialog(false);
              }
            }}
            variant="contained"
            color="primary"
          >
            An PharmNet senden
          </Button>
          <Button onClick={() => setOpenPrescriptionDialog(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR-Code Dialog */}
      <Dialog
        open={openQRDialog}
        onClose={() => setOpenQRDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeIcon />
            e-Rezept QR-Code
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPrescription && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              {selectedPrescription.prescriptionQRCode ? (
                <>
                  <img
                    src={selectedPrescription.prescriptionQRCode}
                    alt="QR-Code"
                    style={{ maxWidth: '100%', height: 'auto', marginBottom: 16 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Rezept-ID: {selectedPrescription.prescriptionId}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status: {getPrescriptionStatusGerman(selectedPrescription.prescriptionStatus)}
                  </Typography>
                </>
              ) : (
                <Typography>QR-Code wird geladen...</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQRDialog(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Wechselwirkungen Dialog */}
      <Dialog
        open={openInteractionsDialog}
        onClose={() => setOpenInteractionsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            Medikamenten-Wechselwirkungen
          </Box>
        </DialogTitle>
        <DialogContent>
          {interactions.length === 0 ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              Keine Wechselwirkungen gefunden. Alle Medikamente sind kompatibel.
            </Alert>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                {interactions.length} Wechselwirkung{interactions.length > 1 ? 'en' : ''} gefunden
              </Alert>
              <List>
                {interactions.map((interaction: MedicationInteraction, index: number) => (
                  <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2, border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, width: '100%' }}>
                      <Chip
                        label={getInteractionSeverityGerman(interaction.severity)}
                        color={getInteractionSeverityColor(interaction.severity) as any}
                        size="small"
                      />
                      <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                        {interaction.medication1.name} ↔ {interaction.medication2.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {interaction.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Chip
                        label={`ATC: ${interaction.medication1.atcCode}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`ATC: ${interaction.medication2.atcCode}`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInteractionsDialog(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MedicationManager;

