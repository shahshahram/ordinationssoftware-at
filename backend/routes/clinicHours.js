const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const ClinicHours = require('../models/ClinicHours');
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

// @route   GET /api/clinic-hours
// @desc    Get all clinic hours
// @access  Private (requires 'settings.read' permission)
router.get('/', auth, async (req, res) => {
  if (!req.user.permissions.includes('settings.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const clinicHours = await ClinicHours.find()
      .sort({ validFrom: 1 });

    res.status(200).json({ success: true, data: clinicHours });
  } catch (error) {
    console.error('Error fetching clinic hours:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Öffnungszeiten', error: error.message });
  }
});

// @route   GET /api/clinic-hours/:id
// @desc    Get single clinic hours by ID
// @access  Private (requires 'settings.read' permission)
router.get('/:id', auth, async (req, res) => {
  if (!req.user.permissions.includes('settings.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const clinicHours = await ClinicHours.findById(req.params.id);

    if (!clinicHours) {
      return res.status(404).json({ success: false, message: 'Öffnungszeiten nicht gefunden' });
    }

    res.status(200).json({ success: true, data: clinicHours });
  } catch (error) {
    console.error('Error fetching clinic hours:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Öffnungszeiten', error: error.message });
  }
});

// @route   POST /api/clinic-hours
// @desc    Create new clinic hours
// @access  Private (requires 'settings.write' permission)
router.post('/', auth, [
  body('rrule').notEmpty().withMessage('RRULE ist erforderlich'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Startzeit muss im Format HH:MM sein'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Endzeit muss im Format HH:MM sein'),
  body('weekdays').isArray().withMessage('Wochentage müssen ein Array sein'),
  body('weekdays.*').isInt({ min: 0, max: 6 }).withMessage('Wochentage müssen zwischen 0 und 6 liegen'),
], async (req, res) => {
  if (!req.user.permissions.includes('settings.write') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
  }

  try {
    const newClinicHours = new ClinicHours(req.body);
    await newClinicHours.save();

    await createAuditLog(req.user._id, 'clinic-hours.create', 'ClinicHours', newClinicHours._id, newClinicHours.toObject());
    res.status(201).json({ success: true, data: newClinicHours });
  } catch (error) {
    console.error('Error creating clinic hours:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Erstellen der Öffnungszeiten', error: error.message });
  }
});

// @route   PUT /api/clinic-hours/:id
// @desc    Update clinic hours
// @access  Private (requires 'settings.write' permission)
router.put('/:id', auth, [
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Startzeit muss im Format HH:MM sein'),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Endzeit muss im Format HH:MM sein'),
  body('weekdays').optional().isArray().withMessage('Wochentage müssen ein Array sein'),
  body('weekdays.*').optional().isInt({ min: 0, max: 6 }).withMessage('Wochentage müssen zwischen 0 und 6 liegen'),
], async (req, res) => {
  if (!req.user.permissions.includes('settings.write') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
  }

  try {
    const updatedClinicHours = await ClinicHours.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedClinicHours) {
      return res.status(404).json({ success: false, message: 'Öffnungszeiten nicht gefunden' });
    }

    await createAuditLog(req.user._id, 'clinic-hours.update', 'ClinicHours', updatedClinicHours._id, { old: req.originalClinicHours, new: updatedClinicHours.toObject() });
    res.status(200).json({ success: true, data: updatedClinicHours });
  } catch (error) {
    console.error('Error updating clinic hours:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren der Öffnungszeiten', error: error.message });
  }
});

// @route   DELETE /api/clinic-hours/:id
// @desc    Delete clinic hours
// @access  Private (requires 'settings.write' permission)
router.delete('/:id', auth, async (req, res) => {
  if (!req.user.permissions.includes('settings.write') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const deletedClinicHours = await ClinicHours.findByIdAndDelete(req.params.id);
    if (!deletedClinicHours) {
      return res.status(404).json({ success: false, message: 'Öffnungszeiten nicht gefunden' });
    }

    await createAuditLog(req.user._id, 'clinic-hours.delete', 'ClinicHours', req.params.id, deletedClinicHours.toObject());
    res.status(200).json({ success: true, message: 'Öffnungszeiten erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting clinic hours:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Löschen der Öffnungszeiten', error: error.message });
  }
});

// @route   GET /api/clinic-hours/active/current
// @desc    Get current active clinic hours
// @access  Public (for online booking)
router.get('/active/current', async (req, res) => {
  try {
    const activeHours = await ClinicHours.getActiveHours();
    res.status(200).json({ success: true, data: activeHours });
  } catch (error) {
    console.error('Error fetching active clinic hours:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der aktiven Öffnungszeiten', error: error.message });
  }
});

// @route   POST /api/clinic-hours/check-open
// @desc    Check if clinic is open at specific time
// @access  Public (for online booking)
router.post('/check-open', [
  body('date').isISO8601().withMessage('Datum muss ein gültiges Datum sein'),
  body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Zeit muss im Format HH:MM sein'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
  }

  try {
    const { date, time } = req.body;
    const isOpen = await ClinicHours.isClinicOpenAt(new Date(date), time);
    
    res.status(200).json({ success: true, data: { isOpen, date, time } });
  } catch (error) {
    console.error('Error checking clinic hours:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Prüfen der Öffnungszeiten', error: error.message });
  }
});

module.exports = router;
