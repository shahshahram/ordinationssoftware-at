import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import {
  MonitorHeart,
  CheckCircle,
  Add as AddIcon,
  Refresh
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchVitalSigns,
  createVitalSigns,
  VitalSigns
} from '../store/slices/vitalSignsSlice';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface VitalSignsSelectorProps {
  patientId: string;
  appointmentId?: string;
  onSelect?: (vitalSigns: VitalSigns) => void;
  allowCreate?: boolean;
}

const VitalSignsSelector: React.FC<VitalSignsSelectorProps> = ({
  patientId,
  appointmentId,
  onSelect,
  allowCreate = true
}) => {
  const dispatch = useAppDispatch();
  const { vitalSigns, loading } = useAppSelector((state) => state.vitalSigns);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<VitalSigns>>({
    patientId,
    appointmentId,
    recordedAt: new Date().toISOString(),
    bloodPressure: {
      systolic: undefined,
      diastolic: undefined
    },
    pulse: undefined,
    respiratoryRate: undefined,
    temperature: {
      value: undefined,
      unit: 'celsius'
    },
    oxygenSaturation: undefined,
    bloodGlucose: {
      value: undefined,
      unit: 'mg/dL'
    },
    weight: {
      value: undefined,
      unit: 'kg'
    },
    height: {
      value: undefined,
      unit: 'cm'
    },
    painScale: {
      type: 'NRS',
      value: undefined
    },
    notes: ''
  });

  useEffect(() => {
    if (patientId) {
      dispatch(fetchVitalSigns(patientId));
    }
  }, [dispatch, patientId]);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleCreate = async () => {
    try {
      await dispatch(createVitalSigns(formData)).unwrap();
      setCreateDialogOpen(false);
      dispatch(fetchVitalSigns(patientId));
    } catch (err: any) {
      console.error('Fehler beim Erfassen der Vitalwerte:', err);
    }
  };

  const formatBloodPressure = (bp?: { systolic?: number; diastolic?: number }) => {
    if (bp?.systolic && bp?.diastolic) {
      return `${bp.systolic}/${bp.diastolic} mmHg`;
    }
    return '—';
  };

  const formatTemperature = (temp?: { value?: number; unit?: string }) => {
    if (temp?.value) {
      const unit = temp.unit === 'celsius' ? '°C' : '°F';
      return `${temp.value} ${unit}`;
    }
    return '—';
  };

  const formatValue = (value?: number, unit?: string) => {
    if (value !== undefined && value !== null) {
      return unit ? `${value} ${unit}` : `${value}`;
    }
    return '—';
  };

  // Zeige nur die letzten 5 Vitalwerte
  const recentVitalSigns = vitalSigns.slice(0, 5);

  if (loading && vitalSigns.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Vitalwerte</Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Aktualisieren">
            <IconButton
              size="small"
              onClick={() => dispatch(fetchVitalSigns(patientId))}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
          {allowCreate && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Neue Vitalwerte erfassen
            </Button>
          )}
        </Stack>
      </Box>

      {recentVitalSigns.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" align="center" py={4}>
              Noch keine Vitalwerte erfasst.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Datum & Zeit</TableCell>
                <TableCell align="right">Blutdruck</TableCell>
                <TableCell align="right">Puls</TableCell>
                <TableCell align="right">Temp.</TableCell>
                <TableCell align="right">SpO2</TableCell>
                <TableCell align="right">Aktion</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentVitalSigns.map((vitalSign) => (
                <TableRow key={vitalSign._id || vitalSign.id} hover>
                  <TableCell>
                    {vitalSign.recordedAt
                      ? format(new Date(vitalSign.recordedAt), 'dd.MM.yyyy HH:mm', { locale: de })
                      : '—'}
                  </TableCell>
                  <TableCell align="right">
                    {formatBloodPressure(vitalSign.bloodPressure)}
                  </TableCell>
                  <TableCell align="right">
                    {formatValue(vitalSign.pulse, 'bpm')}
                  </TableCell>
                  <TableCell align="right">
                    {formatTemperature(vitalSign.temperature)}
                  </TableCell>
                  <TableCell align="right">
                    {formatValue(vitalSign.oxygenSaturation, '%')}
                  </TableCell>
                  <TableCell align="right">
                    {onSelect && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CheckCircle />}
                        onClick={() => onSelect(vitalSign)}
                      >
                        Übernehmen
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog zum Erfassen neuer Vitalwerte */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Neue Vitalwerte erfassen</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Datum & Zeit"
              type="datetime-local"
              value={formData.recordedAt ? new Date(formData.recordedAt).toISOString().slice(0, 16) : ''}
              onChange={(e) => handleInputChange('recordedAt', new Date(e.target.value).toISOString())}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <Divider>Blutdruck</Divider>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Systolisch"
                  type="number"
                  value={formData.bloodPressure?.systolic || ''}
                  onChange={(e) => handleInputChange('bloodPressure.systolic', e.target.value ? Number(e.target.value) : undefined)}
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">mmHg</InputAdornment>
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Diastolisch"
                  type="number"
                  value={formData.bloodPressure?.diastolic || ''}
                  onChange={(e) => handleInputChange('bloodPressure.diastolic', e.target.value ? Number(e.target.value) : undefined)}
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">mmHg</InputAdornment>
                  }}
                />
              </Grid>
            </Grid>

            <Divider>Kreislauf & Atmung</Divider>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Puls"
                  type="number"
                  value={formData.pulse || ''}
                  onChange={(e) => handleInputChange('pulse', e.target.value ? Number(e.target.value) : undefined)}
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">bpm</InputAdornment>
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Atemfrequenz"
                  type="number"
                  value={formData.respiratoryRate || ''}
                  onChange={(e) => handleInputChange('respiratoryRate', e.target.value ? Number(e.target.value) : undefined)}
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">/min</InputAdornment>
                  }}
                />
              </Grid>
            </Grid>

            <Divider>Temperatur & Sauerstoff</Divider>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Temperatur"
                  type="number"
                  value={formData.temperature?.value || ''}
                  onChange={(e) => handleInputChange('temperature.value', e.target.value ? Number(e.target.value) : undefined)}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                          <Select
                            value={formData.temperature?.unit || 'celsius'}
                            onChange={(e) => handleInputChange('temperature.unit', e.target.value)}
                          >
                            <MenuItem value="celsius">°C</MenuItem>
                            <MenuItem value="fahrenheit">°F</MenuItem>
                          </Select>
                        </FormControl>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Sauerstoffsättigung (SpO2)"
                  type="number"
                  value={formData.oxygenSaturation || ''}
                  onChange={(e) => handleInputChange('oxygenSaturation', e.target.value ? Number(e.target.value) : undefined)}
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>
                  }}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleCreate} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Erfassen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VitalSignsSelector;

