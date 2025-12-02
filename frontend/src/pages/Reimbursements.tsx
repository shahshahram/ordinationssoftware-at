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
  CardContent
} from '@mui/material';
import {
  GetApp,
  Send,
  CheckCircle,
  Cancel,
  Pending,
  Visibility,
  Add,
  FilterList
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import api from '../utils/api';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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
        <Typography variant="h4">Erstattungsverwaltung</Typography>
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
    </Box>
  );
};

export default Reimbursements;

