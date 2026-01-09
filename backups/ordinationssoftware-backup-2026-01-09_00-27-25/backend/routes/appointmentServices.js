const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const AppointmentService = require('../models/AppointmentService');
const Appointment = require('../models/Appointment');
const ServiceCatalog = require('../models/ServiceCatalog');
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

// @route   GET /api/appointment-services
// @desc    Get all appointment services (optionally filtered by appointmentId)
// @access  Private (requires 'appointments.read' permission)
router.get('/', auth, async (req, res) => {
  if (!req.user.permissions.includes('appointments.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const { appointmentId, serviceId, status } = req.query;
    let query = {};

    if (appointmentId) query.appointmentId = appointmentId;
    if (serviceId) query.serviceId = serviceId;
    if (status) query.status = status;

    const services = await AppointmentService.find(query)
      .populate('appointmentId', 'title startsAt endsAt')
      .populate('serviceId', 'name code category duration prices')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: services });
  } catch (error) {
    console.error('Error fetching appointment services:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Termin-Leistungen', error: error.message });
  }
});

// @route   GET /api/appointment-services/:id
// @desc    Get single appointment service by ID
// @access  Private (requires 'appointments.read' permission)
router.get('/:id', auth, async (req, res) => {
  if (!req.user.permissions.includes('appointments.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const service = await AppointmentService.findById(req.params.id)
      .populate('appointmentId', 'title startsAt endsAt')
      .populate('serviceId', 'name code category duration prices');

    if (!service) {
      return res.status(404).json({ success: false, message: 'Termin-Leistung nicht gefunden' });
    }

    res.status(200).json({ success: true, data: service });
  } catch (error) {
    console.error('Error fetching appointment service:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Termin-Leistung', error: error.message });
  }
});

// @route   POST /api/appointment-services
// @desc    Create a new appointment service
// @access  Private (requires 'appointments.write' permission)
router.post('/', auth, [
  body('appointmentId').notEmpty().withMessage('Termin-ID ist erforderlich').isMongoId().withMessage('Ungültige Termin-ID'),
  body('serviceId').notEmpty().withMessage('Service-ID ist erforderlich').isMongoId().withMessage('Ungültige Service-ID'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Menge muss mindestens 1 sein'),
  body('pricePerUnit').optional().isNumeric().withMessage('Preis pro Einheit muss eine Zahl sein'),
  body('status').optional().isIn(['planned', 'performed', 'billed', 'cancelled']).withMessage('Ungültiger Status'),
], async (req, res) => {
  if (!req.user.permissions.includes('appointments.write') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
  }

  try {
    const { appointmentId, serviceId, quantity, pricePerUnit, status, notes } = req.body;

    // Check if appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Termin nicht gefunden' });
    }

    // Check if service exists
    const service = await ServiceCatalog.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Leistung nicht gefunden' });
    }

    // Check if service already exists for this appointment
    const existingService = await AppointmentService.findOne({ appointmentId, serviceId });
    if (existingService) {
      return res.status(400).json({ success: false, message: 'Leistung ist bereits für diesen Termin eingetragen' });
    }

    const newAppointmentService = new AppointmentService({
      appointmentId,
      serviceId,
      quantity: quantity || 1,
      pricePerUnit: pricePerUnit || service.prices.privat || 0,
      status: status || 'planned',
      notes
    });

    await newAppointmentService.save();
    await newAppointmentService.populate('appointmentId', 'title startsAt endsAt');
    await newAppointmentService.populate('serviceId', 'name code category duration prices');

    await createAuditLog(req.user._id, 'appointment-services.create', 'AppointmentService', newAppointmentService._id, newAppointmentService.toObject());
    res.status(201).json({ success: true, data: newAppointmentService });
  } catch (error) {
    console.error('Error creating appointment service:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Erstellen der Termin-Leistung', error: error.message });
  }
});

// @route   PUT /api/appointment-services/:id
// @desc    Update an appointment service
// @access  Private (requires 'appointments.write' permission)
router.put('/:id', auth, [
  body('quantity').optional().isInt({ min: 1 }).withMessage('Menge muss mindestens 1 sein'),
  body('pricePerUnit').optional().isNumeric().withMessage('Preis pro Einheit muss eine Zahl sein'),
  body('status').optional().isIn(['planned', 'performed', 'billed', 'cancelled']).withMessage('Ungültiger Status'),
], async (req, res) => {
  if (!req.user.permissions.includes('appointments.write') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
  }

  try {
    const updatedService = await AppointmentService.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('appointmentId', 'title startsAt endsAt')
     .populate('serviceId', 'name code category duration prices');

    if (!updatedService) {
      return res.status(404).json({ success: false, message: 'Termin-Leistung nicht gefunden' });
    }

    await createAuditLog(req.user._id, 'appointment-services.update', 'AppointmentService', updatedService._id, { old: req.originalService, new: updatedService.toObject() });
    res.status(200).json({ success: true, data: updatedService });
  } catch (error) {
    console.error('Error updating appointment service:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren der Termin-Leistung', error: error.message });
  }
});

// @route   DELETE /api/appointment-services/:id
// @desc    Delete an appointment service
// @access  Private (requires 'appointments.write' permission)
router.delete('/:id', auth, async (req, res) => {
  if (!req.user.permissions.includes('appointments.write') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const deletedService = await AppointmentService.findByIdAndDelete(req.params.id);
    if (!deletedService) {
      return res.status(404).json({ success: false, message: 'Termin-Leistung nicht gefunden' });
    }

    await createAuditLog(req.user._id, 'appointment-services.delete', 'AppointmentService', req.params.id, deletedService.toObject());
    res.status(200).json({ success: true, message: 'Termin-Leistung erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting appointment service:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Löschen der Termin-Leistung', error: error.message });
  }
});

// @route   GET /api/appointment-services/appointment/:appointmentId
// @desc    Get all services for a specific appointment
// @access  Private (requires 'appointments.read' permission)
router.get('/appointment/:appointmentId', auth, async (req, res) => {
  if (!req.user.permissions.includes('appointments.read') && !req.user.permissions.includes('admin')) {
    return res.status(403).json({ success: false, message: 'Nicht autorisiert: Fehlende Berechtigung' });
  }
  
  try {
    const services = await AppointmentService.find({ appointmentId: req.params.appointmentId })
      .populate('serviceId', 'name code category duration prices')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: services });
  } catch (error) {
    console.error('Error fetching appointment services:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Termin-Leistungen', error: error.message });
  }
});

module.exports = router;
