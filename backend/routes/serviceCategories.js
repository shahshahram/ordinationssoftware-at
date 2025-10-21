const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const ServiceCategory = require('../models/ServiceCategory');
const AuditLog = require('../models/AuditLog');

// GET /api/service-categories - Alle Kategorien abrufen
router.get('/', auth, checkPermission('services.read'), async (req, res) => {
  try {
    const { tree = false } = req.query;
    
    let categories;
    if (tree === 'true') {
      categories = await ServiceCategory.getTree();
    } else {
      categories = await ServiceCategory.find({ is_active: true })
        .populate('parent_category_id', 'name code')
        .sort({ level: 1, sort_order: 1, name: 1 });
    }

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Kategorien'
    });
  }
});

// GET /api/service-categories/:id - Einzelne Kategorie abrufen
router.get('/:id', auth, checkPermission('services.read'), async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id)
      .populate('parent_category_id', 'name code')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategorie nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Kategorie'
    });
  }
});

// POST /api/service-categories - Neue Kategorie erstellen
router.post('/', [
  auth,
  checkPermission('services.write'),
  body('name').notEmpty().withMessage('Name ist erforderlich'),
  body('code').notEmpty().withMessage('Code ist erforderlich'),
  body('parent_category_id').optional().isMongoId().withMessage('Ungültige Parent-Kategorie-ID'),
  body('color_hex').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Ungültige Farbkodierung'),
  body('visible_to_roles').optional().isArray(),
  body('is_active').optional().isBoolean()
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

    // Prüfen ob Code bereits existiert
    const existingCategory = await ServiceCategory.findOne({ 
      code: req.body.code 
    });
    
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Code bereits vorhanden'
      });
    }

    // Parent-Kategorie prüfen
    if (req.body.parent_category_id) {
      const parentCategory = await ServiceCategory.findById(req.body.parent_category_id);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent-Kategorie nicht gefunden'
        });
      }
    }

    const categoryData = {
      ...req.body,
      createdBy: req.user.id
    };

    const category = new ServiceCategory(categoryData);
    await category.save();

    // Audit Log
    await AuditLog.create({
      action: 'service-categories.create',
      resource: 'ServiceCategory',
      resourceId: category._id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      description: `Service-Kategorie "${category.name}" erstellt`,
      details: {
        category_name: category.name,
        category_code: category.code,
        parent_category_id: category.parent_category_id
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Kategorie erfolgreich erstellt',
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Kategorie',
      error: error.message
    });
  }
});

// PUT /api/service-categories/:id - Kategorie aktualisieren
router.put('/:id', [
  auth,
  checkPermission('services.write'),
  body('name').optional().notEmpty().withMessage('Name darf nicht leer sein'),
  body('code').optional().notEmpty().withMessage('Code darf nicht leer sein'),
  body('parent_category_id').optional().isMongoId().withMessage('Ungültige Parent-Kategorie-ID'),
  body('color_hex').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Ungültige Farbkodierung'),
  body('visible_to_roles').optional().isArray(),
  body('is_active').optional().isBoolean()
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

    const category = await ServiceCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategorie nicht gefunden'
      });
    }

    // Code-Änderung prüfen
    if (req.body.code && req.body.code !== category.code) {
      const existingCategory = await ServiceCategory.findOne({ 
        code: req.body.code,
        _id: { $ne: category._id }
      });
      
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Code bereits vorhanden'
        });
      }
    }

    // Parent-Kategorie prüfen (keine zirkuläre Referenz)
    if (req.body.parent_category_id) {
      if (req.body.parent_category_id === req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Kategorie kann nicht sich selbst als Parent haben'
        });
      }

      const parentCategory = await ServiceCategory.findById(req.body.parent_category_id);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent-Kategorie nicht gefunden'
        });
      }
    }

    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    const updatedCategory = await ServiceCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Audit Log
    await AuditLog.create({
      action: 'service-categories.update',
      resource: 'ServiceCategory',
      resourceId: category._id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      description: `Service-Kategorie "${updatedCategory.name}" aktualisiert`,
      details: {
        category_name: updatedCategory.name,
        category_code: updatedCategory.code,
        changes: req.body
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Kategorie erfolgreich aktualisiert',
      data: updatedCategory
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Kategorie',
      error: error.message
    });
  }
});

// DELETE /api/service-categories/:id - Kategorie löschen
router.delete('/:id', auth, checkPermission('services.delete'), async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategorie nicht gefunden'
      });
    }

    // Prüfen ob Kategorie verwendet wird
    const ServiceCatalog = require('../models/ServiceCatalog');
    const servicesUsingCategory = await ServiceCatalog.countDocuments({ 
      category: category.name 
    });

    if (servicesUsingCategory > 0) {
      return res.status(400).json({
        success: false,
        message: 'Kategorie kann nicht gelöscht werden, da sie noch von Leistungen verwendet wird'
      });
    }

    // Prüfen ob Unterkategorien existieren
    const subcategories = await ServiceCategory.countDocuments({ 
      parent_category_id: category._id 
    });

    if (subcategories > 0) {
      return res.status(400).json({
        success: false,
        message: 'Kategorie kann nicht gelöscht werden, da sie noch Unterkategorien hat'
      });
    }

    await ServiceCategory.findByIdAndDelete(req.params.id);

    // Audit Log
    await AuditLog.create({
      action: 'service-categories.delete',
      resource: 'ServiceCategory',
      resourceId: category._id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      description: `Service-Kategorie "${category.name}" gelöscht`,
      details: {
        category_name: category.name,
        category_code: category.code
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Kategorie erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Kategorie',
      error: error.message
    });
  }
});

// GET /api/service-categories/:id/ancestors - Vorfahren einer Kategorie
router.get('/:id/ancestors', auth, checkPermission('services.read'), async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategorie nicht gefunden'
      });
    }

    const ancestors = await category.getAncestors();

    res.json({
      success: true,
      data: ancestors
    });
  } catch (error) {
    console.error('Error fetching ancestors:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Vorfahren',
      error: error.message
    });
  }
});

// GET /api/service-categories/:id/descendants - Nachkommen einer Kategorie
router.get('/:id/descendants', auth, checkPermission('services.read'), async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategorie nicht gefunden'
      });
    }

    const descendants = await category.getDescendants();

    res.json({
      success: true,
      data: descendants
    });
  } catch (error) {
    console.error('Error fetching descendants:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Nachkommen',
      error: error.message
    });
  }
});

module.exports = router;
