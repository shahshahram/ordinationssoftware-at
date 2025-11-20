import React from 'react';
import { Alert, AlertTitle, Box, Typography, Button, Stack } from '@mui/material';
import { Warning, Edit, History } from '@mui/icons-material';

interface DocumentStatusWarningProps {
  document: {
    status?: string;
    isReleased?: boolean;
    currentVersion?: {
      versionNumber?: string;
    };
    requiresNewVersion?: () => boolean;
  };
  onCreateNewVersion?: () => void;
  onViewHistory?: () => void;
}

const DocumentStatusWarning: React.FC<DocumentStatusWarningProps> = ({
  document,
  onCreateNewVersion,
  onViewHistory
}) => {
  if (!document) return null;

  const isReleased = document.isReleased && document.status === 'released';
  const isUnderReview = document.status === 'under_review';
  const requiresNewVersion = document.requiresNewVersion?.() || isReleased;

  if (!isReleased && !isUnderReview) {
    return null;
  }

  if (isReleased) {
    return (
      <Alert 
        severity="warning" 
        icon={<Warning />}
        sx={{ mb: 2 }}
        action={
          <Stack direction="row" spacing={1}>
            {onViewHistory && (
              <Button
                color="inherit"
                size="small"
                startIcon={<History />}
                onClick={onViewHistory}
              >
                Historie
              </Button>
            )}
            {onCreateNewVersion && (
              <Button
                color="inherit"
                size="small"
                startIcon={<Edit />}
                onClick={onCreateNewVersion}
              >
                Neue Version
              </Button>
            )}
          </Stack>
        }
      >
        <AlertTitle>Dokument ist freigegeben</AlertTitle>
        <Typography variant="body2">
          Dieses Dokument ist freigegeben (Version {document.currentVersion?.versionNumber || 'N/A'}) und kann nicht direkt bearbeitet werden.
          {requiresNewVersion && ' Um Änderungen vorzunehmen, muss eine neue Version erstellt werden.'}
        </Typography>
      </Alert>
    );
  }

  if (isUnderReview) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        <AlertTitle>Dokument in Prüfung</AlertTitle>
        <Typography variant="body2">
          Dieses Dokument befindet sich aktuell in Prüfung und kann nicht bearbeitet werden.
        </Typography>
      </Alert>
    );
  }

  return null;
};

export default DocumentStatusWarning;

