import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stack,
  Card,
  CardContent,
  Divider,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Cancel,
  Article,
  LocalHospital,
  Build,
} from '@mui/icons-material';
import { apiRequest } from '../utils/api';
import { useSnackbar } from 'notistack';
import { useAppSelector } from '../store/hooks';
import { Specialization, AmbulanzbefundFormTemplate } from '../types/ambulanzbefund';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const SPECIALIZATION_LABELS: Record<Specialization, string> = {
  allgemein: 'Allgemeinmedizin',
  hno: 'HNO',
  interne: 'Innere Medizin',
  chirurgie: 'Chirurgie',
  dermatologie: 'Dermatologie',
  gyn: 'Gynäkologie',
  pädiatrie: 'Pädiatrie',
  neurologie: 'Neurologie',
  orthopädie: 'Orthopädie',
  ophthalmologie: 'Ophthalmologie',
  urologie: 'Urologie',
  psychiatrie: 'Psychiatrie',
  radiologie: 'Radiologie',
  pathologie: 'Pathologie',
};

const DocumentTemplateAdmin: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { enqueueSnackbar } = useSnackbar();
  
  const [tabValue, setTabValue] = useState(0);
  const [templates, setTemplates] = useState<AmbulanzbefundFormTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AmbulanzbefundFormTemplate | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState<Partial<AmbulanzbefundFormTemplate>>({
    name: '',
    code: '',
    version: '1.0',
    specialization: 'allgemein',
    isActive: true,
    isDefault: false,
  });

  // Prüfe Admin-Rechte
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (isAdmin) {
      loadTemplates();
    }
  }, [isAdmin, tabValue]);

  // Debug: Log templates state
  useEffect(() => {
    console.log('Templates state changed - Loading:', loading, 'Templates count:', templates.length, 'Templates:', templates);
  }, [loading, templates]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiRequest.get<{ success: boolean; data: AmbulanzbefundFormTemplate[] }>(
        '/ambulanzbefunde/templates' // Lade alle Templates (aktiv und inaktiv)
      );
      
      console.log('Templates API Response:', response);
      
      // apiRequest gibt { data: { success, data: [...] }, success } zurück
      let templatesData: AmbulanzbefundFormTemplate[] = [];
      
      if (response.success && response.data) {
        const serverResponse = response.data as any;
        
        // Versuche verschiedene Datenstrukturen zu extrahieren
        if (Array.isArray(serverResponse?.data)) {
          templatesData = serverResponse.data;
        } else if (Array.isArray(serverResponse)) {
          templatesData = serverResponse;
        } else if (Array.isArray(response.data)) {
          templatesData = response.data;
        }
      }
      
      console.log('Final templatesData:', templatesData);
      console.log('Templates count:', templatesData.length);
      
      setTemplates(templatesData);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      enqueueSnackbar(`Fehler beim Laden der Templates: ${error.message}`, { variant: 'error' });
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateTemplate = () => {
    setTemplateForm({
      name: '',
      code: '',
      version: '1.0',
      specialization: 'allgemein',
      isActive: true,
      isDefault: false,
    });
    setSelectedTemplate(null);
    setEditDialogOpen(true);
  };

  const handleEditTemplate = (template: AmbulanzbefundFormTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      code: template.code,
      version: template.version,
      description: template.description,
      specialization: template.specialization,
      isActive: template.isActive,
      isDefault: template.isDefault,
      elgaIlReference: template.elgaIlReference,
    });
    setEditDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (selectedTemplate) {
        // Update
        await apiRequest.put(`/ambulanzbefunde/templates/${selectedTemplate._id}`, templateForm);
        enqueueSnackbar('Template erfolgreich aktualisiert', { variant: 'success' });
      } else {
        // Create - benötigt vollständiges Formular mit formDefinition
        enqueueSnackbar('Erstellen von Templates über erweiterte Template-Editor (in Entwicklung)', { variant: 'info' });
      }
      setEditDialogOpen(false);
      loadTemplates();
    } catch (error: any) {
      enqueueSnackbar(`Fehler: ${error.message}`, { variant: 'error' });
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      // Soft Delete: Setze isActive auf false
      await apiRequest.put(`/ambulanzbefunde/templates/${selectedTemplate._id}`, {
        isActive: false
      });
      enqueueSnackbar('Template deaktiviert', { variant: 'success' });
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error: any) {
      enqueueSnackbar(`Fehler: ${error.message}`, { variant: 'error' });
    }
  };

  if (!isAdmin) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Keine Berechtigung. Admin-Rechte erforderlich.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" gutterBottom>
              Dokument-Template Verwaltung
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Verwaltung von Formular-Templates für Ambulanzbefunde und weitere Dokumenttypen
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateTemplate}
            sx={{ ml: 2 }}
          >
            Neues Template
          </Button>
        </Stack>
      </Box>

      <Paper>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Ambulanzbefunde" icon={<Article />} />
          <Tab label="Weitere Dokumente" icon={<Build />} disabled />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Spezialisierung</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Default</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">Lade Templates...</TableCell>
                  </TableRow>
                ) : templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        Keine Templates gefunden (Loading: {loading ? 'true' : 'false'}, Count: {templates.length})
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    console.log('Rendering templates in table. Count:', templates.length, 'Templates:', templates);
                    return templates.map((template) => {
                      if (!template._id) {
                        console.warn('Template ohne _id gefunden:', template);
                      }
                      return (
                        <TableRow key={template._id || template.code || Math.random()} hover>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {template.code}
                            </Typography>
                          </TableCell>
                          <TableCell>{template.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={SPECIALIZATION_LABELS[template.specialization] || template.specialization}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{template.version}</TableCell>
                          <TableCell>
                            {template.isActive ? (
                              <Chip icon={<CheckCircle />} label="Aktiv" color="success" size="small" />
                            ) : (
                              <Chip icon={<Cancel />} label="Inaktiv" color="default" size="small" />
                            )}
                          </TableCell>
                          <TableCell>
                            {template.isDefault ? (
                              <Chip label="Default" color="primary" size="small" />
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Details anzeigen">
                                <IconButton size="small" onClick={() => handleEditTemplate(template)}>
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Bearbeiten">
                                <IconButton size="small" onClick={() => handleEditTemplate(template)}>
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              {template.isActive && (
                                <Tooltip title="Deaktivieren">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      setSelectedTemplate(template);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Delete />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Weitere Dokumenttypen werden zukünftig hier verwaltet.
          </Alert>
        </TabPanel>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedTemplate ? 'Template bearbeiten' : 'Neues Template erstellen'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={templateForm.name || ''}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Code"
              value={templateForm.code || ''}
              onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value.toUpperCase() })}
              fullWidth
              required
              disabled={!!selectedTemplate}
              helperText={selectedTemplate ? 'Code kann nicht geändert werden' : 'Eindeutiger Code (wird automatisch in Großbuchstaben umgewandelt)'}
            />
            <TextField
              label="Version"
              value={templateForm.version || '1.0'}
              onChange={(e) => setTemplateForm({ ...templateForm, version: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Beschreibung"
              value={templateForm.description || ''}
              onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth required>
              <InputLabel>Spezialisierung</InputLabel>
              <Select
                value={templateForm.specialization || 'allgemein'}
                onChange={(e) => setTemplateForm({ ...templateForm, specialization: e.target.value as Specialization })}
                label="Spezialisierung"
              >
                {Object.entries(SPECIALIZATION_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={templateForm.isActive ?? true}
                  onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.checked })}
                />
              }
              label="Aktiv"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={templateForm.isDefault ?? false}
                  onChange={(e) => setTemplateForm({ ...templateForm, isDefault: e.target.checked })}
                />
              }
              label="Standard-Template für diese Spezialisierung"
            />
            <Alert severity="info">
              {selectedTemplate 
                ? 'Vollständige Bearbeitung (Schema, Layout) erfolgt über den erweiterten Template-Editor (in Entwicklung).'
                : 'Vollständige Template-Erstellung mit Schema und Layout erfolgt über den erweiterten Template-Editor (in Entwicklung).'
              }
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleSaveTemplate} variant="contained" disabled={!templateForm.name || !templateForm.code}>
            {selectedTemplate ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Template deaktivieren?</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie das Template "{selectedTemplate?.name}" wirklich deaktivieren?
            Bereits erstellte Arbeitsbefunde mit diesem Template bleiben erhalten.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleDeleteTemplate} color="error" variant="contained">
            Deaktivieren
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DocumentTemplateAdmin;

