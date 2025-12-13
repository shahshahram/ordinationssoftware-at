# DICOM & Radiologie-Befund Schnittstelle Testen

Diese Anleitung erklärt, wie Sie die externen DICOM- und Radiologie-Befund-Schnittstellen testen können.

## Übersicht

Das System bietet zwei Webhook-Endpunkte für externe Institute:

1. **DICOM-Bilder**: `POST /api/dicom/receive`
2. **Radiologie-Befunde**: `POST /api/radiology-reports/receive`

## Voraussetzungen

### 1. DICOM-Provider erstellen

Bevor Sie testen können, müssen Sie einen DICOM-Provider in der Admin-UI erstellen:

1. Gehen Sie zu **Einstellungen → DICOM Provider**
2. Klicken Sie auf **"Neuer Provider"**
3. Füllen Sie die Felder aus:
   - **Name**: z.B. "Radiologie Wien Test"
   - **Code**: z.B. "RADIOLOGIE_WIEN_TEST" (wird automatisch großgeschrieben)
   - **Protokoll**: REST
   - **API-Key**: Wird automatisch generiert (kann später neu generiert werden)
   - **IP-Whitelist**: Optional - lassen Sie leer für Tests
   - **Patienten-Matching**: z.B. "name-dob"
4. Speichern Sie den Provider
5. **Wichtig**: Notieren Sie sich den **Code** und **API-Key**

### 2. Test-DICOM-Dateien beschaffen

Sie benötigen echte DICOM-Dateien zum Testen. Optionen:

#### Option A: Öffentliche Test-Daten
- **DICOM Library**: https://www.dicomlibrary.com/dicom/
- **Osirix DICOM Sample Images**: https://www.osirix-viewer.com/resources/dicom-image-library/
- **DICOM Test Files**: https://github.com/OHIF/Viewers/tree/master/public/dicomweb

#### Option B: Eigene DICOM-Dateien
- Exportieren Sie DICOM-Dateien aus einem PACS-System
- Verwenden Sie DICOM-Viewer wie Osirix, Horos, oder RadiAnt

#### Option C: Minimal DICOM-Datei erstellen
Für einfache Tests können Sie eine minimale DICOM-Datei mit Python erstellen:

```python
from pydicom import Dataset, FileDataset
from pydicom.uid import generate_uid
import datetime

# Erstelle minimales DICOM-Dataset
ds = FileDataset("test", {}, file_meta={}, preamble=b"\x00" * 128)
ds.is_little_endian = True
ds.is_implicit_VR = False

# Erforderliche Tags
ds.PatientName = "TEST^PATIENT"
ds.PatientID = "TEST123"
ds.PatientBirthDate = "19800101"
ds.PatientSex = "M"
ds.StudyInstanceUID = generate_uid()
ds.SeriesInstanceUID = generate_uid()
ds.SOPInstanceUID = generate_uid()
ds.Modality = "CT"
ds.StudyDate = datetime.date.today().strftime("%Y%m%d")
ds.StudyTime = datetime.datetime.now().strftime("%H%M%S")

# Speichere als DICOM
ds.save_as("test.dcm", write_like_original=False)
```

## Test-Skripte verwenden

### DICOM-Upload testen

```bash
# Einfacher Test
node backend/scripts/test-dicom-upload.js test.dcm RADIOLOGIE_WIEN_TEST <API-KEY>

# Mit Patient-ID
node backend/scripts/test-dicom-upload.js test.dcm RADIOLOGIE_WIEN_TEST <API-KEY> 507f1f77bcf86cd799439011

# Mit Patient-Matching-Strategie
node backend/scripts/test-dicom-upload.js test.dcm RADIOLOGIE_WIEN_TEST <API-KEY> null name-dob
```

### Radiologie-Befund testen

```bash
# PDF-Befund
node backend/scripts/test-radiology-report-upload.js report.pdf RADIOLOGIE_WIEN_TEST <API-KEY> pdf

# JSON-Befund
node backend/scripts/test-radiology-report-upload.js report.json RADIOLOGIE_WIEN_TEST <API-KEY> json

# Mit Patient-ID
node backend/scripts/test-radiology-report-upload.js report.pdf RADIOLOGIE_WIEN_TEST <API-KEY> pdf 507f1f77bcf86cd799439011
```

## Manueller Test mit cURL

### DICOM-Upload

```bash
curl -X POST http://localhost:5001/api/dicom/receive \
  -F "dicomFile=@test.dcm" \
  -F "providerCode=RADIOLOGIE_WIEN_TEST" \
  -F "apiKey=<API-KEY>" \
  -F "patientMatching=name-dob"
```

### Radiologie-Befund

```bash
curl -X POST http://localhost:5001/api/radiology-reports/receive \
  -F "file=@report.pdf" \
  -F "providerCode=RADIOLOGIE_WIEN_TEST" \
  -F "apiKey=<API-KEY>" \
  -F "format=pdf" \
  -F "patientMatching=name-dob"
```

## Test mit Postman

### DICOM-Upload

1. **Methode**: POST
2. **URL**: `http://localhost:5001/api/dicom/receive`
3. **Body**: `form-data`
4. **Felder**:
   - `dicomFile`: File (wählen Sie Ihre DICOM-Datei)
   - `providerCode`: `RADIOLOGIE_WIEN_TEST`
   - `apiKey`: `<IHR-API-KEY>`
   - `patientMatching`: `name-dob` (optional)

### Radiologie-Befund

1. **Methode**: POST
2. **URL**: `http://localhost:5001/api/radiology-reports/receive`
3. **Body**: `form-data`
4. **Felder**:
   - `file`: File (wählen Sie Ihre Befund-Datei)
   - `providerCode`: `RADIOLOGIE_WIEN_TEST`
   - `apiKey`: `<IHR-API-KEY>`
   - `format`: `pdf` (oder `fhir`, `hl7-cda`, `dicom-sr`, `text`, `json`)
   - `patientMatching`: `name-dob` (optional)

## Erwartete Antworten

### Erfolgreicher DICOM-Upload

```json
{
  "success": true,
  "message": "DICOM-Datei erfolgreich empfangen",
  "data": {
    "studyId": "507f1f77bcf86cd799439011",
    "studyInstanceUID": "1.2.840.113619.2.55.3.1234567890",
    "patientName": "TEST^PATIENT"
  }
}
```

### Erfolgreicher Befund-Upload

```json
{
  "success": true,
  "message": "Radiologie-Befund erfolgreich empfangen",
  "data": {
    "documentId": "507f1f77bcf86cd799439012",
    "patientId": "507f1f77bcf86cd799439011",
    "format": "pdf"
  }
}
```

## Fehlerbehandlung

### Häufige Fehler

1. **"DICOM-Provider nicht gefunden oder inaktiv"**
   - Prüfen Sie den Provider-Code (Groß-/Kleinschreibung wird ignoriert)
   - Stellen Sie sicher, dass der Provider aktiv ist

2. **"Ungültiger API-Key"**
   - Prüfen Sie den API-Key im Provider-Management
   - Generieren Sie einen neuen API-Key falls nötig

3. **"Zugriff von dieser IP-Adresse nicht erlaubt"**
   - Entfernen Sie die IP-Whitelist oder fügen Sie Ihre IP hinzu
   - Für Tests: IP-Whitelist leer lassen

4. **"Patient nicht gefunden"**
   - Stellen Sie sicher, dass der Patient in der Datenbank existiert
   - Prüfen Sie die Patient-Matching-Strategie
   - Verwenden Sie `patientId` direkt, wenn bekannt

5. **"Ungültige DICOM-Datei"**
   - Stellen Sie sicher, dass es sich um eine echte DICOM-Datei handelt
   - Prüfen Sie, ob die Datei beschädigt ist

## Test-Szenarien

### Szenario 1: DICOM-Bild ohne Patient-ID (Auto-Matching)

```bash
node backend/scripts/test-dicom-upload.js test.dcm RADIOLOGIE_WIEN_TEST <API-KEY>
```

Das System versucht, den Patienten anhand der DICOM-Tags (Name + Geburtsdatum) zu finden.

### Szenario 2: DICOM-Bild mit direkter Patient-ID

```bash
node backend/scripts/test-dicom-upload.js test.dcm RADIOLOGIE_WIEN_TEST <API-KEY> 507f1f77bcf86cd799439011
```

Das System verwendet die angegebene Patient-ID direkt.

### Szenario 3: PDF-Befund

```bash
node backend/scripts/test-radiology-report-upload.js report.pdf RADIOLOGIE_WIEN_TEST <API-KEY> pdf
```

Das System parst den PDF-Befund und erstellt ein Dokument.

### Szenario 4: JSON-Befund (Strukturiert)

```bash
node backend/scripts/test-radiology-report-upload.js report.json RADIOLOGIE_WIEN_TEST <API-KEY> json
```

Das System verarbeitet den strukturierten JSON-Befund.

## Debugging

### Backend-Logs prüfen

```bash
# Backend-Logs in Echtzeit
tail -f backend/logs/*.log

# Oder direkt in der Konsole, wenn Backend im Vordergrund läuft
```

### Audit-Logs prüfen

Alle externen Uploads werden im Audit-Log gespeichert. Prüfen Sie die Datenbank:

```javascript
// In MongoDB
db.auditlogs.find({ action: /dicom|radiology/ }).sort({ createdAt: -1 }).limit(10)
```

## Nächste Schritte

Nach erfolgreichen Tests können Sie:

1. **IP-Whitelist konfigurieren** für Produktionsumgebung
2. **Benachrichtigungen aktivieren** für neue Uploads
3. **Statistiken überwachen** im Provider-Management
4. **Integration mit externen Systemen** einrichten

## Support

Bei Problemen:
1. Prüfen Sie die Backend-Logs
2. Prüfen Sie die Audit-Logs
3. Stellen Sie sicher, dass alle Abhängigkeiten installiert sind (`npm install` im Backend)
4. Prüfen Sie, ob der Backend-Server läuft















