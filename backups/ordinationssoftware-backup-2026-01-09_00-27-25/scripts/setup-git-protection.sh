#!/bin/bash

# Setup-Script für Git-Schutz und Backup-Automatisierung

# Konfiguration
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Richte Git-Schutz ein...${NC}"
echo ""

cd "${REPO_DIR}"

# 1. Mache Hooks ausführbar
echo -e "${GREEN}1. Mache Git-Hooks ausführbar...${NC}"
chmod +x .git/hooks/pre-checkout 2>/dev/null || true
chmod +x .git/hooks/pre-reset 2>/dev/null || true
chmod +x .git/hooks/post-commit 2>/dev/null || true
echo -e "${GREEN}   ✅ Hooks konfiguriert${NC}"
echo ""

# 2. Mache Backup-Scripts ausführbar
echo -e "${GREEN}2. Mache Backup-Scripts ausführbar...${NC}"
chmod +x scripts/backup-repository.sh
chmod +x scripts/auto-commit-wip.sh
chmod +x scripts/setup-git-protection.sh
echo -e "${GREEN}   ✅ Scripts konfiguriert${NC}"
echo ""

# 3. Git-Aliase einrichten
echo -e "${GREEN}3. Richte Git-Aliase ein...${NC}"
git config --local alias.save "!bash scripts/auto-commit-wip.sh --yes"
git config --local alias.backup "!bash scripts/backup-repository.sh"
git config --local alias.status-short "status --short"
git config --local alias.wip "!git add -A && git commit -m 'WIP: $(date +\"%Y-%m-%d %H:%M:%S\")'"
echo -e "${GREEN}   ✅ Aliase konfiguriert${NC}"
echo ""

# 4. Zeige verfügbare Befehle
echo -e "${BLUE}📋 Verfügbare Befehle:${NC}"
echo ""
echo -e "${YELLOW}  git save${NC}          - Erstellt automatisch einen WIP-Commit"
echo -e "${YELLOW}  git backup${NC}        - Erstellt ein Repository-Backup"
echo -e "${YELLOW}  git wip${NC}           - Schneller WIP-Commit"
echo ""
echo -e "${BLUE}📋 Manuelle Scripts:${NC}"
echo ""
echo -e "${YELLOW}  ./scripts/backup-repository.sh${NC}     - Vollständiges Backup"
echo -e "${YELLOW}  ./scripts/auto-commit-wip.sh${NC}       - WIP-Commit mit Bestätigung"
echo -e "${YELLOW}  ./scripts/auto-commit-wip.sh --yes${NC} - WIP-Commit ohne Bestätigung"
echo -e "${YELLOW}  ./scripts/auto-commit-wip.sh --yes --push${NC} - WIP-Commit + Push"
echo ""

# 5. Cron-Job Setup (optional)
echo -e "${BLUE}💡 Optional: Automatisches tägliches Backup einrichten${NC}"
echo ""
echo "Füge folgende Zeile zu deinem crontab hinzu (crontab -e):"
echo ""
echo -e "${YELLOW}  0 2 * * * ${REPO_DIR}/scripts/backup-repository.sh >> ${REPO_DIR}/backup.log 2>&1${NC}"
echo ""
echo "Dies erstellt täglich um 2 Uhr morgens ein Backup."
echo ""

# 6. Prüfe aktuelle uncommitted Änderungen
UNCOMMITTED=$(git status --porcelain | wc -l | tr -d ' ')
if [ "${UNCOMMITTED}" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Aktuell ${UNCOMMITTED} uncommitted Änderungen gefunden${NC}"
    echo ""
    echo "Möchtest du jetzt einen WIP-Commit erstellen? (j/n)"
    read -p "> " -n 1 -r
    echo
    if [[ $REPLY =~ ^[JjYy]$ ]]; then
        bash scripts/auto-commit-wip.sh --yes
    fi
fi

echo ""
echo -e "${GREEN}✅ Git-Schutz eingerichtet!${NC}"
echo ""



