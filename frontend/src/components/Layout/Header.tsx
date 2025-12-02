import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { fetchUnreadCount } from '../../store/slices/internalMessagesSlice';
import { setCurrentLocation, fetchUserLocations } from '../../store/slices/locationSlice';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Select,
  FormControl,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications,
  AccountCircle,
  Logout,
  Settings,
  LocationOn,
} from '@mui/icons-material';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { unreadCount } = useAppSelector((state) => state.internalMessages);
  const { currentLocation, availableLocations, hasNoAssignment } = useAppSelector((state) => state.locations);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [messagesDialogOpen, setMessagesDialogOpen] = React.useState(false);
  
  // Lade unreadCount beim Mount und alle 10 Sekunden (häufiger für bessere Aktualisierung)
  useEffect(() => {
    dispatch(fetchUnreadCount());
    const interval = setInterval(() => {
      dispatch(fetchUnreadCount());
    }, 10000); // Alle 10 Sekunden aktualisieren
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    handleMenuClose();
  };

  const handleSettings = () => {
    navigate('/settings');
    handleMenuClose();
  };

  const handleLocationChange = (locationId: string) => {
    const selectedLocation = availableLocations.find(loc => loc._id === locationId) || 
                            (currentLocation && currentLocation._id === locationId ? currentLocation : null);
    if (selectedLocation) {
      dispatch(setCurrentLocation(selectedLocation));
      localStorage.setItem('currentLocationId', locationId);
    }
  };

  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{
        backgroundColor: 'white',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={onMenuClick}
          edge="start"
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ flexGrow: 1, color: 'text.primary' }}
        >
          Ordinationssoftware AT
        </Typography>

        {/* Standort-Auswahl */}
        {currentLocation && availableLocations.length > 0 && (
          <Box sx={{ mr: 2, minWidth: 200 }}>
            <FormControl size="small" fullWidth>
              <Select
                value={currentLocation._id}
                onChange={(e) => handleLocationChange(e.target.value)}
                displayEmpty
                sx={{
                  '& .MuiSelect-select': {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }
                }}
                renderValue={(selected) => {
                  const location = availableLocations.find(loc => loc._id === selected) || currentLocation;
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn fontSize="small" color="primary" />
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {location.name}
                        {hasNoAssignment && (
                          <Chip 
                            label="Alle" 
                            size="small" 
                            sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} 
                          />
                        )}
                      </Box>
                    </Box>
                  );
                }}
              >
                {hasNoAssignment && (
                  <MenuItem value="all">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn fontSize="small" />
                      <Typography variant="body2">Alle Standorte</Typography>
                    </Box>
                  </MenuItem>
                )}
                {availableLocations.map((location) => (
                  <MenuItem key={location._id} value={location._id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: location.color_hex || '#1976d2',
                        }}
                      />
                      <Typography variant="body2">{location.name}</Typography>
                      {location.code && (
                        <Typography variant="caption" color="text.secondary">
                          ({location.code})
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* User Info */}
          {user && (
            <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary' }}>
              {user.firstName} {user.lastName}
            </Typography>
          )}

          {/* Notifications */}
          <Tooltip title="Benachrichtigungen">
            <IconButton 
              color="inherit"
              onClick={() => {
                navigate('/internal-messages');
              }}
            >
              <Badge badgeContent={unreadCount > 0 ? unreadCount : 0} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Profile Menu */}
          <Tooltip title="Profil">
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="primary-search-account-menu"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                <AccountCircle />
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            {user && (
              <MenuItem disabled>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {user.firstName} {user.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.role === 'admin' ? 'Administrator' : 
                     user.role === 'doctor' ? 'Arzt' : 
                     user.role === 'staff' ? 'Mitarbeiter' : user.role}
                  </Typography>
                </Box>
              </MenuItem>
            )}
            <MenuItem onClick={handleSettings}>
              <Settings sx={{ mr: 1 }} />
              Einstellungen
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Abmelden
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
