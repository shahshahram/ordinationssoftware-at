// Direktverrechnung mit Zusatzversicherungen

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const PatientExtended = require('../models/PatientExtended');
const directBillingService = require('../services/directBillingService');
const { body, validationResult } = require('express-validator');

/**
 * @route   POST /api/direct-billing/submit/:invoiceId
 * @desc    Rechnung an Direktverrechnungs-System übermitteln
 * @access  Private
 */
router.post('/submit/:invoiceId', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId)
      .populate('patient.id');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }
    
    if (invoice.billingType !== 'wahlarzt' && invoice.billingType !== 'privat') {
      return res.status(400).json({
        success: false,
        message: 'Direktverrechnung ist nur für Wahlarzt- und Privat-Rechnungen verfügbar'
      });
    }
    
    const patient = await PatientExtended.findById(invoice.patient.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }
    
    const result = await directBillingService.submitInvoice(invoice, patient);
    
    // Aktualisiere Invoice mit Direktverrechnungs-Daten
    invoice.privateBilling = invoice.privateBilling || {};
    invoice.privateBilling.directBillingSystem = result.system;
    invoice.privateBilling.directBillingClaimId = result.claimId;
    invoice.privateBilling.directBillingSubmittedAt = result.submittedAt;
    invoice.privateBilling.directBillingStatus = result.status;
    await invoice.save();
    
    res.json({
      success: true,
      message: `Rechnung erfolgreich an ${result.system} übermittelt`,
      data: result
    });
  } catch (error) {
    console.error('Direktverrechnungs-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Direktverrechnung',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/direct-billing/status/:claimId
 * @desc    Status einer Direktverrechnung prüfen
 * @access  Private
 */
router.get('/status/:claimId', auth, [
  body('system').isIn(['myCare', 'rehaDirekt', 'eAbrechnung']).withMessage('Ungültiges System')
], async (req, res) => {
  try {
    const { claimId } = req.params;
    const { system } = req.query;
    
    if (!system) {
      return res.status(400).json({
        success: false,
        message: 'System-Parameter ist erforderlich'
      });
    }
    
    const status = await directBillingService.checkClaimStatus(claimId, system);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Status-Prüfungsfehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Prüfen des Status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/direct-billing/systems
 * @desc    Verfügbare Direktverrechnungs-Systeme abrufen
 * @access  Private
 */
router.get('/systems', auth, async (req, res) => {
  try {
    const systems = Object.keys(directBillingService.configs).map(key => ({
      id: key,
      name: key,
      enabled: directBillingService.configs[key].enabled,
      baseUrl: directBillingService.configs[key].baseUrl
    }));
    
    res.json({
      success: true,
      data: systems
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Systeme:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Systeme',
      error: error.message
    });
  }
});

module.exports = router;



