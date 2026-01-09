// Direktverrechnung mit Zusatzversicherungen
// Integration mit myCare, RehaDirekt, eAbrechnung

const axios = require('axios');
const https = require('https');
const fs = require('fs');
const Invoice = require('../models/Invoice');
const PatientExtended = require('../models/PatientExtended');

class DirectBillingService {
  constructor() {
    // Konfigurationen für verschiedene Direktverrechnungs-Systeme
    this.configs = {
      myCare: {
        baseUrl: process.env.MYCARE_BASE_URL || 'https://api.mycare.at',
        apiKey: process.env.MYCARE_API_KEY || '',
        clientId: process.env.MYCARE_CLIENT_ID || '',
        clientSecret: process.env.MYCARE_CLIENT_SECRET || '',
        enabled: process.env.MYCARE_ENABLED === 'true',
        timeout: parseInt(process.env.MYCARE_TIMEOUT || '30000')
      },
      rehaDirekt: {
        baseUrl: process.env.REHADIREKT_BASE_URL || 'https://api.rehadirekt.at',
        apiKey: process.env.REHADIREKT_API_KEY || '',
        username: process.env.REHADIREKT_USERNAME || '',
        password: process.env.REHADIREKT_PASSWORD || '',
        enabled: process.env.REHADIREKT_ENABLED === 'true',
        timeout: parseInt(process.env.REHADIREKT_TIMEOUT || '30000')
      },
      eAbrechnung: {
        baseUrl: process.env.EABRECHNUNG_BASE_URL || 'https://api.eabrechnung.at',
        apiKey: process.env.EABRECHNUNG_API_KEY || '',
        clientId: process.env.EABRECHNUNG_CLIENT_ID || '',
        clientSecret: process.env.EABRECHNUNG_CLIENT_SECRET || '',
        enabled: process.env.EABRECHNUNG_ENABLED === 'true',
        timeout: parseInt(process.env.EABRECHNUNG_TIMEOUT || '30000')
      }
    };
    
    // Zertifikate für HTTPS
    this.certConfig = {
      clientCert: process.env.DIRECT_BILLING_CLIENT_CERT_PATH || './certs/direct-billing-client.crt',
      clientKey: process.env.DIRECT_BILLING_CLIENT_KEY_PATH || './certs/direct-billing-client.key',
      caCert: process.env.DIRECT_BILLING_CA_CERT_PATH || './certs/direct-billing-ca.crt',
      passphrase: process.env.DIRECT_BILLING_CERT_PASSPHRASE || ''
    };
    
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
      console.warn('Fehler beim Laden der Direktverrechnungs-Zertifikate:', error.message);
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
   * Bestimmt welches Direktverrechnungs-System für eine Versicherung verwendet werden soll
   */
  determineBillingSystem(insuranceCompany) {
    const insuranceLower = insuranceCompany?.toLowerCase() || '';
    
    // myCare: Allianz, Generali, Wiener Städtische, etc.
    if (insuranceLower.includes('allianz') || 
        insuranceLower.includes('generali') || 
        insuranceLower.includes('wiener städtische') ||
        insuranceLower.includes('uniqua') ||
        insuranceLower.includes('merkur')) {
      return 'myCare';
    }
    
    // RehaDirekt: Spezialisiert auf Reha-Leistungen
    if (insuranceLower.includes('reha') || 
        insuranceLower.includes('rehabilitation')) {
      return 'rehaDirekt';
    }
    
    // eAbrechnung: Allgemeines System
    return 'eAbrechnung';
  }
  
  /**
   * Übermittelt Rechnung an Direktverrechnungs-System
   */
  async submitInvoice(invoice, patient) {
    try {
      // Prüfe ob Patient Zusatzversicherung hat
      if (!patient.additionalInsurances?.privateDoctorInsurance?.hasInsurance) {
        throw new Error('Patient hat keine Zusatzversicherung für Direktverrechnung');
      }
      
      const insuranceCompany = patient.additionalInsurances.privateDoctorInsurance.insuranceCompany;
      const billingSystem = this.determineBillingSystem(insuranceCompany);
      const config = this.configs[billingSystem];
      
      if (!config.enabled) {
        throw new Error(`${billingSystem} ist nicht aktiviert`);
      }
      
      // Konvertiere Invoice zu System-Format
      const payload = this.convertInvoiceToSystemFormat(invoice, patient, billingSystem);
      
      // Übermittle je nach System
      switch (billingSystem) {
        case 'myCare':
          return await this.submitToMyCare(payload, config);
        case 'rehaDirekt':
          return await this.submitToRehaDirekt(payload, config);
        case 'eAbrechnung':
          return await this.submitToEAbrechnung(payload, config);
        default:
          throw new Error(`Unbekanntes Direktverrechnungs-System: ${billingSystem}`);
      }
    } catch (error) {
      console.error('Direktverrechnungs-Fehler:', error);
      throw error;
    }
  }
  
  /**
   * Konvertiert Invoice zu System-Format
   */
  convertInvoiceToSystemFormat(invoice, patient, system) {
    const basePayload = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      patient: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        insuranceNumber: patient.insuranceNumber,
        insuranceCompany: patient.additionalInsurances.privateDoctorInsurance.insuranceCompany,
        policyNumber: patient.additionalInsurances.privateDoctorInsurance.policyNumber
      },
      services: invoice.services.map(service => ({
        date: service.date,
        code: service.serviceCode,
        description: service.description,
        quantity: service.quantity,
        unitPrice: service.unitPrice,
        totalPrice: service.totalPrice
      })),
      totalAmount: invoice.totalAmount,
      doctor: invoice.doctor
    };
    
    // System-spezifische Anpassungen
    switch (system) {
      case 'myCare':
        return {
          ...basePayload,
          format: 'mycare_v1',
          reimbursementRate: patient.additionalInsurances.privateDoctorInsurance.reimbursementRate || 80
        };
      case 'rehaDirekt':
        return {
          ...basePayload,
          format: 'rehadirekt_v1',
          serviceType: 'rehabilitation'
        };
      case 'eAbrechnung':
        return {
          ...basePayload,
          format: 'eabrechnung_v1'
        };
      default:
        return basePayload;
    }
  }
  
  /**
   * Übermittelt an myCare
   */
  async submitToMyCare(payload, config) {
    try {
      const response = await axios.post(
        `${config.baseUrl}/v1/claims`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'X-Client-Id': config.clientId
          },
          timeout: config.timeout,
          httpsAgent: this.httpsAgent
        }
      );
      
      return {
        success: true,
        system: 'myCare',
        claimId: response.data.claimId,
        status: response.data.status,
        reimbursementAmount: response.data.reimbursementAmount,
        submittedAt: new Date()
      };
    } catch (error) {
      console.error('myCare-Übermittlungsfehler:', error);
      throw new Error(`myCare-Übermittlung fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Übermittelt an RehaDirekt
   */
  async submitToRehaDirekt(payload, config) {
    try {
      // Authentifizierung
      const authResponse = await axios.post(
        `${config.baseUrl}/auth/login`,
        {
          username: config.username,
          password: config.password
        },
        {
          timeout: config.timeout,
          httpsAgent: this.httpsAgent
        }
      );
      
      const token = authResponse.data.token;
      
      // Übermittle Rechnung
      const response = await axios.post(
        `${config.baseUrl}/api/v1/billing`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: config.timeout,
          httpsAgent: this.httpsAgent
        }
      );
      
      return {
        success: true,
        system: 'rehaDirekt',
        claimId: response.data.claimId,
        status: response.data.status,
        reimbursementAmount: response.data.reimbursementAmount,
        submittedAt: new Date()
      };
    } catch (error) {
      console.error('RehaDirekt-Übermittlungsfehler:', error);
      throw new Error(`RehaDirekt-Übermittlung fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Übermittelt an eAbrechnung
   */
  async submitToEAbrechnung(payload, config) {
    try {
      // Authentifizierung
      const authResponse = await axios.post(
        `${config.baseUrl}/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: config.timeout,
          httpsAgent: this.httpsAgent
        }
      );
      
      const token = authResponse.data.access_token;
      
      // Übermittle Rechnung
      const response = await axios.post(
        `${config.baseUrl}/api/v1/invoices`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: config.timeout,
          httpsAgent: this.httpsAgent
        }
      );
      
      return {
        success: true,
        system: 'eAbrechnung',
        claimId: response.data.claimId,
        status: response.data.status,
        reimbursementAmount: response.data.reimbursementAmount,
        submittedAt: new Date()
      };
    } catch (error) {
      console.error('eAbrechnung-Übermittlungsfehler:', error);
      throw new Error(`eAbrechnung-Übermittlung fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Prüft Status einer Direktverrechnung
   */
  async checkClaimStatus(claimId, system) {
    try {
      const config = this.configs[system];
      if (!config.enabled) {
        throw new Error(`${system} ist nicht aktiviert`);
      }
      
      switch (system) {
        case 'myCare':
          return await this.checkMyCareStatus(claimId, config);
        case 'rehaDirekt':
          return await this.checkRehaDirektStatus(claimId, config);
        case 'eAbrechnung':
          return await this.checkEAbrechnungStatus(claimId, config);
        default:
          throw new Error(`Unbekanntes System: ${system}`);
      }
    } catch (error) {
      console.error('Status-Prüfungsfehler:', error);
      throw error;
    }
  }
  
  async checkMyCareStatus(claimId, config) {
    const response = await axios.get(
      `${config.baseUrl}/v1/claims/${claimId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'X-Client-Id': config.clientId
        },
        timeout: config.timeout,
        httpsAgent: this.httpsAgent
      }
    );
    
    return {
      success: true,
      claimId,
      status: response.data.status,
      reimbursementAmount: response.data.reimbursementAmount,
      processedAt: response.data.processedAt ? new Date(response.data.processedAt) : null
    };
  }
  
  async checkRehaDirektStatus(claimId, config) {
    const authResponse = await axios.post(
      `${config.baseUrl}/auth/login`,
      { username: config.username, password: config.password },
      { timeout: config.timeout, httpsAgent: this.httpsAgent }
    );
    
    const response = await axios.get(
      `${config.baseUrl}/api/v1/billing/${claimId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${authResponse.data.token}`
        },
        timeout: config.timeout,
        httpsAgent: this.httpsAgent
      }
    );
    
    return {
      success: true,
      claimId,
      status: response.data.status,
      reimbursementAmount: response.data.reimbursementAmount,
      processedAt: response.data.processedAt ? new Date(response.data.processedAt) : null
    };
  }
  
  async checkEAbrechnungStatus(claimId, config) {
    const authResponse = await axios.post(
      `${config.baseUrl}/oauth/token`,
      {
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: config.timeout,
        httpsAgent: this.httpsAgent
      }
    );
    
    const response = await axios.get(
      `${config.baseUrl}/api/v1/invoices/${claimId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${authResponse.data.access_token}`
        },
        timeout: config.timeout,
        httpsAgent: this.httpsAgent
      }
    );
    
    return {
      success: true,
      claimId,
      status: response.data.status,
      reimbursementAmount: response.data.reimbursementAmount,
      processedAt: response.data.processedAt ? new Date(response.data.processedAt) : null
    };
  }
}

module.exports = new DirectBillingService();



