import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../utils/api';

export interface DekursAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: string;
  folderName?: string;
}

export interface LinkedDiagnosis {
  diagnosisId?: string;
  icd10Code?: string;
  display?: string;
  side?: 'left' | 'right' | 'bilateral' | '';
  isPrimary?: boolean;
  notes?: string;
  status?: 'active' | 'resolved' | 'provisional' | 'ruled-out';
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  onsetDate?: string;
  resolvedDate?: string;
  catalogYear?: number;
  source?: string;
}

export interface LinkedMedication {
  medicationId?: string;
  name: string;
  dosage?: string;
  dosageUnit?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  quantity?: number;
  quantityUnit?: string;
  route?: 'oral' | 'topical' | 'injection' | 'inhalation' | 'rectal' | 'vaginal' | 'other';
  changeType?: 'added' | 'modified' | 'discontinued' | 'unchanged';
  notes?: string;
}

export interface LinkedDocument {
  documentId?: string;
  documentType?: string;
  documentTitle?: string;
}

export interface DekursEntry {
  _id?: string;
  id?: string;
  patientId: string;
  encounterId?: string;
  entryDate: string;
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    title?: string;
  };
  clinicalObservations?: string;
  progressChecks?: string;
  findings?: string;
  medicationChanges?: string;
  treatmentDetails?: string;
  psychosocialFactors?: string;
  notes?: string;
  visitReason?: string;
  visitType?: 'appointment' | 'phone' | 'emergency' | 'follow-up' | 'other';
  imagingFindings?: string;
  laboratoryFindings?: string;
  linkedDiagnoses?: LinkedDiagnosis[];
  linkedMedications?: LinkedMedication[];
  linkedDocuments?: LinkedDocument[];
  linkedDicomStudies?: string[];
  linkedRadiologyReports?: string[];
  linkedLaborResults?: string[];
  attachments?: DekursAttachment[];
  status?: 'draft' | 'finalized';
  templateId?: string;
  templateName?: string;
  templateUsed?: {
    templateId?: string;
    templateName?: string;
    templateVersion?: number;
    insertedAt?: string;
    modified?: boolean;
    originalFields?: {
      visitReason?: string;
      clinicalObservations?: string;
      findings?: string;
      progressChecks?: string;
      treatmentDetails?: string;
      notes?: string;
      psychosocialFactors?: string;
    };
  };
  createdAt?: string;
  updatedAt?: string;
  finalizedAt?: string;
  finalizedBy?: string;
}

export interface DekursVorlage {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  category?: 'allgemein' | 'kardiologie' | 'pneumologie' | 'gastroenterologie' | 'neurologie' | 'orthopaedie' | 'dermatologie' | 'gynaekologie' | 'paediatrie' | 'notfall' | 'vorsorge' | 'sonstiges';
  template?: {
    clinicalObservations?: string;
    progressChecks?: string;
    findings?: string;
    medicationChanges?: string;
    treatmentDetails?: string;
    psychosocialFactors?: string;
    notes?: string;
    visitReason?: string;
    visitType?: 'appointment' | 'phone' | 'emergency' | 'follow-up' | 'other';
  };
  textBlocks?: Array<{
    label: string;
    text: string;
    category?: string;
  }>;
  suggestedDiagnoses?: Array<{
    icd10Code?: string;
    display?: string;
  }>;
  suggestedMedications?: Array<{
    medicationId?: string;
    name?: string;
  }>;
  isActive?: boolean;
  isPublic?: boolean;
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  usageCount?: number;
  lastUsedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DekursState {
  entries: DekursEntry[];
  selectedEntry: DekursEntry | null;
  vorlagen: DekursVorlage[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

const initialState: DekursState = {
  entries: [],
  selectedEntry: null,
  vorlagen: [],
  loading: false,
  error: null,
  pagination: {
    total: 0,
    limit: 50,
    skip: 0,
    hasMore: false
  }
};

// Async Thunks
export const fetchDekursEntries = createAsyncThunk(
  'dekurs/fetchEntries',
  async (params: { patientId: string; limit?: number; skip?: number; status?: string; startDate?: string; endDate?: string; search?: string }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.skip) queryParams.append('skip', params.skip.toString());
      if (params.status) queryParams.append('status', params.status);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.search) queryParams.append('search', params.search);

      const response: any = await api.get(`/dekurs/patient/${params.patientId}?${queryParams.toString()}`);
      return response.data || response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Dekurs-Einträge');
    }
  }
);

export const fetchDekursEntry = createAsyncThunk(
  'dekurs/fetchEntry',
  async (entryId: string, { rejectWithValue }) => {
    try {
      const response: any = await api.get(`/dekurs/${entryId}`);
      return response.data?.data || response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden des Dekurs-Eintrags');
    }
  }
);

export const createDekursEntry = createAsyncThunk(
  'dekurs/createEntry',
  async (entryData: Partial<DekursEntry>, { rejectWithValue }) => {
    try {
      const response: any = await api.post('/dekurs', entryData);
      return response.data?.data || response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Erstellen des Dekurs-Eintrags');
    }
  }
);

export const updateDekursEntry = createAsyncThunk(
  'dekurs/updateEntry',
  async ({ entryId, entryData }: { entryId: string; entryData: Partial<DekursEntry> }, { rejectWithValue }) => {
    try {
      const response: any = await api.put(`/dekurs/${entryId}`, entryData);
      return response.data?.data || response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Aktualisieren des Dekurs-Eintrags');
    }
  }
);

export const deleteDekursEntry = createAsyncThunk(
  'dekurs/deleteEntry',
  async (entryId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/dekurs/${entryId}`);
      return entryId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Löschen des Dekurs-Eintrags');
    }
  }
);

export const finalizeDekursEntry = createAsyncThunk(
  'dekurs/finalizeEntry',
  async (entryId: string, { rejectWithValue }) => {
    try {
      const response: any = await api.post(`/dekurs/${entryId}/finalize`);
      return response.data?.data || response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Finalisieren des Dekurs-Eintrags');
    }
  }
);

export const uploadDekursPhoto = createAsyncThunk(
  'dekurs/uploadPhoto',
  async ({ entryId, photoFile }: { entryId: string; photoFile: File }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_BASE_URL}/dekurs/${entryId}/attach-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Fehler beim Hochladen des Fotos');
      }
      // Gib entryId und attachment zurück
      return {
        entryId,
        attachment: result.data.attachment
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Hochladen des Fotos');
    }
  }
);

export const deleteDekursPhoto = createAsyncThunk(
  'dekurs/deletePhoto',
  async ({ entryId, attachmentIndex }: { entryId: string; attachmentIndex: number }, { rejectWithValue }) => {
    try {
      await api.delete(`/dekurs/${entryId}/attachment/${attachmentIndex}`);
      return { entryId, attachmentIndex };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Löschen des Fotos');
    }
  }
);

export const exportDekursForArztbrief = createAsyncThunk(
  'dekurs/exportForArztbrief',
  async (params: { patientId: string; startDate?: string; endDate?: string; finalizedOnly?: boolean }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.finalizedOnly !== undefined) queryParams.append('finalizedOnly', params.finalizedOnly.toString());

      const response: any = await api.get(`/dekurs/patient/${params.patientId}/export?${queryParams.toString()}`);
      return response.data?.data || response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Exportieren des Dekurs');
    }
  }
);

export const fetchDekursVorlagen = createAsyncThunk(
  'dekurs/fetchVorlagen',
  async (params: { category?: string; search?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.append('category', params.category);
      if (params?.search) queryParams.append('search', params.search);

      const response: any = await api.get(`/dekurs/vorlagen?${queryParams.toString()}`);
      return response.data?.data || response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Vorlagen');
    }
  }
);

export const createDekursVorlage = createAsyncThunk(
  'dekurs/createVorlage',
  async (vorlageData: Partial<DekursVorlage>, { rejectWithValue }) => {
    try {
      const response: any = await api.post('/dekurs/vorlagen', vorlageData);
      return response.data?.data || response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Erstellen der Vorlage');
    }
  }
);

export const updateDekursVorlage = createAsyncThunk(
  'dekurs/updateVorlage',
  async ({ vorlageId, vorlageData }: { vorlageId: string; vorlageData: Partial<DekursVorlage> }, { rejectWithValue }) => {
    try {
      const response: any = await api.put(`/dekurs/vorlagen/${vorlageId}`, vorlageData);
      return response.data?.data || response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Aktualisieren der Vorlage');
    }
  }
);

export const deleteDekursVorlage = createAsyncThunk(
  'dekurs/deleteVorlage',
  async (vorlageId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/dekurs/vorlagen/${vorlageId}`);
      return vorlageId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Löschen der Vorlage');
    }
  }
);

const dekursSlice = createSlice({
  name: 'dekurs',
  initialState,
  reducers: {
    setSelectedEntry: (state, action: PayloadAction<DekursEntry | null>) => {
      state.selectedEntry = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetDekursState: (state) => {
      state.entries = [];
      state.selectedEntry = null;
      state.loading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch Entries
    builder
      .addCase(fetchDekursEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDekursEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = action.payload.data || [];
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(fetchDekursEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Entry
    builder
      .addCase(fetchDekursEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDekursEntry.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedEntry = action.payload;
      })
      .addCase(fetchDekursEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Entry
    builder
      .addCase(createDekursEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDekursEntry.fulfilled, (state, action) => {
        state.loading = false;
        state.entries.unshift(action.payload);
        state.selectedEntry = action.payload;
      })
      .addCase(createDekursEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Entry
    builder
      .addCase(updateDekursEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDekursEntry.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.entries.findIndex(e => e._id === action.payload._id);
        if (index !== -1) {
          state.entries[index] = action.payload;
        }
        if (state.selectedEntry?._id === action.payload._id) {
          state.selectedEntry = action.payload;
        }
      })
      .addCase(updateDekursEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete Entry
    builder
      .addCase(deleteDekursEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDekursEntry.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = state.entries.filter(e => e._id !== action.payload);
        if (state.selectedEntry?._id === action.payload) {
          state.selectedEntry = null;
        }
      })
      .addCase(deleteDekursEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Finalize Entry
    builder
      .addCase(finalizeDekursEntry.fulfilled, (state, action) => {
        const index = state.entries.findIndex(e => e._id === action.payload._id);
        if (index !== -1) {
          state.entries[index] = action.payload;
        }
        if (state.selectedEntry?._id === action.payload._id) {
          state.selectedEntry = action.payload;
        }
      });

    // Upload Photo
    builder
      .addCase(uploadDekursPhoto.fulfilled, (state, action) => {
        const entryId = action.payload.entryId || state.selectedEntry?._id;
        const entry = state.entries.find(e => e._id === entryId);
        if (entry && action.payload.attachment) {
          if (!entry.attachments) entry.attachments = [];
          entry.attachments.push(action.payload.attachment);
        }
        if (state.selectedEntry?._id === entryId && action.payload.attachment) {
          if (!state.selectedEntry) return;
          if (!state.selectedEntry.attachments) state.selectedEntry.attachments = [];
          state.selectedEntry.attachments.push(action.payload.attachment);
        }
      });

    // Delete Photo
    builder
      .addCase(deleteDekursPhoto.fulfilled, (state, action) => {
        const entry = state.entries.find(e => e._id === action.payload.entryId);
        if (entry && entry.attachments) {
          entry.attachments.splice(action.payload.attachmentIndex, 1);
        }
        if (state.selectedEntry?._id === action.payload.entryId && state.selectedEntry.attachments) {
          state.selectedEntry.attachments.splice(action.payload.attachmentIndex, 1);
        }
      });

    // Fetch Vorlagen
    builder
      .addCase(fetchDekursVorlagen.fulfilled, (state, action) => {
        state.vorlagen = action.payload || [];
      });

    // Create Vorlage
    builder
      .addCase(createDekursVorlage.fulfilled, (state, action) => {
        state.vorlagen.push(action.payload);
      });

    // Update Vorlage
    builder
      .addCase(updateDekursVorlage.fulfilled, (state, action) => {
        const index = state.vorlagen.findIndex(v => v._id === action.payload._id);
        if (index !== -1) {
          state.vorlagen[index] = action.payload;
        }
      });

    // Delete Vorlage
    builder
      .addCase(deleteDekursVorlage.fulfilled, (state, action) => {
        state.vorlagen = state.vorlagen.filter(v => v._id !== action.payload);
      });
  }
});

export const { setSelectedEntry, clearError, resetDekursState } = dekursSlice.actions;
export default dekursSlice.reducer;

