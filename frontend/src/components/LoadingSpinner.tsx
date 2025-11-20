import React from 'react';
import { Box, CircularProgress, Typography, Fade } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  fullScreen?: boolean;
  overlay?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Lädt...',
  size = 40,
  fullScreen = false,
  overlay = false
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        ...(fullScreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          bgcolor: 'rgba(255, 255, 255, 0.8)',
        }),
        ...(overlay && {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1000,
        })
      }}
    >
      <Fade in timeout={300}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={size} />
          {message && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {message}
            </Typography>
          )}
        </Box>
      </Fade>
    </Box>
  );

  return content;
};

export default LoadingSpinner;
