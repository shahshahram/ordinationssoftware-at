# Konzept: Online-Terminbuchungssystem

## 1. Übersicht

Das Online-Terminbuchungssystem ermöglicht es Patienten, Termine für medizinische und nicht-medizinische Leistungen online zu buchen. Das System integriert sich nahtlos in die bestehende Terminverwaltung und berücksichtigt alle relevanten Geschäftsprozesse.

## 2. Leistungsverwaltung

### 2.1 Leistungskategorien
- **Kategorien**: Leistungen werden in Kategorien gruppiert (z.B. "Allgemeinmedizin", "Labor", "Physiotherapie", "Impfungen")
- **Medizinische vs. nicht-medizinische Leistungen**: Klassifizierung im System
- **Gruppierung**: Mehrere Leistungen können einer Kategorie zugeordnet werden
- **Darstellung**: Kategorien werden mit Überschriften gruppiert dargestellt

### 2.2 Leistungszuordnung
- **Personalzuordnung**: Jede Leistung kann einem oder mehreren Benutzern (Personal) zugeordnet sein
- **Berechtigung**: Im System hinterlegt, welche Personen welche Leistungen erbringen dürfen
- **Ressourcen-Zuordnung** (NEU):
  - **Räume**: Optional - Leistung kann an bestimmte Räume gebunden sein
  - **Geräte**: Optional - Leistung kann bestimmte Geräte erfordern (z.B. EKG-Gerät, Ultraschall)
  - **Kombinierte Prüfung**: Termin ist nur buchbar, wenn Person + Raum + Gerät alle verfügbar sind
- **Auswahlprozess**:
  1. Patient wählt Kategorie
  2. System zeigt alle Leistungen dieser Kategorie
  3. Patient wählt eine spezifische Leistung aus
  4. System zeigt verfügbares Personal für diese Leistung
  5. System prüft automatisch verfügbare Räume und Geräte

### 2.3 Leistungsdaten
- **Dauer**: Jede Leistung hat eine definierte Dauer (in Minuten)
- **Vorbereitungszeit**: Zeit, die vor der Leistung benötigt wird (z.B. 5 Minuten)
- **Nachbereitungszeit**: Zeit, die nach der Leistung benötigt wird (z.B. 10 Minuten)
- **Gesamtdauer**: Dauer + Vorbereitung + Nachbereitung = Gesamtblockierungszeit

## 3. Verfügbarkeitsprüfung

### 3.1 Berechnungslogik
```
Verfügbare Zeit = Arbeitszeit - Pausenzeiten - Gebuchte Termine - Vorbereitungszeit - Nachbereitungszeit
```

### 3.2 Berücksichtigte Faktoren
- **Arbeitszeiten**: Individuelle Arbeitszeiten jedes Mitarbeiters (aus WeeklySchedule)
- **Pausenzeiten**: Hinterlegte Pausenzeiten des Personals
- **Bereits gebuchte Termine**: Alle Termine im System (auch interne Buchungen)
- **Vorbereitungszeit**: Zeit vor der Leistung
- **Nachbereitungszeit**: Zeit nach der Leistung
- **Minimale Vorlaufzeit**: Mindestzeit zwischen Buchung und Termin (z.B. 24 Stunden)
- **Ressourcen-Verfügbarkeit** (NEU):
  - **Räume**: Prüfung, ob benötigter Raum verfügbar ist
  - **Geräte**: Prüfung, ob benötigtes Gerät verfügbar ist
  - **Kombinierte Verfügbarkeit**: Termin nur buchbar, wenn Person + Raum + Gerät alle frei sind

### 3.3 Verfügbarkeitsprüfung für mehrere Leistungen
- Wenn mehrere Leistungen gebucht werden:
  - Prüfung, ob alle Leistungen nacheinander verfügbar sind
  - Berücksichtigung der Gesamtdauer aller Leistungen
  - Prüfung, ob alle Leistungen vom selben Personal erbracht werden können
  - Prüfung, ob alle benötigten Ressourcen (Räume, Geräte) verfügbar sind

### 3.4 Online-Kontingente (Termin-Cluster) (NEU)
- **Konzept**: Nicht alle Zeitslots sind für Online-Buchungen verfügbar
- **Reservierte Zeiten**: Bestimmte Zeiten bleiben für Akutfälle (Telefonbuchungen) reserviert
- **Konfiguration**: Pro Leistung und Personal konfigurierbar
  - Beispiel: Montags 08:00-10:00 Uhr nur für Blutabnahmen online buchbar
  - Beispiel: Freitags 14:00-17:00 Uhr nur für Telefonbuchungen reserviert
- **Darstellung**: Online-Buchung zeigt nur verfügbare Zeitslots für Online-Buchungen
- **Vorteil**: Flexibilität für Ordination, Akutfälle können weiterhin telefonisch gebucht werden

## 4. Benutzeroberfläche für Terminauswahl

### 4.1 Kalenderansicht
- **Monatsansicht**: Übersicht über einen Monat
- **Verfügbare Zeiten**: Anzeige verfügbarer Zeitslots pro Tag
- **Farbcodierung**:
  - Grün: Viele verfügbare Termine
  - Gelb: Wenige verfügbare Termine
  - Rot: Keine verfügbaren Termine
  - Grau: Vergangene Tage / nicht buchbare Tage

### 4.2 Wochenansicht
- **Aktuelle Woche**: Anzeige der aktuellen Woche
- **Navigation**: 
  - "Vorherige Woche" Button
  - "Nächste Woche" Button
  - "Heute" Button (zurück zur aktuellen Woche)
- **Zeitslots**: Anzeige verfügbarer Zeitslots pro Tag
- **Detaillierte Ansicht**: Klick auf einen Tag zeigt alle verfügbaren Zeitslots

### 4.3 Zeitslot-Darstellung
- **Format**: "HH:MM - HH:MM" (z.B. "09:00 - 09:30")
- **Verfügbarkeit**: Anzeige, wie viele Termine noch verfügbar sind
- **Auswahl**: Klick auf Zeitslot wählt diesen aus

## 5. Patientendaten-Erfassung

### 5.1 Patientenidentifikation

#### Option A: Dropdown-Abfrage (Empfohlen)
```
"Kommen Sie zum ersten Mal in unsere Ordination?"
[Dropdown]
  - Ja, ich bin neu
  - Nein, ich war bereits Patient
```

**Vorteile**:
- Einfache Implementierung
- Klare Kommunikation mit Patient
- Weniger Fehlerquellen

**Nachteile**:
- Patient muss selbst wissen, ob er bereits Patient ist

#### Option B: Automatische Erkennung
- Eingabe von E-Mail oder SVNR
- System prüft, ob Patient bereits existiert
- Falls gefunden: Vorschlag zur Bestätigung
- Falls nicht gefunden: Neueingabe

**Vorteile**:
- Automatische Erkennung
- Weniger Eingaben für Wiederkehrer

**Nachteile**:
- Komplexere Implementierung
- Datenschutzbedenken (SVNR-Abfrage)
- Fehleranfällig (Tippfehler)

#### Option C: Hybrid-Ansatz mit automatischer Dublettenprüfung (Empfohlen)
1. **Erste Abfrage**: "Kommen Sie zum ersten Mal?"
   - Wenn "Nein": Eingabe von E-Mail oder Name + Geburtsdatum
   - System sucht nach passendem Patienten
   - Falls gefunden: Bestätigung und Vervollständigung
   - Falls nicht gefunden: Neueingabe
2. **Wenn "Ja"**: Direkt zur Neueingabe
3. **Automatische Dublettenprüfung im Hintergrund** (NEU):
   - Nach Eingabe von Name, Geburtsdatum, SVNR
   - System prüft automatisch: Gibt es die Kombination bereits?
   - **Szenario A (Match)**: System markiert Buchung als "Bekannter Patient"
   - **Szenario B (Kein Match)**: System legt "Web-Patienten" (temporär) an
   - **Hinweis**: "Wir haben einen ähnlichen Eintrag gefunden. Bitte prüfen Sie, ob Sie bereits Patient sind."

### 5.2 Pflichtfelder
- **Vorname** (required)
- **Nachname** (required)
- **Geburtsdatum** (required, Format: DD.MM.YYYY)
- **Adresse**:
  - Straße (required)
  - PLZ (required, 4-5 Ziffern)
  - Ort (required)
  - Land (default: "Österreich")
- **Telefonnummer** (required)
- **SVNR (Sozialversicherungsnummer)** (required, 10-12 Ziffern)
- **Versicherungsanstalt** (required, Dropdown)

### 5.3 Optionale Felder
- **E-Mail** (optional, aber empfohlen für Bestätigung)
- **Bemerkungsfeld** (optional, für spezielle Anforderungen)

### 5.4 Einverständniserklärungen
- **DSGVO-Einverständnis** (required, Checkbox)
  - "Ich stimme der Verarbeitung meiner personenbezogenen Daten gemäß DSGVO zu. *"
- **AGB-Einverständnis** (required, Checkbox)
  - "Mit Ihrer Buchung erklären Sie sich mit unseren Datenschutzbestimmungen und AGB einverstanden. *"
- **Datenschutzbestimmungen** (required, Checkbox)
  - "Mit Ihrer Buchung erklären Sie sich mit unseren Datenschutzbestimmungen einverstanden. *"

### 5.5 Zusätzliche Optionen
- **"Eingaben auf diesem Gerät merken"** (optional, Checkbox)
  - Speichert Daten lokal im Browser (LocalStorage)
  - Bei nächster Buchung werden Daten vorausgefüllt
  - **Hinweis**: "Ihre Daten werden nur lokal auf diesem Gerät gespeichert und nicht an uns übertragen."

- **Terminerinnerung** (optional, Checkbox)
  - "24 Stunden vor Termin"
  - "12 Stunden vor Termin"
  - "2 Stunden vor Termin"
  - Standard: 24 Stunden vor Termin

### 5.6 Anamnese-Vorabfrage (NEU)
- **Konzept**: Je nach Leistung können spezifische Fragen gestellt werden
- **Beispiele**:
  - Operation: "Nehmen Sie blutverdünnende Medikamente?"
  - Impfung: "Hatten Sie in den letzten 14 Tagen Fieber?"
  - Allergietest: "Haben Sie bekannte Allergien?"
- **Integration**: Antworten werden direkt beim Termin im System gespeichert
- **Konfiguration**: Pro Leistung konfigurierbar (Fragen können definiert werden)
- **Vorteil**: Zeitersparnis bei Termin, wichtige Informationen bereits vorhanden

### 5.7 Double Opt-In für Neupatienten (NEU)
- **Zweck**: Verhindert "Fake-Buchungen" und Spam
- **Prozess**:
  1. Patient bucht Termin (als Neupatient)
  2. System sendet Bestätigungscode per E-Mail oder SMS
  3. Patient muss Code eingeben oder Link klicken
  4. Erst nach Bestätigung wird Termin im Kalender fest reserviert
- **Zeitfenster**: Code ist X Stunden gültig (z.B. 24 Stunden)
- **Ausnahme**: Wiederkehrer müssen nicht erneut bestätigen (wenn bereits validiert)

## 6. Terminerinnerung

### 6.1 Zeitpunkte
- **24 Stunden vor Termin** (Standard)
- **12 Stunden vor Termin** (Optional)
- **2 Stunden vor Termin** (Optional)

### 6.2 Kommunikationskanäle

#### Option A: E-Mail (Standard)
- Automatischer Versand von Erinnerungs-E-Mails
- Template mit Termindetails
- Link zur Stornierung

#### Option B: SMS (Optional)
- Integration eines SMS-Dienstes (z.B. Twilio, MessageBird)
- Automatischer Versand von SMS-Erinnerungen
- **Kosten**: Pro SMS (ca. 0,05-0,10 €)
- **Konfiguration**: Pro Ordination einstellbar

#### Option C: Push-Benachrichtigung (Zukunft)
- Für Patienten mit App-Zugang
- Push-Benachrichtigung auf Smartphone

### 6.3 ICS-Kalenderfile (NEU)
- **Funktion**: Jede Erinnerung enthält ein ICS-Kalenderfile (.ics)
- **Vorteil**: Patient kann Termin mit einem Klick in seinen Handy-Kalender übernehmen
- **Inhalt**: 
  - Termindetails (Datum, Uhrzeit, Dauer)
  - Adresse der Ordination
  - Kontaktinformationen
  - Optional: Link zur Stornierung
- **Kompatibilität**: Funktioniert mit allen gängigen Kalender-Apps (Google Calendar, Apple Calendar, Outlook, etc.)

### 6.4 Rechtliche Aspekte (NEU)
- **DSGVO-Konformität**: Terminerinnerung per SMS/E-Mail ist in Österreich als "Serviceleistung im Rahmen des Behandlungsvertrages" DSGVO-konform
- **Voraussetzung**: Im Buchungsprozess muss darauf hingewiesen werden
- **Einverständnis**: Patient muss aktiv zustimmen (Checkbox)

### 6.5 Implementierung
- **Cron-Job**: Läuft täglich um 08:00 Uhr
- **Prüfung**: Alle Termine, die in 24/12/2 Stunden stattfinden
- **Versand**: Automatischer Versand an Patienten, die Erinnerung aktiviert haben
- **Logging**: Protokollierung aller versendeten Erinnerungen

## 7. Terminverwaltung im System

### 7.1 Integration in bestehende Systeme
- **Termine-Menü**: Neuer Unterpunkt "Onlinebuchungen"
  - Liste aller Online-Buchungen
  - Filter: Status, Datum, Personal, Leistung
  - Suche: Nach Patient, Buchungsnummer, etc.
  
- **Dienstkalender**: Online-Buchungen werden automatisch eingetragen
  - Anzeige wie normale Termine
  - Farbcodierung: Online-Buchungen in anderer Farbe (z.B. Blau)
  
- **Terminkalender**: Online-Buchungen erscheinen im Kalender
  - Gleiche Darstellung wie interne Termine
  - Zusätzliche Info: "Online-Buchung"
  
- **Terminverwaltung**: Online-Buchungen können wie normale Termine verwaltet werden
  - Bearbeitung möglich
  - Stornierung möglich
  - Statusänderung möglich

### 7.2 Termin-Status
- **Gebucht** (Standard bei Online-Buchung)
- **Bestätigt** (Nach manueller Bestätigung durch Ordination)
- **Abgesagt** (Storniert)
- **Erledigt** (Nach Termindurchführung)
- **Nicht erschienen** (Wenn Patient nicht erschienen ist)

### 7.3 Verfügbarkeitsblockierung
- Sobald ein Termin online gebucht wird:
  - Termin wird sofort im System gespeichert
  - Zeitslot wird als "gebucht" markiert
  - Keine weitere Buchung für diesen Zeitslot möglich
  - **Ausnahme**: Wenn Termin innerhalb von X Minuten storniert wird, wird Slot wieder freigegeben

## 8. Patientenabgleich und -anlage

### 8.1 Temporäre Patienten
- **Bei Online-Buchung**: Patient wird temporär angelegt
- **Kennzeichnung**: Flag `isTemporary: true`
- **Daten**: Alle eingegebenen Daten werden gespeichert
- **Hinweis im System**: "Temporärer Patient - Bitte bei Besuch abgleichen"

### 8.2 Abgleichprozess bei Besuch

#### Szenario 1: Patient ist tatsächlich neu
1. Patient kommt zur Ordination
2. Personal prüft temporären Patienten
3. **Bestätigung**: "Patient ist neu - Daten korrekt?"
4. **Aktion**: Flag `isTemporary` wird auf `false` gesetzt
5. **Ergebnis**: Patient ist jetzt dauerhaft im System

#### Szenario 2: Patient existiert bereits (mit e-card Integration) (NEU)
1. Patient kommt zur Ordination
2. **e-card wird gesteckt**: System erkennt Patient über e-card
3. **Automatische Abfrage**: "Gefundenen e-card Patienten mit Web-Buchung von 'Max Mustermann' verknüpfen?"
4. **Aktion**: 
   - Personal bestätigt Verknüpfung
   - Daten von e-card werden übernommen (Adresse, etc.)
   - Temporärer Patient wird mit e-card Patient zusammengeführt
   - Termin wird dem e-card Patienten zugeordnet
   - Patient ist jetzt "validiert" (nicht mehr temporär)
5. **Vorteil**: 
   - Automatische Datenübernahme (keine manuelle Eingabe)
   - Hohe Datenqualität (Daten direkt von e-card)
   - Schneller Prozess

#### Szenario 2b: Patient existiert bereits (ohne e-card)
1. Patient kommt zur Ordination
2. Personal erkennt, dass Patient bereits existiert
3. **Aktion**: 
   - Temporären Patienten mit bestehendem Patienten zusammenführen
   - Termin wird dem bestehenden Patienten zugeordnet
   - Temporärer Patient wird gelöscht oder archiviert
4. **Hinweis**: "Patient wurde mit bestehendem Patienten zusammengeführt"

#### Szenario 3: Patient erscheint nicht
1. Patient erscheint nicht zum Termin
2. **Aktion**: 
   - Termin wird als "Nicht erschienen" markiert
   - Temporärer Patient bleibt bestehen
   - Nach X Tagen: Automatische Archivierung oder Löschung (konfigurierbar)

### 8.3 Automatischer Abgleich (Optional)
- **Bei Online-Buchung**: System prüft automatisch, ob Patient bereits existiert
- **Kriterien**: 
  - SVNR (wenn vorhanden)
  - Name + Geburtsdatum
  - E-Mail (wenn vorhanden)
- **Bei Übereinstimmung**: 
  - Vorschlag: "Patient existiert bereits - Zusammenführen?"
  - Automatische Zuordnung zum bestehenden Patienten
  - Kein temporärer Patient wird erstellt

### 8.4 Prozess-Diagramm
```
Online-Buchung
    ↓
Patient existiert bereits?
    ├─ Ja → Zuordnung zu bestehendem Patienten
    └─ Nein → Temporärer Patient wird erstellt
            ↓
        Patient kommt zur Ordination
            ↓
        Abgleich durch Personal
            ├─ Neu → isTemporary = false
            ├─ Existiert → Zusammenführung
            └─ Nicht erschienen → Archivierung nach X Tagen
```

## 9. Stornierung

### 9.1 Stornierung durch Patient

#### Option A: Online-Stornierung mit Magic Link (Empfohlen) (NEU)
- **Zugang**: Über Bestätigungs-E-Mail (Magic Link)
- **Magic Link**: Einmaliger, sicherer Link in E-Mail
  - "Meinen Termin verwalten" Link
  - Link ist zeitlich begrenzt gültig (z.B. 30 Tage)
  - Kein Passwort erforderlich
- **Sicherheit**: 
  - Zusätzliche Validierung durch Geburtsdatum oder SVNR
  - Link kann nur einmal verwendet werden (oder zeitlich begrenzt)
- **Prozess**:
  1. Patient klickt auf Magic Link in E-Mail
  2. System zeigt gesicherte Seite mit Termindetails
  3. Optional: Geburtsdatum zur Validierung abfragen
  4. Patient kann Termin verschieben oder stornieren
  5. Bei Stornierung: Optional Grund für Stornierung (Dropdown)
  6. Stornierung wird durchgeführt
  7. Zeitslot wird wieder freigegeben
  8. Bestätigungs-E-Mail an Patient
  9. Benachrichtigung an Ordination
- **Vorteil**: 
  - Keine Passwort-Hürde für Patienten
  - Einfacher Zugang
  - Sicher durch zeitliche Begrenzung und Validierung

#### Option B: Stornierung über Patientenportal
- Patient loggt sich ins Patientenportal ein
- Sieht seine Termine
- Kann Termine stornieren
- Gleicher Prozess wie Option A

### 9.2 Stornierung durch Ordination
- **Im System**: Personal kann Online-Buchungen stornieren
- **Prozess**:
  1. Termin wird im System als "Abgesagt" markiert
  2. Zeitslot wird wieder freigegeben
  3. Automatische E-Mail an Patient
  4. Optional: SMS-Benachrichtigung

### 9.3 Stornierungsfristen (Erweitert)
- **Konfigurierbare Fristen**: Im System hinterlegbar
  - Beispiel: Online-Stornierung bis 24 Stunden vor Termin erlaubt
  - Beispiel: Online-Stornierung bis 12 Stunden vor Termin erlaubt
- **Bis konfigurierte Frist**: Online-Stornierung möglich
- **Nach konfigurierter Frist**: 
  - Hinweis: "Bitte rufen Sie uns an: [Telefonnummer]"
  - Online-Stornierung nicht mehr möglich
  - Stornierung nur telefonisch oder über Patientenportal
- **Stornogebühr**: Optional konfigurierbar
  - Ab welcher Frist wird Gebühr fällig?
  - Höhe der Gebühr
  - Automatische Berechnung und Rechnungsstellung

### 9.4 Automatische Freigabe
- **Bei Stornierung**: Zeitslot wird sofort wieder freigegeben
- **Verfügbarkeit**: Termin erscheint wieder in der Online-Buchung
- **Benachrichtigung**: Andere wartende Patienten können benachrichtigt werden (Warteliste)

## 10. Benachrichtigungen

### 10.1 Benachrichtigungen an Ordination

#### E-Mail-Benachrichtigungen
- **Bei neuer Buchung**: 
  - E-Mail an konfigurierte E-Mail-Adressen
  - Liste der Empfänger konfigurierbar (z.B. Ordinations-E-Mail, Arzt-E-Mail)
  - Template mit Buchungsdetails
  
- **Bei Stornierung**:
  - E-Mail an konfigurierte E-Mail-Adressen
  - Template mit Stornierungsdetails

- **Bei Terminerinnerung** (Optional):
  - E-Mail an Ordination, wenn Patient Erinnerung erhalten hat
  - Für Nachverfolgung

#### In-System-Benachrichtigungen
- **Dashboard**: Neue Online-Buchungen erscheinen im Dashboard
- **Benachrichtigungszentrale**: Alle Benachrichtigungen zentral
- **Push-Benachrichtigungen**: Für angemeldete Benutzer (wenn aktiviert)

### 10.2 Benachrichtigungen an Patienten
- **Buchungsbestätigung**: Sofort nach Buchung
- **Terminerinnerung**: 24/12/2 Stunden vor Termin
- **Stornierungsbestätigung**: Nach Stornierung
- **Terminänderung**: Wenn Ordination Termin ändert

### 10.3 E-Mail-Templates
- **Buchungsbestätigung**:
  - Buchungsnummer
  - Termindetails (Datum, Uhrzeit, Personal, Leistung)
  - Adresse der Ordination
  - Link zur Stornierung
  - Kontaktinformationen
  
- **Terminerinnerung**:
  - Termindetails
  - Erinnerung an Mitbringsel (z.B. Versicherungskarte)
  - Link zur Stornierung
  
- **Stornierungsbestätigung**:
  - Bestätigung der Stornierung
  - Option: Neuen Termin buchen

## 11. Patientenportal

### 11.1 Zugang
- **Registrierung**: 
  - Über E-Mail-Link (nach erster Buchung)
  - Oder manuelle Registrierung durch Ordination
- **Login**: 
  - E-Mail + Passwort
  - Optional: Zwei-Faktor-Authentifizierung

### 11.2 Funktionen

#### Patientenübersicht
- **Persönliche Daten**: Anzeige und Bearbeitung
- **Versicherungsdaten**: Anzeige und Bearbeitung
- **Kontaktdaten**: Anzeige und Bearbeitung

#### Terminverwaltung
- **Aktuelle Termine**: Liste aller gebuchten Termine
- **Vergangene Termine**: Historie
- **Termin-Details**: 
  - Datum, Uhrzeit, Personal, Leistung
  - Status (Gebucht, Bestätigt, Abgesagt)
- **Stornierung**: Online-Stornierung von Terminen
- **Neue Buchung**: Direkter Link zur Online-Buchung

#### Dokumente (Optional)
- **Befunde**: Zugriff auf eigene Befunde
- **Rezepte**: Zugriff auf eigene Rezepte
- **Laborwerte**: Zugriff auf eigene Laborwerte

### 11.3 Stornierung über Patientenportal
- **Prozess**:
  1. Patient loggt sich ein
  2. Sieht seine Termine
  3. Klickt auf "Stornieren"
  4. Bestätigt Stornierung
  5. Optional: Grund für Stornierung
  6. Stornierung wird durchgeführt
  7. Benachrichtigung an Ordination
  8. Bestätigungs-E-Mail an Patient

## 12. Warteliste

### 12.1 Funktionsweise
- **Aktivierung**: Pro Leistung konfigurierbar
- **Puffer**: Wenn Puffer für Leistungen eingerichtet ist
- **Prozess**:
  1. Patient wählt Leistung
  2. System prüft Verfügbarkeit
  3. Falls keine Termine verfügbar:
   - Option: "Auf Warteliste setzen"
   - Patient kann sich eintragen
  4. Bei freigewordenen Terminen:
   - System benachrichtigt Patienten auf Warteliste
   - Erste/r Patient/in hat X Stunden Zeit zu buchen
   - Falls nicht gebucht: Nächste/r Patient/in wird benachrichtigt

### 12.2 Wartelisten-Verwaltung
- **Priorisierung**: 
  - Nach Eintragungsdatum (First-Come-First-Served)
  - Oder nach Priorität (wenn vom Personal gesetzt)
- **Benachrichtigung**: 
  - E-Mail an Patienten
  - Optional: SMS
  - Link zur sofortigen Buchung

### 12.3 Nachrücker-Automatik ("Fast Track") (NEU)
- **Konzept**: Automatische Benachrichtigung bei freigewordenen Terminen
- **Prozess**:
  1. Ein Termin wird storniert
  2. System prüft automatisch: Gibt es Warteliste für diese Leistung?
  3. **Multi-Benachrichtigung**: System sendet SMS/E-Mail an die ersten X Personen (z.B. 3)
  4. **Nachricht**: "Ein früherer Termin ist frei geworden. Jetzt klicken zum Umbuchen."
  5. **First-Come-First-Served**: Wer zuerst klickt, bekommt den Termin
  6. **Ablauf**: Nach X Stunden ohne Buchung: Nächste/r Patient/in wird benachrichtigt
- **Vorteile**:
  - Minimiert Leerstände perfekt
  - Patienten bekommen frühere Termine
  - Automatischer Prozess (kein manueller Aufwand)
- **Konfiguration**:
  - Anzahl der gleichzeitig benachrichtigten Patienten (z.B. 3)
  - Ablaufzeit für Buchung (z.B. 2 Stunden)
  - Anzahl der Benachrichtigungsrunden

### 12.4 Wartelisten-Ansicht im System
- **Menü**: "Warteliste" unter Termine
- **Filter**: Nach Leistung, Personal, Datum
- **Aktionen**: 
  - Manuelle Benachrichtigung
  - Priorität ändern
  - Aus Warteliste entfernen

## 13. Technische Implementierung

### 13.1 Datenbank-Schema-Erweiterungen

#### ServiceCatalog (Erweiterung)
```javascript
{
  category: String, // Kategorie der Leistung
  isMedical: Boolean, // Medizinisch oder nicht-medizinisch
  duration: Number, // Dauer in Minuten
  preparationTime: Number, // Vorbereitungszeit in Minuten
  followUpTime: Number, // Nachbereitungszeit in Minuten
  assignedUsers: [ObjectId], // Zuordnung zu Personal
  requiredRooms: [ObjectId], // Benötigte Räume (optional)
  requiredDevices: [ObjectId], // Benötigte Geräte (optional)
  waitingListEnabled: Boolean, // Warteliste aktiviert?
  waitingListBuffer: Number, // Puffer für Warteliste
  onlineBookingEnabled: Boolean, // Online-Buchung aktiviert?
  onlineBookingContingents: [{ // Online-Kontingente
    dayOfWeek: String, // z.B. "monday"
    startTime: String, // z.B. "08:00"
    endTime: String, // z.B. "10:00"
    allowedServices: [ObjectId] // Welche Leistungen dürfen gebucht werden
  }],
  anamnesisQuestions: [{ // Anamnese-Vorabfragen
    question: String,
    type: String, // "yesno", "text", "dropdown"
    required: Boolean
  }],
  requiresDoubleOptIn: Boolean // Double Opt-In für Neupatienten?
}
```

#### OnlineBooking (Erweiterung)
```javascript
{
  // ... bestehende Felder ...
  serviceId: ObjectId, // Referenz zur gebuchten Leistung
  assignedRoom: ObjectId, // Zugewiesener Raum
  assignedDevices: [ObjectId], // Zugewiesene Geräte
  reminderPreferences: {
    email24h: Boolean,
    email12h: Boolean,
    email2h: Boolean,
    sms24h: Boolean
  },
  isTemporaryPatient: Boolean, // Temporärer Patient?
  isKnownPatient: Boolean, // Bekannter Patient (durch Dublettenprüfung)?
  patientPortalAccess: Boolean, // Zugang zum Patientenportal?
  cancellationReason: String, // Grund für Stornierung
  waitingListEntry: {
    isOnWaitingList: Boolean,
    notifiedAt: Date,
    expiresAt: Date
  },
  doubleOptIn: {
    required: Boolean,
    code: String,
    verified: Boolean,
    verifiedAt: Date,
    expiresAt: Date
  },
  magicLink: {
    token: String,
    expiresAt: Date,
    used: Boolean
  },
  anamnesisAnswers: [{ // Antworten auf Anamnese-Vorabfragen
    questionId: ObjectId,
    answer: String
  }]
}
```

#### PatientExtended (Erweiterung)
```javascript
{
  // ... bestehende Felder ...
  isTemporary: Boolean, // Temporärer Patient?
  mergedFrom: [ObjectId], // Zusammenführung von temporären Patienten
  patientPortalAccess: {
    enabled: Boolean,
    passwordHash: String,
    lastLogin: Date
  }
}
```

### 13.2 API-Endpunkte

#### Verfügbarkeit
- `GET /api/online-booking/categories` - Alle Kategorien
- `GET /api/online-booking/services?category=xxx` - Leistungen einer Kategorie
- `GET /api/online-booking/availability?serviceId=xxx&date=xxx` - Verfügbarkeit für Leistung
- `GET /api/online-booking/calendar?serviceId=xxx&month=xxx` - Kalenderansicht
- `GET /api/online-booking/week?serviceId=xxx&week=xxx` - Wochenansicht

#### Buchung
- `POST /api/online-booking/book` - Termin buchen
- `GET /api/online-booking/booking/:bookingNumber` - Buchungsdetails
- `POST /api/online-booking/cancel/:bookingNumber` - Termin stornieren

#### Patientenportal
- `POST /api/patient-portal/register` - Registrierung
- `POST /api/patient-portal/login` - Login
- `GET /api/patient-portal/appointments` - Termine des Patienten
- `POST /api/patient-portal/appointments/:id/cancel` - Stornierung

#### Warteliste
- `POST /api/online-booking/waiting-list` - Auf Warteliste setzen
- `GET /api/online-booking/waiting-list` - Warteliste anzeigen
- `DELETE /api/online-booking/waiting-list/:id` - Von Warteliste entfernen
- `POST /api/online-booking/waiting-list/notify` - Manuelle Benachrichtigung

#### Magic Link & Double Opt-In
- `GET /api/online-booking/manage/:token` - Zugang über Magic Link
- `POST /api/online-booking/verify-code` - Double Opt-In Code verifizieren
- `POST /api/online-booking/resend-code` - Code erneut senden

### 13.3 Background-Jobs

#### Terminerinnerung (Cron)
- **Zeitpunkt**: Täglich um 08:00 Uhr
- **Aufgabe**: 
  - Prüfe alle Termine in 24/12/2 Stunden
  - Versende Erinnerungen (E-Mail/SMS)
  - Logge Versand

#### Wartelisten-Benachrichtigung (Cron) (Erweitert)
- **Zeitpunkt**: Stündlich oder bei Stornierung (Event-basiert)
- **Aufgabe**:
  - Prüfe freigewordene Termine (durch Stornierung)
  - **Multi-Benachrichtigung**: Benachrichtige erste X Patienten auf Warteliste (z.B. 3)
  - Setze Ablaufzeit für jeden benachrichtigten Patienten
  - Nach Ablauf: Benachrichtige nächste Patienten
- **Event-basiert**: Bei Stornierung sofortige Prüfung und Benachrichtigung

#### Double Opt-In Code Versand (Cron)
- **Zeitpunkt**: Kontinuierlich (bei Buchung)
- **Aufgabe**:
  - Versende Bestätigungscode per E-Mail/SMS
  - Setze Ablaufzeit (z.B. 24 Stunden)
  - Nach Ablauf: Markiere Buchung als "nicht bestätigt" und sende Erinnerung

#### Temporäre Patienten-Bereinigung (Cron)
- **Zeitpunkt**: Täglich um 02:00 Uhr
- **Aufgabe**:
  - Finde temporäre Patienten ohne Termine (älter als X Tage)
  - Archiviere oder lösche (konfigurierbar)

## 14. Sicherheit und Datenschutz

### 14.1 Datenschutz
- **DSGVO-Konformität**: Alle Datenschutzbestimmungen eingehalten
- **Verschlüsselung**: Sensible Daten verschlüsselt gespeichert
- **Zugriffskontrolle**: Nur autorisierte Benutzer haben Zugriff
- **Audit-Log**: Alle Aktionen werden protokolliert

### 14.2 Sicherheit
- **HTTPS**: Alle Verbindungen verschlüsselt
- **Authentifizierung**: Sichere Authentifizierung für Patientenportal
- **Rate-Limiting**: Schutz vor Missbrauch
- **Validierung**: Alle Eingaben werden validiert

## 15. Konfiguration

### 15.1 Systemweite Einstellungen
- **Minimale Vorlaufzeit**: Mindestzeit zwischen Buchung und Termin (Standard: 24 Stunden)
- **Stornierungsfrist**: Zeitpunkt, bis zu dem kostenfrei storniert werden kann
- **Temporäre Patienten**: Archivierung nach X Tagen ohne Besuch
- **E-Mail-Templates**: Anpassbare E-Mail-Templates
- **SMS-Integration**: Konfiguration des SMS-Dienstes

### 15.2 Pro-Ordination Einstellungen
- **Online-Buchung aktiviert**: Ja/Nein
- **Verfügbare Leistungen**: Welche Leistungen können online gebucht werden
- **Verfügbare Zeiten**: Arbeitszeiten für Online-Buchung
- **Online-Kontingente**: Konfiguration der reservierten Zeiten
- **Benachrichtigungs-E-Mails**: Liste der Empfänger
- **SMS aktiviert**: Ja/Nein (wenn SMS-Dienst konfiguriert)
- **SMS-Gateway**: Konfiguration (Seven, Twilio, websms.at)
- **Stornierungsfristen**: Konfigurierbare Fristen für Online-Stornierung
- **Double Opt-In**: Aktiviert für Neupatienten? Ja/Nein
- **Magic Link**: Aktiviert? Ja/Nein
- **Wartelisten-Nachrücker**: Anzahl der gleichzeitig benachrichtigten Patienten

## 16. Reporting und Analytics

### 16.1 Statistiken
- **Buchungen pro Zeitraum**: Anzahl der Online-Buchungen
- **Stornierungsrate**: Anteil der stornierten Buchungen
- **Beliebteste Leistungen**: Welche Leistungen werden am häufigsten gebucht
- **Auslastung**: Auslastung der verfügbaren Zeitslots
- **Warteliste**: Anzahl der Patienten auf Warteliste

### 16.2 Berichte
- **Tägliche Übersicht**: Buchungen des Tages
- **Wöchentliche Übersicht**: Buchungen der Woche
- **Monatliche Übersicht**: Buchungen des Monats
- **Stornierungen**: Übersicht über Stornierungen

## 17. Erweiterte Funktionen (Optional)

### 17.1 Mehrsprachigkeit
- **Sprachen**: Deutsch, Englisch, Türkisch, etc.
- **Übersetzung**: Alle Texte übersetzt
- **Sprachauswahl**: Patient kann Sprache wählen

### 17.2 Mobile App
- **Native App**: iOS und Android
- **Funktionen**: 
  - Terminbuchung
  - Terminverwaltung
  - Stornierung
  - Push-Benachrichtigungen

### 17.3 Integration mit anderen Systemen
- **Krankenkassen**: Direkte Abfrage von Versicherungsdaten
- **Labor**: Automatische Übermittlung von Laborwerten
- **Terminplanungssysteme**: Integration mit externen Systemen

## 18. Migration und Rollout

### 18.1 Phasenweise Einführung
1. **Phase 1**: Basis-Funktionalität (Buchung, Stornierung)
2. **Phase 2**: Patientenportal, Warteliste
3. **Phase 3**: Erweiterte Funktionen (SMS, etc.)

### 18.2 Schulung
- **Personal**: Schulung des Personals
- **Dokumentation**: Benutzerhandbuch
- **Support**: Support während der Einführungsphase

## 19. Offene Fragen und Entscheidungen

### 19.1 Patientenidentifikation
- **Entscheidung**: Welche Methode wird verwendet?
  - Option A: Dropdown-Abfrage (Empfohlen)
  - Option B: Automatische Erkennung
  - Option C: Hybrid-Ansatz mit automatischer Dublettenprüfung (Empfohlen)

### 19.2 e-card Integration
- **Entscheidung**: Wird e-card Integration implementiert?
  - Ja: Automatische Patientenverknüpfung bei e-card Stecken
  - Nein: Manuelle Verknüpfung durch Personal

### 19.3 Terminerinnerung
- **Entscheidung**: Welche Kanäle werden verwendet?
  - E-Mail (Standard)
  - SMS (Optional, Kosten, Gateway-Auswahl: Seven/Twilio/websms.at)
  - Push-Benachrichtigungen (Zukunft)
- **ICS-Kalenderfile**: Wird in Erinnerungen mitgeschickt? (Empfohlen: Ja)

### 19.4 Patientenportal / Magic Link
- **Entscheidung**: Welche Methode wird verwendet?
  - Option A: Vollständiges Patientenportal mit Login (Passwort)
  - Option B: Magic Link (Empfohlen - keine Passwort-Hürde)
  - Option C: Kombination (Magic Link + optionales Portal)

### 19.5 Temporäre Patienten
- **Entscheidung**: Wie werden temporäre Patienten behandelt?
  - Automatische Archivierung nach X Tagen
  - Manuelle Archivierung durch Personal
  - Kombination

### 19.6 Ressourcen-Verwaltung
- **Entscheidung**: Werden Räume und Geräte in Verfügbarkeitsprüfung einbezogen?
  - Ja: Vollständige Ressourcen-Verwaltung (Empfohlen)
  - Nein: Nur Personal-Verfügbarkeit

### 19.7 Online-Kontingente
- **Entscheidung**: Werden Online-Kontingente (Termin-Cluster) implementiert?
  - Ja: Flexible Zeitslot-Verfügbarkeit (Empfohlen)
  - Nein: Alle verfügbaren Zeitslots sind online buchbar

### 19.8 Anamnese-Vorabfrage
- **Entscheidung**: Werden Anamnese-Vorabfragen implementiert?
  - Ja: Konfigurierbare Fragen pro Leistung (Empfohlen)
  - Nein: Keine Vorabfragen

### 19.9 Double Opt-In
- **Entscheidung**: Wird Double Opt-In für Neupatienten implementiert?
  - Ja: Verhindert Fake-Buchungen (Empfohlen)
  - Nein: Keine Bestätigung erforderlich

### 19.10 Wartelisten-Nachrücker
- **Entscheidung**: Wird automatische Nachrücker-Benachrichtigung implementiert?
  - Ja: Multi-Benachrichtigung bei Stornierung (Empfohlen)
  - Nein: Manuelle Benachrichtigung durch Personal

## 20. Nächste Schritte

1. **Review**: Dieses Konzept durchgehen und Feedback geben
2. **Entscheidungen**: Offene Fragen klären
3. **Priorisierung**: Welche Funktionen sind am wichtigsten?
4. **Implementierung**: Schrittweise Implementierung nach Priorität
5. **Testing**: Umfassende Tests vor Go-Live
6. **Rollout**: Phasenweise Einführung

---

**Erstellt am**: 2025-12-19
**Version**: 2.0
**Status**: Zur Review
**Letzte Aktualisierung**: 2025-12-19 (Erweitert um Gemini-Vorschläge)

## 21. Zusammenfassung der Ergänzungen (Version 2.0)

### Neue Features:
1. **Ressourcen-Logik**: Räume und Geräte in Verfügbarkeitsprüfung integriert
2. **e-card Integration**: Automatische Patientenverknüpfung bei e-card Stecken
3. **Magic Link**: Passwortfreier Zugang für Patienten (statt vollständiges Portal)
4. **ICS-Kalenderfile**: Termine können direkt in Kalender-Apps übernommen werden
5. **Online-Kontingente**: Flexible Zeitslot-Verfügbarkeit für Online-Buchungen
6. **Anamnese-Vorabfrage**: Konfigurierbare Fragen pro Leistung
7. **Double Opt-In**: Verhindert Fake-Buchungen bei Neupatienten
8. **Wartelisten-Nachrücker**: Automatische Multi-Benachrichtigung bei Stornierung
9. **Erweiterte Stornierungsfristen**: Konfigurierbare Fristen mit automatischer Umschaltung
10. **Verbesserte Dublettenprüfung**: Automatische Prüfung im Hintergrund

### Verbesserungen:
- **SMS-Gateway**: Konkrete Anbieter-Empfehlungen (Seven, Twilio, websms.at)
- **Rechtliche Aspekte**: DSGVO-Konformität für Terminerinnerungen
- **Technische Details**: Erweiterte Datenbank-Schemas und API-Endpunkte
- **Konfiguration**: Erweiterte System- und Pro-Ordination Einstellungen

