const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const MedicationCatalog = require('../models/MedicationCatalog');
const auth = require('../middleware/auth');
const router = express.Router();

// Multer Config für File Upload
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

// @route   POST /api/medications/import
// @desc    Import Medikamentenkatalog aus CSV
// @access  Private (Admin only)
router.post('/import', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }

    const filePath = req.file.path;
    const medications = [];
    let processedCount = 0;
    let errorCount = 0;

    // CSV parsen
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({ separator: ';', skipLinesWithError: true }))
        .on('data', (row) => {
          try {
            // Mapping der CSV-Felder
            const medication = {
              name: row['Name'] || '',
              designation: row['Bezeichnung'] || '',
              approvalNumber: row['Zulassungsnummer'] || '',
              approvalDate: row['Zulassungsdatum'] || '',
              activeIngredient: row['Wirkstoff'] || '',
              atcCode: row['ATC Code'] || '',
              strength: row['MP_MPRO_STRENGHT'] || '',
              strengthUnit: row['MP_MPRO_STRENGHT_UNIT'] || '',
              form: row['MP_MPRO_PDFC_NAMES'] || '',
              manufacturer: row['Inhaber/-in\t'] || row['Inhaber/-in'] || '',
              requiresPrescription: row['MP_REQUIRES_PRESCRIPTION'] === 'Ja' || row['Rezeptpflichtstatus']?.includes('aerztliche Verschreibung') || false,
              prescriptionStatus: row['Rezeptpflichtstatus'] || '',
              isNarcotic: row['Suchtgift'] === '1',
              isPsychotropic: row['Psychotrop'] === '1',
              requiresAdditionalMonitoring: row['MP_ADDITIONAL_MONITORING'] === 'Ja' || false,
              category: row['Arzneimittelkategorie'] || '',
              type: row['Typ'] || '',
              usage: row['Verwendung'] || ''
            };

            if (medication.name) {
              medications.push(medication);
            }
            processedCount++;
          } catch (error) {
            console.error('Fehler beim Verarbeiten der Zeile:', error);
            errorCount++;
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Temporäre Datei löschen
    fs.unlinkSync(filePath);

    console.log(`Verarbeitet: ${processedCount} Zeilen, ${errorCount} Fehler, ${medications.length} Medikamente gültig`);

    // Medikamente in Datenbank importieren (Batch)
    let importedCount = 0;
    const batchSize = 1000;

    for (let i = 0; i < medications.length; i += batchSize) {
      const batch = medications.slice(i, i + batchSize);
      const result = await MedicationCatalog.insertMany(batch, { ordered: false });
      importedCount += result.length;
    }

    res.json({
      success: true,
      message: `Import erfolgreich: ${importedCount} Medikamente importiert`,
      data: {
        totalProcessed: processedCount,
        imported: importedCount,
        errors: errorCount,
        totalMedications: await MedicationCatalog.countDocuments()
      }
    });

  } catch (error) {
    console.error('Import-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Import: ' + error.message
    });
  }
});

// @route   GET /api/medications/search
// @desc    Suche Medikamente (Autocomplete)
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const searchTerm = q.trim();
    console.log(`Medikamenten-Suche: "${searchTerm}"`);

    // MongoDB Text Search mit Regex für bessere Performance
    const query = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { designation: { $regex: searchTerm, $options: 'i' } },
        { activeIngredient: { $regex: searchTerm, $options: 'i' } },
        { atcCode: { $regex: searchTerm, $options: 'i' } },
        { searchText: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    const medications = await MedicationCatalog.find(query)
      .select('name designation activeIngredient strength strengthUnit form atcCode requiresPrescription')
      .limit(parseInt(limit))
      .sort({ name: 1 })
      .lean();

    console.log(`Medikamenten-Suche: ${medications.length} Ergebnisse gefunden`);
    
    res.json({
      success: true,
      data: medications,
      count: medications.length
    });

  } catch (error) {
    console.error('Such-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Suche: ' + error.message
    });
  }
});

// @route   GET /api/medications/stats
// @desc    Statistiken über Medikamentenkatalog
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const totalCount = await MedicationCatalog.countDocuments();
    const requiresPrescriptionCount = await MedicationCatalog.countDocuments({ requiresPrescription: true });
    const narcoticCount = await MedicationCatalog.countDocuments({ isNarcotic: true });

    // Kategorien-Statistik
    const categoryStats = await MedicationCatalog.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        total: totalCount,
        requiresPrescription: requiresPrescriptionCount,
        narcotics: narcoticCount,
        categories: categoryStats
      }
    });

  } catch (error) {
    console.error('Statistik-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken'
    });
  }
});

module.exports = router;
