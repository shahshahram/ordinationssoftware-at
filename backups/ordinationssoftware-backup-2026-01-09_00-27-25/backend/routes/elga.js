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
 * @route   POST /api/elga/patient/:patientId/medication/sync
 * @desc    Medikamente mit ELGA synchronisieren
 * @access  Private
 */
router.post('/patient/:patientId/medication/sync', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { strategy = 'merge' } = req.body; // 'merge', 'elga_only', 'local_only'
    
    const PatientMedication = require('../models/PatientMedication');
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
    
    // Hole e-Medikation von ELGA
    const token = await elgaService.authenticate();
    const axios = require('axios');
    const elgaConfig = require('../config/elga.config');
    
    const elgaResponse = await axios.get(
      `${elgaConfig.activeConfig.baseUrl}/v1/patient/${patient.ecard.elgaId}/medication`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const elgaMedications = elgaResponse.data.medications || elgaResponse.data || [];
    
    // Hole lokale Medikamente
    const localMedications = await PatientMedication.find({ patientId });
    
    const syncResult = {
      created: [],
      updated: [],
      conflicts: [],
      skipped: []
    };
    
    // Synchronisiere ELGA-Medikamente
    for (const elgaMed of elgaMedications) {
      // Suche nach vorhandenem Medikament (nach ELGA-ID oder Name + Dosierung)
      const existingMed = localMedications.find(m => 
        m.elgaId === elgaMed.id || 
        (m.name.toLowerCase() === elgaMed.name?.toLowerCase() && 
         m.dosage === elgaMed.dosage &&
         m.startDate && new Date(m.startDate).getTime() === new Date(elgaMed.startDate).getTime())
      );
      
      if (existingMed) {
        // Konfliktprüfung
        const hasConflict = 
          existingMed.dosage !== elgaMed.dosage ||
          existingMed.frequency !== elgaMed.frequency ||
          existingMed.status !== elgaMed.status ||
          (existingMed.endDate && elgaMed.endDate && 
           new Date(existingMed.endDate).getTime() !== new Date(elgaMed.endDate).getTime());
        
        if (hasConflict && strategy === 'merge') {
          syncResult.conflicts.push({
            local: existingMed,
            elga: elgaMed,
            differences: {
              dosage: existingMed.dosage !== elgaMed.dosage,
              frequency: existingMed.frequency !== elgaMed.frequency,
              status: existingMed.status !== elgaMed.status,
              endDate: existingMed.endDate !== elgaMed.endDate
            }
          });
        } else if (strategy === 'merge' || strategy === 'elga_only') {
          // Aktualisiere lokales Medikament mit ELGA-Daten
          existingMed.name = elgaMed.name || existingMed.name;
          existingMed.dosage = elgaMed.dosage || existingMed.dosage;
          existingMed.frequency = elgaMed.frequency || existingMed.frequency;
          existingMed.duration = elgaMed.duration || existingMed.duration;
          existingMed.startDate = elgaMed.startDate ? new Date(elgaMed.startDate) : existingMed.startDate;
          existingMed.endDate = elgaMed.endDate ? new Date(elgaMed.endDate) : existingMed.endDate;
          existingMed.status = elgaMed.status || existingMed.status;
          existingMed.elgaId = elgaMed.id;
          existingMed.elgaSynced = true;
          existingMed.elgaSyncedAt = new Date();
          existingMed.source = 'elga';
          existingMed.lastModifiedBy = req.user._id;
          
          await existingMed.save();
          syncResult.updated.push(existingMed);
        }
      } else {
        // Neues Medikament von ELGA
        if (strategy === 'merge' || strategy === 'elga_only') {
          const newMed = new PatientMedication({
            patientId,
            name: elgaMed.name,
            dosage: elgaMed.dosage,
            frequency: elgaMed.frequency,
            duration: elgaMed.duration,
            startDate: elgaMed.startDate ? new Date(elgaMed.startDate) : new Date(),
            endDate: elgaMed.endDate ? new Date(elgaMed.endDate) : undefined,
            status: elgaMed.status || 'active',
            source: 'elga',
            elgaId: elgaMed.id,
            elgaSynced: true,
            elgaSyncedAt: new Date(),
            createdBy: req.user._id,
            lastModifiedBy: req.user._id
          });
          
          await newMed.save();
          syncResult.created.push(newMed);
        }
      }
    }
    
    // Markiere lokale Medikamente als synchronisiert (wenn nicht von ELGA)
    if (strategy === 'merge') {
      for (const localMed of localMedications) {
        if (!localMed.elgaId && !elgaMedications.find(em => em.id === localMed.elgaId)) {
          localMed.elgaSynced = true;
          localMed.elgaSyncedAt = new Date();
          localMed.lastModifiedBy = req.user._id;
          await localMed.save();
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Medikamente erfolgreich synchronisiert',
      data: {
        strategy,
        elgaCount: elgaMedications.length,
        localCount: localMedications.length,
        result: syncResult
      }
    });
  } catch (error) {
    console.error('Error syncing medications with ELGA:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Synchronisation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/elga/patient/:patientId/medication/resolve-conflict
 * @desc    Konflikt zwischen lokalem und ELGA-Medikament lösen
 * @access  Private
 */
router.post('/patient/:patientId/medication/resolve-conflict', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { medicationId, resolution, elgaData } = req.body; // resolution: 'local', 'elga', 'merge'
    
    const PatientMedication = require('../models/PatientMedication');
    const medication = await PatientMedication.findOne({ _id: medicationId, patientId });
    
    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medikament nicht gefunden'
      });
    }
    
    if (resolution === 'elga' && elgaData) {
      // Verwende ELGA-Daten
      medication.name = elgaData.name || medication.name;
      medication.dosage = elgaData.dosage || medication.dosage;
      medication.frequency = elgaData.frequency || medication.frequency;
      medication.duration = elgaData.duration || medication.duration;
      medication.startDate = elgaData.startDate ? new Date(elgaData.startDate) : medication.startDate;
      medication.endDate = elgaData.endDate ? new Date(elgaData.endDate) : medication.endDate;
      medication.status = elgaData.status || medication.status;
      medication.elgaId = elgaData.id || medication.elgaId;
      medication.elgaSynced = true;
      medication.elgaSyncedAt = new Date();
      medication.source = 'elga';
    } else if (resolution === 'merge' && elgaData) {
      // Kombiniere lokale und ELGA-Daten (ELGA hat Priorität bei Konflikten)
      medication.dosage = elgaData.dosage || medication.dosage;
      medication.frequency = elgaData.frequency || medication.frequency;
      medication.status = elgaData.status || medication.status;
      medication.elgaId = elgaData.id || medication.elgaId;
      medication.elgaSynced = true;
      medication.elgaSyncedAt = new Date();
    }
    // Bei 'local' bleibt alles unverändert
    
    medication.lastModifiedBy = req.user._id;
    await medication.save();
    
    res.json({
      success: true,
      message: 'Konflikt erfolgreich gelöst',
      data: medication
    });
  } catch (error) {
    console.error('Error resolving medication conflict:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Lösen des Konflikts',
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

/**
 * @route   GET /api/elga/config
 * @desc    ELGA-Konfiguration abrufen (ohne sensible Daten)
 * @access  Private
 */
router.get('/config', auth, async (req, res) => {
  try {
    const config = require('../config/elga.config');
    
    // Konfiguration ohne sensible Daten zurückgeben
    res.json({
      success: true,
      data: {
        environment: config.environment,
        testApiUrl: config.api.test.baseUrl,
        prodApiUrl: config.api.production.baseUrl,
        hasCertificates: config.hasCertificates(),
        certPath: config.certificates.clientCert,
        ecard: {
          timeout: config.ecard.timeout,
          cacheDuration: config.ecard.cacheDuration,
          enableFallback: config.ecard.enableFallback
        },
        billing: {
          autoSubmit: config.billing.autoSubmit,
          submitSchedule: config.billing.submitSchedule,
          maxRetries: config.billing.maxRetries,
          retryDelay: config.billing.retryDelay
        },
        logging: {
          verbose: config.logging.verbose,
          level: config.logging.level
        }
      }
    });
  } catch (error) {
    console.error('Error fetching ELGA config:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der ELGA-Konfiguration',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/elga/config
 * @desc    ELGA-Konfiguration aktualisieren
 * @access  Private (Admin)
 */
router.put('/config', auth, async (req, res) => {
  try {
    // Prüfe Admin-Rechte
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Konfigurationen ändern'
      });
    }

    const { environment, testApiUrl, prodApiUrl, ecard, billing, logging } = req.body;
    
    // Hinweis: In Produktion sollten Konfigurationen über .env-Dateien verwaltet werden
    // Diese Endpunkte dienen nur zur Anzeige und können in eine Config-DB schreiben
    
    res.json({
      success: true,
      message: 'Konfiguration aktualisiert. Bitte beachten Sie: Änderungen müssen in der .env-Datei vorgenommen werden.',
      data: {
        environment: environment || 'development',
        testApiUrl: testApiUrl || '',
        prodApiUrl: prodApiUrl || '',
        ecard: ecard || {},
        billing: billing || {},
        logging: logging || {}
      }
    });
  } catch (error) {
    console.error('Error updating ELGA config:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der ELGA-Konfiguration',
      error: error.message
    });
  }
});

module.exports = router;
