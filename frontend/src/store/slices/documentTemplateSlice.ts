import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../utils/api';

export interface DocumentTemplate {
  _id: string;
  name: string;
  description?: string;
  category: string;
  content: string;
  placeholders: Array<{
    name: string;
    description: string;
    type: 'text' | 'date' | 'number' | 'boolean' | 'select';
    required: boolean;
    defaultValue?: string;
    options?: string[];
  }>;
  version: number;
  isActive: boolean;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  lastModifiedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  tags?: string[];
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  // NEU: Standalone-Dokument-Funktionalität
  isStandaloneDocument?: boolean;
  documentType?: string;
  defaultRecipientType?: 'patient' | 'doctor' | 'organization' | 'contact' | null;
  requiresRecipient?: boolean;
  letterheadTemplate?: 'template1' | 'template2' | 'template3' | 'custom' | null;
  medicalSpecialty?: string;
  approvalStatus?: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  approvedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  approvedAt?: string;
  rejectionReason?: string;
  versionHistory?: Array<{
    version: number;
    content: string;
    placeholders: any[];
    changedBy: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    changedAt: string;
    changeNotes?: string;
    approvalStatus: string;
  }>;
}

export interface DocumentRevision {
  _id: string;
  documentId: string;
  templateId: string;
  version: number;
  content: string;
  placeholders: any;
  action: 'created' | 'edited' | 'generated' | 'printed' | 'sent' | 'archived';
  performedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  performedAt: string;
  changes?: any;
  metadata?: any;
  auditTrail?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    previousVersion?: number;
  };
}

interface DocumentTemplateState {
  templates: DocumentTemplate[];
  standaloneTemplates: DocumentTemplate[];
  currentTemplate: DocumentTemplate | null;
  revisions: DocumentRevision[];
  categories: string[];
  medicalSpecialties: Array<{ value: string; label: string }>;
  loading: boolean;
  error: string | null;
  pagination: {
    current: number;
    pages: number;
    total: number;
  };
}

const initialState: DocumentTemplateState = {
  templates: [],
  standaloneTemplates: [],
  currentTemplate: null,
  revisions: [],
  categories: [],
  medicalSpecialties: [],
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pages: 0,
    total: 0
  }
};

// Async thunks
export const fetchDocumentTemplates = createAsyncThunk(
  'documentTemplates/fetchTemplates',
  async (params: { search?: string; category?: string; page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.category) queryParams.append('category', params.category);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const response = await api.get(`/document-templates?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching document templates:', error);
      return rejectWithValue(error.message || 'Fehler beim Laden der Dokumentvorlagen');
    }
  }
);

export const fetchDocumentTemplate = createAsyncThunk(
  'documentTemplates/fetchTemplate',
  async (id: string) => {
    const response = await api.get<{ success: boolean; template: any }>(`/document-templates/${id}`);
    return response.data.template;
  }
);

export const createDocumentTemplate = createAsyncThunk(
  'documentTemplates/createTemplate',
  async (templateData: Partial<DocumentTemplate>) => {
    const response = await api.post<{ success: boolean; template: any }>('/document-templates', templateData);
    return response.data.template;
  }
);

export const updateDocumentTemplate = createAsyncThunk(
  'documentTemplates/updateTemplate',
  async ({ id, templateData }: { id: string; templateData: Partial<DocumentTemplate> }) => {
    const response = await api.put<{ success: boolean; template: any }>(`/document-templates/${id}`, templateData);
    return response.data.template;
  }
);

export const deleteDocumentTemplate = createAsyncThunk(
  'documentTemplates/deleteTemplate',
  async (id: string) => {
    await api.delete(`/document-templates/${id}`);
    return id;
  }
);

export const fetchTemplateRevisions = createAsyncThunk(
  'documentTemplates/fetchRevisions',
  async (templateId: string) => {
    const response = await api.get<{ success: boolean; revisions: any[] }>(`/document-templates/${templateId}/revisions`);
    return response.data.revisions;
  }
);

export const fetchCategories = createAsyncThunk(
  'documentTemplates/fetchCategories',
  async () => {
    const response = await api.get<{ success: boolean; categories: string[] }>('/document-templates/categories');
    return response.data.categories;
  }
);

// NEU: Standalone-Dokument-Funktionalität
export const fetchStandaloneTemplates = createAsyncThunk(
  'documentTemplates/fetchStandaloneTemplates',
  async (filters: { medicalSpecialty?: string; documentType?: string; search?: string } = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.medicalSpecialty) queryParams.append('medicalSpecialty', filters.medicalSpecialty);
    if (filters.documentType) queryParams.append('documentType', filters.documentType);
    if (filters.search) queryParams.append('search', filters.search);

    const response = await api.get<{ success: boolean; templates: DocumentTemplate[] }>(
      `/document-templates/standalone/list?${queryParams.toString()}`
    );
    return response.data.templates;
  }
);

export const fetchStandaloneTemplate = createAsyncThunk(
  'documentTemplates/fetchStandaloneTemplate',
  async (id: string) => {
    const response = await api.get<{ success: boolean; template: DocumentTemplate }>(
      `/document-templates/standalone/${id}`
    );
    return response.data.template;
  }
);

export const createTemplateVersion = createAsyncThunk(
  'documentTemplates/createVersion',
  async ({ id, templateData, changeNotes }: { id: string; templateData?: Partial<DocumentTemplate>; changeNotes?: string }) => {
    const response = await api.post<{ success: boolean; template: DocumentTemplate }>(
      `/document-templates/${id}/versions`,
      { ...templateData, changeNotes }
    );
    return response.data.template;
  }
);

export const submitTemplateForApproval = createAsyncThunk(
  'documentTemplates/submitForApproval',
  async (id: string) => {
    const response = await api.post<{ success: boolean; template: DocumentTemplate }>(
      `/document-templates/${id}/submit-for-approval`
    );
    return response.data.template;
  }
);

export const approveTemplate = createAsyncThunk(
  'documentTemplates/approveTemplate',
  async ({ id, notes }: { id: string; notes?: string }) => {
    const response = await api.post<{ success: boolean; template: DocumentTemplate }>(
      `/document-templates/${id}/approve`,
      { notes }
    );
    return response.data.template;
  }
);

export const rejectTemplate = createAsyncThunk(
  'documentTemplates/rejectTemplate',
  async ({ id, reason }: { id: string; reason: string }) => {
    const response = await api.post<{ success: boolean; template: DocumentTemplate }>(
      `/document-templates/${id}/reject`,
      { reason }
    );
    return response.data.template;
  }
);

export const fetchMedicalSpecialties = createAsyncThunk(
  'documentTemplates/fetchMedicalSpecialties',
  async () => {
    const response = await api.get<{ success: boolean; specialties: Array<{ value: string; label: string }> }>(
      '/document-templates/medical-specialties/list'
    );
    return response.data.specialties;
  }
);

export const generatePDF = createAsyncThunk(
  'documentTemplates/generatePDF',
  async ({ templateId, placeholders, options }: { 
    templateId: string; 
    placeholders: any; 
    options?: any 
  }) => {
    const response = await api.post('/pdf/generate', {
      templateId,
      placeholders,
      options
    }, {
      responseType: 'blob'
    });
    return response;
  }
);

export const previewTemplate = createAsyncThunk(
  'documentTemplates/previewTemplate',
  async ({ templateId, placeholders }: { templateId: string; placeholders: any }) => {
    const response = await api.post<{ success: boolean; preview: any }>('/pdf/preview', {
      templateId,
      placeholders
    });
    return response.data.preview;
  }
);

const documentTemplateSlice = createSlice({
  name: 'documentTemplates',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTemplate: (state, action: PayloadAction<DocumentTemplate | null>) => {
      state.currentTemplate = action.payload;
    },
    clearTemplates: (state) => {
      state.templates = [];
      state.currentTemplate = null;
      state.revisions = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch templates
      .addCase(fetchDocumentTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocumentTemplates.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.templates = (action.payload as any).templates || [];
          state.pagination = (action.payload as any).pagination || state.pagination;
        }
      })
      .addCase(fetchDocumentTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Laden der Templates';
      })

      // Fetch single template
      .addCase(fetchDocumentTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocumentTemplate.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.currentTemplate = action.payload;
        }
      })
      .addCase(fetchDocumentTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Laden des Templates';
      })

      // Create template
      .addCase(createDocumentTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDocumentTemplate.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.templates.unshift(action.payload);
        }
      })
      .addCase(createDocumentTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Erstellen des Templates';
      })

      // Update template
      .addCase(updateDocumentTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDocumentTemplate.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const index = state.templates.findIndex(t => t._id === action.payload._id);
          if (index !== -1) {
            state.templates[index] = action.payload;
          }
          if (state.currentTemplate?._id === action.payload._id) {
            state.currentTemplate = action.payload;
          }
        }
      })
      .addCase(updateDocumentTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Aktualisieren des Templates';
      })

      // Delete template
      .addCase(deleteDocumentTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDocumentTemplate.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.templates = state.templates.filter(t => t._id !== action.payload);
          if (state.currentTemplate?._id === action.payload) {
            state.currentTemplate = null;
          }
        }
      })
      .addCase(deleteDocumentTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Löschen des Templates';
      })

      // Fetch revisions
      .addCase(fetchTemplateRevisions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTemplateRevisions.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.revisions = action.payload;
        }
      })
      .addCase(fetchTemplateRevisions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Laden der Versionshistorie';
      })

      // Fetch categories
      .addCase(fetchCategories.fulfilled, (state, action) => {
        if (action.payload) {
          state.categories = action.payload;
        }
      })

      // Fetch standalone templates
      .addCase(fetchStandaloneTemplates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStandaloneTemplates.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.standaloneTemplates = action.payload;
        }
      })
      .addCase(fetchStandaloneTemplates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Laden der Standalone-Vorlagen';
      })

      // Fetch standalone template
      .addCase(fetchStandaloneTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStandaloneTemplate.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.currentTemplate = action.payload;
        }
      })
      .addCase(fetchStandaloneTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Laden der Standalone-Vorlage';
      })

      // Create template version
      .addCase(createTemplateVersion.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.templates.findIndex(t => t._id === action.payload._id);
          if (index !== -1) {
            state.templates[index] = action.payload;
          }
          if (state.currentTemplate?._id === action.payload._id) {
            state.currentTemplate = action.payload;
          }
        }
      })

      // Submit for approval
      .addCase(submitTemplateForApproval.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.templates.findIndex(t => t._id === action.payload._id);
          if (index !== -1) {
            state.templates[index] = action.payload;
          }
          if (state.currentTemplate?._id === action.payload._id) {
            state.currentTemplate = action.payload;
          }
        }
      })

      // Approve template
      .addCase(approveTemplate.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.templates.findIndex(t => t._id === action.payload._id);
          if (index !== -1) {
            state.templates[index] = action.payload;
          }
          const standaloneIndex = state.standaloneTemplates.findIndex(t => t._id === action.payload._id);
          if (standaloneIndex !== -1) {
            state.standaloneTemplates[standaloneIndex] = action.payload;
          }
          if (state.currentTemplate?._id === action.payload._id) {
            state.currentTemplate = action.payload;
          }
        }
      })

      // Reject template
      .addCase(rejectTemplate.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.templates.findIndex(t => t._id === action.payload._id);
          if (index !== -1) {
            state.templates[index] = action.payload;
          }
          if (state.currentTemplate?._id === action.payload._id) {
            state.currentTemplate = action.payload;
          }
        }
      })

      // Fetch medical specialties
      .addCase(fetchMedicalSpecialties.fulfilled, (state, action) => {
        if (action.payload) {
          state.medicalSpecialties = action.payload;
        }
      })

      // Generate PDF
      .addCase(generatePDF.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generatePDF.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(generatePDF.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Generieren der PDF';
      })

      // Preview template
      .addCase(previewTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(previewTemplate.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(previewTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Generieren der Vorschau';
      });
  }
});

export const { clearError, setCurrentTemplate, clearTemplates } = documentTemplateSlice.actions;
export default documentTemplateSlice.reducer;
