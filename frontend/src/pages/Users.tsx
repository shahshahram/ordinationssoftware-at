import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { eventBus, EVENTS } from '../utils/eventBus';
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
} from '@mui/material';
import GradientDialogTitle from '../components/GradientDialogTitle';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Person,
  AdminPanelSettings,
  LocalHospital,
  Support,
  Receipt,
  Assistant,
  Lock,
  LockOpen,
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
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'warning' | 'info' 
  });

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
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'assistent',
      isActive: true,
      profile: {
        title: '',
        specialization: '',
        phone: ''
      }
    });
    setDialogMode('add');
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
        color_hex: formData.color_hex
      };

      // Only include password for new users or if password is provided for edits
      if (dialogMode === 'add' || (dialogMode === 'edit' && formData.password)) {
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
        setSnackbar({ 
          open: true, 
          message: data.message || 'Fehler beim Speichern', 
          severity: 'error' 
        });
      }
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Speichern', 
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
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Benutzerverwaltung
        </Typography>
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
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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
          </Grid>
        </Box>
      </Card>

      <Card>
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
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {getRoleIcon(user.role)}
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

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth
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
                fullWidth
                label="E-Mail"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleFormChange('email', e.target.value)}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Passwort"
                type="password"
                value={formData.password || ''}
                onChange={(e) => handleFormChange('password', e.target.value)}
                disabled={dialogMode === 'view'}
                required={dialogMode === 'add'}
                helperText={dialogMode === 'edit' ? 'Leer lassen, um das Passwort nicht zu ändern' : ''}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth disabled={dialogMode === 'view'}>
                <InputLabel>Rolle</InputLabel>
                <Select
                  value={formData.role || ''}
                  onChange={(e) => handleFormChange('role', e.target.value)}
                  label="Rolle"
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
    </Box>
  );
};

export default Users;