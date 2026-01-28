// Tarifverwaltung Seite mit ÖGK-Download

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import {
  Upload,
  Refresh,
  CheckCircle,
  Error,
  CloudDownload,
  HelpOutline as HelpOutlineIcon,
  Delete,
  Warning,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../utils/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';
import GradientDialogTitle from '../components/GradientDialogTitle';

interface Tariff {
  _id: string;
  code: string;
  name: string;
  description?: string;
  tariffType: 'goae' | 'kho' | 'et' | 'custom';
  specialty: string;
  isActive: boolean;
  validFrom: string;
  validUntil?: string;
  goae?: {
    section: string;
    number: string;
    basePrice: number;
    multiplier: number;
  };
  kho?: {
    khoCode?: string;
    khoPrice?: number;
    price?: number;
    category?: string;
  };
}

interface TariffInfo {
  kho: { available: boolean; lastModified: Date | null; size: number | null };
  goae: { available: boolean; lastModified: Date | null; size: number | null };
  /** @deprecated API kann ebm noch liefern – wird in der UI nicht mehr angezeigt */
  ebm?: { available: boolean; lastModified: Date | null; size: number | null };
}

const TariffManagement: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { marginTopValue } = useGlobalNavigationOffset();
  const [activeTab, setActiveTab] = useState(0);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(false);
  const [tariffInfo, setTariffInfo] = useState<TariffInfo | null>(null);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: boolean }>({});
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'xml'>('csv'); // CSV als Standard, da ÖGK-URLs oft PDF statt XML zurückgeben
  const [selectedTariffType, setSelectedTariffType] = useState<'kho' | 'goae' | 'all'>('all');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [khoCount, setKhoCount] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  // Lade KHO-Count auch beim initialen Mount
  useEffect(() => {
    loadKhoCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log(`[TariffManagement] activeTab geändert zu: ${activeTab}`);
    loadTariffs();
    loadTariffInfo();
    checkForUpdates();
    loadKhoCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadKhoCount = async () => {
    try {
      const response = await api.get<{ success: boolean; count: number }>('/tariffs/kho/count');
      console.log('[KHO Count] API Response:', response.data);
      if (response.data.success) {
        setKhoCount(response.data.count);
        console.log('[KHO Count] Set to:', response.data.count);
      } else {
        console.warn('[KHO Count] API returned success: false');
        setKhoCount(0);
      }
    } catch (error) {
      console.error('Fehler beim Laden der KHO-Tarif-Anzahl:', error);
      setKhoCount(0); // Setze auf 0 bei Fehler, damit Button nicht erscheint
    }
  };

  const handleClearKhoTariffs = async () => {
    if (confirmText !== 'DELETE_ALL_KHO_TARIFFS') {
      enqueueSnackbar('Bitte geben Sie die Bestätigung exakt ein', { variant: 'error' });
      return;
    }

    setClearing(true);
    try {
      // Sende Bestätigung als Query-Parameter statt Body (um CORS-Probleme zu vermeiden)
      const response = await api.delete<{ success: boolean; deleted: number; message: string }>(`/tariffs/kho/clear?confirm=${encodeURIComponent(confirmText)}`);

      if (response.data.success) {
        enqueueSnackbar(`${response.data.deleted} KHO-Tarife erfolgreich gelöscht`, { variant: 'success' });
        setClearDialogOpen(false);
        setConfirmText('');
        loadTariffs();
        loadKhoCount();
      }
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Fehler beim Löschen der KHO-Tarife', { variant: 'error' });
    } finally {
      setClearing(false);
    }
  };

  const loadTariffs = async () => {
    setLoading(true);
    try {
      // Tab 0 = GOÄ, Tab 1 = KHO, Tab 2 = Alle
      const tariffType = activeTab === 0 ? 'goae' : activeTab === 1 ? 'kho' : null;
      console.log(`[TariffManagement] activeTab: ${activeTab}, tariffType: ${tariffType}`);
      const params = new URLSearchParams();
      if (tariffType) params.append('tariffType', tariffType);
      params.append('limit', '1000'); // Erhöhtes Limit, um alle Tarife zu laden
      params.append('page', '1');
      
      const url = `/tariffs?${params.toString()}`;
      console.log(`[TariffManagement] Lade Tarife von: ${url}`);
      const response = await api.get<any>(url);
      console.log(`[TariffManagement] API-Antwort vollständig:`, JSON.stringify(response.data, null, 2));
      if ((response.data as any)?.success) {
        const loadedTariffs = (response.data as any).data || [];
        console.log(`[TariffManagement] ${loadedTariffs.length} Tarife geladen (Typ: ${tariffType || 'alle'})`);
        if (loadedTariffs.length > 0) {
          console.log(`[TariffManagement] Erster Tarif:`, {
            code: loadedTariffs[0].code,
            name: loadedTariffs[0].name,
            tariffType: loadedTariffs[0].tariffType,
            isActive: loadedTariffs[0].isActive,
            khoPrice: loadedTariffs[0].kho?.khoPrice,
            price: loadedTariffs[0].kho?.price
          });
        } else {
          console.warn(`[TariffManagement] ⚠️ Keine Tarife gefunden für Typ: ${tariffType || 'alle'}`);
          console.warn(`[TariffManagement] Bitte auf Tab "KHO/ET-Tarife" klicken, um die importierten Tarife zu sehen!`);
        }
        setTariffs(loadedTariffs);
      } else {
        console.error('[TariffManagement] API-Antwort ohne success:', response.data);
        setTariffs([]);
      }
    } catch (error: any) {
      console.error('[TariffManagement] Fehler beim Laden der Tarife:', error);
      enqueueSnackbar('Fehler beim Laden der Tarife', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadTariffInfo = async () => {
    try {
      const response = await api.get<any>('/ogk-tariff-download/info');
      if ((response.data as any)?.success) {
        setTariffInfo((response.data as any).data);
      }
    } catch (error) {
      console.error('Error loading tariff info:', error);
    }
  };

  const checkForUpdates = async () => {
    try {
      const response = await api.get<any>('/ogk-tariff-download/check-updates');
      if ((response.data as any)?.success) {
        setUpdateInfo((response.data as any).data);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };


  const handleDownloadAndImport = async () => {
    setDownloadProgress({ [selectedTariffType]: true });
    try {
      const endpoint = selectedTariffType === 'all' 
        ? '/ogk-tariff-download/all/import' 
        : `/ogk-tariff-download/${selectedTariffType}/import`;
      
      const response = await api.post<any>(endpoint, { format: selectedFormat });
      
      if ((response.data as any)?.success) {
        enqueueSnackbar('Tarifdatenbank erfolgreich heruntergeladen und importiert', { variant: 'success' });
        setDownloadDialogOpen(false);
        loadTariffs();
        loadTariffInfo();
        checkForUpdates();
      }
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Fehler beim Download und Import', { variant: 'error' });
    } finally {
      setDownloadProgress({ [selectedTariffType]: false });
    }
  };

  const handleFileImport = async (file: File, type: 'goae' | 'kho') => {
    setDownloadProgress({ [type]: true });
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const endpoint = type === 'goae' ? '/tariff-import/goae' : '/tariff-import/kho';
      // Für FormData wird Content-Type automatisch gesetzt, daher keine headers nötig
      const response = await api.post<any>(endpoint, formData);
      
      if ((response.data as any)?.success) {
        const fileType = file.name.endsWith('.pdf') ? 'PDF' : file.name.endsWith('.csv') ? 'CSV' : 'JSON';
        enqueueSnackbar(`Tarife erfolgreich aus ${fileType} importiert`, { variant: 'success' });
        setImportDialogOpen(false);
        loadTariffs();
      }
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Fehler beim Importieren', { variant: 'error' });
    } finally {
      setDownloadProgress({ [type]: false });
    }
  };

  // Helper-Funktion: Konvertiert Wert zu Euro (automatische Erkennung)
  // Wenn Wert > 100000, wird angenommen, dass es in Cent ist (alte Daten)
  // Normale Preise in Euro sind meist < 100000
  const toEuro = (value: number | undefined | null): number => {
    if (!value && value !== 0) return 0;
    // Wenn Wert sehr groß ist (> 100000), ist es wahrscheinlich in Cent (alte Daten)
    return value > 100000 ? value / 100 : value;
  };

  const formatAmount = (amount: number) => {
    return toEuro(amount).toFixed(2).replace('.', ',') + ' €';
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unbekannt';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Box sx={{ 
      p: 3,
      mt: marginTopValue !== '0px' ? marginTopValue : 0,
      transition: marginTopValue !== '0px' ? 'margin-top 0.3s ease' : 'none',
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">Tarifverwaltung</Typography>
          <Tooltip title="Hilfe & Leitfaden">
            <IconButton
              onClick={() => setHelpDialogOpen(true)}
              color="primary"
              size="small"
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              loadTariffs();
              loadTariffInfo();
              checkForUpdates();
              loadKhoCount();
            }}
          >
            Aktualisieren
          </Button>
          <Button
            variant="contained"
            startIcon={<CloudDownload />}
            onClick={() => setDownloadDialogOpen(true)}
          >
            Von ÖGK herunterladen
          </Button>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={() => setImportDialogOpen(true)}
          >
            Datei importieren
          </Button>
          {activeTab === 1 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => {
                setClearDialogOpen(true);
                setConfirmText('');
                // Lade aktuelle Anzahl beim Öffnen des Dialogs
                loadKhoCount();
              }}
              disabled={khoCount === null || khoCount === 0}
            >
              KHO-Tarife löschen {khoCount !== null ? `(${khoCount})` : ''}
            </Button>
          )}
        </Box>
      </Box>

      {/* Update-Informationen */}
      {updateInfo && (
        <Alert 
          severity={updateInfo.hasUpdate ? 'info' : 'success'} 
          sx={{ mb: 3 }}
          action={
            updateInfo.hasUpdate && (
              <Button
                size="small"
                onClick={() => handleDownloadAndImport()}
                disabled={downloadProgress[selectedTariffType]}
              >
                Jetzt aktualisieren
              </Button>
            )
          }
        >
          {updateInfo.hasUpdate ? (
            <>
              <strong>Update verfügbar!</strong> Neue Tarifdatenbank verfügbar seit{' '}
              {updateInfo.lastModified 
                ? format(new Date(updateInfo.lastModified), 'dd.MM.yyyy', { locale: de })
                : 'unbekannt'}
            </>
          ) : (
            'Tarifdatenbank ist aktuell'
          )}
        </Alert>
      )}

      {/* Tarif-Informationen */}
      {tariffInfo && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {tariffInfo.kho.available ? (
                    <CheckCircle color="success" />
                  ) : (
                    <Error color="error" />
                  )}
                  <Typography variant="h6">KHO-Tarifdatenbank</Typography>
                </Box>
                {tariffInfo.kho.available ? (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Letzte Änderung: {tariffInfo.kho.lastModified 
                        ? format(new Date(tariffInfo.kho.lastModified), 'dd.MM.yyyy HH:mm', { locale: de })
                        : 'Unbekannt'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Größe: {formatFileSize(tariffInfo.kho.size)}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="error">
                    Nicht verfügbar
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {tariffInfo.goae.available ? (
                    <CheckCircle color="success" />
                  ) : (
                    <Error color="error" />
                  )}
                  <Typography variant="h6">GOÄ-Tarifdatenbank</Typography>
                </Box>
                {tariffInfo.goae.available ? (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Letzte Änderung: {tariffInfo.goae.lastModified 
                        ? format(new Date(tariffInfo.goae.lastModified), 'dd.MM.yyyy HH:mm', { locale: de })
                        : 'Unbekannt'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Größe: {formatFileSize(tariffInfo.goae.size)}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="error">
                    Nicht verfügbar
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs für verschiedene Tariftypen */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => {
          console.log(`[TariffManagement] Tab geändert von ${activeTab} zu ${newValue}`);
          setActiveTab(newValue);
        }}>
          <Tab label="GOÄ-Tarife" />
          <Tab label="KHO/ET-Tarife" />
          <Tab label="Alle Tarife" />
        </Tabs>
      </Paper>

      {/* Tarif-Tabelle */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Typ</TableCell>
              <TableCell>Fachrichtung</TableCell>
              <TableCell>Preis</TableCell>
              <TableCell>Gültig von</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : tariffs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography>Keine Tarife gefunden</Typography>
                </TableCell>
              </TableRow>
            ) : (
              tariffs.map((tariff) => (
                <TableRow key={tariff._id} hover>
                  <TableCell>{tariff.code}</TableCell>
                  <TableCell>{tariff.name}</TableCell>
                  <TableCell>
                    <Chip label={tariff.tariffType.toUpperCase()} size="small" />
                  </TableCell>
                  <TableCell>{tariff.specialty}</TableCell>
                  <TableCell>
                    {tariff.goae?.basePrice 
                      ? formatAmount(tariff.goae.basePrice * (tariff.goae.multiplier || 1))
                      : (tariff.kho?.khoPrice !== undefined || tariff.kho?.price !== undefined)
                      ? formatAmount((tariff.kho?.khoPrice ?? tariff.kho?.price ?? 0))
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(tariff.validFrom), 'dd.MM.yyyy', { locale: de })}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tariff.isActive ? 'Aktiv' : 'Inaktiv'}
                      color={tariff.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Download-Dialog */}
      <Dialog
        open={downloadDialogOpen}
        onClose={() => setDownloadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Tarifdatenbank von ÖGK herunterladen</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Tariftyp</InputLabel>
              <Select
                value={selectedTariffType}
                onChange={(e) => setSelectedTariffType(e.target.value as any)}
                label="Tariftyp"
              >
                <MenuItem value="all">Alle (KHO, GOÄ)</MenuItem>
                <MenuItem value="kho">KHO (Kassenhonorarordnung, Österreich)</MenuItem>
                <MenuItem value="goae">GOÄ (Gebührenordnung für Ärzte)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as any)}
                label="Format"
              >
                <MenuItem value="xml">XML (TASY-Export)</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
              </Select>
            </FormControl>

            <Alert severity="info">
              Die Tarifdatenbank wird von der ÖGK heruntergeladen und automatisch in das System importiert.
              <br />
              <strong>Update-Häufigkeit:</strong> Die ÖGK aktualisiert die Tarifdatenbanken regelmäßig (meist monatlich oder bei Tarifänderungen).
              Es wird empfohlen, mindestens monatlich auf Updates zu prüfen.
            </Alert>

            {downloadProgress[selectedTariffType] && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                  Download läuft...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDownloadDialogOpen(false)}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={handleDownloadAndImport}
            disabled={downloadProgress[selectedTariffType]}
            startIcon={<CloudDownload />}
          >
            Herunterladen und importieren
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import-Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Tarife aus Datei importieren</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Tariftyp</InputLabel>
              <Select
                value={selectedTariffType === 'all' ? 'goae' : selectedTariffType}
                onChange={(e) => setSelectedTariffType(e.target.value as any)}
                label="Tariftyp"
              >
                <MenuItem value="goae">GOÄ</MenuItem>
                <MenuItem value="kho">KHO/ET</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="file"
              inputProps={{ accept: '.csv,.json,.pdf' }}
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                const file = target.files?.[0];
                if (file) {
                  handleFileImport(file, selectedTariffType === 'all' ? 'goae' : selectedTariffType as 'goae' | 'kho');
                }
              }}
              helperText="CSV, JSON oder PDF-Datei auswählen"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* KHO-Tarife löschen Dialog */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => {
          setClearDialogOpen(false);
          setConfirmText('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <GradientDialogTitle
          title="KHO-Tarife löschen"
          onClose={() => {
            setClearDialogOpen(false);
            setConfirmText('');
          }}
        />
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Achtung: Diese Aktion kann nicht rückgängig gemacht werden!
            </Typography>
            <Typography variant="body2">
              Alle KHO/ET-Tarife werden dauerhaft aus der Datenbank gelöscht.
              {khoCount !== null && (
                <> <strong>{khoCount} Tarife</strong> werden gelöscht.</>
              )}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              GOÄ-Tarife werden <strong>nicht</strong> gelöscht.
            </Typography>
          </Alert>
          <Typography variant="body2" gutterBottom>
            Um fortzufahren, geben Sie bitte folgendes Bestätigungswort ein:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', mb: 2, color: 'error.main' }}>
            DELETE_ALL_KHO_TARIFFS
          </Typography>
          <TextField
            fullWidth
            label="Bestätigung"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE_ALL_KHO_TARIFFS"
            error={confirmText !== '' && confirmText !== 'DELETE_ALL_KHO_TARIFFS'}
            helperText={confirmText !== '' && confirmText !== 'DELETE_ALL_KHO_TARIFFS' ? 'Bitte geben Sie das Bestätigungswort exakt ein' : ''}
            disabled={clearing}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setClearDialogOpen(false);
              setConfirmText('');
            }}
            disabled={clearing}
          >
            Abbrechen
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<Delete />}
            onClick={handleClearKhoTariffs}
            disabled={confirmText !== 'DELETE_ALL_KHO_TARIFFS' || clearing}
          >
            {clearing ? 'Löschen...' : 'Alle KHO-Tarife löschen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hilfe & Leitfaden Dialog */}
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
          title="Hilfe & Leitfaden: Tarifverwaltung"
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs 
            value={helpTab} 
            onChange={(_, v) => setHelpTab(v)} 
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Übersicht" />
            <Tab label="Tarife verwalten" />
            <Tab label="Import & Export" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Tarifverwaltung
                </Typography>
                <Typography variant="body1" paragraph>
                  Die Tarifverwaltung ermöglicht es, Tarife zu verwalten, zu importieren und zu exportieren.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📋 <strong>Tarife verwalten:</strong> KHO (Österreich), GOÄ Tarife verwalten</li>
                  <li>📥 <strong>Import:</strong> Tarife aus Dateien importieren</li>
                  <li>📤 <strong>Export:</strong> Tarife exportieren</li>
                  <li>🔄 <strong>Updates:</strong> Tarife aktualisieren</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Tarife verwalten
                </Typography>
                <Typography variant="body2" paragraph>
                  So verwalten Sie Tarife:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt Anleitung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wählen Sie den Tariftyp (KHO, GOÄ)</li>
                  <li>Durchsuchen Sie die Tarifliste</li>
                  <li>Bearbeiten Sie Tarife nach Bedarf</li>
                  <li>Speichern Sie Änderungen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Import & Export
                </Typography>
                <Typography variant="body2" paragraph>
                  So importieren und exportieren Sie Tarife:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Verfügbare Formate
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📄 <strong>CSV:</strong> Komma-separierte Werte</li>
                  <li>📋 <strong>JSON:</strong> JavaScript Object Notation</li>
                  <li>📑 <strong>PDF:</strong> Portable Document Format</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Tarifverwaltung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Halten Sie Tarife aktuell</li>
                  <li>✅ Prüfen Sie Importe vor dem Speichern</li>
                  <li>✅ Dokumentieren Sie Änderungen</li>
                  <li>✅ Sichern Sie Tarifdaten regelmäßig</li>
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

export default TariffManagement;

