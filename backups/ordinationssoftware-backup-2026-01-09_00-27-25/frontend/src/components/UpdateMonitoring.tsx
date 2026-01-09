import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Refresh,
  PlayArrow,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  Info,
  CloudDownload,
  Category,
  PriceCheck
} from '@mui/icons-material';
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../utils/api';
import { useSnackbar } from 'notistack';

interface UpdateService {
  name: string;
  description: string;
  schedule: string;
  scheduleDescription: string;
  nextExecution: string | null;
  lastExecution: string | null;
  lastCheck?: string | null;
  lastStatus: 'success' | 'error' | 'unknown' | 'running';
  isRunning: boolean;
  canTrigger: boolean;
  triggerEndpoint?: string;
  sources?: {
    [key: string]: {
      name: string;
      url: string;
    };
  };
}

interface UpdateMonitoringProps {
  refreshInterval?: number; // in milliseconds
}

const UpdateMonitoring: React.FC<UpdateMonitoringProps> = ({ refreshInterval = 30000 }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [services, setServices] = useState<UpdateService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const response = await api.get<any>('/update-monitoring/status');
      if (response.success && response.data) {
        const servicesData = (response.data as any).services || [];
        setServices(servicesData);
      }
    } catch (error: any) {
      console.error('Fehler beim Laden des Update-Status:', error);
      enqueueSnackbar('Fehler beim Laden des Update-Status', { variant: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatus();
    
    if (refreshInterval > 0) {
      const interval = setInterval(loadStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStatus();
  };

  const handleTrigger = async (serviceType: string, serviceName: string) => {
    setTriggering(serviceType);
    try {
      const response = await api.post(`/update-monitoring/trigger/${serviceType}`);
      if (response.success) {
        enqueueSnackbar(`${serviceName} wurde gestartet`, { variant: 'success' });
        // Warte kurz und aktualisiere dann den Status
        setTimeout(() => {
          loadStatus();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Fehler beim Auslösen des Updates:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Fehler beim Auslösen des Updates',
        { variant: 'error' }
      );
    } finally {
      setTriggering(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'running':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string, isRunning: boolean) => {
    if (isRunning) {
      return <CircularProgress size={16} />;
    }
    switch (status) {
      case 'success':
        return <CheckCircle fontSize="small" />;
      case 'error':
        return <ErrorIcon fontSize="small" />;
      default:
        return <Info fontSize="small" />;
    }
  };

  const formatNextExecution = (nextExecution: string | null) => {
    if (!nextExecution) return 'Nicht geplant';
    
    const nextDate = new Date(nextExecution);
    const now = new Date();
    
    if (isBefore(nextDate, now)) {
      return 'Überfällig';
    }
    
    const distance = formatDistanceToNow(nextDate, { 
      addSuffix: true, 
      locale: de 
    });
    
    return `${format(nextDate, 'dd.MM.yyyy HH:mm', { locale: de })} (${distance})`;
  };

  const formatLastExecution = (lastExecution: string | null) => {
    if (!lastExecution) return 'Noch nie ausgeführt';
    
    const lastDate = new Date(lastExecution);
    const distance = formatDistanceToNow(lastDate, { 
      addSuffix: true, 
      locale: de 
    });
    
    return `${format(lastDate, 'dd.MM.yyyy HH:mm', { locale: de })} (${distance})`;
  };

  const getServiceIcon = (serviceName: string) => {
    if (serviceName.includes('Jährlich')) return <Schedule />;
    if (serviceName.includes('Wöchentlich')) return <PriceCheck />;
    if (serviceName.includes('Monatlich')) return <CloudDownload />;
    if (serviceName.includes('Kategorien')) return <Category />;
    return <Info />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Update-Monitoring
        </Typography>
        <Button
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outlined"
          size="small"
        >
          {refreshing ? 'Aktualisiere...' : 'Aktualisieren'}
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Überwachung und Status aller automatischen Update-Services für Kataloge und Downloads
      </Typography>

      <Grid container spacing={3}>
        {services.map((service, index) => (
          <Grid size={{ xs: 12, md: 6 }} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ mr: 2, color: 'primary.main' }}>
                    {getServiceIcon(service.name)}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="h6" 
                      gutterBottom
                      dangerouslySetInnerHTML={{ __html: service.name }}
                    />
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      dangerouslySetInnerHTML={{ __html: service.description }}
                    />
                  </Box>
                  <Chip
                    icon={getStatusIcon(service.lastStatus, service.isRunning)}
                    label={service.lastStatus === 'success' ? 'Erfolgreich' : 
                           service.lastStatus === 'error' ? 'Fehler' :
                           service.lastStatus === 'running' ? 'Läuft...' : 'Unbekannt'}
                    color={getStatusColor(service.lastStatus)}
                    size="small"
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Zeitplan
                    </Typography>
                    <Typography variant="body2">
                      {service.scheduleDescription}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Nächste Ausführung
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatNextExecution(service.nextExecution)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Letzte Ausführung
                    </Typography>
                    <Typography variant="body2">
                      {formatLastExecution(service.lastExecution)}
                    </Typography>
                  </Box>

                  {service.lastCheck && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Letzte Prüfung
                      </Typography>
                      <Typography variant="body2">
                        {formatLastExecution(service.lastCheck)}
                      </Typography>
                    </Box>
                  )}

                  {service.sources && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Datenquellen
                      </Typography>
                      <Stack spacing={0.5}>
                        {Object.entries(service.sources).map(([key, source]) => (
                          <Tooltip key={key} title={source.url}>
                            <Chip
                              label={source.name}
                              size="small"
                              variant="outlined"
                              sx={{ width: 'fit-content' }}
                            />
                          </Tooltip>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>

                {service.isRunning && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      Update läuft...
                    </Typography>
                  </Box>
                )}

                {service.canTrigger && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      startIcon={<PlayArrow />}
                      onClick={() => {
                        const serviceType = service.name.includes('Jährlich') ? 'annual' :
                                          service.name.includes('Wöchentlich') ? 'weekly' :
                                          service.name.includes('Monatlich') ? 'tariff' : 'unknown';
                        handleTrigger(serviceType, service.name);
                      }}
                      disabled={service.isRunning || triggering !== null}
                      variant="contained"
                      size="small"
                      color="primary"
                    >
                      {triggering && triggering === (service.name.includes('Jährlich') ? 'annual' :
                                                     service.name.includes('Wöchentlich') ? 'weekly' :
                                                     service.name.includes('Monatlich') ? 'tariff' : 'unknown')
                        ? 'Wird gestartet...'
                        : 'Jetzt ausführen'}
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {services.length === 0 && (
        <Alert severity="info">
          Keine Update-Services gefunden
        </Alert>
      )}
    </Box>
  );
};

export default UpdateMonitoring;

