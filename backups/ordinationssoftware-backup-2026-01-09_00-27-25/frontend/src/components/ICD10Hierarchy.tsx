import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
  Chip,
  Breadcrumbs,
  Link,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Folder as FolderIcon,
  Description as DescriptionIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  Search as SearchIcon,
  Star as StarIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  getIcd10Hierarchy,
  getIcd10Children,
  getIcd10Parent,
  getIcd10Siblings,
  getIcd10Related,
  getIcd10Breadcrumb,
  Icd10Code,
  Icd10HierarchyChapter,
  Icd10BreadcrumbItem
} from '../store/slices/icd10Slice';

interface ICD10HierarchyProps {
  onCodeSelect?: (code: Icd10Code) => void;
  selectedCode?: Icd10Code | null;
  year?: number;
  showBreadcrumb?: boolean;
  showRelated?: boolean;
  showSiblings?: boolean;
  compact?: boolean;
}

const ICD10Hierarchy: React.FC<ICD10HierarchyProps> = ({
  onCodeSelect,
  selectedCode,
  year = new Date().getFullYear(),
  showBreadcrumb = true,
  showRelated = true,
  showSiblings = true,
  compact = false
}) => {
  const dispatch = useAppDispatch();
  const {
    hierarchy,
    children,
    parent,
    siblings,
    related,
    breadcrumb,
    loading,
    error
  } = useAppSelector((state) => state.icd10);

  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    dispatch(getIcd10Hierarchy(year));
  }, [dispatch, year]);

  useEffect(() => {
    if (selectedCode) {
      // Lade verwandte Daten für den ausgewählten Code
      dispatch(getIcd10Breadcrumb({ code: selectedCode.code, year }));
      dispatch(getIcd10Parent({ code: selectedCode.code, year }));
      dispatch(getIcd10Siblings({ code: selectedCode.code, year }));
      dispatch(getIcd10Related({ code: selectedCode.code, year, limit: 5 }));
    }
  }, [selectedCode, dispatch, year]);

  const handleChapterToggle = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const handleCodeToggle = (code: string) => {
    const newExpanded = new Set(expandedCodes);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
      // Lade Child-Codes
      dispatch(getIcd10Children({ parentCode: code, year }));
    }
    setExpandedCodes(newExpanded);
  };

  const handleCodeClick = (code: Icd10Code) => {
    if (onCodeSelect) {
      onCodeSelect(code);
    }
  };

  const handleBreadcrumbClick = (code: string) => {
    // Finde den Code in der Hierarchie und wähle ihn aus
    for (const chapter of hierarchy) {
      const foundCode = chapter.codes.find(c => c.code === code);
      if (foundCode) {
        handleCodeClick(foundCode);
        break;
      }
    }
  };

  const getChapterName = (chapterId: string): string => {
    const chapterNames: { [key: string]: string } = {
      'A': 'Bestimmte infektiöse und parasitäre Krankheiten',
      'B': 'Neubildungen',
      'C': 'Krankheiten des Blutes und der blutbildenden Organe',
      'D': 'Endokrine, Ernährungs- und Stoffwechselkrankheiten',
      'E': 'Psychische und Verhaltensstörungen',
      'F': 'Krankheiten des Nervensystems',
      'G': 'Krankheiten des Auges und der Augenanhangsgebilde',
      'H': 'Krankheiten des Ohres und des Warzenfortsatzes',
      'I': 'Krankheiten des Kreislaufsystems',
      'J': 'Krankheiten des Atmungssystems',
      'K': 'Krankheiten des Verdauungssystems',
      'L': 'Krankheiten der Haut und der Unterhaut',
      'M': 'Krankheiten des Muskel-Skelett-Systems',
      'N': 'Krankheiten des Urogenitalsystems',
      'O': 'Schwangerschaft, Geburt und Wochenbett',
      'P': 'Bestimmte Zustände, die ihren Ursprung in der Perinatalperiode haben',
      'Q': 'Angeborene Fehlbildungen, Deformitäten und Chromosomenanomalien',
      'R': 'Symptome und abnorme klinische und Laborbefunde',
      'S': 'Verletzungen, Vergiftungen und bestimmte andere Folgen äußerer Ursachen',
      'T': 'Äußere Ursachen von Morbidität und Mortalität',
      'U': 'Besondere Zwecke',
      'V': 'Krankheiten und Todesursachen',
      'W': 'Faktoren, die den Gesundheitszustand beeinflussen',
      'X': 'Kontaktanlässe mit dem Gesundheitswesen',
      'Y': 'Kodierhilfen',
      'Z': 'Kodierhilfen'
    };
    return chapterNames[chapterId] || `Kapitel ${chapterId}`;
  };

  const getCodeLevel = (code: string): number => {
    return code.split('.').length - 1;
  };

  const renderCode = (code: Icd10Code, level: number = 0) => {
    const hasChildren = code.code.includes('.') || children.some(c => c.parentCode === code.code);
    const isExpanded = expandedCodes.has(code.code);
    const isSelected = selectedCode?.code === code.code;

    return (
      <Box key={code._id} sx={{ ml: level * 2 }}>
        <ListItem
          disablePadding
          sx={{
            bgcolor: isSelected ? 'primary.50' : 'transparent',
            '&:hover': {
              bgcolor: isSelected ? 'primary.100' : 'action.hover'
            }
          }}
        >
          <ListItemButton
            onClick={() => handleCodeClick(code)}
            sx={{ py: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              {hasChildren ? (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCodeToggle(code.code);
                  }}
                >
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              ) : (
                <DescriptionIcon fontSize="small" color="action" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 'bold',
                      color: 'primary.main',
                      minWidth: '60px'
                    }}
                  >
                    {code.code}
                  </Typography>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {code.title}
                  </Typography>
                  {!code.isBillable && (
                    <Chip
                      label="Sammelcode"
                      size="small"
                      color="warning"
                      variant="outlined"
                      sx={{ height: 20 }}
                    />
                  )}
                  {code.isBillable && (
                    <Chip
                      label="Abrechenbar"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ height: 20 }}
                    />
                  )}
                </Box>
              }
              secondary={
                code.longTitle && (
                  <Typography variant="caption" color="text.secondary">
                    {code.longTitle}
                  </Typography>
                )
              }
            />
          </ListItemButton>
        </ListItem>
        
        {hasChildren && isExpanded && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List dense>
              {children
                .filter(c => c.parentCode === code.code)
                .map(child => renderCode(child, level + 1))
              }
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
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

  return (
    <Box>
      {/* Breadcrumb Navigation */}
      {showBreadcrumb && breadcrumb.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <HomeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Navigation
            </Typography>
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
              {breadcrumb.map((item, index) => (
                <Link
                  key={index}
                  component="button"
                  variant="body2"
                  onClick={() => handleBreadcrumbClick(item.code)}
                  sx={{
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  {item.title}
                </Link>
              ))}
            </Breadcrumbs>
          </CardContent>
        </Card>
      )}

      {/* Hierarchie-Navigation */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <FolderIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            ICD-10 Hierarchie ({year})
          </Typography>
          
          {hierarchy.map((chapter) => (
            <Accordion
              key={chapter._id}
              expanded={expandedChapters.has(chapter._id)}
              onChange={() => handleChapterToggle(chapter._id)}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Kapitel {chapter._id}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                    {getChapterName(chapter._id)}
                  </Typography>
                  <Chip
                    label={`${chapter.codes.length} Codes`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {chapter.codes
                    .filter(code => !code.parentCode) // Nur Root-Codes
                    .map(code => renderCode(code))
                  }
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </CardContent>
      </Card>

      {/* Verwandte Codes */}
      {showRelated && selectedCode && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <SearchIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Verwandte Codes
            </Typography>
            
            {siblings.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Geschwister-Codes:
                </Typography>
                <List dense>
                  {siblings.slice(0, 5).map((sibling) => (
                    <ListItemButton
                      key={sibling._id}
                      onClick={() => handleCodeClick(sibling)}
                      sx={{ py: 0.5 }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main', minWidth: '60px' }}>
                              {sibling.code}
                            </Typography>
                            <Typography variant="body2" sx={{ flex: 1 }}>
                              {sibling.title}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Box>
            )}

            {related.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Ähnliche Codes im gleichen Kapitel:
                </Typography>
                <List dense>
                  {related.slice(0, 5).map((rel) => (
                    <ListItemButton
                      key={rel._id}
                      onClick={() => handleCodeClick(rel)}
                      sx={{ py: 0.5 }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main', minWidth: '60px' }}>
                              {rel.code}
                            </Typography>
                            <Typography variant="body2" sx={{ flex: 1 }}>
                              {rel.title}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ICD10Hierarchy;
