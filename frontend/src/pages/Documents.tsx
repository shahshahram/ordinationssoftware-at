import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import GradientDialogTitle from '../components/GradientDialogTitle';
import { 
  fetchDocuments, 
  fetchStatistics, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  uploadAttachment,
  clearError,
  Document
} from '../store/slices/documentSlice';
import { 
  fetchDocumentTemplates,
  DocumentTemplate
} from '../store/slices/documentTemplateSlice';
import { fetchPatients, Patient } from '../store/slices/patientSlice';
import PatientTimeline from '../components/PatientTimeline';
import {
  Box,
  Typography,
  Card,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
  Divider,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Print,
  AttachFile,
  Download,
  Description,
  LocalHospital,
  Assignment,
  Receipt,
  Assessment,
  Description as FormIcon,
  MoreHoriz,
  Person,
  PendingActions,
  Timeline as TimelineIcon,
  Close,
} from '@mui/icons-material';

const Documents: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { documents, loading, error, statistics } = useAppSelector((state) => state.documents);
  const { templates: documentTemplates } = useAppSelector((state) => state.documentTemplates);
  const { patients } = useAppSelector((state) => state.patients);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'view'>('add');
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'warning' | 'info' 
  });
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [selectedPatientForTimeline, setSelectedPatientForTimeline] = useState<Patient | null>(null);
  const [formData, setFormData] = useState<Partial<Document>>({
    title: '',
    type: 'rezept',
    content: {
      text: ''
    },
    patient: {
      id: '',
      name: '',
      dateOfBirth: '',
      socialSecurityNumber: '',
      insuranceProvider: ''
    },
    status: 'draft',
    priority: 'normal'
  });

  // Load data
  useEffect(() => {
    dispatch(fetchDocuments({}));
    dispatch(fetchDocumentTemplates({}));
    dispatch(fetchStatistics({}));
    dispatch(fetchPatients(1));
  }, [dispatch]);

  // Show error messages
  useEffect(() => {
    if (error) {
      setSnackbar({ open: true, message: error, severity: 'error' });
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleAddNew = () => {
    setFormData({
      title: '',
      type: 'rezept',
      content: {
        text: ''
      },
      patient: {
        id: '',
        name: '',
        dateOfBirth: '',
        socialSecurityNumber: '',
        insuranceProvider: ''
      },
      status: 'draft',
      priority: 'normal'
    });
    setDialogMode('add');
    setActiveTab(0);
    setOpenDialog(true);
  };

  const handleEdit = (document: Document) => {
    setFormData(document);
    setDialogMode('edit');
    setActiveTab(0);
    setOpenDialog(true);
  };

  const handleView = (document: Document) => {
    setFormData(document);
    setDialogMode('view');
    setActiveTab(0);
    setOpenDialog(true);
  };

  const handleDelete = async (document: Document) => {
    if (window.confirm(`Möchten Sie das Dokument "${document.title}" wirklich löschen?`)) {
      try {
        await dispatch(deleteDocument(document._id || document.id || '')).unwrap();
        setSnackbar({ open: true, message: 'Dokument erfolgreich gelöscht', severity: 'success' });
      } catch (error) {
        setSnackbar({ open: true, message: 'Fehler beim Löschen des Dokuments', severity: 'error' });
      }
    }
  };

  const handleNavigateToPatient = (document: Document) => {
    if (document.patient?.id) {
      navigate(`/patient-organizer/${document.patient.id}`);
    }
  };

  const handleOpenTimeline = () => {
    // Finde den ersten Patienten aus den Dokumenten
    const documentsArray = Array.isArray(documents) ? documents : ((documents as any)?.data || []);
    const firstDocumentWithPatient = documentsArray.find((doc: any) => doc.patient?.id);
    
    if (firstDocumentWithPatient?.patient?.id) {
      const patientId = firstDocumentWithPatient.patient.id;
      const patient = (patients as Patient[])?.find((p: Patient) => (p._id || p.id) === patientId);
      
      if (patient) {
        setSelectedPatientForTimeline(patient);
        setTimelineDialogOpen(true);
      } else {
        // Wenn Patient nicht im Store ist, navigiere zum PatientOrganizer
        navigate(`/patient-organizer/${patientId}`);
      }
    } else if (selectedDocument?.patient?.id) {
      const patientId = selectedDocument.patient.id;
      const patient = (patients as Patient[])?.find((p: Patient) => (p._id || p.id) === patientId);
      
      if (patient) {
        setSelectedPatientForTimeline(patient);
        setTimelineDialogOpen(true);
      } else {
        navigate(`/patient-organizer/${patientId}`);
      }
    } else {
      setSnackbar({ 
        open: true, 
        message: 'Kein Patient ausgewählt. Bitte wählen Sie ein Dokument mit einem zugeordneten Patienten aus.', 
        severity: 'warning' 
      });
    }
  };

  const handleSave = async () => {
    // Validierung
    if (!formData.title?.trim()) {
      setSnackbar({ open: true, message: 'Titel ist erforderlich', severity: 'error' });
      return;
    }
    if (!formData.patient?.name?.trim()) {
      setSnackbar({ open: true, message: 'Patientenname ist erforderlich', severity: 'error' });
      return;
    }
    if (!formData.patient?.dateOfBirth?.trim()) {
      setSnackbar({ open: true, message: 'Geburtsdatum ist erforderlich', severity: 'error' });
      return;
    }
    if (!formData.content?.text?.trim()) {
      setSnackbar({ open: true, message: 'Inhalt ist erforderlich', severity: 'error' });
      return;
    }

    try {
      // Generiere eine temporäre Patient-ID falls nicht vorhanden
      const documentData = {
        ...formData,
        patient: {
          ...formData.patient,
          id: formData.patient?.id || `temp-${Date.now()}`
        }
      };

      if (dialogMode === 'add') {
        await dispatch(createDocument(documentData)).unwrap();
        setSnackbar({ open: true, message: 'Dokument erfolgreich erstellt', severity: 'success' });
      } else if (dialogMode === 'edit') {
        await dispatch(updateDocument({ 
          id: formData._id || formData.id || '', 
          documentData: documentData 
        })).unwrap();
        setSnackbar({ open: true, message: 'Dokument erfolgreich aktualisiert', severity: 'success' });
      }
      setOpenDialog(false);
      dispatch(fetchDocuments({}));
    } catch (error) {
      setSnackbar({ open: true, message: 'Fehler beim Speichern des Dokuments', severity: 'error' });
    }
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && selectedDocument) {
      try {
        await dispatch(uploadAttachment({ 
          id: selectedDocument._id || selectedDocument.id || '', 
          files: Array.from(files) 
        })).unwrap();
        setSnackbar({ open: true, message: 'Anhänge erfolgreich hochgeladen', severity: 'success' });
        dispatch(fetchDocuments({}));
      } catch (error) {
        setSnackbar({ open: true, message: 'Fehler beim Hochladen der Anhänge', severity: 'error' });
      }
    }
  };

  const documentsArray = Array.isArray(documents) ? documents : ((documents as any)?.data || []);
  
  // Zähle Dokumente zur Prüfung
  const documentsUnderReview = documentsArray.filter((doc: any) => doc.status === 'under_review').length;
  
  const filteredDocuments = documentsArray.filter((doc: any) => {
    const matchesSearch = doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || doc.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const paginatedDocuments = filteredDocuments.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'rezept': return <LocalHospital />;
      case 'ueberweisung': return <Assignment />;
      case 'arztbrief': return <Description />;
      case 'befund': return <Assessment />;
      case 'formular': return <FormIcon />;
      case 'rechnung': return <Receipt />;
      default: return <Description />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'rezept': return 'primary';
      case 'ueberweisung': return 'secondary';
      case 'arztbrief': return 'success';
      case 'befund': return 'info';
      case 'formular': return 'warning';
      case 'rechnung': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'ready': return 'info';
      case 'sent': return 'success';
      case 'received': return 'primary';
      case 'archived': return 'default';
      case 'under_review': return 'warning';
      case 'released': return 'success';
      case 'withdrawn': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Entwurf';
      case 'ready': return 'Bereit';
      case 'sent': return 'Gesendet';
      case 'received': return 'Empfangen';
      case 'archived': return 'Archiviert';
      case 'under_review': return 'In Prüfung';
      case 'released': return 'Freigegeben';
      case 'withdrawn': return 'Zurückgezogen';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'niedrig': return 'success';
      case 'normal': return 'info';
      case 'hoch': return 'warning';
      case 'dringend': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Dokumentenverwaltung
        </Typography>
        <Box display="flex" gap={1} alignItems="center">
          <Tooltip title="Patienten-Timeline anzeigen">
            <IconButton
              onClick={handleOpenTimeline}
              color="primary"
              sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <TimelineIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddNew}
            sx={{ borderRadius: 2 }}
          >
            Neues Dokument
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        {statistics && (
          <Card sx={{ p: 2, textAlign: 'center', flex: '1 1 200px', minWidth: '200px' }}>
            <Typography variant="h4" color="primary">
              {statistics.total || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gesamt Dokumente
            </Typography>
          </Card>
        )}
        {/* Karte "Zur Prüfung" - immer sichtbar */}
        <Card 
          sx={{ 
            p: 2, 
            textAlign: 'center', 
            flex: '1 1 200px', 
            minWidth: '200px',
            cursor: documentsUnderReview > 0 ? 'pointer' : 'default',
            border: documentsUnderReview > 0 ? '2px solid' : '1px solid',
            borderColor: documentsUnderReview > 0 ? 'warning.main' : 'divider',
            backgroundColor: documentsUnderReview > 0 ? 'warning.50' : 'background.paper',
            '&:hover': documentsUnderReview > 0 ? {
              boxShadow: 4,
              transform: 'scale(1.02)',
              transition: 'all 0.2s',
              borderColor: 'warning.dark'
            } : {}
          }}
          onClick={() => {
            if (documentsUnderReview > 0) {
              setStatusFilter('under_review');
              setPage(0);
            }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1 }}>
            <PendingActions 
              sx={{ 
                fontSize: 32, 
                color: documentsUnderReview > 0 ? 'warning.main' : 'text.secondary',
                mr: 1
              }} 
            />
            <Badge 
              badgeContent={documentsUnderReview} 
              color="warning" 
              max={99}
              invisible={documentsUnderReview === 0}
            >
              <Typography 
                variant="h4" 
                color={documentsUnderReview > 0 ? 'warning.main' : 'text.secondary'}
                sx={{ fontWeight: documentsUnderReview > 0 ? 600 : 400 }}
              >
                {documentsUnderReview}
              </Typography>
            </Badge>
          </Box>
          <Typography 
            variant="body2" 
            color={documentsUnderReview > 0 ? 'text.primary' : 'text.secondary'}
            sx={{ fontWeight: documentsUnderReview > 0 ? 500 : 400 }}
          >
            Zur Prüfung
          </Typography>
        </Card>
        {statistics && (
          <>
            <Card sx={{ p: 2, textAlign: 'center', flex: '1 1 200px', minWidth: '200px' }}>
              <Typography variant="h4" color="success.main">
                {statistics.byType?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Dokumenttypen
              </Typography>
            </Card>
            <Card sx={{ p: 2, textAlign: 'center', flex: '1 1 200px', minWidth: '200px' }}>
              <Typography variant="h4" color="info.main">
                {documentTemplates.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vorlagen
              </Typography>
            </Card>
          </>
        )}
      </Box>

      <Card sx={{ mb: 3 }}>
        <Box p={3} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            fullWidth
            placeholder="Dokumente suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flex: '1 1 300px', minWidth: '300px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <InputLabel>Status filtern</InputLabel>
            <Select
              value={statusFilter}
              label="Status filtern"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <SelectMenuItem value="">Alle Status</SelectMenuItem>
              <SelectMenuItem value="draft">Entwurf</SelectMenuItem>
              <SelectMenuItem value="under_review">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>In Prüfung</span>
                  {documentsUnderReview > 0 && (
                    <Badge badgeContent={documentsUnderReview} color="warning" />
                  )}
                </Box>
              </SelectMenuItem>
              <SelectMenuItem value="released">Freigegeben</SelectMenuItem>
              <SelectMenuItem value="ready">Bereit</SelectMenuItem>
              <SelectMenuItem value="sent">Gesendet</SelectMenuItem>
              <SelectMenuItem value="received">Empfangen</SelectMenuItem>
              <SelectMenuItem value="archived">Archiviert</SelectMenuItem>
              <SelectMenuItem value="withdrawn">Zurückgezogen</SelectMenuItem>
            </Select>
          </FormControl>
        </Box>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Dokument</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Typ</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priorität</TableCell>
                <TableCell>Anhänge</TableCell>
                <TableCell>Datum</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : paginatedDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Keine Dokumente gefunden
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDocuments.map((document: any) => (
                  <TableRow key={document._id || document.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {getTypeIcon(document.type)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {document.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {document.documentNumber}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box 
                        sx={{ 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          '&:hover': { 
                            textDecoration: 'underline',
                            color: 'primary.main'
                          }
                        }}
                        onClick={() => handleNavigateToPatient(document)}
                      >
                        <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2">
                            {document.patient.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(document.patient.dateOfBirth).toLocaleDateString('de-DE')}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getTypeIcon(document.type)}
                        label={document.type}
                        color={getTypeColor(document.type) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(document.status)}
                        color={getStatusColor(document.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={document.priority}
                        color={getPriorityColor(document.priority) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge badgeContent={document.attachments.length} color="primary">
                        <AttachFile />
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(document.createdAt || '').toLocaleDateString('de-DE')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedDocument(document);
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredDocuments.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => { 
          handleView(selectedDocument!); 
          setAnchorEl(null);
          if (selectedDocument?._id || selectedDocument?.id) {
            navigate(`/documents/${selectedDocument._id || selectedDocument.id}`);
          }
        }}>
          <Visibility sx={{ mr: 1 }} />
          Anzeigen
        </MenuItem>
        {selectedDocument?.status !== 'under_review' && selectedDocument?.status !== 'released' && (
          <MenuItem onClick={() => { handleEdit(selectedDocument!); setAnchorEl(null); }}>
            <Edit sx={{ mr: 1 }} />
            Bearbeiten
          </MenuItem>
        )}
        <MenuItem onClick={() => { handleNavigateToPatient(selectedDocument!); setAnchorEl(null); }}>
          <Person sx={{ mr: 1 }} />
          Zum Patient-Organizer
        </MenuItem>
        {selectedDocument?.patient?.id && (
          <MenuItem onClick={() => { 
            handleOpenTimeline(); 
            setAnchorEl(null); 
          }}>
            <TimelineIcon sx={{ mr: 1 }} />
            Patienten-Timeline anzeigen
          </MenuItem>
        )}
        <MenuItem onClick={() => { handleDelete(selectedDocument!); setAnchorEl(null); }}>
          <Delete sx={{ mr: 1 }} />
          Löschen
        </MenuItem>
      </Menu>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <GradientDialogTitle
          isEdit={dialogMode === 'edit'}
          title={
            dialogMode === 'add' ? 'Neues Dokument' :
            dialogMode === 'edit' ? 'Dokument bearbeiten' :
            'Dokument anzeigen'
          }
          icon={<FormIcon />}
          gradientColors={{ from: '#10b981', to: '#059669' }}
        />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ 
                mb: 3,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                }
              }}
            >
              <Tab label="Grunddaten" />
              <Tab label="Inhalt" />
              <Tab label="Anhänge" />
            </Tabs>

          <Box sx={{ mt: 2 }}>
            {activeTab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <TextField
                      fullWidth
                      label="Titel"
                      value={formData.title || ''}
                      onChange={(e) => handleFormChange('title', e.target.value)}
                      disabled={dialogMode === 'view'}
                      margin="normal"
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <FormControl fullWidth margin="normal" disabled={dialogMode === 'view'}>
                      <InputLabel>Typ</InputLabel>
                      <Select
                        value={formData.type || ''}
                        onChange={(e) => handleFormChange('type', e.target.value)}
                        label="Typ"
                      >
                        <SelectMenuItem value="rezept">Rezept</SelectMenuItem>
                        <SelectMenuItem value="ueberweisung">Überweisung</SelectMenuItem>
                        <SelectMenuItem value="arztbrief">Arztbrief</SelectMenuItem>
                        <SelectMenuItem value="befund">Befund</SelectMenuItem>
                        <SelectMenuItem value="formular">Formular</SelectMenuItem>
                        <SelectMenuItem value="rechnung">Rechnung</SelectMenuItem>
                        <SelectMenuItem value="sonstiges">Sonstiges</SelectMenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <FormControl fullWidth margin="normal" disabled={dialogMode === 'view'}>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={formData.status || ''}
                        onChange={(e) => handleFormChange('status', e.target.value)}
                        label="Status"
                      >
                        <SelectMenuItem value="draft">Entwurf</SelectMenuItem>
                        <SelectMenuItem value="ready">Bereit</SelectMenuItem>
                        <SelectMenuItem value="sent">Versendet</SelectMenuItem>
                        <SelectMenuItem value="received">Empfangen</SelectMenuItem>
                        <SelectMenuItem value="archived">Archiviert</SelectMenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <FormControl fullWidth margin="normal" disabled={dialogMode === 'view'}>
                      <InputLabel>Priorität</InputLabel>
                      <Select
                        value={formData.priority || ''}
                        onChange={(e) => handleFormChange('priority', e.target.value)}
                        label="Priorität"
                      >
                        <SelectMenuItem value="niedrig">Niedrig</SelectMenuItem>
                        <SelectMenuItem value="normal">Normal</SelectMenuItem>
                        <SelectMenuItem value="hoch">Hoch</SelectMenuItem>
                        <SelectMenuItem value="dringend">Dringend</SelectMenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label="Patient"
                    value={formData.patient?.name || ''}
                    onChange={(e) => handleFormChange('patient', { ...formData.patient, name: e.target.value })}
                    disabled={dialogMode === 'view'}
                    margin="normal"
                  />
                </Box>
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <TextField
                  fullWidth
                  label="Dokumentinhalt"
                  multiline
                  rows={10}
                  value={formData.content?.text || ''}
                  onChange={(e) => handleFormChange('content', { ...formData.content, text: e.target.value })}
                  disabled={dialogMode === 'view'}
                  margin="normal"
                />
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Anhänge</Typography>
                  {dialogMode !== 'view' && (
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<AttachFile />}
                    >
                      Dateien hochladen
                      <input
                        type="file"
                        hidden
                        multiple
                        onChange={handleFileUpload}
                      />
                    </Button>
                  )}
                </Box>
                <List>
                  {selectedDocument?.attachments?.map((attachment, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <AttachFile />
                      </ListItemIcon>
                      <ListItemText
                        primary={attachment.originalName}
                        secondary={`${(attachment.size / 1024).toFixed(1)} KB`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end">
                          <Download />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            {dialogMode === 'view' ? 'Schließen' : 'Abbrechen'}
          </Button>
          {dialogMode !== 'view' && (
            <Button onClick={handleSave} variant="contained">
              {dialogMode === 'add' ? 'Erstellen' : 'Speichern'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Timeline Dialog */}
      <Dialog
        open={timelineDialogOpen}
        onClose={() => setTimelineDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Patienten-Timeline
              {selectedPatientForTimeline && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {selectedPatientForTimeline.firstName} {selectedPatientForTimeline.lastName}
                </Typography>
              )}
            </Typography>
            <IconButton onClick={() => setTimelineDialogOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedPatientForTimeline ? (
            <PatientTimeline
              patient={selectedPatientForTimeline}
              onNavigate={(path) => {
                setTimelineDialogOpen(false);
                navigate(path);
              }}
              maxItems={50}
            />
          ) : (
            <Alert severity="info">
              Kein Patient ausgewählt.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimelineDialogOpen(false)}>
            Schließen
          </Button>
          {selectedPatientForTimeline && (
            <Button
              variant="contained"
              onClick={() => {
                const patientId = selectedPatientForTimeline._id || selectedPatientForTimeline.id;
                setTimelineDialogOpen(false);
                navigate(`/patient-organizer/${patientId}`);
              }}
            >
              Zum Patient-Organizer
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Documents;