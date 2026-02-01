import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Calculate,
  Info,
  LocationOn,
  LocalHospital,
} from '@mui/icons-material';
import api from '../utils/api';
import { useSelector } from 'react-redux';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';

interface TariffConfig {
  federalState: string;
  code: string;
  name: string;
  default: number;
  labor: {
    ordination: number;
    institute: number;
  };
  specialty: {
    radiologie?: number;
    physiotherapie?: number;
    ekg?: number;
    roentgen_non_radiologist?: number;
  };
  positionSpecific: {
    [key: string]: number;
  };
  doctorSpecialty?: string;
  validFrom?: string | null;
}

interface FederalStateOption {
  federalState: string;
  code: string;
  name: string;
  default: number;
}

interface CalculationResult {
  points: number;
  pointValue: number;
  price: number;
  refund80: number;
  federalState: string;
}

const TariffPreview: React.FC = () => {
  const { user: _user } = useSelector((state: any) => state.auth);
  const { marginTopValue } = useGlobalNavigationOffset();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<TariffConfig | null>(null);
  const [allStates, setAllStates] = useState<FederalStateOption[]>([]);
  const [selectedFederalStateKey, setSelectedFederalStateKey] = useState<string>('');

  // Calculator state
  const [positionNumber, setPositionNumber] = useState<string>('');
  const [points, setPoints] = useState<string>('');
  const [specialty, setSpecialty] = useState<string>('');
  const [billingGroup, setBillingGroup] = useState<string>('');
  const [calculating, setCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  const loadConfigForState = async (federalStateKey: string) => {
    try {
      const response = await api.get<{ success: boolean; data: TariffConfig }>(
        `/tariff-config/state/${encodeURIComponent(federalStateKey)}`
      );
      if (response.data.success) {
        setConfig(response.data.data);
      }
    } catch (err: any) {
      console.error('Fehler beim Laden der Konfiguration für Bundesland:', err);
      setError(err.response?.data?.message || 'Konfiguration konnte nicht geladen werden');
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        const [allRes, currentRes] = await Promise.all([
          api.get<{ success: boolean; data: FederalStateOption[] }>('/tariff-config/all'),
          api.get<{ success: boolean; data: TariffConfig }>('/tariff-config/current'),
        ]);
        if (allRes.data.success && allRes.data.data?.length) {
          setAllStates(allRes.data.data);
        } else {
          const fallback: FederalStateOption[] = [
            { federalState: 'oberoesterreich', code: 'OOE', name: 'Oberösterreich', default: 0.553 },
            { federalState: 'niederoesterreich', code: 'NOE', name: 'Niederösterreich', default: 0.769 },
            { federalState: 'wien', code: 'W', name: 'Wien', default: 0.768 },
            { federalState: 'burgenland', code: 'B', name: 'Burgenland', default: 0.542 },
            { federalState: 'steiermark', code: 'ST', name: 'Steiermark', default: 0.534 },
            { federalState: 'kaernten', code: 'K', name: 'Kärnten', default: 0.502 },
            { federalState: 'salzburg', code: 'S', name: 'Salzburg', default: 0.418 },
            { federalState: 'tirol', code: 'T', name: 'Tirol', default: 0.521 },
            { federalState: 'vorarlberg', code: 'V', name: 'Vorarlberg', default: 0.522 },
          ];
          setAllStates(fallback);
        }
        if (currentRes.data.success && currentRes.data.data) {
          const data = currentRes.data.data;
          setConfig(data);
          setSelectedFederalStateKey(data.federalState);
        } else {
          setError('Konfiguration konnte nicht geladen werden');
        }
      } catch (err: any) {
        console.error('Fehler beim Laden der Konfiguration:', err);
        setError(err.response?.data?.message || 'Fehler beim Laden der Konfiguration');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleFederalStateChange = async (federalStateKey: string) => {
    setSelectedFederalStateKey(federalStateKey);
    setCalculationResult(null);
    setCalculationError(null);
    await loadConfigForState(federalStateKey);
  };

  const handleCalculate = async () => {
    if (!points || parseFloat(points) <= 0) {
      setCalculationError('Bitte geben Sie eine gültige Anzahl Punkte ein');
      return;
    }

    try {
      setCalculating(true);
      setCalculationError(null);
      setCalculationResult(null);

      const response = await api.post<{ success: boolean; data: CalculationResult }>('/tariff-config/calculate', {
        positionNumber: positionNumber || undefined,
        points: parseFloat(points),
        khoCode: positionNumber || undefined,
        specialty: specialty || undefined,
        billingGroup: billingGroup || undefined,
        doctorSpecialty: config?.doctorSpecialty || undefined,
        federalState: config?.federalState || selectedFederalStateKey || undefined,
      });

      if (response.data.success) {
        setCalculationResult(response.data.data);
      } else {
        setCalculationError('Berechnung fehlgeschlagen');
      }
    } catch (err: any) {
      console.error('Fehler bei der Berechnung:', err);
      setCalculationError(err.response?.data?.message || 'Fehler bei der Berechnung');
    } finally {
      setCalculating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-AT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', mt: marginTopValue }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !config) {
    return (
      <Box sx={{ mt: marginTopValue, p: 3 }}>
        <Alert severity="error">{error || 'Konfiguration nicht verfügbar'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: marginTopValue, p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        KHO-Tarifvorschau
      </Typography>

      {/* Status-Anzeige inkl. validFrom und Bundesland-Umschalter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="tariff-federal-state-label">Bundesland</InputLabel>
                <Select
                  labelId="tariff-federal-state-label"
                  id="tariff-federal-state"
                  value={selectedFederalStateKey}
                  label="Bundesland"
                  onChange={(e) => handleFederalStateChange(e.target.value)}
                >
                  {allStates.map((s) => (
                    <MenuItem key={s.federalState} value={s.federalState}>
                      {s.name} ({s.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Chip
                icon={<LocationOn />}
                label={`Aktuell: ${config.name} (${config.code})`}
                color="primary"
                variant="outlined"
                sx={{ fontSize: '1rem', py: 2.5 }}
              />
              {config.validFrom && (
                <Chip
                  label={`Gültig ab: ${new Date(config.validFrom).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                  variant="outlined"
                  sx={{ fontSize: '0.9rem', py: 2.5 }}
                />
              )}
              {config.doctorSpecialty && (
                <Chip
                  icon={<LocalHospital />}
                  label={`Fachgebiet: ${config.doctorSpecialty}`}
                  color="secondary"
                  variant="outlined"
                  sx={{ fontSize: '1rem', py: 2.5 }}
                />
              )}
              {!config.doctorSpecialty && (
                <Chip
                  icon={<LocalHospital />}
                  label="Fachgebiet: Nicht gesetzt"
                  color="default"
                  variant="outlined"
                  sx={{ fontSize: '1rem', py: 2.5 }}
                />
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Punktwert-Dashboard */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Basis-Punktwert */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Basis-Punktwert
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {formatCurrency(config.default)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Standard-Punktwert für Sonderleistungen
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Labor-Punktwerte */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="secondary">
                Labor-Punktwerte
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Ordination:
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                  {formatCurrency(config.labor.ordination)}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Institut:
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                  {formatCurrency(config.labor.institute)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Fachspezifische Werte */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Fachspezifische Werte
              </Typography>
              <Stack spacing={1}>
                {config.specialty.radiologie && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Radiologie:
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(config.specialty.radiologie)}
                    </Typography>
                  </Box>
                )}
                {config.specialty.physiotherapie && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Physiotherapie:
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(config.specialty.physiotherapie)}
                    </Typography>
                  </Box>
                )}
                {config.specialty.ekg && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      EKG:
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(config.specialty.ekg)}
                    </Typography>
                  </Box>
                )}
                {config.specialty.roentgen_non_radiologist && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Röntgen (Nicht-Radiologe):
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(config.specialty.roentgen_non_radiologist)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Ausnahme-Tabelle */}
      {config.positionSpecific && Object.keys(config.positionSpecific).length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Positionsnummer-spezifische Punktwerte
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Diese Leistungen haben abweichende Punktwerte:
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Positionsnummer</strong></TableCell>
                    <TableCell><strong>Punktwert</strong></TableCell>
                    <TableCell><strong>Beschreibung</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(config.positionSpecific).map(([pos, value]) => (
                    <TableRow key={pos}>
                      <TableCell>{pos}</TableCell>
                      <TableCell>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          {formatCurrency(value)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {pos === '83' || pos === '97' || pos === '110' ? 'Chirurgische Leistungen' :
                         pos === '165' ? 'Großflächige Verbände' :
                         pos === '14' || pos === '27' ? 'Injektionen/Infusionen' :
                         'Sonderleistung'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Live-Rechner */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <Calculate sx={{ verticalAlign: 'middle', mr: 1 }} />
            Tarif-Rechner
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Berechnen Sie den Preis und die voraussichtliche Erstattung für eine Leistung:
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Positionsnummer (optional)"
                value={positionNumber}
                onChange={(e) => setPositionNumber(e.target.value)}
                placeholder="z.B. 165"
                helperText="Für spezifische Punktwerte"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Punkte *"
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Specialty (optional)"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="z.B. radiologie"
                helperText="Für fachspezifische Werte"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Billing Group (optional)"
                value={billingGroup}
                onChange={(e) => setBillingGroup(e.target.value)}
                placeholder="z.B. labor"
                helperText="Für Labor-Leistungen"
              />
            </Grid>
          </Grid>

          <Button
            variant="contained"
            startIcon={<Calculate />}
            onClick={handleCalculate}
            disabled={calculating || !points || parseFloat(points) <= 0}
            sx={{ mb: 2 }}
          >
            {calculating ? 'Berechne...' : 'Berechnen'}
          </Button>

          {calculationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {calculationError}
            </Alert>
          )}

          {calculationResult && (
            <Card variant="outlined" sx={{ mt: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Berechnungsergebnis
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Punkte:
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        {calculationResult.points}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Punktwert:
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(calculationResult.pointValue)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Gesamtpreis:
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(calculationResult.price)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Voraussichtliche Erstattung (80%):
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(calculationResult.refund80)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Info sx={{ mt: 0.5 }} />
              <Typography variant="body2">
                <strong>Hinweis:</strong> Die Berechnung verwendet das 3-stufige Prioritätssystem:
                <br />
                1. Positionsnummer-spezifische Werte (höchste Priorität)
                <br />
                2. Specialty/BillingGroup-basierte Werte
                <br />
                3. Default-Punktwert des Bundeslandes
              </Typography>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TariffPreview;
