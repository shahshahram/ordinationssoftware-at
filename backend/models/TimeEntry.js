const mongoose = require('mongoose');

const TimeEntrySchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StaffProfile',
    required: true,
  },
  start: {
    type: Date,
    required: true,
    default: Date.now,
  },
  end: {
    type: Date,
    default: null,
  },
  type: {
    type: String,
    enum: ['work', 'break'],
    default: 'work',
  },
  note: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

TimeEntrySchema.index({ staffId: 1, end: 1 });

module.exports = mongoose.model('TimeEntry', TimeEntrySchema);
