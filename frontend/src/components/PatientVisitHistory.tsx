import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Event,
  CheckCircle,
  Schedule,
  Person,
  MedicalServices,
  AccessTime,
  Description
} from '@mui/icons-material';
import api from '../utils/api';

interface VisitHistoryItem {
  type: 'appointment' | 'service' | 'checkin' | 'visit';
  date: string;
  checkInTime?: string | null;
  reason: string;
  status: string;
  doctor?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
}

interface VisitHistoryData {
  patientId: string;
  lastVisit: {
    date: string;
    reason: string;
    type: string;
    status: string;
  } | null;
  visitHistory: VisitHistoryItem[];
  totalVisits: number;
  totalAppointments: number;
  totalServices: number;
}

interface PatientVisitHistoryProps {
  patientId: string;
  limit?: number;
}

const PatientVisitHistory: React.FC<PatientVisitHistoryProps> = ({ patientId, limit = 10 }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VisitHistoryData | null>(null);

  useEffect(() => {
    const fetchVisitHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const response: any = await api.get(`/patients-extended/${patientId}/visit-history?limit=${limit}`);
        
        console.log('Visit history response:', response);
        
        // API gibt zurück: { success: true, data: { patientId, lastVisit, visitHistory, ... } }
        // api.get wrappt das in: { data: { success: true, data: { ... } }, success: true }
        // Also: response.data.data ist das eigentliche Datenobjekt
        const apiData = response.data?.data || response.data;
        
        if (response.success && apiData) {
          // Stelle sicher, dass visitHistory ein Array ist
          const visitHistoryData = {
            ...apiData,
            visitHistory: Array.isArray(apiData.visitHistory) 
              ? apiData.visitHistory 
              : [],
            totalVisits: apiData.totalVisits || 0,
            totalAppointments: apiData.totalAppointments || 0,
            totalServices: apiData.totalServices || 0
          };
          setData(visitHistoryData);
        } else {
          setError('Fehler beim Laden der Besuchshistorie');
        }
      } catch (err: any) {
        console.error('Error fetching visit history:', err);
        setError(err.message || 'Fehler beim Laden der Besuchshistorie');
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchVisitHistory();
    }
  }, [patientId, limit]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Event color="primary" />;
      case 'service':
        return <MedicalServices color="secondary" />;
      case 'checkin':
        return <CheckCircle color="success" />;
      case 'visit':
        return <Schedule color="info" />;
      default:
        return <Event />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'Termin';
      case 'service':
        return 'Service';
      case 'checkin':
        return 'Check-in';
      case 'visit':
        return 'Besuch';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'abgeschlossen':
      case 'completed':
        return 'success';
      case 'in_behandlung':
      case 'in_progress':
        return 'info';
      case 'wartend':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!data || !data.visitHistory || data.visitHistory.length === 0) {
    return (
      <Card sx={{ p: 2, m: 2 }}>
        <Typography variant="h6" gutterBottom>
          Besuchshistorie
        </Typography>
        <Alert severity="info">
          Keine Besuchshistorie verfügbar
        </Alert>
      </Card>
    );
  }

  return (
    <Card sx={{ m: 2 }}>
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="h6" gutterBottom>
          Besuchshistorie
        </Typography>
        {data.lastVisit && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              <strong>Letzter Besuch:</strong> {formatDateShort(data.lastVisit.date)} - {data.lastVisit.reason}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.9 }}>
              Gesamt: {data.totalVisits || 0} Besuche ({data.totalAppointments || 0} Termine, {data.totalServices || 0} Services)
            </Typography>
          </Box>
        )}
      </Box>

      <List>
        {data.visitHistory.map((visit, index) => (
          <React.Fragment key={index}>
            <ListItem>
              <ListItemIcon>
                {getTypeIcon(visit.type)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2">
                      {visit.reason}
                    </Typography>
                    <Chip
                      label={getTypeLabel(visit.type)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={visit.status}
                      size="small"
                      color={getStatusColor(visit.status) as any}
                    />
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} component="span">
                        <AccessTime fontSize="small" />
                        {formatDate(visit.date)}
                      </Typography>
                      {visit.checkInTime && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} component="span">
                          <CheckCircle fontSize="small" />
                          Check-in: {formatDate(visit.checkInTime)}
                        </Typography>
                      )}
                    </Box>
                    {visit.doctor && (
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }} component="span">
                        <Person fontSize="small" />
                        {visit.doctor}
                      </Typography>
                    )}
                    {visit.diagnosis && (
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }} component="span">
                        <Description fontSize="small" />
                        Diagnose: {visit.diagnosis}
                      </Typography>
                    )}
                    {visit.notes && (
                      <Tooltip title={visit.notes}>
                        <Typography variant="caption" color="text.secondary" sx={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }} component="span">
                          {visit.notes}
                        </Typography>
                      </Tooltip>
                    )}
                  </Box>
                }
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItem>
            {index < data.visitHistory.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Card>
  );
};

export default PatientVisitHistory;

