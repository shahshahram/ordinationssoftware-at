const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const RadiologyReportProvider = require('../models/RadiologyReportProvider');
const radiologyReportParserService = require('../services/radiologyReportParserService');
const Document = require('../models/Document');
const DicomStudy = require('../models/DicomStudy');
const InternalMessage = require('../models/InternalMessage');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Multer-Konfiguration für Befund-Dateien
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'radiology-reports');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.txt';
    cb(null, `report-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB max
  }
});

/**
 * @route   POST /api/radiology-reports/receive
 * @desc    Empfängt radiologische Befunde von externen Instituten (Webhook)
 * @access  Public (mit Provider-Code Authentifizierung)
 */
router.post('/receive', upload.single('file'), async (req, res) => {
  let provider = null;
  let uploadedFile = null;
  
  try {
    const { providerCode, apiKey, format, patientId, patientMatching, metadata } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    // Validiere Provider-Code
    if (!providerCode) {
      return res.status(400).json({
        success: false,
        message: 'providerCode ist erforderlich'
      });
    }

    // Finde Provider
    provider = await RadiologyReportProvider.findOne({ 
      code: providerCode.toUpperCase(), 
      isActive: true 
    });
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Radiologie-Provider nicht gefunden oder inaktiv'
      });
    }

    // IP-Whitelist prüfen
    if (provider.security.ipWhitelist && provider.security.ipWhitelist.length > 0) {
      const isAllowed = provider.security.ipWhitelist.some(allowedIp => {
        if (allowedIp === clientIp) return true;
        if (allowedIp.includes('/')) {
          // CIDR-Notation (vereinfacht)
          const baseIp = allowedIp.split('/')[0];
          return clientIp.startsWith(baseIp.split('.').slice(0, -1).join('.'));
        }
        return false;
      });
      
      if (!isAllowed) {
        await AuditLog.create({
          action: 'radiology_report_denied',
          resource: 'RadiologyReportProvider',
          resourceId: provider._id,
          userId: null,
          details: { reason: 'IP not whitelisted', ip: clientIp },
          ipAddress: clientIp
        });
        
        return res.status(403).json({
          success: false,
          message: 'Zugriff von dieser IP-Adresse nicht erlaubt'
        });
      }
    }

    // API-Key Validierung
    if (provider.integration.rest && provider.integration.rest.apiKey) {
      if (!apiKey || !provider.validateApiKey(apiKey)) {
        await AuditLog.create({
          action: 'radiology_report_auth_failed',
          resource: 'RadiologyReportProvider',
          resourceId: provider._id,
          userId: null,
          details: { reason: 'Invalid API key' },
          ipAddress: clientIp
        });
        
        return res.status(401).json({
          success: false,
          message: 'Ungültiger API-Key'
        });
      }
    }

    // Validiere Format
    const reportFormat = format || provider.integration.protocol || 'rest';
    if (!['fhir', 'hl7-cda', 'dicom-sr', 'pdf', 'text', 'json'].includes(reportFormat.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Unbekanntes Format: ${reportFormat}`
      });
    }

    // Parse Befund basierend auf Format
    let parsedReport;
    const PatientExtended = require('../models/PatientExtended');
    const Patient = require('../models/Patient');

    switch (reportFormat.toLowerCase()) {
      case 'fhir':
        if (!req.body.data) {
          return res.status(400).json({
            success: false,
            message: 'FHIR-Daten sind erforderlich (data-Feld)'
          });
        }
        parsedReport = await radiologyReportParserService.parseFHIR(
          req.body.data, 
          provider._id
        );
        break;

      case 'hl7-cda':
        if (!req.body.data && !req.file) {
          return res.status(400).json({
            success: false,
            message: 'CDA-Daten sind erforderlich (data-Feld oder file)'
          });
        }
        const cdaData = req.body.data || (req.file ? fs.readFileSync(req.file.path, 'utf8') : '');
        parsedReport = await radiologyReportParserService.parseHL7CDA(
          cdaData, 
          provider._id
        );
        break;

      case 'dicom-sr':
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'DICOM SR-Datei ist erforderlich'
          });
        }
        uploadedFile = req.file.path;
        const dicomSrBuffer = fs.readFileSync(req.file.path);
        parsedReport = await radiologyReportParserService.parseDicomSR(
          dicomSrBuffer, 
          provider._id
        );
        break;

      case 'pdf':
      case 'text':
        if (!req.file && !req.body.data) {
          return res.status(400).json({
            success: false,
            message: 'Datei oder Text-Daten sind erforderlich'
          });
        }
        uploadedFile = req.file?.path;
        const content = req.file 
          ? fs.readFileSync(req.file.path) 
          : Buffer.from(req.body.data || '', 'utf8');
        
        const reportMetadata = {
          externalId: metadata?.externalId || req.body.externalId,
          reportNumber: metadata?.reportNumber || req.body.reportNumber,
          firstName: metadata?.firstName || req.body.firstName,
          lastName: metadata?.lastName || req.body.lastName,
          dateOfBirth: metadata?.dateOfBirth || req.body.dateOfBirth,
          patientId: metadata?.patientId || patientId,
          reportDate: metadata?.reportDate || req.body.reportDate,
          issuedDate: metadata?.issuedDate || req.body.issuedDate,
          studyInstanceUID: metadata?.studyInstanceUID || req.body.studyInstanceUID,
          modality: metadata?.modality || req.body.modality,
          mimeType: req.file?.mimetype || 'text/plain',
          format: reportFormat
        };
        
        parsedReport = await radiologyReportParserService.parsePDFOrText(
          content, 
          reportMetadata, 
          provider._id
        );
        break;

      case 'json':
        if (!req.body.data) {
          return res.status(400).json({
            success: false,
            message: 'JSON-Daten sind erforderlich (data-Feld)'
          });
        }
        // JSON-Format: Erwartet strukturierte Daten
        parsedReport = {
          providerId: provider._id,
          externalId: req.body.data.externalId || req.body.data.id,
          reportNumber: req.body.data.reportNumber || req.body.data.reportNumber,
          patientData: {
            firstName: req.body.data.patient?.firstName || req.body.data.firstName,
            lastName: req.body.data.patient?.lastName || req.body.data.lastName,
            dateOfBirth: req.body.data.patient?.dateOfBirth || req.body.data.dateOfBirth,
            externalId: req.body.data.patient?.id || req.body.data.patientId
          },
          reportDate: req.body.data.reportDate ? new Date(req.body.data.reportDate) : new Date(),
          issuedDate: req.body.data.issuedDate ? new Date(req.body.data.issuedDate) : new Date(),
          studyInstanceUID: req.body.data.studyInstanceUID || req.body.data.study?.instanceUID,
          modality: req.body.data.modality,
          conclusion: req.body.data.conclusion || req.body.data.findings || req.body.data.text,
          interpretation: req.body.data.interpretation || req.body.data.conclusion,
          findings: req.body.data.findings || req.body.data.conclusion,
          recommendations: req.body.data.recommendations || '',
          status: req.body.data.status || 'final',
          rawData: req.body.data,
          format: 'json'
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Format ${reportFormat} wird nicht unterstützt`
        });
    }

    // Finde Patient
    let patient = null;
    const matchingStrategy = patientMatching || provider.mapping.patientMatching || 'name-dob';

    if (patientId) {
      patient = await PatientExtended.findById(patientId) || await Patient.findById(patientId);
    } else {
      patient = await radiologyReportParserService.findPatient(
        parsedReport.patientData, 
        matchingStrategy
      );
    }

    if (!patient) {
      if (uploadedFile && fs.existsSync(uploadedFile)) {
        fs.unlinkSync(uploadedFile);
      }
      
      await provider.updateStats(false, 'Patient nicht gefunden');
      
      await AuditLog.create({
        action: 'radiology_report_failed',
        resource: 'RadiologyReportProvider',
        resourceId: provider._id,
        userId: null,
        details: {
          reason: 'Patient not found',
          patientData: parsedReport.patientData,
          matchingStrategy: matchingStrategy
        },
        ipAddress: clientIp
      });
      
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden',
        error: 'Der Patient konnte anhand der Befunddaten nicht in der Datenbank gefunden werden',
        details: {
          patientData: parsedReport.patientData,
          matchingStrategy: matchingStrategy,
          suggestion: 'Bitte stellen Sie sicher, dass der Patient in der Datenbank existiert oder übergeben Sie die patientId direkt'
        }
      });
    }

    // Finde DICOM-Studie falls StudyInstanceUID vorhanden
    let dicomStudy = null;
    if (parsedReport.studyInstanceUID && provider.mapping.autoLinkDicomStudies) {
      dicomStudy = await radiologyReportParserService.findDicomStudy(
        parsedReport.studyInstanceUID
      );
    }

    // Erstelle Document falls konfiguriert
    let document = null;
    if (provider.mapping.autoCreateDocument) {
      const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
      
      document = new Document({
        title: `Radiologischer Befund - ${parsedReport.modality || 'Unbekannt'}`,
        type: provider.mapping.documentType || 'befund',
        patient: {
          id: patient._id.toString(),
          name: patientName,
          dateOfBirth: patient.dateOfBirth,
          socialSecurityNumber: patient.socialSecurityNumber,
          insuranceProvider: patient.insuranceProvider
        },
        doctor: {
          id: parsedReport.performer?.reference || 'external',
          name: parsedReport.performer?.name || provider.name
        },
        content: {
          text: parsedReport.findings || parsedReport.conclusion || '',
          html: `<p>${(parsedReport.findings || parsedReport.conclusion || '').replace(/\n/g, '</p><p>')}</p>`
        },
        findingData: {
          examinationType: parsedReport.modalityDisplay || parsedReport.modality || '',
          results: parsedReport.findings || '',
          interpretation: parsedReport.interpretation || '',
          recommendations: parsedReport.recommendations || '',
          images: dicomStudy ? [`/api/dicom/studies/${dicomStudy._id}/file`] : []
        },
        status: parsedReport.status === 'final' ? 'received' : 'under_review',
        priority: 'normal',
        source: 'external',
        externalProvider: provider.code,
        externalId: parsedReport.externalId,
        documentNumber: parsedReport.reportNumber || `RAD-${Date.now()}`,
        attachments: uploadedFile ? [{
          filename: path.basename(uploadedFile),
          mimeType: req.file?.mimetype || 'application/octet-stream',
          size: req.file?.size || 0,
          path: uploadedFile,
          uploadedAt: new Date()
        }] : []
      });

      await document.save();
    }

    // Update Provider-Statistiken
    await provider.updateStats(true);

    // Audit-Log
    await AuditLog.create({
      action: 'radiology_report_success',
      resource: 'Document',
      resourceId: document?._id || null,
      userId: null,
      details: {
        providerCode: provider.code,
        providerName: provider.name,
        patientId: patient._id,
        reportNumber: parsedReport.reportNumber,
        modality: parsedReport.modality,
        studyInstanceUID: parsedReport.studyInstanceUID,
        format: reportFormat
      },
      ipAddress: clientIp
    });

    // Benachrichtigung
    if (provider.notifications.notifyOnReport) {
      try {
        const mediziner = await User.find({
          $or: [{ role: 'doctor' }, { role: 'admin' }],
          isActive: true
        });

        if (mediziner.length > 0) {
          const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
          const subject = `Neuer radiologischer Befund von ${provider.name}`;
          const message = `Ein neuer radiologischer Befund wurde von ${provider.name} empfangen.\n\n` +
            `Patient: ${patientName}\n` +
            `Modality: ${parsedReport.modality || 'N/A'}\n` +
            `Datum: ${parsedReport.reportDate || 'N/A'}\n\n` +
            (document ? `Dokument-ID: ${document._id}` : '');

          const messages = mediziner.map(user => ({
            to: user._id,
            from: null,
            subject: subject,
            body: message,
            type: 'notification',
            relatedResource: {
              type: document ? 'Document' : 'RadiologyReport',
              id: document?._id?.toString() || parsedReport.externalId
            },
            isRead: false
          }));

          await InternalMessage.insertMany(messages);
        }
      } catch (notifyError) {
        console.error('Fehler beim Senden der Benachrichtigung:', notifyError);
      }
    }

    res.json({
      success: true,
      message: 'Radiologischer Befund erfolgreich empfangen',
      data: {
        documentId: document?._id,
        reportNumber: parsedReport.reportNumber,
        patientId: patient._id,
        patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
        modality: parsedReport.modality,
        studyInstanceUID: parsedReport.studyInstanceUID,
        dicomStudyId: dicomStudy?._id,
        reportDate: parsedReport.reportDate
      }
    });

  } catch (error) {
    console.error('Fehler beim Empfangen des radiologischen Befunds:', error);
    
    if (uploadedFile && fs.existsSync(uploadedFile)) {
      fs.unlinkSync(uploadedFile);
    }
    
    if (provider) {
      try {
        await provider.updateStats(false, error.message);
      } catch (statsError) {
        console.error('Fehler beim Update der Statistiken:', statsError);
      }
    }
    
    await AuditLog.create({
      action: 'radiology_report_error',
      resource: 'RadiologyReportProvider',
      resourceId: provider?._id || null,
      userId: null,
      details: {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
    });
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Empfangen des radiologischen Befunds',
      error: error.message
    });
  }
});

module.exports = router;







