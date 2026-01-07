# Permission-Migration Script

## Übersicht

Dieses Script migriert alte `user.permissions` (Array von Strings) zu dem neuen `user.rbac.customPermissions` System.

## Verwendung

### Dry-Run (Test ohne Änderungen)
```bash
node backend/scripts/migrate-permissions.js --dry-run
```

### Migration für alle Benutzer
```bash
node backend/scripts/migrate-permissions.js
```

### Migration für einen spezifischen Benutzer
```bash
node backend/scripts/migrate-permissions.js --user-id=USER_ID
```

## Was wird migriert?

- **Format**: `"resource.action"` → `{ resource: "resource", actions: ["action"] }`
- **Beispiele**:
  - `"patients.read"` → `{ resource: "patient", actions: ["read"] }`
  - `"patients.write"` → `{ resource: "patient", actions: ["create", "update"] }`
  - `"read"` → `{ resource: "system", actions: ["read"] }`

## Wichtig

- Das Script erstellt **keine Duplikate** - bestehende Custom Permissions werden gemerged
- Alte `user.permissions` werden **nicht gelöscht** (für Rollback möglich)
- Migration wird in `permissionHistory` protokolliert
- Führen Sie zuerst einen `--dry-run` durch, um zu sehen, was migriert wird

## Nach der Migration

- Alte `user.permissions` können manuell entfernt werden, wenn alles funktioniert
- Das neue System (`rbac.customPermissions`) hat Priorität
- Alte Permissions werden weiterhin als Fallback unterstützt









