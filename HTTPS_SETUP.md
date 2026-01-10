# HTTPS Setup für Kamera-Funktion

Die Kamera-Funktion erfordert eine sichere Verbindung (HTTPS). Hier sind verschiedene Optionen:

## Option 1: ngrok (Empfohlen für Entwicklung)

ngrok erstellt einen sicheren Tunnel zu Ihrem lokalen Server.

### Installation:
```bash
# macOS
brew install ngrok

# Oder download von https://ngrok.com/download
```

### Verwendung:
```bash
# Terminal 1: Starten Sie den Backend-Server
cd backend
npm start

# Terminal 2: Starten Sie den Frontend-Server
cd frontend
npm start

# Terminal 3: Starten Sie ngrok für Frontend (Port 3000)
ngrok http 3000
```

ngrok gibt Ihnen eine HTTPS-URL (z.B. `https://abc123.ngrok.io`), die Sie auf Ihrem mobilen Gerät verwenden können.

## Option 2: Lokales HTTPS mit mkcert (Für lokale Entwicklung)

mkcert erstellt lokale SSL-Zertifikate, die von Browsern als vertrauenswürdig akzeptiert werden.

### Installation:
```bash
# macOS
brew install mkcert

# Zertifikatsautorität installieren
mkcert -install
```

### Zertifikat erstellen:
```bash
# Im Frontend-Verzeichnis
cd frontend
mkcert localhost 127.0.0.1 192.168.178.163 ::1
```

Dies erstellt `localhost+3.pem` und `localhost+3-key.pem`.

### React Dev Server mit HTTPS starten:
```bash
HTTPS=true SSL_CRT_FILE=localhost+3.pem SSL_KEY_FILE=localhost+3-key.pem npm start
```

## Option 3: React Dev Server HTTPS (Einfachste Lösung)

### Installation von local-ssl-proxy:
```bash
npm install -g local-ssl-proxy
```

### Verwendung:
```bash
# Terminal 1: Starten Sie den normalen React Dev Server
cd frontend
npm start

# Terminal 2: Starten Sie den SSL-Proxy
local-ssl-proxy --source 3443 --target 3000
```

Dann rufen Sie die Seite über `https://localhost:3443` auf.

## Option 4: Production-Setup mit Nginx (Für Produktion)

Für die Produktion sollten Sie Nginx mit SSL-Zertifikaten (Let's Encrypt) verwenden.

Siehe: `DEPLOYMENT.md` für Details.

## Wichtig für mobile Geräte:

- **ngrok**: Funktioniert sofort, keine Konfiguration nötig
- **mkcert**: Funktioniert nur, wenn die IP-Adresse im Zertifikat enthalten ist
- **local-ssl-proxy**: Funktioniert nur auf localhost, nicht für mobile Geräte über IP

**Empfehlung für Tests auf mobilen Geräten:** Verwenden Sie ngrok.
