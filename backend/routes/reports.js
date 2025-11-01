const express = require('express');
const auth = require('../middleware/auth');
const { authorize, ACTIONS, RESOURCES } = require('../utils/rbac');
const router = express.Router();

// @route   GET /api/reports
// @desc    Get reports list
// @access  Private (requires 'reports.read' permission)
router.get('/', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };

    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.REPORTS, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert - ${authResult.reason}`,
        requiredPermission: 'reports.read',
        userRole: req.user.role,
        userPermissions: req.user.permissions
      });
    }

    // Mock reports data
    const reports = [
      {
        id: 1,
        name: 'Patientenbericht',
        description: 'Übersicht aller Patienten',
        type: 'patient',
        lastGenerated: new Date().toISOString(),
        canGenerate: authResult.allowed,
        canExport: await authorize(req.user, ACTIONS.EXPORT, RESOURCES.REPORTS, null, context).then(r => r.allowed)
      },
      {
        id: 2,
        name: 'Terminbericht',
        description: 'Übersicht aller Termine',
        type: 'appointment',
        lastGenerated: new Date().toISOString(),
        canGenerate: authResult.allowed,
        canExport: await authorize(req.user, ACTIONS.EXPORT, RESOURCES.REPORTS, null, context).then(r => r.allowed)
      },
      {
        id: 3,
        name: 'Abrechnungsbericht',
        description: 'Übersicht aller Abrechnungen',
        type: 'billing',
        lastGenerated: new Date().toISOString(),
        canGenerate: authResult.allowed,
        canExport: await authorize(req.user, ACTIONS.EXPORT, RESOURCES.REPORTS, null, context).then(r => r.allowed)
      }
    ];

    res.status(200).json({ 
      success: true, 
      data: reports, 
      message: "Reports erfolgreich geladen",
      permissions: {
        canRead: authResult.allowed,
        canGenerate: await authorize(req.user, ACTIONS.GENERATE, RESOURCES.REPORTS, null, context).then(r => r.allowed),
        canExport: await authorize(req.user, ACTIONS.EXPORT, RESOURCES.REPORTS, null, context).then(r => r.allowed)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Reports', error: error.message });
  }
});

module.exports = router;
