# Evaluationsdokument: Online-Buchung - Bestehendes System vs. Gemini-Vorschläge

**Erstellt am**: 2025-12-19  
**Status**: Zur Entscheidung  
**Zweck**: Evaluierung der Gemini-Vorschläge im Kontext des bestehenden Systems

---

## 1. Bestehende System-Features (Bereits implementiert)

### 1.1 Ressourcen-Verwaltung ✅ VOLLSTÄNDIG VORHANDEN

#### Räume (Room Model)
- ✅ **Model vorhanden**: `backend/models/Room.js`
- ✅ **Standort-Zuordnung**: `location_id` (required)
- ✅ **Online-Buchbarkeit**: `isOnlineBookable` (Boolean)
- ✅ **Online-Buchungseinstellungen**: `onlineBookingSettings` (advanceBookingDays, maxAdvanceBookingDays, minAdvanceBookingHours, requiresApproval, price)
- ✅ **Verfügbarkeitsregeln**: `availabilityRules` (weekdays, startTime, endTime, breaks)
- ✅ **Kapazität**: `capacity` (Number)
- ✅ **Ausstattung**: `equipment[]` (Array mit name, type, isRequired)
- ✅ **Typen**: consultation, treatment, surgery, waiting, office, storage, other
- ✅ **API**: `GET /api/rooms`, `POST /api/rooms`, etc.

#### Geräte (Device Model)
- ✅ **Model vorhanden**: `backend/models/Device.js`
- ✅ **Standort-Zuordnung**: `location_id` (required)
- ✅ **Online-Buchbarkeit**: `isOnlineBookable` (Boolean)
- ✅ **Online-Buchungseinstellungen**: `onlineBookingSettings` (gleiche Struktur wie Room)
- ✅ **Verfügbarkeit**: `availability` (weekdays, startTime, endTime, breaks)
- ✅ **Typen**: EKG, Ultraschall, Röntgen, Blutdruckmessgerät, etc.
- ✅ **Status**: available, maintenance, out_of_order
- ✅ **API**: Geräte-Verwaltung vorhanden

#### Resource Model (Unified)
- ✅ **Model vorhanden**: `backend/models/Resource.js`
- ✅ **Unified Resource Model**: Unterstützt room, equipment, service, personnel
- ✅ **Online-Buchung**: Vollständige Konfiguration vorhanden
- ✅ **AppointmentResource**: Verknüpfung zwischen Appointment und Resource

#### ServiceCatalog - Ressourcen-Zuordnung
- ✅ **assigned_rooms**: Array von Room IDs
- ✅ **assigned_devices**: Array von Device IDs
- ✅ **requires_room**: Boolean
- ✅ **requires_room_selection**: Boolean
- ✅ **room_quantity_required**: Number
- ✅ **requires_device_selection**: Boolean
- ✅ **device_quantity_required**: Number
- ✅ **required_device_type**: String

**FAZIT**: Ressourcen-Logik ist **vollständig vorhanden**. Keine neue Implementierung nötig, nur Integration in Online-Buchung.

---

### 1.2 Leistungsverwaltung ✅ VOLLSTÄNDIG VORHANDEN

#### ServiceCategory
- ✅ **Model vorhanden**: `backend/models/ServiceCategory.js`
- ✅ **Hierarchie**: `parent_category_id`, `level`, `sort_order`
- ✅ **Tree-Struktur**: Statische Methode `getTree()` für hierarchische Darstellung
- ✅ **Farben & Icons**: `color_hex`, `icon`
- ✅ **Berechtigungen**: `visible_to_roles[]`
- ✅ **API**: `GET /api/service-categories?tree=true`

#### ServiceCatalog
- ✅ **Model vorhanden**: `backend/models/ServiceCatalog.js`
- ✅ **Kategorien**: `category` (String)
- ✅ **Medizinisch/Nicht-medizinisch**: `isMedical` (Boolean)
- ✅ **Fachrichtung**: `specialty` (Enum mit 20+ Werten)
- ✅ **Personalzuordnung**: `assigned_users[]` (Array von User IDs)
- ✅ **Dauer**: `base_duration_min`, `buffer_before_min`, `buffer_after_min`
- ✅ **Online-Buchbarkeit**: `online_bookable` (Boolean)
- ✅ **Ressourcen**: `assigned_rooms[]`, `assigned_devices[]` (siehe oben)
- ✅ **Altersbeschränkungen**: `min_age_years`, `max_age_years`
- ✅ **Preise**: `price_cents`
- ✅ **Standort**: `location_id` (optional)

**FAZIT**: Leistungsverwaltung ist **vollständig vorhanden**. Kategorien, Leistungen, Personalzuordnung - alles vorhanden.

---

### 1.3 Arbeitszeiten ✅ VOLLSTÄNDIG VORHANDEN

#### WeeklySchedule
- ✅ **Model vorhanden**: `backend/models/WeeklySchedule.js`
- ✅ **Personal-Zuordnung**: `staffId` (StaffProfile ID)
- ✅ **Tagespläne**: `schedules[]` (Array von DaySchedule)
- ✅ **Tagesstruktur**: `day`, `isWorking`, `startTime`, `endTime`, `breakStart`, `breakEnd`, `label`
- ✅ **Gültigkeitszeitraum**: `validFrom`, `validTo` (für wiederkehrende Vorlagen)
- ✅ **Aktiv-Status**: `isActive` (Boolean)
- ✅ **Index**: Unique constraint für `staffId + isActive`
- ✅ **Integration**: Bereits in Online-Buchung verwendet (`backend/routes/onlineBooking.js`)

**FAZIT**: Arbeitszeiten sind **vollständig vorhanden** und bereits in Online-Buchung integriert.

---

### 1.4 Standorte ✅ VOLLSTÄNDIG VORHANDEN

#### Location Model
- ✅ **Model vorhanden**: `backend/models/Location.js`
- ✅ **Multi-Standort-System**: Vollständig implementiert
- ✅ **Standort-Zuordnung**: 
  - Patienten: `primaryLocationId`, `locationIds[]`
  - Personal: `StaffLocationAssignment`
  - Räume: `location_id`
  - Geräte: `location_id`
- ✅ **Dokumentation**: `docs/MULTI_STANDORT_SYSTEM.md`
- ✅ **Frontend**: `LocationProvider`, `LocationSelectionDialog`
- ✅ **Redux**: `locationSlice` mit `currentLocation`, `availableLocations`

**FAZIT**: Standorte sind **vollständig vorhanden** und funktionsfähig.

---

### 1.5 Warteliste ✅ VOLLSTÄNDIG VORHANDEN

#### WaitingList Model
- ✅ **Model vorhanden**: `backend/models/WaitingList.js`
- ✅ **Patienten-Verknüpfung**: `patient` (PatientExtended ID, required)
- ✅ **Service-Verknüpfung**: `service` (ServiceCatalog ID, optional)
- ✅ **Arzt-Verknüpfung**: `doctor` (StaffProfile ID, optional)
- ✅ **Standort-Verknüpfung**: `location` (Location ID, optional)
- ✅ **Priorität**: `priority` (low, normal, high, urgent)
- ✅ **Status**: `status` (waiting, in_progress, completed, cancelled)
- ✅ **Position**: `position` (wird automatisch berechnet via pre-save hook)
- ✅ **Bevorzugtes Datum**: `preferredDate` (optional)
- ✅ **Kontaktmethode**: `contactMethod` (all, phone, email, sms)
- ✅ **API**: `GET /api/waiting-list`, `POST /api/waiting-list`, etc.
- ✅ **Frontend**: `frontend/src/pages/WaitingList.tsx`

**FAZIT**: Warteliste ist **vollständig vorhanden**. Benachrichtigungs-Automatik fehlt noch.

---

### 1.6 e-card Integration ✅ VOLLSTÄNDIG VORHANDEN

#### ECardValidation Model
- ✅ **Model vorhanden**: `backend/models/ECardValidation.js`
- ✅ **Patienten-Verknüpfung**: `patientId` (PatientExtended ID)
- ✅ **e-card Daten**: `ecardNumber`, `cardType`, `validationStatus`
- ✅ **Versicherungsdaten**: `insuranceData` (insuranceProvider, insuranceNumber, socialSecurityNumber, firstName, lastName, dateOfBirth, gender, address)
- ✅ **ELGA-Integration**: `elgaData` (elgaId, elgaStatus, lastSync)
- ✅ **Validierung**: `validationDate`, `validationStatus` (valid, invalid, expired, not_found, error)
- ✅ **GINA-Box Service**: `backend/services/ginaBoxService.js` (Card Reader Integration)
- ✅ **ELGA Service**: `backend/services/elgaService.js`
- ✅ **API**: `POST /api/ecard/patient/:patientId/validate`
- ✅ **Frontend**: `ECardValidation` Komponente, integriert in `PatientOrganizer.tsx`

**FAZIT**: e-card Integration ist **vollständig vorhanden**. Automatische Patientenverknüpfung bei Online-Buchung fehlt noch.

---

### 1.7 Check-in System ✅ VOLLSTÄNDIG VORHANDEN

#### Self Check-in
- ✅ **Model vorhanden**: Check-in Sessions (in-memory oder DB)
- ✅ **QR-Code Generation**: `POST /api/checkin/generate`
- ✅ **QR-Code Validation**: `GET /api/checkin/validate/:checkInId`
- ✅ **Daten speichern**: `POST /api/checkin/submit/:checkInId`
- ✅ **Frontend**: `SelfCheckInPage.tsx`, `SelfCheckInForm.tsx`
- ✅ **Dokumentation**: `SELBST_CHECKIN_INTEGRATION.md`
- ✅ **Patienten-Erstellung**: Automatische Erstellung bei Check-in

**FAZIT**: Check-in System ist **vollständig vorhanden** und funktionsfähig.

---

### 1.8 Patientenverwaltung ✅ VOLLSTÄNDIG VORHANDEN

#### PatientExtended Model
- ✅ **Model vorhanden**: `backend/models/PatientExtended.js`
- ✅ **Vollständige Stammdaten**: firstName, lastName, email, phone, dateOfBirth, gender, address, etc.
- ✅ **Versicherungsdaten**: insuranceProvider, insuranceNumber, socialSecurityNumber
- ✅ **e-card**: `ecard` (cardNumber, validationStatus, lastValidated, etc.)
- ✅ **Standort-Zuordnung**: `primaryLocationId`, `locationIds[]`
- ✅ **Status**: aktiv, wartend, inaktiv, entlassen, self-checkin
- ✅ **Dublettenprüfung**: Bereits vorhanden (über email, firstName, lastName, socialSecurityNumber)

**FAZIT**: Patientenverwaltung ist **vollständig vorhanden**. Temporäre Patienten-Markierung für Online-Buchung fehlt noch.

---

### 1.9 Kalender & Terminverwaltung ✅ VOLLSTÄNDIG VORHANDEN

#### Appointment Model
- ✅ **Model vorhanden**: `backend/models/Appointment.js`
- ✅ **Patienten-Verknüpfung**: `patient` (PatientExtended ID)
- ✅ **Arzt-Verknüpfung**: `doctor` (User ID)
- ✅ **Standort**: `locationId` (Location ID)
- ✅ **Zeiten**: `startTime`, `endTime` (Date)
- ✅ **Status**: geplant, bestätigt, abgesagt, erledigt, nicht_erschienen
- ✅ **Online-Buchung**: `bookingType: 'online'`, `onlineBookingRef`, `isOnlineBooking`
- ✅ **Ressourcen**: `assigned_rooms[]`, `assigned_devices[]` (bereits vorhanden!)
- ✅ **Frontend**: `Appointments.tsx` (vollständige Terminverwaltung)

**FAZIT**: Kalender & Terminverwaltung sind **vollständig vorhanden**. Online-Buchung ist bereits integriert.

---

## 2. Gemini-Vorschläge: Evaluierung

### 2.1 Ressourcen-Logik (Räume & Geräte) ✅ BEREITS VORHANDEN

**Gemini-Vorschlag**: "Verknüpfe Leistungen nicht nur mit Personen, sondern optional auch mit Ressourcen (Raum/Gerät). Ein Termin ist nur buchbar, wenn Person + Raum + Gerät frei sind."

**Status**: ✅ **BEREITS VOLLSTÄNDIG VORHANDEN**

**Bestehende Implementierung**:
- `ServiceCatalog` hat bereits `assigned_rooms[]` und `assigned_devices[]`
- `Appointment` hat bereits `assigned_rooms[]` und `assigned_devices[]`
- `Room` und `Device` Models haben `isOnlineBookable` und Verfügbarkeitsregeln

**Was fehlt**:
- ❌ **Integration in Online-Buchung**: Verfügbarkeitsprüfung berücksichtigt noch keine Räume/Geräte
- ❌ **UI für Ressourcen-Auswahl**: Im Online-Buchungsprozess fehlt die Auswahl von Räumen/Geräten

**Empfehlung**: 
- ✅ **Erweitern, nicht neu implementieren**
- Verfügbarkeitsprüfung in `backend/routes/onlineBooking.js` erweitern
- Frontend `OnlineBooking.tsx` um Ressourcen-Auswahl erweitern

---

### 2.2 Patienten-Identifikation & Dublettenprüfung ⚠️ TEILWEISE VORHANDEN

**Gemini-Vorschlag**: "Automatische Dublettenprüfung im Hintergrund. System markiert Buchung als 'Bekannter Patient' oder legt 'Web-Patienten' (temporär) an."

**Status**: ⚠️ **TEILWEISE VORHANDEN**

**Bestehende Implementierung**:
- ✅ `PatientExtended` Model vorhanden
- ✅ Dublettenprüfung über email, firstName, lastName, socialSecurityNumber möglich
- ✅ Check-in System erstellt bereits Patienten

**Was fehlt**:
- ❌ **Temporäre Patienten-Markierung**: `isTemporary` Flag fehlt im `PatientExtended` Model
- ❌ **Automatische Dublettenprüfung**: In `backend/routes/onlineBooking.js` wird aktuell immer neuer Patient erstellt
- ❌ **Markierung "Bekannter Patient"**: Keine Unterscheidung zwischen bekanntem und neuem Patient

**Empfehlung**:
- ✅ **Erweitern**: `PatientExtended` um `isTemporary` Flag
- ✅ **Erweitern**: Online-Buchung um automatische Dublettenprüfung
- ✅ **Erweitern**: `OnlineBooking` Model um `isKnownPatient` Flag

---

### 2.3 e-card Integration bei Online-Buchung ❌ NICHT VORHANDEN

**Gemini-Vorschlag**: "Wenn Patient kommt und e-card gesteckt wird, fragt die Software: 'Gefundenen e-card Patienten mit Web-Buchung von 'Max Mustermann' verknüpfen?'"

**Status**: ❌ **NICHT VORHANDEN** (e-card System vorhanden, aber nicht mit Online-Buchung verknüpft)

**Bestehende Implementierung**:
- ✅ `ECardValidation` Model vorhanden
- ✅ `ginaBoxService` für Card Reader vorhanden
- ✅ `ECardValidation` Komponente vorhanden
- ✅ e-card Validierung funktioniert

**Was fehlt**:
- ❌ **Automatische Verknüpfung**: Keine Logik, die temporären Online-Buchungs-Patienten mit e-card Patient verknüpft
- ❌ **UI-Dialog**: Kein Dialog, der fragt "e-card Patient mit Web-Buchung verknüpfen?"
- ❌ **Workflow**: Kein automatischer Workflow bei e-card Stecken

**Empfehlung**:
- ✅ **Neu implementieren**: Workflow in `PatientOrganizer.tsx` oder neuer Komponente
- ✅ **Erweitern**: `ECardValidation` Komponente um Verknüpfungslogik
- ✅ **Erweitern**: Backend API um Verknüpfungs-Endpoint

---

### 2.4 Magic Link statt Passwort ❌ NICHT VORHANDEN

**Gemini-Vorschlag**: "Magic Link statt Passwort. Patient erhält nach Buchung Link: 'Meinen Termin verwalten'. Über Link gelangt er auf gesicherte Seite (Validierung durch Geburtsdatum), wo er Termin verschieben oder stornieren kann."

**Status**: ❌ **NICHT VORHANDEN**

**Bestehende Implementierung**:
- ✅ `OnlineBooking` Model vorhanden
- ✅ Bestätigungs-E-Mail wird bereits gesendet (Mock)
- ❌ Kein Magic Link System
- ❌ Kein Patientenportal für Terminverwaltung

**Was fehlt**:
- ❌ **Magic Link Generation**: Token-Generierung und Speicherung
- ❌ **Magic Link Validation**: Endpoint für Link-Validierung
- ❌ **Terminverwaltungs-UI**: Frontend-Seite für Patienten (ohne Login)
- ❌ **Validierung**: Geburtsdatum-Validierung für Zugang

**Empfehlung**:
- ✅ **Neu implementieren**: Magic Link System
- ✅ **Neu implementieren**: Patienten-Terminverwaltungs-Seite (öffentlich, ohne Login)
- ✅ **Erweitern**: `OnlineBooking` Model um `magicLink` (token, expiresAt, used)

---

### 2.5 ICS-Kalenderfile ❌ NICHT VORHANDEN

**Gemini-Vorschlag**: "In der SMS/E-Mail sollte ein ICS-Kalenderfile mitgeschickt werden, damit der Patient den Termin mit einem Klick in seinen Handy-Kalender übernehmen kann."

**Status**: ❌ **NICHT VORHANDEN**

**Bestehende Implementierung**:
- ✅ E-Mail-Versand vorhanden (Mock in `sendConfirmationEmail`)
- ❌ Kein ICS-File Generation

**Was fehlt**:
- ❌ **ICS-Generation**: Funktion zur Erstellung von .ics Dateien
- ❌ **ICS-Anhang**: ICS-File als Anhang in E-Mail
- ❌ **ICS-Download-Link**: Optional: Download-Link in E-Mail

**Empfehlung**:
- ✅ **Neu implementieren**: ICS-Generation Utility (`backend/utils/icsGenerator.js`)
- ✅ **Erweitern**: `sendConfirmationEmail` um ICS-Anhang

---

### 2.6 Online-Kontingente (Termin-Cluster) ❌ NICHT VORHANDEN

**Gemini-Vorschlag**: "Online-Kontingente. Beispiel: Montags 08:00–10:00 Uhr dürfen nur Blutabnahmen online gebucht werden, der Rest bleibt für Akutfälle (Telefon) reserviert."

**Status**: ❌ **NICHT VORHANDEN**

**Bestehende Implementierung**:
- ✅ `WeeklySchedule` für Arbeitszeiten vorhanden
- ✅ `ServiceCatalog` hat `online_bookable` Flag
- ❌ Keine zeitbasierte Einschränkung für Online-Buchungen

**Was fehlt**:
- ❌ **Kontingent-Modell**: Keine Datenstruktur für Online-Kontingente
- ❌ **Kontingent-Logik**: Keine Prüfung in Verfügbarkeitsprüfung
- ❌ **UI für Kontingent-Konfiguration**: Keine Möglichkeit, Kontingente zu konfigurieren

**Empfehlung**:
- ✅ **Neu implementieren**: Online-Kontingent System
- ✅ **Erweitern**: `ServiceCatalog` um `onlineBookingContingents[]` (dayOfWeek, startTime, endTime, allowedServices[])
- ✅ **Erweitern**: Verfügbarkeitsprüfung um Kontingent-Prüfung

---

### 2.7 Anamnese-Vorabfrage ❌ NICHT VORHANDEN

**Gemini-Vorschlag**: "Je nach Leistung könnte nach der Buchung ein Formular eingeblendet werden (z.B. 'Nehmen Sie blutverdünnende Medikamente?'). Die Antwort landet direkt im System beim Termin."

**Status**: ❌ **NICHT VORHANDEN**

**Bestehende Implementierung**:
- ✅ `ServiceCatalog` Model vorhanden
- ✅ `Appointment` Model vorhanden
- ❌ Keine Anamnese-Fragen-Struktur
- ❌ Keine Anamnese-Antworten-Struktur

**Was fehlt**:
- ❌ **Fragen-Modell**: Keine Datenstruktur für Anamnese-Fragen pro Leistung
- ❌ **Antworten-Modell**: Keine Datenstruktur für Anamnese-Antworten
- ❌ **UI für Fragen**: Kein Formular für Anamnese-Fragen im Buchungsprozess
- ❌ **UI für Antworten**: Keine Anzeige der Antworten beim Termin

**Empfehlung**:
- ✅ **Neu implementieren**: Anamnese-System
- ✅ **Erweitern**: `ServiceCatalog` um `anamnesisQuestions[]` (question, type, required)
- ✅ **Erweitern**: `OnlineBooking` um `anamnesisAnswers[]` (questionId, answer)
- ✅ **Erweitern**: `Appointment` um `anamnesisAnswers[]` (für Anzeige beim Termin)

---

### 2.8 Double Opt-In für Neupatienten ❌ NICHT VORHANDEN

**Gemini-Vorschlag**: "Um 'Fake-Buchungen' zu vermeiden, sollte ein Patient bei der ersten Buchung einen Code per E-Mail oder SMS bestätigen müssen, bevor der Termin im Kalender fest reserviert wird."

**Status**: ❌ **NICHT VORHANDEN**

**Bestehende Implementierung**:
- ✅ `OnlineBooking` Model vorhanden
- ✅ E-Mail-Versand vorhanden (Mock)
- ❌ Kein Double Opt-In System
- ❌ Keine Code-Generierung
- ❌ Keine Code-Validierung

**Was fehlt**:
- ❌ **Code-Generation**: Keine Funktion zur Generierung von Bestätigungscodes
- ❌ **Code-Validierung**: Kein Endpoint für Code-Validierung
- ❌ **Status-Tracking**: Keine Unterscheidung zwischen "nicht bestätigt" und "bestätigt"
- ❌ **UI für Code-Eingabe**: Kein Formular für Code-Eingabe

**Empfehlung**:
- ✅ **Neu implementieren**: Double Opt-In System
- ✅ **Erweitern**: `OnlineBooking` um `doubleOptIn` (required, code, verified, verifiedAt, expiresAt)
- ✅ **Erweitern**: Buchungsprozess um Code-Versand und Validierung
- ✅ **Erweitern**: Termin wird erst nach Bestätigung fest reserviert

---

### 2.9 Wartelisten-Nachrücker-Automatik ❌ NICHT VORHANDEN

**Gemini-Vorschlag**: "Ein Termin wird storniert. Das System schickt automatisch eine SMS an die ersten 3 Personen auf der Warteliste: 'Ein früherer Termin ist frei geworden. Jetzt klicken zum Umbuchen.' Wer zuerst klickt, bekommt den Termin."

**Status**: ❌ **NICHT VORHANDEN**

**Bestehende Implementierung**:
- ✅ `WaitingList` Model vorhanden
- ✅ Wartelisten-Verwaltung vorhanden
- ✅ Position-Berechnung vorhanden
- ❌ Keine automatische Benachrichtigung bei Stornierung
- ❌ Keine Multi-Benachrichtigung (3 Personen gleichzeitig)
- ❌ Keine SMS-Integration

**Was fehlt**:
- ❌ **Event-Handler**: Kein Event-Handler für Stornierungen
- ❌ **Benachrichtigungs-Logik**: Keine Logik zur Benachrichtigung von Wartelisten-Patienten
- ❌ **SMS-Integration**: Kein SMS-Gateway (Seven, Twilio, websms.at)
- ❌ **Magic Link für Umbuchung**: Kein Link zum direkten Umbuchen

**Empfehlung**:
- ✅ **Neu implementieren**: Event-basierte Benachrichtigung bei Stornierung
- ✅ **Neu implementieren**: SMS-Gateway Integration
- ✅ **Erweitern**: Wartelisten-Benachrichtigung um Multi-Benachrichtigung
- ✅ **Erweitern**: Magic Link System um Umbuchungs-Link

---

### 2.10 Erweiterte Stornierungsfristen ⚠️ TEILWEISE VORHANDEN

**Gemini-Vorschlag**: "Konfigurierbare Fristen. Beispiel: Online-Stornierung bis 24 Stunden vor Termin erlaubt. Nach Frist: 'Bitte rufen Sie uns an'."

**Status**: ⚠️ **TEILWEISE VORHANDEN**

**Bestehende Implementierung**:
- ✅ `OnlineBooking` Model vorhanden
- ✅ Stornierung möglich (über API)
- ❌ Keine konfigurierbaren Fristen
- ❌ Keine automatische Umschaltung auf "Bitte anrufen"

**Was fehlt**:
- ❌ **Fristen-Konfiguration**: Keine System-Einstellungen für Stornierungsfristen
- ❌ **Fristen-Prüfung**: Keine Prüfung in Stornierungs-Endpoint
- ❌ **UI-Anpassung**: Keine Anpassung der UI basierend auf Fristen

**Empfehlung**:
- ✅ **Erweitern**: System-Einstellungen um Stornierungsfristen
- ✅ **Erweitern**: Stornierungs-Endpoint um Fristen-Prüfung
- ✅ **Erweitern**: Magic Link UI um Fristen-basierte Anzeige

---

## 3. Zusammenfassung: Was muss gemacht werden?

### 3.1 ✅ Erweitern (Bestehende Features nutzen)

1. **Ressourcen-Integration in Online-Buchung**
   - Verfügbarkeitsprüfung erweitern (Räume/Geräte prüfen)
   - UI für Ressourcen-Auswahl im Buchungsprozess
   - **Aufwand**: Mittel (2-3 Tage)

2. **Dublettenprüfung erweitern**
   - `PatientExtended` um `isTemporary` Flag
   - Automatische Dublettenprüfung in Online-Buchung
   - `OnlineBooking` um `isKnownPatient` Flag
   - **Aufwand**: Niedrig (1 Tag)

3. **Stornierungsfristen erweitern**
   - System-Einstellungen für Fristen
   - Fristen-Prüfung in Stornierungs-Endpoint
   - **Aufwand**: Niedrig (1 Tag)

### 3.2 ✅ Neu implementieren (Neue Features)

1. **e-card Integration bei Online-Buchung**
   - Workflow für automatische Verknüpfung
   - UI-Dialog "e-card Patient mit Web-Buchung verknüpfen?"
   - **Aufwand**: Mittel (2-3 Tage)

2. **Magic Link System**
   - Token-Generierung und -Validierung
   - Patienten-Terminverwaltungs-Seite (öffentlich)
   - Geburtsdatum-Validierung
   - **Aufwand**: Mittel (3-4 Tage)

3. **ICS-Kalenderfile**
   - ICS-Generation Utility
   - ICS-Anhang in E-Mail
   - **Aufwand**: Niedrig (1 Tag)

4. **Online-Kontingente**
   - Kontingent-Modell in `ServiceCatalog`
   - Kontingent-Prüfung in Verfügbarkeitsprüfung
   - UI für Kontingent-Konfiguration
   - **Aufwand**: Mittel (2-3 Tage)

5. **Anamnese-Vorabfrage**
   - Fragen-Modell in `ServiceCatalog`
   - Antworten-Modell in `OnlineBooking` und `Appointment`
   - UI für Fragen im Buchungsprozess
   - UI für Antworten beim Termin
   - **Aufwand**: Mittel (3-4 Tage)

6. **Double Opt-In**
   - Code-Generierung und -Validierung
   - Status-Tracking (nicht bestätigt / bestätigt)
   - UI für Code-Eingabe
   - Termin wird erst nach Bestätigung reserviert
   - **Aufwand**: Mittel (2-3 Tage)

7. **Wartelisten-Nachrücker-Automatik**
   - Event-Handler für Stornierungen
   - SMS-Gateway Integration (Seven/Twilio/websms.at)
   - Multi-Benachrichtigung (3 Personen gleichzeitig)
   - Magic Link für Umbuchung
   - **Aufwand**: Hoch (4-5 Tage)

### 3.3 ❌ Nicht nötig (Bereits vorhanden)

- ✅ Ressourcen-Verwaltung (Räume, Geräte)
- ✅ Leistungsverwaltung (Kategorien, Leistungen)
- ✅ Arbeitszeiten (WeeklySchedule)
- ✅ Standorte (Multi-Standort-System)
- ✅ Warteliste (Grundfunktionalität)
- ✅ e-card Integration (Grundfunktionalität)
- ✅ Check-in System
- ✅ Patientenverwaltung
- ✅ Kalender & Terminverwaltung

---

## 4. Priorisierungsvorschlag

### Phase 1: Quick Wins (1-2 Wochen)
1. ✅ **Dublettenprüfung erweitern** (1 Tag)
2. ✅ **ICS-Kalenderfile** (1 Tag)
3. ✅ **Stornierungsfristen erweitern** (1 Tag)

### Phase 2: Kern-Features (2-3 Wochen)
4. ✅ **Ressourcen-Integration in Online-Buchung** (2-3 Tage)
5. ✅ **Magic Link System** (3-4 Tage)
6. ✅ **Double Opt-In** (2-3 Tage)

### Phase 3: Erweiterte Features (3-4 Wochen)
7. ✅ **e-card Integration bei Online-Buchung** (2-3 Tage)
8. ✅ **Online-Kontingente** (2-3 Tage)
9. ✅ **Anamnese-Vorabfrage** (3-4 Tage)

### Phase 4: Automatisierung (4-5 Wochen)
10. ✅ **Wartelisten-Nachrücker-Automatik** (4-5 Tage)

---

## 5. Entscheidungspunkte

### 5.1 Muss entschieden werden

1. **SMS-Gateway**: Welcher Anbieter? (Seven, Twilio, websms.at)
2. **Magic Link vs. Patientenportal**: Soll es zusätzlich ein vollständiges Patientenportal geben?
3. **Anamnese-Fragen**: Wer konfiguriert die Fragen? (Admin, Arzt, beide?)
4. **Online-Kontingente**: Sollen Kontingente pro Leistung oder global konfigurierbar sein?
5. **Double Opt-In**: Für alle Neupatienten oder nur bei bestimmten Leistungen?

### 5.2 Technische Entscheidungen

1. **Event-System**: Soll ein Event-System (z.B. EventEmitter) für Stornierungen verwendet werden?
2. **Background-Jobs**: Soll ein Job-Queue-System (z.B. Bull) für Benachrichtigungen verwendet werden?
3. **E-Mail-Service**: Soll ein echter E-Mail-Service (z.B. SendGrid, Mailgun) integriert werden?

---

## 6. Nächste Schritte

1. ✅ **Evaluierung abgeschlossen** (dieses Dokument)
2. ⏳ **Entscheidung über Prioritäten** (durch Benutzer)
3. ⏳ **Detaillierte Spezifikation** (für ausgewählte Features)
4. ⏳ **Implementierung** (schrittweise nach Priorität)

---

**Erstellt von**: AI Assistant  
**Datum**: 2025-12-19  
**Status**: Zur Review und Entscheidung

