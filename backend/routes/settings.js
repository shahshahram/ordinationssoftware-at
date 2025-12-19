const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize, ACTIONS, RESOURCES } = require('../utils/rbac');
const SystemSettings = require('../models/SystemSettings');

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

    // Lade Settings aus Datenbank
    const onlineBookingSettings = await SystemSettings.getCategorySettings('onlineBooking');
    
    // Return basic settings structure mit Datenbank-Settings
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
      },
      onlineBooking: {
        // Stornierungsfristen (Standardwerte falls nicht gesetzt)
        cancellationDeadlineHours: onlineBookingSettings.cancellationDeadlineHours || 24,
        allowOnlineCancellation: onlineBookingSettings.allowOnlineCancellation !== undefined 
          ? onlineBookingSettings.allowOnlineCancellation 
          : true,
        cancellationPhoneNumber: onlineBookingSettings.cancellationPhoneNumber || null,
        cancellationFeeEnabled: onlineBookingSettings.cancellationFeeEnabled || false,
        cancellationFeeAmount: onlineBookingSettings.cancellationFeeAmount || 0,
        cancellationFeeDeadlineHours: onlineBookingSettings.cancellationFeeDeadlineHours || 24
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

    // Speichere Settings in Datenbank
    const { onlineBooking } = req.body;
    
    if (onlineBooking) {
      // Speichere Online-Buchung Einstellungen
      if (onlineBooking.cancellationDeadlineHours !== undefined) {
        await SystemSettings.setSetting(
          'onlineBooking',
          'cancellationDeadlineHours',
          onlineBooking.cancellationDeadlineHours,
          'number',
          req.user.id
        );
      }
      
      if (onlineBooking.allowOnlineCancellation !== undefined) {
        await SystemSettings.setSetting(
          'onlineBooking',
          'allowOnlineCancellation',
          onlineBooking.allowOnlineCancellation,
          'boolean',
          req.user.id
        );
      }
      
      if (onlineBooking.cancellationPhoneNumber !== undefined) {
        await SystemSettings.setSetting(
          'onlineBooking',
          'cancellationPhoneNumber',
          onlineBooking.cancellationPhoneNumber,
          'string',
          req.user.id
        );
      }
      
      if (onlineBooking.cancellationFeeEnabled !== undefined) {
        await SystemSettings.setSetting(
          'onlineBooking',
          'cancellationFeeEnabled',
          onlineBooking.cancellationFeeEnabled,
          'boolean',
          req.user.id
        );
      }
      
      if (onlineBooking.cancellationFeeAmount !== undefined) {
        await SystemSettings.setSetting(
          'onlineBooking',
          'cancellationFeeAmount',
          onlineBooking.cancellationFeeAmount,
          'number',
          req.user.id
        );
      }
      
      if (onlineBooking.cancellationFeeDeadlineHours !== undefined) {
        await SystemSettings.setSetting(
          'onlineBooking',
          'cancellationFeeDeadlineHours',
          onlineBooking.cancellationFeeDeadlineHours,
          'number',
          req.user.id
        );
      }
    }
    
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







