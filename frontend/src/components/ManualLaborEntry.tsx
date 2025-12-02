import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box } from '@mui/material';

interface LaborResult {
  _id: string;
  resultDate: string;
  collectionDate: string;
  status: string;
  providerId: {
    name: string;
    code: string;
  };
  [key: string]: any;
}

interface ManualLaborEntryProps {
  open: boolean;
  onClose: () => void;
  patientId?: string;
  onSave: () => void;
  editingResult?: LaborResult;
}

const ManualLaborEntry: React.FC<ManualLaborEntryProps> = ({
  open,
  onClose,
  patientId,
  onSave,
  editingResult,
}) => {
  const handleSave = () => {
    onSave();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingResult ? 'Laborergebnis bearbeiten' : 'Manuelles Laborergebnis eingeben'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          {/* Placeholder für die tatsächliche Implementierung */}
          <p>Patient ID: {patientId || 'Nicht angegeben'}</p>
          {editingResult && <p>Bearbeite Ergebnis: {editingResult._id}</p>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualLaborEntry;
