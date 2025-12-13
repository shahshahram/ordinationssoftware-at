const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const Patient = require('../models/PatientExtended');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

/**
 * GET /api/contacts
 * Alle Kontakte abrufen (mit Pagination und Filter)
 */
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      type = 'all', // 'all', 'patient', 'external'
      category = '',
      isFavorite = 'all', // 'all', 'true', 'false'
      isActive = 'true'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Build query
    const query = {};

    // Filter nach Typ
    if (type !== 'all') {
      query.type = type;
    }

    // Filter nach Status
    if (isActive === 'true') {
      query.isActive = true;
    } else if (isActive === 'false') {
      query.isActive = false;
    }

    // Filter nach Favoriten
    if (isFavorite === 'true') {
      query.isFavorite = true;
    } else if (isFavorite === 'false') {
      query.isFavorite = false;
    }

    // Filter nach Kategorie
    if (category) {
      query.categories = { $in: [category] };
    }

    // Suche
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { organization: { $regex: search, $options: 'i' } }
      ];
    }

    // Find contacts
    const contacts = await Contact.find(query)
      .populate('patientId', 'firstName lastName dateOfBirth')
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName')
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Contact.countDocuments(query);

    res.json({
      success: true,
      data: contacts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limitNum),
        total,
        hasMore: skip + contacts.length < total,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Kontakte:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Kontakte',
      error: error.message
    });
  }
});

/**
 * GET /api/contacts/:id
 * Einzelnen Kontakt abrufen
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('patientId')
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Kontakt nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Kontakts:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Kontakts',
      error: error.message
    });
  }
});

/**
 * POST /api/contacts
 * Neuen Kontakt erstellen
 */
router.post(
  '/',
  auth,
  [
    body('firstName').trim().notEmpty().withMessage('Vorname ist erforderlich'),
    body('lastName').trim().notEmpty().withMessage('Nachname ist erforderlich'),
    body('type').isIn(['patient', 'external']).withMessage('Typ muss "patient" oder "external" sein'),
    body('email').optional().isEmail().withMessage('Ungültige E-Mail-Adresse'),
    body('patientId').optional().isMongoId().withMessage('Ungültige Patienten-ID')
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

      const { type, patientId } = req.body;

      // Validiere patientId wenn type === 'patient'
      if (type === 'patient') {
        if (!patientId) {
          return res.status(400).json({
            success: false,
            message: 'patientId ist erforderlich wenn type === "patient"'
          });
        }

        const patient = await Patient.findById(patientId);
        if (!patient) {
          return res.status(404).json({
            success: false,
            message: 'Patient nicht gefunden'
          });
        }
      }

      const contactData = {
        ...req.body,
        createdBy: req.user.id,
        lastModifiedBy: req.user.id
      };

      // Entferne patientId wenn type !== 'patient'
      if (type === 'external') {
        contactData.patientId = undefined;
      }

      const contact = new Contact(contactData);
      await contact.save();

      const populatedContact = await Contact.findById(contact._id)
        .populate('patientId', 'firstName lastName dateOfBirth')
        .populate('createdBy', 'firstName lastName');

      res.status(201).json({
        success: true,
        data: populatedContact,
        message: 'Kontakt erfolgreich erstellt'
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Kontakts:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen des Kontakts',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/contacts/:id
 * Kontakt aktualisieren
 */
router.put(
  '/:id',
  auth,
  [
    body('firstName').optional().trim().notEmpty().withMessage('Vorname darf nicht leer sein'),
    body('lastName').optional().trim().notEmpty().withMessage('Nachname darf nicht leer sein'),
    body('email').optional().isEmail().withMessage('Ungültige E-Mail-Adresse'),
    body('patientId').optional().isMongoId().withMessage('Ungültige Patienten-ID')
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

      const contact = await Contact.findById(req.params.id);
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Kontakt nicht gefunden'
        });
      }

      const { type, patientId } = req.body;

      // Validiere patientId wenn type === 'patient'
      if (type === 'patient' || (contact.type === 'patient' && patientId)) {
        if (patientId) {
          const patient = await Patient.findById(patientId);
          if (!patient) {
            return res.status(404).json({
              success: false,
              message: 'Patient nicht gefunden'
            });
          }
        }
      }

      // Aktualisiere Felder
      Object.keys(req.body).forEach(key => {
        if (key !== '_id' && key !== 'createdAt' && key !== 'createdBy') {
          contact[key] = req.body[key];
        }
      });

      contact.lastModifiedBy = req.user.id;

      // Entferne patientId wenn type !== 'patient'
      if (type === 'external' || (req.body.type === undefined && contact.type === 'external')) {
        contact.patientId = undefined;
      }

      await contact.save();

      const populatedContact = await Contact.findById(contact._id)
        .populate('patientId', 'firstName lastName dateOfBirth')
        .populate('createdBy', 'firstName lastName')
        .populate('lastModifiedBy', 'firstName lastName');

      res.json({
        success: true,
        data: populatedContact,
        message: 'Kontakt erfolgreich aktualisiert'
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Kontakts:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren des Kontakts',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/contacts/:id
 * Kontakt löschen
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Kontakt nicht gefunden'
      });
    }

    await Contact.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Kontakt erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Kontakts:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Kontakts',
      error: error.message
    });
  }
});

/**
 * GET /api/contacts/patients/list
 * Liste aller Patienten als Kontakte abrufen (für Dropdown/Auswahl)
 */
router.get('/patients/list', auth, async (req, res) => {
  try {
    const { search = '' } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const patients = await Patient.find(query)
      .select('_id firstName lastName email phone address dateOfBirth')
      .sort({ lastName: 1, firstName: 1 })
      .limit(100);

    res.json({
      success: true,
      data: patients
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Patientenliste:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Patientenliste',
      error: error.message
    });
  }
});

/**
 * GET /api/contacts/categories/list
 * Liste aller verwendeten Kategorien abrufen
 */
router.get('/categories/list', auth, async (req, res) => {
  try {
    const contacts = await Contact.find({ isActive: true })
      .select('categories')
      .lean();

    const categoriesSet = new Set();
    contacts.forEach(contact => {
      if (contact.categories && Array.isArray(contact.categories)) {
        contact.categories.forEach(cat => {
          if (cat) categoriesSet.add(cat);
        });
      }
    });

    const categories = Array.from(categoriesSet).sort();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Kategorien:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Kategorien',
      error: error.message
    });
  }
});

/**
 * POST /api/contacts/import-patients
 * Alle Patienten als Kontakte importieren
 */
router.post('/import-patients', auth, async (req, res) => {
  try {
    const Patient = require('../models/PatientExtended');
    
    // Finde alle Patienten
    const patients = await Patient.find({})
      .select('_id firstName lastName phone email address dateOfBirth')
      .lean();

    let imported = 0;
    let skipped = 0;
    let errors = [];

    for (const patient of patients) {
      try {
        // Prüfe ob Kontakt bereits existiert
        const existingContact = await Contact.findOne({ 
          type: 'patient', 
          patientId: patient._id 
        });

        if (existingContact) {
          skipped++;
          continue;
        }

        // Erstelle Kontakt aus Patient
        const contactData = {
          type: 'patient',
          patientId: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          phone: patient.phone || '',
          mobile: patient.phone || '',
          email: patient.email || '',
          address: {
            street: patient.address?.street || '',
            city: patient.address?.city || '',
            postalCode: patient.address?.postalCode || patient.address?.zipCode || '',
            country: patient.address?.country || 'Österreich',
          },
          categories: ['Patient'],
          isActive: true,
          isFavorite: false,
          createdBy: req.user.id,
          lastModifiedBy: req.user.id,
        };

        const contact = new Contact(contactData);
        await contact.save();
        imported++;
      } catch (error) {
        errors.push({
          patientId: patient._id,
          name: `${patient.firstName} ${patient.lastName}`,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Import abgeschlossen',
      data: {
        imported,
        skipped,
        total: patients.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('Fehler beim Importieren der Patienten:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Importieren der Patienten',
      error: error.message
    });
  }
});

module.exports = router;

