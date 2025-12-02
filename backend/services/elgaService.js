// ELGA-Service für e-card-Validierung und Datenabfrage
// Integration mit ELGA-API (Elektronische Gesundheitsakte)

const axios = require('axios');
const https = require('https');
const fs = require('fs');
const ECardValidation = require('../models/ECardValidation');
const PatientExtended = require('../models/PatientExtended');
const elgaConfig = require('../config/elga.config');

class ELGAService {
  constructor() {
    // ELGA-Konfiguration
    this.config = elgaConfig.activeConfig;
    this.certConfig = elgaConfig.certificates;
    this.ecardConfig = elgaConfig.ecard;
    this.billingConfig = elgaConfig.billing;
    
    // Cache für Tokens
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // HTTPS-Agent mit Zertifikaten (falls vorhanden)
    this.httpsAgent = this.createHttpsAgent();
  }
  
  /**
   * Erstellt HTTPS-Agent mit Zertifikaten
   */
  createHttpsAgent() {
    if (!elgaConfig.hasCertificates()) {
      return undefined; // Verwende Standard-Agent
    }
    
    try {
      return new https.Agent({
        cert: fs.readFileSync(this.certConfig.clientCert),
        key: fs.readFileSync(this.certConfig.clientKey),
        ca: this.certConfig.caCert ? fs.readFileSync(this.certConfig.caCert) : undefined,
        passphrase: this.certConfig.passphrase || undefined,
        rejectUnauthorized: true
      });
    } catch (error) {
      console.warn('Fehler beim Laden der ELGA-Zertifikate:', error.message);
      return undefined;
    }
  }

  /**
   * Authentifizierung bei ELGA-API
   */
  async authenticate() {
    try {
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken;
      }

      const response = await axios.post(
        `${this.config.baseUrl}/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          scope: 'elga.read elga.write'
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: this.ecardConfig.timeout,
          httpsAgent: this.httpsAgent
        }
      );

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + (expiresIn - 60) * 1000); // 1 Minute Puffer

      return this.accessToken;
    } catch (error) {
      console.error('ELGA Authentication Error:', error.message);
      throw new Error(`ELGA-Authentifizierung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Validiert e-card über ELGA-API
   * @param {String} ecardNumber - e-card Nummer
   * @param {Object} patientData - Patientendaten zur Verifizierung
   * @returns {Object} Validierungsergebnis
   */
  async validateECard(ecardNumber, patientData = {}) {
    try {
      const token = await this.authenticate();

      const response = await axios.post(
        `${this.config.baseUrl}/v1/ecard/validate`,
        {
          ecardNumber,
          socialSecurityNumber: patientData.socialSecurityNumber,
          dateOfBirth: patientData.dateOfBirth,
          lastName: patientData.lastName
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: this.ecardConfig.timeout,
          httpsAgent: this.httpsAgent
        }
      );

      return {
        success: true,
        valid: response.data.valid === true,
        status: response.data.valid ? 'valid' : 'invalid',
        insuranceData: response.data.insuranceData || {},
        validFrom: response.data.validFrom ? new Date(response.data.validFrom) : null,
        validUntil: response.data.validUntil ? new Date(response.data.validUntil) : null,
        elgaId: response.data.elgaId,
        elgaStatus: response.data.elgaStatus || 'not_registered'
      };
    } catch (error) {
      console.error('ELGA e-card Validation Error:', error.message);
      
      // Fallback: Lokale Validierung wenn API nicht verfügbar
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return this.fallbackValidation(ecardNumber, patientData);
      }
      
      throw new Error(`e-card Validierung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Fallback-Validierung wenn ELGA-API nicht verfügbar
   */
  fallbackValidation(ecardNumber, patientData) {
    // Einfache Format-Validierung
    const isValidFormat = ecardNumber && /^\d{10,20}$/.test(ecardNumber);
    
    return {
      success: true,
      valid: isValidFormat,
      status: isValidFormat ? 'valid' : 'invalid',
      insuranceData: {
        insuranceProvider: patientData.insuranceProvider,
        insuranceNumber: patientData.insuranceNumber
      },
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 Jahr
      elgaId: null,
      elgaStatus: 'not_registered',
      warning: 'ELGA-API nicht verfügbar - Fallback-Validierung verwendet'
    };
  }

  /**
   * Ruft Versicherungsdaten von ELGA ab
   * @param {String} ecardNumber - e-card Nummer
   * @returns {Object} Versicherungsdaten
   */
  async getInsuranceData(ecardNumber) {
    try {
      const token = await this.authenticate();

      const response = await axios.get(
        `${this.config.baseUrl}/v1/ecard/${ecardNumber}/insurance`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: this.ecardConfig.timeout,
          httpsAgent: this.httpsAgent
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('ELGA Insurance Data Error:', error.message);
      throw new Error(`Versicherungsdaten-Abfrage fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Übermittelt Abrechnungsdaten an ELGA
   * @param {Object} invoice - Invoice-Objekt
   * @returns {Object} Übermittlungsergebnis
   */
  async submitBilling(invoice) {
    try {
      const token = await this.authenticate();

      const billingData = {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        patient: {
          insuranceNumber: invoice.patient.insuranceNumber,
          socialSecurityNumber: invoice.patient.socialSecurityNumber
        },
        services: invoice.services.map(service => ({
          date: service.date,
          code: service.serviceCode,
          ebmCode: service.ebmCode,
          description: service.description,
          quantity: service.quantity,
          unitPrice: service.unitPrice,
          totalPrice: service.totalPrice,
          copay: service.copay || 0
        })),
        diagnoses: invoice.diagnoses || [],
        totalAmount: invoice.totalAmount,
        copay: invoice.services.reduce((sum, s) => sum + (s.copay || 0), 0),
        insuranceAmount: invoice.totalAmount - invoice.services.reduce((sum, s) => sum + (s.copay || 0), 0)
      };

      const response = await axios.post(
        `${this.config.baseUrl}/v1/billing/submit`,
        billingData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: this.ecardConfig.timeout,
          httpsAgent: this.httpsAgent
        }
      );

      return {
        success: true,
        submissionId: response.data.submissionId,
        status: response.data.status,
        message: response.data.message
      };
    } catch (error) {
      console.error('ELGA Billing Submission Error:', error.message);
      throw new Error(`Abrechnungsübermittlung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Prüft ELGA-Status eines Patienten
   * @param {String} elgaId - ELGA-ID
   * @returns {Object} ELGA-Status
   */
  async getELGAStatus(elgaId) {
    try {
      const token = await this.authenticate();

      const response = await axios.get(
        `${this.config.baseUrl}/v1/patient/${elgaId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: this.ecardConfig.timeout,
          httpsAgent: this.httpsAgent
        }
      );

      return {
        success: true,
        status: response.data.status,
        lastSync: response.data.lastSync ? new Date(response.data.lastSync) : null,
        data: response.data
      };
    } catch (error) {
      console.error('ELGA Status Error:', error.message);
      return {
        success: false,
        status: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Synchronisiert Patientendaten mit ELGA
   * @param {String} patientId - Patient-ID
   * @returns {Object} Synchronisierungsergebnis
   */
  async syncPatientData(patientId) {
    try {
      const patient = await PatientExtended.findById(patientId);
      if (!patient) {
        throw new Error('Patient nicht gefunden');
      }

      if (!patient.ecard?.cardNumber) {
        throw new Error('Keine e-card Nummer vorhanden');
      }

      // Validiere e-card
      const validation = await this.validateECard(patient.ecard.cardNumber, {
        socialSecurityNumber: patient.socialSecurityNumber,
        dateOfBirth: patient.dateOfBirth,
        lastName: patient.lastName,
        insuranceProvider: patient.insuranceProvider
      });

      // Aktualisiere Patientendaten
      if (validation.valid && validation.insuranceData) {
        patient.insuranceProvider = validation.insuranceData.insuranceProvider || patient.insuranceProvider;
        patient.insuranceNumber = validation.insuranceData.insuranceNumber || patient.insuranceNumber;
        
        if (validation.elgaId) {
          patient.ecard.elgaId = validation.elgaId;
          patient.ecard.elgaStatus = validation.elgaStatus;
        }
        
        patient.ecard.validationStatus = validation.status;
        patient.ecard.lastValidated = new Date();
        patient.ecard.validFrom = validation.validFrom;
        patient.ecard.validUntil = validation.validUntil;
        
        await patient.save();
      }

      // Erstelle Validierungs-Eintrag
      const validationRecord = new ECardValidation({
        patientId: patient._id,
        ecardNumber: patient.ecard.cardNumber,
        validationDate: new Date(),
        validationStatus: validation.status,
        validFrom: validation.validFrom,
        validUntil: validation.validUntil,
        insuranceData: validation.insuranceData,
        elgaData: {
          elgaId: validation.elgaId,
          elgaStatus: validation.elgaStatus,
          lastSync: new Date()
        },
        validatedBy: null, // System
        validationMethod: 'elga'
      });

      await validationRecord.save();

      return {
        success: true,
        valid: validation.valid,
        validation: validationRecord,
        patient: patient
      };
    } catch (error) {
      console.error('ELGA Patient Sync Error:', error.message);
      throw new Error(`Patientensynchronisierung fehlgeschlagen: ${error.message}`);
    }
  }
}

module.exports = new ELGAService();

