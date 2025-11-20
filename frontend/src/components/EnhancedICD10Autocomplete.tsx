import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Chip,
  Typography,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  IconButton,
  Fade,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  Search,
  Star,
  History,
  Info,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Help,
  AutoFixHigh
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { searchIcd10Codes, getTopIcd10Codes, getRecentIcd10Codes, Icd10Code, Icd10TopCode, clearError } from '../store/slices/icd10Slice';
import { 
  validateIcd10Code, 
  formatIcd10Code, 
  getChapterName, 
  isCommonCode,
  autoCorrectCode,
  getCodeLevel,
  validateCodeInContext,
  ValidationResult,
  ValidationOptions
} from '../utils/icd10Validation';
import { useErrorHandler } from '../hooks/useErrorHandler';

interface EnhancedICD10AutocompleteProps {
  onSelect: (code: string, display: string, fullEntry?: Icd10Code) => void;
  label?: string;
  placeholder?: string;
  value?: string;
  context?: 'clinical' | 'billing' | 'elga' | 'import';
  patientId?: string;
  encounterId?: string;
  requireBillable?: boolean;
  currentYear?: number;
  showValidation?: boolean;
  showSuggestions?: boolean;
}

const EnhancedICD10Autocomplete: React.FC<EnhancedICD10AutocompleteProps> = ({
  onSelect,
  label = 'ICD-10 Code',
  placeholder = 'Code oder Beschreibung eingeben...',
  value,
  context = 'clinical',
  patientId,
  encounterId,
  requireBillable = false,
  currentYear = new Date().getFullYear(),
  showValidation = true,
  showSuggestions = true,
}) => {
  const dispatch = useAppDispatch();
  const { searchResults, topCodes, recentCodes, loading, error } = useAppSelector((state) => state.icd10);
  const { handleError, clearError: clearErrorHandler } = useErrorHandler();

  const [inputValue, setInputValue] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Icd10Code[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCode, setSelectedCode] = useState<Icd10Code | null>(null);
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [showConfidence, setShowConfidence] = useState(false);
  const [autoCorrectedCode, setAutoCorrectedCode] = useState<string | null>(null);
  const [showAutoCorrect, setShowAutoCorrect] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const debouncedSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (query.length >= 3 || (query.length >= 1 && /\d/.test(query))) {
        dispatch(searchIcd10Codes({ q: query, year: currentYear, billableOnly: requireBillable }));
      } else {
        setOptions([]);
      }
    }, 300);
  }, [dispatch, currentYear, requireBillable]);

  // Validate input in real-time
  useEffect(() => {
    if (showValidation && inputValue) {
      const validation = validateCodeInContext(inputValue, context as 'medical' | 'billing' | 'clinical');
      setValidationResult(validation);
      setConfidence(validation.confidence || 0);
      setShowConfidence(validation.confidence !== undefined && validation.confidence < 1.0);
      
      // Auto-correction logic
      if (!validation.isValid && validation.suggestions && validation.suggestions.length > 0) {
        const corrected = autoCorrectCode(inputValue);
        if (corrected !== inputValue) {
          setAutoCorrectedCode(corrected);
          setShowAutoCorrect(true);
        }
      } else {
        setShowAutoCorrect(false);
        setAutoCorrectedCode(null);
      }
    } else {
      setValidationResult(null);
      setConfidence(0);
      setShowConfidence(false);
      setShowAutoCorrect(false);
      setAutoCorrectedCode(null);
    }
  }, [inputValue, showValidation, context]);

  useEffect(() => {
    if (inputValue) {
      debouncedSearch(inputValue);
    } else {
      setOptions([]);
    }
  }, [inputValue, debouncedSearch]);

  useEffect(() => {
    setOptions(searchResults);
  }, [searchResults]);

  useEffect(() => {
    if (open && activeTab === 1) {
      dispatch(getTopIcd10Codes({ scope: 'user', scopeId: patientId, limit: 10 }));
    } else if (open && activeTab === 2) {
      dispatch(getRecentIcd10Codes({ scope: 'user', scopeId: patientId, limit: 10 }));
    }
  }, [open, activeTab, dispatch, patientId]);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const handleInputChange = (event: React.SyntheticEvent, newInputValue: string) => {
    setInputValue(newInputValue);
    setShowSuggestionsPanel(true);
    if (newInputValue === '') {
      setOptions([]);
    }
  };

  const handleAutoCorrect = () => {
    if (autoCorrectedCode) {
      setInputValue(autoCorrectedCode);
      setShowAutoCorrect(false);
      setAutoCorrectedCode(null);
    }
  };

  const handleSelectOption = (event: React.SyntheticEvent, value: string | Icd10Code | null) => {
    if (value && typeof value === 'object') {
      onSelect(value.code, value.title, value);
      setInputValue(`${value.code} - ${value.title}`);
      setSelectedCode(value);
      setOpen(false);
      setShowSuggestionsPanel(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setShowSuggestionsPanel(true);
  };

  const getValidationIcon = () => {
    if (!validationResult) return null;
    
    if (validationResult.isValid) {
      return <CheckCircle color="success" fontSize="small" />;
    } else if (validationResult.error) {
      return <ErrorIcon color="error" fontSize="small" />;
    } else if (validationResult.warning) {
      return <Warning color="warning" fontSize="small" />;
    }
    return null;
  };

  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getConfidenceLabel = () => {
    if (confidence >= 0.8) return 'Hoch';
    if (confidence >= 0.6) return 'Mittel';
    return 'Niedrig';
  };

  const getValidationColor = () => {
    if (!validationResult) return 'default';
    if (validationResult.isValid) return 'success';
    if (validationResult.error) return 'error';
    if (validationResult.warning) return 'warning';
    return 'default';
  };

  const renderSuggestions = () => {
    if (!showSuggestionsPanel) return null;

    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={20} />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      );
    }

    let currentSuggestions: Icd10Code[] = [];
    if (activeTab === 0) {
      currentSuggestions = options;
    } else if (activeTab === 1) {
      currentSuggestions = topCodes.map(stat => ({
        _id: stat._id,
        code: stat.code,
        title: stat.title,
        longTitle: '',
        chapter: '',
        synonyms: [],
        language: 'de',
        validFrom: '',
        validTo: '',
        releaseYear: new Date().getFullYear(),
        isBillable: true,
        parentCode: '',
        searchText: '',
        isActive: true,
        sortOrder: 0,
        level: 0,
        chapterName: '',
        createdAt: '',
        updatedAt: ''
      }));
    } else if (activeTab === 2) {
      currentSuggestions = recentCodes.map(stat => ({
        _id: stat._id,
        code: stat.code,
        title: stat.title,
        longTitle: '',
        chapter: '',
        synonyms: [],
        language: 'de',
        validFrom: '',
        validTo: '',
        releaseYear: new Date().getFullYear(),
        isBillable: true,
        parentCode: '',
        searchText: '',
        isActive: true,
        sortOrder: 0,
        level: 0,
        chapterName: '',
        createdAt: '',
        updatedAt: ''
      }));
    }

    if (currentSuggestions.length === 0 && inputValue.length >= 3) {
      return (
        <Typography color="textSecondary" sx={{ p: 2 }}>
          Keine Ergebnisse gefunden.
        </Typography>
      );
    }

    return (
      <List dense sx={{ maxHeight: 300, overflowY: 'auto' }}>
        {currentSuggestions.map((item, index) => {
          const codeEntry = item;

          const isCommon = isCommonCode(codeEntry.code);
          const chapterName = getChapterName(codeEntry.code);

          return (
            <ListItem
              key={codeEntry._id || index}
              component="div"
              onClick={() => handleSelectOption(null as any, codeEntry)}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <ListItemText
                primary={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: '#1976d2', minWidth: '60px' }}>
                      {codeEntry.code}
                    </span>
                    <span style={{ flexGrow: 1 }}>
                      {codeEntry.title}
                    </span>
                    {isCommon && (
                      <Chip label="Häufig" size="small" color="primary" sx={{ height: 20 }} />
                    )}
                    {codeEntry.isBillable && (
                      <Chip label="Abrechenbar" size="small" color="success" sx={{ height: 20 }} />
                    )}
                  </span>
                }
                secondary={
                  <span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                      {chapterName}
                    </span>
                    {codeEntry.longTitle && (
                      <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)', display: 'block' }}>
                        {codeEntry.longTitle}
                      </span>
                    )}
                  </span>
                }
              />
            </ListItem>
          );
        })}
      </List>
    );
  };

  return (
    <Box>
      <Autocomplete
        freeSolo
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onChange={handleSelectOption}
        options={options}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          return `${option.code} - ${option.title}`;
        }}
        isOptionEqualToValue={(option, value) => option.code === (value as Icd10Code)?.code}
        loading={loading}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            variant="outlined"
            fullWidth
            inputRef={inputRef}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {showValidation && getValidationIcon()}
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </Box>
              ),
            }}
            color={getValidationColor() as any}
            helperText={
              showValidation && validationResult ? (
                <span>
                  {validationResult.error && (
                    <span style={{ fontSize: '0.75rem', color: '#d32f2f' }}>
                      {validationResult.error}
                    </span>
                  )}
                  {validationResult.warning && (
                    <span style={{ fontSize: '0.75rem', color: '#ed6c02' }}>
                      {validationResult.warning}
                    </span>
                  )}
                  {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                    <span style={{ marginTop: '4px', display: 'block' }}>
                      {validationResult.suggestions.map((suggestion: string, index: number) => (
                        <span key={index} style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)', display: 'block' }}>
                          • {suggestion}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              ) : undefined
            }
          />
        )}
        renderOption={(props, option) => (
          <ListItem {...props} key={option._id}>
            <ListItemText
              primary={`${option.code} - ${option.title}`}
              secondary={option.longTitle || ''}
            />
          </ListItem>
        )}
        sx={{ width: '100%' }}
        popupIcon={<Search />}
        ListboxComponent={Box}
        ListboxProps={{
          sx: {
            p: 0,
            '& .MuiAutocomplete-option': {
              p: 0,
            },
          },
        }}
        renderGroup={(params) => params.children}
      />
      
      {/* Enhanced Validation Details */}
      {validationResult && showValidation && (
        <Box sx={{ mt: 1 }}>
          {/* Confidence Score */}
          {showConfidence && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Vertrauenswertung: {getConfidenceLabel()} ({Math.round(confidence * 100)}%)
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={confidence * 100} 
                color={getConfidenceColor() as any}
                sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
              />
            </Box>
          )}

          {/* Auto-correction suggestion */}
          {showAutoCorrect && autoCorrectedCode && (
            <Alert 
              severity="info" 
              sx={{ mb: 1 }}
              action={
                <IconButton
                  size="small"
                  onClick={handleAutoCorrect}
                  color="inherit"
                >
                  <AutoFixHigh fontSize="small" />
                </IconButton>
              }
            >
              <Typography variant="body2">
                Vorschlag: <strong>{autoCorrectedCode}</strong>
              </Typography>
            </Alert>
          )}

          {/* Validation suggestions */}
          {validationResult.suggestions && validationResult.suggestions.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Vorschläge:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {validationResult.suggestions.slice(0, 3).map((suggestion, index) => (
                  <Chip
                    key={index}
                    label={suggestion}
                    size="small"
                    variant="outlined"
                    onClick={() => setInputValue(suggestion)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Code level indicator */}
          {validationResult.isValid && inputValue && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Code-Level: {getCodeLevel(inputValue)}
              </Typography>
              <Chip
                label={getChapterName(inputValue)}
                size="small"
                variant="outlined"
                color="primary"
              />
            </Box>
          )}
        </Box>
      )}

      {showSuggestions && (
        <Fade in={showSuggestionsPanel}>
          <Paper elevation={3} sx={{ mt: 1 }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="ICD-10 search tabs" variant="fullWidth">
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Search fontSize="small" />
                    Suche
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Star fontSize="small" />
                    Häufig
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <History fontSize="small" />
                    Kürzlich
                  </Box>
                } 
              />
            </Tabs>
            {renderSuggestions()}
          </Paper>
        </Fade>
      )}
    </Box>
  );
};

export default EnhancedICD10Autocomplete;
