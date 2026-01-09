const express = require('express');
const { query, param } = require('express-validator');
const AuditLog = require('../models/AuditLog');
const DSGVOService = require('../services/dsgvoService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const router = express.Router();

// @route   GET /api/audit-logs
// @desc    Get audit logs with filtering and pagination
// @access  Private (Admin only)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Audit-Logs einsehen'
      });
    }

    const {
      page = 1,
      limit = 50,
      userId,
      action,
      severity,
      success,
      startDate,
      endDate,
      resource,
      resourceId
    } = req.query;

    // Build query
    const query = {};
    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (severity) query.severity = severity;
    if (success !== undefined) query.success = success === 'true';
    if (resource) query.resource = resource;
    if (resourceId) query.resourceId = resourceId;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('userId', 'firstName lastName email role')
      .select('-__v');

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Audit-Logs:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   GET /api/audit-logs/statistics
// @desc    Get audit log statistics
// @access  Private (Admin only)
router.get('/statistics', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Statistiken einsehen'
      });
    }

    const { startDate, endDate } = req.query;
    const query = {};
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const [
      totalLogs,
      successLogs,
      failedLogs,
      actionStats,
      severityStats,
      userStats,
      recentLogs
    ] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.countDocuments({ ...query, success: true }),
      AuditLog.countDocuments({ ...query, success: false }),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.aggregate([
        { $match: { ...query, userId: { $ne: null } } },
        { $group: { _id: '$userEmail', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('userId', 'firstName lastName email role')
        .select('action description timestamp userEmail severity success')
    ]);

    const statistics = {
      overview: {
        totalLogs,
        successLogs,
        failedLogs,
        successRate: totalLogs > 0 ? ((successLogs / totalLogs) * 100).toFixed(2) : 0
      },
      actionBreakdown: actionStats,
      severityBreakdown: severityStats,
      topUsers: userStats,
      recentActivity: recentLogs
    };

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Audit-Statistiken:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   GET /api/audit-logs/export
// @desc    Export audit logs (CSV/JSON)
// @access  Private (Admin only)
router.get('/export', auth, [
  query('format').optional().isIn(['csv', 'json']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Audit-Logs exportieren'
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

    const { format = 'json', startDate, endDate } = req.query;
    const logs = await DSGVOService.exportLogs(startDate, endDate, format);

    // Log the export action
    await AuditLog.createLog({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'AUDIT_LOG_EXPORT',
      description: `Audit-Logs exportiert (${format.toUpperCase()})`,
      severity: 'MEDIUM',
      success: true
    });

    if (format === 'csv') {
      // Convert to CSV
      const csvHeader = 'Timestamp,User,Action,Description,Severity,Success,IP Address\n';
      const csvData = logs.map(log => 
        `${log.timestamp},${log.userEmail || 'N/A'},${log.action},${log.description},${log.severity},${log.success},${log.ipAddress}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvHeader + csvData);
    } else {
      res.json({
        success: true,
        message: 'Audit-Logs erfolgreich exportiert',
        data: logs,
        exportedAt: new Date(),
        totalRecords: logs.length
      });
    }
  } catch (error) {
    logger.error('Fehler beim Exportieren der Audit-Logs:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   GET /api/audit-logs/compliance-report
// @desc    Generate compliance report
// @access  Private (Admin only)
router.get('/compliance-report', auth, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Compliance-Berichte erstellen'
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

    const { startDate, endDate } = req.query;
    const report = await DSGVOService.generateComplianceReport(startDate, endDate);

    // Log the compliance report generation
    await AuditLog.createLog({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'COMPLIANCE_REPORT_GENERATED',
      description: 'Compliance-Bericht generiert',
      severity: 'MEDIUM',
      success: true
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Fehler beim Generieren des Compliance-Berichts:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   GET /api/audit-logs/retention-check
// @desc    Check data retention compliance
// @access  Private (Admin only)
router.get('/retention-check', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Retention-Checks durchführen'
      });
    }

    const compliance = await DSGVOService.checkRetentionCompliance();

    res.json({
      success: true,
      data: compliance
    });
  } catch (error) {
    logger.error('Fehler beim Retention-Check:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   GET /api/audit-logs/user/:userId
// @desc    Get audit logs for specific user
// @access  Private (Admin only)
router.get('/user/:userId', auth, [
  param('userId').isMongoId()
], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Benutzer-Audit-Logs einsehen'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Benutzer-ID'
      });
    }

    const { userId } = req.params;
    const { limit = 100, skip = 0 } = req.query;

    const logs = await AuditLog.getUserLogs(userId, parseInt(limit), parseInt(skip));

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Benutzer-Audit-Logs:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

// @route   GET /api/audit-logs/resource/:resource/:resourceId
// @desc    Get audit logs for specific resource
// @access  Private (Admin only)
router.get('/resource/:resource/:resourceId', auth, [
  param('resourceId').isMongoId()
], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Ressourcen-Audit-Logs einsehen'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Ressourcen-ID'
      });
    }

    const { resource, resourceId } = req.params;
    const { limit = 100, skip = 0 } = req.query;

    const logs = await AuditLog.getResourceLogs(resource, resourceId, parseInt(limit), parseInt(skip));

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Ressourcen-Audit-Logs:', error);
    res.status(500).json({
      success: false,
      message: 'Server Fehler'
    });
  }
});

module.exports = router;
