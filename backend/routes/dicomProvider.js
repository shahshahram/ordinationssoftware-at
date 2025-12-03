const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const DicomProvider = require('../models/DicomProvider');

/**
 * @route   GET /api/dicom-providers
 * @desc    Alle DICOM-Provider abrufen
 * @access  Private (admin, settings.read)
 */
router.get('/', auth, checkPermission('settings.read'), async (req, res) => {
  try {
    const { isActive, type, search } = req.query;
    
    const query = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (type) {
      query.type = type;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const providers = await DicomProvider.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: providers,
      count: providers.length
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der DICOM-Provider:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der DICOM-Provider',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/dicom-providers/:id
 * @desc    Einzelnen DICOM-Provider abrufen
 * @access  Private (settings.read)
 */
router.get('/:id', auth, checkPermission('settings.read'), async (req, res) => {
  try {
    const provider = await DicomProvider.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'DICOM-Provider nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des DICOM-Providers:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des DICOM-Providers',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/dicom-providers
 * @desc    Neuen DICOM-Provider erstellen
 * @access  Private (settings.write)
 */
router.post('/', auth, checkPermission('settings.write'), async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      type,
      contact,
      integration,
      mapping,
      security,
      notifications
    } = req.body;
    
    // Validiere erforderliche Felder
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name und Code sind erforderlich'
      });
    }
    
    // Prüfe ob Code bereits existiert
    const existingProvider = await DicomProvider.findOne({ code: code.toUpperCase() });
    if (existingProvider) {
      return res.status(409).json({
        success: false,
        message: 'Ein Provider mit diesem Code existiert bereits'
      });
    }
    
    // Erstelle neuen Provider
    const provider = new DicomProvider({
      name,
      code: code.toUpperCase(),
      description,
      type: type || 'radiology',
      contact: contact || {},
      integration: integration || { protocol: 'rest' },
      mapping: mapping || { patientMatching: 'name-dob' },
      security: security || {},
      notifications: notifications || {},
      createdBy: req.user.id
    });
    
    await provider.save();
    
    await provider.populate('createdBy', 'firstName lastName');
    
    res.status(201).json({
      success: true,
      message: 'DICOM-Provider erfolgreich erstellt',
      data: provider
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des DICOM-Providers:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des DICOM-Providers',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/dicom-providers/:id
 * @desc    DICOM-Provider aktualisieren
 * @access  Private (settings.write)
 */
router.put('/:id', auth, checkPermission('settings.write'), async (req, res) => {
  try {
    const provider = await DicomProvider.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'DICOM-Provider nicht gefunden'
      });
    }
    
    const {
      name,
      code,
      description,
      type,
      contact,
      integration,
      mapping,
      security,
      notifications,
      isActive
    } = req.body;
    
    // Update Felder
    if (name) provider.name = name;
    if (code) provider.code = code.toUpperCase();
    if (description !== undefined) provider.description = description;
    if (type) provider.type = type;
    if (contact) provider.contact = { ...provider.contact, ...contact };
    if (integration) provider.integration = { ...provider.integration, ...integration };
    if (mapping) provider.mapping = { ...provider.mapping, ...mapping };
    if (security) provider.security = { ...provider.security, ...security };
    if (notifications) provider.notifications = { ...provider.notifications, ...notifications };
    if (isActive !== undefined) provider.isActive = isActive;
    
    provider.updatedBy = req.user.id;
    
    await provider.save();
    
    await provider.populate('updatedBy', 'firstName lastName');
    
    res.json({
      success: true,
      message: 'DICOM-Provider erfolgreich aktualisiert',
      data: provider
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des DICOM-Providers:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des DICOM-Providers',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/dicom-providers/:id
 * @desc    DICOM-Provider löschen
 * @access  Private (settings.write)
 */
router.delete('/:id', auth, checkPermission('settings.write'), async (req, res) => {
  try {
    const provider = await DicomProvider.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'DICOM-Provider nicht gefunden'
      });
    }
    
    // Prüfe ob Provider noch aktiv ist
    if (provider.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Aktiver Provider kann nicht gelöscht werden. Bitte deaktivieren Sie ihn zuerst.'
      });
    }
    
    await DicomProvider.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'DICOM-Provider erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen des DICOM-Providers:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des DICOM-Providers',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/dicom-providers/:id/regenerate-api-key
 * @desc    API-Key für Provider neu generieren
 * @access  Private (settings.write)
 */
router.post('/:id/regenerate-api-key', auth, checkPermission('settings.write'), async (req, res) => {
  try {
    const provider = await DicomProvider.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'DICOM-Provider nicht gefunden'
      });
    }
    
    // Generiere neuen API-Key
    const crypto = require('crypto');
    const newApiKey = crypto.randomBytes(32).toString('hex');
    
    if (!provider.integration.rest) {
      provider.integration.rest = {};
    }
    
    provider.integration.rest.apiKey = newApiKey;
    provider.updatedBy = req.user.id;
    
    await provider.save();
    
    res.json({
      success: true,
      message: 'API-Key erfolgreich neu generiert',
      data: {
        apiKey: newApiKey,
        warning: 'Bitte speichern Sie diesen API-Key sicher. Er wird nicht erneut angezeigt.'
      }
    });
  } catch (error) {
    console.error('Fehler beim Regenerieren des API-Keys:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Regenerieren des API-Keys',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/dicom-providers/:id/stats
 * @desc    Statistiken für einen Provider abrufen
 * @access  Private (settings.read)
 */
router.get('/:id/stats', auth, checkPermission('settings.read'), async (req, res) => {
  try {
    const provider = await DicomProvider.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'DICOM-Provider nicht gefunden'
      });
    }
    
    // Hole zusätzliche Statistiken aus DicomStudy
    const DicomStudy = require('../models/DicomStudy');
    const studies = await DicomStudy.find({
      externalProvider: provider.code,
      source: 'external'
    });
    
    const stats = {
      ...provider.stats.toObject(),
      totalStudies: studies.length,
      studiesByModality: {},
      studiesByMonth: {}
    };
    
    // Gruppiere nach Modality
    studies.forEach(study => {
      const modality = study.modality || 'Unknown';
      stats.studiesByModality[modality] = (stats.studiesByModality[modality] || 0) + 1;
    });
    
    // Gruppiere nach Monat
    studies.forEach(study => {
      const month = new Date(study.uploadedAt).toISOString().substring(0, 7); // YYYY-MM
      stats.studiesByMonth[month] = (stats.studiesByMonth[month] || 0) + 1;
    });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Statistiken:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Statistiken',
      error: error.message
    });
  }
});

module.exports = router;







