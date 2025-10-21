const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const ServiceCatalog = require('../models/ServiceCatalog');
const ServiceCategory = require('../models/ServiceCategory');
const Location = require('../models/Location');
const AuditLog = require('../models/AuditLog');

// GET /api/service-catalog/favorites - Favoriten (Schnellauswahl) abrufen
router.get('/favorites', auth, checkPermission('services.read'), async (req, res) => {
  try {
    const { location_id } = req.query;
    
    const filter = {
      quick_select: true,
      is_active: true
    };
    
    if (location_id) filter.location_id = location_id;
    
    const favorites = await ServiceCatalog.find(filter)
      .populate('location_id', 'name code')
      .populate('createdBy', 'firstName lastName email')
      .sort({ name: 1 })
      .lean();
    
    res.json({
      success: true,
      data: favorites,
      count: favorites.length
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Favoriten'
    });
  }
});

// GET /api/service-catalog - Alle Services abrufen
router.get('/', auth, checkPermission('services.read'), async (req, res) => {
  try {
    const {
      location_id,
      category,
      role,
      online_bookable,
      is_active,
      search,
      page = 1,
      limit = 50
    } = req.query;

    // Filter aufbauen
    const filter = {};
    
    if (location_id) filter.location_id = location_id;
    if (category) filter.category = category;
    if (role) filter.required_role = role;
    if (online_bookable !== undefined) filter.online_bookable = online_bookable === 'true';
    if (is_active !== undefined) filter.is_active = is_active === 'true';
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const services = await ServiceCatalog.find(filter)
      .populate('location_id', 'name code')
      .populate('createdBy', 'firstName lastName')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ServiceCatalog.countDocuments(filter);

    res.json({
      success: true,
      data: services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Leistungen'
    });
  }
});

// GET /api/service-catalog/:id - Einzelnen Service abrufen
router.get('/:id', auth, checkPermission('services.read'), async (req, res) => {
  try {
    const service = await ServiceCatalog.findById(req.params.id)
      .populate('location_id', 'name code address_line1 city')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Leistung'
    });
  }
});

// POST /api/service-catalog - Neuen Service erstellen
router.post('/', [
  auth,
  checkPermission('services.write'),
  body('code').notEmpty().withMessage('Code ist erforderlich'),
  body('name').notEmpty().withMessage('Name ist erforderlich'),
  body('base_duration_min').isInt({ min: 1 }).withMessage('Grunddauer muss mindestens 1 Minute sein'),
  body('location_id').isMongoId().withMessage('Ungültige Standort-ID'),
  body('required_role').optional().isIn(['arzt', 'therapeut', 'assistenz', 'schwester', 'rezeption']),
  body('visible_to_roles').optional().isArray(),
  body('online_bookable').optional().isBoolean(),
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
    const existingService = await ServiceCatalog.findOne({ 
      code: req.body.code,
      location_id: req.body.location_id 
    });
    
    if (existingService) {
      return res.status(400).json({
        success: false,
        message: 'Code bereits für diesen Standort vorhanden'
      });
    }

    // Standort prüfen
    const location = await Location.findById(req.body.location_id);
    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    const serviceData = {
      ...req.body,
      createdBy: req.user.id
    };

    const service = new ServiceCatalog(serviceData);
    await service.save();

    // Audit Log
    await AuditLog.create({
      action: 'service-catalog.create',
      resource: 'ServiceCatalog',
      resourceId: service._id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      description: `Service "${service.name}" (${service.code}) wurde erstellt`,
      details: {
        service_name: service.name,
        service_code: service.code,
        location_id: service.location_id
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Leistung erfolgreich erstellt',
      data: service
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Leistung',
      error: error.message
    });
  }
});

// PUT /api/service-catalog/:id - Service aktualisieren
router.put('/:id', [
  auth,
  checkPermission('services.write'),
  body('name').optional().notEmpty().withMessage('Name darf nicht leer sein'),
  body('base_duration_min').optional().isInt({ min: 1 }).withMessage('Grunddauer muss mindestens 1 Minute sein'),
  body('required_role').optional().isIn(['arzt', 'therapeut', 'assistenz', 'schwester', 'rezeption', null]),
  body('visible_to_roles').optional().isArray(),
  body('online_bookable').optional().isBoolean(),
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

    const service = await ServiceCatalog.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }

    // Code-Änderung prüfen
    if (req.body.code && req.body.code !== service.code) {
      const existingService = await ServiceCatalog.findOne({ 
        code: req.body.code,
        location_id: service.location_id,
        _id: { $ne: service._id }
      });
      
      if (existingService) {
        return res.status(400).json({
          success: false,
          message: 'Code bereits für diesen Standort vorhanden'
        });
      }
    }

    const updateData = {
      ...req.body,
      updatedBy: req.user.id,
      version: service.version + 1
    };

    // Entferne leere location_id
    if (updateData.location_id === '') {
      delete updateData.location_id;
    }

    // Entferne leere required_role
    if (updateData.required_role === '') {
      delete updateData.required_role;
    }

    const updatedService = await ServiceCatalog.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Audit Log
    await AuditLog.create({
      action: 'service-catalog.update',
      resource: 'ServiceCatalog',
      resourceId: service._id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      description: `Service "${updatedService.name}" (${updatedService.code}) wurde aktualisiert`,
      details: {
        service_name: updatedService.name,
        service_code: updatedService.code,
        changes: req.body
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Leistung erfolgreich aktualisiert',
      data: updatedService
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Leistung',
      error: error.message
    });
  }
});

// DELETE /api/service-catalog/:id - Service löschen
router.delete('/:id', auth, checkPermission('services.delete'), async (req, res) => {
  try {
    const service = await ServiceCatalog.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }

    // Prüfen ob Service bereits verwendet wird
    const ServiceBooking = require('../models/ServiceBooking');
    const existingBookings = await ServiceBooking.countDocuments({ 
      service_id: service._id,
      status: { $in: ['scheduled', 'confirmed', 'in_progress'] }
    });

    if (existingBookings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Leistung kann nicht gelöscht werden, da sie bereits gebucht wurde'
      });
    }

    await ServiceCatalog.findByIdAndDelete(req.params.id);

    // Audit Log
    await AuditLog.create({
      action: 'service-catalog.delete',
      resource: 'ServiceCatalog',
      resourceId: service._id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      description: `Service "${service.name}" (${service.code}) wurde gelöscht`,
      details: {
        service_name: service.name,
        service_code: service.code
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Leistung erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Leistung',
      error: error.message
    });
  }
});

// GET /api/service-catalog/categories - Kategorien abrufen
router.get('/categories/tree', auth, checkPermission('services.read'), async (req, res) => {
  try {
    const categories = await ServiceCategory.getTree();
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

module.exports = router;