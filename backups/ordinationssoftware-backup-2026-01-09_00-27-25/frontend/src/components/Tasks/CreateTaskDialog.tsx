import React, { useState, useEffect } from 'react';
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
  Chip,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createTask,
  fetchAllUsers,
  CreateTaskData,
  User
} from '../../store/slices/tasksSlice';
import { useSnackbar } from 'notistack';

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  patientId?: string;
}

const MEDICAL_ROLES = ['arzt', 'admin', 'super_admin'];

const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  open,
  onClose,
  patientId
}) => {
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { allUsers, loading } = useAppSelector((state) => state.tasks);
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    assignedTo: [],
    priority: 'medium',
    dueDate: '',
    patientId
  });

  useEffect(() => {
    if (open) {
      dispatch(fetchAllUsers());
    }
  }, [open, dispatch]);

  useEffect(() => {
    if (selectAll && allUsers.length > 0) {
      // Wenn "Alle" ausgewählt ist, setze alle User-IDs
      const allUserIds = allUsers.map((user: User) => user._id);
      setFormData(prev => ({
        ...prev,
        assignedTo: allUserIds
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        assignedTo: selectedUsers
      }));
    }
  }, [selectedUsers, selectAll, allUsers]);

  const handleUserToggle = (userId: string) => {
    // Wenn ein einzelner User ausgewählt wird, deaktiviere "Alle"
    if (selectAll) {
      setSelectAll(false);
    }
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSelectAllToggle = () => {
    if (selectAll) {
      // "Alle" deaktivieren
      setSelectAll(false);
      setSelectedUsers([]);
    } else {
      // "Alle" aktivieren
      setSelectAll(true);
      setSelectedUsers([]); // Leere individuelle Auswahl
    }
  };

  const handleInputChange = (field: keyof CreateTaskData, value: string | string[] | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      enqueueSnackbar('Bitte geben Sie einen Titel ein', { variant: 'warning' });
      return;
    }

    if (!selectAll && formData.assignedTo.length === 0) {
      enqueueSnackbar('Bitte wählen Sie mindestens einen Benutzer aus oder wählen Sie "Alle"', { variant: 'warning' });
      return;
    }

    try {
      await dispatch(createTask(formData)).unwrap();
      enqueueSnackbar('Aufgabe erfolgreich erstellt', { variant: 'success' });
      handleClose();
    } catch (error: any) {
      enqueueSnackbar(error || 'Fehler beim Erstellen der Aufgabe', { variant: 'error' });
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      assignedTo: [],
      priority: 'medium',
      dueDate: '',
      patientId
    });
    setSelectedUsers([]);
    setSelectAll(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Neue Aufgabe erstellen
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Titel *"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="Beschreibung"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            fullWidth
            multiline
            rows={3}
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Benutzer auswählen (klicken Sie auf die Chips) *
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : allUsers.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Keine Benutzer verfügbar
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, minHeight: 60 }}>
                {/* "Alle"-Chip */}
                <Chip
                  label="Alle"
                  onClick={handleSelectAllToggle}
                  color={selectAll ? 'primary' : 'default'}
                  variant={selectAll ? 'filled' : 'outlined'}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    '&:hover': {
                      bgcolor: selectAll ? 'primary.dark' : 'action.hover'
                    }
                  }}
                />
                {allUsers.map((user: User) => {
                  const isSelected = !selectAll && selectedUsers.includes(user._id);
                  return (
                    <Chip
                      key={user._id}
                      label={`${user.firstName} ${user.lastName}${user.role ? ` (${user.role})` : ''}`}
                      onClick={() => handleUserToggle(user._id)}
                      color={isSelected ? 'primary' : 'default'}
                      variant={isSelected ? 'filled' : 'outlined'}
                      disabled={selectAll}
                      sx={{
                        cursor: selectAll ? 'not-allowed' : 'pointer',
                        opacity: selectAll ? 0.5 : 1,
                        '&:hover': {
                          bgcolor: selectAll ? 'transparent' : (isSelected ? 'primary.dark' : 'action.hover')
                        }
                      }}
                    />
                  );
                })}
              </Box>
            )}
            {(selectAll || selectedUsers.length > 0) && (
              <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                {selectAll ? `Alle ${allUsers.length} Benutzer ausgewählt` : `${selectedUsers.length} Benutzer ausgewählt`}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Priorität</InputLabel>
              <Select
                value={formData.priority}
                label="Priorität"
                onChange={(e) => handleInputChange('priority', e.target.value as CreateTaskData['priority'])}
              >
                <MenuItem value="low">Niedrig</MenuItem>
                <MenuItem value="medium">Mittel</MenuItem>
                <MenuItem value="high">Hoch</MenuItem>
                <MenuItem value="urgent">Dringend</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Fälligkeitsdatum"
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => handleInputChange('dueDate', e.target.value)}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="secondary">
          Abbrechen
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || !formData.title || (!selectAll && formData.assignedTo.length === 0)}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Aufgabe erstellen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTaskDialog;







