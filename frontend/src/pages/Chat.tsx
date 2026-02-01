import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  IconButton,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Autocomplete,
  Chip,
  CircularProgress,
  useTheme,
  useMediaQuery,
  InputAdornment,
} from '@mui/material';
import {
  Send,
  ChatBubbleOutline,
  Person,
  Group,
  Add,
  ArrowBack,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchConversations,
  createConversation,
  fetchMessages,
  sendMessage,
  markConversationRead,
  fetchChatUsers,
  setActiveConversation,
  ChatConversation,
  ChatMessage,
  ChatUser,
} from '../store/slices/chatSlice';
import { addNotification } from '../store/slices/uiSlice';
import { getUserPhotoUrl } from '../utils/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const POLL_INTERVAL_MS = 8000;

const getDisplayName = (conv: ChatConversation, currentUserId: string): string => {
  if (conv.type === 'group' && conv.name) return conv.name;
  const other = conv.participants.find((p) => (typeof p === 'object' ? p._id : p) !== currentUserId);
  if (other && typeof other === 'object') return `${other.firstName} ${other.lastName}`.trim() || other.email || 'Unbekannt';
  return 'Chat';
};

const getConversationPhotoUrl = (conv: ChatConversation, currentUserId: string): string | null => {
  if (conv.type === 'group') return null;
  const other = conv.participants.find((p) => (typeof p === 'object' ? p._id : p) !== currentUserId);
  return other && typeof other === 'object' ? getUserPhotoUrl({ _id: other._id, id: other._id, profilePhoto: other.profilePhoto }) : null;
};

const Chat: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAppSelector((state) => state.auth);
  const {
    conversations,
    activeConversation,
    messages,
    chatUsers,
    loading,
    messagesLoading,
    error,
  } = useAppSelector((state) => state.chat);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatMode, setNewChatMode] = useState<'direct' | 'group'>('direct');
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
  const [groupName, setGroupName] = useState('');
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUserId = user?.id ?? user?._id ?? '';

  useEffect(() => {
    dispatch(fetchConversations());
    dispatch(fetchChatUsers());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      dispatch(addNotification({ title: 'Chat', message: error, type: 'error' }));
    }
  }, [error, dispatch]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!activeConversation) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    dispatch(markConversationRead(activeConversation._id));
    dispatch(fetchMessages({ conversationId: activeConversation._id }));
    const id = setInterval(() => {
      dispatch(fetchMessages({ conversationId: activeConversation._id }));
    }, POLL_INTERVAL_MS);
    pollRef.current = id;
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeConversation, dispatch]);

  const handleSelectConversation = useCallback(
    (conv: ChatConversation) => {
      dispatch(setActiveConversation(conv));
    },
    [dispatch]
  );

  const handleNewChat = () => {
    setSelectedUser(null);
    setSelectedUsers([]);
    setGroupName('');
    setNewChatOpen(true);
  };

  const handleCreateDirect = () => {
    if (!selectedUser) return;
    dispatch(
      createConversation({ otherUserId: selectedUser._id })
    ).then((result) => {
      if (createConversation.fulfilled.match(result)) {
        setNewChatOpen(false);
        setSelectedUser(null);
      }
    });
  };

  const handleCreateGroup = () => {
    if (selectedUsers.length === 0) return;
    dispatch(
      createConversation({
        participantIds: selectedUsers.map((u) => u._id),
        name: groupName.trim() || undefined,
      })
    ).then((result) => {
      if (createConversation.fulfilled.match(result)) {
        setNewChatOpen(false);
        setSelectedUsers([]);
        setGroupName('');
      }
    });
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !activeConversation) return;
    dispatch(sendMessage({ conversationId: activeConversation._id, text })).then((result) => {
      if (sendMessage.fulfilled.match(result)) setInputText('');
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" component="h1">
          Chat
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleNewChat}
          size="small"
          aria-label="Neuer Chat"
        >
          Neuer Chat
        </Button>
      </Paper>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Konversationsliste */}
        <Box
          sx={{
            width: { xs: activeConversation ? 0 : '100%', sm: 320 },
            flexShrink: 0,
            borderRight: { xs: 0, sm: 1 },
            borderColor: 'divider',
            overflow: 'auto',
            display: { xs: activeConversation ? 'none' : 'block', sm: 'block' },
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : conversations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
              <ChatBubbleOutline sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Keine Konversationen. Starten Sie einen neuen Chat.
              </Typography>
              <Button startIcon={<Add />} onClick={handleNewChat} sx={{ mt: 2 }} size="small">
                Neuer Chat
              </Button>
            </Box>
          ) : (
            <List disablePadding>
              {conversations.map((conv) => {
                const displayName = getDisplayName(conv, currentUserId);
                const isActive = activeConversation?._id === conv._id;
                return (
                  <ListItem key={conv._id} disablePadding>
                    <ListItemButton
                      selected={isActive}
                      onClick={() => handleSelectConversation(conv)}
                      sx={{ py: 1.5 }}
                    >
                      <ListItemAvatar>
                        <Badge badgeContent={conv.unreadCount} color="primary">
                          <Avatar
                            sx={{ width: 44, height: 44 }}
                            src={getConversationPhotoUrl(conv, currentUserId) ?? undefined}
                            alt={displayName}
                          >
                            {conv.type === 'group' ? (
                              <Group />
                            ) : (
                              <Typography variant="body2">
                                {displayName.charAt(0).toUpperCase()}
                              </Typography>
                            )}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            fontWeight={conv.unreadCount > 0 ? 600 : 400}
                            noWrap
                          >
                            {displayName}
                          </Typography>
                        }
                        secondary={
                          conv.lastMessage ? (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {conv.lastMessage.text}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              {format(new Date(conv.updatedAt), 'dd.MM. HH:mm', { locale: de })}
                            </Typography>
                          )
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>

        {/* Nachrichtenbereich */}
        <Box
          sx={{
            flex: 1,
            flexDirection: 'column',
            minWidth: 0,
            display: { xs: activeConversation ? 'flex' : 'none', sm: 'flex' },
          }}
        >
          {!activeConversation ? (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <ChatBubbleOutline sx={{ fontSize: 64, mb: 1 }} />
                <Typography variant="body1">Konversation auswählen oder neuen Chat starten</Typography>
              </Box>
            </Box>
          ) : (
            <>
              <Paper
                elevation={0}
                sx={{
                  px: 2,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                {isMobile && (
                  <IconButton
                    onClick={() => dispatch(setActiveConversation(null))}
                    aria-label="Zurück"
                    size="small"
                  >
                    <ArrowBack />
                  </IconButton>
                )}
                <Typography variant="subtitle1" fontWeight={500}>
                  {getDisplayName(activeConversation, currentUserId)}
                </Typography>
                {activeConversation.type === 'group' && (
                  <Chip icon={<Group />} label="Gruppe" size="small" variant="outlined" />
                )}
              </Paper>

              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                {messagesLoading && messages.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : (
                  messages.map((msg: ChatMessage) => {
                    const isOwn = (msg.senderId as { _id?: string })?._id === currentUserId;
                    return (
                      <Box
                        key={msg._id}
                        sx={{
                          alignSelf: isOwn ? 'flex-end' : 'flex-start',
                          maxWidth: '80%',
                        }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            p: 1.5,
                            bgcolor: isOwn ? 'primary.main' : 'action.hover',
                            color: isOwn ? 'primary.contrastText' : 'text.primary',
                          }}
                        >
                          {activeConversation.type === 'group' && !isOwn && (
                            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.9 }}>
                              {(msg.senderId as { firstName?: string; lastName?: string })?.firstName}{' '}
                              {(msg.senderId as { lastName?: string })?.lastName}
                            </Typography>
                          )}
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {msg.text}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ display: 'block', mt: 0.5, opacity: 0.8 }}
                          >
                            {format(new Date(msg.createdAt), 'HH:mm', { locale: de })}
                          </Typography>
                        </Paper>
                      </Box>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </Box>

              <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Nachricht eingeben..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  multiline
                  maxRows={4}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end" sx={{ alignSelf: 'flex-end', mb: 0.5 }}>
                        <IconButton
                          color="primary"
                          onClick={handleSend}
                          disabled={!inputText.trim()}
                          aria-label="Senden"
                        >
                          <Send />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* Dialog: Neuer Chat */}
      <Dialog open={newChatOpen} onClose={() => setNewChatOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Neuer Chat</DialogTitle>
        <Tabs
          value={newChatMode}
          onChange={(_, v) => setNewChatMode(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab value="direct" label="1:1 Chat" icon={<Person />} iconPosition="start" />
          <Tab value="group" label="Gruppenchat" icon={<Group />} iconPosition="start" />
        </Tabs>
        <DialogContent>
          {newChatMode === 'direct' ? (
            <Autocomplete
              options={chatUsers.filter((u) => u._id !== currentUserId)}
              getOptionLabel={(o) => `${o.firstName} ${o.lastName}`.trim() || o.email || ''}
              value={selectedUser}
              onChange={(_, v) => setSelectedUser(v)}
              renderInput={(params) => (
                <TextField {...params} label="Person auswählen" margin="normal" fullWidth />
              )}
            />
          ) : (
            <Box sx={{ pt: 1 }}>
              <Autocomplete
                multiple
                options={chatUsers.filter((u) => u._id !== currentUserId)}
                getOptionLabel={(o) => `${o.firstName} ${o.lastName}`.trim() || o.email || ''}
                value={selectedUsers}
                onChange={(_, v) => setSelectedUsers(v)}
                renderInput={(params) => (
                  <TextField {...params} label="Teilnehmer" margin="normal" fullWidth />
                )}
              />
              <TextField
                fullWidth
                label="Gruppenname (optional)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                margin="normal"
                placeholder="z.B. Team Ordination"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewChatOpen(false)}>Abbrechen</Button>
          {newChatMode === 'direct' ? (
            <Button
              variant="contained"
              onClick={handleCreateDirect}
              disabled={!selectedUser}
            >
              Chat starten
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleCreateGroup}
              disabled={selectedUsers.length === 0}
            >
              Gruppenchat erstellen
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Chat;
