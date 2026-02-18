import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Paper,
} from '@mui/material';
import { CheckCircle, AccessTime } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../utils/api';
import { stripHtmlTags } from '../utils/textUtils';

interface ReservationData {
  waitingListEntry: {
    _id: string;
    patient: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: string;
    };
    reason: string;
  };
  appointment: {
    _id: string;
    startTime: string;
    endTime: string;
    doctor: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    service?: {
      _id: string;
      name: string;
      code: string;
    };
    type: string;
  };
  expiresAt: string;
}

const WaitingListReservation: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservationData, setReservationData] = useState<ReservationData | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [reserved, setReserved] = useState(false);

  useEffect(() => {
    const fetchReservationData = async () => {
      if (!token) {
        setError('Ungültiger Reservierungslink.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/online-booking/waiting-list-reservation/${token}`);
        
        if (response.success && response.data) {
          // API-Wrapper gibt zurück: { data: { success: true, data: {...} }, success: true }
          // Backend gibt zurück: { success: true, data: {...} }
          const reservationData = (response.data as any).data || response.data;
          setReservationData(reservationData);
        } else {
          setError(response.message || 'Reservierungslink nicht gefunden oder abgelaufen.');
        }
      } catch (err: any) {
        console.error('Error fetching reservation data:', err);
        setError(err.response?.data?.message || 'Fehler beim Laden der Reservierungsdaten.');
      } finally {
        setLoading(false);
      }
    };

    fetchReservationData();
  }, [token]);

  const handleReserve = async () => {
    if (!token || !reservationData || !dateOfBirth) {
      setError('Bitte geben Sie Ihr Geburtsdatum ein.');
      return;
    }

    // Validiere Geburtsdatum
    const patientDOB = parseISO(reservationData.waitingListEntry.patient.dateOfBirth);
    const enteredDOB = parseISO(dateOfBirth);
    
    if (patientDOB.getTime() !== enteredDOB.getTime()) {
      setError('Das eingegebene Geburtsdatum stimmt nicht überein.');
      return;
    }

    try {
      setReserving(true);
      setError(null);

      const response = await api.post(`/online-booking/waiting-list-reservation/${token}`, {
        patientId: reservationData.waitingListEntry.patient._id
      });

      if (response.success) {
        setReserved(true);
      } else {
        setError(response.message || 'Fehler bei der Termin-Reservierung.');
      }
    } catch (err: any) {
      console.error('Error reserving appointment:', err);
      setError(err.response?.data?.message || 'Fehler bei der Termin-Reservierung.');
    } finally {
      setReserving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !reservationData) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, margin: 'auto', mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" onClick={() => navigate('/online-booking')} sx={{ mt: 2 }}>
          Zur Online-Buchung
        </Button>
      </Box>
    );
  }

  if (!reservationData) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, margin: 'auto', mt: 4 }}>
        <Alert severity="info">Keine Reservierungsdaten gefunden.</Alert>
        <Button variant="contained" onClick={() => navigate('/online-booking')} sx={{ mt: 2 }}>
          Zur Online-Buchung
        </Button>
      </Box>
    );
  }

  const appointmentStartTime = parseISO(reservationData.appointment.startTime);
  const appointmentEndTime = parseISO(reservationData.appointment.endTime);
  const expiresAt = parseISO(reservationData.expiresAt);
  const isExpired = new Date() > expiresAt;

  if (reserved) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, margin: 'auto', mt: 4 }}>
        <Card raised sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <CheckCircle color="success" sx={{ fontSize: 48 }} />
            <Typography variant="h4" component="h1">
              Termin erfolgreich reserviert!
            </Typography>
          </Box>
          
          <Alert severity="success" sx={{ mb: 3 }}>
            Der Termin wurde erfolgreich für Sie reserviert. Sie erhalten in Kürze eine Bestätigung per E-Mail.
          </Alert>

          <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom>Termindetails</Typography>
            <Typography><strong>Datum:</strong> {format(appointmentStartTime, 'EEEE, dd. MMMM yyyy', { locale: de })}</Typography>
            <Typography><strong>Uhrzeit:</strong> {format(appointmentStartTime, 'HH:mm', { locale: de })} - {format(appointmentEndTime, 'HH:mm', { locale: de })} Uhr</Typography>
            <Typography><strong>Arzt:</strong> {reservationData.appointment.doctor.firstName} {reservationData.appointment.doctor.lastName}</Typography>
            {reservationData.appointment.service && (
              <Typography>
                <strong>Leistung:</strong> {stripHtmlTags(reservationData.appointment.service.name)} ({reservationData.appointment.service.code})
              </Typography>
            )}
            <Typography><strong>Art:</strong> {reservationData.appointment.type}</Typography>
          </Paper>

          <Button variant="contained" onClick={() => navigate('/online-booking')} fullWidth>
            Zurück zur Online-Buchung
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: 'auto', mt: 4 }}>
      <Card raised sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Früherer Termin verfügbar
        </Typography>

        {isExpired && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Dieser Reservierungslink ist abgelaufen. Bitte kontaktieren Sie uns telefonisch.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Wichtig:</strong> Dieser Link ist nur 24 Stunden gültig. Wer zuerst klickt, bekommt den Termin.
          </Typography>
        </Alert>

        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>Verfügbarer Termin</Typography>
          <Typography><strong>Datum:</strong> {format(appointmentStartTime, 'EEEE, dd. MMMM yyyy', { locale: de })}</Typography>
          <Typography><strong>Uhrzeit:</strong> {format(appointmentStartTime, 'HH:mm', { locale: de })} - {format(appointmentEndTime, 'HH:mm', { locale: de })} Uhr</Typography>
          <Typography><strong>Arzt:</strong> {reservationData.appointment.doctor.firstName} {reservationData.appointment.doctor.lastName}</Typography>
            {reservationData.appointment.service && (
              <Typography>
                <strong>Leistung:</strong> {stripHtmlTags(reservationData.appointment.service.name)} ({reservationData.appointment.service.code})
              </Typography>
            )}
          <Typography><strong>Art:</strong> {reservationData.appointment.type}</Typography>
        </Paper>

        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>Ihre Daten</Typography>
          <Typography><strong>Name:</strong> {reservationData.waitingListEntry.patient.firstName} {reservationData.waitingListEntry.patient.lastName}</Typography>
          <Typography><strong>E-Mail:</strong> {reservationData.waitingListEntry.patient.email}</Typography>
          <Typography><strong>Telefon:</strong> {reservationData.waitingListEntry.patient.phone}</Typography>
        </Paper>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Bitte geben Sie Ihr Geburtsdatum ein, um den Termin zu reservieren:
          </Typography>
          <TextField
            fullWidth
            type="date"
            label="Geburtsdatum"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            sx={{ mt: 1 }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleReserve}
            disabled={reserving || isExpired || !dateOfBirth}
            fullWidth
            startIcon={reserving ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {reserving ? 'Reserviere...' : 'Termin jetzt reservieren'}
          </Button>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
          <AccessTime fontSize="small" />
          <Typography variant="caption">
            Link gültig bis: {format(expiresAt, 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default WaitingListReservation;

