import React from 'react';
import { Box, Typography } from '@mui/material';
import EldaStatusBadge from './EldaStatusBadge';
import EldaMaintenanceAlert from './EldaMaintenanceAlert';

interface EldaStatusWidgetProps {
  widget: { title?: string; config?: { status?: string; errorCode?: string } };
  data?: { status?: string; errorCode?: string };
  noWrapper?: boolean;
}

const EldaStatusWidget: React.FC<EldaStatusWidgetProps> = ({ widget, data, noWrapper = false }) => {
  const status = data?.status ?? widget.config?.status ?? 'pending';
  const errorCode = data?.errorCode ?? widget.config?.errorCode ?? null;

  return (
    <Box
      sx={{
        minHeight: noWrapper ? 0 : '100%',
        height: noWrapper ? '100%' : 'auto',
        width: noWrapper ? '100%' : undefined,
        display: 'flex',
        flexDirection: 'column',
        p: noWrapper ? 0 : { xs: 1.5, sm: 2 },
        flex: noWrapper ? 1 : undefined,
        overflow: noWrapper ? 'hidden' : undefined,
      }}
    >
      {!noWrapper && (
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {widget.title ?? 'ELDA/WAHonline Status'}
        </Typography>
      )}
      <EldaMaintenanceAlert />
      <Box sx={{ mt: 1 }}>
        <EldaStatusBadge status={status} errorCode={errorCode} />
      </Box>
    </Box>
  );
};

export default EldaStatusWidget;
