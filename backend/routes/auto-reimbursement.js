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

module.exports = router;

