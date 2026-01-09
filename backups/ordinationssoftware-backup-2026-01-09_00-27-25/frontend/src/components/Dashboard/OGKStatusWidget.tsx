// ÖGK-Status Widget für Dashboard

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle,
  Refresh,
  GetApp
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface OGKStatusWidgetProps {
  widget: any;
  data?: any;
}

interface OGKStats {
  period: string;
  totalInvoices: number;
  totalAmount: number;
  totalCopay: number;
  totalInsuranceAmount: number;
}

const OGKStatusWidget: React.FC<OGKStatusWidgetProps> = ({ widget, data }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<OGKStats | null>(null);
  const [autoSubmitStatus, setAutoSubmitStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Lade aktuelle Periode
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const statsResponse = await api.get<any>(`/ogk-billing/stats/${currentPeriod}`);
      if ((statsResponse.data as any)?.success) {
        setStats((statsResponse.data as any).data);
      }
      
      // Lade Auto-Submit Status
      const statusResponse = await api.get<any>('/ogk-billing/auto-submit/status');
      if ((statusResponse.data as any)?.success) {
        setAutoSubmitStatus((statusResponse.data as any).data);
      }
    } catch (error) {
      console.error('Error loading OGK status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">ÖGK-Abrechnung</Typography>
        <Box>
          <Tooltip title="Aktualisieren">
            <IconButton size="small" onClick={loadData}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Öffnen">
            <IconButton size="small" onClick={() => navigate('/ogk-billing')}>
              <GetApp fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Box sx={{ p: 2, flex: 1 }}>
        {stats ? (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 6 }}>
                <Card variant="outlined">
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">
                      Rechnungen
                    </Typography>
                    <Typography variant="h6">
                      {stats.totalInvoices}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Card variant="outlined">
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">
                      Gesamtbetrag
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatAmount(stats.totalAmount)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Versicherungsanteil
              </Typography>
              <LinearProgress
                variant="determinate"
                value={stats.totalAmount > 0 ? (stats.totalInsuranceAmount / stats.totalAmount) * 100 : 0}
                sx={{ height: 8, borderRadius: 1 }}
              />
              <Typography variant="caption" color="success.main" sx={{ mt: 0.5 }}>
                {formatAmount(stats.totalInsuranceAmount)}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Selbstbehalt
              </Typography>
              <Typography variant="body2" color="warning.main">
                {formatAmount(stats.totalCopay)}
              </Typography>
            </Box>
            
            {autoSubmitStatus && (
              <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  {autoSubmitStatus.isRunning ? (
                    <CircularProgress size={12} />
                  ) : (
                    <CheckCircle fontSize="small" color="success" />
                  )}
                  <Typography variant="caption">
                    Auto-Submit: {autoSubmitStatus.isRunning ? 'Läuft...' : 'Aktiv'}
                  </Typography>
                </Box>
                {autoSubmitStatus.lastRun && (
                  <Typography variant="caption" color="text.secondary">
                    Letzte Ausführung: {format(new Date(autoSubmitStatus.lastRun), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </Typography>
                )}
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Keine Daten verfügbar
            </Typography>
          </Box>
        )}
      </Box>
      
      <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
        <Typography
          variant="caption"
          color="primary"
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          onClick={() => navigate('/ogk-billing')}
        >
          ÖGK-Abrechnung öffnen
        </Typography>
      </Box>
    </Box>
  );
};

export default OGKStatusWidget;

