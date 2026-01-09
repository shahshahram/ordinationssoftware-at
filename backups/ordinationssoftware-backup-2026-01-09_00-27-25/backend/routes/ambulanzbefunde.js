const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AmbulanzbefundService = require('../services/AmbulanzbefundService');
const AmbulanzbefundFormTemplate = require('../models/AmbulanzbefundFormTemplate');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');

/**
 * @route   GET /api/ambulanzbefunde/templates
 * @desc    Alle Formular-Templates abrufen (mit Filterung)
 * @access  Private
 */
router.get('/templates', auth, async (req, res) => {
  try {
    const { specialization, locationId, isActive } = req.query;
    
    const query = {};
    if (specialization) {
      query.specialization = specialization;
    }
    // Nur Filter anwenden wenn isActive explizit gesetzt ist
    if (isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true' || isActive === true;
    }
    
    // Standort-spezifische oder globale Templates
    if (locationId) {
      query.$or = [
        { locationId },
        { locationId: null }
      ];
    }
    // Wenn keine locationId angegeben, lade alle Templates (sowohl standort-spezifische als auch globale)
    // Keine Einschränkung, damit Admin alle Templates sehen kann
    
    const templates = await AmbulanzbefundFormTemplate.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ specialization: 1, isDefault: -1, name: 1 })
      .lean();
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error(`Fehler beim Laden der Templates: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Templates',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/ambulanzbefunde/templates/specialization/:specialization
 * @desc    Default-Template für Spezialisierung abrufen
 * @access  Private
 * @note    MUSS vor /templates/:id stehen, da sonst "specialization" als :id interpretiert wird
 */
router.get('/templates/specialization/:specialization', auth, async (req, res) => {
  try {
    const { specialization } = req.params;
    const { locationId } = req.query;
    
    // Zuerst nach Default-Template suchen
    let template = await AmbulanzbefundFormTemplate.findDefaultForSpecialization(
      specialization,
      locationId || null
    );
    
    // Falls kein Default-Template gefunden, versuche irgendein aktives Template zu finden
    if (!template) {
      const templates = await AmbulanzbefundFormTemplate.findForSpecialization(
        specialization,
        locationId || null
      );
      
      if (templates && templates.length > 0) {
        template = templates[0]; // Nehme das erste Template (bereits sortiert nach isDefault: -1)
      }
    }
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Kein Template für Spezialisierung "${specialization}" gefunden`
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error(`Fehler beim Laden des Default-Templates: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Templates'
    });
  }
});

/**
 * @route   GET /api/ambulanzbefunde/templates/:id
 * @desc    Einzelnes Template abrufen
 * @access  Private
 */
router.get('/templates/:id', auth, async (req, res) => {
  try {
    const template = await AmbulanzbefundFormTemplate.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .lean();
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error(`Fehler beim Laden des Templates: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Templates'
    });
  }
});

/**
 * @route   POST /api/ambulanzbefunde/templates
 * @desc    Neues Template erstellen
 * @access  Private (Admin)
 */
router.post('/templates', auth, [
  body('name').notEmpty().withMessage('Name ist erforderlich'),
  body('code').notEmpty().withMessage('Code ist erforderlich'),
  body('specialization').notEmpty().withMessage('Spezialisierung ist erforderlich'),
  body('formDefinition.schema').notEmpty().withMessage('Schema ist erforderlich'),
  body('formDefinition.layout').notEmpty().withMessage('Layout ist erforderlich')
], async (req, res) => {
  try {
    // Prüfe Admin-Rechte
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Erstellen von Templates'
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
    
    const template = await AmbulanzbefundFormTemplate.create({
      ...req.body,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });
    
    logger.info(`Template erstellt: ${template.code} von ${req.user.email}`);
    
    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error(`Fehler beim Erstellen des Templates: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Templates',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/ambulanzbefunde/templates/:id
 * @desc    Template aktualisieren
 * @access  Private (Admin)
 */
router.put('/templates/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Bearbeiten von Templates'
      });
    }
    
    const template = await AmbulanzbefundFormTemplate.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    );
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template nicht gefunden'
      });
    }
    
    logger.info(`Template aktualisiert: ${template.code} von ${req.user.email}`);
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren des Templates: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Templates'
    });
  }
});

/**
 * @route   GET /api/ambulanzbefunde
 * @desc    Liste von Arbeitsbefunden abrufen
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const filters = {};
    const { patientId, locationId, specialization, status, page = 1, limit = 20 } = req.query;
    
    if (patientId) filters.patientId = patientId;
    if (locationId) filters.locationId = locationId;
    if (specialization) filters.specialization = specialization;
    if (status) filters.status = status;
    
    // Standard: Nur eigene Arbeitsbefunde (außer Admin)
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      filters.createdBy = req.user._id;
    }
    
    const result = await AmbulanzbefundService.listAmbulanzbefunde(filters, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: 'createdAt',
      sortOrder: -1
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error(`Fehler beim Laden der Ambulanzbefunde: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Ambulanzbefunde'
    });
  }
});

/**
 * @route   POST /api/ambulanzbefunde/:id/export
 * @desc    Bereits finalisierten Ambulanzbefund manuell ins XDS Repository exportieren
 * @access  Private
 * WICHTIG: Muss vor /:id stehen, da Express Routen in Reihenfolge geprüft werden
 */
router.post('/:id/export', auth, async (req, res) => {
  try {
    const result = await AmbulanzbefundService.exportAmbulanzbefund(
      req.params.id,
      req.user._id
    );
    
    if (result.alreadyExported) {
      return res.json({
        success: true,
        message: 'Ambulanzbefund wurde bereits exportiert',
        data: result.ambefund,
        xdsDocumentEntryId: result.xdsDocumentEntryId,
        alreadyExported: true
      });
    }
    
    res.json({
      success: true,
      message: 'Ambulanzbefund erfolgreich exportiert',
      data: result.ambefund,
      xdsDocumentEntryId: result.xdsDocumentEntryId,
      documentEntry: result.documentEntry
    });
  } catch (error) {
    logger.error(`Fehler beim manuellen Export: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Exportieren des Ambulanzbefunds'
    });
  }
});

/**
 * @route   POST /api/ambulanzbefunde/:id/validate
 * @desc    Arbeitsbefund validieren
 * @access  Private
 * WICHTIG: Muss vor /:id stehen
 */
router.post('/:id/validate', auth, async (req, res) => {
  try {
    const result = await AmbulanzbefundService.validateAmbulanzbefund(
      req.params.id,
      req.user._id
    );
    
    res.json({
      success: true,
      data: result.ambefund,
      validation: result.validation
    });
  } catch (error) {
    logger.error(`Fehler bei Validierung: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler bei Validierung'
    });
  }
});

/**
 * @route   POST /api/ambulanzbefunde/:id/finalize
 * @desc    Arbeitsbefund finalisieren
 * @access  Private
 * WICHTIG: Muss vor /:id stehen
 */
router.post('/:id/finalize', auth, async (req, res) => {
  try {
    const ambefund = await AmbulanzbefundService.finalizeAmbulanzbefund(
      req.params.id,
      req.user._id
    );
    
    res.json({
      success: true,
      data: ambefund
    });
  } catch (error) {
    logger.error(`Fehler beim Finalisieren: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Finalisieren'
    });
  }
});

/**
 * @route   GET /api/ambulanzbefunde/:id
 * @desc    Einzelnen Arbeitsbefund abrufen
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const ambefund = await AmbulanzbefundService.getAmbulanzbefund(req.params.id);
    
    // Prüfe Berechtigung (außer Admin)
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      if (ambefund.createdBy._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Keine Berechtigung'
        });
      }
    }
    
    res.json({
      success: true,
      data: ambefund
    });
  } catch (error) {
    logger.error(`Fehler beim Laden des Ambulanzbefunds: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Ambulanzbefunds'
    });
  }
});

/**
 * @route   POST /api/ambulanzbefunde
 * @desc    Neuen Arbeitsbefund erstellen
 * @access  Private
 */
router.post('/', auth, [
  body('patientId').notEmpty().withMessage('Patient-ID ist erforderlich'),
  body('locationId').notEmpty().withMessage('Location-ID ist erforderlich'),
  body('specialization').notEmpty().withMessage('Spezialisierung ist erforderlich'),
  body('formData').notEmpty().withMessage('Formular-Daten sind erforderlich')
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
    
    const { patientId, locationId, specialization, formData, formTemplateId, selectedSections, status } = req.body;
    
    // Status explizit setzen wenn als Entwurf gespeichert werden soll
    const finalStatus = status || undefined; // undefined = automatisch basierend auf Validierung
    
    const result = await AmbulanzbefundService.createAmbulanzbefund(
      patientId,
      locationId,
      req.user._id,
      specialization,
      formData,
      formTemplateId,
      selectedSections || [],
      finalStatus
    );
    
    logger.info(`Ambulanzbefund erstellt: ${result.ambefund.documentNumber} von ${req.user.email}`);
    
    res.status(201).json({
      success: true,
      data: result.ambefund
    });
  } catch (error) {
    logger.error(`Fehler beim Erstellen des Ambulanzbefunds: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Erstellen des Ambulanzbefunds'
    });
  }
});

/**
 * @route   PUT /api/ambulanzbefunde/:id
 * @desc    Arbeitsbefund aktualisieren
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.documentNumber;
    delete updateData.createdBy;
    
    const ambefund = await AmbulanzbefundService.updateAmbulanzbefund(
      req.params.id,
      req.user._id,
      updateData
    );
    
    res.json({
      success: true,
      data: ambefund
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Aktualisieren'
    });
  }
});

module.exports = router;

