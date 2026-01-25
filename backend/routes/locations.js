const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { authorize, ACTIONS, RESOURCES } = require('../utils/rbac');
const Location = require('../models/Location');
const LocationHours = require('../models/LocationHours');
const LocationClosure = require('../models/LocationClosure');
const LocationException = require('../models/LocationException');
const StaffLocationAssignment = require('../models/StaffLocationAssignment');
const Room = require('../models/Room');
const Device = require('../models/Device');
const AuditLog = require('../models/AuditLog');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Multer-Konfiguration für Logo-Uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads/location-logos';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const locationId = req.params.id || 'new';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `location-${locationId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const logoUpload = multer({ 
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit für Logos
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien (JPEG, PNG, GIF, WebP, SVG) sind erlaubt!'));
    }
  }
});

// Alle Standorte abrufen
router.get('/', auth, async (req, res) => {
  try {
    // RBAC-Berechtigung prüfen
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Standortverwaltung'
      });
    }

    const { page = 1, limit = 10, search = '', active = '' } = req.query;
    const query = {};

    // Suchfilter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }

    // Aktivitätsfilter
    if (active !== '') {
      query.is_active = active === 'true';
    }

    const locations = await Location.find(query)
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Location.countDocuments(query);

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'locations.read',
      resource: 'Location',
      description: 'Standorte abgerufen',
      details: { query: req.query },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: locations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Standorte'
    });
  }
});

// Alle Öffnungszeiten abrufen
router.get('/hours', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Standortverwaltung'
      });
    }

    const hours = await LocationHours.find().populate('location_id', 'name code');
    res.json({
      success: true,
      data: hours
    });
  } catch (error) {
    console.error('Error fetching location hours:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Öffnungszeiten'
    });
  }
});

// Alle Schließzeiten abrufen
router.get('/closures', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Standortverwaltung'
      });
    }

    const closures = await LocationClosure.find().populate('location_id', 'name code');
    res.json({
      success: true,
      data: closures
    });
  } catch (error) {
    console.error('Error fetching location closures:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Schließzeiten'
    });
  }
});

// Öffnungszeiten für einen Standort erstellen
router.post('/:id/hours', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Öffnungszeiten'
      });
    }

    const { rrule, timezone, label } = req.body;
    const locationId = req.params.id;

    const hours = new LocationHours({
      location_id: locationId,
      rrule,
      timezone: timezone || 'Europe/Vienna',
      label
    });

    await hours.save();

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'location-hours.create',
      resource: 'LocationHours',
      resourceId: hours._id,
      description: `Öffnungszeiten für Standort ${locationId} erstellt`,
      details: { locationId, rrule, timezone, label },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: hours,
      message: 'Öffnungszeiten erfolgreich hinzugefügt'
    });
  } catch (error) {
    console.error('Error creating location hours:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Öffnungszeiten'
    });
  }
});

// Schließzeiten für einen Standort erstellen
router.post('/:id/closures', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Schließzeiten'
      });
    }

    const { starts_at, ends_at, reason } = req.body;
    const locationId = req.params.id;

    const closure = new LocationClosure({
      location_id: locationId,
      starts_at,
      ends_at,
      reason
    });

    await closure.save();

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'location-closures.create',
      resource: 'LocationClosure',
      resourceId: closure._id,
      description: `Schließzeit für Standort ${locationId} erstellt`,
      details: { locationId, starts_at, ends_at, reason },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: closure,
      message: 'Schließzeit erfolgreich hinzugefügt'
    });
  } catch (error) {
    console.error('Error creating location closure:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Schließzeit'
    });
  }
});

// Öffnungszeiten löschen
router.delete('/hours/:hoursId', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Öffnungszeiten'
      });
    }

    const hours = await LocationHours.findByIdAndDelete(req.params.hoursId);
    if (!hours) {
      return res.status(404).json({
        success: false,
        message: 'Öffnungszeiten nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Öffnungszeiten erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting location hours:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Öffnungszeiten'
    });
  }
});

// Schließzeiten löschen
router.delete('/closures/:closureId', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Schließzeiten'
      });
    }

    const closure = await LocationClosure.findByIdAndDelete(req.params.closureId);
    if (!closure) {
      return res.status(404).json({
        success: false,
        message: 'Schließzeit nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Schließzeit erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting location closure:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Schließzeit'
    });
  }
});

// Logo für Standort hochladen (MUSS VOR /:id stehen!)
router.post('/:id/logo', auth, (req, res, next) => {
  logoUpload.single('logo')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Fehler beim Hochladen der Datei'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('Logo-Upload Request:', {
      locationId: req.params.id,
      hasFile: !!req.file,
      fileInfo: req.file ? {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      } : null,
      userId: req.user?._id || req.user?.id
    });

    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Aktualisieren von Standorten'
      });
    }

    if (!req.file) {
      console.error('Keine Datei in req.file gefunden');
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen',
        details: {
          hasFile: false,
          body: Object.keys(req.body || {}),
          files: Object.keys(req.files || {})
        }
      });
    }

    const location = await Location.findById(req.params.id);
    if (!location) {
      // Lösche hochgeladene Datei, wenn Location nicht gefunden
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    // Altes Logo löschen, falls vorhanden
    if (location.logo && location.logo.path) {
      const oldLogoPath = path.join(__dirname, '..', location.logo.path);
      if (fs.existsSync(oldLogoPath)) {
        try {
          fs.unlinkSync(oldLogoPath);
        } catch (error) {
          console.error('Fehler beim Löschen des alten Logos:', error);
        }
      }
    }

    // Bild-Dimensionen ermitteln (für SVG wird das übersprungen)
    let imageWidth = null;
    let imageHeight = null;
    try {
      if (req.file.mimetype !== 'image/svg+xml') {
        const metadata = await sharp(req.file.path).metadata();
        imageWidth = metadata.width;
        imageHeight = metadata.height;
      }
    } catch (error) {
      console.error('Fehler beim Ermitteln der Bild-Dimensionen:', error);
    }

    // Logo-Informationen speichern
    location.logo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path.replace(/^\.\//, ''), // Entferne führenden ./
      uploadedAt: new Date(),
      width: imageWidth,
      height: imageHeight
    };

    // Markiere logo als modified für MongoDB (wichtig für verschachtelte Objekte)
    location.markModified('logo');
    
    await location.save();

    // Audit-Log
    await AuditLog.create({
      userId: req.user._id || req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'locations.update.logo',
      resource: 'Location',
      resourceId: location._id,
      description: `Logo für Standort ${location.name} hochgeladen`,
      details: { filename: req.file.filename },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: location.logo,
      message: 'Logo erfolgreich hochgeladen'
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    console.error('Error stack:', error.stack);
    console.error('Request file:', req.file);
    console.error('Request params:', req.params);
    // Lösche hochgeladene Datei bei Fehler
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Fehler beim Löschen der hochgeladenen Datei:', unlinkError);
      }
    }
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hochladen des Logos',
      error: error.message,
      errorName: error.name,
      errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      details: {
        hasFile: !!req.file,
        filePath: req.file?.path,
        locationId: req.params.id,
        userId: req.user?._id || req.user?.id
      }
    });
  }
});

// Logo für Standort löschen (MUSS VOR /:id stehen!)
router.delete('/:id/logo', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Aktualisieren von Standorten'
      });
    }

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    if (!location.logo || !location.logo.path) {
      return res.status(404).json({
        success: false,
        message: 'Kein Logo vorhanden'
      });
    }

    // Datei löschen
    const logoPath = path.join(__dirname, '..', location.logo.path);
    if (fs.existsSync(logoPath)) {
      try {
        fs.unlinkSync(logoPath);
      } catch (error) {
        console.error('Fehler beim Löschen der Logo-Datei:', error);
      }
    }

    // Logo-Informationen aus Location entfernen
    location.logo = undefined;
    await location.save();

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'locations.delete.logo',
      resource: 'Location',
      resourceId: location._id,
      description: `Logo für Standort ${location.name} gelöscht`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Logo erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Logos'
    });
  }
});

// ============================================
// Briefvorlagen (Letter Templates) Routes
// MÜSSEN VOR /:id stehen, damit sie korrekt gematcht werden!
// ============================================

// GET /api/locations/:id/letter-templates - Alle Briefvorlagen eines Standorts abrufen
router.get('/:id/letter-templates', auth, async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    res.json({
      success: true,
      templates: location.letterTemplates || []
    });
  } catch (error) {
    console.error('Error fetching letter templates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Briefvorlagen'
    });
  }
});

// POST /api/locations/:id/letter-templates - Neue Briefvorlage erstellen
router.post('/:id/letter-templates', [
  auth,
  body('name').notEmpty().withMessage('Name ist erforderlich'),
  body('content').notEmpty().withMessage('Inhalt ist erforderlich')
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

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    const newTemplate = {
      name: req.body.name,
      type: req.body.type || 'custom',
      documentType: req.body.documentType || 'all',
      content: req.body.content,
      placeholders: req.body.placeholders || [],
      description: req.body.description || '',
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!location.letterTemplates) {
      location.letterTemplates = [];
    }
    location.letterTemplates.push(newTemplate);
    location.markModified('letterTemplates');
    await location.save();

    res.status(201).json({
      success: true,
      message: 'Briefvorlage erfolgreich erstellt',
      template: newTemplate
    });
  } catch (error) {
    console.error('Error creating letter template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Briefvorlage'
    });
  }
});

// PUT /api/locations/:id/letter-templates/:templateIndex - Briefvorlage aktualisieren
router.put('/:id/letter-templates/:templateIndex', [
  auth,
  body('name').notEmpty().withMessage('Name ist erforderlich'),
  body('content').notEmpty().withMessage('Inhalt ist erforderlich')
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

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    const templateIndex = parseInt(req.params.templateIndex);
    if (!location.letterTemplates || templateIndex < 0 || templateIndex >= location.letterTemplates.length) {
      return res.status(404).json({
        success: false,
        message: 'Briefvorlage nicht gefunden'
      });
    }

    location.letterTemplates[templateIndex] = {
      ...location.letterTemplates[templateIndex].toObject(),
      name: req.body.name,
      type: req.body.type || location.letterTemplates[templateIndex].type,
      documentType: req.body.documentType || location.letterTemplates[templateIndex].documentType,
      content: req.body.content,
      placeholders: req.body.placeholders || [],
      description: req.body.description || '',
      isActive: req.body.isActive !== undefined ? req.body.isActive : location.letterTemplates[templateIndex].isActive,
      updatedAt: new Date()
    };

    location.markModified('letterTemplates');
    await location.save();

    res.json({
      success: true,
      message: 'Briefvorlage erfolgreich aktualisiert',
      template: location.letterTemplates[templateIndex]
    });
  } catch (error) {
    console.error('Error updating letter template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Briefvorlage'
    });
  }
});

// DELETE /api/locations/:id/letter-templates/:templateIndex - Briefvorlage löschen
router.delete('/:id/letter-templates/:templateIndex', auth, async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    const templateIndex = parseInt(req.params.templateIndex);
    if (!location.letterTemplates || templateIndex < 0 || templateIndex >= location.letterTemplates.length) {
      return res.status(404).json({
        success: false,
        message: 'Briefvorlage nicht gefunden'
      });
    }

    location.letterTemplates.splice(templateIndex, 1);
    location.markModified('letterTemplates');
    await location.save();

    res.json({
      success: true,
      message: 'Briefvorlage erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting letter template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Briefvorlage'
    });
  }
});

// POST /api/locations/:id/letter-templates/import - Briefvorlagen von anderem Standort importieren
router.post('/:id/letter-templates/import', [
  auth,
  body('sourceLocationId').notEmpty().withMessage('Quell-Standort-ID ist erforderlich'),
  body('templateIndices').isArray().withMessage('templateIndices muss ein Array sein')
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

    const targetLocation = await Location.findById(req.params.id);
    const sourceLocation = await Location.findById(req.body.sourceLocationId);

    if (!targetLocation || !sourceLocation) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    if (!sourceLocation.letterTemplates || sourceLocation.letterTemplates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Quell-Standort hat keine Briefvorlagen'
      });
    }

    const templateIndices = req.body.templateIndices || [];
    const importedTemplates = [];

    if (!targetLocation.letterTemplates) {
      targetLocation.letterTemplates = [];
    }

    templateIndices.forEach(index => {
      if (sourceLocation.letterTemplates[index]) {
        const template = sourceLocation.letterTemplates[index].toObject();
        // Entferne _id und timestamps für neuen Import
        delete template._id;
        template.createdAt = new Date();
        template.updatedAt = new Date();
        targetLocation.letterTemplates.push(template);
        importedTemplates.push(template);
      }
    });

    targetLocation.markModified('letterTemplates');
    await targetLocation.save();

    res.json({
      success: true,
      message: `${importedTemplates.length} Briefvorlage(n) erfolgreich importiert`,
      templates: importedTemplates
    });
  } catch (error) {
    console.error('Error importing letter templates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Importieren der Briefvorlagen'
    });
  }
});

// ==================== LocationException Routes ====================
// WICHTIG: Diese Route muss VOR router.get('/:id') stehen, damit '/exceptions' nicht als ':id' interpretiert wird

// Alle Ausnahmen abrufen (optional gefiltert nach Standort und Datum)
router.get('/exceptions', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Standortverwaltung'
      });
    }

    const { location_id, startDate, endDate } = req.query;
    const query = { isActive: true };
    
    if (location_id) {
      // Konvertiere location_id zu ObjectId, falls es ein String ist
      if (mongoose.Types.ObjectId.isValid(location_id)) {
        query.location_id = new mongoose.Types.ObjectId(location_id);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Ungültige Standort-ID'
        });
      }
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    console.log('🔍 Fetching location exceptions with query:', JSON.stringify(query, null, 2));
    console.log('🔍 Query parameters:', { location_id, startDate, endDate });
    
    const exceptions = await LocationException.find(query)
      .populate({
        path: 'location_id',
        select: 'name code',
        strictPopulate: false
      })
      .populate({
        path: 'createdBy',
        select: 'firstName lastName email',
        strictPopulate: false
      })
      .sort({ date: 1, startTime: 1 });

    console.log('✅ Found location exceptions:', exceptions.length);
    if (exceptions.length > 0) {
      console.log('📅 Exception details:', exceptions.map(ex => ({
        _id: ex._id,
        date: ex.date,
        location_id: ex.location_id?._id || ex.location_id,
        startTime: ex.startTime,
        endTime: ex.endTime,
        isActive: ex.isActive
      })));
    } else {
      // Prüfe, ob es Exceptions für andere Locations gibt
      const allExceptions = await LocationException.find({ isActive: true })
        .populate('location_id', 'name code')
        .sort({ date: 1 });
      console.log('🔍 Total active exceptions in database:', allExceptions.length);
      if (allExceptions.length > 0) {
        console.log('📅 All exceptions in database:', allExceptions.map(ex => ({
          _id: ex._id,
          date: ex.date ? new Date(ex.date).toISOString().split('T')[0] : 'N/A',
          location_id: ex.location_id?._id || ex.location_id,
          location_name: ex.location_id?.name || 'N/A',
          startTime: ex.startTime,
          endTime: ex.endTime,
          requested_location_id: location_id
        })));
        
        // Prüfe, ob es Exceptions im Datumsbereich gibt, aber für andere Locations
        if (startDate || endDate) {
          const dateQuery = {};
          if (startDate) dateQuery.$gte = new Date(startDate);
          if (endDate) dateQuery.$lte = new Date(endDate);
          const exceptionsInDateRange = await LocationException.find({
            isActive: true,
            date: dateQuery
          })
            .populate('location_id', 'name code')
            .sort({ date: 1 });
          console.log('📅 Exceptions in date range (all locations):', exceptionsInDateRange.length);
          if (exceptionsInDateRange.length > 0) {
            console.log('📅 Exceptions in date range:', exceptionsInDateRange.map(ex => ({
              _id: ex._id,
              date: ex.date ? new Date(ex.date).toISOString().split('T')[0] : 'N/A',
              location_id: ex.location_id?._id || ex.location_id,
              location_name: ex.location_id?.name || 'N/A',
              startTime: ex.startTime,
              endTime: ex.endTime
            })));
          }
        }
      }
    }
    
    res.json({
      success: true,
      data: exceptions
    });
  } catch (error) {
    console.error('❌ Error fetching location exceptions:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Ausnahmen',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Einzelnen Standort abrufen
router.get('/:id', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Standortverwaltung'
      });
    }

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    // Öffnungszeiten laden
    const hours = await LocationHours.find({ location_id: location._id });
    const closures = await LocationClosure.find({ location_id: location._id });

    res.json({
      success: true,
      data: {
        ...location.toObject(),
        hours,
        closures
      }
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Standorts'
    });
  }
});

// Neuen Standort erstellen
router.post('/', [
  auth,
  body('name').trim().notEmpty().withMessage('Name ist erforderlich'),
  body('address_line1').trim().notEmpty().withMessage('Adresse ist erforderlich'),
  body('postal_code').trim().notEmpty().withMessage('Postleitzahl ist erforderlich'),
  body('city').trim().notEmpty().withMessage('Stadt ist erforderlich'),
  body('timezone').optional().isIn(['Europe/Vienna', 'Europe/Berlin', 'Europe/Zurich']).withMessage('Ungültige Zeitzone')
], async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.CREATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Erstellen von Standorten'
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

    // Konvertiere leere Strings zu null für federalState
    const locationData = { ...req.body };
    if (locationData.federalState === '') {
      locationData.federalState = null;
    }
    
    const location = new Location(locationData);
    await location.save();

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'locations.create',
      resource: 'Location',
      resourceId: location._id,
      description: 'Standort erstellt',
      details: { location: location.toObject() },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: location,
      message: 'Standort erfolgreich erstellt'
    });
  } catch (error) {
    console.error('Error creating location:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Standort-Code bereits vergeben'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Standorts'
    });
  }
});

// Standort aktualisieren
router.put('/:id', [
  auth,
  body('name').optional().trim().notEmpty().withMessage('Name darf nicht leer sein'),
  body('timezone').optional().isIn(['Europe/Vienna', 'Europe/Berlin', 'Europe/Zurich']).withMessage('Ungültige Zeitzone')
], async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Aktualisieren von Standorten'
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

    // Bereite Update-Objekt vor - explizite Behandlung von verschachtelten Objekten
    const updateData = { ...req.body };
    
    // Debug-Logging für alle Updates
    console.log('[Location Update] Request Body:', JSON.stringify(req.body, null, 2));
    console.log('[Location Update] xdsRegistry in Body:', req.body.xdsRegistry !== undefined ? 'YES' : 'NO');
    if (req.body.xdsRegistry !== undefined) {
      console.log('[Location Update] xdsRegistry value:', JSON.stringify(req.body.xdsRegistry, null, 2));
    }
    
    // Stelle sicher, dass xdsRegistry korrekt behandelt wird
    // Lade das Dokument immer, um verschachtelte Objekte korrekt zu behandeln
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }
    
    console.log('[Location Update] Current location xdsRegistry before update:', JSON.stringify(location.xdsRegistry, null, 2));
    
    // Wenn xdsRegistry im Body ist, aktualisiere es explizit
    if (req.body.xdsRegistry !== undefined) {
      // Stelle sicher, dass xdsRegistry existiert
      if (!location.xdsRegistry) {
        location.xdsRegistry = {
          enabled: false,
          permissions: {
            create: { roles: ['admin', 'super_admin', 'doctor', 'arzt'] },
            update: { roles: ['admin', 'super_admin', 'doctor', 'arzt'] },
            deprecate: { roles: ['admin', 'super_admin'] },
            delete: { roles: ['admin', 'super_admin'] },
            retrieve: { roles: ['admin', 'super_admin', 'doctor', 'arzt', 'nurse', 'assistent'] },
            query: { roles: ['admin', 'super_admin', 'doctor', 'arzt', 'nurse', 'assistent'] }
          },
          allowPatientUpload: false,
          patientUploadMaxSize: 10485760,
          patientUploadAllowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff']
        };
      }
      
      // Stelle sicher, dass permissions existieren, auch wenn xdsRegistry schon vorhanden ist
      if (!location.xdsRegistry.permissions) {
        location.xdsRegistry.permissions = {
          create: { roles: ['admin', 'super_admin', 'doctor', 'arzt'] },
          update: { roles: ['admin', 'super_admin', 'doctor', 'arzt'] },
          deprecate: { roles: ['admin', 'super_admin'] },
          delete: { roles: ['admin', 'super_admin'] },
          retrieve: { roles: ['admin', 'super_admin', 'doctor', 'arzt', 'nurse', 'assistent'] },
          query: { roles: ['admin', 'super_admin', 'doctor', 'arzt', 'nurse', 'assistent'] }
        };
        console.log('[Location Update] Initialized missing xdsRegistry.permissions with defaults');
      }
      
      // Merge xdsRegistry Felder - überschreibe ALLE Felder die im Request sind
      const xdsUpdate = req.body.xdsRegistry;
      if (xdsUpdate.enabled !== undefined) {
        location.xdsRegistry.enabled = xdsUpdate.enabled;
        console.log('[Location Update] Set xdsRegistry.enabled to:', xdsUpdate.enabled);
      }
        if (req.body.xdsRegistry.registryUrl !== undefined) {
          location.xdsRegistry.registryUrl = req.body.xdsRegistry.registryUrl || '';
        }
        if (req.body.xdsRegistry.repositoryLocation !== undefined) {
          location.xdsRegistry.repositoryLocation = req.body.xdsRegistry.repositoryLocation || '';
        }
        if (req.body.xdsRegistry.repositoryUniqueId !== undefined) {
          location.xdsRegistry.repositoryUniqueId = req.body.xdsRegistry.repositoryUniqueId || '';
        }
        if (req.body.xdsRegistry.homeCommunityId !== undefined) {
          location.xdsRegistry.homeCommunityId = req.body.xdsRegistry.homeCommunityId || '';
        }
        if (req.body.xdsRegistry.allowPatientUpload !== undefined) {
          location.xdsRegistry.allowPatientUpload = req.body.xdsRegistry.allowPatientUpload;
        }
        if (req.body.xdsRegistry.patientUploadMaxSize !== undefined) {
          location.xdsRegistry.patientUploadMaxSize = req.body.xdsRegistry.patientUploadMaxSize;
        }
        if (req.body.xdsRegistry.patientUploadAllowedTypes !== undefined) {
          location.xdsRegistry.patientUploadAllowedTypes = req.body.xdsRegistry.patientUploadAllowedTypes;
        }
        // Merge permissions falls vorhanden
        if (req.body.xdsRegistry.permissions) {
          if (!location.xdsRegistry.permissions) {
            location.xdsRegistry.permissions = {};
          }
          Object.keys(req.body.xdsRegistry.permissions).forEach(key => {
            if (req.body.xdsRegistry.permissions[key]) {
              location.xdsRegistry.permissions[key] = {
                ...location.xdsRegistry.permissions[key],
                ...req.body.xdsRegistry.permissions[key]
              };
            }
          });
        }
    }
    
    // Aktualisiere andere Felder (außer xdsRegistry, das wurde oben behandelt)
    Object.keys(updateData).forEach(key => {
      if (key !== 'xdsRegistry' && key !== '_id' && key !== '__v' && key !== 'createdAt') {
        if (updateData[key] !== undefined) {
          // Konvertiere leere Strings zu null für federalState
          if (key === 'federalState' && updateData[key] === '') {
            location[key] = null;
          } else {
            location[key] = updateData[key];
          }
        }
      }
    });
    
    location.updatedAt = new Date();
    
    // Markiere xdsRegistry als modified für MongoDB (wichtig für verschachtelte Objekte)
    if (req.body.xdsRegistry !== undefined) {
      location.markModified('xdsRegistry');
      console.log('[Location Update] Marked xdsRegistry as modified');
    }
    
    console.log('[Location Update] Saving location, xdsRegistry will be:', JSON.stringify(location.xdsRegistry, null, 2));
    await location.save();
    
    // Lade das gespeicherte Dokument neu, um sicherzustellen, dass es korrekt gespeichert wurde
    const savedLocation = await Location.findById(req.params.id);
    console.log('[Location Update] Saved location xdsRegistry:', JSON.stringify(savedLocation?.xdsRegistry, null, 2));
    
    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'locations.update',
      resource: 'Location',
      resourceId: location._id,
      description: 'Standort aktualisiert',
      details: { changes: req.body },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.json({
      success: true,
      data: savedLocation || location,
      message: 'Standort erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating location:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Standort-Code bereits vergeben'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Standorts'
    });
  }
});

// Standort löschen
router.delete('/:id', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.DELETE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Löschen von Standorten'
      });
    }

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    // Prüfen ob Standort noch verwendet wird
    const hasRooms = await Room.countDocuments({ location_id: location._id });
    const hasDevices = await Device.countDocuments({ location_id: location._id });
    const hasStaff = await StaffLocationAssignment.countDocuments({ location_id: location._id });

    if (hasRooms > 0 || hasDevices > 0 || hasStaff > 0) {
      return res.status(400).json({
        success: false,
        message: 'Standort kann nicht gelöscht werden, da er noch verwendet wird'
      });
    }

    await Location.findByIdAndDelete(req.params.id);

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'locations.delete',
      resource: 'Location',
      resourceId: location._id,
      description: 'Standort gelöscht',
      details: { location: location.toObject() },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Standort erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Standorts'
    });
  }
});

// Standort-Öffnungszeiten verwalten
router.post('/:id/hours', [
  auth,
  body('rrule').trim().notEmpty().withMessage('RRULE ist erforderlich'),
  body('timezone').optional().isIn(['Europe/Vienna', 'Europe/Berlin', 'Europe/Zurich'])
], async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Öffnungszeiten'
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

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    const hours = new LocationHours({
      location_id: location._id,
      ...req.body
    });
    await hours.save();

    res.status(201).json({
      success: true,
      data: hours,
      message: 'Öffnungszeiten erfolgreich hinzugefügt'
    });
  } catch (error) {
    console.error('Error creating location hours:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Öffnungszeiten'
    });
  }
});

// Standort-Schließzeiten verwalten
router.post('/:id/closures', [
  auth,
  body('starts_at').isISO8601().withMessage('Ungültiges Startdatum'),
  body('ends_at').isISO8601().withMessage('Ungültiges Enddatum'),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Schließzeiten'
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

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    const closure = new LocationClosure({
      location_id: location._id,
      ...req.body
    });
    await closure.save();

    res.status(201).json({
      success: true,
      data: closure,
      message: 'Schließzeit erfolgreich hinzugefügt'
    });
  } catch (error) {
    console.error('Error creating location closure:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Schließzeit'
    });
  }
});

// Öffnungszeiten aktualisieren
router.put('/:id/hours/:hoursId', [
  auth,
  body('rrule').optional().trim().notEmpty().withMessage('RRULE darf nicht leer sein'),
  body('timezone').optional().isIn(['Europe/Vienna', 'Europe/Berlin', 'Europe/Zurich'])
], async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Öffnungszeiten'
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

    const hours = await LocationHours.findOneAndUpdate(
      { _id: req.params.hoursId, location_id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!hours) {
      return res.status(404).json({
        success: false,
        message: 'Öffnungszeiten nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: hours,
      message: 'Öffnungszeiten erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating location hours:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Öffnungszeiten'
    });
  }
});

// Schließzeiten aktualisieren
router.put('/:id/closures/:closureId', [
  auth,
  body('starts_at').optional().isISO8601().withMessage('Ungültiges Startdatum'),
  body('ends_at').optional().isISO8601().withMessage('Ungültiges Enddatum'),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Schließzeiten'
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

    const closure = await LocationClosure.findOneAndUpdate(
      { _id: req.params.closureId, location_id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!closure) {
      return res.status(404).json({
        success: false,
        message: 'Schließzeit nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: closure,
      message: 'Schließzeit erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating location closure:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Schließzeit'
    });
  }
});

// ==================== LocationException Routes ====================

// Ausnahme für einen Standort erstellen
router.post('/:id/exceptions', [
  auth,
  body('date').isISO8601().withMessage('Ungültiges Datum'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Ungültige Startzeit'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Ungültige Endzeit'),
  body('breakStart').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Ungültige Pausen-Startzeit'),
  body('breakEnd').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Ungültige Pausen-Endzeit'),
  body('label').optional().trim(),
  body('assignedStaff').optional().isArray().withMessage('assignedStaff muss ein Array sein'),
  body('assignedStaff.*').optional().isMongoId().withMessage('Ungültige Personal-ID')
], async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Ausnahmen'
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

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    // Prüfe ob bereits eine Ausnahme für dieses Datum existiert
    // Normalisiere das Datum auf Mitternacht (00:00:00) in der lokalen Zeitzone
    const exceptionDate = new Date(req.body.date);
    exceptionDate.setHours(0, 0, 0, 0);
    const exceptionEndDate = new Date(exceptionDate);
    exceptionEndDate.setHours(23, 59, 59, 999);
    
    console.log('🔍 Checking for existing exception:', {
      location_id: location._id,
      date: req.body.date,
      exceptionDate: exceptionDate.toISOString(),
      exceptionEndDate: exceptionEndDate.toISOString()
    });
    
    // Prüfe zuerst, ob es überhaupt Exceptions für diese Location gibt
    const allExceptionsForLocation = await LocationException.find({
      location_id: location._id
    });
    console.log('📊 Total exceptions for location (including inactive):', allExceptionsForLocation.length);
    
    // Prüfe nur nach aktiven Exceptions
    const existingException = await LocationException.findOne({
      location_id: location._id,
      date: {
        $gte: exceptionDate,
        $lte: exceptionEndDate
      },
      isActive: true
    });

    if (existingException) {
      console.log('⚠️ Found existing ACTIVE exception:', {
        _id: existingException._id,
        date: existingException.date,
        dateISO: existingException.date ? new Date(existingException.date).toISOString() : 'N/A',
        location_id: existingException.location_id,
        isActive: existingException.isActive
      });
      
      // Prüfe auch, ob es inaktive Exceptions gibt (für Debugging)
      const inactiveExceptions = await LocationException.find({
        location_id: location._id,
        date: {
          $gte: exceptionDate,
          $lte: exceptionEndDate
        },
        isActive: false
      });
      console.log('📊 Inactive exceptions for same date:', inactiveExceptions.length);
      
      return res.status(400).json({
        success: false,
        message: `Für dieses Datum existiert bereits eine Ausnahme (ID: ${existingException._id})`,
        existingException: {
          _id: existingException._id,
          date: existingException.date,
          startTime: existingException.startTime,
          endTime: existingException.endTime
        }
      });
    }
    
    // Prüfe auch, ob es inaktive Exceptions gibt (für Debugging)
    const inactiveExceptions = await LocationException.find({
      location_id: location._id,
      date: {
        $gte: exceptionDate,
        $lte: exceptionEndDate
      },
      isActive: false
    });
    console.log('📊 Inactive exceptions for same date:', inactiveExceptions.length);
    
    console.log('✅ No existing ACTIVE exception found, creating new one');

    const exception = new LocationException({
      location_id: location._id,
      date: exceptionDate, // Verwende das normalisierte Datum
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      breakStart: req.body.breakStart,
      breakEnd: req.body.breakEnd,
      label: req.body.label || 'Sonderöffnung',
      assignedStaff: req.body.assignedStaff && Array.isArray(req.body.assignedStaff) && req.body.assignedStaff.length > 0
        ? req.body.assignedStaff
        : [],
      createdBy: req.user._id
    });

    await exception.save();

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'location-exceptions.create',
      resource: 'LocationException',
      resourceId: exception._id,
      description: `Ausnahme für Standort ${location.name} erstellt`,
      details: { locationId: location._id, date: req.body.date, startTime: req.body.startTime, endTime: req.body.endTime },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const populatedException = await LocationException.findById(exception._id)
      .populate('location_id', 'name code')
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedStaff', '_id firstName lastName email')
      .populate('assignedStaff', '_id firstName lastName email');

    res.status(201).json({
      success: true,
      data: populatedException,
      message: 'Ausnahme erfolgreich hinzugefügt'
    });
  } catch (error) {
    console.error('Error creating location exception:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Erstellen der Ausnahme'
    });
  }
});

// Ausnahme aktualisieren
router.put('/:id/exceptions/:exceptionId', [
  auth,
  body('date').optional().isISO8601().withMessage('Ungültiges Datum'),
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Ungültige Startzeit'),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Ungültige Endzeit'),
  body('breakStart').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Ungültige Pausen-Startzeit'),
  body('breakEnd').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Ungültige Pausen-Endzeit'),
  body('label').optional().trim(),
  body('isActive').optional().isBoolean(),
  body('assignedStaff').optional().isArray().withMessage('assignedStaff muss ein Array sein'),
  body('assignedStaff.*').optional().isMongoId().withMessage('Ungültige Personal-ID')
], async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Ausnahmen'
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

    const updateData = { ...req.body };
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }
    // Normalisiere assignedStaff: Wenn undefined oder leeres Array, setze auf leeres Array
    if (updateData.assignedStaff !== undefined) {
      updateData.assignedStaff = Array.isArray(updateData.assignedStaff) && updateData.assignedStaff.length > 0
        ? updateData.assignedStaff
        : [];
    }

    const exception = await LocationException.findOneAndUpdate(
      { _id: req.params.exceptionId, location_id: req.params.id },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('location_id', 'name code')
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedStaff', '_id firstName lastName email');

    if (!exception) {
      return res.status(404).json({
        success: false,
        message: 'Ausnahme nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: exception,
      message: 'Ausnahme erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating location exception:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Fehler beim Aktualisieren der Ausnahme'
    });
  }
});

// Ausnahme löschen
router.delete('/:id/exceptions/:exceptionId', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Ausnahmen'
      });
    }

    console.log('🗑️ Deleting exception:', {
      exceptionId: req.params.exceptionId,
      locationId: req.params.id
    });

    // Prüfe zuerst, ob die Exception existiert
    const existingException = await LocationException.findOne({
      _id: req.params.exceptionId,
      location_id: req.params.id
    });

    if (!existingException) {
      console.log('⚠️ Exception not found for deletion:', {
        exceptionId: req.params.exceptionId,
        locationId: req.params.id
      });
      return res.status(404).json({
        success: false,
        message: 'Ausnahme nicht gefunden'
      });
    }

    console.log('📋 Exception found before deletion:', {
      _id: existingException._id,
      date: existingException.date,
      dateISO: existingException.date ? new Date(existingException.date).toISOString() : 'N/A',
      location_id: existingException.location_id,
      isActive: existingException.isActive
    });

    // Lösche die Exception
    const deletedException = await LocationException.findOneAndDelete({
      _id: req.params.exceptionId,
      location_id: req.params.id
    });

    if (!deletedException) {
      console.error('❌ Exception was not deleted despite being found');
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen der Ausnahme'
      });
    }

    // Verifiziere, dass die Exception wirklich gelöscht wurde
    const verifyDeleted = await LocationException.findById(req.params.exceptionId);
    if (verifyDeleted) {
      console.error('❌ Exception still exists after deletion!');
    } else {
      console.log('✅ Exception successfully deleted and verified');
    }

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'location-exceptions.delete',
      resource: 'LocationException',
      resourceId: deletedException._id,
      description: `Ausnahme für Standort ${req.params.id} gelöscht`,
      details: { 
        locationId: req.params.id, 
        exceptionId: req.params.exceptionId,
        deletedDate: deletedException.date,
        deletedDateISO: deletedException.date ? new Date(deletedException.date).toISOString() : 'N/A'
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Ausnahme erfolgreich gelöscht',
      deletedException: {
        _id: deletedException._id,
        date: deletedException.date
      }
    });
  } catch (error) {
    console.error('Error deleting location exception:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Ausnahme',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Standort-Statistiken abrufen
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Standortverwaltung'
      });
    }

    const locationId = req.params.id;
    const { startDate, endDate } = req.query;

    // Grundlegende Statistiken
    const stats = {
      location: await Location.findById(locationId).select('name code city'),
      staff: await StaffLocationAssignment.countDocuments({ location_id: locationId }),
      rooms: await Room.countDocuments({ location_id: locationId, isActive: true }),
      devices: await Device.countDocuments({ location_id: locationId, isActive: true }),
      activeHours: await LocationHours.countDocuments({ location_id: locationId }),
      activeClosures: await LocationClosure.countDocuments({ 
        location_id: locationId,
        starts_at: { $gte: new Date() }
      })
    };

    // Termin-Statistiken (falls Appointment-Modell verfügbar)
    try {
      const Appointment = require('../models/Appointment');
      // Verwende locationId (camelCase) statt location_id, da das Appointment-Modell locationId verwendet
      const appointmentQuery = { locationId: locationId };
      
      if (startDate && endDate) {
        appointmentQuery.startTime = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      stats.appointments = {
        total: await Appointment.countDocuments(appointmentQuery),
        today: await Appointment.countDocuments({
          ...appointmentQuery,
          startTime: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }),
        thisWeek: await Appointment.countDocuments({
          ...appointmentQuery,
          startTime: {
            $gte: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
            $lt: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 7))
          }
        })
      };
      
      console.log(`📊 Location stats for ${locationId}:`, {
        staff: stats.staff,
        rooms: stats.rooms,
        devices: stats.devices,
        activeHours: stats.activeHours,
        activeClosures: stats.activeClosures,
        appointments: stats.appointments
      });
    } catch (error) {
      console.error('Error fetching appointment stats:', error);
      stats.appointments = { total: 0, today: 0, thisWeek: 0 };
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching location stats:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Standort-Statistiken'
    });
  }
});

// Standort-Verfügbarkeit prüfen
router.get('/:id/availability', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.READ, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für Standortverwaltung'
      });
    }

    const { date, time } = req.query;
    const locationId = req.params.id;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Datum und Zeit sind erforderlich'
      });
    }

    const requestedDateTime = new Date(`${date}T${time}`);
    const dayOfWeek = requestedDateTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Öffnungszeiten prüfen
    const locationHours = await LocationHours.find({ location_id: locationId });
    const isOpen = locationHours.some(hours => {
      // Vereinfachte RRULE-Prüfung für Wochentage
      const rrule = hours.rrule;
      if (rrule.includes(dayOfWeek.toUpperCase().substring(0, 2))) {
        return true;
      }
      return false;
    });

    // Schließtage prüfen
    const closures = await LocationClosure.find({
      location_id: locationId,
      starts_at: { $lte: requestedDateTime },
      ends_at: { $gte: requestedDateTime }
    });

    const isClosed = closures.length > 0;

    res.json({
      success: true,
      data: {
        available: isOpen && !isClosed,
        isOpen,
        isClosed,
        closures: closures.map(c => ({
          reason: c.reason,
          starts_at: c.starts_at,
          ends_at: c.ends_at
        }))
      }
    });
  } catch (error) {
    console.error('Error checking location availability:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Prüfen der Standort-Verfügbarkeit'
    });
  }
});

// Bulk-Operationen für Standorte
router.post('/bulk-update', auth, async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    const authResult = await authorize(req.user, ACTIONS.UPDATE, RESOURCES.LOCATION, null, context);
    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Verwalten von Standorten'
      });
    }

    const { operation, locationIds, updates } = req.body;

    if (!operation || !locationIds || !Array.isArray(locationIds)) {
      return res.status(400).json({
        success: false,
        message: 'Operation, locationIds und updates sind erforderlich'
      });
    }

    let result;

    switch (operation) {
      case 'activate':
        result = await Location.updateMany(
          { _id: { $in: locationIds } },
          { is_active: true }
        );
        break;
      case 'deactivate':
        result = await Location.updateMany(
          { _id: { $in: locationIds } },
          { is_active: false }
        );
        break;
      case 'update':
        if (!updates) {
          return res.status(400).json({
            success: false,
            message: 'Updates sind für Update-Operation erforderlich'
          });
        }
        result = await Location.updateMany(
          { _id: { $in: locationIds } },
          { ...updates, updatedAt: new Date() }
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Unbekannte Operation'
        });
    }

    // Audit-Log
    await AuditLog.create({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'locations.bulk-update',
      resource: 'Location',
      resourceId: locationIds[0],
      description: `Bulk-Operation: ${operation} für ${locationIds.length} Standorte`,
      details: { operation, locationIds, updates },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: result,
      message: `Bulk-Operation erfolgreich: ${result.modifiedCount} Standorte aktualisiert`
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Bulk-Operation'
    });
  }
});

// ============================================
// Briefvorlagen (Letter Templates) Routes
// MÜSSEN VOR /:id stehen, damit sie korrekt gematcht werden!
// ============================================

// GET /api/locations/:id/letter-templates - Alle Briefvorlagen eines Standorts abrufen
router.get('/:id/letter-templates', auth, async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    res.json({
      success: true,
      templates: location.letterTemplates || []
    });
  } catch (error) {
    console.error('Error fetching letter templates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Briefvorlagen'
    });
  }
});

// POST /api/locations/:id/letter-templates - Neue Briefvorlage erstellen
router.post('/:id/letter-templates', [
  auth,
  body('name').notEmpty().withMessage('Name ist erforderlich'),
  body('content').notEmpty().withMessage('Inhalt ist erforderlich')
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

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    const newTemplate = {
      name: req.body.name,
      type: req.body.type || 'custom',
      documentType: req.body.documentType || 'all',
      content: req.body.content,
      placeholders: req.body.placeholders || [],
      description: req.body.description || '',
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!location.letterTemplates) {
      location.letterTemplates = [];
    }
    location.letterTemplates.push(newTemplate);
    location.markModified('letterTemplates');
    await location.save();

    res.status(201).json({
      success: true,
      message: 'Briefvorlage erfolgreich erstellt',
      template: newTemplate
    });
  } catch (error) {
    console.error('Error creating letter template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Briefvorlage'
    });
  }
});

// PUT /api/locations/:id/letter-templates/:templateIndex - Briefvorlage aktualisieren
router.put('/:id/letter-templates/:templateIndex', [
  auth,
  body('name').notEmpty().withMessage('Name ist erforderlich'),
  body('content').notEmpty().withMessage('Inhalt ist erforderlich')
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

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    const templateIndex = parseInt(req.params.templateIndex);
    if (!location.letterTemplates || templateIndex < 0 || templateIndex >= location.letterTemplates.length) {
      return res.status(404).json({
        success: false,
        message: 'Briefvorlage nicht gefunden'
      });
    }

    location.letterTemplates[templateIndex] = {
      ...location.letterTemplates[templateIndex].toObject(),
      name: req.body.name,
      type: req.body.type || location.letterTemplates[templateIndex].type,
      documentType: req.body.documentType || location.letterTemplates[templateIndex].documentType,
      content: req.body.content,
      placeholders: req.body.placeholders || [],
      description: req.body.description || '',
      isActive: req.body.isActive !== undefined ? req.body.isActive : location.letterTemplates[templateIndex].isActive,
      updatedAt: new Date()
    };

    location.markModified('letterTemplates');
    await location.save();

    res.json({
      success: true,
      message: 'Briefvorlage erfolgreich aktualisiert',
      template: location.letterTemplates[templateIndex]
    });
  } catch (error) {
    console.error('Error updating letter template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Briefvorlage'
    });
  }
});

// DELETE /api/locations/:id/letter-templates/:templateIndex - Briefvorlage löschen
router.delete('/:id/letter-templates/:templateIndex', auth, async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    const templateIndex = parseInt(req.params.templateIndex);
    if (!location.letterTemplates || templateIndex < 0 || templateIndex >= location.letterTemplates.length) {
      return res.status(404).json({
        success: false,
        message: 'Briefvorlage nicht gefunden'
      });
    }

    location.letterTemplates.splice(templateIndex, 1);
    location.markModified('letterTemplates');
    await location.save();

    res.json({
      success: true,
      message: 'Briefvorlage erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting letter template:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Briefvorlage'
    });
  }
});

// POST /api/locations/:id/letter-templates/import - Briefvorlagen von anderem Standort importieren
router.post('/:id/letter-templates/import', [
  auth,
  body('sourceLocationId').notEmpty().withMessage('Quell-Standort-ID ist erforderlich'),
  body('templateIndices').isArray().withMessage('templateIndices muss ein Array sein')
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

    const targetLocation = await Location.findById(req.params.id);
    const sourceLocation = await Location.findById(req.body.sourceLocationId);

    if (!targetLocation || !sourceLocation) {
      return res.status(404).json({
        success: false,
        message: 'Standort nicht gefunden'
      });
    }

    if (!sourceLocation.letterTemplates || sourceLocation.letterTemplates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Quell-Standort hat keine Briefvorlagen'
      });
    }

    const templateIndices = req.body.templateIndices || [];
    const importedTemplates = [];

    if (!targetLocation.letterTemplates) {
      targetLocation.letterTemplates = [];
    }

    templateIndices.forEach(index => {
      if (sourceLocation.letterTemplates[index]) {
        const template = sourceLocation.letterTemplates[index].toObject();
        // Entferne _id und timestamps für neuen Import
        delete template._id;
        template.createdAt = new Date();
        template.updatedAt = new Date();
        targetLocation.letterTemplates.push(template);
        importedTemplates.push(template);
      }
    });

    targetLocation.markModified('letterTemplates');
    await targetLocation.save();

    res.json({
      success: true,
      message: `${importedTemplates.length} Briefvorlage(n) erfolgreich importiert`,
      templates: importedTemplates
    });
  } catch (error) {
    console.error('Error importing letter templates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Importieren der Briefvorlagen'
    });
  }
});

module.exports = router;
