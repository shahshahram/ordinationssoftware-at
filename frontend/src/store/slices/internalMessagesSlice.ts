import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Types
export interface InternalMessage {
  _id: string;
  senderId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  recipientId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  subject: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'sent' | 'delivered' | 'read' | 'archived';
  readAt?: string;
  deletedBySender: boolean;
  deletedByRecipient: boolean;
  attachments?: Array<{
    filename: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
  replyTo?: string | InternalMessage;
  forwardedFrom?: string | InternalMessage;
  patientId?: string; // Optional: Referenz zu einem Patienten
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageData {
  recipientId: string;
  subject: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  replyTo?: string;
  forwardedFrom?: string;
  attachments?: Array<{
    filename: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
}

interface InternalMessagesState {
  messages: InternalMessage[];
  inbox: InternalMessage[];
  sent: InternalMessage[];
  archived: InternalMessage[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  selectedMessage: InternalMessage | null;
}

const initialState: InternalMessagesState = {
  messages: [],
  inbox: [],
  sent: [],
  archived: [],
  unreadCount: 0,
  loading: false,
  error: null,
  selectedMessage: null
};

// Async Thunks
export const fetchMessages = createAsyncThunk(
  'internalMessages/fetchMessages',
  async (params: { type?: 'inbox' | 'sent' | 'archived'; limit?: number; skip?: number; status?: string } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.type) queryParams.append('type', params.type);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.skip) queryParams.append('skip', params.skip.toString());
    if (params.status) queryParams.append('status', params.status);

    const response = await api.get(`/internal-messages?${queryParams.toString()}`);
    return (response.data as any).data || [];
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'internalMessages/fetchUnreadCount',
  async () => {
    const response = await api.get('/internal-messages/unread-count');
    return (response.data as any).data?.count || 0;
  }
);

export const sendMessage = createAsyncThunk(
  'internalMessages/sendMessage',
  async (messageData: CreateMessageData) => {
    const response = await api.post('/internal-messages', messageData);
    return (response.data as any).data;
  }
);

export const markAsRead = createAsyncThunk(
  'internalMessages/markAsRead',
  async (messageId: string) => {
    const response = await api.put(`/internal-messages/${messageId}/read`);
    return (response.data as any).data;
  }
);

export const markAllAsRead = createAsyncThunk(
  'internalMessages/markAllAsRead',
  async () => {
    const response = await api.put('/internal-messages/mark-all-read');
    return (response.data as any).data;
  }
);

export const archiveMessage = createAsyncThunk(
  'internalMessages/archiveMessage',
  async (messageId: string) => {
    const response = await api.put(`/internal-messages/${messageId}/archive`);
    return (response.data as any).data;
  }
);

export const deleteMessage = createAsyncThunk(
  'internalMessages/deleteMessage',
  async (messageId: string) => {
    await api.delete(`/internal-messages/${messageId}`);
    return messageId;
  }
);

export const fetchMessage = createAsyncThunk(
  'internalMessages/fetchMessage',
  async (messageId: string) => {
    const response = await api.get(`/internal-messages/${messageId}`);
    return (response.data as any).data;
  }
);

// Slice
const internalMessagesSlice = createSlice({
  name: 'internalMessages',
  initialState,
  reducers: {
    setSelectedMessage: (state, action: PayloadAction<InternalMessage | null>) => {
      state.selectedMessage = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Messages
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        const type = action.meta.arg?.type || 'inbox';
        if (type === 'inbox') {
          state.inbox = action.payload;
        } else if (type === 'sent') {
          state.sent = action.payload;
        } else if (type === 'archived') {
          state.archived = action.payload;
        }
        state.messages = action.payload;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Laden der Nachrichten';
      })
      // Fetch Unread Count
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      // Send Message
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sent.unshift(action.payload);
      })
      // Mark as Read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const message = action.payload;
        const index = state.inbox.findIndex(m => m._id === message._id);
        
        console.log('🔔 Redux: markAsRead.fulfilled', {
          messageId: message._id,
          messageStatus: message.status,
          index,
          currentUnreadCount: state.unreadCount,
          inboxLength: state.inbox.length
        });
        
        // Prüfe, ob die Nachricht vorher ungelesen war (BEVOR wir sie aktualisieren)
        let wasUnread = false;
        if (index !== -1) {
          const oldMessage = state.inbox[index];
          const oldStatus = oldMessage.status;
          wasUnread = oldStatus === 'sent' || oldStatus === 'delivered';
          console.log('🔔 Redux: Alte Nachricht gefunden', {
            oldStatus,
            wasUnread,
            newStatus: message.status,
            oldMessageId: oldMessage._id
          });
        } else {
          // Wenn die Nachricht nicht im Inbox ist, nehmen wir an, dass sie ungelesen war
          // (da sie jetzt als 'read' zurückkommt)
          wasUnread = message.status === 'read';
          console.log('🔔 Redux: Nachricht nicht im Inbox gefunden, nehme an sie war ungelesen', {
            messageStatus: message.status,
            wasUnread
          });
        }
        
        // Aktualisiere die Nachricht im State
        if (index !== -1) {
          state.inbox[index] = message;
        }
        if (state.selectedMessage?._id === message._id) {
          state.selectedMessage = message;
        }
        
        // Reduziere unreadCount nur wenn die Nachricht vorher ungelesen war
        if (wasUnread && state.unreadCount > 0) {
          const oldCount = state.unreadCount;
          state.unreadCount--;
          console.log('✅ Redux: unreadCount reduziert von', oldCount, 'auf', state.unreadCount, 'für Nachricht', message._id);
        } else {
          console.log('⚠️ Redux: unreadCount NICHT reduziert', {
            wasUnread,
            currentCount: state.unreadCount,
            reason: !wasUnread ? 'Nachricht war nicht ungelesen' : state.unreadCount <= 0 ? 'unreadCount ist bereits 0' : 'Unbekannt'
          });
        }
      })
      // Mark All as Read
      .addCase(markAllAsRead.fulfilled, (state, action) => {
        const { markedCount, unreadCount } = action.payload;
        // Aktualisiere alle Nachrichten im Inbox, die als gelesen markiert wurden
        state.inbox = state.inbox.map(msg => {
          if (msg.status === 'sent' || msg.status === 'delivered') {
            return { ...msg, status: 'read' as const, readAt: new Date().toISOString() };
          }
          return msg;
        });
        state.unreadCount = unreadCount || 0;
        console.log(`✅ ${markedCount} Nachrichten als gelesen markiert, verbleibende ungelesene: ${unreadCount}`);
      })
      // Archive Message
      .addCase(archiveMessage.fulfilled, (state, action) => {
        const message = action.payload;
        state.inbox = state.inbox.filter(m => m._id !== message._id);
        state.sent = state.sent.filter(m => m._id !== message._id);
        state.archived.unshift(message);
      })
      // Delete Message
      .addCase(deleteMessage.fulfilled, (state, action) => {
        const messageId = action.payload;
        state.inbox = state.inbox.filter(m => m._id !== messageId);
        state.sent = state.sent.filter(m => m._id !== messageId);
        state.archived = state.archived.filter(m => m._id !== messageId);
        if (state.selectedMessage?._id === messageId) {
          state.selectedMessage = null;
        }
      })
      // Fetch Single Message
      .addCase(fetchMessage.fulfilled, (state, action) => {
        state.selectedMessage = action.payload;
        // Update in inbox if exists
        const index = state.inbox.findIndex(m => m._id === action.payload._id);
        if (index !== -1) {
          state.inbox[index] = action.payload;
        }
      });
  }
});

export const { setSelectedMessage, clearError } = internalMessagesSlice.actions;
export default internalMessagesSlice.reducer;



