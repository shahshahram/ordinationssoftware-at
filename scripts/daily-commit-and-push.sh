#!/bin/bash

# Automatisches tägliches Commit- und Push-Script
# Committed und pusht alle Änderungen täglich

# Konfiguration
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

cd "${REPO_DIR}"

# Log-Datei
LOG_FILE="${REPO_DIR}/daily-commit.log"
ERROR_LOG="${REPO_DIR}/daily-commit.error.log"

# Funktion zum Loggen
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "${ERROR_LOG}"
}

log "${BLUE}🔄 Starte tägliches Commit und Push...${NC}"

# Prüfe Git-Status
UNCOMMITTED=$(git status --porcelain | wc -l | tr -d ' ')

if [ "${UNCOMMITTED}" -eq 0 ]; then
    log "${GREEN}✅ Keine uncommitted Änderungen${NC}"
    exit 0
fi

log "${YELLOW}⚠️  ${UNCOMMITTED} uncommitted Änderungen gefunden${NC}"

# Zeige Status
log "${YELLOW}📋 Status:${NC}"
git status --short | tee -a "${LOG_FILE}"

# Stage alle Änderungen
log "${BLUE}📦 Stage alle Änderungen...${NC}"
git add -A

# Erstelle Commit mit Datum
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
DATE=$(date +"%Y-%m-%d")
COMMIT_MSG="chore: Daily auto-commit ${DATE}

Automatischer täglicher Commit mit allen uncommitted Änderungen.
Erstellt am: ${TIMESTAMP}

Geänderte Dateien:
$(git status --short | head -30)"

# Erstelle Commit
if git commit -m "${COMMIT_MSG}"; then
    log "${GREEN}✅ Commit erstellt${NC}"
    COMMIT_HASH=$(git rev-parse --short HEAD)
    log "${GREEN}   Commit-Hash: ${COMMIT_HASH}${NC}"
    
    # Push zum Remote
    log "${YELLOW}📤 Pushe zum Remote...${NC}"
    if git push; then
        log "${GREEN}✅ Erfolgreich gepusht${NC}"
    else
        log_error "Push fehlgeschlagen"
        exit 1
    fi
else
    log_error "Fehler beim Erstellen des Commits"
    exit 1
fi

log "${GREEN}✅ Tägliches Commit und Push abgeschlossen${NC}"





