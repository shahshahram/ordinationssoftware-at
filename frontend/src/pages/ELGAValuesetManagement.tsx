import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  LinearProgress,
  Tooltip,
  Tabs,
  Tab,
  Pagination,
  Stack
} from '@mui/material';
import { apiRequest } from '../utils/api';
import {
  Upload,
  Download,
  Edit,
  Delete,
  Refresh,
  Search,
  Add,
  Link as LinkIcon,
  Visibility,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useNavigate } from 'react-router-dom';

interface ValueSet {
  _id: string;
  title: string;
  version: string;
  oid: string;
  url: string;
  description?: string;
  category: string;
  status: string;
  codeCount: number;
  importedAt: string;
  lastUpdated: string;
}

interface Code {
  _id?: string;
  code: string;
  system: string;
  display: string;
  version?: string;
  level?: number;
  orderNumber?: number;
  parentCode?: string;
  type?: string;
  deutsch?: string;
  hinweise?: string;
  concept_beschreibung?: string;
}

interface ValueSetDetail extends ValueSet {
  codes: Code[];
}

interface ValuesetsResponse {
  data: ValueSet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface CategoriesResponse {
  categories: string[];
}

interface ValueSetDetailResponse extends ValueSet {
  codes: Code[];
}

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

const ELGAValuesetManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const [valuesets, setValuesets] = useState<ValueSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  
  // Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Dialogs
  const [tabValue, setTabValue] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Selected valueset
  const [selectedValueset, setSelectedValueset] = useState<ValueSetDetail | null>(null);
  const [selectedValuesetCodes, setSelectedValuesetCodes] = useState<Code[]>([]);
  
  // Import states
  const [importType, setImportType] = useState<'csv' | 'xlsx' | 'url'>('csv');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importProgress, setImportProgress] = useState(0);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadValuesets();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, navigate, page, searchTerm, categoryFilter]);

  const loadValuesets = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(categoryFilter && { category: categoryFilter })
      });
      
      const response = await apiRequest.get<ValuesetsResponse>(`/elga-valuesets?${params}`);
      
      // API wrapper gibt: { data: { success: true, data: [...], pagination: {...} }, success: true }
      // Backend gibt zurück: { success: true, data: [...], pagination: {...} }
      
      let valuesetsData: ValueSet[] = [];
      let paginationData: any = null;
      
      if (response.success && response.data) {
        const responseData = response.data as any;
        
        // Wenn response.data bereits ein Array ist (direkt vom Backend)
        if (Array.isArray(responseData)) {
          valuesetsData = responseData;
        }
        // Wenn doppelt verschachtelt (API wrapper mit success/data wrapper)
        else if (responseData && typeof responseData === 'object' && 'data' in responseData && Array.isArray(responseData.data)) {
          valuesetsData = responseData.data || [];
          paginationData = responseData.pagination;
        }
        // Wenn ValuesetsResponse Format: { data: [...], pagination: {...} }
        else if (responseData && typeof responseData === 'object' && 'data' in responseData) {
          valuesetsData = (responseData.data as ValueSet[]) || [];
          paginationData = responseData.pagination;
        }
        
        // Falls pagination nicht erkannt wurde, versuche sie direkt aus responseData zu holen
        if (!paginationData && responseData && typeof responseData === 'object' && 'pagination' in responseData) {
          paginationData = responseData.pagination;
        }
      }
      
      // Setze State
      setValuesets(valuesetsData);
      setTotal(paginationData?.total || valuesetsData.length || 0);
    } catch (err: any) {
      console.error('Error loading valuesets:', err);
      setError(err.message || 'Fehler beim Laden der Valuesets');
      setValuesets([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiRequest.get<CategoriesResponse>('/elga-valuesets/categories');
      
      if (response.success && response.data) {
        // API wrapper gibt: { data: { success: true, data: { categories: [...] } }, success: true }
        // Backend gibt zurück: { success: true, data: { categories: [...] } }
        const responseData = response.data as any;
        let categoriesArray: string[] = [];
        
        // Prüfe ob doppelt verschachtelt (API wrapper)
        if (responseData && typeof responseData === 'object' && 'data' in responseData) {
          const innerData = responseData.data;
          if (innerData && typeof innerData === 'object' && 'categories' in innerData) {
            categoriesArray = innerData.categories || [];
          }
        } else if (responseData && typeof responseData === 'object' && 'categories' in responseData) {
          // Direkt: { categories: [...] }
          categoriesArray = responseData.categories || [];
        } else if (Array.isArray(responseData)) {
          // Direktes Array
          categoriesArray = responseData;
        }
        
        setCategories(categoriesArray);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Kategorien:', err);
    }
  };

  const loadValuesetDetail = async (id: string, openEditDialog = false) => {
    try {
      const response = await apiRequest.get<ValueSetDetailResponse>(`/elga-valuesets/${id}`);
      
      if (response.success && response.data) {
        // API wrapper gibt: { data: { success: true, data: {...} }, success: true }
        // Oder direkt: { data: {...} }
        let valuesetData: ValueSetDetail | null = null;
        
        const responseData = response.data as any;
        
        // Prüfe ob verschachtelt
        if (responseData && typeof responseData === 'object') {
          if ('data' in responseData && typeof responseData.data === 'object' && ('_id' in responseData.data || 'title' in responseData.data)) {
            // Doppelt verschachtelt: response.data.data
            valuesetData = responseData.data;
          } else if ('_id' in responseData || 'title' in responseData) {
            // Direktes Valueset-Objekt
            valuesetData = responseData;
          }
        }
        
        if (valuesetData) {
          setSelectedValueset(valuesetData);
          setSelectedValuesetCodes(valuesetData.codes || []);
          
          if (openEditDialog) {
            setEditDialogOpen(true);
          } else {
            setDetailDialogOpen(true);
          }
        } else {
          setError('Valueset-Daten konnten nicht geladen werden');
        }
      } else {
        setError(response.message || 'Fehler beim Laden der Details');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Details');
    }
  };

  const handleImport = async () => {
    try {
      setError(null);
      setSuccess(null);
      setImportProgress(0);

      const token = localStorage.getItem('token');
      const formData = new FormData();

      if (importType === 'url') {
        const response = await fetch('http://localhost:5001/api/elga-valuesets/import/url', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: importUrl })
        });
        const data = await response.json();
        
        if (data.success) {
          setSuccess('Import gestartet. Bitte Status prüfen.');
          setImportDialogOpen(false);
          setTimeout(loadValuesets, 2000);
        } else {
          setError(data.message || 'Fehler beim Import');
        }
      } else {
        if (!selectedFile) {
          setError('Bitte wählen Sie eine Datei aus');
          return;
        }

        formData.append('file', selectedFile);
        
        const endpoint = importType === 'csv' 
          ? 'http://localhost:5001/api/elga-valuesets/import/csv'
          : 'http://localhost:5001/api/elga-valuesets/import/xlsx';
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
          setSuccess('Valueset erfolgreich importiert');
          setImportDialogOpen(false);
          setSelectedFile(null);
          setImportUrl('');
          loadValuesets();
        } else {
          setError(data.message || 'Fehler beim Import');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Import');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpdateCode = async (valuesetId: string, codeId: string, updates: Partial<Code>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/elga-valuesets/${valuesetId}/code/${codeId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Code erfolgreich aktualisiert');
        loadValuesetDetail(valuesetId);
        loadValuesets();
      } else {
        setError(data.message || 'Fehler beim Aktualisieren');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Aktualisieren');
    }
  };

  const handleDeleteCode = async (valuesetId: string, codeId: string) => {
    if (!window.confirm('Möchten Sie diesen Code wirklich löschen?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/elga-valuesets/${valuesetId}/code/${codeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Code erfolgreich gelöscht');
        loadValuesetDetail(valuesetId);
        loadValuesets();
      } else {
        setError(data.message || 'Fehler beim Löschen');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Löschen');
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          ELGA Valuesets Verwaltung
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Upload />}
          onClick={() => setImportDialogOpen(true)}
        >
          Import
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: 200 }}>
              <TextField
                fullWidth
                label="Suche"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
                }}
              />
            </Box>
            <Box sx={{ flex: '0 1 200px', minWidth: 150 }}>
              <FormControl fullWidth>
                <InputLabel>Kategorie</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Kategorie"
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <MenuItem value="">Alle</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '0 0 auto' }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadValuesets}
              >
                Aktualisieren
              </Button>
            </Box>
          </Box>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {!loading && valuesets.length === 0 && !error && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Keine Valuesets gefunden. Bitte importieren Sie Valuesets über die Import-Funktion.
            </Alert>
          )}

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Titel</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>OID</TableCell>
                  <TableCell>Kategorie</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Codes</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Lade Valuesets...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : valuesets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Keine Valuesets gefunden
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  valuesets.map((vs) => (
                    <TableRow key={vs._id} hover>
                      <TableCell>{vs.title}</TableCell>
                      <TableCell>{vs.version}</TableCell>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">
                          {vs.oid}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={vs.category || 'other'}
                          size="small"
                          icon={<CategoryIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={vs.status}
                          size="small"
                          color={vs.status === 'active' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{vs.codeCount || 0}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Details anzeigen">
                          <IconButton
                            size="small"
                            onClick={() => loadValuesetDetail(vs._id)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Bearbeiten">
                          <IconButton
                            size="small"
                            onClick={() => {
                              // Lade vollständige Valueset-Details für Bearbeitung
                              loadValuesetDetail(vs._id, true);
                            }}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={Math.ceil(total / limit)}
              page={page}
              onChange={(e, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Valueset Import</DialogTitle>
        <DialogContent>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => {
              setTabValue(newValue);
              if (newValue === 0) setImportType('csv');
              else if (newValue === 1) setImportType('xlsx');
              else if (newValue === 2) setImportType('url');
            }} 
            sx={{ mb: 2 }}
          >
            <Tab label="CSV" />
            <Tab label="XLSX" />
            <Tab label="URL" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <TextField
              fullWidth
              type="file"
              inputProps={{ accept: '.csv' }}
              onChange={handleFileChange}
              helperText="Wählen Sie eine CSV-Datei aus"
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <TextField
              fullWidth
              type="file"
              inputProps={{ accept: '.xlsx,.xls' }}
              onChange={handleFileChange}
              helperText="Wählen Sie eine XLSX-Datei aus"
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <TextField
              fullWidth
              label="URL"
              variant="outlined"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://termgit.elga.gv.at/..."
              helperText="Geben Sie die URL zum Valueset ein"
              InputProps={{
                startAdornment: <LinkIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleImport} variant="contained" color="primary">
            Importieren
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedValueset?.title} ({selectedValueset?.version})
        </DialogTitle>
        <DialogContent>
          {selectedValueset && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>OID:</strong> {selectedValueset.oid}<br />
                <strong>URL:</strong> {selectedValueset.url}<br />
                <strong>Kategorie:</strong> {selectedValueset.category}<br />
                <strong>Status:</strong> {selectedValueset.status}<br />
                <strong>Beschreibung:</strong> {selectedValueset.description || 'Keine Beschreibung'}
              </Typography>
            </Box>
          )}

          <Typography variant="h6" sx={{ mb: 2 }}>
            Codes ({selectedValuesetCodes.length})
          </Typography>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>System</TableCell>
                  <TableCell>Display</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedValuesetCodes.map((code, index) => (
                  <TableRow key={code._id || `${code.code}-${index}` || `code-${index}`}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {code.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{code.system}</TableCell>
                    <TableCell>{code.display}</TableCell>
                    <TableCell>{code.version || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          const newDisplay = prompt('Neuer Display-Name:', code.display);
                          if (newDisplay !== null && newDisplay !== code.display && selectedValueset?._id && code.code) {
                            handleUpdateCode(selectedValueset._id, code.code, { display: newDisplay });
                          }
                        }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          if (selectedValueset?._id && code.code) {
                            handleDeleteCode(selectedValueset._id, code.code);
                          }
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Valueset bearbeiten: {selectedValueset?.title || 'Lädt...'}</DialogTitle>
        <DialogContent dividers>
          {selectedValueset ? (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>OID:</strong> {selectedValueset.oid || 'N/A'}<br />
                  <strong>URL:</strong> {selectedValueset.url ? (
                    <a href={selectedValueset.url} target="_blank" rel="noopener noreferrer">{selectedValueset.url}</a>
                  ) : 'N/A'}<br />
                  <strong>Kategorie:</strong> {selectedValueset.category || 'N/A'}<br />
                  <strong>Status:</strong> {selectedValueset.status || 'N/A'}<br />
                  <strong>Beschreibung:</strong> {selectedValueset.description || 'Keine Beschreibung'}
                </Typography>
              </Box>
              
              <Stack spacing={2} sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Titel"
                  value={selectedValueset.title || ''}
                  onChange={(e) =>
                    setSelectedValueset({ ...selectedValueset, title: e.target.value })
                  }
                />
                <TextField
                  fullWidth
                  label="Version"
                  value={selectedValueset.version || ''}
                  onChange={(e) =>
                    setSelectedValueset({ ...selectedValueset, version: e.target.value })
                  }
                />
                <TextField
                  fullWidth
                  label="Beschreibung"
                  multiline
                  rows={3}
                  value={selectedValueset.description || ''}
                  onChange={(e) =>
                    setSelectedValueset({ ...selectedValueset, description: e.target.value })
                  }
                />
                <FormControl fullWidth>
                  <InputLabel>Kategorie</InputLabel>
                  <Select
                    value={selectedValueset?.category || (categories.length > 0 ? categories[0] : '')}
                    label="Kategorie"
                    onChange={(e) =>
                      selectedValueset && setSelectedValueset({ ...selectedValueset, category: e.target.value })
                    }
                  >
                    {categories.length > 0 ? (
                      categories.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value="">Keine Kategorien</MenuItem>
                    )}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedValueset?.status || 'active'}
                    label="Status"
                    onChange={(e) =>
                      selectedValueset && setSelectedValueset({ ...selectedValueset, status: e.target.value })
                    }
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="deprecated">Deprecated</MenuItem>
                    <MenuItem value="unknown">Unknown</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Codes bearbeiten ({selectedValuesetCodes.length})
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>System</TableCell>
                      <TableCell>Display</TableCell>
                      <TableCell>Version</TableCell>
                      <TableCell align="right">Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedValuesetCodes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Keine Codes vorhanden
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedValuesetCodes.map((code, index) => (
                        <TableRow key={code._id || `${code.code}-${index}` || `code-${index}`}>
                          <TableCell>
                            <Typography variant="caption" fontFamily="monospace">
                              {code.code}
                            </Typography>
                          </TableCell>
                          <TableCell>{code.system || '-'}</TableCell>
                          <TableCell>{code.display || '-'}</TableCell>
                          <TableCell>{code.version || '-'}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => {
                                const newDisplay = prompt('Neuer Display-Name:', code.display || '');
                                if (newDisplay !== null && newDisplay !== code.display && selectedValueset?._id && code.code) {
                                  handleUpdateCode(selectedValueset._id, code.code, { display: newDisplay });
                                }
                              }}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                if (selectedValueset?._id && code.code) {
                                  handleDeleteCode(selectedValueset._id, code.code);
                                }
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Typography>Lädt Valueset-Daten...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!selectedValueset) return;
              
              try {
                const token = localStorage.getItem('token');
                const response = await fetch(
                  `http://localhost:5001/api/elga-valuesets/${selectedValueset._id}`,
                  {
                    method: 'PUT',
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(selectedValueset)
                  }
                );
                
                const data = await response.json();
                
                if (data.success) {
                  setSuccess('Valueset erfolgreich aktualisiert');
                  setEditDialogOpen(false);
                  loadValuesets();
                } else {
                  setError(data.message || 'Fehler beim Aktualisieren');
                }
              } catch (err: any) {
                setError(err.message || 'Fehler beim Aktualisieren');
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

export default ELGAValuesetManagement;

