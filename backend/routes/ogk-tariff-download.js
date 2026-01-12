// ÖGK-Tarifdatenbank Download Routes

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ogkTariffDownloader = require('../services/ogkTariffDownloader');

// POST /api/ogk-tariff-download/ebm - EBM-Tarifdatenbank herunterladen
router.post('/ebm', auth, async (req, res) => {
  try {
    const { format = 'csv' } = req.body;
    
    const result = await ogkTariffDownloader.downloadEBMTariffs(format);
    
    res.json({
      success: true,
      message: 'EBM-Tarifdatenbank erfolgreich heruntergeladen',
      data: result
    });
  } catch (error) {
    console.error('Error downloading EBM tariffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Herunterladen der EBM-Tarifdatenbank',
      error: error.message
    });
  }
});

// POST /api/ogk-tariff-download/kho - KHO-Tarifdatenbank herunterladen
router.post('/kho', auth, async (req, res) => {
  try {
    const { format = 'csv' } = req.body;
    
    const result = await ogkTariffDownloader.downloadKHOTariffs(format);
    
    res.json({
      success: true,
      message: 'KHO-Tarifdatenbank erfolgreich heruntergeladen',
      data: result
    });
  } catch (error) {
    console.error('Error downloading KHO tariffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Herunterladen der KHO-Tarifdatenbank',
      error: error.message
    });
  }
});

// POST /api/ogk-tariff-download/goae - GOÄ-Tarifdatenbank herunterladen
router.post('/goae', auth, async (req, res) => {
  try {
    const { format = 'csv' } = req.body;
    
    const result = await ogkTariffDownloader.downloadGOAETariffs(format);
    
    res.json({
      success: true,
      message: 'GOÄ-Tarifdatenbank erfolgreich heruntergeladen',
      data: result
    });
  } catch (error) {
    console.error('Error downloading GOAE tariffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Herunterladen der GOÄ-Tarifdatenbank',
      error: error.message
    });
  }
});

// POST /api/ogk-tariff-download/all - Alle Tarifdatenbanken herunterladen
router.post('/all', auth, async (req, res) => {
  try {
    const { format = 'csv' } = req.body;
    
    const result = await ogkTariffDownloader.downloadAllTariffs(format);
    
    res.json({
      success: true,
      message: 'Tarifdatenbanken heruntergeladen',
      data: result
    });
  } catch (error) {
    console.error('Error downloading all tariffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Herunterladen der Tarifdatenbanken',
      error: error.message
    });
  }
});

// POST /api/ogk-tariff-download/ebm/import - EBM-Tarifdatenbank herunterladen und importieren
router.post('/ebm/import', auth, async (req, res) => {
  try {
    const { format = 'csv' } = req.body;
    
    const result = await ogkTariffDownloader.downloadAndImportEBM(req.user._id, format);
    
    res.json({
      success: true,
      message: 'EBM-Tarifdatenbank erfolgreich heruntergeladen und importiert',
      data: result
    });
  } catch (error) {
    console.error('Error downloading and importing EBM tariffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Herunterladen und Importieren der EBM-Tarifdatenbank',
      error: error.message
    });
  }
});

// POST /api/ogk-tariff-download/kho/import - KHO-Tarifdatenbank herunterladen und importieren
router.post('/kho/import', auth, async (req, res) => {
  try {
    const { format = 'csv' } = req.body;
    const tariffImporter = require('../utils/tariff-importer');
    
    console.log(`[KHO Import] Starte Download und Import (Format: ${format})`);
    
    // Lade KHO herunter
    const downloadResult = await ogkTariffDownloader.downloadKHOTariffs(format);
    
    if (!downloadResult || !downloadResult.filePath) {
      throw new Error('Download fehlgeschlagen: Keine Datei erhalten');
    }
    
    console.log(`[KHO Import] Download erfolgreich: ${downloadResult.filePath}`);
    
    // Importiere basierend auf tatsächlichem Format
    let importResult;
    const actualFormat = downloadResult.format || format;
    
    if (actualFormat === 'pdf') {
      console.log(`[KHO Import] Starte PDF-Import von ${downloadResult.filePath}`);
      const tariffs = await ogkTariffDownloader.parsePDF(downloadResult.filePath);
      console.log(`[KHO Import] PDF geparst: ${tariffs.length} Tarife gefunden`);
      importResult = await tariffImporter.saveTariffs(tariffs.map(t => ({ ...t, createdBy: req.user._id })));
      console.log(`[KHO Import] Speicherung abgeschlossen:`, importResult);
    } else if (actualFormat === 'csv') {
      console.log(`[KHO Import] Starte CSV-Import von ${downloadResult.filePath}`);
      importResult = await tariffImporter.importKHOFromCSV(downloadResult.filePath, req.user._id);
      console.log(`[KHO Import] CSV-Import abgeschlossen:`, importResult);
    } else {
      console.log(`[KHO Import] Starte XML-Import von ${downloadResult.filePath}`);
      const tariffs = await ogkTariffDownloader.parseEBMXML(downloadResult.filePath);
      console.log(`[KHO Import] XML geparst: ${tariffs.length} Tarife gefunden`);
      importResult = await tariffImporter.saveTariffs(tariffs.map(t => ({ ...t, createdBy: req.user._id })));
      console.log(`[KHO Import] Speicherung abgeschlossen:`, importResult);
    }
    
    res.json({
      success: true,
      message: 'KHO-Tarifdatenbank erfolgreich heruntergeladen und importiert',
      data: {
        download: downloadResult,
        import: importResult
      }
    });
  } catch (error) {
    console.error('[KHO Import] Fehler beim Download und Import:', error);
    console.error('[KHO Import] Stack:', error.stack);
    
    // Unterscheide zwischen Client-Fehlern (nicht konfiguriert, 404) und Server-Fehlern
    const isClientError = error.message.includes('nicht konfiguriert') || 
                          error.message.includes('nicht verfügbar') ||
                          error.message.includes('404') ||
                          error.message.includes('Download fehlgeschlagen');
    
    res.status(isClientError ? 400 : 500).json({
      success: false,
      message: error.message || 'Fehler beim Herunterladen und Importieren der KHO-Tarifdatenbank',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/ogk-tariff-download/goae/import - GOÄ-Tarifdatenbank herunterladen und importieren
router.post('/goae/import', auth, async (req, res) => {
  try {
    const { format = 'csv' } = req.body;
    const tariffImporter = require('../utils/tariff-importer');
    
    console.log(`[GOAE Import] Starte Download und Import (Format: ${format})`);
    
    // Lade GOÄ herunter
    const downloadResult = await ogkTariffDownloader.downloadGOAETariffs(format);
    
    if (!downloadResult || !downloadResult.filePath) {
      throw new Error('Download fehlgeschlagen: Keine Datei erhalten');
    }
    
    console.log(`[GOAE Import] Download erfolgreich: ${downloadResult.filePath}`);
    
    // Importiere
    let importResult;
    if (format === 'csv') {
      console.log(`[GOAE Import] Starte CSV-Import von ${downloadResult.filePath}`);
      importResult = await tariffImporter.importGOAEFromCSV(downloadResult.filePath, req.user._id);
      console.log(`[GOAE Import] CSV-Import abgeschlossen:`, importResult);
    } else {
      console.log(`[GOAE Import] Starte XML-Import von ${downloadResult.filePath}`);
      // Für XML: GOÄ hat ein anderes Format als KHO/EBM
      // Verwende parseEBMXML als Fallback, aber markiere als GOÄ
      const tariffs = await ogkTariffDownloader.parseEBMXML(downloadResult.filePath);
      console.log(`[GOAE Import] XML geparst: ${tariffs.length} Tarife gefunden`);
      
      // Konvertiere zu GOÄ-Format
      const goaeTariffs = tariffs.map(t => {
        // Entferne kho-Feld, da GOÄ ein anderes Format hat
        const { kho, ...rest } = t;
        return {
          ...rest,
          tariffType: 'goae',
          goae: {
            section: kho?.khoGroup || t.code?.split('-')[0] || '',
            number: t.code?.split('-')[1] || t.code || '',
            basePrice: kho?.khoPrice || 0,
            multiplier: 1.0,
            minMultiplier: 0.5,
            maxMultiplier: 3.5
          },
          createdBy: req.user._id
        };
      });
      
      console.log(`[GOAE Import] Konvertiert zu GOÄ-Format: ${goaeTariffs.length} Tarife`);
      importResult = await tariffImporter.saveTariffs(goaeTariffs);
      console.log(`[GOAE Import] Speicherung abgeschlossen:`, importResult);
    }
    
    res.json({
      success: true,
      message: 'GOÄ-Tarifdatenbank erfolgreich heruntergeladen und importiert',
      data: {
        download: downloadResult,
        import: importResult
      }
    });
  } catch (error) {
    console.error('[GOAE Import] Fehler beim Download und Import:', error);
    console.error('[GOAE Import] Stack:', error.stack);
    
    // Unterscheide zwischen Client-Fehlern (nicht konfiguriert) und Server-Fehlern
    const isClientError = error.message.includes('nicht konfiguriert') || 
                          error.message.includes('nicht verfügbar') ||
                          error.message.includes('404');
    
    res.status(isClientError ? 400 : 500).json({
      success: false,
      message: error.message || 'Fehler beim Herunterladen und Importieren der GOÄ-Tarifdatenbank',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/ogk-tariff-download/all/import - Alle Tarifdatenbanken herunterladen und importieren
router.post('/all/import', auth, async (req, res) => {
  try {
    const { format = 'csv' } = req.body;
    
    const result = await ogkTariffDownloader.downloadAndImportAll(req.user._id, format);
    
    res.json({
      success: true,
      message: 'Tarifdatenbanken erfolgreich heruntergeladen und importiert',
      data: result
    });
  } catch (error) {
    console.error('Error downloading and importing all tariffs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Herunterladen und Importieren der Tarifdatenbanken',
      error: error.message
    });
  }
});

// GET /api/ogk-tariff-download/check-updates - Prüft auf Updates
router.get('/check-updates', auth, async (req, res) => {
  try {
    const result = await ogkTariffDownloader.checkForUpdates();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error checking for updates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Prüfen auf Updates',
      error: error.message
    });
  }
});

// GET /api/ogk-tariff-download/info - Ruft Informationen über verfügbare Tarifdatenbanken ab
router.get('/info', auth, async (req, res) => {
  try {
    const info = await ogkTariffDownloader.getTariffInfo();
    
    res.json({
      success: true,
      data: info,
      urls: {
        ebm: ogkTariffDownloader.urls.ebmXml,
        kho: ogkTariffDownloader.urls.khoXml,
        goae: ogkTariffDownloader.urls.goaeXml,
        tarifsystem: ogkTariffDownloader.urls.tarifsystemUrl
      }
    });
  } catch (error) {
    console.error('Error fetching tariff info:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Tarif-Informationen',
      error: error.message
    });
  }
});

module.exports = router;

