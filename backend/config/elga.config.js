// ELGA-Konfiguration
// Diese Datei enthält die Konfiguration für die ELGA-Integration

module.exports = {
  // API-Endpunkte
  api: {
    // Test-Umgebung
    test: {
      baseUrl: process.env.ELGA_TEST_API_URL || 'https://test.elga.gv.at/api',
      clientId: process.env.ELGA_TEST_CLIENT_ID || '',
      clientSecret: process.env.ELGA_TEST_CLIENT_SECRET || '',
      redirectUri: process.env.ELGA_TEST_REDIRECT_URI || 'http://localhost:5001/api/elga/callback'
    },
    
    // Produktions-Umgebung
    production: {
      baseUrl: process.env.ELGA_PROD_API_URL || 'https://elga.gv.at/api',
      clientId: process.env.ELGA_PROD_CLIENT_ID || '',
      clientSecret: process.env.ELGA_PROD_CLIENT_SECRET || '',
      redirectUri: process.env.ELGA_PROD_REDIRECT_URI || ''
    }
  },
  
  // Zertifikate
  certificates: {
    // Pfad zu den Zertifikaten
    clientCert: process.env.ELGA_CLIENT_CERT_PATH || './certs/elga-client.crt',
    clientKey: process.env.ELGA_CLIENT_KEY_PATH || './certs/elga-client.key',
    caCert: process.env.ELGA_CA_CERT_PATH || './certs/elga-ca.crt',
    
    // Passphrase für privaten Schlüssel (optional)
    passphrase: process.env.ELGA_CERT_PASSPHRASE || ''
  },
  
  // e-card Validierung
  ecard: {
    // Timeout für e-card Validierung (ms)
    timeout: parseInt(process.env.ELGA_ECARD_TIMEOUT || '30000'),
    
    // Cache-Dauer für Validierungen (ms)
    cacheDuration: parseInt(process.env.ELGA_ECARD_CACHE_DURATION || '3600000'), // 1 Stunde
    
    // Fallback bei API-Fehler aktivieren
    enableFallback: process.env.ELGA_ENABLE_FALLBACK !== 'false'
  },
  
  // Abrechnungsübermittlung
  billing: {
    // Automatische Übermittlung aktivieren
    autoSubmit: process.env.ELGA_AUTO_SUBMIT === 'true',
    
    // Übermittlungszeitpunkt (Cron-Format)
    submitSchedule: process.env.ELGA_SUBMIT_SCHEDULE || '0 23 * * *', // Täglich 23:00
    
    // Retry-Versuche bei Fehler
    maxRetries: parseInt(process.env.ELGA_MAX_RETRIES || '3'),
    
    // Retry-Delay (ms)
    retryDelay: parseInt(process.env.ELGA_RETRY_DELAY || '60000') // 1 Minute
  },
  
  // Logging
  logging: {
    // Detailliertes Logging aktivieren
    verbose: process.env.ELGA_VERBOSE_LOGGING === 'true',
    
    // Log-Level: 'error', 'warn', 'info', 'debug'
    level: process.env.ELGA_LOG_LEVEL || 'info'
  },
  
  // Aktuelle Umgebung
  environment: process.env.ELGA_ENVIRONMENT || process.env.NODE_ENV || 'development',
  
  // Aktive Konfiguration basierend auf Umgebung
  get activeConfig() {
    return this.environment === 'production' ? this.api.production : this.api.test;
  },
  
  // Prüft ob Zertifikate vorhanden sind
  hasCertificates() {
    const fs = require('fs');
    try {
      return fs.existsSync(this.certificates.clientCert) &&
             fs.existsSync(this.certificates.clientKey);
    } catch (error) {
      return false;
    }
  },
  
  // Validiert Konfiguration
  validate() {
    const errors = [];
    
    if (!this.activeConfig.clientId) {
      errors.push('ELGA Client ID fehlt');
    }
    
    if (!this.activeConfig.clientSecret) {
      errors.push('ELGA Client Secret fehlt');
    }
    
    if (this.environment === 'production' && !this.hasCertificates()) {
      errors.push('ELGA-Zertifikate fehlen (erforderlich für Produktion)');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};














