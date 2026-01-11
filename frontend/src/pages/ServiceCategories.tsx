import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  Paper,
  TableHead,
  TableRow,
  TablePagination,
  Snackbar,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Category,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';
import GradientDialogTitle from '../components/GradientDialogTitle';

interface ServiceCategory {
  _id?: string;
  name: string;
  code: string;
  parent_category_id?: string;
  parent_category?: { name: string; code: string };
  color_hex?: string;
  is_active: boolean;
  level?: number;
  sort_order?: number;
  visible_to_roles?: string[];
  description?: string;
}

const ServiceCategories: React.FC = () => {
  const { marginTopValue } = useGlobalNavigationOffset();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryTree, setCategoryTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServiceCategory>({
    name: '',
    code: '',
    parent_category_id: undefined,
    color_hex: '#1976d2',
    is_active: true,
    sort_order: 0,
    visible_to_roles: [],
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      // Lade alle Kategorien (auch inaktive) für die Verwaltungsseite
      const response = await api.get<any>('/service-categories?includeInactive=true');
      console.log('📋 ServiceCategories - API Response:', response);
      
      if (response.success && response.data) {
        // API gibt { success: true, data: [...] } zurück
        // api.ts wrapper gibt { data: { success: true, data: [...] }, success: true } zurück
        const responseData = response.data as any;
        const categoriesData = Array.isArray(responseData) 
          ? responseData 
          : (responseData.data || []);
        
        console.log('📋 ServiceCategories - Parsed categories:', categoriesData);
        console.log('📋 ServiceCategories - Categories count:', categoriesData.length);
        setCategories(categoriesData);
      } else {
        console.warn('📋 ServiceCategories - No categories in response:', response);
        setCategories([]);
      }
      
      const treeResponse = await api.get<any>('/service-categories?tree=true');
      if (treeResponse.success && treeResponse.data) {
        const treeResponseData = treeResponse.data as any;
        const treeData = Array.isArray(treeResponseData) 
          ? treeResponseData 
          : (treeResponseData.data || []);
        console.log('📋 ServiceCategories - Parsed tree:', treeData);
        setCategoryTree(treeData);
      } else {
        setCategoryTree([]);
      }
    } catch (error: any) {
      console.error('📋 ServiceCategories - Error loading categories:', error);
      enqueueSnackbar('Fehler beim Laden der Kategorien', { variant: 'error' });
      setCategories([]);
      setCategoryTree([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: ServiceCategory) => {
    if (item) {
      setEditingId(item._id || null);
      setFormData({
        ...item,
        parent_category_id: item.parent_category_id || undefined,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        code: '',
        parent_category_id: undefined,
        color_hex: '#1976d2',
        is_active: true,
        sort_order: 0,
        visible_to_roles: [],
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await api.put(`/service-categories/${editingId}`, formData);
        enqueueSnackbar('Kategorie erfolgreich aktualisiert', { variant: 'success' });
      } else {
        await api.post('/service-categories', formData);
        enqueueSnackbar('Kategorie erfolgreich erstellt', { variant: 'success' });
      }
      handleCloseDialog();
      loadCategories();
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Fehler beim Speichern', { variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Möchten Sie diese Kategorie wirklich löschen?')) return;

    try {
      await api.delete(`/service-categories/${id}`);
      enqueueSnackbar('Kategorie erfolgreich gelöscht', { variant: 'success' });
      loadCategories();
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Löschen', { variant: 'error' });
    }
  };

  const renderTree = (nodes: any[], level: number = 0): React.ReactNode => {
    return nodes.map((node) => (
      <React.Fragment key={node._id}>
        <ListItem sx={{ pl: level * 4 }}>
          <ListItemIcon>
            <Chip
              label={node.code}
              size="small"
              sx={{ bgcolor: node.color_hex || '#1976d2', color: 'white' }}
            />
          </ListItemIcon>
          <ListItemText
            primary={node.name}
            secondary={!node.is_active ? 'Inaktiv' : undefined}
          />
        </ListItem>
        {node.children && node.children.length > 0 && (
          <Box sx={{ pl: 4 }}>
            {renderTree(node.children, level + 1)}
          </Box>
        )}
      </React.Fragment>
    ));
  };

  return (
    <Box sx={{ 
      p: 3,
      mt: marginTopValue !== '0px' ? marginTopValue : 0,
      transition: marginTopValue !== '0px' ? 'margin-top 0.3s ease' : 'none',
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">Service-Kategorien</Typography>
          <Tooltip title="Hilfe & Leitfaden">
            <IconButton
              onClick={() => setHelpDialogOpen(true)}
              color="primary"
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={viewMode === 'list' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('list')}
          >
            Liste
          </Button>
          <Button
            variant={viewMode === 'tree' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('tree')}
          >
            Baum
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadCategories}
            disabled={loading}
          >
            Aktualisieren
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Neue Kategorie
          </Button>
        </Box>
      </Box>

      {loading && <CircularProgress sx={{ mb: 2 }} />}

      {viewMode === 'list' ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Parent</TableCell>
                <TableCell>Farbe</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item) => (
                <TableRow key={item._id}>
                  <TableCell>
                    <Chip
                      label={item.code}
                      size="small"
                      sx={{ bgcolor: item.color_hex || '#1976d2', color: 'white' }}
                    />
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    {item.parent_category?.name || '—'}
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        bgcolor: item.color_hex || '#1976d2',
                        borderRadius: 1,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.is_active ? 'Aktiv' : 'Inaktiv'}
                      color={item.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog(item)}>
                      <Edit />
                    </IconButton>
                    <IconButton size="small" onClick={() => item._id && handleDelete(item._id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={categories.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </TableContainer>
      ) : (
        <Card>
          <CardContent>
            <List>
              {renderTree(categoryTree)}
            </List>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingId ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Name"
                fullWidth
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Code"
                fullWidth
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <Autocomplete
                options={categories.filter(c => c._id !== editingId)}
                getOptionLabel={(option) => `${option.code} - ${option.name}`}
                value={categories.find(c => c._id === formData.parent_category_id) || null}
                onChange={(_, newValue) =>
                  setFormData({ ...formData, parent_category_id: newValue?._id || undefined })
                }
                renderInput={(params) => (
                  <TextField {...params} label="Parent-Kategorie (optional)" />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Farbe (Hex)"
                type="color"
                fullWidth
                value={formData.color_hex || '#1976d2'}
                onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Sortierreihenfolge"
                type="number"
                fullWidth
                value={formData.sort_order || 0}
                onChange={(e) =>
                  setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                }
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Beschreibung"
                fullWidth
                multiline
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSave} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hilfe & Leitfaden Dialog */}
      <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <GradientDialogTitle 
          title="Hilfe & Leitfaden: Service-Kategorien"
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom color="primary">
                Service-Kategorien
              </Typography>
              <Typography variant="body2" paragraph>
                Service-Kategorien helfen dabei, Leistungen zu organisieren und zu gruppieren. 
                Sie können hierarchische Kategorien erstellen (Hauptkategorien und Unterkategorien).
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                Kategorie erstellen
              </Typography>
              <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                <li>Klicken Sie auf <strong>"+ Neue Kategorie"</strong></li>
                <li>Geben Sie einen <strong>Namen</strong> ein (z.B. "Konsultationen")</li>
                <li>Geben Sie einen <strong>Code</strong> ein (z.B. "KONS")</li>
                <li>Wählen Sie eine <strong>übergeordnete Kategorie</strong> (optional, für Hierarchien)</li>
                <li>Wählen Sie eine <strong>Farbe</strong> für die Darstellung</li>
                <li>Geben Sie eine <strong>Sortierreihenfolge</strong> ein</li>
                <li>Wählen Sie <strong>sichtbar für Rollen</strong> (optional)</li>
                <li>Klicken Sie auf <strong>"Speichern"</strong></li>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                Hierarchische Kategorien
              </Typography>
              <Typography variant="body2" paragraph>
                Erstellen Sie Haupt- und Unterkategorien für bessere Organisation:
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                <li>Erstellen Sie zuerst die <strong>Hauptkategorie</strong></li>
                <li>Erstellen Sie dann die <strong>Unterkategorien</strong></li>
                <li>Wählen Sie bei den Unterkategorien die Hauptkategorie als <strong>"Übergeordnete Kategorie"</strong></li>
              </Box>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Beispiel:</strong> Hauptkategorie "Konsultationen" mit Unterkategorien 
                  "Allgemeine Konsultation", "Spezialkonsultation", "Notfallkonsultation"
                </Typography>
              </Alert>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                Ansichten
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                <li><strong>Listenansicht:</strong> Zeigt alle Kategorien in einer flachen Liste - gut für Suche und Filterung</li>
                <li><strong>Baumansicht:</strong> Zeigt Kategorien hierarchisch - gut für Übersicht über Kategorienstruktur</li>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                Kategorie für bestimmte Rollen sichtbar machen
              </Typography>
              <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                <li>Kategorie bearbeiten</li>
                <li><strong>"Sichtbar für Rollen"</strong> auswählen</li>
                <li>Gewünschte Rollen auswählen (z.B. nur "Arzt")</li>
                <li>Speichern</li>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                Kategorien sortieren
              </Typography>
              <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                <li>Kategorie bearbeiten</li>
                <li><strong>"Sortierreihenfolge"</strong> anpassen (niedrigere Zahl = weiter oben)</li>
                <li>Speichern</li>
              </Box>
            </Box>

            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Tipp:</strong> Verwenden Sie hierarchische Kategorien für bessere Organisation. 
                Nutzen Sie Farben zur visuellen Unterscheidung.
              </Typography>
            </Alert>
          </Box>
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

export default ServiceCategories;

