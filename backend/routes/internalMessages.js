const express = require('express');
const router = express.Router();
const InternalMessage = require('../models/InternalMessage');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Alle Routen erfordern Authentifizierung
router.use(auth);

// GET /api/internal-messages - Nachrichten abrufen
router.get('/', async (req, res) => {
  try {
    const { type = 'inbox', limit = 50, skip = 0, status } = req.query;
    const userId = req.user._id;

    const messages = await InternalMessage.getMessagesForUser(userId, {
      type,
      limit: parseInt(limit),
      skip: parseInt(skip),
      status
    });

    // Stelle sicher, dass patientId als String serialisiert wird
    const serializedMessages = messages.map(msg => {
      const msgObj = msg.toObject ? msg.toObject() : msg;
      if (msgObj.patientId) {
        msgObj.patientId = msgObj.patientId.toString();
      }
      return msgObj;
    });

    res.json({
      success: true,
      data: serializedMessages,
      pagination: {
        total: messages.length,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Nachrichten',
      error: error.message
    });
  }
});

// PUT /api/internal-messages/mark-all-read - Alle ungelesenen Nachrichten als gelesen markieren
router.put('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Finde alle ungelesenen Nachrichten für diesen Benutzer
    const unreadMessages = await InternalMessage.find({
      recipientId: userId,
      status: { $in: ['sent', 'delivered'] },
      deletedByRecipient: false
    });
    
    console.log(`🔔 Markiere ${unreadMessages.length} ungelesene Nachrichten als gelesen für Benutzer ${userId}`);
    
    // Markiere alle als gelesen
    const updateResult = await InternalMessage.updateMany(
      {
        recipientId: userId,
        status: { $in: ['sent', 'delivered'] },
        deletedByRecipient: false
      },
      {
        $set: {
          status: 'read',
          readAt: new Date()
        }
      }
    );
    
    console.log(`✅ ${updateResult.modifiedCount} Nachrichten als gelesen markiert`);
    
    // Hole aktualisierten Count
    const count = await InternalMessage.getUnreadCount(userId);
    
    res.json({
      success: true,
      message: `${updateResult.modifiedCount} Nachricht(en) als gelesen markiert`,
      data: {
        markedCount: updateResult.modifiedCount,
        unreadCount: count
      }
    });
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Markieren der Nachrichten',
      error: error.message
    });
  }
});

// GET /api/internal-messages/unread-count - Anzahl ungelesener Nachrichten
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await InternalMessage.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der ungelesenen Nachrichten',
      error: error.message
    });
  }
});

// GET /api/internal-messages/:id - Einzelne Nachricht abrufen
router.get('/:id', async (req, res) => {
  try {
    const message = await InternalMessage.findById(req.params.id)
      .populate('senderId', 'firstName lastName email')
      .populate('recipientId', 'firstName lastName email')
      .populate({
        path: 'replyTo',
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
      });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Nachricht nicht gefunden'
      });
    }

    // Prüfen ob Benutzer berechtigt ist
    const userId = req.user._id.toString();
    if (message.senderId._id.toString() !== userId && message.recipientId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diese Nachricht'
      });
    }

    // Als gelesen markieren wenn Empfänger
    if (message.recipientId._id.toString() === userId && message.status !== 'read') {
      message.status = 'read';
      message.readAt = new Date();
      await message.save();
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Nachricht',
      error: error.message
    });
  }
});

// POST /api/internal-messages - Neue Nachricht senden
router.post('/', [
  body('recipientId').notEmpty().withMessage('Empfänger ist erforderlich'),
  body('subject').trim().notEmpty().withMessage('Betreff ist erforderlich').isLength({ max: 200 }),
  body('message').trim().notEmpty().withMessage('Nachricht ist erforderlich'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
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

    const { recipientId, subject, message, priority = 'normal', replyTo, forwardedFrom, attachments } = req.body;
    const senderId = req.user._id;

    const newMessage = new InternalMessage({
      senderId,
      recipientId,
      subject,
      message,
      priority,
      replyTo,
      forwardedFrom,
      attachments: attachments || [],
      status: 'sent'
    });

    await newMessage.save();

    const populatedMessage = await InternalMessage.findById(newMessage._id)
      .populate('senderId', 'firstName lastName email')
      .populate('recipientId', 'firstName lastName email')
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
      });

    res.status(201).json({
      success: true,
      message: 'Nachricht erfolgreich gesendet',
      data: populatedMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Senden der Nachricht',
      error: error.message
    });
  }
});

// PUT /api/internal-messages/:id/read - Nachricht als gelesen markieren
router.put('/:id/read', async (req, res) => {
  try {
    const message = await InternalMessage.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Nachricht nicht gefunden'
      });
    }

    const userId = req.user._id.toString();
    if (message.recipientId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
    }

    message.status = 'read';
    message.readAt = new Date();
    await message.save();

    res.json({
      success: true,
      message: 'Nachricht als gelesen markiert',
      data: message
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Markieren der Nachricht',
      error: error.message
    });
  }
});

// PUT /api/internal-messages/:id/archive - Nachricht archivieren
router.put('/:id/archive', async (req, res) => {
  try {
    const message = await InternalMessage.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Nachricht nicht gefunden'
      });
    }

    const userId = req.user._id.toString();
    const isRecipient = message.recipientId.toString() === userId;
    const isSender = message.senderId.toString() === userId;

    if (!isRecipient && !isSender) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
    }

    message.status = 'archived';
    await message.save();

    res.json({
      success: true,
      message: 'Nachricht archiviert',
      data: message
    });
  } catch (error) {
    console.error('Error archiving message:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Archivieren der Nachricht',
      error: error.message
    });
  }
});

// DELETE /api/internal-messages/:id - Nachricht löschen
router.delete('/:id', async (req, res) => {
  try {
    const message = await InternalMessage.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Nachricht nicht gefunden'
      });
    }

    const userId = req.user._id.toString();
    const isRecipient = message.recipientId.toString() === userId;
    const isSender = message.senderId.toString() === userId;

    if (!isRecipient && !isSender) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
    }

    // Soft delete: Markiere als gelöscht
    if (isRecipient) {
      message.deletedByRecipient = true;
    }
    if (isSender) {
      message.deletedBySender = true;
    }

    // Wenn beide gelöscht haben, wirklich löschen
    if (message.deletedByRecipient && message.deletedBySender) {
      await InternalMessage.findByIdAndDelete(req.params.id);
      return res.json({
        success: true,
        message: 'Nachricht gelöscht'
      });
    }

    await message.save();

    res.json({
      success: true,
      message: 'Nachricht gelöscht',
      data: message
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Nachricht',
      error: error.message
    });
  }
});

module.exports = router;



