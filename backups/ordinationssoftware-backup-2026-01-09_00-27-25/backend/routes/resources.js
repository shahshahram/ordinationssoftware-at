const express = require('express');
const { body, validationResult } = require('express-validator');
const Resource = require('../models/Resource');
const auth = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/resources
// @desc    Get all resources
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, category, onlineBookable, search } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (onlineBookable === 'true') filter['onlineBooking.enabled'] = true;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const resources = await Resource.find(filter)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Resource.countDocuments(filter);

    res.json({
      success: true,
      data: resources,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Ressourcen'
    });
  }
});

// @route   GET /api/resources/online-bookable
// @desc    Get online bookable resources
// @access  Public (for online booking)
router.get('/online-bookable', async (req, res) => {
  try {
    const { type, category } = req.query;
    
    const filter = {
      'onlineBooking.enabled': true,
      isActive: true,
      isAvailable: true
    };
    
    if (type) filter.type = type;
    if (category) filter.category = category;

    const resources = await Resource.find(filter)
      .select('name type category description onlineBooking properties')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der online buchbaren Ressourcen'
    });
  }
});

// @route   GET /api/resources/:id
// @desc    Get single resource
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Ressource nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Ressource'
    });
  }
});

// @route   POST /api/resources
// @desc    Create new resource
// @access  Private
router.post('/', auth, [
  body('name').notEmpty().trim(),
  body('type').isIn(['room', 'equipment', 'service', 'personnel']),
  body('category').notEmpty().trim()
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

    const resourceData = {
      ...req.body,
      createdBy: req.user.id
    };

    const resource = new Resource(resourceData);
    await resource.save();

    res.status(201).json({
      success: true,
      message: 'Ressource erfolgreich erstellt',
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Ressource'
    });
  }
});

// @route   PUT /api/resources/:id
// @desc    Update resource
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastModifiedBy: req.user.id },
      { new: true, runValidators: true }
    );

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Ressource nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Ressource erfolgreich aktualisiert',
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Ressource'
    });
  }
});

// @route   DELETE /api/resources/:id
// @desc    Delete resource
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Ressource nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Ressource erfolgreich gelöscht'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Ressource'
    });
  }
});

// @route   PUT /api/resources/:id/toggle-online-booking
// @desc    Toggle online booking for resource
// @access  Private
router.put('/:id/toggle-online-booking', auth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Ressource nicht gefunden'
      });
    }

    resource.onlineBooking.enabled = !resource.onlineBooking.enabled;
    resource.lastModifiedBy = req.user.id;
    await resource.save();

    res.json({
      success: true,
      message: `Online-Buchung ${resource.onlineBooking.enabled ? 'aktiviert' : 'deaktiviert'}`,
      data: { onlineBookingEnabled: resource.onlineBooking.enabled }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ändern der Online-Buchbarkeit'
    });
  }
});

// @route   GET /api/resources/:id/availability
// @desc    Get availability for a resource
// @access  Public (for online booking)
router.get('/:id/availability', async (req, res) => {
  try {
    const { date, duration = 30 } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Datum ist erforderlich'
      });
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Ressource nicht gefunden'
      });
    }

    if (!resource.onlineBooking.enabled) {
      return res.json({
        success: true,
        data: {
          available: false,
          message: 'Diese Ressource ist nicht online buchbar'
        }
      });
    }

    const requestedDate = new Date(date);
    const timeSlots = resource.getAvailableTimeSlots(requestedDate, parseInt(duration));

    res.json({
      success: true,
      data: {
        available: timeSlots.length > 0,
        timeSlots,
        resource: {
          name: resource.name,
          type: resource.type,
          duration: resource.onlineBooking.duration
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Verfügbarkeit'
    });
  }
});

// @route   GET /api/resources/statistics
// @desc    Get resource statistics
// @access  Private
router.get('/statistics', auth, async (req, res) => {
  try {
    const totalResources = await Resource.countDocuments();
    const onlineBookableResources = await Resource.countDocuments({ 'onlineBooking.enabled': true });
    const activeResources = await Resource.countDocuments({ isActive: true });
    
    const typeStats = await Resource.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          onlineBookable: {
            $sum: { $cond: ['$onlineBooking.enabled', 1, 0] }
          }
        }
      }
    ]);

    const categoryStats = await Resource.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          onlineBookable: {
            $sum: { $cond: ['$onlineBooking.enabled', 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalResources,
          onlineBookableResources,
          activeResources,
          inactiveResources: totalResources - activeResources
        },
        byType: typeStats,
        byCategory: categoryStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken'
    });
  }
});

module.exports = router;