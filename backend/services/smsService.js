const axios = require('axios');
const SystemSettings = require('../models/SystemSettings');
const crypto = require('crypto');

/**
 * SMS Service für Benachrichtigungen
 * Unterstützt verschiedene SMS-Gateways (Seven, Twilio, websms.at)
 */
class SMSService {
  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'seven'; // seven, twilio, websms
    this.config = {
      seven: {
        apiKey: process.env.SEVEN_API_KEY,
        apiUrl: 'https://gateway.seven.io/api/sms'
      },
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER,
        apiUrl: 'https://api.twilio.com/2010-04-01/Accounts'
      },
      websms: {
        username: process.env.WEBSMS_USERNAME,
        password: process.env.WEBSMS_PASSWORD,
        apiUrl: 'https://api.websms.at/rest/sms'
      }
    };
    this.initializeConfig();
  }

  /**
   * Initialisiert Konfiguration aus SystemSettings oder Umgebungsvariablen
   */
  async initializeConfig() {
    try {
      const smsSettings = await SystemSettings.getCategorySettings('notifications');
      
      // Provider
      if (smsSettings['sms.provider']) {
        this.provider = smsSettings['sms.provider'];
      }

      // Seven.io Konfiguration
      if (smsSettings['sms.seven.apiKey']) {
        this.config.seven.apiKey = smsSettings['sms.seven.apiKey'];
      }
      if (smsSettings['sms.seven.from']) {
        this.config.seven.from = smsSettings['sms.seven.from'];
      }

      // Twilio Konfiguration
      if (smsSettings['sms.twilio.accountSid']) {
        this.config.twilio.accountSid = smsSettings['sms.twilio.accountSid'];
      }
      if (smsSettings['sms.twilio.authToken']) {
        const decryptedToken = this.decryptPassword(smsSettings['sms.twilio.authToken']);
        this.config.twilio.authToken = decryptedToken || smsSettings['sms.twilio.authToken'];
      }
      if (smsSettings['sms.twilio.fromNumber']) {
        this.config.twilio.fromNumber = smsSettings['sms.twilio.fromNumber'];
      }

      // websms.at Konfiguration
      if (smsSettings['sms.websms.username']) {
        this.config.websms.username = smsSettings['sms.websms.username'];
      }
      if (smsSettings['sms.websms.password']) {
        const decryptedPassword = this.decryptPassword(smsSettings['sms.websms.password']);
        this.config.websms.password = decryptedPassword || smsSettings['sms.websms.password'];
      }
    } catch (error) {
      console.warn('Fehler beim Laden der SMS-Settings aus der Datenbank:', error.message);
      // Fallback zu Umgebungsvariablen
    }
  }

  /**
   * Verschlüsselungs-Hilfsfunktionen (ähnlich wie in settings.js)
   */
  getEncryptionKey() {
    let key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      console.warn('⚠️ ENCRYPTION_KEY nicht gesetzt - verwende temporären Schlüssel');
      key = crypto.randomBytes(32).toString('hex');
      process.env.ENCRYPTION_KEY = key;
    }
    
    if (key.length === 64) {
      return Buffer.from(key, 'hex');
    } else if (key.length > 64) {
      return Buffer.from(key.slice(0, 64), 'hex');
    } else {
      return crypto.createHash('sha256').update(key).digest();
    }
  }

  decryptPassword(encryptedText) {
    if (!encryptedText) return null;
    try {
      const key = this.getEncryptionKey();
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        return null; // Nicht verschlüsselt, gib Original zurück
      }
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Fehler beim Entschlüsseln des SMS-Passworts:', error);
      return null;
    }
  }

  /**
   * Sendet eine SMS
   * @param {string} to - Telefonnummer (internationales Format, z.B. +436641234567)
   * @param {string} message - Nachrichtentext
   * @param {object} options - Zusätzliche Optionen (priority, flash, etc.)
   * @returns {Promise<object>} - Response vom SMS-Gateway
   */
  async sendSMS(to, message, options = {}) {
    try {
      // Validiere Telefonnummer
      if (!to || !this.isValidPhoneNumber(to)) {
        throw new Error('Ungültige Telefonnummer');
      }

      // Validiere Nachricht
      if (!message || message.trim().length === 0) {
        throw new Error('Nachricht darf nicht leer sein');
      }

      // Max. 160 Zeichen für Standard-SMS (oder 1600 für concatenated)
      const maxLength = options.longSMS ? 1600 : 160;
      if (message.length > maxLength) {
        console.warn(`[SMS] Nachricht ist länger als ${maxLength} Zeichen. Wird möglicherweise aufgeteilt.`);
      }

      // Normalisiere Telefonnummer (entferne Leerzeichen, füge + hinzu falls fehlt)
      const normalizedPhone = this.normalizePhoneNumber(to);

      // Sende SMS je nach Provider
      let response;
      switch (this.provider) {
        case 'seven':
          response = await this.sendViaSeven(normalizedPhone, message, options);
          break;
        case 'twilio':
          response = await this.sendViaTwilio(normalizedPhone, message, options);
          break;
        case 'websms':
          response = await this.sendViaWebSMS(normalizedPhone, message, options);
          break;
        default:
          throw new Error(`Unbekannter SMS-Provider: ${this.provider}`);
      }

      console.log(`[SMS] SMS erfolgreich gesendet an ${normalizedPhone} via ${this.provider}`);
      return {
        success: true,
        provider: this.provider,
        messageId: response.messageId || response.sid || response.id,
        to: normalizedPhone,
        ...response
      };
    } catch (error) {
      console.error('[SMS] Fehler beim Senden der SMS:', error);
      throw error;
    }
  }

  /**
   * Sendet SMS via Seven.io Gateway
   */
  async sendViaSeven(to, message, options) {
    if (!this.config.seven.apiKey) {
      throw new Error('Seven.io API Key nicht konfiguriert');
    }

    const response = await axios.post(
      this.config.seven.apiUrl,
      {
        to: to,
        text: message,
        from: options.from || process.env.SEVEN_FROM || 'Ordination',
        flash: options.flash || false,
        no_reload: options.noReload || true
      },
      {
        headers: {
          'X-Api-Key': this.config.seven.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      messageId: response.data.id,
      status: response.data.status,
      ...response.data
    };
  }

  /**
   * Sendet SMS via Twilio Gateway
   */
  async sendViaTwilio(to, message, options) {
    if (!this.config.twilio.accountSid || !this.config.twilio.authToken) {
      throw new Error('Twilio Credentials nicht konfiguriert');
    }

    const response = await axios.post(
      `${this.config.twilio.apiUrl}/${this.config.twilio.accountSid}/Messages.json`,
      new URLSearchParams({
        To: to,
        From: options.from || this.config.twilio.fromNumber,
        Body: message
      }),
      {
        auth: {
          username: this.config.twilio.accountSid,
          password: this.config.twilio.authToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      sid: response.data.sid,
      status: response.data.status,
      ...response.data
    };
  }

  /**
   * Sendet SMS via websms.at Gateway
   */
  async sendViaWebSMS(to, message, options) {
    if (!this.config.websms.username || !this.config.websms.password) {
      throw new Error('websms.at Credentials nicht konfiguriert');
    }

    const response = await axios.post(
      this.config.websms.apiUrl,
      {
        messageContent: message,
        recipientAddressList: [to],
        senderAddress: options.from || process.env.WEBSMS_FROM || 'Ordination'
      },
      {
        auth: {
          username: this.config.websms.username,
          password: this.config.websms.password
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      id: response.data.id,
      status: response.data.status,
      ...response.data
    };
  }

  /**
   * Validiert Telefonnummer
   */
  isValidPhoneNumber(phone) {
    // Entferne Leerzeichen, Bindestriche, etc.
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    // Prüfe auf internationales Format (+ gefolgt von Ziffern) oder österreichisches Format (0 gefolgt von Ziffern)
    return /^(\+?[1-9]\d{1,14}|0\d{4,14})$/.test(cleaned);
  }

  /**
   * Normalisiert Telefonnummer zu internationalem Format
   */
  normalizePhoneNumber(phone) {
    // Entferne Leerzeichen, Bindestriche, etc.
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Wenn österreichische Nummer (beginnt mit 0), ersetze 0 durch +43
    if (cleaned.startsWith('0')) {
      cleaned = '+43' + cleaned.substring(1);
    }
    // Wenn keine + vorhanden, füge + hinzu (für österreichische Nummern)
    else if (!cleaned.startsWith('+')) {
      // Annahme: österreichische Nummer, füge +43 hinzu
      cleaned = '+43' + cleaned;
    }

    return cleaned;
  }

  /**
   * Sendet SMS an mehrere Empfänger (für Multi-Benachrichtigung)
   * @param {string[]} recipients - Array von Telefonnummern
   * @param {string} message - Nachrichtentext
   * @param {object} options - Zusätzliche Optionen
   * @returns {Promise<object>} - Ergebnisse für jeden Empfänger
   */
  async sendBulkSMS(recipients, message, options = {}) {
    const results = [];
    const errors = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendSMS(recipient, message, options);
        results.push({ recipient, success: true, ...result });
      } catch (error) {
        errors.push({ recipient, success: false, error: error.message });
        console.error(`[SMS] Fehler beim Senden an ${recipient}:`, error);
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      totalSent: results.length,
      totalFailed: errors.length
    };
  }
}

// Singleton-Instanz
const smsService = new SMSService();

module.exports = smsService;

