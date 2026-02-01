import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  CalendarToday,
  Person,
  AccessTime,
  Cancel,
  LocationOn,
  ConfirmationNumber,
  AddToPhotos,
} from '@mui/icons-material';
import api from '../utils/api';

type PortalAppointment = {
  id: string;
  doctorName: string | null;
  startTime: string;
  endTime: string;
  title: string;
  status: string;
  bookingReference: string | null;
  address: string | null;
  locationName: string | null;
  roomName: string | null;
};

type CancellationPolicy = {
  canCancel: boolean;
  deadlineHours: number;
  allowOnlineCancellation: boolean;
  cancellationPhoneNumber: string | null;
};

type PortalResponse = {
  success: boolean;
  appointment?: PortalAppointment;
  cancellationPolicy?: CancellationPolicy;
  message?: string;
  code?: string;
};

const STATUS_LABELS: Record<string, string> = {
  geplant: 'Geplant',
  bestätigt: 'Bestätigt',
  wartend: 'Wartend',
  in_behandlung: 'In Behandlung',
  abgeschlossen: 'Abgeschlossen',
  abgesagt: 'Storniert',
  verschoben: 'Verschoben',
};

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('de-AT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTime = (iso: string): string => {
  return new Date(iso).toLocaleTimeString('de-AT', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Erzeugt .ics-Inhalt mit Zeiten in UTC (DTSTART/DTEND ...Z) */
const buildIcsContent = (appointment: PortalAppointment): string => {
  const toUtcIcs = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = toUtcIcs(appointment.startTime);
  const end = toUtcIcs(appointment.endTime);
  const summary = `Arzttermin${appointment.doctorName ? ` bei ${appointment.doctorName}` : ''}`;
  const desc = appointment.title || summary;
  const location = appointment.address || '';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Patient Portal//DE',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary.replace(/\n/g, '\\n')}`,
    `DESCRIPTION:${desc.replace(/\n/g, '\\n')}`,
    location ? `LOCATION:${location.replace(/\n/g, '\\n')}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
};

const downloadIcs = (appointment: PortalAppointment): void => {
  const ics = buildIcsContent(appointment);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `termin-${appointment.bookingReference || appointment.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const AppointmentManagementPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PortalResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  const loadAppointment = useCallback(async () => {
    if (!token?.trim()) {
      setErrorMessage('Ungültiger Link.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.get<PortalResponse>(`/portal/appointment/${encodeURIComponent(token.trim())}`);
      setData(res.data);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string }; status?: number } };
      const msg = ax.response?.data?.message || 'Termin konnte nicht geladen werden.';
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (ax.response?.status === 404 || ax.response?.status === 410 || code === 'TOKEN_EXPIRED') {
        setErrorMessage(code === 'TOKEN_EXPIRED' ? 'Dieser Link ist abgelaufen.' : 'Termin nicht gefunden oder Link ungültig.');
      } else {
        setErrorMessage(msg);
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  useEffect(() => {
    document.title = 'Termin verwalten';
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');
    return () => {
      meta?.remove();
    };
  }, []);

  const handleCancelClick = () => setCancelDialogOpen(true);
  const handleCancelDialogClose = () => {
    if (!cancelling) setCancelDialogOpen(false);
  };

  const handleConfirmCancel = async () => {
    if (!token?.trim() || cancelling) return;
    try {
      setCancelling(true);
      await api.post(`/portal/appointment/${encodeURIComponent(token.trim())}/cancel`);
      setSnackbar({ open: true, message: 'Termin wurde erfolgreich storniert.', severity: 'success' });
      setCancelDialogOpen(false);
      await loadAppointment();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setSnackbar({
        open: true,
        message: ax.response?.data?.message || 'Stornierung fehlgeschlagen.',
        severity: 'error',
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleAddToCalendar = () => {
    if (data?.appointment) downloadIcs(data.appointment);
    setSnackbar({ open: true, message: 'Kalenderdatei wurde heruntergeladen.', severity: 'success' });
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 2,
        }}
      >
        <CircularProgress aria-label="Lade Termin" />
      </Box>
    );
  }

  if (errorMessage || !data?.success || !data.appointment) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 480 }}>
          <CardContent>
            <Typography variant="h6" color="error" gutterBottom>
              Termin nicht verfügbar
            </Typography>
            <Typography color="text.secondary">
              {errorMessage || data?.message || 'Dieser Link ist ungültig oder abgelaufen.'}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const appointment = data.appointment;
  const policy = data.cancellationPolicy;
  const isCancelled = appointment.status === 'abgesagt';
  const canCancel = policy?.canCancel && !isCancelled;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4,
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 560, mx: 'auto' }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          Ihr Termin
        </Typography>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            {appointment.doctorName && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Person color="action" fontSize="small" />
                <Typography variant="subtitle1">{appointment.doctorName}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <CalendarToday color="action" fontSize="small" />
              <Typography variant="body1">{formatDateTime(appointment.startTime)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <AccessTime color="action" fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                {formatTime(appointment.startTime)} – {formatTime(appointment.endTime)}
              </Typography>
            </Box>
            {appointment.address && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                <LocationOn color="action" fontSize="small" sx={{ mt: 0.25 }} />
                <Typography variant="body2">{appointment.address}</Typography>
              </Box>
            )}
            {appointment.bookingReference && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <ConfirmationNumber color="action" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  Buchungsnummer: {appointment.bookingReference}
                </Typography>
              </Box>
            )}
            <Typography variant="body2" color="text.secondary">
              Status: {STATUS_LABELS[appointment.status] || appointment.status}
            </Typography>
          </CardContent>
        </Card>

        {!isCancelled && (
          <Button
            variant="outlined"
            startIcon={<AddToPhotos />}
            onClick={handleAddToCalendar}
            fullWidth
            sx={{ mb: 1 }}
            aria-label="Zum Kalender hinzufügen"
          >
            Zum Kalender hinzufügen
          </Button>
        )}

        {canCancel && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<Cancel />}
            onClick={handleCancelClick}
            fullWidth
            aria-label="Termin stornieren"
          >
            Termin stornieren
          </Button>
        )}

        {isCancelled && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Dieser Termin wurde storniert.
          </Alert>
        )}

        {policy && !policy.canCancel && !isCancelled && policy.cancellationPhoneNumber && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Stornierung: Bitte rufen Sie uns an: {policy.cancellationPhoneNumber}
          </Typography>
        )}
      </Box>

      <Dialog open={cancelDialogOpen} onClose={handleCancelDialogClose} aria-labelledby="storno-dialog-title">
        <DialogTitle id="storno-dialog-title">Termin stornieren?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Möchten Sie diesen Termin wirklich stornieren? Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDialogClose} disabled={cancelling}>
            Abbrechen
          </Button>
          <Button color="error" variant="contained" onClick={handleConfirmCancel} disabled={cancelling}>
            {cancelling ? 'Wird storniert…' : 'Ja, stornieren'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default AppointmentManagementPage;
