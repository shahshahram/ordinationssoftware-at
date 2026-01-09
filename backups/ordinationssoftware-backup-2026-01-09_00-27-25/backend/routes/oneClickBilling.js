const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const billingService = require('../services/billingService');
const Performance = require('../models/Performance');
const BillingJob = require('../models/BillingJob');
const BillingAudit = require('../models/BillingAudit');

/**
 * @route   POST /api/billing/one-click/:performanceId
 * @desc    One-Click-Abrechnung für Leistung
 * @access  Private
 */
router.post('/one-click/:performanceId', auth, async (req, res) => {
  try {
    const { performanceId } = req.params;
    const options = req.body.options || {};
    
    // One-Click-Billing ausführen
    const result = await billingService.oneClickBill(performanceId, req.user, options);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        jobId: result.jobId,
        status: result.status,
        route: result.route,
        existing: result.existing || false
      }
    });
    
  } catch (error) {
    console.error('One-Click-Billing API Fehler:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/billing/jobs/:jobId/status
 * @desc    Job-Status abfragen
 * @access  Private
 */
router.get('/jobs/:jobId/status', auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const jobStatus = await billingService.getJobStatus(jobId);
    
    res.json({
      success: true,
      data: jobStatus
    });
    
  } catch (error) {
    console.error('Job-Status API Fehler:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/billing/jobs/:jobId/retry
 * @desc    Job erneut versuchen
 * @access  Private
 */
router.post('/jobs/:jobId/retry', auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const result = await billingService.retryJob(jobId, req.user);
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    console.error('Job-Retry API Fehler:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/billing/jobs/failed
 * @desc    Fehlgeschlagene Jobs abrufen
 * @access  Private
 */
router.get('/jobs/failed', auth, async (req, res) => {
  try {
    const doctorId = req.user.role === 'admin' ? null : req.user._id;
    
    const failedJobs = await billingService.getFailedJobs(doctorId);
    
    res.json({
      success: true,
      data: failedJobs
    });
    
  } catch (error) {
    console.error('Failed Jobs API Fehler:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/billing/performances
 * @desc    Leistungen mit Abrechnungsstatus abrufen
 * @access  Private
 */
router.get('/performances', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      tariffType,
      startDate,
      endDate,
      patientId,
      doctorId
    } = req.query;
    
    // Filter aufbauen
    const filter = {};
    
    if (status) filter.status = status;
    if (tariffType) filter.tariffType = tariffType;
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
    
    // Datumsfilter
    if (startDate || endDate) {
      filter.serviceDatetime = {};
      if (startDate) filter.serviceDatetime.$gte = new Date(startDate);
      if (endDate) filter.serviceDatetime.$lte = new Date(endDate);
    }
    
    // Arzt-Filter für Nicht-Admins
    if (req.user.role !== 'admin') {
      filter.doctorId = req.user._id;
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const performances = await Performance.find(filter)
      .populate('patientId', 'firstName lastName email socialSecurityNumber')
      .populate('doctorId', 'firstName lastName contractType')
      .populate('appointmentId', 'startTime endTime type')
      .sort({ serviceDatetime: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Performance.countDocuments(filter);
    
    res.json({
      success: true,
      data: performances,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Performances API Fehler:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/billing/performances/:id
 * @desc    Einzelne Leistung mit Abrechnungshistorie abrufen
 * @access  Private
 */
router.get('/performances/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const performance = await Performance.findById(id)
      .populate('patientId', 'firstName lastName email socialSecurityNumber insuranceProvider')
      .populate('doctorId', 'firstName lastName contractType specialization')
      .populate('appointmentId', 'startTime endTime type');
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }
    
    // Berechtigung prüfen
    if (req.user.role !== 'admin' && performance.doctorId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diese Leistung'
      });
    }
    
    // Abrechnungshistorie abrufen
    const billingHistory = await BillingAudit.getPerformanceHistory(id);
    
    // Jobs für diese Leistung abrufen
    const jobs = await BillingJob.find({ performanceId: id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: {
        performance,
        billingHistory,
        jobs
      }
    });
    
  } catch (error) {
    console.error('Performance Detail API Fehler:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/billing/performances
 * @desc    Neue Leistung erstellen
 * @access  Private
 */
router.post('/performances', auth, async (req, res) => {
  try {
    const {
      patientId,
      appointmentId,
      serviceCode,
      serviceDescription,
      serviceDatetime,
      unitPrice,
      quantity = 1,
      tariffType,
      notes,
      diagnosisCodes = [],
      medicationCodes = []
    } = req.body;
    
    // Validierung
    if (!patientId || !serviceCode || !serviceDescription || !unitPrice || !tariffType) {
      return res.status(400).json({
        success: false,
        message: 'Pflichtfelder fehlen'
      });
    }
    
    // Leistung erstellen
    const performance = new Performance({
      patientId,
      appointmentId,
      doctorId: req.user._id,
      serviceCode,
      serviceDescription,
      serviceDatetime: serviceDatetime || new Date(),
      unitPrice,
      quantity,
      tariffType,
      notes,
      diagnosisCodes,
      medicationCodes,
      createdBy: req.user._id,
      status: 'recorded'
    });
    
    await performance.save();
    
    // Populate für Response
    await performance.populate([
      { path: 'patientId', select: 'firstName lastName email' },
      { path: 'doctorId', select: 'firstName lastName contractType' },
      { path: 'appointmentId', select: 'startTime endTime type' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Leistung erfolgreich erstellt',
      data: performance
    });
    
  } catch (error) {
    console.error('Performance Create API Fehler:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/billing/performances/:id
 * @desc    Leistung aktualisieren
 * @access  Private
 */
router.put('/performances/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const performance = await Performance.findById(id);
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }
    
    // Berechtigung prüfen
    if (req.user.role !== 'admin' && performance.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diese Leistung'
      });
    }
    
    // Status prüfen
    if (performance.status !== 'recorded') {
      return res.status(400).json({
        success: false,
        message: 'Leistung kann nicht mehr bearbeitet werden (bereits abgerechnet)'
      });
    }
    
    // Update-Daten vorbereiten
    updateData.lastModifiedBy = req.user._id;
    updateData.updatedAt = new Date();
    
    const updatedPerformance = await Performance.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'patientId', select: 'firstName lastName email' },
      { path: 'doctorId', select: 'firstName lastName contractType' },
      { path: 'appointmentId', select: 'startTime endTime type' }
    ]);
    
    res.json({
      success: true,
      message: 'Leistung erfolgreich aktualisiert',
      data: updatedPerformance
    });
    
  } catch (error) {
    console.error('Performance Update API Fehler:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/billing/performances/:id
 * @desc    Leistung löschen
 * @access  Private
 */
router.delete('/performances/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const performance = await Performance.findById(id);
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Leistung nicht gefunden'
      });
    }
    
    // Berechtigung prüfen
    if (req.user.role !== 'admin' && performance.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diese Leistung'
      });
    }
    
    // Status prüfen
    if (performance.status !== 'recorded') {
      return res.status(400).json({
        success: false,
        message: 'Leistung kann nicht gelöscht werden (bereits abgerechnet)'
      });
    }
    
    await Performance.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Leistung erfolgreich gelöscht'
    });
    
  } catch (error) {
    console.error('Performance Delete API Fehler:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/billing/audit/:performanceId
 * @desc    Audit-Log für Leistung abrufen
 * @access  Private
 */
router.get('/audit/:performanceId', auth, async (req, res) => {
  try {
    const { performanceId } = req.params;
    
    const auditHistory = await BillingAudit.getPerformanceHistory(performanceId);
    
    res.json({
      success: true,
      data: auditHistory
    });
    
  } catch (error) {
    console.error('Audit API Fehler:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/billing/statistics
 * @desc    Abrechnungsstatistiken abrufen
 * @access  Private
 */
router.get('/statistics', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Datumsfilter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    // Arzt-Filter für Nicht-Admins
    const doctorFilter = req.user.role === 'admin' ? {} : { doctorId: req.user._id };
    
    // Statistiken berechnen
    const stats = await Performance.aggregate([
      { $match: { ...doctorFilter, serviceDatetime: dateFilter } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalPrice' }
        }
      }
    ]);
    
    // Tariftyp-Statistiken
    const tariffStats = await Performance.aggregate([
      { $match: { ...doctorFilter, serviceDatetime: dateFilter } },
      {
        $group: {
          _id: '$tariffType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalPrice' }
        }
      }
    ]);
    
    // Job-Statistiken
    const jobStats = await BillingJob.aggregate([
      { $match: { ...doctorFilter, createdAt: dateFilter } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        performanceStats: stats,
        tariffStats: tariffStats,
        jobStats: jobStats
      }
    });
    
  } catch (error) {
    console.error('Statistics API Fehler:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;