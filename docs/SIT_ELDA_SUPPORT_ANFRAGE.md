# ELDA-Support Anfrage: SIT-Plattform ECONNRESET Problem

## Problembeschreibung

Bei Verbindungsversuchen zur SIT-Plattform (`https://online-itu5test.elda.at/elda-online/servlet/WebTrans`) wird der Fehler `ECONNRESET` (Connection Reset) zurückgegeben.

## Technische Details

### Konfiguration
- **Umgebung**: SIT (Systemintegrationstest)
- **URL**: `https://online-itu5test.elda.at/elda-online/servlet/WebTrans`
- **Methode**: Webservice (HTTPS POST)
- **Authentifizierung**: Basic Auth mit Seriennummer/Passwort
- **Seriennummer**: `800062`
- **IP-Adresse**: [Ihre IP-Adresse] (bereits registriert)

### Fehlermeldung
```
ECONNRESET: read ECONNRESET
Verbindung wurde vom Server zurückgesetzt
URL: https://online-itu5test.elda.at/elda-online/servlet/WebTrans
Timeout: 60000ms
Umgebung: sit
```

### Request-Details
- **HTTP-Methode**: POST
- **Content-Type**: `application/xml; charset=UTF-8`
- **Authorization**: Basic Auth (Base64-kodiert: `Seriennummer:Passwort`)
- **Header**: `X-Dataset-Type: Abrechnung`
- **Timeout**: 60 Sekunden

### XML-Format
Das System generiert XML im folgenden Format:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ELDADataset xmlns="http://www.elda.at/schema/Abrechnung" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Datensatztyp>Abrechnung</Datensatztyp>
  <Version>1.0</Version>
  <Seriennummer>ABR-[timestamp]-[random]</Seriennummer>
  <Erstellungsdatum>[ISO-Datum]</Erstellungsdatum>
  <Patient>
    <Sozialversicherungsnummer>1133280290</Sozialversicherungsnummer>
    <Vorname>Scarlett</Vorname>
    <Nachname>ASWH-VS-MRSA-Erwachsene-B</Nachname>
    <Geburtsdatum>1990-02-28</Geburtsdatum>
    ...
  </Patient>
  <Arzt>
    <Steuernummer>ATU12345678</Steuernummer>
    <Kammernummer>14</Kammernummer>
    ...
  </Arzt>
  <Leistungen>
    ...
  </Leistungen>
  ...
</ELDADataset>
```

## Durchgeführte Maßnahmen

### 1. HTTPS-Agent Konfiguration
- ✅ Keine Client-Zertifikate für SIT (nur Basic Auth)
- ✅ TLS 1.2 verwendet
- ✅ `keepAlive` deaktiviert
- ✅ `rejectUnauthorized: true` (Server-Zertifikat wird geprüft)

### 2. Authentifizierung
- ✅ Basic Auth mit Seriennummer/Passwort
- ✅ Credentials werden korrekt Base64-kodiert
- ✅ Authorization-Header wird gesetzt

### 3. Request-Konfiguration
- ✅ Content-Type: `application/xml; charset=UTF-8`
- ✅ X-Dataset-Type Header gesetzt
- ✅ Timeout: 60 Sekunden
- ✅ Max Content Length: 40 MB

### 4. Testdaten
- ✅ Offizielle SIT-Testpatienten verwendet (SV-Nummer: 1133280290)
- ✅ Alle Pflichtfelder vorhanden
- ✅ XML-Format validiert

## Fragen an ELDA-Support

### 1. Client-Zertifikat
**Frage**: Wird für die SIT-Plattform ein Client-Zertifikat benötigt, auch wenn Basic Auth verwendet wird?

**Hintergrund**: Die Dokumentation erwähnt Basic Auth mit Seriennummer/Passwort, aber der Server setzt die Verbindung sofort zurück (`ECONNRESET`), was darauf hindeuten könnte, dass ein Client-Zertifikat erforderlich ist.

### 2. XML-Format
**Frage**: Ist das XML-Format korrekt, oder wird ein SOAP-Envelope erwartet?

**Aktuelles Format**: Direktes XML mit `<ELDADataset>` Root-Element
**Frage**: Sollte es stattdessen ein SOAP-Envelope sein?

### 3. Request-Header
**Frage**: Gibt es spezifische Header, die gesendet werden müssen?

**Aktuell gesendete Header**:
- `Content-Type: application/xml; charset=UTF-8`
- `Authorization: Basic [base64]`
- `X-Dataset-Type: Abrechnung`

**Frage**: Fehlen erforderliche Header?

### 4. TLS/SSL-Konfiguration
**Frage**: Gibt es spezifische TLS-Versionen oder Cipher-Suites, die verwendet werden müssen?

**Aktuell**: TLS 1.2
**Frage**: Ist das korrekt, oder wird eine andere TLS-Version benötigt?

### 5. Server-Status
**Frage**: Ist der SIT-Server aktuell verfügbar und funktionsfähig?

**Hintergrund**: Alle Verbindungsversuche schlagen mit `ECONNRESET` fehl, was darauf hindeuten könnte, dass der Server nicht erreichbar ist oder die Verbindungen blockiert.

### 6. Beispiel-Request
**Frage**: Können Sie einen funktionierenden Beispiel-Request (cURL oder ähnlich) bereitstellen?

**Zweck**: Um zu verifizieren, ob das Problem in unserer Implementierung liegt oder ob es ein Server-seitiges Problem ist.

## Test-Ergebnisse

### Test 1: Einfacher GET-Request (ohne Auth)
- **Ergebnis**: ❌ ECONNRESET
- **Bedeutung**: Server schließt Verbindung sofort

### Test 2: GET-Request mit Basic Auth
- **Ergebnis**: ❌ ECONNRESET
- **Bedeutung**: Authentifizierung allein reicht nicht

### Test 3: POST-Request mit minimalem XML
- **Ergebnis**: ❌ ECONNRESET
- **Bedeutung**: Auch einfaches XML wird nicht akzeptiert

### Test 4: POST-Request mit ELDA-Format XML
- **Ergebnis**: ❌ ECONNRESET
- **Bedeutung**: Vollständiges ELDA-Format wird nicht akzeptiert

## System-Informationen

- **Software**: MyMediCloud MMC (Ordinationssoftware)
- **Node.js Version**: [Ihre Version]
- **Betriebssystem**: macOS
- **Netzwerk**: [Ihr Netzwerk-Typ]
- **Firewall/Proxy**: [Falls vorhanden]

## Kontaktinformationen

- **E-Mail**: tahamtani.omran@gmail.com
- **Seriennummer**: 800062
- **IP-Adresse**: [Ihre IP-Adresse]

## Nächste Schritte

1. **Warten auf Antwort vom ELDA-Support** zu den oben genannten Fragen
2. **Beispiel-Request testen** (falls bereitgestellt)
3. **Client-Zertifikat einrichten** (falls erforderlich)
4. **XML-Format anpassen** (falls SOAP-Envelope benötigt wird)

## Zusätzliche Informationen

Falls Sie weitere Informationen benötigen, können wir gerne:
- Detaillierte Logs bereitstellen (mit `LOG_LEVEL=debug`)
- Wireshark/TCP-Dumps bereitstellen
- Einen Screenshot der Fehlermeldung senden
