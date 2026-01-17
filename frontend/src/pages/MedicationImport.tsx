import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, CheckCircle as CheckCircleIcon, HelpOutline as HelpOutlineIcon } from '@mui/icons-material';
import axios from 'axios';
import GradientDialogTitle from '../components/GradientDialogTitle';

const MedicationImport: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setSnackbar({ open: true, message: 'Bitte wählen Sie eine Datei aus', severity: 'error' });
      return;
    }

    setUploading(true);
    setProgress(0);
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/medications/import`,
        formData,
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setProgress(percentCompleted);
            }
          }
        }
      );

      setResult(response.data.data);
      setSnackbar({ open: true, message: response.data.message, severity: 'success' });

    } catch (error: any) {
      console.error('Import-Fehler:', error);
      setSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Import fehlgeschlagen',
        severity: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 0 }}>
          Medikamentenkatalog Import
        </Typography>
        <Tooltip title="Hilfe & Leitfaden">
          <IconButton
            onClick={() => setHelpDialogOpen(true)}
            color="primary"
            size="small"
          >
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            CSV-Datei hochladen
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Laden Sie eine CSV-Datei mit Medikamentendaten hoch. Die Datei sollte im Format des österreichischen
            Arzneimittelregisters (ASP-Register) vorliegen.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              disabled={uploading}
            >
              Datei auswählen
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </Button>

            {selectedFile && (
              <Typography variant="body2" color="textSecondary">
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </Typography>
            )}
          </Box>

          {uploading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                Import läuft... {progress}%
              </Typography>
            </Box>
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={handleImport}
            disabled={!selectedFile || uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {uploading ? 'Importiere...' : 'Import starten'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Import-Ergebnis
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
              <Chip
                label={`Verarbeitet: ${result.totalProcessed}`}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`Importiert: ${result.imported}`}
                color="success"
              />
              {result.errors > 0 && (
                <Chip
                  label={`Fehler: ${result.errors}`}
                  color="error"
                />
              )}
              <Chip
                label={`Gesamt im Katalog: ${result.totalMedications}`}
                color="info"
                variant="outlined"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Hinweis:</strong> Der Import kann einige Minuten dauern, da die CSV-Datei 70.000+
          Medikamente enthalten kann. Bitte haben Sie Geduld.
        </Typography>
      </Alert>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Hilfe & Leitfaden Dialog */}
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
          title="Hilfe & Leitfaden: Medikamentenkatalog Import"
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs 
            value={helpTab} 
            onChange={(_, v) => setHelpTab(v)} 
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Übersicht" />
            <Tab label="Datei importieren" />
            <Tab label="Dateiformat" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Medikamentenkatalog Import
                </Typography>
                <Typography variant="body1" paragraph>
                  Der Medikamentenkatalog Import ermöglicht es, Medikamente aus CSV-Dateien zu importieren.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📤 <strong>Datei hochladen:</strong> CSV-Datei mit Medikamenten hochladen</li>
                  <li>📊 <strong>Import:</strong> Medikamente in den Katalog importieren</li>
                  <li>✅ <strong>Validierung:</strong> Daten werden vor dem Import geprüft</li>
                  <li>📋 <strong>Ergebnis:</strong> Import-Ergebnis anzeigen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Datei importieren
                </Typography>
                <Typography variant="body2" paragraph>
                  So importieren Sie eine Medikamenten-Datei:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt Anleitung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Datei auswählen"</li>
                  <li>Wählen Sie eine CSV-Datei aus</li>
                  <li>Klicken Sie auf "Importieren"</li>
                  <li>Warten Sie auf den Import-Vorgang</li>
                  <li>Prüfen Sie das Import-Ergebnis</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Dateiformat
                </Typography>
                <Typography variant="body2" paragraph>
                  Die CSV-Datei muss folgendes Format haben:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Erforderliche Spalten
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📝 <strong>Name:</strong> Medikamentenname</li>
                  <li>🔢 <strong>Code:</strong> Medikamentencode</li>
                  <li>💊 <strong>Dosierung:</strong> Dosierungsinformationen</li>
                  <li>📋 <strong>Kategorie:</strong> Medikamentenkategorie</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Import-Verwaltung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Prüfen Sie die Datei vor dem Import</li>
                  <li>✅ Verwenden Sie das korrekte Dateiformat</li>
                  <li>✅ Sichern Sie Daten vor dem Import</li>
                  <li>✅ Dokumentieren Sie Import-Änderungen</li>
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

export default MedicationImport;




