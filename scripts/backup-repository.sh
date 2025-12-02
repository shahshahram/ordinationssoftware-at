#!/bin/bash

# Automatisches Backup-Script für Git-Repository
# Führt täglich ein Backup des gesamten Repository-Status durch

# Konfiguration
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${HOME}/.ordinationssoftware-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${DATE}"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Starte Repository-Backup...${NC}"

# Erstelle Backup-Verzeichnis falls nicht vorhanden
mkdir -p "${BACKUP_DIR}"

# Prüfe Git-Status
cd "${REPO_DIR}"
UNCOMMITTED=$(git status --porcelain | wc -l | tr -d ' ')

if [ "${UNCOMMITTED}" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warnung: ${UNCOMMITTED} uncommitted Änderungen gefunden!${NC}"
    echo -e "${YELLOW}   Erstelle Backup mit uncommitted Änderungen...${NC}"
    
    # Erstelle Stash für uncommitted Änderungen
    STASH_NAME="backup_${DATE}"
    git stash push -m "${STASH_NAME}" --include-untracked
    
    # Backup des Repository-Status
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
    mkdir -p "${BACKUP_PATH}"
    
    # Kopiere gesamtes Repository (ohne .git für Platzersparnis)
    rsync -av --exclude='.git' --exclude='node_modules' --exclude='.next' \
          --exclude='dist' --exclude='build' "${REPO_DIR}/" "${BACKUP_PATH}/"
    
    # Speichere Git-Status
    git status > "${BACKUP_PATH}/git_status.txt"
    git diff > "${BACKUP_PATH}/git_diff.txt" 2>/dev/null || true
    git diff --cached > "${BACKUP_PATH}/git_diff_cached.txt" 2>/dev/null || true
    
    # Liste der Stashes
    git stash list > "${BACKUP_PATH}/git_stash_list.txt"
    
    # Wiederherstelle Stash
    git stash pop
    
    echo -e "${GREEN}✅ Backup erstellt: ${BACKUP_PATH}${NC}"
    echo -e "${GREEN}   Stash erstellt: ${STASH_NAME}${NC}"
else
    echo -e "${GREEN}✅ Keine uncommitted Änderungen${NC}"
    
    # Backup des Repository-Status
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
    mkdir -p "${BACKUP_PATH}"
    
    # Kopiere gesamtes Repository
    rsync -av --exclude='.git' --exclude='node_modules' --exclude='.next' \
          --exclude='dist' --exclude='build' "${REPO_DIR}/" "${BACKUP_PATH}/"
    
    # Speichere Git-Status
    git status > "${BACKUP_PATH}/git_status.txt"
    git log --oneline -20 > "${BACKUP_PATH}/git_log.txt"
    
    echo -e "${GREEN}✅ Backup erstellt: ${BACKUP_PATH}${NC}"
fi

# Bereinige alte Backups (behalte nur die letzten 30 Tage)
echo -e "${GREEN}🧹 Bereinige alte Backups...${NC}"
find "${BACKUP_DIR}" -type d -name "backup_*" -mtime +30 -exec rm -rf {} \; 2>/dev/null || true

# Zeige Backup-Info
BACKUP_COUNT=$(find "${BACKUP_DIR}" -type d -name "backup_*" | wc -l | tr -d ' ')
echo -e "${GREEN}📊 Gespeicherte Backups: ${BACKUP_COUNT}${NC}"
echo -e "${GREEN}📁 Backup-Verzeichnis: ${BACKUP_DIR}${NC}"

