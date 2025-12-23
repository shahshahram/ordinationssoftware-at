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

// @route   GET /api/document-templates/medical-specialties/list
// @desc    Get list of medical specialties
// @access  Private
router.get('/medical-specialties/list', auth, async (req, res) => {
  try {
    const specialties = [
      { value: 'allgemeinmedizin', label: 'Allgemeinmedizin' },
      { value: 'innere_medizin', label: 'Innere Medizin' },
      { value: 'chirurgie', label: 'Chirurgie' },
      { value: 'orthopaedie', label: 'Orthopädie' },
      { value: 'neurologie', label: 'Neurologie' },
      { value: 'psychiatrie', label: 'Psychiatrie' },
      { value: 'dermatologie', label: 'Dermatologie' },
      { value: 'augenheilkunde', label: 'Augenheilkunde' },
      { value: 'hno', label: 'HNO' },
      { value: 'gynaekologie', label: 'Gynäkologie' },
      { value: 'urologie', label: 'Urologie' },
      { value: 'kardiologie', label: 'Kardiologie' },
      { value: 'pneumologie', label: 'Pneumologie' },
      { value: 'gastroenterologie', label: 'Gastroenterologie' },
      { value: 'endokrinologie', label: 'Endokrinologie' },
      { value: 'rheumatologie', label: 'Rheumatologie' },
      { value: 'onkologie', label: 'Onkologie' },
      { value: 'radiologie', label: 'Radiologie' },
      { value: 'laboratoriumsmedizin', label: 'Laboratoriumsmedizin' },
      { value: 'pathologie', label: 'Pathologie' },
      { value: 'anesthesiologie', label: 'Anästhesiologie' },
      { value: 'notfallmedizin', label: 'Notfallmedizin' },
      { value: 'sportmedizin', label: 'Sportmedizin' },
      { value: 'arbeitsmedizin', label: 'Arbeitsmedizin' },
      { value: 'sonstiges', label: 'Sonstiges' }
    ];
    
    res.json({
      success: true,
      specialties
    });
  } catch (error) {
    console.error('Error fetching medical specialties:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Fachrichtungen'
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
    
    // Stelle sicher, dass isActive auf true gesetzt ist, wenn nicht explizit auf false gesetzt
    if (req.body.isActive === undefined) {
      template.isActive = true;
    }
    
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

// @route   GET /api/document-templates/standalone/list
// @desc    Get all standalone document templates (approved only)
// @access  Private
router.get('/standalone/list', auth, async (req, res) => {
  try {
    const { medicalSpecialty, documentType, search } = req.query;
    
    const filters = {};
    if (medicalSpecialty) {
      filters.medicalSpecialty = medicalSpecialty;
    }
    if (documentType) {
      filters.documentType = documentType;
    }
    
    // Debug: Prüfe alle Vorlagen mit isStandaloneDocument
    const allStandalone = await DocumentTemplate.find({ isStandaloneDocument: true });
    console.log(`[DEBUG] Total standalone templates: ${allStandalone.length}`);
    allStandalone.forEach(t => {
      console.log(`[DEBUG] Template: "${t.name}", isActive: ${t.isActive}, approvalStatus: ${t.approvalStatus}, isStandaloneDocument: ${t.isStandaloneDocument}`);
    });
    
    // Debug: Prüfe alle Vorlagen mit approvalStatus 'approved'
    const allApproved = await DocumentTemplate.find({ approvalStatus: 'approved' });
    console.log(`[DEBUG] Total approved templates: ${allApproved.length}`);
    allApproved.forEach(t => {
      console.log(`[DEBUG] Approved Template: "${t.name}", isActive: ${t.isActive}, isStandaloneDocument: ${t.isStandaloneDocument}, approvalStatus: ${t.approvalStatus}`);
    });
    
    let templates = await DocumentTemplate.findStandaloneTemplates(filters);
    console.log(`[DEBUG] Found ${templates.length} templates matching all criteria (isActive: true, isStandaloneDocument: true, approvalStatus: 'approved')`);
    
    // Debug: Prüfe spezifisch die "Überweisung" Vorlage
    const ueberweisungTemplate = await DocumentTemplate.findOne({ name: { $regex: /überweisung/i } });
    if (ueberweisungTemplate) {
      console.log(`[DEBUG] Überweisung Template Details:`, {
        _id: ueberweisungTemplate._id,
        name: ueberweisungTemplate.name,
        isActive: ueberweisungTemplate.isActive,
        isStandaloneDocument: ueberweisungTemplate.isStandaloneDocument,
        approvalStatus: ueberweisungTemplate.approvalStatus,
        documentType: ueberweisungTemplate.documentType
      });
    } else {
      console.log(`[DEBUG] Keine "Überweisung" Vorlage gefunden`);
    }
    
    // Client-side search if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      templates = templates.filter(t => 
        t.name.match(searchRegex) || 
        (t.description && t.description.match(searchRegex))
      );
    }
    
    res.json({
      success: true,
      templates: templates.map(t => t.getTemplateWithPlaceholders())
    });
  } catch (error) {
    console.error('Error fetching standalone templates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Standalone-Vorlagen'
    });
  }
});

// @route   GET /api/document-templates/standalone/:id
// @desc    Get single standalone document template
// @access  Private
router.get('/standalone/:id', auth, async (req, res) => {
  try {
    const template = await DocumentTemplate.findOne({
      _id: req.params.id,
      isStandaloneDocument: true,
      isActive: true
    })
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Standalone-Vorlage nicht gefunden'
      });
    }

    res.json({
      success: true,
      template: template.getTemplateWithPlaceholders()
    });
  } catch (error) {
    console.error('Error fetching standalone template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Standalone-Vorlage'
    });
  }
});

// @route   POST /api/document-templates/:id/versions
// @desc    Create new version of template
// @access  Private (Admin/Doctor)
router.post('/:id/versions', [
  auth,
  body('changeNotes').optional().isString()
], async (req, res) => {
  try {
    const template = await DocumentTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Dokumentvorlage nicht gefunden'
      });
    }

    const { changeNotes, ...updateData } = req.body;
    
    // Erstelle neue Version
    template.createNewVersion(req.user.id, changeNotes);
    
    // Aktualisiere Template-Daten
    if (Object.keys(updateData).length > 0) {
      Object.assign(template, updateData);
      template.lastModifiedBy = req.user.id;
    }
    
    await template.save();

    res.json({
      success: true,
      message: 'Neue Version erfolgreich erstellt',
      template: template.getTemplateWithPlaceholders()
    });
  } catch (error) {
    console.error('Error creating template version:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der neuen Version'
    });
  }
});

// @route   POST /api/document-templates/:id/submit-for-approval
// @desc    Submit template for approval
// @access  Private (Admin/Doctor)
router.post('/:id/submit-for-approval', auth, async (req, res) => {
  try {
    const template = await DocumentTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Dokumentvorlage nicht gefunden'
      });
    }

    template.submitForApproval(req.user.id);
    await template.save();

    res.json({
      success: true,
      message: 'Vorlage zur Freigabe eingereicht',
      template: template.getTemplateWithPlaceholders()
    });
  } catch (error) {
    console.error('Error submitting template for approval:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Einreichen zur Freigabe'
    });
  }
});

// @route   POST /api/document-templates/:id/approve
// @desc    Approve template
// @access  Private (Admin)
router.post('/:id/approve', [
  auth,
  body('notes').optional().isString()
], async (req, res) => {
  try {
    // Prüfe ob User Admin ist
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Vorlagen freigeben'
      });
    }

    const template = await DocumentTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Dokumentvorlage nicht gefunden'
      });
    }

    template.approve(req.user.id, req.body.notes);
    await template.save();

    res.json({
      success: true,
      message: 'Vorlage erfolgreich freigegeben',
      template: template.getTemplateWithPlaceholders()
    });
  } catch (error) {
    console.error('Error approving template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Freigeben der Vorlage'
    });
  }
});

// @route   POST /api/document-templates/:id/reject
// @desc    Reject template
// @access  Private (Admin)
router.post('/:id/reject', [
  auth,
  body('reason').notEmpty().withMessage('Ablehnungsgrund ist erforderlich')
], async (req, res) => {
  try {
    // Prüfe ob User Admin ist
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Vorlagen ablehnen'
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

    const template = await DocumentTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Dokumentvorlage nicht gefunden'
      });
    }

    template.reject(req.user.id, req.body.reason);
    await template.save();

    res.json({
      success: true,
      message: 'Vorlage abgelehnt',
      template: template.getTemplateWithPlaceholders()
    });
  } catch (error) {
    console.error('Error rejecting template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ablehnen der Vorlage'
    });
  }
});

module.exports = router;


