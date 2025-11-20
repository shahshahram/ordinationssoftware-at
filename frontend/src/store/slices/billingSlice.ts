import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export interface Service {
  _id?: string;
  id?: string;
  code: string;
  name: string;
  description: string;
  category: 'konsultation' | 'behandlung' | 'medikament' | 'labor' | 'bildgebung' | 'sonstiges';
  subcategory?: string;
  prices: {
    kassenarzt: number;
    wahlarzt: number;
    privat: number;
  };
  unit: string;
  icd10Codes?: string[];
  goaeCode?: string;
  ebmCode?: string;
  isActive: boolean;
  quick_select?: boolean;
  color_hex?: string;
}

export interface InvoiceService {
  date: Date;
  serviceCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

export interface Invoice {
  _id?: string;
  id?: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  doctor: {
    name: string;
    title?: string;
    specialization?: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    taxNumber?: string;
    chamberNumber?: string;
  };
  patient: {
    id: string;
    name: string;
    email?: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    socialSecurityNumber?: string;
    insuranceProvider?: string;
  };
  billingType: 'kassenarzt' | 'wahlarzt' | 'privat';
  diagnoses?: Array<{
    diagnosisId?: string;
    code: string;
    display: string;
    isPrimary: boolean;
    date: Date;
  }>;
  services: InvoiceService[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentDate?: Date;
  paymentMethod?: 'cash' | 'transfer' | 'card' | 'insurance';
  insuranceBilling?: {
    insuranceCompany?: string;
    billingPeriod?: string;
    submissionDate?: Date;
    status?: 'pending' | 'submitted' | 'approved' | 'rejected';
    referenceNumber?: string;
  };
  privateBilling?: {
    honorNote: boolean;
    wahlarztCode?: string;
    reimbursementAmount: number;
    patientAmount: number;
  };
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BillingState {
  invoices: Invoice[];
  services: Service[];
  selectedInvoice: Invoice | null;
  loading: boolean;
  error: string | null;
  statistics: {
    overview: {
      totalInvoices: number;
      totalAmount: number;
      paidAmount: number;
      pendingAmount: number;
    };
    byStatus: Array<{ _id: string; count: number; amount: number }>;
    byBillingType: Array<{ _id: string; count: number; amount: number }>;
  } | null;
}

const initialState: BillingState = {
  invoices: [],
  services: [],
  selectedInvoice: null,
  loading: false,
  error: null,
  statistics: null,
};

// Async thunks
export const fetchInvoices = createAsyncThunk(
  'billing/fetchInvoices',
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams(params).toString();
      const response = await axios.get(`${API_BASE_URL}/billing/invoices?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('fetchInvoices response:', response.data);
      return response.data; // Return full response
    } catch (error: any) {
      console.error('fetchInvoices error:', error);
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Rechnungen');
    }
  }
);

export const fetchServices = createAsyncThunk(
  'billing/fetchServices',
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams(params).toString();
      const response = await axios.get(`${API_BASE_URL}/billing/services?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('🔍 fetchServices response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('🔍 fetchServices error:', error);
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden des Leistungskatalogs');
    }
  }
);

export const createInvoice = createAsyncThunk(
  'billing/createInvoice',
  async (invoiceData: Partial<Invoice>, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/billing/invoices`, invoiceData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Erstellen der Rechnung');
    }
  }
);

export const updateInvoice = createAsyncThunk(
  'billing/updateInvoice',
  async ({ id, invoiceData }: { id: string; invoiceData: Partial<Invoice> }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/billing/invoices/${id}`, invoiceData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Aktualisieren der Rechnung');
    }
  }
);

export const deleteInvoice = createAsyncThunk(
  'billing/deleteInvoice',
  async (id: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/billing/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Löschen der Rechnung');
    }
  }
);

export const fetchStatistics = createAsyncThunk(
  'billing/fetchStatistics',
  async (params: any = {}, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams(params).toString();
      const response = await axios.get(`${API_BASE_URL}/billing/statistics?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Fehler beim Laden der Statistiken');
    }
  }
);

const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {
    setSelectedInvoice: (state, action: PayloadAction<Invoice | null>) => {
      state.selectedInvoice = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Invoices
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false;
        console.log('Billing slice - invoices payload:', action.payload);
        // Extract data from response
        const responseData = action.payload;
        if (responseData && responseData.data) {
          state.invoices = Array.isArray(responseData.data) ? responseData.data : [];
        } else {
          state.invoices = [];
        }
        state.error = null;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Services
      .addCase(fetchServices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.loading = false;
        console.log('🔍 fetchServices.fulfilled payload:', action.payload);
        // Backend returns: { success: true, data: [...] }
        state.services = Array.isArray(action.payload?.data) ? action.payload.data : (Array.isArray(action.payload) ? action.payload : []);
        state.error = null;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Invoice
      .addCase(createInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.loading = false;
        // Sicherheitsprüfung für die neue Rechnung
        if (action.payload && action.payload.data) {
          const newInvoice = action.payload.data;
          // Stelle sicher, dass die neue Rechnung alle erforderlichen Felder hat
          if (newInvoice && typeof newInvoice === 'object') {
            state.invoices.unshift(newInvoice);
          }
        }
        state.error = null;
      })
      .addCase(createInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Invoice
      .addCase(updateInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        state.loading = false;
        // Sicherheitsprüfung für die aktualisierte Rechnung
        if (action.payload && action.payload.data && action.payload.data._id) {
          const index = state.invoices.findIndex(invoice => invoice?._id === action.payload.data._id);
          if (index !== -1) {
            state.invoices[index] = action.payload.data;
          }
        }
        state.error = null;
      })
      .addCase(updateInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete Invoice
      .addCase(deleteInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteInvoice.fulfilled, (state, action) => {
        state.loading = false;
        // Sicherheitsprüfung für das Löschen
        if (action.payload) {
          state.invoices = state.invoices.filter(invoice => invoice?._id !== action.payload);
        }
        state.error = null;
      })
      .addCase(deleteInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Statistics
      .addCase(fetchStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = action.payload.data;
        state.error = null;
      })
      .addCase(fetchStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedInvoice, clearError } = billingSlice.actions;
export default billingSlice.reducer;
