# Dekurs → ELGA Workflow

## Übersicht

Dieses Dokument beschreibt den vollständigen Workflow, um einen Dekurs-Eintrag an ELGA (Elektronische Gesundheitsakte) zu senden.

## Voraussetzungen

### System-Voraussetzungen
- ✅ Backend-Server läuft
- ✅ ELGA-Service ist konfiguriert (`backend/config/elga.config.js`)
- ✅ ELGA-Authentifizierung funktioniert
- ✅ Patient ist in ELGA registriert (`patient.ecard.elgaId` vorhanden)

### Daten-Voraussetzungen
- ✅ Dekurs-Eintrag existiert
- ✅ Dekurs-Eintrag hat Status `finalized` (finalisiert)
- ✅ Patient hat ELGA-ID (`patient.ecard.elgaId`)

## Workflow-Schritte

### 1. **Benutzer: Dekurs-Eintrag erstellen/bearbeiten**

**Was der Benutzer macht:**
- Öffnet den Patienten im `PatientOrganizer`
- Navigiert zum Tab "Dekurs"
- Erstellt einen neuen Dekurs-Eintrag oder bearbeitet einen bestehenden
- Füllt alle relevanten Felder aus:
  - Besuchsgrund
  - Klinische Beobachtungen
  - Befunde
  - Diagnosen (verknüpft)
  - Medikamente (verknüpft)
  - Behandlungsdetails
  - Notizen
  - etc.

**Was das System macht:**
- Speichert den Eintrag mit Status `draft` (Entwurf)
- Ermöglicht Bearbeitung und Änderungen

---

### 2. **Benutzer: Dekurs-Eintrag finalisieren**

**Was der Benutzer macht:**
- Klickt auf "Finalisieren" oder "Speichern & Finalisieren" im Dekurs-Dialog
- Bestätigt die Finalisierung (falls Bestätigungsdialog vorhanden)

**Was das System macht:**
- Setzt Status auf `finalized`
- Setzt `finalizedAt` auf aktuelles Datum
- Setzt `finalizedBy` auf aktuellen Benutzer
- **WICHTIG:** Nach der Finalisierung kann der Eintrag **nicht mehr bearbeitet** werden
- Der Eintrag ist jetzt bereit für den Export/Übermittlung

---

### 3. **Benutzer: Dekurs-Eintrag an ELGA senden**

**Was der Benutzer macht:**
- Öffnet die Dekurs-Historie (Liste aller Einträge)
- Findet den finalisierten Eintrag
- Klickt auf "An ELGA senden" Button (nur bei finalisierten Einträgen sichtbar)
- Bestätigt die Übermittlung (falls Bestätigungsdialog vorhanden)

**Was das System automatisch macht:**

#### Schritt 3.1: Validierung
- ✅ Prüft, ob Eintrag Status `finalized` hat
- ✅ Prüft, ob Patient ELGA-registriert ist (`patient.ecard.elgaId`)
- ✅ Lädt alle benötigten Daten (Patient, Location, Autor)

#### Schritt 3.2: CDA-Generierung
- ✅ Konvertiert Dekurs-Eintrag in CDA-XML Format:
  - Extrahiert Patientendaten (Name, Geburtsdatum, SVNR)
  - Extrahiert Autor-Informationen (Name, Rolle)
  - Extrahiert Location-Informationen
  - Strukturiert alle Dekurs-Felder in CDA-Sections:
    - Besuchsgrund (Chief Complaint)
    - Klinische Beobachtungen (History of Present Illness)
    - Befunde (Physical Examination)
    - Primärdiagnosen (mit ICD-10 Codes)
    - Sekundärdiagnosen (mit ICD-10 Codes)
    - Medikamente (mit Dosierung, Häufigkeit, Route)
    - Behandlungsdetails (Plan of Care)
    - Verlaufskontrollen
    - Notizen
  - Generiert gültige HL7 UIDs für Dokument, Autor, Custodian
  - Formatiert Timestamps im HL7 TS Format
  - Escaped XML-Sonderzeichen

#### Schritt 3.3: ELGA-Authentifizierung
- ✅ Authentifiziert sich bei ELGA-Service
- ✅ Erhält Bearer Token für API-Zugriff

#### Schritt 3.4: ELGA-Upload
- ✅ Sendet CDA-XML an ELGA-API:
  - Endpoint: `POST /v1/patient/{elgaId}/documents`
  - Titel: "Dekurs - {Patientenname} - {Datum}"
  - ClassCode: `CDA`
  - TypeCode: `11534-6` (Progress Note, LOINC)
  - FormatCode: `urn:oid:1.2.40.0.34.10.61` (ELGA Formatcode)
  - Content: CDA-XML String
  - Author: Benutzer-Informationen

#### Schritt 3.5: Erfolgsbehandlung
- ✅ Speichert ELGA-Referenz im Dekurs-Eintrag:
  - `elgaSubmission.submittedAt`: Übermittlungsdatum
  - `elgaSubmission.submittedBy`: Benutzer-ID
  - `elgaSubmission.elgaDocumentId`: ELGA-Dokument-ID
  - `elgaSubmission.status`: `submitted`
- ✅ Zeigt Erfolgsmeldung an
- ✅ Aktualisiert UI (z.B. zeigt "✓ An ELGA gesendet" Badge)

#### Schritt 3.6: Fehlerbehandlung
- ✅ Bei Fehler:
  - Speichert Fehlerstatus: `elgaSubmission.status = 'failed'`
  - Speichert Fehlermeldung: `elgaSubmission.errorMessage`
  - Zeigt Fehlermeldung an
  - Ermöglicht erneuten Versuch

---

## API-Endpunkt

### POST `/api/dekurs/:id/send-to-elga`

**Request:**
```http
POST /api/dekurs/507f1f77bcf86cd799439011/send-to-elga
Authorization: Bearer {token}
```

**Response (Erfolg):**
```json
{
  "success": true,
  "message": "Dekurs-Eintrag erfolgreich an ELGA gesendet",
  "data": {
    "elgaDocumentId": "elga-doc-12345",
    "submissionDate": "2025-01-15T10:30:00.000Z"
  }
}
```

**Response (Fehler - Nicht finalisiert):**
```json
{
  "success": false,
  "message": "Nur finalisierte Dekurs-Einträge können an ELGA gesendet werden"
}
```

**Response (Fehler - Patient nicht ELGA-registriert):**
```json
{
  "success": false,
  "message": "Patient ist nicht in ELGA registriert"
}
```

---

## Frontend-Implementierung

### Button "An ELGA senden"

Der Button sollte:
- ✅ Nur bei finalisierten Einträgen (`status === 'finalized'`) sichtbar sein
- ✅ Deaktiviert sein, wenn bereits gesendet (`elgaSubmission.status === 'submitted'`)
- ✅ Badge/Icon zeigen, wenn bereits gesendet ("✓ An ELGA gesendet")
- ✅ Bestätigungsdialog anzeigen vor dem Senden
- ✅ Loading-State während der Übermittlung
- ✅ Erfolgs-/Fehlermeldung anzeigen

### Beispiel-Implementierung

```typescript
const handleSendToElga = async (entryId: string) => {
  try {
    setLoading(true);
    const response = await api.post(`/dekurs/${entryId}/send-to-elga`);
    if (response.success) {
      showSnackbar('Dekurs-Eintrag erfolgreich an ELGA gesendet', 'success');
      // Aktualisiere Eintrag in der Liste
      loadEntries();
    }
  } catch (error: any) {
    showSnackbar(
      error.response?.data?.message || 'Fehler beim Senden an ELGA',
      'error'
    );
  } finally {
    setLoading(false);
  }
};
```

---

## Datenfluss-Diagramm

```
[Benutzer] 
    ↓
[1. Dekurs erstellen/bearbeiten]
    ↓
[2. Finalisieren] → Status: "finalized"
    ↓
[3. "An ELGA senden" klicken]
    ↓
[System: Validierung]
    ├─ Status = "finalized"? ✅
    ├─ Patient ELGA-registriert? ✅
    └─ Alle Daten vorhanden? ✅
    ↓
[System: CDA-Generierung]
    ├─ Extrahiere Patientendaten
    ├─ Extrahiere Diagnosen (ICD-10)
    ├─ Extrahiere Medikamente
    ├─ Strukturiere in CDA-Sections
    └─ Generiere CDA-XML
    ↓
[System: ELGA-Authentifizierung]
    └─ Erhalte Bearer Token
    ↓
[System: ELGA-Upload]
    ├─ POST /v1/patient/{elgaId}/documents
    ├─ Sende CDA-XML
    └─ Erhalte ELGA-Dokument-ID
    ↓
[System: Speichere Referenz]
    ├─ elgaSubmission.submittedAt
    ├─ elgaSubmission.elgaDocumentId
    └─ elgaSubmission.status = "submitted"
    ↓
[Benutzer: Erfolgsmeldung]
```

---

## Häufige Fehler und Lösungen

### Fehler: "Nur finalisierte Dekurs-Einträge können an ELGA gesendet werden"
**Lösung:** Eintrag muss zuerst finalisiert werden (Status: `finalized`)

### Fehler: "Patient ist nicht in ELGA registriert"
**Lösung:** 
- Patient muss eine e-card haben
- Patient muss in ELGA registriert sein
- `patient.ecard.elgaId` muss vorhanden sein

### Fehler: "Keine Location gefunden"
**Lösung:** 
- Benutzer muss einer Location zugeordnet sein, ODER
- Patient muss einer Location zugeordnet sein, ODER
- Mindestens eine Location muss im System existieren

### Fehler: "ELGA-Authentifizierung fehlgeschlagen"
**Lösung:** 
- ELGA-Konfiguration prüfen (`backend/config/elga.config.js`)
- ELGA-Service-Status prüfen
- Netzwerkverbindung prüfen

---

## Technische Details

### CDA-Struktur

Das generierte CDA-Dokument folgt dem HL7 CDA Release 2.0 Standard:

- **Root Element:** `<ClinicalDocument>`
- **Namespace:** `urn:hl7-org:v3`
- **Realm Code:** `AT` (Österreich)
- **Template IDs:** ELGA-konforme Template-IDs
- **Sections:** LOINC-codierte Sections für verschiedene Inhalte

### ELGA-Codes

- **ClassCode:** `CDA` (Clinical Document Architecture)
- **TypeCode:** `11534-6` (Progress Note, LOINC)
- **FormatCode:** `urn:oid:1.2.40.0.34.10.61` (ELGA Formatcode)
- **Diagnose-Codesystem:** `2.16.840.1.113883.6.90` (ICD-10)

---

## Zusammenfassung

**Benutzer muss:**
1. Dekurs-Eintrag erstellen/bearbeiten
2. Dekurs-Eintrag finalisieren
3. "An ELGA senden" klicken

**System macht automatisch:**
1. Validierung
2. CDA-Generierung
3. ELGA-Authentifizierung
4. ELGA-Upload
5. Referenz speichern
6. Erfolgs-/Fehlermeldung anzeigen

Der gesamte Prozess ist **automatisiert** - der Benutzer muss nur die drei Schritte ausführen, alles andere übernimmt das System.

