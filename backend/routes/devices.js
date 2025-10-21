const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Device = require('../models/Device');
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

// @route   GET /api/devices
// @desc    Get all devices
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

    const devices = await Device.find(query)
      .sort({ name: 1 });

    res.status(200).json({ success: true, data: devices });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Geräte', error: error.message });
  }
});

// @route   GET /api/devices/:id
// @desc    Get single device by ID
// @access  Private (requires 'resources.read' permission)
router.get('/:id', auth, async (req, res) => {
  if (!req.user.permissions.includes('resources.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ success: false, message: 'Gerät nicht gefunden' });
    }

    res.status(200).json({ success: true, data: device });
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen des Geräts', error: error.message });
  }
});

// @route   POST /api/devices
// @desc    Create a new device
// @access  Private (requires 'resources.write' permission)
router.post('/', auth, [
  body('name').notEmpty().withMessage('Name ist erforderlich'),
  body('type').isIn(['EKG', 'Ultraschall', 'Röntgen', 'Blutdruckmessgerät', 'Stethoskop', 'Computer', 'Printer', 'Scanner', 'other']).withMessage('Ungültiger Gerätetyp'),
  body('category').isIn(['medical', 'diagnostic', 'therapeutic', 'administrative', 'other']).withMessage('Ungültige Kategorie'),
  body('colorHex').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Farbe muss im Format #RRGGBB sein'),
], async (req, res) => {
  if (!req.user.permissions.includes('resources.write') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
  }

  try {
    const newDevice = new Device(req.body);
    await newDevice.save();

    await createAuditLog(req.user._id, 'devices.create', 'Device', newDevice._id, newDevice.toObject());
    res.status(201).json({ success: true, data: newDevice });
  } catch (error) {
    console.error('Error creating device:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Erstellen des Geräts', error: error.message });
  }
});

// @route   PUT /api/devices/:id
// @desc    Update a device
// @access  Private (requires 'resources.write' permission)
router.put('/:id', auth, [
  body('name').optional().notEmpty().withMessage('Name darf nicht leer sein'),
  body('type').optional().isIn(['EKG', 'Ultraschall', 'Röntgen', 'Blutdruckmessgerät', 'Stethoskop', 'Computer', 'Printer', 'Scanner', 'other']).withMessage('Ungültiger Gerätetyp'),
  body('category').optional().isIn(['medical', 'diagnostic', 'therapeutic', 'administrative', 'other']).withMessage('Ungültige Kategorie'),
  body('colorHex').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Farbe muss im Format #RRGGBB sein'),
], async (req, res) => {
  if (!req.user.permissions.includes('resources.write') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
  }

  try {
    const updatedDevice = await Device.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedDevice) {
      return res.status(404).json({ success: false, message: 'Gerät nicht gefunden' });
    }

    await createAuditLog(req.user._id, 'devices.update', 'Device', updatedDevice._id, { old: req.originalDevice, new: updatedDevice.toObject() });
    res.status(200).json({ success: true, data: updatedDevice });
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Geräts', error: error.message });
  }
});

// @route   DELETE /api/devices/:id
// @desc    Delete a device
// @access  Private (requires 'resources.delete' permission)
router.delete('/:id', auth, async (req, res) => {
  if (!req.user.permissions.includes('resources.delete') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const deletedDevice = await Device.findByIdAndDelete(req.params.id);
    if (!deletedDevice) {
      return res.status(404).json({ success: false, message: 'Gerät nicht gefunden' });
    }

    await createAuditLog(req.user._id, 'devices.delete', 'Device', req.params.id, deletedDevice.toObject());
    res.status(200).json({ success: true, message: 'Gerät erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Löschen des Geräts', error: error.message });
  }
});

// @route   GET /api/devices/bookable
// @desc    Get all bookable devices
// @access  Public (for online booking)
router.get('/bookable', async (req, res) => {
  try {
    const devices = await Device.getBookableDevices();
    res.status(200).json({ success: true, data: devices });
  } catch (error) {
    console.error('Error fetching bookable devices:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der buchbaren Geräte', error: error.message });
  }
});

// @route   GET /api/devices/online-bookable
// @desc    Get all online bookable devices
// @access  Public (for online booking)
router.get('/online-bookable', async (req, res) => {
  try {
    const devices = await Device.getOnlineBookableDevices();
    res.status(200).json({ success: true, data: devices });
  } catch (error) {
    console.error('Error fetching online bookable devices:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der online buchbaren Geräte', error: error.message });
  }
});

// @route   GET /api/devices/type/:type
// @desc    Get devices by type
// @access  Private (requires 'resources.read' permission)
router.get('/type/:type', auth, async (req, res) => {
  if (!req.user.permissions.includes('resources.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const devices = await Device.getDevicesByType(req.params.type);
    res.status(200).json({ success: true, data: devices });
  } catch (error) {
    console.error('Error fetching devices by type:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Geräte nach Typ', error: error.message });
  }
});

// @route   GET /api/devices/maintenance/needed
// @desc    Get devices needing maintenance
// @access  Private (requires 'resources.read' permission)
router.get('/maintenance/needed', auth, async (req, res) => {
  if (!req.user.permissions.includes('resources.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const devices = await Device.getDevicesNeedingMaintenance();
    res.status(200).json({ success: true, data: devices });
  } catch (error) {
    console.error('Error fetching devices needing maintenance:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der wartungsbedürftigen Geräte', error: error.message });
  }
});

module.exports = router;
