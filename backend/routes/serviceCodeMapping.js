const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ServiceCodeMapping = require('../models/ServiceCodeMapping');
const serviceCodeMappingService = require('../services/serviceCodeMappingService');

/**
 * GET /api/service-code-mapping
 * Alle Service-Code-Mappings abrufen
 */
router.get('/', auth, async (req, res) => {
  try {
    const { baseCode, insuranceProvider, specialty, category, isActive } = req.query;
    
    const filter = {};
    if (baseCode) filter.baseCode = baseCode;
    if (insuranceProvider) filter['mappings.insuranceProvider'] = insuranceProvider;
    if (specialty) filter.specialty = specialty;
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const mappings = await ServiceCodeMapping.find(filter).sort({ baseCode: 1, createdAt: -1 });
    
    res.json({
      success: true,
      data: mappings,
      count: mappings.length
    });
  } catch (error) {
    console.error('[ServiceCodeMapping] Fehler beim Abrufen der Mappings:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Service-Code-Mappings',
      error: error.message
    });
  }
});

/**
 * GET /api/service-code-mapping/:id
 * Einzelnes Mapping abrufen
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const mapping = await ServiceCodeMapping.findById(req.params.id);
    
    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'Service-Code-Mapping nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: mapping
    });
  } catch (error) {
    console.error('[ServiceCodeMapping] Fehler beim Abrufen des Mappings:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Service-Code-Mappings',
      error: error.message
    });
  }
});

/**
 * POST /api/service-code-mapping
 * Neues Mapping erstellen
 */
router.post('/', auth, async (req, res) => {
  try {
    const { baseCode, baseName, mappings, specialty, category } = req.body;
    
    // Validierung
    if (!baseCode || !baseName) {
      return res.status(400).json({
        success: false,
        message: 'baseCode und baseName sind erforderlich'
      });
    }
    
    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Mindestens ein Mapping ist erforderlich'
      });
    }
    
    // Prüfe ob Mapping bereits existiert
    const existing = await ServiceCodeMapping.findOne({ baseCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Mapping für Code ${baseCode} existiert bereits`
      });
    }
    
    // Erstelle neues Mapping
    const newMapping = new ServiceCodeMapping({
      baseCode,
      baseName,
      mappings: mappings.map(m => ({
        ...m,
        isActive: m.isActive !== undefined ? m.isActive : true
      })),
      specialty,
      category,
      isActive: true
    });
    
    await newMapping.save();
    
    res.status(201).json({
      success: true,
      message: 'Service-Code-Mapping erfolgreich erstellt',
      data: newMapping
    });
  } catch (error) {
    console.error('[ServiceCodeMapping] Fehler beim Erstellen des Mappings:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Service-Code-Mappings',
      error: error.message
    });
  }
});

/**
 * PUT /api/service-code-mapping/:id
 * Mapping aktualisieren
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { baseName, mappings, specialty, category, isActive } = req.body;
    
    const mapping = await ServiceCodeMapping.findById(req.params.id);
    
    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'Service-Code-Mapping nicht gefunden'
      });
    }
    
    // Aktualisiere Felder
    if (baseName !== undefined) mapping.baseName = baseName;
    if (mappings !== undefined) {
      mapping.mappings = mappings.map(m => ({
        ...m,
        isActive: m.isActive !== undefined ? m.isActive : true
      }));
    }
    if (specialty !== undefined) mapping.specialty = specialty;
    if (category !== undefined) mapping.category = category;
    if (isActive !== undefined) mapping.isActive = isActive;
    
    await mapping.save();
    
    res.json({
      success: true,
      message: 'Service-Code-Mapping erfolgreich aktualisiert',
      data: mapping
    });
  } catch (error) {
    console.error('[ServiceCodeMapping] Fehler beim Aktualisieren des Mappings:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Service-Code-Mappings',
      error: error.message
    });
  }
});

/**
 * DELETE /api/service-code-mapping/:id
 * Mapping löschen
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const mapping = await ServiceCodeMapping.findById(req.params.id);
    
    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'Service-Code-Mapping nicht gefunden'
      });
    }
    
    await mapping.deleteOne();
    
    res.json({
      success: true,
      message: 'Service-Code-Mapping erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('[ServiceCodeMapping] Fehler beim Löschen des Mappings:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Service-Code-Mappings',
      error: error.message
    });
  }
});

/**
 * POST /api/service-code-mapping/:id/mappings
 * Mapping für einen Versicherungsträger hinzufügen
 */
router.post('/:id/mappings', auth, async (req, res) => {
  try {
    const { insuranceProvider, code, name, price, validFrom, validUntil } = req.body;
    
    if (!insuranceProvider || !code) {
      return res.status(400).json({
        success: false,
        message: 'insuranceProvider und code sind erforderlich'
      });
    }
    
    const mapping = await ServiceCodeMapping.findById(req.params.id);
    
    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'Service-Code-Mapping nicht gefunden'
      });
    }
    
    // Prüfe ob Mapping bereits existiert
    const existingMapping = mapping.mappings.find(
      m => m.insuranceProvider === insuranceProvider && m.isActive
    );
    
    if (existingMapping) {
      return res.status(400).json({
        success: false,
        message: `Mapping für ${insuranceProvider} existiert bereits`
      });
    }
    
    // Füge neues Mapping hinzu
    mapping.mappings.push({
      insuranceProvider,
      code,
      name,
      price,
      validFrom: validFrom ? new Date(validFrom) : undefined,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      isActive: true
    });
    
    await mapping.save();
    
    res.json({
      success: true,
      message: 'Mapping erfolgreich hinzugefügt',
      data: mapping
    });
  } catch (error) {
    console.error('[ServiceCodeMapping] Fehler beim Hinzufügen des Mappings:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hinzufügen des Mappings',
      error: error.message
    });
  }
});

/**
 * PUT /api/service-code-mapping/:id/mappings/:mappingId
 * Mapping für einen Versicherungsträger aktualisieren
 */
router.put('/:id/mappings/:mappingId', auth, async (req, res) => {
  try {
    const { code, name, price, validFrom, validUntil, isActive } = req.body;
    
    const mapping = await ServiceCodeMapping.findById(req.params.id);
    
    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'Service-Code-Mapping nicht gefunden'
      });
    }
    
    const providerMapping = mapping.mappings.id(req.params.mappingId);
    
    if (!providerMapping) {
      return res.status(404).json({
        success: false,
        message: 'Provider-Mapping nicht gefunden'
      });
    }
    
    // Aktualisiere Felder
    if (code !== undefined) providerMapping.code = code;
    if (name !== undefined) providerMapping.name = name;
    if (price !== undefined) providerMapping.price = price;
    if (validFrom !== undefined) providerMapping.validFrom = validFrom ? new Date(validFrom) : undefined;
    if (validUntil !== undefined) providerMapping.validUntil = validUntil ? new Date(validUntil) : undefined;
    if (isActive !== undefined) providerMapping.isActive = isActive;
    
    await mapping.save();
    
    res.json({
      success: true,
      message: 'Provider-Mapping erfolgreich aktualisiert',
      data: mapping
    });
  } catch (error) {
    console.error('[ServiceCodeMapping] Fehler beim Aktualisieren des Provider-Mappings:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Provider-Mappings',
      error: error.message
    });
  }
});

/**
 * DELETE /api/service-code-mapping/:id/mappings/:mappingId
 * Mapping für einen Versicherungsträger löschen
 */
router.delete('/:id/mappings/:mappingId', auth, async (req, res) => {
  try {
    const mapping = await ServiceCodeMapping.findById(req.params.id);
    
    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'Service-Code-Mapping nicht gefunden'
      });
    }
    
    const providerMapping = mapping.mappings.id(req.params.mappingId);
    
    if (!providerMapping) {
      return res.status(404).json({
        success: false,
        message: 'Provider-Mapping nicht gefunden'
      });
    }
    
    providerMapping.deleteOne();
    await mapping.save();
    
    res.json({
      success: true,
      message: 'Provider-Mapping erfolgreich gelöscht',
      data: mapping
    });
  } catch (error) {
    console.error('[ServiceCodeMapping] Fehler beim Löschen des Provider-Mappings:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Provider-Mappings',
      error: error.message
    });
  }
});

/**
 * POST /api/service-code-mapping/create-from-service-catalog/:serviceCode
 * Erstellt automatisch Mapping aus ServiceCatalog
 */
router.post('/create-from-service-catalog/:serviceCode', auth, async (req, res) => {
  try {
    const mapping = await serviceCodeMappingService.createMappingFromServiceCatalog(req.params.serviceCode);
    
    res.json({
      success: true,
      message: 'Mapping erfolgreich aus ServiceCatalog erstellt',
      data: mapping
    });
  } catch (error) {
    console.error('[ServiceCodeMapping] Fehler beim Erstellen aus ServiceCatalog:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Erstellen des Mappings aus ServiceCatalog',
      error: error.message
    });
  }
});

module.exports = router;
