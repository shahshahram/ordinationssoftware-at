import React, { useEffect, useState } from 'react';
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
import { fetchMessages, fetchUnreadCount, markAsRead, InternalMessage } from '../../store/slices/internalMessagesSlice';
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
  const { inbox, unreadCount, loading } = useAppSelector((state) => state.internalMessages);

  useEffect(() => {
    let previousUnreadCount = 0;
    
    const loadMessages = async () => {
      await dispatch(fetchMessages({ type: 'inbox', limit: 5 }));
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
    
    loadMessages();
    
    // Polling für neue Nachrichten alle 30 Sekunden
    const interval = setInterval(() => {
      loadMessages();
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  const handleMessageClick = async (message: InternalMessage) => {
    if (message.status !== 'read') {
      await dispatch(markAsRead(message._id));
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
            {inbox.map((message: InternalMessage, index: number) => {
              const isUnread = message.status === 'sent' || message.status === 'delivered';
              return (
                <ListItem 
                  key={message._id} 
                  divider={index < inbox.length - 1}
                  onClick={() => handleMessageClick(message)}
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

