import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../utils/api';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';
import GradientDialogTitle from '../components/GradientDialogTitle';
import { ServiceCodeMapping, CreateServiceCodeMappingData, UpdateServiceCodeMappingData } from '../types/ServiceCodeMapping';

const INSURANCE_PROVIDERS = [
  { value: 'oegk', label: 'ÖGK' },
  { value: 'bvaeb', label: 'BVAEB' },
  { value: 'svs', label: 'SVS' },
  { value: 'kfa', label: 'KFA' },
  { value: 'pva', label: 'PVA' },
  { value: 'vaeb', label: 'VAEB' },
  { value: 'auva', label: 'AUVA' }
];

const ServiceCodeMappingManagement: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { marginTopValue } = useGlobalNavigationOffset();
  
  const [mappings, setMappings] = useState<ServiceCodeMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ServiceCodeMapping | null>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateServiceCodeMappingData>>({
    baseCode: '',
    baseName: '',
    mappings: [],
    specialty: '',
    category: ''
  });

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    setLoading(true);
    try {
      const response: any = await api.get('/service-code-mapping');
      if (response.data?.success) {
        setMappings(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Error loading mappings:', error);
      enqueueSnackbar('Fehler beim Laden der Mappings', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mapping?: ServiceCodeMapping) => {
    if (mapping) {
      setEditingMapping(mapping);
      setFormData({
        baseCode: mapping.baseCode,
        baseName: mapping.baseName,
        mappings: mapping.mappings.map(m => ({
          insuranceProvider: m.insuranceProvider,
          code: m.code,
          name: m.name,
          price: m.price,
          validFrom: m.validFrom,
          validUntil: m.validUntil
        })),
        specialty: mapping.specialty,
        category: mapping.category
      });
    } else {
      setEditingMapping(null);
      setFormData({
        baseCode: '',
        baseName: '',
        mappings: [],
        specialty: '',
        category: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMapping(null);
    setFormData({
      baseCode: '',
      baseName: '',
      mappings: [],
      specialty: '',
      category: ''
    });
  };

  const handleAddMapping = () => {
    setFormData(prev => ({
      ...prev,
      mappings: [
        ...(prev.mappings || []),
        {
          insuranceProvider: 'oegk',
          code: '',
          name: '',
          price: undefined,
          validFrom: undefined,
          validUntil: undefined
        }
      ]
    }));
  };

  const handleRemoveMapping = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mappings: (prev.mappings || []).filter((_, i) => i !== index)
    }));
  };

  const handleUpdateMapping = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const updatedMappings = [...(prev.mappings || [])];
      updatedMappings[index] = {
        ...updatedMappings[index],
        [field]: value
      };
      return {
        ...prev,
        mappings: updatedMappings
      };
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.baseCode || !formData.baseName) {
        enqueueSnackbar('Basis-Code und Basis-Name sind erforderlich', { variant: 'error' });
        return;
      }

      if (!formData.mappings || formData.mappings.length === 0) {
        enqueueSnackbar('Mindestens ein Mapping ist erforderlich', { variant: 'error' });
        return;
      }

      if (editingMapping) {
        // Update
        const updateData: UpdateServiceCodeMappingData = {
          baseName: formData.baseName,
          mappings: formData.mappings.map(m => ({
            ...m,
            isActive: true
          })),
          specialty: formData.specialty,
          category: formData.category
        };
        
        const response: any = await api.put(`/service-code-mapping/${editingMapping._id}`, updateData);
        if (response.data?.success) {
          enqueueSnackbar('Mapping erfolgreich aktualisiert', { variant: 'success' });
          loadMappings();
          handleCloseDialog();
        }
      } else {
        // Create
        const createData: CreateServiceCodeMappingData = {
          baseCode: formData.baseCode!,
          baseName: formData.baseName!,
          mappings: formData.mappings!,
          specialty: formData.specialty,
          category: formData.category
        };
        
        const response: any = await api.post('/service-code-mapping', createData);
        if (response.data?.success) {
          enqueueSnackbar('Mapping erfolgreich erstellt', { variant: 'success' });
          loadMappings();
          handleCloseDialog();
        }
      }
    } catch (error: any) {
      console.error('Error saving mapping:', error);
      enqueueSnackbar(error?.response?.data?.message || 'Fehler beim Speichern', { variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Möchten Sie dieses Mapping wirklich löschen?')) {
      return;
    }

    try {
      const response: any = await api.delete(`/service-code-mapping/${id}`);
      if (response.data?.success) {
        enqueueSnackbar('Mapping erfolgreich gelöscht', { variant: 'success' });
        loadMappings();
      }
    } catch (error: any) {
      console.error('Error deleting mapping:', error);
      enqueueSnackbar('Fehler beim Löschen', { variant: 'error' });
    }
  };

  const handleCreateFromServiceCatalog = async (baseCode: string) => {
    try {
      const response: any = await api.post(`/service-code-mapping/create-from-service-catalog/${baseCode}`);
      if (response.data?.success) {
        enqueueSnackbar('Mapping erfolgreich aus ServiceCatalog erstellt', { variant: 'success' });
        loadMappings();
      }
    } catch (error: any) {
      console.error('Error creating from service catalog:', error);
      enqueueSnackbar(error?.response?.data?.message || 'Fehler beim Erstellen', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ mt: marginTopValue, p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Service-Code-Mapping Verwaltung
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Hilfe & Leitfaden">
            <IconButton onClick={() => setHelpDialogOpen(true)}>
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadMappings}
            disabled={loading}
          >
            Aktualisieren
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Neues Mapping
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : mappings.length === 0 ? (
            <Alert severity="info">
              Keine Mappings gefunden. Erstellen Sie ein neues Mapping.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Basis-Code</TableCell>
                    <TableCell>Basis-Name</TableCell>
                    <TableCell>Versicherungsträger</TableCell>
                    <TableCell>Provider-Code</TableCell>
                    <TableCell>Preis</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mappings.map((mapping) => (
                    <React.Fragment key={mapping._id}>
                      {mapping.mappings.length === 0 ? (
                        <TableRow>
                          <TableCell>{mapping.baseCode}</TableCell>
                          <TableCell>{mapping.baseName}</TableCell>
                          <TableCell colSpan={4}>
                            <Chip label="Keine Mappings" size="small" color="default" />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Tooltip title="Bearbeiten">
                                <IconButton size="small" onClick={() => handleOpenDialog(mapping)}>
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Löschen">
                                <IconButton size="small" onClick={() => handleDelete(mapping._id!)}>
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : (
                        mapping.mappings.map((providerMapping, index) => (
                          <TableRow key={`${mapping._id}-${index}`}>
                            {index === 0 && (
                              <>
                                <TableCell rowSpan={mapping.mappings.length}>
                                  {mapping.baseCode}
                                </TableCell>
                                <TableCell rowSpan={mapping.mappings.length}>
                                  {mapping.baseName}
                                </TableCell>
                                <TableCell rowSpan={mapping.mappings.length} sx={{ verticalAlign: 'top', pt: 2 }}>
                                  <Box display="flex" gap={1}>
                                    <Tooltip title="Bearbeiten">
                                      <IconButton size="small" onClick={() => handleOpenDialog(mapping)}>
                                        <EditIcon />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Löschen">
                                      <IconButton size="small" onClick={() => handleDelete(mapping._id!)}>
                                        <DeleteIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                              </>
                            )}
                            <TableCell>
                              {INSURANCE_PROVIDERS.find(p => p.value === providerMapping.insuranceProvider)?.label || providerMapping.insuranceProvider}
                            </TableCell>
                            <TableCell>{providerMapping.code}</TableCell>
                            <TableCell>
                              {providerMapping.price !== undefined ? `€${providerMapping.price.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell>
                              {providerMapping.isActive ? (
                                <Chip label="Aktiv" size="small" color="success" icon={<CheckCircleIcon />} />
                              ) : (
                                <Chip label="Inaktiv" size="small" color="default" icon={<CancelIcon />} />
                              )}
                            </TableCell>
                            {index === 0 && (
                              <TableCell rowSpan={mapping.mappings.length} />
                            )}
                          </TableRow>
                        ))
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog für Erstellen/Bearbeiten */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <GradientDialogTitle 
          title={editingMapping ? 'Mapping bearbeiten' : 'Neues Mapping erstellen'}
          onClose={handleCloseDialog}
          isEdit={!!editingMapping}
        />
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <TextField
                  fullWidth
                  label="Basis-Code"
                  value={formData.baseCode || ''}
                  onChange={(e) => setFormData({ ...formData, baseCode: e.target.value })}
                  disabled={!!editingMapping}
                  required
                />
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <TextField
                  fullWidth
                  label="Basis-Name"
                  value={formData.baseName || ''}
                  onChange={(e) => setFormData({ ...formData, baseName: e.target.value })}
                  required
                />
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <TextField
                  fullWidth
                  label="Fachrichtung"
                  value={formData.specialty || ''}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                />
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <TextField
                  fullWidth
                  label="Kategorie"
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Versicherungsträger-Mappings</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddMapping}
                >
                  Mapping hinzufügen
                </Button>
              </Box>

              {formData.mappings?.map((mapping, index) => (
                <Card key={index} sx={{ mb: 2, p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="subtitle2">
                      Mapping {index + 1}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveMapping(index)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                      <FormControl fullWidth>
                        <InputLabel>Versicherungsträger</InputLabel>
                        <Select
                          value={mapping.insuranceProvider}
                          onChange={(e) => handleUpdateMapping(index, 'insuranceProvider', e.target.value)}
                          label="Versicherungsträger"
                        >
                          {INSURANCE_PROVIDERS.map(provider => (
                            <MenuItem key={provider.value} value={provider.value}>
                              {provider.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                      <TextField
                        fullWidth
                        label="Provider-Code"
                        value={mapping.code || ''}
                        onChange={(e) => handleUpdateMapping(index, 'code', e.target.value)}
                        required
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                      <TextField
                        fullWidth
                        label="Provider-Name"
                        value={mapping.name || ''}
                        onChange={(e) => handleUpdateMapping(index, 'name', e.target.value)}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Preis (€)"
                        value={mapping.price || ''}
                        onChange={(e) => handleUpdateMapping(index, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Gültig ab"
                        value={mapping.validFrom ? new Date(mapping.validFrom).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleUpdateMapping(index, 'validFrom', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Gültig bis"
                        value={mapping.validUntil ? new Date(mapping.validUntil).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleUpdateMapping(index, 'validUntil', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                  </Box>
                </Card>
              ))}

              {(!formData.mappings || formData.mappings.length === 0) && (
                <Alert severity="info">
                  Keine Mappings vorhanden. Klicken Sie auf "Mapping hinzufügen", um eines hinzuzufügen.
                </Alert>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hilfe & Leitfaden Dialog */}
      <Dialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} maxWidth="md" fullWidth>
        <GradientDialogTitle 
          title="Hilfe & Leitfaden: Service-Code-Mapping"
          onClose={() => setHelpDialogOpen(false)}
          isEdit={false}
        />
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom color="primary">
                Service-Code-Mapping
              </Typography>
              <Typography variant="body2" paragraph>
                Das Service-Code-Mapping ermöglicht die automatische Konvertierung von internen Service-Codes 
                zu versicherungsträger-spezifischen Codes. Dies ist wichtig für die korrekte Abrechnung bei 
                verschiedenen Versicherungsträgern (ÖGK, SVS, BVAEB, etc.).
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                Warum Service-Code-Mapping?
              </Typography>
              <Typography variant="body2" paragraph>
                Verschiedene Versicherungsträger verwenden unterschiedliche Codes für dieselbe Leistung:
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                <li><strong>Interner Code:</strong> "EKG" (in Ihrem System)</li>
                <li><strong>ÖGK-Code:</strong> "15"</li>
                <li><strong>SVS-Code:</strong> "12"</li>
                <li><strong>BVAEB-Code:</strong> "EKG-001"</li>
              </Box>
              <Typography variant="body2" paragraph>
                Das Mapping konvertiert automatisch den internen Code zum richtigen Provider-Code, 
                basierend auf dem Versicherungsträger des Patienten.
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                Mapping erstellen
              </Typography>
              <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                <li>Klicken Sie auf <strong>"Neues Mapping"</strong></li>
                <li>Geben Sie den <strong>Basis-Code</strong> ein (z.B. "EKG")</li>
                <li>Geben Sie den <strong>Basis-Namen</strong> ein (z.B. "Elektrokardiogramm")</li>
                <li>Optional: Geben Sie <strong>Fachrichtung</strong> und <strong>Kategorie</strong> ein</li>
                <li>Klicken Sie auf <strong>"Mapping hinzufügen"</strong></li>
                <li>Für jeden Versicherungsträger:
                  <ul>
                    <li>Wählen Sie den <strong>Versicherungsträger</strong> (ÖGK, SVS, etc.)</li>
                    <li>Geben Sie den <strong>Provider-Code</strong> ein (z.B. "15" für ÖGK)</li>
                    <li>Optional: Geben Sie <strong>Provider-Name</strong> und <strong>Preis</strong> ein</li>
                    <li>Optional: Setzen Sie <strong>Gültigkeitsdaten</strong></li>
                  </ul>
                </li>
                <li>Klicken Sie auf <strong>"Speichern"</strong></li>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                Automatische Erstellung aus ServiceCatalog
              </Typography>
              <Typography variant="body2" paragraph>
                Sie können Mappings automatisch aus dem ServiceCatalog erstellen:
              </Typography>
              <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                <li>Stellen Sie sicher, dass der Service im ServiceCatalog existiert</li>
                <li>Der Service muss <strong>ogk.khoCode</strong> haben (Kassenhonorarordnung, Österreich)</li>
                <li>Verwenden Sie den API-Endpunkt:
                  <code style={{ display: 'block', padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginTop: '8px' }}>
                    POST /api/service-code-mapping/create-from-service-catalog/:serviceCode
                  </code>
                </li>
              </Box>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Tipp:</strong> Die automatische Erstellung nutzt die vorhandenen ÖGK-Daten 
                  aus dem ServiceCatalog und erstellt ein initiales Mapping.
                </Typography>
              </Alert>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                Mapping bearbeiten
              </Typography>
              <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                <li>Klicken Sie auf das <strong>Bearbeiten-Icon</strong> (Stift) bei einem Mapping</li>
                <li>Der <strong>Basis-Code</strong> kann nicht geändert werden</li>
                <li>Sie können:
                  <ul>
                    <li>Basis-Namen ändern</li>
                    <li>Versicherungsträger-Mappings hinzufügen/entfernen</li>
                    <li>Provider-Codes und Preise aktualisieren</li>
                    <li>Gültigkeitsdaten ändern</li>
                  </ul>
                </li>
                <li>Klicken Sie auf <strong>"Speichern"</strong></li>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                Wie funktioniert die automatische Konvertierung?
              </Typography>
              <Typography variant="body2" paragraph>
                Wenn eine Rechnung an ELDA/WAHonline übermittelt wird:
              </Typography>
              <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                <li>System erkennt den Versicherungsträger des Patienten</li>
                <li>System sucht nach Mapping für Service-Code + Versicherungsträger</li>
                <li>Wenn Mapping gefunden: Code wird konvertiert (z.B. "EKG" → "15")</li>
                <li>Wenn kein Mapping: Original-Code wird verwendet (Fallback)</li>
                <li>Konvertierter Code wird im XML an ELDA/WAHonline gesendet</li>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                Best Practices
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                <li>✅ Erstellen Sie Mappings für alle wichtigen Services</li>
                <li>✅ Verwenden Sie konsistente Basis-Codes (wie im ServiceCatalog)</li>
                <li>✅ Prüfen Sie regelmäßig die Gültigkeitsdaten</li>
                <li>✅ Aktualisieren Sie Mappings bei Änderungen der Versicherungsträger-Codes</li>
                <li>✅ Verwenden Sie Preise aus dem Mapping, wenn vorhanden</li>
                <li>✅ Testen Sie die Konvertierung in der Teststrecke</li>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                Unterstützte Versicherungsträger
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                <li><strong>ÖGK:</strong> Österreichische Gesundheitskasse</li>
                <li><strong>BVAEB:</strong> Versicherungsanstalt für Eisenbahnen und Bergbau</li>
                <li><strong>SVS:</strong> Sozialversicherung der Selbständigen</li>
                <li><strong>KFA:</strong> Krankenfürsorgeanstalt der Bediensteten der Stadt Wien</li>
                <li><strong>PVA:</strong> Pensionsversicherungsanstalt</li>
                <li><strong>VAEB:</strong> Versicherungsanstalt öffentlich Bediensteter</li>
                <li><strong>AUVA:</strong> Allgemeine Unfallversicherungsanstalt</li>
              </Box>
            </Box>

            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Tipp:</strong> Verwenden Sie die Tabelle, um schnell alle Mappings für einen 
                Service zu sehen. Die Tabelle zeigt alle Versicherungsträger-Mappings gruppiert nach Basis-Code.
              </Typography>
            </Alert>
          </Box>
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

export default ServiceCodeMappingManagement;
