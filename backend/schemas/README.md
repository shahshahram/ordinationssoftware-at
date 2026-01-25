# Permission Schema

Dieses Verzeichnis enthält die zentrale Permission-Definition für das gesamte System.

## Dateien

- **`permissions.schema.yaml`**: Single Source of Truth für alle Permissions, Rollen, Actions und Resources

## Code-Generierung

Die Permission-Definitionen werden automatisch in TypeScript Types (Frontend) und JavaScript Constants (Backend) generiert.

### Generierung ausführen

```bash
# Im Backend-Verzeichnis
npm run generate-permissions
```

Oder direkt:

```bash
node scripts/generate-permissions.js
```

### Generierte Dateien

- **Frontend**: `frontend/src/utils/permissions.generated.ts`
- **Backend**: `backend/utils/permissions.generated.js`

⚠️ **Wichtig**: Diese Dateien sind automatisch generiert und sollten **NICHT** manuell bearbeitet werden!

## Schema-Struktur

### Rollen

Jede Rolle hat:
- `level`: Hierarchie-Level (höher = mehr Berechtigungen)
- `label`: Anzeigename
- `description`: Beschreibung
- `permissions`: Resource -> Actions Mapping

### Actions

Alle verfügbaren Operationen auf Resources:
- CRUD: `create`, `read`, `update`, `delete`
- Spezifische Actions: `book`, `cancel`, `generate`, etc.

### Resources

Alle Ressourcen-Typen im System:
- `patient`, `appointment`, `document`, etc.
- Jede Resource kann `sensitive: true/false` haben

## Änderungen vornehmen

1. Bearbeiten Sie `permissions.schema.yaml`
2. Führen Sie `npm run generate-permissions` aus
3. Die generierten Dateien werden automatisch aktualisiert
4. Testen Sie die Änderungen

## Best Practices

- ✅ Verwenden Sie Singular für Resources (`patient`, nicht `patients`)
- ✅ Dokumentieren Sie neue Actions/Resources
- ✅ Testen Sie nach Schema-Änderungen
- ✅ Committen Sie sowohl Schema als auch generierte Dateien

## Validierung

Das Schema wird automatisch validiert beim Generieren:
- Alle Actions müssen in `actions` definiert sein
- Alle Resources müssen in `resources` definiert sein
- Rollen müssen gültige Permissions haben
