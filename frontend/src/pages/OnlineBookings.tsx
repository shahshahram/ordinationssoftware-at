import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Button,
} from '@mui/material';
import {
  Person,
  AccessTime,
  LocationOn,
  MedicalServices,
  Edit,
  Visibility,
  Refresh,
  BookOnline,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAppointments } from '../store/slices/appointmentSlice';
import api from '../utils/api';

interface Appointment {
  _id: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  startTime: string;
  endTime: string;
  duration: number;
  service?: {
    _id: string;
    name: string;
    code?: string;
  };
  doctor?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  location?: {
    _id: string;
    name: string;
  };
  bookingType: 'online' | 'internal' | 'phone' | 'walk_in';
  onlineBookingRef?: string;
  isOnlineBooking?: boolean;
  status: string;
  title?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const OnlineBookings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { appointments: _reduxAppointments, loading: _loading } = useAppSelector((state) => state.appointments);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lade Online-Buchungen
  const loadOnlineBookings = async () => {
    try {
      setLoadingData(true);
      setError(null);
      
      // Lade alle Termine
      await dispatch(fetchAppointments());
      
      // Lade zusätzlich direkt von der API, um sicherzustellen, dass wir alle haben
      const response = await api.get<{ success: boolean; data: Appointment[]; pagination?: any }>('/appointments');
      
      if (response.success && response.data) {
        const allAppointments = Array.isArray(response.data) ? response.data : response.data.data || [];
        
        // Filtere nur Online-Buchungen
        const onlineBookings = allAppointments.filter((apt: Appointment) => {
          return apt.bookingType === 'online' || 
                 apt.onlineBookingRef || 
                 apt.isOnlineBooking === true;
        });
        
        // Sortiere nach Erstellungsdatum (neueste zuerst)
        onlineBookings.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        
        setAppointments(onlineBookings);
      }
    } catch (err: any) {
      console.error('Error loading online bookings:', err);
      setError('Fehler beim Laden der Online-Buchungen');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadOnlineBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init load once
  }, [dispatch]);

  // Lade Daten neu, wenn die Seite wieder sichtbar wird (z.B. nach Bearbeitung)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadOnlineBookings();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadOnlineBookings stable, visibility listener
  }, [dispatch]);

  // Gruppiere Buchungen nach Erstellungsdatum
  const groupedBookings = useMemo(() => {
    const groups: { [key: string]: { date: Date; appointments: Appointment[] } } = {};
    
    appointments.forEach((apt) => {
      const date = new Date(apt.createdAt);
      const dateKey = date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = { date, appointments: [] };
      }
      groups[dateKey].appointments.push(apt);
    });
    
    return groups;
  }, [appointments]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'geplant':
        return 'default';
      case 'bestätigt':
        return 'success';
      case 'wartend':
        return 'warning';
      case 'in_behandlung':
        return 'info';
      case 'abgeschlossen':
        return 'success';
      case 'abgesagt':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleEditAppointment = (appointmentId: string) => {
    const returnUrl = encodeURIComponent('/online-bookings');
    navigate(`/appointments?edit=${appointmentId}&returnUrl=${returnUrl}`);
  };

  const handleViewAppointment = (appointmentId: string) => {
    const returnUrl = encodeURIComponent('/online-bookings');
    navigate(`/appointments?view=${appointmentId}&returnUrl=${returnUrl}`);
  };

  if (loadingData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={loadOnlineBookings}>
            Erneut versuchen
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  const sortedDates = Object.keys(groupedBookings).sort((a, b) => {
    const dateA = groupedBookings[a].date.getTime();
    const dateB = groupedBookings[b].date.getTime();
    return dateB - dateA;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BookOnline sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Online-Buchungen
          </Typography>
          <Chip 
            label={`${appointments.length} Buchungen`} 
            color="primary" 
            variant="outlined"
          />
        </Box>
        <IconButton onClick={loadOnlineBookings} color="primary">
          <Refresh />
        </IconButton>
      </Box>

      {appointments.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <BookOnline sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Keine Online-Buchungen gefunden
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Es wurden noch keine Online-Buchungen erstellt.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {sortedDates.map((dateKey) => (
            <Box key={dateKey}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 2, 
                  pb: 1, 
                  borderBottom: '2px solid',
                  borderColor: 'primary.main',
                  fontWeight: 600
                }}
              >
                {dateKey}
              </Typography>
              <Stack spacing={2}>
                {groupedBookings[dateKey].appointments.map((apt) => (
                  <Card key={apt._id} elevation={2} sx={{ '&:hover': { boxShadow: 4 } }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Chip 
                              label={apt.status} 
                              color={getStatusColor(apt.status) as any}
                              size="small"
                            />
                            {apt.onlineBookingRef && (
                              <Chip 
                                label={apt.onlineBookingRef} 
                                color="primary"
                                variant="outlined"
                                size="small"
                                icon={<BookOnline />}
                              />
                            )}
                          </Box>
                          
                          <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Person color="action" fontSize="small" />
                              <Typography variant="body1" fontWeight={500}>
                                {apt.patient?.firstName} {apt.patient?.lastName}
                              </Typography>
                            </Box>
                            
                            {apt.service && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <MedicalServices color="action" fontSize="small" />
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  dangerouslySetInnerHTML={{ __html: `${apt.service.name}${apt.service.code ? ` (${apt.service.code})` : ''}` }}
                                />
                              </Box>
                            )}
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccessTime color="action" fontSize="small" />
                              <Typography variant="body2" color="text.secondary">
                                {formatTime(apt.startTime)} - {formatTime(apt.endTime)} ({apt.duration} Min.)
                              </Typography>
                            </Box>
                            
                            {apt.doctor && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Person color="action" fontSize="small" />
                                <Typography variant="body2" color="text.secondary">
                                  {apt.doctor.firstName} {apt.doctor.lastName}
                                </Typography>
                              </Box>
                            )}
                            
                            {apt.location && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocationOn color="action" fontSize="small" />
                                <Typography variant="body2" color="text.secondary">
                                  {apt.location.name}
                                </Typography>
                              </Box>
                            )}
                            
                            {apt.notes && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  {apt.notes}
                                </Typography>
                              </Box>
                            )}
                            
                            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                              <Typography variant="caption" color="text.secondary">
                                Erstellt: {formatDateTime(apt.createdAt)}
                              </Typography>
                            </Box>
                          </Stack>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewAppointment(apt._id)}
                            title="Anzeigen"
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditAppointment(apt._id)}
                            title="Bearbeiten"
                          >
                            <Edit />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default OnlineBookings;

