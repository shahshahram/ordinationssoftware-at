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
  currentTemplate: DocumentTemplate | null;
  revisions: DocumentRevision[];
  categories: string[];
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
  currentTemplate: null,
  revisions: [],
  categories: [],
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
