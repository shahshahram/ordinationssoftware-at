const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { authorize, ACTIONS, RESOURCES } = require('../utils/rbac');
const StaffLocationAssignment = require('../models/StaffLocationAssignment');
const StaffProfile = require('../models/StaffProfile');
const Location = require('../models/Location');
const AuditLog = require('../models/AuditLog');

// Alle Standort-Zuweisungen abrufen
router.get('/', auth, async (req, res) => {
  try {
    // RBAC-Berechtigung prüfen
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.STAFF, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Personalverwaltung'
      });
    }

    const { staff_id, location_id, is_primary } = req.query;
    const query = {};

    if (staff_id) query.staff_id = staff_id;
    if (location_id) query.location_id = location_id;
    if (is_primary !== undefined) query.is_primary = is_primary === 'true';

    const assignments = await StaffLocationAssignment.find(query)
      .populate({
        path: 'staff_id',
        select: 'display_name email role',
        populate: {
          path: 'userId',
          select: 'firstName lastName email color_hex'
        }
      })
      .populate('location_id', 'name code city')
      .populate('allowed_services', 'name code')
      .sort({ staff_id: 1, is_primary: -1 });

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching staff location assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Standort-Zuweisungen'
    });
  }
});

// Standort-Zuweisung erstellen
router.post('/', [
  auth,
  body('staff_id').isMongoId().withMessage('Ungültige Mitarbeiter-ID'),
  body('location_id').isMongoId().withMessage('Ungültige Standort-ID'),
  body('is_primary').optional().isBoolean().withMessage('is_primary muss boolean sein'),
  body('allowed_services').optional().isArray().withMessage('allowed_services muss Array sein')
], async (req, res) => {
  try {
    // RBAC-Berechtigung prüfen
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.CREATE, RESOURCES.STAFF, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Standort-Zuweisungen'
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

    // Prüfen ob Mitarbeiter und Standort existieren
    const staff = await StaffProfile.findById(req.body.staff_id);
    const location = await Location.findById(req.body.location_id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Mitarbeiter nicht gefunden'
      });
    }

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    // Prüfen ob Zuweisung bereits existiert
    const existingAssignment = await StaffLocationAssignment.findOne({
      staff_id: req.body.staff_id,
      location_id: req.body.location_id
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Standort-Zuweisung bereits vorhanden'
      });
    }

    const assignment = new StaffLocationAssignment(req.body);
    await assignment.save();

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'staff-location-assignments.create',
      resource: 'StaffLocationAssignment',
      resourceId: assignment._id,
      description: 'Personal-Standort-Zuweisung erstellt',
      details: { assignment: assignment.toObject() },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: assignment,
      message: 'Standort-Zuweisung erfolgreich erstellt'
    });
  } catch (error) {
    console.error('Error creating staff location assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Standort-Zuweisung'
    });
  }
});

// Standort-Zuweisung aktualisieren
router.put('/:id', [
  auth,
  body('is_primary').optional().isBoolean().withMessage('is_primary muss boolean sein'),
  body('allowed_services').optional().isArray().withMessage('allowed_services muss Array sein')
], async (req, res) => {
  try {
    // RBAC-Berechtigung prüfen
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.STAFF, req.params.id, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Standort-Zuweisungen'
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

    const assignment = await StaffLocationAssignment.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Standort-Zuweisung nicht gefunden'
      });
    }

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'staff-location-assignments.update',
      resource: 'StaffLocationAssignment',
      resourceId: assignment._id,
      description: 'Personal-Standort-Zuweisung aktualisiert',
      details: { changes: req.body },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: assignment,
      message: 'Standort-Zuweisung erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating staff location assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Standort-Zuweisung'
    });
  }
});

// Standort-Zuweisung löschen
router.delete('/:id', auth, async (req, res) => {
  try {
    // RBAC-Berechtigung prüfen
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.DELETE, RESOURCES.STAFF, req.params.id, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Standort-Zuweisungen'
      });
    }

    const assignment = await StaffLocationAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Standort-Zuweisung nicht gefunden'
      });
    }

    await StaffLocationAssignment.findByIdAndDelete(req.params.id);

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'staff-location-assignments.delete',
      resource: 'StaffLocationAssignment',
      resourceId: assignment._id,
      description: 'Personal-Standort-Zuweisung gelöscht',
      details: { assignment: assignment.toObject() },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Standort-Zuweisung erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting staff location assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Standort-Zuweisung'
    });
  }
});

// Mitarbeiter-Standorte abrufen
router.get('/staff/:staff_id', auth, async (req, res) => {
  try {
    // RBAC-Berechtigung prüfen
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.STAFF, req.params.staff_id, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Personalverwaltung'
      });
    }

    const assignments = await StaffLocationAssignment.find({ staff_id: req.params.staff_id })
      .populate('location_id', 'name code city address_line1 postal_code')
      .populate('allowed_services', 'name code')
      .sort({ is_primary: -1, location_id: 1 });

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching staff locations:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Mitarbeiter-Standorte'
    });
  }
});

// Standort-Mitarbeiter abrufen
router.get('/location/:location_id', auth, async (req, res) => {
  try {
    // RBAC-Berechtigung prüfen
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.STAFF, req.params.location_id, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Personalverwaltung'
      });
    }

    const assignments = await StaffLocationAssignment.find({ location_id: req.params.location_id })
      .populate('staff_id', 'display_name email role department')
      .populate('allowed_services', 'name code')
      .sort({ is_primary: -1, staff_id: 1 });

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching location staff:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Standort-Mitarbeiter'
    });
  }
});

// Standorte des aktuell eingeloggten Users abrufen
router.get('/user/me', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    // Finde StaffProfile für diesen User (StaffProfile verwendet 'userId' Feld)
    const staffProfile = await StaffProfile.findOne({ userId: userId });
    
    if (!staffProfile) {
      // Kein StaffProfile gefunden → Alle Standorte verfügbar
      const allLocations = await Location.find({ is_active: true }).sort({ name: 1 });
      return res.json({
        success: true,
        data: {
          locations: allLocations.map(loc => ({
            _id: loc._id,
            name: loc.name,
            code: loc.code,
            city: loc.city,
            is_primary: false
          })),
          hasNoAssignment: true,
          primaryLocation: allLocations.length > 0 ? allLocations[0]._id : null
        }
      });
    }

    // Finde Standort-Zuweisungen für dieses StaffProfile
    const assignments = await StaffLocationAssignment.find({ staff_id: staffProfile._id })
      .populate('location_id', 'name code city address_line1 postal_code')
      .populate('allowed_services', 'name code')
      .sort({ is_primary: -1, location_id: 1 });

    if (assignments.length === 0) {
      // Keine Zuweisungen → Alle Standorte verfügbar
      const allLocations = await Location.find({ is_active: true }).sort({ name: 1 });
      return res.json({
        success: true,
        data: {
          locations: allLocations.map(loc => ({
            _id: loc._id,
            name: loc.name,
            code: loc.code,
            city: loc.city,
            is_primary: false
          })),
          hasNoAssignment: true,
          primaryLocation: allLocations.length > 0 ? allLocations[0]._id : null
        }
      });
    }

    // Zuweisungen gefunden
    const primaryAssignment = assignments.find(a => a.is_primary) || assignments[0];
    
    res.json({
      success: true,
      data: {
        locations: assignments.map(a => ({
          _id: typeof a.location_id === 'object' ? a.location_id._id : a.location_id,
          name: typeof a.location_id === 'object' ? a.location_id.name : '',
          code: typeof a.location_id === 'object' ? a.location_id.code : '',
          city: typeof a.location_id === 'object' ? a.location_id.city : '',
          is_primary: a.is_primary,
          allowed_services: a.allowed_services || []
        })),
        hasNoAssignment: false,
        primaryLocation: typeof primaryAssignment.location_id === 'object' 
          ? primaryAssignment.location_id._id 
          : primaryAssignment.location_id
      }
    });
  } catch (error) {
    console.error('Error fetching user locations:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Benutzer-Standorte'
    });
  }
});

module.exports = router;
