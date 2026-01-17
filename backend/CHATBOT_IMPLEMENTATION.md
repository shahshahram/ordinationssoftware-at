# Chatbot - Vollständige Implementierung

## Übersicht

Der Chatbot für MyMediCloud MMC wurde vollständig implementiert, um **alle Aspekte der Anwendung** zu kennen und dynamisch auf neue Funktionen zu reagieren.

## Architektur

### 1. Feature Discovery Service (`chatbotFeatureDiscovery.js`)

Automatische Erkennung aller Features der Anwendung:

- **Backend-Routen**: Scannt alle Route-Dateien in `backend/routes/`
- **Frontend-Seiten**: Scannt alle Page-Dateien in `frontend/src/pages/`
- **Menüstruktur**: Extrahiert alle Menüeinträge aus `menuItems.tsx`
- **Komponenten**: Identifiziert wichtige Komponenten

**Ergebnis**: 215+ Features automatisch erkannt

### 2. Knowledge Base (`chatbotKnowledgeBase.js`)

Dynamische Wissensbasis mit:

- **Basis-Features**: 18 vordefinierte Hauptfunktionen mit detaillierten Anleitungen
- **Automatisch erkannte Features**: Alle durch Feature Discovery gefundenen Features
- **Kategorisierung**: Features werden automatisch in Kategorien eingeteilt:
  - Patientenverwaltung (17)
  - Terminplanung (9)
  - Dokumentenverwaltung (9)
  - Abrechnung (12)
  - Integrationen (18)
  - Verwaltung (18)
  - Einstellungen (3)
  - Berichte (3)
  - Sicherheit (2)
  - Sonstiges (132)

**Gesamt**: 223+ Features

### 3. Chatbot Service (`chatbotService.js`)

Hauptservice für Chatbot-Funktionalität:

- **OpenAI Integration**: Nutzt OpenAI API für intelligente Antworten
- **Fallback-System**: Keyword-basierte Antworten wenn OpenAI nicht verfügbar
- **Kontextbewusst**: Berücksichtigt aktuelle Seite und Benutzerkontext
- **Relevanz-Scoring**: Sortiert Antworten nach Relevanz

### 4. API Routes (`routes/chatbot.js`)

Backend-Endpunkte:

- `POST /api/chatbot/chat`: Chat-Nachricht senden
- `GET /api/chatbot/status`: Chatbot-Status abrufen
- `GET /api/chatbot/features`: Alle verfügbaren Features abrufen

## Funktionsweise

### Automatische Feature-Erkennung

Beim Start des Backend-Servers:

1. `ChatbotService` initialisiert die Knowledge Base
2. `discoverModules()` scannt alle Routen, Seiten und Menüeinträge
3. Features werden automatisch zur Knowledge Base hinzugefügt
4. Features werden kategorisiert für bessere Organisation

### Intelligente Suche

Bei einer Frage:

1. `findRelevantKnowledge()` sucht nach relevanten Features
2. **Scoring-System**: Features werden nach Relevanz bewertet
   - Keyword-Matches: +keyword.length Punkte
   - Category-Match: +10 Punkte
   - Description-Match: +5 Punkte
3. Top 10 relevanteste Features werden zurückgegeben
4. System-Prompt wird mit relevanten Informationen generiert

### Dynamische Erweiterung

Wenn neue Funktionen hinzugefügt werden:

- **Automatisch**: Neue Routen/Seiten werden beim nächsten Start erkannt
- **Manuell**: Features können mit `knowledgeBase.addFeature()` hinzugefügt werden
- **FAQ**: Neue Fragen mit `knowledgeBase.addFAQ()` hinzufügen

## Verwendung

### Frontend

```typescript
import api from '../utils/api';

// Chat-Nachricht senden
const response = await api.post('/chatbot/chat', {
  message: 'Wie erstelle ich einen Patienten?',
  context: {
    page: 'Patientenverwaltung',
    path: '/patients'
  },
  history: [] // Optional: Chat-Historie
});
```

### Backend

```javascript
const knowledgeBase = require('./services/chatbotKnowledgeBase');

// Feature manuell hinzufügen
knowledgeBase.addFeature({
  keywords: ['neue-funktion'],
  category: 'Neue Funktion',
  description: 'Beschreibung',
  instructions: ['Schritt 1', 'Schritt 2']
});

// FAQ hinzufügen
knowledgeBase.addFAQ(
  'Wie verwende ich X?',
  'Antwort...'
);
```

## API-Endpunkte

### GET /api/chatbot/features

Gibt alle verfügbaren Features zurück:

```json
{
  "success": true,
  "totalFeatures": 223,
  "categories": [
    {
      "name": "Patientenverwaltung",
      "count": 17,
      "features": [...]
    },
    ...
  ]
}
```

## Konfiguration

### Umgebungsvariablen

- `OPENAI_API_KEY`: OpenAI API Key (optional, für KI-Antworten)
- `OPENAI_API_URL`: OpenAI API URL (Standard: https://api.openai.com/v1/chat/completions)
- `OPENAI_MODEL`: OpenAI Model (Standard: gpt-4o-mini)

### Ohne OpenAI

Der Chatbot funktioniert auch ohne OpenAI API Key:
- Verwendet Fallback-Antworten basierend auf Keywords
- Nutzt die Knowledge Base für relevante Antworten
- Alle Features bleiben verfügbar

## Erweiterung

### Neue Features automatisch erkennen

1. Neue Route erstellen: `backend/routes/newFeature.js`
2. Neue Seite erstellen: `frontend/src/pages/NewFeature.tsx`
3. Beim nächsten Start wird das Feature automatisch erkannt

### Detaillierte Anleitungen hinzufügen

```javascript
knowledgeBase.addFeature({
  keywords: ['neue-funktion'],
  category: 'Neue Funktion',
  description: 'Detaillierte Beschreibung',
  instructions: [
    'Schritt 1: Gehen Sie zu...',
    'Schritt 2: Klicken Sie auf...',
    'Schritt 3: Füllen Sie aus...'
  ]
});
```

## Status

✅ **Vollständig implementiert**
- 223+ Features automatisch erkannt
- Intelligente Suche mit Relevanz-Scoring
- Kategorisierung in 10 Hauptkategorien
- Dynamische Erweiterung bei neuen Funktionen
- API-Endpunkt für Feature-Übersicht
- Fallback-System ohne OpenAI

## Nächste Schritte

1. Backend-Server neu starten
2. Chatbot testen mit verschiedenen Fragen
3. Bei Bedarf: Detaillierte Anleitungen für spezifische Features hinzufügen
