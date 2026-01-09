import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Typography,
  Stack,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  CreditCard,
  CheckCircle,
  Cancel,
  Warning,
  Refresh,
} from '@mui/icons-material';
import api from '../utils/api';

interface ECardValidationProps {
  patientId: string;
  ecardNumber?: string;
  onValidationComplete?: (result: any) => void;
}

const ECardValidation: React.FC<ECardValidationProps> = ({ 
  patientId, 
  ecardNumber,
  onValidationComplete 
}) => {
  const [validating, setValidating] = useState(false);
  const [ecardInput, setEcardInput] = useState(ecardNumber || '');
  const [validationStatus, setValidationStatus] = useState<{
    status?: 'valid' | 'invalid' | 'expired' | 'not_checked';
    message?: string;
    lastValidated?: string;
    validUntil?: string;
  } | null>(null);

  const handleValidate = async () => {
    if (!ecardInput.trim()) {
      setValidationStatus({
        status: 'not_checked',
        message: 'Bitte e-card Nummer eingeben'
      });
      return;
    }

    setValidating(true);
    try {
      const response: any = await api.post(`/ecard-validation/validate`, {
        patientId,
        ecardNumber: ecardInput.trim(),
      });

      if (response.success) {
        // API-Client gibt zurück: { data: { success: true, message: '...', data: validation }, success: true }
        // Also: response.data.data ist die validation
        const validation = (response.data as any)?.data || response.data;
        const patient = (response.data as any)?.patient;
        
        setValidationStatus({
          status: validation?.validationStatus || 'valid',
          message: response.message || 'e-card erfolgreich validiert',
          lastValidated: validation?.validationDate,
          validUntil: validation?.validUntil,
        });

        if (onValidationComplete) {
          onValidationComplete({
            validation,
            patient,
            success: true
          });
        }
      } else {
        setValidationStatus({
          status: 'invalid',
          message: response.message || 'Validierung fehlgeschlagen'
        });
      }
    } catch (error: any) {
      console.error('e-card Validierung Fehler:', error);
      setValidationStatus({
        status: 'invalid',
        message: error.response?.data?.message || error.message || 'Fehler bei der Validierung'
      });
    } finally {
      setValidating(false);
    }
  };

  const getStatusIcon = () => {
    switch (validationStatus?.status) {
      case 'valid':
        return <CheckCircle color="success" />;
      case 'invalid':
        return <Cancel color="error" />;
      case 'expired':
        return <Warning color="warning" />;
      default:
        return <CreditCard color="action" />;
    }
  };

  const getStatusColor = () => {
    switch (validationStatus?.status) {
      case 'valid':
        return 'success';
      case 'invalid':
        return 'error';
      case 'expired':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CreditCard />
            <Typography variant="h6">e-card Validierung</Typography>
          </Box>
          
          <Divider />

          <TextField
            label="e-card Nummer"
            value={ecardInput}
            onChange={(e) => setEcardInput(e.target.value)}
            placeholder="1234567890123456"
            fullWidth
            disabled={validating}
            InputProps={{
              startAdornment: <CreditCard sx={{ mr: 1, color: 'action.active' }} />,
            }}
          />

          <Button
            variant="contained"
            onClick={handleValidate}
            disabled={validating || !ecardInput.trim()}
            startIcon={validating ? <CircularProgress size={20} /> : <Refresh />}
            fullWidth
          >
            {validating ? 'Validiere...' : 'e-card validieren'}
          </Button>

          {validationStatus && (
            <Alert 
              severity={getStatusColor() as any}
              icon={getStatusIcon()}
              sx={{ mt: 1 }}
            >
              <Typography variant="body2" fontWeight="bold">
                {validationStatus.message}
              </Typography>
              {validationStatus.status === 'valid' && (
                <Box sx={{ mt: 1 }}>
                  {validationStatus.lastValidated && (
                    <Typography variant="caption" display="block">
                      Validiert am: {new Date(validationStatus.lastValidated).toLocaleDateString('de-DE')}
                    </Typography>
                  )}
                  {validationStatus.validUntil && (
                    <Typography variant="caption" display="block">
                      Gültig bis: {new Date(validationStatus.validUntil).toLocaleDateString('de-DE')}
                    </Typography>
                  )}
                </Box>
              )}
            </Alert>
          )}

          {validationStatus?.status === 'valid' && (
            <Chip
              label="e-card gültig"
              color="success"
              icon={<CheckCircle />}
              size="small"
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ECardValidation;
