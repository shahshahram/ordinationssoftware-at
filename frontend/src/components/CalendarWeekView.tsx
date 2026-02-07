import React from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  CalendarToday
} from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday, getDay, isPast, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';

interface CalendarWeekViewProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date, time: string) => void;
  availableSlots: { [date: string]: string[] }; // { "2025-12-22": ["10:00", "11:15", ...] }
  currentWeek: Date;
  onWeekChange: (date: Date) => void;
  doctorName?: string;
}

const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  selectedDate,
  onDateSelect,
  availableSlots,
  currentWeek,
  onWeekChange,
  doctorName
}) => {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Montag
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Hilfsfunktion: Hole Slots für ein Datum
  const getSlotsForDate = (date: Date): string[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availableSlots[dateStr] || [];
  };

  // Sammle alle verfügbaren Zeit-Slots aus allen Tagen
  const allAvailableSlots = new Set<string>();
  weekDays.forEach(day => {
    const slots = getSlotsForDate(day);
    slots.forEach(slot => allAvailableSlots.add(slot));
  });
  
  // Sortiere die Slots chronologisch
  const timeSlots = Array.from(allAvailableSlots).sort((a, b) => {
    const [hourA, minuteA] = a.split(':').map(Number);
    const [hourB, minuteB] = b.split(':').map(Number);
    if (hourA !== hourB) return hourA - hourB;
    return minuteA - minuteB;
  });

  const handlePreviousWeek = () => {
    onWeekChange(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    onWeekChange(addWeeks(currentWeek, 1));
  };

  const handleToday = () => {
    onWeekChange(new Date());
  };

  const isSlotAvailable = (date: Date, _time: string): boolean => {
    const slots = getSlotsForDate(date);
    return slots.includes(_time);
  };

  const isSlotSelected = (date: Date, _time: string): boolean => {
    if (!selectedDate) return false;
    const dateStr = format(date, 'yyyy-MM-dd');
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    // Prüfe ob Zeit-Slot ausgewählt ist (vereinfacht - könnte erweitert werden)
    return dateStr === selectedDateStr;
  };

  const isFullHour = (time: string): boolean => {
    return time.endsWith(':00');
  };

  const getDayLabel = (date: Date): string => {
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const dayIndex = getDay(date);
    return dayNames[dayIndex];
  };

  return (
    <Paper sx={{ p: 2, bgcolor: '#fef5f5' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          {format(weekStart, 'dd.MM', { locale: de })} - {format(weekEnd, 'dd.MM.yyyy', { locale: de })}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton size="small" onClick={handlePreviousWeek}>
            <ChevronLeft />
          </IconButton>
          <IconButton size="small" onClick={handleToday}>
            <CalendarToday fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleNextWeek}>
            <ChevronRight />
          </IconButton>
        </Box>
      </Box>

      {/* Kalender-Grid */}
      <Box sx={{ bgcolor: 'white', borderRadius: 1, overflow: 'hidden' }}>
        <Grid container>
          {/* Zeit-Spalte – breit genug für "08:00" */}
          <Grid size={{ xs: 2.5 }} sx={{ borderRight: '1px solid #e0e0e0', minWidth: 56 }}>
            <Box
              sx={{
                height: 60,
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#fafafa'
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Zeit
              </Typography>
            </Box>
            {timeSlots.map((time, index) => (
              <Box
                key={time}
                sx={{
                  height: 30,
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  pr: 1,
                  borderRight: index % 4 === 0 ? '1px solid #e0e0e0' : 'none'
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={isFullHour(time) ? 'bold' : 'normal'}
                  color="text.secondary"
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {time}
                </Typography>
              </Box>
            ))}
          </Grid>

          {/* Tages-Spalten */}
          {weekDays.map((day, dayIndex) => {
            const daySlots = getSlotsForDate(day);
            const isCurrentDay = isToday(day);
            const dayLabel = getDayLabel(day);
            const hasAvailableSlots = daySlots.length > 0;
            const isPastDate = isPast(startOfDay(day)) && !isCurrentDay;

            return (
              <Grid
                size={{ xs: 1.5 }}
                key={format(day, 'yyyy-MM-dd')}
                sx={{
                  borderRight: dayIndex < weekDays.length - 1 ? '1px solid #e0e0e0' : 'none',
                  opacity: hasAvailableSlots && !isPastDate ? 1 : 0.3,
                  minWidth: 48
                }}
              >
                {/* Tages-Header */}
                <Box
                  sx={{
                    height: 60,
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isCurrentDay ? '#fff3e0' : (hasAvailableSlots ? '#fafafa' : '#f5f5f5'),
                    border: isCurrentDay ? '2px solid #ff9800' : 'none'
                  }}
                >
                  <Typography variant="body2" fontWeight="bold" color={hasAvailableSlots ? 'text.primary' : 'text.disabled'}>
                    {dayLabel}
                  </Typography>
                  <Typography variant="caption" color={hasAvailableSlots ? 'text.secondary' : 'text.disabled'}>
                    {format(day, 'dd.MM.')}
                  </Typography>
                  {!hasAvailableSlots && (
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', mt: 0.25 }}>
                      —
                    </Typography>
                  )}
                </Box>

                {/* Zeit-Slots für diesen Tag */}
                {(timeSlots.map((time) => {
                  const slotAvailable = isSlotAvailable(day, time);
                  const slotSelected = isSlotSelected(day, time);
                  const _isHour = isFullHour(time);

                  // Prüfe ob es einen Termin-Block gibt, der hier startet
                  const hasAppointment = daySlots.some(slot => {
                    const [slotHour, slotMin] = slot.split(':').map(Number);
                    const [timeHour, timeMin] = time.split(':').map(Number);
                    return slotHour === timeHour && slotMin === timeMin;
                  });

                  return (
                    <Box
                      key={time}
                      sx={{
                        height: 30,
                        borderBottom: '1px solid #f0f0f0',
                        position: 'relative',
                        cursor: slotAvailable ? 'pointer' : 'default',
                        bgcolor: slotSelected ? '#e3f2fd' : 'transparent',
                        '&:hover': slotAvailable ? {
                          bgcolor: '#f5f5f5'
                        } : {}
                      }}
                      onClick={() => {
                        if (slotAvailable && !isPastDate) {
                          onDateSelect(day, time);
                        }
                      }}
                    >
                      {hasAppointment && slotAvailable && (
                        <Tooltip title={`Verfügbar: ${time}`}>
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 2,
                              left: 2,
                              right: 2,
                              bottom: 2,
                              bgcolor: 'white',
                              border: '1px solid #d7ccc8',
                              borderRadius: 0.5,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 1
                            }}
                          >
                            <Typography variant="caption" fontSize="0.65rem">
                              {time}
                            </Typography>
                          </Box>
                        </Tooltip>
                      )}
                    </Box>
                  );
                }))}
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Footer */}
      {doctorName && (
        <Box sx={{ mt: 2, textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary">
            Mitarbeiter: {doctorName}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default CalendarWeekView;

