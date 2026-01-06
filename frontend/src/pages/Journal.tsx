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
  Paper,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
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
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import { format as formatDate } from 'date-fns';
import { useSnackbar } from 'notistack';

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

const Journal: React.FC = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  
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
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const queryString = new URLSearchParams(params).toString();
      const url = `${baseUrl}/api${endpoint}?${queryString}`;
      
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Journal
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Unveränderbare Protokollierung aller Rechnungen und Registrierkassa-Belege für interne Überprüfung und Compliance
      </Typography>

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
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      label="Status"
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
                  €{(invoiceEntries.reduce((sum, entry) => sum + (entry.totalAmount || 0), 0) / 100).toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Bezahlt
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  €{(invoiceEntries
                    .filter(e => e.status === 'paid')
                    .reduce((sum, entry) => sum + (entry.totalAmount || 0), 0) / 100).toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Offen
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  €{(invoiceEntries
                    .filter(e => e.status !== 'paid' && e.status !== 'cancelled')
                    .reduce((sum, entry) => sum + (entry.totalAmount || 0), 0) / 100).toFixed(2)}
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
                  €{(receiptEntries.reduce((sum, entry) => sum + (entry.receiptData?.amount || 0), 0) / 100).toFixed(2)}
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
                        onClick={(e) => {
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
                        <TableCell>€{(entry.totalAmount / 100).toFixed(2)}</TableCell>
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
                        onClick={(e) => {
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
                        <TableCell>€{(entry.receiptData.amount / 100).toFixed(2)}</TableCell>
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
                        €{(selectedReceiptEntry.receiptData.amount / 100).toFixed(2)}
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
                                <TableCell>{service.description || service.name || '-'}</TableCell>
                                <TableCell align="right">{service.quantity || 1}</TableCell>
                                <TableCell align="right">€{((service.unitPrice || service.price_cents || 0) / 100).toFixed(2)}</TableCell>
                                <TableCell align="right">€{((service.totalPrice || (service.unitPrice || service.price_cents || 0) * (service.quantity || 1)) / 100).toFixed(2)}</TableCell>
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
                      €{((fullInvoiceDetails.subtotal || selectedEntry?.subtotal || fullInvoiceDetails.totalAmount || selectedEntry?.totalAmount || 0) / 100).toFixed(2)}
                    </Typography>
                  </Box>
                  {(fullInvoiceDetails.taxAmount || selectedEntry?.taxAmount) && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        MwSt. ({fullInvoiceDetails.taxRate || selectedEntry?.taxRate || 0}%)
                      </Typography>
                      <Typography variant="body1">
                        €{((fullInvoiceDetails.taxAmount || selectedEntry?.taxAmount || 0) / 100).toFixed(2)}
                      </Typography>
                    </Box>
                  )}
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" fontWeight="bold">Gesamtbetrag</Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      €{((fullInvoiceDetails.totalAmount || selectedEntry?.totalAmount || 0) / 100).toFixed(2)}
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
    </Box>
  );
};

export default Journal;

