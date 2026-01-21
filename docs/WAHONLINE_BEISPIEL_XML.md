# WAHonline Beispiel-XML mit SIT-Testpatienten

## Beispiel 1: Scarlett ASWH-VS-MRSA-Erwachsene-B

### Patientendaten
- **SV-Nummer**: `1133280290`
- **Vorname**: `Scarlett`
- **Nachname**: `ASWH-VS-MRSA-Erwachsene-B`
- **Geburtsdatum**: `1990-02-28`
- **Geschlecht**: `weiblich`
- **Adresse**: Duftschmidgasse 18, 4020 Linz

### Generiertes XML

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
			<referenznummer>800062/12345</referenznummer>
		</identifikationsSatz>
		<vertragspartnerDaten>
			<datumBehandlung>2026-01-21</datumBehandlung>
			<datumUebermittlung>2026-01-21T14:30:00</datumUebermittlung>
			<fachgebietLeistungserbringerBehandler>01</fachgebietLeistungserbringerBehandler>
			<familiennameBehandler>Test Arzt</familiennameBehandler>
			<vertragspartnernummerBehandler>14</vertragspartnernummerBehandler>
			<vornameBehandler></vornameBehandler>
			<ordiAdresseDesVertragspartners>
				<postleitzahl>4020</postleitzahl>
				<strasseHausnummer>Teststraße 1</strasseHausnummer>
				<ort>Linz</ort>
			</ordiAdresseDesVertragspartners>
		</vertragspartnerDaten>
	</infoDaten>
</n1:honorarnotenMeldung>
```

### JSON-Payload für API

```json
{
  "performance": {
    "serviceCode": "111",
    "serviceDescription": "Ordinationskonsultation",
    "serviceDatetime": "2026-01-21T14:30:00.000Z",
    "totalPrice": 35.00,
    "unitPrice": 35.00,
    "quantity": 1,
    "invoiceNumber": "2026/12345"
  },
  "patient": {
    "socialSecurityNumber": "1133280290",
    "firstName": "Scarlett",
    "lastName": "ASWH-VS-MRSA-Erwachsene-B",
    "dateOfBirth": "1990-02-28",
    "gender": "weiblich",
    "address": {
      "street": "Duftschmidgasse",
      "houseNumber": "18",
      "postalCode": "4020",
      "city": "Linz",
      "country": "Österreich"
    }
  },
  "doctor": {
    "profile": {
      "chamberNumber": "14",
      "taxNumber": "ATU12345678"
    },
    "name": "Test Arzt",
    "address": {
      "street": "Teststraße",
      "houseNumber": "1",
      "postalCode": "4020",
      "city": "Linz",
      "country": "Österreich"
    }
  }
}
```

---

## Beispiel 2: Erna ASWH-VS-MRSA-Erwachsene-D

### Patientendaten
- **SV-Nummer**: `1131050790`
- **Vorname**: `Erna`
- **Nachname**: `ASWH-VS-MRSA-Erwachsene-D`
- **Geburtsdatum**: `1990-07-05`
- **Geschlecht**: `weiblich`

### Generiertes XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<n1:honorarnotenMeldung akz="a" xsi:schemaLocation="http://at.sozvers.stp.elda.wa WA_V7.xsd" xmlns:n1="http://at.sozvers.stp.elda.wa" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<patientenDaten>
		<adresseDesPatienten>
			<postleitzahl>1010</postleitzahl>
			<strasseHausnummer>Teststraße 1</strasseHausnummer>
			<ort>Wien</ort>
		</adresseDesPatienten>
		<leistungsDaten>
			<datumLeistungserbringungVon>2026-01-21</datumLeistungserbringungVon>
			<datumLeistungserbringungBis>2026-01-21</datumLeistungserbringungBis>
			<bruttoBetragProPosition>50</bruttoBetragProPosition>
			<leistungsart>114</leistungsart>
			<positionsnummer>1010</positionsnummer>
			<positionsnummerAnzahl>1</positionsnummerAnzahl>
		</leistungsDaten>
		<patientDaten>
			<leistungsbestaetigungAnforderung>false</leistungsbestaetigungAnforderung>
			<rechnungsbetragBezahlt>true</rechnungsbetragBezahlt>
			<versicherungsnummerVersicherter>1131050790</versicherungsnummerVersicherter>
			<versicherungsnummerPatienten>1131050790</versicherungsnummerPatienten>
			<rechnungsbetrag>50</rechnungsbetrag>
			<familiennamePatienten>ASWH-VS-MRSA-Erwachsene-D</familiennamePatienten>
			<rechnungsnummer>2026/67890</rechnungsnummer>
			<vornamePatienten>Erna</vornamePatienten>
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
			<referenznummer>800062/67890</referenznummer>
		</identifikationsSatz>
		<vertragspartnerDaten>
			<datumBehandlung>2026-01-21</datumBehandlung>
			<datumUebermittlung>2026-01-21T15:00:00</datumUebermittlung>
			<fachgebietLeistungserbringerBehandler>01</fachgebietLeistungserbringerBehandler>
			<familiennameBehandler>Test Arzt</familiennameBehandler>
			<vertragspartnernummerBehandler>14</vertragspartnernummerBehandler>
			<vornameBehandler></vornameBehandler>
			<ordiAdresseDesVertragspartners>
				<postleitzahl>4020</postleitzahl>
				<strasseHausnummer>Teststraße 1</strasseHausnummer>
				<ort>Linz</ort>
			</ordiAdresseDesVertragspartners>
		</vertragspartnerDaten>
	</infoDaten>
</n1:honorarnotenMeldung>
```

### JSON-Payload für API

```json
{
  "performance": {
    "serviceCode": "114",
    "serviceDescription": "Erweiterte Ordinationskonsultation",
    "serviceDatetime": "2026-01-21T15:00:00.000Z",
    "totalPrice": 50.00,
    "unitPrice": 50.00,
    "quantity": 1,
    "invoiceNumber": "2026/67890"
  },
  "patient": {
    "socialSecurityNumber": "1131050790",
    "firstName": "Erna",
    "lastName": "ASWH-VS-MRSA-Erwachsene-D",
    "dateOfBirth": "1990-07-05",
    "gender": "weiblich",
    "address": {
      "street": "Teststraße",
      "houseNumber": "1",
      "postalCode": "1010",
      "city": "Wien",
      "country": "Österreich"
    }
  },
  "doctor": {
    "profile": {
      "chamberNumber": "14",
      "taxNumber": "ATU12345678"
    },
    "name": "Test Arzt",
    "address": {
      "street": "Teststraße",
      "houseNumber": "1",
      "postalCode": "4020",
      "city": "Linz",
      "country": "Österreich"
    }
  }
}
```

---

## Beispiel 3: Mit Diagnose

### XML mit Diagnose

```xml
<?xml version="1.0" encoding="UTF-8"?>
<n1:honorarnotenMeldung akz="a" xsi:schemaLocation="http://at.sozvers.stp.elda.wa WA_V7.xsd" xmlns:n1="http://at.sozvers.stp.elda.wa" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<patientenDaten>
		<diagnosen>
			<diagnose>Malaria</diagnose>
		</diagnosen>
		<adresseDesPatienten>
			<postleitzahl>4020</postleitzahl>
			<strasseHausnummer>Duftschmidgasse 18</strasseHausnummer>
			<ort>Linz</ort>
		</adresseDesPatienten>
		<leistungsDaten>
			<datumLeistungserbringungVon>2026-01-21</datumLeistungserbringungVon>
			<datumLeistungserbringungBis>2026-01-21</datumLeistungserbringungBis>
			<bruttoBetragProPosition>100</bruttoBetragProPosition>
			<leistungsart>114</leistungsart>
			<positionsnummer>1010</positionsnummer>
			<positionsnummerAnzahl>1</positionsnummerAnzahl>
		</leistungsDaten>
		<patientDaten>
			<leistungsbestaetigungAnforderung>false</leistungsbestaetigungAnforderung>
			<rechnungsbetragBezahlt>true</rechnungsbetragBezahlt>
			<versicherungsnummerVersicherter>1133280290</versicherungsnummerVersicherter>
			<versicherungsnummerPatienten>1133280290</versicherungsnummerPatienten>
			<rechnungsbetrag>100</rechnungsbetrag>
			<familiennamePatienten>ASWH-VS-MRSA-Erwachsene-B</familiennamePatienten>
			<rechnungsnummer>2026/99999</rechnungsnummer>
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
			<referenznummer>800062/99999</referenznummer>
		</identifikationsSatz>
		<vertragspartnerDaten>
			<datumBehandlung>2026-01-21</datumBehandlung>
			<datumUebermittlung>2026-01-21T16:00:00</datumUebermittlung>
			<fachgebietLeistungserbringerBehandler>01</fachgebietLeistungserbringerBehandler>
			<familiennameBehandler>Test Arzt</familiennameBehandler>
			<vertragspartnernummerBehandler>14</vertragspartnernummerBehandler>
			<vornameBehandler></vornameBehandler>
			<ordiAdresseDesVertragspartners>
				<postleitzahl>4020</postleitzahl>
				<strasseHausnummer>Teststraße 1</strasseHausnummer>
				<ort>Linz</ort>
			</ordiAdresseDesVertragspartners>
		</vertragspartnerDaten>
	</infoDaten>
</n1:honorarnotenMeldung>
```

### JSON-Payload mit Diagnose

```json
{
  "performance": {
    "serviceCode": "114",
    "serviceDescription": "Erweiterte Ordinationskonsultation",
    "serviceDatetime": "2026-01-21T16:00:00.000Z",
    "totalPrice": 100.00,
    "unitPrice": 100.00,
    "quantity": 1,
    "invoiceNumber": "2026/99999",
    "diagnosisCodes": ["Malaria"]
  },
  "patient": {
    "socialSecurityNumber": "1133280290",
    "firstName": "Scarlett",
    "lastName": "ASWH-VS-MRSA-Erwachsene-B",
    "dateOfBirth": "1990-02-28",
    "gender": "weiblich",
    "address": {
      "street": "Duftschmidgasse",
      "houseNumber": "18",
      "postalCode": "4020",
      "city": "Linz",
      "country": "Österreich"
    }
  },
  "doctor": {
    "profile": {
      "chamberNumber": "14",
      "taxNumber": "ATU12345678"
    },
    "name": "Test Arzt",
    "address": {
      "street": "Teststraße",
      "houseNumber": "1",
      "postalCode": "4020",
      "city": "Linz",
      "country": "Österreich"
    }
  }
}
```

---

## Wichtige Felder

### Pflichtfelder

#### patientenDaten / patientDaten
- ✅ `versicherungsnummerVersicherter` - SV-Nummer des Versicherten
- ✅ `versicherungsnummerPatienten` - SV-Nummer des Patienten
- ✅ `familiennamePatienten` - Nachname
- ✅ `vornamePatienten` - Vorname
- ✅ `rechnungsbetrag` - Gesamtbetrag (in Euro, ohne Komma)
- ✅ `rechnungsnummer` - Format: `YYYY/NNNNN`
- ✅ `datumRechnung` - Format: `YYYY-MM-DD`
- ✅ `rechnungsbetragBezahlt` - `true` oder `false`
- ✅ `leistungsbestaetigungAnforderung` - `true` oder `false`

#### patientenDaten / leistungsDaten
- ✅ `datumLeistungserbringungVon` - Format: `YYYY-MM-DD`
- ✅ `datumLeistungserbringungBis` - Format: `YYYY-MM-DD`
- ✅ `bruttoBetragProPosition` - Einzelpreis (in Euro, ohne Komma)
- ✅ `leistungsart` - Leistungscode (z.B. `111`, `114`)
- ✅ `positionsnummer` - Positionsnummer (z.B. `1010`)
- ✅ `positionsnummerAnzahl` - Anzahl (meist `1`)

#### patientenDaten / adresseDesPatienten
- ✅ `postleitzahl` - PLZ (4-stellig)
- ✅ `strasseHausnummer` - Straße + Hausnummer
- ✅ `ort` - Ort

#### infoDaten / identifikationsSatz
- ✅ `bundeslandAbrechnungsstelle` - Bundesland-Code (z.B. `4` für OÖ)
- ✅ `listkennzeichen` - Immer `HO` (Honorarnoten)
- ✅ `projektkennzeichen` - Immer `WA` (WAHonline)
- ✅ `zustaendigeAbrechnungsstelle` - Abrechnungsstelle (z.B. `14` für OÖ)
- ✅ `versionDatenbestand` - Immer `7` (Version 7)
- ✅ `referenznummer` - Format: `[Seriennummer]/[Rechnungsnummer ohne Slash]`

#### infoDaten / vertragspartnerDaten
- ✅ `datumBehandlung` - Format: `YYYY-MM-DD`
- ✅ `datumUebermittlung` - Format: `YYYY-MM-DDTHH:mm:ss`
- ✅ `fachgebietLeistungserbringerBehandler` - Fachgebiet-Code (z.B. `01` für Allgemeinmedizin)
- ✅ `familiennameBehandler` - Nachname des Arztes
- ✅ `vertragspartnernummerBehandler` - Kammernummer
- ✅ `vornameBehandler` - Vorname des Arztes
- ✅ `ordiAdresseDesVertragspartners` - Ordinationsadresse
  - `postleitzahl`
  - `strasseHausnummer`
  - `ort`

### Optionale Felder

- ⚠️ `diagnosen` - Diagnosen (kann mehrere sein)
- ⚠️ `datenZahlungsempfaenger` - Zahlungsempfänger-Daten
  - `internationalBankAccountNumber` - IBAN
  - `versicherungsnummerZahlungsempfaenger` - SV-Nummer des Zahlungsempfängers

---

## Verwendung in der Teststrecke

1. **Öffnen Sie die WAHonline-Teststrecke**: `/wahonline-test`
2. **Tab "Meldung senden" wählen**
3. **JSON-Payload eingeben** (siehe Beispiele oben)
4. **"Meldung senden" klicken**

Das System generiert automatisch das korrekte XML-Format und sendet es an die SIT-Plattform.
