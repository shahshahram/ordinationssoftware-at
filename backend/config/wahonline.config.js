const fs = require('fs');
const path = require('path');

/**
 * WAHonline-Konfiguration
 * WAHonline = Wahlarzt-Abrechnung Online (System der Österreichischen Ärztekammer)
 */
const wahonlineConfig = {
  // Umgebung (production, test, sit)
  environment: process.env.WAHONLINE_ENVIRONMENT || 'test',
  
  // API-Konfiguration
  api: {
    production: {
      baseUrl: 'https://wahonline.aerztekammer.at/api/v1',
      enabled: true
    },
    test: {
      baseUrl: 'https://wahonline-test.aerztekammer.at/api/v1',
      enabled: true
    },
    sit: {
      // WAHonline wird über die SIT-Plattform der ÖGK getestet
      // Die SIT-Plattform stellt derzeit "nur" WAHonline-Meldungs-Test zur Verfügung
      baseUrl: 'https://online-itu5test.elda.at/elda-online/servlet/WebTrans', // SIT-Plattform der ÖGK
      enabled: true,
      note: 'WAHonline-Test über SIT-Plattform der ÖGK (ASWH)'
    }
  },
  
  // API-Key für Authentifizierung (nicht für SIT)
  apiKey: process.env.WAHONLINE_API_KEY || null,
  
  // SIT-Plattform Credentials (geteilt mit ELDA)
  sit: {
    seriennummer: process.env.WAHONLINE_SIT_SERIENNUMMER || process.env.ELDA_SIT_SERIENNUMMER || process.env.ELDA_SERIENNUMMER || null,
    passwort: process.env.WAHONLINE_SIT_PASSWORT || process.env.ELDA_SIT_PASSWORT || process.env.ELDA_PASSWORT || null,
    // SIT-Test-Vertragspartnernummer (Standard: 100014; ggf. ELDA-Support-Mail prüfen)
    vpnr: process.env.ELDA_SIT_VPNR || null,
    // SIT verwendet ELDA-Webservice statt REST API
    useELDAWebservice: true
  },
  
  // Zertifikate für Client-Authentifizierung
  certificates: {
    certPath: process.env.WAHONLINE_CERT_PATH || path.join(__dirname, '../certs/wahonline-client.crt'),
    keyPath: process.env.WAHONLINE_KEY_PATH || path.join(__dirname, '../certs/wahonline-client.key'),
    caPath: process.env.WAHONLINE_CA_PATH || null
  },
  
  // Kammer-Nummer (wird für Authentifizierung benötigt)
  chamberNumber: process.env.WAHONLINE_CHAMBER_NUMBER || null,
  
  // Arzt-Nummer (wird für Authentifizierung benötigt)
  doctorNumber: process.env.WAHONLINE_DOCTOR_NUMBER || null,
  
  // Timeout-Einstellungen
  timeout: {
    request: 30000, // 30 Sekunden
    connection: 10000 // 10 Sekunden
  },
  
  // Retry-Einstellungen
  retry: {
    maxAttempts: 3,
    delay: 1000 // 1 Sekunde zwischen Versuchen
  },
  
  // Dateigrößenlimits
  limits: {
    maxPayloadSize: 5 * 1024 * 1024, // 5 MB
    maxBatchSize: 100 // Max. 100 Leistungen pro Batch
  },
  
  /**
   * Gibt die aktive Konfiguration zurück
   */
  getActiveConfig() {
    const env = this.environment;
    
    return {
      environment: env,
      api: this.api[env],
      apiKey: this.apiKey,
      sit: this.sit,
      certificates: this.certificates,
      chamberNumber: this.chamberNumber,
      doctorNumber: this.doctorNumber,
      timeout: this.timeout,
      retry: this.retry,
      limits: this.limits
    };
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
    
    // Prüfe API-Konfiguration
    if (!config.api.enabled) {
      errors.push('WAHonline-API ist für diese Umgebung nicht verfügbar.');
    }
    
    // SIT-spezifische Validierung
    if (this.environment === 'sit') {
      // SIT verwendet ELDA-Webservice, benötigt Seriennummer/Passwort
      if (!this.sit.seriennummer || !this.sit.passwort) {
        errors.push('WAHonline-SIT benötigt Seriennummer und Passwort (WAHONLINE_SIT_SERIENNUMMER, WAHONLINE_SIT_PASSWORT oder ELDA_SIT_*).');
      }
    } else {
      // Test/Production: REST API mit API-Key, Kammer- und Arzt-Nummer
      if (!config.apiKey) {
        errors.push('WAHonline API-Key fehlt (WAHONLINE_API_KEY).');
      }
      
      if (!config.chamberNumber) {
        errors.push('Kammer-Nummer fehlt (WAHONLINE_CHAMBER_NUMBER).');
      }
      
      if (!config.doctorNumber) {
        errors.push('Arzt-Nummer fehlt (WAHONLINE_DOCTOR_NUMBER).');
      }
    }
    
    // Prüfe Zertifikate (optional, aber empfohlen)
    // Für SIT: Zertifikate nicht erforderlich (verwendet Basic Auth)
    if (!this.hasCertificates() && this.environment !== 'sit') {
      console.warn('⚠️ WAHonline-Zertifikate fehlen. Client-Authentifizierung wird möglicherweise nicht funktionieren.');
    } else if (!this.hasCertificates() && this.environment === 'sit') {
      // Für SIT: Zertifikate nicht erforderlich, nur bei Debug-Level loggen
      if (process.env.LOG_LEVEL === 'debug') {
        console.debug('ℹ️ WAHonline-Zertifikate nicht erforderlich für SIT (verwendet Basic Auth)');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

module.exports = wahonlineConfig;

