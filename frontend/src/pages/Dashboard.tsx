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
  Fab,
  useMediaQuery,
  useTheme
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
import QRCodeGenerator from '../components/QRCodeGenerator';
import TabletMode from '../components/TabletMode';
import InternalMessagesDialog from '../components/InternalMessagesDialog';
import { fetchUnreadCount, fetchMessages, markAsRead, InternalMessage } from '../store/slices/internalMessagesSlice';
import {
  People,
  CalendarToday,
  Receipt,
  TrendingUp,
  Schedule,
  Warning,
  CheckCircle,
  AttachMoney,
  EventNote,
  Assessment,
  Medication,
  LocalHospital,
  Science
} from '@mui/icons-material';
import api from '../utils/api';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  
  const { widgets, loading, error } = useAppSelector((state) => state.dashboardWidgets);
  const { qrCode, isLoading: qrLoading, error: qrError } = useAppSelector((state) => state.checkin);
  const { user } = useAppSelector((state) => state.auth);
  
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
  
  // Refs um Widget-IDs zu speichern und Endlosschleifen zu vermeiden
  const importantPatientsWidgetIdRef = useRef<string | null>(null);
  const laborWidgetIdRef = useRef<string | null>(null);
  const dicomWidgetIdRef = useRef<string | null>(null);
  const lastImportantPatientsUpdateRef = useRef<string>('');
  const lastLaborResultsUpdateRef = useRef<string>('');
  const lastDicomStudiesUpdateRef = useRef<string>('');

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
    }
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
          const itemsToSave = formattedPatients.map(({ onClick, ...rest }: any) => rest);
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
            const itemsToSave = formattedItems.map(({ onClick, isNew, ...rest }: any) => rest);
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
            const itemsToSave = formattedItems.map(({ onClick, isNew, ...rest }: any) => rest);
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
        
        // Handler für Nachrichten-Klicks
        const handleMessageClick = (message: any) => {
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
      
      // Check if sidebar is open (check DOM or use a more reliable method)
      const sidebarElement = document.querySelector('[class*="MuiDrawer-paper"]');
      const sidebarOpen = sidebarElement && window.getComputedStyle(sidebarElement).display !== 'none';
      
      const sidebarWidth = (isMobile || !sidebarOpen) ? 0 : 240;
      const padding = isMobile ? 16 : (isTablet ? 32 : 40);
      const width = window.innerWidth - sidebarWidth - padding;
      
      return Math.max(width, 320); // Minimum width
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
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
      }
    };
  }, [isMobile, isTablet]);

  // Update layout when widgets change
  useEffect(() => {
    const newLayout = widgets
      .filter(w => w.isVisible)
      .sort((a, b) => a.order - b.order)
      .map((widget, index) => {
        // Adjust widget sizes for mobile
        let w = widget.position.w;
        let h = widget.position.h;
        let x = widget.position.x;
        let y = widget.position.y;
        
        if (isMobile) {
          // On mobile, make widgets full width and stack vertically
          w = 12;
          x = 0;
          // Calculate Y position based on previous widgets
          let currentY = 0;
          for (let i = 0; i < index; i++) {
            const prevWidget = widgets.filter(w => w.isVisible).sort((a, b) => a.order - b.order)[i];
            if (prevWidget) {
              let prevH = prevWidget.position.h;
              if (prevWidget.widgetType === 'statistic') {
                prevH = 3;
              } else if (prevWidget.widgetType === 'list') {
                prevH = 6;
              } else {
                prevH = Math.max(prevH, 4);
              }
              currentY += prevH + 1; // Add margin
            }
          }
          y = currentY;
          
          // Adjust height for better mobile display
          if (widget.widgetType === 'statistic') {
            h = 3;
          } else if (widget.widgetType === 'list') {
            h = 6;
          } else {
            h = Math.max(h, 4);
          }
        } else if (isTablet) {
          // On tablet, adjust widths
          if (w > 6) w = 12;
          if (x > 6) x = 0;
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
    setLayout(newLayout);
  }, [widgets, isMobile, isTablet]);

  // Mock data providers (in real app, these would fetch from API)
  const getWidgetData = useCallback((widget: DashboardWidget) => {
    switch (widget.widgetId) {
      case 'patients-today':
        return { value: '24', icon: <People />, color: 'primary' as const };
      case 'appointments-today':
        return { value: '18', icon: <CalendarToday />, color: 'secondary' as const };
      case 'open-invoices':
        return { value: '12', icon: <Receipt />, color: 'warning' as const };
      case 'revenue-today':
        return { value: '€2,450', icon: <TrendingUp />, color: 'success' as const };
      case 'recent-appointments':
        return [
          { primary: '09:00 - Max Mustermann', secondary: 'Konsultation', icon: <Schedule />, chip: { label: 'wartend', color: 'warning' as const } },
          { primary: '09:30 - Maria Musterfrau', secondary: 'Untersuchung', icon: <Schedule />, chip: { label: 'in_behandlung', color: 'error' as const } },
          { primary: '10:00 - Peter Schmidt', secondary: 'Nachsorge', icon: <Schedule />, chip: { label: 'geplant', color: 'default' as const } }
        ];
      case 'notifications':
        return [
          { 
            primary: '3 Termine überfällig', 
            icon: <Warning />,
            hint: 'Überfällige Termine',
            details: 'Es gibt 3 Termine, die bereits überfällig sind:\n\n1. Max Mustermann - 10.11.2024\n2. Maria Musterfrau - 12.11.2024\n3. Peter Schmidt - 14.11.2024\n\nBitte kontaktieren Sie die Patienten oder verschieben Sie die Termine.'
          },
          { 
            primary: 'ELGA-Sync erforderlich', 
            icon: <CheckCircle />,
            hint: 'ELGA-Synchronisation',
            details: 'Die letzte Synchronisation mit ELGA war am 10.11.2024. Eine neue Synchronisation wird empfohlen, um die neuesten Daten zu erhalten.'
          },
          { 
            primary: 'Backup erfolgreich', 
            icon: <CheckCircle />,
            hint: 'Backup-Status',
            details: 'Das automatische Backup wurde erfolgreich am 18.11.2024 um 02:00 Uhr durchgeführt. Alle Daten wurden gesichert.'
          }
        ];
      case 'new-labor-results':
        // Verwende die geladenen Daten (mit onClick-Handlern) oder füge onClick-Handler zu gespeicherten Items hinzu
        if (newLaborResults.length > 0) {
          console.log('🔍 Dashboard: getWidgetData - Using newLaborResults', { count: newLaborResults.length, firstItem: newLaborResults[0] });
          return newLaborResults;
        }
        // Falls keine neuen Daten, füge onClick-Handler zu gespeicherten Items hinzu
        const savedItems = widget.config?.items || [];
        console.log('🔍 Dashboard: getWidgetData - Using saved items', { count: savedItems.length, firstItem: savedItems[0] });
        return savedItems.map((item: any) => {
          const patientId = item.patientId;
          // Prüfe ob das Item neu ist (innerhalb der letzten 24 Stunden)
          // Versuche Datum aus secondary Text zu extrahieren oder verwende aktuelles Datum als Fallback
          let isNew = false;
          if (item.secondary) {
            // Versuche Datum aus secondary zu extrahieren (Format: "Tests • DD.MM.YYYY HH:MM")
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
            icon: 'Science', // Stelle sicher, dass das Icon immer Science ist
            patientId: patientId ? String(patientId) : null, // Stelle sicher, dass patientId ein String ist
            isNew: isNew, // Flag für farbliche Hervorhebung
            onClick: (e?: React.MouseEvent) => {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
              // Navigiere zum Patienten
              const currentPatientId = patientId || item.patientId;
              if (currentPatientId) {
                const patientIdStr = typeof currentPatientId === 'string' ? currentPatientId : String(currentPatientId);
                console.log('🔍 Dashboard: onClick from saved item - Navigating to patient labor values', { patientId: patientIdStr, originalPatientId: currentPatientId, fullItem: item });
                window.location.href = `/patient-organizer/${patientIdStr}?tab=laborwerte`;
              } else {
                console.error('❌ Dashboard: No patientId in saved labor result item - cannot navigate', item);
              }
            }
          };
        });
      case 'new-dicom-studies':
        // Verwende die geladenen Daten (mit onClick-Handlern) oder füge onClick-Handler zu gespeicherten Items hinzu
        if (newDicomStudies.length > 0) {
          console.log('🔍 Dashboard: getWidgetData - Using newDicomStudies', { count: newDicomStudies.length, firstItem: newDicomStudies[0] });
          return newDicomStudies;
        }
        // Falls keine neuen Daten, füge onClick-Handler zu gespeicherten Items hinzu
        const savedDicomItems = widget.config?.items || [];
        return savedDicomItems.map((item: any) => {
          const patientId = item.patientId;
          // Prüfe ob das Item neu ist (innerhalb der letzten 24 Stunden)
          // Versuche Datum aus secondary Text zu extrahieren oder verwende aktuelles Datum als Fallback
          let isNew = false;
          if (item.secondary) {
            // Versuche Datum aus secondary zu extrahieren (Format: "Studie • DD.MM.YYYY HH:MM")
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
            onClick: () => setTabletModeOpen(true),
            variant: 'outlined' as const,
            color: 'primary' as const
          }
        ];
      case 'revenue-chart':
        return {
          chartType: 'line' as const,
          data: [
            { label: 'Mo', value: 1200 },
            { label: 'Di', value: 1500 },
            { label: 'Mi', value: 1800 },
            { label: 'Do', value: 2100 },
            { label: 'Fr', value: 2450 },
            { label: 'Sa', value: 1900 },
            { label: 'So', value: 800 }
          ]
        };
      case 'appointments-chart':
        return {
          chartType: 'bar' as const,
          data: [
            { label: 'Konsultation', value: 45 },
            { label: 'Untersuchung', value: 30 },
            { label: 'Nachsorge', value: 25 }
          ]
        };
      case 'revenue-distribution':
        return {
          chartType: 'pie' as const,
          data: [
            { label: 'Konsultationen', value: 40 },
            { label: 'Untersuchungen', value: 35 },
            { label: 'Andere', value: 25 }
          ]
        };
      case 'calendar-week':
        return [
          { date: new Date().toISOString(), appointments: 5, status: 'normal' as const },
          { date: new Date(Date.now() + 86400000).toISOString(), appointments: 8, status: 'busy' as const },
          { date: new Date(Date.now() + 172800000).toISOString(), appointments: 12, status: 'full' as const },
          { date: new Date(Date.now() + 259200000).toISOString(), appointments: 6, status: 'normal' as const },
          { date: new Date(Date.now() + 345600000).toISOString(), appointments: 9, status: 'busy' as const },
          { date: new Date(Date.now() + 432000000).toISOString(), appointments: 3, status: 'normal' as const },
          { date: new Date(Date.now() + 518400000).toISOString(), appointments: 0, status: 'normal' as const }
        ];
      case 'waiting-room':
      case 'queue':
        return [
          { patient: 'Max Mustermann', time: '09:00', type: 'Konsultation', waitingTime: 15, status: 'waiting' as const },
          { patient: 'Maria Musterfrau', time: '09:15', type: 'Untersuchung', waitingTime: 5, status: 'next' as const },
          { patient: 'Peter Schmidt', time: '09:30', type: 'Nachsorge', waitingTime: 0, status: 'in_progress' as const }
        ];
      case 'tasks':
      case 'todos':
        // Tasks werden jetzt direkt im TasksWidget geladen
        // Keine Mock-Daten mehr, da das Widget die Daten selbst lädt
        return [];
      case 'important-patients':
        // Verwende die geladenen Daten (mit onClick-Handlern) oder füge onClick-Handler zu gespeicherten Items hinzu
        if (importantPatients.length > 0) {
          return importantPatients;
        }
        // Falls keine neuen Daten, füge onClick-Handler zu gespeicherten Items hinzu
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
                window.location.href = `/patient-organizer/${patientIdStr}`;
              }
            }
          };
        });
      case 'revenue-month':
        return { value: '€45,200', icon: <AttachMoney />, color: 'success' as const };
      case 'appointments-week':
        return { value: '87', icon: <EventNote />, color: 'info' as const };
      case 'pending-documents':
        return { value: '5', icon: <Assessment />, color: 'warning' as const };
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
      case 'upcoming-appointments':
        return [
          { primary: '10:30 - Anna Weber', secondary: 'Beratung', icon: <Schedule />, chip: { label: 'geplant', color: 'default' as const } },
          { primary: '11:00 - Thomas Müller', secondary: 'Konsultation', icon: <Schedule />, chip: { label: 'geplant', color: 'default' as const } },
          { primary: '11:30 - Lisa Schmidt', secondary: 'Untersuchung', icon: <Schedule />, chip: { label: 'geplant', color: 'default' as const } }
        ];
      case 'internal-messages':
        return {
          onMessageClick: (message: any) => {
            // Wenn die Nachricht eine patientId hat, navigiere zum Patienten
            if (message.patientId) {
              // Konvertiere patientId zu String (falls es ein ObjectId-Objekt ist)
              const patientIdStr = typeof message.patientId === 'string' ? message.patientId : String(message.patientId);
              console.log('Dashboard: Navigating to patient labor values from getWidgetData', { patientId: patientIdStr, originalPatientId: message.patientId, fullMessage: message });
              // Verwende window.location für zuverlässige Navigation
              window.location.href = `/patient-organizer/${patientIdStr}?tab=laborwerte`;
            } else {
              // Sonst öffne den Nachrichten-Dialog
              setMessagesDialogOpen(true);
            }
          }
        };
      default:
        return null;
    }
  }, [importantPatients, newLaborResults, newDicomStudies]);

  const handleGenerateQR = async () => {
    try {
      await dispatch(generateCheckInCode()).unwrap();
      setQrDialogOpen(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

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
    <Box>
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={{ xs: 2, sm: 0 }}
        mb={3}
      >
        <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Dashboard
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {!editMode ? (
            <>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setWidgetSelectorOpen(true)}
                size={isMobile ? 'small' : 'medium'}
              >
                {isMobile ? 'Hinzufügen' : 'Widget hinzufügen'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => setEditMode(true)}
                size={isMobile ? 'small' : 'medium'}
                disabled={isMobile}
              >
                Bearbeiten
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveLayout}
                color="primary"
                size={isMobile ? 'small' : 'medium'}
              >
                Speichern
              </Button>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={handleCancelEdit}
                size={isMobile ? 'small' : 'medium'}
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
            px: { xs: 1, sm: 2, md: 0 }
          }}
        >
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={isMobile ? 60 : 80}
            width={containerWidth}
            isDraggable={editMode && !isMobile}
            isResizable={editMode && !isMobile}
            onLayoutChange={handleLayoutChange}
            margin={isMobile ? [8, 8] : [16, 16]}
            containerPadding={isMobile ? [8, 8] : [16, 16]}
            compactType={null}
            preventCollision={true}
            useCSSTransforms={true}
            style={{
              minHeight: '100%',
              width: '100%'
            }}
          >
            {widgets
              .filter(w => w.isVisible)
              .map(widget => (
                <Box
                  key={widget._id || widget.widgetId}
                  sx={{
                    height: '100%',
                    width: '100%',
                    '& > *': {
                      height: '100%'
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
                        // Sonst öffne den Nachrichten-Dialog
                        setMessagesDialogOpen(true);
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
      >
        <DialogTitle>
          QR-Code für Selbst-Check-in
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            {qrError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {qrError}
              </Alert>
            )}
            {qrLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                <CircularProgress size={60} />
                <Typography variant="body1" sx={{ mt: 2 }}>
                  QR-Code wird generiert...
                </Typography>
              </Box>
            ) : qrCode ? (
              <QRCodeGenerator
                data={qrCode}
                size={250}
                onRefresh={handleRefreshQR}
              />
            ) : (
              <Box sx={{ py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  Kein QR-Code verfügbar. Bitte generieren Sie einen neuen Code.
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleGenerateQR}
                  sx={{ mt: 2 }}
                >
                  QR-Code generieren
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQRDialog}>
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
    </Box>
  );
};

export default Dashboard;
