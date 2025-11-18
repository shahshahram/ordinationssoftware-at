# Modul-Management

## Übersicht

Das System unterstützt die Aktivierung und Deaktivierung einzelner Module, ohne andere Module zu beeinflussen. Dies ermöglicht es, bestimmte Funktionen temporär oder permanent zu deaktivieren.

## Aktivierung

### Backend-Konfiguration

1. **Umgebungsvariable setzen:**
   ```bash
   USE_MODULE_MANAGER=true
   ```
   
   In der `.env` Datei:
   ```
   USE_MODULE_MANAGER=true
   ```

2. **Server neu starten:**
   ```bash
   npm start
   ```

## Verwendung

### Module-Status prüfen

**GET** `/api/modules`
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "moduleName": "online-booking",
      "displayName": "Online Booking",
      "isActive": true,
      "isRegistered": true,
      "resourcesCount": 5,
      "permissionsCount": 15
    }
  ]
}
```

### Modul aktivieren/deaktivieren

**PATCH** `/api/modules/:moduleName/toggle`
```json
{
  "isActive": false
}
```

**Beispiel:**
```bash
curl -X PATCH http://localhost:5001/api/modules/online-booking/toggle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"isActive": false}'
```

### Status-Zusammenfassung

**GET** `/api/modules/status/summary`
```json
{
  "success": true,
  "data": {
    "total": 49,
    "active": 45,
    "inactive": 4,
    "registered": 45,
    "modules": {
      "active": ["auth", "patients", "appointments", ...],
      "inactive": ["online-booking", "elga", ...],
      "registered": ["auth", "patients", ...]
    }
  }
}
```

## Schutz vor Deaktivierung

Bestimmte Module sind als **Pflichtmodule** markiert und können nicht deaktiviert werden:
- `auth` - Authentifizierung
- `patients` - Patientenverwaltung
- `appointments` - Terminverwaltung
- `billing` - Abrechnung
- `documents` - Dokumentenverwaltung
- `users` - Benutzerverwaltung
- `staff-profiles` - Personalverwaltung
- `locations` - Standortverwaltung
- `rbac` - Berechtigungssystem
- `settings` - Einstellungen

## Middleware in Routen verwenden

Für vollständige Deaktivierung ohne Server-Neustart kann die `checkModule` Middleware in Route-Dateien verwendet werden:

```javascript
const { checkModule } = require('../middleware/checkModule');
const router = express.Router();

// Alle Routen dieses Moduls prüfen den Status
router.use(checkModule('online-booking'));

router.get('/', async (req, res) => {
  // Route-Logik
});
```

## Verfügbare Module

| Modul | Name | Pflicht | Beschreibung |
|-------|------|---------|--------------|
| Authentifizierung | `auth` | ✅ | Login, Token-Verwaltung |
| Patienten | `patients` | ✅ | Basis-Patientenverwaltung |
| Patienten Extended | `patients-extended` | ❌ | Erweiterte Patienten-Daten |
| Termine | `appointments` | ✅ | Terminverwaltung |
| Abrechnung | `billing` | ✅ | Rechnungsstellung |
| Dokumente | `documents` | ✅ | Dokumentenverwaltung |
| Online-Buchung | `online-booking` | ❌ | Terminbuchung online |
| ELGA | `elga` | ❌ | ELGA-Integration |
| eCard | `ecard` | ❌ | eCard-Unterstützung |
| ICD-10 | `icd10` | ❌ | ICD-10 Katalog |
| Diagnosen | `diagnoses` | ❌ | Diagnoseverwaltung |
| XDS | `xds` | ❌ | XDS Registry/Repository |
| Ambulanzbefunde | `ambulanzbefunde` | ❌ | Ambulanzbefund-Editor |
| ... | ... | ... | ... |

## Hinweise

1. **Server-Neustart:** Um Routen vollständig zu entfernen, ist ein Server-Neustart nötig. Die Middleware-Lösung blockiert nur den Zugriff.

2. **Datenbank:** Der Modulstatus wird in der `ModuleRegistry` Collection gespeichert.

3. **RBAC:** Deaktivierte Module werden automatisch aus RBAC-Berechtigungen entfernt.

4. **Frontend:** Frontend-Komponenten sollten basierend auf API-Antworten angezeigt/versteckt werden.

## Beispiele

### Online-Buchung deaktivieren
```bash
PATCH /api/modules/online-booking/toggle
Body: {"isActive": false}
```

### ELGA-Modul aktivieren
```bash
PATCH /api/modules/elga/toggle
Body: {"isActive": true}
```

### Alle inaktiven Module anzeigen
```bash
GET /api/modules?isActive=false
```



