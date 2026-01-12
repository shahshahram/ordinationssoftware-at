const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Invoice = require('../models/Invoice');
const InvoiceJournal = require('../models/InvoiceJournal');
const Performance = require('../models/Performance');
const ServiceCatalog = require('../models/ServiceCatalog');
const Patient = require('../models/Patient');
const PatientExtended = require('../models/PatientExtended');
const User = require('../models/User');
const { parseDateString, startOfDay, endOfDay, formatDateString } = require('../utils/timezone');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const billingCalculator = require('../utils/billing-calculator');
const rksvo = require('../utils/rksvo');
const rksvoEnhanced = require('../utils/rksvo-enhanced');
const rksvoReceiptService = require('../services/rksvoReceiptService');
const finanzOnlineService = require('../services/finanzOnlineService');
const CashRegister = require('../models/CashRegister');
const ReceiptChain = require('../models/ReceiptChain');
const ogkXMLGenerator = require('../utils/ogk-xml-generator');
const router = express.Router();

// @route   GET /api/billing/invoices
// @desc    Get all invoices
// @access  Private
router.get('/invoices', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, billingType, startDate, endDate, patientId } = req.query;
    
    const filter = {};
    // Unterstütze mehrere Status durch Komma-getrennte Liste
    if (status) {
      const statusArray = status.split(',').map(s => s.trim()).filter(s => s);
      if (statusArray.length === 1) {
        filter.status = statusArray[0];
      } else if (statusArray.length > 1) {
        filter.status = { $in: statusArray };
      }
    }
    if (billingType) filter.billingType = billingType;
    if (patientId) filter['patient.id'] = patientId;
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) {
        const start = startOfDay(parseDateString(startDate));
        filter.invoiceDate.$gte = start;
        console.log('📅 Date Filter - startDate:', {
          input: startDate,
          parsed: start,
          iso: start.toISOString(),
          local: start.toLocaleString('de-DE', { timeZone: 'Europe/Vienna' })
        });
      }
      if (endDate) {
        const end = endOfDay(parseDateString(endDate));
        filter.invoiceDate.$lte = end;
        console.log('📅 Date Filter - endDate:', {
          input: endDate,
          parsed: end,
          iso: end.toISOString(),
          local: end.toLocaleString('de-DE', { timeZone: 'Europe/Vienna' })
        });
      }
      if (startDate || endDate) {
        console.log('📅 Final invoiceDate filter:', JSON.stringify(filter.invoiceDate, null, 2));
      }
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
  body('services.*.serviceCode').optional().notEmpty(),
  body('services.*.description').optional().notEmpty(),
  body('services.*.quantity').optional().isNumeric(),
  body('services.*.unitPrice').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }
    
    // Zusätzliche Validierung: Filtere leere Services und validiere die restlichen
    if (req.body.services && Array.isArray(req.body.services)) {
      const validServices = req.body.services.filter(service => 
        service.serviceCode && service.serviceCode.trim() !== '' &&
        service.description && service.description.trim() !== ''
      );
      
      if (validServices.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Validierungsfehler',
          errors: [{ msg: 'Mindestens eine Leistung mit Code und Beschreibung ist erforderlich' }]
        });
      }
      
      // Ersetze services mit validierten Services
      req.body.services = validServices;
    }

    const invoiceData = {
      ...req.body,
      createdBy: req.user.id
    };

    console.log('Creating invoice with data:', JSON.stringify(invoiceData, null, 2));
    
    // ÖGK-Validierung: Prüfe Duplikate und Limitierungen
    if (invoiceData.billingType === 'kassenarzt' && invoiceData.patient?.id && invoiceData.services) {
      try {
        const billingValidation = require('../utils/billing-validation');
        const invoiceDate = invoiceData.date ? new Date(invoiceData.date) : new Date();
        
        const validationResult = await billingValidation.validateBillingServices(
          invoiceData.patient.id,
          invoiceData.services,
          invoiceDate
        );
        
        if (!validationResult.isValid) {
          return res.status(400).json({
            success: false,
            message: 'Validierungsfehler bei ÖGK-Abrechnung',
            errors: validationResult.errors,
            warnings: validationResult.warnings
          });
        }
        
        // Warnungen als Info zurückgeben (nicht blockierend)
        if (validationResult.warnings.length > 0) {
          console.warn('⚠️ Validierungswarnungen:', validationResult.warnings);
        }
      } catch (validationError) {
        console.error('Fehler bei ÖGK-Validierung:', validationError);
        // Validierungsfehler nicht blockierend, aber loggen
      }
    }

    // Automatische e-card-Validierung für Kassenarzt-Rechnungen
    if (invoiceData.billingType === 'kassenarzt' && invoiceData.patient?.id) {
      try {
        const PatientExtended = require('../models/PatientExtended');
        const elgaService = require('../services/elgaService');
        const ginaService = require('../services/ginaService');
        
        const patient = await PatientExtended.findById(invoiceData.patient.id);
        if (patient && patient.ecard?.cardNumber) {
          // Versuche zuerst über GINA, dann über ELGA
          let validationResult = null;
          try {
            validationResult = await ginaService.validateECard(patient.ecard.cardNumber, {
              socialSecurityNumber: patient.socialSecurityNumber,
              dateOfBirth: patient.dateOfBirth,
              lastName: patient.lastName,
              firstName: patient.firstName
            });
          } catch (ginaError) {
            console.warn('GINA-Validierung fehlgeschlagen, versuche ELGA:', ginaError.message);
            try {
              validationResult = await elgaService.validateECard(patient.ecard.cardNumber, {
                socialSecurityNumber: patient.socialSecurityNumber,
                dateOfBirth: patient.dateOfBirth,
                lastName: patient.lastName
              });
            } catch (elgaError) {
              console.warn('ELGA-Validierung fehlgeschlagen:', elgaError.message);
            }
          }
          
          if (validationResult && !validationResult.valid) {
            console.warn(`⚠️ e-card-Validierung fehlgeschlagen für Patient ${patient._id}: ${validationResult.status}`);
            // Warnung, aber Rechnung trotzdem erstellen
          } else if (validationResult && validationResult.valid) {
            console.log(`✅ e-card erfolgreich validiert für Patient ${patient._id}`);
            // Aktualisiere Patientendaten mit Versicherungsdaten aus e-card
            if (validationResult.insuranceData) {
              patient.insuranceProvider = validationResult.insuranceData.insuranceProvider || patient.insuranceProvider;
              patient.insuranceNumber = validationResult.insuranceData.insuranceNumber || patient.insuranceNumber;
              await patient.save();
            }
          }
        }
      } catch (ecardError) {
        console.warn(`⚠️ Fehler bei automatischer e-card-Validierung:`, ecardError.message);
        // Fehler nicht an Client weitergeben, da Rechnung trotzdem erstellt werden soll
      }
    }

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    await invoice.populate('patient.id', 'firstName lastName');

    // Automatische Erstattungserstellung für Wahlarzt-Rechnungen
    if (invoice.billingType === 'wahlarzt' && invoice.status === 'sent') {
      try {
        const autoReimbursementService = require('../services/autoReimbursementService');
        await autoReimbursementService.createReimbursementForInvoice(invoice);
        console.log(`✅ Automatische Erstattung für Rechnung ${invoice.invoiceNumber} erstellt`);
      } catch (reimbursementError) {
        console.warn(`⚠️ Fehler bei automatischer Erstattungserstellung:`, reimbursementError.message);
        // Fehler nicht an Client weitergeben, da Rechnung bereits erstellt wurde
      }
    }
    
    // GIN-Integration: Automatische Übermittlung für Kassenarzt-Rechnungen (wenn aktiviert)
    if (invoice.billingType === 'kassenarzt' && process.env.GINA_AUTO_SUBMIT === 'true') {
      try {
        const ginaService = require('../services/ginaService');
        // GINA-Übermittlung würde hier erfolgen (falls implementiert)
        console.log(`ℹ️ GIN-Integration: Rechnung ${invoice.invoiceNumber} bereit für Übermittlung`);
      } catch (ginaError) {
        console.warn(`⚠️ Fehler bei GIN-Integration:`, ginaError.message);
      }
    }

    // Journaling: Automatische Protokollierung der Rechnung
    try {
      await InvoiceJournal.createFromInvoice(invoice, 'created', req.user.id);
      console.log(`✅ Rechnung ${invoice.invoiceNumber} wurde im Journal protokolliert`);
    } catch (journalError) {
      console.error(`⚠️ Fehler beim Journaling der Rechnung ${invoice.invoiceNumber}:`, journalError.message);
      console.error(`⚠️ Journaling Error Stack:`, journalError.stack);
      // Fehler nicht an Client weitergeben, da Rechnung bereits erstellt wurde
    }

    // RKSVO: Automatische Beleggenerierung für Barzahlungen
    const isCashTransaction = invoice.paymentDetails?.isCashTransaction || 
      ['cash', 'card', 'bankomat', 'creditcard', 'mobile'].includes(invoice.paymentMethod);
    
    if (isCashTransaction) {
      try {
        // Finde aktive Registrierkasse
        const CashRegister = require('../models/CashRegister');
        const cashRegister = await CashRegister.findOne({ 
          isActive: true,
          locationId: invoice.locationId || { $exists: false }
        });
        
        if (cashRegister && cashRegister.tse?.initialized) {
          console.log(`[RKSVO] Automatische Beleggenerierung für Rechnung ${invoice.invoiceNumber}`);
          
          // Generiere RKSVO-Beleg
          const rksvoData = await rksvoEnhanced.generateRKSVInvoiceEnhanced(
            invoice,
            cashRegister._id,
            req.user.id
          );
          
          // Aktualisiere Rechnung mit RKSVO-Daten
          invoice.rksvoData = {
            tseSignature: rksvoData.tseSignature,
            qrCode: rksvoData.qrCodeData,
            generatedAt: new Date(),
            receiptChainId: rksvoData.receiptChainEntry._id
          };
          await invoice.save();
          
          console.log(`✅ RKSVO-Beleg für Rechnung ${invoice.invoiceNumber} automatisch generiert`);
        } else {
          console.log(`ℹ️ Keine aktive Registrierkasse gefunden oder TSE nicht initialisiert für Rechnung ${invoice.invoiceNumber}`);
        }
      } catch (rksvoError) {
        console.error(`⚠️ Fehler bei automatischer RKSVO-Beleggenerierung für Rechnung ${invoice.invoiceNumber}:`, rksvoError.message);
        // Fehler nicht an Client weitergeben, da Rechnung bereits erstellt wurde
      }
    }

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
    console.log(`📝 Update invoice request for ID: ${req.params.id}`);
    console.log(`📝 Request body keys:`, Object.keys(req.body));
    
    const oldInvoice = await Invoice.findById(req.params.id);
    if (!oldInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }

    console.log(`📝 Old invoice number: ${oldInvoice.invoiceNumber}`);
    console.log(`📝 Old invoice services count: ${oldInvoice.services?.length || 0}`);

    // Bereite Update-Daten vor - starte mit den alten Daten und überschreibe mit neuen
    const oldInvoiceData = oldInvoice.toObject();
    const updateData = {
      ...oldInvoiceData,
      ...req.body,
      lastModifiedBy: req.user.id
    };
    
    console.log(`📝 Update data services count: ${updateData.services?.length || 0}`);
    
    // Stelle sicher, dass services ein Array ist und korrekt formatiert
    if (req.body.services && Array.isArray(req.body.services)) {
      updateData.services = req.body.services.map(service => ({
        date: service.date ? new Date(service.date) : new Date(),
        serviceCode: service.serviceCode || '',
        description: service.description || '',
        quantity: service.quantity || 1,
        unitPrice: service.unitPrice || 0,
        totalPrice: service.totalPrice || (service.unitPrice || 0) * (service.quantity || 1),
        category: service.category || ''
      }));
    }

    // Berechne subtotal und totalAmount neu, falls services vorhanden
    if (updateData.services && Array.isArray(updateData.services)) {
      updateData.subtotal = updateData.services.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
      updateData.taxAmount = updateData.subtotal * (updateData.taxRate || 0) / 100;
      updateData.totalAmount = updateData.subtotal + updateData.taxAmount;
    }

    // Konvertiere Datum-Felder zu Date-Objekten
    if (req.body.invoiceDate) {
      updateData.invoiceDate = new Date(req.body.invoiceDate);
    }
    if (req.body.dueDate) {
      updateData.dueDate = new Date(req.body.dueDate);
    }

    // Stelle sicher, dass alle required Felder vorhanden sind
    if (!updateData.invoiceNumber) updateData.invoiceNumber = oldInvoice.invoiceNumber;
    if (!updateData.invoiceDate) updateData.invoiceDate = oldInvoice.invoiceDate;
    if (!updateData.dueDate) updateData.dueDate = oldInvoice.dueDate;
    if (!updateData.doctor) updateData.doctor = oldInvoice.doctor;
    if (!updateData.patient) updateData.patient = oldInvoice.patient;
    if (!updateData.createdBy) updateData.createdBy = oldInvoice.createdBy;
    
    // Stelle sicher, dass patient.id ein ObjectId ist
    if (updateData.patient && updateData.patient.id) {
      if (typeof updateData.patient.id === 'string') {
        try {
          updateData.patient.id = new mongoose.Types.ObjectId(updateData.patient.id);
        } catch (error) {
          console.error('Invalid patient.id format:', updateData.patient.id);
          updateData.patient.id = oldInvoice.patient.id;
        }
      } else if (updateData.patient.id._id) {
        updateData.patient.id = updateData.patient.id._id;
      } else if (updateData.patient.id.toString) {
        // Bereits ein ObjectId
        updateData.patient.id = updateData.patient.id;
      }
    }
    
    if (!updateData.billingType) updateData.billingType = oldInvoice.billingType;
    if (!updateData.services || !Array.isArray(updateData.services) || updateData.services.length === 0) {
      updateData.services = oldInvoice.services;
    }
    if (updateData.subtotal === undefined || updateData.subtotal === null) {
      updateData.subtotal = oldInvoice.subtotal;
    }
    if (updateData.totalAmount === undefined || updateData.totalAmount === null) {
      updateData.totalAmount = oldInvoice.totalAmount;
    }

    // ÖGK-Validierung: Prüfe Duplikate und Limitierungen (für Updates)
    if (updateData.billingType === 'kassenarzt' && updateData.patient?.id && updateData.services) {
      try {
        const billingValidation = require('../utils/billing-validation');
        const invoiceDate = updateData.date || updateData.invoiceDate ? new Date(updateData.date || updateData.invoiceDate) : new Date();
        
        const validationResult = await billingValidation.validateBillingServices(
          updateData.patient.id,
          updateData.services,
          invoiceDate,
          req.params.id // excludeInvoiceId für Updates
        );
        
        if (!validationResult.isValid) {
          return res.status(400).json({
            success: false,
            message: 'Validierungsfehler bei ÖGK-Abrechnung',
            errors: validationResult.errors,
            warnings: validationResult.warnings
          });
        }
        
        // Warnungen als Info zurückgeben (nicht blockierend)
        if (validationResult.warnings.length > 0) {
          console.warn('⚠️ Validierungswarnungen:', validationResult.warnings);
        }
      } catch (validationError) {
        console.error('Fehler bei ÖGK-Validierung:', validationError);
        // Validierungsfehler nicht blockierend, aber loggen
      }
    }

    // Entferne _id und __v, da diese nicht aktualisiert werden sollten
    delete updateData._id;
    delete updateData.__v;

    console.log(`📝 Final update data:`, {
      invoiceNumber: updateData.invoiceNumber,
      servicesCount: updateData.services?.length || 0,
      subtotal: updateData.subtotal,
      totalAmount: updateData.totalAmount,
      patientId: updateData.patient?.id,
      billingType: updateData.billingType
    });

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    console.log(`✅ Invoice updated successfully: ${invoice?.invoiceNumber}`);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden nach Update'
      });
    }

    // Journaling: Protokolliere Änderung
    try {
      await InvoiceJournal.createFromInvoice(invoice, 'updated', req.user.id, {
        originalStatus: oldInvoice.status,
        changeReason: 'Rechnung aktualisiert'
      });
      console.log(`✅ Rechnung ${invoice.invoiceNumber} wurde im Journal als Update protokolliert`);
    } catch (journalError) {
      console.error(`⚠️ Fehler beim Journaling der Rechnungsänderung:`, journalError.message);
    }

    res.json({
      success: true,
      message: 'Rechnung erfolgreich aktualisiert',
      data: invoice
    });
  } catch (error) {
    console.error('Invoice update error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Rechnung',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
        kassenarzt: service.ogk?.khoPrice || service.ogk?.ebmPrice || 0, // Unterstützt beide Felder
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

// @route   GET /api/billing/top-patients
// @desc    Get top 20 patients by total spending
// @access  Private
router.get('/top-patients', auth, async (req, res) => {
  try {
    const { limit = 20, startDate, endDate } = req.query;
    
    // Datumsfilter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.invoiceDate = {};
      if (startDate) {
        const start = startOfDay(parseDateString(startDate));
        dateFilter.invoiceDate.$gte = start;
      }
      if (endDate) {
        const end = endOfDay(parseDateString(endDate));
        dateFilter.invoiceDate.$lte = end;
      }
    }
    
    // Aggregation: Gruppiere nach Patient und summiere Beträge
    const topPatients = await Invoice.aggregate([
      {
        $match: {
          ...dateFilter,
          status: { $ne: 'cancelled' } // Stornierte Rechnungen ausschließen
        }
      },
      {
        $group: {
          _id: '$patient.id',
          patientName: { $first: '$patient.name' },
          totalAmount: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 },
          lastInvoiceDate: { $max: '$invoiceDate' }
        }
      },
      {
        $sort: { totalAmount: -1 } // Sortiere nach Gesamtbetrag (höchste zuerst)
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'patients',
          localField: '_id',
          foreignField: '_id',
          as: 'patientDetails'
        }
      },
      {
        $unwind: {
          path: '$patientDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          patientId: '$_id',
          patientName: {
            $ifNull: [
              { $concat: ['$patientDetails.firstName', ' ', '$patientDetails.lastName'] },
              '$patientName'
            ]
          },
          totalAmount: 1,
          invoiceCount: 1,
          lastInvoiceDate: 1,
          firstName: '$patientDetails.firstName',
          lastName: '$patientDetails.lastName',
          email: '$patientDetails.email',
          phone: '$patientDetails.phone'
        }
      }
    ]);
    
    res.json({
      success: true,
      data: topPatients
    });
  } catch (error) {
    console.error('Error fetching top patients:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Top-Patienten'
    });
  }
});

// @route   GET /api/billing/top-patients
// @desc    Get top 20 patients by total spending
// @access  Private
router.get('/top-patients', auth, async (req, res) => {
  try {
    const { limit = 20, startDate, endDate } = req.query;
    
    // Datumsfilter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.invoiceDate = {};
      if (startDate) {
        const start = startOfDay(parseDateString(startDate));
        dateFilter.invoiceDate.$gte = start;
      }
      if (endDate) {
        const end = endOfDay(parseDateString(endDate));
        dateFilter.invoiceDate.$lte = end;
      }
    }
    
    // Aggregation: Gruppiere nach Patient und summiere Beträge
    const topPatients = await Invoice.aggregate([
      {
        $match: {
          ...dateFilter,
          status: { $ne: 'cancelled' } // Stornierte Rechnungen ausschließen
        }
      },
      {
        $group: {
          _id: '$patient.id',
          patientName: { $first: '$patient.name' },
          totalAmount: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 },
          lastInvoiceDate: { $max: '$invoiceDate' }
        }
      },
      {
        $sort: { totalAmount: -1 } // Sortiere nach Gesamtbetrag (höchste zuerst)
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'patients',
          localField: '_id',
          foreignField: '_id',
          as: 'patientDetails'
        }
      },
      {
        $unwind: {
          path: '$patientDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          patientId: '$_id',
          patientName: {
            $ifNull: [
              { $concat: ['$patientDetails.firstName', ' ', '$patientDetails.lastName'] },
              '$patientName'
            ]
          },
          totalAmount: 1,
          invoiceCount: 1,
          lastInvoiceDate: 1,
          firstName: '$patientDetails.firstName',
          lastName: '$patientDetails.lastName',
          email: '$patientDetails.email',
          phone: '$patientDetails.phone'
        }
      }
    ]);
    
    res.json({
      success: true,
      data: topPatients
    });
  } catch (error) {
    console.error('Error fetching top patients:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Top-Patienten'
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
// @desc    Generiert RKSVO-konformen Beleg mit QR-Code und Belegverkettung
// @access  Private
router.post('/generate-rksvo-receipt', auth, async (req, res) => {
  try {
    const { invoiceId, cashRegisterId } = req.body;
    
    const invoice = await Invoice.findById(invoiceId).populate('patient.id');
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }
    
    // Lade CashRegister (oder verwende Standard)
    let cashRegister;
    if (cashRegisterId) {
      cashRegister = await CashRegister.findById(cashRegisterId);
    } else {
      // Finde aktive Registrierkasse für Standort
      cashRegister = await CashRegister.findOne({ isActive: true });
    }
    
    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        message: 'Registrierkasse nicht gefunden. Bitte zuerst Registrierkasse einrichten.'
      });
    }
    
    // Prüfe ob TSE initialisiert ist
    if (!cashRegister.tse.initialized) {
      return res.status(400).json({
        success: false,
        message: 'TSE ist nicht initialisiert. Bitte zuerst Startbeleg erstellen.'
      });
    }
    
    // Bestimme isCashTransaction basierend auf paymentMethod
    if (!invoice.paymentDetails) {
      invoice.paymentDetails = {};
    }
    invoice.paymentDetails.isCashTransaction = ['cash', 'card', 'bankomat', 'creditcard', 'mobile'].includes(invoice.paymentMethod);
    
    // RKSVO-Beleg generieren (mit Verkettung)
    const rksvoData = await rksvoEnhanced.generateRKSVInvoiceEnhanced(
      invoice, 
      cashRegister._id, 
      req.user.id
    );
    
    // Rechnung aktualisieren mit RKSVO-Daten
    invoice.rksvoData = {
      tseSignature: rksvoData.tseSignature,
      qrCode: rksvoData.qrCodeData,
      generatedAt: new Date(),
      receiptChainId: rksvoData.receiptChainEntry._id
    };
    await invoice.save();
    
    res.json({
      success: true,
      data: {
        invoice: invoice,
        receipt: rksvoData.receipt,
        qrCode: rksvoData.qrCode,
        qrCodeData: rksvoData.qrCodeData,
        receiptChainEntry: rksvoData.receiptChainEntry
      }
    });
  } catch (error) {
    console.error('RKSVO-Generierungsfehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei RKSVO-Beleggenerierung: ' + error.message
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
    }).populate('patient.id', 'firstName lastName email socialSecurityNumber dateOfBirth address');
    
    // Normalisiere Patientendaten: Wenn patient.id populated ist, kopiere die Daten nach patient
    const normalizedInvoices = invoices.map(invoice => {
      const invoiceObj = invoice.toObject ? invoice.toObject() : invoice;
      if (invoiceObj.patient?.id && typeof invoiceObj.patient.id === 'object') {
        // Patient wurde populated, kopiere die Daten
        const populatedPatient = invoiceObj.patient.id;
        invoiceObj.patient = {
          ...invoiceObj.patient,
          name: `${populatedPatient.firstName || ''} ${populatedPatient.lastName || ''}`.trim(),
          socialSecurityNumber: populatedPatient.socialSecurityNumber || invoiceObj.patient.socialSecurityNumber,
          dateOfBirth: populatedPatient.dateOfBirth || invoiceObj.patient.dateOfBirth,
          address: populatedPatient.address || invoiceObj.patient.address,
          email: populatedPatient.email || invoiceObj.patient.email
        };
      }
      return invoiceObj;
    });
    
    const totals = ogkXMLGenerator.calculateTotals(normalizedInvoices);
    
    res.json({
      success: true,
      data: {
        invoices: normalizedInvoices,
        totals: totals,
        count: normalizedInvoices.length
      }
    });
  } catch (error) {
    console.error('Turnusabrechnung-Fehler:', error);
    console.error('Turnusabrechnung-Fehler Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Turnusabrechnung',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
      .populate({
        path: 'patientId',
        select: 'firstName lastName email',
        options: { lean: false }
      })
      .populate({
        path: 'doctorId',
        select: 'firstName lastName',
        options: { lean: false }
      })
      .populate({
        path: 'appointmentId',
        select: 'title startTime endTime',
        options: { lean: false }
      })
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

    // Debug: Nur bei Fehlern loggen (reduzierte Logs)
    if (performances.length > 0 && process.env.NODE_ENV === 'development') {
      const firstPerf = performances[0];
      // Nur loggen wenn patientId fehlt oder null ist
      if (!firstPerf.patientId) {
        console.warn('⚠️ Performance ohne patientId gefunden:', firstPerf._id);
      }
    }

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
  body('serviceDatetime').notEmpty().withMessage('Datum/Zeit ist erforderlich'),
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
      doctorId: req.user._id,
      createdBy: req.user._id
    };

    // Debug: Log incoming patientId
    console.log('Incoming patientId from request:', req.body.patientId);
    console.log('Incoming patientId type:', typeof req.body.patientId);
    console.log('Incoming patientId value:', JSON.stringify(req.body.patientId));

    // Validate and convert patientId to ObjectId
    if (!performanceData.patientId || performanceData.patientId === '' || performanceData.patientId === null) {
      return res.status(400).json({
        success: false,
        message: 'Patient-ID ist erforderlich'
      });
    }

    // Convert patientId to ObjectId if it's a string
    if (typeof performanceData.patientId === 'string') {
      if (performanceData.patientId.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Patient-ID darf nicht leer sein'
        });
      }
      try {
        performanceData.patientId = new mongoose.Types.ObjectId(performanceData.patientId);
      } catch (error) {
        console.error('Error converting patientId to ObjectId:', error);
        return res.status(400).json({
          success: false,
          message: 'Ungültige Patient-ID'
        });
      }
    }

    // Validate that patient exists in PatientExtended collection (Produktivsystem-Standard)
    const patientExists = await PatientExtended.findById(performanceData.patientId);
    
    if (!patientExists) {
      console.error('Patient not found in PatientExtended collection for ID:', performanceData.patientId);
      return res.status(400).json({
        success: false,
        message: 'Patient nicht gefunden. Bitte wählen Sie einen gültigen Patienten.',
        patientId: performanceData.patientId.toString()
      });
    }

    // Debug: Log patientId before saving
    console.log('Performance data patientId:', performanceData.patientId);
    console.log('Performance data patientId type:', typeof performanceData.patientId);

    // Convert appointmentId to ObjectId if it's a string and not empty
    if (performanceData.appointmentId && typeof performanceData.appointmentId === 'string' && performanceData.appointmentId.trim() !== '') {
      performanceData.appointmentId = new mongoose.Types.ObjectId(performanceData.appointmentId);
    } else if (!performanceData.appointmentId || performanceData.appointmentId === '') {
      delete performanceData.appointmentId;
    }

    // Convert serviceDatetime to Date if it's a string
    if (performanceData.serviceDatetime && typeof performanceData.serviceDatetime === 'string') {
      performanceData.serviceDatetime = new Date(performanceData.serviceDatetime);
    }

    // Calculate total price if not provided
    if (!performanceData.totalPrice) {
      performanceData.totalPrice = performanceData.unitPrice * (performanceData.quantity || 1);
    }

    // Debug: Log final performanceData before creating model
    console.log('Final performanceData before creating model:', JSON.stringify(performanceData, null, 2));
    console.log('Final performanceData.patientId:', performanceData.patientId);
    console.log('Final performanceData.patientId type:', typeof performanceData.patientId);
    console.log('Final performanceData.patientId instanceof ObjectId:', performanceData.patientId instanceof mongoose.Types.ObjectId);

    const performance = new Performance(performanceData);
    
    // Debug: Log performance before saving
    console.log('Performance before save - patientId:', performance.patientId);
    console.log('Performance before save - patientId type:', typeof performance.patientId);
    
    await performance.save();
    
    // Debug: Log performance after saving
    console.log('Performance after save - patientId:', performance.patientId);
    console.log('Performance after save - patientId type:', typeof performance.patientId);
    await performance.populate('patientId', 'firstName lastName email');
    await performance.populate('doctorId', 'firstName lastName');
    if (performance.appointmentId) {
      await performance.populate('appointmentId', 'locationId');
    }

    // Debug: Log created performance
    console.log('Created performance patientId:', performance.patientId);
    console.log('Created performance patientId type:', typeof performance.patientId);

    // Debug: Load performance directly from DB without populate to check if patientId is saved
    const performanceRaw = await Performance.findById(performance._id);
    console.log('Raw performance from DB after create - patientId:', performanceRaw?.patientId);
    console.log('Raw performance from DB after create - patientId type:', typeof performanceRaw?.patientId);
    console.log('Raw performance from DB after create - patientId toString:', performanceRaw?.patientId?.toString());

    // Automatische Abrechnung prüfen
    // Priorität: Systemeinstellung (User.profile.preferences.autoBillingEnabled) > Checkbox (req.body.autoBill)
    const user = await User.findById(req.user._id).select('profile.preferences.autoBillingEnabled');
    const systemAutoBillingEnabled = user?.profile?.preferences?.autoBillingEnabled || false;
    const checkboxAutoBill = req.body.autoBill === true || req.body.autoBill === 'true';
    const shouldAutoBill = systemAutoBillingEnabled || checkboxAutoBill;

    if (shouldAutoBill) {
      try {
        console.log(`🔄 Automatische Abrechnung gestartet für Performance ${performance._id} (System: ${systemAutoBillingEnabled}, Checkbox: ${checkboxAutoBill})`);
        const billingService = require('../services/billingService');
        const billingResult = await billingService.oneClickBill(performance._id, req.user, {
          locationId: performance.appointmentId?.locationId || null
        });
        console.log(`✅ Automatische Abrechnung erfolgreich gestartet: Job ${billingResult.jobId}`);
      } catch (billingError) {
        console.error('⚠️ Fehler bei automatischer Abrechnung:', billingError);
        // Fehler nicht an Client weitergeben, da Performance bereits erstellt wurde
        // Die Abrechnung kann später manuell gestartet werden
      }
    }

    res.status(201).json({
      success: true,
      message: 'Leistung erfolgreich erstellt',
      data: performance,
      autoBillingStarted: shouldAutoBill
    });
  } catch (error) {
    console.error('Performance creation error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Leistung',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   PUT /api/billing/performances/:id
// @desc    Update performance
// @access  Private
router.put('/performances/:id', auth, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Convert patientId to ObjectId if it's a string
    if (updateData.patientId) {
      if (typeof updateData.patientId === 'string' && updateData.patientId.trim() !== '') {
        try {
          updateData.patientId = new mongoose.Types.ObjectId(updateData.patientId);
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Ungültige Patient-ID'
          });
        }
      } else if (updateData.patientId === '' || updateData.patientId === null) {
        // Don't update patientId if it's empty or null (keep existing value)
        delete updateData.patientId;
      }
    }

    // Validate that patient exists in PatientExtended collection (Produktivsystem-Standard)
    if (updateData.patientId) {
      const patientExists = await PatientExtended.findById(updateData.patientId);
      if (!patientExists) {
        console.error('Patient not found in PatientExtended collection for ID:', updateData.patientId);
        return res.status(400).json({
          success: false,
          message: 'Patient nicht gefunden. Bitte wählen Sie einen gültigen Patienten.'
        });
      }
    }

    // Convert appointmentId to ObjectId if it's a string and not empty
    if (updateData.appointmentId && typeof updateData.appointmentId === 'string' && updateData.appointmentId.trim() !== '') {
      updateData.appointmentId = new mongoose.Types.ObjectId(updateData.appointmentId);
    } else if (updateData.appointmentId === '' || updateData.appointmentId === null) {
      updateData.appointmentId = null;
    }

    // Convert serviceDatetime to Date if it's a string
    if (updateData.serviceDatetime && typeof updateData.serviceDatetime === 'string') {
      updateData.serviceDatetime = new Date(updateData.serviceDatetime);
    }

    // Debug: Log update data
    console.log('Update performance data patientId:', updateData.patientId);
    console.log('Update performance data patientId type:', typeof updateData.patientId);

    // Debug: Log final updateData before updating
    console.log('Final updateData before update:', JSON.stringify(updateData, null, 2));
    console.log('Final updateData.patientId:', updateData.patientId);

    const performance = await Performance.findByIdAndUpdate(
      req.params.id,
      { 
        ...updateData, 
        lastModifiedBy: req.user._id,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    )
      .populate('patientId', 'firstName lastName email')
      .populate('doctorId', 'firstName lastName');

    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }

    // Debug: Log updated performance
    console.log('Updated performance patientId:', performance.patientId);
    console.log('Updated performance patientId type:', typeof performance.patientId);
    console.log('Updated performance patientId instanceof ObjectId:', performance.patientId instanceof mongoose.Types.ObjectId);

    // Debug: Load performance directly from DB without populate to check if patientId is saved
    const performanceRaw = await Performance.findById(req.params.id);
    console.log('Raw performance from DB - patientId:', performanceRaw?.patientId);
    console.log('Raw performance from DB - patientId type:', typeof performanceRaw?.patientId);

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

// @route   GET /api/billing/performances/validate-references
// @desc    Find performances with invalid patient references
// @access  Private
router.get('/performances/validate-references', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const performances = await Performance.find({ patientId: { $ne: null } }).select('_id patientId');
    const invalidPerformances = [];

    for (const performance of performances) {
      // Prüfe PatientExtended (Produktivsystem-Standard)
      const patient = await PatientExtended.findById(performance.patientId);
      if (!patient) {
        invalidPerformances.push({
          performanceId: performance._id,
          patientId: performance.patientId
        });
      }
    }

    res.json({
      success: true,
      total: performances.length,
      invalid: invalidPerformances.length,
      invalidPerformances
    });
  } catch (error) {
    console.error('Error validating references:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Validieren der Referenzen',
      error: error.message
    });
  }
});

// @route   POST /api/billing/performances/cleanup-invalid-references
// @desc    Clean up performances with invalid patient references (set patientId to null)
// @access  Private
router.post('/performances/cleanup-invalid-references', auth, checkPermission('patients.write'), async (req, res) => {
  try {
    const performances = await Performance.find({ patientId: { $ne: null } }).select('_id patientId');
    let cleanedCount = 0;

    for (const performance of performances) {
      // Prüfe PatientExtended (Produktivsystem-Standard)
      const patient = await PatientExtended.findById(performance.patientId);
      if (!patient) {
        await Performance.findByIdAndUpdate(performance._id, { 
          patientId: null,
          lastModifiedBy: req.user._id,
          updatedAt: new Date()
        });
        cleanedCount++;
      }
    }

    res.json({
      success: true,
      message: `${cleanedCount} Leistungen mit ungültigen Patient-Referenzen bereinigt`,
      cleanedCount
    });
  } catch (error) {
    console.error('Error cleaning up invalid references:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Bereinigen der Referenzen',
      error: error.message
    });
  }
});

// ============================================
// KASSA TESTST RECKE ROUTES
// ============================================

const kassenConnector = require('../services/connectors/kassenConnector');

/**
 * @route   POST /api/billing/kassa/test-connection
 * @desc    Teste Verbindung zur Kassen-API
 * @access  Private (settings.read)
 */
router.post('/kassa/test-connection', auth, checkPermission('settings.read'), async (req, res) => {
  try {
    const { baseUrl, apiKey } = req.body;
    
    // Temporär API-URL und Key setzen für Test
    const originalBaseUrl = kassenConnector.baseUrl;
    const originalApiKey = kassenConnector.apiKey;
    
    if (baseUrl) kassenConnector.baseUrl = baseUrl;
    if (apiKey) kassenConnector.apiKey = apiKey;
    
    const result = await kassenConnector.testConnection();
    
    // Originalwerte wiederherstellen
    kassenConnector.baseUrl = originalBaseUrl;
    kassenConnector.apiKey = originalApiKey;
    
    res.json({
      success: result.success,
      message: result.success ? 'Verbindungstest erfolgreich' : 'Verbindungstest fehlgeschlagen',
      data: result
    });
  } catch (error) {
    console.error('Kassa-Verbindungstest Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Verbindungstest fehlgeschlagen',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/billing/kassa/send
 * @desc    Sende Test-Kassenabrechnung
 * @access  Private (billing.write)
 */
router.post('/kassa/send', auth, checkPermission('billing.write'), async (req, res) => {
  try {
    const { performanceId, patientId, serviceCode, serviceDescription, totalPrice, tariffType } = req.body;
    
    // Performance laden, falls vorhanden
    let performance = null;
    if (performanceId) {
      performance = await Performance.findById(performanceId).populate('patientId doctorId');
    }
    
    // Patient laden
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(400).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    // Doctor laden (vom aktuellen User)
    const doctor = await User.findById(req.user._id).select('+profile');
    if (!doctor) {
      return res.status(400).json({
        success: false,
        message: 'Arzt nicht gefunden'
      });
    }
    
    // Payload erstellen
    const payload = {
      performance: {
        id: performance?._id || null,
        serviceCode: performance?.serviceCode || serviceCode,
        serviceDescription: performance?.serviceDescription || serviceDescription,
        serviceDatetime: performance?.serviceDatetime || new Date(),
        unitPrice: performance?.unitPrice || totalPrice,
        quantity: performance?.quantity || 1,
        totalPrice: performance?.totalPrice || totalPrice,
        tariffType: performance?.tariffType || tariffType
      },
      doctor: {
        id: doctor._id,
        name: `${doctor.firstName} ${doctor.lastName}`,
        contractType: doctor.profile?.contractType || 'wahlarzt',
        specialization: doctor.profile?.specialization || '',
        taxNumber: doctor.taxNumber || '',
        chamberNumber: doctor.chamberNumber || ''
      },
      patient: {
        id: patient._id,
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
        socialSecurityNumber: patient.socialSecurityNumber,
        insuranceProvider: patient.insuranceProvider,
        address: patient.address
      },
      route: tariffType === 'kassa' ? 'KASSE' : 'PATIENT+KASSE_REFUND',
      timestamp: new Date()
    };
    
    // Idempotency-Key generieren
    const idempotencyKey = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Prüfe ob Patient eine Sozialversicherungsnummer hat (für e-Card-Validierung)
    if (!patient.socialSecurityNumber) {
      return res.status(400).json({
        success: false,
        message: 'Patient hat keine Sozialversicherungsnummer. Diese ist für Kassenabrechnungen erforderlich.',
        error: 'Sozialversicherungsnummer fehlt'
      });
    }
    
    // Kassenabrechnung senden
    try {
      const result = await kassenConnector.send(payload, idempotencyKey);
      
      res.json({
        success: result.success,
        message: result.success ? 'Kassenabrechnung erfolgreich gesendet' : 'Kassenabrechnung fehlgeschlagen',
        data: result
      });
    } catch (kassaError) {
      // Wenn die Kassen-API nicht verfügbar ist, simuliere eine erfolgreiche Antwort für Testzwecke
      if (kassaError.message.includes('nicht verfügbar') || kassaError.message.includes('ECONNREFUSED') || !kassenConnector.apiKey) {
        console.warn('⚠️ Kassen-API nicht verfügbar, simuliere Test-Antwort:', kassaError.message);
        res.json({
          success: true,
          message: 'Kassenabrechnung erfolgreich gesendet (simuliert - Kassen-API nicht konfiguriert)',
          data: {
            kassaRef: `TEST-${idempotencyKey}`,
            status: 'ACCEPTED',
            message: 'Test-Abrechnung erfolgreich verarbeitet',
            processingTime: 100,
            simulated: true,
            warning: 'Kassen-API ist nicht konfiguriert. Dies ist eine simulierte Antwort für Testzwecke.'
          }
        });
      } else {
        throw kassaError;
      }
    }
  } catch (error) {
    console.error('Kassa-Send Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Kassenabrechnung fehlgeschlagen',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   POST /api/billing/kassa/refund
 * @desc    Stelle Rückerstattungsantrag
 * @access  Private (billing.write)
 */
router.post('/kassa/refund', auth, checkPermission('billing.write'), async (req, res) => {
  try {
    const { performanceId, patientId, refundAmount, reason } = req.body;
    
    // Validierung
    if (!performanceId || !patientId || !refundAmount) {
      return res.status(400).json({
        success: false,
        message: 'Leistung, Patient und Rückerstattungsbetrag sind erforderlich'
      });
    }
    
    // Performance laden
    const performance = await Performance.findById(performanceId).populate('patientId doctorId');
    if (!performance) {
      return res.status(400).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }
    
    // Patient laden
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(400).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    // Doctor laden
    const doctor = await User.findById(req.user._id).select('+profile');
    if (!doctor) {
      return res.status(400).json({
        success: false,
        message: 'Arzt nicht gefunden'
      });
    }
    
    // Payload erstellen
    const payload = {
      performance: {
        id: performance._id,
        serviceCode: performance.serviceCode,
        serviceDescription: performance.serviceDescription,
        serviceDatetime: performance.serviceDatetime,
        unitPrice: performance.unitPrice,
        quantity: performance.quantity,
        totalPrice: performance.totalPrice,
        tariffType: performance.tariffType
      },
      doctor: {
        id: doctor._id,
        name: `${doctor.firstName} ${doctor.lastName}`,
        contractType: doctor.profile?.contractType || 'wahlarzt',
        specialization: doctor.profile?.specialization || '',
        taxNumber: doctor.taxNumber || '',
        chamberNumber: doctor.chamberNumber || ''
      },
      patient: {
        id: patient._id,
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
        socialSecurityNumber: patient.socialSecurityNumber,
        insuranceProvider: patient.insuranceProvider,
        address: patient.address
      },
      wahlarztData: {
        totalPrice: performance.totalPrice,
        refundAmount: parseFloat(refundAmount),
        copayAmount: 0,
        patientAmount: performance.totalPrice - parseFloat(refundAmount),
        billingType: 'wahlarzt',
        requiresRefundRequest: true
      },
      route: 'PATIENT+KASSE_REFUND',
      timestamp: new Date()
    };
    
    // Prüfe ob Patient eine Sozialversicherungsnummer hat (für e-Card-Validierung)
    if (!patient.socialSecurityNumber) {
      return res.status(400).json({
        success: false,
        message: 'Patient hat keine Sozialversicherungsnummer. Diese ist für Rückerstattungsanträge erforderlich.',
        error: 'Sozialversicherungsnummer fehlt'
      });
    }
    
    // Idempotency-Key generieren
    const idempotencyKey = `test_refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Rückerstattungsantrag stellen
    try {
      const result = await kassenConnector.submitRefundRequest(payload, idempotencyKey);
      
      res.json({
        success: result.success,
        message: result.success ? 'Rückerstattungsantrag erfolgreich gestellt' : 'Rückerstattungsantrag fehlgeschlagen',
        data: result
      });
    } catch (kassaError) {
      // Wenn die Kassen-API nicht verfügbar ist, simuliere eine erfolgreiche Antwort für Testzwecke
      if (kassaError.message.includes('nicht verfügbar') || 
          kassaError.message.includes('ECONNREFUSED') || 
          kassaError.message.includes('nicht konfiguriert') ||
          !kassenConnector.apiKey) {
        console.warn('⚠️ Kassen-API nicht verfügbar, simuliere Test-Rückerstattungsantrag:', kassaError.message);
        res.json({
          success: true,
          message: 'Rückerstattungsantrag erfolgreich gestellt (simuliert - Kassen-API nicht konfiguriert)',
          data: {
            success: true,
            refundRef: `TEST-REFUND-${idempotencyKey}`,
            status: 'PENDING',
            refundAmount: parseFloat(refundAmount),
            processingTime: 100,
            simulated: true,
            warning: 'Kassen-API ist nicht konfiguriert. Dies ist eine simulierte Antwort für Testzwecke.'
          }
        });
      } else {
        throw kassaError;
      }
    }
  } catch (error) {
    console.error('Kassa-Refund Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Rückerstattungsantrag fehlgeschlagen',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/billing/kassa/list
 * @desc    Rufe Abrechnungsliste ab
 * @access  Private (billing.read)
 */
router.get('/kassa/list', auth, checkPermission('billing.read'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start- und Enddatum erforderlich'
      });
    }
    
    // Abrechnungsliste abrufen
    try {
      const result = await kassenConnector.getBillingList(new Date(startDate), new Date(endDate));
      
      res.json({
        success: result.success,
        message: result.success ? 'Abrechnungsliste erfolgreich abgerufen' : 'Abrechnungsliste konnte nicht abgerufen werden',
        data: result
      });
    } catch (kassaError) {
      // Wenn die Kassen-API nicht verfügbar ist, simuliere eine Test-Antwort
      if (kassaError.message.includes('nicht verfügbar') || 
          kassaError.message.includes('ECONNREFUSED') || 
          kassaError.message.includes('nicht konfiguriert') ||
          !kassenConnector.apiKey) {
        console.warn('⚠️ Kassen-API nicht verfügbar, simuliere Test-Abrechnungsliste:', kassaError.message);
        
        // Lade Rechnungen aus der Datenbank als Simulation
        const Invoice = require('../models/Invoice');
        const invoices = await Invoice.find({
          billingType: 'kassenarzt',
          invoiceDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        })
        .populate('patient.id', 'firstName lastName')
        .sort({ invoiceDate: -1 })
        .limit(10);
        
        res.json({
          success: true,
          message: 'Abrechnungsliste erfolgreich abgerufen (simuliert - Kassen-API nicht konfiguriert)',
          data: {
            invoices: invoices.map(inv => ({
              invoiceNumber: inv.invoiceNumber,
              invoiceDate: inv.invoiceDate,
              patient: {
                name: inv.patient?.id ? 
                  `${inv.patient.id.firstName} ${inv.patient.id.lastName}` : 
                  inv.patient?.name || 'Unbekannt'
              },
              totalAmount: inv.totalAmount,
              status: inv.status
            })),
            simulated: true,
            warning: 'Kassen-API ist nicht konfiguriert. Dies sind lokale Rechnungen aus der Datenbank.'
          }
        });
      } else {
        throw kassaError;
      }
    }
  } catch (error) {
    console.error('Kassa-List Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Abrechnungsliste konnte nicht abgerufen werden',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ============================================================================
// RKSVO - Registrierkassenpflicht Endpoints
// ============================================================================

// @route   GET /api/billing/cash-registers
// @desc    Liste aller Registrierkassen
// @access  Private
router.get('/cash-registers', auth, async (req, res) => {
  try {
    const cashRegisters = await CashRegister.find({ isActive: true })
      .populate('locationId', 'name')
      .select('-tse.secret -tse.apiSecret -finanzOnline.webservicePassword');
    
    res.json({
      success: true,
      data: cashRegisters
    });
  } catch (error) {
    console.error('Fehler beim Laden der Registrierkassen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Registrierkassen'
    });
  }
});

// @route   POST /api/billing/cash-registers
// @desc    Erstellt neue Registrierkasse
// @access  Private
router.post('/cash-registers', auth, async (req, res) => {
  try {
    const { cashBoxId, locationId, tse } = req.body;
    
    // Prüfe ob cashBoxId bereits existiert
    const existing = await CashRegister.findOne({ cashBoxId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Registrierkasse mit dieser ID existiert bereits'
      });
    }
    
    const cashRegister = new CashRegister({
      cashBoxId,
      locationId,
      tse: {
        provider: tse?.provider || 'software',
        serialNumber: tse?.serialNumber,
        publicKey: tse?.publicKey,
        secret: tse?.secret,
        apiKey: tse?.apiKey,
        apiSecret: tse?.apiSecret,
        endpoint: tse?.endpoint,
        testMode: tse?.testMode || false,
        sandboxEndpoint: tse?.sandboxEndpoint,
        initialized: false
      },
      createdBy: req.user.id
    });
    
    await cashRegister.save();
    
    res.json({
      success: true,
      data: cashRegister
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Registrierkasse:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Registrierkasse: ' + error.message
    });
  }
});

// @route   POST /api/billing/cash-registers/:id/start-receipt
// @desc    Erstellt Startbeleg (TSE-Initialisierung)
// @access  Private
router.post('/cash-registers/:id/start-receipt', auth, async (req, res) => {
  try {
    const cashRegisterId = req.params.id;
    
    const startReceipt = await rksvoReceiptService.createStartReceipt(
      cashRegisterId,
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Startbeleg erfolgreich erstellt',
      data: startReceipt
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Startbelegs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Startbelegs: ' + error.message
    });
  }
});

// @route   POST /api/billing/cash-registers/:id/monthly-receipt
// @desc    Erstellt Monatsbeleg manuell
// @access  Private
router.post('/cash-registers/:id/monthly-receipt', auth, async (req, res) => {
  try {
    const cashRegisterId = req.params.id;
    const { year, month } = req.body;
    
    const date = year && month ? new Date(year, month - 1, 1) : new Date();
    await rksvoReceiptService.generateMonthlyReceipt(date);
    
    res.json({
      success: true,
      message: 'Monatsbeleg erfolgreich erstellt'
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Monatsbelegs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Monatsbelegs: ' + error.message
    });
  }
});

// @route   POST /api/billing/cash-registers/:id/yearly-receipt
// @desc    Erstellt Jahresbeleg manuell
// @access  Private
router.post('/cash-registers/:id/yearly-receipt', auth, async (req, res) => {
  try {
    const cashRegisterId = req.params.id;
    const { year } = req.body;
    
    await rksvoReceiptService.generateYearlyReceipt(year || new Date().getFullYear());
    
    res.json({
      success: true,
      message: 'Jahresbeleg erfolgreich erstellt'
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Jahresbelegs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Jahresbelegs: ' + error.message
    });
  }
});

// @route   GET /api/billing/cash-registers/:id/yearly-receipt/:year/pdf
// @desc    Exportiert Jahresbeleg als PDF (für BMF-App Scan)
// @access  Private
router.get('/cash-registers/:id/yearly-receipt/:year/pdf', auth, checkPermission('billing.read'), async (req, res) => {
  try {
    const { id, year } = req.params;
    const cashRegister = await CashRegister.findById(id);
    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        message: 'Registrierkasse nicht gefunden'
      });
    }
    
    // Finde Jahresbeleg (Dezember-Monatsbeleg)
    const yearlyReceipt = await ReceiptChain.findOne({
      cashBoxId: cashRegister.cashBoxId,
      receiptType: 'monthly',
      'period.year': parseInt(year),
      'period.month': 12
    });
    
    if (!yearlyReceipt) {
      return res.status(404).json({
        success: false,
        message: `Jahresbeleg für ${year} nicht gefunden`
      });
    }
    
    // Generiere Beleg-Text
    const receiptText = rksvoEnhanced.generateReceiptEnhanced(
      { invoiceNumber: `YEARLY-${year}`, totalAmount: 0 },
      yearlyReceipt.tseSignature
    );
    
    // Generiere PDF (einfaches Text-PDF)
    const pdfGenerator = require('../utils/pdfGenerator');
    const htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 10pt;
              line-height: 1.2;
              white-space: pre-wrap;
              margin: 20px;
            }
          </style>
        </head>
        <body>${receiptText.replace(/\n/g, '<br>')}</body>
      </html>
    `;
    
    const pdfBuffer = await pdfGenerator.generatePDF(htmlContent, {
      format: 'A4',
      printBackground: false,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Jahresbeleg_${year}_${cashRegister.cashBoxId}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Fehler beim PDF-Export des Jahresbelegs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim PDF-Export: ' + error.message
    });
  }
});

// @route   POST /api/billing/house-call-receipt
// @desc    Erstellt Hausbesuch-Beleg (Paragon mit Nacherfassung)
// @access  Private
router.post('/house-call-receipt', auth, async (req, res) => {
  try {
    const { cashRegisterId, manualReceiptNumber, amount, date, paymentMethod } = req.body;
    
    if (!cashRegisterId || !amount || !manualReceiptNumber) {
      return res.status(400).json({
        success: false,
        message: 'cashRegisterId, amount und manualReceiptNumber sind erforderlich'
      });
    }
    
    const receipt = await rksvoReceiptService.createHouseCallReceipt({
      manualReceiptNumber,
      amount: Math.round(amount * 100), // In Cent
      date: date ? new Date(date) : new Date(),
      paymentMethod: paymentMethod || 'cash',
      receiptNumber: `HOUSECALL-${Date.now()}`
    }, cashRegisterId, req.user.id);
    
    res.json({
      success: true,
      message: 'Hausbesuch-Beleg erfolgreich erstellt',
      data: receipt
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Hausbesuch-Belegs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Hausbesuch-Belegs: ' + error.message
    });
  }
});

// @route   POST /api/billing/cash-registers/:id/register-finanzonline
// @desc    Registriert Kasse bei FinanzOnline
// @access  Private
router.post('/cash-registers/:id/register-finanzonline', auth, async (req, res) => {
  try {
    const cashRegisterId = req.params.id;
    const { taxNumber, location } = req.body;
    
    const cashRegister = await CashRegister.findById(cashRegisterId);
    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        message: 'Registrierkasse nicht gefunden'
      });
    }
    
    if (!cashRegister.tse.initialized) {
      return res.status(400).json({
        success: false,
        message: 'TSE muss zuerst initialisiert werden (Startbeleg erstellen)'
      });
    }
    
    const registration = await finanzOnlineService.registerCashRegister(
      cashRegister,
      { taxNumber, location }
    );
    
    // Aktualisiere CashRegister mit FinanzOnline-Daten
    cashRegister.finanzOnline = {
      registered: true,
      registrationDate: registration.registrationDate,
      cashRegisterId: registration.cashRegisterId,
      tseId: registration.tseId,
      webserviceUser: process.env.FINANZONLINE_WEBSERVICE_USER,
      webservicePassword: process.env.FINANZONLINE_WEBSERVICE_PASSWORD // Verschlüsselt speichern
    };
    await cashRegister.save();
    
    res.json({
      success: true,
      message: 'Registrierkasse erfolgreich bei FinanzOnline registriert',
      data: registration
    });
  } catch (error) {
    console.error('Fehler bei FinanzOnline-Registrierung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei FinanzOnline-Registrierung: ' + error.message
    });
  }
});

// @route   GET /api/billing/receipt-chain
// @desc    Zeigt Belegverkettung (DEP)
// @access  Private
router.get('/receipt-chain', auth, async (req, res) => {
  try {
    const { cashBoxId, limit = 50 } = req.query;
    
    const filter = {};
    if (cashBoxId) filter.cashBoxId = cashBoxId;
    
    const receipts = await ReceiptChain.find(filter)
      .sort({ receiptNumber: -1 })
      .limit(parseInt(limit))
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .populate('createdBy', 'firstName lastName');
    
    res.json({
      success: true,
      data: receipts
    });
  } catch (error) {
    console.error('Fehler beim Laden der Belegverkettung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Belegverkettung'
    });
  }
});

// ============================================================================
// RKSVO Test- und Validierungs-Endpoints
// ============================================================================

const rksvoValidation = require('../utils/rksvo-validation');

// @route   POST /api/billing/validate-receipt
// @desc    Validiert Beleg für BMF Belegcheck-App und A-SIT Plus
// @access  Private
router.post('/validate-receipt', auth, async (req, res) => {
  try {
    const { receiptChainId, qrCodeData } = req.body;
    
    let receiptChainEntry = null;
    
    if (receiptChainId) {
      receiptChainEntry = await ReceiptChain.findById(receiptChainId);
      if (!receiptChainEntry) {
        return res.status(404).json({
          success: false,
          message: 'Beleg nicht gefunden'
        });
      }
    }
    
    if (!receiptChainEntry && !qrCodeData) {
      return res.status(400).json({
        success: false,
        message: 'receiptChainId oder qrCodeData erforderlich'
      });
    }
    
    // Hole vorherigen Beleg für Verkettungs-Validierung
    let previousReceipt = null;
    if (receiptChainEntry) {
      previousReceipt = await ReceiptChain.findOne({
        cashBoxId: receiptChainEntry.cashBoxId,
        receiptNumber: receiptChainEntry.receiptNumber - 1
      });
    }
    
    // Vollständige Validierung
    const validationResult = await rksvoValidation.validateReceiptComplete(
      receiptChainEntry || { qrCodeData },
      previousReceipt
    );
    
    res.json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    console.error('Fehler bei Beleg-Validierung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Beleg-Validierung: ' + error.message
    });
  }
});

// @route   POST /api/billing/validate-qr-code
// @desc    Validiert QR-Code für BMF Belegcheck-App
// @access  Private
router.post('/validate-qr-code', auth, async (req, res) => {
  try {
    const { qrCodeData } = req.body;
    
    if (!qrCodeData) {
      return res.status(400).json({
        success: false,
        message: 'qrCodeData erforderlich'
      });
    }
    
    const validationResult = rksvoValidation.validateQRCodeForBMF(qrCodeData);
    
    res.json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    console.error('Fehler bei QR-Code-Validierung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei QR-Code-Validierung: ' + error.message
    });
  }
});

// @route   POST /api/billing/validate-tse-signature
// @desc    Validiert TSE-Signatur kryptographisch (A-SIT Plus)
// @access  Private
router.post('/validate-tse-signature', auth, async (req, res) => {
  try {
    const { receiptData, tseSignature, publicKey } = req.body;
    
    if (!receiptData || !tseSignature) {
      return res.status(400).json({
        success: false,
        message: 'receiptData und tseSignature erforderlich'
      });
    }
    
    const validationResult = rksvoValidation.validateTSESignatureCryptographic(
      receiptData,
      tseSignature,
      publicKey
    );
    
    res.json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    console.error('Fehler bei TSE-Signatur-Validierung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei TSE-Signatur-Validierung: ' + error.message
    });
  }
});

// @route   GET /api/billing/test-receipt
// @desc    Erstellt Test-Beleg für Validierung (ohne echte TSE)
// @access  Private
router.post('/test-receipt', auth, async (req, res) => {
  try {
    const { amount = 10000, cashBoxId = 'TEST-CASHBOX-1' } = req.body;
    
    // Erstelle Test-CashRegister
    let testCashRegister = await CashRegister.findOne({ cashBoxId });
    if (!testCashRegister) {
      testCashRegister = new CashRegister({
        cashBoxId,
        tse: {
          provider: 'software',
          testMode: true,
          initialized: true,
          serialNumber: 'TEST-TSE-001'
        },
        signatureCounter: 0,
        createdBy: req.user.id
      });
      await testCashRegister.save();
    }
    
    // Erstelle Test-Invoice
    const testInvoice = {
      invoiceNumber: `TEST-${Date.now()}`,
      totalAmount: amount,
      subtotal: amount,
      taxAmount: 0,
      invoiceDate: new Date(),
      dueDate: new Date(),
      billingType: 'privat',
      doctor: {
        name: 'Test-Ordination',
        firstName: 'Test',
        lastName: 'Arzt',
        taxNumber: 'TEST12345678',
        chamberNumber: 'TEST-001',
        address: {
          street: 'Teststraße 1',
          postalCode: '1010',
          city: 'Wien'
        }
      },
      services: [{
        description: 'Test-Leistung',
        serviceCode: 'TEST-001',
        quantity: 1,
        unitPrice: amount,
        totalPrice: amount,
        date: new Date()
      }],
      paymentMethod: 'cash',
      paymentDetails: {
        isCashTransaction: true
      }
    };
    
    // Generiere Test-Beleg
    const rksvoData = await rksvoEnhanced.generateRKSVInvoiceEnhanced(
      testInvoice,
      testCashRegister._id,
      req.user.id
    );
    
    // Validiere sofort
    const validationResult = await rksvoValidation.validateReceiptComplete(
      rksvoData.receiptChainEntry,
      null
    );
    
    res.json({
      success: true,
      message: 'Test-Beleg erfolgreich erstellt',
      data: {
        receipt: rksvoData.receiptChainEntry,
        qrCode: rksvoData.qrCodeData,
        validation: validationResult
      }
    });
  } catch (error) {
    console.error('Fehler bei Test-Beleg-Erstellung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Test-Beleg-Erstellung: ' + error.message
    });
  }
});

// ============================================================================
// DEP-Export Endpoint
// ============================================================================

// @route   GET /api/billing/export-dep
// @desc    Exportiert DEP (Datenerfassungsprotokoll) für externe Datenträger
// @access  Private
router.get('/export-dep', auth, checkPermission('billing.read'), async (req, res) => {
  try {
    const { cashBoxId, startDate, endDate, format = 'json' } = req.query;
    
    const filter = {};
    if (cashBoxId) filter.cashBoxId = cashBoxId;
    if (startDate || endDate) {
      filter['receiptData.timestamp'] = {};
      if (startDate) filter['receiptData.timestamp'].$gte = new Date(startDate);
      if (endDate) filter['receiptData.timestamp'].$lte = new Date(endDate);
    }
    
    const receipts = await ReceiptChain.find(filter)
      .sort({ receiptNumber: 1 }) // Chronologisch
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .populate('createdBy', 'firstName lastName')
      .lean();
    
    // Formatiere für Export
    const exportData = {
      exportDate: new Date().toISOString(),
      cashBoxId: cashBoxId || 'all',
      period: {
        start: startDate || null,
        end: endDate || null
      },
      totalReceipts: receipts.length,
      receipts: receipts.map(receipt => ({
        receiptNumber: receipt.receiptNumber,
        receiptType: receipt.receiptType,
        timestamp: receipt.receiptData.timestamp,
        amount: receipt.receiptData.amount,
        receiptHash: receipt.receiptHash,
        previousReceiptHash: receipt.previousReceiptHash,
        tseSignature: {
          tseSerial: receipt.tseSignature.tseSerial,
          signatureCounter: receipt.tseSignature.signatureCounter,
          timestamp: receipt.tseSignature.timestamp,
          signatureAlgorithm: receipt.tseSignature.signatureAlgorithm
        },
        tseFailure: receipt.tseFailure || { isFailed: false },
        qrCodeData: receipt.qrCodeData,
        paymentMethod: receipt.paymentMethod,
        isCashTransaction: receipt.isCashTransaction,
        invoiceNumber: receipt.invoiceId?.invoiceNumber || null
      }))
    };
    
    if (format === 'csv') {
      // CSV-Export
      const csvRows = [
        ['Beleg-Nr.', 'Typ', 'Datum', 'Betrag', 'Hash', 'Vorheriger Hash', 'TSE-Serial', 'Counter', 'TSE-Ausfall'].join(',')
      ];
      
      receipts.forEach(receipt => {
        csvRows.push([
          receipt.receiptNumber,
          receipt.receiptType,
          new Date(receipt.receiptData.timestamp).toISOString(),
          (receipt.receiptData.amount / 100).toFixed(2),
          receipt.receiptHash,
          receipt.previousReceiptHash || '',
          receipt.tseSignature.tseSerial,
          receipt.tseSignature.signatureCounter,
          receipt.tseFailure?.isFailed ? 'Ja' : 'Nein'
        ].join(','));
      });
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="dep-export-${Date.now()}.csv"`);
      res.send(csvRows.join('\n'));
    } else {
      // JSON-Export (Standard)
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="dep-export-${Date.now()}.json"`);
      res.json(exportData);
    }
  } catch (error) {
    console.error('Fehler beim DEP-Export:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim DEP-Export: ' + error.message
    });
  }
});

// @route   POST /api/billing/resign-receipts
// @desc    Nachsigniert Belege die im Ausfallmodus erstellt wurden
// @access  Private
router.post('/resign-receipts', auth, checkPermission('billing.write'), async (req, res) => {
  try {
    const { cashRegisterId } = req.body;
    
    const cashRegister = await CashRegister.findById(cashRegisterId);
    if (!cashRegister) {
      return res.status(404).json({
        success: false,
        message: 'Registrierkasse nicht gefunden'
      });
    }
    
    if (!cashRegister.tseFailure?.pendingResignatures || cashRegister.tseFailure.pendingResignatures.length === 0) {
      return res.json({
        success: true,
        message: 'Keine Belege zur Nachsignatur vorhanden',
        data: { resignedCount: 0 }
      });
    }
    
    let resignedCount = 0;
    const errors = [];
    
    for (const receiptId of cashRegister.tseFailure.pendingResignatures) {
      try {
        const receipt = await ReceiptChain.findById(receiptId);
        if (!receipt || !receipt.tseFailure?.isFailed) {
          continue; // Beleg wurde bereits nachsigniert oder existiert nicht
        }
        
        // Generiere neue TSE-Signatur
        const invoice = receipt.invoiceId ? await Invoice.findById(receipt.invoiceId) : null;
        const previousReceipt = await ReceiptChain.findOne({
          cashBoxId: receipt.cashBoxId,
          receiptNumber: receipt.receiptNumber - 1
        });
        
        const newTseSignature = await rksvoEnhanced.generateTSESignatureEnhanced(
          invoice || { invoiceNumber: `RECEIPT-${receipt.receiptNumber}`, totalAmount: receipt.receiptData.amount },
          cashRegister,
          previousReceipt
        );
        
        // Aktualisiere Beleg mit neuer Signatur
        receipt.tseSignature = newTseSignature;
        receipt.tseFailure.isFailed = false;
        receipt.tseFailure.resignedAt = new Date();
        receipt.tseFailure.resignedSignature = newTseSignature.signature;
        
        // Neu berechneter Hash
        const receiptDataForHash = {
          receiptNumber: receipt.receiptNumber,
          receiptType: receipt.receiptType,
          amount: receipt.receiptData.amount,
          timestamp: receipt.receiptData.timestamp,
          previousHash: receipt.previousReceiptHash,
          tseSignature: newTseSignature.signature
        };
        receipt.receiptHash = crypto.createHash('sha256')
          .update(JSON.stringify(receiptDataForHash))
          .digest('hex');
        
        await receipt.save();
        resignedCount++;
      } catch (error) {
        console.error(`Fehler bei Nachsignatur von Beleg ${receiptId}:`, error);
        errors.push({ receiptId, error: error.message });
      }
    }
    
    // Entferne nachsignierte Belege aus der Liste
    const stillPending = [];
    for (const id of cashRegister.tseFailure.pendingResignatures) {
      const receipt = await ReceiptChain.findById(id);
      // Beleg ist noch ausstehend, wenn er nicht existiert oder noch als fehlgeschlagen markiert ist
      if (!receipt || receipt.tseFailure?.isFailed === true) {
        stillPending.push(id);
      }
    }
    cashRegister.tseFailure.pendingResignatures = stillPending;
    
    // Wenn alle nachsigniert sind, markiere TSE als wiederhergestellt
    if (cashRegister.tseFailure.pendingResignatures.length === 0) {
      cashRegister.tseFailure.isFailed = false;
      cashRegister.tseFailure.failureStartTime = null;
    }
    
    await cashRegister.save();
    
    res.json({
      success: true,
      message: `${resignedCount} Belege erfolgreich nachsigniert`,
      data: {
        resignedCount,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('Fehler bei Nachsignatur:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Nachsignatur: ' + error.message
    });
  }
});

module.exports = router;