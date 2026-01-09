import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

export interface Icd10Code {
  _id: string;
  code: string;
  title: string;
  longTitle?: string;
  chapter?: string;
  synonyms?: string[];
  language: string;
  validFrom: string;
  validTo?: string;
  releaseYear: number;
  isBillable: boolean;
  parentCode?: string;
  searchText?: string;
  isActive: boolean;
  sortOrder: number;
  level?: number;
  chapterName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Icd10SearchParams {
  q?: string;
  year?: number;
  billableOnly?: boolean;
  chapters?: string[];
  limit?: number;
  offset?: number;
}

export interface Icd10TopCode {
  _id: string;
  code: string;
  title: string;
  longTitle?: string;
  display?: string;
  chapter?: string;
  synonyms?: string[];
  isBillable?: boolean;
  count: number;
  lastUsed: string;
  averageUsagePerMonth: number;
}

export interface Icd10Analytics {
  totalCodes: number;
  totalUsage: number;
  averageUsage: number;
  mostUsedCode?: string;
  mostUsedCount: number;
}

export interface Icd10HierarchyChapter {
  _id: string;
  codes: Icd10Code[];
}

export interface Icd10BreadcrumbItem {
  code: string;
  title: string;
  level: number;
}

interface Icd10State {
  searchResults: Icd10Code[];
  topCodes: Icd10TopCode[];
  recentCodes: Icd10TopCode[];
  currentCode: Icd10Code | null;
  chapters: Array<{ _id: string; count: number }>;
  analytics: Icd10Analytics | null;
  hierarchy: Icd10HierarchyChapter[];
  children: Icd10Code[];
  parent: Icd10Code | null;
  siblings: Icd10Code[];
  related: Icd10Code[];
  breadcrumb: Icd10BreadcrumbItem[];
  loading: boolean;
  error: string | null;
  searchParams: Icd10SearchParams;
}

const initialState: Icd10State = {
  searchResults: [],
  topCodes: [],
  recentCodes: [],
  currentCode: null,
  chapters: [],
  analytics: null,
  hierarchy: [],
  children: [],
  parent: null,
  siblings: [],
  related: [],
  breadcrumb: [],
  loading: false,
  error: null,
  searchParams: {
    q: '',
    year: new Date().getFullYear(),
    billableOnly: false,
    chapters: [],
    limit: 20,
    offset: 0
  }
};

// Async thunks
export const searchIcd10Codes = createAsyncThunk(
  'icd10/search',
  async (params: Icd10SearchParams, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      if (params.q) queryParams.append('q', params.q);
      if (params.year) queryParams.append('year', params.year.toString());
      if (params.billableOnly) queryParams.append('billableOnly', 'true');
      if (params.chapters?.length) queryParams.append('chapters', params.chapters.join(','));
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const response = await axios.get(`${API_BASE_URL}/icd10/search?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler bei der ICD-10 Suche');
    }
  }
);

export const getTopIcd10Codes = createAsyncThunk(
  'icd10/getTop',
  async (params: { scope?: string; scopeId?: string; year?: number; limit?: number; timeRange?: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const queryParams = new URLSearchParams();
      
      if (params.scope) queryParams.append('scope', params.scope);
      if (params.scopeId) queryParams.append('scopeId', params.scopeId);
      if (params.year) queryParams.append('year', params.year.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);

      const response = await axios.get(`${API_BASE_URL}/icd10/top?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der häufigsten Codes');
    }
  }
);

export const getRecentIcd10Codes = createAsyncThunk(
  'icd10/getRecent',
  async (params: { scope?: string; scopeId?: string; year?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const queryParams = new URLSearchParams();
      
      if (params.scope) queryParams.append('scope', params.scope);
      if (params.scopeId) queryParams.append('scopeId', params.scopeId);
      if (params.year) queryParams.append('year', params.year.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const response = await axios.get(`${API_BASE_URL}/icd10/recent?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der kürzlich verwendeten Codes');
    }
  }
);

export const getIcd10Code = createAsyncThunk(
  'icd10/getCode',
  async (params: { code: string; year?: number }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const queryParams = new URLSearchParams();
      
      if (params.year) queryParams.append('year', params.year.toString());

      const response = await axios.get(`${API_BASE_URL}/icd10/code/${params.code}?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden des ICD-10 Codes');
    }
  }
);

export const getIcd10Chapters = createAsyncThunk(
  'icd10/getChapters',
  async (year: number = new Date().getFullYear(), { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const queryParams = new URLSearchParams();
      
      if (year) queryParams.append('year', year.toString());

      const response = await axios.get(`${API_BASE_URL}/icd10/chapters?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Kapitel');
    }
  }
);

export const updateIcd10Usage = createAsyncThunk(
  'icd10/updateUsage',
  async (params: { code: string; catalogYear: number; context?: string; scope?: string; scopeId?: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const queryParams = new URLSearchParams();
      
      if (params.scope) queryParams.append('scope', params.scope);
      if (params.scopeId) queryParams.append('scopeId', params.scopeId);

      const response = await axios.post(`${API_BASE_URL}/icd10/usage?${queryParams.toString()}`, {
        code: params.code,
        catalogYear: params.catalogYear,
        context: params.context
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Aktualisieren der Nutzungsstatistik');
    }
  }
);

export const getIcd10Analytics = createAsyncThunk(
  'icd10/getAnalytics',
  async (params: { scope?: string; scopeId?: string; year?: number; timeRange?: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const queryParams = new URLSearchParams();
      
      if (params.scope) queryParams.append('scope', params.scope);
      if (params.scopeId) queryParams.append('scopeId', params.scopeId);
      if (params.year) queryParams.append('year', params.year.toString());
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);

      const response = await axios.get(`${API_BASE_URL}/icd10/analytics?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Analysen');
    }
  }
);

// Hierarchie-Thunks
export const getIcd10Hierarchy = createAsyncThunk(
  'icd10/getHierarchy',
  async (year: number = new Date().getFullYear(), { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const response = await axios.get(`${API_BASE_URL}/icd10/hierarchy?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Hierarchie');
    }
  }
);

export const getIcd10Children = createAsyncThunk(
  'icd10/getChildren',
  async (params: { parentCode: string; year?: number }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const { parentCode, year = new Date().getFullYear() } = params;
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const response = await axios.get(`${API_BASE_URL}/icd10/children/${parentCode}?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Child-Codes');
    }
  }
);

export const getIcd10Parent = createAsyncThunk(
  'icd10/getParent',
  async (params: { code: string; year?: number }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const { code, year = new Date().getFullYear() } = params;
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const response = await axios.get(`${API_BASE_URL}/icd10/parent/${code}?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden des Parent-Codes');
    }
  }
);

export const getIcd10Siblings = createAsyncThunk(
  'icd10/getSiblings',
  async (params: { code: string; year?: number }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const { code, year = new Date().getFullYear() } = params;
      const response = await axios.get(`http://localhost:5001/api/icd10/siblings/${code}?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Sibling-Codes');
    }
  }
);

export const getIcd10Related = createAsyncThunk(
  'icd10/getRelated',
  async (params: { code: string; year?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const { code, year = new Date().getFullYear(), limit = 10 } = params;
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const response = await axios.get(`${API_BASE_URL}/icd10/related/${code}?year=${year}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der verwandten Codes');
    }
  }
);

export const getIcd10Breadcrumb = createAsyncThunk(
  'icd10/getBreadcrumb',
  async (params: { code: string; year?: number }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const { code, year = new Date().getFullYear() } = params;
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const response = await axios.get(`${API_BASE_URL}/icd10/breadcrumb/${code}?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Breadcrumb-Navigation');
    }
  }
);

const icd10Slice = createSlice({
  name: 'icd10',
  initialState,
  reducers: {
    setSearchParams: (state, action: PayloadAction<Partial<Icd10SearchParams>>) => {
      state.searchParams = { ...state.searchParams, ...action.payload };
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    clearCurrentCode: (state) => {
      state.currentCode = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetIcd10State: (state) => {
      return { ...initialState };
    }
  },
  extraReducers: (builder) => {
    builder
      // Search ICD-10 Codes
      .addCase(searchIcd10Codes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchIcd10Codes.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload || [];
        state.error = null;
      })
      .addCase(searchIcd10Codes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get Top Codes
      .addCase(getTopIcd10Codes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTopIcd10Codes.fulfilled, (state, action) => {
        state.loading = false;
        state.topCodes = action.payload || [];
        state.error = null;
      })
      .addCase(getTopIcd10Codes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get Recent Codes
      .addCase(getRecentIcd10Codes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRecentIcd10Codes.fulfilled, (state, action) => {
        state.loading = false;
        state.recentCodes = action.payload || [];
        state.error = null;
      })
      .addCase(getRecentIcd10Codes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get Single Code
      .addCase(getIcd10Code.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getIcd10Code.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCode = action.payload.data;
        state.error = null;
      })
      .addCase(getIcd10Code.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get Chapters
      .addCase(getIcd10Chapters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getIcd10Chapters.fulfilled, (state, action) => {
        state.loading = false;
        state.chapters = action.payload.data || [];
        state.error = null;
      })
      .addCase(getIcd10Chapters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Usage
      .addCase(updateIcd10Usage.fulfilled, (state) => {
        // Usage update successful, no state change needed
      })
      .addCase(updateIcd10Usage.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Get Analytics
      .addCase(getIcd10Analytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getIcd10Analytics.fulfilled, (state, action) => {
        state.loading = false;
        state.analytics = action.payload.data;
        state.error = null;
      })
      .addCase(getIcd10Analytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get Hierarchy
      .addCase(getIcd10Hierarchy.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getIcd10Hierarchy.fulfilled, (state, action) => {
        state.loading = false;
        state.hierarchy = action.payload.data || [];
        state.error = null;
      })
      .addCase(getIcd10Hierarchy.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get Children
      .addCase(getIcd10Children.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getIcd10Children.fulfilled, (state, action) => {
        state.loading = false;
        state.children = action.payload.data || [];
        state.error = null;
      })
      .addCase(getIcd10Children.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get Parent
      .addCase(getIcd10Parent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getIcd10Parent.fulfilled, (state, action) => {
        state.loading = false;
        state.parent = action.payload.data;
        state.error = null;
      })
      .addCase(getIcd10Parent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get Siblings
      .addCase(getIcd10Siblings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getIcd10Siblings.fulfilled, (state, action) => {
        state.loading = false;
        state.siblings = action.payload.data || [];
        state.error = null;
      })
      .addCase(getIcd10Siblings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get Related
      .addCase(getIcd10Related.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getIcd10Related.fulfilled, (state, action) => {
        state.loading = false;
        state.related = action.payload.data || [];
        state.error = null;
      })
      .addCase(getIcd10Related.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get Breadcrumb
      .addCase(getIcd10Breadcrumb.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getIcd10Breadcrumb.fulfilled, (state, action) => {
        state.loading = false;
        state.breadcrumb = action.payload.data || [];
        state.error = null;
      })
      .addCase(getIcd10Breadcrumb.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { 
  setSearchParams, 
  clearSearchResults, 
  clearCurrentCode, 
  clearError, 
  resetIcd10State 
} = icd10Slice.actions;

export default icd10Slice.reducer;
