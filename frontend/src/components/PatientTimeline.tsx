import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Skeleton,
  Alert
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import {
  CalendarToday,
  Description,
  LocalHospital,
  Medication,
  Receipt,
  Science,
  Assignment,
  Edit,
  Visibility,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { Patient } from '../store/slices/patientSlice';
import { fetchAppointments } from '../store/slices/appointmentSlice';
import { fetchPatientDiagnoses } from '../store/slices/diagnosisSlice';
import { fetchDocuments } from '../store/slices/documentSlice';
import { fetchDekursEntries } from '../store/slices/dekursSlice';

interface PatientTimelineProps {
  patient: Patient;
  onNavigate: (path: string) => void;
  maxItems?: number;
}

interface TimelineEvent {
  id: string;
  type: 'appointment' | 'diagnosis' | 'document' | 'medication' | 'billing' | 'dekurs';
  title: string;
  description?: string;
  date: Date;
  status?: string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  metadata?: any;
}

const PatientTimeline: React.FC<PatientTimelineProps> = ({
  patient,
  onNavigate,
  maxItems = 20
}) => {
  const dispatch = useAppDispatch();
  const { appointments, loading: appointmentsLoading } = useAppSelector((state) => state.appointments);
  const { patientDiagnoses, loading: diagnosesLoading } = useAppSelector((state) => state.diagnoses);
  const { documents, loading: documentsLoading } = useAppSelector((state) => state.documents);
  const { entries: dekursEntries, loading: dekursLoading } = useAppSelector((state) => state.dekurs);

  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Lade Patientendaten
  useEffect(() => {
    if (patient) {
      setLoading(true);
      const patientId = (patient._id || patient.id) as string;
      Promise.all([
        dispatch(fetchAppointments()),
        dispatch(fetchPatientDiagnoses({ patientId })),
        dispatch(fetchDocuments({ patientId })),
        dispatch(fetchDekursEntries({ patientId, limit: 50 }))
      ]).finally(() => setLoading(false));
    }
  }, [patient, dispatch]);

  // Erstelle Timeline-Events
  useEffect(() => {
    if (!patient) return;

    const events: TimelineEvent[] = [];

    // Termine hinzufügen
    (appointments || []).forEach(apt => {
      if (apt.patient === (patient._id || patient.id)) {
        events.push({
          id: apt._id,
          type: 'appointment',
          title: apt.title || apt.type || 'Termin',
          description: (apt as any).notes || (apt as any).description,
          date: new Date(apt.startTime),
          status: apt.status,
          icon: <CalendarToday />,
          color: 'primary',
          metadata: apt
        });
      }
    });

    // Diagnosen hinzufügen
    (patientDiagnoses || []).forEach(diag => {
      events.push({
        id: diag._id,
        type: 'diagnosis',
        title: `${diag.code} - ${diag.display}`,
        description: diag.notes || (diag as any).description,
        date: new Date(diag.createdAt),
        status: diag.statusGerman || diag.status,
        icon: <LocalHospital />,
        color: 'error',
        metadata: diag
      });
    });

    // Dokumente hinzufügen
    const docsArray = Array.isArray(documents) ? documents : ((documents as any)?.data || []);
    console.log('PatientTimeline: Processing documents for patient', patient._id || patient.id, ':', docsArray);
    if (Array.isArray(docsArray)) {
      docsArray.forEach(doc => {
        console.log('PatientTimeline: Checking document', doc._id, 'with patient ID', doc.patient?.id, 'against patient', patient._id || patient.id);
        if (doc.patient?.id === (patient._id || patient.id)) {
          console.log('PatientTimeline: Document matches patient, adding to timeline');
          events.push({
            id: (doc._id || doc.id) as string,
            type: 'document',
            title: doc.title,
            description: doc.content?.text || (doc as any).description,
            date: new Date(doc.createdAt || doc.updatedAt || new Date()),
            status: doc.status,
            icon: getDocumentIcon(doc.type),
            color: getDocumentColor(doc.type),
            metadata: doc
          });
        }
      });
    }

    // Dekurs-Einträge hinzufügen (mit gelbem Icon)
    if (Array.isArray(dekursEntries)) {
      dekursEntries.forEach(dekurs => {
        if (dekurs.patientId === (patient._id || patient.id)) {
          const dekursTitle = dekurs.visitReason 
            ? `Dekurs: ${dekurs.visitReason.substring(0, 50)}${dekurs.visitReason.length > 50 ? '...' : ''}`
            : 'Dekurs-Eintrag';
          const dekursDescription = [
            dekurs.clinicalObservations,
            dekurs.findings,
            dekurs.notes
          ].filter(Boolean).join(' ').substring(0, 200);
          
          events.push({
            id: (dekurs._id || dekurs.id) as string,
            type: 'dekurs',
            title: dekursTitle,
            description: dekursDescription,
            date: new Date(dekurs.entryDate || dekurs.createdAt || new Date()),
            status: dekurs.status,
            icon: <Assignment sx={{ color: '#FFEB3B' }} />, // Gelbes Icon
            color: 'warning', // Gelbe Farbe
            metadata: dekurs
          });
        }
      });
    }

    // Nach Datum sortieren (neueste zuerst)
    events.sort((a, b) => b.date.getTime() - a.date.getTime());
    setTimelineEvents(events.slice(0, maxItems));
  }, [patient, appointments, patientDiagnoses, documents, dekursEntries, maxItems]);

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'rezept': return <Medication />;
      case 'befund': return <Science />;
      case 'rechnung': return <Receipt />;
      case 'attest': return <Assignment />;
      default: return <Description />;
    }
  };

  const getDocumentColor = (type: string): TimelineEvent['color'] => {
    switch (type) {
      case 'rezept': return 'success';
      case 'befund': return 'warning';
      case 'rechnung': return 'info';
      case 'attest': return 'secondary';
      default: return 'primary';
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'abgeschlossen':
      case 'erledigt':
        return 'success';
      case 'pending':
      case 'ausstehend':
      case 'wartend':
        return 'warning';
      case 'cancelled':
      case 'abgebrochen':
      case 'storniert':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleEventClick = (event: TimelineEvent) => {
    const patientId = patient._id || patient.id;
    console.log('PatientTimeline - handleEventClick:', { eventType: event.type, eventId: event.id, patientId, patient });
    
    switch (event.type) {
      case 'appointment':
        onNavigate(`/appointments/${event.id}`);
        break;
      case 'diagnosis':
        onNavigate(`/diagnoses/${event.id}?patientId=${patientId}`);
        break;
      case 'document':
        onNavigate(`/documents/${event.id}`);
        break;
      case 'dekurs':
        // Navigiere zum PatientOrganizer mit Dekurs-Tab
        onNavigate(`/patient-organizer/${patientId}?tab=dekurs`);
        break;
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Patienten-Timeline</Typography>
        <Stack spacing={2}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={60} />
          ))}
        </Stack>
      </Paper>
    );
  }

  if (timelineEvents.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Patienten-Timeline</Typography>
        <Alert severity="info">
          Keine Einträge in der Timeline vorhanden.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Patienten-Timeline
        <Chip 
          label={`${timelineEvents.length} Einträge`} 
          size="small" 
          sx={{ ml: 1 }} 
        />
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      <Timeline position="alternate">
        {timelineEvents.map((event, index) => (
          <TimelineItem key={event.id}>
            <TimelineOppositeContent
              sx={{ m: 'auto 0' }}
              align="right"
              variant="body2"
              color="text.secondary"
            >
              {event.date.toLocaleDateString('de-DE')}
              <br />
              {event.date.toLocaleTimeString('de-DE', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </TimelineOppositeContent>
            
            <TimelineSeparator>
              <TimelineConnector />
              <TimelineDot 
                color={event.color}
                sx={event.type === 'dekurs' ? { 
                  bgcolor: '#FFEB3B',
                  color: 'text.primary',
                  border: '2px solid #FFC107'
                } : {}}
              >
                {event.icon}
              </TimelineDot>
              <TimelineConnector />
            </TimelineSeparator>
            
            <TimelineContent sx={{ py: '12px', px: 2 }}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { 
                    boxShadow: 2,
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
                onClick={() => handleEventClick(event)}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {event.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {event.status && (
                        <Chip
                          label={event.status}
                          size="small"
                          color={getStatusColor(event.status)}
                          variant="outlined"
                        />
                      )}
                      <Tooltip title="Details anzeigen">
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  
                  {event.description && (
                    <Box sx={{ mt: 1 }}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: expandedItems.has(event.id) ? 'none' : 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {event.description}
                      </Typography>
                      {event.description.length > 100 && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(event.id);
                          }}
                        >
                          {expandedItems.has(event.id) ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </Paper>
  );
};

export default PatientTimeline;
