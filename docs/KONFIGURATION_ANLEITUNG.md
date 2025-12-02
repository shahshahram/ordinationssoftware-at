# Konfigurations-Anleitung für Abrechnungsfeatures

## Stand: 02.12.2025

## Wo sind die Konfigurationen?

### 1. Hauptkonfigurationsdatei: `.env`

Die Konfigurationen werden in einer **`.env` Datei** im `backend/` Verzeichnis gespeichert.

**Pfad:** `ordinationssoftware-at/backend/.env`

**Wichtig:** Diese Datei ist nicht in Git und muss manuell erstellt werden!

### 2. Beispiel-Konfigurationen

Es gibt mehrere Beispiel-Dateien, die als Vorlage dienen:

- **`backend/billing-config.env.example`** - **NEU:** Alle neuen Abrechnungsfeatures (KDok, Direktverrechnung, etc.)
- `backend/email-config.example` - E-Mail-Konfiguration
- `backend/one-click-billing.env.example` - One-Click-Billing Konfiguration
- `backend/config/elga.config.js` - ELGA-Konfiguration (JavaScript)
- `backend/ELGA_GINA_CONFIG.md` - Dokumentation für ELGA/GINA

---

## Schnellstart: Konfiguration einrichten

### Schritt 1: Beispiel-Datei kopieren

```bash
cd ordinationssoftware-at/backend
cp billing-config.env.example .env
```

### Schritt 2: `.env` Datei bearbeiten

Öffnen Sie die `.env` Datei und ersetzen Sie alle `your-...` Werte mit echten Werten:

```bash
nano .env  # oder verwenden Sie Ihren bevorzugten Editor
```

### Schritt 3: Zertifikate einrichten (falls benötigt)

```bash
mkdir -p certs
# Speichern Sie Ihre Zertifikate in backend/certs/
```

---

## Konfigurationsübersicht

### KDok-Integration

```env
KDOK_BASE_URL=https://kdok.gv.at/api
KDOK_CLIENT_ID=your-kdok-client-id
KDOK_CLIENT_SECRET=your-kdok-client-secret
KDOK_ENVIRONMENT=production
KDOK_AUTO_SUBMIT=true
KDOK_SUBMISSION_METHOD=xml
```

### GINA-Integration

```env
GINA_BASE_URL=https://gina.gv.at/api
GINA_CLIENT_ID=your-gina-client-id
GINA_CLIENT_SECRET=your-gina-client-secret
GINA_AUTO_SUBMIT=true
```

### Direktverrechnung - myCare

```env
MYCARE_BASE_URL=https://api.mycare.at
MYCARE_API_KEY=your-mycare-api-key
MYCARE_ENABLED=true
```

### Direktverrechnung - RehaDirekt

```env
REHADIREKT_BASE_URL=https://api.rehadirekt.at
REHADIREKT_USERNAME=your-username
REHADIREKT_PASSWORD=your-password
REHADIREKT_ENABLED=true
```

### Direktverrechnung - eAbrechnung

```env
EABRECHNUNG_BASE_URL=https://api.eabrechnung.at
EABRECHNUNG_CLIENT_ID=your-client-id
EABRECHNUNG_CLIENT_SECRET=your-client-secret
EABRECHNUNG_ENABLED=true
```

---

## Vollständige Konfiguration

Die vollständige Liste aller Konfigurationsvariablen finden Sie in:

**`backend/billing-config.env.example`**

Diese Datei enthält alle benötigten Variablen mit Beschreibungen.

---

## Konfiguration testen

### KDok-Status prüfen

```bash
curl -X GET http://localhost:5001/api/kdok/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### GINA-Status prüfen

```bash
curl -X GET http://localhost:5001/api/gina/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Direktverrechnung-Systeme abrufen

```bash
curl -X GET http://localhost:5001/api/direct-billing/systems \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Sicherheitshinweise

1. **`.env` Datei niemals committen:**
   - Die `.env` Datei sollte bereits in `.gitignore` sein
   - Verwenden Sie nur die `.example` Dateien für Git

2. **Zertifikate schützen:**
   - Speichern Sie Zertifikate in `backend/certs/`
   - Setzen Sie sichere Berechtigungen: `chmod 600 certs/*.key`
   - Fügen Sie `certs/` zu `.gitignore` hinzu

3. **Passwörter und Secrets:**
   - Verwenden Sie starke Passwörter
   - Verwenden Sie unterschiedliche Secrets für Test und Produktion
   - Rotieren Sie Secrets regelmäßig

---

## Troubleshooting

### Konfiguration wird nicht geladen

1. Prüfen Sie, ob die `.env` Datei im `backend/` Verzeichnis existiert
2. Prüfen Sie, ob alle Variablen korrekt gesetzt sind
3. Starten Sie den Server neu nach Änderungen

### Zertifikate werden nicht gefunden

1. Prüfen Sie die Pfade in der `.env` Datei
2. Stellen Sie sicher, dass die Zertifikate im `backend/certs/` Verzeichnis sind
3. Prüfen Sie die Dateiberechtigungen

### API-Verbindungen schlagen fehl

1. Prüfen Sie die Base-URLs in der `.env` Datei
2. Überprüfen Sie Client-ID und Client-Secret
3. Prüfen Sie die Netzwerkverbindung

---

## Weitere Informationen

- **ELGA/GINA:** Siehe `backend/ELGA_GINA_CONFIG.md`
- **E-Mail:** Siehe `backend/email-config.example`
- **One-Click-Billing:** Siehe `backend/one-click-billing.env.example`

