import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, ThemeProvider, createTheme } from '@mui/material';
import OnlineBooking from './OnlineBooking';
import { useWidgetThemeConfig, WidgetThemeConfig } from '../hooks/useWidgetThemeConfig';

const createWidgetTheme = (config: WidgetThemeConfig) =>
  createTheme({
    palette: {
      mode: 'light',
      primary: { main: config.primaryColor },
      secondary: { main: config.secondaryColor },
      background: {
        default: config.background,
        paper: '#ffffff',
      },
    },
    typography: {
      fontFamily: [
        config.fontFamily,
        'Roboto',
        'Helvetica',
        'Arial',
        'sans-serif',
      ].join(','),
    },
    shape: { borderRadius: config.style === 'modern' ? 12 : 8 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: config.style === 'modern' ? 10 : 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: config.style === 'modern' ? 12 : 8,
            boxShadow: config.style === 'minimal' ? 'none' : '0px 1px 3px rgba(0,0,0,0.12)',
          },
        },
      },
    },
  });

/**
 * Naked booking page for iframe embedding: no header, sidebar or app chrome.
 * Renders the same OnlineBooking wizard with optional pre-selected doctor from URL.
 * Theme is loaded from standort widget-theme (via locationId or doctorId).
 */
const BookingWidgetPage: React.FC = () => {
  const params = useParams<{ doctorId?: string; locationId?: string }>();
  const [searchParams] = useSearchParams();
  const doctorId = params.doctorId;
  const locationId = params.locationId ?? searchParams.get('locationId') ?? undefined;

  const { config, loading, error } = useWidgetThemeConfig(doctorId, locationId);
  const theme = React.useMemo(() => createWidgetTheme(config), [config]);

  if (loading) {
    return (
      <Box
        sx={{
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: config.background,
        }}
        role="main"
        aria-label="Terminbuchung wird geladen"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          width: '100%',
          minHeight: '100vh',
          bgcolor: config.background,
          overflow: 'auto',
        }}
        role="main"
        aria-label="Terminbuchung"
      >
        {error && (
          <Box sx={{ p: 2, color: 'error.main', fontSize: '0.875rem' }}>
            {error}
          </Box>
        )}
        <OnlineBooking
          initialDoctorId={doctorId || undefined}
          widgetMode={true}
          widgetThemeConfig={config}
        />
      </Box>
    </ThemeProvider>
  );
};

export default BookingWidgetPage;
