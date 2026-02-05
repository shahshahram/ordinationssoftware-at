// Stundenabrechnung (Timesheet) – monatliche Zeiterfassungsübersicht

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Stack,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import { ChevronLeft, ChevronRight, FileDownload as FileDownloadIcon, KeyboardArrowDown as KeyboardArrowDownIcon, Print as PrintIcon, Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, HelpOutline as HelpOutlineIcon } from '@mui/icons-material';
import GradientDialogTitle from '../components/GradientDialogTitle';
import { format, subMonths, addMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../utils/api';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  fetchMonthlyReport,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  type ReportDay,
  type TimeEntry,
  type MonthlyReport,
} from '../store/slices/timeTrackingSlice';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';

type EditRow = {
  _id?: string;
  startTime: string;
  endTime: string;
  type: 'work' | 'break';
  note: string;
};

const ABSENCE_LABELS: Record<string, string> = {
  vacation: 'Urlaub',
  sick: 'Krankenstand',
  personal: 'Persönlich',
  training: 'Training',
  conference: 'Konferenz',
  other: 'Sonstige',
};

const formatTime = (dateStr: string): string => {
  try {
    return format(new Date(dateStr), 'HH:mm', { locale: de });
  } catch {
    return '–';
  }
};

const formatWorkRanges = (entries: TimeEntry[]): string => {
  const work = entries.filter((e) => e.type === 'work').sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  if (work.length === 0) return '–';
  return work.map((e) => `${formatTime(e.start)}–${e.end ? formatTime(e.end) : '…'}`).join(', ');
};

const getBreakHours = (entries: TimeEntry[]): number => {
  const breaks = entries.filter((e) => e.type === 'break');
  let ms = 0;
  for (const e of breaks) {
    const end = e.end ? new Date(e.end).getTime() : Date.now();
    ms += end - new Date(e.start).getTime();
  }
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
};

const escapeCsv = (value: string): string => {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
};

const exportAsCSV = (report: MonthlyReport, monthDisplay: string): void => {
  const header = ['Datum', 'Arbeitszeit (Start–Ende)', 'Pause (h)', 'Ist (h)', 'Soll (h)', 'Saldo', 'Status'];
  const rows = report.days.map((day) => {
    const dateLabel = format(new Date(day.date), 'EEE d. MMM', { locale: de });
    const workRanges = formatWorkRanges(day.entries);
    const breakH = getBreakHours(day.entries);
    const status = day.absence ? ABSENCE_LABELS[day.absence] ?? day.absence : '';
    const balanceStr = day.balance > 0 ? `+${day.balance.toFixed(1)}` : day.balance.toFixed(1);
    return [dateLabel, workRanges, breakH > 0 ? breakH.toString() : '', day.actual.toFixed(1), day.target.toFixed(1), balanceStr, status];
  });
  const summaryRow = ['Summe', '', '', report.summary.totalActual.toFixed(1), report.summary.totalTarget.toFixed(1), (report.summary.totalBalance > 0 ? '+' : '') + report.summary.totalBalance.toFixed(1), ''];
  const csvContent = [
    header.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
    summaryRow.map(escapeCsv).join(','),
  ].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Stundenabrechnung_${monthDisplay.replace(/\s/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportAsPDF = (report: MonthlyReport, monthDisplay: string): void => {
  const doc = new jsPDF('l', 'mm', 'a4');
  doc.setFontSize(14);
  doc.text(`Stundenabrechnung – ${monthDisplay}`, 14, 12);
  const head = [['Datum', 'Arbeitszeit', 'Pause (h)', 'Ist (h)', 'Soll (h)', 'Saldo', 'Status']];
  const body = report.days.map((day) => {
    const dateLabel = format(new Date(day.date), 'EEE d. MMM', { locale: de });
    const workRanges = formatWorkRanges(day.entries);
    const breakH = getBreakHours(day.entries);
    const status = day.absence ? ABSENCE_LABELS[day.absence] ?? day.absence : '–';
    const balanceStr = day.balance > 0 ? `+${day.balance.toFixed(1)}` : day.balance.toFixed(1);
    return [dateLabel, workRanges, breakH > 0 ? breakH.toFixed(2) : '–', day.actual.toFixed(1), day.target.toFixed(1), balanceStr, status];
  });
  body.push(['Summe', '', '', report.summary.totalActual.toFixed(1), report.summary.totalTarget.toFixed(1), (report.summary.totalBalance > 0 ? '+' : '') + report.summary.totalBalance.toFixed(1), '']);
  autoTable(doc, {
    head,
    body,
    startY: 18,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 139, 202] },
  });
  doc.save(`Stundenabrechnung_${monthDisplay.replace(/\s/g, '_')}.pdf`);
};

const Timesheet: React.FC = () => {
  const dispatch = useAppDispatch();
  const { marginTopValue } = useGlobalNavigationOffset();
  const { report, loading, error } = useAppSelector((state) => state.timeTracking);

  const currentMonth = useMemo(() => format(new Date(), 'yyyy-MM'), []);
  const [month, setMonth] = useState(currentMonth);
  const [myStaffId, setMyStaffId] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogDate, setEditDialogDate] = useState<string | null>(null);
  const [editDialogEntries, setEditDialogEntries] = useState<EditRow[]>([]);
  const [editDialogOriginalIds, setEditDialogOriginalIds] = useState<string[]>([]);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  const [editSaveLoading, setEditSaveLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const loadMe = async () => {
      setProfileError(null);
      try {
        const res = await api.get<{ success?: boolean; data?: { _id: string } }>('/staff-profiles/me');
        const data = (res.data as { data?: { _id: string } })?.data;
        if (data?._id) setMyStaffId(data._id);
        else setMyStaffId(null);
      } catch {
        setMyStaffId(null);
        setProfileError('Kein Personalprofil vorhanden.');
      }
    };
    loadMe();
  }, []);

  useEffect(() => {
    if (!myStaffId) return;
    dispatch(fetchMonthlyReport({ month, staffId: myStaffId }));
  }, [month, myStaffId, dispatch]);

  const monthDisplay = useMemo(() => {
    try {
      const [y, m] = month.split('-').map(Number);
      return format(new Date(y, m - 1, 1), 'LLLL yyyy', { locale: de });
    } catch {
      return month;
    }
  }, [month]);

  const handlePrevMonth = () => {
    const d = subMonths(new Date(month + '-01'), 1);
    setMonth(format(d, 'yyyy-MM'));
  };
  const handleNextMonth = () => {
    const d = addMonths(new Date(month + '-01'), 1);
    setMonth(format(d, 'yyyy-MM'));
  };
  const handleCurrentMonth = () => setMonth(currentMonth);

  const isWeekend = (dateStr: string): boolean => {
    const d = new Date(dateStr);
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  const handleOpenEdit = (day: ReportDay) => {
    setEditDialogDate(day.date);
    const rows: EditRow[] = day.entries.map((e) => ({
      _id: e._id,
      startTime: formatTime(e.start),
      endTime: e.end ? formatTime(e.end) : '17:00',
      type: e.type,
      note: e.note ?? '',
    }));
    setEditDialogEntries(rows);
    setEditDialogOriginalIds(day.entries.map((e) => e._id));
    setEditDialogOpen(true);
  };

  const handleCloseEdit = () => {
    setEditDialogOpen(false);
    setEditDialogDate(null);
    setEditDialogEntries([]);
    setEditDialogOriginalIds([]);
  };

  const handleEditRowChange = (index: number, field: keyof EditRow, value: string) => {
    setEditDialogEntries((prev) => {
      const next = [...prev];
      (next[index] as Record<string, string>)[field] = value;
      return next;
    });
  };

  const handleDeleteEditRow = (index: number) => {
    setEditDialogEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddEditRow = () => {
    setEditDialogEntries((prev) => [...prev, { startTime: '08:00', endTime: '17:00', type: 'work', note: '' }]);
  };

  const handleSaveEdit = async () => {
    if (!editDialogDate || !myStaffId) return;
    setEditSaveLoading(true);
    try {
      const idsToDelete = editDialogOriginalIds.filter((id) => !editDialogEntries.some((e) => e._id === id));
      for (const id of idsToDelete) {
        await dispatch(deleteTimeEntry(id)).unwrap();
      }
      for (const row of editDialogEntries) {
        if (!row._id) {
          await dispatch(
            createTimeEntry({
              date: editDialogDate,
              start: row.startTime,
              end: row.endTime,
              type: row.type,
              note: row.note || undefined,
            })
          ).unwrap();
        } else {
          const startISO = new Date(`${editDialogDate}T${row.startTime}:00`).toISOString();
          const endISO = new Date(`${editDialogDate}T${row.endTime}:00`).toISOString();
          await dispatch(
            updateTimeEntry({
              id: row._id,
              start: startISO,
              end: endISO,
              type: row.type,
              note: row.note || undefined,
            })
          ).unwrap();
        }
      }
      await dispatch(fetchMonthlyReport({ month, staffId: myStaffId })).unwrap();
      handleCloseEdit();
      setSnackbar({ open: true, message: 'Zeiteinträge gespeichert.', severity: 'success' });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Fehler beim Speichern';
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setEditSaveLoading(false);
    }
  };

  if (profileError && !myStaffId) {
    return (
      <Box sx={{ marginTop: marginTopValue }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Stundenabrechnung
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          {profileError} Die Stundenabrechnung ist nur mit einem Personalprofil verfügbar.
          <Button component={Link} to="/staff-planning" sx={{ ml: 1 }}>
            Zur Mitarbeiterplanung
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ marginTop: marginTopValue }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="h5" component="h1" gutterBottom sx={{ mb: 0 }}>
          Stundenabrechnung
        </Typography>
        <Tooltip title="Hilfe & Leitfaden">
          <IconButton onClick={() => setHelpDialogOpen(true)} color="primary" size="small" aria-label="Hilfe öffnen">
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography variant="subtitle1" className="print-only" sx={{ display: 'none', mb: 1 }}>
        {monthDisplay}
      </Typography>

      <Box className="no-print">
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
          <IconButton onClick={handlePrevMonth} aria-label="Vormonat" size="small">
            <ChevronLeft />
          </IconButton>
          <Button variant="outlined" size="small" onClick={handleCurrentMonth} aria-label="Aktueller Monat">
            Aktuell
          </Button>
          <Typography variant="h6" sx={{ minWidth: 180, textAlign: 'center' }}>
            {monthDisplay}
          </Typography>
          <IconButton onClick={handleNextMonth} aria-label="Nächster Monat" size="small">
            <ChevronRight />
          </IconButton>
          {report && (
            <>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                endIcon={<KeyboardArrowDownIcon />}
                onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                aria-label="Export"
                aria-haspopup="true"
                aria-controls={exportMenuAnchor ? 'export-menu' : undefined}
              >
                Export
              </Button>
              <Menu
                id="export-menu"
                anchorEl={exportMenuAnchor}
                open={Boolean(exportMenuAnchor)}
                onClose={() => setExportMenuAnchor(null)}
                MenuListProps={{ 'aria-labelledby': 'export-button' }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem
                  onClick={() => {
                    exportAsCSV(report, monthDisplay);
                    setExportMenuAnchor(null);
                  }}
                >
                  Als CSV herunterladen
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    exportAsPDF(report, monthDisplay);
                    setExportMenuAnchor(null);
                  }}
                >
                  Als PDF herunterladen
                </MenuItem>
              </Menu>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} aria-label="Drucken">
                Drucken
              </Button>
            </>
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {loading && !report ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : report ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" stickyHeader aria-label="Stundenabrechnung">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Datum</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Arbeitszeit (Start–Ende)</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Pause</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Ist (h)</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Soll (h)</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Saldo</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell className="no-print" sx={{ fontWeight: 600 }} align="center">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.days.map((day: ReportDay) => {
                const weekend = isWeekend(day.date);
                const isHoliday = !!day.holiday;
                const dateLabel = format(new Date(day.date), 'EEE d. MMM', { locale: de });
                const breakH = getBreakHours(day.entries);
                const statusText = day.absence
                  ? ABSENCE_LABELS[day.absence] ?? day.absence
                  : day.holiday
                    ? `Feiertag: ${day.holiday}`
                    : '–';
                return (
                  <TableRow
                    key={day.date}
                    sx={{
                      bgcolor: weekend || isHoliday ? 'action.hover' : undefined,
                    }}
                  >
                    <TableCell>{dateLabel}</TableCell>
                    <TableCell>{formatWorkRanges(day.entries)}</TableCell>
                    <TableCell>{breakH > 0 ? `${breakH} h` : '–'}</TableCell>
                    <TableCell align="right">{day.actual.toFixed(1)}</TableCell>
                    <TableCell align="right">{day.target.toFixed(1)}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: day.balance > 0 ? 'success.main' : day.balance < 0 ? 'error.main' : undefined,
                        fontWeight: day.balance !== 0 ? 600 : undefined,
                      }}
                    >
                      {day.balance > 0 ? '+' : ''}{day.balance.toFixed(1)}
                    </TableCell>
                    <TableCell>{statusText}</TableCell>
                    <TableCell className="no-print" align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEdit(day)}
                        aria-label={`Zeiteinträge bearbeiten am ${dateLabel}`}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow sx={{ bgcolor: 'action.selected', fontWeight: 600 }}>
                <TableCell>Summe</TableCell>
                <TableCell />
                <TableCell />
                <TableCell align="right">{report.summary.totalActual.toFixed(1)}</TableCell>
                <TableCell align="right">{report.summary.totalTarget.toFixed(1)}</TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color:
                      report.summary.totalBalance > 0
                        ? 'success.main'
                        : report.summary.totalBalance < 0
                          ? 'error.main'
                          : undefined,
                    fontWeight: 600,
                  }}
                >
                  {report.summary.totalBalance > 0 ? '+' : ''}{report.summary.totalBalance.toFixed(1)}
                </TableCell>
                <TableCell />
                <TableCell className="no-print" />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">Keine Daten für diesen Monat.</Alert>
      )}

      <Dialog open={editDialogOpen} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
        <DialogTitle>
          Zeiteinträge bearbeiten am {editDialogDate ? format(new Date(editDialogDate), 'EEE d. MMM', { locale: de }) : ''}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {editDialogEntries.map((row, index) => (
              <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <TextField
                    label="Start"
                    type="time"
                    value={row.startTime}
                    onChange={(e) => handleEditRowChange(index, 'startTime', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    sx={{ minWidth: 100 }}
                  />
                  <TextField
                    label="Ende"
                    type="time"
                    value={row.endTime}
                    onChange={(e) => handleEditRowChange(index, 'endTime', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    sx={{ minWidth: 100 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Typ</InputLabel>
                    <Select
                      value={row.type}
                      label="Typ"
                      onChange={(e) => handleEditRowChange(index, 'type', e.target.value as 'work' | 'break')}
                    >
                      <MenuItem value="work">Arbeit</MenuItem>
                      <MenuItem value="break">Pause</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Notiz"
                    value={row.note}
                    onChange={(e) => handleEditRowChange(index, 'note', e.target.value)}
                    size="small"
                    sx={{ flex: 1, minWidth: 120 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteEditRow(index)}
                    aria-label="Eintrag löschen"
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Paper>
            ))}
            <Button startIcon={<AddIcon />} onClick={handleAddEditRow} variant="outlined" size="small">
              Eintrag hinzufügen
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={editSaveLoading}>
            {editSaveLoading ? 'Speichern…' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} maxWidth="md" fullWidth>
        <GradientDialogTitle title="Hilfe: Stundenabrechnung" onClose={() => setHelpDialogOpen(false)} />
        <DialogContent dividers>
          <Tabs value={helpTab} onChange={(_, v) => setHelpTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tab label="Übersicht" id="help-tab-0" aria-controls="help-panel-0" />
            <Tab label="Monat & Tabelle" id="help-tab-1" aria-controls="help-panel-1" />
            <Tab label="Bearbeiten" id="help-tab-2" aria-controls="help-panel-2" />
            <Tab label="Drucken & Export" id="help-tab-3" aria-controls="help-panel-3" />
            <Tab label="Feiertage" id="help-tab-4" aria-controls="help-panel-4" />
          </Tabs>
          {helpTab === 0 && (
            <Box role="tabpanel" id="help-panel-0" aria-labelledby="help-tab-0">
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Was ist die Stundenabrechnung?</Typography>
              <Typography paragraph>
                Die Stundenabrechnung zeigt Ihre erfassten Arbeitszeiten pro Monat: pro Tag die Arbeitszeit (Start–Ende), Pausen, Ist-Stunden, Soll-Stunden (aus Ihrem Personalprofil: Wochenstunden / 5 für Mo–Fr), Saldo und Status (z. B. Urlaub, Feiertag). Wochenenden und österreichische Feiertage haben Soll = 0. Am Ende des Monats sehen Sie die Summen (Gesamtstunden, Überstunden-Saldo).
              </Typography>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Voraussetzung</Typography>
              <Typography paragraph>
                Sie benötigen ein Personalprofil (Mitarbeiterplanung → Personal). Die Zeiterfassung (Kommen/Gehen/Pause) erfolgt auf der Seite „Mitarbeiterplanung“ im Dashboard. Vergessene Zeiten können Sie hier pro Tag nachtragen oder korrigieren.
              </Typography>
            </Box>
          )}
          {helpTab === 1 && (
            <Box role="tabpanel" id="help-panel-1" aria-labelledby="help-tab-1">
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Monat wählen</Typography>
              <Typography paragraph>
                Oben links: „Vormonat“, „Aktuell“, „Nächster Monat“ – damit wählen Sie den anzuzeigenden Monat. Die Tabelle listet jeden Tag des Monats mit den erfassten Zeiteinträgen.
              </Typography>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Spalten</Typography>
              <Typography paragraph>
                <strong>Datum:</strong> Wochentag und Datum.<br />
                <strong>Arbeitszeit (Start–Ende):</strong> Alle Arbeitseinträge (type „Arbeit“) des Tages, z. B. 08:00–12:30, 13:30–17:00.<br />
                <strong>Pause:</strong> Summe der Pausenzeiten (type „Pause“) in Stunden.<br />
                <strong>Ist (h):</strong> Summe der Arbeitsstunden des Tages.<br />
                <strong>Soll (h):</strong> Erwartete Stunden (Mo–Fr: Wochenstunden/5; Sa/So und Feiertage: 0).<br />
                <strong>Saldo:</strong> Ist minus Soll (Überstunden positiv, Minusstunden negativ). Bei Abwesenheit (Urlaub/Krank) gilt Saldo 0.<br />
                <strong>Status:</strong> Urlaub, Krankenstand, Training usw. oder „Feiertag: Name“ bei österreichischen Feiertagen.
              </Typography>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Wochenende & Feiertage</Typography>
              <Typography paragraph>
                Samstag und Sonntag sowie österreichische gesetzliche Feiertage sind grau hinterlegt; Soll-Stunden sind 0. Die Feiertage werden automatisch berücksichtigt (z. B. Neujahr, Nationalfeiertag, Christtag).
              </Typography>
            </Box>
          )}
          {helpTab === 2 && (
            <Box role="tabpanel" id="help-panel-2" aria-labelledby="help-tab-2">
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Zeiteinträge bearbeiten</Typography>
              <Typography paragraph>
                In der Spalte „Aktionen“ können Sie pro Tag auf das Stift-Icon klicken. Es öffnet sich der Dialog „Zeiteinträge bearbeiten am [Datum]“. Dort sehen Sie alle Einträge des Tages mit Start, Ende, Typ (Arbeit/Pause) und Notiz. Sie können Zeiten ändern, Einträge löschen (Papierkorb) oder einen neuen Eintrag hinzufügen („Eintrag hinzufügen“). Mit „Speichern“ werden Änderungen an den Server gesendet und die Tabelle neu geladen.
              </Typography>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Hinweis</Typography>
              <Typography paragraph>
                Nur eigene Einträge (bzw. Admins) dürfen bearbeitet werden. Start muss vor Ende liegen. Bei neuen Einträgen werden Von-/Bis-Datum des Tages verwendet; die Uhrzeiten werden in Ihrer lokalen Zeitzone gespeichert.
              </Typography>
            </Box>
          )}
          {helpTab === 3 && (
            <Box role="tabpanel" id="help-panel-3" aria-labelledby="help-tab-3">
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Drucken</Typography>
              <Typography paragraph>
                Der Button „Drucken“ öffnet den Druckdialog des Browsers (window.print()). Beim Druck werden Monatswähler, Export- und Druck-Button sowie die Spalte „Aktionen“ ausgeblendet. Es wird nur der Titel „Stundenabrechnung“, die Monatsanzeige und die Tabelle inkl. Summenzeile im Querformat gedruckt.
              </Typography>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Export</Typography>
              <Typography paragraph>
                Über „Export“ können Sie die Daten als <strong>CSV</strong> (für Excel/Sheets) oder als <strong>PDF</strong> herunterladen. Die gleichen Spalten wie in der Tabelle werden exportiert (Datum, Arbeitszeit, Pause, Ist, Soll, Saldo, Status).
              </Typography>
            </Box>
          )}
          {helpTab === 4 && (
            <Box role="tabpanel" id="help-panel-4" aria-labelledby="help-tab-4">
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Österreichische Feiertage</Typography>
              <Typography paragraph>
                Gesetzliche Feiertage in Österreich (bundesweit) werden automatisch berücksichtigt: An diesen Tagen ist das Soll 0 Stunden (wie am Wochenende), und die Zeile wird grau hinterlegt. In der Spalte „Status“ steht z. B. „Feiertag: Neujahr“ oder „Feiertag: Nationalfeiertag“.
              </Typography>
              <Typography variant="subtitle1" gutterBottom fontWeight={600}>Feste und bewegliche Feiertage</Typography>
              <Typography paragraph>
                Berücksichtigt werden u. a. Neujahr, Heilige Drei Könige, Staatsfeiertag (1. Mai), Mariä Himmelfahrt, Nationalfeiertag, Allerheiligen, Mariä Empfängnis, Christtag, Stefanitag sowie die beweglichen Feiertage Ostermontag, Christi Himmelfahrt, Pfingstmontag und Fronleichnam.
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Timesheet;
