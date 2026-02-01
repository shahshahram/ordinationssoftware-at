import React from 'react';
import { Box, Paper, IconButton, Tooltip, Typography, useTheme, useMediaQuery } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { DashboardWidget } from '../../store/slices/dashboardWidgetsSlice';
import StatisticWidget from './StatisticWidget';
import ListWidget from './ListWidget';
import StatusWidget from './StatusWidget';
import QuickActionWidget from './QuickActionWidget';
import ChartWidget from './ChartWidget';
import CalendarWidget from './CalendarWidget';
import QueueWidget from './QueueWidget';
import TasksWidget from './TasksWidget';
import MessagesWidget from './MessagesWidget';
import OGKStatusWidget from './OGKStatusWidget';
import EldaStatusWidget from './EldaStatusWidget';

interface WidgetRendererProps {
  widget: DashboardWidget;
  onEdit?: (widget: DashboardWidget) => void;
  onDelete?: (widget: DashboardWidget) => void;
  data?: any;
  isEditMode?: boolean;
  onMessageClick?: (message: any) => void;
}

const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  onEdit,
  onDelete,
  data,
  isEditMode = false,
  onMessageClick
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const renderWidget = () => {
    switch (widget.widgetType) {
      case 'statistic':
        return <StatisticWidget widget={widget} data={data} />;
      case 'list':
        return <ListWidget widget={widget} data={data} />;
      case 'status':
        return <StatusWidget widget={widget} data={data} />;
      case 'quick-action':
        return <QuickActionWidget widget={widget} actions={data} />;
      case 'chart':
        return <ChartWidget widget={widget} data={data} />;
      case 'messages':
        return <MessagesWidget widget={widget} onMessageClick={onMessageClick || data?.onMessageClick} />;
      case 'custom':
        // Check for special widget IDs
        if (widget.widgetId === 'calendar-week') {
          return <CalendarWidget widget={widget} data={data} />;
        }
        if (widget.widgetId === 'queue' || widget.widgetId === 'waiting-room') {
          return <QueueWidget widget={widget} data={data} />;
        }
        if (widget.widgetId === 'tasks' || widget.widgetId === 'todos') {
          return <TasksWidget widget={widget} data={data} />;
        }
        if (widget.widgetId === 'reimbursements') {
          const ReimbursementsWidget = require('./ReimbursementsWidget').default;
          return <ReimbursementsWidget widget={widget} data={data} />;
        }
        if (widget.widgetId === 'ogk-status') {
          return <OGKStatusWidget widget={widget} data={data} />;
        }
        if (widget.widgetId === 'elda-status') {
          return <EldaStatusWidget widget={widget} data={data} />;
        }
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Custom Widget: {widget.title}
            </Typography>
          </Box>
        );
      default:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Unbekannter Widget-Typ: {widget.widgetType}
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        minHeight: '100%',
        height: 'auto',
        width: '100%',
        maxWidth: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: { xs: 1, sm: 2 },
        transition: 'all 0.2s ease-in-out',
        boxSizing: 'border-box',
        '&:hover': isEditMode ? {
          boxShadow: 6,
          transform: 'translateY(-2px)',
          '& .widget-actions': {
            opacity: 1
          }
        } : {
          boxShadow: 2,
          '&:hover': {
            boxShadow: 4
          }
        }
      }}
    >
      {isEditMode && (onEdit || onDelete) && (
        <Box
          className="widget-actions"
          sx={{
            position: 'absolute',
            top: { xs: 4, sm: 8 },
            right: { xs: 4, sm: 8 },
            zIndex: 10,
            opacity: isMobile ? 1 : 0,
            transition: 'opacity 0.2s',
            display: 'flex',
            gap: { xs: 0.5, sm: 0.5 },
            bgcolor: 'background.paper',
            borderRadius: 1,
            p: { xs: 0.5, sm: 0.5 },
            boxShadow: 2
          }}
        >
          {onEdit && (
            <Tooltip title="Bearbeiten">
              <IconButton 
                size="small" 
                onClick={() => onEdit(widget)}
                sx={{ 
                  minWidth: { xs: '44px', sm: 'auto' },
                  minHeight: { xs: '44px', sm: 'auto' }
                }}
              >
                <Edit fontSize={isMobile ? 'medium' : 'small'} />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Löschen">
              <IconButton 
                size="small" 
                color="error" 
                onClick={() => onDelete(widget)}
                sx={{ 
                  minWidth: { xs: '44px', sm: 'auto' },
                  minHeight: { xs: '44px', sm: 'auto' }
                }}
              >
                <Delete fontSize={isMobile ? 'medium' : 'small'} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
      {renderWidget()}
    </Paper>
  );
};

export default WidgetRenderer;

