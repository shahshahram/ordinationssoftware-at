# SIT-Plattform Analyse: WAHonline & ELDA Test-Schnittstellen

## Übersicht

Diese Analyse beschreibt die erhaltenen Zugangsdaten und Konfigurationsanforderungen für die SIT-Plattform (Systemintegrationstest-Plattform) der österreichischen Sozialversicherungsträger.

## Erhaltene Informationen

### 1. eSV-Portal Zugang

**URL:** https://www.syst.esv.sozialversicherung.at/

**Zweck:**
- Informationen zum Test mit der SIT-Plattform
- Rubrik: ARZTSOFTWAREHERSTELLER
- Dokumentation und Anleitungen

**Identitätensimulator:**
- **URL:** https://www.syst.esv.sozialversicherung.at/simuid/views/protected/overview.xhtml
- **Zweck:** Ersetzt ID Austria (Handy-Signatur, Bürgerkarte) für Test-Zugang
- **Benutzername 1:** `14MRSA01`
- **Benutzername 2:** `14MRSA02`
- **Kennwort:** Wird separat zugesendet (Teil 2)
- **JSON-File:** `multi_Principal_ASWH_MRSA_20251219.json` (siehe Anhang)

### 2. ELDA-Konfiguration für SIT

**Wichtig:** ELDA wird über die SIT-Plattform getestet, nicht über den normalen ELDA-Testserver.

**URL:** `https://online-itu5test.elda.at/elda-online/servlet/WebTrans`

**Hinweis:** FTPS wird von der SIT-Plattform **nicht unterstützt** - nur Webservice!

**ELDA-Seriennummer:** `800062`
- Zugeordnete Mailadresse: `tahamtani.omran@gmail.com`
- **Kundenpasswort:** Wird separat zugesendet (Teil 2)

**Unterschiede zu bestehender Konfiguration:**

| Aspekt | Bestehende Test-Konfiguration | SIT-Plattform |
|--------|------------------------------|---------------|
| URL | `https://online-test.elda.at/elda-online/servlet/WebTrans` | `https://online-itu5test.elda.at/elda-online/servlet/WebTrans` |
| FTPS | Unterstützt (`ftps-test.elda.at`) | **Nicht unterstützt** |
| Webservice | Unterstützt | Unterstützt |
| Seriennummer | Aus Settings/DB | `800062` (fest) |
| Passwort | Aus Settings/DB | Separates SIT-Passwort |

### 3. WAHonline-Konfiguration für SIT

**Wichtig:** WAHonline wird ebenfalls über die SIT-Plattform getestet.

**URL:** `https://online-itu5test.elda.at/elda-online/servlet/WebTrans` (gleiche URL wie ELDA!)

**Hinweis:** Die SIT-Plattform stellt derzeit "nur" WAHonline-Meldungs-Test zur Verfügung.

**Unterschiede zu bestehender Konfiguration:**

| Aspekt | Bestehende Test-Konfiguration | SIT-Plattform |
|--------|------------------------------|---------------|
| URL | `https://wahonline-test.aerztekammer.at/api/v1` | `https://online-itu5test.elda.at/elda-online/servlet/WebTrans` |
| API-Format | REST API (JSON) | ELDA-Webservice (XML) |
| Authentifizierung | API-Key + Kammer/Arzt-Nummer | ELDA-Seriennummer + Passwort |

### 4. Testdaten (Stammdaten-Basispaket)

**Verfügbare Testdaten:**
- Versicherte (8 Testpersonen im JSON-File)
- Vertragspartner
- Excel-Dateien: `Stammdaten_ASWH_*.xlsx` und `ASWH_Vertragspartner_*.xlsx`

**JSON-File Analyse (`multi_Principal_ASWH_MRSA_20251219.json`):**

Das JSON-File enthält 8 Testpersonen mit folgenden Informationen:

1. **SIMUID1** - Scarlett ASWH-VS-MRSA-Erwachsene-B
   - SV-Nummer: `1133280290`
   - Geburtsdatum: 1990-02-28
   - Geschlecht: weiblich
   - Sicherheitsklasse: 300

2. **SIMUID2** - Erna ASWH-VS-MRSA-Erwachsene-D
   - SV-Nummer: `1131050790`
   - Geburtsdatum: 1990-07-05
   - Geschlecht: weiblich
   - Sicherheitsklasse: 300

3. **SIMUID3** - Emanuel ASWH-VS-MRSA-Erwachsener-C
   - SV-Nummer: `1131260990`
   - Geburtsdatum: 1990-09-26
   - Geschlecht: männlich
   - Sicherheitsklasse: 300

4. **SIMUID4** - Sascha ASWH-VS-MRSA-Erwachsener-E
   - SV-Nummer: `1132100390`
   - Geburtsdatum: 1990-03-10
   - Geschlecht: männlich
   - Sicherheitsklasse: 300

5. **SIMUID5** - Alisa ASWH-VS-MRSA-Familie-A
   - SV-Nummer: `1137190890`
   - Geburtsdatum: 1990-08-19
   - Geschlecht: weiblich
   - Sicherheitsklasse: 300

6. **SIMUID6** - Carolin ASWH-VS-MRSA-Familie-A
   - SV-Nummer: `1120200108`
   - Geburtsdatum: 2008-01-20
   - Geschlecht: weiblich
   - Sicherheitsklasse: 300

7. **SIMUID7** - Mark ASWH-VS-MRSA-Familie-A
   - SV-Nummer: `1137041190`
   - Geburtsdatum: 1990-11-04
   - Geschlecht: männlich
   - Sicherheitsklasse: 300

8. **SIMUID8** - Stefan ASWH-VS-MRSA-Familie-A
   - SV-Nummer: `1142121021`
   - Geburtsdatum: 2021-10-12
   - Geschlecht: männlich
   - Sicherheitsklasse: 300

**Gemeinsame Eigenschaften:**
- Alle haben die Rolle: `Versicherter.SK300`
- Login-Provider: `esv`
- Ausstellerland: `AT`
- Sicherheitsklasse: `300`

## Analyse der bestehenden Konfiguration

### ELDA-Konfiguration (aktuell)

**Datei:** `backend/config/elda.config.js`

**Aktuelle SIT-Konfiguration:**
```javascript
sit: {
  baseUrl: 'https://online-itu5test.elda.at/elda-online/servlet/WebTrans',
  enabled: true
}
```

**Status:** ✅ URL ist bereits korrekt konfiguriert!

**Fehlende Konfiguration:**
- ELDA-Seriennummer: `800062` (muss in Settings/DB gespeichert werden)
- ELDA-Passwort: Wird separat zugesendet (muss in Settings/DB gespeichert werden)
- FTPS ist deaktiviert (korrekt, da nicht unterstützt)

### WAHonline-Konfiguration (aktuell)

**Datei:** `backend/config/wahonline.config.js`

**Aktuelle SIT-Konfiguration:**
```javascript
sit: {
  baseUrl: 'https://online-itu5test.elda.at/elda-online/servlet/WebTrans',
  enabled: true,
  note: 'WAHonline-Test über SIT-Plattform der ÖGK (ASWH)'
}
```

**Status:** ✅ URL ist bereits korrekt konfiguriert!

**Problem:** WAHonline verwendet normalerweise eine REST API, aber die SIT-Plattform verwendet das ELDA-Webservice-Format (XML).

**Fehlende Konfiguration:**
- WAHonline muss über ELDA-Webservice kommunizieren (nicht REST API)
- ELDA-Seriennummer und Passwort werden benötigt
- API-Key, Kammer-Nummer und Arzt-Nummer sind möglicherweise nicht erforderlich

## Erforderliche Anpassungen

### 1. ELDA-Konfiguration

**Umgebungsvariable:**
```bash
ELDA_ENVIRONMENT=sit
```

**Settings/DB-Konfiguration:**
- ELDA-Seriennummer: `800062`
- ELDA-Passwort: (aus separater Mail)
- ELDA-Methode: `webservice` (FTPS nicht verfügbar)
- ELDA-URL: Bereits korrekt (`https://online-itu5test.elda.at/elda-online/servlet/WebTrans`)

**User-Preferences (optional):**
```javascript
{
  eldaEnabled: true,
  eldaMethod: 'webservice', // FTPS nicht verfügbar
  eldaEnvironment: 'sit'
}
```

### 2. WAHonline-Konfiguration

**Umgebungsvariable:**
```bash
WAHONLINE_ENVIRONMENT=sit
```

**Problem:** WAHonline-Connector verwendet aktuell REST API, aber SIT verwendet ELDA-Webservice.

**Erforderliche Änderungen:**
- WAHonline-Connector muss für SIT-Umgebung ELDA-Webservice verwenden
- API-Key, Kammer-Nummer, Arzt-Nummer sind möglicherweise nicht erforderlich
- ELDA-Seriennummer und Passwort werden benötigt

**Settings/DB-Konfiguration:**
- WAHonline-URL: Bereits korrekt (`https://online-itu5test.elda.at/elda-online/servlet/WebTrans`)
- WAHonline-Methode: `elda-webservice` (neue Option)
- ELDA-Seriennummer: `800062` (geteilt mit ELDA)
- ELDA-Passwort: (geteilt mit ELDA)

### 3. Identitätensimulator-Integration

**Zweck:** Test-Zugang zum eSV-Portal ohne ID Austria.

**Erforderliche Funktionalität:**
- JSON-File Upload für Identitätensimulator
- Auswahl der Testperson (SIMUID1-8)
- Authentifizierung über Identitätensimulator
- Session-Management für Test-Zugang

**Aktueller Status:** ❌ Nicht implementiert

**Optionale Implementierung:**
- Eigene Test-Seite für Identitätensimulator
- Integration in bestehende ELDA/WAHonline-Testseiten
- Automatische Auswahl der Testperson basierend auf SV-Nummer

### 4. Testdaten-Integration

**Verfügbare Testdaten:**
- 8 Testpersonen (JSON-File)
- Excel-Dateien mit Stammdaten und Vertragspartnern

**Erforderliche Schritte:**
1. JSON-File analysieren und Testpersonen in DB importieren (optional)
2. Excel-Dateien analysieren und Testdaten verstehen
3. Testpersonen für Abrechnungs-Tests verwenden

**Aktueller Status:** ⚠️ Testdaten müssen noch analysiert werden

## Risiken und Herausforderungen

### 1. WAHonline-Format-Problem

**Problem:** WAHonline verwendet normalerweise REST API (JSON), aber SIT verwendet ELDA-Webservice (XML).

**Lösung:**
- WAHonline-Connector muss für SIT-Umgebung ELDA-Format verwenden
- Format-Generator muss ELDA-XML statt WAHonline-JSON generieren
- Separate Logik für SIT-Umgebung erforderlich

### 2. Geteilte Credentials

**Problem:** ELDA und WAHonline teilen sich die gleichen Credentials (Seriennummer + Passwort).

**Lösung:**
- Zentrale Credential-Verwaltung
- Geteilte Konfiguration für beide Systeme
- Keine Duplikation von Credentials

### 3. FTPS-Deaktivierung

**Problem:** FTPS wird von SIT nicht unterstützt, nur Webservice.

**Lösung:**
- Automatische Deaktivierung von FTPS für SIT-Umgebung
- Validierung: FTPS darf nicht verwendet werden
- Fehlermeldung, wenn FTPS für SIT konfiguriert wird

### 4. Testkalender

**Hinweis:** "Prüfen sie bitte ab dem nächsten Testzyklus (siehe Testkalender), ob die Zugänge funktionieren."

**Erforderlich:**
- Testkalender im eSV-Portal prüfen
- Testzyklen beachten
- Zugänge nur während Testzyklen verwenden

### 5. Separates Passwort

**Problem:** Passwort wird in separater Mail zugesendet (Teil 2).

**Erforderlich:**
- Warten auf zweite Mail
- Passwort sicher speichern
- Passwort in Settings/DB konfigurieren

## Empfohlene Vorgehensweise

### Phase 1: Konfiguration

1. ✅ ELDA-URL ist bereits korrekt
2. ✅ WAHonline-URL ist bereits korrekt
3. ✅ Passwort-Mail (Teil 2) erhalten
4. ⏳ ELDA-Seriennummer (`800062`) in Settings speichern
5. ⏳ ELDA-Passwort (`6fBzSsTvpYtm95#wW%DW`) in Settings speichern (verschlüsselt!)
6. ⏳ Umgebungsvariable `ELDA_ENVIRONMENT=sit` setzen
7. ⏳ Umgebungsvariable `WAHONLINE_ENVIRONMENT=sit` setzen
8. ⏳ eSV-Portal Zugangsdaten dokumentieren (siehe `SIT_PLATTFORM_CREDENTIALS.md`)

### Phase 2: Code-Anpassungen

1. ⚠️ WAHonline-Connector für SIT-Umgebung anpassen (ELDA-Webservice verwenden)
2. ⚠️ WAHonline-Format-Generator für ELDA-XML anpassen
3. ⚠️ Validierung: FTPS darf nicht für SIT verwendet werden
4. ⚠️ Geteilte Credential-Verwaltung implementieren

### Phase 3: Testdaten

1. ⏳ JSON-File analysieren
2. ⏳ Excel-Dateien analysieren
3. ⏳ Testpersonen optional in DB importieren
4. ⏳ Test-Abrechnungen mit Testpersonen durchführen

### Phase 4: Testing

1. ⏳ Testkalender im eSV-Portal prüfen
2. ⏳ Zugänge während Testzyklus testen
3. ⏳ ELDA-Verbindungstest durchführen
4. ⏳ WAHonline-Verbindungstest durchführen
5. ⏳ Test-Abrechnungen senden
6. ⏳ Ergebnisse prüfen

## Zusammenfassung

### ✅ Bereits vorhanden

- ELDA SIT-URL ist korrekt konfiguriert
- WAHonline SIT-URL ist korrekt konfiguriert
- SIT-Umgebung ist in Config-Files vorhanden
- FTPS ist für SIT deaktiviert (korrekt)

### ✅ Erhalten (Mail Teil 2)

- ELDA-Passwort: `6fBzSsTvpYtm95#wW%DW`
- WAHonline-Passwort: `6fBzSsTvpYtm95#wW%DW` (gleiches wie ELDA)
- eSV-Portal Kennwörter: `8vz3xW4pDRP!6X&EQYYt` (Benutzer1), `NcXyQ3#WeMncjrYKWNu3` (Benutzer2)

### ⚠️ Erforderlich (Code-Anpassungen)

- WAHonline-Connector für SIT-Umgebung anpassen (ELDA-Webservice)
- WAHonline-Format-Generator für ELDA-XML anpassen
- Geteilte Credential-Verwaltung
- FTPS-Validierung für SIT

### 📋 Optional

- Identitätensimulator-Integration
- Testdaten-Import
- Testpersonen-Verwaltung

## Nächste Schritte

1. **Warten auf Mail Teil 2** (Passwort)
2. **Testkalender prüfen** (wann ist der nächste Testzyklus?)
3. **Excel-Dateien analysieren** (Stammdaten und Vertragspartner)
4. **Code-Anpassungen planen** (WAHonline-Connector)
5. **Test-Strategie entwickeln** (welche Tests sollen durchgeführt werden?)

## Wichtige Hinweise

1. **FTPS wird nicht unterstützt** - Nur Webservice verwenden!
2. **Gleiche URL für ELDA und WAHonline** - Beide verwenden die SIT-Plattform
3. **Geteilte Credentials** - ELDA und WAHonline teilen sich Seriennummer und Passwort
4. **Testzyklen beachten** - Zugänge nur während Testzyklen verwenden
5. **Separates Passwort** - Wird in Mail Teil 2 zugesendet
