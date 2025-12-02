import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  LinearProgress
} from '@mui/material';
import { Close, CloudUpload, Description } from '@mui/icons-material';
import api from '../utils/api';

interface DicomUploadProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  onUploadSuccess?: () => void;
}

const DicomUpload: React.FC<DicomUploadProps> = ({
  open,
  onClose,
  patientId,
  onUploadSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Prüfe Dateityp
      if (!file.name.endsWith('.dcm') && 
          !file.name.endsWith('.dicom') && 
          file.type !== 'application/dicom' &&
          file.type !== '') {
        setError('Bitte wählen Sie eine DICOM-Datei (.dcm) aus');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !patientId) {
      setError('Bitte wählen Sie eine DICOM-Datei aus');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('dicomFile', selectedFile);
      formData.append('patientId', patientId);

      // Für FormData wird Content-Type automatisch vom Browser gesetzt
      // onUploadProgress wird von fetch nicht unterstützt, daher simulieren wir den Fortschritt
      setUploadProgress(50); // Simuliere 50% beim Start
      
      const response = await api.post('/dicom/upload', formData);
      
      setUploadProgress(100); // Simuliere 100% nach Abschluss

      const responseData = response.data as any;
      if (responseData.success) {
        setSuccess(true);
        setSelectedFile(null);
        
        // Zeige Warnungen an, falls vorhanden
        if (responseData.warnings && Array.isArray(responseData.warnings)) {
          setWarnings(responseData.warnings);
        } else {
          setWarnings([]);
        }
        
        // Reset file input
        const fileInput = document.getElementById('dicom-file-input') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }

        if (onUploadSuccess) {
          onUploadSuccess();
        }

        // Schließe Dialog nach kurzer Verzögerung (nur wenn keine Warnungen)
        if (!responseData.warnings || responseData.warnings.length === 0) {
          setTimeout(() => {
            handleClose();
          }, 2000);
        }
      }
    } catch (err: any) {
      console.error('Fehler beim Hochladen der DICOM-Datei:', err);
      console.error('Fehlerdetails:', {
        message: err.message,
        status: err.status,
        response: err.response,
        errorData: err.response?.data,
        name: err.name
      });
      
      // Extrahiere Fehlerdaten aus der Response (falls vorhanden)
      const errorData = err.response?.data || {};
      
      // Erstelle detaillierte Fehlermeldung
      let errorMessage = errorData.message || err.message || 'Fehler beim Hochladen der DICOM-Datei';
      
      // Bei Netzwerkfehlern (keine Response) füge zusätzliche Info hinzu
      if (!err.response && err.message) {
        if (err.name === 'AbortError' || err.message.includes('aborted')) {
          errorMessage = 'Upload wurde abgebrochen oder hat zu lange gedauert. Bitte versuchen Sie es erneut.';
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Netzwerkfehler: Verbindung zum Server konnte nicht hergestellt werden. Bitte überprüfen Sie Ihre Internetverbindung.';
        }
      }
      
      // Füge technische Details hinzu, falls vorhanden
      if (errorData.error) {
        errorMessage += `\n\nTechnischer Fehler: ${errorData.error}`;
      }
      
      // Füge Validierungsfehler hinzu
      if (errorData.details) {
        if (Array.isArray(errorData.details)) {
          errorMessage += `\n\nValidierungsfehler:\n${errorData.details.map((d: string) => `  • ${d}`).join('\n')}`;
        } else if (typeof errorData.details === 'string') {
          errorMessage += `\n\n${errorData.details}`;
        }
      }
      
      // Füge fehlende Felder hinzu
      if (errorData.missingFields && Array.isArray(errorData.missingFields)) {
        errorMessage += `\n\nFehlende oder ungültige Felder:\n${errorData.missingFields.map((f: string) => `  • ${f}`).join('\n')}`;
      }
      
      // Füge fehlende DICOM-Tags hinzu
      if (errorData.missingTags && Array.isArray(errorData.missingTags)) {
        errorMessage += `\n\nFehlende DICOM-Tags in der Datei:\n${errorData.missingTags.map((t: string) => `  • ${t}`).join('\n')}`;
      }
      
      // Füge Erklärung hinzu
      if (errorData.explanation) {
        errorMessage += `\n\n${errorData.explanation}`;
      }
      
      // Füge Stack-Trace in Development-Modus hinzu
      if (errorData.stack && process.env.NODE_ENV === 'development') {
        errorMessage += `\n\nStack-Trace:\n${errorData.stack}`;
      }
      
      // Falls keine spezifischen Details vorhanden sind, füge HTTP-Status hinzu
      if (!errorData.error && !errorData.details && !errorData.missingFields && !errorData.missingTags) {
        if (err.status) {
          errorMessage += `\n\nHTTP-Status: ${err.status}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
    setWarnings([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">DICOM-Datei hochladen</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                {error}
              </Typography>
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              DICOM-Datei erfolgreich hochgeladen!
              {warnings.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    Warnungen:
                  </Typography>
                  <Typography variant="body2" component="ul" sx={{ margin: 0, paddingLeft: 2 }}>
                    {warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </Typography>
                </Box>
              )}
            </Alert>
          )}

          <Box
            sx={{
              border: '2px dashed',
              borderColor: selectedFile ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              backgroundColor: selectedFile ? 'action.selected' : 'background.paper',
              cursor: 'pointer',
              transition: 'all 0.3s',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover'
              }
            }}
            onClick={() => document.getElementById('dicom-file-input')?.click()}
          >
            <input
              id="dicom-file-input"
              type="file"
              accept=".dcm,.dicom,application/dicom"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            {selectedFile ? (
              <Box>
                <Description sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {selectedFile.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </Box>
            ) : (
              <Box>
                <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Klicken Sie hier, um eine DICOM-Datei auszuwählen
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  oder ziehen Sie die Datei hierher
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Unterstützte Formate: .dcm, .dicom
                </Typography>
              </Box>
            )}
          </Box>

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                {uploadProgress}% hochgeladen...
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Abbrechen
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!selectedFile || uploading}
          startIcon={uploading ? <CircularProgress size={16} /> : <CloudUpload />}
        >
          {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DicomUpload;

