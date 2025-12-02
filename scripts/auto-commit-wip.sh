#!/bin/bash

# Automatisches WIP-Commit-Script
# Erstellt automatisch einen WIP-Commit, wenn uncommitted Änderungen vorhanden sind

# Konfiguration
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd "${REPO_DIR}"

# Prüfe Git-Status
UNCOMMITTED=$(git status --porcelain | wc -l | tr -d ' ')

if [ "${UNCOMMITTED}" -eq 0 ]; then
    echo -e "${GREEN}✅ Keine uncommitted Änderungen${NC}"
    exit 0
fi

echo -e "${YELLOW}⚠️  ${UNCOMMITTED} uncommitted Änderungen gefunden${NC}"

# Zeige Status
echo -e "${YELLOW}📋 Status:${NC}"
git status --short

# Frage nach Bestätigung (kann mit --yes übersprungen werden)
if [ "$1" != "--yes" ]; then
    read -p "WIP-Commit erstellen? (j/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[JjYy]$ ]]; then
        echo -e "${RED}❌ Abgebrochen${NC}"
        exit 1
    fi
fi

# Erstelle WIP-Commit
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MSG="WIP: Auto-save $(date +"%Y-%m-%d %H:%M:%S")

Automatischer WIP-Commit mit uncommitted Änderungen.
Erstellt am: ${TIMESTAMP}

$(git status --short | head -20)"

# Stage alle Änderungen
git add -A

# Erstelle Commit
if git commit -m "${COMMIT_MSG}"; then
    echo -e "${GREEN}✅ WIP-Commit erstellt${NC}"
    echo -e "${GREEN}   Commit-Hash: $(git rev-parse --short HEAD)${NC}"
    
    # Optional: Push zum Remote (nur wenn explizit gewünscht)
    if [ "$2" == "--push" ]; then
        echo -e "${YELLOW}📤 Pushe zum Remote...${NC}"
        git push || echo -e "${RED}⚠️  Push fehlgeschlagen (kein Remote konfiguriert?)${NC}"
    fi
else
    echo -e "${RED}❌ Fehler beim Erstellen des Commits${NC}"
    exit 1
fi

