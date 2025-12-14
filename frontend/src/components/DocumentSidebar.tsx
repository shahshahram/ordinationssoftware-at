import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Tooltip
} from '@mui/material';
import {
  ExpandMore,
  Add,
  Visibility,
  Science,
  MonitorHeart,
  Description,
  Assignment,
  LocalHospital
} from '@mui/icons-material';
import { apiRequest } from '../utils/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface DocumentSidebarProps {
  patientId: string;
  onAddToDocument?: (type: 'labor' | 'vital' | 'dicom' | 'document' | 'dekurs', data: any) => void;
  onViewDetails?: (type: 'labor' | 'vital' | 'dicom' | 'document' | 'dekurs', data: any) => void;
}

interface AccordionState {
  labor: boolean;
  dekurs: boolean;
  vital: boolean;
  documents: boolean;
  dicom: boolean;
}

const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  patientId,
  onAddToDocument,
  onViewDetails
}) => {
  // State für geladene Daten
  const [laborResults, setLaborResults] = useState<any[]>([]);
  const [dekursEntries, setDekursEntries] = useState<any[]>([]);
  const [vitalSigns, setVitalSigns] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [dicomStudies, setDicomStudies] = useState<any[]>([]);

  // State für Lade-Status
  const [loading, setLoading] = useState<Record<string, boolean>>({
    labor: false,
    dekurs: false,
    vital: false,
    documents: false,
    dicom: false
  });

  // State für Accordion (aus localStorage)
  // Standardmäßig Labor und Dekurs geöffnet, da diese die höchste Priorität haben
  const [accordionState, setAccordionState] = useState<AccordionState>(() => {
    const saved = localStorage.getItem('documentSidebarAccordionState');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { labor: true, dekurs: true, vital: false, documents: false, dicom: false };
      }
    }
    return { labor: true, dekurs: true, vital: false, documents: false, dicom: false };
  });

  // Lade Daten lazy (nur wenn Accordion geöffnet wird)
  const loadLaborResults = useCallback(async () => {
    if (laborResults.length > 0 || loading.labor) return;
    
    setLoading(prev => ({ ...prev, labor: true }));
    try {
      const response: any = await apiRequest.get(`/labor/patient/${patientId}?limit=10`);
      const data = response?.data?.data || response?.data || [];
      setLaborResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fehler beim Laden der Laborwerte:', error);
      setLaborResults([]);
    } finally {
      setLoading(prev => ({ ...prev, labor: false }));
    }
  }, [patientId, laborResults.length, loading.labor]);

  const loadDekursEntries = useCallback(async () => {
    if (dekursEntries.length > 0 || loading.dekurs) return;
    
    setLoading(prev => ({ ...prev, dekurs: true }));
    try {
      const response: any = await apiRequest.get(`/dekurs/patient/${patientId}?limit=10`);
      const data = response?.data?.data || response?.data || [];
      setDekursEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fehler beim Laden der Dekurs-Einträge:', error);
      setDekursEntries([]);
    } finally {
      setLoading(prev => ({ ...prev, dekurs: false }));
    }
  }, [patientId, dekursEntries.length, loading.dekurs]);

  const loadVitalSigns = useCallback(async () => {
    if (vitalSigns.length > 0 || loading.vital) return;
    
    setLoading(prev => ({ ...prev, vital: true }));
    try {
      const response: any = await apiRequest.get(`/vital-signs/patient/${patientId}?limit=10`);
      const data = response?.data?.data || response?.data || [];
      setVitalSigns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fehler beim Laden der Vitalwerte:', error);
      setVitalSigns([]);
    } finally {
      setLoading(prev => ({ ...prev, vital: false }));
    }
  }, [patientId, vitalSigns.length, loading.vital]);

  const loadDocuments = useCallback(async () => {
    if (documents.length > 0 || loading.documents) return;
    
    setLoading(prev => ({ ...prev, documents: true }));
    try {
      const response: any = await apiRequest.get(`/documents?patientId=${patientId}&limit=10`);
      const data = response?.data?.data || response?.data || [];
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fehler beim Laden der Dokumente:', error);
      setDocuments([]);
    } finally {
      setLoading(prev => ({ ...prev, documents: false }));
    }
  }, [patientId, documents.length, loading.documents]);

  const loadDicomStudies = useCallback(async () => {
    if (dicomStudies.length > 0 || loading.dicom) return;
    
    setLoading(prev => ({ ...prev, dicom: true }));
    try {
      const response: any = await apiRequest.get(`/dicom/patient/${patientId}?limit=10`);
      const data = response?.data?.data || response?.data || [];
      setDicomStudies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fehler beim Laden der DICOM-Studien:', error);
      setDicomStudies([]);
    } finally {
      setLoading(prev => ({ ...prev, dicom: false }));
    }
  }, [patientId, dicomStudies.length, loading.dicom]);

  // Lade Daten für initial geöffnete Accordions
  useEffect(() => {
    if (accordionState.labor && laborResults.length === 0 && !loading.labor) {
      loadLaborResults();
    }
    if (accordionState.dekurs && dekursEntries.length === 0 && !loading.dekurs) {
      loadDekursEntries();
    }
    if (accordionState.vital && vitalSigns.length === 0 && !loading.vital) {
      loadVitalSigns();
    }
    if (accordionState.documents && documents.length === 0 && !loading.documents) {
      loadDocuments();
    }
    if (accordionState.dicom && dicomStudies.length === 0 && !loading.dicom) {
      loadDicomStudies();
    }
  }, [accordionState, patientId]);

  // Handle Accordion Change
  const handleAccordionChange = (panel: keyof AccordionState) => {
    const newState = { ...accordionState, [panel]: !accordionState[panel] };
    setAccordionState(newState);
    localStorage.setItem('documentSidebarAccordionState', JSON.stringify(newState));

    // Lade Daten wenn Accordion geöffnet wird
    if (newState[panel]) {
      switch (panel) {
        case 'labor':
          loadLaborResults();
          break;
        case 'dekurs':
          loadDekursEntries();
          break;
        case 'vital':
          loadVitalSigns();
          break;
        case 'documents':
          loadDocuments();
          break;
        case 'dicom':
          loadDicomStudies();
          break;
      }
    }
  };

  // Format Datum
  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return 'Unbekannt';
    try {
      return format(new Date(date), 'dd.MM.yyyy', { locale: de });
    } catch {
      return 'Unbekannt';
    }
  };

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', bgcolor: 'background.paper' }}>
      {/* Laborwerte - Priorität 1 */}
      <Accordion 
        expanded={accordionState.labor} 
        onChange={() => handleAccordionChange('labor')}
        sx={{ boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Science color="primary" />
            <Typography variant="subtitle2" fontWeight="bold">
              Laborwerte
            </Typography>
            {laborResults.length > 0 && (
              <Chip label={laborResults.length} size="small" sx={{ ml: 'auto' }} />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {loading.labor ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : laborResults.length > 0 ? (
            <List dense>
              {laborResults.map((labor) => (
                <ListItemButton
                  key={labor._id || labor.id}
                  sx={{ py: 1 }}
                  onClick={() => onViewDetails?.('labor', labor)}
                >
                  <ListItemText
                    primary={labor.testName || labor.name || 'Laborwerte'}
                    secondary={formatDate(labor.date || labor.collectedAt || labor.createdAt)}
                  />
                  <ListItemSecondaryAction>
                    {onAddToDocument && (
                      <Tooltip title="In Brief übernehmen">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToDocument('labor', labor);
                          }}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemSecondaryAction>
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Alert severity="info" sx={{ m: 1 }}>Keine Laborwerte verfügbar</Alert>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Dekurs - Priorität 2 */}
      <Accordion 
        expanded={accordionState.dekurs} 
        onChange={() => handleAccordionChange('dekurs')}
        sx={{ boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Assignment color="primary" />
            <Typography variant="subtitle2" fontWeight="bold">
              Dekurs
            </Typography>
            {dekursEntries.length > 0 && (
              <Chip label={dekursEntries.length} size="small" sx={{ ml: 'auto' }} />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {loading.dekurs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : dekursEntries.length > 0 ? (
            <List dense>
              {dekursEntries.map((entry) => (
                <ListItemButton
                  key={entry._id || entry.id}
                  sx={{ py: 1 }}
                  onClick={() => onViewDetails?.('dekurs', entry)}
                >
                  <ListItemText
                    primary={entry.visitReason || 'Dekurs-Eintrag'}
                    secondary={formatDate(entry.entryDate)}
                  />
                  <ListItemSecondaryAction>
                    {onAddToDocument && (
                      <Tooltip title="In Brief übernehmen">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToDocument('dekurs', entry);
                          }}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemSecondaryAction>
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Alert severity="info" sx={{ m: 1 }}>Keine Dekurs-Einträge verfügbar</Alert>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Vitalwerte - Priorität 3 */}
      <Accordion 
        expanded={accordionState.vital} 
        onChange={() => handleAccordionChange('vital')}
        sx={{ boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <MonitorHeart color="primary" />
            <Typography variant="subtitle2" fontWeight="bold">
              Vitalwerte
            </Typography>
            {vitalSigns.length > 0 && (
              <Chip label={vitalSigns.length} size="small" sx={{ ml: 'auto' }} />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {loading.vital ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : vitalSigns.length > 0 ? (
            <List dense>
              {vitalSigns.map((vital) => (
                <ListItemButton
                  key={vital._id || vital.id}
                  sx={{ py: 1 }}
                  onClick={() => onViewDetails?.('vital', vital)}
                >
                  <ListItemText
                    primary={`Vitalwerte vom ${formatDate(vital.recordedAt)}`}
                    secondary={
                      <>
                        {vital.bloodPressure && `RR: ${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic}`}
                        {vital.pulse && ` | Puls: ${vital.pulse}`}
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    {onAddToDocument && (
                      <Tooltip title="In Brief übernehmen">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToDocument('vital', vital);
                          }}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemSecondaryAction>
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Alert severity="info" sx={{ m: 1 }}>Keine Vitalwerte verfügbar</Alert>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Dokumente - Priorität 4 */}
      <Accordion 
        expanded={accordionState.documents} 
        onChange={() => handleAccordionChange('documents')}
        sx={{ boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Description color="primary" />
            <Typography variant="subtitle2" fontWeight="bold">
              Dokumente
            </Typography>
            {documents.length > 0 && (
              <Chip label={documents.length} size="small" sx={{ ml: 'auto' }} />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {loading.documents ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : documents.length > 0 ? (
            <List dense>
              {documents.map((doc) => (
                <ListItemButton
                  key={doc._id || doc.id}
                  sx={{ py: 1 }}
                  onClick={() => onViewDetails?.('document', doc)}
                >
                  <ListItemText
                    primary={doc.title || 'Dokument'}
                    secondary={formatDate(doc.createdAt)}
                  />
                  <ListItemSecondaryAction>
                    {onAddToDocument && (
                      <Tooltip title="In Brief übernehmen">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToDocument('document', doc);
                          }}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemSecondaryAction>
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Alert severity="info" sx={{ m: 1 }}>Keine Dokumente verfügbar</Alert>
          )}
        </AccordionDetails>
      </Accordion>

      {/* DICOM - Priorität 5 */}
      <Accordion 
        expanded={accordionState.dicom} 
        onChange={() => handleAccordionChange('dicom')}
        sx={{ boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <LocalHospital color="primary" />
            <Typography variant="subtitle2" fontWeight="bold">
              DICOM
            </Typography>
            {dicomStudies.length > 0 && (
              <Chip label={dicomStudies.length} size="small" sx={{ ml: 'auto' }} />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {loading.dicom ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : dicomStudies.length > 0 ? (
            <List dense>
              {dicomStudies.map((study) => (
                <ListItemButton
                  key={study._id || study.id}
                  sx={{ py: 1 }}
                  onClick={() => onViewDetails?.('dicom', study)}
                >
                  <ListItemText
                    primary={study.studyDescription || study.description || 'DICOM-Studie'}
                    secondary={formatDate(study.studyDate)}
                  />
                  <ListItemSecondaryAction>
                    {onAddToDocument && (
                      <Tooltip title="In Brief übernehmen">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToDocument('dicom', study);
                          }}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemSecondaryAction>
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Alert severity="info" sx={{ m: 1 }}>Keine DICOM-Studien verfügbar</Alert>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default DocumentSidebar;

