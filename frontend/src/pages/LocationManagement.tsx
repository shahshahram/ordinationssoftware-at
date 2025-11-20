import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationOnIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Cancel as CancelIcon,
  CalendarToday as CalendarTodayIcon,
  ExpandMore as ExpandMoreIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import GradientDialogTitle from '../components/GradientDialogTitle';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  fetchLocationHours,
  createLocationHours,
  updateLocationHours,
  deleteLocationHours,
  fetchLocationClosures,
  createLocationClosure,
  updateLocationClosure,
  deleteLocationClosure,
  fetchStaffLocationAssignments,
  createStaffLocationAssignment,
  updateStaffLocationAssignment,
  deleteStaffLocationAssignment,
  Location,
  LocationHours,
  LocationClosure,
  StaffLocationAssignment,
} from '../store/slices/locationSlice';
import {
  fetchLocationWeeklySchedules,
  createLocationWeeklySchedule,
  updateLocationWeeklySchedule,
  deleteLocationWeeklySchedule,
  LocationWeeklySchedule,
  LocationWeeklyScheduleData,
} from '../store/slices/locationWeeklyScheduleSlice';
import LocationWeeklyScheduleComponent from '../components/LocationWeeklySchedule';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`location-tabpanel-${index}`}
      aria-labelledby={`location-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const LocationManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { locations, locationHours, locationClosures, staffAssignments, loading, error } = useAppSelector(state => state.locations);
  const { staffProfiles } = useAppSelector(state => state.staff);
  const { schedules: weeklySchedules } = useAppSelector(state => state.locationWeeklySchedules);

  const [tabValue, setTabValue] = useState(0);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [closureDialogOpen, setClosureDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [weeklyScheduleDialogOpen, setWeeklyScheduleDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingHours, setEditingHours] = useState<LocationHours | null>(null);
  const [editingClosure, setEditingClosure] = useState<LocationClosure | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<StaffLocationAssignment | null>(null);
  const [editingWeeklySchedule, setEditingWeeklySchedule] = useState<LocationWeeklySchedule | null>(null);
  const [selectedLocationForSchedule, setSelectedLocationForSchedule] = useState<Location | null>(null);

  // Form states
  const [locationForm, setLocationForm] = useState({
    name: '',
    code: '',
    address_line1: '',
    address_line2: '',
    postal_code: '',
    city: '',
    state: '',
    timezone: 'Europe/Vienna',
    phone: '',
    email: '',
    color_hex: '#2563EB',
    is_active: true,
    xdsRegistry: {
      enabled: false,
      registryUrl: '',
      repositoryLocation: '',
      repositoryUniqueId: '',
      homeCommunityId: '',
      allowPatientUpload: false,
      patientUploadMaxSize: 10485760,
      patientUploadAllowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff']
    }
  });

  const [hoursForm, setHoursForm] = useState({
    location_id: '',
    rrule: '',
    timezone: 'Europe/Vienna',
    label: '',
  });

  const [closureForm, setClosureForm] = useState({
    location_id: '',
    starts_at: '',
    ends_at: '',
    reason: '',
  });

  const [assignmentForm, setAssignmentForm] = useState({
    staff_id: '',
    location_id: '',
    is_primary: false,
    allowed_services: [] as string[],
  });

  useEffect(() => {
    dispatch(fetchLocations());
    dispatch(fetchLocationHours());
    dispatch(fetchLocationClosures());
    dispatch(fetchStaffLocationAssignments());
    dispatch(fetchLocationWeeklySchedules());
  }, [dispatch]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleLocationDialogOpen = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      const xdsRegistry = location.xdsRegistry || {
        enabled: false,
        registryUrl: '',
        repositoryLocation: '',
        repositoryUniqueId: '',
        homeCommunityId: '',
        allowPatientUpload: false,
        patientUploadMaxSize: 10485760,
        patientUploadAllowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff']
      };
      setLocationForm({
        name: location.name,
        code: location.code || '',
        address_line1: location.address_line1,
        address_line2: location.address_line2 || '',
        postal_code: location.postal_code,
        city: location.city,
        state: location.state || '',
        timezone: location.timezone,
        phone: location.phone || '',
        email: location.email || '',
        color_hex: location.color_hex,
        is_active: location.is_active,
        xdsRegistry: {
          enabled: xdsRegistry.enabled || false,
          registryUrl: xdsRegistry.registryUrl || '',
          repositoryLocation: xdsRegistry.repositoryLocation || '',
          repositoryUniqueId: xdsRegistry.repositoryUniqueId || '',
          homeCommunityId: xdsRegistry.homeCommunityId || '',
          allowPatientUpload: xdsRegistry.allowPatientUpload || false,
          patientUploadMaxSize: xdsRegistry.patientUploadMaxSize || 10485760,
          patientUploadAllowedTypes: xdsRegistry.patientUploadAllowedTypes || ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff']
        }
      });
    } else {
      setEditingLocation(null);
      setLocationForm({
        name: '',
        code: '',
        address_line1: '',
        address_line2: '',
        postal_code: '',
        city: '',
        state: '',
        timezone: 'Europe/Vienna',
        phone: '',
        email: '',
        color_hex: '#2563EB',
        is_active: true,
        xdsRegistry: {
          enabled: false,
          registryUrl: '',
          repositoryLocation: '',
          repositoryUniqueId: '',
          homeCommunityId: '',
          allowPatientUpload: false,
          patientUploadMaxSize: 10485760,
          patientUploadAllowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff']
        }
      });
    }
    setLocationDialogOpen(true);
  };

  const handleLocationDialogClose = () => {
    setLocationDialogOpen(false);
    setEditingLocation(null);
  };

  const handleLocationSubmit = async () => {
    try {
      if (editingLocation) {
        // Debug: Zeige was gesendet wird
        console.log('[Location Update] Sending data:', JSON.stringify(locationForm, null, 2));
        await dispatch(updateLocation({ id: editingLocation._id, locationData: locationForm })).unwrap();
        // Lade Standorte neu, um aktualisierte Daten zu erhalten
        dispatch(fetchLocations());
      } else {
        await dispatch(createLocation(locationForm)).unwrap();
      }
      handleLocationDialogClose();
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const handleLocationDelete = async (id: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Standort löschen möchten?')) {
      try {
        await dispatch(deleteLocation(id)).unwrap();
      } catch (error) {
        console.error('Error deleting location:', error);
      }
    }
  };

  const handleHoursDialogOpen = (locationId: string, hours?: LocationHours) => {
    if (hours) {
      setEditingHours(hours);
      setHoursForm({
        location_id: hours.location_id,
        rrule: hours.rrule,
        timezone: hours.timezone,
        label: hours.label || '',
      });
    } else {
      setEditingHours(null);
      setHoursForm({
        location_id: locationId || '',
        rrule: '',
        timezone: 'Europe/Vienna',
        label: '',
      });
    }
    setHoursDialogOpen(true);
  };

  const handleHoursDialogClose = () => {
    setHoursDialogOpen(false);
    setEditingHours(null);
  };

  const handleHoursSubmit = async (locationId: string) => {
    try {
      if (editingHours) {
        await dispatch(updateLocationHours({ 
          locationId: hoursForm.location_id || locationId, 
          hoursId: editingHours._id,
          hoursData: { ...hoursForm } 
        })).unwrap();
      } else {
        await dispatch(createLocationHours({ 
          locationId: hoursForm.location_id || locationId, 
          hoursData: { ...hoursForm } 
        })).unwrap();
      }
      handleHoursDialogClose();
    } catch (error) {
      console.error('Error saving location hours:', error);
    }
  };

  const handleHoursDelete = async (hoursId: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Öffnungszeiten löschen möchten?')) {
      try {
        await dispatch(deleteLocationHours(hoursId)).unwrap();
      } catch (error) {
        console.error('Error deleting location hours:', error);
      }
    }
  };

  const handleClosureDialogOpen = (locationId: string, closure?: LocationClosure) => {
    if (closure) {
      setEditingClosure(closure);
      setClosureForm({
        location_id: closure.location_id,
        reason: closure.reason || '',
        starts_at: closure.starts_at ? new Date(closure.starts_at).toISOString().slice(0, 16) : '',
        ends_at: closure.ends_at ? new Date(closure.ends_at).toISOString().slice(0, 16) : '',
      });
    } else {
      setEditingClosure(null);
      setClosureForm({
        location_id: locationId || '',
        reason: '',
        starts_at: '',
        ends_at: '',
      });
    }
    setClosureDialogOpen(true);
  };

  const handleClosureDialogClose = () => {
    setClosureDialogOpen(false);
    setEditingClosure(null);
  };

  const handleClosureSubmit = async (locationId: string) => {
    try {
      if (editingClosure) {
        await dispatch(updateLocationClosure({ 
          locationId: closureForm.location_id || locationId, 
          closureId: editingClosure._id,
          closureData: { ...closureForm } 
        })).unwrap();
      } else {
        await dispatch(createLocationClosure({ 
          locationId: closureForm.location_id || locationId, 
          closureData: { ...closureForm } 
        })).unwrap();
      }
      handleClosureDialogClose();
    } catch (error) {
      console.error('Error saving location closure:', error);
    }
  };

  const handleClosureDelete = async (closureId: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Schließtag löschen möchten?')) {
      try {
        await dispatch(deleteLocationClosure(closureId)).unwrap();
      } catch (error) {
        console.error('Error deleting location closure:', error);
      }
    }
  };

  const handleAssignmentDialogOpen = (assignment?: StaffLocationAssignment) => {
    if (assignment) {
      setEditingAssignment(assignment);
      setAssignmentForm({
        staff_id: typeof assignment.staff_id === 'string' ? assignment.staff_id : assignment.staff_id._id,
        location_id: typeof assignment.location_id === 'string' ? assignment.location_id : (assignment.location_id as any)._id,
        is_primary: assignment.is_primary,
        allowed_services: (Array.isArray(assignment.allowed_services) ? assignment.allowed_services : []).map(service => 
          typeof service === 'string' ? service : (service as any)._id
        ),
      });
    } else {
      setEditingAssignment(null);
      setAssignmentForm({
        staff_id: '',
        location_id: '',
        is_primary: false,
        allowed_services: [],
      });
    }
    setAssignmentDialogOpen(true);
  };

  const handleAssignmentDialogClose = () => {
    setAssignmentDialogOpen(false);
    setEditingAssignment(null);
  };

  const handleAssignmentSubmit = async () => {
    try {
      if (editingAssignment) {
        await dispatch(updateStaffLocationAssignment({ id: editingAssignment._id, assignmentData: assignmentForm })).unwrap();
      } else {
        await dispatch(createStaffLocationAssignment(assignmentForm)).unwrap();
      }
      handleAssignmentDialogClose();
    } catch (error) {
      console.error('Error saving assignment:', error);
    }
  };

  const handleAssignmentDelete = async (id: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Zuweisung löschen möchten?')) {
      try {
        await dispatch(deleteStaffLocationAssignment(id)).unwrap();
      } catch (error) {
        console.error('Error deleting assignment:', error);
      }
    }
  };

  // Weekly Schedule Handlers
  const handleWeeklyScheduleDialogOpen = (location?: Location, schedule?: LocationWeeklySchedule) => {
    if (location) {
      setSelectedLocationForSchedule(location);
      setEditingWeeklySchedule(schedule || null);
    } else {
      setSelectedLocationForSchedule(null);
      setEditingWeeklySchedule(null);
    }
    setWeeklyScheduleDialogOpen(true);
  };

  const handleWeeklyScheduleDialogClose = () => {
    setWeeklyScheduleDialogOpen(false);
    setSelectedLocationForSchedule(null);
    setEditingWeeklySchedule(null);
  };

  const handleWeeklyScheduleSave = async (scheduleData: LocationWeeklyScheduleData) => {
    try {
      if (editingWeeklySchedule) {
        await dispatch(updateLocationWeeklySchedule({
          id: editingWeeklySchedule._id,
          scheduleData: {
            validFrom: scheduleData.validFrom?.toISOString(),
            validTo: scheduleData.validTo?.toISOString(),
            schedules: scheduleData.schedules
          }
        })).unwrap();
      } else {
        await dispatch(createLocationWeeklySchedule({
          location_id: scheduleData.locationId,
          validFrom: scheduleData.validFrom?.toISOString(),
          validTo: scheduleData.validTo?.toISOString(),
          schedules: scheduleData.schedules
        })).unwrap();
      }
      handleWeeklyScheduleDialogClose();
    } catch (error) {
      console.error('Error saving weekly schedule:', error);
    }
  };

  const handleWeeklyScheduleDelete = async (id: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Öffnungszeiten löschen möchten?')) {
      try {
        await dispatch(deleteLocationWeeklySchedule(id)).unwrap();
      } catch (error) {
        console.error('Error deleting weekly schedule:', error);
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Standortverwaltung
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleLocationDialogOpen()}
        >
          Neuer Standort
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Standorte" icon={<LocationOnIcon />} />
            <Tab label="Öffnungszeiten" icon={<ScheduleIcon />} />
            <Tab label="Wöchentliche Öffnungszeiten" icon={<CalendarTodayIcon />} />
            <Tab label="Schließtage" icon={<CancelIcon />} />
            <Tab label="Personal-Zuweisungen" icon={<PeopleIcon />} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Adresse</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(Array.isArray(locations) ? locations : []).map((location) => (
                  <TableRow key={location._id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            backgroundColor: location.color_hex,
                            borderRadius: '50%',
                            mr: 1,
                          }}
                        />
                        {location.name}
                      </Box>
                    </TableCell>
                    <TableCell>{location.code || '-'}</TableCell>
                    <TableCell>
                      {location.address_line1}, {location.postal_code} {location.city}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={location.is_active ? 'Aktiv' : 'Inaktiv'}
                        color={location.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleLocationDialogOpen(location)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleLocationDelete(location._id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Öffnungszeiten verwalten
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleHoursDialogOpen('')}
            >
              Neue Öffnungszeiten
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            Hier können Sie die Öffnungszeiten für jeden Standort konfigurieren.
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 2 }}>
            {(Array.isArray(locations) ? locations : []).map((location) => (
              <Card key={location._id} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6">{location.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {location.code} • {location.city}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleHoursDialogOpen(location._id)}
                  >
                    Hinzufügen
                  </Button>
                </Box>
                
                {(Array.isArray(locationHours) ? locationHours : [])
                  .filter(hours => hours.location_id === location._id)
                  .map((hours) => (
                    <Box key={hours._id} sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 1, 
                      p: 2, 
                      bgcolor: 'grey.50', 
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {hours.label || 'Standard'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {hours.rrule}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Zeitzone: {hours.timezone}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => handleHoursDialogOpen(location._id, hours)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleHoursDelete(hours._id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                
                {(Array.isArray(locationHours) ? locationHours : []).filter(hours => hours.location_id === location._id).length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    Keine Öffnungszeiten definiert
                  </Typography>
                )}
              </Card>
            ))}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Wöchentliche Öffnungszeiten Tab */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
                   <Typography variant="h6" gutterBottom>
                     Wiederkehrende Öffnungszeiten
                   </Typography>
                   <Typography variant="body2" color="text.secondary">
                     Konfigurieren Sie die wiederkehrenden Öffnungszeiten für jeden Standort mit der gleichen Logik wie bei Personal-Arbeitszeiten.
                   </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Standort auswählen</InputLabel>
                <Select
                  value={selectedLocationForSchedule?._id || ''}
                  label="Standort auswählen"
                  onChange={(e) => {
                    const location = (Array.isArray(locations) ? locations : []).find(l => l._id === e.target.value);
                    if (location) {
                      setSelectedLocationForSchedule(location);
                    }
                  }}
                >
                  {(Array.isArray(locations) ? locations : []).map((location) => (
                    <MenuItem key={location._id} value={location._id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: location.color_hex || '#2563EB',
                            mr: 1
                          }}
                        />
                        {location.name}{location.code ? ` (${location.code})` : ''}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleWeeklyScheduleDialogOpen()}
                disabled={(Array.isArray(locations) ? locations : []).length === 0}
              >
                Neue Öffnungszeiten-Vorlage
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Standort</TableCell>
                <TableCell>Gültigkeitszeitraum</TableCell>
                <TableCell>Öffnungstage</TableCell>
                  <TableCell>Erstellt von</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(Array.isArray(weeklySchedules) ? weeklySchedules : []).map((schedule) => (
                  <TableRow key={schedule._id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            backgroundColor: schedule.location_id.color_hex || '#2563EB',
                            mr: 1
                          }}
                        />
                        {schedule.location_id.name} ({schedule.location_id.code})
                      </Box>
                    </TableCell>
                <TableCell>
                  {new Date(schedule.validFrom).toLocaleDateString('de-DE')} - {schedule.validTo ? new Date(schedule.validTo).toLocaleDateString('de-DE') : 'unbegrenzt'}
                </TableCell>
                    <TableCell>
                      {(Array.isArray(schedule.schedules) ? schedule.schedules : []).filter(s => s.isOpen).length} von 7 Tagen
                    </TableCell>
                    <TableCell>
                      {schedule.createdBy.firstName} {schedule.createdBy.lastName}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleWeeklyScheduleDialogOpen(
                          {
                            _id: schedule.location_id._id,
                            name: schedule.location_id.name,
                            code: schedule.location_id.code,
                            color_hex: schedule.location_id.color_hex
                          } as Location,
                          schedule
                        )}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleWeeklyScheduleDelete(schedule._id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {(Array.isArray(weeklySchedules) ? weeklySchedules : []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Keine wöchentlichen Öffnungszeiten konfiguriert
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Schließtage verwalten
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleClosureDialogOpen('')}
            >
              Neuer Schließtag
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            Hier können Sie Schließtage, Feiertage und Ausnahmen für jeden Standort definieren.
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 2 }}>
            {(Array.isArray(locations) ? locations : []).map((location) => (
              <Card key={location._id} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6">{location.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {location.code} • {location.city}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleClosureDialogOpen(location._id)}
                  >
                    Hinzufügen
                  </Button>
                </Box>
                
                {(Array.isArray(locationClosures) ? locationClosures : [])
                  .filter(closure => closure.location_id === location._id)
                  .map((closure) => (
                    <Box key={closure._id} sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 1, 
                      p: 2, 
                      bgcolor: 'grey.50', 
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {closure.reason || 'Schließtag'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(closure.starts_at).toLocaleDateString('de-DE')} - {new Date(closure.ends_at).toLocaleDateString('de-DE')}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {new Date(closure.starts_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} - {new Date(closure.ends_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => handleClosureDialogOpen(location._id, closure)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleClosureDelete(closure._id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                
                {(Array.isArray(locationClosures) ? locationClosures : []).filter(closure => closure.location_id === location._id).length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    Keine Schließtage definiert
                  </Typography>
                )}
              </Card>
            ))}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Personal-Standort-Zuweisungen
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleAssignmentDialogOpen()}
            >
              Neue Zuweisung
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            Hier können Sie zuweisen, welches Personal an welchen Standorten arbeitet.
          </Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Personal</TableCell>
                  <TableCell>Standort</TableCell>
                  <TableCell>Primär</TableCell>
                  <TableCell>Erlaubte Services</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(Array.isArray(staffAssignments) ? staffAssignments : []).map((assignment) => {
                  // assignment.staff_id is already populated with StaffProfile data
                  const staff = assignment.staff_id;
                  // Handle both string and object location_id
                  const location = typeof assignment.location_id === 'string' 
                    ? (Array.isArray(locations) ? locations : []).find(l => l._id === assignment.location_id)
                    : assignment.location_id;
                  return (
                    <TableRow key={assignment._id}>
                      <TableCell>
                        {staff && typeof staff === 'object' 
                          ? `${staff.userId?.firstName || staff.display_name} ${staff.userId?.lastName || ''}` 
                          : 'Unbekannt'
                        }
                      </TableCell>
                      <TableCell>
                        {location ? (typeof location === 'object' ? (location as any).name : (location as any).name) : 'Unbekannt'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={assignment.is_primary ? 'Ja' : 'Nein'}
                          color={assignment.is_primary ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {assignment.allowed_services && (Array.isArray(assignment.allowed_services) ? assignment.allowed_services : []).length > 0 
                          ? (Array.isArray(assignment.allowed_services) ? assignment.allowed_services : []).map(service => 
                              typeof service === 'string' ? service : (service as any).name
                            ).join(', ')
                          : 'Alle'
                        }
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleAssignmentDialogOpen(assignment)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleAssignmentDelete(assignment._id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Card>

      {/* Location Dialog */}
      <Dialog open={locationDialogOpen} onClose={handleLocationDialogClose} maxWidth="md" fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <GradientDialogTitle
          isEdit={!!editingLocation}
          title={editingLocation ? 'Standort bearbeiten' : 'Neuer Standort'}
          icon={<LocationOnIcon />}
          gradientColors={{ from: '#3b82f6', to: '#2563eb' }}
        />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Name"
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Code"
                value={locationForm.code}
                onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
                placeholder="z.B. W1, NÖ2"
              />
            </Box>
            <TextField
              fullWidth
              label="Adresse"
              value={locationForm.address_line1}
              onChange={(e) => setLocationForm({ ...locationForm, address_line1: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Adresse 2"
              value={locationForm.address_line2}
              onChange={(e) => setLocationForm({ ...locationForm, address_line2: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Postleitzahl"
                value={locationForm.postal_code}
                onChange={(e) => setLocationForm({ ...locationForm, postal_code: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Stadt"
                value={locationForm.city}
                onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Bundesland"
                value={locationForm.state}
                onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Telefon"
                value={locationForm.phone}
                onChange={(e) => setLocationForm({ ...locationForm, phone: e.target.value })}
              />
              <TextField
                fullWidth
                label="E-Mail"
                type="email"
                value={locationForm.email}
                onChange={(e) => setLocationForm({ ...locationForm, email: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Zeitzone</InputLabel>
                <Select
                  value={locationForm.timezone}
                  onChange={(e) => setLocationForm({ ...locationForm, timezone: e.target.value })}
                >
                  <MenuItem value="Europe/Vienna">Europa/Wien</MenuItem>
                  <MenuItem value="Europe/Berlin">Europa/Berlin</MenuItem>
                  <MenuItem value="Europe/Zurich">Europa/Zürich</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Farbe"
                type="color"
                value={locationForm.color_hex}
                onChange={(e) => setLocationForm({ ...locationForm, color_hex: e.target.value })}
              />
            </Box>
            <Box display="flex" alignItems="center">
              <Switch
                checked={locationForm.is_active}
                onChange={(e) => setLocationForm({ ...locationForm, is_active: e.target.checked })}
              />
              <Typography variant="body2" sx={{ ml: 1 }}>
                Standort ist aktiv
              </Typography>
            </Box>
            
            {/* XDS Registry Konfiguration */}
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StorageIcon />
                  <Typography variant="subtitle1">XDS Registry Konfiguration</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box display="flex" alignItems="center">
                    <Switch
                      checked={locationForm.xdsRegistry?.enabled || false}
                      onChange={(e) => {
                        const currentXds = locationForm.xdsRegistry || {
                          enabled: false,
                          registryUrl: '',
                          repositoryLocation: '',
                          repositoryUniqueId: '',
                          homeCommunityId: '',
                          allowPatientUpload: false,
                          patientUploadMaxSize: 10485760,
                          patientUploadAllowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff']
                        };
                        setLocationForm({
                          ...locationForm,
                          xdsRegistry: { ...currentXds, enabled: e.target.checked }
                        });
                        console.log('[Location Form] Toggle XDS enabled to:', e.target.checked);
                        console.log('[Location Form] New xdsRegistry:', { ...currentXds, enabled: e.target.checked });
                      }}
                    />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      XDS Registry aktivieren
                    </Typography>
                  </Box>
                  
                  {locationForm.xdsRegistry.enabled && (
                    <>
                      <TextField
                        fullWidth
                        label="Registry URL"
                        value={locationForm.xdsRegistry.registryUrl || ''}
                        onChange={(e) => setLocationForm({
                          ...locationForm,
                          xdsRegistry: { ...locationForm.xdsRegistry, registryUrl: e.target.value }
                        })}
                        placeholder="https://xds-registry.example.com"
                        helperText="URL zur XDS Registry (optional)"
                      />
                      <TextField
                        fullWidth
                        label="Repository Location"
                        value={locationForm.xdsRegistry.repositoryLocation || ''}
                        onChange={(e) => setLocationForm({
                          ...locationForm,
                          xdsRegistry: { ...locationForm.xdsRegistry, repositoryLocation: e.target.value }
                        })}
                        placeholder="/path/to/repository oder leer für Standardpfad"
                        helperText="Pfad zum File Repository (leer = Standardpfad)"
                      />
                      <TextField
                        fullWidth
                        label="Repository Unique ID"
                        value={locationForm.xdsRegistry.repositoryUniqueId || ''}
                        onChange={(e) => setLocationForm({
                          ...locationForm,
                          xdsRegistry: { ...locationForm.xdsRegistry, repositoryUniqueId: e.target.value }
                        })}
                        placeholder="1.2.40.0.34.x.x.x"
                        helperText="Eindeutige ID für dieses Repository (OID-Format)"
                      />
                      <TextField
                        fullWidth
                        label="Home Community ID"
                        value={locationForm.xdsRegistry.homeCommunityId || ''}
                        onChange={(e) => setLocationForm({
                          ...locationForm,
                          xdsRegistry: { ...locationForm.xdsRegistry, homeCommunityId: e.target.value }
                        })}
                        placeholder="urn:oid:1.2.40.0.34.x.x.x"
                        helperText="Home Community ID für XCA (Cross-Community Access)"
                      />
                      
                      <Box display="flex" alignItems="center">
                        <Switch
                          checked={locationForm.xdsRegistry.allowPatientUpload || false}
                          onChange={(e) => setLocationForm({
                            ...locationForm,
                            xdsRegistry: { ...locationForm.xdsRegistry, allowPatientUpload: e.target.checked }
                          })}
                        />
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          Patienten-Upload erlauben
                        </Typography>
                      </Box>
                      
                      {locationForm.xdsRegistry.allowPatientUpload && (
                        <>
                          <TextField
                            fullWidth
                            type="number"
                            label="Max. Dateigröße (Bytes)"
                            value={locationForm.xdsRegistry.patientUploadMaxSize || 10485760}
                            onChange={(e) => setLocationForm({
                              ...locationForm,
                              xdsRegistry: { ...locationForm.xdsRegistry, patientUploadMaxSize: parseInt(e.target.value) }
                            })}
                            helperText={`Aktuell: ${((locationForm.xdsRegistry.patientUploadMaxSize || 10485760) / 1024 / 1024).toFixed(2)} MB`}
                          />
                        </>
                      )}
                    </>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLocationDialogClose}>Abbrechen</Button>
          <Button onClick={handleLocationSubmit} variant="contained">
            {editingLocation ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hours Dialog */}
      <Dialog open={hoursDialogOpen} onClose={handleHoursDialogClose} maxWidth="sm" fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <GradientDialogTitle
          isEdit={!!editingHours}
          title={editingHours ? 'Öffnungszeiten bearbeiten' : 'Neue Öffnungszeiten'}
          icon={<ScheduleIcon />}
          gradientColors={{ from: '#059669', to: '#047857' }}
        />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Standort</InputLabel>
              <Select
                value={hoursForm.location_id || ''}
                onChange={(e) => setHoursForm({ ...hoursForm, location_id: e.target.value })}
                required
              >
                {(Array.isArray(locations) ? locations : []).map((location) => (
                  <MenuItem key={location._id} value={location._id}>
                    {location.name} ({location.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Bezeichnung"
              value={hoursForm.label}
              onChange={(e) => setHoursForm({ ...hoursForm, label: e.target.value })}
              placeholder="z.B. Standard, Notdienst, etc."
            />
            <TextField
              fullWidth
              label="RRULE (iCal Format)"
              value={hoursForm.rrule}
              onChange={(e) => setHoursForm({ ...hoursForm, rrule: e.target.value })}
              placeholder="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8,9,10,11,13,14,15,16"
              multiline
              rows={3}
              helperText="Beispiel: FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8,9,10,11,13,14,15,16"
              required
            />
            <FormControl fullWidth>
              <InputLabel>Zeitzone</InputLabel>
              <Select
                value={hoursForm.timezone}
                onChange={(e) => setHoursForm({ ...hoursForm, timezone: e.target.value })}
                required
              >
                <MenuItem value="Europe/Vienna">Europe/Vienna</MenuItem>
                <MenuItem value="Europe/Berlin">Europe/Berlin</MenuItem>
                <MenuItem value="Europe/Zurich">Europe/Zurich</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleHoursDialogClose}>Abbrechen</Button>
          <Button 
            onClick={() => handleHoursSubmit(hoursForm.location_id || '')} 
            variant="contained"
            disabled={!hoursForm.location_id || !hoursForm.rrule}
          >
            {editingHours ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Closure Dialog */}
      <Dialog open={closureDialogOpen} onClose={handleClosureDialogClose} maxWidth="sm" fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <GradientDialogTitle
          isEdit={!!editingClosure}
          title={editingClosure ? 'Schließtag bearbeiten' : 'Neuer Schließtag'}
          icon={<CancelIcon />}
          gradientColors={{ from: '#dc2626', to: '#b91c1c' }}
        />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Standort</InputLabel>
              <Select
                value={closureForm.location_id || ''}
                onChange={(e) => setClosureForm({ ...closureForm, location_id: e.target.value })}
                required
              >
                {(Array.isArray(locations) ? locations : []).map((location) => (
                  <MenuItem key={location._id} value={location._id}>
                    {location.name} ({location.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Grund"
              value={closureForm.reason}
              onChange={(e) => setClosureForm({ ...closureForm, reason: e.target.value })}
              placeholder="z.B. Feiertag, Wartung, Teamklausur"
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Von"
                type="datetime-local"
                value={closureForm.starts_at}
                onChange={(e) => setClosureForm({ ...closureForm, starts_at: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                label="Bis"
                type="datetime-local"
                value={closureForm.ends_at}
                onChange={(e) => setClosureForm({ ...closureForm, ends_at: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosureDialogClose}>Abbrechen</Button>
          <Button 
            onClick={() => handleClosureSubmit(closureForm.location_id || '')} 
            variant="contained"
            disabled={!closureForm.location_id || !closureForm.reason || !closureForm.starts_at || !closureForm.ends_at}
          >
            {editingClosure ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={assignmentDialogOpen} onClose={handleAssignmentDialogClose} maxWidth="sm" fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <GradientDialogTitle
          isEdit={!!editingAssignment}
          title={editingAssignment ? 'Personal-Zuweisung bearbeiten' : 'Neue Personal-Zuweisung'}
          icon={<PeopleIcon />}
          gradientColors={{ from: '#7c3aed', to: '#6d28d9' }}
        />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Personal</InputLabel>
              <Select
                value={assignmentForm.staff_id || ''}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, staff_id: e.target.value })}
                required
              >
                {(Array.isArray(staffProfiles) ? staffProfiles : []).map((staff) => (
                  <MenuItem key={staff._id} value={staff._id}>
                    {staff.first_name} {staff.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Standort</InputLabel>
              <Select
                value={assignmentForm.location_id || ''}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, location_id: e.target.value })}
                required
              >
                {(Array.isArray(locations) ? locations : []).map((location) => (
                  <MenuItem key={location._id} value={location._id}>
                    {location.name} ({location.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box display="flex" alignItems="center">
              <Switch
                checked={assignmentForm.is_primary}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, is_primary: e.target.checked })}
              />
              <Typography variant="body2" sx={{ ml: 1 }}>
                Primärer Standort
              </Typography>
            </Box>
            <TextField
              fullWidth
              label="Erlaubte Services (kommagetrennt)"
              value={assignmentForm.allowed_services.join(', ')}
              onChange={(e) => setAssignmentForm({ 
                ...assignmentForm, 
                allowed_services: e.target.value.split(',').map(s => s.trim()).filter(s => s)
              })}
              placeholder="z.B. Allgemeinmedizin, Kardiologie, Dermatologie"
              helperText="Leer lassen für alle Services"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAssignmentDialogClose}>Abbrechen</Button>
          <Button 
            onClick={handleAssignmentSubmit} 
            variant="contained"
            disabled={!assignmentForm.staff_id || !assignmentForm.location_id}
          >
            {editingAssignment ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Weekly Schedule Dialog */}
      {weeklyScheduleDialogOpen && (
        <LocationWeeklyScheduleComponent
          locationId={selectedLocationForSchedule?._id}
          locationName={selectedLocationForSchedule?.name}
          locations={locations}
          onSave={handleWeeklyScheduleSave}
          onCancel={handleWeeklyScheduleDialogClose}
          initialData={editingWeeklySchedule ? {
            locationId: editingWeeklySchedule.location_id._id,
            validFrom: new Date(editingWeeklySchedule.validFrom),
            validTo: editingWeeklySchedule.validTo ? new Date(editingWeeklySchedule.validTo) : undefined,
            schedules: editingWeeklySchedule.schedules
          } : undefined}
        />
      )}
    </Box>
  );
};

export default LocationManagement;
