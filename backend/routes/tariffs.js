// Tarifverwaltung Routes (GOÄ, KHO, ET)

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const Tariff = require('../models/Tariff');
const { body, validationResult } = require('express-validator');

// GET /api/tariffs - Alle Tarife abrufen
router.get('/', auth, async (req, res) => {
  try {
    const { tariffType, specialty, isActive, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (tariffType) filter.tariffType = tariffType;
    if (specialty) filter.specialty = specialty;
    // isActive-Filter nur anwenden, wenn explizit gesetzt
    // Standardmäßig alle Tarife anzeigen (sowohl aktive als auch inaktive)
    if (isActive !== undefined && isActive !== '') {
      // Konvertiere String 'true'/'false' zu Boolean
      const isActiveValue = isActive === 'true' || isActive === true || isActive === '1';
      filter.isActive = isActiveValue;
      console.log(`[Tariffs API] isActive Konvertierung: ${isActive} (${typeof isActive}) -> ${isActiveValue}`);
    } else {
      console.log(`[Tariffs API] isActive nicht gesetzt, zeige alle Tarife (aktiv und inaktiv)`);
    }
    
    console.log(`[Tariffs API] Filter:`, JSON.stringify(filter));
    console.log(`[Tariffs API] Query params:`, { tariffType, specialty, isActive, page, limit });
    
    const tariffs = await Tariff.find(filter)
      .populate('createdBy', 'firstName lastName')
      .sort({ code: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Tariff.countDocuments(filter);
    
    console.log(`[Tariffs API] Gefunden: ${tariffs.length} von ${total} Tarifen`);
    if (tariffs.length > 0) {
      console.log(`[Tariffs API] Beispiel-Tarif:`, {
        code: tariffs[0].code,
        name: tariffs[0].name,
        tariffType: tariffs[0].tariffType,
        isActive: tariffs[0].isActive
      });
    }
    
    res.json({
      success: true,
      data: tariffs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching tariffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Tarife',
      error: error.message
    });
  }
});

// GET /api/tariffs/goae - GOÄ-Tarife abrufen
router.get('/goae', auth, async (req, res) => {
  try {
    const { section, specialty } = req.query;
    const tariffs = await Tariff.findGOAE(section);
    
    let filtered = tariffs;
    if (specialty) {
      filtered = tariffs.filter(t => t.specialty === specialty || t.specialty === 'allgemein');
    }
    
    res.json({
      success: true,
      data: filtered
    });
  } catch (error) {
    console.error('Error fetching GOAE tariffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der GOÄ-Tarife',
      error: error.message
    });
  }
});

// GET /api/tariffs/kho - KHO/ET-Tarife abrufen
router.get('/kho', auth, async (req, res) => {
  try {
    const { insuranceProvider, federalState } = req.query;
    
    const options = {};
    if (insuranceProvider) {
      options.insuranceProvider = insuranceProvider;
    }
    if (federalState) {
      options.federalState = federalState;
    }
    
    const tariffs = await Tariff.findKHO(options);
    
    res.json({
      success: true,
      data: tariffs
    });
  } catch (error) {
    console.error('Error fetching KHO tariffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der KHO-Tarife',
      error: error.message
    });
  }
});

// GET /api/tariffs/:id - Einzelnen Tarif abrufen
router.get('/:id', auth, async (req, res) => {
  try {
    const tariff = await Tariff.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');
    
    if (!tariff) {
      return res.status(404).json({
        success: false,
        message: 'Tarif nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: tariff
    });
  } catch (error) {
    console.error('Error fetching tariff:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Tarifs',
      error: error.message
    });
  }
});

// POST /api/tariffs - Neuen Tarif erstellen
router.post('/', [
  auth,
  body('code').notEmpty().withMessage('Tarif-Code ist erforderlich'),
  body('name').notEmpty().withMessage('Tarif-Name ist erforderlich'),
  body('tariffType').isIn(['goae', 'kho', 'et', 'ebm', 'custom']).withMessage('Ungültiger Tariftyp')
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
    
    // Prüfe ob Code bereits existiert
    const existing = await Tariff.findByCode(req.body.code);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Tarif-Code bereits vorhanden'
      });
    }
    
    const tariff = new Tariff({
      ...req.body,
      createdBy: req.user._id
    });
    
    await tariff.save();
    
    await tariff.populate('createdBy', 'firstName lastName');
    
    res.status(201).json({
      success: true,
      message: 'Tarif erfolgreich erstellt',
      data: tariff
    });
  } catch (error) {
    console.error('Error creating tariff:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Tarifs',
      error: error.message
    });
  }
});

// PATCH /api/tariffs/:id - Tarif aktualisieren
router.patch('/:id', auth, async (req, res) => {
  try {
    const tariff = await Tariff.findById(req.params.id);
    
    if (!tariff) {
      return res.status(404).json({
        success: false,
        message: 'Tarif nicht gefunden'
      });
    }
    
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== 'code') {
        tariff[key] = req.body[key];
      }
    });
    
    tariff.updatedBy = req.user._id;
    await tariff.save();
    
    await tariff.populate('updatedBy', 'firstName lastName');
    
    res.json({
      success: true,
      message: 'Tarif erfolgreich aktualisiert',
      data: tariff
    });
  } catch (error) {
    console.error('Error updating tariff:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Tarifs',
      error: error.message
    });
  }
});

// DELETE /api/tariffs/:id - Tarif löschen (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const tariff = await Tariff.findById(req.params.id);
    
    if (!tariff) {
      return res.status(404).json({
        success: false,
        message: 'Tarif nicht gefunden'
      });
    }
    
    tariff.isActive = false;
    tariff.updatedBy = req.user._id;
    await tariff.save();
    
    res.json({
      success: true,
      message: 'Tarif erfolgreich deaktiviert'
    });
  } catch (error) {
    console.error('Error deleting tariff:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Tarifs',
      error: error.message
    });
  }
});

// DELETE /api/tariffs/kho/clear - Alle KHO/ET/EBM-Tarife löschen (für neuen Import)
// Unterstützt sowohl Query-Parameter als auch Body für Bestätigung
router.delete('/kho/clear', auth, checkPermission('settings.write'), async (req, res) => {
  try {
    // Prüfe Bestätigung aus Query-Parameter oder Body
    const confirm = req.query.confirm || req.body?.confirm;
    
    if (confirm !== 'DELETE_ALL_KHO_TARIFFS') {
      return res.status(400).json({
        success: false,
        message: 'Bestätigung erforderlich. Bitte geben Sie "DELETE_ALL_KHO_TARIFFS" als Query-Parameter oder im Body ein.',
        errors: [{ msg: 'Bestätigung erforderlich' }]
      });
    }

    // Zähle zuerst, wie viele Tarife gelöscht werden
    const countBefore = await Tariff.countDocuments({
      tariffType: { $in: ['kho', 'et', 'ebm'] }
    });

    if (countBefore === 0) {
      return res.json({
        success: true,
        message: 'Keine KHO-Tarife zum Löschen gefunden',
        deleted: 0
      });
    }

    // Lösche alle KHO/ET/EBM-Tarife (nicht GOÄ!)
    const result = await Tariff.deleteMany({
      tariffType: { $in: ['kho', 'et', 'ebm'] }
    });

    console.log(`[Tariffs] ${result.deletedCount} KHO-Tarife gelöscht von Benutzer ${req.user._id}`);

    res.json({
      success: true,
      message: `${result.deletedCount} KHO-Tarife erfolgreich gelöscht`,
      deleted: result.deletedCount,
      countBefore: countBefore
    });
  } catch (error) {
    console.error('Error clearing KHO tariffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der KHO-Tarife',
      error: error.message
    });
  }
});

// GET /api/tariffs/kho/count - Anzahl der KHO-Tarife abrufen
router.get('/kho/count', auth, async (req, res) => {
  try {
    const count = await Tariff.countDocuments({
      tariffType: { $in: ['kho', 'et', 'ebm'] }
    });

    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Error counting KHO tariffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Zählen der KHO-Tarife',
      error: error.message
    });
  }
});

module.exports = router;



























