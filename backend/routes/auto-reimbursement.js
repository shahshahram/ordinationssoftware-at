// Automatische Erstattungsverarbeitung Routes

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const autoReimbursementService = require('../services/autoReimbursementService');
const Reimbursement = require('../models/Reimbursement');
const Invoice = require('../models/Invoice');

/**
 * POST /api/auto-reimbursement/process
 * Verarbeitet alle ausstehenden Rechnungen und erstellt automatisch Erstattungen
 */
router.post('/process', auth, async (req, res) => {
  try {
    const result = await autoReimbursementService.processPendingInvoices();
    
    res.json({
      success: true,
      message: `${result.created} Erstattungen erstellt`,
      data: result
    });
  } catch (error) {
    console.error('Error processing auto reimbursements:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der automatischen Erstattungsverarbeitung',
      error: error.message
    });
  }
});

/**
 * POST /api/auto-reimbursement/create/:invoiceId
 * Erstellt Erstattung für eine spezifische Rechnung
 */
router.post('/create/:invoiceId', auth, async (req, res) => {
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

    if (invoice.billingType !== 'wahlarzt') {
      return res.status(400).json({
        success: false,
        message: 'Nur Wahlarzt-Rechnungen können Erstattungen erhalten'
      });
    }

    const reimbursement = await autoReimbursementService.createReimbursementForInvoice(invoice);
    
    res.json({
      success: true,
      message: 'Erstattung erfolgreich erstellt',
      data: reimbursement
    });
  } catch (error) {
    console.error('Error creating reimbursement:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Erstattung',
      error: error.message
    });
  }
});

/**
 * GET /api/auto-reimbursement/status
 * Gibt Status der automatischen Erstattungsverarbeitung zurück
 */
router.get('/status', auth, async (req, res) => {
  try {
    const pendingCount = await Reimbursement.countDocuments({ status: 'pending' });
    const submittedCount = await Reimbursement.countDocuments({ status: 'submitted' });
    const approvedCount = await Reimbursement.countDocuments({ status: 'approved' });
    
    // Finde Rechnungen ohne Erstattung
    const invoicesWithoutReimbursement = await Invoice.countDocuments({
      billingType: 'wahlarzt',
      status: { $in: ['paid', 'sent'] },
      $or: [
        { 'reimbursementId': { $exists: false } },
        { 'reimbursementId': null }
      ]
    });

    res.json({
      success: true,
      data: {
        pendingReimbursements: pendingCount,
        submittedReimbursements: submittedCount,
        approvedReimbursements: approvedCount,
        invoicesWithoutReimbursement: invoicesWithoutReimbursement,
        isProcessing: autoReimbursementService.isProcessing
      }
    });
  } catch (error) {
    console.error('Error getting auto reimbursement status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Status',
      error: error.message
    });
  }
});

/**
 * GET /api/auto-reimbursement/config
 * Gibt Konfiguration der automatischen Erstattungsverarbeitung zurück
 */
router.get('/config', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        isRunning: autoReimbursementService.isProcessing,
        enabled: process.env.AUTO_REIMBURSEMENT_ENABLED === 'true',
        schedule: process.env.AUTO_REIMBURSEMENT_SCHEDULE || '0 2 * * *',
        batchSize: parseInt(process.env.AUTO_REIMBURSEMENT_BATCH_SIZE || '50'),
        retryAttempts: parseInt(process.env.AUTO_REIMBURSEMENT_RETRY_ATTEMPTS || '3')
      }
    });
  } catch (error) {
    console.error('Error getting auto reimbursement config:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Konfiguration',
      error: error.message
    });
  }
});

/**
 * PUT /api/auto-reimbursement/config
 * Aktualisiert Konfiguration der automatischen Erstattungsverarbeitung
 */
router.put('/config', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Konfigurationen ändern'
      });
    }

    const { enabled, schedule, batchSize, retryAttempts } = req.body;
    
    res.json({
      success: true,
      message: 'Konfiguration aktualisiert. Bitte beachten Sie: Änderungen müssen in der .env-Datei vorgenommen werden.',
      data: {
        enabled: enabled || false,
        schedule: schedule || '0 2 * * *',
        batchSize: batchSize || 50,
        retryAttempts: retryAttempts || 3
      }
    });
  } catch (error) {
    console.error('Error updating auto reimbursement config:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Konfiguration',
      error: error.message
    });
  }
});

module.exports = router;

