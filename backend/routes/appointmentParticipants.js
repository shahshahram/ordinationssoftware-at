const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const AppointmentParticipant = require('../models/AppointmentParticipant');
const Appointment = require('../models/Appointment');
const StaffProfile = require('../models/StaffProfile');
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

// @route   GET /api/appointment-participants
// @desc    Get all appointment participants (optionally filtered by appointmentId)
// @access  Private (requires 'appointments.read' permission)
router.get('/', auth, async (req, res) => {
  if (!req.user.permissions.includes('appointments.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const { appointmentId, staffId, status } = req.query;
    let query = {};

    if (appointmentId) query.appointmentId = appointmentId;
    if (staffId) query.staffId = staffId;
    if (status) query.status = status;

    const participants = await AppointmentParticipant.find(query)
      .populate('appointmentId', 'title startsAt endsAt')
      .populate('staffId', 'displayName roleHint colorHex')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: participants });
  } catch (error) {
    console.error('Error fetching appointment participants:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Termin-Teilnehmer', error: error.message });
  }
});

// @route   GET /api/appointment-participants/:id
// @desc    Get single appointment participant by ID
// @access  Private (requires 'appointments.read' permission)
router.get('/:id', auth, async (req, res) => {
  if (!req.user.permissions.includes('appointments.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const participant = await AppointmentParticipant.findById(req.params.id)
      .populate('appointmentId', 'title startsAt endsAt')
      .populate('staffId', 'displayName roleHint colorHex');

    if (!participant) {
      return res.status(404).json({ success: false, message: 'Termin-Teilnehmer nicht gefunden' });
    }

    res.status(200).json({ success: true, data: participant });
  } catch (error) {
    console.error('Error fetching appointment participant:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen des Termin-Teilnehmers', error: error.message });
  }
});

// @route   POST /api/appointment-participants
// @desc    Create a new appointment participant
// @access  Private (requires 'appointments.write' permission)
router.post('/', auth, [
  body('appointmentId').notEmpty().withMessage('Termin-ID ist erforderlich').isMongoId().withMessage('Ungültige Termin-ID'),
  body('staffId').notEmpty().withMessage('Personal-ID ist erforderlich').isMongoId().withMessage('Ungültige Personal-ID'),
  body('roleAtAppointment').optional().isIn(['main_doctor', 'assistant', 'therapist', 'observer']).withMessage('Ungültige Rolle'),
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
    const { appointmentId, staffId, roleAtAppointment, status } = req.body;

    // Check if appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Termin nicht gefunden' });
    }

    // Check if staff profile exists
    const staffProfile = await StaffProfile.findById(staffId);
    if (!staffProfile) {
      return res.status(404).json({ success: false, message: 'Personalprofil nicht gefunden' });
    }

    // Check if participant already exists for this appointment
    const existingParticipant = await AppointmentParticipant.findOne({ appointmentId, staffId });
    if (existingParticipant) {
      return res.status(400).json({ success: false, message: 'Person ist bereits für diesen Termin eingetragen' });
    }

    const newParticipant = new AppointmentParticipant({
      appointmentId,
      staffId,
      roleAtAppointment: roleAtAppointment || 'assistant',
      status: status || 'confirmed'
    });

    await newParticipant.save();
    await newParticipant.populate('appointmentId', 'title startsAt endsAt');
    await newParticipant.populate('staffId', 'displayName roleHint colorHex');

    await createAuditLog(req.user._id, 'appointment-participants.create', 'AppointmentParticipant', newParticipant._id, newParticipant.toObject());
    res.status(201).json({ success: true, data: newParticipant });
  } catch (error) {
    console.error('Error creating appointment participant:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Erstellen des Termin-Teilnehmers', error: error.message });
  }
});

// @route   PUT /api/appointment-participants/:id
// @desc    Update an appointment participant
// @access  Private (requires 'appointments.write' permission)
router.put('/:id', auth, [
  body('roleAtAppointment').optional().isIn(['main_doctor', 'assistant', 'therapist', 'observer']).withMessage('Ungültige Rolle'),
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
    const updatedParticipant = await AppointmentParticipant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('appointmentId', 'title startsAt endsAt')
     .populate('staffId', 'displayName roleHint colorHex');

    if (!updatedParticipant) {
      return res.status(404).json({ success: false, message: 'Termin-Teilnehmer nicht gefunden' });
    }

    await createAuditLog(req.user._id, 'appointment-participants.update', 'AppointmentParticipant', updatedParticipant._id, { old: req.originalParticipant, new: updatedParticipant.toObject() });
    res.status(200).json({ success: true, data: updatedParticipant });
  } catch (error) {
    console.error('Error updating appointment participant:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Termin-Teilnehmers', error: error.message });
  }
});

// @route   DELETE /api/appointment-participants/:id
// @desc    Delete an appointment participant
// @access  Private (requires 'appointments.write' permission)
router.delete('/:id', auth, async (req, res) => {
  if (!req.user.permissions.includes('appointments.write') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const deletedParticipant = await AppointmentParticipant.findByIdAndDelete(req.params.id);
    if (!deletedParticipant) {
      return res.status(404).json({ success: false, message: 'Termin-Teilnehmer nicht gefunden' });
    }

    await createAuditLog(req.user._id, 'appointment-participants.delete', 'AppointmentParticipant', req.params.id, deletedParticipant.toObject());
    res.status(200).json({ success: true, message: 'Termin-Teilnehmer erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting appointment participant:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Löschen des Termin-Teilnehmers', error: error.message });
  }
});

// @route   GET /api/appointment-participants/appointment/:appointmentId
// @desc    Get all participants for a specific appointment
// @access  Private (requires 'appointments.read' permission)
router.get('/appointment/:appointmentId', auth, async (req, res) => {
  if (!req.user.permissions.includes('appointments.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const participants = await AppointmentParticipant.find({ appointmentId: req.params.appointmentId })
      .populate('staffId', 'displayName roleHint colorHex')
      .sort({ roleAtAppointment: 1, createdAt: 1 });

    res.status(200).json({ success: true, data: participants });
  } catch (error) {
    console.error('Error fetching appointment participants:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Termin-Teilnehmer', error: error.message });
  }
});

module.exports = router;
