# SIT-Plattform: XML-Format Analyse

## Problem: "unbekannter Fehler" vom ELDA-Server

Der Server antwortet mit Status 200, aber die HTML-Antwort enthält "unbekannter Fehler". Das deutet darauf hin, dass:
- ✅ Die Verbindung funktioniert
- ✅ Die Authentifizierung funktioniert
- ✅ Das XML wird verarbeitet
- ❌ Aber es gibt einen Fehler im XML-Format oder in den Daten

## Aktuelles XML-Format

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

## Mögliche Probleme

### 1. XML-Namespace
**Frage**: Ist der Namespace `http://www.elda.at/schema/Abrechnung` korrekt?

**Mögliche Alternativen**:
- `http://www.elda.at/schema/elda`
- `http://www.elda.at/elda`
- Kein Namespace
- Anderer Namespace

### 2. Root-Element
**Frage**: Ist `<ELDADataset>` das korrekte Root-Element?

**Mögliche Alternativen**:
- `<Abrechnung>`
- `<ELDA>`
- `<Dataset>`
- Anderes Element

### 3. Feldnamen
**Frage**: Sind die Feldnamen korrekt (z.B. `Datensatztyp`, `Sozialversicherungsnummer`)?

**Mögliche Probleme**:
- Groß-/Kleinschreibung
- Umlaute (ä, ö, ü)
- Unterstriche vs. Bindestriche

### 4. Datum-Format
**Frage**: Ist das Datum-Format `YYYY-MM-DD` korrekt?

**Aktuell**: `1990-02-28`
**Mögliche Alternativen**:
- `DD.MM.YYYY` (28.02.1990)
- `DD/MM/YYYY` (28/02/1990)
- ISO mit Zeit: `1990-02-28T00:00:00`

### 5. Pflichtfelder
**Frage**: Welche Felder sind wirklich Pflichtfelder?

**Aktuell gesendet**:
- Patient: SV-Nummer, Vorname, Nachname, Geburtsdatum
- Arzt: Steuernummer, Kammernummer
- Leistungen: Code, Beschreibung, Datum, Preis

**Möglicherweise fehlend**:
- Versicherungsnummer
- Versicherungsträger
- Adressdaten
- Weitere Pflichtfelder

## Debugging-Schritte

### 1. Debug-Logging aktivieren

In `backend/.env`:
```bash
LOG_LEVEL=debug
```

### 2. Backend-Logs prüfen

Nach einem Test sollten Sie in den Backend-Logs sehen:
- Das vollständige XML, das gesendet wird
- Die vollständige HTML-Antwort vom Server
- Detaillierte Fehlermeldungen

### 3. XML-Format prüfen

Prüfen Sie:
- Ist das XML wohlgeformt? (kann mit einem XML-Validator geprüft werden)
- Sind alle Pflichtfelder vorhanden?
- Stimmen die Feldnamen mit der ELDA-Dokumentation überein?

## Nächste Schritte

1. **Debug-Logging aktivieren** und Backend-Logs prüfen
2. **ELDA-Dokumentation prüfen** für das korrekte XML-Format
3. **ELDA-Support kontaktieren** und nach dem korrekten XML-Format fragen
4. **Beispiel-XML anfordern** vom ELDA-Support

## Fragen an ELDA-Support

1. **XML-Namespace**: Welcher Namespace wird für Abrechnungen verwendet?
2. **Root-Element**: Wie heißt das Root-Element?
3. **Feldnamen**: Können Sie eine Liste der korrekten Feldnamen bereitstellen?
4. **Datum-Format**: Welches Datum-Format wird erwartet?
5. **Pflichtfelder**: Welche Felder sind Pflichtfelder?
6. **Beispiel-XML**: Können Sie ein funktionierendes Beispiel-XML bereitstellen?
