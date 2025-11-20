import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import InternalMessagesDialog from '../components/InternalMessagesDialog';

const InternalMessages: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Dialog automatisch öffnen, wenn die Seite geladen wird
    setDialogOpen(true);
  }, []);

  const handleClose = () => {
    setDialogOpen(false);
    // Nach dem Schließen des Dialogs zur Dashboard-Seite navigieren
    navigate('/dashboard');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Interne Nachrichten
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Der Nachrichten-Dialog wird automatisch geöffnet.
      </Typography>
      
      <InternalMessagesDialog
        open={dialogOpen}
        onClose={handleClose}
      />
    </Box>
  );
};

export default InternalMessages;

