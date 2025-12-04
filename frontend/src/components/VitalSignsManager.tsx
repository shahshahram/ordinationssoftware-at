import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tooltip,
  CircularProgress,
  Stack,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MonitorHeart,
  Favorite,
  Air,
  Thermostat,
  Opacity,
  Bloodtype,
  MonitorWeight,
  Height,
  AccessTime,
  Person,
  ShowChart,
  Close
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchVitalSigns,
  createVitalSigns,
  updateVitalSigns,
  deleteVitalSigns,
  VitalSigns
} from '../store/slices/vitalSignsSlice';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import VitalSignsChart from './VitalSignsChart';

interface VitalSignsManagerProps {
  patientId: string;
  appointmentId?: string;
}

const VitalSignsManager: React.FC<VitalSignsManagerProps> = ({ patientId, appointmentId }) => {
  const dispatch = useAppDispatch();
  const { vitalSigns, loading, error } = useAppSelector((state) => state.vitalSigns);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingVitalSign, setEditingVitalSign] = useState<VitalSigns | null>(null);
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
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

  const handleOpenDialog = (vitalSign?: VitalSigns) => {
    if (vitalSign) {
      setEditingVitalSign(vitalSign);
      setFormData({
        ...vitalSign,
        recordedAt: vitalSign.recordedAt || new Date().toISOString()
      });
    } else {
      setEditingVitalSign(null);
      setFormData({
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
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingVitalSign(null);
  };

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

  const handleSubmit = async () => {
    try {
      if (editingVitalSign) {
        await dispatch(updateVitalSigns({
          id: editingVitalSign._id || editingVitalSign.id || '',
          data: formData
        })).unwrap();
      } else {
        await dispatch(createVitalSigns(formData)).unwrap();
      }
      handleCloseDialog();
      dispatch(fetchVitalSigns(patientId));
    } catch (err: any) {
      console.error('Fehler beim Speichern der Vitalwerte:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Möchten Sie diese Vitalwerte wirklich löschen?')) {
      try {
        await dispatch(deleteVitalSigns(id)).unwrap();
        dispatch(fetchVitalSigns(patientId));
      } catch (err: any) {
        console.error('Fehler beim Löschen der Vitalwerte:', err);
      }
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

  const formatWeight = (weight?: { value?: number; unit?: string }) => {
    if (weight?.value) {
      return `${weight.value} ${weight.unit}`;
    }
    return '—';
  };

  const formatHeight = (height?: { value?: number; unit?: string }) => {
    if (height?.value) {
      return `${height.value} ${height.unit}`;
    }
    return '—';
  };

  const formatBloodGlucose = (glucose?: { value?: number; unit?: string }) => {
    if (glucose?.value) {
      return `${glucose.value} ${glucose.unit}`;
    }
    return '—';
  };

  const formatPainScale = (pain?: { type?: string; value?: number | string }) => {
    if (pain?.value !== undefined && pain?.value !== null && pain?.value !== '') {
      return `${pain.type}: ${pain.value}`;
    }
    return '—';
  };

  // Funktion zum Prüfen, ob ein Vitalwert außerhalb der Norm ist
  const isVitalValueAbnormal = (type: string, value: number, unit?: string): boolean => {
    switch (type) {
      case 'bloodPressure_systolic':
        return value >= 130; // Hypertonie
      case 'bloodPressure_diastolic':
        return value >= 90; // Hypertonie
      case 'pulse':
        return value < 60 || value > 100; // Bradykardie oder Tachykardie
      case 'respiratoryRate':
        return value < 12 || value > 20; // Zu niedrig oder zu hoch
      case 'temperature':
        const tempCelsius = unit === 'fahrenheit' ? (value - 32) * 5/9 : value;
        return tempCelsius < 35 || tempCelsius >= 38; // Hypothermie oder Fieber
      case 'oxygenSaturation':
        return value < 95; // Hypoxie
      case 'bloodGlucose':
        // Normal nüchtern: 70-100 mg/dL, postprandial <140 mg/dL
        // Wir prüfen auf nüchtern-Werte (konservativer Ansatz)
        return value < 70 || value > 100;
      case 'bmi':
        return value < 18.5 || value >= 25; // Untergewicht oder Übergewicht
      default:
        return false;
    }
  };

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
        <Typography variant="h6">Vitalparameter</Typography>
        <Stack direction="row" spacing={1}>
          {vitalSigns.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<ShowChart />}
              onClick={() => setChartDialogOpen(true)}
            >
              Verlauf anzeigen
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Neue Vitalwerte erfassen
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {vitalSigns.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" align="center" py={4}>
              Noch keine Vitalwerte erfasst. Klicken Sie auf "Neue Vitalwerte erfassen", um zu beginnen.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Datum & Zeit</TableCell>
                <TableCell align="right">Blutdruck</TableCell>
                <TableCell align="right">Puls</TableCell>
                <TableCell align="right">Atemfrequenz</TableCell>
                <TableCell align="right">Temperatur</TableCell>
                <TableCell align="right">SpO2</TableCell>
                <TableCell align="right">Blutzucker</TableCell>
                <TableCell align="right">Gewicht</TableCell>
                <TableCell align="right">Größe</TableCell>
                <TableCell align="right">BMI</TableCell>
                <TableCell align="right">Schmerz</TableCell>
                <TableCell>Erfasst von</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vitalSigns.map((vitalSign) => {
                // Prüfe, welche Werte abnormal sind
                const bpSystolicAbnormal = vitalSign.bloodPressure?.systolic 
                  ? isVitalValueAbnormal('bloodPressure_systolic', vitalSign.bloodPressure.systolic)
                  : false;
                const bpDiastolicAbnormal = vitalSign.bloodPressure?.diastolic
                  ? isVitalValueAbnormal('bloodPressure_diastolic', vitalSign.bloodPressure.diastolic)
                  : false;
                const bpAbnormal = bpSystolicAbnormal || bpDiastolicAbnormal;
                const pulseAbnormal = vitalSign.pulse 
                  ? isVitalValueAbnormal('pulse', vitalSign.pulse)
                  : false;
                const respAbnormal = vitalSign.respiratoryRate
                  ? isVitalValueAbnormal('respiratoryRate', vitalSign.respiratoryRate)
                  : false;
                const tempAbnormal = vitalSign.temperature?.value
                  ? isVitalValueAbnormal('temperature', vitalSign.temperature.value, vitalSign.temperature.unit)
                  : false;
                const spo2Abnormal = vitalSign.oxygenSaturation
                  ? isVitalValueAbnormal('oxygenSaturation', vitalSign.oxygenSaturation)
                  : false;
                const bgAbnormal = vitalSign.bloodGlucose?.value
                  ? isVitalValueAbnormal('bloodGlucose', vitalSign.bloodGlucose.value)
                  : false;
                const bmiAbnormal = vitalSign.bmi
                  ? isVitalValueAbnormal('bmi', vitalSign.bmi)
                  : false;

                return (
                  <TableRow key={vitalSign._id || vitalSign.id}>
                    <TableCell>
                      {vitalSign.recordedAt
                        ? format(new Date(vitalSign.recordedAt), 'dd.MM.yyyy HH:mm', { locale: de })
                        : '—'}
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{
                        bgcolor: bpAbnormal ? '#fff3cd' : 'transparent',
                        color: bpAbnormal ? '#856404' : 'inherit',
                        fontWeight: bpAbnormal ? 600 : 400
                      }}
                    >
                      {formatBloodPressure(vitalSign.bloodPressure)}
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{
                        bgcolor: pulseAbnormal ? '#fff3cd' : 'transparent',
                        color: pulseAbnormal ? '#856404' : 'inherit',
                        fontWeight: pulseAbnormal ? 600 : 400
                      }}
                    >
                      {vitalSign.pulse ? `${vitalSign.pulse} bpm` : '—'}
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{
                        bgcolor: respAbnormal ? '#fff3cd' : 'transparent',
                        color: respAbnormal ? '#856404' : 'inherit',
                        fontWeight: respAbnormal ? 600 : 400
                      }}
                    >
                      {vitalSign.respiratoryRate ? `${vitalSign.respiratoryRate} /min` : '—'}
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{
                        bgcolor: tempAbnormal ? '#fff3cd' : 'transparent',
                        color: tempAbnormal ? '#856404' : 'inherit',
                        fontWeight: tempAbnormal ? 600 : 400
                      }}
                    >
                      {formatTemperature(vitalSign.temperature)}
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{
                        bgcolor: spo2Abnormal ? '#fff3cd' : 'transparent',
                        color: spo2Abnormal ? '#856404' : 'inherit',
                        fontWeight: spo2Abnormal ? 600 : 400
                      }}
                    >
                      {vitalSign.oxygenSaturation ? `${vitalSign.oxygenSaturation}%` : '—'}
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{
                        bgcolor: bgAbnormal ? '#fff3cd' : 'transparent',
                        color: bgAbnormal ? '#856404' : 'inherit',
                        fontWeight: bgAbnormal ? 600 : 400
                      }}
                    >
                      {formatBloodGlucose(vitalSign.bloodGlucose)}
                    </TableCell>
                    <TableCell align="right">
                      {formatWeight(vitalSign.weight)}
                    </TableCell>
                    <TableCell align="right">
                      {formatHeight(vitalSign.height)}
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{
                        bgcolor: bmiAbnormal ? '#fff3cd' : 'transparent',
                        color: bmiAbnormal ? '#856404' : 'inherit',
                        fontWeight: bmiAbnormal ? 600 : 400
                      }}
                    >
                      {vitalSign.bmi ? vitalSign.bmi.toFixed(1) : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {formatPainScale(vitalSign.painScale)}
                    </TableCell>
                    <TableCell>
                      {vitalSign.recordedBy
                        ? `${vitalSign.recordedBy.firstName || ''} ${vitalSign.recordedBy.lastName || ''}`.trim() || '—'
                        : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Bearbeiten">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(vitalSign)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Löschen">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(vitalSign._id || vitalSign.id || '')}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingVitalSign ? 'Vitalwerte bearbeiten' : 'Neue Vitalwerte erfassen'}
        </DialogTitle>
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

            <Divider>Blutzucker</Divider>
            <Grid container spacing={2}>
              <Grid size={{ xs: 8 }}>
                <TextField
                  label="Blutzucker"
                  type="number"
                  value={formData.bloodGlucose?.value || ''}
                  onChange={(e) => handleInputChange('bloodGlucose.value', e.target.value ? Number(e.target.value) : undefined)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Einheit</InputLabel>
                  <Select
                    value={formData.bloodGlucose?.unit || 'mg/dL'}
                    onChange={(e) => handleInputChange('bloodGlucose.unit', e.target.value)}
                  >
                    <MenuItem value="mg/dL">mg/dL</MenuItem>
                    <MenuItem value="mmol/L">mmol/L</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Divider>Gewicht & Größe</Divider>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Gewicht"
                  type="number"
                  value={formData.weight?.value || ''}
                  onChange={(e) => handleInputChange('weight.value', e.target.value ? Number(e.target.value) : undefined)}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <FormControl size="small" sx={{ minWidth: 70 }}>
                          <Select
                            value={formData.weight?.unit || 'kg'}
                            onChange={(e) => handleInputChange('weight.unit', e.target.value)}
                          >
                            <MenuItem value="kg">kg</MenuItem>
                            <MenuItem value="lbs">lbs</MenuItem>
                          </Select>
                        </FormControl>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Größe"
                  type="number"
                  value={formData.height?.value || ''}
                  onChange={(e) => handleInputChange('height.value', e.target.value ? Number(e.target.value) : undefined)}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <FormControl size="small" sx={{ minWidth: 70 }}>
                          <Select
                            value={formData.height?.unit || 'cm'}
                            onChange={(e) => handleInputChange('height.unit', e.target.value)}
                          >
                            <MenuItem value="cm">cm</MenuItem>
                            <MenuItem value="inches">inches</MenuItem>
                          </Select>
                        </FormControl>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
            </Grid>

            <Divider>Schmerzskala</Divider>
            <Grid container spacing={2}>
              <Grid size={{ xs: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Typ</InputLabel>
                  <Select
                    value={formData.painScale?.type || 'NRS'}
                    onChange={(e) => handleInputChange('painScale.type', e.target.value)}
                  >
                    <MenuItem value="NRS">NRS (0-10)</MenuItem>
                    <MenuItem value="VAS">VAS (0-100)</MenuItem>
                    <MenuItem value="VRS">VRS (Text)</MenuItem>
                    <MenuItem value="KUSS">KUSS (0-10)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 8 }}>
                <TextField
                  label="Wert"
                  value={formData.painScale?.value || ''}
                  onChange={(e) => handleInputChange('painScale.value', e.target.value)}
                  fullWidth
                  placeholder={formData.painScale?.type === 'VRS' ? 'Textbeschreibung' : '0-10 oder 0-100'}
                />
              </Grid>
            </Grid>

            <TextField
              label="Notizen"
              multiline
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : editingVitalSign ? 'Aktualisieren' : 'Erfassen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Vitalwerte-Chart Dialog */}
      <Dialog
        open={chartDialogOpen}
        onClose={() => setChartDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Vitalwerte-Verlauf</Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={() => setChartDialogOpen(false)}
              aria-label="close"
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <VitalSignsChart vitalSigns={vitalSigns || []} patientId={patientId} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChartDialogOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VitalSignsManager;
