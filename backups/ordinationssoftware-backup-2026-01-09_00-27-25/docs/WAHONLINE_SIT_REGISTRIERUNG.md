# WAHonline SIT-Registrierung - Anleitung

## Übersicht

Die **SIT-Plattform (Systemintegrationstest)** der Österreichischen Gesundheitskasse (ÖGK) stellt derzeit **"nur" WAHonline-Meldungs-Test** zur Verfügung. Vertragspartnerabrechnung kann derzeit nicht getestet werden.

## Supportticket

**Ticket-Nummer**: ASWHT-68

## Registrierungsschritte

### 1. Formular ausfüllen

Das Formular `Formular_Registrierung_Arztsoftware_Test.pdf` muss ausgefüllt werden mit folgenden Informationen:

#### Firmendaten
- **Firmenname***: Name Ihrer Firma/Ordination
- **Adresse***: Vollständige Adresse
- **Postleitzahl***: PLZ
- **Ort***: Stadt

#### Hauptansprechpartner
- **Nachname***: Ihr Nachname
- **Vorname***: Ihr Vorname
- **Mailadresse***: Ihre E-Mail-Adresse
- **Telefonnummer***: Ihre Telefonnummer

#### Zugangsdaten
- **IP-Adresse(n)***: Die IP-Adresse(n), von der/denen jegliche Zugriffe auf die SIT-Plattform erfolgen sollen
  - Arztsoftware
  - eSV-Portal mit Meine ÖGK
  - ELDA Software
- **Mailadresse für Benutzerkonto 1***: E-Mail für Verständigungen bezüglich der Benutzerkonten
- **Mailadresse für Benutzerkonto 2***: Zweite E-Mail (falls benötigt)

#### Weitere Kontakte (optional)
- Zusätzliche Kontaktpersonen können angegeben werden

### 2. Formular zurücksenden

Das ausgefüllte Formular an ASWH (ITSV) zurücksenden.

### 3. Was Sie testen möchten

**Wichtig**: Bitte teilen Sie ASWH mit, dass Sie **WAHonline-Meldungs-Test** durchführen möchten.

## Konfiguration in der Ordinationssoftware

Nach Erhalt der Zugangsdaten müssen folgende Umgebungsvariablen gesetzt werden:

### SIT-Umgebung (Systemintegrationstest)

```bash
# WAHonline SIT-Konfiguration
WAHONLINE_ENVIRONMENT=sit
WAHONLINE_API_KEY=<Ihr_API_Key_von_ASWH>
WAHONLINE_CHAMBER_NUMBER=<Ihre_Kammernummer>
WAHONLINE_DOCTOR_NUMBER=<Ihre_Arztnummer>

# Optional: Zertifikate für Client-Authentifizierung
WAHONLINE_CERT_PATH=./backend/certs/wahonline-client.crt
WAHONLINE_KEY_PATH=./backend/certs/wahonline-client.key
```

### IP-Adresse konfigurieren

Die IP-Adresse(n), die Sie im Formular angegeben haben, müssen für Zugriffe auf die SIT-Plattform freigegeben sein.

## Testen der WAHonline-Integration

### 1. Über die Teststrecke

1. Navigieren Sie zu: **Abrechnung → WAHonline Teststrecke**
2. Wählen Sie **Umgebung: Systemintegrationstest (SIT)**
3. Klicken Sie auf **"Verbindung testen"**
4. Wenn erfolgreich, können Sie **Meldungen senden**

### 2. Automatische Übermittlung

1. Gehen Sie zu **Einstellungen**
2. Aktivieren Sie **"WAHonline-Übermittlung aktivieren"**
3. Nach erfolgreicher Wahlarzt-Abrechnung wird automatisch an WAHonline übermittelt

## Wichtige Hinweise

⚠️ **Aktuelle Einschränkungen:**
- Die SIT-Plattform stellt derzeit **nur WAHonline-Meldungs-Test** zur Verfügung
- **Vertragspartnerabrechnung** kann derzeit **nicht** getestet werden
- WAHonline-Tests erfolgen über die **SIT-Plattform der ÖGK** (nicht direkt über die Ärztekammer)

## Nächste Schritte

1. ✅ Formular ausfüllen und zurücksenden
2. ⏳ Warten auf Zugangsdaten von ASWH
3. ⏳ Umgebungsvariablen konfigurieren
4. ⏳ Verbindungstest durchführen
5. ⏳ WAHonline-Meldungen testen

## Support

Bei Fragen zur Registrierung oder Konfiguration:
- **ASWH Support-Ticket**: ASWHT-68
- **E-Mail**: aswh (ITSV)

## Technische Details

Die WAHonline-Integration nutzt die **SIT-Plattform der ÖGK** unter:
- **SIT-URL**: `https://online-itu5test.elda.at/elda-online/servlet/WebTrans`

Die Konfiguration ist in `backend/config/wahonline.config.js` hinterlegt.

## Formular-Ausfüllhilfe

### Beispiel-Ausfüllung

**Firmendaten:**
- Firmenname: `Musterarztpraxis Dr. Mustermann`
- Adresse: `Hauptstraße 1`
- Postleitzahl: `1010`
- Ort: `Wien`

**Hauptansprechpartner:**
- Nachname: `Omran`
- Vorname: `Ali`
- Mailadresse: `ihre-email@example.com`
- Telefonnummer: `+43 1 2345678`

**Zugangsdaten:**
- IP-Adresse(n): `Ihre Server-IP-Adresse` (z.B. `123.45.67.89`)
  - **Wichtig**: Dies ist die IP-Adresse, von der aus Ihre Arztsoftware auf die SIT-Plattform zugreift
  - Falls Sie mehrere Server haben, können mehrere IP-Adressen angegeben werden
- Mailadresse für Benutzerkonto 1: `admin@ihre-praxis.at`
- Mailadresse für Benutzerkonto 2: `technik@ihre-praxis.at` (optional)

**Was Sie testen möchten:**
- **WAHonline-Meldungs-Test** (Wahlarzt-Leistungen)

## Nach Erhalt der Zugangsdaten

Nachdem Sie die Zugangsdaten von ASWH erhalten haben:

1. **API-Key** erhalten
2. **Benutzerkonten** werden eingerichtet
3. **IP-Adresse(n)** werden freigeschaltet

Dann können Sie die Konfiguration in `.env` setzen:

```bash
# WAHonline SIT-Konfiguration
WAHONLINE_ENVIRONMENT=sit
WAHONLINE_API_KEY=<Ihr_API_Key_von_ASWH>
WAHONLINE_CHAMBER_NUMBER=<Ihre_Kammernummer>
WAHONLINE_DOCTOR_NUMBER=<Ihre_Arztnummer>
```

## Testen

1. Backend neu starten (damit Umgebungsvariablen geladen werden)
2. In der Ordinationssoftware: **Abrechnung → WAHonline Teststrecke**
3. Umgebung auf **"Systemintegrationstest (SIT)"** setzen
4. **"Verbindung testen"** klicken
5. Bei Erfolg: **"Meldung senden"** testen

