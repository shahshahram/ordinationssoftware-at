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
  Pagination,
  Stack,
  Divider,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Autocomplete,
} from '@mui/material';
import {
  Upload,
  Download,
  Edit,
  Delete,
  Refresh,
  Search,
  Add,
  Visibility,
  Storage,
  LocationOn,
  Description,
  FilterList,
  Article,
  ExpandMore,
} from '@mui/icons-material';
import { apiRequest } from '../utils/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchLocations, Location } from '../store/slices/locationSlice';
import CDADocumentViewer from '../components/CDADocumentViewer';

interface XdsDocument {
  _id: string;
  entryUUID: string;
  uniqueId: string;
  title: string;
  patientId: string;
  creationTime: string;
  availabilityStatus: string;
  classCode?: {
    code?: string;
    codingScheme?: string;
    displayName?: string;
  };
  typeCode?: Array<{
    code?: string;
    codingScheme?: string;
    displayName?: string;
  }>;
  formatCode?: {
    code?: string;
    codingScheme?: string;
    displayName?: string;
  };
  source: string;
  size: number;
  mimeType: string;
  submittedBy?: {
    userName?: string;
    userRole?: string;
  };
  [key: string]: any; // Für zusätzliche Felder wie healthcareFacilityTypeCode, practiceSettingCode, etc.
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

const XdsDocumentManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { locations } = useAppSelector((state) => state.locations);
  const { user } = useAppSelector((state) => state.auth);

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [documents, setDocuments] = useState<XdsDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  
  // Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [patientIdFilter, setPatientIdFilter] = useState('');
  
  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<XdsDocument | null>(null);
  const [cdaViewerOpen, setCdaViewerOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<XdsDocument | null>(null);
  
  // Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    title: '',
    patientId: '',
    comments: '',
    source: 'internal' as 'internal' | 'retrieved' | 'patient_upload' | 'ambulanzbefund',
    // MIME-Type und Format
    mimeType: '',
    contentType: '',
    // ClassCode
    classCode: { code: '', codingScheme: '', displayName: '' },
    // TypeCode (Array)
    typeCode: [{ code: '', codingScheme: '', displayName: '' }],
    // FormatCode
    formatCode: { code: '', codingScheme: '', displayName: '' },
    // Healthcare Facility Type Code
    healthcareFacilityTypeCode: { code: '', codingScheme: '', displayName: '' },
    // Practice Setting Code
    practiceSettingCode: { code: '', codingScheme: '', displayName: '' },
    // Confidentiality Code
    confidentialityCode: [{ code: '', codingScheme: '', displayName: '' }],
    // Service Start/Stop Time
    serviceStartTime: '',
    serviceStopTime: '',
    // Author
    authorPerson: '',
    authorInstitution: '',
    authorRole: '',
    authorSpecialty: '',
    // Language Code
    languageCode: 'de-AT',
  });

  // Tab state für Standort-Auswahl vs. Dokumente-Ansicht
  const [tabValue, setTabValue] = useState(0);

  // ELGA Valueset Codes für Autocomplete
  const [classCodes, setClassCodes] = useState<any[]>([]);
  const [typeCodes, setTypeCodes] = useState<any[]>([]);
  const [formatCodes, setFormatCodes] = useState<any[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);

  useEffect(() => {
    dispatch(fetchLocations());
  }, [dispatch]);

  // Lade ELGA Valueset Codes wenn Upload-Dialog geöffnet wird
  useEffect(() => {
    if (uploadDialogOpen) {
      loadElgaCodes();
    }
  }, [uploadDialogOpen]);

  // Lade Codes aus ELGA Valuesets nach Kategorien
  const loadElgaCodes = async () => {
    try {
      setLoadingCodes(true);
      
      // Lade spezifisch das ELGA_Dokumentenklassen Valueset (Version 3.6.0+20250603)
      interface DokumentenklassenValueSet {
        title: string;
        version: string;
        oid: string;
        codes: Array<{
          code: string;
          system?: string;
          display?: string;
          displayName?: string;
          deutsch?: string;
          level?: number;
          orderNumber?: number;
          parentCode?: string;
          type?: string;
          hinweise?: string;
          concept_beschreibung?: string;
        }>;
      }
      
      const dokumentenklassenResponse = await apiRequest.get<{ success: boolean; data: DokumentenklassenValueSet }>(
        '/elga-valuesets/dokumentenklassen'
      );
      
      console.log('[ELGA Codes] Dokumentenklassen Response:', dokumentenklassenResponse);
      
      // apiRequest gibt { data: { success: true, data: {...} }, success: boolean } zurück
      // Also: dokumentenklassenResponse.data ist { success: true, data: valueset }
      const serverResponse = dokumentenklassenResponse?.data;
      const valueset = (serverResponse as any)?.data || serverResponse;
      
      if (valueset && Array.isArray(valueset.codes)) {
        const allCodes = valueset.codes;
        console.log('[ELGA Codes] Dokumentenklassen Valueset gefunden:', valueset.title, valueset.version);
        console.log('[ELGA Codes] Total Codes:', allCodes.length);
        
        // Filtere ClassCodes (level 0)
        const classCodesFiltered = allCodes.filter((c: any) => !c.level || c.level === 0);
        console.log('[ELGA Codes] ClassCodes (level 0):', classCodesFiltered.length);
        setClassCodes(classCodesFiltered);
        
        // Filtere TypeCodes (level 1)
        const typeCodesFiltered = allCodes.filter((c: any) => c.level === 1);
        console.log('[ELGA Codes] TypeCodes (level 1):', typeCodesFiltered.length);
        setTypeCodes(typeCodesFiltered);
      } else {
        console.warn('[ELGA Codes] Keine gültige Antwort für Dokumentenklassen:', dokumentenklassenResponse);
        console.warn('[ELGA Codes] Extrahierte Valueset:', valueset);
        setClassCodes([]);
        setTypeCodes([]);
      }
      
      // Lade FormatCodes
      const formatCodesResponse = await apiRequest.get<{ success: boolean; data: any[]; valuesetsCount?: number }>(
        '/elga-valuesets/codes/by-category',
        { categories: 'formatcode' }
      );
      console.log('[ELGA Codes] FormatCodes Response:', formatCodesResponse);
      
      // apiRequest gibt { data: { success: true, data: [...], valuesetsCount: 1 }, success: boolean } zurück
      const formatCodesServerResponse = formatCodesResponse?.data;
      const codesData = (formatCodesServerResponse as any)?.data || formatCodesServerResponse;
      
      if (formatCodesResponse && formatCodesResponse.success && codesData) {
        const codes = Array.isArray(codesData) ? codesData : [];
        console.log('[ELGA Codes] FormatCodes gefunden:', codes.length);
        setFormatCodes(codes);
      } else {
        console.warn('[ELGA Codes] Keine FormatCodes erhalten:', formatCodesResponse);
        console.warn('[ELGA Codes] Extrahierte Codes:', codesData);
        setFormatCodes([]);
      }
    } catch (error: any) {
      console.error('[ELGA Codes] Fehler beim Laden der ELGA Codes:', error);
      setClassCodes([]);
      setTypeCodes([]);
      setFormatCodes([]);
      // Nicht kritisch - Dialog kann trotzdem verwendet werden mit manueller Eingabe
    } finally {
      setLoadingCodes(false);
    }
  };

  useEffect(() => {
    if (selectedLocation && selectedLocation.xdsRegistry?.enabled) {
      loadDocuments();
    }
  }, [selectedLocation, page, searchTerm, sourceFilter, statusFilter, patientIdFilter]);

  // Filtere Standorte mit aktivierter XDS Registry
  const xdsEnabledLocations = locations.filter(
    (loc) => loc.xdsRegistry?.enabled === true
  );

  const loadDocuments = async () => {
    if (!selectedLocation) return;

    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchTerm && { title: searchTerm }),
        ...(sourceFilter && { source: sourceFilter }),
        ...(statusFilter && { availabilityStatus: statusFilter }),
        ...(patientIdFilter && { patientId: patientIdFilter })
      });
      
      const response = await apiRequest.get<{
        success: boolean;
        data: XdsDocument[];
        pagination: { total: number; limit: number; skip: number; pages: number };
      }>(`/xds/${selectedLocation._id}/query?${params}`);
      
      if (response.success && response.data) {
        const responseData = response.data as any;
        
        // Handle nested response structure
        let documentsData: XdsDocument[] = [];
        let paginationData: any = null;
        
        if (Array.isArray(responseData)) {
          documentsData = responseData;
        } else if (responseData && typeof responseData === 'object') {
          if ('data' in responseData && Array.isArray(responseData.data)) {
            documentsData = responseData.data;
            paginationData = responseData.pagination;
          } else if (Array.isArray(responseData)) {
            documentsData = responseData;
          }
        }
        
        setDocuments(documentsData);
        setTotal(paginationData?.total || documentsData.length || 0);
      }
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err.message || 'Fehler beim Laden der Dokumente');
      setDocuments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedLocation || !selectedFile) {
      setError('Bitte wählen Sie eine Datei aus');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('patientId', uploadMetadata.patientId);
      formData.append('title', uploadMetadata.title || selectedFile.name);
      formData.append('comments', uploadMetadata.comments || '');
      formData.append('source', uploadMetadata.source);
      
      // MIME-Type und Content-Type
      formData.append('mimeType', uploadMetadata.mimeType || selectedFile.type || 'application/pdf');
      formData.append('contentType', uploadMetadata.contentType || uploadMetadata.mimeType || selectedFile.type || 'application/pdf');
      
      // ClassCode
      if (uploadMetadata.classCode.code) {
        formData.append('classCode', JSON.stringify(uploadMetadata.classCode));
      }
      
      // TypeCode (Array)
      const validTypeCodes = uploadMetadata.typeCode.filter(tc => tc.code);
      if (validTypeCodes.length > 0) {
        formData.append('typeCode', JSON.stringify(validTypeCodes));
      }
      
      // FormatCode
      if (uploadMetadata.formatCode.code) {
        formData.append('formatCode', JSON.stringify(uploadMetadata.formatCode));
      }
      
      // Healthcare Facility Type Code
      if (uploadMetadata.healthcareFacilityTypeCode.code) {
        formData.append('healthcareFacilityTypeCode', JSON.stringify(uploadMetadata.healthcareFacilityTypeCode));
      }
      
      // Practice Setting Code
      if (uploadMetadata.practiceSettingCode.code) {
        formData.append('practiceSettingCode', JSON.stringify(uploadMetadata.practiceSettingCode));
      }
      
      // Confidentiality Code
      const validConfCodes = uploadMetadata.confidentialityCode.filter(cc => cc.code);
      if (validConfCodes.length > 0) {
        formData.append('confidentialityCode', JSON.stringify(validConfCodes));
      }
      
      // Service Times
      if (uploadMetadata.serviceStartTime) {
        formData.append('serviceStartTime', uploadMetadata.serviceStartTime);
      }
      if (uploadMetadata.serviceStopTime) {
        formData.append('serviceStopTime', uploadMetadata.serviceStopTime);
      }
      
      // Author
      if (uploadMetadata.authorPerson || uploadMetadata.authorInstitution) {
        const authorData: any = {};
        if (uploadMetadata.authorPerson) authorData.authorPerson = uploadMetadata.authorPerson;
        if (uploadMetadata.authorInstitution) authorData.authorInstitution = [uploadMetadata.authorInstitution];
        if (uploadMetadata.authorRole) authorData.authorRole = [uploadMetadata.authorRole];
        if (uploadMetadata.authorSpecialty) authorData.authorSpecialty = [uploadMetadata.authorSpecialty];
        formData.append('author', JSON.stringify([authorData]));
      }
      
      // Language Code
      if (uploadMetadata.languageCode) {
        formData.append('languageCode', uploadMetadata.languageCode);
      }
      
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5001/api/xds/${selectedLocation._id}/register`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Dokument erfolgreich registriert');
        setUploadDialogOpen(false);
        setSelectedFile(null);
        setUploadMetadata({
          title: '',
          patientId: '',
          comments: '',
          source: 'internal',
          mimeType: '',
          contentType: '',
          classCode: { code: '', codingScheme: '', displayName: '' },
          typeCode: [{ code: '', codingScheme: '', displayName: '' }],
          formatCode: { code: '', codingScheme: '', displayName: '' },
          healthcareFacilityTypeCode: { code: '', codingScheme: '', displayName: '' },
          practiceSettingCode: { code: '', codingScheme: '', displayName: '' },
          confidentialityCode: [{ code: '', codingScheme: '', displayName: '' }],
          serviceStartTime: '',
          serviceStopTime: '',
          authorPerson: '',
          authorInstitution: '',
          authorRole: '',
          authorSpecialty: '',
          languageCode: 'de-AT',
        });
        loadDocuments();
      } else {
        setError(data.message || 'Fehler beim Hochladen');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Hochladen');
    }
  };

  /**
   * Prüft ob ein Dokument ein CDA-Dokument ist
   */
  const isCDADocument = (doc: XdsDocument): boolean => {
    console.log('[CDA Check] Dokument:', doc.title, 'MIME:', doc.mimeType, 'FormatCode:', doc.formatCode);
    
    // Prüfe MIME-Type
    const mimeType = doc.mimeType?.toLowerCase() || '';
    if (mimeType.includes('xml') || mimeType.includes('cda') || mimeType.includes('text/xml') || mimeType.includes('application/xml')) {
      console.log('[CDA Check] Erkannt durch MIME-Type:', mimeType);
      return true;
    }
    
    // Prüfe FormatCode (CDA-Dokumente haben oft spezifische FormatCodes)
    const formatCode = doc.formatCode?.code || '';
    // ELGA CDA FormatCodes beginnen oft mit 1.2.40.0.34.11
    if (formatCode.includes('1.2.40.0.34.11') || formatCode.includes('CDA') || formatCode.includes('2.16.840.1.113883.10.20.1')) {
      console.log('[CDA Check] Erkannt durch FormatCode:', formatCode);
      return true;
    }
    
    // Prüfe TypeCode (z.B. Entlassungsbrief)
    const typeCodes = doc.typeCode || [];
    if (typeCodes.some(tc => tc.code?.includes('1.2.40.0.34.11.2'))) {
      console.log('[CDA Check] Erkannt durch TypeCode (Entlassungsbrief)');
      return true; // Entlassungsbrief
    }
    
    // Prüfe Titel für CDA-Indikatoren (Fallback)
    const title = doc.title?.toLowerCase() || '';
    if (title.includes('entlassungsbrief') || title.includes('cda') || title.includes('elga')) {
      console.log('[CDA Check] Erkannt durch Titel:', doc.title);
      return true;
    }
    
    console.log('[CDA Check] Kein CDA-Dokument erkannt');
    return false;
  };

  /**
   * Öffnet CDA-Dokument im Viewer
   */
  const handleViewCDA = (doc: XdsDocument) => {
    if (!selectedLocation) return;
    
    setViewingDocument(doc);
    setCdaViewerOpen(true);
  };

  const handleRetrieve = async (doc: XdsDocument) => {
    if (!selectedLocation) return;

    try {
      const response = await fetch(
        `http://localhost:5001/api/xds/${selectedLocation._id}/retrieve/${doc._id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Fehler beim Abrufen des Dokuments');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.title || 'document';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess('Dokument erfolgreich heruntergeladen');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Abrufen des Dokuments');
    }
  };

  const handleDeprecate = async (document: XdsDocument) => {
    if (!selectedLocation) return;
    if (!window.confirm('Möchten Sie dieses Dokument wirklich als deprecated markieren?')) return;

    try {
      const response = await apiRequest.put(`/xds/${selectedLocation._id}/deprecate/${document._id}`, {
        reason: 'Manuell deprecated gesetzt'
      });

      if (response.success) {
        setSuccess('Dokument erfolgreich als deprecated markiert');
        loadDocuments();
      } else {
        setError(response.message || 'Fehler beim Deprecaten');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Deprecaten');
    }
  };

  const handleDelete = async (document: XdsDocument) => {
    if (!selectedLocation) return;
    if (!window.confirm('Möchten Sie dieses Dokument wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;

    try {
      const response = await apiRequest.delete(`/xds/${selectedLocation._id}/delete/${document._id}?force=true`);

      if (response.success) {
        setSuccess('Dokument erfolgreich gelöscht');
        loadDocuments();
      } else {
        setError(response.message || 'Fehler beim Löschen');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Löschen');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      
      // Auto-detect MIME-Type from file
      const detectedMimeType = file.type || 'application/octet-stream';
      
      setUploadMetadata(prev => ({
        ...prev,
        title: prev.title || file.name,
        mimeType: prev.mimeType || detectedMimeType,
        contentType: prev.contentType || detectedMimeType,
      }));
    }
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setTabValue(1); // Wechsle zu Dokumente-Tab
    setPage(1);
    setSearchTerm('');
    setSourceFilter('');
    setStatusFilter('');
    setPatientIdFilter('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Storage sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h4" component="h1">
              XDS Dokumentenverwaltung
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Verwalten Sie Dokumente nach Standort mit IHE XDS Registry
            </Typography>
          </Box>
        </Box>
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

      {/* Standort-Auswahl und Dokumente-Ansicht in Tabs */}
      <Card>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Standort auswählen" icon={<LocationOn />} iconPosition="start" />
          {selectedLocation && (
            <Tab 
              label={`Dokumente - ${selectedLocation.name}`} 
              icon={<Description />} 
              iconPosition="start"
            />
          )}
        </Tabs>

        {/* Tab 0: Standort-Auswahl */}
        <TabPanel value={tabValue} index={0}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Verfügbare Standorte mit XDS Registry
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Wählen Sie einen Standort aus, um dessen Dokumente zu verwalten
            </Typography>

            {xdsEnabledLocations.length === 0 ? (
              <Alert severity="info">
                Keine Standorte mit aktivierter XDS Registry gefunden. 
                Bitte aktivieren Sie die XDS Registry in der Standortverwaltung.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {xdsEnabledLocations.map((location) => (
                  <Box key={location._id} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 16px)', md: '1 1 calc(33.333% - 22px)' }, minWidth: { xs: '100%', sm: '250px' } }}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { boxShadow: 4 },
                        border: selectedLocation?._id === location._id ? 2 : 0,
                        borderColor: 'primary.main'
                      }}
                      onClick={() => handleLocationSelect(location)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <LocationOn color="primary" />
                          <Typography variant="h6">{location.name}</Typography>
                        </Box>
                        {location.code && (
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Code: {location.code}
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {location.city}, {location.postal_code}
                        </Typography>
                        {location.xdsRegistry?.repositoryLocation && (
                          <Chip 
                            label="Repository aktiv" 
                            size="small" 
                            color="success" 
                            sx={{ mt: 1 }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Tab 1: Dokumente-Ansicht für ausgewählten Standort */}
        <TabPanel value={tabValue} index={1}>
          {!selectedLocation ? (
            <Alert severity="info">
              Bitte wählen Sie zuerst einen Standort aus.
            </Alert>
          ) : (
            <>
              {/* Standort-Info Banner */}
              <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6" sx={{ color: 'primary.contrastText' }}>
                        {selectedLocation.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'primary.contrastText', opacity: 0.9 }}>
                        Repository: {selectedLocation.xdsRegistry?.repositoryLocation || 'Standardpfad'}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setUploadDialogOpen(true)}
                      sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
                    >
                      Dokument hochladen
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* Filter und Suche */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Suche (Titel)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  sx={{ flex: '1 1 300px', minWidth: 200 }}
                />
                <TextField
                  size="small"
                  label="Patienten-ID"
                  value={patientIdFilter}
                  onChange={(e) => setPatientIdFilter(e.target.value)}
                  sx={{ flex: '1 1 200px', minWidth: 150 }}
                />
                <FormControl size="small" sx={{ flex: '1 1 150px', minWidth: 120 }}>
                  <InputLabel>Quelle</InputLabel>
                  <Select
                    value={sourceFilter}
                    label="Quelle"
                    onChange={(e) => setSourceFilter(e.target.value as string)}
                  >
                    <MenuItem value="">Alle</MenuItem>
                    <MenuItem value="internal">Intern</MenuItem>
                    <MenuItem value="retrieved">Abgerufen</MenuItem>
                    <MenuItem value="patient_upload">Patient-Upload</MenuItem>
                    <MenuItem value="ambulanzbefund">Ambulanzbefund</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: '1 1 150px', minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value as string)}
                  >
                    <MenuItem value="">Alle</MenuItem>
                    <MenuItem value="Approved">Approved</MenuItem>
                    <MenuItem value="Deprecated">Deprecated</MenuItem>
                    <MenuItem value="Submitted">Submitted</MenuItem>
                  </Select>
                </FormControl>
                <IconButton onClick={loadDocuments} title="Aktualisieren">
                  <Refresh />
                </IconButton>
              </Box>

              {loading && <LinearProgress sx={{ mb: 2 }} />}

              {!loading && documents.length === 0 && !error && (
                <Alert severity="info">
                  Keine Dokumente gefunden. Laden Sie ein Dokument hoch, um zu beginnen.
                </Alert>
              )}

              {/* Dokumente-Tabelle */}
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Titel</TableCell>
                      <TableCell>Patienten-ID</TableCell>
                      <TableCell>Quelle</TableCell>
                      <TableCell>Typ</TableCell>
                      <TableCell>Erstellt</TableCell>
                      <TableCell>Größe</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            Lade Dokumente...
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : documents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            Keine Dokumente gefunden
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      documents.map((doc) => (
                        <TableRow key={doc._id} hover>
                          <TableCell>
                            <Tooltip title={doc.title}>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                {doc.title}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" fontFamily="monospace">
                              {doc.patientId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                doc.source === 'internal' ? 'Intern' :
                                doc.source === 'retrieved' ? 'Abgerufen' :
                                doc.source === 'patient_upload' ? 'Patient' : doc.source
                              }
                              size="small"
                              color={
                                doc.source === 'internal' ? 'primary' :
                                doc.source === 'retrieved' ? 'info' :
                                doc.source === 'patient_upload' ? 'success' : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {doc.formatCode?.displayName || doc.formatCode?.code || doc.mimeType || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {new Date(doc.creationTime).toLocaleString('de-DE')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {(doc.size / 1024).toFixed(2)} KB
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={doc.availabilityStatus}
                              size="small"
                              color={doc.availabilityStatus === 'Approved' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {/* Übersicht/Details Button - für alle Dokumente */}
                            <Tooltip title="Dokument-Übersicht">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedDocument(doc);
                                  setDetailDialogOpen(true);
                                }}
                                sx={{ mr: 0.5 }}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            {/* CDA-Viewer Button - für CDA/XML-Dokumente */}
                            {(isCDADocument(doc) || doc.mimeType?.toLowerCase().includes('xml')) && (
                              <Tooltip title="CDA-Dokument mit ELGA Stylesheet anzeigen">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewCDA(doc)}
                                  color="primary"
                                  sx={{ mr: 0.5 }}
                                >
                                  <Article />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Herunterladen">
                              <IconButton
                                size="small"
                                onClick={() => handleRetrieve(doc)}
                                sx={{ mr: 0.5 }}
                              >
                                <Download />
                              </IconButton>
                            </Tooltip>
                            {doc.availabilityStatus !== 'Deprecated' && (
                              <>
                                <Tooltip title="Deprecated markieren">
                                  <IconButton
                                    size="small"
                                    color="warning"
                                    onClick={() => handleDeprecate(doc)}
                                  >
                                    <Edit />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Löschen">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDelete(doc)}
                                  >
                                    <Delete />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
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
            </>
          )}
        </TabPanel>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>XDS Dokument hochladen</DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Standort: <strong>{selectedLocation?.name}</strong>
            </Typography>
            <Divider />

            {/* Basis-Informationen */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1" fontWeight="medium">Basis-Informationen</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.tiff,.xml"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outlined" component="span" fullWidth startIcon={<Upload />}>
                      {selectedFile ? selectedFile.name : 'Datei auswählen'}
                    </Button>
                  </label>
                  <TextField
                    fullWidth
                    label="Titel"
                    value={uploadMetadata.title}
                    onChange={(e) => setUploadMetadata({ ...uploadMetadata, title: e.target.value })}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Patienten-ID"
                    value={uploadMetadata.patientId}
                    onChange={(e) => setUploadMetadata({ ...uploadMetadata, patientId: e.target.value })}
                    required
                  />
                  <TextField
                    fullWidth
                    label="MIME-Type"
                    value={uploadMetadata.mimeType}
                    onChange={(e) => setUploadMetadata({ ...uploadMetadata, mimeType: e.target.value, contentType: e.target.value })}
                    required
                    helperText="z.B. application/pdf, application/xml, text/xml, image/jpeg"
                    placeholder={selectedFile?.type || 'application/pdf'}
                  />
                  <TextField
                    fullWidth
                    label="Kommentar"
                    multiline
                    rows={3}
                    value={uploadMetadata.comments}
                    onChange={(e) => setUploadMetadata({ ...uploadMetadata, comments: e.target.value })}
                  />
                  <FormControl fullWidth>
                    <InputLabel>Quelle</InputLabel>
                    <Select
                      value={uploadMetadata.source}
                      label="Quelle"
                      onChange={(e) => setUploadMetadata({ ...uploadMetadata, source: e.target.value as any })}
                    >
                      <MenuItem value="internal">Intern</MenuItem>
                      <MenuItem value="retrieved">Abgerufen</MenuItem>
                      <MenuItem value="patient_upload">Patient-Upload</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* ClassCode */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1" fontWeight="medium">Class Code (Dokumentenklasse)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Autocomplete
                    options={classCodes}
                    loading={loadingCodes}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      if (!option) return '';
                      // Bevorzuge deutsch/displayName für bessere Lesbarkeit
                      return option.deutsch || option.displayName || option.display || option.code || '';
                    }}
                    isOptionEqualToValue={(option, value) => {
                      if (!option || !value) return false;
                      return option.code === value.code;
                    }}
                    value={classCodes.find(c => c && c.code === uploadMetadata.classCode.code) || null}
                    onChange={(event, newValue) => {
                      if (newValue) {
                        setUploadMetadata({
                          ...uploadMetadata,
                          classCode: {
                            code: newValue.code || '',
                            codingScheme: newValue.codingScheme || newValue.system || newValue.valuesetOid || '',
                            displayName: newValue.deutsch || newValue.displayName || newValue.display || ''
                          }
                        });
                      } else {
                        setUploadMetadata({
                          ...uploadMetadata,
                          classCode: { code: '', codingScheme: '', displayName: '' }
                        });
                      }
                    }}
                    noOptionsText={loadingCodes ? "Lade Codes..." : classCodes.length === 0 ? "Keine Codes verfügbar" : "Keine Optionen"}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Class Code auswählen"
                        placeholder="Class Code suchen..."
                        helperText={`${classCodes.length} Codes verfügbar. Code, Coding Scheme und Display Name werden automatisch befüllt`}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option.code || option._id}>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {option.deutsch || option.displayName || option.display || option.code || 'Unbekannt'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                            Code: {option.code || '-'}
                            {option.system && ` | System: ${option.system}`}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  />
                  <TextField
                    fullWidth
                    label="Code"
                    value={uploadMetadata.classCode.code}
                    onChange={(e) => setUploadMetadata({
                      ...uploadMetadata,
                      classCode: { ...uploadMetadata.classCode, code: e.target.value }
                    })}
                    placeholder="z.B. 1.2.40.0.34.5.1"
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Coding Scheme"
                    value={uploadMetadata.classCode.codingScheme}
                    onChange={(e) => setUploadMetadata({
                      ...uploadMetadata,
                      classCode: { ...uploadMetadata.classCode, codingScheme: e.target.value }
                    })}
                    placeholder="z.B. 1.2.40.0.34.5.1"
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Display Name"
                    value={uploadMetadata.classCode.displayName}
                    onChange={(e) => setUploadMetadata({
                      ...uploadMetadata,
                      classCode: { ...uploadMetadata.classCode, displayName: e.target.value }
                    })}
                    placeholder="z.B. Entlassungsbrief"
                    size="small"
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* TypeCode */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1" fontWeight="medium">Type Code (Dokumententyp)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  {uploadMetadata.typeCode.map((tc, index) => (
                    <Box key={index} sx={{ border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 1 }}>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight="medium">Type Code {index + 1}</Typography>
                          {uploadMetadata.typeCode.length > 1 && (
                            <Button
                              size="small"
                              color="error"
                              onClick={() => {
                                const newTypeCodes = uploadMetadata.typeCode.filter((_, i) => i !== index);
                                setUploadMetadata({ ...uploadMetadata, typeCode: newTypeCodes });
                              }}
                            >
                              Entfernen
                            </Button>
                          )}
                        </Box>
                        <Autocomplete
                          options={typeCodes}
                          loading={loadingCodes}
                          getOptionLabel={(option) => {
                            if (typeof option === 'string') return option;
                            if (!option) return '';
                            return option.display || option.deutsch || option.code || '';
                          }}
                          isOptionEqualToValue={(option, value) => {
                            if (!option || !value) return false;
                            return option.code === value.code;
                          }}
                          value={typeCodes.find(c => c && c.code === tc.code) || null}
                          onChange={(event, newValue) => {
                            const newTypeCodes = [...uploadMetadata.typeCode];
                            if (newValue) {
                              newTypeCodes[index] = {
                                code: newValue.code || '',
                                codingScheme: newValue.codingScheme || newValue.system || newValue.valuesetOid || '',
                                displayName: newValue.deutsch || newValue.displayName || newValue.display || ''
                              };
                            } else {
                              newTypeCodes[index] = { code: '', codingScheme: '', displayName: '' };
                            }
                            setUploadMetadata({ ...uploadMetadata, typeCode: newTypeCodes });
                          }}
                          noOptionsText={loadingCodes ? "Lade Codes..." : typeCodes.length === 0 ? "Keine Codes verfügbar" : "Keine Optionen"}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              size="small"
                              label="Type Code auswählen"
                              placeholder="Type Code suchen..."
                              helperText={`${typeCodes.length} Codes verfügbar`}
                            />
                          )}
                          renderOption={(props, option) => (
                            <Box component="li" {...props} key={option.code || option._id}>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {option.display || option.deutsch || option.code || 'Unbekannt'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                                  Code: {option.code || '-'}
                                  {option.parentCode && ` | Parent: ${option.parentCode}`}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label="Code"
                          value={tc.code}
                          onChange={(e) => {
                            const newTypeCodes = [...uploadMetadata.typeCode];
                            newTypeCodes[index] = { ...tc, code: e.target.value };
                            setUploadMetadata({ ...uploadMetadata, typeCode: newTypeCodes });
                          }}
                          placeholder="z.B. 1.2.40.0.34.11.2.0.3"
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label="Coding Scheme"
                          value={tc.codingScheme}
                          onChange={(e) => {
                            const newTypeCodes = [...uploadMetadata.typeCode];
                            newTypeCodes[index] = { ...tc, codingScheme: e.target.value };
                            setUploadMetadata({ ...uploadMetadata, typeCode: newTypeCodes });
                          }}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label="Display Name"
                          value={tc.displayName}
                          onChange={(e) => {
                            const newTypeCodes = [...uploadMetadata.typeCode];
                            newTypeCodes[index] = { ...tc, displayName: e.target.value };
                            setUploadMetadata({ ...uploadMetadata, typeCode: newTypeCodes });
                          }}
                          placeholder="z.B. Entlassungsbrief (Ärztlich)"
                        />
                      </Stack>
                    </Box>
                  ))}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setUploadMetadata({
                        ...uploadMetadata,
                        typeCode: [...uploadMetadata.typeCode, { code: '', codingScheme: '', displayName: '' }]
                      });
                    }}
                  >
                    Weitere Type Code hinzufügen
                  </Button>
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* FormatCode */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1" fontWeight="medium">Format Code</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Autocomplete
                    options={formatCodes}
                    loading={loadingCodes}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      if (!option) return '';
                      return option.display || option.code || '';
                    }}
                    isOptionEqualToValue={(option, value) => {
                      if (!option || !value) return false;
                      return option.code === value.code;
                    }}
                    value={formatCodes.find(c => c && c.code === uploadMetadata.formatCode.code) || null}
                    onChange={(event, newValue) => {
                      if (newValue) {
                        setUploadMetadata({
                          ...uploadMetadata,
                          formatCode: {
                            code: newValue.code || '',
                            codingScheme: newValue.codingScheme || newValue.system || newValue.valuesetOid || '',
                            displayName: newValue.deutsch || newValue.displayName || newValue.display || ''
                          }
                        });
                      } else {
                        setUploadMetadata({
                          ...uploadMetadata,
                          formatCode: { code: '', codingScheme: '', displayName: '' }
                        });
                      }
                    }}
                    noOptionsText={loadingCodes ? "Lade Codes..." : formatCodes.length === 0 ? "Keine Codes verfügbar" : "Keine Optionen"}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Format Code auswählen"
                        placeholder="Format Code suchen..."
                        helperText={`${formatCodes.length} Codes verfügbar. Code, Coding Scheme und Display Name werden automatisch befüllt`}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option.code || option._id}>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {option.deutsch || option.displayName || option.display || option.code || 'Unbekannt'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                            Code: {option.code || '-'}
                            {option.system && ` | System: ${option.system}`}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  />
                  <TextField
                    fullWidth
                    label="Code"
                    value={uploadMetadata.formatCode.code}
                    onChange={(e) => setUploadMetadata({
                      ...uploadMetadata,
                      formatCode: { ...uploadMetadata.formatCode, code: e.target.value }
                    })}
                    placeholder="z.B. 1.2.40.0.34.11.1"
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Coding Scheme"
                    value={uploadMetadata.formatCode.codingScheme}
                    onChange={(e) => setUploadMetadata({
                      ...uploadMetadata,
                      formatCode: { ...uploadMetadata.formatCode, codingScheme: e.target.value }
                    })}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Display Name"
                    value={uploadMetadata.formatCode.displayName}
                    onChange={(e) => setUploadMetadata({
                      ...uploadMetadata,
                      formatCode: { ...uploadMetadata.formatCode, displayName: e.target.value }
                    })}
                    placeholder="z.B. ELGA CDA"
                    size="small"
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Healthcare Facility Type Code */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1" fontWeight="medium">Healthcare Facility Type Code</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Code"
                    value={uploadMetadata.healthcareFacilityTypeCode.code}
                    onChange={(e) => setUploadMetadata({
                      ...uploadMetadata,
                      healthcareFacilityTypeCode: { ...uploadMetadata.healthcareFacilityTypeCode, code: e.target.value }
                    })}
                  />
                  <TextField
                    fullWidth
                    label="Coding Scheme"
                    value={uploadMetadata.healthcareFacilityTypeCode.codingScheme}
                    onChange={(e) => setUploadMetadata({
                      ...uploadMetadata,
                      healthcareFacilityTypeCode: { ...uploadMetadata.healthcareFacilityTypeCode, codingScheme: e.target.value }
                    })}
                  />
                  <TextField
                    fullWidth
                    label="Display Name"
                    value={uploadMetadata.healthcareFacilityTypeCode.displayName}
                    onChange={(e) => setUploadMetadata({
                      ...uploadMetadata,
                      healthcareFacilityTypeCode: { ...uploadMetadata.healthcareFacilityTypeCode, displayName: e.target.value }
                    })}
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Practice Setting Code */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1" fontWeight="medium">Practice Setting Code</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Code"
                    value={uploadMetadata.practiceSettingCode.code}
                    onChange={(e) => setUploadMetadata({
                      ...uploadMetadata,
                      practiceSettingCode: { ...uploadMetadata.practiceSettingCode, code: e.target.value }
                    })}
                  />
                  <TextField
                    fullWidth
                    label="Coding Scheme"
                    value={uploadMetadata.practiceSettingCode.codingScheme}
                    onChange={(e) => setUploadMetadata({
                      ...uploadMetadata,
                      practiceSettingCode: { ...uploadMetadata.practiceSettingCode, codingScheme: e.target.value }
                    })}
                  />
                  <TextField
                    fullWidth
                    label="Display Name"
                    value={uploadMetadata.practiceSettingCode.displayName}
                    onChange={(e) => setUploadMetadata({
                      ...uploadMetadata,
                      practiceSettingCode: { ...uploadMetadata.practiceSettingCode, displayName: e.target.value }
                    })}
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Confidentiality Code */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1" fontWeight="medium">Confidentiality Code</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  {uploadMetadata.confidentialityCode.map((cc, index) => (
                    <Box key={index} sx={{ border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 1 }}>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight="medium">Confidentiality Code {index + 1}</Typography>
                          {uploadMetadata.confidentialityCode.length > 1 && (
                            <Button
                              size="small"
                              color="error"
                              onClick={() => {
                                const newCodes = uploadMetadata.confidentialityCode.filter((_, i) => i !== index);
                                setUploadMetadata({ ...uploadMetadata, confidentialityCode: newCodes });
                              }}
                            >
                              Entfernen
                            </Button>
                          )}
                        </Box>
                        <TextField
                          fullWidth
                          size="small"
                          label="Code"
                          value={cc.code}
                          onChange={(e) => {
                            const newCodes = [...uploadMetadata.confidentialityCode];
                            newCodes[index] = { ...cc, code: e.target.value };
                            setUploadMetadata({ ...uploadMetadata, confidentialityCode: newCodes });
                          }}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label="Coding Scheme"
                          value={cc.codingScheme}
                          onChange={(e) => {
                            const newCodes = [...uploadMetadata.confidentialityCode];
                            newCodes[index] = { ...cc, codingScheme: e.target.value };
                            setUploadMetadata({ ...uploadMetadata, confidentialityCode: newCodes });
                          }}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label="Display Name"
                          value={cc.displayName}
                          onChange={(e) => {
                            const newCodes = [...uploadMetadata.confidentialityCode];
                            newCodes[index] = { ...cc, displayName: e.target.value };
                            setUploadMetadata({ ...uploadMetadata, confidentialityCode: newCodes });
                          }}
                        />
                      </Stack>
                    </Box>
                  ))}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setUploadMetadata({
                        ...uploadMetadata,
                        confidentialityCode: [...uploadMetadata.confidentialityCode, { code: '', codingScheme: '', displayName: '' }]
                      });
                    }}
                  >
                    Weitere Confidentiality Code hinzufügen
                  </Button>
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Service Times */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1" fontWeight="medium">Service-Zeiten</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2} direction="row">
                  <TextField
                    fullWidth
                    label="Service Start Time"
                    type="datetime-local"
                    value={uploadMetadata.serviceStartTime}
                    onChange={(e) => setUploadMetadata({ ...uploadMetadata, serviceStartTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    label="Service Stop Time"
                    type="datetime-local"
                    value={uploadMetadata.serviceStopTime}
                    onChange={(e) => setUploadMetadata({ ...uploadMetadata, serviceStopTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Author */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1" fontWeight="medium">Autor</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Autor Person"
                    value={uploadMetadata.authorPerson}
                    onChange={(e) => setUploadMetadata({ ...uploadMetadata, authorPerson: e.target.value })}
                    placeholder="z.B. Dr. Max Mustermann"
                  />
                  <TextField
                    fullWidth
                    label="Autor Institution"
                    value={uploadMetadata.authorInstitution}
                    onChange={(e) => setUploadMetadata({ ...uploadMetadata, authorInstitution: e.target.value })}
                    placeholder="z.B. Amadeus Spital"
                  />
                  <TextField
                    fullWidth
                    label="Autor Rolle"
                    value={uploadMetadata.authorRole}
                    onChange={(e) => setUploadMetadata({ ...uploadMetadata, authorRole: e.target.value })}
                    placeholder="z.B. Arzt"
                  />
                  <TextField
                    fullWidth
                    label="Autor Fachgebiet"
                    value={uploadMetadata.authorSpecialty}
                    onChange={(e) => setUploadMetadata({ ...uploadMetadata, authorSpecialty: e.target.value })}
                    placeholder="z.B. Allgemeinmedizin"
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Language Code */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1" fontWeight="medium">Sprache</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  fullWidth
                  label="Language Code"
                  value={uploadMetadata.languageCode}
                  onChange={(e) => setUploadMetadata({ ...uploadMetadata, languageCode: e.target.value })}
                  helperText="z.B. de-AT, en-US"
                />
              </AccordionDetails>
            </Accordion>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleUpload} variant="contained" disabled={!selectedFile || !uploadMetadata.patientId || !uploadMetadata.mimeType}>
            Hochladen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog - XDS Dokument-Übersicht */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Visibility />
            <span>XDS Dokument-Übersicht</span>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {selectedDocument ? (
            <Stack spacing={3}>
              {/* Basis-Informationen */}
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                  Basis-Informationen
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">Titel</Typography>
                    <Typography variant="body1" fontWeight="medium">{selectedDocument.title}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">Patienten-ID</Typography>
                    <Typography variant="body1" fontFamily="monospace">{selectedDocument.patientId}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Chip
                      label={selectedDocument.availabilityStatus}
                      size="small"
                      color={selectedDocument.availabilityStatus === 'Approved' ? 'success' : 'default'}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">Quelle</Typography>
                    <Chip
                      label={
                        selectedDocument.source === 'internal' ? 'Intern' :
                        selectedDocument.source === 'retrieved' ? 'Abgerufen' :
                        selectedDocument.source === 'patient_upload' ? 'Patient-Upload' : selectedDocument.source
                      }
                      size="small"
                      color={
                        selectedDocument.source === 'internal' ? 'primary' :
                        selectedDocument.source === 'retrieved' ? 'info' :
                        selectedDocument.source === 'patient_upload' ? 'success' : 'default'
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">MIME Type</Typography>
                    <Typography variant="body1">{selectedDocument.mimeType || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">Größe</Typography>
                    <Typography variant="body1">{(selectedDocument.size / 1024).toFixed(2)} KB</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">Erstellt am</Typography>
                    <Typography variant="body1">{new Date(selectedDocument.creationTime).toLocaleString('de-DE')}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">Language Code</Typography>
                    <Typography variant="body1">{(selectedDocument as any).languageCode || 'de-AT'}</Typography>
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* XDS-IDs */}
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                  XDS-IDs
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">Entry UUID</Typography>
                    <Typography variant="body1" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                      {selectedDocument.entryUUID}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">Unique ID</Typography>
                    <Typography variant="body1" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                      {selectedDocument.uniqueId}
                    </Typography>
                  </Grid>
                  {(selectedDocument as any).repositoryUniqueId && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="body2" color="text.secondary">Repository Unique ID</Typography>
                      <Typography variant="body1" fontFamily="monospace">
                        {(selectedDocument as any).repositoryUniqueId}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>

              <Divider />

              {/* ClassCode */}
              {selectedDocument.classCode?.code && (
                <>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                      Class Code (Dokumentenklasse)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">Code</Typography>
                        <Typography variant="body1" fontFamily="monospace">{selectedDocument.classCode.code}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">Coding Scheme</Typography>
                        <Typography variant="body1">{selectedDocument.classCode.codingScheme || '-'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">Display Name</Typography>
                        <Typography variant="body1" fontWeight="medium">{selectedDocument.classCode.displayName || '-'}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  <Divider />
                </>
              )}

              {/* TypeCode */}
              {selectedDocument.typeCode && Array.isArray(selectedDocument.typeCode) && selectedDocument.typeCode.length > 0 && selectedDocument.typeCode[0]?.code && (
                <>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                      Type Code (Dokumententyp)
                    </Typography>
                    <Stack spacing={2}>
                      {selectedDocument.typeCode.map((tc, index) => (
                        <Box key={index} sx={{ border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 1 }}>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="body2" color="text.secondary">Code</Typography>
                              <Typography variant="body1" fontFamily="monospace">{tc.code}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="body2" color="text.secondary">Coding Scheme</Typography>
                              <Typography variant="body1">{tc.codingScheme || '-'}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="body2" color="text.secondary">Display Name</Typography>
                              <Typography variant="body1" fontWeight="medium">{tc.displayName || '-'}</Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                  <Divider />
                </>
              )}

              {/* FormatCode */}
              {selectedDocument.formatCode?.code && (
                <>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                      Format Code
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">Code</Typography>
                        <Typography variant="body1" fontFamily="monospace">{selectedDocument.formatCode.code}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">Coding Scheme</Typography>
                        <Typography variant="body1">{selectedDocument.formatCode.codingScheme || '-'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">Display Name</Typography>
                        <Typography variant="body1" fontWeight="medium">{selectedDocument.formatCode.displayName || '-'}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  <Divider />
                </>
              )}

              {/* Healthcare Facility Type Code */}
              {(selectedDocument as any).healthcareFacilityTypeCode?.code && (
                <>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                      Healthcare Facility Type Code
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">Code</Typography>
                        <Typography variant="body1" fontFamily="monospace">{(selectedDocument as any).healthcareFacilityTypeCode.code}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">Coding Scheme</Typography>
                        <Typography variant="body1">{(selectedDocument as any).healthcareFacilityTypeCode.codingScheme || '-'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">Display Name</Typography>
                        <Typography variant="body1" fontWeight="medium">{(selectedDocument as any).healthcareFacilityTypeCode.displayName || '-'}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  <Divider />
                </>
              )}

              {/* Practice Setting Code */}
              {(selectedDocument as any).practiceSettingCode?.code && (
                <>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                      Practice Setting Code
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">Code</Typography>
                        <Typography variant="body1" fontFamily="monospace">{(selectedDocument as any).practiceSettingCode.code}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">Coding Scheme</Typography>
                        <Typography variant="body1">{(selectedDocument as any).practiceSettingCode.codingScheme || '-'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="body2" color="text.secondary">Display Name</Typography>
                        <Typography variant="body1" fontWeight="medium">{(selectedDocument as any).practiceSettingCode.displayName || '-'}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  <Divider />
                </>
              )}

              {/* Confidentiality Code */}
              {(selectedDocument as any).confidentialityCode && Array.isArray((selectedDocument as any).confidentialityCode) && (selectedDocument as any).confidentialityCode.length > 0 && (selectedDocument as any).confidentialityCode[0]?.code && (
                <>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                      Confidentiality Code
                    </Typography>
                    <Stack spacing={2}>
                      {(selectedDocument as any).confidentialityCode.map((cc: any, index: number) => (
                        <Box key={index} sx={{ border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 1 }}>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="body2" color="text.secondary">Code</Typography>
                              <Typography variant="body1" fontFamily="monospace">{cc.code}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="body2" color="text.secondary">Coding Scheme</Typography>
                              <Typography variant="body1">{cc.codingScheme || '-'}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="body2" color="text.secondary">Display Name</Typography>
                              <Typography variant="body1" fontWeight="medium">{cc.displayName || '-'}</Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                  <Divider />
                </>
              )}

              {/* Service Times */}
              {((selectedDocument as any).serviceStartTime || (selectedDocument as any).serviceStopTime) && (
                <>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                      Service-Zeiten
                    </Typography>
                    <Grid container spacing={2}>
                      {(selectedDocument as any).serviceStartTime && (
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant="body2" color="text.secondary">Service Start Time</Typography>
                          <Typography variant="body1">
                            {new Date((selectedDocument as any).serviceStartTime).toLocaleString('de-DE')}
                          </Typography>
                        </Grid>
                      )}
                      {(selectedDocument as any).serviceStopTime && (
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant="body2" color="text.secondary">Service Stop Time</Typography>
                          <Typography variant="body1">
                            {new Date((selectedDocument as any).serviceStopTime).toLocaleString('de-DE')}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                  <Divider />
                </>
              )}

              {/* Author */}
              {(selectedDocument as any).author && Array.isArray((selectedDocument as any).author) && (selectedDocument as any).author.length > 0 && (
                <>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                      Autor
                    </Typography>
                    <Stack spacing={2}>
                      {(selectedDocument as any).author.map((author: any, index: number) => (
                        <Box key={index} sx={{ border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 1 }}>
                          <Grid container spacing={2}>
                            {author.authorPerson && (
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant="body2" color="text.secondary">Person</Typography>
                                <Typography variant="body1" fontWeight="medium">{author.authorPerson}</Typography>
                              </Grid>
                            )}
                            {author.authorInstitution && Array.isArray(author.authorInstitution) && author.authorInstitution.length > 0 && (
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant="body2" color="text.secondary">Institution</Typography>
                                <Typography variant="body1">{author.authorInstitution.join(', ')}</Typography>
                              </Grid>
                            )}
                            {author.authorRole && Array.isArray(author.authorRole) && author.authorRole.length > 0 && (
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant="body2" color="text.secondary">Rolle</Typography>
                                <Typography variant="body1">{author.authorRole.join(', ')}</Typography>
                              </Grid>
                            )}
                            {author.authorSpecialty && Array.isArray(author.authorSpecialty) && author.authorSpecialty.length > 0 && (
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant="body2" color="text.secondary">Fachgebiet</Typography>
                                <Typography variant="body1">{author.authorSpecialty.join(', ')}</Typography>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                  <Divider />
                </>
              )}

              {/* Zusätzliche Metadaten */}
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                  Zusätzliche Informationen
                </Typography>
                <Grid container spacing={2}>
                  {(selectedDocument as any).submittedBy?.userName && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Hochgeladen von</Typography>
                      <Typography variant="body1">{(selectedDocument as any).submittedBy.userName}</Typography>
                      {(selectedDocument as any).submittedBy.userRole && (
                        <Typography variant="caption" color="text.secondary">
                          ({(selectedDocument as any).submittedBy.userRole})
                        </Typography>
                      )}
                    </Grid>
                  )}
                  {(selectedDocument as any).submittedAt && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Hochgeladen am</Typography>
                      <Typography variant="body1">
                        {new Date((selectedDocument as any).submittedAt).toLocaleString('de-DE')}
                      </Typography>
                    </Grid>
                  )}
                  {(selectedDocument as any).updatedAt && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">Zuletzt aktualisiert</Typography>
                      <Typography variant="body1">
                        {new Date((selectedDocument as any).updatedAt).toLocaleString('de-DE')}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Stack>
          ) : (
            <Typography>Keine Details verfügbar.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Schließen</Button>
          {selectedDocument && (
            <>
              {/* CDA-Viewer Button wenn CDA-Dokument */}
              {(isCDADocument(selectedDocument) || selectedDocument.mimeType?.toLowerCase().includes('xml')) && (
                <Button
                  onClick={() => {
                    setDetailDialogOpen(false);
                    handleViewCDA(selectedDocument);
                  }}
                  variant="outlined"
                  startIcon={<Article />}
                  color="primary"
                >
                  Mit ELGA Stylesheet anzeigen
                </Button>
              )}
              <Button
                onClick={() => {
                  setDetailDialogOpen(false);
                  handleRetrieve(selectedDocument);
                }}
                variant="contained"
                startIcon={<Download />}
              >
                Herunterladen
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* CDA Document Viewer */}
      {selectedLocation && viewingDocument && (
        <CDADocumentViewer
          open={cdaViewerOpen}
          onClose={() => {
            setCdaViewerOpen(false);
            setViewingDocument(null);
          }}
          locationId={selectedLocation._id}
          documentId={viewingDocument._id}
          documentTitle={viewingDocument.title || 'CDA Dokument'}
        />
      )}
    </Box>
  );
};

export default XdsDocumentManagement;

