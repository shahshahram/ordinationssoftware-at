import React, { useState, useEffect, useCallback } from 'react';
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
  Medication
} from '@mui/icons-material';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  
  const { widgets, loading, error } = useAppSelector((state) => state.dashboardWidgets);
  const { qrCode, isLoading: qrLoading, error: qrError } = useAppSelector((state) => state.checkin);
  
  const [editMode, setEditMode] = useState(false);
  const [widgetSelectorOpen, setWidgetSelectorOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [tabletModeOpen, setTabletModeOpen] = useState(false);
  const [messagesDialogOpen, setMessagesDialogOpen] = useState(false);
  const [layout, setLayout] = useState<GridLayout.Layout[]>([]);
  const [containerWidth, setContainerWidth] = useState(1200);

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
        return [
          { id: '1', title: 'Patientenakte aktualisieren', description: 'Für Max Mustermann', completed: false, priority: 'high' as const },
          { id: '2', title: 'Rezept ausstellen', description: 'Für Maria Musterfrau', completed: false, priority: 'medium' as const },
          { id: '3', title: 'Laborwerte prüfen', description: 'Für Peter Schmidt', completed: true, priority: 'low' as const }
        ];
      case 'important-patients':
        return [
          { 
            primary: 'Max Mustermann', 
            secondary: 'Allergie: Penicillin', 
            icon: <Warning />,
            hint: 'Warnung: Allergie',
            details: 'Patient hat eine bekannte Allergie gegen Penicillin. Bitte bei Verschreibung von Antibiotika beachten und alternative Medikamente verwenden. Letzte Reaktion: 2023 - Hautausschlag.'
          },
          { 
            primary: 'Maria Musterfrau', 
            secondary: 'Nachsorge erforderlich', 
            icon: <CheckCircle />,
            hint: 'Nachsorge-Termin',
            details: 'Nachsorge-Termin nach Operation am 15.11.2024. Wunde heilt gut, aber regelmäßige Kontrolle erforderlich. Nächster Termin sollte innerhalb von 2 Wochen vereinbart werden.'
          },
          { 
            primary: 'Peter Schmidt', 
            secondary: 'Kontrolltermin in 2 Wochen', 
            icon: <Schedule />,
            hint: 'Kontrolltermin',
            details: 'Kontrolltermin für chronische Erkrankung. Letzte Untersuchung: 01.11.2024. Laborwerte müssen überprüft werden. Termin sollte am 15.11.2024 oder später vereinbart werden.'
          }
        ];
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
            setMessagesDialogOpen(true);
          }
        };
      default:
        return null;
    }
  }, []);

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
                    onMessageClick={(_message: any) => setMessagesDialogOpen(true)}
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
        onClose={() => setMessagesDialogOpen(false)}
      />
    </Box>
  );
};

export default Dashboard;
