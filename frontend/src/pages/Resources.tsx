import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Switch,
  FormControlLabel,
  Grid,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import api from '../utils/api';
import GradientDialogTitle from '../components/GradientDialogTitle';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Room,
  MedicalServices,
  Support,
  Build,
  OnlinePrediction,
  OfflineBolt,
  Schedule,
  Settings,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';

interface Resource {
  _id?: string;
  id?: string;
  name: string;
  type: 'room' | 'equipment' | 'service' | 'personnel';
  category: string;
  description?: string;
  onlineBooking: {
    enabled: boolean;
    advanceBookingDays: number;
    maxAdvanceBookingDays: number;
    minAdvanceBookingHours: number;
    workingHours: {
      monday: { start: string; end: string; isWorking: boolean };
      tuesday: { start: string; end: string; isWorking: boolean };
      wednesday: { start: string; end: string; isWorking: boolean };
      thursday: { start: string; end: string; isWorking: boolean };
      friday: { start: string; end: string; isWorking: boolean };
      saturday: { start: string; end: string; isWorking: boolean };
      sunday: { start: string; end: string; isWorking: boolean };
    };
    breakTimes: Array<{
      start: string;
      end: string;
      days: string[];
    }>;
    blockedDates: string[];
    maxConcurrentBookings: number;
    duration: number;
    price: number;
    requiresApproval: boolean;
  };
  properties: {
    capacity?: number;
    location?: string;
    locationId?: string;
    floor?: string;
    accessibility?: boolean;
    brand?: string;
    model?: string;
    serialNumber?: string;
    maintenanceDate?: string;
    status?: 'available' | 'maintenance' | 'out_of_order';
    specialization?: string;
    title?: string;
    qualifications?: string[];
    languages?: string[];
    experience?: string;
    serviceCode?: string;
    requirements?: string[];
  };
  isActive: boolean;
  isAvailable: boolean;
  tags: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Location {
  _id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
}

const Resources: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalResources, setTotalResources] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [onlineBookableFilter, setOnlineBookableFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'view'>('add');
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'warning' | 'info' 
  });

  const [formData, setFormData] = useState<Partial<Resource>>({
    name: '',
    type: 'room',
    category: '',
    description: '',
    onlineBooking: {
      enabled: false,
      advanceBookingDays: 30,
      maxAdvanceBookingDays: 90,
      minAdvanceBookingHours: 24,
      workingHours: {
        monday: { start: '09:00', end: '17:00', isWorking: true },
        tuesday: { start: '09:00', end: '17:00', isWorking: true },
        wednesday: { start: '09:00', end: '17:00', isWorking: true },
        thursday: { start: '09:00', end: '17:00', isWorking: true },
        friday: { start: '09:00', end: '17:00', isWorking: true },
        saturday: { start: '09:00', end: '12:00', isWorking: false },
        sunday: { start: '09:00', end: '12:00', isWorking: false }
      },
      breakTimes: [],
      blockedDates: [],
      maxConcurrentBookings: 1,
      duration: 30,
      price: 0,
      requiresApproval: false
    },
    properties: {},
    isActive: true,
    isAvailable: true,
    tags: []
  });

  // Load resources
  useEffect(() => {
    loadResources();
    fetchLocations();
  }, [page, rowsPerPage, searchTerm, typeFilter, categoryFilter, onlineBookableFilter]);

  const fetchLocations = async () => {
    try {
      const response = await api.get<{data: any[], pagination?: any}>('/locations');
      if (response.success) {
        setLocations(response.data.data || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Standorte:', error);
    }
  };

  const loadResources = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(onlineBookableFilter !== 'all' && { onlineBookable: onlineBookableFilter === 'enabled' ? 'true' : 'false' })
      });

      const response = await api.get<{data: any[], pagination: {total: number}}>(`/resources?${params}`);
      
      if (response.success && response.data) {
        setResources(response.data.data || []);
        setTotalResources(response.data.pagination?.total || 0);
      } else {
        setResources([]);
        setTotalResources(0);
      }
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Laden der Ressourcen', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    const initialFormData: Partial<Resource> = {
      name: '',
      type: 'room' as 'room' | 'equipment' | 'service' | 'personnel',
      category: '',
      description: '',
      onlineBooking: {
        enabled: false,
        advanceBookingDays: 30,
        maxAdvanceBookingDays: 90,
        minAdvanceBookingHours: 24,
        workingHours: {
          monday: { start: '09:00', end: '17:00', isWorking: true },
          tuesday: { start: '09:00', end: '17:00', isWorking: true },
          wednesday: { start: '09:00', end: '17:00', isWorking: true },
          thursday: { start: '09:00', end: '17:00', isWorking: true },
          friday: { start: '09:00', end: '17:00', isWorking: true },
          saturday: { start: '09:00', end: '12:00', isWorking: false },
          sunday: { start: '09:00', end: '12:00', isWorking: false }
        },
        breakTimes: [],
        blockedDates: [],
        maxConcurrentBookings: 1,
        duration: 30,
        price: 0,
        requiresApproval: false
      },
      properties: {},
      isActive: true,
      isAvailable: true,
      tags: []
    };

    // Automatische Standort-Vorbelegung wenn nur ein Standort vorhanden
    if (locations.length === 1) {
      initialFormData.properties = {
        ...initialFormData.properties,
        location: locations[0].name,
        locationId: locations[0]._id
      };
    }

    setFormData(initialFormData);
    setDialogMode('add');
    setActiveTab(0);
    setOpenDialog(true);
  };

  const handleEdit = (resource: Resource) => {
    // Stelle sicher, dass die Standort-Informationen korrekt geladen werden
    const resourceWithLocation = {
      ...resource,
      properties: {
        ...resource.properties,
        // Falls locationId nicht gesetzt ist, aber location vorhanden ist, versuche es zu finden
        locationId: resource.properties?.locationId || 
          (resource.properties?.location ? 
            locations.find(loc => loc.name === resource.properties?.location)?._id || '' : ''),
        // Stelle sicher, dass location auch gesetzt ist, falls nur locationId vorhanden ist
        location: resource.properties?.location || 
          (resource.properties?.locationId ? 
            locations.find(loc => loc._id === resource.properties.locationId)?.name || '' : '')
      }
    };
    
    setFormData(resourceWithLocation);
    setDialogMode('edit');
    setActiveTab(0);
    setOpenDialog(true);
  };

  const handleView = (resource: Resource) => {
    setFormData(resource);
    setDialogMode('view');
    setActiveTab(0);
    setOpenDialog(true);
  };

  const handleDelete = async (resource: Resource) => {
    if (window.confirm(`Möchten Sie die Ressource "${resource.name}" wirklich löschen?`)) {
      try {
        const response = await api.delete(`/resources/${resource._id || resource.id}`);
        
        if (response.success) {
          setSnackbar({ 
            open: true, 
            message: 'Ressource erfolgreich gelöscht', 
            severity: 'success' 
          });
          loadResources();
        } else {
          setSnackbar({ 
            open: true, 
            message: response.message || 'Fehler beim Löschen der Ressource', 
            severity: 'error' 
          });
        }
      } catch (error: any) {
        setSnackbar({ 
          open: true, 
          message: error.message || 'Fehler beim Löschen der Ressource', 
          severity: 'error' 
        });
      }
    }
  };

  const handleToggleOnlineBooking = async (resource: Resource) => {
    try {
      const response = await api.put(`/resources/${resource._id || resource.id}/toggle-online-booking`, {});
      
      if (response.success) {
        setSnackbar({ 
          open: true, 
          message: `Online-Buchung ${resource.onlineBooking.enabled ? 'deaktiviert' : 'aktiviert'}`, 
          severity: 'success' 
        });
        loadResources();
      } else {
        setSnackbar({ 
          open: true, 
          message: response.message || 'Fehler beim Ändern der Online-Buchbarkeit', 
          severity: 'error' 
        });
      }
    } catch (error: any) {
      setSnackbar({ 
        open: true, 
        message: error.message || 'Fehler beim Ändern der Online-Buchbarkeit', 
        severity: 'error' 
      });
    }
  };

  const handleSave = async () => {
    try {
      const response = dialogMode === 'add' 
        ? await api.post('/resources', formData)
        : await api.put(`/resources/${formData._id || formData.id}`, formData);
      
      if (response.success) {
        setSnackbar({ 
          open: true, 
          message: `Ressource ${dialogMode === 'add' ? 'erstellt' : 'aktualisiert'}`, 
          severity: 'success' 
        });
        setOpenDialog(false);
        loadResources();
      } else {
        setSnackbar({ 
          open: true, 
          message: response.message || 'Fehler beim Speichern', 
          severity: 'error' 
        });
      }
    } catch (error: any) {
      setSnackbar({ 
        open: true, 
        message: error.message || 'Fehler beim Speichern', 
        severity: 'error' 
      });
    }
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOnlineBookingChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      onlineBooking: {
        ...prev.onlineBooking!,
        [field]: value
      }
    }));
  };

  const handlePropertiesChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [field]: value
      }
    }));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'room': return <Room />;
      case 'equipment': return <Build />;
      case 'service': return <Support />;
      case 'personnel': return <MedicalServices />;
      default: return <Build />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'room': return 'primary';
      case 'equipment': return 'secondary';
      case 'service': return 'success';
      case 'personnel': return 'info';
      default: return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'room': return 'Raum';
      case 'equipment': return 'Gerät';
      case 'service': return 'Service';
      case 'personnel': return 'Personal';
      default: return type;
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isEditable = dialogMode === 'add' || dialogMode === 'edit';

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Ressourcenverwaltung
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddNew}
          sx={{ borderRadius: 2 }}
        >
          Neue Ressource
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <Box p={3}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                placeholder="Ressourcen suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Typ</InputLabel>
                <Select
                  value={typeFilter}
                  label="Typ"
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <SelectMenuItem value="all">Alle</SelectMenuItem>
                  <SelectMenuItem value="room">Räume</SelectMenuItem>
                  <SelectMenuItem value="equipment">Geräte</SelectMenuItem>
                  <SelectMenuItem value="service">Services</SelectMenuItem>
                  <SelectMenuItem value="personnel">Personal</SelectMenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Kategorie</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Kategorie"
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <SelectMenuItem value="all">Alle</SelectMenuItem>
                  <SelectMenuItem value="general">Allgemein</SelectMenuItem>
                  <SelectMenuItem value="specialized">Spezialisiert</SelectMenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Online-Buchung</InputLabel>
                <Select
                  value={onlineBookableFilter}
                  label="Online-Buchung"
                  onChange={(e) => setOnlineBookableFilter(e.target.value)}
                >
                  <SelectMenuItem value="all">Alle</SelectMenuItem>
                  <SelectMenuItem value="enabled">Aktiviert</SelectMenuItem>
                  <SelectMenuItem value="disabled">Deaktiviert</SelectMenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ressource</TableCell>
                <TableCell>Typ</TableCell>
                <TableCell>Kategorie</TableCell>
                <TableCell>Standort</TableCell>
                <TableCell>Online-Buchung</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Verfügbar</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : resources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Keine Ressourcen gefunden
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                resources.map((resource) => (
                  <TableRow key={resource._id || resource.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {getTypeIcon(resource.type)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {resource.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {resource.description}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getTypeIcon(resource.type)}
                        label={getTypeLabel(resource.type)}
                        color={getTypeColor(resource.type) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{resource.category}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {resource.properties?.location ? 
                          `${resource.properties.location}${resource.properties.locationId ? 
                            ` (${locations.find(loc => loc._id === resource.properties.locationId)?.code || ''})` : ''}` 
                          : 'Nicht zugewiesen'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={resource.onlineBooking.enabled ? <OnlinePrediction /> : <OfflineBolt />}
                        label={resource.onlineBooking.enabled ? 'Aktiviert' : 'Deaktiviert'}
                        color={resource.onlineBooking.enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={resource.isActive ? 'Aktiv' : 'Inaktiv'}
                        color={resource.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={resource.isAvailable ? 'Verfügbar' : 'Nicht verfügbar'}
                        color={resource.isAvailable ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedResource(resource);
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalResources}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => { handleView(selectedResource!); setAnchorEl(null); }}>
          <Visibility sx={{ mr: 1 }} />
          Anzeigen
        </MenuItem>
        <MenuItem onClick={() => { handleEdit(selectedResource!); setAnchorEl(null); }}>
          <Edit sx={{ mr: 1 }} />
          Bearbeiten
        </MenuItem>
        <MenuItem onClick={() => { handleToggleOnlineBooking(selectedResource!); setAnchorEl(null); }}>
          {selectedResource?.onlineBooking.enabled ? <OfflineBolt sx={{ mr: 1 }} /> : <OnlinePrediction sx={{ mr: 1 }} />}
          {selectedResource?.onlineBooking.enabled ? 'Online-Buchung deaktivieren' : 'Online-Buchung aktivieren'}
        </MenuItem>
        <MenuItem onClick={() => { handleDelete(selectedResource!); setAnchorEl(null); }}>
          <Delete sx={{ mr: 1 }} />
          Löschen
        </MenuItem>
      </Menu>

      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <GradientDialogTitle
          isEdit={dialogMode === 'edit'}
          title={
            dialogMode === 'add' ? 'Neue Ressource' :
            dialogMode === 'edit' ? 'Ressource bearbeiten' :
            'Ressource anzeigen'
          }
          icon={<Build />}
          gradientColors={{ from: '#ec4899', to: '#be185d' }}
        />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ 
                mb: 3,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                }
              }}
            >
              <Tab label="Grunddaten" />
              <Tab label="Online-Buchung" />
              <Tab label="Eigenschaften" />
            </Tabs>

          <Box sx={{ mt: 2 }}>
            {activeTab === 0 && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Name"
                    value={formData.name || ''}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    disabled={dialogMode === 'view'}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth disabled={dialogMode === 'view'}>
                    <InputLabel>Typ</InputLabel>
                    <Select
                      value={formData.type || ''}
                      onChange={(e) => handleFormChange('type', e.target.value)}
                      label="Typ"
                    >
                      <SelectMenuItem value="room">Raum</SelectMenuItem>
                      <SelectMenuItem value="equipment">Gerät</SelectMenuItem>
                      <SelectMenuItem value="service">Service</SelectMenuItem>
                      <SelectMenuItem value="personnel">Personal</SelectMenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Kategorie"
                    value={formData.category || ''}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    disabled={dialogMode === 'view'}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Beschreibung"
                    value={formData.description || ''}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    disabled={dialogMode === 'view'}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isActive || false}
                        onChange={(e) => handleFormChange('isActive', e.target.checked)}
                        disabled={dialogMode === 'view'}
                      />
                    }
                    label="Aktiv"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isAvailable || false}
                        onChange={(e) => handleFormChange('isAvailable', e.target.checked)}
                        disabled={dialogMode === 'view'}
                      />
                    }
                    label="Verfügbar"
                  />
                </Grid>
              </Grid>
            )}

            {activeTab === 1 && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.onlineBooking?.enabled || false}
                        onChange={(e) => handleOnlineBookingChange('enabled', e.target.checked)}
                        disabled={dialogMode === 'view'}
                      />
                    }
                    label="Online-Buchung aktiviert"
                  />
                </Grid>
                {formData.onlineBooking?.enabled && (
                  <>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Vorausbuchung (Tage)"
                        type="number"
                        value={formData.onlineBooking.advanceBookingDays || 30}
                        onChange={(e) => handleOnlineBookingChange('advanceBookingDays', parseInt(e.target.value))}
                        disabled={dialogMode === 'view'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Max. Vorausbuchung (Tage)"
                        type="number"
                        value={formData.onlineBooking.maxAdvanceBookingDays || 90}
                        onChange={(e) => handleOnlineBookingChange('maxAdvanceBookingDays', parseInt(e.target.value))}
                        disabled={dialogMode === 'view'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Min. Vorausbuchung (Stunden)"
                        type="number"
                        value={formData.onlineBooking.minAdvanceBookingHours || 24}
                        onChange={(e) => handleOnlineBookingChange('minAdvanceBookingHours', parseInt(e.target.value))}
                        disabled={dialogMode === 'view'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Standard-Dauer (Minuten)"
                        type="number"
                        value={formData.onlineBooking.duration || 30}
                        onChange={(e) => handleOnlineBookingChange('duration', parseInt(e.target.value))}
                        disabled={dialogMode === 'view'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Preis (€)"
                        type="number"
                        value={formData.onlineBooking.price || 0}
                        onChange={(e) => handleOnlineBookingChange('price', parseFloat(e.target.value))}
                        disabled={dialogMode === 'view'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.onlineBooking.requiresApproval || false}
                            onChange={(e) => handleOnlineBookingChange('requiresApproval', e.target.checked)}
                            disabled={dialogMode === 'view'}
                          />
                        }
                        label="Genehmigung erforderlich"
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            )}

            {activeTab === 2 && (
              <Grid container spacing={2}>
                {formData.type === 'room' && (
                  <>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Kapazität"
                        type="number"
                        value={formData.properties?.capacity || ''}
                        onChange={(e) => handlePropertiesChange('capacity', parseInt(e.target.value))}
                        disabled={dialogMode === 'view'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Standort</InputLabel>
                        <Select
                          value={formData.properties?.locationId || ''}
                          onChange={(e) => {
                            const selectedLocation = locations.find(loc => loc._id === e.target.value);
                            handlePropertiesChange('locationId', e.target.value);
                            handlePropertiesChange('location', selectedLocation?.name || '');
                          }}
                          label="Standort"
                          disabled={dialogMode === 'view'}
                        >
                          {locations.map((location) => (
                            <SelectMenuItem key={location._id} value={location._id}>
                              {location.name} ({location.code})
                            </SelectMenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Stockwerk"
                        value={formData.properties?.floor || ''}
                        onChange={(e) => handlePropertiesChange('floor', e.target.value)}
                        disabled={dialogMode === 'view'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.properties?.accessibility || false}
                            onChange={(e) => handlePropertiesChange('accessibility', e.target.checked)}
                            disabled={dialogMode === 'view'}
                          />
                        }
                        label="Barrierefrei"
                      />
                    </Grid>
                  </>
                )}
                {formData.type === 'equipment' && (
                  <>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Marke"
                        value={formData.properties?.brand || ''}
                        onChange={(e) => handlePropertiesChange('brand', e.target.value)}
                        disabled={dialogMode === 'view'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Modell"
                        value={formData.properties?.model || ''}
                        onChange={(e) => handlePropertiesChange('model', e.target.value)}
                        disabled={dialogMode === 'view'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Standort</InputLabel>
                        <Select
                          value={formData.properties?.locationId || ''}
                          onChange={(e) => {
                            const selectedLocation = locations.find(loc => loc._id === e.target.value);
                            handlePropertiesChange('locationId', e.target.value);
                            handlePropertiesChange('location', selectedLocation?.name || '');
                          }}
                          label="Standort"
                          disabled={dialogMode === 'view'}
                        >
                          {locations.map((location) => (
                            <SelectMenuItem key={location._id} value={location._id}>
                              {location.name} ({location.code})
                            </SelectMenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Seriennummer"
                        value={formData.properties?.serialNumber || ''}
                        onChange={(e) => handlePropertiesChange('serialNumber', e.target.value)}
                        disabled={dialogMode === 'view'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Wartungsdatum"
                        type="date"
                        value={formData.properties?.maintenanceDate || ''}
                        onChange={(e) => handlePropertiesChange('maintenanceDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        disabled={dialogMode === 'view'}
                      />
                    </Grid>
                  </>
                )}
                {formData.type === 'personnel' && (
                  <>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Titel"
                        value={formData.properties?.title || ''}
                        onChange={(e) => handlePropertiesChange('title', e.target.value)}
                        disabled={dialogMode === 'view'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Spezialisierung"
                        value={formData.properties?.specialization || ''}
                        onChange={(e) => handlePropertiesChange('specialization', e.target.value)}
                        disabled={dialogMode === 'view'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Erfahrung"
                        value={formData.properties?.experience || ''}
                        onChange={(e) => handlePropertiesChange('experience', e.target.value)}
                        disabled={dialogMode === 'view'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Sprachen"
                        value={formData.properties?.languages?.join(', ') || ''}
                        onChange={(e) => handlePropertiesChange('languages', e.target.value.split(',').map(s => s.trim()))}
                        disabled={dialogMode === 'view'}
                        placeholder="Deutsch, Englisch, Französisch"
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            )}
          </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            {dialogMode === 'view' ? 'Schließen' : 'Abbrechen'}
          </Button>
          {isEditable && (
            <Button onClick={handleSave} variant="contained">
              {dialogMode === 'add' ? 'Erstellen' : 'Speichern'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Resources;