# ELGA Terminology Repository

**Repository für ELGA Valuesets und CodeSystems**

## 📋 Übersicht

Dieses Repository speichert alle erforderlichen Valuesets und CodeSystems von:
- [ELGA Valuesets](https://termgit.elga.gv.at/valuesets.html)
- [ELGA CodeSystems](https://termgit.elga.gv.at/codesystems.html)

**WICHTIG:** Alle Daten werden **unverändert** übernommen - keine Modifikation!

---

## 🗄️ Datenbank-Struktur

### Collections

1. **`elga_valuesets`** - Valuesets
2. **`elga_codesystems`** - CodeSystems

### Models

- `backend/models/ElgaValueSet.js`
- `backend/models/ElgaCodeSystem.js`

---

## 🔧 Verwendung

### 1. Initialer Import

```bash
# Alle Valuesets und CodeSystems von ELGA importieren
node backend/scripts/import-elga-terminology.js
```

### 2. Verifizierung und Zusammenfassung

```bash
# Erstellt Zusammenfassung und Statistik
node backend/scripts/verify-elga-terminology.js
```

Dies erstellt:
- `docs/ELGA_TERMINOLOGY_SUMMARY.json` - JSON-Zusammenfassung
- `docs/ELGA_TERMINOLOGY_SUMMARY.md` - Markdown-Report

### 3. Wartung/Update

Das Import-Script kann regelmäßig ausgeführt werden, um Updates zu importieren:
- Existierende Einträge werden aktualisiert
- Neue Einträge werden hinzugefügt
- Daten bleiben unverändert (keine Modifikation)

---

## 📊 Datenstruktur

### ElgaValueSet Schema

```javascript
{
  title: String,           // Name des Valuesets
  version: String,          // Version (z.B. "2.0.0" oder "1.2.0+20240820")
  url: String,             // URL (unique, indexed)
  oid: String,             // OID (indexed)
  description: String,     // Beschreibung
  codes: [{
    code: String,
    system: String,
    display: String,
    version: String
  }],
  rawData: Mixed,          // Unveränderte Rohdaten
  category: String,        // 'classcode', 'typecode', 'formatcode', 'other'
  status: String,          // 'active', 'deprecated', 'unknown'
  importedAt: Date,
  lastUpdated: Date
}
```

### ElgaCodeSystem Schema

```javascript
{
  title: String,           // Name des CodeSystems
  version: String,          // Version
  url: String,             // URL (unique, indexed)
  oid: String,             // OID (indexed)
  description: String,     // Beschreibung
  concepts: [{
    code: String,
    display: String,
    definition: String,
    designation: [{
      language: String,
      value: String,
      use: String
    }]
  }],
  rawData: Mixed,          // Unveränderte Rohdaten
  category: String,        // 'classcode', 'typecode', 'formatcode', 'other'
  status: String,          // 'active', 'deprecated', 'unknown'
  importedAt: Date,
  lastUpdated: Date
}
```

---

## 🔍 Indizes

Für effiziente Suche sind folgende Indizes vorhanden:

### Valuesets
- `title`, `version`
- `url` (unique)
- `oid`
- `category`, `status`
- `codes.code`
- `codes.system`
- `importedAt`

### CodeSystems
- `title`, `version`
- `url` (unique)
- `oid`
- `category`, `status`
- `concepts.code`
- `importedAt`

---

## 📝 Dynamische Kategorisierung

Valuesets und CodeSystems werden **intelligent und dynamisch** kategorisiert basierend auf:
- Titel/Name des Valuesets/CodeSystems
- OID (Object Identifier)
- Beschreibung

### Bekannte Kategorien

**CDA-Standards:**
- `classcode` - CDA Class Codes
- `typecode` - CDA Type Codes  
- `formatcode` - CDA Format Codes

**HL7 Standards:**
- `hl7-v3` - HL7 Version 3 Standards (EntityCode, ParticipationType, etc.)

**ELGA-spezifisch:**
- `elga` - ELGA generisch
- `elga-medikation` - ELGA Medikation
- `elga-audit` - ELGA Audit/Role IDs
- `elga-problem` - ELGA Problemkatalog
- `elga-sections` - ELGA Sections
- `elga-fachaerzte` - ELGA Fachärzte

**Zertifikate/Impfung:**
- `dgc` - Digital Green Certificate (COVID-Zertifikate)
- `eimpf` - e-Impfpass

**Medizinische Terminologien:**
- `loinc` - LOINC Terminologie
- `snomed-ct` - SNOMED CT Terminologie
- `icd-10` - ICD-10 Klassifikation
- `rare-diseases` - Seltene Krankheiten (Orphanet, SNOMED)

**Medizinische Bereiche:**
- `labor` - Labor/Befunde
- `medication` - Medikation/Arzneimittel (allgemein)
- `befund` - Befunde/Ergebnisse
- `prozedur` - Prozeduren/Interventionen
- `diagnose` - Diagnosen/Krankheiten
- `appc` - APPC (Anatomie/Prozeduren)

**Weitere:**
- `diaetologie` - Diätologie/Ernährung
- `units-time` - Zeit-Einheiten (UCUM)
- `organisation` - Organisationen/Institutionen
- `rolle` - Rollen/Personen
- `1450-service` - 1450 Telefondienst (BPOS)

**Dynamische Kategorien:**
Falls keine bekannte Kategorie gefunden wird, werden neue Kategorien **dynamisch erstellt** basierend auf:
1. Präfix im Titel (z.B. "ELGA_Audit" → "elga-audit")
2. Erste Wörter des Titels (z.B. "Some New Valueset" → "some-new")

**Fallback:**
- `other` - Nur wenn keine sinnvolle Kategorisierung möglich ist

**Referenz:** Siehe `backend/scripts/category-mapping.json` für vollständige Liste und Erkennungsregeln

---

## 🎯 Verwendung in der Anwendung

### Beispiel: Valueset suchen

```javascript
const ElgaValueSet = require('./models/ElgaValueSet');

// Nach OID suchen
const valueset = await ElgaValueSet.findOne({ oid: '1.2.40.0.34.10.153' });

// Nach Kategorie suchen
const classcodes = await ElgaValueSet.find({ category: 'classcode' });

// Code in Valueset prüfen
const hasCode = await ElgaValueSet.findOne({
  'codes.code': 'someCode',
  'codes.system': 'someSystem'
});
```

### Beispiel: CodeSystem suchen

```javascript
const ElgaCodeSystem = require('./models/ElgaCodeSystem');

// Nach OID suchen
const codesystem = await ElgaCodeSystem.findOne({ oid: '1.2.40.0.34.5.160' });

// Concept suchen
const concept = await ElgaCodeSystem.findOne({
  'concepts.code': '107'
});
```

---

## 🔄 Automatische Updates

Für regelmäßige Updates kann ein Cron-Job eingerichtet werden:

```javascript
// In backend/server.js oder separater Datei
const cron = require('node-cron');
const { importValueSets, importCodeSystems } = require('./scripts/import-elga-terminology');

// Wöchentlich am Sonntag um 2:00 Uhr
cron.schedule('0 2 * * 0', async () => {
  logger.info('Starte automatisches ELGA-Terminologie-Update...');
  try {
    await importValueSets();
    await importCodeSystems();
    logger.info('ELGA-Terminologie-Update abgeschlossen');
  } catch (error) {
    logger.error('Fehler beim ELGA-Terminologie-Update:', error);
  }
});
```

---

## 📦 Dependencies

Das Import-Script benötigt:
- `axios` - HTTP-Requests
- `cheerio` - HTML-Parsing
- `mongoose` - MongoDB
- `dotenv` - Umgebungsvariablen

Installation:
```bash
npm install axios cheerio
```

---

## ⚠️ Wichtige Hinweise

1. **Daten bleiben unverändert** - Alle Original-Daten werden in `rawData` gespeichert
2. **Rate Limiting** - Script wartet 500ms zwischen Requests
3. **Fehlerbehandlung** - Fehlerhafte Einträge werden geloggt, aber der Import wird fortgesetzt
4. **Updates** - Existierende Einträge werden aktualisiert, nicht dupliziert

---

## 📚 Weitere Informationen

- [ELGA Terminologie Browser](https://termgit.elga.gv.at/)
- [FHIR Valuesets](https://termgit.elga.gv.at/valuesets.html)
- [FHIR CodeSystems](https://termgit.elga.gv.at/codesystems.html)

---

**Stand:** Oktober 2025  
**Zuletzt aktualisiert:** Siehe `docs/ELGA_TERMINOLOGY_SUMMARY.md`

