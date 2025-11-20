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
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  Upload,
  Download,
  PlayArrow,
  Pause,
  Delete,
  Refresh,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useNavigate } from 'react-router-dom';

interface CatalogYear {
  year: number;
  totalCodes: number;
  activeCodes: number;
  billableCodes: number;
  chapters: string[];
  firstImport: string;
  lastUpdate: string;
  chapterBreakdown: Array<{
    _id: string;
    count: number;
    billable: number;
  }>;
}

const ICD10CatalogManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const [catalogYears, setCatalogYears] = useState<number[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<{ [year: number]: CatalogYear }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [importDialog, setImportDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [validateOnly, setValidateOnly] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadCatalogYears();
  }, [isAdmin, navigate]);

  const loadCatalogYears = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/icd10-catalog/years', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setCatalogYears(data.data);
        // Load status for each year
        for (const year of data.data) {
          await loadCatalogStatus(year);
        }
      }
    } catch (error) {
      setError('Fehler beim Laden der Katalog-Jahre');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogStatus = async (year: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/icd10-catalog/status/${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setCatalogStatus(prev => ({
          ...prev,
          [year]: data.data
        }));
      }
    } catch (error) {
      console.error(`Error loading status for year ${year}:`, error);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Bitte wählen Sie eine CSV-Datei aus');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setImportProgress(0);

      const formData = new FormData();
      formData.append('catalogFile', selectedFile);
      formData.append('year', selectedYear.toString());
      formData.append('replaceExisting', replaceExisting.toString());
      formData.append('validateOnly', validateOnly.toString());

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/icd10-catalog/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setImportResults(data.data);
        setSuccess(`Import erfolgreich: ${data.data.imported} Codes importiert`);
        if (!validateOnly) {
          await loadCatalogYears();
        }
      } else {
        setError(data.message || 'Import fehlgeschlagen');
      }
    } catch (error) {
      setError('Fehler beim Import');
    } finally {
      setLoading(false);
      setImportDialog(false);
    }
  };

  const handleActivate = async (year: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/icd10-catalog/activate/${year}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Katalog für Jahr ${year} aktiviert`);
        await loadCatalogStatus(year);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Fehler beim Aktivieren');
    }
  };

  const handleDeactivate = async (year: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/icd10-catalog/deactivate/${year}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Katalog für Jahr ${year} deaktiviert`);
        await loadCatalogStatus(year);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Fehler beim Deaktivieren');
    }
  };

  const handleDelete = async (year: number) => {
    if (!window.confirm(`Katalog für Jahr ${year} wirklich löschen?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/icd10-catalog/${year}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Katalog für Jahr ${year} gelöscht`);
        await loadCatalogYears();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Fehler beim Löschen');
    }
  };

  const handleExport = async (year: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/icd10-catalog/export/${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `icd10-katalog-${year}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccess(`Katalog für Jahr ${year} exportiert`);
      } else {
        const data = await response.json();
        setError(data.message);
      }
    } catch (error) {
      setError('Fehler beim Export');
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Sie haben keine Berechtigung für diese Seite.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        ICD-10 Katalog-Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Verwalten Sie ICD-10 Kataloge für verschiedene Jahre
      </Typography>

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

      {/* Action Buttons */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={() => setImportDialog(true)}
              disabled={loading}
            >
              Katalog importieren
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadCatalogYears}
              disabled={loading}
            >
              Aktualisieren
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Catalog Years Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Verfügbare Kataloge
          </Typography>
          
          {loading && <LinearProgress sx={{ mb: 2 }} />}

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Jahr</TableCell>
                  <TableCell align="right">Gesamt Codes</TableCell>
                  <TableCell align="right">Aktiv</TableCell>
                  <TableCell align="right">Abrechenbar</TableCell>
                  <TableCell align="right">Kapitel</TableCell>
                  <TableCell>Letzte Aktualisierung</TableCell>
                  <TableCell align="center">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {catalogYears.map((year) => {
                  const status = catalogStatus[year];
                  return (
                    <TableRow key={year}>
                      <TableCell>
                        <Typography variant="h6">{year}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {status?.totalCodes || 0}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={status?.activeCodes || 0}
                          color={status?.activeCodes > 0 ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {status?.billableCodes || 0}
                      </TableCell>
                      <TableCell align="right">
                        {status?.chapters?.length || 0}
                      </TableCell>
                      <TableCell>
                        {status?.lastUpdate ? 
                          new Date(status.lastUpdate).toLocaleDateString('de-DE') : 
                          '-'
                        }
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="Exportieren">
                            <IconButton
                              size="small"
                              onClick={() => handleExport(year)}
                              disabled={loading}
                            >
                              <Download />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Aktivieren">
                            <IconButton
                              size="small"
                              onClick={() => handleActivate(year)}
                              disabled={loading}
                            >
                              <PlayArrow />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Deaktivieren">
                            <IconButton
                              size="small"
                              onClick={() => handleDeactivate(year)}
                              disabled={loading}
                            >
                              <Pause />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Löschen">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(year)}
                              disabled={loading}
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>ICD-10 Katalog importieren</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Jahr</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                label="Jahr"
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="file"
              inputProps={{ accept: '.csv' }}
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                setSelectedFile(target.files?.[0] || null);
              }}
              helperText="CSV-Datei mit ICD-10 Codes (Format: Code;Titel;Langtitel;Kapitel;Abrechenbar;ParentCode;Synonyme)"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                />
              }
              label="Bestehende Einträge ersetzen"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={validateOnly}
                  onChange={(e) => setValidateOnly(e.target.checked)}
                />
              }
              label="Nur validieren (kein Import)"
            />

            {importResults && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>Import-Ergebnisse:</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography>Verarbeitet: {importResults.processed}</Typography>
                    <Typography>Importiert: {importResults.imported}</Typography>
                    <Typography>Aktualisiert: {importResults.updated}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography color="error">Fehler: {importResults.errors?.length || 0}</Typography>
                    <Typography color="warning.main">Warnungen: {importResults.warnings?.length || 0}</Typography>
                  </Box>
                </Box>
                
                {importResults.errors && importResults.errors.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="error">Fehler:</Typography>
                    {importResults.errors.slice(0, 5).map((error: string, index: number) => (
                      <Typography key={index} variant="body2" color="error">
                        {error}
                      </Typography>
                    ))}
                    {importResults.errors.length > 5 && (
                      <Typography variant="body2" color="text.secondary">
                        ... und {importResults.errors.length - 5} weitere
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)}>Abbrechen</Button>
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={!selectedFile || loading}
          >
            {validateOnly ? 'Validieren' : 'Importieren'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ICD10CatalogManagement;
