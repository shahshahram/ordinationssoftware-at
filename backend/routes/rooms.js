const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Room = require('../models/Room');
const AuditLog = require('../models/AuditLog');

// Helper to create audit log
const createAuditLog = async (userId, action, entityType, entityId, details = {}) => {
  try {
    await AuditLog.create({
      userId,
      userEmail: 'system@ordinationssoftware.at',
      userRole: 'system',
      action,
      resource: entityType,
      resourceId: entityId,
      description: `Action: ${action} on ${entityType} ${entityId}`,
      details,
      ipAddress: '::1',
      success: true,
    });
  } catch (error) {
    console.error('Audit log creation failed:', error);
  }
};

// @route   GET /api/rooms
// @desc    Get all rooms
// @access  Private (requires 'resources.read' permission)
router.get('/', auth, async (req, res) => {
  if (!req.user.permissions.includes('resources.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const { type, isBookable, isOnlineBookable, search } = req.query;
    let query = {};

    if (type) query.type = type;
    if (isBookable !== undefined) query.isBookable = isBookable === 'true';
    if (isOnlineBookable !== undefined) query.isOnlineBookable = isOnlineBookable === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const rooms = await Room.find(query)
      .sort({ name: 1 });

    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Räume', error: error.message });
  }
});

// @route   GET /api/rooms/:id
// @desc    Get single room by ID
// @access  Private (requires 'resources.read' permission)
router.get('/:id', auth, async (req, res) => {
  if (!req.user.permissions.includes('resources.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Raum nicht gefunden' });
    }

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen des Raums', error: error.message });
  }
});

// @route   POST /api/rooms
// @desc    Create a new room
// @access  Private (requires 'resources.write' permission)
router.post('/', auth, [
  body('name').notEmpty().withMessage('Name ist erforderlich'),
  body('type').isIn(['consultation', 'treatment', 'surgery', 'waiting', 'office', 'storage', 'other']).withMessage('Ungültiger Raumtyp'),
  body('category').isIn(['medical', 'administrative', 'common', 'specialized']).withMessage('Ungültige Kategorie'),
  body('colorHex').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Farbe muss im Format #RRGGBB sein'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Kapazität muss mindestens 1 sein'),
], async (req, res) => {
  if (!req.user.permissions.includes('resources.write') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
  }

  try {
    const newRoom = new Room(req.body);
    await newRoom.save();

    await createAuditLog(req.user._id, 'rooms.create', 'Room', newRoom._id, newRoom.toObject());
    res.status(201).json({ success: true, data: newRoom });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Erstellen des Raums', error: error.message });
  }
});

// @route   PUT /api/rooms/:id
// @desc    Update a room
// @access  Private (requires 'resources.write' permission)
router.put('/:id', auth, [
  body('name').optional().notEmpty().withMessage('Name darf nicht leer sein'),
  body('type').optional().isIn(['consultation', 'treatment', 'surgery', 'waiting', 'office', 'storage', 'other']).withMessage('Ungültiger Raumtyp'),
  body('category').optional().isIn(['medical', 'administrative', 'common', 'specialized']).withMessage('Ungültige Kategorie'),
  body('colorHex').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Farbe muss im Format #RRGGBB sein'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Kapazität muss mindestens 1 sein'),
], async (req, res) => {
  if (!req.user.permissions.includes('resources.write') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
  }

  try {
    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedRoom) {
      return res.status(404).json({ success: false, message: 'Raum nicht gefunden' });
    }

    await createAuditLog(req.user._id, 'rooms.update', 'Room', updatedRoom._id, { old: req.originalRoom, new: updatedRoom.toObject() });
    res.status(200).json({ success: true, data: updatedRoom });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Raums', error: error.message });
  }
});

// @route   DELETE /api/rooms/:id
// @desc    Delete a room
// @access  Private (requires 'resources.delete' permission)
router.delete('/:id', auth, async (req, res) => {
  if (!req.user.permissions.includes('resources.delete') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const deletedRoom = await Room.findByIdAndDelete(req.params.id);
    if (!deletedRoom) {
      return res.status(404).json({ success: false, message: 'Raum nicht gefunden' });
    }

    await createAuditLog(req.user._id, 'rooms.delete', 'Room', req.params.id, deletedRoom.toObject());
    res.status(200).json({ success: true, message: 'Raum erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Löschen des Raums', error: error.message });
  }
});

// @route   GET /api/rooms/bookable
// @desc    Get all bookable rooms
// @access  Public (for online booking)
router.get('/bookable', async (req, res) => {
  try {
    const rooms = await Room.getBookableRooms();
    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    console.error('Error fetching bookable rooms:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der buchbaren Räume', error: error.message });
  }
});

// @route   GET /api/rooms/online-bookable
// @desc    Get all online bookable rooms
// @access  Public (for online booking)
router.get('/online-bookable', async (req, res) => {
  try {
    const rooms = await Room.getOnlineBookableRooms();
    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    console.error('Error fetching online bookable rooms:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der online buchbaren Räume', error: error.message });
  }
});

// @route   GET /api/rooms/type/:type
// @desc    Get rooms by type
// @access  Private (requires 'resources.read' permission)
router.get('/type/:type', auth, async (req, res) => {
  if (!req.user.permissions.includes('resources.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const rooms = await Room.getRoomsByType(req.params.type);
    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    console.error('Error fetching rooms by type:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Räume nach Typ', error: error.message });
  }
});

module.exports = router;
