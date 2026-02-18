import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  useMediaQuery,
  useTheme,
  Collapse,
  Paper,
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
  ChatBubbleOutline,
  Schedule,
  CreditCard,
  AccessTime,
  PendingActions,
  Cloud,
  Image,
  Science,
  CloudDownload,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import RoleGuard from '../auth/RoleGuard';
import { ADMIN_ROLES } from '../../constants/roles';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface MenuItemType {
  text: string;
  icon: React.ReactElement;
  path: string;
  subItems?: Array<MenuItemType & { allowedRoles?: string[] }>;
  allowedRoles?: string[];
}

const menuItems: MenuItemType[] = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { 
    text: 'Patienten', 
    icon: <People />, 
    path: '/patients',
    subItems: [
      { text: 'Patientenliste', icon: <People />, path: '/patients' },
      { text: 'Temporäre Patienten', icon: <Warning />, path: '/temporary-patients' },
      { text: 'Hinweisliste', icon: <Warning />, path: '/patients-hints' },
      { text: 'Patientenaufnahme', icon: <PersonAdd />, path: '/patient-admission' },
      { text: 'Self-Check-In', icon: <Login />, path: '/self-checkin' },
      { text: 'Demo & Test', icon: <Search />, path: '/patient-admission-demo' },
      { text: 'Adressbuch', icon: <Person />, path: '/address-book' },
    ]
  },
  { 
    text: 'Termine', 
    icon: <CalendarToday />, 
    path: '/appointments',
    subItems: [
      { text: 'Terminverwaltung', icon: <CalendarToday />, path: '/appointments' },
      { text: 'Online-Buchungen', icon: <BookOnline />, path: '/online-bookings' },
      { text: 'Terminkalender', icon: <CalendarToday />, path: '/demo-calendar' },
      { text: 'Dienstkalender', icon: <CalendarToday />, path: '/service-demo-calendar' },
      // { text: 'Dienst-Kalender (Enhanced)', icon: <CalendarToday />, path: '/enhanced-calendar' },
      { text: 'Verfügbarkeiten', icon: <Schedule />, path: '/availability' },
      { text: 'Warteliste', icon: <PendingActions />, path: '/waiting-list' },
    ]
  },
      { 
        text: 'Abrechnung', 
        icon: <Receipt />, 
        path: '/billing',
        subItems: [
          { text: 'Rechnungen', icon: <Receipt />, path: '/billing' },
          { text: 'Erstattungen', icon: <Receipt />, path: '/reimbursements' },
          { text: 'Abrechnungsberichte', icon: <Assessment />, path: '/billing-reports' },
          { text: 'Journal', icon: <Article />, path: '/journal' },
          { text: 'Registrierkassen-Verwaltung', icon: <Receipt />, path: '/cash-register' },
        ]
      },
  { 
    text: 'Dokumente', 
    icon: <Description />, 
    path: '/documents',
    subItems: [
      { text: 'Dokumente', icon: <Description />, path: '/documents' },
      { text: 'Briefvorlagen', icon: <Description />, path: '/letter-templates' },
      // { text: 'Template Management', icon: <Description />, path: '/template-management' }, // Ausgeblendet
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
          { text: 'E-Card Validierung', icon: <CreditCard />, path: '/ecard-validation' },
        ]
      },
  { text: 'Interne Nachrichten', icon: <Mail />, path: '/internal-messages' },
  { text: 'Chat', icon: <ChatBubbleOutline />, path: '/chat' },
  { 
    text: 'Einstellungen', 
    icon: <Settings />, 
    path: '/settings',
    allowedRoles: [...ADMIN_ROLES],
    subItems: [
      { text: 'Allgemeine Einstellungen', icon: <Settings />, path: '/settings' },
      { text: 'Update-Monitoring', icon: <CloudDownload />, path: '/update-monitoring' },
      { 
        text: 'Standorte', 
        icon: <LocationOn />, 
        path: '/locations',
        subItems: [
          { text: 'Standortverwaltung', icon: <LocationOn />, path: '/locations' },
          { text: 'Standort-Dashboard', icon: <DashboardIcon />, path: '/location-dashboard' },
          { text: 'Standort-Kalender', icon: <CalendarMonth />, path: '/location-calendar' },
          { text: 'Ordinationszeiten', icon: <AccessTime />, path: '/clinic-hours' },
          { text: 'Medizinische Fachrichtungen', icon: <MedicalServices />, path: '/medical-specialties' },
        ]
      },
      { 
        text: 'Benutzer', 
        icon: <Person />, 
        path: '/users',
        subItems: [
          { text: 'Benutzer', icon: <Person />, path: '/users' },
          { text: 'Personal', icon: <Groups />, path: '/staff' },
        ]
      },
      { 
        text: 'Leistungen', 
        icon: <MedicalServices />, 
        path: '/service-catalog',
        subItems: [
          { text: 'Leistungskatalog', icon: <MedicalServices />, path: '/service-catalog' },
          { text: 'Service-Kategorien', icon: <CategoryIcon />, path: '/service-categories' },
          { text: 'Buchungen', icon: <BookOnline />, path: '/service-bookings' },
          { text: 'Ressourcen', icon: <Business />, path: '/resources' },
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
      { 
        text: 'AbrechnungKonfig', 
        icon: <Receipt />, 
        path: '/billing-config',
        subItems: [
          { text: 'Versicherungsverwaltung', icon: <HealthAndSafety />, path: '/insurance-providers' },
          { text: 'Kassa Teststrecke', icon: <Build />, path: '/kassa-test' },
          { text: 'ELDA Teststrecke', icon: <Build />, path: '/elda-test' },
          { text: 'WAHonline Teststrecke', icon: <Build />, path: '/wahonline-test' },
        ]
      },
      { 
        text: 'ICD-10', 
        icon: <Search />, 
        path: '/icd10-demo',
        subItems: [
          { text: 'ICD-10 Demo', icon: <Search />, path: '/icd10-demo' },
          { text: 'Katalog-Management', icon: <Settings />, path: '/icd10-catalog-management' },
        ]
      },
      { text: 'RBAC Management', icon: <Security />, path: '/rbac-management' },
      { text: 'RBAC Discovery', icon: <Extension />, path: '/rbac-discovery' },
      { text: 'Berichte', icon: <Assessment />, path: '/reports' },
      { text: 'Sicherheit', icon: <Security />, path: '/security' },
      { text: 'Integrations-Status', icon: <Settings />, path: '/integration-status' },
      { 
        text: 'DICOM & PACS', 
        icon: <Image />, 
        path: '/dicom-providers',
        subItems: [
          { text: 'DICOM-Provider', icon: <Cloud />, path: '/dicom-providers' },
          { text: 'Teststrecke', icon: <Build />, path: '/dicom-test' },
        ]
      },
      { 
        text: 'Labor & Schnittstellen', 
        icon: <Science />, 
        path: '/labor-providers',
        subItems: [
          { text: 'Labor-Provider', icon: <Science />, path: '/labor-providers' },
          { text: 'Teststrecke', icon: <Build />, path: '/labor-test' },
        ]
      },
    ]
  },
];

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const _isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const handleNavigation = (path: string) => {
    navigate(path);
    // Navigation nach Klick schließen
    onClose();
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

  const navigationContent = (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Navigation in Grid-Layout für bessere Übersicht */}
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
        }}
      >
        {menuItems.map((item) => {
          const isActive = isItemActive(item);
          const isExpanded = expandedItems.includes(item.text);
          const content = (
            <Box key={item.text}>
              <Box
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  mb: 1,
                }}
              >
                <ListItemButton
                  onClick={() => {
                    if (item.subItems) {
                      handleToggleExpand(item.text);
                    } else {
                      handleNavigation(item.path);
                    }
                  }}
                  sx={{
                    borderRadius: 0,
                    backgroundColor: isActive ? 'primary.main' : 'background.paper',
                    color: isActive ? 'white' : 'text.primary',
                    '&:hover': {
                      backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                    },
                    py: 1.5,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? 'white' : 'primary.main',
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                    }}
                  />
                  {item.subItems && (
                    isExpanded ? <ExpandLess /> : <ExpandMore />
                  )}
                </ListItemButton>
                
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
                                  pl: 4,
                                  py: 1,
                                  borderRadius: 0,
                                  backgroundColor: isSubActive ? 'primary.light' : 'transparent',
                                  color: isSubActive ? 'white' : 'text.primary',
                                  '&:hover': {
                                    backgroundColor: isSubActive ? 'primary.main' : 'action.hover',
                                  },
                                }}
                              >
                                <ListItemIcon
                                  sx={{
                                    color: isSubActive ? 'white' : 'text.secondary',
                                    minWidth: 36,
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
                                  isNestedExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />
                                )}
                              </ListItemButton>
                            </ListItem>
                            
                            {/* Nested Submenu */}
                            {hasNestedItems && (
                              <Collapse in={isNestedExpanded} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                  {subItem.subItems!.map((nestedItem: MenuItemType) => {
                                    const isNestedActive = location.pathname === nestedItem.path;
                                    return (
                                      <ListItem key={nestedItem.text} disablePadding>
                                        <ListItemButton
                                          onClick={() => handleNavigation(nestedItem.path)}
                                          sx={{
                                            pl: 6,
                                            py: 0.75,
                                            borderRadius: 0,
                                            backgroundColor: isNestedActive ? 'primary.light' : 'transparent',
                                            color: isNestedActive ? 'white' : 'text.secondary',
                                            '&:hover': {
                                              backgroundColor: isNestedActive ? 'primary.main' : 'action.hover',
                                            },
                                          }}
                                        >
                                          <ListItemIcon
                                            sx={{
                                              color: isNestedActive ? 'white' : 'text.secondary',
                                              minWidth: 32,
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
              </Box>
            </Box>
          );
          return item.allowedRoles ? (
            <RoleGuard key={item.text} allowedRoles={item.allowedRoles}>
              {content}
            </RoleGuard>
          ) : (
            content
          );
        })}
      </Box>
    </Box>
  );

  // Click-Outside Handler: Schließe Navigation wenn außerhalb geklickt wird
  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Prüfe, ob der Klick außerhalb der Navigation war
      if (!target.closest('[data-navigation-panel]') && !target.closest('[aria-label="open navigation"]')) {
        onClose();
      }
    };

    // Füge Event Listener hinzu
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  // Navigation als Dropdown-Panel unter dem Header
  return (
    <Collapse in={open} timeout={300}>
      <Paper
        elevation={4}
        data-navigation-panel
        sx={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1100, // Über Content, aber unter Modals
          maxHeight: { xs: 'calc(100vh - 64px)', sm: '70vh' },
          overflowY: 'auto',
          borderTop: 1,
          borderColor: 'divider',
          borderRadius: 0,
          backgroundColor: 'background.paper',
        }}
      >
        {navigationContent}
      </Paper>
    </Collapse>
  );
};

export default Sidebar;
