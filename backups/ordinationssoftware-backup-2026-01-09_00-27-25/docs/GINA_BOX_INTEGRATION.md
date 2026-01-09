# GINA-Box Integration - Funktionsweise

## Übersicht

Die GINA-Box (Gesundheits-Informations-Netz-Adapter Box) ist ein Hardware-Gerät, das e-cards direkt lesen kann und als Schnittstelle zwischen der Ordinationssoftware und dem österreichischen Gesundheitsinformationsnetz (GIN) fungiert.

## Aktueller Stand

### ✅ Bereits implementiert:
- **GINA-API-Integration** über `ginaService.js`
- **e-card-Validierung** über GINA-API
- **Automatische Validierung** beim Erstellen/Bearbeiten von Patienten
- **Automatische Validierung** beim Erstellen von Kassenarzt-Rechnungen

### ⚠️ Noch nicht implementiert:
- **Direkte Hardware-Integration** mit GINA-Box
- **Card-Reader-Erkennung** (automatisches Auslesen der e-card)
- **WebSocket/Event-basierte Kommunikation** mit GINA-Box

## Wie funktioniert eine GINA-Box?

### Hardware-Komponenten:
1. **Card-Reader**: Liest die e-card aus
2. **GINA-Adapter**: Kommuniziert mit dem GIN-Netzwerk
3. **Lokale API**: Stellt eine REST-API oder WebSocket-Verbindung bereit

### Typischer Workflow:

```
1. e-card wird in GINA-Box eingesteckt
   ↓
2. GINA-Box liest e-card-Daten aus
   ↓
3. GINA-Box validiert e-card über GIN-Netzwerk
   ↓
4. GINA-Box sendet Daten an Ordinationssoftware
   ↓
5. Ordinationssoftware verarbeitet die Daten
```

## Implementierungsplan für GINA-Box-Integration

### Phase 1: Card-Reader-Service

Erstelle einen Service, der:
- Mit der GINA-Box kommuniziert (REST-API oder WebSocket)
- e-card-Ereignisse erkennt (Karte eingesteckt/entfernt)
- e-card-Daten automatisch ausliest

### Phase 2: Event-basierte Verarbeitung

Implementiere:
- WebSocket-Verbindung zur GINA-Box
- Event-Handler für Card-Insert/Remove-Ereignisse
- Automatische Validierung bei Card-Insert

### Phase 3: Frontend-Integration

Erweitere das Frontend:
- Anzeige des GINA-Box-Status
- Automatische Patientenerkennung bei Card-Insert
- Dialog für e-card-Datenbestätigung

## Konfiguration

### GINA-Box-Konfiguration (`.env`):

```bash
# GINA-Box Hardware-Integration
GINA_BOX_ENABLED=true
GINA_BOX_TYPE=local_api  # local_api, websocket, usb
GINA_BOX_URL=http://localhost:8080  # Lokale GINA-Box API
GINA_BOX_WEBSOCKET_URL=ws://localhost:8080/ws
GINA_BOX_AUTO_VALIDATE=true  # Automatische Validierung bei Card-Insert
GINA_BOX_AUTO_PATIENT_MATCH=true  # Automatische Patientenfindung
```

## API-Endpunkte der GINA-Box (typisch)

### REST-API (wenn verfügbar):

```
GET  /status              - GINA-Box Status
GET  /card/status         - Aktuelle Card-Status
GET  /card/data           - e-card Daten auslesen
POST /card/validate       - e-card validieren
GET  /card/insurance      - Versicherungsdaten abrufen
```

### WebSocket-Events:

```javascript
// Von GINA-Box empfangen:
{
  "event": "card_inserted",
  "data": {
    "cardNumber": "1234567890123456",
    "cardType": "e-card",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}

{
  "event": "card_removed",
  "timestamp": "2025-01-15T10:35:00Z"
}

{
  "event": "card_validated",
  "data": {
    "cardNumber": "1234567890123456",
    "valid": true,
    "insuranceData": { ... },
    "validUntil": "2026-12-31"
  }
}
```

## Implementierung

### 1. GINA-Box-Service erstellen

```javascript
// backend/services/ginaBoxService.js
class GINABoxService {
  constructor() {
    this.boxUrl = process.env.GINA_BOX_URL;
    this.websocketUrl = process.env.GINA_BOX_WEBSOCKET_URL;
    this.autoValidate = process.env.GINA_BOX_AUTO_VALIDATE === 'true';
    this.wsConnection = null;
  }

  // Verbindung zur GINA-Box herstellen
  async connect() {
    if (this.websocketUrl) {
      return this.connectWebSocket();
    } else if (this.boxUrl) {
      return this.connectREST();
    }
  }

  // WebSocket-Verbindung
  connectWebSocket() {
    // Implementierung
  }

  // REST-API-Verbindung mit Polling
  connectREST() {
    // Implementierung
  }

  // e-card-Daten auslesen
  async readCard() {
    // Implementierung
  }

  // e-card validieren
  async validateCard(cardNumber) {
    // Implementierung
  }
}
```

### 2. Card-Reader-Integration

```javascript
// backend/services/cardReaderService.js
class CardReaderService {
  constructor() {
    this.ginaBox = require('./ginaBoxService');
    this.currentCard = null;
    this.listeners = [];
  }

  // Event-Listener registrieren
  on(event, callback) {
    this.listeners.push({ event, callback });
  }

  // Card-Insert-Handler
  async handleCardInsert(cardData) {
    // Automatische Validierung
    // Automatische Patientenfindung
    // Event an Frontend senden
  }
}
```

### 3. Frontend-Integration

```typescript
// frontend/src/hooks/useGinaBox.ts
const useGinaBox = () => {
  const [cardStatus, setCardStatus] = useState<'no_card' | 'reading' | 'validated'>('no_card');
  const [cardData, setCardData] = useState(null);

  useEffect(() => {
    // WebSocket-Verbindung zum Backend
    const ws = new WebSocket('ws://localhost:5001/api/gina-box/ws');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === 'card_inserted') {
        setCardStatus('reading');
        setCardData(data.cardData);
      }
    };
  }, []);
};
```

## Workflow bei Card-Insert

### Szenario 1: Automatische Patientenfindung

```
1. e-card wird eingesteckt
   ↓
2. GINA-Box liest Card-Nummer
   ↓
3. System sucht nach Patient mit dieser Card-Nummer
   ↓
4a. Patient gefunden → Öffne PatientOrganizer
4b. Patient nicht gefunden → Zeige Dialog "Neuer Patient?"
   ↓
5. Automatische Validierung über GINA
   ↓
6. Aktualisiere Patientendaten
```

### Szenario 2: Manuelle Zuordnung

```
1. e-card wird eingesteckt
   ↓
2. GINA-Box liest Card-Nummer
   ↓
3. Zeige Dialog mit Card-Daten
   ↓
4. Benutzer wählt Patient aus oder erstellt neuen
   ↓
5. Automatische Validierung über GINA
   ↓
6. Aktualisiere Patientendaten
```

## Sicherheit

### Wichtige Sicherheitsaspekte:

1. **Lokale Verbindung**: GINA-Box sollte nur lokal erreichbar sein
2. **Authentifizierung**: API-Aufrufe zur GINA-Box authentifizieren
3. **Verschlüsselung**: WebSocket-Verbindungen verschlüsseln (WSS)
4. **Datenvalidierung**: Alle Card-Daten validieren
5. **Audit-Log**: Alle Card-Zugriffe protokollieren

## Troubleshooting

### GINA-Box wird nicht erkannt:

1. Prüfen Sie die Verbindung (USB/Netzwerk)
2. Prüfen Sie die GINA-Box-Konfiguration
3. Prüfen Sie die Firewall-Einstellungen
4. Prüfen Sie die Logs der GINA-Box

### e-card wird nicht gelesen:

1. Prüfen Sie, ob die e-card korrekt eingesteckt ist
2. Prüfen Sie die GINA-Box-Firmware-Version
3. Prüfen Sie die Card-Reader-Treiber
4. Kontaktieren Sie den GINA-Box-Hersteller

## Nächste Schritte

1. ✅ GINA-Box-Service implementieren
2. ✅ Card-Reader-Integration hinzufügen
3. ✅ WebSocket-Support für Echtzeit-Events
4. ✅ Frontend-Integration für automatische Patientenfindung
5. ✅ Automatische Validierung bei Card-Insert



