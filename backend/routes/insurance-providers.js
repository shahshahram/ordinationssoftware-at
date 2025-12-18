const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const InsuranceProvider = require('../models/InsuranceProvider');
const insuranceConnector = require('../services/connectors/insuranceConnector');

/**
 * @route   GET /api/insurance-providers
 * @desc    Alle Versicherungskonfigurationen abrufen
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { active, protocol, search } = req.query;
    
    const query = {};
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    if (protocol) {
      query['integration.protocol'] = protocol;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { aliases: { $regex: search, $options: 'i' } }
      ];
    }
    
    const providers = await InsuranceProvider.find(query)
      .select('-integration.rest.apiKey -integration.rest.apiSecret -integration.fhir.apiKey -integration.fhir.clientSecret -integration.soap.password')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: providers,
      count: providers.length
    });
  } catch (error) {
    console.error('Fehler beim Laden der Versicherungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Versicherungen',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/insurance-providers/:id
 * @desc    Einzelne Versicherungskonfiguration abrufen
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const provider = await InsuranceProvider.findById(req.params.id)
      .select('-integration.rest.apiKey -integration.rest.apiSecret -integration.fhir.apiKey -integration.fhir.clientSecret -integration.soap.password');
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Versicherung nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('Fehler beim Laden der Versicherung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Versicherung',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/insurance-providers
 * @desc    Neue Versicherungskonfiguration erstellen
 * @access  Private (Admin)
 */
router.post('/', [
  auth,
  body('name').trim().notEmpty().withMessage('Name ist erforderlich'),
  body('code').trim().notEmpty().withMessage('Code ist erforderlich'),
  body('integration.protocol').isIn(['rest', 'fhir', 'soap', 'email', 'pdf', 'platform-mycare', 'platform-rehadirekt', 'platform-eabrechnung', 'manual']).withMessage('Ungültiges Protokoll')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    // Prüfe ob Code bereits existiert
    const existing = await InsuranceProvider.findOne({
      $or: [
        { code: req.body.code.toUpperCase() },
        { name: req.body.name }
      ]
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Versicherung mit diesem Code oder Namen existiert bereits'
      });
    }
    
    const provider = new InsuranceProvider({
      ...req.body,
      code: req.body.code.toUpperCase(),
      createdBy: req.user._id
    });
    
    await provider.save();
    
    // Cache leeren
    insuranceConnector.clearCache();
    
    res.status(201).json({
      success: true,
      data: provider,
      message: 'Versicherungskonfiguration erfolgreich erstellt'
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Versicherung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Versicherung',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/insurance-providers/:id
 * @desc    Versicherungskonfiguration aktualisieren
 * @access  Private (Admin)
 */
router.put('/:id', [
  auth,
  body('integration.protocol').optional().isIn(['rest', 'fhir', 'soap', 'email', 'pdf', 'platform-mycare', 'platform-rehadirekt', 'platform-eabrechnung', 'manual'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const provider = await InsuranceProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Versicherung nicht gefunden'
      });
    }
    
    // Aktualisiere Felder
    Object.assign(provider, req.body);
    provider.updatedBy = req.user._id;
    if (req.body.code) {
      provider.code = req.body.code.toUpperCase();
    }
    
    await provider.save();
    
    // Cache leeren
    insuranceConnector.clearCache();
    
    res.json({
      success: true,
      data: provider,
      message: 'Versicherungskonfiguration erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Versicherung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Versicherung',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/insurance-providers/:id
 * @desc    Versicherungskonfiguration löschen
 * @access  Private (Admin)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const provider = await InsuranceProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Versicherung nicht gefunden'
      });
    }
    
    // Soft Delete: Setze isActive auf false
    provider.isActive = false;
    provider.updatedBy = req.user._id;
    await provider.save();
    
    // Cache leeren
    insuranceConnector.clearCache();
    
    res.json({
      success: true,
      message: 'Versicherungskonfiguration erfolgreich deaktiviert'
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Versicherung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Versicherung',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/insurance-providers/:id/test
 * @desc    Test-Verbindung zu Versicherungs-API
 * @access  Private
 */
router.post('/:id/test', auth, async (req, res) => {
  try {
    const provider = await InsuranceProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Versicherung nicht gefunden'
      });
    }
    
    const result = await insuranceConnector.testConnection(provider.name);
    
    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Verbindung erfolgreich' : `Verbindung fehlgeschlagen: ${result.error}`
    });
  } catch (error) {
    console.error('Fehler beim Testen der Verbindung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Testen der Verbindung',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/insurance-providers/supported/list
 * @desc    Liste aller unterstützten Versicherungen (für Dropdown)
 * @access  Private
 */
router.get('/supported/list', auth, async (req, res) => {
  try {
    const providers = await InsuranceProvider.find({ isActive: true })
      .select('name code integration.protocol')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: providers.map(p => ({
        id: p._id,
        name: p.name,
        code: p.code,
        protocol: p.integration?.protocol
      }))
    });
  } catch (error) {
    console.error('Fehler beim Laden der Versicherungsliste:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Versicherungsliste',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/insurance-providers/stats/overview
 * @desc    Statistiken aller Versicherungen
 * @access  Private
 */
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const providers = await InsuranceProvider.find({ isActive: true })
      .select('name code stats');
    
    const overview = {
      total: providers.length,
      totalSubmissions: 0,
      successfulSubmissions: 0,
      failedSubmissions: 0,
      providers: providers.map(p => ({
        name: p.name,
        code: p.code,
        stats: p.stats
      }))
    };
    
    providers.forEach(p => {
      overview.totalSubmissions += p.stats?.totalSubmissions || 0;
      overview.successfulSubmissions += p.stats?.successfulSubmissions || 0;
      overview.failedSubmissions += p.stats?.failedSubmissions || 0;
    });
    
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Fehler beim Laden der Statistiken:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken',
      error: error.message
    });
  }
});

module.exports = router;

