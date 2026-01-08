// Erstattungsverwaltung Seite

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import {
  GetApp,
  Send,
  CheckCircle,
  Cancel,
  Pending,
  Visibility,
  Add,
  FilterList,
  HelpOutline
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import GradientDialogTitle from '../components/GradientDialogTitle';

interface Reimbursement {
  _id: string;
  invoiceId: {
    _id: string;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
  };
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    insuranceProvider: string;
  };
  insuranceProvider: string;
  insuranceType: string;
  insuranceCompany: string;
  policyNumber?: string;
  totalAmount: number;
  requestedReimbursement: number;
  approvedReimbursement: number;
  status: 'pending' | 'submitted' | 'approved' | 'partially_approved' | 'rejected' | 'paid' | 'cancelled';
  submittedDate?: string;
  approvalDate?: string;
  rejectionDate?: string;
  rejectionReason?: string;
  paymentDate?: string;
  notes?: string;
}

const Reimbursements: React.FC = () => {
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedReimbursement, setSelectedReimbursement] = useState<Reimbursement | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);

  useEffect(() => {
    loadReimbursements();
  }, [activeTab, filterStatus]);

  const loadReimbursements = async () => {
    setLoading(true);
    try {
      const status = activeTab === 0 ? 'all' : 
                     activeTab === 1 ? 'pending' :
                     activeTab === 2 ? 'submitted' :
                     activeTab === 3 ? 'approved' : 'rejected';
      
      const params = new URLSearchParams();
      if (status !== 'all') params.append('status', status);
      
      const response = await api.get<any>(`/reimbursements?${params.toString()}`);
      if ((response.data as any)?.success) {
        setReimbursements((response.data as any).data || []);
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler beim Laden der Erstattungen', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await api.post(`/reimbursements/${id}/submit`, {
        submissionMethod: 'online'
      });
      enqueueSnackbar('Erstattung erfolgreich eingereicht', { variant: 'success' });
      loadReimbursements();
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message || 'Fehler beim Einreichen', { variant: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return 'success';
      case 'rejected':
      case 'cancelled':
        return 'error';
      case 'submitted':
        return 'info';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Ausstehend',
      submitted: 'Eingereicht',
      approved: 'Genehmigt',
      partially_approved: 'Teilweise genehmigt',
      rejected: 'Abgelehnt',
      paid: 'Bezahlt',
      cancelled: 'Storniert'
    };
    return labels[status] || status;
  };

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  };

  const [autoReimbursementStatus, setAutoReimbursementStatus] = useState<any>(null);
  const [processingAuto, setProcessingAuto] = useState(false);

  useEffect(() => {
    loadAutoReimbursementStatus();
  }, []);

  const loadAutoReimbursementStatus = async () => {
    try {
      const response = await api.get<any>('/auto-reimbursement/status');
      if (response.success && response.data) {
        setAutoReimbursementStatus(response.data);
      }
    } catch (error) {
      console.error('Error loading auto reimbursement status:', error);
    }
  };

  const handleProcessAutoReimbursements = async () => {
    try {
      setProcessingAuto(true);
      const response = await api.post<any>('/auto-reimbursement/process');
      if (response.success) {
        enqueueSnackbar(`✅ ${response.data.created || 0} Erstattungen automatisch erstellt`, { variant: 'success' });
        loadReimbursements();
        loadAutoReimbursementStatus();
      }
    } catch (error: any) {
      enqueueSnackbar('Fehler bei automatischer Erstattungsverarbeitung', { variant: 'error' });
    } finally {
      setProcessingAuto(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">Erstattungsverwaltung</Typography>
          <Tooltip title="Hilfe & Leitfaden">
            <IconButton
              onClick={() => setHelpDialogOpen(true)}
              color="primary"
            >
              <HelpOutline />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {autoReimbursementStatus && (
            <Chip
              label={`${autoReimbursementStatus.invoicesWithoutReimbursement || 0} Rechnungen ohne Erstattung`}
              color="warning"
              variant="outlined"
            />
          )}
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleProcessAutoReimbursements}
            disabled={processingAuto}
            color="primary"
          >
            {processingAuto ? 'Verarbeitung...' : 'Automatische Erstattungen erstellen'}
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Alle" />
          <Tab label="Ausstehend" />
          <Tab label="Eingereicht" />
          <Tab label="Genehmigt" />
          <Tab label="Abgelehnt" />
        </Tabs>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rechnungsnummer</TableCell>
              <TableCell>Patient</TableCell>
              <TableCell>Versicherung</TableCell>
              <TableCell>Betrag</TableCell>
              <TableCell>Erstattung</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Eingereicht am</TableCell>
              <TableCell>Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography>Lade Erstattungen...</Typography>
                </TableCell>
              </TableRow>
            ) : reimbursements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography>Keine Erstattungen gefunden</Typography>
                </TableCell>
              </TableRow>
            ) : (
              reimbursements.map((reimbursement) => (
                <TableRow key={reimbursement._id} hover>
                  <TableCell>{reimbursement.invoiceId?.invoiceNumber || 'N/A'}</TableCell>
                  <TableCell>
                    {reimbursement.patientId?.firstName} {reimbursement.patientId?.lastName}
                  </TableCell>
                  <TableCell>{reimbursement.insuranceCompany}</TableCell>
                  <TableCell>{formatAmount(reimbursement.totalAmount)}</TableCell>
                  <TableCell>
                    {reimbursement.approvedReimbursement > 0
                      ? formatAmount(reimbursement.approvedReimbursement)
                      : formatAmount(reimbursement.requestedReimbursement)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(reimbursement.status)}
                      color={getStatusColor(reimbursement.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {reimbursement.submittedDate
                      ? format(new Date(reimbursement.submittedDate), 'dd.MM.yyyy', { locale: de })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedReimbursement(reimbursement);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {reimbursement.status === 'pending' && (
                        <Tooltip title="Einreichen">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleSubmit(reimbursement._id)}
                          >
                            <Send fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Detail-Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Erstattungsdetails</DialogTitle>
        <DialogContent>
          {selectedReimbursement && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Rechnungsnummer</Typography>
                  <Typography variant="body1">{selectedReimbursement.invoiceId?.invoiceNumber}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Patient</Typography>
                  <Typography variant="body1">
                    {selectedReimbursement.patientId?.firstName} {selectedReimbursement.patientId?.lastName}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Versicherung</Typography>
                  <Typography variant="body1">{selectedReimbursement.insuranceCompany}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip
                    label={getStatusLabel(selectedReimbursement.status)}
                    color={getStatusColor(selectedReimbursement.status) as any}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Gesamtbetrag</Typography>
                  <Typography variant="body1">{formatAmount(selectedReimbursement.totalAmount)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">Angeforderte Erstattung</Typography>
                  <Typography variant="body1">{formatAmount(selectedReimbursement.requestedReimbursement)}</Typography>
                </Grid>
                {selectedReimbursement.approvedReimbursement > 0 && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">Genehmigte Erstattung</Typography>
                    <Typography variant="body1" color="success.main">
                      {formatAmount(selectedReimbursement.approvedReimbursement)}
                    </Typography>
                  </Grid>
                )}
                {selectedReimbursement.submittedDate && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">Eingereicht am</Typography>
                    <Typography variant="body1">
                      {format(new Date(selectedReimbursement.submittedDate), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </Typography>
                  </Grid>
                )}
                {selectedReimbursement.rejectionReason && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">Ablehnungsgrund</Typography>
                    <Typography variant="body1" color="error">
                      {selectedReimbursement.rejectionReason}
                    </Typography>
                  </Grid>
                )}
                {selectedReimbursement.notes && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">Notizen</Typography>
                    <Typography variant="body1">{selectedReimbursement.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

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
          title="Leitfaden: Erstattungen" 
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs value={helpTab} onChange={(_, v) => setHelpTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Übersicht" />
            <Tab label="Erstattung erstellen" />
            <Tab label="Status & Workflow" />
            <Tab label="Einreichen" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Was sind Erstattungen?
                </Typography>
                <Typography variant="body1" paragraph>
                  Erstattungen sind Anträge auf Rückerstattung von Behandlungskosten durch 
                  Versicherungen. Sie werden für Wahlarzt-Leistungen oder private Behandlungen 
                  verwendet, bei denen die Versicherung einen Teil der Kosten übernimmt.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📝 <strong>Erstattung erstellen:</strong> Neue Erstattungsanträge anlegen</li>
                  <li>📤 <strong>Einreichen:</strong> Anträge an Versicherung übermitteln</li>
                  <li>👁️ <strong>Details anzeigen:</strong> Vollständige Informationen zu Erstattungen</li>
                  <li>📊 <strong>Status verfolgen:</strong> Überwachung des Bearbeitungsstatus</li>
                  <li>🔍 <strong>Filter:</strong> Nach Status filtern</li>
                  <li>📥 <strong>Export:</strong> Erstattungen exportieren</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Erstattungsstatus
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><Chip label="Ausstehend" color="warning" size="small" sx={{ mr: 1 }} /> Noch nicht eingereicht</li>
                  <li><Chip label="Eingereicht" color="info" size="small" sx={{ mr: 1 }} /> Bei Versicherung eingereicht</li>
                  <li><Chip label="Genehmigt" color="success" size="small" sx={{ mr: 1 }} /> Von Versicherung genehmigt</li>
                  <li><Chip label="Teilweise genehmigt" color="info" size="small" sx={{ mr: 1 }} /> Teilweise genehmigt</li>
                  <li><Chip label="Abgelehnt" color="error" size="small" sx={{ mr: 1 }} /> Von Versicherung abgelehnt</li>
                  <li><Chip label="Bezahlt" color="success" size="small" sx={{ mr: 1 }} /> Erstattung wurde ausgezahlt</li>
                  <li><Chip label="Storniert" size="small" sx={{ mr: 1 }} /> Erstattung wurde storniert</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Verwendung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Wahlarzt-Leistungen:</strong> Patient zahlt, Versicherung erstattet teilweise</li>
                  <li><strong>Private Behandlungen:</strong> Rückerstattung nach privater Zahlung</li>
                  <li><strong>Zusatzversicherungen:</strong> Erstattung durch Zusatzversicherungen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Erstattung erstellen
                </Typography>
                <Typography variant="body2" paragraph>
                  So erstellen Sie eine neue Erstattung:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt Anleitung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wählen Sie eine Rechnung aus (Wahlarzt oder Privat)</li>
                  <li>Klicken Sie auf "Erstattung erstellen"</li>
                  <li>Geben Sie Versicherungsdaten ein:
                    <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                      <li>Versicherungsträger</li>
                      <li>Versicherungsnummer</li>
                      <li>Versicherungstyp</li>
                    </Box>
                  </li>
                  <li>Geben Sie den beantragten Erstattungsbetrag ein</li>
                  <li>Fügen Sie Notizen hinzu (optional)</li>
                  <li>Speichern Sie die Erstattung</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Erforderliche Informationen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Rechnung:</strong> Verknüpfte Rechnung (Wahlarzt oder Privat)</li>
                  <li><strong>Patient:</strong> Patientendaten</li>
                  <li><strong>Versicherung:</strong> Versicherungsträger und -nummer</li>
                  <li><strong>Beantragter Betrag:</strong> Höhe der beantragten Erstattung</li>
                  <li><strong>Leistungen:</strong> Liste der Leistungen aus der Rechnung</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Automatische Erstellung
                </Typography>
                <Typography variant="body2" paragraph>
                  Erstattungen können automatisch erstellt werden:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Bei Wahlarzt-Rechnungen (wenn konfiguriert)</li>
                  <li>Bei privaten Rechnungen mit Versicherung</li>
                  <li>Basierend auf Versicherungsregeln</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Status & Workflow
                </Typography>
                <Typography variant="body2" paragraph>
                  Der Erstattungsstatus zeigt den aktuellen Stand im Bearbeitungsprozess.
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Workflow
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Ausstehend:</strong> Erstattung wurde erstellt, noch nicht eingereicht</li>
                  <li><strong>Eingereicht:</strong> Erstattung wurde an Versicherung übermittelt</li>
                  <li><strong>Genehmigt/Teilweise genehmigt:</strong> Versicherung hat genehmigt</li>
                  <li><strong>Bezahlt:</strong> Erstattung wurde ausgezahlt</li>
                  <li><strong>Abgelehnt:</strong> Versicherung hat abgelehnt (mit Grund)</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Status-Übergänge
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Ausstehend → Eingereicht:</strong> Beim Einreichen</li>
                  <li><strong>Eingereicht → Genehmigt:</strong> Durch Versicherung</li>
                  <li><strong>Eingereicht → Abgelehnt:</strong> Durch Versicherung (mit Grund)</li>
                  <li><strong>Genehmigt → Bezahlt:</strong> Nach Auszahlung</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Filter nach Status
                </Typography>
                <Typography variant="body2" paragraph>
                  Sie können Erstattungen nach Status filtern:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li><strong>Alle:</strong> Zeigt alle Erstattungen</li>
                  <li><strong>Ausstehend:</strong> Noch nicht eingereicht</li>
                  <li><strong>Eingereicht:</strong> Bei Versicherung in Bearbeitung</li>
                  <li><strong>Genehmigt:</strong> Von Versicherung genehmigt</li>
                  <li><strong>Abgelehnt:</strong> Von Versicherung abgelehnt</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Erstattung einreichen
                </Typography>
                <Typography variant="body2" paragraph>
                  So reichen Sie eine Erstattung bei der Versicherung ein:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Einreichung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Wählen Sie eine Erstattung mit Status "Ausstehend"</li>
                  <li>Klicken Sie auf "Einreichen"</li>
                  <li>Wählen Sie die Einreichungsmethode:
                    <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                      <li><strong>Online:</strong> Über Versicherungsportal</li>
                      <li><strong>E-Mail:</strong> Per E-Mail an Versicherung</li>
                      <li><strong>Post:</strong> Per Post versenden</li>
                    </Box>
                  </li>
                  <li>Status ändert sich zu "Eingereicht"</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Einreichungsmethoden
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>
                    <strong>Online:</strong> Direkte Übermittlung über Versicherungsportal 
                    (wenn integriert)
                  </li>
                  <li>
                    <strong>E-Mail:</strong> Erstattungsantrag wird per E-Mail versendet
                  </li>
                  <li>
                    <strong>Post:</strong> Erstattungsantrag wird zum Versand vorbereitet
                  </li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Nachverfolgung
                </Typography>
                <Typography variant="body2" paragraph>
                  Nach dem Einreichen:
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>Status wird auf "Eingereicht" gesetzt</li>
                  <li>Einreichungsdatum wird gespeichert</li>
                  <li>Sie können den Status regelmäßig überprüfen</li>
                  <li>Bei Genehmigung/Ablehnung wird Status automatisch aktualisiert</li>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Hinweis:</strong> Die tatsächliche Bearbeitung erfolgt durch die Versicherung. 
                  Die Bearbeitungszeit variiert je nach Versicherung.
                </Typography>
              </Alert>
            </Box>
          )}

          {helpTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices & Tipps
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Erstattung erstellen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Vollständige Daten:</strong> Stellen Sie sicher, dass alle Versicherungsdaten korrekt sind</li>
                  <li>✅ <strong>Korrekter Betrag:</strong> Überprüfen Sie den beantragten Erstattungsbetrag</li>
                  <li>✅ <strong>Rechnung verknüpfen:</strong> Verknüpfen Sie die Erstattung mit der richtigen Rechnung</li>
                  <li>✅ <strong>Notizen:</strong> Fügen Sie wichtige Informationen in Notizen hinzu</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Einreichen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ <strong>Zeitnah:</strong> Reichen Sie Erstattungen zeitnah ein</li>
                  <li>✅ <strong>Prüfen:</strong> Überprüfen Sie alle Daten vor dem Einreichen</li>
                  <li>✅ <strong>Methode wählen:</strong> Wählen Sie die passende Einreichungsmethode</li>
                  <li>✅ <strong>Nachverfolgung:</strong> Überwachen Sie den Status regelmäßig</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Bearbeitung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📋 <strong>Status prüfen:</strong> Überprüfen Sie regelmäßig den Status</li>
                  <li>📋 <strong>Ablehnungen:</strong> Prüfen Sie Ablehnungsgründe und reagieren Sie darauf</li>
                  <li>📋 <strong>Teilweise Genehmigungen:</strong> Überprüfen Sie teilweise genehmigte Beträge</li>
                  <li>📋 <strong>Bezahlungen:</strong> Markieren Sie Erstattungen als bezahlt, wenn Zahlung eingeht</li>
                </Box>
              </Box>

              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Tipp:</strong> Dokumentieren Sie alle Erstattungen und deren Status, 
                  um eine vollständige Übersicht zu behalten.
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

export default Reimbursements;

