import React, { useState, useEffect } from 'react';
import { Box, TextField, List, ListItem, ListItemText, Typography, CircularProgress, Alert } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { searchIcd10Codes } from '../store/slices/icd10Slice';

const SimpleICD10Search: React.FC = () => {
  const dispatch = useAppDispatch();
  const { searchResults, loading, error } = useAppSelector((state) => state.icd10);
  const [query, setQuery] = useState('');

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.length >= 3) {
      console.log('🔍 Searching for:', searchQuery);
      dispatch(searchIcd10Codes({
        q: searchQuery,
        year: 2025,
        limit: 20
      })).then((result) => {
        console.log('✅ Search completed:', result);
      }).catch((error) => {
        console.error('❌ Search failed:', error);
      });
    } else {
      console.log('🔍 Query too short:', searchQuery, '(need at least 3 characters)');
    }
  };

  useEffect(() => {
    console.log('📊 Search results updated:', searchResults.length, 'results');
    console.log('🔄 Loading state:', loading);
    console.log('❌ Error state:', error);
    if (searchResults.length > 0) {
      console.log('📋 First result:', searchResults[0]);
    }
  }, [searchResults, loading, error]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Einfache ICD-10 Suche (Debug)
      </Typography>
      
      <TextField
        fullWidth
        label="ICD-10 Code oder Beschreibung eingeben... (mind. 3 Zeichen)"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          handleSearch(e.target.value);
        }}
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
        Suchergebnisse ({searchResults.length}):
      </Typography>

      <List dense>
        {searchResults.map((code, index) => (
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

      {searchResults.length === 0 && query.length >= 3 && !loading && (
        <Typography color="text.secondary">
          Keine Ergebnisse gefunden für "{query}"
        </Typography>
      )}
    </Box>
  );
};

export default SimpleICD10Search;
