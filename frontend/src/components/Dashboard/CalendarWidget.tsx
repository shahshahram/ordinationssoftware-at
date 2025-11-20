import React from 'react';
import { Box, Typography, useMediaQuery, useTheme, Chip } from '@mui/material';
import { DashboardWidget } from '../../store/slices/dashboardWidgetsSlice';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';

interface CalendarWidgetProps {
  widget: DashboardWidget;
  data?: Array<{
    date: string;
    appointments: number;
    status?: 'normal' | 'busy' | 'full';
  }>;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ widget, data }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const today = new Date();
  const weekStart = startOfWeek(today, { locale: de, weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { locale: de, weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const appointmentsData = data || widget.config?.appointments || [];

  const getAppointmentsForDay = (date: Date) => {
    return appointmentsData.find((a: { date: string; appointments: number; status?: 'normal' | 'busy' | 'full' }) => isSameDay(new Date(a.date), date))?.appointments || 0;
  };

  const getStatusColor = (count: number) => {
    if (count === 0) return 'default';
    if (count < 5) return 'success';
    if (count < 10) return 'warning';
    return 'error';
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
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: { xs: 0.5, sm: 1 } }}>
        {weekDays.map((day, index) => {
          const count = getAppointmentsForDay(day);
          const isTodayDate = isToday(day);
          
          return (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: { xs: 0.75, sm: 1 },
                borderRadius: 1,
                bgcolor: isTodayDate ? 'action.selected' : 'transparent',
                border: isTodayDate ? `1px solid ${theme.palette.primary.main}` : 'none'
              }}
            >
              <Typography 
                variant={isMobile ? 'caption' : 'body2'}
                sx={{ 
                  fontWeight: isTodayDate ? 600 : 400,
                  minWidth: { xs: 60, sm: 80 }
                }}
              >
                {format(day, 'EEE', { locale: de })}
              </Typography>
              <Typography 
                variant={isMobile ? 'caption' : 'body2'}
                sx={{ 
                  fontWeight: isTodayDate ? 600 : 400,
                  minWidth: { xs: 30, sm: 40 },
                  textAlign: 'right'
                }}
              >
                {format(day, 'dd.MM', { locale: de })}
              </Typography>
              <Chip
                label={count}
                size="small"
                color={getStatusColor(count) as any}
                sx={{ minWidth: { xs: 40, sm: 50 } }}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default CalendarWidget;

