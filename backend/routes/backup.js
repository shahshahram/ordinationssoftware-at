const express = require('express');
const auth = require('../middleware/auth');
const { authorize, ACTIONS, RESOURCES } = require('../utils/rbac');
const backupService = require('../utils/backupService');
const router = express.Router();

/**
 * @route   GET /api/backup
 * @desc    Liste aller Backups abrufen
 * @access  Private (requires 'backup.read' permission)
 */
router.get('/', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };

    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.SYSTEM, null, context);
    if (!authResult.allowed && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Zugriff verweigert - Admin-Berechtigung erforderlich'
      });
    }

    const backups = backupService.getBackupList();
    const avgSize = await backupService.getAverageBackupSize();

    res.json({
      success: true,
      data: backups,
      averageSize: avgSize,
      averageSizeMB: avgSize ? (avgSize / 1024 / 1024).toFixed(2) : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Backups',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/backup/create
 * @desc    Manuelles Backup erstellen
 * @access  Private (requires 'backup.create' permission or Admin)
 */
router.post('/create', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };

    const authResult = await authorize(req.user, ACTIONS.CREATE, RESOURCES.SYSTEM, null, context);
    if (!authResult.allowed && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Zugriff verweigert - Admin-Berechtigung erforderlich'
      });
    }

    const result = await backupService.createBackup(
      req.user._id,
      req.user.email,
      req.user.role
    );

    res.json({
      success: true,
      message: 'Backup erfolgreich erstellt',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Backups',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/backup/restore/request
 * @desc    Restore-Anfrage erstellen (erfordert Bestätigung)
 * @access  Private (requires Admin role)
 */
router.post('/restore/request', auth, async (req, res) => {
  try {
    // Nur Admins können Restore anfordern
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Zugriff verweigert - Admin-Berechtigung erforderlich'
      });
    }

    const { backupFileName } = req.body;

    if (!backupFileName) {
      return res.status(400).json({
        success: false,
        message: 'Backup-Dateiname erforderlich'
      });
    }

    const result = await backupService.requestRestore(backupFileName);

    // Log restore request
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.createLog({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'backup.restore.request',
        resource: 'Backup',
        description: `Restore-Anfrage für: ${backupFileName}`,
        details: {
          backupFileName,
          dryRun: result.dryRun
        },
        severity: 'HIGH',
        success: true,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    } catch (auditError) {
      console.error('Fehler beim Erstellen des Audit-Logs:', auditError);
    }

    res.json({
      success: true,
      message: 'Restore-Anfrage erstellt. Bestätigung erforderlich.',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Restore-Anfrage',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/backup/restore/confirm
 * @desc    Restore bestätigen und ausführen
 * @access  Private (requires Admin role)
 */
router.post('/restore/confirm', auth, async (req, res) => {
  try {
    // Nur Admins können Restore bestätigen
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Zugriff verweigert - Admin-Berechtigung erforderlich'
      });
    }

    const { backupFileName, confirmationToken } = req.body;

    if (!backupFileName || !confirmationToken) {
      return res.status(400).json({
        success: false,
        message: 'Backup-Dateiname und Bestätigungstoken erforderlich'
      });
    }

    const result = await backupService.restoreBackup(
      backupFileName,
      confirmationToken,
      req.user._id,
      req.user.email,
      req.user.role,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Backup erfolgreich wiederhergestellt',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Wiederherstellen des Backups',
      error: error.message
    });
  }
});

module.exports = router;
