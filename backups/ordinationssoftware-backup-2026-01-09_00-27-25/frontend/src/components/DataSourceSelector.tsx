import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import GradientDialogTitle from './GradientDialogTitle';
import api from '../utils/api';
import { DekursEntry } from '../store/slices/dekursSlice';
import { Document } from '../store/slices/documentSlice';

export interface DataSourceOption {
  type: 'dekurs' | 'document' | 'manual';
  label: string;
  date?: Date | string;
  modified?: boolean;
  data?: DekursEntry | Document | null;
  subtitle?: string;
}

interface DataSourceSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (source: 'dekurs' | 'document' | 'manual', data?: DekursEntry | Document) => void;
  patientId: string;
  documentType: string;
  dekursEntryId?: string; // Optional: spezifischer Dekurs-Eintrag
}

const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
  open,
  onClose,
  onSelect,
  patientId,
  documentType,
  dekursEntryId
}) => {
  const [options, setOptions] = useState<DataSourceOption[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const opts: DataSourceOption[] = [];
      
      // 1. Lade neuesten Dekurs-Eintrag
      try {
        const dekursResponse: any = await api.get(`/dekurs/patient/${patientId}?limit=1`);
        const dekursData = dekursResponse?.data || dekursResponse;
        const dekursEntries = dekursData?.success ? dekursData.data : (Array.isArray(dekursData) ? dekursData : []);
        
        if (dekursEntries && dekursEntries.length > 0) {
          const latestDekurs = dekursEntries[0];
          opts.push({
            type: 'dekurs',
            label: 'Neuester Dekurs-Eintrag',
            date: latestDekurs.entryDate,
            data: latestDekurs,
            subtitle: latestDekurs.entryDate 
              ? new Date(latestDekurs.entryDate).toLocaleDateString('de-DE')
              : undefined
          });
        }
      } catch (dekursError) {
        console.warn('Fehler beim Laden des Dekurs:', dekursError);
      }
      
      // 2. Lade existierende Dokumente
      try {
        const params: any = { documentType };
        if (dekursEntryId) {
          params.dekursEntryId = dekursEntryId;
        }
        
        const documentsResponse: any = await api.get(`/documents/patient/${patientId}/existing`, { params });
        const documentsData = documentsResponse?.data || documentsResponse;
        const documents = documentsData?.success ? documentsData.data : (Array.isArray(documentsData) ? documentsData : []);
        
        if (documents && documents.length > 0) {
          documents.forEach((doc: Document) => {
            const isModified = !!(doc.lastModifiedAt && doc.createdAt && 
              new Date(doc.lastModifiedAt).getTime() > new Date(doc.createdAt).getTime());
            
            opts.push({
              type: 'document',
              label: doc.title || `${documentType} Dokument`,
              date: doc.createdAt || doc.updatedAt,
              modified: isModified,
              data: doc,
              subtitle: doc.createdAt 
                ? new Date(doc.createdAt).toLocaleDateString('de-DE')
                : undefined
            });
          });
        }
      } catch (docError) {
        console.warn('Fehler beim Laden der Dokumente:', docError);
      }
      
      // 3. Leer-Option immer hinzufügen
      opts.push({
        type: 'manual',
        label: 'Leer (ohne Vorbelegung)',
        data: null
      });
      
      setOptions(opts);
      
      // Standard-Auswahl: Erste Option (neuester Dekurs oder erstes Dokument)
      if (opts.length > 0) {
        setSelectedValue(opts[0].type === 'manual' ? 'manual' : `${opts[0].type}-${opts[0].data?._id || 'latest'}`);
      }
    } catch (err: any) {
      console.error('Fehler beim Laden der Datenquellen:', err);
      setError('Fehler beim Laden der Datenquellen. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }, [patientId, documentType, dekursEntryId]);

  useEffect(() => {
    if (open && patientId) {
      loadOptions();
    }
  }, [open, patientId, loadOptions]);

  const handleSelect = () => {
    const selectedOption = options.find(opt => 
      `${opt.type}-${opt.data?._id || 'latest'}` === selectedValue || 
      (opt.type === 'manual' && selectedValue === 'manual')
    );
    
    if (selectedOption) {
      onSelect(selectedOption.type, selectedOption.data as any);
      onClose();
    }
  };


  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <GradientDialogTitle 
        title="Datenquelle auswählen"
        onClose={onClose}
      />
      
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <RadioGroup
            value={selectedValue}
            onChange={(e) => setSelectedValue(e.target.value)}
          >
            {options.map((option, index) => {
              const optionId = option.type === 'manual' 
                ? 'manual' 
                : `${option.type}-${option.data?._id || 'latest'}`;
              
              return (
                <Box
                  key={optionId}
                  sx={{
                    border: '1px solid',
                    borderColor: selectedValue === optionId ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    p: 2,
                    mb: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover'
                    },
                    bgcolor: selectedValue === optionId ? 'action.selected' : 'background.paper'
                  }}
                  onClick={() => setSelectedValue(optionId)}
                >
                  <FormControlLabel
                    value={optionId}
                    control={<Radio />}
                    label={
                      <Box sx={{ ml: 1, width: '100%' }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {option.type === 'dekurs' && <HistoryIcon color="primary" />}
                          {option.type === 'document' && <DescriptionIcon color="primary" />}
                          {option.type === 'manual' && <AddIcon color="action" />}
                          
                          <Typography variant="body1" fontWeight="medium">
                            {option.label}
                          </Typography>
                          
                          {option.modified && (
                            <Chip 
                              label="Bearbeitet" 
                              size="small" 
                              color="warning"
                              icon={<EditIcon />}
                            />
                          )}
                        </Box>
                        
                        {option.subtitle && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 4 }}>
                            {option.subtitle}
                          </Typography>
                        )}
                        
                        {option.type === 'document' && option.data && (option.data as Document).content?.html && (
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{ 
                              mt: 0.5, 
                              ml: 4, 
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxHeight: '3em'
                            }}
                          >
                            {((option.data as Document).content?.html || '').replace(/<[^>]*>/g, '').substring(0, 100)}...
                          </Typography>
                        )}
                      </Box>
                    }
                    sx={{ width: '100%', m: 0 }}
                  />
                </Box>
              );
            })}
          </RadioGroup>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button 
          onClick={handleSelect} 
          variant="contained" 
          disabled={loading || !selectedValue}
        >
          Auswählen
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DataSourceSelector;

