/**
 * Chatbot Knowledge Base
 * Dynamische Wissensbasis für den KI-Chatbot
 * Wird automatisch erweitert, wenn neue Module/Funktionen hinzukommen
 */

const featureDiscovery = require('./chatbotFeatureDiscovery');

class ChatbotKnowledgeBase {
  constructor() {
    this.knowledgeBase = {
      // Basis-Funktionen
      features: [
        {
          keywords: ['patient', 'patienten', 'stammdaten'],
          category: 'Patientenverwaltung',
          description: 'Patientenverwaltung und Stammdaten',
          instructions: [
            'Neue Patienten anlegen: Patienten → Neuer Patient',
            'Patienten bearbeiten: Patienten → Patient auswählen → Bearbeiten',
            'Patienten suchen: Suchfeld in der Patientenliste verwenden',
            'Stammdaten verwalten: Patient-Organizer → Tab "Stammdaten"',
            'Blutgruppe erfassen: Patient-Organizer → Vitalwerte oder Stammdaten',
            'Vitalwerte erfassen: Patient-Organizer → Tab "Vitalwerte" → Neue Vitalwerte',
            'Notizen hinzufügen: Patient-Organizer → Tab "Notizen"'
          ]
        },
        {
          keywords: ['termin', 'appointment', 'kalender', 'warteliste'],
          category: 'Terminplanung',
          description: 'Terminplanung und Kalender',
          instructions: [
            'Termin erstellen: Termine → Neuer Termin',
            'Kalender anzeigen: Termine → Kalender',
            'Warteliste verwalten: Termine → Warteliste',
            'Online-Buchungen: Termine → Online-Buchungen',
            'Termine verschieben: Im Kalender per Drag & Drop',
            'Termine löschen: Termin öffnen → Löschen'
          ]
        },
        {
          keywords: ['dokument', 'document', 'brief', 'vorlage', 'template'],
          category: 'Dokumentenverwaltung',
          description: 'Dokumente und Vorlagen',
          instructions: [
            'Dokument erstellen: Dokumente → Neues Dokument',
            'Vorlage verwenden: Beim Erstellen eine Vorlage auswählen',
            'Vorlage erstellen: Template-Verwaltung → Neues Template',
            'Dokumenttypen: Ambulanzbefund, Arztbrief, Überweisung, etc.',
            'Dokument bearbeiten: Dokumente → Dokument auswählen → Bearbeiten',
            'Dokument drucken: Dokument öffnen → Drucken'
          ]
        },
        {
          keywords: ['dekurs', 'dekursvorlage', 'dekurs-vorlage'],
          category: 'Dekurs',
          description: 'Dekurs-Vorlagen und Einträge',
          instructions: [
            'Dekurs anlegen: Patient-Organizer → Tab "Dekurs" → Neuer Dekurs',
            'Dekurs-Vorlage verwenden: Beim Erstellen eine Vorlage auswählen',
            'Dekurs-Vorlage erstellen: Dekurs-Vorlagen-Verwaltung → Neue Vorlage',
            'Dekurs bearbeiten: Patient-Organizer → Tab "Dekurs" → Dekurs auswählen → Bearbeiten',
            'Dekurs-Verlauf anzeigen: Patient-Organizer → Tab "Dekurs" → Verlauf',
            'Schnelleingabe: Patient-Organizer → Tab "Dekurs" → Schnelleingabe',
            'Dekurs drucken: Dekurs öffnen → Drucken'
          ]
        },
        {
          keywords: ['abrechnung', 'billing', 'rechnung', 'kasse', 'wahlarzt', 'privat'],
          category: 'Abrechnung',
          description: 'Abrechnung und Rechnungen',
          instructions: [
            'Rechnung erstellen: Abrechnung → Neuer Patient → Leistungen hinzufügen',
            'Kassenabrechnung: Abrechnung → Kassenarzt → ELDA senden',
            'Wahlarzt-Abrechnung: Abrechnung → Wahlarzt → Rechnung erstellen',
            'Privatabrechnung: Abrechnung → Privat → Rechnung erstellen',
            'Abrechnungsliste: Abrechnung → Abrechnungsliste',
            'Journal: Abrechnung → Journal'
          ]
        },
        {
          keywords: ['diagnose', 'icd', 'icd10'],
          category: 'Diagnosen',
          description: 'ICD-10 Diagnosen',
          instructions: [
            'Diagnose erfassen: Patient-Organizer → Tab "Diagnosen" → Neue Diagnose',
            'ICD-10 Suche: ICD-10 Demo → Suche verwenden',
            'Persönliche Liste: ICD-10 → Persönliche Listen',
            'Diagnose bearbeiten: Diagnose auswählen → Bearbeiten',
            'Diagnose löschen: Diagnose auswählen → Löschen'
          ]
        },
        {
          keywords: ['medikament', 'medikation', 'arznei', 'rezept'],
          category: 'Medikamente',
          description: 'Medikamente und Rezepte',
          instructions: [
            'Medikament erfassen: Patient-Organizer → Tab "Medikamente" → Neues Medikament',
            'Medikamentenkatalog: Medikamente → Katalog durchsuchen',
            'Rezept erstellen: Medikament auswählen → Rezept erstellen',
            'Wechselwirkungen prüfen: Automatisch bei Eingabe',
            'Medikation bearbeiten: Medikament auswählen → Bearbeiten'
          ]
        },
        {
          keywords: ['labor', 'befund', 'lab', 'laborwert'],
          category: 'Labor',
          description: 'Laborbefunde',
          instructions: [
            'Laborbefund importieren: Automatisch wenn Labor-Provider konfiguriert',
            'Manuell erfassen: Patient-Organizer → Tab "Labor" → Neuer Befund',
            'Labor-Provider: Einstellungen → Labor-Provider verwalten',
            'Laborwerte anzeigen: Patient-Organizer → Tab "Labor"',
            'Laborwerte in Timeline: Automatisch angezeigt'
          ]
        },
        {
          keywords: ['dicom', 'bildgebung', 'röntgen', 'mrt', 'ct', 'ultraschall'],
          category: 'DICOM',
          description: 'DICOM-Bildgebung',
          instructions: [
            'DICOM-Studie importieren: Automatisch wenn DICOM-Provider konfiguriert',
            'DICOM hochladen: Patient-Organizer → Tab "DICOM" → Hochladen',
            'DICOM-Provider: Einstellungen → DICOM-Provider verwalten',
            'DICOM anzeigen: Studie auswählen → Viewer öffnen',
            'DICOM in Timeline: Automatisch angezeigt'
          ]
        },
        {
          keywords: ['einstellung', 'settings', 'konfiguration', 'integration'],
          category: 'Einstellungen',
          description: 'System-Einstellungen',
          instructions: [
            'Einstellungen öffnen: Einstellungen im Hauptmenü',
            'ELDA konfigurieren: Einstellungen → ELDA',
            'WAHonline konfigurieren: Einstellungen → WAHonline',
            'E-Mail konfigurieren: Einstellungen → E-Mail',
            'SMS konfigurieren: Einstellungen → SMS',
            'Benutzer verwalten: Einstellungen → Benutzer'
          ]
        },
        {
          keywords: ['benutzer', 'user', 'rolle', 'berechtigung', 'rbac'],
          category: 'Benutzerverwaltung',
          description: 'Benutzer und Berechtigungen',
          instructions: [
            'Benutzer erstellen: Benutzer → Neuer Benutzer',
            'Rollen verwalten: RBAC-Verwaltung → Rollen',
            'Berechtigungen: RBAC-Verwaltung → Berechtigungen',
            'Benutzer bearbeiten: Benutzer → Benutzer auswählen → Bearbeiten',
            'RBAC Discovery: Automatische Erkennung neuer Module'
          ]
        },
        {
          keywords: ['dashboard', 'übersicht', 'statistik'],
          category: 'Dashboard',
          description: 'Dashboard und Übersicht',
          instructions: [
            'Dashboard anzeigen: Dashboard im Hauptmenü',
            'Widgets hinzufügen: Dashboard → Widget hinzufügen',
            'Widgets anpassen: Dashboard → Widget bearbeiten',
            'Statistiken: Automatisch im Dashboard angezeigt',
            'Schnellzugriff: Dashboard → Schnellzugriff-Buttons'
          ]
        },
        {
          keywords: ['elga', 'elektronische', 'patientenakte'],
          category: 'ELGA',
          description: 'ELGA Integration',
          instructions: [
            'ELGA aktivieren: Einstellungen → ELGA',
            'ELGA Dokumente: ELGA → Dokumente anzeigen',
            'ELGA senden: Dokument erstellen → ELGA senden',
            'ELGA Test: ELGA → Teststrecke',
            'ELGA Konfiguration: Einstellungen → ELGA'
          ]
        },
        {
          keywords: ['tarif', 'tariff', 'leistung', 'service'],
          category: 'Leistungen',
          description: 'Leistungen und Tarife',
          instructions: [
            'Leistungen verwalten: Leistungskatalog → Leistungen',
            'Tarife importieren: Tarif-Verwaltung → Import',
            'ÖGK Tarife: Tarif-Verwaltung → ÖGK Download',
            'Leistung hinzufügen: Leistungskatalog → Neue Leistung',
            'Tarif bearbeiten: Tarif-Verwaltung → Tarif auswählen → Bearbeiten'
          ]
        },
        {
          keywords: ['mitarbeiter', 'staff', 'personal', 'arbeitszeit', 'schicht'],
          category: 'Mitarbeiter',
          description: 'Mitarbeiterverwaltung',
          instructions: [
            'Mitarbeiter verwalten: Mitarbeiter → Mitarbeiterliste',
            'Arbeitszeiten: Arbeitszeiten → Neue Arbeitszeit',
            'Schichten verwalten: Arbeitszeiten → Schichten',
            'Abwesenheiten: Abwesenheiten → Neue Abwesenheit',
            'Mitarbeiter hinzufügen: Mitarbeiter → Neuer Mitarbeiter'
          ]
        },
        {
          keywords: ['bericht', 'report', 'statistik', 'auswertung'],
          category: 'Berichte',
          description: 'Berichte und Auswertungen',
          instructions: [
            'Berichte anzeigen: Berichte → Berichtsliste',
            'Bericht ausführen: Bericht auswählen → Ausführen',
            'Abrechnungsberichte: Abrechnung → Berichte',
            'Bericht erstellen: Berichte → Neuer Bericht (Admin)',
            'Bericht exportieren: Bericht ausführen → Exportieren'
          ]
        },
        {
          keywords: ['sicherheit', 'security', 'audit', 'log'],
          category: 'Sicherheit',
          description: 'Sicherheit und Audit',
          instructions: [
            'Sicherheitseinstellungen: Sicherheit → Einstellungen',
            'Zwei-Faktor-Auth: Sicherheit → 2FA aktivieren',
            'Audit-Log: Sicherheit → Audit-Log',
            'Passwort-Richtlinien: Sicherheit → Passwort-Richtlinien',
            'Sicherheits-Audit: Sicherheit → Audit durchführen'
          ]
        },
        {
          keywords: ['ordinationsdaten', 'praxisdaten', 'praxis', 'ordination', 'standort', 'location', 'adresse', 'praxisadresse'],
          category: 'Ordinationsdaten',
          description: 'Ordinations- und Praxisdaten verwalten',
          instructions: [
            'Ordinationsdaten ändern: Einstellungen → Allgemein → Praxisdaten',
            'Standort verwalten: Standort-Verwaltung → Standort auswählen → Bearbeiten',
            'Neuen Standort hinzufügen: Standort-Verwaltung → Neuer Standort',
            'Praxisdaten bearbeiten: Einstellungen → Allgemein → Praxisdaten bearbeiten',
            'Adresse ändern: Einstellungen → Allgemein → Adresse',
            'Kontaktdaten ändern: Einstellungen → Allgemein → Kontaktdaten',
            'Öffnungszeiten: Einstellungen → Allgemein → Öffnungszeiten oder Standort-Verwaltung → Öffnungszeiten'
          ]
        },
        {
          keywords: ['standort', 'location', 'standorte', 'locations'],
          category: 'Standort-Verwaltung',
          description: 'Standorte und Praxen verwalten',
          instructions: [
            'Standorte anzeigen: Standort-Verwaltung im Hauptmenü',
            'Standort hinzufügen: Standort-Verwaltung → Neuer Standort',
            'Standort bearbeiten: Standort-Verwaltung → Standort auswählen → Bearbeiten',
            'Standort löschen: Standort-Verwaltung → Standort auswählen → Löschen',
            'Standort-Öffnungszeiten: Standort-Verwaltung → Standort → Öffnungszeiten',
            'Mitarbeiter zuordnen: Standort-Verwaltung → Standort → Mitarbeiter'
          ]
        }
      ],

      // Dokumenttypen
      documentTypes: [
        'Ambulanzbefund', 'Arztbrief', 'Überweisung', 'Arbeitsunfähigkeitsbescheinigung',
        'Rezept', 'Laborbefund', 'Röntgenbefund', 'Entlassungsbrief',
        'Krankenhausbrief', 'Fachärztlicher Befund', 'Dekurs-Vorlage',
        'Patientenbrief', 'Mitteilung', 'Anamnese', 'Befundbericht',
        'Therapieplan', 'Verlauf', 'Epikrise', 'Konsil', 'Attest'
      ],

      // Häufige Fragen
      faq: [
        {
          question: 'Wie erstelle ich einen neuen Patienten?',
          answer: 'Gehen Sie zu "Patienten" im Hauptmenü, klicken Sie auf "Neuer Patient" und füllen Sie die Stammdaten aus.'
        },
        {
          question: 'Wie plane ich einen Termin?',
          answer: 'Gehen Sie zu "Termine", klicken Sie auf "Neuer Termin", wählen Sie Patient, Datum, Uhrzeit und Art, dann speichern.'
        },
        {
          question: 'Wie erstelle ich eine Rechnung?',
          answer: 'Gehen Sie zu "Abrechnung", wählen Sie den Patienten, fügen Sie Leistungen hinzu, wählen Sie die Abrechnungsart und erstellen Sie die Rechnung.'
        },
        {
          question: 'Wie erfasse ich Vitalwerte?',
          answer: 'Öffnen Sie den Patient-Organizer, gehen Sie zum Tab "Vitalwerte" und klicken Sie auf "Neue Vitalwerte".'
        },
        {
          question: 'Wie konfiguriere ich ELDA?',
          answer: 'Gehen Sie zu "Einstellungen" → "ELDA" und konfigurieren Sie die ELDA-Verbindung.'
        }
      ]
    };
  }

  /**
   * Erweitert die Wissensbasis dynamisch basierend auf verfügbaren Modulen
   */
  async discoverModules() {
    try {
      console.log('🔍 Starte vollständige Feature-Erkennung...');
      
      // Verwende den Feature Discovery Service für vollständige Erkennung
      const discoveredFeatures = await featureDiscovery.discoverAllFeatures();
      
      console.log(`✅ ${discoveredFeatures.length} Features entdeckt`);

      // Füge alle entdeckten Features zur Wissensbasis hinzu
      discoveredFeatures.forEach(feature => {
        // Prüfe ob Feature bereits existiert
        const existing = this.knowledgeBase.features.find(
          f => f.category.toLowerCase() === feature.category.toLowerCase()
        );

        if (!existing) {
          // Neues Feature hinzufügen
          this.knowledgeBase.features.push({
            keywords: feature.keywords,
            category: feature.category,
            description: feature.description,
            instructions: feature.instructions
          });
        } else {
          // Existierendes Feature erweitern
          existing.keywords = [...new Set([...existing.keywords, ...feature.keywords])];
          existing.instructions = [...new Set([...existing.instructions, ...feature.instructions])];
        }
      });

      // Kategorisiere Features für bessere Organisation
      const categorized = featureDiscovery.categorizeFeatures(this.knowledgeBase.features);
      console.log('📊 Feature-Kategorien:', Object.keys(categorized).map(k => `${k}: ${categorized[k].length}`).join(', '));

      console.log(`✨ Knowledge Base erweitert: ${this.knowledgeBase.features.length} Features insgesamt`);
    } catch (error) {
      console.error('Error discovering modules:', error);
    }
  }

  /**
   * Formatiert einen Routennamen zu einem Feature-Namen
   * @deprecated Verwende featureDiscovery.formatFeatureName() stattdessen
   */
  formatFeatureName(route) {
    return featureDiscovery.formatFeatureName(route);
  }

  /**
   * Findet relevante Informationen für eine Frage
   */
  findRelevantKnowledge(message) {
    const lowerMessage = message.toLowerCase();
    const relevantFeatures = [];
    const relevantFAQ = [];
    const keywordMatches = new Map(); // Für Scoring

    // Erweiterte Suche nach relevanten Features
    this.knowledgeBase.features.forEach(feature => {
      let matchScore = 0;
      
      // Prüfe Keywords
      feature.keywords.forEach(keyword => {
        if (lowerMessage.includes(keyword)) {
          matchScore += keyword.length; // Längere Keywords = höhere Relevanz
        }
      });

      // Prüfe Category
      if (lowerMessage.includes(feature.category.toLowerCase())) {
        matchScore += 10;
      }

      // Prüfe Description
      if (lowerMessage.includes(feature.description.toLowerCase())) {
        matchScore += 5;
      }

      if (matchScore > 0) {
        relevantFeatures.push({
          ...feature,
          matchScore: matchScore
        });
        keywordMatches.set(feature.category, matchScore);
      }
    });

    // Sortiere nach Relevanz
    relevantFeatures.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    // Suche nach relevanten FAQ
    this.knowledgeBase.faq.forEach(faq => {
      const questionLower = faq.question.toLowerCase();
      const answerLower = faq.answer.toLowerCase();
      
      if (lowerMessage.includes(questionLower.substring(0, 10)) ||
          questionLower.includes(lowerMessage.substring(0, 10)) ||
          answerLower.includes(lowerMessage)) {
        relevantFAQ.push(faq);
      }
    });

    return {
      features: relevantFeatures.slice(0, 10), // Top 10 relevanteste Features
      faq: relevantFAQ,
      documentTypes: this.knowledgeBase.documentTypes.filter(doc => 
        lowerMessage.includes(doc.toLowerCase())
      ),
      totalFeatures: this.knowledgeBase.features.length
    };
  }

  /**
   * Generiert einen erweiterten System-Prompt mit allen verfügbaren Informationen
   */
  generateEnhancedSystemPrompt(context, relevantKnowledge) {
    let prompt = `Du bist ein hilfreicher KI-Assistent für MyMediCloud MMC, eine österreichische Ordinationssoftware für niedergelassene Ärztinnen und Ärzte.

Deine Hauptaufgaben:
- Beantwortung von Fragen zur Software-Nutzung
- Bereitstellung von Hilfe und Anleitungen
- Unterstützung bei der Navigation in der Software
- Erklärung von Funktionen und Features

Aktueller Kontext:
- Seite: ${context.page || 'Allgemein'}
- Pfad: ${context.path || ''}
`;

    // Füge relevante Features hinzu
    if (relevantKnowledge.features.length > 0) {
      prompt += '\n\nRelevante Funktionen für diese Frage:\n';
      relevantKnowledge.features.forEach(feature => {
        prompt += `\n**${feature.category}**:\n`;
        feature.instructions.forEach(instruction => {
          prompt += `- ${instruction}\n`;
        });
      });
    }

    // Füge alle verfügbaren Features hinzu (kategorisiert)
    const categorized = featureDiscovery.categorizeFeatures(this.knowledgeBase.features);
    prompt += '\n\nVerfügbare Hauptfunktionen in MyMediCloud MMC:\n';
    
    Object.keys(categorized).forEach(category => {
      if (categorized[category].length > 0) {
        prompt += `\n**${category}:**\n`;
        categorized[category].slice(0, 10).forEach(feature => {
          prompt += `- ${feature.category}: ${feature.description}\n`;
        });
        if (categorized[category].length > 10) {
          prompt += `  ... und ${categorized[category].length - 10} weitere\n`;
        }
      }
    });
    
    prompt += `\n**Gesamt:** ${this.knowledgeBase.features.length} verfügbare Features\n`;

    // Füge Dokumenttypen hinzu
    prompt += '\n\nVerfügbare Dokumenttypen:\n';
    this.knowledgeBase.documentTypes.forEach(doc => {
      prompt += `- ${doc}\n`;
    });

    prompt += `
Wichtige Hinweise:
- Antworte immer auf Deutsch
- Sei präzise und hilfreich
- Wenn du etwas nicht weißt, gib das ehrlich zu
- Verweise auf relevante Funktionen in der Software
- Beachte die österreichischen medizinischen Standards und Vorschriften
- Keine medizinischen Diagnosen oder Behandlungsempfehlungen geben
- Nutze die Hilfe-Dialoge (❓ Symbol) als zusätzliche Ressource
`;

    return prompt;
  }

  /**
   * Erweitert die Wissensbasis mit neuen Informationen
   */
  addFeature(feature) {
    const exists = this.knowledgeBase.features.find(
      f => f.category === feature.category
    );
    if (!exists) {
      this.knowledgeBase.features.push(feature);
    }
  }

  /**
   * Erweitert die Wissensbasis mit neuen FAQ
   */
  addFAQ(question, answer) {
    this.knowledgeBase.faq.push({ question, answer });
  }

  /**
   * Gibt die gesamte Wissensbasis zurück
   */
  getKnowledgeBase() {
    return this.knowledgeBase;
  }
}

module.exports = new ChatbotKnowledgeBase();
