// KDok-Routes (Kassen-Dokumentationssystem)

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const kdokService = require('../services/kdokService');
const { body, validationResult } = require('express-validator');

/**
 * @route   GET /api/kdok/status
 * @desc    KDok-Verbindungsstatus prüfen
 * @access  Private
 */
router.get('/status', auth, async (req, res) => {
  try {
    const status = await kdokService.checkConnection();
    res.json({
      success: status.success,
      data: status
    });
  } catch (error) {
    console.error('KDok Status-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Prüfen des KDok-Status',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/kdok/submit/:invoiceId
 * @desc    Einzelne Rechnung an KDok übermitteln
 * @access  Private
 */
router.post('/submit/:invoiceId', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId)
      .populate('patient.id')
      .populate('createdBy');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }
    
    if (invoice.billingType !== 'kassenarzt') {
      return res.status(400).json({
        success: false,
        message: 'Nur Kassenarzt-Rechnungen können an KDok übermittelt werden'
      });
    }
    
    const doctorInfo = invoice.doctor || {};
    const result = await kdokService.submitInvoice(invoice, doctorInfo);
    
    // Aktualisiere Invoice mit KDok-Daten
    invoice.ogkBilling = invoice.ogkBilling || {};
    invoice.ogkBilling.kdokSubmissionId = result.submissionId;
    invoice.ogkBilling.kdokSubmittedAt = result.submittedAt;
    invoice.ogkBilling.status = result.status;
    invoice.ogkBilling.submissionMethod = 'kdok';
    await invoice.save();
    
    res.json({
      success: true,
      message: 'Rechnung erfolgreich an KDok übermittelt',
      data: result
    });
  } catch (error) {
    console.error('KDok-Übermittlungsfehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der KDok-Übermittlung',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/kdok/submit/batch
 * @desc    Mehrere Rechnungen an KDok übermitteln (Batch)
 * @access  Private
 */
router.post('/submit/batch', [
  auth,
  body('invoiceIds').isArray().withMessage('invoiceIds muss ein Array sein'),
  body('invoiceIds.*').isMongoId().withMessage('Ungültige Rechnungs-ID')
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
    
    const { invoiceIds, billingPeriod } = req.body;
    
    const invoices = await Invoice.find({
      _id: { $in: invoiceIds },
      billingType: 'kassenarzt'
    })
      .populate('patient.id')
      .populate('createdBy');
    
    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Keine Kassenarzt-Rechnungen gefunden'
      });
    }
    
    const doctorInfo = invoices[0].doctor || {};
    const result = await kdokService.submitBatch(invoices, doctorInfo);
    
    // Aktualisiere alle Rechnungen
    await Invoice.updateMany(
      { _id: { $in: invoices.map(inv => inv._id) } },
      {
        $set: {
          'ogkBilling.kdokSubmittedAt': result.submittedAt,
          'ogkBilling.submissionMethod': 'kdok',
          'ogkBilling.billingPeriod': billingPeriod || kdokService.getCurrentBillingPeriod()
        }
      }
    );
    
    res.json({
      success: true,
      message: `${invoices.length} Rechnungen erfolgreich an KDok übermittelt`,
      data: result
    });
  } catch (error) {
    console.error('KDok Batch-Übermittlungsfehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der KDok-Batch-Übermittlung',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/kdok/submission/:submissionId/status
 * @desc    Status einer KDok-Übermittlung prüfen
 * @access  Private
 */
router.get('/submission/:submissionId/status', auth, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const status = await kdokService.checkSubmissionStatus(submissionId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('KDok Status-Prüfungsfehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Prüfen des Übermittlungsstatus',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/kdok/auto-submit
 * @desc    Automatische Übermittlung aller ausstehenden Rechnungen
 * @access  Private (Admin)
 */
router.post('/auto-submit', auth, async (req, res) => {
  try {
    // Finde alle ausstehenden Kassenarzt-Rechnungen
    const invoices = await Invoice.find({
      billingType: 'kassenarzt',
      $or: [
        { 'ogkBilling.kdokSubmittedAt': { $exists: false } },
        { 'ogkBilling.status': { $in: ['pending', 'submitted'] } }
      ]
    })
      .populate('patient.id')
      .populate('createdBy')
      .sort({ invoiceDate: 1 });
    
    if (invoices.length === 0) {
      return res.json({
        success: true,
        message: 'Keine ausstehenden Rechnungen gefunden',
        data: { submitted: 0, total: 0 }
      });
    }
    
    const doctorInfo = invoices[0].doctor || {};
    const result = await kdokService.submitBatch(invoices, doctorInfo);
    
    // Aktualisiere alle Rechnungen
    await Invoice.updateMany(
      { _id: { $in: invoices.map(inv => inv._id) } },
      {
        $set: {
          'ogkBilling.kdokSubmittedAt': result.submittedAt,
          'ogkBilling.submissionMethod': 'kdok',
          'ogkBilling.status': 'submitted'
        }
      }
    );
    
    res.json({
      success: true,
      message: `${invoices.length} Rechnungen automatisch an KDok übermittelt`,
      data: result
    });
  } catch (error) {
    console.error('KDok Auto-Submit-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der automatischen KDok-Übermittlung',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/kdok/config
 * @desc    KDok-Konfiguration abrufen (ohne sensible Daten)
 * @access  Private
 */
router.get('/config', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        baseUrl: process.env.KDOK_BASE_URL || '',
        environment: process.env.KDOK_ENVIRONMENT || 'production',
        autoSubmit: process.env.KDOK_AUTO_SUBMIT === 'true',
        submissionMethod: process.env.KDOK_SUBMISSION_METHOD || 'xml',
        batchSize: parseInt(process.env.KDOK_BATCH_SIZE || '100'),
        timeout: parseInt(process.env.KDOK_TIMEOUT || '30000'),
        hasCertificates: !!process.env.KDOK_CLIENT_CERT_PATH
      }
    });
  } catch (error) {
    console.error('Error fetching KDok config:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der KDok-Konfiguration',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/kdok/config
 * @desc    KDok-Konfiguration aktualisieren
 * @access  Private (Admin)
 */
router.put('/config', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Konfigurationen ändern'
      });
    }

    res.json({
      success: true,
      message: 'Konfiguration aktualisiert. Bitte beachten Sie: Änderungen müssen in der .env-Datei vorgenommen werden.',
      data: req.body
    });
  } catch (error) {
    console.error('Error updating KDok config:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der KDok-Konfiguration',
      error: error.message
    });
  }
});

module.exports = router;

