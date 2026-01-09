#!/bin/bash

# Installiert automatisches tägliches Backup für macOS

# Konfiguration
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="${REPO_DIR}/scripts/backup-repository.sh"
LAUNCH_AGENT_DIR="${HOME}/Library/LaunchAgents"
LAUNCH_AGENT_FILE="${LAUNCH_AGENT_DIR}/com.ordinationssoftware.backup.plist"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Installiere automatisches Backup...${NC}"
echo ""

# Prüfe ob Backup-Script existiert
if [ ! -f "${BACKUP_SCRIPT}" ]; then
    echo -e "${RED}❌ Backup-Script nicht gefunden: ${BACKUP_SCRIPT}${NC}"
    exit 1
fi

# Stelle sicher, dass Script ausführbar ist
chmod +x "${BACKUP_SCRIPT}"

# Erstelle LaunchAgents-Verzeichnis falls nicht vorhanden
mkdir -p "${LAUNCH_AGENT_DIR}"

# Erstelle LaunchAgent-Datei
echo -e "${GREEN}📝 Erstelle LaunchAgent...${NC}"
cat > "${LAUNCH_AGENT_FILE}" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ordinationssoftware.backup</string>
    <key>ProgramArguments</key>
    <array>
        <string>${BACKUP_SCRIPT}</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>${REPO_DIR}/backup.log</string>
    <key>StandardErrorPath</key>
    <string>${REPO_DIR}/backup.error.log</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF

echo -e "${GREEN}✅ LaunchAgent erstellt: ${LAUNCH_AGENT_FILE}${NC}"
echo ""

# Lade LaunchAgent
echo -e "${GREEN}🚀 Aktiviere automatisches Backup...${NC}"

# Entlade falls bereits geladen
launchctl unload "${LAUNCH_AGENT_FILE}" 2>/dev/null || true

# Lade neuen LaunchAgent
if launchctl load "${LAUNCH_AGENT_FILE}"; then
    echo -e "${GREEN}✅ Automatisches Backup aktiviert!${NC}"
    echo ""
    echo -e "${BLUE}📋 Konfiguration:${NC}"
    echo -e "   Zeit: Täglich um 2:00 Uhr morgens"
    echo -e "   Script: ${BACKUP_SCRIPT}"
    echo -e "   Log: ${REPO_DIR}/backup.log"
    echo ""
    echo -e "${GREEN}💡 Nützliche Befehle:${NC}"
    echo -e "   Status prüfen: launchctl list | grep ordinationssoftware"
    echo -e "   Deaktivieren: launchctl unload ${LAUNCH_AGENT_FILE}"
    echo -e "   Aktivieren: launchctl load ${LAUNCH_AGENT_FILE}"
    echo -e "   Log anzeigen: tail -f ${REPO_DIR}/backup.log"
    echo ""
    
    # Teste Backup-Script einmalig
    echo -e "${YELLOW}🧪 Teste Backup-Script...${NC}"
    "${BACKUP_SCRIPT}"
    
    echo ""
    echo -e "${GREEN}✅ Installation abgeschlossen!${NC}"
    echo -e "${GREEN}   Das Backup wird ab jetzt täglich um 2:00 Uhr automatisch ausgeführt.${NC}"
else
    echo -e "${RED}❌ Fehler beim Aktivieren des LaunchAgents${NC}"
    exit 1
fi



