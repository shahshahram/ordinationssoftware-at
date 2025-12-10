import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Box
} from '@mui/material';
import { Close } from '@mui/icons-material';
import {
  People,
  CalendarToday,
  Receipt,
  TrendingUp,
  Schedule,
  Warning,
  CheckCircle,
  QrCode,
  BarChart,
  ShowChart,
  PieChart,
  CalendarMonth,
  AccessTime,
  Assignment,
  LocalHospital,
  AttachMoney,
  Assessment,
  EventNote,
  Medication,
  Mail,
  Science
} from '@mui/icons-material';

export interface AvailableWidget {
  widgetId: string;
  widgetType: 'statistic' | 'chart' | 'list' | 'status' | 'quick-action' | 'custom' | 'messages';
  title: string;
  description: string;
  icon: React.ReactNode;
  defaultConfig?: Record<string, any>;
  defaultPosition?: { x: number; y: number; w: number; h: number };
}

const AVAILABLE_WIDGETS: AvailableWidget[] = [
  {
    widgetId: 'patients-today',
    widgetType: 'statistic',
    title: 'Patienten heute',
    description: 'Anzahl der Patienten heute',
    icon: <People />,
    defaultConfig: { value: '0', color: 'primary' },
    defaultPosition: { x: 0, y: 0, w: 3, h: 4 }
  },
  {
    widgetId: 'appointments-today',
    widgetType: 'statistic',
    title: 'Termine heute',
    description: 'Anzahl der Termine heute',
    icon: <CalendarToday />,
    defaultConfig: { value: '0', color: 'secondary' },
    defaultPosition: { x: 3, y: 0, w: 3, h: 4 }
  },
  {
    widgetId: 'open-invoices',
    widgetType: 'statistic',
    title: 'Offene Rechnungen',
    description: 'Anzahl der offenen Rechnungen',
    icon: <Receipt />,
    defaultConfig: { value: '0', color: 'warning' },
    defaultPosition: { x: 6, y: 0, w: 3, h: 4 }
  },
  {
    widgetId: 'revenue-today',
    widgetType: 'statistic',
    title: 'Umsatz heute',
    description: 'Umsatz des heutigen Tages',
    icon: <TrendingUp />,
    defaultConfig: { value: '€0', color: 'success' },
    defaultPosition: { x: 9, y: 0, w: 3, h: 4 }
  },
  {
    widgetId: 'recent-appointments',
    widgetType: 'list',
    title: 'Heutige Termine',
    description: 'Liste der heutigen Termine',
    icon: <Schedule />,
    defaultConfig: { items: [] },
    defaultPosition: { x: 0, y: 4, w: 6, h: 8 }
  },
  {
    widgetId: 'notifications',
    widgetType: 'list',
    title: 'Benachrichtigungen',
    description: 'Wichtige Benachrichtigungen',
    icon: <Warning />,
    defaultConfig: { items: [] },
    defaultPosition: { x: 6, y: 4, w: 6, h: 8 }
  },
  {
    widgetId: 'new-labor-results',
    widgetType: 'list',
    title: 'Neue Laborwerte',
    description: 'Kürzlich eingetroffene Laborwerte',
    icon: <Science />,
    defaultConfig: { items: [] },
    defaultPosition: { x: 0, y: 12, w: 6, h: 8 }
  },
  {
    widgetId: 'reimbursements',
    widgetType: 'list',
    title: 'Erstattungen',
    description: 'Ausstehende Erstattungen',
    icon: <AttachMoney />,
    defaultConfig: { items: [] },
    defaultPosition: { x: 0, y: 20, w: 6, h: 8 }
  },
  {
    widgetId: 'ogk-status',
    widgetType: 'custom',
    title: 'ÖGK-Status',
    description: 'ÖGK-Abrechnungsstatus und Statistiken',
    icon: <Receipt />,
    defaultConfig: {},
    defaultPosition: { x: 6, y: 20, w: 6, h: 8 }
  },
  {
    widgetId: 'new-dicom-studies',
    widgetType: 'list',
    title: 'Neue DICOM-Studien',
    description: 'Kürzlich eingetroffene DICOM-Studien',
    icon: <LocalHospital />,
    defaultConfig: { items: [] },
    defaultPosition: { x: 6, y: 12, w: 6, h: 8 }
  },
  {
    widgetId: 'system-status',
    widgetType: 'status',
    title: 'System Status',
    description: 'Status der Systemkomponenten',
    icon: <CheckCircle />,
    defaultConfig: { items: [] },
    defaultPosition: { x: 0, y: 12, w: 8, h: 5 }
  },
  {
    widgetId: 'checkin-system',
    widgetType: 'quick-action',
    title: 'Selbst-Check-in System',
    description: 'Schnellzugriff auf Check-in Funktionen',
    icon: <QrCode />,
    defaultConfig: { actions: [] },
    defaultPosition: { x: 8, y: 12, w: 4, h: 5 }
  },
  // Neue Widgets
  {
    widgetId: 'revenue-chart',
    widgetType: 'chart',
    title: 'Umsatz-Verlauf',
    description: 'Umsatz-Entwicklung der letzten 7 Tage',
    icon: <ShowChart />,
    defaultConfig: { 
      chartType: 'line',
      data: [
        { label: 'Mo', value: 1200 },
        { label: 'Di', value: 1500 },
        { label: 'Mi', value: 1800 },
        { label: 'Do', value: 2100 },
        { label: 'Fr', value: 2450 },
        { label: 'Sa', value: 1900 },
        { label: 'So', value: 800 }
      ]
    },
    defaultPosition: { x: 0, y: 17, w: 8, h: 6 }
  },
  {
    widgetId: 'appointments-chart',
    widgetType: 'chart',
    title: 'Termine-Statistik',
    description: 'Termine nach Typ',
    icon: <BarChart />,
    defaultConfig: { 
      chartType: 'bar',
      data: [
        { label: 'Konsultation', value: 45 },
        { label: 'Untersuchung', value: 30 },
        { label: 'Nachsorge', value: 25 }
      ]
    },
    defaultPosition: { x: 8, y: 17, w: 4, h: 6 }
  },
  {
    widgetId: 'calendar-week',
    widgetType: 'custom',
    title: 'Kalender diese Woche',
    description: 'Termine-Übersicht für die aktuelle Woche',
    icon: <CalendarMonth />,
    defaultConfig: { appointments: [] },
    defaultPosition: { x: 0, y: 23, w: 6, h: 6 }
  },
  {
    widgetId: 'waiting-room',
    widgetType: 'custom',
    title: 'Warteschlange',
    description: 'Aktuelle Warteschlange',
    icon: <AccessTime />,
    defaultConfig: { items: [] },
    defaultPosition: { x: 6, y: 23, w: 6, h: 6 }
  },
  {
    widgetId: 'tasks',
    widgetType: 'custom',
    title: 'Aufgaben',
    description: 'Ihre Aufgaben und To-Dos',
    icon: <Assignment />,
    defaultConfig: { items: [] },
    defaultPosition: { x: 0, y: 29, w: 6, h: 8 }
  },
  {
    widgetId: 'important-patients',
    widgetType: 'list',
    title: 'Wichtige Patienten',
    description: 'Patienten mit besonderen Hinweisen',
    icon: <LocalHospital />,
    defaultConfig: { items: [] },
    defaultPosition: { x: 6, y: 29, w: 6, h: 8 }
  },
  {
    widgetId: 'revenue-month',
    widgetType: 'statistic',
    title: 'Umsatz diesen Monat',
    description: 'Gesamtumsatz des aktuellen Monats',
    icon: <AttachMoney />,
    defaultConfig: { value: '€0', color: 'success' },
    defaultPosition: { x: 0, y: 37, w: 3, h: 4 }
  },
  {
    widgetId: 'appointments-week',
    widgetType: 'statistic',
    title: 'Termine diese Woche',
    description: 'Anzahl der Termine diese Woche',
    icon: <EventNote />,
    defaultConfig: { value: '0', color: 'info' },
    defaultPosition: { x: 3, y: 37, w: 3, h: 4 }
  },
  {
    widgetId: 'pending-documents',
    widgetType: 'statistic',
    title: 'Ausstehende Dokumente',
    description: 'Dokumente zur Prüfung',
    icon: <Assessment />,
    defaultConfig: { value: '0', color: 'warning' },
    defaultPosition: { x: 6, y: 37, w: 3, h: 4 }
  },
  {
    widgetId: 'medication-reminders',
    widgetType: 'list',
    title: 'Medikamenten-Erinnerungen',
    description: 'Erinnerungen für Medikamenten-Verabreichung',
    icon: <Medication />,
    defaultConfig: { items: [] },
    defaultPosition: { x: 9, y: 37, w: 3, h: 4 }
  },
  {
    widgetId: 'revenue-distribution',
    widgetType: 'chart',
    title: 'Umsatz-Verteilung',
    description: 'Umsatz nach Kategorien',
    icon: <PieChart />,
    defaultConfig: { 
      chartType: 'pie',
      data: [
        { label: 'Konsultationen', value: 40 },
        { label: 'Untersuchungen', value: 35 },
        { label: 'Andere', value: 25 }
      ]
    },
    defaultPosition: { x: 0, y: 41, w: 6, h: 6 }
  },
  {
    widgetId: 'upcoming-appointments',
    widgetType: 'list',
    title: 'Nächste Termine',
    description: 'Die nächsten geplanten Termine',
    icon: <Schedule />,
    defaultConfig: { items: [] },
    defaultPosition: { x: 6, y: 41, w: 6, h: 6 }
  },
  {
    widgetId: 'internal-messages',
    widgetType: 'messages',
    title: 'Interne Nachrichten',
    description: 'Nachrichten von Mitarbeitern',
    icon: <Mail />,
    defaultConfig: {},
    defaultPosition: { x: 0, y: 47, w: 6, h: 8 }
  }
];

interface WidgetSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (widget: AvailableWidget) => void;
  existingWidgetIds: string[];
}

const WidgetSelectorDialog: React.FC<WidgetSelectorDialogProps> = ({
  open,
  onClose,
  onSelect,
  existingWidgetIds
}) => {
  const availableWidgets = AVAILABLE_WIDGETS.filter(
    widget => !existingWidgetIds.includes(widget.widgetId)
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Widget hinzufügen</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {availableWidgets.map((widget) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={widget.widgetId}>
              <Card
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s'
                  }
                }}
                onClick={() => {
                  onSelect(widget);
                  onClose();
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Box sx={{ color: 'primary.main' }}>{widget.icon}</Box>
                    <Typography variant="h6">{widget.title}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {widget.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {availableWidgets.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                Alle verfügbaren Widgets sind bereits hinzugefügt.
              </Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Schließen</Button>
      </DialogActions>
    </Dialog>
  );
};

export default WidgetSelectorDialog;
export { AVAILABLE_WIDGETS };

