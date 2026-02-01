import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import { useLocation, useParams } from 'react-router-dom';
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

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ patientId: propPatientId, currentPage: _currentPage }) => {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialMessageLoaded, setInitialMessageLoaded] = useState(false);
  const suggestionsLoadedRef = useRef(false);
  const previousPatientIdRef = useRef<string | null>(null);

  const handleSetOpen = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
  }, []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  
  // Extrahiere patientId aus URL-Parametern oder Props
  const patientId = useMemo(() => {
    // Priorität 1: Aus Props
    if (propPatientId) {
      return propPatientId;
    }
    
    // Priorität 2: Aus URL-Parametern (z.B. /patient-organizer/:id)
    if (params.id) {
      return params.id;
    }
    
    // Priorität 3: Aus URL-Pfad extrahieren
    // Unterstütze verschiedene Routen: /patient-organizer/:id, /patients/:id, etc.
    const pathname = location.pathname;
    
    // Prüfe /patient-organizer/:id
    if (pathname.includes('/patient-organizer/')) {
      const extractedId = pathname.split('/patient-organizer/')[1]?.split('/')[0];
      if (extractedId) {
        return extractedId;
      }
    }
    
    // Prüfe /patients/:id
    if (pathname.match(/^\/patients\/[a-f0-9]{24}$/i)) {
      const extractedId = pathname.split('/patients/')[1]?.split('/')[0];
      if (extractedId) {
        return extractedId;
      }
    }
    
    // Priorität 4: Aus Query-Parametern
    const searchParams = new URLSearchParams(location.search);
    const queryPatientId = searchParams.get('patientId');
    if (queryPatientId) {
      return queryPatientId;
    }
    
    return undefined;
  }, [propPatientId, params.id, location.pathname, location.search]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadProactiveSuggestions = useCallback(async () => {
    if (!patientId) {
      return;
    }

    // Verhindere mehrfache Aufrufe
    if (suggestionsLoadedRef.current) {
      return;
    }

    suggestionsLoadedRef.current = true;
    
    try {
      const response = await api.get<any>(`/smart-suggestions/patient/${patientId}`);
      const apiResponse = response.data;
      const suggestions = apiResponse?.suggestions;
      
      if (apiResponse?.success && suggestions && typeof suggestions === 'object' && !Array.isArray(suggestions)) {
        const totalSuggestions = Object.values(suggestions).reduce((sum: number, arr: any) => {
          if (Array.isArray(arr)) {
            return sum + arr.length;
          }
          return sum;
        }, 0);
        
        if (totalSuggestions > 0) {
          // Formatiere Vorschläge für die Anzeige
          // Zuerst versuche wichtige Vorschläge (urgent/high)
          let importantSuggestions = [
            ...(Array.isArray(suggestions.diagnoses) ? suggestions.diagnoses.filter((s: any) => s.priority === 'urgent' || s.priority === 'high') : []),
            ...(Array.isArray(suggestions.medications) ? suggestions.medications.filter((s: any) => s.priority === 'urgent' || s.priority === 'high') : []),
            ...(Array.isArray(suggestions.appointments) ? suggestions.appointments.filter((s: any) => s.priority === 'urgent' || s.priority === 'high') : []),
            ...(Array.isArray(suggestions.laboratory) ? suggestions.laboratory.filter((s: any) => s.priority === 'urgent' || s.priority === 'high') : []),
            ...(Array.isArray(suggestions.general) ? suggestions.general.filter((s: any) => s.priority === 'urgent' || s.priority === 'high') : []),
          ];

          // Wenn keine wichtigen Vorschläge, nimm alle Vorschläge
          if (importantSuggestions.length === 0) {
            importantSuggestions = [
              ...(Array.isArray(suggestions.diagnoses) ? suggestions.diagnoses : []),
              ...(Array.isArray(suggestions.medications) ? suggestions.medications : []),
              ...(Array.isArray(suggestions.appointments) ? suggestions.appointments : []),
              ...(Array.isArray(suggestions.laboratory) ? suggestions.laboratory : []),
              ...(Array.isArray(suggestions.general) ? suggestions.general : []),
            ];
          }

          // Sortiere nach Priorität und nehme die ersten 3
          const sortedSuggestions = importantSuggestions
            .sort((a: any, b: any) => {
              const priorityOrder: { [key: string]: number } = { urgent: 3, high: 2, medium: 1, low: 0 };
              return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            })
            .slice(0, 3);

          if (sortedSuggestions.length > 0) {
            let suggestionsText = '💡 Vorschläge für diesen Patienten:\n\n';
            sortedSuggestions.forEach((suggestion, index: number) => {
              suggestionsText += `${index + 1}. ${suggestion.title}\n   ${suggestion.description}`;
              if (suggestion.action) {
                suggestionsText += `\n   → ${suggestion.action}`;
              }
              suggestionsText += '\n\n';
            });

            const suggestionsMessage: Message = {
              id: Date.now().toString(),
              text: suggestionsText.trim(),
              sender: 'assistant',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, suggestionsMessage]);
          }
        }
      }
    } catch (error) {
      console.error('[ChatbotWidget] loadProactiveSuggestions: Fehler:', error);
      // Fehler ignorieren, Chatbot funktioniert auch ohne Vorschläge
      suggestionsLoadedRef.current = false; // Erlaube erneuten Versuch bei Fehler
    }
  }, [patientId]);

  // Reset Chatbot when patientId changes
  useEffect(() => {
    const currentPatientId = patientId ?? null;
    const previousPatientId = previousPatientIdRef.current;
    
    if (previousPatientId !== null && previousPatientId !== currentPatientId) {
      // Reset all state when patient changes
      setMessages([]);
      setInitialMessageLoaded(false);
      suggestionsLoadedRef.current = false;
      
      // Schließe den Chatbot beim Patient-Wechsel
      if (open) {
        setOpen(false);
      }
    }
    
    // Update previous patientId
    previousPatientIdRef.current = currentPatientId;
  }, [patientId, open]);

  // Lade initiale Nachricht mit proaktiven Vorschlägen, wenn ein Patient im Kontext ist
  useEffect(() => {
    if (open) {
      // Wenn Chatbot geöffnet wird und noch keine initiale Nachricht geladen wurde
      if (!initialMessageLoaded) {
        // Wenn keine Nachrichten vorhanden sind, lade initiale Nachricht
        if (messages.length === 0) {
          const initialMessage: Message = {
            id: '1',
            text: 'Hallo! Ich bin Ihr KI-Assistent für MyMediCloud MMC. Wie kann ich Ihnen helfen?',
            sender: 'assistant',
            timestamp: new Date(),
          };
          setMessages([initialMessage]);
        }
        
        setInitialMessageLoaded(true);
      }

      // Lade proaktive Vorschläge, wenn ein Patient im Kontext ist und noch nicht geladen
      if (patientId && !suggestionsLoadedRef.current) {
        // Warte kurz, damit die initiale Nachricht zuerst angezeigt wird
        setTimeout(() => {
          loadProactiveSuggestions();
        }, 300);
      }
    } else {
      // Chatbot wurde geschlossen
      if (initialMessageLoaded) {
        setInitialMessageLoaded(false);
        suggestionsLoadedRef.current = false; // Reset für nächsten Öffnen
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patientId, initialMessageLoaded, messages.length]);


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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSetOpen(true);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
          }}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 80,
            zIndex: 10000,
            pointerEvents: 'auto',
          }}
        >
          <ChatIcon />
        </Fab>
      )}

      {/* Chat Window */}
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper
          data-chatbot-window="true"
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
