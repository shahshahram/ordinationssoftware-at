import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  Divider
} from '@mui/material';
import {
  Visibility,
  Delete,
  Upload,
  CalendarToday,
  Person,
  Description,
  LocalHospital,
  ExpandMore,
  ExpandLess,
  Collections
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../utils/api';
import DicomViewer from './DicomViewer';
import DicomUpload from './DicomUpload';

interface DicomStudy {
  _id: string;
  studyInstanceUID: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  patientName: string;
  studyDate?: string;
  studyTime?: string;
  studyDescription?: string;
  modality?: string;
  seriesDescription?: string;
  seriesNumber?: number;
  seriesDate?: string;
  seriesTime?: string;
  instanceNumber?: number;
  uploadedAt: string;
  uploadedBy?: {
    firstName: string;
    lastName: string;
  };
}

interface GroupedStudy {
  studyInstanceUID: string;
  studyDescription?: string;
  studyDate?: string;
  studyTime?: string;
  modality?: string;
  series: GroupedSeries[];
}

interface GroupedSeries {
  seriesInstanceUID: string;
  seriesDescription?: string;
  seriesNumber?: number;
  seriesDate?: string;
  seriesTime?: string;
  modality?: string;
  images: DicomStudy[];
}

interface DicomStudiesListProps {
  patientId: string;
}

const DicomStudiesList: React.FC<DicomStudiesListProps> = ({ patientId }) => {
  const [studies, setStudies] = useState<DicomStudy[]>([]);
  const [groupedStudies, setGroupedStudies] = useState<GroupedStudy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<DicomStudy | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<GroupedSeries | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studyToDelete, setStudyToDelete] = useState<DicomStudy | null>(null);
  const [expandedStudies, setExpandedStudies] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (patientId) {
      loadStudies();
    }
  }, [patientId]);

  const loadStudies = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/dicom/patient/${patientId}`);
      const responseData = response.data as any;
      if (responseData.success) {
        const allStudies = responseData.data || [];
        // Debug: Prüfe ob studyDate und studyTime vorhanden sind
        if (allStudies.length > 0) {
          console.log('DICOM Studien geladen:', allStudies.length);
          console.log('Erste Studie:', {
            studyDate: allStudies[0].studyDate,
            studyTime: allStudies[0].studyTime,
            seriesDate: allStudies[0].seriesDate,
            seriesTime: allStudies[0].seriesTime
          });
        }
        setStudies(allStudies);
        groupStudiesBySeries(allStudies);
      }
    } catch (err: any) {
      console.error('Fehler beim Laden der DICOM-Studien:', err);
      setError(err.response?.data?.message || 'Fehler beim Laden der DICOM-Studien');
    } finally {
      setLoading(false);
    }
  };

  const groupStudiesBySeries = (allStudies: DicomStudy[]) => {
    // Gruppiere nach studyInstanceUID
    const studyMap = new Map<string, DicomStudy[]>();
    allStudies.forEach(study => {
      const key = study.studyInstanceUID;
      if (!studyMap.has(key)) {
        studyMap.set(key, []);
      }
      studyMap.get(key)!.push(study);
    });

    // Erstelle GroupedStudy-Objekte
    const grouped: GroupedStudy[] = [];
    studyMap.forEach((studies, studyInstanceUID) => {
      const firstStudy = studies[0];
      
      // Gruppiere Serien innerhalb der Studie
      const seriesMap = new Map<string, DicomStudy[]>();
      studies.forEach(study => {
        const seriesKey = study.seriesInstanceUID || 'no-series';
        if (!seriesMap.has(seriesKey)) {
          seriesMap.set(seriesKey, []);
        }
        seriesMap.get(seriesKey)!.push(study);
      });

      const series: GroupedSeries[] = [];
      seriesMap.forEach((images, seriesInstanceUID) => {
        const firstImage = images[0];
        // Sortiere Bilder nach instanceNumber
        images.sort((a, b) => (a.instanceNumber || 0) - (b.instanceNumber || 0));
        
        // Verwende studyDate/studyTime oder uploadedAt als Fallback für Serie
        let seriesDisplayDate = firstImage.seriesDate || firstImage.studyDate;
        let seriesDisplayTime = firstImage.seriesTime || firstImage.studyTime;
        
        if (!seriesDisplayDate && firstImage.uploadedAt) {
          const uploadDate = new Date(firstImage.uploadedAt);
          if (!isNaN(uploadDate.getTime())) {
            const year = uploadDate.getFullYear();
            const month = String(uploadDate.getMonth() + 1).padStart(2, '0');
            const day = String(uploadDate.getDate()).padStart(2, '0');
            seriesDisplayDate = `${year}${month}${day}`;
            
            const hours = String(uploadDate.getHours()).padStart(2, '0');
            const minutes = String(uploadDate.getMinutes()).padStart(2, '0');
            const seconds = String(uploadDate.getSeconds()).padStart(2, '0');
            seriesDisplayTime = `${hours}${minutes}${seconds}`;
          }
        }
        
        series.push({
          seriesInstanceUID: seriesInstanceUID === 'no-series' ? '' : seriesInstanceUID,
          seriesDescription: firstImage.seriesDescription,
          seriesNumber: firstImage.seriesNumber,
          seriesDate: seriesDisplayDate,
          seriesTime: seriesDisplayTime,
          modality: firstImage.modality,
          images
        });
      });

      // Sortiere Serien nach seriesNumber
      series.sort((a, b) => (a.seriesNumber || 0) - (b.seriesNumber || 0));

      // Verwende uploadedAt als Fallback, wenn studyDate fehlt
      let displayDate = firstStudy.studyDate;
      let displayTime = firstStudy.studyTime;
      
      if (!displayDate && firstStudy.uploadedAt) {
        // Konvertiere uploadedAt (ISO String) zu DICOM-Format
        const uploadDate = new Date(firstStudy.uploadedAt);
        if (!isNaN(uploadDate.getTime())) {
          const year = uploadDate.getFullYear();
          const month = String(uploadDate.getMonth() + 1).padStart(2, '0');
          const day = String(uploadDate.getDate()).padStart(2, '0');
          displayDate = `${year}${month}${day}`;
          
          const hours = String(uploadDate.getHours()).padStart(2, '0');
          const minutes = String(uploadDate.getMinutes()).padStart(2, '0');
          const seconds = String(uploadDate.getSeconds()).padStart(2, '0');
          displayTime = `${hours}${minutes}${seconds}`;
        }
      }
      
      grouped.push({
        studyInstanceUID,
        studyDescription: firstStudy.studyDescription,
        studyDate: displayDate,
        studyTime: displayTime,
        modality: firstStudy.modality,
        series
      });
    });

    // Sortiere Studien nach Datum
    grouped.sort((a, b) => {
      const dateA = a.studyDate || '';
      const dateB = b.studyDate || '';
      return dateB.localeCompare(dateA);
    });

    setGroupedStudies(grouped);
  };

  const handleToggleStudy = (studyInstanceUID: string) => {
    const newExpanded = new Set(expandedStudies);
    if (newExpanded.has(studyInstanceUID)) {
      newExpanded.delete(studyInstanceUID);
    } else {
      newExpanded.add(studyInstanceUID);
    }
    setExpandedStudies(newExpanded);
  };

  const handleViewSeries = (series: GroupedSeries, study: GroupedStudy) => {
    // Öffne Viewer mit der ersten Instanz der Serie
    const firstImage = series.images[0];
    setSelectedStudy(firstImage);
    setSelectedSeries(series);
    setViewerOpen(true);
  };

  const handleDeleteClick = (study: DicomStudy) => {
    setStudyToDelete(study);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!studyToDelete) return;

    try {
      await api.delete(`/dicom/studies/${studyToDelete._id}`);
      await loadStudies();
      setDeleteDialogOpen(false);
      setStudyToDelete(null);
    } catch (err: any) {
      console.error('Fehler beim Löschen der DICOM-Studie:', err);
      setError(err.response?.data?.message || 'Fehler beim Löschen der DICOM-Studie');
    }
  };

  const formatStudyDate = (dateStr?: string, timeStr?: string) => {
    // Wenn weder Datum noch Zeit vorhanden sind
    if (!dateStr && !timeStr) {
      return 'Datum und Uhrzeit nicht verfügbar';
    }
    
    // Wenn nur Zeit vorhanden ist
    if (!dateStr && timeStr) {
      try {
        if (timeStr.length >= 4) {
          const hour = timeStr.substring(0, 2);
          const minute = timeStr.substring(2, 4);
          const second = timeStr.length >= 6 ? timeStr.substring(4, 6) : null;
          
          if (hour && minute) {
            if (second) {
              return `Uhrzeit: ${hour}:${minute}:${second}`;
            } else {
              return `Uhrzeit: ${hour}:${minute}`;
            }
          }
        }
        return `Uhrzeit: ${timeStr}`;
      } catch (error) {
        return `Uhrzeit: ${timeStr}`;
      }
    }
    
    // Wenn nur Datum vorhanden ist
    if (dateStr && !timeStr) {
      try {
        // DICOM Date Format: YYYYMMDD
        if (dateStr.length >= 8) {
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          
          if (year && month && day) {
            const date = new Date(`${year}-${month}-${day}`);
            
            if (!isNaN(date.getTime())) {
              return format(date, 'dd.MM.yyyy', { locale: de });
            }
          }
        }
        return dateStr;
      } catch (error) {
        return dateStr;
      }
    }
    
    // Wenn beide vorhanden sind
    try {
      // DICOM Date Format: YYYYMMDD
      if (dateStr && dateStr.length >= 8) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        
        if (!year || !month || !day) {
          return dateStr;
        }
        
        const date = new Date(`${year}-${month}-${day}`);
        
        if (isNaN(date.getTime())) {
          return dateStr;
        }
        
        let formatted = format(date, 'dd.MM.yyyy', { locale: de });
        
        if (timeStr && timeStr.length >= 4) {
          // DICOM Time Format: HHMMSS.FFFFFF
          const hour = timeStr.substring(0, 2);
          const minute = timeStr.substring(2, 4);
          const second = timeStr.length >= 6 ? timeStr.substring(4, 6) : null;
          
          if (hour && minute) {
            if (second) {
              formatted += ` ${hour}:${minute}:${second}`;
            } else {
              formatted += ` ${hour}:${minute}`;
            }
          }
        }
        
        return formatted;
      }
      
      return dateStr || 'Datum unbekannt';
    } catch (error) {
      return dateStr || 'Datum unbekannt';
    }
  };

  const getModalityColor = (modality?: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      'CT': 'primary',
      'MR': 'secondary',
      'CR': 'info',
      'DX': 'info',
      'US': 'success',
      'MG': 'warning'
    };
    return colors[modality || ''] || 'default';
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">DICOM-Studien</Typography>
        <Button
          variant="contained"
          startIcon={<Upload />}
          onClick={() => setUploadDialogOpen(true)}
        >
          DICOM hochladen
        </Button>
      </Stack>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && studies.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <LocalHospital sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Keine DICOM-Studien vorhanden
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Laden Sie eine DICOM-Datei hoch, um zu beginnen.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Upload />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Erste DICOM-Datei hochladen
          </Button>
        </Paper>
      )}

      {!loading && groupedStudies.length > 0 && (
        <Paper>
          <List>
            {groupedStudies.map((study) => {
              const isExpanded = expandedStudies.has(study.studyInstanceUID);
              const totalImages = study.series.reduce((sum, s) => sum + s.images.length, 0);
              
              return (
                <React.Fragment key={study.studyInstanceUID}>
                  <ListItem>
                    <ListItemButton onClick={() => handleToggleStudy(study.studyInstanceUID)}>
                      <ListItemIcon>
                        <LocalHospital color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="subtitle1">
                              {study.studyDescription || study.modality || 'DICOM-Studie'}
                            </Typography>
                            {study.modality && (
                              <Chip
                                label={study.modality}
                                size="small"
                                color={getModalityColor(study.modality)}
                              />
                            )}
                            <Chip
                              label={`${study.series.length} Serie${study.series.length !== 1 ? 'n' : ''}, ${totalImages} Bild${totalImages !== 1 ? 'er' : ''}`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box component="div" sx={{ mt: 0.5 }}>
                            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                              {(study.studyDate || study.studyTime) && (
                                <Typography variant="body2" color="text.secondary" component="span">
                                  <CalendarToday sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                                  {formatStudyDate(study.studyDate, study.studyTime)}
                                </Typography>
                              )}
                              {!study.studyDate && !study.studyTime && (
                                <Typography variant="body2" color="text.secondary" component="span">
                                  <CalendarToday sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                                  Datum und Uhrzeit nicht verfügbar
                                </Typography>
                              )}
                            </Stack>
                          </Box>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                  </ListItem>
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {study.series.map((series, seriesIndex) => (
                        <React.Fragment key={series.seriesInstanceUID || `series-${seriesIndex}`}>
                          <ListItem>
                            <ListItemButton
                              sx={{ pl: 4 }}
                              onClick={() => handleViewSeries(series, study)}
                            >
                              <ListItemIcon>
                                <Collections color="secondary" />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography variant="body1">
                                      {series.seriesDescription || `Serie ${series.seriesNumber || seriesIndex + 1}`}
                                    </Typography>
                                    {series.modality && (
                                      <Chip
                                        label={series.modality}
                                        size="small"
                                        color={getModalityColor(series.modality)}
                                      />
                                    )}
                                    <Chip
                                      label={`${series.images.length} Bild${series.images.length !== 1 ? 'er' : ''}`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  </Box>
                                }
                              secondary={
                                <Box component="div" sx={{ mt: 0.5 }}>
                                  <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                                    {series.seriesNumber && (
                                      <Typography variant="body2" color="text.secondary" component="span">
                                        Serie {series.seriesNumber}
                                      </Typography>
                                    )}
                                    {(series.seriesDate || series.seriesTime) && (
                                      <Typography variant="body2" color="text.secondary" component="span">
                                        <CalendarToday sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                                        {formatStudyDate(series.seriesDate, series.seriesTime)}
                                      </Typography>
                                    )}
                                  </Stack>
                                </Box>
                              }
                              secondaryTypographyProps={{ component: 'div' }}
                              />
                              <IconButton
                                edge="end"
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewSeries(series, study);
                                }}
                                title="Serie anzeigen"
                                sx={{ mr: 1 }}
                              >
                                <Visibility />
                              </IconButton>
                            </ListItemButton>
                          </ListItem>
                          {seriesIndex < study.series.length - 1 && <Divider component="li" />}
                        </React.Fragment>
                      ))}
                    </List>
                  </Collapse>
                  <Divider />
                </React.Fragment>
              );
            })}
          </List>
        </Paper>
      )}

      {/* DICOM Viewer Dialog */}
      {selectedStudy && selectedSeries && (
        <DicomViewer
          open={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setSelectedStudy(null);
            setSelectedSeries(null);
          }}
          studyId={selectedStudy._id}
          studyInstanceUID={selectedStudy.studyInstanceUID}
          seriesInstanceUID={selectedSeries.seriesInstanceUID}
          sopInstanceUID={selectedStudy.sopInstanceUID}
          seriesImages={selectedSeries.images}
        />
      )}

      {/* Upload Dialog */}
      <DicomUpload
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        patientId={patientId}
        onUploadSuccess={loadStudies}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>DICOM-Studie löschen?</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie diese DICOM-Studie wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DicomStudiesList;

