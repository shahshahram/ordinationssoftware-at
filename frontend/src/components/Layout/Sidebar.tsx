import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme,
  Collapse,
} from '@mui/material';
import {
  Dashboard,
  People,
  CalendarToday,
  Business,
  Receipt,
  Description,
  HealthAndSafety,
  Person,
  Assessment,
  Security,
  Groups,
  Settings,
  Extension,
  Close,
  LocationOn,
  Dashboard as DashboardIcon,
  CalendarMonth,
  ExpandLess,
  ExpandMore,
  MedicalServices,
  BookOnline,
  Search,
  PersonAdd,
  Login,
  Warning,
  Category as CategoryIcon,
  Storage,
  Build,
  Article,
  Assignment,
  Mail,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { 
    text: 'Patienten', 
    icon: <People />, 
    path: '/patients',
    subItems: [
      { text: 'Patientenliste', icon: <People />, path: '/patients' },
      { text: 'Hinweisliste', icon: <Warning />, path: '/patients-hints' },
      { text: 'Patientenaufnahme', icon: <PersonAdd />, path: '/patient-admission' },
      { text: 'Self-Check-In', icon: <Login />, path: '/self-checkin' },
      { text: 'Demo & Test', icon: <Search />, path: '/patient-admission-demo' },
    ]
  },
  { 
    text: 'Termine', 
    icon: <CalendarToday />, 
    path: '/appointments',
    subItems: [
      { text: 'Terminverwaltung', icon: <CalendarToday />, path: '/appointments' },
      { text: 'Kalender', icon: <CalendarToday />, path: '/calendar' },
      { text: 'Dienst-Kalender', icon: <CalendarMonth />, path: '/enhanced-calendar' },
    ]
  },
  { 
    text: 'Abrechnung', 
    icon: <Receipt />, 
    path: '/billing',
    subItems: [
      { text: 'Rechnungen', icon: <Receipt />, path: '/billing' },
      { text: 'Leistungsabrechnung', icon: <Receipt />, path: '/performance-billing' },
    ]
  },
  { 
    text: 'Dokumente', 
    icon: <Description />, 
    path: '/documents',
    subItems: [
      { text: 'Dokumente', icon: <Description />, path: '/documents' },
      { text: 'Template Management', icon: <Description />, path: '/template-management' },
      { text: 'Dokument-Templates (Admin)', icon: <Build />, path: '/document-templates' },
      { text: 'Dekurs-Vorlagen (Admin)', icon: <Assignment />, path: '/dekurs-vorlagen' },
      { text: 'XDS Dokumente', icon: <Storage />, path: '/xds-documents' },
    ]
  },
  { 
    text: 'ELGA', 
    icon: <HealthAndSafety />, 
    path: '/elga',
    subItems: [
      { text: 'ELGA Übersicht', icon: <HealthAndSafety />, path: '/elga' },
      { text: 'Valuesets', icon: <CategoryIcon />, path: '/elga-valuesets' },
    ]
  },
  { text: 'Interne Nachrichten', icon: <Mail />, path: '/internal-messages' },
  { 
    text: 'Einstellungen', 
    icon: <Settings />, 
    path: '/settings',
    subItems: [
      { text: 'Allgemeine Einstellungen', icon: <Settings />, path: '/settings' },
      { text: 'Ressourcen', icon: <Business />, path: '/resources' },
      { 
        text: 'ICD-10', 
        icon: <Search />, 
        path: '/icd10-demo',
        subItems: [
          { text: 'ICD-10 Demo', icon: <Search />, path: '/icd10-demo' },
          { text: 'Katalog-Management', icon: <Settings />, path: '/icd10-catalog-management' },
        ]
      },
      { 
        text: 'Standorte', 
        icon: <LocationOn />, 
        path: '/locations',
        subItems: [
          { text: 'Standortverwaltung', icon: <LocationOn />, path: '/locations' },
          { text: 'Standort-Dashboard', icon: <DashboardIcon />, path: '/location-dashboard' },
          { text: 'Standort-Kalender', icon: <CalendarMonth />, path: '/location-calendar' },
        ]
      },
      { 
        text: 'Leistungen', 
        icon: <MedicalServices />, 
        path: '/service-catalog',
        subItems: [
          { text: 'Leistungskatalog', icon: <MedicalServices />, path: '/service-catalog' },
          { text: 'Buchungen', icon: <BookOnline />, path: '/service-bookings' },
        ]
      },
      { 
        text: 'Medikamente', 
        icon: <MedicalServices />, 
        path: '/medication-import',
        subItems: [
          { text: 'Katalog Import', icon: <MedicalServices />, path: '/medication-import' },
        ]
      },
      { text: 'Benutzer', icon: <Person />, path: '/users' },
      { text: 'Personal', icon: <Groups />, path: '/staff' },
      { text: 'RBAC Management', icon: <Security />, path: '/rbac-management' },
      { text: 'RBAC Discovery', icon: <Extension />, path: '/rbac-discovery' },
      { text: 'Berichte', icon: <Assessment />, path: '/reports' },
      { text: 'Sicherheit', icon: <Security />, path: '/security' },
    ]
  },
];

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const handleNavigation = (path: string) => {
    navigate(path);
    // Auf mobilen Geräten schließen, auf Desktop offen lassen
    if (isMobile) {
      onClose();
    }
  };

  const handleToggleExpand = (itemText: string) => {
    setExpandedItems(prev => 
      prev.includes(itemText) 
        ? prev.filter(item => item !== itemText)
        : [...prev, itemText]
    );
  };

  const isItemActive = (item: any) => {
    if (item.subItems) {
      return item.subItems.some((subItem: any) => {
        if (subItem.subItems) {
          return subItem.subItems.some((nestedItem: any) => location.pathname === nestedItem.path);
        }
        return location.pathname === subItem.path;
      });
    }
    return location.pathname === item.path;
  };

  const drawerContent = (
    <Box sx={{ width: 240, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" component="div" sx={{ fontWeight: 600, color: 'primary.main' }}>
          Ordinationssoftware
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </Box>

      {/* Navigation */}
      <List sx={{ flexGrow: 1, pt: 1 }}>
        {menuItems.map((item) => {
          const isActive = isItemActive(item);
          const isExpanded = expandedItems.includes(item.text);
          
          return (
            <React.Fragment key={item.text}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => {
                    if (item.subItems) {
                      handleToggleExpand(item.text);
                    } else {
                      handleNavigation(item.path);
                    }
                  }}
                  sx={{
                    mx: 1,
                    borderRadius: 1,
                    backgroundColor: isActive ? 'primary.main' : 'transparent',
                    color: isActive ? 'white' : 'text.primary',
                    '&:hover': {
                      backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? 'white' : 'text.secondary',
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  />
                  {item.subItems && (
                    isExpanded ? <ExpandLess /> : <ExpandMore />
                  )}
                </ListItemButton>
              </ListItem>
              
              {/* Submenu */}
              {item.subItems && (
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems.map((subItem) => {
                      const isSubActive = location.pathname === subItem.path;
                      const hasNestedItems = subItem.subItems && subItem.subItems.length > 0;
                      const isNestedExpanded = expandedItems.includes(subItem.text);
                      
                      return (
                        <React.Fragment key={subItem.text}>
                          <ListItem disablePadding>
                            <ListItemButton
                              onClick={() => {
                                if (hasNestedItems) {
                                  handleToggleExpand(subItem.text);
                                } else {
                                  handleNavigation(subItem.path);
                                }
                              }}
                              sx={{
                                mx: 1,
                                ml: 4,
                                borderRadius: 1,
                                backgroundColor: isSubActive ? 'primary.main' : 'transparent',
                                color: isSubActive ? 'white' : 'text.primary',
                                '&:hover': {
                                  backgroundColor: isSubActive ? 'primary.dark' : 'action.hover',
                                },
                              }}
                            >
                              <ListItemIcon
                                sx={{
                                  color: isSubActive ? 'white' : 'text.secondary',
                                  minWidth: 40,
                                }}
                              >
                                {subItem.icon}
                              </ListItemIcon>
                              <ListItemText
                                primary={subItem.text}
                                primaryTypographyProps={{
                                  fontSize: '0.8rem',
                                  fontWeight: isSubActive ? 600 : 400,
                                }}
                              />
                              {hasNestedItems && (
                                isNestedExpanded ? <ExpandLess /> : <ExpandMore />
                              )}
                            </ListItemButton>
                          </ListItem>
                          
                          {/* Nested Submenu */}
                          {hasNestedItems && (
                            <Collapse in={isNestedExpanded} timeout="auto" unmountOnExit>
                              <List component="div" disablePadding>
                                {subItem.subItems.map((nestedItem) => {
                                  const isNestedActive = location.pathname === nestedItem.path;
                                  return (
                                    <ListItem key={nestedItem.text} disablePadding>
                                      <ListItemButton
                                        onClick={() => handleNavigation(nestedItem.path)}
                                        sx={{
                                          mx: 1,
                                          ml: 8,
                                          borderRadius: 1,
                                          backgroundColor: isNestedActive ? 'primary.main' : 'transparent',
                                          color: isNestedActive ? 'white' : 'text.primary',
                                          '&:hover': {
                                            backgroundColor: isNestedActive ? 'primary.dark' : 'action.hover',
                                          },
                                        }}
                                      >
                                        <ListItemIcon
                                          sx={{
                                            color: isNestedActive ? 'white' : 'text.secondary',
                                            minWidth: 40,
                                          }}
                                        >
                                          {nestedItem.icon}
                                        </ListItemIcon>
                                        <ListItemText
                                          primary={nestedItem.text}
                                          primaryTypographyProps={{
                                            fontSize: '0.75rem',
                                            fontWeight: isNestedActive ? 600 : 400,
                                          }}
                                        />
                                      </ListItemButton>
                                    </ListItem>
                                  );
                                })}
                              </List>
                            </Collapse>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          );
        })}
      </List>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          Version 1.0.0
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          DSGVO-konform
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
          disableAutoFocus: true,
          disableEnforceFocus: true,
          disableRestoreFocus: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 240,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="persistent"
        open={open}
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 240,
            position: 'relative',
            height: '100vh',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;
