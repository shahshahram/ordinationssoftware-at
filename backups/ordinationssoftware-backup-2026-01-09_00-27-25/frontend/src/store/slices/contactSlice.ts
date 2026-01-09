import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../utils/api';

export interface Contact {
  _id?: string;
  id?: string;
  type: 'patient' | 'external';
  patientId?: string | {
    _id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
  };
  firstName: string;
  lastName: string;
  title?: string;
  profession?: string;
  organization?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  categories?: string[];
  notes?: string;
  createdBy?: string | {
    _id: string;
    firstName: string;
    lastName: string;
  };
  lastModifiedBy?: string | {
    _id: string;
    firstName: string;
    lastName: string;
  };
  isActive?: boolean;
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ContactState {
  contacts: Contact[];
  selectedContact: Contact | null;
  loading: boolean;
  error: string | null;
  pagination: {
    current: number;
    pages: number;
    total: number;
    hasMore: boolean;
    limit: number;
  };
  searchTerm: string;
  filters: {
    type: string; // 'all', 'patient', 'external'
    category: string;
    isFavorite: string; // 'all', 'true', 'false'
    isActive: string; // 'all', 'true', 'false'
  };
  categories: string[];
  patients: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
    dateOfBirth?: string;
  }>;
}

const initialState: ContactState = {
  contacts: [],
  selectedContact: null,
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pages: 1,
    total: 0,
    hasMore: false,
    limit: 50,
  },
  searchTerm: '',
  filters: {
    type: 'all',
    category: '',
    isFavorite: 'all',
    isActive: 'true',
  },
  categories: [],
  patients: [],
};

// Async thunks
export const fetchContacts = createAsyncThunk(
  'contacts/fetchContacts',
  async (page: number = 1, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { contacts: ContactState };
      const { searchTerm, filters } = state.contacts;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(searchTerm && { search: searchTerm }),
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.category && { category: filters.category }),
        ...(filters.isFavorite !== 'all' && { isFavorite: filters.isFavorite }),
        ...(filters.isActive !== 'all' && { isActive: filters.isActive }),
      });

      const response = await api.get<{ success: boolean; data: Contact[]; pagination: any }>(
        `/contacts?${params.toString()}`
      );
      return {
        contacts: response.data.data,
        pagination: response.data.pagination,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Kontakte');
    }
  }
);

export const loadMoreContacts = createAsyncThunk(
  'contacts/loadMoreContacts',
  async (page: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { contacts: ContactState };
      const { searchTerm, filters } = state.contacts;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(searchTerm && { search: searchTerm }),
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.category && { category: filters.category }),
        ...(filters.isFavorite !== 'all' && { isFavorite: filters.isFavorite }),
        ...(filters.isActive !== 'all' && { isActive: filters.isActive }),
      });

      const response = await api.get<{ success: boolean; data: Contact[]; pagination: any }>(
        `/contacts?${params.toString()}`
      );
      return {
        contacts: response.data.data,
        pagination: response.data.pagination,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden weiterer Kontakte');
    }
  }
);

export const fetchContact = createAsyncThunk(
  'contacts/fetchContact',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get<{ success: boolean; data: Contact }>(`/contacts/${id}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden des Kontakts');
    }
  }
);

export const createContact = createAsyncThunk(
  'contacts/createContact',
  async (contactData: Partial<Contact>, { rejectWithValue }) => {
    try {
      const response = await api.post<{ success: boolean; data: Contact }>('/contacts', contactData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.response?.data?.error || 'Fehler beim Erstellen des Kontakts'
      );
    }
  }
);

export const updateContact = createAsyncThunk(
  'contacts/updateContact',
  async ({ id, data }: { id: string; data: Partial<Contact> }, { rejectWithValue }) => {
    try {
      const response = await api.put<{ success: boolean; data: Contact }>(`/contacts/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.response?.data?.error || 'Fehler beim Aktualisieren des Kontakts'
      );
    }
  }
);

export const deleteContact = createAsyncThunk(
  'contacts/deleteContact',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/contacts/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Löschen des Kontakts');
    }
  }
);

export const fetchPatientsList = createAsyncThunk(
  'contacts/fetchPatientsList',
  async (search: string = '', { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }
      const response = await api.get<{ success: boolean; data: any[] }>(
        `/contacts/patients/list?${params.toString()}`
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Patientenliste');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'contacts/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<{ success: boolean; data: string[] }>('/contacts/categories/list');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Kategorien');
    }
  }
);

export const importPatients = createAsyncThunk(
  'contacts/importPatients',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post<{ success: boolean; data: any }>('/contacts/import-patients');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Importieren der Patienten');
    }
  }
);

const contactSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<ContactState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSelectedContact: (state, action: PayloadAction<Contact | null>) => {
      state.selectedContact = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetFilters: (state) => {
      state.filters = {
        type: 'all',
        category: '',
        isFavorite: 'all',
        isActive: 'true',
      };
      state.searchTerm = '';
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Contacts
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = action.payload.contacts;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Load More Contacts
      .addCase(loadMoreContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadMoreContacts.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = [...state.contacts, ...action.payload.contacts];
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(loadMoreContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Contact
      .addCase(fetchContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContact.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedContact = action.payload;
        state.error = null;
      })
      .addCase(fetchContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Contact
      .addCase(createContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createContact.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts.unshift(action.payload);
        state.error = null;
      })
      .addCase(createContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Contact
      .addCase(updateContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateContact.fulfilled, (state, action) => {
        state.loading = false;
        const updatedContact = action.payload;
        const index = state.contacts.findIndex(
          (contact) => (contact._id || contact.id) === (updatedContact._id || updatedContact.id)
        );
        if (index !== -1) {
          state.contacts[index] = updatedContact;
        }
        if (state.selectedContact && (state.selectedContact._id || state.selectedContact.id) === (updatedContact._id || updatedContact.id)) {
          state.selectedContact = updatedContact;
        }
        state.error = null;
      })
      .addCase(updateContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete Contact
      .addCase(deleteContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = state.contacts.filter(
          (contact) => (contact._id || contact.id) !== action.payload
        );
        if (state.selectedContact && (state.selectedContact._id || state.selectedContact.id) === action.payload) {
          state.selectedContact = null;
        }
        state.error = null;
      })
      .addCase(deleteContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Patients List
      .addCase(fetchPatientsList.fulfilled, (state, action) => {
        state.patients = action.payload;
      })
      // Fetch Categories
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      // Import Patients
      .addCase(importPatients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(importPatients.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(importPatients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSearchTerm, setFilters, setSelectedContact, clearError, resetFilters } =
  contactSlice.actions;
export default contactSlice.reducer;

