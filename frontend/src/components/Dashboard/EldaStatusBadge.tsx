import React from 'react';
import { Box, Typography } from '@mui/material';

export interface EldaStatusBadgeProps {
  status: string;
  errorCode?: string | null;
}

const STATUS_CONFIG: Record<string, { color: string; text: string }> = {
  '000': { color: '#22c55e', text: 'Erfolgreich übermittelt' },
  E1: { color: '#ef4444', text: 'Fehler: Arzt/Fachgebiet ungültig' },
  WA001: { color: '#eab308', text: 'Strukturfehler (SIT)' },
  pending: { color: '#60a5fa', text: 'Wird übertragen...' },
  SYNCED: { color: '#22c55e', text: 'Erfolgreich übermittelt' },
  ERROR: { color: '#ef4444', text: 'Fehler bei Übermittlung' }
};

const EldaStatusBadge: React.FC<EldaStatusBadgeProps> = ({ status, errorCode }) => {
  const config = STATUS_CONFIG[status] ?? { color: '#9ca3af', text: 'Unbekannter Status' };

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 12px',
        borderRadius: 1,
        backgroundColor: config.color,
        color: '#fff'
      }}
      role="status"
      aria-label={`ELDA-Status: ${config.text}${errorCode ? ` (${errorCode})` : ''}`}
    >
      <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
        {config.text}
      </Typography>
      {errorCode && (
        <Typography component="span" variant="caption" sx={{ ml: 1, opacity: 0.95 }}>
          ({errorCode})
        </Typography>
      )}
    </Box>
  );
};

export default EldaStatusBadge;
