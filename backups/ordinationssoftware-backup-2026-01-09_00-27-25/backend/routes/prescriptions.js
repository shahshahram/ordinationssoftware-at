// e-Rezept Routes - Elektronische Rezept-Erstellung
// Integration mit PharmNet (e-Rezept-System in Österreich)

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const PatientMedication = require('../models/PatientMedication');
const PatientExtended = require('../models/PatientExtended');
const auth = require('../middleware/auth');
const QRCode = require('qrcode');
const crypto = require('crypto');

// Hinweis: validateObjectId Middleware wurde entfernt, da prescriptionId ein String ist, keine ObjectId

/**
 * @route   POST /api/prescriptions/create
 * @desc    Erstelle e-Rezept für Medikament
 * @access  Private
 */
router.post('/create', auth, async (req, res) => {
  try {
    const { medicationId, patientId } = req.body;

    if (!medicationId || !patientId) {
      return res.status(400).json({
        success: false,
        message: 'Medikament-ID und Patient-ID sind erforderlich'
      });
    }

    const medication = await PatientMedication.findOne({ 
      _id: medicationId, 
      patientId 
    }).populate('patientId', 'firstName lastName socialSecurityNumber ecard');

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medikament nicht gefunden'
      });
    }

    const patient = await PatientExtended.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient nicht gefunden'
      });
    }

    // Generiere eindeutige Rezept-ID (entsprechend österreichischem e-Rezept-Format)
    const prescriptionId = `AT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Erstelle Rezept-Daten (entsprechend PharmNet-Standard)
    const prescriptionData = {
      prescriptionId,
      medicationId: medication._id,
      patientId: patient._id,
      patient: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        socialSecurityNumber: patient.socialSecurityNumber,
        dateOfBirth: patient.dateOfBirth,
        insuranceNumber: patient.insuranceNumber,
        insuranceProvider: patient.insuranceProvider
      },
      medication: {
        name: medication.name,
        atcCode: medication.atcCode,
        strength: medication.strength,
        strengthUnit: medication.strengthUnit,
        form: medication.form,
        dosage: medication.dosage,
        frequency: medication.frequency,
        duration: medication.duration
      },
      prescriber: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        title: req.user.title,
        licenseNumber: req.user.licenseNumber
      },
      createdAt: new Date(),
      status: 'draft',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 Tage gültig
    };

    // Generiere QR-Code für e-Rezept
    const qrCodeData = JSON.stringify({
      prescriptionId,
      patientId: patient._id.toString(),
      medicationId: medication._id.toString(),
      createdAt: prescriptionData.createdAt.toISOString(),
      expiresAt: prescriptionData.expiresAt.toISOString()
    });

    let qrCodeBase64;
    try {
      console.log('Generiere QR-Code für e-Rezept:', prescriptionId);
      qrCodeBase64 = await QRCode.toDataURL(qrCodeData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 1
      });
      console.log('QR-Code erfolgreich generiert, Länge:', qrCodeBase64 ? qrCodeBase64.length : 0);
    } catch (qrError) {
      console.error('QR-Code-Generierung fehlgeschlagen:', qrError);
      console.error('QR-Code-Daten:', qrCodeData);
      console.error('Fehler-Details:', {
        message: qrError.message,
        stack: qrError.stack,
        name: qrError.name
      });
      return res.status(500).json({
        success: false,
        message: 'Fehler bei der QR-Code-Generierung',
        error: qrError.message
      });
    }

    // Aktualisiere Medikament mit Rezept-Informationen
    medication.prescriptionId = prescriptionId;
    medication.prescriptionStatus = 'draft';
    medication.prescriptionQRCode = qrCodeBase64;
    medication.prescribedBy = req.user._id;
    medication.prescribedAt = new Date();
    medication.source = 'prescription';
    medication.lastModifiedBy = req.user._id;

    await medication.save();

    res.json({
      success: true,
      message: 'e-Rezept erfolgreich erstellt',
      data: {
        prescriptionId,
        medication: medication,
        qrCode: qrCodeBase64,
        prescriptionData
      }
    });
  } catch (error) {
    console.error('Error creating e-Rezept:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der e-Rezept-Erstellung',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/prescriptions/:id/send
 * @desc    Sende e-Rezept an PharmNet
 * @access  Private
 * @note    :id ist hier die prescriptionId (String), nicht _id (ObjectId)
 */
router.post('/:id/send', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const medication = await PatientMedication.findOne({ prescriptionId: id });

    if (!medication || !medication.prescriptionId) {
      return res.status(404).json({
        success: false,
        message: 'Rezept nicht gefunden'
      });
    }

    if (medication.prescriptionStatus === 'sent' || medication.prescriptionStatus === 'dispensed') {
      return res.status(400).json({
        success: false,
        message: 'Rezept wurde bereits gesendet'
      });
    }

    // Hier würde die Integration mit PharmNet-API erfolgen
    // Für jetzt simulieren wir den Versand
    const pharmNetResponse = {
      success: true,
      prescriptionId: medication.prescriptionId,
      sentAt: new Date(),
      status: 'sent',
      message: 'Rezept erfolgreich an PharmNet übermittelt'
    };

    // Aktualisiere Status
    medication.prescriptionStatus = 'sent';
    medication.lastModifiedBy = req.user._id;
    await medication.save();

    res.json({
      success: true,
      message: 'e-Rezept erfolgreich gesendet',
      data: {
        ...pharmNetResponse,
        medication: medication // Vollständiges Medikament zurückgeben
      }
    });
  } catch (error) {
    console.error('Error sending e-Rezept:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Senden des e-Rezepts',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/prescriptions/patient/:patientId
 * @desc    Alle e-Rezepte eines Patienten abrufen
 * @access  Private
 */
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status } = req.query;

    let query = { 
      patientId,
      prescriptionId: { $exists: true, $ne: null }
    };

    if (status) {
      query.prescriptionStatus = status;
    }

    const prescriptions = await PatientMedication.find(query)
      .populate('prescribedBy', 'firstName lastName title')
      .populate('medicationId', 'name atcCode strength strengthUnit form')
      .sort({ prescribedAt: -1 });

    res.json({
      success: true,
      data: prescriptions
    });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der e-Rezepte',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/prescriptions/:id/qrcode
 * @desc    QR-Code eines e-Rezepts abrufen
 * @access  Private
 * @note    :id ist hier die prescriptionId (String), nicht _id (ObjectId)
 * WICHTIG: Diese Route muss VOR der allgemeinen GET /:id Route kommen!
 */
router.get('/:id/qrcode', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const medication = await PatientMedication.findOne({ prescriptionId: id });

    if (!medication || !medication.prescriptionId) {
      return res.status(404).json({
        success: false,
        message: 'Rezept nicht gefunden'
      });
    }

    if (!medication.prescriptionQRCode) {
      // Generiere QR-Code falls nicht vorhanden
      const qrCodeData = JSON.stringify({
        prescriptionId: medication.prescriptionId,
        patientId: medication.patientId.toString(),
        medicationId: medication._id.toString()
      });

      const qrCodeBase64 = await QRCode.toDataURL(qrCodeData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 1
      });

      medication.prescriptionQRCode = qrCodeBase64;
      await medication.save();
    }

    res.json({
      success: true,
      data: {
        qrCode: medication.prescriptionQRCode,
        prescriptionId: medication.prescriptionId
      }
    });
  } catch (error) {
    console.error('Error fetching QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des QR-Codes',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/prescriptions/:id/cancel
 * @desc    e-Rezept stornieren
 * @access  Private
 * @note    :id ist hier die prescriptionId (String), nicht _id (ObjectId)
 * WICHTIG: Diese Route muss VOR der allgemeinen GET /:id Route kommen!
 */
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    console.log('Cancel prescription request:', { id, reason });
    const medication = await PatientMedication.findOne({ prescriptionId: id });
    console.log('Found medication:', medication ? medication._id : 'not found');

    if (!medication || !medication.prescriptionId) {
      return res.status(404).json({
        success: false,
        message: 'Rezept nicht gefunden'
      });
    }

    if (medication.prescriptionStatus === 'dispensed') {
      return res.status(400).json({
        success: false,
        message: 'Rezept wurde bereits eingelöst und kann nicht storniert werden'
      });
    }

    // Storniere Rezept
    medication.prescriptionStatus = 'expired';
    medication.prescriptionQRCode = null;
    medication.lastModifiedBy = req.user._id;
    await medication.save();

    res.json({
      success: true,
      message: 'e-Rezept erfolgreich storniert',
      data: medication
    });
  } catch (error) {
    console.error('Error canceling prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Stornierung',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/prescriptions/:id/check-status
 * @desc    Status eines e-Rezepts bei PharmNet prüfen
 * @access  Private
 * @note    :id ist hier die prescriptionId (String), nicht _id (ObjectId)
 * WICHTIG: Diese Route muss VOR der allgemeinen GET /:id Route kommen!
 */
router.post('/:id/check-status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const medication = await PatientMedication.findOne({ prescriptionId: id });

    if (!medication || !medication.prescriptionId) {
      return res.status(404).json({
        success: false,
        message: 'Rezept nicht gefunden'
      });
    }

    // Hier würde die Integration mit PharmNet-API erfolgen
    // Für jetzt simulieren wir die Statusprüfung
    const pharmNetStatus = {
      prescriptionId: medication.prescriptionId,
      status: medication.prescriptionStatus,
      lastChecked: new Date(),
      dispensedAt: medication.prescriptionStatus === 'dispensed' ? medication.prescribedAt : null,
      expired: medication.prescriptionStatus === 'expired' || (medication.prescribedAt && new Date(medication.prescribedAt.getTime() + 30 * 24 * 60 * 60 * 1000) < new Date())
    };

    // Aktualisiere Status falls abgelaufen
    if (pharmNetStatus.expired && medication.prescriptionStatus !== 'expired') {
      medication.prescriptionStatus = 'expired';
      await medication.save();
      pharmNetStatus.status = 'expired';
    }

    res.json({
      success: true,
      data: {
        ...pharmNetStatus,
        medication: medication // Vollständiges Medikament zurückgeben
      }
    });
  } catch (error) {
    console.error('Error checking prescription status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Statusprüfung',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/prescriptions/:id
 * @desc    Einzelnes e-Rezept abrufen
 * @access  Private
 * @note    :id ist hier die prescriptionId (String), nicht _id (ObjectId)
 * WICHTIG: Diese Route muss NACH den spezifischeren Routen (/:id/qrcode, /:id/cancel, etc.) kommen!
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const medication = await PatientMedication.findOne({ prescriptionId: id })
      .populate('patientId', 'firstName lastName socialSecurityNumber')
      .populate('prescribedBy', 'firstName lastName title')
      .populate('medicationId', 'name atcCode strength strengthUnit form');

    if (!medication || !medication.prescriptionId) {
      return res.status(404).json({
        success: false,
        message: 'Rezept nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: medication
    });
  } catch (error) {
    console.error('Error fetching prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des e-Rezepts',
      error: error.message
    });
  }
});


module.exports = router;

