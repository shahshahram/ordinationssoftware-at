import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
  Divider,
  Badge,
  Tooltip,
  Paper
} from '@mui/material';
import {
  Close,
  Send,
  Mail,
  MailOutline,
  Archive,
  Delete,
  Reply,
  PriorityHigh,
  Person
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  fetchMessages, 
  sendMessage, 
  markAsRead, 
  archiveMessage, 
  deleteMessage,
  fetchUnreadCount,
  setSelectedMessage,
  InternalMessage,
  CreateMessageData
} from '../store/slices/internalMessagesSlice';
import { fetchStaffProfiles } from '../store/slices/staffSlice';
import { addNotification } from '../store/slices/uiSlice';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface InternalMessagesDialogProps {
  open: boolean;
  onClose: () => void;
  initialTab?: 'inbox' | 'sent' | 'archived';
}

const InternalMessagesDialog: React.FC<InternalMessagesDialogProps> = ({ 
  open, 
  onClose, 
  initialTab = 'inbox' 
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { inbox, sent, archived, unreadCount, selectedMessage, loading } = useAppSelector(
    (state) => state.internalMessages
  );
  const { staffProfiles } = useAppSelector((state) => state.staff);

  const [activeTab, setActiveTab] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState<CreateMessageData>({
    recipientId: '',
    subject: '',
    message: '',
    priority: 'normal'
  });
  const [replyingTo, setReplyingTo] = useState<InternalMessage | null>(null);

  useEffect(() => {
    if (open) {
      dispatch(fetchMessages({ type: 'inbox' }));
      dispatch(fetchMessages({ type: 'sent' }));
      dispatch(fetchMessages({ type: 'archived' }));
      dispatch(fetchUnreadCount());
      dispatch(fetchStaffProfiles());
      
      if (initialTab === 'sent') {
        setActiveTab(1);
      } else if (initialTab === 'archived') {
        setActiveTab(2);
      }
    }
  }, [open, dispatch, initialTab]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const types = ['inbox', 'sent', 'archived'] as const;
    dispatch(fetchMessages({ type: types[newValue] }));
  };

  const handleMessageClick = async (message: InternalMessage) => {
    dispatch(setSelectedMessage(message));
    if (message.status !== 'read' && message.recipientId._id === user?._id) {
      await dispatch(markAsRead(message._id));
    }
  };

  const handleCompose = (replyTo?: InternalMessage) => {
    if (replyTo) {
      setReplyingTo(replyTo);
      setComposeData({
        recipientId: replyTo.senderId._id,
        subject: `Re: ${replyTo.subject}`,
        message: `\n\n--- Ursprüngliche Nachricht ---\nVon: ${replyTo.senderId.firstName} ${replyTo.senderId.lastName}\nDatum: ${format(new Date(replyTo.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}\n\n${replyTo.message}`,
        priority: 'normal',
        replyTo: replyTo._id
      });
    } else {
      setReplyingTo(null);
      setComposeData({
        recipientId: '',
        subject: '',
        message: '',
        priority: 'normal'
      });
    }
    setComposeOpen(true);
  };

  const handleSend = async () => {
    if (!composeData.recipientId || !composeData.subject || !composeData.message) {
      return;
    }

    try {
      await dispatch(sendMessage(composeData)).unwrap();
      setComposeOpen(false);
      setComposeData({
        recipientId: '',
        subject: '',
        message: '',
        priority: 'normal'
      });
      setReplyingTo(null);
      dispatch(fetchMessages({ type: 'sent' }));
      dispatch(fetchUnreadCount());
      dispatch(addNotification({
        type: 'success',
        title: 'Nachricht gesendet',
        message: 'Ihre Nachricht wurde erfolgreich gesendet.'
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Fehler',
        message: 'Fehler beim Senden der Nachricht.'
      }));
    }
  };

  const handleArchive = async (message: InternalMessage) => {
    await dispatch(archiveMessage(message._id));
    dispatch(fetchUnreadCount());
  };

  const handleDelete = async (message: InternalMessage) => {
    if (window.confirm('Möchten Sie diese Nachricht wirklich löschen?')) {
      await dispatch(deleteMessage(message._id));
      if (selectedMessage?._id === message._id) {
        dispatch(setSelectedMessage(null));
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const renderMessageList = (messages: InternalMessage[]) => {
    if (loading) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Lade Nachrichten...
          </Typography>
        </Box>
      );
    }

    if (messages.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Keine Nachrichten
          </Typography>
        </Box>
      );
    }

    return (
      <List>
        {messages.map((message: InternalMessage) => {
          const isUnread = message.status === 'sent' || message.status === 'delivered';
          const isSelected = selectedMessage?._id === message._id;
          
          return (
            <ListItem
              key={message._id}
              onClick={() => handleMessageClick(message)}
              sx={{
                bgcolor: isSelected ? 'action.selected' : isUnread ? 'action.hover' : 'transparent',
                borderLeft: isSelected ? 4 : 0,
                borderLeftColor: 'primary.main',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <ListItemIcon>
                {isUnread ? (
                  <MailOutline color="primary" />
                ) : (
                  <Mail color="action" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }} component="span">
                    <Typography variant="body1" component="span" sx={{ fontWeight: isUnread ? 600 : 400, flex: 1 }}>
                      {message.subject}
                    </Typography>
                    {message.priority === 'urgent' && (
                      <PriorityHigh color="error" fontSize="small" />
                    )}
                    {message.priority !== 'normal' && (
                      <Chip 
                        label={message.priority} 
                        size="small" 
                        color={getPriorityColor(message.priority) as any}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                      {activeTab === 0 
                        ? `Von: ${message.senderId.firstName} ${message.senderId.lastName}`
                        : `An: ${message.recipientId.firstName} ${message.recipientId.lastName}`
                      }
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block', mt: 0.5 }}>
                      {format(new Date(message.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </Typography>
                  </>
                }
              />
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {activeTab === 0 && (
                  <Tooltip title="Antworten">
                    <IconButton size="small" onClick={(e) => {
                      e.stopPropagation();
                      handleCompose(message);
                    }}>
                      <Reply fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Archivieren">
                  <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleArchive(message);
                  }}>
                    <Archive fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Löschen">
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(message);
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </ListItem>
          );
        })}
      </List>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Mail />
            <Typography variant="h6">Interne Nachrichten</Typography>
            {unreadCount > 0 && (
              <Badge badgeContent={unreadCount} color="error">
                <Box />
              </Badge>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={() => handleCompose()}
              size="small"
            >
              Neu
            </Button>
            <IconButton size="small" onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab 
                label={
                  <Badge badgeContent={unreadCount} color="error">
                    <span>Posteingang</span>
                  </Badge>
                } 
              />
              <Tab label="Gesendet" />
              <Tab label="Archiviert" />
            </Tabs>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto', display: 'flex' }}>
            <Box sx={{ width: '40%', borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
              {activeTab === 0 && renderMessageList(inbox)}
              {activeTab === 1 && renderMessageList(sent)}
              {activeTab === 2 && renderMessageList(archived)}
            </Box>
            <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
              {selectedMessage ? (
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">{selectedMessage.subject}</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {selectedMessage.priority !== 'normal' && (
                        <Chip 
                          label={selectedMessage.priority} 
                          color={getPriorityColor(selectedMessage.priority) as any}
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Von: {selectedMessage.senderId.firstName} {selectedMessage.senderId.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      An: {selectedMessage.recipientId.firstName} {selectedMessage.recipientId.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Datum: {format(new Date(selectedMessage.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedMessage.message}
                  </Typography>
                  {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Anhänge:
                      </Typography>
                      {selectedMessage.attachments.map((att, idx) => (
                        <Chip
                          key={idx}
                          label={att.filename}
                          onClick={() => window.open(att.url, '_blank')}
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  )}
                </Paper>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <MailOutline sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Wählen Sie eine Nachricht aus
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Compose Dialog */}
      <Dialog
        open={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          setReplyingTo(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {replyingTo ? 'Antworten' : 'Neue Nachricht'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Autocomplete
              options={staffProfiles}
              getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.email})`}
              getOptionKey={(option) => option.user_id || option._id || `${option.first_name}-${option.last_name}`}
              isOptionEqualToValue={(option, value) => option.user_id === value.user_id}
              value={staffProfiles.find(p => p.user_id === composeData.recipientId) || null}
              onChange={(_event, newValue) => {
                setComposeData(prev => ({
                  ...prev,
                  recipientId: newValue?.user_id || ''
                }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Empfänger"
                  required
                />
              )}
            />
            <TextField
              label="Betreff"
              value={composeData.subject}
              onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
              required
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Priorität</InputLabel>
              <Select
                value={composeData.priority}
                onChange={(e) => setComposeData(prev => ({ 
                  ...prev, 
                  priority: e.target.value as any 
                }))}
                label="Priorität"
              >
                <MenuItem value="low">Niedrig</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">Hoch</MenuItem>
                <MenuItem value="urgent">Dringend</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Nachricht"
              value={composeData.message}
              onChange={(e) => setComposeData(prev => ({ ...prev, message: e.target.value }))}
              required
              multiline
              rows={8}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setComposeOpen(false);
            setReplyingTo(null);
          }}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={handleSend}
            disabled={!composeData.recipientId || !composeData.subject || !composeData.message}
          >
            Senden
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InternalMessagesDialog;

