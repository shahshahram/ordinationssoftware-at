# Benutzererstellung im System

## 📋 Übersicht

Das System bietet drei verschiedene Wege zur Benutzererstellung, je nach Kontext und Berechtigung.

---

## 🎯 1. Super Administrator (Initial Setup)

**Zweck:** Erstellung des ersten Administrators beim Systemstart

### Methoden:

#### A) Setup-Script (Empfohlen)
```bash
cd backend
node scripts/setupSuperAdmin.js
```

**Vorteile:**
- Einfach und schnell
- Automatische Validierung
- Sichere Passwort-Hashung
- Vollständige RBAC-Integration

#### B) API-Endpoint
```bash
curl -X POST http://localhost:5001/api/setup/super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Max",
    "lastName": "Mustermann",
    "email": "admin@praxis.at",
    "password": "SicheresPasswort123!",
    "confirmPassword": "SicheresPasswort123!"
  }'
```

#### C) Frontend Setup-Seite
- Navigieren Sie zu `/super-admin-setup`
- Füllen Sie das Formular aus
- System erstellt automatisch den Super Admin

### Besonderheiten:
- ✅ Nur möglich, wenn noch **kein** Super Admin existiert
- ✅ Erhält automatisch alle Berechtigungen (`role: 'super_admin'`)
- ✅ Passwort muss mindestens **8 Zeichen** lang sein
- ✅ E-Mail-Adresse muss eindeutig sein

---

## 🌐 2. Öffentliche Registrierung

**Zweck:** Selbstregistrierung für neue Mitarbeiter

### API-Endpoint:
```bash
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "neuer.mitarbeiter@praxis.at",
  "password": "Passwort123",
  "firstName": "Max",
  "lastName": "Mustermann",
  "role": "doctor"
}
```

### Erlaubte Rollen:
- `admin`
- `doctor`
- `staff`

### Validierung:
- ✅ E-Mail muss eindeutig sein
- ✅ Passwort mindestens **6 Zeichen**
- ✅ Vorname, Nachname erforderlich
- ✅ E-Mail-Format wird validiert

### Status:
⚠️ **Frontend-Registrierungsseite fehlt aktuell** - nur über API möglich

---

## 👥 3. Benutzerverwaltung (Admin)

**Zweck:** Erstellung durch Administratoren über die Benutzerverwaltung

### Frontend:
1. Navigieren Sie zu `/users`
2. Klicken Sie auf "Benutzer hinzufügen" (+)
3. Füllen Sie das Formular aus:
   - E-Mail
   - Passwort (mindestens 6 Zeichen)
   - Vorname
   - Nachname
   - Rolle
   - Status (Aktiv/Inaktiv)
   - Farbe (optional)
4. Klicken Sie auf "Speichern"

### API-Endpoint:
```bash
POST /api/users
Authorization: Bearer <TOKEN>
```

**Request Body:**
```json
{
  "email": "neuer.benutzer@praxis.at",
  "password": "Passwort123",
  "firstName": "Max",
  "lastName": "Mustermann",
  "role": "arzt",
  "isActive": true,
  "color_hex": "#FF5733"
}
```

### Erlaubte Rollen:
- `admin`
- `doctor`
- `nurse`
- `receptionist`
- `assistant`
- `staff`
- `super_admin`
- `arzt`
- `assistent`
- `rezeption`
- `billing`
- `patient`

### Berechtigungen:
- ✅ Benötigt `users.create`-Berechtigung
- ✅ Prüfung über RBAC-System
- ✅ Nur für authentifizierte Benutzer

### Automatische Aktionen:
- ✅ Erstellt automatisch `StaffProfile` für nicht-Admin-Benutzer
- ✅ Setzt `createdBy` auf den erstellenden Benutzer
- ✅ Validiert alle Eingaben

---

## 🔄 Empfohlener Workflow

### Initial Setup:
1. **Super Admin erstellen** (via Setup-Script oder `/super-admin-setup`)
2. **Mit Super Admin einloggen**
3. **Weitere Benutzer erstellen** über `/users`

### Tägliche Nutzung:
1. **Admin/Super Admin einloggen**
2. **Neue Benutzer über `/users` erstellen**
3. **Rollen und Berechtigungen zuweisen**

---

## ⚠️ Wichtige Hinweise

### Sicherheit:
- Passwörter werden immer gehasht (bcrypt, 12 Runden)
- E-Mail-Adressen müssen eindeutig sein
- RBAC-Berechtigungen werden bei jeder Erstellung geprüft

### Validierung:
- **Super Admin:** Passwort mindestens 8 Zeichen
- **Registrierung:** Passwort mindestens 6 Zeichen
- **Benutzerverwaltung:** Passwort mindestens 6 Zeichen

### Rollen:
- `super_admin`: Höchste Berechtigung, nur einmal erstellbar
- `admin`: Administrator mit erweiterten Rechten
- `doctor`, `arzt`: Ärzte
- `nurse`, `assistent`: Medizinisches Personal
- `receptionist`, `rezeption`: Empfangspersonal
- `billing`: Abrechnungspersonal
- `patient`: Patienten (selten verwendet)

---

## 📝 Beispiel-Workflow

```bash
# 1. Super Admin erstellen
cd backend
node scripts/setupSuperAdmin.js

# 2. Mit Super Admin einloggen (Frontend)
# Email: superadmin@ordinationssoftware.at
# Passwort: SuperAdmin2024!

# 3. Weitere Benutzer über Frontend erstellen
# Navigieren zu: /users
# Klicken auf: "Benutzer hinzufügen"
```

---

## 🔍 Troubleshooting

### "Super Administrator existiert bereits"
- Ein Super Admin wurde bereits erstellt
- Verwenden Sie die Benutzerverwaltung (`/users`) für weitere Benutzer

### "E-Mail-Adresse wird bereits verwendet"
- Die E-Mail-Adresse existiert bereits im System
- Verwenden Sie eine andere E-Mail-Adresse

### "Zugriff verweigert"
- Sie haben keine Berechtigung zum Erstellen von Benutzern
- Benötigt: `users.create`-Berechtigung oder `super_admin`-Rolle

### "Validierungsfehler"
- Prüfen Sie alle Pflichtfelder
- Passwort muss mindestens 6 Zeichen lang sein
- E-Mail muss gültiges Format haben



