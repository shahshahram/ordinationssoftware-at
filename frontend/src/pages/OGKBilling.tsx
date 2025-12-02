// ÖGK-Abrechnung Verwaltung

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  GetApp,
  Send,
  Refresh,
  CheckCircle,
  Pending,
  Description
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../utils/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface OGKBillingStats {
  period: string;
  totalInvoices: number;
  totalAmount: number;
  totalCopay: number;
  totalInsuranceAmount: number;
}

const OGKBilling: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [stats, setStats] = useState<OGKBillingStats | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [autoSubmitStatus, setAutoSubmitStatus] = useState<any>(null);

  useEffect(() => {
    // Setze aktuellen Monat als Standard
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedPeriod(currentPeriod);
    loadStats(currentPeriod);
    loadAutoSubmitStatus();
  }, []);

  const loadStats = async (period: string) => {
    setLoading(true);
    try {
      const response = await api.get<any>(`/ogk-billing/stats/${period}`);
      if ((response.data as any)?.success) {
        setStats((response.data as any).data);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Statistiken', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadAutoSubmitStatus = async () => {
    try {
      const response = await api.get<any>('/ogk-billing/auto-submit/status');
      if ((response.data as any)?.success) {
        setAutoSubmitStatus((response.data as any).data);
      }
    } catch (error) {
      console.error('Error loading auto-submit status:', error);
    }
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    loadStats(period);
  };

  const handleExportTurnus = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/ogk-billing/turnus/${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Exportieren der XML-Datei');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OGK_Turnus_${selectedPeriod}_${Date.now()}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      enqueueSnackbar('Turnusabrechnung erfolgreich exportiert', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Exportieren', { variant: 'error' });
    }
  };

  const handleManualSubmit = async () => {
    try {
      const response = await api.post<any>('/ogk-billing/auto-submit');
      if ((response.data as any)?.success) {
        enqueueSnackbar('Automatische Übermittlung erfolgreich ausgelöst', { variant: 'success' });
        loadAutoSubmitStatus();
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler bei der Übermittlung', { variant: 'error' });
    }
  };

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  };

  // Generiere Perioden-Liste (letzte 12 Monate)
  const generatePeriods = () => {
    const periods = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = format(date, 'MMMM yyyy', { locale: de });
      periods.push({ value: period, label });
    }
    return periods;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">ÖGK-Abrechnung</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => loadStats(selectedPeriod)}
          >
            Aktualisieren
          </Button>
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={handleManualSubmit}
          >
            Manuelle Übermittlung
          </Button>
        </Box>
      </Box>

      {autoSubmitStatus && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Automatische Übermittlung: {autoSubmitStatus.isRunning ? 'Läuft...' : 'Inaktiv'}
          {autoSubmitStatus.lastRun && (
            <> | Letzte Ausführung: {format(new Date(autoSubmitStatus.lastRun), 'dd.MM.yyyy HH:mm', { locale: de })}</>
          )}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Abrechnungsperiode
              </Typography>
              <TextField
                fullWidth
                select
                label="Periode auswählen"
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                sx={{ mt: 1 }}
              >
                {generatePeriods().map((period) => (
                  <MenuItem key={period.value} value={period.value}>
                    {period.label}
                  </MenuItem>
                ))}
              </TextField>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Aktionen
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<GetApp />}
                  onClick={handleExportTurnus}
                  disabled={!selectedPeriod || loading}
                >
                  Turnusabrechnung exportieren
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Rechnungen
                </Typography>
                <Typography variant="h4">
                  {stats.totalInvoices}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Gesamtbetrag
                </Typography>
                <Typography variant="h4">
                  {formatAmount(stats.totalAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Selbstbehalt
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {formatAmount(stats.totalCopay)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Versicherungsanteil
                </Typography>
                <Typography variant="h4" color="success.main">
                  {formatAmount(stats.totalInsuranceAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Informationen</Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" paragraph>
            <strong>Turnusabrechnung:</strong> Monatliche Zusammenfassung aller Kassenarzt-Rechnungen für die Übermittlung an die ÖGK.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Automatische Übermittlung:</strong> Täglich um 23:00 Uhr werden alle ausstehenden Rechnungen automatisch verarbeitet und als XML exportiert.
          </Typography>
          <Typography variant="body2">
            <strong>Manuelle Übermittlung:</strong> Sie können die Übermittlung jederzeit manuell auslösen.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default OGKBilling;

