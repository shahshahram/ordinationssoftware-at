const express = require('express');
const { body, validationResult } = require('express-validator');
const Invoice = require('../models/Invoice');
const Performance = require('../models/Performance');
const ServiceCatalog = require('../models/ServiceCatalog');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const billingCalculator = require('../utils/billing-calculator');
const rksvo = require('../utils/rksvo');
const ogkXMLGenerator = require('../utils/ogk-xml-generator');
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
  body('patient.id').optional().isMongoId(),
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

    console.log('Creating invoice with data:', JSON.stringify(invoiceData, null, 2));

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    await invoice.populate('patient.id', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Rechnung erfolgreich erstellt',
      data: invoice
    });
  } catch (error) {
    console.error('Invoice creation error:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Rechnung',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    
    const filter = { is_active: true };
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const services = await ServiceCatalog.find(filter)
      .select('code name description category prices quick_select color_hex specialty billingType ogk wahlarzt private copay price_cents')
      .sort({ name: 1 })
      .lean();

    // Transform services to include prices object
    const transformedServices = services.map(service => ({
      ...service,
      prices: service.prices || {
        kassenarzt: service.ogk?.ebmPrice || 0,
        wahlarzt: service.wahlarzt?.price || 0,
        privat: service.private?.price || service.price_cents || 0
      }
    }));

    res.json({
      success: true,
      data: transformedServices
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

// @route   POST /api/billing/calculate
// @desc    Berechnet Preis automatisch basierend auf Patient und Service
// @access  Private
router.post('/calculate', auth, async (req, res) => {
  try {
    const { patientId, serviceCode, billingType } = req.body;
    
    // Patient laden
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    // Service laden
    const service = await ServiceCatalog.findOne({ code: serviceCode });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service nicht gefunden'
      });
    }
    
    // Berechnung durchführen
    const calculation = billingCalculator.calculateBilling(patient, service, billingType);
    
    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Berechnungsfehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Berechnung'
    });
  }
});

// @route   POST /api/billing/generate-rksvo-receipt
// @desc    Generiert RKSVO-konformen Beleg mit QR-Code
// @access  Private
router.post('/generate-rksvo-receipt', auth, async (req, res) => {
  try {
    const { invoiceId } = req.body;
    
    const invoice = await Invoice.findById(invoiceId).populate('patient.id');
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }
    
    // TSE-Config (sollte aus Config oder DB kommen)
    const tseConfig = {
      cashBoxId: process.env.TSE_CASH_BOX_ID || 'CSHBOX1',
      serialNumber: process.env.TSE_SERIAL || null,
      publicKey: process.env.TSE_PUBLIC_KEY || null,
      secret: process.env.TSE_SECRET || null
    };
    
    // RKSVO-Beleg generieren
    const rksvoData = await rksvo.generateRKSVInvoice(invoice, tseConfig);
    
    // Rechnung aktualisieren mit RKSVO-Daten
    invoice.rksvoData = {
      tseSignature: rksvoData.tseSignature,
      qrCode: rksvoData.qrCodeData,
      generatedAt: new Date()
    };
    await invoice.save();
    
    res.json({
      success: true,
      data: {
        invoice: invoice,
        receipt: rksvoData.receipt,
        qrCode: rksvoData.qrCode,
        qrCodeData: rksvoData.qrCodeData
      }
    });
  } catch (error) {
    console.error('RKSVO-Generierungsfehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei RKSVO-Beleggenerierung'
    });
  }
});

// @route   POST /api/billing/export-ogk-xml
// @desc    Exportiert Rechnungen als ÖGK-XML
// @access  Private
router.post('/export-ogk-xml', auth, async (req, res) => {
  try {
    const { invoiceIds, doctorInfo } = req.body;
    
    // Rechnungen laden
    const invoices = await Invoice.find({ _id: { $in: invoiceIds } })
      .populate('patient.id');
    
    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Keine Rechnungen gefunden'
      });
    }
    
    // XML generieren
    const xml = ogkXMLGenerator.generateELA(invoices, doctorInfo);
    
    // Response
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=ogk-invoices-${Date.now()}.xml`);
    res.send(xml);
  } catch (error) {
    console.error('XML-Export-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim XML-Export'
    });
  }
});

// @route   POST /api/billing/invoices/:id/pdf
// @desc    Generiert PDF für eine Rechnung
// @access  Private
router.post('/invoices/:id/pdf', auth, async (req, res) => {
  try {
    const invoicePDFService = require('../services/invoicePDFService');
    const pdfBuffer = await invoicePDFService.generateInvoicePDF(req.params.id);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Rechnung_${req.params.id}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF-Generierung fehlgeschlagen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der PDF'
    });
  }
});

// @route   POST /api/billing/invoices/:id/send-email
// @desc    Sendet Rechnung per E-Mail an Patienten
// @access  Private
router.post('/invoices/:id/send-email', auth, async (req, res) => {
  try {
    const invoicePDFService = require('../services/invoicePDFService');
    const emailService = require('../services/emailService');
    
    // PDF generieren
    const pdfBuffer = await invoicePDFService.generateInvoicePDF(req.params.id);
    
    // Rechnung laden für E-Mail-Versand
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }
    
    // E-Mail senden
    const result = await emailService.sendInvoiceEmail(invoice, pdfBuffer);
    
    // Rechnung als versendet markieren
    await Invoice.findByIdAndUpdate(req.params.id, {
      status: 'sent',
      emailSent: true,
      emailSentAt: new Date(),
      emailMessageId: result.messageId
    });
    
    res.json({
      success: true,
      message: 'Rechnung erfolgreich per E-Mail versendet',
      data: result
    });
  } catch (error) {
    console.error('E-Mail-Versand fehlgeschlagen:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Versenden der E-Mail'
    });
  }
});

// @route   POST /api/billing/test-email
// @desc    Sendet Test-E-Mail
// @access  Private
router.post('/test-email', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const emailService = require('../services/emailService');
    
    const result = await emailService.sendTestEmail(email);
    
    res.json({
      success: true,
      message: 'Test-E-Mail erfolgreich versendet',
      data: result
    });
  } catch (error) {
    console.error('Test-E-Mail fehlgeschlagen:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Versenden der Test-E-Mail'
    });
  }
});

// @route   POST /api/billing/invoices/:id/one-click
// @desc    One-Click: PDF generieren und per E-Mail versenden
// @access  Private
router.post('/invoices/:id/one-click', auth, async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const invoicePDFService = require('../services/invoicePDFService');
    const emailService = require('../services/emailService');
    
    // Rechnung aus Datenbank laden
    const invoice = await Invoice.findById(invoiceId)
      .populate('patient.id', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rechnung nicht gefunden' 
      });
    }

    // Prüfen ob Patient E-Mail-Adresse hat
    if (!invoice.patient?.id?.email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Patient hat keine E-Mail-Adresse hinterlegt' 
      });
    }

    // PDF generieren
    const pdfBuffer = await invoicePDFService.generateInvoicePDF(invoiceId);
    
    // E-Mail mit PDF-Anhang versenden
    const emailResult = await emailService.sendInvoiceEmail(invoice, pdfBuffer);
    
    // Rechnung als versendet markieren
    await Invoice.findByIdAndUpdate(invoiceId, {
      status: 'sent',
      emailSent: true,
      emailSentAt: new Date(),
      emailMessageId: emailResult.messageId
    });

    res.json({ 
      success: true, 
      message: `Rechnung erfolgreich per E-Mail an ${invoice.patient.id.email} versendet`,
      data: {
        emailMessageId: emailResult.messageId,
        patientEmail: invoice.patient.id.email
      }
    });

  } catch (error) {
    console.error('One-Click Fehler:', error);
    res.status(500).json({ 
      success: false, 
      message: 'One-Click-Versand fehlgeschlagen: ' + error.message 
    });
  }
});

// @route   GET /api/billing/turnusabrechnung
// @desc    Generiert Turnusabrechnung für bestimmten Zeitraum
// @access  Private
router.get('/turnusabrechnung', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start- und Enddatum erforderlich'
      });
    }
    
    const invoices = await Invoice.find({
      billingType: 'kassenarzt',
      invoiceDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      status: { $in: ['sent', 'paid'] }
    }).populate('patient.id');
    
    const totals = ogkXMLGenerator.calculateTotals(invoices);
    
    res.json({
      success: true,
      data: {
        invoices: invoices,
        totals: totals,
        count: invoices.length
      }
    });
  } catch (error) {
    console.error('Turnusabrechnung-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Turnusabrechnung'
    });
  }
});

// ============================================
// PERFORMANCE ENDPOINTS (Leistungserfassung)
// ============================================

// @route   GET /api/billing/performances
// @desc    Get all performances with pagination and filtering
// @access  Private
router.get('/performances', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      tariffType, 
      patientName, 
      serviceCode,
      startDate,
      endDate
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (tariffType) filter.tariffType = tariffType;
    if (serviceCode) filter.serviceCode = serviceCode;
    if (startDate || endDate) {
      filter.serviceDatetime = {};
      if (startDate) filter.serviceDatetime.$gte = new Date(startDate);
      if (endDate) filter.serviceDatetime.$lte = new Date(endDate);
    }

    let query = Performance.find(filter)
      .populate('patientId', 'firstName lastName')
      .populate('doctorId', 'firstName lastName')
      .populate('appointmentId', 'title startTime endTime')
      .sort({ serviceDatetime: -1 });

    // Filter by patient name if provided
    if (patientName) {
      const patients = await Patient.find({
        $or: [
          { firstName: { $regex: patientName, $options: 'i' } },
          { lastName: { $regex: patientName, $options: 'i' } }
        ]
      }).select('_id');
      query = query.where('patientId').in(patients.map(p => p._id));
    }

    const performances = await query
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Performance.countDocuments(filter);

    res.json({
      success: true,
      data: performances,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error loading performances:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Leistungen',
      error: error.message
    });
  }
});

// @route   GET /api/billing/performances/:id
// @desc    Get single performance
// @access  Private
router.get('/performances/:id', auth, async (req, res) => {
  try {
    const performance = await Performance.findById(req.params.id)
      .populate('patientId')
      .populate('doctorId', 'firstName lastName')
      .populate('appointmentId');

    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Leistung'
    });
  }
});

// @route   POST /api/billing/performances
// @desc    Create new performance
// @access  Private
router.post('/performances', auth, [
  body('patientId').isMongoId().withMessage('Ungültige Patienten-ID'),
  body('serviceCode').notEmpty().withMessage('Leistungscode ist erforderlich'),
  body('serviceDescription').notEmpty().withMessage('Beschreibung ist erforderlich'),
  body('unitPrice').isNumeric().withMessage('Einzelpreis muss eine Zahl sein'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Anzahl muss mindestens 1 sein'),
  body('tariffType').isIn(['kassa', 'wahl', 'privat']).withMessage('Ungültiger Tariftyp'),
  body('serviceDatetime').optional().isISO8601().withMessage('Ungültiges Datum/Zeit'),
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

    const performanceData = {
      ...req.body,
      doctorId: req.user.id,
      createdBy: req.user.id
    };

    // Calculate total price if not provided
    if (!performanceData.totalPrice) {
      performanceData.totalPrice = performanceData.unitPrice * (performanceData.quantity || 1);
    }

    const performance = new Performance(performanceData);
    await performance.save();
    await performance.populate('patientId', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Leistung erfolgreich erstellt',
      data: performance
    });
  } catch (error) {
    console.error('Performance creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Leistung',
      error: error.message
    });
  }
});

// @route   PUT /api/billing/performances/:id
// @desc    Update performance
// @access  Private
router.put('/performances/:id', auth, async (req, res) => {
  try {
    const performance = await Performance.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body, 
        lastModifiedBy: req.user.id,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    )
      .populate('patientId', 'firstName lastName')
      .populate('doctorId', 'firstName lastName');

    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Leistung erfolgreich aktualisiert',
      data: performance
    });
  } catch (error) {
    console.error('Performance update error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Leistung',
      error: error.message
    });
  }
});

// @route   DELETE /api/billing/performances/:id
// @desc    Delete performance
// @access  Private
router.delete('/performances/:id', auth, async (req, res) => {
  try {
    const performance = await Performance.findByIdAndDelete(req.params.id);

    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Leistung erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Performance delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Leistung',
      error: error.message
    });
  }
});

module.exports = router;