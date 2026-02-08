// Wetter-Widget – aktuelle Wetterdaten via Open-Meteo (kostenlos, ohne API-Key)

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  WbSunny as ClearIcon,
  Cloud as CloudIcon,
  CloudQueue as PartlyCloudIcon,
  Foggy as FogIcon,
  WaterDrop as RainIcon,
  AcUnit as SnowIcon,
  Thunderstorm as StormIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import type { DashboardWidget } from '../../store/slices/dashboardWidgetsSlice';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

/** WMO weather code → Kurzlabel und Icon-Komponente */
const WEATHER_CODE_MAP: Record<number, { label: string; Icon: React.ComponentType<{ sx?: any }> }> = {
  0: { label: 'Klar', Icon: ClearIcon },
  1: { label: 'Überwiegend klar', Icon: ClearIcon },
  2: { label: 'Teilweise bewölkt', Icon: PartlyCloudIcon },
  3: { label: 'Bewölkt', Icon: CloudIcon },
  45: { label: 'Nebel', Icon: FogIcon },
  48: { label: 'Nebel', Icon: FogIcon },
  51: { label: 'Nieselregen', Icon: RainIcon },
  53: { label: 'Nieselregen', Icon: RainIcon },
  55: { label: 'Nieselregen', Icon: RainIcon },
  61: { label: 'Regen', Icon: RainIcon },
  63: { label: 'Regen', Icon: RainIcon },
  65: { label: 'Starkregen', Icon: RainIcon },
  71: { label: 'Schnee', Icon: SnowIcon },
  73: { label: 'Schnee', Icon: SnowIcon },
  75: { label: 'Schnee', Icon: SnowIcon },
  77: { label: 'Schneegriesel', Icon: SnowIcon },
  80: { label: 'Regenschauer', Icon: RainIcon },
  81: { label: 'Regenschauer', Icon: RainIcon },
  82: { label: 'Regenschauer', Icon: RainIcon },
  85: { label: 'Schneeschauer', Icon: SnowIcon },
  86: { label: 'Schneeschauer', Icon: SnowIcon },
  95: { label: 'Gewitter', Icon: StormIcon },
  96: { label: 'Gewitter mit Hagel', Icon: StormIcon },
  99: { label: 'Gewitter mit Hagel', Icon: StormIcon },
};

const getWeatherInfo = (code: number) =>
  WEATHER_CODE_MAP[code] ?? { label: 'Unbekannt', Icon: CloudIcon };

export interface WeatherData {
  temperature: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
  time: string;
}

interface WeatherWidgetProps {
  widget: DashboardWidget;
  noWrapper?: boolean;
}

const DEFAULT_LAT = 48.2082;
const DEFAULT_LON = 16.3738;
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 Minuten

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ widget, noWrapper = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = widget.config ?? {};
  const lat = Number(config.latitude) || DEFAULT_LAT;
  const lon = Number(config.longitude) || DEFAULT_LON;

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
        timezone: 'Europe/Vienna',
      });
      const res = await fetch(`${OPEN_METEO_BASE}?${params}`);
      if (!res.ok) throw new Error('Wetterdaten konnten nicht geladen werden.');
      const json = await res.json();
      const cur = json.current;
      if (!cur) throw new Error('Ungültige Wetterantwort.');
      setData({
        temperature: cur.temperature_2m,
        humidity: cur.relative_humidity_2m,
        weatherCode: cur.weather_code,
        windSpeed: cur.wind_speed_10m ?? 0,
        time: cur.time ?? '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [lat, lon]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  useEffect(() => {
    const t = setInterval(fetchWeather, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchWeather]);

  if (loading && !data) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: noWrapper ? '100%' : undefined,
          minHeight: 0,
          p: noWrapper ? 0 : 2,
          flex: noWrapper ? 1 : undefined,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Wetter wird geladen…
        </Typography>
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: noWrapper ? '100%' : undefined,
          minHeight: 0,
          p: noWrapper ? 0 : 2,
          flex: noWrapper ? 1 : undefined,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="body2" color="error">
          {error}
        </Typography>
        <IconButton size="small" onClick={fetchWeather} aria-label="Wetter erneut laden" sx={{ mt: 1 }}>
          <RefreshIcon />
        </IconButton>
      </Box>
    );
  }

  const info = data ? getWeatherInfo(data.weatherCode) : null;
  const Icon = info?.Icon ?? CloudIcon;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: noWrapper ? '100%' : undefined,
        minHeight: 0,
        p: noWrapper ? 0 : 2,
        flex: noWrapper ? 1 : undefined,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon sx={{ color: 'primary.main', fontSize: isMobile ? 28 : 32 }} />
          <Typography variant="h6" component="span" fontWeight={600}>
            {data ? `${Math.round(data.temperature)} °C` : '–'}
          </Typography>
        </Box>
        <Tooltip title="Aktualisieren">
          <IconButton
            size="small"
            onClick={fetchWeather}
            disabled={loading}
            aria-label="Wetter aktualisieren"
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {data && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {info?.label}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Luftfeuchtigkeit {data.humidity} % · Wind {Math.round(data.windSpeed)} km/h
          </Typography>
        </>
      )}

      {error && data && (
        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
          Letzte Aktualisierung fehlgeschlagen. {error}
        </Typography>
      )}
    </Box>
  );
};

export default WeatherWidget;
