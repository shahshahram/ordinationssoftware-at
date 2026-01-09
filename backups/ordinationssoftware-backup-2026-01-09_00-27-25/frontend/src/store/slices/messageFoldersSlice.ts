import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../utils/api';
import { InternalMessage } from './internalMessagesSlice';

// Types
export interface MessageFolder {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  order: number;
  isSystem: boolean;
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateFolderData {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  order?: number;
}

interface MessageFoldersState {
  folders: MessageFolder[];
  folderMessages: Record<string, InternalMessage[]>; // folderId -> messages
  loading: boolean;
  error: string | null;
  selectedFolder: MessageFolder | null;
}

const initialState: MessageFoldersState = {
  folders: [],
  folderMessages: {},
  loading: false,
  error: null,
  selectedFolder: null
};

// Async Thunks
export const fetchFolders = createAsyncThunk(
  'messageFolders/fetchFolders',
  async () => {
    const response = await api.get('/message-folders');
    return (response.data as any).data || [];
  }
);

export const createFolder = createAsyncThunk(
  'messageFolders/createFolder',
  async (folderData: CreateFolderData) => {
    const response = await api.post('/message-folders', folderData);
    return (response.data as any).data;
  }
);

export const updateFolder = createAsyncThunk(
  'messageFolders/updateFolder',
  async ({ id, updates }: { id: string; updates: UpdateFolderData }) => {
    const response = await api.put(`/message-folders/${id}`, updates);
    return (response.data as any).data;
  }
);

export const deleteFolder = createAsyncThunk(
  'messageFolders/deleteFolder',
  async (folderId: string) => {
    await api.delete(`/message-folders/${folderId}`);
    return folderId;
  }
);

export const moveMessagesToFolder = createAsyncThunk(
  'messageFolders/moveMessagesToFolder',
  async ({ folderId, messageIds }: { folderId: string; messageIds: string[] }) => {
    const response = await api.put(`/message-folders/${folderId}/move-messages`, { messageIds });
    return { folderId, messageIds, data: (response.data as any).data };
  }
);

export const fetchFolderMessages = createAsyncThunk(
  'messageFolders/fetchFolderMessages',
  async ({ folderId, limit = 50, skip = 0 }: { folderId: string; limit?: number; skip?: number }) => {
    const response = await api.get(`/message-folders/${folderId}/messages?limit=${limit}&skip=${skip}`);
    return {
      folderId,
      messages: (response.data as any).data || [],
      pagination: (response.data as any).pagination || {}
    };
  }
);

// Slice
const messageFoldersSlice = createSlice({
  name: 'messageFolders',
  initialState,
  reducers: {
    setSelectedFolder: (state, action: PayloadAction<MessageFolder | null>) => {
      state.selectedFolder = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Folders
      .addCase(fetchFolders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFolders.fulfilled, (state, action) => {
        state.loading = false;
        state.folders = action.payload;
      })
      .addCase(fetchFolders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Laden der Ordner';
      })
      // Create Folder
      .addCase(createFolder.fulfilled, (state, action) => {
        state.folders.push(action.payload);
      })
      // Update Folder
      .addCase(updateFolder.fulfilled, (state, action) => {
        const index = state.folders.findIndex(f => f._id === action.payload._id);
        if (index !== -1) {
          state.folders[index] = action.payload;
        }
        if (state.selectedFolder?._id === action.payload._id) {
          state.selectedFolder = action.payload;
        }
      })
      // Delete Folder
      .addCase(deleteFolder.fulfilled, (state, action) => {
        state.folders = state.folders.filter(f => f._id !== action.payload);
        delete state.folderMessages[action.payload];
        if (state.selectedFolder?._id === action.payload) {
          state.selectedFolder = null;
        }
      })
      // Fetch Folder Messages
      .addCase(fetchFolderMessages.fulfilled, (state, action) => {
        state.folderMessages[action.payload.folderId] = action.payload.messages;
      })
      // Move Messages to Folder
      .addCase(moveMessagesToFolder.fulfilled, (state, action) => {
        // Nachrichten wurden verschoben, aktualisiere die Ordner-Nachrichten
        // Die Nachrichten sollten neu geladen werden
      });
  }
});

export const { setSelectedFolder, clearError } = messageFoldersSlice.actions;
export default messageFoldersSlice.reducer;

