// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Euro as EuroIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import api from '../utils/api';
import OneClickBillingButton from './OneClickBillingButton';
import PerformanceForm from './PerformanceForm';
import GradientDialogTitle from './GradientDialogTitle';

interface Performance {
  _id: string;
  serviceCode: string;
  serviceDescription: string;
  serviceDatetime: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  tariffType: 'kassa' | 'wahl' | 'privat';
  status: 'recorded' | 'billed' | 'sent' | 'accepted' | 'rejected' | 'refunded' | 'failed';
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    socialSecurityNumber?: string;
    insuranceProvider?: string;
  } | null;
  doctorId: {
    _id: string;
    firstName: string;
    lastName: string;
    contractType?: string;
  };
  appointmentId?: {
    _id: string;
    startTime: string;
    endTime: string;
    type: string;
  };
  billingData?: {
    kassaRef?: string;
    insuranceRef?: string;
    invoiceNumber?: string;
    paymentStatus?: string;
  };
  notes?: string;
  diagnosisCodes?: string[];
  medicationCodes?: string[];
  createdAt: string;
  updatedAt: string;
}

const PerformanceList: React.FC = () => {
  const _dispatch = useDispatch();
  const { user: _user } = useSelector((state: any) => state.auth);
  
  // State
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPerformance, setEditingPerformance] = useState<Performance | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [performanceToDelete, setPerformanceToDelete] = useState<Performance | null>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  
  // Filter State
  const [filters, setFilters] = useState({
    status: '',
    tariffType: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  
  // Pagination State
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  // Performances laden – nutzt zentralen ApiClient (gleiche Basis-URL wie Auth)
  const loadPerformances = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page: pagination?.page || 1,
        limit: pagination?.limit || 50
      };
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== '') params[k] = v;
      });
      const response = await api.get<{ data: Performance[]; pagination?: typeof pagination }>(
        '/billing/performances',
        params
      );
      const result = response.data as { data?: Performance[]; pagination?: typeof pagination };
      if (result?.data && result.data.length > 0) {
        console.log('First performance from API:', result.data[0]);
        console.log('First performance patientId:', result.data[0].patientId);
      }
      setPerformances(result?.data || []);
      if (result?.pagination) {
        setPagination((prev) => ({ ...prev, ...result.pagination }));
      }
    } catch (error: any) {
      console.error('Leistungen laden Fehler:', error);
      setError(error?.response?.data?.message || error?.message || 'Leistungen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  // Load performances when pagination or filters change
  useEffect(() => {
    loadPerformances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, filters.status, filters.tariffType, filters.startDate, filters.endDate, filters.search]);

  // Performance erstellen/bearbeiten
  const handleSavePerformance = async (performanceData: any) => {
    try {
      const token = localStorage.getItem('token');
      const url = editingPerformance 
        ? `${getApiBaseUrl()}/billing/performances/${editingPerformance._id}`
        : `${getApiBaseUrl()}/billing/performances`;
      
      const method = editingPerformance ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'x-auth-token': token || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(performanceData)
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Backend error response:', result);
        console.error('Request body:', performanceData);
        throw new Error(result.message || result.error || 'Leistung konnte nicht gespeichert werden');
      }

      // Liste aktualisieren
      await loadPerformances();
      
      // Dialog schließen
      setFormOpen(false);
      setEditingPerformance(null);
      
    } catch (error: any) {
      console.error('Leistung speichern Fehler:', error);
      setError(error.message);
    }
  };

  // Performance löschen
  const handleDeletePerformance = async () => {
    if (!performanceToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `${getApiBaseUrl()}/billing/performances/${performanceToDelete._id}`,
        {
          method: 'DELETE',
          headers: {
            'x-auth-token': token || ''
          }
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Leistung konnte nicht gelöscht werden');
      }

      // Liste aktualisieren
      await loadPerformances();
      
      // Dialog schließen
      setDeleteDialogOpen(false);
      setPerformanceToDelete(null);
      
    } catch (error: any) {
      console.error('Leistung löschen Fehler:', error);
      setError(error.message);
    }
  };

  // Performance bearbeiten
  const handleEditPerformance = (performance: Performance) => {
    setEditingPerformance(performance);
    setFormOpen(true);
  };

  // Performance löschen bestätigen
  const handleDeleteClick = (performance: Performance) => {
    setPerformanceToDelete(performance);
    setDeleteDialogOpen(true);
  };

  // Status-Chip
  const getStatusChip = (status: string) => {
    const statusConfig = {
      recorded: { label: 'Erfasst', color: 'default' as const },
      billed: { label: 'Abgerechnet', color: 'info' as const },
      sent: { label: 'Gesendet', color: 'warning' as const },
      accepted: { label: 'Akzeptiert', color: 'success' as const },
      rejected: { label: 'Abgelehnt', color: 'error' as const },
      refunded: { label: 'Erstattet', color: 'success' as const },
      failed: { label: 'Fehlgeschlagen', color: 'error' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.recorded;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  // Tariftyp-Chip
  const getTariffTypeChip = (tariffType: string) => {
    const tariffConfig = {
      kassa: { label: 'Kassenarzt', color: 'primary' as const },
      wahl: { label: 'Wahlarzt', color: 'secondary' as const },
      privat: { label: 'Privat', color: 'success' as const }
    };
    
    const config = tariffConfig[tariffType as keyof typeof tariffConfig] || tariffConfig.privat;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  // Filter ändern
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPagination(prev => ({
      ...prev,
      page: 1 // Zurück zur ersten Seite bei Filteränderung
    }));
  };

  // Filter zurücksetzen
  const handleResetFilters = () => {
    setFilters({
      status: '',
      tariffType: '',
      startDate: '',
      endDate: '',
      search: ''
    });
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  if (loading && performances.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" component="h1">
            Leistungsabrechnung
          </Typography>
          <Tooltip title="Hilfe & Leitfaden">
            <IconButton
              onClick={() => setHelpDialogOpen(true)}
              color="primary"
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setFormOpen(true)}
        >
          Neue Leistung
        </Button>
      </Box>

      {/* Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterIcon />
            <Typography variant="h6">Filter</Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="">Alle</MenuItem>
                  <MenuItem value="recorded">Erfasst</MenuItem>
                  <MenuItem value="billed">Abgerechnet</MenuItem>
                  <MenuItem value="sent">Gesendet</MenuItem>
                  <MenuItem value="accepted">Akzeptiert</MenuItem>
                  <MenuItem value="rejected">Abgelehnt</MenuItem>
                  <MenuItem value="refunded">Erstattet</MenuItem>
                  <MenuItem value="failed">Fehlgeschlagen</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tariftyp</InputLabel>
                <Select
                  value={filters.tariffType}
                  label="Tariftyp"
                  onChange={(e) => handleFilterChange('tariffType', e.target.value)}
                >
                  <MenuItem value="">Alle</MenuItem>
                  <MenuItem value="kassa">Kassenarzt</MenuItem>
                  <MenuItem value="wahl">Wahlarzt</MenuItem>
                  <MenuItem value="privat">Privat</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Von Datum"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Bis Datum"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Suche"
                placeholder="Patient, Leistung..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 1 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleResetFilters}
                size="small"
              >
                Reset
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Performance Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Patient</TableCell>
              <TableCell>Leistung</TableCell>
              <TableCell>Datum</TableCell>
              <TableCell>Betrag</TableCell>
              <TableCell>Tariftyp</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {performances.map((performance) => (
              <TableRow key={performance._id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {performance.patientId 
                          ? `${performance.patientId.firstName} ${performance.patientId.lastName}`
                          : 'Unbekannter Patient'}
                      </Typography>
                      {performance.patientId?.email && (
                        <Typography variant="caption" color="textSecondary">
                          {performance.patientId.email}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {performance.serviceDescription}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Code: {performance.serviceCode}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {new Date(performance.serviceDatetime).toLocaleDateString('de-DE')}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EuroIcon fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight="medium">
                      {performance.totalPrice.toFixed(2)} €
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell>
                  {getTariffTypeChip(performance.tariffType)}
                </TableCell>
                
                <TableCell>
                  {getStatusChip(performance.status)}
                </TableCell>
                
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <OneClickBillingButton
                      performance={performance}
                      onStatusChange={() => loadPerformances()}
                      compact
                    />
                    
                    <Tooltip title="Bearbeiten">
                      <IconButton
                        size="small"
                        onClick={() => handleEditPerformance(performance)}
                        disabled={performance.status !== 'recorded'}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Löschen">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(performance)}
                        disabled={performance.status !== 'recorded'}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Zurück
            </Button>
            
            <Typography sx={{ alignSelf: 'center', px: 2 }}>
              Seite {pagination.page} von {pagination.pages}
            </Typography>
            
            <Button
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Weiter
            </Button>
          </Box>
        </Box>
      )}

      {/* Performance Form Dialog */}
      <PerformanceForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingPerformance(null);
        }}
        onSave={handleSavePerformance}
        performance={editingPerformance}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Leistung löschen</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie die Leistung "{performanceToDelete?.serviceDescription}" 
            {performanceToDelete?.patientId 
              ? `für ${performanceToDelete.patientId.firstName} ${performanceToDelete.patientId.lastName}`
              : ''} 
            wirklich löschen?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleDeletePerformance} color="error" variant="contained">
            Löschen
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
          title="Leitfaden: Leistungsabrechnung" 
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs value={helpTab} onChange={(_, v) => setHelpTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Übersicht" />
            <Tab label="Leistung erfassen" />
            <Tab label="Filter & Suche" />
            <Tab label="Status & Workflow" />
            <Tab label="Tariftypen" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Leistungsabrechnung
                </Typography>
                <Typography variant="body1" paragraph>
                  Die Leistungsabrechnung ermöglicht es Ihnen, einzelne medizinische Leistungen 
                  zu erfassen, zu verwalten und abzurechnen. Jede Leistung kann einem Patienten 
                  zugeordnet und mit verschiedenen Tariftypen abgerechnet werden.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📝 <strong>Leistung erfassen:</strong> Neue Leistungen für Patienten anlegen</li>
                  <li>✏️ <strong>Leistung bearbeiten:</strong> Bestehende Leistungen ändern</li>
                  <li>🗑️ <strong>Leistung löschen:</strong> Leistungen entfernen</li>
                  <li>🔍 <strong>Suche & Filter:</strong> Nach Patient, Status, Tariftyp, Datum filtern</li>
                  <li>📊 <strong>Übersicht:</strong> Tabellarische Darstellung aller Leistungen</li>
                  <li>💶 <strong>Abrechnung:</strong> Direkte Abrechnung von Leistungen</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Leistungsstatus
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><Chip label="Erfasst" size="small" sx={{ mr: 1 }} /> Leistung wurde erfasst, noch nicht abgerechnet</li>
                  <li><Chip label="Abgerechnet" color="info" size="small" sx={{ mr: 1 }} /> Leistung wurde abgerechnet</li>
                  <li><Chip label="Gesendet" color="warning" size="small" sx={{ mr: 1 }} /> Leistung wurde an Versicherung gesendet</li>
                  <li><Chip label="Akzeptiert" color="success" size="small" sx={{ mr: 1 }} /> Von Versicherung akzeptiert</li>
                  <li><Chip label="Abgelehnt" color="error" size="small" sx={{ mr: 1 }} /> Von Versicherung abgelehnt</li>
                  <li><Chip label="Erstattet" color="success" size="small" sx={{ mr: 1 }} /> Erstattung wurde ausgezahlt</li>
                  <li><Chip label="Fehlgeschlagen" color="error" size="small" sx={{ mr: 1 }} /> Abrechnung fehlgeschlagen</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Tariftypen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><Chip label="Kassenarzt" color="primary" size="small" sx={{ mr: 1 }} /> Abrechnung über Krankenkasse</li>
                  <li><Chip label="Wahlarzt" color="secondary" size="small" sx={{ mr: 1 }} /> Teilweise Erstattung durch Versicherung</li>
                  <li><Chip label="Privat" color="success" size="small" sx={{ mr: 1 }} /> Vollständige Zahlung durch Patient</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Neue Leistung erfassen
                </Typography>
                <Typography variant="body2" paragraph>
                  So erfassen Sie eine neue Leistung:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt Anleitung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Neue Leistung"</li>
                  <li>Wählen Sie einen Patienten aus</li>
                  <li>Wählen Sie eine Leistung aus dem Service-Katalog</li>
                  <li>Geben Sie das Leistungsdatum ein</li>
                  <li>Geben Sie Menge ein (Standard: 1)</li>
                  <li>Wählen Sie den Tariftyp (Kassenarzt, Wahlarzt, Privat)</li>
                  <li>Fügen Sie Diagnosen hinzu (optional, für Kassenarzt empfohlen)</li>
                  <li>Speichern Sie die Leistung</li>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Tipp:</strong> Verwenden Sie "One-Click-Billing" für schnelles Erfassen 
                  von Standard-Leistungen direkt aus dem Terminkalender.
                </Typography>
              </Alert>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Filter & Suche
                </Typography>
                <Typography variant="body2" paragraph>
                  Die Leistungsabrechnung bietet umfangreiche Filter- und Suchmöglichkeiten.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Verfügbare Filter
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Status:</strong> Filter nach Leistungsstatus</li>
                  <li><strong>Tariftyp:</strong> Filter nach Kassenarzt, Wahlarzt oder Privat</li>
                  <li><strong>Von Datum / Bis Datum:</strong> Datumsbereich</li>
                  <li><strong>Suche:</strong> Textsuche in Patientennamen, Leistungsbeschreibungen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Status & Workflow
                </Typography>
                <Typography variant="body2" paragraph>
                  Der Leistungsstatus zeigt den aktuellen Stand im Abrechnungsprozess.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Status-Arten
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><Chip label="Erfasst" size="small" sx={{ mr: 1 }} /> Leistung wurde erfasst</li>
                  <li><Chip label="Abgerechnet" color="info" size="small" sx={{ mr: 1 }} /> Leistung wurde abgerechnet</li>
                  <li><Chip label="Gesendet" color="warning" size="small" sx={{ mr: 1 }} /> An Versicherung gesendet</li>
                  <li><Chip label="Akzeptiert" color="success" size="small" sx={{ mr: 1 }} /> Von Versicherung akzeptiert</li>
                  <li><Chip label="Abgelehnt" color="error" size="small" sx={{ mr: 1 }} /> Von Versicherung abgelehnt</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Tariftypen
                </Typography>
                <Typography variant="body2" paragraph>
                  Das System unterstützt verschiedene Tariftypen für unterschiedliche Abrechnungssituationen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Kassenarzt, Wahlarzt, Privat
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Kassenarzt:</strong> Abrechnung über Krankenkasse</li>
                  <li><strong>Wahlarzt:</strong> Teilweise Erstattung durch Versicherung</li>
                  <li><strong>Privat:</strong> Vollständige Zahlung durch Patient</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 5 && (
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
                  <li>✅ Erfassen Sie Leistungen zeitnah nach Erbringung</li>
                  <li>✅ Überwachen Sie den Status der Leistungen</li>
                  <li>✅ Fügen Sie Diagnosen hinzu (für Kassenarzt erforderlich)</li>
                  <li>✅ Verwenden Sie Filter für schnelle Suche</li>
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

export default PerformanceList;
