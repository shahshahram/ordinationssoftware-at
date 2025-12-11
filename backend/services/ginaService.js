// GINA-Service (Gesundheits-Informations-Netz-Adapter)
// Integration mit dem österreichischen Gesundheitsinformationsnetz (GIN)

const axios = require('axios');
const https = require('https');
const fs = require('fs');
const PatientExtended = require('../models/PatientExtended');
const ECardValidation = require('../models/ECardValidation');

class GINAService {
  constructor() {
    // GINA-Konfiguration
    this.config = {
      baseUrl: process.env.GINA_BASE_URL || 'https://gina.gv.at/api',
      clientId: process.env.GINA_CLIENT_ID || '',
      clientSecret: process.env.GINA_CLIENT_SECRET || '',
      timeout: parseInt(process.env.GINA_TIMEOUT || '30000'),
      environment: process.env.GINA_ENVIRONMENT || process.env.NODE_ENV || 'development'
    };
    
    // Zertifikate
    this.certConfig = {
      clientCert: process.env.GINA_CLIENT_CERT_PATH || './certs/gina-client.crt',
      clientKey: process.env.GINA_CLIENT_KEY_PATH || './certs/gina-client.key',
      caCert: process.env.GINA_CA_CERT_PATH || './certs/gina-ca.crt',
      passphrase: process.env.GINA_CERT_PASSPHRASE || ''
    };
    
    // Cache für Tokens
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // HTTPS-Agent mit Zertifikaten
    this.httpsAgent = this.createHttpsAgent();
  }
  
  /**
   * Erstellt HTTPS-Agent mit Zertifikaten
   */
  createHttpsAgent() {
    if (!this.hasCertificates()) {
      return undefined;
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
      console.warn('Fehler beim Laden der GINA-Zertifikate:', error.message);
      return undefined;
    }
  }
  
  /**
   * Prüft ob Zertifikate vorhanden sind
   */
  hasCertificates() {
    try {
      return fs.existsSync(this.certConfig.clientCert) &&
             fs.existsSync(this.certConfig.clientKey);
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Authentifizierung bei GINA-API
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
          scope: 'gina.read gina.write'
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: this.config.timeout,
          httpsAgent: this.httpsAgent
        }
      );

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + (expiresIn - 60) * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('GINA Authentication Error:', error.message);
      throw new Error(`GINA-Authentifizierung fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Validiert e-card über GINA
   * @param {String} ecardNumber - e-card Nummer
   * @param {Object} patientData - Patientendaten
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
          timeout: this.config.timeout,
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
        ginaId: response.data.ginaId,
        ginaStatus: response.data.ginaStatus || 'not_registered'
      };
    } catch (error) {
      console.error('GINA e-card Validation Error:', error.message);
      throw new Error(`e-card Validierung fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Ruft Versicherungsdaten über GINA ab
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
          timeout: this.config.timeout,
          httpsAgent: this.httpsAgent
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('GINA Insurance Data Error:', error.message);
      throw new Error(`Versicherungsdaten-Abfrage fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Prüft GINA-Status
   * @returns {Object} GINA-Status
   */
  async getStatus() {
    try {
      const token = await this.authenticate();

      const response = await axios.get(
        `${this.config.baseUrl}/v1/status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout,
          httpsAgent: this.httpsAgent
        }
      );

      return {
        success: true,
        status: response.data.status,
        version: response.data.version,
        data: response.data
      };
    } catch (error) {
      console.error('GINA Status Error:', error.message);
      return {
        success: false,
        status: 'unknown',
        error: error.message
      };
    }
  }
  
  /**
   * Synchronisiert Patientendaten mit GINA
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

      // Validiere e-card über GINA
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
        
        if (validation.ginaId) {
          if (!patient.ecard.gina) {
            patient.ecard.gina = {};
          }
          patient.ecard.gina.ginaId = validation.ginaId;
          patient.ecard.gina.ginaStatus = validation.ginaStatus;
          patient.ecard.gina.lastSync = new Date();
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
          elgaId: null,
          elgaStatus: 'not_registered'
        },
        validatedBy: null,
        validationMethod: 'gina'
      });

      await validationRecord.save();

      return {
        success: true,
        valid: validation.valid,
        validation: validationRecord,
        patient: patient
      };
    } catch (error) {
      console.error('GINA Patient Sync Error:', error.message);
      throw new Error(`Patientensynchronisierung fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Validiert Konfiguration
   */
  validate() {
    const errors = [];
    
    if (!this.config.clientId) {
      errors.push('GINA Client ID fehlt');
    }
    
    if (!this.config.clientSecret) {
      errors.push('GINA Client Secret fehlt');
    }
    
    if (this.config.environment === 'production' && !this.hasCertificates()) {
      errors.push('GINA-Zertifikate fehlen (erforderlich für Produktion)');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new GINAService();














