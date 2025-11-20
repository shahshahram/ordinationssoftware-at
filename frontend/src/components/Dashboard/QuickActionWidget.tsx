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
}

const QuickActionWidget: React.FC<QuickActionWidgetProps> = ({ widget, actions }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const items = actions || widget.config?.actions || [];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: { xs: 2, sm: 3 } }}>
      <Typography 
        variant={isMobile ? 'subtitle1' : 'h6'} 
        gutterBottom 
        sx={{ fontWeight: 600, mb: { xs: 1.5, sm: 2 } }}
      >
        {widget.title}
      </Typography>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: { xs: 1, sm: 1.5 }, justifyContent: 'center' }}>
        {items.map((action: any, index: number) => (
          <Button
            key={index}
            variant={action.variant || 'outlined'}
            color={action.color || 'primary'}
            startIcon={action.icon}
            onClick={action.onClick}
            fullWidth
            size={isMobile ? 'medium' : 'large'}
            sx={{ py: { xs: 1, sm: 1.5 } }}
          >
            {action.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default QuickActionWidget;

