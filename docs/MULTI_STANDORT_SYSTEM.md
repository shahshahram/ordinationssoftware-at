# Multi-Standort-System

## Übersicht

Das System unterstützt Ordinationen mit mehreren Standorten. Jeder Benutzer kann einem oder mehreren Standorten zugeordnet sein, und Patienten können optional Standorten zugeordnet werden.

## Funktionsweise

### 1. Benutzer-Standort-Zuordnung

#### StaffLocationAssignment
- Mitarbeiter werden über `StaffLocationAssignment` Standorten zugeordnet
- Ein Mitarbeiter kann mehreren Standorten zugeordnet sein
- Ein Standort kann als "Primary Location" (Hauptstandort) markiert werden
- Wenn keine Zuweisung existiert, hat der Benutzer Zugriff auf alle Standorte

#### Standortauswahl nach Login
1. **Automatische Auswahl:**
   - Wenn nur ein Standort verfügbar ist → automatisch ausgewählt
   - Wenn ein Primary Location gesetzt ist → automatisch ausgewählt
   - Wenn ein Standort in LocalStorage gespeichert ist → automatisch ausgewählt

2. **Manuelle Auswahl:**
   - Wenn mehrere Standorte verfügbar sind → Dialog zur Standortauswahl
   - Benutzer kann "Auswahl merken" aktivieren
   - Gespeicherte Auswahl wird beim nächsten Login verwendet

### 2. Standortwechsel während der Sitzung

- **Header-Auswahl:** Im Header wird der aktuelle Standort angezeigt
- **Standortwechsel:** Benutzer kann jederzeit über das Dropdown im Header den Standort wechseln
- **Persistenz:** Der gewählte Standort wird in LocalStorage gespeichert

### 3. Patienten-Standort-Zuordnung

#### Optionale Zuordnung
- Patienten **müssen nicht** einem Standort zugeordnet sein
- Patienten können einem **Primary Location** zugeordnet sein
- Patienten können mehreren Standorten zugeordnet sein (über `locationIds` Array)

#### Verwendung
- **Appointments:** Jeder Termin hat ein `locationId` (aus Raum oder direkt gesetzt)
- **Ambulanzbefunde:** Jeder Befund hat ein `locationId`
- **Filterung:** Patienten können nach Standort gefiltert werden (optional)

### 4. Standort-basierte Filterung

#### Automatische Filterung
- **Kalender:** Zeigt Termine des aktuellen Standorts (oder alle, wenn "Alle Standorte" gewählt)
- **Patientenliste:** Kann nach Standort gefiltert werden
- **Befunde:** Werden nach Standort gefiltert

#### Manuelle Filterung
- Benutzer kann in verschiedenen Ansichten den Standort-Filter ändern
- "Alle Standorte" Option verfügbar (wenn `hasNoAssignment = true`)

## Technische Implementierung

### Backend

#### Models
- **Location:** Standort-Modell mit allen Details
- **StaffLocationAssignment:** Zuordnung Mitarbeiter ↔ Standort
- **PatientExtended:** Optional `primaryLocationId` und `locationIds[]`
- **Appointment:** `locationId` (erforderlich)

#### API-Endpunkte
- `GET /api/staff-location-assignments/user/me` - Standorte des aktuellen Benutzers
- `GET /api/locations` - Alle Standorte
- `PUT /api/locations/:id` - Standort aktualisieren

### Frontend

#### Redux State (locationSlice)
```typescript
{
  locations: Location[];              // Alle Standorte
  availableLocations: Location[];      // Verfügbare Standorte für aktuellen User
  currentLocation: Location | null;   // Aktuell gewählter Standort
  hasNoAssignment: boolean;           // User hat keine Standort-Zuweisung
}
```

#### Components
- **LocationProvider:** Wrapper-Komponente, die Standortauswahl nach Login verwaltet
- **LocationSelectionDialog:** Dialog zur Standortauswahl
- **Header:** Zeigt aktuellen Standort und ermöglicht Wechsel

#### LocalStorage
- `currentLocationId`: Gespeicherte Standort-ID für Persistenz

## Konfiguration

### Standort-Zuweisung für Mitarbeiter

1. **Über Location Management:**
   - Navigiere zu `/locations`
   - Tab "Mitarbeiter-Zuweisungen"
   - Mitarbeiter zu Standorten zuweisen
   - Primary Location setzen

2. **Über API:**
```javascript
POST /api/staff-location-assignments
{
  "staff_id": "staffProfileId",
  "location_id": "locationId",
  "is_primary": true
}
```

### Patienten-Standort-Zuordnung

1. **Bei Patienten-Erstellung:**
   - Optional `primaryLocationId` setzen
   - Optional `locationIds[]` Array setzen

2. **Bei Patienten-Update:**
   - Standort-Zuordnung kann jederzeit geändert werden

## Verhalten bei verschiedenen Szenarien

### Szenario 1: Ein Standort
- Keine Standortauswahl nötig
- Standort wird automatisch gesetzt
- Keine Standortauswahl im Header (optional)

### Szenario 2: Mehrere Standorte, User zugeordnet
- Standortauswahl-Dialog nach Login
- Primary Location wird vorgeschlagen
- Standortauswahl im Header sichtbar

### Szenario 3: Mehrere Standorte, User nicht zugeordnet
- Alle Standorte verfügbar
- "Alle Standorte" Option im Header
- Standortauswahl-Dialog nach Login

### Szenario 4: Patienten ohne Standort-Zuordnung
- Patienten sind für alle Standorte sichtbar
- Termine können an jedem Standort erstellt werden
- Filterung nach Standort optional

## Best Practices

1. **Standort-Zuordnung:**
   - Jeden Mitarbeiter mindestens einem Standort zuordnen
   - Primary Location für jeden Mitarbeiter setzen

2. **Patienten-Verwaltung:**
   - Patienten-Standort-Zuordnung nur wenn nötig
   - Primary Location für Patienten setzen, die hauptsächlich an einem Standort behandelt werden

3. **Termine:**
   - Immer `locationId` bei Terminerstellung setzen
   - Automatisch aus Raum oder direkt setzen

4. **Filterung:**
   - Standort-Filter in Listenansichten anbieten
   - "Alle Standorte" Option für Administratoren

## FAQ

### Gehören Patienten zu allen Standorten?
**Antwort:** Nein, Patienten gehören standardmäßig zu keinem spezifischen Standort. Sie können optional einem Primary Location oder mehreren Standorten zugeordnet werden. Termine und Befunde haben jedoch immer ein `locationId`.

### Woher weiß das System, welcher Standort aktiv ist?
**Antwort:** 
1. Nach Login: Automatische Auswahl basierend auf Primary Location oder gespeicherter Auswahl
2. Während der Sitzung: Aktueller Standort wird in Redux State und LocalStorage gespeichert
3. Standortwechsel: Über Header-Dropdown, wird sofort in State und LocalStorage aktualisiert

### Was passiert, wenn ein Benutzer mehreren Standorten zugeordnet ist?
**Antwort:** Der Benutzer kann zwischen allen zugeordneten Standorten wechseln. Nach Login wird der Primary Location oder die gespeicherte Auswahl verwendet.

### Können Patienten an mehreren Standorten behandelt werden?
**Antwort:** Ja, Patienten können über das `locationIds[]` Array mehreren Standorten zugeordnet sein. Termine werden jedoch immer an einem spezifischen Standort erstellt.

