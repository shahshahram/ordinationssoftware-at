const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const AvailabilityService = require('../services/availabilityService');
const StaffProfile = require('../models/StaffProfile');
const ServiceCatalog = require('../models/ServiceCatalog');
const AuditLog = require('../models/AuditLog');

// Verfügbare Slots für einen Mitarbeiter abrufen
router.get('/slots', auth, [
  query('staffId').notEmpty().withMessage('Mitarbeiter-ID ist erforderlich'),
  query('startDate').isISO8601().withMessage('Startdatum muss ein gültiges Datum sein'),
  query('endDate').isISO8601().withMessage('Enddatum muss ein gültiges Datum sein'),
  query('serviceId').notEmpty().withMessage('Service-ID ist erforderlich')
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

    // Berechtigung prüfen
    if (!req.user.permissions.includes('appointments.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Abrufen von Verfügbarkeiten'
      });
    }

    const { staffId, startDate, endDate, serviceId } = req.query;

    // Prüfen ob Mitarbeiter existiert
    const staffProfile = await StaffProfile.findById(staffId);
    if (!staffProfile) {
      return res.status(404).json({
        success: false,
        message: 'Mitarbeiter nicht gefunden'
      });
    }

    // Prüfen ob Service existiert
    const service = await ServiceCatalog.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service nicht gefunden'
      });
    }

    const availableSlots = await AvailabilityService.getAvailableSlots(
      staffId,
      new Date(startDate),
      new Date(endDate),
      serviceId
    );

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'availability.read',
      description: 'Verfügbare Slots abgerufen',
      details: { staffId, startDate, endDate, serviceId, slotCount: availableSlots.length }
    });

    res.json({
      success: true,
      data: availableSlots
    });
  } catch (error) {
    console.error('Availability slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der verfügbaren Slots',
      error: error.message
    });
  }
});

// Verfügbarkeit für mehrere Mitarbeiter abrufen
router.get('/multi-staff', auth, [
  query('staffIds').notEmpty().withMessage('Mitarbeiter-IDs sind erforderlich'),
  query('startDate').isISO8601().withMessage('Startdatum muss ein gültiges Datum sein'),
  query('endDate').isISO8601().withMessage('Enddatum muss ein gültiges Datum sein'),
  query('serviceId').notEmpty().withMessage('Service-ID ist erforderlich')
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

    // Berechtigung prüfen
    if (!req.user.permissions.includes('appointments.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Abrufen von Verfügbarkeiten'
      });
    }

    const { staffIds, startDate, endDate, serviceId } = req.query;
    const staffIdArray = staffIds.split(',');

    const availability = await AvailabilityService.getMultiStaffAvailability(
      staffIdArray,
      new Date(startDate),
      new Date(endDate),
      serviceId
    );

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'availability.read',
      description: 'Multi-Staff Verfügbarkeit abgerufen',
      details: { staffIds: staffIdArray, startDate, endDate, serviceId }
    });

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Multi-staff availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Multi-Staff Verfügbarkeit',
      error: error.message
    });
  }
});

// Nächsten verfügbaren Termin finden
router.get('/next-available', auth, [
  query('staffId').notEmpty().withMessage('Mitarbeiter-ID ist erforderlich'),
  query('serviceId').notEmpty().withMessage('Service-ID ist erforderlich'),
  query('fromDate').optional().isISO8601().withMessage('From-Datum muss ein gültiges Datum sein')
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

    // Berechtigung prüfen
    if (!req.user.permissions.includes('appointments.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Abrufen von Verfügbarkeiten'
      });
    }

    const { staffId, serviceId, fromDate } = req.query;
    const from = fromDate ? new Date(fromDate) : new Date();

    const nextSlot = await AvailabilityService.findNextAvailableSlot(
      staffId,
      serviceId,
      from
    );

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'availability.read',
      description: 'Nächster verfügbarer Termin abgerufen',
      details: { staffId, serviceId, fromDate: from }
    });

    res.json({
      success: true,
      data: nextSlot
    });
  } catch (error) {
    console.error('Next available slot error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des nächsten verfügbaren Termins',
      error: error.message
    });
  }
});

// Termin-Buchbarkeit prüfen
router.post('/check-booking', auth, [
  query('staffId').notEmpty().withMessage('Mitarbeiter-ID ist erforderlich'),
  query('startTime').isISO8601().withMessage('Startzeit muss ein gültiges Datum sein'),
  query('endTime').isISO8601().withMessage('Endzeit muss ein gültiges Datum sein'),
  query('serviceId').notEmpty().withMessage('Service-ID ist erforderlich'),
  query('excludeAppointmentId').optional().isMongoId().withMessage('Exclude-Appointment-ID muss eine gültige MongoDB-ID sein')
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

    // Berechtigung prüfen
    if (!req.user.permissions.includes('appointments.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Prüfen der Buchbarkeit'
      });
    }

    const { staffId, startTime, endTime, serviceId, excludeAppointmentId } = req.query;

    const bookingCheck = await AvailabilityService.isTimeSlotBookable(
      staffId,
      new Date(startTime),
      new Date(endTime),
      serviceId,
      excludeAppointmentId
    );

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'availability.check',
      description: 'Termin-Buchbarkeit geprüft',
      details: { 
        staffId, 
        startTime, 
        endTime, 
        serviceId, 
        excludeAppointmentId,
        available: bookingCheck.available
      }
    });

    res.json({
      success: true,
      data: bookingCheck
    });
  } catch (error) {
    console.error('Booking check error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Prüfen der Buchbarkeit',
      error: error.message
    });
  }
});

// Mitarbeiter-Auslastung abrufen
router.get('/utilization/:staffId', auth, [
  query('startDate').isISO8601().withMessage('Startdatum muss ein gültiges Datum sein'),
  query('endDate').isISO8601().withMessage('Enddatum muss ein gültiges Datum sein')
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

    // Berechtigung prüfen
    if (!req.user.permissions.includes('reports.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Anzeigen von Auslastungsdaten'
      });
    }

    const { staffId } = req.params;
    const { startDate, endDate } = req.query;

    const utilization = await AvailabilityService.getStaffUtilization(
      staffId,
      new Date(startDate),
      new Date(endDate)
    );

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'availability.utilization',
      description: 'Mitarbeiter-Auslastung abgerufen',
      details: { staffId, startDate, endDate }
    });

    res.json({
      success: true,
      data: utilization
    });
  } catch (error) {
    console.error('Staff utilization error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Mitarbeiter-Auslastung',
      error: error.message
    });
  }
});

// Verfügbare Mitarbeiter für einen Service abrufen
router.get('/available-staff', auth, [
  query('serviceId').notEmpty().withMessage('Service-ID ist erforderlich'),
  query('startDate').isISO8601().withMessage('Startdatum muss ein gültiges Datum sein'),
  query('endDate').isISO8601().withMessage('Enddatum muss ein gültiges Datum sein')
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

    // Berechtigung prüfen
    if (!req.user.permissions.includes('appointments.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Abrufen von verfügbaren Mitarbeitern'
      });
    }

    const { serviceId, startDate, endDate } = req.query;

    // Service abrufen
    const service = await ServiceCatalog.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service nicht gefunden'
      });
    }

    // Alle aktiven Mitarbeiter abrufen
    const staffProfiles = await StaffProfile.find({ 
      isActive: true,
      roleHint: service.required_role === 'any' ? { $exists: true } : service.required_role
    }).select('_id displayName roleHint colorHex');

    // Verfügbarkeit für jeden Mitarbeiter prüfen
    const availableStaff = [];
    for (const staff of staffProfiles) {
      try {
        const slots = await AvailabilityService.getAvailableSlots(
          staff._id,
          new Date(startDate),
          new Date(endDate),
          serviceId
        );
        
        if (slots.length > 0) {
          availableStaff.push({
            ...staff.toObject(),
            availableSlots: slots.length,
            nextAvailable: slots[0]?.start
          });
        }
      } catch (error) {
        console.error(`Error checking availability for staff ${staff._id}:`, error);
      }
    }

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'availability.staff',
      description: 'Verfügbare Mitarbeiter abgerufen',
      details: { serviceId, startDate, endDate, staffCount: availableStaff.length }
    });

    res.json({
      success: true,
      data: availableStaff
    });
  } catch (error) {
    console.error('Available staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der verfügbaren Mitarbeiter',
      error: error.message
    });
  }
});

module.exports = router;
