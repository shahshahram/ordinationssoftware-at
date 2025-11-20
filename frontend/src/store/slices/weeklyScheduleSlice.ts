import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '../../utils/api';

export interface DaySchedule {
  day: string;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  label?: string;
}

export interface WeeklyScheduleData {
  staffId: string;
  schedules: DaySchedule[];
  validFrom?: Date;
  validTo?: Date;
}

export interface WeeklySchedule {
  _id: string;
  staffId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    color_hex?: string;
  };
  schedules: DaySchedule[];
  isActive: boolean;
  validFrom: string; // ISO Date string
  validTo?: string; // ISO Date string or null
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface WeeklyScheduleState {
  schedules: WeeklySchedule[];
  loading: boolean;
  error: string | null;
}

const initialState: WeeklyScheduleState = {
  schedules: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchWeeklySchedules = createAsyncThunk(
  'weeklySchedules/fetchAll',
  async (params?: { staffId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.staffId) queryParams.append('staffId', params.staffId);

    console.log('Fetching weekly schedules...');
    const response = await apiRequest.get<{ success: boolean; data: any[]; pagination: any }>(`/weekly-schedules?${queryParams.toString()}`);
    console.log('Weekly schedules response:', response.data);
    console.log('Weekly schedules data field:', response.data.data);
    return response.data.data;
  }
);

export const fetchWeeklySchedule = createAsyncThunk(
  'weeklySchedules/fetchOne',
  async (id: string) => {
    const response = await apiRequest.get<{ success: boolean; data: any }>(`/weekly-schedules/${id}`);
    return response.data.data;
  }
);

export const createWeeklySchedule = createAsyncThunk(
  'weeklySchedules/create',
  async (scheduleData: {
    staffId: string;
    validFrom?: string;
    validTo?: string;
    schedules: DaySchedule[];
  }) => {
    const response = await apiRequest.post<{ success: boolean; data: any }>('/weekly-schedules', scheduleData);
    return response.data.data;
  }
);

export const updateWeeklySchedule = createAsyncThunk(
  'weeklySchedules/update',
  async ({ id, scheduleData }: { id: string; scheduleData: Partial<{
    validFrom?: string;
    validTo?: string;
    schedules: DaySchedule[];
  }> }) => {
    const response = await apiRequest.put<{ success: boolean; data: any }>(`/weekly-schedules/${id}`, scheduleData);
    return response.data.data;
  }
);

export const deleteWeeklySchedule = createAsyncThunk(
  'weeklySchedules/delete',
  async (id: string) => {
    await apiRequest.delete(`/weekly-schedules/${id}`);
    return id;
  }
);

export const deleteWeeklySchedulesByStaffId = createAsyncThunk(
  'weeklySchedules/deleteByStaffId',
  async (staffId: string) => {
    // This is a local action to remove schedules from the store
    // The actual deletion is handled by the backend when user is deleted
    return staffId;
  }
);

export const cleanupOrphanedSchedules = createAsyncThunk(
  'weeklySchedules/cleanup',
  async () => {
    const response = await apiRequest.post<{ success: boolean; data: any }>('/weekly-schedules/cleanup');
    return response.data.data;
  }
);

const weeklyScheduleSlice = createSlice({
  name: 'weeklySchedules',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSchedules: (state) => {
      state.schedules = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all schedules
      .addCase(fetchWeeklySchedules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWeeklySchedules.fulfilled, (state, action) => {
        state.loading = false;
        console.log('Weekly schedules fulfilled:', action.payload);
        state.schedules = action.payload;
        state.error = null;
      })
      .addCase(fetchWeeklySchedules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Laden der Personal-Arbeitszeiten';
      })
      // Fetch one schedule
      .addCase(fetchWeeklySchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWeeklySchedule.fulfilled, (state, action) => {
        state.loading = false;
        const existingIndex = state.schedules.findIndex(s => s._id === action.payload._id);
        if (existingIndex >= 0) {
          state.schedules[existingIndex] = action.payload;
        } else {
          state.schedules.push(action.payload);
        }
        state.error = null;
      })
      .addCase(fetchWeeklySchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Laden der Personal-Arbeitszeiten';
      })
      // Create schedule
      .addCase(createWeeklySchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createWeeklySchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.schedules.push(action.payload);
        state.error = null;
      })
      .addCase(createWeeklySchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Erstellen der Personal-Arbeitszeiten';
      })
      // Update schedule
      .addCase(updateWeeklySchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateWeeklySchedule.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.schedules.findIndex(s => s._id === action.payload._id);
        if (index >= 0) {
          state.schedules[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateWeeklySchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Aktualisieren der Personal-Arbeitszeiten';
      })
      // Delete schedule
      .addCase(deleteWeeklySchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteWeeklySchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.schedules = state.schedules.filter(s => s._id !== action.payload);
        state.error = null;
      })
      .addCase(deleteWeeklySchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Löschen der Personal-Arbeitszeiten';
      })
      // Delete schedules by staff ID (local action)
      .addCase(deleteWeeklySchedulesByStaffId.fulfilled, (state, action) => {
        const staffId = action.payload;
        state.schedules = state.schedules.filter(s => s.staffId._id !== staffId);
        console.log(`Removed schedules for staff ${staffId} from store`);
      })
      // Cleanup orphaned schedules
      .addCase(cleanupOrphanedSchedules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cleanupOrphanedSchedules.fulfilled, (state, action) => {
        state.loading = false;
        console.log('Cleanup completed:', action.payload);
        // Refresh schedules after cleanup
        state.schedules = state.schedules.filter(schedule => 
          schedule.staffId && schedule.staffId._id && schedule.staffId.firstName && schedule.staffId.lastName
        );
        state.error = null;
      })
      .addCase(cleanupOrphanedSchedules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Bereinigen der Arbeitszeiten';
      });
  },
});

export const { clearError, clearSchedules } = weeklyScheduleSlice.actions;
export default weeklyScheduleSlice.reducer;
