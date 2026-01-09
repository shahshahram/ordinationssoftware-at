// KDok-Service (Kassen-Dokumentationssystem)
// Integration mit KDok für elektronische Abrechnung

const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
const Invoice = require('../models/Invoice');
const ogkXMLGenerator = require('../utils/ogk-xml-generator');

class KDokService {
  constructor() {
    // KDok-Konfiguration
    this.config = {
      baseUrl: process.env.KDOK_BASE_URL || 'https://kdok.gv.at/api',
      clientId: process.env.KDOK_CLIENT_ID || '',
      clientSecret: process.env.KDOK_CLIENT_SECRET || '',
      timeout: parseInt(process.env.KDOK_TIMEOUT || '30000'),
      environment: process.env.KDOK_ENVIRONMENT || process.env.NODE_ENV || 'development',
      // KDok-spezifische Einstellungen
      autoSubmit: process.env.KDOK_AUTO_SUBMIT === 'true',
      submissionMethod: process.env.KDOK_SUBMISSION_METHOD || 'xml', // 'xml' oder 'api'
      batchSize: parseInt(process.env.KDOK_BATCH_SIZE || '100')
    };
    
    // Zertifikate
    this.certConfig = {
      clientCert: process.env.KDOK_CLIENT_CERT_PATH || './certs/kdok-client.crt',
      clientKey: process.env.KDOK_CLIENT_KEY_PATH || './certs/kdok-client.key',
      caCert: process.env.KDOK_CA_CERT_PATH || './certs/kdok-ca.crt',
      passphrase: process.env.KDOK_CERT_PASSPHRASE || ''
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
      console.warn('Fehler beim Laden der KDok-Zertifikate:', error.message);
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
   * Authentifizierung bei KDok-API
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
          scope: 'kdok.read kdok.write kdok.submit'
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
      console.error('KDok Authentifizierungsfehler:', error.message);
      throw new Error(`KDok-Authentifizierung fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Übermittelt eine Rechnung an KDok
   * @param {Object} invoice - Invoice-Objekt
   * @param {Object} doctorInfo - Arzt-Informationen
   * @returns {Object} Übermittlungsergebnis
   */
  async submitInvoice(invoice, doctorInfo = {}) {
    try {
      const token = await this.authenticate();
      
      if (this.config.submissionMethod === 'xml') {
        return await this.submitAsXML(invoice, doctorInfo, token);
      } else {
        return await this.submitAsAPI(invoice, doctorInfo, token);
      }
    } catch (error) {
      console.error('KDok-Übermittlungsfehler:', error);
      throw error;
    }
  }
  
  /**
   * Übermittelt Rechnung als XML
   */
  async submitAsXML(invoice, doctorInfo, token) {
    try {
      // Generiere ÖGK-XML
      const xml = ogkXMLGenerator.generateELA([invoice], doctorInfo);
      
      // Übermittle XML an KDok
      const response = await axios.post(
        `${this.config.baseUrl}/v1/submissions/xml`,
        xml,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/xml'
          },
          timeout: this.config.timeout,
          httpsAgent: this.httpsAgent
        }
      );
      
      return {
        success: true,
        submissionId: response.data.submissionId,
        status: response.data.status,
        message: response.data.message,
        submittedAt: new Date()
      };
    } catch (error) {
      console.error('KDok XML-Übermittlungsfehler:', error);
      throw new Error(`KDok-XML-Übermittlung fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Übermittelt Rechnung über API
   */
  async submitAsAPI(invoice, doctorInfo, token) {
    try {
      // Konvertiere Invoice zu KDok-Format
      const payload = this.convertInvoiceToKDokFormat(invoice, doctorInfo);
      
      const response = await axios.post(
        `${this.config.baseUrl}/v1/submissions`,
        payload,
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
        submissionId: response.data.submissionId,
        status: response.data.status,
        message: response.data.message,
        submittedAt: new Date()
      };
    } catch (error) {
      console.error('KDok API-Übermittlungsfehler:', error);
      throw new Error(`KDok-API-Übermittlung fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Konvertiert Invoice zu KDok-Format
   */
  convertInvoiceToKDokFormat(invoice, doctorInfo) {
    return {
      submissionType: 'EINZELLEISTUNGSAUSZUG',
      billingPeriod: invoice.ogkBilling?.billingPeriod || this.getCurrentBillingPeriod(),
      doctor: {
        name: doctorInfo.name || invoice.doctor?.name || '',
        title: doctorInfo.title || invoice.doctor?.title || '',
        specialization: doctorInfo.specialization || invoice.doctor?.specialization || '',
        taxNumber: doctorInfo.taxNumber || invoice.doctor?.taxNumber || '',
        chamberNumber: doctorInfo.chamberNumber || invoice.doctor?.chamberNumber || '',
        address: doctorInfo.address || invoice.doctor?.address || {}
      },
      patient: {
        insuranceNumber: invoice.patient?.insuranceNumber || '',
        insuranceProvider: invoice.patient?.insuranceProvider || '',
        name: invoice.patient?.name || '',
        address: invoice.patient?.address || {}
      },
      services: invoice.services.map(service => ({
        date: service.date,
        serviceCode: service.serviceCode,
        description: service.description,
        quantity: service.quantity,
        unitPrice: service.unitPrice,
        totalPrice: service.totalPrice
      })),
      totalAmount: invoice.totalAmount,
      diagnoses: invoice.diagnoses || []
    };
  }
  
  /**
   * Übermittelt mehrere Rechnungen (Batch)
   */
  async submitBatch(invoices, doctorInfo = {}) {
    try {
      const token = await this.authenticate();
      const results = [];
      
      // Teile in Batches auf
      for (let i = 0; i < invoices.length; i += this.config.batchSize) {
        const batch = invoices.slice(i, i + this.config.batchSize);
        
        if (this.config.submissionMethod === 'xml') {
          const xml = ogkXMLGenerator.generateELA(batch, doctorInfo);
          
          const response = await axios.post(
            `${this.config.baseUrl}/v1/submissions/xml/batch`,
            xml,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/xml'
              },
              timeout: this.config.timeout * 2, // Mehr Zeit für Batch
              httpsAgent: this.httpsAgent
            }
          );
          
          results.push({
            success: true,
            submissionId: response.data.submissionId,
            invoiceCount: batch.length,
            status: response.data.status,
            submittedAt: new Date()
          });
        } else {
          const payload = {
            submissions: batch.map(inv => this.convertInvoiceToKDokFormat(inv, doctorInfo))
          };
          
          const response = await axios.post(
            `${this.config.baseUrl}/v1/submissions/batch`,
            payload,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: this.config.timeout * 2,
              httpsAgent: this.httpsAgent
            }
          );
          
          results.push({
            success: true,
            submissionId: response.data.submissionId,
            invoiceCount: batch.length,
            status: response.data.status,
            submittedAt: new Date()
          });
        }
      }
      
      return {
        success: true,
        totalInvoices: invoices.length,
        results,
        submittedAt: new Date()
      };
    } catch (error) {
      console.error('KDok Batch-Übermittlungsfehler:', error);
      throw error;
    }
  }
  
  /**
   * Prüft Status einer Übermittlung
   */
  async checkSubmissionStatus(submissionId) {
    try {
      const token = await this.authenticate();
      
      const response = await axios.get(
        `${this.config.baseUrl}/v1/submissions/${submissionId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: this.config.timeout,
          httpsAgent: this.httpsAgent
        }
      );
      
      return {
        success: true,
        submissionId,
        status: response.data.status,
        message: response.data.message,
        processedAt: response.data.processedAt ? new Date(response.data.processedAt) : null,
        errors: response.data.errors || []
      };
    } catch (error) {
      console.error('KDok Status-Prüfungsfehler:', error);
      throw error;
    }
  }
  
  /**
   * Gibt aktuelles Abrechnungszeitraum zurück
   */
  getCurrentBillingPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
  
  /**
   * Prüft KDok-Verbindung
   */
  async checkConnection() {
    try {
      const token = await this.authenticate();
      return {
        success: true,
        connected: true,
        environment: this.config.environment,
        hasCertificates: this.hasCertificates()
      };
    } catch (error) {
      return {
        success: false,
        connected: false,
        error: error.message
      };
    }
  }
}

module.exports = new KDokService();



