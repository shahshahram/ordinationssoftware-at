import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Chip,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  History as HistoryIcon,
  Star as StarIcon,
  Public as PublicIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  MedicalServices as ServiceIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  searchIcd10Codes,
  getTopIcd10Codes,
  getRecentIcd10Codes,
  updateIcd10Usage,
  clearSearchResults,
  setSearchParams
} from '../store/slices/icd10Slice';
import { Icd10Code, Icd10TopCode } from '../store/slices/icd10Slice';

interface ICD10AutocompleteProps {
  onSelect: (code: string, display: string, fullCode: Icd10Code) => void;
  context?: 'billing' | 'medical' | 'reporting';
  requireBillable?: boolean;
  chapters?: string[];
  defaultTop?: 'user' | 'location' | 'global' | 'service';
  placeholder?: string;
  label?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

const ICD10Autocomplete: React.FC<ICD10AutocompleteProps> = ({
  onSelect,
  context = 'medical',
  requireBillable = false,
  chapters = [],
  defaultTop = 'user',
  placeholder = 'ICD-10 Code oder Beschreibung eingeben...',
  label = 'ICD-10 Diagnose',
  error = false,
  helperText,
  disabled = false,
  value = '',
  onChange,
  fullWidth = true,
  size = 'medium'
}) => {
  const dispatch = useAppDispatch();
  const {
    searchResults,
    topCodes,
    recentCodes,
    loading,
    error: searchError,
    searchParams
  } = useAppSelector(state => state.icd10);

  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCode, setSelectedCode] = useState<Icd10Code | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const debouncedSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (query.length >= 2 || /^[A-Za-z][0-9]/.test(query)) {
        dispatch(searchIcd10Codes({
          q: query,
          year: new Date().getFullYear(),
          billableOnly: requireBillable,
          chapters: chapters.length > 0 ? chapters : undefined,
          limit: 20
        }));
        setShowSuggestions(true);
      } else if (query.length === 0) {
        dispatch(clearSearchResults());
        setShowSuggestions(false);
      }
    }, 250);
  }, [dispatch, requireBillable, chapters]);

  // Load top codes on mount
  useEffect(() => {
    dispatch(getTopIcd10Codes({ 
      scope: defaultTop, 
      year: new Date().getFullYear(), 
      limit: 10 
    }));
    dispatch(getRecentIcd10Codes({ 
      scope: defaultTop, 
      year: new Date().getFullYear(), 
      limit: 10 
    }));
  }, [dispatch, defaultTop]);

  // Handle input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
    debouncedSearch(newValue);
  };

  // Handle code selection
  const handleCodeSelect = (code: Icd10Code) => {
    setSelectedCode(code);
    const displayTitle = code.title || code.longTitle || `ICD-10 Code ${code.code}`;
    console.log('ICD10Autocomplete: handleCodeSelect - code:', code.code, 'displayTitle:', displayTitle);
    setInputValue(`${code.code} - ${displayTitle}`);
    onChange?.(`${code.code} - ${displayTitle}`);
    onSelect(code.code, displayTitle, code);
    setOpen(false);
    setShowSuggestions(false);

    // Update usage statistics
    dispatch(updateIcd10Usage({
      code: code.code,
      catalogYear: code.releaseYear,
      context,
      scope: defaultTop
    }));
  };

  // Handle top code selection
  const handleTopCodeSelect = (topCode: Icd10TopCode) => {
    console.log('ICD10Autocomplete: handleTopCodeSelect called with:', topCode);
    
    // Try to find the full code object from search results first
    const fullCode = searchResults.find(c => c.code === topCode.code);
    
    if (fullCode) {
      console.log('ICD10Autocomplete: Found full code in search results:', fullCode);
      handleCodeSelect(fullCode);
    } else {
      // If not found in search results, try to fetch the full code from backend
      console.log('ICD10Autocomplete: Code not found in search results, fetching from backend...');
      fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/icd10/search?q=${topCode.code}&year=2025&limit=1`)
        .then(response => response.json())
        .then(data => {
          if (data.success && data.data.length > 0) {
            const fetchedCode = data.data[0];
            console.log('ICD10Autocomplete: Fetched full code from backend:', fetchedCode);
            handleCodeSelect(fetchedCode);
          } else {
            // Fallback to basic code info
            const fallbackCode = {
              _id: topCode._id,
              code: topCode.code,
              title: topCode.title || topCode.display || `ICD-10 Code ${topCode.code}`,
              longTitle: topCode.longTitle || topCode.title || topCode.display || `ICD-10 Code ${topCode.code}`,
              releaseYear: new Date().getFullYear(),
              isBillable: topCode.isBillable !== undefined ? topCode.isBillable : true,
              chapter: topCode.chapter || '',
              synonyms: topCode.synonyms || [],
              language: 'de',
              validFrom: new Date().toISOString(),
              validTo: undefined,
              parentCode: undefined,
              searchText: topCode.code.toLowerCase(),
              isActive: true,
              sortOrder: 0,
              level: undefined,
              chapterName: undefined,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            } as Icd10Code;
            console.log('ICD10Autocomplete: Using fallback code:', fallbackCode);
            handleCodeSelect(fallbackCode);
          }
        })
        .catch(error => {
          console.error('ICD10Autocomplete: Error fetching code details:', error);
          // Fallback to basic code info
          const fallbackCode = {
            _id: topCode._id,
            code: topCode.code,
            title: `ICD-10 Code ${topCode.code}`,
            longTitle: `ICD-10 Code ${topCode.code}`,
            releaseYear: new Date().getFullYear(),
            isBillable: true,
            chapter: '',
            synonyms: [],
            language: 'de',
            validFrom: new Date().toISOString(),
            validTo: undefined,
            parentCode: undefined,
            searchText: topCode.code.toLowerCase(),
            isActive: true,
            sortOrder: 0,
            level: undefined,
            chapterName: undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Icd10Code;
          handleCodeSelect(fallbackCode);
        });
    }
  };

  // Handle key navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setShowSuggestions(false);
    }
  };

  // Get suggestions based on active tab
  const getSuggestions = () => {
    switch (activeTab) {
      case 0: // Search results
        return searchResults;
      case 1: // Recent
        return recentCodes.map(rc => ({
          _id: rc._id,
          code: rc.code,
          title: rc.title,
          releaseYear: new Date().getFullYear(),
          isBillable: true
        })) as Icd10Code[];
      case 2: // Top
        return topCodes.map(tc => ({
          _id: tc._id,
          code: tc.code,
          title: tc.title,
          releaseYear: new Date().getFullYear(),
          isBillable: true
        })) as Icd10Code[];
      default:
        return [];
    }
  };

  const suggestions = getSuggestions();

  return (
    <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      <TextField
        ref={inputRef}
        fullWidth={fullWidth}
        size={size}
        label={label}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setOpen(true);
          if (searchResults.length > 0 || topCodes.length > 0 || recentCodes.length > 0) {
            setShowSuggestions(true);
          }
        }}
        error={error}
        helperText={helperText}
        disabled={disabled}
        InputProps={{
          startAdornment: (
            <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
          ),
          endAdornment: loading ? (
            <CircularProgress size={20} />
          ) : selectedCode ? (
            <Tooltip title="Code ausgewählt">
              <CheckCircleIcon color="success" />
            </Tooltip>
          ) : null
        }}
      />

      {/* Suggestions Dropdown */}
      {(open || showSuggestions) && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            maxHeight: 400,
            overflow: 'hidden',
            mt: 0.5
          }}
        >
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="fullWidth"
              sx={{ minHeight: 40 }}
            >
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SearchIcon fontSize="small" />
                    Suche
                    {searchResults.length > 0 && (
                      <Badge badgeContent={searchResults.length} color="primary" />
                    )}
                  </Box>
                }
                sx={{ minHeight: 40, py: 0.5 }}
              />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <HistoryIcon fontSize="small" />
                    Kürzlich
                    {recentCodes.length > 0 && (
                      <Badge badgeContent={recentCodes.length} color="secondary" />
                    )}
                  </Box>
                }
                sx={{ minHeight: 40, py: 0.5 }}
              />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <StarIcon fontSize="small" />
                    Häufig
                    {topCodes.length > 0 && (
                      <Badge badgeContent={topCodes.length} color="warning" />
                    )}
                  </Box>
                }
                sx={{ minHeight: 40, py: 0.5 }}
              />
            </Tabs>
          </Box>

          {/* Content */}
          <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : searchError ? (
              <Alert severity="error" sx={{ m: 1 }}>
                {searchError}
              </Alert>
            ) : suggestions.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                <Typography variant="body2">
                  {activeTab === 0 
                    ? 'Keine Suchergebnisse gefunden'
                    : activeTab === 1
                    ? 'Keine kürzlich verwendeten Codes'
                    : 'Keine häufig verwendeten Codes'
                  }
                </Typography>
              </Box>
            ) : (
              <List dense>
                {suggestions.map((code, index) => (
                  <React.Fragment key={code._id || index}>
                    <ListItemButton
                      onClick={() => handleCodeSelect(code)}
                      sx={{
                        py: 1,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontWeight: 'bold',
                                color: '#1976d2',
                                minWidth: '60px'
                              }}
                            >
                              {code.code}
                            </span>
                            <span style={{ flex: 1 }}>
                              {code.title}
                            </span>
                            {!code.isBillable && (
                              <Tooltip title="Sammelcode - nicht abrechenbar">
                                <WarningIcon color="warning" fontSize="small" />
                              </Tooltip>
                            )}
                            {code.isBillable && (
                              <Tooltip title="Abrechenbar">
                                <CheckCircleIcon color="success" fontSize="small" />
                              </Tooltip>
                            )}
                          </span>
                        }
                        secondary={
                          <Typography component="div" variant="body2" sx={{ mt: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              {code.chapter && (
                                <Chip
                                  label={code.chapter}
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                />
                              )}
                              {code.longTitle && (
                                <Typography
                                  variant="caption"
                                  sx={{ 
                                    color: 'text.secondary', 
                                    fontStyle: 'italic',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  {code.longTitle}
                                </Typography>
                              )}
                            </Box>
                          </Typography>
                        }
                      />
                    </ListItemButton>
                    {index < suggestions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>

          {/* Footer */}
          <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
            <Typography variant="caption" color="text.secondary">
              Tipp: Mindestens 3 Zeichen eingeben oder Buchstabe + Zahl (z.B. "I1")
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ICD10Autocomplete;
