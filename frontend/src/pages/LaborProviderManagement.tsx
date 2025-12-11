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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSnackbar } from 'notistack';

interface LaborProvider {
  _id: string;
  name: string;
  code: string;
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
  };
  integration: {
    protocol: 'fhir' | 'hl7v2' | 'hl7v3' | 'rest' | 'ftp' | 'sftp' | 'email' | 'manual';
    fhir?: {
      baseUrl?: string;
      endpoint?: string;
      authType?: 'none' | 'basic' | 'bearer' | 'oauth2' | 'certificate';
      apiKey?: string;
    };
    hl7v2?: {
      mllpHost?: string;
      mllpPort?: number;
      encoding?: 'UTF-8' | 'ISO-8859-1';
    };
    rest?: {
      baseUrl?: string;
      apiKey?: string;
      webhookUrl?: string;
    };
    ftp?: {
      host?: string;
      port?: number;
      username?: string;
      password?: string;
      path?: string;
      secure?: boolean;
    };
    email?: {
      imapHost?: string;
      imapPort?: number;
      username?: string;
      password?: string;
      folder?: string;
    };
  };
  mapping: {
    patientMatching: 'name-dob' | 'insurance-number' | 'ssn' | 'external-id' | 'multiple';
    autoMapCodes?: boolean;
  };
  isActive: boolean;
  lastSync?: Date;
  syncStatus?: 'success' | 'error' | 'pending';
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

const LaborProviderManagement: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [providers, setProviders] = useState<LaborProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<LaborProvider | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    description: string;
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
      protocol: 'fhir' | 'hl7v2' | 'hl7v3' | 'rest' | 'ftp' | 'sftp' | 'email' | 'manual';
      fhir: {
        baseUrl: string;
        endpoint: string;
        authType: 'none' | 'basic' | 'bearer' | 'oauth2' | 'certificate';
        apiKey: string;
      };
      rest: {
        baseUrl: string;
        apiKey: string;
        webhookUrl: string;
      };
    };
    mapping: {
      patientMatching: 'name-dob' | 'insurance-number' | 'ssn' | 'external-id' | 'multiple';
      autoMapCodes: boolean;
    };
    isActive: boolean;
  }>({
    name: '',
    code: '',
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
    },
    integration: {
      protocol: 'fhir',
      fhir: {
        baseUrl: '',
        endpoint: '',
        authType: 'none',
        apiKey: '',
      },
      rest: {
        baseUrl: '',
        apiKey: '',
        webhookUrl: '',
      },
    },
    mapping: {
      patientMatching: 'name-dob',
      autoMapCodes: true,
    },
    isActive: true,
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: LaborProvider[] }>('/labor/providers');
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

  const handleOpenDialog = (provider?: LaborProvider) => {
    if (provider) {
      setSelectedProvider(provider);
      setFormData({
        name: provider.name,
        code: provider.code,
        description: provider.description || '',
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
          protocol: provider.integration.protocol,
          fhir: {
            baseUrl: provider.integration.fhir?.baseUrl || '',
            endpoint: provider.integration.fhir?.endpoint || '',
            authType: provider.integration.fhir?.authType || 'none',
            apiKey: provider.integration.fhir?.apiKey || '',
          },
          rest: {
            baseUrl: provider.integration.rest?.baseUrl || '',
            apiKey: provider.integration.rest?.apiKey || '',
            webhookUrl: provider.integration.rest?.webhookUrl || '',
          },
        },
        mapping: {
          patientMatching: provider.mapping.patientMatching,
          autoMapCodes: provider.mapping.autoMapCodes !== false,
        },
        isActive: provider.isActive,
      });
    } else {
      setSelectedProvider(null);
      setFormData({
        name: '',
        code: '',
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
        },
        integration: {
          protocol: 'fhir',
          fhir: {
            baseUrl: '',
            endpoint: '',
            authType: 'none',
            apiKey: '',
          },
          rest: {
            baseUrl: '',
            apiKey: '',
            webhookUrl: '',
          },
        },
        mapping: {
          patientMatching: 'name-dob',
          autoMapCodes: true,
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
        const response = await api.put<{ success: boolean; message?: string }>(
          `/labor/providers/${selectedProvider._id}`,
          formData
        );
        if (response.data?.success) {
          enqueueSnackbar('Provider erfolgreich aktualisiert', { variant: 'success' });
          fetchProviders();
          handleCloseDialog();
        }
      } else {
        const response = await api.post<{ success: boolean; message?: string }>(
          '/labor/providers',
          formData
        );
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
      const response = await api.delete<{ success: boolean; message?: string }>(
        `/labor/providers/${selectedProvider._id}`
      );
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Labor-Provider-Verwaltung</Typography>
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
                <TableCell>Protokoll</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Sync-Status</TableCell>
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
                    <TableCell>{provider.integration.protocol.toUpperCase()}</TableCell>
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
                      {provider.syncStatus && (
                        <Chip
                          label={provider.syncStatus}
                          size="small"
                          color={
                            provider.syncStatus === 'success'
                              ? 'success'
                              : provider.syncStatus === 'error'
                              ? 'error'
                              : 'default'
                          }
                        />
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
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
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
                  <InputLabel>Protokoll</InputLabel>
                  <Select
                    value={formData.integration.protocol}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integration: {
                          ...formData.integration,
                          protocol: e.target.value as any,
                        },
                      })
                    }
                  >
                    <MenuItem value="fhir">FHIR</MenuItem>
                    <MenuItem value="hl7v2">HL7 v2</MenuItem>
                    <MenuItem value="hl7v3">HL7 v3</MenuItem>
                    <MenuItem value="rest">REST API</MenuItem>
                    <MenuItem value="ftp">FTP</MenuItem>
                    <MenuItem value="sftp">SFTP</MenuItem>
                    <MenuItem value="email">E-Mail</MenuItem>
                    <MenuItem value="manual">Manuell</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '250px' }}>
                <FormControl fullWidth>
                  <InputLabel>Patienten-Matching</InputLabel>
                  <Select
                    value={formData.mapping.patientMatching}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mapping: {
                          ...formData.mapping,
                          patientMatching: e.target.value as any,
                        },
                      })
                    }
                  >
                    <MenuItem value="name-dob">Name + Geburtsdatum</MenuItem>
                    <MenuItem value="insurance-number">Versicherungsnummer</MenuItem>
                    <MenuItem value="ssn">Sozialversicherungsnummer</MenuItem>
                    <MenuItem value="external-id">Externe ID</MenuItem>
                    <MenuItem value="multiple">Mehrere Strategien</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* FHIR Konfiguration */}
            {formData.integration.protocol === 'fhir' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2">FHIR-Konfiguration</Typography>
                <TextField
                  fullWidth
                  label="Base URL"
                  value={formData.integration.fhir.baseUrl}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      integration: {
                        ...formData.integration,
                        fhir: {
                          ...formData.integration.fhir,
                          baseUrl: e.target.value,
                        },
                      },
                    })
                  }
                />
                <TextField
                  fullWidth
                  label="Endpoint"
                  value={formData.integration.fhir.endpoint}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      integration: {
                        ...formData.integration,
                        fhir: {
                          ...formData.integration.fhir,
                          endpoint: e.target.value,
                        },
                      },
                    })
                  }
                />
                <FormControl fullWidth>
                  <InputLabel>Authentifizierung</InputLabel>
                  <Select
                    value={formData.integration.fhir.authType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integration: {
                          ...formData.integration,
                          fhir: {
                            ...formData.integration.fhir,
                            authType: e.target.value as any,
                          },
                        },
                      })
                    }
                  >
                    <MenuItem value="none">Keine</MenuItem>
                    <MenuItem value="basic">Basic Auth</MenuItem>
                    <MenuItem value="bearer">Bearer Token</MenuItem>
                    <MenuItem value="oauth2">OAuth2</MenuItem>
                    <MenuItem value="certificate">Zertifikat</MenuItem>
                  </Select>
                </FormControl>
                {formData.integration.fhir.authType !== 'none' && (
                  <TextField
                    fullWidth
                    label="API Key / Token"
                    type="password"
                    value={formData.integration.fhir.apiKey}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integration: {
                          ...formData.integration,
                          fhir: {
                            ...formData.integration.fhir,
                            apiKey: e.target.value,
                          },
                        },
                      })
                    }
                  />
                )}
              </Box>
            )}

            {/* REST Konfiguration */}
            {formData.integration.protocol === 'rest' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2">REST API-Konfiguration</Typography>
                <TextField
                  fullWidth
                  label="Base URL"
                  value={formData.integration.rest.baseUrl}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      integration: {
                        ...formData.integration,
                        rest: {
                          ...formData.integration.rest,
                          baseUrl: e.target.value,
                        },
                      },
                    })
                  }
                />
                <TextField
                  fullWidth
                  label="Webhook URL"
                  value={formData.integration.rest.webhookUrl}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      integration: {
                        ...formData.integration,
                        rest: {
                          ...formData.integration.rest,
                          webhookUrl: e.target.value,
                        },
                      },
                    })
                  }
                />
                <TextField
                  fullWidth
                  label="API Key"
                  type="password"
                  value={formData.integration.rest.apiKey}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      integration: {
                        ...formData.integration,
                        rest: {
                          ...formData.integration.rest,
                          apiKey: e.target.value,
                        },
                      },
                    })
                  }
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '250px' }}>
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Automatisches Code-Mapping
                  </Typography>
                  <Switch
                    checked={formData.mapping.autoMapCodes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mapping: {
                          ...formData.mapping,
                          autoMapCodes: e.target.checked,
                        },
                      })
                    }
                  />
                </Box>
              </Box>
              <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '250px' }}>
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
    </Box>
  );
};

export default LaborProviderManagement;














