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
      baseUrl: 'https://online-itu5test.elda.at/elda-online/servlet/WebTrans',
      enabled: true
    }
  },
  
  // API-Key für Webservice
  apiKey: process.env.ELDA_API_KEY || null,
  
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
    webservice: 30000 // 30 Sekunden
  },
  
  // Standard-Übertragungsmethode
  // 'ftps' = FTPS verwenden (aktuell)
  // 'webservice' = Webservice verwenden (ab 02.02.2026)
  // 'auto' = Automatisch wählen (Webservice wenn verfügbar, sonst FTPS)
  defaultMethod: process.env.ELDA_DEFAULT_METHOD || 'ftps',
  
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
      
      // Prüfe ob Webservice aktiviert ist
      if (wsConfig.enabled) {
        // Prüfe ob Produktivumgebung und Datum erreicht
        if (env === 'production') {
          const now = new Date();
          if (now >= wsConfig.activationDate) {
            return 'webservice';
          }
        } else {
          // Test/SIT: Webservice ist bereits verfügbar
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
    
    // Prüfe FTPS-Konfiguration wenn FTPS verwendet werden soll
    const method = config.defaultMethod;
    if (method === 'ftps' || method === 'auto') {
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
      
      if (!config.apiKey) {
        errors.push('ELDA API-Key fehlt (ELDA_API_KEY).');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

module.exports = eldaConfig;




