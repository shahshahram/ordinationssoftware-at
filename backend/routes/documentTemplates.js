const express = require('express');
const auth = require('../middleware/auth');
const DocumentTemplate = require('../models/DocumentTemplate');
const DocumentRevision = require('../models/DocumentRevision');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// @route   GET /api/document-templates
// @desc    Get all document templates
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    
    let query = { isActive: true };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const templates = await DocumentTemplate.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DocumentTemplate.countDocuments(query);

    res.json({
      success: true,
      templates,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching document templates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Dokumentvorlagen'
    });
  }
});

// @route   GET /api/document-templates/categories
// @desc    Get all template categories
// @access  Private
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await DocumentTemplate.distinct('category', { isActive: true });
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Kategorien'
    });
  }
});

// @route   GET /api/document-templates/:id
// @desc    Get single document template
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await DocumentTemplate.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Dokumentvorlage nicht gefunden'
      });
    }

    res.json({
      success: true,
      template: template.getTemplateWithPlaceholders()
    });
  } catch (error) {
    console.error('Error fetching document template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Dokumentvorlage'
    });
  }
});

// @route   POST /api/document-templates
// @desc    Create new document template
// @access  Private (Admin/Doctor)
router.post('/', [
  auth,
  body('name').notEmpty().withMessage('Name ist erforderlich'),
  body('category').notEmpty().withMessage('Kategorie ist erforderlich'),
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

    const templateData = {
      ...req.body,
      createdBy: req.user.id,
      lastModifiedBy: req.user.id
    };

    const template = new DocumentTemplate(templateData);
    await template.save();

    // Create initial revision
    await DocumentRevision.createRevision({
      documentId: template._id,
      templateId: template._id,
      version: 1,
      content: template.content,
      placeholders: template.placeholders,
      action: 'created',
      performedBy: req.user.id,
      auditTrail: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID
      }
    });

    res.status(201).json({
      success: true,
      message: 'Dokumentvorlage erfolgreich erstellt',
      template: template.getTemplateWithPlaceholders()
    });
  } catch (error) {
    console.error('Error creating document template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Dokumentvorlage'
    });
  }
});

// @route   PUT /api/document-templates/:id
// @desc    Update document template
// @access  Private (Admin/Doctor)
router.put('/:id', [
  auth,
  body('name').optional().notEmpty().withMessage('Name darf nicht leer sein'),
  body('content').optional().notEmpty().withMessage('Inhalt darf nicht leer sein')
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

    const template = await DocumentTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Dokumentvorlage nicht gefunden'
      });
    }

    const oldContent = template.content;
    const oldPlaceholders = template.placeholders;

    // Update template
    Object.assign(template, req.body);
    template.lastModifiedBy = req.user.id;
    template.version += 1;
    await template.save();

    // Create revision for changes
    await DocumentRevision.createRevision({
      documentId: template._id,
      templateId: template._id,
      version: template.version,
      content: template.content,
      placeholders: template.placeholders,
      action: 'edited',
      performedBy: req.user.id,
      changes: {
        contentChanged: oldContent !== template.content,
        placeholdersChanged: JSON.stringify(oldPlaceholders) !== JSON.stringify(template.placeholders)
      },
      auditTrail: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID,
        previousVersion: template.version - 1
      }
    });

    res.json({
      success: true,
      message: 'Dokumentvorlage erfolgreich aktualisiert',
      template: template.getTemplateWithPlaceholders()
    });
  } catch (error) {
    console.error('Error updating document template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Dokumentvorlage'
    });
  }
});

// @route   DELETE /api/document-templates/:id
// @desc    Delete document template (soft delete)
// @access  Private (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await DocumentTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Dokumentvorlage nicht gefunden'
      });
    }

    // Soft delete
    template.isActive = false;
    template.lastModifiedBy = req.user.id;
    await template.save();

    res.json({
      success: true,
      message: 'Dokumentvorlage erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting document template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Dokumentvorlage'
    });
  }
});

// @route   GET /api/document-templates/:id/revisions
// @desc    Get template revision history
// @access  Private
router.get('/:id/revisions', auth, async (req, res) => {
  try {
    const revisions = await DocumentRevision.getDocumentHistory(req.params.id);
    
    res.json({
      success: true,
      revisions
    });
  } catch (error) {
    console.error('Error fetching template revisions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Versionshistorie'
    });
  }
});

module.exports = router;


