// Tarif-Import Routes

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const tariffImporter = require('../utils/tariff-importer');

// Multer-Konfiguration für File-Upload
const upload = multer({
  dest: 'uploads/tariffs/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.csv', '.json', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Nur CSV-, JSON- und PDF-Dateien sind erlaubt'));
    }
  }
});

// POST /api/tariff-import/goae - GOÄ-Tarife aus CSV importieren
router.post('/goae', [
  auth,
  upload.single('file')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }

    const result = await tariffImporter.importGOAEFromCSV(req.file.path, req.user._id);
    
    // Lösche temporäre Datei
    await fs.unlink(req.file.path);
    
    res.json({
      success: true,
      message: 'GOÄ-Tarife erfolgreich importiert',
      data: result
    });
  } catch (error) {
    // Lösche temporäre Datei bei Fehler
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting temp file:', unlinkError);
      }
    }
    
    console.error('Error importing GOAE tariffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Importieren der GOÄ-Tarife',
      error: error.message
    });
  }
});

// POST /api/tariff-import/kho - KHO/ET-Tarife aus CSV importieren
router.post('/kho', [
  auth,
  upload.single('file')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    let result;

    if (ext === '.pdf') {
      // PDF-Import
      console.log(`[KHO Import] PDF-Datei erkannt: ${req.file.path}`);
      const ogkTariffDownloader = require('../services/ogkTariffDownloader');
      const tariffs = await ogkTariffDownloader.parsePDF(req.file.path);
      console.log(`[KHO Import] ${tariffs.length} Tarife aus PDF extrahiert`);
      
      // Konvertiere zu Tariff-Format und speichere
      const tariffsWithUser = tariffs.map(t => ({
        ...t,
        createdBy: req.user._id
      }));
      result = await tariffImporter.saveTariffs(tariffsWithUser);
      console.log(`[KHO Import] ${result.created} neue Tarife erstellt, ${result.updated} aktualisiert`);
    } else {
      // CSV-Import (bestehende Funktionalität)
      console.log(`[KHO Import] Starte CSV-Import von: ${req.file.path}`);
      console.log(`[KHO Import] Datei-Größe: ${req.file.size} bytes`);
      console.log(`[KHO Import] Original-Name: ${req.file.originalname}`);
      
      // Prüfe Datei-Encoding (nur für Debugging)
      try {
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        const firstLines = fileContent.split('\n').slice(0, 3);
        console.log(`[KHO Import] Erste 3 Zeilen (erste 100 Zeichen pro Zeile):`);
        firstLines.forEach((line, idx) => {
          console.log(`  Zeile ${idx + 1}: ${line.substring(0, 100)}`);
        });
      } catch (readError) {
        console.warn('[KHO Import] Konnte Datei nicht zum Prüfen lesen:', readError.message);
      }
      
      result = await tariffImporter.importKHOFromCSV(req.file.path, req.user._id);
    }
    
    // Lösche temporäre Datei
    await fsPromises.unlink(req.file.path);
    
    res.json({
      success: true,
      message: `KHO/ET-Tarife erfolgreich importiert (${ext === '.pdf' ? 'PDF' : 'CSV'})`,
      data: result
    });
  } catch (error) {
    // Lösche temporäre Datei bei Fehler
    if (req.file) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting temp file:', unlinkError);
      }
    }
    
    console.error('[KHO Import] Fehler beim Importieren:', error);
    console.error('[KHO Import] Fehler-Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Importieren der KHO/ET-Tarife',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/tariff-import/json - Tarife aus JSON importieren (tarife.json Format)
router.post('/json', [
  auth,
  upload.single('file')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }

    const result = await tariffImporter.importFromJSON(req.file.path, req.user._id);
    
    // Lösche temporäre Datei
    await fs.unlink(req.file.path);
    
    res.json({
      success: true,
      message: 'Tarife erfolgreich importiert (tarife.json Format)',
      data: result
    });
  } catch (error) {
    // Lösche temporäre Datei bei Fehler
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting temp file:', unlinkError);
      }
    }
    
    console.error('Error importing tariffs from JSON:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Importieren der Tarife',
      error: error.message
    });
  }
});

// GET /api/tariff-import/export-json - Tarife als tarife.json exportieren
router.get('/export-json', auth, async (req, res) => {
  try {
    const { federalState, insuranceProvider } = req.query;
    
    const filters = {};
    if (federalState) filters.federalState = federalState;
    if (insuranceProvider) filters.insuranceProvider = insuranceProvider;
    
    const jsonData = await tariffImporter.exportToJSON(filters);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="tarife.json"');
    res.send(jsonData);
  } catch (error) {
    console.error('Error exporting tariffs to JSON:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Exportieren der Tarife',
      error: error.message
    });
  }
});

// POST /api/tariff-import/samples - Beispiel-Tarife erstellen
router.post('/samples', auth, async (req, res) => {
  try {
    const result = await tariffImporter.createSampleTariffs(req.user._id);
    
    res.json({
      success: true,
      message: 'Beispiel-Tarife erfolgreich erstellt',
      data: result
    });
  } catch (error) {
    console.error('Error creating sample tariffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Beispiel-Tarife',
      error: error.message
    });
  }
});

// POST /api/tariff-import/samples/extended - Erweiterte Beispiel-Tarife erstellen
router.post('/samples/extended', auth, async (req, res) => {
  try {
    const result = await tariffImporter.createExtendedSampleTariffs(req.user._id);
    
    res.json({
      success: true,
      message: 'Erweiterte Beispiel-Tarife erfolgreich erstellt',
      data: result
    });
  } catch (error) {
    console.error('Error creating extended sample tariffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der erweiterten Beispiel-Tarife',
      error: error.message
    });
  }
});

module.exports = router;

