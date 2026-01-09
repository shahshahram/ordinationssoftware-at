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

    // Escape Regex-Sonderzeichen im Suchbegriff
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // EINFACHE LOGIK wie bei ICD10: Hole alle Ergebnisse, sortiere nach Relevanz
    const searchLimit = Math.max(parseInt(limit) * 5, 200);
    
    // Einfache Query: Alle Medikamente, die den Suchbegriff enthalten
    const query = {
      $or: [
        { name: { $regex: escapedSearchTerm, $options: 'i' } },
        { designation: { $regex: escapedSearchTerm, $options: 'i' } },
        { activeIngredient: { $regex: escapedSearchTerm, $options: 'i' } },
        { atcCode: { $regex: escapedSearchTerm, $options: 'i' } },
        { searchText: { $regex: escapedSearchTerm, $options: 'i' } }
      ]
    };
    
    // Hole alle relevanten Ergebnisse
    let medications = await MedicationCatalog.find(query)
      .select('_id name designation activeIngredient strength strengthUnit form atcCode requiresPrescription')
      .limit(searchLimit)
      .lean();
    
    // Sortierung nach Relevanz: Name beginnt mit Suchbegriff hat höchste Priorität
    const searchLower = searchTerm.toLowerCase();
    
    medications = medications.map(med => {
      const nameLower = (med.name || '').toLowerCase();
      let priority = 999; // Default: niedrigste Priorität
      
      // Priorität 1: Name beginnt EXAKT mit Suchbegriff (z.B. "nova" -> "Novalgin" wenn es mit "nova" beginnt)
      if (nameLower.startsWith(searchLower)) {
        priority = 1;
      }
      // Priorität 2: Name beginnt mit ersten 3 Zeichen (z.B. "nov" für "nova" -> "Novalgin")
      else if (searchLower.length >= 3) {
        const first3 = searchLower.substring(0, 3);
        if (nameLower.startsWith(first3)) {
          priority = 2;
        }
      }
      // Priorität 3: Name beginnt mit ersten 2 Zeichen
      if (priority === 999 && searchLower.length >= 2) {
        const first2 = searchLower.substring(0, 2);
        if (nameLower.startsWith(first2)) {
          priority = 3;
        }
      }
      // Priorität 4-6: Name enthält Suchbegriff, beginnt aber nicht damit
      if (priority === 999 && nameLower.includes(searchLower)) {
        const index = nameLower.indexOf(searchLower);
        if (index < 3) {
          priority = 4;
        } else if (index < 6) {
          priority = 5;
        } else {
          priority = 6;
        }
      }
      // Priorität 7: Andere Treffer (Wirkstoff, Bezeichnung, etc.) - bleibt bei 999
      
      return { ...med, priority, nameLower };
    });

    // Sortieren: Zuerst nach Priorität, dann nach Name
    medications.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Bei gleicher Priorität: Kürzere Namen zuerst, dann alphabetisch
      if (a.nameLower.length !== b.nameLower.length) {
        return a.nameLower.length - b.nameLower.length;
      }
      return a.nameLower.localeCompare(b.nameLower);
    });

    // Debug: Zeige die ersten 10 Ergebnisse mit Priorität
    console.log(`\n=== MEDIKAMENTEN-SUCHE DEBUG ===`);
    console.log(`Suchbegriff: "${searchTerm}" (lowercase: "${searchLower}")`);
    console.log(`Ergebnisse gefunden: ${medications.length} (vor Limit)`);
    
    // Suche speziell nach "Novalgin" in den Ergebnissen
    const novalgin = medications.find(m => (m.nameLower || '').includes('novalgin'));
    if (novalgin) {
      console.log(`\n✅ "Novalgin" gefunden:`);
      console.log(`  Name: ${novalgin.name}`);
      console.log(`  Priority: ${novalgin.priority}`);
      console.log(`  nameLower: ${novalgin.nameLower}`);
      console.log(`  startsWith "${searchLower}": ${novalgin.nameLower.startsWith(searchLower)}`);
      if (searchLower.length >= 3) {
        console.log(`  startsWith "${searchLower.substring(0, 3)}": ${novalgin.nameLower.startsWith(searchLower.substring(0, 3))}`);
      }
    } else {
      console.log(`\n❌ "Novalgin" NICHT in den Ergebnissen gefunden!`);
    }
    
    const top10 = medications.slice(0, 10).map(m => ({
      name: m.name,
      priority: m.priority,
      nameLower: m.nameLower,
      startsWithExact: (m.nameLower || '').startsWith(searchLower),
      startsWith3: searchLower.length >= 3 ? (m.nameLower || '').startsWith(searchLower.substring(0, 3)) : false
    }));
    console.log(`\nTop 10 Ergebnisse:`);
    top10.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name} (Priority: ${m.priority}, startsWithExact: ${m.startsWithExact}, startsWith3: ${m.startsWith3})`);
    });
    console.log(`=== ENDE DEBUG ===\n`);

    // Entferne priority und nameLower vor der Rückgabe
    medications = medications.map(({ priority, nameLower, ...med }) => med);

    // Jetzt erst auf das gewünschte Limit reduzieren
    medications = medications.slice(0, parseInt(limit));

    console.log(`Medikamenten-Suche: ${medications.length} finale Ergebnisse`);
    
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
