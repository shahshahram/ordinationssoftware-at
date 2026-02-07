import React, { useState, useEffect } from 'react';
import { eventBus, EVENTS } from '../utils/eventBus';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogContent,
  DialogActions,
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
  Tooltip,
  Tabs,
  Tab,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import GradientDialogTitle from '../components/GradientDialogTitle';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setUserProfilePhoto } from '../store/slices/authSlice';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';
import api, { getUserPhotoUrl } from '../utils/api';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  Person,
  AdminPanelSettings,
  LocalHospital,
  Support,
  Receipt,
  Assistant,
  Lock,
  LockOpen,
  HelpOutline as HelpOutlineIcon,
  PhotoCamera,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
} from '@mui/icons-material';

interface User {
  _id?: string;
  id?: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin' | 'arzt' | 'assistent' | 'rezeption' | 'billing' | 'patient';
  isActive: boolean;
  color_hex?: string;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  profilePhoto?: { filename?: string; uploadedAt?: string };
  profile?: {
    title?: string;
    specialization?: string;
    phone?: string;
    workingHours?: any;
  };
}

const Users: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const { marginTopValue } = useGlobalNavigationOffset();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'view'>('add');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'warning' | 'info' 
  });
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTabUsers, setHelpTabUsers] = useState(0);
  const [photoFileInputRef, setPhotoFileInputRef] = useState<HTMLInputElement | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');

  const [formData, setFormData] = useState<Partial<User>>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'assistent',
    isActive: true,
    color_hex: '#10B981',
    profile: {
      title: '',
      specialization: '',
      phone: ''
    }
  });

  // Load users
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { isActive: statusFilter === 'active' ? 'true' : 'false' })
      });

      const response = await fetch(`http://localhost:5001/api/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data);
        setTotalUsers(data.pagination.total);
      }
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Laden der Benutzer', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    // Formular komplett zurücksetzen
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'assistent',
      isActive: true,
      color_hex: '#10B981',
      profile: {
        title: '',
        specialization: '',
        phone: ''
      }
    });
    setDialogMode('add');
    // Passwort-Sichtbarkeit zurücksetzen
    setShowPassword(false);
    // Suchfeld zurücksetzen, damit keine Filterung stattfindet
    setSearchTerm('');
    setOpenDialog(true);
  };

  const handleEdit = (user: User) => {
    setFormData(user);
    setDialogMode('edit');
    setOpenDialog(true);
  };

  const handleView = (user: User) => {
    setFormData(user);
    setDialogMode('view');
    setOpenDialog(true);
  };

  const handleDelete = async (user: User) => {
    if (window.confirm(`Möchten Sie den Benutzer "${user.firstName} ${user.lastName}" wirklich löschen?`)) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5001/api/users/${user._id || user.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          let message = 'Benutzer erfolgreich gelöscht';
          
          if (data.deletedSchedules > 0) {
            message += ` (${data.deletedSchedules} Arbeitszeiten entfernt)`;
          }
          
          if (data.deletedProfile) {
            message += ' (Personalprofil entfernt)';
          }
          
          if (data.remainingAppointments > 0) {
            message += ` (${data.remainingAppointments} Termine bleiben erhalten)`;
          }
          
          setSnackbar({ 
            open: true, 
            message, 
            severity: 'success' 
          });
          
          // Emit event to notify other components
          eventBus.emit(EVENTS.USER_DELETED, {
            userId: user._id || user.id,
            deletedSchedules: data.deletedSchedules,
            deletedProfile: data.deletedProfile,
            remainingAppointments: data.remainingAppointments
          });
          
          loadUsers();
        } else {
          const data = await response.json();
          setSnackbar({ 
            open: true, 
            message: data.message || 'Fehler beim Löschen des Benutzers', 
            severity: 'error' 
          });
        }
      } catch (error) {
        setSnackbar({ 
          open: true, 
          message: 'Fehler beim Löschen des Benutzers', 
          severity: 'error' 
        });
      }
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/users/${user._id || user.id}/toggle-status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        setSnackbar({ 
          open: true, 
          message: `Benutzer ${user.isActive ? 'deaktiviert' : 'aktiviert'}`, 
          severity: 'success' 
        });
        loadUsers();
      } else {
        const data = await response.json();
        setSnackbar({ 
          open: true, 
          message: data.message || 'Fehler beim Ändern des Status', 
          severity: 'error' 
        });
      }
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Ändern des Status', 
        severity: 'error' 
      });
    }
  };

  const handleSave = async () => {
    try {
      // Client-side validation
      if (!formData.email || !formData.firstName || !formData.lastName || !formData.role) {
        setSnackbar({ 
          open: true, 
          message: 'Bitte füllen Sie alle Pflichtfelder aus', 
          severity: 'error' 
        });
        return;
      }

      if (dialogMode === 'add' && (!formData.password || formData.password.length < 6)) {
        setSnackbar({ 
          open: true, 
          message: 'Das Passwort muss mindestens 6 Zeichen lang sein', 
          severity: 'error' 
        });
        return;
      }

      const token = localStorage.getItem('token');
      const url = dialogMode === 'add' 
        ? 'http://localhost:5001/api/users'
        : `http://localhost:5001/api/users/${formData._id || formData.id}`;
      
      const method = dialogMode === 'add' ? 'POST' : 'PUT';
      
      // Prepare data for backend - only send required fields
      const userData: any = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        isActive: formData.isActive,
        color_hex: formData.color_hex,
        profile: {
          title: formData.profile?.title || '',
          specialization: formData.profile?.specialization || '',
          phone: formData.profile?.phone || ''
        }
      };

      // Only include password for new users or if password is provided for edits
      if (dialogMode === 'add') {
        if (!formData.password || formData.password.length < 6) {
          setSnackbar({ 
            open: true, 
            message: 'Das Passwort muss mindestens 6 Zeichen lang sein', 
            severity: 'error' 
          });
          return;
        }
        userData.password = formData.password;
      } else if (dialogMode === 'edit' && formData.password && formData.password.length > 0) {
        if (formData.password.length < 6) {
          setSnackbar({ 
            open: true, 
            message: 'Das Passwort muss mindestens 6 Zeichen lang sein', 
            severity: 'error' 
          });
          return;
        }
        userData.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      if (data.success) {
        setSnackbar({ 
          open: true, 
          message: `Benutzer ${dialogMode === 'add' ? 'erstellt' : 'aktualisiert'}`, 
          severity: 'success' 
        });
        setOpenDialog(false);
        loadUsers();
      } else {
        // Zeige detaillierte Fehlermeldungen an
        let errorMessage = data.message || 'Fehler beim Speichern';
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          const errorDetails = data.errors.map((err: any) => {
            if (err.msg) return err.msg;
            if (typeof err === 'string') return err;
            return JSON.stringify(err);
          }).join(', ');
          errorMessage = `${errorMessage}: ${errorDetails}`;
        }
        setSnackbar({ 
          open: true, 
          message: errorMessage, 
          severity: 'error' 
        });
      }
    } catch (error: any) {
      setSnackbar({ 
        open: true, 
        message: `Fehler beim Speichern: ${error.message || 'Unbekannter Fehler'}`, 
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

  const handleProfileChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        [field]: value
      }
    }));
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <AdminPanelSettings />;
      case 'admin': return <AdminPanelSettings />;
      case 'arzt': return <LocalHospital />;
      case 'assistent': return <Support />;
      case 'rezeption': return <Receipt />;
      case 'billing': return <Assistant />;
      case 'patient': return <Person />;
      default: return <Person />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'error';
      case 'admin': return 'primary';
      case 'arzt': return 'success';
      case 'assistent': return 'info';
      case 'rezeption': return 'warning';
      case 'billing': return 'default';
      case 'patient': return 'secondary';
      default: return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Administrator';
      case 'admin': return 'Administrator';
      case 'arzt': return 'Arzt';
      case 'assistent': return 'Assistent';
      case 'rezeption': return 'Empfang';
      case 'billing': return 'Abrechnung';
      case 'patient': return 'Patient';
      default: return role;
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
    <Box sx={{ 
      p: 3,
      mt: marginTopValue !== '0px' ? marginTopValue : 0,
      transition: marginTopValue !== '0px' ? 'margin-top 0.3s ease' : 'none',
    }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" component="h1">
            Benutzerverwaltung
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
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddNew}
          sx={{ borderRadius: 2 }}
        >
          Neuer Benutzer
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <Box p={3}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                placeholder="Benutzer suchen..."
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
                <InputLabel>Rolle</InputLabel>
                <Select
                  value={roleFilter}
                  label="Rolle"
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <SelectMenuItem value="all">Alle</SelectMenuItem>
                  <SelectMenuItem value="super_admin">Super Administrator</SelectMenuItem>
                  <SelectMenuItem value="admin">Administrator</SelectMenuItem>
                  <SelectMenuItem value="arzt">Arzt</SelectMenuItem>
                  <SelectMenuItem value="assistent">Assistent</SelectMenuItem>
                  <SelectMenuItem value="rezeption">Empfang</SelectMenuItem>
                  <SelectMenuItem value="billing">Abrechnung</SelectMenuItem>
                  <SelectMenuItem value="patient">Patient</SelectMenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <SelectMenuItem value="all">Alle</SelectMenuItem>
                  <SelectMenuItem value="active">Aktiv</SelectMenuItem>
                  <SelectMenuItem value="inactive">Inaktiv</SelectMenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, newMode) => newMode && setViewMode(newMode)}
                size="small"
                aria-label="Ansicht umschalten"
              >
                <ToggleButton value="list" aria-label="Listenansicht">
                  <ViewListIcon />
                </ToggleButton>
                <ToggleButton value="cards" aria-label="Kartenansicht">
                  <ViewModuleIcon />
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Box>
      </Card>

      <Card>
        {viewMode === 'list' ? (
        <>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Benutzer</TableCell>
                <TableCell>E-Mail</TableCell>
                <TableCell>Rolle</TableCell>
                <TableCell>Farbe</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Letzter Login</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Keine Benutzer gefunden
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user._id || user.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                          sx={{ bgcolor: 'primary.main' }}
                          src={getUserPhotoUrl(user) ?? undefined}
                          alt={`${user.firstName} ${user.lastName}`}
                        >
                          {!getUserPhotoUrl(user) && getRoleIcon(user.role)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {user.firstName} {user.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.profile?.title || ''}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        icon={getRoleIcon(user.role)}
                        label={getRoleLabel(user.role)}
                        color={getRoleColor(user.role) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: user.color_hex || '#10B981',
                            border: '1px solid #ccc'
                          }}
                        />
                        <Typography variant="caption">
                          {user.color_hex || '#10B981'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Aktiv' : 'Inaktiv'}
                        color={user.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleDateString('de-DE')
                        : 'Nie'
                      }
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedUser(user);
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
          count={totalUsers}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
        </>
        ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 2,
            p: 2,
          }}
        >
          {loading ? (
            <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : users.length === 0 ? (
            <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Keine Benutzer gefunden
              </Typography>
            </Box>
          ) : (
            users.map((user) => (
              <Card key={user._id || user.id} sx={{ transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{ bgcolor: 'primary.main' }}
                        src={getUserPhotoUrl(user) ?? undefined}
                        alt={`${user.firstName} ${user.lastName}`}
                      >
                        {!getUserPhotoUrl(user) && getRoleIcon(user.role)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={600} noWrap>
                          {user.firstName} {user.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                    <Chip
                      icon={getRoleIcon(user.role)}
                      label={getRoleLabel(user.role)}
                      color={getRoleColor(user.role) as any}
                      size="small"
                    />
                    <Chip
                      label={user.isActive ? 'Aktiv' : 'Inaktiv'}
                      color={user.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  {user.lastLogin && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Letzter Login: {new Date(user.lastLogin).toLocaleDateString('de-DE')}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget);
                        setSelectedUser(user);
                      }}
                      title="Aktionen"
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
        )}
      </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => { handleView(selectedUser!); setAnchorEl(null); }}>
          <Visibility sx={{ mr: 1 }} />
          Anzeigen
        </MenuItem>
        <MenuItem onClick={() => { handleEdit(selectedUser!); setAnchorEl(null); }}>
          <Edit sx={{ mr: 1 }} />
          Bearbeiten
        </MenuItem>
        <MenuItem onClick={() => { handleToggleStatus(selectedUser!); setAnchorEl(null); }}>
          {selectedUser?.isActive ? <Lock sx={{ mr: 1 }} /> : <LockOpen sx={{ mr: 1 }} />}
          {selectedUser?.isActive ? 'Deaktivieren' : 'Aktivieren'}
        </MenuItem>
        <MenuItem onClick={() => { handleDelete(selectedUser!); setAnchorEl(null); }}>
          <Delete sx={{ mr: 1 }} />
          Löschen
        </MenuItem>
      </Menu>

      <Dialog 
        open={openDialog} 
        onClose={() => {
          setOpenDialog(false);
          // Passwort-Sichtbarkeit zurücksetzen
          setShowPassword(false);
          // Suchfeld zurücksetzen beim Schließen des Dialogs (nur im add-Modus)
          if (dialogMode === 'add') {
            setSearchTerm('');
          }
        }} 
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
          isEdit={dialogMode === 'edit'}
          title={
            dialogMode === 'add' ? 'Neuer Benutzer' :
            dialogMode === 'edit' ? 'Benutzer bearbeiten' :
            'Benutzer anzeigen'
          }
          icon={<Person />}
          gradientColors={{ from: '#6366f1', to: '#4f46e5' }}
        />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Vorname"
                value={formData.firstName || ''}
                onChange={(e) => handleFormChange('firstName', e.target.value)}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Nachname"
                value={formData.lastName || ''}
                onChange={(e) => handleFormChange('lastName', e.target.value)}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                key={`email-${dialogMode}-${openDialog}`}
                fullWidth
                label="E-Mail"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleFormChange('email', e.target.value)}
                disabled={dialogMode === 'view'}
                required
                autoComplete="off"
                inputProps={{
                  autoComplete: 'off',
                  'data-form-type': 'other',
                  'data-lpignore': 'true'
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                key={`password-${dialogMode}-${openDialog}`}
                fullWidth
                label="Passwort"
                type={showPassword ? 'text' : 'password'}
                value={formData.password || ''}
                onChange={(e) => handleFormChange('password', e.target.value)}
                disabled={dialogMode === 'view'}
                required={dialogMode === 'add'}
                helperText={dialogMode === 'edit' ? 'Leer lassen, um das Passwort nicht zu ändern' : ''}
                autoComplete="new-password"
                inputProps={{
                  autoComplete: 'new-password',
                  'data-lpignore': 'true'
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="Passwort anzeigen/verbergen"
                        onClick={() => setShowPassword(!showPassword)}
                        onMouseDown={(e) => e.preventDefault()}
                        edge="end"
                        disabled={dialogMode === 'view'}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth disabled={dialogMode === 'view'} required>
                <InputLabel>Rolle</InputLabel>
                <Select
                  value={formData.role || ''}
                  onChange={(e) => handleFormChange('role', e.target.value)}
                  label="Rolle"
                  required
                >
                  <SelectMenuItem value="super_admin">Super Administrator</SelectMenuItem>
                  <SelectMenuItem value="admin">Administrator</SelectMenuItem>
                  <SelectMenuItem value="arzt">Arzt</SelectMenuItem>
                  <SelectMenuItem value="assistent">Assistent</SelectMenuItem>
                  <SelectMenuItem value="rezeption">Empfang</SelectMenuItem>
                  <SelectMenuItem value="billing">Abrechnung</SelectMenuItem>
                  <SelectMenuItem value="patient">Patient</SelectMenuItem>
                  <SelectMenuItem value="staff">Personal</SelectMenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Titel"
                value={formData.profile?.title || ''}
                onChange={(e) => handleProfileChange('title', e.target.value)}
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Spezialisierung"
                value={formData.profile?.specialization || ''}
                onChange={(e) => handleProfileChange('specialization', e.target.value)}
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Telefon"
                value={formData.profile?.phone || ''}
                onChange={(e) => handleProfileChange('phone', e.target.value)}
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Farbe für Kalender"
                type="color"
                value={formData.color_hex || '#10B981'}
                onChange={(e) => handleFormChange('color_hex', e.target.value)}
                disabled={dialogMode === 'view'}
                InputProps={{
                  style: { height: '56px' }
                }}
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
            {(dialogMode === 'edit' || dialogMode === 'view') && (formData._id || formData.id) && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Profilfoto
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Avatar
                    sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}
                    src={getUserPhotoUrl(formData) ?? undefined}
                    alt={`${formData.firstName} ${formData.lastName}`}
                  >
                    {!getUserPhotoUrl(formData) && getRoleIcon(formData.role || 'assistent')}
                  </Avatar>
                  {dialogMode === 'edit' && (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        ref={(el) => setPhotoFileInputRef(el ?? null)}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !(formData._id || formData.id)) return;
                          setPhotoUploading(true);
                          try {
                            const fd = new FormData();
                            fd.append('photo', file);
                            const res = await api.put<{ profilePhoto: { filename: string; uploadedAt: string } }>(
                              `/users/${formData._id || formData.id}/photo`,
                              fd
                            );
                            const profilePhoto = res.data?.profilePhoto;
                            if (res.success && profilePhoto) {
                              setFormData((prev) => ({ ...prev, profilePhoto }));
                              setSnackbar({ open: true, message: 'Profilfoto wurde aktualisiert', severity: 'success' });
                              loadUsers();
                              const editedId = formData._id || formData.id;
                              if (editedId && (currentUser?.id === editedId || currentUser?._id === editedId)) {
                                dispatch(setUserProfilePhoto(profilePhoto));
                              }
                            }
                          } catch (err: unknown) {
                            const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
                              ?? (err as { message?: string })?.message
                              ?? 'Fehler beim Hochladen';
                            setSnackbar({ open: true, message: String(msg), severity: 'error' });
                          } finally {
                            setPhotoUploading(false);
                            e.target.value = '';
                          }
                        }}
                        style={{ display: 'none' }}
                        aria-hidden="true"
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={photoUploading ? <CircularProgress size={16} /> : <PhotoCamera />}
                        onClick={() => photoFileInputRef?.click()}
                        disabled={photoUploading}
                        aria-label="Foto aufnehmen oder hochladen"
                      >
                        {photoUploading ? 'Wird hochgeladen…' : 'Foto aufnehmen/hochladen'}
                      </Button>
                    </>
                  )}
                </Box>
                {dialogMode === 'edit' && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Auf dem Smartphone öffnet sich die Kamera; am PC wählen Sie eine Bilddatei aus.
                  </Typography>
                )}
              </Grid>
            )}
            {dialogMode === 'add' && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  Nach dem Speichern können Sie unter „Bearbeiten“ ein Profilfoto hinzufügen (Aufnahme oder Upload).
                </Typography>
              </Grid>
            )}
          </Grid>
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
          title="Hilfe & Leitfaden: Benutzerverwaltung"
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs 
            value={helpTabUsers} 
            onChange={(_, v) => setHelpTabUsers(v)} 
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Übersicht" />
            <Tab label="Benutzer erstellen" />
            <Tab label="Benutzer bearbeiten" />
            <Tab label="Rollen & Berechtigungen" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTabUsers === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Benutzerverwaltung
                </Typography>
                <Typography variant="body1" paragraph>
                  Die Benutzerverwaltung ermöglicht es, Benutzer zu erstellen, zu bearbeiten und zu verwalten.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>➕ <strong>Benutzer erstellen:</strong> Neue Benutzer anlegen</li>
                  <li>✏️ <strong>Benutzer bearbeiten:</strong> Bestehende Benutzer ändern</li>
                  <li>🗑️ <strong>Benutzer löschen:</strong> Benutzer entfernen</li>
                  <li>👤 <strong>Rollen verwalten:</strong> Benutzerrollen zuweisen</li>
                  <li>🔐 <strong>Berechtigungen:</strong> Zugriffsrechte verwalten</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabUsers === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Neuen Benutzer erstellen
                </Typography>
                <Typography variant="body2" paragraph>
                  So erstellen Sie einen neuen Benutzer:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt Anleitung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Neuer Benutzer"</li>
                  <li>Geben Sie die Benutzer-Daten ein:
                    <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                      <li><strong>E-Mail:</strong> E-Mail-Adresse</li>
                      <li><strong>Passwort:</strong> Passwort festlegen</li>
                      <li><strong>Vorname & Nachname:</strong> Name des Benutzers</li>
                      <li><strong>Rolle:</strong> Benutzerrolle auswählen</li>
                      <li><strong>Status:</strong> Aktiv/Inaktiv</li>
                    </Box>
                  </li>
                  <li>Klicken Sie auf "Speichern"</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabUsers === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Benutzer bearbeiten
                </Typography>
                <Typography variant="body2" paragraph>
                  So bearbeiten Sie einen bestehenden Benutzer:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt Anleitung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wählen Sie einen Benutzer aus der Liste</li>
                  <li>Klicken Sie auf das Bearbeiten-Icon</li>
                  <li>Ändern Sie die gewünschten Daten</li>
                  <li>Klicken Sie auf "Speichern"</li>
                  <li>Die Änderungen werden gespeichert</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabUsers === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Rollen & Berechtigungen
                </Typography>
                <Typography variant="body2" paragraph>
                  Verfügbare Benutzerrollen:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Verfügbare Rollen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>👑 <strong>Super Admin:</strong> Vollzugriff auf alle Funktionen</li>
                  <li>🛡️ <strong>Admin:</strong> Administrativer Zugriff</li>
                  <li>👨‍⚕️ <strong>Arzt:</strong> Ärztliche Funktionen</li>
                  <li>👩‍💼 <strong>Assistent:</strong> Unterstützende Funktionen</li>
                  <li>📋 <strong>Rezeption:</strong> Empfangs- und Terminverwaltung</li>
                  <li>💰 <strong>Billing:</strong> Abrechnungsfunktionen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTabUsers === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Benutzerverwaltung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Verwenden Sie starke Passwörter</li>
                  <li>✅ Weisen Sie Rollen sorgfältig zu</li>
                  <li>✅ Deaktivieren Sie nicht mehr benötigte Benutzer</li>
                  <li>✅ Dokumentieren Sie Berechtigungsänderungen</li>
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

export default Users;