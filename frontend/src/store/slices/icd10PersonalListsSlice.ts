import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

// Interfaces
export interface Icd10PersonalListCode {
  code: string;
  title: string;
  longTitle?: string;
  chapter?: string;
  isBillable: boolean;
  addedAt: string;
  addedBy: string;
  notes?: string;
  tags: string[];
  sortOrder: number;
}

export interface Icd10PersonalList {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  type: 'favorites' | 'custom' | 'workflow' | 'specialty';
  specialty?: string;
  isPublic: boolean;
  isDefault: boolean;
  codes: Icd10PersonalListCode[];
  settings: {
    autoSort: boolean;
    sortBy: 'code' | 'title' | 'addedAt' | 'custom';
    groupBy: 'none' | 'chapter' | 'billable' | 'tags';
    showNotes: boolean;
    showTags: boolean;
  };
  statistics: {
    totalCodes: number;
    lastUsed: string;
    usageCount: number;
    mostUsedCodes: Array<{
      code: string;
      count: number;
    }>;
  };
  sharing: {
    isShared: boolean;
    sharedWith: Array<{
      userId: string;
      permission: 'read' | 'write' | 'admin';
      addedAt: string;
    }>;
    shareToken?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Icd10PersonalListState {
  lists: Icd10PersonalList[];
  favorites: Icd10PersonalList | null;
  currentList: Icd10PersonalList | null;
  mostUsed: Array<{
    _id: string;
    count: number;
    title: string;
  }>;
  loading: boolean;
  error: string | null;
  searchResults: Icd10PersonalList[];
  searchLoading: boolean;
  searchError: string | null;
}

const initialState: Icd10PersonalListState = {
  lists: [],
  favorites: null,
  currentList: null,
  mostUsed: [],
  loading: false,
  error: null,
  searchResults: [],
  searchLoading: false,
  searchError: null
};

// Async Thunks
export const fetchPersonalLists = createAsyncThunk(
  'icd10PersonalLists/fetchPersonalLists',
  async (options: { type?: string; includeShared?: boolean } = {}, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (options.type) params.append('type', options.type);
      if (options.includeShared) params.append('includeShared', 'true');
      
      const response = await axios.get(
        `http://localhost:5001/api/icd10/personal-lists?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der persönlichen Listen');
    }
  }
);

export const fetchFavorites = createAsyncThunk(
  'icd10PersonalLists/fetchFavorites',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5001/api/icd10/personal-lists/favorites',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Favoriten');
    }
  }
);

export const createPersonalList = createAsyncThunk(
  'icd10PersonalLists/createPersonalList',
  async (listData: {
    name: string;
    description?: string;
    type?: 'custom' | 'workflow' | 'specialty';
    specialty?: string;
    isPublic?: boolean;
    settings?: any;
  }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5001/api/icd10/personal-lists',
        listData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Erstellen der Liste');
    }
  }
);

export const updatePersonalList = createAsyncThunk(
  'icd10PersonalLists/updatePersonalList',
  async ({ id, updates }: { id: string; updates: any }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5001/api/icd10/personal-lists/${id}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Aktualisieren der Liste');
    }
  }
);

export const deletePersonalList = createAsyncThunk(
  'icd10PersonalLists/deletePersonalList',
  async (id: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5001/api/icd10/personal-lists/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Löschen der Liste');
    }
  }
);

export const addCodeToList = createAsyncThunk(
  'icd10PersonalLists/addCodeToList',
  async ({ listId, codeData }: { listId: string; codeData: any }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5001/api/icd10/personal-lists/${listId}/codes`,
        codeData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Hinzufügen des Codes');
    }
  }
);

export const removeCodeFromList = createAsyncThunk(
  'icd10PersonalLists/removeCodeFromList',
  async ({ listId, code }: { listId: string; code: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `http://localhost:5001/api/icd10/personal-lists/${listId}/codes/${code}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Entfernen des Codes');
    }
  }
);

export const addToFavorites = createAsyncThunk(
  'icd10PersonalLists/addToFavorites',
  async (codeData: any, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5001/api/icd10/personal-lists/favorites/add',
        codeData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Hinzufügen zu Favoriten');
    }
  }
);

export const removeFromFavorites = createAsyncThunk(
  'icd10PersonalLists/removeFromFavorites',
  async (code: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `http://localhost:5001/api/icd10/personal-lists/favorites/${code}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Entfernen aus Favoriten');
    }
  }
);

export const fetchMostUsed = createAsyncThunk(
  'icd10PersonalLists/fetchMostUsed',
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5001/api/icd10/personal-lists/most-used?limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der meist verwendeten Codes');
    }
  }
);

export const searchPersonalLists = createAsyncThunk(
  'icd10PersonalLists/searchPersonalLists',
  async ({ query, types = 'favorites,custom', limit = 20 }: {
    query: string;
    types?: string;
    limit?: number;
  }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        q: query,
        types,
        limit: limit.toString()
      });
      
      const response = await axios.get(
        `http://localhost:5001/api/icd10/personal-lists/search?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler bei der Suche');
    }
  }
);

// Slice
const icd10PersonalListsSlice = createSlice({
  name: 'icd10PersonalLists',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.searchError = null;
    },
    setCurrentList: (state, action: PayloadAction<Icd10PersonalList | null>) => {
      state.currentList = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchLoading = false;
      state.searchError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Personal Lists
      .addCase(fetchPersonalLists.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPersonalLists.fulfilled, (state, action) => {
        state.loading = false;
        state.lists = action.payload.data || [];
        state.error = null;
      })
      .addCase(fetchPersonalLists.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch Favorites
      .addCase(fetchFavorites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFavorites.fulfilled, (state, action) => {
        state.loading = false;
        state.favorites = action.payload.data;
        state.error = null;
      })
      .addCase(fetchFavorites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create Personal List
      .addCase(createPersonalList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPersonalList.fulfilled, (state, action) => {
        state.loading = false;
        state.lists.push(action.payload.data);
        state.error = null;
      })
      .addCase(createPersonalList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update Personal List
      .addCase(updatePersonalList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePersonalList.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.lists.findIndex(list => list._id === action.payload.data._id);
        if (index !== -1) {
          state.lists[index] = action.payload.data;
        }
        if (state.currentList?._id === action.payload.data._id) {
          state.currentList = action.payload.data;
        }
        state.error = null;
      })
      .addCase(updatePersonalList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete Personal List
      .addCase(deletePersonalList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePersonalList.fulfilled, (state, action) => {
        state.loading = false;
        state.lists = state.lists.filter(list => list._id !== action.payload);
        if (state.currentList?._id === action.payload) {
          state.currentList = null;
        }
        state.error = null;
      })
      .addCase(deletePersonalList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Add Code to List
      .addCase(addCodeToList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCodeToList.fulfilled, (state, action) => {
        state.loading = false;
        const updatedList = action.payload.data;
        const index = state.lists.findIndex(list => list._id === updatedList._id);
        if (index !== -1) {
          state.lists[index] = updatedList;
        }
        if (state.currentList?._id === updatedList._id) {
          state.currentList = updatedList;
        }
        state.error = null;
      })
      .addCase(addCodeToList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Remove Code from List
      .addCase(removeCodeFromList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeCodeFromList.fulfilled, (state, action) => {
        state.loading = false;
        const updatedList = action.payload.data;
        const index = state.lists.findIndex(list => list._id === updatedList._id);
        if (index !== -1) {
          state.lists[index] = updatedList;
        }
        if (state.currentList?._id === updatedList._id) {
          state.currentList = updatedList;
        }
        state.error = null;
      })
      .addCase(removeCodeFromList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Add to Favorites
      .addCase(addToFavorites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToFavorites.fulfilled, (state, action) => {
        state.loading = false;
        state.favorites = action.payload.data;
        state.error = null;
      })
      .addCase(addToFavorites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Remove from Favorites
      .addCase(removeFromFavorites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeFromFavorites.fulfilled, (state, action) => {
        state.loading = false;
        state.favorites = action.payload.data;
        state.error = null;
      })
      .addCase(removeFromFavorites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch Most Used
      .addCase(fetchMostUsed.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMostUsed.fulfilled, (state, action) => {
        state.loading = false;
        state.mostUsed = action.payload.data || [];
        state.error = null;
      })
      .addCase(fetchMostUsed.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Search Personal Lists
      .addCase(searchPersonalLists.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchPersonalLists.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.data || [];
        state.searchError = null;
      })
      .addCase(searchPersonalLists.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload as string;
      });
  }
});

export const { clearError, setCurrentList, clearSearchResults } = icd10PersonalListsSlice.actions;
export default icd10PersonalListsSlice.reducer;
