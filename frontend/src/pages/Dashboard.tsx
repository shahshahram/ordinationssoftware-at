import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Edit,
  Save,
  Cancel,
  QrCode,
  Tablet
} from '@mui/icons-material';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '../styles/dashboard.css';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchDashboardWidgets,
  saveDashboardWidget,
  updateDashboardWidget,
  deleteDashboardWidget,
  reorderDashboardWidgets,
  DashboardWidget
} from '../store/slices/dashboardWidgetsSlice';
import { generateCheckInCode, clearError } from '../store/slices/checkinSlice';
import WidgetRenderer from '../components/Dashboard/WidgetRenderer';
import WidgetSelectorDialog, { AVAILABLE_WIDGETS } from '../components/Dashboard/WidgetSelectorDialog';
import EldaMaintenanceAlert from '../components/Dashboard/EldaMaintenanceAlert';
import QRCodeGenerator from '../components/QRCodeGenerator';
import TabletMode from '../components/TabletMode';
import InternalMessagesDialog from '../components/InternalMessagesDialog';
import { fetchUnreadCount } from '../store/slices/internalMessagesSlice';
import GradientDialogTitle from '../components/GradientDialogTitle';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';
import {
  People,
  CalendarToday,
  Receipt,
  TrendingUp,
  Schedule,
  Warning,
  EventNote,
  Assessment,
  Medication,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import api from '../utils/api';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const _isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  
  const { widgets, loading, error } = useAppSelector((state) => state.dashboardWidgets);
  const { qrCode, isLoading: qrLoading, error: qrError } = useAppSelector((state) => state.checkin);
  const { user: _user } = useAppSelector((state) => state.auth);
  const { marginTopValue } = useGlobalNavigationOffset();
  
  const [editMode, setEditMode] = useState(false);
  const [widgetSelectorOpen, setWidgetSelectorOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [tabletModeOpen, setTabletModeOpen] = useState(false);
  const [messagesDialogOpen, setMessagesDialogOpen] = useState(false);
  const [layout, setLayout] = useState<GridLayout.Layout[]>([]);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [newLaborResults, setNewLaborResults] = useState<any[]>([]);
  const [newDicomStudies, setNewDicomStudies] = useState<any[]>([]);
  const [importantPatients, setImportantPatients] = useState<any[]>([]);
  const [newOnlineBookings, setNewOnlineBookings] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [_loadingStats, setLoadingStats] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  
  // Refs um Widget-IDs zu speichern und Endlosschleifen zu vermeiden
  const importantPatientsWidgetIdRef = useRef<string | null>(null);
  const laborWidgetIdRef = useRef<string | null>(null);
  const dicomWidgetIdRef = useRef<string | null>(null);
  const onlineBookingsWidgetIdRef = useRef<string | null>(null);
  const lastImportantPatientsUpdateRef = useRef<string>('');
  const lastLaborResultsUpdateRef = useRef<string>('');
  const lastDicomStudiesUpdateRef = useRef<string>('');
  const lastOnlineBookingsUpdateRef = useRef<string>('');

  // Initialisiere Widget-IDs wenn widgets geladen werden
  useEffect(() => {
    if (widgets.length > 0) {
      const importantPatientsWidget = widgets.find(w => w.widgetId === 'important-patients');
      if (importantPatientsWidget?._id) {
        importantPatientsWidgetIdRef.current = importantPatientsWidget._id;
      }
      
      const laborWidget = widgets.find(w => w.widgetId === 'new-labor-results');
      if (laborWidget?._id) {
        laborWidgetIdRef.current = laborWidget._id;
      }
      
      const dicomWidget = widgets.find(w => w.widgetId === 'new-dicom-studies');
      if (dicomWidget?._id) {
        dicomWidgetIdRef.current = dicomWidget._id;
      }
      
      const onlineBookingsWidget = widgets.find(w => w.widgetId === 'new-online-bookings');
      if (onlineBookingsWidget?._id) {
        onlineBookingsWidgetIdRef.current = onlineBookingsWidget._id;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- widgets bewusst begrenzt
  }, [widgets.length]); // Nur wenn sich die Anzahl der Widgets ändert

  // Lade wichtige Patienten (mit Zusatzversicherungen)
  useEffect(() => {
    const fetchImportantPatients = async () => {
      try {
        const response = await api.get<any>('/patients-extended/important?limit=10');
        if (response.data?.success && response.data?.data) {
          const formattedPatients = response.data.data.map((patient: any) => ({
            ...patient,
            onClick: (e?: React.MouseEvent) => {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
              if (patient.patientId || patient._id) {
                const patientId = patient.patientId || patient._id;
                const patientIdStr = typeof patientId === 'string' ? patientId : String(patientId);
                window.location.href = `/patient-organizer/${patientIdStr}`;
              }
            }
          }));
          
          setImportantPatients(formattedPatients);
          
          // Update Widget-Daten nur wenn sich die Daten geändert haben
          const itemsToSave = formattedPatients.map(({ onClick: _onClick, ...rest }: any) => rest);
          const itemsHash = JSON.stringify(itemsToSave);
          
          if (itemsHash !== lastImportantPatientsUpdateRef.current && importantPatientsWidgetIdRef.current) {
            lastImportantPatientsUpdateRef.current = itemsHash;
            dispatch(updateDashboardWidget({
              id: importantPatientsWidgetIdRef.current,
              updates: {
                config: { items: itemsToSave }
              }
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching important patients:', error);
      }
    };
    
    fetchImportantPatients();
    // Aktualisiere alle 5 Minuten
    const interval = setInterval(fetchImportantPatients, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dispatch]);
  
  // Lade neue Laborwerte
  useEffect(() => {
    const fetchNewLaborResults = async () => {
      try {
        // 3 Tage = 72 Stunden
        const response = await api.get<any>('/labor/recent?hours=72&limit=10');
        console.log('🔍 Dashboard: Labor results response:', response);
        
        // Die API-Klasse gibt { data: backendResponse, success, message } zurück
        // Das Backend gibt { success: true, data: [...], count: ... } zurück
        // Also ist response.data das Backend-Response-Objekt
        const backendData = response.data;
        const laborResultsArray = backendData?.data || backendData || [];
        
        console.log('🔍 Dashboard: Labor results array:', laborResultsArray);
        
        if (response.success && Array.isArray(laborResultsArray) && laborResultsArray.length > 0) {
          // Sortiere nach Datum: neueste zuerst
          const sortedResults = [...laborResultsArray].sort((a: any, b: any) => {
            const dateA = new Date(a.receivedAt || a.createdAt || a.resultDate).getTime();
            const dateB = new Date(b.receivedAt || b.createdAt || b.resultDate).getTime();
            return dateB - dateA; // Neueste zuerst
          });
          
          const formattedItems = sortedResults.map((item: any) => {
            const date = new Date(item.receivedAt || item.createdAt || item.resultDate);
            const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            // Prüfe ob das Item neu ist (innerhalb der letzten 24 Stunden)
            const now = new Date();
            const hoursSinceCreation = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
            const isNew = hoursSinceCreation < 24;
            
            // Stelle sicher, dass patientId vorhanden ist
            const patientId = item.patientId;
            console.log('🔍 Dashboard: Processing labor result item', { 
              patientName: item.patientName, 
              patientId: patientId, 
              patientIdType: typeof patientId,
              fullItem: item 
            });
            
            return {
              primary: item.patientName || 'Unbekannt',
              secondary: `${item.testCount || 0} Tests • ${dateStr} ${timeStr}`,
              icon: 'Science', // Labor-Icon (Reagenzglas)
              chip: item.hasCriticalValues 
                ? { label: `${item.criticalCount || 0} kritisch`, color: 'error' as const }
                : { label: item.providerName || 'Unbekannt', color: 'default' as const },
              details: `Laborwerte für ${item.patientName || 'Unbekannt'}\n\nAnzahl Tests: ${item.testCount || 0}\nLabor: ${item.providerName || 'Unbekannt'}\nEingetroffen: ${dateStr} um ${timeStr}${item.hasCriticalValues ? `\n\n⚠️ ${item.criticalCount || 0} kritische Werte vorhanden!` : ''}`,
              patientId: patientId ? String(patientId) : null, // Speichere patientId explizit
              isNew: isNew, // Flag für farbliche Hervorhebung
              onClick: (e?: React.MouseEvent) => {
                if (e) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                // Navigiere zum Patienten
                const currentPatientId = patientId || item.patientId;
                if (currentPatientId) {
                  // Konvertiere patientId zu String (falls es ein ObjectId-Objekt ist)
                  const patientIdStr = typeof currentPatientId === 'string' ? currentPatientId : String(currentPatientId);
                  console.log('🔍 Dashboard: onClick triggered - Navigating to patient labor values', { 
                    patientId: patientIdStr, 
                    originalPatientId: currentPatientId, 
                    fullItem: item,
                    hasPatientId: !!currentPatientId
                  });
                  // Verwende window.location für zuverlässige Navigation
                  window.location.href = `/patient-organizer/${patientIdStr}?tab=laborwerte`;
                } else {
                  console.error('❌ Dashboard: No patientId in labor result item - cannot navigate', item);
                }
              }
            };
          });
          
          console.log('🔍 Dashboard: Formatted items:', formattedItems);
          // Prüfe ob patientId vorhanden ist
          formattedItems.forEach((item: any, index: number) => {
            console.log(`🔍 Dashboard: Item ${index}:`, { 
              primary: item.primary, 
              patientId: item.patientId, 
              hasOnClick: !!item.onClick,
              onClickType: typeof item.onClick
            });
          });
          setNewLaborResults(formattedItems);
          
          // Aktualisiere Widget-Konfiguration nur wenn sich die Items geändert haben
          // WICHTIG: Speichere KEINE onClick-Handler in der Widget-Konfiguration, da diese nicht serialisiert werden können
          if (laborWidgetIdRef.current) {
            // Entferne onClick-Handler und isNew Flag für Vergleich (werden nicht gespeichert)
            const itemsToSave = formattedItems.map(({ onClick: _onClick, isNew: _isNew, ...rest }: any) => rest);
            const itemsHash = JSON.stringify(itemsToSave);
            
            // Prüfe ob sich die Items geändert haben, um Endlosschleife zu vermeiden
            if (itemsHash !== lastLaborResultsUpdateRef.current) {
              lastLaborResultsUpdateRef.current = itemsHash;
              dispatch(updateDashboardWidget({
                id: laborWidgetIdRef.current,
                updates: {
                  config: { items: itemsToSave }
                }
              }));
            }
          }
        } else {
          console.log('🔍 Dashboard: No labor results found or empty array');
          setNewLaborResults([]);
        }
      } catch (err) {
        console.error('Error fetching new labor results:', err);
        setNewLaborResults([]);
      }
    };
    
    fetchNewLaborResults();
    // Aktualisiere alle 5 Minuten
    const interval = setInterval(fetchNewLaborResults, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Lade neue DICOM-Studien
  useEffect(() => {
    const fetchNewDicomStudies = async () => {
      try {
        // 3 Tage = 72 Stunden
        const response = await api.get<any>('/dicom/recent?hours=72&limit=10');
        console.log('🔍 Dashboard: DICOM studies response:', response);
        
        const backendData = response.data;
        const dicomStudiesArray = backendData?.data || backendData || [];
        
        console.log('🔍 Dashboard: DICOM studies array:', dicomStudiesArray);
        console.log('🔍 Dashboard: response.data.success:', backendData?.success);
        console.log('🔍 Dashboard: Array length:', Array.isArray(dicomStudiesArray) ? dicomStudiesArray.length : 'not an array');
        
        if ((backendData?.success !== false) && Array.isArray(dicomStudiesArray) && dicomStudiesArray.length > 0) {
          // Sortiere nach Datum: neueste zuerst
          const sortedStudies = [...dicomStudiesArray].sort((a: any, b: any) => {
            const dateA = new Date(a.uploadedAt || a.studyDate || 0).getTime();
            const dateB = new Date(b.uploadedAt || b.studyDate || 0).getTime();
            return dateB - dateA; // Neueste zuerst
          });
          
          const formattedItems = sortedStudies.map((item: any) => {
            const date = new Date(item.uploadedAt || item.studyDate);
            const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            // Prüfe ob das Item neu ist (innerhalb der letzten 24 Stunden)
            const now = new Date();
            const hoursSinceCreation = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
            const isNew = hoursSinceCreation < 24;
            
            const patientId = item.patientId;
            
            return {
              primary: item.patientName || 'Unbekannt',
              secondary: `${item.studyDescription || item.modality || 'DICOM-Studie'} • ${dateStr} ${timeStr}`,
              icon: 'LocalHospital',
              chip: item.modality 
                ? { label: item.modality, color: 'primary' as const }
                : { label: 'DICOM', color: 'default' as const },
              details: `DICOM-Studie für ${item.patientName || 'Unbekannt'}\n\nStudie: ${item.studyDescription || item.modality || 'DICOM-Studie'}\nModalität: ${item.modality || 'Unbekannt'}\nHochgeladen: ${dateStr} um ${timeStr}`,
              patientId: patientId ? String(patientId) : null,
              isNew: isNew, // Flag für farbliche Hervorhebung
              onClick: (e?: React.MouseEvent) => {
                if (e) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                const currentPatientId = patientId || item.patientId;
                if (currentPatientId) {
                  const patientIdStr = typeof currentPatientId === 'string' ? currentPatientId : String(currentPatientId);
                  window.location.href = `/patient-organizer/${patientIdStr}?tab=dicom`;
                }
              }
            };
          });
          
          setNewDicomStudies(formattedItems);
          
          // Aktualisiere Widget-Konfiguration nur wenn sich die Items geändert haben
          if (dicomWidgetIdRef.current) {
            // Entferne onClick-Handler und isNew Flag für Vergleich (werden nicht gespeichert)
            const itemsToSave = formattedItems.map(({ onClick: _onClick, isNew: _isNew, ...rest }: any) => rest);
            const itemsHash = JSON.stringify(itemsToSave);
            
            // Prüfe ob sich die Items geändert haben, um Endlosschleife zu vermeiden
            if (itemsHash !== lastDicomStudiesUpdateRef.current) {
              lastDicomStudiesUpdateRef.current = itemsHash;
              dispatch(updateDashboardWidget({
                id: dicomWidgetIdRef.current,
                updates: {
                  config: { items: itemsToSave }
                }
              }));
            }
          }
        } else {
          setNewDicomStudies([]);
        }
      } catch (err) {
        console.error('Error fetching new DICOM studies:', err);
        setNewDicomStudies([]);
      }
    };
    
    fetchNewDicomStudies();
    // Aktualisiere alle 5 Minuten
    const interval = setInterval(fetchNewDicomStudies, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Lade neue Online-Buchungen (letzte 3 Tage)
  useEffect(() => {
    const fetchNewOnlineBookings = async () => {
      try {
        // Berechne Datum vor 3 Tagen
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const _threeDaysAgoISO = threeDaysAgo.toISOString();
        
        // Lade alle Termine und filtere nach Online-Buchungen der letzten 3 Tage
        const response = await api.get<any>('/appointments?limit=1000');
        console.log('🔍 Dashboard: Online bookings response:', response);
        
        const backendData = response.data;
        const appointmentsArray = backendData?.data || backendData || [];
        
        // Filtere nach Online-Buchungen der letzten 3 Tage
        const onlineBookings = appointmentsArray.filter((apt: any) => {
          const isOnline = apt.bookingType === 'online' || apt.onlineBookingRef || apt.isOnlineBooking === true;
          const createdAt = new Date(apt.createdAt || apt.startTime);
          const isRecent = createdAt >= threeDaysAgo;
          return isOnline && isRecent;
        });
        
        // Sortiere nach Erstellungsdatum: neueste zuerst
        const sortedBookings = [...onlineBookings].sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || a.startTime || 0).getTime();
          const dateB = new Date(b.createdAt || b.startTime || 0).getTime();
          return dateB - dateA; // Neueste zuerst
        });
        
        console.log('🔍 Dashboard: Online bookings filtered:', sortedBookings.length);
        
        if (sortedBookings.length > 0) {
          const formattedItems = sortedBookings.slice(0, 10).map((item: any) => {
            const createdAt = new Date(item.createdAt || item.startTime);
            const timeStr = createdAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const dateStr = createdAt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            // Prüfe ob das Item neu ist (innerhalb der letzten 24 Stunden)
            const now = new Date();
            const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
            const isNew = hoursSinceCreation < 24;
            
            // Extrahiere Patient-Informationen
            let patientName = 'Unbekannt';
            let patientId = null;
            if (item.patient) {
              if (typeof item.patient === 'string') {
                patientId = item.patient;
              } else if (typeof item.patient === 'object' && item.patient !== null) {
                patientId = item.patient._id || null;
                patientName = `${item.patient.firstName || ''} ${item.patient.lastName || ''}`.trim() || 'Unbekannt';
              }
            }
            
            // Extrahiere Service-Informationen
            const stripHtmlTags = (html: string): string => {
              if (!html) return '';
              const tmp = document.createElement('DIV');
              tmp.innerHTML = html;
              return tmp.textContent || tmp.innerText || '';
            };
            
            let serviceName = 'Unbekannt';
            if (item.service) {
              if (typeof item.service === 'string') {
                serviceName = 'Service';
              } else if (typeof item.service === 'object' && item.service !== null) {
                const rawName = item.service.name || item.service.code || 'Unbekannt';
                serviceName = stripHtmlTags(rawName);
              }
            } else if (item.type) {
              serviceName = stripHtmlTags(item.type);
            }
            
            // Extrahiere Startzeit
            const startTime = item.startTime ? new Date(item.startTime) : null;
            const startTimeStr = startTime ? startTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
            const startDateStr = startTime ? startTime.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '';
            
            return {
              primary: patientName,
              secondary: `${serviceName}${startTimeStr ? ` • ${startDateStr} ${startTimeStr}` : ''} • ${dateStr} ${timeStr}`,
              icon: 'CalendarToday',
              chip: item.onlineBookingRef 
                ? { label: item.onlineBookingRef, color: 'primary' as const }
                : item.status 
                  ? { label: item.status, color: item.status === 'bestätigt' ? 'success' as const : 'default' as const }
                  : undefined,
              details: `Online-Buchung für ${patientName}\n\nService: ${serviceName}\nBuchungsreferenz: ${item.onlineBookingRef || 'Keine'}\nStatus: ${item.status || 'Unbekannt'}${startTimeStr ? `\nTerminzeit: ${startDateStr} ${startTimeStr}` : ''}\nErstellt: ${dateStr} um ${timeStr}`,
              patientId: patientId ? String(patientId) : null,
              appointmentId: item._id ? String(item._id) : null,
              isNew: isNew,
              onClick: (e?: React.MouseEvent) => {
                if (e) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                // Navigiere zur Online-Buchungen-Seite oder zum Termin
                if (item._id) {
                  const appointmentId = String(item._id);
                  navigate(`/appointments?view=${appointmentId}&returnUrl=${encodeURIComponent('/online-bookings')}`);
                } else {
                  navigate('/online-bookings');
                }
              }
            };
          });
          
          setNewOnlineBookings(formattedItems);
          
          // Aktualisiere Widget-Konfiguration nur wenn sich die Items geändert haben
          if (onlineBookingsWidgetIdRef.current) {
            const itemsToSave = formattedItems.map(({ onClick: _onClick, isNew: _isNew, ...rest }: any) => rest);
            const itemsHash = JSON.stringify(itemsToSave);
            
            if (itemsHash !== lastOnlineBookingsUpdateRef.current) {
              lastOnlineBookingsUpdateRef.current = itemsHash;
              dispatch(updateDashboardWidget({
                id: onlineBookingsWidgetIdRef.current,
                updates: {
                  config: { items: itemsToSave }
                }
              }));
            }
          }
        } else {
          console.log('🔍 Dashboard: No online bookings found');
          setNewOnlineBookings([]);
        }
      } catch (err) {
        console.error('Error fetching new online bookings:', err);
        setNewOnlineBookings([]);
      }
    };
    
    fetchNewOnlineBookings();
    // Aktualisiere alle 5 Minuten
    const interval = setInterval(fetchNewOnlineBookings, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dispatch, navigate]);
        
        // Handler für Nachrichten-Klicks
        const _handleMessageClick = (message: any) => {
          // Wenn die Nachricht eine patientId hat, navigiere zum Patienten
          if (message.patientId) {
            // Konvertiere patientId zu String (falls es ein ObjectId-Objekt ist)
            const patientIdStr = typeof message.patientId === 'string' ? message.patientId : String(message.patientId);
            console.log('Dashboard: Navigating to patient labor values from handleMessageClick', { patientId: patientIdStr, originalPatientId: message.patientId, fullMessage: message });
            // Verwende window.location für zuverlässige Navigation
            window.location.href = `/patient-organizer/${patientIdStr}?tab=laborwerte`;
          } else {
            // Sonst öffne den Nachrichten-Dialog
            setMessagesDialogOpen(true);
          }
        };

  // Load dashboard statistics
  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoadingStats(true);
      try {
        const response = await api.get<{ success: boolean; data: any }>('/dashboard/stats');
        if (response.data?.success) {
          setDashboardStats(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    
    fetchDashboardStats();
    // Aktualisiere alle 5 Minuten
    const interval = setInterval(fetchDashboardStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Load widgets on mount
  useEffect(() => {
    dispatch(fetchDashboardWidgets()).then((result) => {
      // If no widgets exist, create default widgets
      if (result.payload && Array.isArray(result.payload) && result.payload.length === 0) {
        const defaultWidgets = AVAILABLE_WIDGETS.slice(0, 4).map((widget, index) => ({
          widgetId: widget.widgetId,
          widgetType: widget.widgetType,
          title: widget.title,
          position: widget.defaultPosition || { x: (index % 4) * 3, y: 0, w: 3, h: 3 },
          config: widget.defaultConfig || {},
          isVisible: true,
          order: index
        }));
        
        // Save default widgets
        defaultWidgets.forEach(widget => {
          dispatch(saveDashboardWidget(widget));
        });
      }
    });
  }, [dispatch]);

  // Calculate container width based on screen size
  useEffect(() => {
    const calculateWidth = () => {
      if (typeof window === 'undefined') return 1200;
      
      // Auf Mobile: volle Viewport-Breite
      if (isMobile) {
        // Keine Sidebar auf Mobile, volle Breite
        return window.innerWidth;
      }
      
      // Für Desktop und Tablet: Berechne die verfügbare Breite
      // Suche nach dem Hauptcontainer (Box mit Dashboard-Inhalt)
      const _mainContainer = document.querySelector('[class*="MuiBox-root"]');
      let availableWidth = window.innerWidth;
      
      // Prüfe ob Sidebar vorhanden ist
      const sidebarElement = document.querySelector('[class*="MuiDrawer-paper"][class*="persistent"]');
      if (sidebarElement) {
        const sidebarRect = sidebarElement.getBoundingClientRect();
        const sidebarWidth = sidebarRect.width || 240;
        availableWidth = window.innerWidth - sidebarWidth;
      }
      
      // Berücksichtige Padding vom Hauptcontainer
      const padding = isTablet ? 48 : 96; // 24px links + 24px rechts für Tablet, 48px für Desktop
      const width = availableWidth - padding;
      
      return Math.max(width, 600); // Mindestbreite für Desktop
    };

    setContainerWidth(calculateWidth());
    
    const handleResize = () => {
      setContainerWidth(calculateWidth());
    };

    // Use ResizeObserver for better performance
    const resizeObserver = new ResizeObserver(() => {
      setContainerWidth(calculateWidth());
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      resizeObserver.observe(document.body);
      
      // Warte kurz, damit DOM vollständig geladen ist
      setTimeout(() => {
        setContainerWidth(calculateWidth());
      }, 100);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
      }
    };
  }, [isMobile, isTablet]);

  const handleGenerateQR = useCallback(async () => {
    try {
      await dispatch(generateCheckInCode()).unwrap();
      setQrDialogOpen(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }, [dispatch]);

  const handleOpenTabletMode = useCallback(() => {
    setTabletModeOpen(true);
  }, []);

  // Data providers with real API data
  const getWidgetData = useCallback((widget: DashboardWidget) => {
    const stats = dashboardStats?.statistics || {};
    
    // Helper function to format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount / 100);
    };
    
    switch (widget.widgetId) {
      case 'patients-today':
        return { 
          value: stats.patientsToday?.toString() || '0', 
          icon: <People />, 
          color: 'primary' as const 
        };
      case 'appointments-today':
        return { 
          value: stats.appointmentsToday?.toString() || '0', 
          icon: <CalendarToday />, 
          color: 'secondary' as const 
        };
      case 'open-invoices':
        return {
          value: stats.openInvoices?.toString() || '0', 
          icon: <Receipt />,
          color: 'warning' as const,
          onClick: () => navigate('/billing?status=sent,overdue')
        };
      case 'revenue-today':
        return { 
          value: formatCurrency(stats.revenueToday || 0), 
          icon: <TrendingUp />, 
          color: 'success' as const 
        };
      case 'recent-appointments':
        if (dashboardStats?.recentAppointments && dashboardStats.recentAppointments.length > 0) {
          return dashboardStats.recentAppointments.map((apt: any) => ({
            ...apt,
            icon: <Schedule />
          }));
        }
        return [];
      case 'notifications':
        const notifications = [];
        if (stats.overdueAppointments > 0) {
          notifications.push({
            primary: `${stats.overdueAppointments} Termine überfällig`,
            icon: <Warning />,
            hint: 'Überfällige Termine',
            details: `Es gibt ${stats.overdueAppointments} Termine, die bereits überfällig sind. Bitte kontaktieren Sie die Patienten oder verschieben Sie die Termine.`
          });
        }
        return notifications;
      case 'new-labor-results':
        if (newLaborResults.length > 0) {
          return newLaborResults;
        }
        const savedItems = widget.config?.items || [];
        return savedItems.map((item: any) => {
          const patientId = item.patientId;
          let isNew = false;
          if (item.secondary) {
            const dateMatch = item.secondary.match(/(\d{2})\.(\d{2})\.(\d{4})/);
            if (dateMatch) {
              const [, day, month, year] = dateMatch;
              const itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              const now = new Date();
              const hoursSinceCreation = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60);
              isNew = hoursSinceCreation < 24;
            }
          }
          return {
            ...item,
            icon: 'Science',
            patientId: patientId ? String(patientId) : null,
            isNew: isNew,
            onClick: (e?: React.MouseEvent) => {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
              const currentPatientId = patientId || item.patientId;
              if (currentPatientId) {
                const patientIdStr = typeof currentPatientId === 'string' ? currentPatientId : String(currentPatientId);
                window.location.href = `/patient-organizer/${patientIdStr}?tab=laborwerte`;
              }
            }
          };
        });
      case 'new-dicom-studies':
        if (newDicomStudies.length > 0) {
          return newDicomStudies;
        }
        const savedDicomItems = widget.config?.items || [];
        return savedDicomItems.map((item: any) => {
          const patientId = item.patientId;
          let isNew = false;
          if (item.secondary) {
            const dateMatch = item.secondary.match(/(\d{2})\.(\d{2})\.(\d{4})/);
            if (dateMatch) {
              const [, day, month, year] = dateMatch;
              const itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              const now = new Date();
              const hoursSinceCreation = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60);
              isNew = hoursSinceCreation < 24;
            }
          }
          return {
            ...item,
            icon: 'LocalHospital',
            patientId: patientId ? String(patientId) : null,
            isNew: isNew,
            onClick: (e?: React.MouseEvent) => {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
              const currentPatientId = patientId || item.patientId;
              if (currentPatientId) {
                const patientIdStr = typeof currentPatientId === 'string' ? currentPatientId : String(currentPatientId);
                window.location.href = `/patient-organizer/${patientIdStr}?tab=dicom`;
              }
            }
          };
        });
      case 'new-online-bookings':
        if (newOnlineBookings.length > 0) {
          return newOnlineBookings;
        }
        const savedOnlineBookingItems = widget.config?.items || [];
        return savedOnlineBookingItems.map((item: any) => {
          const appointmentId = item.appointmentId;
          let isNew = false;
          if (item.secondary) {
            const dateMatch = item.secondary.match(/(\d{2})\.(\d{2})\.(\d{4})/);
            if (dateMatch) {
              const [, day, month, year] = dateMatch;
              const itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              const now = new Date();
              const hoursSinceCreation = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60);
              isNew = hoursSinceCreation < 24;
            }
          }
          return {
            ...item,
            icon: 'CalendarToday',
            appointmentId: appointmentId ? String(appointmentId) : null,
            isNew: isNew,
            onClick: (e?: React.MouseEvent) => {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
              if (appointmentId) {
                const appointmentIdStr = typeof appointmentId === 'string' ? appointmentId : String(appointmentId);
                navigate(`/appointments?view=${appointmentIdStr}&returnUrl=${encodeURIComponent('/online-bookings')}`);
              } else {
                navigate('/online-bookings');
              }
            }
          };
        });
      case 'system-status':
        return [
          { label: 'Datenbank', status: 'Online', value: 100, color: 'success' as const },
          { label: 'ELGA-Verbindung', status: 'Aktiv', value: 100, color: 'success' as const },
          { label: 'e-Card System', status: 'Bereit', value: 100, color: 'success' as const }
        ];
      case 'checkin-system':
        return [
          {
            label: 'QR-Code generieren',
            icon: <QrCode />,
            onClick: handleGenerateQR,
            variant: 'contained' as const,
            color: 'primary' as const
          },
          {
            label: 'Tablet-Modus',
            icon: <Tablet />,
            onClick: handleOpenTabletMode,
            variant: 'outlined' as const,
            color: 'primary' as const
          }
        ];
      case 'revenue-chart':
        if (dashboardStats?.charts?.revenue) {
          return {
            chartType: 'line' as const,
            data: dashboardStats.charts.revenue.map((item: any) => ({
              label: item.label,
              value: item.value / 100
            }))
          };
        }
        return {
          chartType: 'line' as const,
          data: []
        };
      case 'appointments-chart':
        if (dashboardStats?.charts?.appointments) {
          return {
            chartType: 'bar' as const,
            data: dashboardStats.charts.appointments
          };
        }
        return {
          chartType: 'bar' as const,
          data: []
        };
      case 'revenue-distribution':
        if (dashboardStats?.charts?.revenueDistribution) {
          return {
            chartType: 'pie' as const,
            data: dashboardStats.charts.revenueDistribution.map((item: any) => ({
              label: item.label,
              value: item.value / 100
            }))
          };
        }
        return {
          chartType: 'pie' as const,
          data: []
        };
      case 'calendar-week':
        if (dashboardStats?.calendarWeek) {
          return dashboardStats.calendarWeek;
        }
        return [];
      case 'waiting-room':
      case 'queue':
        if (dashboardStats?.waitingRoom && dashboardStats.waitingRoom.length > 0) {
          return dashboardStats.waitingRoom;
        }
        return [];
      case 'tasks':
      case 'todos':
        return [];
      case 'elda-status':
        return { status: widget.config?.status || 'pending', errorCode: widget.config?.errorCode ?? null };
      case 'important-patients':
        if (importantPatients.length > 0) {
          return importantPatients;
        }
        const savedImportantPatients = widget.config?.items || [];
        return savedImportantPatients.map((item: any) => {
          const patientId = item.patientId || item._id;
          return {
            ...item,
            icon: 'LocalHospital',
            patientId: patientId ? String(patientId) : null,
            onClick: (e?: React.MouseEvent) => {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
              const currentPatientId = patientId || item.patientId || item._id;
              if (currentPatientId) {
                const patientIdStr = typeof currentPatientId === 'string' ? currentPatientId : String(currentPatientId);
                navigate(`/patient-organizer/${patientIdStr}`);
              }
            }
          };
        });
      case 'appointments-week':
        return { 
          value: stats.appointmentsWeek?.toString() || '0', 
          icon: <EventNote />, 
          color: 'info' as const 
        };
      case 'pending-documents':
        return { 
          value: stats.pendingDocuments?.toString() || '0', 
          icon: <Assessment />, 
          color: 'warning' as const 
        };
      case 'medication-reminders':
        return [
          { 
            primary: 'Max Mustermann - Medikament A', 
            secondary: '10:00 Uhr', 
            icon: <Medication />,
            hint: 'Medikamenten-Erinnerung',
            details: 'Patient: Max Mustermann\nMedikament: Medikament A\nDosierung: 1 Tablette\nZeit: 10:00 Uhr\nHinweis: Mit Nahrung einnehmen'
          },
          { 
            primary: 'Maria Musterfrau - Medikament B', 
            secondary: '14:00 Uhr', 
            icon: <Medication />,
            hint: 'Medikamenten-Erinnerung',
            details: 'Patient: Maria Musterfrau\nMedikament: Medikament B\nDosierung: 2 Tabletten\nZeit: 14:00 Uhr\nHinweis: Vor dem Essen einnehmen'
          }
        ];
      case 'internal-messages':
        return {
          onMessageClick: (message: any) => {
            // Wenn die Nachricht eine patientId hat, navigiere zum Patienten
            if (message.patientId) {
              const patientIdStr = typeof message.patientId === 'string' ? message.patientId : String(message.patientId);
              navigate(`/patient-organizer/${patientIdStr}?tab=laborwerte`);
            } else {
              // Sonst navigiere zur Interne-Nachrichten-Seite
              navigate('/internal-messages');
            }
          }
        };
      default:
        return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- newOnlineBookings bewusst ausgelassen
  }, [importantPatients, newLaborResults, newDicomStudies, dashboardStats, navigate]);

  // Update layout when widgets change
  useEffect(() => {
    // Helper function to check if widget has content (defined inline to avoid dependency issues)
    const checkWidgetHasContent = (widget: DashboardWidget): boolean => {
      const data = getWidgetData(widget);
      if (!data) return false;
      
      switch (widget.widgetType) {
        case 'statistic':
          const statValue = (data as any)?.value;
          return !(statValue === '0' || statValue === 0 || !statValue || statValue === '');
        case 'list':
          return Array.isArray(data) && data.length > 0;
        case 'chart':
          const chartData = (data as any)?.data || (data as any)?.series || data;
          if (Array.isArray(chartData)) {
            return chartData.length > 0;
          }
          return !!chartData;
        case 'quick-action':
          return Array.isArray(data) && data.length > 0;
        case 'status':
          const statusItems = (data as any)?.items || data;
          return Array.isArray(statusItems) && statusItems.length > 0;
        case 'custom':
          const customData = (data as any)?.tasks || (data as any)?.items || data;
          if (Array.isArray(customData)) {
            return customData.length > 0;
          }
          return !!customData;
        case 'messages':
          // Messages-Widget immer anzeigen, auch wenn keine Nachrichten vorhanden sind
          // Das Widget zeigt dann eine leere Liste oder eine entsprechende Meldung
          return true;
        default:
          return !!data;
      }
    };
    
    const newLayout = widgets
      .filter(w => w.isVisible && checkWidgetHasContent(w))
      .sort((a, b) => a.order - b.order)
      .map((widget, index) => {
        // Adjust widget sizes for mobile
        let w = widget.position.w;
        let h = widget.position.h;
        let x = widget.position.x;
        let y = widget.position.y;
        
        if (isMobile) {
          // On mobile, make widgets full width (4 cols = full width) and stack vertically
          w = 4; // 4 cols auf Mobile = volle Breite
          x = 0;
          
          // Calculate height based on widget type and content - optimiert für Mobile
          let calculatedH = h;
          if (widget.widgetType === 'statistic') {
            // Statistic widgets: sehr kompakt auf Mobile
            calculatedH = 3;
          } else if (widget.widgetType === 'list') {
            // List widgets: Höhe basierend auf Anzahl Items (min 4, max 10)
            const items = getWidgetData(widget);
            const itemCount = Array.isArray(items) ? items.length : 0;
            if (itemCount === 0) {
              calculatedH = 4; // Leere Liste: minimale Höhe
            } else if (itemCount === 1) {
              calculatedH = 5; // 1 Item: kompakt
            } else if (itemCount <= 2) {
              calculatedH = 6; // 2 Items: kompakt
            } else if (itemCount <= 4) {
              calculatedH = 7; // 3-4 Items: mittel
            } else if (itemCount <= 6) {
              calculatedH = 8; // 5-6 Items: größer
            } else {
              calculatedH = Math.min(10, 8 + Math.ceil((itemCount - 6) * 0.3)); // Max 10 für Mobile
            }
          } else if (widget.widgetType === 'chart') {
            // Chart widgets: kompakt aber lesbar
            calculatedH = 7;
          } else if (widget.widgetType === 'quick-action') {
            // Quick-Action widgets: dynamisch basierend auf Anzahl Actions
            const actions = getWidgetData(widget);
            const actionCount = Array.isArray(actions) ? actions.length : 0;
            if (actionCount === 0) {
              calculatedH = 4;
            } else if (actionCount === 1) {
              calculatedH = 4;
            } else if (actionCount === 2) {
              calculatedH = 5;
            } else if (actionCount <= 4) {
              calculatedH = 6;
            } else {
              calculatedH = Math.min(7, 5 + actionCount * 0.5);
            }
          } else if (widget.widgetType === 'status') {
            // Status widgets: kompakt auf Mobile
            const statusData = getWidgetData(widget);
            const statusItems = (statusData as any)?.items || (statusData as any) || [];
            const itemCount = Array.isArray(statusItems) ? statusItems.length : 0;
            if (itemCount === 0) {
              calculatedH = 4;
            } else if (itemCount <= 2) {
              calculatedH = 5;
            } else if (itemCount <= 4) {
              calculatedH = 6;
            } else {
              calculatedH = Math.min(8, 6 + Math.ceil((itemCount - 4) * 0.4));
            }
          } else if (widget.widgetType === 'messages') {
            // Messages widgets: dynamisch basierend auf Nachrichten
            const messagesData = getWidgetData(widget);
            const messages = (messagesData as any)?.messages || (messagesData as any)?.inbox || messagesData || [];
            const messageCount = Array.isArray(messages) ? messages.length : 0;
            if (messageCount === 0) {
              calculatedH = 5; // Mindesthöhe auch ohne Nachrichten
            } else if (messageCount === 1) {
              calculatedH = 6;
            } else if (messageCount <= 3) {
              calculatedH = 7;
            } else if (messageCount <= 5) {
              calculatedH = 8;
            } else {
              calculatedH = Math.min(10, 8 + Math.ceil((messageCount - 5) * 0.3));
            }
          } else if (widget.widgetType === 'custom') {
            // Custom widgets (z.B. Tasks): dynamisch basierend auf Items
            const customData = getWidgetData(widget);
            const customItems = (customData as any)?.tasks || (customData as any)?.items || customData || [];
            const itemCount = Array.isArray(customItems) ? customItems.length : 0;
            if (itemCount === 0) {
              calculatedH = 4;
            } else if (itemCount <= 2) {
              calculatedH = 5;
            } else if (itemCount <= 4) {
              calculatedH = 6;
            } else if (itemCount <= 6) {
              calculatedH = 7;
            } else {
              calculatedH = Math.min(9, 7 + Math.ceil((itemCount - 6) * 0.3));
            }
          } else {
            // Für andere Widget-Typen: Mindesthöhe
            calculatedH = Math.max(4, h);
          }
          h = calculatedH;
          
          // Calculate Y position based on previous widgets
          let currentY = 0;
          const visibleWidgetsWithContent = widgets.filter(w => w.isVisible && checkWidgetHasContent(w)).sort((a, b) => a.order - b.order);
          for (let i = 0; i < index; i++) {
            const prevWidget = visibleWidgetsWithContent[i];
            if (prevWidget) {
              let prevH = prevWidget.position.h;
              // Berechne Höhe für vorheriges Widget genauso
              if (prevWidget.widgetType === 'statistic') {
                prevH = 3;
              } else if (prevWidget.widgetType === 'list') {
                const prevItems = getWidgetData(prevWidget);
                const prevItemCount = Array.isArray(prevItems) ? prevItems.length : 0;
                if (prevItemCount === 0) {
                  prevH = 4;
                } else if (prevItemCount === 1) {
                  prevH = 5;
                } else if (prevItemCount <= 2) {
                  prevH = 6;
                } else if (prevItemCount <= 4) {
                  prevH = 7;
                } else if (prevItemCount <= 6) {
                  prevH = 8;
                } else {
                  prevH = Math.min(10, 8 + Math.ceil((prevItemCount - 6) * 0.3));
                }
              } else if (prevWidget.widgetType === 'chart') {
                prevH = 7;
              } else if (prevWidget.widgetType === 'quick-action') {
                const prevActions = getWidgetData(prevWidget);
                const prevActionCount = Array.isArray(prevActions) ? prevActions.length : 0;
                if (prevActionCount === 0) {
                  prevH = 4;
                } else if (prevActionCount === 1) {
                  prevH = 4;
                } else if (prevActionCount === 2) {
                  prevH = 5;
                } else if (prevActionCount <= 4) {
                  prevH = 6;
                } else {
                  prevH = Math.min(7, 5 + prevActionCount * 0.5);
                }
              } else if (prevWidget.widgetType === 'status') {
                const prevStatusData = getWidgetData(prevWidget);
                const prevStatusItems = (prevStatusData as any)?.items || (prevStatusData as any) || [];
                const prevStatusCount = Array.isArray(prevStatusItems) ? prevStatusItems.length : 0;
                if (prevStatusCount === 0) {
                  prevH = 4;
                } else if (prevStatusCount <= 2) {
                  prevH = 5;
                } else if (prevStatusCount <= 4) {
                  prevH = 6;
                } else {
                  prevH = Math.min(8, 6 + Math.ceil((prevStatusCount - 4) * 0.4));
                }
              } else if (prevWidget.widgetType === 'messages') {
                const prevMessagesData = getWidgetData(prevWidget);
                const prevMessages = (prevMessagesData as any)?.messages || (prevMessagesData as any)?.inbox || prevMessagesData || [];
                const prevMessageCount = Array.isArray(prevMessages) ? prevMessages.length : 0;
                if (prevMessageCount === 0) {
                  prevH = 5;
                } else if (prevMessageCount === 1) {
                  prevH = 6;
                } else if (prevMessageCount <= 3) {
                  prevH = 7;
                } else if (prevMessageCount <= 5) {
                  prevH = 8;
                } else {
                  prevH = Math.min(10, 8 + Math.ceil((prevMessageCount - 5) * 0.3));
                }
              } else if (prevWidget.widgetType === 'custom') {
                const prevCustomData = getWidgetData(prevWidget);
                const prevCustomItems = (prevCustomData as any)?.tasks || (prevCustomData as any)?.items || prevCustomData || [];
                const prevCustomCount = Array.isArray(prevCustomItems) ? prevCustomItems.length : 0;
                if (prevCustomCount === 0) {
                  prevH = 4;
                } else if (prevCustomCount <= 2) {
                  prevH = 5;
                } else if (prevCustomCount <= 4) {
                  prevH = 6;
                } else if (prevCustomCount <= 6) {
                  prevH = 7;
                } else {
                  prevH = Math.min(9, 7 + Math.ceil((prevCustomCount - 6) * 0.3));
                }
              } else {
                prevH = Math.max(4, prevH);
              }
              currentY += prevH + 1; // Add margin
            }
          }
          y = currentY;
        } else if (isTablet) {
          // On tablet, adjust widths
          if (w > 6) w = 12;
          if (x > 6) x = 0;
        } else {
          // Desktop: Dynamische Höhenanpassung basierend auf Inhalt - kompakter
          if (widget.widgetType === 'statistic') {
            // Statistic Widgets: Sehr kompakt
            h = 3;
          } else if (widget.widgetType === 'list') {
            const items = getWidgetData(widget);
            const itemCount = Array.isArray(items) ? items.length : 0;
            // Dynamische Höhe basierend auf Anzahl Items - kompakter
            if (itemCount === 0) {
              h = 3;
            } else if (itemCount === 1) {
              h = 4;
            } else if (itemCount === 2) {
              h = 5;
            } else if (itemCount <= 4) {
              h = 6;
            } else if (itemCount <= 6) {
              h = 7;
            } else if (itemCount <= 8) {
              h = 8;
            } else if (itemCount <= 10) {
              h = 9;
            } else {
              h = Math.min(12, 8 + Math.ceil((itemCount - 8) * 0.3));
            }
          } else if (widget.widgetType === 'chart') {
            // Chart Widgets: Kompakter
            h = Math.max(5, Math.min(h, 7));
          } else if (widget.widgetType === 'quick-action') {
            const actions = getWidgetData(widget);
            const actionCount = Array.isArray(actions) ? actions.length : 0;
            // Quick-Action Widgets: Sehr kompakt
            if (actionCount === 0) {
              h = 3;
            } else if (actionCount === 1) {
              h = 3;
            } else if (actionCount === 2) {
              h = 4;
            } else {
              h = Math.min(5, 3 + actionCount);
            }
          } else if (widget.widgetType === 'status') {
            const statusData = getWidgetData(widget);
            const statusItems = (statusData as any)?.items || (statusData as any) || [];
            const itemCount = Array.isArray(statusItems) ? statusItems.length : 0;
            // Status Widgets: Kompakt
            if (itemCount === 0) {
              h = 3;
            } else if (itemCount <= 3) {
              h = 4;
            } else {
              h = Math.min(5, 3 + itemCount);
            }
          } else if (widget.widgetType === 'messages') {
            const messagesData = getWidgetData(widget);
            const messages = (messagesData as any)?.messages || (messagesData as any)?.inbox || messagesData || [];
            const messageCount = Array.isArray(messages) ? messages.length : 0;
            // Messages Widgets: Dynamisch basierend auf Nachrichten
            if (messageCount === 0) {
              h = 4; // Mindesthöhe auch ohne Nachrichten
            } else if (messageCount === 1) {
              h = 5;
            } else if (messageCount <= 3) {
              h = 6;
            } else if (messageCount <= 5) {
              h = 7;
            } else {
              h = Math.min(9, 6 + Math.ceil((messageCount - 3) * 0.4));
            }
          } else if (widget.widgetType === 'custom') {
            const customData = getWidgetData(widget);
            const customItems = (customData as any)?.tasks || (customData as any)?.items || customData || [];
            const itemCount = Array.isArray(customItems) ? customItems.length : 0;
            // Custom Widgets: Kompakt
            if (itemCount === 0) {
              h = 3;
            } else if (itemCount <= 2) {
              h = 4;
            } else if (itemCount <= 4) {
              h = 5;
            } else if (itemCount <= 6) {
              h = 6;
            } else {
              h = Math.min(8, 5 + Math.ceil(itemCount * 0.3));
            }
          } else {
            // Für andere Widget-Typen: Mindesthöhe
            h = Math.max(3, h);
          }
        }
        
        return {
          i: widget._id || widget.widgetId,
          x,
          y,
          w,
          h,
          minW: isMobile ? 12 : 2,
          minH: 2
        };
      });
    
    // Zweiter Durchlauf für Desktop: Kompakte Y-Positionen berechnen
    if (!isMobile && !isTablet) {
      const compactedLayout: typeof newLayout = [];
      
      // Iteriere durch alle Layout-Items und kompaktiere sie
      for (let index = 0; index < newLayout.length; index++) {
        const layoutItem = newLayout[index];
        let minY = 0;
        
        // Prüfe alle vorherigen Widgets auf Überlappungen
        for (let i = 0; i < compactedLayout.length; i++) {
          const prevLayoutItem = compactedLayout[i];
          if (prevLayoutItem) {
            const prevX = prevLayoutItem.x;
            const prevW = prevLayoutItem.w;
            const prevY = prevLayoutItem.y;
            const prevH = prevLayoutItem.h;
            
            // Prüfe ob Widgets sich horizontal überlappen
            const overlaps = (layoutItem.x < prevX + prevW && layoutItem.x + layoutItem.w > prevX);
            
            if (overlaps) {
              // Wenn sich Widgets überlappen, platziere das neue Widget unter dem vorherigen
              minY = Math.max(minY, prevY + prevH);
            }
          }
        }
        
        // Wenn eine bessere Position gefunden wurde, verwende sie
        const finalY = minY > 0 && minY < layoutItem.y ? minY : layoutItem.y;
        compactedLayout.push({ ...layoutItem, y: finalY });
      }
      
      setLayout(compactedLayout);
    } else {
      setLayout(newLayout);
    }
  }, [widgets, isMobile, isTablet, dashboardStats, newLaborResults, newDicomStudies, newOnlineBookings, importantPatients, handleGenerateQR, handleOpenTabletMode]);

  const handleRefreshQR = async () => {
    try {
      await dispatch(generateCheckInCode()).unwrap();
    } catch (error) {
      console.error('Error refreshing QR code:', error);
    }
  };

  const handleCloseQRDialog = () => {
    setQrDialogOpen(false);
    dispatch(clearError());
  };

  const handleAddWidget = async (availableWidget: typeof AVAILABLE_WIDGETS[0]) => {
    const newWidget: Partial<DashboardWidget> = {
      widgetId: availableWidget.widgetId,
      widgetType: availableWidget.widgetType,
      title: availableWidget.title,
      position: availableWidget.defaultPosition || { x: 0, y: 0, w: 4, h: 3 },
      config: availableWidget.defaultConfig || {},
      isVisible: true,
      order: widgets.length
    };
    await dispatch(saveDashboardWidget(newWidget));
  };

  const handleDeleteWidget = async (widget: DashboardWidget) => {
    if (widget._id) {
      await dispatch(deleteDashboardWidget(widget._id));
    }
  };

  const handleLayoutChange = useCallback((newLayout: GridLayout.Layout[]) => {
    if (!editMode) return;
    
    const updates = newLayout.map(layoutItem => {
      const widget = widgets.find(w => (w._id || w.widgetId) === layoutItem.i);
      if (widget && widget._id) {
        return {
          id: widget._id,
          position: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
          },
          order: layoutItem.y * 12 + layoutItem.x // Calculate order based on position
        };
      }
      return null;
    }).filter(Boolean) as Array<{ id: string; position: { x: number; y: number; w: number; h: number }; order: number }>;

    if (updates.length > 0) {
      dispatch(reorderDashboardWidgets(updates));
    }
  }, [editMode, widgets, dispatch]);

  const handleSaveLayout = () => {
    setEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    // Reload widgets to reset layout
    dispatch(fetchDashboardWidgets());
  };

  const existingWidgetIds = widgets.map(w => w.widgetId);

  if (loading && widgets.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      px: { xs: 0, sm: 2, md: 3 }, 
      pb: { xs: 2, sm: 2 },
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden',
      boxSizing: 'border-box',
      mt: marginTopValue !== '0px' ? marginTopValue : 0,
      transition: marginTopValue !== '0px' ? 'margin-top 0.3s ease' : 'none',
    }}>
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={{ xs: 1, sm: 0 }}
        mb={{ xs: 2, sm: 3 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2rem' } }}>
            Dashboard
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
        <Box 
          display="flex" 
          gap={{ xs: 0.5, sm: 1 }} 
          flexWrap="wrap"
          width={{ xs: '100%', sm: 'auto' }}
        >
          {!editMode ? (
            <>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setWidgetSelectorOpen(true)}
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  minHeight: { xs: '44px', sm: 'auto' },
                  flex: { xs: 1, sm: 'none' },
                  minWidth: { xs: 'auto', sm: 'auto' }
                }}
                fullWidth={isMobile}
              >
                {isMobile ? 'Hinzufügen' : 'Widget hinzufügen'}
              </Button>
              {!isMobile && (
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => setEditMode(true)}
                  size="medium"
                >
                  Bearbeiten
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveLayout}
                color="primary"
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  minHeight: { xs: '44px', sm: 'auto' },
                  flex: { xs: 1, sm: 'none' }
                }}
                fullWidth={isMobile}
              >
                Speichern
              </Button>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={handleCancelEdit}
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  minHeight: { xs: '44px', sm: 'auto' },
                  flex: { xs: 1, sm: 'none' }
                }}
                fullWidth={isMobile}
              >
                Abbrechen
              </Button>
            </>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      <EldaMaintenanceAlert />

      {widgets.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Keine Widgets vorhanden
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Fügen Sie Widgets hinzu, um Ihr Dashboard anzupassen
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setWidgetSelectorOpen(true)}
          >
            Erstes Widget hinzufügen
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            width: '100%',
            minHeight: 'calc(100vh - 200px)',
            position: 'relative',
            px: { xs: 0, sm: 1, md: 0 },
            overflowX: 'hidden',
            overflowY: 'auto',
            boxSizing: 'border-box'
          }}
        >
          <GridLayout
            className="layout"
            layout={layout}
            cols={isMobile ? 4 : (isTablet ? 8 : 12)}
            rowHeight={isMobile ? 60 : (isTablet ? 70 : 55)}
            width={containerWidth}
            isDraggable={editMode && !isMobile}
            isResizable={editMode && !isMobile}
            onLayoutChange={handleLayoutChange}
            margin={isMobile ? [6, 6] : (isTablet ? [12, 12] : [12, 12])}
            containerPadding={isMobile ? [8, 0] : (isTablet ? [12, 12] : [0, 0])}
            compactType="vertical"
            preventCollision={false}
            useCSSTransforms={true}
            style={{
              minHeight: '100%',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}
          >
            {widgets
              .filter(w => {
                if (!w.isVisible) return false;
                const data = getWidgetData(w);
                if (!data) return false;
                switch (w.widgetType) {
                  case 'statistic':
                    const statValue = (data as any)?.value;
                    return !(statValue === '0' || statValue === 0 || !statValue || statValue === '');
                  case 'list':
                    return Array.isArray(data) && data.length > 0;
                  case 'chart':
                    const chartData = (data as any)?.data || (data as any)?.series || data;
                    if (Array.isArray(chartData)) {
                      return chartData.length > 0;
                    }
                    return !!chartData;
                  case 'quick-action':
                    return Array.isArray(data) && data.length > 0;
                  case 'status':
                    const statusItems = (data as any)?.items || data;
                    return Array.isArray(statusItems) && statusItems.length > 0;
                  case 'custom':
                    if (w.widgetId === 'elda-status') return true;
                    const customData = (data as any)?.tasks || (data as any)?.items || data;
                    if (Array.isArray(customData)) {
                      return customData.length > 0;
                    }
                    return !!customData;
                  case 'messages':
                    // Messages-Widget immer anzeigen, auch wenn keine Nachrichten vorhanden sind
                    return true;
                  default:
                    return !!data;
                }
              })
              .map(widget => (
                <Box
                  key={widget._id || widget.widgetId}
                  sx={{
                    height: '100%',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    '& > *': {
                      height: '100%',
                      width: '100%',
                      maxWidth: '100%'
                    }
                  }}
                >
                  <WidgetRenderer
                    widget={widget}
                    onDelete={editMode ? handleDeleteWidget : undefined}
                    data={getWidgetData(widget)}
                    isEditMode={editMode}
                    onMessageClick={(message: any) => {
                      // Wenn die Nachricht eine patientId hat, navigiere zum Patienten
                      if (message.patientId) {
                        // Konvertiere patientId zu String (falls es ein ObjectId-Objekt ist)
                        const patientIdStr = typeof message.patientId === 'string' ? message.patientId : String(message.patientId);
                        console.log('Dashboard: Navigating to patient labor values from WidgetRenderer', { patientId: patientIdStr, originalPatientId: message.patientId, fullMessage: message });
                        // Verwende window.location für zuverlässige Navigation
                        window.location.href = `/patient-organizer/${patientIdStr}?tab=laborwerte`;
                      } else {
                        // Sonst navigiere zur Interne-Nachrichten-Seite
                        navigate('/internal-messages');
                      }
                    }}
                  />
                </Box>
              ))}
          </GridLayout>
        </Box>
      )}

      {/* Widget Selector Dialog */}
      <WidgetSelectorDialog
        open={widgetSelectorOpen}
        onClose={() => setWidgetSelectorOpen(false)}
        onSelect={handleAddWidget}
        existingWidgetIds={existingWidgetIds}
      />

      {/* QR-Code Dialog */}
      <Dialog
        open={qrDialogOpen}
        onClose={handleCloseQRDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}>
          QR-Code für Selbst-Check-in
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: { xs: 1, sm: 2 } }}>
            {qrError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {qrError}
              </Alert>
            )}
            {qrLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: { xs: 2, sm: 4 } }}>
                <CircularProgress size={isMobile ? 48 : 60} />
                <Typography 
                  variant="body1" 
                  sx={{ 
                    mt: 2,
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}
                >
                  QR-Code wird generiert...
                </Typography>
              </Box>
            ) : qrCode ? (
              <QRCodeGenerator
                data={qrCode}
                size={isMobile ? 200 : 250}
                onRefresh={handleRefreshQR}
              />
            ) : (
              <Box sx={{ py: { xs: 2, sm: 4 } }}>
                <Typography 
                  variant="body1" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                >
                  Kein QR-Code verfügbar. Bitte generieren Sie einen neuen Code.
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleGenerateQR}
                  sx={{ 
                    mt: 2,
                    minHeight: { xs: '44px', sm: 'auto' },
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}
                  fullWidth={isMobile}
                >
                  QR-Code generieren
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2 } }}>
          <Button 
            onClick={handleCloseQRDialog}
            sx={{
              minHeight: { xs: '44px', sm: 'auto' },
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
            fullWidth={isMobile}
          >
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tablet Mode */}
      {tabletModeOpen && (
        <TabletMode onExit={() => setTabletModeOpen(false)} />
      )}

      {/* Internal Messages Dialog */}
      <InternalMessagesDialog
        open={messagesDialogOpen}
        onClose={async () => {
          setMessagesDialogOpen(false);
          // Aktualisiere unreadCount nach dem Schließen
          await dispatch(fetchUnreadCount());
        }}
      />

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
          title="Hilfe & Leitfaden: Dashboard"
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs 
            value={helpTab} 
            onChange={(_, v) => setHelpTab(v)} 
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Übersicht" />
            <Tab label="Widgets" />
            <Tab label="Bearbeitungsmodus" />
            <Tab label="Widget-Typen" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Dashboard
                </Typography>
                <Typography variant="body1" paragraph>
                  Das Dashboard ist Ihre zentrale Übersicht und zeigt wichtige Informationen auf einen Blick. 
                  Sie können es individuell mit verschiedenen Widgets anpassen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📊 <strong>Widgets:</strong> Individuelle Anpassung mit verschiedenen Widgets</li>
                  <li>✏️ <strong>Bearbeitungsmodus:</strong> Widgets hinzufügen, entfernen und anordnen</li>
                  <li>📱 <strong>Tablet-Modus:</strong> Optimierte Ansicht für Tablets</li>
                  <li>📧 <strong>Interne Nachrichten:</strong> Wichtige Nachrichten anzeigen</li>
                  <li>📈 <strong>Statistiken:</strong> Übersicht über wichtige Kennzahlen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Widgets verwalten
                </Typography>
                <Typography variant="body2" paragraph>
                  Widgets sind die Bausteine Ihres Dashboards. Sie können verschiedene Widgets hinzufügen, 
                  entfernen und anordnen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Widget hinzufügen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Aktivieren Sie den Bearbeitungsmodus</li>
                  <li>Klicken Sie auf "Widget hinzufügen"</li>
                  <li>Wählen Sie ein Widget aus der Liste</li>
                  <li>Das Widget wird zum Dashboard hinzugefügt</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Widget entfernen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Aktivieren Sie den Bearbeitungsmodus</li>
                  <li>Klicken Sie auf das Löschen-Icon beim Widget</li>
                  <li>Bestätigen Sie die Löschung</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Widget anordnen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Aktivieren Sie den Bearbeitungsmodus</li>
                  <li>Ziehen Sie Widgets per Drag & Drop an die gewünschte Position</li>
                  <li>Die Anordnung wird automatisch gespeichert</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Bearbeitungsmodus
                </Typography>
                <Typography variant="body2" paragraph>
                  Der Bearbeitungsmodus ermöglicht es, Ihr Dashboard anzupassen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Bearbeitungsmodus aktivieren
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf das Bearbeiten-Icon (Stift-Symbol)</li>
                  <li>Der Bearbeitungsmodus wird aktiviert</li>
                  <li>Widgets können jetzt verschoben, hinzugefügt oder entfernt werden</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Änderungen speichern
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Speichern"</li>
                  <li>Alle Änderungen werden gespeichert</li>
                  <li>Der Bearbeitungsmodus wird beendet</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Verfügbare Widget-Typen
                </Typography>
                <Typography variant="body2" paragraph>
                  Das Dashboard bietet verschiedene Widget-Typen:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Widget-Typen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>👥 <strong>Wichtige Patienten:</strong> Patienten mit wichtigen Informationen</li>
                  <li>🔬 <strong>Laborergebnisse:</strong> Neue Laborergebnisse</li>
                  <li>🖼️ <strong>DICOM-Studien:</strong> Neue Bildgebungsstudien</li>
                  <li>📅 <strong>Online-Buchungen:</strong> Neue Online-Terminbuchungen</li>
                  <li>📊 <strong>Statistiken:</strong> Übersicht über wichtige Kennzahlen</li>
                  <li>📧 <strong>Interne Nachrichten:</strong> Wichtige Nachrichten</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Dashboard-Organisation
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Platzieren Sie wichtige Widgets oben</li>
                  <li>✅ Gruppieren Sie verwandte Widgets</li>
                  <li>✅ Verwenden Sie nicht zu viele Widgets</li>
                  <li>✅ Aktualisieren Sie regelmäßig</li>
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

export default Dashboard;
