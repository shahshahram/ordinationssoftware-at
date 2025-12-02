const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const TwoFactorService = require('../services/twoFactorService');
const LoginSecurityService = require('../services/loginSecurityService');
const DSGVOService = require('../services/dsgvoService');
const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('role').isIn(['admin', 'doctor', 'staff'])
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

    const { email, password, firstName, lastName, role } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'Benutzer existiert bereits'
      });
    }

    // Create user
    user = new User({
      email,
      password,
      firstName,
      lastName,
      role
    });

    await user.save();

    // Create JWT
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({
          success: true,
          message: 'Benutzer erfolgreich registriert',
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          }
        });
      }
    );
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    console.log('Login request received:', { email: req.body.email, passwordLength: req.body.password?.length });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Mock user for demo purposes (fallback when MongoDB is not available)
    const mockUsers = {
      'admin@ordinationssoftware.at': {
        id: '1',
        email: 'admin@ordinationssoftware.at',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'Administrator',
        role: 'admin',
        permissions: ['patients.read', 'patients.write', 'patients.delete', 'appointments.read', 'appointments.write', 'appointments.delete', 'billing.read', 'billing.write', 'documents.read', 'documents.write', 'documents.delete', 'users.read', 'users.write', 'users.delete', 'settings.read', 'settings.write', 'reports.read']
      },
      'arzt@ordinationssoftware.at': {
        id: '2',
        email: 'arzt@ordinationssoftware.at',
        password: 'arzt123',
        firstName: 'Max',
        lastName: 'Mustermann',
        role: 'doctor',
        permissions: ['patients.read', 'patients.write', 'appointments.read', 'appointments.write', 'billing.read', 'billing.write', 'documents.read', 'documents.write', 'reports.read']
      },
      'mitarbeiter@ordinationssoftware.at': {
        id: '3',
        email: 'mitarbeiter@ordinationssoftware.at',
        password: 'mitarbeiter123',
        firstName: 'Maria',
        lastName: 'Musterfrau',
        role: 'staff',
        permissions: ['patients.read', 'patients.write', 'appointments.read', 'appointments.write', 'billing.read', 'documents.read', 'documents.write']
      }
    };

    let user = null;
    let isMockUser = false;

    try {
      // Try to find user in MongoDB first
      user = await User.findOne({ email }).select('+password');
      if (user) {
        // Verify password for MongoDB user
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return res.status(400).json({
            success: false,
            message: 'Ungültige Anmeldedaten'
          });
        }
      }
    } catch (dbError) {
      console.log('MongoDB nicht verfügbar, verwende Mock-Daten');
    }

    // If no MongoDB user found, try mock users
    if (!user) {
      user = mockUsers[email];
      isMockUser = true;
      
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Ungültige Anmeldedaten'
        });
      }

      // Check password for mock user (simple comparison)
      if (password !== user.password) {
        return res.status(400).json({
          success: false,
          message: 'Ungültige Anmeldedaten'
        });
      }
    }

    // Create JWT and refresh token
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '7d' }
    );
    
    // Session Management: Erstelle Session in Datenbank
    try {
      const Session = require('../models/Session');
      const maxSessions = parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5');
      await Session.createSession(
        user._id || user.id,
        token,
        refreshToken,
        req.ip,
        req.get('user-agent'),
        {
          maxSessions,
          deviceInfo: req.get('user-agent')
        }
      );
    } catch (sessionError) {
      console.error('Session creation error:', sessionError);
      // Session-Erstellung ist nicht kritisch, Login kann trotzdem fortgesetzt werden
    }
    
    // Update last login for MongoDB users
    if (!isMockUser) {
      user.lastLogin = new Date();
      user.save().catch(err => console.log('Could not update last login:', err));
    }

    res.json({
      success: true,
      message: 'Erfolgreich angemeldet',
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions || user.getDefaultPermissions?.() || []
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    console.log('Load user request for ID:', req.user._id || req.user.id);
    
    // Mock users for fallback
    const mockUsers = {
      '1': {
        id: '1',
        email: 'admin@ordinationssoftware.at',
        firstName: 'Admin',
        lastName: 'Administrator',
        role: 'admin',
        permissions: ['patients.read', 'patients.write', 'patients.delete', 'appointments.read', 'appointments.write', 'appointments.delete', 'billing.read', 'billing.write', 'documents.read', 'documents.write', 'documents.delete', 'users.read', 'users.write', 'users.delete', 'settings.read', 'settings.write', 'reports.read']
      },
      '2': {
        id: '2',
        email: 'arzt@ordinationssoftware.at',
        firstName: 'Max',
        lastName: 'Mustermann',
        role: 'doctor',
        permissions: ['patients.read', 'patients.write', 'appointments.read', 'appointments.write', 'billing.read', 'billing.write', 'documents.read', 'documents.write', 'reports.read']
      },
      '3': {
        id: '3',
        email: 'mitarbeiter@ordinationssoftware.at',
        firstName: 'Maria',
        lastName: 'Musterfrau',
        role: 'staff',
        permissions: ['patients.read', 'patients.write', 'appointments.read', 'appointments.write', 'billing.read', 'documents.read', 'documents.write']
      }
    };

    let user = null;

    try {
      // Try to find user in MongoDB first
      user = await User.findById(req.user._id || req.user.id).select('-password');
      if (user) {
        console.log('Found user in MongoDB:', user.email);
        // Convert MongoDB user to the expected format
        user = {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: user.permissions || []
        };
      }
    } catch (dbError) {
      console.log('MongoDB not available, using mock data');
    }

    // If no MongoDB user found, try mock users
    if (!user) {
      const userId = req.user._id || req.user.id;
      user = mockUsers[userId];
      if (user) {
        console.log('Found user in mock data:', user.email);
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Note: lastLogin update removed since we're now using a plain object

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions || user.getDefaultPermissions?.() || []
      }
    });
  } catch (error) {
    console.error('Load user error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
  body('firstName').optional().notEmpty().trim(),
  body('lastName').optional().notEmpty().trim(),
  body('profile.title').optional().trim(),
  body('profile.specialization').optional().trim(),
  body('profile.phone').optional().trim(),
  body('preferences.language').optional().isIn(['de', 'en']),
  body('preferences.theme').optional().isIn(['light', 'dark'])
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

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Update allowed fields
    const allowedFields = ['firstName', 'lastName', 'profile', 'preferences'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'profile' || field === 'preferences') {
          user[field] = { ...user[field], ...req.body[field] };
        } else {
          user[field] = req.body[field];
        }
      }
    });

    await user.save();

    res.json({
      success: true,
      message: 'Profil erfolgreich aktualisiert',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profile: user.profile,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put('/password', auth, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
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

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Aktuelles Passwort ist falsch'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Passwort erfolgreich geändert'
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (beendet Session)
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
    
    // Session Management: Beende aktuelle Session
    try {
      const Session = require('../models/Session');
      if (token) {
        await Session.endSession(token);
      }
    } catch (sessionError) {
      // Session-Beendigung ist nicht kritisch
      console.warn('Session end error:', sessionError.message);
    }
    
    res.json({
      success: true,
      message: 'Erfolgreich abgemeldet'
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   GET /api/auth/verify
// @desc    Verify token
// @access  Private
router.get('/verify', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Token gültig',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   POST /api/auth/2fa/setup
// @desc    Setup 2FA for user
// @access  Private
router.post('/2fa/setup', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Generate 2FA secret
    const secretData = TwoFactorService.generateSecret(user.email);
    const qrCodeUrl = await TwoFactorService.generateQRCode(secretData.qrCodeUrl);
    const backupCodes = TwoFactorService.generateBackupCodes();

    // Save secret and backup codes (but don't enable 2FA yet)
    user.twoFactorAuth = {
      enabled: false,
      secret: secretData.secret,
      backupCodes: backupCodes
    };
    await user.save();

    // Log 2FA setup
    await AuditLog.createLog({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: '2FA_SETUP_INITIATED',
      description: '2FA-Setup initiiert',
      severity: 'MEDIUM',
      success: true
    });

    res.json({
      success: true,
      message: '2FA-Setup vorbereitet',
      qrCode: qrCodeUrl,
      backupCodes: backupCodes,
      secret: secretData.secret
    });
  } catch (error) {
    logger.error('Fehler beim 2FA-Setup:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   POST /api/auth/2fa/verify
// @desc    Verify 2FA token and enable 2FA
// @access  Private
router.post('/2fa/verify', auth, [
  body('token').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Token'
      });
    }

    const { token } = req.body;
    const user = await User.findById(req.user.id);
    if (!user || !user.twoFactorAuth || !user.twoFactorAuth.secret) {
      return res.status(400).json({
        success: false,
        message: '2FA nicht konfiguriert'
      });
    }

    // Verify token
    const isValid = TwoFactorService.verifyToken(user.twoFactorAuth.secret, token);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger 2FA-Token'
      });
    }

    // Enable 2FA
    user.twoFactorAuth.enabled = true;
    user.twoFactorAuth.lastUsed = new Date();
    await user.save();

    // Log 2FA enabled
    await AuditLog.createLog({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: '2FA_ENABLED',
      description: '2FA erfolgreich aktiviert',
      severity: 'HIGH',
      success: true
    });

    res.json({
      success: true,
      message: '2FA erfolgreich aktiviert',
      backupCodes: user.twoFactorAuth.backupCodes
    });
  } catch (error) {
    logger.error('Fehler bei 2FA-Verifikation:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   POST /api/auth/2fa/disable
// @desc    Disable 2FA for user
// @access  Private
router.post('/2fa/disable', auth, [
  body('password').notEmpty(),
  body('token').optional().isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler'
      });
    }

    const { password, token } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Falsches Passwort'
      });
    }

    // If 2FA is enabled, verify token
    if (user.twoFactorAuth && user.twoFactorAuth.enabled) {
      if (!token) {
        return res.status(400).json({
          success: false,
          message: '2FA-Token erforderlich'
        });
      }

      const isValidToken = TwoFactorService.verifyToken(user.twoFactorAuth.secret, token);
      if (!isValidToken) {
        return res.status(400).json({
          success: false,
          message: 'Ungültiger 2FA-Token'
        });
      }
    }

    // Disable 2FA
    user.twoFactorAuth = {
      enabled: false,
      secret: null,
      backupCodes: [],
      lastUsed: null
    };
    await user.save();

    // Log 2FA disabled
    await AuditLog.createLog({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: '2FA_DISABLED',
      description: '2FA deaktiviert',
      severity: 'HIGH',
      success: true
    });

    res.json({
      success: true,
      message: '2FA erfolgreich deaktiviert'
    });
  } catch (error) {
    logger.error('Fehler beim Deaktivieren von 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   GET /api/auth/2fa/status
// @desc    Get 2FA status for user
// @access  Private
router.get('/2fa/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    const isConfigured = TwoFactorService.isConfigured(user);
    const remainingBackupCodes = TwoFactorService.getRemainingBackupCodes(user);

    res.json({
      success: true,
      enabled: user.twoFactorAuth?.enabled || false,
      configured: isConfigured,
      remainingBackupCodes: remainingBackupCodes
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen des 2FA-Status:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   POST /api/auth/2fa/backup-codes
// @desc    Generate new backup codes
// @access  Private
router.post('/2fa/backup-codes', auth, [
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Passwort erforderlich'
      });
    }

    const { password } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Falsches Passwort'
      });
    }

    // Generate new backup codes
    const newBackupCodes = TwoFactorService.generateBackupCodes();
    user.twoFactorAuth.backupCodes = newBackupCodes;
    await user.save();

    // Log backup codes regeneration
    await AuditLog.createLog({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: '2FA_BACKUP_CODES_REGENERATED',
      description: '2FA-Backup-Codes neu generiert',
      severity: 'MEDIUM',
      success: true
    });

    res.json({
      success: true,
      message: 'Neue Backup-Codes generiert',
      backupCodes: newBackupCodes
    });
  } catch (error) {
    logger.error('Fehler beim Generieren neuer Backup-Codes:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   GET /api/auth/security-status
// @desc    Get security status for user
// @access  Private
router.get('/security-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    const securityStatus = {
      twoFactorEnabled: user.twoFactorAuth?.enabled || false,
      passwordChangeRequired: LoginSecurityService.isPasswordChangeRequired(user),
      accountLocked: LoginSecurityService.isAccountLocked(user),
      remainingLockoutTime: LoginSecurityService.getRemainingLockoutTime(user),
      lastLogin: user.loginSecurity?.lastLogin,
      lastLoginIP: user.loginSecurity?.lastLoginIP,
      failedAttempts: user.loginSecurity?.failedAttempts || 0,
      sessionTimeout: user.loginSecurity?.sessionTimeout || LoginSecurityService.SESSION_TIMEOUT
    };

    res.json({
      success: true,
      securityStatus
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen des Sicherheitsstatus:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   GET /api/auth/online-bookable-doctors
// @desc    Get doctors available for online booking
// @access  Public
router.get('/online-bookable-doctors', async (req, res) => {
  try {
    const doctors = await User.find({
      role: 'doctor',
      isActive: true,
      'profile.onlineBookingEnabled': true
    }).select('firstName lastName profile.specialization profile.onlineBookingSettings');

    res.json({
      success: true,
      data: doctors
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der online buchbaren Ärzte:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   GET /api/auth/dsgvo/export
// @desc    Export user data (DSGVO Art. 20)
// @access  Private
router.get('/dsgvo/export', auth, async (req, res) => {
  try {
    const userData = await DSGVOService.exportUserData(req.user.id);
    
    res.json({
      success: true,
      message: 'Datenexport erfolgreich',
      data: userData
    });
  } catch (error) {
    logger.error('Fehler beim DSGVO-Datenexport:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Datenexport'
    });
  }
});

// @route   POST /api/auth/dsgvo/anonymize
// @desc    Anonymize user data (DSGVO Art. 17)
// @access  Private
router.post('/dsgvo/anonymize', auth, [
  body('password').notEmpty(),
  body('confirmation').equals('ANONYMISIERUNG_BESTÄTIGEN')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler'
      });
    }

    const { password, confirmation } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Falsches Passwort'
      });
    }

    const result = await DSGVOService.anonymizeUserData(req.user.id);
    
    res.json({
      success: true,
      message: 'Daten erfolgreich anonymisiert'
    });
  } catch (error) {
    logger.error('Fehler bei der Datenanonymisierung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Datenanonymisierung'
    });
  }
});

// @route   GET /api/auth/dsgvo/processing-activities
// @desc    Get data processing activities (DSGVO Art. 30)
// @access  Private
router.get('/dsgvo/processing-activities', auth, async (req, res) => {
  try {
    const activities = await DSGVOService.getDataProcessingActivities(req.user.id);
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Verarbeitungstätigkeiten:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token erforderlich'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'fallback_secret');
    
    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Ungültiger refresh token'
      });
    }

    // Generate new tokens
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Ungültiger refresh token'
    });
  }
});

module.exports = router;
