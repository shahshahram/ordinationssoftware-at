import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import MedicationAutocomplete from './MedicationAutocomplete';
import MedicationDialog from './MedicationDialog';
import { Medication } from '../types/Medication';

interface MedicationListInputProps {
  value?: (Medication | string)[];
  onChange: (medications: (Medication | string)[]) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

// Hilfsfunktion: Konvertiert Medication in das erwartete Format
export const convertMedicationToPatientFormat = (
  medication: Medication | string
): string | { name: string; dosage: string; frequency: string; startDate?: string; prescribedBy?: string; instructions?: string; notes?: string; indication?: string; duration?: string } => {
  if (typeof medication === 'string') {
    return medication;
  }
  
  const medAny = medication as any;
  
  // Wenn es ein Katalog-Eintrag ist (_id vorhanden), nur Name zurückgeben
  if (medication._id) {
    return {
      name: medication.name || '',
      dosage: medication.strength && medication.strengthUnit 
        ? `${medication.strength} ${medication.strengthUnit}` 
        : 'Nicht angegeben',
      frequency: 'Nicht angegeben',
      startDate: medication.startDate,
      prescribedBy: medication.prescribedBy,
      instructions: medAny.instructions || '',
      notes: medAny.notes || '',
      indication: medAny.indication || '',
      duration: medAny.duration || ''
    };
  }
  
  // Sonst alle Felder verwenden
  return {
    name: medication.name || '',
    dosage: medication.dosage || 'Nicht angegeben',
    frequency: medication.frequency || 'Nicht angegeben',
    startDate: medication.startDate,
    prescribedBy: medication.prescribedBy,
    instructions: medAny.instructions || '',
    notes: medAny.notes || '',
    indication: medAny.indication || '',
    duration: medAny.duration || ''
  };
};

// Hilfsfunktion: Konvertiert ein Array von Medications in das Patient-Format
export const convertMedicationsArrayToPatientFormat = (
  medications: (Medication | string)[]
): Array<{ name: string; dosage: string; frequency: string; startDate?: string; prescribedBy?: string; instructions?: string; notes?: string; indication?: string; duration?: string }> | string[] => {
  const converted = medications.map(convertMedicationToPatientFormat);
  // Prüfe, ob alle Einträge Strings sind
  const allStrings = converted.every(item => typeof item === 'string');
  if (allStrings) {
    return converted as string[];
  }
  // Ansonsten sind alle Objekte
  return converted as Array<{ name: string; dosage: string; frequency: string; startDate?: string; prescribedBy?: string; instructions?: string; notes?: string; indication?: string; duration?: string }>;
};

const MedicationListInput: React.FC<MedicationListInputProps> = ({
  value = [],
  onChange,
  label = 'Medikamente',
  helperText,
  disabled
}) => {
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingMedicationForDialog, setEditingMedicationForDialog] = useState<any>(null);

  const handleAddMedication = (medication: Medication | null) => {
    if (!medication) return;

    // Prüfen ob bereits vorhanden
    const isDuplicate = value.some(med => {
      if (typeof med === 'string') {
        return med.toLowerCase().trim() === medication.name.toLowerCase().trim();
      }
      // Duplikaterkennung: bevorzugt über _id, sonst über Name+Dosierung
      if ('_id' in med && med._id && medication._id) return med._id === medication._id;
      const left = `${med.name || ''} ${'dosage' in med ? med.dosage || '' : ''}`.toLowerCase().trim();
      const right = `${medication.name || ''} ${medication.dosage || ''}`.toLowerCase().trim();
      return left === right;
    });

    if (!isDuplicate) {
      setEditingIndex(value.length); // Neuer Eintrag am Ende
      setSelectedMedication(medication);
      setEditingMedicationForDialog(null);
      setEditDialogOpen(true);
    }
  };

  const handleEditMedication = (index: number) => {
    const medication = value[index];
    setEditingIndex(index);
    setSelectedMedication(typeof medication === 'string' ? null : medication);
    
    // Konvertiere zu PatientMedication-Format für den Dialog
    if (typeof medication === 'string') {
      const medForDialog: any = {
        _id: '',
        name: medication,
        dosage: '',
        frequency: '',
        startDate: '',
        notes: ''
      };
      setEditingMedicationForDialog(medForDialog);
    } else {
      const medForDialog: any = {
        _id: medication._id || '',
        name: medication.name || '',
        dosage: medication.dosage || (medication.strength && medication.strengthUnit ? `${medication.strength} ${medication.strengthUnit}` : ''),
        frequency: medication.frequency || '',
        startDate: medication.startDate || '',
        strength: medication.strength,
        strengthUnit: medication.strengthUnit
      };
      setEditingMedicationForDialog(medForDialog);
    }
    setEditDialogOpen(true);
  };

  const handleSaveMedication = (medicationData: any) => {
    if (editingIndex === null) return;

    // Konvertiere MedicationDialog-Format zurück zu Medication-Format
    // Erweitere Medication-Type um zusätzliche Felder
    const updatedMedication: any = {
      _id: medicationData.medicationId || selectedMedication?._id || '',
      name: medicationData.name,
      dosage: medicationData.dosage,
      frequency: medicationData.frequency,
      startDate: medicationData.startDate,
      strength: medicationData.strength,
      strengthUnit: medicationData.strengthUnit || medicationData.dosageUnit,
      form: medicationData.form,
      atcCode: medicationData.atcCode,
      // Zusätzliche Felder für Einnahmehinweise und Notizen
      instructions: medicationData.instructions || '',
      notes: medicationData.notes || '',
      indication: medicationData.indication || '',
      duration: medicationData.duration || '',
      prescribedBy: medicationData.prescribedBy || ''
    };

    if (editingIndex >= value.length) {
      // Neuer Eintrag
      onChange([...value, updatedMedication]);
    } else {
      // Bearbeiten
      const updated = [...value];
      updated[editingIndex] = updatedMedication;
      onChange(updated);
    }
    
    handleCloseDialog();
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setEditingIndex(null);
    setSelectedMedication(null);
    setEditingMedicationForDialog(null);
  };

  const handleRemoveMedication = (index: number) => {
    const newMedications = value.filter((_, i) => i !== index);
    onChange(newMedications);
  };

  const getMedicationName = (med: Medication | string): string => {
    return typeof med === 'string' ? med : med.name;
  };

  const getMedicationDetails = (med: Medication | string): string => {
    if (typeof med === 'string') return '';
    const details: string[] = [];
    if (med.dosage && med.dosage !== 'Nicht angegeben') details.push(`Dosis: ${med.dosage}`);
    if (med.frequency && med.frequency !== 'Nicht angegeben') details.push(`Häufigkeit: ${med.frequency}`);
    return details.join(' • ');
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <MedicationAutocomplete
          value={selectedMedication || undefined}
          onChange={handleAddMedication}
          label={label}
          helperText={helperText}
          disabled={disabled}
        />
      </Box>

      {value.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1 }}>
          <List dense>
            {value.map((medication, index) => (
              <ListItem
                key={index}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 0.5,
                  '&:last-child': { mb: 0 }
                }}
              >
                <ListItemText
                  primary={getMedicationName(medication)}
                  secondary={
                    <Box>
                      {typeof medication !== 'string' && medication.activeIngredient && (
                        <Typography variant="caption" display="block" color="textSecondary" component="div">
                          Wirkstoff: {medication.activeIngredient}
                          {medication.strength && medication.strengthUnit ? ` • ${medication.strength} ${medication.strengthUnit}` : ''}
                        </Typography>
                      )}
                      {getMedicationDetails(medication) && (
                        <Typography variant="caption" display="block" color="textSecondary" component="div" sx={{ mt: 0.5 }}>
                          {getMedicationDetails(medication)}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="Bearbeiten"
                    onClick={() => handleEditMedication(index)}
                    disabled={disabled}
                    size="small"
                    sx={{ mr: 0.5 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="Entfernen"
                    onClick={() => handleRemoveMedication(index)}
                    disabled={disabled}
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {value.length === 0 && (
        <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
          Keine Medikamente hinzugefügt. Verwenden Sie die Suche oben, um Medikamente hinzuzufügen.
        </Typography>
      )}

      {/* Medication Dialog */}
      <MedicationDialog
        open={editDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveMedication}
        patientId="" // Nicht benötigt für MedicationListInput
        initialMedication={editingMedicationForDialog}
        selectedCatalogMedication={selectedMedication}
        source="anamnestic"
        mode="medical"
      />
    </Box>
  );
};

export default MedicationListInput;
