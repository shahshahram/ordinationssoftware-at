import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useAppDispatch } from '../store/hooks';
import {
  createMedication,
  updateMedication,
  checkNewMedicationInteraction,
  validateMedicationDosage
} from '../store/slices/medicationSlice';
import { CreateMedicationData, PatientMedication } from '../store/slices/medicationSlice';
import MedicationAutocomplete from './MedicationAutocomplete';
import { Medication } from '../types/Medication';

interface MedicationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (medication: any) => void;
  patientId: string;
  encounterId?: string;
  initialMedication?: PatientMedication | null;
  selectedCatalogMedication?: Medication | null; // Medikament aus Autocomplete
  source?: 'clinical' | 'elga' | 'import' | 'prescription' | 'dekurs' | 'anamnestic';
  mode?: 'manager' | 'dekurs' | 'brief' | 'medical';
}

const MedicationDialog: React.FC<MedicationDialogProps> = ({
  open,
  onClose,
  onSave,
  patientId,
  encounterId,
  initialMedication = null,
  selectedCatalogMedication: propSelectedCatalogMedication = null,
  source = 'clinical',
  mode = 'manager'
}) => {
  const dispatch = useAppDispatch();
  const [selectedCatalogMedication, setSelectedCatalogMedication] = useState<Medication | null>(null);
  const [formData, setFormData] = useState<CreateMedicationData>({
    patientId: patientId || '',
    encounterId: encounterId,
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    startDate: new Date().toISOString().split('T')[0],
    source: source
  });
  const [loading, setLoading] = useState(false);

  // Reset form when dialog opens/closes or initialMedication changes
  useEffect(() => {
    if (open) {
      if (initialMedication) {
        // Edit mode
        setFormData({
          patientId: initialMedication.patientId,
          encounterId: initialMedication.encounterId,
          medicationId: initialMedication.medicationId,
          name: initialMedication.name,
          atcCode: initialMedication.atcCode,
          strength: initialMedication.strength,
          strengthUnit: initialMedication.strengthUnit,
          form: initialMedication.form,
          dosage: initialMedication.dosage,
          frequency: initialMedication.frequency,
          duration: initialMedication.duration,
          startDate: initialMedication.startDate ? initialMedication.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
          endDate: initialMedication.endDate ? initialMedication.endDate.split('T')[0] : '',
          instructions: initialMedication.instructions,
          notes: initialMedication.notes,
          indication: initialMedication.indication,
          source: initialMedication.source || source
        });
        setSelectedCatalogMedication(null);
      } else if (propSelectedCatalogMedication) {
        // New medication with pre-selected catalog medication
        setSelectedCatalogMedication(propSelectedCatalogMedication);
        setFormData({
          patientId: patientId || '',
          encounterId: encounterId,
          medicationId: propSelectedCatalogMedication._id,
          name: propSelectedCatalogMedication.name,
          atcCode: propSelectedCatalogMedication.atcCode,
          strength: propSelectedCatalogMedication.strength,
          strengthUnit: propSelectedCatalogMedication.strengthUnit,
          form: propSelectedCatalogMedication.form,
          dosage: propSelectedCatalogMedication.strength && propSelectedCatalogMedication.strengthUnit 
            ? `${propSelectedCatalogMedication.strength} ${propSelectedCatalogMedication.strengthUnit}` 
            : '',
          frequency: '',
          duration: '',
          startDate: new Date().toISOString().split('T')[0],
          source: source
        });
      } else {
        // New medication
        resetForm();
      }
    }
  }, [open, initialMedication, propSelectedCatalogMedication, patientId, encounterId, source]);

  const resetForm = () => {
    setFormData({
      patientId: patientId || '',
      encounterId: encounterId,
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      startDate: new Date().toISOString().split('T')[0],
      source: source
    });
    setSelectedCatalogMedication(null);
  };

  const handleMedicationSelect = (medication: Medication | null) => {
    setSelectedCatalogMedication(medication);
    if (medication) {
      setFormData(prev => ({
        ...prev,
        medicationId: medication._id,
        name: medication.name,
        atcCode: medication.atcCode,
        strength: medication.strength,
        strengthUnit: medication.strengthUnit,
        form: medication.form
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.dosage || !formData.frequency) {
      return;
    }

    setLoading(true);
    try {
      if (mode === 'manager') {
        // Für MedicationManager: Direkt speichern mit Wechselwirkungs- und Dosierungsprüfung
        if (initialMedication) {
          // Update
          const updateData: any = {
            dosage: formData.dosage,
            frequency: formData.frequency,
            duration: formData.duration,
            startDate: formData.startDate,
            endDate: formData.endDate,
            instructions: formData.instructions,
            notes: formData.notes,
            indication: formData.indication
          };
          await dispatch(updateMedication({ id: initialMedication._id, data: updateData })).unwrap();
        } else {
          // Create with interaction and dosage checks
          if (formData.atcCode && patientId) {
            try {
              const interactionResult = await dispatch(checkNewMedicationInteraction({
                patientId,
                atcCode: formData.atcCode,
                name: formData.name
              })).unwrap();
              
              if (interactionResult.data?.hasInteractions && interactionResult.data.interactions.length > 0) {
                const confirmed = window.confirm(
                  `⚠️ Wechselwirkungen gefunden!\n\n` +
                  `${interactionResult.data.interactions.length} Wechselwirkung(en) mit bestehenden Medikamenten.\n\n` +
                  `Möchten Sie das Medikament trotzdem hinzufügen?`
                );
                if (!confirmed) {
                  setLoading(false);
                  return;
                }
              }
            } catch (error) {
              console.error('Fehler bei Wechselwirkungsprüfung:', error);
            }
          }
          
          if (patientId) {
            try {
              const dosageResult = await dispatch(validateMedicationDosage({
                patientId,
                medication: formData
              })).unwrap();
              
              if (dosageResult.data && !dosageResult.data.valid) {
                const errors = dosageResult.data.errors.map((e: any) => `❌ ${e.message}`).join('\n');
                const warnings = dosageResult.data.warnings.map((w: any) => `⚠️ ${w.message}`).join('\n');
                const message = `⚠️ Dosierungsprüfung:\n\n${errors}${warnings ? '\n\n' + warnings : ''}\n\nMöchten Sie das Medikament trotzdem hinzufügen?`;
                const confirmed = window.confirm(message);
                if (!confirmed) {
                  setLoading(false);
                  return;
                }
              } else if (dosageResult.data && dosageResult.data.warnings.length > 0) {
                const warnings = dosageResult.data.warnings.map((w: any) => `⚠️ ${w.message}`).join('\n');
                const confirmed = window.confirm(`⚠️ Dosierungswarnungen:\n\n${warnings}\n\nMöchten Sie fortfahren?`);
                if (!confirmed) {
                  setLoading(false);
                  return;
                }
              }
            } catch (error) {
              console.error('Fehler bei Dosierungsprüfung:', error);
            }
          }
          
          await dispatch(createMedication(formData)).unwrap();
        }
      } else {
        // Für andere Modi (Dekurs, Brief, Medical): Nur Daten zurückgeben
        const medicationData: any = {
          medicationId: formData.medicationId,
          name: formData.name,
          dosage: formData.dosage,
          dosageUnit: formData.strengthUnit || '',
          frequency: formData.frequency,
          duration: formData.duration,
          instructions: formData.instructions,
          notes: formData.notes,
          startDate: formData.startDate,
          endDate: formData.endDate || '',
          route: 'oral', // Default
          changeType: 'added', // Default
          atcCode: formData.atcCode,
          strength: formData.strength,
          strengthUnit: formData.strengthUnit,
          form: formData.form
        };
        
        onSave(medicationData);
      }
      
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving medication:', error);
      alert('Fehler beim Speichern des Medikaments');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {initialMedication ? 'Medikament bearbeiten' : 'Neues Medikament hinzufügen'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Medication Selection */}
          <Box>
            <MedicationAutocomplete
              value={selectedCatalogMedication}
              onChange={handleMedicationSelect}
              label="Medikament aus Katalog"
              helperText="Suchen Sie nach Medikamenten aus dem Katalog"
              required
            />
          </Box>

          {/* Manual Entry Fields */}
          <Divider>oder manuell eingeben</Divider>
          
          <TextField
            fullWidth
            label="Medikamentenname"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Stärke"
              value={formData.strength || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, strength: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Einheit"
              value={formData.strengthUnit || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, strengthUnit: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Darreichungsform"
              value={formData.form || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, form: e.target.value }))}
            />
          </Box>

          {/* Dosage and Frequency */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Dosierung"
              value={formData.dosage}
              onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
              required
              placeholder="z.B. 1 Tablette"
            />
            <TextField
              fullWidth
              label="Einnahmehäufigkeit"
              value={formData.frequency}
              onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
              required
              placeholder="z.B. 2x täglich"
            />
          </Box>

          {/* Duration */}
          <TextField
            fullWidth
            label="Dauer"
            value={formData.duration || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
            placeholder="z.B. 7 Tage, bis zum Ende"
          />

          {/* Dates */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Startdatum"
              type="date"
              value={formData.startDate || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              fullWidth
              label="Enddatum (optional)"
              type="date"
              value={formData.endDate || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* Instructions and Notes */}
          <TextField
            fullWidth
            label="Einnahmehinweise"
            multiline
            rows={2}
            value={formData.instructions || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
            placeholder="z.B. morgens nüchtern, nach dem Essen"
          />

          <TextField
            fullWidth
            label="Indikation"
            value={formData.indication || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, indication: e.target.value }))}
            placeholder="Für welche Diagnose wird das Medikament verschrieben?"
          />

          <TextField
            fullWidth
            label="Notizen"
            multiline
            rows={3}
            value={formData.notes || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Zusätzliche Informationen..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Abbrechen
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!formData.name || !formData.dosage || !formData.frequency || loading}
          sx={{
            bgcolor: '#4CAF50',
            '&:hover': {
              bgcolor: '#45a049'
            }
          }}
        >
          {initialMedication ? 'Aktualisieren' : 'Hinzufügen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MedicationDialog;

