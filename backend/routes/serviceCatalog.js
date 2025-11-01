const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const ServiceCatalog = require('../models/ServiceCatalog');
const ServiceCategory = require('../models/ServiceCategory');
const Location = require('../models/Location');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Device = require('../models/Device');
const Room = require('../models/Room');

// GET /api/service-catalog/appointment-types - Termintypen für Terminverwaltung abrufen
router.get('/appointment-types', auth, async (req, res) => {
  try {
    console.log('=== APPOINTMENT TYPES ROUTE CALLED ===');
    
    const services = await ServiceCatalog.find({ is_active: true })
      .select('code name description base_duration_min color_hex category')
      .sort({ name: 1 })
      .lean();
    
    console.log('Found services:', services.length);
    
    // Transformiere für Terminverwaltung
    const appointmentTypes = services.map(service => ({
      value: service.code,
      label: service.name,
      description: service.description,
      duration: service.base_duration_min,
      color: service.color_hex,
      category: service.category
    }));
    
    console.log('Transformed appointment types:', appointmentTypes.length);
    
    res.json({
      success: true,
      data: appointmentTypes
    });
  } catch (error) {
    console.error('=== ERROR IN APPOINTMENT TYPES ROUTE ===');
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Termintypen',
      error: error.message
    });
  }
});

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
      .populate('assigned_users', 'firstName lastName email role')
      .populate({
        path: 'assigned_devices',
        select: 'name type status location_id',
        populate: {
          path: 'location_id',
          select: 'name code'
        }
      })
      .populate({
        path: 'assigned_rooms',
        select: 'name number capacity type location_id',
        populate: {
          path: 'location_id',
          select: 'name code'
        }
      })
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
      specialty,
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
    if (specialty) filter.specialty = specialty;
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
    
    // First, get the raw services to save assigned_rooms and assigned_devices IDs before populate
    const rawServices = await ServiceCatalog.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Use lean() to get plain objects
    
    // Store the IDs before populate removes them
    const roomIdMap = new Map();
    const deviceIdMap = new Map();
    
    rawServices.forEach(service => {
      roomIdMap.set(service._id.toString(), service.assigned_rooms || []);
      deviceIdMap.set(service._id.toString(), service.assigned_devices || []);
    });

    const services = await ServiceCatalog.find(filter)
      .populate('location_id', 'name code')
      .populate('createdBy', 'firstName lastName')
      .populate('assigned_users', 'firstName lastName email role')
      .populate({
        path: 'assigned_devices',
        select: 'name type status location_id',
        populate: {
          path: 'location_id',
          select: 'name code'
        }
      })
      .populate({
        path: 'assigned_rooms',
        select: 'name number capacity type location_id',
        populate: {
          path: 'location_id',
          select: 'name code'
        }
      })
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ServiceCatalog.countDocuments(filter);

    // Load Resource model for checking room/device IDs
    const Resource = require('../models/Resource');
    const Device = require('../models/Device');
    const Room = require('../models/Room');
    
    // Transform assigned_devices and assigned_rooms to use location instead of location_id
    const transformedServices = await Promise.all(services.map(async (service) => {
      const serviceObj = service.toObject();
      
      // Get raw assigned_rooms IDs from the saved map before populate
      const assignedRoomIds = roomIdMap.get(serviceObj._id.toString()) || [];
      const assignedDeviceIds = deviceIdMap.get(serviceObj._id.toString()) || [];
      
      // Handle assigned_devices - check each ID in both Device and Resource
      if (assignedDeviceIds && assignedDeviceIds.length > 0) {
        const enrichedDevices = await Promise.all(assignedDeviceIds.map(async (deviceId) => {
          
          // First, try to find in Device model
          const deviceDoc = await Device.findById(deviceId);
          if (deviceDoc) {
            return {
              _id: deviceDoc._id,
              name: deviceDoc.name,
              type: deviceDoc.type || 'other',
              status: deviceDoc.status || 'available',
              description: deviceDoc.description,
              location: deviceDoc.location_id ? {
                _id: deviceDoc.location_id._id || deviceDoc.location_id,
                name: deviceDoc.location_id.name || '',
                code: deviceDoc.location_id.code || ''
              } : undefined
            };
          }
          
          // Try to find in Resource model
          const resourceDevice = await Resource.findById(deviceId);
          if (resourceDevice && resourceDevice.type === 'equipment') {
            return {
              _id: resourceDevice._id,
              name: resourceDevice.name,
              type: resourceDevice.properties?.deviceType || 'other',
              status: resourceDevice.properties?.status || 'available',
              description: resourceDevice.description,
              location: resourceDevice.properties?.location ? {
                _id: resourceDevice.properties.locationId || '',
                name: resourceDevice.properties.location || '',
                code: ''
              } : undefined
            };
          }
          
          return null;
        }));
        
        serviceObj.assigned_devices = enrichedDevices.filter(d => d !== null);
      }
      
      // Handle assigned_rooms - check each ID in both Room and Resource
      if (assignedRoomIds && assignedRoomIds.length > 0) {
        const enrichedRooms = await Promise.all(assignedRoomIds.map(async (roomId) => {
          
          // First, try to find in Room model
          const roomDoc = await Room.findById(roomId);
          if (roomDoc) {
            const transformedRoom = {
              _id: roomDoc._id,
              name: roomDoc.name,
              number: roomDoc.number || '',
              capacity: roomDoc.capacity || 1,
              type: roomDoc.type || 'other',
              location: roomDoc.location_id ? {
                _id: roomDoc.location_id._id || roomDoc.location_id,
                name: roomDoc.location_id.name || '',
                code: roomDoc.location_id.code || ''
              } : undefined
            };
            console.log('Found room in Room model:', transformedRoom);
            return transformedRoom;
          }
          
          // Try to find in Resource model
          const resourceRoom = await Resource.findById(roomId);
          if (resourceRoom && resourceRoom.type === 'room') {
            const transformedRoom = {
              _id: resourceRoom._id,
              name: resourceRoom.name,
              number: resourceRoom.properties?.roomNumber || '',
              capacity: resourceRoom.properties?.capacity || 1,
              type: 'other',
              location: resourceRoom.properties?.location ? {
                _id: resourceRoom.properties.locationId || '',
                name: resourceRoom.properties.location || '',
                code: ''
              } : undefined
            };
            console.log('Found room in Resource model:', transformedRoom);
            return transformedRoom;
          }
          
          console.log('Could not find room with ID:', roomId);
          return null;
        }));
        
        serviceObj.assigned_rooms = enrichedRooms.filter(r => r !== null);
      }
      
      return serviceObj;
    }));

    res.json({
      success: true,
      data: transformedServices,
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
      .populate('updatedBy', 'firstName lastName')
      .populate('assigned_users', 'firstName lastName email role')
      .populate({
        path: 'assigned_devices',
        select: 'name type status location_id',
        populate: {
          path: 'location_id',
          select: 'name code'
        }
      })
      .populate({
        path: 'assigned_rooms',
        select: 'name number capacity type location_id',
        populate: {
          path: 'location_id',
          select: 'name code'
        }
      });

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

// GET /api/service-catalog/:id/users - Benutzer für einen Service abrufen
router.get('/:id/users', auth, checkPermission('services.read'), async (req, res) => {
  try {
    const service = await ServiceCatalog.findById(req.params.id)
      .populate('assigned_users', 'firstName lastName email role')
      .select('assigned_users requires_user_selection');
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: {
        assigned_users: service.assigned_users,
        requires_user_selection: service.requires_user_selection
      }
    });
  } catch (error) {
    console.error('Error fetching service users:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Service-Benutzer',
      error: error.message
    });
  }
});

// PUT /api/service-catalog/:id/users - Benutzer für einen Service aktualisieren
router.put('/:id/users', [
  auth,
  checkPermission('services.write'),
  body('assigned_users').optional().isArray(),
  body('requires_user_selection').optional().isBoolean()
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

    // Benutzer-IDs validieren
    if (req.body.assigned_users) {
      const validUsers = await User.find({ 
        _id: { $in: req.body.assigned_users } 
      }).select('_id');
      
      const validUserIds = validUsers.map(user => user._id.toString());
      const invalidIds = req.body.assigned_users.filter(id => !validUserIds.includes(id.toString()));
      
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ungültige Benutzer-IDs gefunden',
          invalid_ids: invalidIds
        });
      }
    }

    // Service aktualisieren
    const updateData = {};
    if (req.body.assigned_users !== undefined) {
      updateData.assigned_users = req.body.assigned_users;
    }
    if (req.body.requires_user_selection !== undefined) {
      updateData.requires_user_selection = req.body.requires_user_selection;
    }
    updateData.updatedBy = req.user.id;

    const updatedService = await ServiceCatalog.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('assigned_users', 'firstName lastName email role');

    // Audit Log
    await AuditLog.create({
      action: 'service-catalog.update-users',
      resource: 'ServiceCatalog',
      resourceId: service._id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      description: `Benutzer-Zuordnung für Service "${service.name}" wurde aktualisiert`,
      details: {
        service_name: service.name,
        service_code: service.code,
        assigned_users_count: req.body.assigned_users?.length || 0,
        requires_user_selection: req.body.requires_user_selection
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Service-Benutzer erfolgreich aktualisiert',
      data: {
        assigned_users: updatedService.assigned_users,
        requires_user_selection: updatedService.requires_user_selection
      }
    });
  } catch (error) {
    console.error('Error updating service users:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Service-Benutzer',
      error: error.message
    });
  }
});

// GET /api/service-catalog/:id/available-users - Verfügbare Benutzer für einen Service abrufen
router.get('/:id/available-users', auth, checkPermission('services.read'), async (req, res) => {
  try {
    const service = await ServiceCatalog.findById(req.params.id)
      .select('assigned_users required_role visible_to_roles');
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }

    // Benutzer basierend auf Service-Anforderungen filtern
    let userQuery = { isActive: true };
    
    if (service.required_role) {
      userQuery.role = service.required_role;
    }
    
    if (service.visible_to_roles && service.visible_to_roles.length > 0) {
      userQuery.role = { $in: service.visible_to_roles };
    }

    const availableUsers = await User.find(userQuery)
      .select('firstName lastName email role')
      .sort({ firstName: 1, lastName: 1 });

    res.json({
      success: true,
      data: availableUsers
    });
  } catch (error) {
    console.error('Error fetching available users:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der verfügbaren Benutzer',
      error: error.message
    });
  }
});

// PUT /api/service-catalog/:id/devices - Geräte für einen Service zuweisen
router.put('/:id/devices', [
  auth,
  checkPermission('services.update'),
  body('assigned_devices').isArray().withMessage('assigned_devices muss ein Array sein'),
  body('requires_device_selection').isBoolean().withMessage('requires_device_selection muss ein Boolean sein'),
  body('device_quantity_required').optional().isInt({ min: 1 }).withMessage('device_quantity_required muss eine positive Zahl sein')
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

    const { assigned_devices, requires_device_selection, device_quantity_required } = req.body;

    // Prüfe ob Service existiert
    const service = await ServiceCatalog.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }

    // Prüfe ob alle Geräte existieren (sowohl im Device-Modell als auch im Resource-Modell)
    if (assigned_devices && assigned_devices.length > 0) {
      const existingDevices = await Device.find({ _id: { $in: assigned_devices } });
      const existingDeviceIds = existingDevices.map(device => device._id.toString());
      
      // Check for devices from Resource management
      const Resource = require('../models/Resource');
      const resourceDevices = await Resource.find({ 
        _id: { $in: assigned_devices },
        type: 'equipment'
      });
      const resourceDeviceIds = resourceDevices.map(device => device._id.toString());
      
      // Combine both sets of valid device IDs
      const allValidDeviceIds = [...existingDeviceIds, ...resourceDeviceIds];
      const uniqueValidDeviceIds = [...new Set(allValidDeviceIds)];
      
      if (uniqueValidDeviceIds.length !== assigned_devices.length) {
        return res.status(400).json({
          success: false,
          message: 'Ein oder mehrere Geräte existieren nicht'
        });
      }
    }

    // Aktualisiere Service
    const updatedService = await ServiceCatalog.findByIdAndUpdate(
      req.params.id,
      {
        assigned_devices,
        requires_device_selection,
        device_quantity_required: device_quantity_required || 1,
        updatedBy: req.user.id
      },
      { new: true, runValidators: true }
    ).populate('assigned_devices', 'name type status location');

    // Audit Log
    await AuditLog.create({
      action: 'service-catalog.update-devices',
      resource: 'ServiceCatalog',
      resourceId: req.params.id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      description: `Geräte-Zuordnung für Service "${service.name}" wurde aktualisiert`,
      details: {
        assigned_devices,
        requires_device_selection,
        device_quantity_required
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Service-Geräte erfolgreich aktualisiert',
      data: {
        assigned_devices: updatedService.assigned_devices,
        requires_device_selection: updatedService.requires_device_selection,
        device_quantity_required: updatedService.device_quantity_required
      }
    });
  } catch (error) {
    console.error('Error updating service devices:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Service-Geräte',
      error: error.message
    });
  }
});

// PUT /api/service-catalog/:id/rooms - Räume für einen Service zuweisen
router.put('/:id/rooms', [
  auth,
  checkPermission('services.update'),
  body('assigned_rooms').isArray().withMessage('assigned_rooms muss ein Array sein'),
  body('requires_room_selection').isBoolean().withMessage('requires_room_selection muss ein Boolean sein'),
  body('room_quantity_required').optional().isInt({ min: 1 }).withMessage('room_quantity_required muss eine positive Zahl sein')
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

    const { assigned_rooms, requires_room_selection, room_quantity_required } = req.body;

    // Prüfe ob Service existiert
    const service = await ServiceCatalog.findById(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }

    // Prüfe ob alle Räume existieren (sowohl im Room-Modell als auch im Resource-Modell)
    if (assigned_rooms && assigned_rooms.length > 0) {
      const existingRooms = await Room.find({ _id: { $in: assigned_rooms } });
      const existingRoomIds = existingRooms.map(room => room._id.toString());
      
      // Check for rooms from Resource management
      const Resource = require('../models/Resource');
      const resourceRooms = await Resource.find({ 
        _id: { $in: assigned_rooms },
        type: 'room'
      });
      const resourceRoomIds = resourceRooms.map(room => room._id.toString());
      
      // Combine both sets of valid room IDs
      const allValidRoomIds = [...existingRoomIds, ...resourceRoomIds];
      const uniqueValidRoomIds = [...new Set(allValidRoomIds)];
      
      if (uniqueValidRoomIds.length !== assigned_rooms.length) {
        return res.status(400).json({
          success: false,
          message: 'Ein oder mehrere Räume existieren nicht'
        });
      }
    }

    // Aktualisiere Service
    const updatedService = await ServiceCatalog.findByIdAndUpdate(
      req.params.id,
      {
        assigned_rooms,
        requires_room_selection,
        room_quantity_required: room_quantity_required || 1,
        updatedBy: req.user.id
      },
      { new: true, runValidators: true }
    ).populate('assigned_rooms', 'name number capacity location');

    // Audit Log
    await AuditLog.create({
      action: 'service-catalog.update-rooms',
      resource: 'ServiceCatalog',
      resourceId: req.params.id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      description: `Raum-Zuordnung für Service "${service.name}" wurde aktualisiert`,
      details: {
        assigned_rooms,
        requires_room_selection,
        room_quantity_required
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Service-Räume erfolgreich aktualisiert',
      data: {
        assigned_rooms: updatedService.assigned_rooms,
        requires_room_selection: updatedService.requires_room_selection,
        room_quantity_required: updatedService.room_quantity_required
      }
    });
  } catch (error) {
    console.error('Error updating service rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Service-Räume',
      error: error.message
    });
  }
});

// GET /api/service-catalog/:id/available-devices - Verfügbare Geräte für einen Service abrufen
router.get('/:id/available-devices', auth, checkPermission('services.read'), async (req, res) => {
  try {
    const service = await ServiceCatalog.findById(req.params.id)
      .select('assigned_devices required_device_type');
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }

    // Geräte basierend auf Service-Anforderungen filtern
    let deviceQuery = { isActive: true };
    
    if (service.required_device_type) {
      deviceQuery.type = service.required_device_type;
    }

    const availableDevices = await Device.find(deviceQuery)
      .select('name type status location')
      .populate('location', 'name')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: availableDevices
    });
  } catch (error) {
    console.error('Error fetching available devices:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der verfügbaren Geräte',
      error: error.message
    });
  }
});

// GET /api/service-catalog/:id/available-rooms - Verfügbare Räume für einen Service abrufen
router.get('/:id/available-rooms', auth, checkPermission('services.read'), async (req, res) => {
  try {
    const service = await ServiceCatalog.findById(req.params.id)
      .select('assigned_rooms requires_room');
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }

    // Räume basierend auf Service-Anforderungen filtern
    let roomQuery = { isActive: true };
    
    if (service.requires_room) {
      // Nur Räume die für Behandlungen geeignet sind
      roomQuery.type = { $in: ['treatment', 'examination', 'consultation'] };
    }

    const availableRooms = await Room.find(roomQuery)
      .select('name number capacity type location')
      .populate('location', 'name')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: availableRooms
    });
  } catch (error) {
    console.error('Error fetching available rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der verfügbaren Räume',
      error: error.message
    });
  }
});

module.exports = router;