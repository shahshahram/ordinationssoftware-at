# Öffentliche Registrierung - Detaillierte Erklärung

## 📋 Übersicht

Die öffentliche Registrierung ermöglicht es neuen Benutzern, sich selbst im System zu registrieren, **ohne dass ein Administrator eingreifen muss**. Dies ist nützlich für:
- Neue Mitarbeiter, die sich selbst anmelden sollen
- Externe Ärzte, die Zugang benötigen
- Temporäre Mitarbeiter

---

## 🔐 API-Endpoint

### **POST `/api/auth/register`**

**Zugriff:** Öffentlich (keine Authentifizierung erforderlich)

**URL:** `http://localhost:5001/api/auth/register`

---

## 📝 Request-Body

### Erforderliche Felder:

```json
{
  "email": "neuer.mitarbeiter@praxis.at",
  "password": "Passwort123",
  "firstName": "Max",
  "lastName": "Mustermann",
  "role": "doctor"
}
```

### Feld-Details:

| Feld | Typ | Erforderlich | Beschreibung | Validierung |
|------|-----|--------------|--------------|-------------|
| `email` | string | ✅ Ja | E-Mail-Adresse des Benutzers | Muss gültiges E-Mail-Format haben, wird normalisiert (lowercase, trim) |
| `password` | string | ✅ Ja | Passwort für den Benutzer | Mindestens 6 Zeichen |
| `firstName` | string | ✅ Ja | Vorname des Benutzers | Nicht leer, wird getrimmt |
| `lastName` | string | ✅ Ja | Nachname des Benutzers | Nicht leer, wird getrimmt |
| `role` | string | ✅ Ja | Rolle des Benutzers | Muss einer der erlaubten Rollen sein |

### Erlaubte Rollen:

- ✅ `admin` - Administrator
- ✅ `doctor` - Arzt
- ✅ `staff` - Mitarbeiter

**⚠️ Wichtig:** Andere Rollen wie `super_admin`, `arzt`, `assistent`, etc. sind **nicht** über die öffentliche Registrierung erlaubt!

---

## ✅ Validierung (Backend)

### 1. **Express-Validator Prüfungen:**

```javascript
body('email').isEmail().normalizeEmail()
// → Prüft E-Mail-Format, normalisiert zu lowercase

body('password').isLength({ min: 6 })
// → Passwort muss mindestens 6 Zeichen lang sein

body('firstName').notEmpty().trim()
// → Vorname darf nicht leer sein, Leerzeichen werden entfernt

body('lastName').notEmpty().trim()
// → Nachname darf nicht leer sein, Leerzeichen werden entfernt

body('role').isIn(['admin', 'doctor', 'staff'])
// → Rolle muss einer der erlaubten Rollen entsprechen
```

### 2. **Datenbank-Prüfungen:**

```javascript
// Prüft ob E-Mail bereits existiert
let user = await User.findOne({ email });
if (user) {
  return res.status(400).json({
    success: false,
    message: 'Benutzer existiert bereits'
  });
}
```

### 3. **Passwort-Hashung:**

Das Passwort wird **automatisch** vom User-Model gehasht (bcrypt), bevor es in der Datenbank gespeichert wird.

---

## 🔄 Ablauf der Registrierung

### Schritt 1: Request an Backend

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "neuer.mitarbeiter@praxis.at",
  "password": "Passwort123",
  "firstName": "Max",
  "lastName": "Mustermann",
  "role": "doctor"
}
```

### Schritt 2: Backend-Validierung

1. ✅ **Express-Validator** prüft alle Felder
2. ✅ **E-Mail-Eindeutigkeit** wird geprüft
3. ✅ **User-Model** erstellt neuen Benutzer
4. ✅ **Passwort** wird automatisch gehasht
5. ✅ **JWT-Token** wird generiert

### Schritt 3: Response

**Erfolgreich (201 Created):**

```json
{
  "success": true,
  "message": "Benutzer erfolgreich registriert",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "neuer.mitarbeiter@praxis.at",
    "firstName": "Max",
    "lastName": "Mustermann",
    "role": "doctor"
  }
}
```

**Fehler (400 Bad Request):**

```json
{
  "success": false,
  "message": "Validierungsfehler",
  "errors": [
    {
      "type": "field",
      "value": "invalid-email",
      "msg": "Invalid value",
      "path": "email",
      "location": "body"
    }
  ]
}
```

**Fehler - Benutzer existiert bereits (400 Bad Request):**

```json
{
  "success": false,
  "message": "Benutzer existiert bereits"
}
```

---

## 💻 Verwendung

### 1. **Via cURL (Terminal):**

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "neuer.mitarbeiter@praxis.at",
    "password": "Passwort123",
    "firstName": "Max",
    "lastName": "Mustermann",
    "role": "doctor"
  }'
```

### 2. **Via JavaScript/Fetch:**

```javascript
const response = await fetch('http://localhost:5001/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'neuer.mitarbeiter@praxis.at',
    password: 'Passwort123',
    firstName: 'Max',
    lastName: 'Mustermann',
    role: 'doctor'
  })
});

const data = await response.json();

if (data.success) {
  console.log('Registrierung erfolgreich!');
  console.log('Token:', data.token);
  console.log('Benutzer:', data.user);
  
  // Token speichern für weitere Requests
  localStorage.setItem('token', data.token);
} else {
  console.error('Fehler:', data.message);
  console.error('Details:', data.errors);
}
```

### 3. **Via Redux (Frontend):**

```typescript
import { useAppDispatch } from '../store/hooks';
import { register } from '../store/slices/authSlice';

const MyComponent = () => {
  const dispatch = useAppDispatch();

  const handleRegister = async () => {
    try {
      const result = await dispatch(register({
        email: 'neuer.mitarbeiter@praxis.at',
        password: 'Passwort123',
        firstName: 'Max',
        lastName: 'Mustermann',
        role: 'doctor'
      })).unwrap();
      
      console.log('Registrierung erfolgreich!', result);
      // Benutzer ist jetzt automatisch angemeldet
    } catch (error) {
      console.error('Registrierung fehlgeschlagen:', error);
    }
  };

  return <button onClick={handleRegister}>Registrieren</button>;
};
```

---

## 🔒 Sicherheit

### ✅ Implementierte Sicherheitsmaßnahmen:

1. **Passwort-Hashung:**
   - Passwörter werden mit bcrypt gehasht
   - Nie als Klartext in der Datenbank gespeichert

2. **E-Mail-Validierung:**
   - E-Mail-Format wird geprüft
   - E-Mail wird normalisiert (lowercase, trim)
   - E-Mail-Eindeutigkeit wird geprüft

3. **Rollen-Beschränkung:**
   - Nur `admin`, `doctor`, `staff` sind erlaubt
   - `super_admin` kann **nicht** über öffentliche Registrierung erstellt werden

4. **Input-Validierung:**
   - Alle Eingaben werden validiert
   - Leerzeichen werden entfernt
   - SQL-Injection-Schutz durch Mongoose

### ⚠️ Wichtige Hinweise:

- **Keine E-Mail-Verifizierung:** Die Registrierung erfordert aktuell keine E-Mail-Bestätigung
- **Keine Passwort-Stärke-Prüfung:** Nur Mindestlänge wird geprüft (6 Zeichen)
- **Sofortige Anmeldung:** Nach erfolgreicher Registrierung erhält der Benutzer sofort ein JWT-Token

---

## 📊 Was passiert nach der Registrierung?

### 1. **Benutzer wird erstellt:**

```javascript
user = new User({
  email,
  password,  // Wird automatisch gehasht
  firstName,
  lastName,
  role
});

await user.save();
```

### 2. **JWT-Token wird generiert:**

```javascript
const payload = {
  user: {
    id: user.id
  }
};

jwt.sign(
  payload,
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRE || '24h' },
  (err, token) => {
    // Token wird an Client zurückgegeben
  }
);
```

### 3. **Benutzer ist sofort angemeldet:**

- Token wird in der Response zurückgegeben
- Frontend kann Token in `localStorage` speichern
- Weitere API-Requests können mit diesem Token authentifiziert werden

---

## 🎯 Beispiel-Workflow

### Szenario: Neuer Arzt möchte sich registrieren

1. **Arzt füllt Registrierungsformular aus:**
   - E-Mail: `dr.mueller@praxis.at`
   - Passwort: `SicheresPasswort123`
   - Vorname: `Hans`
   - Nachname: `Müller`
   - Rolle: `doctor`

2. **Frontend sendet Request:**
   ```javascript
   POST /api/auth/register
   {
     "email": "dr.mueller@praxis.at",
     "password": "SicheresPasswort123",
     "firstName": "Hans",
     "lastName": "Müller",
     "role": "doctor"
   }
   ```

3. **Backend validiert:**
   - ✅ E-Mail-Format ist gültig
   - ✅ Passwort ist lang genug (≥ 6 Zeichen)
   - ✅ Vorname und Nachname sind vorhanden
   - ✅ Rolle ist erlaubt (`doctor`)
   - ✅ E-Mail existiert noch nicht

4. **Backend erstellt Benutzer:**
   - Passwort wird gehasht
   - Benutzer wird in Datenbank gespeichert
   - JWT-Token wird generiert

5. **Response an Frontend:**
   ```json
   {
     "success": true,
     "message": "Benutzer erfolgreich registriert",
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": "507f1f77bcf86cd799439011",
       "email": "dr.mueller@praxis.at",
       "firstName": "Hans",
       "lastName": "Müller",
       "role": "doctor"
     }
   }
   ```

6. **Frontend speichert Token:**
   ```javascript
   localStorage.setItem('token', data.token);
   ```

7. **Arzt ist jetzt angemeldet** und kann das System nutzen!

---

## 🚫 Häufige Fehler

### Fehler 1: E-Mail bereits vorhanden

```json
{
  "success": false,
  "message": "Benutzer existiert bereits"
}
```

**Lösung:** Verwenden Sie eine andere E-Mail-Adresse oder melden Sie sich direkt an.

### Fehler 2: Ungültige Rolle

```json
{
  "success": false,
  "message": "Validierungsfehler",
  "errors": [
    {
      "type": "field",
      "value": "super_admin",
      "msg": "Invalid value",
      "path": "role"
    }
  ]
}
```

**Lösung:** Verwenden Sie nur `admin`, `doctor` oder `staff`.

### Fehler 3: Passwort zu kurz

```json
{
  "success": false,
  "message": "Validierungsfehler",
  "errors": [
    {
      "type": "field",
      "value": "123",
      "msg": "Invalid value",
      "path": "password"
    }
  ]
}
```

**Lösung:** Passwort muss mindestens 6 Zeichen lang sein.

### Fehler 4: Ungültiges E-Mail-Format

```json
{
  "success": false,
  "message": "Validierungsfehler",
  "errors": [
    {
      "type": "field",
      "value": "keine-email",
      "msg": "Invalid value",
      "path": "email"
    }
  ]
}
```

**Lösung:** Verwenden Sie eine gültige E-Mail-Adresse.

---

## 🔄 Unterschied zur Admin-Benutzerverwaltung

| Feature | Öffentliche Registrierung | Admin-Benutzerverwaltung |
|---------|---------------------------|--------------------------|
| **Zugriff** | Öffentlich (kein Login erforderlich) | Authentifiziert (Admin-Login erforderlich) |
| **Erlaubte Rollen** | `admin`, `doctor`, `staff` | Alle Rollen (`admin`, `doctor`, `nurse`, `receptionist`, `assistant`, `staff`, `super_admin`, `arzt`, `assistent`, `rezeption`, `billing`, `patient`) |
| **RBAC-Prüfung** | ❌ Nein | ✅ Ja (`users.create`-Berechtigung) |
| **StaffProfile** | ❌ Wird nicht automatisch erstellt | ✅ Wird automatisch erstellt (außer für `admin`) |
| **Erstellt von** | System | `req.user.id` (Admin) |
| **Verwendung** | Selbstregistrierung | Verwaltung durch Administratoren |

---

## 📝 Frontend-Integration (Aktueller Status)

### ⚠️ **Wichtig:** Es gibt aktuell **keine Frontend-Registrierungsseite**!

Die Registrierung ist nur über die API möglich. Um eine Frontend-Seite zu erstellen, könnten Sie:

1. **Neue Seite erstellen:** `/frontend/src/pages/Register.tsx`
2. **Route hinzufügen:** In `App.tsx` eine öffentliche Route `/register` erstellen
3. **Formular erstellen:** Mit Feldern für `email`, `password`, `firstName`, `lastName`, `role`
4. **Redux-Action verwenden:** `dispatch(register(userData))`

### Beispiel-Frontend-Komponente:

```typescript
import React, { useState } from 'react';
import { useAppDispatch } from '../store/hooks';
import { register } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'staff'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(register(formData)).unwrap();
      navigate('/dashboard'); // Weiterleitung nach erfolgreicher Registrierung
    } catch (error) {
      console.error('Registrierung fehlgeschlagen:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Formular-Felder */}
    </form>
  );
};
```

---

## 🎓 Zusammenfassung

Die öffentliche Registrierung ist ein **öffentlicher API-Endpoint**, der es neuen Benutzern ermöglicht, sich selbst zu registrieren. Sie ist:

- ✅ **Einfach zu verwenden** - Nur 5 Felder erforderlich
- ✅ **Sicher** - Passwort-Hashung, E-Mail-Validierung
- ✅ **Eingeschränkt** - Nur bestimmte Rollen erlaubt
- ✅ **Sofort aktiv** - Benutzer erhält sofort ein JWT-Token

**Aktueller Status:** Nur über API verfügbar, keine Frontend-UI vorhanden.




