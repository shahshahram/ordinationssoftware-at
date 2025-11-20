import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiRequest } from '../../utils/api';

// Types
export interface StaffProfile {
  _id: string;
  user_id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  color_hex: string;
  isActive: boolean;
  locations?: Array<{ _id: string; name: string }> | string[];
  // Audit fields
  createdAt: string;
  updatedAt: string;
}

interface StaffState {
  staffProfiles: StaffProfile[];
  loading: boolean;
  error: string | null;
}

const initialState: StaffState = {
  staffProfiles: [],
  loading: false,
  error: null,
};

// Async Thunks
export const fetchStaffProfiles = createAsyncThunk<StaffProfile[], void>(
  'staff/fetchStaffProfiles',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Fetching staff profiles from API...');
      const response = await apiRequest.get<{ success: boolean; data: StaffProfile[]; pagination: any }>('/staff-profiles');
      console.log('Staff profiles API response:', response.data);
      
      // Debug Dr. Thomas Schmidt specifically
      const staffData = Array.isArray(response.data.data) ? response.data.data : [];
      const thomasSchmidt = staffData.find((s: any) => 
        s.first_name?.includes('Thomas') && s.last_name?.includes('Schmidt')
      );
      if (thomasSchmidt) {
        console.log('Dr. Thomas Schmidt from API:', {
          first_name: thomasSchmidt.first_name,
          last_name: thomasSchmidt.last_name,
          display_name: thomasSchmidt.display_name,
          color_hex: thomasSchmidt.color_hex
        });
      }
      
      return staffData;
    } catch (error: any) {
      console.error('Error fetching staff profiles:', error);
      return rejectWithValue(error.message || 'Fehler beim Laden der Mitarbeiter');
    }
  }
);

export const createStaffProfile = createAsyncThunk<StaffProfile, Omit<StaffProfile, '_id' | 'createdAt' | 'updatedAt'>>(
  'staff/createStaffProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await apiRequest.post<{ success: boolean; data: StaffProfile }>('/staff-profiles', profileData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Erstellen des Mitarbeiterprofils');
    }
  }
);

export const updateStaffProfile = createAsyncThunk<StaffProfile, { id: string; profileData: Partial<StaffProfile> }>(
  'staff/updateStaffProfile',
  async ({ id, profileData }, { rejectWithValue }) => {
    try {
      const response = await apiRequest.put<{ success: boolean; data: StaffProfile }>(`/staff-profiles/${id}`, profileData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Aktualisieren des Mitarbeiterprofils');
    }
  }
);

export const deleteStaffProfile = createAsyncThunk<string, string>(
  'staff/deleteStaffProfile',
  async (id, { rejectWithValue }) => {
    try {
      await apiRequest.delete(`/staff-profiles/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Löschen des Mitarbeiterprofils');
    }
  }
);

// Work Shifts
export const fetchWorkShifts = createAsyncThunk(
  'staff/fetchWorkShifts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest.get<{ success: boolean; data: any[] }>('/work-shifts');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Arbeitsschichten');
    }
  }
);

export const createWorkShift = createAsyncThunk(
  'staff/createWorkShift',
  async (shiftData: any, { rejectWithValue }) => {
    try {
      const response = await apiRequest.post<{ success: boolean; data: any }>('/work-shifts', shiftData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Erstellen der Arbeitsschicht');
    }
  }
);

export const updateWorkShift = createAsyncThunk(
  'staff/updateWorkShift',
  async ({ id, shiftData }: { id: string; shiftData: any }, { rejectWithValue }) => {
    try {
      const response = await apiRequest.put<{ success: boolean; data: any }>(`/work-shifts/${id}`, shiftData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Aktualisieren der Arbeitsschicht');
    }
  }
);

export const deleteWorkShift = createAsyncThunk(
  'staff/deleteWorkShift',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiRequest.delete(`/work-shifts/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Löschen der Arbeitsschicht');
    }
  }
);

// Absences
export const fetchAbsences = createAsyncThunk(
  'staff/fetchAbsences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest.get<{ success: boolean; data: any[] }>('/absences');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Abwesenheiten');
    }
  }
);

export const createAbsence = createAsyncThunk(
  'staff/createAbsence',
  async (absenceData: any, { rejectWithValue }) => {
    try {
      const response = await apiRequest.post<{ success: boolean; data: any }>('/absences', absenceData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Erstellen der Abwesenheit');
    }
  }
);

export const updateAbsence = createAsyncThunk(
  'staff/updateAbsence',
  async ({ id, absenceData }: { id: string; absenceData: any }, { rejectWithValue }) => {
    try {
      const response = await apiRequest.put<{ success: boolean; data: any }>(`/absences/${id}`, absenceData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Aktualisieren der Abwesenheit');
    }
  }
);

export const deleteAbsence = createAsyncThunk(
  'staff/deleteAbsence',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiRequest.delete(`/absences/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Löschen der Abwesenheit');
    }
  }
);

export const approveAbsence = createAsyncThunk(
  'staff/approveAbsence',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiRequest.put<{ success: boolean; data: any }>(`/absences/${id}/approve`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Genehmigen der Abwesenheit');
    }
  }
);

// Toggle staff status
export const toggleStaffStatus = createAsyncThunk(
  'staff/toggleStaffStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiRequest.put<{ success: boolean; data: any }>(`/staff-profiles/${id}/toggle-status`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Ändern des Mitarbeiterstatus');
    }
  }
);

// Staff Statistics
export const fetchStaffStatistics = createAsyncThunk(
  'staff/fetchStaffStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest.get<{ success: boolean; data: any }>('/staff-profiles/statistics');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Mitarbeiterstatistiken');
    }
  }
);

// Staff Availability
export const fetchStaffAvailability = createAsyncThunk(
  'staff/fetchStaffAvailability',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest.get<{ success: boolean; data: any }>('/availability');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Mitarbeiterverfügbarkeit');
    }
  }
);

// Staff Utilization
export const fetchStaffUtilization = createAsyncThunk(
  'staff/fetchStaffUtilization',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest.get<{ success: boolean; data: any }>('/staff/utilization');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Mitarbeiterauslastung');
    }
  }
);

const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaffProfiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStaffProfiles.fulfilled, (state, action: PayloadAction<StaffProfile[]>) => {
        state.loading = false;
        state.staffProfiles = action.payload;
      })
      .addCase(fetchStaffProfiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createStaffProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createStaffProfile.fulfilled, (state, action: PayloadAction<StaffProfile>) => {
        state.loading = false;
        state.staffProfiles.push(action.payload);
      })
      .addCase(createStaffProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateStaffProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateStaffProfile.fulfilled, (state, action: PayloadAction<StaffProfile>) => {
        state.loading = false;
        const index = state.staffProfiles.findIndex((profile) => profile._id === action.payload._id);
        if (index !== -1) {
          state.staffProfiles[index] = action.payload;
        }
      })
      .addCase(updateStaffProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteStaffProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteStaffProfile.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.staffProfiles = state.staffProfiles.filter((profile) => profile._id !== action.payload);
      })
      .addCase(deleteStaffProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Work Shifts
      .addCase(fetchWorkShifts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkShifts.fulfilled, (state, action) => {
        state.loading = false;
        // Handle work shifts data if needed
      })
      .addCase(fetchWorkShifts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Absences
      .addCase(fetchAbsences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAbsences.fulfilled, (state, action) => {
        state.loading = false;
        // Handle absences data if needed
      })
      .addCase(fetchAbsences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = staffSlice.actions;
export default staffSlice.reducer;