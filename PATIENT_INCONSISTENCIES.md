# Patient Model Inkonsistenzen - Analyse

## Übersicht
Das System verwendet zwei verschiedene Patient-Models:
- **`Patient`** (Collection: `patients`) - 7 Patienten
- **`PatientExtended`** (Collection: `patientextendeds`) - 41 Patienten

**Standard für Produktivsystem:** `PatientExtended`

---

## Models, die noch `Patient` verwenden (sollten auf `PatientExtended` umgestellt werden)

### 1. **WaitingList** (`backend/models/WaitingList.js`)
- Zeile 7: `ref: 'Patient'`
- **Betroffen:** Warteliste-Funktionalität
- **Risiko:** Wartelisten-Einträge können nicht mit `PatientExtended` verknüpft werden

### 2. **PatientDiagnosis** (`backend/models/PatientDiagnosis.js`)
- Zeile 8: `ref: 'Patient'`
- **Betroffen:** Diagnosen-Verwaltung
- **Risiko:** Diagnosen können nicht mit `PatientExtended` verknüpft werden

### 3. **PatientDataHistory** (`backend/models/PatientDataHistory.js`)
- Zeile 7: `ref: 'Patient'`
- **Betroffen:** Patienten-Daten-Historie
- **Risiko:** Historie kann nicht mit `PatientExtended` verknüpft werden

### 4. **Contact** (`backend/models/Contact.js`)
- Zeile 15: `ref: 'Patient'`
- **Betroffen:** Kontakt-Verwaltung
- **Risiko:** Kontakte können nicht mit `PatientExtended` verknüpft werden

### 5. **VitalSigns** (`backend/models/VitalSigns.js`)
- Zeile 7: `ref: 'Patient'`
- **Betroffen:** Vitalzeichen-Verwaltung
- **Risiko:** Vitalzeichen können nicht mit `PatientExtended` verknüpft werden

### 6. **LaborResult** (`backend/models/LaborResult.js`)
- Zeile 7: `ref: 'Patient'`
- **Betroffen:** Labor-Ergebnisse
- **Risiko:** Labor-Ergebnisse können nicht mit `PatientExtended` verknüpft werden

### 7. **MedicalDataHistory** (`backend/models/MedicalDataHistory.js`)
- Zeile 7: `ref: 'Patient'`
- **Betroffen:** Medizinische Daten-Historie
- **Risiko:** Historie kann nicht mit `PatientExtended` verknüpft werden

### 8. **Invoice** (`backend/models/Invoice.js`)
- Zeile 26: `ref: 'Patient'`
- **Betroffen:** Rechnungen
- **Risiko:** Rechnungen können nicht mit `PatientExtended` verknüpft werden

### 9. **BillingJob** (`backend/models/BillingJob.js`)
- Zeile 19: `ref: 'Patient'`
- **Betroffen:** Abrechnungs-Jobs
- **Risiko:** Abrechnungs-Jobs können nicht mit `PatientExtended` verknüpft werden

### 10. **ServiceBooking** (`backend/models/ServiceBooking.js`)
- Zeile 13: `ref: 'Patient'`
- **Betroffen:** Service-Buchungen
- **Risiko:** Buchungen können nicht mit `PatientExtended` verknüpft werden

### 11. **OnlineBooking** (`backend/models/OnlineBooking.js`)
- Zeile 14: `ref: 'Patient'`
- **Betroffen:** Online-Buchungen
- **Risiko:** Online-Buchungen können nicht mit `PatientExtended` verknüpft werden

---

## Routen, die noch `Patient` verwenden (sollten auf `PatientExtended` umgestellt werden)

### 1. **labor.js** (`backend/routes/labor.js`)
- Verwendet `Patient` für Labor-Ergebnisse
- **Betroffen:** `/api/labor/*` Routen

### 2. **dicom.js** (`backend/routes/dicom.js`)
- Verwendet `Patient` für DICOM-Studien
- **Betroffen:** `/api/dicom/*` Routen

### 3. **waitingList.js** (`backend/routes/waitingList.js`)
- Verwendet `Patient` für Warteliste
- **Betroffen:** `/api/waiting-list/*` Routen

### 4. **patientDataHistory.js** (`backend/routes/patientDataHistory.js`)
- Verwendet `Patient` für Patienten-Daten-Historie
- **Betroffen:** `/api/patient-data-history/*` Routen

### 5. **medicalDataHistory.js** (`backend/routes/medicalDataHistory.js`)
- Verwendet `Patient` für Medizinische Daten-Historie
- **Betroffen:** `/api/medical-data-history/*` Routen

### 6. **contacts.js** (`backend/routes/contacts.js`)
- Verwendet `Patient` für Kontakte
- **Betroffen:** `/api/contacts/*` Routen

### 7. **vitalSigns.js** (`backend/routes/vitalSigns.js`)
- Verwendet `Patient` für Vitalzeichen
- **Betroffen:** `/api/vital-signs/*` Routen

### 8. **diagnoses.js** (`backend/routes/diagnoses.js`)
- Verwendet `Patient` für Diagnosen
- **Betroffen:** `/api/diagnoses/*` Routen

### 9. **serviceBookings.js** (`backend/routes/serviceBookings.js`)
- Verwendet `Patient` für Service-Buchungen
- **Betroffen:** `/api/service-bookings/*` Routen

### 10. **onlineBooking.js** (`backend/routes/onlineBooking.js`)
- Verwendet `Patient` für Online-Buchungen
- **Betroffen:** `/api/online-booking/*` Routen

---

## Bereits korrekt umgestellt

✅ **Performance** (`backend/models/Performance.js`) - `ref: 'PatientExtended'`
✅ **Appointment** (`backend/models/Appointment.js`) - `ref: 'PatientExtended'`
✅ **DekursEntry** (`backend/models/DekursEntry.js`) - `ref: 'PatientExtended'`
✅ **DicomStudy** (`backend/models/DicomStudy.js`) - `ref: 'PatientExtended'`
✅ **Reimbursement** (`backend/models/Reimbursement.js`) - `ref: 'PatientExtended'`
✅ **ECardValidation** (`backend/models/ECardValidation.js`) - `ref: 'PatientExtended'`
✅ **InternalMessage** (`backend/models/InternalMessage.js`) - `ref: 'PatientExtended'`
✅ **Task** (`backend/models/Task.js`) - `ref: 'PatientExtended'`
✅ **PatientPhoto** (`backend/models/PatientPhoto.js`) - `ref: 'PatientExtended'`
✅ **billing.js** (`backend/routes/billing.js`) - Verwendet `PatientExtended`
✅ **checkin.js** (`backend/routes/checkin.js`) - Verwendet `PatientExtended`

---

## Sonderfall

**Ambulanzbefund** (`backend/models/Ambulanzbefund.js`)
- Zeile 26: `refPath: 'patientModel'` - Dynamische Referenz
- Unterstützt sowohl `Patient` als auch `PatientExtended`
- **Status:** OK, aber sollte auf `PatientExtended` standardisiert werden

---

## Empfehlung

1. **Alle Models auf `PatientExtended` umstellen** (außer Ambulanzbefund, der dynamisch bleibt)
2. **Alle Routen auf `PatientExtended` umstellen**
3. **Migration der bestehenden Daten** von `Patient` zu `PatientExtended` (falls nötig)
4. **Alte `Patient` Collection kann später entfernt werden** (nach vollständiger Migration)

---

## Priorität

**Hoch:**
- Invoice (Rechnungen)
- BillingJob (Abrechnungs-Jobs)
- LaborResult (Labor-Ergebnisse)
- VitalSigns (Vitalzeichen)

**Mittel:**
- WaitingList (Warteliste)
- PatientDiagnosis (Diagnosen)
- ServiceBooking (Service-Buchungen)

**Niedrig:**
- Contact (Kontakte)
- PatientDataHistory (Historie)
- MedicalDataHistory (Historie)
- OnlineBooking (Online-Buchungen)

