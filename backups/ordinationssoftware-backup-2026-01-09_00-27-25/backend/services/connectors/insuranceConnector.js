const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const InsuranceProvider = require('../../models/InsuranceProvider');
const DirectBillingService = require('../directBillingService');

class InsuranceConnector {
  constructor() {
    // Legacy-Konfigurationen (für Rückwärtskompatibilität)
    this.legacyConfigs = {
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
    
    // Cache für Datenbank-Konfigurationen
    this.configCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 Minuten
  }

  /**
   * Lädt Versicherungskonfiguration aus Datenbank oder Cache
   */
  async getInsuranceConfig(insuranceProviderName) {
    // Prüfe Cache
    const cached = this.configCache.get(insuranceProviderName);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.config;
    }
    
    // Suche in Datenbank
    try {
      const provider = await InsuranceProvider.findByNameOrAlias(insuranceProviderName);
      if (provider && provider.isActive) {
        const config = provider.toObject();
        this.configCache.set(insuranceProviderName, {
          config,
          timestamp: Date.now()
        });
        return config;
      }
    } catch (error) {
      console.warn(`⚠️ Fehler beim Laden der Versicherungskonfiguration für ${insuranceProviderName}:`, error.message);
    }
    
    // Fallback auf Legacy-Konfiguration
    const legacyConfig = this.legacyConfigs[insuranceProviderName];
    if (legacyConfig) {
      return {
        name: insuranceProviderName,
        integration: {
          protocol: legacyConfig.supportsAPI ? 'rest' : 'email',
          rest: legacyConfig.supportsAPI ? {
            baseUrl: legacyConfig.apiUrl,
            authType: 'api-key',
            apiKey: legacyConfig.apiKey
          } : undefined,
          email: !legacyConfig.supportsAPI ? {
            to: legacyConfig.emailEndpoint || 'claims@example.com',
            requiresPDF: true
          } : undefined
        },
        fallback: {
          enabled: true,
          methods: legacyConfig.supportsAPI ? ['rest', 'email'] : ['email']
        }
      };
    }
    
    return null;
  }

  /**
   * Antrag an Versicherung einreichen (Hauptmethode)
   */
  async submitClaim(invoice, payload) {
    const insuranceProviderName = payload.patient.insuranceProvider;
    const config = await this.getInsuranceConfig(insuranceProviderName);
    
    if (!config) {
      throw new Error(`Versicherung "${insuranceProviderName}" nicht unterstützt. Bitte in den Einstellungen konfigurieren.`);
    }

    const startTime = Date.now();
    let lastError = null;
    
    // Bestimme Methoden-Reihenfolge
    const methods = this.determineMethods(config);
    
    // Versuche jede Methode in der Reihenfolge
    for (const method of methods) {
      try {
        console.log(`📤 Versuche Einreichung über ${method} für ${insuranceProviderName}...`);
        const result = await this.submitViaMethod(invoice, payload, config, method);
        
        // Statistiken aktualisieren
        if (config._id) {
          const responseTime = Date.now() - startTime;
          await InsuranceProvider.findByIdAndUpdate(config._id, {
            $inc: {
              'stats.totalSubmissions': 1,
              'stats.successfulSubmissions': 1
            },
            $set: {
              'stats.lastSubmission': new Date(),
              'stats.averageResponseTime': this.calculateAverageResponseTime(
                config.stats?.averageResponseTime || 0,
                config.stats?.totalSubmissions || 0,
                responseTime
              )
            }
          });
        }
        
        return result;
      } catch (error) {
        console.error(`❌ Fehler bei ${method} für ${insuranceProviderName}:`, error.message);
        lastError = error;
        
        // Wenn Fallback deaktiviert ist, abbrechen
        if (!config.fallback?.enabled || !config.fallback?.autoFallback) {
          break;
        }
        
        // Nächste Methode versuchen
        continue;
      }
    }
    
    // Alle Methoden fehlgeschlagen
    if (config._id) {
      await InsuranceProvider.findByIdAndUpdate(config._id, {
        $inc: {
          'stats.totalSubmissions': 1,
          'stats.failedSubmissions': 1
        },
        $set: {
          'stats.lastError': lastError?.message || 'Alle Methoden fehlgeschlagen',
          'stats.lastSubmission': new Date()
        }
      });
    }
    
    throw new Error(`Versicherungsantrag fehlgeschlagen: ${lastError?.message || 'Alle Methoden fehlgeschlagen'}`);
  }

  /**
   * Bestimmt die Reihenfolge der zu verwendenden Methoden
   */
  determineMethods(config) {
    const protocol = config.integration?.protocol || 'email';
    const fallbackMethods = config.fallback?.methods || [];
    
    // Wenn Fallback-Methoden definiert sind, verwende diese
    if (fallbackMethods.length > 0) {
      return [protocol, ...fallbackMethods.filter(m => m !== protocol)];
    }
    
    // Standard-Reihenfolge basierend auf Protokoll
    const methodOrder = {
      'rest': ['rest', 'email', 'pdf'],
      'fhir': ['fhir', 'rest', 'email'],
      'soap': ['soap', 'rest', 'email'],
      'platform-mycare': ['platform-mycare', 'rest', 'email'],
      'platform-rehadirekt': ['platform-rehadirekt', 'rest', 'email'],
      'platform-eabrechnung': ['platform-eabrechnung', 'rest', 'email'],
      'email': ['email', 'pdf'],
      'pdf': ['pdf'],
      'manual': ['manual']
    };
    
    return methodOrder[protocol] || ['email'];
  }

  /**
   * Reicht Antrag über spezifische Methode ein
   */
  async submitViaMethod(invoice, payload, config, method) {
    switch (method) {
      case 'rest':
        return await this.submitViaREST(invoice, payload, config);
      case 'fhir':
        return await this.submitViaFHIR(invoice, payload, config);
      case 'soap':
        return await this.submitViaSOAP(invoice, payload, config);
      case 'platform-mycare':
      case 'platform-rehadirekt':
      case 'platform-eabrechnung':
        return await this.submitViaPlatform(invoice, payload, config, method);
      case 'email':
        return await this.submitViaEmail(invoice, payload, config);
      case 'pdf':
        return await this.submitViaPDF(invoice, payload, config);
      case 'manual':
        return await this.submitViaManual(invoice, payload, config);
      default:
        throw new Error(`Unbekannte Methode: ${method}`);
    }
  }

  /**
   * REST API Einreichung
   */
  async submitViaREST(invoice, payload, config) {
    const restConfig = config.integration?.rest;
    if (!restConfig?.baseUrl) {
      throw new Error('REST-Konfiguration fehlt');
    }
    
    const claimPayload = this.buildClaimPayload(invoice, payload, config);
    const headers = this.buildRESTHeaders(restConfig);
    const endpoint = restConfig.endpoints?.submitClaim || '/api/v1/claims/submit';
    const url = `${restConfig.baseUrl}${endpoint}`;
    
    const timeout = config.integration?.timeout?.request || 30000;
    
    try {
      const response = await axios.post(url, claimPayload, {
        headers,
        timeout,
        validateStatus: (status) => status < 500 // Retry bei 5xx Fehlern
      });
      
      return {
        success: true,
        claimRef: response.data.claimNumber || response.data.claimRef || response.data.id,
        status: response.data.status || 'SUBMITTED',
        message: response.data.message || 'Antrag erfolgreich eingereicht',
        method: 'REST',
        rawResponse: response.data
      };
    } catch (error) {
      if (error.response) {
        throw new Error(`REST API Fehler ${error.response.status}: ${error.response.data?.message || error.message}`);
      }
      throw new Error(`REST API Fehler: ${error.message}`);
    }
  }

  /**
   * FHIR API Einreichung
   */
  async submitViaFHIR(invoice, payload, config) {
    const fhirConfig = config.integration?.fhir;
    if (!fhirConfig?.baseUrl) {
      throw new Error('FHIR-Konfiguration fehlt');
    }
    
    // Erstelle FHIR Claim Resource
    const fhirClaim = this.buildFHIRClaim(invoice, payload, config);
    const endpoint = fhirConfig.endpoint || '/Claim';
    const url = `${fhirConfig.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/fhir+json',
      ...this.buildFHIRHeaders(fhirConfig)
    };
    
    try {
      const response = await axios.post(url, fhirClaim, {
        headers,
        timeout: config.integration?.timeout?.request || 30000
      });
      
      return {
        success: true,
        claimRef: response.data.id,
        status: response.data.status || 'active',
        message: 'FHIR Claim erfolgreich eingereicht',
        method: 'FHIR',
        fhirId: response.data.id
      };
    } catch (error) {
      throw new Error(`FHIR API Fehler: ${error.message}`);
    }
  }

  /**
   * SOAP/XML Einreichung
   */
  async submitViaSOAP(invoice, payload, config) {
    const soapConfig = config.integration?.soap;
    if (!soapConfig?.wsdlUrl) {
      throw new Error('SOAP-Konfiguration fehlt');
    }
    
    // SOAP-Envelope erstellen
    const soapEnvelope = this.buildSOAPEnvelope(invoice, payload, config);
    
    const headers = {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': soapConfig.soapAction || ''
    };
    
    try {
      const response = await axios.post(soapConfig.endpoint, soapEnvelope, {
        headers,
        timeout: config.integration?.timeout?.request || 30000
      });
      
      // Parse SOAP Response
      const claimRef = this.parseSOAPResponse(response.data);
      
      return {
        success: true,
        claimRef,
        status: 'SUBMITTED',
        message: 'SOAP Request erfolgreich eingereicht',
        method: 'SOAP'
      };
    } catch (error) {
      throw new Error(`SOAP API Fehler: ${error.message}`);
    }
  }

  /**
   * Plattform-Integration (myCare, RehaDirekt, eAbrechnung)
   */
  async submitViaPlatform(invoice, payload, config, method) {
    const platformType = method.replace('platform-', '');
    const directBilling = new DirectBillingService();
    
    try {
      const result = await directBilling.submitInvoice(invoice, payload.patient, platformType);
      return {
        success: true,
        claimRef: result.claimId || result.id,
        status: result.status || 'SUBMITTED',
        message: result.message || `Antrag über ${platformType} erfolgreich eingereicht`,
        method: `platform-${platformType}`,
        platformResponse: result
      };
    } catch (error) {
      throw new Error(`${platformType} Fehler: ${error.message}`);
    }
  }

  /**
   * E-Mail Einreichung
   */
  async submitViaEmail(invoice, payload, config) {
    const emailConfig = config.integration?.email;
    if (!emailConfig?.to) {
      throw new Error('E-Mail-Konfiguration fehlt');
    }
    
    let pdfBuffer = null;
    if (emailConfig.requiresPDF) {
      pdfBuffer = await this.generateClaimPDF(invoice, payload, config);
    }
    
    const emailResult = await this.sendClaimEmail(pdfBuffer, invoice, payload, config, emailConfig);
    
    return {
      success: true,
      claimRef: emailResult.messageId || `email-${Date.now()}`,
      status: 'SUBMITTED',
      message: 'Antrag per E-Mail eingereicht',
      method: 'EMAIL',
      emailMessageId: emailResult.messageId
    };
  }

  /**
   * PDF Einreichung (manuell)
   */
  async submitViaPDF(invoice, payload, config) {
    const pdfBuffer = await this.generateClaimPDF(invoice, payload, config);
    const filename = `Versicherungsantrag_${invoice.invoiceNumber}_${Date.now()}.pdf`;
    
    // Speichere PDF für manuelle Einreichung
    const outputPath = path.join(process.cwd(), 'exports', 'insurance-claims', filename);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, pdfBuffer);
    
    return {
      success: true,
      claimRef: `pdf-${Date.now()}`,
      status: 'PENDING',
      message: `PDF wurde erstellt: ${filename}`,
      method: 'PDF',
      filePath: outputPath,
      downloadUrl: `/api/insurance-claims/download/${filename}`
    };
  }

  /**
   * Manuelle Einreichung (nur Tracking)
   */
  async submitViaManual(invoice, payload, config) {
    return {
      success: true,
      claimRef: `manual-${Date.now()}`,
      status: 'PENDING',
      message: 'Antrag muss manuell eingereicht werden',
      method: 'MANUAL',
      instructions: config.integration?.manual?.instructions || 'Bitte reichen Sie den Antrag manuell bei der Versicherung ein.'
    };
  }

  /**
   * Erstellt REST-Headers
   */
  buildRESTHeaders(restConfig) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Source': 'ordinationssoftware',
      ...restConfig.headers
    };
    
    // Authentifizierung
    switch (restConfig.authType) {
      case 'api-key':
        if (restConfig.apiKey) {
          headers['X-API-Key'] = restConfig.apiKey;
        }
        break;
      case 'bearer':
        if (restConfig.apiKey) {
          headers['Authorization'] = `Bearer ${restConfig.apiKey}`;
        }
        break;
      case 'basic':
        if (restConfig.apiKey && restConfig.apiSecret) {
          const credentials = Buffer.from(`${restConfig.apiKey}:${restConfig.apiSecret}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'oauth2':
        // OAuth2 wird separat gehandhabt
        break;
    }
    
    return headers;
  }

  /**
   * Erstellt FHIR-Headers
   */
  buildFHIRHeaders(fhirConfig) {
    const headers = {};
    
    if (fhirConfig.authType === 'bearer' && fhirConfig.apiKey) {
      headers['Authorization'] = `Bearer ${fhirConfig.apiKey}`;
    }
    
    return headers;
  }

  /**
   * Erstellt Claim-Payload
   */
  buildClaimPayload(invoice, payload, config) {
    const basePayload = {
      insurance: {
        provider: payload.patient.insuranceProvider,
        policyNumber: payload.patient.insurancePolicyNumber || payload.patient.insuranceNumber,
        memberId: payload.patient.insuranceMemberId
      },
      patient: {
        name: `${payload.patient.firstName} ${payload.patient.lastName}`,
        firstName: payload.patient.firstName,
        lastName: payload.patient.lastName,
        dateOfBirth: payload.patient.dateOfBirth,
        address: payload.patient.address,
        phone: payload.patient.phone,
        email: payload.patient.email,
        socialSecurityNumber: payload.patient.socialSecurityNumber
      },
      service: {
        code: payload.performance?.serviceCode,
        description: payload.performance?.serviceDescription,
        date: payload.performance?.serviceDatetime || invoice.invoiceDate,
        amount: payload.performance?.totalPrice || invoice.totalAmount,
        doctor: payload.doctor?.name || payload.doctor?.firstName + ' ' + payload.doctor?.lastName
      },
      invoice: {
        number: invoice.invoiceNumber,
        date: invoice.invoiceDate,
        totalAmount: invoice.totalAmount,
        currency: config.integration?.format?.currency || 'EUR'
      },
      metadata: {
        submissionDate: new Date().toISOString(),
        source: 'ordinationssoftware',
        version: '2.0'
      }
    };
    
    // Wende Feld-Mappings an
    if (config.mapping?.fieldMappings) {
      return this.applyFieldMappings(basePayload, config.mapping.fieldMappings);
    }
    
    return basePayload;
  }

  /**
   * Erstellt FHIR Claim Resource
   */
  buildFHIRClaim(invoice, payload, config) {
    return {
      resourceType: 'Claim',
      status: 'active',
      type: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/claim-type',
          code: 'professional',
          display: 'Professional'
        }]
      },
      patient: {
        reference: `Patient/${payload.patient._id || 'unknown'}`,
        display: `${payload.patient.firstName} ${payload.patient.lastName}`
      },
      billablePeriod: {
        start: invoice.invoiceDate,
        end: invoice.invoiceDate
      },
      item: [{
        sequence: 1,
        productOrService: {
          coding: [{
            code: payload.performance?.serviceCode,
            display: payload.performance?.serviceDescription
          }]
        },
        servicedDate: payload.performance?.serviceDatetime || invoice.invoiceDate,
        unitPrice: {
          value: payload.performance?.totalPrice || invoice.totalAmount,
          currency: config.integration?.format?.currency || 'EUR'
        }
      }],
      total: {
        value: invoice.totalAmount,
        currency: config.integration?.format?.currency || 'EUR'
      }
    };
  }

  /**
   * Erstellt SOAP Envelope
   */
  buildSOAPEnvelope(invoice, payload, config) {
    const soapConfig = config.integration.soap;
    const namespace = soapConfig.namespace || 'http://schemas.xmlsoap.org/soap/envelope/';
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="${namespace}">
  <soap:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <wsse:UsernameToken>
        <wsse:Username>${soapConfig.username || ''}</wsse:Username>
        <wsse:Password>${soapConfig.password || ''}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>
  <soap:Body>
    <SubmitClaimRequest>
      <InvoiceNumber>${invoice.invoiceNumber}</InvoiceNumber>
      <InvoiceDate>${invoice.invoiceDate}</InvoiceDate>
      <TotalAmount>${invoice.totalAmount}</TotalAmount>
      <Patient>
        <Name>${payload.patient.firstName} ${payload.patient.lastName}</Name>
        <DateOfBirth>${payload.patient.dateOfBirth}</DateOfBirth>
      </Patient>
    </SubmitClaimRequest>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Parst SOAP Response
   */
  parseSOAPResponse(xmlData) {
    // Einfache XML-Parsing (sollte durch eine XML-Bibliothek ersetzt werden)
    const claimRefMatch = xmlData.match(/<ClaimRef>([^<]+)<\/ClaimRef>/);
    return claimRefMatch ? claimRefMatch[1] : `soap-${Date.now()}`;
  }

  /**
   * Wendet Feld-Mappings an
   */
  applyFieldMappings(payload, mappings) {
    const mapped = {};
    for (const [targetField, sourceField] of Object.entries(mappings)) {
      const value = this.getNestedValue(payload, sourceField);
      this.setNestedValue(mapped, targetField, value);
    }
    return { ...payload, ...mapped };
  }

  /**
   * Holt verschachtelten Wert aus Objekt
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Setzt verschachtelten Wert in Objekt
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Generiert PDF für Versicherungsantrag
   */
  async generateClaimPDF(invoice, payload, config) {
    try {
      const pdfService = require('../invoicePDFService');
      const claimHTML = this.generateClaimHTML(invoice, payload, config);
      
      return await pdfService.generatePDFFromHTML(claimHTML, {
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
      });
    } catch (error) {
      console.error('PDF-Generierung fehlgeschlagen:', error);
      throw new Error(`PDF-Generierung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Generiert HTML für Versicherungsantrag
   */
  generateClaimHTML(invoice, payload, config) {
    const template = config.integration?.pdf?.template || 'standard';
    
    // Standard-Template
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
                <tr><td>Versicherungsnummer:</td><td>${payload.patient.insurancePolicyNumber || payload.patient.insuranceNumber || 'Nicht angegeben'}</td></tr>
                <tr><td>Mitgliedsnummer:</td><td>${payload.patient.insuranceMemberId || 'Nicht angegeben'}</td></tr>
            </table>
        </div>
        
        <div class="section">
            <h3>Patientendaten</h3>
            <table>
                <tr><td>Name:</td><td>${payload.patient.firstName} ${payload.patient.lastName}</td></tr>
                <tr><td>Geburtsdatum:</td><td>${payload.patient.dateOfBirth || 'Nicht angegeben'}</td></tr>
                <tr><td>Adresse:</td><td>${payload.patient.address || 'Nicht angegeben'}</td></tr>
                <tr><td>Telefon:</td><td>${payload.patient.phone || 'Nicht angegeben'}</td></tr>
                <tr><td>E-Mail:</td><td>${payload.patient.email || 'Nicht angegeben'}</td></tr>
            </table>
        </div>
        
        <div class="section">
            <h3>Leistungsdaten</h3>
            <table>
                <tr><td>Leistungscode:</td><td>${payload.performance?.serviceCode || 'N/A'}</td></tr>
                <tr><td>Beschreibung:</td><td>${payload.performance?.serviceDescription || 'N/A'}</td></tr>
                <tr><td>Datum:</td><td>${new Date(payload.performance?.serviceDatetime || invoice.invoiceDate).toLocaleDateString('de-DE')}</td></tr>
                <tr><td>Betrag:</td><td>${(payload.performance?.totalPrice || invoice.totalAmount).toFixed(2)} €</td></tr>
                <tr><td>Behandelnder Arzt:</td><td>${payload.doctor?.name || payload.doctor?.firstName + ' ' + payload.doctor?.lastName || 'N/A'}</td></tr>
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
            <p>Hiermit beantrage ich die Erstattung der oben genannten medizinischen Leistung gemäß meiner Versicherung.</p>
            <p>Datum: ${new Date().toLocaleDateString('de-DE')}</p>
            <p>Unterschrift: _________________________</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Sendet E-Mail mit Antrag
   */
  async sendClaimEmail(pdfBuffer, invoice, payload, config, emailConfig) {
    const emailService = require('../emailService');
    
    const subject = emailConfig.subjectTemplate
      .replace('{invoiceNumber}', invoice.invoiceNumber)
      .replace('{patientName}', `${payload.patient.firstName} ${payload.patient.lastName}`);
    
    const emailData = {
      to: emailConfig.to,
      subject,
      html: this.generateClaimEmailHTML(invoice, payload),
      attachments: pdfBuffer ? [{
        filename: `Versicherungsantrag_${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }] : [],
      cc: emailConfig.cc,
      bcc: emailConfig.bcc
    };
    
    return await emailService.sendEmail(emailData);
  }

  /**
   * Generiert E-Mail-HTML
   */
  generateClaimEmailHTML(invoice, payload) {
    return `
    <h2>Versicherungsantrag</h2>
    <p>Sehr geehrte Damen und Herren,</p>
    <p>anbei übersende ich Ihnen den Versicherungsantrag für folgende Leistung:</p>
    
    <ul>
        <li><strong>Patient:</strong> ${payload.patient.firstName} ${payload.patient.lastName}</li>
        <li><strong>Leistung:</strong> ${payload.performance?.serviceDescription || 'N/A'}</li>
        <li><strong>Datum:</strong> ${new Date(payload.performance?.serviceDatetime || invoice.invoiceDate).toLocaleDateString('de-DE')}</li>
        <li><strong>Betrag:</strong> ${(payload.performance?.totalPrice || invoice.totalAmount).toFixed(2)} €</li>
        <li><strong>Rechnungsnummer:</strong> ${invoice.invoiceNumber}</li>
    </ul>
    
    <p>Bitte bearbeiten Sie den Antrag und senden Sie die Erstattung an den Patienten.</p>
    
    <p>Mit freundlichen Grüßen<br>
    ${payload.doctor?.name || payload.doctor?.firstName + ' ' + payload.doctor?.lastName || 'Ordination'}</p>
    `;
  }

  /**
   * Status eines Antrags abfragen
   */
  async getClaimStatus(claimRef, insuranceProviderName) {
    const config = await this.getInsuranceConfig(insuranceProviderName);
    if (!config) {
      throw new Error(`Versicherung "${insuranceProviderName}" nicht gefunden`);
    }
    
    const protocol = config.integration?.protocol;
    if (!['rest', 'fhir'].includes(protocol)) {
      throw new Error(`Status-Abfrage für Protokoll ${protocol} nicht unterstützt`);
    }
    
    if (protocol === 'rest') {
      const restConfig = config.integration.rest;
      const endpoint = restConfig.endpoints?.getStatus?.replace(':claimId', claimRef) || `/api/v1/claims/status/${claimRef}`;
      const url = `${restConfig.baseUrl}${endpoint}`;
      const headers = this.buildRESTHeaders(restConfig);
      
      const response = await axios.get(url, { headers, timeout: 30000 });
      return response.data;
    }
    
    // FHIR Status-Abfrage
    if (protocol === 'fhir') {
      const fhirConfig = config.integration.fhir;
      const url = `${fhirConfig.baseUrl}/Claim/${claimRef}`;
      const headers = this.buildFHIRHeaders(fhirConfig);
      
      const response = await axios.get(url, { headers, timeout: 30000 });
      return {
        status: response.data.status,
        outcome: response.data.outcome,
        payment: response.data.payment
      };
    }
  }

  /**
   * Unterstützte Versicherungen abrufen
   */
  async getSupportedInsurances() {
    try {
      const providers = await InsuranceProvider.find({ isActive: true }).select('name code integration.protocol stats');
      return providers.map(provider => ({
        name: provider.name,
        code: provider.code,
        protocol: provider.integration?.protocol,
        supportedMethods: provider.supportedMethods,
        stats: provider.stats
      }));
    } catch (error) {
      console.error('Fehler beim Laden der Versicherungen:', error);
      // Fallback auf Legacy
      return Object.keys(this.legacyConfigs).map(name => ({
        name,
        protocol: this.legacyConfigs[name].supportsAPI ? 'rest' : 'email',
        supportedMethods: this.legacyConfigs[name].supportsAPI ? ['rest', 'email'] : ['email']
      }));
    }
  }

  /**
   * Test-Verbindung zu Versicherungs-API
   */
  async testConnection(insuranceProviderName) {
    const config = await this.getInsuranceConfig(insuranceProviderName);
    if (!config) {
      return { success: false, error: 'Versicherung nicht gefunden' };
    }
    
    const protocol = config.integration?.protocol;
    
    if (protocol === 'rest') {
      const restConfig = config.integration.rest;
      if (!restConfig?.baseUrl) {
        return { success: false, error: 'REST-Konfiguration fehlt' };
      }
      
      try {
        const healthEndpoint = restConfig.endpoints?.health || '/health' || '/api/v1/health';
        const url = `${restConfig.baseUrl}${healthEndpoint}`;
        const headers = this.buildRESTHeaders(restConfig);
        
        const response = await axios.get(url, {
          headers,
          timeout: 5000
        });
        
        return {
          success: true,
          status: response.data.status,
          version: response.data.version,
          protocol: 'REST'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          protocol: 'REST'
        };
      }
    }
    
    return {
      success: false,
      error: `Test für Protokoll ${protocol} nicht implementiert`
    };
  }

  /**
   * Berechnet durchschnittliche Antwortzeit
   */
  calculateAverageResponseTime(currentAvg, totalSubmissions, newResponseTime) {
    if (totalSubmissions === 0) return newResponseTime;
    return ((currentAvg * totalSubmissions) + newResponseTime) / (totalSubmissions + 1);
  }

  /**
   * Cache leeren
   */
  clearCache() {
    this.configCache.clear();
  }
}

module.exports = new InsuranceConnector();
