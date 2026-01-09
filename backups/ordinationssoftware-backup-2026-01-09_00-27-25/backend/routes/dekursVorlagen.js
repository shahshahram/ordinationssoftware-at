const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const DekursVorlage = require('../models/DekursVorlage');
const MedicalSpecialty = require('../models/MedicalSpecialty');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

// @route   GET /api/dekurs-vorlagen
// @desc    Alle Dekurs-Vorlagen abrufen (mit Filtern)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      specialty,
      icd10,
      locationId,
      activeOnly = 'true',
      isDefault,
      search
    } = req.query;

    const query = {};
    
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    
    if (specialty) {
      query.$or = [
        { specialty: specialty },
        { specialties: specialty }
      ];
    }
    
    if (icd10) {
      query.icd10 = icd10;
    }
    
    if (locationId) {
      query.$or = [
        { locationIds: { $in: [locationId] } },
        { locationIds: { $size: 0 } } // Auch globale Vorlagen
      ];
    }
    
    if (isDefault !== undefined) {
      query.isDefault = isDefault === 'true';
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { icd10: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const vorlagen = await DekursVorlage.find(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email')
      .populate('locationIds', 'name code')
      .sort({ sortOrder: 1, title: 1 })
      .lean();

    res.json({
      success: true,
      data: vorlagen,
      count: vorlagen.length
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Vorlagen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Vorlagen'
    });
  }
});

// @route   GET /api/dekurs-vorlagen/search
// @desc    Suche nach Vorlagen (für Autocomplete)
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { icd10, specialty, locationId, query: searchQuery } = req.query;

    const matchQuery = { isActive: true };
    
    if (icd10) {
      matchQuery.icd10 = icd10;
    }
    
    if (specialty) {
      matchQuery.$or = [
        { specialty: specialty },
        { specialties: specialty }
      ];
    }
    
    if (locationId) {
      matchQuery.$or = [
        { locationIds: { $in: [locationId] } },
        { locationIds: { $size: 0 } }
      ];
    }
    
    if (searchQuery) {
      matchQuery.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { code: { $regex: searchQuery, $options: 'i' } },
        { icd10: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    const vorlagen = await DekursVorlage.find(matchQuery)
      .select('_id code title icd10 icd10Title specialty specialties')
      .sort({ isDefault: -1, sortOrder: 1, title: 1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      data: vorlagen
    });
  } catch (error) {
    console.error('Fehler bei der Vorlagen-Suche:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Suche'
    });
  }
});

// @route   GET /api/dekurs-vorlagen/:id
// @desc    Einzelne Vorlage abrufen
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const vorlage = await DekursVorlage.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email')
      .populate('locationIds', 'name code');

    if (!vorlage) {
      return res.status(404).json({
        success: false,
        message: 'Vorlage nicht gefunden'
      });
    }

    console.log('🔍 GET /dekurs-vorlagen/:id - Vorlage geladen, linkedMedications:', JSON.stringify(vorlage.linkedMedications, null, 2));
    console.log('🔍 GET /dekurs-vorlagen/:id - vorlage.linkedMedications ist Array?', Array.isArray(vorlage.linkedMedications));
    console.log('🔍 GET /dekurs-vorlagen/:id - vorlage.linkedMedications.length:', vorlage.linkedMedications?.length);
    console.log('🔍 GET /dekurs-vorlagen/:id - vorlage.linkedMedications type:', typeof vorlage.linkedMedications);

    res.json({
      success: true,
      data: vorlage
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Vorlage:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Vorlage'
    });
  }
});

// @route   POST /api/dekurs-vorlagen
// @desc    Neue Vorlage erstellen
// @access  Private (Admin/Arzt)
router.post('/', auth, [
  body('code').trim().notEmpty().withMessage('Code ist erforderlich'),
  body('title').trim().notEmpty().withMessage('Titel ist erforderlich'),
  body('icd10').optional().trim(),
  body('specialty').optional().trim(),
  body('code').custom(async (value) => {
    const existing = await DekursVorlage.findOne({ code: value });
    if (existing) {
      throw new Error('Code existiert bereits');
    }
  })
], async (req, res) => {
  try {
    // Prüfe Berechtigung
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'arzt' && req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren und Ärzte können Vorlagen erstellen'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    const {
      code,
      title,
      icd10,
      icd10Title,
      specialty,
      specialties,
      locationIds,
      template,
      elga_structured,
      linkedMedications,
      isActive = true,
      isDefault = false,
      sortOrder = 0,
      tags = [],
      version = 1
    } = req.body;

    // Bereinige linkedMedications für POST
    const cleanedLinkedMedications = (linkedMedications || [])
      .filter(med => med.name && med.name.trim() !== '')
      .map(med => {
        const cleaned = {
          name: med.name.trim(),
          dosage: med.dosage || '',
          dosageUnit: med.dosageUnit || '',
          frequency: med.frequency || '',
          duration: med.duration || '',
          instructions: med.instructions || '',
          quantity: med.quantity !== undefined && med.quantity !== null ? med.quantity : undefined,
          quantityUnit: med.quantityUnit || '',
          route: med.route || 'oral',
          changeType: med.changeType || 'added',
          notes: med.notes || ''
        };
        // Nur medicationId hinzufügen, wenn es nicht leer ist und eine gültige ObjectId ist
        if (med.medicationId && med.medicationId.trim() !== '' && require('mongoose').Types.ObjectId.isValid(med.medicationId)) {
          cleaned.medicationId = med.medicationId;
        }
        // Datum-Felder hinzufügen, wenn vorhanden
        if (med.startDate) {
          cleaned.startDate = med.startDate instanceof Date ? med.startDate : new Date(med.startDate);
        }
        if (med.endDate) {
          cleaned.endDate = med.endDate instanceof Date ? med.endDate : new Date(med.endDate);
        }
        return cleaned;
      });

    const vorlage = new DekursVorlage({
      code: code.trim(),
      title: title.trim(),
      icd10: icd10?.trim() || '',
      icd10Title: icd10Title?.trim() || '',
      specialty: specialty?.trim() || '',
      specialties: Array.isArray(specialties) ? specialties : (specialty ? [specialty] : []),
      locationIds: Array.isArray(locationIds) ? locationIds : [],
      template: template || {},
      elga_structured: elga_structured || {},
      linkedMedications: cleanedLinkedMedications,
      isActive,
      isDefault,
      sortOrder: parseInt(sortOrder) || 0,
      tags: Array.isArray(tags) ? tags : [],
      version: parseInt(version) || 1,
      createdBy: req.user.id,
      lastModifiedBy: req.user.id
    });

    await vorlage.save();

    const populated = await DekursVorlage.findById(vorlage._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email')
      .populate('locationIds', 'name code');

    res.status(201).json({
      success: true,
      message: 'Vorlage erfolgreich erstellt',
      data: populated
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Vorlage:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Code existiert bereits'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Erstellen der Vorlage'
    });
  }
});

// @route   PUT /api/dekurs-vorlagen/:id
// @desc    Vorlage bearbeiten
// @access  Private (Admin/Arzt)
router.put('/:id', auth, [
  body('code').optional().trim().notEmpty().withMessage('Code darf nicht leer sein'),
  body('title').optional().trim().notEmpty().withMessage('Titel darf nicht leer sein'),
  body('code').optional().custom(async (value, { req }) => {
    if (value) {
      const existing = await DekursVorlage.findOne({ 
        code: value.trim(),
        _id: { $ne: req.params.id }
      });
      if (existing) {
        throw new Error('Code existiert bereits');
      }
    }
  })
], async (req, res) => {
  try {
    console.log('🔍 PUT /dekurs-vorlagen/:id - Request empfangen, ID:', req.params.id);
    console.log('🔍 PUT /dekurs-vorlagen/:id - Request Body Keys:', Object.keys(req.body));
    console.log('🔍 PUT /dekurs-vorlagen/:id - linkedMedications im Body vorhanden:', req.body.linkedMedications !== undefined);
    
    // Prüfe Berechtigung
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'arzt' && req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren und Ärzte können Vorlagen bearbeiten'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    const updateData = {
      lastModifiedBy: req.user.id,
      version: (req.body.version || 1) + 1
    };

    if (req.body.code !== undefined) updateData.code = req.body.code.trim();
    if (req.body.title !== undefined) updateData.title = req.body.title.trim();
    if (req.body.icd10 !== undefined) updateData.icd10 = req.body.icd10?.trim() || '';
    if (req.body.icd10Title !== undefined) updateData.icd10Title = req.body.icd10Title?.trim() || '';
    if (req.body.specialty !== undefined) updateData.specialty = req.body.specialty?.trim() || '';
    if (req.body.specialties !== undefined) updateData.specialties = Array.isArray(req.body.specialties) ? req.body.specialties : [];
    if (req.body.locationIds !== undefined) updateData.locationIds = Array.isArray(req.body.locationIds) ? req.body.locationIds : [];
    if (req.body.template !== undefined) updateData.template = req.body.template;
    if (req.body.elga_structured !== undefined) updateData.elga_structured = req.body.elga_structured;
    if (req.body.linkedMedications !== undefined) {
      console.log('🔍 PUT /dekurs-vorlagen/:id - linkedMedications im Request:', JSON.stringify(req.body.linkedMedications, null, 2));
      // Bereinige linkedMedications
      const cleanedLinkedMedications = (req.body.linkedMedications || [])
        .filter(med => med.name && med.name.trim() !== '')
        .map(med => {
          const cleaned = {
            name: med.name.trim(),
            dosage: med.dosage || '',
            dosageUnit: med.dosageUnit || '',
            frequency: med.frequency || '',
            duration: med.duration || '',
            instructions: med.instructions || '',
            quantity: med.quantity !== undefined && med.quantity !== null ? med.quantity : undefined,
            quantityUnit: med.quantityUnit || '',
            route: med.route || 'oral',
            changeType: med.changeType || 'added',
            notes: med.notes || ''
          };
          // Nur medicationId hinzufügen, wenn es nicht leer ist und eine gültige ObjectId ist
          if (med.medicationId && med.medicationId.trim() !== '' && require('mongoose').Types.ObjectId.isValid(med.medicationId)) {
            cleaned.medicationId = med.medicationId;
          }
          // Datum-Felder hinzufügen, wenn vorhanden
          if (med.startDate) {
            cleaned.startDate = med.startDate instanceof Date ? med.startDate : new Date(med.startDate);
          }
          if (med.endDate) {
            cleaned.endDate = med.endDate instanceof Date ? med.endDate : new Date(med.endDate);
          }
          return cleaned;
        });
      console.log('🔍 PUT /dekurs-vorlagen/:id - Bereinigte linkedMedications:', JSON.stringify(cleanedLinkedMedications, null, 2));
      updateData.linkedMedications = cleanedLinkedMedications;
    }
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
    if (req.body.isDefault !== undefined) updateData.isDefault = req.body.isDefault;
    if (req.body.sortOrder !== undefined) updateData.sortOrder = parseInt(req.body.sortOrder) || 0;
    if (req.body.tags !== undefined) updateData.tags = Array.isArray(req.body.tags) ? req.body.tags : [];

    // Wenn linkedMedications aktualisiert werden, müssen wir markModified verwenden
    let vorlage;
    if (req.body.linkedMedications !== undefined) {
      console.log('🔍 PUT /dekurs-vorlagen/:id - Verwende markModified für linkedMedications');
      // Für Subdocument-Arrays müssen wir findById verwenden, dann markModified und save
      vorlage = await DekursVorlage.findById(req.params.id);
      if (!vorlage) {
        return res.status(404).json({
          success: false,
          message: 'Vorlage nicht gefunden'
        });
      }
      console.log('🔍 PUT /dekurs-vorlagen/:id - Vorlage vor Update:', JSON.stringify(vorlage.linkedMedications, null, 2));
      
      // Aktualisiere alle anderen Felder
      if (updateData.code !== undefined) vorlage.code = updateData.code;
      if (updateData.title !== undefined) vorlage.title = updateData.title;
      if (updateData.icd10 !== undefined) vorlage.icd10 = updateData.icd10;
      if (updateData.icd10Title !== undefined) vorlage.icd10Title = updateData.icd10Title;
      if (updateData.specialty !== undefined) vorlage.specialty = updateData.specialty;
      if (updateData.specialties !== undefined) vorlage.specialties = updateData.specialties;
      if (updateData.locationIds !== undefined) vorlage.locationIds = updateData.locationIds;
      if (updateData.template !== undefined) vorlage.template = updateData.template;
      if (updateData.elga_structured !== undefined) vorlage.elga_structured = updateData.elga_structured;
      if (updateData.isActive !== undefined) vorlage.isActive = updateData.isActive;
      if (updateData.isDefault !== undefined) vorlage.isDefault = updateData.isDefault;
      if (updateData.sortOrder !== undefined) vorlage.sortOrder = updateData.sortOrder;
      if (updateData.tags !== undefined) vorlage.tags = updateData.tags;
      if (updateData.lastModifiedBy !== undefined) vorlage.lastModifiedBy = updateData.lastModifiedBy;
      if (updateData.version !== undefined) vorlage.version = updateData.version;
      
      // Setze linkedMedications direkt (wie in dekurs.js)
      vorlage.linkedMedications = updateData.linkedMedications;
      vorlage.markModified('linkedMedications');
      console.log('🔍 PUT /dekurs-vorlagen/:id - Vorlage nach Setzen von linkedMedications:', JSON.stringify(vorlage.linkedMedications, null, 2));
      console.log('🔍 PUT /dekurs-vorlagen/:id - Vorlage.isModified(linkedMedications):', vorlage.isModified('linkedMedications'));
      await vorlage.save();
      console.log('🔍 PUT /dekurs-vorlagen/:id - Vorlage nach save:', JSON.stringify(vorlage.linkedMedications, null, 2));
      
      // Lade die Vorlage erneut aus der Datenbank, um sicherzustellen, dass die Daten gespeichert wurden
      const savedVorlage = await DekursVorlage.findById(req.params.id)
        .populate('createdBy', 'firstName lastName email')
        .populate('lastModifiedBy', 'firstName lastName email')
        .populate('locationIds', 'name code');
      console.log('🔍 PUT /dekurs-vorlagen/:id - Vorlage aus DB nach save:', JSON.stringify(savedVorlage.linkedMedications, null, 2));
      console.log('🔍 PUT /dekurs-vorlagen/:id - savedVorlage.linkedMedications ist Array?', Array.isArray(savedVorlage.linkedMedications));
      console.log('🔍 PUT /dekurs-vorlagen/:id - savedVorlage.linkedMedications.length:', savedVorlage.linkedMedications?.length);
      
      // Verwende die neu geladene Vorlage für die Antwort
      vorlage = savedVorlage;
    } else {
      // Normale Aktualisierung ohne Subdocument-Arrays
      vorlage = await DekursVorlage.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('createdBy', 'firstName lastName email')
        .populate('lastModifiedBy', 'firstName lastName email')
        .populate('locationIds', 'name code');
    }
    
    console.log('🔍 PUT /dekurs-vorlagen/:id - Finale Vorlage mit linkedMedications:', JSON.stringify(vorlage.linkedMedications, null, 2));

    if (!vorlage) {
      return res.status(404).json({
        success: false,
        message: 'Vorlage nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Vorlage erfolgreich aktualisiert',
      data: vorlage
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Vorlage:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Code existiert bereits'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Aktualisieren der Vorlage'
    });
  }
});

// @route   DELETE /api/dekurs-vorlagen/:id
// @desc    Vorlage löschen
// @access  Private (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Prüfe Berechtigung
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Vorlagen löschen'
      });
    }

    const vorlage = await DekursVorlage.findByIdAndDelete(req.params.id);

    if (!vorlage) {
      return res.status(404).json({
        success: false,
        message: 'Vorlage nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Vorlage erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Vorlage:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Vorlage'
    });
  }
});

// @route   POST /api/dekurs-vorlagen/import/json
// @desc    Vorlagen aus JSON importieren
// @access  Private (Admin)
router.post('/import/json', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können Vorlagen importieren'
      });
    }

    const { vorlagen } = req.body;

    if (!Array.isArray(vorlagen)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiges Format: Erwartet Array von Vorlagen'
      });
    }

    const results = {
      created: 0,
      updated: 0,
      errors: []
    };

    for (const vorlageData of vorlagen) {
      try {
        // Mapping von JSON-Struktur zu Model
        const code = vorlageData.code || `${vorlageData.icd10}_${vorlageData.diagnose?.replace(/\s+/g, '_').toUpperCase()}`;
        const title = vorlageData.diagnose || vorlageData.title || 'Unbenannte Vorlage';
        
        const template = {
          visitReason: vorlageData.diagnose || vorlageData.visitReason || '',
          clinicalObservations: vorlageData.anamnese || vorlageData.clinicalObservations || '',
          findings: vorlageData.status || vorlageData.findings || '',
          progressChecks: vorlageData.beurteilung || vorlageData.progressChecks || '',
          treatmentDetails: vorlageData.therapie || vorlageData.treatmentDetails || '',
          notes: vorlageData.empfehlung || vorlageData.notes || '',
          psychosocialFactors: vorlageData.psychosocialFactors || '',
          medicationChanges: vorlageData.medicationChanges || ''
        };

        const existing = await DekursVorlage.findOne({ code: code.trim() });
        
        if (existing) {
          // Update
          existing.title = title;
          existing.icd10 = vorlageData.icd10 || '';
          existing.icd10Title = vorlageData.icd10_title || vorlageData.icd10Title || '';
          existing.specialty = vorlageData.specialty || 'allgemeinmedizin';
          existing.specialties = vorlageData.specialties || [vorlageData.specialty || 'allgemeinmedizin'];
          existing.template = template;
          existing.elga_structured = vorlageData.elga_structured || {};
          existing.lastModifiedBy = req.user.id;
          existing.version = (existing.version || 1) + 1;
          await existing.save();
          results.updated++;
        } else {
          // Create
          const newVorlage = new DekursVorlage({
            code: code.trim(),
            title: title,
            icd10: vorlageData.icd10 || '',
            icd10Title: vorlageData.icd10_title || vorlageData.icd10Title || '',
            specialty: vorlageData.specialty || 'allgemeinmedizin',
            specialties: vorlageData.specialties || [vorlageData.specialty || 'allgemeinmedizin'],
            template: template,
            elga_structured: vorlageData.elga_structured || {},
            isActive: true,
            isDefault: false,
            sortOrder: 0,
            tags: [],
            version: 1,
            createdBy: req.user.id,
            lastModifiedBy: req.user.id
          });
          await newVorlage.save();
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          vorlage: vorlageData.code || vorlageData.icd10,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Import abgeschlossen: ${results.created} erstellt, ${results.updated} aktualisiert`,
      data: results
    });
  } catch (error) {
    console.error('Fehler beim JSON-Import:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Import',
      error: error.message
    });
  }
});

// @route   GET /api/dekurs-vorlagen/export/:id/json
// @desc    Vorlage als JSON exportieren
// @access  Private
router.get('/export/:id/json', auth, async (req, res) => {
  try {
    const vorlage = await DekursVorlage.findById(req.params.id);
    
    if (!vorlage) {
      return res.status(404).json({
        success: false,
        message: 'Vorlage nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: vorlage
    });
  } catch (error) {
    console.error('Fehler beim JSON-Export:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Export'
    });
  }
});

// @route   GET /api/dekurs-vorlagen/export/:id/xml
// @desc    Vorlage als ELGA-XML exportieren
// @access  Private
router.get('/export/:id/xml', auth, async (req, res) => {
  try {
    const vorlage = await DekursVorlage.findById(req.params.id);
    
    if (!vorlage) {
      return res.status(404).json({
        success: false,
        message: 'Vorlage nicht gefunden'
      });
    }

    // ELGA CDA-Struktur generieren
    const elgaData = vorlage.elga_structured || {};
    const template = vorlage.template || {};

    const xmlData = {
      ClinicalDocument: {
        component: {
          structuredBody: {
            section: [
              {
                code: { '@_code': '10154-3', '@_displayName': 'Chief Complaint' },
                text: elgaData.chief_complaint || template.visitReason || ''
              },
              {
                code: { '@_code': '11348-0', '@_displayName': 'History of Present Illness' },
                text: elgaData.history_of_present_illness || template.clinicalObservations || ''
              },
              {
                code: { '@_code': '11329-0', '@_displayName': 'Relevant Medical History' },
                text: elgaData.relevant_history || ''
              },
              {
                code: { '@_code': '10160-0', '@_displayName': 'Medications' },
                text: Array.isArray(elgaData.medications) ? elgaData.medications.join(', ') : ''
              },
              {
                code: { '@_code': '48765-2', '@_displayName': 'Allergies' },
                text: Array.isArray(elgaData.allergies) ? elgaData.allergies.join(', ') : ''
              },
              {
                code: { '@_code': '29545-1', '@_displayName': 'Physical Examination' },
                text: elgaData.physical_exam || template.findings || ''
              },
              {
                code: { '@_code': '11450-4', '@_displayName': 'Problem List' },
                text: Array.isArray(elgaData.diagnosis) ? elgaData.diagnosis.join('; ') : (vorlage.icd10 ? `${vorlage.icd10} - ${vorlage.icd10Title}` : '')
              },
              {
                code: { '@_code': '18776-5', '@_displayName': 'Treatment Plan' },
                text: elgaData.treatment || template.treatmentDetails || ''
              },
              {
                code: { '@_code': '69730-0', '@_displayName': 'Recommendations' },
                text: elgaData.followup || template.notes || ''
              }
            ]
          }
        }
      }
    };

    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true
    });

    const xml = builder.build(xmlData);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="vorlage_${vorlage.code}.xml"`);
    res.send(xml);
  } catch (error) {
    console.error('Fehler beim XML-Export:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim XML-Export',
      error: error.message
    });
  }
});

module.exports = router;



