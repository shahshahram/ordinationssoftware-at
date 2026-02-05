const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { authorize, ACTIONS, RESOURCES } = require('../utils/rbac');
const StaffProfile = require('../models/StaffProfile');
const User = require('../models/User');
const StaffLocationAssignment = require('../models/StaffLocationAssignment');
const AuditLog = require('../models/AuditLog');
const Absence = require('../models/Absence');

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

    const { page = 1, limit = 50, search = '', role = '', active = '', sync = 'false' } = req.query;
    const query = {};

    // Automatische Synchronisation: Nur bei expliziter Anfrage (sync=true) ausführen
    // Dies verbessert die Performance erheblich, da die Synchronisation nicht bei jedem Request läuft
    if (sync === 'true') {
      try {
        const activeUsers = await User.find({ isActive: true }).select('_id firstName lastName email role isActive color_hex');
        const userIds = activeUsers.map(u => u._id);
        
        // Finde alle existierenden Profile in einem Query
        const existingProfiles = await StaffProfile.find({ userId: { $in: userIds } }).select('userId displayName isActive');
        const existingUserIds = new Set(existingProfiles.map(p => p.userId.toString()));
        
        // Erstelle nur fehlende Profile
        const profilesToCreate = [];
        const profilesToUpdate = [];
        
        for (const user of activeUsers) {
          const existingProfile = existingProfiles.find(p => p.userId.toString() === user._id.toString());
          if (!existingProfile) {
            profilesToCreate.push({
              userId: user._id,
              displayName: `${user.firstName} ${user.lastName}`,
              roleHint: user.role || 'staff',
              isActive: user.isActive,
              colorHex: user.color_hex || '#6B7280'
            });
          } else {
            // Prüfe ob Update nötig ist
            const expectedDisplayName = `${user.firstName} ${user.lastName}`;
            if (existingProfile.displayName !== expectedDisplayName || existingProfile.isActive !== user.isActive) {
              profilesToUpdate.push({
                profile: existingProfile,
                displayName: expectedDisplayName,
                isActive: user.isActive
              });
            }
          }
        }
        
        // Batch-Insert für neue Profile
        if (profilesToCreate.length > 0) {
          await StaffProfile.insertMany(profilesToCreate);
          console.log(`✅ Auto-created ${profilesToCreate.length} StaffProfiles`);
        }
        
        // Batch-Update für bestehende Profile
        if (profilesToUpdate.length > 0) {
          await Promise.all(profilesToUpdate.map(({ profile, displayName, isActive }) => {
            profile.displayName = displayName;
            profile.isActive = isActive;
            return profile.save();
          }));
          console.log(`✅ Updated ${profilesToUpdate.length} StaffProfiles`);
        }
      } catch (syncError) {
        console.error('Error during staff profile sync:', syncError);
        // Continue despite sync errors
      }
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

    // Konvertiere limit zu Number und setze Maximum
    const limitNum = Math.min(parseInt(limit) || 50, 500); // Maximum 500, Standard 50
    const pageNum = parseInt(page) || 1;
    
    const staffProfiles = await StaffProfile.find(query)
      .populate({
        path: 'userId',
        select: 'firstName lastName email color_hex profile',
        // Stelle sicher, dass profile vollständig geladen wird
      })
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean(); // Verwende lean() für bessere Performance

    const total = await StaffProfile.countDocuments(query);

    // Optimierung: Lade alle Location-Assignments in einem Query (vermeidet N+1 Problem)
    const staffProfileIds = staffProfiles.map(p => p._id);
    const allLocationAssignments = await StaffLocationAssignment.find({ 
      staff_id: { $in: staffProfileIds } 
    })
      .populate('location_id', '_id name')
      .lean();
    
    // Erstelle Map für schnellen Zugriff
    const locationAssignmentsMap = new Map();
    allLocationAssignments.forEach(assignment => {
      const staffId = assignment.staff_id.toString();
      if (!locationAssignmentsMap.has(staffId)) {
        locationAssignmentsMap.set(staffId, []);
      }
      locationAssignmentsMap.get(staffId).push({
        _id: assignment.location_id._id,
        name: assignment.location_id.name,
        is_primary: assignment.is_primary
      });
    });

    // Füge Locations zu jedem Profil hinzu
    const staffProfilesWithLocations = staffProfiles.map(profile => ({
      ...profile,
      locations: locationAssignmentsMap.get(profile._id.toString()) || []
    }));

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
    const transformedProfiles = staffProfilesWithLocations.map(profile => {
      // Online-Buchung: IMMER aus User.profile.onlineBookingEnabled (auch wenn false)
      // Nur wenn userId nicht populated ist oder profile nicht existiert, verwende acceptsOnline als Fallback
      let isOnlineBookable = false;
      if (profile.userId && typeof profile.userId === 'object' && profile.userId.profile) {
        // userId ist populated und hat ein profile-Objekt
        isOnlineBookable = profile.userId.profile.onlineBookingEnabled === true;
      } else if (profile.acceptsOnline !== undefined) {
        // Fallback: Verwende acceptsOnline nur wenn userId nicht verfügbar ist
        isOnlineBookable = profile.acceptsOnline === true;
      }
      
      return {
        _id: profile._id,
        user_id: profile.userId?._id || profile.userId, // String ID
        userId: profile.userId, // Full object (populated)
        display_name: profile.displayName,
        first_name: profile.userId?.firstName || '',
        last_name: profile.userId?.lastName || '',
        email: profile.userId?.email || profile.contact?.email || '',
        role: profile.roleHint,
        color_hex: profile.userId?.color_hex || profile.colorHex || '#6B7280', // Use user color first, fallback to profile color
        isActive: profile.isActive,
        // StaffProfile-spezifische Felder
        title: profile.title || profile.userId?.profile?.title || '',
        specialization: Array.isArray(profile.specializations) && profile.specializations.length > 0 
          ? profile.specializations[0] 
          : (profile.userId?.profile?.specialization || ''),
        specializations: profile.specializations || [],
        phone: profile.contact?.phone || profile.userId?.profile?.phone || '',
        contact: profile.contact || {},
        // Online-Buchung: IMMER aus User.profile.onlineBookingEnabled
        isOnlineBookable: isOnlineBookable,
        locations: profile.locations || [],
        weeklyHours: profile.weeklyHours ?? 40,
        vacationDaysPerYear: profile.vacationDaysPerYear ?? 25,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      };
    });

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

// Eigenes Personalprofil des eingeloggten Benutzers (für Self-Service z. B. Mein Urlaubsantrag)
router.get('/me', auth, async (req, res) => {
  try {
    const staffProfile = await StaffProfile.findOne({ userId: req.user._id })
      .select('_id displayName roleHint colorHex')
      .lean();
    if (!staffProfile) {
      return res.status(404).json({
        success: false,
        message: 'Kein Personalprofil für diesen Benutzer vorhanden'
      });
    }
    res.json({ success: true, data: staffProfile });
  } catch (error) {
    console.error('StaffProfile me fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des eigenen Personalprofils',
      error: error.message
    });
  }
});

// Urlaubskonto-Statistik des eingeloggten Benutzers (Kalenderjahr)
router.get('/me/vacation-stats', auth, async (req, res) => {
  try {
    const profile = await StaffProfile.findOne({ userId: req.user._id }).lean();
    if (!profile) {
      return res.status(200).json({
        success: true,
        data: { total: 0, used: 0, remaining: 0 }
      });
    }
    const total = profile.vacationDaysPerYear ?? 25;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    const absences = await Absence.find({
      staffId: profile._id,
      status: 'approved',
      reason: 'vacation',
      startsAt: { $gte: startOfYear },
      endsAt: { $lte: endOfYear }
    }).lean();
    let used = 0;
    for (const a of absences) {
      const start = new Date(a.startsAt).getTime();
      const end = new Date(a.endsAt).getTime();
      used += Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
    }
    const remaining = Math.max(0, total - used);
    res.json({
      success: true,
      data: { total, used, remaining }
    });
  } catch (error) {
    console.error('Vacation stats fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Urlaubsstatistik',
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
  body('roleHint').isIn(['super_admin', 'admin', 'arzt', 'assistent', 'assistenz', 'rezeption', 'billing', 'patient', 'therapeut', 'staff', 'nurse', 'receptionist', 'assistant', 'doctor']).withMessage('Ungültige Rolle')
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
  body('roleHint').optional().isIn(['super_admin', 'admin', 'arzt', 'assistent', 'assistenz', 'rezeption', 'billing', 'patient', 'therapeut', 'staff', 'nurse', 'receptionist', 'assistant', 'doctor']).withMessage('Ungültige Rolle')
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
