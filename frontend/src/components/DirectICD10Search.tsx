import React, { useState, useEffect } from 'react';
import { Box, TextField, List, ListItem, ListItemText, Typography, CircularProgress, Alert } from '@mui/material';

interface Icd10Code {
  _id: string;
  code: string;
  title: string;
  longTitle: string;
  chapter: string;
  synonyms: string[];
  isBillable: boolean;
  chapterName: string;
}

const DirectICD10Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Icd10Code[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchICD10 = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      console.log('🔍 Query too short:', searchQuery, '(need at least 3 characters)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Direct API search for:', searchQuery);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/icd10/search?q=${encodeURIComponent(searchQuery)}&year=2025&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Direct API response:', data);

      if (data.success && data.data) {
        setResults(data.data);
        console.log('📊 Results set:', data.data.length, 'items');
      } else {
        setResults([]);
        console.log('❌ No results in response');
      }
    } catch (err) {
      console.error('❌ Direct API search failed:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;
    setQuery(newQuery);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchICD10(newQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Direkte ICD-10 Suche (API)
      </Typography>
      
      <TextField
        fullWidth
        label="ICD-10 Code oder Beschreibung eingeben... (mind. 3 Zeichen)"
        value={query}
        onChange={handleInputChange}
        helperText={query.length > 0 && query.length < 3 ? "Mindestens 3 Zeichen erforderlich" : ""}
        sx={{ mb: 2 }}
      />

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="subtitle2" gutterBottom>
        Suchergebnisse ({results.length}):
      </Typography>

      <List dense>
        {results.map((code, index) => (
          <ListItem
            key={code._id}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main', minWidth: 60 }}>
                    {code.code}
                  </Typography>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {code.title}
                  </Typography>
                  {code.isBillable && (
                    <Typography variant="caption" color="success.main">
                      Abrechenbar
                    </Typography>
                  )}
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Kapitel {code.chapter}: {code.chapterName}
                  </Typography>
                  {code.synonyms && code.synonyms.length > 0 && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Synonyme: {code.synonyms.slice(0, 3).join(', ')}
                      {code.synonyms.length > 3 && ` (+${code.synonyms.length - 3} weitere)`}
                    </Typography>
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>

      {results.length === 0 && query.length >= 3 && !loading && (
        <Typography color="text.secondary">
          Keine Ergebnisse gefunden für "{query}"
        </Typography>
      )}
    </Box>
  );
};

export default DirectICD10Search;
