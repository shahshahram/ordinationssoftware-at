# Chatbot Knowledge Base - Dokumentation

## Übersicht

Die Chatbot Knowledge Base ist eine dynamische Wissensbasis, die automatisch alle Aspekte der MyMediCloud MMC Anwendung erkennt und dem Chatbot zur Verfügung stellt.

## Funktionsweise

### Automatische Modul-Erkennung

Die Knowledge Base erkennt automatisch:

1. **Backend-Routen** (`backend/routes/*.js`)
   - Alle verfügbaren API-Endpunkte
   - Wird beim Start des Backend-Servers durchgeführt

2. **Frontend-Seiten** (`frontend/src/pages/*.tsx`)
   - Alle verfügbaren Seiten in der Anwendung
   - Wird beim Start des Backend-Servers durchgeführt

### Manuelle Erweiterung

Die Knowledge Base kann auch manuell erweitert werden:

```javascript
const knowledgeBase = require('./services/chatbotKnowledgeBase');

// Neues Feature hinzufügen
knowledgeBase.addFeature({
  keywords: ['neue-funktion', 'new-feature'],
  category: 'Neue Funktion',
  description: 'Beschreibung der neuen Funktion',
  instructions: [
    'Schritt 1: ...',
    'Schritt 2: ...'
  ]
});

// Neue FAQ hinzufügen
knowledgeBase.addFAQ(
  'Wie verwende ich die neue Funktion?',
  'Antwort auf die Frage...'
);
```

## Struktur

### Features

Jedes Feature enthält:
- `keywords`: Array von Suchbegriffen für die Erkennung
- `category`: Kategoriename
- `description`: Kurzbeschreibung
- `instructions`: Array von Anleitungen

### Dokumenttypen

Liste aller verfügbaren Dokumenttypen in der Anwendung.

### FAQ

Häufig gestellte Fragen und Antworten.

## Integration

Die Knowledge Base wird automatisch vom `ChatbotService` verwendet:

1. Beim Start wird `discoverModules()` aufgerufen
2. Bei jeder Anfrage wird `findRelevantKnowledge()` verwendet
3. Der System-Prompt wird dynamisch basierend auf relevanten Informationen generiert

## Erweiterung bei neuen Funktionen

Wenn neue Funktionen hinzugefügt werden:

1. **Automatisch**: Neue Routen/Seiten werden automatisch erkannt
2. **Manuell**: Für detaillierte Anleitungen können Features manuell hinzugefügt werden

## Beispiel

```javascript
// Automatisch erkannt: backend/routes/newFeature.js
// Wird zu Feature: "New Feature" mit Keywords: ['newfeature', 'new feature']

// Manuell hinzugefügt für detaillierte Anleitung:
knowledgeBase.addFeature({
  keywords: ['neue-funktion', 'new-feature'],
  category: 'Neue Funktion',
  description: 'Detaillierte Beschreibung',
  instructions: [
    'Schritt 1: Gehen Sie zu...',
    'Schritt 2: Klicken Sie auf...',
    'Schritt 3: Füllen Sie aus...'
  ]
});
```
