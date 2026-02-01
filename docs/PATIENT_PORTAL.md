# Patient Portal (Magic-Link-Terminverwaltung)

## Konzept

Patienten erhalten nach einer Online-Buchung per E-Mail einen Link zur **Terminverwaltung** („Termin verwalten“). Über diesen Link können sie ohne Login:

- ihren Termin einsehen (Arzt, Datum/Uhrzeit, Adresse, Buchungsnummer, Status),
- den Termin bis zur konfigurierten Stornierungsfrist **stornieren**,
- den Termin als **.ics-Datei** in den Kalender exportieren.

Der Zugriff erfolgt ausschließlich über einen einmaligen, zeitlich begrenzten **Management-Token** (`managementToken`) im Link. Es ist kein Benutzerkonto nötig.

## Ablauf

1. **Buchung**  
   Patient bucht online (oder nach Double-Opt-In). Beim Anlegen des Appointments wird ein `managementToken` (z. B. 32 Bytes hex) gesetzt und `managementTokenExpires` (z. B. 90 Tage nach Terminende).

2. **E-Mail**  
   In der Buchungsbestätigung steht ein Link:  
   `{FRONTEND_URL}/portal/appointment/{managementToken}`

3. **Portal-Seite**  
   - Frontend ruft `GET /api/portal/appointment/:token` auf.
   - Bei gültigem, nicht abgelaufenem Token werden Termindaten und Stornierungsmöglichkeit angezeigt.
   - Optional: „Zum Kalender hinzufügen“ erzeugt clientseitig eine .ics-Datei (UTC-Zeiten).

4. **Stornierung**  
   - Patient klickt „Termin stornieren“ und bestätigt.
   - Frontend sendet `POST /api/portal/appointment/:token/cancel`.
   - Backend prüft Stornierungsfrist und `allowOnlineCancellation` (SystemSettings), setzt Status auf `abgesagt` und invalidiert den Token (optional: Token löschen, damit der Link nicht mehr nutzbar ist).

## Technische Details

### Backend

- **Routen:** `backend/routes/patientPortal.js`
  - `GET /api/portal/appointment/:token` – Termin abrufen (öffentlich).
  - `POST /api/portal/appointment/:token/cancel` – Termin stornieren (öffentlich).
- **Model:** `Appointment` mit Feldern `managementToken`, `managementTokenExpires`.
- **Stornierungslogik:** Nutzung von SystemSettings (Kategorie `onlineBooking`):
  - `cancellationDeadlineHours` (Standard 24),
  - `allowOnlineCancellation` (Standard true),
  - `cancellationPhoneNumber` (optional, wird bei Fristüberschreitung/Deaktivierung angezeigt).
- **Rate Limiting:** In `server.js` ist für `/api/portal` ein Limiter konfiguriert (z. B. 10 Anfragen pro IP und Minute), um Brute-Force und Missbrauch zu begrenzen.

### Frontend

- **Route:** `/portal/appointment/:token` (öffentlich, ohne Layout/Header/Sidebar).
- **Seite:** `frontend/src/pages/AppointmentManagementPage.tsx`
  - Lädt Termin per `GET /api/portal/appointment/:token`.
  - Anzeige: Arzt, Datum/Uhrzeit, Adresse, Buchungsnummer, Status.
  - Buttons: „Zum Kalender hinzufügen“ (.ics-Download), „Termin stornieren“ (mit Bestätigungsdialog).
  - Bei ungültigem/abgelaufenem Token: klare Fehlermeldung.
- **SEO:** Die Seite setzt `<meta name="robots" content="noindex, nofollow" />`, damit Suchmaschinen den persönlichen Link nicht indexieren.

### .ics-Export

- Erzeugung im Browser aus den angezeigten Termindaten.
- Zeiten werden in UTC ausgegeben (`DTSTART`/`DTEND` mit Suffix `Z`), um Zeitzonenverschiebungen zu vermeiden.

### Sicherheit und Datenschutz

- Kein Login; Berechtigung nur über den Token.
- Token abgelaufen → 410 und Hinweis „Link abgelaufen“.
- Nach Stornierung kann der Token ungültig gemacht werden; der Link führt dann nicht mehr zu einer Stornierung.
- Rate Limiting reduziert Risiko von Token-Scanning.
- Portal-API liefert nur die für die Anzeige nötigen, datensparsamen Daten (keine sensiblen Patientendaten in der Antwort).

## Siehe auch

- Online-Buchung: `docs/ONLINE_BOOKING_CONCEPT.md`, `backend/routes/onlineBooking.js` (Erzeugung von `managementToken` und Versand des Portal-Links in der Bestätigungs-E-Mail).
- Einstellungen Stornierung: Einstellungen → Online-Buchung (Stornierungsfrist, Erlaubnis Online-Storno, Telefonnummer).
