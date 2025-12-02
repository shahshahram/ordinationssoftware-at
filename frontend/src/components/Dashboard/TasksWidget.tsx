import React, { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, ListItemIcon, Checkbox, useMediaQuery, useTheme, Chip, Fab } from '@mui/material';
import { DashboardWidget } from '../../store/slices/dashboardWidgetsSlice';
import { CheckCircle, RadioButtonUnchecked, Add } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchTasks, updateTask, Task } from '../../store/slices/tasksSlice';
import CreateTaskDialog from '../Tasks/CreateTaskDialog';

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
  const dispatch = useAppDispatch();
  const { tasks, loading } = useAppSelector((state) => state.tasks);
  const { user } = useAppSelector((state) => state.auth);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Prüfe ob Benutzer Mediziner ist
  const isMedicalStaff = user?.role === 'arzt' || user?.role === 'admin' || user?.role === 'super_admin';
  
  // Lade Aufgaben beim Mount
  useEffect(() => {
    dispatch(fetchTasks({ status: 'pending' }));
  }, [dispatch]);

  // Verwende echte Daten wenn verfügbar, sonst Mock-Daten
  const items = tasks.length > 0 
    ? tasks.map((task: Task) => ({
        id: task._id,
        title: task.title,
        description: task.description,
        completed: task.status === 'completed',
        dueDate: task.dueDate,
        priority: task.priority,
        task: task // Speichere vollständiges Task-Objekt
      }))
    : (data || widget.config?.items || []);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const handleToggleComplete = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.task) {
      const newStatus = item.completed ? 'pending' : 'completed';
      await dispatch(updateTask({ 
        taskId: item.id, 
        data: { status: newStatus } 
      }));
      // Lade Aufgaben neu
      dispatch(fetchTasks({ status: 'pending' }));
    }
  };

  const handleCreateTaskSuccess = () => {
    dispatch(fetchTasks({ status: 'pending' }));
  };


  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: { xs: 1.5, sm: 2 }, position: 'relative' }}>
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
                  opacity: item.completed ? 0.6 : 1
                }}
              >
                <ListItemIcon sx={{ minWidth: { xs: 32, sm: 40 } }}>
                  <Checkbox
                    checked={item.completed}
                    icon={<RadioButtonUnchecked />}
                    checkedIcon={<CheckCircle />}
                    size="small"
                    onChange={(e) => handleToggleComplete(item, e as any)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={!item.task || loading}
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
                  <Chip
                    label={item.priority === 'urgent' ? 'Dringend' : item.priority === 'high' ? 'Hoch' : item.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                    size="small"
                    color={getPriorityColor(item.priority) as any}
                    sx={{ ml: 1 }}
                  />
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Box>
      
      {/* FAB für neue Aufgabe (nur für Mediziner) */}
      {isMedicalStaff && (
        <Fab
          color="primary"
          size="small"
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16
          }}
        >
          <Add />
        </Fab>
      )}

      {/* Dialog zum Erstellen von Aufgaben */}
      <CreateTaskDialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          handleCreateTaskSuccess();
        }}
      />
    </Box>
  );
};

export default TasksWidget;

