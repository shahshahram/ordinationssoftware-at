import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { fetchUnreadCount, fetchMessages, markAsRead, markAllAsRead, InternalMessage } from '../store/slices/internalMessagesSlice';
import { useAppSelector } from '../store/hooks';
import InternalMessagesDialog from '../components/InternalMessagesDialog';

const InternalMessages: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(true);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Dialog automatisch öffnen, wenn die Seite geladen wird
    setDialogOpen(true);
    
    // Lade unreadCount beim Öffnen
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  const handleClose = () => {
    setDialogOpen(false);
    // Aktualisiere unreadCount nach dem Schließen
    dispatch(fetchUnreadCount());
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

