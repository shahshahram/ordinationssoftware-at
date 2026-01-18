# SIT-Konfiguration: Visuelle Schritt-für-Schritt Anleitung

## 🎯 Ziel

Diese Anleitung zeigt Ihnen **genau**, was Sie wo eintragen müssen, mit den **exakten Werten**.

---

## 📝 SCHRITT 1: Backend `.env` Datei bearbeiten

### Wo ist die Datei?
```
ordinationssoftware-at/backend/.env
```

### Was müssen Sie tun?

1. **Öffnen Sie die Datei** `backend/.env` in einem Texteditor

2. **Scrollen Sie ans Ende** der Datei

3. **Fügen Sie diese Zeilen hinzu:**

```bash
# ============================================
# SIT-Plattform Konfiguration
# ============================================

ELDA_ENVIRONMENT=sit
WAHONLINE_ENVIRONMENT=sit
ELDA_SIT_SERIENNUMMER=800062
ELDA_SIT_PASSWORT=6fBzSsTvpYtm95#wW%DW
```

### ⚠️ WICHTIG: Exakte Schreibweise

**RICHTIG:**
```bash
ELDA_SIT_SERIENNUMMER=800062
ELDA_SIT_PASSWORT=6fBzSsTvpYtm95#wW%DW
```

**FALSCH:**
```bash
ELDA_SIT_SERIENNUMMER = 800062          ❌ (Leerzeichen um =)
ELDA_SIT_SERIENNUMMER="800062"         ❌ (Anführungszeichen)
elda_sit_seriennummer=800062           ❌ (Kleinbuchstaben)
ELDA_SIT_SERIENNUMMER= 800062          ❌ (Leerzeichen nach =)
```

### Beispiel: So sollte es aussehen

```bash
# Ihre bestehenden Einstellungen...
MONGODB_URI=mongodb://localhost:27017/ordinationssoftware
JWT_SECRET=your-secret-key
PORT=5001

# ============================================
# SIT-Plattform Konfiguration
# ============================================

ELDA_ENVIRONMENT=sit
WAHONLINE_ENVIRONMENT=sit
ELDA_SIT_SERIENNUMMER=800062
ELDA_SIT_PASSWORT=6fBzSsTvpYtm95#wW%DW
```

4. **Speichern Sie die Datei** (`Cmd + S` oder `Ctrl + S`)

---

## 🔄 SCHRITT 2: Backend-Server neu starten

### Warum?
Die `.env` Datei wird nur beim Start gelesen. Änderungen werden erst nach Neustart wirksam.

### Wie?

1. **Terminal öffnen**, wo der Backend-Server läuft

2. **Server stoppen:**
   - Drücken Sie `Ctrl + C`

3. **Server neu starten:**
   ```bash
   cd ordinationssoftware-at/backend
   npm start
   ```

4. **Warten Sie** auf die Meldung:
   ```
   Server läuft auf Port 5001
   MongoDB verbunden
   ```

---

## 🖥️ SCHRITT 3: Frontend Settings-Seite

### 3.1 Seite öffnen

1. Öffnen Sie die Anwendung: `http://localhost:3000`
2. Melden Sie sich an
3. Klicken Sie auf **"Einstellungen"** (Settings) im Menü

### 3.2 ELDA-Konfiguration

**Was Sie sehen sollten:**
- Abschnitt: **"ELDA-Konfiguration"**
- Status: **"Nicht konfiguriert"** (rot)
- Umgebung: **"test"** (grau)

**Was Sie tun müssen:**

#### A) ELDA-Übermittlung aktivieren
- ✅ **Toggle-Switch nach rechts schieben** (EIN)
- Der Switch sollte **blau** werden

#### B) Übertragungsmethode
- Klicken Sie auf das **Dropdown** "Übertragungsmethode"
- Wählen Sie: **"Automatisch"** ✅
  - ODER: **"Webservice"** ✅
  - ❌ **NICHT:** "FTPS" (wird von SIT nicht unterstützt)

#### C) Umgebung
- Klicken Sie auf das **Dropdown** "Umgebung"
- Wählen Sie: **"Systemintegrationstest (SIT)"** ✅

#### D) Speichern
- Scrollen Sie nach unten
- Klicken Sie auf **"Einstellungen speichern"** (blauer Button)

**Nach dem Speichern sollten Sie sehen:**
- ✅ Status: **"Konfiguriert"** (grün)
- ✅ Umgebung: **"SIT"** (grau)
- ✅ Standard: **"Webservice"** (blau)
- ❌ **Keine Fehlermeldungen** mehr

### 3.3 WAHonline-Integration

**Was Sie sehen sollten:**
- Abschnitt: **"WAHonline-Integration"**
- Status: **"Nicht konfiguriert"** (rot)
- Umgebung: **"test"** (grau)

**Was Sie tun müssen:**

#### A) WAHonline-Übermittlung aktivieren
- ✅ **Toggle-Switch nach rechts schieben** (EIN)
- Der Switch sollte **blau** werden

#### B) Speichern
- Scrollen Sie nach unten
- Klicken Sie auf **"Einstellungen speichern"** (blauer Button)

**Nach dem Speichern sollten Sie sehen:**
- ✅ Status: **"Konfiguriert"** (grün)
- ✅ Umgebung: **"SIT"** (grau)
- ❌ **Keine Fehlermeldungen** mehr

---

## ✅ SCHRITT 4: Überprüfung

### Checkliste

**Backend:**
- [ ] `.env` Datei enthält die 4 Zeilen (ELDA_ENVIRONMENT, WAHONLINE_ENVIRONMENT, ELDA_SIT_SERIENNUMMER, ELDA_SIT_PASSWORT)
- [ ] Backend-Server wurde neu gestartet
- [ ] Keine Fehler im Terminal

**Frontend:**
- [ ] ELDA-Übermittlung ist aktiviert (Toggle EIN)
- [ ] ELDA-Übertragungsmethode ist "Automatisch" oder "Webservice"
- [ ] ELDA-Umgebung ist "SIT"
- [ ] WAHonline-Übermittlung ist aktiviert (Toggle EIN)
- [ ] Status zeigt "Konfiguriert" (grün) für beide
- [ ] Keine Fehlermeldungen mehr

---

## 🔍 Häufige Fehler und Lösungen

### Fehler 1: "ELDA-Seriennummer und Passwort für SIT fehlen"

**Ursache:** Backend hat die `.env` Datei noch nicht geladen

**Lösung:**
1. Prüfen Sie, ob die `.env` Datei korrekt gespeichert wurde
2. **Backend-Server komplett stoppen** (`Ctrl + C`)
3. **Backend-Server neu starten**
4. Seite im Browser neu laden (`Cmd + Shift + R`)

### Fehler 2: "FTPS-Credentials fehlen"

**Ursache:** Umgebung ist noch auf "test" statt "SIT"

**Lösung:**
1. Gehen Sie zu Settings
2. Stellen Sie die Umgebung auf **"Systemintegrationstest (SIT)"**
3. Stellen Sie die Übertragungsmethode auf **"Automatisch"** oder **"Webservice"**
4. Speichern Sie die Einstellungen

### Fehler 3: Status bleibt "Nicht konfiguriert"

**Ursache:** Backend-Validierung schlägt fehl

**Lösung:**
1. Prüfen Sie die `.env` Datei auf Tippfehler
2. Prüfen Sie, ob alle 4 Zeilen vorhanden sind
3. Prüfen Sie, ob keine Leerzeichen um `=` sind
4. Backend-Server neu starten
5. Browser-Cache leeren und Seite neu laden

---

## 📋 Zusammenfassung: Exakte Werte

### Backend `.env` Datei:
```bash
ELDA_ENVIRONMENT=sit
WAHONLINE_ENVIRONMENT=sit
ELDA_SIT_SERIENNUMMER=800062
ELDA_SIT_PASSWORT=6fBzSsTvpYtm95#wW%DW
```

### Frontend Settings:
- **ELDA-Übermittlung:** ✅ Aktiviert
- **ELDA-Übertragungsmethode:** Automatisch oder Webservice
- **ELDA-Umgebung:** Systemintegrationstest (SIT)
- **WAHonline-Übermittlung:** ✅ Aktiviert
- **WAHonline-Umgebung:** SIT (automatisch)

---

## 🎉 Fertig!

Wenn alle Punkte erfüllt sind, ist Ihre SIT-Konfiguration vollständig eingerichtet.

**Nächste Schritte:**
- Testdaten importieren (optional)
- Verbindungstests durchführen
- Erste Test-Abrechnungen senden

---

## 📞 Hilfe

Falls Sie Probleme haben:
1. Prüfen Sie die `.env` Datei auf Tippfehler
2. Prüfen Sie die Backend-Logs im Terminal
3. Prüfen Sie die Browser-Konsole (F12)
4. Starten Sie Backend und Frontend neu
