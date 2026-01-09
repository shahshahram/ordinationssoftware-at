const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const XdsRegistryService = require('../services/XdsRegistryService');
const Location = require('../models/Location');
const XdsDocumentEntry = require('../models/XdsDocumentEntry');
const logger = require('../utils/logger');

// Multer für File-Upload konfigurieren
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB
  }
});

/**
 * @route   POST /api/xds/:locationId/register
 * @desc    Dokument in Registry registrieren
 * @access  Private
 */
router.post('/:locationId/register', auth, upload.single('document'), async (req, res) => {
  try {
    const { locationId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }
    
    // Parse Metadaten aus Body
    const metadata = {
      patientId: req.body.patientId,
      title: req.body.title || req.file.originalname,
      comments: req.body.comments || '',
      mimeType: req.body.mimeType || req.file.mimetype || 'application/pdf',
      contentType: req.body.contentType || req.body.mimeType || req.file.mimetype || 'application/pdf',
      classCode: req.body.classCode ? (typeof req.body.classCode === 'string' ? JSON.parse(req.body.classCode) : req.body.classCode) : undefined,
      typeCode: req.body.typeCode ? (typeof req.body.typeCode === 'string' ? JSON.parse(req.body.typeCode) : req.body.typeCode) : undefined,
      formatCode: req.body.formatCode ? (typeof req.body.formatCode === 'string' ? JSON.parse(req.body.formatCode) : req.body.formatCode) : undefined,
      healthcareFacilityTypeCode: req.body.healthcareFacilityTypeCode ? (typeof req.body.healthcareFacilityTypeCode === 'string' ? JSON.parse(req.body.healthcareFacilityTypeCode) : req.body.healthcareFacilityTypeCode) : undefined,
      practiceSettingCode: req.body.practiceSettingCode ? (typeof req.body.practiceSettingCode === 'string' ? JSON.parse(req.body.practiceSettingCode) : req.body.practiceSettingCode) : undefined,
      confidentialityCode: req.body.confidentialityCode ? (typeof req.body.confidentialityCode === 'string' ? JSON.parse(req.body.confidentialityCode) : req.body.confidentialityCode) : undefined,
      author: req.body.author ? (typeof req.body.author === 'string' ? JSON.parse(req.body.author) : req.body.author) : undefined,
      source: req.body.source || 'internal',
      serviceStartTime: req.body.serviceStartTime ? new Date(req.body.serviceStartTime) : undefined,
      serviceStopTime: req.body.serviceStopTime ? new Date(req.body.serviceStopTime) : undefined,
      languageCode: req.body.languageCode || 'de-AT'
    };
    
    const documentEntry = await XdsRegistryService.registerDocument(
      locationId,
      req.file.buffer,
      metadata,
      req.user
    );
    
    logger.info(`XDS Dokument registriert: ${documentEntry._id} durch ${req.user.email}`);
    
    res.status(201).json({
      success: true,
      data: documentEntry,
      message: 'Dokument erfolgreich registriert'
    });
  } catch (error) {
    logger.error(`Fehler beim Registrieren von XDS-Dokument: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Registrieren des Dokuments'
    });
  }
});

/**
 * @route   GET /api/xds/:locationId/query
 * @desc    Dokumente abfragen (Query)
 * @access  Private
 */
router.get('/:locationId/query', auth, async (req, res) => {
  try {
    const { locationId } = req.params;
    const queryParams = {
      patientId: req.query.patientId,
      classCode: req.query.classCode,
      typeCode: req.query.typeCode,
      formatCode: req.query.formatCode,
      source: req.query.source,
      title: req.query.title,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      limit: parseInt(req.query.limit) || 100,
      skip: parseInt(req.query.skip) || 0
    };
    
    const documents = await XdsRegistryService.queryDocuments(
      locationId,
      queryParams,
      req.user
    );
    
    const total = await XdsDocumentEntry.countDocuments({
      locationId,
      availabilityStatus: { $ne: 'Deprecated' },
      ...(queryParams.patientId && { patientId: queryParams.patientId })
    });
    
    res.json({
      success: true,
      data: documents,
      pagination: {
        total,
        limit: queryParams.limit,
        skip: queryParams.skip,
        pages: Math.ceil(total / queryParams.limit)
      }
    });
  } catch (error) {
    logger.error(`Fehler beim Abfragen von XDS-Dokumenten: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Abfragen der Dokumente'
    });
  }
});

/**
 * @route   GET /api/xds/:locationId/retrieve/:documentId
 * @desc    Dokument abrufen (Retrieve)
 * @access  Private
 */
router.get('/:locationId/retrieve/:documentId', auth, async (req, res) => {
  try {
    const { locationId, documentId } = req.params;
    
    const result = await XdsRegistryService.retrieveDocument(
      locationId,
      documentId,
      req.user
    );
    
    // Erkenne Content-Type basierend auf Dokumentenmetadaten
    let contentType = result.documentEntry.contentType || result.documentEntry.mimeType || result.fileData.metadata?.mimeType || 'application/octet-stream';
    
    // Extrahiere Dateiinhalt (fileData hat buffer und metadata)
    const fileContent = result.fileData.buffer || result.fileData.content || result.fileData;
    
    // Prüfe ob es ein CDA/XML-Dokument ist
    const contentAsString = Buffer.isBuffer(fileContent) ? fileContent.toString('utf8') : String(fileContent);
    if (contentAsString.includes('<?xml') || contentAsString.includes('<ClinicalDocument')) {
      contentType = 'application/xml; charset=utf-8';
    }
    
    // Setze Response-Header
    res.setHeader('Content-Type', contentType);
    
    // Wenn als Download angefordert (query parameter download=true oder Accept-Header)
    const acceptHeader = req.get('Accept') || '';
    const isDownload = req.query.download === 'true' || (!acceptHeader.includes('text/xml') && !acceptHeader.includes('application/xml'));
    
    if (isDownload) {
      res.setHeader('Content-Disposition', `attachment; filename="${result.documentEntry.title || result.fileData.metadata?.originalName || 'document'}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${result.documentEntry.title || result.fileData.metadata?.originalName || 'document'}"`);
    }
    
    const contentBuffer = Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent);
    res.setHeader('Content-Length', contentBuffer.length);
    
    logger.info(`XDS Dokument abgerufen: ${documentId} durch ${req.user.email}, Content-Type: ${contentType}`);
    
    res.send(contentBuffer);
  } catch (error) {
    logger.error(`Fehler beim Abrufen von XDS-Dokument: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Abrufen des Dokuments'
    });
  }
});

/**
 * @route   PUT /api/xds/:locationId/update/:documentId
 * @desc    Dokument aktualisieren
 * @access  Private
 */
router.put('/:locationId/update/:documentId', auth, upload.single('document'), async (req, res) => {
  try {
    const { locationId, documentId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }
    
    const updateMetadata = {
      title: req.body.title,
      comments: req.body.comments,
      mimeType: req.file.mimetype,
      classCode: req.body.classCode ? JSON.parse(req.body.classCode) : undefined,
      typeCode: req.body.typeCode ? JSON.parse(req.body.typeCode) : undefined,
      formatCode: req.body.formatCode ? JSON.parse(req.body.formatCode) : undefined
    };
    
    const documentEntry = await XdsRegistryService.updateDocument(
      locationId,
      documentId,
      req.file.buffer,
      updateMetadata,
      req.user
    );
    
    logger.info(`XDS Dokument aktualisiert: ${documentId} durch ${req.user.email}`);
    
    res.json({
      success: true,
      data: documentEntry,
      message: 'Dokument erfolgreich aktualisiert'
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren von XDS-Dokument: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Aktualisieren des Dokuments'
    });
  }
});

/**
 * @route   PUT /api/xds/:locationId/deprecate/:documentId
 * @desc    Dokument als deprecated markieren
 * @access  Private
 */
router.put('/:locationId/deprecate/:documentId', auth, async (req, res) => {
  try {
    const { locationId, documentId } = req.params;
    const { reason } = req.body;
    
    const documentEntry = await XdsRegistryService.deprecateDocument(
      locationId,
      documentId,
      req.user,
      reason || ''
    );
    
    logger.info(`XDS Dokument deprecated: ${documentId} durch ${req.user.email}`);
    
    res.json({
      success: true,
      data: documentEntry,
      message: 'Dokument erfolgreich als deprecated markiert'
    });
  } catch (error) {
    logger.error(`Fehler beim Deprecaten von XDS-Dokument: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Deprecaten des Dokuments'
    });
  }
});

/**
 * @route   DELETE /api/xds/:locationId/delete/:documentId
 * @desc    Dokument löschen
 * @access  Private
 */
router.delete('/:locationId/delete/:documentId', auth, async (req, res) => {
  try {
    const { locationId, documentId } = req.params;
    const force = req.query.force === 'true';
    
    await XdsRegistryService.deleteDocument(
      locationId,
      documentId,
      req.user,
      force
    );
    
    logger.info(`XDS Dokument gelöscht: ${documentId} durch ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Dokument erfolgreich gelöscht'
    });
  } catch (error) {
    logger.error(`Fehler beim Löschen von XDS-Dokument: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Löschen des Dokuments'
    });
  }
});

/**
 * @route   GET /api/xds/:locationId/document/:documentId
 * @desc    Dokument-Metadaten abrufen
 * @access  Private
 */
router.get('/:locationId/document/:documentId', auth, async (req, res) => {
  try {
    const { locationId, documentId } = req.params;
    
    const document = await XdsDocumentEntry.findOne({
      $or: [{ _id: documentId }, { entryUUID: documentId }],
      locationId
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Dokument nicht gefunden'
      });
    }
    
    // Prüfe Berechtigung
    const location = await Location.findById(locationId);
    if (!XdsRegistryService.checkPermission(location, 'retrieve', req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
    }
    
    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen von XDS-Dokument-Metadaten: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Abrufen der Metadaten'
    });
  }
});

module.exports = router;

