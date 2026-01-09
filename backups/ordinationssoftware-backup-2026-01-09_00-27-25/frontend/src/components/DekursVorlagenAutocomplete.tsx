import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import api from '../utils/api';
import { DekursVorlage, useDekursVorlagen } from '../hooks/useDekursVorlagen';
import GradientDialogTitle from './GradientDialogTitle';

interface DekursVorlagenAutocompleteProps {
  open: boolean;
  onClose: () => void;
  onSelect: (vorlage: DekursVorlage) => void;
  icd10?: string;
  specialty?: string;
  locationId?: string;
}

const DekursVorlagenAutocomplete: React.FC<DekursVorlagenAutocompleteProps> = ({
  open,
  onClose,
  onSelect,
  icd10,
  specialty,
  locationId,
}) => {
  const [vorlagen, setVorlagen] = useState<DekursVorlage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { searchTemplates } = useDekursVorlagen();

  useEffect(() => {
    if (open) {
      loadVorlagen();
    }
  }, [open, icd10, specialty, locationId]);

  const loadVorlagen = async () => {
    setLoading(true);
    try {
      const results = await searchTemplates({
        icd10,
        specialty,
        locationId,
        query: searchQuery || undefined,
      });
      setVorlagen(results);
    } catch (error) {
      console.error('Fehler beim Laden der Vorlagen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadVorlagen();
  };

  const handleSelect = (vorlage: DekursVorlage) => {
    onSelect(vorlage);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <GradientDialogTitle title="Vorlage auswählen" onClose={onClose} />
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Suche"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            InputProps={{
              endAdornment: (
                <Button onClick={handleSearch} size="small">
                  Suchen
                </Button>
              ),
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : vorlagen.length === 0 ? (
          <Alert severity="info">Keine Vorlagen gefunden</Alert>
        ) : (
          <List>
            {vorlagen.map((vorlage, index) => (
              <React.Fragment key={vorlage._id}>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleSelect(vorlage)}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" component="span">{vorlage.title}</Typography>
                          {vorlage.isDefault && (
                            <Chip label="Standard" color="primary" size="small" />
                          )}
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" component="span" display="block">
                            Code: {vorlage.code} | ICD-10: {vorlage.icd10 || '-'}
                          </Typography>
                          {vorlage.specialty && (
                            <Typography variant="body2" color="text.secondary" component="span" display="block">
                              Fachrichtung: {vorlage.specialty}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                {index < vorlagen.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DekursVorlagenAutocomplete;

