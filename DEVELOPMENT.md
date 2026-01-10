# Entwicklung & Test Setup

## Kamera-Funktion testen

Die Kamera-Funktion erfordert HTTPS. Für die lokale Entwicklung gibt es zwei einfache Optionen:

### Option 1: ngrok (Empfohlen - am einfachsten)

```bash
# 1. ngrok installieren (falls nicht vorhanden)
brew install ngrok
# Oder: https://ngrok.com/download

# 2. Backend starten
cd backend
npm start

# 3. Frontend starten (in neuem Terminal)
cd frontend
npm start

# 4. ngrok starten (in neuem Terminal)
ngrok http 3000
```

ngrok gibt Ihnen eine HTTPS-URL (z.B. `https://abc123.ngrok.io`), die Sie auf Ihrem mobilen Gerät verwenden können.

### Option 2: mkcert (Für lokale IP-Adressen)

```bash
# 1. mkcert installieren
brew install mkcert
mkcert -install

# 2. SSL-Zertifikat erstellen
./setup-https.sh

# 3. Frontend mit HTTPS starten
cd frontend
npm run start:https
```

Dann rufen Sie die Seite über `https://192.168.178.163:3000` auf (Ihre lokale IP).

## Produktion

In der Produktion (Cloud-Lösung) funktioniert die Kamera automatisch, da Cloud-Provider normalerweise HTTPS bereitstellen. Die Anwendung erkennt automatisch, ob sie in Produktion läuft und verwendet HTTPS.

## Wichtig

- **Entwicklung**: Verwenden Sie ngrok oder mkcert für HTTPS
- **Produktion**: HTTPS wird automatisch vom Cloud-Provider bereitgestellt
- Die Anwendung erkennt automatisch die Umgebung und passt sich an
