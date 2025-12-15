const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dicomParser = require('dicom-parser');
const auth = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const DicomStudy = require('../models/DicomStudy');
const { body, validationResult } = require('express-validator');

// Multer-Konfiguration für DICOM-Dateien
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'dicom');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Erstelle eindeutigen Dateinamen mit Timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `dicom-${uniqueSuffix}.dcm`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500 MB max
  },
  fileFilter: (req, file, cb) => {
    // Akzeptiere DICOM-Dateien (.dcm) oder Dateien ohne Extension (DICOM kann ohne Extension sein)
    if (file.mimetype === 'application/dicom' || 
        file.originalname.endsWith('.dcm') || 
        file.originalname.endsWith('.dicom') ||
        !path.extname(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Nur DICOM-Dateien sind erlaubt'));
    }
  }
});

// Hilfsfunktion: DICOM-Tag extrahieren
const getDicomTag = (dataSet, tag, defaultValue = null) => {
  try {
    const element = dataSet.elements[tag];
    if (!element) return defaultValue;
    
    // Prüfe ob es ein String ist
    if (element.vr === 'PN') {
      // Person Name - kann mehrere Komponenten haben
      const value = dicomParser.explicitElementToString(dataSet.byteArray, element);
      return value || defaultValue;
    } else if (element.vr === 'DA') {
      // Date - Format: YYYYMMDD
      return dicomParser.explicitElementToString(dataSet.byteArray, element) || defaultValue;
    } else if (element.vr === 'TM') {
      // Time - Format: HHMMSS.FFFFFF
      return dicomParser.explicitElementToString(dataSet.byteArray, element) || defaultValue;
    } else if (element.vr === 'IS' || element.vr === 'DS') {
      // Integer String oder Decimal String
      return dicomParser.explicitElementToString(dataSet.byteArray, element) || defaultValue;
    } else if (element.vr === 'SQ') {
      // Sequence - nicht direkt lesbar
      return defaultValue;
    } else {
      // Standard String-Konvertierung
      return dicomParser.explicitElementToString(dataSet.byteArray, element) || defaultValue;
    }
  } catch (error) {
    console.error(`Fehler beim Lesen von Tag ${tag}:`, error);
    return defaultValue;
  }
};

// Hilfsfunktion: DICOM-Tag als Zahl extrahieren
const getDicomTagAsNumber = (dataSet, tag, defaultValue = null) => {
  try {
    const element = dataSet.elements[tag];
    if (!element) return defaultValue;
    
    if (element.vr === 'IS' || element.vr === 'DS') {
      const value = dicomParser.explicitElementToString(dataSet.byteArray, element);
      return value ? parseFloat(value) : defaultValue;
    } else if (element.vr === 'US' || element.vr === 'SS' || element.vr === 'UL' || element.vr === 'SL') {
      // Unsigned/Signed Short/Long
      return dicomParser.readUint16(dataSet.byteArray, element.dataOffset) || defaultValue;
    }
    return defaultValue;
  } catch (error) {
    console.error(`Fehler beim Lesen von Tag ${tag} als Zahl:`, error);
    return defaultValue;
  }
};

/**
 * @route   POST /api/dicom/upload
 * @desc    DICOM-Datei hochladen und Metadaten extrahieren
 * @access  Private (patients.write)
 */
router.post('/upload', 
  auth, 
  checkPermission('patients.write'),
  upload.single('dicomFile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Keine DICOM-Datei hochgeladen'
        });
      }

      const { patientId } = req.body;
      
      if (!patientId) {
        // Lösche hochgeladene Datei wenn kein Patient angegeben
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Patient-ID ist erforderlich'
        });
      }

      // Lese DICOM-Datei
      const dicomFile = fs.readFileSync(req.file.path);
      let dataSet;
      
      try {
        dataSet = dicomParser.parseDicom(dicomFile);
      } catch (parseError) {
        console.error('Fehler beim Parsen der DICOM-Datei:', parseError);
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Ungültige DICOM-Datei: Die Datei konnte nicht geparst werden',
          error: parseError.message,
          details: 'Bitte stellen Sie sicher, dass es sich um eine gültige DICOM-Datei handelt (.dcm oder .dicom Format)'
        });
      }
      
      // Prüfe, ob die DICOM-Datei überhaupt Tags enthält
      if (!dataSet || !dataSet.elements || Object.keys(dataSet.elements).length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Ungültige DICOM-Datei: Keine DICOM-Tags gefunden',
          error: 'Die Datei scheint keine DICOM-Daten zu enthalten',
          details: 'Bitte überprüfen Sie, ob die Datei eine gültige DICOM-Datei ist'
        });
      }

      // Extrahiere wichtige DICOM-Tags und sammle fehlende Tags
      const missingTags = [];
      const studyInstanceUID = getDicomTag(dataSet, '0020000D'); // Study Instance UID
      if (!studyInstanceUID) missingTags.push('StudyInstanceUID (0020000D)');
      
      const seriesInstanceUID = getDicomTag(dataSet, '0020000E'); // Series Instance UID
      if (!seriesInstanceUID) missingTags.push('SeriesInstanceUID (0020000E)');
      
      const sopInstanceUID = getDicomTag(dataSet, '00080018'); // SOP Instance UID
      if (!sopInstanceUID) missingTags.push('SOPInstanceUID (00080018)');
      
      // Falls studyInstanceUID nicht vorhanden, generiere eine eindeutige UID
      let finalStudyInstanceUID = studyInstanceUID;
      if (!finalStudyInstanceUID) {
        // Generiere eine eindeutige UID im DICOM-Format (1.2.840.10008...)
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        finalStudyInstanceUID = `1.2.840.10008.${timestamp}.${random}`;
        console.log(`⚠️ StudyInstanceUID nicht in DICOM gefunden, generiert: ${finalStudyInstanceUID}`);
      }
      
      // Prüfe ob Studie bereits existiert (nur wenn UID aus DICOM stammt)
      if (studyInstanceUID) {
        const existingStudy = await DicomStudy.findOne({ studyInstanceUID });
        if (existingStudy) {
          // Lösche hochgeladene Datei da Studie bereits existiert
          fs.unlinkSync(req.file.path);
          return res.status(409).json({
            success: false,
            message: 'Diese DICOM-Studie existiert bereits',
            data: existingStudy
          });
        }
      }

      // Extrahiere Patienten-Informationen
      let patientName = getDicomTag(dataSet, '00100010'); // Patient's Name
      if (!patientName) missingTags.push('Patient Name (00100010)');
      
      const dicomPatientId = getDicomTag(dataSet, '00100020'); // Patient ID
      const patientBirthDate = getDicomTag(dataSet, '00100030'); // Patient's Birth Date
      const patientSex = getDicomTag(dataSet, '00100040'); // Patient's Sex

      // Falls patientName nicht in DICOM vorhanden, hole es aus der Datenbank
      let patientNameSource = 'DICOM';
      if (!patientName) {
        const PatientExtended = require('../models/PatientExtended');
        const patient = await PatientExtended.findById(patientId);
        if (patient) {
          patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unbekannt';
          patientNameSource = 'Datenbank';
        } else {
          patientName = 'Unbekannt';
          patientNameSource = 'Fallback';
        }
      }

      // Extrahiere Studien-Informationen
      const studyDate = getDicomTag(dataSet, '00080020'); // Study Date
      const studyTime = getDicomTag(dataSet, '00080030'); // Study Time
      const studyDescription = getDicomTag(dataSet, '00081030'); // Study Description
      const studyID = getDicomTag(dataSet, '00200010'); // Study ID
      const accessionNumber = getDicomTag(dataSet, '00080050'); // Accession Number

      // Extrahiere Serien-Informationen
      const seriesNumber = getDicomTagAsNumber(dataSet, '00200011'); // Series Number
      const seriesDescription = getDicomTag(dataSet, '0008103E'); // Series Description
      const modality = getDicomTag(dataSet, '00080060'); // Modality
      const seriesDate = getDicomTag(dataSet, '00080021'); // Series Date
      const seriesTime = getDicomTag(dataSet, '00080031'); // Series Time

      // Extrahiere Instanz-Informationen
      const instanceNumber = getDicomTagAsNumber(dataSet, '00200013'); // Instance Number
      const sopClassUID = getDicomTag(dataSet, '00080016'); // SOP Class UID

      // Extrahiere Bild-Informationen
      const rows = getDicomTagAsNumber(dataSet, '00280010'); // Rows
      const columns = getDicomTagAsNumber(dataSet, '00280011'); // Columns
      const bitsAllocated = getDicomTagAsNumber(dataSet, '00280100'); // Bits Allocated
      const bitsStored = getDicomTagAsNumber(dataSet, '00280101'); // Bits Stored
      const samplesPerPixel = getDicomTagAsNumber(dataSet, '00280002'); // Samples Per Pixel
      const photometricInterpretation = getDicomTag(dataSet, '00280004'); // Photometric Interpretation
      const numberOfFrames = getDicomTagAsNumber(dataSet, '00280008', 1); // Number of Frames

      // Window Center/Width (für Bildanzeige)
      const windowCenter = getDicomTagAsNumber(dataSet, '00281050'); // Window Center
      const windowWidth = getDicomTagAsNumber(dataSet, '00281051'); // Window Width

      // Referenz-Informationen
      const referringPhysicianName = getDicomTag(dataSet, '00080090'); // Referring Physician's Name
      const performingPhysicianName = getDicomTag(dataSet, '00081050'); // Performing Physician's Name

      // Debug: Prüfe Werte vor dem Erstellen des DicomStudy-Objekts
      console.log('🔍 DICOM Upload - Vor dem Erstellen des DicomStudy-Objekts:');
      console.log('  - patientId:', patientId);
      console.log('  - finalStudyInstanceUID:', finalStudyInstanceUID);
      console.log('  - patientName:', patientName);
      console.log('  - patientNameSource:', patientNameSource);
      console.log('  - missingTags:', missingTags);

      // Validiere, dass erforderliche Werte vorhanden sind
      if (!finalStudyInstanceUID) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        finalStudyInstanceUID = `1.2.840.10008.${timestamp}.${random}`;
        console.log(`⚠️ finalStudyInstanceUID war null, neu generiert: ${finalStudyInstanceUID}`);
      }

      if (!patientName || patientName.trim() === '') {
        const PatientExtended = require('../models/PatientExtended');
        const patient = await PatientExtended.findById(patientId);
        if (patient) {
          patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unbekannt';
          patientNameSource = 'Datenbank (zweiter Versuch)';
        } else {
          patientName = 'Unbekannt';
          patientNameSource = 'Fallback (zweiter Versuch)';
        }
        console.log(`⚠️ patientName war leer/null, neu gesetzt: ${patientName} (Quelle: ${patientNameSource})`);
      }

      // Erstelle DICOM-Studie-Eintrag
      const dicomStudy = new DicomStudy({
        patientId: patientId,
        studyInstanceUID: finalStudyInstanceUID,
        seriesInstanceUID: seriesInstanceUID || undefined,
        sopInstanceUID: sopInstanceUID || undefined,
        patientName: patientName,
        dicomPatientId: dicomPatientId || undefined,
        patientBirthDate: patientBirthDate,
        patientSex: patientSex,
        studyDate: studyDate,
        studyTime: studyTime,
        studyDescription: studyDescription,
        studyID: studyID,
        accessionNumber: accessionNumber,
        seriesNumber: seriesNumber,
        seriesDescription: seriesDescription,
        modality: modality,
        seriesDate: seriesDate,
        seriesTime: seriesTime,
        instanceNumber: instanceNumber,
        sopClassUID: sopClassUID,
        filename: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        numberOfFrames: numberOfFrames,
        rows: rows,
        columns: columns,
        bitsAllocated: bitsAllocated,
        bitsStored: bitsStored,
        samplesPerPixel: samplesPerPixel,
        photometricInterpretation: photometricInterpretation,
        windowCenter: windowCenter,
        windowWidth: windowWidth,
        referringPhysicianName: referringPhysicianName,
        performingPhysicianName: performingPhysicianName,
        status: 'ready',
        uploadedBy: req.user.id
      });

      // Speichere alle DICOM-Tags in metadata (optional, für spätere Verwendung)
      const metadata = new Map();
      Object.keys(dataSet.elements).forEach(tag => {
        try {
          const element = dataSet.elements[tag];
          if (element && element.vr !== 'SQ') { // Ignoriere Sequences
            const value = dicomParser.explicitElementToString(dataSet.byteArray, element);
            if (value) {
              metadata.set(tag, value);
            }
          }
        } catch (error) {
          // Ignoriere Fehler beim Extrahieren einzelner Tags
        }
      });
      dicomStudy.metadata = metadata;

      // Validiere vor dem Speichern und sammle fehlende erforderliche Felder
      const missingFields = [];
      if (!finalStudyInstanceUID) missingFields.push('StudyInstanceUID (0020000D)');
      if (!patientName || patientName === 'Unbekannt') missingFields.push('Patient Name (00100010)');
      
      // Versuche zu speichern
      try {
        await dicomStudy.save();
        console.log('✅ DICOM-Studie gespeichert:', dicomStudy._id);
        console.log('✅ DICOM-Studie uploadedAt:', dicomStudy.uploadedAt);

        // Sende Benachrichtigung an alle Mediziner
        console.log('📧 DICOM-Benachrichtigung: Rufe notifyMedizinerAboutDicomStudy auf...');
        console.log('📧 DICOM-Benachrichtigung: Studie-Details:', {
          _id: dicomStudy._id,
          patientId: dicomStudy.patientId,
          studyDescription: dicomStudy.studyDescription,
          modality: dicomStudy.modality,
          uploadedAt: dicomStudy.uploadedAt
        });
        
        // Rufe die Benachrichtigungsfunktion auf und warte auf das Ergebnis
        const notificationResult = await notifyMedizinerAboutDicomStudy(dicomStudy).catch(err => {
          console.error('❌ Fehler beim Senden der DICOM-Benachrichtigung:', err);
          console.error('❌ Error Stack:', err.stack);
          // Fehler nicht weiterwerfen, damit die Antwort nicht fehlschlägt
          return { success: false, error: err.message };
        });
        
        console.log('📧 DICOM-Benachrichtigung: Ergebnis:', notificationResult);
      } catch (saveError) {
        console.error('Fehler beim Speichern der DICOM-Studie:', saveError);
        
        // Extrahiere spezifische Validierungsfehler
        if (saveError.name === 'ValidationError') {
          const validationErrors = [];
          Object.keys(saveError.errors || {}).forEach(field => {
            const err = saveError.errors[field];
            validationErrors.push(`${field}: ${err.message}`);
          });
          
          // Lösche Datei bei Fehler
          if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          
          return res.status(400).json({
            success: false,
            message: 'Validierungsfehler beim Speichern der DICOM-Studie',
            error: saveError.message,
            details: validationErrors,
            missingFields: missingFields.length > 0 ? missingFields : undefined,
            missingTags: missingTags.length > 0 ? missingTags : undefined,
            explanation: 'Die DICOM-Datei konnte nicht gespeichert werden, da erforderliche Felder fehlen oder ungültig sind.'
          });
        }
        
        throw saveError; // Re-throw für allgemeine Fehlerbehandlung
      }
      
      await dicomStudy.populate('patientId', 'firstName lastName');
      await dicomStudy.populate('uploadedBy', 'firstName lastName');

      // Warnung, wenn wichtige Tags fehlen
      const warnings = [];
      if (!studyInstanceUID) warnings.push('StudyInstanceUID wurde generiert (Tag 0020000D nicht in DICOM-Datei gefunden)');
      if (patientNameSource !== 'DICOM') warnings.push(`Patient Name wurde aus ${patientNameSource === 'Datenbank' ? 'Datenbank' : 'Fallback'} geholt (Tag 00100010 nicht in DICOM-Datei gefunden)`);
      if (!modality) warnings.push('Modality (Tag 00080060) nicht gefunden');
      if (!studyDate) warnings.push('Study Date (Tag 00080020) nicht gefunden');
      if (!seriesInstanceUID) warnings.push('SeriesInstanceUID (Tag 0020000E) nicht gefunden');
      if (!sopInstanceUID) warnings.push('SOPInstanceUID (Tag 00080018) nicht gefunden');

      // Erstelle detaillierte Antwort
      const response = {
        success: true,
        message: 'DICOM-Datei erfolgreich hochgeladen',
        data: dicomStudy
      };
      
      if (warnings.length > 0) {
        response.warnings = warnings;
        response.missingTags = missingTags.filter(tag => 
          !tag.includes('StudyInstanceUID') && !tag.includes('Patient Name')
        ); // Zeige nur Tags, die nicht durch Fallbacks ersetzt wurden
      }
      
      if (missingTags.length > 0 && process.env.NODE_ENV === 'development') {
        response.debug = {
          totalMissingTags: missingTags.length,
          missingTags: missingTags
        };
      }

      res.json(response);

    } catch (error) {
      console.error('Fehler beim Hochladen der DICOM-Datei:', error);
      
      // Lösche Datei bei Fehler
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      // Erstelle detaillierte Fehlermeldung
      let errorMessage = 'Fehler beim Hochladen der DICOM-Datei';
      let errorDetails = error.message;
      
      if (error.name === 'ValidationError') {
        errorMessage = 'Validierungsfehler: Die DICOM-Datei konnte nicht gespeichert werden';
        const validationErrors = [];
        Object.keys(error.errors || {}).forEach(field => {
          const err = error.errors[field];
          validationErrors.push(`- ${field}: ${err.message}`);
        });
        errorDetails = validationErrors.join('\n');
      } else if (error.message) {
        errorDetails = error.message;
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: errorDetails,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

/**
 * @route   GET /api/dicom/recent
 * @desc    Kürzlich eingetroffene DICOM-Studien abrufen (für Dashboard)
 * @access  Private (patients.read)
 */
router.get('/recent', auth, async (req, res) => {
  try {
    const { hours = 72, limit = 10 } = req.query;
    const hoursNum = parseInt(hours) || 72;
    const limitNum = parseInt(limit) || 10;
    
    // Berechne Zeitpunkt (X Stunden zurück)
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursNum);
    
    console.log('🔍 DICOM /recent: Suche Studien seit', cutoffDate.toISOString());
    
    // Finde kürzlich hochgeladene DICOM-Studien
    const recentStudies = await DicomStudy.find({
      uploadedAt: { $gte: cutoffDate }
    })
      .populate('patientId', 'firstName lastName')
      .populate('uploadedBy', 'firstName lastName')
      .sort({ uploadedAt: -1 })
      .limit(limitNum)
      .lean();
    
    console.log('🔍 DICOM /recent: Gefundene Studien:', recentStudies.length);
    
    const PatientExtended = require('../models/PatientExtended');
    
    // Formatiere die Daten für das Dashboard
    const formattedStudies = await Promise.all(recentStudies.map(async (study) => {
      // Versuche Patient zu finden
      let patient = null;
      const patientId = study.patientId;
      
      if (patientId) {
        try {
          if (typeof patientId === 'object' && patientId._id) {
            // Bereits populated
            patient = patientId;
          } else {
            patient = await PatientExtended.findById(patientId).select('firstName lastName dateOfBirth').lean();
          }
        } catch (err) {
          console.error('Error loading patient for DICOM study:', err);
        }
      }
      
      const patientName = patient 
        ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unbekannt'
        : study.patientName || 'Unbekannt';
      
      // Verwende studyDate/studyTime, falls vorhanden, sonst uploadedAt
      const displayDate = study.studyDate ? 
        new Date(
          study.studyDate.substring(0, 4) + '-' + 
          study.studyDate.substring(4, 6) + '-' + 
          study.studyDate.substring(6, 8)
        ) : 
        study.uploadedAt;
      
      return {
        id: study._id,
        patientId: patientId ? (typeof patientId === 'object' ? String(patientId._id || patientId) : String(patientId)) : null,
        patientName: patientName,
        studyDescription: study.studyDescription || study.modality || 'DICOM-Studie',
        modality: study.modality,
        uploadedAt: study.uploadedAt,
        studyDate: displayDate,
        seriesCount: 1, // Wird später berechnet, wenn nötig
        imageCount: 1
      };
    }));
    
    res.json({
      success: true,
      data: formattedStudies,
      count: formattedStudies.length
    });
  } catch (error) {
    console.error('Error fetching recent DICOM studies:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der neuen DICOM-Studien',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/dicom/patient/:patientId
 * @desc    Alle DICOM-Studien für einen Patienten abrufen
 * @access  Private (patients.read)
 */
router.get('/patient/:patientId', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const studies = await DicomStudy.find({ patientId })
      .populate('uploadedBy', 'firstName lastName')
      .sort({ studyDate: -1, uploadedAt: -1 });

    res.json({
      success: true,
      data: studies
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der DICOM-Studien:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der DICOM-Studien',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/dicom/studies/:studyId/file
 * @desc    DICOM-Datei abrufen (für Viewer)
 * @access  Private (patients.read)
 */
router.get('/studies/:studyId/file', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const { studyId } = req.params;
    
    const study = await DicomStudy.findById(studyId);
    if (!study) {
      return res.status(404).json({
        success: false,
        message: 'DICOM-Studie nicht gefunden'
      });
    }

    if (!fs.existsSync(study.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'DICOM-Datei nicht gefunden'
      });
    }

    // Setze Content-Type für DICOM
    res.setHeader('Content-Type', 'application/dicom');
    res.setHeader('Content-Disposition', `inline; filename="${study.filename}"`);
    
    // Sende Datei
    const fileStream = fs.createReadStream(study.filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Fehler beim Abrufen der DICOM-Datei:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der DICOM-Datei',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/dicom/wado
 * @desc    WADO-URL Handler (für Cornerstone.js)
 * @access  Private (patients.read)
 */
router.get('/wado', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const { studyInstanceUID, seriesInstanceUID, objectUID } = req.query;
    
    if (!studyInstanceUID || !objectUID) {
      return res.status(400).json({
        success: false,
        message: 'studyInstanceUID und objectUID sind erforderlich'
      });
    }

    // Finde Studie
    const query = { studyInstanceUID, sopInstanceUID: objectUID };
    if (seriesInstanceUID) {
      query.seriesInstanceUID = seriesInstanceUID;
    }

    const study = await DicomStudy.findOne(query);
    if (!study) {
      return res.status(404).json({
        success: false,
        message: 'DICOM-Studie nicht gefunden'
      });
    }

    if (!fs.existsSync(study.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'DICOM-Datei nicht gefunden'
      });
    }

    // Setze CORS-Header für Cornerstone.js
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/dicom');
    
    // Sende Datei
    const fileStream = fs.createReadStream(study.filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Fehler beim WADO-Abruf:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der DICOM-Datei',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/dicom/studies/:studyId
 * @desc    DICOM-Studie-Details abrufen
 * @access  Private (patients.read)
 */
router.get('/studies/:studyId', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const { studyId } = req.params;
    
    const study = await DicomStudy.findById(studyId)
      .populate('patientId', 'firstName lastName')
      .populate('uploadedBy', 'firstName lastName');

    if (!study) {
      return res.status(404).json({
        success: false,
        message: 'DICOM-Studie nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: study
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der DICOM-Studie:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der DICOM-Studie',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/dicom/studies/:studyId
 * @desc    DICOM-Studie löschen
 * @access  Private (patients.write)
 */
router.delete('/studies/:studyId', auth, checkPermission('patients.write'), async (req, res) => {
  try {
    const { studyId } = req.params;
    
    const study = await DicomStudy.findById(studyId);
    if (!study) {
      return res.status(404).json({
        success: false,
        message: 'DICOM-Studie nicht gefunden'
      });
    }

    // Lösche Datei
    if (fs.existsSync(study.filePath)) {
      fs.unlinkSync(study.filePath);
    }

    // Lösche Datenbank-Eintrag
    await DicomStudy.findByIdAndDelete(studyId);

    res.json({
      success: true,
      message: 'DICOM-Studie erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen der DICOM-Studie:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der DICOM-Studie',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/dicom/receive
 * @desc    Empfängt DICOM-Dateien von externen Instituten (Webhook)
 * @access  Public (mit Provider-Code Authentifizierung)
 */
router.post('/receive', upload.single('dicomFile'), async (req, res) => {
  const DicomProvider = require('../models/DicomProvider');
  const InternalMessage = require('../models/InternalMessage');
  const User = require('../models/User');
  const AuditLog = require('../models/AuditLog');
  
  let provider = null;
  let uploadedFile = null;
  
  try {
    const { providerCode, apiKey, patientId, patientMatching } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    // Validiere Provider-Code
    if (!providerCode) {
      return res.status(400).json({
        success: false,
        message: 'providerCode ist erforderlich'
      });
    }

    // Finde Provider in der Datenbank
    provider = await DicomProvider.findOne({ 
      code: providerCode.toUpperCase(), 
      isActive: true 
    });
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'DICOM-Provider nicht gefunden oder inaktiv'
      });
    }

    // IP-Whitelist prüfen
    if (!provider.isIpAllowed(clientIp)) {
      // Logge versuchten Zugriff
      try {
        await AuditLog.create({
          action: 'dicom_upload_denied',
          resource: 'DicomProvider',
          resourceId: provider._id,
          userId: null,
          details: {
            reason: 'IP not whitelisted',
            ip: clientIp,
            providerCode: provider.code
          },
          ipAddress: clientIp
        });
      } catch (auditError) {
        console.error('Fehler beim Audit-Log:', auditError);
      }
      
      return res.status(403).json({
        success: false,
        message: 'Zugriff von dieser IP-Adresse nicht erlaubt'
      });
    }

    // API-Key Validierung (falls konfiguriert)
    if (provider.integration.rest && provider.integration.rest.apiKey) {
      if (!apiKey || !provider.validateApiKey(apiKey)) {
        // Logge fehlgeschlagene Authentifizierung
        try {
          await AuditLog.create({
            action: 'dicom_upload_auth_failed',
            resource: 'DicomProvider',
            resourceId: provider._id,
            userId: null,
            details: {
              reason: 'Invalid API key',
              providerCode: provider.code
            },
            ipAddress: clientIp
          });
        } catch (auditError) {
          console.error('Fehler beim Audit-Log:', auditError);
        }
        
        return res.status(401).json({
          success: false,
          message: 'Ungültiger API-Key'
        });
      }
    }

    // Prüfe Dateigröße
    if (req.file && provider.security.maxFileSize) {
      const maxSizeBytes = provider.security.maxFileSize * 1024 * 1024; // MB zu Bytes
      if (req.file.size > maxSizeBytes) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: `Datei zu groß. Max. erlaubte Größe: ${provider.security.maxFileSize} MB`
        });
      }
    }

    // Prüfe ob DICOM-Datei vorhanden
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine DICOM-Datei hochgeladen'
      });
    }

    uploadedFile = req.file.path;

    // Lese DICOM-Datei
    const dicomFile = fs.readFileSync(req.file.path);
    let dataSet;
    
    try {
      dataSet = dicomParser.parseDicom(dicomFile);
    } catch (parseError) {
      console.error('Fehler beim Parsen der DICOM-Datei:', parseError);
      fs.unlinkSync(req.file.path);
      await provider.updateStats(false, parseError.message);
      return res.status(400).json({
        success: false,
        message: 'Ungültige DICOM-Datei: Die Datei konnte nicht geparst werden',
        error: parseError.message
      });
    }

    // Prüfe, ob die DICOM-Datei überhaupt Tags enthält
    if (!dataSet || !dataSet.elements || Object.keys(dataSet.elements).length === 0) {
      fs.unlinkSync(req.file.path);
      await provider.updateStats(false, 'Keine DICOM-Tags gefunden');
      return res.status(400).json({
        success: false,
        message: 'Ungültige DICOM-Datei: Keine DICOM-Tags gefunden'
      });
    }

    // Extrahiere Patientendaten aus DICOM
    const dicomPatientName = getDicomTag(dataSet, '00100010'); // Patient's Name
    const dicomPatientId = getDicomTag(dataSet, '00100020'); // Patient ID
    const patientBirthDate = getDicomTag(dataSet, '00100030'); // Patient's Birth Date
    const patientSex = getDicomTag(dataSet, '00100040'); // Patient's Sex
    const modality = getDicomTag(dataSet, '00080060'); // Modality

    // Prüfe Modality-Filter
    if (provider.mapping.allowedModalities && provider.mapping.allowedModalities.length > 0) {
      if (!modality || !provider.mapping.allowedModalities.includes(modality)) {
        fs.unlinkSync(req.file.path);
        await provider.updateStats(false, `Modality ${modality} nicht erlaubt`);
        return res.status(400).json({
          success: false,
          message: `Modality '${modality}' ist für diesen Provider nicht erlaubt`,
          allowedModalities: provider.mapping.allowedModalities
        });
      }
    }

    // Finde Patient in der Datenbank
    let patient = null;
    const PatientExtended = require('../models/PatientExtended');
    const Patient = require('../models/Patient');

    // Verwende Matching-Strategie vom Provider
    const matchingStrategy = patientMatching || provider.mapping.patientMatching || 'name-dob';

    // Wenn patientId direkt übergeben wurde, verwende diese
    if (patientId) {
      patient = await PatientExtended.findById(patientId) || await Patient.findById(patientId);
    } else {
      // Versuche Patient anhand DICOM-Daten zu finden
      if (matchingStrategy === 'name-dob' && dicomPatientName && patientBirthDate) {
        // Parse Patient Name (Format: LAST^FIRST^MIDDLE oder LAST^FIRST)
        const nameParts = dicomPatientName.split('^');
        const lastName = nameParts[0] || '';
        const firstName = nameParts[1] || '';
        
        // Parse Geburtsdatum (Format: YYYYMMDD)
        const birthDate = patientBirthDate ? new Date(
          patientBirthDate.substring(0, 4),
          parseInt(patientBirthDate.substring(4, 6)) - 1,
          patientBirthDate.substring(6, 8)
        ) : null;

        if (lastName && firstName && birthDate) {
          patient = await PatientExtended.findOne({
            firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
            lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
            dateOfBirth: birthDate
          }) || await Patient.findOne({
            firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
            lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
            dateOfBirth: birthDate
          });
        }
      } else if (matchingStrategy === 'patient-id' && dicomPatientId) {
        // Suche nach Patient ID
        patient = await PatientExtended.findOne({
          $or: [
            { insuranceNumber: dicomPatientId },
            { socialSecurityNumber: dicomPatientId },
            { 'metadata.externalId': dicomPatientId }
          ]
        }) || await Patient.findOne({
          $or: [
            { insuranceNumber: dicomPatientId },
            { socialSecurityNumber: dicomPatientId }
          ]
        });
      } else if (matchingStrategy === 'multiple') {
        // Versuche mehrere Strategien
        if (dicomPatientName && patientBirthDate) {
          const nameParts = dicomPatientName.split('^');
          const lastName = nameParts[0] || '';
          const firstName = nameParts[1] || '';
          const birthDate = patientBirthDate ? new Date(
            patientBirthDate.substring(0, 4),
            parseInt(patientBirthDate.substring(4, 6)) - 1,
            patientBirthDate.substring(6, 8)
          ) : null;

          if (lastName && firstName && birthDate) {
            patient = await PatientExtended.findOne({
              firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
              lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
              dateOfBirth: birthDate
            }) || await Patient.findOne({
              firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
              lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
              dateOfBirth: birthDate
            });
          }
        }
        
        if (!patient && dicomPatientId) {
          patient = await PatientExtended.findOne({
            $or: [
              { insuranceNumber: dicomPatientId },
              { socialSecurityNumber: dicomPatientId },
              { 'metadata.externalId': dicomPatientId }
            ]
          }) || await Patient.findOne({
            $or: [
              { insuranceNumber: dicomPatientId },
              { socialSecurityNumber: dicomPatientId }
            ]
          });
        }
      }
    }

    if (!patient) {
      fs.unlinkSync(req.file.path);
      await provider.updateStats(false, 'Patient nicht gefunden');
      
      // Audit-Log
      try {
        await AuditLog.create({
          action: 'dicom_upload_failed',
          resource: 'DicomProvider',
          resourceId: provider._id,
          userId: null,
          details: {
            reason: 'Patient not found',
            dicomPatientName: dicomPatientName,
            dicomPatientId: dicomPatientId,
            patientBirthDate: patientBirthDate,
            matchingStrategy: matchingStrategy
          },
          ipAddress: clientIp
        });
      } catch (auditError) {
        console.error('Fehler beim Audit-Log:', auditError);
      }
      
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden',
        error: 'Der Patient konnte anhand der DICOM-Daten nicht in der Datenbank gefunden werden',
        details: {
          dicomPatientName: dicomPatientName,
          dicomPatientId: dicomPatientId,
          patientBirthDate: patientBirthDate,
          matchingStrategy: matchingStrategy,
          suggestion: 'Bitte stellen Sie sicher, dass der Patient in der Datenbank existiert oder übergeben Sie die patientId direkt'
        }
      });
    }

    // Extrahiere wichtige DICOM-Tags
    const studyInstanceUID = getDicomTag(dataSet, '0020000D');
    const seriesInstanceUID = getDicomTag(dataSet, '0020000E');
    const sopInstanceUID = getDicomTag(dataSet, '00080018');

    // Generiere StudyInstanceUID falls nicht vorhanden
    let finalStudyInstanceUID = studyInstanceUID;
    if (!finalStudyInstanceUID) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000000);
      finalStudyInstanceUID = `1.2.840.10008.${timestamp}.${random}`;
    }

    // Prüfe ob Studie bereits existiert
    if (studyInstanceUID) {
      const existingStudy = await DicomStudy.findOne({ studyInstanceUID });
      if (existingStudy) {
        fs.unlinkSync(req.file.path);
        return res.status(409).json({
          success: false,
          message: 'Diese DICOM-Studie existiert bereits',
          data: {
            studyId: existingStudy._id,
            studyInstanceUID: existingStudy.studyInstanceUID
          }
        });
      }
    }

    // Extrahiere weitere DICOM-Informationen
    const studyDate = getDicomTag(dataSet, '00080020');
    const studyTime = getDicomTag(dataSet, '00080030');
    const studyDescription = getDicomTag(dataSet, '00081030');
    const seriesDescription = getDicomTag(dataSet, '0008103E');
    const referringPhysicianName = getDicomTag(dataSet, '00080090');
    const performingPhysicianName = getDicomTag(dataSet, '00081050');

    // Erstelle Patient Name aus Datenbank
    const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();

    // Erstelle DICOM-Studie-Eintrag
    const dicomStudy = new DicomStudy({
      patientId: patient._id,
      studyInstanceUID: finalStudyInstanceUID,
      seriesInstanceUID: seriesInstanceUID || undefined,
      sopInstanceUID: sopInstanceUID || undefined,
      patientName: patientName,
      dicomPatientId: dicomPatientId || undefined,
      patientBirthDate: patientBirthDate,
      patientSex: patientSex,
      studyDate: studyDate,
      studyTime: studyTime,
      studyDescription: studyDescription,
      modality: modality,
      seriesDescription: seriesDescription,
      referringPhysicianName: referringPhysicianName,
      performingPhysicianName: performingPhysicianName,
      filename: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      status: 'ready',
      uploadedBy: null, // Externer Upload hat keinen internen User
      source: 'external',
      externalProvider: provider.code
    });

    await dicomStudy.save();
    console.log('✅ DICOM-Studie (extern) gespeichert:', dicomStudy._id);

    // Sende Benachrichtigung an alle Mediziner
    // Die notifyMedizinerAboutDicomStudy Funktion sendet bereits Benachrichtigungen
    // Prüfe ob Provider-Benachrichtigungen aktiviert sind, aber verwende die zentrale Funktion
    console.log('📧 DICOM-Benachrichtigung (extern): Rufe notifyMedizinerAboutDicomStudy auf...');
    console.log('📧 DICOM-Benachrichtigung (extern): Provider notifyOnUpload:', provider.notifications?.notifyOnUpload);
    
    // Sende Benachrichtigung nur wenn Provider-Benachrichtigungen aktiviert sind
    // oder wenn keine Provider-Konfiguration vorhanden ist (Standard: immer benachrichtigen)
    if (provider.notifications?.notifyOnUpload !== false) {
      notifyMedizinerAboutDicomStudy(dicomStudy).catch(err => {
        console.error('❌ Fehler beim Senden der DICOM-Benachrichtigung (extern):', err);
        console.error('❌ Error Stack:', err.stack);
      });
    } else {
      console.log('📧 DICOM-Benachrichtigung (extern): Provider-Benachrichtigungen sind deaktiviert');
    }

    // Update Provider-Statistiken
    await provider.updateStats(true);

    // Audit-Log für erfolgreichen Upload
    try {
      await AuditLog.create({
        action: 'dicom_upload_success',
        resource: 'DicomStudy',
        resourceId: dicomStudy._id,
        userId: null,
        details: {
          providerCode: provider.code,
          providerName: provider.name,
          patientId: patient._id,
          studyInstanceUID: finalStudyInstanceUID,
          modality: modality,
          fileSize: req.file.size
        },
        ipAddress: clientIp
      });
    } catch (auditError) {
      console.error('Fehler beim Audit-Log:', auditError);
    }

    res.json({
      success: true,
      message: 'DICOM-Datei erfolgreich empfangen',
      data: {
        studyId: dicomStudy._id,
        studyInstanceUID: dicomStudy.studyInstanceUID,
        patientId: patient._id,
        patientName: patientName,
        modality: modality,
        studyDate: studyDate
      }
    });

  } catch (error) {
    console.error('Fehler beim Empfangen der DICOM-Datei:', error);
    
    // Lösche Datei bei Fehler
    if (uploadedFile && fs.existsSync(uploadedFile)) {
      fs.unlinkSync(uploadedFile);
    }
    
    // Update Provider-Statistiken bei Fehler
    if (provider) {
      try {
        await provider.updateStats(false, error.message);
      } catch (statsError) {
        console.error('Fehler beim Update der Statistiken:', statsError);
      }
    }
    
    // Audit-Log für Fehler
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'dicom_upload_error',
        resource: 'DicomProvider',
        resourceId: provider ? provider._id : null,
        userId: null,
        details: {
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
      });
    } catch (auditError) {
      console.error('Fehler beim Audit-Log:', auditError);
    }
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Empfangen der DICOM-Datei',
      error: error.message
    });
  }
});

// Helper-Funktion: Sende interne Nachricht an alle Mediziner über neue DICOM-Studien
async function notifyMedizinerAboutDicomStudy(dicomStudy) {
  try {
    console.log('📧 DICOM-Benachrichtigung: Starte Benachrichtigung für Studie:', {
      studyId: dicomStudy._id,
      patientId: dicomStudy.patientId,
      studyDescription: dicomStudy.studyDescription,
      modality: dicomStudy.modality
    });
    
    const InternalMessage = require('../models/InternalMessage');
    const User = require('../models/User');
    
    // Finde alle Benutzer mit Mediziner-Rollen
    // Prüfe auch 'doctor' Rolle, da diese in manchen Teilen des Systems verwendet wird
    const medizinerRoles = ['arzt', 'admin', 'super_admin', 'doctor'];
    const mediziner = await User.find({
      role: { $in: medizinerRoles },
      isActive: true
    }).select('_id firstName lastName role');

    console.log('📧 DICOM-Benachrichtigung: Gefundene Mediziner:', mediziner.length);
    if (mediziner.length > 0) {
      console.log('📧 DICOM-Benachrichtigung: Mediziner Details:', mediziner.map(m => ({
        id: m._id,
        name: `${m.firstName} ${m.lastName}`,
        role: m.role
      })));
    }

    if (!mediziner || mediziner.length === 0) {
      console.log('⚠️ Keine Mediziner gefunden für DICOM-Benachrichtigung');
      console.log('⚠️ Gesuchte Rollen:', medizinerRoles);
      // Prüfe welche Rollen tatsächlich in der DB existieren
      const allRoles = await User.distinct('role');
      console.log('⚠️ Verfügbare Rollen in der Datenbank:', allRoles);
      return;
    }

    // Lade Patientendaten
    const PatientExtended = require('../models/PatientExtended');
    const Patient = require('../models/Patient');
    let patient = null;
    const patientId = dicomStudy.patientId;
    
    if (patientId) {
      try {
        patient = await PatientExtended.findById(patientId).select('firstName lastName').lean();
        if (!patient) {
          patient = await Patient.findById(patientId).select('firstName lastName').lean();
        }
      } catch (err) {
        console.error('Error loading patient for DICOM notification:', err);
      }
    }

    const patientName = patient 
      ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
      : dicomStudy.patientName || 'Unbekannt';

    const studyDescription = dicomStudy.studyDescription || dicomStudy.modality || 'DICOM-Studie';
    const modality = dicomStudy.modality || 'Unbekannt';
    
    // Formatiere Datum
    let dateStr = 'Unbekannt';
    if (dicomStudy.studyDate) {
      try {
        const year = dicomStudy.studyDate.substring(0, 4);
        const month = dicomStudy.studyDate.substring(4, 6);
        const day = dicomStudy.studyDate.substring(6, 8);
        dateStr = `${day}.${month}.${year}`;
        if (dicomStudy.studyTime && dicomStudy.studyTime.length >= 4) {
          const hour = dicomStudy.studyTime.substring(0, 2);
          const minute = dicomStudy.studyTime.substring(2, 4);
          dateStr += ` ${hour}:${minute}`;
        }
      } catch (err) {
        dateStr = dicomStudy.studyDate;
      }
    } else if (dicomStudy.uploadedAt) {
      dateStr = new Date(dicomStudy.uploadedAt).toLocaleString('de-DE');
    }

    // Erstelle Nachrichtentext
    const subject = `Neue DICOM-Studie für ${patientName}`;
    
    const message = `Eine neue DICOM-Studie wurde hochgeladen:\n\n` +
      `Patient: ${patientName}\n` +
      `Studie: ${studyDescription}\n` +
      `Modalität: ${modality}\n` +
      `Datum: ${dateStr}\n` +
      `\nBitte prüfen Sie die DICOM-Studie im Patienten-Organizer.`;

    // Sende Nachricht an jeden Mediziner
    const notificationPromises = mediziner.map(async (medizinerUser) => {
      try {
        console.log(`📧 DICOM-Benachrichtigung: Erstelle Nachricht für ${medizinerUser.firstName} ${medizinerUser.lastName} (ID: ${medizinerUser._id})`);
        
        // Finde einen System-User als Absender (z.B. Admin)
        const systemUser = await User.findOne({ 
          role: { $in: ['admin', 'super_admin'] },
          isActive: true 
        }).select('_id');
        
        const senderId = systemUser?._id || medizinerUser._id;
        console.log(`📧 DICOM-Benachrichtigung: Verwende senderId: ${senderId}`);

        const notification = new InternalMessage({
          senderId: senderId,
          recipientId: medizinerUser._id,
          subject: subject,
          message: message,
          priority: 'high',
          status: 'sent',
          patientId: patientId ? (typeof patientId === 'object' ? patientId._id || patientId : patientId) : null
        });

        console.log(`📧 DICOM-Benachrichtigung: Speichere Nachricht für ${medizinerUser.firstName} ${medizinerUser.lastName}...`);
        await notification.save();
        console.log(`✅ DICOM-Benachrichtigung an ${medizinerUser.firstName} ${medizinerUser.lastName} gesendet (Nachricht-ID: ${notification._id})`);
        return { success: true, userId: medizinerUser._id, messageId: notification._id };
      } catch (err) {
        console.error(`❌ Fehler beim Senden der DICOM-Benachrichtigung an ${medizinerUser.firstName} ${medizinerUser.lastName}:`, err);
        console.error('❌ Error Details:', {
          message: err.message,
          name: err.name,
          stack: err.stack
        });
        return { success: false, userId: medizinerUser._id, error: err.message };
      }
    });

    const results = await Promise.all(notificationPromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    console.log(`📧 DICOM-Benachrichtigung: ${successCount} erfolgreich, ${failCount} fehlgeschlagen von ${mediziner.length} insgesamt`);
  } catch (error) {
    console.error('❌ Fehler beim Senden der DICOM-Benachrichtigungen:', error);
    console.error('❌ Error Stack:', error.stack);
    // Fehler nicht weiterwerfen, damit das Speichern der DICOM-Studie nicht fehlschlägt
  }
}

/**
 * @route   POST /api/dicom/query
 * @desc    Studien von externem PACS/RIS abfragen (QIDO-RS)
 * @access  Private (patients.read)
 */
router.post('/query', auth, checkPermission('patients.read'), async (req, res) => {
  try {
    const { providerId, patientId, patientName, studyDateFrom, studyDateTo, modality } = req.body;
    
    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: 'providerId ist erforderlich'
      });
    }

    const DicomProvider = require('../models/DicomProvider');
    const provider = await DicomProvider.findById(providerId);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'DICOM-Provider nicht gefunden'
      });
    }

    if (provider.integration.protocol !== 'dicomweb') {
      return res.status(400).json({
        success: false,
        message: 'Provider unterstützt kein DICOMweb-Protokoll'
      });
    }

    const axios = require('axios');
    const baseUrl = provider.integration.dicomweb.baseUrl;
    const qidoEndpoint = provider.integration.dicomweb.qidoEndpoint || '/dicomweb/studies';
    const qidoUrl = `${baseUrl}${qidoEndpoint}`;

    // Baue Query-Parameter für QIDO-RS
    const queryParams = {};
    if (patientId) queryParams.PatientID = patientId;
    if (patientName) queryParams.PatientName = patientName;
    if (studyDateFrom) queryParams.StudyDate = studyDateFrom;
    if (studyDateTo && queryParams.StudyDate) {
      queryParams.StudyDate = `${queryParams.StudyDate}-${studyDateTo}`;
    } else if (studyDateTo) {
      queryParams.StudyDate = `-${studyDateTo}`;
    }
    if (modality) queryParams.Modality = modality;

    // Baue Authentifizierungs-Header
    const headers = {
      'Accept': 'application/dicom+json',
      'Content-Type': 'application/json'
    };

    if (provider.integration.dicomweb.authType === 'basic') {
      const username = provider.integration.dicomweb.username || '';
      const password = provider.integration.dicomweb.password || '';
      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    } else if (provider.integration.dicomweb.authType === 'bearer') {
      headers['Authorization'] = `Bearer ${provider.integration.dicomweb.apiKey || ''}`;
    } else if (provider.integration.dicomweb.authType === 'oauth2') {
      // OAuth2 würde hier implementiert werden
      headers['Authorization'] = `Bearer ${provider.integration.dicomweb.apiKey || ''}`;
    }

    // Führe QIDO-RS Query aus
    const response = await axios.get(qidoUrl, {
      params: queryParams,
      headers,
      timeout: 30000
    });

    res.json({
      success: true,
      data: response.data,
      count: Array.isArray(response.data) ? response.data.length : 0
    });

  } catch (error) {
    console.error('Fehler bei QIDO-RS Query:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abfragen der Studien',
      error: error.response?.data || error.message
    });
  }
});

/**
 * @route   POST /api/dicom/retrieve
 * @desc    DICOM-Studie von externem PACS abrufen (WADO-RS) und lokal speichern
 * @access  Private (patients.write)
 */
router.post('/retrieve', auth, checkPermission('patients.write'), async (req, res) => {
  try {
    const { providerId, studyInstanceUID, patientId } = req.body;
    
    if (!providerId || !studyInstanceUID || !patientId) {
      return res.status(400).json({
        success: false,
        message: 'providerId, studyInstanceUID und patientId sind erforderlich'
      });
    }

    const DicomProvider = require('../models/DicomProvider');
    const PatientExtended = require('../models/PatientExtended');
    const provider = await DicomProvider.findById(providerId);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'DICOM-Provider nicht gefunden'
      });
    }

    if (provider.integration.protocol !== 'dicomweb') {
      return res.status(400).json({
        success: false,
        message: 'Provider unterstützt kein DICOMweb-Protokoll'
      });
    }

    // Prüfe ob Patient existiert
    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    const axios = require('axios');
    const baseUrl = provider.integration.dicomweb.baseUrl;
    const wadoEndpoint = provider.integration.dicomweb.wadoEndpoint || '/dicomweb/wado';
    
    // Baue Authentifizierungs-Header
    const headers = {
      'Accept': 'application/dicom',
      'Content-Type': 'application/json'
    };

    if (provider.integration.dicomweb.authType === 'basic') {
      const username = provider.integration.dicomweb.username || '';
      const password = provider.integration.dicomweb.password || '';
      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    } else if (provider.integration.dicomweb.authType === 'bearer') {
      headers['Authorization'] = `Bearer ${provider.integration.dicomweb.apiKey || ''}`;
    }

    // 1. Hole Study-Metadaten (QIDO-RS)
    const qidoEndpoint = provider.integration.dicomweb.qidoEndpoint || '/dicomweb/studies';
    const qidoUrl = `${baseUrl}${qidoEndpoint}/${studyInstanceUID}`;
    
    let studyMetadata;
    try {
      const qidoResponse = await axios.get(qidoUrl, {
        headers: { ...headers, 'Accept': 'application/dicom+json' },
        timeout: 30000
      });
      studyMetadata = Array.isArray(qidoResponse.data) ? qidoResponse.data[0] : qidoResponse.data;
    } catch (qidoError) {
      console.error('Fehler beim Abrufen der Study-Metadaten:', qidoError);
      // Fortfahren ohne Metadaten
    }

    // 2. Hole Series-Liste
    const seriesUrl = `${baseUrl}${qidoEndpoint}/${studyInstanceUID}/series`;
    let seriesList = [];
    try {
      const seriesResponse = await axios.get(seriesUrl, {
        headers: { ...headers, 'Accept': 'application/dicom+json' },
        timeout: 30000
      });
      seriesList = Array.isArray(seriesResponse.data) ? seriesResponse.data : [];
    } catch (seriesError) {
      console.error('Fehler beim Abrufen der Series-Liste:', seriesError);
    }

    // 3. Hole Instances für jede Series
    const savedStudies = [];
    for (const series of seriesList) {
      const seriesInstanceUID = series['0020000E']?.Value?.[0] || series.SeriesInstanceUID;
      if (!seriesInstanceUID) continue;

      const instancesUrl = `${baseUrl}${qidoEndpoint}/${studyInstanceUID}/series/${seriesInstanceUID}/instances`;
      let instances = [];
      try {
        const instancesResponse = await axios.get(instancesUrl, {
          headers: { ...headers, 'Accept': 'application/dicom+json' },
          timeout: 30000
        });
        instances = Array.isArray(instancesResponse.data) ? instancesResponse.data : [];
      } catch (instancesError) {
        console.error('Fehler beim Abrufen der Instances:', instancesError);
        continue;
      }

      // 4. Lade jede Instance (WADO-RS)
      for (const instance of instances) {
        const sopInstanceUID = instance['00080018']?.Value?.[0] || instance.SOPInstanceUID;
        if (!sopInstanceUID) continue;

        const wadoUrl = `${baseUrl}${wadoEndpoint}/${studyInstanceUID}/series/${seriesInstanceUID}/instances/${sopInstanceUID}`;
        
        try {
          const wadoResponse = await axios.get(wadoUrl, {
            headers: { ...headers, 'Accept': 'application/dicom' },
            responseType: 'arraybuffer',
            timeout: 60000
          });

          // Speichere DICOM-Datei lokal
          const dicomBuffer = Buffer.from(wadoResponse.data);
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const filename = `dicom-${uniqueSuffix}.dcm`;
          const uploadPath = path.join(__dirname, '..', 'uploads', 'dicom');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          const filePath = path.join(uploadPath, filename);
          fs.writeFileSync(filePath, dicomBuffer);

          // Parse DICOM-Datei
          const dataSet = dicomParser.parseDicom(dicomBuffer);
          const studyInstanceUIDFromFile = getDicomTag(dataSet, '0020000D', '');
          const seriesInstanceUIDFromFile = getDicomTag(dataSet, '0020000E', '');
          const sopInstanceUIDFromFile = getDicomTag(dataSet, '00080018', '');

          // Erstelle DicomStudy-Eintrag
          const dicomStudy = new DicomStudy({
            patientId,
            studyInstanceUID: studyInstanceUIDFromFile || studyInstanceUID,
            seriesInstanceUID: seriesInstanceUIDFromFile || seriesInstanceUID,
            sopInstanceUID: sopInstanceUIDFromFile || sopInstanceUID,
            filePath,
            fileName: filename,
            fileSize: dicomBuffer.length,
            patientName: getDicomTag(dataSet, '00100010', ''),
            patientId: getDicomTag(dataSet, '00100020', ''),
            studyDate: getDicomTag(dataSet, '00080020', ''),
            studyTime: getDicomTag(dataSet, '00080030', ''),
            studyDescription: getDicomTag(dataSet, '00081030', ''),
            modality: getDicomTag(dataSet, '00080060', ''),
            seriesDescription: getDicomTag(dataSet, '0008103E', ''),
            seriesNumber: getDicomTagAsNumber(dataSet, '00200011', null),
            instanceNumber: getDicomTagAsNumber(dataSet, '00200013', null),
            uploadedBy: req.user.id,
            source: 'external_pacs',
            providerId: providerId
          });

          await dicomStudy.save();
          savedStudies.push(dicomStudy);
        } catch (wadoError) {
          console.error(`Fehler beim Abrufen der Instance ${sopInstanceUID}:`, wadoError);
          continue;
        }
      }
    }

    res.json({
      success: true,
      message: `${savedStudies.length} DICOM-Studien erfolgreich abgerufen`,
      data: savedStudies,
      count: savedStudies.length
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der DICOM-Studie:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der DICOM-Studie',
      error: error.response?.data || error.message
    });
  }
});

module.exports = router;

