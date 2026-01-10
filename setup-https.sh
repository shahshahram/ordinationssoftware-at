#!/bin/bash

# HTTPS Setup Script für Kamera-Funktion
# Dieses Script hilft beim Einrichten von HTTPS für die Entwicklung

echo "🔒 HTTPS Setup für Kamera-Funktion"
echo "===================================="
echo ""

# Prüfe, ob mkcert installiert ist
if ! command -v mkcert &> /dev/null; then
    echo "❌ mkcert ist nicht installiert."
    echo ""
    echo "Installation:"
    echo "  macOS: brew install mkcert"
    echo "  Linux: Siehe https://github.com/FiloSottile/mkcert"
    echo ""
    echo "Dann führen Sie aus: mkcert -install"
    exit 1
fi

echo "✅ mkcert ist installiert"
echo ""

# Wechsle ins Frontend-Verzeichnis
cd "$(dirname "$0")/frontend" || exit 1

# Erfrage die IP-Adresse
read -p "Geben Sie Ihre lokale IP-Adresse ein (z.B. 192.168.178.163): " IP_ADDRESS

if [ -z "$IP_ADDRESS" ]; then
    IP_ADDRESS="192.168.178.163"
    echo "Verwende Standard-IP: $IP_ADDRESS"
fi

echo ""
echo "📝 Erstelle SSL-Zertifikat für:"
echo "   - localhost"
echo "   - 127.0.0.1"
echo "   - $IP_ADDRESS"
echo ""

# Erstelle Zertifikat
mkcert localhost 127.0.0.1 "$IP_ADDRESS" ::1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Zertifikat erfolgreich erstellt!"
    echo ""
    echo "📋 Nächste Schritte:"
    echo "   1. Starten Sie den Server mit: npm run start:https"
    echo "   2. Rufen Sie die Seite über https://$IP_ADDRESS:3000 auf"
    echo "   3. Akzeptieren Sie die Sicherheitswarnung im Browser"
    echo ""
    echo "⚠️  Wichtig: Für mobile Geräte müssen Sie die IP-Adresse im Zertifikat haben."
    echo "   Falls die IP sich ändert, führen Sie dieses Script erneut aus."
else
    echo ""
    echo "❌ Fehler beim Erstellen des Zertifikats"
    exit 1
fi
