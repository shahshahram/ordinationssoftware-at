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
  
  // API-Key für Authentifizierung
  apiKey: process.env.WAHONLINE_API_KEY || null,
  
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
    
    // Prüfe API-Key
    if (!config.apiKey) {
      errors.push('WAHonline API-Key fehlt (WAHONLINE_API_KEY).');
    }
    
    // Prüfe Kammer-Nummer
    if (!config.chamberNumber) {
      errors.push('Kammer-Nummer fehlt (WAHONLINE_CHAMBER_NUMBER).');
    }
    
    // Prüfe Arzt-Nummer
    if (!config.doctorNumber) {
      errors.push('Arzt-Nummer fehlt (WAHONLINE_DOCTOR_NUMBER).');
    }
    
    // Prüfe Zertifikate (optional, aber empfohlen)
    if (!this.hasCertificates()) {
      console.warn('⚠️ WAHonline-Zertifikate fehlen. Client-Authentifizierung wird möglicherweise nicht funktionieren.');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

module.exports = wahonlineConfig;

