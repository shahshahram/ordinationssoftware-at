# SIT-Plattform: Detaillierte Test-Anleitung

## 📋 Übersicht

Diese Anleitung zeigt Ihnen **genau**, wie Sie die SIT-Konfiguration testen können.

---

## 🧪 TEST 1: Verbindungstest (ELDA & WAHonline)

### Schritt 1: ELDA-Testseite öffnen

1. **Browser öffnen:** `http://localhost:3000`
2. **Anmelden** mit Ihren Zugangsdaten
3. **Im Menü navigieren zu:**
   - **"ELDA Teststrecke"** (im Menü unter "Einstellungen" oder direkt über URL: `/elda-test`)

### Schritt 2: ELDA-Verbindung testen

**Was Sie sehen sollten:**
- Tab: **"Verbindungstest"**
- Dropdown: **"Übertragungsmethode"** (sollte "Automatisch" oder "Webservice" sein)
- Button: **"Verbindung testen"**

**Was Sie tun müssen:**

1. **Übertragungsmethode prüfen:**
   - Sollte automatisch auf **"Automatisch"** oder **"Webservice"** stehen
   - Falls nicht: Wählen Sie **"Automatisch"** oder **"Webservice"**
   - ⚠️ **NICHT** "FTPS" wählen (wird von SIT nicht unterstützt)

2. **Klicken Sie auf "Verbindung testen"**

3. **Erwartetes Ergebnis:**
   ```
   ✅ Verbindung erfolgreich
   Umgebung: sit
   Methode: webservice
   URL: https://online-itu5test.elda.at/elda-online/servlet/WebTrans
   ```

**Falls Fehler auftreten:**
- Prüfen Sie, ob Backend-Server läuft
- Prüfen Sie die `.env` Datei auf Tippfehler
- Prüfen Sie die Backend-Logs im Terminal

### Schritt 3: WAHonline-Verbindung testen

1. **Im Menü navigieren zu:**
   - **"WAHonline Teststrecke"** (im Menü oder direkt über URL: `/wahonline-test`)

2. **Klicken Sie auf "Verbindung testen"**

3. **Erwartetes Ergebnis:**
   ```
   ✅ Verbindung erfolgreich
   Umgebung: sit
   Methode: elda-webservice
   URL: https://online-itu5test.elda.at/elda-online/servlet/WebTrans
   ```

---

## 📤 TEST 2: Testdaten senden (ELDA)

### Schritt 1: ELDA-Testseite öffnen

1. Gehen Sie zu: **"ELDA Teststrecke"** (`/elda-test`)

2. **Tab wechseln:** Klicken Sie auf **"Daten senden"**

### Schritt 2: Testdaten eingeben

**Was Sie sehen sollten:**
- Formularfelder für:
  - Datensatztyp (Dropdown)
  - Patientendaten
  - Arztdaten
  - Leistungsdaten

**Minimales Test-Beispiel:**

1. **Datensatztyp wählen:**
   - Wählen Sie: **"Abrechnung"**

2. **Patientendaten eingeben:**
   ```json
   {
     "socialSecurityNumber": "1133280290",
     "firstName": "Scarlett",
     "lastName": "ASWH-VS-MRSA-Erwachsene-B",
     "dateOfBirth": "1990-02-28",
     "gender": "weiblich",
     "address": {
       "street": "Duftschmidgasse",
       "houseNumber": "18",
       "postalCode": "4020",
       "city": "Linz",
       "country": "Österreich"
     }
   }
   ```

3. **Arztdaten eingeben:**
   ```json
   {
     "taxNumber": "123456789",
     "chamberNumber": "14",
     "name": "Test Arzt",
     "address": {
       "street": "Teststraße",
       "postalCode": "4020",
       "city": "Linz"
     }
   }
   ```

4. **Leistungsdaten eingeben:**
   ```json
   {
     "services": [{
       "date": "2025-01-18",
       "code": "100",
       "description": "Test-Leistung",
       "quantity": 1,
       "unitPrice": 50.00,
       "totalPrice": 50.00
     }]
   }
   ```

### Schritt 3: Daten senden

1. **Klicken Sie auf "Daten senden"**

2. **Erwartetes Ergebnis:**
   ```
   ✅ Daten erfolgreich an ELDA übertragen
   Methode: webservice
   Umgebung: sit
   Status: 200 OK
   ```

**Falls Fehler auftreten:**
- Prüfen Sie die Fehlermeldung
- Prüfen Sie die Backend-Logs
- Prüfen Sie, ob alle Pflichtfelder ausgefüllt sind

---

## 📤 TEST 3: Testdaten senden (WAHonline)

### Schritt 1: WAHonline-Testseite öffnen

1. Gehen Sie zu: **"WAHonline Teststrecke"** (`/wahonline-test`)

2. **Tab wechseln:** Klicken Sie auf **"Meldung senden"**

### Schritt 2: Testdaten eingeben

**Minimales Test-Beispiel:**

1. **Patientendaten:**
   ```json
   {
     "socialSecurityNumber": "1133280290",
     "firstName": "Scarlett",
     "lastName": "ASWH-VS-MRSA-Erwachsene-B",
     "dateOfBirth": "1990-02-28",
     "gender": "weiblich"
   }
   ```

2. **Arztdaten:**
   ```json
   {
     "chamberNumber": "14",
     "doctorNumber": "12345",
     "name": "Test Arzt"
   }
   ```

3. **Leistungsdaten:**
   ```json
   {
     "serviceCode": "100",
     "serviceDescription": "Test-Leistung",
     "serviceDatetime": "2025-01-18T10:00:00",
     "quantity": 1,
     "unitPrice": 50.00,
     "totalPrice": 50.00
   }
   ```

### Schritt 3: Meldung senden

1. **Klicken Sie auf "Meldung senden"**

2. **Erwartetes Ergebnis:**
   ```
   ✅ Meldung erfolgreich an WAHonline übermittelt
   Methode: elda-webservice
   Umgebung: sit
   WAHonline-Referenz: [Referenznummer]
   ```

---

## 📥 TEST 4: Testdaten importieren (Optional)

### Schritt 1: CSV-Dateien vorbereiten

Stellen Sie sicher, dass die CSV-Dateien verfügbar sind:
- `Stammdaten_ASWH_MRSA_20251219.csv` (Versicherte)
- `ASWH_Vertragspartner_20250617/` (Vertragspartner)

### Schritt 2: Import-Script ausführen

**Terminal öffnen:**

```bash
cd ordinationssoftware-at/backend
node scripts/import-sit-testdata.js all ~/Downloads
```

**Oder einzeln:**

```bash
# Nur Versicherte
node scripts/import-sit-testdata.js versicherte ~/Downloads/Stammdaten_ASWH_MRSA_20251219.csv

# Nur Vertragspartner
node scripts/import-sit-testdata.js vertragspartner ~/Downloads/ASWH_Vertragspartner_20250617/ASWH-VP-Arzt-Linz-A-Tabelle\ 1.csv
```

### Schritt 3: Überprüfung

1. **Gehen Sie zu "Patienten"** in der Anwendung
2. **Suchen Sie nach:** "Scarlett" oder "1133280290"
3. **Sie sollten den Testpatienten sehen**

---

## 🔍 TEST 5: Überprüfung der Konfiguration

### Schritt 1: Settings-Seite prüfen

1. Gehen Sie zu: **"Einstellungen"** (`/settings`)

2. **ELDA-Konfiguration prüfen:**
   - ✅ Status: **"Konfiguriert"** (grün)
   - ✅ Umgebung: **"SIT"**
   - ✅ Standard: **"WEBSERVICE"**
   - ✅ ELDA-Übermittlung: **Aktiviert**

3. **WAHonline-Integration prüfen:**
   - ✅ Status: **"Konfiguriert"** (grün)
   - ✅ Umgebung: **"SIT"**
   - ✅ WAHonline-Übermittlung: **Aktiviert**

### Schritt 2: Backend-Logs prüfen

**Im Terminal, wo der Backend-Server läuft:**

Sie sollten sehen:
```
ELDA Environment: sit
ELDA Method: webservice
ELDA SIT Seriennummer: gesetzt
WAHonline Environment: sit
WAHonline Method: elda-webservice
```

**Falls Fehler:**
- Prüfen Sie die `.env` Datei
- Prüfen Sie die Fehlermeldungen in den Logs

---

## 🧪 TEST 6: Echte Abrechnung testen

### Schritt 1: Patient auswählen

1. Gehen Sie zu: **"Patienten"**
2. Wählen Sie einen Testpatienten (z.B. "Scarlett" - SV-Nummer: 1133280290)

### Schritt 2: Leistung erstellen

1. Gehen Sie zum **Patient Organizer**
2. Erstellen Sie eine **neue Leistung**
3. Füllen Sie die Leistungsdaten aus:
   - Leistungscode
   - Beschreibung
   - Preis
   - Datum

### Schritt 3: Abrechnung erstellen

1. **Abrechnung erstellen** für die Leistung
2. **Abrechnung abschicken**

**Erwartetes Verhalten:**
- Abrechnung wird automatisch an ELDA übermittelt (wenn ELDA aktiviert)
- WAHonline-Meldung wird automatisch erstellt (wenn WAHonline aktiviert)

### Schritt 4: Überprüfung

1. **Prüfen Sie die Abrechnungs-Historie**
2. **Prüfen Sie die ELDA-Logs** (falls vorhanden)
3. **Prüfen Sie die WAHonline-Logs** (falls vorhanden)

---

## 📊 TEST 7: API-Endpoints direkt testen (Erweitert)

### ELDA-Status prüfen

**Terminal (curl):**
```bash
curl -X GET http://localhost:5001/api/elda/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Oder im Browser (mit Token):**
```
http://localhost:5001/api/elda/status
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "data": {
    "configured": true,
    "environment": "sit",
    "defaultMethod": "webservice",
    "webservice": {
      "enabled": true,
      "baseUrl": "https://online-itu5test.elda.at/elda-online/servlet/WebTrans"
    },
    "errors": []
  }
}
```

### WAHonline-Status prüfen

```bash
curl -X GET http://localhost:5001/api/wahonline/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "data": {
    "configured": true,
    "environment": "sit",
    "api": {
      "enabled": true,
      "baseUrl": "https://online-itu5test.elda.at/elda-online/servlet/WebTrans"
    },
    "errors": []
  }
}
```

---

## ✅ Checkliste: Alle Tests erfolgreich?

- [ ] ELDA-Verbindungstest erfolgreich
- [ ] WAHonline-Verbindungstest erfolgreich
- [ ] ELDA-Testdaten erfolgreich gesendet
- [ ] WAHonline-Testdaten erfolgreich gesendet
- [ ] Testdaten importiert (optional)
- [ ] Settings-Seite zeigt "Konfiguriert" für beide
- [ ] Backend-Logs zeigen keine Fehler
- [ ] Echte Abrechnung wurde erfolgreich übermittelt

---

## 🔧 Troubleshooting

### Problem: "Verbindungstest fehlgeschlagen"

**Lösung:**
1. Prüfen Sie, ob Backend-Server läuft
2. Prüfen Sie die `.env` Datei
3. Prüfen Sie die Backend-Logs
4. Prüfen Sie die Netzwerkverbindung

### Problem: "Daten konnten nicht gesendet werden"

**Lösung:**
1. Prüfen Sie die Fehlermeldung
2. Prüfen Sie, ob alle Pflichtfelder ausgefüllt sind
3. Prüfen Sie die Datenvalidierung
4. Prüfen Sie die Backend-Logs

### Problem: "Status zeigt 'Nicht konfiguriert'"

**Lösung:**
1. Prüfen Sie die `.env` Datei
2. Backend-Server neu starten
3. Browser-Cache leeren
4. Seite neu laden

---

## 📞 Nächste Schritte

Nach erfolgreichen Tests können Sie:
1. ✅ Echte Abrechnungen über SIT-Plattform senden
2. ✅ WAHonline-Meldungen über SIT-Plattform senden
3. ✅ Testdaten für weitere Tests verwenden
4. ✅ Ergebnisse im eSV-Portal überprüfen

---

**Viel Erfolg beim Testen!** 🎉
