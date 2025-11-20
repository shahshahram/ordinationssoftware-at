import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Paper, Typography, Divider, CircularProgress, Alert, Stack, TextField, MenuItem, FormControlLabel, Checkbox, Button, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';

const DiagnosisDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any>(null);
  const [edit, setEdit] = React.useState<{ status?: string; isPrimary?: boolean; notes?: string }>({});
  const [saving, setSaving] = React.useState(false);
  
  // Get patientId from URL params or state
  const patientId = React.useMemo(() => {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get('patientId') || (location.state as any)?.patientId;
  }, [location]);

  // Debug logging
  React.useEffect(() => {
    console.log('DiagnosisDetail - patientId from URL:', patientId);
    console.log('DiagnosisDetail - data?.patientId:', data?.patientId);
    console.log('DiagnosisDetail - location.search:', location.search);
  }, [patientId, data?.patientId, location.search]);

  React.useEffect(() => {
    let active = true;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
        const res = await axios.get(`${API_BASE_URL}/diagnoses/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!active) return;
        const d = res.data?.data || res.data;
        setData(d);
        setEdit({ status: d?.status, isPrimary: d?.isPrimary, notes: d?.notes });
      } catch (e: any) {
        if (!active) return;
        setError(e.response?.data?.message || 'Fehler beim Laden der Diagnose');
      } finally {
        if (active) setLoading(false);
      }
    }
    if (id) run();
    return () => { active = false; };
  }, [id]);
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconButton 
          onClick={() => {
            const targetPatientId = patientId || data?.patientId;
            console.log('DiagnosisDetail - Zurück-Button geklickt');
            console.log('DiagnosisDetail - targetPatientId:', targetPatientId);
            console.log('DiagnosisDetail - patientId from URL:', patientId);
            console.log('DiagnosisDetail - data?.patientId:', data?.patientId);
            
            if (targetPatientId) {
              // Verwende die URL-Parameter-Form für bessere Konsistenz
              const targetUrl = `/patient-organizer/${targetPatientId}`;
              console.log('DiagnosisDetail - Navigiere zu:', targetUrl);
              navigate(targetUrl);
            } else {
              console.log('DiagnosisDetail - Keine patientId gefunden, navigiere zu /patient-organizer');
              navigate('/patient-organizer');
            }
          }}
          sx={{ mr: 1 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">Diagnose-Details</Typography>
      </Box>
      <Divider sx={{ my: 1 }} />
      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Lade Diagnose...</Typography>
          </Stack>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : data ? (
          <>
            <Typography variant="body2" color="text.secondary">Diagnose-ID</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>{data._id || id}</Typography>
            <Typography variant="body2">Code: {data.code || '—'}</Typography>
            <Typography variant="body2">Bezeichnung: {data.display || '—'}</Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2} sx={{ maxWidth: 420 }}>
              <TextField
                select
                label="Status"
                size="small"
                value={edit.status || ''}
                onChange={(e) => setEdit(prev => ({ ...prev, status: e.target.value }))}
              >
                {[
                  { value: 'active', label: 'Aktiv' },
                  { value: 'resolved', label: 'Behoben' },
                  { value: 'provisional', label: 'Vorläufig' },
                  { value: 'ruled-out', label: 'Ausgeschlossen' }
                ].map(s => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!edit.isPrimary}
                    onChange={(e) => setEdit(prev => ({ ...prev, isPrimary: e.target.checked }))}
                  />
                }
                label="Primärdiagnose"
              />
              <TextField
                label="Notizen"
                multiline
                minRows={2}
                value={edit.notes || ''}
                onChange={(e) => setEdit(prev => ({ ...prev, notes: e.target.value }))}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  disabled={saving}
                  onClick={async () => {
                    try {
                      setSaving(true);
                      const token = localStorage.getItem('token');
                      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
                      const res = await axios.put(`${API_BASE_URL}/diagnoses/${data._id || id}`,
                        { status: edit.status, isPrimary: edit.isPrimary, notes: edit.notes },
                        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
                      );
                      setData(res.data?.data || res.data);
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
            <Typography variant="body2">Beginn: {data.onsetDate ? new Date(data.onsetDate).toLocaleDateString('de-DE') : '—'}</Typography>
            {data.resolvedDate && <Typography variant="body2">Beendet: {new Date(data.resolvedDate).toLocaleDateString('de-DE')}</Typography>}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">Keine Daten</Typography>
        )}
      </Paper>
    </Box>
  );
};

export default DiagnosisDetail;


