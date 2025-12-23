import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Autocomplete
} from '@mui/material';
import {
  Close,
  Print,
  Save,
  Delete,
  Edit,
  Add
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createDocument } from '../store/slices/documentSlice';
import { fetchDocuments } from '../store/slices/documentSlice';
import { fetchDekursEntries, DekursEntry } from '../store/slices/dekursSlice';
import { Location } from '../store/slices/locationSlice';
import { Patient } from '../store/slices/patientSlice';
import { fetchContacts, Contact } from '../store/slices/contactSlice';
import { apiRequest } from '../utils/api';
import RichTextEditor from './RichTextEditor';
import DataSourceSelector from './DataSourceSelector';
import { replacePlaceholders, PlaceholderContext } from '../utils/placeholders';
import { Document } from '../store/slices/documentSlice';
import { DocumentTemplate, fetchStandaloneTemplate } from '../store/slices/documentTemplateSlice';

interface StandaloneDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  patient: Patient | null;
  location: Location | null;
  templateId: string | null;
  onSaveSuccess?: () => void;
}

const StandaloneDocumentDialog: React.FC<StandaloneDocumentDialogProps> = ({
  open,
  onClose,
  patient,
  location,
  templateId,
  onSaveSuccess
}) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const dekursEntries = useAppSelector(state => state.dekurs.entries);

  // State für Template
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // State für Arztauswahl
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // State für Empfänger
  const [recipient, setRecipient] = useState<{
    type: 'patient' | 'doctor' | 'organization' | 'contact' | null;
    contactId?: string;
    name?: string;
    title?: string;
    salutation?: string;
    organization?: string;
    address?: {
      street?: string;
      postalCode?: string;
      city?: string;
      country?: string;
    };
    phone?: string;
    email?: string;
    fax?: string;
  } | null>(null);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // State für Dokumentinhalt
  const [documentContent, setDocumentContent] = useState<string>('');
  const [processedContent, setProcessedContent] = useState<string>('');

  // State für Datenquelle-Auswahl
  const [dataSourceSelectorOpen, setDataSourceSelectorOpen] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<'dekurs' | 'document' | 'manual'>('dekurs');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [latestDekursEntry, setLatestDekursEntry] = useState<DekursEntry | null>(null);

  // State für Speichern
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State für Tabs
  const [activeTab, setActiveTab] = useState(0);

  // Lade Template
  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId || !open) return;

      setLoadingTemplate(true);
      try {
        const result = await dispatch(fetchStandaloneTemplate(templateId)).unwrap();
        setTemplate(result);
        
        // Setze initialen Inhalt
        if (result.content) {
          setDocumentContent(result.content);
        }

        // Setze Standard-Empfänger wenn definiert
        if (result.defaultRecipientType) {
          setRecipient({
            type: result.defaultRecipientType,
            name: '',
            address: {}
          });
        }
      } catch (err: any) {
        setError(err.message || 'Fehler beim Laden der Vorlage');
      } finally {
        setLoadingTemplate(false);
      }
    };

    loadTemplate();
  }, [templateId, open, dispatch]);

  // Lade Ärzte
  useEffect(() => {
    const loadDoctors = async () => {
      if (!location?._id || !open) return;
      
      setLoadingDoctors(true);
      try {
        const response: any = await apiRequest.get(`/staff-location-assignments/location/${location._id}`);
        const assignments = response.data?.data || response.data || [];
        
        const doctors: any[] = [];
        for (const assignment of assignments) {
          if (assignment.staff_id?.userId) {
            const userData = assignment.staff_id.userId;
            if (userData.role === 'doctor' || userData.role === 'arzt' || userData.title) {
              doctors.push({
                _id: userData._id || userData.id,
                firstName: userData.firstName,
                lastName: userData.lastName,
                title: userData.title,
                email: userData.email,
                phone: userData.phone,
                specialization: userData.specialization
              });
            }
          }
        }
        
        setAvailableDoctors(doctors);
        if (doctors.length > 0) {
          setSelectedDoctor(doctors[0]);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Ärzte:', error);
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, [open, location]);

  // Lade Kontakte
  useEffect(() => {
    const loadContacts = async () => {
      if (!open) return;
      
      setLoadingContacts(true);
      try {
        const response: any = await apiRequest.get('/contacts?limit=500&isActive=true');
        const contacts = response.data?.data || [];
        setAvailableContacts(contacts);
      } catch (error) {
        console.error('Fehler beim Laden der Kontakte:', error);
      } finally {
        setLoadingContacts(false);
      }
    };

    loadContacts();
  }, [open, dispatch]);

  // Lade Daten basierend auf ausgewählter Datenquelle
  useEffect(() => {
    const loadData = async () => {
      if (!open || !patient?._id || !template) return;

      if (selectedDataSource === 'manual') {
        return;
      }

      if (selectedDataSource === 'document' && selectedDocument) {
        // Lade Daten aus bestehendem Dokument
        if (selectedDocument.content?.html) {
          setDocumentContent(selectedDocument.content.html);
        }
        return;
      }

      if (selectedDataSource === 'dekurs') {
        // Lade neuesten Dekurs-Eintrag
        try {
          const response: any = await apiRequest.get(`/dekurs/patient/${patient._id}?limit=1&sort=desc`);
          const entries = response.data?.data || [];
          if (entries.length > 0) {
            setLatestDekursEntry(entries[0]);
          }
        } catch (error) {
          console.error('Fehler beim Laden des Dekurs:', error);
        }
      }
    };

    loadData();
  }, [open, patient, selectedDataSource, selectedDocument, template]);

  // Verarbeite Platzhalter
  useEffect(() => {
    if (!template || !documentContent || !patient || !user || !location) return;

    const context: PlaceholderContext = {
      patient,
      doctor: selectedDoctor ? {
        firstName: selectedDoctor.firstName,
        lastName: selectedDoctor.lastName,
        title: selectedDoctor.title,
        specialization: selectedDoctor.specialization,
        email: selectedDoctor.email,
        phone: selectedDoctor.phone
      } : {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      location,
      date: new Date(),
      dekurs: latestDekursEntry || undefined,
      document: selectedDocument || undefined,
      dataSource: selectedDataSource,
      dataSourceInfo: latestDekursEntry ? {
        type: 'dekurs',
        id: latestDekursEntry._id || latestDekursEntry.id || '',
        date: new Date(latestDekursEntry.entryDate),
        modified: false
      } : undefined
    };

    const processed = replacePlaceholders(documentContent, context);
    setProcessedContent(processed);
  }, [documentContent, template, patient, user, location, selectedDoctor, latestDekursEntry, selectedDocument, selectedDataSource]);

  // Öffne Datenquelle-Auswahl beim Öffnen
  useEffect(() => {
    if (open && patient?._id && template) {
      setDataSourceSelectorOpen(true);
    }
  }, [open, patient, template]);

  // Speichern
  const handleSave = async (finalize: boolean = false) => {
    if (!patient || !user || !template) return;

    setSaving(true);
    setError(null);

    try {
      const documentData: Partial<Document> = {
        type: (template.documentType || 'sonstiges') as Document['type'],
        title: `${template.name} für ${patient.firstName} ${patient.lastName}`,
        content: {
          text: processedContent.replace(/<[^>]*>/g, ''), // Plain text
          html: processedContent
        },
        patient: {
          id: patient._id || patient.id || '',
          name: `${patient.firstName} ${patient.lastName}`,
          dateOfBirth: patient.dateOfBirth || '',
          socialSecurityNumber: patient.socialSecurityNumber
        },
        doctor: {
          id: selectedDoctor?._id || user?._id || user?.id || '',
          name: selectedDoctor ? `${selectedDoctor.title || ''} ${selectedDoctor.firstName || ''} ${selectedDoctor.lastName || ''}`.trim() : (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''),
          title: selectedDoctor?.title || undefined,
          specialization: selectedDoctor?.specialization || undefined
        },
        recipient: recipient || undefined,
        status: (finalize ? 'ready' : 'draft') as 'ready' | 'draft',
        templateId: template._id
      };

      await dispatch(createDocument(documentData));
      
      if (patient._id || patient.id) {
        dispatch(fetchDocuments({ patientId: patient._id || patient.id }));
      }

      if (onSaveSuccess) {
        onSaveSuccess();
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern des Dokuments');
    } finally {
      setSaving(false);
    }
  };

  // Drucken
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${template?.name || 'Dokument'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            @media print { @page { margin: 1cm; } }
          </style>
        </head>
        <body>
          ${processedContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (!template && loadingTemplate) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!template) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Alert severity="error">Vorlage nicht gefunden</Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{template.name}</Typography>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 1 }}>
            <Stack spacing={2}>
            {/* Empfänger-Auswahl */}
            {template.requiresRecipient && (
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Empfänger</InputLabel>
                  <Select
                    value={recipient?.type || ''}
                    onChange={(e) => {
                      const type = e.target.value as 'patient' | 'doctor' | 'organization' | 'contact';
                      setRecipient({
                        type,
                        name: '',
                        address: {}
                      });
                    }}
                  >
                    <MenuItem value="patient">Patient</MenuItem>
                    <MenuItem value="doctor">Arzt</MenuItem>
                    <MenuItem value="organization">Organisation</MenuItem>
                    <MenuItem value="contact">Kontakt</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            {recipient?.type === 'contact' && (
              <Box>
                <Autocomplete
                  options={availableContacts}
                  getOptionLabel={(option) => `${option.firstName || ''} ${option.lastName || ''} ${option.organization || ''}`.trim()}
                  loading={loadingContacts}
                  onChange={(_, value) => {
                    if (value) {
                      setRecipient({
                        type: 'contact',
                        contactId: value._id || value.id,
                        name: `${value.firstName || ''} ${value.lastName || ''}`.trim(),
                        organization: value.organization,
                        address: {
                          street: value.address?.street,
                          postalCode: value.address?.postalCode,
                          city: value.address?.city,
                          country: value.address?.country || 'Österreich'
                        },
                        phone: value.phone || value.mobile,
                        email: value.email
                      });
                    }
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Kontakt auswählen" />
                  )}
                />
              </Box>
            )}

            {/* Arzt-Auswahl */}
            {availableDoctors.length > 1 && (
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Arzt</InputLabel>
                  <Select
                    value={selectedDoctor?._id || ''}
                    onChange={(e) => {
                      const doctor = availableDoctors.find(d => d._id === e.target.value);
                      setSelectedDoctor(doctor || null);
                    }}
                  >
                    {availableDoctors.map((doctor) => (
                      <MenuItem key={doctor._id} value={doctor._id}>
                        {`${doctor.title || ''} ${doctor.firstName} ${doctor.lastName}`.trim()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Tabs */}
            <Box>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab label="Editor" />
                <Tab label="Vorschau" />
              </Tabs>
            </Box>

            {/* Editor Tab */}
            {activeTab === 0 && (
              <Box>
                <RichTextEditor
                  value={documentContent}
                  onChange={setDocumentContent}
                  placeholder="Dokumentinhalt bearbeiten..."
                  minHeight={400}
                />
              </Box>
            )}

            {/* Vorschau Tab */}
            {activeTab === 1 && (
              <Box>
                <Paper sx={{ p: 2, minHeight: 400, border: '1px solid #ddd' }}>
                  <div dangerouslySetInnerHTML={{ __html: processedContent }} />
                </Paper>
              </Box>
            )}
          </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button onClick={handlePrint} startIcon={<Print />}>
            Drucken
          </Button>
          <Button onClick={() => handleSave(false)} variant="outlined" startIcon={<Save />} disabled={saving}>
            Entwurf speichern
          </Button>
          <Button onClick={() => handleSave(true)} variant="contained" startIcon={<Save />} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Datenquelle-Auswahl */}
      {patient?._id && (
        <DataSourceSelector
          open={dataSourceSelectorOpen}
          onClose={() => setDataSourceSelectorOpen(false)}
          patientId={patient._id || patient.id || ''}
          documentType={template?.documentType || 'sonstiges'}
          onSelect={(source: 'dekurs' | 'document' | 'manual', data?: Document | DekursEntry) => {
            setSelectedDataSource(source);
            if (source === 'document' && data) {
              setSelectedDocument(data as Document);
            } else if (source === 'dekurs' && data) {
              setLatestDekursEntry(data as DekursEntry);
            }
            setDataSourceSelectorOpen(false);
          }}
        />
      )}
    </>
  );
};

export default StandaloneDocumentDialog;

