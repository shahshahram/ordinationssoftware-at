import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../utils/api';

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidget {
  _id?: string;
  userId?: string;
  widgetId: string;
  widgetType: 'statistic' | 'chart' | 'list' | 'status' | 'quick-action' | 'custom' | 'messages';
  title: string;
  position: WidgetPosition;
  config: Record<string, any>;
  isVisible: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

interface DashboardWidgetsState {
  widgets: DashboardWidget[];
  loading: boolean;
  error: string | null;
}

const initialState: DashboardWidgetsState = {
  widgets: [],
  loading: false,
  error: null
};

// Fetch widgets
export const fetchDashboardWidgets = createAsyncThunk(
  'dashboardWidgets/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<{ success?: boolean; data?: DashboardWidget[] }>('/dashboard-widgets');
      return (response.data as any)?.data || [];
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Widgets');
    }
  }
);

// Save widget
export const saveDashboardWidget = createAsyncThunk(
  'dashboardWidgets/save',
  async (widget: Partial<DashboardWidget>, { rejectWithValue }) => {
    try {
      const response = await api.post<{ success?: boolean; data?: DashboardWidget }>('/dashboard-widgets', widget);
      return (response.data as any)?.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Speichern des Widgets');
    }
  }
);

// Update widget
export const updateDashboardWidget = createAsyncThunk(
  'dashboardWidgets/update',
  async ({ id, updates }: { id: string; updates: Partial<DashboardWidget> }, { rejectWithValue }) => {
    try {
      const response = await api.put<{ success?: boolean; data?: DashboardWidget }>(`/dashboard-widgets/${id}`, updates);
      return (response.data as any)?.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Aktualisieren des Widgets');
    }
  }
);

// Delete widget
export const deleteDashboardWidget = createAsyncThunk(
  'dashboardWidgets/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/dashboard-widgets/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Löschen des Widgets');
    }
  }
);

// Reorder widgets
export const reorderDashboardWidgets = createAsyncThunk(
  'dashboardWidgets/reorder',
  async (widgets: Array<{ id: string; position: WidgetPosition; order: number }>, { rejectWithValue }) => {
    try {
      await api.post('/dashboard-widgets/reorder', { widgets });
      return widgets;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Aktualisieren der Reihenfolge');
    }
  }
);

const dashboardWidgetsSlice = createSlice({
  name: 'dashboardWidgets',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateWidgetPosition: (state, action: PayloadAction<{ id: string; position: WidgetPosition }>) => {
      const widget = state.widgets.find(w => w._id === action.payload.id);
      if (widget) {
        widget.position = action.payload.position;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchDashboardWidgets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardWidgets.fulfilled, (state, action) => {
        state.loading = false;
        state.widgets = action.payload;
      })
      .addCase(fetchDashboardWidgets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Save
      .addCase(saveDashboardWidget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveDashboardWidget.fulfilled, (state, action) => {
        state.loading = false;
        const existingIndex = state.widgets.findIndex(w => w._id === action.payload._id);
        if (existingIndex >= 0) {
          state.widgets[existingIndex] = action.payload;
        } else {
          state.widgets.push(action.payload);
        }
      })
      .addCase(saveDashboardWidget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update
      .addCase(updateDashboardWidget.fulfilled, (state, action) => {
        const index = state.widgets.findIndex(w => w._id === action.payload._id);
        if (index >= 0) {
          state.widgets[index] = action.payload;
        }
      })
      // Delete
      .addCase(deleteDashboardWidget.fulfilled, (state, action) => {
        state.widgets = state.widgets.filter(w => w._id !== action.payload);
      })
      // Reorder
      .addCase(reorderDashboardWidgets.fulfilled, (state, action) => {
        action.payload.forEach(({ id, position, order }) => {
          const widget = state.widgets.find(w => w._id === id);
          if (widget) {
            widget.position = position;
            widget.order = order;
          }
        });
      });
  }
});

export const { clearError, updateWidgetPosition } = dashboardWidgetsSlice.actions;
export default dashboardWidgetsSlice.reducer;

