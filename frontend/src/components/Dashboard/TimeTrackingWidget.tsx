import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Login as LoginIcon,
  Logout as LogoutIcon,
  FreeBreakfast as PauseIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchTimeStatus,
  startTimeTracking,
  stopTimeTracking,
  clearTimeTrackingError,
} from '../../store/slices/timeTrackingSlice';
import type { DashboardWidget } from '../../store/slices/dashboardWidgetsSlice';

interface TimeTrackingWidgetProps {
  widget: DashboardWidget;
  noWrapper?: boolean;
}

const formatTime = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const TimeTrackingWidget: React.FC<TimeTrackingWidgetProps> = ({ widget, noWrapper = false }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { activeEntry, loading, error } = useAppSelector((state) => state.timeTracking);

  useEffect(() => {
    dispatch(fetchTimeStatus());
  }, [dispatch]);

  const handleKommen = () => {
    dispatch(clearTimeTrackingError());
    dispatch(startTimeTracking({ type: 'work' }));
  };

  const handleGehen = () => {
    dispatch(clearTimeTrackingError());
    dispatch(stopTimeTracking());
  };

  const handlePauseStart = () => {
    dispatch(clearTimeTrackingError());
    dispatch(startTimeTracking({ type: 'break' }));
  };

  const handlePauseEnde = () => {
    dispatch(clearTimeTrackingError());
    dispatch(stopTimeTracking());
  };

  const handleOpenTimesheet = () => {
    navigate('/timesheet');
  };

  const statusText = activeEntry
    ? activeEntry.type === 'work'
      ? `Arbeit seit ${formatTime(activeEntry.start)}`
      : `Pause seit ${formatTime(activeEntry.start)}`
    : 'Nicht gestempelt';

  const statusColor = activeEntry
    ? activeEntry.type === 'work'
      ? 'primary.main'
      : 'warning.main'
    : 'text.secondary';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: noWrapper ? '100%' : undefined,
        minHeight: 0,
        p: noWrapper ? 0 : 2,
        flex: noWrapper ? 1 : undefined,
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearTimeTrackingError())}>
          {error}
        </Alert>
      )}

      <Typography variant="body1" sx={{ fontWeight: 600, color: statusColor, mb: 2 }}>
        {statusText}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, py: 3 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Stack spacing={1.5} sx={{ flex: 1, justifyContent: 'center' }}>
          {!activeEntry && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<LoginIcon />}
              onClick={handleKommen}
              fullWidth
              size={isMobile ? 'medium' : 'large'}
              sx={{ py: 1.5 }}
              aria-label="Kommen – Arbeitsbeginn erfassen"
            >
              Kommen
            </Button>
          )}

          {activeEntry?.type === 'work' && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<PauseIcon />}
              onClick={handlePauseStart}
              fullWidth
              size={isMobile ? 'medium' : 'large'}
              sx={{ py: 1.5 }}
              aria-label="Pause starten"
            >
              Pause
            </Button>
          )}

          {activeEntry?.type === 'break' && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<PauseIcon />}
              onClick={handlePauseEnde}
              fullWidth
              size={isMobile ? 'medium' : 'large'}
              sx={{ py: 1.5 }}
              aria-label="Pause beenden"
            >
              Pause Ende
            </Button>
          )}

          {activeEntry && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<LogoutIcon />}
              onClick={handleGehen}
              fullWidth
              size={isMobile ? 'medium' : 'large'}
              sx={{ py: 1.5 }}
              aria-label="Gehen – Arbeitsende erfassen"
            >
              Gehen
            </Button>
          )}

          <Button
            variant="text"
            color="inherit"
            startIcon={<ScheduleIcon />}
            onClick={handleOpenTimesheet}
            fullWidth
            size="small"
            sx={{ mt: 1 }}
            aria-label="Arbeitszeiten öffnen"
          >
            Arbeitszeiten öffnen
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default TimeTrackingWidget;
