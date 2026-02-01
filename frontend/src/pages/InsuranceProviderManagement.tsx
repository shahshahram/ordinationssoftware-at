import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Grid,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  HealthAndSafety as HealthAndSafetyIcon,
  Settings as SettingsIcon,
  CloudUpload as CloudUploadIcon,
  Email as EmailIcon,
  Description as DescriptionIcon,
  Api as ApiIcon,
  Science as TestTubeIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import GradientDialogTitle from '../components/GradientDialogTitle';

interface InsuranceProvider {
  _id: string;
  name: string;
  code: string;
  aliases?: string[];
  description?: string;
  contact?: {
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
    phone?: string;
    email?: string;
    website?: string;
    claimsEmail?: string;
  };
  integration: {
    protocol: 'rest' | 'fhir' | 'soap' | 'email' | 'pdf' | 'platform-mycare' | 'platform-rehadirekt' | 'platform-eabrechnung' | 'manual';
    rest?: {
      baseUrl?: string;
      endpoints?: {
        submitClaim?: string;
        getStatus?: string;
        validatePolicy?: string;
      };
      authType?: 'none' | 'api-key' | 'bearer' | 'basic' | 'oauth2';
      apiKey?: string;
      apiSecret?: string;
      clientId?: string;
      clientSecret?: string;
      tokenUrl?: string;
      headers?: Record<string, string>;
    };
    fhir?: {
      baseUrl?: string;
      endpoint?: string;
      authType?: 'none' | 'basic' | 'bearer' | 'oauth2';
      apiKey?: string;
      clientId?: string;
      clientSecret?: string;
    };
    soap?: {
      wsdlUrl?: string;
      endpoint?: string;
      namespace?: string;
      username?: string;
      password?: string;
    };
    email?: {
      to?: string;
      subjectTemplate?: string;
      cc?: string[];
      bcc?: string[];
      requiresPDF?: boolean;
    };
    pdf?: {
      template?: string;
      requiredFields?: string[];
      outputFormat?: 'standard' | 'custom';
    };
    platform?: {
      type?: 'myCare' | 'rehaDirekt' | 'eAbrechnung';
      config?: Record<string, any>;
    };
    format?: {
      requestFormat?: 'JSON' | 'XML' | 'PDF' | 'FHIR' | 'HL7-CDA';
      responseFormat?: 'JSON' | 'XML' | 'PDF';
      dateFormat?: string;
      currency?: string;
    };
    timeout?: {
      connect?: number;
      request?: number;
    };
    retry?: {
      enabled?: boolean;
      maxAttempts?: number;
      backoffStrategy?: 'linear' | 'exponential';
    };
  };
  fallback?: {
    enabled?: boolean;
    methods?: string[];
    autoFallback?: boolean;
  };
  validation?: {
    requiredFields?: Array<{
      field: string;
      type: string;
      description?: string;
    }>;
    rules?: Record<string, any>;
  };
  mapping?: {
    fieldMappings?: Record<string, string>;
    codeMappings?: Record<string, string>;
  };
  isActive: boolean;
  testMode?: boolean;
  stats?: {
    totalSubmissions: number;
    successfulSubmissions: number;
    failedSubmissions: number;
    lastSubmission?: Date;
    lastError?: string;
    averageResponseTime: number;
  };
  createdAt: string;
  updatedAt: string;
}

const InsuranceProviderManagement: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<InsuranceProvider | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  const [formData, setFormData] = useState<Partial<InsuranceProvider>>({
    name: '',
    code: '',
    aliases: [],
    description: '',
    contact: {
      address: {
        street: '',
        city: '',
        postalCode: '',
        country: 'Österreich',
      },
      phone: '',
      email: '',
      website: '',
      claimsEmail: '',
    },
    integration: {
      protocol: 'email',
      rest: {
        baseUrl: '',
        endpoints: {
          submitClaim: '/api/v1/claims/submit',
          getStatus: '/api/v1/claims/status/:claimId',
          validatePolicy: '/api/v1/policies/validate',
        },
        authType: 'api-key',
        apiKey: '',
        apiSecret: '',
        clientId: '',
        clientSecret: '',
        tokenUrl: '',
        headers: {},
      },
      fhir: {
        baseUrl: '',
        endpoint: '/Claim',
        authType: 'none',
        apiKey: '',
        clientId: '',
        clientSecret: '',
      },
      soap: {
        wsdlUrl: '',
        endpoint: '',
        namespace: 'http://schemas.xmlsoap.org/soap/envelope/',
        username: '',
        password: '',
      },
      email: {
        to: '',
        subjectTemplate: 'Versicherungsantrag - {invoiceNumber}',
        cc: [],
        bcc: [],
        requiresPDF: true,
      },
      pdf: {
        template: 'standard',
        requiredFields: [],
        outputFormat: 'standard',
      },
      platform: {
        type: 'myCare',
        config: {},
      },
      format: {
        requestFormat: 'JSON',
        responseFormat: 'JSON',
        dateFormat: 'ISO8601',
        currency: 'EUR',
      },
      timeout: {
        connect: 10000,
        request: 30000,
      },
      retry: {
        enabled: true,
        maxAttempts: 3,
        backoffStrategy: 'exponential',
      },
    },
    fallback: {
      enabled: true,
      methods: [],
      autoFallback: true,
    },
    isActive: true,
    testMode: false,
  });

  useEffect(() => {
    fetchProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchProviders bewusst ausgelassen
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: InsuranceProvider[] }>('/insurance-providers');
      if (response.data?.success) {
        setProviders(response.data.data);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Versicherungen', { variant: 'error' });
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (provider?: InsuranceProvider) => {
    if (provider) {
      setSelectedProvider(provider);
      setFormData({
        ...provider,
        contact: {
          ...provider.contact,
          address: {
            ...provider.contact?.address,
          },
        },
        integration: {
          ...provider.integration,
          protocol: provider.integration?.protocol || 'email',
          rest: {
            ...provider.integration.rest,
            endpoints: {
              submitClaim: '/api/v1/claims/submit',
              getStatus: '/api/v1/claims/status/:claimId',
              validatePolicy: '/api/v1/policies/validate',
              ...provider.integration.rest?.endpoints,
            },
          },
        },
      });
    } else {
      setSelectedProvider(null);
      setFormData({
        name: '',
        code: '',
        aliases: [],
        description: '',
        contact: {
          address: {
            street: '',
            city: '',
            postalCode: '',
            country: 'Österreich',
          },
          phone: '',
          email: '',
          website: '',
          claimsEmail: '',
        },
        integration: {
          protocol: 'email',
          rest: {
            baseUrl: '',
            endpoints: {
              submitClaim: '/api/v1/claims/submit',
              getStatus: '/api/v1/claims/status/:claimId',
              validatePolicy: '/api/v1/policies/validate',
            },
            authType: 'api-key',
            apiKey: '',
            apiSecret: '',
            clientId: '',
            clientSecret: '',
            tokenUrl: '',
            headers: {},
          },
          fhir: {
            baseUrl: '',
            endpoint: '/Claim',
            authType: 'none',
            apiKey: '',
            clientId: '',
            clientSecret: '',
          },
          soap: {
            wsdlUrl: '',
            endpoint: '',
            namespace: 'http://schemas.xmlsoap.org/soap/envelope/',
            username: '',
            password: '',
          },
          email: {
            to: '',
            subjectTemplate: 'Versicherungsantrag - {invoiceNumber}',
            cc: [],
            bcc: [],
            requiresPDF: true,
          },
          pdf: {
            template: 'standard',
            requiredFields: [],
            outputFormat: 'standard',
          },
          platform: {
            type: 'myCare',
            config: {},
          },
          format: {
            requestFormat: 'JSON',
            responseFormat: 'JSON',
            dateFormat: 'ISO8601',
            currency: 'EUR',
          },
          timeout: {
            connect: 10000,
            request: 30000,
          },
          retry: {
            enabled: true,
            maxAttempts: 3,
            backoffStrategy: 'exponential',
          },
        },
        fallback: {
          enabled: true,
          methods: [],
          autoFallback: true,
        },
        isActive: true,
        testMode: false,
      });
    }
    setActiveTab(0);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedProvider(null);
    setFormData({
      integration: {
        protocol: 'email',
      },
    });
  };

  const handleSave = async () => {
    try {
      if (selectedProvider) {
        const response = await api.put<{ success: boolean; message?: string }>(
          `/insurance-providers/${selectedProvider._id}`,
          formData
        );
        if (response.data?.success) {
          enqueueSnackbar('Versicherung erfolgreich aktualisiert', { variant: 'success' });
          fetchProviders();
          handleCloseDialog();
        }
      } else {
        const response = await api.post<{ success: boolean; message?: string }>(
          '/insurance-providers',
          formData
        );
        if (response.data?.success) {
          enqueueSnackbar('Versicherung erfolgreich erstellt', { variant: 'success' });
          fetchProviders();
          handleCloseDialog();
        }
      }
    } catch (error: any) {
      enqueueSnackbar(
        error.response?.data?.message || 'Fehler beim Speichern der Versicherung',
        { variant: 'error' }
      );
    }
  };

  const handleDelete = async () => {
    if (!selectedProvider) return;
    try {
      const response = await api.delete<{ success: boolean; message?: string }>(
        `/insurance-providers/${selectedProvider._id}`
      );
      if (response.data?.success) {
        enqueueSnackbar('Versicherung erfolgreich gelöscht', { variant: 'success' });
        fetchProviders();
        setDeleteDialogOpen(false);
        setSelectedProvider(null);
      }
    } catch (error: any) {
      enqueueSnackbar(
        error.response?.data?.message || 'Fehler beim Löschen der Versicherung',
        { variant: 'error' }
      );
    }
  };

  const handleTestConnection = async () => {
    if (!selectedProvider) return;
    setTesting(true);
    setTestResult(null);
    try {
      const response = await api.post<{ success: boolean; data?: any; message?: string }>(
        `/insurance-providers/${selectedProvider._id}/test`
      );
      setTestResult(response.data);
      if (response.data.success) {
        enqueueSnackbar('Verbindungstest erfolgreich', { variant: 'success' });
      } else {
        enqueueSnackbar(`Verbindungstest fehlgeschlagen: ${response.data.message}`, { variant: 'error' });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.response?.data?.message || error.message,
      });
      enqueueSnackbar('Fehler beim Verbindungstest', { variant: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const getProtocolIcon = (protocol: string) => {
    switch (protocol) {
      case 'rest':
      case 'fhir':
      case 'soap':
        return <ApiIcon />;
      case 'email':
        return <EmailIcon />;
      case 'pdf':
        return <DescriptionIcon />;
      case 'platform-mycare':
      case 'platform-rehadirekt':
      case 'platform-eabrechnung':
        return <CloudUploadIcon />;
      default:
        return <SettingsIcon />;
    }
  };

  const getProtocolLabel = (protocol: string) => {
    const labels: Record<string, string> = {
      rest: 'REST API',
      fhir: 'FHIR',
      soap: 'SOAP/XML',
      email: 'E-Mail',
      pdf: 'PDF',
      'platform-mycare': 'myCare',
      'platform-rehadirekt': 'RehaDirekt',
      'platform-eabrechnung': 'eAbrechnung',
      manual: 'Manuell',
    };
    return labels[protocol] || protocol;
  };

  const renderProtocolConfig = () => {
    const protocol = formData.integration?.protocol || 'email';

    switch (protocol) {
      case 'rest':
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>REST API Konfiguration</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Base URL"
                  value={formData.integration?.rest?.baseUrl || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      integration: {
                        protocol: formData.integration?.protocol || 'rest',
                        ...formData.integration,
                        rest: {
                          ...formData.integration?.rest,
                          baseUrl: e.target.value,
                        },
                      },
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Submit Claim Endpoint"
                  value={formData.integration?.rest?.endpoints?.submitClaim || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      integration: {
                        protocol: formData.integration?.protocol || 'rest',
                        ...formData.integration,
                        rest: {
                          ...formData.integration?.rest,
                          endpoints: {
                            ...formData.integration?.rest?.endpoints,
                            submitClaim: e.target.value,
                          },
                        },
                      },
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Authentifizierung</InputLabel>
                  <Select
                    value={formData.integration?.rest?.authType || 'api-key'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integration: {
                          protocol: formData.integration?.protocol || 'rest',
                          ...formData.integration,
                          rest: {
                            ...formData.integration?.rest,
                            authType: e.target.value as any,
                          },
                        },
                      })
                    }
                  >
                    <MenuItem value="none">Keine</MenuItem>
                    <MenuItem value="api-key">API Key</MenuItem>
                    <MenuItem value="bearer">Bearer Token</MenuItem>
                    <MenuItem value="basic">Basic Auth</MenuItem>
                    <MenuItem value="oauth2">OAuth2</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="password"
                  label="API Key"
                  value={formData.integration?.rest?.apiKey || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      integration: {
                        protocol: formData.integration?.protocol || 'rest',
                        ...formData.integration,
                        rest: {
                          ...formData.integration?.rest,
                          apiKey: e.target.value,
                        },
                      },
                    })
                  }
                />
              </Grid>
              {formData.integration?.rest?.authType === 'basic' && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="password"
                    label="API Secret"
                    value={formData.integration?.rest?.apiSecret || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integration: {
                          protocol: formData.integration?.protocol || 'rest',
                          ...formData.integration,
                          rest: {
                            ...formData.integration?.rest,
                            apiSecret: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </Grid>
              )}
              {formData.integration?.rest?.authType === 'oauth2' && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Client ID"
                      value={formData.integration?.rest?.clientId || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          integration: {
                            protocol: formData.integration?.protocol || 'rest',
                            ...formData.integration,
                            rest: {
                              ...formData.integration?.rest,
                              clientId: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="password"
                      label="Client Secret"
                      value={formData.integration?.rest?.clientSecret || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          integration: {
                            protocol: formData.integration?.protocol || 'rest',
                            ...formData.integration,
                            rest: {
                              ...formData.integration?.rest,
                              clientSecret: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Token URL"
                      value={formData.integration?.rest?.tokenUrl || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          integration: {
                            protocol: formData.integration?.protocol || 'rest',
                            ...formData.integration,
                            rest: {
                              ...formData.integration?.rest,
                              tokenUrl: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        );
      case 'email':
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>E-Mail Konfiguration</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="E-Mail Adresse für Anträge"
                  type="email"
                  value={formData.integration?.email?.to || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      integration: {
                        protocol: formData.integration?.protocol || 'email',
                        ...formData.integration,
                        email: {
                          ...formData.integration?.email,
                          to: e.target.value,
                        },
                      },
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Betreff-Vorlage"
                  value={formData.integration?.email?.subjectTemplate || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      integration: {
                        protocol: formData.integration?.protocol || 'email',
                        ...formData.integration,
                        email: {
                          ...formData.integration?.email,
                          subjectTemplate: e.target.value,
                        },
                      },
                    })
                  }
                  helperText="Verwenden Sie {invoiceNumber} und {patientName} als Platzhalter"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.integration?.email?.requiresPDF ?? true}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          integration: {
                            protocol: formData.integration?.protocol || 'email',
                            ...formData.integration,
                            email: {
                              ...formData.integration?.email,
                              requiresPDF: e.target.checked,
                            },
                          },
                        })
                      }
                    />
                  }
                  label="PDF-Anhang erforderlich"
                />
              </Grid>
            </Grid>
          </Box>
        );
      case 'platform-mycare':
      case 'platform-rehadirekt':
      case 'platform-eabrechnung':
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Die Plattform-Integration wird über die Direktverrechnungs-Services gehandhabt.
              Bitte konfigurieren Sie die Zugangsdaten in den Umgebungsvariablen.
            </Alert>
          </Box>
        );
      default:
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info">
              Konfiguration für dieses Protokoll wird noch nicht unterstützt.
            </Alert>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HealthAndSafetyIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4">Versicherungsverwaltung</Typography>
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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchProviders}
            disabled={loading}
          >
            Aktualisieren
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Neue Versicherung
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Protokoll</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Statistiken</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {providers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Keine Versicherungen konfiguriert
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                providers.map((provider) => (
                  <TableRow key={provider._id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {provider.name}
                      </Typography>
                      {provider.description && (
                        <Typography variant="caption" color="text.secondary">
                          {provider.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={provider.code} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getProtocolIcon(provider.integration?.protocol || 'email')}
                        <Typography variant="body2">
                          {getProtocolLabel(provider.integration?.protocol || 'email')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={provider.isActive ? 'Aktiv' : 'Inaktiv'}
                        color={provider.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {provider.stats && (
                        <Box>
                          <Typography variant="caption" display="block">
                            Erfolgreich: {provider.stats.successfulSubmissions}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            Fehlgeschlagen: {provider.stats.failedSubmissions}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Bearbeiten">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(provider)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Testen">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedProvider(provider);
                              setTestDialogOpen(true);
                              handleTestConnection();
                            }}
                          >
                            <TestTubeIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Löschen">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedProvider(provider);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Bearbeitungs-Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedProvider ? 'Versicherung bearbeiten' : 'Neue Versicherung erstellen'}
        </DialogTitle>
        <DialogContent>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
            <Tab label="Grunddaten" />
            <Tab label="Integration" />
            <Tab label="Erweitert" />
          </Tabs>

          {activeTab === 0 && (
            <Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Name *"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Code *"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                    helperText="Eindeutiger Code (Großbuchstaben)"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Beschreibung"
                    multiline
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Kontaktdaten
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="E-Mail"
                    type="email"
                    value={formData.contact?.email || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: {
                          ...formData.contact,
                          email: e.target.value,
                        },
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Telefon"
                    value={formData.contact?.phone || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: {
                          ...formData.contact,
                          phone: e.target.value,
                        },
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Website"
                    value={formData.contact?.website || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: {
                          ...formData.contact,
                          website: e.target.value,
                        },
                      })
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Protokoll *</InputLabel>
                <Select
                  value={formData.integration?.protocol || 'email'}
                  onChange={(e) => {
                    const protocol = e.target.value as InsuranceProvider['integration']['protocol'];
                    setFormData({
                      ...formData,
                      integration: {
                        ...formData.integration,
                        protocol,
                        // Ensure other integration types are reset or initialized when protocol changes
                        rest: protocol === 'rest' ? (formData.integration?.rest || {
                          baseUrl: '',
                          endpoints: {
                            submitClaim: '/api/v1/claims/submit',
                            getStatus: '/api/v1/claims/status/:claimId',
                            validatePolicy: '/api/v1/policies/validate',
                          },
                          authType: 'api-key',
                          apiKey: '',
                          apiSecret: '',
                          clientId: '',
                          clientSecret: '',
                          tokenUrl: '',
                          headers: {},
                        }) : undefined,
                        fhir: protocol === 'fhir' ? (formData.integration?.fhir || {
                          baseUrl: '',
                          endpoint: '/Claim',
                          authType: 'none',
                          apiKey: '',
                          clientId: '',
                          clientSecret: '',
                        }) : undefined,
                        soap: protocol === 'soap' ? (formData.integration?.soap || {
                          wsdlUrl: '',
                          endpoint: '',
                          namespace: 'http://schemas.xmlsoap.org/soap/envelope/',
                          username: '',
                          password: '',
                        }) : undefined,
                        email: protocol === 'email' ? (formData.integration?.email || {
                          to: '',
                          subjectTemplate: 'Versicherungsantrag - {invoiceNumber}',
                          cc: [],
                          bcc: [],
                          requiresPDF: true,
                        }) : undefined,
                        pdf: protocol === 'pdf' ? (formData.integration?.pdf || {
                          template: 'standard',
                          requiredFields: [],
                          outputFormat: 'standard',
                        }) : undefined,
                        platform: (protocol as string).startsWith('platform-') ? (formData.integration?.platform || {
                          type: protocol.replace('platform-', '') as 'myCare' | 'rehaDirekt' | 'eAbrechnung',
                          config: {},
                        }) : undefined,
                        // Preserve format, timeout, retry regardless of protocol
                        format: formData.integration?.format || {
                          requestFormat: 'JSON',
                          responseFormat: 'JSON',
                          dateFormat: 'ISO8601',
                          currency: 'EUR',
                        },
                        timeout: formData.integration?.timeout || {
                          connect: 10000,
                          request: 30000,
                        },
                        retry: formData.integration?.retry || {
                          enabled: true,
                          maxAttempts: 3,
                          backoffStrategy: 'exponential',
                        },
                      },
                    });
                  }}
                >
                  <MenuItem value="rest">REST API</MenuItem>
                  <MenuItem value="fhir">FHIR</MenuItem>
                  <MenuItem value="soap">SOAP/XML</MenuItem>
                  <MenuItem value="email">E-Mail</MenuItem>
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="platform-mycare">myCare</MenuItem>
                  <MenuItem value="platform-rehadirekt">RehaDirekt</MenuItem>
                  <MenuItem value="platform-eabrechnung">eAbrechnung</MenuItem>
                  <MenuItem value="manual">Manuell</MenuItem>
                </Select>
              </FormControl>

              {renderProtocolConfig()}

              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Fallback-Konfiguration</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.fallback?.enabled ?? true}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            fallback: {
                              ...formData.fallback,
                              enabled: e.target.checked,
                            },
                          })
                        }
                      />
                    }
                    label="Fallback aktiviert"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.fallback?.autoFallback ?? true}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            fallback: {
                              ...formData.fallback,
                              autoFallback: e.target.checked,
                            },
                          })
                        }
                      />
                    }
                    label="Automatisches Fallback"
                  />
                </AccordionDetails>
              </Accordion>
            </Box>
          )}

          {activeTab === 2 && (
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Aktiv"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.testMode ?? false}
                    onChange={(e) => setFormData({ ...formData, testMode: e.target.checked })}
                  />
                }
                label="Test-Modus"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSave} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lösch-Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Versicherung löschen?</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie die Versicherung "{selectedProvider?.name}" wirklich löschen?
            Die Versicherung wird deaktiviert, kann aber später wieder aktiviert werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test-Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)}>
        <DialogTitle>Verbindungstest</DialogTitle>
        <DialogContent>
          {testing ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          ) : testResult ? (
            <Box>
              {testResult.success ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Verbindung erfolgreich!
                  {testResult.data?.status && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Status: {testResult.data.status}
                    </Typography>
                  )}
                </Alert>
              ) : (
                <Alert severity="error">
                  Verbindung fehlgeschlagen: {testResult.error || testResult.message}
                </Alert>
              )}
            </Box>
          ) : (
            <Typography>Klicken Sie auf "Testen", um die Verbindung zu prüfen.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Schließen</Button>
          {selectedProvider && (
            <Button onClick={handleTestConnection} variant="contained" disabled={testing}>
              Testen
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Hilfe & Leitfaden Dialog */}
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
          title="Hilfe & Leitfaden: Versicherungsverwaltung"
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
            <Tab label="Versicherung erstellen" />
            <Tab label="Integration" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Versicherungsverwaltung
                </Typography>
                <Typography variant="body1" paragraph>
                  Die Versicherungsverwaltung ermöglicht es, Versicherungsanbieter zu verwalten, 
                  zu konfigurieren und zu integrieren.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>➕ <strong>Versicherung erstellen:</strong> Neue Versicherungen anlegen</li>
                  <li>✏️ <strong>Versicherung bearbeiten:</strong> Bestehende Versicherungen ändern</li>
                  <li>🔗 <strong>Integration:</strong> REST API und E-Mail Integration</li>
                  <li>⚙️ <strong>Konfiguration:</strong> Versicherungsspezifische Einstellungen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Neue Versicherung erstellen
                </Typography>
                <Typography variant="body2" paragraph>
                  So erstellen Sie eine neue Versicherung:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt Anleitung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf "Neue Versicherung"</li>
                  <li>Geben Sie die Versicherungs-Daten ein:
                    <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                      <li><strong>Name:</strong> Versicherungsname</li>
                      <li><strong>Code:</strong> Versicherungscode</li>
                      <li><strong>Kontaktdaten:</strong> Adresse, Telefon, E-Mail</li>
                      <li><strong>Integration:</strong> REST API oder E-Mail</li>
                    </Box>
                  </li>
                  <li>Konfigurieren Sie die Integration</li>
                  <li>Klicken Sie auf "Speichern"</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Integration
                </Typography>
                <Typography variant="body2" paragraph>
                  Versicherungen können über REST API oder E-Mail integriert werden:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Integrationsarten
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>🌐 <strong>REST API:</strong> Automatische Integration über API</li>
                  <li>📧 <strong>E-Mail:</strong> Integration über E-Mail-Versand</li>
                  <li>🔐 <strong>Authentifizierung:</strong> API-Schlüssel und Zertifikate</li>
                  <li>📋 <strong>Templates:</strong> E-Mail-Vorlagen konfigurieren</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Versicherungsverwaltung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Halten Sie Versicherungsdaten aktuell</li>
                  <li>✅ Testen Sie Integrationen regelmäßig</li>
                  <li>✅ Dokumentieren Sie API-Konfigurationen</li>
                  <li>✅ Verwenden Sie sichere Authentifizierung</li>
                </Box>
              </Box>
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

export default InsuranceProviderManagement;

