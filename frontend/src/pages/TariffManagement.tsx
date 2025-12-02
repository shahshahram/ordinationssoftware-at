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
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Download,
  Upload,
  Refresh,
  CheckCircle,
  Error,
  Warning,
  Info,
  GetApp,
  CloudDownload,
  CloudUpload,
  Schedule,
  History
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../utils/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Tariff {
  _id: string;
  code: string;
  name: string;
  description?: string;
  tariffType: 'goae' | 'kho' | 'et' | 'ebm' | 'custom';
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
    ebmCode: string;
    price: number;
    category: string;
  };
}

interface TariffInfo {
  ebm: { available: boolean; lastModified: Date | null; size: number | null };
  kho: { available: boolean; lastModified: Date | null; size: number | null };
  goae: { available: boolean; lastModified: Date | null; size: number | null };
}

const TariffManagement: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(false);
  const [tariffInfo, setTariffInfo] = useState<TariffInfo | null>(null);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: boolean }>({});
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'xml'>('xml');
  const [selectedTariffType, setSelectedTariffType] = useState<'ebm' | 'kho' | 'goae' | 'all'>('all');
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  useEffect(() => {
    loadTariffs();
    loadTariffInfo();
    checkForUpdates();
  }, [activeTab]);

  const loadTariffs = async () => {
    setLoading(true);
    try {
      const tariffType = activeTab === 0 ? 'goae' : activeTab === 1 ? 'kho' : null;
      const params = new URLSearchParams();
      if (tariffType) params.append('tariffType', tariffType);
      
      const response = await api.get<any>(`/tariffs?${params.toString()}`);
      if ((response.data as any)?.success) {
        setTariffs((response.data as any).data || []);
      }
    } catch (error: any) {
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

  const handleDownload = async (type: 'ebm' | 'kho' | 'goae' | 'all') => {
    setDownloadProgress({ [type]: true });
    try {
      const endpoint = type === 'all' ? '/ogk-tariff-download/all' : `/ogk-tariff-download/${type}`;
      const response = await api.post<any>(endpoint, { format: selectedFormat });
      
      if ((response.data as any)?.success) {
        enqueueSnackbar(`${type.toUpperCase()}-Tarifdatenbank erfolgreich heruntergeladen`, { variant: 'success' });
        loadTariffInfo();
      }
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Fehler beim Herunterladen', { variant: 'error' });
    } finally {
      setDownloadProgress({ [type]: false });
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
        enqueueSnackbar('Tarife erfolgreich importiert', { variant: 'success' });
        setImportDialogOpen(false);
        loadTariffs();
      }
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Fehler beim Importieren', { variant: 'error' });
    } finally {
      setDownloadProgress({ [type]: false });
    }
  };

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unbekannt';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tarifverwaltung</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              loadTariffs();
              loadTariffInfo();
              checkForUpdates();
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
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {tariffInfo.ebm.available ? (
                    <CheckCircle color="success" />
                  ) : (
                    <Error color="error" />
                  )}
                  <Typography variant="h6">EBM-Tarifdatenbank</Typography>
                </Box>
                {tariffInfo.ebm.available ? (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Letzte Änderung: {tariffInfo.ebm.lastModified 
                        ? format(new Date(tariffInfo.ebm.lastModified), 'dd.MM.yyyy HH:mm', { locale: de })
                        : 'Unbekannt'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Größe: {formatFileSize(tariffInfo.ebm.size)}
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
          <Grid size={{ xs: 12, md: 4 }}>
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
          <Grid size={{ xs: 12, md: 4 }}>
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
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
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
                      : tariff.kho?.price 
                      ? formatAmount(tariff.kho.price)
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
                <MenuItem value="all">Alle (EBM, KHO, GOÄ)</MenuItem>
                <MenuItem value="ebm">EBM (Einheitlicher Bewertungsmaßstab)</MenuItem>
                <MenuItem value="kho">KHO (Kassenhonorarordnung)</MenuItem>
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
              inputProps={{ accept: '.csv,.json' }}
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                const file = target.files?.[0];
                if (file) {
                  handleFileImport(file, selectedTariffType === 'all' ? 'goae' : selectedTariffType as 'goae' | 'kho');
                }
              }}
              helperText="CSV oder JSON-Datei auswählen"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TariffManagement;

