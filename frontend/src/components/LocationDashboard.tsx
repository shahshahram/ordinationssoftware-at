import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  People as PeopleIcon,
  MeetingRoom as RoomIcon,
  Devices as DeviceIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchLocations } from '../store/slices/locationSlice';

interface LocationStats {
  location: {
    _id: string;
    name: string;
    code: string;
    city: string;
  };
  staff: number;
  rooms: number;
  devices: number;
  activeHours: number;
  activeClosures: number;
  appointments: {
    total: number;
    today: number;
    thisWeek: number;
  };
}

const LocationDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { locations, loading, error } = useAppSelector(state => state.locations);
  const [stats, setStats] = useState<LocationStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    dispatch(fetchLocations());
  }, [dispatch]);

  useEffect(() => {
    if (locations.length > 0) {
      fetchLocationStats();
    }
  }, [locations]);

  const fetchLocationStats = async () => {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('token');
      const statsPromises = locations.map(async (location) => {
        const response = await fetch(`http://localhost:5001/api/locations/${location._id}/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        return data.success ? data.data : null;
      });

      const statsData = await Promise.all(statsPromises);
      setStats(statsData.filter(Boolean));
    } catch (error) {
      console.error('Error fetching location stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const getStatusColor = (location: any) => {
    if (location.is_active) {
      return 'success';
    }
    return 'default';
  };

  const getStatusIcon = (location: any) => {
    if (location.is_active) {
      return <CheckCircleIcon color="success" />;
    }
    return <WarningIcon color="warning" />;
  };

  const getUtilizationPercentage = (stats: LocationStats) => {
    if (stats.appointments.total === 0) return 0;
    const maxCapacity = stats.rooms * 8; // Annahme: 8 Termine pro Raum pro Tag
    return Math.min((stats.appointments.today / maxCapacity) * 100, 100);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Fehler beim Laden der Standorte: {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Standort-Dashboard
        </Typography>
        <Tooltip title="Statistiken aktualisieren">
          <span>
            <IconButton onClick={fetchLocationStats} disabled={loadingStats}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
        {stats.map((locationStats) => {
          const location = locations.find(l => l._id === locationStats.location._id);
          if (!location) return null;

          const utilization = getUtilizationPercentage(locationStats);

          return (
            <Box key={location._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(location)}
                      <Typography variant="h6" component="h2">
                        {location.name}
                      </Typography>
                    </Box>
                    <Chip
                      label={location.is_active ? 'Aktiv' : 'Inaktiv'}
                      color={getStatusColor(location)}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {location.code} • {location.city}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {/* Statistiken */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
                    <Box textAlign="center">
                      <PeopleIcon color="primary" />
                      <Typography variant="h6">{locationStats.staff}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Personal
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <RoomIcon color="primary" />
                      <Typography variant="h6">{locationStats.rooms}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Räume
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <DeviceIcon color="primary" />
                      <Typography variant="h6">{locationStats.devices}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Geräte
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <ScheduleIcon color="primary" />
                      <Typography variant="h6">{locationStats.activeHours}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Öffnungszeiten
                      </Typography>
                    </Box>
                  </Box>

                  {/* Termine */}
                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Termine
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Heute:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {locationStats.appointments.today}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Diese Woche:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {locationStats.appointments.thisWeek}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Gesamt:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {locationStats.appointments.total}
                      </Typography>
                    </Box>
                  </Paper>

                  {/* Auslastung */}
                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Auslastung heute</Typography>
                      <Typography variant="body2">{utilization.toFixed(1)}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={utilization}
                      color={utilization > 80 ? 'error' : utilization > 60 ? 'warning' : 'primary'}
                    />
                  </Box>

                  {/* Warnungen */}
                  {locationStats.activeClosures > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      {locationStats.activeClosures} aktive Schließtage
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Box>

      {stats.length === 0 && !loadingStats && (
        <Box textAlign="center" py={4}>
          <LocationIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Keine Standorte gefunden
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Erstellen Sie Ihren ersten Standort, um zu beginnen.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default LocationDashboard;
