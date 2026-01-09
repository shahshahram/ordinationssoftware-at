import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

export interface SlotReservation {
  id: string;
  start: string;
  end: string;
  resourceId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  userId: string;
  appointmentId?: string;
  ttl: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface ConflictCheck {
  hasConflicts: boolean;
  conflicts: Array<{
    id: string;
    start: string;
    end: string;
    status: string;
    userId: string;
  }>;
}

export interface AvailableSlot {
  start: string;
  end: string;
  duration: number;
}

export interface SlotReservationState {
  reservations: SlotReservation[];
  availableSlots: AvailableSlot[];
  conflicts: ConflictCheck | null;
  loading: boolean;
  error: string | null;
  currentReservation: SlotReservation | null;
}

const initialState: SlotReservationState = {
  reservations: [],
  availableSlots: [],
  conflicts: null,
  loading: false,
  error: null,
  currentReservation: null
};

// Async thunks
export const fetchReservations = createAsyncThunk(
  'slotReservation/fetchReservations',
  async (params: { status?: string; resourceId?: string; start?: string; end?: string } = {}) => {
    const response = await axios.get('/api/slot-reservations', { params });
    return response.data.data;
  }
);

export const checkConflicts = createAsyncThunk(
  'slotReservation/checkConflicts',
  async (data: { start: string; end: string; resourceId: string; excludeId?: string }) => {
    const response = await axios.post('/api/slot-reservations/check-conflicts', data);
    return response.data.data;
  }
);

export const reserveSlot = createAsyncThunk(
  'slotReservation/reserveSlot',
  async (data: { 
    start: string; 
    end: string; 
    resourceId: string; 
    ttl?: number;
    metadata?: Record<string, any>;
  }) => {
    const response = await axios.post('/api/slot-reservations/reserve', data);
    return response.data.data;
  }
);

export const confirmReservation = createAsyncThunk(
  'slotReservation/confirmReservation',
  async (data: { id: string; appointmentId: string }) => {
    const response = await axios.post(`/api/slot-reservations/${data.id}/confirm`, {
      appointmentId: data.appointmentId
    });
    return response.data.data;
  }
);

export const cancelReservation = createAsyncThunk(
  'slotReservation/cancelReservation',
  async (id: string) => {
    const response = await axios.post(`/api/slot-reservations/${id}/cancel`);
    return response.data.data;
  }
);

export const getAvailableSlots = createAsyncThunk(
  'slotReservation/getAvailableSlots',
  async (params: { 
    startDate: string; 
    endDate: string; 
    resourceId?: string; 
    duration?: number;
  }) => {
    const response = await axios.get('/api/slot-reservations/available', { params });
    return response.data.data;
  }
);

export const cleanupExpiredReservations = createAsyncThunk(
  'slotReservation/cleanupExpiredReservations',
  async () => {
    const response = await axios.delete('/api/slot-reservations/cleanup');
    return response.data.data;
  }
);

const slotReservationSlice = createSlice({
  name: 'slotReservation',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearConflicts: (state) => {
      state.conflicts = null;
    },
    setCurrentReservation: (state, action: PayloadAction<SlotReservation | null>) => {
      state.currentReservation = action.payload;
    },
    updateReservationStatus: (state, action: PayloadAction<{ id: string; status: string }>) => {
      const reservation = state.reservations.find(r => r.id === action.payload.id);
      if (reservation) {
        reservation.status = action.payload.status as any;
      }
      if (state.currentReservation?.id === action.payload.id) {
        state.currentReservation.status = action.payload.status as any;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch reservations
      .addCase(fetchReservations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReservations.fulfilled, (state, action) => {
        state.loading = false;
        state.reservations = action.payload;
      })
      .addCase(fetchReservations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch reservations';
      })
      
      // Check conflicts
      .addCase(checkConflicts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkConflicts.fulfilled, (state, action) => {
        state.loading = false;
        state.conflicts = action.payload;
      })
      .addCase(checkConflicts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to check conflicts';
      })
      
      // Reserve slot
      .addCase(reserveSlot.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(reserveSlot.fulfilled, (state, action) => {
        state.loading = false;
        state.currentReservation = action.payload;
        state.reservations.unshift(action.payload);
      })
      .addCase(reserveSlot.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to reserve slot';
      })
      
      // Confirm reservation
      .addCase(confirmReservation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmReservation.fulfilled, (state, action) => {
        state.loading = false;
        const reservation = state.reservations.find(r => r.id === action.payload.id);
        if (reservation) {
          reservation.status = 'confirmed';
          reservation.appointmentId = action.payload.appointmentId;
        }
        if (state.currentReservation && state.currentReservation.id === action.payload.id) {
          state.currentReservation.status = 'confirmed';
          state.currentReservation.appointmentId = action.payload.appointmentId;
        }
      })
      .addCase(confirmReservation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to confirm reservation';
      })
      
      // Cancel reservation
      .addCase(cancelReservation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelReservation.fulfilled, (state, action) => {
        state.loading = false;
        const reservation = state.reservations.find(r => r.id === action.payload.id);
        if (reservation) {
          reservation.status = 'cancelled';
        }
        if (state.currentReservation?.id === action.payload.id) {
          state.currentReservation = null;
        }
      })
      .addCase(cancelReservation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to cancel reservation';
      })
      
      // Get available slots
      .addCase(getAvailableSlots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAvailableSlots.fulfilled, (state, action) => {
        state.loading = false;
        state.availableSlots = action.payload.availableSlots || [];
      })
      .addCase(getAvailableSlots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get available slots';
      })
      
      // Cleanup expired reservations
      .addCase(cleanupExpiredReservations.fulfilled, (state, action) => {
        // Remove expired reservations from state
        state.reservations = state.reservations.filter(r => r.status !== 'expired');
        if (state.currentReservation?.status === 'expired') {
          state.currentReservation = null;
        }
      });
  }
});

export const {
  clearError,
  clearConflicts,
  setCurrentReservation,
  updateReservationStatus
} = slotReservationSlice.actions;

export default slotReservationSlice.reducer;
