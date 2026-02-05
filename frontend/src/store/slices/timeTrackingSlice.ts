import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '../../utils/api';

export interface TimeEntry {
  _id: string;
  staffId: string;
  start: string;
  end: string | null;
  type: 'work' | 'break';
  note?: string;
}

export interface ReportDay {
  date: string;
  actual: number;
  target: number;
  balance: number;
  absence: string | null;
  /** Gesetzlicher Feiertag (Österreich), z. B. "Neujahr" */
  holiday?: string | null;
  entries: TimeEntry[];
}

export interface ReportSummary {
  totalActual: number;
  totalTarget: number;
  totalBalance: number;
}

export interface MonthlyReport {
  days: ReportDay[];
  summary: ReportSummary;
}

interface TimeTrackingState {
  activeEntry: TimeEntry | null;
  history: TimeEntry[];
  report: MonthlyReport | null;
  loading: boolean;
  error: string | null;
}

const initialState: TimeTrackingState = {
  activeEntry: null,
  history: [],
  report: null,
  loading: false,
  error: null,
};

export const fetchTimeStatus = createAsyncThunk<
  { active: boolean; entry: TimeEntry | null },
  void,
  { rejectValue: string }
>('timeTracking/fetchTimeStatus', async (_, { rejectWithValue }) => {
  try {
    const response = await apiRequest.get<{ success: boolean; data: { active: boolean; entry: TimeEntry | null } }>(
      '/time-entries/status'
    );
    const data = (response.data as { data?: { active: boolean; entry: TimeEntry | null } })?.data;
    if (!data) return rejectWithValue('Ungültige Antwort');
    return { active: data.active, entry: data.entry ?? null };
  } catch (error: any) {
    return rejectWithValue(error.message || 'Fehler beim Abrufen des Zeiterfassungs-Status');
  }
});

export const startTimeTracking = createAsyncThunk<
  TimeEntry,
  { type?: 'work' | 'break'; note?: string },
  { rejectValue: string }
>('timeTracking/startTimeTracking', async (payload, { rejectWithValue }) => {
  try {
    const response = await apiRequest.post<{ success: boolean; data: TimeEntry }>('/time-entries/start', {
      type: payload.type ?? 'work',
      note: payload.note,
    });
    const data = (response.data as { data?: TimeEntry })?.data;
    if (!data) return rejectWithValue('Ungültige Antwort');
    return data;
  } catch (error: any) {
    return rejectWithValue(error.message || 'Fehler beim Starten der Zeiterfassung');
  }
});

export const stopTimeTracking = createAsyncThunk<TimeEntry, void, { rejectValue: string }>(
  'timeTracking/stopTimeTracking',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest.post<{ success: boolean; data: TimeEntry }>('/time-entries/stop');
      const data = (response.data as { data?: TimeEntry })?.data;
      if (!data) return rejectWithValue('Ungültige Antwort');
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Beenden der Zeiterfassung');
    }
  }
);

export const fetchTimeHistory = createAsyncThunk<TimeEntry[], void, { rejectValue: string }>(
  'timeTracking/fetchTimeHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest.get<{ success: boolean; data: TimeEntry[] }>('/time-entries/history');
      const data = (response.data as { data?: TimeEntry[] })?.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Abrufen der Zeiterfassung-Historie');
    }
  }
);

export const fetchMonthlyReport = createAsyncThunk<
  MonthlyReport,
  { staffId?: string; month: string },
  { rejectValue: string }
>(
  'timeTracking/fetchMonthlyReport',
  async (payload, { rejectWithValue }) => {
    try {
      const params: Record<string, string> = { month: payload.month };
      if (payload.staffId) params.staffId = payload.staffId;
      const response = await apiRequest.get<{ success: boolean; data: MonthlyReport }>(
        '/time-entries/report',
        params
      );
      const data = (response.data as { data?: MonthlyReport })?.data;
      if (!data) return rejectWithValue('Ungültige Antwort');
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Abrufen des Reports');
    }
  }
);

export const createTimeEntry = createAsyncThunk<
  TimeEntry,
  { date: string; start: string; end?: string | null; type: 'work' | 'break'; note?: string },
  { rejectValue: string }
>(
  'timeTracking/createTimeEntry',
  async (payload, { rejectWithValue }) => {
    try {
      const body: Record<string, string> = {
        date: payload.date,
        start: payload.start,
        type: payload.type,
      };
      if (payload.end != null && payload.end !== '') body.end = payload.end;
      if (payload.note != null && payload.note !== '') body.note = payload.note;
      const response = await apiRequest.post<{ success: boolean; data: TimeEntry }>('/time-entries', body);
      const data = (response.data as { data?: TimeEntry })?.data;
      if (!data) return rejectWithValue('Ungültige Antwort');
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Erstellen des Zeiteintrags');
    }
  }
);

export const updateTimeEntry = createAsyncThunk<
  TimeEntry,
  { id: string; start?: string; end?: string | null; type?: 'work' | 'break'; note?: string },
  { rejectValue: string }
>(
  'timeTracking/updateTimeEntry',
  async (payload, { rejectWithValue }) => {
    try {
      const body: Record<string, string | null> = {};
      if (payload.start !== undefined) body.start = payload.start;
      if (payload.end !== undefined) body.end = payload.end === null || payload.end === '' ? null : payload.end;
      if (payload.type !== undefined) body.type = payload.type;
      if (payload.note !== undefined) body.note = payload.note ?? '';
      const response = await apiRequest.put<{ success: boolean; data: TimeEntry }>(
        `/time-entries/${payload.id}`,
        body
      );
      const data = (response.data as { data?: TimeEntry })?.data;
      if (!data) return rejectWithValue('Ungültige Antwort');
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Aktualisieren des Zeiteintrags');
    }
  }
);

export const deleteTimeEntry = createAsyncThunk<string, string, { rejectValue: string }>(
  'timeTracking/deleteTimeEntry',
  async (id, { rejectWithValue }) => {
    try {
      await apiRequest.delete(`/time-entries/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Fehler beim Löschen des Zeiteintrags');
    }
  }
);

const timeTrackingSlice = createSlice({
  name: 'timeTracking',
  initialState,
  reducers: {
    clearTimeTrackingError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTimeStatus
      .addCase(fetchTimeStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTimeStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.activeEntry = action.payload.entry;
        state.error = null;
      })
      .addCase(fetchTimeStatus.rejected, (state, action) => {
        state.loading = false;
        state.activeEntry = null;
        state.error = action.payload ?? 'Fehler';
      })
      // startTimeTracking
      .addCase(startTimeTracking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startTimeTracking.fulfilled, (state, action) => {
        state.loading = false;
        state.activeEntry = action.payload;
        state.error = null;
      })
      .addCase(startTimeTracking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Fehler';
      })
      // stopTimeTracking
      .addCase(stopTimeTracking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(stopTimeTracking.fulfilled, (state) => {
        state.loading = false;
        state.activeEntry = null;
        state.error = null;
      })
      .addCase(stopTimeTracking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Fehler';
      })
      // fetchTimeHistory
      .addCase(fetchTimeHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTimeHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload;
        state.error = null;
      })
      .addCase(fetchTimeHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Fehler';
      })
      // fetchMonthlyReport
      .addCase(fetchMonthlyReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMonthlyReport.fulfilled, (state, action) => {
        state.loading = false;
        state.report = action.payload;
        state.error = null;
      })
      .addCase(fetchMonthlyReport.rejected, (state, action) => {
        state.loading = false;
        state.report = null;
        state.error = action.payload ?? 'Fehler';
      })
      // createTimeEntry
      .addCase(createTimeEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTimeEntry.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(createTimeEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Fehler';
      })
      // updateTimeEntry
      .addCase(updateTimeEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTimeEntry.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(updateTimeEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Fehler';
      })
      // deleteTimeEntry
      .addCase(deleteTimeEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTimeEntry.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(deleteTimeEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Fehler';
      });
  },
});

export const { clearTimeTrackingError } = timeTrackingSlice.actions;
export default timeTrackingSlice.reducer;
