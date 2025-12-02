# Migration: locationId zu Appointments hinzufügen

## Übersicht

Diese Migration fügt das `locationId` Feld zu bestehenden Appointments hinzu, indem es die Standort-Information aus dem zugewiesenen Raum (`room.location_id`) ableitet.

## Was wurde geändert?

### 1. Appointment-Modell erweitert
- Neues Feld `locationId` im Appointment-Schema hinzugefügt
- Index auf `locationId` für bessere Performance
- Pre-save Middleware setzt `locationId` automatisch aus `room.location_id`, wenn nicht bereits gesetzt

### 2. Migration-Script erstellt
- `scripts/migrate-appointment-locationId.js` - Aktualisiert bestehende Termine

## Ausführung der Migration

```bash
cd backend
node scripts/migrate-appointment-locationId.js
```

## Was macht die Migration?

1. Findet alle Appointments ohne `locationId`
2. Versucht `locationId` aus folgenden Quellen abzuleiten:
   - `room.location_id` (primär)
   - `assigned_rooms[0].location_id` (Fallback)
3. Aktualisiert die Appointments mit der gefundenen `locationId`
4. Gibt eine Zusammenfassung aus:
   - Anzahl aktualisierter Termine
   - Anzahl übersprungener Termine (kein Raum zugewiesen)
   - Anzahl Fehler

## Nach der Migration

- Neue Termine erhalten automatisch `locationId` beim Speichern (wenn ein Raum zugewiesen ist)
- Bestehende Termine ohne Raum bleiben ohne `locationId` (können manuell zugewiesen werden)
- Frontend kann jetzt direkt nach `locationId` filtern, ohne über Räume zu gehen

## Hinweise

- Die Migration ist **idempotent** - kann mehrfach ausgeführt werden
- Termine ohne zugewiesenen Raum bleiben ohne `locationId`
- Die Migration loggt alle Aktionen für Nachvollziehbarkeit




