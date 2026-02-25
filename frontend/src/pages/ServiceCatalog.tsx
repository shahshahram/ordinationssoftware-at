import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import GradientDialogTitle from '../components/GradientDialogTitle';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  Paper,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Autocomplete,
  Checkbox,
  ListItemText,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Room as RoomIcon,
  AccessTime as AccessTimeIcon,
  AttachMoney as AttachMoneyIcon,
  Group as GroupIcon,
  QuestionAnswer as QuestionAnswerIcon,
  EventNote as EventNoteIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { Refresh } from '@mui/icons-material';
import RichTextEditor from '../components/RichTextEditor';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';

// Interface-Definitionen
interface Location {
  _id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  postalCode: string;
  country?: 'austria' | 'germany';
  phone: string;
  email: string;
  isActive: boolean;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface Device {
  _id: string;
  name: string;
  type: string;
  status: string;
  location?: {
    _id: string;
    name: string;
    code: string;
  };
}

interface Room {
  _id: string;
  name: string;
  number: string;
  capacity: number;
  type: string;
  location?: {
    _id: string;
    name: string;
  };
}


interface ServiceCatalog {
  _id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  isMedical?: boolean;
  // Fachrichtung/Spezialisierung
  specialty?: 'allgemeinmedizin' | 'chirurgie' | 'dermatologie' | 'gynaekologie' | 'orthopaedie' | 'neurologie' | 'kardiologie' | 'pneumologie' | 'gastroenterologie' | 'urologie' | 'ophthalmologie' | 'hno' | 'psychiatrie' | 'radiologie' | 'labor' | 'pathologie' | 'anästhesie' | 'notfallmedizin' | 'sportmedizin' | 'arbeitsmedizin';
  required_role?: string;
  visible_to_roles: string[];
  assigned_users?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }[];
  requires_user_selection?: boolean;
  assigned_devices?: {
    _id: string;
    name: string;
    type: string;
    status: string;
    location?: {
      _id: string;
      name: string;
      code: string;
    };
  }[];
  requires_device_selection?: boolean;
  device_quantity_required?: number;
  assigned_rooms?: {
    _id: string;
    name: string;
    number: string;
    capacity: number;
    type: string;
    location?: {
      _id: string;
      name: string;
    };
  }[];
  requires_room_selection?: boolean;
  room_quantity_required?: number;
  base_duration_min: number;
  buffer_before_min: number;
  buffer_after_min: number;
  can_overlap: boolean;
  parallel_group?: string;
  requires_room: boolean;
  required_device_type?: string;
  min_age_years?: number;
  max_age_years?: number;
  requires_consent: boolean;
  online_bookable: boolean;
  is_online_booking_enabled?: boolean;
  requires_confirmation?: boolean;
  requires_scheduling_confirmation?: boolean;
  max_waitlist?: number;
  price?: number; // Preis in Euro
  price_cents?: number; // Legacy: Für Backward Compatibility
  taxRate?: number | null; // Umsatzsteuer in Prozent (null = automatische Logik)
  billing_code?: string;
  notes?: string;
  is_active: boolean;
  color_hex?: string;
  quick_select?: boolean;
  version: number;
  location_id?: {
    _id: string;
    name: string;
    code: string;
  };
  // Legacy field names for backward compatibility
  duration?: number;
  bufferBefore?: number;
  bufferAfter?: number;
  requiredRole?: string;
  isActive?: boolean;
  prices?: {
    kassenarzt: number;
    wahlarzt: number;
    privat: number;
  };
  
  // Abrechnungsfelder (Backend)
  billingType?: 'kassenarzt' | 'wahlarzt' | 'privat' | 'both';
  ogk?: {
    khoCode?: string;
    khoPrice?: number;
    khoGroup?: string;
    khoSubGroup?: string;
    insuranceProvider?: 'oegk' | 'bvaeb' | 'svs' | 'kfa' | 'pva' | 'vaeb' | 'auva' | 'all';
    federalState?: 'burgenland' | 'kaernten' | 'niederoesterreich' | 'oberoesterreich' | 'salzburg' | 'steiermark' | 'tirol' | 'vorarlberg' | 'wien' | null;
    requiresApproval?: boolean;
    billingFrequency?: 'once' | 'periodic';
    // NEU: Ausschluss-Regeln (Conflict-Detection)
    conflictRules?: {
      conflictsWith?: string[];  // Array von Service-Codes, die nicht gleichzeitig erlaubt sind
      conflictsOnSameDay?: boolean;  // true = Konflikt nur am selben Tag
      conflictsInSamePeriod?: {
        period?: 'day' | 'week' | 'month' | 'quarter';
        conflictsWith?: string[];
      };
      requiresDifferentDoctor?: boolean;  // true = Muss von anderem Arzt sein
      allowOverride?: boolean;  // true = Arzt kann Konflikt überschreiben (mit Begründung)
      overrideRequiresJustification?: boolean;  // true = Überschreibung erfordert Begründung
    };
    // NEU: Begründungspflicht-Regeln
    justificationRules?: {
      requiresJustification?: boolean;  // true = Begründung ist Pflicht
      justificationType?: 'text' | 'time' | 'diagnosis' | 'combination';  // Art der Begründung
      justificationFields?: {
        text?: boolean;        // Textfeld erforderlich
        time?: boolean;        // Uhrzeit erforderlich
        diagnosis?: boolean;    // Diagnose erforderlich
        urgency?: boolean;     // Dringlichkeit erforderlich
        reason?: boolean;      // Grund erforderlich
      };
      minLength?: number;      // Mindestlänge für Text
      maxLength?: number;      // Maximallänge für Text
      validationPattern?: string;  // Regex-Pattern für Validierung
    };
  };
  wahlarzt?: {
    price?: number;
    priceType?: 'netto' | 'brutto';
    reimbursementRate?: number;
    maxReimbursement?: number;
    requiresPreApproval?: boolean;
  };
  private?: {
    price?: number;
    priceType?: 'netto' | 'brutto';
    noInsurance?: boolean;
  };
  copay?: {
    applicable?: boolean;
    amount?: number;
    percentage?: number;
    maxAmount?: number;
    exempt?: boolean;
  };
  // Kostenstruktur (für BI-Dashboard) - alle Werte in Euro
  costs?: {
    materialCosts?: number;
    equipmentCosts?: number;
    variableCosts?: number;
    fixedCosts?: number;
    // Legacy: Alte Cent-Felder für Backward Compatibility
    materialCostsCents?: number;
    equipmentCostsCents?: number;
    variableCostsCents?: number;
    fixedCostsCents?: number;
  };
  online_contingents?: Array<{
    timeWindow: {
      start: string;
      end: string;
    };
    daysOfWeek: number[];
    maxOnlineBookings: number;
    priority: number;
    description?: string;
    isActive: boolean;
  }>;
  anamnesisQuestions?: Array<{
    _id?: string;
    questionText: string;
    questionType: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multiselect';
    options?: string[];
    isRequired: boolean;
    defaultValue?: any;
  }>;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

const ServiceCatalogPage: React.FC = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { marginTopValue } = useGlobalNavigationOffset();
  
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<Array<{ _id?: string; name: string; code: string; color_hex?: string; is_active?: boolean }>>([]);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [distinctCategoriesFromApi, setDistinctCategoriesFromApi] = useState<string[]>([]);
  const [selectedDeviceLocation, setSelectedDeviceLocation] = useState<string>('');
  const [selectedRoomLocation, setSelectedRoomLocation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceCatalog | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  const [formData, setFormData] = useState<Partial<ServiceCatalog>>({
    code: '',
    name: '',
    description: '',
      category: '',
      isMedical: true,
      specialty: 'allgemeinmedizin',
      required_role: '',
    visible_to_roles: [] as string[],
    assigned_users: [] as ServiceCatalog['assigned_users'],
    requires_user_selection: false,
    assigned_devices: [] as ServiceCatalog['assigned_devices'],
    requires_device_selection: false,
    device_quantity_required: 1,
    assigned_rooms: [] as ServiceCatalog['assigned_rooms'],
    requires_room_selection: false,
    room_quantity_required: 1,
    base_duration_min: 30,
    buffer_before_min: 0,
    buffer_after_min: 0,
    can_overlap: false,
    parallel_group: '',
    requires_room: false,
    required_device_type: '',
    min_age_years: undefined as number | undefined,
    max_age_years: undefined as number | undefined,
    requires_consent: false,
    online_bookable: true,
    is_online_booking_enabled: true,
    requires_confirmation: false,
    requires_scheduling_confirmation: false,
    max_waitlist: 0,
    online_contingents: [] as Array<{
      timeWindow: { start: string; end: string };
      daysOfWeek: number[];
      maxOnlineBookings: number;
      priority: number;
      description: string;
      isActive: boolean;
    }>,
    anamnesisQuestions: [] as Array<{
      _id?: string;
      questionText: string;
      questionType: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multiselect';
      options?: string[];
      isRequired: boolean;
      defaultValue?: any;
    }>,
    price: 0, // Preis in Euro
    price_cents: 0, // Legacy: Für Backward Compatibility
    taxRate: null as number | null, // Umsatzsteuer in Prozent (null = automatische Logik)
    billing_code: '',
    notes: '',
    is_active: true,
    color_hex: '#2563EB',
    quick_select: false,
      location_id: undefined as ServiceCatalog['location_id'],
    // Abrechnungsfelder
    billingType: 'both',
    ogk: {
      khoCode: '',
      khoPrice: 0,
      khoGroup: '',
      khoSubGroup: '',
      insuranceProvider: 'all' as 'oegk' | 'bvaeb' | 'svs' | 'kfa' | 'pva' | 'vaeb' | 'auva' | 'all',
      federalState: null as 'burgenland' | 'kaernten' | 'niederoesterreich' | 'oberoesterreich' | 'salzburg' | 'steiermark' | 'tirol' | 'vorarlberg' | 'wien' | null,
      requiresApproval: false,
      billingFrequency: 'once' as 'once' | 'periodic',
      conflictRules: undefined,
      justificationRules: undefined
    } as ServiceCatalog['ogk'],
    wahlarzt: {
      price: 0,
      priceType: 'netto' as 'netto' | 'brutto',
      reimbursementRate: 80,
      maxReimbursement: 0,
      requiresPreApproval: false
    },
    private: {
      price: 0,
      priceType: 'netto' as 'netto' | 'brutto',
      noInsurance: true
    },
    copay: {
      applicable: true,
      amount: 0,
      percentage: 10,
      maxAmount: 28.50,
      exempt: false
    },
    // Kostenstruktur (für BI-Dashboard) - alle Werte in Euro
    costs: {
      materialCosts: 0,
      equipmentCosts: 0,
      variableCosts: 0,
      fixedCosts: 0
    }
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchFilterCategories = async () => {
    try {
      const response = await api.get<any>('/service-catalog/distinct-categories');
      const raw = response?.data;
      const data = raw?.data ?? (Array.isArray(raw) ? raw : []);
      const arr = Array.isArray(data) ? data : [];
      const distinct = arr.filter(Boolean);
      setDistinctCategoriesFromApi(distinct);
    } catch (error) {
      console.error('Error fetching filter categories:', error);
      setDistinctCategoriesFromApi([]);
    }
  };

  // Merge: (1) distinct aus API (2) Service-Kategorien (3) aus aktuell geladenen Leistungen (Fallback)
  useEffect(() => {
    const fromApi = distinctCategoriesFromApi || [];
    const fromCats = (categories || []).map((c) => c?.name).filter((x): x is string => Boolean(x));
    const fromLoadedServices = (services || []).map((s) => (s as ServiceCatalog).category).filter((x): x is string => Boolean(x));
    const merged = Array.from(new Set([...fromApi, ...fromCats, ...fromLoadedServices])).sort((a, b) => a.localeCompare(b, 'de'));
    setFilterCategories(merged);
  }, [distinctCategoriesFromApi, categories, services]);

  // Kategorien laden - nur aus ServiceCategories-Tabelle (strukturierte Kategorien, für Formular)
  const fetchCategories = async () => {
    try {
      const response = await api.get<{data: Array<{ _id?: string; name: string; code: string; color_hex?: string }>}>('/service-categories');
      console.log('📋 Categories API Response:', response);
      
      if (response.success && response.data) {
        const categoriesData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.data || []);
        
        console.log('📋 Raw categories data:', categoriesData);
        console.log('📋 Categories count:', categoriesData.length);
        
        // Backend filtert bereits nach is_active: true, aber zur Sicherheit nochmal filtern
        const activeCategories = categoriesData.filter((cat: any) => {
          const isActive = cat.is_active !== false && cat.is_active !== undefined;
          console.log(`📋 Category "${cat.name}": is_active=${cat.is_active}, filtered=${isActive}`);
          return isActive;
        });
        
        console.log('📋 Active categories:', activeCategories);
        setCategories(activeCategories);
      } else {
        console.warn('📋 No categories data in response:', response);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  // Services laden
  const fetchServices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString()
      });
      
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (filterLocation) params.append('location_id', filterLocation);
      if (filterCategory) params.append('category', filterCategory);
      if (filterRole) params.append('role', filterRole);
      if (filterSpecialty) params.append('specialty', filterSpecialty);

      console.log('🔍 Fetching services with params:', {
        page: page + 1,
        rowsPerPage,
        searchTerm: debouncedSearchTerm,
        filterLocation,
        filterCategory,
        filterRole,
        filterSpecialty,
        URL: `/service-catalog?${params}`,
        params: params.toString()
      });

      const response = await api.get<any>(`/service-catalog?${params}`);

      console.log('📦 Response from API (raw):', response);

      if (response.success && response.data) {
        // Backend-Antwort ist: { success: true, data: [...], pagination: {...} }
        // Nach dem api.get wrapper ist es: { data: { success: true, data: [...], pagination: {...} }, success: true }
        const backendResponse = response.data;
        
        const servicesData = backendResponse.data || [];
        const paginationData = backendResponse.pagination || { total: 0 };
        
        console.log('📊 Parsed data:', {
          servicesCount: servicesData.length,
          totalCount: paginationData.total,
          pagination: paginationData,
          firstService: servicesData[0],
          allSpecialties: servicesData.map((s: any) => ({ code: s.code, specialty: s.specialty })),
          filterSpecialty: filterSpecialty
        });
        
        setServices(servicesData);
        setTotalCount(paginationData.total || 0);
      } else {
        throw new Error('Fehler beim Laden der Leistungen');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
      setTotalCount(0);
      enqueueSnackbar('Fehler beim Laden der Leistungen', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Standorte laden
  const fetchLocations = async () => {
    try {
      const response = await api.get<{data: Location[]}>('/locations');
      
      if (response.success && response.data?.data) {
        setLocations(response.data.data || []);
        
        // Automatische Vorbelegung wenn nur ein Standort vorhanden
        if (response.data.data && response.data.data.length === 1) {
          const singleLocation = response.data.data[0];
          setSelectedDeviceLocation(singleLocation._id);
          setSelectedRoomLocation(singleLocation._id);
        }
      } else {
        setLocations([]);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    }
  };

  // Benutzer laden
  const fetchUsers = async () => {
    try {
      // Lade alle Benutzer mit einem hohen Limit
      const response = await api.get<{data: User[]}>('/users?limit=1000');
      
      if (response.success && response.data?.data) {
        setUsers(response.data.data || []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  // Geräte laden
  const fetchDevices = async () => {
    try {
      const response = await api.get<{data: Device[]}>('/devices');
      
      if (response.success && response.data?.data) {
        console.log('Geräte geladen:', response.data.data.length);
        console.log('Geräte mit Standorten:', response.data.data.filter(d => d.location));
        setDevices(response.data.data || []);
      } else {
        setDevices([]);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      setDevices([]);
    }
  };

  // Räume laden
  const fetchRooms = async () => {
    try {
      const response = await api.get<{data: Room[]}>('/rooms');
      
      if (response.success && response.data?.data) {
        setRooms(response.data.data || []);
      } else {
        setRooms([]);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
    }
  };

  useEffect(() => {
    console.log('🔄 useEffect triggered, fetching services');
    fetchServices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, debouncedSearchTerm, filterLocation, filterCategory, filterRole, filterSpecialty]);
  
  useEffect(() => {
    console.log('📊 State changed:', { page, rowsPerPage, totalCount, servicesLength: services.length });
  }, [page, rowsPerPage, totalCount, services]);

  // Debug: Log categories when they change
  useEffect(() => {
    console.log('📋 Categories state updated:', categories);
    console.log('📋 Categories count:', categories.length);
    categories.forEach((cat, index) => {
      console.log(`📋 Category ${index + 1}:`, { name: cat.name, code: cat.code, _id: cat._id, color_hex: cat.color_hex });
    });
  }, [categories]);
  
  // Separate useEffect für initial load anderer Daten
  useEffect(() => {
    fetchLocations();
    fetchUsers();
    fetchDevices();
    fetchRooms();
    fetchCategories();
    fetchFilterCategories();
  }, []);

  // Gefilterte Geräte basierend auf ausgewähltem Standort
  const getFilteredDevices = () => {
    console.log('getFilteredDevices - selectedDeviceLocation:', selectedDeviceLocation);
    console.log('getFilteredDevices - devices:', devices.length);
    if (!selectedDeviceLocation) {
      console.log('Kein Standort ausgewählt, alle Geräte anzeigen');
      return devices;
    }
    
    // Find the location name for the selected ID
    const selectedLocation = locations.find(loc => loc._id === selectedDeviceLocation);
    const selectedLocationName = selectedLocation?.name;
    
    console.log('Gefilterte Geräte - Standort Name:', selectedLocationName);
    
    const filtered = devices.filter(device => {
      // Check if device has location with matching ID
      if (device.location?._id === selectedDeviceLocation) {
        return true;
      }
      // Check if device has location with matching name (for resources from Resource management)
      if (device.location?.name === selectedLocationName) {
        return true;
      }
      return false;
    });
    
    console.log('Gefilterte Geräte:', filtered.length);
    return filtered;
  };

  // Gefilterte Räume basierend auf ausgewähltem Standort
  const getFilteredRooms = () => {
    console.log('getFilteredRooms - selectedRoomLocation:', selectedRoomLocation);
    console.log('getFilteredRooms - rooms:', rooms.length);
    if (!selectedRoomLocation) {
      console.log('Kein Standort ausgewählt, alle Räume anzeigen');
      return rooms;
    }
    
    // Find the location name for the selected ID
    const selectedLocation = locations.find(loc => loc._id === selectedRoomLocation);
    const selectedLocationName = selectedLocation?.name;
    
    console.log('Gefilterte Räume - Standort Name:', selectedLocationName);
    
    const filtered = rooms.filter(room => {
      // Check if room has location with matching ID
      if (room.location?._id === selectedRoomLocation) {
        return true;
      }
      // Check if room has location with matching name (for resources from Resource management)
      if (room.location?.name === selectedLocationName) {
        return true;
      }
      return false;
    });
    
    console.log('Gefilterte Räume:', filtered.length);
    return filtered;
  };

  const handleAddNew = () => {
    setEditingService(null);
    // Kategorien neu laden, falls neue hinzugefügt wurden
    fetchCategories();
    setFormData({
      code: '',
      name: '',
      description: '',
      category: '',
      specialty: 'allgemeinmedizin',
      isMedical: true,
      required_role: '',
      visible_to_roles: [],
      assigned_users: [],
      requires_user_selection: false,
      assigned_devices: [],
      requires_device_selection: false,
      device_quantity_required: 1,
      assigned_rooms: [],
      requires_room_selection: false,
      room_quantity_required: 1,
      base_duration_min: 30,
      buffer_before_min: 0,
      buffer_after_min: 0,
      can_overlap: false,
      parallel_group: '',
      requires_room: false,
      required_device_type: '',
      min_age_years: undefined as number | undefined,
      max_age_years: undefined as number | undefined,
      requires_consent: false,
      online_bookable: true,
      is_online_booking_enabled: true,
      requires_confirmation: false,
      requires_scheduling_confirmation: false,
      max_waitlist: 0,
      price: 0, // Preis in Euro
      price_cents: 0, // Legacy: Für Backward Compatibility
      taxRate: null, // Umsatzsteuer in Prozent (null = automatische Logik)
      billing_code: '',
      notes: '',
      is_active: true,
      color_hex: '#2563EB',
      quick_select: false,
      location_id: undefined as ServiceCatalog['location_id'],
      // Abrechnungsfelder
      billingType: 'both',
      ogk: {
        khoCode: '',
        khoPrice: 0,
        khoGroup: '',
        khoSubGroup: '',
        insuranceProvider: 'all' as 'oegk' | 'bvaeb' | 'svs' | 'kfa' | 'pva' | 'vaeb' | 'auva' | 'all',
        federalState: null as 'burgenland' | 'kaernten' | 'niederoesterreich' | 'oberoesterreich' | 'salzburg' | 'steiermark' | 'tirol' | 'vorarlberg' | 'wien' | null,
        requiresApproval: false,
        billingFrequency: 'once' as 'once' | 'periodic'
      },
      wahlarzt: {
        price: 0,
        priceType: 'netto' as 'netto' | 'brutto',
        reimbursementRate: 0.80,
        maxReimbursement: 0,
        requiresPreApproval: false
      },
      private: {
        price: 0,
        priceType: 'netto' as 'netto' | 'brutto',
        noInsurance: true
      },
      copay: {
        applicable: true,
        amount: 0,
        percentage: 10,
        maxAmount: 28.50,
        exempt: false
      },
      // Kostenstruktur (für BI-Dashboard) - alle Werte in Euro
      costs: {
        materialCosts: 0,
        equipmentCosts: 0,
        variableCosts: 0,
        fixedCosts: 0
      },
      online_contingents: [],
      anamnesisQuestions: []
    });
    
    // Standort-Auswahl zurücksetzen
    if (locations.length >= 1) {
      setSelectedDeviceLocation(locations[0]._id);
      setSelectedRoomLocation(locations[0]._id);
      const firstLocation = locations[0];
      setFormData(prev => {
        const updated = { ...prev, location_id: firstLocation };
        if (firstLocation && (firstLocation as any).federalState) {
          updated.ogk = {
            ...updated.ogk,
            federalState: (firstLocation as any).federalState
          };
        }
        return updated;
      });
    } else {
      setSelectedDeviceLocation('');
      setSelectedRoomLocation('');
    }

    setDialogOpen(true);
  };

  const handleEdit = (service: ServiceCatalog) => {
    console.log('handleEdit - service.assigned_rooms:', service.assigned_rooms);
    console.log('handleEdit - assigned_rooms type:', typeof service.assigned_rooms);
    console.log('handleEdit - assigned_rooms is array:', Array.isArray(service.assigned_rooms));
    
    // Kategorien neu laden, falls neue hinzugefügt wurden
    fetchCategories();
    setEditingService(service);
    
    setFormData({
      code: service.code,
      name: service.name,
      description: service.description || '',
      category: (service as any).category || '',
      isMedical: (service as any).isMedical ?? true,
      specialty: (service as any).specialty || 'allgemeinmedizin',
      required_role: service.required_role || '',
      visible_to_roles: service.visible_to_roles || [],
      assigned_users: service.assigned_users || [],
      requires_user_selection: service.requires_user_selection || false,
      assigned_devices: service.assigned_devices || [],
      requires_device_selection: service.requires_device_selection || false,
      device_quantity_required: service.device_quantity_required || 1,
      assigned_rooms: service.assigned_rooms || [],
      requires_room_selection: service.requires_room_selection || false,
      room_quantity_required: service.room_quantity_required || 1,
      base_duration_min: service.base_duration_min,
      buffer_before_min: service.buffer_before_min,
      buffer_after_min: service.buffer_after_min,
      can_overlap: service.can_overlap,
      parallel_group: service.parallel_group || '',
      requires_room: service.requires_room,
      required_device_type: service.required_device_type || '',
      min_age_years: service.min_age_years,
      max_age_years: service.max_age_years,
      requires_consent: service.requires_consent,
      online_bookable: service.online_bookable,
      is_online_booking_enabled: (service as any).is_online_booking_enabled ?? service.online_bookable,
      requires_confirmation: (service as any).requires_confirmation ?? false,
      requires_scheduling_confirmation: (service as any).requires_scheduling_confirmation ?? false,
      max_waitlist: (service as any).max_waitlist ?? 0,
      online_contingents: (service as any).online_contingents || [],
      anamnesisQuestions: (service as any).anamnesisQuestions || [],
      price: service.price !== undefined && service.price !== null ? service.price : (service.price_cents ? service.price_cents / 100 : 0),
      price_cents: service.price_cents || (service.price ? Math.round(service.price * 100) : 0),
      taxRate: (service as any).taxRate !== undefined ? (service as any).taxRate : null,
      billing_code: service.billing_code || '',
      notes: service.notes || '',
      is_active: service.is_active,
      color_hex: service.color_hex || '#2563EB',
      quick_select: service.quick_select || false,
      location_id: service.location_id,
      // Abrechnungsfelder
      billingType: service.billingType || 'both',
      ogk: {
        khoCode: service.ogk?.khoCode || '',
        khoPrice: service.ogk?.khoPrice !== undefined && service.ogk?.khoPrice !== null ? service.ogk.khoPrice : 0,
        khoGroup: service.ogk?.khoGroup || '',
        khoSubGroup: service.ogk?.khoSubGroup || '',
        insuranceProvider: service.ogk?.insuranceProvider || 'all',
        federalState: service.ogk?.federalState || null,
        requiresApproval: service.ogk?.requiresApproval || false,
        billingFrequency: service.ogk?.billingFrequency || 'once',
        ...(service.ogk?.conflictRules ? { conflictRules: service.ogk.conflictRules } : {}),
        ...(service.ogk?.justificationRules ? { justificationRules: service.ogk.justificationRules } : {})
      },
      wahlarzt: {
        price: service.wahlarzt?.price !== undefined && service.wahlarzt?.price !== null ? service.wahlarzt.price : 0, // ALLE PREISE SIND BEREITS IN EURO!
        priceType: service.wahlarzt?.priceType || 'netto',
        reimbursementRate: service.wahlarzt?.reimbursementRate || 80,
        maxReimbursement: service.wahlarzt?.maxReimbursement !== undefined && service.wahlarzt?.maxReimbursement !== null ? service.wahlarzt.maxReimbursement : 0, // ALLE PREISE SIND BEREITS IN EURO!
        requiresPreApproval: service.wahlarzt?.requiresPreApproval || false
      },
      private: {
        price: service.private?.price !== undefined && service.private?.price !== null ? service.private.price : 0, // ALLE PREISE SIND BEREITS IN EURO!
        priceType: service.private?.priceType || 'netto',
        noInsurance: service.private?.noInsurance ?? true
      },
      copay: {
        applicable: service.copay?.applicable ?? true,
        amount: service.copay?.amount !== undefined && service.copay?.amount !== null
          ? service.copay.amount // ALLE PREISE SIND BEREITS IN EURO!
          : 0,
        percentage: service.copay?.percentage || 10,
        maxAmount: service.copay?.maxAmount || 28.50,
        exempt: service.copay?.exempt || false
      },
      // Kostenstruktur (für BI-Dashboard) - alle Werte in Euro
      costs: {
        materialCosts: (service as any).costs?.materialCosts || (service as any).costs?.materialCostsCents ? (service as any).costs.materialCostsCents / 100 : 0,
        equipmentCosts: (service as any).costs?.equipmentCosts || (service as any).costs?.equipmentCostsCents ? (service as any).costs.equipmentCostsCents / 100 : 0,
        variableCosts: (service as any).costs?.variableCosts || (service as any).costs?.variableCostsCents ? (service as any).costs.variableCostsCents / 100 : 0,
        fixedCosts: (service as any).costs?.fixedCosts || (service as any).costs?.fixedCostsCents ? (service as any).costs.fixedCostsCents / 100 : 0
      }
    });
    
    // Standort-Auswahl für Geräte und Räume setzen
    if (locations.length === 1) {
      setSelectedDeviceLocation(locations[0]._id);
      setSelectedRoomLocation(locations[0]._id);
        // Service-Standort automatisch vorbelegen wenn nicht bereits gesetzt
        if (!service.location_id?._id) {
          const firstLocation = locations[0];
          setFormData(prev => {
            const updated = { ...prev, location_id: firstLocation };
            // Bundesland automatisch aus Standort übernehmen, wenn vorhanden
            if (firstLocation && (firstLocation as any).federalState) {
              updated.ogk = {
                ...updated.ogk,
                federalState: (firstLocation as any).federalState
              };
            }
            return updated;
          });
        } else if (service.location_id) {
          const location = service.location_id as any;
          if (location.federalState) {
            setFormData(prev => ({
              ...prev,
              ogk: {
                ...prev.ogk,
                federalState: location.federalState
              }
            }));
          }
        }
    } else {
      // Wenn Service bereits Geräte hat, deren Standort für Geräte-Auswahl verwenden
      if (service.assigned_devices && service.assigned_devices.length > 0) {
        const firstDevice = service.assigned_devices[0];
        if (firstDevice.location?._id) {
          setSelectedDeviceLocation(firstDevice.location._id);
        }
      }
      
      // Wenn Service bereits Räume hat, deren Standort für Raum-Auswahl verwenden
      if (service.assigned_rooms && service.assigned_rooms.length > 0) {
        const firstRoom = service.assigned_rooms[0];
        if (firstRoom.location?._id) {
          setSelectedRoomLocation(firstRoom.location._id);
        }
      }
    }
    
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload: any = {
        ...formData,
        price_cents: formData.price_cents || undefined,
        min_age_years: formData.min_age_years,
        max_age_years: formData.max_age_years,
        visible_to_roles: formData.visible_to_roles
      };

      console.log('FormData vor Speichern:', formData);
      console.log('Assigned rooms:', formData.assigned_rooms);
      console.log('Available rooms:', rooms);
      console.log('Filtered rooms:', getFilteredRooms());

      // Entferne leere location_id
      if (payload.location_id === '') {
        delete payload.location_id;
      }

      // Entferne leere required_role
      if (payload.required_role === '') {
        delete payload.required_role;
      }

      // Nur KHO: Legacy-Felder (ebm*) aus Payload entfernen
      if (payload.ogk) {
        const { ebmCode: _ebmCode, ebmPrice: _ebmPrice, ebmGroup: _ebmGroup, ebmSubGroup: _ebmSubGroup, ...ogkKhoOnly } = payload.ogk as Record<string, unknown>;
        payload.ogk = ogkKhoOnly as typeof payload.ogk;
      }

        const response = editingService 
          ? await api.put<ServiceCatalog>(`/service-catalog/${editingService._id}`, payload)
          : await api.post<ServiceCatalog>('/service-catalog', payload);

      if (response.success) {
        enqueueSnackbar(editingService ? 'Leistung erfolgreich aktualisiert' : 'Leistung erfolgreich erstellt', { variant: 'success' });
        setDialogOpen(false);
        fetchServices();
        fetchFilterCategories();
      } else {
        throw new Error(response.message || 'Fehler beim Speichern');
      }
    } catch (error: any) {
      console.error('Error saving service:', error);
      enqueueSnackbar(error.message || 'Fehler beim Speichern', { variant: 'error' });
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diese Leistung löschen möchten?')) {
      return;
    }

    try {
      const response = await api.delete<{success: boolean}>(`/service-catalog/${serviceId}`);

      if (response.success) {
        enqueueSnackbar('Leistung erfolgreich gelöscht', { variant: 'success' });
        fetchServices();
        fetchFilterCategories();
      } else {
        throw new Error(response.message || 'Fehler beim Löschen');
      }
    } catch (error: any) {
      console.error('Error deleting service:', error);
      const errorMessage = error?.message || error?.toString() || 'Fehler beim Löschen';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };


  // Helper-Funktion: Konvertiert Wert zu Euro (automatische Erkennung)
  // Wenn Wert > 100000, wird angenommen, dass es in Cent ist (alte Daten)
  // ALLE PREISE SIND BEREITS IN EURO - KEINE KONVERTIERUNG MEHR!
  const toEuro = (value: number | undefined | null): number => {
    if (!value && value !== 0) return 0;
    // Alle Preise sind bereits in Euro - keine Konvertierung mehr!
    return value;
  };

  const formatPrice = (price?: number) => {
    if (!price && price !== 0) return '-';
    return `€${toEuro(price).toFixed(2)}`;
  };

  const formatDuration = (service: ServiceCatalog) => {
    // Handle both old and new field names
    const duration = service.base_duration_min || service.duration || 0;
    const bufferBefore = service.buffer_before_min || service.bufferBefore || 0;
    const bufferAfter = service.buffer_after_min || service.bufferAfter || 0;
    const total = duration + bufferBefore + bufferAfter;
    return `${total} Min (${duration} + ${bufferBefore} + ${bufferAfter})`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 2, 
      width: '100%', 
      maxWidth: '100vw', 
      overflow: 'hidden',
      mt: marginTopValue !== '0px' ? marginTopValue : 0,
      transition: marginTopValue !== '0px' ? 'margin-top 0.3s ease' : 'none',
    }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h4" component="h1">
            Leistungskatalog
          </Typography>
          <Tooltip title="Hilfe & Leitfaden">
            <IconButton
              onClick={() => setHelpDialogOpen(true)}
              color="primary"
            >
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          sx={{ ml: 2 }}
        >
          Neue Leistung
        </Button>
      </Box>

      {/* Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2, alignItems: 'center' }}>
            <Box>
              <TextField
                fullWidth
                label="Suche"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Box>
            <Box>
              <FormControl fullWidth>
                <InputLabel>Fachrichtung</InputLabel>
                <Select
                  value={filterSpecialty}
                  onChange={(e) => setFilterSpecialty(e.target.value)}
                  label="Fachrichtung"
                >
                  <MenuItem value="">Alle Fachrichtungen</MenuItem>
                  <MenuItem value="allgemeinmedizin">Allgemeinmedizin</MenuItem>
                  <MenuItem value="chirurgie">Chirurgie</MenuItem>
                  <MenuItem value="dermatologie">Dermatologie</MenuItem>
                  <MenuItem value="gynaekologie">Gynäkologie</MenuItem>
                  <MenuItem value="orthopaedie">Orthopädie</MenuItem>
                  <MenuItem value="neurologie">Neurologie</MenuItem>
                  <MenuItem value="kardiologie">Kardiologie</MenuItem>
                  <MenuItem value="pneumologie">Pneumologie</MenuItem>
                  <MenuItem value="gastroenterologie">Gastroenterologie</MenuItem>
                  <MenuItem value="urologie">Urologie</MenuItem>
                  <MenuItem value="ophthalmologie">Ophthalmologie</MenuItem>
                  <MenuItem value="hno">HNO</MenuItem>
                  <MenuItem value="psychiatrie">Psychiatrie</MenuItem>
                  <MenuItem value="radiologie">Radiologie</MenuItem>
                  <MenuItem value="labor">Labor</MenuItem>
                  <MenuItem value="anästhesie">Anästhesie</MenuItem>
                  <MenuItem value="notfallmedizin">Notfallmedizin</MenuItem>
                  <MenuItem value="sportmedizin">Sportmedizin</MenuItem>
                  <MenuItem value="arbeitsmedizin">Arbeitsmedizin</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <FormControl fullWidth>
                <InputLabel>Standort</InputLabel>
                <Select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  label="Standort"
                >
                  <MenuItem value="">Alle Standorte</MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location._id} value={location._id}>
                      {location.name} ({location.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <FormControl fullWidth>
                <InputLabel>Kategorie</InputLabel>
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  label="Kategorie"
                >
                  <MenuItem value="">Alle Kategorien</MenuItem>
                  {filterCategories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <FormControl fullWidth>
                <InputLabel>Rolle</InputLabel>
                <Select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  label="Rolle"
                >
                  <MenuItem value="">Alle Rollen</MenuItem>
                  <MenuItem value="arzt">Arzt</MenuItem>
                  <MenuItem value="therapeut">Therapeut</MenuItem>
                  <MenuItem value="assistenz">Assistenz</MenuItem>
                  <MenuItem value="schwester">Schwester</MenuItem>
                  <MenuItem value="rezeption">Rezeption</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabelle */}
      <Card sx={{ boxShadow: 2 }}>
        <TableContainer sx={{ 
          width: '100%',
          overflowX: 'auto',
          '&::-webkit-scrollbar': {
            height: '10px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#f5f5f5',
            borderRadius: '5px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#888',
            borderRadius: '5px',
            '&:hover': {
              backgroundColor: '#555',
            },
          },
        }}>
          <Table sx={{ minWidth: '1400px' }}>
            <TableHead>
              <TableRow sx={{ 
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f5f5f5' 
              }}>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  width: '80px',
                  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                }}>Code</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  width: '200px',
                  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                }}>Name</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  width: '100px',
                  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                }}>Kategorie</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  width: '130px',
                  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                }}>Standort</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  width: '90px',
                  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                }}>Dauer</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  width: '90px',
                  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                }}>Preis</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  width: '90px',
                  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                }}>Rolle</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  width: '120px',
                  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                }}>Zuordnung</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold', 
                  width: '80px',
                  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                }}>Farbe</TableCell>
                <TableCell align="right" sx={{ 
                  fontWeight: 'bold', 
                  width: '120px',
                  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : 'inherit'
                }}>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services && Array.isArray(services) && services.map((service) => (
                <TableRow 
                  key={service._id}
                  sx={{
                    height: 'auto',
                    minHeight: '80px',
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : 'rgba(0, 0, 0, 0.04)',
                      cursor: 'pointer'
                    },
                    '& td': {
                      verticalAlign: 'top',
                      padding: '12px 16px'
                    }
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold" noWrap>
                      {service.code}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: '250px', minWidth: '200px' }}>
                    <Box sx={{ 
                      maxHeight: '60px', 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      <Typography 
                        variant="body2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          '& *': {
                            margin: 0,
                            padding: 0,
                            display: 'inline'
                          }
                        }}
                        dangerouslySetInnerHTML={{ __html: service.name }}
                      />
                    </Box>
                    {service.description && (
                      <Box sx={{ 
                        maxHeight: '40px', 
                        overflow: 'hidden',
                        mt: 0.5
                      }}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            '& *': {
                              margin: 0,
                              padding: 0,
                              display: 'inline'
                            }
                          }}
                          dangerouslySetInnerHTML={{ __html: service.description }}
                        />
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {service.category && (
                      <Chip label={service.category} size="small" />
                    )}
                  </TableCell>
                  <TableCell sx={{ maxWidth: '200px' }}>
                    <Typography 
                      variant="body2" 
                      noWrap
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {service.location_id && typeof service.location_id === 'object' && service.location_id?.name 
                        ? service.location_id.name 
                        : 'Kein Standort zugewiesen'}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      noWrap
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {service.location_id && typeof service.location_id === 'object' && service.location_id?.code 
                        ? service.location_id.code 
                        : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {formatDuration(service)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {formatPrice(service.price || service.price_cents || service.prices?.privat)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {(service.required_role || service.requiredRole) && (
                      <Chip 
                        label={service.required_role || service.requiredRole} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ minWidth: '280px', maxWidth: '350px' }}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 0.5
                    }}>
                      {/* Benutzer */}
                      {service.assigned_users && service.assigned_users.length > 0 ? (
                        <Box>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary" noWrap>
                            Benutzer:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                            {service.assigned_users.slice(0, 2).map((user) => (
                              <Chip
                                key={user._id}
                                label={`${user.firstName} ${user.lastName}`}
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  maxWidth: '180px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  '& .MuiChip-label': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  },
                                  '&:hover': {
                                    transform: 'none'
                                  }
                                }}
                              />
                            ))}
                            {service.assigned_users.length > 2 && (
                              <Chip
                                label={`+${service.assigned_users.length - 2}`}
                                size="small"
                                variant="outlined"
                                color="secondary"
                                sx={{ 
                                  '&:hover': {
                                    transform: 'none'
                                  }
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      ) : null}
                      {/* Geräte */}
                      {service.assigned_devices && service.assigned_devices.length > 0 ? (
                        <Box>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary" noWrap>
                            Geräte:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                            {service.assigned_devices.slice(0, 2).map((device) => (
                              <Chip
                                key={device._id}
                                label={device.name}
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  maxWidth: '180px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  '& .MuiChip-label': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  },
                                  '&:hover': {
                                    transform: 'none'
                                  }
                                }}
                              />
                            ))}
                            {service.assigned_devices.length > 2 && (
                              <Chip
                                label={`+${service.assigned_devices.length - 2}`}
                                size="small"
                                variant="outlined"
                                color="info"
                                sx={{ 
                                  '&:hover': {
                                    transform: 'none'
                                  }
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      ) : null}
                      {/* Räume */}
                      {service.assigned_rooms && service.assigned_rooms.length > 0 ? (
                        <Box>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary" noWrap>
                            Räume:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                            {service.assigned_rooms.slice(0, 2).map((room) => (
                              <Chip
                                key={room._id}
                                label={room.name}
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  maxWidth: '180px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  '& .MuiChip-label': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  },
                                  '&:hover': {
                                    transform: 'none'
                                  }
                                }}
                              />
                            ))}
                            {service.assigned_rooms.length > 2 && (
                              <Chip
                                label={`+${service.assigned_rooms.length - 2}`}
                                size="small"
                                variant="outlined"
                                color="success"
                                sx={{ 
                                  '&:hover': {
                                    transform: 'none'
                                  }
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      ) : null}
                      {(!service.assigned_users || service.assigned_users.length === 0) &&
                        (!service.assigned_devices || service.assigned_devices.length === 0) &&
                        (!service.assigned_rooms || service.assigned_rooms.length === 0) && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            Keine
                          </Typography>
                        )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ minWidth: '180px', maxWidth: '220px' }}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 0.3, 
                      alignItems: 'flex-start'
                    }}>
                      {/* Status */}
                      <Chip 
                        label={(service.is_active || service.isActive) ? 'Aktiv' : 'Inaktiv'} 
                        size="small" 
                        color={(service.is_active || service.isActive) ? 'success' : 'default'}
                        sx={{ height: '24px' }}
                      />
                      {/* Medizinische Leistung */}
                      <Chip 
                        label={service.isMedical ? 'Medizinisch' : 'Nicht-medizinisch'} 
                        size="small" 
                        color={service.isMedical ? 'error' : 'default'}
                        variant="outlined"
                        sx={{ height: '24px' }}
                      />
                      {/* Schnellauswahl */}
                      {service.quick_select && (
                        <Chip 
                          label="Schnellauswahl" 
                          size="small" 
                          color="primary"
                          variant="filled"
                          sx={{ height: '24px' }}
                        />
                      )}
                      {/* Farbe */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            backgroundColor: service.color_hex || '#2563EB',
                            border: '1px solid #ccc',
                            flexShrink: 0
                          }}
                        />
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          noWrap
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '150px'
                          }}
                        >
                          {service.color_hex || '#2563EB'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(service)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(service._id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ mr: 1 }}>
              Einträge pro Seite:
            </Typography>
            <Select
              value={rowsPerPage}
              onChange={(e) => {
                const val = Number(e.target.value);
                console.log('🔥 RowsPerPage changed to', val);
                setRowsPerPage(val);
                setPage(0);
              }}
              size="small"
            >
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">
              {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, totalCount)} von {totalCount}
            </Typography>
            <IconButton
              onClick={() => {
                console.log('🔥🔥🔥 First page clicked - current page:', page, 'totalCount:', totalCount);
                setPage(0);
                console.log('🔥🔥🔥 setPage(0) called');
              }}
              disabled={page === 0}
              size="medium"
              sx={{ minWidth: 40, minHeight: 40 }}
            >
              <FirstPageIcon />
            </IconButton>
            <IconButton
              onClick={() => {
                console.log('🔥🔥🔥 Previous page clicked - from', page, 'to', page - 1);
                setPage(page - 1);
                console.log('🔥🔥🔥 setPage called with:', page - 1);
              }}
              disabled={page === 0}
              size="medium"
              sx={{ minWidth: 40, minHeight: 40 }}
            >
              <NavigateBeforeIcon />
            </IconButton>
            <IconButton
              onClick={() => {
                console.log('🔥🔥🔥 Next page clicked - from', page, 'to', page + 1, 'totalCount:', totalCount);
                setPage(page + 1);
                console.log('🔥🔥🔥 setPage called with:', page + 1);
              }}
              disabled={(page + 1) * rowsPerPage >= totalCount}
              size="medium"
              sx={{ minWidth: 40, minHeight: 40 }}
            >
              <NavigateNextIcon />
            </IconButton>
            <IconButton
              onClick={() => {
                const lastPage = Math.ceil(totalCount / rowsPerPage) - 1;
                console.log('🔥🔥🔥 Last page clicked - going to page', lastPage);
                setPage(lastPage);
                console.log('🔥🔥🔥 setPage called with:', lastPage);
              }}
              disabled={(page + 1) * rowsPerPage >= totalCount}
              size="medium"
              sx={{ minWidth: 40, minHeight: 40 }}
            >
              <LastPageIcon />
            </IconButton>
          </Box>
        </Box>
      </Card>

      {/* Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
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
          isEdit={!!editingService}
          title={editingService ? 'Leistung bearbeiten' : 'Neue Leistung erstellen'}
          icon={editingService ? <EditIcon /> : <AddIcon />}
          gradientColors={{ from: '#667eea', to: '#764ba2' }}
        />
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box>
            <Tabs 
              value={activeTab} 
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ 
                mb: 3,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  minWidth: 120,
                }
              }}
            >
              <Tab label="Grunddaten" icon={<InfoIcon />} iconPosition="start" />
              <Tab label="Zeit & Dauer" icon={<AccessTimeIcon />} iconPosition="start" />
              <Tab label="Zuordnung" icon={<GroupIcon />} iconPosition="start" />
              <Tab label="Preis & Billing" icon={<AttachMoneyIcon />} iconPosition="start" />
              <Tab label="Geräte & Räume" icon={<RoomIcon />} iconPosition="start" />
              <Tab label="Update-Status" icon={<SettingsIcon />} iconPosition="start" />
              <Tab label="Online-Kontingente" icon={<EventNoteIcon />} iconPosition="start" />
              <Tab label="Anamnese" icon={<QuestionAnswerIcon />} iconPosition="start" />
              <Tab label="Einstellungen" icon={<SettingsIcon />} iconPosition="start" />
            </Tabs>

            {/* Tab 1: Grunddaten */}
            {activeTab === 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="Code *"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
                <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    Name *
                  </Typography>
                  <RichTextEditor
                    value={formData.name || ''}
                    onChange={(html) => setFormData({ ...formData, name: html })}
                    placeholder="Leistungsname eingeben..."
                    minHeight={80}
                  />
                </Box>
                <Autocomplete
                  freeSolo={false}
                  options={categories}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option.name || '';
                  }}
                  value={categories.find(cat => cat.name === formData.category) || null}
                  onChange={(event, newValue) => {
                    console.log('📋 Category selected:', newValue);
                    setFormData({ 
                      ...formData, 
                      category: newValue ? (typeof newValue === 'string' ? newValue : newValue.name) : '' 
                    });
                  }}
                  onOpen={() => {
                    console.log('📋 Autocomplete opened, categories available:', categories);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Kategorie *"
                      placeholder={categories.length > 0 ? "Kategorie auswählen" : "Keine Kategorien verfügbar"}
                      required
                    />
                  )}
                  renderOption={(props, option) => {
                    const category = typeof option === 'string' 
                      ? categories.find(c => c.name === option)
                      : option;
                    if (!category) return null;
                    return (
                      <li {...props} key={category._id || category.name || 'unknown'}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {category.color_hex && (
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                bgcolor: category.color_hex,
                                flexShrink: 0
                              }}
                            />
                          )}
                          <Box>
                            <Typography variant="body1">{category.name || ''}</Typography>
                            {category.code && (
                              <Typography variant="caption" color="text.secondary">
                                {category.code}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </li>
                    );
                  }}
                  isOptionEqualToValue={(option, value) => {
                    if (!option || !value) return false;
                    const optName = typeof option === 'string' ? option : option.name;
                    const valName = typeof value === 'string' ? value : value.name;
                    return optName === valName;
                  }}
                  noOptionsText={categories.length === 0 ? "Keine Kategorien verfügbar. Bitte erstellen Sie zuerst eine Kategorie in der Service-Kategorien-Verwaltung." : "Keine Optionen"}
                />
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    Beschreibung
                  </Typography>
                  <RichTextEditor
                    value={formData.description || ''}
                    onChange={(html) => setFormData({ ...formData, description: html })}
                    placeholder="Beschreibung eingeben..."
                    minHeight={150}
                  />
                </Box>
                <FormControl fullWidth>
                  <InputLabel>Fachrichtung</InputLabel>
                  <Select
                    value={formData.specialty || 'allgemeinmedizin'}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    label="Fachrichtung"
                  >
                    <MenuItem value="allgemeinmedizin">Allgemeinmedizin</MenuItem>
                    <MenuItem value="chirurgie">Chirurgie</MenuItem>
                    <MenuItem value="dermatologie">Dermatologie</MenuItem>
                    <MenuItem value="gynaekologie">Gynäkologie</MenuItem>
                    <MenuItem value="orthopaedie">Orthopädie</MenuItem>
                    <MenuItem value="neurologie">Neurologie</MenuItem>
                    <MenuItem value="kardiologie">Kardiologie</MenuItem>
                    <MenuItem value="pneumologie">Pneumologie</MenuItem>
                    <MenuItem value="gastroenterologie">Gastroenterologie</MenuItem>
                    <MenuItem value="urologie">Urologie</MenuItem>
                    <MenuItem value="ophthalmologie">Ophthalmologie</MenuItem>
                    <MenuItem value="hno">HNO</MenuItem>
                    <MenuItem value="psychiatrie">Psychiatrie</MenuItem>
                    <MenuItem value="radiologie">Radiologie</MenuItem>
                    <MenuItem value="labor">Labor</MenuItem>
                    <MenuItem value="pathologie">Pathologie</MenuItem>
                    <MenuItem value="anästhesie">Anästhesie</MenuItem>
                    <MenuItem value="notfallmedizin">Notfallmedizin</MenuItem>
                    <MenuItem value="sportmedizin">Sportmedizin</MenuItem>
                    <MenuItem value="arbeitsmedizin">Arbeitsmedizin</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth required>
                  <InputLabel>Standort *</InputLabel>
                  <Select
                    value={typeof formData.location_id === 'object' ? formData.location_id?._id || '' : formData.location_id || ''}
                    onChange={(e) => {
                      const location = locations.find(loc => loc._id === e.target.value);
                      const updatedFormData = { ...formData, location_id: location || undefined };
                      if (location && (location as any).federalState) {
                        updatedFormData.ogk = {
                          ...updatedFormData.ogk,
                          federalState: (location as any).federalState
                        };
                      }
                      setFormData(updatedFormData);
                    }}
                    label="Standort *"
                  >
                    {locations.map((location) => (
                      <MenuItem key={location._id} value={location._id}>
                        {location.name} ({location.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    Beschreibung
                  </Typography>
                  <RichTextEditor
                    value={formData.description || ''}
                    onChange={(html) => setFormData({ ...formData, description: html })}
                    placeholder="Beschreibung eingeben..."
                    minHeight={150}
                  />
                </Box>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isMedical}
                        onChange={(e) => setFormData({ ...formData, isMedical: e.target.checked })}
                        required
                      />
                    }
                    label={
                      <Box>
                        <Typography component="span">Medizinische Leistung</Typography>
                        <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                      </Box>
                    }
                  />
                </Box>
              </Box>
            )}

            {/* Tab 2: Zeit & Dauer */}
            {activeTab === 1 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="Grunddauer (Min) *"
                  type="number"
                  value={formData.base_duration_min}
                  onChange={(e) => setFormData({ ...formData, base_duration_min: parseInt(e.target.value) || 0 })}
                  required
                />
                <TextField
                  fullWidth
                  label="Puffer vorher (Min)"
                  type="number"
                  value={formData.buffer_before_min}
                  onChange={(e) => setFormData({ ...formData, buffer_before_min: parseInt(e.target.value) || 0 })}
                />
                <TextField
                  fullWidth
                  label="Puffer nachher (Min)"
                  type="number"
                  value={formData.buffer_after_min}
                  onChange={(e) => setFormData({ ...formData, buffer_after_min: parseInt(e.target.value) || 0 })}
                />
              </Box>
            )}

            {/* Tab 3: Zuordnung */}
            {activeTab === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Erforderliche Rolle</InputLabel>
                  <Select
                    value={formData.required_role}
                    onChange={(e) => setFormData({ ...formData, required_role: e.target.value })}
                    label="Erforderliche Rolle"
                  >
                    <MenuItem value="">Keine spezifische Rolle</MenuItem>
                    <MenuItem value="arzt">Arzt</MenuItem>
                    <MenuItem value="therapeut">Therapeut</MenuItem>
                    <MenuItem value="assistenz">Assistenz</MenuItem>
                    <MenuItem value="schwester">Schwester</MenuItem>
                    <MenuItem value="rezeption">Rezeption</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requires_user_selection}
                      onChange={(e) => setFormData({ ...formData, requires_user_selection: e.target.checked })}
                    />
                  }
                  label="Benutzer-Auswahl bei Terminvergabe erforderlich"
                />
                <Autocomplete
                  multiple
                  options={users}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.role})`}
                  value={users.filter(user => formData.assigned_users?.some(au => (typeof au === 'string' ? au : au._id) === user._id)) || []}
                  onChange={(event, newValue) => {
                    setFormData({
                      ...formData,
                      assigned_users: newValue
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Zugewiesene Benutzer"
                      placeholder="Benutzer auswählen..."
                      fullWidth
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key: _key, ...tagProps } = getTagProps({ index });
                      return (
                        <Chip
                          {...tagProps}
                          key={option._id}
                          label={`${option.firstName} ${option.lastName}`}
                          color="primary"
                          variant="outlined"
                        />
                      );
                    })
                  }
                />
              </Box>
            )}

            {/* Tab 4: Preis & Billing */}
            {activeTab === 3 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Hauptpreis */}
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Hauptpreis
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Dieser Preis wird in der Übersichtstabelle angezeigt und als Standardpreis verwendet.
                  </Typography>
                  <TextField
                    fullWidth
                    label="Preis (Euro)"
                    type="number"
                    inputProps={{ step: "0.01" }}
                    value={formData.price !== undefined && formData.price !== null && formData.price !== 0
                      ? formData.price 
                      : formData.price_cents && formData.price_cents !== 0
                        ? (formData.price_cents / 100) 
                        : ''}
                    onChange={(e) => {
                      const euroValue = parseFloat(e.target.value) || 0;
                      setFormData({ 
                        ...formData, 
                        price: euroValue,
                        // Für Backward Compatibility auch price_cents setzen
                        price_cents: Math.round(euroValue * 100)
                      });
                    }}
                    helperText="Dieser Preis wird in der ServiceCatalog-Übersicht angezeigt"
                  />
                </Box>

                {/* Abrechnungstyp */}
                <FormControl fullWidth required>
                  <InputLabel>Abrechnungstyp</InputLabel>
                  <Select
                    value={formData.billingType || 'both'}
                    onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                    label="Abrechnungstyp"
                  >
                    <MenuItem value="kassenarzt">Nur Kassenarzt</MenuItem>
                    <MenuItem value="wahlarzt">Nur Wahlarzt</MenuItem>
                    <MenuItem value="privat">Nur Privat</MenuItem>
                    <MenuItem value="both">Alle Typen</MenuItem>
                  </Select>
                </FormControl>

                {/* ÖGK - Kassenarzt */}
                {(formData.billingType === 'kassenarzt' || formData.billingType === 'both') && (
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      ÖGK (Kassenarzt)
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                      <TextField
                        fullWidth
                        label="KHO-Code"
                        helperText="Kassenhonorarordnung-Code (Österreich)"
                        value={formData.ogk?.khoCode || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          ogk: { ...formData.ogk, khoCode: e.target.value }
                        })}
                      />
                      <TextField
                        fullWidth
                        label="KHO-Preis (Euro)"
                        helperText="Preis in Euro"
                        type="number"
                        inputProps={{ step: "0.01" }}
                        value={formData.ogk?.khoPrice !== undefined && formData.ogk?.khoPrice !== null && formData.ogk?.khoPrice !== 0 ? formData.ogk.khoPrice : ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          ogk: { ...formData.ogk, khoPrice: parseFloat(e.target.value) || 0 }
                        })}
                      />
                      <FormControl fullWidth>
                        <InputLabel>Versicherungsträger</InputLabel>
                        <Select
                          value={formData.ogk?.insuranceProvider || 'all'}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            ogk: { ...formData.ogk, insuranceProvider: e.target.value }
                          })}
                          label="Versicherungsträger"
                        >
                          <MenuItem value="all">Alle</MenuItem>
                          <MenuItem value="oegk">ÖGK</MenuItem>
                          <MenuItem value="bvaeb">BVAEB</MenuItem>
                          <MenuItem value="svs">SVS</MenuItem>
                          <MenuItem value="kfa">KFA</MenuItem>
                          <MenuItem value="pva">PVA</MenuItem>
                          <MenuItem value="vaeb">VAEB</MenuItem>
                          <MenuItem value="auva">AUVA</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl fullWidth>
                        <InputLabel>Bundesland (optional)</InputLabel>
                        <Select
                          value={formData.ogk?.federalState || ''}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            ogk: { ...formData.ogk, federalState: e.target.value || null }
                          })}
                          label="Bundesland (optional)"
                        >
                          <MenuItem value="">Keine Einschränkung</MenuItem>
                          <MenuItem value="burgenland">Burgenland</MenuItem>
                          <MenuItem value="kaernten">Kärnten</MenuItem>
                          <MenuItem value="niederoesterreich">Niederösterreich</MenuItem>
                          <MenuItem value="oberoesterreich">Oberösterreich</MenuItem>
                          <MenuItem value="salzburg">Salzburg</MenuItem>
                          <MenuItem value="steiermark">Steiermark</MenuItem>
                          <MenuItem value="tirol">Tirol</MenuItem>
                          <MenuItem value="vorarlberg">Vorarlberg</MenuItem>
                          <MenuItem value="wien">Wien</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.ogk?.requiresApproval || false}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              ogk: { ...formData.ogk, requiresApproval: e.target.checked }
                            })}
                          />
                        }
                        label="Genehmigung erforderlich"
                      />
                      <FormControl fullWidth>
                        <InputLabel>Abrechnungsfrequenz</InputLabel>
                        <Select
                          value={formData.ogk?.billingFrequency || 'once'}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            ogk: { ...formData.ogk, billingFrequency: e.target.value }
                          })}
                          label="Abrechnungsfrequenz"
                        >
                          <MenuItem value="once">Einmalig</MenuItem>
                          <MenuItem value="periodic">Regelmäßig</MenuItem>
                        </Select>
                      </FormControl>
                      
                      {/* NEU: Conflict-Rules (Ausschluss-Regeln) */}
                      <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          Ausschluss-Regeln (Conflict-Detection)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Definieren Sie, welche Services nicht gleichzeitig mit diesem Service abgerechnet werden können.
                        </Typography>
                        
                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.ogk?.conflictRules?.allowOverride || false}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                ogk: { 
                                  ...formData.ogk, 
                                  conflictRules: {
                                    ...(formData.ogk?.conflictRules || {}),
                                    allowOverride: e.target.checked
                                  }
                                }
                              })}
                            />
                          }
                          label="Überschreibung erlauben (mit Begründung)"
                        />
                        
                        {formData.ogk?.conflictRules?.allowOverride && (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={formData.ogk?.conflictRules?.overrideRequiresJustification !== false}
                                onChange={(e) => setFormData({ 
                                  ...formData, 
                                  ogk: { 
                                    ...formData.ogk, 
                                    conflictRules: {
                                      ...(formData.ogk?.conflictRules || {}),
                                      overrideRequiresJustification: e.target.checked
                                    }
                                  }
                                })}
                              />
                            }
                            label="Begründung bei Überschreibung erforderlich"
                            sx={{ ml: 2 }}
                          />
                        )}
                        
                        <TextField
                          fullWidth
                          label="Konflikt-Service-Codes"
                          helperText="Komma-getrennte Liste von Service-Codes, die nicht gleichzeitig abgerechnet werden können (z.B. HB1,TELE)"
                          value={formData.ogk?.conflictRules?.conflictsWith?.join(',') || ''}
                          onChange={(e) => {
                            const codes = e.target.value.split(',').map(c => c.trim()).filter(c => c);
                            setFormData({ 
                              ...formData, 
                              ogk: { 
                                ...formData.ogk, 
                                conflictRules: {
                                  ...(formData.ogk?.conflictRules || {}),
                                  conflictsWith: codes.length > 0 ? codes : undefined
                                }
                              }
                            });
                          }}
                          sx={{ mt: 2 }}
                        />
                      </Box>
                      
                      {/* NEU: Begründungspflicht-Regeln */}
                      <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          Begründungspflicht-Regeln
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Definieren Sie, welche Felder bei der Abrechnung dieses Services ausgefüllt werden müssen.
                        </Typography>
                        
                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.ogk?.justificationRules?.requiresJustification || false}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                ogk: { 
                                  ...formData.ogk, 
                                  justificationRules: {
                                    ...(formData.ogk?.justificationRules || {}),
                                    requiresJustification: e.target.checked
                                  }
                                }
                              })}
                            />
                          }
                          label="Begründung erforderlich"
                        />
                        
                        {formData.ogk?.justificationRules?.requiresJustification && (
                          <>
                            <FormControl fullWidth sx={{ mt: 2 }}>
                              <InputLabel>Art der Begründung</InputLabel>
                              <Select
                                value={formData.ogk?.justificationRules?.justificationType || 'text'}
                                onChange={(e) => setFormData({ 
                                  ...formData, 
                                  ogk: { 
                                    ...formData.ogk, 
                                    justificationRules: {
                                      ...(formData.ogk?.justificationRules || {}),
                                      justificationType: e.target.value as 'text' | 'time' | 'diagnosis' | 'combination'
                                    }
                                  }
                                })}
                                label="Art der Begründung"
                              >
                                <MenuItem value="text">Text</MenuItem>
                                <MenuItem value="time">Uhrzeit</MenuItem>
                                <MenuItem value="diagnosis">Diagnose</MenuItem>
                                <MenuItem value="combination">Kombination</MenuItem>
                              </Select>
                            </FormControl>
                            
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Erforderliche Felder:
                              </Typography>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={formData.ogk?.justificationRules?.justificationFields?.text || false}
                                    onChange={(e) => setFormData({ 
                                      ...formData, 
                                      ogk: { 
                                        ...formData.ogk, 
                                        justificationRules: {
                                          ...formData.ogk?.justificationRules,
                                          justificationFields: {
                                            ...(formData.ogk?.justificationRules?.justificationFields || {}),
                                            text: e.target.checked
                                          }
                                        }
                                      }
                                    })}
                                  />
                                }
                                label="Textfeld"
                              />
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={formData.ogk?.justificationRules?.justificationFields?.time || false}
                                    onChange={(e) => setFormData({ 
                                      ...formData, 
                                      ogk: { 
                                        ...formData.ogk, 
                                        justificationRules: {
                                          ...formData.ogk?.justificationRules,
                                          justificationFields: {
                                            ...(formData.ogk?.justificationRules?.justificationFields || {}),
                                            time: e.target.checked
                                          }
                                        }
                                      }
                                    })}
                                  />
                                }
                                label="Uhrzeit"
                                sx={{ ml: 2 }}
                              />
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={formData.ogk?.justificationRules?.justificationFields?.diagnosis || false}
                                    onChange={(e) => setFormData({ 
                                      ...formData, 
                                      ogk: { 
                                        ...formData.ogk, 
                                        justificationRules: {
                                          ...formData.ogk?.justificationRules,
                                          justificationFields: {
                                            ...(formData.ogk?.justificationRules?.justificationFields || {}),
                                            diagnosis: e.target.checked
                                          }
                                        }
                                      }
                                    })}
                                  />
                                }
                                label="Diagnose"
                                sx={{ ml: 2 }}
                              />
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={formData.ogk?.justificationRules?.justificationFields?.urgency || false}
                                    onChange={(e) => setFormData({ 
                                      ...formData, 
                                      ogk: { 
                                        ...formData.ogk, 
                                        justificationRules: {
                                          ...formData.ogk?.justificationRules,
                                          justificationFields: {
                                            ...(formData.ogk?.justificationRules?.justificationFields || {}),
                                            urgency: e.target.checked
                                          }
                                        }
                                      }
                                    })}
                                  />
                                }
                                label="Dringlichkeit"
                                sx={{ ml: 2 }}
                              />
                            </Box>
                            
                            {formData.ogk?.justificationRules?.justificationFields?.text && (
                              <>
                                <TextField
                                  fullWidth
                                  label="Mindestlänge (Zeichen)"
                                  type="number"
                                  value={formData.ogk?.justificationRules?.minLength || ''}
                                  onChange={(e) => setFormData({ 
                                    ...formData, 
                                    ogk: { 
                                      ...formData.ogk, 
                                      justificationRules: {
                                        ...(formData.ogk?.justificationRules || {}),
                                        minLength: e.target.value ? parseInt(e.target.value) : undefined
                                      }
                                    }
                                  })}
                                  sx={{ mt: 2 }}
                                />
                                <TextField
                                  fullWidth
                                  label="Maximallänge (Zeichen)"
                                  type="number"
                                  value={formData.ogk?.justificationRules?.maxLength || ''}
                                  onChange={(e) => setFormData({ 
                                    ...formData, 
                                    ogk: { 
                                      ...formData.ogk, 
                                      justificationRules: {
                                        ...(formData.ogk?.justificationRules || {}),
                                        maxLength: e.target.value ? parseInt(e.target.value) : undefined
                                      }
                                    }
                                  })}
                                  sx={{ mt: 2 }}
                                />
                              </>
                            )}
                          </>
                        )}
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Wahlarzt */}
                {(formData.billingType === 'wahlarzt' || formData.billingType === 'both') && (
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Wahlarzt
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel>Preis-Typ</InputLabel>
                        <Select
                          value={formData.wahlarzt?.priceType || 'netto'}
                          onChange={(e) => {
                            const priceType = e.target.value as 'netto' | 'brutto';
                            setFormData({ 
                              ...formData, 
                              wahlarzt: { ...formData.wahlarzt, priceType }
                            });
                          }}
                          label="Preis-Typ"
                        >
                          <MenuItem value="netto">Netto</MenuItem>
                          <MenuItem value="brutto">Brutto</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        fullWidth
                        label={`Preis (${formData.wahlarzt?.priceType === 'brutto' ? 'Brutto' : 'Netto'}) in Euro`}
                        type="number"
                        inputProps={{ step: "0.01" }}
                        value={formData.wahlarzt?.price !== undefined && formData.wahlarzt?.price !== null && formData.wahlarzt?.price !== 0
                          ? formData.wahlarzt.price
                          : ''}
                        onChange={(e) => {
                          const euroValue = parseFloat(e.target.value) || 0;
                          setFormData({ 
                            ...formData, 
                            wahlarzt: { ...formData.wahlarzt, price: euroValue }
                          });
                        }}
                        helperText={(() => {
                          if (!formData.wahlarzt?.price || formData.wahlarzt.price === 0) return '';
                          const taxRate = formData.taxRate !== null && formData.taxRate !== undefined ? formData.taxRate : 20;
                          if (formData.wahlarzt.priceType === 'netto') {
                            const brutto = formData.wahlarzt.price * (1 + taxRate / 100);
                            return `Brutto: ${brutto.toFixed(2)} € (inkl. ${taxRate}% USt)`;
                          } else {
                            const netto = formData.wahlarzt.price / (1 + taxRate / 100);
                            return `Netto: ${netto.toFixed(2)} € (exkl. ${taxRate}% USt)`;
                          }
                        })()}
                      />
                      <TextField
                        fullWidth
                        label="Erstattungssatz (%)"
                        type="number"
                        value={formData.wahlarzt?.reimbursementRate || 80}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          wahlarzt: { ...formData.wahlarzt, reimbursementRate: parseInt(e.target.value) || 80 }
                        })}
                      />
                      <TextField
                        fullWidth
                        label="Max. Erstattung (Euro)"
                        type="number"
                        inputProps={{ step: "0.01" }}
                        value={formData.wahlarzt?.maxReimbursement !== undefined && formData.wahlarzt?.maxReimbursement !== null && formData.wahlarzt?.maxReimbursement !== 0
                          ? formData.wahlarzt.maxReimbursement
                          : ''}
                        onChange={(e) => {
                          const euroValue = parseFloat(e.target.value) || 0;
                          setFormData({ 
                            ...formData, 
                            wahlarzt: { ...formData.wahlarzt, maxReimbursement: euroValue }
                          });
                        }}
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.wahlarzt?.requiresPreApproval || false}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              wahlarzt: { ...formData.wahlarzt, requiresPreApproval: e.target.checked }
                            })}
                          />
                        }
                        label="Vor-Genehmigung erforderlich"
                      />
                    </Box>
                  </Box>
                )}

                {/* Privat */}
                {(formData.billingType === 'privat' || formData.billingType === 'both') && (
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Privatärztlich
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel>Preis-Typ</InputLabel>
                        <Select
                          value={formData.private?.priceType || 'netto'}
                          onChange={(e) => {
                            const priceType = e.target.value as 'netto' | 'brutto';
                            setFormData({ 
                              ...formData, 
                              private: { ...formData.private, priceType }
                            });
                          }}
                          label="Preis-Typ"
                        >
                          <MenuItem value="netto">Netto</MenuItem>
                          <MenuItem value="brutto">Brutto</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        fullWidth
                        label={`Preis (${formData.private?.priceType === 'brutto' ? 'Brutto' : 'Netto'}) in Euro`}
                        type="number"
                        inputProps={{ step: "0.01" }}
                        value={formData.private?.price !== undefined && formData.private?.price !== null && formData.private?.price !== 0
                          ? formData.private.price
                          : ''}
                        onChange={(e) => {
                          const euroValue = parseFloat(e.target.value) || 0;
                          setFormData({ 
                            ...formData, 
                            private: { ...formData.private, price: euroValue }
                          });
                        }}
                        helperText={(() => {
                          if (!formData.private?.price || formData.private.price === 0) return '';
                          const taxRate = formData.taxRate !== null && formData.taxRate !== undefined ? formData.taxRate : 20;
                          if (formData.private.priceType === 'netto') {
                            const brutto = formData.private.price * (1 + taxRate / 100);
                            return `Brutto: ${brutto.toFixed(2)} € (inkl. ${taxRate}% USt)`;
                          } else {
                            const netto = formData.private.price / (1 + taxRate / 100);
                            return `Netto: ${netto.toFixed(2)} € (exkl. ${taxRate}% USt)`;
                          }
                        })()}
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.private?.noInsurance || false}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              private: { ...formData.private, noInsurance: e.target.checked }
                            })}
                          />
                        }
                        label="Keine Versicherung"
                      />
                    </Box>
                  </Box>
                )}

                {/* Umsatzsteuer */}
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Umsatzsteuer (USt)
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                    <TextField
                      fullWidth
                      label="Umsatzsteuer (%)"
                      type="number"
                      inputProps={{ min: 0, max: 100, step: "0.1" }}
                      value={formData.taxRate !== null && formData.taxRate !== undefined ? formData.taxRate : ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseFloat(e.target.value);
                        setFormData({ 
                          ...formData, 
                          taxRate: value
                        });
                      }}
                      helperText={formData.taxRate === null || formData.taxRate === undefined 
                        ? "Leer lassen für automatische Logik: Kassenarzt = 0%, Wahlarzt/Privat = 20%"
                        : "Explizite Umsatzsteuer für diese Leistung"}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {formData.taxRate === null || formData.taxRate === undefined 
                          ? "Automatisch: Kassenarzt = 0%, Wahlarzt/Privat = 20%"
                          : `Festgelegt: ${formData.taxRate}%`}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Selbstbehalt */}
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Selbstbehalt
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.copay?.applicable ?? true}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            copay: { ...formData.copay, applicable: e.target.checked }
                          })}
                        />
                      }
                      label="Selbstbehalt anwendbar"
                    />
                    <TextField
                      fullWidth
                      label="Selbstbehalt (Euro)"
                      type="number"
                      inputProps={{ step: "0.01" }}
                      value={formData.copay?.amount !== undefined && formData.copay?.amount !== null && formData.copay?.amount !== 0
                        ? formData.copay.amount // ALLE PREISE SIND BEREITS IN EURO!
                        : ''}
                      onChange={(e) => {
                        const euroValue = parseFloat(e.target.value) || 0;
                        setFormData({ 
                          ...formData, 
                          copay: { ...formData.copay, amount: euroValue }
                        });
                      }}
                      disabled={!formData.copay?.applicable}
                    />
                    <TextField
                      fullWidth
                      label="Selbstbehalt-Satz (%)"
                      type="number"
                      value={formData.copay?.percentage || 10}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        copay: { ...formData.copay, percentage: parseInt(e.target.value) || 10 }
                      })}
                      disabled={!formData.copay?.applicable}
                    />
                    <TextField
                      fullWidth
                      label="Max. Selbstbehalt (Euro)"
                      type="number"
                      inputProps={{ step: "0.01" }}
                      value={formData.copay?.maxAmount !== undefined && formData.copay?.maxAmount !== null && formData.copay?.maxAmount !== 0
                        ? (formData.copay.maxAmount > 1000 ? formData.copay.maxAmount / 100 : formData.copay.maxAmount)
                        : ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        copay: { ...formData.copay, maxAmount: parseFloat(e.target.value) || 0 }
                      })}
                      disabled={!formData.copay?.applicable}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.copay?.exempt || false}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            copay: { ...formData.copay, exempt: e.target.checked }
                          })}
                        />
                      }
                      label="Selbstbehalt-befreit"
                      disabled={!formData.copay?.applicable}
                    />
                  </Box>
                </Box>

                {/* Kostenstruktur (für BI-Dashboard) */}
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Kostenstruktur (für BI-Dashboard)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Diese Werte werden für die Profitabilitäts-Berechnung im BI-Dashboard verwendet.
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                    <TextField
                      fullWidth
                      label="Materialkosten (Euro)"
                      type="number"
                      inputProps={{ step: "0.01" }}
                      value={formData.costs?.materialCosts && formData.costs.materialCosts !== 0 ? formData.costs.materialCosts : ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        costs: { 
                          ...formData.costs, 
                          materialCosts: parseFloat(e.target.value) || 0 
                        } 
                      })}
                    />
                    <TextField
                      fullWidth
                      label="Gerätekosten (Euro)"
                      type="number"
                      inputProps={{ step: "0.01" }}
                      value={formData.costs?.equipmentCosts && formData.costs.equipmentCosts !== 0 ? formData.costs.equipmentCosts : ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        costs: { 
                          ...formData.costs, 
                          equipmentCosts: parseFloat(e.target.value) || 0 
                        } 
                      })}
                    />
                    <TextField
                      fullWidth
                      label="Variable Kosten (Euro)"
                      type="number"
                      inputProps={{ step: "0.01" }}
                      value={formData.costs?.variableCosts && formData.costs.variableCosts !== 0 ? formData.costs.variableCosts : ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        costs: { 
                          ...formData.costs, 
                          variableCosts: parseFloat(e.target.value) || 0 
                        } 
                      })}
                    />
                    <TextField
                      fullWidth
                      label="Fixkostenanteil (Euro)"
                      type="number"
                      inputProps={{ step: "0.01" }}
                      value={formData.costs?.fixedCosts && formData.costs.fixedCosts !== 0 ? formData.costs.fixedCosts : ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        costs: { 
                          ...formData.costs, 
                          fixedCosts: parseFloat(e.target.value) || 0 
                        } 
                      })}
                    />
                  </Box>
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="info.contrastText">
                      <strong>Gesamtkosten:</strong> {(
                        (formData.costs?.materialCosts || 0) +
                        (formData.costs?.equipmentCosts || 0) +
                        (formData.costs?.variableCosts || 0) +
                        (formData.costs?.fixedCosts || 0)
                      ).toFixed(2)} €
                    </Typography>
                  </Box>
                </Box>

                {/* Zusätzliche Felder */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Abrechnungscode"
                    value={formData.billing_code}
                    onChange={(e) => setFormData({ ...formData, billing_code: e.target.value })}
                  />
                  <TextField
                    fullWidth
                    label="Mindestalter (Jahre)"
                    type="number"
                    value={formData.min_age_years || ''}
                    onChange={(e) => setFormData({ ...formData, min_age_years: e.target.value ? parseInt(e.target.value) : undefined })}
                  />
                  <TextField
                    fullWidth
                    label="Höchstalter (Jahre)"
                    type="number"
                    value={formData.max_age_years || ''}
                    onChange={(e) => setFormData({ ...formData, max_age_years: e.target.value ? parseInt(e.target.value) : undefined })}
                  />
                  <TextField
                    fullWidth
                    label="Parallelgruppe"
                    value={formData.parallel_group}
                    onChange={(e) => setFormData({ ...formData, parallel_group: e.target.value })}
                  />
                </Box>
              </Box>
            )}

            {/* Tab 5: Geräte & Räume */}
            {activeTab === 4 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Geräte-Zuweisung
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.requires_device_selection}
                        onChange={(e) => setFormData({ ...formData, requires_device_selection: e.target.checked })}
                      />
                    }
                    label="Geräte-Auswahl erforderlich"
                  />
                  {formData.requires_device_selection && (
                    <>
                      <TextField
                        label="Anzahl erforderlicher Geräte"
                        type="number"
                        value={formData.device_quantity_required}
                        onChange={(e) => setFormData({ ...formData, device_quantity_required: parseInt(e.target.value) || 1 })}
                        inputProps={{ min: 1 }}
                        sx={{ mt: 2, mb: 2, maxWidth: 300 }}
                      />
                      
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Standort für Geräte</InputLabel>
                        <Select
                          value={selectedDeviceLocation}
                          onChange={(e) => setSelectedDeviceLocation(e.target.value)}
                          label="Standort für Geräte"
                        >
                          <MenuItem value="">Alle Standorte</MenuItem>
                          {locations.map((location) => (
                            <MenuItem key={location._id} value={location._id}>
                              {location.name} ({location.code})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <Autocomplete
                        multiple
                        options={getFilteredDevices()}
                        getOptionLabel={(option) => `${option.name} (${option.type})`}
                        value={getFilteredDevices().filter(device => formData.assigned_devices?.some(ad => (typeof ad === 'string' ? ad : ad._id) === device._id)) || []}
                        onChange={(event, newValue) => {
                          setFormData({
                            ...formData,
                            assigned_devices: newValue
                          });
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Zugewiesene Geräte"
                            placeholder="Geräte auswählen..."
                            fullWidth
                          />
                        )}
                      />
                    </>
                  )}
                </Box>

                <Divider />

                <Box>
                  <Typography variant="h6" gutterBottom>
                    Raum-Zuweisung
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.requires_room_selection}
                        onChange={(e) => setFormData({ ...formData, requires_room_selection: e.target.checked })}
                      />
                    }
                    label="Raum-Auswahl erforderlich"
                  />
                  {formData.requires_room_selection && (
                    <>
                      <TextField
                        label="Anzahl erforderlicher Räume"
                        type="number"
                        value={formData.room_quantity_required}
                        onChange={(e) => setFormData({ ...formData, room_quantity_required: parseInt(e.target.value) || 1 })}
                        inputProps={{ min: 1 }}
                        sx={{ mt: 2, mb: 2, maxWidth: 300 }}
                      />
                      
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Standort für Räume</InputLabel>
                        <Select
                          value={selectedRoomLocation}
                          onChange={(e) => setSelectedRoomLocation(e.target.value)}
                          label="Standort für Räume"
                        >
                          <MenuItem value="">Alle Standorte</MenuItem>
                          {locations.map((location) => (
                            <MenuItem key={location._id} value={location._id}>
                              {location.name} ({location.code})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <Autocomplete
                        multiple
                        options={getFilteredRooms()}
                        getOptionLabel={(option) => `${option.name} (${option.number})`}
                        value={getFilteredRooms().filter(room => formData.assigned_rooms?.some(ar => (typeof ar === 'string' ? ar : ar._id) === room._id)) || []}
                        onChange={(event, newValue) => {
                          setFormData({
                            ...formData,
                            assigned_rooms: newValue
                          });
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Zugewiesene Räume"
                            placeholder="Räume auswählen..."
                            fullWidth
                          />
                        )}
                      />
                    </>
                  )}
                </Box>
              </Box>
            )}

            {/* Tab 6: Update-Status */}
            {activeTab === 5 && (
              <ServiceCatalogUpdateStatus />
            )}

            {/* Tab 7: Online-Kontingente */}
            {activeTab === 6 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Reservieren Sie bestimmte Zeitslots für Online-Buchungen dieses Services (z.B. "Blutabnahmen nur 08:00-12:00").
                </Typography>
                
                {(formData.online_contingents || []).map((contingent, index) => (
                  <Card key={index} sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1">Kontingent {index + 1}</Typography>
                      <IconButton
                        size="small"
                        onClick={() => {
                          const newContingents = [...(formData.online_contingents || [])];
                          newContingents.splice(index, 1);
                          setFormData({ ...formData, online_contingents: newContingents });
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Startzeit"
                          type="time"
                          value={contingent.timeWindow.start}
                          onChange={(e) => {
                            const newContingents = [...(formData.online_contingents || [])];
                            newContingents[index].timeWindow.start = e.target.value;
                            setFormData({ ...formData, online_contingents: newContingents });
                          }}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Endzeit"
                          type="time"
                          value={contingent.timeWindow.end}
                          onChange={(e) => {
                            const newContingents = [...(formData.online_contingents || [])];
                            newContingents[index].timeWindow.end = e.target.value;
                            setFormData({ ...formData, online_contingents: newContingents });
                          }}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <FormControl fullWidth>
                          <InputLabel>Wochentage</InputLabel>
                          <Select
                            multiple
                            value={contingent.daysOfWeek}
                            onChange={(e) => {
                              const newContingents = [...(formData.online_contingents || [])];
                              newContingents[index].daysOfWeek = e.target.value as number[];
                              setFormData({ ...formData, online_contingents: newContingents });
                            }}
                            renderValue={(selected) => {
                              const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                              return (selected as number[]).map(d => dayNames[d]).join(', ');
                            }}
                          >
                            {[
                              { value: 0, label: 'Sonntag' },
                              { value: 1, label: 'Montag' },
                              { value: 2, label: 'Dienstag' },
                              { value: 3, label: 'Mittwoch' },
                              { value: 4, label: 'Donnerstag' },
                              { value: 5, label: 'Freitag' },
                              { value: 6, label: 'Samstag' }
                            ].map(day => (
                              <MenuItem key={day.value} value={day.value}>
                                <Checkbox checked={contingent.daysOfWeek.indexOf(day.value) > -1} />
                                <ListItemText primary={day.label} />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Max. Online-Buchungen"
                          type="number"
                          value={contingent.maxOnlineBookings}
                          onChange={(e) => {
                            const newContingents = [...(formData.online_contingents || [])];
                            newContingents[index].maxOnlineBookings = parseInt(e.target.value) || 0;
                            setFormData({ ...formData, online_contingents: newContingents });
                          }}
                          helperText="0 = unbegrenzt"
                          inputProps={{ min: 0 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Priorität"
                          type="number"
                          value={contingent.priority}
                          onChange={(e) => {
                            const newContingents = [...(formData.online_contingents || [])];
                            newContingents[index].priority = parseInt(e.target.value) || 0;
                            setFormData({ ...formData, online_contingents: newContingents });
                          }}
                          helperText="Höhere Priorität = wird zuerst belegt"
                          inputProps={{ min: 0 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Beschreibung"
                          value={contingent.description}
                          onChange={(e) => {
                            const newContingents = [...(formData.online_contingents || [])];
                            newContingents[index].description = e.target.value;
                            setFormData({ ...formData, online_contingents: newContingents });
                          }}
                          placeholder="z.B. 'Blutabnahmen nur morgens'"
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={contingent.isActive}
                              onChange={(e) => {
                                const newContingents = [...(formData.online_contingents || [])];
                                newContingents[index].isActive = e.target.checked;
                                setFormData({ ...formData, online_contingents: newContingents });
                              }}
                            />
                          }
                          label="Aktiv"
                        />
                      </Grid>
                    </Grid>
                  </Card>
                ))}
                
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setFormData({
                      ...formData,
                      online_contingents: [
                        ...(formData.online_contingents || []),
                        {
                          timeWindow: { start: '08:00', end: '12:00' },
                          daysOfWeek: [1, 2, 3, 4, 5], // Mo-Fr
                          maxOnlineBookings: 0,
                          priority: 0,
                          description: '',
                          isActive: true
                        }
                      ]
                    });
                  }}
                  sx={{ mt: 1 }}
                >
                  Kontingent hinzufügen
                </Button>
              </Box>
            )}

            {/* Tab 7: Anamnese */}
            {activeTab === 7 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Anamnese-Vorabfragen</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const newQuestions = [...(formData.anamnesisQuestions || [])];
                      newQuestions.push({
                        questionText: '',
                        questionType: 'text',
                        options: [],
                        isRequired: false,
                        defaultValue: ''
                      });
                      setFormData({ ...formData, anamnesisQuestions: newQuestions });
                    }}
                    size="small"
                  >
                    Frage hinzufügen
                  </Button>
                </Box>

                {(formData.anamnesisQuestions || []).length === 0 ? (
                  <Alert severity="info">Keine Anamnese-Fragen konfiguriert. Fügen Sie Fragen hinzu, die Patienten vor der Buchung beantworten sollen.</Alert>
                ) : (
                  (formData.anamnesisQuestions || []).map((question, index) => (
                    <Paper key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="subtitle1">Frage {index + 1}</Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const newQuestions = (formData.anamnesisQuestions || []).filter((_, i) => i !== index);
                            setFormData({ ...formData, anamnesisQuestions: newQuestions });
                          }}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            label="Fragentext *"
                            value={question.questionText}
                            onChange={(e) => {
                              const newQuestions = [...(formData.anamnesisQuestions || [])];
                              newQuestions[index].questionText = e.target.value;
                              setFormData({ ...formData, anamnesisQuestions: newQuestions });
                            }}
                            required
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Fragetyp *</InputLabel>
                            <Select
                              value={question.questionType}
                              onChange={(e) => {
                                const newQuestions = [...(formData.anamnesisQuestions || [])];
                                newQuestions[index].questionType = e.target.value;
                                // Lösche Options wenn Typ geändert wird
                                if (e.target.value !== 'select' && e.target.value !== 'multiselect') {
                                  newQuestions[index].options = [];
                                }
                                setFormData({ ...formData, anamnesisQuestions: newQuestions });
                              }}
                              label="Fragetyp *"
                            >
                              <MenuItem value="text">Text (einzeilig)</MenuItem>
                              <MenuItem value="textarea">Text (mehrzeilig)</MenuItem>
                              <MenuItem value="number">Zahl</MenuItem>
                              <MenuItem value="boolean">Ja/Nein</MenuItem>
                              <MenuItem value="select">Auswahl (einfach)</MenuItem>
                              <MenuItem value="multiselect">Auswahl (mehrfach)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={question.isRequired}
                                onChange={(e) => {
                                  const newQuestions = [...(formData.anamnesisQuestions || [])];
                                  newQuestions[index].isRequired = e.target.checked;
                                  setFormData({ ...formData, anamnesisQuestions: newQuestions });
                                }}
                              />
                            }
                            label="Pflichtfeld"
                          />
                        </Grid>
                        {(question.questionType === 'select' || question.questionType === 'multiselect') && (
                          <Grid size={{ xs: 12 }}>
                            <TextField
                              fullWidth
                              label="Optionen (durch Komma getrennt)"
                              value={question.options?.join(', ') || ''}
                              onChange={(e) => {
                                const newQuestions = [...(formData.anamnesisQuestions || [])];
                                newQuestions[index].options = e.target.value.split(',').map(o => o.trim()).filter(o => o);
                                setFormData({ ...formData, anamnesisQuestions: newQuestions });
                              }}
                              placeholder="z.B. Option 1, Option 2, Option 3"
                              helperText="Geben Sie die Auswahloptionen durch Komma getrennt ein"
                            />
                          </Grid>
                        )}
                        {question.questionType !== 'boolean' && (
                          <Grid size={{ xs: 12 }}>
                            <TextField
                              fullWidth
                              label="Standardwert (optional)"
                              value={question.defaultValue || ''}
                              onChange={(e) => {
                                const newQuestions = [...(formData.anamnesisQuestions || [])];
                                newQuestions[index].defaultValue = e.target.value;
                                setFormData({ ...formData, anamnesisQuestions: newQuestions });
                              }}
                            />
                          </Grid>
                        )}
                      </Grid>
                    </Paper>
                  ))
                )}
              </Box>
            )}

            {/* Tab 8: Einstellungen */}
            {activeTab === 8 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Gerätetyp"
                  value={formData.required_device_type}
                  onChange={(e) => setFormData({ ...formData, required_device_type: e.target.value })}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label="Aktiv"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.quick_select}
                      onChange={(e) => setFormData({ ...formData, quick_select: e.target.checked })}
                    />
                  }
                  label="⭐ Schnellauswahl (für Abrechnungs-Dashboard)"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_online_booking_enabled}
                      onChange={(e) => setFormData({ ...formData, is_online_booking_enabled: e.target.checked })}
                    />
                  }
                  label="Online-Buchung aktiviert"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requires_confirmation}
                      onChange={(e) => setFormData({ ...formData, requires_confirmation: e.target.checked })}
                    />
                  }
                  label="Bestätigung erforderlich"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requires_scheduling_confirmation}
                      onChange={(e) => setFormData({ ...formData, requires_scheduling_confirmation: e.target.checked })}
                    />
                  }
                  label="Scheduling-Bestätigung erforderlich"
                />
                <TextField
                  fullWidth
                  label="Maximale Warteliste"
                  type="number"
                  value={formData.max_waitlist}
                  onChange={(e) => setFormData({ ...formData, max_waitlist: parseInt(e.target.value) || 0 })}
                />
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                    <TextField
                      fullWidth
                      label="Color (Hex)"
                      value={formData.color_hex}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Validiere Hex-Format
                        if (value === '' || /^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                          setFormData({ ...formData, color_hex: value });
                        }
                      }}
                      placeholder="#2563EB"
                      helperText="Hex-Code (z.B. #2563EB)"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', pt: 1 }}>
                    <Box
                      component="input"
                      type="color"
                      value={formData.color_hex || '#2563EB'}
                      onChange={(e) => {
                        setFormData({ ...formData, color_hex: e.target.value.toUpperCase() });
                      }}
                      sx={{
                        width: 60,
                        height: 40,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        cursor: 'pointer',
                        padding: 0,
                        '&::-webkit-color-swatch-wrapper': {
                          padding: 0,
                        },
                        '&::-webkit-color-swatch': {
                          border: 'none',
                          borderRadius: 1,
                        },
                        '&::-moz-color-swatch': {
                          border: 'none',
                          borderRadius: 1,
                        }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      Farbe wählen
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button variant="contained" onClick={handleSave}>
            {editingService ? 'Speichern' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hilfe & Leitfaden Dialog */}
      <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <GradientDialogTitle 
          title="Hilfe & Leitfaden: Leistungskatalog"
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs value={helpTab} onChange={(_, newValue) => setHelpTab(newValue)} sx={{ mb: 3 }}>
            <Tab label="Übersicht" />
            <Tab label="Leistung erstellen" />
            <Tab label="Geräte & Räume" />
            <Tab label="Online-Buchung" />
            <Tab label="Preis & Abrechnung" />
            <Tab label="Konflikt-Regeln" />
            <Tab label="Begründungspflicht" />
            <Tab label="Tipps" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Leistungskatalog
                </Typography>
                <Typography variant="body2" paragraph>
                  Der Leistungskatalog ist das zentrale Verwaltungstool für alle medizinischen Leistungen 
                  und Services in MyMediCloud MMC. Hier können Sie Leistungen erstellen, bearbeiten, 
                  kategorisieren und konfigurieren.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Leistungen erstellen, bearbeiten und löschen</li>
                  <li>✅ Kategorisierung und Organisation</li>
                  <li>✅ Personal, Geräte und Räume zuweisen</li>
                  <li>✅ Preise und Abrechnung konfigurieren</li>
                  <li>✅ Online-Buchung aktivieren</li>
                  <li>✅ Pufferzeiten und Dauer einstellen</li>
                  <li>🆕 <strong>Konflikt-Regeln:</strong> Ausschluss-Logik für Services</li>
                  <li>🆕 <strong>Begründungspflicht:</strong> Dynamische Pflichtfelder für Abrechnung</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Tabs im Leistungsformular
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Grunddaten:</strong> Code, Name, Beschreibung, Kategorie</li>
                  <li><strong>Personal:</strong> Zugewiesene Benutzer, Rollen</li>
                  <li><strong>Geräte:</strong> Gerätezuweisung, Typ-basierte Auswahl</li>
                  <li><strong>Räume:</strong> Raumzuweisung, Typ-basierte Auswahl</li>
                  <li><strong>Zeit & Dauer:</strong> Grunddauer, Pufferzeiten</li>
                  <li><strong>Preis & Abrechnung:</strong> Preise, Abrechnungscodes, ÖGK-Konfiguration</li>
                  <li><strong>Online-Buchung:</strong> Online-Buchbarkeit, Kontingente</li>
                  <li><strong>Patienteneignung:</strong> Altersgrenzen, Einverständnis</li>
                  <li><strong>Konflikt-Regeln:</strong> Ausschluss-Logik für Services (NEU)</li>
                  <li><strong>Begründungspflicht:</strong> Pflichtfelder für Abrechnung (NEU)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Neue Features
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>🆕 <strong>Konflikt-Erkennung:</strong> Verhindert Abrechnung konfligierender Services am selben Tag</li>
                  <li>🆕 <strong>Begründungspflicht:</strong> Dynamische Pflichtfelder in Rechnungserstellung</li>
                  <li>🆕 <strong>Service-Code-Mapping:</strong> Automatische Code-Konvertierung für verschiedene Versicherungsträger</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Leistung erstellen
                </Typography>
                <Typography variant="body2" paragraph>
                  So erstellen Sie eine neue Leistung:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 1: Grunddaten
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf <strong>"Neue Leistung"</strong></li>
                  <li>Geben Sie einen <strong>Code</strong> ein (z.B. "K001")</li>
                  <li>Geben Sie einen <strong>Namen</strong> ein (z.B. "Konsultation")</li>
                  <li>Wählen Sie eine <strong>Kategorie</strong> aus</li>
                  <li>Wählen Sie einen <strong>Standort</strong> aus</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 2: Personal zuweisen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wechseln Sie zum Tab <strong>"Personal"</strong></li>
                  <li>Wählen Sie <strong>zugewiesene Benutzer</strong> aus</li>
                  <li>Aktivieren Sie <strong>"Benutzer-Auswahl erforderlich"</strong> (optional)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 3: Geräte/Räume zuweisen
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wechseln Sie zum Tab <strong>"Geräte"</strong> oder <strong>"Räume"</strong></li>
                  <li>Wählen Sie <strong>Auswahlmodus</strong>:
                    <ul>
                      <li><strong>Spezifisch:</strong> Konkrete Geräte/Räume zuweisen</li>
                      <li><strong>Typ:</strong> Nach Geräte-/Raumtyp (automatische Verfügbarkeitsprüfung)</li>
                    </ul>
                  </li>
                  <li>Geben Sie die <strong>Anzahl benötigter Geräte/Räume</strong> ein</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 4: Zeit & Dauer
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wechseln Sie zum Tab <strong>"Zeit & Dauer"</strong></li>
                  <li>Geben Sie die <strong>Grunddauer</strong> in Minuten ein (z.B. 30)</li>
                  <li>Geben Sie <strong>Puffer Vorher</strong> ein (z.B. 5 Minuten)</li>
                  <li>Geben Sie <strong>Puffer Nachher</strong> ein (z.B. 10 Minuten)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt 5: Speichern
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf <strong>"Speichern"</strong></li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Geräte & Räume
                </Typography>
                <Typography variant="body2" paragraph>
                  Es gibt zwei Möglichkeiten, Geräte und Räume zuzuweisen:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Spezifische Auswahl
                </Typography>
                <Typography variant="body2" paragraph>
                  Weisen Sie konkrete Geräte oder Räume zu. Diese müssen bei der Terminbuchung 
                  explizit ausgewählt werden.
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Wählen Sie <strong>"Spezifisch"</strong> als Auswahlmodus</li>
                  <li>Wählen Sie konkrete Geräte/Räume aus der Liste</li>
                  <li>Das System prüft, ob diese spezifischen Geräte/Räume verfügbar sind</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Typ-basierte Auswahl
                </Typography>
                <Typography variant="body2" paragraph>
                  Geben Sie einen Geräte- oder Raumtyp an. Das System prüft automatisch, ob 
                  genügend Geräte/Räume dieses Typs verfügbar sind.
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Wählen Sie <strong>"Typ"</strong> als Auswahlmodus</li>
                  <li>Geben Sie den <strong>Gerätetyp</strong> oder <strong>Raumtyp</strong> ein</li>
                  <li>Geben Sie die <strong>Anzahl benötigter Geräte/Räume</strong> ein</li>
                  <li>Das System zählt automatisch alle verfügbaren Geräte/Räume dieses Typs</li>
                </Box>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Beispiel:</strong> Service "Ultraschall" benötigt 1 Gerät vom Typ "Ultraschall". 
                    Wenn 3 Ultraschall-Geräte vorhanden sind und alle belegt sind, kann der Service nicht gebucht werden.
                  </Typography>
                </Alert>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Kategorien für Typ-basierte Auswahl
                </Typography>
                <Typography variant="body2" paragraph>
                  Bei Ressourcen (Geräte/Räume) wird die <strong>Kategorie</strong> für die Typ-basierte 
                  Auswahl verwendet:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Gerät: Kategorie muss mit <strong>Gerätetyp</strong> im Service übereinstimmen</li>
                  <li>Raum: Kategorie muss mit <strong>Raumtyp</strong> im Service übereinstimmen</li>
                  <li>Beispiel: Ressource mit Kategorie "Laser" → Service mit Gerätetyp "Laser"</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Online-Buchung
                </Typography>
                <Typography variant="body2" paragraph>
                  Aktivieren Sie die Online-Buchung, damit Patienten Termine online buchen können.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Online-Buchung aktivieren
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wechseln Sie zum Tab <strong>"Online-Buchung"</strong></li>
                  <li>Aktivieren Sie <strong>"Online buchbar"</strong></li>
                  <li>Optional: Aktivieren Sie <strong>"Bestätigung erforderlich"</strong></li>
                  <li>Optional: Aktivieren Sie <strong>"Terminbestätigung erforderlich"</strong></li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Online-Kontingente
                </Typography>
                <Typography variant="body2" paragraph>
                  Begrenzen Sie die Anzahl der Online-Buchungen für bestimmte Zeitfenster:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Zeitfenster:</strong> Start- und Endzeit (z.B. 09:00 - 12:00)</li>
                  <li><strong>Wochentage:</strong> An welchen Tagen gilt das Kontingent?</li>
                  <li><strong>Max. Online-Buchungen:</strong> Maximale Anzahl pro Tag</li>
                  <li><strong>Priorität:</strong> Priorität des Kontingents</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Anamnese-Fragen
                </Typography>
                <Typography variant="body2" paragraph>
                  Definieren Sie Fragen, die Patienten bei der Online-Buchung beantworten müssen:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Fragentypen:</strong> Text, Textarea, Number, Boolean, Select, Multiselect</li>
                  <li><strong>Erforderlich:</strong> Muss die Frage beantwortet werden?</li>
                  <li><strong>Optionen:</strong> Verfügbare Optionen (bei Select/Multiselect)</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Preis & Abrechnung
                </Typography>
                <Typography variant="body2" paragraph>
                  Konfigurieren Sie Preise und Abrechnungscodes für die Leistung.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Grundpreis
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Preis (€):</strong> Grundpreis der Leistung in Euro</li>
                  <li><strong>Abrechnungscode:</strong> Code für die Abrechnung</li>
                  <li><strong>Abrechnungstyp:</strong> Kassenarzt, Wahlarzt, Privat oder Beides</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  ÖGK-Abrechnung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>KHO-Code:</strong> Kassenhonorarordnung-Code für ÖGK-Abrechnung (Österreich)</li>
                  <li><strong>KHO-Preis:</strong> Preis für ÖGK-Abrechnung in Euro</li>
                  <li><strong>Versicherungsträger:</strong> ÖGK, BVAEB, SVS, KFA, PVA, VAEB, AUVA oder Alle</li>
                  <li><strong>Bundesland:</strong> Bundesland-spezifische Abrechnung (optional)</li>
                  <li><strong>Genehmigung erforderlich:</strong> Muss die Abrechnung genehmigt werden?</li>
                  <li><strong>Abrechnungshäufigkeit:</strong> Einmalig oder periodisch</li>
                </Box>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Hinweis:</strong> Für automatische Code-Konvertierung zwischen Versicherungsträgern 
                    verwenden Sie die <strong>Service-Code-Mapping-Verwaltung</strong> (Einstellungen → Leistungen → Service-Code-Mapping).
                  </Typography>
                </Alert>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Wahlarzt-Abrechnung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Preis:</strong> Wahlarzt-Preis</li>
                  <li><strong>Erstattungssatz:</strong> Prozentsatz der Erstattung (z.B. 80%)</li>
                  <li><strong>Max. Erstattung:</strong> Maximale Erstattung</li>
                  <li><strong>Vorabgenehmigung erforderlich:</strong> Muss vorab genehmigt werden?</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Privat-Abrechnung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Preis:</strong> Privat-Preis</li>
                  <li><strong>Keine Versicherung:</strong> Gilt für Patienten ohne Versicherung</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 5 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Konflikt-Regeln
                </Typography>
                <Typography variant="body2" paragraph>
                  Konflikt-Regeln verhindern, dass bestimmte Services am selben Tag abgerechnet werden können.
                  Dies ist wichtig für die korrekte Abrechnung bei Versicherungsträgern.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Konflikt-Regeln konfigurieren
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wechseln Sie zum Tab <strong>"Preis & Abrechnung"</strong></li>
                  <li>Scrollen Sie zu <strong>"Konflikt-Regeln"</strong></li>
                  <li>Aktivieren Sie <strong>"Überschreibung erlauben"</strong> (optional):
                    <ul>
                      <li>Wenn aktiviert: Arzt kann Konflikt überschreiben</li>
                      <li>Wenn deaktiviert: Konflikt führt zu Fehler</li>
                    </ul>
                  </li>
                  <li>Aktivieren Sie <strong>"Begründung bei Überschreibung erforderlich"</strong> (optional):
                    <ul>
                      <li>Wenn aktiviert: Bei Überschreibung muss Begründung eingegeben werden</li>
                    </ul>
                  </li>
                  <li>Geben Sie <strong>Konflikt-Service-Codes</strong> ein:
                    <ul>
                      <li>Komma-getrennte Liste (z.B. "HB1,TELE")</li>
                      <li>Diese Services können nicht gleichzeitig abgerechnet werden</li>
                    </ul>
                  </li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Beispiel: Ordination und Hausbesuch
                </Typography>
                <Typography variant="body2" paragraph>
                  Wenn "Ordination" (Code: ORD1) und "Hausbesuch" (Code: HB1) nicht am selben Tag 
                  abgerechnet werden sollen:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Service "Ordination" bearbeiten</li>
                  <li>Konflikt-Regeln: "HB1" eingeben</li>
                  <li>Service "Hausbesuch" bearbeiten</li>
                  <li>Konflikt-Regeln: "ORD1" eingeben</li>
                </Box>
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Wichtig:</strong> Konflikte müssen in beide Richtungen definiert werden 
                    (Service A → Service B und Service B → Service A).
                  </Typography>
                </Alert>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Überschreibung mit Begründung
                </Typography>
                <Typography variant="body2" paragraph>
                  Wenn Überschreibung erlaubt ist, kann der Arzt den Konflikt überschreiben:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Bei der Rechnungserstellung wird eine Warnung angezeigt</li>
                  <li>Wenn "Begründung erforderlich" aktiviert ist, muss eine Begründung eingegeben werden</li>
                  <li>Die Begründung wird in der Rechnung gespeichert</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 6 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Begründungspflicht
                </Typography>
                <Typography variant="body2" paragraph>
                  Begründungspflicht-Regeln definieren, welche Felder bei der Rechnungserstellung 
                  ausgefüllt werden müssen. Diese Felder erscheinen automatisch in der Rechnungserstellung.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Begründungspflicht aktivieren
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wechseln Sie zum Tab <strong>"Preis & Abrechnung"</strong></li>
                  <li>Scrollen Sie zu <strong>"Begründungspflicht-Regeln"</strong></li>
                  <li>Aktivieren Sie <strong>"Begründungspflicht aktivieren"</strong></li>
                  <li>Wählen Sie den <strong>Begründungstyp</strong>:
                    <ul>
                      <li><strong>Text:</strong> Textfeld für Begründung</li>
                      <li><strong>Uhrzeit:</strong> Uhrzeit-Feld</li>
                      <li><strong>Diagnose:</strong> Diagnose erforderlich</li>
                      <li><strong>Kombination:</strong> Mehrere Felder</li>
                    </ul>
                  </li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Begründungsfelder konfigurieren
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Text:</strong> Textfeld für Begründung (Pflicht, wenn aktiviert)
                    <ul>
                      <li>Mindestlänge: Minimale Zeichenanzahl (optional)</li>
                      <li>Maximallänge: Maximale Zeichenanzahl (optional)</li>
                    </ul>
                  </li>
                  <li><strong>Uhrzeit:</strong> Uhrzeit-Feld (Pflicht, wenn aktiviert)</li>
                  <li><strong>Diagnose:</strong> Diagnose muss in Rechnung vorhanden sein (Pflicht, wenn aktiviert)</li>
                  <li><strong>Dringlichkeit:</strong> Dringlichkeitsstufe (Niedrig, Mittel, Hoch, Dringend)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Beispiel: Dringlichkeitsleistung
                </Typography>
                <Typography variant="body2" paragraph>
                  Für eine Dringlichkeitsleistung müssen Text, Uhrzeit und Dringlichkeit angegeben werden:
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Begründungspflicht aktivieren</li>
                  <li>Begründungstyp: <strong>"Kombination"</strong></li>
                  <li>Begründungsfelder aktivieren:
                    <ul>
                      <li>✅ Text</li>
                      <li>✅ Uhrzeit</li>
                      <li>✅ Dringlichkeit</li>
                    </ul>
                  </li>
                  <li>Mindestlänge für Text: z.B. 10 Zeichen</li>
                </Box>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>In der Rechnungserstellung:</strong> Wenn dieser Service hinzugefügt wird, 
                    erscheinen automatisch die konfigurierten Begründungsfelder unter der Service-Zeile.
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
                  <li>Begründungsfelder werden in der Rechnung gespeichert</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 7 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Tipps & Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Konsistente Codierung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Verwenden Sie ein einheitliches Codierungssystem (z.B. "K001", "K002")</li>
                  <li>✅ Verwenden Sie aussagekräftige Codes</li>
                  <li>✅ Dokumentieren Sie Ihre Codierung</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Kategorien nutzen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Ordnen Sie Leistungen in Kategorien ein</li>
                  <li>✅ Verwenden Sie hierarchische Kategorien (Haupt- und Unterkategorien)</li>
                  <li>✅ Nutzen Sie Farben zur visuellen Unterscheidung</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Pufferzeiten realistisch setzen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Berücksichtigen Sie Vorbereitungszeiten</li>
                  <li>✅ Berücksichtigen Sie Nachbereitungszeiten</li>
                  <li>✅ Testen Sie die Pufferzeiten in der Praxis</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Typ-basierte Auswahl
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Verwenden Sie Typ-basierte Auswahl für flexible Geräte/Räume</li>
                  <li>✅ Verwenden Sie konsistente Kategorienamen</li>
                  <li>✅ Dokumentieren Sie Ihre Kategorien</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Online-Buchung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Aktivieren Sie Online-Buchung gezielt</li>
                  <li>✅ Verwenden Sie Online-Kontingente für beliebte Zeiten</li>
                  <li>✅ Prüfen Sie regelmäßig die Online-Buchungen</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Konflikt-Regeln
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Definieren Sie Konflikte für alle Services, die nicht gleichzeitig abgerechnet werden können</li>
                  <li>✅ Verwenden Sie konsistente Service-Codes</li>
                  <li>✅ Aktivieren Sie "Begründung bei Überschreibung" für Nachvollziehbarkeit</li>
                  <li>✅ Testen Sie Konflikte in der Rechnungserstellung</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Begründungspflicht
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Aktivieren Sie Begründungspflicht für Services, die eine Begründung erfordern</li>
                  <li>✅ Setzen Sie realistische Mindestlängen für Textfelder</li>
                  <li>✅ Verwenden Sie "Kombination" für komplexe Begründungen</li>
                  <li>✅ Testen Sie die Begründungsfelder in der Rechnungserstellung</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Service-Code-Mapping
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Erstellen Sie Mappings für alle wichtigen Services</li>
                  <li>✅ Verwenden Sie die automatische Erstellung aus ServiceCatalog</li>
                  <li>✅ Prüfen Sie regelmäßig die Gültigkeitsdaten der Mappings</li>
                  <li>✅ Aktualisieren Sie Mappings bei Änderungen der Versicherungsträger-Codes</li>
                </Box>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Hinweis:</strong> Service-Code-Mapping finden Sie unter 
                    <strong> Einstellungen → Leistungen → Service-Code-Mapping</strong>
                  </Typography>
                </Alert>
              </Box>

              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Tipp:</strong> Verwenden Sie Filter, um schnell bestimmte Leistungen zu finden. 
                  Exportieren Sie regelmäßig für Backup.
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

// ServiceCatalog Update-Status Komponente
const ServiceCatalogUpdateStatus: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [updateStatus, setUpdateStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    loadUpdateStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUpdateStatus = async () => {
    setLoading(true);
    try {
      const response = await api.get<any>('/service-catalog/update-status');
      if (response.success && response.data) {
        setUpdateStatus(response.data);
      } else if (response.data) {
        setUpdateStatus(response.data);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden des Update-Status', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerUpdate = async () => {
    if (!window.confirm('Möchten Sie wirklich ein manuelles Update starten?')) {
      return;
    }
    
    setTriggering(true);
    try {
      const response = await api.post<any>('/service-catalog/trigger-update');
      if (response.success) {
        enqueueSnackbar('Update wurde gestartet', { variant: 'success' });
        setTimeout(() => loadUpdateStatus(), 2000);
      }
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Fehler beim Starten des Updates', { variant: 'error' });
    } finally {
      setTriggering(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'pending': return 'warning';
      case 'never': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success': return 'Aktuell';
      case 'pending': return 'Ausstehend';
      case 'never': return 'Nie aktualisiert';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!updateStatus) {
    return (
      <Alert severity="info">Keine Update-Informationen verfügbar</Alert>
    );
  }

  const statusData = updateStatus.data || updateStatus;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Update-Status</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadUpdateStatus}
                size="small"
              >
                Aktualisieren
              </Button>
              <Button
                variant="contained"
                startIcon={<SettingsIcon />}
                onClick={handleTriggerUpdate}
                disabled={triggering}
                size="small"
              >
                {triggering ? 'Wird gestartet...' : 'Manuelles Update starten'}
              </Button>
            </Box>
          </Box>
          
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip
                  label={getStatusLabel(statusData.status)}
                  color={getStatusColor(statusData.status) as any}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">Letztes Update</Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {statusData.lastUpdate
                    ? format(new Date(statusData.lastUpdate), 'dd.MM.yyyy HH:mm')
                    : 'Nie'}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">Nächstes Update</Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {statusData.nextUpdate
                    ? format(new Date(statusData.nextUpdate), 'dd.MM.yyyy')
                    : 'N/A'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {statusData.statistics && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Statistiken</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="primary.contrastText">
                    {statusData.statistics.totalServices || 0}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    Gesamt Services
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="success.contrastText">
                    {statusData.statistics.activeServices || 0}
                  </Typography>
                  <Typography variant="body2" color="success.contrastText">
                    Aktive Services
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="info.contrastText">
                    {statusData.statistics.newServicesThisYear || 0}
                  </Typography>
                  <Typography variant="body2" color="info.contrastText">
                    Neue (dieses Jahr)
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="warning.contrastText">
                    {statusData.statistics.priceAdjustmentsThisYear || 0}
                  </Typography>
                  <Typography variant="body2" color="warning.contrastText">
                    Preisänderungen
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ServiceCatalogPage;
