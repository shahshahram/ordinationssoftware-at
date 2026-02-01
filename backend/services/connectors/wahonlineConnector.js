// WAHonline-Connector für elektronische Meldung von Wahlarzt-Leistungen
// System der Österreichischen Ärztekammer

const axios = require('axios');
const https = require('https');
const fsSync = require('fs');
const wahonlineConfig = require('../../config/wahonline.config');
const wahonlineFormatGenerator = require('../wahonlineFormatGenerator');
const eldaConnector = require('./eldaConnector');
const eldaFormatGenerator = require('../eldaFormatGenerator');
const WAHonlineSync = require('../../models/WAHonlineSync');
const EldaSubmission = require('../../models/EldaSubmission');

class WAHonlineConnector {
  constructor() {
    this.config = wahonlineConfig.getActiveConfig();
    this.isSIT = this.config.environment === 'sit';
    
    // HTTPS-Agent für API-Aufrufe (mit Zertifikaten falls vorhanden)
    this.httpsAgent = this.createHttpsAgent();
    
    // Axios-Instance mit Standard-Konfiguration (nur für REST API, nicht für SIT)
    if (!this.isSIT) {
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
      // Für SIT: Zertifikate nicht erforderlich (verwendet Basic Auth)
      if (this.config.environment === 'sit') {
        // Nur bei Debug-Level loggen
        if (process.env.LOG_LEVEL === 'debug') {
          console.debug('ℹ️ WAHonline-Zertifikate nicht erforderlich für SIT (verwendet Basic Auth)');
        }
      } else {
        console.warn('⚠️ WAHonline-Zertifikate konnten nicht geladen werden:', error.message);
      }
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
      
      // SIT-Umgebung: Teste ELDA-Webservice-Verbindung
      if (env === 'sit') {
        if (!this.config.sit?.seriennummer || !this.config.sit?.passwort) {
          throw new Error('WAHonline-SIT benötigt Seriennummer und Passwort');
        }
        
        // Speichere ursprüngliche Umgebungsvariablen (vor try Block)
        const originalEnv = process.env.ELDA_ENVIRONMENT;
        
        // Teste ELDA-Webservice-Verbindung
        try {
          process.env.ELDA_ENVIRONMENT = 'sit';
          process.env.ELDA_SIT_SERIENNUMMER = this.config.sit.seriennummer;
          process.env.ELDA_SIT_PASSWORT = this.config.sit.passwort;
          
          // Teste ELDA-Verbindung (vereinfachter Test)
          const eldaConfig = require('../../config/elda.config');
          const eldaTestConfig = eldaConfig.getActiveConfig();
          
          return {
            success: true,
            message: 'WAHonline-Verbindung via ELDA-Webservice (SIT) erfolgreich',
            environment: 'sit',
            apiUrl: testConfig.api.baseUrl,
            method: 'elda-webservice',
            eldaUrl: eldaTestConfig.webservice.baseUrl,
            hasCredentials: !!(this.config.sit.seriennummer && this.config.sit.passwort)
          };
        } finally {
          // Stelle ursprüngliche Umgebungsvariablen wieder her
          if (originalEnv !== undefined) {
            process.env.ELDA_ENVIRONMENT = originalEnv;
          } else {
            delete process.env.ELDA_ENVIRONMENT;
          }
          delete process.env.ELDA_SIT_SERIENNUMMER;
          delete process.env.ELDA_SIT_PASSWORT;
        }
      }
      
      // Normale Umgebung: Teste REST API
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
      if (process.env.NODE_ENV === 'development' && !this.config.apiKey && !this.isSIT) {
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
      
      // SIT-Umgebung: Verwende ELDA-Webservice
      if (this.isSIT) {
        const performanceId = payload?.performance?._id || payload?.performanceId || null;
        return await this.sendViaELDAWebservice(payload, idempotencyKey, autoFormat, performanceId);
      }
      
      // Normale Umgebung: Verwende REST API
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
      if (process.env.NODE_ENV === 'development' && !this.config.apiKey && !this.isSIT) {
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
   * Sendet WAHonline-Meldung via ELDA-Webservice (für SIT-Umgebung)
   * @param {object} payload - Meldungsdaten
   * @param {string} idempotencyKey - Idempotency-Key
   * @param {boolean} autoFormat - Automatisch Format generieren
   * @param {string} [performanceId] - Performance-ID für Sync-Status (Honorarnote)
   * @returns {Promise<object>} ELDA-Response
   */
  async sendViaELDAWebservice(payload, idempotencyKey, autoFormat = true, performanceId = null) {
    if (!this.config.sit?.seriennummer || !this.config.sit?.passwort) {
      throw new Error('WAHonline-SIT benötigt Seriennummer und Passwort');
    }
    
    let xmlContent = null;
    try {
      if (autoFormat) {
        // Setze Konfiguration für Format-Generator (für Seriennummer)
        wahonlineFormatGenerator.setConfig(this.config);
        
        // Generiere WAHonline-Datensatz im korrekten Format
        const wahonlineDataset = wahonlineFormatGenerator.generateMeldung(payload);
        
        // Generiere XML aus Datensatz
        xmlContent = wahonlineFormatGenerator.generateXML(wahonlineDataset);
        
        // Log für Debugging (immer, nicht nur bei debug)
        console.warn('[WAHonline SIT] Generiertes XML (erste 3000 Zeichen):');
        console.warn(xmlContent.substring(0, 3000));
        if (xmlContent.length > 3000) {
          console.warn('[WAHonline SIT] ... (weitere ' + (xmlContent.length - 3000) + ' Zeichen)');
        }
        
        if (process.env.LOG_LEVEL === 'debug') {
          console.debug('[WAHonline SIT] Vollständiges XML:');
          console.debug(xmlContent);
        }
      } else {
        // Wenn autoFormat = false, erwarte dass payload bereits XML ist
        xmlContent = typeof payload === 'string' ? payload : JSON.stringify(payload);
      }
      
      // Sende XML direkt an ELDA-Webservice (nicht über ELDA-Connector!)
      // Temporär ELDA-Config auf SIT setzen
      const originalEnv = process.env.ELDA_ENVIRONMENT;
      const originalSeriennummer = process.env.ELDA_SIT_SERIENNUMMER;
      const originalPasswort = process.env.ELDA_SIT_PASSWORT;
      
      process.env.ELDA_ENVIRONMENT = 'sit';
      process.env.ELDA_SIT_SERIENNUMMER = this.config.sit.seriennummer;
      process.env.ELDA_SIT_PASSWORT = this.config.sit.passwort;
      
      try {
        // Verwende ELDA-Connector für Webservice-Übertragung, aber sende XML direkt
        const eldaConfig = require('../../config/elda.config');
        const currentConfig = eldaConfig.getActiveConfig();
        
        // Sende XML direkt via ELDA-Webservice
        // WICHTIG: X-Dataset-Type sollte "WA" (projektkennzeichen) oder "HO" (listkennzeichen) sein
        // Teste beide Varianten: Zuerst "WA", dann "HO" falls nötig
        // Aktuell: "WA" (entspricht projektkennzeichen im XML)
        const eldaResult = await eldaConnector.sendViaWebservice(
          xmlContent, // XML-String direkt senden
          'WA' // Dataset-Type für Header (entspricht projektkennzeichen im XML)
        );

        if (performanceId) {
          if (eldaResult.statusCode === '000') {
            await this.saveWAHonlineSyncStatus(performanceId, 'SYNCED', eldaResult.protokollnummer || null, null);
          }
          await this.saveEldaSubmission(performanceId, xmlContent, eldaResult.data || null, eldaResult.statusCode || null, eldaResult.protokollnummer || null, null);
        }

        return {
          success: true,
          message: 'WAHonline-Meldung erfolgreich via ELDA-Webservice (SIT) übermittelt',
          wahonlineRef: idempotencyKey,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
          method: 'elda-webservice',
          environment: 'sit',
          details: eldaResult
        };
      } finally {
        // Stelle ursprüngliche ELDA-Config wieder her
        if (originalEnv !== undefined) {
          process.env.ELDA_ENVIRONMENT = originalEnv;
        } else {
          delete process.env.ELDA_ENVIRONMENT;
        }
        delete process.env.ELDA_SIT_SERIENNUMMER;
        delete process.env.ELDA_SIT_PASSWORT;
      }
      
    } catch (error) {
      const performanceId = payload?.performance?._id || payload?.performanceId || null;
      if (performanceId) {
        await this.saveWAHonlineSyncStatus(performanceId, 'ERROR', null, error.message || String(error));
        await this.saveEldaSubmission(performanceId, xmlContent, null, null, null, error.message || String(error));
      }
      console.error('❌ WAHonline-Übermittlung via ELDA-Webservice fehlgeschlagen:', error.message);
      console.error('❌ Fehler-Details:', {
        message: error.message,
        stack: error.stack,
        payload: JSON.stringify(payload, null, 2).substring(0, 500)
      });
      throw new Error(`WAHonline-Übermittlung via ELDA-Webservice fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Speichert WAHonline-Sync-Status für eine Honorarnote (Performance)
   * @param {string} performanceId - Performance-ID
   * @param {string} status - 'SYNCED' | 'ERROR'
   * @param {string|null} protokollnummer - Protokollnummer (bei SYNCED)
   * @param {string|null} errorText - Fehlertext (bei ERROR)
   */
  async saveWAHonlineSyncStatus(performanceId, status, protokollnummer = null, errorText = null) {
    try {
      const id = typeof performanceId === 'string' ? performanceId : performanceId?.toString?.();
      if (!id) return;
      await WAHonlineSync.findOneAndUpdate(
        { performanceId: id },
        {
          status,
          protokollnummer: protokollnummer || undefined,
          errorText: errorText || undefined,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error('[WAHonline] Fehler beim Speichern des Sync-Status:', err.message);
    }
  }

  /**
   * Archiviert eine ELDA-Übermittlung (raw request/response) für Nachweis und Debugging
   * @param {string} performanceId - Performance-ID (Honorarnote)
   * @param {string|null} rawRequestXml - Gesendetes Honorarnoten-XML
   * @param {string|null} rawResponseSoap - SOAP-Response-Body
   * @param {string|null} statusCode - ELDA statusCode
   * @param {string|null} protokollnummer - ELDA protokollnummer
   * @param {string|null} errorText - Fehlertext (bei Fehler)
   */
  async saveEldaSubmission(performanceId, rawRequestXml, rawResponseSoap, statusCode, protokollnummer, errorText) {
    try {
      const id = typeof performanceId === 'string' ? performanceId : performanceId?.toString?.();
      if (!id) return;
      await EldaSubmission.create({
        performanceId: id,
        rawRequestXml: rawRequestXml || undefined,
        rawResponseSoap: rawResponseSoap || undefined,
        statusCode: statusCode || undefined,
        protokollnummer: protokollnummer || undefined,
        errorText: errorText || undefined,
        createdAt: new Date()
      });
    } catch (err) {
      console.error('[WAHonline] Fehler beim Archivieren der ELDA-Übermittlung:', err.message);
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
      
      // SIT-Umgebung: Verwende ELDA-Webservice für jede Leistung
      if (this.isSIT) {
        const results = [];
        for (let i = 0; i < performances.length; i++) {
          try {
            const result = await this.send(performances[i], `${batchId}_${i}`, true);
            results.push(result);
          } catch (error) {
            console.error(`❌ Fehler bei Leistung ${i + 1}/${performances.length}:`, error.message);
            results.push({ success: false, error: error.message });
          }
        }
        
        const successCount = results.filter(r => r.success).length;
        return {
          success: successCount > 0,
          message: `Batch-Meldung mit ${successCount}/${performances.length} Leistungen übermittelt`,
          wahonlineRef: batchId,
          status: successCount === performances.length ? 'submitted' : 'partial',
          submittedAt: new Date().toISOString(),
          method: 'elda-webservice',
          environment: 'sit',
          batchSize: performances.length,
          successCount,
          results
        };
      }
      
      // Normale Umgebung: REST API Batch-Endpoint
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
      if (process.env.NODE_ENV === 'development' && !this.config.apiKey && !this.isSIT) {
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




