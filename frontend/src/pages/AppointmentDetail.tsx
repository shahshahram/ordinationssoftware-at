import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Typography, Divider, CircularProgress, Alert, Stack, TextField, MenuItem, Button } from '@mui/material';
import axios from 'axios';

const AppointmentDetail: React.FC = () => {
  const { id } = useParams();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any>(null);
  const [edit, setEdit] = React.useState<{ status?: string; description?: string }>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5001/api/appointments/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!active) return;
        setData(res.data?.data || res.data);
        setEdit({ status: res.data?.data?.status || res.data?.status, description: res.data?.data?.description || res.data?.description });
      } catch (e: any) {
        if (!active) return;
        setError(e.response?.data?.message || 'Fehler beim Laden des Termins');
      } finally {
        if (active) setLoading(false);
      }
    }
    if (id) run();
    return () => { active = false; };
  }, [id]);
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5">Termin-Details</Typography>
      <Divider sx={{ my: 1 }} />
      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Lade Termin...</Typography>
          </Stack>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : data ? (
          <>
            <Typography variant="body2" color="text.secondary">Termin-ID</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>{data._id || id}</Typography>
            <Typography variant="body2">Titel: {data.title || data.type || '—'}</Typography>
            <Typography variant="body2">Beginn: {data.startTime ? new Date(data.startTime).toLocaleString('de-DE') : '—'}</Typography>
            <Typography variant="body2">Ende: {data.endTime ? new Date(data.endTime).toLocaleString('de-DE') : '—'}</Typography>
            <Typography variant="body2">Arzt: {data.doctor || '—'}</Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2} sx={{ maxWidth: 420 }}>
              <TextField
                select
                label="Status"
                size="small"
                value={edit.status || ''}
                onChange={(e) => setEdit(prev => ({ ...prev, status: e.target.value }))}
              >
                {['scheduled','confirmed','completed','cancelled','no-show'].map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Beschreibung"
                multiline
                minRows={2}
                value={edit.description || ''}
                onChange={(e) => setEdit(prev => ({ ...prev, description: e.target.value }))}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  disabled={saving}
                  onClick={async () => {
                    try {
                      setSaving(true);
                      const token = localStorage.getItem('token');
                      const res = await axios.put(`http://localhost:5001/api/appointments/${data._id || id}`,
                        { status: edit.status, description: edit.description },
                        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
                      );
                      const updated = res.data?.data || res.data;
                      setData(updated);
                    } catch (e: any) {
                      setError(e.response?.data?.message || 'Aktualisieren fehlgeschlagen');
                    } finally {
                      setSaving(false);
                    }
                  }}
                >Speichern</Button>
                {saving && <CircularProgress size={20} />}
              </Stack>
            </Stack>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">Keine Daten</Typography>
        )}
      </Paper>
    </Box>
  );
};

export default AppointmentDetail;


