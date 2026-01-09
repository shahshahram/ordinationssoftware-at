import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../utils/api';

export interface VitalSigns {
  _id?: string;
  id?: string;
  patientId: string;
  appointmentId?: string;
  recordedAt: string;
  recordedBy?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  bloodPressure?: {
    systolic?: number;
    diastolic?: number;
  };
  pulse?: number;
  respiratoryRate?: number;
  temperature?: {
    value?: number;
    unit?: 'celsius' | 'fahrenheit';
  };
  oxygenSaturation?: number;
  bloodGlucose?: {
    value?: number;
    unit?: 'mg/dL' | 'mmol/L';
  };
  weight?: {
    value?: number;
    unit?: 'kg' | 'lbs';
  };
  height?: {
    value?: number;
    unit?: 'cm' | 'inches';
  };
  bmi?: number;
  painScale?: {
    type?: 'NRS' | 'VAS' | 'VRS' | 'KUSS';
    value?: number | string;
  };
  notes?: string;
  customValues?: Array<{
    name: string;
    value: any;
    unit?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

interface VitalSignsState {
  vitalSigns: VitalSigns[];
  loading: boolean;
  error: string | null;
}

const initialState: VitalSignsState = {
  vitalSigns: [],
  loading: false,
  error: null
};

// Async Thunks
export const fetchVitalSigns = createAsyncThunk(
  'vitalSigns/fetchVitalSigns',
  async (patientId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/vital-signs/patient/${patientId}?limit=100&sort=desc`);
      const backendResponse = response.data as { success?: boolean; data?: VitalSigns[]; message?: string };
      
      if (backendResponse?.success && backendResponse?.data) {
        return backendResponse.data;
      }
      throw new Error(backendResponse?.message || 'Fehler beim Laden der Vitalwerte');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Fehler beim Laden der Vitalwerte');
    }
  }
);

export const createVitalSigns = createAsyncThunk(
  'vitalSigns/createVitalSigns',
  async (data: Partial<VitalSigns>, { rejectWithValue }) => {
    try {
      const response = await api.post('/vital-signs', data);
      const backendResponse = response.data as { success?: boolean; data?: VitalSigns; message?: string };
      
      if (backendResponse?.success && backendResponse?.data) {
        return backendResponse.data;
      }
      throw new Error(backendResponse?.message || 'Fehler beim Erfassen der Vitalwerte');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Fehler beim Erfassen der Vitalwerte');
    }
  }
);

export const updateVitalSigns = createAsyncThunk(
  'vitalSigns/updateVitalSigns',
  async ({ id, data }: { id: string; data: Partial<VitalSigns> }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/vital-signs/${id}`, data);
      const backendResponse = response.data as { success?: boolean; data?: VitalSigns; message?: string };
      
      if (backendResponse?.success && backendResponse?.data) {
        return backendResponse.data;
      }
      throw new Error(backendResponse?.message || 'Fehler beim Aktualisieren der Vitalwerte');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Fehler beim Aktualisieren der Vitalwerte');
    }
  }
);

export const deleteVitalSigns = createAsyncThunk(
  'vitalSigns/deleteVitalSigns',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/vital-signs/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Fehler beim Löschen der Vitalwerte');
    }
  }
);

const vitalSignsSlice = createSlice({
  name: 'vitalSigns',
  initialState,
  reducers: {
    clearVitalSigns: (state) => {
      state.vitalSigns = [];
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchVitalSigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVitalSigns.fulfilled, (state, action: PayloadAction<VitalSigns[]>) => {
        state.loading = false;
        state.vitalSigns = action.payload;
      })
      .addCase(fetchVitalSigns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create
      .addCase(createVitalSigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVitalSigns.fulfilled, (state, action: PayloadAction<VitalSigns>) => {
        state.loading = false;
        state.vitalSigns.unshift(action.payload);
      })
      .addCase(createVitalSigns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update
      .addCase(updateVitalSigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateVitalSigns.fulfilled, (state, action: PayloadAction<VitalSigns>) => {
        state.loading = false;
        const index = state.vitalSigns.findIndex(vs => vs._id === action.payload._id || vs.id === action.payload.id);
        if (index !== -1) {
          state.vitalSigns[index] = action.payload;
        }
      })
      .addCase(updateVitalSigns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete
      .addCase(deleteVitalSigns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteVitalSigns.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.vitalSigns = state.vitalSigns.filter(vs => vs._id !== action.payload && vs.id !== action.payload);
      })
      .addCase(deleteVitalSigns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearVitalSigns } = vitalSignsSlice.actions;
export default vitalSignsSlice.reducer;

