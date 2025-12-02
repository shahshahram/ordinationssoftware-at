import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CreditCard,
  CheckCircle,
  Cancel,
  Refresh,
  Settings,
  PersonSearch,
} from '@mui/icons-material';
import useGinaBox from '../hooks/useGinaBox';

interface GinaBoxStatusProps {
  onPatientFound?: (patient: any) => void;
  onPatientNotFound?: () => void;
}

const GinaBoxStatus: React.FC<GinaBoxStatusProps> = ({
  onPatientFound,
  onPatientNotFound
}) => {
  const {
    status,
    currentCard,
    loading,
    error,
    connect,
    disconnect,
    findPatient
  } = useGinaBox({
    autoConnect: true,
    onCardInserted: async (card) => {
      console.log('📇 e-card eingesteckt:', card.cardNumber);
      // Automatische Patientenfindung
      const patient = await findPatient(card.cardNumber);
      if (patient) {
        if (onPatientFound) {
          onPatientFound(patient);
        }
      } else {
        if (onPatientNotFound) {
          onPatientNotFound();
        }
      }
    },
    onCardRemoved: () => {
      console.log('📇 e-card entfernt');
    },
    onPatientFound: (patient) => {
      if (onPatientFound) {
        onPatientFound(patient);
      }
    },
    onPatientNotFound: () => {
      if (onPatientNotFound) {
        onPatientNotFound();
      }
    }
  });

  const getStatusColor = () => {
    if (!status) return 'default';
    if (status.connected) return 'success';
    if (status.error) return 'error';
    return 'warning';
  };

  const getStatusText = () => {
    if (!status) return 'Unbekannt';
    if (status.connected) return 'Verbunden';
    if (status.error) return 'Fehler';
    return 'Nicht verbunden';
  };

  const handleFindPatient = async () => {
    if (currentCard) {
      const patient = await findPatient();
      if (patient) {
        if (onPatientFound) {
          onPatientFound(patient);
        }
      } else {
        if (onPatientNotFound) {
          onPatientNotFound();
        }
      }
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CreditCard />
              <Typography variant="h6">GINA-Box</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Status aktualisieren">
                <IconButton
                  size="small"
                  onClick={connect}
                  disabled={loading}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
              {status?.connected && (
                <Tooltip title="Verbindung trennen">
                  <IconButton
                    size="small"
                    onClick={disconnect}
                    disabled={loading}
                  >
                    <Cancel />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Status */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={getStatusText()}
                color={getStatusColor() as any}
                size="small"
                icon={loading ? <CircularProgress size={16} /> : 
                      status?.connected ? <CheckCircle /> : <Cancel />}
              />
              {status?.type && (
                <Typography variant="caption" color="text.secondary">
                  ({status.type})
                </Typography>
              )}
            </Stack>
          </Box>

          {/* Fehler */}
          {error && (
            <Alert severity="error" onClose={() => {}}>
              {error}
            </Alert>
          )}

          {/* Aktuelle e-card */}
          {currentCard && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Aktuelle e-card
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CreditCard color="primary" />
                  <Typography variant="body2">
                    {currentCard.cardNumber.slice(0, 4)}...{currentCard.cardNumber.slice(-4)}
                  </Typography>
                </Box>
                {currentCard.validation && (
                  <Chip
                    label={currentCard.validation.valid ? 'Gültig' : 'Ungültig'}
                    color={currentCard.validation.valid ? 'success' : 'error'}
                    size="small"
                  />
                )}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PersonSearch />}
                  onClick={handleFindPatient}
                  fullWidth
                >
                  Patient suchen
                </Button>
              </Stack>
            </Box>
          )}

          {/* Keine Karte */}
          {!currentCard && status?.connected && (
            <Alert severity="info">
              Bitte e-card in GINA-Box einstecken
            </Alert>
          )}

          {/* Nicht verbunden */}
          {!status?.connected && !loading && (
            <Alert severity="warning">
              GINA-Box nicht verbunden. Bitte Verbindung herstellen.
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default GinaBoxStatus;

