import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Tabs, Tab, Alert, CircularProgress, Stack, Tooltip, Checkbox, FormControlLabel,
  Accordion, AccordionSummary, AccordionDetails, Divider, Switch, Autocomplete
} from '@mui/material';
import {
  Add, Edit, Delete, PlayArrow, Download, Assessment, FilterList,
  Visibility, VisibilityOff, Search, Category as CategoryIcon, ExpandMore,
  AddCircle, RemoveCircle, Settings, TableChart, BarChart,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';

interface ReportDefinition {
  _id?: string;
  id?: string | number;
  name: string;
  description?: string;
  category: string;
  dataSource: string;
  config?: {
    filters?: any[];
    columns?: any[];
    groupBy?: string[];
    sortBy?: { field: string; direction: string };
    dateRange?: {
      enabled?: boolean;
      field?: string;
      defaultRange?: string;
    };
    limit?: number;
    format?: {
      type?: string;
      chartType?: string;
    };
  };
  isActive: boolean;
  isPublic: boolean;
  tags?: string[];
  executionCount: number;
  lastExecutedAt?: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
}

interface ReportExecution {
  _id: string;
  result: {
    totalRecords: number;
    data: any[];
    summary: any;
    executionTime: number;
  };
  status: string;
  executedBy?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

const Reports: React.FC = () => {
  const { marginTopValue } = useGlobalNavigationOffset();
  const [reports, setReports] = useState<ReportDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [executionResult, setExecutionResult] = useState<ReportExecution | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const { enqueueSnackbar } = useSnackbar();
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);

  // Report Builder State
  const [builderTab, setBuilderTab] = useState(0);
  const [newReport, setNewReport] = useState({
    name: '',
    description: '',
    category: 'patient',
    dataSource: 'patients',
    config: {
      filters: [] as any[],
      columns: [] as any[],
      groupBy: [] as string[],
      sortBy: { field: '', direction: 'asc' as 'asc' | 'desc' },
      dateRange: {
        enabled: false,
        field: 'createdAt',
        defaultRange: 'thisMonth'
      },
      limit: 1000,
      format: {
        type: 'table' as 'table' | 'chart' | 'summary',
        chartType: 'bar' as 'bar' | 'line' | 'pie' | 'area' | 'column' | null
      }
    },
    isActive: true,
    isPublic: false,
    tags: [] as string[],
    permissions: {
      canView: ['admin', 'doctor'],
      canGenerate: ['admin', 'doctor'],
      canExport: ['admin'],
      canEdit: ['admin'],
      canDelete: ['admin']
    }
  });

  // Hilfsfunktion um Report-ID zu extrahieren
  const getReportId = (report: ReportDefinition): string | null => {
    return (report._id || (report as any).id || null)?.toString() || null;
  };

  const categories = [
    { value: 'all', label: 'Alle' },
    { value: 'patient', label: 'Patienten' },
    { value: 'appointment', label: 'Termine' },
    { value: 'billing', label: 'Abrechnung' },
    { value: 'staff', label: 'Personal' },
    { value: 'service', label: 'Leistungen' },
    { value: 'location', label: 'Standorte' },
    { value: 'document', label: 'Dokumente' },
    { value: 'custom', label: 'Benutzerdefiniert' }
  ];

  useEffect(() => {
    loadReports();
  }, [selectedCategory, searchTerm]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const response = await api.get<{ data: ReportDefinition[] }>('/reports', params);
      if (response.success) {
        const apiData = response.data as any;
        const reportsData = Array.isArray(apiData) ? apiData : (apiData?.data || []);
        
        // Normalisiere IDs: Stelle sicher, dass alle Reports _id haben
        const normalizedReports = reportsData.map((report: any) => ({
          ...report,
          _id: report._id || report.id || String(report.id) || report._id
        }));
        
        console.log('📋 Loaded reports:', normalizedReports.length);
        if (normalizedReports.length > 0) {
          console.log('📋 First report:', normalizedReports[0]);
          console.log('📋 First report ID:', normalizedReports[0]._id);
        }
        
        setReports(normalizedReports);
      }
    } catch (error: any) {
      console.error('Error loading reports:', error);
      enqueueSnackbar('Fehler beim Laden der Reports', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (report: ReportDefinition) => {
    setSelectedReport(report);
    setGenerateDialogOpen(true);
  };

  const executeGenerate = async () => {
    if (!selectedReport) {
      console.warn('⚠️ No report selected');
      return;
    }
    
    const reportId = getReportId(selectedReport);
    if (!reportId) {
      console.error('❌ Report has no ID:', selectedReport);
      enqueueSnackbar('Fehler: Report-ID nicht gefunden', { variant: 'error' });
      return;
    }
    
    console.log('🔍 Generating report:', { reportId, report: selectedReport });
    
    setLoading(true);
    try {
      const parameters: any = {};
      if (dateRange.start && dateRange.end) {
        parameters.dateRange = {
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString()
        };
      }
      
      const response = await api.post<{ execution: ReportExecution }>(`/reports/${reportId}/generate`, { parameters });
      if (response.success) {
        const apiData = response.data as any;
        setExecutionResult(apiData?.execution || apiData?.data?.execution);
        enqueueSnackbar('Report erfolgreich generiert', { variant: 'success' });
        loadReports();
      }
    } catch (error: any) {
      console.error('Error generating report:', error);
      enqueueSnackbar('Fehler beim Generieren des Reports', { variant: 'error' });
    } finally {
      setLoading(false);
      setGenerateDialogOpen(false);
    }
  };

  const handleDelete = async (report: ReportDefinition) => {
    if (!window.confirm('Möchten Sie diesen Report wirklich löschen?')) {
      return;
    }
    
    const reportId = getReportId(report);
    if (!reportId) {
      console.error('❌ Report has no ID:', report);
      enqueueSnackbar('Fehler: Report-ID nicht gefunden', { variant: 'error' });
      return;
    }
    
    try {
      const response = await api.delete(`/reports/${reportId}`);
      if (response.success) {
        enqueueSnackbar('Report erfolgreich gelöscht', { variant: 'success' });
        loadReports();
      }
    } catch (error: any) {
      console.error('Error deleting report:', error);
      enqueueSnackbar('Fehler beim Löschen des Reports', { variant: 'error' });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
      patient: 'primary',
      appointment: 'success',
      billing: 'warning',
      staff: 'info',
      service: 'secondary',
      location: 'default',
      document: 'primary',
      custom: 'default'
    };
    return colors[category] || 'default';
  };

  // Verfügbare Felder für verschiedene Datenquellen
  const getAvailableFields = (dataSource: string) => {
    const fields: Record<string, Array<{ field: string; label: string; type: string }>> = {
      patients: [
        { field: 'firstName', label: 'Vorname', type: 'string' },
        { field: 'lastName', label: 'Nachname', type: 'string' },
        { field: 'dateOfBirth', label: 'Geburtsdatum', type: 'date' },
        { field: 'gender', label: 'Geschlecht', type: 'string' },
        { field: 'email', label: 'E-Mail', type: 'string' },
        { field: 'phone', label: 'Telefon', type: 'string' },
        { field: 'address.street', label: 'Straße', type: 'string' },
        { field: 'address.city', label: 'Stadt', type: 'string' },
        { field: 'address.zipCode', label: 'PLZ', type: 'string' },
        { field: 'insuranceProvider', label: 'Versicherung', type: 'string' },
        { field: 'createdAt', label: 'Erstellt am', type: 'date' }
      ],
      appointments: [
        { field: 'patientName', label: 'Patient', type: 'string' },
        { field: 'startTime', label: 'Startzeit', type: 'date' },
        { field: 'endTime', label: 'Endzeit', type: 'date' },
        { field: 'status', label: 'Status', type: 'string' },
        { field: 'serviceName', label: 'Leistung', type: 'string' },
        { field: 'staffName', label: 'Mitarbeiter', type: 'string' },
        { field: 'location', label: 'Standort', type: 'string' },
        { field: 'createdAt', label: 'Erstellt am', type: 'date' }
      ],
      invoices: [
        { field: 'invoiceNumber', label: 'Rechnungsnummer', type: 'string' },
        { field: 'patientName', label: 'Patient', type: 'string' },
        { field: 'totalAmount', label: 'Gesamtbetrag', type: 'number' },
        { field: 'status', label: 'Status', type: 'string' },
        { field: 'invoiceDate', label: 'Rechnungsdatum', type: 'date' },
        { field: 'dueDate', label: 'Fälligkeitsdatum', type: 'date' },
        { field: 'createdAt', label: 'Erstellt am', type: 'date' }
      ],
      staff: [
        { field: 'display_name', label: 'Name', type: 'string' },
        { field: 'firstName', label: 'Vorname', type: 'string' },
        { field: 'lastName', label: 'Nachname', type: 'string' },
        { field: 'role', label: 'Rolle', type: 'string' },
        { field: 'email', label: 'E-Mail', type: 'string' },
        { field: 'active', label: 'Aktiv', type: 'boolean' }
      ]
    };
    return fields[dataSource] || [];
  };

  const handleCreateReport = async () => {
    if (!newReport.name.trim()) {
      enqueueSnackbar('Bitte geben Sie einen Namen für den Report ein', { variant: 'warning' });
      return;
    }

    if (newReport.config.columns.length === 0) {
      enqueueSnackbar('Bitte wählen Sie mindestens eine Spalte aus', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/reports', newReport);
      if (response.success) {
        enqueueSnackbar('Report erfolgreich erstellt', { variant: 'success' });
        setCreateDialogOpen(false);
        setNewReport({
          name: '',
          description: '',
          category: 'patient',
          dataSource: 'patients',
          config: {
            filters: [],
            columns: [],
            groupBy: [],
            sortBy: { field: '', direction: 'asc' },
            dateRange: {
              enabled: false,
              field: 'createdAt',
              defaultRange: 'thisMonth'
            },
            limit: 1000,
            format: {
              type: 'table',
              chartType: 'bar'
            }
          },
          isActive: true,
          isPublic: false,
          tags: [],
          permissions: {
            canView: ['admin', 'doctor'],
            canGenerate: ['admin', 'doctor'],
            canExport: ['admin'],
            canEdit: ['admin'],
            canDelete: ['admin']
          }
        });
        setBuilderTab(0);
        loadReports();
      }
    } catch (error: any) {
      console.error('Error creating report:', error);
      enqueueSnackbar('Fehler beim Erstellen des Reports', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const addColumn = () => {
    const availableFields = getAvailableFields(newReport.dataSource);
    if (availableFields.length > 0) {
      const firstField = availableFields[0];
      setNewReport({
        ...newReport,
        config: {
          ...newReport.config,
          columns: [
            ...newReport.config.columns,
            {
              field: firstField.field,
              label: firstField.label,
              type: firstField.type,
              visible: true
            }
          ]
        }
      });
    }
  };

  const removeColumn = (index: number) => {
    setNewReport({
      ...newReport,
      config: {
        ...newReport.config,
        columns: newReport.config.columns.filter((_, i) => i !== index)
      }
    });
  };

  const addFilter = () => {
    setNewReport({
      ...newReport,
      config: {
        ...newReport.config,
        filters: [
          ...newReport.config.filters,
          {
            field: '',
            operator: 'equals',
            value: ''
          }
        ]
      }
    });
  };

  const removeFilter = (index: number) => {
    setNewReport({
      ...newReport,
      config: {
        ...newReport.config,
        filters: newReport.config.filters.filter((_, i) => i !== index)
      }
    });
  };

  const filteredReports = reports.filter(report => {
    if (selectedCategory !== 'all' && report.category !== selectedCategory) {
      return false;
    }
    if (searchTerm && !report.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !report.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <Box sx={{ 
      p: 3,
      mt: marginTopValue !== '0px' ? marginTopValue : 0,
      transition: marginTopValue !== '0px' ? 'margin-top 0.3s ease' : 'none',
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
              Berichte
            </Typography>
            <Tooltip title="Hilfe & Leitfaden">
              <IconButton
                onClick={() => setHelpDialogOpen(true)}
                color="primary"
                size="small"
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="subtitle1" color="text.secondary">
            Erstellen und verwalten Sie verschiedene Auswertungen über das System
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Neuer Report
        </Button>
      </Box>

      {/* Filter und Suche */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                placeholder="Suche nach Reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Kategorie</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  label="Kategorie"
                >
                  {categories.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Reports Liste */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredReports.length === 0 ? (
        <Card>
          <CardContent>
            <Alert severity="info">
              Keine Reports gefunden. Erstellen Sie einen neuen Report, um Auswertungen zu definieren.
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filteredReports.map((report) => {
            const reportId = getReportId(report) || `report-${Math.random()}`;
            return (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={reportId}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {report.name}
                      </Typography>
                      <Chip
                        label={categories.find(c => c.value === report.category)?.label || report.category}
                        color={getCategoryColor(report.category)}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                    </Box>
                    <Box>
                      {!report.isActive && (
                        <Chip label="Inaktiv" size="small" color="default" sx={{ mb: 1 }} />
                      )}
                      {report.isPublic && (
                        <Chip label="Öffentlich" size="small" color="info" sx={{ mb: 1 }} />
                      )}
                    </Box>
                  </Box>
                  
                  {report.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {report.description}
                    </Typography>
                  )}
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Tooltip title="Report generieren">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleGenerate(report)}
                      >
                        <PlayArrow />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Bearbeiten">
                      <IconButton size="small" color="default">
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Löschen">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(report)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'text.secondary' }}>
                    <span>{report.executionCount} Ausführungen</span>
                    {report.lastExecutedAt && (
                      <span>{format(new Date(report.lastExecutedAt), 'dd.MM.yyyy')}</span>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            );
          })}
        </Grid>
      )}

      {/* Generate Dialog */}
      <Dialog open={generateDialogOpen} onClose={() => setGenerateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Report generieren: {selectedReport?.name}</DialogTitle>
        <DialogContent>
          {selectedReport?.config?.dateRange?.enabled && (
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DatePicker
                    label="Von"
                    value={dateRange.start}
                    onChange={(date) => setDateRange({ ...dateRange, start: date })}
                    format="dd.MM.yyyy"
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DatePicker
                    label="Bis"
                    value={dateRange.end}
                    onChange={(date) => setDateRange({ ...dateRange, end: date })}
                    format="dd.MM.yyyy"
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={executeGenerate} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Generieren'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Execution Result */}
      {executionResult && (
        <Dialog open={!!executionResult} onClose={() => setExecutionResult(null)} maxWidth="lg" fullWidth>
          <DialogTitle>
            Report-Ergebnis: {selectedReport?.name}
            {executionResult?.result && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                {executionResult.result.totalRecords} Datensätze in {executionResult.result.executionTime}ms
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {selectedReport?.config?.columns
                      ?.filter((col: any) => col.visible !== false)
                      .map((col: any) => (
                        <TableCell key={col.field}>{col.label || col.field}</TableCell>
                      ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {executionResult?.result?.data?.slice(0, 100).map((row: any, index: number) => (
                    <TableRow key={index}>
                      {selectedReport?.config?.columns
                        ?.filter((col: any) => col.visible !== false)
                        .map((col: any) => (
                          <TableCell key={col.field}>{row[col.field] ?? '-'}</TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {executionResult?.result?.data && executionResult.result.data.length > 100 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Es werden nur die ersten 100 Datensätze angezeigt. Gesamt: {executionResult.result.totalRecords}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExecutionResult(null)}>Schließen</Button>
            <Button variant="contained" startIcon={<Download />}>
              Exportieren
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Create Dialog - Report Builder */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment />
            <Typography variant="h6">Neuen Report erstellen</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Tabs value={builderTab} onChange={(_, newValue) => setBuilderTab(newValue)} sx={{ mb: 3 }}>
            <Tab label="Basis" icon={<Settings />} iconPosition="start" />
            <Tab label="Spalten" icon={<TableChart />} iconPosition="start" />
            <Tab label="Filter" icon={<FilterList />} iconPosition="start" />
            <Tab label="Optionen" icon={<BarChart />} iconPosition="start" />
          </Tabs>

          {/* Tab 0: Basis-Informationen */}
          {builderTab === 0 && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Report-Name *"
                  value={newReport.name}
                  onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Beschreibung"
                  value={newReport.description}
                  onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Kategorie *</InputLabel>
                  <Select
                    value={newReport.category}
                    onChange={(e) => {
                      const category = e.target.value;
                      // Automatisch Datenquelle basierend auf Kategorie setzen
                      const dataSourceMap: Record<string, string> = {
                        patient: 'patients',
                        appointment: 'appointments',
                        billing: 'invoices',
                        staff: 'staff'
                      };
                      setNewReport({
                        ...newReport,
                        category,
                        dataSource: dataSourceMap[category] || newReport.dataSource
                      });
                    }}
                    label="Kategorie *"
                  >
                    {categories.filter(c => c.value !== 'all').map(cat => (
                      <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Datenquelle *</InputLabel>
                  <Select
                    value={newReport.dataSource}
                    onChange={(e) => {
                      setNewReport({
                        ...newReport,
                        dataSource: e.target.value,
                        config: {
                          ...newReport.config,
                          columns: [], // Spalten zurücksetzen bei Datenquellenwechsel
                          filters: []
                        }
                      });
                    }}
                    label="Datenquelle *"
                  >
                    <MenuItem value="patients">Patienten</MenuItem>
                    <MenuItem value="appointments">Termine</MenuItem>
                    <MenuItem value="invoices">Rechnungen</MenuItem>
                    <MenuItem value="reimbursements">Erstattungen</MenuItem>
                    <MenuItem value="staff">Mitarbeiter</MenuItem>
                    <MenuItem value="services">Leistungen</MenuItem>
                    <MenuItem value="documents">Dokumente</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newReport.isActive}
                      onChange={(e) => setNewReport({ ...newReport, isActive: e.target.checked })}
                    />
                  }
                  label="Report ist aktiv"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newReport.isPublic}
                      onChange={(e) => setNewReport({ ...newReport, isPublic: e.target.checked })}
                    />
                  }
                  label="Öffentlich (für alle mit Berechtigung sichtbar)"
                />
              </Grid>
            </Grid>
          )}

          {/* Tab 1: Spalten */}
          {builderTab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Spalten konfigurieren</Typography>
                <Button startIcon={<AddCircle />} onClick={addColumn} variant="outlined" size="small">
                  Spalte hinzufügen
                </Button>
              </Box>
              {newReport.config.columns.length === 0 ? (
                <Alert severity="info">Keine Spalten definiert. Fügen Sie mindestens eine Spalte hinzu.</Alert>
              ) : (
                <Stack spacing={2}>
                  {newReport.config.columns.map((column, index) => {
                    const availableFields = getAvailableFields(newReport.dataSource);
                    return (
                      <Card key={index}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                            <Typography variant="subtitle2">Spalte {index + 1}</Typography>
                            <IconButton size="small" color="error" onClick={() => removeColumn(index)}>
                              <RemoveCircle />
                            </IconButton>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 6 }}>
                              <FormControl fullWidth>
                                <InputLabel>Feld</InputLabel>
                                <Select
                                  value={column.field}
                                  onChange={(e) => {
                                    const field = e.target.value;
                                    const fieldInfo = availableFields.find(f => f.field === field);
                                    setNewReport({
                                      ...newReport,
                                      config: {
                                        ...newReport.config,
                                        columns: newReport.config.columns.map((col, i) =>
                                          i === index
                                            ? { ...col, field, label: fieldInfo?.label || field, type: fieldInfo?.type || 'string' }
                                            : col
                                        )
                                      }
                                    });
                                  }}
                                  label="Feld"
                                >
                                  {availableFields.map(field => (
                                    <MenuItem key={field.field} value={field.field}>
                                      {field.label} ({field.type})
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                              <TextField
                                fullWidth
                                label="Anzeigename"
                                value={column.label}
                                onChange={(e) => {
                                  setNewReport({
                                    ...newReport,
                                    config: {
                                      ...newReport.config,
                                      columns: newReport.config.columns.map((col, i) =>
                                        i === index ? { ...col, label: e.target.value } : col
                                      )
                                    }
                                  });
                                }}
                              />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={column.visible !== false}
                                    onChange={(e) => {
                                      setNewReport({
                                        ...newReport,
                                        config: {
                                          ...newReport.config,
                                          columns: newReport.config.columns.map((col, i) =>
                                            i === index ? { ...col, visible: e.target.checked } : col
                                          )
                                        }
                                      });
                                    }}
                                  />
                                }
                                label="Spalte anzeigen"
                              />
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </Box>
          )}

          {/* Tab 2: Filter */}
          {builderTab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Filter konfigurieren</Typography>
                <Button startIcon={<AddCircle />} onClick={addFilter} variant="outlined" size="small">
                  Filter hinzufügen
                </Button>
              </Box>
              {newReport.config.filters.length === 0 ? (
                <Alert severity="info">Keine Filter definiert. Optional können Sie Filter hinzufügen.</Alert>
              ) : (
                <Stack spacing={2}>
                  {newReport.config.filters.map((filter, index) => {
                    const availableFields = getAvailableFields(newReport.dataSource);
                    return (
                      <Card key={index}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                            <Typography variant="subtitle2">Filter {index + 1}</Typography>
                            <IconButton size="small" color="error" onClick={() => removeFilter(index)}>
                              <RemoveCircle />
                            </IconButton>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <FormControl fullWidth>
                                <InputLabel>Feld</InputLabel>
                                <Select
                                  value={filter.field}
                                  onChange={(e) => {
                                    setNewReport({
                                      ...newReport,
                                      config: {
                                        ...newReport.config,
                                        filters: newReport.config.filters.map((f, i) =>
                                          i === index ? { ...f, field: e.target.value } : f
                                        )
                                      }
                                    });
                                  }}
                                  label="Feld"
                                >
                                  {availableFields.map(field => (
                                    <MenuItem key={field.field} value={field.field}>
                                      {field.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <FormControl fullWidth>
                                <InputLabel>Operator</InputLabel>
                                <Select
                                  value={filter.operator}
                                  onChange={(e) => {
                                    setNewReport({
                                      ...newReport,
                                      config: {
                                        ...newReport.config,
                                        filters: newReport.config.filters.map((f, i) =>
                                          i === index ? { ...f, operator: e.target.value } : f
                                        )
                                      }
                                    });
                                  }}
                                  label="Operator"
                                >
                                  <MenuItem value="equals">Gleich</MenuItem>
                                  <MenuItem value="notEquals">Ungleich</MenuItem>
                                  <MenuItem value="contains">Enthält</MenuItem>
                                  <MenuItem value="greaterThan">Größer als</MenuItem>
                                  <MenuItem value="lessThan">Kleiner als</MenuItem>
                                  <MenuItem value="isNull">Ist leer</MenuItem>
                                  <MenuItem value="isNotNull">Ist nicht leer</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <TextField
                                fullWidth
                                label="Wert"
                                value={filter.value}
                                onChange={(e) => {
                                  setNewReport({
                                    ...newReport,
                                    config: {
                                      ...newReport.config,
                                      filters: newReport.config.filters.map((f, i) =>
                                        i === index ? { ...f, value: e.target.value } : f
                                      )
                                    }
                                  });
                                }}
                                disabled={filter.operator === 'isNull' || filter.operator === 'isNotNull'}
                              />
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </Box>
          )}

          {/* Tab 3: Optionen */}
          {builderTab === 3 && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Datumsbereich</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={newReport.config.dateRange.enabled}
                              onChange={(e) => {
                                setNewReport({
                                  ...newReport,
                                  config: {
                                    ...newReport.config,
                                    dateRange: {
                                      ...newReport.config.dateRange,
                                      enabled: e.target.checked
                                    }
                                  }
                                });
                              }}
                            />
                          }
                          label="Datumsbereich aktivieren"
                        />
                      </Grid>
                      {newReport.config.dateRange.enabled && (
                        <>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <FormControl fullWidth>
                              <InputLabel>Datumsfeld</InputLabel>
                              <Select
                                value={newReport.config.dateRange.field}
                                onChange={(e) => {
                                  setNewReport({
                                    ...newReport,
                                    config: {
                                      ...newReport.config,
                                      dateRange: {
                                        ...newReport.config.dateRange,
                                        field: e.target.value
                                      }
                                    }
                                  });
                                }}
                                label="Datumsfeld"
                              >
                                {getAvailableFields(newReport.dataSource)
                                  .filter(f => f.type === 'date')
                                  .map(field => (
                                    <MenuItem key={field.field} value={field.field}>
                                      {field.label}
                                    </MenuItem>
                                  ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <FormControl fullWidth>
                              <InputLabel>Standard-Bereich</InputLabel>
                              <Select
                                value={newReport.config.dateRange.defaultRange}
                                onChange={(e) => {
                                  setNewReport({
                                    ...newReport,
                                    config: {
                                      ...newReport.config,
                                      dateRange: {
                                        ...newReport.config.dateRange,
                                        defaultRange: e.target.value
                                      }
                                    }
                                  });
                                }}
                                label="Standard-Bereich"
                              >
                                <MenuItem value="today">Heute</MenuItem>
                                <MenuItem value="yesterday">Gestern</MenuItem>
                                <MenuItem value="thisWeek">Diese Woche</MenuItem>
                                <MenuItem value="lastWeek">Letzte Woche</MenuItem>
                                <MenuItem value="thisMonth">Dieser Monat</MenuItem>
                                <MenuItem value="lastMonth">Letzter Monat</MenuItem>
                                <MenuItem value="thisYear">Dieses Jahr</MenuItem>
                                <MenuItem value="lastYear">Letztes Jahr</MenuItem>
                                <MenuItem value="custom">Benutzerdefiniert</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                        </>
                      )}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Sortierung & Limit</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FormControl fullWidth>
                          <InputLabel>Sortieren nach</InputLabel>
                          <Select
                            value={newReport.config.sortBy.field}
                            onChange={(e) => {
                              setNewReport({
                                ...newReport,
                                config: {
                                  ...newReport.config,
                                  sortBy: {
                                    ...newReport.config.sortBy,
                                    field: e.target.value
                                  }
                                }
                              });
                            }}
                            label="Sortieren nach"
                          >
                            {newReport.config.columns.map(col => (
                              <MenuItem key={col.field} value={col.field}>
                                {col.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FormControl fullWidth>
                          <InputLabel>Richtung</InputLabel>
                          <Select
                            value={newReport.config.sortBy.direction}
                            onChange={(e) => {
                              setNewReport({
                                ...newReport,
                                config: {
                                  ...newReport.config,
                                  sortBy: {
                                    ...newReport.config.sortBy,
                                    direction: e.target.value as 'asc' | 'desc'
                                  }
                                }
                              });
                            }}
                            label="Richtung"
                          >
                            <MenuItem value="asc">Aufsteigend</MenuItem>
                            <MenuItem value="desc">Absteigend</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Maximale Anzahl Datensätze"
                          value={newReport.config.limit}
                          onChange={(e) => {
                            setNewReport({
                              ...newReport,
                              config: {
                                ...newReport.config,
                                limit: parseInt(e.target.value) || 1000
                              }
                            });
                          }}
                          inputProps={{ min: 1, max: 10000 }}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Format</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FormControl fullWidth>
                          <InputLabel>Anzeigeformat</InputLabel>
                          <Select
                            value={newReport.config.format.type}
                            onChange={(e) => {
                              setNewReport({
                                ...newReport,
                                config: {
                                  ...newReport.config,
                                  format: {
                                    ...newReport.config.format,
                                    type: e.target.value as 'table' | 'chart' | 'summary'
                                  }
                                }
                              });
                            }}
                            label="Anzeigeformat"
                          >
                            <MenuItem value="table">Tabelle</MenuItem>
                            <MenuItem value="chart">Diagramm</MenuItem>
                            <MenuItem value="summary">Zusammenfassung</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      {newReport.config.format.type === 'chart' && (
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Diagrammtyp</InputLabel>
                            <Select
                              value={newReport.config.format.chartType || 'bar'}
                              onChange={(e) => {
                                setNewReport({
                                  ...newReport,
                                  config: {
                                    ...newReport.config,
                                    format: {
                                      ...newReport.config.format,
                                      chartType: e.target.value as 'bar' | 'line' | 'pie' | 'area' | 'column'
                                    }
                                  }
                                });
                              }}
                              label="Diagrammtyp"
                            >
                              <MenuItem value="bar">Balken</MenuItem>
                              <MenuItem value="line">Linie</MenuItem>
                              <MenuItem value="pie">Kreis</MenuItem>
                              <MenuItem value="area">Fläche</MenuItem>
                              <MenuItem value="column">Säule</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      )}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            setBuilderTab(0);
          }}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateReport}
            disabled={loading || !newReport.name.trim() || newReport.config.columns.length === 0}
          >
            {loading ? <CircularProgress size={20} /> : 'Report erstellen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;
