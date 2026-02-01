import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { getApiBaseUrl } from '../../utils/api';

export interface PatientMedication {
  _id: string;
  patientId: string;
  encounterId?: string;
  medicationId?: string;
  name: string;
  atcCode?: string;
  strength?: string;
  strengthUnit?: string;
  form?: string;
  dosage: string;
  frequency: string;
  duration?: string;
  startDate: string;
  endDate?: string;
  source: 'clinical' | 'elga' | 'import' | 'prescription' | 'dekurs' | 'anamnestic';
  prescribedBy?: string;
  prescribedAt?: string;
  status: 'active' | 'completed' | 'discontinued' | 'suspended';
  discontinuedReason?: string;
  discontinuedBy?: string;
  discontinuedAt?: string;
  prescriptionId?: string;
  prescriptionStatus?: 'draft' | 'sent' | 'dispensed' | 'expired';
  prescriptionQRCode?: string;
  elgaId?: string;
  elgaSynced?: boolean;
  elgaSyncedAt?: string;
  instructions?: string;
  notes?: string;
  indication?: string;
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
}

export interface CreateMedicationData {
  patientId: string;
  encounterId?: string;
  medicationId?: string;
  name: string;
  atcCode?: string;
  strength?: string;
  strengthUnit?: string;
  form?: string;
  dosage: string;
  frequency: string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  source?: 'clinical' | 'elga' | 'import' | 'prescription' | 'dekurs' | 'anamnestic';
  instructions?: string;
  notes?: string;
  indication?: string;
}

export interface UpdateMedicationData {
  medicationId?: string;
  name?: string;
  atcCode?: string;
  strength?: string;
  strengthUnit?: string;
  form?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  status?: 'active' | 'completed' | 'discontinued' | 'suspended';
  instructions?: string;
  notes?: string;
  indication?: string;
}

export interface MedicationInteraction {
  medication1: {
    atcCode: string;
    name: string;
  };
  medication2: {
    atcCode: string;
    name: string;
  };
  medication1Id?: string;
  medication2Id?: string;
  severity: 'major' | 'moderate' | 'minor';
  description: string;
  source: string;
}

interface MedicationState {
  medications: PatientMedication[];
  patientMedications: PatientMedication[];
  encounterMedications: PatientMedication[];
  activeMedications: PatientMedication[];
  selectedMedication: PatientMedication | null;
  loading: boolean;
  error: string | null;
  elgaMedications: any[];
  prescriptions: PatientMedication[];
  interactions: MedicationInteraction[];
  interactionCheckLoading: boolean;
  dosageValidation: {
    valid: boolean;
    warnings: Array<{ severity: string; message: string }>;
    errors: Array<{ severity: string; message: string }>;
    age?: number;
    bsa?: number;
  } | null;
  dosageValidationLoading: boolean;
  syncResult: {
    created: PatientMedication[];
    updated: PatientMedication[];
    conflicts: Array<{
      local: PatientMedication;
      elga: any;
      differences: any;
    }>;
    skipped: PatientMedication[];
  } | null;
  filters: {
    patientId?: string;
    encounterId?: string;
    status?: string;
  };
}

const initialState: MedicationState = {
  medications: [],
  patientMedications: [],
  encounterMedications: [],
  activeMedications: [],
  selectedMedication: null,
  loading: false,
  error: null,
  elgaMedications: [],
  prescriptions: [],
  interactions: [],
  interactionCheckLoading: false,
  dosageValidation: null,
  dosageValidationLoading: false,
  syncResult: null,
  filters: {}
};

// Async thunks
export const fetchPatientMedications = createAsyncThunk(
  'medication/fetchPatientMedications',
  async (params: { patientId: string; status?: string; encounterId?: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      if (params.status) queryParams.append('status', params.status);
      if (params.encounterId) queryParams.append('encounterId', params.encounterId);

      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.get(`${API_BASE_URL}/medications/patient/${params.patientId}?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Patient-Medikamente');
    }
  }
);

export const fetchActiveMedications = createAsyncThunk(
  'medication/fetchActiveMedications',
  async (patientId: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.get(`${API_BASE_URL}/medications/patient/${patientId}/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der aktiven Medikamente');
    }
  }
);

export const fetchEncounterMedications = createAsyncThunk(
  'medication/fetchEncounterMedications',
  async (encounterId: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.get(`${API_BASE_URL}/medications/encounter/${encounterId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Termin-Medikamente');
    }
  }
);

export const createMedication = createAsyncThunk(
  'medication/create',
  async (medicationData: CreateMedicationData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.post(`${API_BASE_URL}/medications`, medicationData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Erstellen des Medikaments');
    }
  }
);

export const updateMedication = createAsyncThunk(
  'medication/update',
  async ({ id, data }: { id: string; data: UpdateMedicationData }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.put(`${API_BASE_URL}/medications/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Aktualisieren des Medikaments');
    }
  }
);

export const deleteMedication = createAsyncThunk(
  'medication/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      await axios.delete(`${API_BASE_URL}/medications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Löschen des Medikaments');
    }
  }
);

export const discontinueMedication = createAsyncThunk(
  'medication/discontinue',
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.post(`${API_BASE_URL}/medications/${id}/discontinue`, { reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Absetzen des Medikaments');
    }
  }
);

export const reactivateMedication = createAsyncThunk(
  'medication/reactivate',
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.post(`${API_BASE_URL}/medications/${id}/reactivate`, { reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Reaktivieren des Medikaments');
    }
  }
);

// ELGA Synchronisation
export const syncMedicationsWithELGA = createAsyncThunk(
  'medication/syncWithELGA',
  async ({ patientId, strategy = 'merge' }: { patientId: string; strategy?: 'merge' | 'elga_only' | 'local_only' }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.post(`${API_BASE_URL}/elga/patient/${patientId}/medication/sync`, { strategy }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler bei der ELGA-Synchronisation');
    }
  }
);

export const fetchELGAMedications = createAsyncThunk(
  'medication/fetchELGA',
  async (patientId: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.get(`${API_BASE_URL}/elga/patient/${patientId}/medication`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Abrufen der e-Medikation');
    }
  }
);

export const resolveMedicationConflict = createAsyncThunk(
  'medication/resolveConflict',
  async ({ patientId, medicationId, resolution, elgaData }: { 
    patientId: string; 
    medicationId: string; 
    resolution: 'local' | 'elga' | 'merge'; 
    elgaData?: any 
  }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.post(`${API_BASE_URL}/elga/patient/${patientId}/medication/resolve-conflict`, {
        medicationId,
        resolution,
        elgaData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Lösen des Konflikts');
    }
  }
);

// e-Rezept Funktionen
export const createPrescription = createAsyncThunk(
  'medication/createPrescription',
  async ({ medicationId, patientId }: { medicationId: string; patientId: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.post(`${API_BASE_URL}/prescriptions/create`, {
        medicationId,
        patientId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler bei der e-Rezept-Erstellung');
    }
  }
);

export const sendPrescription = createAsyncThunk(
  'medication/sendPrescription',
  async (prescriptionId: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.post(`${API_BASE_URL}/prescriptions/${prescriptionId}/send`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Senden des e-Rezepts');
    }
  }
);

export const fetchPrescriptions = createAsyncThunk(
  'medication/fetchPrescriptions',
  async ({ patientId, status }: { patientId: string; status?: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const queryParams = status ? `?status=${status}` : '';
      const response = await axios.get(`${API_BASE_URL}/prescriptions/patient/${patientId}${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Abrufen der e-Rezepte');
    }
  }
);

export const checkPrescriptionStatus = createAsyncThunk(
  'medication/checkPrescriptionStatus',
  async (prescriptionId: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.post(`${API_BASE_URL}/prescriptions/${prescriptionId}/check-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler bei der Statusprüfung');
    }
  }
);

export const cancelPrescription = createAsyncThunk(
  'medication/cancelPrescription',
  async ({ prescriptionId, reason }: { prescriptionId: string; reason?: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.post(`${API_BASE_URL}/prescriptions/${prescriptionId}/cancel`, { reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler bei der Stornierung');
    }
  }
);

// Wechselwirkungsprüfung
export const checkMedicationInteractions = createAsyncThunk(
  'medication/checkInteractions',
  async (patientId: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.get(`${API_BASE_URL}/medications/patient/${patientId}/interactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler bei der Wechselwirkungsprüfung');
    }
  }
);

export const checkNewMedicationInteraction = createAsyncThunk(
  'medication/checkNewMedicationInteraction',
  async ({ patientId, atcCode, name }: { patientId: string; atcCode: string; name: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.post(`${API_BASE_URL}/medications/check-interaction`, {
        patientId,
        atcCode,
        name
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler bei der Wechselwirkungsprüfung');
    }
  }
);

// Dosierungsprüfung
export const validateMedicationDosage = createAsyncThunk(
  'medication/validateDosage',
  async ({ patientId, medication }: { patientId: string; medication: any }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = getApiBaseUrl();
      const response = await axios.post(`${API_BASE_URL}/medications/validate-dosage`, {
        patientId,
        medication
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler bei der Dosierungsprüfung');
    }
  }
);

const medicationSlice = createSlice({
  name: 'medication',
  initialState,
  reducers: {
    setSelectedMedication: (state, action: PayloadAction<PatientMedication | null>) => {
      state.selectedMedication = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<MedicationState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    clearPatientMedications: (state) => {
      state.patientMedications = [];
    },
    clearEncounterMedications: (state) => {
      state.encounterMedications = [];
    },
    resetMedicationState: (_state) => {
      return { ...initialState };
    },
    clearSyncResult: (state) => {
      state.syncResult = null;
    },
    clearELGAMedications: (state) => {
      state.elgaMedications = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Patient Medications
      .addCase(fetchPatientMedications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPatientMedications.fulfilled, (state, action) => {
        state.loading = false;
        const newMedications = action.payload.data || [];
        if (newMedications.length > 0 && newMedications[0].patientId) {
          const patientId = newMedications[0].patientId;
          // Entferne alle Medikamente für diesen Patienten
          state.patientMedications = state.patientMedications.filter(m => m.patientId !== patientId);
          // Entferne Duplikate aus newMedications basierend auf _id, bevor wir sie hinzufügen
          const seenIds = new Set<string>();
          const uniqueNewMedications = newMedications.filter((m: PatientMedication) => {
            if (seenIds.has(m._id)) {
              return false;
            }
            seenIds.add(m._id);
            return true;
          });
          state.patientMedications = [...state.patientMedications, ...uniqueNewMedications];
        } else {
          // Falls kein patientId vorhanden, einfach hinzufügen (sollte nicht passieren)
          state.patientMedications = [...state.patientMedications, ...newMedications];
        }
        state.error = null;
      })
      .addCase(fetchPatientMedications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Active Medications
      .addCase(fetchActiveMedications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveMedications.fulfilled, (state, action) => {
        state.loading = false;
        state.activeMedications = action.payload.data || [];
        state.error = null;
      })
      .addCase(fetchActiveMedications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Encounter Medications
      .addCase(fetchEncounterMedications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEncounterMedications.fulfilled, (state, action) => {
        state.loading = false;
        state.encounterMedications = action.payload.data || [];
        state.error = null;
      })
      .addCase(fetchEncounterMedications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Medication
      .addCase(createMedication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMedication.fulfilled, (state, action) => {
        state.loading = false;
        const newMedication = action.payload.data;
        state.patientMedications.unshift(newMedication);
        if (newMedication.status === 'active') {
          state.activeMedications.unshift(newMedication);
        }
        state.error = null;
      })
      .addCase(createMedication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Medication
      .addCase(updateMedication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMedication.fulfilled, (state, action) => {
        state.loading = false;
        const updatedMedication = action.payload.data;
        
        // Update in patient medications
        const patientIndex = state.patientMedications.findIndex(m => m._id === updatedMedication._id);
        if (patientIndex !== -1) {
          state.patientMedications[patientIndex] = updatedMedication;
        }
        
        // Update in encounter medications
        const encounterIndex = state.encounterMedications.findIndex(m => m._id === updatedMedication._id);
        if (encounterIndex !== -1) {
          state.encounterMedications[encounterIndex] = updatedMedication;
        }
        
        // Update in active medications
        const activeIndex = state.activeMedications.findIndex(m => m._id === updatedMedication._id);
        if (updatedMedication.status === 'active') {
          if (activeIndex === -1) {
            state.activeMedications.unshift(updatedMedication);
          } else {
            state.activeMedications[activeIndex] = updatedMedication;
          }
        } else {
          if (activeIndex !== -1) {
            state.activeMedications.splice(activeIndex, 1);
          }
        }
        
        // Update selected medication
        if (state.selectedMedication?._id === updatedMedication._id) {
          state.selectedMedication = updatedMedication;
        }
        
        state.error = null;
      })
      .addCase(updateMedication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete Medication
      .addCase(deleteMedication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMedication.fulfilled, (state, action) => {
        state.loading = false;
        const deletedId = action.payload;
        state.patientMedications = state.patientMedications.filter(m => m._id !== deletedId);
        state.encounterMedications = state.encounterMedications.filter(m => m._id !== deletedId);
        state.activeMedications = state.activeMedications.filter(m => m._id !== deletedId);
        if (state.selectedMedication?._id === deletedId) {
          state.selectedMedication = null;
        }
        state.error = null;
      })
      .addCase(deleteMedication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Discontinue Medication
      .addCase(discontinueMedication.fulfilled, (state, action) => {
        const updatedMedication = action.payload.data;
        const index = state.patientMedications.findIndex(m => m._id === updatedMedication._id);
        if (index !== -1) {
          state.patientMedications[index] = updatedMedication;
        }
        state.activeMedications = state.activeMedications.filter(m => m._id !== updatedMedication._id);
      })
      // Reactivate Medication
      .addCase(reactivateMedication.fulfilled, (state, action) => {
        const updatedMedication = action.payload.data;
        const index = state.patientMedications.findIndex(m => m._id === updatedMedication._id);
        if (index !== -1) {
          state.patientMedications[index] = updatedMedication;
        }
        if (updatedMedication.status === 'active') {
          state.activeMedications.unshift(updatedMedication);
        }
      })
      // Sync with ELGA
      .addCase(syncMedicationsWithELGA.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(syncMedicationsWithELGA.fulfilled, (state, action) => {
        state.loading = false;
        state.syncResult = action.payload.data.result;
        // Aktualisiere lokale Medikamente mit synchronisierten Daten
        if (action.payload.data.result.created) {
          state.patientMedications = [...action.payload.data.result.created, ...state.patientMedications];
        }
        if (action.payload.data.result.updated) {
          action.payload.data.result.updated.forEach((updated: PatientMedication) => {
            const index = state.patientMedications.findIndex(m => m._id === updated._id);
            if (index !== -1) {
              state.patientMedications[index] = updated;
            }
          });
        }
        state.error = null;
      })
      .addCase(syncMedicationsWithELGA.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch ELGA Medications
      .addCase(fetchELGAMedications.fulfilled, (state, action) => {
        state.elgaMedications = action.payload.data?.medications || action.payload.data || [];
      })
      // Resolve Conflict
      .addCase(resolveMedicationConflict.fulfilled, (state, action) => {
        const updatedMedication = action.payload.data;
        const index = state.patientMedications.findIndex(m => m._id === updatedMedication._id);
        if (index !== -1) {
          state.patientMedications[index] = updatedMedication;
        }
        // Entferne aus Konflikten
        if (state.syncResult) {
          state.syncResult.conflicts = state.syncResult.conflicts.filter(
            c => c.local._id !== updatedMedication._id
          );
        }
      })
      // Create Prescription
      .addCase(createPrescription.fulfilled, (state, action) => {
        const updatedMedication = action.payload.data.medication;
        
        // Aktualisiere in patientMedications - ersetze vorhandenes oder füge hinzu
        const index = state.patientMedications.findIndex(m => m._id === updatedMedication._id);
        if (index !== -1) {
          state.patientMedications[index] = updatedMedication;
        } else {
          // Nur hinzufügen, wenn es wirklich nicht existiert
          state.patientMedications.push(updatedMedication);
        }
        
        // Aktualisiere auch in activeMedications, falls vorhanden
        const activeIndex = state.activeMedications.findIndex(m => m._id === updatedMedication._id);
        if (activeIndex !== -1) {
          state.activeMedications[activeIndex] = updatedMedication;
        }
        
        // Aktualisiere in prescriptions
        const prescriptionIndex = state.prescriptions.findIndex(p => p._id === updatedMedication._id);
        if (prescriptionIndex !== -1) {
          state.prescriptions[prescriptionIndex] = updatedMedication;
        } else {
          state.prescriptions.unshift(updatedMedication);
        }
      })
      // Send Prescription
      .addCase(sendPrescription.fulfilled, (state, action) => {
        // Das Backend gibt das aktualisierte Medikament zurück
        const updatedMedication = action.payload.data?.medication;
        if (updatedMedication) {
          // Aktualisiere in patientMedications
          const index = state.patientMedications.findIndex(m => m._id === updatedMedication._id);
          if (index !== -1) {
            state.patientMedications[index] = updatedMedication;
          }
          
          // Aktualisiere auch in activeMedications
          const activeIndex = state.activeMedications.findIndex(m => m._id === updatedMedication._id);
          if (activeIndex !== -1) {
            state.activeMedications[activeIndex] = updatedMedication;
          }
          
          // Aktualisiere in prescriptions
          const prescriptionIndex = state.prescriptions.findIndex(p => p._id === updatedMedication._id);
          if (prescriptionIndex !== -1) {
            state.prescriptions[prescriptionIndex] = updatedMedication;
          }
        }
      })
      // Fetch Prescriptions
      .addCase(fetchPrescriptions.fulfilled, (state, action) => {
        state.prescriptions = action.payload.data || [];
      })
      // Check Prescription Status
      .addCase(checkPrescriptionStatus.fulfilled, (state, action) => {
        const responseData = action.payload.data;
        const updatedMedication = responseData?.medication;
        
        if (updatedMedication) {
          // Aktualisiere in patientMedications
          const index = state.patientMedications.findIndex(m => m._id === updatedMedication._id);
          if (index !== -1) {
            state.patientMedications[index] = updatedMedication;
          }
          
          // Aktualisiere auch in activeMedications
          const activeIndex = state.activeMedications.findIndex(m => m._id === updatedMedication._id);
          if (activeIndex !== -1) {
            state.activeMedications[activeIndex] = updatedMedication;
          }
          
          // Aktualisiere in prescriptions
          const prescriptionIndex = state.prescriptions.findIndex(p => p._id === updatedMedication._id);
          if (prescriptionIndex !== -1) {
            state.prescriptions[prescriptionIndex] = updatedMedication;
          }
        } else if (responseData?.prescriptionId) {
          // Fallback: Nur Status aktualisieren, falls kein vollständiges Medikament zurückgegeben wird
          const status = responseData.status;
          const prescription = state.prescriptions.find(p => p.prescriptionId === responseData.prescriptionId);
          if (prescription) {
            prescription.prescriptionStatus = status;
          }
          
          // Aktualisiere auch in patientMedications
          const medication = state.patientMedications.find(m => m.prescriptionId === responseData.prescriptionId);
          if (medication) {
            medication.prescriptionStatus = status;
          }
          
          // Aktualisiere auch in activeMedications
          const activeMedication = state.activeMedications.find(m => m.prescriptionId === responseData.prescriptionId);
          if (activeMedication) {
            activeMedication.prescriptionStatus = status;
          }
        }
      })
      // Cancel Prescription
      .addCase(cancelPrescription.fulfilled, (state, action) => {
        const updatedMedication = action.payload.data;
        const index = state.prescriptions.findIndex(p => p._id === updatedMedication._id);
        if (index !== -1) {
          state.prescriptions[index] = updatedMedication;
        }
      })
      // Check Medication Interactions
      .addCase(checkMedicationInteractions.pending, (state) => {
        state.interactionCheckLoading = true;
      })
      .addCase(checkMedicationInteractions.fulfilled, (state, action) => {
        state.interactionCheckLoading = false;
        state.interactions = action.payload.data?.interactions || [];
      })
      .addCase(checkMedicationInteractions.rejected, (state) => {
        state.interactionCheckLoading = false;
      })
      // Check New Medication Interaction
      .addCase(checkNewMedicationInteraction.pending, (state) => {
        state.interactionCheckLoading = true;
      })
      .addCase(checkNewMedicationInteraction.fulfilled, (state, action) => {
        state.interactionCheckLoading = false;
        // Neue Wechselwirkungen werden temporär gespeichert (für Dialog-Anzeige)
        state.interactions = action.payload.data?.interactions || [];
      })
      .addCase(checkNewMedicationInteraction.rejected, (state) => {
        state.interactionCheckLoading = false;
      })
      // Validate Dosage
      .addCase(validateMedicationDosage.pending, (state) => {
        state.dosageValidationLoading = true;
      })
      .addCase(validateMedicationDosage.fulfilled, (state, action) => {
        state.dosageValidationLoading = false;
        state.dosageValidation = action.payload.data || null;
      })
      .addCase(validateMedicationDosage.rejected, (state) => {
        state.dosageValidationLoading = false;
        state.dosageValidation = null;
      });
  }
});

export const {
  setSelectedMedication,
  setFilters,
  clearError,
  clearPatientMedications,
  clearEncounterMedications,
  resetMedicationState,
  clearSyncResult,
  clearELGAMedications
} = medicationSlice.actions;

export default medicationSlice.reducer;

