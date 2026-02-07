// Auswertung: welche Leistungen welcher Benutzer erbracht hat

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  Assessment,
  Refresh,
  ExpandMore,
  ExpandLess,
  Person,
  MedicalServices,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import api from '../utils/api';
import { useSnackbar } from 'notistack';

interface ServiceRow {
  serviceCode: string;
  serviceDescription: string;
  count: number;
  totalQuantity: number;
  totalAmount: number;
}

interface UserPerformance {
  userId: string;
  userDisplayName: string | null;
  services: ServiceRow[];
  totalCount: number;
  totalAmount: number;
}

const ServicePerformanceReport: React.FC = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UserPerformance[]>([]);
  const [users, setUsers] = useState<Array<{ _id: string; firstName: string; lastName: string }>>([]);
  const [startDate, setStartDate] = useState<Date>(startOfMonth(subMonths(new Date(), 1)));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(subMonths(new Date(), 1)));
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get<{ success?: boolean; data?: Array<{ _id: string; firstName: string; lastName: string }> }>('/users?limit=500');
      if (res.success && Array.isArray(res.data)) {
        setUsers(res.data);
      }
    } catch (e) {
      console.error('Error loading users:', e);
    }
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      if (selectedUserId) params.append('userId', selectedUserId);

      const response = await api.get<{ success: boolean; data: UserPerformance[] }>(
        `/billing-reports/performances-by-user?${params.toString()}`
      );
      if (response.success && Array.isArray(response.data)) {
        setData(response.data);
        setExpandedUserIds(new Set(response.data.map((u) => u.userId)));
      } else {
        setData([]);
      }
    } catch (error: unknown) {
      console.error('Error loading performances-by-user:', error);
      enqueueSnackbar('Fehler beim Laden der Leistungsauswertung', { variant: 'error' });
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedUserId, enqueueSnackbar]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const handleToggleExpand = (userId: string) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(value);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Assessment sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Leistungsauswertung pro Benutzer
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            Auswertung, welche Leistungen welcher Benutzer erbracht hat (basierend auf erfassten Leistungen/Abrechnungsdaten).
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              alignItems: 'flex-end',
            }}
          >
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
              <DatePicker
                label="Von"
                value={startDate}
                onChange={(d) => d && setStartDate(d)}
                slotProps={{ textField: { size: 'small' } }}
              />
              <DatePicker
                label="Bis"
                value={endDate}
                onChange={(d) => d && setEndDate(d)}
                slotProps={{ textField: { size: 'small' } }}
              />
            </LocalizationProvider>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="user-filter-label">Benutzer (optional)</InputLabel>
              <Select
                labelId="user-filter-label"
                value={selectedUserId}
                label="Benutzer (optional)"
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <MenuItem value="">Alle Benutzer</MenuItem>
                {users.map((u) => (
                  <MenuItem key={u._id} value={u._id}>
                    {u.firstName} {u.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={loadReport}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} /> : <Refresh />}
            >
              {loading ? 'Laden…' : 'Aktualisieren'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && data.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <MedicalServices sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography color="text.secondary">
            Im gewählten Zeitraum wurden keine Leistungen pro Benutzer gefunden.
          </Typography>
        </Paper>
      )}

      {!loading && data.length > 0 && (
        <TableContainer component={Paper} elevation={2}>
          <Table size="small" aria-label="Leistungen pro Benutzer">
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.grey[100] }}>
                <TableCell width={48} />
                <TableCell><strong>Benutzer</strong></TableCell>
                <TableCell align="right"><strong>Anzahl Leistungen</strong></TableCell>
                <TableCell align="right"><strong>Summe (€)</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row) => {
                const isExpanded = expandedUserIds.has(row.userId);
                return (
                  <React.Fragment key={row.userId}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleExpand(row.userId)}
                          aria-label={isExpanded ? 'Zuklappen' : 'Aufklappen'}
                        >
                          {isExpanded ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person color="action" fontSize="small" />
                          {row.userDisplayName || row.userId}
                        </Box>
                      </TableCell>
                      <TableCell align="right">{row.totalCount}</TableCell>
                      <TableCell align="right">{formatCurrency(row.totalAmount)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={4} sx={{ py: 0, borderBottom: 'none' }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Leistungscode</TableCell>
                                  <TableCell>Bezeichnung</TableCell>
                                  <TableCell align="right">Anzahl</TableCell>
                                  <TableCell align="right">Menge</TableCell>
                                  <TableCell align="right">Summe (€)</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {row.services.map((srv, idx) => (
                                  <TableRow key={`${srv.serviceCode}-${idx}`}>
                                    <TableCell>{srv.serviceCode}</TableCell>
                                    <TableCell>{srv.serviceDescription}</TableCell>
                                    <TableCell align="right">{srv.count}</TableCell>
                                    <TableCell align="right">{srv.totalQuantity}</TableCell>
                                    <TableCell align="right">{formatCurrency(srv.totalAmount)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ServicePerformanceReport;
