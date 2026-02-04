// Mitarbeiterplanung-Dashboard: Wer ist da?, Anwesenheiten, Abwesenheiten (Urlaub/Krankenstand), Online-Buchung, Schnellzugriff

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tabs,
  Tab,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
} from '@mui/material';
import {
  Groups,
  Schedule,
  PendingActions,
  BookOnline,
  Person,
  EventBusy,
  BeachAccess,
  LocalHospital,
  School,
  ChevronLeft,
  ChevronRight,
  CalendarMonth,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { format, startOfDay, endOfDay, endOfWeek, startOfWeek, addWeeks, subWeeks, getISODay } from 'date-fns';
import { de } from 'date-fns/locale';
import api from '../utils/api';
import { useAppSelector } from '../store/hooks';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';
import GradientDialogTitle from '../components/GradientDialogTitle';

interface WorkShift {
  _id: string;
  staffId: {
    _id: string;
    displayName?: string;
    roleHint?: string;
    colorHex?: string;
  };
  startsAt: string;
  endsAt: string;
  shiftType?: string;
  isActive?: boolean;
}

interface Absence {
  _id: string;
  staffId: {
    _id: string;
    displayName?: string;
    roleHint?: string;
  };
  startsAt: string;
  endsAt: string;
  reason: 'vacation' | 'sick' | 'personal' | 'training' | 'conference' | 'other';
  status: string;
  notes?: string;
}

interface StaffProfile {
  _id: string;
  display_name?: string;
  displayName?: string;
  isOnlineBookable?: boolean;
}

interface LocationOption {
  _id: string;
  name?: string;
  code?: string;
}

interface MinimumCoverageEntry {
  _id?: string;
  location_id: string | { _id: string; name?: string };
  dayOfWeek: number;
  minimumCount: number;
}

const REASON_COLORS: Record<string, { bg: string; bgDark: string; label: string; icon: React.ReactNode }> = {
  vacation: { bg: '#e8f5e9', bgDark: '#1b3d1f', label: 'Urlaub', icon: <BeachAccess fontSize="small" /> },
  sick: { bg: '#ffebee', bgDark: '#5d1f23', label: 'Krankenstand', icon: <LocalHospital fontSize="small" /> },
  training: { bg: '#e3f2fd', bgDark: '#0d2d4d', label: 'Training', icon: <School fontSize="small" /> },
  personal: { bg: '#f5f5f5', bgDark: '#424242', label: 'Persönlich', icon: <Person fontSize="small" /> },
  conference: { bg: '#f5f5f5', bgDark: '#424242', label: 'Konferenz', icon: <EventBusy fontSize="small" /> },
  other: { bg: '#f5f5f5', bgDark: '#424242', label: 'Sonstige', icon: <EventBusy fontSize="small" /> },
};

const getDisplayName = (staff: { displayName?: string; display_name?: string } | undefined): string => {
  if (!staff) return '–';
  return staff.displayName || staff.display_name || '–';
};

const getAbsenceStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Ausstehend',
    approved: 'Genehmigt',
    rejected: 'Abgelehnt',
    cancelled: 'Storniert',
  };
  return labels[status] || status;
};

const getStaffId = (staff: { _id?: string } | undefined): string => staff?._id ?? '';

const dayIsInRange = (day: Date, start: Date, end: Date): boolean =>
  day.getTime() >= startOfDay(start).getTime() && day.getTime() <= endOfDay(end).getTime();

const StaffPlanning: React.FC = () => {
  const theme = useTheme();
  const { marginTopValue } = useGlobalNavigationOffset();
  const user = useAppSelector((state) => state.auth.user);
  const permissions = user?.permissions ?? [];
  const isSelfService = permissions.includes('absences.self') && !permissions.includes('appointments.write');
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [shiftsInRange, setShiftsInRange] = useState<WorkShift[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [absenceTab, setAbsenceTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState(0);
  const [weekStartDate, setWeekStartDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weekShifts, setWeekShifts] = useState<WorkShift[]>([]);
  const [weekAbsences, setWeekAbsences] = useState<Absence[]>([]);
  const [weekLoading, setWeekLoading] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  const [locationFilterId, setLocationFilterId] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationStaffIds, setLocationStaffIds] = useState<Set<string> | null>(null);
  const [minimumCoverage, setMinimumCoverage] = useState<MinimumCoverageEntry[]>([]);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const loadData = useCallback(async () => {
    const n = new Date();
    const tStart = startOfDay(n);
    const wEnd = endOfWeek(n, { weekStartsOn: 1 });
    setLoading(true);
    setError(null);
    try {
      const todayStartStr = tStart.toISOString();
      const weekEndStr = wEnd.toISOString();
      const absenceEnd = new Date(n);
      absenceEnd.setDate(absenceEnd.getDate() + 14);

      const [shiftsRes, absencesRes, staffRes] = await Promise.all([
        api.get<{ success?: boolean; data?: WorkShift[]; pagination?: { total: number } }>(
          '/work-shifts',
          {
            startDate: todayStartStr,
            endDate: weekEndStr,
            limit: 200,
            page: 1,
            active: 'true',
          }
        ),
        api.get<{ success?: boolean; data?: Absence[] }>('/absences', {
          startDate: todayStartStr,
          endDate: absenceEnd.toISOString(),
          limit: 100,
          page: 1,
        }),
        api.get<{ success?: boolean; data?: StaffProfile[] }>('/staff-profiles', { limit: 100 }),
      ]);

      const shiftsData = (shiftsRes.data as { data?: WorkShift[] })?.data ?? shiftsRes.data;
      setShiftsInRange(Array.isArray(shiftsData) ? shiftsData : []);

      const absData = (absencesRes.data as { data?: Absence[] })?.data ?? absencesRes.data;
      setAbsences(Array.isArray(absData) ? absData : []);

      const staffData = (staffRes.data as { data?: StaffProfile[] })?.data ?? staffRes.data;
      setStaffProfiles(Array.isArray(staffData) ? staffData : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Fehler beim Laden der Daten';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWeekData = useCallback(async (weekStart: Date, locationId: string | null) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    setWeekLoading(true);
    try {
      if (locationId) {
        const [overviewRes, assignmentsRes] = await Promise.all([
          api.get<{ success?: boolean; data?: { workShifts: WorkShift[]; absences: Absence[] } }>(
            '/staff-planning/overview',
            {
              startDate: weekStart.toISOString(),
              endDate: weekEnd.toISOString(),
              locationId,
            }
          ),
          api.get<{ success?: boolean; data?: Array<{ staff_id: string | { _id: string } }> }>(
            '/staff-location-assignments',
            { location_id: locationId }
          ),
        ]);
        const overviewData = (overviewRes.data as { data?: { workShifts: WorkShift[]; absences: Absence[] } })?.data;
        setWeekShifts(overviewData?.workShifts ?? []);
        setWeekAbsences(overviewData?.absences ?? []);
        const assignments = (assignmentsRes.data as { data?: Array<{ staff_id: string | { _id: string } }> })?.data ?? [];
        const ids = new Set<string>(
          assignments.map((a) => {
            const sid = a.staff_id;
            return typeof sid === 'object' && sid && '_id' in sid ? sid._id : String(sid);
          })
        );
        setLocationStaffIds(ids);
      } else {
        const [shiftsRes, absencesRes] = await Promise.all([
          api.get<{ success?: boolean; data?: WorkShift[] }>('/work-shifts', {
            startDate: weekStart.toISOString(),
            endDate: weekEnd.toISOString(),
            limit: 200,
            page: 1,
            active: 'true',
          }),
          api.get<{ success?: boolean; data?: Absence[] }>('/absences', {
            startDate: weekStart.toISOString(),
            endDate: weekEnd.toISOString(),
            limit: 200,
            page: 1,
          }),
        ]);
        const shiftsData = (shiftsRes.data as { data?: WorkShift[] })?.data ?? shiftsRes.data;
        setWeekShifts(Array.isArray(shiftsData) ? shiftsData : []);
        const absData = (absencesRes.data as { data?: Absence[] })?.data ?? absencesRes.data;
        setWeekAbsences(Array.isArray(absData) ? absData : []);
        setLocationStaffIds(null);
      }
    } catch {
      setWeekShifts([]);
      setWeekAbsences([]);
      setLocationStaffIds(locationId ? new Set() : null);
    } finally {
      setWeekLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (viewTab === 1) loadWeekData(weekStartDate, locationFilterId);
  }, [viewTab, weekStartDate, locationFilterId, loadWeekData]);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const res = await api.get<{ success?: boolean; data?: LocationOption[] }>('/locations', {
          limit: 200,
          page: 1,
        });
        const data = (res.data as { data?: LocationOption[] })?.data ?? res.data;
        setLocations(Array.isArray(data) ? data : []);
      } catch {
        setLocations([]);
      }
    };
    loadLocations();
  }, []);

  useEffect(() => {
    const loadMinimumCoverage = async () => {
      try {
        const res = await api.get<{ success?: boolean; data?: MinimumCoverageEntry[] }>(
          '/staff-planning/minimum-coverage'
        );
        const data = (res.data as { data?: MinimumCoverageEntry[] })?.data ?? res.data;
        setMinimumCoverage(Array.isArray(data) ? data : []);
      } catch {
        setMinimumCoverage([]);
      }
    };
    if (viewTab === 1) loadMinimumCoverage();
  }, [viewTab]);

  const shiftsToday = shiftsInRange.filter((s) => {
    const start = new Date(s.startsAt).getTime();
    const end = new Date(s.endsAt).getTime();
    return start <= todayEnd.getTime() && end >= todayStart.getTime();
  });

  const shiftsNow = shiftsInRange.filter((s) => {
    const start = new Date(s.startsAt).getTime();
    const end = new Date(s.endsAt).getTime();
    const t = now.getTime();
    return t >= start && t <= end;
  });

  const shiftsWeekList = shiftsInRange;

  const absencesByReason = {
    vacation: absences.filter((a) => a.reason === 'vacation'),
    sick: absences.filter((a) => a.reason === 'sick'),
    training: absences.filter((a) => a.reason === 'training'),
    other: absences.filter((a) => !['vacation', 'sick', 'training'].includes(a.reason)),
  };
  const onlineBookableCount = staffProfiles.filter((s) => s.isOnlineBookable).length;

  const handleAbsenceTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setAbsenceTab(newValue);
  };

  const handleViewTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setViewTab(newValue);
  };

  const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + i);
    weekDays.push(d);
  }

  const weekStaffIdsRaw = new Set<string>();
  if (!locationStaffIds) staffProfiles.forEach((s) => weekStaffIdsRaw.add(s._id));
  weekShifts.forEach((s) => weekStaffIdsRaw.add(getStaffId(s.staffId)));
  weekAbsences.forEach((a) => weekStaffIdsRaw.add(getStaffId(a.staffId)));
  const weekStaffIds = locationStaffIds
    ? new Set(Array.from(weekStaffIdsRaw).filter((id) => locationStaffIds.has(id)))
    : weekStaffIdsRaw;
  const weekStaffList = Array.from(weekStaffIds).map((id) => {
    const fromProfile = staffProfiles.find((p) => p._id === id);
    const fromShift = weekShifts.find((s) => getStaffId(s.staffId) === id);
    const fromAbsence = weekAbsences.find((a) => getStaffId(a.staffId) === id);
    const staff = fromProfile ?? fromShift?.staffId ?? fromAbsence?.staffId;
    return { _id: id, displayName: getDisplayName(staff as { displayName?: string }) };
  }).sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

  const getShiftForStaffDay = (staffId: string, day: Date, shifts: WorkShift[]): WorkShift | null => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    return shifts.find((s) => {
      if (getStaffId(s.staffId) !== staffId) return false;
      const start = new Date(s.startsAt).getTime();
      const end = new Date(s.endsAt).getTime();
      return start <= dayEnd.getTime() && end >= dayStart.getTime();
    }) ?? null;
  };

  const getAbsenceForStaffDay = (staffId: string, day: Date, absencesList: Absence[]): Absence | null => {
    return absencesList.find((a) => {
      if (getStaffId(a.staffId) !== staffId) return false;
      return dayIsInRange(day, new Date(a.startsAt), new Date(a.endsAt));
    }) ?? null;
  };

  const getLocationIdFromEntry = (entry: MinimumCoverageEntry): string | null =>
    entry.location_id == null
      ? null
      : typeof entry.location_id === 'object' && '_id' in entry.location_id
        ? entry.location_id._id
        : String(entry.location_id);

  const countStaffWithShiftOnDay = (day: Date, shifts: WorkShift[]): number => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const ids = new Set<string>();
    shifts.forEach((s) => {
      const start = new Date(s.startsAt).getTime();
      const end = new Date(s.endsAt).getTime();
      if (start <= dayEnd.getTime() && end >= dayStart.getTime()) ids.add(getStaffId(s.staffId));
    });
    return ids.size;
  };

  if (loading && !shiftsToday.length && !absences.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, marginTop: marginTopValue }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ marginTop: marginTopValue }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h5" component="h1">
          Mitarbeiterplanung
        </Typography>
        <Tooltip title="Hilfe & Leitfaden">
          <IconButton
            onClick={() => setHelpDialogOpen(true)}
            aria-label="Hilfe öffnen"
            size="small"
            color="primary"
          >
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs value={viewTab} onChange={handleViewTabChange} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tab label="Dashboard" id="view-tab-0" aria-controls="view-panel-0" />
        <Tab label="Wochenübersicht" id="view-tab-1" aria-controls="view-panel-1" />
      </Tabs>

      {viewTab === 1 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={2} sx={{ mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 200 }} aria-label="Standort filter">
                <InputLabel id="staff-planning-location-label">Standort</InputLabel>
                <Select
                  labelId="staff-planning-location-label"
                  id="staff-planning-location"
                  value={locationFilterId ?? ''}
                  label="Standort"
                  onChange={(e) => setLocationFilterId(e.target.value === '' ? null : e.target.value)}
                  aria-label="Standort auswählen"
                >
                  <MenuItem value="">Alle Standorte</MenuItem>
                  {locations.map((loc) => (
                    <MenuItem key={loc._id} value={loc._id}>
                      {loc.name || loc.code || loc._id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title="Vorherige Woche">
                <IconButton onClick={() => setWeekStartDate((d) => subWeeks(d, 1))} aria-label="Vorherige Woche">
                  <ChevronLeft />
                </IconButton>
              </Tooltip>
              <Typography variant="h6" sx={{ minWidth: 220, textAlign: 'center' }}>
                {format(weekStartDate, 'd. MMM', { locale: de })} – {format(weekEndDate, 'd. MMM yyyy', { locale: de })}
              </Typography>
              <Tooltip title="Nächste Woche">
                <IconButton onClick={() => setWeekStartDate((d) => addWeeks(d, 1))} aria-label="Nächste Woche">
                  <ChevronRight />
                </IconButton>
              </Tooltip>
            </Stack>
            {weekLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                <Table size="small" stickyHeader aria-label="Wochenübersicht Mitarbeiter × Tage">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, minWidth: 140 }}>Mitarbeiter</TableCell>
                      {weekDays.map((day) => (
                        <TableCell key={day.getTime()} align="center" sx={{ fontWeight: 600, minWidth: 100 }}>
                          {format(day, 'EEE d.', { locale: de })}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {locationFilterId &&
                      minimumCoverage.some((m) => getLocationIdFromEntry(m) === locationFilterId) && (
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                          Mindestbesetzung
                        </TableCell>
                        {weekDays.map((day) => {
                          const dayOfWeek = getISODay(day);
                          const minEntry = minimumCoverage.find(
                            (m) => getLocationIdFromEntry(m) === locationFilterId && m.dayOfWeek === dayOfWeek
                          );
                          const count = countStaffWithShiftOnDay(day, weekShifts);
                          const min = minEntry?.minimumCount ?? 0;
                          const under = min > 0 && count < min;
                          return (
                            <TableCell
                              key={day.getTime()}
                              align="center"
                              sx={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: under ? 'error.main' : 'text.secondary',
                              }}
                            >
                              {min > 0 ? `${count}/${min}` : count}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    )}
                    {weekStaffList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 3 }} color="text.secondary">
                          Keine Mitarbeiter oder keine Daten für diese Woche.
                        </TableCell>
                      </TableRow>
                    ) : (
                      weekStaffList.map((staff) => (
                        <TableRow key={staff._id}>
                          <TableCell sx={{ fontWeight: 500 }}>{staff.displayName || '–'}</TableCell>
                          {weekDays.map((day) => {
                            const shift = getShiftForStaffDay(staff._id, day, weekShifts);
                            const absence = getAbsenceForStaffDay(staff._id, day, weekAbsences);
                            const conflict = shift && absence;
                            const reasonConf = absence ? (REASON_COLORS[absence.reason] || REASON_COLORS.other) : null;
                            const cellBg = reasonConf
                              ? (isDark ? reasonConf.bgDark : reasonConf.bg)
                              : (shift ? 'action.hover' : undefined);
                            return (
                              <TableCell
                                key={day.getTime()}
                                align="center"
                                sx={{
                                  bgcolor: cellBg,
                                  color: reasonConf && isDark ? '#e0e0e0' : undefined,
                                  borderLeft: '1px solid',
                                  borderColor: 'divider',
                                  verticalAlign: 'top',
                                  py: 1,
                                }}
                              >
                                {absence && (
                                  <Box
                                    component="span"
                                    sx={{
                                      display: 'block',
                                      fontSize: '0.75rem',
                                      fontWeight: 500,
                                    }}
                                    title={reasonConf?.label ?? absence.reason}
                                  >
                                    {reasonConf?.label ?? absence.reason}
                                  </Box>
                                )}
                                {shift && (
                                  <Box component="span" sx={{ fontSize: '0.75rem', display: 'block' }}>
                                    {format(new Date(shift.startsAt), 'HH:mm')}–{format(new Date(shift.endsAt), 'HH:mm')}
                                    {shift.shiftType && ` (${shift.shiftType})`}
                                  </Box>
                                )}
                                {conflict && (
                                  <Chip size="small" label="Konflikt" color="warning" sx={{ mt: 0.5 }} />
                                )}
                                {!shift && !absence && '–'}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {viewTab === 0 && (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {/* 1. Wer ist JETZT da? */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Wer ist JETZT da?
              </Typography>
              {shiftsNow.length === 0 ? (
                <Typography color="text.secondary">Aktuell niemand im Dienst.</Typography>
              ) : (
                <List dense disablePadding>
                  {shiftsNow.map((shift) => (
                    <ListItem key={shift._id} disablePadding sx={{ py: 0.5 }}>
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: (shift.staffId as { colorHex?: string })?.colorHex || 'primary.main',
                          }}
                        >
                          {getDisplayName(shift.staffId as { displayName?: string })?.charAt(0) || '?'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={getDisplayName(shift.staffId as { displayName?: string })}
                        secondary={shift.shiftType ? `Schicht: ${shift.shiftType}` : undefined}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* 2. Anwesenheiten heute / diese Woche */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Anwesend heute
              </Typography>
              {shiftsToday.length === 0 ? (
                <Typography color="text.secondary">Keine Schichten heute.</Typography>
              ) : (
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {shiftsToday.map((s) => (
                    <Chip
                      key={s._id}
                      size="small"
                      label={getDisplayName(s.staffId as { displayName?: string })}
                      avatar={<Avatar sx={{ width: 24, height: 24 }}>{getDisplayName(s.staffId as { displayName?: string })?.charAt(0)}</Avatar>}
                    />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Diese Woche im Dienst
              </Typography>
              {shiftsWeekList.length === 0 ? (
                <Typography color="text.secondary">Keine Schichten diese Woche.</Typography>
              ) : (
                <Typography color="text.secondary">
                  {shiftsWeekList.length} Schicht(en) – siehe Arbeitszeiten für Details.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* 3. Abwesenheiten (Urlaub, Krankenstand, andere) */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Abwesenheiten (nächste 14 Tage)
              </Typography>
              <Tabs value={absenceTab} onChange={handleAbsenceTabChange} sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
                <Tab label={`Urlaub (${absencesByReason.vacation.length})`} id="absence-tab-0" aria-controls="absence-panel-0" />
                <Tab label={`Krankenstand (${absencesByReason.sick.length})`} id="absence-tab-1" aria-controls="absence-panel-1" />
                <Tab label={`Training (${absencesByReason.training.length})`} id="absence-tab-2" aria-controls="absence-panel-2" />
                <Tab label={`Sonstige (${absencesByReason.other.length})`} id="absence-tab-3" aria-controls="absence-panel-3" />
              </Tabs>
              {[absencesByReason.vacation, absencesByReason.sick, absencesByReason.training, absencesByReason.other].map((list, idx) => (
                <div
                  key={idx}
                  role="tabpanel"
                  hidden={absenceTab !== idx}
                  id={`absence-panel-${idx}`}
                  aria-labelledby={`absence-tab-${idx}`}
                >
                  {absenceTab === idx && (
                    <List dense>
                      {list.length === 0 ? (
                        <ListItem>
                          <ListItemText primary="Keine Einträge" />
                        </ListItem>
                      ) : (
                        list.slice(0, 10).map((a) => {
                          const conf = REASON_COLORS[a.reason] || REASON_COLORS.other;
                          const bg = isDark ? conf.bgDark : conf.bg;
                          return (
                            <ListItem
                              key={a._id}
                              sx={{ bgcolor: bg, borderRadius: 1, mb: 0.5, color: isDark ? '#e0e0e0' : undefined }}
                            >
                              <ListItemText
                                primary={getDisplayName(a.staffId as { displayName?: string })}
                                secondary={`${format(new Date(a.startsAt), 'd. MMM', { locale: de })} – ${format(new Date(a.endsAt), 'd. MMM', { locale: de })} · ${getAbsenceStatusLabel(a.status)}`}
                                secondaryTypographyProps={{ sx: { color: isDark ? 'rgba(255,255,255,0.7)' : undefined } }}
                              />
                            </ListItem>
                          );
                        })
                      )}
                    </List>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </Box>

        {/* 4. Online-Buchung – Hinweis und Link */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Online-Buchung
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Abwesenheiten und Anwesenheiten werden in der Online-Buchung automatisch berücksichtigt (genehmigte Abwesenheiten blockieren Slots).
              </Alert>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Button variant="contained" component={Link} to="/online-bookings" startIcon={<BookOnline />}>
                  Online-Buchungen
                </Button>
                {typeof onlineBookableCount === 'number' && (
                  <Typography color="text.secondary">
                    {onlineBookableCount} Mitarbeiter aktuell online buchbar
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* 5. Nächste Abwesenheiten */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                  Nächste Abwesenheiten
                </Typography>
                <Stack direction="row" spacing={1}>
                  {isSelfService && (
                    <Button size="small" variant="contained" component={Link} to="/absences" startIcon={<PendingActions />}>
                      Antrag stellen
                    </Button>
                  )}
                  <Button size="small" component={Link} to="/absences">
                    Alle anzeigen
                  </Button>
                </Stack>
              </Stack>
              {absences.length === 0 ? (
                <Typography color="text.secondary">Keine Abwesenheiten in den nächsten 14 Tagen.</Typography>
              ) : (
                <List dense disablePadding>
                  {[...absences]
                    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
                    .slice(0, 10)
                    .map((a) => {
                      const conf = REASON_COLORS[a.reason] || REASON_COLORS.other;
                      const bg = isDark ? conf.bgDark : conf.bg;
                      return (
                        <ListItem
                          key={a._id}
                          sx={{ bgcolor: bg, borderRadius: 1, mb: 0.5, color: isDark ? '#e0e0e0' : undefined }}
                          disablePadding
                        >
                          <ListItemText
                            primary={getDisplayName(a.staffId as { displayName?: string })}
                            secondary={`${format(new Date(a.startsAt), 'd. MMM', { locale: de })} – ${format(new Date(a.endsAt), 'd. MMM', { locale: de })} · ${conf.label} · ${getAbsenceStatusLabel(a.status)}`}
                            primaryTypographyProps={{ fontWeight: 500 }}
                            secondaryTypographyProps={{ sx: { color: isDark ? 'rgba(255,255,255,0.7)' : undefined } }}
                          />
                        </ListItem>
                      );
                    })}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* 6. Schnellzugriff */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Schnellzugriff
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" gap={1}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CalendarMonth />}
                  onClick={() => setViewTab(1)}
                  aria-label="Zur Wochenübersicht wechseln"
                >
                  Zur Wochenübersicht
                </Button>
                <Button variant="outlined" component={Link} to="/staff" startIcon={<Groups />}>
                  Personal
                </Button>
                <Button variant="outlined" component={Link} to="/work-shifts" startIcon={<Schedule />}>
                  Arbeitszeiten
                </Button>
                <Button variant="outlined" component={Link} to="/absences" startIcon={<PendingActions />}>
                  Abwesenheiten
                </Button>
                <Button variant="outlined" component={Link} to="/availability" startIcon={<Schedule />}>
                  Verfügbarkeiten
                </Button>
                <Button variant="outlined" component={Link} to="/online-bookings" startIcon={<BookOnline />}>
                  Online-Buchungen
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>
      )}

      <Dialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} maxWidth="md" fullWidth>
        <GradientDialogTitle title="Hilfe: Mitarbeiterplanung" onClose={() => setHelpDialogOpen(false)} />
        <DialogContent dividers>
          <Tabs value={helpTab} onChange={(_, v) => setHelpTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tab label="Übersicht" id="help-tab-0" aria-controls="help-panel-0" />
            <Tab label="Dashboard" id="help-tab-1" aria-controls="help-panel-1" />
            <Tab label="Wochenübersicht" id="help-tab-2" aria-controls="help-panel-2" />
          </Tabs>
          {helpTab === 0 && (
            <Box role="tabpanel" id="help-panel-0" aria-labelledby="help-tab-0">
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Was ist die Mitarbeiterplanung?</Typography>
              <Typography paragraph>
                Die Mitarbeiterplanung bündelt Anwesenheiten, Abwesenheiten (Urlaub, Krankenstand, Training) und Schnellzugriffe auf Personal, Arbeitszeiten und Abwesenheiten. Abwesenheiten werden in der Online-Buchung automatisch berücksichtigt.
              </Typography>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Tabs</Typography>
              <Typography paragraph>
                <strong>Dashboard:</strong> Wer ist jetzt da?, Anwesend heute/diese Woche, Abwesenheiten, Online-Buchung-Hinweis, Nächste Abwesenheiten, Schnellzugriff.<br />
                <strong>Wochenübersicht:</strong> Matrix Mitarbeiter × Wochentage mit Schichten und Abwesenheiten (Farben: Urlaub=Grün, Krankenstand=Rot, Training=Blau). Konflikte (Schicht und Abwesenheit am selben Tag) werden angezeigt.
              </Typography>
            </Box>
          )}
          {helpTab === 1 && (
            <Box role="tabpanel" id="help-panel-1" aria-labelledby="help-tab-1">
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Dashboard-Widgets</Typography>
              <Typography paragraph>
                <strong>Wer ist JETZT da?</strong> Zeigt Mitarbeiter, die gerade eine Schicht haben (aktueller Zeitpunkt zwischen Schichtbeginn und -ende).<br />
                <strong>Anwesend heute / Diese Woche:</strong> Schichten heute bzw. in der aktuellen Woche.<br />
                <strong>Abwesenheiten:</strong> Nach Grund gefiltert (Urlaub, Krankenstand, Training, Sonstige).<br />
                <strong>Nächste Abwesenheiten:</strong> Die nächsten 10 Abwesenheiten nach Startdatum.<br />
                <strong>Schnellzugriff:</strong> Zur Wochenübersicht wechseln oder zu Personal, Arbeitszeiten, Abwesenheiten, Verfügbarkeiten, Online-Buchungen.
              </Typography>
            </Box>
          )}
          {helpTab === 2 && (
            <Box role="tabpanel" id="help-panel-2" aria-labelledby="help-tab-2">
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Wochenübersicht</Typography>
              <Typography paragraph>
                Zeilen = Mitarbeiter (aus Personal bzw. aus Schichten/Abwesenheiten der Woche), Spalten = Wochentage (Mo–So). In jeder Zelle: Schicht (Zeitraum, Typ) und/oder Abwesenheit (Grund mit Farbe). Bei gleichzeitigem Eintrag erscheint ein „Konflikt“-Hinweis.
              </Typography>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Standort-Filter</Typography>
              <Typography paragraph>
                Über das Dropdown „Standort“ können Sie die Ansicht auf einen Standort einschränken. Es werden nur Mitarbeiter angezeigt, die diesem Standort zugeordnet sind und in der gewählten Woche Schichten oder Abwesenheiten haben. „Alle Standorte“ zeigt wieder alle Mitarbeiter.
              </Typography>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Mindestbesetzung</Typography>
              <Typography paragraph>
                Wenn für den gewählten Standort Mindestbesetzungen pro Wochentag hinterlegt sind, erscheint eine Zeile „Mindestbesetzung“ mit der Anzeige „Anzahl/Minimum“ (z. B. 2/3). Ist die Anzahl unter dem Minimum, wird die Zelle rot hervorgehoben.
              </Typography>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Farben</Typography>
              <Typography paragraph>
                Urlaub = Grün, Krankenstand = Rot, Training = Blau, Sonstige = Grau. Woche mit Pfeilen wechseln (Montag als Wochenanfang).
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default StaffPlanning;
