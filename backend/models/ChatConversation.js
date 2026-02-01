const mongoose = require('mongoose');

const ChatConversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct', 'group'],
    required: true,
    index: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  name: {
    type: String,
    trim: true,
    maxlength: 100,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

ChatConversationSchema.index({ participants: 1, type: 1 });
ChatConversationSchema.index({ updatedAt: -1 });

// Eindeutige 1:1-Konversation: gleiche zwei Teilnehmer (sortiert)
ChatConversationSchema.index(
  { participants: 1 },
  {
    unique: true,
    partialFilterExpression: { type: 'direct' }
  }
);

ChatConversationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (this.type === 'direct' && this.participants.length === 2) {
    this.participants.sort((a, b) => a.toString().localeCompare(b.toString()));
  }
  next();
});

const ChatConversation = mongoose.model('ChatConversation', ChatConversationSchema);

module.exports = ChatConversation;
