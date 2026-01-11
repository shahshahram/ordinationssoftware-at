# Leitfaden: Leistungen

Dieser Leitfaden erklärt alle Funktionen und Unterpunkte im Bereich "Leistungen" der Ordinationssoftware.

## Inhaltsverzeichnis

1. [Leistungskatalog](#1-leistungskatalog)
2. [Service-Kategorien](#2-service-kategorien)
3. [Buchungen](#3-buchungen)
4. [Ressourcen](#4-ressourcen)

---

## 1. Leistungskatalog

**Pfad:** `Einstellungen > Leistungen > Leistungskatalog`  
**URL:** `/service-catalog`

### Übersicht

Der Leistungskatalog ist das zentrale Verwaltungstool für alle medizinischen Leistungen und Services in der Ordinationssoftware. Hier können Sie Leistungen erstellen, bearbeiten, kategorisieren und konfigurieren.

### Hauptfunktionen

#### 1.1 Leistung erstellen

**Schritte:**
1. Klicken Sie auf den Button **"+ Neue Leistung"**
2. Füllen Sie das Formular aus:

   **Grunddaten:**
   - **Code**: Eindeutiger Leistungscode (z.B. "K001")
   - **Name**: Name der Leistung (z.B. "Konsultation")
   - **Beschreibung**: Detaillierte Beschreibung (optional)
   - **Kategorie**: Zugehörige Service-Kategorie
   - **Standort**: Standort, an dem die Leistung verfügbar ist
   - **Medizinisch**: Ist dies eine medizinische Leistung?
   - **Fachrichtung**: Medizinische Fachrichtung (z.B. Allgemeinmedizin, Chirurgie)

   **Zeit & Dauer:**
   - **Grunddauer (Minuten)**: Standard-Dauer der Leistung (z.B. 30)
   - **Puffer Vorher (Minuten)**: Vorbereitungszeit vor der Leistung
   - **Puffer Nachher (Minuten)**: Nachbereitungszeit nach der Leistung

   **Personal:**
   - **Zugewiesene Benutzer**: Welche Mitarbeiter können diese Leistung durchführen?
   - **Benutzer-Auswahl erforderlich**: Muss bei Terminbuchung ein Mitarbeiter ausgewählt werden?
   - **Erforderliche Rolle**: Minimale Rolle (z.B. Arzt, Therapeut)

   **Geräte:**
   - **Zugewiesene Geräte**: Welche Geräte werden für diese Leistung benötigt?
   - **Geräte-Auswahl erforderlich**: Muss bei Terminbuchung ein Gerät ausgewählt werden?
   - **Anzahl benötigter Geräte**: Wie viele Geräte werden benötigt?
   - **Gerätetyp (für Typ-basierte Auswahl)**: Gerätetyp (z.B. "Ultraschall", "Laser")
   - **Auswahlmodus**: "Spezifisch" (konkrete Geräte) oder "Typ" (nach Gerätetyp)
   - **Max. verfügbare Geräte**: Maximale Anzahl (optional)

   **Räume:**
   - **Zugewiesene Räume**: Welche Räume werden für diese Leistung benötigt?
   - **Raum-Auswahl erforderlich**: Muss bei Terminbuchung ein Raum ausgewählt werden?
   - **Anzahl benötigter Räume**: Wie viele Räume werden benötigt?
   - **Raumtyp (für Typ-basierte Auswahl)**: Raumtyp (z.B. "treatment", "consultation")
   - **Auswahlmodus**: "Spezifisch" (konkrete Räume) oder "Typ" (nach Raumtyp)
   - **Max. verfügbare Räume**: Maximale Anzahl (optional)

   **Preis & Abrechnung:**
   - **Preis (€)**: Preis der Leistung in Euro
   - **Abrechnungscode**: Code für die Abrechnung
   - **Abrechnungstyp**: Kassenarzt, Wahlarzt, Privat oder Beides
   - **OGK-EBM-Code**: EBM-Code für ÖGK-Abrechnung
   - **OGK-Preis**: Preis für ÖGK-Abrechnung
   - **Wahlarzt-Preis**: Preis für Wahlarzt
   - **Privat-Preis**: Preis für Privatpatienten

   **Online-Buchung:**
   - **Online buchbar**: Kann diese Leistung online gebucht werden?
   - **Bestätigung erforderlich**: Muss die Buchung bestätigt werden?
   - **Terminbestätigung erforderlich**: Muss der Termin bestätigt werden?
   - **Max. Warteliste**: Maximale Anzahl auf der Warteliste

   **Patienteneignung:**
   - **Mindestalter (Jahre)**: Mindestalter für die Leistung
   - **Höchstalter (Jahre)**: Höchstalter für die Leistung
   - **Einverständnis erforderlich**: Muss der Patient ein Einverständnis geben?

   **Sonstiges:**
   - **Aktiv**: Ist die Leistung aktiv?
   - **Farbe**: Farbe für Kalender-Darstellung
   - **Schnellauswahl**: Soll die Leistung in der Schnellauswahl erscheinen?

3. Klicken Sie auf **"Speichern"**

#### 1.2 Leistung bearbeiten

**Schritte:**
1. Suchen Sie die gewünschte Leistung in der Liste
2. Klicken Sie auf das **Bearbeiten-Icon** (Stift) in der Zeile
3. Nehmen Sie die gewünschten Änderungen vor
4. Klicken Sie auf **"Speichern"**

#### 1.3 Leistung löschen

**Schritte:**
1. Suchen Sie die gewünschte Leistung in der Liste
2. Klicken Sie auf das **Löschen-Icon** (Papierkorb) in der Zeile
3. Bestätigen Sie die Löschung

**Hinweis:** Gelöschte Leistungen können nicht wiederhergestellt werden. Stattdessen können Sie eine Leistung als "Inaktiv" markieren.

#### 1.4 Leistung suchen und filtern

**Suchfunktion:**
- Geben Sie einen Suchbegriff in das Suchfeld ein
- Die Suche durchsucht Code, Name und Beschreibung

**Filter:**
- **Standort**: Filtert nach Standort
- **Kategorie**: Filtert nach Service-Kategorie
- **Rolle**: Filtert nach erforderlicher Rolle
- **Fachrichtung**: Filtert nach medizinischer Fachrichtung

#### 1.5 Tabs im Leistungsformular

**Tab 1: Grunddaten**
- Code, Name, Beschreibung
- Kategorie, Standort
- Medizinisch, Fachrichtung

**Tab 2: Personal**
- Zugewiesene Benutzer
- Benutzer-Auswahl erforderlich
- Erforderliche Rolle

**Tab 3: Geräte**
- Zugewiesene Geräte
- Geräte-Auswahl erforderlich
- Typ-basierte Auswahl
- Anzahl benötigter Geräte

**Tab 4: Räume**
- Zugewiesene Räume
- Raum-Auswahl erforderlich
- Typ-basierte Auswahl
- Anzahl benötigter Räume

**Tab 5: Zeit & Dauer**
- Grunddauer
- Pufferzeiten (Vorher/Nachher)
- Parallelisierung

**Tab 6: Preis & Abrechnung**
- Preis
- Abrechnungscode
- Abrechnungstyp
- OGK/Wahlarzt/Privat-Preise

**Tab 7: Online-Buchung**
- Online buchbar
- Bestätigung erforderlich
- Online-Kontingente
- Anamnese-Fragen

**Tab 8: Patienteneignung**
- Altersgrenzen
- Einverständnis erforderlich

#### 1.6 Typ-basierte Geräte/Räume-Auswahl

**Konzept:**
Statt konkrete Geräte/Räume zuzuweisen, können Sie einen Geräte- oder Raumtyp angeben. Das System prüft dann automatisch, ob genügend Geräte/Räume dieses Typs verfügbar sind.

**Beispiel:**
- Service: "Ultraschall-Untersuchung"
- Gerätetyp: "Ultraschall"
- Auswahlmodus: "Typ"
- Anzahl benötigt: 1

Das System prüft dann, ob mindestens 1 Ultraschall-Gerät verfügbar ist, ohne dass Sie konkrete Geräte zuweisen müssen.

**Vorteile:**
- Flexibler: Jedes verfügbare Gerät des Typs kann verwendet werden
- Automatische Verfügbarkeitsprüfung
- Einfache Verwaltung bei mehreren Geräten desselben Typs

#### 1.7 Online-Kontingente

**Zweck:**
Begrenzen Sie die Anzahl der Online-Buchungen für bestimmte Zeitfenster.

**Konfiguration:**
- **Zeitfenster**: Start- und Endzeit (z.B. 09:00 - 12:00)
- **Wochentage**: An welchen Tagen gilt das Kontingent?
- **Max. Online-Buchungen**: Maximale Anzahl
- **Priorität**: Priorität des Kontingents
- **Beschreibung**: Beschreibung des Kontingents
- **Aktiv**: Ist das Kontingent aktiv?

**Beispiel:**
- Zeitfenster: 09:00 - 12:00
- Wochentage: Montag, Dienstag, Mittwoch
- Max. Online-Buchungen: 5
- → Maximal 5 Online-Buchungen pro Tag in diesem Zeitfenster

#### 1.8 Anamnese-Fragen

**Zweck:**
Definieren Sie Fragen, die Patienten bei der Online-Buchung beantworten müssen.

**Fragentypen:**
- **Text**: Einzeilige Texteingabe
- **Textarea**: Mehrzeilige Texteingabe
- **Number**: Zahlenwert
- **Boolean**: Ja/Nein
- **Select**: Einzelauswahl aus Optionen
- **Multiselect**: Mehrfachauswahl aus Optionen

**Konfiguration:**
- **Frage**: Text der Frage
- **Typ**: Fragentyp
- **Optionen**: Verfügbare Optionen (bei Select/Multiselect)
- **Erforderlich**: Muss die Frage beantwortet werden?
- **Standardwert**: Voreingestellter Wert

### Häufige Aufgaben

#### Leistung für Online-Buchung aktivieren
1. Leistung bearbeiten
2. Tab "Online-Buchung" öffnen
3. "Online buchbar" aktivieren
4. Speichern

#### Geräte einer Leistung zuweisen
1. Leistung bearbeiten
2. Tab "Geräte" öffnen
3. Geräte aus der Liste auswählen
4. "Geräte-Auswahl erforderlich" aktivieren (falls gewünscht)
5. Speichern

#### Pufferzeiten konfigurieren
1. Leistung bearbeiten
2. Tab "Zeit & Dauer" öffnen
3. "Puffer Vorher" und "Puffer Nachher" eingeben
4. Speichern

**Beispiel:**
- Grunddauer: 30 Minuten
- Puffer Vorher: 5 Minuten
- Puffer Nachher: 10 Minuten
- → Gesamtdauer: 45 Minuten (5 + 30 + 10)

---

## 2. Service-Kategorien

**Pfad:** `Einstellungen > Leistungen > Service-Kategorien`  
**URL:** `/service-categories`

### Übersicht

Service-Kategorien helfen dabei, Leistungen zu organisieren und zu gruppieren. Sie können hierarchische Kategorien erstellen (Hauptkategorien und Unterkategorien).

### Hauptfunktionen

#### 2.1 Kategorie erstellen

**Schritte:**
1. Klicken Sie auf den Button **"+ Neue Kategorie"**
2. Füllen Sie das Formular aus:
   - **Name**: Name der Kategorie (z.B. "Konsultationen")
   - **Code**: Eindeutiger Code (z.B. "KONS")
   - **Übergeordnete Kategorie**: Übergeordnete Kategorie (optional, für Hierarchien)
   - **Farbe**: Farbe für die Darstellung
   - **Sortierreihenfolge**: Reihenfolge in der Liste
   - **Sichtbar für Rollen**: Welche Rollen können diese Kategorie sehen?
   - **Beschreibung**: Beschreibung der Kategorie
   - **Aktiv**: Ist die Kategorie aktiv?
3. Klicken Sie auf **"Speichern"**

#### 2.2 Kategorie bearbeiten

**Schritte:**
1. Suchen Sie die gewünschte Kategorie in der Liste
2. Klicken Sie auf das **Bearbeiten-Icon** (Stift)
3. Nehmen Sie die gewünschten Änderungen vor
4. Klicken Sie auf **"Speichern"**

#### 2.3 Kategorie löschen

**Schritte:**
1. Suchen Sie die gewünschte Kategorie in der Liste
2. Klicken Sie auf das **Löschen-Icon** (Papierkorb)
3. Bestätigen Sie die Löschung

**Hinweis:** Kategorien können nur gelöscht werden, wenn keine Leistungen mehr zugeordnet sind.

#### 2.4 Ansichten

**Listenansicht:**
- Zeigt alle Kategorien in einer flachen Liste
- Gut für Suche und Filterung

**Baumansicht:**
- Zeigt Kategorien hierarchisch (Haupt- und Unterkategorien)
- Gut für Übersicht über Kategorienstruktur

#### 2.5 Hierarchische Kategorien

**Beispiel:**
```
Konsultationen (Hauptkategorie)
  ├── Allgemeine Konsultation (Unterkategorie)
  ├── Spezialkonsultation (Unterkategorie)
  └── Notfallkonsultation (Unterkategorie)

Behandlungen (Hauptkategorie)
  ├── Physiotherapie (Unterkategorie)
  └── Massage (Unterkategorie)
```

**Erstellen:**
1. Erstellen Sie zuerst die Hauptkategorie
2. Erstellen Sie dann die Unterkategorien
3. Wählen Sie bei den Unterkategorien die Hauptkategorie als "Übergeordnete Kategorie"

### Häufige Aufgaben

#### Kategorie für bestimmte Rollen sichtbar machen
1. Kategorie bearbeiten
2. "Sichtbar für Rollen" auswählen
3. Gewünschte Rollen auswählen (z.B. nur "Arzt")
4. Speichern

#### Kategorien sortieren
1. Kategorie bearbeiten
2. "Sortierreihenfolge" anpassen (niedrigere Zahl = weiter oben)
3. Speichern

---

## 3. Buchungen

**Pfad:** `Einstellungen > Leistungen > Buchungen`  
**URL:** `/service-bookings`

### Übersicht

Die Buchungsverwaltung zeigt alle Service-Buchungen an, die über das Service-Booking-System erstellt wurden. Dies unterscheidet sich von normalen Terminen und ist speziell für Service-orientierte Buchungen gedacht.

### Hauptfunktionen

#### 3.1 Buchungen anzeigen

**Filter:**
- **Status**: Geplant, Bestätigt, In Bearbeitung, Abgeschlossen, Storniert, Nicht erschienen
- **Buchungstyp**: Online, Intern, Telefon, Walk-In
- **Standort**: Filter nach Standort
- **Service**: Filter nach Service
- **Mitarbeiter**: Filter nach zugewiesenem Mitarbeiter
- **Datum**: Filter nach Datum

#### 3.2 Buchung erstellen

**Schritte:**
1. Klicken Sie auf den Button **"+ Neue Buchung"**
2. Füllen Sie das Formular aus:
   - **Service**: Wählen Sie einen Service aus
   - **Patient**: Wählen Sie einen Patienten aus
   - **Standort**: Wählen Sie einen Standort aus
   - **Mitarbeiter**: Wählen Sie einen Mitarbeiter aus
   - **Startzeit**: Wählen Sie Startzeit und Datum
   - **Endzeit**: Wird automatisch basierend auf Service-Dauer berechnet
   - **Buchungstyp**: Online, Intern, Telefon oder Walk-In
   - **Status**: Geplant, Bestätigt, etc.
   - **Notizen**: Interne Notizen
   - **Einverständnis**: Hat der Patient einverstanden?
3. Klicken Sie auf **"Speichern"**

#### 3.3 Buchung bearbeiten

**Schritte:**
1. Suchen Sie die gewünschte Buchung in der Liste
2. Klicken Sie auf das **Bearbeiten-Icon** (Stift)
3. Nehmen Sie die gewünschten Änderungen vor
4. Klicken Sie auf **"Speichern"**

#### 3.4 Buchung stornieren

**Schritte:**
1. Suchen Sie die gewünschte Buchung in der Liste
2. Klicken Sie auf das **Bearbeiten-Icon** (Stift)
3. Ändern Sie den Status auf "Storniert"
4. Geben Sie einen Stornierungsgrund ein (optional)
5. Speichern

#### 3.5 Buchungsstatus ändern

**Status-Optionen:**
- **Geplant**: Buchung ist geplant, aber noch nicht bestätigt
- **Bestätigt**: Buchung ist bestätigt
- **In Bearbeitung**: Service wird gerade durchgeführt
- **Abgeschlossen**: Service ist abgeschlossen
- **Storniert**: Buchung wurde storniert
- **Nicht erschienen**: Patient ist nicht erschienen

**Status ändern:**
1. Buchung bearbeiten
2. Status auswählen
3. Speichern

#### 3.6 Abrechnungsstatus

**Status-Optionen:**
- **Nicht abgerechnet**: Noch nicht abgerechnet
- **Abgerechnet**: Bereits abgerechnet
- **Teilweise abgerechnet**: Teilweise abgerechnet
- **Storniert**: Abrechnung storniert

**Abrechnungsbetrag:**
- Wird automatisch aus dem Service-Preis übernommen
- Kann manuell angepasst werden

### Häufige Aufgaben

#### Buchung für Patienten erstellen
1. "+ Neue Buchung" klicken
2. Service und Patient auswählen
3. Zeitpunkt wählen
4. Speichern

#### Buchungsstatus auf "Abgeschlossen" setzen
1. Buchung bearbeiten
2. Status auf "Abgeschlossen" ändern
3. Speichern

#### Buchung stornieren
1. Buchung bearbeiten
2. Status auf "Storniert" ändern
3. Stornierungsgrund eingeben
4. Speichern

---

## 4. Ressourcen

**Pfad:** `Einstellungen > Leistungen > Ressourcen`  
**URL:** `/resources`

### Übersicht

Die Ressourcenverwaltung ermöglicht es, Räume, Geräte, Services und Personal als Ressourcen zu verwalten. Dies ist eine alternative Verwaltungsmethode zu den spezifischen Verwaltungsseiten für Geräte und Räume.

### Hauptfunktionen

#### 4.1 Ressource erstellen

**Schritte:**
1. Klicken Sie auf den Button **"+ Neue Ressource"**
2. Wählen Sie den **Typ**:
   - **Raum**: Räumliche Ressource
   - **Gerät**: Equipment/Gerät
   - **Service**: Service-Ressource
   - **Personal**: Personal-Ressource

3. Füllen Sie das Formular aus:

   **Grunddaten:**
   - **Name**: Name der Ressource
   - **Kategorie**: Kategorie (z.B. "Laser", "Ultraschall" für Geräte)
   - **Beschreibung**: Beschreibung der Ressource
   - **Aktiv**: Ist die Ressource aktiv?

   **Online-Buchung (optional):**
   - **Online-Buchung aktiviert**: Kann die Ressource online gebucht werden?
   - **Vorausbuchung (Tage)**: Wie viele Tage im Voraus kann gebucht werden?
   - **Max. Vorausbuchung (Tage)**: Maximale Vorausbuchung
   - **Min. Vorausbuchung (Stunden)**: Minimale Vorausbuchung
   - **Arbeitszeiten**: Arbeitszeiten pro Wochentag
   - **Pausenzeiten**: Pausenzeiten
   - **Gesperrte Daten**: Daten, an denen die Ressource nicht verfügbar ist
   - **Max. gleichzeitige Buchungen**: Wie viele gleichzeitige Buchungen sind möglich?
   - **Dauer (Minuten)**: Standard-Dauer
   - **Preis**: Preis für Online-Buchung
   - **Bestätigung erforderlich**: Muss die Buchung bestätigt werden?

   **Eigenschaften (je nach Typ):**
   
   **Für Räume:**
   - **Kapazität**: Maximale Anzahl Personen
   - **Standort**: Standort der Ressource
   - **Etage**: Etage
   - **Barrierefrei**: Ist der Raum barrierefrei?

   **Für Geräte:**
   - **Marke**: Hersteller
   - **Modell**: Modellbezeichnung
   - **Seriennummer**: Seriennummer
   - **Wartungsdatum**: Letztes Wartungsdatum
   - **Status**: Verfügbar, Wartung, Außer Betrieb

   **Für Personal:**
   - **Spezialisierung**: Medizinische Spezialisierung
   - **Titel**: Titel (z.B. "Dr.")
   - **Qualifikationen**: Liste von Qualifikationen
   - **Sprachen**: Gesprochene Sprachen
   - **Erfahrung**: Berufserfahrung

4. Klicken Sie auf **"Speichern"**

#### 4.2 Ressource bearbeiten

**Schritte:**
1. Suchen Sie die gewünschte Ressource in der Liste
2. Klicken Sie auf das **Bearbeiten-Icon** (Stift)
3. Nehmen Sie die gewünschten Änderungen vor
4. Klicken Sie auf **"Speichern"**

#### 4.3 Ressource löschen

**Schritte:**
1. Suchen Sie die gewünschte Ressource in der Liste
2. Klicken Sie auf das **Löschen-Icon** (Papierkorb)
3. Bestätigen Sie die Löschung

#### 4.4 Ressource suchen und filtern

**Suchfunktion:**
- Geben Sie einen Suchbegriff in das Suchfeld ein
- Die Suche durchsucht Name, Kategorie und Beschreibung

**Filter:**
- **Typ**: Filter nach Ressourcentyp (Raum, Gerät, Service, Personal)
- **Kategorie**: Filter nach Kategorie
- **Aktiv**: Filter nach aktiv/inaktiv
- **Online-Buchung**: Filter nach Online-Buchbarkeit

#### 4.5 Tabs im Ressourcenformular

**Tab 1: Grunddaten**
- Name, Typ, Kategorie
- Beschreibung
- Aktiv-Status

**Tab 2: Online-Buchung**
- Online-Buchung aktivieren
- Vorausbuchungszeiten
- Arbeitszeiten
- Pausenzeiten
- Gesperrte Daten
- Preis

**Tab 3: Eigenschaften**
- Typ-spezifische Eigenschaften
- Je nach Typ unterschiedliche Felder

#### 4.6 Arbeitszeiten konfigurieren

**Für jeden Wochentag:**
- **Arbeiten**: Ist die Ressource an diesem Tag verfügbar?
- **Startzeit**: Beginn der Verfügbarkeit (z.B. "09:00")
- **Endzeit**: Ende der Verfügbarkeit (z.B. "17:00")

**Beispiel:**
- Montag: 09:00 - 17:00
- Dienstag: 09:00 - 17:00
- Mittwoch: 09:00 - 12:00
- Donnerstag: 09:00 - 17:00
- Freitag: 09:00 - 17:00
- Samstag: Nicht verfügbar
- Sonntag: Nicht verfügbar

#### 4.7 Pausenzeiten konfigurieren

**Pausenzeiten:**
- **Startzeit**: Beginn der Pause (z.B. "12:00")
- **Endzeit**: Ende der Pause (z.B. "13:00")
- **Tage**: An welchen Tagen gilt die Pause?

**Beispiel:**
- Pause: 12:00 - 13:00
- Tage: Montag, Dienstag, Mittwoch, Donnerstag, Freitag
- → Mittagspause von Mo-Fr

### Häufige Aufgaben

#### Gerät als Ressource anlegen
1. "+ Neue Ressource" klicken
2. Typ "Gerät" wählen
3. Name und Kategorie eingeben (z.B. "Laser", Kategorie: "Laser")
4. Eigenschaften ausfüllen (Marke, Modell, etc.)
5. Speichern

**Wichtig:** Die Kategorie wird für die Typ-basierte Geräteauswahl in Services verwendet!

#### Raum als Ressource anlegen
1. "+ Neue Ressource" klicken
2. Typ "Raum" wählen
3. Name und Kategorie eingeben (z.B. "Behandlungsraum 1", Kategorie: "treatment")
4. Eigenschaften ausfüllen (Kapazität, Standort, etc.)
5. Speichern

**Wichtig:** Die Kategorie wird für die Typ-basierte Raumauswahl in Services verwendet!

#### Online-Buchung für Ressource aktivieren
1. Ressource bearbeiten
2. Tab "Online-Buchung" öffnen
3. "Online-Buchung aktiviert" aktivieren
4. Arbeitszeiten konfigurieren
5. Preis eingeben (optional)
6. Speichern

#### Ressource für bestimmte Zeit sperren
1. Ressource bearbeiten
2. Tab "Online-Buchung" öffnen
3. "Gesperrte Daten" öffnen
4. Datum hinzufügen
5. Speichern

### Typ-basierte Auswahl in Services

**Wichtig:** Wenn Sie Ressourcen mit Kategorien anlegen, können Sie diese in Services für die Typ-basierte Auswahl verwenden.

**Beispiel:**
1. Legen Sie 3 Laser-Geräte als Ressourcen an:
   - Ressource 1: Typ "Gerät", Kategorie "Laser", Name "Laser A"
   - Ressource 2: Typ "Gerät", Kategorie "Laser", Name "Laser B"
   - Ressource 3: Typ "Gerät", Kategorie "Laser", Name "Laser C"

2. Erstellen Sie einen Service:
   - Service: "Laser-Behandlung"
   - Gerätetyp: "Laser"
   - Auswahlmodus: "Typ"
   - Anzahl benötigt: 1

3. Das System prüft automatisch, ob mindestens 1 Laser-Gerät verfügbar ist, ohne dass Sie konkrete Geräte zuweisen müssen.

---

## Best Practices

### Leistungskatalog

1. **Konsistente Codierung**: Verwenden Sie ein einheitliches Codierungssystem (z.B. "K001", "K002" für Konsultationen)

2. **Kategorien nutzen**: Ordnen Sie Leistungen in Kategorien ein, um die Übersicht zu behalten

3. **Pufferzeiten realistisch setzen**: Berücksichtigen Sie Vor- und Nachbereitungszeiten

4. **Online-Buchung gezielt aktivieren**: Nicht alle Leistungen müssen online buchbar sein

5. **Preise aktuell halten**: Aktualisieren Sie Preise regelmäßig

### Service-Kategorien

1. **Hierarchien nutzen**: Erstellen Sie Haupt- und Unterkategorien für bessere Organisation

2. **Farben verwenden**: Nutzen Sie Farben zur visuellen Unterscheidung

3. **Sortierreihenfolge**: Verwenden Sie Sortierreihenfolgen für logische Anordnung

### Buchungen

1. **Status aktuell halten**: Aktualisieren Sie Buchungsstatus regelmäßig

2. **Notizen verwenden**: Nutzen Sie Notizen für wichtige Informationen

3. **Abrechnungsstatus prüfen**: Überwachen Sie den Abrechnungsstatus

### Ressourcen

1. **Kategorien konsistent verwenden**: Verwenden Sie einheitliche Kategorienamen für Typ-basierte Auswahl

2. **Arbeitszeiten realistisch setzen**: Konfigurieren Sie realistische Arbeitszeiten

3. **Wartungszeiten berücksichtigen**: Sperren Sie Ressourcen für Wartungszeiten

4. **Online-Buchung gezielt aktivieren**: Nicht alle Ressourcen müssen online buchbar sein

---

## Häufige Probleme und Lösungen

### Problem: Leistung erscheint nicht in der Online-Buchung

**Lösung:**
1. Prüfen Sie, ob "Online buchbar" aktiviert ist
2. Prüfen Sie, ob die Leistung aktiv ist
3. Prüfen Sie, ob ein Arzt für die Leistung zugewiesen ist
4. Prüfen Sie, ob der Arzt Online-Buchung aktiviert hat

### Problem: Gerät wird nicht als verfügbar erkannt

**Lösung:**
1. Prüfen Sie, ob das Gerät aktiv ist
2. Prüfen Sie, ob das Gerät dem Service zugewiesen ist
3. Prüfen Sie, ob die Kategorie korrekt ist (bei Typ-basierter Auswahl)
4. Prüfen Sie, ob das Gerät bereits belegt ist

### Problem: Buchung kann nicht erstellt werden

**Lösung:**
1. Prüfen Sie, ob alle erforderlichen Felder ausgefüllt sind
2. Prüfen Sie, ob der gewählte Zeitpunkt verfügbar ist
3. Prüfen Sie, ob Geräte/Räume verfügbar sind
4. Prüfen Sie, ob der Mitarbeiter verfügbar ist

---

## API-Endpunkte (für Entwickler)

### Leistungskatalog
- `GET /api/service-catalog` - Alle Leistungen abrufen
- `POST /api/service-catalog` - Neue Leistung erstellen
- `PUT /api/service-catalog/:id` - Leistung aktualisieren
- `DELETE /api/service-catalog/:id` - Leistung löschen

### Service-Kategorien
- `GET /api/service-categories` - Alle Kategorien abrufen
- `POST /api/service-categories` - Neue Kategorie erstellen
- `PUT /api/service-categories/:id` - Kategorie aktualisieren
- `DELETE /api/service-categories/:id` - Kategorie löschen

### Buchungen
- `GET /api/service-bookings` - Alle Buchungen abrufen
- `POST /api/service-bookings` - Neue Buchung erstellen
- `PUT /api/service-bookings/:id` - Buchung aktualisieren
- `DELETE /api/service-bookings/:id` - Buchung löschen

### Ressourcen
- `GET /api/resources` - Alle Ressourcen abrufen
- `POST /api/resources` - Neue Ressource erstellen
- `PUT /api/resources/:id` - Ressource aktualisieren
- `DELETE /api/resources/:id` - Ressource löschen

---

## Zusammenfassung

Der Bereich "Leistungen" bietet umfassende Verwaltungsmöglichkeiten für:

1. **Leistungskatalog**: Zentrale Verwaltung aller medizinischen Leistungen
2. **Service-Kategorien**: Organisation und Gruppierung von Leistungen
3. **Buchungen**: Verwaltung von Service-Buchungen
4. **Ressourcen**: Verwaltung von Räumen, Geräten, Services und Personal

Jeder Bereich hat spezifische Funktionen und Konfigurationsmöglichkeiten, die auf die Bedürfnisse einer modernen Ordinationssoftware zugeschnitten sind.
