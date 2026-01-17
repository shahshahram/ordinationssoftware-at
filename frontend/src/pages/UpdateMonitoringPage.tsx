import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Pagination,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
  Dialog,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  ExpandMore,
  ExpandLess,
  Refresh,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import UpdateMonitoring from '../components/UpdateMonitoring';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import GradientDialogTitle from '../components/GradientDialogTitle';

interface UpdateHistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  updateType: string;
  description: string;
  status: 'success' | 'error';
  errorMessage?: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
  details: {
    newServices?: number;
    updatedServices?: number;
    deprecatedServices?: number;
    updatedPrices?: number;
    newCategories?: number;
    errors?: string[];
    warnings?: string[];
    filesDownloaded?: string[];
    recordsProcessed?: number;
    recordsUpdated?: number;
    recordsCreated?: number;
  };
}

const UpdateMonitoringPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [history, setHistory] = useState<UpdateHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (actionFilter !== 'all') {
        params.action = actionFilter;
      }
      
      const response = await api.get<any>('/update-monitoring/history', { params });
      if (response.success && response.data) {
        // response.data enthält das gesamte JSON-Objekt vom Server
        // Das hat die Struktur: { success: true, data: [...], pagination: {...} }
        const serverResponse = response.data;
        if (serverResponse.data && Array.isArray(serverResponse.data)) {
          setHistory(serverResponse.data);
        }
        if (serverResponse.pagination) {
          setTotalPages(serverResponse.pagination.pages);
        }
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der Update-Historie:', error);
      enqueueSnackbar('Fehler beim Laden der Update-Historie', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 1) {
      loadHistory();
    }
  }, [activeTab, page, actionFilter]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRowExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    return status === 'success' ? (
      <CheckCircle color="success" fontSize="small" />
    ) : (
      <ErrorIcon color="error" fontSize="small" />
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, 'dd.MM.yyyy HH:mm:ss', { locale: de });
  };

  const formatTimestampRelative = (timestamp: string) => {
    const date = new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true, locale: de });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
            Update-Monitoring
          </Typography>
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
        <Typography variant="body1" color="text.secondary" paragraph>
          Überwachung und Verwaltung aller automatischen Update-Services für Kataloge und Downloads.
          Hier können Sie den Status aller Update-Prozesse einsehen und manuelle Updates auslösen.
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Status & Übersicht" />
          <Tab label="Update-Protokoll" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <UpdateMonitoring refreshInterval={30000} />
          )}

          {activeTab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Update-Typ filtern</InputLabel>
                  <Select
                    value={actionFilter}
                    label="Update-Typ filtern"
                    onChange={(e) => {
                      setActionFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <MenuItem value="all">Alle Updates</MenuItem>
                    <MenuItem value="SERVICE_CATALOG_ANNUAL_UPDATE">Jährliches Service-Katalog Update</MenuItem>
                    <MenuItem value="SERVICE_CATALOG_UPDATE">Service-Katalog Update</MenuItem>
                    <MenuItem value="SERVICE_CATALOG_PRICE_UPDATE">Preis-Update</MenuItem>
                    <MenuItem value="TARIFF_UPDATE">Tarif-Update</MenuItem>
                    <MenuItem value="TARIFF_DOWNLOAD">Tarif-Download</MenuItem>
                    <MenuItem value="EBM_UPDATE">EBM-Update</MenuItem>
                    <MenuItem value="KHO_UPDATE">KHO-Update</MenuItem>
                    <MenuItem value="GOAE_UPDATE">GOÄ-Update</MenuItem>
                  </Select>
                </FormControl>
                <IconButton onClick={loadHistory} disabled={loading}>
                  <Refresh />
                </IconButton>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : history.length === 0 ? (
                <Alert severity="info">Keine Update-Einträge gefunden</Alert>
              ) : (
                <>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 50 }}></TableCell>
                          <TableCell>Zeitpunkt</TableCell>
                          <TableCell>Update-Typ</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Benutzer</TableCell>
                          <TableCell>Details</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {history.map((entry) => {
                          const isExpanded = expandedRows.has(entry.id);
                          const hasDetails = entry.details.newServices || 
                                           entry.details.updatedServices || 
                                           entry.details.deprecatedServices ||
                                           entry.details.updatedPrices ||
                                           entry.details.newCategories ||
                                           entry.details.recordsProcessed ||
                                           entry.details.errors?.length ||
                                           entry.details.warnings?.length;

                          return (
                            <React.Fragment key={entry.id}>
                              <TableRow hover>
                                <TableCell>
                                  {hasDetails && (
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRowExpand(entry.id)}
                                    >
                                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                    </IconButton>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {formatTimestamp(entry.timestamp)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatTimestampRelative(entry.timestamp)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium">
                                    {entry.updateType}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    icon={getStatusIcon(entry.status)}
                                    label={entry.status === 'success' ? 'Erfolgreich' : 'Fehler'}
                                    color={entry.status === 'success' ? 'success' : 'error'}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {entry.user.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {entry.user.role}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {entry.description || '-'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                              {isExpanded && hasDetails && (
                                <TableRow>
                                  <TableCell colSpan={6} sx={{ py: 2, bgcolor: 'action.hover' }}>
                                    <Box sx={{ pl: 4 }}>
                                      <Stack spacing={1}>
                                        {entry.details.newServices !== undefined && entry.details.newServices > 0 && (
                                          <Typography variant="body2">
                                            <strong>Neue Services:</strong> {entry.details.newServices}
                                          </Typography>
                                        )}
                                        {entry.details.updatedServices !== undefined && entry.details.updatedServices > 0 && (
                                          <Typography variant="body2">
                                            <strong>Aktualisierte Services:</strong> {entry.details.updatedServices}
                                          </Typography>
                                        )}
                                        {entry.details.deprecatedServices !== undefined && entry.details.deprecatedServices > 0 && (
                                          <Typography variant="body2">
                                            <strong>Veraltete Services:</strong> {entry.details.deprecatedServices}
                                          </Typography>
                                        )}
                                        {entry.details.updatedPrices !== undefined && entry.details.updatedPrices > 0 && (
                                          <Typography variant="body2">
                                            <strong>Preis-Updates:</strong> {entry.details.updatedPrices}
                                          </Typography>
                                        )}
                                        {entry.details.newCategories !== undefined && entry.details.newCategories > 0 && (
                                          <Typography variant="body2">
                                            <strong>Neue Kategorien:</strong> {entry.details.newCategories}
                                          </Typography>
                                        )}
                                        {entry.details.recordsProcessed !== undefined && entry.details.recordsProcessed > 0 && (
                                          <Typography variant="body2">
                                            <strong>Verarbeitete Datensätze:</strong> {entry.details.recordsProcessed}
                                          </Typography>
                                        )}
                                        {entry.details.recordsUpdated !== undefined && entry.details.recordsUpdated > 0 && (
                                          <Typography variant="body2">
                                            <strong>Aktualisierte Datensätze:</strong> {entry.details.recordsUpdated}
                                          </Typography>
                                        )}
                                        {entry.details.recordsCreated !== undefined && entry.details.recordsCreated > 0 && (
                                          <Typography variant="body2">
                                            <strong>Erstellte Datensätze:</strong> {entry.details.recordsCreated}
                                          </Typography>
                                        )}
                                        {entry.details.filesDownloaded && entry.details.filesDownloaded.length > 0 && (
                                          <Box>
                                            <Typography variant="body2" fontWeight="medium" gutterBottom>
                                              Heruntergeladene Dateien:
                                            </Typography>
                                            {entry.details.filesDownloaded.map((file, idx) => (
                                              <Typography key={idx} variant="caption" display="block" color="text.secondary">
                                                • {file}
                                              </Typography>
                                            ))}
                                          </Box>
                                        )}
                                        {entry.details.errors && entry.details.errors.length > 0 && (
                                          <Box>
                                            <Typography variant="body2" fontWeight="medium" color="error" gutterBottom>
                                              Fehler:
                                            </Typography>
                                            {entry.details.errors.map((error, idx) => (
                                              <Typography key={idx} variant="caption" display="block" color="error">
                                                • {error}
                                              </Typography>
                                            ))}
                                          </Box>
                                        )}
                                        {entry.details.warnings && entry.details.warnings.length > 0 && (
                                          <Box>
                                            <Typography variant="body2" fontWeight="medium" color="warning.main" gutterBottom>
                                              Warnungen:
                                            </Typography>
                                            {entry.details.warnings.map((warning, idx) => (
                                              <Typography key={idx} variant="caption" display="block" color="warning.main">
                                                • {warning}
                                              </Typography>
                                            ))}
                                          </Box>
                                        )}
                                        {entry.errorMessage && (
                                          <Alert severity="error" sx={{ mt: 1 }}>
                                            {entry.errorMessage}
                                          </Alert>
                                        )}
                                      </Stack>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_event, value) => setPage(value)}
                        color="primary"
                      />
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </Box>
      </Paper>

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
          title="Hilfe & Leitfaden: Update-Monitoring"
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
            <Tab label="Update-Status" />
            <Tab label="Update-Historie" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Update-Monitoring
                </Typography>
                <Typography variant="body1" paragraph>
                  Das Update-Monitoring ermöglicht es, automatische Update-Services für Kataloge 
                  und Downloads zu überwachen und zu verwalten.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📊 <strong>Status überwachen:</strong> Status aller Update-Services anzeigen</li>
                  <li>🔄 <strong>Updates auslösen:</strong> Manuelle Updates starten</li>
                  <li>📋 <strong>Historie:</strong> Update-Historie einsehen</li>
                  <li>⚙️ <strong>Konfiguration:</strong> Update-Einstellungen verwalten</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Update-Status
                </Typography>
                <Typography variant="body2" paragraph>
                  Der Update-Status zeigt den aktuellen Zustand aller Update-Services:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Status-Anzeigen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Erfolgreich:</strong> Update erfolgreich abgeschlossen</li>
                  <li>❌ <strong>Fehler:</strong> Update fehlgeschlagen</li>
                  <li>⏳ <strong>Laufend:</strong> Update wird gerade ausgeführt</li>
                  <li>⏸️ <strong>Pausiert:</strong> Update ist pausiert</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Update-Historie
                </Typography>
                <Typography variant="body2" paragraph>
                  Die Update-Historie zeigt alle durchgeführten Updates:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Informationen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📅 <strong>Zeitstempel:</strong> Wann wurde das Update durchgeführt</li>
                  <li>📝 <strong>Aktion:</strong> Welche Aktion wurde ausgeführt</li>
                  <li>📊 <strong>Details:</strong> Detaillierte Informationen zum Update</li>
                  <li>👤 <strong>Benutzer:</strong> Wer hat das Update ausgelöst</li>
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
                  Update-Verwaltung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Prüfen Sie den Status regelmäßig</li>
                  <li>✅ Überwachen Sie fehlgeschlagene Updates</li>
                  <li>✅ Dokumentieren Sie manuelle Updates</li>
                  <li>✅ Planen Sie Updates außerhalb der Geschäftszeiten</li>
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
    </Container>
  );
};

export default UpdateMonitoringPage;

