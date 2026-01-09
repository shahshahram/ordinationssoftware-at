// GINA-Box-Service für Hardware-Integration
// Kommunikation mit GINA-Box über REST-API oder WebSocket

const axios = require('axios');
const WebSocket = require('ws');
const EventEmitter = require('events');
const PatientExtended = require('../models/PatientExtended');
const ginaService = require('./ginaService');

class GINABoxService extends EventEmitter {
  constructor() {
    super();
    
    // GINA-Box-Konfiguration
    this.config = {
      enabled: process.env.GINA_BOX_ENABLED === 'true',
      type: process.env.GINA_BOX_TYPE || 'local_api', // local_api, websocket, usb
      url: process.env.GINA_BOX_URL || 'http://localhost:8080',
      websocketUrl: process.env.GINA_BOX_WEBSOCKET_URL || 'ws://localhost:8080/ws',
      autoValidate: process.env.GINA_BOX_AUTO_VALIDATE === 'true',
      autoPatientMatch: process.env.GINA_BOX_AUTO_PATIENT_MATCH === 'true',
      pollInterval: parseInt(process.env.GINA_BOX_POLL_INTERVAL || '1000'), // Polling-Intervall in ms
      timeout: parseInt(process.env.GINA_BOX_TIMEOUT || '5000')
    };
    
    // Status
    this.connected = false;
    this.currentCard = null;
    this.wsConnection = null;
    this.pollInterval = null;
    
    // Event-Handler
    this.onCardInsert = this.onCardInsert.bind(this);
    this.onCardRemove = this.onCardRemove.bind(this);
  }
  
  /**
   * Verbindung zur GINA-Box herstellen
   */
  async connect() {
    if (!this.config.enabled) {
      console.log('GINA-Box ist deaktiviert');
      return false;
    }
    
    try {
      if (this.config.type === 'websocket') {
        return await this.connectWebSocket();
      } else if (this.config.type === 'local_api') {
        return await this.connectREST();
      } else {
        console.warn(`Unbekannter GINA-Box-Typ: ${this.config.type}`);
        return false;
      }
    } catch (error) {
      console.error('Fehler beim Verbinden zur GINA-Box:', error.message);
      return false;
    }
  }
  
  /**
   * WebSocket-Verbindung zur GINA-Box
   */
  async connectWebSocket() {
    try {
      this.wsConnection = new WebSocket(this.config.websocketUrl);
      
      this.wsConnection.on('open', () => {
        console.log('✅ GINA-Box WebSocket-Verbindung hergestellt');
        this.connected = true;
        this.emit('connected');
      });
      
      this.wsConnection.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Fehler beim Verarbeiten der WebSocket-Nachricht:', error);
        }
      });
      
      this.wsConnection.on('error', (error) => {
        console.error('GINA-Box WebSocket-Fehler:', error.message);
        this.connected = false;
        this.emit('error', error);
      });
      
      this.wsConnection.on('close', () => {
        console.log('GINA-Box WebSocket-Verbindung geschlossen');
        this.connected = false;
        this.emit('disconnected');
        // Versuche erneut zu verbinden nach 5 Sekunden
        setTimeout(() => this.connectWebSocket(), 5000);
      });
      
      return true;
    } catch (error) {
      console.error('Fehler beim Herstellen der WebSocket-Verbindung:', error);
      return false;
    }
  }
  
  /**
   * REST-API-Verbindung mit Polling
   */
  async connectREST() {
    try {
      // Prüfe Verbindung
      const response = await axios.get(`${this.config.url}/status`, {
        timeout: this.config.timeout
      });
      
      if (response.data.status === 'ok') {
        console.log('✅ GINA-Box REST-API-Verbindung hergestellt');
        this.connected = true;
        this.emit('connected');
        
        // Starte Polling
        this.startPolling();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Fehler beim Verbinden zur GINA-Box REST-API:', error.message);
      // Versuche erneut zu verbinden nach 5 Sekunden
      setTimeout(() => this.connectREST(), 5000);
      return false;
    }
  }
  
  /**
   * Starte Polling für Card-Status
   */
  startPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    
    this.pollInterval = setInterval(async () => {
      try {
        const cardStatus = await this.getCardStatus();
        
        if (cardStatus && cardStatus.cardInserted && cardStatus.cardNumber) {
          // Neue Karte erkannt
          if (!this.currentCard || this.currentCard.cardNumber !== cardStatus.cardNumber) {
            await this.onCardInsert(cardStatus);
          }
        } else {
          // Keine Karte
          if (this.currentCard) {
            await this.onCardRemove();
          }
        }
      } catch (error) {
        console.error('Fehler beim Polling:', error.message);
      }
    }, this.config.pollInterval);
  }
  
  /**
   * Verarbeite WebSocket-Nachricht
   */
  handleWebSocketMessage(message) {
    switch (message.event) {
      case 'card_inserted':
        this.onCardInsert(message.data);
        break;
      case 'card_removed':
        this.onCardRemove();
        break;
      case 'card_validated':
        // Event wird bereits durch validateCurrentCard() emittiert
        if (message.data) {
          this.emit('card_validated', message.data);
        }
        break;
      case 'status':
        this.connected = message.data.connected === true;
        break;
      default:
        console.log('Unbekanntes WebSocket-Event:', message.event);
    }
  }
  
  /**
   * Handler für Card-Insert
   */
  async onCardInsert(cardData) {
    console.log('📇 e-card eingesteckt:', cardData.cardNumber);
    
    this.currentCard = {
      cardNumber: cardData.cardNumber,
      cardType: cardData.cardType || 'e-card',
      insertedAt: new Date(),
      data: cardData
    };
    
    // Emit Event
    this.emit('card_inserted', this.currentCard);
    
    // Automatische Validierung
    if (this.config.autoValidate) {
      await this.validateCurrentCard();
    }
    
    // Automatische Patientenfindung
    if (this.config.autoPatientMatch) {
      await this.findPatientByCard();
    }
  }
  
  /**
   * Handler für Card-Remove
   */
  async onCardRemove() {
    console.log('📇 e-card entfernt');
    
    const removedCard = this.currentCard;
    this.currentCard = null;
    
    // Emit Event
    this.emit('card_removed', removedCard);
  }
  
  /**
   * Validiere aktuelle e-card
   */
  async validateCurrentCard() {
    if (!this.currentCard) {
      return;
    }
    
    try {
      console.log('🔍 Validiere e-card über GINA...');
      
      // Versuche Patientendaten zu finden
      const patient = await PatientExtended.findOne({
        'ecard.cardNumber': this.currentCard.cardNumber
      });
      
      if (patient) {
        // Validiere mit bekannten Patientendaten
        const validation = await ginaService.validateECard(this.currentCard.cardNumber, {
          socialSecurityNumber: patient.socialSecurityNumber,
          dateOfBirth: patient.dateOfBirth,
          lastName: patient.lastName,
          firstName: patient.firstName
        });
        
        this.currentCard.validation = validation;
        this.emit('card_validated', {
          card: this.currentCard,
          validation: validation,
          patient: patient
        });
      } else {
        // Validiere nur mit Card-Nummer (weniger Daten)
        const validation = await ginaService.validateECard(this.currentCard.cardNumber, {});
        
        this.currentCard.validation = validation;
        this.emit('card_validated', {
          card: this.currentCard,
          validation: validation
        });
      }
    } catch (error) {
      console.error('Fehler bei e-card-Validierung:', error.message);
      this.emit('validation_error', {
        card: this.currentCard,
        error: error.message
      });
    }
  }
  
  /**
   * Finde Patient nach e-card-Nummer
   */
  async findPatientByCard() {
    if (!this.currentCard) {
      return null;
    }
    
    try {
      const patient = await PatientExtended.findOne({
        'ecard.cardNumber': this.currentCard.cardNumber
      });
      
      if (patient) {
        console.log(`✅ Patient gefunden: ${patient.firstName} ${patient.lastName}`);
        this.emit('patient_found', {
          card: this.currentCard,
          patient: patient
        });
        return patient;
      } else {
        console.log('⚠️ Kein Patient mit dieser e-card gefunden');
        this.emit('patient_not_found', {
          card: this.currentCard
        });
        return null;
      }
    } catch (error) {
      console.error('Fehler bei Patientenfindung:', error.message);
      return null;
    }
  }
  
  /**
   * Hole Card-Status von GINA-Box
   */
  async getCardStatus() {
    try {
      const response = await axios.get(`${this.config.url}/card/status`, {
        timeout: this.config.timeout
      });
      
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        this.connected = false;
        return null;
      }
      throw error;
    }
  }
  
  /**
   * Lese e-card-Daten von GINA-Box
   */
  async readCard() {
    try {
      const response = await axios.get(`${this.config.url}/card/data`, {
        timeout: this.config.timeout
      });
      
      return response.data;
    } catch (error) {
      console.error('Fehler beim Lesen der e-card:', error.message);
      throw error;
    }
  }
  
  /**
   * Validiere e-card über GINA-Box
   */
  async validateCard(cardNumber) {
    try {
      const response = await axios.post(`${this.config.url}/card/validate`, {
        cardNumber: cardNumber
      }, {
        timeout: this.config.timeout
      });
      
      return response.data;
    } catch (error) {
      console.error('Fehler bei e-card-Validierung über GINA-Box:', error.message);
      throw error;
    }
  }
  
  /**
   * Hole GINA-Box-Status
   */
  async getStatus() {
    try {
      if (this.config.type === 'websocket') {
        return {
          connected: this.connected,
          type: 'websocket',
          currentCard: this.currentCard ? {
            cardNumber: this.currentCard.cardNumber,
            insertedAt: this.currentCard.insertedAt
          } : null
        };
      } else {
        const response = await axios.get(`${this.config.url}/status`, {
          timeout: this.config.timeout
        });
        
        return {
          connected: true,
          type: 'rest_api',
          boxStatus: response.data,
          currentCard: this.currentCard ? {
            cardNumber: this.currentCard.cardNumber,
            insertedAt: this.currentCard.insertedAt
          } : null
        };
      }
    } catch (error) {
      return {
        connected: false,
        type: this.config.type,
        error: error.message,
        currentCard: null
      };
    }
  }
  
  /**
   * Trenne Verbindung
   */
  disconnect() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    this.connected = false;
    this.currentCard = null;
  }
}

// Singleton-Instanz
const ginaBoxService = new GINABoxService();

// Verbinde beim Start (wenn aktiviert)
if (process.env.GINA_BOX_ENABLED === 'true') {
  ginaBoxService.connect().catch(error => {
    console.error('Fehler beim Verbinden zur GINA-Box:', error);
  });
}

module.exports = ginaBoxService;

