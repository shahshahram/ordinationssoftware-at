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
  Alert,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPatients } from '../store/slices/patientSlice';
import { fetchAppointments } from '../store/slices/appointmentSlice';

interface PerformanceFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  performance?: any;
  patientDiagnoses?: Array<{
    _id?: string;
    icd10Code: string;
    display?: string;
    status?: string;
    isPrimary?: boolean;
  }>;
}

const PerformanceForm: React.FC<PerformanceFormProps> = ({
  open,
  onClose,
  onSave,
  performance,
  patientDiagnoses = []
}) => {
  const dispatch = useDispatch();
  const { patients } = useSelector((state: any) => state.patients);
  const { appointments } = useSelector((state: any) => state.appointments);
  const { user } = useSelector((state: any) => state.auth);
  
  // Systemeinstellung für automatische Abrechnung
  const systemAutoBillingEnabled = user?.profile?.preferences?.autoBillingEnabled || false;
  
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
    medicationCodes: [] as string[],
    autoBill: false // Checkbox: Automatisch abrechnen
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
        patientId: performance.patientId 
          ? (typeof performance.patientId === 'string' 
              ? performance.patientId 
              : (performance.patientId._id || ''))
          : '',
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
        medicationCodes: performance.medicationCodes || [],
        autoBill: false // Beim Bearbeiten immer false (nur für neue Leistungen)
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
        medicationCodes: [],
        autoBill: systemAutoBillingEnabled ? true : false // Systemeinstellung hat Priorität: wenn aktiviert, Checkbox automatisch aktivieren
      });
    }
    setErrors({});
  }, [performance, open, systemAutoBillingEnabled]);

  // Patienten und Termine laden
  useEffect(() => {
    if (open) {
      dispatch(fetchPatients(1));
      dispatch(fetchAppointments());
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
      // Gesamtpreis berechnen und sicherstellen, dass alle numerischen Werte als Zahlen gesendet werden
      const unitPrice = parseFloat(formData.unitPrice) || 0;
      const quantity = parseInt(formData.quantity) || 1;
      const totalPrice = unitPrice * quantity;
      
      // Validate patientId
      if (!formData.patientId || formData.patientId.trim() === '') {
        setErrors({ patientId: 'Patient ist erforderlich' });
        setLoading(false);
        return;
      }

      // Validate that selected patient exists in the loaded patients list
      const patientExists = patients?.some((p: any) => p._id === formData.patientId);
      if (!patientExists) {
        setErrors({ 
          patientId: 'Der ausgewählte Patient existiert nicht mehr. Bitte wählen Sie einen anderen Patienten aus der Liste oder aktualisieren Sie die Liste.' 
        });
        setLoading(false);
        return;
      }

      const performanceData: any = {
        patientId: formData.patientId,
        serviceCode: formData.serviceCode,
        serviceDescription: formData.serviceDescription,
        serviceDatetime: new Date(formData.serviceDatetime).toISOString(),
        unitPrice,
        quantity,
        totalPrice,
        tariffType: formData.tariffType,
        notes: formData.notes || undefined,
        diagnosisCodes: formData.diagnosisCodes && formData.diagnosisCodes.length > 0 ? formData.diagnosisCodes : undefined,
        medicationCodes: formData.medicationCodes && formData.medicationCodes.length > 0 ? formData.medicationCodes : undefined,
        autoBill: systemAutoBillingEnabled ? true : formData.autoBill // Systemeinstellung hat Priorität
      };
      
      // Nur appointmentId hinzufügen, wenn es nicht leer ist
      if (formData.appointmentId) {
        performanceData.appointmentId = formData.appointmentId;
      }
      
      console.log('Sending performance data:', performanceData);
      console.log('FormData patientId:', formData.patientId);
      console.log('FormData patientId type:', typeof formData.patientId);
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
              <Autocomplete
                options={patients || []}
                getOptionLabel={(option: any) => 
                  option ? `${option.firstName || ''} ${option.lastName || ''}`.trim() || 'Unbekannter Patient' : ''
                }
                isOptionEqualToValue={(option: any, value: any) => 
                  option?._id === value?._id
                }
                value={patients.find((p: any) => p._id === formData.patientId) || null}
                onChange={(_, newValue: any) => {
                  console.log('Patient selected:', newValue);
                  console.log('Patient _id:', newValue?._id);
                  const patientId = newValue?._id || '';
                  console.log('Setting patientId to:', patientId);
                  handleFieldChange('patientId', patientId);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Patient *"
                    error={!!errors.patientId}
                    helperText={errors.patientId}
                    placeholder="Patient suchen..."
                  />
                )}
                renderOption={(props, option: any) => {
                  const { key, ...restProps } = props;
                  return (
                    <Box component="li" key={option._id || key} {...restProps}>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {option.firstName} {option.lastName}
                        </Typography>
                        {option.email && (
                          <Typography variant="caption" color="textSecondary">
                            {option.email}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                }}
                filterOptions={(options: any[], { inputValue }) => {
                  if (!inputValue) return options;
                  const searchTerm = inputValue.toLowerCase();
                  return options.filter((patient: any) => 
                    `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase().includes(searchTerm) ||
                    (patient.email && patient.email.toLowerCase().includes(searchTerm))
                  );
                }}
                noOptionsText="Keine Patienten gefunden"
                loadingText="Lade Patienten..."
              />
            </Grid>
            
            {/* Termin */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Termin (optional)</InputLabel>
                <Select
                  value={formData.appointmentId && appointments.some((apt: any) => apt._id === formData.appointmentId) 
                    ? formData.appointmentId 
                    : ''}
                  label="Termin (optional)"
                  onChange={(e) => handleAppointmentSelect(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Kein Termin</em>
                  </MenuItem>
                  {(appointments || []).map((appointment: any) => (
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
              <Autocomplete
                multiple
                options={patientDiagnoses
                  .filter((diag: any) => diag.status === 'active' || !diag.status)
                  .map((diag: any) => ({
                    code: diag.code || diag.icd10Code || '',
                    display: diag.display || diag.code || diag.icd10Code || '',
                    label: `${diag.code || diag.icd10Code || ''} - ${diag.display || ''}`.trim()
                  }))
                  .filter((diag: any) => diag.code)}
                getOptionLabel={(option: any) => option.label || option.code || ''}
                isOptionEqualToValue={(option: any, value: any) => option.code === value.code}
                value={formData.diagnosisCodes.map((code: string) => {
                  const diag = patientDiagnoses.find((d: any) => (d.code || d.icd10Code) === code);
                  if (diag) {
                    return {
                      code: diag.code || diag.icd10Code || '',
                      display: diag.display || '',
                      label: `${diag.code || diag.icd10Code || ''} - ${diag.display || ''}`.trim()
                    };
                  }
                  return { code, display: '', label: code };
                })}
                onChange={(_, newValue: any[]) => {
                  handleFieldChange('diagnosisCodes', newValue.map((v: any) => v.code || v).filter((c: string) => c));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Diagnose-Codes"
                    placeholder="Diagnosen auswählen oder manuell eingeben"
                    helperText={patientDiagnoses.length > 0 
                      ? `${patientDiagnoses.filter((d: any) => d.status === 'active' || !d.status).length} aktive Diagnosen verfügbar`
                      : "ICD-10 Codes durch Komma trennen"}
                  />
                )}
                renderTags={(value: any[], getTagProps) =>
                  value.map((option: any, index: number) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.code || option}
                      label={option.label || option.code || option}
                      size="small"
                    />
                  ))
                }
                freeSolo
                filterOptions={(options: any[], { inputValue }) => {
                  if (!inputValue) return options;
                  const searchTerm = inputValue.toLowerCase();
                  return options.filter((option: any) =>
                    (option.code || '').toLowerCase().includes(searchTerm) ||
                    (option.display || '').toLowerCase().includes(searchTerm) ||
                    (option.label || '').toLowerCase().includes(searchTerm)
                  );
                }}
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
            
            {/* Automatische Abrechnung - Checkbox (nur wenn Systemeinstellung nicht aktiviert) */}
            {!systemAutoBillingEnabled && (
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.autoBill}
                      onChange={(e) => handleFieldChange('autoBill', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        Automatisch abrechnen
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Die Leistung wird nach dem Speichern automatisch abgerechnet
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
            )}
            
            {/* Info wenn Systemeinstellung aktiviert ist */}
            {systemAutoBillingEnabled && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Automatische Abrechnung aktiviert:</strong> Die Leistung wird nach dem Speichern automatisch abgerechnet.
                  </Typography>
                </Alert>
              </Grid>
            )}
            
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
