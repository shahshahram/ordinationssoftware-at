const mongoose = require('mongoose');

const ReportFilterSchema = new mongoose.Schema({
  field: { type: String, required: true },
  operator: { 
    type: String, 
    enum: ['equals', 'notEquals', 'contains', 'notContains', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
    required: true 
  },
  value: mongoose.Schema.Types.Mixed,
  value2: mongoose.Schema.Types.Mixed // Für 'between' Operator
}, { _id: false });

const ReportColumnSchema = new mongoose.Schema({
  field: { type: String, required: true },
  label: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['string', 'number', 'date', 'boolean', 'currency', 'percentage'],
    default: 'string'
  },
  format: String, // z.B. 'DD.MM.YYYY' für Datum, '#,##0.00' für Zahlen
  aggregate: {
    type: String,
    enum: ['sum', 'avg', 'count', 'min', 'max', 'groupBy'],
    default: null
  },
  sort: {
    type: String,
    enum: ['asc', 'desc'],
    default: null
  },
  visible: { type: Boolean, default: true }
}, { _id: false });

const ReportDefinitionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['patient', 'appointment', 'billing', 'staff', 'service', 'location', 'document', 'custom'],
    required: true
  },
  dataSource: {
    type: String,
    required: true,
    enum: ['patients', 'appointments', 'invoices', 'reimbursements', 'staff', 'services', 'documents', 'performances', 'waiting-list', 'resources']
  },
  // Report-Konfiguration
  config: {
    // Filter
    filters: [ReportFilterSchema],
    
    // Spalten/Auswahlfelder
    columns: [ReportColumnSchema],
    
    // Gruppierung
    groupBy: [String],
    
    // Sortierung
    sortBy: {
      field: String,
      direction: { type: String, enum: ['asc', 'desc'], default: 'asc' }
    },
    
    // Datumsbereich (optional)
    dateRange: {
      enabled: { type: Boolean, default: false },
      field: String, // z.B. 'createdAt', 'appointmentDate', 'invoiceDate'
      defaultRange: {
        type: String,
        enum: ['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'custom'],
        default: 'thisMonth'
      }
    },
    
    // Limit
    limit: { type: Number, default: 1000 },
    
    // Formatierung
    format: {
      type: { type: String, enum: ['table', 'chart', 'summary'], default: 'table' },
      chartType: {
        type: String,
        enum: ['bar', 'line', 'pie', 'area', 'column'],
        default: null
      },
      chartField: String, // Feld für Chart
      chartValue: String // Wert-Feld für Chart
    }
  },
  
  // Berechtigungen
  permissions: {
    canView: [{ type: String }], // Rollen
    canGenerate: [{ type: String }],
    canExport: [{ type: String }],
    canEdit: [{ type: String }],
    canDelete: [{ type: String }]
  },
  
  // Metadaten
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false }, // Öffentlich für alle mit Berechtigung
  tags: [String],
  
  // Erstellt von
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Zuletzt geändert
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Statistik
  executionCount: { type: Number, default: 0 },
  lastExecutedAt: Date,
  lastExecutedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
ReportDefinitionSchema.index({ category: 1, isActive: 1 });
ReportDefinitionSchema.index({ dataSource: 1 });
ReportDefinitionSchema.index({ createdBy: 1 });
ReportDefinitionSchema.index({ tags: 1 });
ReportDefinitionSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('ReportDefinition', ReportDefinitionSchema);


