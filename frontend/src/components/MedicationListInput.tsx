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
): string | { name: string; dosage: string; frequency: string; startDate?: string; prescribedBy?: string } => {
  if (typeof medication === 'string') {
    return medication;
  }
  
  // Wenn es ein Katalog-Eintrag ist (_id vorhanden), nur Name zurückgeben
  if (medication._id) {
    return {
      name: medication.name || '',
      dosage: medication.strength && medication.strengthUnit 
        ? `${medication.strength} ${medication.strengthUnit}` 
        : 'Nicht angegeben',
      frequency: 'Nicht angegeben',
      startDate: medication.startDate,
      prescribedBy: medication.prescribedBy
    };
  }
  
  // Sonst alle Felder verwenden
  return {
    name: medication.name || '',
    dosage: medication.dosage || 'Nicht angegeben',
    frequency: medication.frequency || 'Nicht angegeben',
    startDate: medication.startDate,
    prescribedBy: medication.prescribedBy
  };
};

// Hilfsfunktion: Konvertiert ein Array von Medications in das Patient-Format
export const convertMedicationsArrayToPatientFormat = (
  medications: (Medication | string)[]
): Array<{ name: string; dosage: string; frequency: string; startDate?: string; prescribedBy?: string }> | string[] => {
  const converted = medications.map(convertMedicationToPatientFormat);
  // Prüfe, ob alle Einträge Strings sind
  const allStrings = converted.every(item => typeof item === 'string');
  if (allStrings) {
    return converted as string[];
  }
  // Ansonsten sind alle Objekte
  return converted as Array<{ name: string; dosage: string; frequency: string; startDate?: string; prescribedBy?: string }>;
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
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [startDate, setStartDate] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');

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
      // Initialisiere Dosierung und Häufigkeit
      const initialDosage = medication.strength && medication.strengthUnit 
        ? `${medication.strength} ${medication.strengthUnit}` 
        : '';
      setDosage(initialDosage);
      setFrequency('');
      setStartDate('');
      setPrescribedBy('');
      setEditingIndex(value.length); // Neuer Eintrag am Ende
      
      // Medikament erst hinzufügen und Dialog öffnen
      const newMedication: Medication = {
        ...medication,
        dosage: initialDosage || 'Nicht angegeben',
        frequency: 'Nicht angegeben'
      };
      onChange([...value, newMedication]);
      setEditDialogOpen(true);
      setSelectedMedication(null);
    }
  };

  const handleEditMedication = (index: number) => {
    const medication = value[index];
    if (typeof medication === 'string') {
      // Für String-Medikamente nur Name anzeigen
      setDosage('');
      setFrequency('');
    } else {
      setDosage(medication.dosage || (medication.strength && medication.strengthUnit ? `${medication.strength} ${medication.strengthUnit}` : ''));
      setFrequency(medication.frequency || '');
      setStartDate(medication.startDate || '');
      setPrescribedBy(medication.prescribedBy || '');
    }
    setEditingIndex(index);
    setEditDialogOpen(true);
  };

  const handleSaveMedication = () => {
    if (editingIndex === null || editingIndex >= value.length) return;

    const medication = value[editingIndex];

    const updatedMedication: Medication = typeof medication === 'string' 
      ? {
          name: medication,
          dosage: dosage || 'Nicht angegeben',
          frequency: frequency || 'Nicht angegeben',
          startDate: startDate || undefined,
          prescribedBy: prescribedBy || undefined
        }
      : {
          ...medication,
          dosage: dosage.trim() || (medication.dosage || 'Nicht angegeben'),
          frequency: frequency.trim() || (medication.frequency || 'Nicht angegeben'),
          startDate: startDate.trim() || medication.startDate,
          prescribedBy: prescribedBy.trim() || medication.prescribedBy
        };

    const newMedications = [...value];
    newMedications[editingIndex] = updatedMedication;
    onChange(newMedications);
    handleCloseDialog();
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setEditingIndex(null);
    setDosage('');
    setFrequency('');
    setStartDate('');
    setPrescribedBy('');
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

      {/* Dialog für Dosierung und Häufigkeit */}
      <Dialog open={editDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Medikamentendetails
          {editingIndex !== null && editingIndex < value.length && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, fontWeight: 'normal' }}>
              {getMedicationName(value[editingIndex])}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Dosierung"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="z.B. 50 mg, 1 Tablette"
                helperText="Geben Sie die Dosierung ein (z.B. 50 mg, 1 Tablette, 2x täglich)"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Häufigkeit"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="z.B. 2x täglich, morgens und abends"
                helperText="Geben Sie die Einnahmehäufigkeit ein"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Startdatum (optional)"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Verschrieben von (optional)"
                value={prescribedBy}
                onChange={(e) => setPrescribedBy(e.target.value)}
                placeholder="z.B. Dr. Mustermann"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSaveMedication} variant="contained" color="primary">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MedicationListInput;
