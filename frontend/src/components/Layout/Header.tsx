import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { fetchUnreadCount } from '../../store/slices/internalMessagesSlice';
import { setCurrentLocation, fetchUserLocations } from '../../store/slices/locationSlice';
import { toggleTheme } from '../../store/slices/uiSlice';
import { updateNavigationMode } from '../../store/slices/navigationSlice';
import DropdownNavigation from './DropdownNavigation';
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
  LightMode,
  DarkMode,
  ViewSidebar,
  ViewList,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';

interface HeaderProps {
  onMenuClick: () => void;
  navigationOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, navigationOpen }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { unreadCount } = useAppSelector((state) => state.internalMessages);
  const { currentLocation, availableLocations, hasNoAssignment } = useAppSelector((state) => state.locations);
  const { theme } = useAppSelector((state) => state.ui);
  const { mode: navigationMode } = useAppSelector((state) => state.navigation);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [messagesDialogOpen, setMessagesDialogOpen] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  
  // Lade unreadCount beim Mount und alle 30 Sekunden
  useEffect(() => {
    // Warte kurz, damit der User-Token gesetzt ist
    const timer = setTimeout(() => {
      dispatch(fetchUnreadCount());
    }, 1000);
    
    const interval = setInterval(() => {
      dispatch(fetchUnreadCount());
    }, 30000); // Alle 30 Sekunden aktualisieren (reduziert von 10 Sekunden)
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
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

  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  const handleNavigationModeToggle = () => {
    const newMode = navigationMode === 'dropdown' ? 'sidebar' : 'dropdown';
    dispatch(updateNavigationMode(newMode));
  };

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      // Vollbild aktivieren
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Fehler beim Aktivieren des Vollbildmodus:', err);
      });
    } else {
      // Vollbild deaktivieren
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('Fehler beim Deaktivieren des Vollbildmodus:', err);
      });
    }
  };

  // Prüfe Fullscreen-Status beim Mount und bei Änderungen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <AppBar
        position="sticky"
        elevation={1}
        sx={{
          backgroundColor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open navigation"
            onClick={(e) => {
              // Entferne Focus vor dem Öffnen der Navigation, um aria-hidden Warnung zu vermeiden
              if (e.currentTarget) {
                e.currentTarget.blur();
              }
              onMenuClick();
            }}
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

          {/* Navigation Mode Toggle */}
          <Tooltip title={navigationMode === 'dropdown' ? 'Sidebar-Navigation aktivieren' : 'Dropdown-Navigation aktivieren'}>
            <IconButton 
              color="inherit"
              onClick={handleNavigationModeToggle}
              aria-label={navigationMode === 'dropdown' ? 'Sidebar-Navigation aktivieren' : 'Dropdown-Navigation aktivieren'}
            >
              {navigationMode === 'dropdown' ? <ViewSidebar /> : <ViewList />}
            </IconButton>
          </Tooltip>

          {/* Theme Toggle */}
          <Tooltip title={theme === 'dark' ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren'}>
            <IconButton 
              color="inherit"
              onClick={handleThemeToggle}
              aria-label={theme === 'dark' ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren'}
            >
              {theme === 'dark' ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>

          {/* Fullscreen Toggle */}
          <Tooltip title={isFullscreen ? 'Vollbildmodus beenden' : 'Vollbildmodus aktivieren'}>
            <IconButton 
              color="inherit"
              onClick={handleFullscreenToggle}
              aria-label={isFullscreen ? 'Vollbildmodus beenden' : 'Vollbildmodus aktivieren'}
            >
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>

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
      
      {/* Navigation - Dropdown (Sidebar wird in App.tsx gerendert) */}
      {navigationMode === 'dropdown' && (
        <DropdownNavigation open={navigationOpen} onClose={onMenuClick} />
      )}
    </Box>
  );
};

export default Header;
