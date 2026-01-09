import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Divider,
  Chip,
  Stack,
  Button,
  IconButton,
  Avatar,
  Badge,
  Tooltip,
  Paper,
  Card,
  CardContent,
  Collapse,
  Alert
} from '@mui/material';
import {
  Close,
  Person,
  CalendarToday,
  Description,
  Receipt,
  Science,
  Phone,
  Email,
  Home,
  Emergency,
  ExpandMore,
  ExpandLess,
  Timeline,
  Assignment
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { Patient } from '../store/slices/patientSlice';
import { fetchAppointments } from '../store/slices/appointmentSlice';
import { fetchPatientDiagnoses } from '../store/slices/diagnosisSlice';
import { fetchDocuments } from '../store/slices/documentSlice';
import { fetchDekursEntries } from '../store/slices/dekursSlice';
import PatientTimeline from './PatientTimeline';

interface PatientSidebarProps {
  patient: Patient | null;
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

const PatientSidebar: React.FC<PatientSidebarProps> = ({
  patient,
  open,
  onClose,
  onNavigate
}) => {
  const dispatch = useAppDispatch();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'quickActions', 'timeline']));

  // Lade Patientendaten wenn Sidebar geöffnet wird
  useEffect(() => {
    if (patient && open) {
      const patientId = (patient._id || patient.id) as string;
      dispatch(fetchAppointments());
      dispatch(fetchPatientDiagnoses({ patientId }));
      dispatch(fetchDocuments({ patientId }));
      dispatch(fetchDekursEntries({ patientId, limit: 50 }));
    }
  }, [patient, open, dispatch]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'aktiv':
      case 'active':
        return 'success';
      case 'inaktiv':
      case 'inactive':
        return 'default';
      case 'vertrag':
      case 'contract':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusChip = (status: string) => (
    <Chip
      label={status || 'Unbekannt'}
      size="small"
      color={getStatusColor(status)}
      variant="outlined"
    />
  );

  const quickActions = [
    {
      label: 'Neuer Termin',
      icon: <CalendarToday />,
      color: 'primary',
      action: () => onNavigate(`/appointments?patientId=${patient?._id || patient?.id}`)
    },
    {
      label: 'Neuer Brief',
      icon: <Description />,
      color: 'info',
      action: () => onNavigate(`/documents?patientId=${patient?._id || patient?.id}`)
    },
    {
      label: 'Neue Rechnung',
      icon: <Receipt />,
      color: 'success',
      action: () => onNavigate(`/billing?patientId=${patient?._id || patient?.id}`)
    },
    {
      label: 'Labor',
      icon: <Science />,
      color: 'warning',
      action: () => onNavigate(`/documents?patientId=${patient?._id || patient?.id}&type=befund`)
    }
  ];

  if (!patient) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{
        disableAutoFocus: true,
        disableEnforceFocus: true,
        disableRestoreFocus: true,
      }}
      sx={{
        width: 400,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 400,
          boxSizing: 'border-box',
          overflow: 'auto'
        }
      }}
    >
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Patienten-Workspace
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Patient Summary */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                <Person />
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6">
                  {patient.firstName} {patient.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {patient.dateOfBirth ? 
                    `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} Jahre` : 
                    'Alter unbekannt'
                  }
                </Typography>
              </Box>
              {getStatusChip(patient.status || 'Unbekannt')}
            </Box>

            <Stack spacing={1}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Home sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2">
                  {patient.address ? 
                    `${patient.address.street}, ${patient.address.zipCode} ${patient.address.city}` : 
                    'Keine Adresse'
                  }
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Phone sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2">
                  {patient.phone || 'Keine Telefonnummer'}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Email sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2">
                  {patient.email || 'Keine E-Mail'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Assignment sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2">
                  SVNR: {patient.socialSecurityNumber || 'Nicht angegeben'}
                </Typography>
              </Box>

              {patient.emergencyContact && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Emergency sx={{ mr: 1, fontSize: 16, color: 'error.main' }} />
                  <Typography variant="body2">
                    Notfall: {patient.emergencyContact.name} ({patient.emergencyContact.phone})
                  </Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                mb: 1
              }}
              onClick={() => toggleSection('quickActions')}
            >
              <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                Quick Actions
              </Typography>
              {expandedSections.has('quickActions') ? <ExpandLess /> : <ExpandMore />}
            </Box>
            
            <Collapse in={expandedSections.has('quickActions')}>
              <Stack spacing={1}>
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outlined"
                    startIcon={action.icon}
                    onClick={action.action}
                    size="small"
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {action.label}
                  </Button>
                ))}
              </Stack>
            </Collapse>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 1, '&:last-child': { pb: 1 } }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                mb: 1,
                px: 1
              }}
              onClick={() => toggleSection('timeline')}
            >
              <Timeline sx={{ mr: 1 }} />
              <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                Timeline
              </Typography>
              {expandedSections.has('timeline') ? <ExpandLess /> : <ExpandMore />}
            </Box>
            
            <Collapse in={expandedSections.has('timeline')} sx={{ flexGrow: 1, overflow: 'auto' }}>
              {patient ? (
                <Box sx={{ maxHeight: 'calc(100vh - 500px)', overflow: 'auto' }}>
                  <PatientTimeline
                    patient={patient}
                    onNavigate={onNavigate}
                    maxItems={20}
                  />
                </Box>
              ) : (
                <Alert severity="info" sx={{ mt: 1, mx: 1 }}>
                  Kein Patient ausgewählt
                </Alert>
              )}
            </Collapse>
          </CardContent>
        </Card>
      </Box>
    </Drawer>
  );
};

export default PatientSidebar;
