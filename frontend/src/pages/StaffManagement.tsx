import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
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
  FormControlLabel,
  InputAdornment,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Alert,
  Snackbar,
  Badge,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  EventBusy as EventBusyIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  LocationOn as LocationOnIcon,
  CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material';
import GradientDialogTitle from '../components/GradientDialogTitle';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { eventBus, EVENTS } from '../utils/eventBus';
import {
  fetchStaffProfiles,
  createStaffProfile,
  updateStaffProfile,
  deleteStaffProfile,
  toggleStaffStatus,
  fetchAbsences,
  createAbsence,
  updateAbsence,
  deleteAbsence,
  approveAbsence,
  fetchStaffStatistics,
} from '../store/slices/staffSlice';
import { deleteWeeklySchedulesByStaffId, cleanupOrphanedSchedules, fetchWeeklySchedules } from '../store/slices/weeklyScheduleSlice';
import WeeklySchedule, { WeeklyScheduleData } from '../components/WeeklySchedule';
import WeeklyScheduleOverview from '../components/WeeklyScheduleOverview';

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
      id={`staff-tabpanel-${index}`}
      aria-labelledby={`staff-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const StaffManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    staffProfiles,
    loading,
    error,
  } = useAppSelector((state) => state.staff);

  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [dialogType, setDialogType] = useState<'profile' | 'absence' | 'weekly-schedule'>('profile');
  const [formData, setFormData] = useState<any>({});
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    title: '',
    roleHint: '',
    specialization: '',
    phone: '',
    email: '',
    color_hex: '#2563EB',
    isActive: true,
    isOnlineBookable: false,
  });
  const [absenceForm, setAbsenceForm] = useState({
    staffId: '',
    startsAt: '',
    endsAt: '',
    reason: '',
    urgency: 'medium',
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [weeklyScheduleOpen, setWeeklyScheduleOpen] = useState(false);
  const [selectedStaffForSchedule, setSelectedStaffForSchedule] = useState<any>(null);
  const [scheduleOverviewOpen, setScheduleOverviewOpen] = useState(false);
  const [locationAssignmentsOpen, setLocationAssignmentsOpen] = useState(false);
  const [selectedStaffForLocations, setSelectedStaffForLocations] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [locationAssignments, setLocationAssignments] = useState<any[]>([]);

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5001/api/locations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          setLocations(data.data || []);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Standorte:', error);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    dispatch(fetchStaffProfiles());
    dispatch(fetchAbsences());
    dispatch(fetchStaffStatistics());
  }, [dispatch]);

  // Force refresh data when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, refreshing staff data...');
        dispatch(fetchStaffProfiles());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [dispatch]);

  // Listen for user deletion events to refresh staff data
  useEffect(() => {
    const handleUserDeleted = (data: any) => {
      console.log('User deleted event received in StaffManagement:', data);
      console.log('Refreshing staff data after user deletion...');
      
      // Remove schedules from Redux store immediately
      dispatch(deleteWeeklySchedulesByStaffId(data.userId));
      
      // Force refresh all staff-related data
      dispatch(fetchStaffProfiles());
      dispatch(fetchAbsences());
      dispatch(fetchStaffStatistics());
    };

    eventBus.on(EVENTS.USER_DELETED, handleUserDeleted);
    
    return () => {
      eventBus.off(EVENTS.USER_DELETED, handleUserDeleted);
    };
  }, [dispatch]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleOpenDialog = (mode: 'add' | 'edit', type: 'profile' | 'absence' | 'weekly-schedule', item?: any) => {
    setDialogMode(mode);
    setDialogType(type);
    setOpenDialog(true);
    
    if (mode === 'edit' && item) {
      setFormData(item);
      if (type === 'profile') {
        setProfileForm({
          displayName: item.display_name || '',
          title: item.title || '',
          roleHint: item.roleHint || '',
          specialization: item.specialization || '',
          phone: item.phone || '',
          email: item.email || '',
          color_hex: item.color_hex || '#2563EB',
          isActive: item.isActive || false,
          isOnlineBookable: item.isOnlineBookable || false,
        });
      } else if (type === 'absence') {
        setAbsenceForm({
          staffId: item.staffId?._id || '',
          startsAt: item.startsAt ? new Date(item.startsAt).toISOString().slice(0, 10) : '',
          endsAt: item.endsAt ? new Date(item.endsAt).toISOString().slice(0, 10) : '',
          reason: item.reason || '',
          urgency: item.urgency || 'medium',
        });
      }
    } else {
      setFormData({});
      // Reset forms to default values
      setProfileForm({
        displayName: '',
        title: '',
        roleHint: '',
        specialization: '',
        phone: '',
        email: '',
        color_hex: '#2563EB',
        isActive: true,
        isOnlineBookable: false,
      });
      setAbsenceForm({
        staffId: '',
        startsAt: '',
        endsAt: '',
        reason: '',
        urgency: 'medium',
      });
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({});
  };

  const handleOpenWeeklySchedule = async (staff: any) => {
    setSelectedStaffForSchedule(staff);
    
    // Lade bestehende Arbeitszeiten für diesen Mitarbeiter
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/weekly-schedules?staffId=${staff._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        // Wenn existierende Arbeitszeiten gefunden wurden, lade den ersten
        const schedule = data.data[0];
        setSelectedStaffForSchedule({
          ...staff,
          existingSchedule: schedule
        });
        setSnackbar({ open: true, message: 'Bestehende Arbeitszeiten geladen. Sie können diese jetzt bearbeiten.', severity: 'info' });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Arbeitszeiten:', error);
    }
    
    setWeeklyScheduleOpen(true);
  };

  const handleCloseWeeklySchedule = () => {
    setWeeklyScheduleOpen(false);
    setSelectedStaffForSchedule(null);
  };

  const handleOpenScheduleOverview = () => {
    setScheduleOverviewOpen(true);
  };

  const handleCloseScheduleOverview = () => {
    setScheduleOverviewOpen(false);
  };

  const handleOpenLocationAssignments = async (staff: any) => {
    setSelectedStaffForLocations(staff);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/staff-location-assignments?staff_id=${staff._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setLocationAssignments(data.data || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Standort-Zuweisungen:', error);
    }
    setLocationAssignmentsOpen(true);
  };

  const handleCloseLocationAssignments = () => {
    setLocationAssignmentsOpen(false);
    setSelectedStaffForLocations(null);
    setLocationAssignments([]);
  };

  const handleAddLocationAssignment = async (locationId: string, isPrimary: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/staff-location-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          staff_id: selectedStaffForLocations._id,
          location_id: locationId,
          is_primary: isPrimary
        })
      });
      const data = await response.json();
      if (data.success) {
        setSnackbar({ open: true, message: 'Standort-Zuweisung erfolgreich hinzugefügt', severity: 'success' });
        handleCloseLocationAssignments();
        dispatch(fetchStaffProfiles()); // Refresh staff profiles
      } else {
        setSnackbar({ open: true, message: data.message || 'Fehler beim Hinzufügen der Standort-Zuweisung', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Fehler beim Hinzufügen der Standort-Zuweisung', severity: 'error' });
    }
  };

  const handleDeleteLocationAssignment = async (assignmentId: string) => {
    if (window.confirm('Möchten Sie diese Standort-Zuweisung wirklich löschen?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5001/api/staff-location-assignments/${assignmentId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          setSnackbar({ open: true, message: 'Standort-Zuweisung erfolgreich gelöscht', severity: 'success' });
          // Refresh location assignments
          if (selectedStaffForLocations) {
            handleOpenLocationAssignments(selectedStaffForLocations);
          }
          dispatch(fetchStaffProfiles()); // Refresh staff profiles
        } else {
          setSnackbar({ open: true, message: data.message || 'Fehler beim Löschen der Standort-Zuweisung', severity: 'error' });
        }
      } catch (error) {
        setSnackbar({ open: true, message: 'Fehler beim Löschen der Standort-Zuweisung', severity: 'error' });
      }
    }
  };

  const handleRefreshData = () => {
    console.log('Manually refreshing staff data...');
    dispatch(fetchStaffProfiles());
    dispatch(fetchAbsences());
    dispatch(fetchStaffStatistics());
    setSnackbar({ open: true, message: 'Daten werden aktualisiert...', severity: 'info' });
  };

  const handleCleanupOrphanedSchedules = async () => {
    if (window.confirm('Möchten Sie verwaiste Arbeitszeiten bereinigen? Dies entfernt alle Arbeitszeiten, die zu gelöschten Benutzern gehören.')) {
      try {
        const result = await dispatch(cleanupOrphanedSchedules()).unwrap();
        setSnackbar({ 
          open: true, 
          message: (result as any).message || 'Bereinigung abgeschlossen', 
          severity: 'success' 
        });
        
        // Refresh data after cleanup
        dispatch(fetchStaffProfiles());
        dispatch(fetchWeeklySchedules());
      } catch (error: any) {
        setSnackbar({ 
          open: true, 
          message: error.message || 'Fehler beim Bereinigen', 
          severity: 'error' 
        });
      }
    }
  };

  const handleSaveWeeklySchedule = async (scheduleData: WeeklyScheduleData) => {
    try {
      const token = localStorage.getItem('token');
      const isEdit = (scheduleData as any)._id;
      
      const url = isEdit 
        ? `http://localhost:5001/api/weekly-schedules/${(scheduleData as any)._id}`
        : 'http://localhost:5001/api/weekly-schedules';
      
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(scheduleData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Speichern');
      }

      const result = await response.json();
      console.log('Weekly schedule saved:', result);
      setSnackbar({ open: true, message: isEdit ? 'Wiederkehrende Arbeitszeiten erfolgreich aktualisiert' : 'Wiederkehrende Arbeitszeiten erfolgreich gespeichert', severity: 'success' });
      handleCloseWeeklySchedule();
    } catch (error) {
      console.error('Error saving weekly schedule:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setSnackbar({ open: true, message: `Fehler beim Speichern der wiederkehrenden Arbeitszeiten: ${errorMessage}`, severity: 'error' });
    }
  };

  const handleSave = async () => {
    try {
      if (dialogType === 'profile') {
        // Profile creation is handled through user management
        setSnackbar({ open: true, message: 'Personalprofile werden über die Benutzerverwaltung erstellt', severity: 'info' });
        handleCloseDialog();
      } else if (dialogType === 'absence') {
        const absenceData = {
          staffId: absenceForm.staffId,
          startsAt: new Date(absenceForm.startsAt).toISOString(),
          endsAt: new Date(absenceForm.endsAt).toISOString(),
          reason: absenceForm.reason,
          urgency: absenceForm.urgency,
        };
        
        if (dialogMode === 'add') {
          await dispatch(createAbsence(absenceData)).unwrap();
          setSnackbar({ open: true, message: 'Abwesenheit erfolgreich erstellt', severity: 'success' });
        } else {
          await dispatch(updateAbsence({ id: formData._id, absenceData })).unwrap();
          setSnackbar({ open: true, message: 'Abwesenheit erfolgreich aktualisiert', severity: 'success' });
        }
        dispatch(fetchAbsences());
      }
      handleCloseDialog();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Fehler beim Speichern', severity: 'error' });
    }
  };

  const handleDelete = async (id: string, type: 'profile' | 'absence') => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Eintrag löschen möchten?')) {
      try {
        if (type === 'profile') {
          await dispatch(deleteStaffProfile(id)).unwrap();
          setSnackbar({ open: true, message: 'Personalprofil erfolgreich gelöscht', severity: 'success' });
        } else if (type === 'absence') {
          await dispatch(deleteAbsence(id)).unwrap();
          setSnackbar({ open: true, message: 'Abwesenheit erfolgreich gelöscht', severity: 'success' });
        }
      } catch (error: any) {
        setSnackbar({ open: true, message: error.message || 'Fehler beim Löschen', severity: 'error' });
      }
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await dispatch(toggleStaffStatus(id)).unwrap();
      setSnackbar({ open: true, message: 'Status erfolgreich geändert', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Fehler beim Ändern des Status', severity: 'error' });
    }
  };

  const handleApproveAbsence = async (id: string, status: 'approved' | 'rejected', comment?: string) => {
    try {
      await dispatch(approveAbsence(id)).unwrap();
      setSnackbar({ 
        open: true, 
        message: `Abwesenheit ${status === 'approved' ? 'genehmigt' : 'abgelehnt'}`, 
        severity: 'success' 
      });
      dispatch(fetchAbsences());
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Fehler beim Genehmigen', severity: 'error' });
    }
  };

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      arzt: '#2196F3',
      doctor: '#2196F3', // Add doctor as alias for arzt
      assistenz: '#4CAF50',
      therapeut: '#FF9800',
      admin: '#9C27B0',
    };
    return colors[role] || '#757575';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      active: '#4CAF50',
      inactive: '#F44336',
      pending: '#FF9800',
      approved: '#4CAF50',
      rejected: '#F44336',
      cancelled: '#757575',
    };
    return colors[status] || '#757575';
  };

  const getUrgencyColor = (urgency: string) => {
    const colors: { [key: string]: string } = {
      low: '#4CAF50',
      medium: '#FF9800',
      high: '#FF5722',
      urgent: '#F44336',
    };
    return colors[urgency] || '#757575';
  };

  const filteredProfiles = (Array.isArray(staffProfiles) ? staffProfiles : []).filter(profile => {
    const displayName = profile.display_name || '';
    const email = profile.email || '';
    const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && profile.isActive) ||
                         (filterStatus === 'inactive' && !profile.isActive);
    return matchesSearch && matchesStatus;
  });

  // Debug logging
  console.log('StaffManagement Debug:', {
    staffProfilesCount: staffProfiles.length,
    staffProfiles: staffProfiles.map(p => ({
      _id: p._id,
      display_name: p.display_name,
      email: p.email,
      role: p.role,
      isActive: p.isActive
    })),
    filteredProfilesCount: filteredProfiles.length,
    searchTerm,
    filterStatus
  });

  // Absences State
  const [absences, setAbsences] = useState<any[]>([]);
  const [pendingAbsences, setPendingAbsences] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>({
    totalStaff: filteredProfiles.length,
    activeStaff: filteredProfiles.filter(p => p.isActive).length,
    inactiveStaff: filteredProfiles.filter(p => !p.isActive).length,
    pendingAbsences: 0,
    totalAbsences: 0
  });

  // Load absences data
  useEffect(() => {
    const loadAbsences = async () => {
      try {
        // Mock data for now - replace with actual API call
        const mockAbsences = [
          {
            id: '1',
            staffId: '1',
            staffName: 'Dr. Mustermann',
            type: 'Urlaub',
            startDate: '2024-01-15',
            endDate: '2024-01-20',
            status: 'approved',
            reason: 'Familienurlaub'
          },
          {
            id: '2',
            staffId: '2',
            staffName: 'Maria Schmidt',
            type: 'Krankheit',
            startDate: '2024-01-10',
            endDate: '2024-01-12',
            status: 'pending',
            reason: 'Grippe'
          }
        ];
        
        setAbsences(mockAbsences);
        setPendingAbsences(mockAbsences.filter(a => a.status === 'pending'));
        
        // Update statistics
        setStatistics((prev: any) => ({
          ...prev,
          pendingAbsences: mockAbsences.filter(a => a.status === 'pending').length,
          totalAbsences: mockAbsences.length
        }));
      } catch (error) {
        console.error('Error loading absences:', error);
      }
    };

    loadAbsences();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Personalverwaltung
      </Typography>

      {/* Statistics Cards */}
      {Object.keys(statistics).length > 0 && (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3,
          mb: 3 
        }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PersonIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="primary">
                {statistics.totalProfiles || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gesamt Personal
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="success.main">
                {statistics.activeProfiles}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Aktive Mitarbeiter
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={statistics.pendingApprovals} color="error">
                <EventBusyIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
              </Badge>
              <Typography variant="h4" color="warning.main">
                {statistics.totalAbsences}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Abwesenheiten
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Personalprofile" />
            <Tab label="Abwesenheiten" />
          </Tabs>
        </Box>

        {/* Personalprofile Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Personal suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">Alle</MenuItem>
                  <MenuItem value="active">Aktiv</MenuItem>
                  <MenuItem value="inactive">Inaktiv</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefreshData}
                size="small"
              >
                Aktualisieren
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<DeleteIcon />}
                onClick={handleCleanupOrphanedSchedules}
                size="small"
              >
                Verwaiste Arbeitszeiten bereinigen
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog('add', 'profile')}
              >
                Neues Profil
              </Button>
                     <Button
                       variant="outlined"
                       startIcon={<ScheduleIcon />}
                       onClick={handleOpenScheduleOverview}
                     >
                       Arbeitszeiten-Übersicht
                     </Button>
            </Box>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Mitarbeiter</TableCell>
                  <TableCell>Rolle</TableCell>
                  <TableCell>Spezialisierung</TableCell>
                  <TableCell>Standort</TableCell>
                  <TableCell>Online-Buchung</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: profile.color_hex || '#757575' }}>
                          {(profile.display_name || 'U').charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {profile.display_name || 'Unbekannt'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {profile.email || '-'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={profile.role === 'doctor' ? 'Arzt' : profile.role}
                        size="small"
                        sx={{ bgcolor: getRoleColor(profile.role), color: 'white' }}
                      />
                    </TableCell>
                    <TableCell>
                      {profile.department || '-'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {profile.locations && profile.locations.length > 0 ? (
                          profile.locations.map((location: any, index: number) => (
                            <Chip
                              key={index}
                              label={typeof location === 'string' ? location : location.name}
                              size="small"
                              color={index === 0 ? 'primary' : 'default'}
                              icon={<LocationOnIcon />}
                              sx={{ fontSize: '0.75rem' }}
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Keine Standorte
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={profile.isActive ? 'Ja' : 'Nein'}
                        size="small"
                        color={profile.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={profile.isActive ? 'Aktiv' : 'Inaktiv'}
                        size="small"
                        color={profile.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                             <IconButton
                               size="small"
                               onClick={() => handleOpenLocationAssignments(profile)}
                               title="Standort-Zuweisungen verwalten"
                               color="primary"
                             >
                               <LocationOnIcon />
                             </IconButton>
                             <IconButton
                               size="small"
                               onClick={() => handleOpenWeeklySchedule(profile)}
                               title="Wiederkehrende Arbeitszeiten"
                             >
                               <ScheduleIcon />
                             </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog('edit', 'profile', profile)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleStatus(profile._id)}
                      >
                        <Switch
                          checked={profile.isActive}
                          size="small"
                        />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(profile._id, 'profile')}
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


        {/* Abwesenheiten Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6">Abwesenheiten</Typography>
              {pendingAbsences.length > 0 && (
                <Chip
                  label={`${pendingAbsences.length} ausstehend`}
                  color="warning"
                  size="small"
                />
              )}
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('add', 'absence')}
            >
              Neue Abwesenheit
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Mitarbeiter</TableCell>
                  <TableCell>Zeitraum</TableCell>
                  <TableCell>Grund</TableCell>
                  <TableCell>Dringlichkeit</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {absences.map((absence) => (
                  <TableRow key={absence._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: absence.staffId?.color_hex || '#757575', width: 32, height: 32 }}>
                          {(absence.staffId?.display_name || 'U').charAt(0)}
                        </Avatar>
                        {absence.staffId?.display_name || 'Unbekannt'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(absence.startsAt).toLocaleDateString('de-DE')} - {new Date(absence.endsAt).toLocaleDateString('de-DE')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={absence.reason}
                        size="small"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={absence.urgency}
                        size="small"
                        sx={{ bgcolor: getUrgencyColor(absence.urgency), color: 'white' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={absence.status}
                        size="small"
                        sx={{ bgcolor: getStatusColor(absence.status), color: 'white' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {absence.status === 'pending' && (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => handleApproveAbsence(absence._id, 'approved')}
                            color="success"
                          >
                            <CheckCircleIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleApproveAbsence(absence._id, 'rejected')}
                            color="error"
                          >
                            <CancelIcon />
                          </IconButton>
                        </>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog('edit', 'absence', absence)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(absence._id, 'absence')}
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
      </Card>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <GradientDialogTitle
          isEdit={dialogMode === 'edit'}
          title={`${dialogMode === 'add' ? 'Neue' : 'Bearbeite'} ${dialogType === 'profile' ? 'Personalprofil' : 'Abwesenheit'}`}
          icon={dialogType === 'profile' ? <PersonIcon /> : <CalendarTodayIcon />}
          gradientColors={{ from: '#f59e0b', to: '#d97706' }}
        />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          {dialogType === 'profile' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Personalprofile werden über die Benutzerverwaltung erstellt. 
                Bitte verwenden Sie die Benutzerverwaltung, um neue Mitarbeiter hinzuzufügen.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  handleCloseDialog();
                  // Navigate to user management
                  window.location.href = '/users';
                }}
              >
                Zur Benutzerverwaltung
              </Button>
            </Box>
          )}
          
          
          {dialogType === 'absence' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Mitarbeiter</InputLabel>
                <Select
                  value={absenceForm.staffId || ''}
                  onChange={(e) => setAbsenceForm({ ...absenceForm, staffId: e.target.value })}
                  label="Mitarbeiter"
                >
                  {staffProfiles.map((profile) => (
                    <MenuItem key={profile._id} value={profile._id}>
                      {profile.display_name || 'Unbekannt'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Startdatum"
                type="date"
                value={absenceForm.startsAt || ''}
                onChange={(e) => setAbsenceForm({ ...absenceForm, startsAt: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                label="Enddatum"
                type="date"
                value={absenceForm.endsAt || ''}
                onChange={(e) => setAbsenceForm({ ...absenceForm, endsAt: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                label="Grund"
                value={absenceForm.reason || ''}
                onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
                placeholder="z.B. Urlaub, Krankheit, Fortbildung, etc."
                required
              />
              <FormControl fullWidth required>
                <InputLabel>Dringlichkeit</InputLabel>
                <Select
                  value={absenceForm.urgency || ''}
                  onChange={(e) => setAbsenceForm({ ...absenceForm, urgency: e.target.value })}
                  label="Dringlichkeit"
                >
                  <MenuItem value="low">Niedrig</MenuItem>
                  <MenuItem value="medium">Mittel</MenuItem>
                  <MenuItem value="high">Hoch</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSave} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Weekly Schedule Dialog */}
      {weeklyScheduleOpen && selectedStaffForSchedule && (
        <WeeklySchedule
          staffId={selectedStaffForSchedule._id}
          staffName={selectedStaffForSchedule.display_name || 'Unbekannt'}
          onSave={handleSaveWeeklySchedule}
          onCancel={handleCloseWeeklySchedule}
          initialData={selectedStaffForSchedule.existingSchedule ? {
            _id: selectedStaffForSchedule.existingSchedule._id,
            staffId: selectedStaffForSchedule._id,
            schedules: selectedStaffForSchedule.existingSchedule.schedules,
            validFrom: new Date(selectedStaffForSchedule.existingSchedule.validFrom),
            validTo: selectedStaffForSchedule.existingSchedule.validTo ? new Date(selectedStaffForSchedule.existingSchedule.validTo) : undefined,
          } : undefined}
        />
      )}

      {/* Weekly Schedule Overview Dialog */}
      <WeeklyScheduleOverview
        open={scheduleOverviewOpen}
        onClose={handleCloseScheduleOverview}
      />

      {/* Location Assignments Dialog */}
      <Dialog 
        open={locationAssignmentsOpen} 
        onClose={handleCloseLocationAssignments} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <GradientDialogTitle
          isEdit={false}
          title={`Standort-Zuweisungen für ${selectedStaffForLocations?.display_name || 'Mitarbeiter'}`}
          icon={<LocationOnIcon />}
          gradientColors={{ from: '#7c3aed', to: '#6d28d9' }}
        />
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Zugewiesene Standorte:
              </Typography>
              {locationAssignments.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {locationAssignments.map((assignment) => (
                    <Box key={assignment._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1 }}>
                      <Typography variant="body2">
                        {assignment.location_id?.name || 'Unbekannter Standort'}
                        {assignment.is_primary && <Chip label="Primär" size="small" color="primary" sx={{ ml: 1 }} />}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteLocationAssignment(assignment._id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Noch keine Standorte zugewiesen
                </Typography>
              )}
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="subtitle2" gutterBottom>
              Neuen Standort zuweisen:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Standort</InputLabel>
                <Select
                  id="location-select"
                  label="Standort"
                  value=""
                  onChange={(e) => {
                    const locationId = e.target.value;
                    const existingAssignment = locationAssignments.find(
                      (a) => a.location_id?._id === locationId
                    );
                    if (!existingAssignment) {
                      const hasPrimary = locationAssignments.some((a) => a.is_primary);
                      handleAddLocationAssignment(locationId, !hasPrimary);
                    }
                  }}
                >
                  {locations.map((location) => {
                    const isAssigned = locationAssignments.some(
                      (a) => a.location_id?._id === location._id
                    );
                    return (
                      <MenuItem key={location._id} value={location._id} disabled={isAssigned}>
                        {location.name} ({location.code})
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLocationAssignments}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

export default StaffManagement;
