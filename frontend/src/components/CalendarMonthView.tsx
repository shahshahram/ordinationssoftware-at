import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Paper,
  Chip,
  Tooltip
} from '@mui/material';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay, addMonths, subMonths, isPast, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';

interface CalendarMonthViewProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  availableSlots: { [date: string]: string[] }; // { "2025-01-15": ["09:00", "10:30", ...] }
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  selectedDate,
  onDateSelect,
  availableSlots,
  currentMonth,
  onMonthChange
}) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Erste Woche: Finde den ersten Tag des Monats und fülle vorherige Tage
  const firstDayOfWeek = getDay(monthStart);
  const weekDays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  // Erstelle Array mit allen Tagen (inkl. Vormonat-Tage für erste Woche)
  const calendarDays: (Date | null)[] = [];
  
  // Fülle leere Tage am Anfang
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Füge alle Tage des Monats hinzu
  daysInMonth.forEach(day => {
    calendarDays.push(day);
  });

  const handlePreviousMonth = () => {
    onMonthChange(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(addMonths(currentMonth, 1));
  };

  const getSlotCount = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availableSlots[dateStr]?.length || 0;
  };

  const hasSlots = (date: Date): boolean => {
    return getSlotCount(date) > 0;
  };

  return (
    <Paper sx={{ p: 2 }}>
      {/* Monats-Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button onClick={handlePreviousMonth} size="small">
          ← Vorheriger Monat
        </Button>
        <Typography variant="h6" fontWeight="bold">
          {format(currentMonth, 'MMMM yyyy', { locale: de })}
        </Typography>
        <Button onClick={handleNextMonth} size="small">
          Nächster Monat →
        </Button>
      </Box>

      {/* Wochentage-Header */}
      <Grid container spacing={0.5} sx={{ mb: 1 }}>
        {weekDays.map((day, index) => (
          <Grid size={{ xs: 1 }} key={index}>
            <Typography
              variant="caption"
              align="center"
              fontWeight="bold"
              color="text.secondary"
              sx={{ py: 1 }}
            >
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Kalender-Grid */}
      <Grid container spacing={0.5}>
        {calendarDays.map((day, index) => {
          if (!day) {
            return <Grid size={{ xs: 1 }} key={`empty-${index}`} sx={{ aspectRatio: '1', p: 0.5 }} />;
          }

          const dateStr = format(day, 'yyyy-MM-dd');
          const slotCount = getSlotCount(day);
          const hasAvailableSlots = hasSlots(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);
          const isPastDate = isPast(startOfDay(day)) && !isCurrentDay;

          return (
            <Grid size={{ xs: 1 }} key={dateStr} sx={{ aspectRatio: '1', p: 0.5 }}>
              <Tooltip
                title={
                  hasAvailableSlots
                    ? `${slotCount} verfügbare Termin${slotCount !== 1 ? 'e' : ''}`
                    : 'Keine Termine verfügbar'
                }
              >
                <Button
                  fullWidth
                  variant={isSelected ? 'contained' : 'outlined'}
                  onClick={() => hasAvailableSlots && !isPastDate && onDateSelect(day)}
                  disabled={!hasAvailableSlots || isPastDate}
                  sx={{
                    height: '100%',
                    minWidth: 0,
                    flexDirection: 'column',
                    position: 'relative',
                    border: isCurrentDay ? 2 : 1,
                    borderColor: isCurrentDay ? 'primary.main' : 'divider',
                    '&:hover': {
                      bgcolor: hasAvailableSlots && !isPastDate ? 'action.hover' : 'transparent'
                    },
                    bgcolor: isSelected ? 'primary.main' : 'transparent',
                    color: isSelected ? 'primary.contrastText' : (isPastDate ? 'text.disabled' : 'text.primary'),
                    opacity: hasAvailableSlots && !isPastDate ? 1 : 0.3
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={isCurrentDay ? 'bold' : 'normal'}
                    sx={{ mb: 0.5 }}
                  >
                    {format(day, 'd')}
                  </Typography>
                  {hasAvailableSlots && (
                    <Chip
                      label={slotCount}
                      size="small"
                      color={isSelected ? 'default' : 'primary'}
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        '& .MuiChip-label': {
                          px: 0.5
                        }
                      }}
                    />
                  )}
                </Button>
              </Tooltip>
            </Grid>
          );
        })}
      </Grid>

      {/* Legende */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              border: 2,
              borderColor: 'primary.main',
              borderRadius: 1
            }}
          />
          <Typography variant="caption">Heute</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              bgcolor: 'primary.main',
              borderRadius: 1
            }}
          />
          <Typography variant="caption">Ausgewählt</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="5" size="small" color="primary" sx={{ height: 20 }} />
          <Typography variant="caption">Verfügbare Termine</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default CalendarMonthView;

