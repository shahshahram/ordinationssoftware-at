# SIT-Plattform Implementierung

## Übersicht

Die SIT-Plattform (System-Integrations-Test) der ÖGK ermöglicht das Testen von ELDA- und WAHonline-Integrationen in einer isolierten Testumgebung.

## Wichtige Unterschiede zur normalen Testumgebung

### ELDA
- **FTPS wird NICHT unterstützt** - Nur Webservice verfügbar
- **Authentifizierung**: Basic Auth mit Seriennummer/Passwort statt API-Key
- **URL**: `https://online-itu5test.elda.at/elda-online/servlet/WebTrans`

### WAHonline
- **Verwendet ELDA-Webservice** statt REST API
- **Format**: ELDA-XML statt JSON
- **Authentifizierung**: Geteilte Credentials mit ELDA (Seriennummer/Passwort)
- **URL**: Gleiche wie ELDA SIT (über ELDA-Webservice)

## Konfiguration

### Umgebungsvariablen

```bash
# ELDA/WAHonline SIT-Umgebung aktivieren
ELDA_ENVIRONMENT=sit
WAHONLINE_ENVIRONMENT=sit

# Geteilte Credentials (für beide Systeme)
ELDA_SIT_SERIENNUMMER=<Ihre Seriennummer>
ELDA_SIT_PASSWORT=<Ihr Passwort>

# Alternative: Separate WAHonline-Credentials (optional)
WAHONLINE_SIT_SERIENNUMMER=<Seriennummer>
WAHONLINE_SIT_PASSWORT=<Passwort>
```

### Automatische Konfiguration

Wenn `ELDA_ENVIRONMENT=sit` gesetzt ist:
- `defaultMethod` wird automatisch auf `webservice` gesetzt (FTPS nicht verfügbar)
- WAHonline verwendet automatisch ELDA-Webservice
- Credentials werden geteilt (falls nicht separat konfiguriert)

## Verwendung

### ELDA-Übermittlung

```javascript
const eldaConnector = require('./services/connectors/eldaConnector');

// Automatisch Webservice für SIT
const result = await eldaConnector.send(
  payload,
  'Abrechnung',
  null, // auto-Methode (wird zu 'webservice' für SIT)
  true  // autoFormat
);
```

### WAHonline-Übermittlung

```javascript
const wahonlineConnector = require('./services/connectors/wahonlineConnector');

// Automatisch ELDA-Webservice für SIT
const result = await wahonlineConnector.send(
  payload,
  idempotencyKey,
  true // autoFormat
);
```

## Testdaten-Import

### CSV-Import-Script

```bash
# Versicherte importieren
node backend/scripts/import-sit-testdata.js versicherte [pfad-zur-csv]

# Vertragspartner importieren
node backend/scripts/import-sit-testdata.js vertragspartner [pfad-zur-csv]

# Alle Testdaten importieren
node backend/scripts/import-sit-testdata.js all [basis-pfad]
```

### Verfügbare CSV-Dateien

1. **Stammdaten_ASWH_MRSA_20251219.csv**
   - Versicherte/Patienten
   - Enthält: Name, Geburtsdatum, Versicherungsnummer, Adresse, Bankverbindung

2. **ASWH_Vertragspartner_20250617/**
   - Vertragspartner (Ärzte, Zahnärzte, Nichtärztliche)
   - Enthält: Name, Fachgebiet, Adresse, Vertragspartnernummer

## Validierung

### ELDA-Konfiguration prüfen

```javascript
const eldaConfig = require('./config/elda.config');
const validation = eldaConfig.validate();

if (!validation.valid) {
  console.error('ELDA-Konfiguration ungültig:', validation.errors);
}
```

### WAHonline-Konfiguration prüfen

```javascript
const wahonlineConfig = require('./config/wahonline.config');
const validation = wahonlineConfig.validate();

if (!validation.valid) {
  console.error('WAHonline-Konfiguration ungültig:', validation.errors);
}
```

## Fehlerbehebung

### "FTPS wird von SIT nicht unterstützt"
- **Lösung**: Setzen Sie `ELDA_DEFAULT_METHOD=webservice` oder entfernen Sie die Variable (automatisch für SIT)

### "ELDA-Seriennummer und Passwort für SIT fehlen"
- **Lösung**: Setzen Sie `ELDA_SIT_SERIENNUMMER` und `ELDA_SIT_PASSWORT`

### "WAHonline-SIT benötigt Seriennummer und Passwort"
- **Lösung**: WAHonline verwendet automatisch ELDA-Credentials, falls nicht separat konfiguriert

## Sicherheit

⚠️ **Wichtig**: SIT-Credentials sind Test-Credentials und sollten:
- Nicht in Produktionsumgebungen verwendet werden
- Nicht in Git committed werden (siehe `.gitignore`)
- In `.env`-Dateien gespeichert werden (nicht versioniert)

## Weitere Informationen

- [SIT-Plattform Analyse](./SIT_PLATTFORM_ANALYSE.md)
- [SIT-Plattform Credentials](./SIT_PLATTFORM_CREDENTIALS.md) (nicht versioniert)
