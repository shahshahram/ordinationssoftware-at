# Chatbot Setup - MyMediCloud MMC

## Übersicht

Der KI-Chatbot für MyMediCloud MMC bietet kontextbezogene Hilfe und Unterstützung für Benutzer der Software.

## Konfiguration

### 1. OpenAI API Key einrichten

Fügen Sie folgende Umgebungsvariablen zu Ihrer `.env` Datei hinzu:

```env
# OpenAI API Konfiguration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
OPENAI_MODEL=gpt-4o-mini
```

**Wichtig:**
- Erstellen Sie einen API Key auf https://platform.openai.com/api-keys
- Der Standard-Model ist `gpt-4o-mini` (kostengünstig)
- Für bessere Antworten können Sie `gpt-4o` verwenden (teurer)

### 2. Fallback-Modus

Wenn kein OpenAI API Key konfiguriert ist, verwendet der Chatbot einen einfachen Fallback-Modus mit vordefinierten Antworten. Dies ist für Entwicklung und Tests nützlich.

## Funktionalitäten

### Kontextbezogene Hilfe

Der Chatbot erkennt automatisch:
- Die aktuelle Seite (Dashboard, Patienten, Termine, etc.)
- Den aktuellen Pfad
- Benutzerrolle und Berechtigungen

### Unterstützte Bereiche

- **Allgemeine Fragen**: Software-Nutzung, Navigation, Features
- **Patientenverwaltung**: Patienten anlegen, bearbeiten, suchen
- **Terminplanung**: Termine erstellen, Kalender verwalten
- **Dokumentenverwaltung**: Dokumente erstellen, Vorlagen verwenden
- **Abrechnung**: Rechnungen erstellen, Kassenabrechnung
- **Patient-Organizer**: Übersicht, Timeline, Dokumente

## API Endpoints

### POST /api/chatbot/chat

Sendet eine Nachricht an den Chatbot.

**Request:**
```json
{
  "message": "Wie erstelle ich einen neuen Patienten?",
  "context": {
    "page": "Patientenverwaltung",
    "path": "/patients",
    "patientId": "optional-patient-id"
  },
  "history": [
    {
      "role": "user",
      "content": "Hallo"
    },
    {
      "role": "assistant",
      "content": "Hallo! Wie kann ich helfen?"
    }
  ]
}
```

**Response:**
```json
{
  "response": "Um einen neuen Patienten anzulegen...",
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

### GET /api/chatbot/status

Prüft den Status des Chatbots.

**Response:**
```json
{
  "enabled": true,
  "hasApiKey": true,
  "model": "gpt-4o-mini",
  "fallbackMode": false
}
```

## Sicherheit

- Alle Anfragen erfordern Authentifizierung
- Keine sensiblen Patientendaten werden an die OpenAI API gesendet
- Chat-Historie wird nicht dauerhaft gespeichert (nur in der aktuellen Session)
- Audit-Logging für alle Chatbot-Anfragen (optional)

## Kosten

- **gpt-4o-mini**: ~$0.15 pro 1M Input-Tokens, ~$0.60 pro 1M Output-Tokens
- **gpt-4o**: ~$2.50 pro 1M Input-Tokens, ~$10.00 pro 1M Output-Tokens

**Empfehlung:** Verwenden Sie `gpt-4o-mini` für die meisten Anwendungsfälle. Es ist kostengünstig und bietet gute Antworten.

## Troubleshooting

### Chatbot antwortet nicht

1. Prüfen Sie, ob der OpenAI API Key korrekt gesetzt ist
2. Prüfen Sie die Backend-Logs auf Fehler
3. Testen Sie den Status-Endpoint: `GET /api/chatbot/status`

### Rate Limit Fehler

- OpenAI hat Rate Limits basierend auf Ihrem Account-Typ
- Warten Sie einige Sekunden und versuchen Sie es erneut
- Erwägen Sie ein Upgrade Ihres OpenAI Accounts

### Fallback-Modus aktiv

- Der Chatbot verwendet einfache Keyword-basierte Antworten
- Konfigurieren Sie einen OpenAI API Key für KI-Funktionalität

## Entwicklung

Für lokale Entwicklung ohne OpenAI API Key:

1. Lassen Sie `OPENAI_API_KEY` leer
2. Der Chatbot verwendet automatisch den Fallback-Modus
3. Testen Sie die UI und Integration

## Erweiterte Konfiguration

Sie können den System-Prompt in `backend/services/chatbotService.js` anpassen, um:
- Spezifische Antworten für Ihre Praxis zu erstellen
- Zusätzliche Kontexte hinzuzufügen
- Antwort-Stil anzupassen
