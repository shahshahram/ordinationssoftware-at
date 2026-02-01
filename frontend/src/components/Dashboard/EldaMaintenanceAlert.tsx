import React from 'react';
import { Alert, AlertTitle } from '@mui/material';
import { isEldaMaintenance } from '../../utils/eldaMaintenance';

const EldaMaintenanceAlert: React.FC = () => {
  if (!isEldaMaintenance()) return null;

  return (
    <Alert severity="warning" sx={{ mb: 2 }} role="alert">
      <AlertTitle>Achtung: ELDA-SIT Wartung</AlertTitle>
      ELDA-SIT führt derzeit Wartungsarbeiten durch (Donnerstag/Freitag/Sonntag). Übermittlungen
      können fehlschlagen (Fehler E1/403). Bitte nur Montag bis Mittwoch testen.
    </Alert>
  );
};

export default EldaMaintenanceAlert;
