const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');
const InternalMessage = require('../models/InternalMessage');
const { body, validationResult } = require('express-validator');

const MEDICAL_ROLES = ['arzt', 'admin', 'super_admin'];

/**
 * @route   GET /api/tasks
 * @desc    Aufgaben für Benutzer abrufen
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, overdue, limit = 50, skip = 0 } = req.query;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Benutzer nicht authentifiziert'
      });
    }

    const userIdString = userId.toString ? userId.toString() : userId;

    const tasks = await Task.getTasksForUser(userIdString, {
      status,
      priority,
      overdue: overdue === 'true',
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Aufgaben:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Aufgaben',
      error: error.message
    });
  }
});

// Validierungs-Middleware
const updateTaskValidation = [
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('dueDate').optional().isISO8601()
];

// Gemeinsame Handler-Funktion für PATCH und PUT
const updateTaskHandler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Aufgabe nicht gefunden'
      });
    }

    // Prüfe Berechtigung
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Benutzer nicht authentifiziert'
      });
    }
    // Prüfe ob Benutzer Ersteller oder zugewiesener Benutzer ist
    const isCreator = task.createdBy.toString() === userId.toString();
    const isAssigned = Array.isArray(task.assignedTo) 
      ? task.assignedTo.some(id => id.toString() === userId.toString())
      : task.assignedTo.toString() === userId.toString();
    
    if (!isCreator && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diese Aufgabe'
      });
    }

    // Speichere alten Status für Benachrichtigung
    const oldStatus = task.status;
    
    // Aktualisiere Felder
    const { status, priority, dueDate } = req.body;
    
    if (status !== undefined) {
      task.status = status;
      if (status === 'completed') {
        task.completedAt = new Date();
      } else if (task.completedAt && status !== 'completed') {
        task.completedAt = undefined;
      }
    }
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = new Date(dueDate);

    await task.save();

    await task.populate('createdBy', 'firstName lastName role');
    await task.populate('assignedTo', 'firstName lastName role email');
    if (task.patientId) {
      await task.populate('patientId', 'firstName lastName');
    }

    // Sende Benachrichtigung an Aufgabesteller, wenn Aufgabe als erledigt markiert wurde
    if (status === 'completed' && oldStatus !== 'completed' && !isCreator) {
      try {
        const completedBy = await User.findById(userId).select('firstName lastName').lean();
        const completedByName = completedBy ? `${completedBy.firstName} ${completedBy.lastName}` : 'Ein Benutzer';
        
        let patientName = 'N/A';
        if (task.patientId && typeof task.patientId === 'object') {
          patientName = `${task.patientId.firstName || ''} ${task.patientId.lastName || ''}`.trim() || 'Unbekannt';
        }

        const subject = `Aufgabe erledigt: ${task.title}`;
        const message = `Hallo ${task.createdBy.firstName},\n\n` +
                      `Die folgende Aufgabe wurde als erledigt markiert:\n\n` +
                      `Titel: ${task.title}\n` +
                      `Beschreibung: ${task.description || 'Keine Beschreibung'}\n` +
                      `Erledigt von: ${completedByName}\n` +
                      `Erledigt am: ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}\n` +
                      `Patient: ${patientName}\n\n` +
                      `Die Aufgabe wurde erfolgreich abgeschlossen.`;

        const systemUser = await User.findOne({ 
          role: { $in: ['admin', 'super_admin'] }, 
          isActive: true 
        }).select('_id').lean();
        const senderId = systemUser?._id || userId;

        const notification = new InternalMessage({
          senderId: senderId,
          recipientId: task.createdBy._id,
          subject: subject,
          message: message,
          priority: 'normal',
          status: 'sent',
          patientId: task.patientId ? (typeof task.patientId === 'object' ? task.patientId._id : task.patientId) : undefined,
          relatedResource: {
            type: 'Task',
            id: task._id
          }
        });

        await notification.save();
        console.log(`✅ Task Completion Notification: Sent to ${task.createdBy.firstName} ${task.createdBy.lastName} for task ${task._id}`);
      } catch (notifError) {
        console.error('❌ Fehler beim Senden der Erledigungs-Benachrichtigung:', notifError);
        // Fehler nicht an Client weitergeben, da Aufgabe bereits gespeichert wurde
      }
    }

    res.json({
      success: true,
      message: 'Aufgabe erfolgreich aktualisiert',
      data: task
    });
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Aufgabe:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Aufgabe',
      error: error.message
    });
  }
};

/**
 * @route   PATCH /api/tasks/:id
 * @route   PUT /api/tasks/:id (Alias für PATCH)
 * @desc    Aufgabe aktualisieren
 * @access  Private
 */
router.patch('/:id', auth, updateTaskValidation, updateTaskHandler);
router.put('/:id', auth, updateTaskValidation, updateTaskHandler);

/**
 * @route   POST /api/tasks
 * @desc    Neue Aufgabe erstellen (nur Mediziner)
 * @access  Private
 */
router.post(
  '/',
  auth,
  [
    body('title').trim().notEmpty().withMessage('Titel ist erforderlich'),
    body('assignedTo').isArray({ min: 1 }).withMessage('Mindestens ein Benutzer muss zugewiesen werden'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('dueDate').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validierungsfehler',
          errors: errors.array()
        });
      }

      const userId = req.user?._id || req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Benutzer nicht authentifiziert'
        });
      }

      // Prüfe ob Benutzer Mediziner ist
      const user = await User.findById(userId).select('role');
      if (!user || !MEDICAL_ROLES.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Nur Mediziner können Aufgaben erstellen'
        });
      }

      const { title, description, assignedTo, priority, dueDate, patientId } = req.body;

      // Prüfe ob alle zugewiesenen Benutzer existieren
      const assignedUsers = await User.find({ _id: { $in: assignedTo } }).select('_id firstName lastName role');
      if (assignedUsers.length !== assignedTo.length) {
        return res.status(400).json({
          success: false,
          message: 'Ein oder mehrere zugewiesene Benutzer wurden nicht gefunden'
        });
      }

      // Erstelle Aufgabe
      const task = new Task({
        title,
        description: description || undefined,
        createdBy: userId,
        assignedTo: assignedTo,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        patientId: patientId || undefined
      });

      await task.save();

      // Lade vollständige Daten
      await task.populate('createdBy', 'firstName lastName role');
      await task.populate('assignedTo', 'firstName lastName role email');
      if (task.patientId) {
        await task.populate('patientId', 'firstName lastName');
      }

      // Sende interne Nachrichten an alle zugewiesenen Benutzer
      const creator = await User.findById(userId).select('firstName lastName').lean();
      const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'System';
      
      let patientName = 'N/A';
      if (task.patientId && typeof task.patientId === 'object') {
        patientName = `${task.patientId.firstName || ''} ${task.patientId.lastName || ''}`.trim() || 'Unbekannt';
      }

      const systemUser = await User.findOne({ 
        role: { $in: ['admin', 'super_admin'] }, 
        isActive: true 
      }).select('_id').lean();
      const senderId = systemUser?._id || userId;

      const notificationPromises = assignedUsers.map(async (assignedUser) => {
        try {
          const subject = `Neue Aufgabe: ${title}`;
          const message = `Hallo ${assignedUser.firstName},\n\n` +
                        `Ihnen wurde eine neue Aufgabe zugewiesen:\n\n` +
                        `Titel: ${title}\n` +
                        `Beschreibung: ${description || 'Keine Beschreibung'}\n` +
                        `Priorität: ${priority || 'Mittel'}\n` +
                        `Fällig bis: ${dueDate ? new Date(dueDate).toLocaleDateString('de-DE') : 'Kein Datum'}\n` +
                        `Patient: ${patientName}\n` +
                        `Zugewiesen von: ${creatorName}\n\n` +
                        `Bitte überprüfen Sie die Aufgabe im Dashboard.`;

          const notification = new InternalMessage({
            senderId: senderId,
            recipientId: assignedUser._id,
            subject: subject,
            message: message,
            priority: priority === 'urgent' ? 'urgent' : priority === 'high' ? 'high' : 'normal',
            status: 'sent',
            patientId: patientId || undefined,
            relatedResource: {
              type: 'Task',
              id: task._id
            }
          });

          await notification.save();
          console.log(`✅ Task Notification: Sent to ${assignedUser.firstName} ${assignedUser.lastName} for task ${task._id}`);
          return { success: true, userId: assignedUser._id };
        } catch (err) {
          console.error(`❌ Fehler beim Senden der Benachrichtigung an ${assignedUser.firstName}:`, err);
          return { success: false, userId: assignedUser._id, error: err.message };
        }
      });

      await Promise.all(notificationPromises);

      res.status(201).json({
        success: true,
        message: 'Aufgabe erfolgreich erstellt',
        data: task
      });
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Aufgabe:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen der Aufgabe',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/tasks/all-users
 * @desc    Alle aktiven Benutzer abrufen (für Zuweisung)
 * @access  Private (nur Mediziner)
 */
router.get('/all-users', auth, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Benutzer nicht authentifiziert'
      });
    }

    // Prüfe ob Benutzer Mediziner ist
    const user = await User.findById(userId).select('role');
    if (!user || !MEDICAL_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Nur Mediziner können diese Liste abrufen'
      });
    }

    const allUsers = await User.find({ isActive: true })
      .select('firstName lastName role email')
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    res.json({
      success: true,
      data: allUsers
    });
  } catch (error) {
    console.error('❌ Fehler beim Abrufen aller Benutzer:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen aller Benutzer',
      error: error.message
    });
  }
});

module.exports = router;
