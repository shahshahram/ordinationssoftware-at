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
  Chip
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import axios from 'axios';

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
      <Typography variant="h4" component="h1" gutterBottom>
        Medikamentenkatalog Import
      </Typography>

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
    </Box>
  );
};

export default MedicationImport;




