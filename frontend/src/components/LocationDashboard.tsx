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
import api from '../utils/api';

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

  const fetchLocationStats = React.useCallback(async () => {
    if (locations.length === 0) return;
    
    setLoadingStats(true);
    try {
      const statsPromises = locations.map(async (location) => {
        try {
          const response = await api.get<any>(`/locations/${location._id}/stats`);
          console.log(`📊 Stats response for ${location.name} (${location._id}):`, response);
          
          if (response.success && response.data) {
            // Die API-Antwort ist verschachtelt: response.data.data enthält die eigentlichen Stats
            // oder response.data direkt, wenn es bereits die Stats sind
            const rawData = response.data;
            const stats = (rawData.data || rawData) as Partial<LocationStats>;
            console.log(`📊 Raw stats data for ${location.name}:`, stats);
            console.log(`📊 Raw response.data for ${location.name}:`, rawData);
            
            // Stelle sicher, dass location existiert, sonst füge es hinzu
            if (!stats.location && location) {
              stats.location = {
                _id: location._id,
                name: location.name,
                code: location.code || '',
                city: location.city || ''
              };
            }
            
            // Stelle sicher, dass appointments existiert
            if (!stats.appointments) {
              console.warn(`⚠️ No appointments data for ${location.name}, setting defaults`);
              stats.appointments = {
                total: 0,
                today: 0,
                thisWeek: 0
              };
            }
            
            // Stelle sicher, dass alle erforderlichen Felder vorhanden sind (nur wenn sie wirklich fehlen, nicht wenn sie 0 sind)
            if (stats.staff === undefined || stats.staff === null) stats.staff = 0;
            if (stats.rooms === undefined || stats.rooms === null) stats.rooms = 0;
            if (stats.devices === undefined || stats.devices === null) stats.devices = 0;
            if (stats.activeHours === undefined || stats.activeHours === null) stats.activeHours = 0;
            if (stats.activeClosures === undefined || stats.activeClosures === null) stats.activeClosures = 0;
            
            console.log(`✅ Processed stats for ${location.name}:`, {
              staff: stats.staff,
              rooms: stats.rooms,
              devices: stats.devices,
              activeHours: stats.activeHours,
              activeClosures: stats.activeClosures,
              appointments: stats.appointments
            });
            
            // Prüfe ob location gültig ist
            if (stats.location && stats.location._id) {
              return stats as LocationStats;
            }
            console.warn(`⚠️ Invalid location in stats for ${location._id}:`, stats);
            return null;
          }
          console.warn(`⚠️ No data in response for ${location.name}:`, response);
          return null;
        } catch (error) {
          console.error(`Error fetching stats for location ${location._id}:`, error);
          return null;
        }
      });

      const statsData = await Promise.all(statsPromises);
      const validStats = statsData.filter((stat): stat is LocationStats => 
        stat !== null && 
        stat !== undefined && 
        stat.location !== null && 
        stat.location !== undefined &&
        stat.location._id !== undefined
      );
      setStats(validStats);
      console.log(`✅ Loaded stats for ${validStats.length} locations`);
    } catch (error) {
      console.error('Error fetching location stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [locations]);

  useEffect(() => {
    if (locations.length > 0) {
      fetchLocationStats();
    }
  }, [locations, fetchLocationStats]);

  // Automatische Aktualisierung alle 30 Sekunden
  useEffect(() => {
    if (locations.length === 0) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing location stats...');
      fetchLocationStats();
    }, 30000); // 30 Sekunden

    return () => clearInterval(interval);
  }, [locations, fetchLocationStats]);

  // Aktualisiere beim Wechsel zurück zum Tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && locations.length > 0) {
        console.log('📱 Page became visible, refreshing location stats...');
        fetchLocationStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [locations, fetchLocationStats]);

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
    // Prüfe ob appointments existiert
    if (!stats.appointments || !stats.appointments.total) return 0;
    if (stats.appointments.total === 0) return 0;
    const maxCapacity = (stats.rooms || 1) * 8; // Annahme: 8 Termine pro Raum pro Tag
    const today = stats.appointments.today || 0;
    return Math.min((today / maxCapacity) * 100, 100);
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
          // Prüfe ob locationStats und locationStats.location existieren
          if (!locationStats || !locationStats.location || !locationStats.location._id) {
            console.warn('⚠️ Invalid locationStats:', locationStats);
            return null;
          }
          
          const location = locations.find(l => l._id === locationStats.location._id);
          if (!location) {
            console.warn('⚠️ Location not found for stats:', locationStats.location._id);
            return null;
          }

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
                        {locationStats.appointments?.today || 0}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Diese Woche:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {locationStats.appointments?.thisWeek || 0}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Gesamt:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {locationStats.appointments?.total || 0}
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
