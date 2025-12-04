const express = require('express');
const auth = require('../middleware/auth');
const DocumentTemplate = require('../models/DocumentTemplate');
const DocumentRevision = require('../models/DocumentRevision');
const Location = require('../models/Location');
const pdfGenerator = require('../utils/pdfGenerator');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// @route   POST /api/pdf/generate
// @desc    Generate PDF from template
// @access  Private
router.post('/generate', [
  auth,
  body('templateId').notEmpty().withMessage('Template ID ist erforderlich'),
  body('placeholders').isObject().withMessage('Placeholders müssen ein Objekt sein')
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

    const { templateId, placeholders, options = {} } = req.body;

    // Get template
    const template = await DocumentTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Dokumentvorlage nicht gefunden'
      });
    }

    // Validate placeholders
    const missingPlaceholders = template.placeholders
      .filter(p => p.required && !placeholders[p.name])
      .map(p => p.name);

    if (missingPlaceholders.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Fehlende erforderliche Platzhalter',
        missingPlaceholders
      });
    }

    // Location-Daten laden für Briefkopf
    let location = null;
    if (options.locationId) {
      location = await Location.findById(options.locationId);
    } else if (req.user.locationId) {
      location = await Location.findById(req.user.locationId);
    } else {
      // Fallback: Erste aktive Location
      location = await Location.findOne({ is_active: true });
    }

    // Location zu options hinzufügen
    const pdfOptions = {
      ...options,
      location: location
    };

    // Generate PDF
    const pdfBuffer = await pdfGenerator.generateDocumentPDF(
      template.content,
      placeholders,
      pdfOptions
    );

    // Create revision
    await DocumentRevision.createRevision({
      documentId: template._id,
      templateId: template._id,
      version: template.version,
      content: template.content,
      placeholders: placeholders,
      action: 'generated',
      performedBy: req.user.id,
      metadata: {
        pdfGenerated: true,
        options: options
      },
      auditTrail: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID
      }
    });

    // Set response headers
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${template.name}_${new Date().toISOString().split('T')[0]}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der PDF'
    });
  }
});

// @route   POST /api/pdf/preview
// @desc    Preview template with placeholders
// @access  Private
router.post('/preview', [
  auth,
  body('templateId').notEmpty().withMessage('Template ID ist erforderlich'),
  body('placeholders').isObject().withMessage('Placeholders müssen ein Objekt sein')
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

    const { templateId, placeholders } = req.body;

    // Get template
    const template = await DocumentTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Dokumentvorlage nicht gefunden'
      });
    }

    // Process template
    const processedContent = pdfGenerator.processTemplate(template.content, placeholders);

    res.json({
      success: true,
      preview: processedContent
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Vorschau-Generieren'
    });
  }
});

// @route   GET /api/pdf/templates/:id/placeholders
// @desc    Get template placeholders
// @access  Private
router.get('/templates/:id/placeholders', auth, async (req, res) => {
  try {
    const template = await DocumentTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Dokumentvorlage nicht gefunden'
      });
    }

    res.json({
      success: true,
      placeholders: template.placeholders
    });
  } catch (error) {
    console.error('Error fetching template placeholders:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Platzhalter'
    });
  }
});

module.exports = router;


