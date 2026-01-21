# Analyse: Gemini-Vorschläge für WAHonline "unbekannter Fehler"

## Übersicht

Gemini hat 5 mögliche Ursachen für den "unbekannter Fehler" identifiziert. Diese Analyse bewertet jeden Punkt basierend auf dem Beispiel-XML (`WAH_14_Test_Input.xml`) und unserer aktuellen Implementierung.

---

## 1. ELDADataset-Container fehlt

**Gemini-Vorschlag**: Das XML sollte in einen `<ELDADataset>`-Container eingebettet sein.

### Analyse

**❌ UNWAHRSCHEINLICH**

**Beweis aus Beispiel-XML**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<n1:honorarnotenMeldung akz="a" ...>
  <!-- Direkt honorarnotenMeldung, KEIN ELDADataset-Container -->
</n1:honorarnotenMeldung>
```

**Fazit**: Das Beispiel-XML von ELDA zeigt **KEIN** `<ELDADataset>`-Element. Das Root-Element ist direkt `<n1:honorarnotenMeldung>`. Dieser Punkt ist daher **unwahrscheinlich** die Ursache.

**Bewertung**: ⭐ (1/5) - Sehr unwahrscheinlich

---

## 2. X-Dataset-Type Header falsch

**Gemini-Vorschlag**: Der Header `X-Dataset-Type: Abrechnung` sollte für WAHonline einen anderen Wert haben (z.B. `WAH` oder `WA`).

### Analyse

**✅ WAHRSCHEINLICH**

**Aktueller Wert**: `X-Dataset-Type: WAHonline` (aus `wahonlineConnector.js` Zeile 307)

**Mögliche Werte**:
- `WAH` - WAHonline
- `WA` - WAHonline (entspricht `projektkennzeichen` im XML)
- `HO` - Honorarnoten (entspricht `listkennzeichen` im XML)
- `Abrechnung` - Allgemeine Abrechnung (falsch für WAHonline)

**Beweis aus XML**:
- `listkennzeichen`: `HO` (Honorarnoten)
- `projektkennzeichen`: `WA` (WAHonline)

**Fazit**: Der Header-Wert könnte tatsächlich falsch sein. Möglicherweise erwartet der Server `WA` oder `HO` statt `WAHonline`.

**Bewertung**: ⭐⭐⭐⭐ (4/5) - Sehr wahrscheinlich

**Empfehlung**: Testen mit `X-Dataset-Type: WA` oder `X-Dataset-Type: HO`

---

## 3. Fehlende "datenZahlungsempfaenger"

**Gemini-Vorschlag**: `datenZahlungsempfaenger` könnte ein Pflichtfeld sein.

### Analyse

**✅ SEHR WAHRSCHEINLICH**

**Beweis aus Beispiel-XML**:
```xml
<datenZahlungsempfaenger>
  <internationalBankAccountNumber>AT999900000000999999</internationalBankAccountNumber>
  <versicherungsnummerZahlungsempfaenger>9999041190</versicherungsnummerZahlungsempfaenger>
</datenZahlungsempfaenger>
```

**Aktueller Status**: In unserer Implementierung ist `datenZahlungsempfaenger` **optional** (nur wenn `patient.bankAccount` vorhanden ist).

**Fazit**: Im Beispiel-XML ist `datenZahlungsempfaenger` **vorhanden**. Da WAHonline für Rückerstattungen an Patienten verwendet wird, ist es sehr wahrscheinlich, dass Bankdaten erforderlich sind.

**Bewertung**: ⭐⭐⭐⭐⭐ (5/5) - Sehr wahrscheinlich

**Empfehlung**: `datenZahlungsempfaenger` als Pflichtfeld behandeln, auch wenn IBAN fehlt (dann nur `versicherungsnummerZahlungsempfaenger`)

---

## 4. Namespace-Präfix Problem

**Gemini-Vorschlag**: Der Namespace-Präfix `n1:` könnte Probleme verursachen. Versuchen ohne Präfix.

### Analyse

**❌ UNWAHRSCHEINLICH**

**Beweis aus Beispiel-XML**:
```xml
<n1:honorarnotenMeldung akz="a" ... xmlns:n1="http://at.sozvers.stp.elda.wa" ...>
```

**Fazit**: Das **offizielle Beispiel-XML von ELDA** verwendet genau das gleiche Format: `<n1:honorarnotenMeldung>` mit `xmlns:n1="http://at.sozvers.stp.elda.wa"`. Dies ist also **korrekt**.

**Bewertung**: ⭐ (1/5) - Sehr unwahrscheinlich

---

## 5. Datum-Format in datumUebermittlung

**Gemini-Vorschlag**: Das Datum-Format könnte falsch sein (Millisekunden, Zeitzone).

### Analyse

**⚠️ MÖGLICH, ABER UNWAHRSCHEINLICH**

**Beispiel-XML**: `2024-09-26T08:00:00` (ohne Millisekunden, ohne Zeitzone)

**Aktuelles Format**: `2026-01-21T13:36:20` (ohne Millisekunden, ohne Zeitzone)

**Vergleich**:
- ✅ Format identisch: `YYYY-MM-DDTHH:mm:ss`
- ✅ Keine Millisekunden
- ✅ Keine Zeitzone

**Fazit**: Das Format ist identisch mit dem Beispiel. Allerdings könnte der Server sehr strikt sein und z.B. eine bestimmte Zeitzone erwarten.

**Bewertung**: ⭐⭐ (2/5) - Möglich, aber unwahrscheinlich

**Empfehlung**: Falls andere Punkte nicht helfen, könnte man `+01:00` oder `Z` hinzufügen.

---

## Zusammenfassung der Bewertung

| Punkt | Bewertung | Wahrscheinlichkeit | Priorität |
|-------|-----------|---------------------|-----------|
| 1. ELDADataset-Container | ⭐ | Sehr unwahrscheinlich | Niedrig |
| 2. X-Dataset-Type Header | ⭐⭐⭐⭐ | Sehr wahrscheinlich | **HOCH** |
| 3. datenZahlungsempfaenger | ⭐⭐⭐⭐⭐ | Sehr wahrscheinlich | **SEHR HOCH** |
| 4. Namespace-Präfix | ⭐ | Sehr unwahrscheinlich | Niedrig |
| 5. Datum-Format | ⭐⭐ | Möglich | Mittel |

---

## Empfohlene Testreihenfolge

### 1. datenZahlungsempfaenger hinzufügen (Höchste Priorität)
**Warum**: Im Beispiel vorhanden, logisch für Rückerstattungen erforderlich

**Test**: `datenZahlungsempfaenger` als Pflichtfeld hinzufügen (auch ohne IBAN)

### 2. X-Dataset-Type Header ändern (Hohe Priorität)
**Warum**: Header-Wert könnte spezifisch für WAHonline sein

**Test**: 
- `X-Dataset-Type: WA` (entspricht `projektkennzeichen`)
- Oder: `X-Dataset-Type: HO` (entspricht `listkennzeichen`)

### 3. Datum-Format anpassen (Niedrige Priorität)
**Warum**: Nur wenn 1 und 2 nicht helfen

**Test**: Zeitzone hinzufügen (`+01:00` oder `Z`)

---

## Fazit

Die **wahrscheinlichsten Ursachen** sind:
1. **datenZahlungsempfaenger fehlt** (sehr wahrscheinlich)
2. **X-Dataset-Type Header falsch** (wahrscheinlich)

Die Punkte 1, 4 und 5 sind **unwahrscheinlich**, da sie dem Beispiel-XML widersprechen oder bereits korrekt implementiert sind.
