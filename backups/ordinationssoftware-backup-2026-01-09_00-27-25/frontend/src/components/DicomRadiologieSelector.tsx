import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Typography,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material';
import api from '../utils/api';
import GradientDialogTitle from './GradientDialogTitle';

interface DicomStudy {
  _id: string;
  studyDescription?: string;
  modality?: string;
  studyDate?: string;
  findings?: string;
  uploadedAt: string;
}

interface DicomRadiologieSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selectedStudies: DicomStudy[]) => void;
  patientId: string;
}

const DicomRadiologieSelector: React.FC<DicomRadiologieSelectorProps> = ({
  open,
  onClose,
  onSelect,
  patientId,
}) => {
  const [studies, setStudies] = useState<DicomStudy[]>([]);
  const [selectedStudies, setSelectedStudies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && patientId) {
      loadStudies();
    }
  }, [open, patientId]);

  const loadStudies = async () => {
    setLoading(true);
    try {
      const response: any = await api.get(`/dicom/patient/${patientId}`);
      if (response.data?.success) {
        setStudies(response.data.data || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der DICOM-Studien:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (studyId: string) => {
    setSelectedStudies((prev) =>
      prev.includes(studyId)
        ? prev.filter((id) => id !== studyId)
        : [...prev, studyId]
    );
  };

  const handleSelect = () => {
    const selected = studies.filter((s) => selectedStudies.includes(s._id));
    onSelect(selected);
    setSelectedStudies([]);
    onClose();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('de-DE');
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <GradientDialogTitle title="DICOM/Radiologie-Befunde auswählen" onClose={onClose} />
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : studies.length === 0 ? (
          <Alert severity="info">Keine DICOM-Studien gefunden</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Datum</TableCell>
                  <TableCell>Studie-Typ</TableCell>
                  <TableCell>Beschreibung</TableCell>
                  <TableCell>Befund (Vorschau)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {studies.map((study) => (
                  <TableRow key={study._id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedStudies.includes(study._id)}
                        onChange={() => handleToggle(study._id)}
                      />
                    </TableCell>
                    <TableCell>{formatDate(study.studyDate || study.uploadedAt)}</TableCell>
                    <TableCell>{study.modality || '-'}</TableCell>
                    <TableCell>{study.studyDescription || '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {study.findings || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button
          onClick={handleSelect}
          variant="contained"
          disabled={selectedStudies.length === 0}
        >
          Befunde übernehmen ({selectedStudies.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DicomRadiologieSelector;

