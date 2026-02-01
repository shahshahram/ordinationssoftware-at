import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../utils/api';

export type NavigationMode = 'dropdown' | 'sidebar';

interface NavigationState {
  mode: NavigationMode;
  sidebarOpen: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: NavigationState = {
  mode: (localStorage.getItem('navigationMode') as NavigationMode) || 'dropdown',
  sidebarOpen: false,
  loading: false,
  error: null,
};

// Async thunk to update navigation mode
export const updateNavigationMode = createAsyncThunk(
  'navigation/updateMode',
  async (mode: NavigationMode, { rejectWithValue }) => {
    try {
      const _response = await api.put('/auth/profile', {
        profile: {
          preferences: {
            navigationMode: mode,
          },
        },
      });
      
      // Update localStorage
      localStorage.setItem('navigationMode', mode);
      
      return mode;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Aktualisieren der Navigation');
    }
  }
);

// Async thunk to load navigation mode from user profile
export const loadNavigationMode = createAsyncThunk(
  'navigation/loadMode',
  async (_, { rejectWithValue: _rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me') as any;
      const user = response.data?.user || response.user;
      const mode = user?.profile?.preferences?.navigationMode || 'dropdown';
      
      // Update localStorage
      localStorage.setItem('navigationMode', mode);
      
      return mode as NavigationMode;
    } catch (error: any) {
      // Fallback to localStorage if API fails
      const storedMode = localStorage.getItem('navigationMode') as NavigationMode;
      return storedMode || 'dropdown';
    }
  }
);

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setNavigationMode: (state, action: PayloadAction<NavigationMode>) => {
      state.mode = action.payload;
      localStorage.setItem('navigationMode', action.payload);
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    resetNavigation: (state) => {
      state.mode = 'dropdown';
      state.sidebarOpen = false;
      state.error = null;
      localStorage.setItem('navigationMode', 'dropdown');
    },
  },
  extraReducers: (builder) => {
    builder
      // Update navigation mode
      .addCase(updateNavigationMode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateNavigationMode.fulfilled, (state, action) => {
        state.loading = false;
        state.mode = action.payload;
        state.error = null;
      })
      .addCase(updateNavigationMode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Load navigation mode
      .addCase(loadNavigationMode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadNavigationMode.fulfilled, (state, action) => {
        state.loading = false;
        state.mode = action.payload;
        state.error = null;
      })
      .addCase(loadNavigationMode.rejected, (state) => {
        state.loading = false;
        // Keep current mode from localStorage
      });
  },
});

export const { setNavigationMode, setSidebarOpen, resetNavigation } = navigationSlice.actions;
export default navigationSlice.reducer;
