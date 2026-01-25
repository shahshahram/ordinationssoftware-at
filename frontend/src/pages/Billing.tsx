import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import GradientDialogTitle from '../components/GradientDialogTitle';
import QRCodeGenerator from '../components/QRCodeGenerator';
import api from '../utils/api';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { startOfDay, endOfDay, formatDateString } from '../utils/timezone';
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
  Tooltip,
  useTheme,
  useMediaQuery,
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
  HelpOutline,
} from '@mui/icons-material';

// Hilfsfunktion zum Entfernen von HTML-Tags
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

// Hilfsfunktion: Gibt Service-Preis zurück (ALLE PREISE SIND BEREITS IN EURO!)
// KEINE KONVERTIERUNG MEHR NÖTIG - alle Preise sind bereits in Euro!
const getServicePriceInEuro = (service: Service): number => {
  // Wenn service.price vorhanden ist, verwende es direkt (bereits in Euro)
  if (service.price !== undefined && service.price !== null) {
    return service.price;
  }
  // Wenn service.prices?.privat vorhanden ist, verwende es direkt (bereits in Euro)
  if (service.prices?.privat !== undefined && service.prices?.privat !== null) {
    return service.prices.privat; // KEINE Konvertierung mehr - bereits in Euro!
  }
  return 0;
};

const Billing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const { invoices, services, loading, error, statistics } = useAppSelector((state) => state.billing);
  const { patients } = useAppSelector((state) => state.patients);
  const { marginTopValue } = useGlobalNavigationOffset();
  
  // Sicherheitsprüfung für invoices
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  
  // Lese Status-Filter aus URL Query-Parametern
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [patientIdFromUrl, setPatientIdFromUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const statusParam = searchParams.get('status');
    const patientIdParam = searchParams.get('patientId');
    
    if (statusParam) {
      // Unterstütze mehrere Status durch Komma-getrennte Liste
      const statuses = statusParam.split(',').map(s => s.trim()).filter(s => s);
      setStatusFilter(statuses);
    } else {
      setStatusFilter([]);
    }
    
    if (patientIdParam) {
      setPatientIdFromUrl(patientIdParam);
    } else {
      setPatientIdFromUrl(null);
    }
  }, [location.search]);
  
  // Datumsfilter - Standard: heute
  const today = new Date();
  const [dateFilter, setDateFilter] = useState<{ start: Date | null; end: Date | null }>({
    start: startOfDay(today),
    end: endOfDay(today)
  });
  
  // Totals für heute, Monat, Jahr
  const [totals, setTotals] = useState<{
    today: { count: number; amount: number };
    month: { count: number; amount: number };
    year: { count: number; amount: number };
  }>({
    today: { count: 0, amount: 0 },
    month: { count: 0, amount: 0 },
    year: { count: 0, amount: 0 }
  });
  
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
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  // ServiceCatalog-Daten für justificationRules
  const [serviceCatalogData, setServiceCatalogData] = useState<Record<string, any>>({});

  // Load data
  useEffect(() => {
    const params: any = {
      limit: 1000, // Erhöhtes Limit, um alle offenen Rechnungen zu laden
      page: 1
    };
    
    // Wenn Status-Filter vorhanden, füge sie zu den Parametern hinzu
    if (statusFilter.length > 0) {
      params.status = statusFilter.join(',');
    }
    
    // Wenn patientIdFromUrl vorhanden ist, füge Patient-Filter hinzu
    if (patientIdFromUrl) {
      params.patientId = patientIdFromUrl;
    }
    
    // Datumsfilter hinzufügen - Format in lokaler Zeit (nicht UTC)
    if (dateFilter.start) {
      params.startDate = formatDateString(dateFilter.start) || '';
    }
    if (dateFilter.end) {
      params.endDate = formatDateString(dateFilter.end) || '';
    }
    
    dispatch(fetchInvoices(params));
    dispatch(fetchServices({}));
    dispatch(fetchStatistics({}));
    dispatch(fetchPatients(1));
  }, [dispatch, statusFilter, dateFilter, patientIdFromUrl]);
  
  // Lade Totals für heute, Monat, Jahr
  useEffect(() => {
    const loadTotals = async () => {
      try {
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());
        const yearStart = startOfYear(new Date());
        const yearEnd = endOfYear(new Date());
        
        const [todayStats, monthStats, yearStats] = await Promise.all([
          api.get<any>('/billing/statistics', {
            startDate: todayStart?.toISOString() || '',
            endDate: todayEnd?.toISOString() || ''
          }),
          api.get<any>('/billing/statistics', {
            startDate: monthStart.toISOString(),
            endDate: monthEnd.toISOString()
          }),
          api.get<any>('/billing/statistics', {
            startDate: yearStart.toISOString(),
            endDate: yearEnd.toISOString()
          })
        ]);
        
        setTotals({
          today: {
            count: todayStats.data?.data?.overview?.totalInvoices || 0,
            amount: todayStats.data?.data?.overview?.totalAmount || 0
          },
          month: {
            count: monthStats.data?.data?.overview?.totalInvoices || 0,
            amount: monthStats.data?.data?.overview?.totalAmount || 0
          },
          year: {
            count: yearStats.data?.data?.overview?.totalInvoices || 0,
            amount: yearStats.data?.data?.overview?.totalAmount || 0
          }
        });
      } catch (error) {
        console.error('Fehler beim Laden der Totals:', error);
      }
    };

    loadTotals();
  }, []);

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
    // Wenn patientIdFromUrl vorhanden ist, verwende diesen Patienten
    const selectedPatient = patientIdFromUrl 
      ? patients?.find((p: Patient) => p._id === patientIdFromUrl || p.id === patientIdFromUrl)
      : null;
    
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
      patient: selectedPatient ? {
        id: selectedPatient._id || selectedPatient.id || '',
        name: `${selectedPatient.firstName || ''} ${selectedPatient.lastName || ''}`.trim(),
        address: {
          street: selectedPatient.address?.street || '',
          city: selectedPatient.address?.city || '',
          postalCode: selectedPatient.address?.zipCode || selectedPatient.address?.postalCode || '',
          country: selectedPatient.address?.country || 'Österreich'
        },
        insuranceProvider: selectedPatient.insuranceProvider || '',
        insuranceNumber: selectedPatient.insuranceNumber || '',
        socialSecurityNumber: selectedPatient.socialSecurityNumber || ''
      } as any : {
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

  const handleEdit = async (invoice: Invoice) => {
    try {
      // Lade vollständige Rechnungsdetails von der API (ähnlich wie handleView)
      const response = await api.get<any>(`/billing/invoices/${invoice._id || invoice.id}`);
      
      // API-Antwort-Struktur: { data: { success: true, data: invoice }, success: true }
      let invoiceData = null;
      if (response.data?.success && response.data.data) {
        invoiceData = response.data.data;
      } else if (response.data) {
        invoiceData = response.data;
      } else {
        invoiceData = invoice;
      }
      
      // Normalisiere patient.id - kann ein Objekt (populated) oder String sein
      if (invoiceData.patient?.id && typeof invoiceData.patient.id === 'object') {
        invoiceData.patient = {
          ...invoiceData.patient,
          id: invoiceData.patient.id._id || invoiceData.patient.id,
          name: invoiceData.patient.name || 
                (invoiceData.patient.id.firstName && invoiceData.patient.id.lastName 
                  ? `${invoiceData.patient.id.firstName} ${invoiceData.patient.id.lastName}`
                  : invoiceData.patient.name || '')
        };
      }
      
      // Stelle sicher, dass services ein Array ist
      if (!Array.isArray(invoiceData.services)) {
        invoiceData.services = invoiceData.services || [];
      }
      
      // Stelle sicher, dass der Status erhalten bleibt
      if (!invoiceData.status) {
        console.warn('⚠️ Rechnung ohne Status geladen, verwende Fallback:', invoiceData);
        invoiceData.status = invoice.status || 'draft';
      }
      
      setFormData(invoiceData);
      setDialogMode('edit');
      setActiveTab(0);
      setOpenDialog(true);
    } catch (error: any) {
      console.error('Fehler beim Laden der Rechnungsdetails zum Bearbeiten:', error);
      // Fallback auf vorhandene Daten
      // Normalisiere patient.id auch im Fallback
      const normalizedInvoice: any = { ...invoice };
      if (normalizedInvoice.patient?.id && typeof normalizedInvoice.patient.id === 'object') {
        const patientIdObj = normalizedInvoice.patient.id as any;
        normalizedInvoice.patient = {
          ...normalizedInvoice.patient,
          id: patientIdObj._id || normalizedInvoice.patient.id,
          name: normalizedInvoice.patient.name || 
                (patientIdObj.firstName && patientIdObj.lastName 
                  ? `${patientIdObj.firstName} ${patientIdObj.lastName}`
                  : normalizedInvoice.patient.name || '')
        };
      }
      setFormData(normalizedInvoice);
      setDialogMode('edit');
      setActiveTab(0);
      setOpenDialog(true);
    }
  };

  const handleView = async (invoice: Invoice) => {
    try {
      // Lade vollständige Rechnungsdetails von der API
      const response = await api.get<any>(`/billing/invoices/${invoice._id || invoice.id}`);
      
      // API-Antwort-Struktur: { data: { success: true, data: invoice }, success: true }
      // Oder: { data: invoice, success: true }
      let invoiceData = null;
      if (response.data?.success && response.data.data) {
        // Backend gibt { success: true, data: invoice } zurück
        invoiceData = response.data.data;
      } else if (response.data) {
        // Backend gibt direkt invoice zurück
        invoiceData = response.data;
      }
      
      if (invoiceData) {
        // Normalisiere patient.id - kann ein Objekt (populated) oder String sein
        if (invoiceData.patient?.id && typeof invoiceData.patient.id === 'object') {
          invoiceData.patient = {
            ...invoiceData.patient,
            id: invoiceData.patient.id._id || invoiceData.patient.id,
            name: invoiceData.patient.name || 
                  (invoiceData.patient.id.firstName && invoiceData.patient.id.lastName 
                    ? `${invoiceData.patient.id.firstName} ${invoiceData.patient.id.lastName}`
                    : invoiceData.patient.name || '')
          };
        }
        
        // Stelle sicher, dass services ein Array ist
        if (!Array.isArray(invoiceData.services)) {
          invoiceData.services = invoiceData.services || [];
        }
        
        setFormData(invoiceData);
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
          'Authorization': `Bearer ${token}`
          // Kein Content-Type für POST-Requests ohne Body
        }
      });

      // Prüfe Content-Type BEVOR wir die Response lesen
      const contentType = response.headers.get('content-type') || '';
      console.log('Response Status:', response.status, 'Content-Type:', contentType);

      // Wenn Content-Type JSON ist oder Status nicht OK, ist es ein Fehler
      if (!response.ok || contentType.includes('application/json')) {
        // Versuche die Antwort als Text zu lesen
        const errorText = await response.text();
        console.error('PDF-Generierung Fehler:', response.status, errorText);
        
        // Versuche JSON-Fehler zu parsen
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || 'PDF-Generierung fehlgeschlagen');
        } catch (parseError) {
          throw new Error(`PDF-Generierung fehlgeschlagen: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`);
        }
      }
      
      // Prüfe ob Content-Type PDF ist
      if (!contentType.includes('application/pdf')) {
        // Wenn kein PDF, versuche die Antwort als Text zu lesen
        // Aber wir müssen die Response klonen, da wir sie bereits gelesen haben könnten
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        console.error('Unerwarteter Dateityp:', contentType, 'First 200 chars:', text.substring(0, 200));
        
        // Versuche JSON zu parsen
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || 'PDF-Generierung fehlgeschlagen');
        } catch {
          throw new Error('Unerwarteter Dateityp erhalten. Erwartet: application/pdf, erhalten: ' + contentType);
        }
      }

      // Jetzt können wir sicher sein, dass es ein PDF ist
      const blob = await response.blob();
      console.log('Blob size:', blob.size, 'Blob type:', blob.type);
      
      // Prüfen ob Blob gültig ist
      if (blob.size === 0) {
        throw new Error('PDF-Datei ist leer');
      }

      // Prüfe ob Blob wirklich ein PDF ist (PDFs beginnen mit %PDF)
      // Erstelle eine Kopie des Blobs für die Validierung, damit wir den Original-Blob nicht verbrauchen
      const validationBlob = blob.slice(0, 4);
      const arrayBuffer = await validationBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      // Konvertiere Uint8Array zu String ohne Spread-Operator
      const pdfHeader = Array.from(uint8Array).map(byte => String.fromCharCode(byte)).join('');
      console.log('PDF Header:', pdfHeader, 'Bytes:', Array.from(uint8Array));
      
      if (pdfHeader !== '%PDF') {
        // Wenn es kein PDF ist, versuche es als Text zu lesen (könnte ein Fehler sein)
        // Erstelle eine neue Kopie für Text-Validierung
        const textBlob = blob.slice(0, Math.min(500, blob.size));
        const fullText = await textBlob.text();
        console.error('Blob ist kein gültiges PDF. Header:', pdfHeader, 'First 500 chars:', fullText);
        
        // Versuche JSON zu parsen
        try {
          const json = JSON.parse(fullText);
          throw new Error(json.message || 'PDF-Generierung fehlgeschlagen: Server hat kein PDF zurückgegeben');
        } catch {
          throw new Error(`Heruntergeladene Datei ist kein gültiges PDF. Erwartet '%PDF', erhalten: '${pdfHeader}'`);
        }
      }

      // PDF-Download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Rechnung_${invoice.invoiceNumber || invoice._id}.pdf`;
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
    } catch (error: any) {
      console.error('Druck-Fehler:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Fehler beim Generieren der PDF',
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
      // Bereite Services-Daten vor: Stelle sicher, dass alle Felder korrekt formatiert sind
      // Filtere nur komplett leere Services heraus (beide Felder müssen leer sein)
      const preparedServices = (formData.services || [])
        .filter((service: any) => {
          // Behalte Service, wenn mindestens Code ODER Beschreibung vorhanden ist
          const hasCode = service.serviceCode && service.serviceCode.toString().trim() !== '';
          const hasDescription = service.description && service.description.toString().trim() !== '';
          return hasCode || hasDescription;
        })
        .map((service: any) => {
          // Berechne totalPrice neu, um sicherzustellen, dass es korrekt ist
          const unitPrice = service.unitPrice || 0;
          const quantity = service.quantity || 1;
          const totalPrice = unitPrice * quantity;
          
          return {
            date: service.date ? new Date(service.date) : new Date(),
            serviceCode: (service.serviceCode || '').toString().trim() || 'MANUELL',
            description: (service.description || '').toString().trim() || 'Manuelle Position',
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: totalPrice, // Immer neu berechnen
            category: service.category || '',
            // Begründungsfelder
            justification: service.justification || undefined,
            notes: service.notes || undefined,
            serviceTime: service.serviceTime || undefined,
            urgency: service.urgency || undefined,
            urgencyLevel: service.urgencyLevel || undefined
          };
        });
      
      // Prüfe, ob mindestens eine gültige Service vorhanden ist
      if (preparedServices.length === 0) {
        setSnackbar({ 
          open: true, 
          message: 'Bitte fügen Sie mindestens eine Leistung mit Code und Beschreibung hinzu', 
          severity: 'error' 
        });
        return;
      }

      // Berechne Gesamtbetrag aus Services (immer neu berechnen)
      const calculatedSubtotal = preparedServices.reduce((sum: number, s: any) => sum + (s.totalPrice || 0), 0);
      const calculatedTaxAmount = calculatedSubtotal * ((formData.taxRate || 0) / 100);
      const calculatedTotal = calculatedSubtotal + calculatedTaxAmount;

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
          invoiceDate: formData.invoiceDate ? new Date(formData.invoiceDate) : new Date(),
          dueDate: formData.dueDate ? new Date(formData.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          services: preparedServices,
          subtotal: calculatedSubtotal, // Verwende berechneten Wert
          taxAmount: calculatedTaxAmount, // Verwende berechneten Wert
          // taxRate wird vom Backend automatisch berechnet - nicht explizit senden, es sei denn, es wurde manuell geändert
          taxRate: formData.taxRate !== undefined && formData.taxRate !== null ? formData.taxRate : undefined,
          totalAmount: calculatedTotal, // Verwende berechneten Wert
          status: formData.status || 'draft'
        };
        
        await dispatch(createInvoice(invoiceToCreate)).unwrap();
        setSnackbar({ open: true, message: 'Rechnung erfolgreich erstellt', severity: 'success' });
      } else if (dialogMode === 'edit') {
        const invoiceToUpdate = {
          ...formData,
          services: preparedServices,
          subtotal: calculatedSubtotal, // Verwende berechneten Wert
          taxAmount: calculatedTaxAmount, // Verwende berechneten Wert
          totalAmount: calculatedTotal, // Verwende berechneten Wert
          invoiceDate: formData.invoiceDate ? new Date(formData.invoiceDate) : formData.invoiceDate,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : formData.dueDate,
          status: formData.status || 'draft', // Stelle sicher, dass Status erhalten bleibt
          paymentMethod: formData.paymentMethod || undefined // Stelle sicher, dass Zahlungsmethode gespeichert wird
        };
        
        await dispatch(updateInvoice({ 
          id: formData._id || formData.id || '', 
          invoiceData: invoiceToUpdate 
        })).unwrap();
        setSnackbar({ open: true, message: 'Rechnung erfolgreich aktualisiert', severity: 'success' });
      }
      setOpenDialog(false);
      
      // Lade Rechnungen mit den aktuellen Filtern neu
      const params: any = {
        limit: 1000,
        page: 1
      };
      
      // Wenn Status-Filter vorhanden, füge sie zu den Parametern hinzu
      if (statusFilter.length > 0) {
        params.status = statusFilter.join(',');
      }
      
      // Wenn patientIdFromUrl vorhanden ist, füge Patient-Filter hinzu
      if (patientIdFromUrl) {
        params.patientId = patientIdFromUrl;
      }
      
      // Datumsfilter hinzufügen
      if (dateFilter.start) {
        params.startDate = formatDateString(dateFilter.start) || '';
      }
      if (dateFilter.end) {
        params.endDate = formatDateString(dateFilter.end) || '';
      }
      
      dispatch(fetchInvoices(params));
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

  // Lade ServiceCatalog-Daten für einen Service-Code
  const loadServiceCatalogData = async (serviceCode: string) => {
    if (!serviceCode || serviceCatalogData[serviceCode]) {
      return; // Bereits geladen oder kein Code
    }
    try {
      const response: any = await api.get(`/service-catalog?code=${serviceCode}`);
      if (response.data?.success && response.data?.data?.length > 0) {
        const serviceData = response.data.data[0];
        setServiceCatalogData(prev => ({
          ...prev,
          [serviceCode]: serviceData
        }));
      }
    } catch (error) {
      console.error('Fehler beim Laden der ServiceCatalog-Daten:', error);
    }
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
          // calculation.grossAmount ist bereits in Euro - KEINE KONVERTIERUNG MEHR!
          const grossAmountInEuro = calculation.grossAmount || getServicePriceInEuro(service);
          const newService = {
            date: new Date(),
            serviceCode: service.code,
            description: service.name,
            quantity: 1,
            unitPrice: grossAmountInEuro,
            totalPrice: grossAmountInEuro,
            category: service.category,
            calculation: calculation // Speichere Berechnungsergebnis
          };
          
          setFormData(prev => ({
            ...prev,
            services: [...(prev.services || []), newService],
            subtotal: (prev.subtotal || 0) + newService.totalPrice,
            totalAmount: (prev.totalAmount || 0) + newService.totalPrice
          }));
          
          // Lade ServiceCatalog-Daten für justificationRules
          loadServiceCatalogData(service.code);
          
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
          const priceInEuro = getServicePriceInEuro(service);
          const newService = {
            date: new Date(),
            serviceCode: service.code,
            description: service.name,
            quantity: 1,
            unitPrice: priceInEuro,
            totalPrice: priceInEuro,
            category: service.category
          };
          
          setFormData(prev => ({
            ...prev,
            services: [...(prev.services || []), newService]
          }));
          // Lade ServiceCatalog-Daten für justificationRules
          loadServiceCatalogData(service.code);
        }
      } catch (error) {
        // Fallback auf Standard-Preis bei Fehler
        const priceInEuro = getServicePriceInEuro(service);
        const newService = {
          date: new Date(),
          serviceCode: service.code,
          description: service.name,
          quantity: 1,
          unitPrice: priceInEuro,
          totalPrice: priceInEuro,
          category: service.category
        };
        
        setFormData(prev => ({
          ...prev,
          services: [...(prev.services || []), newService]
        }));
        // Lade ServiceCatalog-Daten für justificationRules
        loadServiceCatalogData(service.code);
      }
    } else {
      // Keine automatische Berechnung möglich, Standard-Preis verwenden
      const priceInEuro = getServicePriceInEuro(service);
      const newService = {
        date: new Date(),
        serviceCode: service.code,
        description: service.name,
        quantity: 1,
        unitPrice: priceInEuro,
        totalPrice: priceInEuro,
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
    const priceInEuro = getServicePriceInEuro(service);
    
    // Wenn patientIdFromUrl vorhanden ist, verwende diesen Patienten
    const selectedPatient = patientIdFromUrl 
      ? patients?.find((p: Patient) => p._id === patientIdFromUrl || p.id === patientIdFromUrl)
      : null;
    
    setDialogMode('add');
    setFormData({
      billingType: 'privat',
      services: [{
        date: new Date(),
        serviceCode: service.code,
        description: service.name,
        quantity: 1,
        unitPrice: priceInEuro,
        totalPrice: priceInEuro,
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
      patient: selectedPatient ? {
        id: selectedPatient._id || selectedPatient.id || '',
        name: `${selectedPatient.firstName || ''} ${selectedPatient.lastName || ''}`.trim(),
        address: {
          street: selectedPatient.address?.street || '',
          city: selectedPatient.address?.city || '',
          postalCode: selectedPatient.address?.zipCode || selectedPatient.address?.postalCode || '',
          country: selectedPatient.address?.country || 'Österreich'
        },
        insuranceProvider: selectedPatient.insuranceProvider || '',
        insuranceNumber: selectedPatient.insuranceNumber || '',
        socialSecurityNumber: selectedPatient.socialSecurityNumber || ''
      } as any : {
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
      subtotal: priceInEuro,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: priceInEuro,
    });
    setActiveTab(0);
    setOpenDialog(true);
  };

  const handleGenerateRKSVO = async (invoice: Invoice) => {
    try {
      setLoadingRKSVO(true);
      const token = localStorage.getItem('token');
      
      // Lade CashRegister-Liste
      const cashRegistersResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/billing/cash-registers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const cashRegistersData = await cashRegistersResponse.json();
      
      let cashRegisterId = null;
      if (cashRegistersData.success && cashRegistersData.data && cashRegistersData.data.length > 0) {
        cashRegisterId = cashRegistersData.data[0]._id;
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/billing/generate-rksvo-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          invoiceId: invoice?._id || invoice?.id,
          cashRegisterId: cashRegisterId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setQrCodeData(data.data.qrCodeData || data.data.qrCode);
        setQrCodeDialog(true);
        setSnackbar({ open: true, message: 'RKSVO-Beleg erfolgreich generiert!', severity: 'success' });
        // Aktualisiere Invoice-Liste
        dispatch(fetchInvoices({}));
      } else {
        setSnackbar({ open: true, message: data.message || 'Fehler beim Generieren des RKSVO-Belegs', severity: 'error' });
      }
    } catch (error: any) {
      setSnackbar({ open: true, message: 'Fehler beim Generieren des RKSVO-Belegs: ' + (error.message || 'Unbekannter Fehler'), severity: 'error' });
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
    
    // Status-Filter anwenden (wenn Status-Filter gesetzt ist)
    if (statusFilter.length > 0) {
      const invoiceStatus = invoice.status || '';
      if (!statusFilter.includes(invoiceStatus)) {
        return false;
      }
    }
    
    // Suchfilter anwenden
    const searchLower = searchTerm.toLowerCase();
    const matchesInvoiceNumber = (invoice.invoiceNumber || '').toLowerCase().includes(searchLower);
    const matchesPatient = (invoice.patient?.name || '').toLowerCase().includes(searchLower);
    const matchesBillingType = (invoice.billingType || '').toLowerCase().includes(searchLower);
    
    // Suche nach Leistungen (Services)
    const matchesServices = invoice.services && Array.isArray(invoice.services) && invoice.services.some((service: any) => {
      const serviceCode = (service.serviceCode || '').toLowerCase();
      const description = (service.description || '').toLowerCase();
      const name = (service.name || '').toLowerCase();
      return serviceCode.includes(searchLower) || description.includes(searchLower) || name.includes(searchLower);
    });
    
    return matchesInvoiceNumber || matchesPatient || matchesBillingType || matchesServices;
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Entwurf';
      case 'pending': return 'Wartend';
      case 'sent': return 'Versendet';
      case 'paid': return 'Bezahlt';
      case 'overdue': return 'Überfällig';
      case 'cancelled': return 'Storniert';
      default: return status || 'Unbekannt';
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

  const getBillingTypeLabel = (type: string) => {
    switch (type) {
      case 'kassenarzt': return 'Kassenarzt';
      case 'wahlarzt': return 'Wahlarzt';
      case 'privat': return 'Privat';
      default: return type || 'Unbekannt';
    }
  };

  return (
    <Box sx={{
      mt: marginTopValue !== '0px' ? marginTopValue : 0,
      transition: marginTopValue !== '0px' ? 'margin-top 0.3s ease' : 'none',
    }}>
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }} 
        mb={{ xs: 2, sm: 3 }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={{ xs: 2, sm: 0 }}
      >
        <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 2 }}>
          <Typography 
            variant="h4" 
            component="h1"
            sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
          >
            Abrechnung
          </Typography>
          <Tooltip title="Hilfe & Leitfaden">
            <IconButton
              onClick={() => setHelpDialogOpen(true)}
              color="primary"
              sx={{ minWidth: { xs: '44px', sm: 'auto' }, minHeight: { xs: '44px', sm: 'auto' } }}
            >
              <HelpOutline />
            </IconButton>
          </Tooltip>
        </Box>
        <Box display="flex" gap={{ xs: 1, sm: 2 }} flexWrap="wrap" width={{ xs: '100%', sm: 'auto' }}>
          <Button
            variant="outlined"
            startIcon={<Article />}
            onClick={() => navigate('/journal')}
            sx={{ 
              borderRadius: 2,
              fontSize: { xs: '0.875rem', sm: '1rem' },
              minHeight: { xs: '44px', sm: 'auto' },
              flex: { xs: 1, sm: 'none' }
            }}
            fullWidth={isMobile}
          >
            {isMobile ? 'Journal' : 'Journal'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Receipt />}
            onClick={() => {
              const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
              const endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
              handleLoadTurnusabrechnung(startDate, endDate);
            }}
            sx={{ 
              borderRadius: 2,
              fontSize: { xs: '0.875rem', sm: '1rem' },
              minHeight: { xs: '44px', sm: 'auto' },
              flex: { xs: 1, sm: 'none' }
            }}
            fullWidth={isMobile}
          >
            {isMobile ? 'Turnus' : 'Turnusabrechnung'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddNew}
            sx={{ 
              borderRadius: 2,
              fontSize: { xs: '0.875rem', sm: '1rem' },
              minHeight: { xs: '44px', sm: 'auto' },
              flex: { xs: 1, sm: 'none' }
            }}
            fullWidth={isMobile}
          >
            {isMobile ? 'Neu' : 'Neue Rechnung'}
          </Button>
        </Box>
      </Box>

      {/* Totals Cards - Heute, Monat, Jahr */}
      <Box sx={{ 
        display: 'flex', 
        gap: { xs: 1.5, sm: 3 }, 
        mb: { xs: 2, sm: 3 }, 
        flexWrap: 'wrap' 
      }}>
        <Card sx={{ 
          p: { xs: 1.5, sm: 2 }, 
          textAlign: 'center', 
          flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 200px' }, 
          minWidth: { xs: 'calc(50% - 8px)', sm: '200px' } 
        }}>
          <Typography variant="h4" color="primary" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            {totals.today.count}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            Rechnungen heute
          </Typography>
          <Typography variant="h6" color="success.main" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            €{totals.today.amount.toFixed(2)}
          </Typography>
        </Card>
        <Card sx={{ 
          p: { xs: 1.5, sm: 2 }, 
          textAlign: 'center', 
          flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 200px' }, 
          minWidth: { xs: 'calc(50% - 8px)', sm: '200px' } 
        }}>
          <Typography variant="h4" color="primary" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            {totals.month.count}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            Rechnungen diesen Monat
          </Typography>
          <Typography variant="h6" color="success.main" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            €{totals.month.amount.toFixed(2)}
          </Typography>
        </Card>
        <Card sx={{ 
          p: { xs: 1.5, sm: 2 }, 
          textAlign: 'center', 
          flex: { xs: '1 1 100%', sm: '1 1 200px' }, 
          minWidth: { xs: '100%', sm: '200px' } 
        }}>
          <Typography variant="h4" color="primary" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            {totals.year.count}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            Rechnungen dieses Jahr
          </Typography>
          <Typography variant="h6" color="success.main" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            €{totals.year.amount.toFixed(2)}
          </Typography>
        </Card>
      </Box>

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
                    <Typography 
                      variant="subtitle2" 
                      fontWeight="bold" 
                      gutterBottom
                      dangerouslySetInnerHTML={{ __html: service.name }}
                    />
                    <Typography variant="caption" color="text.secondary" display="block">
                      {service.code}
                    </Typography>
                    <Chip 
                      label={`€${getServicePriceInEuro(service).toFixed(2)}`}
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

      {/* Filter Card */}
      <Card sx={{ mb: { xs: 2, sm: 3 } }}>
        <Box p={{ xs: 2, sm: 3 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
            <Box sx={{ 
              display: 'flex', 
              gap: { xs: 1, sm: 2 }, 
              flexWrap: 'wrap', 
              alignItems: 'center', 
              mb: { xs: 1.5, sm: 2 } 
            }}>
              {/* Datumsfilter */}
              <DatePicker
                label="Von"
                value={dateFilter.start}
                onChange={(newValue) => setDateFilter(prev => ({ ...prev, start: newValue }))}
                format="dd.MM.yyyy"
                slotProps={{ 
                  textField: { 
                    size: 'small', 
                    sx: { 
                      minWidth: { xs: '100%', sm: 180 },
                      width: { xs: '100%', sm: 'auto' }
                    } 
                  } 
                }}
              />
              <DatePicker
                label="Bis"
                value={dateFilter.end}
                onChange={(newValue) => setDateFilter(prev => ({ ...prev, end: newValue }))}
                format="dd.MM.yyyy"
                slotProps={{ 
                  textField: { 
                    size: 'small', 
                    sx: { 
                      minWidth: { xs: '100%', sm: 180 },
                      width: { xs: '100%', sm: 'auto' }
                    } 
                  } 
                }}
              />
              
              {/* Status-Filter */}
              <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 }, width: { xs: '100%', sm: 'auto' } }}>
                <InputLabel>Status</InputLabel>
                <Select
                  multiple
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as string[])}
                  label="Status"
                  renderValue={(selected) => {
                    if (selected.length === 0) return 'Alle';
                    const labels = selected.map(s => getStatusLabel(s));
                    return labels.join(', ');
                  }}
                >
                  <SelectMenuItem value="draft">Entwurf</SelectMenuItem>
                  <SelectMenuItem value="pending">Wartend</SelectMenuItem>
                  <SelectMenuItem value="sent">Versendet</SelectMenuItem>
                  <SelectMenuItem value="paid">Bezahlt</SelectMenuItem>
                  <SelectMenuItem value="overdue">Überfällig</SelectMenuItem>
                  <SelectMenuItem value="cancelled">Storniert</SelectMenuItem>
                </Select>
              </FormControl>
              
              {/* Schnellfilter-Buttons */}
              <Button
                size="small"
                variant={(dateFilter.start?.getTime() === startOfDay(new Date())?.getTime()) ? 'contained' : 'outlined'}
                onClick={() => {
                  const today = new Date();
                  const todayStart = startOfDay(today);
                  const todayEnd = endOfDay(today);
                  if (todayStart && todayEnd) {
                    setDateFilter({
                      start: todayStart,
                      end: todayEnd
                    });
                  }
                }}
                sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  minHeight: { xs: '36px', sm: 'auto' },
                  flex: { xs: '1 1 calc(50% - 4px)', sm: 'none' }
                }}
              >
                Heute
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const today = new Date();
                  setDateFilter({
                    start: startOfMonth(today),
                    end: endOfMonth(today)
                  });
                }}
                sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  minHeight: { xs: '36px', sm: 'auto' },
                  flex: { xs: '1 1 calc(50% - 4px)', sm: 'none' }
                }}
              >
                {isMobile ? 'Monat' : 'Dieser Monat'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const today = new Date();
                  setDateFilter({
                    start: startOfYear(today),
                    end: endOfYear(today)
                  });
                }}
                sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  minHeight: { xs: '36px', sm: 'auto' },
                  flex: { xs: '1 1 calc(50% - 4px)', sm: 'none' }
                }}
              >
                {isMobile ? 'Jahr' : 'Dieses Jahr'}
              </Button>
              <Button
                size="small"
                variant={statusFilter.includes('sent') && statusFilter.includes('overdue') && statusFilter.length === 2 ? 'contained' : 'outlined'}
                onClick={() => {
                  // Setze Status-Filter auf "sent" und "overdue" für offene Rechnungen
                  setStatusFilter(['sent', 'overdue']);
                  // Entferne Datumsfilter, um alle offenen Rechnungen zu zeigen
                  setDateFilter({ start: null, end: null });
                }}
                sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  minHeight: { xs: '36px', sm: 'auto' },
                  flex: { xs: '1 1 calc(50% - 4px)', sm: 'none' }
                }}
              >
                {isMobile ? 'Offen' : 'Offene Rechnungen'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setDateFilter({ start: null, end: null });
                  setStatusFilter([]);
                }}
                sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  minHeight: { xs: '36px', sm: 'auto' },
                  flex: { xs: '1 1 100%', sm: 'none' }
                }}
                fullWidth={isMobile}
              >
                Filter zurücksetzen
              </Button>
            </Box>
          </LocalizationProvider>
          
          {/* Patientensuche */}
          <TextField
            fullWidth
            placeholder="Rechnungen suchen (Nummer, Patient, Typ, Leistung)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minHeight: { xs: '48px', sm: 'auto' }
              }
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
                      <Typography 
                        variant="body2"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Extrahiere patientId - kann String oder Objekt sein
                          let patientId: string | null = null;
                          const patientIdValue = invoice.patient?.id;
                          
                          console.log('🔍 Patient Click Debug:', {
                            invoiceId: invoice._id || invoice.id,
                            patientIdValue,
                            patientIdType: typeof patientIdValue,
                            patientIdValueIsObject: typeof patientIdValue === 'object',
                            patient: invoice.patient
                          });
                          
                          if (patientIdValue) {
                            if (typeof patientIdValue === 'string') {
                              patientId = patientIdValue;
                            } else if (typeof patientIdValue === 'object') {
                              // TypeScript erkennt es als Objekt (populated)
                              const patientIdObj = patientIdValue as any;
                              patientId = patientIdObj._id || patientIdObj.id || patientIdObj.toString() || null;
                            }
                          }
                          
                          console.log('🔍 Extracted patientId:', patientId);
                          
                          if (patientId) {
                            console.log('🚀 Navigating to:', `/patient-organizer/${patientId}`);
                            navigate(`/patient-organizer/${patientId}`);
                          } else {
                            console.warn('⚠️ No patientId found, cannot navigate');
                          }
                        }}
                        sx={{
                          cursor: invoice.patient?.id ? 'pointer' : 'default',
                          color: invoice.patient?.id ? 'primary.main' : 'text.primary',
                          '&:hover': invoice.patient?.id ? {
                            textDecoration: 'underline',
                            color: 'primary.dark'
                          } : {}
                        }}
                      >
                        {invoice.patient?.name || 'Unbekannter Patient'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getBillingTypeLabel(invoice.billingType)}
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
                        label={getStatusLabel(invoice.status)}
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
        {selectedInvoice?.patient?.insuranceProvider?.includes('SVS') && (
          <MenuItem onClick={() => { handleExportInsurance(selectedInvoice!, 'SVS'); setAnchorEl(null); }}>
            <Article sx={{ mr: 1 }} />
            SVS-XML exportieren
          </MenuItem>
        )}
        {selectedInvoice?.patient?.insuranceProvider?.includes('BVAEB') && (
          <MenuItem onClick={() => { handleExportInsurance(selectedInvoice!, 'BVAEB'); setAnchorEl(null); }}>
            <Article sx={{ mr: 1 }} />
            BVAEB-XML exportieren
          </MenuItem>
        )}
        {selectedInvoice?.patient?.insuranceProvider?.includes('KFA') && (
          <MenuItem onClick={() => { handleExportInsurance(selectedInvoice!, 'KFA'); setAnchorEl(null); }}>
            <Article sx={{ mr: 1 }} />
            KFA-XML exportieren
          </MenuItem>
        )}
        {selectedInvoice?.patient?.insuranceProvider?.includes('PVA') && (
          <MenuItem onClick={() => { handleExportInsurance(selectedInvoice!, 'PVA'); setAnchorEl(null); }}>
            <Article sx={{ mr: 1 }} />
            PVA-XML exportieren
          </MenuItem>
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
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: { xs: 'none', sm: '0 8px 32px rgba(0,0,0,0.12)' },
            m: { xs: 0, sm: 2 },
            height: { xs: '100%', sm: 'auto' },
            maxHeight: { xs: '100%', sm: '90vh' }
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
        <DialogContent sx={{ 
          pt: { xs: 2, sm: 3 }, 
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          overflow: 'auto',
          maxHeight: { xs: 'calc(100vh - 120px)', sm: 'calc(90vh - 120px)' }
        }}>
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
                    <Box display="flex" gap={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => {
                          const newService = {
                            date: new Date(),
                            serviceCode: '',
                            description: '',
                            quantity: 1,
                            unitPrice: 0,
                            totalPrice: 0,
                            category: ''
                          };
                          handleFormChange('services', [...(formData.services || []), newService]);
                        }}
                      >
                        Neue Position
                      </Button>
                      <Autocomplete
                        options={services || []}
                        getOptionLabel={(option) => {
                          const cleanName = stripHtmlTags(option.name || '');
                          return `${option.code} - ${cleanName}`;
                        }}
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
                    </Box>
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
                      {formData.services?.map((service, index) => {
                        const updateService = (field: string, value: any) => {
                          const updatedServices = [...(formData.services || [])];
                          updatedServices[index] = {
                            ...updatedServices[index],
                            [field]: value
                          };
                          // Berechne totalPrice automatisch
                          if (field === 'quantity' || field === 'unitPrice') {
                            updatedServices[index].totalPrice = 
                              (updatedServices[index].quantity || 1) * (updatedServices[index].unitPrice || 0);
                          }
                          handleFormChange('services', updatedServices);
                        };

                        const serviceCode = service.serviceCode;
                        const catalogData = serviceCode ? serviceCatalogData[serviceCode] : null;
                        const justificationRules = catalogData?.ogk?.justificationRules;
                        const showJustification = justificationRules?.requiresJustification && dialogMode !== 'view';
                        const fields = justificationRules?.justificationFields || {};

                        return (
                          <React.Fragment key={index}>
                            <TableRow>
                              <TableCell>
                                {dialogMode !== 'view' ? (
                                  <TextField
                                    type="date"
                                    size="small"
                                    value={service.date ? new Date(service.date).toISOString().split('T')[0] : ''}
                                    onChange={(e) => updateService('date', new Date(e.target.value))}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ width: 150 }}
                                  />
                                ) : (
                                  new Date(service.date).toLocaleDateString('de-DE')
                                )}
                              </TableCell>
                              <TableCell>
                                {dialogMode !== 'view' ? (
                                  <TextField
                                    size="small"
                                    value={service.serviceCode || ''}
                                    onChange={(e) => {
                                      updateService('serviceCode', e.target.value);
                                      // Lade ServiceCatalog-Daten wenn Code eingegeben wird
                                      if (e.target.value) {
                                        loadServiceCatalogData(e.target.value);
                                      }
                                    }}
                                    placeholder="Code"
                                    sx={{ width: 100 }}
                                  />
                                ) : (
                                  service.serviceCode
                                )}
                              </TableCell>
                              <TableCell>
                                {dialogMode !== 'view' ? (
                                  <TextField
                                    size="small"
                                    fullWidth
                                    value={stripHtmlTags(service.description || '')}
                                    onChange={(e) => updateService('description', e.target.value)}
                                    placeholder="Beschreibung"
                                  />
                                ) : (
                                  <span dangerouslySetInnerHTML={{ __html: service.description || '' }} />
                                )}
                              </TableCell>
                              <TableCell>
                                {dialogMode !== 'view' ? (
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={service.quantity || 1}
                                    onChange={(e) => updateService('quantity', parseInt(e.target.value) || 1)}
                                    inputProps={{ min: 1, step: 1 }}
                                    sx={{ width: 80 }}
                                  />
                                ) : (
                                  service.quantity
                                )}
                              </TableCell>
                              <TableCell>
                                {dialogMode !== 'view' ? (
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={service.unitPrice && service.unitPrice !== 0 ? service.unitPrice : ''}
                                    onChange={(e) => updateService('unitPrice', parseFloat(e.target.value) || 0)}
                                    inputProps={{ min: 0, step: 0.01 }}
                                    InputProps={{
                                      startAdornment: <InputAdornment position="start">€</InputAdornment>
                                    }}
                                    sx={{ width: 120 }}
                                  />
                                ) : (
                                  `€${service.unitPrice.toFixed(2)}`
                                )}
                              </TableCell>
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
                            {/* Begründungsfelder basierend auf justificationRules */}
                            {showJustification && (
                              <TableRow>
                                <TableCell colSpan={7} sx={{ pt: 0, pb: 2 }}>
                                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                      Begründung erforderlich
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                                      {/* Textfeld für Begründung */}
                                      {fields.text && (
                                        <TextField
                                          fullWidth
                                          multiline
                                          rows={3}
                                          label="Begründung"
                                          value={service.justification || service.notes || ''}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            updateService('justification', value);
                                            updateService('notes', value);
                                          }}
                                          required={fields.text}
                                          helperText={
                                            justificationRules?.minLength 
                                              ? `Mindestens ${justificationRules.minLength} Zeichen erforderlich`
                                              : undefined
                                          }
                                          error={
                                            fields.text && 
                                            (!service.justification && !service.notes) ||
                                            (justificationRules?.minLength && 
                                             (service.justification?.length || service.notes?.length || 0) < justificationRules.minLength)
                                          }
                                        />
                                      )}
                                      
                                      {/* Uhrzeit-Feld */}
                                      {fields.time && (
                                        <TextField
                                          type="time"
                                          label="Uhrzeit"
                                          value={(service as any).serviceTime || ''}
                                          onChange={(e) => updateService('serviceTime', e.target.value)}
                                          required={fields.time}
                                          InputLabelProps={{ shrink: true }}
                                          sx={{ width: '200px' }}
                                        />
                                      )}
                                      
                                      {/* Dringlichkeit */}
                                      {fields.urgency && (
                                        <FormControl sx={{ width: '200px' }}>
                                          <InputLabel>Dringlichkeit</InputLabel>
                                          <Select
                                            value={(service as any).urgencyLevel || ''}
                                            onChange={(e) => {
                                              updateService('urgency', true);
                                              updateService('urgencyLevel', e.target.value);
                                            }}
                                            required={fields.urgency}
                                            label="Dringlichkeit"
                                          >
                                            <SelectMenuItem value="low">Niedrig</SelectMenuItem>
                                            <SelectMenuItem value="medium">Mittel</SelectMenuItem>
                                            <SelectMenuItem value="high">Hoch</SelectMenuItem>
                                            <SelectMenuItem value="urgent">Dringend</SelectMenuItem>
                                          </Select>
                                        </FormControl>
                                      )}
                                      
                                      {/* Hinweis für Diagnose */}
                                      {fields.diagnosis && (
                                        <Alert severity="info" sx={{ mt: 1 }}>
                                          Eine Diagnose ist für diese Leistung erforderlich. Bitte fügen Sie eine Diagnose in der Rechnung hinzu.
                                        </Alert>
                                      )}
                                    </Box>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
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
                        <SelectMenuItem value="pending">Wartend</SelectMenuItem>
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
                        onChange={(e) => {
                          const paymentMethod = e.target.value;
                          handleFormChange('paymentMethod', paymentMethod);
                          // Automatisch isCashTransaction setzen
                          const isCashTransaction = ['cash', 'card', 'bankomat', 'creditcard', 'mobile'].includes(paymentMethod);
                          handleFormChange('paymentDetails', {
                            ...formData.paymentDetails,
                            isCashTransaction,
                            paymentType: paymentMethod
                          });
                        }}
                        disabled={dialogMode === 'view'}
                      >
                        <SelectMenuItem value="cash">Bar</SelectMenuItem>
                        <SelectMenuItem value="card">Karte</SelectMenuItem>
                        <SelectMenuItem value="bankomat">Bankomat</SelectMenuItem>
                        <SelectMenuItem value="creditcard">Kreditkarte</SelectMenuItem>
                        <SelectMenuItem value="mobile">Mobile Payment</SelectMenuItem>
                        <SelectMenuItem value="transfer">Überweisung</SelectMenuItem>
                        <SelectMenuItem value="insurance">Versicherung</SelectMenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  {formData.paymentMethod && ['cash', 'card', 'bankomat', 'creditcard', 'mobile'].includes(formData.paymentMethod) && (
                    <Box sx={{ flex: '1 1 100%' }}>
                      <Alert severity="info" sx={{ mt: 1 }}>
                        Diese Zahlungsart zählt als Barumsatz für die Registrierkassenpflicht.
                      </Alert>
                    </Box>
                  )}
                  <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Hausbesuch</InputLabel>
                      <Select
                        value={formData.paymentDetails?.isHouseCall ? 'yes' : 'no'}
                        onChange={(e) => {
                          const isHouseCall = e.target.value === 'yes';
                          handleFormChange('paymentDetails', {
                            ...formData.paymentDetails,
                            isHouseCall,
                            enteredAt: isHouseCall ? new Date() : undefined
                          });
                        }}
                        disabled={dialogMode === 'view'}
                      >
                        <SelectMenuItem value="no">Nein</SelectMenuItem>
                        <SelectMenuItem value="yes">Ja (Paragon-Beleg)</SelectMenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  {formData.paymentDetails?.isHouseCall && (
                    <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                      <TextField
                        fullWidth
                        label="Paragon-Nummer"
                        value={formData.paymentDetails?.manualReceiptNumber || ''}
                        onChange={(e) => handleFormChange('paymentDetails', {
                          ...formData.paymentDetails,
                          manualReceiptNumber: e.target.value
                        })}
                        disabled={dialogMode === 'view'}
                        margin="normal"
                        helperText="Nummer des händischen Belegs (Paragon)"
                      />
                    </Box>
                  )}
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
              <QRCodeGenerator 
                data={qrCodeData} 
                size={250}
                title="RKSVO-Beleg QR-Code"
                description="Dieser QR-Code ist für die RKSVO-compliant Belegung erforderlich. Scannen Sie ihn mit der BMF Belegcheck-App."
                showUrl={false}
              />
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
                          <Typography
                            onClick={() => {
                              // Extrahiere patientId - kann String oder Objekt sein
                              let patientId: string | null = null;
                              const patientIdValue = invoice.patient?.id;
                              if (patientIdValue) {
                                if (typeof patientIdValue === 'string') {
                                  patientId = patientIdValue;
                                } else {
                                  // TypeScript erkennt es als Objekt
                                  const patientIdObj = patientIdValue as any;
                                  patientId = patientIdObj._id || patientIdObj.id || null;
                                }
                              }
                              if (patientId) {
                                navigate(`/patient-organizer/${patientId}`);
                              }
                            }}
                            sx={{
                              cursor: invoice.patient?.id ? 'pointer' : 'default',
                              color: invoice.patient?.id ? 'primary.main' : 'text.primary',
                              '&:hover': invoice.patient?.id ? {
                                textDecoration: 'underline',
                                color: 'primary.dark'
                              } : {}
                            }}
                          >
                            {invoice.patient?.id?.firstName} {invoice.patient?.id?.lastName}
                          </Typography>
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
          title="Leitfaden: Rechnungen" 
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs value={helpTab} onChange={(_, v) => setHelpTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Übersicht" />
            <Tab label="Rechnung erstellen" />
            <Tab label="Begründungsfelder" />
            <Tab label="Filter & Suche" />
            <Tab label="Status & Workflow" />
            <Tab label="Abrechnungstypen" />
            <Tab label="Turnusabrechnung" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Rechnungen verwalten
                </Typography>
                <Typography variant="body1" paragraph>
                  Die Rechnungsverwaltung ermöglicht es Ihnen, Rechnungen zu erstellen, zu bearbeiten, 
                  zu verwalten und an Versicherungen zu übermitteln.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📝 <strong>Rechnung erstellen:</strong> Neue Rechnungen für Patienten anlegen</li>
                  <li>✏️ <strong>Rechnung bearbeiten:</strong> Bestehende Rechnungen ändern</li>
                  <li>👁️ <strong>Rechnung anzeigen:</strong> Details und Vorschau</li>
                  <li>🖨️ <strong>Drucken:</strong> Rechnung als PDF drucken</li>
                  <li>📧 <strong>Versenden:</strong> Rechnung per E-Mail senden</li>
                  <li>🔍 <strong>Suche & Filter:</strong> Nach Patient, Status, Datum filtern</li>
                  <li>📊 <strong>Statistiken:</strong> Übersicht für heute, Monat, Jahr</li>
                  <li>🔄 <strong>Turnusabrechnung:</strong> ÖGK-Abrechnung exportieren</li>
                  <li>🆕 <strong>Begründungsfelder:</strong> Dynamische Pflichtfelder für Services mit Begründungspflicht</li>
                  <li>🆕 <strong>Automatische Code-Konvertierung:</strong> Service-Codes werden automatisch für Versicherungsträger konvertiert</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Rechnungsstatus
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><Chip label="Entwurf" size="small" sx={{ mr: 1 }} /> Rechnung wird noch bearbeitet</li>
                  <li><Chip label="Wartend" color="info" size="small" sx={{ mr: 1 }} /> Rechnung wartet auf Bearbeitung</li>
                  <li><Chip label="Gesendet" color="warning" size="small" sx={{ mr: 1 }} /> Rechnung wurde versendet</li>
                  <li><Chip label="Bezahlt" color="success" size="small" sx={{ mr: 1 }} /> Rechnung wurde bezahlt</li>
                  <li><Chip label="Überfällig" color="error" size="small" sx={{ mr: 1 }} /> Rechnung ist überfällig</li>
                  <li><Chip label="Storniert" size="small" sx={{ mr: 1 }} /> Rechnung wurde storniert</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Abrechnungstypen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Privat:</strong> Vollständige Zahlung durch Patient</li>
                  <li><strong>Kassenarzt:</strong> Abrechnung über Krankenkasse</li>
                  <li><strong>Wahlarzt:</strong> Teilweise Erstattung durch Krankenkasse</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Neue Rechnung erstellen
                </Typography>
                <Typography variant="body2" paragraph>
                  So erstellen Sie eine neue Rechnung:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt Anleitung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Neue Rechnung"</li>
                  <li>Wählen Sie einen Patienten aus (Suche oder Auswahl)</li>
                  <li>Wählen Sie den Abrechnungstyp (Privat, Kassenarzt, Wahlarzt)</li>
                  <li>Fügen Sie Leistungen hinzu:
                    <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                      <li>Klicken Sie auf "Leistung hinzufügen"</li>
                      <li>Wählen Sie eine Leistung aus dem Katalog</li>
                      <li>Geben Sie Menge und Datum ein</li>
                      <li>Preis wird automatisch berechnet</li>
                    </Box>
                  </li>
                  <li>Überprüfen Sie die Berechnung (Brutto, Selbstbehalt, Versicherungsbetrag)</li>
                  <li>Speichern Sie die Rechnung</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Quick Services
                </Typography>
                <Typography variant="body2" paragraph>
                  Häufig verwendete Leistungen können als "Quick Services" markiert werden 
                  und erscheinen in einer Schnellauswahl für schnelleres Arbeiten.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Berechnung
                </Typography>
                <Typography variant="body2" paragraph>
                  Die Berechnung erfolgt automatisch basierend auf:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Leistungspreisen aus dem Service-Katalog</li>
                  <li>Abrechnungstyp (Privat, Kassenarzt, Wahlarzt)</li>
                  <li>Selbstbehalt-Regelungen</li>
                  <li>Versicherungsbeträgen</li>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Tipp:</strong> Verwenden Sie die Berechnungsvorschau, um die Beträge 
                  vor dem Speichern zu überprüfen.
                </Typography>
              </Alert>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Begründungsfelder
                </Typography>
                <Typography variant="body2" paragraph>
                  Einige Leistungen erfordern zusätzliche Begründungen oder Informationen bei der Abrechnung. 
                  Diese Felder erscheinen automatisch, wenn Sie einen Service mit Begründungspflicht hinzufügen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Wie funktionieren Begründungsfelder?
                </Typography>
                <Typography variant="body2" paragraph>
                  Begründungsfelder werden dynamisch angezeigt, basierend auf der Konfiguration im Leistungskatalog:
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Geben Sie einen Service-Code in die Rechnung ein</li>
                  <li>Das System lädt automatisch die ServiceCatalog-Daten</li>
                  <li>Wenn der Service <strong>Begründungspflicht</strong> hat, erscheinen die Felder unter der Service-Zeile</li>
                  <li>Die Felder werden automatisch angezeigt, je nach Konfiguration</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Verfügbare Begründungsfelder
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Textfeld (Begründung):</strong>
                    <ul>
                      <li>Multiline-Textfeld für ausführliche Begründung</li>
                      <li>Mindest-/Maximallänge kann konfiguriert sein</li>
                      <li>Pflichtfeld, wenn aktiviert</li>
                    </ul>
                  </li>
                  <li><strong>Uhrzeit:</strong>
                    <ul>
                      <li>Zeitfeld für die Uhrzeit der Leistung</li>
                      <li>Format: HH:mm (z.B. 14:30)</li>
                      <li>Pflichtfeld, wenn aktiviert</li>
                    </ul>
                  </li>
                  <li><strong>Dringlichkeit:</strong>
                    <ul>
                      <li>Dropdown mit Stufen: Niedrig, Mittel, Hoch, Dringend</li>
                      <li>Pflichtfeld, wenn aktiviert</li>
                    </ul>
                  </li>
                  <li><strong>Diagnose:</strong>
                    <ul>
                      <li>Info-Hinweis: Diagnose muss in der Rechnung vorhanden sein</li>
                      <li>Diagnose muss im Tab "Diagnosen" hinzugefügt werden</li>
                    </ul>
                  </li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Beispiel: Dringlichkeitsleistung
                </Typography>
                <Typography variant="body2" paragraph>
                  Wenn Sie eine Dringlichkeitsleistung hinzufügen:
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Service-Code eingeben (z.B. "DURG")</li>
                  <li>Unter der Service-Zeile erscheinen automatisch:
                    <ul>
                      <li>Textfeld für Begründung (z.B. "Patient hatte starke Schmerzen")</li>
                      <li>Uhrzeit-Feld (z.B. 18:30)</li>
                      <li>Dringlichkeit-Dropdown (z.B. "Hoch")</li>
                    </ul>
                  </li>
                  <li>Alle Felder ausfüllen</li>
                  <li>Rechnung speichern</li>
                </Box>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Hinweis:</strong> Die Begründungsfelder werden in der Rechnung gespeichert 
                    und bei der Übermittlung an ELDA/WAHonline mitgesendet.
                  </Typography>
                </Alert>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Validierung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Pflichtfelder werden beim Speichern validiert</li>
                  <li>Fehlende Begründung führt zu Fehlermeldung</li>
                  <li>Zu kurze Begründung (unter Mindestlänge) führt zu Fehlermeldung</li>
                  <li>Fehlerhafte Felder werden rot markiert</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Konfiguration im Leistungskatalog
                </Typography>
                <Typography variant="body2" paragraph>
                  Begründungsfelder werden im Leistungskatalog konfiguriert:
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Gehen Sie zu <strong>Einstellungen → Leistungen → Leistungskatalog</strong></li>
                  <li>Wählen Sie den Service aus</li>
                  <li>Tab <strong>"Preis & Abrechnung"</strong></li>
                  <li>Scrollen Sie zu <strong>"Begründungspflicht-Regeln"</strong></li>
                  <li>Aktivieren Sie "Begründungspflicht aktivieren"</li>
                  <li>Wählen Sie die gewünschten Felder (Text, Uhrzeit, Dringlichkeit, Diagnose)</li>
                  <li>Optional: Setzen Sie Mindest-/Maximallänge für Textfeld</li>
                  <li>Speichern Sie den Service</li>
                </Box>
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
                  Die Rechnungsseite bietet umfangreiche Filter- und Suchmöglichkeiten.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Patientensuche
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Geben Sie den Namen des Patienten in das Suchfeld ein</li>
                  <li>Die Suche filtert automatisch während der Eingabe</li>
                  <li>Unterstützt Vor- und Nachname</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Status-Filter
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Alle:</strong> Zeigt alle Rechnungen</li>
                  <li><strong>Entwurf:</strong> Noch nicht versendete Rechnungen</li>
                  <li><strong>Gesendet:</strong> Versendete, aber noch nicht bezahlte Rechnungen</li>
                  <li><strong>Bezahlt:</strong> Bereits bezahlte Rechnungen</li>
                  <li><strong>Überfällig:</strong> Rechnungen, deren Fälligkeitsdatum überschritten ist</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Datumsfilter
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Heute:</strong> Rechnungen vom heutigen Tag (Standard)</li>
                  <li><strong>Datum von/bis:</strong> Benutzerdefiniertes Datumsintervall</li>
                  <li>Quick-Filter: Heute, Diese Woche, Dieser Monat</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Quick-Filter Buttons
                </Typography>
                <Typography variant="body2" paragraph>
                  Schnellfilter für häufige Szenarien:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Heute:</strong> Rechnungen von heute</li>
                  <li><strong>Diese Woche:</strong> Rechnungen der aktuellen Woche</li>
                  <li><strong>Dieser Monat:</strong> Rechnungen des aktuellen Monats</li>
                  <li><strong>Offene Rechnungen:</strong> Gesendet + Überfällig</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Rechnungsstatus & Workflow
                </Typography>
                <Typography variant="body2" paragraph>
                  Der Rechnungsstatus bestimmt den aktuellen Stand einer Rechnung im Workflow.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Status-Arten
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>
                    <Chip label="Entwurf" size="small" sx={{ mr: 1 }} />
                    <strong>Entwurf:</strong> Rechnung wird erstellt/bearbeitet, noch nicht versendet
                  </li>
                  <li>
                    <Chip label="Gesendet" color="warning" size="small" sx={{ mr: 1 }} />
                    <strong>Gesendet:</strong> Rechnung wurde an Patient/Versicherung versendet
                  </li>
                  <li>
                    <Chip label="Bezahlt" color="success" size="small" sx={{ mr: 1 }} />
                    <strong>Bezahlt:</strong> Rechnung wurde vollständig bezahlt
                  </li>
                  <li>
                    <Chip label="Überfällig" color="error" size="small" sx={{ mr: 1 }} />
                    <strong>Überfällig:</strong> Fälligkeitsdatum wurde überschritten (automatisch markiert)
                  </li>
                  <li>
                    <Chip label="Storniert" size="small" sx={{ mr: 1 }} />
                    <strong>Storniert:</strong> Rechnung wurde storniert
                  </li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Workflow
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Erstellen:</strong> Rechnung wird als "Entwurf" erstellt</li>
                  <li><strong>Versenden:</strong> Status ändert sich zu "Gesendet"</li>
                  <li><strong>Bezahlen:</strong> Status ändert sich zu "Bezahlt"</li>
                  <li><strong>Überfällig:</strong> Automatisch markiert, wenn Fälligkeitsdatum überschritten</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Automatische Überfällig-Markierung
                </Typography>
                <Typography variant="body2" paragraph>
                  Das System markiert Rechnungen automatisch als "Überfällig", wenn:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Der Status "Gesendet" ist</li>
                  <li>Das Fälligkeitsdatum überschritten wurde</li>
                  <li>Die Rechnung noch nicht bezahlt wurde</li>
                </Box>
                <Typography variant="body2" paragraph sx={{ mt: 1 }}>
                  Dies geschieht durch einen automatischen Cron-Job, der täglich läuft.
                </Typography>
              </Box>
            </Box>
          )}

          {helpTab === 5 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Abrechnungstypen
                </Typography>
                <Typography variant="body2" paragraph>
                  Das System unterstützt verschiedene Abrechnungstypen für unterschiedliche Versicherungssituationen.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  1. Privat-Abrechnung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Patient zahlt vollständig:</strong> Keine Versicherungsbeteiligung</li>
                  <li><strong>Verwendung:</strong> Privatpatienten ohne Versicherung</li>
                  <li><strong>Preise:</strong> Aus Service-Katalog (Privat-Preise)</li>
                  <li><strong>Selbstbehalt:</strong> Kein Selbstbehalt</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  2. Kassenarzt-Abrechnung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Versicherung zahlt:</strong> Vollständige Abrechnung über Krankenkasse</li>
                  <li><strong>Verwendung:</strong> Kassenpatienten mit Kassenarztvertrag</li>
                  <li><strong>Preise:</strong> EBM-Tarife (Einheitlicher Bewertungsmaßstab)</li>
                  <li><strong>Selbstbehalt:</strong> Je nach Leistung (z.B. Rezeptgebühr)</li>
                  <li><strong>Übermittlung:</strong> Über ÖGK-Turnusabrechnung</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  3. Wahlarzt-Abrechnung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Teilweise Erstattung:</strong> Patient zahlt, Versicherung erstattet teilweise</li>
                  <li><strong>Verwendung:</strong> Kassenpatienten bei Wahlärzten</li>
                  <li><strong>Preise:</strong> Wahlarzt-Tarife (höher als Kassenarzt)</li>
                  <li><strong>Selbstbehalt:</strong> Differenz zwischen Wahlarzt- und Kassenarzt-Preis</li>
                  <li><strong>Erstattung:</strong> Versicherung erstattet Kassenarzt-Preis</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Berechnung
                </Typography>
                <Typography variant="body2" paragraph>
                  Die Berechnung erfolgt automatisch:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Bruttobetrag:</strong> Summe aller Leistungen</li>
                  <li><strong>Selbstbehalt:</strong> Vom Patienten zu zahlender Betrag</li>
                  <li><strong>Versicherungsbetrag:</strong> Von der Versicherung zu zahlender Betrag</li>
                  <li><strong>Patientenbetrag:</strong> Gesamtbetrag, den der Patient zahlen muss</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 6 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Turnusabrechnung (ÖGK)
                </Typography>
                <Typography variant="body2" paragraph>
                  Die Turnusabrechnung ermöglicht die Übermittlung von Kassenarzt-Leistungen 
                  an die Österreichische Gesundheitskasse (ÖGK).
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Was ist eine Turnusabrechnung?
                </Typography>
                <Typography variant="body2" paragraph>
                  Eine Turnusabrechnung ist eine monatliche Zusammenfassung aller Kassenarzt-Leistungen, 
                  die an die ÖGK übermittelt wird. Sie enthält:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Alle Kassenarzt-Rechnungen des Monats</li>
                  <li>EBM-Codes und Preise</li>
                  <li>Patientendaten</li>
                  <li>Diagnosen (ICD-10)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Turnusabrechnung erstellen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Turnusabrechnung"</li>
                  <li>Wählen Sie den Zeitraum (Standard: aktueller Monat)</li>
                  <li>Das System lädt alle Kassenarzt-Rechnungen des Zeitraums</li>
                  <li>Überprüfen Sie die Liste der Rechnungen</li>
                  <li>Klicken Sie auf "ÖGK-XML exportieren"</li>
                  <li>Die XML-Datei wird heruntergeladen</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  XML-Format
                </Typography>
                <Typography variant="body2" paragraph>
                  Die exportierte XML-Datei enthält:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Alle Rechnungen im ÖGK-Standardformat</li>
                  <li>EBM-Codes und Preise</li>
                  <li>Patienten- und Versicherungsdaten</li>
                  <li>Diagnosen (ICD-10)</li>
                  <li>Alle erforderlichen Metadaten</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Übermittlung an ÖGK
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Laden Sie die XML-Datei auf das ÖGK-Portal hoch</li>
                  <li>Oder senden Sie sie per E-Mail an die ÖGK</li>
                  <li>Die ÖGK prüft und bearbeitet die Abrechnung</li>
                  <li>Die Zahlung erfolgt nach Bearbeitung</li>
                </Box>
              </Box>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Wichtig:</strong> Nur Rechnungen mit Status "Gesendet" oder "Bezahlt" 
                  werden in die Turnusabrechnung aufgenommen. Entwürfe werden nicht exportiert.
                </Typography>
              </Alert>
            </Box>
          )}

          {helpTab === 7 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices & Tipps
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Rechnung erstellen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Korrekter Abrechnungstyp:</strong> Wählen Sie den richtigen Typ (Privat/Kassenarzt/Wahlarzt)</li>
                  <li>✅ <strong>Vollständige Daten:</strong> Stellen Sie sicher, dass alle Patientendaten korrekt sind</li>
                  <li>✅ <strong>Leistungen prüfen:</strong> Überprüfen Sie Menge, Datum und Preise</li>
                  <li>✅ <strong>Begründungsfelder:</strong> Füllen Sie alle erforderlichen Begründungsfelder aus (NEU)</li>
                  <li>✅ <strong>Berechnung prüfen:</strong> Nutzen Sie die Berechnungsvorschau</li>
                  <li>✅ <strong>Diagnosen:</strong> Fügen Sie ICD-10-Diagnosen hinzu (für Kassenarzt erforderlich)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Workflow
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Entwurf speichern:</strong> Speichern Sie Entwürfe, bevor Sie versenden</li>
                  <li>✅ <strong>Versenden:</strong> Versenden Sie Rechnungen zeitnah nach Erstellung</li>
                  <li>✅ <strong>Nachverfolgung:</strong> Überwachen Sie den Status der Rechnungen</li>
                  <li>✅ <strong>Überfällige Rechnungen:</strong> Kontaktieren Sie Patienten bei überfälligen Rechnungen</li>
                  <li>✅ <strong>Bezahlung markieren:</strong> Markieren Sie Rechnungen als bezahlt, wenn Zahlung eingeht</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Turnusabrechnung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Monatlich:</strong> Erstellen Sie die Turnusabrechnung monatlich</li>
                  <li>✅ <strong>Prüfen:</strong> Überprüfen Sie die Liste vor dem Export</li>
                  <li>✅ <strong>Zeitnah:</strong> Übermitteln Sie die Abrechnung zeitnah an die ÖGK</li>
                  <li>✅ <strong>Backup:</strong> Speichern Sie eine Kopie der XML-Datei</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Begründungsfelder (NEU)
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Automatische Anzeige:</strong> Begründungsfelder erscheinen automatisch bei Services mit Begründungspflicht</li>
                  <li>✅ <strong>Pflichtfelder ausfüllen:</strong> Alle erforderlichen Felder müssen ausgefüllt werden</li>
                  <li>✅ <strong>Validierung beachten:</strong> Mindestlänge und andere Validierungen beachten</li>
                  <li>✅ <strong>Konfiguration:</strong> Begründungspflicht im Leistungskatalog konfigurieren</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Service-Code-Mapping (NEU)
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Mappings erstellen:</strong> Erstellen Sie Mappings für alle wichtigen Services</li>
                  <li>✅ <strong>Automatische Konvertierung:</strong> Codes werden automatisch für Versicherungsträger konvertiert</li>
                  <li>✅ <strong>Gültigkeitsdaten prüfen:</strong> Prüfen Sie regelmäßig die Gültigkeitsdaten</li>
                  <li>✅ <strong>Testen:</strong> Testen Sie die Konvertierung in der Teststrecke</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Statistiken
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📊 <strong>Heute:</strong> Überwachen Sie tägliche Umsätze</li>
                  <li>📊 <strong>Monat:</strong> Verfolgen Sie monatliche Entwicklungen</li>
                  <li>📊 <strong>Jahr:</strong> Analysieren Sie jährliche Trends</li>
                  <li>📊 <strong>Vergleiche:</strong> Nutzen Sie Statistiken für Planung und Analyse</li>
                </Box>
              </Box>

              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Tipp:</strong> Verwenden Sie Quick Services für häufig verwendete Leistungen, 
                  um Zeit zu sparen und Fehler zu vermeiden.
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

export default Billing;