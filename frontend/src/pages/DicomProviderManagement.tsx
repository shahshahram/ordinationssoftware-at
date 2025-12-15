import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VpnKey as VpnKeyIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSnackbar } from 'notistack';

interface DicomProvider {
  _id: string;
  name: string;
  code: string;
  description?: string;
  type: 'radiology' | 'imaging' | 'hospital' | 'clinic' | 'other';
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
  };
  integration: {
    protocol: 'rest' | 'dicomweb' | 'dicom-cstore' | 'fhir' | 'hl7-cda' | 'dicom-sr' | 'email' | 'ftp' | 'sftp' | 'manual';
    rest?: {
      webhookUrl?: string;
      apiKey?: string;
      apiSecret?: string;
      authType?: 'none' | 'api-key' | 'bearer' | 'basic' | 'oauth2';
    };
    dicomweb?: {
      baseUrl?: string;
      qidoEndpoint?: string;
      wadoEndpoint?: string;
      stowEndpoint?: string;
      authType?: 'none' | 'basic' | 'bearer' | 'oauth2';
      apiKey?: string;
      clientId?: string;
      clientSecret?: string;
      username?: string;
      password?: string;
    };
    dicomCStore?: {
      aeTitle?: string;
      host?: string;
      port?: number;
      timeout?: number;
    };
  };
  mapping: {
    patientMatching: 'name-dob' | 'patient-id' | 'insurance-number' | 'ssn' | 'external-id' | 'multiple';
    allowAutoCreatePatient?: boolean;
    allowedModalities?: string[];
  };
  security?: {
    ipWhitelist?: string[];
    maxFileSize?: number;
  };
  notifications?: {
    notifyOnUpload?: boolean;
    notifyOnError?: boolean;
  };
  isActive: boolean;
  stats?: {
    totalUploads: number;
    successfulUploads: number;
    failedUploads: number;
    lastUpload?: Date;
  };
  createdAt: string;
  updatedAt: string;
}

const DicomProviderManagement: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [providers, setProviders] = useState<DicomProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<DicomProvider | null>(null);
  const [newApiKey, setNewApiKey] = useState<string>('');
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    description: string;
    type: 'radiology' | 'imaging' | 'hospital' | 'clinic' | 'other';
    contact: {
      address: {
        street: string;
        city: string;
        postalCode: string;
        country: string;
      };
      phone: string;
      email: string;
      website: string;
    };
    integration: {
      protocol: 'rest' | 'dicomweb' | 'dicom-cstore' | 'fhir' | 'hl7-cda' | 'dicom-sr' | 'email' | 'ftp' | 'sftp' | 'manual';
      rest: {
        webhookUrl: string;
        authType: 'none' | 'api-key' | 'bearer' | 'basic' | 'oauth2';
      };
      dicomweb: {
        baseUrl: string;
        qidoEndpoint: string;
        wadoEndpoint: string;
        stowEndpoint: string;
        authType: 'none' | 'basic' | 'bearer' | 'oauth2';
        apiKey: string;
        clientId: string;
        clientSecret: string;
        username: string;
        password: string;
      };
      dicomCStore: {
        aeTitle: string;
        host: string;
        port: number;
        timeout: number;
      };
    };
    mapping: {
      patientMatching: 'name-dob' | 'patient-id' | 'insurance-number' | 'ssn' | 'external-id' | 'multiple';
      allowAutoCreatePatient: boolean;
      allowedModalities: string[];
    };
    security: {
      ipWhitelist: string[];
      maxFileSize: number;
    };
    notifications: {
      notifyOnUpload: boolean;
      notifyOnError: boolean;
    };
    isActive: boolean;
  }>({
    name: '',
    code: '',
    description: '',
    type: 'radiology',
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
    },
    integration: {
      protocol: 'rest',
      rest: {
        webhookUrl: '',
        authType: 'api-key',
      },
      dicomweb: {
        baseUrl: '',
        qidoEndpoint: '/dicomweb/studies',
        wadoEndpoint: '/dicomweb/wado',
        stowEndpoint: '/dicomweb/stow',
        authType: 'none',
        apiKey: '',
        clientId: '',
        clientSecret: '',
        username: '',
        password: '',
      },
      dicomCStore: {
        aeTitle: '',
        host: '',
        port: 104,
        timeout: 30000,
      },
    },
    mapping: {
      patientMatching: 'name-dob',
      allowAutoCreatePatient: false,
      allowedModalities: [],
    },
    security: {
      ipWhitelist: [],
      maxFileSize: 500,
    },
    notifications: {
      notifyOnUpload: true,
      notifyOnError: true,
    },
    isActive: true,
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: DicomProvider[] }>('/dicom-providers');
      if (response.data?.success) {
        setProviders(response.data.data);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Provider', { variant: 'error' });
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (provider?: DicomProvider) => {
    if (provider) {
      setSelectedProvider(provider);
      setFormData({
        name: provider.name,
        code: provider.code,
        description: provider.description || '',
        type: provider.type,
        contact: {
          address: {
            street: provider.contact?.address?.street || '',
            city: provider.contact?.address?.city || '',
            postalCode: provider.contact?.address?.postalCode || '',
            country: provider.contact?.address?.country || 'Österreich',
          },
          phone: provider.contact?.phone || '',
          email: provider.contact?.email || '',
          website: provider.contact?.website || '',
        },
        integration: {
          protocol: (provider.integration.protocol || 'rest') as any,
          rest: {
            webhookUrl: provider.integration.rest?.webhookUrl || '',
            authType: (provider.integration.rest?.authType || 'api-key') as 'api-key',
          },
          dicomweb: {
            baseUrl: provider.integration.dicomweb?.baseUrl || '',
            qidoEndpoint: provider.integration.dicomweb?.qidoEndpoint || '/dicomweb/studies',
            wadoEndpoint: provider.integration.dicomweb?.wadoEndpoint || '/dicomweb/wado',
            stowEndpoint: provider.integration.dicomweb?.stowEndpoint || '/dicomweb/stow',
            authType: (provider.integration.dicomweb?.authType || 'none') as any,
            apiKey: provider.integration.dicomweb?.apiKey || '',
            clientId: provider.integration.dicomweb?.clientId || '',
            clientSecret: provider.integration.dicomweb?.clientSecret || '',
            username: provider.integration.dicomweb?.username || '',
            password: provider.integration.dicomweb?.password || '',
          },
          dicomCStore: {
            aeTitle: provider.integration.dicomCStore?.aeTitle || '',
            host: provider.integration.dicomCStore?.host || '',
            port: provider.integration.dicomCStore?.port || 104,
            timeout: provider.integration.dicomCStore?.timeout || 30000,
          },
        },
        mapping: {
          patientMatching: provider.mapping.patientMatching || 'name-dob',
          allowAutoCreatePatient: provider.mapping.allowAutoCreatePatient || false,
          allowedModalities: provider.mapping.allowedModalities || [],
        },
        security: {
          ipWhitelist: provider.security?.ipWhitelist || [],
          maxFileSize: provider.security?.maxFileSize || 500,
        },
        notifications: {
          notifyOnUpload: provider.notifications?.notifyOnUpload !== false,
          notifyOnError: provider.notifications?.notifyOnError !== false,
        },
        isActive: provider.isActive,
      });
    } else {
      setSelectedProvider(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        type: 'radiology',
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
        },
        integration: {
          protocol: 'rest',
          rest: {
            webhookUrl: '',
            authType: 'api-key',
          },
          dicomweb: {
            baseUrl: '',
            qidoEndpoint: '/dicomweb/studies',
            wadoEndpoint: '/dicomweb/wado',
            stowEndpoint: '/dicomweb/stow',
            authType: 'none',
            apiKey: '',
            clientId: '',
            clientSecret: '',
            username: '',
            password: '',
          },
          dicomCStore: {
            aeTitle: '',
            host: '',
            port: 104,
            timeout: 30000,
          },
        },
        mapping: {
          patientMatching: 'name-dob',
          allowAutoCreatePatient: false,
          allowedModalities: [],
        },
        security: {
          ipWhitelist: [],
          maxFileSize: 500,
        },
        notifications: {
          notifyOnUpload: true,
          notifyOnError: true,
        },
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedProvider(null);
  };

  const handleSave = async () => {
    try {
      if (selectedProvider) {
        // Update
        const response = await api.put<{ success: boolean; message?: string }>(`/dicom-providers/${selectedProvider._id}`, formData);
        if (response.data?.success) {
          enqueueSnackbar('Provider erfolgreich aktualisiert', { variant: 'success' });
          fetchProviders();
          handleCloseDialog();
        }
      } else {
        // Create
        const response = await api.post<{ success: boolean; message?: string }>('/dicom-providers', formData);
        if (response.data?.success) {
          enqueueSnackbar('Provider erfolgreich erstellt', { variant: 'success' });
          fetchProviders();
          handleCloseDialog();
        }
      }
    } catch (error: any) {
      enqueueSnackbar(
        error.response?.data?.message || 'Fehler beim Speichern des Providers',
        { variant: 'error' }
      );
    }
  };

  const handleDelete = async () => {
    if (!selectedProvider) return;
    
    try {
      const response = await api.delete<{ success: boolean; message?: string }>(`/dicom-providers/${selectedProvider._id}`);
      if (response.data?.success) {
        enqueueSnackbar('Provider erfolgreich gelöscht', { variant: 'success' });
        fetchProviders();
        setDeleteDialogOpen(false);
        setSelectedProvider(null);
      }
    } catch (error: any) {
      enqueueSnackbar(
        error.response?.data?.message || 'Fehler beim Löschen des Providers',
        { variant: 'error' }
      );
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!selectedProvider) return;
    
    try {
      const response = await api.post<{ success: boolean; data: { apiKey: string } }>(`/dicom-providers/${selectedProvider._id}/regenerate-api-key`);
      if (response.data?.success) {
        setNewApiKey(response.data.data.apiKey);
        enqueueSnackbar('API-Key erfolgreich neu generiert', { variant: 'success' });
        fetchProviders();
      }
    } catch (error: any) {
      enqueueSnackbar(
        error.response?.data?.message || 'Fehler beim Regenerieren des API-Keys',
        { variant: 'error' }
      );
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">DICOM-Provider-Verwaltung</Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchProviders}
            sx={{ mr: 2 }}
          >
            Aktualisieren
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Neuer Provider
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
                <TableCell>Typ</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Statistiken</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {providers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Keine Provider gefunden
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                providers.map((provider) => (
                  <TableRow key={provider._id}>
                    <TableCell>{provider.name}</TableCell>
                    <TableCell>
                      <Chip label={provider.code} size="small" />
                    </TableCell>
                    <TableCell>{provider.type}</TableCell>
                    <TableCell>
                      {provider.isActive ? (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Aktiv"
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<CancelIcon />}
                          label="Inaktiv"
                          color="default"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {provider.stats && (
                        <Typography variant="body2">
                          {provider.stats.successfulUploads} / {provider.stats.totalUploads} erfolgreich
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(provider)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedProvider(provider);
                          setApiKeyDialogOpen(true);
                        }}
                      >
                        <VpnKeyIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedProvider(provider);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={provider.isActive}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedProvider ? 'Provider bearbeiten' : 'Neuer Provider'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              </Box>
              <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
                disabled={!!selectedProvider}
              />
              </Box>
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Beschreibung"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '250px' }}>
              <FormControl fullWidth>
                <InputLabel>Typ</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <MenuItem value="radiology">Radiologie</MenuItem>
                  <MenuItem value="imaging">Bildgebung</MenuItem>
                  <MenuItem value="hospital">Krankenhaus</MenuItem>
                  <MenuItem value="clinic">Klinik</MenuItem>
                  <MenuItem value="other">Andere</MenuItem>
                </Select>
              </FormControl>
              </Box>
              <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '250px' }}>
              <FormControl fullWidth>
                <InputLabel>Protokoll</InputLabel>
                <Select
                  value={formData.integration.protocol}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      integration: { ...formData.integration, protocol: e.target.value as any },
                    })
                  }
                >
                  <MenuItem value="rest">REST (Webhook)</MenuItem>
                  <MenuItem value="dicomweb">DICOMweb (QIDO/WADO/STOW)</MenuItem>
                  <MenuItem value="dicom-cstore">DICOM C-STORE</MenuItem>
                  <MenuItem value="manual">Manuell</MenuItem>
                </Select>
              </FormControl>
              </Box>
            </Box>
            
            {/* REST Konfiguration */}
            {formData.integration.protocol === 'rest' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2">REST Webhook Konfiguration</Typography>
                <TextField
                  fullWidth
                  label="Webhook URL"
                  value={formData.integration.rest.webhookUrl}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      integration: {
                        ...formData.integration,
                        rest: { ...formData.integration.rest, webhookUrl: e.target.value },
                      },
                    })
                  }
                  helperText="URL für eingehende DICOM-Dateien (wird automatisch generiert)"
                  disabled
                />
                <FormControl fullWidth>
                  <InputLabel>Authentifizierung</InputLabel>
                  <Select
                    value={formData.integration.rest.authType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integration: {
                          ...formData.integration,
                          rest: { ...formData.integration.rest, authType: e.target.value as any },
                        },
                      })
                    }
                  >
                    <MenuItem value="none">Keine</MenuItem>
                    <MenuItem value="api-key">API-Key</MenuItem>
                    <MenuItem value="bearer">Bearer Token</MenuItem>
                    <MenuItem value="basic">Basic Auth</MenuItem>
                    <MenuItem value="oauth2">OAuth2</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* DICOMweb Konfiguration */}
            {formData.integration.protocol === 'dicomweb' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2">DICOMweb Konfiguration (für aktive Abfrage von PACS/RIS)</Typography>
                <TextField
                  fullWidth
                  label="Base URL"
                  value={formData.integration.dicomweb.baseUrl}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      integration: {
                        ...formData.integration,
                        dicomweb: { ...formData.integration.dicomweb, baseUrl: e.target.value },
                      },
                    })
                  }
                  placeholder="https://pacs.example.com"
                  required
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="QIDO Endpoint"
                    value={formData.integration.dicomweb.qidoEndpoint}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integration: {
                          ...formData.integration,
                          dicomweb: { ...formData.integration.dicomweb, qidoEndpoint: e.target.value },
                        },
                      })
                    }
                    placeholder="/dicomweb/studies"
                  />
                  <TextField
                    fullWidth
                    label="WADO Endpoint"
                    value={formData.integration.dicomweb.wadoEndpoint}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integration: {
                          ...formData.integration,
                          dicomweb: { ...formData.integration.dicomweb, wadoEndpoint: e.target.value },
                        },
                      })
                    }
                    placeholder="/dicomweb/wado"
                  />
                </Box>
                <FormControl fullWidth>
                  <InputLabel>Authentifizierung</InputLabel>
                  <Select
                    value={formData.integration.dicomweb.authType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integration: {
                          ...formData.integration,
                          dicomweb: { ...formData.integration.dicomweb, authType: e.target.value as any },
                        },
                      })
                    }
                  >
                    <MenuItem value="none">Keine</MenuItem>
                    <MenuItem value="basic">Basic Auth</MenuItem>
                    <MenuItem value="bearer">Bearer Token</MenuItem>
                    <MenuItem value="oauth2">OAuth2</MenuItem>
                  </Select>
                </FormControl>
                {formData.integration.dicomweb.authType === 'basic' && (
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="Benutzername"
                      value={formData.integration.dicomweb.username}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          integration: {
                            ...formData.integration,
                            dicomweb: { ...formData.integration.dicomweb, username: e.target.value },
                          },
                        })
                      }
                    />
                    <TextField
                      fullWidth
                      label="Passwort"
                      type="password"
                      value={formData.integration.dicomweb.password}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          integration: {
                            ...formData.integration,
                            dicomweb: { ...formData.integration.dicomweb, password: e.target.value },
                          },
                        })
                      }
                    />
                  </Box>
                )}
                {formData.integration.dicomweb.authType === 'bearer' && (
                  <TextField
                    fullWidth
                    label="API-Key / Bearer Token"
                    type="password"
                    value={formData.integration.dicomweb.apiKey}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integration: {
                          ...formData.integration,
                          dicomweb: { ...formData.integration.dicomweb, apiKey: e.target.value },
                        },
                      })
                    }
                  />
                )}
                {formData.integration.dicomweb.authType === 'oauth2' && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="Client ID"
                      value={formData.integration.dicomweb.clientId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          integration: {
                            ...formData.integration,
                            dicomweb: { ...formData.integration.dicomweb, clientId: e.target.value },
                          },
                        })
                      }
                    />
                    <TextField
                      fullWidth
                      label="Client Secret"
                      type="password"
                      value={formData.integration.dicomweb.clientSecret}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          integration: {
                            ...formData.integration,
                            dicomweb: { ...formData.integration.dicomweb, clientSecret: e.target.value },
                          },
                        })
                      }
                    />
                  </Box>
                )}
              </Box>
            )}

            {/* DICOM C-STORE Konfiguration */}
            {formData.integration.protocol === 'dicom-cstore' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle2">DICOM C-STORE Konfiguration (für direkte DICOM-Verbindung)</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="AE Title"
                    value={formData.integration.dicomCStore.aeTitle}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integration: {
                          ...formData.integration,
                          dicomCStore: { ...formData.integration.dicomCStore, aeTitle: e.target.value },
                        },
                      })
                    }
                    placeholder="PACS_SERVER"
                    required
                  />
                  <TextField
                    fullWidth
                    label="Host"
                    value={formData.integration.dicomCStore.host}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integration: {
                          ...formData.integration,
                          dicomCStore: { ...formData.integration.dicomCStore, host: e.target.value },
                        },
                      })
                    }
                    placeholder="pacs.example.com"
                    required
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Port"
                    type="number"
                    value={formData.integration.dicomCStore.port}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integration: {
                          ...formData.integration,
                          dicomCStore: { ...formData.integration.dicomCStore, port: parseInt(e.target.value) || 104 },
                        },
                      })
                    }
                    required
                  />
                  <TextField
                    fullWidth
                    label="Timeout (ms)"
                    type="number"
                    value={formData.integration.dicomCStore.timeout}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integration: {
                          ...formData.integration,
                          dicomCStore: { ...formData.integration.dicomCStore, timeout: parseInt(e.target.value) || 30000 },
                        },
                      })
                    }
                  />
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '250px' }}>
              <FormControl fullWidth>
                <InputLabel>Patienten-Matching</InputLabel>
                <Select
                  value={formData.mapping.patientMatching}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mapping: { ...formData.mapping, patientMatching: e.target.value },
                    })
                  }
                >
                  <MenuItem value="name-dob">Name + Geburtsdatum</MenuItem>
                  <MenuItem value="patient-id">Patient-ID</MenuItem>
                  <MenuItem value="multiple">Mehrere Strategien</MenuItem>
                </Select>
              </FormControl>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Max. Dateigröße (MB)"
                type="number"
                value={formData.security.maxFileSize}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    security: {
                      ...formData.security,
                      maxFileSize: parseInt(e.target.value) || 500,
                    },
                  })
                }
              />
              </Box>
              <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '250px' }}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Benachrichtigung bei Upload
                </Typography>
                <Switch
                  checked={formData.notifications.notifyOnUpload}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      notifications: {
                        ...formData.notifications,
                        notifyOnUpload: e.target.checked,
                      },
                    })
                  }
                />
              </Box>
              </Box>
            </Box>
            <Box>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Status
                </Typography>
                <Switch
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSave} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Provider löschen?</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie den Provider "{selectedProvider?.name}" wirklich löschen?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>

      {/* API Key Dialog */}
      <Dialog open={apiKeyDialogOpen} onClose={() => setApiKeyDialogOpen(false)}>
        <DialogTitle>API-Key verwalten</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Provider: {selectedProvider?.name}
          </Typography>
          <Divider sx={{ my: 2 }} />
          {newApiKey ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                WICHTIG: Speichern Sie diesen API-Key sicher. Er wird nicht erneut angezeigt!
              </Typography>
              <TextField
                fullWidth
                value={newApiKey}
                InputProps={{ readOnly: true }}
                sx={{ mt: 2 }}
              />
            </Alert>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Klicken Sie auf "Neu generieren", um einen neuen API-Key zu erstellen.
              Der alte API-Key wird dabei ungültig.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApiKeyDialogOpen(false)}>Schließen</Button>
          <Button onClick={handleRegenerateApiKey} variant="contained">
            Neu generieren
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DicomProviderManagement;

