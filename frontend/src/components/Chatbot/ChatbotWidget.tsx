import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Fab,
  Slide,
  Avatar,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Send,
  Close,
  Chat as ChatIcon,
  Minimize,
  Maximize,
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import api from '../../utils/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatbotWidgetProps {
  patientId?: string;
  currentPage?: string;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ patientId, currentPage }) => {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hallo! Ich bin Ihr KI-Assistent für MyMediCloud MMC. Wie kann ich Ihnen helfen?',
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getPageContext = () => {
    const path = location.pathname;
    const pageMap: { [key: string]: string } = {
      '/dashboard': 'Dashboard',
      '/patients': 'Patientenverwaltung',
      '/appointments': 'Terminplanung',
      '/documents': 'Dokumentenverwaltung',
      '/billing': 'Abrechnung',
      '/patient-organizer': 'Patient-Organizer',
      '/settings': 'Einstellungen',
    };
    return pageMap[path] || 'Allgemein';
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post<{ response: string; timestamp: string }>('/chatbot/chat', {
        message: input,
        context: {
          page: getPageContext(),
          path: location.pathname,
          patientId: patientId,
        },
        history: messages.slice(-5).map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data?.response || 'Entschuldigung, ich konnte keine Antwort generieren.',
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chatbot error:', error);
      
      // Versuche, eine hilfreiche Fehlermeldung zu zeigen
      let errorText = 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.';
      
      if (error.response?.status === 401) {
        errorText = 'Sie sind nicht angemeldet. Bitte melden Sie sich erneut an.';
      } else if (error.response?.status === 500) {
        errorText = 'Server-Fehler. Bitte versuchen Sie es später erneut oder nutzen Sie die Hilfe-Dialoge (❓ Symbol).';
      } else if (error.response?.data?.error) {
        errorText = error.response.data.error;
      } else if (error.message) {
        errorText = `Fehler: ${error.message}`;
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!open && (
        <Fab
          color="primary"
          aria-label="Chatbot"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            zIndex: 1000,
          }}
        >
          <ChatIcon />
        </Fab>
      )}

      {/* Chat Window */}
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper
          sx={{
            position: 'fixed',
            bottom: minimized ? 16 : 80,
            right: 16,
            width: minimized ? 300 : 400,
            height: minimized ? 60 : 600,
            maxHeight: 'calc(100vh - 100px)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1001,
            boxShadow: 6,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark' }}>
                <ChatIcon fontSize="small" />
              </Avatar>
              <Typography variant="subtitle1" fontWeight={600}>
                MyMediCloud Assistent
              </Typography>
            </Box>
            <Box>
              <IconButton
                size="small"
                onClick={() => setMinimized(!minimized)}
                sx={{ color: 'inherit' }}
              >
                {minimized ? <Maximize /> : <Minimize />}
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setOpen(false)}
                sx={{ color: 'inherit' }}
              >
                <Close />
              </IconButton>
            </Box>
          </Box>

          {!minimized && (
            <>
              {/* Messages */}
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                  bgcolor: 'background.default',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {messages.map((message) => (
                  <Box
                    key={message.id}
                    sx={{
                      display: 'flex',
                      justifyContent:
                        message.sender === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: '75%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                      }}
                    >
                      <Chip
                        label={message.sender === 'user' ? 'Sie' : 'Assistent'}
                        size="small"
                        sx={{
                          alignSelf:
                            message.sender === 'user' ? 'flex-end' : 'flex-start',
                          height: 20,
                          fontSize: '0.7rem',
                        }}
                      />
                      <Paper
                        sx={{
                          p: 1.5,
                          bgcolor:
                            message.sender === 'user'
                              ? 'primary.main'
                              : 'background.paper',
                          color:
                            message.sender === 'user'
                              ? 'primary.contrastText'
                              : 'text.primary',
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {message.text}
                        </Typography>
                      </Paper>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          alignSelf:
                            message.sender === 'user' ? 'flex-end' : 'flex-start',
                          fontSize: '0.7rem',
                        }}
                      >
                        {message.timestamp.toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </Box>
                  </Box>
                ))}
                {loading && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <Paper
                      sx={{
                        p: 1.5,
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="text.secondary">
                        Denkt nach...
                      </Typography>
                    </Paper>
                  </Box>
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Input */}
              <Box
                sx={{
                  p: 2,
                  borderTop: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  display: 'flex',
                  gap: 1,
                  alignItems: 'flex-end',
                }}
              >
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Schreiben Sie eine Nachricht..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
                <IconButton
                  color="primary"
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '&:disabled': {
                      bgcolor: 'action.disabledBackground',
                      color: 'action.disabled',
                    },
                  }}
                >
                  <Send />
                </IconButton>
              </Box>
            </>
          )}
        </Paper>
      </Slide>
    </>
  );
};

export default ChatbotWidget;
