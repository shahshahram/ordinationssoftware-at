import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

interface CardData {
  cardNumber: string;
  cardType: string;
  insertedAt: string;
  validation?: any;
}

interface PatientData {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  socialSecurityNumber?: string;
}

interface GinaBoxStatus {
  connected: boolean;
  type: 'websocket' | 'rest_api' | 'usb';
  currentCard: CardData | null;
  boxStatus?: any;
  error?: string;
}

interface UseGinaBoxReturn {
  status: GinaBoxStatus | null;
  currentCard: CardData | null;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  findPatient: (cardNumber?: string) => Promise<PatientData | null>;
  onCardInserted?: (card: CardData) => void;
  onCardRemoved?: () => void;
  onPatientFound?: (patient: PatientData) => void;
  onPatientNotFound?: () => void;
}

const useGinaBox = (options?: {
  onCardInserted?: (card: CardData) => void;
  onCardRemoved?: () => void;
  onPatientFound?: (patient: PatientData) => void;
  onPatientNotFound?: () => void;
  autoConnect?: boolean;
}): UseGinaBoxReturn => {
  const [status, setStatus] = useState<GinaBoxStatus | null>(null);
  const [currentCard, setCurrentCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  // Lade initialen Status
  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response: any = await api.get('/gina-box/status');
      if (response.success) {
        setStatus(response.data);
        setCurrentCard(response.data.currentCard || null);
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden des GINA-Box-Status');
    } finally {
      setLoading(false);
    }
  }, []);

  // Verbinde zur GINA-Box
  const connect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // REST-API-Verbindung
      const response: any = await api.post('/gina-box/connect');
      if (response.success) {
        await loadStatus();
      }

      // WebSocket-Verbindung für Echtzeit-Events
      const wsUrl = `ws://${window.location.hostname}:5001/api/gina-box/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ GINA-Box WebSocket verbunden');
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.event) {
            case 'status':
              setStatus(message.data);
              setCurrentCard(message.data.currentCard || null);
              break;
              
            case 'card_inserted':
              const card: CardData = message.data;
              setCurrentCard(card);
              if (options?.onCardInserted) {
                options.onCardInserted(card);
              }
              break;
              
            case 'card_removed':
              setCurrentCard(null);
              if (options?.onCardRemoved) {
                options.onCardRemoved();
              }
              break;
              
            case 'card_validated':
              if (currentCard) {
                setCurrentCard({
                  ...currentCard,
                  validation: message.data.validation
                });
              }
              break;
              
            case 'patient_found':
              if (options?.onPatientFound) {
                options.onPatientFound(message.data.patient);
              }
              break;
              
            case 'patient_not_found':
              if (options?.onPatientNotFound) {
                options.onPatientNotFound();
              }
              break;
              
            default:
              console.log('Unbekanntes GINA-Box-Event:', message.event);
          }
        } catch (err) {
          console.error('Fehler beim Verarbeiten der WebSocket-Nachricht:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('GINA-Box WebSocket-Fehler:', err);
        setError('WebSocket-Verbindungsfehler');
      };

      ws.onclose = () => {
        console.log('GINA-Box WebSocket getrennt');
        // Versuche erneut zu verbinden nach 5 Sekunden
        setTimeout(() => {
          if (wsConnection === ws) {
            connect();
          }
        }, 5000);
      };

      setWsConnection(ws);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Verbinden zur GINA-Box');
    } finally {
      setLoading(false);
    }
  }, [loadStatus, options, currentCard, wsConnection]);

  // Trenne Verbindung
  const disconnect = useCallback(async () => {
    try {
      if (wsConnection) {
        wsConnection.close();
        setWsConnection(null);
      }
      
      await api.post('/gina-box/disconnect');
      setCurrentCard(null);
    } catch (err: any) {
      console.error('Fehler beim Trennen der GINA-Box-Verbindung:', err);
    }
  }, [wsConnection]);

  // Finde Patient nach e-card-Nummer
  const findPatient = useCallback(async (cardNumber?: string): Promise<PatientData | null> => {
    try {
      const searchCardNumber = cardNumber || currentCard?.cardNumber;
      if (!searchCardNumber) {
        return null;
      }

      const response: any = await api.get('/gina-box/patient/find', {
        cardNumber: searchCardNumber
      });

      if (response.success && response.data) {
        return response.data;
      }
      
      return null;
    } catch (err: any) {
      console.error('Fehler bei Patientenfindung:', err);
      return null;
    }
  }, [currentCard]);

  // Initiales Laden und Auto-Connect
  useEffect(() => {
    loadStatus();
    
    if (options?.autoConnect !== false) {
      connect();
    }

    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, []);

  return {
    status,
    currentCard,
    loading,
    error,
    connect,
    disconnect,
    findPatient,
    onCardInserted: options?.onCardInserted,
    onCardRemoved: options?.onCardRemoved,
    onPatientFound: options?.onPatientFound,
    onPatientNotFound: options?.onPatientNotFound
  };
};

export default useGinaBox;

