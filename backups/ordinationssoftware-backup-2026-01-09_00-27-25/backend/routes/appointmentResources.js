const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const AppointmentResource = require('../models/AppointmentResource');
const Appointment = require('../models/Appointment');
const Resource = require('../models/Resource');
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

// @route   GET /api/appointment-resources
// @desc    Get all appointment resources (optionally filtered by appointmentId)
// @access  Private (requires 'appointments.read' permission)
router.get('/', auth, async (req, res) => {
  if (!req.user.permissions.includes('appointments.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const { appointmentId, resourceId, status } = req.query;
    let query = {};

    if (appointmentId) query.appointmentId = appointmentId;
    if (resourceId) query.resourceId = resourceId;
    if (status) query.status = status;

    const resources = await AppointmentResource.find(query)
      .populate('appointmentId', 'title startsAt endsAt')
      .populate('resourceId', 'name type category description location')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: resources });
  } catch (error) {
    console.error('Error fetching appointment resources:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Termin-Ressourcen', error: error.message });
  }
});

// @route   GET /api/appointment-resources/:id
// @desc    Get single appointment resource by ID
// @access  Private (requires 'appointments.read' permission)
router.get('/:id', auth, async (req, res) => {
  if (!req.user.permissions.includes('appointments.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const resource = await AppointmentResource.findById(req.params.id)
      .populate('appointmentId', 'title startsAt endsAt')
      .populate('resourceId', 'name type category description location');

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Termin-Ressource nicht gefunden' });
    }

    res.status(200).json({ success: true, data: resource });
  } catch (error) {
    console.error('Error fetching appointment resource:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Termin-Ressource', error: error.message });
  }
});

// @route   POST /api/appointment-resources
// @desc    Create a new appointment resource
// @access  Private (requires 'appointments.write' permission)
router.post('/', auth, [
  body('appointmentId').notEmpty().withMessage('Termin-ID ist erforderlich').isMongoId().withMessage('Ungültige Termin-ID'),
  body('resourceId').notEmpty().withMessage('Ressourcen-ID ist erforderlich').isMongoId().withMessage('Ungültige Ressourcen-ID'),
  body('startsAt').optional().isISO8601().withMessage('Startzeit muss ein gültiges Datum sein'),
  body('endsAt').optional().isISO8601().withMessage('Endzeit muss ein gültiges Datum sein'),
  body('status').optional().isIn(['confirmed', 'pending', 'cancelled']).withMessage('Ungültiger Status'),
], async (req, res) => {
  if (!req.user.permissions.includes('appointments.write') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
  }

  try {
    const { appointmentId, resourceId, startsAt, endsAt, status } = req.body;

    // Check if appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Termin nicht gefunden' });
    }

    // Check if resource exists
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Ressource nicht gefunden' });
    }

    // Check if resource already exists for this appointment
    const existingResource = await AppointmentResource.findOne({ appointmentId, resourceId });
    if (existingResource) {
      return res.status(400).json({ success: false, message: 'Ressource ist bereits für diesen Termin gebucht' });
    }

    const newAppointmentResource = new AppointmentResource({
      appointmentId,
      resourceId,
      startsAt: startsAt || appointment.startsAt,
      endsAt: endsAt || appointment.endsAt,
      status: status || 'confirmed'
    });

    await newAppointmentResource.save();
    await newAppointmentResource.populate('appointmentId', 'title startsAt endsAt');
    await newAppointmentResource.populate('resourceId', 'name type category description location');

    await createAuditLog(req.user._id, 'appointment-resources.create', 'AppointmentResource', newAppointmentResource._id, newAppointmentResource.toObject());
    res.status(201).json({ success: true, data: newAppointmentResource });
  } catch (error) {
    console.error('Error creating appointment resource:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Erstellen der Termin-Ressource', error: error.message });
  }
});

// @route   PUT /api/appointment-resources/:id
// @desc    Update an appointment resource
// @access  Private (requires 'appointments.write' permission)
router.put('/:id', auth, [
  body('startsAt').optional().isISO8601().withMessage('Startzeit muss ein gültiges Datum sein'),
  body('endsAt').optional().isISO8601().withMessage('Endzeit muss ein gültiges Datum sein'),
  body('status').optional().isIn(['confirmed', 'pending', 'cancelled']).withMessage('Ungültiger Status'),
], async (req, res) => {
  if (!req.user.permissions.includes('appointments.write') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
  }

  try {
    const updatedResource = await AppointmentResource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('appointmentId', 'title startsAt endsAt')
     .populate('resourceId', 'name type category description location');

    if (!updatedResource) {
      return res.status(404).json({ success: false, message: 'Termin-Ressource nicht gefunden' });
    }

    await createAuditLog(req.user._id, 'appointment-resources.update', 'AppointmentResource', updatedResource._id, { old: req.originalResource, new: updatedResource.toObject() });
    res.status(200).json({ success: true, data: updatedResource });
  } catch (error) {
    console.error('Error updating appointment resource:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren der Termin-Ressource', error: error.message });
  }
});

// @route   DELETE /api/appointment-resources/:id
// @desc    Delete an appointment resource
// @access  Private (requires 'appointments.write' permission)
router.delete('/:id', auth, async (req, res) => {
  if (!req.user.permissions.includes('appointments.write') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const deletedResource = await AppointmentResource.findByIdAndDelete(req.params.id);
    if (!deletedResource) {
      return res.status(404).json({ success: false, message: 'Termin-Ressource nicht gefunden' });
    }

    await createAuditLog(req.user._id, 'appointment-resources.delete', 'AppointmentResource', req.params.id, deletedResource.toObject());
    res.status(200).json({ success: true, message: 'Termin-Ressource erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting appointment resource:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Löschen der Termin-Ressource', error: error.message });
  }
});

// @route   GET /api/appointment-resources/appointment/:appointmentId
// @desc    Get all resources for a specific appointment
// @access  Private (requires 'appointments.read' permission)
router.get('/appointment/:appointmentId', auth, async (req, res) => {
  if (!req.user.permissions.includes('appointments.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const resources = await AppointmentResource.find({ appointmentId: req.params.appointmentId })
      .populate('resourceId', 'name type category description location')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: resources });
  } catch (error) {
    console.error('Error fetching appointment resources:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Termin-Ressourcen', error: error.message });
  }
});

module.exports = router;
