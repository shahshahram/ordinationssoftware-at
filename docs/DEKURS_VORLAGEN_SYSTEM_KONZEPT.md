# Dekurs-Vorlagensystem - Konzept

## 1. Übersicht

Das Dekurs-Vorlagensystem ermöglicht es, für jede medizinische Fachrichtung strukturierte Vorlagen zu erstellen, die beim Erstellen eines Dekurs im **PatientOrganizer** automatisch eingefügt werden können. Die Vorlagen basieren auf ICD-10-Diagnosen und enthalten alle relevanten Abschnitte eines Dekurs.

**Wichtig:**
- Dekurs wird **im PatientOrganizer** angelegt (bestehender Workflow bleibt)
- **Dekurs-Tab im PatientOrganizer bleibt erhalten** (keine Änderung an Tab-Struktur)
- **Patientenbezug** ist bereits vorhanden (patientId wird automatisch gesetzt)
- **Bestehende Dekurs-Administration** im PatientOrganizer bleibt unverändert
- **Bestehende Felder werden durch Vorlagen-Felder ersetzt** (außer Medikation, ICD-10, Labor, DICOM)
- **Separate Felder bleiben bestehen:**
  - **ICD-10** (bleibt separat, wird nicht durch Vorlagen ersetzt)
  - **Medikation** (bleibt separat, Tab "Medikamente" bleibt unverändert)
  - **Labor** (neues separates Feld, wird nicht durch Vorlagen befüllt)
  - **DICOM/Radiologie** (neues separates Feld, wird nicht durch Vorlagen befüllt)
- **Vorlagen-Integration** erfolgt in den bestehenden `DekursDialog`

## 2. Datenmodell

### 2.1 DekursVorlage (Backend Model)

```javascript
{
  _id: ObjectId,
  // Identifikation
  code: String,              // Eindeutiger Code (z.B. "I10_HYPERTONIE")
  title: String,             // Titel der Vorlage (z.B. "Arterielle Hypertonie")
  icd10: String,             // ICD-10 Code (z.B. "I10")
  icd10Title: String,        // Vollständiger ICD-10 Titel
  
  // Zuordnung
  specialty: String,         // Fachrichtung (code aus MedicalSpecialty)
  specialties: [String],     // Mehrere Fachrichtungen möglich
  locationIds: [ObjectId],   // Optional: spezifische Standorte
  
  // Vorlageninhalt (JSON-Struktur - ersetzt bestehende DekursEntry-Felder)
  template: {
    // Diese Felder ersetzen die bestehenden Felder im DekursDialog
    // Feldnamen im UI werden an Vorlagen-Namen angepasst
    visitReason: String,              // UI-Label: "Diagnose" (ersetzt bestehendes Feld, entspricht "diagnose" in JSON)
    clinicalObservations: String,      // UI-Label: "Anamnese" (ersetzt bestehendes Feld, entspricht "anamnese" in JSON)
    findings: String,                  // UI-Label: "Status" oder "Befund" (ersetzt bestehendes Feld, entspricht "status" in JSON)
    progressChecks: String,            // UI-Label: "Beurteilung" (ersetzt bestehendes Feld, entspricht "beurteilung" in JSON)
    treatmentDetails: String,          // UI-Label: "Therapie" (ersetzt bestehendes Feld, entspricht "therapie" in JSON)
    notes: String,                     // UI-Label: "Empfehlung" (ersetzt bestehendes Feld, entspricht "empfehlung" in JSON)
    psychosocialFactors: String,       // UI-Label: "Psychosoziale Faktoren" (ersetzt bestehendes Feld)
    
    // Optional: Medikamentenänderungen (kann Vorlage ergänzen, aber Medikation-Tab bleibt separat)
    medicationChanges: String,         // UI-Label: "Medikamentenänderungen" (optional, ergänzt Medikation-Tab)
    
    // HINWEIS: imagingFindings und laboratoryFindings sind NICHT Teil der Vorlage
    // Diese bleiben separate Felder im DekursDialog und werden nicht durch Vorlagen befüllt
    
    // ELGA-konforme Struktur (für Export)
    elga_structured: {
      chief_complaint: String,
      history_of_present_illness: String,
      relevant_history: String,
      medications: [String],
      allergies: [String],
      physical_exam: String,
      diagnosis: [String],
      treatment: String,
      followup: String,
      imaging: String,                // Neu: Bildgebende Verfahren
      laboratory: String               // Neu: Laborwerte
    }
  },
  
  // Metadaten
  isActive: Boolean,
  isDefault: Boolean,        // Standard-Vorlage für diese ICD-10?
  sortOrder: Number,
  tags: [String],            // Suchtags (z.B. ["Hypertonie", "Blutdruck"])
  
  // Versionierung
  version: Number,
  createdBy: ObjectId,
  lastModifiedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### 2.2 Vorlagen-Import/Export

- **JSON-Format**: Für System-Import/Export und Bearbeitung
- **XML-Format**: Für ELGA-Export (CDA-konform)
- **CSV-Format**: Für Bulk-Import mehrerer Vorlagen

## 3. Funktionalität

### 3.1 Vorlagen-Verwaltung (Administration)

**Neue Seite: `/dekurs-vorlagen-admin`**

#### 3.1.1 Vorlagen-Liste
- Tabelle mit allen Vorlagen
- Filter nach:
  - Fachrichtung
  - ICD-10 Code
  - Status (aktiv/inaktiv)
  - Standort
- Spalten:
  - Code
  - Titel
  - ICD-10
  - Fachrichtung(en)
  - Status
  - Aktionen (Bearbeiten, Löschen, Duplizieren, Exportieren)

#### 3.1.2 Vorlage erstellen/bearbeiten
- **Dialog mit Tabs:**
  - **Allgemein:**
    - Code (automatisch generierbar aus ICD-10 + Titel)
    - Titel
    - ICD-10 Code (mit Autocomplete aus ICD-10-Katalog)
    - ICD-10 Titel (automatisch befüllt)
    - Fachrichtung(en) (Multi-Select aus MedicalSpecialty)
    - Standorte (optional, Multi-Select)
    - Tags
    - Status (aktiv/inaktiv)
    - Standard-Vorlage für diese ICD-10?
  
  - **Vorlageninhalt:**
    - **Strukturierte Felder:**
      - Diagnose (TextField)
      - Anamnese (TextArea, groß)
      - Status/Befund (TextArea, groß)
      - Beurteilung (TextArea)
      - Therapie (TextArea, groß)
      - Empfehlung (TextArea)
    
    - **ELGA-Struktur (erweitert):**
      - Chief Complaint
      - History of Present Illness
      - Relevant History
      - Medications (Array-Editor)
      - Allergies (Array-Editor)
      - Physical Exam
      - Diagnosis (Array-Editor)
      - Treatment
      - Follow-up
  
  - **Vorschau:**
    - Zeigt gerenderte Vorlage
    - Zeigt ELGA-XML-Vorschau

#### 3.1.3 Import-Funktionen
- **JSON-Import:** Einzelne oder mehrere Vorlagen aus JSON-Datei
- **CSV-Import:** Bulk-Import aus CSV (wie `allgemeinmedizin_diagnosen_detailed.csv`)
- **Validierung:** Prüft auf vollständige Felder und Duplikate

#### 3.1.4 Export-Funktionen
- **JSON-Export:** Einzelne oder mehrere Vorlagen
- **XML-Export:** ELGA-konformes CDA-Format
- **CSV-Export:** Für Bearbeitung in Excel

### 3.2 Integration in Dekurs-Erstellung

#### 3.2.1 Auto-Complete für Vorlagen

**Im Dekurs-Formular:**

1. **ICD-10-Feld:**
   - Autocomplete mit ICD-10-Katalog
   - Nach Auswahl: Automatische Suche nach passenden Vorlagen
   - Anzeige: "3 Vorlagen verfügbar" (Badge)

2. **Vorlagen-Auswahl:**
   - Button: "Vorlage einfügen" (neben ICD-10-Feld)
   - Dialog öffnet sich mit:
     - **Filter:**
       - Fachrichtung (aus aktueller Standort-Zuordnung)
       - ICD-10 Code (vorausgefüllt)
       - Suchtext
     - **Liste der Vorlagen:**
       - Titel
       - ICD-10
       - Fachrichtung
       - Vorschau (erste Zeilen)
     - **Aktionen:**
       - "Vorlage einfügen" (füllt alle Felder)
       - "Vorschau" (zeigt vollständige Vorlage)

3. **Vorlage einfügen:**
   - Alle Felder werden mit Vorlageninhalt befüllt
   - **Felder bleiben editierbar** (keine Sperre)
   - **Placeholder/Helper-Text:** "Aus Vorlage: [Vorlagenname]"
   - **Möglichkeit:** "Vorlage zurücksetzen" (wenn geändert)

#### 3.2.2 Intelligente Vorlagen-Auswahl

**Logik:**
1. **Priorität 1:** Vorlagen mit exakter ICD-10-Übereinstimmung + Fachrichtung des Standorts
2. **Priorität 2:** Vorlagen mit exakter ICD-10-Übereinstimmung (alle Fachrichtungen)
3. **Priorität 3:** Vorlagen mit ähnlicher ICD-10 (gleiche Kategorie) + Fachrichtung
4. **Priorität 4:** Standard-Vorlagen für ICD-10-Kategorie

**Anzeige:**
- Vorlagen nach Priorität sortiert
- Badge: "Empfohlen" für Priorität 1-2
- Badge: "Standard" für Standard-Vorlagen

### 3.3 DekursDialog Anpassung (bestehende Komponente)

**Bestehender `DekursDialog` wird angepasst:**

1. **Felder werden durch Vorlagen-Felder ersetzt (mit angepassten Feldnamen):**
   - **Vorlagen-Felder ersetzen bestehende Felder:**
     - `visitReason` → **Feldname im UI: "Diagnose"** (wie in Vorlage) → wird durch Vorlage befüllt (entspricht "diagnose" in JSON)
     - `clinicalObservations` → **Feldname im UI: "Anamnese"** (wie in Vorlage) → wird durch Vorlage befüllt (entspricht "anamnese" in JSON)
     - `findings` → **Feldname im UI: "Status" oder "Befund"** (wie in Vorlage) → wird durch Vorlage befüllt (entspricht "status" in JSON)
     - `progressChecks` → **Feldname im UI: "Beurteilung"** (wie in Vorlage) → wird durch Vorlage befüllt (entspricht "beurteilung" in JSON)
     - `treatmentDetails` → **Feldname im UI: "Therapie"** (wie in Vorlage) → wird durch Vorlage befüllt (entspricht "therapie" in JSON)
     - `notes` → **Feldname im UI: "Empfehlung"** (wie in Vorlage) → wird durch Vorlage befüllt (entspricht "empfehlung" in JSON)
     - `psychosocialFactors` → **Feldname im UI: "Psychosoziale Faktoren"** (bleibt) → wird durch Vorlage befüllt (falls in Vorlage vorhanden)
   
   - **Diese Felder bleiben bestehen (werden NICHT ersetzt):**
     - `linkedDiagnoses` (Verknüpfte Diagnosen) - **ICD-10 bleibt separat**
     - `linkedMedications` (Verknüpfte Medikamente) - **Medikation bleibt separat**
     - `medicationChanges` (Medikamentenänderungen) - **bleibt separat, kann aber durch Vorlage ergänzt werden**

2. **Neue Felder für Labor und DICOM (bleiben separat):**
   - **Bildgebende Befunde (DICOM/Radiologie):**
     - TextArea: `imagingFindings`
     - Buttons:
       - "DICOM-Studien übernehmen" → Dialog mit DICOM-Studien-Liste
       - "Radiologie-Befund übernehmen" → Dialog mit Radiologie-Befunden
     - **Separates Feld, bleibt leer wenn nicht benötigt**
   
   - **Laborbefunde:**
     - TextArea: `laboratoryFindings`
     - Button: "Aktuelle Laborwerte übernehmen" → Dialog mit Labor-Ergebnissen
     - **Separates Feld, bleibt leer wenn nicht benötigt**

3. **Vorlagen-Integration:**
   - **ICD-10-Feld:** Bleibt bestehen, wird durch Vorlagen-Auswahl ergänzt
   - **Vorlagen-Button:** Neu hinzufügen
   - **Nach Vorlagen-Auswahl:** Felder werden automatisch befüllt
   - **Feld-Markierung:** Visuelle Unterscheidung für Felder aus Vorlage
   - **Vorlagen-Reset:** Button zum Zurücksetzen auf Vorlagen-Werte

4. **Tab-Struktur (bestehend bleibt):**
   - Tab 1: "Allgemein" (Vorlagen-Felder + ICD-10 + Labor + DICOM)
   - Tab 2: "Medikamente" (bestehend - bleibt separat)
   - Tab 3: "Diagnosen" (bestehend - ICD-10 bleibt separat)
   - Tab 4: "Fotos" (bestehend)

## 4. Technische Umsetzung

### 4.1 Backend

#### 4.1.1 Model: `DekursVorlage.js`
- Mongoose Schema wie oben definiert
- Indizes:
  - `code` (unique)
  - `icd10` + `specialty`
  - `specialty` + `isActive`
  - `locationIds`

#### 4.1.2 Routes: `dekursVorlagen.js`
- `GET /api/dekurs-vorlagen` - Liste (mit Filtern)
- `GET /api/dekurs-vorlagen/:id` - Einzelne Vorlage
- `POST /api/dekurs-vorlagen` - Erstellen
- `PUT /api/dekurs-vorlagen/:id` - Bearbeiten
- `DELETE /api/dekurs-vorlagen/:id` - Löschen
- `POST /api/dekurs-vorlagen/import/json` - JSON-Import
- `POST /api/dekurs-vorlagen/import/csv` - CSV-Import
- `GET /api/dekurs-vorlagen/export/:id/json` - JSON-Export
- `GET /api/dekurs-vorlagen/export/:id/xml` - XML-Export
- `GET /api/dekurs-vorlagen/search` - Suche (für Autocomplete)
  - Parameter: `icd10`, `specialty`, `locationId`, `query`

#### 4.1.3 Service: `dekursVorlagenService.js`
- `findMatchingTemplates(icd10, specialty, locationId)` - Intelligente Suche
- `importFromJSON(jsonData)` - JSON-Import
- `importFromCSV(csvData)` - CSV-Import
- `exportToXML(template)` - XML-Generierung (CDA)
- `validateTemplate(template)` - Validierung

### 4.2 Frontend

#### 4.2.1 Seite: `DekursVorlagenAdmin.tsx`
- Vollständige CRUD-Verwaltung
- Import/Export-Funktionen
- Filter und Suche
- Bulk-Operationen

#### 4.2.2 Komponente: `DekursVorlagenAutocomplete.tsx`
- Autocomplete-Dialog für Vorlagen-Auswahl
- Filter-UI
- Vorschau-Funktion
- Integration in Dekurs-Formular

#### 4.2.3 Hook: `useDekursVorlagen.ts`
- `searchTemplates(icd10, specialty, locationId)` - Suche
- `getTemplate(id)` - Einzelne Vorlage laden
- `insertTemplate(templateId)` - Vorlage in Formular einfügen

#### 4.2.4 Dekurs-Formular Anpassung
- Integration von `DekursVorlagenAutocomplete`
- Vorlagen-Button
- Feld-Markierung
- Reset-Funktion

## 5. Workflow

### 5.1 Vorlage erstellen (Admin)

1. Navigation: **Einstellungen → Dekurs-Vorlagen**
2. Button: **"Neue Vorlage"**
3. Dialog öffnet:
   - **Allgemein-Tab:** Metadaten eingeben
   - **Vorlageninhalt-Tab:** Inhalte eingeben
   - **Vorschau-Tab:** Kontrolle
4. Speichern
5. Optional: Export als JSON/XML

### 5.2 Vorlage verwenden (Arzt/Assistent) - IM PATIENTORGANIZER

1. **PatientOrganizer öffnen** → Tab "Dekurs"
2. **Dekurs erstellen/bearbeiten** (bestehender Workflow)
3. **ICD-10 auswählen** (bestehendes ICD10Autocomplete)
4. **Button: "Vorlage einfügen"** (NEU) → Dialog öffnet
5. **Passende Vorlagen anzeigen** (gefiltert nach ICD-10 + Fachrichtung + Standort)
6. **Vorlage auswählen** → **"Einfügen"**
7. **Felder werden befüllt**, bleiben editierbar
8. **Optional: Bildgebende Befunde übernehmen:**
   - Button: "DICOM-Studien übernehmen" → DICOM-Studien auswählen
   - Button: "Radiologie-Befund übernehmen" → Radiologie-Befunde auswählen
   - **Oder:** Feld leer lassen wenn nicht benötigt
9. **Optional: Laborwerte übernehmen:**
   - Button: "Aktuelle Laborwerte übernehmen" → Labor-Ergebnisse auswählen
   - **Oder:** Feld leer lassen wenn nicht benötigt
10. **Anpassungen vornehmen** (alle Felder editierbar)
11. **Speichern** (bestehender Workflow)

### 5.3 Bulk-Import (Admin)

1. Navigation: **Dekurs-Vorlagen**
2. Button: **"Import"**
3. Datei auswählen (JSON oder CSV)
4. Validierung
5. Vorschau der zu importierenden Vorlagen
6. Bestätigen
7. Import durchführen
8. Erfolgsmeldung mit Anzahl

## 6. Besondere Features

### 6.1 Platzhalter/Variablen

**Möglichkeit für dynamische Inhalte:**
- `{{patientName}}` - Wird durch Patientennamen ersetzt
- `{{patientAge}}` - Alter
- `{{date}}` - Aktuelles Datum
- `{{doctorName}}` - Arztname

**Beispiel:**
```
"Die/Der Pat. {{patientName}} stellt sich zur Verlaufskontrolle vor..."
```

### 6.2 Vorlagen-Versionierung

- Jede Änderung erstellt neue Version
- Alte Versionen bleiben erhalten
- Möglichkeit, alte Version wiederherzustellen
- Versionsvergleich

### 6.3 Vorlagen-Duplikation

- Button: **"Duplizieren"**
- Erstellt Kopie mit neuem Code
- Nützlich für ähnliche Diagnosen

### 6.4 Vorlagen-Kategorien

- Gruppierung nach ICD-10-Kategorien
- Filter nach Kategorien
- Übersichtliche Darstellung

## 7. Integration mit bestehendem System

### 7.1 DekursEntry-Model Erweiterung

**Bestehendes Model erweitern um:**

```javascript
{
  // ... bestehende Felder bleiben unverändert ...
  
  // NEUE FELDER:
  imagingFindings: {
    type: String,
    trim: true,
    maxlength: [5000, 'Bildgebende Befunde dürfen maximal 5000 Zeichen haben']
  },
  laboratoryFindings: {
    type: String,
    trim: true,
    maxlength: [5000, 'Laborbefunde dürfen maximal 5000 Zeichen haben']
  },
  
  // Verknüpfungen zu DICOM/Radiologie/Labor (optional)
  linkedDicomStudies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DicomStudy'
  }],
  linkedRadiologyReports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'  // Oder eigenes Model für Radiologie-Befunde
  }],
  linkedLaborResults: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LaborResult'  // Oder eigenes Model für Labor-Ergebnisse
  }],
  
  // Vorlagen-Information (erweitern bestehendes templateId/templateName)
  templateUsed: {
    templateId: ObjectId,      // Bereits vorhanden als templateId
    templateName: String,       // Bereits vorhanden als templateName
    templateVersion: Number,
    insertedAt: Date,
    modified: Boolean,          // Wurde Vorlage nach Einfügen geändert?
    originalFields: {           // Original-Werte aus Vorlage (für Reset)
      visitReason: String,
      clinicalObservations: String,
      findings: String,
      progressChecks: String,
      treatmentDetails: String,
      notes: String,
      medicationChanges: String,
      psychosocialFactors: String
    }
  }
}
```

### 7.2 Standort-Zuordnung

- Vorlagen können spezifischen Standorten zugeordnet werden
- Beim Erstellen: Nur Vorlagen des aktuellen Standorts anzeigen
- Fallback: Vorlagen ohne Standort-Zuordnung (global)

### 7.3 Fachrichtung-Zuordnung

- Vorlagen sind einer oder mehreren Fachrichtungen zugeordnet
- Beim Erstellen: Nur Vorlagen der Standort-Fachrichtungen anzeigen
- Kombination: Standort + Fachrichtung

## 8. UI/UX Überlegungen

### 8.1 Vorlagen-Auswahl-Dialog

**Design:**
- Modal-Dialog mit Tabs
- Linke Seite: Filter
- Rechte Seite: Vorlagen-Liste mit Vorschau
- Unten: Aktionen (Einfügen, Abbrechen)

**Interaktion:**
- Klick auf Vorlage → Vorschau rechts
- Doppelklick → Einfügen und Schließen
- Enter → Einfügen

### 8.2 Feld-Markierung

**Visuell:**
- Leichte Hintergrundfarbe (z.B. #F0F9FF)
- Icon neben Label
- Tooltip mit Vorlagenname
- Optional: Badge "Aus Vorlage"

### 8.3 Responsive Design

- Mobile: Vollbild-Dialog
- Tablet: Sidebar mit Filter
- Desktop: Modal mit zwei Spalten

## 9. Validierung

### 9.1 Vorlagen-Validierung

- **Pflichtfelder:**
  - Code (eindeutig)
  - Titel
  - ICD-10
  - Mindestens eine Fachrichtung
  - Diagnose
  - Anamnese
  - Status
  - Beurteilung
  - Therapie

- **Format-Validierung:**
  - ICD-10 Format (z.B. "I10", "E11.9")
  - Code Format (alphanumerisch, Unterstriche)

### 9.2 Import-Validierung

- JSON-Schema-Validierung
- CSV-Spalten-Validierung
- Duplikat-Prüfung
- ICD-10-Existenz-Prüfung
- Fachrichtung-Existenz-Prüfung

## 10. Performance

### 10.1 Caching

- Vorlagen-Liste cachen (nach Fachrichtung/Standort)
- Cache-Invalidierung bei Änderungen
- Redis für schnelle Suche

### 10.2 Indizierung

- MongoDB-Indizes für schnelle Suche
- Text-Index für Volltext-Suche
- Compound-Index für Filter-Kombinationen

## 11. Migration

### 11.1 Bestehende Vorlagen

- **CSV/JSON-Import** für alle 20 Allgemeinmedizin-Vorlagen aus `/allgemeinmedizin_komplett_export`
- **Mapping** von JSON-Struktur zu neuer Vorlagen-Struktur:
  - `diagnose` → `visitReason`
  - `anamnese` → `clinicalObservations`
  - `status` → `findings`
  - `beurteilung` → `progressChecks`
  - `therapie` → `treatmentDetails`
  - `empfehlung` → `notes`
- Automatische Zuordnung zu Fachrichtung "allgemeinmedizin"
- Validierung und Fehlerbehandlung
- **ELGA-Struktur** wird aus `elga_structured` übernommen

### 11.2 Bestehende Dekurse

- **Keine Änderung** an bestehenden Dekursen
- Neue Felder (`imagingFindings`, `laboratoryFindings`) bleiben leer
- Bestehende `templateId`/`templateName` werden in `templateUsed` migriert
- Optional: Analyse, welche Vorlagen hätten verwendet werden können

### 11.3 Bestehende DekursVorlage-Model

- **Migration** von altem `DekursVorlage`-Schema zu neuem Schema
- Alte Vorlagen werden konvertiert (wenn möglich)
- Oder: Neu-Import aus JSON/CSV

## 12. DICOM/Radiologie und Labor Integration

### 12.1 DICOM-Studien Integration

**Backend:**
- Route: `GET /api/dicom/patient/:patientId/studies` (bereits vorhanden)
- Filter: Datum, Studie-Typ
- Rückgabe: Liste mit Befundungstexten

**Frontend:**
- `DicomRadiologieSelector` Komponente
- Dialog mit:
  - Tabelle aller DICOM-Studien
  - Spalten: Datum, Studie-Typ, Befundung (Vorschau)
  - Multi-Select Checkboxen
  - Button: "Befunde übernehmen"
- **Text-Format:** 
  ```
  [Datum] [Studie-Typ]: [Befundungstext]
  [Datum] [Studie-Typ]: [Befundungstext]
  ```

### 12.2 Radiologie-Befunde Integration

**Backend:**
- Route: `GET /api/documents/patient/:patientId?type=radiology` (neu oder erweitern)
- Filter: Dokument-Typ "Radiologie-Befund"
- Rückgabe: Liste mit Befundtexten

**Frontend:**
- Integration in `DicomRadiologieSelector` oder separate Komponente
- Dialog mit:
  - Tabelle aller Radiologie-Befunde
  - Spalten: Datum, Typ, Befund (Vorschau)
  - Multi-Select Checkboxen
  - Button: "Befunde übernehmen"

### 12.3 Labor-Ergebnisse Integration

**Backend:**
- Route: `GET /api/labor/patient/:patientId/results` (bereits vorhanden)
- Filter: Zeitraum, nur auffällige Werte
- Rückgabe: Liste mit Laborwerten

**Frontend:**
- `LaborWerteSelector` Komponente
- Dialog mit:
  - Tabelle aller Labor-Ergebnisse
  - Spalten: Datum, Parameter, Wert, Einheit, Referenz, Status (auffällig/normal)
  - Filter:
    - Zeitraum (letzte 7 Tage, 30 Tage, 3 Monate, 6 Monate, 1 Jahr)
    - Nur auffällige Werte (Checkbox)
  - Multi-Select Checkboxen
  - Button: "Laborwerte übernehmen"
- **Text-Format:**
  ```
  [Datum] - Laborwerte:
  - Parameter: Wert Einheit (Referenz) [Status]
  - Parameter: Wert Einheit (Referenz) [Status]
  ```

### 12.4 Automatische Übernahme

**Option 1: Manuell (Standard)**
- Felder bleiben leer
- Benutzer klickt Button wenn benötigt
- Dialog öffnet, Auswahl möglich

**Option 2: Automatisch (Optional, konfigurierbar)**
- Beim Öffnen des Dekurs-Dialogs:
  - Automatische Suche nach neuesten DICOM-Studien (letzte 7 Tage)
  - Automatische Suche nach neuesten Laborwerten (letzte 7 Tage)
  - Vorschlag: "X neue DICOM-Studien verfügbar" / "X neue Laborwerte verfügbar"
  - Button: "Automatisch übernehmen" oder "Überspringen"

## 13. Erweiterungen (Zukunft)

### 12.1 Intelligente Vorschläge

- ML-basierte Vorlagen-Auswahl basierend auf:
  - Patientengeschichte
  - Ähnliche Fälle
  - Häufig verwendete Vorlagen

### 12.2 Vorlagen-Statistiken

- Welche Vorlagen werden am häufigsten verwendet?
- Welche werden nie verwendet?
- Durchschnittliche Bearbeitungszeit nach Vorlage

### 12.3 Vorlagen-Sharing

- Vorlagen zwischen Standorten teilen
- Vorlagen-Marktplatz
- Community-Vorlagen

### 12.4 Multi-Language Support

- Vorlagen in verschiedenen Sprachen
- Automatische Übersetzung (optional)

## 14. Sicherheit

### 13.1 Berechtigungen

- **Lesen:** Alle mit Dekurs-Zugriff
- **Erstellen/Bearbeiten:** Nur Admins und Ärzte
- **Löschen:** Nur Admins
- **Import/Export:** Nur Admins

### 13.2 Audit-Log

- Wer hat welche Vorlage erstellt/bearbeitet/gelöscht?
- Wann wurde welche Vorlage verwendet?
- Versionshistorie

## 15. Zusammenfassung

Das Dekurs-Vorlagensystem ermöglicht:

1. **Strukturierte Vorlagen** pro Fachrichtung und ICD-10
2. **Intelligente Auswahl** basierend auf ICD-10, Fachrichtung und Standort
3. **Auto-Complete-Integration** im **bestehenden DekursDialog** (PatientOrganizer)
4. **Bearbeitbare Felder** nach Einfügen
5. **Vollständige Administration** mit Import/Export (separate Seite)
6. **ELGA-Kompatibilität** durch XML-Export
7. **Skalierbarkeit** für alle Fachrichtungen
8. **Integration von DICOM/Radiologie-Befunden** (optional, bei Bedarf)
9. **Integration von Laborwerten** (optional, bei Bedarf)

**Wichtige Punkte:**
- ✅ **Dekurs wird im PatientOrganizer angelegt** (bestehender Workflow)
- ✅ **Patientenbezug ist bereits vorhanden** (patientId automatisch)
- ✅ **Bestehende Dekurs-Administration bleibt unverändert**
- ✅ **Integration erfolgt in bestehenden DekursDialog**
- ✅ **Neue Felder für DICOM/Radiologie und Labor** (optional befüllbar)
- ✅ **Separate Administration-Seite** für Vorlagen-Verwaltung

**Vorteile:**
- Zeitersparnis bei Dekurs-Erstellung
- Konsistenz in der Dokumentation
- ELGA-Konformität
- Wiederverwendbarkeit
- Einfache Verwaltung
- Integration bestehender Daten (DICOM, Labor)
- Flexibilität (Felder bleiben optional)

