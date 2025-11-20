import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';

interface WeeklyScheduleProps {
  staffId: string;
  staffName: string;
  onSave: (schedule: WeeklyScheduleData) => void;
  onCancel: () => void;
  initialData?: WeeklyScheduleData;
}

export interface WeeklyScheduleData {
  _id?: string;
  staffId: string;
  schedules: DaySchedule[];
  validFrom?: Date;
  validTo?: Date;
}

export interface DaySchedule {
  day: string;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  label?: string;
}

const DAYS = [
  { key: 'monday', label: 'Montag' },
  { key: 'tuesday', label: 'Dienstag' },
  { key: 'wednesday', label: 'Mittwoch' },
  { key: 'thursday', label: 'Donnerstag' },
  { key: 'friday', label: 'Freitag' },
  { key: 'saturday', label: 'Samstag' },
  { key: 'sunday', label: 'Sonntag' },
];

const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({
  staffId,
  staffName,
  onSave,
  onCancel,
  initialData,
}) => {
  const [scheduleId, setScheduleId] = useState<string | null>(initialData?._id || null);
  const [validFrom, setValidFrom] = useState<Date>(() => {
    if (initialData?.validFrom) {
      return new Date(initialData.validFrom);
    }
    return new Date();
  });

  const [validTo, setValidTo] = useState<Date | null>(() => {
    if (initialData?.validTo) {
      return new Date(initialData.validTo);
    }
    return null;
  });

  const [schedules, setSchedules] = useState<DaySchedule[]>(() => {
    if (initialData?.schedules) {
      return initialData.schedules;
    }
    return DAYS.map(day => ({
      day: day.key,
      isWorking: day.key !== 'saturday' && day.key !== 'sunday',
      startTime: '08:00',
      endTime: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      label: '',
    }));
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  const handleDayToggle = (dayKey: string) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.day === dayKey 
        ? { ...schedule, isWorking: !schedule.isWorking }
        : schedule
    ));
  };

  const handleTimeChange = (dayKey: string, field: keyof DaySchedule, value: string) => {
    setSchedules(prev => prev.map(schedule => {
      if (schedule.day === dayKey) {
        const updatedSchedule = { ...schedule, [field]: value };
        
        // Wenn Pausen-Felder geleert werden, entferne sie komplett
        if (field === 'breakStart' && value === '') {
          delete updatedSchedule.breakStart;
        }
        if (field === 'breakEnd' && value === '') {
          delete updatedSchedule.breakEnd;
        }
        
        return updatedSchedule;
      }
      return schedule;
    }));
  };

  const handleSave = () => {
    try {
      const scheduleData: WeeklyScheduleData = {
        staffId,
        schedules,
        validFrom,
        validTo: validTo || undefined,
        _id: scheduleId || undefined,
      };
      onSave(scheduleData);
      setSnackbar({ open: true, message: scheduleId ? 'Wiederkehrende Arbeitszeiten erfolgreich aktualisiert' : 'Wiederkehrende Arbeitszeiten erfolgreich gespeichert', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Fehler beim Speichern der Arbeitszeiten', severity: 'error' });
    }
  };

  const handleCopyToAll = () => {
    const firstWorkingDay = schedules.find(s => s.isWorking);
    if (firstWorkingDay) {
      setSchedules(prev => prev.map(schedule => ({
        ...schedule,
        startTime: firstWorkingDay.startTime,
        endTime: firstWorkingDay.endTime,
        breakStart: firstWorkingDay.breakStart,
        breakEnd: firstWorkingDay.breakEnd,
        label: firstWorkingDay.label,
      })));
    }
  };

  const handleRemoveAllBreaks = () => {
    setSchedules(prev => prev.map(schedule => {
      const updatedSchedule = { ...schedule };
      delete updatedSchedule.breakStart;
      delete updatedSchedule.breakEnd;
      return updatedSchedule;
    }));
  };

  const getValidityRange = () => {
    const from = validFrom.toLocaleDateString('de-DE');
    const to = validTo ? validTo.toLocaleDateString('de-DE') : 'unbegrenzt';
    return `Gültig von ${from} bis ${to}`;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
      <Dialog open={true} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Wiederkehrende Arbeitszeiten für {staffName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCopyToAll}
                disabled={!schedules.some(s => s.isWorking)}
              >
                Auf alle Tage kopieren
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleRemoveAllBreaks}
                disabled={!schedules.some(s => s.breakStart || s.breakEnd)}
                color="warning"
              >
                Alle Pausen entfernen
              </Button>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, alignItems: 'center' }}>
              <Box>
                <DatePicker
                  label="Gültig ab"
                  value={validFrom}
                  onChange={(newValue) => newValue && setValidFrom(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
              <Box>
                <DatePicker
                  label="Gültig bis (optional)"
                  value={validTo}
                  onChange={(newValue) => setValidTo(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
            </Box>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {getValidityRange()}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {DAYS.map((day) => {
              const schedule = schedules.find(s => s.day === day.key);
              if (!schedule) return null;

              return (
                <Card key={day.key} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={schedule.isWorking}
                            onChange={() => handleDayToggle(day.key)}
                          />
                        }
                        label={
                          <Typography variant="subtitle1" fontWeight="bold">
                            {day.label}
                          </Typography>
                        }
                      />
                      {schedule.isWorking && (
                        <Chip
                          label="Arbeitstag"
                          color="primary"
                          size="small"
                        />
                      )}
                    </Box>

                    {schedule.isWorking && (
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
                        <Box>
                          <TextField
                            fullWidth
                            label="Startzeit"
                            type="time"
                            value={schedule.startTime}
                            onChange={(e) => handleTimeChange(day.key, 'startTime', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Box>
                        <Box>
                          <TextField
                            fullWidth
                            label="Endzeit"
                            type="time"
                            value={schedule.endTime}
                            onChange={(e) => handleTimeChange(day.key, 'endTime', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Box>
                        <Box>
                          <TextField
                            fullWidth
                            label="Pause von"
                            type="time"
                            value={schedule.breakStart || ''}
                            onChange={(e) => handleTimeChange(day.key, 'breakStart', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Box>
                        <Box>
                          <TextField
                            fullWidth
                            label="Pause bis"
                            type="time"
                            value={schedule.breakEnd || ''}
                            onChange={(e) => handleTimeChange(day.key, 'breakEnd', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Box>
                        <Box sx={{ gridColumn: { xs: '1 / -1', sm: '1 / -1' } }}>
                          <TextField
                            fullWidth
                            label="Beschreibung (optional)"
                            value={schedule.label || ''}
                            onChange={(e) => handleTimeChange(day.key, 'label', e.target.value)}
                            placeholder="z.B. Frühschicht, Spätschicht"
                          />
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onCancel} startIcon={<CancelIcon />}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            startIcon={<SaveIcon />}
            disabled={!schedules.some(s => s.isWorking)}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </LocalizationProvider>
  );
};

export default WeeklySchedule;
