import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, ListItemIcon, Checkbox, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { DashboardWidget } from '../../store/slices/dashboardWidgetsSlice';
import { CheckCircle, RadioButtonUnchecked, Delete } from '@mui/icons-material';

interface TasksWidgetProps {
  widget: DashboardWidget;
  data?: Array<{
    id: string;
    title: string;
    description?: string;
    completed: boolean;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
  }>;
}

const TasksWidget: React.FC<TasksWidgetProps> = ({ widget, data }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const items = data || widget.config?.items || [];

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
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
              Keine Aufgaben
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {items.map((item: any, index: number) => (
              <ListItem 
                key={item.id || index} 
                divider={index < items.length - 1}
                sx={{ 
                  py: { xs: 0.5, sm: 1 },
                  px: { xs: 0.5, sm: 1 },
                  opacity: item.completed ? 0.6 : 1,
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderRadius: 1
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: { xs: 32, sm: 40 } }}>
                  <Checkbox
                    checked={item.completed}
                    icon={<RadioButtonUnchecked />}
                    checkedIcon={<CheckCircle />}
                    size="small"
                  />
                </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    secondary={
                      <>
                        {item.description && (
                          <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
                            {item.description}
                          </Typography>
                        )}
                        {item.dueDate && (
                          <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block', mt: 0.5 }}>
                            Fällig: {new Date(item.dueDate).toLocaleDateString('de-DE')}
                          </Typography>
                        )}
                      </>
                    }
                  primaryTypographyProps={{ 
                    variant: isMobile ? 'body2' : 'body1',
                    sx: {
                      textDecoration: item.completed ? 'line-through' : 'none',
                      fontWeight: item.priority === 'high' ? 600 : 400
                    }
                  }}
                />
                {item.priority && (
                  <Box
                    sx={{
                      width: 4,
                      height: 40,
                      bgcolor: `${getPriorityColor(item.priority)}.main`,
                      borderRadius: 1,
                      mr: 1
                    }}
                  />
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default TasksWidget;

