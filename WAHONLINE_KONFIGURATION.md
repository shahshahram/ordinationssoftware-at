# WAHonline-Konfiguration - Schnellstart

## Status: SIT-Registrierung beantragt ✅

**Supportticket**: ASWHT-68

## Wichtige Information

Die **SIT-Plattform der ÖGK** stellt derzeit **"nur" WAHonline-Meldungs-Test** zur Verfügung. Vertragspartnerabrechnung kann derzeit nicht getestet werden.

## Nächste Schritte

### 1. Formular ausfüllen

Das Formular `Formular_Registrierung_Arztsoftware_Test.pdf` muss ausgefüllt werden:

**Benötigte Informationen:**
- Firmendaten (Name, Adresse, PLZ, Ort)
- Hauptansprechpartner (Name, E-Mail, Telefon)
- **IP-Adresse(n)** Ihrer Server (wichtig!)
- E-Mail-Adressen für Benutzerkonten

**Was Sie testen möchten:**
- ✅ **WAHonline-Meldungs-Test** (Wahlarzt-Leistungen)

### 2. Formular zurücksenden

Das ausgefüllte Formular an ASWH (ITSV) zurücksenden.

### 3. Warten auf Zugangsdaten

Nach der Registrierung erhalten Sie:
- API-Key für die SIT-Plattform
- Benutzerkonten-Zugangsdaten
- Bestätigung der IP-Adresse(n)

### 4. Konfiguration setzen

Nach Erhalt der Zugangsdaten, setzen Sie in `.env`:

```bash
# WAHonline SIT-Konfiguration
WAHONLINE_ENVIRONMENT=sit
WAHONLINE_API_KEY=<Ihr_API_Key_von_ASWH>
WAHONLINE_CHAMBER_NUMBER=<Ihre_Kammernummer>
WAHONLINE_DOCTOR_NUMBER=<Ihre_Arztnummer>
```

### 5. Testen

1. Backend neu starten
2. In der Ordinationssoftware: **Abrechnung → WAHonline Teststrecke**
3. Umgebung: **Systemintegrationstest (SIT)**
4. **Verbindung testen**

## Aktuelle Konfiguration

Die WAHonline-Integration ist bereits implementiert und bereit für Tests:

- ✅ Backend-Integration (`backend/services/connectors/wahonlineConnector.js`)
- ✅ Format-Generator (`backend/services/wahonlineFormatGenerator.js`)
- ✅ API-Routen (`backend/routes/wahonline.js`)
- ✅ Frontend-Teststrecke (`frontend/src/pages/WAHonlineTestPage.tsx`)
- ✅ Automatische Übermittlung nach Wahlarzt-Abrechnung

## Dokumentation

Detaillierte Anleitung: `docs/WAHONLINE_SIT_REGISTRIERUNG.md`




