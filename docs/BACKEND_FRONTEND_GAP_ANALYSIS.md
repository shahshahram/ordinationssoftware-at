# Backend-Frontend Gap-Analyse
## Vollständige Übersicht fehlender Frontend-Integrationen

**Erstellt:** 01.12.2025
**Status:** Systematische Analyse aller Backend-Routes

---

## 🔍 Analyse-Methodik

1. Alle Backend-Routes identifiziert
2. Frontend-Verwendungen geprüft
3. Fehlende Integrationen dokumentiert
4. Absichtlich deaktivierte Features ausgeschlossen

---

## ❌ FEHLENDE FRONTEND-INTEGRATIONEN

### 1. Abrechnungsberichte (`/api/billing-reports`)

**Backend-Endpunkte:**
- `GET /api/billing-reports/summary` - Zusammenfassung der Abrechnungen
- `GET /api/billing-reports/by-insurance` - Abrechnungen nach Versicherung
- `GET /api/billing-reports/reimbursements` - Erstattungsberichte
- `GET /api/billing-reports/monthly` - Monatliche Berichte
- `GET /api/billing-reports/export/excel` - Excel-Export

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🔴 **HOCH** - Wichtige Reporting-Funktionalität

---

### 2. ÖGK-Tarifdatenbank-Download (`/api/ogk-tariff-download`)

**Backend-Endpunkte:**
- `POST /api/ogk-tariff-download/ebm` - EBM-Tarifdatenbank herunterladen
- `POST /api/ogk-tariff-download/kho` - KHO-Tarifdatenbank herunterladen
- `POST /api/ogk-tariff-download/goae` - GOÄ-Tarifdatenbank herunterladen
- `POST /api/ogk-tariff-download/all` - Alle Tarifdatenbanken herunterladen

**Status:** ⚠️ **TEILWEISE** - TariffManagement.tsx existiert, aber verwendet nicht die ogk-tariff-download Route
**Priorität:** 🟡 **MITTEL** - Wird automatisch über Cron-Jobs aktualisiert, aber manueller Download wäre nützlich

---

### 3. ServiceCatalog-Updates (`/api/service-catalog/update-status`)

**Backend-Endpunkte:**
- `GET /api/service-catalog/update-status` - Update-Status abrufen
- `POST /api/service-catalog/update` - Manuelles Update auslösen

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Wird automatisch aktualisiert, aber Status-Anzeige wäre nützlich

---

### 4. Abwesenheiten (`/api/absences`)

**Backend-Endpunkte:**
- `GET /api/absences` - Alle Abwesenheiten
- `POST /api/absences` - Neue Abwesenheit erstellen
- `PUT /api/absences/:id` - Abwesenheit aktualisieren
- `DELETE /api/absences/:id` - Abwesenheit löschen
- `GET /api/absences/pending-approvals` - Ausstehende Genehmigungen
- `GET /api/absences/statistics/:staffId` - Statistiken
- `PATCH /api/absences/:id/approve` - Abwesenheit genehmigen
- `GET /api/absences/reasons/available` - Verfügbare Abwesenheitsgründe

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Personalverwaltung

---

### 5. Arbeitszeiten (`/api/work-shifts`)

**Backend-Endpunkte:**
- `GET /api/work-shifts` - Alle Arbeitszeiten
- `POST /api/work-shifts` - Neue Arbeitszeit erstellen
- `PUT /api/work-shifts/:id` - Arbeitszeit aktualisieren
- `DELETE /api/work-shifts/:id` - Arbeitszeit löschen

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Personalverwaltung

---

### 6. Verfügbarkeiten (`/api/availability`)

**Backend-Endpunkte:**
- `GET /api/availability/slots` - Verfügbare Slots
- `GET /api/availability/multi-staff` - Multi-Staff-Verfügbarkeit
- `GET /api/availability/next-available` - Nächster verfügbarer Termin
- `POST /api/availability/check-booking` - Buchung prüfen
- `GET /api/availability/utilization/:staffId` - Auslastung
- `GET /api/availability/available-staff` - Verfügbares Personal

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Terminverwaltung

---

### 7. Kollisionserkennung (`/api/collision-detection`)

**Backend-Endpunkte:**
- `POST /api/collision-detection/check-appointment` - Termin prüfen
- `POST /api/collision-detection/check-staff-availability` - Personal-Verfügbarkeit prüfen
- `POST /api/collision-detection/check-room-availability` - Raum-Verfügbarkeit prüfen
- `POST /api/collision-detection/check-availability-range` - Verfügbarkeitsbereich prüfen
- `POST /api/collision-detection/find-available-slots` - Verfügbare Slots finden

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟢 **NIEDRIG** - Wird wahrscheinlich intern verwendet

---

### 8. Termin-Teilnehmer (`/api/appointment-participants`)

**Backend-Endpunkte:**
- `GET /api/appointment-participants` - Alle Teilnehmer
- `GET /api/appointment-participants/:id` - Einzelner Teilnehmer
- `POST /api/appointment-participants` - Neuer Teilnehmer
- `PUT /api/appointment-participants/:id` - Teilnehmer aktualisieren
- `DELETE /api/appointment-participants/:id` - Teilnehmer löschen
- `GET /api/appointment-participants/appointment/:appointmentId` - Teilnehmer eines Termins

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Terminverwaltung

---

### 9. Termin-Ressourcen (`/api/appointment-resources`)

**Backend-Endpunkte:**
- `GET /api/appointment-resources` - Alle Ressourcen
- `GET /api/appointment-resources/:id` - Einzelne Ressource
- `POST /api/appointment-resources` - Neue Ressource
- `PUT /api/appointment-resources/:id` - Ressource aktualisieren
- `DELETE /api/appointment-resources/:id` - Ressource löschen
- `GET /api/appointment-resources/appointment/:appointmentId` - Ressourcen eines Termins

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Terminverwaltung

---

### 10. Termin-Services (`/api/appointment-services`)

**Backend-Endpunkte:**
- `GET /api/appointment-services` - Alle Services
- `GET /api/appointment-services/:id` - Einzelner Service
- `POST /api/appointment-services` - Neuer Service
- `PUT /api/appointment-services/:id` - Service aktualisieren
- `DELETE /api/appointment-services/:id` - Service löschen
- `GET /api/appointment-services/appointment/:appointmentId` - Services eines Termins

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Terminverwaltung

---

### 11. Ordinationszeiten (`/api/clinic-hours`)

**Backend-Endpunkte:**
- `GET /api/clinic-hours` - Alle Ordinationszeiten
- `GET /api/clinic-hours/:id` - Einzelne Ordinationszeit
- `POST /api/clinic-hours` - Neue Ordinationszeit
- `PUT /api/clinic-hours/:id` - Ordinationszeit aktualisieren
- `DELETE /api/clinic-hours/:id` - Ordinationszeit löschen
- `GET /api/clinic-hours/active/current` - Aktuelle aktive Zeiten
- `POST /api/clinic-hours/check-open` - Prüfen ob geöffnet

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Terminverwaltung

---

### 12. Räume (`/api/rooms`)

**Backend-Endpunkte:**
- `GET /api/rooms` - Alle Räume
- `GET /api/rooms/:id` - Einzelner Raum
- `POST /api/rooms` - Neuer Raum
- `PUT /api/rooms/:id` - Raum aktualisieren
- `DELETE /api/rooms/:id` - Raum löschen

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Ressourcenverwaltung

---

### 13. Geräte (`/api/devices`)

**Backend-Endpunkte:**
- `GET /api/devices` - Alle Geräte
- `GET /api/devices/:id` - Einzelnes Gerät
- `POST /api/devices` - Neues Gerät
- `PUT /api/devices/:id` - Gerät aktualisieren
- `DELETE /api/devices/:id` - Gerät löschen
- `GET /api/devices/bookable` - Buchbare Geräte
- `GET /api/devices/online-bookable` - Online buchbare Geräte
- `GET /api/devices/type/:type` - Geräte nach Typ
- `GET /api/devices/maintenance/needed` - Wartungsbedürftige Geräte

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Ressourcenverwaltung

---

### 14. Wöchentliche Zeitpläne (`/api/weekly-schedules`)

**Backend-Endpunkte:**
- `GET /api/weekly-schedules` - Alle Zeitpläne
- `GET /api/weekly-schedules/:id` - Einzelner Zeitplan
- `POST /api/weekly-schedules` - Neuer Zeitplan
- `PUT /api/weekly-schedules/:id` - Zeitplan aktualisieren
- `DELETE /api/weekly-schedules/:id` - Zeitplan löschen

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Terminverwaltung

---

### 15. Slot-Reservierungen (`/api/slot-reservations`)

**Backend-Endpunkte:**
- `GET /api/slot-reservations` - Alle Reservierungen
- `POST /api/slot-reservations` - Neue Reservierung
- `DELETE /api/slot-reservations/:id` - Reservierung löschen

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Terminverwaltung

---

### 16. Standort-Zeitpläne (`/api/location-weekly-schedules`)

**Backend-Endpunkte:**
- `GET /api/location-weekly-schedules` - Alle Zeitpläne
- `POST /api/location-weekly-schedules` - Neuer Zeitplan
- `PUT /api/location-weekly-schedules/:id` - Zeitplan aktualisieren
- `DELETE /api/location-weekly-schedules/:id` - Zeitplan löschen

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Standortverwaltung

---

### 17. Personal-Standort-Zuordnungen (`/api/staff-location-assignments`)

**Backend-Endpunkte:**
- `GET /api/staff-location-assignments` - Alle Zuordnungen
- `POST /api/staff-location-assignments` - Neue Zuordnung
- `PUT /api/staff-location-assignments/:id` - Zuordnung aktualisieren
- `DELETE /api/staff-location-assignments/:id` - Zuordnung löschen

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Standortverwaltung

---

### 18. Service-Kategorien (`/api/service-categories`)

**Backend-Endpunkte:**
- `GET /api/service-categories` - Alle Kategorien
- `POST /api/service-categories` - Neue Kategorie
- `PUT /api/service-categories/:id` - Kategorie aktualisieren
- `DELETE /api/service-categories/:id` - Kategorie löschen

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Serviceverwaltung

---

### 19. Service-Buchungen (`/api/service-bookings`)

**Backend-Endpunkte:**
- `GET /api/service-bookings` - Alle Buchungen
- `POST /api/service-bookings` - Neue Buchung
- `PUT /api/service-bookings/:id` - Buchung aktualisieren
- `DELETE /api/service-bookings/:id` - Buchung löschen

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Serviceverwaltung

---

### 20. E-Card-Validierung (`/api/ecard-validation`)

**Backend-Endpunkte:**
- `POST /api/ecard-validation/validate` - E-Card validieren
- `POST /api/ecard-validation/sync/:patientId` - E-Card synchronisieren
- `GET /api/ecard-validation/patient/:patientId` - Validierungsstatus
- `GET /api/ecard-validation/valid` - Gültige E-Cards

**Status:** ❌ **NICHT im Frontend** (teilweise vorhanden, aber nicht vollständig)
**Priorität:** 🟡 **MITTEL** - Patientenverwaltung

---

### 21. DICOM-Provider (`/api/dicom-provider`)

**Backend-Endpunkte:**
- `GET /api/dicom-provider` - Alle Provider
- `GET /api/dicom-provider/:id` - Einzelner Provider
- `POST /api/dicom-provider` - Neuer Provider
- `PUT /api/dicom-provider/:id` - Provider aktualisieren
- `DELETE /api/dicom-provider/:id` - Provider löschen
- `POST /api/dicom-provider/:id/regenerate-api-key` - API-Key regenerieren
- `GET /api/dicom-provider/:id/stats` - Statistiken

**Status:** ✅ **VORHANDEN** - DicomProviderManagement.tsx existiert
**Priorität:** ✅ **INTEGRIERT**

---

### 22. Ambulanzbefunde (`/api/ambulanzbefunde`)

**Backend-Endpunkte:**
- `GET /api/ambulanzbefunde/templates` - Alle Templates
- `GET /api/ambulanzbefunde/templates/specialization/:specialization` - Templates nach Fachrichtung
- `GET /api/ambulanzbefunde/templates/:id` - Einzelnes Template
- `POST /api/ambulanzbefunde/templates` - Neues Template
- `PUT /api/ambulanzbefunde/templates/:id` - Template aktualisieren
- `GET /api/ambulanzbefunde` - Alle Befunde
- `POST /api/ambulanzbefunde/:id/export` - Befund exportieren
- `POST /api/ambulanzbefunde/:id/validate` - Befund validieren
- `POST /api/ambulanzbefunde/:id/finalize` - Befund finalisieren
- `GET /api/ambulanzbefunde/:id` - Einzelner Befund

**Status:** ✅ **VORHANDEN** - AmbulanzbefundEditor.tsx existiert
**Priorität:** ✅ **INTEGRIERT**

---

### 23. Audit-Logs (`/api/audit-logs`)

**Backend-Endpunkte:**
- `GET /api/audit-logs` - Alle Logs
- `GET /api/audit-logs/statistics` - Statistiken
- `GET /api/audit-logs/export` - Export
- `GET /api/audit-logs/compliance-report` - Compliance-Bericht
- `GET /api/audit-logs/retention-check` - Retention-Prüfung
- `GET /api/audit-logs/user/:userId` - Logs eines Benutzers
- `GET /api/audit-logs/resource/:resource/:resourceId` - Logs einer Ressource

**Status:** ❌ **NICHT im Frontend** (teilweise vorhanden in RBAC)
**Priorität:** 🟡 **MITTEL** - Compliance

---

### 24. Backup (`/api/backup`)

**Backend-Endpunkte:**
- `GET /api/backup` - Backup-Status

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟢 **NIEDRIG** - Wird automatisch über Cron-Jobs erstellt

---

### 25. Setup (`/api/setup`)

**Backend-Endpunkte:**
- Setup-Endpunkte (Initialisierung)

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟢 **NIEDRIG** - Einmalige Initialisierung

---

### 26. Module-Management (`/api/modules`)

**Backend-Endpunkte:**
- Module-Verwaltung (nur wenn Module Manager aktiviert)

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟢 **NIEDRIG** - Admin-Funktionalität

---

### 27. Inventory (`/api/inventory`)

**Backend-Endpunkte:**
- Inventar-Verwaltung

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - Ressourcenverwaltung

---

### 28. RBAC Discovery (`/api/rbac/discovery`)

**Backend-Endpunkte:**
- RBAC Auto-Discovery

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟢 **NIEDRIG** - Automatisch im Hintergrund

---

### 29. GINA (`/api/gina`)

**Backend-Endpunkte:**
- GINA-Integration

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟢 **NIEDRIG** - Externe Integration

---

### 30. Radiology Reports (`/api/radiology-reports`)

**Backend-Endpunkte:**
- Radiologie-Berichte

**Status:** ❌ **NICHT im Frontend**
**Priorität:** 🟡 **MITTEL** - DICOM-Integration

---

## ✅ VOLLSTÄNDIG INTEGRIERT

- `/api/auth` - Authentifizierung ✅
- `/api/patients` - Patientenverwaltung ✅
- `/api/patients-extended` - Erweiterte Patientenverwaltung ✅
- `/api/appointments` - Terminverwaltung ✅
- `/api/billing` - Abrechnung ✅
- `/api/reimbursements` - Erstattungen ✅
- `/api/ogk-billing` - ÖGK-Abrechnung ✅
- `/api/insurance-billing` - Versicherungs-Abrechnung ✅
- `/api/auto-reimbursement` - Automatische Erstattung ✅
- `/api/documents` - Dokumente ✅
- `/api/elga` - ELGA ✅
- `/api/labor` - Laborwerte ✅
- `/api/tasks` - Aufgaben ✅
- `/api/dicom` - DICOM ✅
- `/api/dekurs` - Dekurs ✅
- `/api/vital-signs` - Vitalzeichen ✅
- `/api/internal-messages` - Interne Nachrichten ✅
- `/api/dashboard-widgets` - Dashboard-Widgets ✅
- `/api/diagnoses` - Diagnosen ✅
- `/api/icd10` - ICD-10 ✅
- `/api/service-catalog` - Service-Katalog ✅
- `/api/locations` - Standorte ✅
- `/api/users` - Benutzer ✅
- `/api/rbac` - RBAC ✅
- `/api/settings` - Einstellungen ✅

---

## 📊 ZUSAMMENFASSUNG

**Gesamt Backend-Routes:** ~70
**Vollständig integriert:** ~30
**Fehlend im Frontend:** ~30
**Absichtlich deaktiviert:** 1 (oneClickBilling)

**Prioritäten:**
- 🔴 **HOCH:** 1 (Abrechnungsberichte)
- 🟡 **MITTEL:** ~20
- 🟢 **NIEDRIG:** ~9

---

## 🎯 EMPFOHLENE NÄCHSTE SCHRITTE

1. **Abrechnungsberichte** implementieren (🔴 HOCH)
2. **Personalverwaltung** (Abwesenheiten, Arbeitszeiten) implementieren
3. **Ressourcenverwaltung** (Räume, Geräte) implementieren
4. **Terminverwaltung** erweitern (Teilnehmer, Ressourcen, Services)
5. **ServiceCatalog-Update-Status** anzeigen

