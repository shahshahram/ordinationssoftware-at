// ELDA-Konfiguration
// Elektronischer Datenaustausch mit österreichischen Sozialversicherungsträgern

const fs = require('fs');
const path = require('path');

const eldaConfig = {
  // Umgebung (production, test, sit)
  environment: process.env.ELDA_ENVIRONMENT || 'test',
  
  // FTPS-Konfiguration (aktuell verfügbar)
  ftps: {
    production: {
      host: 'ftps.elda.at',
      port: 21,
      enabled: true
    },
    test: {
      host: 'ftps-test.elda.at',
      port: 21,
      enabled: true
    },
    sit: {
      host: null, // FTPS wird von SIT nicht unterstützt
      port: null,
      enabled: false
    }
  },
  
  // Webservice-Konfiguration (ab 02.02.2026 produktiv)
  webservice: {
    production: {
      baseUrl: 'https://online.elda.at/elda-online/servlet/WebTrans',
      enabled: false, // Ab 02.02.2026 aktivieren
      activationDate: new Date('2026-02-02')
    },
    test: {
      baseUrl: 'https://online-test.elda.at/elda-online/servlet/WebTrans',
      enabled: true // Bereits verfügbar
    },
    sit: {
      // ELDA v4 TransferService (Vorgabe ELDA-Support)
      baseUrl: 'https://online-itu5test.elda.at/eldaws/transfer/v4/TransferService',
      enabled: true
    }
  },
  
  // API-Key für Webservice
  apiKey: process.env.ELDA_API_KEY || null,
  
  // SIT-Plattform Credentials (geteilt mit WAHonline) – v4 SendenRequest: absender, passwort, apiKey, inhalt
  sit: {
    seriennummer: process.env.ELDA_SIT_SERIENNUMMER || process.env.ELDA_SERIENNUMMER || null,
    passwort: process.env.ELDA_SIT_PASSWORT || process.env.ELDA_PASSWORT || null,
    apiKey: process.env.ELDA_SIT_API_KEY || process.env.ELDA_API_KEY || null,
    // SIT-Test-Vertragspartnernummer (Standard: 100014; ggf. ELDA-Support-Mail prüfen)
    vpnr: process.env.ELDA_SIT_VPNR || null
  },
  
  // FTPS-Zertifikate
  certificates: {
    certPath: process.env.ELDA_CERT_PATH || path.join(__dirname, '../certs/elda-client.crt'),
    keyPath: process.env.ELDA_KEY_PATH || path.join(__dirname, '../certs/elda-client.key'),
    caPath: process.env.ELDA_CA_PATH || null
  },
  
  // FTPS-Credentials
  credentials: {
    username: process.env.ELDA_FTPS_USERNAME || null,
    password: process.env.ELDA_FTPS_PASSWORD || null
  },
  
  // Dateigrößenlimits
  limits: {
    https: 40 * 1024 * 1024, // 40 MB
    ftps: 220 * 1024 * 1024  // 220 MB
  },
  
  // Timeout-Einstellungen
  timeout: {
    ftps: 60000, // 60 Sekunden
    webservice: 60000 // 60 Sekunden (erhöht für SIT, da Server möglicherweise langsamer antwortet)
  },
  
  // Standard-Übertragungsmethode
  // 'ftps' = FTPS verwenden (aktuell)
  // 'webservice' = Webservice verwenden (ab 02.02.2026)
  // 'auto' = Automatisch wählen (Webservice wenn verfügbar, sonst FTPS)
  // Für SIT: Automatisch 'webservice' (FTPS nicht verfügbar)
  defaultMethod: process.env.ELDA_DEFAULT_METHOD || (process.env.ELDA_ENVIRONMENT === 'sit' ? 'webservice' : 'ftps'),
  
  /**
   * Gibt die aktive Konfiguration zurück
   */
  getActiveConfig() {
    const env = this.environment;
    
    return {
      environment: env,
      ftps: this.ftps[env],
      webservice: this.webservice[env],
      apiKey: this.apiKey,
      sit: this.sit,
      certificates: this.certificates,
      credentials: this.credentials,
      limits: this.limits,
      timeout: this.timeout,
      defaultMethod: this.getDefaultMethod()
    };
  },
  
  /**
   * Bestimmt die Standard-Übertragungsmethode
   */
  getDefaultMethod() {
    const method = this.defaultMethod;
    
    if (method === 'auto') {
      // Automatisch wählen: Webservice wenn verfügbar und aktiviert, sonst FTPS
      const env = this.environment;
      const wsConfig = this.webservice[env];
      
      // SIT: Immer Webservice (FTPS nicht verfügbar)
      if (env === 'sit') {
        return 'webservice';
      }
      
      // Prüfe ob Webservice aktiviert ist
      if (wsConfig.enabled) {
        // Prüfe ob Produktivumgebung und Datum erreicht
        if (env === 'production') {
          const now = new Date();
          if (now >= wsConfig.activationDate) {
            return 'webservice';
          }
        } else {
          // Test: Webservice ist bereits verfügbar
          return 'webservice';
        }
      }
      
      // Fallback zu FTPS
      return 'ftps';
    }
    
    return method;
  },
  
  /**
   * Prüft ob Zertifikate vorhanden sind
   */
  hasCertificates() {
    try {
      const certExists = fs.existsSync(this.certificates.certPath);
      const keyExists = fs.existsSync(this.certificates.keyPath);
      return certExists && keyExists;
    } catch (error) {
      return false;
    }
  },
  
  /**
   * Validiert die Konfiguration
   */
  validate() {
    const errors = [];
    const config = this.getActiveConfig();
    
    // Prüfe Umgebung
    if (!['production', 'test', 'sit'].includes(this.environment)) {
      errors.push('Ungültige Umgebung. Muss production, test oder sit sein.');
    }
    
    // Prüfe Standard-Methode
    if (!['ftps', 'webservice', 'auto'].includes(this.defaultMethod)) {
      errors.push('Ungültige Standard-Methode. Muss ftps, webservice oder auto sein.');
    }
    
    // SIT-spezifische Validierung
    if (this.environment === 'sit') {
      // FTPS wird von SIT nicht unterstützt
      if (this.defaultMethod === 'ftps') {
        errors.push('FTPS wird von der SIT-Plattform nicht unterstützt. Bitte verwenden Sie "webservice" oder "auto".');
      }
      
      // SIT benötigt Seriennummer und Passwort
      if (!this.sit.seriennummer) {
        errors.push('ELDA-Seriennummer für SIT fehlt (ELDA_SIT_SERIENNUMMER oder ELDA_SERIENNUMMER).');
      }
      
      if (!this.sit.passwort) {
        errors.push('ELDA-Passwort für SIT fehlt (ELDA_SIT_PASSWORT oder ELDA_PASSWORT).');
      }
    }
    
    // Prüfe FTPS-Konfiguration wenn FTPS verwendet werden soll
    const method = config.defaultMethod;
    if (method === 'ftps' || (method === 'auto' && this.environment !== 'sit')) {
      if (!config.ftps.enabled) {
        errors.push('FTPS ist für diese Umgebung nicht verfügbar.');
      }
      
      if (!config.credentials.username || !config.credentials.password) {
        errors.push('FTPS-Credentials fehlen (ELDA_FTPS_USERNAME, ELDA_FTPS_PASSWORD).');
      }
      
      if (!this.hasCertificates()) {
        errors.push('FTPS-Zertifikate fehlen. Bitte Zertifikate in backend/certs/ ablegen.');
      }
    }
    
    // Prüfe Webservice-Konfiguration wenn Webservice verwendet werden soll
    if (method === 'webservice' || method === 'auto') {
      if (!config.webservice.enabled) {
        errors.push('Webservice ist für diese Umgebung nicht verfügbar.');
      }
      
      // Für SIT (v4): Seriennummer, Passwort und API-Key für SendenRequest
      if (this.environment === 'sit') {
        if (!this.sit.seriennummer || !this.sit.passwort) {
          errors.push('SIT-Plattform benötigt Seriennummer und Passwort (ELDA_SIT_SERIENNUMMER, ELDA_SIT_PASSWORT).');
        }
        const sitApiKey = this.sit.apiKey != null ? this.sit.apiKey : this.apiKey;
        if (!sitApiKey) {
          errors.push('SIT v4 benötigt API-Key (ELDA_SIT_API_KEY oder ELDA_API_KEY).');
        }
      } else {
        // Für Test/Production: API-Key
        if (!config.apiKey) {
          errors.push('ELDA API-Key fehlt (ELDA_API_KEY).');
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

module.exports = eldaConfig;




