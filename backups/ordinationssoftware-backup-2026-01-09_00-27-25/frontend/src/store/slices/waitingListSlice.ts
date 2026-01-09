import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiRequest } from '../../utils/api';

// Types
export interface WaitingListEntry {
  _id: string;
  patient: string | { _id: string; firstName: string; lastName: string; email?: string; phone?: string };
  service?: string | { _id: string; name: string; code?: string };
  doctor?: string | { _id: string; displayName?: string; firstName?: string; lastName?: string; first_name?: string; last_name?: string };
  location?: string | { _id: string; name: string };
  reason: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  position: number;
  preferredDate?: string;
  notes?: string;
  contactMethod: 'all' | 'phone' | 'email' | 'sms';
  createdBy?: string | { _id: string; firstName: string; lastName: string };
  updatedBy?: string | { _id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface WaitingListState {
  entries: WaitingListEntry[];
  loading: boolean;
  error: string | null;
  count: number;
}

const initialState: WaitingListState = {
  entries: [],
  loading: false,
  error: null,
  count: 0,
};

// Async thunks
export const fetchWaitingList = createAsyncThunk<WaitingListEntry[], { status?: string; locationId?: string; doctorId?: string; serviceId?: string }>(
  'waitingList/fetchWaitingList',
  async (params = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.locationId) queryParams.append('locationId', params.locationId);
      if (params.doctorId) queryParams.append('doctorId', params.doctorId);
      if (params.serviceId) queryParams.append('serviceId', params.serviceId);
      
      const response = await apiRequest.get<{ success: boolean; data: WaitingListEntry[]; count: number }>(
        `/waiting-list?${queryParams.toString()}`
      );
      return response.data.data;
    } catch (error: any) {
      console.error('waitingListSlice: fetchWaitingList - API error:', error);
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Warteliste');
    }
  }
);

export const fetchWaitingListCount = createAsyncThunk<number, { status?: string; locationId?: string }>(
  'waitingList/fetchWaitingListCount',
  async (params = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.locationId) queryParams.append('locationId', params.locationId);
      
      const response = await apiRequest.get<{ success: boolean; count: number }>(
        `/waiting-list/count?${queryParams.toString()}`
      );
      return response.data.count || 0;
    } catch (error: any) {
      console.error('waitingListSlice: fetchWaitingListCount - API error:', error);
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Wartelisten-Anzahl');
    }
  }
);

export const createWaitingListEntry = createAsyncThunk<WaitingListEntry, Partial<WaitingListEntry>>(
  'waitingList/createWaitingListEntry',
  async (entryData, { rejectWithValue }) => {
    try {
      const response = await apiRequest.post<{ success: boolean; data: WaitingListEntry }>(
        '/waiting-list',
        entryData
      );
      return response.data.data;
    } catch (error: any) {
      console.error('waitingListSlice: createWaitingListEntry - API error:', error);
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Erstellen des Wartelisten-Eintrags');
    }
  }
);

export const updateWaitingListEntry = createAsyncThunk<WaitingListEntry, Partial<WaitingListEntry> & { id: string }>(
  'waitingList/updateWaitingListEntry',
  async ({ id, ...entryData }, { rejectWithValue }) => {
    try {
      const response = await apiRequest.put<{ success: boolean; data: WaitingListEntry }>(
        `/waiting-list/${id}`,
        entryData
      );
      return response.data.data;
    } catch (error: any) {
      console.error('waitingListSlice: updateWaitingListEntry - API error:', error);
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Aktualisieren des Wartelisten-Eintrags');
    }
  }
);

export const deleteWaitingListEntry = createAsyncThunk<string, string>(
  'waitingList/deleteWaitingListEntry',
  async (id, { rejectWithValue }) => {
    try {
      await apiRequest.delete(`/waiting-list/${id}`);
      return id;
    } catch (error: any) {
      console.error('waitingListSlice: deleteWaitingListEntry - API error:', error);
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Löschen des Wartelisten-Eintrags');
    }
  }
);

// Slice
const waitingListSlice = createSlice({
  name: 'waitingList',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch waiting list
      .addCase(fetchWaitingList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWaitingList.fulfilled, (state, action: PayloadAction<WaitingListEntry[]>) => {
        state.loading = false;
        state.entries = action.payload;
        state.count = action.payload.length;
      })
      .addCase(fetchWaitingList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch waiting list count
      .addCase(fetchWaitingListCount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWaitingListCount.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false;
        state.count = action.payload;
      })
      .addCase(fetchWaitingListCount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create waiting list entry
      .addCase(createWaitingListEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createWaitingListEntry.fulfilled, (state, action: PayloadAction<WaitingListEntry>) => {
        state.loading = false;
        state.entries.push(action.payload);
        state.count = state.entries.length;
      })
      .addCase(createWaitingListEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update waiting list entry
      .addCase(updateWaitingListEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateWaitingListEntry.fulfilled, (state, action: PayloadAction<WaitingListEntry>) => {
        state.loading = false;
        const index = state.entries.findIndex(entry => entry._id === action.payload._id);
        if (index !== -1) {
          state.entries[index] = action.payload;
        }
      })
      .addCase(updateWaitingListEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete waiting list entry
      .addCase(deleteWaitingListEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteWaitingListEntry.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.entries = state.entries.filter(entry => entry._id !== action.payload);
        state.count = state.entries.length;
      })
      .addCase(deleteWaitingListEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setLoading } = waitingListSlice.actions;
export default waitingListSlice.reducer;

