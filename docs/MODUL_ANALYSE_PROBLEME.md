# Modul-Analyse: Potenzielle Probleme beim Deaktivieren von Modulen

## Übersicht der registrierten Module

### Pflichtmodule (required: true) - **KÖNNEN NICHT DEAKTIVIERT WERDEN**

Diese Module sind als `required: true` markiert und sind für die Grundfunktionalität der Anwendung essentiell:

1. **`auth`** - Authentifizierung & Autorisierung
   - **Kritisch:** Ohne Auth funktioniert die gesamte Anwendung nicht
   - **Frontend:** Login-Seite, ProtectedRoute, Session-Management
   - **Probleme bei Deaktivierung:** Komplette Anwendung unbrauchbar

2. **`patients`** - Patientenverwaltung
   - **Kritisch:** Kernfunktionalität der Praxissoftware
   - **Frontend:** Patientenliste, PatientOrganizer, Patientendetails
   - **Probleme bei Deaktivierung:** Keine Patientenverwaltung möglich

3. **`appointments`** - Terminverwaltung
   - **Kritisch:** Zentrale Funktionalität für Praxisbetrieb
   - **Frontend:** Terminverwaltung, Kalender, Termine im PatientOrganizer
   - **Probleme bei Deaktivierung:** Keine Terminplanung möglich

4. **`billing`** - Abrechnung
   - **Kritisch:** Finanzielle Transaktionen
   - **Frontend:** Abrechnungsseite, Rechnungen, Journal
   - **Probleme bei Deaktivierung:** Keine Abrechnungen möglich

5. **`documents`** - Dokumentenverwaltung
   - **Kritisch:** Medizinische Dokumente
   - **Frontend:** Dokumente-Seite, Dokumente im PatientOrganizer
   - **Probleme bei Deaktivierung:** Keine Dokumentenverwaltung

6. **`users`** - Benutzerverwaltung
   - **Kritisch:** Benutzer- und Rollenverwaltung
   - **Frontend:** Benutzer-Seite, RBAC-Management
   - **Probleme bei Deaktivierung:** Keine Benutzerverwaltung

7. **`staff-profiles`** - Personalverwaltung
   - **Kritisch:** Mitarbeiterverwaltung
   - **Frontend:** Personal-Seite, Mitarbeiter-Zuordnungen
   - **Probleme bei Deaktivierung:** Keine Personalverwaltung

8. **`locations`** - Standortverwaltung
   - **Kritisch:** Multi-Location-Support
   - **Frontend:** Standortverwaltung, Standort-Dashboard
   - **Probleme bei Deaktivierung:** Standort-Funktionalität bricht zusammen

9. **`rbac`** - Rollenbasierte Zugriffskontrolle
   - **Kritisch:** Berechtigungssystem
   - **Frontend:** RBAC-Management, Permission-Checks
   - **Probleme bei Deaktivierung:** Keine Berechtigungsprüfung möglich

10. **`settings`** - Systemeinstellungen
    - **Kritisch:** Konfiguration der Anwendung
    - **Frontend:** Einstellungsseite
    - **Probleme bei Deaktivierung:** Keine Konfiguration möglich

### Optionale Module (können deaktiviert werden)

#### Integrations-Module

11. **`elga`** - ELGA-Integration
    - **Frontend:** ELGA-Seite, ELGA-Daten im PatientOrganizer
    - **Probleme bei Deaktivierung:**
      - ELGA-Seite zeigt Fehler (503)
      - ELGA-Tab im PatientOrganizer funktioniert nicht
      - ELGA-Daten können nicht abgerufen werden
    - **Abhängigkeiten:** Keine kritischen

12. **`elda`** - ELDA-Integration
    - **Frontend:** ELDA-Testseite
    - **Probleme bei Deaktivierung:**
      - ELDA-Testseite funktioniert nicht
      - ELDA-Abrechnungen nicht möglich
    - **Abhängigkeiten:** Kann von `billing` abhängen

13. **`wahonline`** - WAHonline-Integration
    - **Frontend:** WAHonline-Testseite
    - **Probleme bei Deaktivierung:**
      - WAHonline-Testseite funktioniert nicht
      - WAHonline-Abrechnungen nicht möglich
    - **Abhängigkeiten:** Kann von `billing` abhängen

14. **`ecard`** - eCard-Integration
    - **Frontend:** eCard-Validierung, eCard-Testseite
    - **Probleme bei Deaktivierung:**
      - eCard-Validierung funktioniert nicht
      - eCard-Testseite zeigt Fehler
    - **Abhängigkeiten:** Kann von `patients` abhängen

15. **`online-booking`** - Online-Terminbuchung
    - **Frontend:** Online-Buchungsseite, Online-Buchungen-Verwaltung
    - **Probleme bei Deaktivierung:**
      - Online-Buchungsseite funktioniert nicht
      - Patienten können keine Termine online buchen
      - Online-Buchungen-Verwaltung zeigt Fehler
    - **Abhängigkeiten:** Abhängig von `appointments`

16. **`dicom`** - DICOM/PACS-Integration
    - **Frontend:** DICOM-Provider-Verwaltung, DICOM-Testseite
    - **Probleme bei Deaktivierung:**
      - DICOM-Provider-Verwaltung funktioniert nicht
      - DICOM-Bilder können nicht abgerufen werden
      - DICOM-Tab im PatientOrganizer funktioniert nicht
    - **Abhängigkeiten:** Kann von `patients` abhängen

17. **`labor`** - Labor-Integration
    - **Frontend:** Labor-Provider-Verwaltung, Labor-Testseite, Labor-Tab im PatientOrganizer
    - **Probleme bei Deaktivierung:**
      - Labor-Provider-Verwaltung funktioniert nicht
      - Laborwerte können nicht abgerufen werden
      - Labor-Tab im PatientOrganizer funktioniert nicht
    - **Abhängigkeiten:** Abhängig von `patients`

#### Funktions-Module

18. **`patients-extended`** - Erweiterte Patientenfunktionen
    - **Frontend:** Wird im PatientOrganizer verwendet
    - **Probleme bei Deaktivierung:**
      - Erweiterte Patientenfunktionen im PatientOrganizer funktionieren nicht
      - API-Calls schlagen fehl (503)
    - **Abhängigkeiten:** Abhängig von `patients`

19. **`diagnoses`** - Diagnosenverwaltung
    - **Frontend:** Diagnosen-Tab im PatientOrganizer, Diagnose-Details
    - **Probleme bei Deaktivierung:**
      - Diagnosen können nicht verwaltet werden
      - Diagnosen-Tab im PatientOrganizer funktioniert nicht
      - Diagnose-Details-Seite zeigt Fehler
    - **Abhängigkeiten:** Abhängig von `patients`

20. **`medications`** - Medikamentenverwaltung
    - **Frontend:** Medikamente-Tab im PatientOrganizer, Medikamenten-Katalog
    - **Probleme bei Deaktivierung:**
      - Medikamente können nicht verwaltet werden
      - Medikamente-Tab im PatientOrganizer funktioniert nicht
    - **Abhängigkeiten:** Abhängig von `patients`

21. **`vital-signs`** - Vitalwerte
    - **Frontend:** Vitalwerte-Tab im PatientOrganizer
    - **Probleme bei Deaktivierung:**
      - Vitalwerte können nicht erfasst werden
      - Vitalwerte-Tab im PatientOrganizer funktioniert nicht
    - **Abhängigkeiten:** Abhängig von `patients`

22. **`labor`** - Laborwerte
    - **Frontend:** Labor-Tab im PatientOrganizer
    - **Probleme bei Deaktivierung:**
      - Laborwerte können nicht angezeigt werden
      - Labor-Tab im PatientOrganizer funktioniert nicht
    - **Abhängigkeiten:** Abhängig von `patients`

23. **`ambulanzbefunde`** - Ambulanzbefunde
    - **Frontend:** Ambulanzbefunde im PatientOrganizer
    - **Probleme bei Deaktivierung:**
      - Ambulanzbefunde können nicht erstellt/verwaltet werden
      - Ambulanzbefunde-Tab im PatientOrganizer funktioniert nicht
    - **Abhängigkeiten:** Abhängig von `patients` und `documents`

24. **`dekurs`** - Dekurs-Verwaltung
    - **Frontend:** Dekurs-Tab im PatientOrganizer
    - **Probleme bei Deaktivierung:**
      - Dekurs-Einträge können nicht verwaltet werden
      - Dekurs-Tab im PatientOrganizer funktioniert nicht
    - **Abhängigkeiten:** Abhängig von `patients`

25. **`patient-notes`** - Patientennotizen
    - **Frontend:** Notizen im PatientOrganizer
    - **Probleme bei Deaktivierung:**
      - Patientennotizen können nicht erstellt werden
      - Notizen-Tab im PatientOrganizer funktioniert nicht
    - **Abhängigkeiten:** Abhängig von `patients`

26. **`tasks`** - Aufgabenverwaltung
    - **Frontend:** Aufgaben im PatientOrganizer, Aufgaben-Dashboard
    - **Probleme bei Deaktivierung:**
      - Aufgaben können nicht verwaltet werden
      - Aufgaben-Tab im PatientOrganizer funktioniert nicht
    - **Abhängigkeiten:** Abhängig von `patients`

27. **`smart-suggestions`** - Intelligente Vorschläge
    - **Frontend:** Smart Suggestions Panel, Vorschläge im Chatbot
    - **Probleme bei Deaktivierung:**
      - Smart Suggestions Panel zeigt keine Vorschläge
      - Chatbot kann keine proaktiven Vorschläge anzeigen
    - **Abhängigkeiten:** Abhängig von `patients`, `diagnoses`, `medications`, `labor`

28. **`chatbot`** - KI-Chatbot
    - **Frontend:** ChatbotWidget (global)
    - **Probleme bei Deaktivierung:**
      - Chatbot-Widget funktioniert nicht
      - API-Calls schlagen fehl (503)
    - **Abhängigkeiten:** Kann von `smart-suggestions` abhängen

29. **`search`** - Globale Suche
    - **Frontend:** GlobalSearch-Komponente
    - **Probleme bei Deaktivierung:**
      - Globale Suche funktioniert nicht
      - Suche-Button im Header zeigt Fehler
    - **Abhängigkeiten:** Abhängig von mehreren Modulen (patients, appointments, documents, etc.)

#### Verwaltungs-Module

30. **`service-catalog`** - Leistungskatalog
    - **Frontend:** ServiceCatalog-Seite
    - **Probleme bei Deaktivierung:**
      - Leistungskatalog kann nicht verwaltet werden
      - ServiceCatalog-Seite zeigt Fehler
    - **Abhängigkeiten:** Kann von `billing` abhängen

31. **`service-bookings`** - Service-Buchungen
    - **Frontend:** Service-Buchungen-Verwaltung
    - **Probleme bei Deaktivierung:**
      - Service-Buchungen können nicht verwaltet werden
    - **Abhängigkeiten:** Abhängig von `service-catalog` und `appointments`

32. **`resources`** - Ressourcenverwaltung
    - **Frontend:** Ressourcen-Seite
    - **Probleme bei Deaktivierung:**
      - Ressourcen können nicht verwaltet werden
      - Ressourcen-Seite zeigt Fehler
    - **Abhängigkeiten:** Kann von `appointments` abhängen

33. **`reports`** - Berichte
    - **Frontend:** Reports-Seite
    - **Probleme bei Deaktivierung:**
      - Berichte können nicht generiert werden
      - Reports-Seite zeigt Fehler
    - **Abhängigkeiten:** Abhängig von mehreren Modulen

34. **`billing-reports`** - Abrechnungsberichte
    - **Frontend:** BillingReports-Seite
    - **Probleme bei Deaktivierung:**
      - Abrechnungsberichte können nicht generiert werden
      - BillingReports-Seite zeigt Fehler
    - **Abhängigkeiten:** Abhängig von `billing`

35. **`journal`** - Journal
    - **Frontend:** Journal-Seite
    - **Probleme bei Deaktivierung:**
      - Journal kann nicht angezeigt werden
      - Journal-Seite zeigt Fehler
    - **Abhängigkeiten:** Abhängig von `billing`

36. **`backup`** - Backup-Verwaltung
    - **Frontend:** Backup-Verwaltung (falls vorhanden)
    - **Probleme bei Deaktivierung:**
      - Backups können nicht manuell erstellt werden
    - **Abhängigkeiten:** Keine kritischen

37. **`audit-logs`** - Audit-Logs
    - **Frontend:** Audit-Log-Verwaltung (falls vorhanden)
    - **Probleme bei Deaktivierung:**
      - Audit-Logs können nicht angezeigt werden
    - **Abhängigkeiten:** Keine kritischen

38. **`icd10`** - ICD-10-Verwaltung
    - **Frontend:** ICD10Demo-Seite, ICD10CatalogManagement
    - **Probleme bei Deaktivierung:**
      - ICD-10-Suche funktioniert nicht
      - ICD-10-Katalog kann nicht verwaltet werden
    - **Abhängigkeiten:** Kann von `diagnoses` abhängen

39. **`document-templates`** - Dokumentenvorlagen
    - **Frontend:** TemplateManagement, DocumentTemplateAdmin
    - **Probleme bei Deaktivierung:**
      - Dokumentenvorlagen können nicht verwaltet werden
      - Template-Seiten zeigen Fehler
    - **Abhängigkeiten:** Abhängig von `documents`

40. **`xds`** - XDS-Integration
    - **Frontend:** XdsDocumentManagement, XDS-Dokumente im PatientOrganizer
    - **Probleme bei Deaktivierung:**
      - XDS-Dokumente können nicht abgerufen werden
      - XDS-Verwaltung funktioniert nicht
    - **Abhängigkeiten:** Abhängig von `patients` und `documents`

## Potenzielle Probleme beim Deaktivieren von Modulen

### 1. Frontend-Fehler (503 Service Unavailable)

**Problem:** Wenn ein Modul deaktiviert wird, schlagen alle API-Calls zu diesem Modul fehl.

**Beispiele:**
- Deaktivierung von `elga` → ELGA-Seite zeigt 503-Fehler
- Deaktivierung von `labor` → Labor-Tab im PatientOrganizer zeigt 503-Fehler
- Deaktivierung von `chatbot` → Chatbot-Widget funktioniert nicht

**Lösung:**
- Frontend sollte Modul-Status prüfen und UI entsprechend anpassen
- Fehlerbehandlung für 503-Fehler implementieren
- Deaktivierte Module im Frontend ausblenden

### 2. Abhängigkeiten zwischen Modulen

**Problem:** Ein Modul kann von einem anderen Modul abhängen.

**Beispiele:**
- `patients-extended` benötigt `patients`
- `diagnoses` benötigt `patients`
- `smart-suggestions` benötigt `patients`, `diagnoses`, `medications`, `labor`
- `service-bookings` benötigt `service-catalog` und `appointments`

**Lösung:**
- Abhängigkeitsprüfung vor Deaktivierung
- Warnung anzeigen, wenn abhängige Module aktiv sind
- Kaskadierte Deaktivierung (optional)

### 3. Frontend-Routen bleiben aktiv

**Problem:** Frontend-Routen werden nicht automatisch deaktiviert.

**Beispiele:**
- Route `/elga` ist weiterhin erreichbar, auch wenn `elga`-Modul deaktiviert ist
- Route `/labor-providers` ist weiterhin erreichbar, auch wenn `labor`-Modul deaktiviert ist

**Lösung:**
- Dynamische Route-Filterung basierend auf Modul-Status
- Redirect zu "Modul deaktiviert"-Seite
- ProtectedRoute mit Modul-Check

### 4. Menu-Items bleiben sichtbar

**Problem:** Menu-Items werden nicht automatisch ausgeblendet.

**Beispiele:**
- "ELGA" bleibt im Menü sichtbar, auch wenn `elga`-Modul deaktiviert ist
- "Labor & Schnittstellen" bleibt im Menü sichtbar, auch wenn `labor`-Modul deaktiviert ist

**Lösung:**
- Dynamische Menu-Item-Filterung
- Modul-Status-Hook im Frontend
- Menu-Items basierend auf aktivem Status filtern

### 5. Datenintegrität

**Problem:** Bestehende Daten bleiben erhalten, aber nicht zugänglich.

**Beispiele:**
- ELGA-Daten bleiben in der DB, aber können nicht abgerufen werden
- Laborwerte bleiben in der DB, aber können nicht angezeigt werden

**Lösung:**
- Daten bleiben erhalten (keine Löschung)
- Zugriff wird blockiert (503)
- Warnung beim Deaktivieren anzeigen

### 6. Services laufen weiter

**Problem:** Background Services und Cron Jobs laufen weiter, auch wenn Modul deaktiviert ist.

**Beispiele:**
- ELGA-Sync läuft weiter, auch wenn `elga`-Modul deaktiviert ist
- Smart Notifications laufen weiter, auch wenn `smart-notifications`-Modul deaktiviert ist

**Lösung:**
- ServiceLifecycleManager implementieren
- Services automatisch stoppen bei Deaktivierung
- Services automatisch starten bei Aktivierung

### 7. Komponenten-Fehler

**Problem:** React-Komponenten versuchen, auf deaktivierte Module zuzugreifen.

**Beispiele:**
- `PatientOrganizer` versucht, Laborwerte zu laden, auch wenn `labor`-Modul deaktiviert ist
- `ChatbotWidget` versucht, Smart Suggestions zu laden, auch wenn `smart-suggestions`-Modul deaktiviert ist

**Lösung:**
- Conditional Rendering basierend auf Modul-Status
- Fehlerbehandlung in Komponenten
- Graceful Degradation

### 8. Cross-Module-Funktionalität

**Problem:** Funktionen, die mehrere Module nutzen, brechen zusammen.

**Beispiele:**
- Smart Suggestions benötigt mehrere Module (`patients`, `diagnoses`, `medications`, `labor`)
- Globale Suche benötigt mehrere Module (`patients`, `appointments`, `documents`, etc.)

**Lösung:**
- Abhängigkeitsprüfung
- Partial Functionality (nur aktive Module durchsuchen)
- Warnung anzeigen, wenn kritische Module fehlen

## Empfehlungen

### 1. Sichere Module zum Deaktivieren (niedriges Risiko)

- `elga` - Nur wenn ELGA nicht genutzt wird
- `elda` - Nur wenn ELDA nicht genutzt wird
- `wahonline` - Nur wenn WAHonline nicht genutzt wird
- `dicom` - Nur wenn DICOM nicht genutzt wird
- `labor` - Nur wenn Labor-Integration nicht genutzt wird
- `online-booking` - Nur wenn Online-Buchung nicht genutzt wird
- `backup` - Nur wenn manuelle Backups nicht benötigt werden
- `audit-logs` - Nur wenn Audit-Logs nicht benötigt werden

### 2. Vorsichtige Module (mittleres Risiko)

- `smart-suggestions` - Kann andere Funktionen beeinflussen
- `chatbot` - Kann andere Funktionen beeinflussen
- `search` - Wird von vielen Komponenten genutzt
- `service-catalog` - Kann Abrechnung beeinflussen
- `icd10` - Kann Diagnoseverwaltung beeinflussen

### 3. Nie deaktivieren (kritisch)

- Alle `required: true` Module
- Module, die von vielen anderen Modulen abhängen
- Module, die für die Grundfunktionalität essentiell sind

## Zusammenfassung

**Ja, es ist zu erwarten, dass Probleme entstehen, wenn Module deaktiviert werden:**

1. **Frontend-Fehler:** 503-Fehler bei API-Calls
2. **Abhängigkeiten:** Abhängige Module können nicht mehr funktionieren
3. **UI-Probleme:** Routen und Menu-Items bleiben sichtbar
4. **Service-Probleme:** Background Services laufen weiter
5. **Komponenten-Fehler:** React-Komponenten versuchen auf deaktivierte Module zuzugreifen

**Lösung:** Implementierung der Modul-Schaltzentrale mit:
- Frontend-Integration (Modul-Status-Check)
- Service-Lifecycle-Management
- Abhängigkeitsprüfung
- Dynamische UI-Anpassung

**Aktuell registrierte Module:** ~40 Module (10 Pflichtmodule, ~30 optionale Module)
