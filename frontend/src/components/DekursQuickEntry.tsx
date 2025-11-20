import React, { useState, useEffect } from 'react';
import {
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Save,
  Assignment,
  Add,
  CheckCircle
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createDekursEntry,
  finalizeDekursEntry,
  fetchDekursVorlagen,
  DekursVorlage
} from '../store/slices/dekursSlice';

interface DekursQuickEntryProps {
  patientId: string;
  encounterId?: string;
  onSave?: () => void;
  compact?: boolean;
}

const DekursQuickEntry: React.FC<DekursQuickEntryProps> = ({
  patientId,
  encounterId,
  onSave,
  compact = false
}) => {
  const dispatch = useAppDispatch();
  const { vorlagen, loading: vorlagenLoading } = useAppSelector((state) => state.dekurs);

  const [selectedVorlage, setSelectedVorlage] = useState<DekursVorlage | null>(null);
  const [visitReason, setVisitReason] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    dispatch(fetchDekursVorlagen({}));
  }, [dispatch]);

  const handleVorlageSelect = (vorlage: DekursVorlage | null) => {
    setSelectedVorlage(vorlage);
    if (vorlage) {
      // Sammle alle Textinhalte aus Template-Feldern
      const templateTexts: string[] = [];
      if (vorlage.template?.clinicalObservations) {
        templateTexts.push(vorlage.template.clinicalObservations);
      }
      if (vorlage.template?.findings) {
        templateTexts.push(vorlage.template.findings);
      }
      if (vorlage.template?.notes) {
        templateTexts.push(vorlage.template.notes);
      }
      if (vorlage.template?.progressChecks) {
        templateTexts.push(vorlage.template.progressChecks);
      }
      if (vorlage.template?.treatmentDetails) {
        templateTexts.push(vorlage.template.treatmentDetails);
      }
      if (vorlage.template?.medicationChanges) {
        templateTexts.push(vorlage.template.medicationChanges);
      }
      if (vorlage.template?.psychosocialFactors) {
        templateTexts.push(vorlage.template.psychosocialFactors);
      }

      // Füge Textbausteine hinzu
      if (vorlage.textBlocks && vorlage.textBlocks.length > 0) {
        vorlage.textBlocks.forEach((block) => {
          if (block.text) {
            templateTexts.push(block.text);
          }
        });
      }

      // Setze visitReason wenn vorhanden
      if (vorlage.template?.visitReason) {
        setVisitReason(vorlage.template.visitReason);
      }

      // Kombiniere alle Texte
      setQuickNotes(templateTexts.filter(Boolean).join('\n\n'));
    }
  };

  const handleSave = async (finalize = false) => {
    if (!visitReason.trim() && !quickNotes.trim()) {
      setError('Bitte geben Sie mindestens einen Besuchsgrund oder Notizen ein');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const entryData: any = {
        patientId,
        encounterId,
        visitReason: visitReason.trim() || undefined,
        visitType: 'appointment',
        notes: quickNotes.trim() || undefined,
        status: finalize ? 'finalized' : 'draft'
      };

      // Wenn Vorlage ausgewählt, füge weitere Felder hinzu
      if (selectedVorlage?.template) {
        entryData.clinicalObservations = selectedVorlage.template.clinicalObservations;
        entryData.findings = selectedVorlage.template.findings;
        entryData.treatmentDetails = selectedVorlage.template.treatmentDetails;
        entryData.templateId = selectedVorlage._id;
        entryData.templateName = selectedVorlage.name;
      }

      const savedEntry = await dispatch(createDekursEntry(entryData)).unwrap();

      if (finalize && savedEntry._id) {
        await dispatch(finalizeDekursEntry(savedEntry._id)).unwrap();
      }

      setSuccess(true);
      
      // Reset Formular
      setVisitReason('');
      setQuickNotes('');
      setSelectedVorlage(null);

      if (onSave) {
        onSave();
      }

      // Erfolgsmeldung nach 2 Sekunden ausblenden
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <Paper sx={{ p: 2, bgcolor: '#FFF9C4' }}>
        <Stack spacing={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Assignment sx={{ color: 'warning.main' }} />
            <Typography variant="subtitle1" fontWeight="bold">
              Schnelleingabe Dekurs
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success">
              Dekurs erfolgreich gespeichert!
            </Alert>
          )}

          <Autocomplete
            options={vorlagen}
            getOptionLabel={(option) => option.name}
            value={selectedVorlage}
            onChange={(e, newValue) => handleVorlageSelect(newValue)}
            loading={vorlagenLoading}
            size="small"
            renderInput={(params) => (
              <TextField
                {...params}
                label="Vorlage (optional)"
                placeholder="Vorlage auswählen..."
              />
            )}
          />

          <TextField
            label="Besuchsgrund"
            value={visitReason}
            onChange={(e) => setVisitReason(e.target.value)}
            fullWidth
            size="small"
            placeholder="z.B. Kontrolluntersuchung, Akutbehandlung..."
          />

          <TextField
            label="Notizen"
            value={quickNotes}
            onChange={(e) => setQuickNotes(e.target.value)}
            fullWidth
            multiline
            rows={4}
            size="small"
            placeholder="Kurze Notizen zum Besuch..."
          />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleSave(false)}
              disabled={saving || (!visitReason.trim() && !quickNotes.trim())}
              startIcon={saving ? <CircularProgress size={16} /> : <Save />}
            >
              Entwurf
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => handleSave(true)}
              disabled={saving || (!visitReason.trim() && !quickNotes.trim())}
              startIcon={saving ? <CircularProgress size={16} /> : <CheckCircle />}
              sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
            >
              Finalisieren
            </Button>
          </Stack>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, bgcolor: '#FFF9C4', borderRadius: 2 }}>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Assignment sx={{ fontSize: 32, color: 'warning.main' }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Schnelleingabe Dekurs
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Erstellen Sie schnell einen neuen Dekurs-Eintrag
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success">
            Dekurs erfolgreich gespeichert!
          </Alert>
        )}

        <Autocomplete
          options={vorlagen}
          getOptionLabel={(option) => `${option.name}${option.category ? ` (${option.category})` : ''}`}
          value={selectedVorlage}
          onChange={(e, newValue) => handleVorlageSelect(newValue)}
          loading={vorlagenLoading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Vorlage auswählen (optional)"
              placeholder="Wählen Sie eine Vorlage für häufige Fälle..."
              helperText="Vorlagen füllen automatisch die Felder aus"
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {option.name}
                </Typography>
                {option.description && (
                  <Typography variant="caption" color="text.secondary">
                    {option.description}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        />

        {selectedVorlage && (
          <Chip
            label={`Vorlage: ${selectedVorlage.name}`}
            onDelete={() => {
              setSelectedVorlage(null);
              setQuickNotes('');
            }}
            color="primary"
            variant="outlined"
          />
        )}

        <TextField
          label="Besuchsgrund *"
          value={visitReason}
          onChange={(e) => setVisitReason(e.target.value)}
          fullWidth
          required
          placeholder="z.B. Kontrolluntersuchung, Akutbehandlung, Nachsorge..."
          helperText="Geben Sie den Grund für den Besuch an"
        />

        <TextField
          label="Notizen"
          value={quickNotes}
          onChange={(e) => setQuickNotes(e.target.value)}
          fullWidth
          multiline
          rows={6}
          placeholder="Kurze Notizen zum Besuch, klinische Beobachtungen, Befunde..."
          helperText="Für detaillierte Eingaben verwenden Sie den vollständigen Dekurs-Dialog"
        />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={() => {
              setVisitReason('');
              setQuickNotes('');
              setSelectedVorlage(null);
              setError(null);
            }}
            disabled={saving}
          >
            Zurücksetzen
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleSave(false)}
            disabled={saving || (!visitReason.trim() && !quickNotes.trim())}
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          >
            {saving ? 'Speichern...' : 'Als Entwurf speichern'}
          </Button>
          <Button
            variant="contained"
            onClick={() => handleSave(true)}
            disabled={saving || (!visitReason.trim() && !quickNotes.trim())}
            startIcon={saving ? <CircularProgress size={20} /> : <CheckCircle />}
            sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
          >
            {saving ? 'Finalisieren...' : 'Finalisieren'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default DekursQuickEntry;

