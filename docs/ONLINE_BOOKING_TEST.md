# Online-Buchung Testanleitung

Diese Anleitung erklärt, wie Sie die Online-Buchungsfunktionalität testen können.

## Voraussetzungen

Bevor Sie die Online-Buchung testen können, müssen folgende Voraussetzungen erfüllt sein:

### 1. Arzt mit Online-Buchung aktiviert

Ein Arzt muss in der Datenbank existieren und Online-Buchung aktiviert haben:

```javascript
// Arzt muss folgende Eigenschaften haben:
{
  role: 'doctor',
  isActive: true,
  'profile.onlineBookingEnabled': true
}
```

**So aktivieren Sie Online-Buchung für einen Arzt:**

1. **Über die Benutzeroberfläche:**
   - Gehen Sie zu "Personalverwaltung" → "Mitarbeiter"
   - Bearbeiten Sie einen Arzt
   - Aktivieren Sie "Online-Buchung aktiviert"

2. **Direkt in der Datenbank (für Tests):**
   ```javascript
   // In MongoDB oder über API
   db.users.updateOne(
     { email: "arzt@example.com" },
     { 
       $set: { 
         "profile.onlineBookingEnabled": true 
       } 
     }
   )
   ```

### 2. Arbeitszeiten (WeeklySchedule)

Der Arzt muss Arbeitszeiten definiert haben, damit Termine gebucht werden können:

```javascript
// WeeklySchedule für den Arzt erstellen
{
  staffId: ObjectId("..."), // Arzt-ID
  isActive: true,
  validFrom: new Date(),
  validTo: null, // oder ein zukünftiges Datum
  schedules: [
    {
      day: "monday",
      isWorking: true,
      startTime: "09:00",
      endTime: "17:00",
      breakStart: "12:00", // Optional
      breakEnd: "13:00"    // Optional
    },
    // ... weitere Tage
  ]
}
```

**So erstellen Sie Arbeitszeiten:**

1. **Über die Benutzeroberfläche:**
   - Gehen Sie zu "Kalender" → "Arbeitszeiten"
   - Erstellen Sie einen neuen Zeitplan für den Arzt
   - Definieren Sie die Arbeitszeiten für jeden Wochentag

2. **Über API:**
   ```bash
   POST /api/weekly-schedules
   {
     "staffId": "ARZT_ID",
     "isActive": true,
     "schedules": [
       {
         "day": "monday",
         "isWorking": true,
         "startTime": "09:00",
         "endTime": "17:00"
       }
     ]
   }
   ```

## Testanleitung

### Schritt 1: Online-Buchungsseite aufrufen

1. Öffnen Sie die Anwendung im Browser
2. Navigieren Sie zu: `http://localhost:3000/online-booking`
   - Oder verwenden Sie die öffentliche URL, falls konfiguriert

### Schritt 2: Arzt auswählen

1. Die Seite zeigt eine Liste aller verfügbaren Ärzte an
2. Wählen Sie einen Arzt aus, der Online-Buchung aktiviert hat
3. Klicken Sie auf "Weiter"

**Erwartetes Ergebnis:**
- Liste der Ärzte wird angezeigt
- Nur Ärzte mit `onlineBookingEnabled: true` werden angezeigt

**Mögliche Probleme:**
- **Keine Ärzte angezeigt:** 
  - Prüfen Sie, ob ein Arzt mit `onlineBookingEnabled: true` existiert
  - Prüfen Sie die Browser-Konsole auf Fehler
  - Prüfen Sie die Backend-Logs

### Schritt 3: Datum auswählen

1. Wählen Sie ein zukünftiges Datum aus
2. Das System lädt automatisch verfügbare Zeitslots

**Erwartetes Ergebnis:**
- Kalender zeigt verfügbare Termine an
- Vergangene Daten sind nicht auswählbar
- Nur Daten mit definierten Arbeitszeiten zeigen verfügbare Slots

**Mögliche Probleme:**
- **Keine Zeitslots angezeigt:**
  - Prüfen Sie, ob der Arzt Arbeitszeiten für den gewählten Wochentag hat
  - Prüfen Sie, ob bereits Termine für diese Zeiten existieren
  - Prüfen Sie die Browser-Konsole und Backend-Logs

### Schritt 4: Zeitslot auswählen

1. Wählen Sie einen verfügbaren Zeitslot aus
2. Klicken Sie auf "Weiter"

**Erwartetes Ergebnis:**
- Verfügbare Zeitslots werden angezeigt
- Slots außerhalb der Arbeitszeiten sind nicht verfügbar
- Slots in Pausenzeiten sind nicht verfügbar

### Schritt 5: Patientendaten eingeben

1. Füllen Sie das Formular aus:
   - Vorname
   - Nachname
   - E-Mail
   - Telefon
   - Geburtsdatum
   - Sozialversicherungsnummer (optional)
   - Grund des Termins
   - Notizen (optional)

2. Klicken Sie auf "Termin buchen"

**Erwartetes Ergebnis:**
- Formular validiert alle Eingaben
- Bei erfolgreicher Buchung wird eine Bestätigung angezeigt
- Eine Buchungsnummer wird generiert

**Mögliche Probleme:**
- **Validierungsfehler:**
  - Prüfen Sie, ob alle Pflichtfelder ausgefüllt sind
  - Prüfen Sie, ob die E-Mail-Adresse gültig ist
  - Prüfen Sie, ob das Geburtsdatum im richtigen Format ist

### Schritt 6: Bestätigung prüfen

1. Nach erfolgreicher Buchung wird eine Bestätigungsseite angezeigt
2. Notieren Sie sich die Buchungsnummer

**Erwartetes Ergebnis:**
- Bestätigungsseite zeigt:
  - Buchungsnummer
  - Termindatum und -zeit
  - Arztname
  - Patientendaten

## API-Endpunkte zum Testen

### 1. Verfügbare Ärzte abrufen

```bash
GET /api/online-booking/doctors

# Erwartete Antwort:
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Dr. Max Mustermann",
      "specialization": "Allgemeinmedizin",
      "workingHours": {...}
    }
  ]
}
```

### 2. Verfügbarkeit prüfen

```bash
GET /api/online-booking/availability?doctorId=ARZT_ID&date=2024-01-15&duration=30

# Erwartete Antwort:
{
  "success": true,
  "data": {
    "availableSlots": [
      {
        "start": "09:00",
        "end": "09:30",
        "duration": 30
      },
      ...
    ]
  }
}
```

### 3. Termin buchen

```bash
POST /api/online-booking/book
Content-Type: application/json

{
  "patient": {
    "firstName": "Max",
    "lastName": "Mustermann",
    "email": "max@example.com",
    "phone": "+43 123 456789",
    "dateOfBirth": "1990-01-01",
    "insuranceNumber": "1234567890"
  },
  "appointment": {
    "date": "2024-01-15",
    "startTime": "09:00",
    "type": "Allgemeine Beratung",
    "reason": "Vorsorgeuntersuchung",
    "notes": "Erste Terminbuchung"
  },
  "doctor": {
    "id": "ARZT_ID"
  }
}

# Erwartete Antwort:
{
  "success": true,
  "message": "Termin erfolgreich gebucht",
  "data": {
    "bookingNumber": "OB-2024-001234",
    "appointment": {...},
    "patient": {...}
  }
}
```

### 4. Buchungsstatus prüfen

```bash
GET /api/online-booking/status/OB-2024-001234

# Erwartete Antwort:
{
  "success": true,
  "data": {
    "bookingNumber": "OB-2024-001234",
    "status": "confirmed",
    "appointment": {...}
  }
}
```

### 5. Buchung stornieren

```bash
PUT /api/online-booking/cancel/OB-2024-001234

# Erwartete Antwort:
{
  "success": true,
  "message": "Buchung erfolgreich storniert"
}
```

## Test-Szenarien

### Szenario 1: Erfolgreiche Buchung

1. ✅ Arzt mit Online-Buchung aktiviert
2. ✅ Arbeitszeiten definiert
3. ✅ Verfügbares Datum auswählen
4. ✅ Gültige Patientendaten eingeben
5. ✅ Buchung erfolgreich

**Erwartetes Ergebnis:**
- Termin wird in der Datenbank erstellt
- OnlineBooking-Eintrag wird erstellt
- Appointment-Eintrag wird erstellt
- Bestätigungs-E-Mail wird gesendet (Mock)

### Szenario 2: Keine Verfügbarkeit

1. ✅ Arzt auswählen
2. ✅ Datum ohne Arbeitszeiten auswählen
3. ❌ Keine Zeitslots verfügbar

**Erwartetes Ergebnis:**
- Meldung: "An diesem Tag ist keine Terminbuchung möglich"

### Szenario 3: Doppelte Buchung

1. ✅ Termin buchen
2. ✅ Gleichen Zeitslot erneut buchen
3. ❌ Zweite Buchung sollte fehlschlagen

**Erwartetes Ergebnis:**
- Fehlermeldung: "Termin bereits belegt"

### Szenario 4: Vergangenes Datum

1. ✅ Arzt auswählen
2. ❌ Vergangenes Datum auswählen
3. ❌ Keine Zeitslots verfügbar

**Erwartetes Ergebnis:**
- Vergangene Daten sind nicht auswählbar

### Szenario 5: Stornierung

1. ✅ Termin buchen
2. ✅ Buchungsnummer notieren
3. ✅ Buchung stornieren

**Erwartetes Ergebnis:**
- Status ändert sich zu "cancelled"
- Termin wird aus der Verfügbarkeit entfernt

## Debugging

### Browser-Konsole prüfen

Öffnen Sie die Entwicklertools (F12) und prüfen Sie:
- Netzwerk-Tab: API-Aufrufe und Antworten
- Console-Tab: JavaScript-Fehler
- Application-Tab: LocalStorage/SessionStorage

### Backend-Logs prüfen

```bash
# Backend-Logs anzeigen
# Prüfen Sie die Konsolen-Ausgabe für:
- API-Aufrufe
- Datenbankabfragen
- Fehlermeldungen
```

### Datenbank prüfen

```javascript
// Prüfen Sie die folgenden Collections:
db.onlinebookings.find()  // Online-Buchungen
db.appointments.find()     // Termine
db.users.find({ "profile.onlineBookingEnabled": true })  // Ärzte mit Online-Buchung
db.weeklyschedules.find()  // Arbeitszeiten
```

## Häufige Probleme und Lösungen

### Problem: Keine Ärzte werden angezeigt

**Lösung:**
1. Prüfen Sie, ob ein Arzt mit `onlineBookingEnabled: true` existiert
2. Prüfen Sie die API-Antwort: `GET /api/online-booking/doctors`
3. Prüfen Sie die Browser-Konsole auf Fehler

### Problem: Keine Zeitslots verfügbar

**Lösung:**
1. Prüfen Sie, ob der Arzt Arbeitszeiten für den gewählten Wochentag hat
2. Prüfen Sie, ob bereits Termine für diese Zeiten existieren
3. Prüfen Sie die API-Antwort: `GET /api/online-booking/availability`

### Problem: Buchung schlägt fehl

**Lösung:**
1. Prüfen Sie die Validierungsfehler in der API-Antwort
2. Prüfen Sie, ob alle Pflichtfelder ausgefüllt sind
3. Prüfen Sie die Backend-Logs auf Fehler
4. Prüfen Sie, ob der Zeitslot noch verfügbar ist

### Problem: Termin wird nicht im Kalender angezeigt

**Lösung:**
1. Prüfen Sie, ob der Termin in der Datenbank erstellt wurde
2. Prüfen Sie, ob der Termin den richtigen Status hat
3. Aktualisieren Sie die Kalenderansicht

## Test-Daten erstellen

### Arzt mit Online-Buchung erstellen

```javascript
// Über MongoDB
db.users.insertOne({
  email: "testarzt@example.com",
  firstName: "Test",
  lastName: "Arzt",
  role: "doctor",
  isActive: true,
  profile: {
    onlineBookingEnabled: true,
    specialization: "Allgemeinmedizin"
  }
})
```

### Arbeitszeiten erstellen

```javascript
// Über MongoDB
db.weeklyschedules.insertOne({
  staffId: ObjectId("ARZT_ID"),
  isActive: true,
  validFrom: new Date(),
  validTo: null,
  schedules: [
    {
      day: "monday",
      isWorking: true,
      startTime: "09:00",
      endTime: "17:00",
      breakStart: "12:00",
      breakEnd: "13:00"
    },
    {
      day: "tuesday",
      isWorking: true,
      startTime: "09:00",
      endTime: "17:00"
    },
    // ... weitere Tage
  ]
})
```

## Weitere Informationen

- **Frontend-Komponente:** `frontend/src/pages/OnlineBooking.tsx`
- **Backend-Routen:** `backend/routes/onlineBooking.js`
- **Datenmodell:** `backend/models/OnlineBooking.js`
- **API-Dokumentation:** Siehe Backend-Routen für detaillierte API-Dokumentation

## Support

Bei Problemen oder Fragen:
1. Prüfen Sie die Browser-Konsole
2. Prüfen Sie die Backend-Logs
3. Prüfen Sie die Datenbank
4. Erstellen Sie ein Issue mit detaillierten Informationen

