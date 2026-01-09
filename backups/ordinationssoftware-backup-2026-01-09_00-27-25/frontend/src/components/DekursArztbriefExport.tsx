import React, { useState } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Checkbox,
  FormControlLabel,
  Paper
} from '@mui/material';
import {
  Close,
  Download,
  Description,
  CheckCircle
} from '@mui/icons-material';
import { useAppDispatch } from '../store/hooks';
import { exportDekursForArztbrief } from '../store/slices/dekursSlice';

interface DekursArztbriefExportProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  onExportComplete?: (exportText: string) => void;
}

const DekursArztbriefExport: React.FC<DekursArztbriefExportProps> = ({
  open,
  onClose,
  patientId,
  onExportComplete
}) => {
  const dispatch = useAppDispatch();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [finalizedOnly, setFinalizedOnly] = useState(true);
  const [includeDiagnoses, setIncludeDiagnoses] = useState(true);
  const [includeMedications, setIncludeMedications] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(false);
  const [exportFormat, setExportFormat] = useState<'text' | 'html' | 'markdown'>('text');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportText, setExportText] = useState<string>('');

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setExportText('');

    try {
      const exportData = await dispatch(
        exportDekursForArztbrief({
          patientId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          finalizedOnly
        })
      ).unwrap();

      // Generiere Export-Text basierend auf Format
      let text = '';

      if (exportFormat === 'html') {
        text = generateHtmlExport(exportData, {
          includeDiagnoses,
          includeMedications,
          includePhotos
        });
      } else if (exportFormat === 'markdown') {
        text = generateMarkdownExport(exportData, {
          includeDiagnoses,
          includeMedications,
          includePhotos
        });
      } else {
        text = generateTextExport(exportData, {
          includeDiagnoses,
          includeMedications,
          includePhotos
        });
      }

      setExportText(text);

      if (onExportComplete) {
        onExportComplete(text);
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Exportieren');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!exportText) return;

    const blob = new Blob([exportText], { 
      type: exportFormat === 'html' ? 'text/html' : 'text/plain;charset=utf-8' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Dekurs-Export-${patientId}-${new Date().toISOString().split('T')[0]}.${exportFormat === 'html' ? 'html' : exportFormat === 'markdown' ? 'md' : 'txt'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    if (!exportText) return;
    navigator.clipboard.writeText(exportText).then(() => {
      // Erfolg - könnte hier eine Snackbar anzeigen wenn gewünscht
      console.log('In Zwischenablage kopiert');
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <Description />
            <Typography variant="h6">Dekurs für Arztbrief exportieren</Typography>
          </Box>
          <Button onClick={onClose} size="small">
            <Close />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Datum-Filter */}
          <Box display="flex" gap={2}>
            <TextField
              label="Von Datum"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Bis Datum"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>

          {/* Optionen */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Export-Optionen
            </Typography>
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={finalizedOnly}
                    onChange={(e) => setFinalizedOnly(e.target.checked)}
                  />
                }
                label="Nur finalisierte Einträge"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeDiagnoses}
                    onChange={(e) => setIncludeDiagnoses(e.target.checked)}
                  />
                }
                label="Diagnosen einschließen"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeMedications}
                    onChange={(e) => setIncludeMedications(e.target.checked)}
                  />
                }
                label="Medikamente einschließen"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includePhotos}
                    onChange={(e) => setIncludePhotos(e.target.checked)}
                  />
                }
                label="Foto-Referenzen einschließen"
              />
            </Stack>
          </Box>

          {/* Export-Format */}
          <FormControl fullWidth>
            <InputLabel>Export-Format</InputLabel>
            <Select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
            >
              <MenuItem value="text">Text (.txt)</MenuItem>
              <MenuItem value="markdown">Markdown (.md)</MenuItem>
              <MenuItem value="html">HTML (.html)</MenuItem>
            </Select>
          </FormControl>

          {/* Export-Vorschau */}
          {exportText && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Export-Vorschau
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  maxHeight: 300,
                  overflow: 'auto',
                  bgcolor: 'grey.50',
                  border: 1,
                  borderColor: 'divider'
                }}
              >
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem'
                  }}
                >
                  {exportText.substring(0, 2000)}
                  {exportText.length > 2000 && '...'}
                </Typography>
              </Paper>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Abbrechen
        </Button>
        {exportText && (
          <>
            <Button
              onClick={handleCopyToClipboard}
              variant="outlined"
              startIcon={<CheckCircle />}
            >
              Kopieren
            </Button>
            <Button
              onClick={handleDownload}
              variant="outlined"
              startIcon={<Download />}
            >
              Herunterladen
            </Button>
          </>
        )}
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <Description />}
        >
          {loading ? 'Exportiere...' : 'Exportieren'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Hilfsfunktionen für Export-Formate
const generateTextExport = (data: any, options: any): string => {
  let text = `DEKURS-EXPORT FÜR ARZTBRIEF\n`;
  text += `========================================\n\n`;
  text += `Patient: ${data.patient.name}\n`;
  text += `Geburtsdatum: ${new Date(data.patient.dateOfBirth).toLocaleDateString('de-DE')}\n`;
  text += `SVNR: ${data.patient.svnr || 'Nicht angegeben'}\n\n`;
  text += `Zeitraum: ${data.summary.dateRange.start ? new Date(data.summary.dateRange.start).toLocaleDateString('de-DE') : 'Alle'} - ${data.summary.dateRange.end ? new Date(data.summary.dateRange.end).toLocaleDateString('de-DE') : 'Alle'}\n`;
  text += `Anzahl Einträge: ${data.summary.totalEntries}\n\n`;
  text += `========================================\n\n`;

  data.entries.forEach((entry: any, index: number) => {
    text += `Eintrag ${index + 1}\n`;
    text += `Datum: ${new Date(entry.date).toLocaleDateString('de-DE')} ${new Date(entry.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}\n`;
    text += `Arzt: ${entry.doctor}\n`;
    text += `Besuchstyp: ${entry.visitType}\n`;
    if (entry.visitReason) {
      text += `Besuchsgrund: ${entry.visitReason}\n`;
    }
    text += `\n`;

    if (entry.clinicalObservations) {
      text += `Klinische Beobachtungen:\n${entry.clinicalObservations}\n\n`;
    }
    if (entry.progressChecks) {
      text += `Verlaufskontrollen:\n${entry.progressChecks}\n\n`;
    }
    if (entry.findings) {
      text += `Befunde:\n${entry.findings}\n\n`;
    }
    if (entry.treatmentDetails) {
      text += `Behandlung:\n${entry.treatmentDetails}\n\n`;
    }
    if (entry.medicationChanges) {
      text += `Medikamentenänderungen:\n${entry.medicationChanges}\n\n`;
    }
    if (entry.psychosocialFactors) {
      text += `Psychosoziale Faktoren:\n${entry.psychosocialFactors}\n\n`;
    }
    if (entry.notes) {
      text += `Notizen:\n${entry.notes}\n\n`;
    }

    if (options.includeDiagnoses && entry.linkedDiagnoses && entry.linkedDiagnoses.length > 0) {
      text += `Diagnosen:\n`;
      entry.linkedDiagnoses.forEach((diag: any) => {
        text += `  - ${diag.icd10Code || ''} ${diag.display || ''}\n`;
      });
      text += `\n`;
    }

    if (options.includeMedications && entry.linkedMedications && entry.linkedMedications.length > 0) {
      text += `Medikamente:\n`;
      entry.linkedMedications.forEach((med: any) => {
        text += `  - ${med.name}${med.dosage ? ` (${med.dosage})` : ''}${med.frequency ? ` - ${med.frequency}` : ''}\n`;
      });
      text += `\n`;
    }

    text += `\n========================================\n\n`;
  });

  return text;
};

const generateMarkdownExport = (data: any, options: any): string => {
  let text = `# Dekurs-Export für Arztbrief\n\n`;
  text += `**Patient:** ${data.patient.name}\n`;
  text += `**Geburtsdatum:** ${new Date(data.patient.dateOfBirth).toLocaleDateString('de-DE')}\n`;
  text += `**SVNR:** ${data.patient.svnr || 'Nicht angegeben'}\n\n`;
  text += `**Zeitraum:** ${data.summary.dateRange.start ? new Date(data.summary.dateRange.start).toLocaleDateString('de-DE') : 'Alle'} - ${data.summary.dateRange.end ? new Date(data.summary.dateRange.end).toLocaleDateString('de-DE') : 'Alle'}\n`;
  text += `**Anzahl Einträge:** ${data.summary.totalEntries}\n\n`;
  text += `---\n\n`;

  data.entries.forEach((entry: any, index: number) => {
    text += `## Eintrag ${index + 1}\n\n`;
    text += `**Datum:** ${new Date(entry.date).toLocaleDateString('de-DE')} ${new Date(entry.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}\n`;
    text += `**Arzt:** ${entry.doctor}\n`;
    text += `**Besuchstyp:** ${entry.visitType}\n`;
    if (entry.visitReason) {
      text += `**Besuchsgrund:** ${entry.visitReason}\n`;
    }
    text += `\n`;

    if (entry.clinicalObservations) {
      text += `### Klinische Beobachtungen\n\n${entry.clinicalObservations}\n\n`;
    }
    if (entry.findings) {
      text += `### Befunde\n\n${entry.findings}\n\n`;
    }
    if (entry.treatmentDetails) {
      text += `### Behandlung\n\n${entry.treatmentDetails}\n\n`;
    }

    if (options.includeDiagnoses && entry.linkedDiagnoses && entry.linkedDiagnoses.length > 0) {
      text += `### Diagnosen\n\n`;
      entry.linkedDiagnoses.forEach((diag: any) => {
        text += `- ${diag.icd10Code || ''} ${diag.display || ''}\n`;
      });
      text += `\n`;
    }

    text += `---\n\n`;
  });

  return text;
};

const generateHtmlExport = (data: any, options: any): string => {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dekurs-Export für Arztbrief</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    h3 { color: #888; margin-top: 20px; }
    .entry { border-bottom: 2px solid #ccc; padding: 20px 0; }
    .meta { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Dekurs-Export für Arztbrief</h1>
  <div class="meta">
    <p><strong>Patient:</strong> ${data.patient.name}</p>
    <p><strong>Geburtsdatum:</strong> ${new Date(data.patient.dateOfBirth).toLocaleDateString('de-DE')}</p>
    <p><strong>SVNR:</strong> ${data.patient.svnr || 'Nicht angegeben'}</p>
    <p><strong>Zeitraum:</strong> ${data.summary.dateRange.start ? new Date(data.summary.dateRange.start).toLocaleDateString('de-DE') : 'Alle'} - ${data.summary.dateRange.end ? new Date(data.summary.dateRange.end).toLocaleDateString('de-DE') : 'Alle'}</p>
    <p><strong>Anzahl Einträge:</strong> ${data.summary.totalEntries}</p>
  </div>`;

  data.entries.forEach((entry: any, index: number) => {
    html += `
  <div class="entry">
    <h2>Eintrag ${index + 1}</h2>
    <div class="meta">
      <p><strong>Datum:</strong> ${new Date(entry.date).toLocaleDateString('de-DE')} ${new Date(entry.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
      <p><strong>Arzt:</strong> ${entry.doctor}</p>
      <p><strong>Besuchstyp:</strong> ${entry.visitType}</p>
      ${entry.visitReason ? `<p><strong>Besuchsgrund:</strong> ${entry.visitReason}</p>` : ''}
    </div>`;

    if (entry.clinicalObservations) {
      html += `<h3>Klinische Beobachtungen</h3><p>${entry.clinicalObservations.replace(/\n/g, '<br>')}</p>`;
    }
    if (entry.findings) {
      html += `<h3>Befunde</h3><p>${entry.findings.replace(/\n/g, '<br>')}</p>`;
    }
    if (entry.treatmentDetails) {
      html += `<h3>Behandlung</h3><p>${entry.treatmentDetails.replace(/\n/g, '<br>')}</p>`;
    }

    if (options.includeDiagnoses && entry.linkedDiagnoses && entry.linkedDiagnoses.length > 0) {
      html += `<h3>Diagnosen</h3><ul>`;
      entry.linkedDiagnoses.forEach((diag: any) => {
        html += `<li>${diag.icd10Code || ''} ${diag.display || ''}</li>`;
      });
      html += `</ul>`;
    }

    html += `</div>`;
  });

  html += `
</body>
</html>`;

  return html;
};

export default DekursArztbriefExport;

