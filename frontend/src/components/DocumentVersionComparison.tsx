import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CompareArrows,
  ExpandMore,
  Add,
  Remove,
  Edit
} from '@mui/icons-material';
import api from '../utils/api';

interface DocumentVersionComparisonProps {
  documentId: string;
  version1: string;
  version2: string;
  onClose?: () => void;
}

interface ComparisonResult {
  version1: {
    versionNumber: string;
    createdAt: string;
    createdBy?: any;
    status: string;
  };
  version2: {
    versionNumber: string;
    createdAt: string;
    createdBy?: any;
    status: string;
  };
  changes: {
    added: Array<{ field: string; value: any }>;
    modified: Array<{ field: string; oldValue: any; newValue: any }>;
    removed: Array<{ field: string; oldValue: any }>;
  };
}

const DocumentVersionComparison: React.FC<DocumentVersionComparisonProps> = ({
  documentId,
  version1,
  version2,
  onClose
}) => {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadComparison = async () => {
      try {
        setLoading(true);
        setError(null);
        const response: any = await api.get(`/documents/${documentId}/comparison/${version1}/${version2}`);
        setComparison(response.data?.data);
      } catch (err: any) {
        setError(err.message || 'Fehler beim Laden des Vergleichs');
      } finally {
        setLoading(false);
      }
    };

    if (documentId && version1 && version2) {
      loadComparison();
    }
  }, [documentId, version1, version2]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
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

  if (!comparison) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Keine Vergleichsdaten verfügbar
      </Alert>
    );
  }

  const { changes } = comparison;

  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <CompareArrows />
        <Typography variant="h6">
          Vergleich: Version {version1} ↔ Version {version2}
        </Typography>
      </Stack>

      {/* Versions-Info */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ flex: 1, p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Version {comparison.version1.versionNumber}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(comparison.version1.createdAt).toLocaleString('de-DE')}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Version {comparison.version2.versionNumber}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(comparison.version2.createdAt).toLocaleString('de-DE')}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ mb: 3 }} />

      {/* Änderungen */}
      {changes.added.length === 0 && changes.modified.length === 0 && changes.removed.length === 0 ? (
        <Alert severity="info">
          Keine Änderungen zwischen diesen Versionen gefunden.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {/* Hinzugefügte Felder */}
          {changes.added.length > 0 && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Add color="success" />
                  <Typography variant="subtitle1">
                    Hinzugefügt ({changes.added.length})
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Feld</TableCell>
                        <TableCell>Wert</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {changes.added.map((change, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Chip label={change.field} size="small" color="success" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {typeof change.value === 'object' 
                                ? JSON.stringify(change.value, null, 2)
                                : String(change.value)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Geänderte Felder */}
          {changes.modified.length > 0 && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Edit color="warning" />
                  <Typography variant="subtitle1">
                    Geändert ({changes.modified.length})
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Feld</TableCell>
                        <TableCell>Alt</TableCell>
                        <TableCell>Neu</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {changes.modified.map((change, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Chip label={change.field} size="small" color="warning" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              fontFamily="monospace"
                              sx={{ 
                                color: 'error.main',
                                textDecoration: 'line-through'
                              }}
                            >
                              {typeof change.oldValue === 'object' 
                                ? JSON.stringify(change.oldValue, null, 2)
                                : String(change.oldValue || '')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              fontFamily="monospace"
                              sx={{ color: 'success.main' }}
                            >
                              {typeof change.newValue === 'object' 
                                ? JSON.stringify(change.newValue, null, 2)
                                : String(change.newValue || '')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Entfernte Felder */}
          {changes.removed.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Remove color="error" />
                  <Typography variant="subtitle1">
                    Entfernt ({changes.removed.length})
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Feld</TableCell>
                        <TableCell>Alter Wert</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {changes.removed.map((change, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Chip label={change.field} size="small" color="error" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              fontFamily="monospace"
                              sx={{ 
                                color: 'error.main',
                                textDecoration: 'line-through'
                              }}
                            >
                              {typeof change.oldValue === 'object' 
                                ? JSON.stringify(change.oldValue, null, 2)
                                : String(change.oldValue || '')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )}
        </Stack>
      )}
    </Paper>
  );
};

export default DocumentVersionComparison;

