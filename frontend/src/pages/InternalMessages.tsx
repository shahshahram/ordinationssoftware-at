import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Drawer,
  ListItemButton,
  Toolbar,
  AppBar,
  Checkbox,
  Menu,
  MenuList,
  MenuItem as MuiMenuItem,
  Snackbar,
  Alert,
  CircularProgress,
  InputAdornment,
  Fab
} from '@mui/material';
import {
  Send,
  Mail,
  MailOutline,
  Archive,
  Delete,
  Reply,
  Forward,
  PriorityHigh,
  Person,
  Close,
  Add,
  Folder,
  FolderOpen,
  Edit,
  MoreVert,
  Search,
  CheckCircle,
  Star,
  StarBorder,
  FilterList,
  Refresh,
  Inbox,
  Send as SendIcon,
  DeleteOutline,
  CreateNewFolder,
  DriveFileMove,
  MarkEmailRead,
  MarkEmailUnread
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchMessages,
  sendMessage,
  markAsRead,
  markAllAsRead,
  archiveMessage,
  deleteMessage,
  fetchUnreadCount,
  setSelectedMessage,
  InternalMessage,
  CreateMessageData
} from '../store/slices/internalMessagesSlice';
import {
  fetchFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  moveMessagesToFolder,
  fetchFolderMessages,
  MessageFolder,
  CreateFolderData
} from '../store/slices/messageFoldersSlice';
import { fetchStaffProfiles } from '../store/slices/staffSlice';
import { addNotification } from '../store/slices/uiSlice';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const InternalMessages: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { inbox, sent, archived, unreadCount, selectedMessage, loading } = useAppSelector(
    (state) => state.internalMessages
  );
  const { folders, folderMessages, selectedFolder, loading: foldersLoading } = useAppSelector(
    (state) => state.messageFolders
  );
  const { staffProfiles } = useAppSelector((state) => state.staff);

  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'archived' | 'folder'>('inbox');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderEditDialogOpen, setFolderEditDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [folderMenuAnchor, setFolderMenuAnchor] = useState<null | HTMLElement>(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<null | { element: HTMLElement; messageId: string }>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const [composeData, setComposeData] = useState<CreateMessageData>({
    recipientId: '',
    subject: '',
    message: '',
    priority: 'normal'
  });
  const [folderFormData, setFolderFormData] = useState<CreateFolderData>({
    name: '',
    description: '',
    color: '#1976d2',
    icon: 'folder'
  });
  const [editingFolder, setEditingFolder] = useState<MessageFolder | null>(null);
  const [replyingTo, setReplyingTo] = useState<InternalMessage | null>(null);
  const [forwardingFrom, setForwardingFrom] = useState<InternalMessage | null>(null);

  // Lade Daten beim Mount
  useEffect(() => {
    dispatch(fetchFolders());
    dispatch(fetchMessages({ type: 'inbox' }));
    dispatch(fetchMessages({ type: 'sent' }));
    dispatch(fetchMessages({ type: 'archived' }));
    dispatch(fetchStaffProfiles());
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  // Lade Nachrichten für ausgewählten Ordner
  useEffect(() => {
    if (selectedFolderId && activeTab === 'folder') {
      dispatch(fetchFolderMessages({ folderId: selectedFolderId }));
    }
  }, [selectedFolderId, activeTab, dispatch]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    const tabs: Array<'inbox' | 'sent' | 'archived' | 'folder'> = ['inbox', 'sent', 'archived', 'folder'];
    const newTab = tabs[newValue] || 'inbox';
    setActiveTab(newTab);
    setSelectedFolderId(null);
    setSelectedMessages([]);
    
    if (newTab === 'folder') {
      // Wähle ersten benutzerdefinierten Ordner
      const customFolder = folders.find(f => !f.isSystem && f.name !== 'Posteingang' && f.name !== 'Gesendet' && f.name !== 'Archiv' && f.name !== 'Papierkorb');
      if (customFolder) {
        setSelectedFolderId(customFolder._id);
      }
    } else {
      dispatch(fetchMessages({ type: newTab }));
    }
  };

  const handleMessageClick = async (message: InternalMessage) => {
    const currentUserId = user?._id || (user as any)?.id || null;
    const recipientId = typeof message.recipientId === 'object' ? message.recipientId._id : message.recipientId;
    
    dispatch(setSelectedMessage(message));
    
    const isUnread = message.status === 'sent' || message.status === 'delivered';
    const isRecipient = currentUserId && recipientId && (recipientId.toString() === currentUserId.toString());
    
    if (isUnread && isRecipient) {
      await dispatch(markAsRead(message._id));
      dispatch(fetchUnreadCount());
    }
  };

  const handleCompose = (replyTo?: InternalMessage) => {
    if (replyTo) {
      setReplyingTo(replyTo);
      setForwardingFrom(null);
      setComposeData({
        recipientId: typeof replyTo.senderId === 'object' ? replyTo.senderId._id : replyTo.senderId,
        subject: `Re: ${replyTo.subject}`,
        message: `\n\n--- Ursprüngliche Nachricht ---\nVon: ${typeof replyTo.senderId === 'object' ? replyTo.senderId.firstName : ''} ${typeof replyTo.senderId === 'object' ? replyTo.senderId.lastName : ''}\nDatum: ${format(new Date(replyTo.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}\n\n${replyTo.message}`,
        priority: 'normal',
        replyTo: replyTo._id
      });
    } else {
      setReplyingTo(null);
      setForwardingFrom(null);
      setComposeData({
        recipientId: '',
        subject: '',
        message: '',
        priority: 'normal'
      });
    }
    setComposeOpen(true);
  };

  const handleForward = (message: InternalMessage) => {
    setForwardingFrom(message);
    setReplyingTo(null);
    setComposeData({
      recipientId: '',
      subject: `Fwd: ${message.subject}`,
      message: `\n\n--- Weitergeleitete Nachricht ---\nVon: ${typeof message.senderId === 'object' ? message.senderId.firstName : ''} ${typeof message.senderId === 'object' ? message.senderId.lastName : ''}\nAn: ${typeof message.recipientId === 'object' ? message.recipientId.firstName : ''} ${typeof message.recipientId === 'object' ? message.recipientId.lastName : ''}\nDatum: ${format(new Date(message.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}\nBetreff: ${message.subject}\n\n${message.message}`,
      priority: message.priority || 'normal',
      forwardedFrom: message._id
    });
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
      setForwardingFrom(null);
      dispatch(fetchMessages({ type: 'sent' }));
      dispatch(fetchUnreadCount());
      setSnackbar({ open: true, message: 'Nachricht erfolgreich gesendet', severity: 'success' });
    } catch (error) {
      console.error('Error sending message:', error);
      setSnackbar({ open: true, message: 'Fehler beim Senden der Nachricht', severity: 'error' });
    }
  };

  const handleArchive = async (message: InternalMessage) => {
    await dispatch(archiveMessage(message._id));
    dispatch(fetchUnreadCount());
    if (selectedMessage?._id === message._id) {
      dispatch(setSelectedMessage(null));
    }
  };

  const handleDelete = async (message: InternalMessage) => {
    if (window.confirm('Möchten Sie diese Nachricht wirklich löschen?')) {
      await dispatch(deleteMessage(message._id));
      if (selectedMessage?._id === message._id) {
        dispatch(setSelectedMessage(null));
      }
      setSnackbar({ open: true, message: 'Nachricht gelöscht', severity: 'success' });
    }
  };

  const handleCreateFolder = async () => {
    if (!folderFormData.name.trim()) {
      setSnackbar({ open: true, message: 'Bitte geben Sie einen Ordnernamen ein', severity: 'error' });
      return;
    }

    try {
      await dispatch(createFolder(folderFormData)).unwrap();
      setFolderDialogOpen(false);
      setFolderFormData({ name: '', description: '', color: '#1976d2', icon: 'folder' });
      setSnackbar({ open: true, message: 'Ordner erfolgreich erstellt', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Fehler beim Erstellen des Ordners', severity: 'error' });
    }
  };

  const handleEditFolder = async () => {
    if (!editingFolder || !folderFormData.name.trim()) {
      return;
    }

    try {
      await dispatch(updateFolder({ id: editingFolder._id, updates: folderFormData })).unwrap();
      setFolderEditDialogOpen(false);
      setEditingFolder(null);
      setFolderFormData({ name: '', description: '', color: '#1976d2', icon: 'folder' });
      setSnackbar({ open: true, message: 'Ordner erfolgreich aktualisiert', severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Fehler beim Aktualisieren des Ordners', severity: 'error' });
    }
  };

  const handleDeleteFolder = async (folder: MessageFolder) => {
    if (folder.isSystem) {
      setSnackbar({ open: true, message: 'System-Ordner können nicht gelöscht werden', severity: 'error' });
      return;
    }

    if (window.confirm(`Möchten Sie den Ordner "${folder.name}" wirklich löschen? Alle Nachrichten werden in den Posteingang verschoben.`)) {
      try {
        await dispatch(deleteFolder(folder._id)).unwrap();
        if (selectedFolderId === folder._id) {
          setSelectedFolderId(null);
          setActiveTab('inbox');
        }
        setSnackbar({ open: true, message: 'Ordner erfolgreich gelöscht', severity: 'success' });
      } catch (error: any) {
        setSnackbar({ open: true, message: error.message || 'Fehler beim Löschen des Ordners', severity: 'error' });
      }
    }
  };

  const handleMoveToFolder = async (folderId: string) => {
    if (selectedMessages.length === 0) {
      setSnackbar({ open: true, message: 'Bitte wählen Sie mindestens eine Nachricht aus', severity: 'error' });
      return;
    }

    try {
      await dispatch(moveMessagesToFolder({ folderId, messageIds: selectedMessages })).unwrap();
      setMoveDialogOpen(false);
      setSelectedMessages([]);
      
      // Aktualisiere Nachrichten
      if (activeTab === 'inbox') {
        dispatch(fetchMessages({ type: 'inbox' }));
      } else if (activeTab === 'sent') {
        dispatch(fetchMessages({ type: 'sent' }));
      } else if (activeTab === 'archived') {
        dispatch(fetchMessages({ type: 'archived' }));
      } else if (activeTab === 'folder' && selectedFolderId) {
        dispatch(fetchFolderMessages({ folderId: selectedFolderId }));
      }
      
      setSnackbar({ open: true, message: `${selectedMessages.length} Nachricht(en) erfolgreich verschoben`, severity: 'success' });
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Fehler beim Verschieben der Nachrichten', severity: 'error' });
    }
  };

  const handleToggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleSelectAll = (messages: InternalMessage[]) => {
    if (selectedMessages.length === messages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(messages.map(m => m._id));
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

  const getCurrentMessages = (): InternalMessage[] => {
    if (activeTab === 'inbox') return inbox;
    if (activeTab === 'sent') return sent;
    if (activeTab === 'archived') return archived;
    if (activeTab === 'folder' && selectedFolderId) {
      return folderMessages[selectedFolderId] || [];
    }
    return [];
  };

  const filteredMessages = getCurrentMessages().filter(msg => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      msg.subject.toLowerCase().includes(query) ||
      msg.message.toLowerCase().includes(query) ||
      (typeof msg.senderId === 'object' && `${msg.senderId.firstName} ${msg.senderId.lastName}`.toLowerCase().includes(query)) ||
      (typeof msg.recipientId === 'object' && `${msg.recipientId.firstName} ${msg.recipientId.lastName}`.toLowerCase().includes(query))
    );
  });

  const systemFolders = folders.filter(f => f.isSystem);
  const customFolders = folders.filter(f => !f.isSystem);

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Sidebar mit Ordnern */}
      <Drawer
        variant="permanent"
        sx={{
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            position: 'relative',
            height: '100%'
          }
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Typography variant="h6" noWrap component="div">
              Ordner
            </Typography>
            <Tooltip title="Neuen Ordner erstellen">
              <IconButton
                size="small"
                onClick={() => {
                  setFolderFormData({ name: '', description: '', color: '#1976d2', icon: 'folder' });
                  setFolderDialogOpen(true);
                }}
              >
                <CreateNewFolder />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
        
        <Box sx={{ overflow: 'auto', flex: 1 }}>
          <List sx={{ py: 1 }}>
            {/* System-Ordner */}
            <ListItem disablePadding>
              <ListItemButton
                selected={activeTab === 'inbox'}
                onClick={() => {
                  setActiveTab('inbox');
                  setSelectedFolderId(null);
                  dispatch(fetchMessages({ type: 'inbox' }));
                }}
              >
                <ListItemIcon>
                  <Badge badgeContent={unreadCount} color="error">
                    <Inbox />
                  </Badge>
                </ListItemIcon>
                <ListItemText primary="Posteingang" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                selected={activeTab === 'sent'}
                onClick={() => {
                  setActiveTab('sent');
                  setSelectedFolderId(null);
                  dispatch(fetchMessages({ type: 'sent' }));
                }}
              >
                <ListItemIcon>
                  <SendIcon />
                </ListItemIcon>
                <ListItemText primary="Gesendet" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                selected={activeTab === 'archived'}
                onClick={() => {
                  setActiveTab('archived');
                  setSelectedFolderId(null);
                  dispatch(fetchMessages({ type: 'archived' }));
                }}
              >
                <ListItemIcon>
                  <Archive />
                </ListItemIcon>
                <ListItemText primary="Archiv" />
              </ListItemButton>
            </ListItem>
            
            <Divider sx={{ my: 1 }} />
            
            {/* Benutzerdefinierte Ordner */}
            {customFolders.map((folder) => (
              <ListItem
                key={folder._id}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolderMenuAnchor(e.currentTarget);
                      setEditingFolder(folder);
                    }}
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton
                  selected={activeTab === 'folder' && selectedFolderId === folder._id}
                  onClick={() => {
                    setActiveTab('folder');
                    setSelectedFolderId(folder._id);
                    dispatch(fetchFolderMessages({ folderId: folder._id }));
                  }}
                >
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '4px',
                        bgcolor: folder.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Folder sx={{ fontSize: 16, color: 'white' }} />
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={folder.name}
                    secondary={folder.messageCount ? `${folder.messageCount} Nachrichten` : undefined}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Hauptbereich */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              <TextField
                size="small"
                placeholder="Nachrichten durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
                sx={{ minWidth: 300 }}
              />
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={() => handleCompose()}
                size="small"
              >
                Neu
              </Button>
              {selectedMessages.length > 0 && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<DriveFileMove />}
                    onClick={() => setMoveDialogOpen(true)}
                    size="small"
                  >
                    Verschieben ({selectedMessages.length})
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Delete />}
                    onClick={async () => {
                      for (const msgId of selectedMessages) {
                        const msg = getCurrentMessages().find(m => m._id === msgId);
                        if (msg) {
                          await dispatch(deleteMessage(msgId));
                        }
                      }
                      setSelectedMessages([]);
                    }}
                    size="small"
                    color="error"
                  >
                    Löschen ({selectedMessages.length})
                  </Button>
                </>
              )}
              <IconButton onClick={() => {
                if (activeTab === 'inbox') {
                  dispatch(fetchMessages({ type: 'inbox' }));
                } else if (activeTab === 'sent') {
                  dispatch(fetchMessages({ type: 'sent' }));
                } else if (activeTab === 'archived') {
                  dispatch(fetchMessages({ type: 'archived' }));
                } else if (activeTab === 'folder' && selectedFolderId) {
                  dispatch(fetchFolderMessages({ folderId: selectedFolderId }));
                }
                dispatch(fetchUnreadCount());
              }}>
                <Refresh />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Nachrichtenliste und Detailansicht */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Nachrichtenliste */}
          <Box sx={{ width: '40%', borderRight: '1px solid', borderColor: 'divider', overflow: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : filteredMessages.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <MailOutline sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  {searchQuery ? 'Keine Nachrichten gefunden' : 'Keine Nachrichten'}
                </Typography>
              </Box>
            ) : (
              <List sx={{ py: 0 }}>
                {/* Select All Checkbox */}
                <ListItem>
                  <Checkbox
                    checked={selectedMessages.length === filteredMessages.length && filteredMessages.length > 0}
                    indeterminate={selectedMessages.length > 0 && selectedMessages.length < filteredMessages.length}
                    onChange={() => handleSelectAll(filteredMessages)}
                  />
                  <ListItemText
                    primary={`${selectedMessages.length} von ${filteredMessages.length} ausgewählt`}
                    primaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                <Divider />
                
                {filteredMessages.map((message: InternalMessage) => {
                  const isUnread = message.status === 'sent' || message.status === 'delivered';
                  const isSelected = selectedMessage?._id === message._id;
                  const isChecked = selectedMessages.includes(message._id);
                  
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
                      <Checkbox
                        checked={isChecked}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleMessageSelection(message._id);
                        }}
                        size="small"
                      />
                      <ListItemIcon>
                        {isUnread ? (
                          <MailOutline color="primary" />
                        ) : (
                          <Mail color="action" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: isUnread ? 600 : 400, flex: 1 }}>
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
                            <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
                              {activeTab === 'inbox'
                                ? `Von: ${typeof message.senderId === 'object' ? message.senderId.firstName : ''} ${typeof message.senderId === 'object' ? message.senderId.lastName : ''}`
                                : `An: ${typeof message.recipientId === 'object' ? message.recipientId.firstName : ''} ${typeof message.recipientId === 'object' ? message.recipientId.lastName : ''}`
                              }
                            </Typography>
                            <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
                              {format(new Date(message.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                            </Typography>
                          </>
                        }
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMessageMenuAnchor({ element: e.currentTarget, messageId: message._id });
                        }}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>

          {/* Detailansicht */}
          <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
            {selectedMessage ? (
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h5">{selectedMessage.subject}</Typography>
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
                    Von: {typeof selectedMessage.senderId === 'object' ? selectedMessage.senderId.firstName : ''} {typeof selectedMessage.senderId === 'object' ? selectedMessage.senderId.lastName : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    An: {typeof selectedMessage.recipientId === 'object' ? selectedMessage.recipientId.firstName : ''} {typeof selectedMessage.recipientId === 'object' ? selectedMessage.recipientId.lastName : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Datum: {format(new Date(selectedMessage.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                {/* Zeige ursprüngliche Nachricht, wenn es eine Antwort ist */}
                {selectedMessage.replyTo && (
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                      Antwort auf:
                    </Typography>
                    {typeof selectedMessage.replyTo === 'object' && selectedMessage.replyTo !== null ? (
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Von: {selectedMessage.replyTo.senderId?.firstName || ''} {selectedMessage.replyTo.senderId?.lastName || ''}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Betreff: {selectedMessage.replyTo.subject}
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', whiteSpace: 'pre-wrap', mt: 1 }}>
                          {selectedMessage.replyTo.message}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                        {selectedMessage.message.includes('--- Ursprüngliche Nachricht ---')
                          ? selectedMessage.message.split('--- Ursprüngliche Nachricht ---')[0].trim()
                          : 'Ursprüngliche Nachricht'}
                      </Typography>
                    )}
                  </Box>
                )}
                
                {/* Zeige ursprüngliche Nachricht, wenn es eine Weiterleitung ist */}
                {selectedMessage.forwardedFrom && (
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, borderLeft: '3px solid', borderLeftColor: 'warning.main' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                      Weitergeleitet von:
                    </Typography>
                    {typeof selectedMessage.forwardedFrom === 'object' && selectedMessage.forwardedFrom !== null ? (
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Von: {selectedMessage.forwardedFrom.senderId?.firstName || ''} {selectedMessage.forwardedFrom.senderId?.lastName || ''}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          An: {selectedMessage.forwardedFrom.recipientId?.firstName || ''} {selectedMessage.forwardedFrom.recipientId?.lastName || ''}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Betreff: {selectedMessage.forwardedFrom.subject}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Datum: {format(new Date(selectedMessage.forwardedFrom.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', whiteSpace: 'pre-wrap', mt: 1 }}>
                          {selectedMessage.forwardedFrom.message}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                        {selectedMessage.message.includes('--- Weitergeleitete Nachricht ---')
                          ? selectedMessage.message.split('--- Weitergeleitete Nachricht ---')[1]?.split('\n').slice(4).join('\n') || selectedMessage.message
                          : 'Weitergeleitete Nachricht'}
      </Typography>
                    )}
                  </Box>
                )}
                
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                  {selectedMessage.replyTo && selectedMessage.message.includes('--- Ursprüngliche Nachricht ---')
                    ? selectedMessage.message.split('--- Ursprüngliche Nachricht ---')[1]?.split('\n').slice(4).join('\n').trim() || selectedMessage.message
                    : selectedMessage.forwardedFrom && selectedMessage.message.includes('--- Weitergeleitete Nachricht ---')
                    ? selectedMessage.message.split('--- Weitergeleitete Nachricht ---')[1]?.split('\n').slice(5).join('\n').trim() || selectedMessage.message
                    : selectedMessage.message}
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
                
                {/* Aktionen */}
                <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  {activeTab === 'inbox' && (
                    <Button
                      variant="outlined"
                      startIcon={<Reply />}
                      onClick={() => handleCompose(selectedMessage)}
                    >
                      Antworten
                    </Button>
                  )}
                  {(activeTab === 'inbox' || activeTab === 'sent') && (
                    <Button
                      variant="outlined"
                      startIcon={<Forward />}
                      onClick={() => handleForward(selectedMessage)}
                    >
                      Weiterleiten
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<Archive />}
                    onClick={() => handleArchive(selectedMessage)}
                  >
                    Archivieren
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => handleDelete(selectedMessage)}
                  >
                    Löschen
                  </Button>
                </Box>
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
      </Box>

      {/* Compose Dialog */}
      <Dialog
        open={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          setReplyingTo(null);
          setForwardingFrom(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {replyingTo ? 'Antworten' : forwardingFrom ? 'Weiterleiten' : 'Neue Nachricht'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Autocomplete
              options={staffProfiles.filter((profile, index, self) =>
                index === self.findIndex(p => p.user_id === profile.user_id)
              )}
              getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.email || 'keine E-Mail'})`}
              isOptionEqualToValue={(option, value) => {
                if (!option || !value) return false;
                return option.user_id === value.user_id || option._id === value._id;
              }}
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
              rows={10}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setComposeOpen(false);
            setReplyingTo(null);
            setForwardingFrom(null);
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

      {/* Ordner erstellen Dialog */}
      <Dialog
        open={folderDialogOpen}
        onClose={() => {
          setFolderDialogOpen(false);
          setFolderFormData({ name: '', description: '', color: '#1976d2', icon: 'folder' });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Neuen Ordner erstellen</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Ordnername"
              value={folderFormData.name}
              onChange={(e) => setFolderFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Beschreibung (optional)"
              value={folderFormData.description}
              onChange={(e) => setFolderFormData(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Farbe"
              type="color"
              value={folderFormData.color}
              onChange={(e) => setFolderFormData(prev => ({ ...prev, color: e.target.value }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setFolderDialogOpen(false);
            setFolderFormData({ name: '', description: '', color: '#1976d2', icon: 'folder' });
          }}>
            Abbrechen
          </Button>
          <Button variant="contained" onClick={handleCreateFolder}>
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ordner bearbeiten Dialog */}
      <Dialog
        open={folderEditDialogOpen}
        onClose={() => {
          setFolderEditDialogOpen(false);
          setEditingFolder(null);
          setFolderFormData({ name: '', description: '', color: '#1976d2', icon: 'folder' });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ordner bearbeiten</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Ordnername"
              value={folderFormData.name}
              onChange={(e) => setFolderFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Beschreibung (optional)"
              value={folderFormData.description}
              onChange={(e) => setFolderFormData(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Farbe"
              type="color"
              value={folderFormData.color}
              onChange={(e) => setFolderFormData(prev => ({ ...prev, color: e.target.value }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setFolderEditDialogOpen(false);
            setEditingFolder(null);
            setFolderFormData({ name: '', description: '', color: '#1976d2', icon: 'folder' });
          }}>
            Abbrechen
          </Button>
          <Button variant="contained" onClick={handleEditFolder}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Nachrichten verschieben Dialog */}
      <Dialog
        open={moveDialogOpen}
        onClose={() => setMoveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nachrichten verschieben</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selectedMessages.length} Nachricht(en) in Ordner verschieben:
            </Typography>
            <List>
              {folders.map((folder) => (
                <ListItem
                  key={folder._id}
                  disablePadding
                >
                  <ListItemButton onClick={() => handleMoveToFolder(folder._id)}>
                    <ListItemIcon>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '4px',
                          bgcolor: folder.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Folder sx={{ fontSize: 16, color: 'white' }} />
                      </Box>
                    </ListItemIcon>
                    <ListItemText primary={folder.name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveDialogOpen(false)}>Abbrechen</Button>
        </DialogActions>
      </Dialog>

      {/* Ordner-Menü */}
      <Menu
        anchorEl={folderMenuAnchor}
        open={Boolean(folderMenuAnchor)}
        onClose={() => {
          setFolderMenuAnchor(null);
          setEditingFolder(null);
        }}
      >
        <MenuList>
          <MuiMenuItem
            onClick={() => {
              if (editingFolder) {
                setFolderFormData({
                  name: editingFolder.name,
                  description: editingFolder.description || '',
                  color: editingFolder.color,
                  icon: editingFolder.icon
                });
                setFolderEditDialogOpen(true);
              }
              setFolderMenuAnchor(null);
            }}
          >
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Bearbeiten
          </MuiMenuItem>
          {editingFolder && !editingFolder.isSystem && (
            <MuiMenuItem
              onClick={() => {
                if (editingFolder) {
                  handleDeleteFolder(editingFolder);
                }
                setFolderMenuAnchor(null);
              }}
              sx={{ color: 'error.main' }}
            >
              <Delete fontSize="small" sx={{ mr: 1 }} />
              Löschen
            </MuiMenuItem>
          )}
        </MenuList>
      </Menu>

      {/* Nachrichten-Menü */}
      <Menu
        anchorEl={messageMenuAnchor?.element || null}
        open={Boolean(messageMenuAnchor)}
        onClose={() => setMessageMenuAnchor(null)}
      >
        <MenuList>
          {messageMenuAnchor && (
            <>
              {activeTab === 'inbox' && (
                <MuiMenuItem
                  onClick={() => {
                    const msg = getCurrentMessages().find(m => m._id === messageMenuAnchor.messageId);
                    if (msg) {
                      handleCompose(msg);
                    }
                    setMessageMenuAnchor(null);
                  }}
                >
                  <Reply fontSize="small" sx={{ mr: 1 }} />
                  Antworten
                </MuiMenuItem>
              )}
              {(activeTab === 'inbox' || activeTab === 'sent') && (
                <MuiMenuItem
                  onClick={() => {
                    const msg = getCurrentMessages().find(m => m._id === messageMenuAnchor.messageId);
                    if (msg) {
                      handleForward(msg);
                    }
                    setMessageMenuAnchor(null);
                  }}
                >
                  <Forward fontSize="small" sx={{ mr: 1 }} />
                  Weiterleiten
                </MuiMenuItem>
              )}
              <MuiMenuItem
                onClick={() => {
                  const msg = getCurrentMessages().find(m => m._id === messageMenuAnchor.messageId);
                  if (msg) {
                    handleArchive(msg);
                  }
                  setMessageMenuAnchor(null);
                }}
              >
                <Archive fontSize="small" sx={{ mr: 1 }} />
                Archivieren
              </MuiMenuItem>
              <MuiMenuItem
                onClick={() => {
                  const msg = getCurrentMessages().find(m => m._id === messageMenuAnchor.messageId);
                  if (msg) {
                    handleDelete(msg);
                  }
                  setMessageMenuAnchor(null);
                }}
                sx={{ color: 'error.main' }}
              >
                <Delete fontSize="small" sx={{ mr: 1 }} />
                Löschen
              </MuiMenuItem>
            </>
          )}
        </MenuList>
      </Menu>

      {/* Snackbar für Benachrichtigungen */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InternalMessages;
