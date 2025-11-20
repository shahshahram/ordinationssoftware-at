import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  History as HistoryIcon,
  Euro as EuroIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInvoices } from '../store/slices/billingSlice';

interface Performance {
  _id: string;
  serviceCode: string;
  serviceDescription: string;
  serviceDatetime: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  tariffType: 'kassa' | 'wahl' | 'privat';
  status: 'recorded' | 'billed' | 'sent' | 'accepted' | 'rejected' | 'refunded' | 'failed';
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    socialSecurityNumber?: string;
    insuranceProvider?: string;
  };
  doctorId: {
    _id: string;
    firstName: string;
    lastName: string;
    contractType?: string;
  };
  billingData?: {
    kassaRef?: string;
    insuranceRef?: string;
    invoiceNumber?: string;
    paymentStatus?: string;
  };
}

interface OneClickBillingButtonProps {
  performance: Performance;
  onStatusChange?: (newStatus: string) => void;
  compact?: boolean;
}

const OneClickBillingButton: React.FC<OneClickBillingButtonProps> = ({
  performance,
  onStatusChange,
  compact = false
}) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: any) => state.auth);
  
  // State
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Berechnung der Route und Anzeige
  const getBillingRoute = () => {
    const contractType = performance.doctorId.contractType || 'privat';
    
    switch (contractType) {
      case 'kassenarzt':
        return 'KASSE';
      case 'wahlarzt':
        return 'PATIENT+KASSE_REFUND';
      case 'privat':
        return performance.patientId.insuranceProvider ? 'PATIENT+INSURANCE' : 'PATIENT';
      default:
        return 'PATIENT';
    }
  };

  const getButtonLabel = () => {
    const route = getBillingRoute();
    
    switch (route) {
      case 'KASSE':
        return 'Als Kassenleistung abrechnen';
      case 'PATIENT+KASSE_REFUND':
        return 'Wahlarztleistung abrechnen';
      case 'PATIENT+INSURANCE':
        return 'An Versicherung einreichen';
      case 'PATIENT':
        return 'Honorarnote erstellen';
      default:
        return 'Leistung abrechnen';
    }
  };

  const getButtonColor = () => {
    const route = getBillingRoute();
    
    switch (route) {
      case 'KASSE':
        return 'primary';
      case 'PATIENT+KASSE_REFUND':
        return 'secondary';
      case 'PATIENT+INSURANCE':
        return 'info';
      case 'PATIENT':
        return 'success';
      default:
        return 'primary';
    }
  };

  const getStatusChip = () => {
    const statusConfig = {
      recorded: { label: 'Erfasst', color: 'default' as const },
      billed: { label: 'Abgerechnet', color: 'info' as const },
      sent: { label: 'Gesendet', color: 'warning' as const },
      accepted: { label: 'Akzeptiert', color: 'success' as const },
      rejected: { label: 'Abgelehnt', color: 'error' as const },
      refunded: { label: 'Erstattet', color: 'success' as const },
      failed: { label: 'Fehlgeschlagen', color: 'error' as const }
    };
    
    const config = statusConfig[performance.status] || statusConfig.recorded;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  // One-Click-Billing ausführen
  const handleOneClickBilling = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Kein Authentifizierungstoken gefunden');
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/billing/one-click/${performance._id}`,
        {
          method: 'POST',
          headers: {
            'x-auth-token': token || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            options: {
              insuranceClaim: !!performance.patientId.insuranceProvider
            }
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'One-Click-Abrechnung fehlgeschlagen');
      }

      setSnackbar({
        open: true,
        message: `✅ ${result.message}`,
        severity: 'success'
      });

      // Status-Update an Parent-Komponente
      if (onStatusChange) {
        onStatusChange('sent');
      }

      // Rechnungsliste aktualisieren
      // dispatch(fetchInvoices({}));

    } catch (error: any) {
      console.error('One-Click-Billing Fehler:', error);
      setSnackbar({
        open: true,
        message: `❌ ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setConfirmDialogOpen(false);
    }
  };

  // Job-Status abfragen
  const handleCheckStatus = async () => {
    if (!performance.billingData?.invoiceNumber) return;
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/billing/jobs/${performance.billingData.invoiceNumber}/status`,
        {
          headers: {
            'x-auth-token': token || ''
          }
        }
      );

      const result = await response.json();
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: `Status: ${result.data.job.status}`,
          severity: 'info'
        });
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: `Status-Abfrage fehlgeschlagen: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Bestätigungsdialog öffnen
  const handleConfirmClick = () => {
    setConfirmDialogOpen(true);
  };

  // Menu öffnen
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Berechnung der Anzeigedaten
  const route = getBillingRoute();
  const copayAmount = Math.round(performance.totalPrice * 0.2);
  const refundAmount = Math.round(performance.totalPrice * 0.8);
  const patientAmount = performance.totalPrice - refundAmount;

  // Bestätigungsdialog-Inhalt
  const getConfirmationContent = () => {
    switch (route) {
      case 'KASSE':
        return (
          <Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Die Leistung wird direkt an die Krankenkasse gemeldet:
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Leistung:</strong> {performance.serviceDescription}
              </Typography>
              <Typography variant="body2">
                <strong>Betrag:</strong> {performance.totalPrice.toFixed(2)} €
              </Typography>
              <Typography variant="body2">
                <strong>Selbstbehalt:</strong> {copayAmount.toFixed(2)} €
              </Typography>
              <Typography variant="body2">
                <strong>Patient:</strong> {performance.patientId.firstName} {performance.patientId.lastName}
              </Typography>
            </Box>
          </Box>
        );
      
      case 'PATIENT+KASSE_REFUND':
        return (
          <Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Wahlarztleistung wird abgerechnet:
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Leistung:</strong> {performance.serviceDescription}
              </Typography>
              <Typography variant="body2">
                <strong>Gesamtbetrag:</strong> {performance.totalPrice.toFixed(2)} €
              </Typography>
              <Typography variant="body2">
                <strong>Rückerstattung:</strong> {refundAmount.toFixed(2)} €
              </Typography>
              <Typography variant="body2">
                <strong>Patient zahlt:</strong> {patientAmount.toFixed(2)} €
              </Typography>
              <Typography variant="body2">
                <strong>Patient:</strong> {performance.patientId.firstName} {performance.patientId.lastName}
              </Typography>
            </Box>
          </Box>
        );
      
      case 'PATIENT+INSURANCE':
        return (
          <Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Rechnung wird erstellt und an die Versicherung eingereicht:
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Leistung:</strong> {performance.serviceDescription}
              </Typography>
              <Typography variant="body2">
                <strong>Betrag:</strong> {performance.totalPrice.toFixed(2)} €
              </Typography>
              <Typography variant="body2">
                <strong>Versicherung:</strong> {performance.patientId.insuranceProvider}
              </Typography>
              <Typography variant="body2">
                <strong>Patient:</strong> {performance.patientId.firstName} {performance.patientId.lastName}
              </Typography>
            </Box>
          </Box>
        );
      
      case 'PATIENT':
        return (
          <Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Honorarnote wird erstellt und an den Patienten gesendet:
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Leistung:</strong> {performance.serviceDescription}
              </Typography>
              <Typography variant="body2">
                <strong>Betrag:</strong> {performance.totalPrice.toFixed(2)} €
              </Typography>
              <Typography variant="body2">
                <strong>Patient:</strong> {performance.patientId.firstName} {performance.patientId.lastName}
              </Typography>
            </Box>
          </Box>
        );
      
      default:
        return <Typography>Leistung wird abgerechnet</Typography>;
    }
  };

  // Button ist deaktiviert wenn bereits abgerechnet
  const isDisabled = performance.status !== 'recorded' || loading;

  return (
    <>
      {compact ? (
        <Tooltip title={getButtonLabel()}>
          <IconButton
            onClick={handleConfirmClick}
            disabled={isDisabled}
            color={getButtonColor() as any}
            size="small"
          >
            {loading ? (
              <CircularProgress size={20} />
            ) : (
              <ReceiptIcon />
            )}
          </IconButton>
        </Tooltip>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="contained"
            color={getButtonColor() as any}
            startIcon={loading ? <CircularProgress size={20} /> : <ReceiptIcon />}
            onClick={handleConfirmClick}
            disabled={isDisabled}
            fullWidth={!compact}
          >
            {getButtonLabel()}
          </Button>
          
          {performance.status !== 'recorded' && (
            <>
              {getStatusChip()}
              
              <IconButton
                onClick={handleMenuOpen}
                size="small"
              >
                <MoreVertIcon />
              </IconButton>
              
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={handleCheckStatus}>
                  <ListItemIcon>
                    <RefreshIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Status prüfen</ListItemText>
                </MenuItem>
                
                <MenuItem onClick={() => {/* TODO: Historie öffnen */}}>
                  <ListItemIcon>
                    <HistoryIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Abrechnungshistorie</ListItemText>
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      )}

      {/* Bestätigungsdialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon color="primary" />
            <Typography variant="h6">
              {getButtonLabel()}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {getConfirmationContent()}
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Automatisch senden:</strong> Die Abrechnung wird automatisch verarbeitet und Sie erhalten eine Benachrichtigung über das Ergebnis.
            </Typography>
          </Alert>
        </DialogContent>
        
        <DialogActions>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleOneClickBilling}
            variant="contained"
            color={getButtonColor() as any}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {loading ? 'Wird verarbeitet...' : 'Bestätigen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar für Benachrichtigungen */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default OneClickBillingButton;
