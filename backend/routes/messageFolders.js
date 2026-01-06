const express = require('express');
const router = express.Router();
const MessageFolder = require('../models/MessageFolder');
const InternalMessage = require('../models/InternalMessage');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Alle Routen erfordern Authentifizierung
router.use(auth);

// GET /api/message-folders - Alle Ordner für den Benutzer abrufen
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Erstelle Standard-Ordner, falls noch keine existieren
    let folders = await MessageFolder.getFoldersForUser(userId);
    if (folders.length === 0) {
      folders = await MessageFolder.createDefaultFolders(userId);
    }
    
    // Zähle Nachrichten pro Ordner
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const count = await InternalMessage.countDocuments({
          folderId: folder._id,
          $or: [
            { recipientId: userId, deletedByRecipient: false },
            { senderId: userId, deletedBySender: false }
          ]
        });
        return {
          ...folder.toObject(),
          messageCount: count
        };
      })
    );
    
    res.json({
      success: true,
      data: foldersWithCounts
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Ordner',
      error: error.message
    });
  }
});

// POST /api/message-folders - Neuen Ordner erstellen
router.post('/', [
  body('name').trim().notEmpty().withMessage('Ordnername ist erforderlich').isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Ungültige Farbe'),
  body('icon').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    const { name, description, color, icon } = req.body;
    const userId = req.user._id;

    // Prüfe ob Ordner mit diesem Namen bereits existiert
    const existingFolder = await MessageFolder.findOne({ userId, name });
    if (existingFolder) {
      return res.status(400).json({
        success: false,
        message: 'Ein Ordner mit diesem Namen existiert bereits'
      });
    }

    // Finde die höchste order-Nummer
    const maxOrder = await MessageFolder.findOne({ userId })
      .sort({ order: -1 })
      .select('order');
    const nextOrder = maxOrder ? maxOrder.order + 1 : 0;

    const newFolder = new MessageFolder({
      userId,
      name,
      description: description || '',
      color: color || '#1976d2',
      icon: icon || 'folder',
      order: nextOrder,
      isSystem: false
    });

    await newFolder.save();

    res.status(201).json({
      success: true,
      message: 'Ordner erfolgreich erstellt',
      data: newFolder
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Ordners',
      error: error.message
    });
  }
});

// PUT /api/message-folders/:id - Ordner aktualisieren
router.put('/:id', [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Ungültige Farbe'),
  body('icon').optional().trim(),
  body('order').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    const folder = await MessageFolder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Ordner nicht gefunden'
      });
    }

    const userId = req.user._id.toString();
    if (folder.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
    }

    // Prüfe ob Name geändert wird und ob er bereits existiert
    if (req.body.name && req.body.name !== folder.name) {
      const existingFolder = await MessageFolder.findOne({ 
        userId, 
        name: req.body.name,
        _id: { $ne: folder._id }
      });
      if (existingFolder) {
        return res.status(400).json({
          success: false,
          message: 'Ein Ordner mit diesem Namen existiert bereits'
        });
      }
    }

    // Aktualisiere Felder
    if (req.body.name) folder.name = req.body.name;
    if (req.body.description !== undefined) folder.description = req.body.description;
    if (req.body.color) folder.color = req.body.color;
    if (req.body.icon) folder.icon = req.body.icon;
    if (req.body.order !== undefined) folder.order = req.body.order;

    await folder.save();

    res.json({
      success: true,
      message: 'Ordner erfolgreich aktualisiert',
      data: folder
    });
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Ordners',
      error: error.message
    });
  }
});

// DELETE /api/message-folders/:id - Ordner löschen
router.delete('/:id', async (req, res) => {
  try {
    const folder = await MessageFolder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Ordner nicht gefunden'
      });
    }

    const userId = req.user._id.toString();
    if (folder.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
    }

    // System-Ordner können nicht gelöscht werden
    if (folder.isSystem) {
      return res.status(400).json({
        success: false,
        message: 'System-Ordner können nicht gelöscht werden'
      });
    }

    // Verschiebe alle Nachrichten aus diesem Ordner zurück in den Posteingang
    const inboxFolder = await MessageFolder.findOne({ userId, name: 'Posteingang', isSystem: true });
    if (inboxFolder) {
      await InternalMessage.updateMany(
        { folderId: folder._id },
        { $set: { folderId: inboxFolder._id } }
      );
    } else {
      // Wenn kein Posteingang existiert, entferne folderId
      await InternalMessage.updateMany(
        { folderId: folder._id },
        { $unset: { folderId: 1 } }
      );
    }

    await MessageFolder.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Ordner erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Ordners',
      error: error.message
    });
  }
});

// PUT /api/message-folders/:id/move-messages - Nachrichten in Ordner verschieben
router.put('/:id/move-messages', [
  body('messageIds').isArray().withMessage('messageIds muss ein Array sein'),
  body('messageIds.*').isMongoId().withMessage('Ungültige Nachrichten-ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    const folder = await MessageFolder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Ordner nicht gefunden'
      });
    }

    const userId = req.user._id.toString();
    if (folder.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
    }

    const { messageIds } = req.body;

    // Prüfe ob Benutzer berechtigt ist, diese Nachrichten zu verschieben
    const messages = await InternalMessage.find({
      _id: { $in: messageIds },
      $or: [
        { recipientId: userId, deletedByRecipient: false },
        { senderId: userId, deletedBySender: false }
      ]
    });

    if (messages.length !== messageIds.length) {
      return res.status(403).json({
        success: false,
        message: 'Nicht alle Nachrichten können verschoben werden'
      });
    }

    // Verschiebe Nachrichten
    await InternalMessage.updateMany(
      { _id: { $in: messageIds } },
      { $set: { folderId: folder._id } }
    );

    res.json({
      success: true,
      message: `${messages.length} Nachricht(en) erfolgreich verschoben`,
      data: { movedCount: messages.length }
    });
  } catch (error) {
    console.error('Error moving messages:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Verschieben der Nachrichten',
      error: error.message
    });
  }
});

// GET /api/message-folders/:id/messages - Nachrichten in einem Ordner abrufen
router.get('/:id/messages', async (req, res) => {
  try {
    const folder = await MessageFolder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Ordner nicht gefunden'
      });
    }

    const userId = req.user._id.toString();
    if (folder.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
    }

    const { limit = 50, skip = 0 } = req.query;

    const messages = await InternalMessage.find({
      folderId: folder._id,
      $or: [
        { recipientId: userId, deletedByRecipient: false },
        { senderId: userId, deletedBySender: false }
      ]
    })
      .populate('senderId', 'firstName lastName email')
      .populate('recipientId', 'firstName lastName email')
      .populate({
        path: 'replyTo',
        select: 'subject message senderId createdAt',
        populate: {
          path: 'senderId',
          select: 'firstName lastName email'
        }
      })
      .populate({
        path: 'forwardedFrom',
        select: 'subject message senderId recipientId createdAt',
        populate: [
          {
            path: 'senderId',
            select: 'firstName lastName email'
          },
          {
            path: 'recipientId',
            select: 'firstName lastName email'
          }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await InternalMessage.countDocuments({
      folderId: folder._id,
      $or: [
        { recipientId: userId, deletedByRecipient: false },
        { senderId: userId, deletedBySender: false }
      ]
    });

    res.json({
      success: true,
      data: messages,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error('Error fetching folder messages:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Nachrichten',
      error: error.message
    });
  }
});

module.exports = router;








