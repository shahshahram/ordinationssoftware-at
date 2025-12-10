// Zusatzversicherungen-Formular Komponente

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  MenuItem,
  InputAdornment
} from '@mui/material';
import { ExpandMore, LocalHospital, HealthAndSafety, Visibility, MedicalServices } from '@mui/icons-material';

interface AdditionalInsurance {
  hospitalInsurance?: {
    hasInsurance: boolean;
    insuranceCompany?: string;
    policyNumber?: string;
    coverageType?: 'single_room' | 'double_room' | 'standard';
    reimbursementRate?: number;
    maxDailyRate?: number;
    validFrom?: string;
    validUntil?: string;
  };
  privateDoctorInsurance?: {
    hasInsurance: boolean;
    insuranceCompany?: string;
    policyNumber?: string;
    reimbursementRate?: number;
    maxReimbursementPerYear?: number;
    deductible?: number;
    validFrom?: string;
    validUntil?: string;
  };
  dentalInsurance?: {
    hasInsurance: boolean;
    insuranceCompany?: string;
    policyNumber?: string;
    reimbursementRate?: number;
    maxReimbursementPerYear?: number;
    validFrom?: string;
    validUntil?: string;
  };
  opticalInsurance?: {
    hasInsurance: boolean;
    insuranceCompany?: string;
    policyNumber?: string;
    reimbursementRate?: number;
    maxReimbursementPerYear?: number;
    validFrom?: string;
    validUntil?: string;
  };
  medicalAidsInsurance?: {
    hasInsurance: boolean;
    insuranceCompany?: string;
    policyNumber?: string;
    reimbursementRate?: number;
    maxReimbursementPerYear?: number;
    validFrom?: string;
    validUntil?: string;
  };
  travelInsurance?: {
    hasInsurance: boolean;
    insuranceCompany?: string;
    policyNumber?: string;
    validFrom?: string;
    validUntil?: string;
    coverageCountries?: string[];
  };
}

interface AdditionalInsuranceFormProps {
  value: AdditionalInsurance;
  onChange: (value: AdditionalInsurance) => void;
  disabled?: boolean;
}

const AdditionalInsuranceForm: React.FC<AdditionalInsuranceFormProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const handleChange = (section: keyof AdditionalInsurance, field: string, fieldValue: any) => {
    onChange({
      ...value,
      [section]: {
        ...value[section],
        [field]: fieldValue
      }
    });
  };

  const renderHospitalInsurance = () => (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <LocalHospital color="primary" />
          <Typography variant="h6">Krankenhaus-Zusatzversicherung (Sonderklasse)</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={value.hospitalInsurance?.hasInsurance || false}
                onChange={(e) => handleChange('hospitalInsurance', 'hasInsurance', e.target.checked)}
                disabled={disabled}
              />
            }
            label="Krankenhaus-Zusatzversicherung vorhanden"
          />
          
          {value.hospitalInsurance?.hasInsurance && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Versicherungsgesellschaft"
                  value={value.hospitalInsurance?.insuranceCompany || ''}
                  onChange={(e) => handleChange('hospitalInsurance', 'insuranceCompany', e.target.value)}
                  disabled={disabled}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Versicherungsnummer"
                  value={value.hospitalInsurance?.policyNumber || ''}
                  onChange={(e) => handleChange('hospitalInsurance', 'policyNumber', e.target.value)}
                  disabled={disabled}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  select
                  label="Unterbringung"
                  value={value.hospitalInsurance?.coverageType || 'standard'}
                  onChange={(e) => handleChange('hospitalInsurance', 'coverageType', e.target.value)}
                  disabled={disabled}
                >
                  <MenuItem value="single_room">Einzelzimmer</MenuItem>
                  <MenuItem value="double_room">Zweibettzimmer</MenuItem>
                  <MenuItem value="standard">Standard</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Erstattungssatz (%)"
                  value={value.hospitalInsurance?.reimbursementRate || 100}
                  onChange={(e) => handleChange('hospitalInsurance', 'reimbursementRate', parseFloat(e.target.value) || 100)}
                  disabled={disabled}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max. Tagespauschale (€)"
                  value={value.hospitalInsurance?.maxDailyRate ? (value.hospitalInsurance.maxDailyRate / 100) : ''}
                  onChange={(e) => handleChange('hospitalInsurance', 'maxDailyRate', Math.round((parseFloat(e.target.value) || 0) * 100))}
                  disabled={disabled}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Gültig von"
                  value={value.hospitalInsurance?.validFrom || ''}
                  onChange={(e) => handleChange('hospitalInsurance', 'validFrom', e.target.value)}
                  disabled={disabled}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Gültig bis"
                  value={value.hospitalInsurance?.validUntil || ''}
                  onChange={(e) => handleChange('hospitalInsurance', 'validUntil', e.target.value)}
                  disabled={disabled}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );

  const renderPrivateDoctorInsurance = () => (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <HealthAndSafety color="primary" />
          <Typography variant="h6">Privatarzt-/Wahlarztversicherung</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={value.privateDoctorInsurance?.hasInsurance || false}
                onChange={(e) => handleChange('privateDoctorInsurance', 'hasInsurance', e.target.checked)}
                disabled={disabled}
              />
            }
            label="Privatarzt-/Wahlarztversicherung vorhanden"
          />
          
          {value.privateDoctorInsurance?.hasInsurance && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Versicherungsgesellschaft"
                  value={value.privateDoctorInsurance?.insuranceCompany || ''}
                  onChange={(e) => handleChange('privateDoctorInsurance', 'insuranceCompany', e.target.value)}
                  disabled={disabled}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Versicherungsnummer"
                  value={value.privateDoctorInsurance?.policyNumber || ''}
                  onChange={(e) => handleChange('privateDoctorInsurance', 'policyNumber', e.target.value)}
                  disabled={disabled}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Erstattungssatz (%)"
                  value={value.privateDoctorInsurance?.reimbursementRate || 80}
                  onChange={(e) => handleChange('privateDoctorInsurance', 'reimbursementRate', parseFloat(e.target.value) || 80)}
                  disabled={disabled}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max. Erstattung pro Jahr (€)"
                  value={value.privateDoctorInsurance?.maxReimbursementPerYear ? (value.privateDoctorInsurance.maxReimbursementPerYear / 100) : ''}
                  onChange={(e) => handleChange('privateDoctorInsurance', 'maxReimbursementPerYear', Math.round((parseFloat(e.target.value) || 0) * 100))}
                  disabled={disabled}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Selbstbehalt (€)"
                  value={value.privateDoctorInsurance?.deductible ? (value.privateDoctorInsurance.deductible / 100) : ''}
                  onChange={(e) => handleChange('privateDoctorInsurance', 'deductible', Math.round((parseFloat(e.target.value) || 0) * 100))}
                  disabled={disabled}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Gültig von"
                  value={value.privateDoctorInsurance?.validFrom || ''}
                  onChange={(e) => handleChange('privateDoctorInsurance', 'validFrom', e.target.value)}
                  disabled={disabled}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Gültig bis"
                  value={value.privateDoctorInsurance?.validUntil || ''}
                  onChange={(e) => handleChange('privateDoctorInsurance', 'validUntil', e.target.value)}
                  disabled={disabled}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );

  const renderDentalInsurance = () => (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <MedicalServices color="primary" />
          <Typography variant="h6">Zahnzusatzversicherung</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={value.dentalInsurance?.hasInsurance || false}
                onChange={(e) => handleChange('dentalInsurance', 'hasInsurance', e.target.checked)}
                disabled={disabled}
              />
            }
            label="Zahnzusatzversicherung vorhanden"
          />
          
          {value.dentalInsurance?.hasInsurance && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Versicherungsgesellschaft"
                  value={value.dentalInsurance?.insuranceCompany || ''}
                  onChange={(e) => handleChange('dentalInsurance', 'insuranceCompany', e.target.value)}
                  disabled={disabled}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Versicherungsnummer"
                  value={value.dentalInsurance?.policyNumber || ''}
                  onChange={(e) => handleChange('dentalInsurance', 'policyNumber', e.target.value)}
                  disabled={disabled}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Erstattungssatz (%)"
                  value={value.dentalInsurance?.reimbursementRate || 80}
                  onChange={(e) => handleChange('dentalInsurance', 'reimbursementRate', parseFloat(e.target.value) || 80)}
                  disabled={disabled}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max. Erstattung pro Jahr (€)"
                  value={value.dentalInsurance?.maxReimbursementPerYear ? (value.dentalInsurance.maxReimbursementPerYear / 100) : ''}
                  onChange={(e) => handleChange('dentalInsurance', 'maxReimbursementPerYear', Math.round((parseFloat(e.target.value) || 0) * 100))}
                  disabled={disabled}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Gültig von"
                  value={value.dentalInsurance?.validFrom || ''}
                  onChange={(e) => handleChange('dentalInsurance', 'validFrom', e.target.value)}
                  disabled={disabled}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Gültig bis"
                  value={value.dentalInsurance?.validUntil || ''}
                  onChange={(e) => handleChange('dentalInsurance', 'validUntil', e.target.value)}
                  disabled={disabled}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );

  const renderOpticalInsurance = () => (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <Visibility color="primary" />
          <Typography variant="h6">Brillen-/Kontaktlinsenzusatzversicherung</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={value.opticalInsurance?.hasInsurance || false}
                onChange={(e) => handleChange('opticalInsurance', 'hasInsurance', e.target.checked)}
                disabled={disabled}
              />
            }
            label="Brillen-/Kontaktlinsenzusatzversicherung vorhanden"
          />
          
          {value.opticalInsurance?.hasInsurance && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Versicherungsgesellschaft"
                  value={value.opticalInsurance?.insuranceCompany || ''}
                  onChange={(e) => handleChange('opticalInsurance', 'insuranceCompany', e.target.value)}
                  disabled={disabled}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Versicherungsnummer"
                  value={value.opticalInsurance?.policyNumber || ''}
                  onChange={(e) => handleChange('opticalInsurance', 'policyNumber', e.target.value)}
                  disabled={disabled}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Erstattungssatz (%)"
                  value={value.opticalInsurance?.reimbursementRate || 80}
                  onChange={(e) => handleChange('opticalInsurance', 'reimbursementRate', parseFloat(e.target.value) || 80)}
                  disabled={disabled}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max. Erstattung pro Jahr (€)"
                  value={value.opticalInsurance?.maxReimbursementPerYear ? (value.opticalInsurance.maxReimbursementPerYear / 100) : ''}
                  onChange={(e) => handleChange('opticalInsurance', 'maxReimbursementPerYear', Math.round((parseFloat(e.target.value) || 0) * 100))}
                  disabled={disabled}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Gültig von"
                  value={value.opticalInsurance?.validFrom || ''}
                  onChange={(e) => handleChange('opticalInsurance', 'validFrom', e.target.value)}
                  disabled={disabled}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Gültig bis"
                  value={value.opticalInsurance?.validUntil || ''}
                  onChange={(e) => handleChange('opticalInsurance', 'validUntil', e.target.value)}
                  disabled={disabled}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" gutterBottom>
        Zusatzversicherungen
      </Typography>
      
      {renderHospitalInsurance()}
      {renderPrivateDoctorInsurance()}
      {renderDentalInsurance()}
      {renderOpticalInsurance()}
    </Box>
  );
};

export default AdditionalInsuranceForm;

