import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
  Chip,
  Alert,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  CreditCard,
  Refresh,
  Sync,
  HelpOutline,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import GradientDialogTitle from '../components/GradientDialogTitle';

interface ECardValidationData {
  _id?: string;
  patientId: string;
  patient?: { firstName: string; lastName: string };
  ecardNumber: string;
  validationDate: string;
  validationStatus: 'valid' | 'invalid' | 'expired' | 'pending';
  validFrom: string;
  validUntil: string;
  insuranceData?: {
    insuranceProvider: string;
    insuranceNumber: string;
    socialSecurityNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender?: string;
  };
  elgaData?: {
    elgaId?: string;
    elgaStatus?: string;
    lastSync?: string;
  };
  validatedBy?: { firstName: string; lastName: string };
  validationMethod: 'elga' | 'fallback' | 'card_reader';
  errorMessage?: string;
}

const ECardValidation: React.FC = () => {
  const [validations, setValidations] = useState<ECardValidationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [ecardNumber, setEcardNumber] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { enqueueSnackbar } = useSnackbar();
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);

  useEffect(() => {
    loadPatients();
    loadValidCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Mount laden
  }, []);

  const loadPatients = async () => {
    try {
      const response = await api.get('/patients-extended');
      if (response.success) {
        setPatients(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error: any) {
      console.error('Error loading patients:', error);
    }
  };

  const loadValidCards = async () => {
    setLoading(true);
    try {
      const response = await api.get('/ecard-validation/valid');
      if (response.success) {
        setValidations(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Validierungen', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedPatient || !ecardNumber) {
      enqueueSnackbar('Bitte Patient und e-card Nummer auswählen', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/ecard-validation/validate', {
        patientId: selectedPatient._id || selectedPatient.id,
        ecardNumber,
        validationMethod: 'card_reader',
      });
      if (response.success) {
        enqueueSnackbar('e-card erfolgreich validiert', { variant: 'success' });
        setDialogOpen(false);
        setEcardNumber('');
        setSelectedPatient(null);
        loadValidCards();
      }
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Fehler bei der Validierung', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (patientId: string) => {
    setLoading(true);
    try {
      const response = await api.post(`/ecard-validation/sync/${patientId}`);
      if (response.success) {
        enqueueSnackbar('Patientendaten erfolgreich synchronisiert', { variant: 'success' });
        loadValidCards();
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler bei der Synchronisierung', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'success';
      case 'invalid':
        return 'error';
      case 'expired':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">E-Card Validierung</Typography>
          <Tooltip title="Hilfe & Leitfaden">
            <IconButton
              onClick={() => setHelpDialogOpen(true)}
              color="primary"
            >
              <HelpOutline />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadValidCards}
            disabled={loading}
          >
            Aktualisieren
          </Button>
          <Button
            variant="contained"
            startIcon={<CreditCard />}
            onClick={() => setDialogOpen(true)}
          >
            E-Card validieren
          </Button>
        </Box>
      </Box>

      {loading && <CircularProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Patient</TableCell>
              <TableCell>E-Card Nummer</TableCell>
              <TableCell>Validierungsdatum</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Gültig von</TableCell>
              <TableCell>Gültig bis</TableCell>
              <TableCell>Methode</TableCell>
              <TableCell align="right">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {validations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item) => (
              <TableRow key={item._id}>
                <TableCell>
                  {item.patient
                    ? `${item.patient.firstName} ${item.patient.lastName}`
                    : '—'}
                </TableCell>
                <TableCell>{item.ecardNumber}</TableCell>
                <TableCell>
                  {item.validationDate
                    ? format(new Date(item.validationDate), 'dd.MM.yyyy HH:mm')
                    : '—'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.validationStatus}
                    color={getStatusColor(item.validationStatus) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {item.validFrom
                    ? format(new Date(item.validFrom), 'dd.MM.yyyy')
                    : '—'}
                </TableCell>
                <TableCell>
                  {item.validUntil
                    ? format(new Date(item.validUntil), 'dd.MM.yyyy')
                    : '—'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.validationMethod}
                    size="small"
                    color={item.validationMethod === 'elga' ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  {item.patientId && (
                    <Button
                      size="small"
                      startIcon={<Sync />}
                      onClick={() => handleSync(item.patientId)}
                      disabled={loading}
                    >
                      Sync
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={validations.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>E-Card validieren</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Autocomplete
              options={patients}
              getOptionLabel={(option) =>
                `${option.firstName} ${option.lastName} (${option.dateOfBirth ? format(new Date(option.dateOfBirth), 'dd.MM.yyyy') : ''})`
              }
              value={selectedPatient}
              onChange={(_, newValue) => setSelectedPatient(newValue)}
              renderInput={(params) => <TextField {...params} label="Patient" />}
            />
            <TextField
              label="E-Card Nummer"
              fullWidth
              value={ecardNumber}
              onChange={(e) => setEcardNumber(e.target.value)}
              placeholder="z.B. 1234567890123456"
            />
            {selectedPatient && (
              <Alert severity="info">
                Patient: {selectedPatient.firstName} {selectedPatient.lastName}
                {selectedPatient.insuranceProvider && (
                  <> - Versicherung: {selectedPatient.insuranceProvider}</>
                )}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleValidate} variant="contained" disabled={loading}>
            Validieren
          </Button>
        </DialogActions>
      </Dialog>

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
          title="Leitfaden: E-Card Validierung" 
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs value={helpTab} onChange={(_, v) => setHelpTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Übersicht" />
            <Tab label="Validierung" />
            <Tab label="Validierungsstatus" />
            <Tab label="Synchronisation" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Was ist E-Card Validierung?
                </Typography>
                <Typography variant="body1" paragraph>
                  Die E-Card Validierung ermöglicht es, die elektronische Versicherungskarte (e-card) 
                  von Patienten zu validieren und die Versicherungsdaten sowie ELGA-Informationen 
                  automatisch zu aktualisieren.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>💳 <strong>E-Card validieren:</strong> Überprüfung der e-card-Nummer</li>
                  <li>✅ <strong>Status prüfen:</strong> Gültigkeit und Ablaufdatum der Karte</li>
                  <li>🏥 <strong>Versicherungsdaten:</strong> Automatische Aktualisierung der Versicherungsinformationen</li>
                  <li>🔗 <strong>ELGA-Integration:</strong> ELGA-ID und Status abrufen</li>
                  <li>🔄 <strong>Synchronisation:</strong> Manuelle Synchronisation mit ELGA</li>
                  <li>📋 <strong>Historie:</strong> Übersicht aller Validierungen</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Validierungsmethoden
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>ELGA-API:</strong> Offizielle Validierung über ELGA (empfohlen)</li>
                  <li><strong>Fallback:</strong> Lokale Validierung wenn ELGA-API nicht verfügbar</li>
                  <li><strong>Card Reader:</strong> Direkte Validierung über Kartenleser</li>
                  <li><strong>Manuell:</strong> Manuelle Eingabe der e-card-Nummer</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Vorteile
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Automatisierung:</strong> Keine manuelle Eingabe von Versicherungsdaten</li>
                  <li>✅ <strong>Korrektheit:</strong> Aktuelle und korrekte Versicherungsdaten</li>
                  <li>✅ <strong>ELGA-Verknüpfung:</strong> Automatische ELGA-ID-Zuordnung</li>
                  <li>✅ <strong>Zeitersparnis:</strong> Schnellere Patientenaufnahme</li>
                  <li>✅ <strong>Compliance:</strong> Einhaltung der gesetzlichen Anforderungen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  E-Card validieren
                </Typography>
                <Typography variant="body2" paragraph>
                  So validieren Sie eine e-card für einen Patienten:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt Anleitung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "E-Card validieren"</li>
                  <li>Wählen Sie einen Patienten aus der Liste aus</li>
                  <li>Geben Sie die e-card-Nummer ein (oder verwenden Sie einen Kartenleser)</li>
                  <li>Klicken Sie auf "Validieren"</li>
                  <li>Das System validiert die Karte über ELGA-API oder Fallback</li>
                  <li>Die Versicherungsdaten werden automatisch aktualisiert</li>
                  <li>Die ELGA-ID wird gespeichert (falls vorhanden)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  E-Card-Nummer Format
                </Typography>
                <Typography variant="body2" paragraph>
                  Die e-card-Nummer hat typischerweise:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>10-20 Ziffern</li>
                  <li>Nur Zahlen (keine Buchstaben oder Sonderzeichen)</li>
                  <li>Beispiel: <code>1234567890123456</code></li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Was passiert bei der Validierung?
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Überprüfung der e-card-Nummer auf Gültigkeit</li>
                  <li>✅ Abruf der Versicherungsdaten</li>
                  <li>✅ Überprüfung des Ablaufdatums</li>
                  <li>✅ Abruf der ELGA-ID (falls Patient in ELGA registriert)</li>
                  <li>✅ Aktualisierung der Patientendaten in MyMediCloud MMC</li>
                  <li>✅ Speicherung der Validierung in der Historie</li>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Hinweis:</strong> Wenn die ELGA-API nicht verfügbar ist, wird automatisch 
                  eine Fallback-Validierung durchgeführt, die nur das Format prüft.
                </Typography>
              </Alert>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Validierungsstatus
                </Typography>
                <Typography variant="body2" paragraph>
                  Die Validierung kann verschiedene Status haben:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Status-Arten
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>
                    <Chip label="valid" color="success" size="small" sx={{ mr: 1 }} />
                    <strong>Valid:</strong> Die e-card ist gültig und aktiv
                  </li>
                  <li>
                    <Chip label="invalid" color="error" size="small" sx={{ mr: 1 }} />
                    <strong>Invalid:</strong> Die e-card-Nummer ist ungültig oder nicht gefunden
                  </li>
                  <li>
                    <Chip label="expired" color="warning" size="small" sx={{ mr: 1 }} />
                    <strong>Expired:</strong> Die e-card ist abgelaufen
                  </li>
                  <li>
                    <Chip label="pending" color="default" size="small" sx={{ mr: 1 }} />
                    <strong>Pending:</strong> Die Validierung läuft noch
                  </li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Angezeigte Informationen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Patient:</strong> Name des Patienten</li>
                  <li><strong>E-Card Nummer:</strong> Die validierte e-card-Nummer</li>
                  <li><strong>Validierungsdatum:</strong> Wann die Validierung durchgeführt wurde</li>
                  <li><strong>Status:</strong> Aktueller Validierungsstatus</li>
                  <li><strong>Gültig von:</strong> Startdatum der Gültigkeit</li>
                  <li><strong>Gültig bis:</strong> Ablaufdatum der e-card</li>
                  <li><strong>Methode:</strong> Welche Validierungsmethode verwendet wurde</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Versicherungsdaten
                </Typography>
                <Typography variant="body2" paragraph>
                  Bei erfolgreicher Validierung werden folgende Daten abgerufen:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Versicherungsträger</li>
                  <li>Versicherungsnummer</li>
                  <li>Sozialversicherungsnummer</li>
                  <li>Vor- und Nachname</li>
                  <li>Geburtsdatum</li>
                  <li>Geschlecht</li>
                  <li>Adresse (falls verfügbar)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  ELGA-Daten
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>ELGA-ID:</strong> Eindeutige Identifikation in ELGA (falls registriert)</li>
                  <li><strong>ELGA-Status:</strong> active, inactive, not_registered</li>
                  <li><strong>Letzte Synchronisation:</strong> Wann die Daten zuletzt aktualisiert wurden</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Synchronisation mit ELGA
                </Typography>
                <Typography variant="body2" paragraph>
                  Die Synchronisation aktualisiert die ELGA-Daten eines Patienten und stellt sicher, 
                  dass die aktuellsten Informationen vorliegen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  So synchronisieren Sie
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Finden Sie den Patienten in der Validierungsliste</li>
                  <li>Klicken Sie auf "Sync" bei dem entsprechenden Eintrag</li>
                  <li>Das System ruft die aktuellen ELGA-Daten ab</li>
                  <li>Die ELGA-ID und der Status werden aktualisiert</li>
                  <li>Die Patientendaten werden mit den neuesten Informationen synchronisiert</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Was wird synchronisiert?
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ ELGA-ID (falls Patient neu in ELGA registriert)</li>
                  <li>✅ ELGA-Status (active, inactive, not_registered)</li>
                  <li>✅ Letzte Synchronisationszeit</li>
                  <li>✅ Versicherungsdaten (falls aktualisiert)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Wann synchronisieren?
                </Typography>
                <Typography variant="body2" paragraph>
                  Sie sollten synchronisieren:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Nach der ersten e-card-Validierung</li>
                  <li>Wenn Sie vermuten, dass sich ELGA-Daten geändert haben</li>
                  <li>Vor wichtigen ELGA-Operationen (z.B. Dokument hochladen)</li>
                  <li>Bei Problemen mit ELGA-Funktionen</li>
                </Box>
              </Box>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Wichtig:</strong> Die Synchronisation erfordert eine aktive Internetverbindung 
                  und Zugriff auf die ELGA-API. Bei Verbindungsproblemen wird ein Fehler angezeigt.
                </Typography>
              </Alert>
            </Box>
          )}

          {helpTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices & Tipps
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Validierung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Bei jedem Besuch validieren:</strong> Stellen Sie sicher, dass die e-card noch gültig ist</li>
                  <li>✅ <strong>Kartenleser verwenden:</strong> Reduziert Eingabefehler</li>
                  <li>✅ <strong>ELGA-API bevorzugen:</strong> Bietet vollständigste Validierung</li>
                  <li>✅ <strong>Fehler prüfen:</strong> Bei Fehlern die e-card-Nummer nochmals prüfen</li>
                  <li>❌ <strong>Abgelaufene Karten:</strong> Informieren Sie den Patienten über abgelaufene Karten</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Datenpflege
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Regelmäßig synchronisieren:</strong> Besonders bei neuen Patienten</li>
                  <li>✅ <strong>ELGA-Status prüfen:</strong> Stellen Sie sicher, dass Patienten in ELGA registriert sind</li>
                  <li>✅ <strong>Historie nutzen:</strong> Überprüfen Sie die Validierungshistorie bei Unklarheiten</li>
                  <li>✅ <strong>Fehler dokumentieren:</strong> Notieren Sie Probleme für Support-Anfragen</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Häufige Probleme
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>ELGA-API nicht verfügbar:</strong> System verwendet automatisch Fallback-Validierung</li>
                  <li><strong>Patient nicht in ELGA:</strong> Normale Validierung funktioniert, aber keine ELGA-ID</li>
                  <li><strong>Abgelaufene Karte:</strong> Patient muss neue e-card beantragen</li>
                  <li><strong>Falsche e-card-Nummer:</strong> Prüfen Sie die Eingabe oder verwenden Sie Kartenleser</li>
                </Box>
              </Box>

              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Tipp:</strong> Validieren Sie die e-card immer bei der ersten Patientenaufnahme 
                  und bei jedem Besuch, um sicherzustellen, dass die Versicherungsdaten aktuell sind.
                </Typography>
              </Alert>
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

export default ECardValidation;

