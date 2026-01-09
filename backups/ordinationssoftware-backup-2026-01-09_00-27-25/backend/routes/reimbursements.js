// Erstattungsverwaltung Routes

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Reimbursement = require('../models/Reimbursement');
const Invoice = require('../models/Invoice');
const PatientExtended = require('../models/PatientExtended');
const notificationService = require('../services/notificationService');
const { body, validationResult } = require('express-validator');

// GET /api/reimbursements - Alle Erstattungen abrufen
router.get('/', auth, async (req, res) => {
  try {
    const { status, patientId, insuranceProvider, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;
    if (insuranceProvider) filter.insuranceProvider = insuranceProvider;
    
    const reimbursements = await Reimbursement.find(filter)
      .populate('invoiceId')
      .populate('patientId', 'firstName lastName insuranceProvider')
      .populate('createdBy', 'firstName lastName')
      .sort({ submittedDate: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Reimbursement.countDocuments(filter);
    
    res.json({
      success: true,
      data: reimbursements,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching reimbursements:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Erstattungen',
      error: error.message
    });
  }
});

// GET /api/reimbursements/:id - Einzelne Erstattung abrufen
router.get('/:id', auth, async (req, res) => {
  try {
    const reimbursement = await Reimbursement.findById(req.params.id)
      .populate('invoiceId')
      .populate('patientId')
      .populate('createdBy', 'firstName lastName')
      .populate('submittedBy', 'firstName lastName');
    
    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: 'Erstattung nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: reimbursement
    });
  } catch (error) {
    console.error('Error fetching reimbursement:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Erstattung',
      error: error.message
    });
  }
});

// POST /api/reimbursements - Neue Erstattung erstellen
router.post('/', [
  auth,
  body('invoiceId').notEmpty().withMessage('Rechnungs-ID ist erforderlich'),
  body('insuranceProvider').notEmpty().withMessage('Versicherungsanbieter ist erforderlich'),
  body('totalAmount').isNumeric().withMessage('Gesamtbetrag muss eine Zahl sein'),
  body('requestedReimbursement').isNumeric().withMessage('Erstattungsbetrag muss eine Zahl sein')
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
    
    const invoice = await Invoice.findById(req.body.invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }
    
    const reimbursement = new Reimbursement({
      ...req.body,
      patientId: invoice.patient.id,
      createdBy: req.user._id
    });
    
    await reimbursement.save();
    
    await reimbursement.populate('invoiceId');
    await reimbursement.populate('patientId', 'firstName lastName');
    
    res.status(201).json({
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

// PATCH /api/reimbursements/:id - Erstattung aktualisieren
router.patch('/:id', auth, async (req, res) => {
  try {
    const reimbursement = await Reimbursement.findById(req.params.id);
    
    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: 'Erstattung nicht gefunden'
      });
    }
    
    // Speichere alten Status für Benachrichtigung
    const oldStatus = reimbursement.status;
    
    // Aktualisiere Felder
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        reimbursement[key] = req.body[key];
      }
    });
    
    reimbursement.updatedBy = req.user._id;
    await reimbursement.save();
    
    // Sende Benachrichtigung bei Status-Änderung
    if (oldStatus !== reimbursement.status) {
      try {
        await notificationService.notifyReimbursementStatusChange(
          reimbursement,
          oldStatus,
          reimbursement.status
        );
      } catch (notifError) {
        console.warn('Fehler bei Benachrichtigung:', notifError);
        // Fehler nicht an Client weitergeben
      }
    }
    
    await reimbursement.populate('invoiceId');
    await reimbursement.populate('patientId', 'firstName lastName');
    
    res.json({
      success: true,
      message: 'Erstattung erfolgreich aktualisiert',
      data: reimbursement
    });
  } catch (error) {
    console.error('Error updating reimbursement:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Erstattung',
      error: error.message
    });
  }
});

// POST /api/reimbursements/:id/submit - Erstattung einreichen
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const reimbursement = await Reimbursement.findById(req.params.id);
    
    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        message: 'Erstattung nicht gefunden'
      });
    }
    
    if (reimbursement.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Erstattung kann nur im Status "pending" eingereicht werden'
      });
    }
    
    reimbursement.status = 'submitted';
    reimbursement.submittedDate = new Date();
    reimbursement.submittedBy = req.user._id;
    reimbursement.submissionMethod = req.body.submissionMethod || 'online';
    reimbursement.submissionReference = req.body.submissionReference;
    
    await reimbursement.save();
    
    res.json({
      success: true,
      message: 'Erstattung erfolgreich eingereicht',
      data: reimbursement
    });
  } catch (error) {
    console.error('Error submitting reimbursement:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Einreichen der Erstattung',
      error: error.message
    });
  }
});

// GET /api/reimbursements/stats/summary - Statistiken
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.submittedDate = {};
      if (startDate) filter.submittedDate.$gte = new Date(startDate);
      if (endDate) filter.submittedDate.$lte = new Date(endDate);
    }
    
    const stats = await Reimbursement.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRequested: { $sum: '$requestedReimbursement' },
          totalApproved: { $sum: '$approvedReimbursement' }
        }
      }
    ]);
    
    const totalPending = await Reimbursement.countDocuments({ status: { $in: ['pending', 'submitted'] } });
    
    res.json({
      success: true,
      data: {
        byStatus: stats,
        totalPending
      }
    });
  } catch (error) {
    console.error('Error fetching reimbursement stats:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken',
      error: error.message
    });
  }
});

module.exports = router;

