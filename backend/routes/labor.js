const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const LaborResult = require('../models/LaborResult');
const LaborProvider = require('../models/LaborProvider');
const LaborMapping = require('../models/LaborMapping');
const laborParserService = require('../services/laborParserService');
const laborMappingService = require('../services/laborMappingService');
const InternalMessage = require('../models/InternalMessage');
const User = require('../models/User');

/**
 * POST /api/labor/receive
 * Empfängt Laborergebnisse von externen Systemen (Webhook)
 */
router.post('/receive', async (req, res) => {
  try {
    const { providerCode, format, data } = req.body;

    if (!providerCode || !format || !data) {
      return res.status(400).json({
        success: false,
        message: 'providerCode, format und data sind erforderlich'
      });
    }

    // Provider finden
    const provider = await LaborProvider.findOne({ code: providerCode, isActive: true });
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Labor-Provider nicht gefunden oder inaktiv'
      });
    }

    // Daten parsen basierend auf Format
    let parsedResult;
    switch (format.toLowerCase()) {
      case 'fhir':
        parsedResult = await laborParserService.parseFHIR(data, provider._id);
        break;
      case 'hl7v2':
      case 'hl7':
        parsedResult = await laborParserService.parseHL7v2(data, provider._id);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Unbekanntes Format: ${format}`
        });
    }

    // LaborResult speichern
    const laborResult = new LaborResult(parsedResult);
    await laborResult.save();

    // Populate providerId für Benachrichtigung
    await laborResult.populate('providerId', 'name code');

    // Sende Benachrichtigung an alle Mediziner
    notifyMedizinerAboutLaborResults(laborResult, 'Importiert').catch(err => {
      console.error('Fehler beim Senden der Benachrichtigung:', err);
      // Fehler nicht weiterwerfen, damit die Antwort nicht fehlschlägt
    });

    res.json({
      success: true,
      message: 'Laborergebnis erfolgreich empfangen',
      data: {
        id: laborResult._id,
        orderNumber: laborResult.orderNumber,
        resultCount: laborResult.resultCount,
        hasCriticalValues: laborResult.hasCriticalValues
      }
    });
  } catch (error) {
    console.error('Error receiving labor result:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Empfangen der Laborergebnisse',
      error: error.message
    });
  }
});

/**
 * GET /api/labor/patient/:patientId
 * Ruft alle Laborergebnisse für einen Patienten ab
 */
router.get('/patient/:patientId', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate, category, limit = 50 } = req.query;

    const filter = { patientId };

    if (startDate || endDate) {
      filter.resultDate = {};
      if (startDate) filter.resultDate.$gte = new Date(startDate);
      if (endDate) filter.resultDate.$lte = new Date(endDate);
    }

    if (category) {
      filter['results.loincCode'] = { $in: await getLoincCodesByCategory(category) };
    }

    const results = await LaborResult.find(filter)
      .populate('providerId', 'name code')
      .populate('orderedBy', 'firstName lastName')
      .populate('metadata.editHistory.editedBy', 'firstName lastName')
      .sort({ resultDate: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error fetching labor results:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Laborergebnisse',
      error: error.message
    });
  }
});

/**
 * GET /api/labor/recent
 * Ruft neue Laborwerte ab (z.B. aus den letzten 24 Stunden)
 * WICHTIG: Muss VOR /:id stehen, sonst wird "recent" als ID interpretiert
 */
router.get('/recent', auth, async (req, res) => {
  try {
    const { hours = 24, limit = 20 } = req.query;
    
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - parseInt(hours, 10));
    
    const limitNum = parseInt(limit, 10) || 20;
    
    // Filtere nach receivedAt ODER createdAt (für manuell erfasste Laborwerte)
    // Manuell erfasste Laborwerte haben receivedAt, aber wir filtern auch nach createdAt als Fallback
    const results = await LaborResult.find({
      $or: [
        { receivedAt: { $gte: cutoffDate } },
        { createdAt: { $gte: cutoffDate } }
      ],
      status: 'final'
    })
      .populate('providerId', 'name code')
      .lean();
    
    // Sortiere nach receivedAt (falls vorhanden), sonst createdAt, dann resultDate
    results.sort((a, b) => {
      const dateA = a.receivedAt || a.createdAt || a.resultDate || new Date(0);
      const dateB = b.receivedAt || b.createdAt || b.resultDate || new Date(0);
      return new Date(dateB) - new Date(dateA);
    });
    
    // Limit nach Sortierung anwenden
    const limitedResults = results.slice(0, limitNum);
    
    // Lade Patientendaten manuell (unterstützt sowohl Patient als auch PatientExtended)
    const Patient = require('../models/Patient');
    const PatientExtended = require('../models/PatientExtended');
    
    // Formatiere die Daten für das Dashboard
    const formattedResults = await Promise.all(limitedResults.map(async (result) => {
      const resultsArray = Array.isArray(result.results) ? result.results : [];
      const criticalCount = resultsArray.filter(r => r && r.isCritical === true).length;
      
      // Versuche Patient zu finden (erst PatientExtended, dann Patient)
      let patient = null;
      const patientId = result.patientId;
      
      if (patientId) {
        try {
          patient = await PatientExtended.findById(patientId).select('firstName lastName dateOfBirth').lean();
          if (!patient) {
            patient = await Patient.findById(patientId).select('firstName lastName dateOfBirth').lean();
          }
        } catch (err) {
          console.error('Error loading patient for labor result:', err);
        }
      }
      
      const patientName = patient 
        ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unbekannt'
        : 'Unbekannt';
      
      // Verwende receivedAt, falls vorhanden, sonst createdAt (für manuell erfasste)
      const displayDate = result.receivedAt || result.createdAt || result.resultDate;
      
      return {
        id: result._id,
        patientId: patientId ? String(patientId) : null, // Stelle sicher, dass patientId ein String ist
        patientName: patientName,
        providerName: result.providerId?.name || 'Unbekannt',
        receivedAt: displayDate,
        resultDate: result.resultDate,
        testCount: resultsArray.length,
        criticalCount: criticalCount,
        hasCriticalValues: criticalCount > 0
      };
    }));
    
    res.json({
      success: true,
      data: formattedResults,
      count: formattedResults.length
    });
  } catch (error) {
    console.error('Error fetching recent labor results:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der neuen Laborwerte',
      error: error.message
    });
  }
});

/**
 * GET /api/labor/providers
 * Ruft alle aktiven Labor-Provider ab
 * WICHTIG: Muss VOR /:id definiert werden, damit "providers" nicht als ID interpretiert wird
 */
router.get('/providers', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    console.log('GET /api/labor/providers - Route matched correctly');
    const { isActive, protocol, search } = req.query;
    
    const query = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (protocol) {
      query['integration.protocol'] = protocol;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    let providers = await LaborProvider.find(query).sort({ name: 1 });
    
    // Populate optional - nur wenn die Referenzen existieren
    try {
      providers = await LaborProvider.populate(providers, [
        { path: 'createdBy', select: 'firstName lastName' },
        { path: 'updatedBy', select: 'firstName lastName' }
      ]);
    } catch (populateError) {
      console.warn('Populate warning (continuing without):', populateError.message);
    }

    res.json({
      success: true,
      data: providers,
      count: providers.length
    });
  } catch (error) {
    console.error('Error fetching labor providers:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Labor-Provider',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/labor/:id
 * Ruft ein einzelnes Laborergebnis ab
 * WICHTIG: Muss NACH /providers definiert werden, damit spezifische Routen zuerst gematcht werden
 */
router.get('/:id', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const result = await LaborResult.findById(req.params.id)
      .populate('providerId', 'name code contact')
      .populate('patientId', 'firstName lastName dateOfBirth')
      .populate('orderedBy', 'firstName lastName');

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Laborergebnis nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching labor result:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Laborergebnisses',
      error: error.message
    });
  }
});

/**
 * GET /api/labor/providers/:id
 * Ruft einen einzelnen Labor-Provider ab
 */
router.get('/providers/:id', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const provider = await LaborProvider.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Labor-Provider nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('Error fetching provider:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Labor-Providers',
      error: error.message
    });
  }
});

/**
 * POST /api/labor/providers
 * Erstellt einen neuen Labor-Provider
 */
router.post('/providers', auth, checkPermission('admin'), async (req, res) => {
  try {
    const providerData = {
      ...req.body,
      createdBy: req.user._id
    };

    const provider = new LaborProvider(providerData);
    await provider.save();

    res.status(201).json({
      success: true,
      message: 'Labor-Provider erfolgreich erstellt',
      data: provider
    });
  } catch (error) {
    console.error('Error creating provider:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Labor-Providers',
      error: error.message
    });
  }
});

/**
 * PUT /api/labor/providers/:id
 * Aktualisiert einen Labor-Provider
 */
router.put('/providers/:id', auth, checkPermission('admin'), async (req, res) => {
  try {
    const provider = await LaborProvider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Labor-Provider nicht gefunden'
      });
    }

    // Update Felder
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'createdBy' && key !== 'createdAt') {
        provider[key] = req.body[key];
      }
    });

    provider.updatedBy = req.user._id;
    await provider.save();

    await provider.populate('updatedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Labor-Provider erfolgreich aktualisiert',
      data: provider
    });
  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Labor-Providers',
      error: error.message
    });
  }
});

/**
 * DELETE /api/labor/providers/:id
 * Löscht einen Labor-Provider
 */
router.delete('/providers/:id', auth, checkPermission('admin'), async (req, res) => {
  try {
    const provider = await LaborProvider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Labor-Provider nicht gefunden'
      });
    }

    // Prüfe ob Provider noch aktiv ist
    if (provider.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Aktiver Provider kann nicht gelöscht werden. Bitte deaktivieren Sie ihn zuerst.'
      });
    }

    await LaborProvider.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Labor-Provider erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting provider:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Labor-Providers',
      error: error.message
    });
  }
});

/**
 * GET /api/labor/mappings
 * Ruft alle Labor-Mappings ab
 */
router.get('/mappings', auth, checkPermission('admin'), async (req, res) => {
  try {
    const { providerId, category, search } = req.query;

    const filter = { isActive: true };
    if (providerId) filter.providerId = providerId;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { externalCode: { $regex: search, $options: 'i' } },
        { externalName: { $regex: search, $options: 'i' } },
        { loincCode: { $regex: search, $options: 'i' } },
        { loincName: { $regex: search, $options: 'i' } }
      ];
    }

    const mappings = await LaborMapping.find(filter)
      .populate('providerId', 'name code')
      .sort({ category: 1, externalCode: 1 });

    res.json({
      success: true,
      data: mappings,
      count: mappings.length
    });
  } catch (error) {
    console.error('Error fetching mappings:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Mappings',
      error: error.message
    });
  }
});

/**
 * POST /api/labor/mappings
 * Erstellt ein neues Labor-Mapping
 */
router.post('/mappings', auth, checkPermission('admin'), async (req, res) => {
  try {
    const mappingData = {
      ...req.body,
      createdBy: req.user._id
    };

    const mapping = new LaborMapping(mappingData);
    await mapping.save();

    res.status(201).json({
      success: true,
      message: 'Mapping erfolgreich erstellt',
      data: mapping
    });
  } catch (error) {
    console.error('Error creating mapping:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Mappings',
      error: error.message
    });
  }
});

/**
 * GET /api/labor/patient/:patientId/critical
 * Ruft kritische Laborwerte für einen Patienten ab
 */
router.get('/patient/:patientId/critical', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const results = await LaborResult.find({
      patientId,
      resultDate: { $gte: startDate },
      'results.isCritical': true
    })
      .populate('providerId', 'name code')
      .sort({ resultDate: -1 });

    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error fetching critical values:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der kritischen Werte',
      error: error.message
    });
  }
});

/**
 * GET /api/labor/patient/:patientId/trends/:loincCode
 * Ruft Trend-Daten für einen spezifischen Laborwert ab
 */
router.get('/patient/:patientId/trends/:loincCode', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const { patientId, loincCode } = req.params;
    const { days = 365 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const results = await LaborResult.find({
      patientId,
      resultDate: { $gte: startDate },
      'results.loincCode': loincCode
    })
      .select('resultDate results')
      .sort({ resultDate: 1 });

    // Extrahiere Trend-Daten
    const trendData = [];
    results.forEach(result => {
      const testResult = result.results.find(r => r.loincCode === loincCode);
      if (testResult && typeof testResult.value === 'number') {
        trendData.push({
          date: result.resultDate,
          value: testResult.value,
          unit: testResult.unit,
          referenceRange: testResult.referenceRange,
          interpretation: testResult.interpretation
        });
      }
    });

    res.json({
      success: true,
      data: trendData,
      count: trendData.length
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Trend-Daten',
      error: error.message
    });
  }
});

/**
 * POST /api/labor/manual
 * Erstellt manuell eingegebene Laborwerte
 */
router.post('/manual', auth, checkPermission('patients.write'), async (req, res) => {
  try {
    
    const {
      patientId,
      providerId,
      resultDate,
      collectionDate,
      results,
      interpretation,
      laboratoryComment,
      isScanned // Flag: true wenn Werte per Scan erfasst wurden
    } = req.body;

    // Validierung
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID ist erforderlich'
      });
    }

    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Mindestens ein Laborwert ist erforderlich'
      });
    }

    // Standard-Provider für manuelle Eingabe finden oder erstellen
    let provider;
    if (providerId) {
      provider = await LaborProvider.findById(providerId);
    }
    
    if (!provider) {
      // Erstelle oder finde Standard-Provider für manuelle Eingabe
      provider = await LaborProvider.findOne({ code: 'MANUAL' });
      if (!provider) {
        provider = new LaborProvider({
          name: 'Manuelle Eingabe',
          code: 'MANUAL',
          isActive: true,
          createdBy: req.user._id
        });
        await provider.save();
      }
    }

    // Verarbeite und validiere Ergebnisse
    const processedResults = results.map((result) => {
      const processed = {
        testName: result.testName,
        value: result.value,
        unit: result.unit || '',
        loincCode: result.loincCode || '',
        externalCode: result.externalCode || ''
      };

      // Referenzbereich
      if (result.referenceRange) {
        processed.referenceRange = {
          low: result.referenceRange.low,
          high: result.referenceRange.high,
          text: result.referenceRange.text
        };
      }

      // Interpretation automatisch bestimmen, falls nicht angegeben
      if (!result.interpretation && processed.referenceRange) {
        const numValue = typeof result.value === 'number' ? result.value : parseFloat(result.value);
        if (!isNaN(numValue)) {
          if (processed.referenceRange.low !== undefined && numValue < processed.referenceRange.low) {
            processed.interpretation = 'low';
          } else if (processed.referenceRange.high !== undefined && numValue > processed.referenceRange.high) {
            processed.interpretation = 'high';
          } else {
            processed.interpretation = 'normal';
          }
        } else {
          processed.interpretation = result.interpretation || 'normal';
        }
      } else {
        processed.interpretation = result.interpretation || 'normal';
      }

      // Kritische Werte prüfen
      processed.isCritical = result.isCritical === true || processed.interpretation === 'critical';
      
      if (result.comment) {
        processed.comment = result.comment;
      }

      return processed;
    });

    // Prüfe auf kritische Werte
    const hasCriticalValues = processedResults.some((r) => r.isCritical === true);

    // Hilfsfunktion: Kombiniere Datum mit aktueller Systemzeit
    const combineDateWithCurrentTime = (dateString) => {
      if (!dateString) {
        const now = new Date();
        console.log('🔍 combineDateWithCurrentTime: No dateString, returning now:', now.toISOString());
        return now;
      }
      // Wenn das Datum als String "YYYY-MM-DD" kommt, parse es explizit als lokales Datum
      // um Zeitzonenprobleme zu vermeiden
      let date;
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        // Parse als lokales Datum (nicht UTC)
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(dateString);
      }
      const now = new Date();
      console.log('🔍 combineDateWithCurrentTime:', {
        input: dateString,
        parsedDate: date.toISOString(),
        localDate: date.toLocaleString('de-DE', { timeZone: 'Europe/Vienna' }),
        hours: date.getHours(),
        minutes: date.getMinutes(),
        seconds: date.getSeconds(),
        nowHours: now.getHours(),
        nowMinutes: now.getMinutes()
      });
      // Wenn das Datum nur ein Datum ist (Zeit ist 00:00:00), verwende aktuelle Systemzeit
      if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
        date.setHours(now.getHours());
        date.setMinutes(now.getMinutes());
        date.setSeconds(now.getSeconds());
        date.setMilliseconds(now.getMilliseconds());
        console.log('🔍 combineDateWithCurrentTime: Applied current time, result:', date.toISOString(), 'local:', date.toLocaleString('de-DE', { timeZone: 'Europe/Vienna' }));
      }
      return date;
    };

    // Erstelle LaborResult
    // Verwende aktuelle Systemzeit für receivedAt (explizit, um Zeitzonenprobleme zu vermeiden)
    const now = new Date();
    console.log('🔍 Setting receivedAt for manual labor entry:', {
      now: now.toISOString(),
      localTime: now.toLocaleString('de-DE', { timeZone: 'Europe/Vienna' }),
      hours: now.getHours(),
      minutes: now.getMinutes(),
      seconds: now.getSeconds()
    });
    
    const combinedResultDate = combineDateWithCurrentTime(resultDate);
    const combinedCollectionDate = combineDateWithCurrentTime(collectionDate);
    
    console.log('🔍 Combined dates:', {
      resultDate: {
        input: resultDate,
        combined: combinedResultDate.toISOString(),
        local: combinedResultDate.toLocaleString('de-DE', { timeZone: 'Europe/Vienna' }),
        hours: combinedResultDate.getHours(),
        minutes: combinedResultDate.getMinutes()
      },
      collectionDate: {
        input: collectionDate,
        combined: combinedCollectionDate.toISOString(),
        local: combinedCollectionDate.toLocaleString('de-DE', { timeZone: 'Europe/Vienna' }),
        hours: combinedCollectionDate.getHours(),
        minutes: combinedCollectionDate.getMinutes()
      }
    });
    
    const laborResult = new LaborResult({
      patientId,
      providerId: provider._id,
      externalId: `MANUAL-${Date.now()}`,
      orderNumber: `MAN-${Date.now()}`,
      collectionDate: combinedCollectionDate,
      analysisDate: combinedResultDate,
      resultDate: combinedResultDate,
      receivedAt: now, // Explizit aktuelle Systemzeit verwenden
      status: 'final',
      results: processedResults,
      interpretation: interpretation || (hasCriticalValues ? 'Kritische Werte vorhanden' : undefined),
      laboratoryComment: laboratoryComment,
      orderedBy: req.user._id,
      metadata: {
        sourceFormat: isScanned ? 'scan' : 'manual',
        mappingVersion: '1.0',
        isScanned: isScanned === true
      },
      processingStatus: 'validated',
      hasCriticalValues
    });

    // Debug: Prüfe receivedAt vor dem Speichern
    console.log('🔍 Before save - laborResult.receivedAt:', {
      receivedAt: laborResult.receivedAt,
      receivedAtISO: laborResult.receivedAt?.toISOString(),
      receivedAtLocal: laborResult.receivedAt ? new Date(laborResult.receivedAt).toLocaleString('de-DE', { timeZone: 'Europe/Vienna' }) : null,
      hours: laborResult.receivedAt ? new Date(laborResult.receivedAt).getHours() : null,
      minutes: laborResult.receivedAt ? new Date(laborResult.receivedAt).getMinutes() : null
    });
    
    await laborResult.save();
    
    // Debug: Prüfe ob receivedAt korrekt gespeichert wurde
    const savedResult = await LaborResult.findById(laborResult._id).lean();
    console.log('🔍 After save - savedResult.receivedAt:', {
      receivedAt: savedResult.receivedAt,
      receivedAtISO: savedResult.receivedAt?.toISOString(),
      receivedAtLocal: savedResult.receivedAt ? new Date(savedResult.receivedAt).toLocaleString('de-DE', { timeZone: 'Europe/Vienna' }) : null,
      hours: savedResult.receivedAt ? new Date(savedResult.receivedAt).getHours() : null,
      minutes: savedResult.receivedAt ? new Date(savedResult.receivedAt).getMinutes() : null
    });

    // Populate providerId und editHistory für Benachrichtigung
    await laborResult.populate('providerId', 'name code');
    if (laborResult.metadata?.editHistory && laborResult.metadata.editHistory.length > 0) {
      await laborResult.populate('metadata.editHistory.editedBy', 'firstName lastName');
    }

    // Sende Benachrichtigung an alle Mediziner
    const sourceType = isScanned ? 'Per Scan' : 'Manuell';
    notifyMedizinerAboutLaborResults(laborResult, sourceType).catch(err => {
      console.error('Fehler beim Senden der Benachrichtigung:', err);
      // Fehler nicht weiterwerfen, damit die Antwort nicht fehlschlägt
    });

    res.status(201).json({
      success: true,
      message: 'Laborwerte erfolgreich erstellt',
      data: laborResult
    });
  } catch (error) {
    console.error('Error creating manual labor result:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Laborwerte',
      error: error.message
    });
  }
});

/**
 * PUT /api/labor/:id
 * Aktualisiert ein Laborergebnis (nur für manuelle/gescannte Werte)
 */
router.put('/:id', auth, checkPermission('patients.write'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      resultDate,
      collectionDate,
      results,
      interpretation,
      laboratoryComment
    } = req.body;

    // Finde das Laborergebnis
    const laborResult = await LaborResult.findById(id);
    if (!laborResult) {
      return res.status(404).json({
        success: false,
        message: 'Laborergebnis nicht gefunden'
      });
    }

    // Prüfe ob bearbeitbar (nur manuelle/gescannte Werte)
    const sourceFormat = laborResult.metadata?.sourceFormat;
    const isScanned = laborResult.metadata?.isScanned;
    const isEditable = sourceFormat === 'manual' || sourceFormat === 'scan' || isScanned === true;

    if (!isEditable) {
      return res.status(403).json({
        success: false,
        message: 'Dieses Laborergebnis kann nicht bearbeitet werden. Nur manuell erfasste oder gescannte Werte können bearbeitet werden.'
      });
    }

    // Speichere alte Werte für Historie
    const oldValues = {
      results: JSON.parse(JSON.stringify(laborResult.results)),
      interpretation: laborResult.interpretation,
      laboratoryComment: laborResult.laboratoryComment,
      resultDate: laborResult.resultDate,
      collectionDate: laborResult.collectionDate
    };

    // Hilfsfunktion: Kombiniere Datum mit aktueller Systemzeit
    const combineDateWithCurrentTime = (dateString) => {
      if (!dateString) {
        const now = new Date();
        console.log('🔍 combineDateWithCurrentTime (PUT): No dateString, returning now:', now.toISOString());
        return now;
      }
      // Wenn das Datum als String "YYYY-MM-DD" kommt, parse es explizit als lokales Datum
      // um Zeitzonenprobleme zu vermeiden
      let date;
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        // Parse als lokales Datum (nicht UTC)
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(dateString);
      }
      const now = new Date();
      console.log('🔍 combineDateWithCurrentTime (PUT):', {
        input: dateString,
        parsedDate: date.toISOString(),
        localDate: date.toLocaleString('de-DE', { timeZone: 'Europe/Vienna' }),
        hours: date.getHours(),
        minutes: date.getMinutes(),
        seconds: date.getSeconds(),
        nowHours: now.getHours(),
        nowMinutes: now.getMinutes()
      });
      // Wenn das Datum nur ein Datum ist (Zeit ist 00:00:00), verwende aktuelle Systemzeit
      if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
        date.setHours(now.getHours());
        date.setMinutes(now.getMinutes());
        date.setSeconds(now.getSeconds());
        date.setMilliseconds(now.getMilliseconds());
        console.log('🔍 combineDateWithCurrentTime (PUT): Applied current time, result:', date.toISOString(), 'local:', date.toLocaleString('de-DE', { timeZone: 'Europe/Vienna' }));
      }
      return date;
    };

    // Aktualisiere Felder
    if (resultDate) laborResult.resultDate = combineDateWithCurrentTime(resultDate);
    if (collectionDate) laborResult.collectionDate = combineDateWithCurrentTime(collectionDate);
    
    // Aktualisiere receivedAt auf aktuelle Systemzeit bei Bearbeitung
    const now = new Date();
    console.log('🔍 Updating receivedAt for edited labor result:', {
      oldReceivedAt: laborResult.receivedAt,
      newReceivedAt: now.toISOString(),
      localTime: now.toLocaleString('de-DE', { timeZone: 'Europe/Vienna' }),
      hours: now.getHours(),
      minutes: now.getMinutes()
    });
    laborResult.receivedAt = now; // Aktualisiere receivedAt auf aktuelle Zeit
    if (results && Array.isArray(results) && results.length > 0) {
      // Verarbeite und validiere Ergebnisse
      const processedResults = results.map((result) => {
        const processed = {
          testName: result.testName,
          value: result.value,
          unit: result.unit || '',
          loincCode: result.loincCode || '',
          externalCode: result.externalCode || ''
        };

        if (result.referenceRange) {
          processed.referenceRange = {
            low: result.referenceRange.low,
            high: result.referenceRange.high,
            text: result.referenceRange.text
          };
        }

        if (!result.interpretation && processed.referenceRange) {
          const numValue = typeof result.value === 'number' ? result.value : parseFloat(result.value);
          if (!isNaN(numValue)) {
            if (processed.referenceRange.low !== undefined && numValue < processed.referenceRange.low) {
              processed.interpretation = 'low';
            } else if (processed.referenceRange.high !== undefined && numValue > processed.referenceRange.high) {
              processed.interpretation = 'high';
            } else {
              processed.interpretation = 'normal';
            }
          } else {
            processed.interpretation = result.interpretation || 'normal';
          }
        } else {
          processed.interpretation = result.interpretation || 'normal';
        }

        processed.isCritical = result.isCritical === true || processed.interpretation === 'critical';
        if (result.comment) processed.comment = result.comment;

        return processed;
      });
      laborResult.results = processedResults;
      laborResult.hasCriticalValues = processedResults.some((r) => r.isCritical === true);
    }
    if (interpretation !== undefined) laborResult.interpretation = interpretation;
    if (laboratoryComment !== undefined) laborResult.laboratoryComment = laboratoryComment;

    // Berechne detaillierte Änderungen für Historie
    const changes = {};
    if (JSON.stringify(oldValues.results) !== JSON.stringify(laborResult.results)) {
      changes.results = {
        old: oldValues.results,
        new: JSON.parse(JSON.stringify(laborResult.results))
      };
    }
    if (oldValues.interpretation !== laborResult.interpretation) {
      changes.interpretation = { old: oldValues.interpretation, new: laborResult.interpretation };
    }
    if (oldValues.laboratoryComment !== laborResult.laboratoryComment) {
      changes.laboratoryComment = { old: oldValues.laboratoryComment, new: laborResult.laboratoryComment };
    }
    if (oldValues.resultDate?.getTime() !== laborResult.resultDate?.getTime()) {
      changes.resultDate = { old: oldValues.resultDate, new: laborResult.resultDate };
    }
    if (oldValues.collectionDate?.getTime() !== laborResult.collectionDate?.getTime()) {
      changes.collectionDate = { old: oldValues.collectionDate, new: laborResult.collectionDate };
    }
    
    // Speichere Historie in metadata
    if (!laborResult.metadata) laborResult.metadata = {};
    if (!laborResult.metadata.editHistory) laborResult.metadata.editHistory = [];
    
    // Nur Historie-Eintrag erstellen, wenn tatsächlich Änderungen vorgenommen wurden
    if (Object.keys(changes).length > 0) {
      laborResult.metadata.editHistory.push({
        editedAt: now,
        editedBy: req.user._id,
        oldValues: oldValues,
        newValues: {
          results: JSON.parse(JSON.stringify(laborResult.results)),
          interpretation: laborResult.interpretation,
          laboratoryComment: laborResult.laboratoryComment,
          resultDate: laborResult.resultDate,
          collectionDate: laborResult.collectionDate,
          receivedAt: laborResult.receivedAt
        },
        changes: changes // Detaillierte Änderungen
      });
      console.log('🔍 Added edit history entry:', {
        editedAt: now.toISOString(),
        editedBy: req.user._id,
        changesCount: Object.keys(changes).length,
        changes: Object.keys(changes)
      });
    }

    await laborResult.save();
    
    // Populate editHistory für Antwort
    if (laborResult.metadata?.editHistory && laborResult.metadata.editHistory.length > 0) {
      await laborResult.populate('metadata.editHistory.editedBy', 'firstName lastName');
    }

    res.json({
      success: true,
      message: 'Laborergebnis erfolgreich aktualisiert',
      data: laborResult
    });
  } catch (error) {
    console.error('Error updating labor result:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Laborergebnisses',
      error: error.message
    });
  }
});


// Helper-Funktion: Sende interne Nachricht an alle Mediziner über neue Laborwerte
async function notifyMedizinerAboutLaborResults(laborResult, sourceType = 'Importiert') {
  try {
    // Finde alle Benutzer mit Mediziner-Rollen
    // Rollen laut User-Model: 'super_admin', 'admin', 'arzt', 'assistent', 'rezeption', 'billing', 'patient'
    const medizinerRoles = ['arzt', 'admin', 'super_admin']; // Ärzte und Admins erhalten Benachrichtigungen
    const mediziner = await User.find({
      role: { $in: medizinerRoles },
      isActive: true
    }).select('_id firstName lastName');

    if (!mediziner || mediziner.length === 0) {
      console.log('Keine Mediziner gefunden für Laborwerte-Benachrichtigung');
      return;
    }

    // Lade Patientendaten
    const Patient = require('../models/Patient');
    const PatientExtended = require('../models/PatientExtended');
    let patient = null;
    const patientId = laborResult.patientId;
    
    if (patientId) {
      try {
        patient = await PatientExtended.findById(patientId).select('firstName lastName').lean();
        if (!patient) {
          patient = await Patient.findById(patientId).select('firstName lastName').lean();
        }
      } catch (err) {
        console.error('Error loading patient for notification:', err);
      }
    }

    const patientName = patient 
      ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unbekannt'
      : 'Unbekannt';

    // Lade Provider-Daten falls noch nicht populated
    let providerName = 'Unbekanntes Labor';
    if (laborResult.providerId) {
      if (typeof laborResult.providerId === 'object' && laborResult.providerId.name) {
        providerName = laborResult.providerId.name;
      } else {
        try {
          const provider = await LaborProvider.findById(laborResult.providerId).select('name').lean();
          if (provider) providerName = provider.name;
        } catch (err) {
          console.error('Error loading provider for notification:', err);
        }
      }
    }

    const resultCount = laborResult.results?.length || 0;
    const criticalCount = laborResult.results?.filter((r) => r && r.isCritical === true).length || 0;
    const hasCritical = criticalCount > 0;

    // Erstelle Nachrichtentext
    const subject = hasCritical 
      ? `⚠️ KRITISCH: Neue Laborwerte für ${patientName}`
      : `Neue Laborwerte für ${patientName}`;
    
    const message = `Neue Laborwerte wurden erfasst:\n\n` +
      `Patient: ${patientName}\n` +
      `Labor: ${providerName}\n` +
      `Anzahl Tests: ${resultCount}\n` +
      `Quelle: ${sourceType}\n` +
      `Datum: ${new Date(laborResult.resultDate || laborResult.receivedAt).toLocaleString('de-DE')}\n` +
      (hasCritical ? `\n⚠️ WICHTIG: ${criticalCount} kritische Werte vorhanden!\n` : '') +
      (laborResult.interpretation ? `\nInterpretation: ${laborResult.interpretation}` : '') +
      `\n\nBitte prüfen Sie die Laborwerte im Patienten-Organizer.`;

    // Sende Nachricht an jeden Mediziner
    const notificationPromises = mediziner.map(async (medizinerUser) => {
      try {
        // Verwende System-User als Absender (oder ersten Admin)
        const systemUser = await User.findOne({ role: 'admin' }).select('_id');
        const senderId = systemUser?._id || medizinerUser._id; // Fallback falls kein Admin existiert

        const notification = new InternalMessage({
          senderId: senderId,
          recipientId: medizinerUser._id,
          subject: subject,
          message: message,
          priority: hasCritical ? 'urgent' : 'high',
          status: 'sent',
          patientId: patientId // Speichere patientId für Navigation
        });

        await notification.save();
        console.log(`✅ Benachrichtigung an ${medizinerUser.firstName} ${medizinerUser.lastName} gesendet`);
      } catch (err) {
        console.error(`Fehler beim Senden der Benachrichtigung an ${medizinerUser.firstName} ${medizinerUser.lastName}:`, err);
      }
    });

    await Promise.all(notificationPromises);
    console.log(`📧 ${mediziner.length} Benachrichtigungen über neue Laborwerte gesendet`);
  } catch (error) {
    console.error('Fehler beim Senden der Laborwerte-Benachrichtigungen:', error);
    // Fehler nicht weiterwerfen, damit das Speichern der Laborwerte nicht fehlschlägt
  }
}

// Helper-Funktion
async function getLoincCodesByCategory(category) {
  const mappings = await LaborMapping.find({ category, isActive: true }).select('loincCode');
  return mappings.map(m => m.loincCode).filter(Boolean);
}

module.exports = router;

