# 📋 IST-Stand: Vorhandene Dokumententypen im System

## 🎯 Übersicht

Diese Dokumentation listet alle **tatsächlich im System definierten** Dokumententypen auf, inklusive der Terminologien und Klassifizierungen.

---

## ✅ 1. DOKUMENTENTYPEN IM BACKEND

### 1.1 Document Model (backend/models/Document.js)

**Enum-Definition:** 21 Dokumententypen

```javascript
enum: [
  'rezept',
  'ueberweisung', 
  'arztbrief', 
  'befund', 
  'formular', 
  'rechnung', 
  'sonstiges', 
  'attest', 
  'konsiliarbericht', 
  'zuweisung', 
  'rueckueberweisung', 
  'operationsbericht', 
  'heilmittelverordnung', 
  'krankenstandsbestaetigung', 
  'bildgebende_zuweisung', 
  'impfbestaetigung', 
  'patientenaufklaerung', 
  'therapieplan', 
  'verlaufsdokumentation', 
  'pflegebrief', 
  'kostenuebernahmeantrag', 
  'gutachten'
]
```

### 1.2 DocumentTemplate Model (backend/models/DocumentTemplate.js)

**Category-Enum:** 19 Dokumententypen

```javascript
enum: [
  'arztbrief',
  'attest', 
  'befund',
  'konsiliarbericht',
  'ueberweisung',
  'zuweisung',
  'rueckueberweisung',
  'operationsbericht',
  'rezept',
  'heilmittelverordnung',
  'krankenstandsbestaetigung',
  'bildgebende_zuweisung',
  'impfbestaetigung',
  'patientenaufklaerung',
  'therapieplan',
  'verlaufsdokumentation',
  'pflegebrief',
  'kostenuebernahmeantrag',
  'gutachten'
]
```

**Hinweis:** `'formular'`, `'rechnung'`, `'sonstiges'` fehlen im DocumentTemplate Enum.

---

## ✅ 2. DOKUMENTENTYPEN IM FRONTEND

### 2.1 DocumentSlice (frontend/src/store/slices/documentSlice.ts)

**TypeScript Enum:** 7 Dokumententypen (reduziert)

```typescript
type: 'rezept' | 'ueberweisung' | 'arztbrief' | 'befund' | 'formular' | 'rechnung' | 'sonstiges'
```

**Hinweis:** Frontend hat nur 7 Basis-Typen, nicht alle 21 aus dem Backend.

### 2.2 PatientOrganizer (frontend/src/pages/PatientOrganizer.tsx)

**Statische Liste:** 10 Dokumententypen (andere Benennung)

```typescript
const AVAILABLE_LETTER_TYPES = [
  { type: 'attest', name: 'Arbeitsunfähigkeitsbescheinigung', category: 'Bescheinigungen' },
  { type: 'referral', name: 'Überweisung', category: 'Überweisungen' },
  { type: 'prescription', name: 'Rezept', category: 'Rezepte' },
  { type: 'lab_request', name: 'Laboranforderung', category: 'Labor' },
  { type: 'discharge', name: 'Entlassungsbericht', category: 'Berichte' },
  { type: 'consultation', name: 'Konsultationsbericht', category: 'Berichte' },
  { type: 'follow_up', name: 'Nachsorgebericht', category: 'Berichte' },
  { type: 'emergency', name: 'Notfallbericht', category: 'Notfall' },
  { type: 'vaccination', name: 'Impfpass', category: 'Impfungen' },
  { type: 'medical_history', name: 'Anamnese', category: 'Anamnese' }
];
```

**Hinweis:** Diese Typen verwenden **andere Codes** als Backend (z.B. `'referral'` statt `'ueberweisung'`, `'prescription'` statt `'rezept'`).

---

## ✅ 3. VOLLSTÄNDIGE DOKUMENTENTYPEN-LISTE

### 3.1 Konsolidierte Liste (alle eindeutigen Typen)

| Code | Name (Deutsch) | Backend Document | Backend Template | Frontend Slice | PatientOrganizer |
|------|----------------|------------------|------------------|----------------|------------------|
| `arztbrief` | Arztbrief / Befundbrief | ✅ | ✅ | ✅ | ❌ |
| `attest` | Attest / Arbeitsunfähigkeitsbescheinigung | ✅ | ✅ | ❌ | ✅ (`attest`) |
| `befund` | Befundbericht | ✅ | ✅ | ✅ | ❌ |
| `bildgebende_zuweisung` | Bildgebende Zuweisung | ✅ | ✅ | ❌ | ❌ |
| `formular` | Formular | ✅ | ❌ | ✅ | ❌ |
| `gutachten` | Gutachten | ✅ | ✅ | ❌ | ❌ |
| `heilmittelverordnung` | Heilmittelverordnung | ✅ | ✅ | ❌ | ❌ |
| `impfbestaetigung` | Impfbestätigung | ✅ | ✅ | ❌ | ✅ (`vaccination`) |
| `konsiliarbericht` | Konsiliarbericht | ✅ | ✅ | ❌ | ✅ (`consultation`) |
| `kostenuebernahmeantrag` | Kostenübernahmeantrag | ✅ | ✅ | ❌ | ❌ |
| `krankenstandsbestaetigung` | Krankenstandsbestätigung | ✅ | ✅ | ❌ | ❌ |
| `operationsbericht` | Operationsbericht | ✅ | ✅ | ❌ | ❌ |
| `patientenaufklaerung` | Patientenaufklärung | ✅ | ✅ | ❌ | ❌ |
| `pflegebrief` | Pflegebrief | ✅ | ✅ | ❌ | ❌ |
| `rechnung` | Rechnung | ✅ | ❌ | ✅ | ❌ |
| `rezept` | Rezept / e-Rezept | ✅ | ✅ | ✅ | ✅ (`prescription`) |
| `rueckueberweisung` | Rücküberweisung | ✅ | ✅ | ❌ | ❌ |
| `sonstiges` | Sonstiges | ✅ | ❌ | ✅ | ❌ |
| `therapieplan` | Therapieplan | ✅ | ✅ | ❌ | ❌ |
| `ueberweisung` | Überweisung | ✅ | ✅ | ✅ | ✅ (`referral`) |
| `verlaufsdokumentation` | Verlaufsdokumentation | ✅ | ✅ | ❌ | ❌ |
| `zuweisung` | Zuweisung / Einweisung | ✅ | ✅ | ❌ | ❌ |

**Zusätzliche Typen in PatientOrganizer (andere Codes):**
- `discharge` - Entlassungsbericht (Backend: möglicherweise `operationsbericht` oder fehlend)
- `follow_up` - Nachsorgebericht (Backend: möglicherweise fehlend)
- `emergency` - Notfallbericht (Backend: fehlend)
- `lab_request` - Laboranforderung (Backend: möglicherweise `befund` oder fehlend)
- `medical_history` - Anamnese (Backend: möglicherweise `verlaufsdokumentation` oder fehlend)

**Gesamt:** **27 eindeutige Dokumententypen** (inkl. verschiedener Benennungen)

---

## 📊 4. DOKUMENTENTYPEN NACH KATEGORIEN

### 4.1 Kern-Dokumente (medizinische Befunde/Berichte)
1. ✅ `arztbrief` - Arztbrief / Befundbrief
2. ✅ `befund` - Befundbericht (Labor, Radiologie)
3. ✅ `operationsbericht` - Operationsbericht
4. ✅ `konsiliarbericht` - Konsiliarbericht

### 4.2 Überweisungen
1. ✅ `ueberweisung` - Überweisungsbrief
2. ✅ `zuweisung` - Zuweisung / Einweisung
3. ✅ `rueckueberweisung` - Rücküberweisungsbrief
4. ✅ `bildgebende_zuweisung` - Bildgebende Diagnostik

### 4.3 Verordnungen & Formulare
1. ✅ `rezept` - e-Rezept
2. ✅ `heilmittelverordnung` - Heilmittelverordnung
3. ✅ `krankenstandsbestaetigung` - Krankenstandsbestätigung
4. ✅ `impfbestaetigung` - Impfbestätigung

### 4.4 Patientenbezogene Berichte
1. ✅ `patientenaufklaerung` - Patientenaufklärung
2. ✅ `therapieplan` - Therapieplan
3. ✅ `verlaufsdokumentation` - Verlaufsdokumentation
4. ✅ `pflegebrief` - Pflegebrief

### 4.5 Administrative Schreiben
1. ✅ `attest` - Gutachten / Attest
2. ✅ `gutachten` - Gutachten
3. ✅ `kostenuebernahmeantrag` - Kostenübernahmeantrag

### 4.6 Verwaltung
1. ✅ `rechnung` - Rechnung
2. ✅ `formular` - Formular
3. ✅ `sonstiges` - Sonstiges

### 4.7 Zusätzliche Typen (nur Frontend/PatientOrganizer)
1. `discharge` - Entlassungsbericht
2. `follow_up` - Nachsorgebericht
3. `emergency` - Notfallbericht
4. `lab_request` - Laboranforderung
5. `medical_history` - Anamnese

---

## 🔍 5. TERMINOLOGIE-MAPPING

### 5.1 Mapping zwischen Frontend und Backend

**PatientOrganizer → Backend:**
```
'referral' → 'ueberweisung'
'prescription' → 'rezept'
'attest' → 'attest'
'vaccination' → 'impfbestaetigung'
'consultation' → 'konsiliarbericht'
```

**Fehlende Mappings:**
- `discharge` → ? (kein direkter Backend-Typ)
- `follow_up` → ? (möglicherweise `verlaufsdokumentation`)
- `emergency` → ? (kein Backend-Typ)
- `lab_request` → ? (möglicherweise `befund` oder `bildgebende_zuweisung`)
- `medical_history` → ? (möglicherweise `verlaufsdokumentation`)

---

## ✅ 6. DOKUMENTENTYPEN IN TERMINEN (Appointment Model)

**backend/models/Appointment.js:**

```javascript
enum: ['befund', 'rezept', 'überweisung', 'arztbrief', 'sonstiges']
```

**5 Typen:** `befund`, `rezept`, `überweisung`, `arztbrief`, `sonstiges`

**Hinweis:** Verwendet `'überweisung'` (mit Umlaut), während andere Stellen `'ueberweisung'` verwenden.

---

## 📋 7. ZUSAMMENFASSUNG

### 7.1 Backend-Dokumententypen

**Document Model:** 21 Typen  
**DocumentTemplate Model:** 19 Typen  
**Überschneidung:** 18 gemeinsame Typen

**Einzigartig in Document Model:**
- `formular`
- `rechnung`
- `sonstiges`

### 7.2 Frontend-Dokumententypen

**DocumentSlice:** 7 Typen (Basis-Set)  
**PatientOrganizer:** 10 Typen (andere Benennung)  
**Überschneidung:** 4 gemeinsame Typen

### 7.3 Inkonsistenzen

**Problem 1:** Frontend hat weniger Typen als Backend
- Frontend: 7 Typen
- Backend: 21 Typen
- **→ Viele Backend-Typen sind im Frontend nicht verfügbar**

**Problem 2:** Verschiedene Benennungen
- Backend: `ueberweisung`
- PatientOrganizer: `referral`
- Appointment: `überweisung` (mit Umlaut)
- **→ Keine einheitliche Terminologie**

**Problem 3:** Fehlende Typen
- PatientOrganizer verwendet Typen, die im Backend nicht existieren
- **→ Keine Datenbank-Unterstützung für diese Typen**

---

## ✅ 8. VOLLSTÄNDIGE ALPHABETISCHE LISTE

1. `arztbrief` - Arztbrief / Befundbrief
2. `attest` - Attest / Arbeitsunfähigkeitsbescheinigung
3. `befund` - Befundbericht
4. `bildgebende_zuweisung` - Bildgebende Zuweisung
5. `discharge` - Entlassungsbericht (nur Frontend)
6. `emergency` - Notfallbericht (nur Frontend)
7. `follow_up` - Nachsorgebericht (nur Frontend)
8. `formular` - Formular
9. `gutachten` - Gutachten
10. `heilmittelverordnung` - Heilmittelverordnung
11. `impfbestaetigung` - Impfbestätigung
12. `konsiliarbericht` - Konsiliarbericht
13. `kostenuebernahmeantrag` - Kostenübernahmeantrag
14. `krankenstandsbestaetigung` - Krankenstandsbestätigung
15. `lab_request` - Laboranforderung (nur Frontend)
16. `medical_history` - Anamnese (nur Frontend)
17. `operationsbericht` - Operationsbericht
18. `patientenaufklaerung` - Patientenaufklärung
19. `pflegebrief` - Pflegebrief
20. `rechnung` - Rechnung
21. `rezept` - Rezept / e-Rezept
22. `rueckueberweisung` - Rücküberweisung
23. `sonstiges` - Sonstiges
24. `therapieplan` - Therapieplan
25. `ueberweisung` / `überweisung` - Überweisung (verschiedene Schreibweisen)
26. `verlaufsdokumentation` - Verlaufsdokumentation
27. `zuweisung` - Zuweisung / Einweisung

---

## ✅ 9. ELGA-DOKUMENTENTYPEN (LOINC-Terminologie)

### 9.1 Im ELGA-Demo-Dokument verwendet

**ELGA CDA Dokumententyp:**

**LOINC Code:** `11490-0`  
**LOINC Name:** "Physician Discharge summary"  
**ELGA-Bezeichnung:** "Entlassungsbrief (Ärztlich)"  
**Code-System:** `2.16.840.1.113883.6.1` (LOINC)  
**Status:** ✅ **IM DEMO-DOKUMENT VERWENDET**

### 9.2 ELGA-Referenzen in Document Model

**backend/models/Document.js:**

```javascript
elgaData: {
  isElgaCompatible: { type: Boolean, default: false },
  elgaId: { type: String },
  submissionDate: { type: Date },
  status: { type: String, enum: ['pending', 'submitted', 'approved', 'rejected'] }
}
```

**Status-Feld vorhanden für ELGA-Kompatibilität, aber noch nicht vollständig implementiert.**

---

## ✅ 10. ZUSAMMENFASSUNG DER TERMINOLOGIEN

### 10.1 Dokumententyp-Terminologien verwendet:

1. **Interne System-Codes:** 
   - Backend: 21 Typen (lowercase, underscore)
   - Frontend: 7 Typen (reduziert)
   - PatientOrganizer: 10 Typen (englische Namen)

2. **LOINC-Codes:**
   - ✅ `11490-0` - "Physician Discharge summary" (Entlassungsbrief)

3. **ELGA-Templates:**
   - ✅ `1.2.40.0.34.11.2.0.3` - Entlassungsbrief (Ärztlich), EIS "Full Support"

### 10.2 Terminologie-Probleme:

**Problem:** Keine einheitliche Terminologie
- Backend verwendet deutsche Codes mit Underscores
- Frontend PatientOrganizer verwendet englische Codes
- ELGA verwendet LOINC-Codes
- **→ Mapping/Übersetzung notwendig**

---

**Stand: Alle im Code gefundenen Dokumententypen - IST-Zustand**

