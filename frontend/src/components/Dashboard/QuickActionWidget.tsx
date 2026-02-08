import React from 'react';
import { Box, Typography, Button, useMediaQuery, useTheme } from '@mui/material';
import { DashboardWidget } from '../../store/slices/dashboardWidgetsSlice';

interface QuickActionWidgetProps {
  widget: DashboardWidget;
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'contained' | 'outlined' | 'text';
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  }>;
  noWrapper?: boolean;
}

const QuickActionWidget: React.FC<QuickActionWidgetProps> = ({ widget, actions, noWrapper = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const items = actions || widget.config?.actions || [];

  return (
    <Box sx={{ 
      minHeight: noWrapper ? 0 : '100%',
      height: noWrapper ? '100%' : 'auto',
      width: noWrapper ? '100%' : undefined,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: noWrapper ? 'center' : undefined,
      p: noWrapper ? 2 : { xs: 1.5, sm: 3 },
      flex: noWrapper ? 1 : undefined,
      overflow: noWrapper ? 'hidden' : undefined,
      bgcolor: noWrapper ? 'transparent' : undefined,
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
        gap: { xs: 1, sm: 1.5 }, 
        justifyContent: 'center',
        flex: items.length === 0 ? 'none' : 1
      }}>
        {items.map((action: any, index: number) => (
          <Button
            key={index}
            variant={action.variant || 'outlined'}
            color={action.color || 'primary'}
            startIcon={action.icon}
            onClick={action.onClick}
            fullWidth
            size={isMobile ? 'medium' : 'large'}
            sx={{ 
              py: { xs: 1.25, sm: 1.5 },
              minHeight: { xs: '44px', sm: 'auto' },
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            {action.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default QuickActionWidget;

