import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

// Dynamische API-URL basierend auf dem aktuellen Hostname
const getApiBaseUrl = (): string => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:5001/api`;
};

export interface PatientDiagnosis {
  _id: string;
  patientId: string;
  encounterId?: string;
  code: string;
  catalogYear: number;
  display: string;
  status: 'active' | 'resolved' | 'provisional' | 'ruled-out';
  onsetDate?: string;
  resolvedDate?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  side?: 'left' | 'right' | 'bilateral' | '';
  isPrimary: boolean;
  source: 'clinical' | 'billing' | 'elga' | 'import';
  notes?: string;
  linkedServices: Array<{
    serviceId: string;
    context: 'billing' | 'medical' | 'reporting';
    linkedAt: string;
  }>;
  exports: Array<{
    target: 'ELGA' | 'KASSE' | 'OTHER';
    status: 'pending' | 'queued' | 'sent' | 'error' | 'ack';
    payload?: any;
    errorMessage?: string;
    sentAt?: string;
    acknowledgedAt?: string;
  }>;
  auditTrail: Array<{
    action: string;
    user: string;
    timestamp: string;
    changes?: any;
    reason?: string;
  }>;
  createdBy: string;
  lastModifiedBy?: string;
  createdAt: string;
  updatedAt: string;
  statusGerman?: string;
  severityGerman?: string;
}

export interface CreateDiagnosisData {
  patientId: string;
  encounterId?: string;
  code: string;
  catalogYear: number;
  display?: string;
  status?: 'active' | 'resolved' | 'provisional' | 'ruled-out';
  onsetDate?: string;
  resolvedDate?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  side?: 'left' | 'right' | 'bilateral' | '';
  isPrimary?: boolean;
  source?: 'clinical' | 'billing' | 'elga' | 'import';
  notes?: string;
}

export interface UpdateDiagnosisData {
  status?: 'active' | 'resolved' | 'provisional' | 'ruled-out';
  onsetDate?: string;
  resolvedDate?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  side?: 'left' | 'right' | 'bilateral' | '';
  isPrimary?: boolean;
  notes?: string;
}

interface DiagnosisState {
  diagnoses: PatientDiagnosis[];
  patientDiagnoses: PatientDiagnosis[];
  encounterDiagnoses: PatientDiagnosis[];
  selectedDiagnosis: PatientDiagnosis | null;
  loading: boolean;
  error: string | null;
  filters: {
    patientId?: string;
    encounterId?: string;
    status?: string;
    isPrimary?: boolean;
  };
}

const initialState: DiagnosisState = {
  diagnoses: [],
  patientDiagnoses: [],
  encounterDiagnoses: [],
  selectedDiagnosis: null,
  loading: false,
  error: null,
  filters: {}
};

// Async thunks
export const fetchPatientDiagnoses = createAsyncThunk(
  'diagnosis/fetchPatientDiagnoses',
  async (params: { patientId: string; status?: string; encounterId?: string; isPrimary?: boolean }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      if (params.status) queryParams.append('status', params.status);
      if (params.encounterId) queryParams.append('encounterId', params.encounterId);
      if (params.isPrimary !== undefined) queryParams.append('isPrimary', params.isPrimary.toString());

      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.get(`${API_BASE_URL}/diagnoses/patient/${params.patientId}?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Patient-Diagnosen');
    }
  }
);

export const fetchEncounterDiagnoses = createAsyncThunk(
  'diagnosis/fetchEncounterDiagnoses',
  async (encounterId: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.get(`${API_BASE_URL}/diagnoses/encounter/${encounterId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Termin-Diagnosen');
    }
  }
);

export const createDiagnosis = createAsyncThunk(
  'diagnosis/create',
  async (diagnosisData: CreateDiagnosisData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.post(`${API_BASE_URL}/diagnoses`, diagnosisData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Erstellen der Diagnose');
    }
  }
);

export const updateDiagnosis = createAsyncThunk(
  'diagnosis/update',
  async ({ id, data }: { id: string; data: UpdateDiagnosisData }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.put(`${API_BASE_URL}/diagnoses/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Aktualisieren der Diagnose');
    }
  }
);

export const deleteDiagnosis = createAsyncThunk(
  'diagnosis/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      await axios.delete(`${API_BASE_URL}/diagnoses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Löschen der Diagnose');
    }
  }
);

export const linkDiagnosisToService = createAsyncThunk(
  'diagnosis/linkService',
  async ({ id, serviceId, context }: { id: string; serviceId: string; context: 'billing' | 'medical' | 'reporting' }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${getApiBaseUrl()}/diagnoses/${id}/link-service`, {
        serviceId,
        context
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Verknüpfen der Diagnose mit der Leistung');
    }
  }
);

export const prepareDiagnosisExport = createAsyncThunk(
  'diagnosis/prepareExport',
  async ({ id, target, payload }: { id: string; target: 'ELGA' | 'KASSE' | 'OTHER'; payload: any }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${getApiBaseUrl()}/diagnoses/${id}/export`, {
        target,
        payload
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Vorbereiten des Exports');
    }
  }
);

export const fetchDiagnosisExports = createAsyncThunk(
  'diagnosis/fetchExports',
  async (id: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${getApiBaseUrl()}/diagnoses/${id}/exports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Export-Informationen');
    }
  }
);

const diagnosisSlice = createSlice({
  name: 'diagnosis',
  initialState,
  reducers: {
    setSelectedDiagnosis: (state, action: PayloadAction<PatientDiagnosis | null>) => {
      state.selectedDiagnosis = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<DiagnosisState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    clearPatientDiagnoses: (state) => {
      state.patientDiagnoses = [];
    },
    clearEncounterDiagnoses: (state) => {
      state.encounterDiagnoses = [];
    },
    resetDiagnosisState: (state) => {
      return { ...initialState };
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Patient Diagnoses
      .addCase(fetchPatientDiagnoses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPatientDiagnoses.fulfilled, (state, action) => {
        state.loading = false;
        const newDiagnoses = action.payload.data || [];
        // Akkumuliere Diagnosen statt sie zu überschreiben
        // Entferne zuerst alte Diagnosen für denselben Patienten
        if (newDiagnoses.length > 0 && newDiagnoses[0].patientId) {
          const patientId = newDiagnoses[0].patientId;
          state.patientDiagnoses = state.patientDiagnoses.filter(d => d.patientId !== patientId);
        }
        // Füge neue Diagnosen hinzu
        state.patientDiagnoses = [...state.patientDiagnoses, ...newDiagnoses];
        state.error = null;
      })
      .addCase(fetchPatientDiagnoses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Encounter Diagnoses
      .addCase(fetchEncounterDiagnoses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEncounterDiagnoses.fulfilled, (state, action) => {
        state.loading = false;
        state.encounterDiagnoses = action.payload.data || [];
        state.error = null;
      })
      .addCase(fetchEncounterDiagnoses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Diagnosis
      .addCase(createDiagnosis.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDiagnosis.fulfilled, (state, action) => {
        state.loading = false;
        const newDiagnosis = action.payload.data;
        state.patientDiagnoses.unshift(newDiagnosis);
        if (newDiagnosis.encounterId) {
          state.encounterDiagnoses.unshift(newDiagnosis);
        }
        state.error = null;
      })
      .addCase(createDiagnosis.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Diagnosis
      .addCase(updateDiagnosis.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDiagnosis.fulfilled, (state, action) => {
        state.loading = false;
        const updatedDiagnosis = action.payload.data;
        
        // Update in patient diagnoses
        const patientIndex = state.patientDiagnoses.findIndex(d => d._id === updatedDiagnosis._id);
        if (patientIndex !== -1) {
          state.patientDiagnoses[patientIndex] = updatedDiagnosis;
        }
        
        // Update in encounter diagnoses
        const encounterIndex = state.encounterDiagnoses.findIndex(d => d._id === updatedDiagnosis._id);
        if (encounterIndex !== -1) {
          state.encounterDiagnoses[encounterIndex] = updatedDiagnosis;
        }
        
        // Update selected diagnosis
        if (state.selectedDiagnosis?._id === updatedDiagnosis._id) {
          state.selectedDiagnosis = updatedDiagnosis;
        }
        
        state.error = null;
      })
      .addCase(updateDiagnosis.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete Diagnosis
      .addCase(deleteDiagnosis.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDiagnosis.fulfilled, (state, action) => {
        state.loading = false;
        const deletedId = action.payload;
        
        // Remove from patient diagnoses
        state.patientDiagnoses = state.patientDiagnoses.filter(d => d._id !== deletedId);
        
        // Remove from encounter diagnoses
        state.encounterDiagnoses = state.encounterDiagnoses.filter(d => d._id !== deletedId);
        
        // Clear selected diagnosis if it was deleted
        if (state.selectedDiagnosis?._id === deletedId) {
          state.selectedDiagnosis = null;
        }
        
        state.error = null;
      })
      .addCase(deleteDiagnosis.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Link Service
      .addCase(linkDiagnosisToService.fulfilled, (state) => {
        // Service linked successfully, no state change needed
      })
      .addCase(linkDiagnosisToService.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Prepare Export
      .addCase(prepareDiagnosisExport.fulfilled, (state) => {
        // Export prepared successfully, no state change needed
      })
      .addCase(prepareDiagnosisExport.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Fetch Exports
      .addCase(fetchDiagnosisExports.fulfilled, (state, action) => {
        // Exports loaded, no state change needed
      })
      .addCase(fetchDiagnosisExports.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  }
});

export const { 
  setSelectedDiagnosis, 
  setFilters, 
  clearError, 
  clearPatientDiagnoses, 
  clearEncounterDiagnoses, 
  resetDiagnosisState 
} = diagnosisSlice.actions;

export default diagnosisSlice.reducer;
