const mongoose = require('mongoose');

const ReportExecutionSchema = new mongoose.Schema({
  reportDefinitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReportDefinition',
    required: true
  },
  
  // Parameter für diese Ausführung
  parameters: {
    dateRange: {
      startDate: Date,
      endDate: Date
    },
    filters: mongoose.Schema.Types.Mixed, // Zusätzliche Filter
    limit: Number
  },
  
  // Ergebnis
  result: {
    totalRecords: { type: Number, default: 0 },
    data: mongoose.Schema.Types.Mixed, // Die tatsächlichen Daten
    summary: mongoose.Schema.Types.Mixed, // Zusammenfassung/Statistiken
    generatedAt: { type: Date, default: Date.now },
    executionTime: Number // in Millisekunden
  },
  
  // Export-Informationen
  exports: [{
    format: { type: String, enum: ['pdf', 'excel', 'csv', 'json'] },
    filePath: String,
    fileSize: Number,
    exportedAt: Date,
    exportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  
  // Fehler
  error: {
    message: String,
    stack: String,
    occurredAt: Date
  },
  
  // Ausgeführt von
  executedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
ReportExecutionSchema.index({ reportDefinitionId: 1, createdAt: -1 });
ReportExecutionSchema.index({ executedBy: 1 });
ReportExecutionSchema.index({ status: 1 });
ReportExecutionSchema.index({ 'parameters.dateRange.startDate': 1, 'parameters.dateRange.endDate': 1 });

module.exports = mongoose.model('ReportExecution', ReportExecutionSchema);


