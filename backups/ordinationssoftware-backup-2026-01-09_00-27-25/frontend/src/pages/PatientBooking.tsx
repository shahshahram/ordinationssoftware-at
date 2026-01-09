import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Divider,
} from '@mui/material';
import {
  CalendarToday,
  Person,
  LocalHospital,
  AccessTime,
  Cancel,
  CheckCircle,
  Email,
  Phone,
} from '@mui/icons-material';
import api from '../utils/api';

interface BookingData {
  bookingNumber: string;
  status: string;
  patient: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  appointment: {
    date: string;
    startTime: string;
    endTime: string;
    type: string;
    reason: string;
  };
  doctor: {
    name: string;
    specialization?: string;
  };
}

const PatientBooking: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  useEffect(() => {
    if (token) {
      loadBooking();
    }
  }, [token]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<any>(`/online-booking/patient/${token}`);
      
      if (response.success && response.data) {
        const bookingData = response.data.data?.booking || response.data.booking;
        setBooking(bookingData);
      } else {
        setError(response.message || 'Fehler beim Laden der Buchung');
      }
    } catch (err: any) {
      console.error('Error loading booking:', err);
      setError(err.response?.data?.message || 'Ungültiger oder abgelaufener Link');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setSnackbar({
        open: true,
        message: 'Bitte geben Sie einen Grund für die Stornierung an',
        severity: 'error'
      });
      return;
    }

    try {
      setCancelling(true);
      const response = await api.put(`/online-booking/patient/${token}/cancel`, {
        reason: cancelReason
      });

      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Termin erfolgreich storniert',
          severity: 'success'
        });
        setCancelDialogOpen(false);
        setCancelReason('');
        // Lade Buchung neu, um aktualisierten Status zu sehen
        await loadBooking();
      } else {
        setSnackbar({
          open: true,
          message: response.message || 'Fehler beim Stornieren',
          severity: 'error'
        });
      }
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Fehler beim Stornieren der Buchung',
        severity: 'error'
      });
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-AT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Bestätigt';
      case 'pending':
        return 'Ausstehend';
      case 'cancelled':
        return 'Storniert';
      case 'completed':
        return 'Abgeschlossen';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !booking) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 3 }}>
        <Alert severity="error">
          {error || 'Buchung nicht gefunden'}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/online-booking')}
          sx={{ mt: 2 }}
        >
          Zur Online-Buchung
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, mb: 4, p: 3 }}>
      <Card sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Ihre Terminbuchung
          </Typography>
          <Chip
            label={getStatusLabel(booking.status)}
            color={getStatusColor(booking.status) as any}
            size="medium"
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={3}>
          {/* Patientendaten */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Person sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Patientendaten</Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Name:</strong> {booking.patient.firstName} {booking.patient.lastName}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <Email sx={{ mr: 1, fontSize: 16 }} />
              {booking.patient.email}
            </Typography>
            <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
              <Phone sx={{ mr: 1, fontSize: 16 }} />
              {booking.patient.phone}
            </Typography>
          </Grid>

          {/* Termindetails */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarToday sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Termindetails</Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Datum:</strong> {formatDate(booking.appointment.date)}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <AccessTime sx={{ mr: 1, fontSize: 16 }} />
              {booking.appointment.startTime} - {booking.appointment.endTime} Uhr
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Art:</strong> {booking.appointment.type}
            </Typography>
            <Typography variant="body1">
              <strong>Grund:</strong> {booking.appointment.reason}
            </Typography>
          </Grid>

          {/* Arzt */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocalHospital sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Arzt</Typography>
            </Box>
            <Typography variant="body1">
              <strong>{booking.doctor.name}</strong>
              {booking.doctor.specialization && ` - ${booking.doctor.specialization}`}
            </Typography>
          </Grid>

          {/* Buchungsnummer */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary">
              Buchungsnummer: <strong>{booking.bookingNumber}</strong>
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Aktionen */}
        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Cancel />}
              onClick={() => setCancelDialogOpen(true)}
            >
              Termin stornieren
            </Button>
          </Box>
        )}

        {booking.status === 'cancelled' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Dieser Termin wurde storniert.
          </Alert>
        )}
      </Card>

      {/* Stornierungs-Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Termin stornieren</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Bitte geben Sie einen Grund für die Stornierung an:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Grund"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Abbrechen</Button>
          <Button
            onClick={handleCancel}
            variant="contained"
            color="error"
            disabled={cancelling || !cancelReason.trim()}
          >
            {cancelling ? <CircularProgress size={20} /> : 'Stornieren'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PatientBooking;

