const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const ElgaValueSet = require('../models/ElgaValueSet');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const XLSX = require('xlsx');

// Helper: Admin-Check
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Nicht authentifiziert. Bitte erneut anmelden.'
    });
  }
  
  if (req.user.role === 'admin' || req.user.role === 'super_admin') {
    next();
  } else {
    logger.warn(`Zugriff verweigert für Benutzer ${req.user.email || req.user._id}: Rolle=${req.user.role}, erfordert admin/super_admin`);
    res.status(403).json({
      success: false,
      message: `Zugriff verweigert. Admin-Rechte erforderlich. Aktuelle Rolle: ${req.user.role || 'unbekannt'}`
    });
  }
};

// Konfiguriere multer für File-Uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Nur CSV und XLSX Dateien erlaubt'));
    }
  }
});

/**
 * @route   GET /api/elga-valuesets
 * @desc    Alle Valuesets abrufen (mit Filterung und Pagination)
 * @access  Private (Admin)
 */
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    logger.info(`Valuesets-Anfrage von Benutzer: ${req.user?.email || req.user?._id}, Rolle: ${req.user?.role}`);
    console.log(`[ELGA Valuesets API] GET / - User: ${req.user?.email}, Page: ${req.query.page}, Limit: ${req.query.limit}`);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Filter-Optionen
    const filter = {};
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { oid: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    const valuesets = await ElgaValueSet.find(filter)
      .select('title version oid url description category status codes importedAt lastUpdated')
      .sort({ title: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await ElgaValueSet.countDocuments(filter);
    
    // Anzahl Codes pro Valueset hinzufügen
    const valuesetsWithCount = valuesets.map(vs => ({
      ...vs,
      codeCount: vs.codes?.length || 0,
      codes: undefined // Codes nicht in Liste senden, nur in Detailansicht
    }));
    
    const response = {
      success: true,
      data: valuesetsWithCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
    
    console.log(`[ELGA Valuesets API] Response: ${valuesetsWithCount.length} valuesets, total: ${total}`);
    logger.info(`Valuesets zurückgegeben: ${valuesetsWithCount.length} von ${total}`);
    
    res.json(response);
  } catch (error) {
    logger.error(`Fehler beim Laden der Valuesets: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Valuesets',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/elga-valuesets/categories
 * @desc    Alle Kategorien abrufen
 * @access  Private (Admin)
 */
router.get('/categories', auth, requireAdmin, async (req, res) => {
  try {
    const categories = await ElgaValueSet.distinct('category');
    const categoryStats = await ElgaValueSet.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Filtere null/undefined/leere Werte und sortiere
    const filteredCategories = categories
      .filter(c => c && typeof c === 'string' && c.trim().length > 0)
      .sort();
    
    console.log(`[ELGA Valuesets API] Categories: ${filteredCategories.length} categories found`);
    logger.info(`Kategorien zurückgegeben: ${filteredCategories.length}`);
    
    res.json({
      success: true,
      data: {
        categories: filteredCategories,
        stats: categoryStats
      }
    });
  } catch (error) {
    logger.error(`Fehler beim Laden der Kategorien: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Kategorien'
    });
  }
});

/**
 * @route   GET /api/elga-valuesets/dokumentenklassen
 * @desc    ELGA Dokumentenklassen Valueset abrufen (für XDS Upload)
 * @access  Private
 */
router.get('/dokumentenklassen', auth, async (req, res) => {
  try {
    // Suche nach ELGA_Dokumentenklassen Valueset
    const valueset = await ElgaValueSet.findOne({
      $or: [
        { title: { $regex: /dokumentenklassen/i } },
        { category: 'dokumentenklassen' },
        { oid: '1.2.40.0.34.10.39' }
      ]
    })
      .select('title version oid codes')
      .sort({ version: -1 }) // Neueste Version zuerst
      .lean();
    
    if (!valueset) {
      return res.status(404).json({
        success: false,
        message: 'ELGA Dokumentenklassen Valueset nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: valueset
    });
  } catch (error) {
    logger.error(`Fehler beim Laden der Dokumentenklassen: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Dokumentenklassen'
    });
  }
});

/**
 * @route   GET /api/elga-valuesets/codes/by-category
 * @desc    Codes aus Valuesets nach Kategorie abrufen (für XDS Upload)
 * @access  Private
 */
router.get('/codes/by-category', auth, async (req, res) => {
  try {
    let categories = req.query.categories;
    
    if (!categories) {
      return res.status(400).json({
        success: false,
        message: 'Kategorien-Parameter erforderlich'
      });
    }
    
    // Handle both array and single value, and comma-separated strings
    let categoryArray;
    if (Array.isArray(categories)) {
      categoryArray = categories;
    } else if (typeof categories === 'string') {
      // Check if comma-separated (shouldn't happen with URLSearchParams, but handle it)
      categoryArray = categories.includes(',') ? categories.split(',').map(c => c.trim()) : [categories];
    } else {
      categoryArray = [String(categories)];
    }
    
    // Clean up whitespace and filter empty values
    categoryArray = categoryArray.map(c => String(c).trim()).filter(c => c.length > 0);
    
    const valuesets = await ElgaValueSet.find({
      category: { $in: categoryArray },
      status: { $ne: 'deprecated' }
    })
      .select('title version oid codes')
      .lean();
    
    // Sammle alle Codes aus den Valuesets
    const allCodes = [];
    valuesets.forEach(vs => {
      if (vs.codes && Array.isArray(vs.codes)) {
        vs.codes.forEach(code => {
          allCodes.push({
            ...code,
            valuesetTitle: vs.title,
            valuesetOid: vs.oid,
            valuesetVersion: vs.version,
            codingScheme: code.system || vs.oid || ''
          });
        });
      }
    });
    
    res.json({
      success: true,
      data: allCodes,
      valuesetsCount: valuesets.length
    });
  } catch (error) {
    logger.error(`Fehler beim Laden der Codes nach Kategorie: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Codes'
    });
  }
});

/**
 * @route   GET /api/elga-valuesets/:id
 * @desc    Einzelnes Valueset mit allen Codes abrufen
 * @access  Private (Admin)
 */
router.get('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const valueset = await ElgaValueSet.findById(req.params.id).lean();
    
    if (!valueset) {
      return res.status(404).json({
        success: false,
        message: 'Valueset nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: valueset
    });
  } catch (error) {
    logger.error(`Fehler beim Laden des Valuesets: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Valuesets'
    });
  }
});

/**
 * @route   PUT /api/elga-valuesets/:id
 * @desc    Valueset aktualisieren
 * @access  Private (Admin)
 */
router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { title, version, description, category, status, codes } = req.body;
    
    const valueset = await ElgaValueSet.findById(req.params.id);
    if (!valueset) {
      return res.status(404).json({
        success: false,
        message: 'Valueset nicht gefunden'
      });
    }
    
    // Aktualisiere Felder
    if (title !== undefined) valueset.title = title;
    if (version !== undefined) valueset.version = version;
    if (description !== undefined) valueset.description = description;
    if (category !== undefined) valueset.category = category;
    if (status !== undefined) valueset.status = status;
    if (codes !== undefined) valueset.codes = codes;
    
    valueset.lastUpdated = new Date();
    
    await valueset.save();
    
    logger.info(`Valueset aktualisiert: ${valueset.title} (${valueset.version})`);
    
    res.json({
      success: true,
      data: valueset,
      message: 'Valueset erfolgreich aktualisiert'
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren des Valuesets: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Valuesets',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/elga-valuesets/:id/code/:codeId
 * @desc    Einzelnen Code in Valueset aktualisieren
 * @access  Private (Admin)
 */
router.put('/:id/code/:codeId', auth, requireAdmin, async (req, res) => {
  try {
    const { code, system, display, version } = req.body;
    
    const valueset = await ElgaValueSet.findById(req.params.id);
    if (!valueset) {
      return res.status(404).json({
        success: false,
        message: 'Valueset nicht gefunden'
      });
    }
    
    const codeIndex = valueset.codes.findIndex(
      c => c._id.toString() === req.params.codeId
    );
    
    if (codeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Code nicht gefunden'
      });
    }
    
    // Aktualisiere Code
    if (code !== undefined) valueset.codes[codeIndex].code = code;
    if (system !== undefined) valueset.codes[codeIndex].system = system;
    if (display !== undefined) valueset.codes[codeIndex].display = display;
    if (version !== undefined) valueset.codes[codeIndex].version = version;
    
    valueset.lastUpdated = new Date();
    await valueset.save();
    
    res.json({
      success: true,
      data: valueset.codes[codeIndex],
      message: 'Code erfolgreich aktualisiert'
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren des Codes: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Codes'
    });
  }
});

/**
 * @route   DELETE /api/elga-valuesets/:id/code/:codeId
 * @desc    Code aus Valueset löschen
 * @access  Private (Admin)
 */
router.delete('/:id/code/:codeId', auth, requireAdmin, async (req, res) => {
  try {
    const valueset = await ElgaValueSet.findById(req.params.id);
    if (!valueset) {
      return res.status(404).json({
        success: false,
        message: 'Valueset nicht gefunden'
      });
    }
    
    valueset.codes = valueset.codes.filter(
      c => c._id.toString() !== req.params.codeId
    );
    
    valueset.lastUpdated = new Date();
    await valueset.save();
    
    res.json({
      success: true,
      message: 'Code erfolgreich gelöscht'
    });
  } catch (error) {
    logger.error(`Fehler beim Löschen des Codes: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Codes'
    });
  }
});

/**
 * @route   POST /api/elga-valuesets/:id/code
 * @desc    Neuen Code zu Valueset hinzufügen
 * @access  Private (Admin)
 */
router.post('/:id/code', auth, requireAdmin, async (req, res) => {
  try {
    const { code, system, display, version } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code ist erforderlich'
      });
    }
    
    const valueset = await ElgaValueSet.findById(req.params.id);
    if (!valueset) {
      return res.status(404).json({
        success: false,
        message: 'Valueset nicht gefunden'
      });
    }
    
    valueset.codes.push({
      code,
      system: system || '',
      display: display || '',
      version: version || ''
    });
    
    valueset.lastUpdated = new Date();
    await valueset.save();
    
    res.json({
      success: true,
      data: valueset.codes[valueset.codes.length - 1],
      message: 'Code erfolgreich hinzugefügt'
    });
  } catch (error) {
    logger.error(`Fehler beim Hinzufügen des Codes: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hinzufügen des Codes'
    });
  }
});

/**
 * @route   POST /api/elga-valuesets/import/csv
 * @desc    Valueset aus CSV importieren
 * @access  Private (Admin)
 */
router.post('/import/csv', auth, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }
    
    const csvPath = req.file.path;
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    // Verwende das bestehende CSV-Parse-Script
    const { parseCSV } = require('../scripts/import-dokumentenklassen-csv');
    const { metadata, codes } = parseCSV(csvPath);
    
    // Lösche temporäre Datei
    fs.unlinkSync(csvPath);
    
    // Speichere in DB
    const title = metadata.title || 'Imported Valueset';
    const version = metadata.version || 'unknown';
    const oid = metadata.oid || metadata.identifier || 'unknown';
    const url = metadata.url || `imported-${Date.now()}`;
    
    const existing = await ElgaValueSet.findOne({ url: url });
    
    if (existing) {
      existing.codes = codes.map(c => ({
        code: c.code,
        system: c.system,
        display: c.display,
        version: c.version
      }));
      existing.lastUpdated = new Date();
      await existing.save();
      
      res.json({
        success: true,
        data: existing,
        message: 'Valueset aktualisiert'
      });
    } else {
      const newValueset = await ElgaValueSet.create({
        title,
        version,
        url,
        oid,
        description: metadata.description || '',
        codes: codes.map(c => ({
          code: c.code,
          system: c.system,
          display: c.display,
          version: c.version
        })),
        rawData: { source: 'CSV-Import', metadata, codes },
        category: 'imported',
        sourceUrl: 'CSV-Import'
      });
      
      res.json({
        success: true,
        data: newValueset,
        message: 'Valueset erfolgreich importiert'
      });
    }
  } catch (error) {
    logger.error(`Fehler beim CSV-Import: ${error.message}`);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Fehler beim CSV-Import',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/elga-valuesets/import/xlsx
 * @desc    Valueset aus XLSX importieren
 * @access  Private (Admin)
 */
router.post('/import/xlsx', auth, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }
    
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    // Lösche temporäre Datei
    fs.unlinkSync(req.file.path);
    
    // Parse XLSX Daten (erwartet: code, system, display, version)
    const codes = data.map(row => ({
      code: row.code || row.Code || '',
      system: row.system || row.System || 'http://loinc.org',
      display: row.display || row.Display || row.name || '',
      version: row.version || row.Version || ''
    })).filter(c => c.code);
    
    const title = req.body.title || `Imported ${new Date().toISOString()}`;
    const version = req.body.version || '1.0.0';
    const oid = req.body.oid || `imported-${Date.now()}`;
    const url = req.body.url || `imported-${Date.now()}`;
    
    const newValueset = await ElgaValueSet.create({
      title,
      version,
      url,
      oid,
      description: req.body.description || '',
      codes,
      rawData: { source: 'XLSX-Import', data },
      category: req.body.category || 'imported',
      sourceUrl: 'XLSX-Import'
    });
    
    res.json({
      success: true,
      data: newValueset,
      message: 'Valueset erfolgreich aus XLSX importiert'
    });
  } catch (error) {
    logger.error(`Fehler beim XLSX-Import: ${error.message}`);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Fehler beim XLSX-Import',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/elga-valuesets/import/url
 * @desc    Valueset von URL importieren
 * @access  Private (Admin)
 */
router.post('/import/url', auth, requireAdmin, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL ist erforderlich'
      });
    }
    
    // Starte Import von URL (vereinfacht - kann erweitert werden)
    res.json({
      success: true,
      message: 'URL-Import-Funktion in Entwicklung. Bitte verwenden Sie die Import-Scripts direkt.',
      data: { url }
    });
  } catch (error) {
    logger.error(`Fehler beim URL-Import: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Fehler beim URL-Import',
      error: error.message
    });
  }
});

module.exports = router;

