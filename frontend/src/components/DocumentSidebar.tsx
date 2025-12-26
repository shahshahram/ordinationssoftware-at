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
  LocalHospital,
  Medication,
  LocalHospital as DiagnosisIcon
} from '@mui/icons-material';
import { apiRequest } from '../utils/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface DocumentSidebarProps {
  patientId: string;
  onAddToDocument?: (type: 'labor' | 'vital' | 'dicom' | 'document' | 'dekurs' | 'medication' | 'diagnosis', data: any) => void;
  onViewDetails?: (type: 'labor' | 'vital' | 'dicom' | 'document' | 'dekurs' | 'medication' | 'diagnosis', data: any) => void;
}

interface AccordionState {
  labor: boolean;
  dekurs: boolean;
  vital: boolean;
  documents: boolean;
  dicom: boolean;
  medications: boolean;
  diagnoses: boolean;
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
  const [medications, setMedications] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);

  // State für Lade-Status
  const [loading, setLoading] = useState<Record<string, boolean>>({
    labor: false,
    dekurs: false,
    vital: false,
    documents: false,
    dicom: false,
    medications: false,
    diagnoses: false
  });

  // State für Accordion (aus localStorage)
  // Standardmäßig Labor und Dekurs geöffnet, da diese die höchste Priorität haben
  const [accordionState, setAccordionState] = useState<AccordionState>(() => {
    const saved = localStorage.getItem('documentSidebarAccordionState');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { labor: true, dekurs: true, vital: false, documents: false, dicom: false, medications: false, diagnoses: false };
      }
    }
    return { labor: true, dekurs: true, vital: false, documents: false, dicom: false, medications: false, diagnoses: false };
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

  const loadMedications = useCallback(async () => {
    if (medications.length > 0 || loading.medications) return;
    
    setLoading(prev => ({ ...prev, medications: true }));
    try {
      const response: any = await apiRequest.get(`/medications/patient/${patientId}?status=active&limit=10`);
      const data = response?.data?.data || response?.data || [];
      setMedications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fehler beim Laden der Medikamente:', error);
      setMedications([]);
    } finally {
      setLoading(prev => ({ ...prev, medications: false }));
    }
  }, [patientId, medications.length, loading.medications]);

  const loadDiagnoses = useCallback(async () => {
    if (diagnoses.length > 0 || loading.diagnoses) return;
    
    setLoading(prev => ({ ...prev, diagnoses: true }));
    try {
      const response: any = await apiRequest.get(`/diagnoses/patient/${patientId}?limit=20`);
      const data = response?.data?.data || response?.data || [];
      setDiagnoses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fehler beim Laden der Diagnosen:', error);
      setDiagnoses([]);
    } finally {
      setLoading(prev => ({ ...prev, diagnoses: false }));
    }
  }, [patientId, diagnoses.length, loading.diagnoses]);

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
    if (accordionState.medications && medications.length === 0 && !loading.medications) {
      loadMedications();
    }
    if (accordionState.diagnoses && diagnoses.length === 0 && !loading.diagnoses) {
      loadDiagnoses();
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
        case 'medications':
          loadMedications();
          break;
        case 'diagnoses':
          loadDiagnoses();
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

      {/* Medikamente - Priorität 6 */}
      <Accordion 
        expanded={accordionState.medications} 
        onChange={() => handleAccordionChange('medications')}
        sx={{ boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Medication color="primary" />
            <Typography variant="subtitle2" fontWeight="bold">
              Medikamente
            </Typography>
            {medications.length > 0 && (
              <Chip label={medications.length} size="small" sx={{ ml: 'auto' }} />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {loading.medications ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : medications.length > 0 ? (
            <List dense>
              {medications.map((medication) => (
                <ListItemButton
                  key={medication._id || medication.id}
                  sx={{ py: 1 }}
                  onClick={() => onViewDetails?.('medication', medication)}
                >
                  <ListItemText
                    primary={medication.name || 'Medikament'}
                    secondary={
                      <>
                        {medication.dosage && medication.frequency && (
                          <Typography variant="caption" display="block">
                            {medication.dosage} • {medication.frequency}
                          </Typography>
                        )}
                        {medication.startDate && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Seit: {formatDate(medication.startDate)}
                          </Typography>
                        )}
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
                            onAddToDocument('medication', medication);
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
            <Alert severity="info" sx={{ m: 1 }}>Keine aktiven Medikamente verfügbar</Alert>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Diagnosen - Priorität 7 */}
      <Accordion 
        expanded={accordionState.diagnoses} 
        onChange={() => handleAccordionChange('diagnoses')}
        sx={{ boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <DiagnosisIcon color="primary" />
            <Typography variant="subtitle2" fontWeight="bold">
              Diagnosen
            </Typography>
            {diagnoses.length > 0 && (
              <Chip label={diagnoses.length} size="small" sx={{ ml: 'auto' }} />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {loading.diagnoses ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : diagnoses.length > 0 ? (
            <List dense>
              {diagnoses.map((diagnosis) => (
                <ListItemButton
                  key={diagnosis._id || diagnosis.id}
                  sx={{ py: 1 }}
                  onClick={() => onViewDetails?.('diagnosis', diagnosis)}
                >
                  <ListItemText
                    primary={diagnosis.code ? `${diagnosis.code} - ${diagnosis.name || diagnosis.description || 'Diagnose'}` : (diagnosis.name || diagnosis.description || 'Diagnose')}
                    secondary={
                      <>
                        {diagnosis.isPrimary && (
                          <Chip label="Hauptdiagnose" size="small" color="primary" sx={{ mr: 0.5, height: 18, fontSize: '0.65rem' }} />
                        )}
                        {diagnosis.status && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Status: {diagnosis.status === 'active' ? 'Aktiv' : diagnosis.status === 'resolved' ? 'Behoben' : diagnosis.status === 'chronic' ? 'Chronisch' : diagnosis.status}
                          </Typography>
                        )}
                        {diagnosis.diagnosedDate && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Diagnostiziert: {formatDate(diagnosis.diagnosedDate)}
                          </Typography>
                        )}
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
                            onAddToDocument('diagnosis', diagnosis);
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
            <Alert severity="info" sx={{ m: 1 }}>Keine Diagnosen verfügbar</Alert>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default DocumentSidebar;

