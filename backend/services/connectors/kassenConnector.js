const axios = require('axios');

class KassenConnector {
  constructor() {
    this.baseUrl = process.env.KASSA_API_URL || 'https://api.krankenkasse.at';
    this.apiKey = process.env.KASSA_API_KEY;
    this.timeout = 30000; // 30 Sekunden
  }

  /**
   * Leistung an Krankenkasse senden
   * @param {object} payload - Abrechnungsdaten
   * @param {string} idempotencyKey - Idempotency-Key
   * @returns {Promise<object>} Kassen-Response
   */
  async send(payload, idempotencyKey) {
    const startTime = Date.now();
    
    try {
      // ELGA/e-Card Validierung
      await this.validateECard(payload.patient);
      
      // Kassen-Payload erstellen
      const kassaPayload = this.buildKassaPayload(payload);
      
      // API-Aufruf
      const response = await this.callKassaAPI(kassaPayload, idempotencyKey);
      
      // Response validieren
      this.validateResponse(response);
      
      return {
        success: true,
        kassaRef: response.referenceNumber,
        status: response.status,
        message: response.message,
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('Kassen-Connector Fehler:', error);
      throw new Error(`Kassenabrechnung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * e-Card validieren
   */
  async validateECard(patient) {
    if (!patient.socialSecurityNumber) {
      throw new Error('Sozialversicherungsnummer fehlt');
    }
    
    // Hier würde die e-Card-Validierung implementiert
    // Für jetzt simulieren wir das
    const isValid = this.validateSSN(patient.socialSecurityNumber);
    if (!isValid) {
      throw new Error('Ungültige Sozialversicherungsnummer');
    }
  }

  /**
   * Sozialversicherungsnummer validieren
   */
  validateSSN(ssn) {
    // Vereinfachte SSN-Validierung
    const ssnRegex = /^\d{4}\s?\d{2}\s?\d{2}$/;
    return ssnRegex.test(ssn);
  }

  /**
   * Kassen-Payload erstellen
   */
  buildKassaPayload(payload) {
    return {
      // ELGA-Daten
      elga: {
        patientId: payload.patient.socialSecurityNumber,
        doctorId: payload.doctor.taxNumber,
        timestamp: payload.timestamp
      },
      
      // Leistungsdaten
      service: {
        code: payload.performance.serviceCode,
        description: payload.performance.serviceDescription,
        datetime: payload.performance.serviceDatetime,
        price: payload.performance.totalPrice,
        copay: payload.kassaData.copayAmount
      },
      
      // Arztdaten
      doctor: {
        taxNumber: payload.doctor.taxNumber,
        chamberNumber: payload.doctor.chamberNumber,
        specialization: payload.doctor.specialization
      },
      
      // Metadaten
      metadata: {
        idempotencyKey: payload.idempotencyKey,
        version: '1.0',
        source: 'ordinationssoftware'
      }
    };
  }

  /**
   * Kassen-API aufrufen
   */
  async callKassaAPI(kassaPayload, idempotencyKey) {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
      'X-Source': 'ordinationssoftware'
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/billing/submit`,
        kassaPayload,
        {
          headers,
          timeout: this.timeout,
          validateStatus: (status) => status < 500 // Nur Server-Fehler als Fehler behandeln
        }
      );

      return response.data;
      
    } catch (error) {
      if (error.response) {
        // API-Fehler
        throw new Error(`Kassen-API Fehler ${error.response.status}: ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        // Netzwerk-Fehler
        throw new Error('Verbindung zur Krankenkasse fehlgeschlagen');
      } else {
        // Andere Fehler
        throw new Error(`Kassen-API Fehler: ${error.message}`);
      }
    }
  }

  /**
   * Response validieren
   */
  validateResponse(response) {
    if (!response.referenceNumber) {
      throw new Error('Keine Referenznummer von der Krankenkasse erhalten');
    }
    
    if (response.status === 'REJECTED') {
      throw new Error(`Leistung abgelehnt: ${response.reason || 'Unbekannter Grund'}`);
    }
  }

  /**
   * Rückerstattungsantrag einreichen (für Wahlarzt)
   */
  async submitRefundRequest(payload, idempotencyKey) {
    const refundPayload = {
      ...this.buildKassaPayload(payload),
      refundRequest: {
        type: 'wahlarzt',
        patientAmount: payload.wahlarztData.patientAmount,
        refundAmount: payload.wahlarztData.refundAmount,
        reason: 'Wahlarztleistung'
      }
    };

    try {
      const response = await this.callKassaAPI(refundPayload, `${idempotencyKey}_refund`);
      
      return {
        success: true,
        refundRef: response.referenceNumber,
        status: response.status,
        refundAmount: payload.wahlarztData.refundAmount
      };
      
    } catch (error) {
      throw new Error(`Rückerstattungsantrag fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Status einer Abrechnung abfragen
   */
  async getBillingStatus(kassaRef) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/billing/status/${kassaRef}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      return response.data;
      
    } catch (error) {
      throw new Error(`Status-Abfrage fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Abrechnungsliste für Zeitraum abrufen
   */
  async getBillingList(startDate, endDate) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/billing/list`,
        {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          },
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      return response.data;
      
    } catch (error) {
      throw new Error(`Abrechnungsliste abrufen fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Test-Verbindung zur Kassen-API
   */
  async testConnection() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/health`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      return {
        success: true,
        status: response.data.status,
        version: response.data.version
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new KassenConnector();
