// GINA-Box Routes für Hardware-Integration

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ginaBoxService = require('../services/ginaBoxService');
const PatientExtended = require('../models/PatientExtended');

// WebSocket-Support für Echtzeit-Events
let wsClients = new Set();
let wssInstance = null;

/**
 * WebSocket-Upgrade-Handler
 */
const setupWebSocket = (server) => {
  const WebSocket = require('ws');
  
  if (wssInstance) {
    return; // Bereits initialisiert
  }
  
  wssInstance = new WebSocket.Server({ 
    server,
    path: '/api/gina-box/ws',
    verifyClient: (info) => {
      // Einfache Authentifizierung über Query-Parameter
      // In Produktion sollte hier eine echte Token-Validierung erfolgen
      return true;
    }
  });

  wssInstance.on('connection', (ws, req) => {
    console.log('✅ GINA-Box WebSocket-Client verbunden');
    wsClients.add(ws);

    // Sende aktuellen Status
    ginaBoxService.getStatus().then(status => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          event: 'status',
          data: status
        }));
      }
    });

    // Event-Listener für GINA-Box-Events
    const onCardInserted = (card) => {
      wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            event: 'card_inserted',
            data: {
              cardNumber: card.cardNumber,
              cardType: card.cardType,
              insertedAt: card.insertedAt
            }
          }));
        }
      });
    };

    const onCardRemoved = (card) => {
      wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            event: 'card_removed',
            data: {
              cardNumber: card?.cardNumber,
              removedAt: new Date()
            }
          }));
        }
      });
    };

    const onCardValidated = (data) => {
      wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            event: 'card_validated',
            data: {
              card: data.card,
              validation: data.validation,
              patient: data.patient ? {
                _id: data.patient._id,
                firstName: data.patient.firstName,
                lastName: data.patient.lastName
              } : null
            }
          }));
        }
      });
    };

    const onPatientFound = (data) => {
      wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            event: 'patient_found',
            data: {
              card: data.card,
              patient: {
                _id: data.patient._id,
                firstName: data.patient.firstName,
                lastName: data.patient.lastName,
                dateOfBirth: data.patient.dateOfBirth,
                socialSecurityNumber: data.patient.socialSecurityNumber
              }
            }
          }));
        }
      });
    };

    const onPatientNotFound = (data) => {
      wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            event: 'patient_not_found',
            data: {
              card: data.card
            }
          }));
        }
      });
    };

    ginaBoxService.on('card_inserted', onCardInserted);
    ginaBoxService.on('card_removed', onCardRemoved);
    ginaBoxService.on('card_validated', onCardValidated);
    ginaBoxService.on('patient_found', onPatientFound);
    ginaBoxService.on('patient_not_found', onPatientNotFound);

    ws.on('close', () => {
      console.log('GINA-Box WebSocket-Client getrennt');
      wsClients.delete(ws);
      ginaBoxService.removeListener('card_inserted', onCardInserted);
      ginaBoxService.removeListener('card_removed', onCardRemoved);
      ginaBoxService.removeListener('card_validated', onCardValidated);
      ginaBoxService.removeListener('patient_found', onPatientFound);
      ginaBoxService.removeListener('patient_not_found', onPatientNotFound);
    });

    ws.on('error', (error) => {
      console.error('GINA-Box WebSocket-Fehler:', error);
    });
  });
};

// Exportiere Setup-Funktion
router.setupWebSocket = setupWebSocket;

/**
 * @route   GET /api/gina-box/status
 * @desc    GINA-Box-Status abrufen
 * @access  Private
 */
router.get('/status', auth, async (req, res) => {
  try {
    const status = await ginaBoxService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des GINA-Box-Status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des GINA-Box-Status',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/gina-box/connect
 * @desc    Verbindung zur GINA-Box herstellen
 * @access  Private
 */
router.post('/connect', auth, async (req, res) => {
  try {
    const connected = await ginaBoxService.connect();
    
    res.json({
      success: connected,
      message: connected ? 'GINA-Box-Verbindung hergestellt' : 'GINA-Box-Verbindung fehlgeschlagen'
    });
  } catch (error) {
    console.error('Fehler beim Verbinden zur GINA-Box:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Verbinden zur GINA-Box',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/gina-box/disconnect
 * @desc    Verbindung zur GINA-Box trennen
 * @access  Private
 */
router.post('/disconnect', auth, async (req, res) => {
  try {
    ginaBoxService.disconnect();
    
    res.json({
      success: true,
      message: 'GINA-Box-Verbindung getrennt'
    });
  } catch (error) {
    console.error('Fehler beim Trennen der GINA-Box-Verbindung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Trennen der GINA-Box-Verbindung',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/gina-box/card/status
 * @desc    Aktuellen Card-Status abrufen
 * @access  Private
 */
router.get('/card/status', auth, async (req, res) => {
  try {
    const cardStatus = await ginaBoxService.getCardStatus();
    
    res.json({
      success: true,
      data: cardStatus
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Card-Status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Card-Status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/gina-box/card/data
 * @desc    e-card-Daten auslesen
 * @access  Private
 */
router.get('/card/data', auth, async (req, res) => {
  try {
    const cardData = await ginaBoxService.readCard();
    
    res.json({
      success: true,
      data: cardData
    });
  } catch (error) {
    console.error('Fehler beim Lesen der e-card:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Lesen der e-card',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/gina-box/card/validate
 * @desc    e-card validieren
 * @access  Private
 */
router.post('/card/validate', auth, async (req, res) => {
  try {
    const { cardNumber, patientId } = req.body;
    
    if (!cardNumber) {
      return res.status(400).json({
        success: false,
        message: 'e-card Nummer ist erforderlich'
      });
    }
    
    // Validiere über GINA-Box oder GINA-Service
    let validation;
    try {
      validation = await ginaBoxService.validateCard(cardNumber);
    } catch (boxError) {
      // Fallback: Verwende GINA-Service
      const ginaService = require('../services/ginaService');
      
      let patientData = {};
      if (patientId) {
        const patient = await PatientExtended.findById(patientId);
        if (patient) {
          patientData = {
            socialSecurityNumber: patient.socialSecurityNumber,
            dateOfBirth: patient.dateOfBirth,
            lastName: patient.lastName,
            firstName: patient.firstName
          };
        }
      }
      
      validation = await ginaService.validateECard(cardNumber, patientData);
    }
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Fehler bei e-card-Validierung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei e-card-Validierung',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/gina-box/patient/find
 * @desc    Patient nach e-card-Nummer finden
 * @access  Private
 */
router.get('/patient/find', auth, async (req, res) => {
  try {
    const { cardNumber } = req.query;
    
    if (!cardNumber && !ginaBoxService.currentCard) {
      return res.status(400).json({
        success: false,
        message: 'e-card Nummer ist erforderlich'
      });
    }
    
    const searchCardNumber = cardNumber || ginaBoxService.currentCard?.cardNumber;
    
    const patient = await PatientExtended.findOne({
      'ecard.cardNumber': searchCardNumber
    }).select('firstName lastName dateOfBirth socialSecurityNumber insuranceProvider ecard');
    
    if (patient) {
      res.json({
        success: true,
        data: patient
      });
    } else {
      res.json({
        success: false,
        message: 'Kein Patient mit dieser e-card gefunden',
        data: null
      });
    }
  } catch (error) {
    console.error('Fehler bei Patientenfindung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Patientenfindung',
      error: error.message
    });
  }
});

module.exports = router;

