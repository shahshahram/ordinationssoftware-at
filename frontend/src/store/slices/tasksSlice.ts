import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Types
export interface Task {
  _id: string;
  title: string;
  description?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  assignedTo: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    role: string;
    email?: string;
  }>;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  completedAt?: string;
  comments?: Array<{
    text: string;
    author: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    createdAt: string;
  }>;
  patientId?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  appointmentId?: string;
  createdFromTemplate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTaskData {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface CreateTaskData {
  title: string;
  description?: string;
  assignedTo: string[]; // Array von User-IDs
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  patientId?: string;
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  role: string;
  email?: string;
}

interface TasksState {
  tasks: Task[];
  allUsers: User[];
  loading: boolean;
  error: string | null;
}

const initialState: TasksState = {
  tasks: [],
  allUsers: [],
  loading: false,
  error: null,
};

// Async Thunks
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (params: { status?: string; priority?: string; overdue?: boolean } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.priority) queryParams.append('priority', params.priority);
    if (params.overdue) queryParams.append('overdue', 'true');

    const response = await api.get(`/tasks?${queryParams.toString()}`);
    return (response.data as any).data || [];
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ taskId, data }: { taskId: string; data: UpdateTaskData }) => {
    const response = await api.put(`/tasks/${taskId}`, data);
    return (response.data as any).data;
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData: CreateTaskData) => {
    const response = await api.post('/tasks', taskData);
    return (response.data as any).data;
  }
);

export const fetchAllUsers = createAsyncThunk(
  'tasks/fetchAllUsers',
  async () => {
    const response = await api.get('/tasks/all-users');
    return (response.data as any).data || [];
  }
);

// Slice
const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Tasks
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
        state.error = null;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Laden der Aufgaben';
      })
      // Update Task
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      // Create Task
      .addCase(createTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks.unshift(action.payload);
        state.error = null;
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fehler beim Erstellen der Aufgabe';
      })
      // Fetch All Users
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.allUsers = action.payload;
      });
  }
});

export const { clearError } = tasksSlice.actions;
export default tasksSlice.reducer;
