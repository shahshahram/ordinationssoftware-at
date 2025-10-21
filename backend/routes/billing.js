const express = require('express');
const { body, validationResult } = require('express-validator');
const Invoice = require('../models/Invoice');
const ServiceCatalog = require('../models/ServiceCatalog');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/billing/invoices
// @desc    Get all invoices
// @access  Private
router.get('/invoices', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, billingType, startDate, endDate } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (billingType) filter.billingType = billingType;
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(filter)
      .populate('patient.id', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ invoiceDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Invoice.countDocuments(filter);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Rechnungen'
    });
  }
});

// @route   GET /api/billing/invoices/:id
// @desc    Get single invoice
// @access  Private
router.get('/invoices/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('patient.id')
      .populate('createdBy', 'firstName lastName');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Rechnung'
    });
  }
});

// @route   POST /api/billing/invoices
// @desc    Create new invoice
// @access  Private
router.post('/invoices', auth, [
  body('patient.id').isMongoId(),
  body('billingType').isIn(['kassenarzt', 'wahlarzt', 'privat']),
  body('services').isArray().notEmpty(),
  body('services.*.serviceCode').notEmpty(),
  body('services.*.description').notEmpty(),
  body('services.*.quantity').isNumeric(),
  body('services.*.unitPrice').isNumeric()
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

    const invoiceData = {
      ...req.body,
      createdBy: req.user.id
    };

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    await invoice.populate('patient.id', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Rechnung erfolgreich erstellt',
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Rechnung'
    });
  }
});

// @route   PUT /api/billing/invoices/:id
// @desc    Update invoice
// @access  Private
router.put('/invoices/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastModifiedBy: req.user.id },
      { new: true, runValidators: true }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Rechnung erfolgreich aktualisiert',
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Rechnung'
    });
  }
});

// @route   DELETE /api/billing/invoices/:id
// @desc    Delete invoice
// @access  Private
router.delete('/invoices/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Rechnung erfolgreich gelöscht'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Rechnung'
    });
  }
});

// @route   GET /api/billing/services
// @desc    Get service catalog
// @access  Private
router.get('/services', auth, async (req, res) => {
  try {
    const { category, search } = req.query;
    
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const services = await ServiceCatalog.find(filter)
      .sort({ name: 1 });

    res.json({
      success: true,
      data: services
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Leistungskatalogs'
    });
  }
});

// @route   POST /api/billing/services
// @desc    Create service catalog entry
// @access  Private
router.post('/services', auth, [
  body('code').notEmpty(),
  body('name').notEmpty(),
  body('category').isIn(['konsultation', 'behandlung', 'medikament', 'labor', 'bildgebung', 'sonstiges']),
  body('prices.kassenarzt').isNumeric(),
  body('prices.wahlarzt').isNumeric(),
  body('prices.privat').isNumeric()
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

    const serviceData = {
      ...req.body,
      createdBy: req.user.id
    };

    const service = new ServiceCatalog(serviceData);
    await service.save();

    res.status(201).json({
      success: true,
      message: 'Leistung erfolgreich erstellt',
      data: service
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Leistung'
    });
  }
});

// @route   GET /api/billing/statistics
// @desc    Get billing statistics
// @access  Private
router.get('/statistics', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    const stats = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['draft', 'sent', 'overdue']] },
                '$totalAmount',
                0
              ]
            }
          }
        }
      }
    ]);

    const statusStats = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const billingTypeStats = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$billingType',
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0
        },
        byStatus: statusStats,
        byBillingType: billingTypeStats
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