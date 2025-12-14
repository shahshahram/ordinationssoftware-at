import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface DocumentDetailDialogProps {
  open: boolean;
  onClose: () => void;
  type: 'labor' | 'vital' | 'dicom' | 'document' | 'dekurs';
  data: any;
}

const DocumentDetailDialog: React.FC<DocumentDetailDialogProps> = ({
  open,
  onClose,
  type,
  data
}) => {
  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return 'Unbekannt';
    try {
      return format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: de });
    } catch {
      return 'Unbekannt';
    }
  };

  const renderLaborDetails = () => (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" gutterBottom>
          {data.testName || data.name || 'Laborwerte'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Datum: {formatDate(data.date || data.collectedAt || data.createdAt)}
        </Typography>
      </Box>
      <Divider />
      {data.results && Array.isArray(data.results) && data.results.length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Parameter</strong></TableCell>
                <TableCell><strong>Wert</strong></TableCell>
                <TableCell><strong>Einheit</strong></TableCell>
                <TableCell><strong>Referenz</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.results.map((result: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>{result.parameter || result.name || ''}</TableCell>
                  <TableCell>{result.value !== undefined ? result.value : ''}</TableCell>
                  <TableCell>{result.unit || ''}</TableCell>
                  <TableCell>
                    {result.referenceRange 
                      ? (typeof result.referenceRange === 'object' 
                          ? `${result.referenceRange.low || ''} - ${result.referenceRange.high || ''}`.trim()
                          : String(result.referenceRange))
                      : ''}
                  </TableCell>
                  <TableCell>
                    {result.status && (
                      <Chip
                        label={result.status}
                        size="small"
                        color={
                          result.status === 'normal' ? 'success' :
                          result.status === 'high' || result.status === 'low' ? 'warning' :
                          'error'
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography variant="body2">
          Wert: {data.value} {data.unit || ''}
          {data.referenceRange && ` (Referenz: ${typeof data.referenceRange === 'object' 
            ? `${data.referenceRange.low || ''} - ${data.referenceRange.high || ''}`.trim()
            : String(data.referenceRange)})`}
        </Typography>
      )}
      {data.interpretation && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" gutterBottom>Interpretation:</Typography>
            <Typography variant="body2">{data.interpretation}</Typography>
          </Box>
        </>
      )}
      {data.notes && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" gutterBottom>Notizen:</Typography>
            <Typography variant="body2">{data.notes}</Typography>
          </Box>
        </>
      )}
    </Stack>
  );

  const renderVitalDetails = () => (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Vitalwerte
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Erfasst am: {formatDate(data.recordedAt)}
        </Typography>
      </Box>
      <Divider />
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableBody>
            {data.bloodPressure?.systolic && data.bloodPressure?.diastolic && (
              <TableRow>
                <TableCell><strong>Blutdruck</strong></TableCell>
                <TableCell>{data.bloodPressure.systolic}/{data.bloodPressure.diastolic} mmHg</TableCell>
              </TableRow>
            )}
            {data.pulse && (
              <TableRow>
                <TableCell><strong>Puls</strong></TableCell>
                <TableCell>{data.pulse} bpm</TableCell>
              </TableRow>
            )}
            {data.temperature?.value && (
              <TableRow>
                <TableCell><strong>Temperatur</strong></TableCell>
                <TableCell>
                  {data.temperature.value} {data.temperature.unit === 'fahrenheit' ? '°F' : '°C'}
                </TableCell>
              </TableRow>
            )}
            {data.oxygenSaturation && (
              <TableRow>
                <TableCell><strong>Sauerstoffsättigung</strong></TableCell>
                <TableCell>{data.oxygenSaturation}%</TableCell>
              </TableRow>
            )}
            {data.respiratoryRate && (
              <TableRow>
                <TableCell><strong>Atemfrequenz</strong></TableCell>
                <TableCell>{data.respiratoryRate} /min</TableCell>
              </TableRow>
            )}
            {data.bloodGlucose?.value && (
              <TableRow>
                <TableCell><strong>Blutzucker</strong></TableCell>
                <TableCell>
                  {data.bloodGlucose.value} {data.bloodGlucose.unit || 'mg/dL'}
                </TableCell>
              </TableRow>
            )}
            {data.weight?.value && (
              <TableRow>
                <TableCell><strong>Gewicht</strong></TableCell>
                <TableCell>
                  {data.weight.value} {data.weight.unit || 'kg'}
                </TableCell>
              </TableRow>
            )}
            {data.height?.value && (
              <TableRow>
                <TableCell><strong>Größe</strong></TableCell>
                <TableCell>
                  {data.height.value} {data.height.unit || 'cm'}
                </TableCell>
              </TableRow>
            )}
            {data.bmi && (
              <TableRow>
                <TableCell><strong>BMI</strong></TableCell>
                <TableCell>{data.bmi}</TableCell>
              </TableRow>
            )}
            {data.painScale?.value && (
              <TableRow>
                <TableCell><strong>Schmerzskala ({data.painScale.type || 'NRS'})</strong></TableCell>
                <TableCell>{data.painScale.value}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {data.notes && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" gutterBottom>Notizen:</Typography>
            <Typography variant="body2">{data.notes}</Typography>
          </Box>
        </>
      )}
    </Stack>
  );

  const renderDicomDetails = () => (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" gutterBottom>
          {data.studyDescription || data.description || 'DICOM-Studie'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Datum: {formatDate(data.studyDate)}
        </Typography>
      </Box>
      <Divider />
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableBody>
            {data.modality && (
              <TableRow>
                <TableCell><strong>Modalität</strong></TableCell>
                <TableCell>{data.modality}</TableCell>
              </TableRow>
            )}
            {data.referringPhysician && (
              <TableRow>
                <TableCell><strong>Überweisender Arzt</strong></TableCell>
                <TableCell>{data.referringPhysician}</TableCell>
              </TableRow>
            )}
            {data.clinicalInformation && (
              <TableRow>
                <TableCell><strong>Klinische Information</strong></TableCell>
                <TableCell>{data.clinicalInformation}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {data.findings && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" gutterBottom>Befunde:</Typography>
            <Typography variant="body2">{data.findings}</Typography>
          </Box>
        </>
      )}
      {data.notes && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" gutterBottom>Notizen:</Typography>
            <Typography variant="body2">{data.notes}</Typography>
          </Box>
        </>
      )}
    </Stack>
  );

  const renderDocumentDetails = () => (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" gutterBottom>
          {data.title || 'Dokument'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Erstellt am: {formatDate(data.createdAt)}
        </Typography>
      </Box>
      <Divider />
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell><strong>Typ</strong></TableCell>
              <TableCell>{data.type || ''}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell>
                <Chip label={data.status || ''} size="small" />
              </TableCell>
            </TableRow>
            {data.priority && (
              <TableRow>
                <TableCell><strong>Priorität</strong></TableCell>
                <TableCell>
                  <Chip label={data.priority} size="small" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {data.content?.text && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" gutterBottom>Inhalt:</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {data.content.text}
            </Typography>
          </Box>
        </>
      )}
    </Stack>
  );

  const renderDekursDetails = () => (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Dekurs-Eintrag
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Datum: {formatDate(data.entryDate)}
        </Typography>
      </Box>
      <Divider />
      {data.visitReason && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>Besuchsgrund:</Typography>
          <Typography variant="body2">{data.visitReason}</Typography>
        </Box>
      )}
      {data.clinicalObservations && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" gutterBottom>Klinische Beobachtungen:</Typography>
            <Typography variant="body2">{data.clinicalObservations}</Typography>
          </Box>
        </>
      )}
      {data.findings && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" gutterBottom>Befunde:</Typography>
            <Typography variant="body2">{data.findings}</Typography>
          </Box>
        </>
      )}
      {data.treatmentDetails && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" gutterBottom>Behandlungsdetails:</Typography>
            <Typography variant="body2">{data.treatmentDetails}</Typography>
          </Box>
        </>
      )}
      {data.notes && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" gutterBottom>Notizen:</Typography>
            <Typography variant="body2">{data.notes}</Typography>
          </Box>
        </>
      )}
    </Stack>
  );

  const renderContent = () => {
    switch (type) {
      case 'labor':
        return renderLaborDetails();
      case 'vital':
        return renderVitalDetails();
      case 'dicom':
        return renderDicomDetails();
      case 'document':
        return renderDocumentDetails();
      case 'dekurs':
        return renderDekursDetails();
      default:
        return <Typography>Keine Details verfügbar</Typography>;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography component="span" variant="h6">
          {type === 'labor' ? 'Laborwerte' :
           type === 'vital' ? 'Vitalwerte' :
           type === 'dicom' ? 'DICOM-Studie' :
           type === 'document' ? 'Dokument' :
           'Dekurs-Eintrag'}
        </Typography>
        <Button onClick={onClose} startIcon={<Close />} size="small">
          Schließen
        </Button>
      </DialogTitle>
      <DialogContent>
        {renderContent()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Schließen</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentDetailDialog;

