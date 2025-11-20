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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import { LocationWeeklyScheduleData, LocationDaySchedule } from '../store/slices/locationWeeklyScheduleSlice';

interface Location {
  _id: string;
  name: string;
  code?: string;
  color_hex?: string;
}

interface LocationWeeklyScheduleProps {
  locationId?: string;
  locationName?: string;
  locations?: Location[];
  onSave: (schedule: LocationWeeklyScheduleData) => void;
  onCancel: () => void;
  initialData?: LocationWeeklyScheduleData;
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

const LocationWeeklySchedule: React.FC<LocationWeeklyScheduleProps> = ({
  locationId,
  locationName,
  locations = [],
  onSave,
  onCancel,
  initialData,
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string>(locationId || '');
  const [selectedLocationName, setSelectedLocationName] = useState<string>(locationName || '');

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

  const [schedules, setSchedules] = useState<LocationDaySchedule[]>(() => {
    if (initialData?.schedules) {
      return initialData.schedules;
    }
    return DAYS.map(day => ({
      day: day.key,
      isOpen: day.key !== 'saturday' && day.key !== 'sunday',
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
        ? { ...schedule, isOpen: !schedule.isOpen }
        : schedule
    ));
  };

  const handleTimeChange = (dayKey: string, field: keyof LocationDaySchedule, value: string) => {
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

  const handleLocationChange = (locationId: string) => {
    const location = locations.find(l => l._id === locationId);
    if (location) {
      setSelectedLocationId(locationId);
      setSelectedLocationName(location.name);
    }
  };

  const handleSave = () => {
    if (!selectedLocationId) {
      setSnackbar({ open: true, message: 'Bitte wählen Sie einen Standort aus', severity: 'error' });
      return;
    }

    try {
      const scheduleData: LocationWeeklyScheduleData = {
        locationId: selectedLocationId,
        schedules,
        validFrom,
        validTo: validTo || undefined,
      };
      onSave(scheduleData);
      setSnackbar({ open: true, message: 'Wiederkehrende Öffnungszeiten erfolgreich gespeichert', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Fehler beim Speichern der Öffnungszeiten', severity: 'error' });
    }
  };

  const handleCopyToAll = () => {
    const firstOpenDay = schedules.find(s => s.isOpen);
    if (firstOpenDay) {
      setSchedules(prev => prev.map(schedule => ({
        ...schedule,
        startTime: firstOpenDay.startTime,
        endTime: firstOpenDay.endTime,
        breakStart: firstOpenDay.breakStart,
        breakEnd: firstOpenDay.breakEnd,
        label: firstOpenDay.label,
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
              Wiederkehrende Öffnungszeiten {selectedLocationName ? `für ${selectedLocationName}` : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCopyToAll}
                disabled={!schedules.some(s => s.isOpen)}
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
          {locations.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Standort auswählen</InputLabel>
                <Select
                  value={selectedLocationId}
                  label="Standort auswählen"
                  onChange={(e) => handleLocationChange(e.target.value as string)}
                >
                  {locations.map((location) => (
                    <MenuItem key={location._id} value={location._id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: location.color_hex || '#2563EB',
                            mr: 1
                          }}
                        />
                        {location.name}{location.code ? ` (${location.code})` : ''}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

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
                            checked={schedule.isOpen}
                            onChange={() => handleDayToggle(day.key)}
                          />
                        }
                        label={
                          <Typography variant="subtitle1" fontWeight="bold">
                            {day.label}
                          </Typography>
                        }
                      />
                      {schedule.isOpen && (
                        <Chip
                          label="Geöffnet"
                          color="primary"
                          size="small"
                        />
                      )}
                    </Box>

                    {schedule.isOpen && (
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
                        <Box>
                          <TextField
                            fullWidth
                            label="Öffnungszeit"
                            type="time"
                            value={schedule.startTime}
                            onChange={(e) => handleTimeChange(day.key, 'startTime', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Box>
                        <Box>
                          <TextField
                            fullWidth
                            label="Schließzeit"
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
                            placeholder="z.B. Standard, Notdienst, etc."
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
            disabled={!schedules.some(s => s.isOpen)}
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

export default LocationWeeklySchedule;
