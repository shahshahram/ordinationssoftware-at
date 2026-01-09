import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiRequest } from '../../utils/api';

// Types
export interface Room {
  _id: string;
  name: string;
  type: 'consultation' | 'treatment' | 'surgery' | 'waiting' | 'office' | 'storage' | 'other';
  category: 'medical' | 'administrative' | 'common' | 'specialized';
  description?: string;
  location?: string;
  color_hex: string;
  isOnlineBookable: boolean;
  onlineBookingSettings: {
    minDuration: number;
    maxDuration: number;
    bufferBefore: number;
    bufferAfter: number;
    requiresApproval: boolean;
  };
  capacity: number;
  equipment: string[];
  availabilityRules: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isBookable: boolean;
    label?: string;
    breaks: Array<{
      start: string;
      end: string;
      label?: string;
    }>;
  }>;
  isActive: boolean;
  // Audit fields
  createdAt: string;
  updatedAt: string;
}

interface RoomState {
  rooms: Room[];
  loading: boolean;
  error: string | null;
}

const initialState: RoomState = {
  rooms: [],
  loading: false,
  error: null,
};

// Async Thunks
export const fetchRooms = createAsyncThunk<Room[], void>(
  'rooms/fetchRooms',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest.get<{ success: boolean; data: Room[]; pagination: any }>('/rooms');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Räume');
    }
  }
);

export const createRoom = createAsyncThunk<Room, Omit<Room, '_id' | 'createdAt' | 'updatedAt'>>(
  'rooms/createRoom',
  async (roomData, { rejectWithValue }) => {
    try {
      const response = await apiRequest.post<{ success: boolean; data: Room }>('/rooms', roomData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Erstellen des Raumes');
    }
  }
);

export const updateRoom = createAsyncThunk<Room, { id: string; roomData: Partial<Room> }>(
  'rooms/updateRoom',
  async ({ id, roomData }, { rejectWithValue }) => {
    try {
      const response = await apiRequest.put<{ success: boolean; data: Room }>(`/rooms/${id}`, roomData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Aktualisieren des Raumes');
    }
  }
);

export const deleteRoom = createAsyncThunk<string, string>(
  'rooms/deleteRoom',
  async (id, { rejectWithValue }) => {
    try {
      await apiRequest.delete(`/rooms/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Löschen des Raumes');
    }
  }
);

const roomSlice = createSlice({
  name: 'rooms',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRooms.fulfilled, (state, action: PayloadAction<Room[]>) => {
        state.loading = false;
        state.rooms = action.payload;
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createRoom.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRoom.fulfilled, (state, action: PayloadAction<Room>) => {
        state.loading = false;
        state.rooms.push(action.payload);
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateRoom.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRoom.fulfilled, (state, action: PayloadAction<Room>) => {
        state.loading = false;
        const index = state.rooms.findIndex((room) => room._id === action.payload._id);
        if (index !== -1) {
          state.rooms[index] = action.payload;
        }
      })
      .addCase(updateRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteRoom.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteRoom.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.rooms = state.rooms.filter((room) => room._id !== action.payload);
      })
      .addCase(deleteRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = roomSlice.actions;
export default roomSlice.reducer;
