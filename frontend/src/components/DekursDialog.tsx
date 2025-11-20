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
  Tabs,
  Tab,
  Stack,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  Tooltip
} from '@mui/material';
import {
  Close,
  Save,
  Assignment,
  PhotoCamera,
  Delete,
  Add,
  Description,
  LocalHospital,
  Medication,
  Psychology,
  CheckCircle,
  Cancel,
  ZoomIn,
  Print
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createDekursEntry,
  updateDekursEntry,
  finalizeDekursEntry,
  uploadDekursPhoto,
  deleteDekursPhoto,
  fetchDekursVorlagen,
  fetchDekursEntry,
  DekursEntry,
  DekursVorlage
} from '../store/slices/dekursSlice';
import { fetchPatientDiagnoses } from '../store/slices/diagnosisSlice';
import ICD10Autocomplete from './ICD10Autocomplete';
import MedicationAutocomplete from './MedicationAutocomplete';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dekurs-tabpanel-${index}`}
      aria-labelledby={`dekurs-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

interface DekursDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  encounterId?: string;
  initialEntry?: DekursEntry | null;
  onSave?: (entry: DekursEntry) => void;
}

const DekursDialog: React.FC<DekursDialogProps> = ({
  open,
  onClose,
  patientId,
  encounterId,
  initialEntry,
  onSave
}) => {
  const dispatch = useAppDispatch();
  const { vorlagen, loading } = useAppSelector((state) => state.dekurs);
  const { diagnoses } = useAppSelector((state) => state.diagnoses);
  const { patients } = useAppSelector((state) => state.patients);

  const [activeTab, setActiveTab] = useState(0);
  const [selectedVorlage, setSelectedVorlage] = useState<DekursVorlage | null>(null);
  const [formData, setFormData] = useState<Partial<DekursEntry>>({
    patientId,
    encounterId,
    visitReason: '',
    visitType: 'appointment',
    clinicalObservations: '',
    progressChecks: '',
    findings: '',
    medicationChanges: '',
    treatmentDetails: '',
    psychosocialFactors: '',
    notes: '',
    linkedDiagnoses: [],
    linkedMedications: [],
    linkedDocuments: []
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoInputRef, setPhotoInputRef] = useState<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Lokaler State für den aktuellen Eintrag (wird nach dem Speichern aktualisiert)
  const [currentEntry, setCurrentEntry] = useState<DekursEntry | null | undefined>(initialEntry);
  // Temporäre Fotos (werden lokal gespeichert, bis der Eintrag gespeichert wird)
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [pendingPhotoPreviews, setPendingPhotoPreviews] = useState<string[]>([]);
  // Bild-Vorschau in Originalgröße
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>('');

  // Lade Vorlagen beim Öffnen
  useEffect(() => {
    if (open) {
      dispatch(fetchDekursVorlagen({}));
      if (patientId) {
        dispatch(fetchPatientDiagnoses({ patientId }));
      }
    }
  }, [open, patientId, dispatch]);

  // Aktualisiere currentEntry wenn initialEntry sich ändert (auch wenn Dialog bereits geöffnet ist)
  useEffect(() => {
    setCurrentEntry(initialEntry || null);
  }, [initialEntry]);

  // Initialisiere Formular nur beim Öffnen des Dialogs
  useEffect(() => {
    if (open) {
      if (!currentEntry) {
        // Setze Formular zurück, wenn Dialog geöffnet wird und kein currentEntry vorhanden ist
        setFormData({
          patientId,
          encounterId,
          visitReason: '',
          visitType: 'appointment',
          clinicalObservations: '',
          progressChecks: '',
          findings: '',
          medicationChanges: '',
          treatmentDetails: '',
          psychosocialFactors: '',
          notes: '',
          linkedDiagnoses: [],
          linkedMedications: [],
          linkedDocuments: []
        });
        setSelectedVorlage(null);
        // Lösche temporäre Fotos beim Öffnen eines neuen Dialogs
        setPendingPhotos([]);
        setPendingPhotoPreviews([]);
      } else {
        // Wenn currentEntry vorhanden ist, lade die Daten
        setFormData({
          ...currentEntry,
          patientId,
          encounterId: currentEntry.encounterId || encounterId
        });
      }
    }
  }, [open, currentEntry, patientId, encounterId]);

  const handleFieldChange = (field: keyof DekursEntry, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVorlageSelect = (vorlage: DekursVorlage | null) => {
    setSelectedVorlage(vorlage);
    if (vorlage) {
      console.log('DekursDialog: Vorlage ausgewählt', vorlage);
      console.log('DekursDialog: Template-Daten', vorlage.template);
      console.log('DekursDialog: Textbausteine', vorlage.textBlocks);
      
      setFormData((prev) => {
        // Initialisiere alle Felder direkt aus der Vorlage (auch wenn leer)
        const newData: Partial<DekursEntry> = {
          ...prev,
          // Setze alle Template-Felder explizit (auch wenn leer/undefined)
          clinicalObservations: vorlage.template?.clinicalObservations || '',
          progressChecks: vorlage.template?.progressChecks || '',
          findings: vorlage.template?.findings || '',
          medicationChanges: vorlage.template?.medicationChanges || '',
          treatmentDetails: vorlage.template?.treatmentDetails || '',
          psychosocialFactors: vorlage.template?.psychosocialFactors || '',
          notes: vorlage.template?.notes || '',
          visitReason: vorlage.template?.visitReason || prev.visitReason || '',
          visitType: vorlage.template?.visitType || prev.visitType || 'appointment',
          templateId: vorlage._id,
          templateName: vorlage.name
        };

        // Füge Textbausteine hinzu, basierend auf ihrer Kategorie
        if (vorlage.textBlocks && vorlage.textBlocks.length > 0) {
          console.log('DekursDialog: Verarbeite Textbausteine', vorlage.textBlocks);
          
          vorlage.textBlocks.forEach((block) => {
            const category = block.category || 'notes';
            const blockText = block.text || '';
            
            console.log('DekursDialog: Textbaustein', { category, blockText, label: block.label });
            
            if (blockText) {
              // Bestimme das Ziel-Feld basierend auf der Kategorie
              let targetField: keyof DekursEntry;
              switch (category) {
                case 'clinicalObservations':
                  targetField = 'clinicalObservations';
                  break;
                case 'progressChecks':
                  targetField = 'progressChecks';
                  break;
                case 'findings':
                  targetField = 'findings';
                  break;
                case 'medicationChanges':
                  targetField = 'medicationChanges';
                  break;
                case 'treatmentDetails':
                  targetField = 'treatmentDetails';
                  break;
                case 'psychosocialFactors':
                  targetField = 'psychosocialFactors';
                  break;
                case 'notes':
                default:
                  targetField = 'notes';
                  break;
              }

              // Füge Textbaustein hinzu (anhängen, wenn bereits Text vorhanden)
              const existingText = (newData[targetField] as string) || '';
              console.log('DekursDialog: Ziel-Feld', targetField, 'Vorhandener Text:', existingText);
              
              if (existingText) {
                newData[targetField] = `${existingText}\n\n${blockText}`;
              } else {
                newData[targetField] = blockText;
              }
              
              console.log('DekursDialog: Neuer Text für', targetField, ':', newData[targetField]);
            }
          });
        }

        // Füge vorgeschlagene Diagnosen hinzu
        if (vorlage.suggestedDiagnoses && vorlage.suggestedDiagnoses.length > 0) {
          const newDiagnoses = vorlage.suggestedDiagnoses.map((diag: any) => ({
            diagnosisId: diag.diagnosisId || diag._id || '',
            icd10Code: diag.icd10Code || '',
            display: diag.display || '',
            side: '' as 'left' | 'right' | 'bilateral' | ''
          }));
          newData.linkedDiagnoses = [...(prev.linkedDiagnoses || []), ...newDiagnoses];
        }

        // Füge vorgeschlagene Medikamente hinzu
        if (vorlage.suggestedMedications && vorlage.suggestedMedications.length > 0) {
          const newMedications = vorlage.suggestedMedications.map((med: any) => ({
            medicationId: med.medicationId || med._id || '',
            name: med.name || '',
            dosage: '',
            frequency: '',
            changeType: 'added' as const
          }));
          newData.linkedMedications = [...(prev.linkedMedications || []), ...newMedications];
        }

        console.log('DekursDialog: Finale FormData', newData);
        return newData;
      });
    }
  };

  const handleAddDiagnosis = (diagnosis: any) => {
    const newDiagnosis = {
      diagnosisId: diagnosis._id || diagnosis.id || diagnosis.code,
      icd10Code: diagnosis.code || diagnosis.icd10Code,
      display: diagnosis.display || diagnosis.name || diagnosis.text || '',
      side: '' as 'left' | 'right' | 'bilateral' | ''
    };
    setFormData((prev) => ({
      ...prev,
      linkedDiagnoses: [...(prev.linkedDiagnoses || []), newDiagnosis]
    }));
  };

  const handleUpdateDiagnosisSide = (index: number, side: 'left' | 'right' | 'bilateral' | '') => {
    setFormData((prev) => {
      const updatedDiagnoses = [...(prev.linkedDiagnoses || [])];
      if (updatedDiagnoses[index]) {
        updatedDiagnoses[index] = {
          ...updatedDiagnoses[index],
          side
        };
      }
      return {
        ...prev,
        linkedDiagnoses: updatedDiagnoses
      };
    });
  };

  const handleRemoveDiagnosis = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      linkedDiagnoses: prev.linkedDiagnoses?.filter((_, i) => i !== index) || []
    }));
  };

  const handleAddMedication = (medication: any) => {
    if (!medication) return;
    const newMedication = {
      medicationId: medication._id || medication.id || medication.medicationId,
      name: medication.name || medication.Name || medication.medicationName || '',
      dosage: medication.dosage || '',
      frequency: medication.frequency || '',
      changeType: 'added' as const
    };
    setFormData((prev) => ({
      ...prev,
      linkedMedications: [...(prev.linkedMedications || []), newMedication]
    }));
  };

  const handleRemoveMedication = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      linkedMedications: prev.linkedMedications?.filter((_, i) => i !== index) || []
    }));
  };

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

    setError(null);
    
    // Wenn Eintrag bereits existiert, lade sofort hoch
    const entryId = currentEntry?._id;
    if (entryId) {
      setUploadingPhoto(true);
      try {
        const result = await dispatch(uploadDekursPhoto({ entryId, photoFile: file })).unwrap();
        // Lade Eintrag neu um Fotos zu aktualisieren
        const refreshedEntry = await dispatch(fetchDekursEntry(entryId)).unwrap();
        setCurrentEntry(refreshedEntry);
      } catch (err: any) {
        setError(err.message || 'Fehler beim Hochladen des Fotos');
      } finally {
        setUploadingPhoto(false);
        if (photoInputRef) {
          photoInputRef.value = '';
        }
      }
    } else {
      // Wenn Eintrag noch nicht existiert, speichere Foto lokal
      setPendingPhotos(prev => [...prev, file]);
      // Erstelle Preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPendingPhotoPreviews(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
      
      if (photoInputRef) {
        photoInputRef.value = '';
      }
    }
  };

  const handleDeletePhoto = async (index: number, isPending: boolean = false) => {
    if (isPending) {
      // Lösche temporäres Foto
      setPendingPhotos(prev => prev.filter((_, i) => i !== index));
      setPendingPhotoPreviews(prev => prev.filter((_, i) => i !== index));
      return;
    }

    const entryId = currentEntry?._id;
    if (!entryId) return;

    try {
      await dispatch(deleteDekursPhoto({ entryId, attachmentIndex: index })).unwrap();
      // Lade Eintrag neu um Fotos zu aktualisieren
      if (entryId) {
        const refreshedEntry = await dispatch(fetchDekursEntry(entryId)).unwrap();
        setCurrentEntry(refreshedEntry);
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Löschen des Fotos');
    }
  };

  const handleSave = async (finalize = false) => {
    setSaving(true);
    setError(null);

    try {
      let savedEntry: DekursEntry;

      if (currentEntry?._id) {
        // Update
        savedEntry = await dispatch(
          updateDekursEntry({ entryId: currentEntry._id, entryData: formData })
        ).unwrap();
      } else {
        // Create
        savedEntry = await dispatch(createDekursEntry(formData)).unwrap();
      }

      if (finalize && savedEntry._id) {
        await dispatch(finalizeDekursEntry(savedEntry._id)).unwrap();
      }

      // Lade Eintrag neu um alle Daten zu aktualisieren
      if (savedEntry._id) {
        const refreshedEntry = await dispatch(fetchDekursEntry(savedEntry._id)).unwrap();
        savedEntry = refreshedEntry;
        // Aktualisiere currentEntry damit Fotos hinzugefügt werden können
        setCurrentEntry(refreshedEntry);
        
        // Lade temporäre Fotos hoch
        if (pendingPhotos.length > 0 && savedEntry._id) {
          for (const photo of pendingPhotos) {
            try {
              await dispatch(uploadDekursPhoto({ entryId: savedEntry._id, photoFile: photo })).unwrap();
            } catch (err: any) {
              console.error('Fehler beim Hochladen des Fotos:', err);
              setError(`Fehler beim Hochladen eines Fotos: ${err.message || 'Unbekannter Fehler'}`);
            }
          }
          // Lade Eintrag erneut um alle Fotos zu aktualisieren
          const finalEntry = await dispatch(fetchDekursEntry(savedEntry._id)).unwrap();
          savedEntry = finalEntry;
          setCurrentEntry(finalEntry);
          // Lösche temporäre Fotos
          setPendingPhotos([]);
          setPendingPhotoPreviews([]);
        }
      }

      if (onSave) {
        onSave(savedEntry);
      }

      // Schließe Dialog nur wenn finalisiert, sonst bleibt er offen für weitere Bearbeitung
      if (finalize) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const entry = currentEntry || formData;
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

          ${(currentEntry?.attachments && currentEntry.attachments.length > 0) || pendingPhotoPreviews.length > 0 ? `
          <div class="info-section">
            <h2>Fotos</h2>
            <div class="photo-grid">
              ${currentEntry?.attachments ? currentEntry.attachments.map((attachment: any) => `
                <div class="photo-item">
                  <img src="http://localhost:5001/${attachment.path}" alt="${attachment.originalName}" />
                  <div class="caption">${attachment.originalName}</div>
                </div>
              `).join('') : ''}
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

  const handleClose = () => {
    if (!saving) {
      setFormData({
        patientId,
        encounterId,
        visitReason: '',
        visitType: 'appointment',
        clinicalObservations: '',
        progressChecks: '',
        findings: '',
        medicationChanges: '',
        treatmentDetails: '',
        psychosocialFactors: '',
        notes: '',
        linkedDiagnoses: [],
        linkedMedications: [],
        linkedDocuments: []
      });
      setSelectedVorlage(null);
      setError(null);
      // Lösche temporäre Fotos beim Schließen
      setPendingPhotos([]);
      setPendingPhotoPreviews([]);
      // Setze currentEntry zurück, damit beim nächsten Öffnen ein leerer Dialog erscheint
      setCurrentEntry(null);
      onClose();
    }
  };

  const isFinalized = currentEntry?.status === 'finalized';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#FFF9C4', // Hellgelber Hintergrund
          borderRadius: 3
        }
      }}
    >
      <DialogTitle sx={{ bgcolor: 'yellow.50', borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <Assignment sx={{ color: 'warning.main' }} />
            <Typography variant="h6">
              {initialEntry ? 'Dekurs bearbeiten' : 'Neuer Dekurs'}
            </Typography>
            {isFinalized && (
              <Chip
                icon={<CheckCircle />}
                label="Finalisiert"
                color="success"
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          <IconButton onClick={handleClose} disabled={saving}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: '#FFF9C4' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Vorlagen-Auswahl */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Vorlage auswählen (optional)</InputLabel>
            <Select
              value={selectedVorlage?._id || ''}
              onChange={(e) => {
                const vorlage = vorlagen.find((v) => v._id === e.target.value);
                handleVorlageSelect(vorlage || null);
              }}
              disabled={!!initialEntry || loading}
            >
              <MenuItem value="">Keine Vorlage</MenuItem>
              {vorlagen.map((vorlage) => (
                <MenuItem key={vorlage._id} value={vorlage._id}>
                  {vorlage.name} {vorlage.category && `(${vorlage.category})`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Basis-Informationen */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Besuchsgrund"
              value={formData.visitReason || ''}
              onChange={(e) => handleFieldChange('visitReason', e.target.value)}
              multiline
              rows={2}
              disabled={isFinalized}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Besuchstyp</InputLabel>
              <Select
                value={formData.visitType || 'appointment'}
                onChange={(e) => handleFieldChange('visitType', e.target.value)}
                disabled={isFinalized}
              >
                <MenuItem value="appointment">Termin</MenuItem>
                <MenuItem value="phone">Telefonat</MenuItem>
                <MenuItem value="emergency">Notfall</MenuItem>
                <MenuItem value="follow-up">Nachkontrolle</MenuItem>
                <MenuItem value="other">Sonstiges</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Tabs für strukturierte Eingabe */}
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="Klinische Beobachtungen" icon={<LocalHospital />} iconPosition="start" />
          <Tab label="Verlaufskontrollen" icon={<Description />} iconPosition="start" />
          <Tab label="Befunde" icon={<CheckCircle />} iconPosition="start" />
          <Tab label="Medikamente" icon={<Medication />} iconPosition="start" />
          <Tab label="Behandlung" icon={<Psychology />} iconPosition="start" />
          <Tab label="Notizen" icon={<Assignment />} iconPosition="start" />
          <Tab label="Fotos" icon={<PhotoCamera />} iconPosition="start" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <TextField
            fullWidth
            label="Klinische Beobachtungen"
            value={formData.clinicalObservations || ''}
            onChange={(e) => handleFieldChange('clinicalObservations', e.target.value)}
            multiline
            rows={6}
            disabled={isFinalized}
            placeholder="Beschreiben Sie die klinischen Beobachtungen..."
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <TextField
            fullWidth
            label="Verlaufskontrollen"
            value={formData.progressChecks || ''}
            onChange={(e) => handleFieldChange('progressChecks', e.target.value)}
            multiline
            rows={6}
            disabled={isFinalized}
            placeholder="Beschreiben Sie die Verlaufskontrollen..."
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Befunde"
              value={formData.findings || ''}
              onChange={(e) => handleFieldChange('findings', e.target.value)}
              multiline
              rows={4}
              disabled={isFinalized}
              placeholder="Beschreiben Sie die Befunde..."
            />
            <Divider />
            <Typography variant="subtitle2">Verknüpfte Diagnosen</Typography>
            <ICD10Autocomplete
              onSelect={(code: string, display: string, fullCode: any) => handleAddDiagnosis(fullCode)}
            />
            {formData.linkedDiagnoses && formData.linkedDiagnoses.length > 0 && (
              <Stack spacing={1}>
                {formData.linkedDiagnoses.map((diag, index) => (
                  <Paper key={index} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {diag.icd10Code} - {diag.display}
                      </Typography>
                      {!isFinalized && (
                        <FormControl size="small" sx={{ mt: 1, minWidth: 120 }}>
                          <InputLabel>Seite</InputLabel>
                          <Select
                            value={diag.side || ''}
                            onChange={(e) => handleUpdateDiagnosisSide(index, e.target.value as 'left' | 'right' | 'bilateral' | '')}
                            label="Seite"
                          >
                            <MenuItem value="">Keine Angabe</MenuItem>
                            <MenuItem value="left">Links</MenuItem>
                            <MenuItem value="right">Rechts</MenuItem>
                            <MenuItem value="bilateral">Beidseitig</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                      {isFinalized && diag.side && (
                        <Chip
                          label={diag.side === 'left' ? 'Links' : diag.side === 'right' ? 'Rechts' : 'Beidseitig'}
                          size="small"
                          sx={{ mt: 0.5 }}
                          color="secondary"
                        />
                      )}
                    </Box>
                    {!isFinalized && (
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveDiagnosis(index)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Medikamentenänderungen"
              value={formData.medicationChanges || ''}
              onChange={(e) => handleFieldChange('medicationChanges', e.target.value)}
              multiline
              rows={4}
              disabled={isFinalized}
              placeholder="Beschreiben Sie Änderungen an der Medikation..."
            />
            <Divider />
            <Typography variant="subtitle2">Verknüpfte Medikamente</Typography>
            <MedicationAutocomplete
              value={null}
              onChange={(medication) => {
                if (medication) {
                  handleAddMedication(medication);
                }
              }}
            />
            {formData.linkedMedications && formData.linkedMedications.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {formData.linkedMedications.map((med, index) => (
                  <Paper key={index} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">{med.name}</Typography>
                      {(med.dosage || med.frequency) && (
                        <Typography variant="caption" color="text.secondary">
                          {med.dosage} {med.frequency && `• ${med.frequency}`}
                        </Typography>
                      )}
                    </Box>
                    {!isFinalized && (
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveMedication(index)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </Paper>
                ))}
              </Box>
            )}
          </Stack>
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Behandlungsdetails"
              value={formData.treatmentDetails || ''}
              onChange={(e) => handleFieldChange('treatmentDetails', e.target.value)}
              multiline
              rows={4}
              disabled={isFinalized}
              placeholder="Beschreiben Sie die Behandlungsdetails..."
            />
            <TextField
              fullWidth
              label="Psychosoziale Faktoren"
              value={formData.psychosocialFactors || ''}
              onChange={(e) => handleFieldChange('psychosocialFactors', e.target.value)}
              multiline
              rows={4}
              disabled={isFinalized}
              placeholder="Beschreiben Sie psychosoziale Faktoren..."
            />
          </Stack>
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <TextField
            fullWidth
            label="Notizen"
            value={formData.notes || ''}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            multiline
            rows={8}
            disabled={isFinalized}
            placeholder="Zusätzliche Notizen..."
          />
        </TabPanel>

        <TabPanel value={activeTab} index={6}>
          <Stack spacing={2}>
            {!isFinalized && (
              <Box>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                  ref={(input) => setPhotoInputRef(input)}
                  id="dekurs-photo-upload"
                />
                <label htmlFor="dekurs-photo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<PhotoCamera />}
                    disabled={uploadingPhoto}
                    fullWidth
                  >
                    {uploadingPhoto ? <CircularProgress size={20} /> : 'Foto hinzufügen'}
                  </Button>
                </label>
              </Box>
            )}
            {/* Temporäre Fotos (vor dem Speichern) */}
            {pendingPhotoPreviews.length > 0 && (
              <Grid container spacing={2}>
                {pendingPhotoPreviews.map((preview, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`pending-${index}`}>
                    <Paper sx={{ p: 1, position: 'relative', border: '2px dashed', borderColor: 'warning.main' }}>
                      <Box
                        component="img"
                        src={preview}
                        alt={`Temporäres Foto ${index + 1}`}
                        onClick={() => {
                          setSelectedImage(preview);
                          setSelectedImageName(pendingPhotos[index]?.name || 'Temporäres Foto');
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
                      {!isFinalized && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto(index, true);
                          }}
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' }
                          }}
                        >
                          <Delete />
                        </IconButton>
                      )}
                      <Chip
                        label="Wird beim Speichern hochgeladen"
                        size="small"
                        color="warning"
                        sx={{ mt: 1, width: '100%' }}
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        {pendingPhotos[index]?.name || 'Temporäres Foto'}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
            {/* Gespeicherte Fotos */}
            {currentEntry?.attachments && currentEntry.attachments.length > 0 && (
              <Grid container spacing={2}>
                {currentEntry.attachments.map((attachment, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`saved-${index}`}>
                    <Paper sx={{ p: 1, position: 'relative' }}>
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
                          borderRadius: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 0.8,
                            transition: 'opacity 0.2s'
                          }
                        }}
                      />
                      {!isFinalized && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto(index, false);
                          }}
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' }
                          }}
                        >
                          <Delete />
                        </IconButton>
                      )}
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        {attachment.originalName}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
            {(!currentEntry?.attachments || currentEntry.attachments.length === 0) && pendingPhotoPreviews.length === 0 && (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                Keine Fotos vorhanden
              </Typography>
            )}
          </Stack>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ bgcolor: 'yellow.50', borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={handleClose} disabled={saving} startIcon={<Cancel />}>
          Abbrechen
        </Button>
        {!isFinalized && (
          <>
            <Button
              onClick={() => handleSave(false)}
              variant="outlined"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <Save />}
            >
              {saving ? 'Speichern...' : 'Als Entwurf speichern'}
            </Button>
            <Button
              onClick={() => handleSave(true)}
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <CheckCircle />}
              sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
            >
              {saving ? 'Finalisieren...' : 'Finalisieren'}
            </Button>
          </>
        )}
      </DialogActions>

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
    </Dialog>
  );
};

export default DekursDialog;

