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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Euro as EuroIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import OneClickBillingButton from './OneClickBillingButton';
import PerformanceForm from './PerformanceForm';

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
  };
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
  const dispatch = useDispatch();
  const { user } = useSelector((state: any) => state.auth);
  
  // State
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPerformance, setEditingPerformance] = useState<Performance | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [performanceToDelete, setPerformanceToDelete] = useState<Performance | null>(null);
  
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

  // Performances laden
  const loadPerformances = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Kein Authentifizierungstoken gefunden');
      }

      const queryParams = new URLSearchParams({
        page: (pagination?.page || 1).toString(),
        limit: (pagination?.limit || 50).toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/billing/performances?${queryParams}`,
        {
          headers: {
            'x-auth-token': token || ''
          }
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Leistungen konnten nicht geladen werden');
      }

      setPerformances(result.data || []);
      if (result.pagination) {
        setPagination(result.pagination);
      }
      
    } catch (error: any) {
      console.error('Leistungen laden Fehler:', error);
      setError(error.message);
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
        ? `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/billing/performances/${editingPerformance._id}`
        : `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/billing/performances`;
      
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
        throw new Error(result.message || 'Leistung konnte nicht gespeichert werden');
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
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/billing/performances/${performanceToDelete._id}`,
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
        <Typography variant="h4" component="h1">
          Leistungsabrechnung
        </Typography>
        
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
                        {performance.patientId.firstName} {performance.patientId.lastName}
                      </Typography>
                      {performance.patientId.email && (
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
            für {performanceToDelete?.patientId.firstName} {performanceToDelete?.patientId.lastName} 
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
    </Box>
  );
};

export default PerformanceList;
