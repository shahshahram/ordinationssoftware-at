import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  IconButton,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip
} from '@mui/material';
import {
  History,
  CompareArrows,
  Visibility,
  CheckCircle,
  Cancel,
  Schedule,
  Person
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../utils/api';

interface DocumentVersion {
  _id: string;
  versionNumber: string;
  versionStatus: 'draft' | 'under_review' | 'released' | 'withdrawn';
  createdAt: string;
  createdBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  releasedAt?: string;
  releasedBy?: {
    firstName: string;
    lastName: string;
  };
  changeReason?: string;
  changesFromPreviousVersion?: {
    summary?: string;
    fieldsChanged?: string[];
  };
}

interface DocumentVersionHistoryProps {
  documentId: string;
  onViewVersion?: (version: DocumentVersion) => void;
  onCompareVersions?: (version1: string, version2: string) => void;
}

const DocumentVersionHistory: React.FC<DocumentVersionHistoryProps> = ({
  documentId,
  onViewVersion,
  onCompareVersions
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<[string | null, string | null]>([null, null]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

  useEffect(() => {
    const loadVersions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response: any = await api.get(`/documents/${documentId}/versions`);
        setVersions(response.data?.data || []);
      } catch (err: any) {
        setError(err.message || 'Fehler beim Laden der Versionen');
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      loadVersions();
    }
  }, [documentId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'released':
        return 'success';
      case 'under_review':
        return 'warning';
      case 'draft':
        return 'default';
      case 'withdrawn':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'released':
        return 'Freigegeben';
      case 'under_review':
        return 'In Prüfung';
      case 'draft':
        return 'Entwurf';
      case 'withdrawn':
        return 'Zurückgezogen';
      default:
        return status;
    }
  };

  const handleVersionSelect = (versionNumber: string) => {
    if (!selectedVersions[0]) {
      setSelectedVersions([versionNumber, null]);
    } else if (!selectedVersions[1] && selectedVersions[0] !== versionNumber) {
      setSelectedVersions([selectedVersions[0], versionNumber]);
      setCompareDialogOpen(true);
    } else {
      setSelectedVersions([versionNumber, null]);
    }
  };

  const handleCompare = () => {
    if (selectedVersions[0] && selectedVersions[1] && onCompareVersions) {
      onCompareVersions(selectedVersions[0], selectedVersions[1]);
      setCompareDialogOpen(false);
      setSelectedVersions([null, null]);
    }
  };

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

  if (versions.length === 0) {
    return (
      <Box p={3}>
        <Typography variant="body2" color="text.secondary" align="center">
          Noch keine Versionen vorhanden
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <History />
          <Typography variant="h6">Versions-Historie</Typography>
          <Chip label={`${versions.length} Version${versions.length !== 1 ? 'en' : ''}`} size="small" />
        </Stack>

        <List>
          {versions.map((version, index) => (
            <React.Fragment key={version._id}>
              <ListItem
                sx={{
                  bgcolor: index === 0 ? 'action.selected' : 'transparent',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" fontWeight="bold">
                        Version {version.versionNumber}
                      </Typography>
                      <Chip
                        label={getStatusLabel(version.versionStatus)}
                        color={getStatusColor(version.versionStatus) as any}
                        size="small"
                        icon={
                          version.versionStatus === 'released' ? (
                            <CheckCircle fontSize="small" />
                          ) : version.versionStatus === 'withdrawn' ? (
                            <Cancel fontSize="small" />
                          ) : (
                            <Schedule fontSize="small" />
                          )
                        }
                      />
                    </Stack>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Stack direction="row" spacing={2} flexWrap="wrap">
                        <Typography variant="caption" color="text.secondary">
                          <Schedule fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                          {format(new Date(version.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </Typography>
                        {version.createdBy && (
                          <Typography variant="caption" color="text.secondary">
                            <Person fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                            {version.createdBy.firstName} {version.createdBy.lastName}
                          </Typography>
                        )}
                        {version.releasedAt && (
                          <Typography variant="caption" color="success.main">
                            <CheckCircle fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                            Freigegeben: {format(new Date(version.releasedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                          </Typography>
                        )}
                      </Stack>
                      {version.changeReason && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          Grund: {version.changeReason}
                        </Typography>
                      )}
                      {version.changesFromPreviousVersion?.summary && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {version.changesFromPreviousVersion.summary}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Version anzeigen">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => onViewVersion?.(version)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Zum Vergleich auswählen">
                      <IconButton
                        edge="end"
                        size="small"
                        color={selectedVersions.includes(version.versionNumber) ? 'primary' : 'default'}
                        onClick={() => handleVersionSelect(version.versionNumber)}
                      >
                        <CompareArrows />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </ListItemSecondaryAction>
              </ListItem>
              {index < versions.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>

        {selectedVersions[0] && selectedVersions[1] && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.selected', borderRadius: 1 }}>
            <Typography variant="body2" gutterBottom>
              Vergleich ausgewählt: {selectedVersions[0]} ↔ {selectedVersions[1]}
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<CompareArrows />}
              onClick={handleCompare}
              sx={{ mt: 1 }}
            >
              Versionen vergleichen
            </Button>
          </Box>
        )}
      </Paper>

      <Dialog open={compareDialogOpen} onClose={() => setCompareDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Versionen vergleichen</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Möchten Sie Version <strong>{selectedVersions[0]}</strong> mit Version <strong>{selectedVersions[1]}</strong> vergleichen?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleCompare} variant="contained" startIcon={<CompareArrows />}>
            Vergleichen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DocumentVersionHistory;

