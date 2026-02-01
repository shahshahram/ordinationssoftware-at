import React from 'react';
import { useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import OnlineBooking from './OnlineBooking';

/**
 * Naked booking page for iframe embedding: no header, sidebar or app chrome.
 * Renders the same OnlineBooking wizard with optional pre-selected doctor from URL.
 */
const BookingWidgetPage: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        bgcolor: 'background.paper',
        overflow: 'auto',
      }}
      role="main"
      aria-label="Terminbuchung"
    >
      <OnlineBooking
        initialDoctorId={doctorId || undefined}
        widgetMode={true}
      />
    </Box>
  );
};

export default BookingWidgetPage;
