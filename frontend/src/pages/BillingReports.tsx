// Abrechnungsberichte - Vollständige Integration aller billing-reports Endpunkte

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  Assessment,
  Download,
  DateRange,
  TrendingUp,
  AttachMoney,
  Receipt,
  LocalHospital,
  Refresh,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';

interface BillingSummary {
  byBillingType: Array<{
    _id: string;
    count: number;
    totalAmount: number;
    totalCopay: number;
    totalInsuranceAmount: number;
  }>;
  byStatus: Array<{
    _id: string;
    count: number;
    totalAmount: number;
  }>;
  totals: {
    totalInvoices: number;
    totalAmount: number;
    totalCopay: number;
    totalInsuranceAmount: number;
  };
  period: {
    startDate: string | null;
    endDate: string | null;
  };
}

interface InsuranceReport {
  provider: string;
  count: number;
  totalAmount: number;
  byBillingType: Record<string, { count: number; totalAmount: number }>;
}

interface ReimbursementReport {
  reimbursements: any[];
  statistics: Array<{
    _id: string;
    count: number;
    totalRequested: number;
    totalApproved: number;
    totalRejected: number;
  }>;
  totals: {
    totalRequested: number;
    totalApproved: number;
    totalPending: number;
  };
}

interface MonthlyReport {
  period: { year: number; month: number };
  daily: Array<{
    date: Date;
    count: number;
    totalAmount: number;
    byBillingType: Record<string, { count: number; totalAmount: number }>;
  }>;
  totals: {
    totalInvoices: number;
    totalAmount: number;
  };
}

const BillingReports: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [insuranceReport, setInsuranceReport] = useState<InsuranceReport[]>([]);
  const [reimbursementReport, setReimbursementReport] = useState<ReimbursementReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);

  useEffect(() => {
    if (activeTab === 0) {
      loadSummary();
    } else if (activeTab === 1) {
      loadInsuranceReport();
    } else if (activeTab === 2) {
      loadReimbursementReport();
    } else if (activeTab === 3) {
      loadMonthlyReport();
    }
  }, [activeTab, startDate, endDate, selectedYear, selectedMonth]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      
      const response = await api.get<any>(`/billing-reports/summary?${params.toString()}`);
      if (response.success && response.data) {
        // Die API gibt {success: true, data: {byBillingType: [...], byStatus: [...], totals: {...}, period: {...}}}
        // Sicherstellen, dass alle Felder vorhanden sind
        const summaryData = response.data;
        setSummary({
          byBillingType: summaryData.byBillingType || [],
          byStatus: summaryData.byStatus || [],
          totals: summaryData.totals || {
            totalInvoices: 0,
            totalAmount: 0,
            totalCopay: 0,
            totalInsuranceAmount: 0
          },
          period: summaryData.period || {}
        });
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Zusammenfassung', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadInsuranceReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      
      const response = await api.get<any>(`/billing-reports/by-insurance?${params.toString()}`);
      if (response.success && response.data) {
        // Sicherstellen, dass es ein Array ist
        const data = Array.isArray(response.data) ? response.data : [];
        setInsuranceReport(data);
      } else {
        setInsuranceReport([]);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden des Versicherungsberichts', { variant: 'error' });
      setInsuranceReport([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReimbursementReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      
      const response = await api.get<any>(`/billing-reports/reimbursements?${params.toString()}`);
      if (response.success && response.data) {
        const data = response.data;
        setReimbursementReport({
          reimbursements: Array.isArray(data.reimbursements) ? data.reimbursements : [],
          statistics: Array.isArray(data.statistics) ? data.statistics : [],
          totals: data.totals || {
            totalRequested: 0,
            totalApproved: 0,
            totalPending: 0
          }
        });
      } else {
        setReimbursementReport(null);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Erstattungsübersicht', { variant: 'error' });
      setReimbursementReport(null);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyReport = async () => {
    setLoading(true);
    try {
      const response = await api.get<any>(`/billing-reports/monthly?year=${selectedYear}&month=${selectedMonth}`);
      if (response.success && response.data) {
        const data = response.data;
        setMonthlyReport({
          period: data.period || { year: selectedYear, month: selectedMonth },
          daily: Array.isArray(data.daily) ? data.daily.map((day: any) => ({
            ...day,
            date: day.date ? new Date(day.date) : new Date()
          })) : [],
          totals: data.totals || {
            totalInvoices: 0,
            totalAmount: 0
          }
        });
      } else {
        setMonthlyReport(null);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden des Monatsberichts', { variant: 'error' });
      setMonthlyReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      
      const response = await api.get(`/billing-reports/export/excel?${params.toString()}`, {
        responseType: 'blob'
      } as any);
      
      if (response.success) {
        const blob = response.data instanceof Blob ? response.data : new Blob([response.data as BlobPart]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Abrechnungen_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        a.click();
        enqueueSnackbar('Excel-Export erfolgreich', { variant: 'success' });
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Excel-Export', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  };

  const getBillingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      kassenarzt: 'Kassenarzt',
      wahlarzt: 'Wahlarzt',
      privat: 'Privat',
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Entwurf',
      sent: 'Versendet',
      paid: 'Bezahlt',
      overdue: 'Überfällig',
      cancelled: 'Storniert',
    };
    return labels[status] || status;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Abrechnungsberichte
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Detaillierte Auswertungen und Statistiken
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExportExcel}
            disabled={loading}
          >
            Excel exportieren
          </Button>
        </Box>

        <Paper sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Zusammenfassung" icon={<Assessment />} />
            <Tab label="Nach Versicherung" icon={<LocalHospital />} />
            <Tab label="Erstattungen" icon={<AttachMoney />} />
            <Tab label="Monatlich" icon={<DateRange />} />
          </Tabs>
        </Paper>

        {/* Filter */}
        {activeTab !== 3 && (
          <Card sx={{ mb: 3, p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <DatePicker
                label="Von"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{ textField: { size: 'small' } }}
              />
              <DatePicker
                label="Bis"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{ textField: { size: 'small' } }}
              />
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => {
                  if (activeTab === 0) loadSummary();
                  else if (activeTab === 1) loadInsuranceReport();
                  else if (activeTab === 2) loadReimbursementReport();
                }}
              >
                Aktualisieren
              </Button>
            </Box>
          </Card>
        )}

        {activeTab === 3 && (
          <Card sx={{ mb: 3, p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                label="Jahr"
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                size="small"
                sx={{ width: 120 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Monat</InputLabel>
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value as number)}
                  label="Monat"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <MenuItem key={m} value={m}>
                      {format(new Date(2000, m - 1, 1), 'MMMM', { locale: de })}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadMonthlyReport}
              >
                Aktualisieren
              </Button>
            </Box>
          </Card>
        )}

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Tab 0: Zusammenfassung */}
        {activeTab === 0 && summary && summary.totals && (
          <Grid container spacing={3}>
            <Grid size={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Gesamtstatistik
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                        <Typography variant="h4" color="primary.contrastText">
                          {summary.totals?.totalInvoices || 0}
                        </Typography>
                        <Typography variant="body2" color="primary.contrastText">
                          Rechnungen
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                        <Typography variant="h4" color="success.contrastText">
                          {formatAmount(summary.totals?.totalAmount || 0)}
                        </Typography>
                        <Typography variant="body2" color="success.contrastText">
                          Gesamtbetrag
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                        <Typography variant="h4" color="warning.contrastText">
                          {formatAmount(summary.totals?.totalCopay || 0)}
                        </Typography>
                        <Typography variant="body2" color="warning.contrastText">
                          Selbstbehalt
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                        <Typography variant="h4" color="info.contrastText">
                          {formatAmount(summary.totals?.totalInsuranceAmount || 0)}
                        </Typography>
                        <Typography variant="body2" color="info.contrastText">
                          Versicherungsanteil
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Nach Abrechnungstyp
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Typ</TableCell>
                          <TableCell align="right">Anzahl</TableCell>
                          <TableCell align="right">Betrag</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(summary.byBillingType || []).map((item) => (
                          <TableRow key={item._id}>
                            <TableCell>
                              <Chip label={getBillingTypeLabel(item._id)} size="small" />
                            </TableCell>
                            <TableCell align="right">{item.count}</TableCell>
                            <TableCell align="right">{formatAmount(item.totalAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Nach Status
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Anzahl</TableCell>
                          <TableCell align="right">Betrag</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(summary.byStatus || []).map((item) => (
                          <TableRow key={item._id}>
                            <TableCell>
                              <Chip label={getStatusLabel(item._id)} size="small" />
                            </TableCell>
                            <TableCell align="right">{item.count}</TableCell>
                            <TableCell align="right">{formatAmount(item.totalAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tab 1: Nach Versicherung */}
        {activeTab === 1 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Abrechnungen nach Versicherung
              </Typography>
              {Array.isArray(insuranceReport) && insuranceReport.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Versicherung</TableCell>
                        <TableCell align="right">Anzahl</TableCell>
                        <TableCell align="right">Gesamtbetrag</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {insuranceReport.map((item) => (
                        <TableRow key={item.provider}>
                          <TableCell>
                            <Typography variant="body1" fontWeight="medium">
                              {item.provider}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{item.count}</TableCell>
                          <TableCell align="right">{formatAmount(item.totalAmount)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {item.byBillingType && Object.entries(item.byBillingType).map(([type, data]: [string, any]) => (
                                <Chip
                                  key={type}
                                  label={`${getBillingTypeLabel(type)}: ${data.count} (${formatAmount(data.totalAmount)})`}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">Keine Daten verfügbar</Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab 2: Erstattungen */}
        {activeTab === 2 && reimbursementReport && (
          <Grid container spacing={3}>
            <Grid size={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Erstattungsübersicht
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                        <Typography variant="h5" color="info.contrastText">
                          {formatAmount(reimbursementReport.totals?.totalRequested || 0)}
                        </Typography>
                        <Typography variant="body2" color="info.contrastText">
                          Beantragt
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                        <Typography variant="h5" color="success.contrastText">
                          {formatAmount(reimbursementReport.totals?.totalApproved || 0)}
                        </Typography>
                        <Typography variant="body2" color="success.contrastText">
                          Genehmigt
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                        <Typography variant="h5" color="warning.contrastText">
                          {reimbursementReport.totals?.totalPending || 0}
                        </Typography>
                        <Typography variant="body2" color="warning.contrastText">
                          Ausstehend
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Nach Status
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Anzahl</TableCell>
                          <TableCell align="right">Beantragt</TableCell>
                          <TableCell align="right">Genehmigt</TableCell>
                          <TableCell align="right">Abgelehnt</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(reimbursementReport.statistics || []).map((stat) => (
                          <TableRow key={stat._id}>
                            <TableCell>
                              <Chip label={getStatusLabel(stat._id)} size="small" />
                            </TableCell>
                            <TableCell align="right">{stat.count}</TableCell>
                            <TableCell align="right">{formatAmount(stat.totalRequested || 0)}</TableCell>
                            <TableCell align="right">{formatAmount(stat.totalApproved || 0)}</TableCell>
                            <TableCell align="right">{formatAmount(stat.totalRejected || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tab 3: Monatlich */}
        {activeTab === 3 && monthlyReport && (
          <Grid container spacing={3}>
            <Grid size={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Monatliche Übersicht - {format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy', { locale: de })}
                  </Typography>
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="body1">
                      <strong>Gesamt:</strong> {monthlyReport.totals?.totalInvoices || 0} Rechnungen, {formatAmount(monthlyReport.totals?.totalAmount || 0)}
                    </Typography>
                  </Box>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Datum</TableCell>
                          <TableCell align="right">Anzahl</TableCell>
                          <TableCell align="right">Betrag</TableCell>
                          <TableCell>Details</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(monthlyReport.daily || []).map((day) => (
                          <TableRow key={day.date ? day.date.toISOString() : Math.random()}>
                            <TableCell>
                              {day.date ? format(day.date, 'dd.MM.yyyy', { locale: de }) : 'N/A'}
                            </TableCell>
                            <TableCell align="right">{day.count || 0}</TableCell>
                            <TableCell align="right">{formatAmount(day.totalAmount || 0)}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {day.byBillingType && Object.entries(day.byBillingType).map(([type, data]: [string, any]) => (
                                  <Chip
                                    key={type}
                                    label={`${getBillingTypeLabel(type)}: ${data.count || 0}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                ))}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {!loading && activeTab === 0 && !summary && (
          <Alert severity="info">Keine Daten verfügbar</Alert>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default BillingReports;

