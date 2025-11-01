const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { authorize, ACTIONS, RESOURCES } = require('../utils/rbac');
const StaffProfile = require('../models/StaffProfile');
const User = require('../models/User');
const StaffLocationAssignment = require('../models/StaffLocationAssignment');
const AuditLog = require('../models/AuditLog');

// Alle Personalprofile abrufen
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
        message: 'Keine Berechtigung für Personalprofile'
      });
    }

    const { page = 1, limit = 10, search = '', role = '', active = '' } = req.query;
    const query = {};

    // Automatische Synchronisation: Erstelle StaffProfile für alle aktiven User
    try {
      const activeUsers = await User.find({ isActive: true });
      for (const user of activeUsers) {
        const existingProfile = await StaffProfile.findOne({ userId: user._id });
        if (!existingProfile) {
          // Automatisch StaffProfile erstellen
          const staffProfile = new StaffProfile({
            userId: user._id,
            displayName: `${user.firstName} ${user.lastName}`,
            roleHint: user.role || 'staff',
            isActive: user.isActive,
            colorHex: user.color_hex || '#6B7280'
          });
          await staffProfile.save();
          console.log(`✅ Auto-created StaffProfile for user: ${user.email}`);
        } else {
          // Aktualisiere bestehendes StaffProfile falls User-Infos geändert wurden
          if (existingProfile.displayName !== `${user.firstName} ${user.lastName}`) {
            existingProfile.displayName = `${user.firstName} ${user.lastName}`;
            existingProfile.isActive = user.isActive;
            await existingProfile.save();
            console.log(`✅ Updated StaffProfile for user: ${user.email}`);
          }
        }
      }
    } catch (syncError) {
      console.error('Error during staff profile sync:', syncError);
      // Continue despite sync errors
    }

    // Suchfilter
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    // Rollenfilter
    if (role) {
      query.roleHint = role;
    }

    // Aktivitätsfilter
    if (active !== '') {
      query.isActive = active === 'true';
    }

    const staffProfiles = await StaffProfile.find(query)
      .populate('userId', 'firstName lastName email color_hex')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await StaffProfile.countDocuments(query);

    // Get location assignments for each staff profile
    const staffProfilesWithLocations = await Promise.all(
      staffProfiles.map(async (profile) => {
        const locationAssignments = await StaffLocationAssignment.find({ staff_id: profile._id })
          .populate('location_id', '_id name')
          .lean();
        
        const locations = locationAssignments.map(assignment => ({
          _id: assignment.location_id._id,
          name: assignment.location_id.name,
          is_primary: assignment.is_primary
        }));

        return {
          ...profile.toObject(),
          locations
        };
      })
    );

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'staff_profiles.read',
      description: 'Personalprofile abgerufen',
      details: { page, limit, search, role, active }
    });

    // Transform field names for frontend compatibility
    const transformedProfiles = staffProfilesWithLocations.map(profile => ({
      _id: profile._id,
      user_id: profile.userId,
      display_name: profile.displayName,
      first_name: profile.userId?.firstName || '',
      last_name: profile.userId?.lastName || '',
      email: profile.userId?.email || '',
      role: profile.roleHint,
      color_hex: profile.userId?.color_hex || profile.colorHex || '#6B7280', // Use user color first, fallback to profile color
      isActive: profile.isActive,
      locations: profile.locations || [],
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    }));

    res.json({
      success: true,
      data: transformedProfiles,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('StaffProfile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Personalprofile',
      error: error.message
    });
  }
});

// Statistiken abrufen
router.get('/statistics', auth, async (req, res) => {
  try {
    // Berechtigung prüfen
    if (!req.user.permissions.includes('users.read')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Personalstatistiken'
      });
    }

    const totalStaff = await StaffProfile.countDocuments();
    const activeStaff = await StaffProfile.countDocuments({ isActive: true });
    const inactiveStaff = await StaffProfile.countDocuments({ isActive: false });
    
    // Statistiken nach Rollen
    const roleStats = await StaffProfile.aggregate([
      {
        $group: {
          _id: '$roleHint',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      }
    ]);

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'staff_profiles.statistics',
      description: 'Personalstatistiken abgerufen',
      details: {}
    });

    res.json({
      success: true,
      data: {
        total: totalStaff,
        active: activeStaff,
        inactive: inactiveStaff,
        byRole: roleStats
      }
    });
  } catch (error) {
    console.error('Staff statistics fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Personalstatistiken',
      error: error.message
    });
  }
});

// Einzelnes Personalprofil abrufen
router.get('/:id', auth, async (req, res) => {
  try {
    const staffProfile = await StaffProfile.findById(req.params.id)
      .populate('userId', 'firstName lastName email color_hex')
      .populate('substituteFor', 'displayName roleHint');

    if (!staffProfile) {
      return res.status(404).json({
        success: false,
        message: 'Personalprofil nicht gefunden'
      });
    }

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'staff_profiles.read',
      description: 'Personalprofil abgerufen',
      details: { staffProfileId: req.params.id }
    });

    res.json({
      success: true,
      data: staffProfile
    });
  } catch (error) {
    console.error('StaffProfile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Personalprofils',
      error: error.message
    });
  }
});

// Manuelle Synchronisation: Erstelle StaffProfiles für alle aktiven User
router.post('/sync', auth, async (req, res) => {
  try {
    const activeUsers = await User.find({ isActive: true });
    let createdCount = 0;
    let updatedCount = 0;

    for (const user of activeUsers) {
      const existingProfile = await StaffProfile.findOne({ userId: user._id });
      if (!existingProfile) {
        // Automatisch StaffProfile erstellen
        const staffProfile = new StaffProfile({
          userId: user._id,
          displayName: `${user.firstName} ${user.lastName}`,
          roleHint: user.role || 'staff',
          isActive: user.isActive,
          colorHex: user.color_hex || '#6B7280'
        });
        await staffProfile.save();
        createdCount++;
        console.log(`✅ Auto-created StaffProfile for user: ${user.email}`);
      } else {
        // Aktualisiere bestehendes StaffProfile falls User-Infos geändert wurden
        let needsUpdate = false;
        if (existingProfile.displayName !== `${user.firstName} ${user.lastName}`) {
          existingProfile.displayName = `${user.firstName} ${user.lastName}`;
          needsUpdate = true;
        }
        if (existingProfile.isActive !== user.isActive) {
          existingProfile.isActive = user.isActive;
          needsUpdate = true;
        }
        if (existingProfile.roleHint !== user.role && user.role) {
          existingProfile.roleHint = user.role;
          needsUpdate = true;
        }
        if (needsUpdate) {
          await existingProfile.save();
          updatedCount++;
          console.log(`✅ Updated StaffProfile for user: ${user.email}`);
        }
      }
    }

    res.json({
      success: true,
      message: `Synchronisation abgeschlossen: ${createdCount} erstellt, ${updatedCount} aktualisiert`,
      data: { created: createdCount, updated: updatedCount }
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Synchronisation',
      error: error.message
    });
  }
});

// Personalprofil erstellen
router.post('/', auth, [
  body('userId').notEmpty().withMessage('Benutzer-ID ist erforderlich'),
  body('displayName').notEmpty().withMessage('Anzeigename ist erforderlich'),
  body('roleHint').isIn(['arzt', 'assistenz', 'therapeut', 'admin', 'staff', 'nurse', 'receptionist', 'assistant', 'doctor']).withMessage('Ungültige Rolle')
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
    if (!req.user.permissions.includes('users.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Erstellen von Personalprofilen'
      });
    }

    // Prüfen ob Benutzer existiert
    const user = await User.findById(req.body.userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Prüfen ob bereits ein Profil existiert
    const existingProfile = await StaffProfile.findOne({ userId: req.body.userId });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'Für diesen Benutzer existiert bereits ein Personalprofil'
      });
    }

    const staffProfile = new StaffProfile({
      ...req.body,
      createdBy: req.user._id
    });

    await staffProfile.save();
    await staffProfile.populate('userId', 'firstName lastName email color_hex');

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'staff_profiles.create',
      description: 'Personalprofil erstellt',
      details: { staffProfileId: staffProfile._id, displayName: staffProfile.displayName }
    });

    res.status(201).json({
      success: true,
      data: staffProfile
    });
  } catch (error) {
    console.error('StaffProfile creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Personalprofils',
      error: error.message
    });
  }
});

// Personalprofil aktualisieren
router.put('/:id', auth, [
  body('displayName').optional().notEmpty().withMessage('Anzeigename darf nicht leer sein'),
  body('roleHint').optional().isIn(['arzt', 'assistenz', 'therapeut', 'admin']).withMessage('Ungültige Rolle')
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
    if (!req.user.permissions.includes('users.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Aktualisieren von Personalprofilen'
      });
    }

    const staffProfile = await StaffProfile.findById(req.params.id);
    if (!staffProfile) {
      return res.status(404).json({
        success: false,
        message: 'Personalprofil nicht gefunden'
      });
    }

    Object.assign(staffProfile, req.body);
    staffProfile.updatedAt = new Date();
    await staffProfile.save();
    await staffProfile.populate('userId', 'firstName lastName email color_hex');

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'staff_profiles.update',
      description: 'Personalprofil aktualisiert',
      details: { staffProfileId: req.params.id, changes: req.body }
    });

    res.json({
      success: true,
      data: staffProfile
    });
  } catch (error) {
    console.error('StaffProfile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Personalprofils',
      error: error.message
    });
  }
});

// Personalprofil-Status umschalten
router.patch('/:id/toggle-status', auth, async (req, res) => {
  try {
    // Berechtigung prüfen
    if (!req.user.permissions.includes('users.write')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Ändern des Personalprofil-Status'
      });
    }

    const staffProfile = await StaffProfile.findById(req.params.id);
    if (!staffProfile) {
      return res.status(404).json({
        success: false,
        message: 'Personalprofil nicht gefunden'
      });
    }

    staffProfile.isActive = !staffProfile.isActive;
    staffProfile.updatedAt = new Date();
    await staffProfile.save();

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'staff_profiles.toggle_status',
      description: `Personalprofil ${staffProfile.isActive ? 'aktiviert' : 'deaktiviert'}`,
      details: { staffProfileId: req.params.id, newStatus: staffProfile.isActive }
    });

    res.json({
      success: true,
      data: staffProfile,
      message: `Personalprofil ${staffProfile.isActive ? 'aktiviert' : 'deaktiviert'}`
    });
  } catch (error) {
    console.error('StaffProfile toggle status error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Umschalten des Personalprofil-Status',
      error: error.message
    });
  }
});

// Personalprofil löschen
router.delete('/:id', auth, async (req, res) => {
  try {
    // Berechtigung prüfen
    if (!req.user.permissions.includes('users.delete')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Löschen von Personalprofilen'
      });
    }

    const staffProfile = await StaffProfile.findById(req.params.id);
    if (!staffProfile) {
      return res.status(404).json({
        success: false,
        message: 'Personalprofil nicht gefunden'
      });
    }

    await StaffProfile.findByIdAndDelete(req.params.id);

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'staff_profiles.delete',
      description: 'Personalprofil gelöscht',
      details: { staffProfileId: req.params.id, displayName: staffProfile.displayName }
    });

    res.json({
      success: true,
      message: 'Personalprofil erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('StaffProfile delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Personalprofils',
      error: error.message
    });
  }
});

// Verfügbare Rollen abrufen
router.get('/roles/available', auth, async (req, res) => {
  try {
    const roles = [
      { value: 'arzt', label: 'Arzt/Ärztin' },
      { value: 'assistenz', label: 'Ordinationsassistenz' },
      { value: 'therapeut', label: 'Therapeut/in' },
      { value: 'admin', label: 'Administrator/in' }
    ];

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Available roles fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der verfügbaren Rollen',
      error: error.message
    });
  }
});

module.exports = router;
