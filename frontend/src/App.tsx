import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { SnackbarProvider } from 'notistack';
// import { Global } from '@emotion/react'; // Disabled to prevent accessibility issues

// Layout Components
import Layout from './components/Layout/Layout';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientsHints from './pages/PatientsHints';
import Appointments from './pages/Appointments';
import Resources from './pages/Resources';
import Billing from './pages/Billing';
import Documents from './pages/Documents';
import OnlineBooking from './pages/OnlineBooking';
import ELGA from './pages/ELGA';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Security from './pages/Security';
import StaffManagement from './pages/StaffManagement';
import Calendar from './pages/Calendar';
import EnhancedCalendar from './pages/EnhancedCalendar';
import LocationManagement from './pages/LocationManagement';
import LocationDashboard from './components/LocationDashboard';
import LocationCalendar from './components/LocationCalendar';
import ServiceCatalog from './pages/ServiceCatalog';
import ServiceBookings from './pages/ServiceBookings';
import Settings from './pages/Settings';
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
import DekursVorlageAdmin from './pages/DekursVorlageAdmin';
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

// Theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
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
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
      styleOverrides: {
        root: {
          // Removed aria-hidden CSS to prevent accessibility issues
        },
      },
    },
    MuiModal: {
      styleOverrides: {
        root: {
          // Removed aria-hidden CSS to prevent accessibility issues
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

// App Content Component
const AppContent: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/online-booking" element={<OnlineBooking />} />
        <Route path="/checkin" element={<Checkin />} />
        
        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <Box
                  component="main"
                  sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    ml: { sm: sidebarOpen ? '240px' : '0px' },
                    transition: 'margin 0.3s ease',
                    overflow: 'hidden',
                    height: '100vh',
                  }}
                >
                  <Header onMenuClick={handleSidebarToggle} />
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/internal-messages" element={<InternalMessages />} />
                      <Route 
                        path="/patients" 
                        element={
                          <ProtectedRoute requiredPermissions={['patients.read']}>
                            <Patients />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/patients-hints" 
                        element={
                          <ProtectedRoute requiredPermissions={['patients.read']}>
                            <PatientsHints />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/appointments" 
                        element={
                          <ProtectedRoute requiredPermissions={['appointments.read']}>
                            <Appointments />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/calendar" 
                        element={
                          <ProtectedRoute requiredPermissions={['appointments.read']}>
                            <Calendar />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/enhanced-calendar" 
                        element={
                          <ProtectedRoute requiredPermissions={['appointments.read']}>
                            <EnhancedCalendar />
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
                <ProtectedRoute requiredPermissions={['locations.read']}>
                  <LocationManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/location-dashboard"
              element={
                <ProtectedRoute requiredPermissions={['locations.read']}>
                  <LocationDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/location-calendar"
              element={
                <ProtectedRoute requiredPermissions={['locations.read']}>
                  <LocationCalendar />
                </ProtectedRoute>
              }
            />
                      <Route 
                        path="/service-catalog" 
                        element={
                          <ProtectedRoute requiredPermissions={['services.read']}>
                            <ServiceCatalog />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/service-bookings" 
                        element={
                          <ProtectedRoute requiredPermissions={['bookings.read']}>
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
                        path="/performance-billing" 
                        element={
                          <ProtectedRoute requiredPermissions={['billing.read']}>
                            <PerformanceList />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/documents" 
                        element={
                          <ProtectedRoute requiredPermissions={['documents.read']}>
                            <Documents />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/template-management" 
                        element={
                          <ProtectedRoute requiredPermissions={['documents.write']}>
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
                          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
                            <DekursVorlageAdmin />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/ambulanzbefund/new/:patientId" 
                        element={
                          <ProtectedRoute requiredPermissions={['documents.write']}>
                            <AmbulanzbefundEditor />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/ambulanzbefund/:ambefundId" 
                        element={
                          <ProtectedRoute requiredPermissions={['documents.read']}>
                            <AmbulanzbefundEditor />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/appointments/:id" 
                        element={
                          <ProtectedRoute requiredPermissions={['appointments.read']}>
                            <AppointmentDetail />
                          </ProtectedRoute>
                        }
                      />
                      <Route 
                        path="/documents/:id" 
                        element={
                          <ProtectedRoute requiredPermissions={['documents.read']}>
                            <DocumentDetail />
                          </ProtectedRoute>
                        }
                      />
                      <Route 
                        path="/diagnoses/:id" 
                        element={
                          <ProtectedRoute requiredPermissions={['patients.read']}>
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
                          <ProtectedRoute requiredPermissions={['documents.read']}>
                            <XdsDocumentManagement />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/users" 
                        element={
                          <ProtectedRoute requiredPermissions={['users.read']}>
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
                        path="/security" 
                        element={
                          <ProtectedRoute requiredPermissions={['security.read']}>
                            <Security />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/patient-organizer/:id" 
                        element={
                          <ProtectedRoute requiredPermissions={['patients.read']}>
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
                        path="/staff" 
                        element={
                          <ProtectedRoute requiredPermissions={['staff.read']}>
                            <StaffManagement />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/settings" 
                        element={
                          <ProtectedRoute requiredPermissions={['settings.read']}>
                            <Settings />
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
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

function App() {
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