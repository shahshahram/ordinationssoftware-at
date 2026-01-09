import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiRequest } from '../../utils/api';

// Types
export interface Appointment {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  doctor: string | { _id: string; firstName: string; lastName: string; email?: string };
  room?: string;
  devices?: string[];
  type: string;
  status: string;
  description?: string;
  patient?: string | { _id: string; firstName: string; lastName: string; [key: string]: any };
  bookingType: string;
  onlineBookingRef?: string;
  locationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentState {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  statistics: {
    total: number;
    byType: { [key: string]: number };
    byStatus: { [key: string]: number };
    upcoming: number;
    today: number;
  } | null;
}

const initialState: AppointmentState = {
  appointments: [],
  loading: false,
  error: null,
  statistics: null,
};

// Hilfsfunktion: Extrahiere Patient-ID aus Appointment
const getPatientId = (apt: Appointment): string | null => {
  if (!apt.patient) return null;
  if (typeof apt.patient === 'string') {
    return apt.patient;
  }
  if (typeof apt.patient === 'object' && apt.patient !== null && '_id' in apt.patient) {
    return (apt.patient as { _id: string })._id;
  }
  return null;
};

// Async thunks
export const fetchAppointments = createAsyncThunk<Appointment[], void>(
  'appointments/fetchAppointments',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest.get<{ success: boolean; data: Appointment[]; pagination: any }>('/appointments');
      return response.data.data;
    } catch (error: any) {
      console.error('appointmentSlice: fetchAppointments - API error:', error);
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Termine');
    }
  }
);

// Optimierte Funktion: Lade nur Termine für einen spezifischen Patienten
export const fetchAppointmentsByPatientId = createAsyncThunk<Appointment[], string>(
  'appointments/fetchAppointmentsByPatientId',
  async (patientId, { rejectWithValue }) => {
    try {
      const response = await apiRequest.get<{ success: boolean; data: Appointment[]; pagination: any }>(`/appointments?patientId=${patientId}&limit=50`);
      return response.data.data;
    } catch (error: any) {
      console.error('appointmentSlice: fetchAppointmentsByPatientId - API error:', error);
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Termine');
    }
  }
);

export const createAppointment = createAsyncThunk<Appointment, Partial<Appointment>>(
  'appointments/createAppointment',
  async (appointmentData, { rejectWithValue }) => {
    try {
      const response = await apiRequest.post<{ success: boolean; data: Appointment }>('/appointments', appointmentData);
      return response.data.data;
    } catch (error: any) {
      console.error('Redux createAppointment: API error:', error);
      const errorMessage = error?.message || error?.response?.data?.message || 'Fehler beim Erstellen des Termins';
      console.error('Redux createAppointment: Extracted error message:', errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateAppointment = createAsyncThunk<Appointment, Partial<Appointment> & { id: string }>(
  'appointments/updateAppointment',
  async ({ id, ...appointmentData }, { rejectWithValue }) => {
    try {
      const response = await apiRequest.put<{ success: boolean; data: Appointment }>(`/appointments/${id}`, appointmentData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Aktualisieren des Termins');
    }
  }
);

export const deleteAppointment = createAsyncThunk<string, string>(
  'appointments/deleteAppointment',
  async (id, { rejectWithValue }) => {
    try {
      await apiRequest.delete(`/appointments/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Löschen des Termins');
    }
  }
);

export const fetchAppointmentStatistics = createAsyncThunk(
  'appointments/fetchStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest.get<{ success: boolean; data: any }>('/appointments/statistics');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Statistiken');
    }
  }
);

// Slice
const appointmentSlice = createSlice({
  name: 'appointments',
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
      // Fetch appointments
      .addCase(fetchAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointments.fulfilled, (state, action: PayloadAction<Appointment[]>) => {
        state.loading = false;
        state.appointments = action.payload;
      })
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create appointment
      .addCase(createAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAppointment.fulfilled, (state, action: PayloadAction<Appointment>) => {
        state.loading = false;
        state.appointments.push(action.payload);
      })
      .addCase(createAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update appointment
      .addCase(updateAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAppointment.fulfilled, (state, action: PayloadAction<Appointment>) => {
        state.loading = false;
        const index = state.appointments.findIndex(apt => apt._id === action.payload._id);
        if (index !== -1) {
          state.appointments[index] = action.payload;
        }
      })
      .addCase(updateAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete appointment
      .addCase(deleteAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAppointment.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.appointments = state.appointments.filter(apt => apt._id !== action.payload);
      })
      .addCase(deleteAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch statistics
      .addCase(fetchAppointmentStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointmentStatistics.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.statistics = action.payload;
      })
      .addCase(fetchAppointmentStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch appointments by patient ID
      .addCase(fetchAppointmentsByPatientId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointmentsByPatientId.fulfilled, (state, action: PayloadAction<Appointment[]>) => {
        state.loading = false;
        // Füge nur neue Termine hinzu oder ersetze, wenn es patientenspezifisch ist
        const patientAppointments = action.payload;
        // Entferne alte Termine dieses Patienten und füge neue hinzu
        const patientIds = new Set(
          patientAppointments
            .map(apt => getPatientId(apt))
            .filter((id): id is string => id !== null)
        );
        state.appointments = [
          ...state.appointments.filter(apt => {
            const pid = getPatientId(apt);
            return pid === null || !patientIds.has(pid);
          }),
          ...patientAppointments
        ];
      })
      .addCase(fetchAppointmentsByPatientId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setLoading } = appointmentSlice.actions;
export default appointmentSlice.reducer;