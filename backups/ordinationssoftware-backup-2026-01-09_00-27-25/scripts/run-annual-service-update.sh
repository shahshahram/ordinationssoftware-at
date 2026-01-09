#!/bin/bash

# Jährliches Service-Katalog Update
# Dieses Script sollte als Cron-Job am 1. Januar jeden Jahres ausgeführt werden

# Konfiguration
# Ermittle das Verzeichnis des Scripts (funktioniert auch bei symbolischen Links)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../backend/scripts" && pwd)"
LOG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../backend/logs" && pwd)"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Node.js-Pfad automatisch ermitteln
if command -v node &> /dev/null; then
  NODE_PATH=$(which node)
else
  # Fallback zu häufig verwendeten Pfaden
  NODE_PATH="/usr/local/bin/node"
  if [ ! -f "$NODE_PATH" ]; then
    NODE_PATH="/usr/bin/node"
  fi
fi

# Erstelle Log-Verzeichnis falls nicht vorhanden
mkdir -p "$LOG_DIR"

# Log-Datei mit Datum
LOG_FILE="$LOG_DIR/service-catalog-update-$(date +%Y-%m-%d).log"

echo "🏥 Starte jährliches Service-Katalog Update am $(date)" | tee -a "$LOG_FILE"
echo "📅 Update für Jahr: $(date +%Y)" | tee -a "$LOG_FILE"

# Wechsle ins Projekt-Root-Verzeichnis (für korrekte .env-Datei)
cd "$PROJECT_ROOT"

# Führe das Update-Script aus
"$NODE_PATH" "$SCRIPT_DIR/update-service-catalog-annual.js" 2>&1 | tee -a "$LOG_FILE"

# Prüfe Exit-Code
if [ $? -eq 0 ]; then
    echo "✅ Service-Katalog Update erfolgreich abgeschlossen" | tee -a "$LOG_FILE"
    
    # Optional: E-Mail-Benachrichtigung senden
    # echo "Service-Katalog Update erfolgreich abgeschlossen" | mail -s "Service-Katalog Update $(date +%Y)" admin@praxis.at
    
else
    echo "❌ Service-Katalog Update fehlgeschlagen" | tee -a "$LOG_FILE"
    
    # Optional: Fehler-E-Mail senden
    # echo "Service-Katalog Update fehlgeschlagen. Siehe Log: $LOG_FILE" | mail -s "FEHLER: Service-Katalog Update $(date +%Y)" admin@praxis.at
fi

echo "🏁 Script beendet am $(date)" | tee -a "$LOG_FILE"






