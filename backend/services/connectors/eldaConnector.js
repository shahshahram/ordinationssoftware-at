// ELDA-Connector für elektronischen Datenaustausch mit österreichischen Sozialversicherungsträgern
// Unterstützt FTPS (aktuell) und Webservice (ab 02.02.2026)

const axios = require('axios');
const ftp = require('basic-ftp');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const https = require('https');
const eldaConfig = require('../../config/elda.config');
const eldaFormatGenerator = require('../eldaFormatGenerator');

class ELDAConnector {
  constructor() {
    this.config = eldaConfig.getActiveConfig();
    this.method = this.config.defaultMethod;
    
    // HTTPS-Agent für Webservice (mit Zertifikaten falls vorhanden)
    this.httpsAgent = this.createHttpsAgent();
  }
  
  /**
   * Erstellt HTTPS-Agent mit Zertifikaten
   */
  createHttpsAgent() {
    if (!eldaConfig.hasCertificates()) {
      return new https.Agent({ rejectUnauthorized: true });
    }
    
    try {
      const cert = fsSync.readFileSync(eldaConfig.certificates.certPath);
      const key = fsSync.readFileSync(eldaConfig.certificates.keyPath);
      
      return new https.Agent({
        cert,
        key,
        rejectUnauthorized: true
      });
    } catch (error) {
      console.warn('⚠️ ELDA-Zertifikate konnten nicht geladen werden:', error.message);
      return new https.Agent({ rejectUnauthorized: true });
    }
  }
  
  /**
   * Sendet Daten an ELDA
   * @param {object} payload - ELDA-Datensatz (roh oder bereits formatiert)
   * @param {string} datasetType - Datensatztyp (z.B. 'KSB', 'Lohnmeldung', 'Abrechnung')
   * @param {string} method - Übertragungsmethode ('ftps' oder 'webservice'), optional
   * @param {boolean} autoFormat - Automatisch ELDA-Format generieren (default: true)
   * @returns {Promise<object>} ELDA-Response
   */
  async send(payload, datasetType, method = null, autoFormat = true) {
    const transferMethod = method || this.method;
    
    try {
      let formattedPayload = payload;
      
      // Automatische Format-Generierung wenn aktiviert
      if (autoFormat) {
        // Validiere Datensatz
        const validation = eldaFormatGenerator.validateDataset(payload, datasetType);
        if (!validation.valid) {
          throw new Error(`Datensatz-Validierung fehlgeschlagen: ${validation.errors.join(', ')}`);
        }
        
        // Generiere ELDA-Format
        switch (datasetType.toUpperCase()) {
          case 'KSB':
            formattedPayload = eldaFormatGenerator.generateKSB(payload);
            break;
          case 'LOHNMEDLUNG':
            formattedPayload = eldaFormatGenerator.generateLohnmeldung(payload);
            break;
          case 'ABRECHNUNG':
            formattedPayload = eldaFormatGenerator.generateAbrechnung(payload);
            break;
          default:
            // Verwende Payload wie übergeben
            formattedPayload = payload;
        }
      }
      
      // Validiere Payload-Größe
      const payloadSize = JSON.stringify(formattedPayload).length;
      const limit = transferMethod === 'ftps' 
        ? this.config.limits.ftps 
        : this.config.limits.https;
      
      if (payloadSize > limit) {
        throw new Error(`Payload zu groß: ${payloadSize} bytes (Limit: ${limit} bytes)`);
      }
      
      // Wähle Übertragungsmethode
      if (transferMethod === 'webservice') {
        return await this.sendViaWebservice(formattedPayload, datasetType);
      } else {
        return await this.sendViaFTPS(formattedPayload, datasetType);
      }
    } catch (error) {
      console.error('ELDA-Connector Fehler:', error);
      throw new Error(`ELDA-Übertragung fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Sendet Daten via FTPS
   */
  async sendViaFTPS(payload, datasetType) {
    if (!this.config.ftps.enabled) {
      throw new Error('FTPS ist für diese Umgebung nicht verfügbar');
    }
    
    const client = new ftp.Client(this.config.timeout.ftps);
    let tempFilePath = null;
    
    try {
      // Erstelle temporäre Datei
      const fileName = this.generateFileName(datasetType);
      tempFilePath = path.join(__dirname, '../../temp', fileName);
      
      // Stelle sicher, dass temp-Verzeichnis existiert
      const tempDir = path.dirname(tempFilePath);
      await fs.mkdir(tempDir, { recursive: true });
      
      // Schreibe Payload in Datei (XML-Format)
      const xmlContent = this.convertToXML(payload, datasetType);
      await fs.writeFile(tempFilePath, xmlContent, 'utf8');
      
      // Prüfe Dateigröße
      const stats = await fs.stat(tempFilePath);
      if (stats.size > this.config.limits.ftps) {
        throw new Error(`Datei zu groß: ${stats.size} bytes (Limit: ${this.config.limits.ftps} bytes)`);
      }
      
      // Verbinde mit FTPS-Server
      await client.access({
        host: this.config.ftps.host,
        port: this.config.ftps.port,
        user: this.config.credentials.username,
        password: this.config.credentials.password,
        secure: true,
        secureOptions: {
          rejectUnauthorized: true
        }
      });
      
      // Lade Datei hoch
      await client.uploadFrom(tempFilePath, fileName);
      
      // Schließe Verbindung
      client.close();
      
      // Lösche temporäre Datei
      await fs.unlink(tempFilePath);
      
      return {
        success: true,
        method: 'ftps',
        fileName,
        message: 'Daten erfolgreich via FTPS übertragen',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      // Lösche temporäre Datei bei Fehler
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (unlinkError) {
          console.warn('Fehler beim Löschen der temporären Datei:', unlinkError);
        }
      }
      
      // Schließe Verbindung bei Fehler
      try {
        client.close();
      } catch (closeError) {
        // Ignoriere Fehler beim Schließen
      }
      
      throw error;
    }
  }
  
  /**
   * Sendet Daten via Webservice
   */
  async sendViaWebservice(payload, datasetType) {
    if (!this.config.webservice.enabled) {
      throw new Error('Webservice ist für diese Umgebung nicht verfügbar');
    }
    
    if (!this.config.apiKey) {
      throw new Error('ELDA API-Key fehlt');
    }
    
    try {
      // Konvertiere Payload zu XML
      const xmlContent = this.convertToXML(payload, datasetType);
      
      // Sende via HTTPS
      const response = await axios.post(
        this.config.webservice.baseUrl,
        xmlContent,
        {
          headers: {
            'Content-Type': 'application/xml; charset=UTF-8',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'X-Dataset-Type': datasetType
          },
          timeout: this.config.timeout.webservice,
          httpsAgent: this.httpsAgent,
          maxContentLength: this.config.limits.https,
          maxBodyLength: this.config.limits.https
        }
      );
      
      return {
        success: true,
        method: 'webservice',
        status: response.status,
        data: response.data,
        message: 'Daten erfolgreich via Webservice übertragen',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      if (error.response) {
        throw new Error(`ELDA-Webservice Fehler: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Keine Antwort vom ELDA-Webservice');
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Generiert Dateinamen für FTPS-Übertragung
   */
  generateFileName(datasetType) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `ELDA_${datasetType}_${timestamp}.xml`;
  }
  
  /**
   * Konvertiert Payload zu XML-Format
   * Verwendet ELDA-Format-Generator für korrekte XML-Generierung
   */
  convertToXML(payload, datasetType) {
    return eldaFormatGenerator.generateXML(payload, datasetType);
  }
  
  /**
   * Konvertiert Objekt zu XML-Elementen (vereinfacht)
   */
  objectToXML(obj, indent = 2) {
    const spaces = ' '.repeat(indent);
    const lines = [];
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        continue;
      }
      
      if (Array.isArray(value)) {
        value.forEach(item => {
          lines.push(`${spaces}<${key}>`);
          if (typeof item === 'object') {
            lines.push(this.objectToXML(item, indent + 2));
          } else {
            lines.push(`${spaces}  ${this.escapeXML(String(item))}`);
          }
          lines.push(`${spaces}</${key}>`);
        });
      } else if (typeof value === 'object') {
        lines.push(`${spaces}<${key}>`);
        lines.push(this.objectToXML(value, indent + 2));
        lines.push(`${spaces}</${key}>`);
      } else {
        lines.push(`${spaces}<${key}>${this.escapeXML(String(value))}</${key}>`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Escaped XML-Sonderzeichen
   */
  escapeXML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  /**
   * Testet die Verbindung
   */
  async testConnection(method = null) {
    const testMethod = method || this.method;
    
    try {
      if (testMethod === 'webservice') {
        return await this.testWebserviceConnection();
      } else {
        return await this.testFTPSConnection();
      }
    } catch (error) {
      return {
        success: false,
        method: testMethod,
        error: error.message
      };
    }
  }
  
  /**
   * Testet FTPS-Verbindung
   */
  async testFTPSConnection() {
    const client = new ftp.Client(this.config.timeout.ftps);
    
    try {
      await client.access({
        host: this.config.ftps.host,
        port: this.config.ftps.port,
        user: this.config.credentials.username,
        password: this.config.credentials.password,
        secure: true,
        secureOptions: {
          rejectUnauthorized: true
        }
      });
      
      client.close();
      
      return {
        success: true,
        method: 'ftps',
        message: 'FTPS-Verbindung erfolgreich'
      };
    } catch (error) {
      try {
        client.close();
      } catch (closeError) {
        // Ignoriere Fehler beim Schließen
      }
      
      throw error;
    }
  }
  
  /**
   * Testet Webservice-Verbindung
   */
  async testWebserviceConnection() {
    try {
      // Sende Test-Request
      const response = await axios.get(
        this.config.webservice.baseUrl.replace('/servlet/WebTrans', '/status'),
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          timeout: this.config.timeout.webservice,
          httpsAgent: this.httpsAgent
        }
      );
      
      return {
        success: true,
        method: 'webservice',
        status: response.status,
        message: 'Webservice-Verbindung erfolgreich'
      };
    } catch (error) {
      // Falls Status-Endpunkt nicht existiert, versuche Haupt-Endpunkt
      try {
        await axios.post(
          this.config.webservice.baseUrl,
          '<?xml version="1.0"?><test/>',
          {
            headers: {
              'Content-Type': 'application/xml',
              'Authorization': `Bearer ${this.config.apiKey}`
            },
            timeout: this.config.timeout.webservice,
            httpsAgent: this.httpsAgent,
            validateStatus: () => true // Akzeptiere alle Status-Codes
          }
        );
        
        return {
          success: true,
          method: 'webservice',
          message: 'Webservice-Endpunkt erreichbar'
        };
      } catch (testError) {
        throw new Error(`Webservice-Verbindung fehlgeschlagen: ${testError.message}`);
      }
    }
  }
  
  /**
   * Gibt verfügbare Übertragungsmethoden zurück
   */
  getAvailableMethods() {
    const methods = [];
    
    if (this.config.ftps.enabled) {
      methods.push('ftps');
    }
    
    if (this.config.webservice.enabled) {
      // Prüfe ob Produktivumgebung und Datum erreicht
      if (this.config.environment === 'production') {
        const now = new Date();
        if (now >= this.config.webservice.activationDate) {
          methods.push('webservice');
        }
      } else {
        // Test/SIT: Webservice ist bereits verfügbar
        methods.push('webservice');
      }
    }
    
    return methods;
  }
}

module.exports = new ELDAConnector();

