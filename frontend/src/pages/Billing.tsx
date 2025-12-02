import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import GradientDialogTitle from '../components/GradientDialogTitle';
import api from '../utils/api';
import { 
  fetchInvoices, 
  fetchServices, 
  fetchStatistics, 
  createInvoice, 
  updateInvoice, 
  deleteInvoice,
  clearError,
  Invoice,
  Service
} from '../store/slices/billingSlice';
import { fetchPatients, Patient } from '../store/slices/patientSlice';
import {
  Box,
  Typography,
  Card,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
  Divider,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Print,
  Euro,
  Receipt,
  TrendingUp,
  AttachMoney,
  QrCode,
  Download,
  Article,
  Star,
  Stars,
  LocalHospital,
  Person,
  PersonAdd,
  Email,
} from '@mui/icons-material';

const Billing: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { invoices, services, loading, error, statistics } = useAppSelector((state) => state.billing);
  const { patients } = useAppSelector((state) => state.patients);
  
  // Sicherheitsprüfung für invoices
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'view'>('add');
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'warning' | 'info' 
  });
  const [formData, setFormData] = useState<Partial<Invoice>>({
    billingType: 'privat',
    services: [],
    doctor: {
      name: '',
      address: {
        street: '',
        city: '',
        postalCode: '',
        country: 'Österreich'
      }
    },
    patient: {
      id: '',
      name: '',
      address: {
        street: '',
        city: '',
        postalCode: '',
        country: 'Österreich'
      }
    }
  });
  const [qrCodeDialog, setQrCodeDialog] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [loadingRKSVO, setLoadingRKSVO] = useState(false);
  const [loadingOGK, setLoadingOGK] = useState(false);
  const [quickServices, setQuickServices] = useState<Service[]>([]);
  const [turnusDialogOpen, setTurnusDialogOpen] = useState(false);
  const [turnusData, setTurnusData] = useState<any>(null);
  const [loadingTurnus, setLoadingTurnus] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [showCalculation, setShowCalculation] = useState(false);

  // Load data
  useEffect(() => {
    dispatch(fetchInvoices({}));
    dispatch(fetchServices({}));
    dispatch(fetchStatistics({}));
    dispatch(fetchPatients(1));
  }, [dispatch]);

  // Load quick services (quick_select = true)
  useEffect(() => {
    if (services && Array.isArray(services)) {
      console.log('🔍 All services loaded:', services.length);
      console.log('🔍 First service sample:', services[0]);
      console.log('🔍 Services with quick_select:', services.filter(s => s.quick_select));
      const quick = services.filter(s => s.quick_select === true);
      console.log('⭐ Quick services found:', quick.length, quick);
      setQuickServices(quick);
    }
  }, [services]);

  // Show error messages
  useEffect(() => {
    if (error) {
      setSnackbar({ open: true, message: error, severity: 'error' });
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleAddNew = () => {
    setFormData({
      billingType: 'privat',
      services: [],
      doctor: {
        name: 'Dr. Maria Brandt',
        title: 'Dr.',
        specialization: 'Allgemeinmedizin',
        address: {
          street: 'Medizinische Straße 10',
          city: 'Wien',
          postalCode: '1010',
          country: 'Österreich'
        },
        taxNumber: 'ATU12345678',
        chamberNumber: 'WKÖ'
      } as any,
      patient: {
        id: '',
        name: '',
        address: {
          street: '',
          city: '',
          postalCode: '',
          country: 'Österreich'
        }
      } as any
    });
    setDialogMode('add');
    setActiveTab(0);
    setOpenDialog(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setFormData(invoice);
    setDialogMode('edit');
    setActiveTab(0);
    setOpenDialog(true);
  };

  const handleView = async (invoice: Invoice) => {
    try {
      // Lade vollständige Rechnungsdetails von der API
      const token = localStorage.getItem('token');
      const response = await api.get<any>(`/billing/invoices/${invoice._id || invoice.id}`);
      
      if (response.success && response.data) {
        setFormData(response.data);
        setDialogMode('view');
        setActiveTab(0);
        setOpenDialog(true);
      } else {
        // Fallback auf vorhandene Daten
        setFormData(invoice);
        setDialogMode('view');
        setActiveTab(0);
        setOpenDialog(true);
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der Rechnungsdetails:', error);
      // Fallback auf vorhandene Daten
      setFormData(invoice);
      setDialogMode('view');
      setActiveTab(0);
      setOpenDialog(true);
      setSnackbar({
        open: true,
        message: 'Rechnungsdetails konnten nicht vollständig geladen werden',
        severity: 'warning'
      });
    }
  };

  const handlePrintInvoice = async (invoice: Invoice) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Kein Authentifizierungstoken gefunden');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/billing/invoices/${invoice._id}/pdf`, {
        method: 'POST',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF-Generierung Fehler:', errorText);
        throw new Error('PDF-Generierung fehlgeschlagen');
      }

      // Prüfen ob Response ein PDF ist
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        throw new Error('Unerwarteter Dateityp erhalten');
      }

      const blob = await response.blob();
      
      // Prüfen ob Blob gültig ist
      if (blob.size === 0) {
        throw new Error('PDF-Datei ist leer');
      }

      // PDF-Download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Rechnung_${invoice.invoiceNumber}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      setSnackbar({
        open: true,
        message: 'PDF erfolgreich heruntergeladen',
        severity: 'success'
      });
    } catch (error) {
      console.error('Druck-Fehler:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Generieren der PDF',
        severity: 'error'
      });
    }
  };

  const handleSendEmail = async (invoice: Invoice) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Kein Authentifizierungstoken gefunden');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/billing/invoices/${invoice._id}/send-email`, {
        method: 'POST',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'E-Mail-Versand fehlgeschlagen');
      }

      setSnackbar({
        open: true,
        message: `Rechnung erfolgreich an ${invoice.patient.email || 'Patient'} gesendet`,
        severity: 'success'
      });

      // Rechnungsliste aktualisieren
      dispatch(fetchInvoices({}));
    } catch (error: any) {
      console.error('E-Mail-Versand-Fehler:', error);
      setSnackbar({
        open: true,
        message: error?.message || 'Fehler beim Versenden der E-Mail',
        severity: 'error'
      });
    }
  };

  const handleOneClick = async (invoice: Invoice) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Kein Authentifizierungstoken gefunden');
      }

      // Loading-Indikator anzeigen
      setSnackbar({
        open: true,
        message: 'PDF wird generiert und per E-Mail versendet...',
        severity: 'info'
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/billing/invoices/${invoice._id}/one-click`, {
        method: 'POST',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'One-Click-Versand fehlgeschlagen');
      }

      setSnackbar({
        open: true,
        message: `✅ One-Click erfolgreich! Rechnung per E-Mail an ${result.data?.patientEmail || 'Patient'} versendet`,
        severity: 'success'
      });

      // Rechnungsliste aktualisieren
      dispatch(fetchInvoices({}));
    } catch (error: any) {
      console.error('One-Click Fehler:', error);
      setSnackbar({
        open: true,
        message: `One-Click fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}`,
        severity: 'error'
      });
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (window.confirm(`Möchten Sie die Rechnung ${invoice?.invoiceNumber || 'Unbekannt'} wirklich löschen?`)) {
      try {
        await dispatch(deleteInvoice(invoice?._id || invoice?.id || '')).unwrap();
        setSnackbar({ open: true, message: 'Rechnung erfolgreich gelöscht', severity: 'success' });
      } catch (error) {
        setSnackbar({ open: true, message: 'Fehler beim Löschen der Rechnung', severity: 'error' });
      }
    }
  };

  const handleSave = async () => {
    try {
      if (dialogMode === 'add') {
        // Generate invoice number if not provided
        if (!formData.invoiceNumber) {
          const timestamp = Date.now();
          formData.invoiceNumber = `INV-${timestamp}`;
        }
        
        // Ensure all required fields are present
        const invoiceToCreate = {
          ...formData,
          invoiceNumber: formData.invoiceNumber || `INV-${Date.now()}`,
          invoiceDate: formData.invoiceDate || new Date(),
          dueDate: formData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: formData.subtotal || 0,
          taxAmount: formData.taxAmount || 0,
          taxRate: formData.taxRate || 0,
          totalAmount: formData.totalAmount || formData.services?.reduce((sum: number, s: any) => sum + s.totalPrice, 0) || 0,
          status: formData.status || 'draft'
        };
        
        await dispatch(createInvoice(invoiceToCreate)).unwrap();
        setSnackbar({ open: true, message: 'Rechnung erfolgreich erstellt', severity: 'success' });
      } else if (dialogMode === 'edit') {
        await dispatch(updateInvoice({ 
          id: formData._id || formData.id || '', 
          invoiceData: formData 
        })).unwrap();
        setSnackbar({ open: true, message: 'Rechnung erfolgreich aktualisiert', severity: 'success' });
      }
      setOpenDialog(false);
      dispatch(fetchInvoices({}));
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      setSnackbar({ open: true, message: error?.message || 'Fehler beim Speichern der Rechnung', severity: 'error' });
    }
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleServiceAdd = async (service: Service) => {
    // Wenn Patient und Abrechnungstyp vorhanden, automatische Berechnung durchführen
    if (formData.patient?.id && formData.billingType) {
      try {
        const calculation = await handleCalculateBilling(
          formData.patient.id,
          service.code,
          formData.billingType
        );
        
        if (calculation) {
          const newService = {
            date: new Date(),
            serviceCode: service.code,
            description: service.name,
            quantity: 1,
            unitPrice: calculation.grossAmount || service.prices?.privat || 0,
            totalPrice: calculation.grossAmount || service.prices?.privat || 0,
            category: service.category,
            calculation: calculation // Speichere Berechnungsergebnis
          };
          
          setFormData(prev => ({
            ...prev,
            services: [...(prev.services || []), newService],
            subtotal: (prev.subtotal || 0) + newService.totalPrice,
            totalAmount: (prev.totalAmount || 0) + newService.totalPrice
          }));
          
          // Zeige Warnungen falls vorhanden
          if (calculation.warnings && calculation.warnings.length > 0) {
            setSnackbar({
              open: true,
              message: calculation.warnings.join(', '),
              severity: 'warning'
            });
          }
        } else {
          // Fallback auf Standard-Preis
          const newService = {
            date: new Date(),
            serviceCode: service.code,
            description: service.name,
            quantity: 1,
            unitPrice: service.prices?.privat || 0,
            totalPrice: service.prices?.privat || 0,
            category: service.category
          };
          
          setFormData(prev => ({
            ...prev,
            services: [...(prev.services || []), newService]
          }));
        }
      } catch (error) {
        // Fallback auf Standard-Preis bei Fehler
        const newService = {
          date: new Date(),
          serviceCode: service.code,
          description: service.name,
          quantity: 1,
          unitPrice: service.prices?.privat || 0,
          totalPrice: service.prices?.privat || 0,
          category: service.category
        };
        
        setFormData(prev => ({
          ...prev,
          services: [...(prev.services || []), newService]
        }));
      }
    } else {
      // Keine automatische Berechnung möglich, Standard-Preis verwenden
      const newService = {
        date: new Date(),
        serviceCode: service.code,
        description: service.name,
        quantity: 1,
        unitPrice: service.prices?.privat || 0,
        totalPrice: service.prices?.privat || 0,
        category: service.category
      };
      
      setFormData(prev => ({
        ...prev,
        services: [...(prev.services || []), newService]
      }));
    }
  };

  const handleQuickBill = (service: Service) => {
    // Öffne Dialog mit vorausgefüllter Schnell-Leistung
    setDialogMode('add');
    setFormData({
      billingType: 'privat',
      services: [{
        date: new Date(),
        serviceCode: service.code,
        description: service.name,
        quantity: 1,
        unitPrice: service.prices?.privat || 0,
        totalPrice: service.prices?.privat || 0,
        category: service.category
      }],
      doctor: {
        name: 'Dr. Maria Brandt',
        title: 'Dr.',
        specialization: 'Allgemeinmedizin',
        address: {
          street: 'Medizinische Straße 10',
          city: 'Wien',
          postalCode: '1010',
          country: 'Österreich'
        },
        taxNumber: 'ATU12345678',
        chamberNumber: 'WKÖ'
      } as any,
      patient: {
        id: '',
        name: '',
        address: {
          street: '',
          city: '',
          postalCode: '',
          country: 'Österreich'
        }
      } as any,
      status: 'draft',
      subtotal: service.prices?.privat || 0,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: service.prices?.privat || 0,
    });
    setActiveTab(0);
    setOpenDialog(true);
  };

  const handleGenerateRKSVO = async (invoice: Invoice) => {
    try {
      setLoadingRKSVO(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/billing/generate-rksvo-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invoiceId: invoice?._id || invoice?.id })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setQrCodeData(data.data.qrCode);
        setQrCodeDialog(true);
        setSnackbar({ open: true, message: 'RKSVO-Beleg erfolgreich generiert!', severity: 'success' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Fehler beim Generieren des RKSVO-Belegs', severity: 'error' });
    } finally {
      setLoadingRKSVO(false);
    }
  };

  const handleExportOGK = async (invoice: Invoice) => {
    try {
      setLoadingOGK(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/billing/export-ogk-xml`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          invoiceIds: [invoice?._id || invoice?.id],
          doctorInfo: {
            name: invoice?.doctor?.name || 'Unbekannt',
            address: invoice?.doctor?.address || {}
          }
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ogk-invoice-${invoice?.invoiceNumber || 'unbekannt'}.xml`;
        a.click();
        setSnackbar({ open: true, message: 'ÖGK-XML erfolgreich exportiert!', severity: 'success' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Fehler beim Export des ÖGK-XML', severity: 'error' });
    } finally {
      setLoadingOGK(false);
    }
  };

  const handleExportInsurance = async (invoice: Invoice, insuranceProvider: string) => {
    try {
      setLoadingOGK(true);
      const response = await api.get(`/insurance-billing/export/${invoice._id || invoice.id}`, {
        responseType: 'blob'
      } as any);
      
      if (response.success) {
        const blob = response.data instanceof Blob ? response.data : new Blob([response.data as BlobPart]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${insuranceProvider.toLowerCase()}-invoice-${invoice?.invoiceNumber || 'unbekannt'}.xml`;
        a.click();
        setSnackbar({ open: true, message: `${insuranceProvider}-XML erfolgreich exportiert!`, severity: 'success' });
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: `Fehler beim Export des ${insuranceProvider}-XML`, severity: 'error' });
    } finally {
      setLoadingOGK(false);
    }
  };

  // Berechnungsfunktion für automatische Preisberechnung
  const handleCalculateBilling = async (patientId: string, serviceCode: string, billingType: string) => {
    try {
      const response = await api.post<any>('/billing/calculate', {
        patientId,
        serviceCode,
        billingType
      });

      if (response.success && response.data) {
        setCalculationResult(response.data);
        setShowCalculation(true);
        return response.data;
      }
    } catch (error: any) {
      console.error('Berechnungsfehler:', error);
      setSnackbar({
        open: true,
        message: error?.message || 'Fehler bei der Berechnung',
        severity: 'error'
      });
    }
    return null;
  };

  // Turnusabrechnung laden
  const handleLoadTurnusabrechnung = async (startDate: string, endDate: string) => {
    try {
      setLoadingTurnus(true);
      const response = await api.get<any>('/billing/turnusabrechnung', {
        startDate,
        endDate
      });

      if (response.success && response.data) {
        setTurnusData(response.data);
        setTurnusDialogOpen(true);
      }
    } catch (error: any) {
      console.error('Turnusabrechnung-Fehler:', error);
      setSnackbar({
        open: true,
        message: error?.message || 'Fehler beim Laden der Turnusabrechnung',
        severity: 'error'
      });
    } finally {
      setLoadingTurnus(false);
    }
  };

  // Test-E-Mail senden
  const handleTestEmail = async (email: string) => {
    try {
      const response = await api.post<any>('/billing/test-email', { email });

      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Test-E-Mail erfolgreich versendet',
          severity: 'success'
        });
      }
    } catch (error: any) {
      console.error('Test-E-Mail-Fehler:', error);
      setSnackbar({
        open: true,
        message: error?.message || 'Fehler beim Versenden der Test-E-Mail',
        severity: 'error'
      });
    }
  };

  const filteredInvoices = safeInvoices.filter(invoice => {
    // Sicherheitsprüfung für invoice Objekt
    if (!invoice) return false;
    
    return (
      (invoice.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.patient?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.billingType || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const paginatedInvoices = filteredInvoices.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'sent': return 'info';
      case 'draft': return 'default';
      case 'overdue': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getBillingTypeColor = (type: string) => {
    switch (type) {
      case 'kassenarzt': return 'primary';
      case 'wahlarzt': return 'secondary';
      case 'privat': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Abrechnung
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Receipt />}
            onClick={() => {
              const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
              const endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
              handleLoadTurnusabrechnung(startDate, endDate);
            }}
            sx={{ borderRadius: 2 }}
          >
            Turnusabrechnung
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddNew}
            sx={{ borderRadius: 2 }}
          >
            Neue Rechnung
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      {statistics && statistics.overview && (
        <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
          <Card sx={{ p: 2, textAlign: 'center', flex: '1 1 200px', minWidth: '200px' }}>
            <Typography variant="h4" color="primary">
              {statistics.overview.totalInvoices || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gesamt Rechnungen
            </Typography>
          </Card>
          <Card sx={{ p: 2, textAlign: 'center', flex: '1 1 200px', minWidth: '200px' }}>
            <Typography variant="h4" color="success.main">
              €{(statistics.overview.totalAmount || 0).toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gesamtbetrag
            </Typography>
          </Card>
          <Card sx={{ p: 2, textAlign: 'center', flex: '1 1 200px', minWidth: '200px' }}>
            <Typography variant="h4" color="info.main">
              €{(statistics.overview.paidAmount || 0).toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Bezahlt
            </Typography>
          </Card>
          <Card sx={{ p: 2, textAlign: 'center', flex: '1 1 200px', minWidth: '200px' }}>
            <Typography variant="h4" color="warning.main">
              €{(statistics.overview.pendingAmount || 0).toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ausstehend
            </Typography>
          </Card>
        </Box>
      )}

      {/* Schnell-Leistungen Dashboard */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Stars sx={{ color: 'warning.main', fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Schnell-Leistungen
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Häufig gebrauchte Leistungen für schnelle Abrechnung
            </Typography>
          </Box>
        </Box>
        
        {quickServices.length === 0 ? (
          <Box textAlign="center" py={4}>
            <LocalHospital sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Keine Schnell-Leistungen definiert
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Markieren Sie Leistungen im Leistungskatalog als "Schnellauswahl"
            </Typography>
          </Box>
        ) : (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: 2 
          }}>
            {quickServices.map((service) => (
              <Card 
                key={service._id} 
                sx={{ 
                  p: 2, 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  }
                }}
                onClick={() => handleQuickBill(service)}
              >
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <Avatar 
                    sx={{ 
                      bgcolor: service.color_hex || 'primary.main',
                      width: 40,
                      height: 40
                    }}
                  >
                    <LocalHospital />
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      {service.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {service.code}
                    </Typography>
                    <Chip 
                      label={`€${((service.prices?.privat || 0) / 100).toFixed(2)}`}
                      size="small"
                      color="success"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Box>
              </Card>
            ))}
          </Box>
        )}
      </Card>

      <Card sx={{ mb: 3 }}>
        <Box p={3}>
          <TextField
            fullWidth
            placeholder="Rechnungen suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rechnungsnummer</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Typ</TableCell>
                <TableCell>Betrag</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Datum</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : paginatedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Keine Rechnungen gefunden
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map((invoice) => (
                  <TableRow key={invoice._id || invoice.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {invoice.invoiceNumber || 'Keine Nummer'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {invoice.patient?.name || 'Unbekannter Patient'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.billingType || 'Unbekannt'}
                        color={getBillingTypeColor(invoice.billingType) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        €{(invoice.totalAmount || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.status || 'Unbekannt'}
                        color={getStatusColor(invoice.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('de-DE') : 'Kein Datum'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedInvoice(invoice);
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredInvoices.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => { handleView(selectedInvoice!); setAnchorEl(null); }}>
          <Visibility sx={{ mr: 1 }} />
          Anzeigen
        </MenuItem>
        <MenuItem onClick={() => { handleEdit(selectedInvoice!); setAnchorEl(null); }}>
          <Edit sx={{ mr: 1 }} />
          Bearbeiten
        </MenuItem>
        <MenuItem onClick={() => { handleOneClick(selectedInvoice!); setAnchorEl(null); }}>
          <Email sx={{ mr: 1 }} />
          ⚡ One-Click: PDF + E-Mail
        </MenuItem>
        <MenuItem onClick={() => { handlePrintInvoice(selectedInvoice!); setAnchorEl(null); }}>
          <Print sx={{ mr: 1 }} />
          PDF drucken
        </MenuItem>
        <MenuItem onClick={() => { handleSendEmail(selectedInvoice!); setAnchorEl(null); }}>
          <Email sx={{ mr: 1 }} />
          Per E-Mail senden
        </MenuItem>
        <MenuItem onClick={() => { handleDelete(selectedInvoice!); setAnchorEl(null); }}>
          <Delete sx={{ mr: 1 }} />
          Löschen
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleGenerateRKSVO(selectedInvoice!); setAnchorEl(null); }}>
          <QrCode sx={{ mr: 1 }} />
          RKSVO-Beleg generieren
        </MenuItem>
        <MenuItem onClick={() => { handleExportOGK(selectedInvoice!); setAnchorEl(null); }}>
          <Article sx={{ mr: 1 }} />
          ÖGK-XML exportieren
        </MenuItem>
        {selectedInvoice?.patient?.insuranceProvider && (
          <>
            {selectedInvoice.patient.insuranceProvider.includes('SVS') && (
              <MenuItem onClick={() => { handleExportInsurance(selectedInvoice!, 'SVS'); setAnchorEl(null); }}>
                <Article sx={{ mr: 1 }} />
                SVS-XML exportieren
              </MenuItem>
            )}
            {selectedInvoice.patient.insuranceProvider.includes('BVAEB') && (
              <MenuItem onClick={() => { handleExportInsurance(selectedInvoice!, 'BVAEB'); setAnchorEl(null); }}>
                <Article sx={{ mr: 1 }} />
                BVAEB-XML exportieren
              </MenuItem>
            )}
            {selectedInvoice.patient.insuranceProvider.includes('KFA') && (
              <MenuItem onClick={() => { handleExportInsurance(selectedInvoice!, 'KFA'); setAnchorEl(null); }}>
                <Article sx={{ mr: 1 }} />
                KFA-XML exportieren
              </MenuItem>
            )}
            {selectedInvoice.patient.insuranceProvider.includes('PVA') && (
              <MenuItem onClick={() => { handleExportInsurance(selectedInvoice!, 'PVA'); setAnchorEl(null); }}>
                <Article sx={{ mr: 1 }} />
                PVA-XML exportieren
              </MenuItem>
            )}
          </>
        )}
        <Divider />
        <MenuItem onClick={() => {
          const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
          const endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
          handleLoadTurnusabrechnung(startDate, endDate);
          setAnchorEl(null);
        }}>
          <Receipt sx={{ mr: 1 }} />
          Turnusabrechnung
        </MenuItem>
      </Menu>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <GradientDialogTitle
          isEdit={dialogMode === 'edit'}
          title={
            dialogMode === 'add' ? 'Neue Rechnung' :
            dialogMode === 'edit' ? 'Rechnung bearbeiten' :
            'Rechnung anzeigen'
          }
          icon={<Receipt />}
          gradientColors={{ from: '#f59e0b', to: '#d97706' }}
        />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ 
                mb: 3,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                }
              }}
            >
              <Tab label="Grunddaten" />
              <Tab label="Leistungen" />
              <Tab label="Zahlung" />
              <Tab label="ÖGK & Erstattung" />
            </Tabs>

          <Box sx={{ mt: 2 }}>
            {activeTab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Abrechnungstyp</InputLabel>
                      <Select
                        value={formData.billingType || ''}
                        onChange={(e) => handleFormChange('billingType', e.target.value)}
                        disabled={dialogMode === 'view'}
                      >
                        <SelectMenuItem value="kassenarzt">Kassenarzt</SelectMenuItem>
                        <SelectMenuItem value="wahlarzt">Wahlarzt</SelectMenuItem>
                        <SelectMenuItem value="privat">Privat</SelectMenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <TextField
                      fullWidth
                      label="Rechnungsdatum"
                      type="date"
                      value={formData.invoiceDate ? new Date(formData.invoiceDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleFormChange('invoiceDate', new Date(e.target.value))}
                      InputLabelProps={{ shrink: true }}
                      disabled={dialogMode === 'view'}
                      margin="normal"
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Patienten-Schnellauswahl */}
                  {patients && patients.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Patienten-Schnellauswahl
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {patients.slice(0, 8).map((patient) => (
                          <Chip
                            key={patient._id}
                            label={`${patient.firstName} ${patient.lastName}`}
                            onClick={() => {
                              handleFormChange('patient', {
                                id: patient._id,
                                name: `${patient.firstName} ${patient.lastName}`,
                                address: {
                                  street: patient.address?.street || '',
                                  city: patient.address?.city || '',
                                  postalCode: patient.address?.postalCode || patient.address?.zipCode || '',
                                  country: patient.address?.country || 'Österreich'
                                }
                              });
                            }}
                            avatar={<Avatar sx={{ bgcolor: 'primary.main' }}><Person /></Avatar>}
                            variant={formData.patient?.id === patient._id ? 'filled' : 'outlined'}
                            color={formData.patient?.id === patient._id ? 'primary' : 'default'}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  
                  <Autocomplete
                    options={patients || []}
                    getOptionLabel={(option: Patient) => `${option.firstName} ${option.lastName}`}
                    isOptionEqualToValue={(option: Patient, value: Patient) => option._id === value._id}
                    value={patients?.find((p: Patient) => p._id === formData.patient?.id) || null}
                    onChange={(event, newValue: Patient | null) => {
                      if (newValue) {
                        handleFormChange('patient', {
                          id: newValue._id,
                          name: `${newValue.firstName} ${newValue.lastName}`,
                          address: {
                            street: newValue.address?.street || '',
                            city: newValue.address?.city || '',
                            postalCode: newValue.address?.postalCode || newValue.address?.zipCode || '',
                            country: newValue.address?.country || 'Österreich'
                          }
                        });
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Patient"
                        disabled={dialogMode === 'view'}
                        margin="normal"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <Person sx={{ ml: 1, mr: 1, color: 'text.secondary' }} />
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option: Patient) => {
                      const { key, ...restProps } = props;
                      return (
                        <Box component="li" key={key || option._id} {...restProps}>
                          <Avatar sx={{ mr: 1, bgcolor: 'primary.main', width: 32, height: 32 }}>
                            {option.firstName?.[0] || ''}
                          </Avatar>
                          <Box>
                            <Typography variant="body1">
                              {option.firstName} {option.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.phone || 'Kein Telefon'}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    }}
                  />
                </Box>
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Leistungen</Typography>
                  {dialogMode !== 'view' && (
                    <Autocomplete
                      options={services || []}
                      getOptionLabel={(option) => `${option.code} - ${option.name}`}
                      onChange={(event, newValue) => {
                        if (newValue) {
                          handleServiceAdd(newValue);
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Leistung hinzufügen"
                          variant="outlined"
                          size="small"
                          sx={{ minWidth: 300 }}
                        />
                      )}
                    />
                  )}
                </Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Datum</TableCell>
                        <TableCell>Code</TableCell>
                        <TableCell>Beschreibung</TableCell>
                        <TableCell>Menge</TableCell>
                        <TableCell>Einzelpreis</TableCell>
                        <TableCell>Gesamtpreis</TableCell>
                        {dialogMode !== 'view' && <TableCell>Aktionen</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.services?.map((service, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(service.date).toLocaleDateString('de-DE')}
                          </TableCell>
                          <TableCell>{service.serviceCode}</TableCell>
                          <TableCell>{service.description}</TableCell>
                          <TableCell>{service.quantity}</TableCell>
                          <TableCell>€{service.unitPrice.toFixed(2)}</TableCell>
                          <TableCell>€{service.totalPrice.toFixed(2)}</TableCell>
                          {dialogMode !== 'view' && (
                            <TableCell>
                              <IconButton
                                onClick={() => {
                                  const newServices = formData.services?.filter((_, i) => i !== index);
                                  handleFormChange('services', newServices);
                                }}
                                size="small"
                              >
                                <Delete />
                              </IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box mt={2} textAlign="right">
                  <Typography variant="h6">
                    Gesamtbetrag: €{formData.services?.reduce((sum, service) => sum + service.totalPrice, 0).toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              </Box>
            )}

            {activeTab === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={formData.status || ''}
                        onChange={(e) => handleFormChange('status', e.target.value)}
                        disabled={dialogMode === 'view'}
                      >
                        <SelectMenuItem value="draft">Entwurf</SelectMenuItem>
                        <SelectMenuItem value="sent">Versendet</SelectMenuItem>
                        <SelectMenuItem value="paid">Bezahlt</SelectMenuItem>
                        <SelectMenuItem value="overdue">Überfällig</SelectMenuItem>
                        <SelectMenuItem value="cancelled">Storniert</SelectMenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Zahlungsmethode</InputLabel>
                      <Select
                        value={formData.paymentMethod || ''}
                        onChange={(e) => handleFormChange('paymentMethod', e.target.value)}
                        disabled={dialogMode === 'view'}
                      >
                        <SelectMenuItem value="cash">Bar</SelectMenuItem>
                        <SelectMenuItem value="transfer">Überweisung</SelectMenuItem>
                        <SelectMenuItem value="card">Karte</SelectMenuItem>
                        <SelectMenuItem value="insurance">Versicherung</SelectMenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label="Notizen"
                    multiline
                    rows={3}
                    value={formData.notes || ''}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    disabled={dialogMode === 'view'}
                    margin="normal"
                  />
                </Box>
              </Box>
            )}

            {activeTab === 3 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* ÖGK-Informationen */}
                <Card sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">ÖGK-Abrechnung</Typography>
                    {formData.billingType === 'kassenarzt' && (
                      <Chip label="Kassenarzt" color="primary" size="small" />
                    )}
                  </Box>
                  {formData.billingType === 'kassenarzt' ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: '1 1 200px' }}>
                          <Typography variant="body2" color="text.secondary">EBM-Code</Typography>
                          <Typography variant="body1">
                            {formData.services?.[0]?.serviceCode || 'Nicht angegeben'}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: '1 1 200px' }}>
                          <Typography variant="body2" color="text.secondary">Status</Typography>
                          <Chip
                            label={formData.insuranceBilling?.status || 'pending'}
                            color={
                              formData.insuranceBilling?.status === 'approved' ? 'success' :
                              formData.insuranceBilling?.status === 'rejected' ? 'error' :
                              formData.insuranceBilling?.status === 'submitted' ? 'info' : 'default'
                            }
                            size="small"
                          />
                        </Box>
                      </Box>
                      {formData.insuranceBilling?.referenceNumber && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">Referenznummer</Typography>
                          <Typography variant="body1">{formData.insuranceBilling.referenceNumber}</Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                        {formData.patient?.insuranceProvider?.includes('ÖGK') && (
                          <Button
                            variant="outlined"
                            startIcon={<Article />}
                            onClick={() => formData._id && handleExportOGK(formData as Invoice)}
                            disabled={!formData._id || loadingOGK}
                          >
                            {loadingOGK ? <CircularProgress size={20} /> : 'ÖGK-XML exportieren'}
                          </Button>
                        )}
                        {formData.patient?.insuranceProvider?.includes('SVS') && (
                          <Button
                            variant="outlined"
                            startIcon={<Download />}
                            onClick={() => formData._id && handleExportInsurance(formData as Invoice, 'SVS')}
                            disabled={!formData._id || loadingOGK}
                          >
                            {loadingOGK ? <CircularProgress size={20} /> : 'SVS-XML exportieren'}
                          </Button>
                        )}
                        {formData.patient?.insuranceProvider?.includes('BVAEB') && (
                          <Button
                            variant="outlined"
                            startIcon={<Download />}
                            onClick={() => formData._id && handleExportInsurance(formData as Invoice, 'BVAEB')}
                            disabled={!formData._id || loadingOGK}
                          >
                            {loadingOGK ? <CircularProgress size={20} /> : 'BVAEB-XML exportieren'}
                          </Button>
                        )}
                        {formData.patient?.insuranceProvider?.includes('KFA') && (
                          <Button
                            variant="outlined"
                            startIcon={<Download />}
                            onClick={() => formData._id && handleExportInsurance(formData as Invoice, 'KFA')}
                            disabled={!formData._id || loadingOGK}
                          >
                            {loadingOGK ? <CircularProgress size={20} /> : 'KFA-XML exportieren'}
                          </Button>
                        )}
                        {formData.patient?.insuranceProvider?.includes('PVA') && (
                          <Button
                            variant="outlined"
                            startIcon={<Download />}
                            onClick={() => formData._id && handleExportInsurance(formData as Invoice, 'PVA')}
                            disabled={!formData._id || loadingOGK}
                          >
                            {loadingOGK ? <CircularProgress size={20} /> : 'PVA-XML exportieren'}
                          </Button>
                        )}
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Diese Rechnung ist nicht als Kassenarzt-Abrechnung konfiguriert.
                    </Typography>
                  )}
                </Card>

                {/* Erstattungsinformationen */}
                <Card sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Erstattungsverwaltung</Typography>
                    {formData.billingType === 'wahlarzt' && (
                      <Chip label="Wahlarzt" color="secondary" size="small" />
                    )}
                  </Box>
                  {formData.billingType === 'wahlarzt' || formData.billingType === 'privat' ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {formData.privateBilling && (
                        <>
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Box sx={{ flex: '1 1 200px' }}>
                              <Typography variant="body2" color="text.secondary">Erstattungsbetrag</Typography>
                              <Typography variant="h6" color="success.main">
                                €{(formData.privateBilling.reimbursementAmount || 0).toFixed(2)}
                              </Typography>
                            </Box>
                            <Box sx={{ flex: '1 1 200px' }}>
                              <Typography variant="body2" color="text.secondary">Patientenbetrag</Typography>
                              <Typography variant="h6" color="primary.main">
                                €{(formData.privateBilling.patientAmount || 0).toFixed(2)}
                              </Typography>
                            </Box>
                          </Box>
                          {formData.privateBilling.wahlarztCode && (
                            <Box>
                              <Typography variant="body2" color="text.secondary">Wahlarzt-Code</Typography>
                              <Typography variant="body1">{formData.privateBilling.wahlarztCode}</Typography>
                            </Box>
                          )}
                        </>
                      )}
                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button
                          variant="outlined"
                          startIcon={<Add />}
                          onClick={() => {
                            // Navigiere zur Erstattungsverwaltung mit dieser Rechnung
                            navigate(`/reimbursements?invoiceId=${formData._id || formData.id}`);
                          }}
                          disabled={!formData._id && !formData.id}
                        >
                          Erstattung erstellen
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => {
                            navigate(`/reimbursements?invoiceId=${formData._id || formData.id}`);
                          }}
                          disabled={!formData._id && !formData.id}
                        >
                          Erstattungen anzeigen
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Erstattungen sind nur für Wahlarzt- und Privatabrechnungen verfügbar.
                    </Typography>
                  )}
                </Card>
              </Box>
            )}
          </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            {dialogMode === 'view' ? 'Schließen' : 'Abbrechen'}
          </Button>
          {dialogMode !== 'view' && (
            <Button onClick={handleSave} variant="contained">
              {dialogMode === 'add' ? 'Erstellen' : 'Speichern'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* QR-Code Dialog */}
      <Dialog 
        open={qrCodeDialog} 
        onClose={() => setQrCodeDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <GradientDialogTitle
          isEdit={false}
          title="RKSVO-Beleg"
          icon={<QrCode />}
          gradientColors={{ from: '#8b5cf6', to: '#6d28d9' }}
        />
        <DialogContent sx={{ pt: 3, textAlign: 'center' }}>
          {qrCodeData && (
            <Box>
              <img src={qrCodeData} alt="QR-Code" style={{ width: '100%', maxWidth: '300px' }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Dieser QR-Code ist für die RKSVO-compliant Belegung erforderlich
              </Typography>
            </Box>
          )}
          {loadingRKSVO && <CircularProgress />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrCodeDialog(false)}>Schließen</Button>
          <Button variant="contained" startIcon={<Print />}>Drucken</Button>
        </DialogActions>
      </Dialog>

      {/* Turnusabrechnung Dialog */}
      <Dialog
        open={turnusDialogOpen}
        onClose={() => setTurnusDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <GradientDialogTitle
          isEdit={false}
          title="Turnusabrechnung"
          icon={<Receipt />}
          gradientColors={{ from: '#3b82f6', to: '#2563eb' }}
        />
        <DialogContent sx={{ pt: 3 }}>
          {loadingTurnus ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : turnusData ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Zusammenfassung
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Card sx={{ p: 2, flex: '1 1 200px' }}>
                  <Typography variant="body2" color="text.secondary">Anzahl Rechnungen</Typography>
                  <Typography variant="h5">{turnusData.count || 0}</Typography>
                </Card>
                <Card sx={{ p: 2, flex: '1 1 200px' }}>
                  <Typography variant="body2" color="text.secondary">Gesamtbetrag</Typography>
                  <Typography variant="h5">€{(turnusData.totals?.totalAmount || 0).toFixed(2)}</Typography>
                </Card>
                <Card sx={{ p: 2, flex: '1 1 200px' }}>
                  <Typography variant="body2" color="text.secondary">Selbstbehalt</Typography>
                  <Typography variant="h5">€{(turnusData.totals?.copay || 0).toFixed(2)}</Typography>
                </Card>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Rechnungsnummer</TableCell>
                      <TableCell>Patient</TableCell>
                      <TableCell>Betrag</TableCell>
                      <TableCell>Selbstbehalt</TableCell>
                      <TableCell>Datum</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {turnusData.invoices?.map((invoice: any) => (
                      <TableRow key={invoice._id}>
                        <TableCell>{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          {invoice.patient?.id?.firstName} {invoice.patient?.id?.lastName}
                        </TableCell>
                        <TableCell>€{(invoice.totalAmount || 0).toFixed(2)}</TableCell>
                        <TableCell>€{(invoice.copay || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          {new Date(invoice.invoiceDate).toLocaleDateString('de-DE')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Typography>Keine Daten verfügbar</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTurnusDialogOpen(false)}>Schließen</Button>
          {turnusData && (
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={async () => {
                try {
                  const invoiceIds = turnusData.invoices?.map((inv: any) => inv._id) || [];
                  const response = await api.post('/billing/export-ogk-xml', {
                    invoiceIds,
                    doctorInfo: {
                      name: 'Dr. Maria Brandt',
                      address: {}
                    }
                  }, { responseType: 'blob' });

                  if (response.data instanceof Blob) {
                    const url = window.URL.createObjectURL(response.data);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `turnusabrechnung-${new Date().toISOString().split('T')[0]}.xml`;
                    a.click();
                    setSnackbar({
                      open: true,
                      message: 'Turnusabrechnung erfolgreich exportiert',
                      severity: 'success'
                    });
                  }
                } catch (error: any) {
                  setSnackbar({
                    open: true,
                    message: 'Fehler beim Export der Turnusabrechnung',
                    severity: 'error'
                  });
                }
              }}
            >
              ÖGK-XML exportieren
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Berechnungs-Dialog */}
      <Dialog
        open={showCalculation}
        onClose={() => setShowCalculation(false)}
        maxWidth="sm"
        fullWidth
      >
        <GradientDialogTitle
          isEdit={false}
          title="Berechnungsergebnis"
          icon={<AttachMoney />}
          gradientColors={{ from: '#10b981', to: '#059669' }}
        />
        <DialogContent sx={{ pt: 3 }}>
          {calculationResult && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Abrechnungstyp
              </Typography>
              <Typography variant="h6" gutterBottom>
                {calculationResult.billingType}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Bruttobetrag:</Typography>
                  <Typography fontWeight="bold">€{(calculationResult.grossAmount || 0).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Selbstbehalt:</Typography>
                  <Typography fontWeight="bold">€{(calculationResult.copay || 0).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Versicherungsbetrag:</Typography>
                  <Typography fontWeight="bold">€{(calculationResult.insuranceAmount || 0).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Patientenbetrag:</Typography>
                  <Typography fontWeight="bold">€{(calculationResult.patientAmount || 0).toFixed(2)}</Typography>
                </Box>
                {calculationResult.warnings && calculationResult.warnings.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="warning">
                      {calculationResult.warnings.map((warning: string, index: number) => (
                        <Typography key={index} variant="body2">{warning}</Typography>
                      ))}
                    </Alert>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCalculation(false)}>Schließen</Button>
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
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Billing;