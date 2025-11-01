const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize, ACTIONS, RESOURCES } = require('../utils/rbac');

// @route   GET /api/settings
// @desc    Get all settings
// @access  Private (requires 'settings.read' permission)
router.get('/', auth, async (req, res) => {
  try {
    // Check RBAC permissions
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.SETTINGS, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`,
        requiredPermission: 'settings.read',
        userRole: req.user.role,
        userPermissions: req.user.permissions
      });
    }

    // Return basic settings structure
    const settings = {
      general: {
        systemName: 'Ordinationssoftware',
        version: '1.0.0',
        language: 'de',
        timezone: 'Europe/Vienna'
      },
      features: {
        onlineBooking: true,
        twoFactorAuth: true,
        auditLogging: true,
        rbac: true
      },
      permissions: {
        canRead: true,
        canWrite: true,
        canConfigure: true
      }
    };

    res.status(200).json({ 
      success: true, 
      data: settings,
      message: 'Settings erfolgreich geladen'
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Abrufen der Einstellungen', 
      error: error.message 
    });
  }
});

// @route   PUT /api/settings
// @desc    Update settings
// @access  Private (requires 'settings.write' permission)
router.put('/', auth, async (req, res) => {
  try {
    // Check RBAC permissions
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.SETTINGS, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`,
        requiredPermission: 'settings.write',
        userRole: req.user.role,
        userPermissions: req.user.permissions
      });
    }

    // In a real application, you would save the settings to a database
    // For now, we just return success
    res.status(200).json({ 
      success: true, 
      message: 'Einstellungen erfolgreich aktualisiert',
      data: req.body
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Aktualisieren der Einstellungen', 
      error: error.message 
    });
  }
});

module.exports = router;



