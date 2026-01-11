# Online-Buchung Testen

## 1. Frontend-Test (Einfachste Methode)

### URL
```
http://localhost:3000/online-booking
```

### Voraussetzungen
1. **Service muss online buchbar sein:**
   - Service hat `online_bookable: true`
   - Service ist aktiv (`is_active: true`)

2. **Arzt/Personal muss online buchbar sein:**
   - User hat `profile.onlineBookingSettings.enabled: true` ODER
   - StaffProfile hat entsprechende Einstellungen

3. **Arbeitszeiten müssen definiert sein:**
   - WeeklySchedule für den Arzt/Personal
   - ODER `profile.onlineBookingSettings.workingHours`

### Test-Schritte im Frontend
1. Öffne `http://localhost:3000/online-booking`
2. Wähle eine Kategorie
3. Wähle einen Service
4. Wähle einen Arzt
5. Wähle ein Datum und eine Zeit
6. Fülle Patientendaten aus
7. Buche den Termin

---

## 2. API-Test mit cURL

### Schritt 1: Verfügbarkeit prüfen

```bash
# Verfügbare Zeitslots für einen Arzt abrufen
curl -X GET "http://localhost:5001/api/online-booking/availability?date=2026-01-15&doctorId=DOCTOR_ID&serviceId=SERVICE_ID" \
  -H "Content-Type: application/json"
```

**Ersetze:**
- `DOCTOR_ID`: MongoDB ObjectId eines Users (Arzt)
- `SERVICE_ID`: MongoDB ObjectId eines Services
- `date`: Datum im Format YYYY-MM-DD

**Beispiel Response:**
```json
{
  "success": true,
  "data": {
    "availableSlots": [
      "09:00",
      "09:15",
      "09:30",
      ...
    ]
  }
}
```

### Schritt 2: Kategorien abrufen

```bash
curl -X GET "http://localhost:5001/api/online-booking/categories" \
  -H "Content-Type: application/json"
```

### Schritt 3: Services abrufen

```bash
# Services für eine Kategorie
curl -X GET "http://localhost:5001/api/online-booking/services?category=CATEGORY_NAME" \
  -H "Content-Type: application/json"

# Alle Services
curl -X GET "http://localhost:5001/api/online-booking/services" \
  -H "Content-Type: application/json"
```

### Schritt 4: Ärzte abrufen

```bash
# Ärzte für einen Service
curl -X GET "http://localhost:5001/api/online-booking/doctors?serviceId=SERVICE_ID" \
  -H "Content-Type: application/json"
```

### Schritt 5: Termin buchen

```bash
curl -X POST "http://localhost:5001/api/online-booking/book" \
  -H "Content-Type: application/json" \
  -d '{
    "patient": {
      "firstName": "Max",
      "lastName": "Mustermann",
      "email": "max.mustermann@example.com",
      "phone": "+436641234567",
      "dateOfBirth": "1990-01-01",
      "gender": "m",
      "address": {
        "street": "Hauptstraße 1",
        "zipCode": "1010",
        "city": "Wien",
        "country": "Österreich"
      }
    },
    "appointment": {
      "date": "2026-01-15",
      "startTime": "09:00",
      "type": "consultation",
      "serviceId": "SERVICE_ID",
      "notes": "Test-Buchung"
    },
    "doctor": {
      "id": "DOCTOR_ID"
    }
  }'
```

**Ersetze:**
- `DOCTOR_ID`: MongoDB ObjectId eines Users (Arzt)
- `SERVICE_ID`: MongoDB ObjectId eines Services
- `date`: Verfügbares Datum
- `startTime`: Verfügbare Zeit (z.B. "09:00")

**Beispiel Response:**
```json
{
  "success": true,
  "message": "Termin erfolgreich gebucht",
  "data": {
    "bookingNumber": "OB-20260115-001",
    "appointmentDate": "2026-01-15",
    "appointmentTime": "09:00",
    "doctor": "Dr. Max Mustermann",
    "confirmationCode": "ABC123"
  }
}
```

---

## 3. Test mit Postman

### Collection erstellen

1. **GET Verfügbarkeit**
   - Method: `GET`
   - URL: `http://localhost:5001/api/online-booking/availability`
   - Query Params:
     - `date`: `2026-01-15`
     - `doctorId`: `DOCTOR_ID`
     - `serviceId`: `SERVICE_ID` (optional)

2. **GET Kategorien**
   - Method: `GET`
   - URL: `http://localhost:5001/api/online-booking/categories`

3. **GET Services**
   - Method: `GET`
   - URL: `http://localhost:5001/api/online-booking/services`
   - Query Params:
     - `category`: `CATEGORY_NAME` (optional)

4. **GET Ärzte**
   - Method: `GET`
   - URL: `http://localhost:5001/api/online-booking/doctors`
   - Query Params:
     - `serviceId`: `SERVICE_ID`

5. **POST Buchung**
   - Method: `POST`
   - URL: `http://localhost:5001/api/online-booking/book`
   - Body (JSON):
     ```json
     {
       "patient": {
         "firstName": "Max",
         "lastName": "Mustermann",
         "email": "max.mustermann@example.com",
         "phone": "+436641234567",
         "dateOfBirth": "1990-01-01",
         "gender": "m"
       },
       "appointment": {
         "date": "2026-01-15",
         "startTime": "09:00",
         "type": "consultation",
         "serviceId": "SERVICE_ID"
       },
       "doctor": {
         "id": "DOCTOR_ID"
       }
     }
     ```

---

## 4. Voraussetzungen prüfen

### Service prüfen
```bash
# Service-Details abrufen
curl -X GET "http://localhost:5001/api/service-catalog/SERVICE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Wichtig:**
- `online_bookable: true`
- `is_active: true`

### Arzt/Personal prüfen
```bash
# User-Details abrufen
curl -X GET "http://localhost:5001/api/users/USER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Wichtig:**
- User muss existieren
- StaffProfile muss existieren
- WeeklySchedule muss existieren ODER `profile.onlineBookingSettings.workingHours`

### Arbeitszeiten prüfen
```bash
# WeeklySchedule abrufen
curl -X GET "http://localhost:5001/api/weekly-schedules?staffId=STAFF_PROFILE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 5. Häufige Fehler

### "Arzt nicht gefunden"
- Prüfe ob `doctorId` korrekt ist
- Prüfe ob User existiert

### "Personalprofil für diesen Arzt nicht gefunden"
- Erstelle StaffProfile für den User
- Verknüpfe StaffProfile mit User (`userId`)

### "An diesem Tag ist keine Terminbuchung möglich"
- Prüfe WeeklySchedule für den Arzt
- Prüfe ob Arbeitszeiten für den Wochentag definiert sind
- Prüfe ob `isWorking: true` für den Tag gesetzt ist

### "Service nicht gefunden"
- Prüfe ob Service existiert
- Prüfe ob `online_bookable: true`
- Prüfe ob `is_active: true`

### "Nicht genügend Geräte verfügbar"
- Prüfe ob Geräte im Service konfiguriert sind
- Prüfe ob Geräte aktiv sind
- Prüfe ob Geräte bereits belegt sind

---

## 6. Test-Script (Node.js)

Erstelle eine Datei `test-online-booking.js`:

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api/online-booking';

async function testOnlineBooking() {
  try {
    // 1. Kategorien abrufen
    console.log('1. Lade Kategorien...');
    const categoriesResponse = await axios.get(`${BASE_URL}/categories`);
    console.log('Kategorien:', categoriesResponse.data);
    
    // 2. Services abrufen
    console.log('\n2. Lade Services...');
    const servicesResponse = await axios.get(`${BASE_URL}/services`);
    console.log('Services:', servicesResponse.data);
    
    // 3. Ärzte abrufen (mit Service-ID)
    const serviceId = servicesResponse.data.data?.[0]?._id;
    if (serviceId) {
      console.log(`\n3. Lade Ärzte für Service ${serviceId}...`);
      const doctorsResponse = await axios.get(`${BASE_URL}/doctors?serviceId=${serviceId}`);
      console.log('Ärzte:', doctorsResponse.data);
      
      // 4. Verfügbarkeit prüfen
      const doctorId = doctorsResponse.data.data?.[0]?.id;
      if (doctorId) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        
        console.log(`\n4. Prüfe Verfügbarkeit für ${dateStr}...`);
        const availabilityResponse = await axios.get(`${BASE_URL}/availability`, {
          params: {
            date: dateStr,
            doctorId: doctorId,
            serviceId: serviceId
          }
        });
        console.log('Verfügbare Slots:', availabilityResponse.data);
        
        // 5. Buchung durchführen (wenn Slots verfügbar)
        if (availabilityResponse.data.data?.availableSlots?.length > 0) {
          const slot = availabilityResponse.data.data.availableSlots[0];
          console.log(`\n5. Buche Termin um ${slot}...`);
          
          const bookingResponse = await axios.post(`${BASE_URL}/book`, {
            patient: {
              firstName: "Test",
              lastName: "Patient",
              email: "test@example.com",
              phone: "+436641234567",
              dateOfBirth: "1990-01-01",
              gender: "m"
            },
            appointment: {
              date: dateStr,
              startTime: slot,
              type: "consultation",
              serviceId: serviceId
            },
            doctor: {
              id: doctorId
            }
          });
          console.log('Buchung erfolgreich:', bookingResponse.data);
        }
      }
    }
  } catch (error) {
    console.error('Fehler:', error.response?.data || error.message);
  }
}

testOnlineBooking();
```

**Ausführen:**
```bash
node test-online-booking.js
```

---

## 7. Debug-Tipps

### Backend-Logs prüfen
```bash
# Backend-Logs anzeigen
tail -f backend/logs/combined.log

# Oder in der Konsole, wenn Backend läuft
```

### Frontend-Console prüfen
- Öffne Browser DevTools (F12)
- Prüfe Console für Fehler
- Prüfe Network-Tab für API-Requests

### MongoDB prüfen
```javascript
// In MongoDB Shell
use ordinationssoftware

// Services prüfen
db.servicecatalogs.find({ online_bookable: true, is_active: true })

// Users prüfen
db.users.find({ role: "doctor" })

// StaffProfiles prüfen
db.staffprofiles.find()

// WeeklySchedules prüfen
db.weeklyschedules.find({ isActive: true })
```

---

## 8. Quick Test Checklist

- [ ] Backend läuft auf Port 5001
- [ ] Frontend läuft auf Port 3000
- [ ] Service existiert und ist `online_bookable: true`
- [ ] Service ist `is_active: true`
- [ ] Arzt/User existiert
- [ ] StaffProfile für Arzt existiert
- [ ] WeeklySchedule für Arzt existiert
- [ ] Arbeitszeiten für den gewünschten Tag definiert
- [ ] Geräte/Räume verfügbar (falls Service diese benötigt)
- [ ] Keine TimeBlocks für den gewünschten Zeitraum
- [ ] Keine Abwesenheiten für den Arzt
