# ELDA-Support Anfrage: SIT-Plattform "unbekannter Fehler" Problem

## Problembeschreibung

Bei Verbindungsversuchen zur SIT-Plattform (`https://online-itu5test.elda.at/elda-online/servlet/WebTrans`) antwortet der Server mit Status 200, aber die HTML-Antwort enthält die Fehlermeldung "unbekannter Fehler".

**Status-Update**: 
- ✅ Die Verbindung funktioniert (kein ECONNRESET mehr)
- ✅ Die Authentifizierung funktioniert
- ✅ Das XML-Format ist korrekt strukturiert (basierend auf WAH_14_Test_Input.xml)
- ✅ Attribut-Reihenfolge im Root-Element korrigiert (entspricht exakt dem Beispiel)
- ✅ `datenZahlungsempfaenger` ist als Pflichtfeld implementiert
- ✅ `X-Dataset-Type` Header getestet (sowohl "WA" als auch "HO")
- ❌ Der Server antwortet weiterhin mit "unbekannter Fehler" ohne weitere Details

**Durchgeführte Korrekturen**:
1. `datenZahlungsempfaenger` als Pflichtfeld hinzugefügt (war im Beispiel-XML immer vorhanden)
2. Attribut-Reihenfolge im Root-Element korrigiert: `akz`, `xsi:schemaLocation`, `xmlns:n1`, `xmlns:xsi`
3. `versicherungsnummerZahlungsempfaenger` wird immer ausgegeben (auch wenn leer)
4. `X-Dataset-Type` Header getestet mit "WA" und "HO"

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
ELDA-Server-Fehler: unbekannter Fehler
Status: 200 OK
Response-Type: HTML
Response-Body: <HTML><TITLE>ELDA Internet Informationssystem</TITLE><BODY><FONT FACE="Arial" size="4"><CENTER><P>&nbsp;<P>&nbsp;<P>unbekannter Fehler</CENTER></FONT></BODY></HTML>
URL: https://online-itu5test.elda.at/elda-online/servlet/WebTrans
Umgebung: sit
```

**Bedeutung**: 
- ✅ Verbindung funktioniert
- ✅ Authentifizierung funktioniert
- ✅ Server verarbeitet die Anfrage
- ❌ XML-Format oder Daten werden nicht akzeptiert

### Request-Details
- **HTTP-Methode**: POST
- **Content-Type**: `application/xml; charset=UTF-8`
- **Authorization**: Basic Auth (Base64-kodiert: `Seriennummer:Passwort`)
- **Header**: `X-Dataset-Type: Abrechnung`
- **Timeout**: 60 Sekunden

### XML-Format (WAHonline Honorarnotenmeldung)
Das System generiert XML im folgenden Format (basierend auf WAH_14_Test_Input.xml):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<n1:honorarnotenMeldung akz="a" xsi:schemaLocation="http://at.sozvers.stp.elda.wa WA_V7.xsd" xmlns:n1="http://at.sozvers.stp.elda.wa" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<patientenDaten>
		<adresseDesPatienten>
			<postleitzahl>4020</postleitzahl>
			<strasseHausnummer>Duftschmidgasse 18</strasseHausnummer>
			<ort>Linz</ort>
		</adresseDesPatienten>
		<leistungsDaten>
			<datumLeistungserbringungVon>2026-01-21</datumLeistungserbringungVon>
			<datumLeistungserbringungBis>2026-01-21</datumLeistungserbringungBis>
			<bruttoBetragProPosition>35</bruttoBetragProPosition>
			<leistungsart>111</leistungsart>
			<positionsnummer>1010</positionsnummer>
			<positionsnummerAnzahl>1</positionsnummerAnzahl>
		</leistungsDaten>
		<datenZahlungsempfaenger>
			<internationalBankAccountNumber>AT999900000000999999</internationalBankAccountNumber>
			<versicherungsnummerZahlungsempfaenger>1133280290</versicherungsnummerZahlungsempfaenger>
		</datenZahlungsempfaenger>
		<patientDaten>
			<leistungsbestaetigungAnforderung>false</leistungsbestaetigungAnforderung>
			<rechnungsbetragBezahlt>true</rechnungsbetragBezahlt>
			<versicherungsnummerVersicherter>1133280290</versicherungsnummerVersicherter>
			<versicherungsnummerPatienten>1133280290</versicherungsnummerPatienten>
			<rechnungsbetrag>35</rechnungsbetrag>
			<familiennamePatienten>ASWH-VS-MRSA-Erwachsene-B</familiennamePatienten>
			<rechnungsnummer>2026/12345</rechnungsnummer>
			<vornamePatienten>Scarlett</vornamePatienten>
			<datumRechnung>2026-01-21</datumRechnung>
		</patientDaten>
	</patientenDaten>
	<infoDaten>
		<identifikationsSatz>
			<bundeslandAbrechnungsstelle>4</bundeslandAbrechnungsstelle>
			<listkennzeichen>HO</listkennzeichen>
			<projektkennzeichen>WA</projektkennzeichen>
			<zustaendigeAbrechnungsstelle>14</zustaendigeAbrechnungsstelle>
			<versionDatenbestand>7</versionDatenbestand>
			<referenznummer>800062/202612345</referenznummer>
		</identifikationsSatz>
		<vertragspartnerDaten>
			<datumBehandlung>2026-01-21</datumBehandlung>
			<datumUebermittlung>2026-01-21T14:40:29</datumUebermittlung>
			<fachgebietLeistungserbringerBehandler>01</fachgebietLeistungserbringerBehandler>
			<familiennameBehandler>Arzt</familiennameBehandler>
			<vertragspartnernummerBehandler>100014</vertragspartnernummerBehandler>
			<vornameBehandler>Test</vornameBehandler>
			<ordiAdresseDesVertragspartners>
				<postleitzahl>4020</postleitzahl>
				<strasseHausnummer>Teststraße 1</strasseHausnummer>
				<ort>Linz</ort>
			</ordiAdresseDesVertragspartners>
		</vertragspartnerDaten>
	</infoDaten>
</n1:honorarnotenMeldung>
```

**Wichtig**: 
- Root-Element: `<n1:honorarnotenMeldung>` (nicht `<ELDADataset>`)
- Namespace: `http://at.sozvers.stp.elda.wa` (nicht `http://www.elda.at/schema/Abrechnung`)
- Schema Location: `WA_V7.xsd`
- Format basiert auf WAH_14_Test_Input.xml von ELDA

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

### 2. XML-Format (WICHTIG - Hauptproblem)
**Status**: Das XML-Format wurde basierend auf WAH_14_Test_Input.xml korrigiert.

**Aktuelles Format**: 
- Root-Element: `<n1:honorarnotenMeldung>`
- Namespace: `http://at.sozvers.stp.elda.wa`
- Schema Location: `WA_V7.xsd`
- Struktur entspricht dem Beispiel-XML

**Problem**: Der Server antwortet weiterhin mit "unbekannter Fehler" ohne weitere Details.

**Fragen**:
1. Ist das XML-Format jetzt korrekt, oder gibt es noch Abweichungen?
2. Welche Felder sind wirklich Pflichtfelder? (z.B. `datenZahlungsempfaenger`, `diagnosen`)
3. Gibt es Validierungsregeln, die nicht erfüllt werden?
4. Können Sie eine detailliertere Fehlermeldung bereitstellen?

**Bitte bereitstellen**:
- XML-Schema-Definition (XSD) für WAHonline Honorarnotenmeldungen (WA_V7.xsd)
- Liste aller Pflichtfelder und Validierungsregeln
- Detaillierte Fehlermeldungen (falls möglich)

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
- **Ergebnis**: ❌ ECONNRESET (veraltet)
- **Status**: Problem behoben

### Test 2: GET-Request mit Basic Auth
- **Ergebnis**: ❌ ECONNRESET (veraltet)
- **Status**: Problem behoben

### Test 3: POST-Request mit minimalem XML
- **Ergebnis**: ❌ ECONNRESET (veraltet)
- **Status**: Problem behoben

### Test 4: POST-Request mit WAHonline-Format XML
- **Ergebnis**: ⚠️ Status 200, aber "unbekannter Fehler" in HTML-Antwort
- **Bedeutung**: Verbindung funktioniert, Authentifizierung funktioniert, XML wird verarbeitet, aber Validierung schlägt fehl
- **Aktueller Status**: 
  - ✅ Verbindung funktioniert
  - ✅ Authentifizierung funktioniert
  - ✅ XML-Format korrekt strukturiert (basierend auf WAH_14_Test_Input.xml)
  - ❌ Server-Validierung schlägt fehl (keine Details verfügbar)

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
