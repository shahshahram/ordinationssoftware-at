const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Location = require('../models/Location');
const LocationHours = require('../models/LocationHours');
const LocationClosure = require('../models/LocationClosure');
const StaffLocationAssignment = require('../models/StaffLocationAssignment');
const Room = require('../models/Room');
const Device = require('../models/Device');
const AuditLog = require('../models/AuditLog');

// Alle Standorte abrufen
router.get('/', auth, async (req, res) => {
  try {
    // Berechtigung prüfen
    if (!req.user.permissions.includes('locations.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Standortverwaltung'
      });
    }

    const { page = 1, limit = 10, search = '', active = '' } = req.query;
    const query = {};

    // Suchfilter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }

    // Aktivitätsfilter
    if (active !== '') {
      query.is_active = active === 'true';
    }

    const locations = await Location.find(query)
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Location.countDocuments(query);

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'locations.read',
      resource: 'Location',
      description: 'Standorte abgerufen',
      details: { query: req.query },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: locations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Standorte'
    });
  }
});

// Alle Öffnungszeiten abrufen
router.get('/hours', auth, async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Standortverwaltung'
      });
    }

    const hours = await LocationHours.find().populate('location_id', 'name code');
    res.json({
      success: true,
      data: hours
    });
  } catch (error) {
    console.error('Error fetching location hours:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Öffnungszeiten'
    });
  }
});

// Alle Schließzeiten abrufen
router.get('/closures', auth, async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Standortverwaltung'
      });
    }

    const closures = await LocationClosure.find().populate('location_id', 'name code');
    res.json({
      success: true,
      data: closures
    });
  } catch (error) {
    console.error('Error fetching location closures:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Schließzeiten'
    });
  }
});

// Öffnungszeiten für einen Standort erstellen
router.post('/:id/hours', auth, async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Öffnungszeiten'
      });
    }

    const { rrule, timezone, label } = req.body;
    const locationId = req.params.id;

    const hours = new LocationHours({
      location_id: locationId,
      rrule,
      timezone: timezone || 'Europe/Vienna',
      label
    });

    await hours.save();

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'location-hours.create',
      resource: 'LocationHours',
      resourceId: hours._id,
      description: `Öffnungszeiten für Standort ${locationId} erstellt`,
      details: { locationId, rrule, timezone, label },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: hours,
      message: 'Öffnungszeiten erfolgreich hinzugefügt'
    });
  } catch (error) {
    console.error('Error creating location hours:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Öffnungszeiten'
    });
  }
});

// Schließzeiten für einen Standort erstellen
router.post('/:id/closures', auth, async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Schließzeiten'
      });
    }

    const { starts_at, ends_at, reason } = req.body;
    const locationId = req.params.id;

    const closure = new LocationClosure({
      location_id: locationId,
      starts_at,
      ends_at,
      reason
    });

    await closure.save();

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'location-closures.create',
      resource: 'LocationClosure',
      resourceId: closure._id,
      description: `Schließzeit für Standort ${locationId} erstellt`,
      details: { locationId, starts_at, ends_at, reason },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: closure,
      message: 'Schließzeit erfolgreich hinzugefügt'
    });
  } catch (error) {
    console.error('Error creating location closure:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Schließzeit'
    });
  }
});

// Öffnungszeiten löschen
router.delete('/hours/:hoursId', auth, async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Öffnungszeiten'
      });
    }

    const hours = await LocationHours.findByIdAndDelete(req.params.hoursId);
    if (!hours) {
      return res.status(404).json({
        success: false,
        message: 'Öffnungszeiten nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Öffnungszeiten erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting location hours:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Öffnungszeiten'
    });
  }
});

// Schließzeiten löschen
router.delete('/closures/:closureId', auth, async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Schließzeiten'
      });
    }

    const closure = await LocationClosure.findByIdAndDelete(req.params.closureId);
    if (!closure) {
      return res.status(404).json({
        success: false,
        message: 'Schließzeit nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Schließzeit erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting location closure:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Schließzeit'
    });
  }
});

// Einzelnen Standort abrufen
router.get('/:id', auth, async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Standortverwaltung'
      });
    }

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    // Öffnungszeiten laden
    const hours = await LocationHours.find({ location_id: location._id });
    const closures = await LocationClosure.find({ location_id: location._id });

    res.json({
      success: true,
      data: {
        ...location.toObject(),
        hours,
        closures
      }
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Standorts'
    });
  }
});

// Neuen Standort erstellen
router.post('/', [
  auth,
  body('name').trim().notEmpty().withMessage('Name ist erforderlich'),
  body('address_line1').trim().notEmpty().withMessage('Adresse ist erforderlich'),
  body('postal_code').trim().notEmpty().withMessage('Postleitzahl ist erforderlich'),
  body('city').trim().notEmpty().withMessage('Stadt ist erforderlich'),
  body('timezone').optional().isIn(['Europe/Vienna', 'Europe/Berlin', 'Europe/Zurich']).withMessage('Ungültige Zeitzone')
], async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.create')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Erstellen von Standorten'
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

    const location = new Location(req.body);
    await location.save();

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'locations.create',
      resource: 'Location',
      resourceId: location._id,
      description: 'Standort erstellt',
      details: { location: location.toObject() },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: location,
      message: 'Standort erfolgreich erstellt'
    });
  } catch (error) {
    console.error('Error creating location:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Standort-Code bereits vergeben'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Standorts'
    });
  }
});

// Standort aktualisieren
router.put('/:id', [
  auth,
  body('name').optional().trim().notEmpty().withMessage('Name darf nicht leer sein'),
  body('timezone').optional().isIn(['Europe/Vienna', 'Europe/Berlin', 'Europe/Zurich']).withMessage('Ungültige Zeitzone')
], async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Aktualisieren von Standorten'
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

    const location = await Location.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'locations.update',
      resource: 'Location',
      resourceId: location._id,
      description: 'Standort aktualisiert',
      details: { changes: req.body },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: location,
      message: 'Standort erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating location:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Standort-Code bereits vergeben'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Standorts'
    });
  }
});

// Standort löschen
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.delete')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Löschen von Standorten'
      });
    }

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    // Prüfen ob Standort noch verwendet wird
    const hasRooms = await Room.countDocuments({ location_id: location._id });
    const hasDevices = await Device.countDocuments({ location_id: location._id });
    const hasStaff = await StaffLocationAssignment.countDocuments({ location_id: location._id });

    if (hasRooms > 0 || hasDevices > 0 || hasStaff > 0) {
      return res.status(400).json({
        success: false,
        message: 'Standort kann nicht gelöscht werden, da er noch verwendet wird'
      });
    }

    await Location.findByIdAndDelete(req.params.id);

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'locations.delete',
      resource: 'Location',
      resourceId: location._id,
      description: 'Standort gelöscht',
      details: { location: location.toObject() },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Standort erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Standorts'
    });
  }
});

// Standort-Öffnungszeiten verwalten
router.post('/:id/hours', [
  auth,
  body('rrule').trim().notEmpty().withMessage('RRULE ist erforderlich'),
  body('timezone').optional().isIn(['Europe/Vienna', 'Europe/Berlin', 'Europe/Zurich'])
], async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Öffnungszeiten'
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

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    const hours = new LocationHours({
      location_id: location._id,
      ...req.body
    });
    await hours.save();

    res.status(201).json({
      success: true,
      data: hours,
      message: 'Öffnungszeiten erfolgreich hinzugefügt'
    });
  } catch (error) {
    console.error('Error creating location hours:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Öffnungszeiten'
    });
  }
});

// Standort-Schließzeiten verwalten
router.post('/:id/closures', [
  auth,
  body('starts_at').isISO8601().withMessage('Ungültiges Startdatum'),
  body('ends_at').isISO8601().withMessage('Ungültiges Enddatum'),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Schließzeiten'
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

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    const closure = new LocationClosure({
      location_id: location._id,
      ...req.body
    });
    await closure.save();

    res.status(201).json({
      success: true,
      data: closure,
      message: 'Schließzeit erfolgreich hinzugefügt'
    });
  } catch (error) {
    console.error('Error creating location closure:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Schließzeit'
    });
  }
});

// Öffnungszeiten aktualisieren
router.put('/:id/hours/:hoursId', [
  auth,
  body('rrule').optional().trim().notEmpty().withMessage('RRULE darf nicht leer sein'),
  body('timezone').optional().isIn(['Europe/Vienna', 'Europe/Berlin', 'Europe/Zurich'])
], async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Öffnungszeiten'
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

    const hours = await LocationHours.findOneAndUpdate(
      { _id: req.params.hoursId, location_id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!hours) {
      return res.status(404).json({
        success: false,
        message: 'Öffnungszeiten nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: hours,
      message: 'Öffnungszeiten erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating location hours:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Öffnungszeiten'
    });
  }
});

// Schließzeiten aktualisieren
router.put('/:id/closures/:closureId', [
  auth,
  body('starts_at').optional().isISO8601().withMessage('Ungültiges Startdatum'),
  body('ends_at').optional().isISO8601().withMessage('Ungültiges Enddatum'),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Schließzeiten'
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

    const closure = await LocationClosure.findOneAndUpdate(
      { _id: req.params.closureId, location_id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!closure) {
      return res.status(404).json({
        success: false,
        message: 'Schließzeit nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: closure,
      message: 'Schließzeit erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating location closure:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Schließzeit'
    });
  }
});

// Standort-Statistiken abrufen
router.get('/:id/stats', auth, async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Standortverwaltung'
      });
    }

    const locationId = req.params.id;
    const { startDate, endDate } = req.query;

    // Grundlegende Statistiken
    const stats = {
      location: await Location.findById(locationId).select('name code city'),
      staff: await StaffLocationAssignment.countDocuments({ location_id: locationId }),
      rooms: await Room.countDocuments({ location_id: locationId, isActive: true }),
      devices: await Device.countDocuments({ location_id: locationId, isActive: true }),
      activeHours: await LocationHours.countDocuments({ location_id: locationId }),
      activeClosures: await LocationClosure.countDocuments({ 
        location_id: locationId,
        starts_at: { $gte: new Date() }
      })
    };

    // Termin-Statistiken (falls Appointment-Modell verfügbar)
    try {
      const Appointment = require('../models/Appointment');
      const appointmentQuery = { location_id: locationId };
      
      if (startDate && endDate) {
        appointmentQuery.startTime = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      stats.appointments = {
        total: await Appointment.countDocuments(appointmentQuery),
        today: await Appointment.countDocuments({
          ...appointmentQuery,
          startTime: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }),
        thisWeek: await Appointment.countDocuments({
          ...appointmentQuery,
          startTime: {
            $gte: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
            $lt: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 7))
          }
        })
      };
    } catch (error) {
      stats.appointments = { total: 0, today: 0, thisWeek: 0 };
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching location stats:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Standort-Statistiken'
    });
  }
});

// Standort-Verfügbarkeit prüfen
router.get('/:id/availability', auth, async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Standortverwaltung'
      });
    }

    const { date, time } = req.query;
    const locationId = req.params.id;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Datum und Zeit sind erforderlich'
      });
    }

    const requestedDateTime = new Date(`${date}T${time}`);
    const dayOfWeek = requestedDateTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Öffnungszeiten prüfen
    const locationHours = await LocationHours.find({ location_id: locationId });
    const isOpen = locationHours.some(hours => {
      // Vereinfachte RRULE-Prüfung für Wochentage
      const rrule = hours.rrule;
      if (rrule.includes(dayOfWeek.toUpperCase().substring(0, 2))) {
        return true;
      }
      return false;
    });

    // Schließtage prüfen
    const closures = await LocationClosure.find({
      location_id: locationId,
      starts_at: { $lte: requestedDateTime },
      ends_at: { $gte: requestedDateTime }
    });

    const isClosed = closures.length > 0;

    res.json({
      success: true,
      data: {
        available: isOpen && !isClosed,
        isOpen,
        isClosed,
        closures: closures.map(c => ({
          reason: c.reason,
          starts_at: c.starts_at,
          ends_at: c.ends_at
        }))
      }
    });
  } catch (error) {
    console.error('Error checking location availability:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Prüfen der Standort-Verfügbarkeit'
    });
  }
});

// Bulk-Operationen für Standorte
router.post('/bulk-update', auth, async (req, res) => {
  try {
    if (!req.user.permissions.includes('locations.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Standorten'
      });
    }

    const { operation, locationIds, updates } = req.body;

    if (!operation || !locationIds || !Array.isArray(locationIds)) {
      return res.status(400).json({
        success: false,
        message: 'Operation, locationIds und updates sind erforderlich'
      });
    }

    let result;

    switch (operation) {
      case 'activate':
        result = await Location.updateMany(
          { _id: { $in: locationIds } },
          { is_active: true }
        );
        break;
      case 'deactivate':
        result = await Location.updateMany(
          { _id: { $in: locationIds } },
          { is_active: false }
        );
        break;
      case 'update':
        if (!updates) {
          return res.status(400).json({
            success: false,
            message: 'Updates sind für Update-Operation erforderlich'
          });
        }
        result = await Location.updateMany(
          { _id: { $in: locationIds } },
          { ...updates, updatedAt: new Date() }
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Unbekannte Operation'
        });
    }

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'locations.bulk-update',
      resource: 'Location',
      resourceId: locationIds[0],
      description: `Bulk-Operation: ${operation} für ${locationIds.length} Standorte`,
      details: { operation, locationIds, updates },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: result,
      message: `Bulk-Operation erfolgreich: ${result.modifiedCount} Standorte aktualisiert`
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Bulk-Operation'
    });
  }
});

module.exports = router;
