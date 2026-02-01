import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../utils/api';

export interface ChatUser {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
  profilePhoto?: { filename?: string; uploadedAt?: string };
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: { _id: string; firstName: string; lastName: string };
  text: string;
  readBy?: Array<{ userId: string; readAt: string }>;
  createdAt: string;
}

export interface ChatConversation {
  _id: string;
  type: 'direct' | 'group';
  participants: ChatUser[];
  name?: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    _id: string;
    text: string;
    senderId: { _id: string; firstName: string; lastName: string };
    createdAt: string;
  } | null;
  unreadCount: number;
}

interface ChatState {
  conversations: ChatConversation[];
  activeConversation: ChatConversation | null;
  messages: ChatMessage[];
  chatUsers: ChatUser[];
  loading: boolean;
  messagesLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  conversations: [],
  activeConversation: null,
  messages: [],
  chatUsers: [],
  loading: false,
  messagesLoading: false,
  error: null,
};

export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/chat/conversations');
      return (response.data as { success: boolean; data: ChatConversation[] }).data ?? [];
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err?.response?.data?.message ?? err?.message ?? 'Fehler');
    }
  }
);

export const createConversation = createAsyncThunk(
  'chat/createConversation',
  async (
    payload: { otherUserId?: string; participantIds?: string[]; name?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post('/chat/conversations', payload);
      return (response.data as { success: boolean; data: ChatConversation }).data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err?.response?.data?.message ?? err?.message ?? 'Fehler');
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (
    { conversationId, before }: { conversationId: string; before?: string },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (before) params.append('before', before);
      const response = await api.get(`/chat/conversations/${conversationId}/messages?${params}`);
      return (response.data as { success: boolean; data: ChatMessage[] }).data ?? [];
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err?.response?.data?.message ?? err?.message ?? 'Fehler');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (
    { conversationId, text }: { conversationId: string; text: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(`/chat/conversations/${conversationId}/messages`, { text });
      return (response.data as { success: boolean; data: ChatMessage }).data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err?.response?.data?.message ?? err?.message ?? 'Fehler');
    }
  }
);

export const markConversationRead = createAsyncThunk(
  'chat/markConversationRead',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      await api.put(`/chat/conversations/${conversationId}/read`);
      return conversationId;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err?.response?.data?.message ?? err?.message ?? 'Fehler');
    }
  }
);

export const fetchChatUsers = createAsyncThunk(
  'chat/fetchChatUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/chat/users');
      return (response.data as { success: boolean; data: ChatUser[] }).data ?? [];
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(err?.response?.data?.message ?? err?.message ?? 'Fehler');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveConversation: (state, action: PayloadAction<ChatConversation | null>) => {
      state.activeConversation = action.payload;
      if (!action.payload) state.messages = [];
    },
    appendMessage: (state, action: PayloadAction<ChatMessage>) => {
      if (
        state.activeConversation &&
        action.payload.conversationId === state.activeConversation._id
      ) {
        state.messages.push(action.payload);
      }
    },
    prependMessages: (state, action: PayloadAction<ChatMessage[]>) => {
      state.messages = [...action.payload, ...state.messages];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Fehler beim Laden';
      })
      .addCase(createConversation.fulfilled, (state, action) => {
        const exists = state.conversations.some((c) => c._id === action.payload._id);
        if (!exists) state.conversations = [action.payload, ...state.conversations];
        state.activeConversation = { ...action.payload, lastMessage: null, unreadCount: 0 };
        state.messages = [];
      })
      .addCase(createConversation.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Fehler beim Anlegen';
      })
      .addCase(fetchMessages.pending, (state) => {
        state.messagesLoading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messagesLoading = false;
        state.messages = action.payload;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.messagesLoading = false;
        state.error = (action.payload as string) ?? 'Fehler beim Laden der Nachrichten';
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.messages.push(action.payload);
        if (state.activeConversation) {
          state.activeConversation.lastMessage = {
            _id: action.payload._id,
            text: action.payload.text,
            senderId: action.payload.senderId,
            createdAt: action.payload.createdAt,
          };
          const idx = state.conversations.findIndex((c) => c._id === state.activeConversation!._id);
          if (idx >= 0) state.conversations[idx] = { ...state.activeConversation };
        }
      })
      .addCase(markConversationRead.fulfilled, (state, action) => {
        const id = action.payload;
        const c = state.conversations.find((x) => x._id === id);
        if (c) c.unreadCount = 0;
        if (state.activeConversation?._id === id) state.activeConversation.unreadCount = 0;
      })
      .addCase(fetchChatUsers.fulfilled, (state, action) => {
        state.chatUsers = action.payload;
      });
  },
});

export const { setActiveConversation, appendMessage, prependMessages, clearError } = chatSlice.actions;
export default chatSlice.reducer;
