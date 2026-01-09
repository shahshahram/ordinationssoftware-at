import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Typography,
  CircularProgress,
  Alert,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import api from '../utils/api';
import GradientDialogTitle from './GradientDialogTitle';

interface LaborResult {
  _id: string;
  resultDate: string;
  results: Array<{
    parameter: string;
    value: string;
    unit?: string;
    reference?: string;
    isCritical?: boolean;
  }>;
}

interface LaborWerteSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selectedResults: LaborResult[]) => void;
  patientId: string;
}

const LaborWerteSelector: React.FC<LaborWerteSelectorProps> = ({
  open,
  onClose,
  onSelect,
  patientId,
}) => {
  const [results, setResults] = useState<LaborResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('30');
  const [onlyCritical, setOnlyCritical] = useState(false);

  useEffect(() => {
    if (open && patientId) {
      loadResults();
    }
  }, [open, patientId, timeRange, onlyCritical]);

  const loadResults = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      const days = parseInt(timeRange);
      startDate.setDate(startDate.getDate() - days);

      const response: any = await api.get(
        `/labor/patient/${patientId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      if (response.data?.success) {
        let filtered = response.data.data || [];
        if (onlyCritical) {
          filtered = filtered.filter((r: LaborResult) =>
            r.results?.some((res) => res.isCritical)
          );
        }
        setResults(filtered);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Laborwerte:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (resultId: string) => {
    setSelectedResults((prev) =>
      prev.includes(resultId)
        ? prev.filter((id) => id !== resultId)
        : [...prev, resultId]
    );
  };

  const handleSelect = () => {
    const selected = results.filter((r) => selectedResults.includes(r._id));
    onSelect(selected);
    setSelectedResults([]);
    onClose();
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('de-DE');
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <GradientDialogTitle title="Laborwerte auswählen" onClose={onClose} />
      <DialogContent>
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Zeitraum</InputLabel>
            <Select
              value={timeRange}
              label="Zeitraum"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7">Letzte 7 Tage</MenuItem>
              <MenuItem value="30">Letzte 30 Tage</MenuItem>
              <MenuItem value="90">Letzte 3 Monate</MenuItem>
              <MenuItem value="180">Letzte 6 Monate</MenuItem>
              <MenuItem value="365">Letztes Jahr</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={onlyCritical}
                onChange={(e) => setOnlyCritical(e.target.checked)}
              />
            }
            label="Nur auffällige Werte"
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : results.length === 0 ? (
          <Alert severity="info">Keine Laborwerte gefunden</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Datum</TableCell>
                  <TableCell>Parameter</TableCell>
                  <TableCell>Wert</TableCell>
                  <TableCell>Einheit</TableCell>
                  <TableCell>Referenz</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.flatMap((result) =>
                  result.results?.map((res, idx) => (
                    <TableRow key={`${result._id}-${idx}`}>
                      {idx === 0 && (
                        <TableCell
                          rowSpan={result.results?.length || 1}
                          padding="checkbox"
                        >
                          <Checkbox
                            checked={selectedResults.includes(result._id)}
                            onChange={() => handleToggle(result._id)}
                          />
                        </TableCell>
                      )}
                      {idx === 0 && (
                        <TableCell rowSpan={result.results?.length || 1}>
                          {formatDate(result.resultDate)}
                        </TableCell>
                      )}
                      <TableCell>{res.parameter || '-'}</TableCell>
                      <TableCell>{res.value || '-'}</TableCell>
                      <TableCell>{res.unit || '-'}</TableCell>
                      <TableCell>{res.reference || '-'}</TableCell>
                      <TableCell>
                        {res.isCritical ? (
                          <Typography color="error" variant="body2">
                            Auffällig
                          </Typography>
                        ) : (
                          <Typography color="success.main" variant="body2">
                            Normal
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button
          onClick={handleSelect}
          variant="contained"
          disabled={selectedResults.length === 0}
        >
          Laborwerte übernehmen ({selectedResults.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LaborWerteSelector;

