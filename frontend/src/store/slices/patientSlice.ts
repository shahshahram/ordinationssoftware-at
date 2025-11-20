import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../utils/api';

export interface Patient {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email?: string;
  address: {
    street: string;
    city: string;
    zipCode?: string;
    postalCode?: string;
    country: string;
  };
  gender: string;
  // Alte Felder (für Kompatibilität)
  socialSecurityNumber?: string;
  // Neue Felder (für erweiterte Patienten)
  insuranceProvider?: string;
  bloodType?: string;
  status: string;
  medicalHistory?: string[];
  allergies?: Array<string | {
    type: string;
    description: string;
    severity: string;
    reaction?: string;
  }>;
  currentMedications?: Array<string | {
    name: string;
    dosage: string;
    frequency: string;
    startDate?: string;
    prescribedBy?: string;
  }>;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  notes?: string;
  // Medizinische Daten
  height?: number;
  weight?: number;
  bmi?: number;
  vaccinations?: Array<{
    name: string;
    date?: string;
    nextDue?: string;
  }>;
  medicalNotes?: string;
  // Schwangerschaft (nur für Frauen)
  isPregnant?: boolean;
  pregnancyWeek?: number;
  isBreastfeeding?: boolean;
  
  // Medizinische Implantate und Geräte
  hasPacemaker?: boolean;
  hasDefibrillator?: boolean;
  implants?: Array<{
    type: string;
    location?: string;
    date?: string;
    notes?: string;
  }>;
  
  // Raucherstatus
  smokingStatus?: 'non-smoker' | 'former-smoker' | 'current-smoker';
  cigarettesPerDay?: number;
  yearsOfSmoking?: number;
  quitSmokingDate?: string;
  
  // Zusätzliche medizinische Daten
  primaryCarePhysician?: {
    name: string;
    location: string;
    phone?: string;
  };
  preExistingConditions?: string[];
  referralSource?: 'self' | 'physician' | 'hospital' | 'specialist' | 'other';
  referralDoctor?: string;
  visitReason?: string;
  
  // Zusätzliche Felder vom Backend
  previousSurgeries?: string[];
  dataProtectionConsent?: boolean;
  electronicCommunicationConsent?: boolean;
  dataProtectionConsentDate?: string;
  electronicCommunicationConsentDate?: string;
  
  // Weitere medizinische Felder (bereits oben definiert, hier entfernt)
  
  lastCheckIn?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Hinweis-System
  hasHint?: boolean;
  hintText?: string;
  
  // Patientenfoto
  photo?: {
    filename?: string;
    originalName?: string;
    mimeType?: string;
    size?: number;
    path?: string;
    uploadedAt?: string;
  };
}

interface PatientState {
  patients: Patient[];
  selectedPatient: Patient | null;
  loading: boolean;
  error: string | null;
  pagination: {
    current: number;
    pages: number;
    total: number;
    hasMore: boolean;
    limit: number;
    nextPage: number | null;
  };
  searchTerm: string;
  filters: {
    status: string;
    gender: string;
  };
}

const initialState: PatientState = {
  patients: [],
  selectedPatient: null,
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pages: 1,
    total: 0,
    hasMore: false,
    limit: 100,
    nextPage: null,
  },
  searchTerm: '',
  filters: {
    status: 'all',
    gender: 'all',
  },
};

// Async thunks
export const fetchPatients = createAsyncThunk(
  'patients/fetchPatients',
  async (page: number = 1, { rejectWithValue }) => {
    try {
      const response = await api.get<{ success: boolean; data: Patient[]; pagination: any }>(`/patients-extended?page=${page}&limit=100`);
      return {
        patients: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Patienten');
    }
  }
);

export const loadMorePatients = createAsyncThunk(
  'patients/loadMorePatients',
  async (page: number, { rejectWithValue }) => {
    try {
      const response = await api.get<{ success: boolean; data: Patient[]; pagination: any }>(`/patients-extended?page=${page}&limit=100`);
      return {
        patients: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden weiterer Patienten');
    }
  }
);

export const createPatient = createAsyncThunk(
  'patients/createPatient',
  async (patientData: Partial<Patient>, { rejectWithValue }) => {
    try {
      const response = await api.post<{ success: boolean; data: Patient }>('/patients-extended', patientData);
      return response.data.data; // Return the created patient from the data property
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Fehler beim Erstellen des Patienten';
      return rejectWithValue(errorMessage);
    }
  }
);

export const updatePatient = createAsyncThunk(
  'patients/updatePatient',
  async ({ id, patientData }: { id: string; patientData: Partial<Patient> }, { rejectWithValue }) => {
    try {
      const response = await api.put<{ success: boolean; data: Patient }>(`/patients-extended/${id}`, patientData);
      return response.data.data; // Return the updated patient from the data property
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Fehler beim Aktualisieren des Patienten';
      return rejectWithValue(errorMessage);
    }
  }
);

export const deletePatient = createAsyncThunk(
  'patients/deletePatient',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/patients-extended/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Löschen des Patienten');
    }
  }
);

const patientSlice = createSlice({
  name: 'patients',
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setFilters: (state, action: PayloadAction<{ status?: string; gender?: string }>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSelectedPatient: (state, action: PayloadAction<Patient | null>) => {
      state.selectedPatient = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Patients
      .addCase(fetchPatients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPatients.fulfilled, (state, action) => {
        state.loading = false;
        state.patients = action.payload.patients;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchPatients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Load More Patients
      .addCase(loadMorePatients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadMorePatients.fulfilled, (state, action) => {
        state.loading = false;
        state.patients = [...state.patients, ...action.payload.patients];
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(loadMorePatients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Patient
      .addCase(createPatient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPatient.fulfilled, (state, action) => {
        state.loading = false;
        state.patients.push(action.payload as Patient);
        state.error = null;
      })
      .addCase(createPatient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Patient
      .addCase(updatePatient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePatient.fulfilled, (state, action) => {
        state.loading = false;
        const updatedPatient = action.payload as Patient;
        const index = state.patients.findIndex(patient => 
          (patient._id || patient.id) === (updatedPatient._id || updatedPatient.id)
        );
        if (index !== -1) {
          state.patients[index] = updatedPatient;
        }
        state.error = null;
      })
      .addCase(updatePatient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete Patient
      .addCase(deletePatient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePatient.fulfilled, (state, action) => {
        state.loading = false;
        state.patients = state.patients.filter(patient => 
          (patient._id || patient.id) !== action.payload
        );
        state.error = null;
      })
      .addCase(deletePatient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSearchTerm, setFilters, setSelectedPatient, clearError } = patientSlice.actions;
export default patientSlice.reducer;
