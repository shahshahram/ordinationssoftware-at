# MyMediCloud MMC - Benutzerhandbuch

![MyMediCloud MMC Logo](../frontend/public/logo.svg)

**Version 1.0**  
**Stand: Januar 2026**

---

## Inhaltsverzeichnis

1. [Einführung](#einführung)
2. [Erste Schritte](#erste-schritte)
3. [Patientenverwaltung](#patientenverwaltung)
4. [Terminplanung](#terminplanung)
5. [Medizinische Dokumentation](#medizinische-dokumentation)
6. [Abrechnung](#abrechnung)
7. [Einstellungen und Konfiguration](#einstellungen-und-konfiguration)
8. [Sicherheit und Berechtigungen](#sicherheit-und-berechtigungen)
9. [Integrationen](#integrationen)
10. [Troubleshooting](#troubleshooting)
11. [Anhang](#anhang)

---

## 1. Einführung

### 1.1 Über die Software

**MyMediCloud MMC** ist eine moderne, webbasierte Praxisverwaltungssoftware, die speziell für niedergelassene Ärztinnen und Ärzte in Österreich entwickelt wurde. Die Software bietet eine umfassende Lösung für die tägliche Praxisarbeit und unterstützt alle wichtigen Geschäftsprozesse einer Ordination.

### 1.2 Hauptfunktionen

- **Patientenverwaltung**: Vollständige Verwaltung von Patientenstammdaten, Anamnese und Behandlungsverlauf
- **Terminplanung**: Intelligente Kalenderfunktion mit Online-Buchungssystem
- **Medizinische Dokumentation**: 19 verschiedene Dokumenttypen für alle Bereiche der Praxis
- **ICD-10 Diagnoseverwaltung**: Österreichischer ICD-10 Katalog mit hierarchischer Suche
- **Abrechnung**: Unterstützung für Kassenärzte, Wahlärzte und Privatärzte
- **ELGA-Integration**: Kompatibilität mit der elektronischen Gesundheitsakte
- **Sicherheit**: Rollen- und Berechtigungsmanagement mit 2-Faktor-Authentifizierung

### 1.3 Systemanforderungen

**Browser:**
- Chrome (empfohlen)
- Firefox
- Safari
- Edge

**Betriebssystem:**
- Windows 10/11
- macOS
- Linux
- Mobile Geräte (Tablets, Smartphones)

**Internetverbindung:**
- Stabile Internetverbindung erforderlich
- Empfohlene Bandbreite: mindestens 1 Mbit/s

---

## 2. Erste Schritte

### 2.1 Anmeldung

1. Öffnen Sie die Anwendung in Ihrem Browser
2. Geben Sie Ihre E-Mail-Adresse und Ihr Passwort ein
3. Klicken Sie auf "Anmelden"
4. Bei aktivierter 2-Faktor-Authentifizierung geben Sie den Code aus Ihrer Authenticator-App ein

### 2.2 Dashboard

Nach der Anmeldung gelangen Sie zum **Dashboard**, das Ihnen einen Überblick über die wichtigsten Informationen bietet:

- **Heutige Termine**: Übersicht aller Termine des Tages
- **Wartezimmer**: Patienten, die aktuell warten
- **Offene Aufgaben**: Pending Tasks und Erinnerungen
- **Statistiken**: Wichtige Kennzahlen Ihrer Praxis

### 2.3 Navigation

Die Navigation erfolgt über die **Seitenleiste** auf der linken Seite:

- **Dashboard**: Übersichtsseite
- **Patienten**: Patientenverwaltung
- **Termine**: Terminplanung und Kalender
- **Dokumente**: Medizinische Dokumentation
- **Abrechnung**: Rechnungsstellung und Abrechnung
- **Einstellungen**: Systemkonfiguration

### 2.4 Hilfe-Dialoge

Auf jeder Seite finden Sie oben rechts einen **Hilfe-Button** (ℹ️), der Ihnen kontextbezogene Hilfe und Schritt-für-Schritt-Anleitungen bietet.

---

## 3. Patientenverwaltung

### 3.1 Patientenübersicht

Die **Patientenübersicht** zeigt alle Patienten Ihrer Praxis in einer übersichtlichen Liste oder Kartenansicht.

**Funktionen:**
- **Suche**: Schnelle Suche nach Name, Geburtsdatum oder Versicherungsnummer
- **Filter**: Filtern nach Status, Versicherung oder anderen Kriterien
- **Sortierung**: Sortieren nach Name, letztem Besuch oder Geburtsdatum
- **Ansicht wechseln**: Zwischen Listen- und Kartenansicht wechseln

### 3.2 Neuen Patienten anlegen

1. Klicken Sie auf den Button **"Neuer Patient"**
2. Füllen Sie die **Stammdaten** aus:
   - Vorname, Nachname
   - Geburtsdatum
   - Geschlecht
   - Adresse
   - Telefonnummer, E-Mail
3. Ergänzen Sie **Versicherungsdaten**:
   - Versicherungsträger (ÖGK, SVS, BVAEB, etc.)
   - Versicherungsnummer
   - e-Card-Nummer (optional)
4. Speichern Sie den Patienten

### 3.3 Patienten bearbeiten

1. Klicken Sie auf einen Patienten in der Liste
2. Wählen Sie **"Bearbeiten"**
3. Nehmen Sie die gewünschten Änderungen vor
4. Speichern Sie die Änderungen

### 3.4 Patienten-Organizer

Der **Patienten-Organizer** bietet eine zentrale Übersicht über alle Informationen eines Patienten:

**Tabs:**
- **ePA**: Elektronische Patientenakte mit allen Dokumenten
- **Medizinisch**: Medizinische Daten, Diagnosen, Medikamente
- **Termine**: Alle Termine des Patienten
- **Dokumente**: Alle Dokumente des Patienten
- **Medikamente**: Aktuelle und vergangene Medikation
- **Fotos**: Patientenfotos und medizinische Bilder
- **Timeline**: Chronologischer Verlauf aller Aktivitäten

**Schnellaktionen:**
- **Dekurs**: Neuen Dekurs-Eintrag erstellen
- **Patienten-/Arztbrief**: Dokument erstellen
- **Medikamente**: Medikation verwalten
- **Termin**: Neuen Termin erstellen
- **Stammdaten**: Stammdaten bearbeiten
- **Validieren**: e-Card validieren
- **Leistungsabrechnung**: Leistung abrechnen
- **Rechnung**: Rechnung erstellen

### 3.5 Medizinische Daten

Im Tab **"Medizinisch"** können Sie folgende Informationen erfassen:

- **Vitalzeichen**: Größe, Gewicht, BMI, Blutdruck, Puls
- **Allergien**: Allergien und Unverträglichkeiten
- **Medikamente**: Aktuelle Medikation
- **Impfungen**: Impfstatus
- **Schwangerschaft**: Schwangerschaftsdaten (für Frauen)
- **Implantate**: Medizinische Implantate und Geräte
- **Raucherstatus**: Raucherstatus und Konsum

### 3.6 Diagnosen verwalten

1. Öffnen Sie den Patienten-Organizer
2. Wechseln Sie zum Tab **"Medizinisch"**
3. Klicken Sie auf **"Diagnosen verwalten"**
4. Suchen Sie nach ICD-10 Diagnosen
5. Fügen Sie Diagnosen hinzu oder entfernen Sie sie

### 3.7 Temporäre Patienten

Patienten, die über die **Online-Buchung** erstellt wurden, werden als **"Temporäre Patienten"** markiert. Diese müssen vervollständigt werden:

1. Öffnen Sie den temporären Patienten
2. Klicken Sie auf **"Stammdaten vervollständigen"**
3. Ergänzen Sie alle fehlenden Informationen
4. Speichern Sie die Änderungen

---

## 4. Terminplanung

### 4.1 Kalenderansicht

Der **Kalender** bietet verschiedene Ansichten:

- **Monatsansicht**: Übersicht über einen ganzen Monat
- **Wochenansicht**: Detaillierte Wochenansicht
- **Tagesansicht**: Detaillierte Tagesansicht
- **Ressourcenansicht**: Ansicht nach Räumen oder Personal

### 4.2 Neuen Termin erstellen

**Methode 1: Über den Kalender**
1. Klicken Sie auf den gewünschten Zeitpunkt im Kalender
2. Füllen Sie das Terminformular aus:
   - Patient auswählen
   - Terminart wählen
   - Dauer festlegen
   - Raum und Geräte zuweisen
3. Speichern Sie den Termin

**Methode 2: Über den Patienten-Organizer**
1. Öffnen Sie den Patienten-Organizer
2. Klicken Sie auf **"Termin"**
3. Wählen Sie Datum, Uhrzeit und Terminart
4. Speichern Sie den Termin

### 4.3 Termin bearbeiten

1. Klicken Sie auf einen Termin im Kalender
2. Wählen Sie **"Bearbeiten"**
3. Nehmen Sie die gewünschten Änderungen vor
4. Speichern Sie die Änderungen

### 4.4 Terminstatus

Termine können folgende Status haben:

- **Geplant**: Termin ist geplant, aber noch nicht bestätigt
- **Bestätigt**: Termin wurde bestätigt
- **Wartend**: Patient wartet auf Behandlung
- **In Behandlung**: Patient wird aktuell behandelt
- **Abgeschlossen**: Termin wurde abgeschlossen
- **Abgesagt**: Termin wurde abgesagt
- **Verschoben**: Termin wurde verschoben

### 4.5 Wartezimmer

Das **Wartezimmer** zeigt alle Patienten, die aktuell in der Praxis warten:

- **Status**: Wartend, In Behandlung, Abgeschlossen
- **Wartezeit**: Automatische Berechnung der Wartezeit
- **Priorität**: Möglichkeit, Prioritäten zu setzen
- **Aktionen**: Termin starten, verschieben oder absagen

### 4.6 Online-Buchung

Patienten können Termine **online buchen**:

1. Patienten wählen auf Ihrer Website eine Leistung
2. System zeigt verfügbare Zeitslots
3. Patient wählt einen Termin
4. Patient gibt Kontaktdaten ein
5. System erstellt automatisch einen Termin
6. Patient erhält Bestätigungs-E-Mail

**Verwaltung:**
- Alle Online-Buchungen werden in **"Online-Buchungen"** angezeigt
- Temporäre Patienten werden automatisch erstellt
- Buchungen können bestätigt, abgesagt oder verschoben werden

### 4.7 Verfügbarkeiten

**Arbeitszeiten** können für jedes Personalmitglied individuell eingestellt werden:

1. Gehen Sie zu **"Arbeitszeiten"**
2. Wählen Sie einen Mitarbeiter
3. Legen Sie die Arbeitszeiten fest
4. Definieren Sie Pausenzeiten
5. Speichern Sie die Einstellungen

**Abwesenheiten** können ebenfalls eingetragen werden:
1. Gehen Sie zu **"Abwesenheiten"**
2. Klicken Sie auf **"Neue Abwesenheit"**
3. Wählen Sie Mitarbeiter, Datum und Grund
4. Speichern Sie die Abwesenheit

---

## 5. Medizinische Dokumentation

### 5.1 Dokumenttypen

Die Software unterstützt **19 verschiedene Dokumenttypen** in 5 Kategorien:

#### Kern-Dokumente
- **Arztbrief / Befundbrief**: Medizinische Befunde und Berichte
- **Überweisungsbrief**: Überweisung an Fachärzte
- **Zuweisung / Einweisung**: Zuweisung zu anderen Einrichtungen
- **Rücküberweisungsbrief**: Rücküberweisung nach Behandlung
- **Befundbericht**: Labor- und Radiologiebefunde
- **Operationsbericht**: Operationsdokumentation

#### Verordnungen & Formulare
- **e-Rezept**: Elektronische Rezepte
- **Heilmittelverordnung**: Verordnungen für Heilmittel
- **Krankenstandsbestätigung**: Arbeitsunfähigkeitsbescheinigungen
- **Bildgebende Diagnostik**: Zuweisungen für bildgebende Verfahren
- **Impfbestätigung**: Impfdokumentation

#### Patientenbezogene Berichte
- **Patientenaufklärung**: Aufklärungsdokumente
- **Therapieplan**: Behandlungspläne
- **Verlaufsdokumentation**: Verlaufsberichte
- **Konsiliarbericht**: Konsiliarberichte
- **Pflegebrief**: Pflegedokumentation

#### Administrative Schreiben
- **Gutachten / Attest**: Gutachten und Atteste
- **Kostenübernahmeantrag**: Anträge auf Kostenübernahme

### 5.2 Dokument erstellen

1. Gehen Sie zu **"Dokumente"**
2. Klicken Sie auf **"Neues Dokument"**
3. Wählen Sie den **Dokumenttyp**
4. Wählen Sie einen **Patienten**
5. Wählen Sie optional eine **Vorlage**
6. Erstellen Sie das Dokument im Editor
7. Speichern Sie das Dokument

### 5.3 Vorlagen verwenden

**Vorlagen** erleichtern die Dokumentenerstellung:

1. Beim Erstellen eines Dokuments können Sie eine **Vorlage** auswählen
2. Die Vorlage wird geladen und kann bearbeitet werden
3. **Platzhalter** werden automatisch durch Patientendaten ersetzt

**Vorlagen verwalten:**
1. Gehen Sie zu **"Template Management"**
2. Erstellen Sie neue Vorlagen oder bearbeiten Sie bestehende
3. Verwenden Sie **Platzhalter** für dynamische Inhalte

### 5.4 Platzhalter

Platzhalter werden automatisch durch Patientendaten ersetzt:

- `{{patient.firstName}}`: Vorname des Patienten
- `{{patient.lastName}}`: Nachname des Patienten
- `{{patient.dateOfBirth}}`: Geburtsdatum
- `{{patient.address}}`: Vollständige Adresse
- `{{doctor.name}}`: Name des Arztes
- `{{date}}`: Aktuelles Datum
- `{{time}}`: Aktuelle Uhrzeit

### 5.5 Dokumente verwalten

**Dokumente anzeigen:**
- Alle Dokumente werden in der **Dokumentenübersicht** angezeigt
- Filter nach Patient, Dokumenttyp oder Datum
- Suche nach Inhalt oder Titel

**Dokumente bearbeiten:**
1. Klicken Sie auf ein Dokument
2. Wählen Sie **"Bearbeiten"**
3. Nehmen Sie die Änderungen vor
4. Speichern Sie das Dokument

**Dokumente löschen:**
- Dokumente können gelöscht werden (mit Bestätigung)
- Gelöschte Dokumente werden im Audit-Log protokolliert

### 5.6 Dokumente exportieren

Dokumente können in verschiedenen Formaten exportiert werden:

- **PDF**: Für Druck oder E-Mail-Versand
- **DOCX**: Für weitere Bearbeitung in Word
- **Druck**: Direkter Druck

---

## 6. Abrechnung

### 6.1 Abrechnungsarten

Die Software unterstützt drei Abrechnungsarten:

#### Kassenarzt-Abrechnung
- **EBM-Codes**: Verwendung von EBM-Codes für Kassenleistungen
- **ÖGK-Integration**: Automatische Übermittlung an ÖGK
- **Selbstbehalt**: Automatische Berechnung von Selbstbehalten (10%/20%, max. €50)
- **Turnusabrechnung**: Monatliche Abrechnung

#### Wahlarzt-Abrechnung
- **GOÄ-Codes**: Verwendung von GOÄ-Codes
- **Erstattung**: Automatische Berechnung der Erstattung (80% Standard)
- **Zusatzversicherung**: Prüfung auf Zusatzversicherungen
- **Erstattungsverwaltung**: Verwaltung von Erstattungsanträgen

#### Privat-Abrechnung
- **Privatpreise**: Individuelle Preisgestaltung
- **Vollständige Rechnung**: Rechnung direkt an den Patienten
- **Keine Versicherungsabrechnung**: Direkte Abrechnung mit dem Patienten

### 6.2 Rechnung erstellen

1. Gehen Sie zu **"Abrechnung"**
2. Klicken Sie auf **"Neue Rechnung"**
3. Wählen Sie einen **Patienten**
4. Fügen Sie **Leistungen** hinzu:
   - Wählen Sie aus dem Leistungskatalog
   - Oder geben Sie manuell ein
5. Wählen Sie die **Abrechnungsart** (Kassenarzt/Wahlarzt/Privat)
6. System berechnet automatisch:
   - Bruttobetrag
   - Selbstbehalt (bei Kassenarzt)
   - Erstattung (bei Wahlarzt)
   - Nettobetrag
7. Speichern Sie die Rechnung

### 6.3 Leistungsabrechnung

**One-Click-Abrechnung:**
1. Öffnen Sie den Patienten-Organizer
2. Klicken Sie auf **"Leistungsabrechnung"**
3. Wählen Sie die erbrachten Leistungen
4. Klicken Sie auf **"Leistung abrechnen"**
5. System erstellt automatisch die Rechnung

### 6.4 Versicherungsintegration

**ÖGK (Österreichische Gesundheitskasse):**
- XML-Export im ELA-Format
- Automatische Übermittlung
- Turnusabrechnung

**SVS (Sozialversicherung der Selbständigen):**
- XML-Export
- Batch-Export möglich

**BVAEB, KFA, PVA:**
- XML-Export-Funktion
- Versicherungsprüfung

**Privatversicherungen:**
- Unterstützung für verschiedene Versicherungen
- REST, FHIR, SOAP, E-Mail-Integration

### 6.5 Zahlungsmethoden

Folgende Zahlungsmethoden werden unterstützt:

- **Bar**: Barzahlung
- **Karte**: EC-Karte, Bankomat-Karte
- **Kreditkarte**: Visa, Mastercard
- **Mobile Payment**: Apple Pay, Google Pay
- **Überweisung**: Banküberweisung
- **Versicherung**: Direktabrechnung mit Versicherung

### 6.6 Rechnungen verwalten

**Rechnungen anzeigen:**
- Alle Rechnungen werden in der **Rechnungsübersicht** angezeigt
- Filter nach Status, Patient oder Datum
- Suche nach Rechnungsnummer oder Patient

**Rechnungen bearbeiten:**
- Rechnungen können bearbeitet werden (bis zur Übermittlung)
- Nach Übermittlung sind nur noch Korrekturen möglich

**Rechnungen exportieren:**
- PDF-Export für Versand
- XML-Export für Versicherungen
- CSV-Export für Buchhaltung

---

## 7. Einstellungen und Konfiguration

### 7.1 Allgemeine Einstellungen

**Praxisinformationen:**
- Praxisdaten (Name, Adresse, Kontakt)
- Steuernummer, UID-Nummer
- Bankverbindung

**Systemeinstellungen:**
- Sprache
- Zeitzone
- Datumsformat
- Währungsformat

### 7.2 Abrechnungseinstellungen

**Tarifdatenbanken:**
- ÖGK-Tarifdatenbank (EBM, KHO, GOÄ)
- Automatische Updates
- Manuelle Importe möglich

**Abrechnungsregeln:**
- Selbstbehalt-Regeln
- Erstattungssätze
- Preislisten

### 7.3 ELDA-Einstellungen

**ELDA (Elektronische Datenübertragung):**
- Konfiguration der ELDA-Schnittstelle
- Test-Modus für Entwicklung
- Produktiv-Modus für Live-Betrieb

### 7.4 WAHonline-Einstellungen

**WAHonline (Wahlarzt-Abrechnung online):**
- Konfiguration der WAHonline-Schnittstelle
- Format-Generierung
- Test-Modus verfügbar

### 7.5 E-Mail-Einstellungen

**E-Mail-Versand:**
- SMTP-Konfiguration
- E-Mail-Vorlagen
- Automatische Benachrichtigungen

### 7.6 SMS-Einstellungen

**SMS-Versand:**
- SMS-Provider-Konfiguration
- SMS-Vorlagen
- Automatische Erinnerungen

### 7.7 Update-Monitoring

**Automatische Updates:**
- ICD-10 Katalog
- Tarifdatenbanken
- Medikamentenkatalog
- System-Updates

**Update-Historie:**
- Alle Updates werden protokolliert
- Manuelle Updates möglich
- Update-Status wird angezeigt

---

## 8. Sicherheit und Berechtigungen

### 8.1 Benutzerverwaltung

**Benutzer erstellen:**
1. Gehen Sie zu **"Benutzer"**
2. Klicken Sie auf **"Neuer Benutzer"**
3. Füllen Sie die Benutzerdaten aus:
   - Name, E-Mail
   - Passwort
   - Rolle
4. Speichern Sie den Benutzer

**Benutzer bearbeiten:**
- Benutzerdaten können bearbeitet werden
- Passwörter können zurückgesetzt werden
- Rollen können geändert werden

### 8.2 Rollen und Berechtigungen

**Vordefinierte Rollen:**
- **Administrator**: Vollzugriff auf alle Funktionen
- **Arzt**: Zugriff auf Patienten, Termine, Dokumente, Abrechnung
- **Ordinationsgehilfe**: Zugriff auf Patienten, Termine, Dokumente
- **Rezeption**: Zugriff auf Termine und Patientenverwaltung
- **Buchhaltung**: Zugriff auf Abrechnung und Rechnungen

**Berechtigungen verwalten:**
1. Gehen Sie zu **"RBAC Management"**
2. Wählen Sie eine Rolle
3. Legen Sie die Berechtigungen fest
4. Speichern Sie die Änderungen

### 8.3 2-Faktor-Authentifizierung

**2FA aktivieren:**
1. Gehen Sie zu **"Sicherheit"**
2. Klicken Sie auf **"2FA aktivieren"**
3. Scannen Sie den QR-Code mit Ihrer Authenticator-App
4. Geben Sie den Code ein
5. 2FA ist jetzt aktiviert

**2FA deaktivieren:**
- Kann in den Sicherheitseinstellungen deaktiviert werden
- Erfordert Passwort-Bestätigung

### 8.4 Passwort-Richtlinien

**Passwort-Anforderungen:**
- Mindestens 8 Zeichen
- Groß- und Kleinbuchstaben
- Zahlen
- Sonderzeichen (empfohlen)

**Passwort ändern:**
1. Gehen Sie zu **"Sicherheit"**
2. Klicken Sie auf **"Passwort ändern"**
3. Geben Sie das alte und neue Passwort ein
4. Speichern Sie die Änderungen

### 8.5 Audit-Logging

Alle wichtigen Aktionen werden im **Audit-Log** protokolliert:

- Benutzeranmeldungen
- Datenänderungen
- Dokumentenerstellung
- Rechnungserstellung
- Systemänderungen

**Audit-Log anzeigen:**
1. Gehen Sie zu **"Sicherheit"**
2. Klicken Sie auf **"Audit-Log"**
3. Filtern Sie nach Benutzer, Datum oder Aktion

---

## 9. Integrationen

### 9.1 ELGA-Integration

**ELGA (Elektronische Gesundheitsakte):**
- Zugriff auf ELGA-Daten
- Dokumente in ELGA hochladen
- ELGA-Werte-Sets verwalten

**ELGA konfigurieren:**
1. Gehen Sie zu **"Einstellungen"** > **"ELGA"**
2. Konfigurieren Sie die ELGA-Schnittstelle
3. Testen Sie die Verbindung
4. Aktivieren Sie die Integration

### 9.2 DICOM-Integration

**DICOM (Digital Imaging and Communications in Medicine):**
- Empfang von DICOM-Bildern
- Versand von DICOM-Bildern
- DICOM-Viewer integriert

**DICOM-Provider verwalten:**
1. Gehen Sie zu **"DICOM Provider Management"**
2. Fügen Sie einen DICOM-Provider hinzu
3. Konfigurieren Sie die Verbindung
4. Testen Sie die Verbindung

### 9.3 Labor-Integration

**Labor-Provider:**
- Empfang von Laborergebnissen
- Automatische Zuordnung zu Patienten
- Laboraufträge versenden

**Labor-Provider verwalten:**
1. Gehen Sie zu **"Labor Provider Management"**
2. Fügen Sie einen Labor-Provider hinzu
3. Konfigurieren Sie die Integration
4. Testen Sie die Verbindung

### 9.4 Versicherungsintegration

**Versicherungsprovider:**
- ÖGK, SVS, BVAEB, KFA, PVA
- Privatversicherungen
- Automatische Versicherungsprüfung

**Versicherungsprovider verwalten:**
1. Gehen Sie zu **"Insurance Provider Management"**
2. Fügen Sie einen Provider hinzu
3. Konfigurieren Sie die Integration
4. Testen Sie die Verbindung

### 9.5 Integration-Status

**Status aller Integrationen:**
1. Gehen Sie zu **"Integration Status"**
2. Sehen Sie den Status aller Integrationen
3. Prüfen Sie Verbindungen
4. Beheben Sie Probleme

---

## 10. Troubleshooting

### 10.1 Häufige Probleme

**Problem: Kann mich nicht anmelden**
- Lösung: Prüfen Sie E-Mail und Passwort
- Lösung: Prüfen Sie, ob 2FA aktiviert ist
- Lösung: Kontaktieren Sie den Administrator

**Problem: Termine werden nicht angezeigt**
- Lösung: Prüfen Sie die Filtereinstellungen
- Lösung: Prüfen Sie die Datumsauswahl
- Lösung: Aktualisieren Sie die Seite

**Problem: Dokumente können nicht gespeichert werden**
- Lösung: Prüfen Sie die Internetverbindung
- Lösung: Prüfen Sie die Berechtigungen
- Lösung: Kontaktieren Sie den Support

**Problem: Abrechnung funktioniert nicht**
- Lösung: Prüfen Sie die Tarifdatenbank
- Lösung: Prüfen Sie die Versicherungsdaten
- Lösung: Prüfen Sie die Integration-Status

### 10.2 Support

**Kontakt:**
- E-Mail: support@mymedicloud.at
- Telefon: [Ihre Telefonnummer]
- Online-Hilfe: Hilfe-Button auf jeder Seite

**Fehler melden:**
1. Beschreiben Sie das Problem detailliert
2. Fügen Sie Screenshots bei
3. Geben Sie Schritte zur Reproduktion an
4. Senden Sie die Meldung an den Support

---

## 11. Anhang

### 11.1 Tastenkürzel

- **Strg + K**: Globale Suche
- **Strg + N**: Neuer Eintrag (abhängig von der Seite)
- **Strg + S**: Speichern
- **Esc**: Dialog schließen

### 11.2 Glossar

**ELGA**: Elektronische Gesundheitsakte  
**ELDA**: Elektronische Datenübertragung  
**WAHonline**: Wahlarzt-Abrechnung online  
**ICD-10**: Internationale Klassifikation der Krankheiten, 10. Revision  
**EBM**: Einheitlicher Bewertungsmaßstab  
**GOÄ**: Gebührenordnung für Ärzte  
**KHO**: Kassenärztliche Honorarordnung  
**ÖGK**: Österreichische Gesundheitskasse  
**SVS**: Sozialversicherung der Selbständigen  
**BVAEB**: Versicherungsanstalt für Eisenbahnen und Bergbau  
**KFA**: Krankenfürsorgeanstalt der Bediensteten der Stadt Wien  
**PVA**: Pensionsversicherungsanstalt

### 11.3 Rechtliche Hinweise

**Datenschutz:**
- Die Software ist DSGVO-konform
- Alle Daten werden verschlüsselt gespeichert
- Regelmäßige Backups werden durchgeführt

**Medizinproduktegesetz:**
- Die Software ist als Medizinprodukt klassifiziert
- Alle medizinischen Funktionen entsprechen den gesetzlichen Anforderungen

**Haftung:**
- Die Software wird "wie besehen" bereitgestellt
- Der Anbieter übernimmt keine Haftung für Schäden
- Regelmäßige Updates werden bereitgestellt

---

**Ende des Benutzerhandbuchs**

*MyMediCloud MMC*  
*Stand: Januar 2026*  
*Version 1.0*
