const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// Mock data - in real app, this would come from database
const checkInSessions = new Map();

// Valid insurance providers
const VALID_INSURANCE_PROVIDERS = [
  'ÖGK (Österreichische Gesundheitskasse)',
  'BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)',
  'SVS (Sozialversicherung der Selbständigen)',
  'KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)',
  'PVA (Pensionsversicherungsanstalt)',
  'Privatversicherung',
  'Selbstzahler'
];

// Function to normalize insurance provider to valid enum value
function normalizeInsuranceProvider(provider) {
  if (!provider) return null;
  
  // Check if it's already a valid provider
  if (VALID_INSURANCE_PROVIDERS.includes(provider)) {
    return provider;
  }
  
  // Try to match common variations
  const normalized = provider.toLowerCase().trim();
  
  if (normalized.includes('ögk') || normalized.includes('gesundheitskasse')) {
    return 'ÖGK (Österreichische Gesundheitskasse)';
  }
  if (normalized.includes('bvaeb') || normalized.includes('eisenbahn') || normalized.includes('bergbau')) {
    return 'BVAEB (Versicherungsanstalt für Eisenbahnen und Bergbau)';
  }
  if (normalized.includes('svs') || normalized.includes('selbständig')) {
    return 'SVS (Sozialversicherung der Selbständigen)';
  }
  if (normalized.includes('kfa') || normalized.includes('stadt wien')) {
    return 'KFA (Krankenfürsorgeanstalt der Bediensteten der Stadt Wien)';
  }
  if (normalized.includes('pva') || normalized.includes('pensionsversicherung')) {
    return 'PVA (Pensionsversicherungsanstalt)';
  }
  if (normalized.includes('privat')) {
    return 'Privatversicherung';
  }
  if (normalized.includes('selbstzahler') || normalized.includes('selbst zahler')) {
    return 'Selbstzahler';
  }
  
  // If no match found, return null to use default
  return null;
}

// Generate check-in session
router.post('/generate', auth, async (req, res) => {
  try {
    console.log('QR Code generation requested');
    const checkInId = `checkin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store session data with user ID
    checkInSessions.set(checkInId, {
      id: checkInId,
      createdAt: new Date(),
      status: 'active',
      patientId: null,
      formData: null,
      userId: req.user.id // Store the user ID who generated the QR code
    });

    // Get the frontend URL from environment or use localhost
    // For development, use the local IP address for tablet access
    const frontendUrl = process.env.REACT_APP_FRONTEND_URL || 'http://192.168.178.163:3000';
    const qrCodeUrl = `${frontendUrl}/unified-checkin.html?token=${checkInId}`;

    console.log('Generated QR Code:', checkInId);
    console.log('QR Code URL:', qrCodeUrl);
    
    res.json({
      success: true,
      data: {
        checkInId,
        qrCode: qrCodeUrl, // Now contains the full URL instead of just the ID
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      }
    });
  } catch (error) {
    console.error('Error generating check-in session:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren des Check-in Codes'
    });
  }
});

// Validate check-in session - simplified
router.get('/validate/:checkInId', async (req, res) => {
  try {
    const { checkInId } = req.params;
    const session = checkInSessions.get(checkInId);

    if (!session) {
      // If session not found, create a temporary one for demo purposes
      console.log('Session not found, creating temporary session for demo');
      // Use a default admin user ID for demo purposes
      const defaultAdminUserId = '68f3e2bc48a0c83b82953c06'; // Admin user ID
      checkInSessions.set(checkInId, {
        id: checkInId,
        createdAt: new Date(),
        status: 'active',
        patientId: null,
        formData: null,
        userId: new mongoose.Types.ObjectId(defaultAdminUserId) // Use admin user ID for demo
      });
    }

    // Check if session is already completed
    const currentSession = checkInSessions.get(checkInId);
    if (currentSession && currentSession.status === 'completed') {
      return res.status(410).json({
        success: false,
        message: 'Check-in bereits abgeschlossen. Bitte geben Sie das Tablet an das Praxispersonal zurück.'
      });
    }

    // Check if session is expired (15 minutes)
    const now = new Date();
    const sessionAge = now - currentSession.createdAt;
    if (sessionAge > 15 * 60 * 1000) {
      checkInSessions.delete(checkInId);
      return res.status(410).json({
        success: false,
        message: 'Check-in Code ist abgelaufen'
      });
    }

    // Simple response - just confirm the code is valid
    res.json({
      success: true,
      message: 'Check-in Code ist gültig. Formular wird geladen...'
    });
  } catch (error) {
    console.error('Error validating check-in session:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Validieren des Check-in Codes'
    });
  }
});

// Submit check-in form data and create/update patient
router.post('/submit/:checkInId', [
  body('firstName').notEmpty().withMessage('Vorname ist erforderlich'),
  body('lastName').notEmpty().withMessage('Nachname ist erforderlich'),
  body('dateOfBirth').isISO8601().withMessage('Gültiges Geburtsdatum erforderlich'),
  body('phone').notEmpty().withMessage('Telefonnummer ist erforderlich'),
  body('email').optional().isEmail().withMessage('Ungültige E-Mail-Adresse'),
  body('socialSecurityNumber').notEmpty().withMessage('Sozialversicherungsnummer ist erforderlich'),
  body('insuranceProvider').notEmpty().withMessage('Versicherungsanstalt ist erforderlich'),
  body('dataProtectionConsent').isBoolean().withMessage('Datenschutz-Einverständnis ist erforderlich')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors.array()
      });
    }

    const { checkInId } = req.params;
    const patientData = req.body;

    // Validate check-in session
    const session = checkInSessions.get(checkInId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Check-in Session nicht gefunden'
      });
    }

    // Check if session is expired
    const now = new Date();
    const sessionAge = now - session.createdAt;
    if (sessionAge > 15 * 60 * 1000) {
      checkInSessions.delete(checkInId);
      return res.status(410).json({
        success: false,
        message: 'Check-in Session ist abgelaufen'
      });
    }

    // Import Patient model
    const Patient = require('../models/PatientExtended');

    // For check-in system, always create new patients (no duplicate checking)
    // This ensures that each check-in creates a new patient record
    const newPatient = new Patient({
      // Stammdaten
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      dateOfBirth: new Date(patientData.dateOfBirth),
      gender: patientData.gender || 'm',
      socialSecurityNumber: patientData.socialSecurityNumber,
      insuranceProvider: normalizeInsuranceProvider(patientData.insuranceProvider) || 'ÖGK (Österreichische Gesundheitskasse)',
      
      // Adresse
      address: {
        street: patientData.address?.street || 'Nicht angegeben',
        city: patientData.address?.city || 'Nicht angegeben',
        zipCode: patientData.address?.zipCode || '0000',
        country: patientData.address?.country || 'Österreich'
      },
      
      // Kontaktdaten
      phone: patientData.phone,
      email: patientData.email || '',
      
      // Notfallkontakt
      emergencyContact: patientData.emergencyContact ? {
        name: patientData.emergencyContact.name || '',
        phone: patientData.emergencyContact.phone || '',
        relationship: patientData.emergencyContact.relationship || ''
      } : { name: '', phone: '', relationship: '' },
      
      // Medizinische Daten
      bloodType: patientData.bloodType || 'Unbekannt',
      height: patientData.height ? Number(patientData.height) : undefined,
      weight: patientData.weight ? Number(patientData.weight) : undefined,
      bmi: patientData.height && patientData.weight ? 
        Number((Number(patientData.weight) / Math.pow(Number(patientData.height) / 100, 2)).toFixed(1)) : undefined,
      
      // Schwangerschaft (nur für Frauen)
      isPregnant: patientData.gender === 'w' ? Boolean(patientData.isPregnant) : false,
      pregnancyWeek: patientData.gender === 'w' && patientData.isPregnant ? 
        Number(patientData.pregnancyWeek) : undefined,
      isBreastfeeding: patientData.gender === 'w' ? Boolean(patientData.isBreastfeeding) : false,
      
      // Medizinische Implantate
      hasPacemaker: Boolean(patientData.hasPacemaker),
      hasDefibrillator: Boolean(patientData.hasDefibrillator),
      implants: patientData.implants || [],
      
      // Raucherstatus
      smokingStatus: patientData.smokingStatus || 'non-smoker',
      cigarettesPerDay: patientData.cigarettesPerDay ? Number(patientData.cigarettesPerDay) : undefined,
      yearsOfSmoking: patientData.yearsOfSmoking ? Number(patientData.yearsOfSmoking) : undefined,
      quitSmokingDate: patientData.quitSmokingDate ? new Date(patientData.quitSmokingDate) : undefined,
      
      // Arrays
      allergies: Array.isArray(patientData.allergies) ? patientData.allergies : [],
      currentMedications: Array.isArray(patientData.medications) ? patientData.medications : [],
      medicalHistory: Array.isArray(patientData.conditions) ? patientData.conditions : [],
      
      // Administrative Daten
      referralSource: patientData.referralSource || 'self',
      referralDoctor: patientData.referralDoctor || '',
      visitReason: patientData.visitReason || '',
      
      // Einverständniserklärungen
      dataProtectionConsent: Boolean(patientData.dataProtectionConsent),
      dataProtectionConsentDate: new Date(),
      electronicCommunicationConsent: Boolean(patientData.electronicCommunicationConsent),
      electronicCommunicationConsentDate: patientData.electronicCommunicationConsent ? new Date() : undefined,
      
      // Metadaten
      isActive: true,
      lastCheckIn: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.userId || new mongoose.Types.ObjectId(),
      userId: session.userId || new mongoose.Types.ObjectId(),
      status: 'aktiv'
    });
    
    const patient = await newPatient.save();
    logger.info(`Created new patient via check-in: ${patient._id}`);

    // Update session with patient ID
    session.patientId = patient._id.toString();
    session.patientData = patientData;
    session.status = 'completed';
    session.completedAt = new Date();
    checkInSessions.set(checkInId, session);

    // Clean up patient session
    checkInSessions.delete(`patient_${checkInId}`);

    // Schedule session cleanup after 30 seconds to allow for success message display
    setTimeout(() => {
      checkInSessions.delete(checkInId);
      logger.info(`Check-in session ${checkInId} cleaned up after completion`);
    }, 30000); // 30 seconds delay

    res.json({
      success: true,
      message: 'Check-in erfolgreich abgeschlossen. Bitte geben Sie das Tablet an das Praxispersonal zurück.',
      data: {
        checkInId: session.id,
        status: session.status,
        patientId: patient._id,
        patient: {
          id: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email,
          phone: patient.phone
        },
        isNewPatient: true,
        sessionExpiresIn: 30 // Session expires in 30 seconds
      }
    });
  } catch (error) {
    console.error('Error submitting check-in data:', error);
    logger.error('Error submitting check-in data:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Speichern der Check-in Daten',
      error: error.message
    });
  }
});

// Get check-in session data
router.get('/session/:checkInId', async (req, res) => {
  try {
    const { checkInId } = req.params;
    const session = checkInSessions.get(checkInId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Check-in Session nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error getting check-in session:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Session-Daten'
    });
  }
});

// Clean up expired sessions (this would typically run as a cron job)
router.delete('/cleanup', auth, async (req, res) => {
  try {
    const now = new Date();
    let cleanedCount = 0;

    for (const [checkInId, session] of checkInSessions.entries()) {
      const sessionAge = now - session.createdAt;
      if (sessionAge > 15 * 60 * 1000) { // 15 minutes
        checkInSessions.delete(checkInId);
        cleanedCount++;
      }
    }

    res.json({
      success: true,
      message: `${cleanedCount} abgelaufene Sessions wurden bereinigt`
    });
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Bereinigen der Sessions'
    });
  }
});

module.exports = router;
