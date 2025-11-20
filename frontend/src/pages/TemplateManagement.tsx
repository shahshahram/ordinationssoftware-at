import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Alert
} from '@mui/material';
import {
  Description,
  LibraryBooks,
  History,
  Add
} from '@mui/icons-material';
import TemplateLibrary from '../components/TemplateLibrary';
import DocumentEditor from '../components/DocumentEditor';
import GradientDialogTitle from '../components/GradientDialogTitle';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createDocumentTemplate, updateDocumentTemplate } from '../store/slices/documentTemplateSlice';

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
      id={`template-tabpanel-${index}`}
      aria-labelledby={`template-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TemplateManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(state => state.documentTemplates);
  
  const [tabValue, setTabValue] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    category: '',
    content: '',
    placeholders: [] as any[],
    tags: [] as string[]
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateTemplate = () => {
    setTemplateForm({
      name: '',
      description: '',
      category: '',
      content: '',
      placeholders: [],
      tags: []
    });
    setEditingTemplate(null);
    setShowCreateDialog(true);
  };

  const handleEditTemplate = (template: any) => {
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      category: template.category,
      content: template.content,
      placeholders: template.placeholders || [],
      tags: template.tags || []
    });
    setEditingTemplate(template);
    setShowCreateDialog(true);
  };

  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        await dispatch(updateDocumentTemplate({
          id: editingTemplate._id,
          templateData: templateForm
        }));
      } else {
        await dispatch(createDocumentTemplate(templateForm));
      }
      setShowCreateDialog(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleEditorSave = (content: string, placeholders: any) => {
    setTemplateForm(prev => ({
      ...prev,
      content,
      placeholders: Object.keys(placeholders).map(key => ({
        name: key,
        description: `Platzhalter für ${key}`,
        type: 'text',
        required: false,
        defaultValue: placeholders[key]
      }))
    }));
  };

  const handleEditorPreview = (content: string, placeholders: any) => {
    // Handle preview logic
    console.log('Preview:', { content, placeholders });
  };

  const handleEditorGeneratePDF = async (content: string, placeholders: any) => {
    // Handle PDF generation logic
    console.log('Generate PDF:', { content, placeholders });
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Template Management
        </Typography>

        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="template tabs">
              <Tab 
                icon={<LibraryBooks />} 
                label="Template Library" 
                id="template-tab-0"
                aria-controls="template-tabpanel-0"
              />
              <Tab 
                icon={<Description />} 
                label="Editor" 
                id="template-tab-1"
                aria-controls="template-tabpanel-1"
              />
              <Tab 
                icon={<History />} 
                label="Versionshistorie" 
                id="template-tab-2"
                aria-controls="template-tabpanel-2"
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <TemplateLibrary
              onSelectTemplate={handleEditTemplate}
              onEditTemplate={handleEditTemplate}
              showActions={true}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateTemplate}
              >
                Neues Template erstellen
              </Button>
            </Box>
            <DocumentEditor
              template={editingTemplate}
              onSave={handleEditorSave}
              onPreview={handleEditorPreview}
              onGeneratePDF={handleEditorGeneratePDF}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Versionshistorie
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hier wird die Versionshistorie der Templates angezeigt.
            </Typography>
          </TabPanel>
        </Paper>
      </Box>

      {/* Create/Edit Template Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <GradientDialogTitle
          isEdit={!!editingTemplate}
          title={editingTemplate ? 'Template bearbeiten' : 'Neues Template erstellen'}
          icon={<LibraryBooks />}
          gradientColors={{ from: '#8b5cf6', to: '#6d28d9' }}
        />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Template Name"
              value={templateForm.name}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            
            <TextField
              fullWidth
              label="Beschreibung"
              value={templateForm.description}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={2}
            />
            
            <FormControl fullWidth required>
              <InputLabel>Kategorie</InputLabel>
              <Select
                value={templateForm.category}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value }))}
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
              fullWidth
              label="Tags (kommagetrennt)"
              value={templateForm.tags.join(', ')}
              onChange={(e) => setTemplateForm(prev => ({ 
                ...prev, 
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
              }))}
              placeholder="z.B. Notfall, Routine, Überweisung"
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Template Inhalt:
              </Typography>
              <DocumentEditor
                template={{
                  content: templateForm.content,
                  placeholders: templateForm.placeholders
                }}
                onSave={handleEditorSave}
                onPreview={handleEditorPreview}
                onGeneratePDF={handleEditorGeneratePDF}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSaveTemplate}
            variant="contained"
            disabled={loading || !templateForm.name || !templateForm.category}
          >
            {editingTemplate ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          onClose={() => dispatch({ type: 'documentTemplates/clearError' })}
        >
          {error}
        </Alert>
      )}
    </Container>
  );
};

export default TemplateManagement;
