const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class InsuranceConnector {
  constructor() {
    this.configs = {
      // Beispiel-Konfigurationen für verschiedene Versicherungen
      'Allianz': {
        apiUrl: 'https://api.allianz.at',
        apiKey: process.env.ALLIANZ_API_KEY,
        supportsAPI: true,
        supportedFormats: ['JSON', 'XML']
      },
      'Generali': {
        apiUrl: 'https://api.generali.at',
        apiKey: process.env.GENERALI_API_KEY,
        supportsAPI: true,
        supportedFormats: ['JSON', 'PDF']
      },
      'Wiener Städtische': {
        apiUrl: 'https://api.wienerstaedtische.at',
        apiKey: process.env.WST_API_KEY,
        supportsAPI: false,
        supportedFormats: ['PDF', 'XML'],
        emailEndpoint: 'claims@wienerstaedtische.at'
      }
    };
  }

  /**
   * Antrag an Versicherung einreichen
   * @param {object} invoice - Rechnungsdaten
   * @param {object} payload - Vollständige Payload
   * @returns {Promise<object>} Versicherungs-Response
   */
  async submitClaim(invoice, payload) {
    const insuranceProvider = payload.patient.insuranceProvider;
    const config = this.configs[insuranceProvider];
    
    if (!config) {
      throw new Error(`Versicherung ${insuranceProvider} nicht unterstützt`);
    }

    try {
      if (config.supportsAPI) {
        return await this.submitViaAPI(invoice, payload, config);
      } else {
        return await this.submitViaEmail(invoice, payload, config);
      }
    } catch (error) {
      console.error('Versicherungs-Connector Fehler:', error);
      throw new Error(`Versicherungsantrag fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Antrag über API einreichen
   */
  async submitViaAPI(invoice, payload, config) {
    const claimPayload = this.buildClaimPayload(invoice, payload);
    
    const headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'X-Source': 'ordinationssoftware'
    };

    try {
      const response = await axios.post(
        `${config.apiUrl}/api/v1/claims/submit`,
        claimPayload,
        {
          headers,
          timeout: 30000
        }
      );

      return {
        success: true,
        claimRef: response.data.claimNumber,
        status: response.data.status,
        message: response.data.message,
        method: 'API'
      };
      
    } catch (error) {
      if (error.response) {
        throw new Error(`Versicherungs-API Fehler ${error.response.status}: ${error.response.data?.message || error.message}`);
      } else {
        throw new Error(`Versicherungs-API Fehler: ${error.message}`);
      }
    }
  }

  /**
   * Antrag per E-Mail einreichen
   */
  async submitViaEmail(invoice, payload, config) {
    // PDF-Rechnung generieren
    const pdfBuffer = await this.generateClaimPDF(invoice, payload);
    
    // E-Mail mit PDF-Anhang senden
    const emailResult = await this.sendClaimEmail(pdfBuffer, invoice, payload, config);
    
    return {
      success: true,
      claimRef: emailResult.messageId,
      status: 'SUBMITTED',
      message: 'Antrag per E-Mail eingereicht',
      method: 'EMAIL',
      emailMessageId: emailResult.messageId
    };
  }

  /**
   * Claim-Payload für API erstellen
   */
  buildClaimPayload(invoice, payload) {
    return {
      // Versicherungsdaten
      insurance: {
        provider: payload.patient.insuranceProvider,
        policyNumber: payload.patient.insurancePolicyNumber,
        memberId: payload.patient.insuranceMemberId
      },
      
      // Patientendaten
      patient: {
        name: payload.patient.name,
        dateOfBirth: payload.patient.dateOfBirth,
        address: payload.patient.address,
        phone: payload.patient.phone,
        email: payload.patient.email
      },
      
      // Leistungsdaten
      service: {
        code: payload.performance.serviceCode,
        description: payload.performance.serviceDescription,
        date: payload.performance.serviceDatetime,
        amount: payload.performance.totalPrice,
        doctor: payload.doctor.name
      },
      
      // Rechnungsdaten
      invoice: {
        number: invoice.invoiceNumber,
        date: invoice.invoiceDate,
        totalAmount: invoice.totalAmount,
        currency: 'EUR'
      },
      
      // Metadaten
      metadata: {
        submissionDate: new Date(),
        source: 'ordinationssoftware',
        version: '1.0'
      }
    };
  }

  /**
   * PDF für Versicherungsantrag generieren
   */
  async generateClaimPDF(invoice, payload) {
    const pdfService = require('../invoicePDFService');
    
    // Spezielle PDF-Vorlage für Versicherungsanträge
    const claimHTML = this.generateClaimHTML(invoice, payload);
    
    // PDF generieren
    return await pdfService.generatePDFFromHTML(claimHTML, {
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
    });
  }

  /**
   * HTML für Versicherungsantrag generieren
   */
  generateClaimHTML(invoice, payload) {
    return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <title>Versicherungsantrag - ${invoice.invoiceNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .section h3 { background-color: #f0f0f0; padding: 5px; margin: 0 0 10px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .total { font-weight: bold; background-color: #f9f9f9; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Versicherungsantrag</h1>
            <h2>${payload.patient.insuranceProvider}</h2>
        </div>
        
        <div class="section">
            <h3>Versicherungsdaten</h3>
            <table>
                <tr><td>Versicherung:</td><td>${payload.patient.insuranceProvider}</td></tr>
                <tr><td>Versicherungsnummer:</td><td>${payload.patient.insurancePolicyNumber || 'Nicht angegeben'}</td></tr>
                <tr><td>Mitgliedsnummer:</td><td>${payload.patient.insuranceMemberId || 'Nicht angegeben'}</td></tr>
            </table>
        </div>
        
        <div class="section">
            <h3>Patientendaten</h3>
            <table>
                <tr><td>Name:</td><td>${payload.patient.name}</td></tr>
                <tr><td>Geburtsdatum:</td><td>${payload.patient.dateOfBirth || 'Nicht angegeben'}</td></tr>
                <tr><td>Adresse:</td><td>${payload.patient.address || 'Nicht angegeben'}</td></tr>
                <tr><td>Telefon:</td><td>${payload.patient.phone || 'Nicht angegeben'}</td></tr>
                <tr><td>E-Mail:</td><td>${payload.patient.email || 'Nicht angegeben'}</td></tr>
            </table>
        </div>
        
        <div class="section">
            <h3>Leistungsdaten</h3>
            <table>
                <tr><td>Leistungscode:</td><td>${payload.performance.serviceCode}</td></tr>
                <tr><td>Beschreibung:</td><td>${payload.performance.serviceDescription}</td></tr>
                <tr><td>Datum:</td><td>${new Date(payload.performance.serviceDatetime).toLocaleDateString('de-DE')}</td></tr>
                <tr><td>Betrag:</td><td>${payload.performance.totalPrice.toFixed(2)} €</td></tr>
                <tr><td>Behandelnder Arzt:</td><td>${payload.doctor.name}</td></tr>
            </table>
        </div>
        
        <div class="section">
            <h3>Rechnungsdaten</h3>
            <table>
                <tr><td>Rechnungsnummer:</td><td>${invoice.invoiceNumber}</td></tr>
                <tr><td>Rechnungsdatum:</td><td>${new Date(invoice.invoiceDate).toLocaleDateString('de-DE')}</td></tr>
                <tr><td>Gesamtbetrag:</td><td class="total">${invoice.totalAmount.toFixed(2)} €</td></tr>
            </table>
        </div>
        
        <div class="section">
            <h3>Antragstellung</h3>
            <p>Hiermit beantrage ich die Erstattung der oben genannten medizinischen Leistung gemäß meiner Zusatzversicherung.</p>
            <p>Datum: ${new Date().toLocaleDateString('de-DE')}</p>
            <p>Unterschrift: _________________________</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * E-Mail mit Antrag senden
   */
  async sendClaimEmail(pdfBuffer, invoice, payload, config) {
    const emailService = require('../emailService');
    
    const emailData = {
      to: config.emailEndpoint,
      subject: `Versicherungsantrag - ${invoice.invoiceNumber}`,
      html: this.generateClaimEmailHTML(invoice, payload),
      attachments: [{
        filename: `Versicherungsantrag_${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };
    
    return await emailService.sendEmail(emailData);
  }

  /**
   * E-Mail-HTML für Versicherungsantrag generieren
   */
  generateClaimEmailHTML(invoice, payload) {
    return `
    <h2>Versicherungsantrag</h2>
    <p>Sehr geehrte Damen und Herren,</p>
    <p>anbei übersende ich Ihnen den Versicherungsantrag für folgende Leistung:</p>
    
    <ul>
        <li><strong>Patient:</strong> ${payload.patient.name}</li>
        <li><strong>Leistung:</strong> ${payload.performance.serviceDescription}</li>
        <li><strong>Datum:</strong> ${new Date(payload.performance.serviceDatetime).toLocaleDateString('de-DE')}</li>
        <li><strong>Betrag:</strong> ${payload.performance.totalPrice.toFixed(2)} €</li>
        <li><strong>Rechnungsnummer:</strong> ${invoice.invoiceNumber}</li>
    </ul>
    
    <p>Bitte bearbeiten Sie den Antrag und senden Sie die Erstattung an den Patienten.</p>
    
    <p>Mit freundlichen Grüßen<br>
    ${payload.doctor.name}</p>
    `;
  }

  /**
   * Status eines Antrags abfragen
   */
  async getClaimStatus(claimRef, insuranceProvider) {
    const config = this.configs[insuranceProvider];
    if (!config || !config.supportsAPI) {
      throw new Error(`Status-Abfrage für ${insuranceProvider} nicht unterstützt`);
    }

    try {
      const response = await axios.get(
        `${config.apiUrl}/api/v1/claims/status/${claimRef}`,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data;
      
    } catch (error) {
      throw new Error(`Status-Abfrage fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Unterstützte Versicherungen abrufen
   */
  getSupportedInsurances() {
    return Object.keys(this.configs).map(provider => ({
      name: provider,
      supportsAPI: this.configs[provider].supportsAPI,
      supportedFormats: this.configs[provider].supportedFormats
    }));
  }

  /**
   * Test-Verbindung zu Versicherungs-API
   */
  async testConnection(insuranceProvider) {
    const config = this.configs[insuranceProvider];
    if (!config || !config.supportsAPI) {
      return {
        success: false,
        error: 'API nicht unterstützt'
      };
    }

    try {
      const response = await axios.get(
        `${config.apiUrl}/api/v1/health`,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      return {
        success: true,
        status: response.data.status,
        version: response.data.version
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new InsuranceConnector();


