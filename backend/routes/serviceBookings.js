const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const ServiceBooking = require('../models/ServiceBooking');
const ServiceCatalog = require('../models/ServiceCatalog');
const Patient = require('../models/Patient');
const Location = require('../models/Location');
const StaffProfile = require('../models/StaffProfile');
const AuditLog = require('../models/AuditLog');

// GET /api/service-bookings - Alle Buchungen abrufen
router.get('/', auth, checkPermission('bookings.read'), async (req, res) => {
  try {
    const {
      location_id,
      patient_id,
      staff_id,
      status,
      booking_type,
      start_date,
      end_date,
      page = 1,
      limit = 50
    } = req.query;

    // Filter aufbauen
    const filter = {};
    
    if (location_id) filter.location_id = location_id;
    if (patient_id) filter.patient_id = patient_id;
    if (staff_id) filter.assigned_staff_id = staff_id;
    if (status) filter.status = status;
    if (booking_type) filter.booking_type = booking_type;
    
    if (start_date || end_date) {
      filter.start_time = {};
      if (start_date) filter.start_time.$gte = new Date(start_date);
      if (end_date) filter.start_time.$lte = new Date(end_date);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const bookings = await ServiceBooking.find(filter)
      .populate('service_id', 'name code base_duration_min')
      .populate('patient_id', 'firstName lastName dateOfBirth')
      .populate('location_id', 'name code')
      .populate('assigned_staff_id', 'display_name role_hint')
      .populate('room_id', 'name')
      .populate('device_id', 'name type')
      .populate('createdBy', 'firstName lastName')
      .sort({ start_time: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ServiceBooking.countDocuments(filter);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Buchungen'
    });
  }
});

// GET /api/service-bookings/:id - Einzelne Buchung abrufen
router.get('/:id', auth, checkPermission('bookings.read'), async (req, res) => {
  try {
    const booking = await ServiceBooking.findById(req.params.id)
      .populate('service_id', 'name code base_duration_min description')
      .populate('patient_id', 'firstName lastName dateOfBirth phone email')
      .populate('location_id', 'name code address_line1 city')
      .populate('assigned_staff_id', 'display_name role_hint email')
      .populate('room_id', 'name')
      .populate('device_id', 'name type')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Buchung nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Buchung'
    });
  }
});

// POST /api/service-bookings - Neue Buchung erstellen
router.post('/', [
  auth,
  checkPermission('bookings.write'),
  body('service_id').isMongoId().withMessage('Ungültige Service-ID'),
  body('patient_id').isMongoId().withMessage('Ungültige Patienten-ID'),
  body('location_id').isMongoId().withMessage('Ungültige Standort-ID'),
  body('assigned_staff_id').isMongoId().withMessage('Ungültige Mitarbeiter-ID'),
  body('start_time').isISO8601().withMessage('Ungültige Startzeit'),
  body('end_time').isISO8601().withMessage('Ungültige Endzeit'),
  body('booking_type').isIn(['online', 'internal', 'phone', 'walk_in']).withMessage('Ungültiger Buchungstyp'),
  body('status').optional().isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
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

    const {
      service_id,
      patient_id,
      location_id,
      assigned_staff_id,
      start_time,
      end_time,
      room_id,
      device_id,
      booking_type,
      notes,
      consent_given
    } = req.body;

    // Service prüfen
    const service = await ServiceCatalog.findById(service_id);
    if (!service) {
      return res.status(400).json({
        success: false,
        message: 'Service nicht gefunden'
      });
    }

    // Patient prüfen
    const patient = await Patient.findById(patient_id);
    if (!patient) {
      return res.status(400).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    // Altersprüfung
    if (!service.isEligibleForPatient(patient.age)) {
      return res.status(400).json({
        success: false,
        message: 'Patient erfüllt nicht die Altersanforderungen für diese Leistung'
      });
    }

    // Mitarbeiter prüfen
    const staff = await StaffProfile.findById(assigned_staff_id);
    if (!staff) {
      return res.status(400).json({
        success: false,
        message: 'Mitarbeiter nicht gefunden'
      });
    }

    // Rollenprüfung
    if (!service.canBePerformedBy(staff.role_hint)) {
      return res.status(400).json({
        success: false,
        message: 'Mitarbeiter hat nicht die erforderliche Rolle für diese Leistung'
      });
    }

    // Kollisionsprüfung
    const conflicts = await ServiceBooking.find({
      location_id,
      assigned_staff_id,
      status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
      $or: [
        { start_time: { $lt: end_time }, end_time: { $gt: start_time } }
      ]
    });

    if (conflicts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Zeitkonflikt: Mitarbeiter ist bereits zu dieser Zeit eingeteilt',
        conflicts: conflicts.map(c => ({
          id: c._id,
          start_time: c.start_time,
          end_time: c.end_time,
          service: c.service_id
        }))
      });
    }

    // Einwilligung prüfen
    if (service.requires_consent && !consent_given) {
      return res.status(400).json({
        success: false,
        message: 'Einwilligung ist für diese Leistung erforderlich'
      });
    }

    const bookingData = {
      service_id,
      patient_id,
      location_id,
      assigned_staff_id,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      room_id,
      device_id,
      booking_type,
      notes,
      consent_given: consent_given || false,
      consent_date: consent_given ? new Date() : null,
      createdBy: req.user.id
    };

    const booking = new ServiceBooking(bookingData);
    await booking.save();

    // Audit Log
    await AuditLog.create({
      action: 'service-bookings.create',
      resource: 'ServiceBooking',
      resourceId: booking._id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      description: `Buchung für "${service.name}" erstellt`,
      details: {
        service_name: service.name,
        patient_name: `${patient.firstName} ${patient.lastName}`,
        staff_name: staff.display_name,
        start_time: booking.start_time,
        booking_type: booking.booking_type
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Buchung erfolgreich erstellt',
      data: booking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Buchung',
      error: error.message
    });
  }
});

// PUT /api/service-bookings/:id - Buchung aktualisieren
router.put('/:id', [
  auth,
  checkPermission('bookings.write'),
  body('start_time').optional().isISO8601().withMessage('Ungültige Startzeit'),
  body('end_time').optional().isISO8601().withMessage('Ungültige Endzeit'),
  body('status').optional().isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  body('booking_type').optional().isIn(['online', 'internal', 'phone', 'walk_in'])
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

    const booking = await ServiceBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Buchung nicht gefunden'
      });
    }

    // Stornierung behandeln
    if (req.body.status === 'cancelled' && booking.status !== 'cancelled') {
      if (!booking.canBeCancelled()) {
        return res.status(400).json({
          success: false,
          message: 'Buchung kann nicht mehr storniert werden (weniger als 2 Stunden vor Start)'
        });
      }

      req.body.cancelled_at = new Date();
      req.body.cancelled_by = req.user.id;
    }

    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    const updatedBooking = await ServiceBooking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Audit Log
    await AuditLog.create({
      action: 'bookings.update',
      entity_type: 'ServiceBooking',
      entity_id: booking._id,
      user_id: req.user.id,
      details: {
        changes: req.body,
        old_status: booking.status,
        new_status: updatedBooking.status
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Buchung erfolgreich aktualisiert',
      data: updatedBooking
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Buchung',
      error: error.message
    });
  }
});

// DELETE /api/service-bookings/:id - Buchung löschen
router.delete('/:id', auth, checkPermission('bookings.delete'), async (req, res) => {
  try {
    const booking = await ServiceBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Buchung nicht gefunden'
      });
    }

    // Nur zukünftige Buchungen können gelöscht werden
    if (booking.start_time <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Vergangene Buchungen können nicht gelöscht werden'
      });
    }

    await ServiceBooking.findByIdAndDelete(req.params.id);

    // Audit Log
    await AuditLog.create({
      action: 'service-bookings.delete',
      resource: 'ServiceBooking',
      resourceId: booking._id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      description: `Buchung gelöscht`,
      details: {
        service_id: booking.service_id,
        patient_id: booking.patient_id,
        start_time: booking.start_time
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Buchung erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Buchung',
      error: error.message
    });
  }
});

// GET /api/service-bookings/availability - Verfügbarkeit prüfen
router.get('/availability/check', [
  auth,
  checkPermission('bookings.read'),
  query('location_id').isMongoId().withMessage('Ungültige Standort-ID'),
  query('staff_id').isMongoId().withMessage('Ungültige Mitarbeiter-ID'),
  query('start_time').isISO8601().withMessage('Ungültige Startzeit'),
  query('end_time').isISO8601().withMessage('Ungültige Endzeit')
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

    const { location_id, staff_id, start_time, end_time } = req.query;

    const conflicts = await ServiceBooking.find({
      location_id,
      assigned_staff_id: staff_id,
      status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
      $or: [
        { start_time: { $lt: new Date(end_time) }, end_time: { $gt: new Date(start_time) } }
      ]
    }).populate('service_id', 'name code');

    const isAvailable = conflicts.length === 0;

    res.json({
      success: true,
      data: {
        isAvailable,
        conflicts: conflicts.map(c => ({
          id: c._id,
          start_time: c.start_time,
          end_time: c.end_time,
          service: c.service_id
        }))
      }
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Verfügbarkeitsprüfung',
      error: error.message
    });
  }
});

module.exports = router;
