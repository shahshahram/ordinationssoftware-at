import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Alert,
  Chip,
  Autocomplete,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Person,
  MedicalServices,
  AdminPanelSettings,
  Security,
  LocalHospital,
  Medication,
  Warning,
  PregnantWoman,
  Bloodtype,
  Add,
  Delete,
  Edit,
} from '@mui/icons-material';
import { PatientAdmissionData } from '../types/PatientExtended';
import MedicationListInput, { convertMedicationsArrayToPatientFormat } from './MedicationListInput';

interface UnifiedPatientFormProps {
  onSave: (data: PatientAdmissionData) => void;
  onCancel: () => void;
  initialData?: Partial<PatientAdmissionData>;
  mode?: 'create' | 'edit';
  showDuplicateCheck?: boolean;
}

const UnifiedPatientForm: React.FC<UnifiedPatientFormProps> = ({
  onSave,
  onCancel,
  initialData = {},
  mode = 'create',
  showDuplicateCheck = true
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<PatientAdmissionData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'm',
    socialSecurityNumber: '',
    insuranceProvider: '',
    address: {
      street: '',
      zipCode: '',
      city: '',
      country: 'Österreich',
    },
    phone: '',
    email: '',
    emergencyContact: {
      name: '',
      phone: '',
    },
    primaryCarePhysician: {
      name: '',
      location: '',
    },
    currentMedications: [],
    allergies: [],
    preExistingConditions: [],
    medicalHistory: [],
    previousSurgeries: [],
    bloodType: 'Unbekannt',
    isPregnant: false,
    pregnancyWeek: undefined,
    isBreastfeeding: false,
    hasPacemaker: false,
    hasDefibrillator: false,
    implants: [],
    smokingStatus: 'non-smoker',
    cigarettesPerDay: undefined,
    yearsOfSmoking: undefined,
    quitSmokingDate: '',
    referralSource: 'self',
    referralDoctor: '',
    visitReason: '',
    dataProtectionConsent: false,
    electronicCommunicationConsent: false,
    ...initialData
  });

  const [duplicateCheck, setDuplicateCheck] = useState({
    checking: false,
    found: false,
    duplicates: [] as any[]
  });

  const steps = [
    'Stammdaten',
    'Medizinische Daten',
    'Administrative Daten',
    'Einverständniserklärungen',
  ];

  const insuranceProviders = [
    'ÖGK (Österreichische Gesundheitskasse)',
    'BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)',
    'SVS (Sozialversicherung der Selbständigen)',
    'KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)',
    'PVA (Pensionsversicherungsanstalt)',
    'Privatversicherung',
    'Selbstzahler'
  ];

  const bloodTypes = [
    'Unbekannt',
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-'
  ];

  const referralSources = [
    { value: 'self', label: 'Selbst' },
    { value: 'family_doctor', label: 'Hausarzt' },
    { value: 'specialist', label: 'Facharzt' },
    { value: 'hospital', label: 'Krankenhaus' },
    { value: 'emergency', label: 'Notaufnahme' },
    { value: 'other', label: 'Sonstiges' }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parentField: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...(prev[parentField as keyof PatientAdmissionData] as any || {}),
        [field]: value
      }
    }));
  };

  const handleArrayChange = (field: string, index: number, value: any) => {
    setFormData(prev => {
      const currentArray = prev[field as keyof PatientAdmissionData] as any[];
      if (!Array.isArray(currentArray)) return prev;
      
      return {
        ...prev,
        [field]: currentArray.map((item: any, i: number) => 
          i === index ? value : item
        )
      };
    });
  };

  const addArrayItem = (field: string, newItem: any) => {
    setFormData(prev => {
      const currentArray = prev[field as keyof PatientAdmissionData] as any[];
      return {
        ...prev,
        [field]: [...(Array.isArray(currentArray) ? currentArray : []), newItem]
      };
    });
  };

  const removeArrayItem = (field: string, index: number) => {
    setFormData(prev => {
      const currentArray = prev[field as keyof PatientAdmissionData] as any[];
      if (!Array.isArray(currentArray)) return prev;
      
      return {
        ...prev,
        [field]: currentArray.filter((_: any, i: number) => i !== index)
      };
    });
  };

  // Duplikatprüfung
  const checkForDuplicates = async () => {
    if (!showDuplicateCheck || !formData.socialSecurityNumber) return;
    
    setDuplicateCheck(prev => ({ ...prev, checking: true }));
    
    try {
      // Hier würde die API-Abfrage für Duplikatprüfung stattfinden
      // const response = await api.post('/patients/check-duplicates', {
      //   socialSecurityNumber: formData.socialSecurityNumber,
      //   firstName: formData.firstName,
      //   lastName: formData.lastName
      // });
      
      // Simuliere Duplikatprüfung
      setTimeout(() => {
        setDuplicateCheck({
          checking: false,
          found: false,
          duplicates: []
        });
      }, 1000);
    } catch (error) {
      console.error('Fehler bei Duplikatprüfung:', error);
      setDuplicateCheck(prev => ({ ...prev, checking: false }));
    }
  };

  useEffect(() => {
    if (formData.socialSecurityNumber && formData.firstName && formData.lastName) {
      checkForDuplicates();
    }
  }, [formData.socialSecurityNumber, formData.firstName, formData.lastName]);

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  const renderStammdaten = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
          Stammdaten
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Vorname *"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
              />
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Nachname *"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Geburtsdatum *"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <FormControl fullWidth required>
                <InputLabel>Geschlecht</InputLabel>
                <Select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                >
                  <MenuItem value="m">Männlich</MenuItem>
                  <MenuItem value="w">Weiblich</MenuItem>
                  <MenuItem value="d">Divers</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Sozialversicherungsnummer *"
                value={formData.socialSecurityNumber}
                onChange={(e) => handleInputChange('socialSecurityNumber', e.target.value)}
                required
              />
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <FormControl fullWidth required>
                <InputLabel>Versicherungsanstalt</InputLabel>
                <Select
                  value={formData.insuranceProvider}
                  onChange={(e) => handleInputChange('insuranceProvider', e.target.value)}
                >
                  {insuranceProviders.map(provider => (
                    <MenuItem key={provider} value={provider}>{provider}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>Adresse</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '2 1 400px', minWidth: '300px' }}>
              <TextField
                fullWidth
                label="Straße und Hausnummer"
                value={formData.address.street}
                onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)}
              />
            </Box>
            <Box sx={{ flex: '1 1 150px', minWidth: '120px' }}>
              <TextField
                fullWidth
                label="PLZ"
                value={formData.address.zipCode}
                onChange={(e) => handleNestedInputChange('address', 'zipCode', e.target.value)}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Stadt"
                value={formData.address.city}
                onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)}
              />
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Land"
                value={formData.address.country}
                onChange={(e) => handleNestedInputChange('address', 'country', e.target.value)}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Telefon"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="E-Mail"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </Box>
          </Box>
        </Box>

        {duplicateCheck.checking && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Duplikatprüfung läuft...
          </Alert>
        )}

        {duplicateCheck.found && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Mögliche Duplikate gefunden. Bitte überprüfen Sie die Daten.
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderMedizinischeDaten = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <MedicalServices sx={{ mr: 1, verticalAlign: 'middle' }} />
          Medizinische Daten
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <FormControl fullWidth>
                <InputLabel>Blutgruppe</InputLabel>
                <Select
                  value={formData.bloodType}
                  onChange={(e) => handleInputChange('bloodType', e.target.value)}
                >
                  {bloodTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 150px', minWidth: '120px' }}>
              <TextField
                fullWidth
                label="Größe (cm)"
                type="number"
                value={formData.height || ''}
                onChange={(e) => handleInputChange('height', e.target.value)}
              />
            </Box>
            <Box sx={{ flex: '1 1 150px', minWidth: '120px' }}>
              <TextField
                fullWidth
                label="Gewicht (kg)"
                type="number"
                value={formData.weight || ''}
                onChange={(e) => handleInputChange('weight', e.target.value)}
              />
            </Box>
          </Box>

          {/* Schwangerschaft (nur für Frauen) */}
          {formData.gender === 'w' && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                <PregnantWoman sx={{ mr: 1, verticalAlign: 'middle' }} />
                Schwangerschaft
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.isPregnant}
                        onChange={(e) => handleInputChange('isPregnant', e.target.checked)}
                      />
                    }
                    label="Schwanger"
                  />
                </Box>
                {formData.isPregnant && (
                  <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                    <TextField
                      fullWidth
                      label="Schwangerschaftswoche"
                      type="number"
                      value={formData.pregnancyWeek || ''}
                      onChange={(e) => handleInputChange('pregnancyWeek', e.target.value)}
                      inputProps={{ min: 1, max: 42 }}
                    />
                  </Box>
                )}
                <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.isBreastfeeding}
                        onChange={(e) => handleInputChange('isBreastfeeding', e.target.checked)}
                      />
                    }
                    label="Stillen"
                  />
                </Box>
              </Box>
            </>
          )}

          {/* Medizinische Implantate */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>Medizinische Implantate</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.hasPacemaker}
                    onChange={(e) => handleInputChange('hasPacemaker', e.target.checked)}
                  />
                }
                label="Schrittmacher"
              />
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.hasDefibrillator}
                    onChange={(e) => handleInputChange('hasDefibrillator', e.target.checked)}
                  />
                }
                label="Defibrillator"
              />
            </Box>
          </Box>

          {/* Raucherstatus */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>Raucherstatus</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <FormControl fullWidth>
                <InputLabel>Raucherstatus</InputLabel>
                <Select
                  value={formData.smokingStatus}
                  onChange={(e) => handleInputChange('smokingStatus', e.target.value)}
                >
                  <MenuItem value="non-smoker">Nichtraucher</MenuItem>
                  <MenuItem value="former-smoker">Ehemaliger Raucher</MenuItem>
                  <MenuItem value="current-smoker">Aktiver Raucher</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {formData.smokingStatus === 'current-smoker' && (
              <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                <TextField
                  fullWidth
                  label="Zigaretten pro Tag"
                  type="number"
                  value={formData.cigarettesPerDay || ''}
                  onChange={(e) => handleInputChange('cigarettesPerDay', e.target.value)}
                />
              </Box>
            )}
            {formData.smokingStatus !== 'non-smoker' && (
              <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                <TextField
                  fullWidth
                  label="Rauchejahre"
                  type="number"
                  value={formData.yearsOfSmoking || ''}
                  onChange={(e) => handleInputChange('yearsOfSmoking', e.target.value)}
                />
              </Box>
            )}
            {formData.smokingStatus === 'former-smoker' && (
              <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                <TextField
                  fullWidth
                  label="Aufhördatum"
                  type="date"
                  value={formData.quitSmokingDate}
                  onChange={(e) => handleInputChange('quitSmokingDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            )}
          </Box>

          {/* Allergien */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>Allergien</Typography>
          <Stack spacing={1}>
            {(formData.allergies || []).map((allergy, index) => (
              <Box key={index} display="flex" alignItems="center" gap={1}>
                <TextField
                  fullWidth
                  label={`Allergie ${index + 1}`}
                  value={typeof allergy === 'string' ? allergy : allergy.description}
                  onChange={(e) => handleArrayChange('allergies', index, e.target.value)}
                />
                <IconButton onClick={() => removeArrayItem('allergies', index)}>
                  <Delete />
                </IconButton>
              </Box>
            ))}
            <Button
              startIcon={<Add />}
              onClick={() => addArrayItem('allergies', '')}
              variant="outlined"
            >
              Allergie hinzufügen
            </Button>
          </Stack>

          {/* Aktuelle Medikamente */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>Aktuelle Medikamente</Typography>
          <MedicationListInput
            value={Array.isArray(formData.currentMedications) ? formData.currentMedications : []}
            onChange={(medications) => {
              const converted = convertMedicationsArrayToPatientFormat(medications);
              setFormData(prev => ({ ...prev, currentMedications: converted }));
            }}
            label="Medikament hinzufügen"
            helperText="Suchen Sie nach Medikamenten aus dem Katalog"
          />

          {/* Medizinische Vorgeschichte */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>Medizinische Vorgeschichte</Typography>
          <Stack spacing={1}>
            {(formData.preExistingConditions || []).map((condition, index) => (
              <Box key={index} display="flex" alignItems="center" gap={1}>
                <TextField
                  fullWidth
                  label={`Erkrankung ${index + 1}`}
                  value={condition}
                  onChange={(e) => handleArrayChange('preExistingConditions', index, e.target.value)}
                />
                <IconButton onClick={() => removeArrayItem('preExistingConditions', index)}>
                  <Delete />
                </IconButton>
              </Box>
            ))}
            <Button
              startIcon={<Add />}
              onClick={() => addArrayItem('preExistingConditions', '')}
              variant="outlined"
            >
              Erkrankung hinzufügen
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );

  const renderAdministrativeDaten = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <AdminPanelSettings sx={{ mr: 1, verticalAlign: 'middle' }} />
          Administrative Daten
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Hausarzt</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Name des Hausarztes"
                value={formData.primaryCarePhysician?.name || ''}
                onChange={(e) => handleNestedInputChange('primaryCarePhysician', 'name', e.target.value)}
              />
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Praxisstandort"
                value={formData.primaryCarePhysician?.location || ''}
                onChange={(e) => handleNestedInputChange('primaryCarePhysician', 'location', e.target.value)}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>Zuweisung</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <FormControl fullWidth>
                <InputLabel>Zuweisung durch</InputLabel>
                <Select
                  value={formData.referralSource}
                  onChange={(e) => handleInputChange('referralSource', e.target.value)}
                >
                  {referralSources.map(source => (
                    <MenuItem key={source.value} value={source.value}>
                      {source.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Zuweisender Arzt"
                value={formData.referralDoctor}
                onChange={(e) => handleInputChange('referralDoctor', e.target.value)}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>Besuch</Typography>
          <Box sx={{ flex: '1 1 100%' }}>
            <TextField
              fullWidth
              label="Grund des Besuchs"
              multiline
              rows={3}
              value={formData.visitReason}
              onChange={(e) => handleInputChange('visitReason', e.target.value)}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const renderEinverstaendniserklaerungen = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
          Einverständniserklärungen
        </Typography>

        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.dataProtectionConsent}
                onChange={(e) => handleInputChange('dataProtectionConsent', e.target.checked)}
                required
              />
            }
            label="Ich stimme der Verarbeitung meiner personenbezogenen Daten gemäß DSGVO zu. *"
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.electronicCommunicationConsent}
                onChange={(e) => handleInputChange('electronicCommunicationConsent', e.target.checked)}
              />
            }
            label="Ich stimme der elektronischen Kommunikation (E-Mail, SMS) zu."
          />

          <Alert severity="info">
            Die mit * markierten Felder sind Pflichtfelder und müssen ausgefüllt werden.
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  );

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderStammdaten();
      case 1:
        return renderMedizinischeDaten();
      case 2:
        return renderAdministrativeDaten();
      case 3:
        return renderEinverstaendniserklaerungen();
      default:
        return null;
    }
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {renderStepContent(activeStep)}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Zurück
        </Button>
        
        <Box>
          <Button onClick={onCancel} sx={{ mr: 1 }}>
            Abbrechen
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!formData.dataProtectionConsent}
            >
              {mode === 'create' ? 'Patient erstellen' : 'Änderungen speichern'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
            >
              Weiter
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default UnifiedPatientForm;
