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
  Category as CategoryIcon,
  HelpOutline
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useNavigate } from 'react-router-dom';
import GradientDialogTitle from '../components/GradientDialogTitle';

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
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" component="h1">
            ELGA Valuesets Verwaltung
          </Typography>
          <Tooltip title="Hilfe & Leitfaden">
            <IconButton
              onClick={() => setHelpDialogOpen(true)}
              color="primary"
            >
              <HelpOutline />
            </IconButton>
          </Tooltip>
        </Box>
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
          title="Leitfaden: ELGA Valuesets" 
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs value={helpTab} onChange={(_, v) => setHelpTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Übersicht" />
            <Tab label="Import" />
            <Tab label="Verwaltung" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Was sind ELGA Valuesets?
                </Typography>
                <Typography variant="body1" paragraph>
                  ELGA Valuesets sind standardisierte Code-Sammlungen, die von ELGA verwendet werden, 
                  um medizinische Daten zu klassifizieren und zu strukturieren. Sie enthalten Codes 
                  für Dokumentenklassen, Typen, Formate und andere medizinische Terminologien.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptkomponenten
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Titel:</strong> Name des Valuesets</li>
                  <li><strong>Version:</strong> Versionsnummer des Valuesets</li>
                  <li><strong>OID (Object Identifier):</strong> Eindeutige Identifikation</li>
                  <li><strong>URL:</strong> URL zum Valueset-Definition</li>
                  <li><strong>Kategorie:</strong> Kategorisierung (z.B. "classcode", "typecode", "formatcode")</li>
                  <li><strong>Status:</strong> Aktiv/Inaktiv</li>
                  <li><strong>Codes:</strong> Liste aller Codes im Valueset</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Verwendung
                </Typography>
                <Typography variant="body2" paragraph>
                  Valuesets werden verwendet für:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📋 Klassifizierung von Dokumenten (Class Codes)</li>
                  <li>📄 Dokumententypen (Type Codes)</li>
                  <li>📎 Dokumentformate (Format Codes)</li>
                  <li>🏥 Medizinische Terminologien (LOINC, SNOMED-CT, ICD-10)</li>
                  <li>💊 Medikamenten-Codes</li>
                  <li>🔬 Laborwerte und Befunde</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Vorteile
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Standardisierung:</strong> Einheitliche Codes für medizinische Daten</li>
                  <li>✅ <strong>ELGA-Kompatibilität:</strong> Korrekte Codes für ELGA-Übermittlung</li>
                  <li>✅ <strong>Interoperabilität:</strong> Austausch zwischen verschiedenen Systemen</li>
                  <li>✅ <strong>Vollständigkeit:</strong> Alle benötigten Codes an einem Ort</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Import-Funktion
                </Typography>
                <Typography variant="body2" paragraph>
                  Sie können Valuesets auf drei verschiedene Arten importieren:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  1. CSV-Import
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Import"</li>
                  <li>Wählen Sie "CSV" als Import-Typ</li>
                  <li>Wählen Sie eine CSV-Datei aus</li>
                  <li>Die Datei muss folgende Spalten enthalten:
                    <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                      <li><code>code</code> - Der Code-Wert</li>
                      <li><code>system</code> - Das Code-System (z.B. "http://loinc.org")</li>
                      <li><code>display</code> - Die Anzeige-Bezeichnung</li>
                      <li><code>version</code> - Optional: Versionsnummer</li>
                    </Box>
                  </li>
                  <li>Klicken Sie auf "Importieren"</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  2. XLSX-Import
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Import"</li>
                  <li>Wählen Sie "XLSX" als Import-Typ</li>
                  <li>Wählen Sie eine Excel-Datei aus</li>
                  <li>Die Datei muss die gleichen Spalten wie CSV haben</li>
                  <li>Klicken Sie auf "Importieren"</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  3. URL-Import
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Import"</li>
                  <li>Wählen Sie "URL" als Import-Typ</li>
                  <li>Geben Sie die URL zum Valueset ein (z.B. von termgit.elga.gv.at)</li>
                  <li>Klicken Sie auf "Importieren"</li>
                  <li>Das System lädt das Valueset automatisch von der URL</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  CSV/XLSX Format-Beispiel
                </Typography>
                <Box 
                  sx={{ 
                    bgcolor: 'background.paper',
                    border: 2,
                    borderColor: 'primary.main',
                    p: 3,
                    borderRadius: 2,
                    fontFamily: 'monospace',
                    fontSize: '0.95rem',
                    overflow: 'auto',
                    maxHeight: '300px',
                    boxShadow: 2,
                    position: 'relative'
                  }}
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      position: 'absolute',
                      top: 8,
                      right: 12,
                      bgcolor: 'primary.main',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.7rem',
                      fontWeight: 'bold'
                    }}
                  >
                    CSV/XLSX
                  </Typography>
                  <pre style={{ 
                    margin: 0,
                    color: '#1976d2',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>{`code,system,display,version
11534-6,http://loinc.org,Progress Note,2.75
34117-2,http://loinc.org,History and Physical Note,2.75
51848-0,http://loinc.org,Evaluation and Management Note,2.75`}</pre>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  💡 Tipp: Die erste Zeile sollte die Spaltenüberschriften enthalten.
                </Typography>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Hinweis:</strong> Wenn ein Valueset mit derselben URL bereits existiert, 
                  wird es aktualisiert statt neu erstellt.
                </Typography>
              </Alert>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Valuesets verwalten
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Suche und Filter
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Textsuche:</strong> Durchsuchen Sie Valuesets nach Titel, OID oder Beschreibung</li>
                  <li><strong>Kategoriefilter:</strong> Filtern Sie nach Kategorie (z.B. "classcode", "typecode")</li>
                  <li><strong>Aktualisieren:</strong> Laden Sie die Liste neu, um aktuelle Daten zu erhalten</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Details anzeigen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf das Auge-Icon bei einem Valueset</li>
                  <li>Ein Dialog zeigt alle Codes im Valueset an</li>
                  <li>Sie sehen Code, System, Display-Name und Version</li>
                  <li>Bei hierarchischen Valuesets sehen Sie auch Level und Parent-Codes</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Codes bearbeiten
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf das Stift-Icon bei einem Valueset</li>
                  <li>Der Bearbeitungsdialog öffnet sich</li>
                  <li>Sie können Codes hinzufügen, ändern oder löschen</li>
                  <li>Speichern Sie die Änderungen</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Codes löschen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Öffnen Sie den Bearbeitungsdialog</li>
                  <li>Klicken Sie auf das Löschen-Icon bei einem Code</li>
                  <li>Bestätigen Sie die Löschung</li>
                  <li>Der Code wird aus dem Valueset entfernt</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Pagination
                </Typography>
                <Typography variant="body2" paragraph>
                  Bei vielen Valuesets können Sie durch die Seiten navigieren:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Verwenden Sie die Pagination am unteren Rand der Tabelle</li>
                  <li>Standard: 20 Valuesets pro Seite</li>
                  <li>Sie können zwischen den Seiten wechseln</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices & Tipps
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Import
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Verwenden Sie offizielle ELGA-Valuesets</strong> von termgit.elga.gv.at</li>
                  <li>✅ <strong>Prüfen Sie die Dateistruktur</strong> vor dem Import</li>
                  <li>✅ <strong>Testen Sie den Import</strong> mit einer kleinen Datei zuerst</li>
                  <li>✅ <strong>URL-Import</strong> ist am einfachsten für offizielle Valuesets</li>
                  <li>❌ Vermeiden Sie manuelle Änderungen an offiziellen Valuesets</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Verwaltung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Regelmäßig aktualisieren:</strong> Valuesets können sich ändern</li>
                  <li>✅ <strong>Kategorien verwenden:</strong> Organisieren Sie Valuesets nach Kategorien</li>
                  <li>✅ <strong>Status prüfen:</strong> Nur aktive Valuesets werden verwendet</li>
                  <li>✅ <strong>Codes dokumentieren:</strong> Fügen Sie Beschreibungen hinzu, wenn möglich</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Wichtige Valuesets
                </Typography>
                <Typography variant="body2" paragraph>
                  Diese Valuesets sind besonders wichtig für ELGA:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Dokumentenklassen (Class Codes):</strong> Für die Klassifizierung von Dokumenten</li>
                  <li><strong>Dokumententypen (Type Codes):</strong> Für spezifische Dokumententypen (LOINC)</li>
                  <li><strong>Format Codes:</strong> Für Dokumentformate (CDA, PDF, etc.)</li>
                  <li><strong>ICD-10:</strong> Für Diagnosen</li>
                  <li><strong>LOINC:</strong> Für Laborwerte und Befunde</li>
                </Box>
              </Box>

              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Tipp:</strong> Importieren Sie zuerst die wichtigsten Valuesets (Class Codes, Type Codes) 
                  und erweitern Sie die Sammlung schrittweise.
                </Typography>
              </Alert>
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

export default ELGAValuesetManagement;

