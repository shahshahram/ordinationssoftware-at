const mongoose = require('mongoose');

const MessageFolderSchema = new mongoose.Schema({
  // Benutzer, dem der Ordner gehört
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Ordnername
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  // Beschreibung (optional)
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Farbe für visuelle Unterscheidung (optional)
  color: {
    type: String,
    default: '#1976d2',
    match: /^#[0-9A-Fa-f]{6}$/
  },
  
  // Icon (optional)
  icon: {
    type: String,
    default: 'folder'
  },
  
  // Sortierreihenfolge
  order: {
    type: Number,
    default: 0
  },
  
  // Ist System-Ordner (kann nicht gelöscht werden)
  isSystem: {
    type: Boolean,
    default: false
  },
  
  // Metadaten
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound Index für eindeutige Ordnernamen pro Benutzer
MessageFolderSchema.index({ userId: 1, name: 1 }, { unique: true });

// Pre-save Hook: Aktualisiere updatedAt
MessageFolderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Statische Methode: Hole alle Ordner für einen Benutzer
MessageFolderSchema.statics.getFoldersForUser = async function(userId) {
  return this.find({ userId })
    .sort({ isSystem: -1, order: 1, name: 1 });
};

// Statische Methode: Erstelle Standard-Ordner für einen Benutzer
MessageFolderSchema.statics.createDefaultFolders = async function(userId) {
  const defaultFolders = [
    { name: 'Posteingang', isSystem: true, order: 0, color: '#1976d2', icon: 'inbox' },
    { name: 'Gesendet', isSystem: true, order: 1, color: '#2e7d32', icon: 'send' },
    { name: 'Archiv', isSystem: true, order: 2, color: '#ed6c02', icon: 'archive' },
    { name: 'Papierkorb', isSystem: true, order: 3, color: '#d32f2f', icon: 'delete' }
  ];
  
  const existingFolders = await this.find({ userId, isSystem: true });
  const existingNames = existingFolders.map(f => f.name);
  
  const foldersToCreate = defaultFolders.filter(f => !existingNames.includes(f.name));
  
  if (foldersToCreate.length > 0) {
    const folders = foldersToCreate.map(folder => ({
      ...folder,
      userId
    }));
    await this.insertMany(folders);
  }
  
  return this.getFoldersForUser(userId);
};

const MessageFolder = mongoose.model('MessageFolder', MessageFolderSchema);

module.exports = MessageFolder;

