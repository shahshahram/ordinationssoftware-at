import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  InputAdornment,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Description as DocumentIcon,
  Receipt as BillingIcon,
  LocalHospital as DiagnosisIcon,
  Medication as MedicationIcon,
  Science as LabIcon,
  Image as DicomIcon,
  ArrowForward as ArrowIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface SearchResult {
  id: string;
  type: 'patient' | 'appointment' | 'document' | 'billing' | 'diagnosis' | 'medication' | 'labor' | 'dicom';
  title: string;
  subtitle?: string;
  description?: string;
  route: string;
  metadata?: Record<string, any>;
  relevanceScore?: number;
}

interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  resultType?: string;
}

const GlobalSearch: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Lade Suchhistorie
  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        })).slice(0, 5));
      } catch (e) {
        console.error('Error loading search history:', e);
      }
    }
  }, []);

  // Fokus auf Input wenn Dialog geöffnet wird
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Intelligente Suche
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{ results: SearchResult[] }>('/search/global', {
        query: searchQuery,
        limit: 10,
      });

      // Sortiere nach Relevanz
      const sortedResults = (response.data?.results || []).sort((a, b) => 
        (b.relevanceScore || 0) - (a.relevanceScore || 0)
      );

      setResults(sortedResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced Suche
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  // Tastatur-Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleResultClick(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Ergebnis anklicken
  const handleResultClick = (result: SearchResult) => {
    // Speichere in Historie
    const newHistoryItem: SearchHistoryItem = {
      query,
      timestamp: new Date(),
      resultType: result.type,
    };
    const updatedHistory = [newHistoryItem, ...history.filter(h => h.query !== query)].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));

    // Navigiere
    navigate(result.route);
    onClose();
  };

  // Historie-Eintrag anklicken
  const handleHistoryClick = (historyItem: SearchHistoryItem) => {
    setQuery(historyItem.query);
    performSearch(historyItem.query);
  };

  // Icon basierend auf Typ
  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'patient':
        return <PersonIcon />;
      case 'appointment':
        return <CalendarIcon />;
      case 'document':
        return <DocumentIcon />;
      case 'billing':
        return <BillingIcon />;
      case 'diagnosis':
        return <DiagnosisIcon />;
      case 'medication':
        return <MedicationIcon />;
      case 'labor':
        return <LabIcon />;
      case 'dicom':
        return <DicomIcon />;
      default:
        return <SearchIcon />;
    }
  };

  // Typ-Label
  const getTypeLabel = (type: SearchResult['type']) => {
    const labels: Record<SearchResult['type'], string> = {
      patient: 'Patient',
      appointment: 'Termin',
      document: 'Dokument',
      billing: 'Abrechnung',
      diagnosis: 'Diagnose',
      medication: 'Medikament',
      labor: 'Labor',
      dicom: 'DICOM',
    };
    return labels[type] || type;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          mt: 8,
          maxHeight: '80vh',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Suchfeld */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            placeholder="Suchen Sie nach Patienten, Terminen, Dokumenten..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: query && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setQuery('')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1.1rem',
              },
            }}
          />
        </Box>

        {/* Ergebnisse */}
        <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {!loading && query && results.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Keine Ergebnisse gefunden für "{query}"
              </Typography>
            </Box>
          )}

          {!loading && query && results.length > 0 && (
            <List sx={{ p: 0 }}>
              {results.map((result, index) => (
                <ListItem
                  key={result.id}
                  disablePadding
                  sx={{
                    backgroundColor: selectedIndex === index
                      ? alpha(theme.palette.primary.main, 0.08)
                      : 'transparent',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  <ListItemButton onClick={() => handleResultClick(result)}>
                    <ListItemIcon sx={{ color: 'primary.main' }}>
                      {getIcon(result.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight={500}>
                            {result.title}
                          </Typography>
                          <Chip
                            label={getTypeLabel(result.type)}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          {result.subtitle && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              {result.subtitle}
                            </Typography>
                          )}
                          {result.description && (
                            <Typography variant="caption" color="text.secondary">
                              {result.description}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ArrowIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}

          {/* Historie wenn keine Suche */}
          {!loading && !query && history.length > 0 && (
            <>
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <HistoryIcon fontSize="small" />
                  Letzte Suchen
                </Typography>
              </Box>
              <Divider />
              <List sx={{ p: 0 }}>
                {history.map((item, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemButton onClick={() => handleHistoryClick(item)}>
                      <ListItemIcon>
                        <HistoryIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.query}
                        secondary={format(item.timestamp, 'dd.MM.yyyy HH:mm', { locale: de })}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {/* Tipps wenn keine Suche und keine Historie */}
          {!loading && !query && history.length === 0 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Tastaturkürzel:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2, color: 'text.secondary' }}>
                <Typography component="li" variant="caption">↑↓ Navigation</Typography>
                <Typography component="li" variant="caption">Enter Auswahl</Typography>
                <Typography component="li" variant="caption">Esc Schließen</Typography>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
