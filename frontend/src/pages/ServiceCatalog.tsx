import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import GradientDialogTitle from '../components/GradientDialogTitle';
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
  TablePagination,
  Snackbar,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Autocomplete,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  People as PeopleIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Devices as DevicesIcon,
  Room as RoomIcon,
  AccessTime as AccessTimeIcon,
  AttachMoney as AttachMoneyIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';

// Interface-Definitionen
interface Location {
  _id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
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
  price_cents?: number;
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
    ebmCode?: string;
    ebmPrice?: number;
    requiresApproval?: boolean;
    billingFrequency?: 'once' | 'periodic';
  };
  wahlarzt?: {
    price?: number;
    reimbursementRate?: number;
    maxReimbursement?: number;
    requiresPreApproval?: boolean;
  };
  private?: {
    price?: number;
    noInsurance?: boolean;
  };
  copay?: {
    applicable?: boolean;
    amount?: number;
    percentage?: number;
    maxAmount?: number;
    exempt?: boolean;
  };
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Location {
  _id: string;
  name: string;
  code: string;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const ServiceCatalog: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
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
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [activeTab, setActiveTab] = useState(0);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
      category: '',
      isMedical: true,
      specialty: 'allgemeinmedizin',
      required_role: '',
    visible_to_roles: [] as string[],
    assigned_users: [] as string[],
    requires_user_selection: false,
    assigned_devices: [] as string[],
    requires_device_selection: false,
    device_quantity_required: 1,
    assigned_rooms: [] as string[],
    requires_room_selection: false,
    room_quantity_required: 1,
    base_duration_min: 30,
    buffer_before_min: 0,
    buffer_after_min: 0,
    can_overlap: false,
    parallel_group: '',
    requires_room: false,
    required_device_type: '',
    min_age_years: '',
    max_age_years: '',
    requires_consent: false,
    online_bookable: true,
    is_online_booking_enabled: true,
    requires_confirmation: false,
    requires_scheduling_confirmation: false,
    max_waitlist: 0,
    price_cents: 0,
    billing_code: '',
    notes: '',
    is_active: true,
    color_hex: '#2563EB',
    quick_select: false,
    location_id: '',
    // Abrechnungsfelder
    billingType: 'both',
    ogk: {
      ebmCode: '',
      ebmPrice: 0,
      requiresApproval: false,
      billingFrequency: 'once'
    },
    wahlarzt: {
      price: 0,
      reimbursementRate: 80,
      maxReimbursement: 0,
      requiresPreApproval: false
    },
    private: {
      price: 0,
      noInsurance: true
    },
    copay: {
      applicable: true,
      amount: 0,
      percentage: 10,
      maxAmount: 28.50,
      exempt: false
    }
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
      setSnackbar({ open: true, message: 'Fehler beim Laden der Leistungen', severity: 'error' });
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
      const response = await api.get<{data: User[]}>('/users');
      
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
  
  // Separate useEffect für initial load anderer Daten
  useEffect(() => {
    fetchLocations();
    fetchUsers();
    fetchDevices();
    fetchRooms();
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
      min_age_years: '',
      max_age_years: '',
      requires_consent: false,
      online_bookable: true,
      is_online_booking_enabled: true,
      requires_confirmation: false,
      requires_scheduling_confirmation: false,
      max_waitlist: 0,
      price_cents: 0,
      billing_code: '',
      notes: '',
      is_active: true,
      color_hex: '#2563EB',
      quick_select: false,
      location_id: '',
      // Abrechnungsfelder
      billingType: 'both',
      ogk: {
        ebmCode: '',
        ebmPrice: 0,
        requiresApproval: false,
        billingFrequency: 'once'
      },
      wahlarzt: {
        price: 0,
        reimbursementRate: 0.80,
        maxReimbursement: 0,
        requiresPreApproval: false
      },
      private: {
        price: 0,
        noInsurance: true
      },
      copay: {
        applicable: true,
        amount: 0,
        percentage: 10,
        maxAmount: 28.50,
        exempt: false
      }
    });
    
    // Standort-Auswahl zurücksetzen
    if (locations.length >= 1) {
      setSelectedDeviceLocation(locations[0]._id);
      setSelectedRoomLocation(locations[0]._id);
      // Service-Standort automatisch vorbelegen
      setFormData(prev => ({ ...prev, location_id: locations[0]._id }));
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
      assigned_users: service.assigned_users?.map(user => user._id) || [],
      requires_user_selection: service.requires_user_selection || false,
      assigned_devices: service.assigned_devices?.map(device => {
        // Handle both populated devices (with _id property) and device IDs
        if (typeof device === 'string') return device;
        return device._id || device.toString();
      }) || [],
      requires_device_selection: service.requires_device_selection || false,
      device_quantity_required: service.device_quantity_required || 1,
      assigned_rooms: service.assigned_rooms?.map(room => {
        console.log('handleEdit - processing room:', room, 'type:', typeof room);
        // Handle both populated rooms (with _id property) and room IDs
        if (typeof room === 'string') return room;
        return room._id || room.toString();
      }) || [],
      requires_room_selection: service.requires_room_selection || false,
      room_quantity_required: service.room_quantity_required || 1,
      base_duration_min: service.base_duration_min,
      buffer_before_min: service.buffer_before_min,
      buffer_after_min: service.buffer_after_min,
      can_overlap: service.can_overlap,
      parallel_group: service.parallel_group || '',
      requires_room: service.requires_room,
      required_device_type: service.required_device_type || '',
      min_age_years: service.min_age_years?.toString() || '',
      max_age_years: service.max_age_years?.toString() || '',
      requires_consent: service.requires_consent,
      online_bookable: service.online_bookable,
      is_online_booking_enabled: (service as any).is_online_booking_enabled ?? service.online_bookable,
      requires_confirmation: (service as any).requires_confirmation ?? false,
      requires_scheduling_confirmation: (service as any).requires_scheduling_confirmation ?? false,
      max_waitlist: (service as any).max_waitlist ?? 0,
      price_cents: service.price_cents || 0,
      billing_code: service.billing_code || '',
      notes: service.notes || '',
      is_active: service.is_active,
      color_hex: service.color_hex || '#2563EB',
      quick_select: service.quick_select || false,
      location_id: service.location_id?._id || '',
      // Abrechnungsfelder
      billingType: service.billingType || 'both',
      ogk: {
        ebmCode: service.ogk?.ebmCode || '',
        ebmPrice: service.ogk?.ebmPrice || 0,
        requiresApproval: service.ogk?.requiresApproval || false,
        billingFrequency: service.ogk?.billingFrequency || 'once'
      },
      wahlarzt: {
        price: service.wahlarzt?.price || 0,
        reimbursementRate: service.wahlarzt?.reimbursementRate || 80,
        maxReimbursement: service.wahlarzt?.maxReimbursement || 0,
        requiresPreApproval: service.wahlarzt?.requiresPreApproval || false
      },
      private: {
        price: service.private?.price || 0,
        noInsurance: service.private?.noInsurance ?? true
      },
      copay: {
        applicable: service.copay?.applicable ?? true,
        amount: service.copay?.amount || 0,
        percentage: service.copay?.percentage || 10,
        maxAmount: service.copay?.maxAmount || 28.50,
        exempt: service.copay?.exempt || false
      }
    });
    
    // Standort-Auswahl für Geräte und Räume setzen
    if (locations.length === 1) {
      setSelectedDeviceLocation(locations[0]._id);
      setSelectedRoomLocation(locations[0]._id);
      // Service-Standort automatisch vorbelegen wenn nicht bereits gesetzt
      if (!service.location_id?._id) {
        setFormData(prev => ({ ...prev, location_id: locations[0]._id }));
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
        min_age_years: formData.min_age_years ? parseInt(formData.min_age_years) : undefined,
        max_age_years: formData.max_age_years ? parseInt(formData.max_age_years) : undefined,
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

        const response = editingService 
          ? await api.put<ServiceCatalog>(`/service-catalog/${editingService._id}`, payload)
          : await api.post<ServiceCatalog>('/service-catalog', payload);

      if (response.success) {
        setSnackbar({ 
          open: true, 
          message: editingService ? 'Leistung erfolgreich aktualisiert' : 'Leistung erfolgreich erstellt', 
          severity: 'success' 
        });
        setDialogOpen(false);
        fetchServices();
      } else {
        throw new Error(response.message || 'Fehler beim Speichern');
      }
    } catch (error: any) {
      console.error('Error saving service:', error);
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diese Leistung löschen möchten?')) {
      return;
    }

    try {
      const response = await api.delete<{success: boolean}>(`/service-catalog/${serviceId}`);

      if (response.success) {
        setSnackbar({ open: true, message: 'Leistung erfolgreich gelöscht', severity: 'success' });
        fetchServices();
      } else {
        throw new Error(response.message || 'Fehler beim Löschen');
      }
    } catch (error: any) {
      console.error('Error deleting service:', error);
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleChangePage = (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    console.log('📄 Page changed from', page, 'to', newPage);
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    console.log('📄 RowsPerPage changed from', rowsPerPage, 'to', newRowsPerPage);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const formatPrice = (priceCents?: number) => {
    if (!priceCents) return '-';
    return `€${(priceCents / 100).toFixed(2)}`;
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
    <Box sx={{ p: 2, width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Leistungskatalog
        </Typography>
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
                  <MenuItem value="Diagnostik">Diagnostik</MenuItem>
                  <MenuItem value="Therapie">Therapie</MenuItem>
                  <MenuItem value="Beratung">Beratung</MenuItem>
                  <MenuItem value="Behandlung">Behandlung</MenuItem>
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
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold', width: '80px' }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '200px' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Kategorie</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '130px' }}>Standort</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '90px' }}>Dauer</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '90px' }}>Preis</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '90px' }}>Rolle</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '120px' }}>Zuordnung</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '80px' }}>Farbe</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Einstellungen</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', width: '100px' }}>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services && Array.isArray(services) && services.map((service) => (
                <TableRow 
                  key={service._id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f9f9f9',
                      cursor: 'pointer'
                    }
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {service.code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {service.name}
                    </Typography>
                    {service.description && (
                      <Typography variant="caption" color="text.secondary">
                        {service.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {service.category && (
                      <Chip label={service.category} size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {service.location_id && typeof service.location_id === 'object' && service.location_id?.name 
                        ? service.location_id.name 
                        : 'Kein Standort zugewiesen'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {service.location_id && typeof service.location_id === 'object' && service.location_id?.code 
                        ? service.location_id.code 
                        : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDuration(service)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatPrice(service.price_cents || service.prices?.privat)}
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
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {/* Benutzer */}
                      {service.assigned_users && service.assigned_users.length > 0 ? (
                        <Box>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary">
                            Benutzer:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                            {service.assigned_users.slice(0, 2).map((user) => (
                              <Chip
                                key={user._id}
                                label={`${user.firstName} ${user.lastName}`}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                            {service.assigned_users.length > 2 && (
                              <Chip
                                label={`+${service.assigned_users.length - 2}`}
                                size="small"
                                variant="outlined"
                                color="secondary"
                              />
                            )}
                          </Box>
                        </Box>
                      ) : null}
                      {/* Geräte */}
                      {service.assigned_devices && service.assigned_devices.length > 0 ? (
                        <Box>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary">
                            Geräte:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                            {service.assigned_devices.slice(0, 2).map((device) => (
                              <Chip
                                key={device._id}
                                label={device.name}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                            {service.assigned_devices.length > 2 && (
                              <Chip
                                label={`+${service.assigned_devices.length - 2}`}
                                size="small"
                                variant="outlined"
                                color="info"
                              />
                            )}
                          </Box>
                        </Box>
                      ) : null}
                      {/* Räume */}
                      {service.assigned_rooms && service.assigned_rooms.length > 0 ? (
                        <Box>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary">
                            Räume:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                            {service.assigned_rooms.slice(0, 2).map((room) => (
                              <Chip
                                key={room._id}
                                label={room.name}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                            {service.assigned_rooms.length > 2 && (
                              <Chip
                                label={`+${service.assigned_rooms.length - 2}`}
                                size="small"
                                variant="outlined"
                                color="success"
                              />
                            )}
                          </Box>
                        </Box>
                      ) : null}
                      {(!service.assigned_users || service.assigned_users.length === 0) &&
                        (!service.assigned_devices || service.assigned_devices.length === 0) &&
                        (!service.assigned_rooms || service.assigned_rooms.length === 0) && (
                          <Typography variant="caption" color="text.secondary">
                            Keine
                          </Typography>
                        )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                      {/* Status */}
                      <Chip 
                        label={(service.is_active || service.isActive) ? 'Aktiv' : 'Inaktiv'} 
                        size="small" 
                        color={(service.is_active || service.isActive) ? 'success' : 'default'}
                      />
                      {/* Medizinische Leistung */}
                      <Chip 
                        label={service.isMedical ? 'Medizinisch' : 'Nicht-medizinisch'} 
                        size="small" 
                        color={service.isMedical ? 'error' : 'default'}
                        variant="outlined"
                      />
                      {/* Schnellauswahl */}
                      {service.quick_select && (
                        <Chip 
                          label="Schnellauswahl" 
                          size="small" 
                          color="primary"
                          variant="filled"
                        />
                      )}
                      {/* Farbe */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            backgroundColor: service.color_hex || '#2563EB',
                            border: '1px solid #ccc'
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
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
              <Tab label="Grunddaten" icon={<InfoIcon />} iconPosition="start" />
              <Tab label="Zeit & Dauer" icon={<AccessTimeIcon />} iconPosition="start" />
              <Tab label="Zuordnung" icon={<GroupIcon />} iconPosition="start" />
              <Tab label="Preis & Billing" icon={<AttachMoneyIcon />} iconPosition="start" />
              <Tab label="Geräte & Räume" icon={<RoomIcon />} iconPosition="start" />
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
                <TextField
                  fullWidth
                  label="Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <TextField
                  fullWidth
                  label="Kategorie"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Beschreibung"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={3}
                />
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
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    label="Standort *"
                  >
                    {locations.map((location) => (
                      <MenuItem key={location._id} value={location._id}>
                        {location.name} ({location.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Beschreibung"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={3}
                />
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
                  value={users.filter(user => formData.assigned_users.includes(user._id))}
                  onChange={(event, newValue) => {
                    setFormData({
                      ...formData,
                      assigned_users: newValue.map(user => user._id)
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
                      const { key, ...tagProps } = getTagProps({ index });
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
                        label="EBM-Code"
                        value={formData.ogk?.ebmCode || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          ogk: { ...formData.ogk, ebmCode: e.target.value }
                        })}
                      />
                      <TextField
                        fullWidth
                        label="EBM-Preis (Cent)"
                        type="number"
                        value={formData.ogk?.ebmPrice || 0}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          ogk: { ...formData.ogk, ebmPrice: parseInt(e.target.value) || 0 }
                        })}
                      />
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
                      <TextField
                        fullWidth
                        label="Preis (Euro)"
                        type="number"
                        inputProps={{ step: "0.01" }}
                        value={formData.wahlarzt?.price ? (formData.wahlarzt.price / 100).toFixed(2) : ''}
                        onChange={(e) => {
                          const euroValue = parseFloat(e.target.value) || 0;
                          setFormData({ 
                            ...formData, 
                            wahlarzt: { ...formData.wahlarzt, price: Math.round(euroValue * 100) }
                          });
                        }}
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
                        value={formData.wahlarzt?.maxReimbursement ? (formData.wahlarzt.maxReimbursement / 100).toFixed(2) : ''}
                        onChange={(e) => {
                          const euroValue = parseFloat(e.target.value) || 0;
                          setFormData({ 
                            ...formData, 
                            wahlarzt: { ...formData.wahlarzt, maxReimbursement: Math.round(euroValue * 100) }
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
                      <TextField
                        fullWidth
                        label="Preis (Euro)"
                        type="number"
                        inputProps={{ step: "0.01" }}
                        value={formData.private?.price ? (formData.private.price / 100).toFixed(2) : ''}
                        onChange={(e) => {
                          const euroValue = parseFloat(e.target.value) || 0;
                          setFormData({ 
                            ...formData, 
                            private: { ...formData.private, price: Math.round(euroValue * 100) }
                          });
                        }}
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
                      value={formData.copay?.amount ? (formData.copay.amount / 100).toFixed(2) : ''}
                      onChange={(e) => {
                        const euroValue = parseFloat(e.target.value) || 0;
                        setFormData({ 
                          ...formData, 
                          copay: { ...formData.copay, amount: Math.round(euroValue * 100) }
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
                      value={formData.copay?.maxAmount ? formData.copay.maxAmount.toFixed(2) : '28.50'}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        copay: { ...formData.copay, maxAmount: parseFloat(e.target.value) || 28.50 }
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
                    value={formData.min_age_years}
                    onChange={(e) => setFormData({ ...formData, min_age_years: e.target.value })}
                  />
                  <TextField
                    fullWidth
                    label="Höchstalter (Jahre)"
                    type="number"
                    value={formData.max_age_years}
                    onChange={(e) => setFormData({ ...formData, max_age_years: e.target.value })}
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
                        value={getFilteredDevices().filter(device => formData.assigned_devices.includes(device._id))}
                        onChange={(event, newValue) => {
                          setFormData({
                            ...formData,
                            assigned_devices: newValue.map(device => device._id)
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
                        value={getFilteredRooms().filter(room => formData.assigned_rooms.includes(room._id))}
                        onChange={(event, newValue) => {
                          setFormData({
                            ...formData,
                            assigned_rooms: newValue.map(room => room._id)
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

            {/* Tab 6: Einstellungen */}
            {activeTab === 5 && (
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
                <TextField
                  fullWidth
                  label="Color (Hex)"
                  value={formData.color_hex}
                  onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                />
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
    </Box>
  );
};

export default ServiceCatalog;
