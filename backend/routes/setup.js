const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

/**
 * Super Administrator Setup Routes
 * 
 * Diese Routen ermöglichen es, Super Administratoren zu erstellen und zu verwalten.
 * Sie sollten nur in speziellen Setup-Situationen verwendet werden.
 */

// @route   POST /api/setup/super-admin
// @desc    Erstelle einen Super Administrator
// @access  Public (nur während Setup)
router.post('/super-admin', [
  body('firstName').notEmpty().trim().withMessage('Vorname ist erforderlich'),
  body('lastName').notEmpty().trim().withMessage('Nachname ist erforderlich'),
  body('email').isEmail().normalizeEmail().withMessage('Gültige E-Mail ist erforderlich'),
  body('password').isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen lang sein'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwort-Bestätigung stimmt nicht überein');
    }
    return true;
  })
], async (req, res) => {
  try {
    // Prüfe Validierung
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    // Prüfe ob bereits ein Super Admin existiert
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Super Administrator existiert bereits',
        existingAdmin: {
          email: existingSuperAdmin.email,
          createdAt: existingSuperAdmin.createdAt
        }
      });
    }

    // Prüfe ob E-Mail bereits verwendet wird
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail-Adresse wird bereits verwendet'
      });
    }

    const { firstName, lastName, email, password } = req.body;

    // Hash das Passwort
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Erstelle Super Admin
    const superAdmin = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'super_admin',
      isActive: true,
      emailVerified: true,
      lastLogin: new Date(),
      rbac: {
        resourceRoles: [],
        customPermissions: [
          {
            resource: '*',
            actions: ['*'],
            grantedBy: null, // System-granted
            grantedAt: new Date(),
            reason: 'Initial super admin setup'
          }
        ],
        delegations: [],
        permissionHistory: [
          {
            action: 'created',
            permission: 'all',
            resource: '*',
            changedBy: null, // System-Aktion
            changedAt: new Date(),
            reason: 'Initial super admin creation via API'
          }
        ]
      },
      preferences: {
        language: 'de',
        timezone: 'Europe/Vienna',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      },
      metadata: {
        createdBy: 'api',
        setupMethod: 'api',
        version: '1.0.0',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    await superAdmin.save();

    res.status(201).json({
      success: true,
      message: 'Super Administrator erfolgreich erstellt',
      data: {
        id: superAdmin._id,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        email: superAdmin.email,
        role: superAdmin.role,
        createdAt: superAdmin.createdAt,
        isActive: superAdmin.isActive
      }
    });

  } catch (error) {
    console.error('Super Admin Setup Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Super Administrators'
    });
  }
});

// @route   GET /api/setup/status
// @desc    Prüfe Setup-Status
// @access  Public
router.get('/status', async (req, res) => {
  try {
    // Prüfe ob Super Admin existiert
    const superAdminExists = await User.findOne({ role: 'super_admin' });
    
    // Zähle alle Benutzer
    const userCount = await User.countDocuments();
    
    // Prüfe ob Admin-Benutzer existieren
    const adminExists = await User.findOne({ role: 'admin' });

    res.json({
      success: true,
      data: {
        superAdminExists: !!superAdminExists,
        userCount,
        adminExists: !!adminExists,
        needsSetup: !superAdminExists && userCount === 0,
        setupComplete: !!superAdminExists,
        recommendations: {
          needsSuperAdmin: !superAdminExists,
          hasUsers: userCount > 0,
          hasAdmin: !!adminExists
        }
      }
    });

  } catch (error) {
    console.error('Setup Status Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Prüfen des Setup-Status'
    });
  }
});

// @route   POST /api/setup/promote-to-super-admin
// @desc    Befördere einen bestehenden Admin zum Super Admin
// @access  Private (nur für Super Admins)
router.post('/promote-to-super-admin', auth, async (req, res) => {
  try {
    // Prüfe ob aktueller Benutzer Super Admin ist
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Super Administratoren können andere Benutzer befördern'
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Benutzer-ID ist erforderlich'
      });
    }

    // Finde den Benutzer
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Prüfe ob bereits Super Admin
    if (user.role === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Benutzer ist bereits Super Administrator'
      });
    }

    // Befördere zum Super Admin
    const oldRole = user.role;
    user.role = 'super_admin';
    
    // Füge Permission History hinzu
    if (!user.rbac) {
      user.rbac = {
        resourceRoles: [],
        customPermissions: [],
        delegations: [],
        permissionHistory: []
      };
    }

    user.rbac.permissionHistory.push({
      action: 'promoted',
      permission: 'super_admin',
      resource: 'user',
      resourceId: user._id,
      changedBy: req.user._id,
      changedAt: new Date(),
      reason: `Befördert von ${oldRole} zu super_admin`,
      previousValue: oldRole
    });

    await user.save();

    res.json({
      success: true,
      message: 'Benutzer erfolgreich zum Super Administrator befördert',
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        oldRole,
        newRole: user.role,
        promotedAt: new Date(),
        promotedBy: req.user._id
      }
    });

  } catch (error) {
    console.error('Promote to Super Admin Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Befördern zum Super Administrator'
    });
  }
});

module.exports = router;
