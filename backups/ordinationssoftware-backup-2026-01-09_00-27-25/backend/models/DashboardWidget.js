const mongoose = require('mongoose');

const DashboardWidgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  widgetId: {
    type: String,
    required: true,
    trim: true
  },
  widgetType: {
    type: String,
    enum: ['statistic', 'chart', 'list', 'status', 'quick-action', 'custom', 'messages'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  position: {
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
    w: { type: Number, required: true, default: 4 },
    h: { type: Number, required: true, default: 3 }
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index für schnelle Abfragen
DashboardWidgetSchema.index({ userId: 1, widgetId: 1 }, { unique: true });
DashboardWidgetSchema.index({ userId: 1, order: 1 });

module.exports = mongoose.model('DashboardWidget', DashboardWidgetSchema);

