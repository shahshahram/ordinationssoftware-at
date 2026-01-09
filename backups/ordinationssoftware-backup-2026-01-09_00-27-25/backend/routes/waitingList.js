const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const WaitingList = require('../models/WaitingList');
const PatientExtended = require('../models/PatientExtended'); // Produktivsystem-Standard
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');

// GET /api/waiting-list - Alle Wartelisten-Einträge abrufen
router.get('/', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const { status, patientId, locationId, doctorId, serviceId, limit = 100, sort = 'position' } = req.query;
    
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (patientId) {
      filter.patient = patientId;
    }
    
    if (locationId) {
      filter.location = locationId;
    }
    
    if (doctorId) {
      filter.doctor = doctorId;
    }
    
    if (serviceId) {
      filter.service = serviceId;
    }
    
    const sortOrder = sort === 'position' ? { position: 1, createdAt: 1 } : { createdAt: -1 };
    const limitNum = parseInt(limit);
    
    const entries = await WaitingList.find(filter)
      .populate('patient', 'firstName lastName email phone')
      .populate('service', 'name code')
      .populate('doctor', 'displayName roleHint')
      .populate('location', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort(sortOrder)
      .limit(limitNum)
      .lean();
    
    const count = await WaitingList.countDocuments(filter);
    
    res.json({
      success: true,
      data: entries,
      count: count
    });
  } catch (error) {
    console.error('Error fetching waiting list:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Warteliste',
      error: error.message
    });
  }
});

// GET /api/waiting-list/count - Anzahl der Wartelisten-Einträge abrufen
router.get('/count', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const { status = 'waiting', locationId } = req.query;
    const filter = { status };
    if (locationId) {
      filter.location = locationId;
    }
    const count = await WaitingList.countDocuments(filter);
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error fetching waiting list count:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Anzahl der Wartelisten-Einträge',
      error: error.message
    });
  }
});

// GET /api/waiting-list/:id - Einzelnen Wartelisten-Eintrag abrufen
router.get('/:id', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const entry = await WaitingList.findById(req.params.id)
      .populate('patient', 'firstName lastName email phone')
      .populate('service', 'name code')
      .populate('doctor', 'displayName roleHint')
      .populate('location', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Wartelisten-Eintrag nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    console.error('Error fetching waiting list entry:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Wartelisten-Eintrags',
      error: error.message
    });
  }
});

// POST /api/waiting-list - Neuen Wartelisten-Eintrag erstellen
router.post('/', 
  auth, 
  checkPermission('patients.write'),
  [
    body('patient').notEmpty().withMessage('Patient ist erforderlich'),
    body('reason').notEmpty().trim().withMessage('Grund ist erforderlich'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    body('status').optional().isIn(['waiting', 'in_progress', 'completed', 'cancelled']),
    body('contactMethod').optional().isIn(['all', 'phone', 'email', 'sms']),
    body('service').optional().custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Ungültige Service-ID');
      }
      return true;
    }),
    body('doctor').optional().custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Ungültige Arzt-ID');
      }
      return true;
    }),
    body('location').optional().custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Ungültige Standort-ID');
      }
      return true;
    }),
    body('preferredDate').optional().isISO8601().withMessage('Ungültiges Datum')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validierungsfehler',
          errors: errors.array()
        });
      }
      
      const { patient, service, doctor, location, reason, priority, status, preferredDate, notes, contactMethod } = req.body;
      
      // Prüfe ob Patient existiert (Produktivsystem: PatientExtended)
      const patientExists = await PatientExtended.findById(patient);
      if (!patientExists) {
        return res.status(404).json({
          success: false,
          message: 'Patient nicht gefunden'
        });
      }
      
      // Erstelle entryData Objekt
      const entryData = {
        patient,
        reason,
        priority: priority || 'normal',
        status: status || 'waiting',
        contactMethod: contactMethod || 'all',
        createdBy: req.user.id,
        notes: notes || ''
      };
      
      // Füge optionale Felder nur hinzu, wenn sie vorhanden sind
      if (service && service.trim() !== '') {
        if (mongoose.Types.ObjectId.isValid(service)) {
          entryData.service = service;
        }
      }
      
      if (doctor && doctor.trim() !== '') {
        if (mongoose.Types.ObjectId.isValid(doctor)) {
          entryData.doctor = doctor;
        }
      }
      
      if (location && location.trim() !== '') {
        if (mongoose.Types.ObjectId.isValid(location)) {
          entryData.location = location;
        }
      }
      
      if (preferredDate && preferredDate.trim() !== '') {
        entryData.preferredDate = new Date(preferredDate);
      }
      
      // Prüfe auf doppelten Eintrag
      const existingEntryQuery = {
        patient,
        status: 'waiting'
      };
      
      if (service && service.trim() !== '') {
        existingEntryQuery.service = service;
      } else {
        existingEntryQuery.service = { $exists: false };
      }
      
      if (doctor && doctor.trim() !== '') {
        existingEntryQuery.doctor = doctor;
      } else {
        existingEntryQuery.doctor = { $exists: false };
      }
      
      if (location && location.trim() !== '') {
        existingEntryQuery.location = location;
      } else {
        existingEntryQuery.location = { $exists: false };
      }
      
      const existingEntry = await WaitingList.findOne(existingEntryQuery);
      if (existingEntry) {
        return res.status(400).json({
          success: false,
          message: 'Patient ist bereits in der Warteliste'
        });
      }
      
      // Erstelle neuen Eintrag
      const entry = new WaitingList(entryData);
      await entry.save();
      
      // Lade den vollständigen Eintrag mit Populate
      const savedEntry = await WaitingList.findById(entry._id)
        .populate('patient', 'firstName lastName email phone')
        .populate('service', 'name code')
        .populate('doctor', 'displayName roleHint')
        .populate('location', 'name')
        .populate('createdBy', 'firstName lastName');
      
      res.status(201).json({
        success: true,
        data: savedEntry,
        message: 'Wartelisten-Eintrag erfolgreich erstellt'
      });
    } catch (error) {
      console.error('Error creating waiting list entry:', error);
      if (process.env.NODE_ENV === 'development') {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          errors: error.errors,
          body: req.body
        });
      }
      res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen des Wartelisten-Eintrags',
        error: error.message
      });
    }
  }
);

// PUT /api/waiting-list/:id - Wartelisten-Eintrag aktualisieren
router.put('/:id', 
  auth, 
  checkPermission('patients.write'),
  [
    body('reason').optional().notEmpty().trim(),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    body('status').optional().isIn(['waiting', 'in_progress', 'completed', 'cancelled']),
    body('contactMethod').optional().isIn(['all', 'phone', 'email', 'sms']),
    body('service').optional().custom((value) => {
      if (value && value.trim() !== '' && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Ungültige Service-ID');
      }
      return true;
    }),
    body('doctor').optional().custom((value) => {
      if (value && value.trim() !== '' && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Ungültige Arzt-ID');
      }
      return true;
    }),
    body('location').optional().custom((value) => {
      if (value && value.trim() !== '' && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Ungültige Standort-ID');
      }
      return true;
    }),
    body('preferredDate').optional().isISO8601().withMessage('Ungültiges Datum')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validierungsfehler',
          errors: errors.array()
        });
      }
      
      const entry = await WaitingList.findById(req.params.id);
      if (!entry) {
        return res.status(404).json({
          success: false,
          message: 'Wartelisten-Eintrag nicht gefunden'
        });
      }
      
      // Aktualisiere Felder
      if (req.body.reason !== undefined) entry.reason = req.body.reason;
      if (req.body.priority !== undefined) entry.priority = req.body.priority;
      if (req.body.status !== undefined) entry.status = req.body.status;
      if (req.body.notes !== undefined) entry.notes = req.body.notes;
      if (req.body.contactMethod !== undefined) entry.contactMethod = req.body.contactMethod;
      if (req.body.preferredDate !== undefined) {
        entry.preferredDate = req.body.preferredDate ? new Date(req.body.preferredDate) : null;
      }
      
      // Optionale Felder
      if (req.body.service !== undefined) {
        if (req.body.service && req.body.service.trim() !== '' && mongoose.Types.ObjectId.isValid(req.body.service)) {
          entry.service = req.body.service;
        } else {
          entry.service = undefined;
        }
      }
      
      if (req.body.doctor !== undefined) {
        if (req.body.doctor && req.body.doctor.trim() !== '' && mongoose.Types.ObjectId.isValid(req.body.doctor)) {
          entry.doctor = req.body.doctor;
        } else {
          entry.doctor = undefined;
        }
      }
      
      if (req.body.location !== undefined) {
        if (req.body.location && req.body.location.trim() !== '' && mongoose.Types.ObjectId.isValid(req.body.location)) {
          entry.location = req.body.location;
        } else {
          entry.location = undefined;
        }
      }
      
      entry.updatedBy = req.user.id;
      
      await entry.save();
      
      // Lade den aktualisierten Eintrag mit Populate
      const updatedEntry = await WaitingList.findById(entry._id)
        .populate('patient', 'firstName lastName email phone')
        .populate('service', 'name code')
        .populate('doctor', 'displayName roleHint')
        .populate('location', 'name')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName');
      
      res.json({
        success: true,
        data: updatedEntry,
        message: 'Wartelisten-Eintrag erfolgreich aktualisiert'
      });
    } catch (error) {
      console.error('Error updating waiting list entry:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren des Wartelisten-Eintrags',
        error: error.message
      });
    }
  }
);

// DELETE /api/waiting-list/:id - Wartelisten-Eintrag löschen
router.delete('/:id', auth, checkPermission('patients.write'), async (req, res) => {
  try {
    const entry = await WaitingList.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Wartelisten-Eintrag nicht gefunden'
      });
    }
    
    await WaitingList.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Wartelisten-Eintrag erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting waiting list entry:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Wartelisten-Eintrags',
      error: error.message
    });
  }
});

module.exports = router;

