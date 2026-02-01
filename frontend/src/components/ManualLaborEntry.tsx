import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  Typography,
  Divider,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { Delete, Science } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../utils/api';

interface LaborResult {
  _id: string;
  resultDate: string;
  collectionDate: string;
  status: string;
  providerId: {
    _id?: string;
    name: string;
    code: string;
  } | string;
  results: Array<{
    loincCode: string;
    testName: string;
    value: number | string;
    unit: string;
    referenceRange: {
      low?: number;
      high?: number;
      text?: string;
    };
  }>;
  interpretation?: string;
  laboratoryComment?: string;
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
}

interface LaborProvider {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface ManualLaborEntryProps {
  open: boolean;
  onClose: () => void;
  patientId?: string;
  onSave: () => void;
  editingResult?: LaborResult | {
    _id: string;
    resultDate: string;
    collectionDate: string;
    status: string;
    providerId: {
      name: string;
      code: string;
    } | string;
    results: Array<{
      loincCode: string;
      testName: string;
      value: number | string;
      unit: string;
      referenceRange: {
        low?: number;
        high?: number;
        text?: string;
      };
      interpretation?: 'normal' | 'low' | 'high' | 'critical' | 'abnormal';
      isCritical?: boolean;
      comment?: string;
    }>;
    interpretation?: string;
    laboratoryComment?: string;
    hasCriticalValues?: boolean;
    metadata?: any;
  };
}

const ManualLaborEntry: React.FC<ManualLaborEntryProps> = ({
  open,
  onClose,
  patientId,
  onSave,
  editingResult,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [providers, setProviders] = useState<LaborProvider[]>([]);
  const [formData, setFormData] = useState({
    patientId: patientId || '',
    providerId: '',
    resultDate: new Date().toISOString().split('T')[0],
    collectionDate: new Date().toISOString().split('T')[0],
    results: [
      {
        testName: '',
        value: '',
        unit: '',
        loincCode: '',
        referenceRange: { low: '', high: '', text: '' },
      },
    ],
    interpretation: '',
    laboratoryComment: '',
  });

  useEffect(() => {
    if (open) {
      fetchPatients();
      fetchProviders();
      
      // Wenn editingResult vorhanden ist, Formular vorausfüllen
      if (editingResult) {
        let providerIdValue = '';
        if (typeof editingResult.providerId === 'string') {
          providerIdValue = editingResult.providerId;
        } else if (editingResult.providerId && typeof editingResult.providerId === 'object') {
          providerIdValue = ('_id' in editingResult.providerId && editingResult.providerId._id) 
            ? editingResult.providerId._id 
            : '';
        }
        
        setFormData({
          patientId: patientId || '',
          providerId: providerIdValue,
          resultDate: editingResult.resultDate || new Date().toISOString().split('T')[0],
          collectionDate: editingResult.collectionDate || new Date().toISOString().split('T')[0],
          results: editingResult.results?.map(r => ({
            testName: r.testName || '',
            value: typeof r.value === 'number' ? r.value.toString() : (r.value || ''),
            unit: r.unit || '',
            loincCode: r.loincCode || '',
            referenceRange: {
              low: r.referenceRange?.low?.toString() || '',
              high: r.referenceRange?.high?.toString() || '',
              text: r.referenceRange?.text || '',
            },
          })) || [{
            testName: '',
            value: '',
            unit: '',
            loincCode: '',
            referenceRange: { low: '', high: '', text: '' },
          }],
          interpretation: editingResult.interpretation || '',
          laboratoryComment: editingResult.laboratoryComment || '',
        });
      } else {
        // Reset form for new entry
        setFormData({
          patientId: patientId || '',
          providerId: '',
          resultDate: new Date().toISOString().split('T')[0],
          collectionDate: new Date().toISOString().split('T')[0],
          results: [
            {
              testName: '',
              value: '',
              unit: '',
              loincCode: '',
              referenceRange: { low: '', high: '', text: '' },
            },
          ],
          interpretation: '',
          laboratoryComment: '',
        });
      }
    }
  }, [open, editingResult, patientId]);

  const fetchPatients = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Patient[] }>('/patients');
      if (response.data?.success) {
        setPatients(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await api.get<{ success: boolean; data: LaborProvider[] }>('/labor/providers');
      if (response.data?.success) {
        setProviders(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const addResultRow = () => {
    setFormData({
      ...formData,
      results: [
        ...formData.results,
        {
          testName: '',
          value: '',
          unit: '',
          loincCode: '',
          referenceRange: { low: '', high: '', text: '' },
        },
      ],
    });
  };

  const removeResultRow = (index: number) => {
    if (formData.results.length > 1) {
      setFormData({
        ...formData,
        results: formData.results.filter((_, i) => i !== index),
      });
    }
  };

  const updateResultRow = (index: number, field: string, value: any) => {
    const newResults = [...formData.results];
    if (field.startsWith('referenceRange.')) {
      const refField = field.split('.')[1];
      newResults[index] = {
        ...newResults[index],
        referenceRange: {
          ...newResults[index].referenceRange,
          [refField]: value,
        },
      };
    } else {
      newResults[index] = {
        ...newResults[index],
        [field]: value,
      };
    }
    setFormData({
      ...formData,
      results: newResults,
    });
  };

  const handleSave = async () => {
    if (!formData.patientId || !formData.providerId) {
      enqueueSnackbar('Bitte wählen Sie einen Patienten und einen Provider aus', { variant: 'warning' });
      return;
    }

    const filteredResults = formData.results.filter(r => r.testName && r.value);
    
    if (filteredResults.length === 0) {
      enqueueSnackbar('Bitte geben Sie mindestens einen Laborwert ein', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const results = filteredResults.map(r => ({
        testName: r.testName,
        value: r.value,
        unit: r.unit || '',
        loincCode: r.loincCode || '',
        referenceRange: r.referenceRange.low || r.referenceRange.high || r.referenceRange.text
          ? {
              low: r.referenceRange.low ? parseFloat(r.referenceRange.low) : undefined,
              high: r.referenceRange.high ? parseFloat(r.referenceRange.high) : undefined,
              text: r.referenceRange.text || undefined,
            }
          : undefined,
      }));

      const response = await api.post<{ success: boolean; message?: string; data?: any }>(
        '/labor/manual',
        {
          patientId: formData.patientId,
          providerId: formData.providerId,
          resultDate: formData.resultDate,
          collectionDate: formData.collectionDate,
          results,
          interpretation: formData.interpretation || undefined,
          laboratoryComment: formData.laboratoryComment || undefined,
        }
      );

      if (response.data?.success) {
        enqueueSnackbar('Laborwerte erfolgreich gespeichert', { variant: 'success' });
        onSave();
        onClose();
      } else {
        enqueueSnackbar(response.data?.message || 'Fehler beim Speichern', { variant: 'error' });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Fehler bei der manuellen Eingabe';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      console.error('Error saving manual labor entry:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {editingResult ? 'Laborergebnis bearbeiten' : 'Manuelles Laborergebnis eingeben'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Autocomplete
            options={patients}
            getOptionLabel={(option) => 
              `${option.firstName} ${option.lastName}${option.dateOfBirth ? ` (${new Date(option.dateOfBirth).toLocaleDateString('de-DE')})` : ''}`
            }
            value={patients.find(p => p._id === formData.patientId) || null}
            onChange={(_, newValue) => {
              setFormData({ ...formData, patientId: newValue?._id || '' });
            }}
            disabled={!!patientId}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Patient" 
                required 
                helperText={patientId ? 'Patient ist bereits ausgewählt' : 'Wählen Sie einen Patienten aus'}
              />
            )}
          />

          <FormControl fullWidth required>
            <InputLabel>Provider</InputLabel>
            <Select
              value={formData.providerId}
              onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
            >
              {providers
                .filter(p => p.isActive)
                .map((provider) => (
                  <MenuItem key={provider._id} value={provider._id}>
                    {provider.name} ({provider.code})
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Ergebnis-Datum"
                type="date"
                value={formData.resultDate}
                onChange={(e) => setFormData({ ...formData, resultDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Entnahme-Datum"
                type="date"
                value={formData.collectionDate}
                onChange={(e) => setFormData({ ...formData, collectionDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 1 }}>Laborwerte</Divider>

          {formData.results.map((result, index) => (
            <Card key={index} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2">Wert {index + 1}</Typography>
                {formData.results.length > 1 && (
                  <Button
                    size="small"
                    color="error"
                    onClick={() => removeResultRow(index)}
                    startIcon={<Delete />}
                  >
                    Entfernen
                  </Button>
                )}
              </Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Test-Name"
                    value={result.testName}
                    onChange={(e) => updateResultRow(index, 'testName', e.target.value)}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    label="Wert"
                    value={result.value}
                    onChange={(e) => updateResultRow(index, 'value', e.target.value)}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    label="Einheit"
                    value={result.unit}
                    onChange={(e) => updateResultRow(index, 'unit', e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="LOINC-Code"
                    value={result.loincCode}
                    onChange={(e) => updateResultRow(index, 'loincCode', e.target.value)}
                    helperText="Format: 12345-6"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }}>
                  <TextField
                    fullWidth
                    label="Ref. Low"
                    type="number"
                    value={result.referenceRange.low}
                    onChange={(e) => updateResultRow(index, 'referenceRange.low', e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }}>
                  <TextField
                    fullWidth
                    label="Ref. High"
                    type="number"
                    value={result.referenceRange.high}
                    onChange={(e) => updateResultRow(index, 'referenceRange.high', e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }}>
                  <TextField
                    fullWidth
                    label="Ref. Text"
                    value={result.referenceRange.text}
                    onChange={(e) => updateResultRow(index, 'referenceRange.text', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Card>
          ))}

          <Button
            variant="outlined"
            onClick={addResultRow}
            startIcon={<Science />}
          >
            Weitere Laborwerte hinzufügen
          </Button>

          <TextField
            fullWidth
            label="Interpretation (optional)"
            multiline
            rows={2}
            value={formData.interpretation}
            onChange={(e) => setFormData({ ...formData, interpretation: e.target.value })}
          />

          <TextField
            fullWidth
            label="Labor-Kommentar (optional)"
            multiline
            rows={2}
            value={formData.laboratoryComment}
            onChange={(e) => setFormData({ ...formData, laboratoryComment: e.target.value })}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Abbrechen
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={loading || !formData.patientId || !formData.providerId}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? 'Speichern...' : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualLaborEntry;
