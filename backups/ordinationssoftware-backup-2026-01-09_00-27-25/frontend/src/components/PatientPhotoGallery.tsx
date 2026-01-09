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
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Checkbox
} from '@mui/material';
import {
  PhotoCamera,
  Delete,
  Close,
  CloudUpload,
  Assignment,
  Scanner,
  CameraAlt,
  FlipCameraIos,
  CheckCircle,
  Cancel,
  ExpandMore,
  Folder,
  UnfoldMore,
  UnfoldLess,
  DriveFileMove
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchDekursEntries, DekursEntry, DekursAttachment } from '../store/slices/dekursSlice';
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
  folderName?: string; // Ordner-Name für Gruppierung
}

interface PatientPhotoGalleryProps {
  patientId: string;
}

const PatientPhotoGallery: React.FC<PatientPhotoGalleryProps> = ({ patientId }) => {
  const dispatch = useAppDispatch();
  const { entries: dekursEntries } = useAppSelector((state) => state.dekurs);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMobileDevice = isMobile || isTablet;
  
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
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [scanMode, setScanMode] = useState<'camera' | 'file'>('camera'); // 'camera' für Mobile, 'file' für Desktop/Scanner
  const [scanFileInputRef, setScanFileInputRef] = useState<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [folderName, setFolderName] = useState<string>(''); // Benutzerdefinierter Ordnername
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]); // IDs der ausgewählten Fotos
  const [moveToFolderDialogOpen, setMoveToFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [existingFolders, setExistingFolders] = useState<string[]>([]);

  // Lade alle Fotos beim Öffnen des Tabs
  useEffect(() => {
    const loadPhotos = async () => {
      if (!patientId) {
        setLoading(false);
        setPhotos([]);
        return;
      }
      
    setLoading(true);
    setError(null);
    try {
      // Sammle alle Fotos aus Dekurs-Einträgen
      const dekursPhotos: PatientPhoto[] = [];
        
        // Lade Dekurs-Einträge und warte auf das Ergebnis
        try {
          const dekursResult = await dispatch(fetchDekursEntries({ patientId, limit: 1000 })).unwrap();
          // Verwende nur die geladenen Einträge aus dem Result, nicht aus dem Redux Store
          // um Endlosschleifen zu vermeiden
          const entries = dekursResult?.data || [];
      if (Array.isArray(entries)) {
        entries.forEach((entry: DekursEntry) => {
            try {
          if (entry.attachments && entry.attachments.length > 0) {
                entry.attachments.forEach((attachment: DekursAttachment) => {
                  try {
              dekursPhotos.push({
                id: `${entry._id}-${attachment.filename}`,
                url: `http://localhost:5001/${attachment.path}`,
                filename: attachment.filename,
                originalName: attachment.originalName,
                source: 'dekurs',
                sourceId: entry._id,
                      sourceName: `Dekurs vom ${entry.entryDate ? new Date(entry.entryDate).toLocaleDateString('de-DE') : 'Unbekannt'}`,
                      uploadedAt: attachment.uploadedAt || entry.entryDate || new Date().toISOString(),
                      uploadedBy: entry.createdBy,
                      folderName: attachment.folderName
                    });
                  } catch (attachError) {
                    console.warn('Fehler beim Verarbeiten eines Attachments:', attachError);
                  }
                });
              }
            } catch (entryError) {
              console.warn('Fehler beim Verarbeiten eines Dekurs-Eintrags:', entryError);
            }
          });
        }
      } catch (dekursError: any) {
        console.warn('Fehler beim Laden der Dekurs-Einträge:', dekursError);
        // Weiter mit direkt hochgeladenen Fotos
      }

      // Lade direkt hochgeladene Fotos
      try {
        const response = await api.get(`/patients-extended/${patientId}/photos`);
        // Die API-Klasse wrappt die Antwort, response.data ist das Backend-Response
        const backendResponse = response.data as { success?: boolean; data?: any[]; message?: string };
        if (backendResponse?.success && backendResponse?.data && Array.isArray(backendResponse.data)) {
          const directPhotos: PatientPhoto[] = backendResponse.data
            .map((photo: any): PatientPhoto | null => {
              try {
            // Der Pfad sollte relativ zu uploads sein (z.B. "patient-photos/68fbf91109f619287f04a78f/scan-2025-11-24_14-53-59/file.jpg")
            const photoPath = photo.path || photo.filename;
            
            // Konstruiere URL: Der Pfad ist relativ zu uploads, also einfach /uploads/ + path
            let photoUrl: string;
                if (photoPath && photoPath.startsWith('uploads/')) {
              // Bereits vollständiger Pfad mit uploads/
              photoUrl = `http://localhost:5001/${photoPath}`;
                } else if (photoPath && (photoPath.startsWith('/') || photoPath.startsWith('C:') || photoPath.startsWith('D:'))) {
              // Absoluter Pfad (alte Einträge) - extrahiere relativen Teil
              const uploadsIndex = photoPath.indexOf('uploads');
              if (uploadsIndex !== -1) {
                const relativePath = photoPath.substring(uploadsIndex);
                photoUrl = `http://localhost:5001/${relativePath.replace(/\\/g, '/')}`;
              } else {
                // Fallback: verwende filename
                    photoUrl = `http://localhost:5001/uploads/patient-photos/${photo.filename || 'unknown.jpg'}`;
              }
                } else if (photoPath) {
              // Relativer Pfad (neue Einträge) - path beginnt mit "patient-photos/"
              // Normalisiere den Pfad (entferne doppelte Slashes, normalisiere Backslashes)
              const normalizedPath = photoPath.replace(/\\/g, '/').replace(/\/+/g, '/');
              photoUrl = `http://localhost:5001/uploads/${normalizedPath}`;
                } else {
                  // Fallback: verwende filename
                  photoUrl = `http://localhost:5001/uploads/patient-photos/${photo.filename || 'unknown.jpg'}`;
            }
            
            // Verwende folderName aus der API-Antwort, falls vorhanden
            // Fallback: Extrahiere Ordnernamen aus filename (z.B. "68fbf91109f619287f04a78f/scan-2025-11-24_15-22-17/file.png")
            let folderName = photo.folderName;
            if (!folderName && photo.filename) {
              const folderMatch = photo.filename.match(/scan-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}(?:_(.+))?/);
              folderName = folderMatch ? folderMatch[0] : undefined;
            }
            
            return {
                  id: photo._id || photo.id || `photo-${Date.now()}-${Math.random()}`,
              url: photoUrl,
                  filename: photo.filename || 'unknown.jpg',
                  originalName: photo.originalName || photo.filename || 'unknown.jpg',
              source: 'direct',
                  uploadedAt: photo.uploadedAt || photo.createdAt || new Date().toISOString(),
              uploadedBy: photo.uploadedBy,
              folderName: folderName
            };
              } catch (photoError) {
                console.warn('Fehler beim Verarbeiten eines Fotos:', photoError);
                return null;
              }
            })
            .filter((photo): photo is PatientPhoto => photo !== null);
          dekursPhotos.push(...directPhotos);
        }
      } catch (err: any) {
        // Route existiert möglicherweise noch nicht, ignorieren
        console.log('Direkte Foto-Route noch nicht verfügbar:', err.message);
      }

      // Sortiere nach Datum (neueste zuerst)
      dekursPhotos.sort((a, b) => {
        try {
          const dateA = new Date(a.uploadedAt).getTime();
          const dateB = new Date(b.uploadedAt).getTime();
          return dateB - dateA;
        } catch {
          return 0;
        }
      });

      setPhotos(dekursPhotos);
    } catch (err: any) {
        console.error('Fehler beim Laden der Fotos:', err);
      setError(err.message || 'Fehler beim Laden der Fotos');
        setPhotos([]); // Setze leeres Array im Fehlerfall
    } finally {
      setLoading(false);
    }
    };

    if (patientId) {
      loadPhotos();
    } else {
      setLoading(false);
      setPhotos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]); // Nur patientId als Dependency - dispatch ist stabil und dekursEntries würde Endlosschleife verursachen

  // Wrapper-Funktion für manuelle Aufrufe (z.B. nach Upload)
  const loadPhotos = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      setPhotos([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Sammle alle Fotos aus Dekurs-Einträgen
      const dekursPhotos: PatientPhoto[] = [];
      
      // Lade Dekurs-Einträge und warte auf das Ergebnis
      try {
        const dekursResult = await dispatch(fetchDekursEntries({ patientId, limit: 1000 })).unwrap();
        // Verwende nur die geladenen Einträge aus dem Result, nicht aus dem Redux Store
        // um Endlosschleifen zu vermeiden
        const entries = dekursResult?.data || [];
        if (Array.isArray(entries)) {
          entries.forEach((entry: DekursEntry) => {
            try {
              if (entry.attachments && entry.attachments.length > 0) {
                entry.attachments.forEach((attachment: DekursAttachment) => {
                  try {
                    dekursPhotos.push({
                      id: `${entry._id}-${attachment.filename}`,
                      url: `http://localhost:5001/${attachment.path}`,
                      filename: attachment.filename,
                      originalName: attachment.originalName,
                      source: 'dekurs',
                      sourceId: entry._id,
                      sourceName: `Dekurs vom ${entry.entryDate ? new Date(entry.entryDate).toLocaleDateString('de-DE') : 'Unbekannt'}`,
                      uploadedAt: attachment.uploadedAt || entry.entryDate || new Date().toISOString(),
                      uploadedBy: entry.createdBy,
                      folderName: attachment.folderName
                    });
                  } catch (attachError) {
                    console.warn('Fehler beim Verarbeiten eines Attachments:', attachError);
                  }
                });
              }
            } catch (entryError) {
              console.warn('Fehler beim Verarbeiten eines Dekurs-Eintrags:', entryError);
            }
          });
        }
      } catch (dekursError: any) {
        console.warn('Fehler beim Laden der Dekurs-Einträge:', dekursError);
        // Weiter mit direkt hochgeladenen Fotos
      }

      // Lade direkt hochgeladene Fotos
      try {
        const response = await api.get(`/patients-extended/${patientId}/photos`);
        // Die API-Klasse wrappt die Antwort, response.data ist das Backend-Response
        const backendResponse = response.data as { success?: boolean; data?: any[]; message?: string };
        if (backendResponse?.success && backendResponse?.data && Array.isArray(backendResponse.data)) {
          const directPhotos: PatientPhoto[] = backendResponse.data
            .map((photo: any): PatientPhoto | null => {
              try {
                // Der Pfad sollte relativ zu uploads sein (z.B. "patient-photos/68fbf91109f619287f04a78f/scan-2025-11-24_14-53-59/file.jpg")
                const photoPath = photo.path || photo.filename;
                
                // Konstruiere URL: Der Pfad ist relativ zu uploads, also einfach /uploads/ + path
                let photoUrl: string;
                if (photoPath && photoPath.startsWith('uploads/')) {
                  // Bereits vollständiger Pfad mit uploads/
                  photoUrl = `http://localhost:5001/${photoPath}`;
                } else if (photoPath && (photoPath.startsWith('/') || photoPath.startsWith('C:') || photoPath.startsWith('D:'))) {
                  // Absoluter Pfad (alte Einträge) - extrahiere relativen Teil
                  const uploadsIndex = photoPath.indexOf('uploads');
                  if (uploadsIndex !== -1) {
                    const relativePath = photoPath.substring(uploadsIndex);
                    photoUrl = `http://localhost:5001/${relativePath.replace(/\\/g, '/')}`;
                  } else {
                    // Fallback: verwende filename
                    photoUrl = `http://localhost:5001/uploads/patient-photos/${photo.filename || 'unknown.jpg'}`;
                  }
                } else if (photoPath) {
                  // Relativer Pfad (neue Einträge) - path beginnt mit "patient-photos/"
                  // Normalisiere den Pfad (entferne doppelte Slashes, normalisiere Backslashes)
                  const normalizedPath = photoPath.replace(/\\/g, '/').replace(/\/+/g, '/');
                  photoUrl = `http://localhost:5001/uploads/${normalizedPath}`;
                } else {
                  // Fallback: verwende filename
                  photoUrl = `http://localhost:5001/uploads/patient-photos/${photo.filename || 'unknown.jpg'}`;
                }
                
                // Verwende folderName aus der API-Antwort, falls vorhanden
                // Fallback: Extrahiere Ordnernamen aus filename (z.B. "68fbf91109f619287f04a78f/scan-2025-11-24_15-22-17/file.png")
                let folderName = photo.folderName;
                if (!folderName && photo.filename) {
                  const folderMatch = photo.filename.match(/scan-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}(?:_(.+))?/);
                  folderName = folderMatch ? folderMatch[0] : undefined;
                }
                
                return {
                  id: photo._id || photo.id || `photo-${Date.now()}-${Math.random()}`,
                  url: photoUrl,
                  filename: photo.filename || 'unknown.jpg',
                  originalName: photo.originalName || photo.filename || 'unknown.jpg',
                  source: 'direct',
                  uploadedAt: photo.uploadedAt || photo.createdAt || new Date().toISOString(),
                  uploadedBy: photo.uploadedBy,
                  folderName: folderName
                };
              } catch (photoError) {
                console.warn('Fehler beim Verarbeiten eines Fotos:', photoError);
                return null;
              }
            })
            .filter((photo): photo is PatientPhoto => photo !== null);
          dekursPhotos.push(...directPhotos);
        }
      } catch (err: any) {
        // Route existiert möglicherweise noch nicht, ignorieren
        console.log('Direkte Foto-Route noch nicht verfügbar:', err.message);
      }

      // Sortiere nach Datum (neueste zuerst)
      dekursPhotos.sort((a, b) => {
        try {
          const dateA = new Date(a.uploadedAt).getTime();
          const dateB = new Date(b.uploadedAt).getTime();
          return dateB - dateA;
        } catch {
          return 0;
        }
      });

      setPhotos(dekursPhotos);
    } catch (err: any) {
      console.error('Fehler beim Laden der Fotos:', err);
      setError(err.message || 'Fehler beim Laden der Fotos');
      setPhotos([]); // Setze leeres Array im Fehlerfall
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]); // Nur patientId als Dependency - dispatch ist stabil und dekursEntries würde Endlosschleife verursachen

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
      if (folderName) {
        formData.append('folderName', folderName);
      }

      // Für FormData wird Content-Type automatisch vom Browser gesetzt
      const response = await api.post(`/patients-extended/${patientId}/photos`, formData);
      // Die API-Klasse wrappt die Antwort, response.data ist das Backend-Response
      const backendResponse = response.data as { success?: boolean; message?: string; data?: any };
      if (backendResponse?.success) {
        setUploadDialogOpen(false);
        setUploadDescription('');
        setFolderName('');
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

  const handleMovePhotosToFolder = async () => {
    if (selectedPhotos.length === 0) return;
    
    // Prüfe, ob ein Ordner ausgewählt wurde
    if (!newFolderName.trim()) {
      setError('Bitte wählen Sie einen bestehenden Ordner aus oder geben Sie einen neuen Ordnernamen ein.');
      return;
    }

    const targetFolder = newFolderName.trim();
    if (!targetFolder) {
      setError('Bitte geben Sie einen Ordnernamen ein.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await api.put(`/patients-extended/${patientId}/photos/move-to-folder`, {
        photoIds: selectedPhotos,
        folderName: targetFolder
      });

      // Erfolg - Fotos wurden verschoben
      setError(null);
      setMoveToFolderDialogOpen(false);
      setSelectedPhotos([]);
      setNewFolderName('');
      await loadPhotos();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Fehler beim Verschieben der Fotos';
      setError(errorMessage);
      console.error('Fehler beim Verschieben der Fotos:', err);
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

  // Kamera-Funktionen
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef) {
      videoRef.srcObject = null;
      // Warte kurz, bevor srcObject auf null gesetzt wird, um play()-Fehler zu vermeiden
      videoRef.pause();
    }
  }, [stream, videoRef]);

  const startCamera = useCallback(async () => {
    // Stoppe zuerst den alten Stream, falls vorhanden
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      setError(
        error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError'
          ? 'Kamera-Zugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen.'
          : error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError'
          ? 'Keine Kamera gefunden. Bitte stellen Sie sicher, dass eine Kamera angeschlossen ist.'
          : 'Fehler beim Zugriff auf die Kamera. Bitte versuchen Sie es erneut.'
      );
    }
  }, [facingMode, stream]);

  const toggleCamera = useCallback(async () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    // Warte kurz, bevor die neue Kamera gestartet wird
    setTimeout(() => {
      startCamera();
    }, 100);
  }, [stopCamera, startCamera]);

  const captureImage = useCallback(() => {
    if (!videoRef || !stream) return;

    const canvas = document.createElement('canvas');
    const video = videoRef;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Spiegele das Bild, wenn Front-Kamera verwendet wird
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);
    stopCamera();
  }, [videoRef, stream, facingMode, stopCamera]);

  const handleSaveScannedImage = useCallback(async () => {
    // Wenn Dateien ausgewählt sind (Scanner-Modus), lade diese hoch
    if (selectedFiles.length > 0) {
      setUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('photos', file); // 'photos' (Plural) für Mehrfachauswahl
        });
        if (uploadDescription) {
          formData.append('description', uploadDescription);
        }

        const apiResponse = await api.post(`/patients-extended/${patientId}/photos/batch`, formData);
        const backendResponse = apiResponse.data as { success?: boolean; message?: string; data?: any };
        
        if (backendResponse?.success) {
          setScanDialogOpen(false);
          setCapturedImage(null);
          setSelectedFiles([]);
          setFilePreviews([]);
          setUploadDescription('');
          setFolderName('');
          if (scanFileInputRef) {
            scanFileInputRef.value = '';
          }
          await loadPhotos();
        } else {
          throw new Error(backendResponse?.message || 'Fehler beim Hochladen');
        }
      } catch (err: any) {
        setError(err.message || 'Fehler beim Speichern der gescannten Dateien');
      } finally {
        setUploading(false);
      }
      return;
    }

    // Wenn capturedImage vorhanden ist (Kamera-Modus), lade dieses hoch
    if (!capturedImage) return;

    setUploading(true);
    setError(null);

    try {
      // Konvertiere Data URL zu Blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('photo', file);
      if (uploadDescription) {
        formData.append('description', uploadDescription);
      }
      if (folderName) {
        formData.append('folderName', folderName);
      }

      const apiResponse = await api.post(`/patients-extended/${patientId}/photos`, formData);
      const backendResponse = apiResponse.data as { success?: boolean; message?: string; data?: any };
      
      if (backendResponse?.success) {
        setScanDialogOpen(false);
        setCapturedImage(null);
        setUploadDescription('');
        setFolderName('');
        await loadPhotos();
      } else {
        throw new Error(backendResponse?.message || 'Fehler beim Hochladen');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern des gescannten Bildes');
    } finally {
      setUploading(false);
    }
  }, [capturedImage, selectedFiles, uploadDescription, folderName, patientId, loadPhotos, scanFileInputRef]);

  // Aktualisiere Video-Element, wenn Stream sich ändert
  useEffect(() => {
    if (!videoRef || !stream) return;

    // Stoppe vorheriges Video, falls vorhanden
    if (videoRef.srcObject) {
      const oldStream = videoRef.srcObject as MediaStream;
      oldStream.getTracks().forEach(track => track.stop());
      videoRef.pause();
      videoRef.srcObject = null;
    }

    // Setze neuen Stream und starte Wiedergabe
    videoRef.srcObject = stream;
    
    // Warte kurz, bevor play() aufgerufen wird, um sicherzustellen, dass srcObject gesetzt ist
    const playPromise = videoRef.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Wiedergabe erfolgreich gestartet
        })
        .catch((err) => {
          // Fehler wird ignoriert, da dies normal sein kann (z.B. wenn Dialog geschlossen wird)
          if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
            console.error('Error playing video:', err);
          }
        });
    }
  }, [stream, videoRef]);

  // Handler für Datei-Upload im Scan-Modus (Mehrfachauswahl)
  const handleScanFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validiere alle Dateien
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    const invalidFiles = fileArray.filter(file => !validTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      setError(`Nur Bilddateien (JPEG, PNG, GIF, WebP) oder PDF-Dateien sind erlaubt. ${invalidFiles.length} Datei(en) ungültig.`);
      return;
    }

    const oversizedFiles = fileArray.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError(`${oversizedFiles.length} Datei(en) ist/sind zu groß (max. 10MB pro Datei)`);
      return;
    }

    // Setze ausgewählte Dateien
    setSelectedFiles(fileArray);
    setError(null);

    // Erstelle Vorschau für Bilddateien
    const previews: string[] = [];
    const previewPromises = fileArray.map((file) => {
      return new Promise<void>((resolve) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            previews.push(result);
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(file);
        } else {
          // Für PDF-Dateien: kein Vorschau, aber Platzhalter
          previews.push('');
          resolve();
        }
      });
    });

    await Promise.all(previewPromises);
    setFilePreviews(previews);
  }, []);

  // Starte Kamera, wenn Scan-Dialog geöffnet wird und Kamera-Modus aktiv ist
  useEffect(() => {
    if (scanDialogOpen && !capturedImage && scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [scanDialogOpen, capturedImage, scanMode, startCamera, stopCamera]);

  // Setze initialen Scan-Modus basierend auf Gerätetyp
  useEffect(() => {
    if (scanDialogOpen) {
      setScanMode(isMobileDevice ? 'camera' : 'file');
    }
  }, [scanDialogOpen, isMobileDevice]);

  // Validierung nach ALLEN Hooks
  if (!patientId) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          Keine Patient-ID gefunden. Bitte wählen Sie einen Patienten aus.
        </Alert>
      </Box>
    );
  }

  // Stelle sicher, dass photos immer ein Array ist
  const safePhotos = Array.isArray(photos) ? photos : [];

  // Einfacher Fallback-Render bei Fehlern
  try {
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
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {selectedPhotos.length > 0 && (
            <>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<DriveFileMove />}
                onClick={() => {
                  // Sammle alle bestehenden Ordnernamen
                  const folders = safePhotos
                    .filter(p => p && p.folderName)
                    .map(p => p.folderName!)
                    .filter((v, i, a) => a.indexOf(v) === i);
                  setExistingFolders(folders);
                  setMoveToFolderDialogOpen(true);
                }}
              >
                {selectedPhotos.length} Foto(s) in Ordner verschieben
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => setSelectedPhotos([])}
              >
                Auswahl aufheben
              </Button>
            </>
          )}
          <Button
            variant="outlined"
            startIcon={<Scanner />}
            onClick={() => setScanDialogOpen(true)}
          >
            Scannen
          </Button>
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Foto hochladen
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {safePhotos && safePhotos.length > 0 && (() => {
        // Prüfe, ob es gruppierte Fotos gibt
        const hasGroupedPhotos = safePhotos.some((p: PatientPhoto) => p && p.folderName);
        if (!hasGroupedPhotos) return null;
        
        const folderNames = safePhotos
          .filter(p => p && p.folderName)
          .map(p => p.folderName!)
          .filter((v, i, a) => a.indexOf(v) === i);
        
        const allFoldersExpanded = folderNames.length > 0 && folderNames.every(folder => expandedFolders[folder] === true);
        const allFoldersCollapsed = folderNames.length === 0 || folderNames.every(folder => expandedFolders[folder] === false);
        
        return (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<UnfoldMore />}
              onClick={() => {
                const newExpanded: Record<string, boolean> = {};
                folderNames.forEach(folder => {
                  newExpanded[folder] = true;
                });
                setExpandedFolders(newExpanded);
              }}
              disabled={allFoldersExpanded}
            >
              Alle öffnen
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<UnfoldLess />}
              onClick={() => {
                const newExpanded: Record<string, boolean> = {};
                folderNames.forEach(folder => {
                  newExpanded[folder] = false;
                });
                setExpandedFolders(newExpanded);
              }}
              disabled={allFoldersCollapsed}
            >
              Alle schließen
            </Button>
          </Stack>
        );
      })()}

      {!safePhotos || safePhotos.length === 0 ? (
        <Alert severity="info">
          Noch keine Fotos vorhanden. Laden Sie das erste Foto hoch!
        </Alert>
      ) : (
        <Box>
          {(() => {
            try {
            // Gruppiere Fotos nach Ordnern
            const groupedPhotos: Record<string, PatientPhoto[]> = {};
            const ungroupedPhotos: PatientPhoto[] = [];
            
              if (Array.isArray(safePhotos)) {
                safePhotos.forEach((photo: PatientPhoto) => {
                  if (!photo) return;
                  try {
              if (photo.folderName) {
                if (!groupedPhotos[photo.folderName]) {
                  groupedPhotos[photo.folderName] = [];
                }
                groupedPhotos[photo.folderName].push(photo);
              } else {
                ungroupedPhotos.push(photo);
                    }
                  } catch (photoError) {
                    console.warn('Fehler beim Verarbeiten eines Fotos:', photoError);
              }
            });
              }
            
            // Sortiere Ordner nach Datum (neueste zuerst)
            const sortedFolders = Object.keys(groupedPhotos).sort((a, b) => {
                try {
                  const dateA = groupedPhotos[a]?.[0]?.uploadedAt || '';
                  const dateB = groupedPhotos[b]?.[0]?.uploadedAt || '';
              return new Date(dateB).getTime() - new Date(dateA).getTime();
                } catch {
                  return 0;
                }
              });
              
              const renderPhotoGrid = (photoList: PatientPhoto[]) => {
                if (!photoList || !Array.isArray(photoList) || photoList.length === 0) {
                  return null;
                }
                return (
              <Grid container spacing={2}>
                    {photoList.map((photo: PatientPhoto) => {
                      if (!photo || !photo.id) return null;
                  const isSelected = selectedPhotos.includes(photo.id);
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={photo.id}>
                    <Paper
                      sx={{
                        p: 1,
                        position: 'relative',
                        border: isSelected ? 2 : 0,
                        borderColor: 'primary.main',
                        '&:hover': {
                          boxShadow: 3
                        }
                      }}
                    >
                      <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}>
                        <Checkbox
                          checked={isSelected}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              setSelectedPhotos(prev => [...prev, photo.id]);
                            } else {
                              setSelectedPhotos(prev => prev.filter(id => id !== photo.id));
                            }
                          }}
                          sx={{ 
                            color: 'white',
                            '&.Mui-checked': {
                              color: 'primary.main'
                            },
                            bgcolor: isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.5)',
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.7)'
                            }
                          }}
                        />
                      </Box>
                      <Box
                        component="img"
                        src={photo.url}
                        alt={photo.originalName}
                        onClick={() => {
                          if (!isSelected) {
                            setSelectedImage(photo);
                            setImagePreviewOpen(true);
                          }
                        }}
                        onError={(e) => {
                          console.error('❌ Image load error:', {
                            url: photo.url,
                            photoPath: photo.filename,
                            error: e
                          });
                        }}
                        onLoad={() => {
                          console.log('✅ Image loaded successfully:', photo.url);
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
                  );
                })}
              </Grid>
            );
              };
            
            return (
              <Stack spacing={3}>
                {/* Gruppierte Fotos nach Ordnern */}
                  {sortedFolders.map((folderName: string) => {
                    try {
                  const folderPhotos = groupedPhotos[folderName];
                      if (!folderPhotos || folderPhotos.length === 0) return null;
                      
                  // Parse Ordnername zu lesbarem Datum
                  const folderMatch = folderName.match(/scan-(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
                  let folderDate = folderName;
                  if (folderMatch) {
                    const [, year, month, day, hour, minute] = folderMatch;
                    folderDate = `${day}.${month}.${year} ${hour}:${minute}`;
                  }
                  
                  const isExpanded = expandedFolders[folderName] !== undefined 
                    ? expandedFolders[folderName] 
                    : true; // Standardmäßig geöffnet
                  
                  return (
                    <Accordion 
                      key={folderName}
                      expanded={isExpanded}
                      onChange={(_, expanded) => {
                        setExpandedFolders(prev => ({
                          ...prev,
                          [folderName]: expanded
                        }));
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                          <Folder color="primary" />
                          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                            {folderDate}
                          </Typography>
                          <Chip 
                            label={`${folderPhotos.length} Foto${folderPhotos.length !== 1 ? 's' : ''}`} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Divider sx={{ mb: 2 }} />
                        {renderPhotoGrid(folderPhotos)}
                      </AccordionDetails>
                    </Accordion>
                  );
                    } catch (folderError) {
                      console.warn('Fehler beim Rendern eines Ordners:', folderError);
                      return null;
                    }
                })}
                
                {/* Ungruppierte Fotos (z.B. Dekurs-Fotos ohne Ordner) */}
                {ungroupedPhotos.length > 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Weitere Fotos
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {renderPhotoGrid(ungroupedPhotos)}
                  </Box>
                )}
              </Stack>
            );
            } catch (renderError) {
              console.error('Fehler beim Rendern der Foto-Galerie:', renderError);
              return (
                <Alert severity="error">
                  Fehler beim Anzeigen der Fotos. Bitte versuchen Sie es erneut.
                </Alert>
              );
            }
          })()}
        </Box>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => {
          setUploadDialogOpen(false);
          setUploadDescription('');
          setFolderName('');
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
              label="Ordnername (optional)"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="z.B. Befund, Röntgen, etc."
              helperText="Der Ordnername wird dem Datum/Uhrzeit hinzugefügt"
            />
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
            <Box component="span" sx={{ color: 'white', fontSize: '1.25rem', fontWeight: 500, display: 'block' }}>
              {selectedImage?.originalName}
            </Box>
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

      {/* Scan Dialog */}
      <Dialog
        open={scanDialogOpen}
        onClose={() => {
          stopCamera();
          setScanDialogOpen(false);
          setCapturedImage(null);
          setScanMode(isMobileDevice ? 'camera' : 'file');
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: scanMode === 'camera' ? 'rgba(0, 0, 0, 0.95)' : 'background.paper',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'transparent', 
          color: scanMode === 'camera' ? 'white' : 'text.primary',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          fontSize: '1.25rem',
          fontWeight: 500
        }}>
          Dokument scannen
          <IconButton
            onClick={() => {
              stopCamera();
              setScanDialogOpen(false);
              setCapturedImage(null);
              setSelectedFiles([]);
              setFilePreviews([]);
              setUploadDescription('');
              setFolderName('');
              setScanMode(isMobileDevice ? 'camera' : 'file');
              if (scanFileInputRef) {
                scanFileInputRef.value = '';
              }
            }}
            sx={{ color: scanMode === 'camera' ? 'white' : 'text.primary' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'transparent', p: 2 }}>
          {/* Tabs für Scan-Modus (nur auf Desktop) */}
          {!isMobileDevice && (
            <Tabs 
              value={scanMode === 'file' ? 0 : 1} 
              onChange={(_, newValue) => {
                const newMode = newValue === 0 ? 'file' : 'camera';
                setScanMode(newMode);
                if (newMode === 'camera') {
                  startCamera();
                } else {
                  stopCamera();
                }
                setCapturedImage(null);
              }}
              sx={{ mb: 2 }}
            >
              <Tab label="Scanner (Datei)" icon={<Scanner />} iconPosition="start" />
              <Tab label="Kamera" icon={<CameraAlt />} iconPosition="start" />
            </Tabs>
          )}

          {scanMode === 'file' ? (
            // Scanner/Datei-Modus (für Desktop)
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleScanFileUpload}
                style={{ display: 'none' }}
                ref={(input) => setScanFileInputRef(input)}
                id="scan-file-input"
                multiple
              />
              <Stack spacing={3} alignItems="center">
                <Scanner sx={{ fontSize: 64, color: 'primary.main' }} />
                <Typography variant="h6">
                  Scanner oder Dateien auswählen
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Wählen Sie eine oder mehrere gescannte Dateien von Ihrem Scanner oder Computer aus.
                  Unterstützte Formate: JPEG, PNG, GIF, WebP, PDF
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Scanner />}
                  onClick={() => scanFileInputRef?.click()}
                  disabled={uploading}
                >
                  {uploading ? <CircularProgress size={20} /> : selectedFiles.length > 0 ? `${selectedFiles.length} Datei(en) ausgewählt` : 'Dateien auswählen'}
                </Button>
                
                {selectedFiles.length > 0 && (
                  <Box sx={{ width: '100%', mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Ausgewählte Dateien ({selectedFiles.length}):
                    </Typography>
                    <Stack spacing={1} sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {selectedFiles.map((file, index) => (
                        <Paper key={index} sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                          {filePreviews[index] && (
                            <Box
                              component="img"
                              src={filePreviews[index]}
                              alt={file.name}
                              sx={{
                                width: 60,
                                height: 60,
                                objectFit: 'cover',
                                borderRadius: 1
                              }}
                            />
                          )}
                          {!filePreviews[index] && file.type === 'application/pdf' && (
                            <Box
                              sx={{
                                width: 60,
                                height: 60,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'error.light',
                                borderRadius: 1
                              }}
                            >
                              <Typography variant="caption" color="error">
                                PDF
                              </Typography>
                            </Box>
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap>
                              {file.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {(file.size / 1024).toFixed(1)} KB
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => {
                              const newFiles = selectedFiles.filter((_, i) => i !== index);
                              const newPreviews = filePreviews.filter((_, i) => i !== index);
                              setSelectedFiles(newFiles);
                              setFilePreviews(newPreviews);
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Box>
          ) : (
            // Kamera-Modus (für Mobile/Tablet oder wenn manuell ausgewählt)
            <>
              {!capturedImage ? (
                <Box sx={{ position: 'relative', width: '100%', minHeight: 400 }}>
                  <video
                    ref={(video) => {
                      if (video) {
                        setVideoRef(video);
                        if (stream) {
                          video.srcObject = stream;
                          video.play().catch(err => console.error('Error playing video:', err));
                        }
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: 8,
                      transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                    }}
                  />
                  {!stream && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        color: 'white'
                      }}
                    >
                      <CircularProgress sx={{ color: 'white', mb: 2 }} />
                      <Typography>Kamera wird initialisiert...</Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center' }}>
                  <Box
                    component="img"
                    src={capturedImage}
                    alt="Gescanntes Bild"
                    sx={{
                      maxWidth: '100%',
                      maxHeight: '60vh',
                      borderRadius: 2,
                      border: '2px solid white'
                    }}
                  />
                </Box>
              )}
            </>
          )}

          {(capturedImage || selectedFiles.length > 0) && (
            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="Ordnername (optional)"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="z.B. Befund, Röntgen, etc."
                helperText="Der Ordnername wird dem Datum/Uhrzeit hinzugefügt"
                sx={{ 
                  mb: 2,
                  '.MuiInputBase-input': { color: scanMode === 'camera' ? 'white' : 'text.primary' }, 
                  '.MuiInputLabel-root': { color: scanMode === 'camera' ? 'rgba(255,255,255,0.7)' : 'text.secondary' }, 
                  '.MuiOutlinedInput-notchedOutline': { borderColor: scanMode === 'camera' ? 'rgba(255,255,255,0.5)' : 'divider' },
                  '.MuiFormHelperText-root': { color: scanMode === 'camera' ? 'rgba(255,255,255,0.7)' : 'text.secondary' }
                }}
              />
              <TextField
                fullWidth
                label="Beschreibung (optional)"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                multiline
                rows={3}
                placeholder="Optionale Beschreibung für das gescannte Dokument..."
                sx={{ 
                  '.MuiInputBase-input': { color: scanMode === 'camera' ? 'white' : 'text.primary' }, 
                  '.MuiInputLabel-root': { color: scanMode === 'camera' ? 'rgba(255,255,255,0.7)' : 'text.secondary' }, 
                  '.MuiOutlinedInput-notchedOutline': { borderColor: scanMode === 'camera' ? 'rgba(255,255,255,0.5)' : 'divider' } 
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          bgcolor: 'transparent', 
          justifyContent: 'space-between', 
          px: 2, 
          pb: 2 
        }}>
          {scanMode === 'file' ? (
            // Scanner/Datei-Modus Buttons
            <Stack direction="row" spacing={1} sx={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setScanDialogOpen(false);
                  setCapturedImage(null);
                  setSelectedFiles([]);
                  setFilePreviews([]);
                  setUploadDescription('');
                  setFolderName('');
                  if (scanFileInputRef) {
                    scanFileInputRef.value = '';
                  }
                }}
              >
                Abbrechen
              </Button>
              {selectedFiles.length > 0 && (
                <>
                  <Button
                    startIcon={<Cancel />}
                    onClick={() => {
                      setSelectedFiles([]);
                      setFilePreviews([]);
                      setUploadDescription('');
                      setFolderName('');
                      if (scanFileInputRef) {
                        scanFileInputRef.value = '';
                      }
                    }}
                  >
                    Auswahl löschen
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<CheckCircle />}
                    onClick={handleSaveScannedImage}
                    disabled={uploading}
                  >
                    {uploading ? <CircularProgress size={20} /> : `${selectedFiles.length} Datei(en) speichern`}
                  </Button>
                </>
              )}
            </Stack>
          ) : (
            // Kamera-Modus Buttons
            <>
              {!capturedImage ? (
                <>
                  <Button
                    startIcon={<FlipCameraIos />}
                    onClick={toggleCamera}
                    disabled={!stream}
                    sx={{ color: 'white' }}
                  >
                    Kamera wechseln
                  </Button>
                  <Stack direction="row" spacing={1}>
                    <Button
                      onClick={() => {
                        stopCamera();
                        setScanDialogOpen(false);
                        setCapturedImage(null);
                        setUploadDescription('');
                        setFolderName('');
                      }}
                      sx={{ color: 'white' }}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<CameraAlt />}
                      onClick={captureImage}
                      disabled={!stream}
                    >
                      Aufnehmen
                    </Button>
                  </Stack>
                </>
              ) : (
                <Stack direction="row" spacing={1} sx={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button
                    startIcon={<Cancel />}
                    onClick={() => {
                      setCapturedImage(null);
                      setUploadDescription('');
                      setFolderName('');
                      startCamera();
                    }}
                    sx={{ color: 'white' }}
                  >
                    Erneut aufnehmen
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<CheckCircle />}
                    onClick={handleSaveScannedImage}
                    disabled={uploading}
                  >
                    {uploading ? <CircularProgress size={20} /> : 'Speichern'}
                  </Button>
                </Stack>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog zum Verschieben von Fotos in einen Ordner */}
      <Dialog
        open={moveToFolderDialogOpen}
        onClose={() => {
          setMoveToFolderDialogOpen(false);
          setNewFolderName('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Fotos in Ordner verschieben
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            
            <Typography variant="body2" color="text.secondary">
              {selectedPhotos.length} Foto(s) ausgewählt
            </Typography>
            
            {existingFolders.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Zu bestehendem Ordner hinzufügen:
                </Typography>
                <Stack spacing={1}>
                  {existingFolders.map((folder) => {
                    const folderMatch = folder.match(/scan-(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})(?:_(.+))?/);
                    let displayName = folder;
                    if (folderMatch) {
                      const [, year, month, day, hour, minute, , customName] = folderMatch;
                      displayName = customName 
                        ? `${day}.${month}.${year} ${hour}:${minute} - ${customName.replace(/-/g, ' ')}`
                        : `${day}.${month}.${year} ${hour}:${minute}`;
                    }
                    const isSelected = newFolderName === folder;
                    return (
                      <Button
                        key={folder}
                        variant={isSelected ? 'contained' : 'outlined'}
                        color={isSelected ? 'primary' : 'inherit'}
                        onClick={() => {
                          setNewFolderName(folder);
                          setError(null); // Fehler zurücksetzen bei Auswahl
                        }}
                        fullWidth
                        sx={{ justifyContent: 'flex-start' }}
                      >
                        <Folder sx={{ mr: 1 }} />
                        {displayName}
                        {isSelected && <CheckCircle sx={{ ml: 'auto' }} />}
                      </Button>
                    );
                  })}
                </Stack>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Neuen Ordner erstellen:
              </Typography>
              <TextField
                fullWidth
                label="Ordnername"
                value={newFolderName}
                onChange={(e) => {
                  setNewFolderName(e.target.value);
                  setError(null); // Fehler zurücksetzen bei Eingabe
                }}
                placeholder="z.B. Befund, Röntgen, etc."
                helperText="Der Ordnername wird dem aktuellen Datum/Uhrzeit hinzugefügt"
                error={!!error && !newFolderName.trim()}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setMoveToFolderDialogOpen(false);
              setNewFolderName('');
            }}
          >
            Abbrechen
          </Button>
          <Button
            variant="contained"
            onClick={handleMovePhotosToFolder}
            disabled={!newFolderName.trim() || uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : <DriveFileMove />}
          >
            {uploading ? 'Wird verschoben...' : 'Verschieben'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
  } catch (error) {
    console.error('❌ Kritischer Fehler in PatientPhotoGallery:', error);
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Ein Fehler ist aufgetreten. Bitte laden Sie die Seite neu.
        </Alert>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
        >
          Seite neu laden
        </Button>
      </Box>
    );
  }
};

export default PatientPhotoGallery;

