import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import api from '../../utils/api';

// Axios interceptor for debugging - nur setzen wenn axios verfügbar ist
if (axios && axios.interceptors) {
  axios.interceptors.request.use(
    (config) => {
      console.log('Making request:', config.method?.toUpperCase(), config.url, config.data);
      return config;
    },
    (error) => {
      console.error('Request error:', error);
      return Promise.reject(error);
    }
  );

  axios.interceptors.response.use(
    (response) => {
      console.log('Response received:', response.status, response.data);
      return response;
    },
    (error) => {
      console.error('Response error:', error.response?.status, error.message);
      return Promise.reject(error);
    }
  );
}

// Types
interface User {
  _id?: string;
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions?: string[];
  profilePhoto?: { filename?: string; uploadedAt?: string };
  profile?: {
    preferences?: {
      calendarSettings?: {
        useStaffColumns?: boolean;
        selectedStaffForColumns?: string[];
        selectedStaff?: string;
        selectedLocation?: string;
        showOpeningHours?: boolean;
        showWorkingHours?: boolean;
        showBreaks?: boolean;
        viewMode?: 'day' | 'week' | 'month';
        currentDate?: string;
      };
    };
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  refreshToken: string;
  user: User;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  user: User;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', credentials);
      // The API returns data in response.data
      const data = response.data as LoginResponse;
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login fehlgeschlagen');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData);
      // The API returns data in response.data
      return response.data as RegisterResponse;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registrierung fehlgeschlagen');
    }
  }
);

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (process.env.NODE_ENV === 'development') {
        console.log('loadUser: Token found:', !!token);
      }
      if (!token) {
        throw new Error('Kein Token vorhanden');
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('loadUser: Making API call to /auth/me');
      }
      const response = await api.get('/auth/me');
      if (process.env.NODE_ENV === 'development') {
        console.log('loadUser: API response:', response);
      }
      
      // Handle both direct response and wrapped response
      let userData: User;
      
      // Type assertion to handle the response structure
      const responseData = response as any;
      
      if (responseData.data && responseData.data.user) {
        // Wrapped response: { data: { success: true, user: {...} } }
        userData = responseData.data.user;
      } else if (responseData.user) {
        // Direct response: { success: true, user: {...} }
        userData = responseData.user;
      } else {
        throw new Error('Ungültige API-Antwort: Keine Benutzerdaten gefunden');
      }
      
      return userData;
    } catch (error: any) {
      console.error('loadUser: Error loading user:', error);
      
      // Prüfe ob es ein Netzwerkfehler ist
      const isNetworkError = 
        error?.isNetworkError === true ||
        error?.isTimeout === true ||
        error?.name === 'AbortError' ||
        (error?.name === 'TypeError' && 
         (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.message?.includes('ERR_CONNECTION_RESET') ||
          error?.message?.includes('aborted') ||
          error?.message?.includes('Request-Timeout'))) ||
        (error?.originalError?.isNetworkError === true ||
         error?.originalError?.isTimeout === true ||
         (error?.originalError?.name === 'TypeError' &&
          (error?.originalError?.message?.includes('Failed to fetch') ||
           error?.originalError?.message?.includes('NetworkError') ||
           error?.originalError?.message?.includes('Request-Timeout'))));
      
      // Prüfe ob es ein echter Authentifizierungsfehler ist (401)
      const isAuthError = 
        error?.response?.status === 401 ||
        error?.message?.includes('Session expired') ||
        error?.message?.includes('Unauthorized') ||
        error?.message?.includes('Token expired');
      
      // Bei Netzwerkfehlern: NICHT abmelden, nur Fehler zurückgeben
      if (isNetworkError && !isAuthError) {
        console.warn('loadUser: Netzwerkfehler erkannt - Benutzer wird nicht abgemeldet:', error.message);
        return rejectWithValue('Netzwerkfehler: Verbindung zum Server konnte nicht hergestellt werden. Bitte versuchen Sie es erneut.');
      }
      
      // Bei echten Authentifizierungsfehlern: Abmelden
      if (isAuthError) {
        console.log('loadUser: Authentifizierungsfehler erkannt - Benutzer wird abgemeldet');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        return rejectWithValue(error.message || 'Session abgelaufen. Bitte melden Sie sich erneut an.');
      }
      
      // Bei anderen Fehlern: Auch nicht abmelden (könnte temporär sein)
      console.warn('loadUser: Unbekannter Fehler - Benutzer wird nicht abgemeldet:', error.message);
      return rejectWithValue(error.message || 'Benutzer konnte nicht geladen werden');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue: _rejectWithValue }) => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return true;
    } catch (error: any) {
      // Even if logout fails on server, clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return true;
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<{ token: string; refreshToken: string }>) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
    },
    setUserProfilePhoto: (state, action: PayloadAction<{ filename?: string; uploadedAt?: string }>) => {
      if (state.user) {
        state.user.profilePhoto = action.payload;
      }
    },
    updateCalendarSettings: (state, action: PayloadAction<{
      useStaffColumns?: boolean;
      selectedStaffForColumns?: string[];
      selectedStaff?: string;
      selectedLocation?: string;
      selectedLocations?: string[];
      showOpeningHours?: boolean;
      showWorkingHours?: boolean;
      showBreaks?: boolean;
      viewMode?: 'day' | 'week' | 'month';
      currentDate?: string;
    }>) => {
      if (state.user) {
        if (!state.user.profile) {
          state.user.profile = {};
        }
        if (!state.user.profile.preferences) {
          state.user.profile.preferences = {};
        }
        if (!state.user.profile.preferences.calendarSettings) {
          state.user.profile.preferences.calendarSettings = {};
        }
        state.user.profile.preferences.calendarSettings = {
          ...state.user.profile.preferences.calendarSettings,
          ...action.payload,
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        const payload = action.payload as LoginResponse;
        state.user = payload.user;
        state.token = payload.token;
        state.refreshToken = payload.refreshToken;
        state.error = null;
        // Update tokens in localStorage
        localStorage.setItem('token', payload.token);
        localStorage.setItem('refreshToken', payload.refreshToken);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.error = action.payload as string;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, _action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? null;
      })
      // Load User
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload as User;
        state.error = null;
        // Ensure token is in localStorage
        if (state.token) {
          localStorage.setItem('token', state.token);
        }
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.loading = false;
        
        // Prüfe ob es ein Netzwerkfehler ist
        const errorMessage = action.payload as string || '';
        const isNetworkError = 
          errorMessage.includes('Netzwerkfehler') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('ERR_CONNECTION_RESET') ||
          errorMessage.includes('Request-Timeout') ||
          errorMessage.includes('aborted');
        
        // Bei Netzwerkfehlern: Nicht abmelden, nur Fehler setzen
        if (isNetworkError) {
          console.warn('loadUser: Netzwerkfehler erkannt - Benutzer bleibt angemeldet');
          state.error = errorMessage;
          // Behalte den aktuellen Authentifizierungsstatus
          return;
        }
        
        // Bei echten Authentifizierungsfehlern: Abmelden
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.error = errorMessage;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.error = null;
      });
  },
});

export const { clearError, setCredentials, setUserProfilePhoto, updateCalendarSettings } = authSlice.actions;
export default authSlice.reducer;