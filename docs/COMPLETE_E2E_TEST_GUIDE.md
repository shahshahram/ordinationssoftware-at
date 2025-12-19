# Kompletter End-to-End Test: Alle 4 Phasen der Online-Buchung

## Übersicht

Diese Anleitung führt Sie durch einen vollständigen Test aller implementierten Features der Online-Buchung, von Phase 1 bis Phase 4.

## Voraussetzungen

### 1. System-Konfiguration

Stellen Sie sicher, dass folgende Einstellungen konfiguriert sind:

```env
# Frontend URL
FRONTEND_URL=http://localhost:3000

# E-Mail (für Bestätigungen, ICS, Double Opt-In)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_password

# SMS (optional, für Phase 4)
SMS_PROVIDER=seven
SEVEN_API_KEY=your_api_key
SEVEN_FROM=Ordination

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ordinationssoftware
```

### 2. System-Einstellungen in der Datenbank

```javascript
// SystemSettings konfigurieren
{
  category: 'onlineBooking',
  key: 'cancellationDeadlineHours',
  value: 24,
  type: 'number'
},
{
  category: 'onlineBooking',
  key: 'allowOnlineCancellation',
  value: true,
  type: 'boolean'
},
{
  category: 'onlineBooking',
  key: 'requireDoubleOptIn',
  value: true,  // Für Phase 2.3 Test
  type: 'boolean'
},
{
  category: 'onlineBooking',
  key: 'waitingListMaxNotifications',
  value: 3,
  type: 'number'
},
{
  category: 'onlineBooking',
  key: 'waitingListNotificationMethod',
  value: 'both',  // SMS + E-Mail
  type: 'string'
}
```

## Kompletter Test-Workflow

### Phase 0: Vorbereitung

#### Schritt 1: Arzt für Online-Buchung aktivieren

1. Gehen Sie zu `/staff-management`
2. Bearbeiten Sie einen Arzt
3. Aktivieren Sie "Online-Buchung aktiviert"
4. Speichern Sie

**Oder über API:**
```bash
# Finde Arzt
curl http://localhost:5001/api/users?role=doctor

# Aktiviere Online-Buchung
curl -X PUT http://localhost:5001/api/users/USER_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "onlineBookingEnabled": true
    }
  }'
```

#### Schritt 2: Service für Online-Buchung konfigurieren

1. Gehen Sie zu `/service-catalog`
2. Erstellen oder bearbeiten Sie einen Service
3. Aktivieren Sie "Online buchbar"
4. **Phase 3.2: Online-Kontingente konfigurieren** (optional):
   - Tab "Online-Kontingente"
   - Fügen Sie ein Kontingent hinzu (z.B. Mo-Fr, 09:00-12:00, max 5 Buchungen)
5. **Phase 3.3: Anamnese-Fragen hinzufügen** (optional):
   - Tab "Anamnese"
   - Fügen Sie Fragen hinzu (z.B. "Haben Sie Allergien?", Typ: boolean)
6. Speichern Sie

#### Schritt 3: Arbeitszeiten konfigurieren

1. Gehen Sie zu `/staff-management`
2. Bearbeiten Sie den Arzt
3. Konfigurieren Sie die Arbeitszeiten (WeeklySchedule)
4. Speichern Sie

---

## Phase 1: Quick Wins

### Test 1.1: Dublettenprüfung

**Ziel:** Prüfen, ob bekannte Patienten erkannt werden

#### Schritt 1: Bekannten Patienten erstellen
```bash
# Erstelle einen Patienten über die UI oder API
# Notieren Sie: Email, Name, Geburtsdatum
```

#### Schritt 2: Online-Buchung mit gleichen Daten
1. Gehen Sie zu `/online-booking`
2. Wählen Sie den Arzt
3. Wählen Sie Datum und Zeit
4. Geben Sie **die gleichen Daten** wie beim bekannten Patienten ein
5. Buchen Sie den Termin

#### Schritt 3: Prüfen Sie das Ergebnis
- **Erwartung:** Patient wird als "bekannt" erkannt
- **In Datenbank:** `OnlineBooking.isKnownPatient = true`
- **Kein Double Opt-In erforderlich** (wenn konfiguriert)

### Test 1.2: ICS-Kalenderfile

**Ziel:** Prüfen, ob ICS-Datei in E-Mail enthalten ist

#### Schritt 1: Buchung durchführen
1. Führen Sie eine Online-Buchung durch
2. Prüfen Sie die E-Mail-Bestätigung

#### Schritt 2: Prüfen Sie die E-Mail
- **Erwartung:** E-Mail enthält ICS-Anhang
- **ICS-Datei:** Kann in Kalender importiert werden
- **In Datenbank:** `OnlineBooking.confirmation.icsSent = true`

### Test 1.3: Stornierungsfristen

**Ziel:** Prüfen, ob Stornierungsfristen eingehalten werden

#### Schritt 1: Termin in der Zukunft buchen
1. Buchen Sie einen Termin für morgen

#### Schritt 2: Stornierung innerhalb der Frist
1. Gehen Sie zu `/patient-booking/:token` (Magic Link aus E-Mail)
2. Versuchen Sie, den Termin zu stornieren
3. **Erwartung:** Stornierung erfolgreich

#### Schritt 3: Stornierung außerhalb der Frist
1. Ändern Sie in der Datenbank: `cancellationDeadlineHours = 48`
2. Buchen Sie einen Termin für übermorgen
3. Versuchen Sie, den Termin zu stornieren (innerhalb von 24h)
4. **Erwartung:** Fehlermeldung "Stornierung nur bis 48h vor Termin möglich"

---

## Phase 2: Core Features

### Test 2.1: Ressourcen-Integration

**Ziel:** Prüfen, ob Räume und Geräte bei der Buchung berücksichtigt werden

#### Schritt 1: Service mit Ressourcen-Anforderungen konfigurieren
1. Gehen Sie zu `/service-catalog`
2. Bearbeiten Sie einen Service
3. Aktivieren Sie:
   - "Raum-Auswahl erforderlich"
   - "Geräte-Auswahl erforderlich"
4. Speichern Sie

#### Schritt 2: Online-Buchung mit Ressourcen
1. Gehen Sie zu `/online-booking`
2. Wählen Sie den Service (mit Ressourcen-Anforderungen)
3. Wählen Sie Arzt, Datum, Zeit
4. **Erwartung:** Felder für Raum- und Geräte-Auswahl erscheinen
5. Wählen Sie einen Raum und ein Gerät
6. Buchen Sie den Termin

#### Schritt 3: Prüfen Sie das Ergebnis
- **In Datenbank:** `Appointment.assigned_rooms` und `assigned_devices` sind gesetzt
- **Termin-Detail:** Zeigt zugewiesene Ressourcen

### Test 2.2: Magic Link System

**Ziel:** Prüfen, ob Patienten über Magic Link ihren Termin verwalten können

#### Schritt 1: Buchung durchführen
1. Führen Sie eine Online-Buchung durch
2. Prüfen Sie die E-Mail-Bestätigung

#### Schritt 2: Magic Link öffnen
1. Kopieren Sie den Magic Link aus der E-Mail
2. Öffnen Sie ihn in einem Browser
3. **Erwartung:** Termindetails werden angezeigt

#### Schritt 3: Termin stornieren über Magic Link
1. Klicken Sie auf "Termin stornieren"
2. Geben Sie einen Grund ein
3. Bestätigen Sie
4. **Erwartung:** Termin wird storniert

#### Schritt 4: Magic Link Validierung
1. Versuchen Sie, den Link erneut zu öffnen
2. **Erwartung:** Link funktioniert weiterhin (max. 10 Zugriffe)

### Test 2.3: Double Opt-In

**Ziel:** Prüfen, ob neue Patienten einen Bestätigungscode erhalten

#### Schritt 1: Double Opt-In aktivieren
```javascript
// In SystemSettings
{
  category: 'onlineBooking',
  key: 'requireDoubleOptIn',
  value: true
}
```

#### Schritt 2: Buchung mit neuem Patienten
1. Gehen Sie zu `/online-booking`
2. Geben Sie **neue Patientendaten** ein (nicht in Datenbank vorhanden)
3. Buchen Sie den Termin

#### Schritt 3: Prüfen Sie die E-Mail
- **Erwartung:** E-Mail mit 6-stelligem Code
- **In Datenbank:** `OnlineBooking.status = 'pending'`
- **In Datenbank:** `OnlineBooking.doubleOptIn.code` ist gesetzt

#### Schritt 4: Code eingeben
1. Öffnen Sie `/online-booking` erneut
2. **Erwartung:** Dialog für Code-Eingabe erscheint
3. Geben Sie den Code ein
4. **Erwartung:** Termin wird bestätigt, `Appointment` wird erstellt

#### Schritt 5: Code erneut senden
1. Klicken Sie auf "Code erneut senden"
2. **Erwartung:** Neuer Code wird gesendet

---

## Phase 3: Extended Features

### Test 3.1: e-card Integration

**Ziel:** Prüfen, ob temporäre Patienten mit e-card verknüpft werden können

#### Schritt 1: Temporären Patienten durch Online-Buchung erstellen
1. Führen Sie eine Online-Buchung mit neuen Patientendaten durch
2. **Erwartung:** `PatientExtended.isTemporary = true`

#### Schritt 2: e-card einlesen
1. Gehen Sie zur Terminverwaltung
2. Öffnen Sie den Termin
3. Tab "e-card"
4. Lesen Sie eine e-card ein (GINA-Box)

#### Schritt 3: Temporären Patienten verknüpfen
1. **Erwartung:** Dialog "e-card Patient mit Web-Buchung verknüpfen?" erscheint
2. Wählen Sie den passenden temporären Patienten
3. Klicken Sie auf "e-card verknüpfen"
4. **Erwartung:** Patientendaten werden aktualisiert, `isTemporary = false`

### Test 3.2: Online-Kontingente

**Ziel:** Prüfen, ob Online-Kontingente die Verfügbarkeit einschränken

#### Schritt 1: Kontingent konfigurieren
1. Gehen Sie zu `/service-catalog`
2. Bearbeiten Sie einen Service
3. Tab "Online-Kontingente"
4. Fügen Sie ein Kontingent hinzu:
   - Zeitfenster: 09:00-12:00
   - Wochentage: Montag, Dienstag, Mittwoch
   - Max. Online-Buchungen: 2
5. Speichern Sie

#### Schritt 2: Verfügbarkeit prüfen
1. Gehen Sie zu `/online-booking`
2. Wählen Sie den Service
3. Wählen Sie einen Montag
4. **Erwartung:** Nur Slots zwischen 09:00-12:00 sind verfügbar

#### Schritt 3: Kontingent-Limit testen
1. Buchen Sie 2 Termine für Montag 10:00 (über Online-Buchung)
2. Versuchen Sie, einen 3. Termin für Montag 11:00 zu buchen
3. **Erwartung:** Slot ist nicht mehr verfügbar (Kontingent erreicht)

### Test 3.3: Anamnese-Vorabfrage

**Ziel:** Prüfen, ob Anamnese-Fragen im Buchungsprozess angezeigt werden

#### Schritt 1: Anamnese-Fragen konfigurieren
1. Gehen Sie zu `/service-catalog`
2. Bearbeiten Sie einen Service
3. Tab "Anamnese"
4. Fügen Sie Fragen hinzu:
   - "Haben Sie Allergien?" (Typ: boolean, Pflichtfeld)
   - "Welche Medikamente nehmen Sie ein?" (Typ: textarea)
   - "Blutgruppe" (Typ: select, Optionen: A, B, AB, 0)
5. Speichern Sie

#### Schritt 2: Online-Buchung mit Anamnese
1. Gehen Sie zu `/online-booking`
2. Wählen Sie den Service (mit Anamnese-Fragen)
3. Wählen Sie Arzt, Datum, Zeit
4. **Erwartung:** Anamnese-Fragen erscheinen im Formular
5. Beantworten Sie die Fragen
6. Buchen Sie den Termin

#### Schritt 3: Prüfen Sie die Antworten
1. Gehen Sie zur Terminverwaltung
2. Öffnen Sie den Termin
3. Tab "Anamnese"
4. **Erwartung:** Antworten werden angezeigt

---

## Phase 4: Automatisierung

### Test 4.1: Wartelisten-Nachrücker-Automatik

**Ziel:** Prüfen, ob Wartelisten-Patienten automatisch benachrichtigt werden

#### Schritt 1: Wartelisten-Einträge erstellen
1. Gehen Sie zu `/waiting-list`
2. Erstellen Sie 3 Einträge für denselben Service/Arzt:
   - Eintrag 1: Priorität "high"
   - Eintrag 2: Priorität "normal"
   - Eintrag 3: Priorität "normal"
3. **Wichtig:** Alle müssen für denselben Service/Arzt sein

#### Schritt 2: Termin stornieren
1. Gehen Sie zur Terminverwaltung
2. Erstellen Sie einen Termin für denselben Service/Arzt
3. Stornieren Sie den Termin (Status auf "abgesagt")

#### Schritt 3: Prüfen Sie die Benachrichtigungen
- **Backend-Logs:** Sollten zeigen: "Benachrichtige 3 Patienten"
- **E-Mails:** Patienten sollten E-Mails mit Magic Links erhalten
- **SMS:** Patienten sollten SMS erhalten (wenn konfiguriert)

#### Schritt 4: Magic Link Reservierung testen
1. Öffnen Sie einen Magic Link aus der E-Mail/SMS
2. **Erwartung:** Seite zeigt Termindetails
3. Geben Sie das Geburtsdatum ein
4. Klicken Sie auf "Termin jetzt reservieren"
5. **Erwartung:** Termin wird dem Wartelisten-Patienten zugeordnet

#### Schritt 5: Race Condition testen
1. Öffnen Sie 2 Magic Links in verschiedenen Browsern
2. Versuchen Sie, beide gleichzeitig zu reservieren
3. **Erwartung:** Nur die erste Reservierung ist erfolgreich

---

## Kompletter End-to-End Test (Alle Phasen zusammen)

### Szenario: Vollständiger Patient-Journey

#### Schritt 1: Vorbereitung
1. ✅ Arzt für Online-Buchung aktivieren
2. ✅ Service konfigurieren:
   - Online buchbar
   - Ressourcen-Anforderungen
   - Online-Kontingente
   - Anamnese-Fragen
3. ✅ Arbeitszeiten konfigurieren

#### Schritt 2: Online-Buchung (Phase 1 + 2 + 3)
1. Gehen Sie zu `/online-booking`
2. Wählen Sie Arzt → Service (mit allen Features)
3. Wählen Sie Datum (innerhalb Kontingent-Zeitfenster)
4. Wählen Sie Zeit
5. **Phase 2.1:** Wählen Sie Raum und Gerät
6. Geben Sie Patientendaten ein (neuer Patient)
7. **Phase 3.3:** Beantworten Sie Anamnese-Fragen
8. Buchen Sie den Termin

#### Schritt 3: Double Opt-In (Phase 2.3)
1. **Erwartung:** Code-Eingabe-Dialog erscheint
2. Prüfen Sie E-Mail für Code
3. Geben Sie Code ein
4. **Erwartung:** Termin wird bestätigt

#### Schritt 4: Bestätigung prüfen (Phase 1.2)
1. Prüfen Sie E-Mail:
   - ✅ ICS-Kalenderfile enthalten
   - ✅ Magic Link enthalten
2. Importieren Sie ICS in Kalender
3. Öffnen Sie Magic Link

#### Schritt 5: Magic Link Test (Phase 2.2)
1. Öffnen Sie `/patient-booking/:token`
2. **Erwartung:** Termindetails werden angezeigt
3. Prüfen Sie Stornierungsmöglichkeit

#### Schritt 6: e-card Integration (Phase 3.1)
1. Gehen Sie zur Terminverwaltung
2. Öffnen Sie den Termin
3. Tab "e-card"
4. Lesen Sie e-card ein
5. Verknüpfen Sie temporären Patienten

#### Schritt 7: Warteliste vorbereiten (Phase 4)
1. Gehen Sie zu `/waiting-list`
2. Erstellen Sie 3 Einträge für denselben Service/Arzt

#### Schritt 8: Stornierung und Wartelisten-Benachrichtigung (Phase 4)
1. Stornieren Sie den Termin
2. **Erwartung:** Wartelisten-Patienten werden benachrichtigt
3. Prüfen Sie E-Mails/SMS
4. Öffnen Sie Magic Link für Reservierung
5. Reservieren Sie den Termin

---

## Automatisiertes Test-Script

Führen Sie das komplette Test-Script aus:

```bash
node backend/scripts/test-complete-e2e.js
```

Dieses Script testet alle Phasen automatisch.

---

## Checkliste für vollständigen Test

### Phase 1: Quick Wins
- [ ] Dublettenprüfung funktioniert (bekannte vs. neue Patienten)
- [ ] ICS-Kalenderfile wird in E-Mail gesendet
- [ ] ICS kann in Kalender importiert werden
- [ ] Stornierungsfristen werden eingehalten
- [ ] Stornierung außerhalb Frist wird blockiert

### Phase 2: Core Features
- [ ] Ressourcen-Auswahl erscheint bei Service mit Anforderungen
- [ ] Räume und Geräte werden bei Buchung zugewiesen
- [ ] Magic Link wird in E-Mail gesendet
- [ ] Magic Link zeigt Termindetails
- [ ] Stornierung über Magic Link funktioniert
- [ ] Double Opt-In Code wird gesendet (für neue Patienten)
- [ ] Code-Eingabe funktioniert
- [ ] Code erneut senden funktioniert

### Phase 3: Extended Features
- [ ] Temporäre Patienten werden erkannt
- [ ] e-card kann mit temporärem Patienten verknüpft werden
- [ ] Online-Kontingente schränken Verfügbarkeit ein
- [ ] Kontingent-Limits werden eingehalten
- [ ] Anamnese-Fragen erscheinen im Buchungsprozess
- [ ] Anamnese-Antworten werden gespeichert
- [ ] Anamnese-Antworten werden im Termin angezeigt

### Phase 4: Automatisierung
- [ ] Wartelisten-Einträge werden erstellt
- [ ] Stornierung löst Benachrichtigung aus
- [ ] Mehrere Patienten werden gleichzeitig benachrichtigt
- [ ] Magic Links für Reservierung werden gesendet
- [ ] Reservierung über Magic Link funktioniert
- [ ] Race Condition wird korrekt behandelt (nur erste Reservierung erfolgreich)

---

## Troubleshooting

### Problem: Keine Ärzte in Online-Buchung
**Lösung:** Prüfen Sie `User.profile.onlineBookingEnabled = true`

### Problem: Keine verfügbaren Slots
**Lösung:** 
- Prüfen Sie Arbeitszeiten (WeeklySchedule)
- Prüfen Sie Online-Kontingente
- Prüfen Sie bereits gebuchte Termine

### Problem: Double Opt-In Code kommt nicht an
**Lösung:**
- Prüfen Sie SMTP-Konfiguration
- Prüfen Sie Spam-Ordner
- Prüfen Sie Backend-Logs

### Problem: Wartelisten-Benachrichtigungen werden nicht gesendet
**Lösung:**
- Prüfen Sie, ob Wartelisten-Einträge passen (Service, Arzt, Standort)
- Prüfen Sie Backend-Logs
- Prüfen Sie SMS/E-Mail-Konfiguration

---

## Nächste Schritte

Nach erfolgreichen Tests:
1. Konfigurieren Sie SMS-Gateway für Produktion
2. Passen Sie System-Einstellungen an Ihre Bedürfnisse an
3. Testen Sie mit echten Patientendaten
4. Überwachen Sie die Logs in Produktion

