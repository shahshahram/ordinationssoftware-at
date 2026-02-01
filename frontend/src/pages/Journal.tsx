import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Receipt as ReceiptIcon,
  Description as DescriptionIcon,
  GetApp as GetAppIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import api, { getApiBaseUrl } from '../utils/api';
import { format as formatDate } from 'date-fns';
import { useSnackbar } from 'notistack';
import GradientDialogTitle from '../components/GradientDialogTitle';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';

interface InvoiceJournalEntry {
  _id: string;
  invoiceId?: string | { _id: string; invoiceNumber?: string };
  invoiceNumber: string;
  invoiceDate: string;
  patient: {
    name: string;
    id?: string;
    address?: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    insuranceNumber?: string;
    insuranceProvider?: string;
  };
  doctor?: {
    name: string;
    address?: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };
  services?: Array<{
    date: string;
    serviceCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount: number;
  status: string;
  billingType: string;
  paymentMethod?: string;
  paymentDate?: string;
  locationId?: {
    name: string;
    _id?: string;
  };
  createdAt: string;
  journalHash: string;
  dueDate?: string;
}

interface ReceiptJournalEntry {
  _id: string;
  receiptNumber: number;
  receiptType: string;
  receiptData: {
    timestamp: string;
    amount: number;
  };
  paymentMethod?: string;
  cashBoxId: string;
  tseSignature?: {
    tseSerial: string;
    signatureCounter: number;
  };
  receiptHash: string;
  invoiceId?: {
    invoiceNumber: string;
  };
}

// Helper-Funktion zum Entfernen von HTML-Tags
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

// Helper-Funktion: Konvertiert Wert zu Euro (automatische Erkennung)
// Wenn Wert > 100000, wird angenommen, dass es in Cent ist (alte Daten)
// Beispiel: 150000 Cent = 1500 Euro, aber 1500 Euro bleibt 1500 Euro
const toEuro = (value: number | undefined | null): number => {
  if (!value && value !== 0) return 0;
  // Wenn Wert sehr groß ist (> 100000), ist es wahrscheinlich in Cent (alte Daten)
  // Normale Preise in Euro sind meist < 100000
  return value > 100000 ? value / 100 : value;
};

const Journal: React.FC = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { marginTopValue } = useGlobalNavigationOffset();
  
  const [activeTab, setActiveTab] = useState(0); // 0 = Rechnungen, 1 = Registrierkassa
  const [loading, setLoading] = useState(false);
  const [invoiceEntries, setInvoiceEntries] = useState<InvoiceJournalEntry[]>([]);
  const [receiptEntries, setReceiptEntries] = useState<ReceiptJournalEntry[]>([]);
  
  // Filter States
  const [filterType, setFilterType] = useState<'day' | 'month' | 'year' | 'range'>('range');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [billingType, setBillingType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  
  const [locations, setLocations] = useState<any[]>([]);
  
  // Detail-Dialog States
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<InvoiceJournalEntry | null>(null);
  const [selectedReceiptEntry, setSelectedReceiptEntry] = useState<ReceiptJournalEntry | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [fullInvoiceDetails, setFullInvoiceDetails] = useState<any>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);

  // Lade Standorte
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const response = await api.get('/locations') as any;
        if (response.data?.success) {
          setLocations(response.data.data || []);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Standorte:', error);
      }
    };
    loadLocations();
  }, []);

  // Lade Journal-Einträge
  const loadJournalEntries = async () => {
    setLoading(true);
    try {
      const params: any = {};
      
      // Datumsfilter
      if (filterType === 'day' && selectedDate) {
        params.date = selectedDate;
      } else if (filterType === 'month' && selectedMonth && selectedYear) {
        params.month = selectedMonth;
        params.year = selectedYear;
      } else if (filterType === 'year' && selectedYear) {
        params.year = selectedYear;
      } else if (filterType === 'range') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      
      // Weitere Filter
      if (locationId) params.locationId = locationId;
      if (billingType) params.billingType = billingType;
      if (status) params.status = status;

      // Debug-Logging
      console.log('[Journal Frontend] Request params:', params);

      if (activeTab === 0) {
        // Rechnungsjournal
        const response = await api.get('/journal/invoices', params) as any;
        if (response.data?.success) {
          setInvoiceEntries(response.data.data || []);
        }
      } else {
        // Registrierkassa-Journal
        const response = await api.get('/journal/receipts', params) as any;
        if (response.data?.success) {
          setReceiptEntries(response.data.data || []);
        }
      }
    } catch (error: any) {
      console.error('Fehler beim Laden des Journals:', error);
      enqueueSnackbar('Fehler beim Laden des Journals', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJournalEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadJournalEntries bewusst ausgelassen
  }, [activeTab, filterType, selectedDate, selectedMonth, selectedYear, startDate, endDate, locationId, billingType, status]);

  // Export-Funktion
  const handleExport = async (exportFormat: 'csv' | 'excel' | 'json') => {
    try {
      const params: any = { format: exportFormat };
      
      // Datumsfilter
      if (filterType === 'day' && selectedDate) {
        params.date = selectedDate;
      } else if (filterType === 'month' && selectedMonth && selectedYear) {
        params.month = selectedMonth;
        params.year = selectedYear;
      } else if (filterType === 'year' && selectedYear) {
        params.year = selectedYear;
      } else if (filterType === 'range') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      
      // Weitere Filter
      if (locationId) params.locationId = locationId;
      if (billingType) params.billingType = billingType;
      if (status) params.status = status;

      const endpoint = activeTab === 0 ? '/journal/invoices' : '/journal/receipts';
      
      // Für Blob-Response müssen wir fetch direkt verwenden
      const token = localStorage.getItem('token');
      const queryString = new URLSearchParams(params).toString();
      const url = `${getApiBaseUrl()}${endpoint}?${queryString}`;
      
      const fetchResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!fetchResponse.ok) {
        throw new Error('Export fehlgeschlagen');
      }
      
      const blob = await fetchResponse.blob();

      // Erstelle Download-Link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const extension = exportFormat === 'excel' ? 'xlsx' : exportFormat;
      const type = activeTab === 0 ? 'rechnungsjournal' : 'registrierkassa_journal';
      link.setAttribute('download', `${type}_${formatDate(new Date(), 'yyyy-MM-dd')}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      enqueueSnackbar('Export erfolgreich', { variant: 'success' });
    } catch (error: any) {
      console.error('Export-Fehler:', error);
      enqueueSnackbar('Fehler beim Export', { variant: 'error' });
    }
  };

  // Detail-Dialog öffnen
  const handleViewDetails = async (entry: InvoiceJournalEntry) => {
    setSelectedEntry(entry);
    setLoadingDetails(true);
    setDetailDialogOpen(true);
    
    try {
      // Lade vollständige Rechnungsdetails
      // invoiceId kann ein String oder ein Objekt sein
      let invoiceId: string | null = null;
      if (typeof entry.invoiceId === 'string') {
        invoiceId = entry.invoiceId;
      } else if (entry.invoiceId && typeof entry.invoiceId === 'object' && '_id' in entry.invoiceId) {
        invoiceId = entry.invoiceId._id;
      } else if (entry._id) {
        invoiceId = entry._id;
      }
      
      if (invoiceId) {
        try {
          const response = await api.get(`/billing/invoices/${invoiceId}`) as any;
          // API-Antwort kann unterschiedlich strukturiert sein
          if (response.success && response.data) {
            setFullInvoiceDetails(response.data);
          } else if (response.data?.success && response.data.data) {
            setFullInvoiceDetails(response.data.data);
          } else if (response.data) {
            setFullInvoiceDetails(response.data);
          } else {
            // Fallback auf Journal-Eintrag
            setFullInvoiceDetails(entry);
          }
        } catch (apiError: any) {
          // Fallback auf Journal-Eintrag
          setFullInvoiceDetails(entry);
        }
      } else {
        // Fallback auf Journal-Eintrag
        setFullInvoiceDetails(entry);
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der Rechnungsdetails:', error);
      // Fallback auf Journal-Eintrag
      setFullInvoiceDetails(entry);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Detail-Dialog für Registrierkassa-Einträge öffnen
  const handleViewReceiptDetails = async (entry: ReceiptJournalEntry) => {
    setSelectedReceiptEntry(entry);
    setSelectedEntry(null); // Invoice-Entry zurücksetzen
    setLoadingDetails(true);
    setDetailDialogOpen(true);
    
    try {
      // Lade vollständige Rechnungsdetails, falls invoiceId vorhanden
      let invoiceId: string | null = null;
      if (entry.invoiceId) {
        if (typeof entry.invoiceId === 'string') {
          invoiceId = entry.invoiceId;
        } else if (typeof entry.invoiceId === 'object' && entry.invoiceId !== null && '_id' in entry.invoiceId) {
          invoiceId = String((entry.invoiceId as any)._id);
        }
      }
      
      if (invoiceId) {
        try {
          const response = await api.get(`/billing/invoices/${invoiceId}`) as any;
          // API-Antwort kann unterschiedlich strukturiert sein
          let invoiceData = null;
          if (response.success && response.data) {
            invoiceData = response.data;
          } else if (response.data?.success && response.data.data) {
            invoiceData = response.data.data;
          } else if (response.data) {
            invoiceData = response.data;
          }
          
          if (invoiceData) {
            setFullInvoiceDetails(invoiceData);
          } else {
            // Fallback auf Receipt-Eintrag
            setFullInvoiceDetails(entry);
          }
        } catch (apiError: any) {
          // Fallback auf Receipt-Eintrag
          setFullInvoiceDetails(entry);
        }
      } else {
        // Fallback auf Receipt-Eintrag
        setFullInvoiceDetails(entry);
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der Belegdetails:', error);
      // Fallback auf Receipt-Eintrag
      setFullInvoiceDetails(entry);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Schnell-Buttons Handler
  const handleQuickFilter = (type: 'today' | 'week' | 'month' | 'year') => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12
    
    switch (type) {
      case 'today':
        setFilterType('day');
        setSelectedDate(today.toISOString().split('T')[0]);
        setSelectedMonth('');
        setSelectedYear('');
        setStartDate('');
        setEndDate('');
        // Daten werden automatisch durch useEffect geladen
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Sonntag der aktuellen Woche
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Samstag
        weekEnd.setHours(23, 59, 59, 999);
        setFilterType('range');
        setStartDate(weekStart.toISOString().split('T')[0]);
        setEndDate(weekEnd.toISOString().split('T')[0]);
        setSelectedDate('');
        setSelectedMonth('');
        setSelectedYear('');
        // Daten werden automatisch durch useEffect geladen
        break;
      case 'month':
        setFilterType('month');
        setSelectedMonth(currentMonth.toString());
        setSelectedYear(currentYear.toString());
        setSelectedDate('');
        setStartDate('');
        setEndDate('');
        // Daten werden automatisch durch useEffect geladen
        break;
      case 'year':
        setFilterType('year');
        setSelectedYear(currentYear.toString());
        setSelectedDate('');
        setSelectedMonth('');
        setStartDate('');
        setEndDate('');
        // Daten werden automatisch durch useEffect geladen
        break;
    }
  };

  // Aktuelles Jahr und Monat für Dropdowns
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = [
    { value: '1', label: 'Januar' },
    { value: '2', label: 'Februar' },
    { value: '3', label: 'März' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mai' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Dezember' },
  ];

  return (
    <Box sx={{ 
      p: 3,
      mt: marginTopValue !== '0px' ? marginTopValue : 0,
      transition: marginTopValue !== '0px' ? 'margin-top 0.3s ease' : 'none',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Journal
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Unveränderbare Protokollierung aller Rechnungen und Registrierkassa-Belege für interne Überprüfung und Compliance
          </Typography>
        </Box>
        <Tooltip title="Hilfe & Leitfaden">
          <IconButton
            onClick={() => setHelpDialogOpen(true)}
            color="primary"
          >
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Tabs 
        value={activeTab} 
        onChange={(_, newValue) => {
          // Beim Tab-Wechsel Details zurücksetzen
          setSelectedEntry(null);
          setSelectedReceiptEntry(null);
          setFullInvoiceDetails(null);
          setDetailDialogOpen(false);
          setActiveTab(newValue);
        }}
        sx={{ mb: 3 }}
      >
        <Tab icon={<DescriptionIcon />} iconPosition="start" label="Rechnungsjournal" />
        <Tab icon={<ReceiptIcon />} iconPosition="start" label="Registrierkassa-Journal" />
      </Tabs>

      {/* Schnell-Buttons */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button
          variant={filterType === 'day' && selectedDate === new Date().toISOString().split('T')[0] ? 'contained' : 'outlined'}
          onClick={() => handleQuickFilter('today')}
          size="small"
        >
          Heute
        </Button>
        <Button
          variant={filterType === 'range' && startDate && endDate ? 'contained' : 'outlined'}
          onClick={() => handleQuickFilter('week')}
          size="small"
        >
          Woche
        </Button>
        <Button
          variant={filterType === 'month' && selectedMonth === (new Date().getMonth() + 1).toString() && selectedYear === new Date().getFullYear().toString() ? 'contained' : 'outlined'}
          onClick={() => handleQuickFilter('month')}
          size="small"
        >
          Monat
        </Button>
        <Button
          variant={filterType === 'year' && selectedYear === new Date().getFullYear().toString() ? 'contained' : 'outlined'}
          onClick={() => handleQuickFilter('year')}
          size="small"
        >
          Jahr
        </Button>
        {activeTab === 0 && (
          <Button
            variant={status === 'sent,overdue' ? 'contained' : 'outlined'}
            onClick={() => {
              // Setze Status-Filter auf "sent,overdue" für offene Rechnungen
              // Backend unterstützt mehrere Status durch Komma
              setStatus('sent,overdue');
              // Entferne alle Filter, um alle offenen Rechnungen zu zeigen
              setFilterType('range');
              setStartDate('');
              setEndDate('');
              setSelectedDate('');
              setSelectedMonth('');
              setSelectedYear('');
              setLocationId(''); // Wichtig: locationId zurücksetzen, da viele Einträge locationId: null haben
              setBillingType(''); // Optional: auch billingType zurücksetzen
            }}
            size="small"
          >
            Offene Rechnungen
          </Button>
        )}
      </Box>

      {/* Filter-Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
              <FormControl fullWidth>
                <InputLabel>Filter-Typ</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  label="Filter-Typ"
                >
                  <MenuItem value="day">Tag</MenuItem>
                  <MenuItem value="month">Monat</MenuItem>
                  <MenuItem value="year">Jahr</MenuItem>
                  <MenuItem value="range">Datumsbereich</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {filterType === 'day' && (
              <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                <TextField
                  type="date"
                  label="Datum"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            )}

            {filterType === 'month' && (
              <>
                <Box sx={{ minWidth: '150px', flex: '1 1 150px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Monat</InputLabel>
                    <Select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      label="Monat"
                    >
                      {months.map((month) => (
                        <MenuItem key={month.value} value={month.value}>
                          {month.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ minWidth: '150px', flex: '1 1 150px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Jahr</InputLabel>
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      label="Jahr"
                    >
                      {years.map((year) => (
                        <MenuItem key={year} value={year.toString()}>
                          {year}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </>
            )}

            {filterType === 'year' && (
              <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                <FormControl fullWidth>
                  <InputLabel>Jahr</InputLabel>
                  <Select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    label="Jahr"
                  >
                    {years.map((year) => (
                      <MenuItem key={year} value={year.toString()}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {filterType === 'range' && (
              <>
                <Box sx={{ minWidth: '180px', flex: '1 1 180px' }}>
                  <TextField
                    type="date"
                    label="Von"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                <Box sx={{ minWidth: '180px', flex: '1 1 180px' }}>
                  <TextField
                    type="date"
                    label="Bis"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </>
            )}

            {activeTab === 0 && (
              <>
                <Box sx={{ minWidth: '180px', flex: '1 1 180px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Standort</InputLabel>
                    <Select
                      value={locationId}
                      onChange={(e) => setLocationId(e.target.value)}
                      label="Standort"
                    >
                      <MenuItem value="">Alle</MenuItem>
                      {locations.map((loc) => (
                        <MenuItem key={loc._id} value={loc._id}>
                          {loc.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ minWidth: '180px', flex: '1 1 180px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Abrechnungstyp</InputLabel>
                    <Select
                      value={billingType}
                      onChange={(e) => setBillingType(e.target.value)}
                      label="Abrechnungstyp"
                    >
                      <MenuItem value="">Alle</MenuItem>
                      <MenuItem value="kassenarzt">Kassenarzt</MenuItem>
                      <MenuItem value="wahlarzt">Wahlarzt</MenuItem>
                      <MenuItem value="privat">Privat</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ minWidth: '180px', flex: '1 1 180px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={status === 'sent,overdue' ? '' : status}
                      onChange={(e) => {
                        // Wenn Quick-Filter aktiv ist, setze Status zurück
                        if (status === 'sent,overdue') {
                          setStatus('');
                        } else {
                          setStatus(e.target.value);
                        }
                      }}
                      label="Status"
                      renderValue={(selected) => {
                        if (status === 'sent,overdue') {
                          return 'Offene Rechnungen';
                        }
                        if (!selected) return 'Alle';
                        const labels: Record<string, string> = {
                          'draft': 'Entwurf',
                          'sent': 'Gesendet',
                          'paid': 'Bezahlt',
                          'overdue': 'Überfällig',
                          'cancelled': 'Storniert'
                        };
                        return labels[selected] || selected;
                      }}
                    >
                      <MenuItem value="">Alle</MenuItem>
                      <MenuItem value="draft">Entwurf</MenuItem>
                      <MenuItem value="sent">Gesendet</MenuItem>
                      <MenuItem value="paid">Bezahlt</MenuItem>
                      <MenuItem value="overdue">Überfällig</MenuItem>
                      <MenuItem value="cancelled">Storniert</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </>
            )}

            <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
              <Tooltip title="CSV exportieren">
                <IconButton onClick={() => handleExport('csv')} color="primary">
                  <GetAppIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Excel exportieren">
                <IconButton onClick={() => handleExport('excel')} color="primary">
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="JSON exportieren">
                <IconButton onClick={() => handleExport('json')} color="primary">
                  <DescriptionIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Summen-Card */}
      {activeTab === 0 && invoiceEntries.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Anzahl Rechnungen
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="primary">
                  {invoiceEntries.length}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Gesamtbetrag
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  €{invoiceEntries.reduce((sum, entry) => sum + toEuro(entry.totalAmount || 0), 0).toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Bezahlt
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  €{invoiceEntries
                    .filter(e => e.status === 'paid')
                    .reduce((sum, entry) => sum + toEuro(entry.totalAmount || 0), 0).toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Offen
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  €{invoiceEntries
                    .filter(e => e.status !== 'paid' && e.status !== 'cancelled')
                    .reduce((sum, entry) => sum + toEuro(entry.totalAmount || 0), 0).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && receiptEntries.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Anzahl Belege
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="primary">
                  {receiptEntries.length}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Gesamtbetrag
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  €{receiptEntries.reduce((sum, entry) => sum + toEuro(entry.receiptData?.amount || 0), 0).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tabelle */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : activeTab === 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ 
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f5f5f5' 
                  }}>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Rechnungsnummer</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Datum</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Patient</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Betrag</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Status</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Abrechnungstyp</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Zahlungsart</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Standort</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Erstellt am</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoiceEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                          Keine Einträge gefunden
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoiceEntries.map((entry) => (
                      <TableRow 
                        key={entry._id}
                        onClick={(_e) => {
                          handleViewDetails(entry);
                        }}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.05)' 
                              : 'rgba(0, 0, 0, 0.04)',
                          },
                          '& td': {
                            userSelect: 'none', // Verhindert Textauswahl beim Klicken
                          }
                        }}
                      >
                        <TableCell>{entry.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(new Date(entry.invoiceDate), 'dd.MM.yyyy')}</TableCell>
                        <TableCell>{entry.patient?.name || ''}</TableCell>
                        <TableCell>€{toEuro(entry.totalAmount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={entry.status} 
                            size="small" 
                            color={
                              entry.status === 'paid' ? 'success' :
                              entry.status === 'overdue' ? 'error' :
                              entry.status === 'cancelled' ? 'default' : 'info'
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={entry.billingType} 
                            size="small" 
                            variant="outlined"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell>{entry.paymentMethod || '-'}</TableCell>
                        <TableCell>{entry.locationId?.name || '-'}</TableCell>
                        <TableCell>{formatDate(new Date(entry.createdAt), 'dd.MM.yyyy HH:mm')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ 
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f5f5f5' 
                  }}>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Belegnummer</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Belegtyp</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Datum</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Betrag</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Zahlungsart</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Kassennummer</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>TSE-Seriennummer</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                    }}>Rechnungsnummer</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receiptEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                          Keine Einträge gefunden
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    receiptEntries.map((entry) => (
                      <TableRow 
                        key={entry._id}
                        onClick={(_e) => {
                          handleViewReceiptDetails(entry);
                        }}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.05)' 
                              : 'rgba(0, 0, 0, 0.04)',
                          },
                          '& td': {
                            userSelect: 'none',
                          }
                        }}
                      >
                        <TableCell>{entry.receiptNumber}</TableCell>
                        <TableCell>
                          <Chip 
                            label={entry.receiptType} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {formatDate(new Date(entry.receiptData.timestamp), 'dd.MM.yyyy HH:mm')}
                        </TableCell>
                        <TableCell>€{toEuro(entry.receiptData.amount).toFixed(2)}</TableCell>
                        <TableCell>{entry.paymentMethod || '-'}</TableCell>
                        <TableCell>{entry.cashBoxId}</TableCell>
                        <TableCell>{entry.tseSignature?.tseSerial || '-'}</TableCell>
                        <TableCell>{entry.invoiceId?.invoiceNumber || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Detail-Dialog */}
        <Dialog
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedEntry(null);
          setSelectedReceiptEntry(null);
          setFullInvoiceDetails(null);
        }}
        maxWidth="md"
        fullWidth
        disableEnforceFocus={false}
        disableAutoFocus={false}
        aria-labelledby="journal-detail-dialog-title"
      >
        <DialogTitle id="journal-detail-dialog-title">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VisibilityIcon />
              <Typography variant="h6" component="span">
                {selectedReceiptEntry && !fullInvoiceDetails?.invoiceNumber 
                  ? 'Belegdetails (Registrierkassa)' 
                  : 'Rechnungsdetails'}
              </Typography>
            </Box>
            <IconButton 
              onClick={() => setDetailDialogOpen(false)} 
              size="small"
              aria-label="Dialog schließen"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {loadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (fullInvoiceDetails || selectedEntry || selectedReceiptEntry) ? (
            <Stack spacing={3}>
              {selectedReceiptEntry && !fullInvoiceDetails?.invoiceNumber ? (
                // Registrierkassa-Details (nur wenn keine vollständigen Rechnungsdetails geladen wurden)
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                    Beleginformationen
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      <Typography variant="body2" color="text.secondary">Belegnummer</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedReceiptEntry.receiptNumber}
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      <Typography variant="body2" color="text.secondary">Belegtyp</Typography>
                      <Typography variant="body1">
                        {selectedReceiptEntry.receiptType}
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      <Typography variant="body2" color="text.secondary">Datum & Uhrzeit</Typography>
                      <Typography variant="body1">
                        {formatDate(new Date(selectedReceiptEntry.receiptData.timestamp), 'dd.MM.yyyy HH:mm')}
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      <Typography variant="body2" color="text.secondary">Betrag</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        €{toEuro(selectedReceiptEntry.receiptData.amount).toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      <Typography variant="body2" color="text.secondary">Zahlungsart</Typography>
                      <Typography variant="body1">
                        {selectedReceiptEntry.paymentMethod || '-'}
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      <Typography variant="body2" color="text.secondary">Kassennummer</Typography>
                      <Typography variant="body1">
                        {selectedReceiptEntry.cashBoxId}
                      </Typography>
                    </Box>
                    {selectedReceiptEntry.tseSignature && (
                      <>
                        <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                          <Typography variant="body2" color="text.secondary">TSE-Seriennummer</Typography>
                          <Typography variant="body1">
                            {selectedReceiptEntry.tseSignature.tseSerial || '-'}
                          </Typography>
                        </Box>
                        <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                          <Typography variant="body2" color="text.secondary">Signatur-Zähler</Typography>
                          <Typography variant="body1">
                            {selectedReceiptEntry.tseSignature.signatureCounter || '-'}
                          </Typography>
                        </Box>
                      </>
                    )}
                    {selectedReceiptEntry.invoiceId && (
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="body2" color="text.secondary">Rechnungsnummer</Typography>
                        <Typography variant="body1">
                          {typeof selectedReceiptEntry.invoiceId === 'object' 
                            ? selectedReceiptEntry.invoiceId.invoiceNumber 
                            : selectedReceiptEntry.invoiceId}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      <Typography variant="body2" color="text.secondary">Beleg-Hash</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                        {selectedReceiptEntry.receiptHash || '-'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                // Rechnungsdetails (bestehender Code)
                <>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                      Rechnungsinformationen
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="body2" color="text.secondary">Rechnungsnummer</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {fullInvoiceDetails.invoiceNumber || selectedEntry?.invoiceNumber}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="body2" color="text.secondary">Rechnungsdatum</Typography>
                        <Typography variant="body1">
                          {formatDate(new Date(fullInvoiceDetails.invoiceDate || selectedEntry?.invoiceDate || ''), 'dd.MM.yyyy')}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="body2" color="text.secondary">Fälligkeitsdatum</Typography>
                        <Typography variant="body1">
                          {fullInvoiceDetails.dueDate 
                            ? formatDate(new Date(fullInvoiceDetails.dueDate), 'dd.MM.yyyy')
                            : selectedEntry?.dueDate
                            ? formatDate(new Date(selectedEntry.dueDate), 'dd.MM.yyyy')
                            : '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="body2" color="text.secondary">Status</Typography>
                        <Chip 
                          label={fullInvoiceDetails.status || selectedEntry?.status} 
                          size="small" 
                          color={
                            (fullInvoiceDetails.status || selectedEntry?.status) === 'paid' ? 'success' :
                            (fullInvoiceDetails.status || selectedEntry?.status) === 'overdue' ? 'error' :
                            (fullInvoiceDetails.status || selectedEntry?.status) === 'cancelled' ? 'default' : 'info'
                          }
                        />
                      </Box>
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="body2" color="text.secondary">Abrechnungstyp</Typography>
                        <Chip 
                          label={fullInvoiceDetails.billingType || selectedEntry?.billingType} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="body2" color="text.secondary">Zahlungsart</Typography>
                        <Typography variant="body1">
                          {fullInvoiceDetails.paymentMethod || selectedEntry?.paymentMethod || '-'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Divider />

              {/* Patient */}
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                  Patient
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                    <Typography variant="body2" color="text.secondary">Name</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {(() => {
                        // Patient kann als Objekt oder String kommen
                        const patient = fullInvoiceDetails.patient || selectedEntry?.patient;
                        if (!patient) return '-';
                        if (typeof patient === 'string') return patient;
                        if (patient.name) return patient.name;
                        if (patient.id && typeof patient.id === 'object') {
                          // Patient.id ist ein Objekt mit firstName/lastName
                          const patientObj = patient.id as any;
                          return `${patientObj.firstName || ''} ${patientObj.lastName || ''}`.trim() || '-';
                        }
                        return '-';
                      })()}
                    </Typography>
                  </Box>
                  {(() => {
                    const patient = fullInvoiceDetails.patient || selectedEntry?.patient;
                    if (!patient || typeof patient === 'string') return null;
                    const address = patient.address || (patient.id && typeof patient.id === 'object' ? (patient.id as any).address : null);
                    if (!address) return null;
                    return (
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="body2" color="text.secondary">Adresse</Typography>
                        <Typography variant="body1">
                          {address.street || ''}, {address.postalCode || address.zipCode || ''} {address.city || ''}
                        </Typography>
                      </Box>
                    );
                  })()}
                  {(() => {
                    const patient = fullInvoiceDetails.patient || selectedEntry?.patient;
                    if (!patient || typeof patient === 'string') return null;
                    const insuranceNumber = patient.insuranceNumber || (patient.id && typeof patient.id === 'object' ? (patient.id as any).insuranceNumber : null);
                    if (!insuranceNumber) return null;
                    return (
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="body2" color="text.secondary">Versicherungsnummer</Typography>
                        <Typography variant="body1">{insuranceNumber}</Typography>
                      </Box>
                    );
                  })()}
                </Box>
              </Box>

              <Divider />

              {/* Leistungen */}
              {(() => {
                const services = fullInvoiceDetails.services || selectedEntry?.services;
                if (!services || !Array.isArray(services) || services.length === 0) return null;
                return (
                  <>
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                        Leistungen
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Datum</TableCell>
                              <TableCell>Code</TableCell>
                              <TableCell>Beschreibung</TableCell>
                              <TableCell align="right">Menge</TableCell>
                              <TableCell align="right">Einzelpreis</TableCell>
                              <TableCell align="right">Gesamt</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {services.map((service: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>
                                  {service.date ? formatDate(new Date(service.date), 'dd.MM.yyyy') : '-'}
                                </TableCell>
                                <TableCell>{service.serviceCode || service.code || '-'}</TableCell>
                                <TableCell>{stripHtmlTags(service.description || service.name || '-')}</TableCell>
                                <TableCell align="right">{service.quantity || 1}</TableCell>
                                <TableCell align="right">€{toEuro(service.unitPrice || service.price_cents || 0).toFixed(2)}</TableCell>
                                <TableCell align="right">€{toEuro(service.totalPrice || (service.unitPrice || service.price_cents || 0) * (service.quantity || 1)).toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                    <Divider />
                  </>
                );
              })()}

              {/* Beträge */}
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                  Beträge
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Zwischensumme</Typography>
                    <Typography variant="body1">
                      €{toEuro(fullInvoiceDetails.subtotal || selectedEntry?.subtotal || fullInvoiceDetails.totalAmount || selectedEntry?.totalAmount || 0).toFixed(2)}
                    </Typography>
                  </Box>
                  {(fullInvoiceDetails.taxAmount || selectedEntry?.taxAmount) && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        MwSt. ({fullInvoiceDetails.taxRate || selectedEntry?.taxRate || 0}%)
                      </Typography>
                      <Typography variant="body1">
                        €{toEuro(fullInvoiceDetails.taxAmount || selectedEntry?.taxAmount || 0).toFixed(2)}
                      </Typography>
                    </Box>
                  )}
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" fontWeight="bold">Gesamtbetrag</Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      €{toEuro(fullInvoiceDetails.totalAmount || selectedEntry?.totalAmount || 0).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Zusätzliche Informationen */}
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                  Zusätzliche Informationen
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {fullInvoiceDetails.locationId && (
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      <Typography variant="body2" color="text.secondary">Standort</Typography>
                      <Typography variant="body1">
                        {typeof fullInvoiceDetails.locationId === 'object' 
                          ? fullInvoiceDetails.locationId.name 
                          : selectedEntry?.locationId?.name || '-'}
                      </Typography>
                    </Box>
                  )}
                  {selectedEntry?.journalHash && (
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      <Typography variant="body2" color="text.secondary">Journal-Hash</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                        {selectedEntry.journalHash}
                      </Typography>
                    </Box>
                  )}
                  {selectedReceiptEntry?.receiptHash && (
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      <Typography variant="body2" color="text.secondary">Beleg-Hash</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                        {selectedReceiptEntry.receiptHash}
                      </Typography>
                    </Box>
                  )}
                  {selectedReceiptEntry?.tseSignature && (
                    <>
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="body2" color="text.secondary">TSE-Seriennummer</Typography>
                        <Typography variant="body1">
                          {selectedReceiptEntry.tseSignature.tseSerial || '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="body2" color="text.secondary">Signatur-Zähler</Typography>
                        <Typography variant="body1">
                          {selectedReceiptEntry.tseSignature.signatureCounter || '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="body2" color="text.secondary">Kassennummer</Typography>
                        <Typography variant="body1">
                          {selectedReceiptEntry.cashBoxId || '-'}
                        </Typography>
                      </Box>
                    </>
                  )}
                  <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                    <Typography variant="body2" color="text.secondary">Erstellt am</Typography>
                    <Typography variant="body1">
                      {formatDate(new Date(selectedEntry?.createdAt || selectedReceiptEntry?.receiptData?.timestamp || ''), 'dd.MM.yyyy HH:mm')}
                    </Typography>
                  </Box>
                </Box>
              </Box>
                </>
              )}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Keine Details verfügbar
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Hilfe-Dialog mit Leitfaden */}
      <Dialog 
        open={helpDialogOpen} 
        onClose={() => setHelpDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { minHeight: '600px' }
        }}
      >
        <GradientDialogTitle 
          title="Leitfaden: Journal" 
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs 
            value={helpTab} 
            onChange={(_, v) => setHelpTab(v)} 
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Übersicht" />
            <Tab label="Rechnungsjournal" />
            <Tab label="Registrierkassa-Journal" />
            <Tab label="Filter & Suche" />
            <Tab label="Export" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Was ist das Journal?
                </Typography>
                <Typography variant="body1" paragraph>
                  Das Journal ist eine vollständige, unveränderbare Aufzeichnung aller 
                  Rechnungen und Registrierkassa-Belege. Es dient der Dokumentation, 
                  Nachverfolgbarkeit und gesetzlichen Compliance.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📋 <strong>Rechnungsjournal:</strong> Vollständige Aufzeichnung aller Rechnungen</li>
                  <li>🧾 <strong>Registrierkassa-Journal:</strong> Aufzeichnung aller Belege</li>
                  <li>🔍 <strong>Suche & Filter:</strong> Nach Datum, Standort, Status filtern</li>
                  <li>👁️ <strong>Details anzeigen:</strong> Vollständige Informationen zu jedem Eintrag</li>
                  <li>📥 <strong>Export:</strong> Journal-Einträge exportieren</li>
                  <li>🔐 <strong>Unveränderbarkeit:</strong> Journal-Hash für Integrität</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Gesetzliche Anforderungen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>RKSVO (Registrierkassensicherheitsverordnung)</li>
                  <li>UGB (Unternehmensgesetzbuch) - Buchführungspflicht</li>
                  <li>BAO (Bundesabgabenordnung) - Aufbewahrungspflicht</li>
                  <li>DSGVO - Datenschutz</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Rechnungsjournal
                </Typography>
                <Typography variant="body2" paragraph>
                  Das Rechnungsjournal enthält alle erstellten, geänderten oder gelöschten Rechnungen 
                  mit vollständigen Informationen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Angezeigte Informationen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Rechnungsnummer:</strong> Eindeutige Rechnungsnummer</li>
                  <li><strong>Rechnungsdatum:</strong> Datum der Rechnung</li>
                  <li><strong>Patient:</strong> Name und Adresse</li>
                  <li><strong>Leistungen:</strong> Liste aller Leistungen mit Preisen</li>
                  <li><strong>Beträge:</strong> Zwischensumme, Steuer, Gesamtbetrag</li>
                  <li><strong>Status:</strong> Aktueller Rechnungsstatus</li>
                  <li><strong>Journal-Hash:</strong> Eindeutiger Hash für Integrität</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Details anzeigen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf das Augen-Icon bei einem Eintrag</li>
                  <li>Der Detail-Dialog zeigt alle Informationen</li>
                  <li>Vollständige Rechnungsdetails werden geladen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Registrierkassa-Journal
                </Typography>
                <Typography variant="body2" paragraph>
                  Das Registrierkassa-Journal enthält alle Belege der Registrierkassen, 
                  einschließlich Startbelege, Normalbelege, Monats- und Jahresbelege.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Belegarten
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Startbeleg:</strong> Erster Beleg bei Kassenstart</li>
                  <li><strong>Normal:</strong> Reguläre Verkaufsbelege</li>
                  <li><strong>Monatsbeleg:</strong> Monatliche Zusammenfassung</li>
                  <li><strong>Jahresbeleg:</strong> Jährliche Zusammenfassung</li>
                  <li><strong>Storno:</strong> Stornierte Belege</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  TSE (Technische Sicherheitseinrichtung)
                </Typography>
                <Typography variant="body2" paragraph>
                  Alle Belege werden durch eine TSE signiert, die gesetzlich vorgeschrieben ist. 
                  Die TSE-Signatur stellt sicher, dass Belege nicht manipuliert werden können.
                </Typography>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Filter & Suche
                </Typography>
                <Typography variant="body2" paragraph>
                  Das Journal bietet umfangreiche Filter- und Suchmöglichkeiten.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Datumsfilter
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Tag:</strong> Einen spezifischen Tag auswählen</li>
                  <li><strong>Monat:</strong> Einen Monat auswählen</li>
                  <li><strong>Jahr:</strong> Ein Jahr auswählen</li>
                  <li><strong>Zeitraum:</strong> Benutzerdefiniertes Datumsintervall (von/bis)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Weitere Filter
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Standort:</strong> Filter nach Standort</li>
                  <li><strong>Abrechnungstyp:</strong> Privat, Kassenarzt, Wahlarzt</li>
                  <li><strong>Status:</strong> Rechnungsstatus (nur Rechnungsjournal)</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Export
                </Typography>
                <Typography variant="body2" paragraph>
                  Journal-Einträge können für Dokumentation und Archivierung exportiert werden.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Export-Funktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>PDF-Export:</strong> Journal-Einträge als PDF</li>
                  <li><strong>Excel-Export:</strong> Journal-Einträge als Excel-Datei</li>
                  <li><strong>CSV-Export:</strong> Journal-Einträge als CSV-Datei</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Aufbewahrungspflicht
                </Typography>
                <Typography variant="body2" paragraph>
                  Journal-Einträge müssen gesetzlich aufbewahrt werden:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>UGB:</strong> 7 Jahre Aufbewahrungspflicht</li>
                  <li><strong>BAO:</strong> 7 Jahre Aufbewahrungspflicht</li>
                  <li><strong>RKSVO:</strong> Unbegrenzte Aufbewahrung für TSE-Belege</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 5 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Regelmäßige Überprüfung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Überprüfen Sie das Journal monatlich</li>
                  <li>✅ Stellen Sie sicher, dass alle Rechnungen erfasst sind</li>
                  <li>✅ Prüfen Sie die Konsistenz der Daten</li>
                  <li>✅ Überprüfen Sie die Journal-Hashes</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Export & Backup
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📥 Exportieren Sie das Journal regelmäßig</li>
                  <li>📥 Speichern Sie Exports an sicheren Orten</li>
                  <li>📥 Archivieren Sie alte Journal-Einträge</li>
                </Box>
              </Box>

              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Tipp:</strong> Verwenden Sie Filter, um schnell bestimmte Zeiträume 
                  oder Einträge zu finden. Exportieren Sie regelmäßig für Backup.
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)} variant="contained">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Journal;

