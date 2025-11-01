const express = require('express');
const { body, validationResult } = require('express-validator');
const Document = require('../models/Document');
const DocumentTemplate = require('../models/DocumentTemplate');
const Patient = require('../models/Patient');
const User = require('../models/User');
const auth = require('../middleware/auth');
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
// @desc    Update a document
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastModifiedBy: req.user._id },
      { new: true, runValidators: true }
    ).populate('patient', 'firstName lastName dateOfBirth')
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
      message: 'Fehler beim Aktualisieren des Dokuments'
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

module.exports = router;
