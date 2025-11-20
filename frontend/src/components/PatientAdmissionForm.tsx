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
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import {
  Person,
  MedicalServices,
  AdminPanelSettings,
  Security,
} from '@mui/icons-material';
import { PatientAdmissionData } from '../types/PatientExtended';
import MedicationListInput, { convertMedicationsArrayToPatientFormat } from './MedicationListInput';


const PatientAdmissionForm: React.FC<{
  onSave: (data: PatientAdmissionData) => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
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
    quitSmokingDate: undefined,
    referralSource: 'self',
    visitReason: '',
    dataProtectionConsent: false,
    electronicCommunicationConsent: false,
  });

  const steps = [
    'Stammdaten',
    'Medizinische Daten',
    'Administrative Daten',
    'Einverständniserklärungen',
  ];

  // Debug: Überwache formData-Änderungen
  useEffect(() => {
    console.log('formData updated:', formData);
    console.log('Allergies:', formData.allergies);
    console.log('Current Medications:', formData.currentMedications);
    console.log('Pre-existing Conditions:', formData.preExistingConditions);
  }, [formData]);

  const insuranceProviders = [
    'ÖGK (Österreichische Gesundheitskasse)',
    'BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)',
    'SVS (Sozialversicherung der Selbständigen)',
    'KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)',
    'PVA (Pensionsversicherungsanstalt)',
    'Privatversicherung',
    'Selbstzahler',
  ];

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-', 'Unbekannt'];


  const handleInputChange = (field: string, value: any) => {
    console.log(`handleInputChange: ${field} =`, value);
    console.log(`Current formData before update:`, formData);
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => {
        const newData = {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof PatientAdmissionData] as any || {}),
            [child]: value,
          },
        };
        console.log(`Updated nested formData for ${field}:`, newData[parent as keyof PatientAdmissionData]);
        return newData;
      });
    } else {
      setFormData(prev => {
        const newData = {
          ...prev,
          [field]: value,
        };
        console.log(`Updated formData for ${field}:`, newData[field as keyof PatientAdmissionData]);
        console.log(`Full new formData:`, newData);
        return newData;
      });
    }
  };

  const handleArrayChange = (field: string, value: any[]) => {
    console.log(`handleArrayChange: ${field} =`, value);
    console.log(`Type of value:`, typeof value);
    console.log(`Is array:`, Array.isArray(value));
    
    // Stelle sicher, dass value ein Array ist
    const arrayValue = Array.isArray(value) ? value : [];
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: arrayValue,
      };
      console.log(`Updated array formData for ${field}:`, newData[field as keyof PatientAdmissionData]);
      console.log(`Full new formData after array change:`, newData);
      return newData;
    });
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Stammdaten
        return !!(
          formData.firstName &&
          formData.lastName &&
          formData.dateOfBirth &&
          formData.socialSecurityNumber &&
          formData.insuranceProvider &&
          formData.address?.street &&
          formData.address?.zipCode &&
          formData.address?.city &&
          formData.phone
        );
      case 1: // Medizinische Daten
        return true; // Medizinische Daten sind optional
      case 2: // Administrative Daten
        return !!(formData.visitReason && formData.referralSource);
      case 3: // Einverständniserklärungen
        return formData.dataProtectionConsent;
      default:
        return false;
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person color="primary" />
              Stammdaten (Pflichtfelder)
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Diese Daten sind für die elektronische Patientenakte und Abrechnung erforderlich.
            </Alert>
            
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
              gap: 3 
            }}>
              <TextField
                fullWidth
                label="Vorname *"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
              />
              <TextField
                fullWidth
                label="Nachname *"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
              />
              <TextField
                fullWidth
                label="Geburtsdatum *"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
              <FormControl fullWidth required>
                <InputLabel>Geschlecht *</InputLabel>
                <Select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                >
                  <MenuItem value="m">Männlich</MenuItem>
                  <MenuItem value="w">Weiblich</MenuItem>
                  <MenuItem value="d">Divers</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Sozialversicherungsnummer *"
                value={formData.socialSecurityNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  handleInputChange('socialSecurityNumber', value);
                }}
                placeholder="1234567890"
                inputProps={{ maxLength: 10 }}
                required
              />
              <FormControl fullWidth required>
                <InputLabel>Versicherungsanstalt *</InputLabel>
                <Select
                  value={formData.insuranceProvider}
                  onChange={(e) => handleInputChange('insuranceProvider', e.target.value)}
                >
                  {insuranceProviders.map((provider) => (
                    <MenuItem key={provider} value={provider}>
                      {provider}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Telefonnummer *"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
              />
              <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <Typography variant="subtitle2" gutterBottom>
                  Adresse *
                </Typography>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr', md: '2fr 1fr 1fr 1fr' },
                  gap: 2 
                }}>
                  <TextField
                    fullWidth
                    label="Straße und Hausnummer"
                    value={formData.address?.street || ''}
                    onChange={(e) => handleInputChange('address.street', e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    label="PLZ"
                    value={formData.address?.zipCode || ''}
                    onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Ort"
                    value={formData.address?.city || ''}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Land"
                    value={formData.address?.country || ''}
                    onChange={(e) => handleInputChange('address.country', e.target.value)}
                    required
                  />
                </Box>
              </Box>
              <TextField
                fullWidth
                label="E-Mail"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
              <TextField
                fullWidth
                label="Notfallkontakt (Name)"
                value={formData.emergencyContact?.name || ''}
                onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
              />
              <TextField
                fullWidth
                label="Notfallkontakt (Telefon)"
                value={formData.emergencyContact?.phone || ''}
                onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)}
              />
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MedicalServices color="primary" />
              Medizinische Daten
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Grundlegende medizinische Daten */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                gap: 2 
              }}>
                <FormControl fullWidth>
                  <InputLabel>Blutgruppe</InputLabel>
                  <Select
                    value={formData.bloodType}
                    onChange={(e) => handleInputChange('bloodType', e.target.value)}
                  >
                    {bloodTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Größe (cm)"
                  type="number"
                  value={formData.height || ''}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                />
                <TextField
                  fullWidth
                  label="Gewicht (kg)"
                  type="number"
                  value={formData.weight || ''}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                />
              </Box>

              {/* Schwangerschaft (nur für Frauen) */}
              {formData.gender === 'w' && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Schwangerschaft
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.isPregnant}
                          onChange={(e) => handleInputChange('isPregnant', e.target.checked)}
                        />
                      }
                      label="Schwanger"
                    />
                    {formData.isPregnant && (
                      <TextField
                        fullWidth
                        label="Schwangerschaftswoche"
                        type="number"
                        value={formData.pregnancyWeek || ''}
                        onChange={(e) => handleInputChange('pregnancyWeek', e.target.value)}
                        inputProps={{ min: 1, max: 42 }}
                        sx={{ maxWidth: 200 }}
                      />
                    )}
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
              )}

              {/* Medizinische Implantate */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Medizinische Implantate
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.hasPacemaker}
                        onChange={(e) => handleInputChange('hasPacemaker', e.target.checked)}
                      />
                    }
                    label="Schrittmacher"
                  />
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
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Raucherstatus
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <FormControl fullWidth sx={{ maxWidth: 200 }}>
                    <InputLabel>Raucherstatus</InputLabel>
                    <Select
                      value={formData.smokingStatus}
                      onChange={(e) => {
                        console.log('Smoking status changed:', e.target.value);
                        handleInputChange('smokingStatus', e.target.value);
                      }}
                    >
                      <MenuItem value="non-smoker">Nichtraucher</MenuItem>
                      <MenuItem value="former-smoker">Ehemaliger Raucher</MenuItem>
                      <MenuItem value="current-smoker">Aktiver Raucher</MenuItem>
                    </Select>
                  </FormControl>
                  {formData.smokingStatus === 'current-smoker' && (
                    <TextField
                      fullWidth
                      label="Zigaretten pro Tag"
                      type="number"
                      value={formData.cigarettesPerDay || ''}
                      onChange={(e) => handleInputChange('cigarettesPerDay', e.target.value)}
                      sx={{ maxWidth: 200 }}
                    />
                  )}
                  {formData.smokingStatus !== 'non-smoker' && (
                    <TextField
                      fullWidth
                      label="Rauchejahre"
                      type="number"
                      value={formData.yearsOfSmoking || ''}
                      onChange={(e) => handleInputChange('yearsOfSmoking', e.target.value)}
                      sx={{ maxWidth: 200 }}
                    />
                  )}
                  {formData.smokingStatus === 'former-smoker' && (
                    <TextField
                      fullWidth
                      label="Aufhördatum"
                      type="date"
                      value={formData.quitSmokingDate}
                      onChange={(e) => handleInputChange('quitSmokingDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ maxWidth: 200 }}
                    />
                  )}
                </Box>
              </Box>

              {/* Allergien */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Allergien
                </Typography>
                <TextField
                  fullWidth
                  label="Allergien"
                  placeholder="Allergien eingeben (kommagetrennt, z.B. Pollen, Nüsse, Milch)"
                  value={Array.isArray(formData.allergies) ? formData.allergies.join(', ') : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const allergies = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
                    console.log('Allergies input changed:', value);
                    console.log('Parsed allergies:', allergies);
                    handleArrayChange('allergies', allergies);
                  }}
                  multiline
                  rows={2}
                />
                {Array.isArray(formData.allergies) && formData.allergies.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formData.allergies.map((allergy, index) => (
                      <Chip
                        key={index}
                        label={typeof allergy === 'string' ? allergy : allergy.description || 'Unknown'}
                        variant="outlined"
                        size="small"
                        onDelete={() => {
                          const currentAllergies = Array.isArray(formData.allergies) ? formData.allergies : [];
                          const newAllergies = (currentAllergies as any[]).filter((_: any, i: number) => i !== index);
                          handleArrayChange('allergies', newAllergies);
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>

              {/* Aktuelle Medikamente */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Aktuelle Medikamente
                </Typography>
                <MedicationListInput
                  value={Array.isArray(formData.currentMedications) ? formData.currentMedications : []}
                  onChange={(medications) => {
                    const converted = convertMedicationsArrayToPatientFormat(medications);
                    handleArrayChange('currentMedications', converted);
                  }}
                  label="Medikament hinzufügen"
                  helperText="Suchen Sie nach Medikamenten aus dem Katalog oder geben Sie den Namen ein"
                />
              </Box>

              {/* Vorerkrankungen */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Vorerkrankungen
                </Typography>
                <TextField
                  fullWidth
                  label="Vorerkrankungen"
                  placeholder="Vorerkrankungen eingeben (kommagetrennt, z.B. Diabetes, Bluthochdruck, Asthma)"
                  value={Array.isArray(formData.preExistingConditions) ? formData.preExistingConditions.join(', ') : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const conditions = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
                    console.log('Conditions input changed:', value);
                    console.log('Parsed conditions:', conditions);
                    handleArrayChange('preExistingConditions', conditions);
                  }}
                  multiline
                  rows={2}
                />
                {Array.isArray(formData.preExistingConditions) && formData.preExistingConditions.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formData.preExistingConditions.map((condition, index) => (
                      <Chip
                        key={index}
                        label={String(condition)}
                        variant="outlined"
                        size="small"
                        onDelete={() => {
                          const currentConditions = formData.preExistingConditions || [];
                          const newConditions = currentConditions.filter((_: any, i: number) => i !== index);
                          handleArrayChange('preExistingConditions', newConditions);
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>

              {/* Medizinische Vorgeschichte */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Medizinische Vorgeschichte
                </Typography>
                <TextField
                  fullWidth
                  label="Medizinische Vorgeschichte"
                  placeholder="Medizinische Vorgeschichte eingeben (kommagetrennt, z.B. Herzinfarkt 2019, Schlaganfall 2020)"
                  value={Array.isArray(formData.medicalHistory) ? formData.medicalHistory.join(', ') : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const history = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
                    handleArrayChange('medicalHistory', history);
                  }}
                  multiline
                  rows={2}
                />
                {Array.isArray(formData.medicalHistory) && formData.medicalHistory.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formData.medicalHistory.map((history, index) => (
                      <Chip
                        key={index}
                        label={String(history)}
                        variant="outlined"
                        size="small"
                        onDelete={() => {
                          const currentHistory = formData.medicalHistory || [];
                          const newHistory = currentHistory.filter((_: any, i: number) => i !== index);
                          handleArrayChange('medicalHistory', newHistory);
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>

              {/* Hausarzt */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Hausarzt
                </Typography>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2 
                }}>
                  <TextField
                    fullWidth
                    label="Name des Hausarztes"
                    value={formData.primaryCarePhysician?.name || ''}
                    onChange={(e) => handleInputChange('primaryCarePhysician.name', e.target.value)}
                  />
                  <TextField
                    fullWidth
                    label="Ort der Praxis"
                    value={formData.primaryCarePhysician?.location || ''}
                    onChange={(e) => handleInputChange('primaryCarePhysician.location', e.target.value)}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AdminPanelSettings color="primary" />
              Administrative Daten
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormControl fullWidth required>
                <InputLabel>Zuweisung durch *</InputLabel>
                <Select
                  value={formData.referralSource}
                  onChange={(e) => handleInputChange('referralSource', e.target.value)}
                >
                  <MenuItem value="self">Selbstzuweiser</MenuItem>
                  <MenuItem value="physician">Hausarzt</MenuItem>
                  <MenuItem value="hospital">Krankenhaus</MenuItem>
                  <MenuItem value="other">Andere</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Grund des Besuchs *"
                multiline
                rows={3}
                value={formData.visitReason}
                onChange={(e) => handleInputChange('visitReason', e.target.value)}
                placeholder="Beschreiben Sie Ihr Hauptanliegen..."
                required
              />
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Security color="primary" />
              Einverständniserklärungen
            </Typography>
            <Alert severity="warning" sx={{ mb: 3 }}>
              Diese Einverständniserklärungen sind für die ordnungsgemäße Behandlung erforderlich.
            </Alert>

            <Stack spacing={3}>
              <Card>
                <CardContent>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.dataProtectionConsent}
                        onChange={(e) => handleInputChange('dataProtectionConsent', e.target.checked)}
                        required
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          Datenschutz-Einverständnis (DSGVO) *
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Ich stimme der Verarbeitung meiner personenbezogenen Daten gemäß der 
                          Datenschutz-Grundverordnung (DSGVO) zu. Meine Daten werden ausschließlich 
                          für medizinische Zwecke und die ordnungsgemäße Abrechnung verwendet.
                        </Typography>
                      </Box>
                    }
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.electronicCommunicationConsent}
                        onChange={(e) => handleInputChange('electronicCommunicationConsent', e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          Elektronische Kommunikation
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Ich stimme zu, dass mir Termine, Befunde und andere medizinische 
                          Informationen per E-Mail zugesendet werden dürfen.
                        </Typography>
                      </Box>
                    }
                  />
                </CardContent>
              </Card>
            </Stack>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card>
        <CardContent>
          {renderStepContent(activeStep)}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Zurück
        </Button>
        <Box>
          <Button onClick={onCancel} sx={{ mr: 2 }}>
            Abbrechen
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isStepValid(activeStep)}
            >
              Patient aufnehmen
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!isStepValid(activeStep)}
            >
              Weiter
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PatientAdmissionForm;
