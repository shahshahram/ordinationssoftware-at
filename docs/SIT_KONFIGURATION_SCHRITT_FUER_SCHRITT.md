# SIT-Konfiguration: Schritt-für-Schritt Anleitung

## 📋 Übersicht

Diese Anleitung zeigt Ihnen **genau**, wie Sie die SIT-Plattform konfigurieren.

**Ihre Zugangsdaten:**
- **Seriennummer:** `800062`
- **Passwort:** `6fBzSsTvpYtm95#wW%DW`
- **URL:** `https://online-itu5test.elda.at/elda-online/servlet/WebTrans`

---

## 🔧 Schritt 1: Backend `.env` Datei bearbeiten

### 1.1 Datei öffnen

1. Öffnen Sie einen Texteditor (z.B. VS Code, TextEdit, oder einen anderen Editor)
2. Navigieren Sie zum Ordner: `ordinationssoftware-at/backend/`
3. Öffnen Sie die Datei `.env`

**Wichtig:** Die `.env` Datei ist möglicherweise versteckt. Falls Sie sie nicht sehen:
- **macOS:** Im Finder `Cmd + Shift + .` drücken (zeigt versteckte Dateien)
- **VS Code:** Rechtsklick auf `backend` Ordner → "Reveal in Finder" → Dann `.env` öffnen

### 1.2 Folgende Zeilen hinzufügen

Fügen Sie am **Ende** der `.env` Datei folgende Zeilen hinzu:

```bash
# ============================================
# SIT-Plattform Konfiguration
# ============================================

# ELDA/WAHonline SIT-Umgebung aktivieren
ELDA_ENVIRONMENT=sit
WAHONLINE_ENVIRONMENT=sit

# Geteilte Credentials für ELDA und WAHonline SIT
ELDA_SIT_SERIENNUMMER=800062
ELDA_SIT_PASSWORT=6fBzSsTvpYtm95#wW%DW
```

### 1.3 Wichtig: Exakte Schreibweise

- **Keine Leerzeichen** um das `=` Zeichen
- **Keine Anführungszeichen** um die Werte
- **Großbuchstaben** für die Variablennamen (wie gezeigt)
- **Exakte Werte** wie oben angegeben

### 1.4 Datei speichern

Speichern Sie die Datei (`Cmd + S` oder `Ctrl + S`)

---

## 🖥️ Schritt 2: Backend-Server neu starten

### 2.1 Server stoppen

Falls der Backend-Server läuft:
1. Gehen Sie zum Terminal, wo der Server läuft
2. Drücken Sie `Ctrl + C` um den Server zu stoppen

### 2.2 Server neu starten

```bash
cd ordinationssoftware-at/backend
npm start
```

Oder falls Sie `nodemon` verwenden:
```bash
npm run dev
```

**Warten Sie**, bis Sie die Meldung sehen: `Server läuft auf Port 5001` (oder ähnlich)

---

## 🌐 Schritt 3: Frontend Settings-Seite konfigurieren

### 3.1 Settings-Seite öffnen

1. Öffnen Sie die Anwendung im Browser (z.B. `http://localhost:3000`)
2. Melden Sie sich an
3. Gehen Sie zu **Einstellungen** (Settings)

### 3.2 ELDA-Konfiguration

1. Scrollen Sie zum Abschnitt **"ELDA-Konfiguration"**

2. **ELDA-Übermittlung aktivieren:**
   - Schalten Sie den Toggle-Switch **EIN** (nach rechts)

3. **Übertragungsmethode:**
   - Klicken Sie auf das Dropdown "Übertragungsmethode"
   - Wählen Sie: **"Automatisch"** oder **"Webservice"**
   - ⚠️ **NICHT** "FTPS" wählen (wird von SIT nicht unterstützt)

4. **Umgebung:**
   - Klicken Sie auf das Dropdown "Umgebung"
   - Wählen Sie: **"Systemintegrationstest (SIT)"**

5. Klicken Sie auf **"Einstellungen speichern"** (blauer Button unten rechts)

### 3.3 WAHonline-Integration

1. Scrollen Sie zum Abschnitt **"WAHonline-Integration"**

2. **WAHonline-Übermittlung aktivieren:**
   - Schalten Sie den Toggle-Switch **EIN** (nach rechts)

3. **Umgebung:**
   - Falls vorhanden, wählen Sie: **"Systemintegrationstest (SIT)"**

4. Klicken Sie auf **"Einstellungen speichern"**

---

## ✅ Schritt 4: Überprüfung

### 4.1 Status prüfen

Nach dem Speichern sollten Sie sehen:

**ELDA-Konfiguration:**
- ✅ Status: **"Konfiguriert"** (grüner Badge)
- ✅ Umgebung: **"SIT"** (grauer Badge)
- ✅ Standard: **"Webservice"** (blauer Badge)
- ❌ **Keine Fehlermeldungen** mehr

**WAHonline-Integration:**
- ✅ Status: **"Konfiguriert"** (grüner Badge)
- ✅ Umgebung: **"SIT"** (grauer Badge)
- ❌ **Keine Fehlermeldungen** mehr

### 4.2 Falls noch Fehler angezeigt werden

**Fehler: "ELDA-Seriennummer und Passwort für SIT fehlen"**
- ✅ Prüfen Sie, ob die `.env` Datei korrekt gespeichert wurde
- ✅ Prüfen Sie, ob der Backend-Server neu gestartet wurde
- ✅ Prüfen Sie die Schreibweise in der `.env` Datei

**Fehler: "FTPS-Credentials fehlen"**
- ✅ Stellen Sie sicher, dass die Umgebung auf **"SIT"** gesetzt ist
- ✅ Stellen Sie sicher, dass die Übertragungsmethode **"Automatisch"** oder **"Webservice"** ist

---

## 🧪 Schritt 5: Verbindung testen (Optional)

### 5.1 ELDA-Verbindungstest

1. Gehen Sie zu **"ELDA Test"** (falls vorhanden im Menü)
2. Klicken Sie auf **"Verbindung testen"**
3. Sie sollten eine Erfolgsmeldung sehen

### 5.2 WAHonline-Verbindungstest

1. Gehen Sie zu **"WAHonline Test"** (falls vorhanden im Menü)
2. Klicken Sie auf **"Verbindung testen"**
3. Sie sollten eine Erfolgsmeldung sehen

---

## 📝 Zusammenfassung: Was wurde konfiguriert?

### Backend (`.env` Datei):
```bash
ELDA_ENVIRONMENT=sit
WAHONLINE_ENVIRONMENT=sit
ELDA_SIT_SERIENNUMMER=800062
ELDA_SIT_PASSWORT=6fBzSsTvpYtm95#wW%DW
```

### Frontend (Settings-Seite):
- ✅ ELDA-Übermittlung: **Aktiviert**
- ✅ ELDA-Übertragungsmethode: **Automatisch** oder **Webservice**
- ✅ ELDA-Umgebung: **SIT**
- ✅ WAHonline-Übermittlung: **Aktiviert**
- ✅ WAHonline-Umgebung: **SIT**

---

## 🔍 Troubleshooting

### Problem: Fehler bleiben bestehen

**Lösung:**
1. Backend-Server komplett stoppen (`Ctrl + C`)
2. Backend-Server neu starten
3. Browser-Cache leeren (`Cmd + Shift + R` auf macOS, `Ctrl + Shift + R` auf Windows)
4. Seite neu laden

### Problem: "Cannot find module" Fehler

**Lösung:**
```bash
cd ordinationssoftware-at/backend
npm install
```

### Problem: Server startet nicht

**Lösung:**
1. Prüfen Sie, ob Port 5001 bereits belegt ist
2. Prüfen Sie die `.env` Datei auf Syntaxfehler
3. Prüfen Sie die Logs im Terminal

---

## 📞 Nächste Schritte

Nach erfolgreicher Konfiguration können Sie:
1. ✅ Testdaten importieren (siehe `import-sit-testdata.js`)
2. ✅ ELDA-Abrechnungen testen
3. ✅ WAHonline-Meldungen testen

---

## ⚠️ Wichtige Hinweise

1. **Die `.env` Datei ist in `.gitignore`** - Ihre Credentials werden nicht in Git committed
2. **Nach jeder Änderung in `.env`**: Backend-Server neu starten
3. **SIT-Credentials sind Test-Credentials** - Nicht für Produktion verwenden
4. **FTPS wird von SIT nicht unterstützt** - Nur Webservice verwenden

---

**Fertig!** 🎉

Ihre SIT-Konfiguration sollte jetzt vollständig eingerichtet sein.
