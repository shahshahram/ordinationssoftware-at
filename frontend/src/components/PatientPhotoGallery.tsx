import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  Stack,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  PhotoCamera,
  Delete,
  Close,
  CloudUpload,
  Assignment,
  Description,
  LocalHospital
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchDekursEntries, DekursEntry } from '../store/slices/dekursSlice';
import api from '../utils/api';

interface PatientPhoto {
  id: string;
  url: string;
  filename: string;
  originalName: string;
  source: 'dekurs' | 'direct' | 'document' | 'other';
  sourceId?: string;
  sourceName?: string;
  uploadedAt: string;
  uploadedBy?: {
    firstName: string;
    lastName: string;
  };
}

interface PatientPhotoGalleryProps {
  patientId: string;
}

const PatientPhotoGallery: React.FC<PatientPhotoGalleryProps> = ({ patientId }) => {
  const dispatch = useAppDispatch();
  const { entries: dekursEntries } = useAppSelector((state) => state.dekurs);
  
  const [photos, setPhotos] = useState<PatientPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<PatientPhoto | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [photoInputRef, setPhotoInputRef] = useState<HTMLInputElement | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuPhoto, setMenuPhoto] = useState<PatientPhoto | null>(null);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Lade Dekurs-Einträge und warte auf das Ergebnis
      const dekursResult = await dispatch(fetchDekursEntries({ patientId, limit: 1000 })).unwrap();
      
      // Sammle alle Fotos aus Dekurs-Einträgen
      const dekursPhotos: PatientPhoto[] = [];
      // Verwende die geladenen Einträge aus dem Result oder aus dem Redux Store
      const entries = dekursResult?.data || dekursEntries || [];
      if (Array.isArray(entries)) {
        entries.forEach((entry: DekursEntry) => {
          if (entry.attachments && entry.attachments.length > 0) {
            entry.attachments.forEach((attachment) => {
              dekursPhotos.push({
                id: `${entry._id}-${attachment.filename}`,
                url: `http://localhost:5001/${attachment.path}`,
                filename: attachment.filename,
                originalName: attachment.originalName,
                source: 'dekurs',
                sourceId: entry._id,
                sourceName: `Dekurs vom ${new Date(entry.entryDate).toLocaleDateString('de-DE')}`,
                uploadedAt: attachment.uploadedAt,
                uploadedBy: entry.createdBy
              });
            });
          }
        });
      }

      // Lade direkt hochgeladene Fotos
      try {
        const response = await api.get(`/patients-extended/${patientId}/photos`);
        // Die API-Klasse wrappt die Antwort, response.data ist das Backend-Response
        const backendResponse = response.data as { success?: boolean; data?: any[]; message?: string };
        if (backendResponse?.success && backendResponse?.data) {
          const directPhotos: PatientPhoto[] = backendResponse.data.map((photo: any) => ({
            id: photo._id || photo.id,
            url: `http://localhost:5001/${photo.path}`,
            filename: photo.filename,
            originalName: photo.originalName,
            source: 'direct',
            uploadedAt: photo.uploadedAt || photo.createdAt,
            uploadedBy: photo.uploadedBy
          }));
          dekursPhotos.push(...directPhotos);
        }
      } catch (err: any) {
        // Route existiert möglicherweise noch nicht, ignorieren
        console.log('Direkte Foto-Route noch nicht verfügbar:', err.message);
      }

      // Sortiere nach Datum (neueste zuerst)
      dekursPhotos.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );

      setPhotos(dekursPhotos);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Fotos');
    } finally {
      setLoading(false);
    }
  }, [patientId, dispatch]);

  // Lade alle Fotos beim Öffnen des Tabs
  useEffect(() => {
    if (patientId) {
      loadPhotos();
    }
  }, [patientId, loadPhotos]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      setError('Nur Bilddateien sind erlaubt');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Datei ist zu groß (max. 10MB)');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('photo', file);
      if (uploadDescription) {
        formData.append('description', uploadDescription);
      }

      // Für FormData wird Content-Type automatisch vom Browser gesetzt
      const response = await api.post(`/patients-extended/${patientId}/photos`, formData);
      // Die API-Klasse wrappt die Antwort, response.data ist das Backend-Response
      const backendResponse = response.data as { success?: boolean; message?: string; data?: any };
      if (backendResponse?.success) {
        setUploadDialogOpen(false);
        setUploadDescription('');
        if (photoInputRef) {
          photoInputRef.value = '';
        }
        await loadPhotos();
      } else {
        throw new Error(backendResponse?.message || 'Fehler beim Hochladen');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Hochladen des Fotos');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photo: PatientPhoto) => {
    if (!window.confirm('Möchten Sie dieses Foto wirklich löschen?')) {
      return;
    }

    try {
      if (photo.source === 'dekurs' && photo.sourceId) {
        // Finde den Dekurs-Eintrag und das Attachment
        const entry = dekursEntries.find((e: DekursEntry) => e._id === photo.sourceId);
        if (entry && entry.attachments) {
          const attachmentIndex = entry.attachments.findIndex(
            (att) => att.filename === photo.filename
          );
          if (attachmentIndex !== -1) {
            await api.delete(`/dekurs/${photo.sourceId}/attachment/${attachmentIndex}`);
          }
        }
      } else if (photo.source === 'direct' && photo.id) {
        await api.delete(`/patients-extended/${patientId}/photos/${photo.id}`);
      }

      await loadPhotos();
      setMenuAnchor(null);
      setMenuPhoto(null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Fehler beim Löschen des Fotos');
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'dekurs':
        return 'Dekurs';
      case 'direct':
        return 'Direkt';
      case 'document':
        return 'Dokument';
      default:
        return 'Sonstiges';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'dekurs':
        return 'warning';
      case 'direct':
        return 'primary';
      case 'document':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Fotos</Typography>
        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Foto hochladen
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {photos.length === 0 ? (
        <Alert severity="info">
          Noch keine Fotos vorhanden. Laden Sie das erste Foto hoch!
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {photos.map((photo) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={photo.id}>
              <Paper
                sx={{
                  p: 1,
                  position: 'relative',
                  '&:hover': {
                    boxShadow: 3
                  }
                }}
              >
                <Box
                  component="img"
                  src={photo.url}
                  alt={photo.originalName}
                  onClick={() => {
                    setSelectedImage(photo);
                    setImagePreviewOpen(true);
                  }}
                  sx={{
                    width: '100%',
                    height: 200,
                    objectFit: 'cover',
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 0.8,
                      transition: 'opacity 0.2s'
                    }
                  }}
                />
                <Box sx={{ mt: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Chip
                      label={getSourceLabel(photo.source)}
                      size="small"
                      color={getSourceColor(photo.source) as any}
                      icon={photo.source === 'dekurs' ? <Assignment /> : <PhotoCamera />}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuAnchor(e.currentTarget);
                        setMenuPhoto(photo);
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </Stack>
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }} noWrap>
                    {photo.originalName}
                  </Typography>
                  {photo.sourceName && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {photo.sourceName}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" display="block">
                    {new Date(photo.uploadedAt).toLocaleDateString('de-DE')}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => {
          setUploadDialogOpen(false);
          setUploadDescription('');
          if (photoInputRef) {
            photoInputRef.value = '';
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Foto hochladen</Typography>
            <IconButton
              onClick={() => {
                setUploadDialogOpen(false);
                setUploadDescription('');
                if (photoInputRef) {
                  photoInputRef.value = '';
                }
              }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
              ref={(input) => setPhotoInputRef(input)}
              id="patient-photo-upload"
            />
            <label htmlFor="patient-photo-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<PhotoCamera />}
                disabled={uploading}
                fullWidth
              >
                {uploading ? <CircularProgress size={20} /> : 'Foto auswählen'}
              </Button>
            </label>
            <TextField
              fullWidth
              label="Beschreibung (optional)"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              multiline
              rows={3}
              placeholder="Optionale Beschreibung für das Foto..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setUploadDialogOpen(false);
              setUploadDescription('');
              if (photoInputRef) {
                photoInputRef.value = '';
              }
            }}
          >
            Abbrechen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bild-Vorschau Dialog */}
      <Dialog
        open={imagePreviewOpen}
        onClose={() => {
          setImagePreviewOpen(false);
          setSelectedImage(null);
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.9)',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'transparent', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ color: 'white' }}>
              {selectedImage?.originalName}
            </Typography>
            {selectedImage?.sourceName && (
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 0.5 }}>
                {selectedImage.sourceName}
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={() => {
              setImagePreviewOpen(false);
              setSelectedImage(null);
            }}
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'transparent', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
          {selectedImage && (
            <Box
              component="img"
              src={selectedImage.url}
              alt={selectedImage.originalName}
              sx={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: 1
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => {
          setMenuAnchor(null);
          setMenuPhoto(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuPhoto) {
              handleDeletePhoto(menuPhoto);
            }
          }}
        >
          <Delete sx={{ mr: 1 }} />
          Foto löschen
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default PatientPhotoGallery;

