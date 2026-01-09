import React from 'react';
import { Box, Typography, Avatar, useMediaQuery, useTheme } from '@mui/material';
import { DashboardWidget } from '../../store/slices/dashboardWidgetsSlice';

interface StatisticWidgetProps {
  widget: DashboardWidget;
  data?: {
    value: string | number;
    icon?: React.ReactNode;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    onClick?: () => void;
  };
}

const StatisticWidget: React.FC<StatisticWidgetProps> = ({ widget, data }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const color = data?.color || 'primary';
  const value = data?.value || widget.config?.value || '0';
  const icon = data?.icon || widget.config?.icon;

  const handleClick = () => {
    if (data?.onClick) {
      data.onClick();
    }
  };

  return (
    <Box 
      onClick={data?.onClick ? handleClick : undefined}
      sx={{ 
        minHeight: '100%',
        height: 'auto',
        p: { xs: 1.5, sm: 3 }, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center',
        cursor: data?.onClick ? 'pointer' : 'default',
        '&:hover': data?.onClick ? {
          bgcolor: 'action.hover',
          transition: 'background-color 0.2s'
        } : {}
      }}
    >
      <Box 
        display="flex" 
        alignItems="center"
        justifyContent="space-between" 
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

