const express = require('express');
const router = express.Router();
const PatientDiagnosis = require('../models/PatientDiagnosis');
const Icd10Catalog = require('../models/Icd10Catalog');
const DiagnosisUsageStats = require('../models/DiagnosisUsageStats');
const auth = require('../middleware/auth');

// Optional Auth Middleware
const optionalAuth = async (req, res, next) => {
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const User = require('../models/User');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId || decoded.user?.id;
      const user = await User.findById(userId).select('-password');
      if (user) req.user = user;
    } catch (err) {
      // Auth optional, weiter ohne User
    }
  }
  next();
};

// GET /api/diagnoses/patient/:patientId - Diagnosen eines Patienten
router.get('/patient/:patientId', optionalAuth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, encounterId, isPrimary, page = 1, limit = 20 } = req.query;

    let query = { patientId };
    if (status) query.status = status;
    if (encounterId) query.encounterId = encounterId;
    if (isPrimary !== undefined) query.isPrimary = isPrimary === 'true';

    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 200);

    const [diagnoses, total] = await Promise.all([
      PatientDiagnosis.find(query)
        .populate('encounterId', 'startTime endTime title')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(parsedLimit)
        .skip((parsedPage - 1) * parsedLimit),
      PatientDiagnosis.countDocuments(query)
    ]);

    // Audit-Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'diagnoses.read',
      description: 'Patient-Diagnosen abgerufen',
      details: { patientId, options: { status, encounterId, isPrimary } }
    });

    res.json({
      success: true,
      data: diagnoses,
      pagination: {
        current: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Patient diagnoses fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Patient-Diagnosen'
    });
  }
});

// GET /api/diagnoses/:id - Einzelne Diagnose abrufen
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const diagnosis = await PatientDiagnosis.findById(id)
      .populate('patientId', 'firstName lastName')
      .populate('encounterId', 'startTime endTime title')
      .populate('createdBy', 'firstName lastName');

    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnose nicht gefunden'
      });
    }

    // Audit-Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'diagnoses.read',
      description: 'Einzelne Diagnose abgerufen',
      details: { diagnosisId: id }
    });

    res.json({
      success: true,
      data: diagnosis
    });
  } catch (error) {
    console.error('Diagnosis fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Diagnose'
    });
  }
});

// POST /api/diagnoses - Neue Diagnose erstellen
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      patientId,
      encounterId,
      code,
      catalogYear,
      display,
      status = 'active',
      onsetDate,
      resolvedDate,
      severity,
      isPrimary = false,
      source = 'clinical',
      notes
    } = req.body;

    // Validierung
    if (!patientId || !code || !catalogYear || !display) {
      return res.status(400).json({
        success: false,
        message: 'Erforderliche Felder fehlen'
      });
    }

    // Prüfe ob ICD-10 Code existiert
    const icdCode = await Icd10Catalog.findOne({
      code,
      releaseYear: catalogYear
    });

    if (!icdCode) {
      return res.status(400).json({
        success: false,
        message: `ICD-10 Code ${code} für das Jahr ${catalogYear} nicht gefunden`
      });
    }

    // Wenn Hauptdiagnose, setze andere auf false
    if (isPrimary && encounterId) {
      await PatientDiagnosis.updateMany(
        { encounterId, isPrimary: true },
        { isPrimary: false }
      );
    }

    const diagnosis = new PatientDiagnosis({
      patientId,
      encounterId,
      code,
      catalogYear,
      display,
      status,
      onsetDate,
      resolvedDate,
      severity,
      isPrimary,
      source,
      notes,
      createdBy: req.user._id
    });

    await diagnosis.save();

    // Aktualisiere Nutzungsstatistik
    await DiagnosisUsageStats.incrementUsage('user', req.user._id.toString(), code, catalogYear, source);

    // Audit-Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'diagnoses.create',
      description: 'Neue Diagnose erstellt',
      details: { diagnosisId: diagnosis._id, patientId, code, encounterId }
    });

    res.status(201).json({
      success: true,
      data: diagnosis
    });
  } catch (error) {
    console.error('Diagnosis creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Diagnose'
    });
  }
});

// PATCH /api/diagnoses/:id - Diagnose aktualisieren
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const diagnosis = await PatientDiagnosis.findById(id);
    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnose nicht gefunden'
      });
    }

    // Wenn Hauptdiagnose geändert wird
    if (updateData.isPrimary !== undefined && updateData.isPrimary !== diagnosis.isPrimary) {
      if (updateData.isPrimary && diagnosis.encounterId) {
        await PatientDiagnosis.updateMany(
          { encounterId: diagnosis.encounterId, isPrimary: true, _id: { $ne: id } },
          { isPrimary: false }
        );
      }
    }

    Object.assign(diagnosis, updateData);
    diagnosis.lastModifiedBy = req.user._id;
    await diagnosis.save();

    // Audit-Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'diagnoses.update',
      description: 'Diagnose aktualisiert',
      details: { diagnosisId: id, updates: updateData }
    });

    res.json({
      success: true,
      data: diagnosis
    });
  } catch (error) {
    console.error('Diagnosis update error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Diagnose'
    });
  }
});

// DELETE /api/diagnoses/:id - Diagnose löschen
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const diagnosis = await PatientDiagnosis.findByIdAndDelete(id);
    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnose nicht gefunden'
      });
    }

    // Audit-Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'diagnoses.delete',
      description: 'Diagnose gelöscht',
      details: { diagnosisId: id, code: diagnosis.code }
    });

    res.json({
      success: true,
      message: 'Diagnose erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Diagnosis deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Diagnose'
    });
  }
});

// GET /api/diagnoses/encounter/:encounterId - Diagnosen eines Termins
router.get('/encounter/:encounterId', auth, async (req, res) => {
  try {
    const { encounterId } = req.params;

    const diagnoses = await PatientDiagnosis.find({ encounterId })
      .populate('createdBy', 'firstName lastName')
      .sort({ isPrimary: -1, createdAt: 1 });

    res.json({
      success: true,
      data: diagnoses
    });
  } catch (error) {
    console.error('Encounter diagnoses fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Termin-Diagnosen'
    });
  }
});

// POST /api/diagnoses - Neue Diagnose erstellen
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      patientId,
      encounterId,
      code,
      catalogYear,
      display,
      status = 'active',
      onsetDate,
      resolvedDate,
      severity,
      isPrimary = false,
      source = 'clinical',
      notes
    } = req.body;

    // Validiere ICD-10 Code
    const icdCode = await Icd10Catalog.findByCode(code, catalogYear);
    if (!icdCode) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger ICD-10 Code'
      });
    }

    // Prüfe auf Hauptdiagnose-Konflikt
    if (isPrimary && encounterId) {
      const existingPrimary = await PatientDiagnosis.getPrimaryDiagnosis(encounterId);
      if (existingPrimary) {
        return res.status(400).json({
          success: false,
          message: 'Es existiert bereits eine Hauptdiagnose für diesen Termin'
        });
      }
    }

    const diagnosis = new PatientDiagnosis({
      patientId,
      encounterId,
      code,
      catalogYear,
      display: display || icdCode.title,
      status,
      onsetDate: onsetDate ? new Date(onsetDate) : undefined,
      resolvedDate: resolvedDate ? new Date(resolvedDate) : undefined,
      severity,
      isPrimary,
      source,
      notes,
      createdBy: req.user._id
    });

    await diagnosis.save();

    // Aktualisiere Nutzungsstatistik
    await DiagnosisUsageStats.incrementUsage('user', req.user._id.toString(), code, catalogYear, 'medical');
    if (req.user.locationId) {
      await DiagnosisUsageStats.incrementUsage('location', req.user.locationId.toString(), code, catalogYear, 'medical');
    }
    await DiagnosisUsageStats.incrementUsage('global', null, code, catalogYear, 'medical');

    // Audit-Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'diagnoses.create',
      description: 'Neue Diagnose erstellt',
      details: { 
        diagnosisId: diagnosis._id,
        patientId,
        encounterId,
        code,
        isPrimary
      }
    });

    res.status(201).json({
      success: true,
      data: diagnosis,
      message: 'Diagnose erfolgreich erstellt'
    });
  } catch (error) {
    console.error('Diagnosis creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Diagnose'
    });
  }
});

// PUT /api/diagnoses/:id - Diagnose aktualisieren
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const diagnosis = await PatientDiagnosis.findById(id);
    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnose nicht gefunden'
      });
    }

    // Speichere Änderungen für Audit-Trail
    const changes = {};
    Object.keys(updates).forEach(key => {
      if (diagnosis[key] !== updates[key]) {
        changes[key] = {
          from: diagnosis[key],
          to: updates[key]
        };
      }
    });

    // Prüfe Hauptdiagnose-Konflikt
    if (updates.isPrimary && diagnosis.encounterId) {
      const existingPrimary = await PatientDiagnosis.findOne({
        encounterId: diagnosis.encounterId,
        isPrimary: true,
        _id: { $ne: id }
      });
      if (existingPrimary) {
        return res.status(400).json({
          success: false,
          message: 'Es existiert bereits eine Hauptdiagnose für diesen Termin'
        });
      }
    }

    Object.assign(diagnosis, updates);
    diagnosis.lastModifiedBy = req.user._id;

    await diagnosis.save();

    // Audit-Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'diagnoses.update',
      description: 'Diagnose aktualisiert',
      details: { 
        diagnosisId: id,
        changes
      }
    });

    res.json({
      success: true,
      data: diagnosis,
      message: 'Diagnose erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Diagnosis update error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Diagnose'
    });
  }
});

// DELETE /api/diagnoses/:id - Diagnose löschen
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const diagnosis = await PatientDiagnosis.findById(id);
    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnose nicht gefunden'
      });
    }

    await PatientDiagnosis.findByIdAndDelete(id);

    // Audit-Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'diagnoses.delete',
      description: 'Diagnose gelöscht',
      details: { 
        diagnosisId: id,
        patientId: diagnosis.patientId,
        code: diagnosis.code
      }
    });

    res.json({
      success: true,
      message: 'Diagnose erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Diagnosis deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Diagnose'
    });
  }
});

// POST /api/diagnoses/:id/link-service - Diagnose mit Leistung verknüpfen
router.post('/:id/link-service', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceId, context = 'medical' } = req.body;

    const diagnosis = await PatientDiagnosis.findById(id);
    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnose nicht gefunden'
      });
    }

    diagnosis.linkService(serviceId, context);
    await diagnosis.save();

    res.json({
      success: true,
      message: 'Diagnose erfolgreich mit Leistung verknüpft'
    });
  } catch (error) {
    console.error('Diagnosis service linking error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Verknüpfen der Diagnose mit der Leistung'
    });
  }
});

// POST /api/diagnoses/:id/export - Diagnose für Export vorbereiten
router.post('/:id/export', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { target, payload } = req.body;

    const diagnosis = await PatientDiagnosis.findById(id);
    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnose nicht gefunden'
      });
    }

    diagnosis.addExport(target, payload);
    await diagnosis.save();

    res.json({
      success: true,
      message: 'Diagnose für Export vorbereitet'
    });
  } catch (error) {
    console.error('Diagnosis export preparation error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Vorbereiten des Exports'
    });
  }
});

// GET /api/diagnoses/:id/exports - Export-Status abrufen
router.get('/:id/exports', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const diagnosis = await PatientDiagnosis.findById(id);
    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnose nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: diagnosis.exports
    });
  } catch (error) {
    console.error('Diagnosis exports fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Export-Informationen'
    });
  }
});

module.exports = router;
