import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Stack,
  Chip,
  Alert
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { VitalSigns } from '../store/slices/vitalSignsSlice';

interface VitalSignsChartProps {
  vitalSigns: VitalSigns[];
  patientId?: string;
}

type ParameterType = 
  | 'bloodPressure_systolic'
  | 'bloodPressure_diastolic'
  | 'pulse'
  | 'respiratoryRate'
  | 'temperature'
  | 'oxygenSaturation'
  | 'bloodGlucose'
  | 'bmi';

const VitalSignsChart: React.FC<VitalSignsChartProps> = ({ vitalSigns, patientId }) => {
  const [selectedParameters, setSelectedParameters] = useState<ParameterType[]>([
    'bloodPressure_systolic',
    'bloodPressure_diastolic',
    'pulse',
    'temperature',
    'oxygenSaturation'
  ]);

  // Grenzwerte für Referenzlinien
  const referenceLines = {
    bloodPressure_systolic: { value: 130, label: 'Hypertonie (≥130)' },
    bloodPressure_diastolic: { value: 90, label: 'Hypertonie (≥90)' },
    pulse: { min: 60, max: 100, label: 'Normal (60-100)' },
    respiratoryRate: { min: 12, max: 20, label: 'Normal (12-20)' },
    temperature: { min: 35, max: 38, label: 'Normal (35-38°C)' },
    oxygenSaturation: { value: 95, label: 'Hypoxie (<95%)' },
    bloodGlucose: { min: 70, max: 100, label: 'Normal (70-100 mg/dL)' },
    bmi: { min: 18.5, max: 25, label: 'Normal (18.5-25)' }
  };

  // Verfügbare Parameter
  const availableParameters: Array<{ value: ParameterType; label: string; unit: string; color: string }> = [
    { value: 'bloodPressure_systolic', label: 'Blutdruck (systolisch)', unit: 'mmHg', color: '#d32f2f' },
    { value: 'bloodPressure_diastolic', label: 'Blutdruck (diastolisch)', unit: 'mmHg', color: '#f44336' },
    { value: 'pulse', label: 'Puls', unit: 'bpm', color: '#1976d2' },
    { value: 'respiratoryRate', label: 'Atemfrequenz', unit: '/min', color: '#388e3c' },
    { value: 'temperature', label: 'Temperatur', unit: '°C', color: '#f57c00' },
    { value: 'oxygenSaturation', label: 'Sauerstoffsättigung', unit: '%', color: '#7b1fa2' },
    { value: 'bloodGlucose', label: 'Blutzucker', unit: 'mg/dL', color: '#c2185b' },
    { value: 'bmi', label: 'BMI', unit: '', color: '#0288d1' }
  ];

  // Bereite Daten für das Diagramm vor
  const chartData = useMemo(() => {
    if (!vitalSigns || vitalSigns.length === 0) return [];

    return vitalSigns
      .filter(vital => vital.recordedAt || vital.createdAt)
      .map(vital => {
        const date = new Date(vital.recordedAt || vital.createdAt || new Date());
        const dataPoint: any = {
          date: date.getTime(),
          dateLabel: format(date, 'dd.MM.yyyy HH:mm', { locale: de })
        };

        // Blutdruck
        if (vital.bloodPressure?.systolic) {
          dataPoint.bloodPressure_systolic = vital.bloodPressure.systolic;
        }
        if (vital.bloodPressure?.diastolic) {
          dataPoint.bloodPressure_diastolic = vital.bloodPressure.diastolic;
        }

        // Puls
        if (vital.pulse) {
          dataPoint.pulse = vital.pulse;
        }

        // Atemfrequenz
        if (vital.respiratoryRate) {
          dataPoint.respiratoryRate = vital.respiratoryRate;
        }

        // Temperatur (konvertiere zu Celsius)
        if (vital.temperature?.value) {
          const tempCelsius = vital.temperature.unit === 'fahrenheit' 
            ? (vital.temperature.value - 32) * 5/9 
            : vital.temperature.value;
          dataPoint.temperature = Number(tempCelsius.toFixed(1));
        }

        // Sauerstoffsättigung
        if (vital.oxygenSaturation) {
          dataPoint.oxygenSaturation = vital.oxygenSaturation;
        }

        // Blutzucker
        if (vital.bloodGlucose?.value) {
          dataPoint.bloodGlucose = vital.bloodGlucose.value;
        }

        // BMI
        if (vital.bmi) {
          dataPoint.bmi = vital.bmi;
        }

        return dataPoint;
      })
      .sort((a, b) => a.date - b.date);
  }, [vitalSigns]);

  const handleParameterToggle = (parameter: ParameterType) => {
    setSelectedParameters(prev => {
      if (prev.includes(parameter)) {
        return prev.filter(p => p !== parameter);
      } else {
        return [...prev, parameter];
      }
    });
  };

  if (!vitalSigns || vitalSigns.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">Keine Vitalwerte verfügbar</Alert>
      </Paper>
    );
  }

  const visibleParameters = availableParameters.filter(p => selectedParameters.includes(p.value));

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Verlauf der Vitalwerte
      </Typography>
      
      {/* Parameter-Auswahl */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Parameter auswählen:
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
          {availableParameters.map(param => (
            <FormControlLabel
              key={param.value}
              control={
                <Checkbox
                  checked={selectedParameters.includes(param.value)}
                  onChange={() => handleParameterToggle(param.value)}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: param.color
                    }}
                  />
                  <Typography variant="body2">
                    {param.label}
                  </Typography>
                </Box>
              }
            />
          ))}
        </Stack>
      </Box>

      {/* Diagramm */}
      {visibleParameters.length === 0 ? (
        <Alert severity="info">Bitte wählen Sie mindestens einen Parameter aus</Alert>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="date"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => format(new Date(value), 'dd.MM. HH:mm', { locale: de })}
              stroke="#666"
            />
            <YAxis
              yAxisId="left"
              stroke="#666"
            />
            <Tooltip
              formatter={(value: any, name: string) => {
                const param = availableParameters.find(p => p.value === name);
                return [`${value}${param?.unit ? ` ${param.unit}` : ''}`, param?.label || name];
              }}
              labelFormatter={(label) => format(new Date(label), 'dd.MM.yyyy HH:mm', { locale: de })}
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
            />
            <Legend
              formatter={(value: string) => {
                const param = availableParameters.find(p => p.value === value);
                return param?.label || value;
              }}
            />
            
            {/* Referenzlinien */}
            {selectedParameters.includes('bloodPressure_systolic') && (
              <ReferenceLine
                yAxisId="left"
                y={referenceLines.bloodPressure_systolic.value}
                stroke="#d32f2f"
                strokeDasharray="5 5"
                label={{ value: referenceLines.bloodPressure_systolic.label, position: 'top' }}
              />
            )}
            {selectedParameters.includes('bloodPressure_diastolic') && (
              <ReferenceLine
                yAxisId="left"
                y={referenceLines.bloodPressure_diastolic.value}
                stroke="#f44336"
                strokeDasharray="5 5"
                label={{ value: referenceLines.bloodPressure_diastolic.label, position: 'top' }}
              />
            )}
            {selectedParameters.includes('pulse') && (
              <>
                <ReferenceLine
                  yAxisId="left"
                  y={referenceLines.pulse.min}
                  stroke="#1976d2"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={referenceLines.pulse.max}
                  stroke="#1976d2"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              </>
            )}
            {selectedParameters.includes('respiratoryRate') && (
              <>
                <ReferenceLine
                  yAxisId="left"
                  y={referenceLines.respiratoryRate.min}
                  stroke="#388e3c"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={referenceLines.respiratoryRate.max}
                  stroke="#388e3c"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              </>
            )}
            {selectedParameters.includes('temperature') && (
              <>
                <ReferenceLine
                  yAxisId="left"
                  y={referenceLines.temperature.min}
                  stroke="#f57c00"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={referenceLines.temperature.max}
                  stroke="#f57c00"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              </>
            )}
            {selectedParameters.includes('oxygenSaturation') && (
              <ReferenceLine
                yAxisId="left"
                y={referenceLines.oxygenSaturation.value}
                stroke="#7b1fa2"
                strokeDasharray="5 5"
                label={{ value: referenceLines.oxygenSaturation.label, position: 'top' }}
              />
            )}
            {selectedParameters.includes('bloodGlucose') && (
              <>
                <ReferenceLine
                  yAxisId="left"
                  y={referenceLines.bloodGlucose.min}
                  stroke="#c2185b"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={referenceLines.bloodGlucose.max}
                  stroke="#c2185b"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              </>
            )}
            {selectedParameters.includes('bmi') && (
              <>
                <ReferenceLine
                  yAxisId="left"
                  y={referenceLines.bmi.min}
                  stroke="#0288d1"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={referenceLines.bmi.max}
                  stroke="#0288d1"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              </>
            )}

            {/* Datenlinien */}
            {visibleParameters.map(param => (
              <Line
                key={param.value}
                yAxisId="left"
                type="monotone"
                dataKey={param.value}
                stroke={param.color}
                strokeWidth={2}
                dot={{ r: 4, fill: param.color }}
                activeDot={{ r: 6 }}
                name={param.value}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
};

export default VitalSignsChart;

