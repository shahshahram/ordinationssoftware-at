// ELDA Routes - Elektronischer Datenaustausch mit österreichischen Sozialversicherungsträgern

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const eldaConnector = require('../services/connectors/eldaConnector');
const eldaConfig = require('../config/elda.config');
const eldaFormatGenerator = require('../services/eldaFormatGenerator');

/**
 * @route   GET /api/elda/status
 * @desc    ELDA-Systemstatus prüfen
 * @access  Private
 */
router.get('/status', auth, checkPermission('settings.read'), async (req, res) => {
  try {
    const config = eldaConfig.getActiveConfig();
    const validation = eldaConfig.validate();
    const availableMethods = eldaConnector.getAvailableMethods();
    const defaultMethod = eldaConfig.getDefaultMethod();
    
    res.json({
      success: true,
      data: {
        configured: validation.valid,
        environment: config.environment || eldaConfig.environment,
        defaultMethod: defaultMethod,
        availableMethods,
        ftps: {
          enabled: config.ftps?.enabled || false,
          host: config.ftps?.host || null,
          port: config.ftps?.port || null,
          hasCredentials: !!(config.credentials?.username && config.credentials?.password),
          hasCertificates: eldaConfig.hasCertificates()
        },
        webservice: {
          enabled: config.webservice?.enabled || false,
          baseUrl: config.webservice?.baseUrl || null,
          hasApiKey: !!config.apiKey,
          activationDate: config.webservice?.activationDate || null
        },
        errors: validation.errors || []
      }
    });
  } catch (error) {
    console.error('Error checking ELDA status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Prüfen des ELDA-Status',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/elda/test-connection
 * @desc    Testet ELDA-Verbindung
 * @access  Private
 */
router.post('/test-connection', auth, checkPermission('settings.read'), async (req, res) => {
  try {
    const { method } = req.body; // 'ftps' oder 'webservice', optional
    
    const result = await eldaConnector.testConnection(method);
    
    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Error testing ELDA connection:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Testen der ELDA-Verbindung',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/elda/send
 * @desc    Sendet Daten an ELDA
 * @access  Private
 */
router.post('/send', auth, checkPermission('billing.write'), async (req, res) => {
  try {
    const { payload, datasetType, method, autoFormat = true } = req.body;
    
    if (!payload || !datasetType) {
      return res.status(400).json({
        success: false,
        message: 'Payload und datasetType sind erforderlich'
      });
    }
    
    const result = await eldaConnector.send(payload, datasetType, method, autoFormat);
    
    res.json({
      success: true,
      message: 'Daten erfolgreich an ELDA übertragen',
      data: result
    });
  } catch (error) {
    console.error('Error sending data to ELDA:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Senden der Daten an ELDA',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/elda/format/:datasetType
 * @desc    Generiert ELDA-Format für Datensatztyp
 * @access  Private
 */
router.post('/format/:datasetType', auth, checkPermission('settings.read'), async (req, res) => {
  try {
    const { datasetType } = req.params;
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Daten sind erforderlich'
      });
    }
    
    // Validiere Datensatz
    const validation = eldaFormatGenerator.validateDataset(data, datasetType);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Datensatz-Validierung fehlgeschlagen',
        errors: validation.errors
      });
    }
    
    // Generiere Format
    let formatted;
    switch (datasetType.toUpperCase()) {
      case 'KSB':
        formatted = eldaFormatGenerator.generateKSB(data);
        break;
      case 'LOHNMEDLUNG':
        formatted = eldaFormatGenerator.generateLohnmeldung(data);
        break;
      case 'ABRECHNUNG':
        formatted = eldaFormatGenerator.generateAbrechnung(data);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Unbekannter Datensatztyp: ${datasetType}`
        });
    }
    
    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Error generating ELDA format:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren des ELDA-Formats',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/elda/config
 * @desc    ELDA-Konfiguration abrufen
 * @access  Private
 */
router.get('/config', auth, checkPermission('settings.read'), async (req, res) => {
  try {
    const config = eldaConfig.getActiveConfig();
    const availableMethods = eldaConnector.getAvailableMethods();
    
    // Entferne sensible Daten
    const safeConfig = {
      environment: config.environment,
      defaultMethod: config.defaultMethod,
      availableMethods,
      ftps: {
        enabled: config.ftps.enabled,
        host: config.ftps.host,
        port: config.ftps.port
      },
      webservice: {
        enabled: config.webservice.enabled,
        baseUrl: config.webservice.baseUrl,
        hasApiKey: !!config.apiKey,
        activationDate: config.webservice.activationDate
      },
      limits: config.limits,
      timeout: config.timeout
    };
    
    res.json({
      success: true,
      data: safeConfig
    });
  } catch (error) {
    console.error('Error fetching ELDA config:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der ELDA-Konfiguration',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/elda/methods
 * @desc    Verfügbare Übertragungsmethoden abrufen
 * @access  Private
 */
router.get('/methods', auth, checkPermission('settings.read'), async (req, res) => {
  try {
    const availableMethods = eldaConnector.getAvailableMethods();
    const config = eldaConfig.getActiveConfig();
    const defaultMethod = eldaConfig.getDefaultMethod();
    
    const methods = [];
    
    if (availableMethods.includes('ftps')) {
      methods.push({
        id: 'ftps',
        name: 'FTPS',
        description: 'FTPS-basierte Übertragung (aktuell verfügbar)',
        enabled: config.ftps?.enabled || false,
        host: config.ftps?.host || null,
        port: config.ftps?.port || null
      });
    }
    
    if (availableMethods.includes('webservice')) {
      methods.push({
        id: 'webservice',
        name: 'Webservice',
        description: 'REST-Webservice-Übertragung',
        enabled: config.webservice?.enabled || false,
        baseUrl: config.webservice?.baseUrl || null,
        activationDate: config.webservice?.activationDate || null
      });
    }
    
    res.json({
      success: true,
      data: {
        methods,
        defaultMethod: defaultMethod
      }
    });
  } catch (error) {
    console.error('Error fetching ELDA methods:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Übertragungsmethoden',
      error: error.message
    });
  }
});

module.exports = router;

