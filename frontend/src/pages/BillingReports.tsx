// Professionelle Abrechnungsberichte mit erweiterten Analysen

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Autocomplete,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse,
  List,
  ListItem,
  ListItemText,
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
  People,
  MedicalServices,
  ShowChart,
  BarChart,
  PieChart,
  Info,
  HelpOutline,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import { LineChart, BarChart as RechartsBarChart, PieChart as RechartsPieChart, Line, Bar, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ComposedChart, Area, AreaChart } from 'recharts';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Interfaces
interface PatientAnalysis {
  patientId: string;
  patientName: string;
  totalInvoices: number;
  totalAmount: number;
  invoices: Array<{
    invoiceDate: string;
    totalAmount: number;
    billingType: string;
    status: string;
  }>;
  byBillingType: Record<string, { count: number; totalAmount: number }>;
  byMonth: Array<{ month: string; count: number; totalAmount: number }>;
  services: Array<{
    serviceCode: string;
    description: string;
    count: number;
    totalAmount: number;
    category: string;
  }>;
}

interface ServiceAnalysis {
  serviceCode: string;
  description: string;
  category: string;
  count: number;
  totalQuantity: number;
  totalAmount: number;
  averagePrice: number;
  byMonth: Array<{ month: string; count: number; totalAmount: number }>;
  byBillingType: Array<{ type: string; count: number; totalAmount: number }>;
}

interface TrendData {
  period: string;
  totalInvoices: number;
  totalAmount: number;
  byBillingType: Array<{ type: string; count: number; totalAmount: number }>;
  byStatus: Array<{ status: string; count: number; totalAmount: number }>;
  averageInvoiceAmount: number;
}

interface ProfitabilityData {
  serviceCode: string;
  description: string;
  category: string;
  count: number;
  totalQuantity: number;
  totalAmount: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  revenuePerInvoice: number;
  profitabilityScore: number;
}

interface EfficiencyData {
  serviceCode: string;
  description: string;
  category: string;
  count: number;
  totalQuantity: number;
  totalRevenue: number;
  totalDuration: number;
  revenuePerMinute: number;
  averageDuration: number;
  averageRevenue: number;
  efficiencyScore: number;
}

interface NoShowData {
  summary: {
    totalScheduled: number;
    totalNoShows: number;
    noShowRate: string;
    lostRevenue: number;
    lostRevenueCents: number;
  };
  byMonth: Array<{
    month: string;
    count: number;
    lostRevenue: number;
  }>;
  details: Array<{
    date: string;
    type: string;
    serviceName: string;
    lostRevenue: number;
    duration: number;
  }>;
}

interface BillingOptimizerData {
  summary: {
    totalInvoices: number;
    invoicesWithMissingCodes: number;
    totalMissingCodes: number;
    potentialRevenue: number;
    potentialRevenueCents: number;
  };
  missingCodes: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    patientName: string;
    description: string;
    suggestedCode: string;
    suggestedService: string;
    potentialRevenue: number;
  }>;
}

const BillingReports: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(startOfMonth(subMonths(new Date(), 1)));
  const [endDate, setEndDate] = useState<Date | null>(endOfMonth(new Date()));
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  
  // Data states
  const [patientAnalysis, setPatientAnalysis] = useState<PatientAnalysis[]>([]);
  const [serviceAnalysis, setServiceAnalysis] = useState<ServiceAnalysis[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [profitability, setProfitability] = useState<ProfitabilityData[]>([]);
  const [efficiency, setEfficiency] = useState<EfficiencyData[]>([]);
  const [noShow, setNoShow] = useState<NoShowData | null>(null);
  const [billingOptimizer, setBillingOptimizer] = useState<BillingOptimizerData | null>(null);
  const [patients, setPatients] = useState<Array<{ _id: string; firstName: string; lastName: string }>>([]);

  // Load patients for autocomplete
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const response = await api.get<any>('/patients');
        if (response.success && response.data) {
          const patientList = Array.isArray(response.data) ? response.data : response.data.patients || [];
          setPatients(patientList.map((p: any) => ({
            _id: p._id || p.id,
            firstName: p.firstName || p.first_name || '',
            lastName: p.lastName || p.last_name || ''
          })));
        }
      } catch (error) {
        console.error('Error loading patients:', error);
      }
    };
    loadPatients();
  }, []);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 0) {
      loadPatientAnalysis();
    } else if (activeTab === 1) {
      loadServiceAnalysis();
    } else if (activeTab === 2) {
      loadTrends();
    } else if (activeTab === 3) {
      loadProfitability();
    } else if (activeTab === 4) {
      // Lade alle drei Analysen parallel
      Promise.all([
        loadEfficiency(),
        loadNoShow(),
        loadBillingOptimizer()
      ]);
    }
  }, [activeTab, startDate, endDate, selectedPatient, groupBy]);

  const loadPatientAnalysis = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      if (selectedPatient) params.append('patientId', selectedPatient);
      
      const response = await api.get<any>(`/billing-reports/patient-analysis?${params.toString()}`);
      if (response.success && response.data) {
        setPatientAnalysis(response.data);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Patient-Analyse', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadServiceAnalysis = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      
      const response = await api.get<any>(`/billing-reports/service-analysis?${params.toString()}`);
      if (response.success && response.data) {
        setServiceAnalysis(response.data);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Leistungsanalyse', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadTrends = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      params.append('groupBy', groupBy);
      
      const response = await api.get<any>(`/billing-reports/trends?${params.toString()}`);
      if (response.success && response.data) {
        setTrends(response.data);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Trend-Analyse', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadProfitability = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      
      const response = await api.get<any>(`/billing-reports/profitability?${params.toString()}`);
      if (response.success && response.data) {
        setProfitability(response.data);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Profitabilitäts-Analyse', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadEfficiency = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      
      const response = await api.get<any>(`/billing-reports/efficiency?${params.toString()}`);
      if (response.success && response.data) {
        setEfficiency(response.data);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Effizienz-Analyse', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadNoShow = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      
      const response = await api.get<any>(`/billing-reports/no-show?${params.toString()}`);
      if (response.success && response.data) {
        // Sicherstellen, dass summary, byMonth und details vorhanden sind
        const noShowData = {
          summary: response.data.summary || {
            totalScheduled: 0,
            totalNoShows: 0,
            noShowRate: '0.00',
            lostRevenue: 0,
            lostRevenueCents: 0
          },
          byMonth: response.data.byMonth || [],
          details: response.data.details || []
        };
        setNoShow(noShowData);
      } else {
        setNoShow(null);
      }
    } catch (error: any) {
      console.error('Error loading no-show analysis:', error);
      enqueueSnackbar('Fehler beim Laden der No-Show-Analyse', { variant: 'error' });
      setNoShow(null);
    }
  };

  const loadBillingOptimizer = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      
      const response = await api.get<any>(`/billing-reports/billing-optimizer?${params.toString()}`);
      if (response.success && response.data) {
        // Sicherstellen, dass summary und missingCodes vorhanden sind
        const optimizerData = {
          summary: response.data.summary || {
            totalInvoices: 0,
            invoicesWithMissingCodes: 0,
            totalMissingCodes: 0,
            potentialRevenue: 0,
            potentialRevenueCents: 0
          },
          missingCodes: response.data.missingCodes || []
        };
        setBillingOptimizer(optimizerData);
      } else {
        setBillingOptimizer(null);
      }
    } catch (error: any) {
      console.error('Error loading billing optimizer:', error);
      enqueueSnackbar('Fehler beim Laden des Abrechnungs-Optimierers', { variant: 'error' });
      setBillingOptimizer(null);
    }
  };

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  };

  const formatAmountFromCents = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Abrechnungsberichte
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Professionelle Auswertungen und Analysen für Rechnungen, Leistungen und Patienten
            </Typography>
          </Box>
        </Box>

        <Paper sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Patient-Analyse" icon={<People />} />
            <Tab label="Leistungsanalyse" icon={<MedicalServices />} />
            <Tab label="Trend-Analyse" icon={<TrendingUp />} />
            <Tab label="Profitabilität" icon={<BarChart />} />
            <Tab label="Effizienz-Analyse" icon={<ShowChart />} />
          </Tabs>
        </Paper>

        {/* Filter */}
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
            {activeTab === 0 && (
              <Autocomplete
                options={patients}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                value={patients.find(p => p._id === selectedPatient) || null}
                onChange={(event, newValue) => setSelectedPatient(newValue?._id || null)}
                renderInput={(params) => <TextField {...params} label="Patient" size="small" sx={{ minWidth: 200 }} />}
                sx={{ minWidth: 200 }}
              />
            )}
            {activeTab === 2 && (
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Gruppierung</InputLabel>
                <Select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as any)}
                  label="Gruppierung"
                >
                  <MenuItem value="day">Tag</MenuItem>
                  <MenuItem value="week">Woche</MenuItem>
                  <MenuItem value="month">Monat</MenuItem>
                  <MenuItem value="year">Jahr</MenuItem>
                </Select>
              </FormControl>
            )}
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => {
                if (activeTab === 0) loadPatientAnalysis();
                else if (activeTab === 1) loadServiceAnalysis();
                else if (activeTab === 2) loadTrends();
                else if (activeTab === 3) loadProfitability();
                else if (activeTab === 4) {
                  loadEfficiency();
                  loadNoShow();
                  loadBillingOptimizer();
                }
              }}
            >
              Aktualisieren
            </Button>
          </Box>
        </Card>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Tab 0: Patient-Analyse */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Info-Karte - immer sichtbar */}
            <Box>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6">
                      Patient-Analyse - Berechnungsmethode
                    </Typography>
                    <Tooltip 
                      title={
                        <Box sx={{ p: 1 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                            Patient-Analyse - Berechnungsmethode:
                          </Typography>
                          <Typography variant="body2" component="div">
                            <strong>Datenquellen:</strong>
                            <br />• Alle Rechnungen im gewählten Zeitraum
                            <br />• Gruppiert nach Patient (patient.id)
                            <br /><br />
                            <strong>Berechnungen:</strong>
                            <br />• <strong>Gesamtumsatz:</strong> Summe aller Rechnungsbeträge pro Patient
                            <br />• <strong>Ø pro Rechnung:</strong> Gesamtumsatz / Anzahl Rechnungen
                            <br />• <strong>Nach Monat:</strong> Aufschlüsselung der Ausgaben pro Monat
                            <br />• <strong>Nach Abrechnungstyp:</strong> Kassenarzt, Wahlarzt, Privat
                            <br />• <strong>Services:</strong> Welche Leistungen wurden für diesen Patient durchgeführt
                            <br /><br />
                            <strong>Chronologische Darstellung:</strong>
                            <br />Alle Rechnungen werden nach Datum sortiert angezeigt
                            <br />Ermöglicht Analyse der Behandlungsverläufe
                          </Typography>
                        </Box>
                      }
                      arrow
                      placement="right"
                    >
                      <IconButton 
                        size="small" 
                        sx={{ 
                          color: 'primary.main', 
                          ml: 0.5,
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          }
                        }}
                      >
                        <Info />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {patientAnalysis.length > 0 ? (
              <>
                <Box>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">
                          Übersicht: {patientAnalysis.length} {patientAnalysis.length === 1 ? 'Patient' : 'Patienten'}
                        </Typography>
                        <Tooltip 
                          title={
                            <Box sx={{ p: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                Patient-Analyse - Berechnungsmethode:
                              </Typography>
                              <Typography variant="body2" component="div">
                                <strong>Datenquellen:</strong>
                                <br />• Alle Rechnungen im gewählten Zeitraum
                                <br />• Gruppiert nach Patient (patient.id)
                                <br /><br />
                                <strong>Berechnungen:</strong>
                                <br />• <strong>Gesamtumsatz:</strong> Summe aller Rechnungsbeträge pro Patient
                                <br />• <strong>Ø pro Rechnung:</strong> Gesamtumsatz / Anzahl Rechnungen
                                <br />• <strong>Nach Monat:</strong> Aufschlüsselung der Ausgaben pro Monat
                                <br />• <strong>Nach Abrechnungstyp:</strong> Kassenarzt, Wahlarzt, Privat
                                <br />• <strong>Services:</strong> Welche Leistungen wurden für diesen Patient durchgeführt
                                <br /><br />
                                <strong>Chronologische Darstellung:</strong>
                                <br />Alle Rechnungen werden nach Datum sortiert angezeigt
                                <br />Ermöglicht Analyse der Behandlungsverläufe
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="right"
                        >
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: 'primary.main', 
                              ml: 0.5,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              }
                            }}
                          >
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box sx={{ mt: 2, mb: 2 }}>
                        <Typography variant="body1">
                          <strong>Gesamtumsatz:</strong> {formatAmountFromCents(
                            patientAnalysis.reduce((sum, p) => sum + p.totalAmount, 0)
                          )}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>

                {/* Chart: Top 10 Patienten nach Umsatz */}
                <Box>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Top 10 Patienten nach Umsatz
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart
                          data={patientAnalysis.slice(0, 10).map(p => ({
                            name: p.patientName.length > 20 ? p.patientName.substring(0, 20) + '...' : p.patientName,
                            umsatz: p.totalAmount / 100,
                            rechnungen: p.totalInvoices
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <RechartsTooltip formatter={(value: any) => formatAmountFromCents(value * 100)} />
                          <Legend />
                          <Bar dataKey="umsatz" fill="#0088FE" name="Umsatz (€)" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Box>

                {/* Tabelle: Detaillierte Patient-Analyse */}
                <Box>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">
                          Detaillierte Patient-Analyse
                        </Typography>
                        <Tooltip 
                          title={
                            <Box sx={{ p: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                Spalten-Erklärung:
                              </Typography>
                              <Typography variant="body2" component="div">
                                <strong>Rechnungen:</strong> Anzahl der Rechnungen für diesen Patient
                                <br /><br />
                                <strong>Gesamtbetrag:</strong> Summe aller Rechnungsbeträge (in Cent)
                                <br /><br />
                                <strong>Ø pro Rechnung:</strong> Durchschnittlicher Rechnungsbetrag
                                <br />Berechnung: Gesamtbetrag / Anzahl Rechnungen
                                <br /><br />
                                <strong>Details:</strong> Aufschlüsselung nach Abrechnungstyp
                                <br />Zeigt, wie viele Rechnungen welchen Typs (Kassenarzt, Wahlarzt, Privat)
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="right"
                        >
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: 'primary.main', 
                              ml: 0.5,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              }
                            }}
                          >
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Patient</TableCell>
                              <TableCell align="right">Rechnungen</TableCell>
                              <TableCell align="right">Gesamtbetrag</TableCell>
                              <TableCell align="right">Ø pro Rechnung</TableCell>
                              <TableCell>Details</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {patientAnalysis.map((patient) => (
                              <TableRow key={patient.patientId}>
                                <TableCell>
                                  <Typography variant="body1" fontWeight="medium">
                                    {patient.patientName}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">{patient.totalInvoices}</TableCell>
                                <TableCell align="right">{formatAmountFromCents(patient.totalAmount)}</TableCell>
                                <TableCell align="right">
                                  {formatAmountFromCents(
                                    patient.totalInvoices > 0 ? patient.totalAmount / patient.totalInvoices : 0
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {Object.entries(patient.byBillingType).map(([type, data]) => (
                                      <Chip
                                        key={type}
                                        label={`${type}: ${data.count} (${formatAmountFromCents(data.totalAmount)})`}
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
                </Box>
              </>
            ) : (
              <Box>
                <Alert severity="info">Keine Daten verfügbar für den ausgewählten Zeitraum</Alert>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 1: Leistungsanalyse */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Info-Karte - immer sichtbar */}
            <Box>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6">
                      Leistungsanalyse - Berechnungsmethode
                    </Typography>
                    <Tooltip 
                      title={
                        <Box sx={{ p: 1 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                            Leistungsanalyse - Berechnungsmethode:
                          </Typography>
                          <Typography variant="body2" component="div">
                            <strong>Datenquellen:</strong>
                            <br />• Alle Services aus Rechnungen im gewählten Zeitraum
                            <br />• Gruppiert nach serviceCode oder Beschreibung
                            <br /><br />
                            <strong>Berechnungen:</strong>
                            <br />• <strong>Anzahl:</strong> Wie oft wurde diese Leistung durchgeführt
                            <br />• <strong>Gesamtbetrag:</strong> Summe aller Umsätze für diese Leistung
                            <br />• <strong>Ø Preis:</strong> Durchschnittlicher Preis pro Leistung
                            <br />Berechnung: Gesamtbetrag / Gesamtmenge
                            <br />• <strong>Nach Monat:</strong> Entwicklung der Leistung über Zeit
                            <br />• <strong>Nach Abrechnungstyp:</strong> Verteilung Kassenarzt/Wahlarzt/Privat
                            <br /><br />
                            <strong>Kategorisierung:</strong>
                            <br />Leistungen werden nach ihrer Kategorie gruppiert
                            <br />Ermöglicht Analyse nach Leistungsgruppen
                          </Typography>
                        </Box>
                      }
                      arrow
                      placement="right"
                    >
                      <IconButton 
                        size="small" 
                        sx={{ 
                          color: 'primary.main', 
                          ml: 0.5,
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          }
                        }}
                      >
                        <Info />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {serviceAnalysis.length > 0 ? (
              <>
                <Box>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">
                          Übersicht: {serviceAnalysis.length} verschiedene Leistungen
                        </Typography>
                        <Tooltip 
                          title={
                            <Box sx={{ p: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                Leistungsanalyse - Berechnungsmethode:
                              </Typography>
                              <Typography variant="body2" component="div">
                                <strong>Datenquellen:</strong>
                                <br />• Alle Services aus Rechnungen im gewählten Zeitraum
                                <br />• Gruppiert nach serviceCode oder Beschreibung
                                <br /><br />
                                <strong>Berechnungen:</strong>
                                <br />• <strong>Anzahl:</strong> Wie oft wurde diese Leistung durchgeführt
                                <br />• <strong>Gesamtbetrag:</strong> Summe aller Umsätze für diese Leistung
                                <br />• <strong>Ø Preis:</strong> Durchschnittlicher Preis pro Leistung
                                <br />Berechnung: Gesamtbetrag / Gesamtmenge
                                <br />• <strong>Nach Monat:</strong> Entwicklung der Leistung über Zeit
                                <br />• <strong>Nach Abrechnungstyp:</strong> Verteilung Kassenarzt/Wahlarzt/Privat
                                <br /><br />
                                <strong>Kategorisierung:</strong>
                                <br />Leistungen werden nach ihrer Kategorie gruppiert
                                <br />Ermöglicht Analyse nach Leistungsgruppen
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="right"
                        >
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: 'primary.main', 
                              ml: 0.5,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              }
                            }}
                          >
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box sx={{ mt: 2, mb: 2 }}>
                        <Typography variant="body1">
                          <strong>Gesamtumsatz:</strong> {formatAmountFromCents(
                            serviceAnalysis.reduce((sum, s) => sum + s.totalAmount, 0)
                          )}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>

                {/* Chart: Top 15 Leistungen nach Umsatz */}
                <Box>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Top 15 Leistungen nach Umsatz
                      </Typography>
                      <ResponsiveContainer width="100%" height={400}>
                        <RechartsBarChart
                          layout="vertical"
                          data={serviceAnalysis.slice(0, 15).map(s => ({
                            name: s.description.length > 40 ? s.description.substring(0, 40) + '...' : s.description,
                            umsatz: s.totalAmount / 100,
                            anzahl: s.count
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={200} />
                          <RechartsTooltip formatter={(value: any) => formatAmountFromCents(value * 100)} />
                          <Legend />
                          <Bar dataKey="umsatz" fill="#00C49F" name="Umsatz (€)" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Box>

                {/* Chart: Verteilung nach Kategorie */}
                <Box sx={{ maxWidth: '50%' }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Verteilung nach Kategorie
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={Object.entries(
                              serviceAnalysis.reduce((acc, s) => {
                                const cat = s.category || 'Unbekannt';
                                acc[cat] = (acc[cat] || 0) + s.totalAmount;
                                return acc;
                              }, {} as Record<string, number>)
                            ).map(([name, value]) => ({ name, value: value / 100 }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) => {
                              const name = entry.name || '';
                              const percent = entry.percent || 0;
                              return `${name}: ${(percent * 100).toFixed(0)}%`;
                            }}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {Object.entries(
                              serviceAnalysis.reduce((acc, s) => {
                                const cat = s.category || 'Unbekannt';
                                acc[cat] = (acc[cat] || 0) + s.totalAmount;
                                return acc;
                              }, {} as Record<string, number>)
                            ).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value: any) => formatAmountFromCents(value * 100)} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Box>

                {/* Tabelle: Detaillierte Leistungsanalyse */}
                <Box>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">
                          Detaillierte Leistungsanalyse
                        </Typography>
                        <Tooltip 
                          title={
                            <Box sx={{ p: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                Spalten-Erklärung:
                              </Typography>
                              <Typography variant="body2" component="div">
                                <strong>Anzahl:</strong> Wie oft wurde diese Leistung durchgeführt
                                <br /><br />
                                <strong>Gesamtbetrag:</strong> Summe aller Umsätze für diese Leistung (in Cent)
                                <br /><br />
                                <strong>Ø Preis:</strong> Durchschnittlicher Preis pro Leistung
                                <br />Berechnung: Gesamtbetrag / Gesamtmenge (quantity)
                                <br /><br />
                                <strong>Kategorie:</strong> Leistungskategorie aus ServiceCatalog
                                <br />Ermöglicht Gruppierung und Vergleich ähnlicher Leistungen
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="right"
                        >
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: 'primary.main', 
                              ml: 0.5,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              }
                            }}
                          >
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Leistung</TableCell>
                              <TableCell>Kategorie</TableCell>
                              <TableCell align="right">Anzahl</TableCell>
                              <TableCell align="right">Gesamtbetrag</TableCell>
                              <TableCell align="right">Ø Preis</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {serviceAnalysis.map((service, index) => (
                              <TableRow key={service.serviceCode || index}>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium">
                                    {service.description}
                                  </Typography>
                                  {service.serviceCode && (
                                    <Typography variant="caption" color="text.secondary">
                                      Code: {service.serviceCode}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip label={service.category} size="small" />
                                </TableCell>
                                <TableCell align="right">{service.count}</TableCell>
                                <TableCell align="right">{formatAmountFromCents(service.totalAmount)}</TableCell>
                                <TableCell align="right">{formatAmountFromCents(service.averagePrice)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Box>
              </>
            ) : (
              <Box>
                <Alert severity="info">Keine Daten verfügbar für den ausgewählten Zeitraum</Alert>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 2: Trend-Analyse */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Info-Karte - immer sichtbar */}
            <Box>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6">
                      Trend-Analyse - Berechnungsmethode
                    </Typography>
                    <Tooltip 
                      title={
                        <Box sx={{ p: 1 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                            Trend-Analyse - Berechnungsmethode:
                          </Typography>
                          <Typography variant="body2" component="div">
                            <strong>Gruppierung:</strong>
                            <br />• Tag: Tägliche Aufschlüsselung
                            <br />• Woche: Wöchentliche Aufschlüsselung (Montag-Sonntag)
                            <br />• Monat: Monatliche Aufschlüsselung
                            <br />• Jahr: Jährliche Aufschlüsselung
                            <br /><br />
                            <strong>Berechnungen pro Periode:</strong>
                            <br />• <strong>Gesamtumsatz:</strong> Summe aller Rechnungsbeträge
                            <br />• <strong>Anzahl Rechnungen:</strong> Anzahl der erstellten Rechnungen
                            <br />• <strong>Ø pro Rechnung:</strong> Durchschnittlicher Rechnungsbetrag
                            <br />• <strong>Nach Abrechnungstyp:</strong> Verteilung Kassenarzt/Wahlarzt/Privat
                            <br />• <strong>Nach Status:</strong> Entwurf, Versendet, Bezahlt, Überfällig
                            <br /><br />
                            <strong>Interpretation:</strong>
                            <br />Zeigt Entwicklung des Umsatzes über Zeit
                            <br />Ermöglicht Erkennung von Trends und Saisonalität
                          </Typography>
                        </Box>
                      }
                      arrow
                      placement="right"
                    >
                      <IconButton 
                        size="small" 
                        sx={{ 
                          color: 'primary.main', 
                          ml: 0.5,
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          }
                        }}
                      >
                        <Info />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {trends.length > 0 ? (
              <>
                <Box>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">
                          Umsatz-Trend über Zeit
                        </Typography>
                        <Tooltip 
                          title={
                            <Box sx={{ p: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                Trend-Analyse - Berechnungsmethode:
                              </Typography>
                              <Typography variant="body2" component="div">
                                <strong>Gruppierung:</strong>
                                <br />• Tag: Tägliche Aufschlüsselung
                                <br />• Woche: Wöchentliche Aufschlüsselung (Montag-Sonntag)
                                <br />• Monat: Monatliche Aufschlüsselung
                                <br />• Jahr: Jährliche Aufschlüsselung
                                <br /><br />
                                <strong>Berechnungen pro Periode:</strong>
                                <br />• <strong>Gesamtumsatz:</strong> Summe aller Rechnungsbeträge
                                <br />• <strong>Anzahl Rechnungen:</strong> Anzahl der erstellten Rechnungen
                                <br />• <strong>Ø pro Rechnung:</strong> Durchschnittlicher Rechnungsbetrag
                                <br />• <strong>Nach Abrechnungstyp:</strong> Verteilung Kassenarzt/Wahlarzt/Privat
                                <br />• <strong>Nach Status:</strong> Entwurf, Versendet, Bezahlt, Überfällig
                                <br /><br />
                                <strong>Interpretation:</strong>
                                <br />Zeigt Entwicklung des Umsatzes über Zeit
                                <br />Ermöglicht Erkennung von Trends und Saisonalität
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="right"
                        >
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: 'primary.main', 
                              ml: 0.5,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              }
                            }}
                          >
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={trends.map(t => ({
                          period: t.period,
                          umsatz: t.totalAmount / 100,
                          rechnungen: t.totalInvoices,
                          durchschnitt: t.averageInvoiceAmount / 100
                        }))}>
                          <defs>
                            <linearGradient id="colorUmsatz" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#0088FE" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <RechartsTooltip formatter={(value: any, name: string) => {
                            if (name === 'umsatz' || name === 'durchschnitt') {
                              return formatAmountFromCents(value * 100);
                            }
                            return value;
                          }} />
                          <Legend />
                          <Area type="monotone" dataKey="umsatz" stroke="#0088FE" fillOpacity={1} fill="url(#colorUmsatz)" name="Umsatz (€)" />
                          <Line type="monotone" dataKey="durchschnitt" stroke="#FF8042" strokeWidth={2} name="Ø pro Rechnung (€)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Box>

                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Rechnungen über Zeit
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={trends.map(t => ({
                            period: t.period,
                            rechnungen: t.totalInvoices
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Line type="monotone" dataKey="rechnungen" stroke="#00C49F" strokeWidth={2} name="Anzahl Rechnungen" />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Box>

                  <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Verteilung nach Abrechnungstyp
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart
                          data={trends.map(t => {
                            const byType = t.byBillingType.reduce((acc, item) => {
                              acc[item.type] = item.totalAmount / 100;
                              return acc;
                            }, {} as Record<string, number>);
                            return {
                              period: t.period,
                              ...byType
                            };
                          })}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <RechartsTooltip formatter={(value: any) => formatAmountFromCents(value * 100)} />
                          <Legend />
                          <Bar dataKey="kassenarzt" stackId="a" fill="#0088FE" name="Kassenarzt" />
                          <Bar dataKey="wahlarzt" stackId="a" fill="#00C49F" name="Wahlarzt" />
                          <Bar dataKey="privat" stackId="a" fill="#FFBB28" name="Privat" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Box>
                </Box>
              </>
            ) : (
              <Box>
                <Alert severity="info">Keine Daten verfügbar für den ausgewählten Zeitraum</Alert>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 3: Profitabilität */}
        {activeTab === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Info-Karte - immer sichtbar */}
            <Box>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6">
                      Profitabilitäts-Analyse - Berechnungsmethode
                    </Typography>
                    <Tooltip 
                      title={
                        <Box sx={{ p: 1 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                            Profitabilitäts-Analyse - Berechnungsmethode:
                          </Typography>
                          <Typography variant="body2" component="div">
                            <strong>Profitabilitäts-Score:</strong>
                            <br />Score = Häufigkeit × Gesamtumsatz
                            <br />Kombiniert Umsatz und Popularität der Leistung
                            <br /><br />
                            <strong>Berechnungen:</strong>
                            <br />• <strong>Anzahl:</strong> Wie oft wurde die Leistung durchgeführt
                            <br />• <strong>Gesamtumsatz:</strong> Summe aller Umsätze
                            <br />• <strong>Ø Preis:</strong> Durchschnittlicher Preis
                            <br />• <strong>Min/Max Preis:</strong> Niedrigster/Höchster Preis
                            <br />• <strong>Umsatz pro Rechnung:</strong> Durchschnittlicher Umsatz pro Rechnung
                            <br /><br />
                            <strong>Interpretation:</strong>
                            <br />• Hoher Score = wichtige Leistung für die Praxis
                            <br />• Kombiniert Häufigkeit und Umsatz
                            <br />• Zeigt, welche Leistungen sich wirklich "auszahlen"
                            <br /><br />
                            <strong>Hinweis:</strong>
                            <br />Nur Leistungen mit mindestens 1 Durchführung werden angezeigt
                          </Typography>
                        </Box>
                      }
                      arrow
                      placement="right"
                    >
                      <IconButton 
                        size="small" 
                        sx={{ 
                          color: 'primary.main', 
                          ml: 0.5,
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          }
                        }}
                      >
                        <Info />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {profitability.length > 0 ? (
              <>
                <Box>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">
                          Top 20 profitabelste Leistungen
                        </Typography>
                        <Tooltip 
                          title={
                            <Box sx={{ p: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                Profitabilitäts-Analyse - Berechnungsmethode:
                              </Typography>
                              <Typography variant="body2" component="div">
                                <strong>Profitabilitäts-Score:</strong>
                                <br />Score = Häufigkeit × Gesamtumsatz
                                <br />Kombiniert Umsatz und Popularität der Leistung
                                <br /><br />
                                <strong>Berechnungen:</strong>
                                <br />• <strong>Anzahl:</strong> Wie oft wurde die Leistung durchgeführt
                                <br />• <strong>Gesamtumsatz:</strong> Summe aller Umsätze
                                <br />• <strong>Ø Preis:</strong> Durchschnittlicher Preis
                                <br />• <strong>Min/Max Preis:</strong> Niedrigster/Höchster Preis
                                <br />• <strong>Umsatz pro Rechnung:</strong> Durchschnittlicher Umsatz pro Rechnung
                                <br /><br />
                                <strong>Interpretation:</strong>
                                <br />• Hoher Score = wichtige Leistung für die Praxis
                                <br />• Kombiniert Häufigkeit und Umsatz
                                <br />• Zeigt, welche Leistungen sich wirklich "auszahlen"
                                <br /><br />
                                <strong>Hinweis:</strong>
                                <br />Nur Leistungen mit mindestens 1 Durchführung werden angezeigt
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="right"
                        >
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: 'primary.main', 
                              ml: 0.5,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              }
                            }}
                          >
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box sx={{ mt: 2, mb: 2 }}>
                        <Typography variant="body1">
                          <strong>Gesamtumsatz:</strong> {formatAmountFromCents(
                            profitability.reduce((sum, p) => sum + p.totalAmount, 0)
                          )}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>

                {/* Chart: Profitabilitäts-Score */}
                <Box>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Profitabilitäts-Score (Häufigkeit × Umsatz)
                      </Typography>
                      <ResponsiveContainer width="100%" height={400}>
                        <RechartsBarChart
                          layout="vertical"
                          data={profitability.slice(0, 20).map(p => ({
                            name: p.description.length > 40 ? p.description.substring(0, 40) + '...' : p.description,
                            score: p.profitabilityScore / 1000000, // Normalisiert für bessere Darstellung
                            umsatz: p.totalAmount / 100,
                            anzahl: p.count
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={200} />
                          <RechartsTooltip 
                            formatter={(value: any, name: string) => {
                              if (name === 'score') {
                                return `${(value * 1000000 / 100).toFixed(2)} €`;
                              }
                              if (name === 'umsatz') {
                                return formatAmountFromCents(value * 100);
                              }
                              return value;
                            }}
                          />
                          <Legend />
                          <Bar dataKey="score" fill="#FF8042" name="Profitabilitäts-Score" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Box>

                {/* Tabelle: Detaillierte Profitabilitäts-Analyse */}
                <Box>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">
                          Detaillierte Profitabilitäts-Analyse
                        </Typography>
                        <Tooltip 
                          title={
                            <Box sx={{ p: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                Spalten-Erklärung:
                              </Typography>
                              <Typography variant="body2" component="div">
                                <strong>Gesamtumsatz:</strong> Summe aller Umsätze für diese Leistung (in Cent)
                                <br /><br />
                                <strong>Ø Preis:</strong> Durchschnittlicher Preis pro Leistung
                                <br />Berechnung: Gesamtumsatz / Gesamtmenge
                                <br /><br />
                                <strong>Min Preis:</strong> Niedrigster Preis, zu dem diese Leistung abgerechnet wurde
                                <br /><br />
                                <strong>Max Preis:</strong> Höchster Preis, zu dem diese Leistung abgerechnet wurde
                                <br /><br />
                                <strong>Umsatz pro Rechnung:</strong> Durchschnittlicher Umsatz pro Rechnung
                                <br />Berechnung: Gesamtumsatz / Anzahl
                                <br /><br />
                                <strong>Score:</strong> Profitabilitäts-Score
                                <br />Berechnung: (Umsatz/Min) × Anzahl
                                <br />Je höher, desto wichtiger für die Praxis
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="right"
                        >
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: 'primary.main', 
                              ml: 0.5,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              }
                            }}
                          >
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Leistung</TableCell>
                              <TableCell>Kategorie</TableCell>
                              <TableCell align="right">Anzahl</TableCell>
                              <TableCell align="right">Gesamtumsatz</TableCell>
                              <TableCell align="right">Ø Preis</TableCell>
                              <TableCell align="right">Min Preis</TableCell>
                              <TableCell align="right">Max Preis</TableCell>
                              <TableCell align="right">Score</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {profitability.map((item, index) => (
                              <TableRow key={item.serviceCode || index}>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium">
                                    {item.description}
                                  </Typography>
                                  {item.serviceCode && (
                                    <Typography variant="caption" color="text.secondary">
                                      Code: {item.serviceCode}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip label={item.category} size="small" />
                                </TableCell>
                                <TableCell align="right">{item.count}</TableCell>
                                <TableCell align="right">{formatAmountFromCents(item.totalAmount)}</TableCell>
                                <TableCell align="right">{formatAmountFromCents(item.averagePrice)}</TableCell>
                                <TableCell align="right">{formatAmountFromCents(item.minPrice)}</TableCell>
                                <TableCell align="right">{formatAmountFromCents(item.maxPrice)}</TableCell>
                                <TableCell align="right">
                                  <Chip 
                                    label={formatAmountFromCents(item.profitabilityScore)} 
                                    size="small" 
                                    color={index < 5 ? 'primary' : 'default'}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Box>
              </>
            ) : (
              <Box>
                <Alert severity="info">Keine Daten verfügbar für den ausgewählten Zeitraum</Alert>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 4: Effizienz-Analyse */}
        {activeTab === 4 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Zeit-Ertrags-Verhältnis */}
            {efficiency.length > 0 && (
              <>
                <Box>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">
                          Zeit-Ertrags-Verhältnis (Umsatz pro Minute)
                        </Typography>
                        <Tooltip 
                          title={
                            <Box sx={{ p: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                Berechnungsmethode:
                              </Typography>
                              <Typography variant="body2" component="div">
                                <strong>Umsatz pro Minute = Gesamtumsatz / Gesamtdauer (in Minuten)</strong>
                                <br /><br />
                                <strong>Datenquellen:</strong>
                                <br />• Gesamtumsatz: Summe aller Rechnungsbeträge für diese Leistung
                                <br />• Gesamtdauer: Summe aller Behandlungsdauern (base_duration_min + buffer_before_min + buffer_after_min)
                                <br />• Multipliziert mit der Anzahl der durchgeführten Leistungen
                                <br /><br />
                                <strong>Beispiel:</strong>
                                <br />Leistung: 10x durchgeführt, je 50€ Umsatz, je 30 Min Dauer
                                <br />Umsatz/Min = (10 × 50€) / (10 × 30 Min) = 500€ / 300 Min = 1,67 €/Min
                                <br /><br />
                                <strong>Interpretation:</strong>
                                <br />Je höher der Wert, desto profitabler ist die Leistung pro investierter Minute.
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="right"
                        >
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: 'primary.main', 
                              ml: 0.5,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              }
                            }}
                          >
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Die wichtigste Kennzahl: Welche Leistungen bringen am meisten Umsatz pro Minute?
                      </Typography>
                      <ResponsiveContainer width="100%" height={400}>
                        <RechartsBarChart
                          layout="vertical"
                          data={efficiency.slice(0, 20).map(e => ({
                            name: e.description.length > 40 ? e.description.substring(0, 40) + '...' : e.description,
                            revenuePerMinute: e.revenuePerMinute,
                            efficiencyScore: e.efficiencyScore / 1000000
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={200} />
                          <RechartsTooltip formatter={(value: any) => `${value.toFixed(2)} €/Min`} />
                          <Legend />
                          <Bar dataKey="revenuePerMinute" fill="#00C49F" name="Umsatz pro Minute (€)" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Box>

                <Box>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">
                          Detaillierte Effizienz-Analyse
                        </Typography>
                        <Tooltip 
                          title={
                            <Box sx={{ p: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                Spalten-Erklärung:
                              </Typography>
                              <Typography variant="body2" component="div">
                                <strong>Anzahl:</strong> Wie oft wurde diese Leistung durchgeführt
                                <br /><br />
                                <strong>Ø Dauer (Min):</strong> Durchschnittliche Behandlungsdauer pro Leistung
                                <br />Berechnung: Gesamtdauer / Anzahl
                                <br /><br />
                                <strong>Ø Umsatz (€):</strong> Durchschnittlicher Umsatz pro Leistung
                                <br />Berechnung: Gesamtumsatz / Anzahl
                                <br /><br />
                                <strong>Umsatz/Min (€):</strong> Umsatz pro investierter Minute
                                <br />Berechnung: Gesamtumsatz / Gesamtdauer
                                <br /><br />
                                <strong>Effizienz-Score:</strong> Kombinierter Wert aus Häufigkeit und Umsatz
                                <br />Berechnung: (Umsatz/Min) × Anzahl
                                <br />Je höher, desto wichtiger für die Praxis
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="right"
                        >
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: 'primary.main', 
                              ml: 0.5,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              }
                            }}
                          >
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Leistung</TableCell>
                              <TableCell align="right">Anzahl</TableCell>
                              <TableCell align="right">Ø Dauer (Min)</TableCell>
                              <TableCell align="right">Ø Umsatz (€)</TableCell>
                              <TableCell align="right">Umsatz/Min (€)</TableCell>
                              <TableCell align="right">Effizienz-Score</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {efficiency.map((item, index) => (
                              <TableRow key={item.serviceCode || index}>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium">
                                    {item.description}
                                  </Typography>
                                  {item.serviceCode && (
                                    <Typography variant="caption" color="text.secondary">
                                      Code: {item.serviceCode}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right">{item.count}</TableCell>
                                <TableCell align="right">{item.averageDuration.toFixed(1)}</TableCell>
                                <TableCell align="right">{item.averageRevenue.toFixed(2)}</TableCell>
                                <TableCell align="right">
                                  <Chip 
                                    label={`${item.revenuePerMinute.toFixed(2)} €/Min`} 
                                    size="small" 
                                    color={item.revenuePerMinute > 10 ? 'success' : item.revenuePerMinute > 5 ? 'warning' : 'default'}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Chip 
                                    label={formatAmountFromCents(item.efficiencyScore * 100)} 
                                    size="small" 
                                    color={index < 5 ? 'primary' : 'default'}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Box>
              </>
            )}

            {/* No-Show-Analyse */}
            {noShow && noShow.summary && (
              <>
                <Box>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">
                          No-Show-Analyse
                        </Typography>
                        <Tooltip 
                          title={
                            <Box sx={{ p: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                Berechnungsmethode:
                              </Typography>
                              <Typography variant="body2" component="div">
                                <strong>No-Show-Rate = (Anzahl No-Shows / Anzahl geplanter Termine) × 100%</strong>
                                <br /><br />
                                <strong>Datenquellen:</strong>
                                <br />• Appointments mit Status "abgesagt"
                                <br />• ServiceBookings mit Status "no_show" oder "cancelled"
                                <br />• Verlorener Umsatz: Summe der Preise aller ausgefallenen Termine
                                <br /><br />
                                <strong>Verlorener Umsatz:</strong>
                                <br />Berechnet aus dem Preis der geplanten Leistung pro ausgefallenem Termin
                                <br />Quelle: ServiceCatalog.price_cents oder ServiceBooking.billing_amount_cents
                                <br /><br />
                                <strong>Interpretation:</strong>
                                <br />• Hohe No-Show-Rate = viele Termine werden nicht wahrgenommen
                                <br />• Verlorener Umsatz zeigt das finanzielle Ausmaß
                                <br />• Monatliche Aufschlüsselung zeigt Trends
                              </Typography>
                            </Box>
                          }
                          arrow
                          placement="right"
                        >
                          <IconButton 
                            size="small" 
                            sx={{ 
                              color: 'primary.main', 
                              ml: 0.5,
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              }
                            }}
                          >
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: '1 1 200px', textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 2 }}>
                          <Typography variant="h5" color="error.contrastText">
                            {noShow.summary.totalNoShows || 0}
                          </Typography>
                          <Typography variant="body2" color="error.contrastText">
                            No-Shows
                          </Typography>
                          <Tooltip title="Anzahl der Termine, die nicht wahrgenommen wurden (abgesagt oder nicht erschienen)">
                            <IconButton size="small" sx={{ color: 'error.contrastText', opacity: 0.7, mt: 0.5 }}>
                              <HelpOutline fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Box sx={{ flex: '1 1 200px', textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                          <Typography variant="h5" color="warning.contrastText">
                            {noShow.summary.noShowRate || '0.00'}%
                          </Typography>
                          <Typography variant="body2" color="warning.contrastText">
                            No-Show-Rate
                          </Typography>
                          <Tooltip title="Prozentualer Anteil der ausgefallenen Termine an allen geplanten Terminen">
                            <IconButton size="small" sx={{ color: 'warning.contrastText', opacity: 0.7, mt: 0.5 }}>
                              <HelpOutline fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Box sx={{ flex: '1 1 200px', textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                          <Typography variant="h5" color="info.contrastText">
                            {formatAmountFromCents(noShow.summary.lostRevenueCents || 0)}
                          </Typography>
                          <Typography variant="body2" color="info.contrastText">
                            Verlorener Umsatz
                          </Typography>
                          <Tooltip title="Summe der Umsätze, die durch ausgefallene Termine verloren gegangen sind">
                            <IconButton size="small" sx={{ color: 'info.contrastText', opacity: 0.7, mt: 0.5 }}>
                              <HelpOutline fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>

                {noShow.byMonth && noShow.byMonth.length > 0 && (
                  <Box>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Verlorener Umsatz nach Monat
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={noShow.byMonth.map(m => ({
                            month: m.month,
                            verlorenerUmsatz: m.lostRevenue,
                            anzahl: m.count
                          }))}>
                            <defs>
                              <linearGradient id="colorLostRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FF8042" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#FF8042" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <RechartsTooltip formatter={(value: any) => formatAmountFromCents(value * 100)} />
                            <Legend />
                            <Area type="monotone" dataKey="verlorenerUmsatz" stroke="#FF8042" fillOpacity={1} fill="url(#colorLostRevenue)" name="Verlorener Umsatz (€)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Box>
                )}
              </>
            )}

            {/* Abrechnungs-Optimierer */}
            {billingOptimizer && (
              <Box>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h6">
                        Abrechnungs-Optimierer
                      </Typography>
                      <Tooltip 
                        title={
                          <Box sx={{ p: 1 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                              Funktionsweise:
                            </Typography>
                            <Typography variant="body2" component="div">
                              <strong>Automatische Erkennung fehlender Service-Codes</strong>
                              <br /><br />
                              <strong>Analyseprozess:</strong>
                              <br />1. Alle Rechnungen im Zeitraum werden durchsucht
                              <br />2. Services ohne serviceCode werden identifiziert
                              <br />3. Beschreibung wird mit ServiceCatalog abgeglichen
                              <br />4. Passende Services werden vorgeschlagen
                              <br /><br />
                              <strong>Matching-Algorithmus:</strong>
                              <br />• Textvergleich zwischen Beschreibung und ServiceCatalog-Namen
                              <br />• Berücksichtigt Teilübereinstimmungen
                              <br />• Ignoriert Groß-/Kleinschreibung
                              <br /><br />
                              <strong>Potentieller Umsatz:</strong>
                              <br />Summe der Preise aller vorgeschlagenen Services
                              <br />Zeigt, wie viel Umsatz durch fehlende Codierungen verloren geht
                              <br /><br />
                              <strong>Hinweis:</strong>
                              <br />Vorschläge sollten manuell überprüft werden, bevor sie übernommen werden.
                            </Typography>
                          </Box>
                        }
                        arrow
                        placement="right"
                      >
                        <IconButton size="small" sx={{ color: 'primary.main' }}>
                          <Info />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      {billingOptimizer.summary && billingOptimizer.summary.totalMissingCodes > 0 ? (
                        <>
                          <strong>{billingOptimizer.summary.totalMissingCodes}</strong> fehlende Codierungen in{' '}
                          <strong>{billingOptimizer.summary.invoicesWithMissingCodes}</strong> Rechnungen gefunden.
                          <br />
                          Potentieller zusätzlicher Umsatz: <strong>{formatAmountFromCents(billingOptimizer.summary.potentialRevenueCents)}</strong>
                        </>
                      ) : (
                        'Keine fehlenden Codierungen gefunden. Alle Leistungen sind korrekt abgerechnet.'
                      )}
                    </Alert>

                    {billingOptimizer.summary && billingOptimizer.missingCodes && billingOptimizer.missingCodes.length > 0 && (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Rechnungsnummer</TableCell>
                              <TableCell>Datum</TableCell>
                              <TableCell>Patient</TableCell>
                              <TableCell>Beschreibung</TableCell>
                              <TableCell>Vorgeschlagener Code</TableCell>
                              <TableCell>Vorgeschlagene Leistung</TableCell>
                              <TableCell align="right">Potentieller Umsatz</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {billingOptimizer.missingCodes.slice(0, 50).map((code, index) => (
                              <TableRow key={index}>
                                <TableCell>{code.invoiceNumber}</TableCell>
                                <TableCell>{format(new Date(code.invoiceDate), 'dd.MM.yyyy')}</TableCell>
                                <TableCell>{code.patientName}</TableCell>
                                <TableCell>{code.description}</TableCell>
                                <TableCell>
                                  <Chip label={code.suggestedCode} size="small" color="primary" />
                                </TableCell>
                                <TableCell>{code.suggestedService}</TableCell>
                                <TableCell align="right">
                                  <Chip 
                                    label={formatAmountFromCents(code.potentialRevenue * 100)} 
                                    size="small" 
                                    color="success"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}

            {efficiency.length === 0 && !noShow && !billingOptimizer && (
              <Box>
                <Alert severity="info">Keine Daten verfügbar für den ausgewählten Zeitraum</Alert>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default BillingReports;
