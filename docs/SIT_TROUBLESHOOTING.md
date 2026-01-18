# SIT-Plattform: Troubleshooting

## Fehler: "Keine Antwort vom ELDA-Webservice"

### Mögliche Ursachen

1. **Endpunkt nicht erreichbar**
   - Prüfen Sie die Netzwerkverbindung
   - Prüfen Sie, ob der Server erreichbar ist: `https://online-itu5test.elda.at`

2. **XML-Format falsch**
   - Der SIT-Webservice erwartet möglicherweise ein spezifisches XML-Format
   - Prüfen Sie die ELDA-Dokumentation für das korrekte Format

3. **Timeout zu kurz**
   - Der Server antwortet möglicherweise langsamer
   - Timeout ist aktuell: 30 Sekunden

4. **Authentifizierung fehlgeschlagen**
   - Prüfen Sie Seriennummer und Passwort
   - Prüfen Sie, ob Basic Auth korrekt formatiert ist

### Debugging-Schritte

1. **Backend-Logs prüfen:**
   ```bash
   # Im Terminal, wo der Backend-Server läuft
   # Schauen Sie nach Fehlermeldungen
   ```

2. **Debug-Modus aktivieren:**
   ```bash
   # In backend/.env hinzufügen:
   LOG_LEVEL=debug
   ```

3. **Automatischer Test mit Test-Script:**
   ```bash
   # Führen Sie das Test-Script aus
   cd backend
   node scripts/test-elda-sit-connection.js
   ```
   
   Das Script führt 4 Tests durch:
   - Test 1: Einfacher GET-Request (ohne Auth)
   - Test 2: GET-Request mit Basic Auth
   - Test 3: POST-Request mit minimalem XML
   - Test 4: POST-Request mit ELDA-Format XML

4. **Manueller Test mit curl:**
   ```bash
   # Ersetzen Sie SERIENNUMMER und PASSWORT mit Ihren Werten
   curl -X POST https://online-itu5test.elda.at/elda-online/servlet/WebTrans \
     -H "Content-Type: application/xml; charset=UTF-8" \
     -H "Authorization: Basic $(echo -n 'SERIENNUMMER:PASSWORT' | base64)" \
     -d '<?xml version="1.0" encoding="UTF-8"?><test>Test</test>'
   ```

### Häufige Probleme

#### Problem 1: XML-Format nicht korrekt
**Symptom:** Server antwortet nicht oder mit Fehler

**Lösung:**
- Prüfen Sie die ELDA-Dokumentation für das korrekte XML-Format
- Prüfen Sie, ob alle Pflichtfelder vorhanden sind
- Prüfen Sie die XML-Validierung

#### Problem 2: Timeout
**Symptom:** "Keine Antwort vom ELDA-Webservice" nach 30 Sekunden

**Lösung:**
- Timeout in `elda.config.js` erhöhen (z.B. auf 60 Sekunden)
- Prüfen Sie die Netzwerkverbindung

#### Problem 3: Authentifizierung
**Symptom:** 401 Unauthorized oder keine Antwort

**Lösung:**
- Prüfen Sie Seriennummer und Passwort in `.env`
- Prüfen Sie, ob Basic Auth korrekt formatiert ist
- Prüfen Sie die Backend-Logs für Details

### Nächste Schritte

1. **Backend-Logs prüfen** - Schauen Sie nach detaillierten Fehlermeldungen
2. **Debug-Modus aktivieren** - Setzen Sie `LOG_LEVEL=debug` in `.env`
3. **Manueller Test** - Testen Sie die Verbindung mit curl
4. **ELDA-Dokumentation prüfen** - Prüfen Sie das erwartete XML-Format
