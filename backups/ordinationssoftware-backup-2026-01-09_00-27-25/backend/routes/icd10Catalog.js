const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const Icd10Catalog = require('../models/Icd10Catalog');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');

const router = express.Router();

// Multer-Konfiguration für CSV/Excel-Upload
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    
    if (allowedTypes.includes(file.mimetype) || 
        allowedExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext))) {
      cb(null, true);
    } else {
      cb(new Error('Nur CSV- und Excel-Dateien sind erlaubt'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB Limit für Excel-Dateien
  }
});

// GET /api/icd10-catalog/years - Verfügbare Katalog-Jahre
router.get('/years', auth, async (req, res) => {
  try {
    const years = await Icd10Catalog.distinct('releaseYear', { isActive: true })
      .sort({ releaseYear: -1 });

    res.json({
      success: true,
      data: years
    });
  } catch (error) {
    console.error('Error fetching catalog years:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Katalog-Jahre'
    });
  }
});

// GET /api/icd10-catalog/status/:year - Katalog-Status für ein Jahr
router.get('/status/:year', auth, async (req, res) => {
  try {
    const { year } = req.params;
    const catalogYear = parseInt(year);

    const stats = await Icd10Catalog.aggregate([
      { $match: { releaseYear: catalogYear } },
      {
        $group: {
          _id: null,
          totalCodes: { $sum: 1 },
          activeCodes: { $sum: { $cond: ['$isActive', 1, 0] } },
          billableCodes: { $sum: { $cond: ['$isBillable', 1, 0] } },
          chapters: { $addToSet: '$chapter' },
          firstImport: { $min: '$createdAt' },
          lastUpdate: { $max: '$updatedAt' }
        }
      }
    ]);

    const chapterStats = await Icd10Catalog.aggregate([
      { $match: { releaseYear: catalogYear, isActive: true } },
      {
        $group: {
          _id: '$chapter',
          count: { $sum: 1 },
          billable: { $sum: { $cond: ['$isBillable', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        year: catalogYear,
        statistics: stats[0] || {
          totalCodes: 0,
          activeCodes: 0,
          billableCodes: 0,
          chapters: [],
          firstImport: null,
          lastUpdate: null
        },
        chapterBreakdown: chapterStats
      }
    });
  } catch (error) {
    console.error('Error fetching catalog status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Katalog-Status'
    });
  }
});

// POST /api/icd10-catalog/import - Katalog-Import
router.post('/import', auth, requireRole(['admin']), upload.single('catalogFile'), async (req, res) => {
  const { year, replaceExisting = false, validateOnly = false } = req.body;
  const catalogYear = parseInt(year);

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Keine Datei hochgeladen'
    });
  }

  if (!catalogYear || catalogYear < 2020 || catalogYear > 2030) {
    return res.status(400).json({
      success: false,
      message: 'Ungültiges Jahr. Erlaubt: 2020-2030'
    });
  }

  try {
    const results = {
      processed: 0,
      imported: 0,
      updated: 0,
      errors: [],
      warnings: []
    };

    // Prüfe ob Katalog für dieses Jahr bereits existiert
    const existingCount = await Icd10Catalog.countDocuments({ releaseYear: catalogYear });
    if (existingCount > 0 && !replaceExisting) {
      return res.status(409).json({
        success: false,
        message: `Katalog für Jahr ${catalogYear} existiert bereits. Verwenden Sie replaceExisting=true zum Überschreiben.`,
        existingCount
      });
    }

    // Wenn replaceExisting, lösche alte Einträge
    if (replaceExisting && existingCount > 0) {
      await Icd10Catalog.deleteMany({ releaseYear: catalogYear });
      results.warnings.push(`${existingCount} bestehende Einträge für Jahr ${catalogYear} gelöscht`);
    }

    // Datei-Verarbeitung (CSV oder Excel)
    const codes = [];
    const errors = [];
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    try {
      let rows = [];

      if (fileExtension === '.csv') {
        // CSV-Verarbeitung
        await new Promise((resolve, reject) => {
          fs.createReadStream(req.file.path)
            .pipe(csv({
              separator: ';', // Deutsche CSV-Trennung
              headers: ['code', 'title', 'longTitle', 'chapter', 'isBillable', 'parentCode', 'synonyms']
            }))
            .on('data', (row) => rows.push(row))
            .on('end', resolve)
            .on('error', reject);
        });
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        // Excel-Verarbeitung
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0]; // Erste Tabelle
        const worksheet = workbook.Sheets[sheetName];
        rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Erste Zeile als Header verwenden
        const headers = rows[0];
        rows = rows.slice(1).map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
      } else {
        throw new Error('Unsupported file format');
      }

      // Verarbeitung der Zeilen
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          // Validierung und Bereinigung
          const code = row.code?.toString().trim();
          const title = row.title?.toString().trim();
          
          if (!code || !title) {
            errors.push(`Zeile ${i + 1}: Code oder Titel fehlt`);
            continue;
          }

          // ICD-10 Code-Format validieren (flexibler für verschiedene Formate)
          const cleanCode = code.replace(/[^A-Z0-9.]/g, ''); // Nur Buchstaben, Zahlen und Punkte
          if (!/^[A-Z]\d{2}(\.\d{1,3})?$/.test(cleanCode)) {
            errors.push(`Zeile ${i + 1}: Ungültiges Code-Format: ${code}`);
            continue;
          }

          const codeData = {
            code: cleanCode,
            title,
            longTitle: row.longTitle?.toString().trim() || title,
            chapter: row.chapter?.toString().trim() || cleanCode.charAt(0),
            isBillable: row.isBillable?.toString().toLowerCase() === 'true' || 
                       row.isBillable?.toString() === '1' || 
                       row.isBillable?.toString().toLowerCase() === 'ja',
            parentCode: row.parentCode?.toString().trim() || null,
            synonyms: row.synonyms ? 
              row.synonyms.toString().split(',').map(s => s.trim()).filter(Boolean) : [],
            releaseYear: catalogYear,
            language: 'de',
            validFrom: new Date(`${catalogYear}-01-01`),
            isActive: true
          };

          codes.push(codeData);
          results.processed++;
        } catch (error) {
          errors.push(`Zeile ${i + 1}: ${error.message}`);
        }
      }
    } catch (error) {
      errors.push(`Datei-Verarbeitung: ${error.message}`);
    }

    results.errors = errors;

    if (validateOnly) {
      // Nur Validierung, kein Import
      fs.unlinkSync(req.file.path); // Cleanup
      return res.json({
        success: true,
        message: 'Validierung abgeschlossen',
        data: {
          ...results,
          wouldImport: codes.length
        }
      });
    }

    // Batch-Import
    if (codes.length > 0) {
      try {
        await Icd10Catalog.insertMany(codes, { ordered: false });
        results.imported = codes.length;
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key errors - versuche einzeln zu importieren
          for (const code of codes) {
            try {
              await Icd10Catalog.create(code);
              results.imported++;
            } catch (err) {
              if (err.code === 11000) {
                // Update existing
                await Icd10Catalog.findOneAndUpdate(
                  { code: code.code, releaseYear: catalogYear },
                  code,
                  { upsert: true }
                );
                results.updated++;
              } else {
                results.errors.push(`Code ${code.code}: ${err.message}`);
              }
            }
          }
        } else {
          throw error;
        }
      }
    }

    // Cleanup
    fs.unlinkSync(req.file.path);

    // Audit-Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'icd10.import',
      description: `ICD-10 Katalog für Jahr ${catalogYear} importiert`,
      details: {
        year: catalogYear,
        replaceExisting,
        ...results
      }
    });

    res.json({
      success: true,
      message: `Katalog-Import abgeschlossen`,
      data: results
    });

  } catch (error) {
    console.error('Catalog import error:', error);
    
    // Cleanup bei Fehler
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Fehler beim Import des Katalogs',
      error: error.message
    });
  }
});

// POST /api/icd10-catalog/activate/:year - Katalog aktivieren
router.post('/activate/:year', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { year } = req.params;
    const catalogYear = parseInt(year);

    const result = await Icd10Catalog.updateMany(
      { releaseYear: catalogYear },
      { isActive: true }
    );

    // Audit-Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'icd10.activate',
      description: `ICD-10 Katalog für Jahr ${catalogYear} aktiviert`,
      details: { year: catalogYear, updatedCount: result.modifiedCount }
    });

    res.json({
      success: true,
      message: `Katalog für Jahr ${catalogYear} aktiviert`,
      data: { updatedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Catalog activation error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktivieren des Katalogs'
    });
  }
});

// POST /api/icd10-catalog/deactivate/:year - Katalog deaktivieren
router.post('/deactivate/:year', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { year } = req.params;
    const catalogYear = parseInt(year);

    const result = await Icd10Catalog.updateMany(
      { releaseYear: catalogYear },
      { isActive: false }
    );

    // Audit-Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'icd10.deactivate',
      description: `ICD-10 Katalog für Jahr ${catalogYear} deaktiviert`,
      details: { year: catalogYear, updatedCount: result.modifiedCount }
    });

    res.json({
      success: true,
      message: `Katalog für Jahr ${catalogYear} deaktiviert`,
      data: { updatedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Catalog deactivation error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Deaktivieren des Katalogs'
    });
  }
});

// DELETE /api/icd10-catalog/:year - Katalog löschen
router.delete('/:year', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { year } = req.params;
    const catalogYear = parseInt(year);

    // Prüfe ob Katalog in Verwendung ist
    const DiagnosisUsageStats = require('../models/DiagnosisUsageStats');
    const usageCount = await DiagnosisUsageStats.countDocuments({ catalogYear });
    
    if (usageCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Katalog für Jahr ${catalogYear} wird noch verwendet (${usageCount} Diagnosen). Löschung nicht möglich.`
      });
    }

    const result = await Icd10Catalog.deleteMany({ releaseYear: catalogYear });

    // Audit-Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'icd10.delete',
      description: `ICD-10 Katalog für Jahr ${catalogYear} gelöscht`,
      details: { year: catalogYear, deletedCount: result.deletedCount }
    });

    res.json({
      success: true,
      message: `Katalog für Jahr ${catalogYear} gelöscht`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    console.error('Catalog deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Katalogs'
    });
  }
});

// GET /api/icd10-catalog/export/:year - Katalog exportieren
router.get('/export/:year', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { year } = req.params;
    const catalogYear = parseInt(year);

    const codes = await Icd10Catalog.find({ releaseYear: catalogYear })
      .sort({ code: 1 });

    if (codes.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Kein Katalog für Jahr ${catalogYear} gefunden`
      });
    }

    // CSV-Export
    const csvHeader = 'Code;Titel;Langtitel;Kapitel;Abrechenbar;ParentCode;Synonyme\n';
    const csvData = codes.map(code => 
      `${code.code};${code.title};${code.longTitle || ''};${code.chapter || ''};${code.isBillable};${code.parentCode || ''};${(code.synonyms || []).join(',')}`
    ).join('\n');

    const csvContent = csvHeader + csvData;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="icd10-katalog-${catalogYear}.csv"`);
    res.send(csvContent);

    // Audit-Log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'icd10.export',
      description: `ICD-10 Katalog für Jahr ${catalogYear} exportiert`,
      details: { year: catalogYear, exportedCount: codes.length }
    });

  } catch (error) {
    console.error('Catalog export error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Export des Katalogs'
    });
  }
});

module.exports = router;
