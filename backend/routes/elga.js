// ELGA Routes - Elektronische Gesundheitsakte
// Integration mit ELGA-API für e-Medikation, e-Rezept, e-Befund

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const elgaService = require('../services/elgaService');
const PatientExtended = require('../models/PatientExtended');
const { body, validationResult } = require('express-validator');

/**
 * @route   GET /api/elga/status
 * @desc    ELGA-Systemstatus prüfen
 * @access  Private
 */
router.get('/status', auth, async (req, res) => {
  try {
    const config = require('../config/elga.config');
    const validation = config.validate();
    
    res.json({
      success: true,
      data: {
        configured: validation.valid,
        environment: config.environment,
        hasCertificates: config.hasCertificates(),
        errors: validation.errors
      }
    });
  } catch (error) {
    console.error('Error checking ELGA status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Prüfen des ELGA-Status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/elga/patient/:patientId/status
 * @desc    ELGA-Status eines Patienten abrufen
 * @access  Private
 */
router.get('/patient/:patientId/status', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    if (!patient.ecard?.elgaId) {
      return res.json({
        success: true,
        data: {
          elgaId: null,
          status: 'not_registered',
          message: 'Patient ist nicht in ELGA registriert'
        }
      });
    }
    
    const status = await elgaService.getELGAStatus(patient.ecard.elgaId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching ELGA patient status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des ELGA-Status',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/elga/patient/:patientId/sync
 * @desc    Patientendaten mit ELGA synchronisieren
 * @access  Private
 */
router.post('/patient/:patientId/sync', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const result = await elgaService.syncPatientData(patientId);
    
    res.json({
      success: true,
      message: 'Patientendaten erfolgreich synchronisiert',
      data: result
    });
  } catch (error) {
    console.error('Error syncing patient with ELGA:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Synchronisierung',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/elga/patient/:patientId/medication
 * @desc    e-Medikation eines Patienten abrufen
 * @access  Private
 */
router.get('/patient/:patientId/medication', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    if (!patient.ecard?.elgaId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ist nicht in ELGA registriert'
      });
    }
    
    const token = await elgaService.authenticate();
    const axios = require('axios');
    const elgaConfig = require('../config/elga.config');
    
    const response = await axios.get(
      `${elgaConfig.activeConfig.baseUrl}/v1/patient/${patient.ecard.elgaId}/medication`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching e-Medikation:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der e-Medikation',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/elga/patient/:patientId/prescriptions
 * @desc    e-Rezepte eines Patienten abrufen
 * @access  Private
 */
router.get('/patient/:patientId/prescriptions', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    if (!patient.ecard?.elgaId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ist nicht in ELGA registriert'
      });
    }
    
    const token = await elgaService.authenticate();
    const axios = require('axios');
    const elgaConfig = require('../config/elga.config');
    
    const response = await axios.get(
      `${elgaConfig.activeConfig.baseUrl}/v1/patient/${patient.ecard.elgaId}/prescriptions`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching e-Rezepte:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der e-Rezepte',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/elga/patient/:patientId/documents
 * @desc    ELGA-Dokumente eines Patienten abrufen
 * @access  Private
 */
router.get('/patient/:patientId/documents', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { classCode, typeCode, dateFrom, dateTo, limit = 50 } = req.query;
    
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    if (!patient.ecard?.elgaId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ist nicht in ELGA registriert'
      });
    }
    
    const token = await elgaService.authenticate();
    const axios = require('axios');
    const elgaConfig = require('../config/elga.config');
    
    const params = {
      limit: parseInt(limit)
    };
    
    if (classCode) params.classCode = classCode;
    if (typeCode) params.typeCode = typeCode;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    
    const response = await axios.get(
      `${elgaConfig.activeConfig.baseUrl}/v1/patient/${patient.ecard.elgaId}/documents`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params,
        timeout: 30000
      }
    );
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching ELGA documents:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der ELGA-Dokumente',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/elga/patient/:patientId/documents/:documentId
 * @desc    Einzelnes ELGA-Dokument abrufen
 * @access  Private
 */
router.get('/patient/:patientId/documents/:documentId', auth, async (req, res) => {
  try {
    const { patientId, documentId } = req.params;
    
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    if (!patient.ecard?.elgaId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ist nicht in ELGA registriert'
      });
    }
    
    const token = await elgaService.authenticate();
    const axios = require('axios');
    const elgaConfig = require('../config/elga.config');
    
    const response = await axios.get(
      `${elgaConfig.activeConfig.baseUrl}/v1/patient/${patient.ecard.elgaId}/documents/${documentId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching ELGA document:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des ELGA-Dokuments',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/elga/patient/:patientId/documents/upload
 * @desc    Dokument zu ELGA hochladen
 * @access  Private
 */
router.post('/patient/:patientId/documents/upload', [
  auth,
  body('title').notEmpty().withMessage('Titel ist erforderlich'),
  body('classCode').notEmpty().withMessage('Class Code ist erforderlich'),
  body('typeCode').notEmpty().withMessage('Type Code ist erforderlich')
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
    
    const { patientId } = req.params;
    const { title, classCode, typeCode, formatCode, documentContent } = req.body;
    
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    if (!patient.ecard?.elgaId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ist nicht in ELGA registriert'
      });
    }
    
    const token = await elgaService.authenticate();
    const axios = require('axios');
    const elgaConfig = require('../config/elga.config');
    
    const response = await axios.post(
      `${elgaConfig.activeConfig.baseUrl}/v1/patient/${patient.ecard.elgaId}/documents`,
      {
        title,
        classCode,
        typeCode,
        formatCode: formatCode || 'urn:oid:1.2.40.0.34.10.61',
        content: documentContent,
        author: {
          id: req.user._id.toString(),
          name: `${req.user.firstName} ${req.user.lastName}`,
          role: req.user.role
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    res.json({
      success: true,
      message: 'Dokument erfolgreich zu ELGA hochgeladen',
      data: response.data
    });
  } catch (error) {
    console.error('Error uploading document to ELGA:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hochladen des Dokuments',
      error: error.message
    });
  }
});

module.exports = router;
