# 📊 IST-Analyse: ELGA-Standards, Terminologien und Stylesheets

## 🎯 Übersicht

Diese Dokumentation zeigt den **aktuellen IST-Zustand** aller bereits implementierten/übernommenen ELGA-Standards, Implementierungsleitfäden, Terminologien und Stylesheets im System.

---

## ✅ 1. ELGA-STYLESHEETS

### 1.1 ELGA Referenz-Stylesheet v1.0

**Datei:** `frontend/public/ELGA_Stylesheet_v1.0.xsl`

**Status:** ✅ **IMPLEMENTIERT**

**Details:**
- **Version:** 1.12.0+20250310
- **Zweck:** Einheitliche Darstellung von ELGA CDA-Dokumenten (HL7 CDA Release 2.0)
- **Basis:** ELGA CDA Implementierungsleitfäden
- **Entwicklung:** USECON, NETCONOMY, ELGA GmbH
- **Lizenz:** Unentgeltlich, nicht-exklusiv von ELGA GmbH

**Features:**
- ✅ XSLT-Transformation für HTML-Darstellung
- ✅ Unterstützung für Revision Marks (Einfügungen/Löschungen)
- ✅ Externes CSS-Support
- ✅ Print-Icon Visibility Control
- ✅ Document State (Deprecated/Nicht-Deprecated)
- ✅ Template-Erkennung für verschiedene CDA-Dokumenttypen

**Verwendung:**
- Verwendet in `elga-viewer.html` für Darstellung von CDA-Dokumenten
- XSLT-Transformation im Browser (XSLTProcessor)
- Unterstützung für verschiedene CDA-Templates

---

## ✅ 2. ELGA IMPLEMENTIERUNGSLEITFÄDEN

### 2.1 Allgemeiner Implementierungsleitfaden

**Referenz:** HL7 Implementation Guide for CDA® R2: Allgemeiner Implementierungsleitfaden für ELGA CDA Dokumente

**Status:** ✅ **ÜBERNOMMEN** (als Referenz in Demo-Dokument)

**Implementierung:**
- ✅ Template-IDs gemäß Leitfaden verwendet
- ✅ Dokumentenstruktur nach Kapitel 6.2
- ✅ Hoheitsbereich (`realmCode code="AT"`)
- ✅ Dokumentformat (`typeId`)
- ✅ ELGA Implementierungsleitfaden-Kennzeichnung

**Template-IDs verwendet:**
- `1.2.40.0.34.11.1` - Allgemeiner Implementierungsleitfaden "CDA Dokumente im österreichischen Gesundheitswesen"

### 2.2 Spezieller Leitfaden: Entlassungsbrief (Ärztlich)

**Version:** 2.06.2  
**Datum:** 04.03.2020  
**EIS-Stufe:** "Full Support"

**Status:** ✅ **ÜBERNOMMEN** (vollständiges Demo-Dokument vorhanden)

**Datei:** `frontend/public/ELGA-023-Entlassungsbrief_aerztlich_EIS-FullSupport.xml`

**Implementierte Template-IDs:**
- ✅ `1.2.40.0.34.11.2` - Spezieller Leitfaden "Entlassungsbrief (Ärztlich)"
- ✅ `1.2.40.0.34.11.2.0.3` - Entlassungsbrief (Ärztlich), EIS "Full Support"
- ✅ `1.2.40.0.34.11.1.2.1` - Brieftext-Sektion
- ✅ `1.2.40.0.34.11.1.3.2` - ELGA Logo-Entry
- ✅ `1.2.40.0.34.11.2.2.1` - Überweisungsgrund
- ✅ `1.2.40.0.34.11.2.2.3` - Entlassungsdiagnosen
- ✅ `1.2.40.0.34.11.2.3.1` - Diagnose-Entry
- ✅ `1.2.40.0.34.11.1.3.5` - Problem Entry
- ✅ `1.2.40.0.34.11.1.3.6` - Problem Observation
- ✅ `1.2.40.0.34.11.2.2.26` - Rehabilitationsziele
- ✅ `1.2.40.0.34.11.2.2.27` - Outcome Measurement
- ✅ `1.2.40.0.34.11.2.2.4` - Prozeduren
- ✅ `1.2.40.0.34.11.2.2.8` - Arzneimittel
- ✅ `1.2.40.0.34.11.8.1.3.1` - Medication Entry
- ✅ `1.2.40.0.34.11.2.3.4` - ELGA Arznei-Entry
- ✅ `1.2.40.0.34.11.2.2.9` - Therapieplan
- ✅ `1.2.40.0.34.11.2.2.10` - Termine/Kontrollen
- ✅ `1.2.40.0.34.11.2.2.11` - Wiederbestellung
- ✅ `1.2.40.0.34.11.2.2.12` - Klinischer Verlauf
- ✅ `1.2.40.0.34.11.1.2.2` - Abschließende Bemerkungen
- ✅ `1.2.40.0.34.11.2.2.13` - Befunde
- ✅ `1.2.40.0.34.11.2.2.14` - Befund-Abschnitte
- ✅ `1.2.40.0.34.11.2.2.15` - Ausstehende Befunde
- ✅ `1.2.40.0.34.11.2.2.16` - Auszüge aus erhobenen Befunden
- ✅ `1.2.40.0.34.11.2.2.23` - Operationsbericht

---

## ✅ 3. HL7-STANDARDS

### 3.1 HL7 CDA Release 2.0

**Status:** ✅ **ÜBERNOMMEN**

**Namespace:** `urn:hl7-org:v3`

**Verwendung:**
- ✅ Basis-Standard für alle CDA-Dokumente
- ✅ ClinicalDocument-Element verwendet
- ✅ XML-Struktur gemäß HL7 CDA R2

### 3.2 HL7 Vocabularies (Terminologien)

**Status:** ✅ **VERWENDET**

**Code-Systeme implementiert:**

#### 3.2.1 HL7:Confidentiality
- **Code-System:** `2.16.840.1.113883.5.25`
- **Verwendung:** Vertraulichkeitscode
- **Code:** `N` (normal)

#### 3.2.2 HL7:AdministrativeGender
- **Code-System:** `2.16.840.1.113883.5.1`
- **Verwendung:** Geschlecht
- **Codes:** `M` (Male), `F` (Female)

#### 3.2.3 HL7:MaritalStatus
- **Code-System:** `2.16.840.1.113883.5.2`
- **Verwendung:** Familienstand
- **Codes:** `M` (Married)

#### 3.2.4 HL7:LanguageAbilityMode
- **Code-System:** `2.16.840.1.113883.5.60`
- **Verwendung:** Sprachfähigkeits-Modus
- **Codes:** `ESP` (Expressed spoken)

#### 3.2.5 HL7:LanguageAbilityProficiency
- **Code-System:** `2.16.840.1.113883.5.61`
- **Verwendung:** Sprachfähigkeits-Niveau
- **Codes:** `E` (Excellent)

#### 3.2.6 HL7:ParticipationFunction
- **Code-System:** `2.16.840.1.113883.5.88`
- **Verwendung:** Teilnahme-Funktion
- **Codes:** `PCP` (primary care physician), `OA` (Oberarzt)

#### 3.2.7 HL7:RoleCode
- **Code-System:** `2.16.840.1.113883.5.111`
- **Verwendung:** Rollen-Codes
- **Codes:** `DAU` (natural daughter), `MTH` (Mother), `SELF` (self)

#### 3.2.8 HL7:ActCode
- **Code-System:** `2.16.840.1.113883.5.4`
- **Verwendung:** Aktivitäten-Codes
- **Codes:** `IMP` (inpatient encounter)

---

## ✅ 4. TERMINOLOGIEN

### 4.1 LOINC (Logical Observation Identifiers Names and Codes)

**Status:** ✅ **VERWENDET**

**Code-System:** `2.16.840.1.113883.6.1`  
**Code-System-Name:** `LOINC`

**Implementierte LOINC-Codes:**
- ✅ `11490-0` - "Physician Discharge summary" (Dokumententyp)
- ✅ `42349-1` - "Reason for Referral" (Überweisungsgrund)
- ✅ `11535-2` - "Hospital Discharge DX" (Entlassungsdiagnosen)
- ✅ `29554-3` - "Procedure Narrative" (Prozeduren)
- ✅ `10183-2` - "Hospital discharge medications" (Entlassungs-Medikamente)
- ✅ `18776-5` - "Treatment plan" (Therapieplan)
- ✅ `47420-5` - "Functional status assessment" (Funktionsstatus)
- ✅ `56447-6` - "Plan of care note" (Versorgungsplan)
- ✅ `8648-8` - "Hospital course" (Klinischer Verlauf)
- ✅ `48765-2` - "Allergies, adverse reactions, alerts" (Allergien)
- ✅ `51898-5` - (Warnungen/Allergien)
- ✅ `11493-4` - "Hospital discharge studies summary" (Befunde-Zusammenfassung)
- ✅ `8716-3` - "Vital signs" (Vitalwerte)
- ✅ `8867-4` - "Heart Beat" (Herzfrequenz)
- ✅ `8480-6` - "Intravascular Systolic" (Systolischer Blutdruck)
- ✅ `8462-4` - "Intravascular Diastolic" (Diastolischer Blutdruck)
- ✅ `10164-2` - "History of present illness" (Anamnese aktuell)
- ✅ `11348-0` - "History of past illness" (Anamnese vergangen)
- ✅ `67803-7` - "History of Procedures - Reported" (Anamnese Prozeduren)
- ✅ `42346-7` - "Medications on admission" (Medikamente bei Aufnahme)
- ✅ `18610-6` - "Medication administered" (Verabreichte Medikamente)

### 4.2 SNOMED CT

**Status:** ✅ **VERWENDET**

**Code-System:** `2.16.840.1.113883.6.96`  
**Code-System-Name:** `SNOMED CT`

**Implementierte SNOMED CT-Codes:**
- ✅ `282291009` - "Diagnosis" (Diagnose)
- ✅ `46680005` - "Vital signs" (Vitalwerte)

### 4.3 ICD-10 (International Classification of Diseases, 10th Revision)

**Status:** ✅ **VOLLSTÄNDIG IMPLEMENTIERT**

**Code-Systeme:**
- ✅ `1.2.40.0.34.5.171` - "ICD-10 BMG 2017" (Österreichische Version)
- ✅ Weitere Versionen unterstützt über `Icd10Catalog` Model

**Implementierung im System:**
- ✅ **Backend:** `backend/models/Icd10Catalog.js` - Vollständiges Schema
- ✅ **Backend:** `backend/models/PatientDiagnosis.js` - Diagnose-Modell mit ICD-10
- ✅ **Features:**
  - Vollständiger ICD-10 Katalog
  - Versionierung (releaseYear)
  - Österreichische Codes (BMG)
  - Hierarchische Struktur (parentCode)
  - Billability-Flag (isBillable)
  - Volltextsuche
  - Mehrere Releases (2017, 2025, etc.)
  - Import-Scripts vorhanden

**Verwendung in CDA-Dokumenten:**
- ✅ ICD-10 Codes in Diagnose-Entries
- ✅ Code-System-Name: "ICD-10 BMG 2017"
- ✅ Strukturierte Diagnose-Darstellung

### 4.4 ELGA-spezifische Terminologien

#### 4.4.1 ELGA_Fachaerzte
**Code-System:** `1.2.40.0.34.5.160`  
**Status:** ✅ **VERWENDET**

**Codes:**
- ✅ `107` - "Fachärztin/Facharzt für Chirurgie"
- ✅ `130` - "Facharzt für Neurologie"

#### 4.4.2 ELGA_Sections
**Code-System:** `1.2.40.0.34.5.40`  
**Status:** ✅ **VERWENDET**

**Codes:**
- ✅ `BRIEFT` - "Brieftext"
- ✅ `REHAZIELE` - "Rehabilitationsziele"
- ✅ `TERMIN` - "Termine, Kontrollen, Wiederbestellung"
- ✅ `ABBEM` - "Abschließende Bemerkungen"
- ✅ `BEFAUS` - "Ausstehende Befunde"
- ✅ `BEFERH` - "Auszüge aus erhobenen Befunden"
- ✅ `OPBER` - "Operationsbericht"

#### 4.4.3 ELGA_ServiceEventsEntlassbrief
**Code-System:** `1.2.40.0.34.5.21`  
**Status:** ✅ **VERWENDET**

**Codes:**
- ✅ `GDLSTATAUF` - "Gesundheitsdienstleistung im Rahmen eines stationären Aufenthalts"

#### 4.4.4 HL7.AT:ReligionAustria
**Code-System:** `2.16.840.1.113883.2.16.1.4.1`  
**Status:** ✅ **VERWENDET**

**Codes:**
- ✅ `101` - "Römisch-Katholisch"

---

## ✅ 5. IHE-STANDARDS

### 5.1 IHE PCC (Patient Care Coordination)

**Status:** ✅ **VERWENDET**

**Template-IDs verwendet:**
- ✅ `1.3.6.1.4.1.19376.1.5.3.1.3.1` - Reason for Referral
- ✅ `1.3.6.1.4.1.19376.1.5.3.1.3.7` - Hospital Discharge DX
- ✅ `1.3.6.1.4.1.19376.1.5.3.1.4.5.1` - Problem Entry
- ✅ `1.3.6.1.4.1.19376.1.5.3.1.4.5.2` - Problem Observation
- ✅ `1.3.6.1.4.1.19376.1.5.3.1.4.5` - Problem Section

### 5.2 HL7 CCD (Continuity of Care Document)

**Status:** ✅ **VERWENDET**

**Template-IDs verwendet:**
- ✅ `2.16.840.1.113883.10.20.1.27` - Problem Entry
- ✅ `2.16.840.1.113883.10.20.1.28` - Problem Observation
- ✅ `2.16.840.1.113883.10.20.1.24` - Medication Entry
- ✅ `2.16.840.1.113883.10.20.1.10` - Treatment Plan
- ✅ `2.16.840.1.113883.10.20.1.5` - Plan of Care

---

## ✅ 6. DOKUMENTEN-STRUKTUR (CDA)

### 6.1 CDA Header-Elemente

**Status:** ✅ **IMPLEMENTIERT** (in Demo-Dokument)

**Implementierte Elemente:**
- ✅ `realmCode code="AT"` - Hoheitsbereich Österreich
- ✅ `typeId` - Dokumentformat (POCD_HD000040)
- ✅ `templateId` - Template-Kennzeichnungen
- ✅ `id` - Dokumenten-Id
- ✅ `code` - Dokumentenklasse (LOINC)
- ✅ `title` - Dokumenttitel
- ✅ `effectiveTime` - Erstellungsdatum
- ✅ `confidentialityCode` - Vertraulichkeitscode
- ✅ `languageCode` - Sprachcode (de-AT)
- ✅ `versionNumber` - Versionsnummer
- ✅ `setId` - Dokumenten-Set-ID

### 6.2 CDA Body-Struktur

**Status:** ✅ **IMPLEMENTIERT** (in Demo-Dokument)

**Sektionen implementiert:**
- ✅ Brieftext
- ✅ Überweisungsgrund
- ✅ Entlassungsdiagnosen
- ✅ Rehabilitationsziele
- ✅ Outcome Measurement
- ✅ Prozeduren
- ✅ Arzneimittel (Medikamente)
- ✅ Therapieplan
- ✅ Termine/Kontrollen
- ✅ Klinischer Verlauf
- ✅ Abschließende Bemerkungen
- ✅ Befunde (ausstehend/erhoben)
- ✅ Operationsbericht
- ✅ Vitalwerte
- ✅ Anamnese (aktuell/vergangen)
- ✅ Allergien/Warnungen

---

## ✅ 7. ELGA INTEROPERABILITÄTSSTUFE (EIS)

### 7.1 EIS "Full Support"

**Status:** ✅ **ÜBERNOMMEN**

**Implementierung:**
- ✅ Template-ID: `1.2.40.0.34.11.2.0.3`
- ✅ Maximale Optionen im Demo-Dokument dargestellt
- ✅ Alle erforderlichen Elemente vorhanden
- ✅ Alle optionalen Elemente demonstriert

---

## ✅ 8. SYSTEM-INTEGRATION

### 8.1 ELGA-Daten im Document-Model

**Status:** ✅ **IMPLEMENTIERT**

**Backend:** `backend/models/Document.js`

```javascript
elgaData: {
  isElgaCompatible: { type: Boolean, default: false },
  elgaId: { type: String },
  submissionDate: { type: Date },
  status: { 
    type: String, 
    enum: ['pending', 'submitted', 'approved', 'rejected'] 
  }
}
```

### 8.2 ELGA-Route

**Status:** ✅ **VORHANDEN** (Placeholder)

**Datei:** `backend/routes/elga.js`

- ✅ Route-Endpunkt vorhanden
- ⚠️ Noch nicht vollständig implementiert (Coming soon)

### 8.3 ELGA-Frontend-Seite

**Status:** ✅ **VORHANDEN**

**Datei:** `frontend/src/pages/ELGA.tsx`

- ✅ Grundlegende UI vorhanden
- ✅ Platzhalter für ELGA-Services

### 8.4 ELGA-Viewer HTML

**Status:** ✅ **VOLLSTÄNDIG IMPLEMENTIERT**

**Dateien:**
- ✅ `frontend/public/elga-viewer.html` - CDA-Viewer mit XSLT
- ✅ `frontend/public/elga-xml-viewer.html` - XML-Viewer
- ✅ Funktionale XSLT-Transformation im Browser
- ✅ Unterstützung für ELGA Stylesheet

---

## ✅ 9. CODE-SYSTEME UND OIDs

### 9.1 ELGA OID-Basis

**Basis-OID:** `1.2.40.0.34`  
**Status:** ✅ **VERWENDET**

**Verwendete OIDs:**
- ✅ `1.2.40.0.34.11.1` - Allgemeiner CDA-Leitfaden
- ✅ `1.2.40.0.34.11.2` - Entlassungsbrief (Ärztlich)
- ✅ `1.2.40.0.34.11.2.0.3` - Entlassungsbrief EIS Full Support
- ✅ `1.2.40.0.34.5.160` - ELGA_Fachaerzte
- ✅ `1.2.40.0.34.5.40` - ELGA_Sections
- ✅ `1.2.40.0.34.5.21` - ELGA_ServiceEventsEntlassbrief
- ✅ `1.2.40.0.34.5.171` - ICD-10 BMG 2017

### 9.2 HL7 OIDs

**Status:** ✅ **VERWENDET**

**Verwendete OIDs:**
- ✅ `2.16.840.1.113883.1.3` - HL7 Base
- ✅ `2.16.840.1.113883.5.1` - HL7:AdministrativeGender
- ✅ `2.16.840.1.113883.5.2` - HL7:MaritalStatus
- ✅ `2.16.840.1.113883.5.25` - HL7:Confidentiality
- ✅ `2.16.840.1.113883.5.4` - HL7:ActCode
- ✅ `2.16.840.1.113883.5.60` - HL7:LanguageAbilityMode
- ✅ `2.16.840.1.113883.5.61` - HL7:LanguageAbilityProficiency
- ✅ `2.16.840.1.113883.5.88` - HL7:ParticipationFunction
- ✅ `2.16.840.1.113883.5.111` - HL7:RoleCode
- ✅ `2.16.840.1.113883.6.1` - LOINC
- ✅ `2.16.840.1.113883.6.96` - SNOMED CT
- ✅ `2.16.840.1.113883.10.20.1.*` - HL7 CCD Templates
- ✅ `2.16.840.1.113883.2.16.1.4.1` - HL7.AT:ReligionAustria

---

## ✅ 10. STYLING UND DARSTELLUNG

### 10.1 ELGA Stylesheet-Stile

**Status:** ✅ **IMPLEMENTIERT** (im Stylesheet)

**ELGA-spezifische Style-Codes:**
- ✅ `xELGA_colw:*` - Spaltenbreiten in Prozent
- ✅ `xELGA_h1`, `xELGA_h2`, `xELGA_h3` - Überschriften
- ✅ Revision Marks für Änderungen

### 10.2 CSS-Klassen

**Status:** ✅ **DEFINIERT** (im Stylesheet)

**Verschiedene CSS-Klassen für:**
- Dokumenten-Struktur
- Tabellen-Formatierung
- Listen-Formatierung
- Medizinische Entries
- Logo-Darstellung
- Print-Optimierung

---

## ✅ 11. DOKUMENTEN-VERARBEITUNG

### 11.1 XML-Verarbeitung

**Status:** ✅ **IMPLEMENTIERT**

**Features:**
- ✅ XML-Parsing im Browser
- ✅ XSLT-Transformation (XSLTProcessor)
- ✅ Error-Handling
- ✅ CDATA-Section Support

### 11.2 Demo-Dokumente

**Status:** ✅ **VORHANDEN**

**Dateien:**
- ✅ `ELGA-023-Entlassungsbrief_aerztlich_EIS-FullSupport.xml` - Vollständiges Demo-Dokument
- ✅ Alle Templates und Sektionen demonstriert
- ✅ Alle Terminologien verwendet

---

## ✅ 12. ZUSAMMENFASSUNG

### 12.1 Vollständig implementiert:

1. ✅ **ELGA Referenz-Stylesheet v1.0** - Vollständig vorhanden
2. ✅ **CDA-Struktur** - Vollständig im Demo-Dokument
3. ✅ **ELGA Template-IDs** - Alle relevanten IDs verwendet
4. ✅ **LOINC-Codes** - Umfangreiche Verwendung
5. ✅ **SNOMED CT** - Basis-Codes verwendet
6. ✅ **ICD-10** - Vollständig implementiert im System
7. ✅ **HL7-Vokabulare** - Alle relevanten Code-Systeme
8. ✅ **ELGA-Terminologien** - Fachärzte, Sections, ServiceEvents
9. ✅ **IHE PCC Templates** - Verwendet
10. ✅ **HL7 CCD Templates** - Verwendet
11. ✅ **Viewer-Implementierung** - Funktional

### 12.2 Teilweise implementiert:

1. ⚠️ **ELGA-API** - Route vorhanden, aber noch nicht vollständig
2. ⚠️ **ELGA-Integration** - Datenmodell vorhanden, Logik noch ausstehend

### 12.3 Referenz-Dokumente:

- ✅ Vollständiges Demo-Dokument nach EIS "Full Support"
- ✅ Alle Implementierungsleitfäden referenziert
- ✅ Template-Struktur vollständig

---

## 📋 13. DATEI-ÜBERSICHT

### 13.1 ELGA-relevante Dateien:

**Stylesheets:**
- ✅ `frontend/public/ELGA_Stylesheet_v1.0.xsl` (2.760 Zeilen)

**Demo-Dokumente:**
- ✅ `frontend/public/ELGA-023-Entlassungsbrief_aerztlich_EIS-FullSupport.xml` (11.700+ Zeilen)

**Viewer:**
- ✅ `frontend/public/elga-viewer.html`
- ✅ `frontend/public/elga-xml-viewer.html`

**Backend:**
- ✅ `backend/models/Document.js` (ELGA-Felder)
- ✅ `backend/models/Icd10Catalog.js` (ICD-10)
- ✅ `backend/models/PatientDiagnosis.js` (Diagnosen mit ICD-10)
- ✅ `backend/routes/elga.js` (Placeholder)

**Frontend:**
- ✅ `frontend/src/pages/ELGA.tsx` (UI-Placeholder)

---

**Stand: Diese Analyse basiert auf dem aktuellen Code-Zustand und zeigt alle implementierten/übernommenen ELGA-Standards, Terminologien und Stylesheets.**





