import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Palette as PaletteIcon } from '@mui/icons-material';
import api from '../utils/api';
import type { WidgetThemeConfig } from '../hooks/useWidgetThemeConfig';

const FONT_OPTIONS = [
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Source Sans 3', label: 'Source Sans 3' },
  { value: 'Inter', label: 'Inter' },
];

interface WidgetThemeDialogProps {
  open: boolean;
  onClose: () => void;
  locationId: string;
  locationName: string;
}

const defaultForm: WidgetThemeConfig = {
  primaryColor: '#1976d2',
  secondaryColor: '#dc004e',
  background: '#f5f5f5',
  fontFamily: 'Roboto',
  layout: 'vertical',
  style: 'modern',
};

const WidgetThemeDialog: React.FC<WidgetThemeDialogProps> = ({
  open,
  onClose,
  locationId,
  locationName,
}) => {
  const [form, setForm] = useState<WidgetThemeConfig>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open && locationId) {
      setLoading(true);
      setError(null);
      api
        .get<{ success: boolean; data: WidgetThemeConfig }>(`/locations/${locationId}/widget-theme`)
        .then((res: { data?: { success?: boolean; data?: WidgetThemeConfig } }) => {
          const data = (res?.data?.data ?? res?.data) as WidgetThemeConfig | undefined;
          if (data && typeof data === 'object' && 'primaryColor' in data) {
            const next: WidgetThemeConfig = {
              primaryColor: data.primaryColor ?? defaultForm.primaryColor,
              secondaryColor: data.secondaryColor ?? defaultForm.secondaryColor,
              background: data.background ?? defaultForm.background,
              fontFamily: data.fontFamily ?? defaultForm.fontFamily,
              layout: data.layout === 'horizontal' ? 'horizontal' : 'vertical',
              style: ['classic', 'minimal', 'modern'].includes(data.style) ? (data.style as WidgetThemeConfig['style']) : defaultForm.style,
            };
            setForm(next);
            setPreviewForm(next);
          }
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Fehler beim Laden');
          setForm(defaultForm);
        })
        .finally(() => setLoading(false));
    }
  }, [open, locationId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.put(`/locations/${locationId}/widget-theme`, form);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const [previewForm, setPreviewForm] = useState(form);
  useEffect(() => {
    const t = setTimeout(() => setPreviewForm(form), 400);
    return () => clearTimeout(t);
  }, [form]);

  const previewUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params: Record<string, string> = {
      primaryColor: previewForm.primaryColor,
      secondaryColor: previewForm.secondaryColor,
      background: previewForm.background,
      fontFamily: previewForm.fontFamily,
      layout: previewForm.layout,
      style: previewForm.style,
    };
    return `${window.location.origin}/booking/preview/${locationId}?${new URLSearchParams(params).toString()}`;
  }, [locationId, previewForm]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PaletteIcon />
        Widget-Design: {locationName}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && <Alert severity="success">Gespeichert.</Alert>}

            <Typography variant="subtitle2" color="text.secondary">
              Farben
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Primärfarbe"
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                size="small"
                sx={{ width: 120 }}
                inputProps={{ style: { height: 40 } }}
              />
              <TextField
                label="Sekundärfarbe"
                type="color"
                value={form.secondaryColor}
                onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                size="small"
                sx={{ width: 120 }}
                inputProps={{ style: { height: 40 } }}
              />
              <TextField
                label="Hintergrund"
                type="color"
                value={form.background}
                onChange={(e) => setForm((f) => ({ ...f, background: e.target.value }))}
                size="small"
                sx={{ width: 120 }}
                inputProps={{ style: { height: 40 } }}
              />
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel>Schrift</InputLabel>
              <Select
                value={form.fontFamily}
                label="Schrift"
                onChange={(e) => setForm((f) => ({ ...f, fontFamily: e.target.value }))}
              >
                {FONT_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="subtitle2" color="text.secondary">
              Layout
            </Typography>
            <ToggleButtonGroup
              value={form.layout}
              exclusive
              onChange={(_, v) => v != null && setForm((f) => ({ ...f, layout: v }))}
              size="small"
            >
              <ToggleButton value="vertical" aria-label="Vertikal">
                Vertikal
              </ToggleButton>
              <ToggleButton value="horizontal" aria-label="Horizontal">
                Horizontal
              </ToggleButton>
            </ToggleButtonGroup>

            <Typography variant="subtitle2" color="text.secondary">
              Stil
            </Typography>
            <ToggleButtonGroup
              value={form.style}
              exclusive
              onChange={(_, v) => v != null && setForm((f) => ({ ...f, style: v }))}
              size="small"
            >
              <ToggleButton value="classic" aria-label="Klassisch">
                Klassisch
              </ToggleButton>
              <ToggleButton value="minimal" aria-label="Minimal">
                Minimal
              </ToggleButton>
              <ToggleButton value="modern" aria-label="Modern">
                Modern
              </ToggleButton>
            </ToggleButtonGroup>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
              Vorschau
            </Typography>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                height: 320,
              }}
            >
              <iframe
                key={previewUrl}
                title="Widget-Vorschau"
                src={previewUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
              />
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Schließen</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Speichern…' : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WidgetThemeDialog;
