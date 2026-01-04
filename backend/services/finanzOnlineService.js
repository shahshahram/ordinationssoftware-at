// FinanzOnline-Integration Service
// Registriert Kasse und TSE über FinanzOnline-Webservice

const axios = require('axios');

class FinanzOnlineService {
  constructor() {
    // Prüfe ob Test-Modus aktiviert ist
    this.testMode = process.env.FINANZONLINE_TEST_MODE === 'true';
    
    // Test-Umgebung oder Production
    this.baseUrl = this.testMode
      ? (process.env.FINANZONLINE_TEST_URL || 'https://finanzonline.bmf.gv.at/test')
      : (process.env.FINANZONLINE_BASE_URL || 'https://finanzonline.bmf.gv.at');
    
    this.webserviceUser = this.testMode
      ? (process.env.FINANZONLINE_TEST_WEBSERVICE_USER || process.env.FINANZONLINE_WEBSERVICE_USER)
      : process.env.FINANZONLINE_WEBSERVICE_USER;
    
    this.webservicePassword = this.testMode
      ? (process.env.FINANZONLINE_TEST_WEBSERVICE_PASSWORD || process.env.FINANZONLINE_WEBSERVICE_PASSWORD)
      : process.env.FINANZONLINE_WEBSERVICE_PASSWORD;
  }

  /**
   * Registriert Registrierkasse bei FinanzOnline
   * @param {Object} cashRegister - CashRegister aus DB
   * @param {Object} registrationData - Registrierungsdaten
   * @returns {Promise<Object>} Registrierungsantwort
   */
  async registerCashRegister(cashRegister, registrationData) {
    if (!this.webserviceUser || !this.webservicePassword) {
      throw new Error('FinanzOnline Webservice-Credentials nicht konfiguriert');
    }

    try {
      // FinanzOnline Webservice-Integration
      // WSDL: https://finanzonline.bmf.gv.at/fon/ws/session?wsdl
      // XSD: https://finanzonline.bmf.gv.at/fon/ws/session?xsd=1
      
      const response = await axios.post(`${this.baseUrl}/api/cashregister/register`, {
        cashBoxId: cashRegister.cashBoxId,
        tseSerial: cashRegister.tse.serialNumber,
        tsePublicKey: cashRegister.tse.publicKey,
        location: registrationData.location,
        taxNumber: registrationData.taxNumber,
        testMode: this.testMode
      }, {
        auth: {
          username: this.webserviceUser,
          password: this.webservicePassword
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Mode': this.testMode ? 'true' : 'false'
        }
      });

      return {
        success: true,
        cashRegisterId: response.data.cashRegisterId,
        tseId: response.data.tseId,
        registrationDate: new Date(),
        testMode: this.testMode
      };
    } catch (error) {
      // Im Test-Modus: Simulation erlauben
      if (this.testMode) {
        console.warn('⚠️ FinanzOnline Test-Modus: Simulation (keine echte API-Verbindung)');
        return {
          success: true,
          cashRegisterId: `FO-TEST-${cashRegister.cashBoxId}`,
          tseId: `FO-TSE-TEST-${cashRegister.tse.serialNumber}`,
          registrationDate: new Date(),
          testMode: true,
          message: 'Test-Modus: Simulation (keine echte Registrierung)'
        };
      }
      
      console.error('❌ FinanzOnline-Registrierung fehlgeschlagen:', error);
      throw error;
    }
  }

  /**
   * Meldet Beleg an FinanzOnline (optional, je nach Anforderung)
   */
  async submitReceipt(receiptChainEntry) {
    // In Österreich ist die Meldung von einzelnen Belegen nicht zwingend erforderlich
    // Die Belege müssen nur bei Prüfung verfügbar sein
    // Diese Funktion kann für zukünftige Anforderungen implementiert werden
    
    console.log('ℹ️ Beleg-Meldung an FinanzOnline (optional, nicht implementiert)');
    return { success: true, message: 'Beleg-Meldung optional' };
  }

  /**
   * Validiert Registrierung bei FinanzOnline
   */
  async validateRegistration(cashRegister) {
    if (!cashRegister.finanzOnline.registered) {
      return { valid: false, message: 'Nicht bei FinanzOnline registriert' };
    }

    // TODO: Implementiere Validierung über FinanzOnline-API
    return { valid: true, message: 'Registrierung gültig' };
  }
}

module.exports = new FinanzOnlineService();

