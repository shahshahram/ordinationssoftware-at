import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSnackbar } from 'notistack';

interface DicomProvider {
  _id: string;
  name: string;
  code: string;
  integration: {
    protocol: string;
    dicomweb?: {
      baseUrl?: string;
      qidoEndpoint?: string;
      wadoEndpoint?: string;
    };
  };
}

interface DicomRetrieveDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  onRetrieveSuccess?: () => void;
}

const DicomRetrieveDialog: React.FC<DicomRetrieveDialogProps> = ({
  open,
  onClose,
  patientId,
  onRetrieveSuccess,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [providers, setProviders] = useState<DicomProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [_loading, _setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [retrieving, setRetrieving] = useState(false);
  const [studies, setStudies] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useState({
    patientId: '',
    patientName: '',
    studyDateFrom: '',
    studyDateTo: '',
    modality: '',
  });

  useEffect(() => {
    if (open) {
      fetchProviders();
      // Setze patientId wenn verfügbar
      if (patientId) {
        setSearchParams(prev => ({ ...prev, patientId }));
      }
    }
  }, [open, patientId]);

  const fetchProviders = async () => {
    try {
      const response = await api.get<{ success: boolean; data: DicomProvider[] }>('/dicom-providers');
      if (response.data?.success) {
        const dicomwebProviders = response.data.data.filter(
          p => p.integration?.protocol === 'dicomweb' && p.integration?.dicomweb?.baseUrl
        );
        setProviders(dicomwebProviders);
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der Provider:', error);
    }
  };

  const handleSearch = async () => {
    if (!selectedProviderId) {
      enqueueSnackbar('Bitte wählen Sie einen Provider aus', { variant: 'warning' });
      return;
    }

    setSearching(true);
    setStudies([]);
    try {
      const response = await api.post<{ success: boolean; data: any[] }>('/dicom/query', {
        providerId: selectedProviderId,
        ...searchParams,
      });

      if (response.data?.success) {
        const foundStudies = Array.isArray(response.data.data) ? response.data.data : [];
        setStudies(foundStudies);
        enqueueSnackbar(`${foundStudies.length} Studien gefunden`, { variant: 'success' });
      }
    } catch (error: any) {
      console.error('Fehler bei der Suche:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Fehler beim Abfragen der Studien',
        { variant: 'error' }
      );
    } finally {
      setSearching(false);
    }
  };

  const handleRetrieve = async (studyInstanceUID: string) => {
    if (!selectedProviderId || !patientId) {
      enqueueSnackbar('Provider und Patient-ID sind erforderlich', { variant: 'warning' });
      return;
    }

    setRetrieving(true);
    try {
      const response = await api.post<{ success: boolean; message: string; data: any[] }>('/dicom/retrieve', {
        providerId: selectedProviderId,
        studyInstanceUID,
        patientId,
      });

      if (response.data?.success) {
        enqueueSnackbar(response.data.message || 'Studien erfolgreich abgerufen', { variant: 'success' });
        if (onRetrieveSuccess) {
          onRetrieveSuccess();
        }
        // Entferne abgerufene Studie aus der Liste
        setStudies(prev => prev.filter(s => {
          const uid = s['0020000D']?.Value?.[0] || s.StudyInstanceUID;
          return uid !== studyInstanceUID;
        }));
      }
    } catch (error: any) {
      console.error('Fehler beim Abrufen:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Fehler beim Abrufen der Studie',
        { variant: 'error' }
      );
    } finally {
      setRetrieving(false);
    }
  };

  const formatDicomDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  };

  const getDicomValue = (obj: any, tag: string) => {
    if (obj[tag]?.Value) {
      return Array.isArray(obj[tag].Value) ? obj[tag].Value[0] : obj[tag].Value;
    }
    return obj[tag] || '';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>DICOM-Studien von externem PACS abrufen</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>DICOM-Provider</InputLabel>
            <Select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
            >
              {providers.map((provider) => (
                <MenuItem key={provider._id} value={provider._id}>
                  {provider.name} ({provider.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedProviderId && (
            <>
              <Typography variant="subtitle2">Suchparameter</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Patient-ID"
                  value={searchParams.patientId}
                  onChange={(e) => setSearchParams({ ...searchParams, patientId: e.target.value })}
                  size="small"
                />
                <TextField
                  label="Patientenname"
                  value={searchParams.patientName}
                  onChange={(e) => setSearchParams({ ...searchParams, patientName: e.target.value })}
                  size="small"
                />
                <TextField
                  label="Studiendatum von"
                  type="date"
                  value={searchParams.studyDateFrom}
                  onChange={(e) => setSearchParams({ ...searchParams, studyDateFrom: e.target.value })}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Studiendatum bis"
                  type="date"
                  value={searchParams.studyDateTo}
                  onChange={(e) => setSearchParams({ ...searchParams, studyDateTo: e.target.value })}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Modalität"
                  value={searchParams.modality}
                  onChange={(e) => setSearchParams({ ...searchParams, modality: e.target.value })}
                  size="small"
                  placeholder="CT, MR, CR, etc."
                />
              </Box>
              <Button
                variant="contained"
                startIcon={searching ? <CircularProgress size={20} /> : <SearchIcon />}
                onClick={handleSearch}
                disabled={searching}
              >
                Studien suchen
              </Button>
            </>
          )}

          {studies.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Gefundene Studien ({studies.length})
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Patientenname</TableCell>
                      <TableCell>Patient-ID</TableCell>
                      <TableCell>Studiendatum</TableCell>
                      <TableCell>Modalität</TableCell>
                      <TableCell>Studienbeschreibung</TableCell>
                      <TableCell align="right">Aktion</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {studies.map((study, index) => {
                      const studyInstanceUID = getDicomValue(study, '0020000D') || study.StudyInstanceUID;
                      const patientName = getDicomValue(study, '00100010') || study.PatientName || '';
                      const patientId = getDicomValue(study, '00100020') || study.PatientID || '';
                      const studyDate = formatDicomDate(getDicomValue(study, '00080020') || study.StudyDate || '');
                      const modality = getDicomValue(study, '00080060') || study.Modality || '';
                      const studyDescription = getDicomValue(study, '00081030') || study.StudyDescription || '';

                      return (
                        <TableRow key={studyInstanceUID || index}>
                          <TableCell>{patientName}</TableCell>
                          <TableCell>{patientId}</TableCell>
                          <TableCell>{studyDate}</TableCell>
                          <TableCell>
                            <Chip label={modality} size="small" />
                          </TableCell>
                          <TableCell>{studyDescription}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleRetrieve(studyInstanceUID)}
                              disabled={retrieving}
                              color="primary"
                            >
                              <DownloadIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {studies.length === 0 && !searching && selectedProviderId && (
            <Alert severity="info">
              Keine Studien gefunden. Bitte führen Sie eine Suche durch.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Schließen</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DicomRetrieveDialog;




