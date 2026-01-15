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
  Tooltip,
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
  History,
  CheckCircle,
  Cancel,
  Send,
  Visibility,
  Timeline,
  HelpOutline,
} from '@mui/icons-material';
import GradientDialogTitle from '../components/GradientDialogTitle';
import RichTextEditor, { RichTextEditorRef } from '../components/RichTextEditor';
import PlaceholderChips from '../components/PlaceholderChips';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchLocations,
  updateLocation,
  Location,
} from '../store/slices/locationSlice';
import {
  fetchDocumentTemplates,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  fetchStandaloneTemplates,
  fetchTemplateRevisions,
  createTemplateVersion,
  submitTemplateForApproval,
  approveTemplate,
  rejectTemplate,
  fetchMedicalSpecialties,
  DocumentTemplate,
} from '../store/slices/documentTemplateSlice';
import api from '../utils/api';
import { getPlaceholderLegend } from '../utils/placeholders';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';

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
  const { marginTopValue } = useGlobalNavigationOffset();

  const [tabValue, setTabValue] = useState(0);
  const [selectedLocationForLetterhead, setSelectedLocationForLetterhead] = useState<Location | null>(null);
  const [selectedLocationForTemplates, setSelectedLocationForTemplates] = useState<Location | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplateIndex, setEditingTemplateIndex] = useState<number | null>(null);
  
  // State für DocumentTemplates
  const { templates: documentTemplates, medicalSpecialties, loading: templatesLoading } = useAppSelector(state => state.documentTemplates);
  const { user } = useAppSelector(state => state.auth);
  const [documentTemplateDialogOpen, setDocumentTemplateDialogOpen] = useState(false);
  const [editingDocumentTemplate, setEditingDocumentTemplate] = useState<DocumentTemplate | null>(null);
  const [documentTemplateForm, setDocumentTemplateForm] = useState({
    name: '',
    description: '',
    category: 'arztbrief',
    content: '',
    isStandaloneDocument: false,
    documentType: 'sonstiges' as string,
    defaultRecipientType: null as 'patient' | 'doctor' | 'organization' | 'contact' | null,
    requiresRecipient: true,
    letterheadTemplate: null as 'template1' | 'template2' | 'template3' | 'custom' | null,
    medicalSpecialty: 'allgemeinmedizin',
    approvalStatus: 'draft' as 'draft' | 'pending_approval' | 'approved' | 'rejected',
    tags: [] as string[],
  });
  const [versionHistoryDialogOpen, setVersionHistoryDialogOpen] = useState(false);
  const [selectedTemplateForHistory, setSelectedTemplateForHistory] = useState<DocumentTemplate | null>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('');
  const [filterApprovalStatus, setFilterApprovalStatus] = useState<string>('');
  const [filterStandalone, setFilterStandalone] = useState<boolean | null>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'custom' as 'greeting' | 'closing' | 'custom' | 'anrede',
    documentType: 'all' as 'arztbrief' | 'patientenbrief' | 'rezept' | 'ueberweisung' | 'attest' | 'befund' | 'all',
    content: '',
    placeholders: [] as string[],
    description: '',
    isActive: true
  });
  const editorRef = React.useRef<RichTextEditorRef>(null);
  const [locationForm, setLocationForm] = useState({
    letterheadTemplates: {} as Record<string, 'template1' | 'template2' | 'template3' | 'custom'>
  });
  
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    // Prüfe, ob User authentifiziert ist, bevor API-Aufrufe gemacht werden
    if (!user) {
      return;
    }
    
    dispatch(fetchLocations());
    dispatch(fetchDocumentTemplates({}));
    dispatch(fetchMedicalSpecialties());
  }, [dispatch, user]);

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
          console.log('[LetterTemplates handleLogoUpload] Logo data after upload:', {
            hasLogo: !!updatedLocation.logo,
            filename: updatedLocation.logo.filename,
            path: updatedLocation.logo.path,
            fullLogo: updatedLocation.logo
          });
          
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
          let logoUrl = null;
          
          if (updatedLocation.logo.filename) {
            logoUrl = `${apiUrl}/uploads/location-logos/${updatedLocation.logo.filename}`;
            console.log('[LetterTemplates handleLogoUpload] Logo URL (from filename):', logoUrl);
          } else if (updatedLocation.logo.path) {
            if (updatedLocation.logo.path.startsWith('http')) {
              logoUrl = updatedLocation.logo.path;
            } else if (updatedLocation.logo.path.startsWith('/')) {
              logoUrl = `${apiUrl}${updatedLocation.logo.path}`;
            } else {
              // Pfad ohne führenden Slash: direkt unter uploads
              const cleanPath = updatedLocation.logo.path.replace(/^\.\//, '').replace(/^uploads\//, '');
              logoUrl = `${apiUrl}/uploads/${cleanPath}`;
            }
            console.log('[LetterTemplates handleLogoUpload] Logo URL (from path):', logoUrl);
          }
          
          setLogoPreview(logoUrl);
          console.log('[LetterTemplates handleLogoUpload] Final logoPreview:', logoUrl);
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
    <Box sx={{ 
      p: 3,
      mt: marginTopValue !== '0px' ? marginTopValue : 0,
      transition: marginTopValue !== '0px' ? 'margin-top 0.3s ease' : 'none',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Briefvorlagen
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Verwalten Sie Briefkopfvorlagen und Briefvorlagen für Ihre Standorte.
          </Typography>
        </Box>
        <Tooltip title="Hilfe & Leitfaden">
          <IconButton
            onClick={() => setHelpDialogOpen(true)}
            color="primary"
          >
            <HelpOutline />
          </IconButton>
        </Tooltip>
      </Box>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Briefkopfvorlagen" icon={<DescriptionIcon />} />
            <Tab label="Briefvorlagen" icon={<DescriptionIcon />} />
            <Tab label="Dokumentvorlagen" icon={<DescriptionIcon />} />
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
                      console.log('[LetterTemplates] Logo data when selecting location:', {
                        hasLogo: !!location.logo,
                        filename: location.logo.filename,
                        path: location.logo.path,
                        fullLogo: location.logo
                      });
                      
                      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
                      let logoUrl = null;
                      
                      if (location.logo.filename) {
                        logoUrl = `${apiUrl}/uploads/location-logos/${location.logo.filename}`;
                        console.log('[LetterTemplates] Logo URL (from filename):', logoUrl);
                      } else if (location.logo.path) {
                        if (location.logo.path.startsWith('http')) {
                          logoUrl = location.logo.path;
                        } else if (location.logo.path.startsWith('/')) {
                          logoUrl = `${apiUrl}${location.logo.path}`;
                        } else {
                          // Pfad ohne führenden Slash: direkt unter uploads
                          const cleanPath = location.logo.path.replace(/^\.\//, '').replace(/^uploads\//, '');
                          logoUrl = `${apiUrl}/uploads/${cleanPath}`;
                        }
                        console.log('[LetterTemplates] Logo URL (from path):', logoUrl);
                      }
                      
                      setLogoPreview(logoUrl);
                      console.log('[LetterTemplates] Final logoPreview:', logoUrl);
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
                MenuProps={{ disableScrollLock: true }}
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
                MenuProps={{ disableScrollLock: true }}
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

        {/* Tab 3: Dokumentvorlagen */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Dokumentvorlagen verwalten
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingDocumentTemplate(null);
                  setDocumentTemplateForm({
                    name: '',
                    description: '',
                    category: 'arztbrief',
                    content: '',
                    isStandaloneDocument: false,
                    documentType: 'sonstiges',
                    defaultRecipientType: null,
                    requiresRecipient: true,
                    letterheadTemplate: null,
                    medicalSpecialty: 'allgemeinmedizin',
                    approvalStatus: 'draft',
                    tags: [],
                  });
                  setDocumentTemplateDialogOpen(true);
                }}
              >
                Neue Dokumentvorlage
              </Button>
            </Box>

            {/* Filter */}
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Kategorie</InputLabel>
                  <Select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    label="Kategorie"
                  >
                    <MenuItem value="">Alle</MenuItem>
                    <MenuItem value="arztbrief">Arztbrief</MenuItem>
                    <MenuItem value="ueberweisung">Überweisung</MenuItem>
                    <MenuItem value="attest">Attest</MenuItem>
                    <MenuItem value="befund">Befund</MenuItem>
                    <MenuItem value="rezept">Rezept</MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Fachrichtung</InputLabel>
                    <Select
                      value={filterSpecialty}
                      onChange={(e) => setFilterSpecialty(e.target.value)}
                      label="Fachrichtung"
                    >
                      <MenuItem value="">Alle</MenuItem>
                      {medicalSpecialties.length > 0 ? (
                        medicalSpecialties.map((spec) => (
                          <MenuItem key={spec.value} value={spec.value}>
                            {spec.label}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem value="allgemeinmedizin">Allgemeinmedizin</MenuItem>
                      )}
                    </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Freigabestatus</InputLabel>
                  <Select
                    value={filterApprovalStatus}
                    onChange={(e) => setFilterApprovalStatus(e.target.value)}
                    label="Freigabestatus"
                  >
                    <MenuItem value="">Alle</MenuItem>
                    <MenuItem value="draft">Entwurf</MenuItem>
                    <MenuItem value="pending_approval">Zur Freigabe</MenuItem>
                    <MenuItem value="approved">Freigegeben</MenuItem>
                    <MenuItem value="rejected">Abgelehnt</MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Typ</InputLabel>
                  <Select
                    value={filterStandalone === null ? '' : filterStandalone ? 'standalone' : 'text'}
                    onChange={(e) => {
                      const val = e.target.value as string;
                      setFilterStandalone(val === '' ? null : val === 'standalone');
                    }}
                    label="Typ"
                  >
                    <MenuItem value="">Alle</MenuItem>
                    <MenuItem value="standalone">Standalone-Dokument</MenuItem>
                    <MenuItem value="text">Text-Vorlage</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Paper>

            {/* Vorlagen-Liste */}
            {templatesLoading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Kategorie</TableCell>
                      <TableCell>Fachrichtung</TableCell>
                      <TableCell>Typ</TableCell>
                      <TableCell>Version</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documentTemplates
                      .filter((t) => {
                        if (filterCategory && t.category !== filterCategory) return false;
                        if (filterSpecialty && t.medicalSpecialty !== filterSpecialty) return false;
                        if (filterApprovalStatus && t.approvalStatus !== filterApprovalStatus) return false;
                        if (filterStandalone !== null && (t.isStandaloneDocument || false) !== filterStandalone) return false;
                        return true;
                      })
                      .map((template) => (
                        <TableRow key={template._id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {template.name}
                            </Typography>
                            {template.description && (
                              <Typography variant="caption" color="text.secondary">
                                {template.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{template.category}</TableCell>
                          <TableCell>
                            {template.medicalSpecialty ? (
                              medicalSpecialties.find(s => s.value === template.medicalSpecialty)?.label || template.medicalSpecialty
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {template.isStandaloneDocument ? (
                              <Chip label="Standalone" color="primary" size="small" />
                            ) : (
                              <Chip label="Text" color="default" size="small" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip label={`v${template.version}`} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            {template.approvalStatus === 'approved' && (
                              <Chip icon={<CheckCircle />} label="Freigegeben" color="success" size="small" />
                            )}
                            {template.approvalStatus === 'pending_approval' && (
                              <Chip icon={<Send />} label="Zur Freigabe" color="warning" size="small" />
                            )}
                            {template.approvalStatus === 'draft' && (
                              <Chip label="Entwurf" color="default" size="small" />
                            )}
                            {template.approvalStatus === 'rejected' && (
                              <Chip icon={<Cancel />} label="Abgelehnt" color="error" size="small" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  // Debug: Log template data before loading
                                  console.log('[LetterTemplates] Loading template for edit:', {
                                    id: template._id,
                                    letterheadTemplate: template.letterheadTemplate,
                                    letterheadTemplateType: typeof template.letterheadTemplate,
                                    allTemplateFields: Object.keys(template)
                                  });
                                  
                                  setEditingDocumentTemplate(template);
                                  setDocumentTemplateForm({
                                    name: template.name,
                                    description: template.description || '',
                                    category: template.category,
                                    content: template.content,
                                    isStandaloneDocument: template.isStandaloneDocument || false,
                                    documentType: (template.documentType && ['rezept', 'ueberweisung', 'arztbrief', 'befund', 'formular', 'rechnung', 'sonstiges', 'attest', 'konsiliarbericht', 'zuweisung', 'rueckueberweisung', 'operationsbericht', 'heilmittelverordnung', 'krankenstandsbestaetigung', 'bildgebende_zuweisung', 'impfbestaetigung', 'patientenaufklaerung', 'therapieplan', 'verlaufsdokumentation', 'pflegebrief', 'kostenuebernahmeantrag', 'gutachten'].includes(template.documentType)) 
                                      ? template.documentType 
                                      : 'sonstiges',
                                    defaultRecipientType: template.defaultRecipientType || null,
                                    requiresRecipient: template.requiresRecipient !== false,
                                    letterheadTemplate: (template.letterheadTemplate !== undefined && template.letterheadTemplate !== null) ? template.letterheadTemplate : null,
                                    medicalSpecialty: template.medicalSpecialty || 'allgemeinmedizin',
                                    approvalStatus: template.approvalStatus || 'draft',
                                    tags: template.tags || [],
                                  });
                                  
                                  // Debug: Log form data after setting
                                  console.log('[LetterTemplates] Form data set:', {
                                    letterheadTemplate: (template.letterheadTemplate !== undefined && template.letterheadTemplate !== null) ? template.letterheadTemplate : null
                                  });
                                  
                                  setDocumentTemplateDialogOpen(true);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={async () => {
                                  setSelectedTemplateForHistory(template);
                                  try {
                                    const result = await dispatch(fetchTemplateRevisions(template._id)).unwrap();
                                    setRevisions(result);
                                    setVersionHistoryDialogOpen(true);
                                  } catch (error) {
                                    console.error('Fehler beim Laden der Versionshistorie:', error);
                                  }
                                }}
                                title="Versionshistorie"
                              >
                                <Timeline />
                              </IconButton>
                              {template.approvalStatus === 'draft' && (
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={async () => {
                                    if (window.confirm('Möchten Sie diese Vorlage zur Freigabe einreichen?')) {
                                      try {
                                        await dispatch(submitTemplateForApproval(template._id)).unwrap();
                                        await dispatch(fetchDocumentTemplates({}));
                                        alert('Vorlage erfolgreich zur Freigabe eingereicht!');
                                      } catch (error: any) {
                                        alert('Fehler: ' + (error.message || 'Unbekannter Fehler'));
                                      }
                                    }
                                  }}
                                  title="Zur Freigabe einreichen"
                                >
                                  <Send />
                                </IconButton>
                              )}
                              {user?.role === 'admin' && template.approvalStatus === 'pending_approval' && (
                                <>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={async () => {
                                      if (window.confirm('Möchten Sie diese Vorlage freigeben?')) {
                                        try {
                                          await dispatch(approveTemplate({ id: template._id })).unwrap();
                                          await dispatch(fetchDocumentTemplates({}));
                                          alert('Vorlage erfolgreich freigegeben!');
                                        } catch (error: any) {
                                          alert('Fehler: ' + (error.message || 'Unbekannter Fehler'));
                                        }
                                      }
                                    }}
                                    title="Freigeben"
                                  >
                                    <CheckCircle />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={async () => {
                                      const reason = prompt('Ablehnungsgrund eingeben:');
                                      if (reason) {
                                        try {
                                          await dispatch(rejectTemplate({ id: template._id, reason })).unwrap();
                                          await dispatch(fetchDocumentTemplates({}));
                                          alert('Vorlage abgelehnt!');
                                        } catch (error: any) {
                                          alert('Fehler: ' + (error.message || 'Unbekannter Fehler'));
                                        }
                                      }
                                    }}
                                    title="Ablehnen"
                                  >
                                    <Cancel />
                                  </IconButton>
                                </>
                              )}
                              <IconButton
                                size="small"
                                color="error"
                                onClick={async () => {
                                  if (window.confirm('Möchten Sie diese Vorlage wirklich löschen?')) {
                                    try {
                                      await dispatch(deleteDocumentTemplate(template._id)).unwrap();
                                      await dispatch(fetchDocumentTemplates({}));
                                    } catch (error: any) {
                                      alert('Fehler: ' + (error.message || 'Unbekannter Fehler'));
                                    }
                                  }
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </TabPanel>
      </Card>

      {/* Briefvorlagen-Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="lg" fullWidth>
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
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <RichTextEditor
                    ref={editorRef}
                    value={templateForm.content}
                    onChange={(html) => setTemplateForm({ ...templateForm, content: html })}
                    placeholder="Beginnen Sie mit der Eingabe... Ziehen Sie Platzhalter aus der rechten Sidebar oder klicken Sie darauf"
                    minHeight={300}
                    onPlaceholderInsert={(placeholder) => {
                      console.log('Platzhalter eingefügt:', placeholder);
                    }}
                  />
                </Box>
                <Box sx={{ width: 350, flexShrink: 0 }}>
                  <PlaceholderChips
                    enableDrag={true}
                    onPlaceholderClick={(placeholder) => {
                      // Einfügen per Click
                      if (editorRef.current) {
                        editorRef.current.insertPlaceholder(placeholder);
                      }
                    }}
                  />
                </Box>
              </Box>
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
                        
                        {/* Dekurs Platzhalter */}
                        {legend.dekurs && (
                          <>
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <History color="primary" />
                                <Typography variant="h6" fontWeight="bold">Dekurs</Typography>
                              </Stack>
                              <Stack spacing={0.5}>
                                {legend.dekurs.map((item, idx) => (
                                  <Box key={idx} sx={{ pl: 2 }}>
                                    <Typography variant="body2">
                                      <strong>{item.placeholder}</strong> - {item.description}
                                    </Typography>
                                  </Box>
                                ))}
                              </Stack>
                            </Box>
                            
                            <Divider />
                          </>
                        )}
                        
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

      {/* DocumentTemplate Dialog */}
      <Dialog open={documentTemplateDialogOpen} onClose={() => setDocumentTemplateDialogOpen(false)} maxWidth="lg" fullWidth>
        <GradientDialogTitle
          title={editingDocumentTemplate ? 'Dokumentvorlage bearbeiten' : 'Neue Dokumentvorlage'}
          onClose={() => setDocumentTemplateDialogOpen(false)}
        />
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Name *"
                  value={documentTemplateForm.name}
                  onChange={(e) => setDocumentTemplateForm({ ...documentTemplateForm, name: e.target.value })}
                  required
                />
                <TextField
                  fullWidth
                  label="Beschreibung"
                  value={documentTemplateForm.description}
                  onChange={(e) => setDocumentTemplateForm({ ...documentTemplateForm, description: e.target.value })}
                  multiline
                  rows={2}
                />
                <FormControl fullWidth>
                  <InputLabel>Kategorie *</InputLabel>
                  <Select
                    value={documentTemplateForm.category}
                    onChange={(e) => setDocumentTemplateForm({ ...documentTemplateForm, category: e.target.value })}
                    label="Kategorie *"
                  >
                    <MenuItem value="arztbrief">Arztbrief</MenuItem>
                    <MenuItem value="ueberweisung">Überweisung</MenuItem>
                    <MenuItem value="attest">Attest</MenuItem>
                    <MenuItem value="befund">Befund</MenuItem>
                    <MenuItem value="rezept">Rezept</MenuItem>
                    <MenuItem value="konsiliarbericht">Konsiliarbericht</MenuItem>
                    <MenuItem value="zuweisung">Zuweisung</MenuItem>
                    <MenuItem value="rueckueberweisung">Rücküberweisung</MenuItem>
                    <MenuItem value="operationsbericht">Operationsbericht</MenuItem>
                    <MenuItem value="heilmittelverordnung">Heilmittelverordnung</MenuItem>
                    <MenuItem value="krankenstandsbestaetigung">Krankenstandsbestätigung</MenuItem>
                    <MenuItem value="bildgebende_zuweisung">Bildgebende Zuweisung</MenuItem>
                    <MenuItem value="impfbestaetigung">Impfbestätigung</MenuItem>
                    <MenuItem value="patientenaufklaerung">Patientenaufklärung</MenuItem>
                    <MenuItem value="therapieplan">Therapieplan</MenuItem>
                    <MenuItem value="verlaufsdokumentation">Verlaufsdokumentation</MenuItem>
                    <MenuItem value="pflegebrief">Pflegebrief</MenuItem>
                    <MenuItem value="kostenuebernahmeantrag">Kostenübernahmeantrag</MenuItem>
                    <MenuItem value="gutachten">Gutachten</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Fachrichtung *</InputLabel>
                  <Select
                    value={documentTemplateForm.medicalSpecialty || 'allgemeinmedizin'}
                    onChange={(e) => setDocumentTemplateForm({ ...documentTemplateForm, medicalSpecialty: e.target.value })}
                    label="Fachrichtung *"
                  >
                    {medicalSpecialties.length > 0 ? (
                      medicalSpecialties.map((spec) => (
                        <MenuItem key={spec.value} value={spec.value}>
                          {spec.label}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value="allgemeinmedizin">Allgemeinmedizin</MenuItem>
                    )}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Switch
                      checked={documentTemplateForm.isStandaloneDocument}
                      onChange={(e) => setDocumentTemplateForm({ ...documentTemplateForm, isStandaloneDocument: e.target.checked })}
                    />
                  }
                  label="Als Standalone-Dokument verwenden"
                />
                {documentTemplateForm.isStandaloneDocument && (
                  <>
                    <FormControl fullWidth>
                      <InputLabel>Dokumenttyp *</InputLabel>
                      <Select
                        value={documentTemplateForm.documentType && ['rezept', 'ueberweisung', 'arztbrief', 'befund', 'formular', 'rechnung', 'sonstiges', 'attest', 'konsiliarbericht', 'zuweisung', 'rueckueberweisung', 'operationsbericht', 'heilmittelverordnung', 'krankenstandsbestaetigung', 'bildgebende_zuweisung', 'impfbestaetigung', 'patientenaufklaerung', 'therapieplan', 'verlaufsdokumentation', 'pflegebrief', 'kostenuebernahmeantrag', 'gutachten'].includes(documentTemplateForm.documentType) 
                          ? documentTemplateForm.documentType 
                          : 'sonstiges'}
                        onChange={(e) => setDocumentTemplateForm({ ...documentTemplateForm, documentType: e.target.value })}
                        label="Dokumenttyp *"
                      >
                        <MenuItem value="rezept">Rezept</MenuItem>
                        <MenuItem value="ueberweisung">Überweisung</MenuItem>
                        <MenuItem value="arztbrief">Arztbrief</MenuItem>
                        <MenuItem value="befund">Befund</MenuItem>
                        <MenuItem value="attest">Attest</MenuItem>
                        <MenuItem value="konsiliarbericht">Konsiliarbericht</MenuItem>
                        <MenuItem value="zuweisung">Zuweisung</MenuItem>
                        <MenuItem value="rueckueberweisung">Rücküberweisung</MenuItem>
                        <MenuItem value="operationsbericht">Operationsbericht</MenuItem>
                        <MenuItem value="heilmittelverordnung">Heilmittelverordnung</MenuItem>
                        <MenuItem value="krankenstandsbestaetigung">Krankenstandsbestätigung</MenuItem>
                        <MenuItem value="bildgebende_zuweisung">Bildgebende Zuweisung</MenuItem>
                        <MenuItem value="impfbestaetigung">Impfbestätigung</MenuItem>
                        <MenuItem value="patientenaufklaerung">Patientenaufklärung</MenuItem>
                        <MenuItem value="therapieplan">Therapieplan</MenuItem>
                        <MenuItem value="verlaufsdokumentation">Verlaufsdokumentation</MenuItem>
                        <MenuItem value="pflegebrief">Pflegebrief</MenuItem>
                        <MenuItem value="kostenuebernahmeantrag">Kostenübernahmeantrag</MenuItem>
                        <MenuItem value="gutachten">Gutachten</MenuItem>
                        <MenuItem value="sonstiges">Sonstiges</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel>Standard-Empfänger</InputLabel>
                      <Select
                        value={documentTemplateForm.defaultRecipientType || ''}
                        onChange={(e) => setDocumentTemplateForm({ 
                          ...documentTemplateForm, 
                          defaultRecipientType: e.target.value || null 
                        })}
                        label="Standard-Empfänger"
                      >
                        <MenuItem value="">Keine</MenuItem>
                        <MenuItem value="patient">Patient</MenuItem>
                        <MenuItem value="doctor">Arzt</MenuItem>
                        <MenuItem value="organization">Organisation</MenuItem>
                        <MenuItem value="contact">Kontakt</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={documentTemplateForm.requiresRecipient}
                          onChange={(e) => setDocumentTemplateForm({ ...documentTemplateForm, requiresRecipient: e.target.checked })}
                        />
                      }
                      label="Empfänger erforderlich"
                    />
                    <FormControl fullWidth>
                      <InputLabel>Briefkopf-Vorlage (optional)</InputLabel>
                      <Select
                        value={documentTemplateForm.letterheadTemplate || ''}
                        onChange={(e) => setDocumentTemplateForm({ 
                          ...documentTemplateForm, 
                          letterheadTemplate: e.target.value || null 
                        })}
                        label="Briefkopf-Vorlage (optional)"
                      >
                        <MenuItem value="">Standard (vom Standort/Dokumenttyp)</MenuItem>
                        <MenuItem value="template1">Vorlage 1: Logo links, Arzt rechts</MenuItem>
                        <MenuItem value="template2">Vorlage 2: Kontaktdaten links, Logo rechts</MenuItem>
                        <MenuItem value="template3">Vorlage 3: Drei-Spalten-Layout</MenuItem>
                        <MenuItem value="custom">Individuelle Gestaltung</MenuItem>
                      </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: -1, mb: 1, display: 'block' }}>
                      Wenn keine Vorlage ausgewählt wird, wird die Standard-Vorlage des Standorts für diesen Dokumenttyp verwendet.
                    </Typography>
                  </>
                )}
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                    Vorlageninhalt *
                  </Typography>
                  <RichTextEditor
                    ref={editorRef}
                    value={documentTemplateForm.content}
                    onChange={(html) => setDocumentTemplateForm({ ...documentTemplateForm, content: html })}
                    placeholder="Beginnen Sie mit der Eingabe... Verwenden Sie Platzhalter wie {{patient.fullName}}, {{doctor.fullName}}, {{date}}, {{location.name}}"
                    minHeight={300}
                    onPlaceholderInsert={(placeholder) => {
                      if (editorRef.current) {
                        editorRef.current.insertPlaceholder(placeholder);
                      }
                    }}
                  />
                </Box>
                {editingDocumentTemplate && (
                  <Alert severity="info">
                    Aktuelle Version: {editingDocumentTemplate.version}. 
                    {editingDocumentTemplate.approvalStatus === 'approved' && ' Um Änderungen vorzunehmen, erstellen Sie eine neue Version.'}
                  </Alert>
                )}
              </Stack>
              </Box>
              <Box sx={{ width: 350, flexShrink: 0 }}>
                <PlaceholderChips
                  onPlaceholderClick={(placeholder) => {
                    if (editorRef.current) {
                      editorRef.current.insertPlaceholder(placeholder);
                    }
                  }}
                />
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentTemplateDialogOpen(false)}>Abbrechen</Button>
          {editingDocumentTemplate && editingDocumentTemplate.approvalStatus === 'approved' && (
            <Button
              variant="outlined"
              onClick={async () => {
                const changeNotes = prompt('Änderungsnotizen für die neue Version:');
                try {
                  await dispatch(createTemplateVersion({
                    id: editingDocumentTemplate._id,
                    templateData: documentTemplateForm,
                    changeNotes: changeNotes || ''
                  })).unwrap();
                  await dispatch(fetchDocumentTemplates({}));
                  setDocumentTemplateDialogOpen(false);
                  alert('Neue Version erfolgreich erstellt!');
                } catch (error: any) {
                  alert('Fehler: ' + (error.message || 'Unbekannter Fehler'));
                }
              }}
            >
              Neue Version erstellen
            </Button>
          )}
          <Button
            variant="contained"
            onClick={async () => {
              try {
                // Debug: Log form data before saving
                console.log('[LetterTemplates] Saving template:', {
                  id: editingDocumentTemplate?._id,
                  letterheadTemplate: documentTemplateForm.letterheadTemplate,
                  documentType: documentTemplateForm.documentType,
                  allFields: Object.keys(documentTemplateForm)
                });
                
                if (editingDocumentTemplate) {
                  await dispatch(updateDocumentTemplate({
                    id: editingDocumentTemplate._id,
                    templateData: documentTemplateForm
                  })).unwrap();
                } else {
                  await dispatch(createDocumentTemplate(documentTemplateForm)).unwrap();
                }
                await dispatch(fetchDocumentTemplates({}));
                setDocumentTemplateDialogOpen(false);
                alert('Vorlage erfolgreich gespeichert!');
              } catch (error: any) {
                alert('Fehler: ' + (error.message || 'Unbekannter Fehler'));
              }
            }}
          >
            Speichern
          </Button>
          {(!editingDocumentTemplate || editingDocumentTemplate.approvalStatus === 'draft' || editingDocumentTemplate.approvalStatus === 'rejected') && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Send />}
              onClick={async () => {
                try {
                  let templateId: string;
                  if (editingDocumentTemplate) {
                    // Aktualisiere zuerst
                    const updated = await dispatch(updateDocumentTemplate({
                      id: editingDocumentTemplate._id,
                      templateData: documentTemplateForm
                    })).unwrap();
                    templateId = updated._id || editingDocumentTemplate._id;
                  } else {
                    // Erstelle neue Vorlage
                    const created = await dispatch(createDocumentTemplate(documentTemplateForm)).unwrap();
                    templateId = created._id || '';
                  }
                  
                  // Reiche dann zur Freigabe ein
                  await dispatch(submitTemplateForApproval(templateId)).unwrap();
                  await dispatch(fetchDocumentTemplates({}));
                  setDocumentTemplateDialogOpen(false);
                  alert('Vorlage erfolgreich gespeichert und zur Freigabe eingereicht!');
                } catch (error: any) {
                  alert('Fehler: ' + (error.message || 'Unbekannter Fehler'));
                }
              }}
            >
              Speichern & zur Freigabe einreichen
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Versionshistorie Dialog */}
      <Dialog open={versionHistoryDialogOpen} onClose={() => setVersionHistoryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Versionshistorie: {selectedTemplateForHistory?.name}
        </DialogTitle>
        <DialogContent>
          {revisions.length === 0 ? (
            <Alert severity="info">Keine Versionshistorie verfügbar</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Version</TableCell>
                    <TableCell>Datum</TableCell>
                    <TableCell>Benutzer</TableCell>
                    <TableCell>Aktion</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {revisions.map((revision) => (
                    <TableRow key={revision._id}>
                      <TableCell>
                        <Chip label={`v${revision.version}`} size="small" />
                      </TableCell>
                      <TableCell>
                        {new Date(revision.performedAt).toLocaleString('de-DE')}
                      </TableCell>
                      <TableCell>
                        {revision.performedBy?.firstName} {revision.performedBy?.lastName}
                      </TableCell>
                      <TableCell>{revision.action}</TableCell>
                      <TableCell>
                        {revision.approvalStatus === 'approved' && (
                          <Chip label="Freigegeben" color="success" size="small" />
                        )}
                        {revision.approvalStatus === 'pending_approval' && (
                          <Chip label="Zur Freigabe" color="warning" size="small" />
                        )}
                        {revision.approvalStatus === 'draft' && (
                          <Chip label="Entwurf" color="default" size="small" />
                        )}
                        {revision.approvalStatus === 'rejected' && (
                          <Chip label="Abgelehnt" color="error" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionHistoryDialogOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Hilfe-Dialog mit Leitfaden */}
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
          title="Leitfaden: Briefvorlagen" 
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs value={helpTab} onChange={(_, v) => setHelpTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Übersicht" />
            <Tab label="Briefkopfvorlagen" />
            <Tab label="Briefvorlagen" />
            <Tab label="Dokumentvorlagen" />
            <Tab label="Placeholders" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Was sind Briefvorlagen?
                </Typography>
                <Typography variant="body1" paragraph>
                  Briefvorlagen ermöglichen es Ihnen, wiederkehrende Textbausteine und Dokumentstrukturen 
                  zu erstellen und zu verwalten. Das System bietet drei Arten von Vorlagen:
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Drei Arten von Vorlagen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>
                    <strong>📋 Briefkopfvorlagen:</strong> Logo und Layout für verschiedene Dokumenttypen 
                    (Arztbrief, Patientenbrief, Rezept, etc.)
                  </li>
                  <li>
                    <strong>✉️ Briefvorlagen:</strong> Text-Vorlagen für Anreden, Begrüßungen, Abschlüsse 
                    und benutzerdefinierte Textbausteine
                  </li>
                  <li>
                    <strong>📄 Dokumentvorlagen:</strong> Vollständige Dokumentvorlagen mit Versionierung, 
                    Freigabeprozess und Fachrichtungskategorisierung
                  </li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Logo-Verwaltung:</strong> Logo pro Standort hochladen und verwalten</li>
                  <li>✅ <strong>Briefkopf-Layouts:</strong> Verschiedene Layout-Vorlagen pro Dokumenttyp</li>
                  <li>✅ <strong>Text-Vorlagen:</strong> Wiederverwendbare Textbausteine</li>
                  <li>✅ <strong>Placeholders:</strong> Dynamische Variablen für Patientendaten</li>
                  <li>✅ <strong>Versionierung:</strong> Versionshistorie für Dokumentvorlagen</li>
                  <li>✅ <strong>Freigabeprozess:</strong> Workflow für Vorlagen-Freigabe</li>
                  <li>✅ <strong>Import/Export:</strong> Vorlagen zwischen Standorten teilen</li>
                  <li>✅ <strong>Filter:</strong> Nach Kategorie, Fachrichtung, Status filtern</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Vorteile
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>⚡ <strong>Zeitersparnis:</strong> Schnellere Dokumentenerstellung</li>
                  <li>📝 <strong>Konsistenz:</strong> Einheitliche Dokumente</li>
                  <li>🔄 <strong>Wiederverwendbarkeit:</strong> Einmal erstellen, mehrfach verwenden</li>
                  <li>👥 <strong>Kollaboration:</strong> Vorlagen zwischen Standorten teilen</li>
                  <li>✅ <strong>Qualitätssicherung:</strong> Freigabeprozess für wichtige Vorlagen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Briefkopfvorlagen
                </Typography>
                <Typography variant="body2" paragraph>
                  Briefkopfvorlagen definieren das Layout und das Logo für verschiedene Dokumenttypen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Logo hochladen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wählen Sie einen Standort aus</li>
                  <li>Klicken Sie auf "Logo hochladen"</li>
                  <li>Wählen Sie eine Bilddatei aus (JPEG, PNG, GIF, WebP, SVG)</li>
                  <li>Empfohlene Auflösung: mindestens 300x150px</li>
                  <li>Maximale Dateigröße: 5MB</li>
                  <li>Das Logo wird automatisch im Briefkopf verwendet</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Briefkopf-Vorlagen pro Dokumenttyp
                </Typography>
                <Typography variant="body2" paragraph>
                  Sie können für jeden Dokumenttyp eine eigene Briefkopf-Vorlage wählen:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Vorlage 1:</strong> Logo links, Arzt rechts</li>
                  <li><strong>Vorlage 2:</strong> Kontaktdaten links, Logo rechts</li>
                  <li><strong>Vorlage 3:</strong> Drei-Spalten-Layout</li>
                  <li><strong>Individuelle Gestaltung:</strong> Standard-Layout ohne vordefinierte Vorlage</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Verfügbare Dokumenttypen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Arztbrief</li>
                  <li>Patientenbrief</li>
                  <li>Rezept</li>
                  <li>Überweisung</li>
                  <li>Attest</li>
                  <li>Befund</li>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Hinweis:</strong> Das Logo wird in allen Dokumenten verwendet, die für diesen 
                  Standort erstellt werden. Die Briefkopf-Vorlage bestimmt nur das Layout.
                </Typography>
              </Alert>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Briefvorlagen (Text-Vorlagen)
                </Typography>
                <Typography variant="body2" paragraph>
                  Briefvorlagen sind wiederverwendbare Textbausteine, die in Briefen verwendet werden können.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Vorlagentypen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Anrede:</strong> Für Arztbriefe (z.B. "Sehr geehrte/r Dr. ...")</li>
                  <li><strong>Begrüßung:</strong> Begrüßungstexte</li>
                  <li><strong>Abschluss:</strong> Abschlussformeln (z.B. "Mit freundlichen Grüßen")</li>
                  <li><strong>Benutzerdefiniert:</strong> Eigene Textbausteine</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Neue Vorlage erstellen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wählen Sie einen Standort aus</li>
                  <li>Klicken Sie auf "Neue Vorlage"</li>
                  <li>Geben Sie einen Namen ein</li>
                  <li>Wählen Sie den Typ (Anrede, Begrüßung, Abschluss, Benutzerdefiniert)</li>
                  <li>Wählen Sie den Dokumenttyp (für welche Dokumente die Vorlage verwendet wird)</li>
                  <li>Erstellen Sie den Inhalt mit dem Rich-Text-Editor</li>
                  <li>Verwenden Sie Placeholders für dynamische Daten</li>
                  <li>Speichern Sie die Vorlage</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Import von anderen Standorten
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Von anderem Standort importieren"</li>
                  <li>Geben Sie die Standort-ID des Quell-Standorts ein</li>
                  <li>Die Vorlagen werden kopiert (nicht verschoben)</li>
                  <li>Sie können die importierten Vorlagen anschließend anpassen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Dokumentvorlagen
                </Typography>
                <Typography variant="body2" paragraph>
                  Dokumentvorlagen sind vollständige Dokumentstrukturen mit erweiterten Funktionen 
                  wie Versionierung und Freigabeprozess.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Freigabeprozess
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><Chip label="Entwurf" size="small" sx={{ mr: 1 }} /> Vorlage wird noch bearbeitet</li>
                  <li><Chip label="Zur Freigabe" color="warning" size="small" sx={{ mr: 1 }} /> Vorlage wurde zur Freigabe eingereicht</li>
                  <li><Chip label="Freigegeben" color="success" size="small" sx={{ mr: 1 }} /> Vorlage ist freigegeben</li>
                  <li><Chip label="Abgelehnt" color="error" size="small" sx={{ mr: 1 }} /> Vorlage wurde abgelehnt</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Versionierung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Jede Änderung erstellt eine neue Version</li>
                  <li>Versionshistorie zeigt alle Änderungen</li>
                  <li>Sie können frühere Versionen einsehen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Placeholders (Variablen)
                </Typography>
                <Typography variant="body2" paragraph>
                  Placeholders sind dynamische Variablen, die beim Erstellen eines Dokuments automatisch 
                  durch echte Daten ersetzt werden.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Verfügbare Placeholders
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Patientendaten:</strong> {`{{patient.name}}`}, {`{{patient.birthDate}}`}, etc.</li>
                  <li><strong>Arztdaten:</strong> {`{{doctor.name}}`}, {`{{doctor.title}}`}, etc.</li>
                  <li><strong>Standortdaten:</strong> {`{{location.name}}`}, {`{{location.address}}`}, etc.</li>
                  <li><strong>Datum/Zeit:</strong> {`{{date}}`}, {`{{time}}`}, {`{{dateTime}}`}, etc.</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 5 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Allgemeine Tipps
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Verwenden Sie klare, beschreibende Namen</li>
                  <li>✅ Nutzen Sie Placeholders für dynamische Daten</li>
                  <li>✅ Organisieren Sie Vorlagen nach Kategorien</li>
                  <li>✅ Testen Sie Vorlagen vor der Freigabe</li>
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

export default LetterTemplates;

