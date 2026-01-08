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
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  GetApp,
  Send,
  Refresh,
  CheckCircle,
  Pending,
  Description,
  HelpOutline
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../utils/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import GradientDialogTitle from '../components/GradientDialogTitle';

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
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">ÖGK-Abrechnung</Typography>
          <Tooltip title="Hilfe & Leitfaden">
            <IconButton
              onClick={() => setHelpDialogOpen(true)}
              color="primary"
            >
              <HelpOutline />
            </IconButton>
          </Tooltip>
        </Box>
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

      {/* Hilfe-Dialog mit Leitfaden */}
      <Dialog 
        open={helpDialogOpen} 
        onClose={() => setHelpDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { minHeight: '600px' }
        }}
      >
        <GradientDialogTitle 
          title="Leitfaden: ÖGK-Abrechnung (Leistungsabrechnung)" 
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs value={helpTab} onChange={(_, v) => setHelpTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Übersicht" />
            <Tab label="Turnusabrechnung" />
            <Tab label="Automatische Übermittlung" />
            <Tab label="Statistiken" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Was ist ÖGK-Abrechnung?
                </Typography>
                <Typography variant="body1" paragraph>
                  Die ÖGK-Abrechnung (Leistungsabrechnung) ermöglicht die Übermittlung von 
                  Kassenarzt-Leistungen an die Österreichische Gesundheitskasse (ÖGK) im Rahmen 
                  der monatlichen Turnusabrechnung.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📊 <strong>Statistiken:</strong> Übersicht über Rechnungen, Beträge, Selbstbehalt</li>
                  <li>📥 <strong>Export:</strong> Turnusabrechnung als XML exportieren</li>
                  <li>🔄 <strong>Automatische Übermittlung:</strong> Täglich um 23:00 Uhr</li>
                  <li>📅 <strong>Periodenauswahl:</strong> Letzte 12 Monate verfügbar</li>
                  <li>✅ <strong>Manuelle Übermittlung:</strong> Jederzeit manuell auslösbar</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Was wird abgerechnet?
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Alle Kassenarzt-Rechnungen (Abrechnungstyp: "Kassenarzt")</li>
                  <li>EBM-Codes und Preise</li>
                  <li>Patientendaten und Versicherungsnummern</li>
                  <li>Diagnosen (ICD-10)</li>
                  <li>Leistungsdaten (Datum, Menge, Preis)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Voraussetzungen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Kassenarzt-Vertrag mit ÖGK</li>
                  <li>✅ Rechnungen mit Abrechnungstyp "Kassenarzt"</li>
                  <li>✅ Rechnungen mit Status "Gesendet" oder "Bezahlt"</li>
                  <li>✅ Korrekte EBM-Codes in den Leistungen</li>
                  <li>✅ ICD-10-Diagnosen bei den Rechnungen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Turnusabrechnung
                </Typography>
                <Typography variant="body2" paragraph>
                  Die Turnusabrechnung ist eine monatliche Zusammenfassung aller Kassenarzt-Leistungen 
                  für die Übermittlung an die ÖGK.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Turnusabrechnung erstellen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wählen Sie eine Abrechnungsperiode aus (Standard: aktueller Monat)</li>
                  <li>Das System lädt automatisch alle Kassenarzt-Rechnungen dieser Periode</li>
                  <li>Überprüfen Sie die Statistiken (Anzahl, Beträge)</li>
                  <li>Klicken Sie auf "Turnusabrechnung exportieren"</li>
                  <li>Die XML-Datei wird heruntergeladen</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  XML-Export
                </Typography>
                <Typography variant="body2" paragraph>
                  Die exportierte XML-Datei enthält:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Alle Kassenarzt-Rechnungen der Periode</li>
                  <li>EBM-Codes und Preise</li>
                  <li>Patienten- und Versicherungsdaten</li>
                  <li>Diagnosen (ICD-10)</li>
                  <li>Leistungsdaten (Datum, Menge, Beschreibung)</li>
                  <li>Alle Metadaten im ÖGK-Standardformat</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Übermittlung an ÖGK
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Laden Sie die XML-Datei auf das ÖGK-Portal hoch</li>
                  <li>Oder senden Sie sie per E-Mail an die ÖGK</li>
                  <li>Die ÖGK prüft die Abrechnung</li>
                  <li>Nach erfolgreicher Prüfung erfolgt die Zahlung</li>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Hinweis:</strong> Nur Rechnungen mit Status "Gesendet" oder "Bezahlt" 
                  werden in die Turnusabrechnung aufgenommen.
                </Typography>
              </Alert>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Automatische Übermittlung
                </Typography>
                <Typography variant="body2" paragraph>
                  Das System kann Turnusabrechnungen automatisch erstellen und exportieren.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Funktionsweise
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Zeitplan:</strong> Täglich um 23:00 Uhr</li>
                  <li><strong>Prozess:</strong> Sammelt alle ausstehenden Kassenarzt-Rechnungen</li>
                  <li><strong>Export:</strong> Erstellt XML-Dateien für jeden Monat</li>
                  <li><strong>Status:</strong> Status wird aktualisiert</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Manuelle Übermittlung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Manuelle Übermittlung"</li>
                  <li>Das System verarbeitet alle ausstehenden Rechnungen</li>
                  <li>XML-Dateien werden erstellt</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Statistiken
                </Typography>
                <Typography variant="body2" paragraph>
                  Die Statistik-Karten zeigen eine Übersicht über die ausgewählte Periode.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Angezeigte Statistiken
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Rechnungen:</strong> Anzahl der Kassenarzt-Rechnungen</li>
                  <li><strong>Gesamtbetrag:</strong> Summe aller Rechnungsbeträge</li>
                  <li><strong>Selbstbehalt:</strong> Summe aller Selbstbehalte</li>
                  <li><strong>Versicherungsanteil:</strong> Betrag von der ÖGK</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Allgemeine Tipps
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Erstellen Sie die Turnusabrechnung monatlich</li>
                  <li>✅ Überprüfen Sie die Statistiken vor dem Export</li>
                  <li>✅ Übermitteln Sie die Abrechnung zeitnah an die ÖGK</li>
                  <li>✅ Speichern Sie eine Kopie der XML-Datei</li>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)} variant="contained">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OGKBilling;

