import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, ListItemIcon, Chip, useMediaQuery, useTheme, Button } from '@mui/material';
import { DashboardWidget } from '../../store/slices/dashboardWidgetsSlice';
import { AccessTime, Person } from '@mui/icons-material';

interface QueueWidgetProps {
  widget: DashboardWidget;
  data?: Array<{
    patient: string;
    time: string;
    type: string;
    waitingTime?: number;
    status: 'waiting' | 'in_progress' | 'next';
  }>;
}

const QueueWidget: React.FC<QueueWidgetProps> = ({ widget, data }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const items = data || widget.config?.items || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'next': return 'primary';
      case 'in_progress': return 'success';
      case 'waiting': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'next': return 'Als Nächstes';
      case 'in_progress': return 'In Behandlung';
      case 'waiting': return 'Wartend';
      default: return status;
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: { xs: 1.5, sm: 2 } }}>
      <Typography 
        variant={isMobile ? 'subtitle1' : 'h6'} 
        gutterBottom 
        sx={{ fontWeight: 600, mb: { xs: 1, sm: 1.5 } }}
      >
        {widget.title}
      </Typography>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Keine Patienten in der Warteschlange
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {items.map((item: any, index: number) => (
              <ListItem 
                key={index} 
                divider={index < items.length - 1}
                sx={{ 
                  py: { xs: 1, sm: 1.5 },
                  px: { xs: 0.5, sm: 1 },
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderRadius: 1
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: { xs: 32, sm: 40 } }}>
                  <Person color={item.status === 'next' ? 'primary' : 'action'} />
                </ListItemIcon>
                <ListItemText
                  primary={item.patient}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <AccessTime sx={{ fontSize: 14 }} />
                      <Typography variant="caption">{item.time}</Typography>
                      {item.type && (
                        <>
                          <Typography variant="caption"> • </Typography>
                          <Typography variant="caption">{item.type}</Typography>
                        </>
                      )}
                      {item.waitingTime && (
                        <>
                          <Typography variant="caption"> • </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.waitingTime} Min
                          </Typography>
                        </>
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{ 
                    variant: isMobile ? 'body2' : 'body1', 
                    fontWeight: item.status === 'next' ? 600 : 400
                  }}
                />
                <Chip
                  label={getStatusLabel(item.status)}
                  size="small"
                  color={getStatusColor(item.status) as any}
                  sx={{ ml: { xs: 0.5, sm: 1 } }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default QueueWidget;


