# WAHonline XML-Format Analyse

## Beispiel-XML Analyse

Basierend auf der Beispieldatei `WAH_14_Test_Input.xml` von ELDA.

## Wichtige Erkenntnisse

### 1. Root-Element und Namespace

**FALSCH (aktuell)**:
```xml
<ELDADataset xmlns="http://www.elda.at/schema/Abrechnung">
```

**KORREKT (laut Beispiel)**:
```xml
<n1:honorarnotenMeldung 
  akz="a" 
  xsi:schemaLocation="http://at.sozvers.stp.elda.wa WA_V7.xsd" 
  xmlns:n1="http://at.sozvers.stp.elda.wa" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
```

**Wichtig**:
- Root-Element: `<n1:honorarnotenMeldung>` (NICHT `<ELDADataset>`!)
- Namespace: `http://at.sozvers.stp.elda.wa` (NICHT `http://www.elda.at/schema/Abrechnung`!)
- Schema Location: `WA_V7.xsd`
- Attribut `akz="a"` ist erforderlich

### 2. XML-Struktur

```xml
<n1:honorarnotenMeldung>
  <patientenDaten>
    <diagnosen>
      <diagnose>...</diagnose>
    </diagnosen>
    <adresseDesPatienten>
      <postleitzahl>...</postleitzahl>
      <strasseHausnummer>...</strasseHausnummer>
      <ort>...</ort>
    </adresseDesPatienten>
    <leistungsDaten>
      <datumLeistungserbringungVon>...</datumLeistungserbringungVon>
      <datumLeistungserbringungBis>...</datumLeistungserbringungBis>
      <bruttoBetragProPosition>...</bruttoBetragProPosition>
      <leistungsart>...</leistungsart>
      <positionsnummer>...</positionsnummer>
      <positionsnummerAnzahl>...</positionsnummerAnzahl>
    </leistungsDaten>
    <datenZahlungsempfaenger>
      <internationalBankAccountNumber>...</internationalBankAccountNumber>
      <versicherungsnummerZahlungsempfaenger>...</versicherungsnummerZahlungsempfaenger>
    </datenZahlungsempfaenger>
    <patientDaten>
      <leistungsbestaetigungAnforderung>...</leistungsbestaetigungAnforderung>
      <rechnungsbetragBezahlt>...</rechnungsbetragBezahlt>
      <versicherungsnummerVersicherter>...</versicherungsnummerVersicherter>
      <versicherungsnummerPatienten>...</versicherungsnummerPatienten>
      <rechnungsbetrag>...</rechnungsbetrag>
      <familiennamePatienten>...</familiennamePatienten>
      <rechnungsnummer>...</rechnungsnummer>
      <vornamePatienten>...</vornamePatienten>
      <datumRechnung>...</datumRechnung>
    </patientDaten>
  </patientenDaten>
  <infoDaten>
    <identifikationsSatz>
      <bundeslandAbrechnungsstelle>...</bundeslandAbrechnungsstelle>
      <listkennzeichen>HO</listkennzeichen>
      <projektkennzeichen>WA</projektkennzeichen>
      <zustaendigeAbrechnungsstelle>...</zustaendigeAbrechnungsstelle>
      <versionDatenbestand>7</versionDatenbestand>
      <referenznummer>...</referenznummer>
    </identifikationsSatz>
    <vertragspartnerDaten>
      <datumBehandlung>...</datumBehandlung>
      <datumUebermittlung>...</datumUebermittlung>
      <fachgebietLeistungserbringerBehandler>...</fachgebietLeistungserbringerBehandler>
      <familiennameBehandler>...</familiennameBehandler>
      <vertragspartnernummerBehandler>...</vertragspartnernummerBehandler>
      <vornameBehandler>...</vornameBehandler>
      <ordiAdresseDesVertragspartners>
        <postleitzahl>...</postleitzahl>
        <strasseHausnummer>...</strasseHausnummer>
        <ort>...</ort>
      </ordiAdresseDesVertragspartners>
    </vertragspartnerDaten>
  </infoDaten>
</n1:honorarnotenMeldung>
```

### 3. Feldnamen-Mapping

| Unser Format | WAHonline Format | Beispiel |
|-------------|------------------|----------|
| `Sozialversicherungsnummer` | `versicherungsnummerVersicherter` | `9999041190` |
| `Vorname` | `vornamePatienten` | `Mark` |
| `Nachname` | `familiennamePatienten` | `ASWH-VS-XXXXXX-Familie-A` |
| `Geburtsdatum` | (nicht im Beispiel vorhanden) | - |
| `Leistungscode` | `leistungsart` | `114` |
| `Leistungsdatum` | `datumLeistungserbringungVon` / `datumLeistungserbringungBis` | `2024-09-26` |
| `Gesamtpreis` | `rechnungsbetrag` | `200` |
| `Einzelpreis` | `bruttoBetragProPosition` | `100` |
| `Rechnungsnummer` | `rechnungsnummer` | `2025/99999` |
| `Rechnungsdatum` | `datumRechnung` | `2024-09-26` |
| `Kammernummer` | `vertragspartnernummerBehandler` | `100014` |
| `Arzt Name` | `familiennameBehandler` / `vornameBehandler` | `ASWH-VP-Arzt-Linz-A` / `Vanessa` |
| `Straße` | `strasseHausnummer` | `Max-Mustermann-Platz 1` |
| `PLZ` | `postleitzahl` | `1020` |
| `Ort` | `ort` | `Wien` |

### 4. Pflichtfelder (basierend auf Beispiel)

#### patientenDaten / patientDaten
- ✅ `versicherungsnummerVersicherter` (Pflicht)
- ✅ `versicherungsnummerPatienten` (Pflicht)
- ✅ `familiennamePatienten` (Pflicht)
- ✅ `vornamePatienten` (Pflicht)
- ✅ `rechnungsbetrag` (Pflicht)
- ✅ `rechnungsnummer` (Pflicht)
- ✅ `datumRechnung` (Pflicht)
- ✅ `rechnungsbetragBezahlt` (Pflicht, boolean)
- ✅ `leistungsbestaetigungAnforderung` (Pflicht, boolean)

#### patientenDaten / leistungsDaten
- ✅ `datumLeistungserbringungVon` (Pflicht)
- ✅ `datumLeistungserbringungBis` (Pflicht)
- ✅ `bruttoBetragProPosition` (Pflicht)
- ✅ `leistungsart` (Pflicht)
- ✅ `positionsnummer` (Pflicht)
- ✅ `positionsnummerAnzahl` (Pflicht)

#### patientenDaten / adresseDesPatienten
- ✅ `postleitzahl` (Pflicht)
- ✅ `strasseHausnummer` (Pflicht)
- ✅ `ort` (Pflicht)

#### patientenDaten / datenZahlungsempfaenger
- ⚠️ `internationalBankAccountNumber` (optional?)
- ⚠️ `versicherungsnummerZahlungsempfaenger` (optional?)

#### patientenDaten / diagnosen
- ⚠️ `diagnose` (optional, kann mehrere sein)

#### infoDaten / identifikationsSatz
- ✅ `bundeslandAbrechnungsstelle` (Pflicht, z.B. `4` für Oberösterreich)
- ✅ `listkennzeichen` (Pflicht, `HO` für Honorarnoten)
- ✅ `projektkennzeichen` (Pflicht, `WA` für WAHonline)
- ✅ `zustaendigeAbrechnungsstelle` (Pflicht, z.B. `14` für Oberösterreich)
- ✅ `versionDatenbestand` (Pflicht, `7` für Version 7)
- ✅ `referenznummer` (Pflicht)

#### infoDaten / vertragspartnerDaten
- ✅ `datumBehandlung` (Pflicht)
- ✅ `datumUebermittlung` (Pflicht, Format: `YYYY-MM-DDTHH:mm:ss`)
- ✅ `fachgebietLeistungserbringerBehandler` (Pflicht, z.B. `01` für Allgemeinmedizin)
- ✅ `familiennameBehandler` (Pflicht)
- ✅ `vertragspartnernummerBehandler` (Pflicht)
- ✅ `vornameBehandler` (Pflicht)
- ✅ `ordiAdresseDesVertragspartners` (Pflicht)
  - `postleitzahl` (Pflicht)
  - `strasseHausnummer` (Pflicht)
  - `ort` (Pflicht)

### 5. Datum-Formate

- **Datum (ohne Zeit)**: `YYYY-MM-DD` (z.B. `2024-09-26`)
- **Datum mit Zeit**: `YYYY-MM-DDTHH:mm:ss` (z.B. `2024-09-26T08:00:00`)

### 6. Wichtige Werte

- **listkennzeichen**: `HO` (für Honorarnoten)
- **projektkennzeichen**: `WA` (für WAHonline)
- **versionDatenbestand**: `7` (Version 7)
- **akz**: `a` (Attribut am Root-Element)

## Implementierungs-Änderungen

### 1. Root-Element ändern
- Von `<ELDADataset>` zu `<n1:honorarnotenMeldung>`
- Namespace von `http://www.elda.at/schema/Abrechnung` zu `http://at.sozvers.stp.elda.wa`
- Schema Location hinzufügen: `WA_V7.xsd`
- Attribut `akz="a"` hinzufügen

### 2. Struktur ändern
- Von flacher Struktur zu verschachtelter Struktur mit `<patientenDaten>` und `<infoDaten>`
- Feldnamen von PascalCase zu camelCase ändern
- Neue Pflichtfelder hinzufügen (z.B. `identifikationsSatz`)

### 3. Feldnamen-Mapping implementieren
- Alle Feldnamen müssen gemappt werden
- Neue Pflichtfelder müssen generiert werden

### 4. XML-Generierung anpassen
- Namespace-Präfixe verwenden (`n1:`)
- Korrekte Verschachtelung implementieren
- Alle Pflichtfelder sicherstellen
