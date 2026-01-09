# Super Administrator Setup

## 🎯 **Überblick**

Der Super Administrator ist der höchste Benutzer im System mit vollständigen Berechtigungen für alle Funktionen und Einstellungen.

## 🔐 **Wer sollte Super Administrator sein?**

### **Empfehlung: Kunde/Betreiber**
- **Praxisleiter/Arzt**: Derjenige, der das System täglich verwaltet
- **IT-Administrator**: Technischer Verantwortlicher der Praxis
- **Praxis-Manager**: Verwaltungsleiter der Praxis

### **Nicht empfohlen: Softwarehersteller**
- Entwickler haben normalerweise keinen täglichen Zugriff
- Sicherheitsrisiko bei externen Zugriffen
- Kunde sollte die Kontrolle über sein System haben

## 🚀 **Erstellungsmethoden**

### **1. Automatisches Setup-Script**
```bash
cd backend
node scripts/setupSuperAdmin.js
```

**Vorteile:**
- Einfach und schnell
- Automatische Validierung
- Sichere Passwort-Hashung
- Vollständige RBAC-Integration

### **2. API-basiertes Setup**
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

### **3. Frontend Setup-Interface**
- Navigieren Sie zu `/super-admin-setup`
- Füllen Sie das Formular aus
- System erstellt automatisch den Super Admin

### **4. Migration bestehender Admins**
```bash
# Befördere einen bestehenden Admin zum Super Admin
curl -X POST http://localhost:5001/api/setup/promote-to-super-admin \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID_HERE"}'
```

## 📋 **Setup-Checkliste**

### **Vor der Erstellung:**
- [ ] System ist vollständig installiert
- [ ] MongoDB ist erreichbar
- [ ] Kein anderer Super Admin existiert bereits
- [ ] Sichere E-Mail-Adresse gewählt
- [ ] Starkes Passwort vorbereitet

### **Nach der Erstellung:**
- [ ] Erste Anmeldung erfolgreich
- [ ] Passwort geändert
- [ ] 2FA aktiviert (falls verfügbar)
- [ ] Weitere Administratoren erstellt
- [ ] Systemeinstellungen konfiguriert
- [ ] Backup-Strategie eingerichtet

## 🔒 **Sicherheitsrichtlinien**

### **Passwort-Anforderungen:**
- Mindestens 8 Zeichen
- Groß- und Kleinbuchstaben
- Zahlen und Sonderzeichen
- Einzigartig (nicht in anderen Systemen verwendet)

### **Zugriffskontrolle:**
- Super Admin-Zugang nur für autorisierte Personen
- Regelmäßige Passwort-Änderungen
- Überwachung aller Super Admin-Aktivitäten
- Keine gemeinsamen Accounts

### **Notfall-Plan:**
- Backup-Super Admin definieren
- Wiederherstellungsverfahren dokumentiert
- Kontaktinformationen für Support hinterlegt

## 🛠️ **Verwaltung**

### **Super Admin-Befugnisse:**
- Vollzugriff auf alle Module
- Benutzer- und Rollenverwaltung
- Systemkonfiguration
- Audit-Log-Einsicht
- Backup und Wiederherstellung
- API-Schlüssel-Verwaltung

### **Delegation:**
- Erstellen von Admin-Benutzern
- Rollen-spezifische Berechtigungen
- Temporäre Zugriffe
- Ressourcen-spezifische Kontrolle

## 📊 **Monitoring und Audit**

### **Überwachung:**
- Alle Super Admin-Aktivitäten werden protokolliert
- Ungewöhnliche Zugriffe werden gemeldet
- Regelmäßige Sicherheitsberichte

### **Audit-Log:**
- Wer hat was wann gemacht
- Änderungen an kritischen Einstellungen
- Fehlgeschlagene Anmeldeversuche
- Systemzugriffe und -änderungen

## 🆘 **Troubleshooting**

### **Häufige Probleme:**

**"Super Admin existiert bereits"**
- Lösung: Verwenden Sie die API zum Befördern eines bestehenden Admins

**"E-Mail bereits verwendet"**
- Lösung: Verwenden Sie eine andere E-Mail-Adresse oder löschen Sie den bestehenden Benutzer

**"Passwort zu schwach"**
- Lösung: Verwenden Sie ein Passwort mit mindestens 8 Zeichen, Groß-/Kleinbuchstaben, Zahlen und Sonderzeichen

**"MongoDB-Verbindungsfehler"**
- Lösung: Überprüfen Sie die MongoDB-Verbindung und Umgebungsvariablen

### **Support-Kontakt:**
- E-Mail: support@ordinationssoftware.at
- Telefon: +43 1 234 5678
- Dokumentation: https://docs.ordinationssoftware.at

## 📚 **Weitere Ressourcen**

- [RBAC-Dokumentation](./RBAC.md)
- [Benutzerverwaltung](./USER_MANAGEMENT.md)
- [Sicherheitsrichtlinien](./SECURITY.md)
- [API-Dokumentation](./API.md)

---

**Wichtiger Hinweis:** Bewahren Sie die Super Admin-Zugangsdaten sicher auf und teilen Sie sie nur mit autorisierten Personen. Bei Verlust der Zugangsdaten kann das System nur durch technischen Support wiederhergestellt werden.
