import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiRequest } from '../../utils/api';

// Interfaces
export interface XdsRegistryConfig {
  enabled: boolean;
  registryUrl?: string;
  repositoryLocation?: string;
  repositoryUniqueId?: string;
  homeCommunityId?: string;
  permissions?: {
    create?: { roles: string[] };
    update?: { roles: string[] };
    deprecate?: { roles: string[] };
    delete?: { roles: string[] };
    retrieve?: { roles: string[] };
    query?: { roles: string[] };
  };
  allowPatientUpload?: boolean;
  patientUploadMaxSize?: number;
  patientUploadAllowedTypes?: string[];
}

export interface LocationBillingConfig {
  defaultBillingType?: 'kassenarzt' | 'wahlarzt' | 'privat' | 'sonderklasse' | null;
  kassenarzt?: {
    enabled: boolean;
    ogkContractNumber?: string;
    autoSubmitOGK?: boolean;
    elgaEnabled?: boolean;
    kimEnabled?: boolean;
  };
  wahlarzt?: {
    enabled: boolean;
    defaultReimbursementRate?: number;
    autoCalculateReimbursement?: boolean;
  };
  privat?: {
    enabled: boolean;
    defaultTariff?: 'GOÄ' | 'custom';
  };
}

export interface Location {
  _id: string;
  name: string;
  code?: string;
  address_line1: string;
  address_line2?: string;
  postal_code: string;
  city: string;
  state?: string;
  timezone: string;
  phone?: string;
  email?: string;
  color_hex: string;
  is_active: boolean;
  practiceType?: 'kassenpraxis' | 'wahlarzt' | 'privat' | 'gemischt';
  billing?: LocationBillingConfig;
  xdsRegistry?: XdsRegistryConfig;
  createdAt: string;
  updatedAt: string;
}

export interface LocationHours {
  _id: string;
  location_id: string;
  rrule: string;
  timezone: string;
  label?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationClosure {
  _id: string;
  location_id: string;
  starts_at: string;
  ends_at: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffLocationAssignment {
  _id: string;
  staff_id: string | {
    _id: string;
    display_name: string;
    email: string;
    role: string;
    userId?: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      color_hex: string;
    };
  };
  location_id: string | {
    _id: string;
    name: string;
    code: string;
    city: string;
  };
  is_primary: boolean;
  allowed_services: (string | {
    _id: string;
    name: string;
    code: string;
  })[];
  createdAt: string;
  updatedAt: string;
}

interface LocationState {
  locations: Location[];
  locationHours: LocationHours[];
  locationClosures: LocationClosure[];
  staffAssignments: StaffLocationAssignment[];
  currentLocation: Location | null;
  availableLocations: Location[];
  hasNoAssignment: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: LocationState = {
  locations: [],
  locationHours: [],
  locationClosures: [],
  staffAssignments: [],
  currentLocation: null,
  availableLocations: [],
  hasNoAssignment: false,
  loading: false,
  error: null,
};

// Async Thunks
export const fetchLocations = createAsyncThunk<Location[], void>(
  'locations/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest.get<{ success: boolean; data: Location[]; pagination: any }>('/locations');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Standorte');
    }
  }
);

export const createLocation = createAsyncThunk<Location, Omit<Location, '_id' | 'createdAt' | 'updatedAt'>>(
  'locations/createLocation',
  async (locationData, { rejectWithValue }) => {
    try {
      const response = await apiRequest.post<{ success: boolean; data: Location }>('/locations', locationData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Erstellen des Standorts');
    }
  }
);

export const updateLocation = createAsyncThunk<Location, { id: string; locationData: Partial<Location> }>(
  'locations/updateLocation',
  async ({ id, locationData }, { rejectWithValue }) => {
    try {
      const response = await apiRequest.put<{ success: boolean; data: Location }>(`/locations/${id}`, locationData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Aktualisieren des Standorts');
    }
  }
);

export const deleteLocation = createAsyncThunk<string, string>(
  'locations/deleteLocation',
  async (id, { rejectWithValue }) => {
    try {
      await apiRequest.delete(`/locations/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Löschen des Standorts');
    }
  }
);

export const fetchLocationHours = createAsyncThunk<LocationHours[], void>(
  'locations/fetchLocationHours',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest.get<{ success: boolean; data: LocationHours[] }>('/locations/hours');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Öffnungszeiten');
    }
  }
);

export const createLocationHours = createAsyncThunk<LocationHours, { locationId: string; hoursData: Omit<LocationHours, '_id' | 'createdAt' | 'updatedAt'> }>(
  'locations/createLocationHours',
  async ({ locationId, hoursData }, { rejectWithValue }) => {
    try {
      const response = await apiRequest.post<{ success: boolean; data: LocationHours }>(`/locations/${locationId}/hours`, hoursData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Erstellen der Öffnungszeiten');
    }
  }
);

export const updateLocationHours = createAsyncThunk<LocationHours, { locationId: string; hoursId: string; hoursData: Omit<LocationHours, '_id' | 'createdAt' | 'updatedAt'> }>(
  'locations/updateLocationHours',
  async ({ locationId, hoursId, hoursData }, { rejectWithValue }) => {
    try {
      const response = await apiRequest.put<{ success: boolean; data: LocationHours }>(`/locations/${locationId}/hours/${hoursId}`, hoursData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Aktualisieren der Öffnungszeiten');
    }
  }
);

export const deleteLocationHours = createAsyncThunk<string, string>(
  'locations/deleteLocationHours',
  async (hoursId, { rejectWithValue }) => {
    try {
      await apiRequest.delete(`/locations/hours/${hoursId}`);
      return hoursId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Löschen der Öffnungszeiten');
    }
  }
);

export const fetchLocationClosures = createAsyncThunk<LocationClosure[], void>(
  'locations/fetchLocationClosures',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest.get<{ success: boolean; data: LocationClosure[] }>('/locations/closures');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Schließzeiten');
    }
  }
);

export const createLocationClosure = createAsyncThunk<LocationClosure, { locationId: string; closureData: Omit<LocationClosure, '_id' | 'createdAt' | 'updatedAt'> }>(
  'locations/createLocationClosure',
  async ({ locationId, closureData }, { rejectWithValue }) => {
    try {
      const response = await apiRequest.post<{ success: boolean; data: LocationClosure }>(`/locations/${locationId}/closures`, closureData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Erstellen der Schließzeit');
    }
  }
);

export const updateLocationClosure = createAsyncThunk<LocationClosure, { locationId: string; closureId: string; closureData: Omit<LocationClosure, '_id' | 'createdAt' | 'updatedAt'> }>(
  'locations/updateLocationClosure',
  async ({ locationId, closureId, closureData }, { rejectWithValue }) => {
    try {
      const response = await apiRequest.put<{ success: boolean; data: LocationClosure }>(`/locations/${locationId}/closures/${closureId}`, closureData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Aktualisieren der Schließzeit');
    }
  }
);

export const deleteLocationClosure = createAsyncThunk<string, string>(
  'locations/deleteLocationClosure',
  async (closureId, { rejectWithValue }) => {
    try {
      await apiRequest.delete(`/locations/closures/${closureId}`);
      return closureId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Löschen der Schließzeit');
    }
  }
);

export const fetchStaffLocationAssignments = createAsyncThunk<StaffLocationAssignment[], void>(
  'locations/fetchStaffLocationAssignments',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest.get<{ success: boolean; data: StaffLocationAssignment[] }>('/staff-location-assignments');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Standort-Zuweisungen');
    }
  }
);

export const createStaffLocationAssignment = createAsyncThunk<StaffLocationAssignment, Omit<StaffLocationAssignment, '_id' | 'createdAt' | 'updatedAt'>>(
  'locations/createStaffLocationAssignment',
  async (assignmentData, { rejectWithValue }) => {
    try {
      const response = await apiRequest.post<{ success: boolean; data: StaffLocationAssignment }>('/staff-location-assignments', assignmentData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Erstellen der Standort-Zuweisung');
    }
  }
);

export const updateStaffLocationAssignment = createAsyncThunk<StaffLocationAssignment, { id: string; assignmentData: Partial<StaffLocationAssignment> }>(
  'locations/updateStaffLocationAssignment',
  async ({ id, assignmentData }, { rejectWithValue }) => {
    try {
      const response = await apiRequest.put<{ success: boolean; data: StaffLocationAssignment }>(`/staff-location-assignments/${id}`, assignmentData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Aktualisieren der Standort-Zuweisung');
    }
  }
);

export const deleteStaffLocationAssignment = createAsyncThunk<string, string>(
  'locations/deleteStaffLocationAssignment',
  async (id, { rejectWithValue }) => {
    try {
      await apiRequest.delete(`/staff-location-assignments/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Löschen der Standort-Zuweisung');
    }
  }
);

// User-Standorte abrufen (für aktuell eingeloggten User)
export interface UserLocationsResponse {
  locations: Array<{
    _id: string;
    name: string;
    code?: string;
    city?: string;
    is_primary: boolean;
    allowed_services?: any[];
  }>;
  hasNoAssignment: boolean;
  primaryLocation: string | null;
}

export const fetchUserLocations = createAsyncThunk<UserLocationsResponse, void>(
  'locations/fetchUserLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest.get<{ success: boolean; data: UserLocationsResponse }>('/staff-location-assignments/user/me');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Laden der Benutzer-Standorte');
    }
  }
);

// Slice
const locationSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setCurrentLocation: (state, action: PayloadAction<Location | null>) => {
      state.currentLocation = action.payload;
      // Speichere in LocalStorage
      if (action.payload) {
        localStorage.setItem('currentLocationId', action.payload._id);
      } else {
        localStorage.removeItem('currentLocationId');
      }
    },
    setAvailableLocations: (state, action: PayloadAction<Location[]>) => {
      state.availableLocations = action.payload;
    },
    setHasNoAssignment: (state, action: PayloadAction<boolean>) => {
      state.hasNoAssignment = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Locations
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action: PayloadAction<Location[]>) => {
        state.loading = false;
        state.locations = action.payload;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Location
      .addCase(createLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLocation.fulfilled, (state, action: PayloadAction<Location>) => {
        state.loading = false;
        state.locations.push(action.payload);
      })
      .addCase(createLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Location
      .addCase(updateLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLocation.fulfilled, (state, action: PayloadAction<Location>) => {
        state.loading = false;
        const index = state.locations.findIndex(loc => loc._id === action.payload._id);
        if (index !== -1) {
          state.locations[index] = action.payload;
        }
      })
      .addCase(updateLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete Location
      .addCase(deleteLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteLocation.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.locations = state.locations.filter(loc => loc._id !== action.payload);
      })
      .addCase(deleteLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Location Hours
      .addCase(fetchLocationHours.fulfilled, (state, action: PayloadAction<LocationHours[]>) => {
        state.locationHours = action.payload;
      })
      // Create Location Hours
      .addCase(createLocationHours.fulfilled, (state, action: PayloadAction<LocationHours>) => {
        state.locationHours.push(action.payload);
      })
      // Update Location Hours
      .addCase(updateLocationHours.fulfilled, (state, action: PayloadAction<LocationHours>) => {
        const index = state.locationHours.findIndex(hours => hours._id === action.payload._id);
        if (index !== -1) {
          state.locationHours[index] = action.payload;
        }
      })
      // Delete Location Hours
      .addCase(deleteLocationHours.fulfilled, (state, action: PayloadAction<string>) => {
        state.locationHours = state.locationHours.filter(hours => hours._id !== action.payload);
      })
      // Fetch Location Closures
      .addCase(fetchLocationClosures.fulfilled, (state, action: PayloadAction<LocationClosure[]>) => {
        state.locationClosures = action.payload;
      })
      // Create Location Closure
      .addCase(createLocationClosure.fulfilled, (state, action: PayloadAction<LocationClosure>) => {
        state.locationClosures.push(action.payload);
      })
      // Update Location Closure
      .addCase(updateLocationClosure.fulfilled, (state, action: PayloadAction<LocationClosure>) => {
        const index = state.locationClosures.findIndex(closure => closure._id === action.payload._id);
        if (index !== -1) {
          state.locationClosures[index] = action.payload;
        }
      })
      // Delete Location Closure
      .addCase(deleteLocationClosure.fulfilled, (state, action: PayloadAction<string>) => {
        state.locationClosures = state.locationClosures.filter(closure => closure._id !== action.payload);
      })
      // Fetch Staff Location Assignments
      .addCase(fetchStaffLocationAssignments.fulfilled, (state, action: PayloadAction<StaffLocationAssignment[]>) => {
        state.staffAssignments = action.payload;
      })
      // Create Staff Location Assignment
      .addCase(createStaffLocationAssignment.fulfilled, (state, action: PayloadAction<StaffLocationAssignment>) => {
        state.staffAssignments.push(action.payload);
      })
      // Update Staff Location Assignment
      .addCase(updateStaffLocationAssignment.fulfilled, (state, action: PayloadAction<StaffLocationAssignment>) => {
        const index = state.staffAssignments.findIndex(assignment => assignment._id === action.payload._id);
        if (index !== -1) {
          state.staffAssignments[index] = action.payload;
        }
      })
      // Delete Staff Location Assignment
      .addCase(deleteStaffLocationAssignment.fulfilled, (state, action: PayloadAction<string>) => {
        state.staffAssignments = state.staffAssignments.filter(assignment => assignment._id !== action.payload);
      })
      // Fetch User Locations
      .addCase(fetchUserLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserLocations.fulfilled, (state, action: PayloadAction<UserLocationsResponse>) => {
        state.loading = false;
        state.hasNoAssignment = action.payload.hasNoAssignment;
        
        // Konvertiere die Standorte zu Location-Objekten
        const locationIds = action.payload.locations.map(loc => loc._id);
        const availableLocs = state.locations.filter(loc => locationIds.includes(loc._id));
        
        // Wenn keine Zuweisung, alle Standorte verfügbar
        if (action.payload.hasNoAssignment) {
          state.availableLocations = state.locations;
        } else {
          state.availableLocations = availableLocs;
        }
        
        // Setze aktuellen Standort
        const savedLocationId = localStorage.getItem('currentLocationId');
        let locationToSet: Location | null = null;
        
        if (savedLocationId && state.availableLocations.find(loc => loc._id === savedLocationId)) {
          // Verwende gespeicherten Standort, falls verfügbar
          locationToSet = state.availableLocations.find(loc => loc._id === savedLocationId) || null;
        } else if (action.payload.primaryLocation) {
          // Verwende Primary Location
          locationToSet = state.availableLocations.find(loc => loc._id === action.payload.primaryLocation) || null;
        } else if (state.availableLocations.length > 0) {
          // Verwende ersten verfügbaren Standort
          locationToSet = state.availableLocations[0];
        }
        
        state.currentLocation = locationToSet;
        if (locationToSet) {
          localStorage.setItem('currentLocationId', locationToSet._id);
        }
      })
      .addCase(fetchUserLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setLoading, setCurrentLocation, setAvailableLocations, setHasNoAssignment } = locationSlice.actions;
export default locationSlice.reducer;
