import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchContacts,
  loadMoreContacts,
  createContact,
  updateContact,
  deleteContact,
  fetchContact,
  fetchPatientsList,
  fetchCategories,
  importPatients,
  setSearchTerm,
  setFilters,
  setSelectedContact,
  clearError,
  resetFilters,
  Contact,
} from '../store/slices/contactSlice';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Menu,
  MenuItem,
  Alert,
  Snackbar,
  Stack,
  Paper,
  CircularProgress,
  Divider,
  Autocomplete,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Search,
  Add,
  Phone,
  Email,
  LocationOn,
  Business,
  Person,
  Favorite,
  FavoriteBorder,
  Edit,
  Delete,
  Star,
  StarBorder,
  Clear,
  FilterList,
  ViewModule,
  ViewList,
  Category,
  Link as LinkIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTheme, useMediaQuery } from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileDownload,
  PictureAsPdf,
  TableChart,
  Description,
} from '@mui/icons-material';

const AddressBook: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const {
    contacts,
    selectedContact,
    loading,
    error,
    pagination,
    searchTerm,
    filters,
    categories,
    patients,
  } = useAppSelector((state) => state.contacts);

  // View and UI state
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'view'>('add');
  const [categoryInputValue, setCategoryInputValue] = useState('');
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  });
  const [formData, setFormData] = useState<Partial<Contact>>({
    type: 'external',
    firstName: '',
    lastName: '',
    title: '',
    profession: '',
    organization: '',
    phone: '',
    mobile: '',
    email: '',
    website: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: 'Österreich',
    },
    categories: [],
    notes: '',
    isActive: true,
    isFavorite: false,
  });
  const [patientSearchTerm, setPatientSearchTerm] = useState('');

  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    dispatch(fetchContacts(1));
    dispatch(fetchCategories());
  }, [dispatch]);

  // Load patients list when dialog opens and type is patient
  useEffect(() => {
    if (openDialog && formData.type === 'patient') {
      dispatch(fetchPatientsList(patientSearchTerm));
    }
  }, [openDialog, formData.type, patientSearchTerm, dispatch]);

  // Debug: Log formData.categories when dialog opens or formData changes
  useEffect(() => {
    if (openDialog) {
      console.log('Dialog opened/changed - formData.categories:', formData.categories);
      console.log('Dialog opened/changed - formData.categories type:', typeof formData.categories, Array.isArray(formData.categories));
    }
  }, [openDialog, formData.categories]);

  // Local search term state for immediate UI updates
  const [localSearchTerm, setLocalSearchTerm] = useState('');

  // Sync local search term with Redux on mount
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, []);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchTerm !== searchTerm) {
        dispatch(setSearchTerm(localSearchTerm));
        dispatch(fetchContacts(1));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchTerm, searchTerm, dispatch]);

  // Show error messages
  useEffect(() => {
    if (error) {
      setSnackbar({ open: true, message: error, severity: 'error' });
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Load more on scroll
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || loading || !pagination.hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      dispatch(loadMoreContacts(pagination.current + 1));
    }
  }, [loading, pagination, dispatch]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleAddNew = () => {
    setFormData({
      type: 'external',
      firstName: '',
      lastName: '',
      title: '',
      profession: '',
      organization: '',
      phone: '',
      mobile: '',
      email: '',
      website: '',
      address: {
        street: '',
        city: '',
        postalCode: '',
        country: 'Österreich',
      },
      categories: [],
      notes: '',
      isActive: true,
      isFavorite: false,
    });
    setCategoryInputValue('');
    setDialogMode('add');
    setOpenDialog(true);
  };

  const handleEdit = async (contact: Contact) => {
    // Fetch full contact data to ensure we have all fields including categories
    try {
      const fullContact = await dispatch(fetchContact(contact._id || contact.id || '')).unwrap();
      console.log('handleEdit - fullContact from API:', fullContact);
      console.log('handleEdit - fullContact.categories:', fullContact.categories);
      
      // Ensure categories is always an array
      const contactCategories = Array.isArray(fullContact.categories) 
        ? fullContact.categories.filter(cat => cat && typeof cat === 'string' && cat.trim() !== '')
        : [];
      
      console.log('handleEdit - contactCategories after filtering:', contactCategories);
      
      const newFormData = {
        ...fullContact,
        patientId: typeof fullContact.patientId === 'object' ? fullContact.patientId._id : fullContact.patientId,
        categories: contactCategories,
        address: fullContact.address || {
          street: '',
          city: '',
          postalCode: '',
          country: 'Österreich',
        },
      };
      
      console.log('handleEdit - newFormData.categories:', newFormData.categories);
      setFormData(newFormData);
      setCategoryInputValue('');
      setDialogMode('edit');
      setOpenDialog(true);
    } catch (error) {
      console.error('Error fetching contact:', error);
      // Fallback to using the contact passed in
      const contactCategories = Array.isArray(contact.categories) 
        ? contact.categories.filter(cat => cat && typeof cat === 'string' && cat.trim() !== '')
        : [];
      
      setFormData({
        ...contact,
        patientId: typeof contact.patientId === 'object' ? contact.patientId._id : contact.patientId,
        categories: contactCategories,
        address: contact.address || {
          street: '',
          city: '',
          postalCode: '',
          country: 'Österreich',
        },
      });
      setCategoryInputValue('');
      setDialogMode('edit');
      setOpenDialog(true);
    }
  };

  const handleView = (contact: Contact) => {
    dispatch(setSelectedContact(contact));
    setFormData({
      ...contact,
      categories: Array.isArray(contact.categories) ? contact.categories : [],
      address: contact.address || {
        street: '',
        city: '',
        postalCode: '',
        country: 'Österreich',
      },
    });
    setCategoryInputValue('');
    setDialogMode('view');
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Möchten Sie diesen Kontakt wirklich löschen?')) {
      try {
        await dispatch(deleteContact(id)).unwrap();
        setSnackbar({ open: true, message: 'Kontakt erfolgreich gelöscht', severity: 'success' });
      } catch (error: any) {
        setSnackbar({
          open: true,
          message: error || 'Fehler beim Löschen des Kontakts',
          severity: 'error',
        });
      }
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.firstName || !formData.lastName) {
        setSnackbar({
          open: true,
          message: 'Bitte füllen Sie Vorname und Nachname aus',
          severity: 'error',
        });
        return;
      }

      if (formData.type === 'patient' && !formData.patientId) {
        setSnackbar({
          open: true,
          message: 'Bitte wählen Sie einen Patienten aus',
          severity: 'error',
        });
        return;
      }

      // Ensure categories is an array of strings
      const contactData = {
        ...formData,
        categories: Array.isArray(formData.categories) 
          ? formData.categories
              .map((cat: any) => typeof cat === 'string' ? cat.trim() : String(cat).trim())
              .filter((cat: string) => cat !== '')
          : [],
      };
      
      console.log('handleSave - formData.categories before processing:', formData.categories);
      console.log('handleSave - formData.categories type:', typeof formData.categories, Array.isArray(formData.categories));
      console.log('handleSave - contactData.categories after processing:', contactData.categories);

      if (dialogMode === 'add') {
        await dispatch(createContact(contactData)).unwrap();
        setSnackbar({ open: true, message: 'Kontakt erfolgreich erstellt', severity: 'success' });
      } else if (dialogMode === 'edit') {
        await dispatch(
          updateContact({
            id: formData._id || formData.id || '',
            data: contactData,
          })
        ).unwrap();
        setSnackbar({ open: true, message: 'Kontakt erfolgreich aktualisiert', severity: 'success' });
      }
      setOpenDialog(false);
      dispatch(fetchContacts(1));
      dispatch(fetchCategories()); // Reload categories after saving
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error || 'Fehler beim Speichern des Kontakts',
        severity: 'error',
      });
    }
  };

  const handleToggleFavorite = async (contact: Contact) => {
    try {
      await dispatch(
        updateContact({
          id: contact._id || contact.id || '',
          data: { isFavorite: !contact.isFavorite },
        })
      ).unwrap();
      dispatch(fetchContacts(1));
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: 'Fehler beim Aktualisieren des Favoriten-Status',
        severity: 'error',
      });
    }
  };

  const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
    dispatch(setFilters({ [filterType]: value }));
    dispatch(fetchContacts(1));
  };

  const handleClearFilters = () => {
    dispatch(resetFilters());
    setLocalSearchTerm('');
    dispatch(fetchContacts(1));
  };

  // Filtered and sorted contacts
  const filteredContacts = useMemo(() => {
    let filtered = [...contacts];

    // Sort by favorite first, then by name
    filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return filtered;
  }, [contacts]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getContactTypeLabel = (type: string) => {
    return type === 'patient' ? 'Patient' : 'Extern';
  };

  const getContactTypeColor = (type: string) => {
    return type === 'patient' ? 'primary' : 'default';
  };

  // Export functions
  const exportToCSV = () => {
    const data = filteredContacts.map((contact) => ({
      Typ: getContactTypeLabel(contact.type),
      'Vorname': contact.firstName,
      'Nachname': contact.lastName,
      'Titel': contact.title || '',
      'Beruf': contact.profession || '',
      'Organisation': contact.organization || '',
      'Telefon': contact.phone || '',
      'Mobil': contact.mobile || '',
      'E-Mail': contact.email || '',
      'Website': contact.website || '',
      'Straße': contact.address?.street || '',
      'PLZ': contact.address?.postalCode || '',
      'Stadt': contact.address?.city || '',
      'Land': contact.address?.country || '',
      'Kategorien': Array.isArray(contact.categories) ? contact.categories.join('; ') : '',
      'Notizen': contact.notes || '',
      'Favorit': contact.isFavorite ? 'Ja' : 'Nein',
      'Aktiv': contact.isActive ? 'Ja' : 'Nein',
    }));

    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((header) => {
          const value = row[header as keyof typeof row] || '';
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kontakte_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportAnchorEl(null);
    setSnackbar({ open: true, message: 'Kontakte als CSV exportiert', severity: 'success' });
  };

  const exportToExcel = () => {
    const data = filteredContacts.map((contact) => ({
      Typ: getContactTypeLabel(contact.type),
      'Vorname': contact.firstName,
      'Nachname': contact.lastName,
      'Titel': contact.title || '',
      'Beruf': contact.profession || '',
      'Organisation': contact.organization || '',
      'Telefon': contact.phone || '',
      'Mobil': contact.mobile || '',
      'E-Mail': contact.email || '',
      'Website': contact.website || '',
      'Straße': contact.address?.street || '',
      'PLZ': contact.address?.postalCode || '',
      'Stadt': contact.address?.city || '',
      'Land': contact.address?.country || '',
      'Kategorien': Array.isArray(contact.categories) ? contact.categories.join('; ') : '',
      'Notizen': contact.notes || '',
      'Favorit': contact.isFavorite ? 'Ja' : 'Nein',
      'Aktiv': contact.isActive ? 'Ja' : 'Nein',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kontakte');
    
    // Auto-size columns
    const colWidths = Object.keys(data[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...data.map((row) => String(row[key as keyof typeof row] || '').length)),
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `kontakte_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    setExportAnchorEl(null);
    setSnackbar({ open: true, message: 'Kontakte als Excel exportiert', severity: 'success' });
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
    
    // Title
    doc.setFontSize(16);
    doc.text('Kontaktliste', 14, 15);
    doc.setFontSize(10);
    doc.text(`Exportiert am: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}`, 14, 22);
    
    // Prepare table data
    const tableData = filteredContacts.map((contact) => [
      getContactTypeLabel(contact.type),
      contact.firstName,
      contact.lastName,
      contact.title || '',
      contact.organization || '',
      contact.phone || '',
      contact.email || '',
      contact.address ? `${contact.address.street || ''}, ${contact.address.postalCode || ''} ${contact.address.city || ''}`.trim() : '',
      Array.isArray(contact.categories) ? contact.categories.join(', ') : '',
    ]);

    // Add table
    autoTable(doc, {
      head: [['Typ', 'Vorname', 'Nachname', 'Titel', 'Organisation', 'Telefon', 'E-Mail', 'Adresse', 'Kategorien']],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 28 },
    });

    doc.save(`kontakte_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setExportAnchorEl(null);
    setSnackbar({ open: true, message: 'Kontakte als PDF exportiert', severity: 'success' });
  };

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportAnchorEl(null);
  };

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' } }}>
        <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" sx={{ flexGrow: 1 }}>
          Adressbuch
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="cards">
              <ViewModule />
            </ToggleButton>
            <ToggleButton value="list">
              <ViewList />
            </ToggleButton>
          </ToggleButtonGroup>
          <Button 
            variant="outlined" 
            onClick={async () => {
              try {
                const result = await dispatch(importPatients()).unwrap();
                setSnackbar({ 
                  open: true, 
                  message: `Import abgeschlossen: ${result.imported} importiert, ${result.skipped} übersprungen`, 
                  severity: 'success' 
                });
                dispatch(fetchContacts(1));
                dispatch(fetchCategories());
              } catch (error: any) {
                setSnackbar({ 
                  open: true, 
                  message: error || 'Fehler beim Importieren der Patienten', 
                  severity: 'error' 
                });
              }
            }}
            size={isMobile ? 'small' : 'medium'}
          >
            {isMobile ? 'Import' : 'Patienten importieren'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={handleExportMenuOpen}
            size={isMobile ? 'small' : 'medium'}
          >
            {isMobile ? 'Export' : 'Exportieren'}
          </Button>
          <Menu
            anchorEl={exportAnchorEl}
            open={Boolean(exportAnchorEl)}
            onClose={handleExportMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            <MenuItem onClick={exportToCSV}>
              <Description sx={{ mr: 1 }} />
              Als CSV exportieren
            </MenuItem>
            <MenuItem onClick={exportToExcel}>
              <TableChart sx={{ mr: 1 }} />
              Als Excel exportieren
            </MenuItem>
            <MenuItem onClick={exportToPDF}>
              <PictureAsPdf sx={{ mr: 1 }} />
              Als PDF exportieren
            </MenuItem>
          </Menu>
          <Button variant="contained" startIcon={<Add />} onClick={handleAddNew} size={isMobile ? 'small' : 'medium'}>
            {isMobile ? 'Neu' : 'Neuer Kontakt'}
          </Button>
        </Stack>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            placeholder="Suche nach Name, E-Mail, Telefon, Organisation..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: localSearchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setLocalSearchTerm('')}>
                    <Clear />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            size={isMobile ? 'small' : 'medium'}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
              <InputLabel>Typ</InputLabel>
              <Select
                value={filters.type}
                label="Typ"
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <MenuItem value="all">Alle</MenuItem>
                <MenuItem value="patient">Patienten</MenuItem>
                <MenuItem value="external">Externe</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
              <InputLabel>Kategorie</InputLabel>
              <Select
                value={filters.category}
                label="Kategorie"
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <MenuItem value="">Alle</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
              <InputLabel>Favoriten</InputLabel>
              <Select
                value={filters.isFavorite}
                label="Favoriten"
                onChange={(e) => handleFilterChange('isFavorite', e.target.value)}
              >
                <MenuItem value="all">Alle</MenuItem>
                <MenuItem value="true">Nur Favoriten</MenuItem>
                <MenuItem value="false">Ohne Favoriten</MenuItem>
              </Select>
            </FormControl>
            {(filters.type !== 'all' || filters.category || filters.isFavorite !== 'all') && (
              <Button
                size="small"
                startIcon={<Clear />}
                onClick={handleClearFilters}
                sx={{ alignSelf: 'center' }}
              >
                Filter zurücksetzen
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Contacts List */}
      <Box
        ref={scrollContainerRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {loading && filteredContacts.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredContacts.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Keine Kontakte gefunden
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={handleAddNew} sx={{ mt: 2 }}>
              Ersten Kontakt erstellen
            </Button>
          </Paper>
        ) : viewMode === 'cards' ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 2,
            }}
          >
            {filteredContacts.map((contact) => (
              <Card
                key={contact._id || contact.id}
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                  border: contact.isFavorite ? '2px solid' : 'none',
                  borderColor: contact.isFavorite ? 'primary.main' : 'transparent',
                }}
                onClick={() => handleView(contact)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {getInitials(contact.firstName, contact.lastName)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight="bold" noWrap>
                          {contact.firstName} {contact.lastName}
                        </Typography>
                        {contact.title && (
                          <Typography variant="caption" color="text.secondary">
                            {contact.title}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(contact);
                      }}
                    >
                      {contact.isFavorite ? <Star color="primary" /> : <StarBorder />}
                    </IconButton>
                  </Box>
                  <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip
                      label={getContactTypeLabel(contact.type)}
                      size="small"
                      color={getContactTypeColor(contact.type) as any}
                    />
                    {contact.categories && contact.categories.length > 0 && (
                      <>
                        {contact.categories.map((cat) => (
                          <Chip key={cat} label={cat} size="small" variant="outlined" />
                        ))}
                      </>
                    )}
                  </Stack>
                  {contact.profession && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Business fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {contact.profession}
                      </Typography>
                    </Box>
                  )}
                  {contact.organization && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Business fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {contact.organization}
                      </Typography>
                    </Box>
                  )}
                  {contact.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {contact.phone}
                      </Typography>
                    </Box>
                  )}
                  {contact.mobile && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        Mobil: {contact.mobile}
                      </Typography>
                    </Box>
                  )}
                  {contact.email && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Email fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {contact.email}
                      </Typography>
                    </Box>
                  )}
                  {contact.website && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <LinkIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {contact.website}
                      </Typography>
                    </Box>
                  )}
                  {contact.address?.street && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {contact.address.street}
                      </Typography>
                    </Box>
                  )}
                  {contact.address?.city && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {contact.address.postalCode && `${contact.address.postalCode} `}
                        {contact.address.city}
                        {contact.address.country && contact.address.country !== 'Österreich' && `, ${contact.address.country}`}
                      </Typography>
                    </Box>
                  )}
                  {contact.notes && (
                    <Box sx={{ mt: 0.5, mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {contact.notes}
                      </Typography>
                    </Box>
                  )}
                  {contact.categories && contact.categories.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {contact.categories.slice(0, 2).map((cat) => (
                        <Chip key={cat} label={cat} size="small" variant="outlined" />
                      ))}
                      {contact.categories.length > 2 && (
                        <Chip label={`+${contact.categories.length - 2}`} size="small" variant="outlined" />
                      )}
                    </Box>
                  )}
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(contact);
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(contact._id || contact.id || '');
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <List>
            {filteredContacts.map((contact) => (
              <ListItem
                key={contact._id || contact.id}
                disablePadding
                sx={{
                  border: contact.isFavorite ? '2px solid' : '1px solid',
                  borderColor: contact.isFavorite ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemButton onClick={() => handleView(contact)}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {getInitials(contact.firstName, contact.lastName)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {contact.firstName} {contact.lastName}
                      </Typography>
                      {contact.isFavorite && <Star color="primary" fontSize="small" />}
                      <Chip
                        label={getContactTypeLabel(contact.type)}
                        size="small"
                        color={getContactTypeColor(contact.type) as any}
                      />
                    </Box>
                  }
                  secondary={
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {contact.organization && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Business fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {contact.organization}
                          </Typography>
                        </Box>
                      )}
                      {contact.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Phone fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {contact.phone}
                          </Typography>
                        </Box>
                      )}
                      {contact.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Email fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {contact.email}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  }
                />
                </ListItemButton>
                <ListItemSecondaryAction>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(contact);
                      }}
                    >
                      {contact.isFavorite ? <Star color="primary" /> : <StarBorder />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(contact);
                      }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(contact._id || contact.id || '');
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </Stack>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
        {loading && filteredContacts.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {dialogMode === 'add' ? 'Neuer Kontakt' : dialogMode === 'edit' ? 'Kontakt bearbeiten' : 'Kontakt Details'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Typ</InputLabel>
              <Select
                value={formData.type}
                label="Typ"
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as 'patient' | 'external', patientId: undefined })
                }
                disabled={dialogMode === 'view'}
              >
                <MenuItem value="external">Externer Kontakt</MenuItem>
                <MenuItem value="patient">Patient</MenuItem>
              </Select>
            </FormControl>

            {formData.type === 'patient' && (
              <Autocomplete
                options={patients}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                value={patients.find((p) => p._id === formData.patientId) || null}
                onChange={(_, newValue) => {
                  setFormData({ ...formData, patientId: newValue?._id || undefined });
                }}
                disabled={dialogMode === 'view'}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Patient auswählen"
                    placeholder="Patient suchen..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <LinkIcon sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                  />
                )}
              />
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Vorname"
                value={formData.firstName || ''}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={dialogMode === 'view'}
                required
              />
              <TextField
                fullWidth
                label="Nachname"
                value={formData.lastName || ''}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={dialogMode === 'view'}
                required
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Titel"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={dialogMode === 'view'}
              />
              <TextField
                fullWidth
                label="Beruf"
                value={formData.profession || ''}
                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                disabled={dialogMode === 'view'}
              />
            </Stack>

            <TextField
              fullWidth
              label="Organisation"
              value={formData.organization || ''}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              disabled={dialogMode === 'view'}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Telefon"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={dialogMode === 'view'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Mobil"
                value={formData.mobile || ''}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                disabled={dialogMode === 'view'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="E-Mail"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={dialogMode === 'view'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Website"
                value={formData.website || ''}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                disabled={dialogMode === 'view'}
              />
            </Stack>

            <Divider />

            <Typography variant="subtitle2" fontWeight="bold">
              Adresse
            </Typography>

            <TextField
              fullWidth
              label="Straße"
              value={formData.address?.street || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, street: e.target.value },
                })
              }
              disabled={dialogMode === 'view'}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="PLZ"
                value={formData.address?.postalCode || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, postalCode: e.target.value },
                  })
                }
                disabled={dialogMode === 'view'}
              />
              <TextField
                fullWidth
                label="Stadt"
                value={formData.address?.city || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, city: e.target.value },
                  })
                }
                disabled={dialogMode === 'view'}
              />
              <TextField
                fullWidth
                label="Land"
                value={formData.address?.country || 'Österreich'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, country: e.target.value },
                  })
                }
                disabled={dialogMode === 'view'}
              />
            </Stack>

            <Divider />

            <Autocomplete
              multiple
              options={categories}
              freeSolo
              value={Array.isArray(formData.categories) ? formData.categories : []}
              inputValue={categoryInputValue}
              onInputChange={(event, newInputValue, reason) => {
                console.log('🟢 Autocomplete onInputChange - newInputValue:', newInputValue, 'reason:', reason);
                setCategoryInputValue(newInputValue);
              }}
              onChange={(event, newValue, reason, details) => {
                console.log('🔵 Autocomplete onChange CALLED!');
                console.log('🔵 event:', event);
                console.log('🔵 newValue:', newValue);
                console.log('🔵 reason:', reason);
                console.log('🔵 details:', details);
                console.log('🔵 newValue type:', typeof newValue, Array.isArray(newValue));
                
                // Ensure newValue is an array
                const valueArray = Array.isArray(newValue) ? newValue : [];
                
                // Process each value to extract string
                const cleanedCategories = valueArray
                  .map((v: any) => {
                    // If it's already a string, return trimmed
                    if (typeof v === 'string') {
                      return v.trim();
                    }
                    // If it's an object with inputValue (from freeSolo)
                    if (v && typeof v === 'object') {
                      if ('inputValue' in v && v.inputValue) {
                        return String(v.inputValue).trim();
                      }
                      if ('label' in v && v.label) {
                        return String(v.label).trim();
                      }
                      // Try to stringify the object
                      return String(v).trim();
                    }
                    // Fallback: convert to string
                    return String(v).trim();
                  })
                  .filter((v: string) => v !== '' && v !== null && v !== undefined);
                
                console.log('🔵 cleanedCategories:', cleanedCategories);
                console.log('🔵 Current formData.categories before update:', formData.categories);
                
                // Update formData
                setFormData((prev) => {
                  const updated = { 
                    ...prev, 
                    categories: cleanedCategories
                  };
                  console.log('🔵 Updated formData.categories:', updated.categories);
                  return updated;
                });
                
                // Clear input value after selection
                if (reason === 'selectOption' || reason === 'createOption') {
                  setCategoryInputValue('');
                }
              }}
              disabled={dialogMode === 'view'}
              isOptionEqualToValue={(option, value) => {
                const opt = typeof option === 'string' ? option : String(option);
                const val = typeof value === 'string' ? value : String(value);
                return opt.toLowerCase() === val.toLowerCase();
              }}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                if (option && typeof option === 'object') {
                  const opt = option as { inputValue?: string; label?: string };
                  if ('inputValue' in opt && opt.inputValue) {
                    return String(opt.inputValue);
                  }
                  if ('label' in opt && opt.label) {
                    return String(opt.label);
                  }
                }
                return String(option);
              }}
              renderTags={(value, getTagProps) => {
                return value.map((option, index) => {
                  const label = typeof option === 'string' ? option : String(option);
                  return (
                    <Chip
                      {...getTagProps({ index })}
                      key={`${label}-${index}`}
                      label={label}
                      size="small"
                      onDelete={dialogMode === 'view' ? undefined : undefined}
                    />
                  );
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Kategorien"
                  placeholder="Kategorie eingeben und Enter drücken oder aus Liste wählen..."
                  onKeyDown={(e) => {
                    // Handle Enter key to add category
                    if (e.key === 'Enter' && categoryInputValue && categoryInputValue.trim() !== '') {
                      e.preventDefault();
                      const trimmedValue = categoryInputValue.trim();
                      const currentCategories = Array.isArray(formData.categories) ? formData.categories : [];
                      
                      // Check if category already exists (case-insensitive)
                      const exists = currentCategories.some(
                        cat => cat.toLowerCase() === trimmedValue.toLowerCase()
                      );
                      
                      if (!exists) {
                        const updatedCategories = [...currentCategories, trimmedValue];
                        console.log('🟡 Adding category via Enter key:', trimmedValue);
                        console.log('🟡 Updated categories:', updatedCategories);
                        setFormData((prev) => ({
                          ...prev,
                          categories: updatedCategories
                        }));
                        setCategoryInputValue('');
                      } else {
                        console.log('🟡 Category already exists:', trimmedValue);
                        setCategoryInputValue('');
                      }
                    }
                    // Call original onKeyDown if it exists
                    if (params.inputProps?.onKeyDown) {
                      params.inputProps.onKeyDown(e as React.KeyboardEvent<HTMLInputElement>);
                    }
                  }}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <Category sx={{ mr: 1, color: 'action.active' }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <TextField
              fullWidth
              label="Notizen"
              multiline
              rows={4}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={dialogMode === 'view'}
            />

            {dialogMode !== 'view' && (
              <Stack direction="row" spacing={2}>
                <FormControl>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <input
                      type="checkbox"
                      checked={formData.isFavorite || false}
                      onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                    />
                    <Typography variant="body2">Als Favorit markieren</Typography>
                  </Box>
                </FormControl>
                <FormControl>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive !== false}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <Typography variant="body2">Aktiv</Typography>
                  </Box>
                </FormControl>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            {dialogMode === 'view' ? 'Schließen' : 'Abbrechen'}
          </Button>
          {dialogMode !== 'view' && (
            <Button variant="contained" onClick={handleSave}>
              Speichern
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddressBook;

