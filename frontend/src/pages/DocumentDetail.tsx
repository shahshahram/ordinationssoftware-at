import React from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Typography, 
  Divider, 
  CircularProgress, 
  Alert, 
  Stack, 
  TextField, 
  MenuItem, 
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import {
  History,
  CompareArrows,
  Send,
  CheckCircle,
  Cancel,
  Edit
} from '@mui/icons-material';
import api from '../utils/api';
import DocumentStatusWarning from '../components/DocumentStatusWarning';
import DocumentVersionHistory from '../components/DocumentVersionHistory';
import DocumentVersionComparison from '../components/DocumentVersionComparison';

const DocumentDetail: React.FC = () => {
  const { id } = useParams();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any>(null);
  const [edit, setEdit] = React.useState<{ status?: string }>({});
  const [saving, setSaving] = React.useState(false);
  const [files, setFiles] = React.useState<FileList | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(0);
  const [compareVersions, setCompareVersions] = React.useState<[string | null, string | null]>([null, null]);
  const [newVersionDialogOpen, setNewVersionDialogOpen] = React.useState(false);
  const [changeReason, setChangeReason] = React.useState('');
  const [releaseDialogOpen, setReleaseDialogOpen] = React.useState(false);
  const [releaseComment, setReleaseComment] = React.useState('');

  React.useEffect(() => {
    let active = true;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<any>(`/documents/${id}`);
        if (!active) return;
        const d = res.data?.data || res.data;
        setData(d);
        setEdit({ status: d?.status });
      } catch (e: any) {
        if (!active) return;
        setError(e.message || e.response?.data?.message || 'Fehler beim Laden des Dokuments');
      } finally {
        if (active) setLoading(false);
      }
    }
    if (id) run();
    return () => { active = false; };
  }, [id]);
  const handleCreateNewVersion = async () => {
    if (!data || !id) return;
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res: any = await api.post(`/documents/${id}/new-version`, {
        ...edit,
        changeReason
      });
      setData(res.data?.data || res.data);
      setNewVersionDialogOpen(false);
      setChangeReason('');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Fehler beim Erstellen der neuen Version');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await api.post(`/documents/${id}/submit-review`);
      // Dokument neu laden
      const res = await api.get<any>(`/documents/${id}`);
      setData(res.data?.data || res.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Fehler beim Einreichen zur Prüfung');
    } finally {
      setSaving(false);
    }
  };

  const handleRelease = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await api.post(`/documents/${id}/release`, { comment: releaseComment });
      setReleaseDialogOpen(false);
      setReleaseComment('');
      // Dokument neu laden
      const res = await api.get<any>(`/documents/${id}`);
      setData(res.data?.data || res.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Fehler beim Freigeben');
    } finally {
      setSaving(false);
    }
  };

  const handleCompareVersions = (v1: string, v2: string) => {
    setCompareVersions([v1, v2]);
    setActiveTab(2); // Wechsel zu Vergleichs-Tab
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'released': return 'success';
      case 'under_review': return 'warning';
      case 'draft': return 'default';
      case 'withdrawn': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'released': return 'Freigegeben';
      case 'under_review': return 'In Prüfung';
      case 'draft': return 'Entwurf';
      case 'withdrawn': return 'Zurückgezogen';
      default: return status || '—';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Dokument-Details</Typography>
        {data?.currentVersion?.versionNumber && (
          <Chip 
            label={`Version ${data.currentVersion.versionNumber}`} 
            size="small" 
            color={getStatusColor(data.status) as any}
          />
        )}
        {data?.status && (
          <Chip 
            label={getStatusLabel(data.status)} 
            size="small" 
            color={getStatusColor(data.status) as any}
          />
        )}
      </Stack>
      <Divider sx={{ my: 1 }} />
      
      {data && (
        <DocumentStatusWarning
          document={data}
          onCreateNewVersion={() => setNewVersionDialogOpen(true)}
          onViewHistory={() => setActiveTab(1)}
        />
      )}

      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Lade Dokument...</Typography>
          </Stack>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : data ? (
          <>
            <Typography variant="body2" color="text.secondary">Dokument-ID</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>{data._id || data.id || id}</Typography>
            <Typography variant="body2">Titel: {data.title || '—'}</Typography>
            <Typography variant="body2">Typ: {data.type || '—'}</Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2} sx={{ maxWidth: 420 }}>
              <TextField
                select
                label="Status"
                size="small"
                value={edit.status || ''}
                onChange={(e) => setEdit(prev => ({ ...prev, status: e.target.value }))}
              >
                {['draft','ready','sent','received','archived'].map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  disabled={saving}
                  onClick={async () => {
                    try {
                      setSaving(true);
                      const res = await api.put<any>(`/documents/${data._id || data.id || id}`, {
                        status: edit.status
                      });
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

              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2">Anhänge</Typography>
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(e.target.files)}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  disabled={!files || uploading}
                  onClick={async () => {
                    if (!files || files.length === 0) return;
                    try {
                      setUploading(true);
                      const formData = new FormData();
                      Array.from(files).forEach(f => formData.append('attachments', f));
                      const res = await api.post<any>(`/documents/${data._id || data.id || id}/upload`, formData);
                      // Aktualisierte Anhänge übernehmen
                      const uploaded = res.data?.data || [];
                      setData((prev: any) => ({ ...prev, attachments: [...(prev?.attachments || []), ...uploaded] }));
                      setFiles(null);
                    } catch (e: any) {
                      setError(e.response?.data?.message || 'Upload fehlgeschlagen');
                    } finally {
                      setUploading(false);
                    }
                  }}
                >Anhänge hochladen</Button>
                {uploading && <CircularProgress size={20} />}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Vorhanden: {(data.attachments || []).length}
              </Typography>
            </Stack>
            <Typography variant="body2">Patient: {data.patient?.name || data.patient?.id || '—'}</Typography>
            <Typography variant="body2">Erstellt: {data.createdAt ? new Date(data.createdAt).toLocaleString('de-DE') : '—'}</Typography>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Versionierungs-Aktionen */}
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {data.status === 'draft' && (
                <Button
                  variant="outlined"
                  startIcon={<Send />}
                  onClick={handleSubmitForReview}
                  disabled={saving}
                >
                  Zur Prüfung einreichen
                </Button>
              )}
              {data.status === 'under_review' && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={() => setReleaseDialogOpen(true)}
                  disabled={saving}
                >
                  Freigeben
                </Button>
              )}
              {data.isReleased && data.status === 'released' && (
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => setNewVersionDialogOpen(true)}
                  disabled={saving}
                >
                  Neue Version erstellen
                </Button>
              )}
            </Stack>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">Keine Daten</Typography>
        )}
      </Paper>

      {/* Tabs für Versions-Historie und Vergleich */}
      {data && id && (
        <Paper sx={{ mt: 2 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab label="Details" />
            <Tab label="Versions-Historie" icon={<History />} iconPosition="start" />
            {compareVersions[0] && compareVersions[1] && (
              <Tab 
                label={`Vergleich ${compareVersions[0]} ↔ ${compareVersions[1]}`} 
                icon={<CompareArrows />} 
                iconPosition="start" 
              />
            )}
          </Tabs>
          
          {activeTab === 1 && (
            <Box sx={{ p: 2 }}>
              <DocumentVersionHistory
                documentId={id}
                onCompareVersions={handleCompareVersions}
              />
            </Box>
          )}
          
          {activeTab === 2 && compareVersions[0] && compareVersions[1] && (
            <Box sx={{ p: 2 }}>
              <DocumentVersionComparison
                documentId={id}
                version1={compareVersions[0]}
                version2={compareVersions[1]}
                onClose={() => {
                  setCompareVersions([null, null]);
                  setActiveTab(0);
                }}
              />
            </Box>
          )}
        </Paper>
      )}

      {/* Dialog: Neue Version erstellen */}
      <Dialog open={newVersionDialogOpen} onClose={() => setNewVersionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Neue Version erstellen</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Eine neue Version wird erstellt. Die aktuelle Version wird archiviert.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Änderungsgrund"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder="Beschreiben Sie den Grund für die neue Version..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewVersionDialogOpen(false)}>Abbrechen</Button>
          <Button 
            onClick={handleCreateNewVersion} 
            variant="contained" 
            disabled={saving || !changeReason.trim()}
          >
            {saving ? <CircularProgress size={20} /> : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Dokument freigeben */}
      <Dialog open={releaseDialogOpen} onClose={() => setReleaseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dokument freigeben</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Nach der Freigabe kann das Dokument nicht mehr direkt bearbeitet werden. Für Änderungen muss eine neue Version erstellt werden.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Freigabe-Kommentar (optional)"
            value={releaseComment}
            onChange={(e) => setReleaseComment(e.target.value)}
            placeholder="Optional: Kommentar zur Freigabe..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReleaseDialogOpen(false)}>Abbrechen</Button>
          <Button 
            onClick={handleRelease} 
            variant="contained" 
            color="success"
            disabled={saving}
            startIcon={<CheckCircle />}
          >
            {saving ? <CircularProgress size={20} /> : 'Freigeben'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentDetail;


