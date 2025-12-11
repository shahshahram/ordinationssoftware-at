# ELGA & GINA Konfiguration

Diese Dokumentation beschreibt die Konfiguration von ELGA (Elektronische Gesundheitsakte) und GINA (Gesundheits-Informations-Netz-Adapter) für die Ordinationssoftware.

## Umgebungsvariablen

### ELGA-Konfiguration

Fügen Sie folgende Umgebungsvariablen zu Ihrer `.env` Datei hinzu:

```bash
# ELGA Umgebung (development, test, production)
ELGA_ENVIRONMENT=development

# ELGA Test-Umgebung
ELGA_TEST_API_URL=https://test.elga.gv.at/api
ELGA_TEST_CLIENT_ID=your_test_client_id
ELGA_TEST_CLIENT_SECRET=your_test_client_secret
ELGA_TEST_REDIRECT_URI=http://localhost:5001/api/elga/callback

# ELGA Produktions-Umgebung
ELGA_PROD_API_URL=https://elga.gv.at/api
ELGA_PROD_CLIENT_ID=your_prod_client_id
ELGA_PROD_CLIENT_SECRET=your_prod_client_secret
ELGA_PROD_REDIRECT_URI=https://your-domain.com/api/elga/callback

# ELGA Zertifikate
ELGA_CLIENT_CERT_PATH=./certs/elga-client.crt
ELGA_CLIENT_KEY_PATH=./certs/elga-client.key
ELGA_CA_CERT_PATH=./certs/elga-ca.crt
ELGA_CERT_PASSPHRASE=your_cert_passphrase

# ELGA e-card Validierung
ELGA_ECARD_TIMEOUT=30000
ELGA_ECARD_CACHE_DURATION=3600000
ELGA_ENABLE_FALLBACK=true

# ELGA Abrechnungsübermittlung
ELGA_AUTO_SUBMIT=false
ELGA_SUBMIT_SCHEDULE=0 23 * * *
ELGA_MAX_RETRIES=3
ELGA_RETRY_DELAY=60000

# ELGA Logging
ELGA_VERBOSE_LOGGING=false
ELGA_LOG_LEVEL=info
```

### GINA-Konfiguration

Fügen Sie folgende Umgebungsvariablen zu Ihrer `.env` Datei hinzu:

```bash
# GINA Umgebung (development, test, production)
GINA_ENVIRONMENT=development

# GINA API-Konfiguration
GINA_BASE_URL=https://gina.gv.at/api
GINA_CLIENT_ID=your_gina_client_id
GINA_CLIENT_SECRET=your_gina_client_secret

# GINA Zertifikate
GINA_CLIENT_CERT_PATH=./certs/gina-client.crt
GINA_CLIENT_KEY_PATH=./certs/gina-client.key
GINA_CA_CERT_PATH=./certs/gina-ca.crt
GINA_CERT_PASSPHRASE=your_gina_cert_passphrase

# GINA Timeout
GINA_TIMEOUT=30000
```

## Zertifikate einrichten

### 1. Zertifikatsverzeichnis erstellen

```bash
mkdir -p backend/certs
```

### 2. ELGA-Zertifikate

Für die Produktionsumgebung benötigen Sie Zertifikate von ELGA:

1. **Zertifikate beantragen:**
   - Kontaktieren Sie ELGA für die Zertifikatsbeantragung
   - Weitere Informationen: https://www.elga.gv.at/

2. **Zertifikate speichern:**
   - `elga-client.crt` - Client-Zertifikat
   - `elga-client.key` - Privater Schlüssel
   - `elga-ca.crt` - CA-Zertifikat (optional)

3. **Berechtigungen setzen:**
   ```bash
   chmod 600 backend/certs/elga-client.key
   chmod 644 backend/certs/elga-client.crt
   ```

### 3. GINA-Zertifikate

Für die Produktionsumgebung benötigen Sie Zertifikate von GINA:

1. **Zertifikate beantragen:**
   - Kontaktieren Sie die SVC (Sozialversicherungs-Chipkarten Betriebs- und Errichtungsgesellschaft m.b.H.)
   - Weitere Informationen: https://www.svc.at/

2. **Zertifikate speichern:**
   - `gina-client.crt` - Client-Zertifikat
   - `gina-client.key` - Privater Schlüssel
   - `gina-ca.crt` - CA-Zertifikat (optional)

3. **Berechtigungen setzen:**
   ```bash
   chmod 600 backend/certs/gina-client.key
   chmod 644 backend/certs/gina-client.crt
   ```

## Konfiguration testen

### ELGA-Status prüfen

```bash
curl -X GET http://localhost:5001/api/elga/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### GINA-Status prüfen

```bash
curl -X GET http://localhost:5001/api/gina/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### e-card Validierung testen

```bash
curl -X POST http://localhost:5001/api/ecard/patient/PATIENT_ID/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ecardNumber": "1234567890123456"
  }'
```

## Sicherheitshinweise

1. **Zertifikate niemals committen:**
   - Fügen Sie `backend/certs/` zu Ihrer `.gitignore` hinzu
   - Verwenden Sie sichere Passphrasen für private Schlüssel

2. **Umgebungsvariablen schützen:**
   - `.env` Datei niemals committen
   - Verwenden Sie sichere Passwörter für Client Secrets

3. **Produktionsumgebung:**
   - Verwenden Sie immer Produktions-Zertifikate
   - Aktivieren Sie HTTPS für alle API-Aufrufe
   - Überwachen Sie Logs auf Fehler

## Troubleshooting

### ELGA-Authentifizierung schlägt fehl

1. Prüfen Sie die Client-ID und das Client-Secret
2. Überprüfen Sie die Zertifikate
3. Prüfen Sie die Netzwerkverbindung zur ELGA-API

### GINA-Verbindung schlägt fehl

1. Prüfen Sie die GINA-Konfiguration
2. Überprüfen Sie die Zertifikate
3. Kontaktieren Sie die SVC bei Problemen

### e-card Validierung funktioniert nicht

1. Prüfen Sie, ob die e-card Nummer korrekt ist
2. Überprüfen Sie die Patientendaten (SV-Nummer, Geburtsdatum)
3. Prüfen Sie die ELGA/GINA-Verbindung

## Weitere Ressourcen

- **ELGA:** https://www.elga.gv.at/
- **GINA/SVC:** https://www.svc.at/
- **e-card:** https://www.e-card.gv.at/














