// Tarifverwaltung Routes (GOÄ, KHO, ET)

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Tariff = require('../models/Tariff');
const { body, validationResult } = require('express-validator');

// GET /api/tariffs - Alle Tarife abrufen
router.get('/', auth, async (req, res) => {
  try {
    const { tariffType, specialty, isActive = true, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (tariffType) filter.tariffType = tariffType;
    if (specialty) filter.specialty = specialty;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const tariffs = await Tariff.find(filter)
      .populate('createdBy', 'firstName lastName')
      .sort({ code: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Tariff.countDocuments(filter);
    
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
    const tariffs = await Tariff.findKHO();
    
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

module.exports = router;














