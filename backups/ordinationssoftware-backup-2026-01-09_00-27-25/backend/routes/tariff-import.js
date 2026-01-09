// Tarif-Import Routes

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const tariffImporter = require('../utils/tariff-importer');

// Multer-Konfiguration für File-Upload
const upload = multer({
  dest: 'uploads/tariffs/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.csv', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Nur CSV- und JSON-Dateien sind erlaubt'));
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

    const result = await tariffImporter.importKHOFromCSV(req.file.path, req.user._id);
    
    // Lösche temporäre Datei
    await fs.unlink(req.file.path);
    
    res.json({
      success: true,
      message: 'KHO/ET-Tarife erfolgreich importiert',
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
    
    console.error('Error importing KHO tariffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Importieren der KHO/ET-Tarife',
      error: error.message
    });
  }
});

// POST /api/tariff-import/json - Tarife aus JSON importieren
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
      message: 'Tarife erfolgreich importiert',
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

