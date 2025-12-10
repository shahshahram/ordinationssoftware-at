#!/bin/bash

# Installiert automatisches tägliches Commit und Push für macOS

# Konfiguration
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMIT_SCRIPT="${REPO_DIR}/scripts/daily-commit-and-push.sh"
LAUNCH_AGENT_DIR="${HOME}/Library/LaunchAgents"
LAUNCH_AGENT_FILE="${LAUNCH_AGENT_DIR}/com.ordinationssoftware.daily-commit.plist"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Installiere automatisches tägliches Commit und Push...${NC}"
echo ""

# Prüfe ob Commit-Script existiert
if [ ! -f "${COMMIT_SCRIPT}" ]; then
    echo -e "${RED}❌ Commit-Script nicht gefunden: ${COMMIT_SCRIPT}${NC}"
    exit 1
fi

# Stelle sicher, dass Script ausführbar ist
chmod +x "${COMMIT_SCRIPT}"

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
    <string>com.ordinationssoftware.daily-commit</string>
    <key>ProgramArguments</key>
    <array>
        <string>${COMMIT_SCRIPT}</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>23</integer>
        <key>Minute</key>
        <integer>59</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>${REPO_DIR}/daily-commit.log</string>
    <key>StandardErrorPath</key>
    <string>${REPO_DIR}/daily-commit.error.log</string>
    <key>RunAtLoad</key>
    <false/>
    <key>WorkingDirectory</key>
    <string>${REPO_DIR}</string>
</dict>
</plist>
EOF

echo -e "${GREEN}✅ LaunchAgent erstellt: ${LAUNCH_AGENT_FILE}${NC}"
echo ""

# Lade LaunchAgent
echo -e "${GREEN}🚀 Aktiviere automatisches tägliches Commit und Push...${NC}"

# Entlade falls bereits geladen
launchctl unload "${LAUNCH_AGENT_FILE}" 2>/dev/null || true

# Lade neuen LaunchAgent
if launchctl load "${LAUNCH_AGENT_FILE}"; then
    echo -e "${GREEN}✅ Automatisches tägliches Commit und Push aktiviert!${NC}"
    echo ""
    echo -e "${BLUE}📋 Konfiguration:${NC}"
    echo -e "   Zeit: Täglich um 23:59 Uhr"
    echo -e "   Script: ${COMMIT_SCRIPT}"
    echo -e "   Log: ${REPO_DIR}/daily-commit.log"
    echo ""
    echo -e "${GREEN}💡 Nützliche Befehle:${NC}"
    echo -e "   Status prüfen: launchctl list | grep ordinationssoftware"
    echo -e "   Deaktivieren: launchctl unload ${LAUNCH_AGENT_FILE}"
    echo -e "   Aktivieren: launchctl load ${LAUNCH_AGENT_FILE}"
    echo -e "   Log anzeigen: tail -f ${REPO_DIR}/daily-commit.log"
    echo ""
    
    # Teste Commit-Script einmalig (ohne zu committen, nur Status)
    echo -e "${YELLOW}🧪 Teste Commit-Script (Dry-Run)...${NC}"
    echo -e "${YELLOW}   (Führt keinen Commit aus, zeigt nur Status)${NC}"
    echo ""
    
    echo -e "${GREEN}✅ Installation abgeschlossen!${NC}"
    echo -e "${GREEN}   Das Commit und Push wird ab jetzt täglich um 23:59 Uhr automatisch ausgeführt.${NC}"
else
    echo -e "${RED}❌ Fehler beim Aktivieren des LaunchAgents${NC}"
    exit 1
fi

