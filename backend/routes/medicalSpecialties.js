const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const MedicalSpecialty = require('../models/MedicalSpecialty');

// @route   GET /api/medical-specialties
// @desc    Get all medical specialties
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { activeOnly = 'true' } = req.query;
    const query = activeOnly === 'true' ? { isActive: true } : {};
    
    const specialties = await MedicalSpecialty.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email');
    
    res.json({
      success: true,
      data: specialties,
      count: specialties.length
    });
  } catch (error) {
    console.error('Error fetching medical specialties:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Fachrichtungen'
    });
  }
});

// @route   GET /api/medical-specialties/:id
// @desc    Get single medical specialty
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const specialty = await MedicalSpecialty.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email');
    
    if (!specialty) {
      return res.status(404).json({
        success: false,
        message: 'Fachrichtung nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: specialty
    });
  } catch (error) {
    console.error('Error fetching medical specialty:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Fachrichtung'
    });
  }
});

// @route   POST /api/medical-specialties
// @desc    Create new medical specialty
// @access  Private (Admin)
router.post('/', auth, [
  body('code').trim().notEmpty().withMessage('Code ist erforderlich'),
  body('name').trim().notEmpty().withMessage('Name ist erforderlich'),
  body('code').custom(async (value) => {
    if (value) {
      const existing = await MedicalSpecialty.findOne({ code: value.toLowerCase().trim() });
      if (existing) {
        throw new Error('Code existiert bereits');
      }
    }
  }),
  body('name').custom(async (value) => {
    if (value) {
      const existing = await MedicalSpecialty.findOne({ name: value.trim() });
      if (existing) {
        throw new Error('Name existiert bereits');
      }
    }
  })
], async (req, res) => {
  try {
    // Prüfe ob Admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Fachrichtungen erstellen'
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
    
    const { code, name, description, isActive = true, sortOrder = 0, category = 'sonstiges' } = req.body;
    
    const specialty = new MedicalSpecialty({
      code: code.toLowerCase().trim(),
      name: name.trim(),
      description: description?.trim() || '',
      isActive,
      sortOrder: parseInt(sortOrder) || 0,
      category,
      createdBy: req.user.id,
      lastModifiedBy: req.user.id
    });
    
    await specialty.save();
    
    const populated = await MedicalSpecialty.findById(specialty._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email');
    
    res.status(201).json({
      success: true,
      message: 'Fachrichtung erfolgreich erstellt',
      data: populated
    });
  } catch (error) {
    console.error('Error creating medical specialty:', error);
    
    // MongoDB Duplikat-Fehler abfangen
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'code' ? 'Code' : 'Name';
      return res.status(400).json({
        success: false,
        message: `${fieldName} existiert bereits`
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Erstellen der Fachrichtung'
    });
  }
});

// @route   PUT /api/medical-specialties/:id
// @desc    Update medical specialty
// @access  Private (Admin)
router.put('/:id', auth, [
  body('code').optional().trim().notEmpty().withMessage('Code darf nicht leer sein'),
  body('name').optional().trim().notEmpty().withMessage('Name darf nicht leer sein'),
  body('code').optional().custom(async (value, { req }) => {
    if (value) {
      const existing = await MedicalSpecialty.findOne({ 
        code: value.toLowerCase().trim(),
        _id: { $ne: req.params.id }
      });
      if (existing) {
        throw new Error('Code existiert bereits');
      }
    }
  }),
  body('name').optional().custom(async (value, { req }) => {
    if (value) {
      const existing = await MedicalSpecialty.findOne({ 
        name: value.trim(),
        _id: { $ne: req.params.id }
      });
      if (existing) {
        throw new Error('Name existiert bereits');
      }
    }
  })
], async (req, res) => {
  try {
    // Prüfe ob Admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Fachrichtungen bearbeiten'
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
    
    const { code, name, description, isActive, sortOrder, category } = req.body;
    
    const updateData = {
      lastModifiedBy: req.user.id
    };
    
    if (code !== undefined) updateData.code = code.toLowerCase().trim();
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder) || 0;
    if (category !== undefined) updateData.category = category;
    
    const specialty = await MedicalSpecialty.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email');
    
    if (!specialty) {
      return res.status(404).json({
        success: false,
        message: 'Fachrichtung nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      message: 'Fachrichtung erfolgreich aktualisiert',
      data: specialty
    });
  } catch (error) {
    console.error('Error updating medical specialty:', error);
    
    // MongoDB Duplikat-Fehler abfangen
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'code' ? 'Code' : 'Name';
      return res.status(400).json({
        success: false,
        message: `${fieldName} existiert bereits`
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Aktualisieren der Fachrichtung'
    });
  }
});

// @route   DELETE /api/medical-specialties/:id
// @desc    Delete medical specialty
// @access  Private (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Prüfe ob Admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Fachrichtungen löschen'
      });
    }
    
    const specialty = await MedicalSpecialty.findByIdAndDelete(req.params.id);
    
    if (!specialty) {
      return res.status(404).json({
        success: false,
        message: 'Fachrichtung nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      message: 'Fachrichtung erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting medical specialty:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Fachrichtung'
    });
  }
});

module.exports = router;

