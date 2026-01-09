import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../utils/api';

interface CheckInSession {
  id: string;
  createdAt: string; // ISO date string for serialization
  status: 'active' | 'completed' | 'expired';
  patientId?: string;
  formData?: any;
  completedAt?: string; // ISO date string for serialization
}

interface CheckInState {
  currentSession: CheckInSession | null;
  qrCode: string | null;
  isLoading: boolean;
  error: string | null;
  tabletMode: boolean;
}

const initialState: CheckInState = {
  currentSession: null,
  qrCode: null,
  isLoading: false,
  error: null,
  tabletMode: false,
};

// Generate QR code for self check-in
export const generateCheckInCode = createAsyncThunk(
  'checkin/generateCode',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post('/checkin/generate');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Fehler beim Generieren des QR-Codes');
    }
  }
);

// Validate check-in session
export const validateCheckInSession = createAsyncThunk(
  'checkin/validateSession',
  async (checkInId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/checkin/validate/${checkInId}`);
      return response.data as { success: boolean; data: { status: string; message?: string }; message?: string };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Fehler beim Validieren der Session');
    }
  }
);

// Submit check-in form data
export const submitCheckInData = createAsyncThunk(
  'checkin/submitData',
  async ({ checkInId, patientData }: { checkInId: string; patientData: any }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/checkin/submit/${checkInId}`, patientData);
      return response.data as { success: boolean; message?: string; data?: any };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Fehler beim Speichern der Daten');
    }
  }
);

// Get check-in session data
export const getCheckInSession = createAsyncThunk(
  'checkin/getSession',
  async (checkInId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/checkin/session/${checkInId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Abrufen der Session');
    }
  }
);

const checkinSlice = createSlice({
  name: 'checkin',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setTabletMode: (state, action: PayloadAction<boolean>) => {
      state.tabletMode = action.payload;
    },
    clearSession: (state) => {
      state.currentSession = null;
      state.qrCode = null;
    },
    setQRCode: (state, action: PayloadAction<string>) => {
      state.qrCode = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate QR Code
      .addCase(generateCheckInCode.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(generateCheckInCode.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as any;
        state.qrCode = payload.data.qrCode;
        state.currentSession = {
          id: payload.data.checkInId,
          createdAt: new Date().toISOString(),
          status: 'active'
        };
      })
      .addCase(generateCheckInCode.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Validate Session
      .addCase(validateCheckInSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(validateCheckInSession.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as any;
        // Normalize date strings if they come as Date objects from backend
        if (payload.data) {
          state.currentSession = {
            ...payload.data,
            createdAt: payload.data.createdAt instanceof Date 
              ? payload.data.createdAt.toISOString() 
              : payload.data.createdAt,
            completedAt: payload.data.completedAt instanceof Date 
              ? payload.data.completedAt.toISOString() 
              : payload.data.completedAt
          };
        }
      })
      .addCase(validateCheckInSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Submit Data
      .addCase(submitCheckInData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(submitCheckInData.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as any;
        if (state.currentSession) {
          state.currentSession.status = 'completed';
          state.currentSession.patientId = payload.data.patientId;
          state.currentSession.completedAt = new Date().toISOString();
        }
      })
      .addCase(submitCheckInData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Get Session
      .addCase(getCheckInSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCheckInSession.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as any;
        // Normalize date strings if they come as Date objects from backend
        if (payload.data) {
          state.currentSession = {
            ...payload.data,
            createdAt: payload.data.createdAt instanceof Date 
              ? payload.data.createdAt.toISOString() 
              : payload.data.createdAt,
            completedAt: payload.data.completedAt instanceof Date 
              ? payload.data.completedAt.toISOString() 
              : payload.data.completedAt
          };
        }
      })
      .addCase(getCheckInSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setTabletMode, clearSession, setQRCode } = checkinSlice.actions;
export default checkinSlice.reducer;
