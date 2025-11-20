import React from 'react';
import { Box, Typography, Avatar, useMediaQuery, useTheme } from '@mui/material';
import { DashboardWidget } from '../../store/slices/dashboardWidgetsSlice';

interface StatisticWidgetProps {
  widget: DashboardWidget;
  data?: {
    value: string | number;
    icon?: React.ReactNode;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  };
}

const StatisticWidget: React.FC<StatisticWidgetProps> = ({ widget, data }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const color = data?.color || 'primary';
  const value = data?.value || widget.config?.value || '0';
  const icon = data?.icon || widget.config?.icon;

  return (
    <Box sx={{ 
      height: '100%', 
      p: { xs: 2, sm: 3 }, 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between' 
    }}>
      <Box 
        display="flex" 
        alignItems="flex-start" 
        justifyContent="space-between" 
        sx={{ flex: 1 }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={{ xs: 1, sm: 0 }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography 
            color="text.secondary" 
            gutterBottom 
            variant={isMobile ? 'caption' : 'body2'} 
            sx={{ fontWeight: 500, mb: 1 }}
          >
            {widget.title}
          </Typography>
          <Typography 
            variant={isMobile ? 'h4' : 'h3'} 
            component="div" 
            sx={{ fontWeight: 'bold', lineHeight: 1.2 }}
          >
            {value}
          </Typography>
        </Box>
        {icon && (
          <Avatar sx={{ 
            bgcolor: `${color}.main`, 
            width: { xs: 48, sm: 64 }, 
            height: { xs: 48, sm: 64 }, 
            ml: { xs: 0, sm: 2 },
            mt: { xs: 1, sm: 0 }
          }}>
            {icon}
          </Avatar>
        )}
      </Box>
    </Box>
  );
};

export default StatisticWidget;

