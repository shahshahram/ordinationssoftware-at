// WAHonline-Connector für elektronische Meldung von Wahlarzt-Leistungen
// System der Österreichischen Ärztekammer

const axios = require('axios');
const https = require('https');
const fsSync = require('fs');
const wahonlineConfig = require('../../config/wahonline.config');
const wahonlineFormatGenerator = require('../wahonlineFormatGenerator');

class WAHonlineConnector {
  constructor() {
    this.config = wahonlineConfig.getActiveConfig();
    
    // HTTPS-Agent für API-Aufrufe (mit Zertifikaten falls vorhanden)
    this.httpsAgent = this.createHttpsAgent();
    
    // Axios-Instance mit Standard-Konfiguration
    this.axiosInstance = axios.create({
      baseURL: this.config.api.baseUrl,
      timeout: this.config.timeout.request,
      httpsAgent: this.httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }
  
  /**
   * Erstellt HTTPS-Agent mit Zertifikaten
   */
  createHttpsAgent() {
    if (!wahonlineConfig.hasCertificates()) {
      return new https.Agent({ rejectUnauthorized: true });
    }
    
    try {
      const cert = fsSync.readFileSync(wahonlineConfig.certificates.certPath);
      const key = fsSync.readFileSync(wahonlineConfig.certificates.keyPath);
      
      return new https.Agent({
        cert,
        key,
        rejectUnauthorized: true
      });
    } catch (error) {
      console.warn('⚠️ WAHonline-Zertifikate konnten nicht geladen werden:', error.message);
      return new https.Agent({ rejectUnauthorized: true });
    }
  }
  
  /**
   * Testet die Verbindung zur WAHonline-API
   * @param {string} environment - Umgebung (optional, verwendet config wenn nicht angegeben)
   * @returns {Promise<object>} Test-Ergebnis
   */
  async testConnection(environment = null) {
    try {
      const env = environment || this.config.environment;
      const testConfig = wahonlineConfig.getActiveConfig();
      
      if (!testConfig.api.enabled) {
        throw new Error(`WAHonline-API ist für Umgebung '${env}' nicht verfügbar`);
      }
      
      // Test-Endpoint aufrufen
      const response = await this.axiosInstance.get('/health', {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Chamber-Number': this.config.chamberNumber,
          'X-Doctor-Number': this.config.doctorNumber
        }
      });
      
      return {
        success: true,
        message: 'Verbindung zur WAHonline-API erfolgreich',
        environment: env,
        apiUrl: testConfig.api.baseUrl,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      // Simuliere erfolgreiche Verbindung im Test-Modus wenn API nicht konfiguriert
      if (process.env.NODE_ENV === 'development' && !this.config.apiKey) {
        return {
          success: true,
          message: 'Verbindungstest simuliert (WAHonline-API nicht konfiguriert)',
          environment: this.config.environment,
          apiUrl: this.config.api.baseUrl,
          simulated: true
        };
      }
      
      throw new Error(`Verbindungstest fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Sendet eine Wahlarzt-Meldung an WAHonline
   * @param {object} payload - Meldungsdaten (performance, patient, doctor)
   * @param {string} idempotencyKey - Idempotency-Key für Duplikatserkennung
   * @param {boolean} autoFormat - Automatisch WAHonline-Format generieren (default: true)
   * @returns {Promise<object>} WAHonline-Response
   */
  async send(payload, idempotencyKey, autoFormat = true) {
    try {
      // Validiere Konfiguration
      const validation = wahonlineConfig.validate();
      if (!validation.valid && process.env.NODE_ENV === 'production') {
        throw new Error(`WAHonline-Konfiguration ungültig: ${validation.errors.join(', ')}`);
      }
      
      let formattedPayload = payload;
      
      // Automatische Format-Generierung wenn aktiviert
      if (autoFormat) {
        try {
          formattedPayload = wahonlineFormatGenerator.generateMeldung(payload);
        } catch (formatError) {
          throw new Error(`Format-Generierung fehlgeschlagen: ${formatError.message}`);
        }
      }
      
      // Validiere Payload-Größe
      const payloadSize = JSON.stringify(formattedPayload).length;
      if (payloadSize > this.config.limits.maxPayloadSize) {
        throw new Error(`Payload zu groß: ${payloadSize} bytes (Limit: ${this.config.limits.maxPayloadSize} bytes)`);
      }
      
      // API-Aufruf mit Retry-Logik
      let lastError = null;
      for (let attempt = 1; attempt <= this.config.retry.maxAttempts; attempt++) {
        try {
          const response = await this.axiosInstance.post('/meldungen', formattedPayload, {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'X-Chamber-Number': this.config.chamberNumber,
              'X-Doctor-Number': this.config.doctorNumber,
              'X-Idempotency-Key': idempotencyKey,
              'X-Source': 'ordinationssoftware'
            }
          });
          
          return {
            success: true,
            message: 'Meldung erfolgreich an WAHonline übermittelt',
            wahonlineRef: response.data.referenceNumber || response.data.id,
            status: response.data.status || 'submitted',
            submittedAt: new Date().toISOString(),
            method: 'api',
            details: response.data
          };
        } catch (error) {
          lastError = error;
          
          // Wenn nicht der letzte Versuch, warte vor Retry
          if (attempt < this.config.retry.maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, this.config.retry.delay * attempt));
            continue;
          }
        }
      }
      
      // Alle Versuche fehlgeschlagen
      throw lastError;
      
    } catch (error) {
      // Simuliere erfolgreiche Übermittlung im Test-Modus wenn API nicht konfiguriert
      if (process.env.NODE_ENV === 'development' && !this.config.apiKey) {
        console.warn('⚠️ WAHonline-API nicht konfiguriert, simuliere erfolgreiche Übermittlung');
        return {
          success: true,
          message: 'Meldung simuliert (WAHonline-API nicht konfiguriert)',
          wahonlineRef: `SIM_${Date.now()}`,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
          method: 'api',
          simulated: true
        };
      }
      
      console.error('❌ WAHonline-Übermittlung fehlgeschlagen:', error.message);
      throw new Error(`WAHonline-Übermittlung fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Sendet eine Batch-Meldung (mehrere Leistungen)
   * @param {Array} performances - Array von Leistungen mit patient/doctor Daten
   * @param {string} batchId - Batch-ID für Duplikatserkennung
   * @returns {Promise<object>} WAHonline-Response
   */
  async sendBatch(performances, batchId) {
    try {
      // Validiere Batch-Größe
      if (performances.length > this.config.limits.maxBatchSize) {
        throw new Error(`Batch zu groß: ${performances.length} Leistungen (Limit: ${this.config.limits.maxBatchSize})`);
      }
      
      // Generiere Batch-Format
      const batchPayload = wahonlineFormatGenerator.generateBatchMeldung(performances);
      
      // API-Aufruf
      const response = await this.axiosInstance.post('/meldungen/batch', batchPayload, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Chamber-Number': this.config.chamberNumber,
          'X-Doctor-Number': this.config.doctorNumber,
          'X-Batch-Id': batchId,
          'X-Source': 'ordinationssoftware'
        }
      });
      
      return {
        success: true,
        message: `Batch-Meldung mit ${performances.length} Leistungen erfolgreich übermittelt`,
        wahonlineRef: response.data.batchReferenceNumber || response.data.id,
        status: response.data.status || 'submitted',
        submittedAt: new Date().toISOString(),
        method: 'api',
        batchSize: performances.length,
        details: response.data
      };
    } catch (error) {
      // Simuliere erfolgreiche Batch-Übermittlung im Test-Modus
      if (process.env.NODE_ENV === 'development' && !this.config.apiKey) {
        console.warn('⚠️ WAHonline-API nicht konfiguriert, simuliere erfolgreiche Batch-Übermittlung');
        return {
          success: true,
          message: `Batch-Meldung simuliert (${performances.length} Leistungen)`,
          wahonlineRef: `SIM_BATCH_${Date.now()}`,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
          method: 'api',
          batchSize: performances.length,
          simulated: true
        };
      }
      
      throw new Error(`WAHonline-Batch-Übermittlung fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Ruft den Status einer Meldung ab
   * @param {string} referenceNumber - WAHonline-Referenznummer
   * @returns {Promise<object>} Meldungsstatus
   */
  async getStatus(referenceNumber) {
    try {
      const response = await this.axiosInstance.get(`/meldungen/${referenceNumber}/status`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Chamber-Number': this.config.chamberNumber,
          'X-Doctor-Number': this.config.doctorNumber
        }
      });
      
      return {
        success: true,
        referenceNumber: referenceNumber,
        status: response.data.status,
        details: response.data
      };
    } catch (error) {
      // Simuliere Status-Abfrage im Test-Modus
      if (process.env.NODE_ENV === 'development' && !this.config.apiKey) {
        return {
          success: true,
          referenceNumber: referenceNumber,
          status: 'submitted',
          simulated: true
        };
      }
      
      throw new Error(`Status-Abfrage fehlgeschlagen: ${error.message}`);
    }
  }
}

module.exports = new WAHonlineConnector();



