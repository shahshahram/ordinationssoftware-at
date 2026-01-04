#!/bin/bash

# MongoDB Encryption at Rest Setup Script
# Für MongoDB Enterprise Edition

set -e

echo "🔐 MongoDB Encryption at Rest Setup"
echo "=================================="
echo ""

# Prüfe ob MongoDB Enterprise Edition installiert ist
if ! mongod --version | grep -q "enterprise"; then
    echo "⚠️  MongoDB Enterprise Edition nicht erkannt"
    echo "📝 Hinweis: Encryption at Rest erfordert MongoDB Enterprise Edition"
    echo ""
    echo "Alternativen:"
    echo "1. Upgrade auf MongoDB Enterprise Edition"
    echo "2. Verwenden Sie Application-Level Field Encryption (bereits implementiert)"
    echo ""
    read -p "Möchten Sie trotzdem fortfahren? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Generiere Verschlüsselungsschlüssel
echo "🔑 Generiere Verschlüsselungsschlüssel..."
ENCRYPTION_KEY=$(openssl rand -base64 32)
KEY_FILE="/etc/mongodb/encryption-key"

echo "Schlüssel generiert: ${ENCRYPTION_KEY:0:20}..."
echo ""

# Erstelle Key-File (benötigt sudo)
echo "📝 Erstelle Key-File..."
sudo mkdir -p /etc/mongodb
echo "$ENCRYPTION_KEY" | sudo tee "$KEY_FILE" > /dev/null
sudo chmod 600 "$KEY_FILE"
sudo chown mongodb:mongodb "$KEY_FILE" 2>/dev/null || sudo chown $(whoami):$(whoami) "$KEY_FILE"
echo "✅ Key-File erstellt: $KEY_FILE"
echo ""

# MongoDB-Konfigurationsdatei finden
MONGODB_CONF=""
if [ -f "/opt/homebrew/etc/mongod.conf" ]; then
    MONGODB_CONF="/opt/homebrew/etc/mongod.conf"
elif [ -f "/etc/mongod.conf" ]; then
    MONGODB_CONF="/etc/mongod.conf"
elif [ -f "/usr/local/etc/mongod.conf" ]; then
    MONGODB_CONF="/usr/local/etc/mongod.conf"
fi

if [ -z "$MONGODB_CONF" ]; then
    echo "⚠️  MongoDB-Konfigurationsdatei nicht gefunden"
    echo "📝 Bitte konfigurieren Sie manuell:"
    echo ""
    echo "Fügen Sie folgendes zu Ihrer mongod.conf hinzu:"
    echo ""
    echo "security:"
    echo "  enableEncryption: true"
    echo "  encryptionKeyFile: $KEY_FILE"
    echo ""
    exit 1
fi

echo "📝 MongoDB-Konfigurationsdatei gefunden: $MONGODB_CONF"
echo ""

# Backup der Konfiguration
echo "💾 Erstelle Backup der Konfiguration..."
sudo cp "$MONGODB_CONF" "${MONGODB_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup erstellt"
echo ""

# Füge Encryption-Konfiguration hinzu
echo "🔧 Konfiguriere Encryption..."
if grep -q "enableEncryption" "$MONGODB_CONF"; then
    echo "⚠️  Encryption bereits konfiguriert"
else
    # Füge Security-Sektion hinzu oder erweitere sie
    if grep -q "^security:" "$MONGODB_CONF"; then
        # Security-Sektion existiert bereits
        if ! grep -q "enableEncryption" "$MONGODB_CONF"; then
            sudo sed -i.bak '/^security:/a\
  enableEncryption: true\
  encryptionKeyFile: '"$KEY_FILE" "$MONGODB_CONF"
        fi
    else
        # Füge neue Security-Sektion hinzu
        echo "" | sudo tee -a "$MONGODB_CONF" > /dev/null
        echo "security:" | sudo tee -a "$MONGODB_CONF" > /dev/null
        echo "  enableEncryption: true" | sudo tee -a "$MONGODB_CONF" > /dev/null
        echo "  encryptionKeyFile: $KEY_FILE" | sudo tee -a "$MONGODB_CONF" > /dev/null
    fi
    echo "✅ Encryption konfiguriert"
fi

echo ""
echo "📋 Nächste Schritte:"
echo "1. MongoDB neu starten:"
echo "   brew services restart mongodb-community  # macOS"
echo "   sudo systemctl restart mongod            # Linux"
echo ""
echo "2. Prüfen Sie die Logs auf Fehler:"
echo "   tail -f /opt/homebrew/var/log/mongodb/mongo.log  # macOS"
echo "   tail -f /var/log/mongodb/mongod.log             # Linux"
echo ""
echo "3. Testen Sie die Verbindung:"
echo "   mongosh --eval 'db.adminCommand({getParameter: 1, encryption: 1})'"
echo ""
echo "⚠️  WICHTIG:"
echo "- Bewahren Sie den Key-File sicher auf!"
echo "- Erstellen Sie ein Backup des Key-Files!"
echo "- Ohne Key-File können verschlüsselte Daten nicht mehr entschlüsselt werden!"
echo ""







