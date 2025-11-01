const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const StaffProfile = require('../models/StaffProfile');
const auth = require('../middleware/auth');
const { authorize } = require('../utils/rbac');
const { ACTIONS, RESOURCES } = require('../utils/rbac');
const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/', auth, async (req, res) => {
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
router.get('/:id', auth, async (req, res) => {
  try {
    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Zugriff verweigert'
      });
    }

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
router.post('/', auth, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('role').isIn(['admin', 'doctor', 'nurse', 'receptionist', 'assistant', 'staff'])
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

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', auth, async (req, res) => {
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
router.delete('/:id', auth, async (req, res) => {
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
router.put('/:id/password', auth, [
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
router.put('/:id/toggle-status', auth, async (req, res) => {
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
router.get('/statistics', auth, async (req, res) => {
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