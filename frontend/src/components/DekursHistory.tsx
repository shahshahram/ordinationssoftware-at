import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Stack,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Card,
  CardContent,
  Tooltip
} from '@mui/material';
import {
  Assignment,
  Edit,
  Delete,
  CheckCircle,
  Schedule,
  Person,
  LocalHospital,
  Medication,
  Psychology,
  PhotoCamera,
  Search,
  FilterList,
  Download,
  Add,
  Visibility,
  Close,
  Print
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchDekursEntries,
  deleteDekursEntry,
  exportDekursForArztbrief,
  DekursEntry
} from '../store/slices/dekursSlice';
import DekursDialog from './DekursDialog';
import DekursArztbriefExport from './DekursArztbriefExport';

interface DekursHistoryProps {
  patientId: string;
  onEntrySelect?: (entry: DekursEntry) => void;
}

const DekursHistory: React.FC<DekursHistoryProps> = ({ patientId, onEntrySelect }) => {
  const dispatch = useAppDispatch();
  const { entries, loading, pagination } = useAppSelector((state) => state.dekurs);
  const { patients } = useAppSelector((state) => state.patients);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<DekursEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuEntry, setMenuEntry] = useState<DekursEntry | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<DekursEntry | null>(null);
  // Bild-Vorschau in Originalgröße
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>('');

  useEffect(() => {
    if (patientId) {
      loadEntries();
    }
  }, [patientId, statusFilter]);

  const loadEntries = async () => {
    try {
      await dispatch(
        fetchDekursEntries({
          patientId,
          limit: 50,
          skip: 0,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchTerm || undefined
        })
      ).unwrap();
    } catch (error) {
      console.error('Fehler beim Laden der Dekurs-Einträge:', error);
    }
  };

  const handleSearch = () => {
    loadEntries();
  };

  const handleDelete = async (entry: DekursEntry) => {
    if (!entry._id) return;
    if (!window.confirm('Möchten Sie diesen Dekurs-Eintrag wirklich löschen?')) return;

    try {
      await dispatch(deleteDekursEntry(entry._id)).unwrap();
      loadEntries();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    }
    setMenuAnchor(null);
    setMenuEntry(null);
  };

  const handleEdit = (entry: DekursEntry) => {
    setSelectedEntry(entry);
    setDialogOpen(true);
    setMenuAnchor(null);
    setMenuEntry(null);
  };

  const handleNewEntry = () => {
    setSelectedEntry(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedEntry(null);
    loadEntries();
  };

  const handlePreview = (entry: DekursEntry) => {
    setPreviewEntry(entry);
    setPreviewDialogOpen(true);
  };

  const handlePrint = (entry: DekursEntry) => {
    const patient = patients.find(p => p._id === patientId);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dekurs - ${patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}</title>
          <style>
            @media print {
              @page { margin: 2cm; }
              body { margin: 0; padding: 0; }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              line-height: 1.6;
              color: #333;
            }
            .header {
              border-bottom: 3px solid #FFC107;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              color: #FFC107;
              margin: 0 0 10px 0;
            }
            .info-section {
              margin-bottom: 20px;
            }
            .info-section h2 {
              color: #1976d2;
              border-bottom: 2px solid #1976d2;
              padding-bottom: 5px;
              margin-top: 25px;
              margin-bottom: 10px;
            }
            .info-row {
              margin-bottom: 10px;
            }
            .info-label {
              font-weight: bold;
              color: #666;
              display: inline-block;
              width: 150px;
            }
            .content {
              white-space: pre-wrap;
              background: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              margin-top: 10px;
            }
            .chip {
              display: inline-block;
              background: #e3f2fd;
              padding: 5px 10px;
              border-radius: 15px;
              margin: 5px 5px 5px 0;
              font-size: 0.9em;
            }
            .photo-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 15px;
              margin-top: 10px;
            }
            .photo-item {
              border: 1px solid #ddd;
              border-radius: 5px;
              overflow: hidden;
            }
            .photo-item img {
              width: 100%;
              height: auto;
              display: block;
            }
            .photo-item .caption {
              padding: 8px;
              background: #f5f5f5;
              font-size: 0.85em;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Dekurs</h1>
            <div class="info-row">
              <span class="info-label">Patient:</span>
              ${patient ? `${patient.firstName} ${patient.lastName}` : '—'}
            </div>
            ${entry.entryDate ? `
            <div class="info-row">
              <span class="info-label">Datum:</span>
              ${new Date(entry.entryDate).toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            ` : ''}
            ${entry.visitReason ? `
            <div class="info-row">
              <span class="info-label">Besuchsgrund:</span>
              ${entry.visitReason}
            </div>
            ` : ''}
            ${entry.visitType ? `
            <div class="info-row">
              <span class="info-label">Besuchstyp:</span>
              ${entry.visitType === 'appointment' ? 'Termin' : entry.visitType === 'phone' ? 'Telefon' : entry.visitType === 'emergency' ? 'Notfall' : entry.visitType === 'follow-up' ? 'Nachsorge' : entry.visitType === 'other' ? 'Sonstiges' : entry.visitType}
            </div>
            ` : ''}
            ${entry.status ? `
            <div class="info-row">
              <span class="info-label">Status:</span>
              ${entry.status === 'finalized' ? 'Finalisiert' : 'Entwurf'}
            </div>
            ` : ''}
            ${entry.createdBy ? `
            <div class="info-row">
              <span class="info-label">Erstellt von:</span>
              ${entry.createdBy.firstName} ${entry.createdBy.lastName}
            </div>
            ` : ''}
            ${entry.finalizedAt ? `
            <div class="info-row">
              <span class="info-label">Finalisiert am:</span>
              ${new Date(entry.finalizedAt).toLocaleString('de-DE')}
            </div>
            ` : ''}
          </div>

          ${entry.clinicalObservations ? `
          <div class="info-section">
            <h2>Klinische Beobachtungen</h2>
            <div class="content">${entry.clinicalObservations}</div>
          </div>
          ` : ''}

          ${entry.progressChecks ? `
          <div class="info-section">
            <h2>Verlaufskontrollen</h2>
            <div class="content">${entry.progressChecks}</div>
          </div>
          ` : ''}

          ${entry.findings ? `
          <div class="info-section">
            <h2>Befunde</h2>
            <div class="content">${entry.findings}</div>
          </div>
          ` : ''}

          ${entry.medicationChanges ? `
          <div class="info-section">
            <h2>Medikamentenänderungen</h2>
            <div class="content">${entry.medicationChanges}</div>
          </div>
          ` : ''}

          ${entry.treatmentDetails ? `
          <div class="info-section">
            <h2>Behandlungsdetails</h2>
            <div class="content">${entry.treatmentDetails}</div>
          </div>
          ` : ''}

          ${entry.psychosocialFactors ? `
          <div class="info-section">
            <h2>Psychosoziale Faktoren</h2>
            <div class="content">${entry.psychosocialFactors}</div>
          </div>
          ` : ''}

          ${entry.notes ? `
          <div class="info-section">
            <h2>Notizen</h2>
            <div class="content">${entry.notes}</div>
          </div>
          ` : ''}

          ${entry.linkedDiagnoses && entry.linkedDiagnoses.length > 0 ? `
          <div class="info-section">
            <h2>Verknüpfte Diagnosen</h2>
            ${entry.linkedDiagnoses.map((diag: any) => `
              <span class="chip">${diag.icd10Code} - ${diag.display}${diag.side ? ` (${diag.side === 'left' ? 'Links' : diag.side === 'right' ? 'Rechts' : 'Beidseitig'})` : ''}</span>
            `).join('')}
          </div>
          ` : ''}

          ${entry.linkedMedications && entry.linkedMedications.length > 0 ? `
          <div class="info-section">
            <h2>Verknüpfte Medikamente</h2>
            ${entry.linkedMedications.map((med: any) => `
              <div style="margin-bottom: 10px;">
                <strong>${med.name}</strong>
                ${med.dosage || med.frequency ? ` - ${med.dosage || ''} ${med.frequency || ''}` : ''}
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${entry.attachments && entry.attachments.length > 0 ? `
          <div class="info-section">
            <h2>Fotos</h2>
            <div class="photo-grid">
              ${entry.attachments.map((attachment: any) => `
                <div class="photo-item">
                  <img src="http://localhost:5001/${attachment.path}" alt="${attachment.originalName}" />
                  <div class="caption">${attachment.originalName}</div>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };


  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'finalized':
        return 'success';
      case 'draft':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'finalized':
        return 'Finalisiert';
      case 'draft':
        return 'Entwurf';
      default:
        return 'Unbekannt';
    }
  };

  const getVisitTypeLabel = (type?: string) => {
    switch (type) {
      case 'appointment':
        return 'Termin';
      case 'phone':
        return 'Telefonat';
      case 'emergency':
        return 'Notfall';
      case 'follow-up':
        return 'Nachkontrolle';
      case 'other':
        return 'Sonstiges';
      default:
        return 'Unbekannt';
    }
  };

  return (
    <Box>
      {/* Header mit Suche und Filtern */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            placeholder="Suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            size="small"
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">Alle</MenuItem>
              <MenuItem value="draft">Entwurf</MenuItem>
              <MenuItem value="finalized">Finalisiert</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={handleSearch}
          >
            Filtern
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => setExportDialogOpen(true)}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleNewEntry}
            sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
          >
            Neu
          </Button>
        </Stack>
      </Paper>

      {/* Liste der Dekurs-Einträge */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : entries.length === 0 ? (
        <Alert severity="info">
          Keine Dekurs-Einträge gefunden. Erstellen Sie einen neuen Eintrag.
        </Alert>
      ) : (
        <List>
          {entries.map((entry) => (
            <Paper
              key={entry._id}
              sx={{
                mb: 2,
                p: 2,
                borderLeft: 4,
                borderLeftColor: entry.status === 'finalized' ? 'success.main' : 'warning.main',
                bgcolor: entry.status === 'finalized' ? 'success.50' : 'warning.50',
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 2,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out'
                }
              }}
              onClick={() => {
                handlePreview(entry);
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Assignment color="action" />
                    <Typography variant="h6">
                      {new Date(entry.entryDate).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                    <Chip
                      label={getStatusLabel(entry.status)}
                      color={getStatusColor(entry.status) as any}
                      size="small"
                    />
                    <Chip
                      label={getVisitTypeLabel(entry.visitType)}
                      size="small"
                      variant="outlined"
                    />
                    {entry.createdBy && (
                      <Chip
                        icon={<Person />}
                        label={`${entry.createdBy.firstName} ${entry.createdBy.lastName}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Stack>

                  {entry.visitReason && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Besuchsgrund:</strong> {entry.visitReason}
                    </Typography>
                  )}

                  {entry.clinicalObservations && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Klinische Beobachtungen:</strong> {entry.clinicalObservations.substring(0, 200)}
                      {entry.clinicalObservations.length > 200 && '...'}
                    </Typography>
                  )}

                  {entry.findings && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Befunde:</strong> {entry.findings.substring(0, 200)}
                      {entry.findings.length > 200 && '...'}
                    </Typography>
                  )}

                  {entry.notes && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Notizen:</strong> {entry.notes.substring(0, 200)}
                      {entry.notes.length > 200 && '...'}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
                    {entry.linkedDiagnoses && entry.linkedDiagnoses.length > 0 && (
                      <Chip
                        icon={<LocalHospital />}
                        label={`${entry.linkedDiagnoses.length} Diagnose(n)`}
                        size="small"
                        color="primary"
                      />
                    )}
                    {entry.linkedMedications && entry.linkedMedications.length > 0 && (
                      <Chip
                        icon={<Medication />}
                        label={`${entry.linkedMedications.length} Medikament(e)`}
                        size="small"
                        color="secondary"
                      />
                    )}
                    {entry.attachments && entry.attachments.length > 0 && (
                      <Chip
                        icon={<PhotoCamera />}
                        label={`${entry.attachments.length} Foto(s)`}
                        size="small"
                        color="info"
                      />
                    )}
                  </Stack>
                </Box>

                <Box>
                  <Tooltip title="Vorschau anzeigen">
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(entry);
                      }}
                      color="primary"
                      sx={{ mr: 1 }}
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  {entry.status !== 'finalized' && (
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuAnchor(e.currentTarget);
                        setMenuEntry(entry);
                      }}
                    >
                      <FilterList />
                    </IconButton>
                  )}
                </Box>
              </Box>
            </Paper>
          ))}
        </List>
      )}

      {/* Kontext-Menü */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => {
          setMenuAnchor(null);
          setMenuEntry(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuEntry) {
              handleEdit(menuEntry);
            }
          }}
        >
          <Edit sx={{ mr: 1 }} />
          Bearbeiten
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuEntry) {
              handleDelete(menuEntry);
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} />
          Löschen
        </MenuItem>
      </Menu>

      {/* Dekurs-Dialog */}
      <DekursDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        patientId={patientId}
        encounterId={selectedEntry?.encounterId}
        initialEntry={selectedEntry}
        onSave={(entry) => {
          // Aktualisiere selectedEntry damit Fotos hinzugefügt werden können
          setSelectedEntry(entry);
          if (onEntrySelect) {
            onEntrySelect(entry);
          }
          loadEntries();
        }}
      />

      {/* Export-Dialog */}
      <DekursArztbriefExport
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        patientId={patientId}
        onExportComplete={(exportText) => {
          console.log('Export abgeschlossen:', exportText.length, 'Zeichen');
        }}
      />

      {/* Vorschau-Dialog für finalisierte Einträge */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => {
          setPreviewDialogOpen(false);
          setPreviewEntry(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#FFF9C4',
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'yellow.50', borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              <Assignment sx={{ color: 'warning.main' }} />
              <Typography variant="h6">Dekurs-Vorschau</Typography>
              {previewEntry?.status === 'finalized' && (
                <Chip
                  icon={<CheckCircle />}
                  label="Finalisiert"
                  color="success"
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
            <IconButton onClick={() => {
              setPreviewDialogOpen(false);
              setPreviewEntry(null);
            }} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#FFF9C4' }}>
          {previewEntry && (
            <Stack spacing={3}>
              {/* Basis-Informationen */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Datum & Zeit
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {new Date(previewEntry.entryDate).toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Besuchsgrund
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {previewEntry.visitReason || '—'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Besuchstyp
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {getVisitTypeLabel(previewEntry.visitType)}
                    </Typography>
                  </Grid>
                </Grid>

                {previewEntry.createdBy && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Erstellt von
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {previewEntry.createdBy.firstName} {previewEntry.createdBy.lastName}
                    </Typography>
                  </Box>
                )}

                {previewEntry.finalizedAt && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Finalisiert am
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {new Date(previewEntry.finalizedAt).toLocaleString('de-DE')}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Divider />

              {/* Klinische Beobachtungen */}
              {previewEntry.clinicalObservations && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalHospital color="primary" />
                    Klinische Beobachtungen
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {previewEntry.clinicalObservations}
                  </Typography>
                </Box>
              )}

              {/* Verlaufskontrollen */}
              {previewEntry.progressChecks && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule color="primary" />
                    Verlaufskontrollen
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {previewEntry.progressChecks}
                  </Typography>
                </Box>
              )}

              {/* Befunde */}
              {previewEntry.findings && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle color="primary" />
                    Befunde
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {previewEntry.findings}
                  </Typography>
                </Box>
              )}

              {/* Medikamentenänderungen */}
              {previewEntry.medicationChanges && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Medication color="primary" />
                    Medikamentenänderungen
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {previewEntry.medicationChanges}
                  </Typography>
                </Box>
              )}

              {/* Behandlungsdetails */}
              {previewEntry.treatmentDetails && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Psychology color="primary" />
                    Behandlungsdetails
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {previewEntry.treatmentDetails}
                  </Typography>
                </Box>
              )}

              {/* Psychosoziale Faktoren */}
              {previewEntry.psychosocialFactors && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Psychology color="primary" />
                    Psychosoziale Faktoren
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {previewEntry.psychosocialFactors}
                  </Typography>
                </Box>
              )}

              {/* Notizen */}
              {previewEntry.notes && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Assignment color="primary" />
                    Notizen
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {previewEntry.notes}
                  </Typography>
                </Box>
              )}

              {/* Verknüpfte Diagnosen */}
              {previewEntry.linkedDiagnoses && previewEntry.linkedDiagnoses.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalHospital color="primary" />
                    Verknüpfte Diagnosen ({previewEntry.linkedDiagnoses.length})
                  </Typography>
                  <Stack spacing={1}>
                    {previewEntry.linkedDiagnoses.map((diag, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={`${diag.icd10Code} - ${diag.display}`}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                        {diag.side && (
                          <Chip
                            label={diag.side === 'left' ? 'Links' : diag.side === 'right' ? 'Rechts' : 'Beidseitig'}
                            color="secondary"
                            size="small"
                          />
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Verknüpfte Medikamente */}
              {previewEntry.linkedMedications && previewEntry.linkedMedications.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Medication color="primary" />
                    Verknüpfte Medikamente ({previewEntry.linkedMedications.length})
                  </Typography>
                  <Stack spacing={1}>
                    {previewEntry.linkedMedications.map((med, index) => (
                      <Card key={index} variant="outlined" sx={{ p: 1 }}>
                        <Typography variant="body2" fontWeight="bold">{med.name}</Typography>
                        {(med.dosage || med.frequency) && (
                          <Typography variant="caption" color="text.secondary">
                            {med.dosage} {med.frequency && `• ${med.frequency}`}
                          </Typography>
                        )}
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Fotos */}
              {previewEntry.attachments && previewEntry.attachments.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhotoCamera color="primary" />
                    Fotos ({previewEntry.attachments.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {previewEntry.attachments.map((attachment, index) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                        <Card variant="outlined">
                          <Box
                            component="img"
                            src={`http://localhost:5001/${attachment.path}`}
                            alt={attachment.originalName}
                            onClick={() => {
                              setSelectedImage(`http://localhost:5001/${attachment.path}`);
                              setSelectedImageName(attachment.originalName);
                              setImagePreviewOpen(true);
                            }}
                            sx={{
                              width: '100%',
                              height: 200,
                              objectFit: 'cover',
                              cursor: 'pointer',
                              '&:hover': {
                                opacity: 0.8,
                                transition: 'opacity 0.2s'
                              }
                            }}
                          />
                          <CardContent>
                            <Typography variant="caption" display="block">
                              {attachment.originalName}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'yellow.50', borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => {
            setPreviewDialogOpen(false);
            setPreviewEntry(null);
          }}>
            Schließen
          </Button>
          {previewEntry && (
            <Button
              onClick={() => handlePrint(previewEntry)}
              variant="outlined"
              startIcon={<Print />}
            >
              Drucken
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Bild-Vorschau Dialog */}
      <Dialog
        open={imagePreviewOpen}
        onClose={() => {
          setImagePreviewOpen(false);
          setSelectedImage(null);
          setSelectedImageName('');
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
          <Typography variant="h6" sx={{ color: 'white' }}>
            {selectedImageName}
          </Typography>
          <IconButton
            onClick={() => {
              setImagePreviewOpen(false);
              setSelectedImage(null);
              setSelectedImageName('');
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
              src={selectedImage}
              alt={selectedImageName}
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
    </Box>
  );
};

export default DekursHistory;

