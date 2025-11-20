import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '../../utils/api';

export interface LocationDaySchedule {
  day: string;
  isOpen: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  label?: string;
}

export interface LocationWeeklyScheduleData {
  locationId: string;
  schedules: LocationDaySchedule[];
  validFrom?: Date;
  validTo?: Date;
}

export interface LocationWeeklySchedule {
  _id: string;
  location_id: {
    _id: string;
    name: string;
    code: string;
    color_hex: string;
  };
  schedules: LocationDaySchedule[];
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

interface LocationWeeklyScheduleState {
  schedules: LocationWeeklySchedule[];
  loading: boolean;
  error: string | null;
}

const initialState: LocationWeeklyScheduleState = {
  schedules: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchLocationWeeklySchedules = createAsyncThunk(
  'locationWeeklySchedules/fetchAll',
  async (params?: { location_id?: string; weekStart?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.location_id) queryParams.append('location_id', params.location_id);
    if (params?.weekStart) queryParams.append('weekStart', params.weekStart);
    
    console.log('Fetching location weekly schedules...');
    const response = await apiRequest.get<{ success: boolean; data: any[]; pagination: any }>(`/location-weekly-schedules?${queryParams.toString()}`);
    console.log('Location weekly schedules response:', response.data);
    console.log('Location weekly schedules data field:', response.data.data);
    return response.data.data;
  }
);

export const fetchLocationWeeklySchedule = createAsyncThunk(
  'locationWeeklySchedules/fetchOne',
  async (id: string) => {
    const response = await apiRequest.get<{ success: boolean; data: any }>(`/location-weekly-schedules/${id}`);
    return response.data.data;
  }
);

export const createLocationWeeklySchedule = createAsyncThunk(
  'locationWeeklySchedules/create',
  async (scheduleData: {
    location_id: string;
    validFrom?: string;
    validTo?: string;
    schedules: LocationDaySchedule[];
  }) => {
    const response = await apiRequest.post<{ success: boolean; data: any }>('/location-weekly-schedules', scheduleData);
    return response.data.data;
  }
);

export const updateLocationWeeklySchedule = createAsyncThunk(
  'locationWeeklySchedules/update',
  async ({ id, scheduleData }: { id: string; scheduleData: Partial<{
    validFrom?: string;
    validTo?: string;
    schedules: LocationDaySchedule[];
  }> }) => {
    const response = await apiRequest.put<{ success: boolean; data: any }>(`/location-weekly-schedules/${id}`, scheduleData);
    return response.data.data;
  }
);

export const deleteLocationWeeklySchedule = createAsyncThunk(
  'locationWeeklySchedules/delete',
  async (id: string) => {
    await apiRequest.delete(`/location-weekly-schedules/${id}`);
    return id;
  }
);

const locationWeeklyScheduleSlice = createSlice({
  name: 'locationWeeklySchedules',
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
      .addCase(fetchLocationWeeklySchedules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocationWeeklySchedules.fulfilled, (state, action) => {
        state.loading = false;
        console.log('Location weekly schedules fulfilled:', action.payload);
        state.schedules = action.payload;
        state.error = null;
      })
      .addCase(fetchLocationWeeklySchedules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Laden der Standort-Öffnungszeiten';
      })
      // Fetch one schedule
      .addCase(fetchLocationWeeklySchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocationWeeklySchedule.fulfilled, (state, action) => {
        state.loading = false;
        const existingIndex = state.schedules.findIndex(s => s._id === action.payload._id);
        if (existingIndex >= 0) {
          state.schedules[existingIndex] = action.payload;
        } else {
          state.schedules.push(action.payload);
        }
        state.error = null;
      })
      .addCase(fetchLocationWeeklySchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Laden der Standort-Öffnungszeiten';
      })
      // Create schedule
      .addCase(createLocationWeeklySchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLocationWeeklySchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.schedules.push(action.payload);
        state.error = null;
      })
      .addCase(createLocationWeeklySchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Erstellen der Standort-Öffnungszeiten';
      })
      // Update schedule
      .addCase(updateLocationWeeklySchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLocationWeeklySchedule.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.schedules.findIndex(s => s._id === action.payload._id);
        if (index >= 0) {
          state.schedules[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateLocationWeeklySchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Aktualisieren der Standort-Öffnungszeiten';
      })
      // Delete schedule
      .addCase(deleteLocationWeeklySchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteLocationWeeklySchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.schedules = state.schedules.filter(s => s._id !== action.payload);
        state.error = null;
      })
      .addCase(deleteLocationWeeklySchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Löschen der Standort-Öffnungszeiten';
      });
  },
});

export const { clearError, clearSchedules } = locationWeeklyScheduleSlice.actions;
export default locationWeeklyScheduleSlice.reducer;
