const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const StaffProfile = require('../models/StaffProfile');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { ADMIN_ROLES } = require('../config/roles');
const { authorize } = require('../utils/rbac');
const { ACTIONS, RESOURCES } = require('../utils/rbac');
const router = express.Router();

router.use(auth);
router.use(requireRole(ADMIN_ROLES));

const userPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.params.id;
    const uploadPath = path.join(__dirname, '..', 'uploads', 'user-photos', userId);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = (file.originalname && path.extname(file.originalname)) || '.jpg';
    const safeExt = /^\.(jpe?g|png|gif|webp)$/i.test(ext) ? ext : '.jpg';
    cb(null, `profile-${Date.now()}${safeExt}`);
  }
});

const userPhotoUpload = multer({
  storage: userPhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/i.test(file.mimetype);
    if (allowed) return cb(null, true);
    cb(new Error('Nur Bilddateien (JPEG, PNG, GIF, WebP) erlaubt'));
  }
});

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/', async (req, res) => {
  try {
    // Check RBAC permissions
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.USER, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`
      });
    }

    const { page = 1, limit = 10, role, search, isActive } = req.query;
    
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Benutzer'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Benutzers'
    });
  }
});

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Admin only)
router.post('/', [
  body('email').isEmail().normalizeEmail().withMessage('Ungültige E-Mail-Adresse'),
  body('password').isLength({ min: 6 }).withMessage('Das Passwort muss mindestens 6 Zeichen lang sein'),
  body('firstName').notEmpty().trim().withMessage('Vorname ist erforderlich'),
  body('lastName').notEmpty().trim().withMessage('Nachname ist erforderlich'),
  body('role').custom((value) => {
    const allowedRoles = ['admin', 'doctor', 'nurse', 'receptionist', 'assistant', 'staff', 'super_admin', 'arzt', 'assistent', 'rezeption', 'billing', 'patient'];
    if (!allowedRoles.includes(value)) {
      throw new Error(`Ungültige Rolle. Erlaubte Rollen: ${allowedRoles.join(', ')}`);
    }
    return true;
  })
], async (req, res) => {
  try {
    // DEBUG: Log incoming request
    console.log('🔍 POST /api/users - Request Body:', JSON.stringify(req.body, null, 2));
    
    // Check RBAC permissions
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.CREATE, RESOURCES.USER, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', JSON.stringify(errors.array(), null, 2));
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    const { email, password, firstName, lastName, role, ...otherData } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Benutzer mit dieser E-Mail-Adresse existiert bereits'
      });
    }

    const userData = {
      email,
      password,
      firstName,
      lastName,
      role,
      ...otherData,
      createdBy: req.user.id
    };

    const user = new User(userData);
    await user.save();

    // Automatically create StaffProfile for non-admin users
    if (role !== 'admin') {
      try {
        const staffProfile = new StaffProfile({
          userId: user._id,
          displayName: `${firstName} ${lastName}`,
          roleHint: role,
          isActive: true
        });
        await staffProfile.save();
        console.log(`✅ StaffProfile created for user: ${email}`);
      } catch (staffError) {
        console.error('❌ Error creating StaffProfile:', staffError.message);
        // Don't fail the user creation if StaffProfile creation fails
      }
    }

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'Benutzer erfolgreich erstellt',
      data: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Benutzers'
    });
  }
});

// @route   PUT /api/users/:id/photo
// @desc    Profilfoto hochladen (Datei oder Aufnahme vom mobilen Gerät)
// @access  Private (eigener User oder Admin)
router.put('/:id/photo', userPhotoUpload.single('photo'), async (req, res) => {
  try {
    const userId = req.params.id;
    const isOwn = req.user._id.toString() === userId || req.user.id === userId;
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    const canUpdate = isOwn || (await authorize(req.user, ACTIONS.UPDATE, RESOURCES.USER, userId, context)).allowed;
    if (!canUpdate) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        message: 'Zugriff verweigert'
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Bilddatei gesendet. Bitte wählen Sie ein Foto aus oder nehmen Sie eines auf.'
      });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    const oldPhoto = user.profilePhoto?.filename;
    const relativePath = path.join('user-photos', userId, req.file.filename);

    user.profilePhoto = {
      filename: relativePath.replace(/\\/g, '/'),
      uploadedAt: new Date()
    };
    await user.save();

    if (oldPhoto) {
      const oldPath = path.join(__dirname, '..', 'uploads', oldPhoto);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          console.warn('Altes Profilfoto konnte nicht gelöscht werden:', e.message);
        }
      }
    }

    const data = user.toObject();
    res.json({
      success: true,
      message: 'Profilfoto wurde aktualisiert',
      data: { profilePhoto: data.profilePhoto }
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    console.error('Error uploading user photo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Hochladen des Profilfotos'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    // Check RBAC permissions
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.USER, req.params.id, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`
      });
    }

    const { password, ...updateData } = req.body;
    
    // Don't allow non-admin users to change role or permissions
    if (req.user.role !== 'admin') {
      delete updateData.role;
      delete updateData.permissions;
      delete updateData.isActive;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...updateData, lastModifiedBy: req.user.id },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Benutzer erfolgreich aktualisiert',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Benutzers'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    // Check RBAC permissions
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.DELETE, RESOURCES.USER, req.params.id, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`
      });
    }

    // Don't allow deleting own account
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Sie können Ihr eigenes Konto nicht löschen'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Delete all weekly schedules associated with this user
    const WeeklySchedule = require('../models/WeeklySchedule');
    const deletedSchedules = await WeeklySchedule.deleteMany({ staffId: req.params.id });
    
    console.log(`Deleted ${deletedSchedules.deletedCount} weekly schedules for user ${req.params.id}`);

    // Delete staff profile associated with this user
    const StaffProfile = require('../models/StaffProfile');
    const deletedProfile = await StaffProfile.findOneAndDelete({ userId: req.params.id });
    
    if (deletedProfile) {
      console.log(`Deleted staff profile for user ${req.params.id}`);
    }

    // Check if user has any appointments (for information only)
    const Appointment = require('../models/Appointment');
    const appointmentCount = await Appointment.countDocuments({ doctor: req.params.id });
    
    if (appointmentCount > 0) {
      console.log(`Warning: User ${req.params.id} has ${appointmentCount} appointments that will remain in the system`);
    }

    res.json({
      success: true,
      message: 'Benutzer und zugehörige Daten erfolgreich gelöscht',
      deletedSchedules: deletedSchedules.deletedCount,
      deletedProfile: !!deletedProfile,
      remainingAppointments: appointmentCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Benutzers'
    });
  }
});

// @route   PUT /api/users/:id/password
// @desc    Change user password
// @access  Private
router.put('/:id/password', [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    // Users can only change their own password unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Zugriff verweigert'
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

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Verify current password
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
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ändern des Passworts'
    });
  }
});

// @route   PUT /api/users/:id/toggle-status
// @desc    Toggle user active status
// @access  Private (Admin only)
router.put('/:id/toggle-status', async (req, res) => {
  try {
    // Check RBAC permissions
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.USER, req.params.id, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`
      });
    }

    // Don't allow deactivating own account
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Sie können Ihr eigenes Konto nicht deaktivieren'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    user.isActive = !user.isActive;
    user.lastModifiedBy = req.user.id;
    await user.save();

    res.json({
      success: true,
      message: `Benutzer ${user.isActive ? 'aktiviert' : 'deaktiviert'}`,
      data: { isActive: user.isActive }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ändern des Benutzerstatus'
    });
  }
});

// @route   GET /api/users/statistics
// @desc    Get user statistics
// @access  Private (Admin only)
router.get('/statistics', async (req, res) => {
  try {
    // Check RBAC permissions
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.USER, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`
      });
    }

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        byRole: roleStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken'
    });
  }
});

module.exports = router;