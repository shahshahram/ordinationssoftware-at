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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Category,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSnackbar } from 'notistack';

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
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await api.get('/service-categories');
      if (response.success) {
        setCategories(Array.isArray(response.data) ? response.data : []);
      }
      const treeResponse = await api.get('/service-categories', { tree: true });
      if (treeResponse.success) {
        setCategoryTree(Array.isArray(treeResponse.data) ? treeResponse.data : []);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Kategorien', { variant: 'error' });
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Service-Kategorien</Typography>
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
    </Box>
  );
};

export default ServiceCategories;

