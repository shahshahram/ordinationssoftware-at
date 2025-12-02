const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const DekursEntry = require('../models/DekursEntry');
const DekursVorlage = require('../models/DekursVorlage');
const PatientExtended = require('../models/PatientExtended');
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer-Konfiguration für Foto-Uploads
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads/dekurs-photos';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `dekurs-${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const photoUpload = multer({ 
  storage: photoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB Limit für Fotos
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien (JPEG, PNG, GIF, WebP) sind erlaubt!'));
    }
  }
});

// @route   POST /api/dekurs
// @desc    Neuen Dekurs-Eintrag erstellen
// @access  Private
router.post('/', auth, [
  body('patientId').notEmpty().withMessage('Patient-ID ist erforderlich'),
  body('visitReason').optional().isLength({ max: 1000 }),
  body('visitType').optional().isIn(['appointment', 'phone', 'emergency', 'follow-up', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      patientId,
      encounterId,
      entryDate,
      clinicalObservations,
      progressChecks,
      findings,
      medicationChanges,
      treatmentDetails,
      psychosocialFactors,
      notes,
      visitReason,
      visitType,
      linkedDiagnoses,
      linkedMedications,
      linkedDocuments,
      templateId
    } = req.body;

    // Prüfe ob Patient existiert
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient nicht gefunden' });
    }

    // Automatische Verknüpfung mit Termin (wenn nicht angegeben)
    let finalEncounterId = encounterId;
    if (!finalEncounterId) {
      // Suche nach dem nächsten oder letzten Termin des Patienten (heute oder in den letzten 7 Tagen)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Suche zuerst nach einem Termin heute
      let appointment = await Appointment.findOne({
        patient: patientId,
        startTime: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Heute + 1 Tag
        }
      }).sort({ startTime: 1 }); // Nächster Termin heute
      
      // Wenn kein Termin heute, suche nach dem letzten Termin in den letzten 7 Tagen
      if (!appointment) {
        appointment = await Appointment.findOne({
          patient: patientId,
          startTime: {
            $gte: sevenDaysAgo,
            $lt: today
          }
        }).sort({ startTime: -1 }); // Letzter Termin
      }
      
      if (appointment) {
        finalEncounterId = appointment._id;
      }
    } else {
      // Prüfe ob angegebener Termin existiert
      const appointment = await Appointment.findById(finalEncounterId);
      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Termin nicht gefunden' });
      }
      // Prüfe ob Termin zum Patienten gehört
      if (appointment.patient.toString() !== patientId) {
        return res.status(400).json({ success: false, message: 'Termin gehört nicht zu diesem Patienten' });
      }
    }

    // Lade Vorlage falls angegeben
    let template = null;
    if (templateId) {
      template = await DekursVorlage.findById(templateId);
      if (template && template.isActive) {
        template.incrementUsage();
      }
    }

    // Bereinige linkedDiagnoses: Entferne leere diagnosisId-Werte
    const cleanedLinkedDiagnoses = (linkedDiagnoses || []).map(diag => {
      const cleaned = {
        icd10Code: diag.icd10Code || '',
        display: diag.display || '',
        side: diag.side && ['left', 'right', 'bilateral'].includes(diag.side) ? diag.side : ''
      };
      // Nur diagnosisId hinzufügen, wenn es nicht leer ist und eine gültige ObjectId ist
      if (diag.diagnosisId && diag.diagnosisId.trim() !== '' && mongoose.Types.ObjectId.isValid(diag.diagnosisId)) {
        cleaned.diagnosisId = diag.diagnosisId;
      }
      return cleaned;
    });

    // Bereinige linkedMedications: Entferne leere medicationId-Werte und stelle sicher, dass name vorhanden ist
    const cleanedLinkedMedications = (linkedMedications || [])
      .filter(med => med.name && med.name.trim() !== '') // Filtere Einträge ohne Name
      .map(med => {
        const cleaned = {
          name: med.name.trim(),
          dosage: med.dosage || '',
          frequency: med.frequency || '',
          changeType: med.changeType || 'added'
        };
        // Nur medicationId hinzufügen, wenn es nicht leer ist und eine gültige ObjectId ist
        if (med.medicationId && med.medicationId.trim() !== '' && mongoose.Types.ObjectId.isValid(med.medicationId)) {
          cleaned.medicationId = med.medicationId;
        }
        return cleaned;
      });

    // Erstelle Dekurs-Eintrag
    const dekursEntry = new DekursEntry({
      patientId,
      encounterId: finalEncounterId || undefined,
      entryDate: entryDate ? new Date(entryDate) : new Date(),
      createdBy: req.user.id,
      clinicalObservations,
      progressChecks,
      findings,
      medicationChanges,
      treatmentDetails,
      psychosocialFactors,
      notes,
      visitReason,
      visitType: visitType || 'appointment',
      linkedDiagnoses: cleanedLinkedDiagnoses,
      linkedMedications: cleanedLinkedMedications,
      linkedDocuments: linkedDocuments || [],
      templateId: template ? template._id : undefined,
      templateName: template ? template.name : undefined,
      status: 'draft'
    });

    await dekursEntry.save();

    // Populate für Response
    await dekursEntry.populate([
      { path: 'createdBy', select: 'firstName lastName title' },
      { path: 'encounterId', select: 'startTime endTime service' },
      { path: 'patientId', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Dekurs-Eintrag erfolgreich erstellt',
      data: dekursEntry
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Dekurs-Eintrags:', error);
    console.error('Fehler-Stack:', error.stack);
    console.error('Fehler-Details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    res.status(500).json({ 
      success: false, 
      message: 'Server-Fehler', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/dekurs/patient/:patientId
// @desc    Alle Dekurs-Einträge eines Patienten abrufen
// @access  Private
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { 
      limit = 50, 
      skip = 0, 
      status,
      startDate,
      endDate,
      search
    } = req.query;

    // Prüfe ob Patient existiert
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient nicht gefunden' });
    }

    // Baue Query
    const query = { patientId };
    if (status) {
      query.status = status;
    }
    if (startDate || endDate) {
      query.entryDate = {};
      if (startDate) query.entryDate.$gte = new Date(startDate);
      if (endDate) query.entryDate.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { clinicalObservations: { $regex: search, $options: 'i' } },
        { progressChecks: { $regex: search, $options: 'i' } },
        { findings: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { visitReason: { $regex: search, $options: 'i' } }
      ];
    }

    const dekursEntries = await DekursEntry.find(query)
      .populate('createdBy', 'firstName lastName title')
      .populate('encounterId', 'startTime endTime service')
      .populate('linkedDiagnoses.diagnosisId', 'code display status')
      .populate('linkedMedications.medicationId', 'name activeIngredient')
      .populate('linkedDocuments.documentId', 'title type documentNumber')
      .sort({ entryDate: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await DekursEntry.countDocuments(query);

    res.json({
      success: true,
      data: dekursEntries,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: (parseInt(skip) + parseInt(limit)) < total
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Dekurs-Einträge:', error);
    res.status(500).json({ success: false, message: 'Server-Fehler', error: error.message });
  }
});

// ========== SPEZIFISCHE ROUTEN (MÜSSEN VOR /:id KOMMEN) ==========

// @route   GET /api/dekurs/patient/:patientId
// @desc    Alle Dekurs-Einträge eines Patienten abrufen
// @access  Private
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { 
      limit = 50, 
      skip = 0, 
      status,
      startDate,
      endDate,
      search
    } = req.query;

    // Prüfe ob Patient existiert
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient nicht gefunden' });
    }

    // Baue Query
    const query = { patientId };
    if (status) {
      query.status = status;
    }
    if (startDate || endDate) {
      query.entryDate = {};
      if (startDate) query.entryDate.$gte = new Date(startDate);
      if (endDate) query.entryDate.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { clinicalObservations: { $regex: search, $options: 'i' } },
        { progressChecks: { $regex: search, $options: 'i' } },
        { findings: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { visitReason: { $regex: search, $options: 'i' } }
      ];
    }

    const dekursEntries = await DekursEntry.find(query)
      .populate('createdBy', 'firstName lastName title')
      .populate('encounterId', 'startTime endTime service')
      .populate('linkedDiagnoses.diagnosisId', 'code display status')
      .populate('linkedMedications.medicationId', 'name activeIngredient')
      .populate('linkedDocuments.documentId', 'title type documentNumber')
      .sort({ entryDate: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await DekursEntry.countDocuments(query);

    res.json({
      success: true,
      data: dekursEntries,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: (parseInt(skip) + parseInt(limit)) < total
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Dekurs-Einträge:', error);
    res.status(500).json({ success: false, message: 'Server-Fehler', error: error.message });
  }
});

// @route   GET /api/dekurs/patient/:patientId/export
// @desc    Dekurs für Arztbrief exportieren
// @access  Private
router.get('/patient/:patientId/export', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate, finalizedOnly = true } = req.query;

    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient nicht gefunden' });
    }

    // Baue Query
    const query = { patientId };
    if (finalizedOnly === 'true') {
      query.status = 'finalized';
    }
    if (startDate || endDate) {
      query.entryDate = {};
      if (startDate) query.entryDate.$gte = new Date(startDate);
      if (endDate) query.entryDate.$lte = new Date(endDate);
    }

    const dekursEntries = await DekursEntry.find(query)
      .populate('createdBy', 'firstName lastName title')
      .populate('encounterId', 'startTime endTime')
      .sort({ entryDate: 1 }); // Chronologisch aufsteigend für Export
    
    // Konvertiere zu Objekten und füge fullText hinzu
    const entriesData = dekursEntries.map(entry => {
      const entryObj = entry.toObject();
      entryObj.fullText = entry.fullText; // Virtual-Feld hinzufügen
      return entryObj;
    });

    // Formatiere für Arztbrief
    const exportData = {
      patient: {
        name: `${patient.firstName} ${patient.lastName}`,
        dateOfBirth: patient.dateOfBirth,
        svnr: patient.socialSecurityNumber
      },
      entries: entriesData.map(entry => ({
        date: entry.entryDate,
        doctor: entry.createdBy ? `${entry.createdBy.title || ''} ${entry.createdBy.firstName} ${entry.createdBy.lastName}`.trim() : 'Unbekannt',
        visitType: entry.visitType,
        visitReason: entry.visitReason,
        fullText: entry.fullText || '',
        clinicalObservations: entry.clinicalObservations,
        progressChecks: entry.progressChecks,
        findings: entry.findings,
        medicationChanges: entry.medicationChanges,
        treatmentDetails: entry.treatmentDetails,
        psychosocialFactors: entry.psychosocialFactors,
        notes: entry.notes,
        linkedDiagnoses: entry.linkedDiagnoses,
        linkedMedications: entry.linkedMedications
      })),
      summary: {
        totalEntries: entriesData.length,
        dateRange: {
          start: startDate ? new Date(startDate) : entriesData[0]?.entryDate,
          end: endDate ? new Date(endDate) : entriesData[entriesData.length - 1]?.entryDate
        }
      }
    };

    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Fehler beim Exportieren des Dekurs:', error);
    res.status(500).json({ success: false, message: 'Server-Fehler', error: error.message });
  }
});

// ========== VORLAGEN-ROUTEN ==========

// @route   GET /api/dekurs/vorlagen
// @desc    Alle aktiven Vorlagen abrufen
// @access  Private
router.get('/vorlagen', auth, async (req, res) => {
  try {
    const { category, search } = req.query;
    
    const query = { isActive: true };
    if (category) {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const vorlagen = await DekursVorlage.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ usageCount: -1, name: 1 });

    res.json({
      success: true,
      data: vorlagen
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Vorlagen:', error);
    res.status(500).json({ success: false, message: 'Server-Fehler', error: error.message });
  }
});

// @route   POST /api/dekurs/vorlagen
// @desc    Neue Vorlage erstellen
// @access  Private (nur für berechtigte Benutzer)
router.post('/vorlagen', auth, [
  body('name').notEmpty().withMessage('Vorlagenname ist erforderlich'),
  body('category').optional().isIn(['allgemein', 'kardiologie', 'pneumologie', 'gastroenterologie', 'neurologie', 'orthopaedie', 'dermatologie', 'gynaekologie', 'paediatrie', 'notfall', 'vorsorge', 'sonstiges'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    console.log('Backend: Erstelle Vorlage mit Daten:', JSON.stringify(req.body, null, 2));
    console.log('Backend: Template-Daten:', JSON.stringify(req.body.template, null, 2));

    const vorlage = new DekursVorlage({
      ...req.body,
      createdBy: req.user.id
    });

    // Stelle sicher, dass template-Objekt vollständig ist
    if (req.body.template) {
      vorlage.template = {
        clinicalObservations: req.body.template.clinicalObservations || '',
        progressChecks: req.body.template.progressChecks || '',
        findings: req.body.template.findings || '',
        medicationChanges: req.body.template.medicationChanges || '',
        treatmentDetails: req.body.template.treatmentDetails || '',
        psychosocialFactors: req.body.template.psychosocialFactors || '',
        notes: req.body.template.notes || '',
        visitReason: req.body.template.visitReason || '',
        visitType: req.body.template.visitType || 'appointment',
      };
    }

    await vorlage.save();

    console.log('Backend: Vorlage gespeichert:', JSON.stringify(vorlage.toObject(), null, 2));

    res.status(201).json({
      success: true,
      message: 'Vorlage erfolgreich erstellt',
      data: vorlage
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Vorlage:', error);
    res.status(500).json({ success: false, message: 'Server-Fehler', error: error.message });
  }
});

// @route   PUT /api/dekurs/vorlagen/:id
// @desc    Vorlage aktualisieren
// @access  Private (nur für berechtigte Benutzer)
router.put('/vorlagen/:id', auth, async (req, res) => {
  try {
    const vorlage = await DekursVorlage.findById(req.params.id);
    if (!vorlage) {
      return res.status(404).json({ success: false, message: 'Vorlage nicht gefunden' });
    }

    // Prüfe Berechtigung (nur Ersteller oder Admin)
    if (vorlage.createdBy.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Keine Berechtigung' });
    }

    console.log('Backend: Aktualisiere Vorlage mit Daten:', JSON.stringify(req.body, null, 2));
    console.log('Backend: Template-Daten:', JSON.stringify(req.body.template, null, 2));

    // Aktualisiere alle Felder außer template
    Object.keys(req.body).forEach(key => {
      if (key !== 'template' && key !== '_id' && key !== 'createdBy') {
        vorlage[key] = req.body[key];
      }
    });

    // Stelle sicher, dass template-Objekt vollständig aktualisiert wird
    if (req.body.template) {
      vorlage.template = {
        clinicalObservations: req.body.template.clinicalObservations || '',
        progressChecks: req.body.template.progressChecks || '',
        findings: req.body.template.findings || '',
        medicationChanges: req.body.template.medicationChanges || '',
        treatmentDetails: req.body.template.treatmentDetails || '',
        psychosocialFactors: req.body.template.psychosocialFactors || '',
        notes: req.body.template.notes || '',
        visitReason: req.body.template.visitReason || '',
        visitType: req.body.template.visitType || 'appointment',
      };
    }

    await vorlage.save();

    console.log('Backend: Vorlage aktualisiert:', JSON.stringify(vorlage.toObject(), null, 2));

    res.json({
      success: true,
      message: 'Vorlage erfolgreich aktualisiert',
      data: vorlage
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Vorlage:', error);
    res.status(500).json({ success: false, message: 'Server-Fehler', error: error.message });
  }
});

// @route   DELETE /api/dekurs/vorlagen/:id
// @desc    Vorlage löschen (soft delete: isActive = false)
// @access  Private (nur für berechtigte Benutzer)
router.delete('/vorlagen/:id', auth, async (req, res) => {
  try {
    const vorlage = await DekursVorlage.findById(req.params.id);
    if (!vorlage) {
      return res.status(404).json({ success: false, message: 'Vorlage nicht gefunden' });
    }

    // Prüfe Berechtigung (nur Ersteller oder Admin)
    if (vorlage.createdBy.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Keine Berechtigung' });
    }

    vorlage.isActive = false;
    await vorlage.save();

    res.json({
      success: true,
      message: 'Vorlage erfolgreich deaktiviert'
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Vorlage:', error);
    res.status(500).json({ success: false, message: 'Server-Fehler', error: error.message });
  }
});

// ========== DEKURS-EINTRAG-ROUTEN ==========

// @route   GET /api/dekurs/:id
// @desc    Einzelnen Dekurs-Eintrag abrufen
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const dekursEntry = await DekursEntry.findById(req.params.id)
      .populate('createdBy', 'firstName lastName title')
      .populate('encounterId', 'startTime endTime service doctor')
      .populate('patientId', 'firstName lastName dateOfBirth')
      .populate('linkedDiagnoses.diagnosisId', 'code display status')
      .populate('linkedMedications.medicationId', 'name activeIngredient')
      .populate('linkedDocuments.documentId', 'title type documentNumber');

    if (!dekursEntry) {
      return res.status(404).json({ success: false, message: 'Dekurs-Eintrag nicht gefunden' });
    }

    res.json({
      success: true,
      data: dekursEntry
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Dekurs-Eintrags:', error);
    res.status(500).json({ success: false, message: 'Server-Fehler', error: error.message });
  }
});

// @route   PUT /api/dekurs/:id
// @desc    Dekurs-Eintrag bearbeiten (nur wenn draft)
// @access  Private
router.put('/:id', auth, [
  body('visitReason').optional().isLength({ max: 1000 }),
  body('visitType').optional().isIn(['appointment', 'phone', 'emergency', 'follow-up', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const dekursEntry = await DekursEntry.findById(req.params.id);
    if (!dekursEntry) {
      return res.status(404).json({ success: false, message: 'Dekurs-Eintrag nicht gefunden' });
    }

    // Prüfe ob bearbeitbar
    if (!dekursEntry.canBeEdited()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dekurs-Eintrag ist bereits finalisiert und kann nicht mehr bearbeitet werden' 
      });
    }

    // Update Felder
    const updatableFields = [
      'clinicalObservations',
      'progressChecks',
      'findings',
      'medicationChanges',
      'treatmentDetails',
      'psychosocialFactors',
      'notes',
      'visitReason',
      'visitType',
      'linkedDocuments'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        dekursEntry[field] = req.body[field];
      }
    });

    // Bereinige und aktualisiere linkedDiagnoses
    if (req.body.linkedDiagnoses !== undefined) {
      const cleanedLinkedDiagnoses = (req.body.linkedDiagnoses || []).map(diag => {
        const cleaned = {
          icd10Code: diag.icd10Code || '',
          display: diag.display || '',
          side: diag.side && ['left', 'right', 'bilateral'].includes(diag.side) ? diag.side : ''
        };
        // Nur diagnosisId hinzufügen, wenn es nicht leer ist und eine gültige ObjectId ist
        if (diag.diagnosisId && diag.diagnosisId.trim() !== '' && mongoose.Types.ObjectId.isValid(diag.diagnosisId)) {
          cleaned.diagnosisId = diag.diagnosisId;
        }
        return cleaned;
      });
      dekursEntry.linkedDiagnoses = cleanedLinkedDiagnoses;
    }

    // Bereinige und aktualisiere linkedMedications
    if (req.body.linkedMedications !== undefined) {
      const cleanedLinkedMedications = (req.body.linkedMedications || [])
        .filter(med => med.name && med.name.trim() !== '') // Filtere Einträge ohne Name
        .map(med => {
          const cleaned = {
            name: med.name.trim(),
            dosage: med.dosage || '',
            frequency: med.frequency || '',
            changeType: med.changeType || 'added'
          };
          // Nur medicationId hinzufügen, wenn es nicht leer ist und eine gültige ObjectId ist
          if (med.medicationId && med.medicationId.trim() !== '' && mongoose.Types.ObjectId.isValid(med.medicationId)) {
            cleaned.medicationId = med.medicationId;
          }
          return cleaned;
        });
      dekursEntry.linkedMedications = cleanedLinkedMedications;
    }

    await dekursEntry.save();

    await dekursEntry.populate([
      { path: 'createdBy', select: 'firstName lastName title' },
      { path: 'encounterId', select: 'startTime endTime service' },
      { path: 'patientId', select: 'firstName lastName' }
    ]);

    res.json({
      success: true,
      message: 'Dekurs-Eintrag erfolgreich aktualisiert',
      data: dekursEntry
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Dekurs-Eintrags:', error);
    res.status(500).json({ success: false, message: 'Server-Fehler', error: error.message });
  }
});

// @route   DELETE /api/dekurs/:id
// @desc    Dekurs-Eintrag löschen (nur wenn draft)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const dekursEntry = await DekursEntry.findById(req.params.id);
    if (!dekursEntry) {
      return res.status(404).json({ success: false, message: 'Dekurs-Eintrag nicht gefunden' });
    }

    // Prüfe ob löschbar
    if (!dekursEntry.canBeEdited()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dekurs-Eintrag ist bereits finalisiert und kann nicht gelöscht werden' 
      });
    }

    // Lösche angehängte Fotos
    if (dekursEntry.attachments && dekursEntry.attachments.length > 0) {
      dekursEntry.attachments.forEach(attachment => {
        const filePath = path.join(__dirname, '..', attachment.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    await dekursEntry.deleteOne();

    res.json({
      success: true,
      message: 'Dekurs-Eintrag erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Dekurs-Eintrags:', error);
    res.status(500).json({ success: false, message: 'Server-Fehler', error: error.message });
  }
});

// @route   POST /api/dekurs/:id/finalize
// @desc    Dekurs-Eintrag finalisieren (revisionssicher)
// @access  Private
router.post('/:id/finalize', auth, async (req, res) => {
  try {
    const dekursEntry = await DekursEntry.findById(req.params.id);
    if (!dekursEntry) {
      return res.status(404).json({ success: false, message: 'Dekurs-Eintrag nicht gefunden' });
    }

    if (dekursEntry.status === 'finalized') {
      return res.status(400).json({ 
        success: false, 
        message: 'Dekurs-Eintrag ist bereits finalisiert' 
      });
    }

    await dekursEntry.finalize(req.user.id);

    await dekursEntry.populate([
      { path: 'createdBy', select: 'firstName lastName title' },
      { path: 'encounterId', select: 'startTime endTime service' },
      { path: 'patientId', select: 'firstName lastName' }
    ]);

    res.json({
      success: true,
      message: 'Dekurs-Eintrag erfolgreich finalisiert',
      data: dekursEntry
    });
  } catch (error) {
    console.error('Fehler beim Finalisieren des Dekurs-Eintrags:', error);
    res.status(500).json({ success: false, message: 'Server-Fehler', error: error.message });
  }
});

// @route   POST /api/dekurs/:id/attach-photo
// @desc    Foto zu Dekurs-Eintrag hinzufügen
// @access  Private
router.post('/:id/attach-photo', auth, photoUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Keine Datei hochgeladen' });
    }

    const dekursEntry = await DekursEntry.findById(req.params.id);
    if (!dekursEntry) {
      // Lösche hochgeladene Datei wenn Eintrag nicht existiert
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Dekurs-Eintrag nicht gefunden' });
    }

    // Prüfe ob bearbeitbar
    if (!dekursEntry.canBeEdited()) {
      // Lösche hochgeladene Datei
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: 'Dekurs-Eintrag ist bereits finalisiert und kann nicht mehr bearbeitet werden' 
      });
    }

    // Füge Foto hinzu
    dekursEntry.attachments.push({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedAt: new Date()
    });

    await dekursEntry.save();

    res.json({
      success: true,
      message: 'Foto erfolgreich hinzugefügt',
      data: {
        attachment: dekursEntry.attachments[dekursEntry.attachments.length - 1]
      }
    });
  } catch (error) {
    // Lösche hochgeladene Datei bei Fehler
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Fehler beim Hinzufügen des Fotos:', error);
    res.status(500).json({ success: false, message: 'Server-Fehler', error: error.message });
  }
});

// @route   DELETE /api/dekurs/:id/attachment/:attachmentIndex
// @desc    Foto von Dekurs-Eintrag entfernen
// @access  Private
router.delete('/:id/attachment/:attachmentIndex', auth, async (req, res) => {
  try {
    const dekursEntry = await DekursEntry.findById(req.params.id);
    if (!dekursEntry) {
      return res.status(404).json({ success: false, message: 'Dekurs-Eintrag nicht gefunden' });
    }

    // Prüfe ob bearbeitbar
    if (!dekursEntry.canBeEdited()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dekurs-Eintrag ist bereits finalisiert und kann nicht mehr bearbeitet werden' 
      });
    }

    const attachmentIndex = parseInt(req.params.attachmentIndex);
    if (attachmentIndex < 0 || attachmentIndex >= dekursEntry.attachments.length) {
      return res.status(400).json({ success: false, message: 'Ungültiger Anhang-Index' });
    }

    const attachment = dekursEntry.attachments[attachmentIndex];
    const filePath = path.join(__dirname, '..', attachment.path);
    
    // Lösche Datei
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Entferne aus Array
    dekursEntry.attachments.splice(attachmentIndex, 1);
    await dekursEntry.save();

    res.json({
      success: true,
      message: 'Foto erfolgreich entfernt'
    });
  } catch (error) {
    console.error('Fehler beim Entfernen des Fotos:', error);
    res.status(500).json({ success: false, message: 'Server-Fehler', error: error.message });
  }
});

module.exports = router;
