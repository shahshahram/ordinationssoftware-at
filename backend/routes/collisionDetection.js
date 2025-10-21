const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const CollisionDetection = require('../utils/collisionDetection');
const AuditLog = require('../models/AuditLog');

// Kollisionen für Termin prüfen
router.post('/check-appointment', [
  auth,
  body('staff_id').isMongoId().withMessage('Ungültige Personal-ID'),
  body('startTime').isISO8601().withMessage('Ungültiges Startdatum'),
  body('endTime').isISO8601().withMessage('Ungültiges Enddatum'),
  body('room_id').optional().isMongoId().withMessage('Ungültige Raum-ID'),
  body('device_ids').optional().isArray().withMessage('device_ids muss Array sein'),
  body('location_id').optional().isMongoId().withMessage('Ungültige Standort-ID'),
  body('appointment_id').optional().isMongoId().withMessage('Ungültige Termin-ID')
], async (req, res) => {
  try {
    if (!req.user.permissions.includes('appointments.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Terminverwaltung'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    const collisions = await CollisionDetection.checkAppointmentCollisions(req.body);

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'collision.check',
      resource: 'Appointment',
      description: 'Kollisionsprüfung für Termin durchgeführt',
      details: { 
        appointmentData: req.body,
        hasCollisions: collisions.hasCollisions,
        collisionCount: Object.values(collisions).filter(Array.isArray).flat().length
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: collisions
    });
  } catch (error) {
    console.error('Error checking appointment collisions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Kollisionsprüfung'
    });
  }
});

// Personal-Verfügbarkeit prüfen
router.post('/check-staff-availability', [
  auth,
  body('staff_id').isMongoId().withMessage('Ungültige Personal-ID'),
  body('startTime').isISO8601().withMessage('Ungültiges Startdatum'),
  body('endTime').isISO8601().withMessage('Ungültiges Enddatum'),
  body('location_id').optional().isMongoId().withMessage('Ungültige Standort-ID')
], async (req, res) => {
  try {
    if (!req.user.permissions.includes('staff.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Personalverwaltung'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    const { staff_id, startTime, endTime, location_id } = req.body;
    const availability = await CollisionDetection.checkStaffAvailability(
      staff_id, 
      new Date(startTime), 
      new Date(endTime), 
      location_id
    );

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error checking staff availability:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Verfügbarkeitsprüfung'
    });
  }
});

// Raum-Verfügbarkeit prüfen
router.post('/check-room-availability', [
  auth,
  body('room_id').isMongoId().withMessage('Ungültige Raum-ID'),
  body('startTime').isISO8601().withMessage('Ungültiges Startdatum'),
  body('endTime').isISO8601().withMessage('Ungültiges Enddatum')
], async (req, res) => {
  try {
    if (!req.user.permissions.includes('resources.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Ressourcenverwaltung'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    const { room_id, startTime, endTime } = req.body;
    const availability = await CollisionDetection.checkRoomAvailability(
      room_id, 
      new Date(startTime), 
      new Date(endTime)
    );

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error checking room availability:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Verfügbarkeitsprüfung'
    });
  }
});

// Verfügbarkeit für Zeitraum prüfen
router.post('/check-availability-range', [
  auth,
  body('startDate').isISO8601().withMessage('Ungültiges Startdatum'),
  body('endDate').isISO8601().withMessage('Ungültiges Enddatum'),
  body('location_id').optional().isMongoId().withMessage('Ungültige Standort-ID'),
  body('staff_id').optional().isMongoId().withMessage('Ungültige Personal-ID'),
  body('room_id').optional().isMongoId().withMessage('Ungültige Raum-ID')
], async (req, res) => {
  try {
    if (!req.user.permissions.includes('appointments.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Terminverwaltung'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    const { startDate, endDate, location_id, staff_id, room_id } = req.body;
    
    // Verfügbarkeit für verschiedene Ressourcen prüfen
    const availability = {
      staff: [],
      rooms: [],
      locations: [],
      timeSlots: []
    };

    // Personal-Verfügbarkeit
    if (staff_id) {
      const staffAvailability = await CollisionDetection.checkStaffAvailability(
        staff_id,
        new Date(startDate),
        new Date(endDate),
        location_id
      );
      availability.staff.push({
        staff_id,
        ...staffAvailability
      });
    }

    // Raum-Verfügbarkeit
    if (room_id) {
      const roomAvailability = await CollisionDetection.checkRoomAvailability(
        room_id,
        new Date(startDate),
        new Date(endDate)
      );
      availability.rooms.push({
        room_id,
        ...roomAvailability
      });
    }

    // Standort-Verfügbarkeit
    if (location_id) {
      const Location = require('../models/Location');
      const LocationHours = require('../models/LocationHours');
      const LocationClosure = require('../models/LocationClosure');

      const location = await Location.findById(location_id);
      const hours = await LocationHours.find({ location_id });
      const closures = await LocationClosure.find({
        location_id,
        starts_at: { $lte: new Date(endDate) },
        ends_at: { $gte: new Date(startDate) }
      });

      availability.locations.push({
        location_id,
        location: location?.name,
        hours: hours.length,
        closures: closures.length,
        available: location?.is_active && closures.length === 0
      });
    }

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error checking availability range:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Verfügbarkeitsprüfung'
    });
  }
});

// Verfügbare Zeitslots finden
router.post('/find-available-slots', [
  auth,
  body('date').isISO8601().withMessage('Ungültiges Datum'),
  body('duration').isInt({ min: 15, max: 480 }).withMessage('Dauer muss zwischen 15 und 480 Minuten sein'),
  body('location_id').optional().isMongoId().withMessage('Ungültige Standort-ID'),
  body('staff_id').optional().isMongoId().withMessage('Ungültige Personal-ID'),
  body('room_id').optional().isMongoId().withMessage('Ungültige Raum-ID')
], async (req, res) => {
  try {
    if (!req.user.permissions.includes('appointments.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Terminverwaltung'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    const { date, duration, location_id, staff_id, room_id } = req.body;
    const slots = [];

    // Vereinfachte Zeitslot-Generierung (8:00 - 17:00, 30-Minuten-Intervalle)
    const startHour = 8;
    const endHour = 17;
    const slotDuration = 30; // Minuten

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);

        // Prüfen ob Slot verfügbar ist
        const isAvailable = await checkSlotAvailability(
          slotStart,
          slotEnd,
          { location_id, staff_id, room_id }
        );

        if (isAvailable) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            duration: duration
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        date,
        duration,
        availableSlots: slots,
        totalSlots: slots.length
      }
    });
  } catch (error) {
    console.error('Error finding available slots:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Zeitslot-Suche'
    });
  }
});

// Hilfsfunktion für Zeitslot-Verfügbarkeit
async function checkSlotAvailability(startTime, endTime, filters) {
  try {
    const { location_id, staff_id, room_id } = filters;
    
    // Basis-Query für Termine
    const query = {
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    };

    if (location_id) query.location_id = location_id;
    if (staff_id) query.staff_id = staff_id;
    if (room_id) query.room_id = room_id;

    const Appointment = require('../models/Appointment');
    const conflictingAppointments = await Appointment.find(query);

    return conflictingAppointments.length === 0;
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return false;
  }
}

module.exports = router;
