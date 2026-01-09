# Phase 4: Wartelisten-Nachrücker-Automatik - Testanleitung

## Übersicht

Diese Anleitung beschreibt, wie Sie die Wartelisten-Nachrücker-Automatik (Fast Track) testen können.

## Voraussetzungen

### 1. SMS-Gateway Konfiguration (Optional für Tests)

Für echte SMS-Benachrichtigungen benötigen Sie einen SMS-Provider. Für Tests können Sie auch den Mock-Modus verwenden.

#### Option A: Seven.io (Empfohlen für Österreich)
```env
SMS_PROVIDER=seven
SEVEN_API_KEY=your_api_key_here
SEVEN_FROM=Ordination
```

#### Option B: Twilio
```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

#### Option C: websms.at
```env
SMS_PROVIDER=websms
WEBSMS_USERNAME=your_username
WEBSMS_PASSWORD=your_password
WEBSMS_FROM=Ordination
```

#### Option D: Mock-Modus (für Tests ohne echtes SMS-Gateway)
Falls kein SMS-Gateway konfiguriert ist, werden SMS-Benachrichtigungen in der Konsole geloggt, aber nicht tatsächlich gesendet.

### 2. System-Einstellungen konfigurieren

Die folgenden Einstellungen können über die System-Einstellungen oder direkt in der Datenbank konfiguriert werden:

```javascript
// In MongoDB oder über API
{
  category: 'onlineBooking',
  key: 'waitingListMaxNotifications',
  value: 3,  // Anzahl der gleichzeitig benachrichtigten Patienten
  type: 'number'
}

{
  category: 'onlineBooking',
  key: 'waitingListNotificationMethod',
  value: 'both',  // 'sms', 'email', oder 'both'
  type: 'string'
}
```

## Test-Szenario 1: Vollständiger Workflow

### Schritt 1: Wartelisten-Einträge erstellen

1. **Gehen Sie zur Wartelisten-Verwaltung**
   - Navigieren Sie zu: `/waiting-list` (oder entsprechendem Menüpunkt)
   - Erstellen Sie mindestens 3 Wartelisten-Einträge für denselben Service/Arzt

2. **Wartelisten-Einträge über API erstellen** (Alternative)
```bash
# Eintrag 1 (hohe Priorität)
curl -X POST http://localhost:5001/api/waiting-list \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient": "PATIENT_ID_1",
    "service": "SERVICE_ID",
    "doctor": "DOCTOR_ID",
    "reason": "Früherer Termin gewünscht",
    "priority": "high",
    "contactMethod": "sms"
  }'

# Eintrag 2 (normale Priorität)
curl -X POST http://localhost:5001/api/waiting-list \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient": "PATIENT_ID_2",
    "service": "SERVICE_ID",
    "doctor": "DOCTOR_ID",
    "reason": "Früherer Termin gewünscht",
    "priority": "normal",
    "contactMethod": "sms"
  }'

# Eintrag 3 (normale Priorität)
curl -X POST http://localhost:5001/api/waiting-list \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient": "PATIENT_ID_3",
    "service": "SERVICE_ID",
    "doctor": "DOCTOR_ID",
    "reason": "Früherer Termin gewünscht",
    "priority": "normal",
    "contactMethod": "email"
  }'
```

### Schritt 2: Termin erstellen und stornieren

1. **Erstellen Sie einen Termin**
   - Gehen Sie zur Terminverwaltung
   - Erstellen Sie einen Termin für den gleichen Service/Arzt wie die Wartelisten-Einträge
   - Notieren Sie sich die Termin-ID

2. **Stornieren Sie den Termin**

   **Option A: Über die UI**
   - Öffnen Sie den Termin
   - Klicken Sie auf "Stornieren" oder ändern Sie den Status zu "abgesagt"

   **Option B: Über die API**
```bash
curl -X PUT http://localhost:5001/api/appointments/APPOINTMENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "cancelled"
  }'
```

   **Option C: Online-Buchung stornieren**
```bash
curl -X PUT http://localhost:5001/api/online-booking/cancel/BOOKING_NUMBER \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Test-Stornierung"
  }'
```

### Schritt 3: Prüfen Sie die Benachrichtigungen

1. **Backend-Logs prüfen**
   - Schauen Sie in die Backend-Konsole
   - Sie sollten Logs sehen wie:
     ```
     [WaitingListNotification] Prüfe Warteliste für stornierten Termin: ...
     [WaitingListNotification] Benachrichtige 3 Patienten
     [SMS] SMS erfolgreich gesendet an +43... via seven
     ```

2. **E-Mails prüfen**
   - Prüfen Sie die E-Mail-Postfächer der Patienten
   - Sie sollten E-Mails mit Magic Links erhalten

3. **SMS prüfen** (falls konfiguriert)
   - Prüfen Sie die Telefone der Patienten
   - Sie sollten SMS mit Magic Links erhalten

### Schritt 4: Magic Link Reservierung testen

1. **Magic Link aus E-Mail/SMS kopieren**
   - Der Link sollte so aussehen: `http://localhost:3000/waiting-list-reservation/TOKEN`

2. **Link in Browser öffnen**
   - Die Seite sollte Termindetails anzeigen
   - Geburtsdatum-Eingabefeld sollte sichtbar sein

3. **Geburtsdatum eingeben und reservieren**
   - Geben Sie das korrekte Geburtsdatum ein
   - Klicken Sie auf "Termin jetzt reservieren"
   - Sie sollten eine Erfolgsmeldung sehen

4. **Termin prüfen**
   - Gehen Sie zur Terminverwaltung
   - Der Termin sollte jetzt dem Wartelisten-Patienten zugeordnet sein
   - Status sollte "geplant" sein

## Test-Szenario 2: Multi-Benachrichtigung

### Ziel: Prüfen, dass mehrere Patienten gleichzeitig benachrichtigt werden

1. **Erstellen Sie 5 Wartelisten-Einträge** für denselben Service/Arzt
2. **Stornieren Sie einen Termin**
3. **Prüfen Sie die Logs**: Es sollten nur die ersten 3 Patienten benachrichtigt werden (Standard-Einstellung)
4. **Ändern Sie die Einstellung** auf 5 und wiederholen Sie den Test

## Test-Szenario 3: Prioritäts-Sortierung

### Ziel: Prüfen, dass Patienten mit höherer Priorität zuerst benachrichtigt werden

1. **Erstellen Sie Wartelisten-Einträge mit verschiedenen Prioritäten**:
   - 1x "urgent"
   - 2x "high"
   - 2x "normal"
   - 1x "low"

2. **Stornieren Sie einen Termin**
3. **Prüfen Sie die Logs**: Die ersten 3 benachrichtigten Patienten sollten die höchste Priorität haben

## Test-Szenario 4: Matching-Logik

### Ziel: Prüfen, dass nur passende Wartelisten-Einträge benachrichtigt werden

1. **Erstellen Sie Wartelisten-Einträge**:
   - Eintrag 1: Service A, Arzt X
   - Eintrag 2: Service B, Arzt X
   - Eintrag 3: Service A, Arzt Y

2. **Stornieren Sie einen Termin** für Service A, Arzt X
3. **Prüfen Sie**: Nur Eintrag 1 sollte benachrichtigt werden

## Test-Szenario 5: Ablaufzeit (Expiry)

### Ziel: Prüfen, dass abgelaufene Links nicht funktionieren

1. **Erstellen Sie einen Wartelisten-Eintrag und stornieren Sie einen Termin**
2. **Warten Sie 24 Stunden** (oder ändern Sie `reservationExpiresAt` in der Datenbank)
3. **Versuchen Sie, den Magic Link zu öffnen**
4. **Erwartetes Ergebnis**: Fehlermeldung "Link abgelaufen"

## Test-Szenario 6: Race Condition (Wer zuerst kommt)

### Ziel: Prüfen, dass nur der erste Klick den Termin bekommt

1. **Benachrichtigen Sie 3 Patienten** (alle erhalten denselben Termin-Link)
2. **Öffnen Sie den Link in 3 verschiedenen Browsern gleichzeitig**
3. **Reservieren Sie den Termin in allen 3 Browsern**
4. **Erwartetes Ergebnis**: Nur die erste Reservierung sollte erfolgreich sein, die anderen sollten eine Fehlermeldung erhalten

## Debugging

### Backend-Logs aktivieren

Die folgenden Logs helfen beim Debugging:

```javascript
// In backend/routes/onlineBooking.js oder appointments.js
console.log('[WaitingListNotification] Stornierung erkannt:', appointment._id);

// In backend/services/waitingListNotificationService.js
console.log('[WaitingListNotification] Gefundene Wartelisten-Einträge:', entries.length);
console.log('[WaitingListNotification] Benachrichtige Patienten:', entriesToNotify.map(e => e.patient));
```

### Datenbank prüfen

```javascript
// Prüfen Sie Wartelisten-Einträge
db.waitinglists.find({ status: 'waiting' })

// Prüfen Sie Reservierungs-Tokens
db.waitinglists.find({ reservationToken: { $exists: true } })

// Prüfen Sie stornierte Termine
db.appointments.find({ status: 'cancelled' })
```

### API-Endpunkte testen

```bash
# Reservierungsdetails abrufen
curl http://localhost:5001/api/online-booking/waiting-list-reservation/TOKEN

# Termin reservieren
curl -X POST http://localhost:5001/api/online-booking/waiting-list-reservation/TOKEN \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "PATIENT_ID"
  }'
```

## Häufige Probleme

### Problem 1: Keine Benachrichtigungen werden gesendet

**Lösung:**
- Prüfen Sie, ob Wartelisten-Einträge mit passendem Service/Arzt existieren
- Prüfen Sie die Backend-Logs auf Fehler
- Prüfen Sie, ob SMS/E-Mail-Service korrekt konfiguriert ist

### Problem 2: SMS werden nicht gesendet

**Lösung:**
- Prüfen Sie die SMS-Gateway-Konfiguration
- Prüfen Sie die Telefonnummern-Formatierung (muss international sein: +43...)
- Prüfen Sie die Backend-Logs für SMS-Fehler

### Problem 3: Magic Link funktioniert nicht

**Lösung:**
- Prüfen Sie, ob der Token in der Datenbank existiert
- Prüfen Sie, ob `reservationExpiresAt` noch in der Zukunft liegt
- Prüfen Sie, ob der Termin noch den Status "cancelled" hat

### Problem 4: Falsche Patienten werden benachrichtigt

**Lösung:**
- Prüfen Sie die Matching-Logik (Service, Arzt, Standort müssen übereinstimmen)
- Prüfen Sie die Prioritäts-Sortierung
- Prüfen Sie die Position-Berechnung in der Warteliste

## Manuelle Tests über die Datenbank

Falls Sie die Funktionalität direkt in der Datenbank testen möchten:

```javascript
// 1. Erstellen Sie einen stornierten Termin
const appointment = await Appointment.findOne({ ... });
appointment.status = 'cancelled';
await appointment.save();

// 2. Rufen Sie den Service manuell auf
const waitingListNotificationService = require('./services/waitingListNotificationService');
const result = await waitingListNotificationService.notifyWaitingListPatients(appointment);
console.log('Benachrichtigungen gesendet:', result);
```

## Nächste Schritte

Nach erfolgreichen Tests können Sie:
1. Die SMS-Gateway-Konfiguration für Produktion einrichten
2. Die Anzahl der gleichzeitig benachrichtigten Patienten anpassen
3. Die Benachrichtigungsmethode (SMS, E-Mail, beide) konfigurieren
4. Die Ablaufzeit für Magic Links anpassen (aktuell 24 Stunden)

