// @ts-nocheck
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
  Grid,
  Box,
  Typography,
  Chip,
  Autocomplete,
  Alert
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPatients } from '../store/slices/patientSlice';
import { fetchAppointments } from '../store/slices/appointmentSlice';

interface PerformanceFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  performance?: any;
}

const PerformanceForm: React.FC<PerformanceFormProps> = ({
  open,
  onClose,
  onSave,
  performance
}) => {
  const dispatch = useDispatch();
  const { patients } = useSelector((state: any) => state.patients);
  const { appointments } = useSelector((state: any) => state.appointments);
  
  // Form State
  const [formData, setFormData] = useState({
    patientId: '',
    appointmentId: '',
    serviceCode: '',
    serviceDescription: '',
    serviceDatetime: new Date().toISOString().slice(0, 16),
    unitPrice: 0,
    quantity: 1,
    tariffType: 'privat',
    notes: '',
    diagnosisCodes: [] as string[],
    medicationCodes: [] as string[]
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Service-Katalog für Autocomplete
  const serviceCatalog = [
    { code: '111', description: 'Ordinationskonsultation', price: 35.00 },
    { code: '112', description: 'Erweiterte Konsultation', price: 50.00 },
    { code: '113', description: 'Hausbesuch', price: 80.00 },
    { code: '114', description: 'Notfallkonsultation', price: 100.00 },
    { code: '201', description: 'Blutdruckmessung', price: 15.00 },
    { code: '202', description: 'EKG', price: 45.00 },
    { code: '203', description: 'Ultraschall', price: 120.00 },
    { code: '301', description: 'Impfung', price: 25.00 },
    { code: '302', description: 'Wundversorgung', price: 30.00 },
    { code: '303', description: 'Verband', price: 20.00 }
  ];

  // Form initialisieren
  useEffect(() => {
    if (performance) {
      setFormData({
        patientId: performance.patientId._id || '',
        appointmentId: performance.appointmentId?._id || '',
        serviceCode: performance.serviceCode || '',
        serviceDescription: performance.serviceDescription || '',
        serviceDatetime: performance.serviceDatetime ? 
          new Date(performance.serviceDatetime).toISOString().slice(0, 16) : 
          new Date().toISOString().slice(0, 16),
        unitPrice: performance.unitPrice || 0,
        quantity: performance.quantity || 1,
        tariffType: performance.tariffType || 'privat',
        notes: performance.notes || '',
        diagnosisCodes: performance.diagnosisCodes || [],
        medicationCodes: performance.medicationCodes || []
      });
    } else {
      setFormData({
        patientId: '',
        appointmentId: '',
        serviceCode: '',
        serviceDescription: '',
        serviceDatetime: new Date().toISOString().slice(0, 16),
        unitPrice: 0,
        quantity: 1,
        tariffType: 'privat',
        notes: '',
        diagnosisCodes: [],
        medicationCodes: []
      });
    }
    setErrors({});
  }, [performance, open]);

  // Patienten und Termine laden
  useEffect(() => {
    if (open) {
      // dispatch(fetchPatients({}));
      // dispatch(fetchAppointments({}));
    }
  }, [open, dispatch]);

  // Form-Validierung
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.patientId) {
      newErrors.patientId = 'Patient ist erforderlich';
    }
    
    if (!formData.serviceCode) {
      newErrors.serviceCode = 'Leistungscode ist erforderlich';
    }
    
    if (!formData.serviceDescription) {
      newErrors.serviceDescription = 'Leistungsbeschreibung ist erforderlich';
    }
    
    if (!formData.serviceDatetime) {
      newErrors.serviceDatetime = 'Datum ist erforderlich';
    }
    
    if (formData.unitPrice <= 0) {
      newErrors.unitPrice = 'Preis muss größer als 0 sein';
    }
    
    if (formData.quantity <= 0) {
      newErrors.quantity = 'Anzahl muss größer als 0 sein';
    }
    
    if (!formData.tariffType) {
      newErrors.tariffType = 'Tariftyp ist erforderlich';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form-Feld ändern
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Fehler für dieses Feld entfernen
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Service aus Katalog auswählen
  const handleServiceSelect = (service: any) => {
    if (service) {
      setFormData(prev => ({
        ...prev,
        serviceCode: service.code,
        serviceDescription: service.description,
        unitPrice: service.price
      }));
    }
  };

  // Termin auswählen und Patient automatisch setzen
  const handleAppointmentSelect = (appointmentId: string) => {
    const appointment = appointments.find((apt: any) => apt._id === appointmentId);
    if (appointment) {
      setFormData(prev => ({
        ...prev,
        appointmentId: appointmentId,
        patientId: appointment.patient?._id || appointment.patientId || '',
        serviceDatetime: new Date(appointment.startTime).toISOString().slice(0, 16)
      }));
    }
  };

  // Formular speichern
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Gesamtpreis berechnen
      const totalPrice = formData.unitPrice * formData.quantity;
      
      const performanceData = {
        ...formData,
        totalPrice,
        serviceDatetime: new Date(formData.serviceDatetime).toISOString()
      };
      
      await onSave(performanceData);
      
    } catch (error) {
      console.error('Speichern Fehler:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gesamtpreis berechnen
  const totalPrice = formData.unitPrice * formData.quantity;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {performance ? 'Leistung bearbeiten' : 'Neue Leistung erstellen'}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Grid container spacing={3}>
            {/* Patient */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth error={!!errors.patientId}>
                <InputLabel>Patient *</InputLabel>
                <Select
                  value={formData.patientId}
                  label="Patient *"
                  onChange={(e) => handleFieldChange('patientId', e.target.value)}
                >
                  {patients.map((patient: any) => (
                    <MenuItem key={patient._id} value={patient._id}>
                      {patient.firstName} {patient.lastName}
                      {patient.email && ` (${patient.email})`}
                    </MenuItem>
                  ))}
                </Select>
                {errors.patientId && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {errors.patientId}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            {/* Termin */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Termin (optional)</InputLabel>
                <Select
                  value={formData.appointmentId}
                  label="Termin (optional)"
                  onChange={(e) => handleAppointmentSelect(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Kein Termin</em>
                  </MenuItem>
                  {appointments.map((appointment: any) => (
                    <MenuItem key={appointment._id} value={appointment._id}>
                      {new Date(appointment.startTime).toLocaleDateString('de-DE')} - 
                      {appointment.patient ? `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() || 'Unbekannter Patient' : 'Unbekannter Patient'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Service-Code und Beschreibung */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                options={serviceCatalog}
                getOptionLabel={(option) => `${option.code} - ${option.description}`}
                value={serviceCatalog.find(s => s.code === formData.serviceCode) || null}
                onChange={(_, value) => handleServiceSelect(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Leistung *"
                    error={!!errors.serviceCode}
                    helperText={errors.serviceCode}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...restProps } = props;
                  return (
                    <Box component="li" key={key} {...restProps}>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {option.code} - {option.description}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {option.price.toFixed(2)} €
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
              />
            </Grid>
            
            {/* Datum */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Datum und Uhrzeit *"
                type="datetime-local"
                value={formData.serviceDatetime}
                onChange={(e) => handleFieldChange('serviceDatetime', e.target.value)}
                error={!!errors.serviceDatetime}
                helperText={errors.serviceDatetime}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            {/* Einzelpreis */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Einzelpreis (€) *"
                type="number"
                value={formData.unitPrice}
                onChange={(e) => handleFieldChange('unitPrice', parseFloat(e.target.value) || 0)}
                error={!!errors.unitPrice}
                helperText={errors.unitPrice}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            
            {/* Anzahl */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Anzahl *"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 1)}
                error={!!errors.quantity}
                helperText={errors.quantity}
                inputProps={{ min: 1 }}
              />
            </Grid>
            
            {/* Gesamtpreis (Read-only) */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Gesamtpreis (€)"
                value={totalPrice.toFixed(2)}
                InputProps={{ readOnly: true }}
                sx={{
                  '& .MuiInputBase-input': {
                    fontWeight: 'bold',
                    color: 'primary.main'
                  }
                }}
              />
            </Grid>
            
            {/* Tariftyp */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth error={!!errors.tariffType}>
                <InputLabel>Tariftyp *</InputLabel>
                <Select
                  value={formData.tariffType}
                  label="Tariftyp *"
                  onChange={(e) => handleFieldChange('tariffType', e.target.value)}
                >
                  <MenuItem value="kassa">Kassenarzt</MenuItem>
                  <MenuItem value="wahl">Wahlarzt</MenuItem>
                  <MenuItem value="privat">Privat</MenuItem>
                </Select>
                {errors.tariffType && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {errors.tariffType}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            {/* Diagnose-Codes */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Diagnose-Codes (kommagetrennt)"
                value={formData.diagnosisCodes.join(', ')}
                onChange={(e) => handleFieldChange('diagnosisCodes', e.target.value.split(',').map(code => code.trim()).filter(code => code))}
                placeholder="z.B. E10.1, I10"
                helperText="ICD-10 Codes durch Komma trennen"
              />
            </Grid>
            
            {/* Notizen */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Notizen"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Zusätzliche Informationen zur Leistung..."
              />
            </Grid>
            
            {/* Tariftyp-Info */}
            <Grid size={{ xs: 12 }}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Tariftyp-Informationen:</strong>
                </Typography>
                <Typography variant="body2" component="div">
                  • <strong>Kassenarzt:</strong> Direkte Abrechnung mit der Krankenkasse
                </Typography>
                <Typography variant="body2" component="div">
                  • <strong>Wahlarzt:</strong> Patient zahlt, Rückerstattung von der Kasse
                </Typography>
                <Typography variant="body2" component="div">
                  • <strong>Privat:</strong> Direkte Abrechnung mit dem Patienten
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Abbrechen
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Speichern...' : (performance ? 'Aktualisieren' : 'Erstellen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PerformanceForm;
