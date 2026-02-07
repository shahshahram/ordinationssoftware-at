import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Typography } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { loadNavigationMode, setSidebarOpen } from './store/slices/navigationSlice';
// import { Global } from '@emotion/react'; // Disabled to prevent accessibility issues

// Layout Components
import Layout from './components/Layout/Layout';
import Header from './components/Layout/Header';
import SidebarNavigation from './components/Layout/SidebarNavigation';
import ProtectedRoute from './components/ProtectedRoute';
import { ADMIN_ROLES } from './constants/roles';
import LocationProvider from './components/Location/LocationProvider';
import ChatbotWidget from './components/Chatbot/ChatbotWidget';
import GlobalSearch from './components/SmartSearch/GlobalSearch';

// Pages
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import TemporaryPatients from './pages/TemporaryPatients';
import PatientsHints from './pages/PatientsHints';
import Appointments from './pages/Appointments';
import Resources from './pages/Resources';
import Billing from './pages/Billing';
import CashRegisterManagement from './pages/CashRegisterManagement';
import Documents from './pages/Documents';
import LetterTemplates from './pages/LetterTemplates';
import OnlineBooking from './pages/OnlineBooking';
import BookingWidgetPage from './pages/BookingWidgetPage';
import OnlineBookings from './pages/OnlineBookings';
import PatientBooking from './pages/PatientBooking';
import AppointmentManagementPage from './pages/AppointmentManagementPage';
import WaitingListReservation from './pages/WaitingListReservation';
import ELGA from './pages/ELGA';
import Users from './pages/Users';
import Reports from './pages/Reports';
import BillingReports from './pages/BillingReports';
import Journal from './pages/Journal';
import Security from './pages/Security';
import StaffManagement from './pages/StaffManagement';
import StaffPlanning from './pages/StaffPlanning';
import Calendar from './pages/Calendar';
import DemoCalendar from './pages/DemoCalendar';
// import EnhancedCalendar from './pages/EnhancedCalendar'; // Currently not used
import ServiceDemoCalendar from './pages/ServiceDemoCalendar';
import LocationManagement from './pages/LocationManagement';
import LocationDashboard from './components/LocationDashboard';
import LocationCalendar from './components/LocationCalendar';
import MedicalSpecialties from './pages/MedicalSpecialties';
import DekursVorlagenAdmin from './pages/DekursVorlagenAdmin';
import ServiceCatalog from './pages/ServiceCatalog';
import ServiceBookings from './pages/ServiceBookings';
import Settings from './pages/Settings';
import UpdateMonitoringPage from './pages/UpdateMonitoringPage';
import ICD10Demo from './pages/ICD10Demo';
import ICD10CatalogManagement from './pages/ICD10CatalogManagement';
import ELGAValuesetManagement from './pages/ELGAValuesetManagement';
import XdsDocumentManagement from './pages/XdsDocumentManagement';
import AppointmentDetail from './pages/AppointmentDetail';
import DocumentDetail from './pages/DocumentDetail';
import DiagnosisDetail from './pages/DiagnosisDetail';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import ErrorBoundary from './components/ErrorBoundary';
import PatientOrganizer from './pages/PatientOrganizer';
import TemplateManagement from './pages/TemplateManagement';
import DocumentTemplateAdmin from './pages/DocumentTemplateAdmin';
import AmbulanzbefundEditor from './pages/AmbulanzbefundEditor';
import SuperAdminSetup from './pages/SuperAdminSetup';
import PerformanceList from './components/PerformanceList';
import MedicationImport from './pages/MedicationImport';

// Patient Admission Forms
import PatientAdmissionPage from './pages/PatientAdmissionPage';
import SelfCheckInPage from './pages/SelfCheckInPage';
import PatientAdmissionDemo from './pages/PatientAdmissionDemo';
import PatientAdmissionTest from './pages/PatientAdmissionTest';
import RBACManagement from './pages/RBACManagement';
import RBACDiscovery from './pages/RBACDiscovery';
import Checkin from './pages/Checkin';
import InternalMessages from './pages/InternalMessages';
import Chat from './pages/Chat';
import Reimbursements from './pages/Reimbursements';
import Absences from './pages/Absences';
import AddressBook from './pages/AddressBook';
import WorkShifts from './pages/WorkShifts';
import Timesheet from './pages/Timesheet';
import ClinicHours from './pages/ClinicHours';
import Availability from './pages/Availability';
import ServiceCategories from './pages/ServiceCategories';
import ECardValidation from './pages/ECardValidation';
import IntegrationStatus from './pages/IntegrationStatus';
import WaitingList from './pages/WaitingList';
import DicomProviderManagement from './pages/DicomProviderManagement';
import DicomTestPage from './pages/DicomTestPage';
import LaborProviderManagement from './pages/LaborProviderManagement';
import InsuranceProviderManagement from './pages/InsuranceProviderManagement';
import LaborTestPage from './pages/LaborTestPage';
import KassaTestPage from './pages/KassaTestPage';
import ELDATestPage from './pages/ELDATestPage';
import WAHonlineTestPage from './pages/WAHonlineTestPage';
import TariffManagement from './pages/TariffManagement';
import ServiceCodeMappingManagement from './pages/ServiceCodeMappingManagement';

// Theme-Funktion, die basierend auf dem Modus ein Theme erstellt
const getTheme = (mode: 'light' | 'dark') => createTheme({
  palette: {
    mode,
    primary: {
      main: '#0284C7', // Hauptfarbe aus Logo (Cyan-Blau)
      light: '#2DD4BF', // Helle Farbe aus Logo (Türkis)
      dark: '#0EA5E9', // Dunkle Farbe aus Logo (Helles Blau)
    },
    secondary: {
      main: '#334155', // Textfarbe aus Logo (Dunkelgrau)
    },
    background: {
      default: mode === 'dark' ? '#121212' : '#f5f5f5',
      paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
    },
    text: {
      primary: mode === 'dark' ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
      secondary: mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: mode === 'dark' 
            ? '0 2px 8px rgba(0,0,0,0.3)' 
            : '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiDrawer: {
      defaultProps: {
        ModalProps: {
          disableEnforceFocus: true,
          disableAutoFocus: true,
          disableRestoreFocus: true,
        },
      },
    },
    MuiDialog: {
      defaultProps: {
        disableEnforceFocus: false,
        disableAutoFocus: false,
        disableRestoreFocus: false,
        hideBackdrop: false,
      },
      styleOverrides: {
        root: {
          // Verhindere aria-hidden auf root-Element, wenn Dialog geöffnet ist
          '&[aria-hidden="true"]': {
            '&:focus-within': {
              '& *': {
                pointerEvents: 'auto',
              },
            },
          },
        },
      },
    },
    MuiModal: {
      defaultProps: {
        disableEnforceFocus: false,
        disableAutoFocus: false,
        disableRestoreFocus: false,
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          color: mode === 'dark' ? '#ffffff' : 'rgba(0, 0, 0, 0.87)',
        },
      },
    },
  },
});

// Global CSS for aria-hidden fix - disabled to prevent accessibility issues
// const globalStyles = (
//   <Global
//     styles={{
//       '#root[aria-hidden="true"] *': {
//         pointerEvents: 'none',
//       },
//     }}
//   />
// );

/** Weiterleitung von /patients/:id auf /patient-organizer/:id (z. B. ?tab=fotos bleibt erhalten). */
const NavigateToPatientOrganizer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { search } = useLocation();
  return <Navigate to={`/patient-organizer/${id || ''}${search}`} replace />;
};

// Inner Content Component (muss innerhalb Router sein)
const InnerAppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const navigationMode = useAppSelector((state) => state.navigation.mode);
  const sidebarOpen = useAppSelector((state) => state.navigation.sidebarOpen);
  const [localSidebarOpen, setLocalSidebarOpen] = React.useState(false);
  
  // Synchronisiere lokalen State mit Redux
  React.useEffect(() => {
    setLocalSidebarOpen(sidebarOpen);
  }, [sidebarOpen]);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  // Lade Navigation-Modus beim Login
  React.useEffect(() => {
    if (isAuthenticated) {
      dispatch(loadNavigationMode());
    }
  }, [isAuthenticated, dispatch]);

  const handleSidebarToggle = () => {
    const newState = !localSidebarOpen;
    setLocalSidebarOpen(newState);
    dispatch(setSidebarOpen(newState));
  };

  // Tastaturkürzel für globale Suche (Ctrl/Cmd + K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  // aria-hidden: Wenn MUI einen Dialog öffnet, setzt es aria-hidden auf #root.
  // Blur des aktiven Elements VOR dem Setzen von aria-hidden reduziert die Browser-Warnung.
  React.useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    const blurFocusInRoot = () => {
      const active = document.activeElement as HTMLElement | null;
      if (active && root.contains(active) && typeof active.blur === 'function') {
        active.blur();
      }
    };

    // Sobald aria-hidden auf #root gesetzt wird: Fokus aus #root entfernen
    const ariaObserver = new MutationObserver(() => {
      if (root.getAttribute('aria-hidden') === 'true') blurFocusInRoot();
    });
    ariaObserver.observe(root, { attributes: true, attributeFilter: ['aria-hidden'] });

    // Wenn ein Modal/Overlay ins DOM kommt: sofort bluren (läuft oft vor aria-hidden)
    const bodyObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLElement && (
              node.getAttribute('role') === 'presentation' ||
              node.classList?.contains('MuiModal-root') ||
              (node.querySelector && node.querySelector('[role="dialog"]'))
            )) {
              blurFocusInRoot();
              return;
            }
          }
        }
      }
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      ariaObserver.disconnect();
      bodyObserver.disconnect();
    };
  }, []);

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/online-booking" element={<OnlineBooking />} />
        <Route path="/booking/widget/:doctorId" element={<BookingWidgetPage />} />
        <Route path="/booking/preview/:locationId" element={<BookingWidgetPage />} />
        <Route path="/patient-booking/:token" element={<PatientBooking />} />
        <Route path="/portal/appointment/:token" element={<AppointmentManagementPage />} />
        <Route path="/waiting-list-reservation/:token" element={<WaitingListReservation />} />
        <Route path="/checkin" element={<Checkin />} />
        
        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <LocationProvider>
                <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                  {/* Header außerhalb des main-Box, damit er immer volle Breite hat */}
                  <Header 
                    onMenuClick={handleSidebarToggle} 
                    navigationOpen={localSidebarOpen}
                    onSearchClick={() => setSearchOpen(true)}
                  />
                  
                  {/* Chatbot Widget - global verfügbar */}
                  <ChatbotWidget />
                  
                  {/* Globale Suche */}
                  <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
                  
                  <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                    {/* Sidebar Navigation (nur wenn Sidebar-Modus aktiv) */}
                    {navigationMode === 'sidebar' && (
                      <SidebarNavigation open={localSidebarOpen} onClose={() => {
                        setLocalSidebarOpen(false);
                        dispatch(setSidebarOpen(false));
                      }} />
                    )}
                    <Box
                      component="main"
                      sx={{
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        ml: { 
                          sm: navigationMode === 'sidebar' && localSidebarOpen ? '240px' : '0px',
                          xs: 0 
                        },
                        transition: 'margin 0.3s ease',
                        overflow: 'hidden',
                        minHeight: 0, // Wichtig für Flexbox overflow
                        position: 'relative',
                      }}
                    >
                      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0, pb: 4 }}>
                        <Layout>
                      <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/internal-messages" element={<InternalMessages />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route 
                        path="/patients" 
                        element={
                          <ProtectedRoute requiredPermissions={['patient.read']}>
                            <Patients />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/temporary-patients" 
                        element={
                          <ProtectedRoute requiredPermissions={['patient.read']}>
                            <TemporaryPatients />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/patients-hints" 
                        element={
                          <ProtectedRoute requiredPermissions={['patient.read']}>
                            <PatientsHints />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/address-book" 
                        element={
                          <ProtectedRoute requiredPermissions={['patient.read']}>
                            <AddressBook />
                          </ProtectedRoute>
                        }
                      />
                      <Route 
                        path="/waiting-list" 
                        element={
                          <ProtectedRoute requiredPermissions={['patient.read']}>
                            <WaitingList />
                          </ProtectedRoute>
                        }
                      />
                      <Route 
                        path="/appointments" 
                        element={
                          <ProtectedRoute requiredPermissions={['appointment.read']}>
                            <Appointments />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/online-bookings" 
                        element={
                          <ProtectedRoute requiredPermissions={['appointment.read']}>
                            <OnlineBookings />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/calendar" 
                        element={
                          <ProtectedRoute requiredPermissions={['appointment.read']}>
                            <Calendar />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/demo-calendar" 
                        element={
                          <ProtectedRoute requiredPermissions={['appointment.read']}>
                            <DemoCalendar />
                          </ProtectedRoute>
                        } 
                      />
                      {/* <Route 
                        path="/enhanced-calendar" 
                        element={
                          <ProtectedRoute requiredPermissions={['appointment.read']}>
                            <EnhancedCalendar />
                          </ProtectedRoute>
                        } 
                      /> */}
                      <Route 
                        path="/service-demo-calendar" 
                        element={
                          <ProtectedRoute requiredPermissions={['appointment.read']}>
                            <ServiceDemoCalendar />
                          </ProtectedRoute>
                        } 
                      />
                      <Route path="/resources" element={<Resources />} />
                      <Route path="/icd10-demo" element={<ICD10Demo />} />
                      <Route 
                        path="/icd10-catalog-management" 
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <ICD10CatalogManagement />
                          </ProtectedRoute>
                        } 
                      />
            <Route
              path="/locations"
              element={
                <ProtectedRoute requiredPermissions={['location.read']}>
                  <LocationManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/location-dashboard"
              element={
                <ProtectedRoute requiredPermissions={['location.read']}>
                  <LocationDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/location-calendar"
              element={
                <ProtectedRoute requiredPermissions={['location.read']}>
                  <LocationCalendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/medical-specialties"
              element={
                <ProtectedRoute requiredRole={['admin', 'super_admin']}>
                  <MedicalSpecialties />
                </ProtectedRoute>
              }
            />
                      <Route 
                        path="/service-catalog" 
                        element={
                          <ProtectedRoute requiredPermissions={['service.read']}>
                            <ServiceCatalog />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/service-bookings" 
                        element={
                          <ProtectedRoute requiredPermissions={['appointment.read']}>
                            <ServiceBookings />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/billing" 
                        element={
                          <ProtectedRoute requiredPermissions={['billing.read']}>
                            <Billing />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/cash-register" 
                        element={
                          <ProtectedRoute requiredPermissions={['billing.read']}>
                            <CashRegisterManagement />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/performance-billing" 
                        element={
                          <ProtectedRoute requiredPermissions={['billing.read']}>
                            <PerformanceList />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/reimbursements" 
                        element={
                          <ProtectedRoute requiredPermissions={['billing.read']}>
                            <Reimbursements />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/documents" 
                        element={
                          <ProtectedRoute requiredPermissions={['document.read']}>
                            <Documents />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/letter-templates" 
                        element={
                          <ProtectedRoute requiredPermissions={['document.read']}>
                            <LetterTemplates />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/template-management" 
                        element={
                          <ProtectedRoute requiredPermissions={['document.write']}>
                            <TemplateManagement />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/document-templates" 
                        element={
                          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
                            <DocumentTemplateAdmin />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/dekurs-vorlagen" 
                        element={
                          <ProtectedRoute requiredRole={['admin', 'super_admin', 'arzt']}>
                            <DekursVorlagenAdmin />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/ambulanzbefund/new/:patientId" 
                        element={
                          <ProtectedRoute requiredPermissions={['document.write']}>
                            <AmbulanzbefundEditor />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/ambulanzbefund/:ambefundId" 
                        element={
                          <ProtectedRoute requiredPermissions={['document.read']}>
                            <AmbulanzbefundEditor />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/appointments/:id" 
                        element={
                          <ProtectedRoute requiredPermissions={['appointment.read']}>
                            <AppointmentDetail />
                          </ProtectedRoute>
                        }
                      />
                      <Route 
                        path="/documents/:id" 
                        element={
                          <ProtectedRoute requiredPermissions={['document.read']}>
                            <DocumentDetail />
                          </ProtectedRoute>
                        }
                      />
                      <Route 
                        path="/diagnoses/:id" 
                        element={
                          <ProtectedRoute requiredPermissions={['patient.read']}>
                            <DiagnosisDetail />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/elga" element={<ELGA />} />
                      <Route 
                        path="/elga-valuesets" 
                        element={
                          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
                            <ELGAValuesetManagement />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/xds-documents" 
                        element={
                          <ProtectedRoute requiredPermissions={['document.read']}>
                            <XdsDocumentManagement />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/users" 
                        element={
                          <ProtectedRoute requiredRole={[...ADMIN_ROLES]} requiredPermissions={['user.read']}>
                            <Users />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/reports" 
                        element={
                          <ProtectedRoute requiredPermissions={['reports.read']}>
                            <Reports />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/billing-reports" 
                        element={
                          <ProtectedRoute requiredPermissions={['billing.read']}>
                            <BillingReports />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/journal" 
                        element={
                          <ProtectedRoute requiredPermissions={['billing.read']}>
                            <Journal />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/security" 
                        element={
                          <ProtectedRoute requiredPermissions={['security.read']}>
                            <Security />
                          </ProtectedRoute>
                        } 
                      />
                      <Route path="/patients/:id" element={<NavigateToPatientOrganizer />} />
                      <Route 
                        path="/patient-organizer/:id" 
                        element={
                          <ProtectedRoute requiredPermissions={['patient.read']}>
                            <PatientOrganizer />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/patient-admission" 
                        element={
                          <ProtectedRoute>
                            <PatientAdmissionPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/self-checkin" 
                        element={<SelfCheckInPage />} 
                      />
                      <Route 
                        path="/patient-admission-demo" 
                        element={
                          <ProtectedRoute>
                            <PatientAdmissionDemo />
                          </ProtectedRoute>
                        }
                      />
                      <Route 
                        path="/patient-admission-test" 
                        element={<PatientAdmissionTest />}
                      />
                      <Route 
                        path="/super-admin-setup" 
                        element={<SuperAdminSetup />}
                      />
                      <Route 
                        path="/staff-planning" 
                        element={
                          <ProtectedRoute requiredPermissions={['staff.read']}>
                            <StaffPlanning />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/staff" 
                        element={
                          <ProtectedRoute requiredPermissions={['staff.read']}>
                            <StaffManagement />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/absences" 
                        element={
                          <ProtectedRoute requiredPermissions={['staff.read']}>
                            <Absences />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/work-shifts" 
                        element={
                          <ProtectedRoute requiredPermissions={['staff.read']}>
                            <WorkShifts />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/timesheet" 
                        element={
                          <ProtectedRoute requiredPermissions={['staff.read']}>
                            <Timesheet />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/clinic-hours" 
                        element={
                          <ProtectedRoute requiredPermissions={['settings.read']}>
                            <ClinicHours />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/availability" 
                        element={
                          <ProtectedRoute requiredPermissions={['appointment.read']}>
                            <Availability />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/service-categories" 
                        element={
                          <ProtectedRoute requiredPermissions={['service.read']}>
                            <ServiceCategories />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/tariff-management" 
                        element={
                          <ProtectedRoute requiredPermissions={['service.read']}>
                            <TariffManagement />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/service-code-mapping" 
                        element={
                          <ProtectedRoute requiredPermissions={['service.read']}>
                            <ServiceCodeMappingManagement />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/ecard-validation" 
                        element={
                          <ProtectedRoute requiredPermissions={['patient.read']}>
                            <ECardValidation />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/settings" 
                        element={
                          <ProtectedRoute requiredRole={[...ADMIN_ROLES]} requiredPermissions={['settings.read']}>
                            <Settings />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/update-monitoring" 
                        element={
                          <ProtectedRoute requiredPermissions={['settings.read']}>
                            <UpdateMonitoringPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/integration-status" 
                        element={
                          <ProtectedRoute requiredPermissions={['settings.read']}>
                            <IntegrationStatus />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/dicom-providers" 
                        element={
                          <ProtectedRoute requiredPermissions={['settings.read']}>
                            <DicomProviderManagement />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/dicom-test" 
                        element={
                          <ProtectedRoute requiredPermissions={['settings.read']}>
                            <DicomTestPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/labor-providers" 
                        element={
                          <ProtectedRoute requiredPermissions={['settings.read']}>
                            <LaborProviderManagement />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/insurance-providers" 
                        element={
                          <ProtectedRoute requiredPermissions={['settings.read']}>
                            <InsuranceProviderManagement />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/labor-test" 
                        element={
                          <ProtectedRoute requiredPermissions={['settings.read']}>
                            <LaborTestPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/kassa-test" 
                        element={
                          <ProtectedRoute requiredPermissions={['settings.read']}>
                            <KassaTestPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/elda-test" 
                        element={
                          <ProtectedRoute requiredPermissions={['settings.read']}>
                            <ELDATestPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/wahonline-test" 
                        element={
                          <ProtectedRoute requiredPermissions={['settings.read']}>
                            <WAHonlineTestPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/medication-import" 
                        element={
                          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
                            <MedicationImport />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/rbac-management" 
                        element={
                          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
                            <RBACManagement />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/rbac-discovery" 
                        element={
                          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
                            <RBACDiscovery />
                          </ProtectedRoute>
                        } 
                      />
                      </Routes>
                        </Layout>
                      </Box>
                      
                    </Box>
                    
                    {/* Footer mit Versionsnummer - immer am unteren linken Rand des Viewports */}
                    <Box
                      sx={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        px: 2,
                        py: 1,
                        borderTop: 1,
                        borderColor: 'divider',
                        backgroundColor: 'background.paper',
                        display: 'flex',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        zIndex: 1200,
                        width: { 
                          sm: navigationMode === 'sidebar' && localSidebarOpen ? 'calc(100% - 240px)' : '100%',
                          xs: '100%'
                        },
                        ml: { 
                          sm: navigationMode === 'sidebar' && localSidebarOpen ? '240px' : '0px',
                          xs: 0 
                        },
                        transition: 'margin-left 0.3s ease, width 0.3s ease',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Version 1.0.0
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </LocationProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
};

// App Content Component
const AppContent: React.FC = () => {
  return (
    <Router>
      <InnerAppContent />
    </Router>
  );
};

function App() {
  const themeMode = useAppSelector((state) => state.ui.theme);
  const theme = React.useMemo(() => getTheme(themeMode), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider 
        maxSnack={3}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        autoHideDuration={3000}
      >
        {/* globalStyles disabled to prevent accessibility issues */}
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;