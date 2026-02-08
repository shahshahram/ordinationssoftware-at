import React from 'react';
import { Box, Typography, LinearProgress, useMediaQuery, useTheme } from '@mui/material';
import { DashboardWidget } from '../../store/slices/dashboardWidgetsSlice';

interface StatusWidgetProps {
  widget: DashboardWidget;
  data?: Array<{
    label: string;
    status: string;
    value: number;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  }>;
  noWrapper?: boolean;
}

const StatusWidget: React.FC<StatusWidgetProps> = ({ widget, data, noWrapper = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const items = data || widget.config?.items || [];

  return (
    <Box sx={{ 
minHeight: noWrapper ? 0 : '100%',
      height: noWrapper ? '100%' : 'auto',
      width: noWrapper ? '100%' : undefined,
      display: 'flex',
      flexDirection: 'column',
      p: noWrapper ? 0 : { xs: 1.5, sm: 3 },
      flex: noWrapper ? 1 : undefined,
      overflow: noWrapper ? 'hidden' : undefined,
    }}>
      {!noWrapper && (
        <Typography 
          variant={isMobile ? 'subtitle1' : 'h6'} 
          gutterBottom 
          sx={{ fontWeight: 600, mb: { xs: 1, sm: 2 } }}
        >
          {widget.title}
        </Typography>
      )}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'flex-start', 
        gap: { xs: 1, sm: 1.5 },
        flex: items.length === 0 ? 'none' : 1
      }}>
        {items.map((item: any, index: number) => (
          <Box key={index}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant={isMobile ? 'caption' : 'body2'} sx={{ fontWeight: 500 }}>
                {item.label}
              </Typography>
              <Typography variant={isMobile ? 'caption' : 'body2'} color="text.secondary">
                {item.status}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={item.value}
              color={item.color || 'success'}
              sx={{ height: { xs: 6, sm: 8 }, borderRadius: 1 }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default StatusWidget;

