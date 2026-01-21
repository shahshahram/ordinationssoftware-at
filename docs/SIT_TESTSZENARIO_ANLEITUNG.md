# SIT-Plattform: Testszenario-Anleitung

## Übersicht

Die SIT-Plattform (Systemintegrationstest-Plattform) ermöglicht es, WAHonline-Meldungen (Honorarnotenmeldungen) zu testen. Dabei können Sie überprüfen, ob die eingereichte Rechnung dem Patienten (Versicherten) vom Versicherungsträger automatisch erstattet wurde oder nicht.

## Testszenario im Überblick

| Testschritt | Erwartetes Ergebnis | Verwendbare Tools |
|------------|---------------------|-------------------|
| **1. Meldungsdatei an ELDA senden** | WAHonline-Meldung von ELDA erfolgreich übernommen | Ihr Software-Produkt, ELDA Software oder ELDA Online |
| **2. Prüfen, ob Einreichung im System erfasst wurde** (nach ca. 10 Minuten) | Offene Einreichung für den Versicherten wird angezeigt | Meine ÖGK via Identitätensimulator |
| **3. Prüfen, ob dem Patienten die Kosten erstattet wurden** (nach erfolgtem Meldungsverarbeitungslauf) | Erstattete Einreichung für den Versicherten inklusive der Kostenbeträge wird angezeigt | Meine ÖGK via Identitätensimulator |

**Hinweis**: Einreichungen, die eine manuelle Bearbeitung durch einen ÖGK-Sachbearbeiter nötig machen, werden auf der SIT-Plattform nicht "beantwortet", da kein Sachbearbeiter vorhanden ist. Es wird in diesem Fall eine "offene Einreichung" in Meine ÖGK angezeigt, aber der Status der Einreichung ändert sich nicht zu "erstattet".

## Verfügbare Tools

### 1. Ihr Software-Produkt (MyMediCloud MMC)
- **Vorteil**: Direkte Integration in Ihre Software
- **Verwendung**: WAHonline-Testseite in der Software verwenden
- **URL**: `/wahonline-test` (im Frontend)

### 2. ELDA Software
- **Vorteil**: Offizielles ELDA-Tool
- **Verwendung**: Siehe ELDA-Dokumentation
- **Download**: Von ELDA-Website

### 3. ELDA Online
- **Vorteil**: Web-basiert, keine Installation nötig
- **Verwendung**: Siehe ELDA-Dokumentation
- **URL**: ELDA-Online-Portal

### 4. Meine ÖGK (via Identitätensimulator)
- **Zweck**: Status der Einreichung/Kostenerstattung abfragen
- **Zugang**: Über Identitätensimulator (ersetzt ID Austria)
- **URL**: https://www.syst.esv.sozialversicherung.at/simuid/views/protected/overview.xhtml

## Testschritte im Detail

### Schritt 1: Meldungsdatei an ELDA senden

#### Option A: Über MyMediCloud MMC

1. **WAHonline-Testseite öffnen**
   - Navigieren Sie zu: `/wahonline-test`
   - Tab: "Meldung senden"

2. **Testdaten eingeben**
   - Verwenden Sie die offiziellen SIT-Testpatienten (siehe `SIT_TESTDATEN_ANLEITUNG.md`)
   - Beispiel:
     ```json
     {
       "patient": {
         "socialSecurityNumber": "1133280290",
         "firstName": "Scarlett",
         "lastName": "ASWH-VS-MRSA-Erwachsene-B",
         "dateOfBirth": "1990-02-28"
       },
       "performance": {
         "serviceCode": "111",
         "serviceDescription": "Ordinationskonsultation",
         "serviceDatetime": "2026-01-18T14:34:17.267Z",
         "totalPrice": 35,
         "unitPrice": 35,
         "quantity": 1
       },
       "doctor": {
         "profile": {
           "chamberNumber": "14",
           "taxNumber": "ATU12345678"
         }
       }
     }
     ```

3. **Meldung senden**
   - Klicken Sie auf "Meldung senden"
   - **Erwartetes Ergebnis**: 
     ```
     ✅ WAHonline-Meldung erfolgreich via ELDA-Webservice (SIT) übermittelt
     Status: submitted
     ```

#### Option B: Über ELDA Software oder ELDA Online

- Siehe ELDA-Dokumentation für Details
- Verwenden Sie die Beispiel-Honorarnotenmeldungsdatei (von ELDA verfügbar)

### Schritt 2: Prüfen, ob Einreichung im System erfasst wurde

**Wartezeit**: Ca. 10 Minuten nach dem Senden der Meldung

1. **Identitätensimulator öffnen**
   - URL: https://www.syst.esv.sozialversicherung.at/simuid/views/protected/overview.xhtml
   - **Benutzername**: `14MRSA01` oder `14MRSA02`
   - **Kennwort**: [Ihr SIT-Kennwort]

2. **Als Testpatient anmelden**
   - Wählen Sie den Testpatienten aus, für den Sie die Meldung gesendet haben
   - Beispiel: `14MRSA01` → Scarlett ASWH-VS-MRSA-Erwachsene-B (SV-Nr: 1133280290)

3. **Meine ÖGK öffnen**
   - Navigieren Sie zu "Meine ÖGK" im Identitätensimulator
   - Suchen Sie nach "Einreichungen" oder "Kostenerstattungen"

4. **Erwartetes Ergebnis**
   - **Offene Einreichung** wird angezeigt
   - Status: "Offen" oder "In Bearbeitung"
   - Die Einreichung sollte sichtbar sein, auch wenn noch keine Erstattung erfolgt ist

### Schritt 3: Prüfen, ob dem Patienten die Kosten erstattet wurden

**Wartezeit**: Nach erfolgtem Meldungsverarbeitungslauf (siehe Testkalender - Testzykluswoche)

1. **Meine ÖGK erneut öffnen**
   - Gleicher Zugang wie in Schritt 2
   - Navigieren Sie zu den Einreichungen

2. **Erwartetes Ergebnis**
   - **Erstattete Einreichung** wird angezeigt
   - Status: "Erstattet" oder "Abgeschlossen"
   - **Kostenbeträge** werden angezeigt:
     - Gesamtbetrag
     - Erstattungsbetrag
     - Selbstbehalt (falls vorhanden)

3. **Falls keine Erstattung erfolgt**
   - **Mögliche Ursachen**:
     - Manuelle Bearbeitung erforderlich (wird auf SIT-Plattform nicht bearbeitet)
     - Fehler in den Daten
     - Meldungsverarbeitungslauf noch nicht abgeschlossen
   - **Ergebnis**: "Offene Einreichung" bleibt bestehen, Status ändert sich nicht

## Testkalender (Testzykluswoche)

Die Meldungsverarbeitungsläufe finden zu bestimmten Zeiten statt. Bitte prüfen Sie den Testkalender auf der SIT-Plattform, um zu erfahren, wann die nächste Verarbeitung stattfindet.

**Typischer Ablauf**:
- **Meldung senden**: Jederzeit möglich
- **Erfassung im System**: Nach ca. 10 Minuten
- **Erstattung**: Nach erfolgtem Meldungsverarbeitungslauf (siehe Kalender)

## Beispiel-Honorarnotenmeldungsdatei

ELDA stellt eine Beispiel-Honorarnotenmeldungsdatei zur Verfügung, die in der Detail-Anleitung verwendet wird. Diese Datei kann von der ELDA-Website heruntergeladen werden.

**Verwendung**:
- Als Referenz für das korrekte XML-Format
- Zum Testen mit ELDA Software oder ELDA Online
- Zum Vergleich mit Ihrer eigenen Implementierung

## Häufige Probleme und Lösungen

### Problem 1: "unbekannter Fehler" beim Senden
**Symptom**: Server antwortet mit Status 200, aber HTML-Fehlermeldung "unbekannter Fehler"

**Mögliche Ursachen**:
- XML-Format ist nicht korrekt
- Fehlende Pflichtfelder
- Falsche Feldnamen oder Datum-Formate

**Lösung**:
- Prüfen Sie die Backend-Logs (gesendetes XML wird geloggt)
- Vergleichen Sie mit der Beispiel-Honorarnotenmeldungsdatei
- Kontaktieren Sie ELDA-Support für das korrekte XML-Format

### Problem 2: Einreichung wird nicht in Meine ÖGK angezeigt
**Symptom**: Meldung wurde erfolgreich gesendet, aber erscheint nicht in Meine ÖGK

**Mögliche Ursachen**:
- Wartezeit noch nicht abgelaufen (ca. 10 Minuten)
- Falscher Testpatient verwendet
- Meldung wurde nicht korrekt verarbeitet

**Lösung**:
- Warten Sie mindestens 10 Minuten
- Prüfen Sie, ob der richtige Testpatient verwendet wurde
- Prüfen Sie die Backend-Logs auf Fehler

### Problem 3: Einreichung bleibt "offen" und wird nicht erstattet
**Symptom**: Einreichung wird angezeigt, aber Status ändert sich nicht zu "erstattet"

**Mögliche Ursachen**:
- Manuelle Bearbeitung erforderlich (wird auf SIT-Plattform nicht bearbeitet)
- Fehler in den Daten
- Meldungsverarbeitungslauf noch nicht abgeschlossen

**Lösung**:
- Prüfen Sie, ob die Daten korrekt sind
- Warten Sie auf den nächsten Meldungsverarbeitungslauf
- Kontaktieren Sie ELDA-Support, falls das Problem weiterhin besteht

## Nächste Schritte

1. **Meldung senden** über MyMediCloud MMC
2. **10 Minuten warten**
3. **Meine ÖGK prüfen** (Identitätensimulator)
4. **Auf Meldungsverarbeitungslauf warten** (siehe Testkalender)
5. **Erstattung prüfen** in Meine ÖGK

## Weitere Ressourcen

- **ELDA-Dokumentation**: Detail-Bedienungsanleitung zum Ausführen des Testszenarios
- **Beispiel-Honorarnotenmeldungsdatei**: Von ELDA-Website herunterladbar
- **SIT-Testdaten**: Siehe `SIT_TESTDATEN_ANLEITUNG.md`
- **ELDA-Support**: Bei Fragen zum XML-Format oder anderen Problemen
