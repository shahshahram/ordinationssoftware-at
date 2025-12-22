import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
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
  Switch,
  FormControlLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Stack,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  ExpandMore as ExpandMoreIcon,
  Person,
  LocalHospital,
  CalendarToday,
  Info,
} from '@mui/icons-material';
import GradientDialogTitle from '../components/GradientDialogTitle';
import RichTextEditor from '../components/RichTextEditor';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchLocations,
  updateLocation,
  Location,
} from '../store/slices/locationSlice';
import api from '../utils/api';
import { getPlaceholderLegend } from '../utils/placeholders';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`letter-template-tabpanel-${index}`}
      aria-labelledby={`letter-template-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const LetterTemplates: React.FC = () => {
  const dispatch = useAppDispatch();
  const { locations } = useAppSelector(state => state.locations);

  const [tabValue, setTabValue] = useState(0);
  const [selectedLocationForLetterhead, setSelectedLocationForLetterhead] = useState<Location | null>(null);
  const [selectedLocationForTemplates, setSelectedLocationForTemplates] = useState<Location | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplateIndex, setEditingTemplateIndex] = useState<number | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'custom' as 'greeting' | 'closing' | 'custom' | 'anrede',
    documentType: 'all' as 'arztbrief' | 'patientenbrief' | 'rezept' | 'ueberweisung' | 'attest' | 'befund' | 'all',
    content: '',
    placeholders: [] as string[],
    description: '',
    isActive: true
  });
  const [locationForm, setLocationForm] = useState({
    letterheadTemplates: {} as Record<string, 'template1' | 'template2' | 'template3' | 'custom'>
  });
  
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    dispatch(fetchLocations());
  }, [dispatch]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedLocationForLetterhead) return;

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await api.post(`/locations/${selectedLocationForLetterhead._id}/logo`, formData);

      if ((response.data as any).success) {
        const locations = await dispatch(fetchLocations()).unwrap();
        const updatedLocation = locations.find((loc: Location) => loc._id === selectedLocationForLetterhead._id);
        if (updatedLocation?.logo) {
          let logoUrl = null;
          if (updatedLocation.logo.path) {
            if (updatedLocation.logo.path.startsWith('http')) {
              logoUrl = updatedLocation.logo.path;
            } else if (updatedLocation.logo.path.startsWith('/')) {
              logoUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}${updatedLocation.logo.path}`;
            } else {
              logoUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/${updatedLocation.logo.path}`;
            }
          } else if (updatedLocation.logo.filename) {
            logoUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/uploads/location-logos/${updatedLocation.logo.filename}`;
          }
          setLogoPreview(logoUrl);
        }
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Fehler beim Hochladen des Logos');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!selectedLocationForLetterhead) return;

    if (window.confirm('Möchten Sie das Logo wirklich löschen?')) {
      try {
        await api.delete(`/locations/${selectedLocationForLetterhead._id}/logo`);
        await dispatch(fetchLocations());
        setLogoPreview(null);
      } catch (error) {
        console.error('Error deleting logo:', error);
        alert('Fehler beim Löschen des Logos');
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Briefvorlagen
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Verwalten Sie Briefkopfvorlagen und Briefvorlagen für Ihre Standorte.
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Briefkopfvorlagen" icon={<DescriptionIcon />} />
            <Tab label="Briefvorlagen" icon={<DescriptionIcon />} />
          </Tabs>
        </Box>

        {/* Tab 1: Briefkopfvorlagen */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" gutterBottom>
              Briefkopfvorlagen verwalten
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Wählen Sie einen Standort aus, um dessen Logo und Briefkopfvorlagen zu konfigurieren.
            </Typography>

            {/* Standortauswahl */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Standort auswählen</InputLabel>
              <Select
                value={selectedLocationForLetterhead?._id || ''}
                onChange={(e) => {
                  const location = locations.find(loc => loc._id === e.target.value);
                  setSelectedLocationForLetterhead(location || null);
                  if (location) {
                    // Setze Logo-Preview wenn vorhanden
                    if (location.logo) {
                      let logoUrl = null;
                      if (location.logo.path) {
                        if (location.logo.path.startsWith('http')) {
                          logoUrl = location.logo.path;
                        } else if (location.logo.path.startsWith('/')) {
                          logoUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}${location.logo.path}`;
                        } else {
                          logoUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/${location.logo.path}`;
                        }
                      } else if (location.logo.filename) {
                        logoUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/uploads/location-logos/${location.logo.filename}`;
                      }
                      setLogoPreview(logoUrl);
                    } else {
                      setLogoPreview(null);
                    }
                    // Setze letterheadTemplates im Form
                    setLocationForm(prev => ({
                      ...prev,
                      letterheadTemplates: location.letterheadTemplates || {}
                    }));
                  }
                }}
                label="Standort auswählen"
              >
                {locations.map((location) => (
                  <MenuItem key={location._id} value={location._id}>
                    {location.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedLocationForLetterhead ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Logo Upload */}
                <Card sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Logo für Briefkopf
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    {logoPreview && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>Aktuelles Logo:</Typography>
                        <Box
                          component="img"
                          src={logoPreview}
                          alt="Logo Preview"
                          sx={{
                            maxWidth: '300px',
                            maxHeight: '150px',
                            objectFit: 'contain',
                            border: '1px solid #ddd',
                            borderRadius: 1,
                            p: 1,
                            bgcolor: '#f5f5f5'
                          }}
                        />
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={handleLogoDelete}
                          sx={{ mt: 1 }}
                        >
                          Logo löschen
                        </Button>
                      </Box>
                    )}
                    <Box>
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="logo-upload-input-letterhead"
                        type="file"
                        onChange={handleLogoUpload}
                        disabled={logoUploading}
                      />
                      <label htmlFor="logo-upload-input-letterhead">
                        <Button
                          variant="outlined"
                          component="span"
                          disabled={logoUploading}
                          startIcon={logoUploading ? <CircularProgress size={20} /> : <AddIcon />}
                        >
                          {logoPreview ? 'Logo ersetzen' : 'Logo hochladen'}
                        </Button>
                      </label>
                      <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                        Empfohlene Auflösung: mindestens 300x150px. Formate: JPEG, PNG, GIF, WebP, SVG (max. 5MB)
                      </Typography>
                    </Box>
                  </Box>
                </Card>

                {/* Briefkopf-Vorlagen */}
                <Card sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Briefkopf-Vorlagen
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Wählen Sie für jeden Dokumenttyp eine Briefkopf-Vorlage aus. Diese wird beim Erstellen von Dokumenten verwendet.
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2" component="div">
                      <strong>Hinweis zu "Individuelle Gestaltung":</strong><br />
                      Diese Option verwendet das Standard-Layout ohne vordefinierte Vorlage. Das Logo und die Kontaktdaten werden in der Standard-Position angezeigt.
                    </Typography>
                  </Alert>
                  <Stack spacing={2}>
                    {['arztbrief', 'patientenbrief', 'rezept', 'ueberweisung', 'attest', 'befund'].map((docType) => (
                      <FormControl fullWidth key={docType}>
                        <InputLabel>{docType === 'arztbrief' ? 'Arztbrief' : docType === 'patientenbrief' ? 'Patientenbrief' : docType === 'rezept' ? 'Rezept' : docType === 'ueberweisung' ? 'Überweisung' : docType === 'attest' ? 'Attest' : 'Befund'}</InputLabel>
                        <Select
                          value={locationForm.letterheadTemplates?.[docType] || 'template1'}
                          onChange={(e) => {
                            setLocationForm({
                              ...locationForm,
                              letterheadTemplates: {
                                ...locationForm.letterheadTemplates,
                                [docType]: e.target.value as 'template1' | 'template2' | 'template3' | 'custom'
                              }
                            });
                          }}
                          label={docType === 'arztbrief' ? 'Arztbrief' : docType === 'patientenbrief' ? 'Patientenbrief' : docType === 'rezept' ? 'Rezept' : docType === 'ueberweisung' ? 'Überweisung' : docType === 'attest' ? 'Attest' : 'Befund'}
                        >
                          <MenuItem value="template1">Vorlage 1: Logo links, Arzt rechts</MenuItem>
                          <MenuItem value="template2">Vorlage 2: Kontaktdaten links, Logo rechts</MenuItem>
                          <MenuItem value="template3">Vorlage 3: Drei-Spalten-Layout</MenuItem>
                          <MenuItem value="custom">Individuelle Gestaltung (Standard-Layout ohne Vorlage)</MenuItem>
                        </Select>
                      </FormControl>
                    ))}
                  </Stack>
                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={async () => {
                        if (selectedLocationForLetterhead) {
                          try {
                            await dispatch(updateLocation({ 
                              id: selectedLocationForLetterhead._id, 
                              locationData: {
                                ...selectedLocationForLetterhead,
                                letterheadTemplates: locationForm.letterheadTemplates
                              }
                            })).unwrap();
                            await dispatch(fetchLocations());
                            alert('Briefkopfvorlagen erfolgreich gespeichert!');
                          } catch (error) {
                            console.error('Error saving letterhead templates:', error);
                            alert('Fehler beim Speichern der Briefkopfvorlagen');
                          }
                        }
                      }}
                    >
                      Vorlagen speichern
                    </Button>
                  </Box>
                </Card>
              </Box>
            ) : (
              <Alert severity="info">
                Bitte wählen Sie zuerst einen Standort aus.
              </Alert>
            )}
          </Box>
        </TabPanel>

        {/* Tab 2: Briefvorlagen */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" gutterBottom>
              Briefvorlagen verwalten
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Erstellen Sie Text-Vorlagen, die in Briefen verwendet werden können. Diese Vorlagen können zwischen Standorten importiert werden.
            </Typography>

            {/* Standortauswahl */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Standort auswählen</InputLabel>
              <Select
                value={selectedLocationForTemplates?._id || ''}
                onChange={(e) => {
                  const location = locations.find(loc => loc._id === e.target.value);
                  setSelectedLocationForTemplates(location || null);
                }}
                label="Standort auswählen"
              >
                {locations.map((location) => (
                  <MenuItem key={location._id} value={location._id}>
                    {location.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedLocationForTemplates ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">
                    Vorlagen für {selectedLocationForTemplates.name}
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="outlined"
                      onClick={async () => {
                        const sourceLocationId = prompt('Standort-ID zum Importieren eingeben:');
                        if (sourceLocationId) {
                          try {
                            const response = await api.post(`/locations/${selectedLocationForTemplates._id}/letter-templates/import`, {
                              sourceLocationId,
                              templateIndices: []
                            });
                            if ((response.data as any).success) {
                              alert('Vorlagen erfolgreich importiert!');
                              dispatch(fetchLocations());
                            }
                          } catch (error: any) {
                            alert('Fehler beim Importieren: ' + (error.response?.data?.message || error.message));
                          }
                        }
                      }}
                    >
                      Von anderem Standort importieren
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setEditingTemplateIndex(null);
                        setTemplateForm({
                          name: '',
                          type: 'custom',
                          documentType: 'all',
                          content: '',
                          placeholders: [],
                          description: '',
                          isActive: true
                        });
                        setTemplateDialogOpen(true);
                      }}
                    >
                      Neue Vorlage
                    </Button>
                  </Stack>
                </Box>

                {/* Vorlagen-Liste */}
                {selectedLocationForTemplates.letterTemplates && selectedLocationForTemplates.letterTemplates.length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Typ</TableCell>
                          <TableCell>Dokumenttyp</TableCell>
                          <TableCell>Aktiv</TableCell>
                          <TableCell>Aktionen</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedLocationForTemplates.letterTemplates.map((template, index) => (
                          <TableRow key={index}>
                            <TableCell>{template.name}</TableCell>
                            <TableCell>
                              {template.type === 'anrede' ? 'Anrede' :
                               template.type === 'greeting' ? 'Begrüßung' :
                               template.type === 'closing' ? 'Abschluss' : 'Benutzerdefiniert'}
                            </TableCell>
                            <TableCell>
                              {template.documentType === 'all' ? 'Alle' :
                               template.documentType === 'arztbrief' ? 'Arztbrief' :
                               template.documentType === 'patientenbrief' ? 'Patientenbrief' :
                               template.documentType}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={template.isActive ? 'Aktiv' : 'Inaktiv'}
                                color={template.isActive ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingTemplateIndex(index);
                                  setTemplateForm({
                                    name: template.name,
                                    type: template.type,
                                    documentType: template.documentType,
                                    content: template.content,
                                    placeholders: template.placeholders || [],
                                    description: template.description || '',
                                    isActive: template.isActive !== false
                                  });
                                  setTemplateDialogOpen(true);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={async () => {
                                  if (window.confirm('Möchten Sie diese Vorlage wirklich löschen?')) {
                                    try {
                                      await api.delete(`/locations/${selectedLocationForTemplates._id}/letter-templates/${index}`);
                                      dispatch(fetchLocations());
                                    } catch (error: any) {
                                      alert('Fehler beim Löschen: ' + (error.response?.data?.message || error.message));
                                    }
                                  }
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    Keine Briefvorlagen vorhanden. Erstellen Sie eine neue Vorlage.
                  </Alert>
                )}
              </Box>
            ) : (
              <Alert severity="info">
                Bitte wählen Sie zuerst einen Standort aus.
              </Alert>
            )}
          </Box>
        </TabPanel>
      </Card>

      {/* Briefvorlagen-Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTemplateIndex !== null ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Typ</InputLabel>
              <Select
                value={templateForm.type}
                onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value as any })}
                label="Typ"
              >
                <MenuItem value="anrede">Anrede (für Arztbriefe)</MenuItem>
                <MenuItem value="greeting">Begrüßung</MenuItem>
                <MenuItem value="closing">Abschluss</MenuItem>
                <MenuItem value="custom">Benutzerdefiniert</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Dokumenttyp</InputLabel>
              <Select
                value={templateForm.documentType}
                onChange={(e) => setTemplateForm({ ...templateForm, documentType: e.target.value as any })}
                label="Dokumenttyp"
              >
                <MenuItem value="all">Alle Briefe</MenuItem>
                <MenuItem value="arztbrief">Arztbrief</MenuItem>
                <MenuItem value="patientenbrief">Patientenbrief</MenuItem>
                <MenuItem value="rezept">Rezept</MenuItem>
                <MenuItem value="ueberweisung">Überweisung</MenuItem>
                <MenuItem value="attest">Attest</MenuItem>
                <MenuItem value="befund">Befund</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Beschreibung"
              value={templateForm.description}
              onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
              multiline
              rows={2}
            />
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                Vorlageninhalt *
              </Typography>
              <RichTextEditor
                value={templateForm.content}
                onChange={(html) => setTemplateForm({ ...templateForm, content: html })}
                placeholder="Beginnen Sie mit der Eingabe... Verwenden Sie Platzhalter wie {{patient.fullName}}, {{doctor.fullName}}, {{date}}, {{location.name}}"
                minHeight={200}
              />
            </Box>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Info color="primary" />
                  <Typography variant="subtitle2" fontWeight="medium">
                    Verfügbare Platzhalter
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  {(() => {
                    const legend = getPlaceholderLegend();
                    return (
                      <Stack spacing={2}>
                        {/* Patienten Platzhalter */}
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Person color="primary" />
                            <Typography variant="h6" fontWeight="bold">Patienten</Typography>
                          </Stack>
                          <Stack spacing={0.5}>
                            {legend.patient.map((item, idx) => (
                              <Box key={idx} sx={{ pl: 2 }}>
                                <Typography variant="body2">
                                  <strong>{item.placeholder}</strong> - {item.description}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                        
                        <Divider />
                        
                        {/* Arzt/Personal Platzhalter */}
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <LocalHospital color="primary" />
                            <Typography variant="h6" fontWeight="bold">Arzt/Personal</Typography>
                          </Stack>
                          <Stack spacing={0.5}>
                            {legend.doctor.map((item, idx) => (
                              <Box key={idx} sx={{ pl: 2 }}>
                                <Typography variant="body2">
                                  <strong>{item.placeholder}</strong> - {item.description}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                        
                        <Divider />
                        
                        {/* Standort/Praxis Platzhalter */}
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <LocalHospital color="secondary" />
                            <Typography variant="h6" fontWeight="bold">Standort/Praxis</Typography>
                          </Stack>
                          <Stack spacing={0.5}>
                            {legend.location.map((item, idx) => (
                              <Box key={idx} sx={{ pl: 2 }}>
                                <Typography variant="body2">
                                  <strong>{item.placeholder}</strong> - {item.description}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                        
                        <Divider />
                        
                        {/* Datum/Zeit Platzhalter */}
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <CalendarToday color="primary" />
                            <Typography variant="h6" fontWeight="bold">Datum/Zeit</Typography>
                          </Stack>
                          <Stack spacing={0.5}>
                            {legend.dateTime.map((item, idx) => (
                              <Box key={idx} sx={{ pl: 2 }}>
                                <Typography variant="body2">
                                  <strong>{item.placeholder}</strong> - {item.description}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                        
                        <Divider />
                        
                        {/* Veraltete Platzhalter (für Rückwärtskompatibilität) */}
                        <Box>
                          <Alert severity="warning" sx={{ mb: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              Veraltete Platzhalter (werden weiterhin unterstützt)
                            </Typography>
                          </Alert>
                          <Stack spacing={0.5}>
                            {legend.legacy.map((item, idx) => (
                              <Box key={idx} sx={{ pl: 2 }}>
                                <Typography variant="body2">
                                  <strong>{item.placeholder}</strong> - {item.description}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      </Stack>
                    );
                  })()}
                </Box>
              </AccordionDetails>
            </Accordion>
            <FormControlLabel
              control={
                <Switch
                  checked={templateForm.isActive}
                  onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.checked })}
                />
              }
              label="Vorlage ist aktiv"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                if (editingTemplateIndex !== null) {
                  await api.put(`/locations/${selectedLocationForTemplates?._id}/letter-templates/${editingTemplateIndex}`, templateForm);
                } else {
                  await api.post(`/locations/${selectedLocationForTemplates?._id}/letter-templates`, templateForm);
                }
                await dispatch(fetchLocations());
                setTemplateDialogOpen(false);
                alert('Vorlage erfolgreich gespeichert!');
              } catch (error: any) {
                alert('Fehler beim Speichern: ' + (error.response?.data?.message || error.message));
              }
            }}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LetterTemplates;

