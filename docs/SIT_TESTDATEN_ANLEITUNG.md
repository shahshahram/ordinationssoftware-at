# SIT-Testdaten Anleitung

## Übersicht

Für die SIT-Plattform (Systemintegrationstest) der ÖGK/ASWH wurden spezielle Testdaten bereitgestellt. Diese sollten für alle Tests verwendet werden, um die korrekte Funktionsweise zu gewährleisten.

## Verfügbare Testdaten

### 1. Testpatienten (Versicherte)

Die folgenden 8 Testpersonen wurden für die SIT-Plattform bereitgestellt:

#### SIMUID1 - Scarlett ASWH-VS-MRSA-Erwachsene-B
```json
{
  "socialSecurityNumber": "1133280290",
  "firstName": "Scarlett",
  "lastName": "ASWH-VS-MRSA-Erwachsene-B",
  "dateOfBirth": "1990-02-28",
  "gender": "weiblich"
}
```

#### SIMUID2 - Erna ASWH-VS-MRSA-Erwachsene-D
```json
{
  "socialSecurityNumber": "1131050790",
  "firstName": "Erna",
  "lastName": "ASWH-VS-MRSA-Erwachsene-D",
  "dateOfBirth": "1990-07-05",
  "gender": "weiblich"
}
```

#### SIMUID3 - Emanuel ASWH-VS-MRSA-Erwachsener-C
```json
{
  "socialSecurityNumber": "1131260990",
  "firstName": "Emanuel",
  "lastName": "ASWH-VS-MRSA-Erwachsener-C",
  "dateOfBirth": "1990-09-26",
  "gender": "männlich"
}
```

#### SIMUID4 - Sascha ASWH-VS-MRSA-Erwachsener-E
```json
{
  "socialSecurityNumber": "1132100390",
  "firstName": "Sascha",
  "lastName": "ASWH-VS-MRSA-Erwachsener-E",
  "dateOfBirth": "1990-03-10",
  "gender": "männlich"
}
```

#### SIMUID5 - Alisa ASWH-VS-MRSA-Familie-A
```json
{
  "socialSecurityNumber": "1137190890",
  "firstName": "Alisa",
  "lastName": "ASWH-VS-MRSA-Familie-A",
  "dateOfBirth": "1990-08-19",
  "gender": "weiblich"
}
```

#### SIMUID6 - Carolin ASWH-VS-MRSA-Familie-A
```json
{
  "socialSecurityNumber": "1120200108",
  "firstName": "Carolin",
  "lastName": "ASWH-VS-MRSA-Familie-A",
  "dateOfBirth": "2008-01-20",
  "gender": "weiblich"
}
```

#### SIMUID7 - Mark ASWH-VS-MRSA-Familie-A
```json
{
  "socialSecurityNumber": "1137041190",
  "firstName": "Mark",
  "lastName": "ASWH-VS-MRSA-Familie-A",
  "dateOfBirth": "1990-11-04",
  "gender": "männlich"
}
```

#### SIMUID8 - Stefan ASWH-VS-MRSA-Familie-A
```json
{
  "socialSecurityNumber": "1142121021",
  "firstName": "Stefan",
  "lastName": "ASWH-VS-MRSA-Familie-A",
  "dateOfBirth": "2021-10-12",
  "gender": "männlich"
}
```

## Empfohlener Test-Payload für WAHonline

### Beispiel 1: Ordinationskonsultation (Code 111)

```json
{
  "performance": {
    "serviceCode": "111",
    "serviceDescription": "Ordinationskonsultation",
    "serviceDatetime": "2026-01-18T14:34:17.267Z",
    "totalPrice": 35,
    "unitPrice": 35,
    "quantity": 1
  },
  "patient": {
    "socialSecurityNumber": "1133280290",
    "firstName": "Scarlett",
    "lastName": "ASWH-VS-MRSA-Erwachsene-B",
    "dateOfBirth": "1990-02-28"
  },
  "doctor": {
    "profile": {
      "chamberNumber": "14",
      "taxNumber": "ATU12345678"
    },
    "name": "Test Arzt"
  }
}
```

### Beispiel 2: Mit vollständigen Patientendaten

```json
{
  "performance": {
    "serviceCode": "111",
    "serviceDescription": "Ordinationskonsultation",
    "serviceDatetime": "2026-01-18T14:34:17.267Z",
    "totalPrice": 35,
    "unitPrice": 35,
    "quantity": 1
  },
  "patient": {
    "socialSecurityNumber": "1131050790",
    "firstName": "Erna",
    "lastName": "ASWH-VS-MRSA-Erwachsene-D",
    "dateOfBirth": "1990-07-05",
    "gender": "weiblich",
    "address": {
      "street": "Teststraße 1",
      "postalCode": "1010",
      "city": "Wien",
      "country": "Österreich"
    }
  },
  "doctor": {
    "profile": {
      "chamberNumber": "14",
      "taxNumber": "ATU12345678",
      "doctorNumber": "12345"
    },
    "name": "Dr. Test Arzt",
    "title": "Dr.",
    "specialization": "Allgemeinmedizin",
    "address": {
      "street": "Ordinationsstraße 1",
      "postalCode": "1010",
      "city": "Wien",
      "country": "Österreich"
    }
  }
}
```

## CSV-Dateien (falls vorhanden)

Falls Sie CSV-Dateien mit Testdaten erhalten haben, können Sie diese mit dem Import-Script importieren:

```bash
cd backend
node scripts/import-sit-testdata.js versicherte /pfad/zu/Stammdaten_ASWH_MRSA_20251219.csv
node scripts/import-sit-testdata.js vertragspartner /pfad/zu/ASWH-VP-*.csv
```

**Erwartete CSV-Dateien:**
- `Stammdaten_ASWH_MRSA_20251219.csv` - Versicherte
- `ASWH-VP-Zahn-Linz-A-Tabelle 1.csv` - Vertragspartner (Zahnarzt, Linz)
- `ASWH-VP-Zahn-Graz-A-Tabelle 1.csv` - Vertragspartner (Zahnarzt, Graz)
- `ASWH-VP-Nichtaerztlich-Linz-A-Tabelle 1.csv` - Vertragspartner (Nichtärztlich, Linz)
- `ASWH-VP-Nichtaerztlich-Graz-A-Tabelle 1.csv` - Vertragspartner (Nichtärztlich, Graz)
- `ASWH-VP-Arzt-Linz-A-Tabelle 1.csv` - Vertragspartner (Arzt, Linz)
- `ASWH-VP-Arzt-Graz-A-Tabelle 1.csv` - Vertragspartner (Arzt, Graz)

## Wichtige Hinweise

1. **SV-Nummern sind fest**: Verwenden Sie nur die oben genannten SV-Nummern für Tests
2. **Geburtsdaten sind fest**: Die Geburtsdaten müssen exakt übereinstimmen
3. **Sicherheitsklasse**: Alle Testpatienten haben Sicherheitsklasse 300
4. **Arzt-Daten**: Verwenden Sie gültige Test-Arzt-Daten (Kammernummer, Steuernummer)

## Test-Workflow

1. **Patienten importieren** (falls CSV vorhanden):
   ```bash
   node backend/scripts/import-sit-testdata.js versicherte /pfad/zu/csv
   ```

2. **WAHonline-Test durchführen**:
   - Gehen Sie zu `/wahonline-test`
   - Verwenden Sie einen der oben genannten Test-Payloads
   - Klicken Sie auf "Meldung an WAHonline senden"

3. **Ergebnis prüfen**:
   - Prüfen Sie die Backend-Logs für detaillierte Fehlermeldungen
   - Prüfen Sie die Antwort vom SIT-Server

## Fehlerbehebung

Falls Sie Fehler erhalten:

1. **Prüfen Sie die SV-Nummer**: Muss exakt einer der Test-SV-Nummern entsprechen
2. **Prüfen Sie das Geburtsdatum**: Muss exakt übereinstimmen
3. **Prüfen Sie die Arzt-Daten**: Kammernummer und Steuernummer müssen vorhanden sein
4. **Aktivieren Sie Debug-Logging**: Setzen Sie `LOG_LEVEL=debug` in `backend/.env`

## Weitere Informationen

- Siehe auch: `docs/SIT_PLATTFORM_ANALYSE.md`
- Siehe auch: `docs/SIT_TEST_ANLEITUNG.md`
- Siehe auch: `docs/SIT_TROUBLESHOOTING.md`
