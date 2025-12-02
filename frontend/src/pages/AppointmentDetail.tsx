import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Divider,
  CircularProgress,
  Alert,
  Stack,
  TextField,
  MenuItem,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Autocomplete,
  Snackbar,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  People,
  Devices,
  MedicalServices,
  CheckCircle,
  Cancel,
  Pending,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface Participant {
  _id?: string;
  appointmentId: string;
  staffId: string | { _id: string; displayName?: string; roleHint?: string };
  roleAtAppointment: 'main_doctor' | 'assistant' | 'therapist' | 'observer';
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface AppointmentResource {
  _id?: string;
  appointmentId: string;
  resourceId: string | { _id: string; name?: string; type?: string };
  startsAt?: string;
  endsAt?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface AppointmentService {
  _id?: string;
  appointmentId: string;
  serviceId: string | { _id: string; name?: string; code?: string };
  quantity: number;
  pricePerUnit: number;
  status: 'planned' | 'performed' | 'billed' | 'cancelled';
  notes?: string;
}

const AppointmentDetail: React.FC = () => {
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any>(null);
  const [edit, setEdit] = React.useState<{ status?: string; description?: string }>({});
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(0);
  
  // Participants
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [participantDialogOpen, setParticipantDialogOpen] = React.useState(false);
  const [participantForm, setParticipantForm] = React.useState<Partial<Participant>>({});
  const [staffProfiles, setStaffProfiles] = React.useState<any[]>([]);
  
  // Resources
  const [resources, setResources] = React.useState<AppointmentResource[]>([]);
  const [resourceDialogOpen, setResourceDialogOpen] = React.useState(false);
  const [resourceForm, setResourceForm] = React.useState<Partial<AppointmentResource>>({});
  const [availableResources, setAvailableResources] = React.useState<any[]>([]);
  
  // Services
  const [services, setServices] = React.useState<AppointmentService[]>([]);
  const [serviceDialogOpen, setServiceDialogOpen] = React.useState(false);
  const [serviceForm, setServiceForm] = React.useState<Partial<AppointmentService>>({});
  const [serviceCatalog, setServiceCatalog] = React.useState<any[]>([]);

  React.useEffect(() => {
    let active = true;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<any>(`/appointments/${id}`);
        if (!active) return;
        setData(res.data?.data || res.data);
        setEdit({ status: res.data?.data?.status || res.data?.status, description: res.data?.data?.description || res.data?.description });
      } catch (e: any) {
        if (!active) return;
        setError(e.response?.data?.message || 'Fehler beim Laden des Termins');
      } finally {
        if (active) setLoading(false);
      }
    }
    if (id) {
      run();
      loadParticipants();
      loadResources();
      loadServices();
      loadStaffProfiles();
      loadAvailableResources();
      loadServiceCatalog();
    }
    return () => { active = false; };
  }, [id]);

  const loadParticipants = async () => {
    if (!id) return;
    try {
      const res = await api.get<any>(`/appointment-participants/appointment/${id}`);
      if (res.success) {
        setParticipants(res.data || []);
      }
    } catch (e: any) {
      console.error('Error loading participants:', e);
    }
  };

  const loadResources = async () => {
    if (!id) return;
    try {
      const res = await api.get<any>(`/appointment-resources/appointment/${id}`);
      if (res.success) {
        setResources(res.data || []);
      }
    } catch (e: any) {
      console.error('Error loading resources:', e);
    }
  };

  const loadServices = async () => {
    if (!id) return;
    try {
      const res = await api.get<any>(`/appointment-services/appointment/${id}`);
      if (res.success) {
        setServices(res.data || []);
      }
    } catch (e: any) {
      console.error('Error loading services:', e);
    }
  };

  const loadStaffProfiles = async () => {
    try {
      const res = await api.get<any>('/staff-profiles');
      if (res.success) {
        setStaffProfiles(res.data || []);
      }
    } catch (e: any) {
      console.error('Error loading staff profiles:', e);
    }
  };

  const loadAvailableResources = async () => {
    try {
      const res = await api.get<any>('/resources');
      if (res.success) {
        setAvailableResources(res.data || []);
      }
    } catch (e: any) {
      console.error('Error loading resources:', e);
    }
  };

  const loadServiceCatalog = async () => {
    try {
      const res = await api.get<any>('/service-catalog');
      if (res.success) {
        setServiceCatalog(res.data || []);
      }
    } catch (e: any) {
      console.error('Error loading service catalog:', e);
    }
  };

  const handleAddParticipant = async () => {
    if (!id || !participantForm.staffId) return;
    try {
      const res = await api.post<any>('/appointment-participants', {
        appointmentId: id,
        staffId: typeof participantForm.staffId === 'string' ? participantForm.staffId : participantForm.staffId,
        roleAtAppointment: participantForm.roleAtAppointment || 'assistant',
        status: participantForm.status || 'confirmed',
      });
      if (res.success) {
        enqueueSnackbar('Teilnehmer erfolgreich hinzugefügt', { variant: 'success' });
        setParticipantDialogOpen(false);
        setParticipantForm({});
        loadParticipants();
      }
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Fehler beim Hinzufügen des Teilnehmers', { variant: 'error' });
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (!window.confirm('Teilnehmer wirklich entfernen?')) return;
    try {
      const res = await api.delete<any>(`/appointment-participants/${participantId}`);
      if (res.success) {
        enqueueSnackbar('Teilnehmer erfolgreich entfernt', { variant: 'success' });
        loadParticipants();
      }
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Fehler beim Entfernen des Teilnehmers', { variant: 'error' });
    }
  };

  const handleAddResource = async () => {
    if (!id || !resourceForm.resourceId) return;
    try {
      const res = await api.post<any>('/appointment-resources', {
        appointmentId: id,
        resourceId: typeof resourceForm.resourceId === 'string' ? resourceForm.resourceId : resourceForm.resourceId,
        startsAt: resourceForm.startsAt || data?.startTime,
        endsAt: resourceForm.endsAt || data?.endTime,
        status: resourceForm.status || 'confirmed',
      });
      if (res.success) {
        enqueueSnackbar('Ressource erfolgreich hinzugefügt', { variant: 'success' });
        setResourceDialogOpen(false);
        setResourceForm({});
        loadResources();
      }
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Fehler beim Hinzufügen der Ressource', { variant: 'error' });
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!window.confirm('Ressource wirklich entfernen?')) return;
    try {
      const res = await api.delete<any>(`/appointment-resources/${resourceId}`);
      if (res.success) {
        enqueueSnackbar('Ressource erfolgreich entfernt', { variant: 'success' });
        loadResources();
      }
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Fehler beim Entfernen der Ressource', { variant: 'error' });
    }
  };

  const handleAddService = async () => {
    if (!id || !serviceForm.serviceId) return;
    try {
      const res = await api.post<any>('/appointment-services', {
        appointmentId: id,
        serviceId: typeof serviceForm.serviceId === 'string' ? serviceForm.serviceId : serviceForm.serviceId,
        quantity: serviceForm.quantity || 1,
        pricePerUnit: serviceForm.pricePerUnit || 0,
        status: serviceForm.status || 'planned',
        notes: serviceForm.notes,
      });
      if (res.success) {
        enqueueSnackbar('Service erfolgreich hinzugefügt', { variant: 'success' });
        setServiceDialogOpen(false);
        setServiceForm({});
        loadServices();
      }
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Fehler beim Hinzufügen des Services', { variant: 'error' });
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm('Service wirklich entfernen?')) return;
    try {
      const res = await api.delete<any>(`/appointment-services/${serviceId}`);
      if (res.success) {
        enqueueSnackbar('Service erfolgreich entfernt', { variant: 'success' });
        loadServices();
      }
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Fehler beim Entfernen des Services', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5">Termin-Details</Typography>
      <Divider sx={{ my: 1 }} />
      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Lade Termin...</Typography>
          </Stack>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : data ? (
          <>
            <Typography variant="body2" color="text.secondary">Termin-ID</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>{data._id || id}</Typography>
            <Typography variant="body2">Titel: {data.title || data.type || '—'}</Typography>
            <Typography variant="body2">Beginn: {data.startTime ? new Date(data.startTime).toLocaleString('de-DE') : '—'}</Typography>
            <Typography variant="body2">Ende: {data.endTime ? new Date(data.endTime).toLocaleString('de-DE') : '—'}</Typography>
            <Typography variant="body2">Arzt: {data.doctor || '—'}</Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2} sx={{ maxWidth: 420, mb: 3 }}>
              <TextField
                select
                label="Status"
                size="small"
                value={edit.status || ''}
                onChange={(e) => setEdit(prev => ({ ...prev, status: e.target.value }))}
              >
                {['scheduled','confirmed','completed','cancelled','no-show'].map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Beschreibung"
                multiline
                minRows={2}
                value={edit.description || ''}
                onChange={(e) => setEdit(prev => ({ ...prev, description: e.target.value }))}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  disabled={saving}
                  onClick={async () => {
                    try {
                      setSaving(true);
                      const res = await api.put<any>(`/appointments/${data._id || id}`, {
                        status: edit.status,
                        description: edit.description
                      });
                      const updated = res.data?.data || res.data;
                      setData(updated);
                      enqueueSnackbar('Termin erfolgreich aktualisiert', { variant: 'success' });
                    } catch (e: any) {
                      setError(e.response?.data?.message || 'Aktualisieren fehlgeschlagen');
                      enqueueSnackbar(e.response?.data?.message || 'Aktualisieren fehlgeschlagen', { variant: 'error' });
                    } finally {
                      setSaving(false);
                    }
                  }}
                >Speichern</Button>
                {saving && <CircularProgress size={20} />}
              </Stack>
            </Stack>
            
            <Divider sx={{ my: 2 }} />
            
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              <Tab label="Übersicht" />
              <Tab label="Teilnehmer" icon={<People />} iconPosition="start" />
              <Tab label="Ressourcen" icon={<Devices />} iconPosition="start" />
              <Tab label="Services" icon={<MedicalServices />} iconPosition="start" />
            </Tabs>
            
            <TabPanel value={activeTab} index={0}>
              <Typography variant="body2" color="text.secondary">Grundinformationen</Typography>
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Teilnehmer</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    setParticipantForm({ appointmentId: id || '' });
                    setParticipantDialogOpen(true);
                  }}
                  size="small"
                >
                  Hinzufügen
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Rolle</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {participants.map((p) => {
                      const staff = typeof p.staffId === 'object' ? p.staffId : staffProfiles.find(s => s._id === p.staffId);
                      return (
                        <TableRow key={p._id}>
                          <TableCell>{staff?.displayName || staff?.display_name || 'Unbekannt'}</TableCell>
                          <TableCell>
                            {p.roleAtAppointment === 'main_doctor' ? 'Hauptarzt' :
                             p.roleAtAppointment === 'assistant' ? 'Assistent' :
                             p.roleAtAppointment === 'therapist' ? 'Therapeut' : 'Beobachter'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={p.status === 'confirmed' ? 'Bestätigt' : p.status === 'pending' ? 'Ausstehend' : 'Abgesagt'}
                              size="small"
                              color={p.status === 'confirmed' ? 'success' : p.status === 'pending' ? 'warning' : 'error'}
                              icon={p.status === 'confirmed' ? <CheckCircle /> : p.status === 'pending' ? <Pending /> : <Cancel />}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => handleDeleteParticipant(p._id!)}>
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {participants.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="text.secondary">Keine Teilnehmer</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
            
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Ressourcen</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    setResourceForm({ appointmentId: id || '' });
                    setResourceDialogOpen(true);
                  }}
                  size="small"
                >
                  Hinzufügen
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Typ</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resources.map((r) => {
                      const resource = typeof r.resourceId === 'object' ? r.resourceId : availableResources.find(res => res._id === r.resourceId);
                      return (
                        <TableRow key={r._id}>
                          <TableCell>{resource?.name || 'Unbekannt'}</TableCell>
                          <TableCell>{resource?.type || '—'}</TableCell>
                          <TableCell>
                            <Chip
                              label={r.status === 'confirmed' ? 'Bestätigt' : r.status === 'pending' ? 'Ausstehend' : 'Abgesagt'}
                              size="small"
                              color={r.status === 'confirmed' ? 'success' : r.status === 'pending' ? 'warning' : 'error'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => handleDeleteResource(r._id!)}>
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {resources.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="text.secondary">Keine Ressourcen</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
            
            <TabPanel value={activeTab} index={3}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Services</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    setServiceForm({ appointmentId: id || '', quantity: 1 });
                    setServiceDialogOpen(true);
                  }}
                  size="small"
                >
                  Hinzufügen
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Service</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Menge</TableCell>
                      <TableCell>Preis</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {services.map((s) => {
                      const service = typeof s.serviceId === 'object' ? s.serviceId : serviceCatalog.find(svc => svc._id === s.serviceId);
                      return (
                        <TableRow key={s._id}>
                          <TableCell>{service?.name || 'Unbekannt'}</TableCell>
                          <TableCell>{service?.code || '—'}</TableCell>
                          <TableCell>{s.quantity}</TableCell>
                          <TableCell>€{s.pricePerUnit.toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip
                              label={s.status === 'planned' ? 'Geplant' : s.status === 'performed' ? 'Durchgeführt' : s.status === 'billed' ? 'Abgerechnet' : 'Abgesagt'}
                              size="small"
                              color={s.status === 'billed' ? 'success' : s.status === 'performed' ? 'info' : s.status === 'cancelled' ? 'error' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => handleDeleteService(s._id!)}>
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {services.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="text.secondary">Keine Services</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">Keine Daten</Typography>
        )}
      </Paper>
      
      {/* Participant Dialog */}
      <Dialog open={participantDialogOpen} onClose={() => setParticipantDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Teilnehmer hinzufügen</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={staffProfiles}
              getOptionLabel={(option) => option.displayName || option.display_name || `${option.firstName || ''} ${option.lastName || ''}`.trim() || 'Unbekannt'}
              value={staffProfiles.find(s => s._id === participantForm.staffId) || null}
              onChange={(_, newValue) => setParticipantForm({ ...participantForm, staffId: newValue?._id })}
              renderInput={(params) => <TextField {...params} label="Personal" />}
            />
            <FormControl fullWidth>
              <InputLabel>Rolle</InputLabel>
              <Select
                value={participantForm.roleAtAppointment || 'assistant'}
                onChange={(e) => setParticipantForm({ ...participantForm, roleAtAppointment: e.target.value as any })}
              >
                <MenuItem value="main_doctor">Hauptarzt</MenuItem>
                <MenuItem value="assistant">Assistent</MenuItem>
                <MenuItem value="therapist">Therapeut</MenuItem>
                <MenuItem value="observer">Beobachter</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={participantForm.status || 'confirmed'}
                onChange={(e) => setParticipantForm({ ...participantForm, status: e.target.value as any })}
              >
                <MenuItem value="confirmed">Bestätigt</MenuItem>
                <MenuItem value="pending">Ausstehend</MenuItem>
                <MenuItem value="cancelled">Abgesagt</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setParticipantDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleAddParticipant}>Hinzufügen</Button>
        </DialogActions>
      </Dialog>
      
      {/* Resource Dialog */}
      <Dialog open={resourceDialogOpen} onClose={() => setResourceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ressource hinzufügen</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={availableResources}
              getOptionLabel={(option) => option.name || 'Unbekannt'}
              value={availableResources.find(r => r._id === resourceForm.resourceId) || null}
              onChange={(_, newValue) => setResourceForm({ ...resourceForm, resourceId: newValue?._id })}
              renderInput={(params) => <TextField {...params} label="Ressource" />}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={resourceForm.status || 'confirmed'}
                onChange={(e) => setResourceForm({ ...resourceForm, status: e.target.value as any })}
              >
                <MenuItem value="confirmed">Bestätigt</MenuItem>
                <MenuItem value="pending">Ausstehend</MenuItem>
                <MenuItem value="cancelled">Abgesagt</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResourceDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleAddResource}>Hinzufügen</Button>
        </DialogActions>
      </Dialog>
      
      {/* Service Dialog */}
      <Dialog open={serviceDialogOpen} onClose={() => setServiceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Service hinzufügen</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={serviceCatalog}
              getOptionLabel={(option) => `${option.name || 'Unbekannt'} (${option.code || '—'})`}
              value={serviceCatalog.find(s => s._id === serviceForm.serviceId) || null}
              onChange={(_, newValue) => {
                setServiceForm({
                  ...serviceForm,
                  serviceId: newValue?._id,
                  pricePerUnit: newValue?.prices?.privat || 0,
                });
              }}
              renderInput={(params) => <TextField {...params} label="Service" />}
            />
            <TextField
              label="Menge"
              type="number"
              value={serviceForm.quantity || 1}
              onChange={(e) => setServiceForm({ ...serviceForm, quantity: parseInt(e.target.value) || 1 })}
              fullWidth
            />
            <TextField
              label="Preis pro Einheit"
              type="number"
              value={serviceForm.pricePerUnit || 0}
              onChange={(e) => setServiceForm({ ...serviceForm, pricePerUnit: parseFloat(e.target.value) || 0 })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={serviceForm.status || 'planned'}
                onChange={(e) => setServiceForm({ ...serviceForm, status: e.target.value as any })}
              >
                <MenuItem value="planned">Geplant</MenuItem>
                <MenuItem value="performed">Durchgeführt</MenuItem>
                <MenuItem value="billed">Abgerechnet</MenuItem>
                <MenuItem value="cancelled">Abgesagt</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Notizen"
              multiline
              rows={3}
              value={serviceForm.notes || ''}
              onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServiceDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleAddService}>Hinzufügen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppointmentDetail;


