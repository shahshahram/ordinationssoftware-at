import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Paper,
  Divider,
  Alert,
  Chip,
  Grid,
  Autocomplete,
} from '@mui/material';
import { FormFieldDefinition, FormSectionDefinition, FormLayoutDefinition } from '../types/ambulanzbefund';

interface AmbulanzbefundFormRendererProps {
  template: {
    formDefinition: {
      layout: FormLayoutDefinition;
      schema?: any;
    };
    availableSections?: Array<{
      id: string;
      label: string;
      required: boolean;
      category: 'basic' | 'specialized' | 'optional';
    }>;
  };
  formData: Record<string, any>;
  onChange: (formData: Record<string, any>) => void;
  selectedSections?: string[];
  onSectionsChange?: (sectionIds: string[]) => void;
  validationErrors?: Array<{ field: string; message: string; severity: 'error' | 'warning' | 'info' }>;
}

const AmbulanzbefundFormRenderer: React.FC<AmbulanzbefundFormRendererProps> = ({
  template,
  formData,
  onChange,
  selectedSections = [],
  onSectionsChange,
  validationErrors = [],
}) => {
  const layout = template.formDefinition.layout;
  const sections = layout.sections || [];
  const fields = layout.fields || [];

  // Filtere Sections basierend auf selectedSections
  const effectiveSections = selectedSections.length > 0
    ? sections.filter(s => selectedSections.includes(s.id))
    : sections;

  // Gruppiere Fields nach Sections
  const fieldsBySection = effectiveSections.reduce((acc, section) => {
    acc[section.id] = fields.filter(f => f.sectionId === section.id || !f.sectionId);
    return acc;
  }, {} as Record<string, FormFieldDefinition[]>);

  // Fields ohne Section
  const fieldsWithoutSection = fields.filter(f => !f.sectionId);

  const handleFieldChange = (fieldId: string, value: any, dataSource?: string) => {
    const path = dataSource || fieldId;
    const pathParts = path.split('.');
    
    const newFormData = { ...formData };
    let current: any = newFormData;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    const lastPart = pathParts[pathParts.length - 1];
    current[lastPart] = value;
    
    onChange(newFormData);
  };

  const getFieldValue = (field: FormFieldDefinition): any => {
    const path = field.dataSource || field.id;
    const pathParts = path.split('.');
    let value: any = formData;
    
    for (const part of pathParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return field.defaultValue || '';
      }
    }
    
    return value !== undefined ? value : (field.defaultValue || '');
  };

  const getFieldError = (field: FormFieldDefinition) => {
    return validationErrors.find(e => e.field === field.id || e.field === field.dataSource);
  };

  const renderField = (field: FormFieldDefinition) => {
    const value = getFieldValue(field);
    const error = getFieldError(field);
    
    const commonProps: any = {
      label: field.label,
      required: field.required,
      error: !!error,
      helperText: error?.message || field.helperText,
      placeholder: field.placeholder,
      fullWidth: true,
    };

    switch (field.type) {
      case 'text':
        return (
          <TextField
            {...commonProps}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value, field.dataSource)}
          />
        );

      case 'textarea':
        return (
          <TextField
            {...commonProps}
            multiline
            rows={4}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value, field.dataSource)}
          />
        );

      case 'number':
        return (
          <TextField
            {...commonProps}
            type="number"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value) || 0, field.dataSource)}
            inputProps={{
              min: field.validation?.min,
              max: field.validation?.max,
            }}
          />
        );

      case 'date':
        return (
          <TextField
            {...commonProps}
            type="date"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value, field.dataSource)}
            InputLabelProps={{ shrink: true }}
          />
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={!!value}
                onChange={(e) => handleFieldChange(field.id, e.target.checked, field.dataSource)}
              />
            }
            label={field.label}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth required={field.required} error={!!error}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value, field.dataSource)}
              label={field.label}
            >
              {field.options?.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            {error && <Typography variant="caption" color="error">{error.message}</Typography>}
          </FormControl>
        );

      default:
        return (
          <TextField
            {...commonProps}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value, field.dataSource)}
          />
        );
    }
  };

  return (
    <Box>
      {effectiveSections.map((section) => {
        const sectionFields = fieldsBySection[section.id] || [];
        
        return (
          <Paper key={section.id} sx={{ mb: 3, p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {section.label}
            </Typography>
            {section.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {section.description}
              </Typography>
            )}
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              {sectionFields.map((field) => (
                <Grid
                  key={field.id}
                  size={{
                    xs: field.position?.width ? field.position.width : 12,
                    md: field.position?.width ? field.position.width : 6,
                  }}
                >
                  {renderField(field)}
                </Grid>
              ))}
            </Grid>
          </Paper>
        );
      })}
      
      {fieldsWithoutSection.length > 0 && (
        <Paper sx={{ mb: 3, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Allgemeine Felder
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {fieldsWithoutSection.map((field) => (
              <Grid
                key={field.id}
                size={{
                  xs: field.position?.width ? field.position.width : 12,
                  md: field.position?.width ? field.position.width : 6,
                }}
              >
                {renderField(field)}
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
      
      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Validierungsfehler:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validationErrors.map((error, index) => (
              <li key={index}>{error.field}: {error.message}</li>
            ))}
          </ul>
        </Alert>
      )}
    </Box>
  );
};

export default AmbulanzbefundFormRenderer;

