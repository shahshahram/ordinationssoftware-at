const express = require('express');
const { body, validationResult } = require('express-validator');
const Document = require('../models/Document');
const DocumentTemplate = require('../models/DocumentTemplate');
const Patient = require('../models/Patient');
const User = require('../models/User');
const auth = require('../middleware/auth');
const documentVersionService = require('../services/documentVersionService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Multer-Konfiguration für Datei-Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads/documents';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB Limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Nur Bilder, PDFs und Dokumente sind erlaubt!'));
    }
  }
});

// @route   GET /api/documents
// @desc    Get all documents
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status, patientId, doctorId } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (patientId) filter['patient.id'] = patientId;
    if (doctorId) filter['doctor.id'] = doctorId;

    const documents = await Document.find(filter)
      .populate('patient', 'firstName lastName dateOfBirth')
      .populate('doctor', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Document.countDocuments(filter);

    res.json({
      success: true,
      data: documents,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Dokumente'
    });
  }
});

// @route   GET /api/documents/:id
// @desc    Get single document by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('patient', 'firstName lastName dateOfBirth')
      .populate('doctor', 'firstName lastName');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Dokuments'
    });
  }
});

// @route   GET /api/documents/templates
// @desc    Get document templates
// @access  Private
router.get('/templates', auth, async (req, res) => {
  try {
    const { type, category } = req.query;
    
    const filter = { isActive: true };
    if (type) filter.type = type;
    if (category) filter.category = category;

    const templates = await DocumentTemplate.find(filter)
      .sort({ name: 1 });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Vorlagen'
    });
  }
});

// @route   GET /api/documents/statistics
// @desc    Get document statistics
// @access  Private
router.get('/statistics', auth, async (req, res) => {
  try {
    const totalDocuments = await Document.countDocuments();
    const documentsByType = await Document.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    const documentsByStatus = await Document.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalDocuments,
        byType: documentsByType,
        byStatus: documentsByStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken'
    });
  }
});

// @route   POST /api/documents
// @desc    Create a new document
// @access  Private
router.post('/', auth, [
  body('type').notEmpty().withMessage('Dokumenttyp ist erforderlich'),
  body('patient').notEmpty().withMessage('Patient ist erforderlich'),
  body('patient.id').notEmpty().withMessage('Patient-ID ist erforderlich'),
  body('patient.name').notEmpty().withMessage('Patientenname ist erforderlich'),
  body('patient.dateOfBirth').notEmpty().withMessage('Geburtsdatum ist erforderlich'),
  body('content').notEmpty().withMessage('Inhalt ist erforderlich')
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

    const document = new Document({
      ...req.body,
      doctor: {
        id: req.user._id,
        name: `${req.user.firstName} ${req.user.lastName}`,
        title: req.user.profile?.title || '',
        specialization: req.user.profile?.specialization || ''
      },
      createdBy: req.user._id
    });

    await document.save();
    await document.populate('patient', 'firstName lastName dateOfBirth');
    await document.populate('doctor', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Document creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Dokuments',
      error: error.message
    });
  }
});

// @route   POST /api/documents/templates
// @desc    Create a new document template
// @access  Private
router.post('/templates', auth, [
  body('name').notEmpty().withMessage('Name ist erforderlich'),
  body('type').notEmpty().withMessage('Typ ist erforderlich'),
  body('content.html').notEmpty().withMessage('HTML-Inhalt ist erforderlich')
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

    const template = new DocumentTemplate({
      ...req.body,
      createdBy: req.user._id
    });

    await template.save();

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Vorlage'
    });
  }
});

// @route   PUT /api/documents/:id
// @desc    Update a document (mit Versionierung)
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    // Prüfe ob Dokument bearbeitet werden kann
    if (!document.canBeEdited()) {
      return res.status(400).json({
        success: false,
        message: `Dokument kann nicht bearbeitet werden. Status: ${document.status}. Für freigegebene Dokumente muss eine neue Version erstellt werden.`,
        requiresNewVersion: document.requiresNewVersion()
      });
    }

    // Verwende Version-Service für Update
    const updatedDocument = await documentVersionService.updateDocument(
      req.params.id,
      req.body,
      req.user,
      {
        reason: req.body.reason,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    );

    await updatedDocument.populate('patient', 'firstName lastName dateOfBirth');
    await updatedDocument.populate('doctor', 'firstName lastName');
    await updatedDocument.populate('currentVersion.versionId');

    res.json({
      success: true,
      data: updatedDocument
    });
  } catch (error) {
    console.error('Document update error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Aktualisieren des Dokuments'
    });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete a document
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findByIdAndDelete(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Dokument gelöscht'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Dokuments'
    });
  }
});

// @route   POST /api/documents/:id/upload
// @desc    Upload file to document
// @access  Private
router.post('/:id/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    document.attachments.push({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedAt: new Date()
    });

    await document.save();

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hochladen der Datei'
    });
  }
});

// @route   GET /api/documents/:id/attachments
// @desc    List attachments of a document
// @access  Private
router.get('/:id/attachments', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id).lean();
    if (!document) {
      return res.status(404).json({ success: false, message: 'Dokument nicht gefunden' });
    }
    res.json({ success: true, data: document.attachments || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Anhänge' });
  }
});

// @route   GET /api/documents/:id/attachments/:filename
// @desc    Download attachment
// @access  Private
router.get('/:id/attachments/:filename', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Dokument nicht gefunden' });
    }
    const attachment = (document.attachments || []).find(a => a.filename === req.params.filename);
    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Anhang nicht gefunden' });
    }
    const filePath = attachment.path || path.join('./uploads/documents', attachment.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Datei nicht vorhanden' });
    }
    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName || attachment.filename}"`);
    return res.sendFile(path.resolve(filePath));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fehler beim Herunterladen des Anhangs' });
  }
});

// @route   DELETE /api/documents/:id/attachments/:filename
// @desc    Remove attachment from document and delete file
// @access  Private
router.delete('/:id/attachments/:filename', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Dokument nicht gefunden' });
    }
    const index = (document.attachments || []).findIndex(a => a.filename === req.params.filename);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Anhang nicht gefunden' });
    }
    const [removed] = document.attachments.splice(index, 1);
    await document.save();

    // Datei vom Dateisystem entfernen (best effort)
    const filePath = removed.path || path.join('./uploads/documents', removed.filename);
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }

    res.json({ success: true, message: 'Anhang entfernt' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fehler beim Entfernen des Anhangs' });
  }
});

// ============================================
// VERSIONIERUNGS-ENDPUNKTE (NEU)
// ============================================

// @route   GET /api/documents/:id/versions
// @desc    Get all versions of a document
// @access  Private
router.get('/:id/versions', auth, async (req, res) => {
  try {
    const { limit = 50, sort = 'desc' } = req.query;
    
    const versions = await documentVersionService.getDocumentVersions(req.params.id, {
      limit: parseInt(limit),
      sort: sort === 'asc' ? { createdAt: 1 } : { createdAt: -1 }
    });

    res.json({
      success: true,
      data: versions,
      count: versions.length
    });
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Laden der Versionen'
    });
  }
});

// @route   GET /api/documents/:id/versions/:versionNumber
// @desc    Get specific version of a document
// @access  Private
router.get('/:id/versions/:versionNumber', auth, async (req, res) => {
  try {
    const version = await documentVersionService.getDocumentVersion(
      req.params.id,
      req.params.versionNumber
    );

    if (!version) {
      return res.status(404).json({
        success: false,
        message: `Version ${req.params.versionNumber} nicht gefunden`
      });
    }

    res.json({
      success: true,
      data: version
    });
  } catch (error) {
    console.error('Get version error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Laden der Version'
    });
  }
});

// @route   GET /api/documents/:id/comparison/:version1/:version2
// @desc    Compare two versions of a document
// @access  Private
router.get('/:id/comparison/:version1/:version2', auth, async (req, res) => {
  try {
    const comparison = await documentVersionService.compareVersions(
      req.params.id,
      req.params.version1,
      req.params.version2
    );

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Compare versions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Vergleichen der Versionen'
    });
  }
});

// @route   POST /api/documents/:id/new-version
// @desc    Create a new version of a released document
// @access  Private
router.post('/:id/new-version', auth, [
  body('changeReason').optional().isString().withMessage('Änderungsgrund muss ein String sein')
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

    const { changeReason, ...updates } = req.body;

    const document = await documentVersionService.createNewVersion(
      req.params.id,
      updates,
      req.user,
      {
        changeReason,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    );

    await document.populate('patient', 'firstName lastName dateOfBirth');
    await document.populate('doctor', 'firstName lastName');
    await document.populate('currentVersion.versionId');

    res.json({
      success: true,
      message: `Neue Version ${document.currentVersion.versionNumber} erstellt`,
      data: document
    });
  } catch (error) {
    console.error('Create new version error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Fehler beim Erstellen der neuen Version'
    });
  }
});

// @route   POST /api/documents/:id/submit-review
// @desc    Submit document for review (DRAFT → UNDER_REVIEW)
// @access  Private
router.post('/:id/submit-review', auth, async (req, res) => {
  try {
    const document = await documentVersionService.submitForReview(req.params.id, req.user);

    await document.populate('patient', 'firstName lastName dateOfBirth');
    await document.populate('doctor', 'firstName lastName');

    res.json({
      success: true,
      message: 'Dokument zur Prüfung eingereicht',
      data: document
    });
  } catch (error) {
    console.error('Submit for review error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Fehler beim Einreichen zur Prüfung'
    });
  }
});

// @route   POST /api/documents/:id/release
// @desc    Release a document (UNDER_REVIEW → RELEASED)
// @access  Private
router.post('/:id/release', auth, [
  body('comment').optional().isString().withMessage('Kommentar muss ein String sein')
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

    const document = await documentVersionService.releaseDocument(
      req.params.id,
      req.user,
      req.body.comment || ''
    );

    await document.populate('patient', 'firstName lastName dateOfBirth');
    await document.populate('doctor', 'firstName lastName');
    await document.populate('currentVersion.versionId');
    await document.populate('currentVersion.releasedBy', 'firstName lastName');

    res.json({
      success: true,
      message: `Dokument Version ${document.currentVersion.versionNumber} freigegeben`,
      data: document
    });
  } catch (error) {
    console.error('Release document error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Fehler beim Freigeben des Dokuments'
    });
  }
});

// @route   POST /api/documents/:id/withdraw
// @desc    Withdraw a document (→ WITHDRAWN)
// @access  Private
router.post('/:id/withdraw', auth, [
  body('reason').notEmpty().withMessage('Rückzugs-Grund ist erforderlich')
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

    const document = await documentVersionService.withdrawDocument(
      req.params.id,
      req.user,
      req.body.reason
    );

    await document.populate('patient', 'firstName lastName dateOfBirth');
    await document.populate('doctor', 'firstName lastName');

    res.json({
      success: true,
      message: 'Dokument zurückgezogen',
      data: document
    });
  } catch (error) {
    console.error('Withdraw document error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Fehler beim Zurückziehen des Dokuments'
    });
  }
});

// @route   GET /api/documents/:id/audit-trail
// @desc    Get complete audit trail of a document
// @access  Private
router.get('/:id/audit-trail', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }

    // Kombiniere Audit Trail aus Dokument und Versionen
    const versions = await documentVersionService.getDocumentVersions(req.params.id);
    
    const auditTrail = [
      ...(document.auditTrail || []).map(entry => ({
        type: 'document',
        ...entry.toObject ? entry.toObject() : entry
      })),
      ...versions.map(version => ({
        type: 'version',
        action: `Version ${version.versionNumber} ${version.versionStatus}`,
        user: version.createdBy,
        timestamp: version.createdAt,
        versionNumber: version.versionNumber,
        versionStatus: version.versionStatus,
        releasedAt: version.releasedAt,
        releasedBy: version.releasedBy
      }))
    ].sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));

    res.json({
      success: true,
      data: auditTrail
    });
  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Laden des Audit Trails'
    });
  }
});

module.exports = router;
