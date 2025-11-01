# Feingranulares RBAC + Object-level ACLs Implementation

## Übersicht

Das implementierte RBAC (Role-Based Access Control) System bietet eine umfassende, feingranulare Zugriffskontrolle für die österreichische Ordinationssoftware mit Policy-basierter Autorisierung und Object-level ACLs.

## 🏗️ Architektur

### Backend-Komponenten

#### 1. **Zentrale RBAC-Engine** (`/backend/utils/rbac.js`)
- **Policy-basierte Autorisierung**: Zentrale `authorize()` Funktion
- **Rollen-Hierarchie**: Super Admin → Admin → Arzt → Assistent → Rezeption/Billing → Patient
- **Object-level ACLs**: Ressourcen-spezifische Zugriffskontrolle
- **Audit-Logging**: Vollständige Nachverfolgung aller Autorisierungsentscheidungen

#### 2. **RBAC-Middleware** (`/backend/middleware/rbac.js`)
- **Automatische Autorisierung**: `requirePermission()`, `requireRole()`, `requirePolicy()`
- **Zeit- und Ortsbeschränkungen**: Geschäftszeiten, IP-Beschränkungen
- **Sensibilitätsstufen**: Normal, Sensitiv, Hochsensitiv, Eingeschränkt
- **DSGVO-Compliance**: Einverständnisprüfungen

#### 3. **Erweiterte Datenmodelle**
- **User Model**: RBAC-Unterstützung mit Custom Permissions und Delegation
- **Patient Model**: ACL-Integration für sensible medizinische Daten
- **AuditLog Model**: Erweiterte Logging-Funktionen für Compliance

#### 4. **RBAC-API** (`/backend/routes/rbac.js`)
- **Rollen-Management**: CRUD-Operationen für Rollen und Permissions
- **Benutzer-Verwaltung**: Rollen-Zuweisung und Custom Permissions
- **ACL-Management**: Object-level Zugriffskontrolle
- **Autorisierungs-Test**: Debugging und Validierung

### Frontend-Komponenten

#### 1. **RBAC-Utilities** (`/frontend/src/utils/rbac.ts`)
- **React Hook**: `useRBAC()` für Komponenten-Integration
- **HOC**: `withRBAC()` für geschützte Komponenten
- **Utility Components**: `IfCan` für bedingtes Rendering

#### 2. **Erweiterte ProtectedRoute** (`/frontend/src/components/ProtectedRoute.tsx`)
- **Multi-Level-Schutz**: Rollen, Permissions, Actions, Ressourcen
- **Sensibilitätsprüfung**: Automatische Filterung sensibler Daten
- **Benutzerfreundliche Fehlermeldungen**: Detaillierte Zugriffsverweigerungen

#### 3. **RBAC-Management-UI** (`/frontend/src/pages/RBACManagement.tsx`)
- **Administrative Oberfläche**: Vollständige RBAC-Verwaltung
- **Echtzeit-Tests**: Autorisierung testen und validieren
- **Audit-Dashboard**: Compliance und Sicherheitsüberwachung

## 🔐 Rollen und Berechtigungen

### Rollen-Hierarchie

```
SUPER_ADMIN (Level 6)
├── ADMIN (Level 5)
    ├── ARZT (Level 4)
    │   └── ASSISTENT (Level 3)
    ├── REZEPTION (Level 2)
    ├── BILLING (Level 2)
    └── PATIENT (Level 1)
```

### Standard-Permissions

| Rolle | Patienten | Termine | Dokumente | Diagnosen | Rezepte | Abrechnung | System |
|-------|-----------|---------|-----------|-----------|---------|------------|--------|
| **Super Admin** | Alle | Alle | Alle | Alle | Alle | Alle | Alle |
| **Admin** | CRUD | CRUD+ | CRUD+ | CRUD+ | CRUD+ | CRUD+ | Konfig |
| **Arzt** | CRU | CRUD+ | CRUD+ | CRUD+ | CRUD+ | R+ | - |
| **Assistent** | CRU | CRUD+ | CRU+ | R | R | R | - |
| **Rezeption** | CRU | CRUD+ | R+ | - | - | R+ | - |
| **Billing** | R | R | R+ | - | - | CRUD+ | - |
| **Patient** | R (eigene) | R+ (eigene) | R (eigene) | - | - | R (eigene) | - |

*Legende: C=Create, R=Read, U=Update, D=Delete, +=Spezialaktionen*

## 🛡️ Object-level ACLs

### ACL-Struktur

```javascript
acl: {
  allowedRoles: ['arzt', 'admin'],           // Erlaubte Rollen
  allowedUsers: [ObjectId],                  // Spezifische Benutzer
  deniedRoles: ['patient'],                  // Verweigerte Rollen
  deniedUsers: [ObjectId],                   // Verweigerte Benutzer
  conditions: {
    timeRestricted: true,                    // Zeitbeschränkungen
    timeStart: Date,
    timeEnd: Date,
    locationRestricted: true,                // Ortsbeschränkungen
    allowedLocations: [ObjectId],
    ipRestricted: true,                      // IP-Beschränkungen
    allowedIPs: ['192.168.1.0/24'],
    requiresConsent: true                    // Einverständnis erforderlich
  }
}
```

### Sensibilitätsstufen

- **Normal**: Standard-Zugriff für alle autorisierten Benutzer
- **Sensitiv**: Nur Ärzte und höher
- **Hochsensitiv**: Nur Ärzte mit spezieller Berechtigung
- **Eingeschränkt**: Nur Super Admin und explizit autorisierte Benutzer

## 🔍 Policy-basierte Autorisierung

### Autorisierungsfluss

1. **Rollen-Prüfung**: Hat der Benutzer die erforderliche Rolle?
2. **Permission-Prüfung**: Hat der Benutzer die erforderliche Berechtigung?
3. **Object-ACL-Prüfung**: Gibt es ressourcenspezifische Einschränkungen?
4. **Geschäftsregeln**: Sind spezielle medizinische/administrative Regeln erfüllt?
5. **Zeit/Orts-Prüfung**: Sind Zeit- und Ortsbeschränkungen eingehalten?

### Beispiel-Autorisierung

```javascript
// Arzt möchte sensible Patientendaten lesen
const result = await authorize(user, 'read', 'patient', patientObject, {
  ip: '192.168.1.100',
  locationId: 'clinic-main'
});

// Prüfungen:
// 1. Rolle 'arzt' hat 'read' Permission für 'patient' ✓
// 2. Patient hat ACL mit allowedRoles: ['arzt'] ✓
// 3. Sensibilitätsstufe 'sensitive' erlaubt für 'arzt' ✓
// 4. Keine Zeit/Ortsbeschränkungen ✓
// → ALLOWED
```

## 📊 Audit und Compliance

### Audit-Logging

Jede Autorisierungsentscheidung wird geloggt:

```javascript
{
  userId: ObjectId,
  userRole: 'arzt',
  action: 'read',
  resource: 'patient',
  resourceId: ObjectId,
  allowed: true,
  reason: 'Access granted',
  context: {
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0...',
    locationId: 'clinic-main'
  },
  timestamp: '2025-10-22T10:30:00Z'
}
```

### DSGVO-Compliance

- **Einverständnis-Tracking**: Automatische Prüfung von DSGVO-Einverständnissen
- **Datenminimierung**: Nur notwendige Daten werden übertragen
- **Recht auf Vergessenwerden**: Automatische Löschung nach Ablaufzeit
- **Audit-Trail**: Vollständige Nachverfolgung aller Datenzugriffe

## 🚀 Verwendung

### Backend-Integration

```javascript
// In API-Routen
router.get('/patients/:id', 
  auth, 
  rbacMiddleware.canViewPatients, 
  async (req, res) => { ... }
);

// Mit Object-level ACLs
router.put('/patients/:id', 
  auth, 
  requirePolicy('update', 'patient'),
  loadResource('patient', 'id'),
  async (req, res) => { ... }
);
```

### Frontend-Integration

```tsx
// In React-Komponenten
const { can, canRead, canUpdate } = useRBAC(user);

// Bedingtes Rendering
<IfCan action="update" resource="patient" user={user}>
  <EditButton />
</IfCan>

// Geschützte Routen
<ProtectedRoute 
  requiredAction="read" 
  requiredResource="patient"
  sensitivityLevel="sensitive"
>
  <PatientDetails />
</ProtectedRoute>
```

### RBAC-Management

```tsx
// Rollen ändern
await api.post('/rbac/users/123/roles', { 
  role: 'arzt',
  reason: 'Beförderung zum Arzt'
});

// Custom Permissions
await api.post('/rbac/users/123/custom-permissions', {
  resource: 'patient',
  actions: ['read', 'update'],
  conditions: { timeRestricted: true, timeEnd: '2025-12-31' }
});

// ACL setzen
await api.put('/rbac/resources/patient/456/acl', {
  acl: {
    allowedRoles: ['arzt'],
    conditions: { requiresConsent: true }
  }
});
```

## 🔧 Konfiguration

### Umgebungsvariablen

```env
# RBAC-Konfiguration
RBAC_AUDIT_ENABLED=true
RBAC_DEFAULT_RETENTION_YEARS=10
RBAC_SESSION_TIMEOUT=28800000  # 8 Stunden
RBAC_MAX_FAILED_ATTEMPTS=5
RBAC_LOCKOUT_DURATION=900000    # 15 Minuten
```

### Rollen-Konfiguration

Rollen und Permissions können in `/backend/utils/rbac.js` angepasst werden:

```javascript
const ROLE_PERMISSIONS = {
  [ROLES.ARZT]: {
    [RESOURCES.PATIENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [RESOURCES.DOCUMENT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.GENERATE],
    // ...
  }
};
```

## 📈 Performance und Skalierung

### Optimierungen

- **Caching**: Rollen und Permissions werden gecacht
- **Batch-Operationen**: Mehrere Autorisierungen in einem Request
- **Lazy Loading**: ACLs werden nur bei Bedarf geladen
- **Indexierung**: Optimierte Datenbank-Indizes für schnelle Abfragen

### Monitoring

- **Metriken**: Autorisierungsrate, Fehlschläge, Performance
- **Alerts**: Ungewöhnliche Zugriffsmuster
- **Dashboard**: Echtzeit-Überwachung der Sicherheit

## 🛠️ Wartung und Updates

### Regelmäßige Aufgaben

1. **Audit-Review**: Monatliche Überprüfung der Audit-Logs
2. **Permission-Cleanup**: Entfernung veralteter Berechtigungen
3. **ACL-Review**: Überprüfung der Object-level ACLs
4. **Performance-Monitoring**: Überwachung der Autorisierungs-Performance

### Updates

- **Rollen-Updates**: Neue Rollen oder geänderte Hierarchien
- **Permission-Updates**: Neue Aktionen oder Ressourcen
- **ACL-Updates**: Anpassung der Zugriffskontrollen
- **Compliance-Updates**: DSGVO und andere rechtliche Anforderungen

## 🔒 Sicherheitshinweise

### Best Practices

1. **Principle of Least Privilege**: Minimale notwendige Berechtigungen
2. **Regular Audits**: Regelmäßige Überprüfung der Berechtigungen
3. **Separation of Duties**: Trennung kritischer Funktionen
4. **Defense in Depth**: Mehrschichtige Sicherheit
5. **Incident Response**: Schnelle Reaktion auf Sicherheitsvorfälle

### Risikomanagement

- **Zugriffsrisiken**: Unbefugter Zugriff auf sensible Daten
- **Compliance-Risiken**: Verstöße gegen DSGVO und andere Vorschriften
- **Operational-Risiken**: Systemausfälle durch fehlerhafte Konfiguration
- **Reputationsrisiken**: Schäden durch Sicherheitsvorfälle

## 📚 Weiterführende Dokumentation

- [API-Dokumentation](./docs/api.md)
- [Frontend-Komponenten](./docs/components.md)
- [Sicherheitsrichtlinien](./docs/security.md)
- [Compliance-Leitfaden](./docs/compliance.md)
- [Troubleshooting](./docs/troubleshooting.md)

---

**Implementiert am**: 22. Oktober 2025  
**Version**: 1.0.0  
**Status**: Produktionsreif  
**Wartung**: Kontinuierlich
