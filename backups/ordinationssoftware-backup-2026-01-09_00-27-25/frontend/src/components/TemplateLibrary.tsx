import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Pagination,
  InputAdornment
} from '@mui/material';
import {
  Search,
  FilterList,
  Description,
  Edit,
  Preview,
  Download,
  History,
  Add,
  Category
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchDocumentTemplates, createDocumentTemplate, updateDocumentTemplate, deleteDocumentTemplate } from '../store/slices/documentTemplateSlice';

interface TemplateLibraryProps {
  onSelectTemplate?: (template: any) => void;
  onEditTemplate?: (template: any) => void;
  showActions?: boolean;
}

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onSelectTemplate,
  onEditTemplate,
  showActions = true
}) => {
  const dispatch = useAppDispatch();
  const { templates, loading, error } = useAppSelector(state => state.documentTemplates);
  
  // Handle authentication errors
  useEffect(() => {
    if (error && error.includes('Token')) {
      console.error('Authentication error in TemplateLibrary:', error);
      // Don't automatically logout, just show error
    }
  }, [error]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplateForm, setNewTemplateForm] = useState({
    name: '',
    description: '',
    category: '',
    content: '',
    placeholders: [] as any[],
    tags: [] as string[]
  });

  useEffect(() => {
    // Only fetch if we have a valid token
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(fetchDocumentTemplates({ 
        search: searchTerm, 
        category: selectedCategory,
        page 
      }));
    }
  }, [dispatch, searchTerm, selectedCategory, page]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handleCategoryChange = (event: any) => {
    setSelectedCategory(event.target.value);
    setPage(1);
  };

  const handleTemplateClick = (template: any) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleEditTemplate = (template: any) => {
    if (onEditTemplate) {
      onEditTemplate(template);
    }
  };

  const handleSelectTemplate = (template: any) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    setShowPreview(false);
  };

  const handleCreateTemplate = () => {
    setNewTemplateForm({
      name: '',
      description: '',
      category: '',
      content: '',
      placeholders: [],
      tags: []
    });
    setShowCreateDialog(true);
  };

  const handleSaveNewTemplate = async () => {
    try {
      await dispatch(createDocumentTemplate(newTemplateForm));
      setShowCreateDialog(false);
      setNewTemplateForm({
        name: '',
        description: '',
        category: '',
        content: '',
        placeholders: [],
        tags: []
      });
      // Refresh templates
      dispatch(fetchDocumentTemplates({ 
        search: searchTerm, 
        category: selectedCategory,
        page 
      }));
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateDialog(false);
    setNewTemplateForm({
      name: '',
      description: '',
      category: '',
      content: '',
      placeholders: [],
      tags: []
    });
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'arztbrief': <Description />,
      'attest': <Description />,
      'befund': <Description />,
      'konsiliarbericht': <Description />,
      'ueberweisung': <Description />,
      'zuweisung': <Description />,
      'rueckueberweisung': <Description />,
      'operationsbericht': <Description />,
      'rezept': <Description />,
      'heilmittelverordnung': <Description />,
      'krankenstandsbestaetigung': <Description />,
      'bildgebende_zuweisung': <Description />,
      'impfbestaetigung': <Description />,
      'patientenaufklaerung': <Description />,
      'therapieplan': <Description />,
      'verlaufsdokumentation': <Description />,
      'pflegebrief': <Description />,
      'kostenuebernahmeantrag': <Description />,
      'gutachten': <Description />
    };
    return iconMap[category] || <Description />;
  };

  const getCategoryLabel = (category: string) => {
    const labelMap: { [key: string]: string } = {
      'arztbrief': 'Arztbrief',
      'attest': 'Attest',
      'befund': 'Befund',
      'konsiliarbericht': 'Konsiliarbericht',
      'ueberweisung': 'Überweisung',
      'zuweisung': 'Zuweisung',
      'rueckueberweisung': 'Rücküberweisung',
      'operationsbericht': 'Operationsbericht',
      'rezept': 'Rezept',
      'heilmittelverordnung': 'Heilmittelverordnung',
      'krankenstandsbestaetigung': 'Krankenstandsbestätigung',
      'bildgebende_zuweisung': 'Bildgebende Zuweisung',
      'impfbestaetigung': 'Impfbestätigung',
      'patientenaufklaerung': 'Patientenaufklärung',
      'therapieplan': 'Therapieplan',
      'verlaufsdokumentation': 'Verlaufsdokumentation',
      'pflegebrief': 'Pflegebrief',
      'kostenuebernahmeantrag': 'Kostenübernahmeantrag',
      'gutachten': 'Gutachten'
    };
    return labelMap[category] || category;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" component="h1">
            Template Library
          </Typography>
          {showActions && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateTemplate}
            >
              Neues Template
            </Button>
          )}
        </Stack>

        {/* Search and Filter */}
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <TextField
            placeholder="Templates durchsuchen..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1 }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Kategorie</InputLabel>
            <Select
              value={selectedCategory}
              onChange={handleCategoryChange}
              label="Kategorie"
            >
              <MenuItem value="">Alle Kategorien</MenuItem>
              <MenuItem value="arztbrief">Arztbrief</MenuItem>
              <MenuItem value="attest">Attest</MenuItem>
              <MenuItem value="befund">Befund</MenuItem>
              <MenuItem value="konsiliarbericht">Konsiliarbericht</MenuItem>
              <MenuItem value="ueberweisung">Überweisung</MenuItem>
              <MenuItem value="zuweisung">Zuweisung</MenuItem>
              <MenuItem value="rueckueberweisung">Rücküberweisung</MenuItem>
              <MenuItem value="operationsbericht">Operationsbericht</MenuItem>
              <MenuItem value="rezept">Rezept</MenuItem>
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
        </Stack>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Templates Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
        {templates.map((template) => (
          <Box key={template._id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 3
                }
              }}
              onClick={() => handleTemplateClick(template)}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  {getCategoryIcon(template.category)}
                  <Typography variant="h6" component="h3" noWrap>
                    {template.name}
                  </Typography>
                </Stack>
                
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ mb: 2, minHeight: 40 }}
                >
                  {template.description || 'Keine Beschreibung verfügbar'}
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                  <Chip
                    label={getCategoryLabel(template.category)}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`v${template.version}`}
                    size="small"
                    variant="outlined"
                  />
                  {template.tags && template.tags.map((tag: string) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>

                <Typography variant="caption" color="text.secondary">
                  Erstellt von: {template.createdBy?.firstName} {template.createdBy?.lastName}
                </Typography>
              </CardContent>

              {showActions && (
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<Preview />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTemplateClick(template);
                    }}
                  >
                    Vorschau
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTemplate(template);
                    }}
                  >
                    Bearbeiten
                  </Button>
                </CardActions>
              )}
            </Card>
          </Box>
        ))}
      </Box>

      {/* Pagination */}
      {templates.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={Math.ceil(templates.length / 12)} // Assuming 12 items per page
            page={page}
            onChange={(event, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            {getCategoryIcon(selectedTemplate?.category)}
            <Typography variant="h6">
              {selectedTemplate?.name}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedTemplate.description}
              </Typography>
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 2, 
                  minHeight: 300,
                  '& .template-placeholder': {
                    backgroundColor: '#ffffcc',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    fontWeight: 'bold'
                  }
                }}
                dangerouslySetInnerHTML={{ 
                  __html: selectedTemplate.content 
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>
            Schließen
          </Button>
          {onSelectTemplate && (
            <Button
              variant="contained"
              onClick={() => handleSelectTemplate(selectedTemplate)}
            >
              Template verwenden
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={handleCancelCreate}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Neues Template erstellen</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Template Name"
              value={newTemplateForm.name}
              onChange={(e) => setNewTemplateForm({ ...newTemplateForm, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Beschreibung"
              value={newTemplateForm.description}
              onChange={(e) => setNewTemplateForm({ ...newTemplateForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth required>
              <InputLabel>Kategorie</InputLabel>
              <Select
                value={newTemplateForm.category}
                onChange={(e) => setNewTemplateForm({ ...newTemplateForm, category: e.target.value })}
                label="Kategorie"
              >
                <MenuItem value="arztbrief">Arztbrief</MenuItem>
                <MenuItem value="attest">Attest</MenuItem>
                <MenuItem value="befund">Befund</MenuItem>
                <MenuItem value="konsiliarbericht">Konsiliarbericht</MenuItem>
                <MenuItem value="ueberweisung">Überweisung</MenuItem>
                <MenuItem value="zuweisung">Zuweisung</MenuItem>
                <MenuItem value="rueckueberweisung">Rücküberweisung</MenuItem>
                <MenuItem value="operationsbericht">Operationsbericht</MenuItem>
                <MenuItem value="rezept">Rezept</MenuItem>
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
            <TextField
              label="Inhalt"
              value={newTemplateForm.content}
              onChange={(e) => setNewTemplateForm({ ...newTemplateForm, content: e.target.value })}
              fullWidth
              multiline
              rows={8}
              placeholder="Geben Sie hier den Template-Inhalt ein. Verwenden Sie {{patient.name}} für Platzhalter."
            />
            <TextField
              label="Tags (durch Komma getrennt)"
              value={newTemplateForm.tags.join(', ')}
              onChange={(e) => setNewTemplateForm({ 
                ...newTemplateForm, 
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
              })}
              fullWidth
              placeholder="z.B. standard, häufig, wichtig"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelCreate}>
            Abbrechen
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveNewTemplate}
            disabled={!newTemplateForm.name || !newTemplateForm.category || !newTemplateForm.content}
          >
            Template erstellen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateLibrary;
