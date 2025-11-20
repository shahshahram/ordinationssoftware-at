import React, { useState, useEffect } from 'react';
import { Autocomplete, TextField, Box, Typography, Chip, CircularProgress } from '@mui/material';
import api from '../utils/api';
import { Medication } from '../types/Medication';

interface MedicationAutocompleteProps {
  value?: Medication | null | undefined;
  onChange: (medication: Medication | null) => void;
  label?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
}

const MedicationAutocomplete: React.FC<MedicationAutocompleteProps> = ({
  value,
  onChange,
  label = 'Medikament',
  error,
  helperText,
  required,
  disabled
}) => {
  const [options, setOptions] = useState<Medication[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  // Debounce für Suche
  useEffect(() => {
    if (inputValue.length < 2) {
      setOptions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchMedications(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const searchMedications = async (searchTerm: string) => {
    setLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: Medication[]; count?: number }>(
        '/medications/search',
        { q: searchTerm, limit: 20 }
      );

      // Die API-Utility wrappt die Antwort: response.data ist das Backend-Response-Objekt
      // Das Backend-Response hat die Struktur: { success: true, data: Medication[], count: number }
      const backendResponse = response.data as any;
      
      // Prüfe ob backendResponse selbst die Daten enthält oder ob sie in backendResponse.data sind
      if (backendResponse?.success && backendResponse?.data) {
        setOptions(backendResponse.data);
      } else if (Array.isArray(backendResponse)) {
        // Falls die Antwort direkt ein Array ist
        setOptions(backendResponse);
      } else {
        console.warn('Unerwartete Antwort vom Backend:', backendResponse);
        setOptions([]);
      }
    } catch (error: any) {
      console.error('Medikamenten-Suche fehlgeschlagen:', error);
      if (error.message) {
        console.error('Fehler-Message:', error.message);
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          console.error('Authentifizierungsfehler - Token möglicherweise abgelaufen');
        }
      }
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event: any, newValue: Medication | null) => {
    onChange(newValue);
  };

  const getOptionLabel = (option: Medication) => {
    return option.name || '';
  };

  const isOptionEqualToValue = (option: Medication, value: Medication) => {
    return option._id === value._id;
  };

  const renderOption = (props: any, option: Medication) => {
    const { key, ...restProps } = props;
    // Verwende _id als eindeutigen Key, falls vorhanden, sonst name + index
    const uniqueKey = option._id || `${option.name}-${key}`;
    return (
      <Box component="li" key={uniqueKey} {...restProps}>
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {option.name}
          </Typography>
          {option.activeIngredient && (
            <Typography variant="caption" color="textSecondary">
              Wirkstoff: {option.activeIngredient}
            </Typography>
          )}
          {option.strength && option.strengthUnit && (
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
              {option.strength} {option.strengthUnit}
            </Typography>
          )}
          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {option.form && (
              <Chip
                label={option.form}
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.7rem' }}
              />
            )}
            {option.requiresPrescription && (
              <Chip
                label="Rezeptpflichtig"
                size="small"
                color="warning"
                sx={{ height: 18, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Autocomplete
      fullWidth
      options={options}
      value={value}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      renderOption={renderOption}
      loading={loading}
      loadingText="Suche..."
      noOptionsText={inputValue.length >= 2 ? "Keine Medikamente gefunden. Bitte importieren Sie zuerst den Medikamentenkatalog über 'Einstellungen > Medikamente > Katalog Import'." : "Mindestens 2 Zeichen eingeben"}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={helperText}
          required={required}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            )
          }}
          placeholder="Medikament oder Wirkstoff suchen... (min. 2 Zeichen)"
        />
      )}
      filterOptions={(options, state) => options} // Keine clientseitige Filterung, nutze Backend
    />
  );
};

export default MedicationAutocomplete;
