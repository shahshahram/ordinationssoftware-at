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

