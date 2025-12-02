import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Badge, 
  useMediaQuery, 
  useTheme,
  IconButton,
  Tooltip,
  Chip
} from '@mui/material';
import { 
  Mail, 
  MailOutline, 
  Send, 
  PriorityHigh,
  MoreVert
} from '@mui/icons-material';
import { DashboardWidget } from '../../store/slices/dashboardWidgetsSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMessages, fetchUnreadCount, markAsRead, markAllAsRead, InternalMessage } from '../../store/slices/internalMessagesSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface MessagesWidgetProps {
  widget: DashboardWidget;
  onMessageClick?: (message: InternalMessage) => void;
}

const MessagesWidget: React.FC<MessagesWidgetProps> = ({ widget, onMessageClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { inbox, unreadCount, loading } = useAppSelector((state) => state.internalMessages);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    let previousUnreadCount = 0;
    
    const loadMessages = async () => {
      // Lade alle Nachrichten (keine Limitierung nach Alter)
      await dispatch(fetchMessages({ type: 'inbox', limit: 50 }));
      const result = await dispatch(fetchUnreadCount());
      const currentUnreadCount = result.payload as number;
      
      // Benachrichtigung bei neuen Nachrichten
      if (currentUnreadCount > previousUnreadCount && previousUnreadCount > 0) {
        dispatch(addNotification({
          type: 'info',
          title: 'Neue Nachricht',
          message: `Sie haben ${currentUnreadCount - previousUnreadCount} neue Nachricht(en) erhalten.`
        }));
      }
      
      previousUnreadCount = currentUnreadCount;
    };
    
    // Beim ersten Laden
    loadMessages();
    
    // Polling für neue Nachrichten alle 30 Sekunden
    const interval = setInterval(() => {
      loadMessages();
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  const handleMessageClick = async (message: InternalMessage) => {
    // Markiere die Nachricht als gelesen, wenn sie ungelesen ist und der aktuelle Benutzer der Empfänger ist
    if ((message.status === 'sent' || message.status === 'delivered') && user) {
      const recipientId = typeof message.recipientId === 'object' ? message.recipientId._id : message.recipientId;
      if (recipientId === user._id) {
        console.log('🔔 MessagesWidget: Markiere Nachricht als gelesen:', message._id, 'Aktueller unreadCount:', unreadCount);
        // Redux reduziert den Count sofort, aber wir aktualisieren auch vom Backend für Konsistenz
        await dispatch(markAsRead(message._id));
        console.log('✅ MessagesWidget: Nachricht markiert, neuer unreadCount sollte reduziert sein');
        // Aktualisiere unreadCount vom Backend nach kurzer Verzögerung (für Konsistenz)
        setTimeout(async () => {
          await dispatch(fetchUnreadCount());
        }, 500);
      }
    }
    
    if (onMessageClick) {
      onMessageClick(message);
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

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: { xs: 1.5, sm: 2 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1, sm: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={unreadCount} color="error">
            <Mail color="primary" />
          </Badge>
          <Typography 
            variant={isMobile ? 'subtitle1' : 'h6'} 
            sx={{ fontWeight: 600 }}
          >
            {widget.title}
          </Typography>
        </Box>
        {unreadCount > 0 && (
          <Chip 
            label={`${unreadCount} ungelesen`} 
            size="small" 
            color="error"
            sx={{ ml: 1 }}
          />
        )}
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Lade Nachrichten...
          </Typography>
        ) : inbox.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Keine Nachrichten
          </Typography>
        ) : (
          <List sx={{ py: 0 }}>
            {/* Sortiere Nachrichten nach Datum: neueste zuerst */}
            {[...inbox].sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return dateB - dateA; // Neueste zuerst
            }).map((message: InternalMessage, index: number, sortedArray) => {
              const isUnread = message.status === 'sent' || message.status === 'delivered';
              
              // Extrahiere patientId aus der Nachricht (kann ObjectId-Objekt oder String sein)
              let patientId: string | null = null;
              if (message.patientId) {
                // Wenn patientId ein Objekt ist (z.B. ObjectId), extrahiere _id oder toString()
                if (typeof message.patientId === 'object' && message.patientId !== null) {
                  patientId = (message.patientId as any)._id ? String((message.patientId as any)._id) : String(message.patientId);
                } else {
                  patientId = String(message.patientId);
                }
              }
              
              console.log('🔍 MessagesWidget: Processing message', { 
                messageId: message._id, 
                subject: message.subject,
                patientId: patientId,
                patientIdType: typeof patientId,
                fullMessage: message 
              });
              
              return (
                <ListItem 
                  key={message._id} 
                  divider={index < sortedArray.length - 1}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔍 MessagesWidget: Item clicked', { 
                      messageId: message._id, 
                      patientId: patientId,
                      hasPatientId: !!patientId,
                      fullMessage: message 
                    });
                    
                    // Wenn patientId vorhanden ist, navigiere zum Patienten
                    if (patientId) {
                      // Konvertiere patientId zu String (falls es ein ObjectId-Objekt ist)
                      const patientIdStr = typeof patientId === 'string' ? patientId : String(patientId);
                      console.log('🔍 MessagesWidget: Navigating to patient labor values', { 
                        patientId: patientIdStr, 
                        originalPatientId: patientId, 
                        fullMessage: message 
                      });
                      // Verwende window.location für zuverlässige Navigation
                      window.location.href = `/patient-organizer/${patientIdStr}?tab=laborwerte`;
                    } else {
                      console.log('🔍 MessagesWidget: No patientId, using normal message handling', { messageId: message._id });
                      // Sonst normale Nachrichten-Behandlung
                      handleMessageClick(message);
                    }
                  }}
                  sx={{ 
                    py: { xs: 1, sm: 1.5 },
                    px: { xs: 0.5, sm: 1 },
                    cursor: 'pointer',
                    bgcolor: isUnread ? 'action.selected' : 'transparent',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderRadius: 1
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: { xs: 32, sm: 40 } }}>
                    {isUnread ? (
                      <MailOutline color="primary" />
                    ) : (
                      <Mail color="action" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography 
                          variant={isMobile ? 'body2' : 'body1'} 
                          component="span"
                          sx={{ 
                            fontWeight: isUnread ? 600 : 400,
                            flex: 1,
                            minWidth: 0
                          }}
                          noWrap
                        >
                          {message.subject}
                        </Typography>
                        {message.priority === 'urgent' && (
                          <PriorityHigh color="error" fontSize="small" />
                        )}
                        {message.priority === 'high' && (
                          <Chip label="Wichtig" size="small" color="warning" sx={{ height: 20 }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography 
                          variant={isMobile ? 'caption' : 'body2'} 
                          color="text.secondary"
                          component="span"
                          sx={{ display: 'block' }}
                          noWrap
                        >
                          Von: {message.senderId.firstName} {message.senderId.lastName}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          component="span"
                          sx={{ display: 'block', mt: 0.5 }}
                        >
                          {format(new Date(message.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default MessagesWidget;

