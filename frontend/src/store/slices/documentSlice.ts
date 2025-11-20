import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import api from '../../utils/api';

export interface DocumentAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: string;
}

export interface Document {
  _id?: string;
  id?: string;
  title: string;
  type: 'rezept' | 'ueberweisung' | 'arztbrief' | 'befund' | 'formular' | 'rechnung' | 'sonstiges';
  category?: string;
  patient: {
    id: string;
    name: string;
    dateOfBirth: string;
    socialSecurityNumber?: string;
    insuranceProvider?: string;
  };
  doctor: {
    id: string;
    name: string;
    title?: string;
    specialization?: string;
  };
  content: {
    text: string;
    html?: string;
    template?: string;
    variables?: any;
  };
  medicalData?: {
    currentMedications?: Array<{
      name: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
      instructions?: string;
    }>;
    diagnosis?: string;
    icd10Code?: string;
    notes?: string;
  };
  referralData?: {
    specialist?: string;
    specialization?: string;
    reason?: string;
    urgency?: 'normal' | 'dringend' | 'notfall';
    appointment?: string;
  };
  findingData?: {
    examinationType?: string;
    results?: string;
    interpretation?: string;
    recommendations?: string;
    images?: string[];
  };
  status: 'draft' | 'ready' | 'sent' | 'received' | 'archived' | 'under_review' | 'released' | 'withdrawn';
  priority: 'niedrig' | 'normal' | 'hoch' | 'dringend';
  elgaData?: {
    isElgaCompatible: boolean;
    elgaId?: string;
    submissionDate?: string;
    status?: 'pending' | 'submitted' | 'approved' | 'rejected';
  };
  attachments: DocumentAttachment[];
  documentNumber: string;
  version: number; // Legacy
  // Versionierung (NEU)
  documentClass?: 'static_medical' | 'static_non_medical' | 'continuous_medical';
  isMedicalDocument?: boolean;
  isContinuousDocument?: boolean;
  currentVersion?: {
    versionNumber: string;
    versionId?: string;
    releasedAt?: string;
    releasedBy?: string;
  };
  isReleased?: boolean;
  releasedVersion?: string;
  versionHistory?: Array<{
    versionNumber: string;
    versionId?: string;
    status: string;
    createdAt: string;
    createdBy?: string;
  }>;
  isTemplate: boolean;
  templateCategory?: string;
  isConfidential: boolean;
  retentionPeriod: number;
  anonymizationDate?: string;
  createdAt?: string;
  updatedAt?: string;
}


interface DocumentState {
  documents: Document[];
  selectedDocument: Document | null;
  loading: boolean;
  error: string | null;
  statistics: {
    total: number;
    byType: Array<{ _id: string; count: number }>;
    byStatus: Array<{ _id: string; count: number }>;
  } | null;
  // Versionierung (NEU)
  versions: Record<string, any[]>; // documentId -> versions
  selectedVersion: any | null;
  versionComparison: any | null;
  auditTrail: Record<string, any[]>; // documentId -> auditTrail
}

const initialState: DocumentState = {
  documents: [],
  selectedDocument: null,
  loading: false,
  error: null,
  statistics: null,
  versions: {},
  selectedVersion: null,
  versionComparison: null,
  auditTrail: {},
};

// Async thunks
export const fetchDocuments = createAsyncThunk(
  'documents/fetchDocuments',
  async (params: any = {}, { rejectWithValue }) => {
    try {
      console.log('Fetching documents with params:', params);
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/documents?${queryParams}`);
      console.log('Documents response:', response);
      return response.data;
    } catch (error: any) {
      console.error('Fetch documents error:', error);
      return rejectWithValue(error.message || 'Fehler beim Laden der Dokumente');
    }
  }
);


export const createDocument = createAsyncThunk(
  'documents/createDocument',
  async (documentData: Partial<Document>, { rejectWithValue }) => {
    try {
      console.log('Creating document with data:', documentData);
      const response = await api.post('/documents', documentData);
      console.log('Document creation response:', response);
      return response.data;
    } catch (error: any) {
      console.error('Document creation error:', error);
      return rejectWithValue(error.message || 'Fehler beim Erstellen des Dokuments');
    }
  }
);

export const updateDocument = createAsyncThunk(
  'documents/updateDocument',
  async ({ id, documentData }: { id: string; documentData: Partial<Document> }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`http://localhost:5001/api/documents/${id}`, documentData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Aktualisieren des Dokuments');
    }
  }
);

export const deleteDocument = createAsyncThunk(
  'documents/deleteDocument',
  async (id: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5001/api/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Löschen des Dokuments');
    }
  }
);

export const uploadAttachment = createAsyncThunk(
  'documents/uploadAttachment',
  async ({ id, files }: { id: string; files: File[] }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      files.forEach(file => formData.append('attachments', file));
      
      const response = await axios.post(`http://localhost:5001/api/documents/${id}/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Hochladen der Anhänge');
    }
  }
);

export const fetchStatistics = createAsyncThunk(
  'documents/fetchStatistics',
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams(params).toString();
      const response = await axios.get(`http://localhost:5001/api/documents/statistics?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Statistiken');
    }
  }
);

// Versionierungs-Funktionen (NEU)
export const fetchDocumentVersions = createAsyncThunk(
  'documents/fetchDocumentVersions',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const response: any = await api.get(`/documents/${documentId}/versions`);
      return { documentId, versions: response.data?.data || [] };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Versionen');
    }
  }
);

export const getDocumentVersion = createAsyncThunk(
  'documents/getDocumentVersion',
  async ({ documentId, versionNumber }: { documentId: string; versionNumber: string }, { rejectWithValue }) => {
    try {
      const response: any = await api.get(`/documents/${documentId}/versions/${versionNumber}`);
      return response.data?.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Version');
    }
  }
);

export const compareVersions = createAsyncThunk(
  'documents/compareVersions',
  async ({ documentId, version1, version2 }: { documentId: string; version1: string; version2: string }, { rejectWithValue }) => {
    try {
      const response: any = await api.get(`/documents/${documentId}/comparison/${version1}/${version2}`);
      return response.data?.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Vergleichen der Versionen');
    }
  }
);

export const createNewVersion = createAsyncThunk(
  'documents/createNewVersion',
  async ({ documentId, updates, changeReason }: { documentId: string; updates: any; changeReason?: string }, { rejectWithValue }) => {
    try {
      const response: any = await api.post(`/documents/${documentId}/new-version`, { ...updates, changeReason });
      return response.data?.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Fehler beim Erstellen der neuen Version');
    }
  }
);

export const submitForReview = createAsyncThunk(
  'documents/submitForReview',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const response: any = await api.post(`/documents/${documentId}/submit-review`);
      return response.data?.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Fehler beim Einreichen zur Prüfung');
    }
  }
);

export const releaseDocument = createAsyncThunk(
  'documents/releaseDocument',
  async ({ documentId, comment }: { documentId: string; comment?: string }, { rejectWithValue }) => {
    try {
      const response: any = await api.post(`/documents/${documentId}/release`, { comment });
      return response.data?.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Fehler beim Freigeben des Dokuments');
    }
  }
);

export const withdrawDocument = createAsyncThunk(
  'documents/withdrawDocument',
  async ({ documentId, reason }: { documentId: string; reason: string }, { rejectWithValue }) => {
    try {
      const response: any = await api.post(`/documents/${documentId}/withdraw`, { reason });
      return response.data?.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Fehler beim Zurückziehen des Dokuments');
    }
  }
);

export const fetchAuditTrail = createAsyncThunk(
  'documents/fetchAuditTrail',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const response: any = await api.get(`/documents/${documentId}/audit-trail`);
      return { documentId, auditTrail: response.data?.data || [] };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden des Audit Trails');
    }
  }
);

const documentSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setSelectedDocument: (state, action: PayloadAction<Document | null>) => {
      state.selectedDocument = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Documents
      .addCase(fetchDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        // Handle API response structure: {success: true, data: [...]}
        const response = action.payload as any;
        console.log('DocumentSlice: fetchDocuments.fulfilled response:', response);
        state.documents = response.data || response || [];
        console.log('DocumentSlice: Updated state.documents:', state.documents);
        state.error = null;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Document
      .addCase(createDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDocument.fulfilled, (state, action) => {
        state.loading = false;
        // Ensure documents is an array before using unshift
        if (!Array.isArray(state.documents)) {
          state.documents = [];
        }
        // Handle API response structure: {success: true, data: {...}}
        const response = action.payload as any;
        console.log('DocumentSlice: createDocument.fulfilled response:', response);
        const newDocument = response.data || response;
        console.log('DocumentSlice: Adding new document:', newDocument);
        state.documents.unshift(newDocument as Document);
        console.log('DocumentSlice: Updated state.documents after create:', state.documents);
        state.error = null;
      })
      .addCase(createDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Document
      .addCase(updateDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDocument.fulfilled, (state, action) => {
        state.loading = false;
        const updatedDoc = action.payload as unknown as Document;
        // Ensure documents is an array before using findIndex
        if (!Array.isArray(state.documents)) {
          state.documents = [];
        }
        const index = state.documents.findIndex(doc => doc._id === updatedDoc._id);
        if (index !== -1) {
          state.documents[index] = updatedDoc;
        }
        state.error = null;
      })
      .addCase(updateDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete Document
      .addCase(deleteDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.loading = false;
        // Ensure documents is an array before using filter
        if (!Array.isArray(state.documents)) {
          state.documents = [];
        }
        state.documents = state.documents.filter(doc => doc._id !== action.payload);
        state.error = null;
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Upload Attachment
      .addCase(uploadAttachment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadAttachment.fulfilled, (state, action) => {
        state.loading = false;
        if (state.selectedDocument) {
          state.selectedDocument.attachments.push(...(action.payload as unknown as DocumentAttachment[]));
        }
        state.error = null;
      })
      .addCase(uploadAttachment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Statistics
      .addCase(fetchStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = action.payload as unknown as any;
        state.error = null;
      })
      .addCase(fetchStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Document Versions
      .addCase(fetchDocumentVersions.fulfilled, (state, action) => {
        state.versions[action.payload.documentId] = action.payload.versions;
      })
      // Get Document Version
      .addCase(getDocumentVersion.fulfilled, (state, action) => {
        state.selectedVersion = action.payload;
      })
      // Compare Versions
      .addCase(compareVersions.fulfilled, (state, action) => {
        state.versionComparison = action.payload;
      })
      // Create New Version
      .addCase(createNewVersion.fulfilled, (state, action) => {
        const updatedDoc = action.payload as unknown as Document;
        const index = state.documents.findIndex(doc => doc._id === updatedDoc._id);
        if (index !== -1) {
          state.documents[index] = updatedDoc;
        }
        if (state.selectedDocument?._id === updatedDoc._id) {
          state.selectedDocument = updatedDoc;
        }
      })
      // Submit For Review
      .addCase(submitForReview.fulfilled, (state, action) => {
        const updatedDoc = action.payload as unknown as Document;
        const index = state.documents.findIndex(doc => doc._id === updatedDoc._id);
        if (index !== -1) {
          state.documents[index] = updatedDoc;
        }
        if (state.selectedDocument?._id === updatedDoc._id) {
          state.selectedDocument = updatedDoc;
        }
      })
      // Release Document
      .addCase(releaseDocument.fulfilled, (state, action) => {
        const updatedDoc = action.payload as unknown as Document;
        const index = state.documents.findIndex(doc => doc._id === updatedDoc._id);
        if (index !== -1) {
          state.documents[index] = updatedDoc;
        }
        if (state.selectedDocument?._id === updatedDoc._id) {
          state.selectedDocument = updatedDoc;
        }
      })
      // Withdraw Document
      .addCase(withdrawDocument.fulfilled, (state, action) => {
        const updatedDoc = action.payload as unknown as Document;
        const index = state.documents.findIndex(doc => doc._id === updatedDoc._id);
        if (index !== -1) {
          state.documents[index] = updatedDoc;
        }
        if (state.selectedDocument?._id === updatedDoc._id) {
          state.selectedDocument = updatedDoc;
        }
      })
      // Fetch Audit Trail
      .addCase(fetchAuditTrail.fulfilled, (state, action) => {
        state.auditTrail[action.payload.documentId] = action.payload.auditTrail;
      });
  },
});

export const { setSelectedDocument, clearError } = documentSlice.actions;
export default documentSlice.reducer;
