const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const WeeklySchedule = require('../models/WeeklySchedule');
const AuditLog = require('../models/AuditLog');

// GET /api/weekly-schedules - Get all weekly schedules (now as recurring templates)
router.get('/', auth, async (req, res) => {
  try {
    const { staffId } = req.query;
    
    let query = { isActive: true };
    if (staffId) {
      query.staffId = staffId;
    }

    const schedules = await WeeklySchedule.find(query)
      .populate('staffId', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ staffId: 1, validFrom: -1 });

    // Filter out schedules with invalid staff references
    const validSchedules = schedules.filter(schedule => {
      if (!schedule.staffId || !schedule.staffId._id) {
        console.log(`Filtering out schedule with invalid staffId: ${schedule._id}`);
        return false;
      }
      return true;
    });

    console.log(`Found ${schedules.length} total schedules, ${validSchedules.length} valid schedules`);

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'weekly_schedules.read',
      description: 'Wiederkehrende Arbeitszeiten-Vorlagen abgerufen',
      details: { staffId }
    });

    res.json({
      success: true,
      data: validSchedules
    });
  } catch (error) {
    console.error('WeeklySchedule fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Arbeitszeiten-Vorlagen'
    });
  }
});

// GET /api/weekly-schedules/:id - Get specific weekly schedule
router.get('/:id', auth, async (req, res) => {
  try {
    const schedule = await WeeklySchedule.findById(req.params.id)
      .populate('staffId', 'firstName lastName email');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Wöchentliche Arbeitszeiten nicht gefunden'
      });
    }

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'weekly_schedules.read',
      description: 'Wöchentliche Arbeitszeiten abgerufen',
      details: { scheduleId: req.params.id }
    });

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('WeeklySchedule fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der wöchentlichen Arbeitszeiten'
    });
  }
});

// POST /api/weekly-schedules - Create new recurring schedule template
router.post('/', auth, [
  body('staffId').notEmpty().withMessage('Mitarbeiter-ID ist erforderlich'),
  body('schedules').isArray().withMessage('Arbeitszeiten müssen ein Array sein'),
  body('schedules.*.day').notEmpty().withMessage('Tag ist erforderlich'),
  body('schedules.*.isWorking').isBoolean().withMessage('Arbeitsstatus muss boolean sein'),
  body('schedules.*.startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Gültige Startzeit erforderlich'),
  body('schedules.*.endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Gültige Endzeit erforderlich'),
  body('validFrom').optional().isISO8601().withMessage('Gültiges Gültigkeitsdatum erforderlich'),
  body('validTo').optional().isISO8601().withMessage('Gültiges Enddatum erforderlich'),
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

    const { staffId, schedules, validFrom, validTo } = req.body;

    // Deaktiviere vorherige aktive Vorlage für diesen Mitarbeiter
    await WeeklySchedule.updateMany(
      { staffId, isActive: true },
      { isActive: false }
    );

    // Erstelle neue wiederkehrende Vorlage
    const scheduleData = {
      staffId,
      schedules,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validTo: validTo ? new Date(validTo) : null,
      createdBy: req.user._id
    };
    
    const schedule = new WeeklySchedule(scheduleData);
    await schedule.save();

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'weekly_schedules.create',
      description: 'Wiederkehrende Arbeitszeiten-Vorlage erstellt',
      details: { staffId, scheduleId: schedule._id }
    });

    res.status(201).json({
      success: true,
      message: 'Wiederkehrende Arbeitszeiten-Vorlage erfolgreich erstellt',
      data: schedule
    });
  } catch (error) {
    console.error('WeeklySchedule creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der wöchentlichen Arbeitszeiten'
    });
  }
});

// PUT /api/weekly-schedules/:id - Update weekly schedule
router.put('/:id', auth, [
  body('validFrom').optional().isISO8601().withMessage('Gültiges Datum ist erforderlich'),
  body('validTo').optional().isISO8601().withMessage('Gültiges Datum ist erforderlich'),
  body('schedules').optional().isArray().withMessage('Arbeitszeiten müssen ein Array sein'),
  body('schedules.*.day').optional().notEmpty().withMessage('Tag ist erforderlich'),
  body('schedules.*.isWorking').optional().isBoolean().withMessage('Arbeitsstatus muss boolean sein'),
  body('schedules.*.startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Gültige Startzeit erforderlich'),
  body('schedules.*.endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Gültige Endzeit erforderlich'),
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

    const schedule = await WeeklySchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Wöchentliche Arbeitszeiten nicht gefunden'
      });
    }

    const updateData = {};
    
    // Map schedules from frontend format to backend format
    if (req.body.schedules) {
      updateData.schedules = req.body.schedules;
    }
    
    if (req.body.validFrom) {
      updateData.validFrom = new Date(req.body.validFrom);
    }
    
    if (req.body.validTo) {
      updateData.validTo = new Date(req.body.validTo);
    } else if (req.body.validTo === null) {
      updateData.validTo = null;
    }

    const updatedSchedule = await WeeklySchedule.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'weekly_schedules.update',
      description: 'Wiederkehrende Arbeitszeiten-Vorlage aktualisiert',
      details: { scheduleId: req.params.id, changes: updateData }
    });

    res.json({
      success: true,
      message: 'Wiederkehrende Arbeitszeiten erfolgreich aktualisiert',
      data: updatedSchedule
    });
  } catch (error) {
    console.error('WeeklySchedule update error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der wiederkehrenden Arbeitszeiten'
    });
  }
});

// DELETE /api/weekly-schedules/:id - Delete weekly schedule
router.delete('/:id', auth, async (req, res) => {
  try {
    const schedule = await WeeklySchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Wöchentliche Arbeitszeiten nicht gefunden'
      });
    }

    await WeeklySchedule.findByIdAndDelete(req.params.id);

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'weekly_schedules.delete',
      description: 'Wöchentliche Arbeitszeiten gelöscht',
      details: { scheduleId: req.params.id, staffId: schedule.staffId }
    });

    res.json({
      success: true,
      message: 'Wöchentliche Arbeitszeiten erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('WeeklySchedule deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der wöchentlichen Arbeitszeiten'
    });
  }
});

// POST /api/weekly-schedules/cleanup - Clean up orphaned schedules
router.post('/cleanup', auth, async (req, res) => {
  try {
    // Check if user has admin permissions
    if (!req.user.permissions || !req.user.permissions.includes('users.delete')) {
      return res.status(403).json({
        success: false,
        message: 'Zugriff verweigert - Admin-Berechtigung erforderlich'
      });
    }

    console.log('Starting cleanup of orphaned weekly schedules...');
    
    // Find all weekly schedules
    const allSchedules = await WeeklySchedule.find({}).populate('staffId');
    
    let orphanedCount = 0;
    const orphanedSchedules = [];
    
    // Check each schedule for orphaned references
    for (const schedule of allSchedules) {
      if (!schedule.staffId || !schedule.staffId._id) {
        orphanedSchedules.push(schedule._id);
        orphanedCount++;
        console.log(`Found orphaned schedule: ${schedule._id} (no staffId)`);
      }
    }
    
    // Delete orphaned schedules
    if (orphanedSchedules.length > 0) {
      const deleteResult = await WeeklySchedule.deleteMany({
        _id: { $in: orphanedSchedules }
      });
      
      console.log(`Deleted ${deleteResult.deletedCount} orphaned schedules`);
      
      // Audit-Log
      await AuditLog.create({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'weekly_schedules.cleanup',
        description: 'Verwaiste Arbeitszeiten bereinigt',
        details: { 
          orphanedCount: deleteResult.deletedCount,
          deletedSchedules: orphanedSchedules
        }
      });
    }
    
    res.json({
      success: true,
      message: `Bereinigung abgeschlossen. ${orphanedCount} verwaiste Arbeitszeiten entfernt.`,
      deletedCount: orphanedCount
    });
    
  } catch (error) {
    console.error('Error cleaning up orphaned schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Bereinigen der verwaisten Arbeitszeiten'
    });
  }
});

module.exports = router;
