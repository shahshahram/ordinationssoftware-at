// WAHonline-Connector für elektronische Meldung von Wahlarzt-Leistungen
// System der Österreichischen Ärztekammer

const axios = require('axios');
const https = require('https');
const fsSync = require('fs');
const wahonlineConfig = require('../../config/wahonline.config');
const wahonlineFormatGenerator = require('../wahonlineFormatGenerator');
const eldaConnector = require('./eldaConnector');

class WAHonlineConnector {
  constructor() {
    this.config = wahonlineConfig.getActiveConfig();
    this.isSIT = this.config.environment === 'sit';

    // HTTPS-Agent für API-Aufrufe (mit Zertifikaten falls vorhanden)
    this.httpsAgent = this.createHttpsAgent();

    // Axios-Instance mit Standard-Konfiguration (nur für REST API, nicht für SIT)
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
      // Config bei jedem Aufruf neu lesen (process.env z. B. ELDA_ENVIRONMENT=sit)
      this.config = wahonlineConfig.getActiveConfig();
      this.isSIT = this.config.environment === 'sit';

      // Validiere Konfiguration
      const validation = wahonlineConfig.validate();
      if (!validation.valid && process.env.NODE_ENV === 'production') {
        throw new Error(`WAHonline-Konfiguration ungültig: ${validation.errors.join(', ')}`);
      }

      // SIT-Umgebung: ELDA-Webservice statt REST API (keine Simulation)
      if (this.isSIT) {
        const performanceId = payload?.performance?._id || payload?.performanceId || null;
        return await this.sendViaELDAWebservice(payload, idempotencyKey, autoFormat, performanceId);
      }

      let formattedPayload = payload;

      // Automatische Format-Generierung wenn aktiviert (REST-Pfad: Objekt für JSON-API)
      if (autoFormat) {
        try {
          formattedPayload = wahonlineFormatGenerator.generateMeldung(payload);
        } catch (formatError) {
          throw new Error(`Format-Generierung fehlgeschlagen: ${formatError.message}`);
        }
      }

      // Validiere Payload-Größe (bei REST: formattedPayload kann XML-String sein, Länge prüfen)
      const payloadSize = typeof formattedPayload === 'string' ? formattedPayload.length : JSON.stringify(formattedPayload).length;
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
      const errMsg = error?.message || String(error);
      const isEldaError = errMsg.includes('ELDA') || errMsg.includes('elda-webservice');
      // SIT/ELDA-Pfad: Nie simulieren – echten Fehler zurückgeben
      if (this.isSIT || isEldaError) {
        console.error('❌ WAHonline-Übermittlung via ELDA fehlgeschlagen:', errMsg);
        throw new Error(`WAHonline-Übermittlung fehlgeschlagen: ${errMsg}`);
      }
      // Simuliere erfolgreiche Übermittlung im Test-Modus wenn REST-API nicht konfiguriert
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
   * Sendet WAHonline-Meldung via ELDA-Webservice (SIT-Umgebung)
   * @param {object} payload - Meldungsdaten (performance, patient, doctor)
   * @param {string} idempotencyKey - Idempotency-Key
   * @param {boolean} autoFormat - Automatisch Format generieren
   * @param {string|null} performanceId - Performance-ID für Sync-Status (optional)
   * @returns {Promise<object>} ELDA-Response
   */
  async sendViaELDAWebservice(payload, idempotencyKey, autoFormat = true, performanceId = null) {
    if (!this.config.sit?.seriennummer || !this.config.sit?.passwort) {
      throw new Error('WAHonline-SIT benötigt Seriennummer und Passwort (WAHONLINE_SIT_SERIENNUMMER, WAHONLINE_SIT_PASSWORT oder ELDA_SIT_*)');
    }

    let xmlContent = null;
    try {
      if (autoFormat) {
        wahonlineFormatGenerator.setConfig(this.config);
        const dataset = wahonlineFormatGenerator.generateMeldung(payload);
        xmlContent = typeof dataset === 'string' ? dataset : wahonlineFormatGenerator.generateXML(dataset);
      } else {
        xmlContent = typeof payload === 'string' ? payload : JSON.stringify(payload);
      }

      const originalEnv = process.env.ELDA_ENVIRONMENT;
      const originalSeriennummer = process.env.ELDA_SIT_SERIENNUMMER;
      const originalPasswort = process.env.ELDA_SIT_PASSWORT;

      process.env.ELDA_ENVIRONMENT = 'sit';
      process.env.ELDA_SIT_SERIENNUMMER = this.config.sit.seriennummer;
      process.env.ELDA_SIT_PASSWORT = this.config.sit.passwort;

      try {
        const eldaResult = await eldaConnector.sendViaWebservice(xmlContent, 'WA');
        return {
          success: true,
          message: 'WAHonline-Meldung erfolgreich via ELDA-Webservice (SIT) übermittelt',
          wahonlineRef: eldaResult.protokollnummer || idempotencyKey,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
          method: 'elda-webservice',
          environment: 'sit',
          details: eldaResult
        };
      } finally {
        if (originalEnv !== undefined) process.env.ELDA_ENVIRONMENT = originalEnv;
        else delete process.env.ELDA_ENVIRONMENT;
        if (originalSeriennummer !== undefined) process.env.ELDA_SIT_SERIENNUMMER = originalSeriennummer;
        else delete process.env.ELDA_SIT_SERIENNUMMER;
        if (originalPasswort !== undefined) process.env.ELDA_SIT_PASSWORT = originalPasswort;
        else delete process.env.ELDA_SIT_PASSWORT;
      }
    } catch (error) {
      console.error('❌ WAHonline-Übermittlung via ELDA-Webservice fehlgeschlagen:', error.message);
      throw new Error(`WAHonline-Übermittlung via ELDA-Webservice fehlgeschlagen: ${error.message}`);
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



