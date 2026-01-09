import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
// Entfernt DatePicker Imports - nicht mehr benötigt
import { de } from 'date-fns/locale';
import { format } from 'date-fns';

interface DaySchedule {
  day: string;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  label?: string;
}

interface WeeklySchedule {
  _id: string;
  staffId: {
    _id: string;
    displayName: string;
  };
  schedules: DaySchedule[];
  isActive: boolean;
  validFrom: string;
  validTo?: string;
  createdAt: string;
  updatedAt: string;
}

interface WeeklyScheduleOverviewProps {
  open: boolean;
  onClose: () => void;
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

interface StaffProfile {
  _id: string;
  display_name: string;
}

const WeeklyScheduleOverview: React.FC<WeeklyScheduleOverviewProps> = ({ open, onClose }) => {
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  // Entfernt selectedWeek - nicht mehr benötigt für wiederkehrende Vorlagen
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  const fetchStaffProfiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/staff-profiles', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Mitarbeiter');
      }

      const result = await response.json();
      setStaffProfiles(result.data || []);
    } catch (error) {
      console.error('Error fetching staff profiles:', error);
    }
  };

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (selectedStaff !== 'all') {
        params.append('staffId', selectedStaff);
      }
      
      // Entfernt weekStart Parameter - nicht mehr benötigt für wiederkehrende Vorlagen

      const response = await fetch(`http://localhost:5001/api/weekly-schedules?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Arbeitszeiten');
      }

      const result = await response.json();
      setSchedules(result.data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Arbeitszeiten',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [selectedStaff]);

  useEffect(() => {
    if (open) {
      fetchStaffProfiles();
      fetchSchedules();
    }
  }, [open, selectedStaff, fetchSchedules]);

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/weekly-schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Löschen der Arbeitszeiten');
      }

      setSnackbar({
        open: true,
        message: 'Arbeitszeiten erfolgreich gelöscht',
        severity: 'success'
      });
      
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Löschen der Arbeitszeiten',
        severity: 'error'
      });
    }
  };

  const getValidityRange = (validFrom: string, validTo?: string) => {
    const from = new Date(validFrom);
    const to = validTo ? new Date(validTo) : null;
    const fromStr = format(from, 'dd.MM.yyyy', { locale: de });
    const toStr = to ? format(to, 'dd.MM.yyyy', { locale: de }) : 'unbegrenzt';
    return `${fromStr} - ${toStr}`;
  };

  const getWorkingDays = (schedules: DaySchedule[]) => {
    return schedules.filter(s => s.isWorking).length;
  };

  const getTotalWorkingHours = (schedules: DaySchedule[]) => {
    return schedules
      .filter(s => s.isWorking)
      .reduce((total, s) => {
        const start = new Date(`2000-01-01T${s.startTime}`);
        const end = new Date(`2000-01-01T${s.endTime}`);
        const breakStart = s.breakStart ? new Date(`2000-01-01T${s.breakStart}`) : null;
        const breakEnd = s.breakEnd ? new Date(`2000-01-01T${s.breakEnd}`) : null;
        
        let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        if (breakStart && breakEnd) {
          const breakHours = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60);
          hours -= breakHours;
        }
        
        return total + hours;
      }, 0);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Übersicht der wöchentlichen Arbeitszeiten
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Filter */}
        <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Mitarbeiter</InputLabel>
            <Select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              label="Mitarbeiter"
            >
              <MenuItem value="all">Alle Mitarbeiter</MenuItem>
              {staffProfiles.map((staff) => (
                <MenuItem key={staff._id} value={staff._id}>
                  {staff.display_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Entfernt Wochenauswahl - nicht mehr benötigt für wiederkehrende Vorlagen */}
        </Box>

        {/* Loading */}
        {loading && (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        )}

        {/* Schedules List */}
        {!loading && schedules.length === 0 && (
          <Alert severity="info">
            Keine Arbeitszeiten für die ausgewählten Kriterien gefunden.
          </Alert>
        )}

        {!loading && schedules.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {schedules.map((schedule) => (
              <Card key={schedule._id} variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {schedule.staffId.displayName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getValidityRange(schedule.validFrom, schedule.validTo)}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <Chip 
                          label={`${getWorkingDays(schedule.schedules)} Arbeitstage`} 
                          size="small" 
                          color="primary" 
                        />
                        <Chip 
                          label={`${getTotalWorkingHours(schedule.schedules).toFixed(1)}h gesamt`} 
                          size="small" 
                          color="secondary" 
                        />
                      </Box>
                    </Box>
                    <Box>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteSchedule(schedule._id)}
                        title="Löschen"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Daily Schedule Table */}
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Tag</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Arbeitszeit</TableCell>
                          <TableCell>Pause</TableCell>
                          <TableCell>Beschreibung</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {DAYS.map((day) => {
                          const daySchedule = schedule.schedules.find(s => s.day === day.key);
                          if (!daySchedule) return null;

                          return (
                            <TableRow key={day.key}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {day.label}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={daySchedule.isWorking ? 'Arbeitstag' : 'Frei'}
                                  size="small"
                                  color={daySchedule.isWorking ? 'success' : 'default'}
                                  variant={daySchedule.isWorking ? 'filled' : 'outlined'}
                                />
                              </TableCell>
                              <TableCell>
                                {daySchedule.isWorking ? (
                                  <Typography variant="body2">
                                    {daySchedule.startTime} - {daySchedule.endTime}
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {daySchedule.isWorking && daySchedule.breakStart && daySchedule.breakEnd ? (
                                  <Typography variant="body2">
                                    {daySchedule.breakStart} - {daySchedule.breakEnd}
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {daySchedule.label || '-'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Schließen</Button>
      </DialogActions>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default WeeklyScheduleOverview;
