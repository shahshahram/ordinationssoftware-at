const express = require('express');
const router = express.Router();
const LocationWeeklySchedule = require('../models/LocationWeeklySchedule');
const Location = require('../models/Location');
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

// GET /api/location-weekly-schedules - Alle wiederkehrenden Standort-Öffnungszeiten abrufen
router.get('/', auth, checkPermission('locations.read'), async (req, res) => {
  try {
    const { location_id } = req.query;
    
    const filter = { isActive: true };
    if (location_id) filter.location_id = location_id;

    const schedules = await LocationWeeklySchedule.find(filter)
      .populate('location_id', 'name code color_hex')
      .populate('createdBy', 'firstName lastName email')
      .sort({ 'location_id.name': 1, validFrom: -1 })
      .lean();

    res.json({
      success: true,
      data: schedules,
      count: schedules.length
    });
  } catch (error) {
    console.error('Error fetching location weekly schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der wiederkehrenden Standort-Öffnungszeiten'
    });
  }
});

// GET /api/location-weekly-schedules/:id - Einzelne wöchentliche Standort-Öffnungszeiten abrufen
router.get('/:id', auth, checkPermission('locations.read'), async (req, res) => {
  try {
    const schedule = await LocationWeeklySchedule.findById(req.params.id)
      .populate('location_id', 'name code color_hex')
      .populate('createdBy', 'firstName lastName email');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Standort-Öffnungszeiten nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error fetching location weekly schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Standort-Öffnungszeiten'
    });
  }
});

// POST /api/location-weekly-schedules - Neue wiederkehrende Standort-Öffnungszeiten erstellen
router.post('/', auth, checkPermission('locations.write'), async (req, res) => {
  try {
    const { location_id, schedules, validFrom, validTo } = req.body;

    // Validierung
    if (!location_id || !schedules) {
      return res.status(400).json({
        success: false,
        message: 'Standort und Öffnungszeiten sind erforderlich'
      });
    }

    // Prüfe ob Standort existiert
    const location = await Location.findById(location_id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    // Deaktiviere vorherige aktive Vorlage für diesen Standort
    await LocationWeeklySchedule.updateMany(
      { location_id, isActive: true },
      { isActive: false }
    );

    const scheduleData = {
      location_id,
      schedules,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validTo: validTo ? new Date(validTo) : null,
      createdBy: req.user.id
    };

    const newSchedule = new LocationWeeklySchedule(scheduleData);
    await newSchedule.save();

    // Audit Log erstellen
    await AuditLog.create({
      action: 'location-weekly-schedules.create',
      resource: 'LocationWeeklySchedule',
      resourceId: newSchedule._id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      description: `Wiederkehrende Öffnungszeiten-Vorlage für Standort ${location.name} erstellt`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Populate für Response
    await newSchedule.populate('location_id', 'name code color_hex');
    await newSchedule.populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      data: newSchedule,
      message: 'Wiederkehrende Standort-Öffnungszeiten erfolgreich erstellt'
    });
  } catch (error) {
    console.error('Error creating location weekly schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der wiederkehrenden Standort-Öffnungszeiten'
    });
  }
});

// PUT /api/location-weekly-schedules/:id - Wöchentliche Standort-Öffnungszeiten aktualisieren
router.put('/:id', auth, checkPermission('locations.write'), async (req, res) => {
  try {
    const { weekStart, schedules } = req.body;

    const schedule = await LocationWeeklySchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Standort-Öffnungszeiten nicht gefunden'
      });
    }

    const updateData = {};
    if (weekStart) updateData.weekStart = new Date(weekStart);
    if (schedules) updateData.schedules = schedules;

    const updatedSchedule = await LocationWeeklySchedule.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('location_id', 'name code color_hex')
      .populate('createdBy', 'firstName lastName email');

    // Audit Log erstellen
    await AuditLog.create({
      action: 'location-weekly-schedules.update',
      resource: 'LocationWeeklySchedule',
      resourceId: updatedSchedule._id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      description: `Öffnungszeiten für Standort ${updatedSchedule.location_id.name} aktualisiert`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: updatedSchedule,
      message: 'Standort-Öffnungszeiten erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating location weekly schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Standort-Öffnungszeiten'
    });
  }
});

// DELETE /api/location-weekly-schedules/:id - Wöchentliche Standort-Öffnungszeiten löschen
router.delete('/:id', auth, checkPermission('locations.delete'), async (req, res) => {
  try {
    const schedule = await LocationWeeklySchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Standort-Öffnungszeiten nicht gefunden'
      });
    }

    await LocationWeeklySchedule.findByIdAndDelete(req.params.id);

    // Audit Log erstellen
    await AuditLog.create({
      action: 'location-weekly-schedules.delete',
      resource: 'LocationWeeklySchedule',
      resourceId: schedule._id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      description: `Öffnungszeiten für Standort gelöscht`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Standort-Öffnungszeiten erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting location weekly schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Standort-Öffnungszeiten'
    });
  }
});

module.exports = router;
