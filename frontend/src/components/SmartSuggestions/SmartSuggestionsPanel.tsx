import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  IconButton,
  Tooltip,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  ExpandMore,
  Lightbulb,
  LocalHospital,
  Medication,
  CalendarToday,
  Science,
  MonitorHeart,
  Description,
  Info,
  CheckCircle,
  Warning,
  Error,
  ExpandLess,
} from '@mui/icons-material';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';

interface Suggestion {
  type: string;
  category: string;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'medium' | 'high' | 'urgent';
  confidence?: number;
  reason?: string;
  action?: string;
  icd10Code?: string;
  icd10Title?: string;
  medicationName?: string;
  suggestedDate?: string;
  suggestedTests?: string[];
  relatedDiagnosis?: string;
  relatedMedication?: string;
  documentType?: string;
}

interface SmartSuggestionsPanelProps {
  patientId: string;
  onSuggestionClick?: (suggestion: Suggestion) => void;
}

const SmartSuggestionsPanel: React.FC<SmartSuggestionsPanelProps> = ({ patientId, onSuggestionClick }) => {
  const [suggestions, setSuggestions] = useState<{
    diagnoses: Suggestion[];
    medications: Suggestion[];
    appointments: Suggestion[];
    laboratory: Suggestion[];
    vitalSigns: Suggestion[];
    documents: Suggestion[];
    general: Suggestion[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
    diagnoses: true,
    medications: true,
    appointments: true,
    laboratory: true,
    vitalSigns: true,
    documents: true,
    general: true,
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (patientId) {
      loadSuggestions();
    }
  }, [patientId]);

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      interface SuggestionsResponse {
        success: boolean;
        suggestions?: {
          diagnoses: Suggestion[];
          medications: Suggestion[];
          appointments: Suggestion[];
          laboratory: Suggestion[];
          vitalSigns: Suggestion[];
          documents: Suggestion[];
          general: Suggestion[];
        };
        error?: string;
        patientId?: string;
        generatedAt?: string;
      }
      const response = await api.get<SuggestionsResponse>(`/smart-suggestions/patient/${patientId}`);
      if (response.data.success && response.data.suggestions) {
        setSuggestions(response.data.suggestions);
      } else {
        setError(response.data.error || 'Fehler beim Laden der Vorschläge');
      }
    } catch (err: any) {
      console.error('Error loading suggestions:', err);
      setError(err.response?.data?.error || 'Fehler beim Laden der Vorschläge');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'normal': return 'default';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Error fontSize="small" />;
      case 'high': return <Warning fontSize="small" />;
      case 'medium': return <Info fontSize="small" />;
      case 'normal': return <CheckCircle fontSize="small" />;
      case 'low': return <Info fontSize="small" />;
      default: return <Info fontSize="small" />;
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'diagnosis': return <LocalHospital />;
      case 'medication': return <Medication />;
      case 'appointment': return <CalendarToday />;
      case 'laboratory': return <Science />;
      case 'vitalSigns': return <MonitorHeart />;
      case 'document': return <Description />;
      case 'general': return <Info />;
      default: return <Lightbulb />;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      diagnoses: 'Diagnose-Vorschläge',
      medications: 'Medikamenten-Vorschläge',
      appointments: 'Termin-Vorschläge',
      laboratory: 'Labor-Vorschläge',
      vitalSigns: 'Vitalwerte-Vorschläge',
      documents: 'Dokumenten-Vorschläge',
      general: 'Allgemeine Vorschläge',
    };
    return labels[category] || category;
  };

  const navigateToTab = (tabName: string) => {
    navigate(`/patient-organizer/${patientId}?tab=${tabName}`);
  };

  const handleSuggestionAction = (suggestion: Suggestion) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }

    // Automatische Navigation basierend auf Typ
    switch (suggestion.type) {
      case 'diagnosis':
        navigateToTab('diagnosen');
        break;
      case 'medication':
        navigateToTab('medizinisch');
        break;
      case 'appointment':
        navigate('/appointments?create=true');
        break;
      case 'laboratory':
        navigateToTab('labor');
        break;
      case 'vitalSigns':
        navigateToTab('vitalwerte');
        break;
      case 'document':
        navigateToTab('dokumente');
        break;
      default:
        break;
    }
  };

  const handleChipClick = (suggestion: Suggestion, chipType: 'priority' | 'icd10' | 'medication' | 'tests') => {
    // Navigiere zur entsprechenden Rubrik basierend auf dem Chip-Typ
    switch (chipType) {
      case 'priority':
      case 'icd10':
        // ICD-10 oder Priority -> Diagnosen-Tab
        if (suggestion.type === 'diagnosis') {
          navigateToTab('diagnosen');
        }
        break;
      case 'medication':
        // Medikament -> Medizinisch-Tab
        navigateToTab('medizinisch');
        break;
      case 'tests':
        // Tests -> Labor-Tab
        navigateToTab('labor');
        break;
      default:
        // Fallback: Navigiere basierend auf Vorschlag-Typ
        handleSuggestionAction(suggestion);
        break;
    }
  };

  const renderSuggestion = (suggestion: Suggestion, index: number) => (
    <Card key={index} sx={{ mb: 1.5, borderLeft: 3, borderLeftColor: `${getPriorityColor(suggestion.priority)}.main` }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              {getPriorityIcon(suggestion.priority)}
              <Typography variant="subtitle1" fontWeight="bold">
                {suggestion.title}
              </Typography>
              <Chip
                label={suggestion.priority}
                size="small"
                color={getPriorityColor(suggestion.priority) as any}
                sx={{ ml: 'auto', cursor: 'pointer' }}
                onClick={() => handleChipClick(suggestion, 'priority')}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {suggestion.description}
            </Typography>
            {suggestion.reason && (
              <Alert severity="info" sx={{ mb: 1, py: 0.5 }}>
                <Typography variant="caption">
                  <strong>Grund:</strong> {suggestion.reason}
                </Typography>
              </Alert>
            )}
            {suggestion.action && (
              <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                💡 {suggestion.action}
              </Typography>
            )}
            {suggestion.confidence && (
              <Typography variant="caption" color="text.secondary">
                Vertrauenswertung: {Math.round(suggestion.confidence * 100)}%
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          {suggestion.icd10Code && (
            <Chip
              label={`ICD-10: ${suggestion.icd10Code}`}
              size="small"
              variant="outlined"
              sx={{ cursor: 'pointer' }}
              onClick={() => handleChipClick(suggestion, 'icd10')}
            />
          )}
          {suggestion.medicationName && (
            <Chip
              label={suggestion.medicationName}
              size="small"
              variant="outlined"
              sx={{ cursor: 'pointer' }}
              onClick={() => handleChipClick(suggestion, 'medication')}
            />
          )}
          {suggestion.suggestedTests && (
            <Chip
              label={`${suggestion.suggestedTests.length} Tests`}
              size="small"
              variant="outlined"
              sx={{ cursor: 'pointer' }}
              onClick={() => handleChipClick(suggestion, 'tests')}
            />
          )}
        </Box>
        {suggestion.action && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleSuggestionAction(suggestion)}
            sx={{ mt: 1 }}
          >
            {suggestion.action}
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={loadSuggestions} sx={{ mt: 2 }} variant="outlined">
          Erneut versuchen
        </Button>
      </Paper>
    );
  }

  if (!suggestions) {
    return null;
  }

  const totalSuggestions = Object.values(suggestions).reduce((sum, arr) => sum + arr.length, 0);

  if (totalSuggestions === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Lightbulb color="primary" />
          <Typography variant="h6">Intelligente Vorschläge</Typography>
        </Box>
        <Alert severity="info">
          Derzeit sind keine Vorschläge verfügbar. Die Vorschläge werden basierend auf Patientendaten, Diagnosen und Laborwerten generiert.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lightbulb color="primary" />
          <Typography variant="h6">Intelligente Vorschläge</Typography>
          <Chip label={totalSuggestions} size="small" color="primary" />
        </Box>
        <IconButton size="small" onClick={loadSuggestions}>
          <CircularProgress size={16} sx={{ display: loading ? 'block' : 'none' }} />
        </IconButton>
      </Box>

      <Stack spacing={1}>
        {Object.entries(suggestions).map(([category, categorySuggestions]) => {
          if (categorySuggestions.length === 0) return null;

          return (
            <Accordion
              key={category}
              expanded={expandedCategories[category]}
              onChange={() => handleCategoryToggle(category)}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  {getCategoryIcon(categorySuggestions[0].type)}
                  <Typography variant="subtitle1" fontWeight="medium">
                    {getCategoryLabel(category)}
                  </Typography>
                  <Chip label={categorySuggestions.length} size="small" sx={{ ml: 'auto' }} />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {categorySuggestions.map((suggestion, index) => renderSuggestion(suggestion, index))}
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    </Paper>
  );
};

export default SmartSuggestionsPanel;
