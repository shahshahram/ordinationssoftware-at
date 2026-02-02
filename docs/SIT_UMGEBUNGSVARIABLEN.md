# SIT-Plattform Umgebungsvariablen

## Wo werden Umgebungsvariablen gesetzt?

Die Umgebungsvariablen werden in der **`.env` Datei** im `backend/` Verzeichnis gesetzt.

**Pfad:** `ordinationssoftware-at/backend/.env`

## SIT-Konfiguration hinzufügen

Öffnen Sie die Datei `backend/.env` und fügen Sie folgende Zeilen hinzu:

```bash
# ============================================
# SIT-Plattform Konfiguration
# ============================================

# ELDA/WAHonline SIT-Umgebung aktivieren
ELDA_ENVIRONMENT=sit
WAHONLINE_ENVIRONMENT=sit

# Geteilte Credentials für ELDA und WAHonline SIT
# Diese werden von beiden Systemen verwendet
ELDA_SIT_SERIENNUMMER=<Ihre Seriennummer hier>
ELDA_SIT_PASSWORT=<Ihr Passwort hier>

# Vertragspartnernummer (VPNR) für Honorarnoten-XML – genau 6 Stellen (z.B. 100014)
ELDA_SIT_VPNR=100014

# Optional: ELDA-Testdaten-CSVs (nur diese Daten sind in SIT eingerichtet)
# SIT_STAMMDATEN_CSV=/Pfad/zu/Stammdaten_ASWH_MRSA_20251219.csv
# SIT_VERTRAGSPARTNER_ARZT_CSV=/Pfad/zu/ASWH-VP-Arzt-Linz-A-Tabelle 1.csv
# Ohne Angabe: Fallback-Daten (Mark, Vanessa) oder Dateien unter backend/data/sit-testdata/

# Optional: Separate WAHonline-Credentials (falls abweichend)
# WAHONLINE_SIT_SERIENNUMMER=<Alternative Seriennummer>
# WAHONLINE_SIT_PASSWORT=<Alternatives Passwort>
```

## Beispiel

```bash
# SIT-Plattform Konfiguration
ELDA_ENVIRONMENT=sit
WAHONLINE_ENVIRONMENT=sit
ELDA_SIT_SERIENNUMMER=800062
ELDA_SIT_PASSWORT=MeinSicheresPasswort123
ELDA_SIT_VPNR=100014

# Testdaten-CSVs (von ELDA/ÖGK) – optional, sonst Fallback oder backend/data/sit-testdata/
# SIT_STAMMDATEN_CSV=/Users/Name/Downloads/Stammdaten_ASWH_MRSA_20251219.csv
# SIT_VERTRAGSPARTNER_ARZT_CSV=/Users/Name/Downloads/ASWH_Vertragspartner_20250617/ASWH-VP-Arzt-Linz-A-Tabelle 1.csv
```

## Wichtige Hinweise

1. **Die `.env` Datei ist in `.gitignore`** - Ihre Credentials werden nicht in Git committed
2. **Keine Leerzeichen** um das `=` Zeichen
3. **Keine Anführungszeichen** um die Werte (außer wenn Leerzeichen enthalten sind)
4. **Nach Änderungen**: Backend-Server neu starten

## Alternative: System-Umgebungsvariablen

Sie können die Variablen auch als System-Umgebungsvariablen setzen:

### macOS/Linux (Terminal)
```bash
export ELDA_ENVIRONMENT=sit
export WAHONLINE_ENVIRONMENT=sit
export ELDA_SIT_SERIENNUMMER=<Ihre Seriennummer>
export ELDA_SIT_PASSWORT=<Ihr Passwort>
```

### Windows (PowerShell)
```powershell
$env:ELDA_ENVIRONMENT="sit"
$env:WAHONLINE_ENVIRONMENT="sit"
$env:ELDA_SIT_SERIENNUMMER="<Ihre Seriennummer>"
$env:ELDA_SIT_PASSWORT="<Ihr Passwort>"
```

### Windows (CMD)
```cmd
set ELDA_ENVIRONMENT=sit
set WAHONLINE_ENVIRONMENT=sit
set ELDA_SIT_SERIENNUMMER=<Ihre Seriennummer>
set ELDA_SIT_PASSWORT=<Ihr Passwort>
```

## Überprüfung

Nach dem Setzen der Variablen können Sie die Konfiguration testen:

```javascript
// In Node.js REPL oder Test-Script
const eldaConfig = require('./backend/config/elda.config');
const wahonlineConfig = require('./backend/config/wahonline.config');

console.log('ELDA Environment:', eldaConfig.environment);
console.log('WAHonline Environment:', wahonlineConfig.environment);
console.log('ELDA SIT Seriennummer:', eldaConfig.sit.seriennummer ? 'gesetzt' : 'fehlt');
console.log('ELDA SIT Passwort:', eldaConfig.sit.passwort ? 'gesetzt' : 'fehlt');

// Validierung
const eldaValidation = eldaConfig.validate();
const wahonlineValidation = wahonlineConfig.validate();

console.log('ELDA Valid:', eldaValidation.valid);
if (!eldaValidation.valid) {
  console.log('ELDA Fehler:', eldaValidation.errors);
}

console.log('WAHonline Valid:', wahonlineValidation.valid);
if (!wahonlineValidation.valid) {
  console.log('WAHonline Fehler:', wahonlineValidation.errors);
}
```

## Zurück zur Testumgebung

Um wieder zur normalen Testumgebung zu wechseln:

```bash
# In .env Datei ändern oder entfernen:
ELDA_ENVIRONMENT=test
WAHONLINE_ENVIRONMENT=test
```

Oder die SIT-Variablen einfach auskommentieren/entfernen.
