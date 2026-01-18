const axios = require('axios');
const knowledgeBase = require('./chatbotKnowledgeBase');
const smartSuggestionService = require('./smartSuggestionService');

class ChatbotService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiApiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.enabled = !!this.openaiApiKey;
    
    // Initialisiere Wissensbasis und entdecke Module
    this.initializeKnowledgeBase();
  }

  /**
   * Initialisiert die Wissensbasis und entdeckt verfügbare Module
   */
  async initializeKnowledgeBase() {
    try {
      await knowledgeBase.discoverModules();
      console.log('Chatbot Knowledge Base initialized with', knowledgeBase.getKnowledgeBase().features.length, 'features');
    } catch (error) {
      console.error('Error initializing knowledge base:', error);
    }
  }

  /**
   * Erstellt den System-Prompt basierend auf dem Kontext
   */
  createSystemPrompt(context, message = '') {
    // Finde relevante Informationen für die Frage
    const relevantKnowledge = knowledgeBase.findRelevantKnowledge(message);
    
    // Generiere erweiterten System-Prompt
    return knowledgeBase.generateEnhancedSystemPrompt(context, relevantKnowledge);
  }

  /**
   * Ruft die OpenAI API auf
   */
  async callOpenAI(messages, systemPrompt) {
    if (!this.enabled) {
      throw new Error('OpenAI API Key ist nicht konfiguriert');
    }

    const requestMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    try {
      const response = await axios.post(
        this.openaiApiUrl,
        {
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: requestMessages,
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 Sekunden Timeout
        }
      );

      return response.data.choices[0]?.message?.content || 'Entschuldigung, ich konnte keine Antwort generieren.';
    } catch (error) {
      console.error('OpenAI API Error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Ungültiger OpenAI API Key');
      } else if (error.response?.status === 429) {
        throw new Error('API Rate Limit erreicht. Bitte versuchen Sie es später erneut.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Zeitüberschreitung bei der API-Anfrage');
      } else {
        throw new Error('Fehler bei der Kommunikation mit der KI-API');
      }
    }
  }

  /**
   * Fallback-Antworten wenn OpenAI nicht verfügbar ist
   */
  getFallbackResponse(message, context = {}) {
    if (!message || typeof message !== 'string') {
      return 'Bitte stellen Sie eine Frage.';
    }

    const lowerMessage = message.toLowerCase().trim();
    
    // Verwende Wissensbasis für bessere Antworten
    const relevantKnowledge = knowledgeBase.findRelevantKnowledge(message);
    
    // Wenn relevante Features gefunden wurden, verwende diese
    if (relevantKnowledge.features.length > 0) {
      const feature = relevantKnowledge.features[0];
      return `${feature.category}:\n${feature.instructions.map(i => `- ${i}`).join('\n')}`;
    }
    
    // Wenn relevante FAQ gefunden wurden, verwende diese
    if (relevantKnowledge.faq.length > 0) {
      return relevantKnowledge.faq[0].answer;
    }

    // Einfache Keyword-basierte Antworten als Fallback
    if (lowerMessage.includes('hilfe') || lowerMessage.includes('help') || lowerMessage === 'hallo' || lowerMessage === 'hi') {
      return 'Ich kann Ihnen bei verschiedenen Aspekten von MyMediCloud MMC helfen. Fragen Sie mich zum Beispiel:\n- Wie erstelle ich einen neuen Patienten?\n- Wie plane ich einen Termin?\n- Wie erstelle ich ein Dokument?\n- Wie funktioniert die Abrechnung?';
    }

    if (lowerMessage.includes('patient') || lowerMessage.includes('patienten')) {
      return 'In der Patientenverwaltung können Sie:\n- Neue Patienten anlegen\n- Patientendaten bearbeiten\n- Patienten suchen und filtern\n- Stammdaten verwalten\n\nNavigieren Sie zu "Patienten" im Hauptmenü, um zu beginnen.';
    }

    if (lowerMessage.includes('termin') || lowerMessage.includes('appointment')) {
      return 'Für die Terminplanung:\n- Gehen Sie zu "Termine" im Hauptmenü\n- Klicken Sie auf "Neuer Termin"\n- Wählen Sie Patient, Datum, Uhrzeit und Art\n- Speichern Sie den Termin\n\nSie können auch den Kalender verwenden, um Termine visuell zu verwalten.';
    }

    if (lowerMessage.includes('dokument') || lowerMessage.includes('document')) {
      return 'Dokumente erstellen:\n- Gehen Sie zu "Dokumente"\n- Klicken Sie auf "Neues Dokument"\n- Wählen Sie einen Dokumenttyp\n- Wählen Sie eine Vorlage (optional)\n- Füllen Sie die Felder aus und speichern\n\nSie können auch Vorlagen erstellen und wiederverwenden.';
    }

    if (lowerMessage.includes('abrechnung') || lowerMessage.includes('billing') || lowerMessage.includes('rechnung')) {
      return 'Für die Abrechnung:\n- Gehen Sie zu "Abrechnung" im Hauptmenü\n- Wählen Sie den Patienten aus\n- Fügen Sie Leistungen hinzu\n- Wählen Sie die Abrechnungsart (Kasse/Wahlarzt/Privat)\n- Klicken Sie auf "Rechnung erstellen"\n\nDie Software unterstützt auch automatische Kassenabrechnung über ELDA und WAHonline.';
    }

    if (lowerMessage.includes('blutgruppe') || lowerMessage.includes('blut') || lowerMessage.includes('blutwerte')) {
      return 'Blutgruppe erfassen:\n- Öffnen Sie den Patient-Organizer (Patient auswählen)\n- Gehen Sie zum Tab "Vitalwerte" oder "Stammdaten"\n- Klicken Sie auf "Vitalwerte erfassen" oder "Bearbeiten"\n- Tragen Sie die Blutgruppe ein (A, B, AB, O mit Rhesusfaktor)\n- Speichern Sie die Daten\n\nDie Blutgruppe wird in den Patientenstammdaten gespeichert und kann bei Bedarf abgerufen werden.';
    }

    if (lowerMessage.includes('vitalwert') || lowerMessage.includes('vital') || lowerMessage.includes('blutdruck') || lowerMessage.includes('puls') || lowerMessage.includes('temperatur') || lowerMessage.includes('gewicht') || lowerMessage.includes('größe') || lowerMessage.includes('bmi')) {
      return 'Vitalwerte erfassen:\n- Öffnen Sie den Patient-Organizer (Patient auswählen)\n- Gehen Sie zum Tab "Vitalwerte"\n- Klicken Sie auf "Neue Vitalwerte" oder das Plus-Symbol\n- Tragen Sie die Werte ein (Blutdruck, Puls, Temperatur, Gewicht, Größe, etc.)\n- Speichern Sie die Daten\n\nDie Vitalwerte werden chronologisch gespeichert und können in der Timeline angezeigt werden.';
    }

    if (lowerMessage.includes('diagnose') || lowerMessage.includes('icd')) {
      return 'Diagnosen erfassen:\n- Öffnen Sie den Patient-Organizer\n- Gehen Sie zum Tab "Diagnosen"\n- Klicken Sie auf "Neue Diagnose"\n- Suchen Sie nach ICD-10 Codes oder verwenden Sie die ICD-10 Suche\n- Wählen Sie die Diagnose aus\n- Speichern Sie die Diagnose\n\nSie können auch persönliche Diagnoselisten erstellen für häufig verwendete Diagnosen.';
    }

    if (lowerMessage.includes('medikament') || lowerMessage.includes('medikation') || lowerMessage.includes('arznei')) {
      return 'Medikamente erfassen:\n- Öffnen Sie den Patient-Organizer\n- Gehen Sie zum Tab "Medikamente"\n- Klicken Sie auf "Neues Medikament"\n- Suchen Sie im Medikamentenkatalog oder geben Sie manuell ein\n- Tragen Sie Dosierung, Einnahmezeitpunkt und Dauer ein\n- Speichern Sie die Medikation\n\nDie Software prüft automatisch auf Wechselwirkungen und Dosierungsfehler.';
    }

    if (lowerMessage.includes('labor') || lowerMessage.includes('befund') || lowerMessage.includes('lab')) {
      return 'Laborbefunde:\n- Laborbefunde werden automatisch importiert, wenn ein Labor-Provider konfiguriert ist\n- Sie können auch manuell Laborwerte erfassen\n- Gehen Sie zum Patient-Organizer → Tab "Labor"\n- Klicken Sie auf "Neuer Laborbefund"\n- Tragen Sie die Werte ein oder importieren Sie eine Datei\n- Die Werte werden in der Timeline angezeigt';
    }

    if (lowerMessage.includes('dicom') || lowerMessage.includes('bildgebung') || lowerMessage.includes('röntgen') || lowerMessage.includes('mrt') || lowerMessage.includes('ct')) {
      return 'DICOM-Bildgebung:\n- DICOM-Studien werden automatisch importiert, wenn ein DICOM-Provider konfiguriert ist\n- Gehen Sie zum Patient-Organizer → Tab "DICOM"\n- Sie können DICOM-Dateien hochladen oder von einem Provider empfangen\n- Die Studien werden in der Timeline angezeigt und können im Viewer betrachtet werden';
    }

    if (lowerMessage.includes('notiz') || lowerMessage.includes('anmerkung') || lowerMessage.includes('hinweis')) {
      return 'Notizen erfassen:\n- Öffnen Sie den Patient-Organizer\n- Gehen Sie zum Tab "Notizen" oder "Allgemein"\n- Klicken Sie auf "Neue Notiz"\n- Geben Sie Ihre Notiz ein\n- Sie können Notizen kategorisieren und mit Tags versehen\n- Notizen werden in der Timeline angezeigt';
    }

    if (lowerMessage.includes('ordinationsdaten') || lowerMessage.includes('praxisdaten') || lowerMessage.includes('praxis') || (lowerMessage.includes('ordination') && lowerMessage.includes('daten'))) {
      return 'Ordinationsdaten ändern:\n- Gehen Sie zu "Einstellungen" im Hauptmenü\n- Wählen Sie "Allgemein" aus\n- Klicken Sie auf "Praxisdaten bearbeiten"\n- Ändern Sie die gewünschten Daten (Name, Adresse, Kontaktdaten, etc.)\n- Speichern Sie die Änderungen\n\nAlternativ können Sie auch:\n- Standorte verwalten: Standort-Verwaltung → Standort auswählen → Bearbeiten\n- Öffnungszeiten ändern: Einstellungen → Allgemein → Öffnungszeiten';
    }

    if (lowerMessage.includes('dekurs') && (lowerMessage.includes('anlegen') || lowerMessage.includes('erstellen') || lowerMessage.includes('neu'))) {
      return 'Dekurs anlegen:\n- Öffnen Sie den Patient-Organizer (Patient auswählen)\n- Gehen Sie zum Tab "Dekurs"\n- Klicken Sie auf "Neuer Dekurs" oder "Schnelleingabe"\n- Wählen Sie eine Dekurs-Vorlage (optional)\n- Füllen Sie die Felder aus (Datum, Befund, Verlauf, etc.)\n- Speichern Sie den Dekurs\n\nSie können auch:\n- Dekurs-Vorlagen verwalten: Dekurs-Vorlagen-Verwaltung → Neue Vorlage\n- Dekurs-Verlauf anzeigen: Patient-Organizer → Tab "Dekurs" → Verlauf';
    }

    if (lowerMessage.includes('dekurs')) {
      return 'Dekurs:\n- Dekurs anlegen: Patient-Organizer → Tab "Dekurs" → Neuer Dekurs\n- Dekurs-Vorlage erstellen: Dekurs-Vorlagen-Verwaltung → Neue Vorlage\n- Dekurs bearbeiten: Patient-Organizer → Tab "Dekurs" → Dekurs auswählen → Bearbeiten\n- Dekurs-Verlauf: Patient-Organizer → Tab "Dekurs" → Verlauf\n- Schnelleingabe: Patient-Organizer → Tab "Dekurs" → Schnelleingabe';
    }

    if (lowerMessage.includes('standort') && (lowerMessage.includes('ändern') || lowerMessage.includes('bearbeiten') || lowerMessage.includes('verwalten'))) {
      return 'Standort verwalten:\n- Gehen Sie zu "Standort-Verwaltung" im Hauptmenü\n- Wählen Sie den Standort aus, den Sie ändern möchten\n- Klicken Sie auf "Bearbeiten"\n- Ändern Sie die gewünschten Daten (Name, Adresse, Öffnungszeiten, etc.)\n- Speichern Sie die Änderungen\n\nSie können auch:\n- Neuen Standort hinzufügen: Standort-Verwaltung → Neuer Standort\n- Standort löschen: Standort-Verwaltung → Standort auswählen → Löschen';
    }

    return 'Entschuldigung, ich verstehe Ihre Frage noch nicht vollständig. Bitte stellen Sie eine spezifischere Frage oder nutzen Sie die Hilfe-Dialoge auf den einzelnen Seiten (❓ Symbol).\n\nIch kann Ihnen helfen bei:\n- Patientenverwaltung (Blutgruppe, Vitalwerte, Stammdaten)\n- Terminplanung\n- Dokumentenverwaltung\n- Abrechnung\n- Diagnosen und ICD-10\n- Medikamente\n- Laborbefunde\n- DICOM-Bildgebung\n- Ordinationsdaten und Standorte\n- Einstellungen';
  }

  /**
   * Ruft proaktive Vorschläge für einen Patienten ab
   */
  async getProactiveSuggestions(patientId, userId = null) {
    try {
      if (!patientId) {
        return null;
      }
      const suggestions = await smartSuggestionService.generateSuggestions(patientId, userId);
      if (suggestions.success && suggestions.suggestions) {
        // Formatiere Vorschläge für den Chatbot
        return this.formatSuggestionsForChatbot(suggestions.suggestions);
      }
      return null;
    } catch (error) {
      console.error('Error getting proactive suggestions:', error);
      return null;
    }
  }

  /**
   * Formatiert Vorschläge für die Anzeige im Chatbot
   */
  formatSuggestionsForChatbot(suggestions) {
    const formatted = [];
    
    // Priorisiere wichtige Vorschläge (urgent, high)
    const importantSuggestions = [
      ...suggestions.diagnoses.filter(s => s.priority === 'urgent' || s.priority === 'high'),
      ...suggestions.medications.filter(s => s.priority === 'urgent' || s.priority === 'high'),
      ...suggestions.appointments.filter(s => s.priority === 'urgent' || s.priority === 'high'),
      ...suggestions.laboratory.filter(s => s.priority === 'urgent' || s.priority === 'high'),
      ...suggestions.general.filter(s => s.priority === 'urgent' || s.priority === 'high'),
    ].slice(0, 3); // Maximal 3 wichtige Vorschläge

    if (importantSuggestions.length > 0) {
      formatted.push('💡 **Wichtige Vorschläge für diesen Patienten:**\n');
      importantSuggestions.forEach((suggestion, index) => {
        formatted.push(`${index + 1}. **${suggestion.title}**\n   ${suggestion.description}`);
        if (suggestion.action) {
          formatted.push(`   → ${suggestion.action}`);
        }
      });
    }

    return formatted.length > 0 ? formatted.join('\n\n') : null;
  }

  /**
   * Hauptmethode: Erhält eine Antwort vom Chatbot
   */
  async getResponse(message, context = {}, history = []) {
    try {
      // Validierung
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return 'Bitte stellen Sie eine Frage.';
      }

      // Proaktive Vorschläge abrufen, wenn ein Patient im Kontext ist
      let proactiveSuggestions = null;
      if (context.patientId) {
        try {
          proactiveSuggestions = await this.getProactiveSuggestions(context.patientId, context.userId);
        } catch (error) {
          console.error('Error fetching proactive suggestions:', error);
          // Fehler ignorieren, Chatbot funktioniert auch ohne Vorschläge
        }
      }

      // OpenAI API aufrufen wenn verfügbar
      if (this.enabled) {
        try {
          // System-Prompt erstellen (mit Nachricht für bessere Relevanz)
          let systemPrompt = this.createSystemPrompt(context, message);

          // Füge proaktive Vorschläge zum System-Prompt hinzu
          if (proactiveSuggestions) {
            systemPrompt += '\n\n**Proaktive Vorschläge für den aktuellen Patienten:**\n' + proactiveSuggestions;
            systemPrompt += '\n\nDu kannst diese Vorschläge in deine Antworten einbeziehen, wenn sie relevant sind.';
          }

          // Nachrichten-Historie formatieren (nur die letzten 10 Nachrichten)
          const formattedHistory = history
            .slice(-10)
            .map(msg => ({
              role: msg.role || 'user',
              content: msg.content || msg.text || '',
            }))
            .filter(msg => msg.content && msg.content.trim().length > 0);

          // Aktuelle Nachricht hinzufügen
          const messages = [
            ...formattedHistory,
            { role: 'user', content: message },
          ];

          let response = await this.callOpenAI(messages, systemPrompt);

          // Wenn keine spezifische Frage gestellt wurde und Vorschläge verfügbar sind, füge sie hinzu
          const lowerMessage = message.toLowerCase().trim();
          const isGeneralQuestion = lowerMessage.length < 20 || 
            lowerMessage.includes('hilfe') || 
            lowerMessage.includes('was kann') || 
            lowerMessage.includes('was gibt') ||
            lowerMessage === 'hallo' ||
            lowerMessage === 'hi';

          if (isGeneralQuestion && proactiveSuggestions && !response.includes('Vorschläge')) {
            response += '\n\n' + proactiveSuggestions;
          }

          return response;
        } catch (openaiError) {
          console.error('OpenAI API Error:', openaiError.message || openaiError);
          // Bei OpenAI-Fehler Fallback verwenden
          let fallbackResponse = this.getFallbackResponse(message, context);
          
          // Füge Vorschläge auch zum Fallback hinzu
          if (proactiveSuggestions) {
            fallbackResponse += '\n\n' + proactiveSuggestions;
          }
          
          return fallbackResponse;
        }
      } else {
        // Fallback wenn OpenAI nicht konfiguriert ist
        console.log('OpenAI API Key nicht konfiguriert, verwende Fallback-Antworten');
        let fallbackResponse = this.getFallbackResponse(message, context);
        
        // Füge Vorschläge auch zum Fallback hinzu
        if (proactiveSuggestions) {
          fallbackResponse += '\n\n' + proactiveSuggestions;
        }
        
        return fallbackResponse;
      }
    } catch (error) {
      console.error('Chatbot Service Error:', error.message || error);
      
      // Bei Fehler Fallback verwenden
      try {
        return this.getFallbackResponse(message, context);
      } catch (fallbackError) {
        console.error('Fallback Error:', fallbackError);
        return 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder nutzen Sie die Hilfe-Dialoge auf den einzelnen Seiten (❓ Symbol).';
      }
    }
  }

  /**
   * Gibt den Status des Chatbots zurück
   */
  async getStatus() {
    return {
      enabled: this.enabled,
      hasApiKey: !!this.openaiApiKey,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      fallbackMode: !this.enabled,
    };
  }
}

module.exports = new ChatbotService();
